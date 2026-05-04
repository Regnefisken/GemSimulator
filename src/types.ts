export type ColorMap = Record<string, string>

export type MagicProperty = {
  name: string
  icon: string
  color: string
  glow: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
}

export type Gem = {
  id: string
  name: string
  purity: number
  karat: number | null
  data: string[]
  colorMap: ColorMap
  timestamp: string
  isGodTier: boolean
  hasGoldInclusions: boolean
  magicProperty: MagicProperty | null
}

export type Palette = { name: string; colorMap: ColorMap }

export type Template = { shapeName: string; data: string[] }
