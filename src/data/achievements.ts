import type { GameState } from '../types'

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
    description: 'Knus 50 klipper i minen (dybde 50+).',
    icon: '⛏️',
    check: (s) => s.depth >= 50,
  },
  {
    id: 'depth_200',
    title: 'Underverdenen',
    description: 'Knus 200 klipper i minen.',
    icon: '🕳️',
    check: (s) => s.depth >= 200,
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
    check: (s) => s.gold >= 1000,
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
    check: (s) => s.jewelry.length >= 1,
  },
  {
    id: 'level_10',
    title: 'Erfaren',
    description: 'Nå level 10.',
    icon: '⭐',
    check: (s) => s.level >= 10,
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
