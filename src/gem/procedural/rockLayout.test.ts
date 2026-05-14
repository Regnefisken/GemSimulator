import { describe, expect, it } from 'vitest'
import { getRockLayoutParams } from './rockLayout'

describe('getRockLayoutParams', () => {
  it('er deterministisk pr. run/felt/type', () => {
    const a = getRockLayoutParams('r1', 3, 2, 'normal')
    const b = getRockLayoutParams('r1', 3, 2, 'normal')
    expect(a).toEqual(b)
    expect(a.meshScaleMultiplier).toBe(b.meshScaleMultiplier)
    expect(a.extraSinkY).toBe(b.extraSinkY)
    expect(a.sizeTier).toBe(b.sizeTier)
  })

  it('skelner slot og type', () => {
    expect(getRockLayoutParams('r', 1, 0, 'normal').meshScaleMultiplier).not.toBe(
      getRockLayoutParams('r', 1, 1, 'normal').meshScaleMultiplier,
    )
  })

  it('krystal: ekstra-sænkning er bundet lavere end for andre typer (samme maks‑led)', () => {
    for (let i = 0; i < 50; i++) {
      const p = getRockLayoutParams(`cr-${i}`, i % 4, i % 9, 'crystal')
      expect(p.extraSinkY).toBeGreaterThanOrEqual(-0.086)
      expect(p.extraSinkY).toBeLessThanOrEqual(0)
    }
  })

  it('holder meshScaleMultiplier i [0.5, 2] og extraSinkY ≤ 0', () => {
    for (let i = 0; i < 80; i++) {
      const p = getRockLayoutParams(`run-${i}`, i % 5, i % 7, 'rich')
      expect(p.meshScaleMultiplier).toBeGreaterThanOrEqual(0.5)
      expect(p.meshScaleMultiplier).toBeLessThanOrEqual(2)
      expect(p.extraSinkY).toBeLessThanOrEqual(0)
      expect(p.extraSinkY).toBeGreaterThanOrEqual(-0.17)
    }
  })
})
