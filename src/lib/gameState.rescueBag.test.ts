import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { reducer, initialState } from './gameState'
import { createInitialMineRun } from '../gem/mineLayer'
import { AREAS } from '../data/areas'
import { makePickaxe } from '../data/pickaxes'

function mineWithRun(inv: NonNullable<GameState['runInventory']>): GameState {
  const area = AREAS.find((a) => a.id === 'kobbermine')!
  const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
  return {
    ...initialState,
    viewMode: 'location',
    currentArea: 'kobbermine',
    mineRun: run,
    runInventory: inv,
  }
}

describe('MINE_MOVE_TO_RESCUE_BAG / MINE_MOVE_FROM_RESCUE_BAG', () => {
  it('flytter én post fra foundLoot til rescueBag', () => {
    const base = mineWithRun({
      foundLoot: [{ kind: 'coal', quantity: 5, origin: 'mine' }],
      rescueBag: [],
      rescueBagCapacity: 3,
      questItems: [],
      stowedHubGear: [],
    })
    const next = reducer(base, { type: 'MINE_MOVE_TO_RESCUE_BAG', foundIndex: 0 })
    expect(next.runInventory?.foundLoot).toHaveLength(0)
    expect(next.runInventory?.rescueBag).toEqual([{ kind: 'coal', quantity: 5, origin: 'mine' }])
  })

  it('afviser når redningspose er fuld', () => {
    const base = mineWithRun({
      foundLoot: [
        { kind: 'coal', quantity: 1, origin: 'mine' },
        { kind: 'coal', quantity: 2, origin: 'mine' },
      ],
      rescueBag: [
        { kind: 'coal', quantity: 1, origin: 'mine' },
        { kind: 'coal', quantity: 1, origin: 'mine' },
        { kind: 'coal', quantity: 1, origin: 'mine' },
      ],
      rescueBagCapacity: 3,
      questItems: [],
      stowedHubGear: [],
    })
    const next = reducer(base, { type: 'MINE_MOVE_TO_RESCUE_BAG', foundIndex: 0 })
    expect(next.runInventory?.foundLoot).toHaveLength(2)
    expect(next.runInventory?.rescueBag).toHaveLength(3)
    expect(next.gameNotice).toMatch(/fuld/)
  })

  it('flytter tilbage fra rescue til found', () => {
    const base = mineWithRun({
      foundLoot: [],
      rescueBag: [{ kind: 'coal', quantity: 2, origin: 'mine' }],
      rescueBagCapacity: 3,
      questItems: [],
      stowedHubGear: [],
    })
    const next = reducer(base, { type: 'MINE_MOVE_FROM_RESCUE_BAG', rescueIndex: 0 })
    expect(next.runInventory?.rescueBag).toHaveLength(0)
    expect(next.runInventory?.foundLoot).toEqual([{ kind: 'coal', quantity: 2, origin: 'mine' }])
  })

  it('ingen ændring uden aktiv mine', () => {
    const base: GameState = {
      ...initialState,
      viewMode: 'map',
      runInventory: {
        foundLoot: [{ kind: 'coal', quantity: 1, origin: 'mine' }],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_MOVE_TO_RESCUE_BAG', foundIndex: 0 })
    expect(next).toEqual(base)
  })
})

describe('RESCUE_BAG_UPGRADE (D48)', () => {
  it('øger rescueBagCapacity og trækker guld (meta + run)', () => {
    const base: GameState = {
      ...mineWithRun({
        foundLoot: [],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      }),
      hubInventory: { ...initialState.hubInventory, gold: 500 },
      level: 5,
    }
    const next = reducer(base, { type: 'RESCUE_BAG_UPGRADE' })
    expect(next.runInventory?.rescueBagCapacity).toBe(5)
    expect(next.rescueBagCapacity).toBe(5)
    expect(next.hubInventory.gold).toBe(500 - 350)
  })

  it('opgradering i smedjen (uden mine-run) opdaterer meta-kapacitet', () => {
    const base: GameState = {
      ...initialState,
      currentArea: 'smedjen',
      viewMode: 'location',
      hubInventory: { ...initialState.hubInventory, gold: 500 },
      level: 5,
      rescueBagCapacity: 3,
    }
    const next = reducer(base, { type: 'RESCUE_BAG_UPGRADE' })
    expect(next.rescueBagCapacity).toBe(5)
    expect(next.hubInventory.gold).toBe(500 - 350)
    expect(next.gameNotice).toBeNull()
  })

  it('afviser opgradering udenfor smedjen og uden aktiv mine', () => {
    const base: GameState = {
      ...initialState,
      currentArea: 'butikken',
      hubInventory: { ...initialState.hubInventory, gold: 9999 },
      level: 20,
      rescueBagCapacity: 3,
    }
    const next = reducer(base, { type: 'RESCUE_BAG_UPGRADE' })
    expect(next.rescueBagCapacity).toBe(3)
    expect(next.gameNotice).toMatch(/smedjen|mine/)
  })

  it('afviser ved maks kapacitet', () => {
    const base = mineWithRun({
      foundLoot: [],
      rescueBag: [],
      rescueBagCapacity: 10,
      questItems: [],
      stowedHubGear: [],
    })
    const b2: GameState = { ...base, hubInventory: { ...base.hubInventory, gold: 9999 }, level: 20 }
    const next = reducer(b2, { type: 'RESCUE_BAG_UPGRADE' })
    expect(next.runInventory?.rescueBagCapacity).toBe(10)
    expect(next.gameNotice).toMatch(/maks/)
  })
})

describe('MINE_RUN_ENTER + rescueBagCapacity (D48 meta)', () => {
  it('kopierer state.rescueBagCapacity til runInventory', () => {
    const base: GameState = {
      ...initialState,
      viewMode: 'map',
      currentArea: 'kobbermine',
      rescueBagCapacity: 7,
    }
    const next = reducer(base, { type: 'MINE_RUN_ENTER', mineId: 'kobbermine' })
    expect(next.runInventory?.rescueBagCapacity).toBe(7)
  })
})

describe('D47 origin på værktøj', () => {
  it('makePickaxe sætter origin hub', () => {
    expect(makePickaxe(0).origin).toBe('hub')
  })
})
