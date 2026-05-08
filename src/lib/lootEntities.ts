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

export function spawnPositionsAround(
  origin: [number, number, number],
  count: number,
  rng: () => number = Math.random,
): [number, number, number][] {
  const [ox, oy, oz] = origin
  const out: [number, number, number][] = []
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2
    /** Bred ring omkring hug-punktet — lettere at ramme med musen */
    const r = 0.38 + rng() * 0.95
    /** Læg tæt på underlag (malmen står lavt); undgå “svævende” drops */
    const dy = 0.03 + rng() * 0.12
    out.push([ox + Math.cos(a) * r, oy + dy, oz + Math.sin(a) * r])
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
  rng: () => number = Math.random,
): WorldLootEntity[] {
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
      const poses = spawnPositionsAround(origin, q, rng)
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
      const poses = spawnPositionsAround(origin, q, rng)
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
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng)[0] ?? origin)]
    case 'gem':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng)[0] ?? origin)]
    case 'coal': {
      const q = Math.max(1, drop.quantity)
      const poses = spawnPositionsAround(origin, q, rng)
      return Array.from({ length: q }, (_, i) =>
        makeEntity(i, { kind: 'coal', quantity: 1, pixelItem: drop.pixelItem }, poses[i] ?? origin),
      )
    }
    case 'consumable': {
      const q = Math.max(1, drop.quantity)
      const poses = spawnPositionsAround(origin, q, rng)
      return Array.from({ length: q }, (_, i) =>
        makeEntity(
          i,
          { kind: 'consumable', consumableId: drop.consumableId, quantity: 1, pixelItem: drop.pixelItem },
          poses[i] ?? origin,
        ),
      )
    }
    case 'blueprint':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng)[0] ?? origin)]
    case 'loot_pickaxe':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng)[0] ?? origin)]
    case 'loot_sword':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng)[0] ?? origin)]
    case 'loot_armour':
      return [makeEntity(0, drop, spawnPositionsAround(origin, 1, rng)[0] ?? origin)]
    default:
      return []
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
