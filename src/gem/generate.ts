import type { ColorMap, Gem, MagicProperty } from '../types'
import { MAGIC_PROPERTIES } from '../data/magic'
import { PALETTES } from '../data/palettes'
import { TEMPLATES } from '../data/templates'

function cloneTemplate(data: string[]): string[][] {
  return data.map((row) => row.split(''))
}

export function mirrorGemDataHorizontally(data: string[]): string[] {
  return data.map((row) => row.split('').reverse().join(''))
}

export function mutateGemData(baseData: string[], isFlawless = false): string[] {
  const grid = cloneTemplate(baseData)
  const rows = grid.length
  const cols = grid[0].length

  const sparkleCount = isFlawless ? ((Math.random() * 18 + 12) | 0) : ((Math.random() * 12 + 6) | 0)
  for (let i = 0; i < sparkleCount; i++) {
    const y = (Math.random() * rows) | 0
    const x = (Math.random() * cols) | 0
    const char = grid[y][x]
    if (char === 'G' || char === 'L' || char === 'D') {
      grid[y][x] = 'W'
    }
  }

  const facetCount = isFlawless ? ((Math.random() * 4 + 2) | 0) : ((Math.random() * 8 + 4) | 0)
  for (let i = 0; i < facetCount; i++) {
    const y = 3 + ((Math.random() * (rows - 6)) | 0)
    const x = 3 + ((Math.random() * (cols - 6)) | 0)
    const char = grid[y][x]
    if (char === 'G') grid[y][x] = Math.random() > 0.5 ? 'L' : 'D'
    else if (char === 'L') grid[y][x] = Math.random() > 0.6 ? 'G' : 'W'
  }

  return grid.map((row) => row.join(''))
}

export function addGoldInclusions(baseData: string[]): string[] {
  const grid = cloneTemplate(baseData)
  const height = grid.length
  const width = grid[0].length

  const numClumps = 3 + Math.floor(Math.random() * 5)
  for (let i = 0; i < numClumps; i++) {
    const cy = 4 + Math.floor(Math.random() * (height - 9))
    const cx = 4 + Math.floor(Math.random() * (width - 9))

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.random() < 0.8) {
          const ny = cy + dy
          const nx = cx + dx
          if (ny > 0 && ny < height - 1 && nx > 0 && nx < width - 1) {
            const current = grid[ny][nx]
            if (current === 'G' || current === 'D' || current === 'L') {
              grid[ny][nx] = 'X'
            }
          }
        }
      }
    }
  }
  return grid.map((row) => row.join(''))
}

function rollMagicProperty(): MagicProperty | null {
  if (Math.random() >= 0.35) return null
  const magicRoll = Math.random()
  let availableProps: MagicProperty[]

  if (magicRoll < 0.02) {
    availableProps = MAGIC_PROPERTIES.filter((p) => p.rarity === 'legendary')
  } else if (magicRoll < 0.12) {
    availableProps = MAGIC_PROPERTIES.filter((p) => p.rarity === 'rare')
  } else if (magicRoll < 0.35) {
    availableProps = MAGIC_PROPERTIES.filter((p) => p.rarity === 'uncommon')
  } else {
    availableProps = MAGIC_PROPERTIES.filter((p) => p.rarity === 'common')
  }

  return availableProps[Math.floor(Math.random() * availableProps.length)] ?? null
}

export function createRandomGem(): Gem {
  const isGodTier = Math.random() < 0.12

  let palette
  if (Math.random() < 0.09) {
    palette = PALETTES.find((p) => p.name === 'Citrin') ?? PALETTES[0]
  } else {
    const normalPalettes = PALETTES.filter((p) => p.name !== 'Citrin')
    palette = normalPalettes[Math.floor(Math.random() * normalPalettes.length)]
  }

  const templateObj = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]

  const hasGoldInclusions = isGodTier ? Math.random() < 0.38 : Math.random() < 0.065

  let purity = 2
  let karat: number | null = null
  const colorMap: ColorMap = { ...palette.colorMap }
  let finalData = mutateGemData(templateObj.data, false)

  if (hasGoldInclusions) {
    purity = 4
    const karatRoll = Math.random()
    if (karatRoll < 0.08) karat = 24
    else if (karatRoll < 0.28) karat = 22
    else if (karatRoll < 0.55) karat = 18
    else if (karatRoll < 0.8) karat = 14
    else karat = 9

    finalData = addGoldInclusions(finalData)
    colorMap.X = '#fcd34d'
  } else {
    const purityRoll = Math.random()
    if (purityRoll < 0.25) purity = 3
    else if (purityRoll > 0.75) purity = 1
  }

  const isFlawless = purity >= 3
  finalData = mutateGemData(finalData, isFlawless)

  if (isGodTier) {
    finalData = mutateGemData(finalData, true)
  }

  if (Math.random() < 0.48) {
    finalData = mirrorGemDataHorizontally(finalData)
  }

  const magicProperty = rollMagicProperty()

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${templateObj.shapeName} ${palette.name}`,
    purity,
    karat,
    data: finalData,
    colorMap,
    timestamp: new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isGodTier,
    hasGoldInclusions,
    magicProperty,
  }
}

/** Matches original `window.onload` preload (no legendary magic). */
export function createPreloadGem(i: number): Gem {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]
  const templateObj = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
  const hasGold = Math.random() < 0.07
  let purity = hasGold ? 4 : Math.random() < 0.25 ? 3 : Math.random() < 0.7 ? 2 : 1
  let karat: number | null = null
  let data = mutateGemData(templateObj.data, purity >= 3)
  const colorMap: ColorMap = { ...palette.colorMap }

  if (hasGold) {
    const karatRoll = Math.random()
    if (karatRoll < 0.08) karat = 24
    else if (karatRoll < 0.28) karat = 22
    else if (karatRoll < 0.55) karat = 18
    else if (karatRoll < 0.8) karat = 14
    else karat = 9
    data = addGoldInclusions(data)
    colorMap.X = '#fcd34d'
  }

  if (Math.random() < 0.48) {
    data = mirrorGemDataHorizontally(data)
  }

  let magicProp: MagicProperty | null = null
  if (Math.random() < 0.3) {
    const safeProps = MAGIC_PROPERTIES.filter((p) => p.rarity !== 'legendary')
    magicProp = safeProps[Math.floor(Math.random() * safeProps.length)] ?? null
  }

  return {
    id: `${Date.now()}-${i}`,
    name: `${templateObj.shapeName} ${palette.name}`,
    purity,
    karat,
    data,
    colorMap,
    timestamp: new Date(Date.now() - i * 90000).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }),
    isGodTier: false,
    hasGoldInclusions: hasGold,
    magicProperty: magicProp,
  }
}

export { TEMPLATES }
