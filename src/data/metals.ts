import type { MetalInclusion, MetalName } from '../types'

export const METALS: Record<MetalName, MetalInclusion> = {
  Tin: { name: 'Tin', icon: '⚪', pixelColor: '#d4d4d8', goldBonus: 1.1, effect: '+10% guld' },
  Kobber: { name: 'Kobber', icon: '🔶', pixelColor: '#b45309', goldBonus: 1.2, effect: '+20% guld' },
  Jern: { name: 'Jern', icon: '⬛', pixelColor: '#52525b', goldBonus: 1.35, effect: '+35% guld' },
  Bronze: { name: 'Bronze', icon: '🟫', pixelColor: '#92400e', goldBonus: 1.5, effect: '+50% guld' },
  Sølv: { name: 'Sølv', icon: '⬜', pixelColor: '#cbd5e1', goldBonus: 1.9, effect: '+90% guld' },
  Guld: { name: 'Guld', icon: '🟡', pixelColor: '#fcd34d', goldBonus: 2.5, effect: '+150% guld' },
  Titanium: { name: 'Titanium', icon: '🔘', pixelColor: '#71717a', goldBonus: 1.7, effect: '+70% guld + lethed' },
  Platin: { name: 'Platin', icon: '⚪', pixelColor: '#e2e8f0', goldBonus: 3.2, effect: '+220% guld + glans' },
  Mithril: { name: 'Mithril', icon: '💠', pixelColor: '#818cf8', goldBonus: 4.0, effect: '+300% guld + glow' },
  Runestål: { name: 'Runestål', icon: '🔷', pixelColor: '#6ee7b7', goldBonus: 6.0, effect: '+500% guld + rune-aura' },
  Orichalcum: { name: 'Orichalcum', icon: '🟠', pixelColor: '#fb923c', goldBonus: 5.0, effect: '+400% guld + ild-aura' },
  Elektrum: { name: 'Elektrum', icon: '🟨', pixelColor: '#fef3c7', goldBonus: 2.2, effect: '+120% guld + sølv-skær' },
}
