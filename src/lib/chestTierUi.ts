import type { ChestTier } from '../types'

/** Dansk UI-navn (sammensat: Trækiste, Sølvkiste, Guldkiste). */
export const CHEST_TIER_NAME_DK: Record<ChestTier, string> = {
  wood: 'Trækiste',
  silver: 'Sølvkiste',
  gold: 'Guldkiste',
}

/** Badge i mine-HUD (emoji + navn). */
export const CHEST_TIER_HUD_BADGE: Record<ChestTier, string> = {
  wood: '🪵 Trækiste',
  silver: '⚪ Sølvkiste',
  gold: '🌟 Guldkiste',
}
