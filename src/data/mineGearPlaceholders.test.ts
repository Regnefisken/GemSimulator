import { describe, expect, it } from 'vitest'
import {
  rollPlaceholderMineArmour,
  rollPlaceholderMinePickaxe,
  rollPlaceholderMineSword,
} from './mineGearPlaceholders'

describe('mineGearPlaceholders', () => {
  it('pickaxe: mine-origin og stats mellem start (tier 0) og butik (tier 1)', () => {
    const rng = () => 0.3
    const p = rollPlaceholderMinePickaxe('t1', rng)
    expect(p.origin).toBe('mine')
    expect(p.damage).toBeGreaterThanOrEqual(6)
    expect(p.damage).toBeLessThanOrEqual(8)
    expect(p.maxDurability).toBeGreaterThanOrEqual(62)
    expect(p.maxDurability).toBeLessThanOrEqual(85)
    expect(p.durability).toBe(p.maxDurability)
  })

  it('sværd: mine-origin og skade mellem tier 0 og 1', () => {
    const rng = () => 0.5
    const s = rollPlaceholderMineSword('t2', rng)
    expect(s.origin).toBe('mine')
    expect(s.damage).toBeGreaterThanOrEqual(10)
    expect(s.damage).toBeLessThanOrEqual(13)
  })

  it('rustning: mine-origin og lavere bonus end standard læder (tier 1)', () => {
    const rng = () => 0.1
    const a = rollPlaceholderMineArmour('t3', rng)
    expect(a.origin).toBe('mine')
    expect(a.bonuses.hpMax ?? 0).toBeGreaterThanOrEqual(6)
    expect(a.bonuses.hpMax ?? 0).toBeLessThanOrEqual(10)
    expect(a.maxDurability).toBeLessThan(90)
  })
})
