import type { ChestLootResult } from '../gem/mining'

/** Ét felt på det aktuelle mine-lag (D1: kun ét lag i hukommelse ad gangen). */
export type MineRunSlotState = {
  slotIndex: number
  kind: 'rock' | 'chest' | 'mob'
  rockType: 'normal' | 'hard' | 'rich' | 'crystal' | 'chest' | 'mob'
  chestTier?: 'wood' | 'silver' | 'gold'
  chestEntityId?: string
  maxHp: number
  currentHp: number
  cleared: boolean
  /** Fase 2: mob-tier (balance); kun når `kind === 'mob'`. */
  mobTier?: number
  /** Kiste har været åbnet mindst én gang (UI / XP). */
  chestOpened?: boolean
  /** Forudrullet ved lag-generering (D3). */
  chestLoot?: ChestLootResult
}

/** Aktiv mine-run; persist i save. */
export type MineRunState = {
  runId: string
  mineId: string
  currentDepth: number
  /** D64/D65: klippefelter ryddet i *denne* run (til valid-run-gate). */
  rockSlotsClearedThisRun: number
  /** `-1` = intet aktivt mål (ingen markering før første hug / valg). */
  targetSlotIndex: number
  slots: MineRunSlotState[]
}
