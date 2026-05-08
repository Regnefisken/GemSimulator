import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { reducer, initialState } from './gameState'
import { createInitialMineRun } from '../gem/mineLayer'
import { AREAS } from '../data/areas'
import { makePickaxe } from '../data/pickaxes'
import { makeSword } from '../data/swords'
import { makeArmour } from '../data/armour'

function inMineBase(): GameState {
  const area = AREAS.find((a) => a.id === 'kobbermine')!
  const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
  return {
    ...initialState,
    viewMode: 'location',
    currentArea: 'kobbermine',
    mineRun: run,
    runInventory: {
      foundLoot: [],
      rescueBag: [],
      rescueBagCapacity: 3,
      questItems: [],
      stowedHubGear: [],
    },
  }
}

describe('MINE_EQUIP_FOUND (D49/D52)', () => {
  it('flytter hub-hakke til stowed og equiper mine-hakke fra fund', () => {
    const hubPick = makePickaxe(0, 'equip-hub')
    const minePick = { ...makePickaxe(1, 'equip-mine'), id: 'pick-mine-equip', origin: 'mine' as const }
    const base: GameState = {
      ...inMineBase(),
      pickaxes: [hubPick],
      activePickaxeId: hubPick.id,
      runInventory: {
        foundLoot: [{ kind: 'pickaxe_gear', pickaxe: minePick, origin: 'mine' }],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_EQUIP_FOUND', source: 'found', index: 0 })
    expect(next.activePickaxeId).toBe(minePick.id)
    expect(next.runInventory?.stowedHubGear.some((s) => s.kind === 'pickaxe' && s.item.id === hubPick.id)).toBe(
      true,
    )
    expect(next.runInventory?.foundLoot).toHaveLength(0)
    expect(next.pickaxes.some((p) => p.id === minePick.id)).toBe(true)
    expect(next.pickaxes.some((p) => p.id === hubPick.id)).toBe(false)
  })

  it('flytter mine-hakke tilbage til found ved af-equip og henter hub fra stowed', () => {
    const hubPick = makePickaxe(0, 'stow-hub')
    const minePick = { ...makePickaxe(1, 'stow-mine'), id: 'pick-mine-stow', origin: 'mine' as const }
    const equipped: GameState = {
      ...inMineBase(),
      pickaxes: [minePick],
      activePickaxeId: minePick.id,
      equippedWeapon: 'pickaxe',
      runInventory: {
        foundLoot: [],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [{ kind: 'pickaxe', item: hubPick }],
      },
    }
    const next = reducer(equipped, { type: 'MINE_UNEQUIP', slot: 'pickaxe' })
    expect(next.runInventory?.foundLoot.some((e) => e.kind === 'pickaxe_gear' && e.pickaxe.id === minePick.id)).toBe(
      true,
    )
    expect(next.activePickaxeId).toBe(hubPick.id)
    expect(next.pickaxes.some((p) => p.id === hubPick.id)).toBe(true)
  })

  it('afviser equip af ikke-udstyr (fx kul)', () => {
    const base: GameState = {
      ...inMineBase(),
      runInventory: {
        foundLoot: [{ kind: 'coal', quantity: 1, origin: 'mine' }],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_EQUIP_FOUND', source: 'found', index: 0 })
    expect(next.gameNotice).toMatch(/Kun udstyr/)
    expect(next.runInventory?.foundLoot).toHaveLength(1)
  })

  it('merger pickaxe_gear fra rescue til hub ved sikker exit', () => {
    const orphan = { ...makePickaxe(2, 'orphan'), id: 'pick-orphan', origin: 'mine' as const }
    const base: GameState = {
      ...inMineBase(),
      runInventory: {
        foundLoot: [],
        rescueBag: [{ kind: 'pickaxe_gear', pickaxe: orphan, origin: 'mine' }],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_RUN_EXIT' })
    expect(next.pickaxes.some((p) => p.id === orphan.id)).toBe(true)
    expect(next.runInventory).toBeNull()
  })

  it('miner origin på aktiv hakke erstattet af hub efter exit', () => {
    const minePick = { ...makePickaxe(1, 'exit-m'), id: 'pick-exit-m', origin: 'mine' as const }
    const base: GameState = {
      ...inMineBase(),
      pickaxes: [minePick],
      activePickaxeId: minePick.id,
      runInventory: {
        foundLoot: [],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_RUN_EXIT' })
    expect(next.pickaxes.find((p) => p.id === minePick.id)?.origin).toBe('hub')
  })
})

describe('MINE_EQUIP_FOUND sværd / rustning', () => {
  it('miner sværd i slot displacer hub-sværd til stowed', () => {
    const hubSword = makeSword(0, 'eq-sw-hub')
    const mineSword = { ...makeSword(1, 'eq-sw-m'), id: 'sword-mine-1', origin: 'mine' as const }
    const base: GameState = {
      ...inMineBase(),
      swords: [hubSword],
      activeSwordId: hubSword.id,
      equippedWeapon: 'sword',
      runInventory: {
        foundLoot: [{ kind: 'sword_gear', sword: mineSword, origin: 'mine' }],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_EQUIP_FOUND', source: 'found', index: 0 })
    expect(next.activeSwordId).toBe(mineSword.id)
    expect(next.runInventory?.stowedHubGear.some((s) => s.kind === 'sword' && s.item.id === hubSword.id)).toBe(true)
  })

  it('equip rustning fra fund', () => {
    const mineArm = { ...makeArmour(1, 'arm-m'), id: 'arm-mine-1', origin: 'mine' as const }
    const base: GameState = {
      ...inMineBase(),
      armours: [],
      activeArmourId: null,
      runInventory: {
        foundLoot: [{ kind: 'armour_gear', armour: mineArm, origin: 'mine' }],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_EQUIP_FOUND', source: 'found', index: 0 })
    expect(next.activeArmourId).toBe(mineArm.id)
    expect(next.armours.some((a) => a.id === mineArm.id)).toBe(true)
  })
})
