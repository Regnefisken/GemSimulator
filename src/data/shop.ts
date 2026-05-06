import { SMELTER_TIERS } from './smelterTiers'

export const CHARM_IDS = {
  luckyMiner: 'charm_lucky_miner',
  smithEye: 'charm_smith_eye',
  deepCalm: 'charm_deep_calm',
} as const

export type CharmId = (typeof CHARM_IDS)[keyof typeof CHARM_IDS]

export const SHOP_CONSUMABLE_IDS = {
  dynamite: 'cons_dynamite',
  whetstone: 'cons_whetstone',
} as const

/** Butikkens hakker (tier matcher `makePickaxe(tier)`). Tier 0 fås kun ved start; reparation sker i smedjen. */
export const SHOP_PICKAXE_OFFERS = [
  { tier: 1, price: 200, minLevel: 3 },
  { tier: 2, price: 1000, minLevel: 8 },
  { tier: 3, price: 10000, minLevel: 25 },
  { tier: 4, price: 100000, minLevel: 50 },
] as const

export const SHOP_CONSUMABLES = [
  {
    id: SHOP_CONSUMABLE_IDS.dynamite,
    name: 'Dynamit',
    price: 250,
    description: 'Næste klippe i minen ødelægges med ét slag.',
  },
  {
    id: SHOP_CONSUMABLE_IDS.whetstone,
    name: 'Slibesten',
    price: 120,
    description: 'Næste ædelsten du sliber fra rå klippe får +1 renhed (maks. 4).',
  },
] as const

export const SHOP_INVENTORY_PACKS = [
  { id: 'inv_gems', price: 500, gems: 20, materials: 0, tools: 0 },
  { id: 'inv_materials', price: 300, gems: 0, materials: 100, tools: 0 },
  { id: 'inv_tools', price: 1000, gems: 0, materials: 0, tools: 5 },
] as const

export const SHOP_CHARMS = [
  {
    id: CHARM_IDS.luckyMiner,
    name: 'Heldig minearbejder',
    price: 800,
    minLevel: 5,
    description: '+5% større chance for sjældne drops (ædelsten, klump, rå klippe).',
  },
  {
    id: CHARM_IDS.smithEye,
    name: 'Smedens øje',
    price: 1200,
    minLevel: 10,
    description: '+10% guld-værdi på ædelsten.',
  },
  {
    id: CHARM_IDS.deepCalm,
    name: 'Dyb stille',
    price: 2000,
    minLevel: 15,
    description: '+15% dybdebonus til ædelstenes guld-værdi.',
  },
] as const

export type ShopTabId =
  | 'pickaxes'
  | 'smelter'
  | 'consumables'
  | 'inventory'
  | 'charms'
  | 'blueprints'
  | 'sell'

export const SHOP_TAB_LABELS: Record<ShopTabId, string> = {
  pickaxes: 'Hakker',
  smelter: 'Smelter',
  consumables: 'Forbrug',
  inventory: 'Lager',
  charms: 'Charms',
  blueprints: '💍 Blueprints',
  sell: '💰 Sælg',
}

/** Guldpris for at rykke fra nuværende `smelterTier` til næste (null hvis maks.). */
export function smelterNextUpgradeCost(currentTier: number): number | null {
  const next = SMELTER_TIERS[currentTier]
  return next ? next.upgradeCost : null
}

export function findPickaxeOffer(tier: number) {
  return SHOP_PICKAXE_OFFERS.find((o) => o.tier === tier)
}

export function findConsumable(id: string) {
  return SHOP_CONSUMABLES.find((c) => c.id === id)
}

export function findInventoryPack(id: string) {
  return SHOP_INVENTORY_PACKS.find((p) => p.id === id)
}

export function findCharm(id: string) {
  return SHOP_CHARMS.find((c) => c.id === id)
}
