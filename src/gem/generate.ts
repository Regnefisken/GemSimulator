import type { Area, ColorMap, Gem, MagicProperty, MetalInclusion, MetalName } from '../types'
import { METALS } from '../data/metals'
import { MAGIC_PROPERTIES } from '../data/magic'
import { PALETTES } from '../data/palettes'
import { TEMPLATES } from '../data/templates'

const METAL_SLOT_CHARS = ['1', '2', '3'] as const

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

/** 61.5% / 30% / 7% / 1.5% for 0 / 1 / 2 / 3 egenskaber — unikke navne. */
export function rollMagicProperties(opts?: { excludeLegendary?: boolean }): MagicProperty[] {
  const r = Math.random() * 100
  let count = 0
  if (r < 61.5) count = 0
  else if (r < 91.5) count = 1
  else if (r < 98.5) count = 2
  else count = 3

  if (count === 0) return []

  const pool = opts?.excludeLegendary ? MAGIC_PROPERTIES.filter((p) => p.rarity !== 'legendary') : MAGIC_PROPERTIES
  const picked: MagicProperty[] = []
  const used = new Set<string>()

  for (let i = 0; i < count; i++) {
    const magicRoll = Math.random()
    let candidates: MagicProperty[]
    if (magicRoll < 0.02 && !opts?.excludeLegendary) {
      candidates = pool.filter((p) => p.rarity === 'legendary')
    } else if (magicRoll < 0.12) {
      candidates = pool.filter((p) => p.rarity === 'rare')
    } else if (magicRoll < 0.35) {
      candidates = pool.filter((p) => p.rarity === 'uncommon')
    } else {
      candidates = pool.filter((p) => p.rarity === 'common')
    }

    let avail = candidates.filter((p) => !used.has(p.name))
    if (avail.length === 0) {
      avail = pool.filter((p) => !used.has(p.name))
    }
    if (avail.length === 0) break

    const pick = avail[Math.floor(Math.random() * avail.length)]
    if (pick) {
      picked.push(pick)
      used.add(pick.name)
    }
  }

  return picked
}

function metalRollWeight(m: MetalName, rarityBonus: number): number {
  return Math.pow(METALS[m].goldBonus, 1.35) * (1 + rarityBonus * 2.2)
}

/** Ekstra metal-inklusioner (M1–M3 i grid); sjældnere metaller vægtes højere med area.rarityBonus. */
export function rollMetalInclusions(area?: Area): MetalInclusion[] {
  const bonus = area?.rarityBonus ?? 0
  const pAny = 0.055 + bonus * 0.42
  if (Math.random() > pAny) return []

  const nRoll = Math.random()
  let num = 1
  if (nRoll < 0.52) num = 1
  else if (nRoll < 0.86) num = 2
  else num = 3

  const names = Object.keys(METALS) as MetalName[]
  const picked: MetalInclusion[] = []
  const used = new Set<MetalName>()

  for (let i = 0; i < num; i++) {
    const pool = names.filter((n) => !used.has(n))
    if (pool.length === 0) break
    const totalW = pool.reduce((s, n) => s + metalRollWeight(n, bonus), 0)
    let roll = Math.random() * totalW
    for (const n of pool) {
      const w = metalRollWeight(n, bonus)
      if (roll < w) {
        picked.push({ ...METALS[n] })
        used.add(n)
        break
      }
      roll -= w
    }
  }

  return picked
}

function addMetalInclusionMarks(baseData: string[], slotChars: string[]): string[] {
  if (slotChars.length === 0) return baseData
  const grid = cloneTemplate(baseData)
  const height = grid.length
  const width = grid[0].length

  for (let s = 0; s < slotChars.length; s++) {
    const ch = slotChars[s]
    const numClumps = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < numClumps; i++) {
      const cy = 4 + Math.floor(Math.random() * (height - 9))
      const cx = 4 + Math.floor(Math.random() * (width - 9))
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.random() < 0.72) {
            const ny = cy + dy
            const nx = cx + dx
            if (ny > 0 && ny < height - 1 && nx > 0 && nx < width - 1) {
              const cur = grid[ny][nx]
              if (cur === 'G' || cur === 'D' || cur === 'L') {
                grid[ny][nx] = ch
              }
            }
          }
        }
      }
    }
  }
  return grid.map((row) => row.join(''))
}

export function computeGoldValue(gem: Gem, depth: number): number {
  const magicMul = [1, 2.5, 7, 20][gem.magicProperties.length] ?? 1
  const metalMul = gem.metalInclusions.reduce((m, x) => m * x.goldBonus, 1)
  const purityMul = [0.5, 1, 1.5, 3][gem.purity - 1] ?? 1
  const depthMul = 1 + depth * 0.1
  return Math.max(1, Math.floor(5 * magicMul * metalMul * purityMul * depthMul))
}

export function createRandomGem(depth = 0, area?: Area): Gem {
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

  const metalInclusions: MetalInclusion[] = []
  const usedMetals = new Set<MetalName>()

  if (hasGoldInclusions) {
    purity = 4
    const karatRoll = Math.random()
    if (karatRoll < 0.08) karat = 24
    else if (karatRoll < 0.28) karat = 22
    else if (karatRoll < 0.55) karat = 18
    else if (karatRoll < 0.8) karat = 14
    else karat = 9

    finalData = addGoldInclusions(finalData)
    colorMap.X = METALS.Guld.pixelColor
    metalInclusions.push({ ...METALS.Guld, pixelColor: colorMap.X })
    usedMetals.add('Guld')
  } else {
    const purityRoll = Math.random()
    if (purityRoll < 0.25) purity = 3
    else if (purityRoll > 0.75) purity = 1
  }

  const rolled = rollMetalInclusions(area).filter((m) => !usedMetals.has(m.name))
  const slotChars: string[] = []
  for (let i = 0; i < rolled.length && i < METAL_SLOT_CHARS.length; i++) {
    const inc = rolled[i]
    const slot = METAL_SLOT_CHARS[i]
    colorMap[slot] = inc.pixelColor
    metalInclusions.push(inc)
    usedMetals.add(inc.name)
    slotChars.push(slot)
  }

  if (slotChars.length > 0) {
    finalData = addMetalInclusionMarks(finalData, slotChars)
  }

  const isFlawless = purity >= 3
  finalData = mutateGemData(finalData, isFlawless)

  if (isGodTier) {
    finalData = mutateGemData(finalData, true)
  }

  if (Math.random() < 0.48) {
    finalData = mirrorGemDataHorizontally(finalData)
  }

  const magicProperties = rollMagicProperties()

  const gem: Gem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${templateObj.shapeName} ${palette.name}`,
    purity,
    karat,
    data: finalData,
    colorMap,
    timestamp: new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isGodTier,
    metalInclusions,
    magicProperties,
    goldValue: 0,
  }
  gem.goldValue = computeGoldValue(gem, depth)
  return gem
}

/** Preload: ingen legendary magic; lavere metal-chance uden area-bonus. */
export function createPreloadGem(i: number, depth = 0): Gem {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]
  const templateObj = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
  const hasGold = Math.random() < 0.07
  let purity = hasGold ? 4 : Math.random() < 0.25 ? 3 : Math.random() < 0.7 ? 2 : 1
  let karat: number | null = null
  let data = mutateGemData(templateObj.data, purity >= 3)
  const colorMap: ColorMap = { ...palette.colorMap }

  const metalInclusions: MetalInclusion[] = []
  const usedMetals = new Set<MetalName>()

  if (hasGold) {
    const karatRoll = Math.random()
    if (karatRoll < 0.08) karat = 24
    else if (karatRoll < 0.28) karat = 22
    else if (karatRoll < 0.55) karat = 18
    else if (karatRoll < 0.8) karat = 14
    else karat = 9
    data = addGoldInclusions(data)
    colorMap.X = METALS.Guld.pixelColor
    metalInclusions.push({ ...METALS.Guld, pixelColor: colorMap.X })
    usedMetals.add('Guld')
  }

  const rolled = rollMetalInclusions(undefined).filter((m) => !usedMetals.has(m.name))
  const slotChars: string[] = []
  for (let j = 0; j < rolled.length && j < METAL_SLOT_CHARS.length; j++) {
    const inc = rolled[j]
    const slot = METAL_SLOT_CHARS[j]
    colorMap[slot] = inc.pixelColor
    metalInclusions.push(inc)
    slotChars.push(slot)
  }
  if (slotChars.length > 0) {
    data = addMetalInclusionMarks(data, slotChars)
  }

  if (Math.random() < 0.48) {
    data = mirrorGemDataHorizontally(data)
  }

  const magicProperties = rollMagicProperties({ excludeLegendary: true })

  const gem: Gem = {
    id: `${Date.now()}-${i}`,
    name: `${templateObj.shapeName} ${palette.name}`,
    purity,
    karat,
    data,
    colorMap,
    timestamp: new Date(Date.now() - i * 90000).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }),
    isGodTier: false,
    metalInclusions,
    magicProperties,
    goldValue: 0,
  }
  gem.goldValue = computeGoldValue(gem, depth)
  return gem
}

export { TEMPLATES }
