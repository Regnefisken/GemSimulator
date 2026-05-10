import type { ColorMap, RawOre } from '../types'
import type { MineDrop } from '../gem/mining'
import { SCROLL_PIXEL } from '../gem/mining'

/**
 * En enkelt fysisk repræsentation i grotten. En MineDrop med quantity > 1
 * splittes til flere entities (én pr. enhed).
 */
export type WorldLootEntity = {
  id: string
  position: [number, number, number]
  /** Den oprindelige drop-template; quantity er altid 1 for ore/nugget her. */
  drop: MineDrop
  spawnTime: number
  collected: boolean
}

/** Ekstra luft fra spillable-kant — undgår drops i væg/displacement (matcher ånd fra `getPlayableHalfExtents`). */
export const LOOT_SPAWN_EDGE_MARGIN = 0.24

export type LootSpawnClampOpts = {
  playableHalfX: number
  playableHalfZ: number
  /** Default `LOOT_SPAWN_EDGE_MARGIN` */
  edgeMargin?: number
}

function clampLootXZ(
  x: number,
  z: number,
  opts: LootSpawnClampOpts,
): [number, number] {
  const m = opts.edgeMargin ?? LOOT_SPAWN_EDGE_MARGIN
  const hx = Math.max(opts.playableHalfX - m, 0.08)
  const hz = Math.max(opts.playableHalfZ - m, 0.08)
  return [Math.max(-hx, Math.min(hx, x)), Math.max(-hz, Math.min(hz, z))]
}

export type ExplodeDropToEntitiesOpts = {
  rng?: () => number
  spawnClamp?: LootSpawnClampOpts
}

export function spawnPositionsAround(
  origin: [number, number, number],
  count: number,
  rng: () => number = Math.random,
  clamp?: LootSpawnClampOpts,
): [number, number, number][] {
  const [ox, oy, oz] = origin
  const out: [number, number, number][] = []
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2
    /** Bred ring omkring hug-punktet — lettere at ramme med musen */
    const r = 0.38 + rng() * 0.95
    /** Små variation oven på basis — basis (`MINE_LOOT_SCATTER_BASE_Y`) bærer voxel‑højden */
    const dy = 0.012 + rng() * 0.045
    let x = ox + Math.cos(a) * r
    let z = oz + Math.sin(a) * r
    if (clamp) {
      ;[x, z] = clampLootXZ(x, z, clamp)
    }
    out.push([x, oy + dy, z])
  }
  return out
}

function cloneOreQty1(ore: RawOre): RawOre {
  return {
    ...ore,
    quantity: 1,
    pixelItem: ore.pixelItem,
  }
}

/** Splitter et MineDrop med quantity > 1 til N separate entities á quantity 1. */
export function explodeDropToEntities(
  drop: MineDrop,
  origin: [number, number, number],
  opts: ExplodeDropToEntitiesOpts = {},
): WorldLootEntity[] {
  const rng = opts.rng ?? Math.random
  const clamp = opts.spawnClamp
  const now = performance.now()
  const baseId = `loot-${now}-${Math.floor(rng() * 1e9)}`

  const makeEntity = (idx: number, d: MineDrop, pos: [number, number, number]): WorldLootEntity => ({
    id: `${baseId}-${idx}`,
    position: pos,
    drop: d,
    spawnTime: now / 1000,
    collected: false,
  })

  switch (drop.kind) {
    case 'ore': {
      const q = Math.max(1, drop.ore.quantity)
      const poses = spawnPositionsAround(origin, q, rng, clamp)
      return drop.ore.quantity <= 1
        ? [makeEntity(0, { kind: 'ore', ore: cloneOreQty1(drop.ore) }, poses[0] ?? origin)]
        : Array.from({ length: q }, (_, i) =>
            makeEntity(
              i,
              { kind: 'ore', ore: cloneOreQty1(drop.ore) },
              poses[i] ?? origin,
            ),
          )
    }
    case 'nugget': {
      const q = Math.max(1, drop.nugget.quantity)
      const poses = spawnPositionsAround(origin, q, rng, clamp)
      return drop.nugget.quantity <= 1
        ? [
            makeEntity(
              0,
              { kind: 'nugget', nugget: { ...drop.nugget, quantity: 1 } },
              poses[0] ?? origin,
            ),
          ]
        : Array.from({ length: q }, (_, i) =>
            makeEntity(
              i,
              {
                kind: 'nugget',
                nugget: { ...drop.nugget, quantity: 1 },
              },
              poses[i] ?? origin,
            ),
          )
    }
    case 'rough-stone':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng, clamp)[0] ?? origin)]
    case 'gem':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng, clamp)[0] ?? origin)]
    case 'coal': {
      const q = Math.max(1, drop.quantity)
      const poses = spawnPositionsAround(origin, q, rng, clamp)
      return Array.from({ length: q }, (_, i) =>
        makeEntity(i, { kind: 'coal', quantity: 1, pixelItem: drop.pixelItem }, poses[i] ?? origin),
      )
    }
    case 'consumable': {
      const q = Math.max(1, drop.quantity)
      const poses = spawnPositionsAround(origin, q, rng, clamp)
      return Array.from({ length: q }, (_, i) =>
        makeEntity(
          i,
          { kind: 'consumable', consumableId: drop.consumableId, quantity: 1, pixelItem: drop.pixelItem },
          poses[i] ?? origin,
        ),
      )
    }
    case 'blueprint':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng, clamp)[0] ?? origin)]
    case 'loot_pickaxe':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng, clamp)[0] ?? origin)]
    case 'loot_sword':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng, clamp)[0] ?? origin)]
    case 'loot_armour':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng, clamp)[0] ?? origin)]
    default:
      return []
  }
}

/** Basis-skala for verdens-loot (`WorldLootItem`); gang med `worldLootKindScale`. */
export const WORLD_LOOT_BASE_SCALE = 0.085

/**
 * Relativ skala pr. drop-type — ædelsten er reference (1); malm og rå klippe små (voxel-grid varierer).
 */
export function worldLootKindScale(drop: MineDrop): number {
  switch (drop.kind) {
    case 'gem':
      return 1
    case 'coal':
      return 0.4
    case 'ore':
      return 0.33
    case 'nugget':
      return 0.62
    case 'rough-stone':
      return 0.5
    case 'consumable':
      return 0.56
    case 'blueprint':
      return 0.64
    case 'loot_pickaxe':
    case 'loot_sword':
    case 'loot_armour':
      return 0.74
    default:
      return 1
  }
}

export function getDropPixelData(drop: MineDrop): { data: string[]; colorMap: ColorMap } | null {
  switch (drop.kind) {
    case 'ore':
      return { data: drop.ore.pixelItem.data, colorMap: drop.ore.pixelItem.colorMap }
    case 'nugget':
      return { data: drop.nugget.pixelItem.data, colorMap: drop.nugget.pixelItem.colorMap }
    case 'rough-stone':
      return { data: drop.stone.pixelItem.data, colorMap: drop.stone.pixelItem.colorMap }
    case 'gem':
      return { data: drop.gem.data, colorMap: drop.gem.colorMap }
    case 'coal':
      return { data: drop.pixelItem.data, colorMap: drop.pixelItem.colorMap }
    case 'consumable':
      return { data: drop.pixelItem.data, colorMap: drop.pixelItem.colorMap }
    case 'blueprint': {
      const pi = drop.pixelItem ?? SCROLL_PIXEL
      return { data: pi.data, colorMap: pi.colorMap }
    }
    case 'loot_pickaxe':
      return { data: drop.pickaxe.pixelItem.data, colorMap: drop.pickaxe.pixelItem.colorMap }
    case 'loot_sword':
      return { data: drop.sword.pixelItem.data, colorMap: drop.sword.pixelItem.colorMap }
    case 'loot_armour':
      return { data: drop.armour.pixelItem.data, colorMap: drop.armour.pixelItem.colorMap }
    default:
      return null
  }
}
