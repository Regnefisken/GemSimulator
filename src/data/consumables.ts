import type { PixelItem } from '../types'

export type WorkshopTabId = 'food' | 'potion' | 'ingredient'

export type ConsumableEffectKind = 'heal_hp' | 'heal_mana'

export type ConsumableDef = {
  id: string
  name: string
  description: string
  tab: WorkshopTabId
  /** Guldpris i alkymist-værkstedet. */
  price: number
  kind: 'food' | 'potion'
  effect: ConsumableEffectKind
  /** Effekt-værdi (HP eller mana). */
  value: number
  pixelItem: PixelItem
}

const BREAD_PIXEL: PixelItem = {
  data: ['..OO..', '.OOOO.', 'OOOOOO', '.OOOO.', '..OO..'],
  colorMap: { O: '#d4a574', '.': 'transparent' },
}

const VIAL_PIXEL: PixelItem = {
  data: ['..GG..', '.GSSG.', '.GSSG.', '.GSSG.', '..GG..'],
  colorMap: { G: '#94a3b8', S: '#38bdf8', '.': 'transparent' },
}

const MOSS_PIXEL: PixelItem = {
  data: ['..MM..', '.MMMM.', '.MMMM.', '..MM..'],
  colorMap: { M: '#4ade80', '.': 'transparent' },
}

/** Fase 3: mad / potions / placeholder-ingrediens til værkstedet. */
export const CONSUMABLE_DEFS: ConsumableDef[] = [
  {
    id: 'cons_bread_minor',
    name: 'Skorpebrød',
    description: 'Genopretter lidt liv.',
    tab: 'food',
    price: 25,
    kind: 'food',
    effect: 'heal_hp',
    value: 18,
    pixelItem: BREAD_PIXEL,
  },
  {
    id: 'cons_minor_heal_potion',
    name: 'Lindrende dråber',
    description: 'Genopretter mana.',
    tab: 'potion',
    price: 40,
    kind: 'potion',
    effect: 'heal_mana',
    value: 22,
    pixelItem: VIAL_PIXEL,
  },
  {
    id: 'ing_glow_moss',
    name: 'Glød-mos',
    description: 'Alkymisk råvare — blanding kommer i senere fase.',
    tab: 'ingredient',
    price: 15,
    kind: 'food',
    effect: 'heal_hp',
    value: 3,
    pixelItem: MOSS_PIXEL,
  },
]

export const CONSUMABLE_DEFS_BY_ID = new Map(CONSUMABLE_DEFS.map((c) => [c.id, c]))

export function findConsumableDef(id: string): ConsumableDef | undefined {
  return CONSUMABLE_DEFS_BY_ID.get(id)
}

/** Start-lager pr. vare efter restock (D39). */
export const WORKSHOP_DEFAULT_STOCK: Record<string, number> = {
  cons_bread_minor: 12,
  cons_minor_heal_potion: 10,
  ing_glow_moss: 20,
}
