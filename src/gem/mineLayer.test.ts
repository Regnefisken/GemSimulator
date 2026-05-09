import { describe, expect, it } from 'vitest'
import { canDescendFromLayer, generateLayerState } from './mineLayer'
import type { MineRunSlotState } from '../lib/mineTypes'
import { AREAS } from '../data/areas'
import { resolveEffectiveCaveConfig } from './mineCaveContext'

function rock(cleared: boolean): MineRunSlotState {
  return {
    slotIndex: 0,
    kind: 'rock',
    rockType: 'normal',
    maxHp: 10,
    currentHp: cleared ? 0 : 5,
    cleared,
  }
}

function chest(cleared: boolean): MineRunSlotState {
  return {
    slotIndex: 1,
    kind: 'chest',
    rockType: 'chest',
    chestTier: 'wood',
    chestEntityId: 'x',
    maxHp: 0,
    currentHp: 0,
    cleared,
    chestLoot: { gold: 1, items: [], blueprintId: null },
  }
}

describe('canDescendFromLayer', () => {
  it('bonusetage: kun kister (ingen mandatoriske felter uden ryddet) → descend tilladt', () => {
    const slots: MineRunSlotState[] = Array.from({ length: 6 }, (_, i) => ({
      slotIndex: i,
      kind: 'chest' as const,
      rockType: 'chest' as const,
      chestTier: 'wood' as const,
      chestEntityId: `wc-test-${i}`,
      maxHp: 0,
      currentHp: 0,
      cleared: false,
      chestLoot: { gold: 1, items: [], blueprintId: null },
    }))
    expect(canDescendFromLayer(slots)).toBe(true)
  })

  it('tillader nedstigning når alle klipper/uhyrer er ryddet, selv med ulæst kiste', () => {
    expect(canDescendFromLayer([rock(true), chest(false)])).toBe(true)
  })

  it('blokerer hvis en klippe ikke er ryddet', () => {
    expect(canDescendFromLayer([rock(false), chest(false)])).toBe(false)
  })
})

const kobber = AREAS.find((a) => a.id === 'kobbermine')!

describe('generateLayerState', () => {
  it('giver 5–10 felter og matcher effektiv cave-config', () => {
    const args = {
      area: kobber,
      mineId: 'kobbermine',
      runId: 'run-determinism-test',
      currentDepth: 3,
      activeCharms: [] as string[],
    }
    const cfg = resolveEffectiveCaveConfig(args)
    const slots = generateLayerState(args)
    expect(slots.length).toBeGreaterThanOrEqual(5)
    expect(slots.length).toBeLessThanOrEqual(10)
    expect(slots.length).toBe(cfg.oreSlots.length)
    slots.forEach((s, i) => expect(s.slotIndex).toBe(i))
    slots.filter((s) => s.kind === 'mob').forEach((s) => expect(s.mobType).toBeDefined())
  })

  it('er deterministisk for samme run/dybde', () => {
    const args = {
      area: kobber,
      mineId: 'kobbermine',
      runId: 'same-run',
      currentDepth: 7,
      activeCharms: [] as string[],
    }
    const a = generateLayerState(args)
    const b = generateLayerState(args)
    expect(a).toEqual(b)
  })
})
