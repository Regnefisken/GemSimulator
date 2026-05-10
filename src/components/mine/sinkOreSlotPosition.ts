import type { CaveConfig, RockType } from '../../types'
import { getCaveHalfExtents } from '../../lib/caveHalfExtents'
import { sampleCaveFloorMeshY } from '../../lib/caveFloorSurface'

/** Ekstra placering af mesh‑fod (procedurelt ankr ved y≈0 i lokalt rum). */
export type SinkOreSlotWorldOpts = {
  rockType?: RockType
  /** Fra `getRockLayoutParams` — stor skala gør små luftgab mere synlige under klippen. */
  meshScaleMultiplier?: number
  /**
   * `chestBase`: `WorldChest` har bundplan ved lokal y=0 — undgå klippens dybe nedgravning (`MINE_SLOT_Y_SINK`).
   * Ekstra `extraSinkY` fra malm‑layout bruges ikke for kiste.
   */
  anchor?: 'rockFoot' | 'chestBase'
}

/** Rig åre: flad facet mod gulv → små vertikale fejl læses tydeligt. */
const RICH_FLAT_SOLE_VISUAL_SINK = 0.032
const LARGE_ROCK_SCALE_SINK_PER_UNIT = 0.026

/**
 * Nedgravning relativt til **rendret gulv** (`sampleCaveFloorMeshY`). Negativ værdi graver klippens fod ned under overfladen.
 */
export const MINE_SLOT_Y_SINK = -0.175

/** Kiste: kun let fordybning — samme akse som `WorldChest` bund (lokal y=0). */
export const MINE_CHEST_Y_SINK = -0.035

/**
 * Lodret basis for verdens‑loot (`spawnPositionsAround` lægger lidt ekstra oven i).
 * `VoxelMesh` + root‑scale **0,085** kan rage **~0,38–0,42** under pivot; denne værdi giver synlig **luft mellem sprite‑bund og underlag**.
 */
export const MINE_LOOT_SCATTER_BASE_Y = 0.52

/**
 * Horisontalt fra malmens slot; lodret: **gulv ved (x,z) + løft** — ikke klippens nedgravning.
 */
export function lootScatterOriginWorldPosition(
  pos: readonly [number, number, number],
  caveSeed: number,
  cave: CaveConfig,
): [number, number, number] {
  const { halfX, halfZ } = getCaveHalfExtents(cave)
  const floorY = sampleCaveFloorMeshY(caveSeed, halfX, halfZ, pos[0], pos[2])
  return [pos[0], floorY + MINE_LOOT_SCATTER_BASE_Y, pos[2]]
}

/**
 * Gulvet er fladt (`FLAT_CAVE_FLOOR_Y`); ingen relativ justering mellem felt og rumcentrum.
 * Bevar funktionen til API‑stabilitet — ved genindsættelse af kuperet gulv: sample `sampleCaveFloorMeshY` her.
 */
export function alignOreSlotYToCaveFloor(
  sunk: readonly [number, number, number],
  _caveSeed: number,
  _cave: CaveConfig,
): [number, number, number] {
  return [sunk[0], sunk[1], sunk[2]]
}

/**
 * @param extraSinkY ekstra fra `getRockLayoutParams` (typisk negativ); 0 = kun basis-sink («top» af nedgravning).
 * @param baseSinkY typisk `MINE_SLOT_Y_SINK`; kister bruger `MINE_CHEST_Y_SINK` via `sinkOreSlotWorldPosition`.
 */
export function sinkOreSlotPosition(
  pos: readonly [number, number, number],
  extraSinkY = 0,
  baseSinkY: number = MINE_SLOT_Y_SINK,
): [number, number, number] {
  return [pos[0], pos[1] + baseSinkY + extraSinkY, pos[2]]
}

export function oreFootVisualSinkBias(opts?: SinkOreSlotWorldOpts): number {
  if (!opts?.rockType && opts?.meshScaleMultiplier == null) return 0
  let bias = 0
  const mul = opts.meshScaleMultiplier ?? 1
  if (mul > 1) bias += LARGE_ROCK_SCALE_SINK_PER_UNIT * (mul - 1)
  if (opts.rockType === 'rich') bias += RICH_FLAT_SOLE_VISUAL_SINK
  return bias
}

/**
 * 3D‑verdens placering (mal/kiste/partikel‑origin). Lodret: **`pos[1]` fra cave‑data ignoreres** — Y ankres til
 * procedurelt gulv ved `(pos[0], pos[2])`, derefter felt‑specifik nedgravning (klippe vs kiste).
 */
export function sinkOreSlotWorldPosition(
  pos: readonly [number, number, number],
  extraSinkY: number,
  caveSeed: number,
  cave: CaveConfig,
  opts?: SinkOreSlotWorldOpts,
): [number, number, number] {
  const chest = opts?.anchor === 'chestBase'
  const { halfX, halfZ } = getCaveHalfExtents(cave)
  const floorY = sampleCaveFloorMeshY(caveSeed, halfX, halfZ, pos[0], pos[2])
  const anchored: [number, number, number] = [pos[0], floorY, pos[2]]
  const baseSink = chest ? MINE_CHEST_Y_SINK : MINE_SLOT_Y_SINK
  const extra = chest ? 0 : extraSinkY
  const [x, y, z] = alignOreSlotYToCaveFloor(sinkOreSlotPosition(anchored, extra, baseSink), caveSeed, cave)
  const footBias = chest ? 0 : oreFootVisualSinkBias(opts)
  return [x, y - footBias, z]
}
