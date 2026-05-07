import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { reducer, initialState } from './gameState'
import { createInitialMineRun } from '../gem/mineLayer'
import { AREAS } from '../data/areas'
import { makeArmour } from '../data/armour'

describe('Fase 2 combat & durability', () => {
  it('MINE_DEAL_DAMAGE ved ryddet klippe trækker 1 fra aktiv hakke (D29)', () => {
    const area = AREAS.find((a) => a.id === 'kobbermine')!
    const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
    const rockIdx = run.slots.findIndex((s) => s.kind === 'rock')
    expect(rockIdx).toBeGreaterThanOrEqual(0)
    const slot = run.slots[rockIdx]!
    const dmg = slot.currentHp
    const base: GameState = {
      ...initialState,
      mineRun: { ...run, targetSlotIndex: rockIdx },
    }
    const beforeDur = base.pickaxes.find((p) => p.id === base.activePickaxeId)!.durability
    const next = reducer(base, { type: 'MINE_DEAL_DAMAGE', slotIndex: rockIdx, damage: dmg })
    expect(next.mineRun?.slots[rockIdx]?.cleared).toBe(true)
    const afterDur = next.pickaxes.find((p) => p.id === next.activePickaxeId)!.durability
    expect(afterDur).toBe(beforeDur - 1)
  })

  it('DAMAGE_SWORD reducer slidser aktivt sværd', () => {
    const base: GameState = { ...initialState, activeSwordId: initialState.swords[0]!.id }
    const next = reducer(base, { type: 'DAMAGE_SWORD', amount: 5 })
    const s = next.swords.find((x) => x.id === next.activeSwordId)
    expect(s!.durability).toBe(initialState.swords[0]!.durability - 5)
  })

  it('REPAIR_TOOL_WITH_COAL bruger kul og fylder holdbarhed', () => {
    const p = initialState.pickaxes[0]!
    const base: GameState = {
      ...initialState,
      coal: 500,
      pickaxes: [{ ...p, durability: 1 }],
    }
    const next = reducer(base, { type: 'REPAIR_TOOL_WITH_COAL', tool: 'pickaxe', id: p.id })
    expect(next.coal).toBeLessThan(500)
    expect(next.pickaxes[0]!.durability).toBe(next.pickaxes[0]!.maxDurability)
  })
})

describe('Fase 5 rustning', () => {
  it('PLAYER_TAKE_DAMAGE slider rustning når udstyret', () => {
    const area = AREAS.find((a) => a.id === 'kobbermine')!
    const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
    const a = { ...makeArmour(1, 't'), id: 'arm-1' }
    const base: GameState = {
      ...initialState,
      viewMode: 'location',
      currentArea: 'kobbermine',
      mineRun: run,
      armours: [a],
      activeArmourId: 'arm-1',
    }
    const next = reducer(base, { type: 'PLAYER_TAKE_DAMAGE', amount: 12 })
    expect(next.armours.find((x) => x.id === 'arm-1')!.durability).toBeLessThan(a.durability)
  })

  it('REPAIR_TOOL_WITH_COAL på rustning', () => {
    const a = { ...makeArmour(1, 't'), id: 'arm-1', durability: 5 }
    const base: GameState = {
      ...initialState,
      coal: 500,
      armours: [a],
      activeArmourId: 'arm-1',
    }
    const next = reducer(base, { type: 'REPAIR_TOOL_WITH_COAL', tool: 'armour', id: 'arm-1' })
    expect(next.armours[0]!.durability).toBe(next.armours[0]!.maxDurability)
    expect(next.coal).toBeLessThan(500)
  })
})
