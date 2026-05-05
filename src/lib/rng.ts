import { createNoise2D } from 'simplex-noise'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashStringToInt(s: string): number {
  let h = 1779033703
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3430008201)
  }
  return (h >>> 0) || 1
}

export function makeNoise2D(seed: string | number): (x: number, y: number) => number {
  const n = typeof seed === 'string' ? hashStringToInt(seed) : (seed >>> 0) || 1
  return createNoise2D(mulberry32(n))
}
