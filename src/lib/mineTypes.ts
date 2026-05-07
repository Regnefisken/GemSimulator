import type { ChestLootResult } from '../gem/mining'

/** Ét felt på det aktuelle mine-lag (D1: kun ét lag i hukommelse ad gangen). */
export type MineRunSlotState = {
  slotIndex: number
  kind: 'rock' | 'chest'
  rockType: 'normal' | 'hard' | 'rich' | 'crystal' | 'chest'
  chestTier?: 'wood' | 'silver' | 'gold'
  chestEntityId?: string
  maxHp: number
  currentHp: number
  cleared: boolean
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
  targetSlotIndex: number
  slots: MineRunSlotState[]
}
