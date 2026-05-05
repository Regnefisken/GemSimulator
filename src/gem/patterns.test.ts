import { describe, expect, it } from 'vitest'
import { hashStringToInt, mulberry32, makeNoise2D } from '../lib/rng'
import { applyVeining, applySpeckles, applyChatoyancy } from './patterns'

const ROW = '.' + 'G'.repeat(14) + '.'
const GRID = Array.from({ length: 16 }, () => ROW)

describe('patterns determinisme', () => {
  it('samme gemId giver identisk veining-output', () => {
    const id = 'test-seed-1'
    const rng = mulberry32(hashStringToInt(id))
    const noise = makeNoise2D(id)
    const ctx = { data: [...GRID], rng, noise }
    const a = applyVeining(ctx)
    const rng2 = mulberry32(hashStringToInt(id))
    const noise2 = makeNoise2D(id)
    const b = applyVeining({ data: [...GRID], rng: rng2, noise: noise2 })
    expect(a).toEqual(b)
  })

  it('applySpeckles på 16x16 grid', () => {
    const id = 'speckle-1'
    const rng = mulberry32(hashStringToInt(id))
    const noise = makeNoise2D(id)
    const out = applySpeckles({ data: [...GRID], rng, noise }, 0.5)
    expect(out.length).toBe(16)
    expect(out[0]!.length).toBe(16)
  })

  it('applyChatoyancy er deterministisk ved samme seed', () => {
    const id = 'chatoyancy-seed'
    const mk = () => {
      const rng = mulberry32(hashStringToInt(id))
      const noise = makeNoise2D(id)
      return applyChatoyancy({ data: [...GRID], rng, noise })
    }
    expect(mk()).toEqual(mk())
    const joined = mk().join('')
    expect(joined).toContain('S')
  })
})
