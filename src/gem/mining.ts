import { MINEABLE_METALS, type Area, type Gem, type MetalName, type MetalNugget, type RawOre, type RoughStone } from '../types'
import { PALETTES } from '../data/palettes'
import { createRandomGem } from './generate'
import { makeNuggetPixelItem, makeOrePixelItem, makeRoughStonePixelItem } from '../data/oreTemplates'

export function rockHpForDepth(depth: number, area: Area): number {
  return Math.floor((20 + depth * 12 + depth * depth * 0.6) * area.depthMultiplier)
}

export type MineDrop =
  | { kind: 'ore'; ore: RawOre }
  | { kind: 'nugget'; nugget: MetalNugget }
  | { kind: 'rough-stone'; stone: RoughStone }
  | { kind: 'gem'; gem: Gem }
  | { kind: 'nothing' }

export function rollMineDrop(area: Area, depth: number): MineDrop {
  if (area.kind !== 'mine' || !area.metalPool?.length) {
    return { kind: 'nothing' }
  }

  const r = Math.random()
  const bonus = area.rarityBonus
  const gemThreshold = 0.02 + bonus
  const nuggetThreshold = gemThreshold + 0.03 + bonus * 0.5
  const stoneThreshold = nuggetThreshold + 0.17 + bonus * 0.5
  const oreThreshold = 0.9

  if (r < gemThreshold) return { kind: 'gem', gem: createRandomGem(depth, area) }
  if (r < nuggetThreshold) return { kind: 'nugget', nugget: rollNuggetFromArea(area) }
  if (r < stoneThreshold) return { kind: 'rough-stone', stone: rollRoughStone() }
  if (r < oreThreshold) return { kind: 'ore', ore: rollRawOreFromArea(area, depth) }
  return { kind: 'nothing' }
}

export function rollMetalFromPool(area: Area): MetalName {
  const pool = area.metalPool!
  const validPool = pool.filter((p) => MINEABLE_METALS.includes(p.metal))
  if (validPool.length === 0) return pool[0].metal
  const totalWeight = validPool.reduce((s, p) => s + p.weight, 0)
  let roll = Math.random() * totalWeight
  for (const entry of validPool) {
    if (roll < entry.weight) return entry.metal
    roll -= entry.weight
  }
  return validPool[0].metal
}

function rollRawOreFromArea(area: Area, _depth: number): RawOre {
  const metal = rollMetalFromPool(area)
  return {
    metalName: metal,
    quantity: 1 + Math.floor(Math.random() * 2),
    pixelItem: makeOrePixelItem(metal),
  }
}

function rollRoughStone(): RoughStone {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]
  const r = Math.random()
  const quality: RoughStone['quality'] = r < 0.6 ? 'crude' : r < 0.92 ? 'fine' : 'pristine'
  return {
    id: `rough-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    paletteName: palette.name,
    quality,
    pixelItem: makeRoughStonePixelItem(palette, quality),
  }
}

function rollNuggetFromArea(area: Area): MetalNugget {
  const pool = area.metalPool!.filter((p) => MINEABLE_METALS.includes(p.metal))
  const reweighted = pool.map((p) => ({
    metal: p.metal,
    weight: 100 / Math.max(p.weight, 1),
  }))
  const total = reweighted.reduce((s, p) => s + p.weight, 0)
  let r = Math.random() * total
  for (const entry of reweighted) {
    if (r < entry.weight) {
      return {
        metalName: entry.metal,
        quantity: 1,
        pixelItem: makeNuggetPixelItem(entry.metal),
      }
    }
    r -= entry.weight
  }
  const fallback = pool[0]?.metal ?? 'Kobber'
  return { metalName: fallback, quantity: 1, pixelItem: makeNuggetPixelItem(fallback) }
}
