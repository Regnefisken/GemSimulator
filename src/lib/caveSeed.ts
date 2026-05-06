import { createNoise2D, type NoiseFunction2D } from 'simplex-noise'

/** Mulberry32 – deterministisk PRNG fra én heltals-seed. */
export function createSeededRandom(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function createCaveNoise(seed: number): NoiseFunction2D {
  const rng = createSeededRandom(seed ^ 0x9e3779b9)
  return createNoise2D(rng)
}

export function pickRange(rng: () => number, [min, max]: [number, number]): number {
  return min + Math.floor(rng() * (max - min + 1))
}
