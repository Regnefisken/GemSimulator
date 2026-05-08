import type { GameState } from '../types'
import { selectAnyMineStats } from '../selectors/achievements'

export type AchievementDef = {
  id: string
  title: string
  description: string
  icon: string
  check: (s: GameState) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_gem',
    title: 'Første skær',
    description: 'Find eller skær din første ædelsten.',
    icon: '💎',
    check: (s) => s.totalGemsFound >= 1,
  },
  {
    id: 'gems_25',
    title: 'Samler',
    description: 'Find eller skær 25 ædelsten i alt.',
    icon: '✨',
    check: (s) => s.totalGemsFound >= 25,
  },
  {
    id: 'depth_50',
    title: 'Dybt nok',
    description: 'Ryd 50 klippe-felter i alt (alle miner).',
    icon: '⛏️',
    check: (s) => s.totalRockSlotsCleared >= 50,
  },
  {
    id: 'depth_200',
    title: 'Underverdenen',
    description: 'Ryd 200 klippe-felter i alt.',
    icon: '🕳️',
    check: (s) => s.totalRockSlotsCleared >= 200,
  },
  {
    id: 'essence_first',
    title: 'Æterisk spor',
    description: 'Modtag din første essens.',
    icon: '🌙',
    check: (s) => s.totalEssencesCollected >= 1,
  },
  {
    id: 'essence_25',
    title: 'Essensjæger',
    description: 'Saml 25 essenser i alt.',
    icon: '◇',
    check: (s) => s.totalEssencesCollected >= 25,
  },
  {
    id: 'gold_1000',
    title: 'Velhavende',
    description: 'Have mindst 1000 guld på én gang.',
    icon: '🪙',
    check: (s) => s.hubInventory.gold >= 1000,
  },
  {
    id: 'rep_5',
    title: 'Omtale',
    description: 'Nå mindst 5 omdømme.',
    icon: '✦',
    check: (s) => s.reputation >= 5,
  },
  {
    id: 'jewelry_craft',
    title: 'Guldsmed',
    description: 'Lav dit første smykke.',
    icon: '💍',
    check: (s) => s.totalJewelryCrafted >= 1,
  },
  {
    id: 'master_jeweler',
    title: 'Mester-juveler',
    description: 'Smed 10 smykker i alt.',
    icon: '👑',
    check: (s) => s.totalJewelryCrafted >= 10,
  },
  {
    id: 'level_10',
    title: 'Erfaren',
    description: 'Nå level 10.',
    icon: '⭐',
    check: (s) => s.level >= 10,
  },
  {
    id: 'any_mine_depth_3',
    title: 'Hul i jorden',
    description: 'Nå mindst dybde 3 i mindst én mine (samlet på tværs af miner).',
    icon: '🕳️',
    check: (s) => selectAnyMineStats(s).deepestAcrossMines >= 3,
  },
  {
    id: 'any_mine_two_mines',
    title: 'Vandringsmand',
    description: 'Har haft dybde mindst 1 i mindst to forskellige miner.',
    icon: '🧭',
    check: (s) => selectAnyMineStats(s).minesWithProgress >= 2,
  },
  {
    id: 'any_mine_depth_10',
    title: 'Dybt spor',
    description: 'Nå mindst dybde 10 i mindst én mine.',
    icon: '⛰️',
    check: (s) => selectAnyMineStats(s).deepestAcrossMines >= 10,
  },
]

const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

export function getAchievementDef(id: string): AchievementDef | undefined {
  return byId.get(id)
}

/** Id'er der opfylder betingelsen men ikke allerede er i `unlocked`. */
export function discoverNewAchievementIds(state: GameState, unlocked: readonly string[]): string[] {
  const have = new Set(unlocked)
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(state)).map((a) => a.id)
}
