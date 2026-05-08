import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { reducer, initialState } from './gameState'
import { createInitialMineRun } from '../gem/mineLayer'
import { AREAS } from '../data/areas'
import { createRandomGem } from '../gem/generate'
import { computeWorldTier } from './worldTier'
import { makePickaxe } from '../data/pickaxes'

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
    coal: 10,
  }
}

describe('MINE_PLAYER_DEATH / død via skade (D46)', () => {
  it('kasserer foundLoot men merger rescueBag til hub', () => {
    const base: GameState = {
      ...inMineBase(),
      runInventory: {
        foundLoot: [{ kind: 'coal', quantity: 7, origin: 'mine' }],
        rescueBag: [{ kind: 'coal', quantity: 3, origin: 'mine' }],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_PLAYER_DEATH' })
    expect(next.mineRun).toBeNull()
    expect(next.runInventory).toBeNull()
    expect(next.viewMode).toBe('map')
    expect(next.coal).toBe(10 + 3)
    expect(next.gameNotice).toMatch(/redningspose/)
  })

  it('PLAYER_TAKE_DAMAGE der dræber spilleren afslutter run med death-merge', () => {
    const gem = createRandomGem(computeWorldTier(initialState))
    const base: GameState = {
      ...inMineBase(),
      playerHp: 5,
      runInventory: {
        foundLoot: [{ kind: 'gem', gem, origin: 'mine' }],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'PLAYER_TAKE_DAMAGE', amount: 100, source: 'mob' })
    expect(next.mineRun).toBeNull()
    expect(next.playerHp).toBeGreaterThan(0)
    expect(next.gems.some((g) => g.id === gem.id)).toBe(false)
  })

  it('questItems lander i hubInventory.equipment ved død', () => {
    const base: GameState = {
      ...inMineBase(),
      runInventory: {
        foundLoot: [],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [{ questItemId: 'q_key_rusty', origin: 'mine' }],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_PLAYER_DEATH' })
    expect(next.hubInventory.equipment.some((e) => typeof e === 'object' && e && 'questItemId' in e && (e as { questItemId: string }).questItemId === 'q_key_rusty')).toBe(true)
  })

  it('MINE_RUN_EXIT merger foundLoot + rescue (safe ascend)', () => {
    const base: GameState = {
      ...inMineBase(),
      runInventory: {
        foundLoot: [{ kind: 'coal', quantity: 2, origin: 'mine' }],
        rescueBag: [{ kind: 'coal', quantity: 1, origin: 'mine' }],
        rescueBagCapacity: 3,
        questItems: [{ questItemId: 'q_x', origin: 'mine' }],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_RUN_EXIT' })
    expect(next.coal).toBe(10 + 2 + 1)
    expect(next.hubInventory.equipment.length).toBeGreaterThanOrEqual(1)
    expect(next.gameNotice).toBeNull()
  })

  it('§2.4 (a): udstyr med origin mine normaliseres til hub efter MINE_RUN_EXIT', () => {
    const minePick = { ...makePickaxe(0, 'mine-test'), id: 'pick-mine-run', origin: 'mine' as const }
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
    const p = next.pickaxes.find((x) => x.id === minePick.id)
    expect(p?.origin).toBe('hub')
  })

  it('§2.4 (a): origin hub også efter død-merge', () => {
    const minePick = { ...makePickaxe(0, 'mine-death'), id: 'pick-mine-death', origin: 'mine' as const }
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
    const next = reducer(base, { type: 'MINE_PLAYER_DEATH' })
    expect(next.pickaxes.find((x) => x.id === minePick.id)?.origin).toBe('hub')
  })
})

describe('MINE_PICKUP_QUEST_ITEM', () => {
  it('afvises udenfor aktiv mine-run', () => {
    const next = reducer(initialState, {
      type: 'MINE_PICKUP_QUEST_ITEM',
      questItemId: 'q_test',
    })
    expect(next.runInventory).toBeNull()
    expect(next.gameNotice).toMatch(/aktiv mine/)
  })

  it('tilføjer questItem til runInventory under mine', () => {
    const base = inMineBase()
    const next = reducer(base, { type: 'MINE_PICKUP_QUEST_ITEM', questItemId: 'q_scroll' })
    expect(next.runInventory?.questItems).toEqual([{ questItemId: 'q_scroll', origin: 'mine' }])
  })

  it('ignorerer duplikat questItemId', () => {
    const base: GameState = {
      ...inMineBase(),
      runInventory: {
        foundLoot: [],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [{ questItemId: 'q_scroll', origin: 'mine' }],
        stowedHubGear: [],
      },
    }
    const next = reducer(base, { type: 'MINE_PICKUP_QUEST_ITEM', questItemId: 'q_scroll' })
    expect(next.runInventory?.questItems).toHaveLength(1)
  })
})
