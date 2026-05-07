import {
  MINEABLE_METALS,
  type ActiveEffect,
  type Area,
  type Gem,
  type LocationId,
  type MetalName,
  type MetalNugget,
  type PixelItem,
  type RawOre,
  type ChestTier,
  type RockEvent,
  type RockType,
  type RoughStone,
} from '../types'
import { MOON_TEAR_EFFECT_ID, rollEssenceFromMine } from '../data/essences'
import { PALETTES } from '../data/palettes'
import { CHARM_IDS } from '../data/shop'
import { createRandomGem } from './generate'
import { makeCoalPixelItem, makeNuggetPixelItem, makeOrePixelItem, makeRoughStonePixelItem } from '../data/oreTemplates'

export type { ChestTier, RockEvent } from '../types'

export function rockHpForDepth(depth: number, area: Area): number {
  return Math.floor((20 + depth * 12 + depth * depth * 0.6) * area.depthMultiplier)
}

export type MineDrop =
  | { kind: 'ore'; ore: RawOre }
  | { kind: 'nugget'; nugget: MetalNugget }
  | { kind: 'rough-stone'; stone: RoughStone }
  | { kind: 'gem'; gem: Gem }
  | { kind: 'chest'; gold: number; tier: ChestTier }
  /** Kul fra klippe-mining (Fase 1); reparations-materiale senere. */
  | { kind: 'coal'; quantity: number; pixelItem: PixelItem }
  /** Kun fra guldkiste i udvalgte miner (ikke fra almindelig klippe-drop). */
  | { kind: 'blueprint'; blueprintId: string }
  | { kind: 'nothing' }

const ROCK_EVENT_WEIGHTS: Record<RockType, number> = {
  mob: 0,
  chest: 5,
  hard: 20,
  rich: 15,
  crystal: 10,
  normal: 50,
}

const ROCK_HP_MULTIPLIERS: Record<RockType, number> = {
  mob: 1,
  normal: 1.0,
  hard: 1.6,
  rich: 1.0,
  crystal: 0.9,
  chest: 0,
}

const CHEST_TIER_GOLD_MULT: Record<ChestTier, number> = {
  wood: 1,
  silver: 1.55,
  gold: 2.35,
}

function rollChestTier(rng: () => number = Math.random): ChestTier {
  const r = rng()
  if (r < 0.52) return 'wood'
  if (r < 0.87) return 'silver'
  return 'gold'
}

export function rollRockEvent(area: Area, rng: () => number = Math.random): RockEvent {
  if (area.kind !== 'mine') return { type: 'normal', hpMultiplier: 1.0 }

  const entries = Object.entries(ROCK_EVENT_WEIGHTS) as [RockType, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [type, weight] of entries) {
    if (r < weight) {
      if (type === 'chest') {
        return { type: 'chest', hpMultiplier: 0, chestTier: rollChestTier(rng) }
      }
      return { type, hpMultiplier: ROCK_HP_MULTIPLIERS[type] }
    }
    r -= weight
  }
  return { type: 'normal', hpMultiplier: 1.0 }
}

export function rollChestReward(
  area: Area,
  depth: number,
  tier: ChestTier,
  rng: () => number = Math.random,
): number {
  const base = 10 + depth * 3
  const scaled = Math.floor(
    base * area.depthMultiplier * (0.8 + rng() * 0.4) * CHEST_TIER_GOLD_MULT[tier],
  )
  return Math.max(5, scaled)
}

export type ChestLootResult = {
  gold: number
  items: MineDrop[]
  blueprintId: string | null
}

export function rollChestLoot(
  area: Area,
  depth: number,
  tier: ChestTier,
  activeCharms: string[],
  rng: () => number = Math.random,
): ChestLootResult {
  const gold = rollChestReward(area, depth, tier, rng)
  let rarityAdd = 0
  let min = 2
  let max = 3
  if (tier === 'silver') {
    min = 3
    max = 4
    rarityAdd = 0.05
  }
  if (tier === 'gold') {
    min = 4
    max = 6
    rarityAdd = 0.12
  }
  const n = min + Math.floor(rng() * (max - min + 1))
  const items: MineDrop[] = []
  for (let i = 0; i < n; i++) {
    items.push(rollMineDrop(area, depth, activeCharms, 'normal', rarityAdd, rng))
  }
  const blueprintId = rollBlueprintFromGoldChest(area.id, tier, rng)
  return { gold, items, blueprintId }
}

/** Sjælden blueprint kun fra **guld**-kiste i Mithrilbjerget / Rune-Dybet (ikke fra klippe-drop). */
export function rollBlueprintFromGoldChest(
  areaId: LocationId,
  tier: ChestTier,
  rng: () => number = Math.random,
): string | null {
  if (tier !== 'gold') return null
  if (areaId === 'mithrilbjerget' && rng() < 0.05) return 'celestial_pendant'
  if (areaId === 'rune-dybet' && rng() < 0.03) return 'dragonscale_bracelet'
  return null
}

/** D30: større chance (og lidt større bundter) på dybere lag. */
export function coalDropChanceForRunDepth(runDepth: number): number {
  return Math.min(0.92, 0.1 + runDepth * 0.02)
}

export function rollCoalDrop(runDepth: number, rng: () => number = Math.random): MineDrop | null {
  if (rng() >= coalDropChanceForRunDepth(runDepth)) return null
  const bonusStack = runDepth >= 5 && rng() < 0.25 ? 1 : 0
  const quantity = 1 + bonusStack
  return { kind: 'coal', quantity, pixelItem: makeCoalPixelItem() }
}

/** Fase 2: mob HP (separate balance fra klippe). */
export function mobHpForDepth(depth: number, area: Area): number {
  if (area.kind !== 'mine') return 20
  return Math.floor((14 + depth * 10 + depth * depth * 0.45) * area.depthMultiplier)
}

/** Sandsynlighed for at ét felt bliver mob i stedet for klippe (D14). */
export function mobSlotChanceForDepth(depth: number): number {
  return Math.min(0.32, 0.1 + depth * 0.028)
}

/** Skade pr. mob-tick mod spilleren (Fase 2). */
export function mobDamagePerTick(depth: number): number {
  return Math.max(2, 3 + Math.floor(depth * 1.4))
}

/** D9: separat drop-tabel for nedkæmpede mobs. */
export function rollMobMineDrop(
  area: Area,
  depth: number,
  activeCharms: string[] = [],
  rng: () => number = Math.random,
): MineDrop {
  if (area.kind !== 'mine' || !area.metalPool?.length) {
    return { kind: 'nothing' }
  }
  const r = rng()
  if (r < 0.22) {
    const metal = rollMetalFromPool(area, rng)
    return {
      kind: 'ore',
      ore: {
        metalName: metal,
        quantity: 1 + Math.floor(rng() * 2),
        pixelItem: makeOrePixelItem(metal),
      },
    }
  }
  if (r < 0.4) {
    const metal = rollMetalFromPool(area, rng)
    return {
      kind: 'nugget',
      nugget: { metalName: metal, quantity: 1, pixelItem: makeNuggetPixelItem(metal) },
    }
  }
  if (r < 0.48) {
    const coal = rollCoalDrop(depth, rng)
    if (coal) return coal
  }
  return rollMineDrop(area, depth, activeCharms, 'normal', 0.04, rng)
}

export function rollMineDrop(
  area: Area,
  depth: number,
  activeCharms: string[] = [],
  rockType: RockType = 'normal',
  rarityBonusAdd = 0,
  rng: () => number = Math.random,
): MineDrop {
  if (area.kind !== 'mine' || !area.metalPool?.length) {
    return { kind: 'nothing' }
  }

  const r = rng()
  const bonus = area.rarityBonus + rarityBonusAdd
  const lucky = activeCharms.includes(CHARM_IDS.luckyMiner) ? 0.05 : 0
  const valueCharms = {
    smithEye: activeCharms.includes(CHARM_IDS.smithEye),
    deepCalm: activeCharms.includes(CHARM_IDS.deepCalm),
  }

  // Krystalvene: kraftigt boosted gem + rough-stone, ingen nuggets
  if (rockType === 'crystal') {
    const crystalGem = Math.min(0.18, (0.02 + bonus + lucky) * 3.5)
    const crystalStone = crystalGem + Math.min(0.55, (0.17 + bonus * 0.5 + lucky) * 2.5)
    if (r < crystalGem) return { kind: 'gem', gem: createRandomGem(depth, area, valueCharms) }
    if (r < crystalStone) return { kind: 'rough-stone', stone: rollRoughStone(rng) }
    if (r < 0.75) return { kind: 'ore', ore: rollRawOreFromArea(area, depth, false, rng) }
    return { kind: 'nothing' }
  }

  // Rig åre: normale tærskler, men dobbelt ore-mængde og ekstra nugget-chance
  const gemThreshold = 0.02 + bonus + lucky
  const nuggetThreshold = gemThreshold + 0.03 + bonus * 0.5 + lucky + (rockType === 'rich' ? 0.06 : 0)
  const stoneThreshold = nuggetThreshold + 0.17 + bonus * 0.5 + lucky
  const oreThreshold = 0.9

  if (r < gemThreshold) return { kind: 'gem', gem: createRandomGem(depth, area, valueCharms) }
  if (r < nuggetThreshold) return { kind: 'nugget', nugget: rollNuggetFromArea(area, rng) }
  if (r < stoneThreshold) return { kind: 'rough-stone', stone: rollRoughStone(rng) }
  if (r < oreThreshold) {
    const ore = rollRawOreFromArea(area, depth, rockType === 'rich', rng)
    return { kind: 'ore', ore }
  }
  return { kind: 'nothing' }
}

function effectActive(e: ActiveEffect, nowMs: number): boolean {
  if (e.expiresAt != null && e.expiresAt <= nowMs) return false
  return true
}

/** Ekstra essens-drop ved knust klippe (påvirkes af Månetåre og mine-bonus). */
export function rollBonusMineEssence(
  area: Area,
  activeEffects: ActiveEffect[],
  activeCharms: string[],
  nowMs = Date.now(),
): string | null {
  if (area.kind !== 'mine' || !area.metalPool?.length) return null
  let chance = 0.015 + area.rarityBonus * 0.008
  if (activeCharms.includes(CHARM_IDS.luckyMiner)) chance += 0.008
  const moonUp = activeEffects.some((e) => e.id === MOON_TEAR_EFFECT_ID && effectActive(e, nowMs))
  if (moonUp) chance += 0.028
  if (Math.random() >= chance) return null
  return rollEssenceFromMine(area)
}

export function rollMetalFromPool(area: Area, rng: () => number = Math.random): MetalName {
  const pool = area.metalPool!
  const validPool = pool.filter((p) => MINEABLE_METALS.includes(p.metal))
  if (validPool.length === 0) return pool[0].metal
  const totalWeight = validPool.reduce((s, p) => s + p.weight, 0)
  let roll = rng() * totalWeight
  for (const entry of validPool) {
    if (roll < entry.weight) return entry.metal
    roll -= entry.weight
  }
  return validPool[0].metal
}

function rollRawOreFromArea(
  area: Area,
  _depth: number,
  isRich = false,
  rng: () => number = Math.random,
): RawOre {
  const metal = rollMetalFromPool(area, rng)
  const qty = isRich
    ? 2 + Math.floor(rng() * 3) // 2–4 ved rig åre
    : 1 + Math.floor(rng() * 2) // 1–2 normalt
  return {
    metalName: metal,
    quantity: qty,
    pixelItem: makeOrePixelItem(metal),
  }
}

function rollRoughStone(rng: () => number = Math.random): RoughStone {
  const palette = PALETTES[Math.floor(rng() * PALETTES.length)]
  const r = rng()
  const quality: RoughStone['quality'] = r < 0.6 ? 'crude' : r < 0.92 ? 'fine' : 'pristine'
  return {
    id: `rough-${Date.now()}-${rng().toString(36).slice(2, 6)}`,
    paletteName: palette.name,
    quality,
    pixelItem: makeRoughStonePixelItem(palette, quality),
  }
}

function rollNuggetFromArea(area: Area, rng: () => number = Math.random): MetalNugget {
  const pool = area.metalPool!.filter((p) => MINEABLE_METALS.includes(p.metal))
  const reweighted = pool.map((p) => ({
    metal: p.metal,
    weight: 100 / Math.max(p.weight, 1),
  }))
  const total = reweighted.reduce((s, p) => s + p.weight, 0)
  let r = rng() * total
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
