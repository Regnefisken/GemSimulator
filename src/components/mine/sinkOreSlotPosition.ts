import type { CaveConfig, RockType } from '../../types'
import { getCaveHalfExtents } from '../../lib/caveHalfExtents'
import { sampleCaveFloorMeshY } from '../../lib/caveFloorSurface'

/** Ekstra placering af mesh‑fod (procedurelt ankr ved y≈0 i lokalt rum). */
export type SinkOreSlotWorldOpts = {
  rockType?: RockType
  /** Fra `getRockLayoutParams` — stor skala gør små luftgab mere synlige under klippen. */
  meshScaleMultiplier?: number
}

/** Rig åre: flad facet mod gulv → små vertikale fejl læses tydeligt. */
const RICH_FLAT_SOLE_VISUAL_SINK = 0.032
const LARGE_ROCK_SCALE_SINK_PER_UNIT = 0.026

/**
 * Cave `oreSlots` peger på pivot omkring klippens midte; negativ Y graver klippen let ned i grotten,
 * så den ikke står/væver på underlaget.
 */
export const MINE_SLOT_Y_SINK = -0.175

/** Rumcentrum — lodret offset følger lokalt ujævnt gulv vs midten af samme mesh. */
const ORE_FLOOR_ALIGN_REF_XZ = [0, 0] as const

/**
 * @param extraSinkY ekstra fra `getRockLayoutParams` (typisk negativ); 0 = kun basis-sink («top» af nedgravning).
 */
export function sinkOreSlotPosition(
  pos: readonly [number, number, number],
  extraSinkY = 0,
): [number, number, number] {
  return [pos[0], pos[1] + MINE_SLOT_Y_SINK + extraSinkY, pos[2]]
}

/**
 * Justerer malmens midte‑Y efter procedurelt gulv ved feltets (x,z), relativt gulvhøjden i rumcentrum.
 * Bruger samme sampling som `CaveWalls` (`sampleCaveFloorMeshY`).
 */
export function alignOreSlotYToCaveFloor(
  sunk: readonly [number, number, number],
  caveSeed: number,
  cave: CaveConfig,
): [number, number, number] {
  const { halfX, halfZ } = getCaveHalfExtents(cave)
  const [x, y, z] = sunk
  const [rx, rz] = ORE_FLOOR_ALIGN_REF_XZ
  const yRef = sampleCaveFloorMeshY(caveSeed, halfX, halfZ, rx, rz)
  const yHere = sampleCaveFloorMeshY(caveSeed, halfX, halfZ, x, z)
  return [x, y + (yHere - yRef), z]
}

export function oreFootVisualSinkBias(opts?: SinkOreSlotWorldOpts): number {
  if (!opts?.rockType && opts?.meshScaleMultiplier == null) return 0
  let bias = 0
  const mul = opts.meshScaleMultiplier ?? 1
  if (mul > 1) bias += LARGE_ROCK_SCALE_SINK_PER_UNIT * (mul - 1)
  if (opts.rockType === 'rich') bias += RICH_FLAT_SOLE_VISUAL_SINK
  return bias
}

/** Basis‑sink + lodret gulvjustering til 3D‑verdens placering (mal/kiste/partikel‑origin). */
export function sinkOreSlotWorldPosition(
  pos: readonly [number, number, number],
  extraSinkY: number,
  caveSeed: number,
  cave: CaveConfig,
  opts?: SinkOreSlotWorldOpts,
): [number, number, number] {
  const [x, y, z] = alignOreSlotYToCaveFloor(sinkOreSlotPosition(pos, extraSinkY), caveSeed, cave)
  const footBias = oreFootVisualSinkBias(opts)
  return [x, y - footBias, z]
}
