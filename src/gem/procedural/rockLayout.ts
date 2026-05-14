/**
 * Placering og samlet mesh‑skala for klipper pr. cave‑felt — **deterministisk** ud fra
 * `hashMineRockVisualSeed` + mulberry32 (ingen `Math.random` i render).
 *
 * **Ekstra nedgravning**: `MINE_SLOT_Y_SINK` er «mindst nedgravet» (top); `extraSinkY` er typisk
 * negativ og tilføjes ovenpå — `pow(u, 1.38)` giver ofte små ekstra, sjældent dybt.
 *
 * **Skala**: `meshScaleMultiplier` 1 = nuværende standard (`ROCK_BULK ×` global skala i OreNode).
 * Fordeling i fire bånd: små/medium dominerer; ~3 % i «massive» (≈1.65–2.0).
 *
 * **Senere loot**: brug `sizeTier` eller skær på `meshScaleMultiplier` i mine‑logik (samme params kan beregnes fra run/slot/type).
 */
import type { RockType } from '../../types'
import { hashMineRockVisualSeed } from './mineRockSeed'
import { mulberry32 } from './rng'

export type RockSizeTier = 'small' | 'medium' | 'large' | 'massive'

export type RockLayoutParams = {
  /**
   * Ekstra nedgravning ud over `MINE_SLOT_Y_SINK` (mere negativ Y i verdensrum).
   * Typisk 0 … −0.16; «top» (mindst nedgravet) er når denne er ~0.
   */
  extraSinkY: number
  /** 1 = nuværende «standard» (samlet ROCK_BULK × global skala); område [0.5, 2]. */
  meshScaleMultiplier: number
  /** Groft til senere loot / gameplay — massive er sjældne. */
  sizeTier: RockSizeTier
}

/** Maks. ekstra lodret nedgravning ud over basis-sink (verdensenheder). */
const MAX_EXTRA_SINK_Y = 0.165

/** Krystal: lavere profil + bred «fod» — samme max‑sink som andre gør den ofte visuelt for nedgravet. */
const MAX_EXTRA_SINK_Y_CRYSTAL = MAX_EXTRA_SINK_Y * 0.52

/**
 * Deterministisk udseende variaton pr. felt (samme input som visuel mesh‑seed).
 * Bruges til placering (Y) og mesh‑skala uden `Math.random()` i render.
 */
export function getRockLayoutParams(
  runId: string,
  depth: number,
  slotIndex: number,
  rockType: RockType,
): RockLayoutParams {
  const h = hashMineRockVisualSeed(runId, depth, slotIndex, rockType)
  const rng = mulberry32(h ^ 0xa0761d65)

  const uSink = rng()
  const maxExtra = rockType === 'crystal' ? MAX_EXTRA_SINK_Y_CRYSTAL : MAX_EXTRA_SINK_Y
  const extraSinkY = -Math.pow(uSink, 1.38) * maxExtra

  const band = rng()
  let meshScaleMultiplier: number
  if (band < 0.55) {
    meshScaleMultiplier = 0.5 + rng() * 0.48
  } else if (band < 0.88) {
    meshScaleMultiplier = 0.98 + rng() * 0.32
  } else if (band < 0.97) {
    meshScaleMultiplier = 1.3 + rng() * 0.35
  } else {
    meshScaleMultiplier = 1.65 + rng() * 0.35
  }

  const sizeTier: RockSizeTier =
    meshScaleMultiplier < 0.78
      ? 'small'
      : meshScaleMultiplier < 1.22
        ? 'medium'
        : meshScaleMultiplier < 1.62
          ? 'large'
          : 'massive'

  return { extraSinkY, meshScaleMultiplier, sizeTier }
}
