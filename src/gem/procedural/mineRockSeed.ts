import type { RockType } from '../../types'

/** Stabil 32‑bit hash → samme klippe‑form for samme run/felt/variant. */
export function hashMineRockVisualSeed(
  runId: string,
  depth: number,
  slotIndex: number,
  rockType: RockType,
): number {
  let h = 2166136261
  const str = `${runId}|${depth}|${slotIndex}|${rockType}`
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
