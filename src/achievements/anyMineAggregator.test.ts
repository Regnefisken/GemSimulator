import { describe, expect, it } from 'vitest'
import { computeAnyMineStats } from '../achievements/anyMineAggregator'
import { discoverNewAchievementIds } from '../data/achievements'
import { selectAnyMineStats } from '../selectors/achievements'
import { initialState } from '../lib/gameState'
import type { GameState } from '../types'

describe('computeAnyMineStats (D44)', () => {
  it('tom per-mine-historik: dybde 0, ingen miner med fremskridt (kun legacy depth tæller mod dybde)', () => {
    const s: GameState = {
      ...initialState,
      unlockedDepths: {},
      depth: 0,
    }
    const st = computeAnyMineStats(s)
    expect(st.deepestAcrossMines).toBe(0)
    expect(st.minesWithProgress).toBe(0)
    expect(st.sumRecordedDepths).toBe(0)
    expect(st.totalRunsCompleted).toBe(0)
  })

  it('én mine med dybde: deepest og minesWithProgress', () => {
    const s: GameState = {
      ...initialState,
      unlockedDepths: { kobbermine: 5 },
      depth: 0,
    }
    const st = computeAnyMineStats(s)
    expect(st.deepestAcrossMines).toBe(5)
    expect(st.minesWithProgress).toBe(1)
    expect(st.sumRecordedDepths).toBe(5)
  })

  it('flere miner: deepest = max, minesWithProgress tæller kun dybde > 0', () => {
    const s: GameState = {
      ...initialState,
      unlockedDepths: {
        kobbermine: 8,
        jernkloeften: 3,
        soelvhulen: 0,
      },
      depth: 0,
    }
    const st = computeAnyMineStats(s)
    expect(st.deepestAcrossMines).toBe(8)
    expect(st.minesWithProgress).toBe(2)
    expect(st.sumRecordedDepths).toBe(11)
  })

  it('legacy depth uden per-mine poster: deepest følger state.depth', () => {
    const s: GameState = {
      ...initialState,
      unlockedDepths: {},
      depth: 7,
    }
    expect(computeAnyMineStats(s).deepestAcrossMines).toBe(7)
    expect(computeAnyMineStats(s).minesWithProgress).toBe(0)
  })

  it('muterer ikke state', () => {
    const s = structuredClone(initialState)
    const snap = JSON.stringify(s)
    computeAnyMineStats(s)
    expect(JSON.stringify(s)).toBe(snap)
  })
})

describe('selectAnyMineStats', () => {
  it('returnerer samme instans ved gentaget kald med samme state-reference', () => {
    const s = { ...initialState, unlockedDepths: { kobbermine: 2 } }
    const a = selectAnyMineStats(s)
    const b = selectAnyMineStats(s)
    expect(a).toBe(b)
  })
})

describe('discoverNewAchievementIds — any mine', () => {
  it('finder any_mine_depth_3 når dybde opfyldt', () => {
    const s: GameState = {
      ...initialState,
      unlockedDepths: { kobbermine: 4 },
      achievementsUnlocked: [],
    }
    expect(discoverNewAchievementIds(s, []).filter((id) => id.startsWith('any_mine_'))).toContain('any_mine_depth_3')
  })

  it('finder any_mine_two_mines når to miner har dybde', () => {
    const s: GameState = {
      ...initialState,
      unlockedDepths: { kobbermine: 1, jernkloeften: 2 },
      achievementsUnlocked: ['any_mine_depth_3'],
    }
    expect(discoverNewAchievementIds(s, s.achievementsUnlocked)).toContain('any_mine_two_mines')
  })

  it('finder any_mine_depth_10 ved dybde 10', () => {
    const s: GameState = {
      ...initialState,
      unlockedDepths: { kobbermine: 10 },
      achievementsUnlocked: ['any_mine_depth_3', 'any_mine_two_mines'],
    }
    expect(discoverNewAchievementIds(s, s.achievementsUnlocked)).toContain('any_mine_depth_10')
  })
})
