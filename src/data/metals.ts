import type { MetalInclusion, MetalName } from '../types'

export const METALS: Record<MetalName, MetalInclusion> = {
  Tin: { name: 'Tin', icon: '⚪', pixelColor: '#d4d4d8', goldBonus: 1.1, effect: '+10% guld' },
  Kobber: { name: 'Kobber', icon: '🔶', pixelColor: '#b45309', goldBonus: 1.2, effect: '+20% guld' },
  Jern: { name: 'Jern', icon: '⬛', pixelColor: '#52525b', goldBonus: 1.35, effect: '+35% guld' },
  Bronze: { name: 'Bronze', icon: '🟫', pixelColor: '#92400e', goldBonus: 1.5, effect: '+50% guld' },
  Sølv: { name: 'Sølv', icon: '⬜', pixelColor: '#cbd5e1', goldBonus: 1.9, effect: '+90% guld' },
  Guld: { name: 'Guld', icon: '🟡', pixelColor: '#fcd34d', goldBonus: 2.5, effect: '+150% guld' },
  Mithril: { name: 'Mithril', icon: '💠', pixelColor: '#818cf8', goldBonus: 4.0, effect: '+300% guld + glow' },
  Runestål: { name: 'Runestål', icon: '🔷', pixelColor: '#6ee7b7', goldBonus: 6.0, effect: '+500% guld + rune-aura' },
}
