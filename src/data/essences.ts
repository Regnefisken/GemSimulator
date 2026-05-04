import type { Area } from '../types'

export type EssenceRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

/** Hvor essensen kan bruges (eller `none` = kun drop/salg). */
export type EssenceUseKind =
  | 'none'
  | 'mine_phoenix'
  | 'mine_slumber'
  | 'chamber_moon'
  | 'rough_craft_fire'
  | 'rough_craft_rune'
  | 'jewelry_gold_boost'

export type EssenceDefinition = {
  id: string
  name: string
  icon: string
  rarity: EssenceRarity
  description: string
  useKind: EssenceUseKind
}

export const ESSENCE_IDS = {
  dragonGlimmer: 'essence_dragon_glimmer',
  phoenixAsh: 'essence_phoenix_ash',
  moonTear: 'essence_moon_tear',
  starFragment: 'essence_star_fragment',
  voidEcho: 'essence_void_echo',
  runeDust: 'essence_rune_dust',
  slumberPowder: 'essence_slumber_powder',
  aetherMote: 'essence_aether_mote',
} as const

export const ESSENCES: EssenceDefinition[] = [
  {
    id: ESSENCE_IDS.dragonGlimmer,
    name: 'Drageglimmer',
    icon: '🔥',
    rarity: 'common',
    description: 'Næste slibning fra rå klippe får garanteret Ild-magi.',
    useKind: 'rough_craft_fire',
  },
  {
    id: ESSENCE_IDS.phoenixAsh,
    name: 'Fønix-Aske',
    icon: '🪶',
    rarity: 'rare',
    description: 'I minen: fuld reparation af hakken +5 maks. holdbarhed (permanent).',
    useKind: 'mine_phoenix',
  },
  {
    id: ESSENCE_IDS.moonTear,
    name: 'Månetåre',
    icon: '🌙',
    rarity: 'common',
    description: '5 min. øget chance for essens-drops i minen.',
    useKind: 'chamber_moon',
  },
  {
    id: ESSENCE_IDS.starFragment,
    name: 'Stjernesplint',
    icon: '✨',
    rarity: 'uncommon',
    description: 'Sjældent stjernestøv — saml eller sælg på markedet.',
    useKind: 'none',
  },
  {
    id: ESSENCE_IDS.voidEcho,
    name: 'Tomhedsglimt',
    icon: '🌑',
    rarity: 'rare',
    description: 'Mørk resonans fra dybet.',
    useKind: 'none',
  },
  {
    id: ESSENCE_IDS.runeDust,
    name: 'Runedrys',
    icon: 'ᚱ',
    rarity: 'legendary',
    description: 'Næste slibning fra rå klippe får mindst én ekstra magisk egenskab.',
    useKind: 'rough_craft_rune',
  },
  {
    id: ESSENCE_IDS.slumberPowder,
    name: 'Dvalepulver',
    icon: '💤',
    rarity: 'common',
    description: 'I minen: genskaber 25% af hakkenes maks. holdbarhed som holdbarhed.',
    useKind: 'mine_slumber',
  },
  {
    id: ESSENCE_IDS.aetherMote,
    name: 'Æterisk kime',
    icon: '◇',
    rarity: 'uncommon',
    description: 'Ved smykke-smedning: +10% salgsværdi i guld.',
    useKind: 'jewelry_gold_boost',
  },
]

const byId = new Map(ESSENCES.map((e) => [e.id, e]))

export function getEssenceDef(id: string): EssenceDefinition | undefined {
  return byId.get(id)
}

const COMMON_IDS = ESSENCES.filter((e) => e.rarity === 'common').map((e) => e.id)
const UNCOMMON_IDS = ESSENCES.filter((e) => e.rarity === 'uncommon').map((e) => e.id)
const RARE_IDS = ESSENCES.filter((e) => e.rarity === 'rare').map((e) => e.id)
const LEGENDARY_IDS = ESSENCES.filter((e) => e.rarity === 'legendary').map((e) => e.id)

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/** Sjældnere essenser i miner med højere rarityBonus. */
export function rollEssenceFromMine(area: Area): string {
  const bias = area.rarityBonus * 1.2
  const r = Math.random() + bias
  if (r < 0.5) return pickRandom(COMMON_IDS)
  if (r < 0.78) return pickRandom(UNCOMMON_IDS)
  if (r < 0.94) return pickRandom(RARE_IDS)
  return pickRandom(LEGENDARY_IDS)
}

/** Efter fuldført smeltning: ~2% common/uncommon, ~0,5% rare+. */
export function rollEssenceFromSmelt(): string | null {
  const r = Math.random()
  if (r < 0.005) {
    return Math.random() < 0.7 ? pickRandom(RARE_IDS) : pickRandom(LEGENDARY_IDS)
  }
  if (r < 0.025) {
    return Math.random() < 0.65 ? pickRandom(COMMON_IDS) : pickRandom(UNCOMMON_IDS)
  }
  return null
}

export const MOON_TEAR_EFFECT_ID = 'effect_moon_tear_mine'

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type EssenceMarketOffer = { essenceId: string; price: number }

/** Dagligt roterende udbud (4 pladser) til Adelsmarkedet. */
export function getDailyEssenceMarketOffers(nowMs = Date.now()): EssenceMarketOffer[] {
  const day = Math.floor(nowMs / 86400000)
  const rng = mulberry32(day * 10007 + 1337)
  const ids = [...ESSENCES.map((e) => e.id)]
  const offers: EssenceMarketOffer[] = []
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(rng() * ids.length)
    const essenceId = ids.splice(idx, 1)[0]!
    const def = getEssenceDef(essenceId)!
    const mul =
      def.rarity === 'legendary' ? 80 : def.rarity === 'rare' ? 25 : def.rarity === 'uncommon' ? 8 : 3
    const jitter = 0.85 + rng() * 0.35
    const price = Math.max(30, Math.floor(40 * mul * jitter))
    offers.push({ essenceId, price })
  }
  return offers
}

export function isValidEssenceMarketOffer(
  essenceId: string,
  price: number,
  nowMs = Date.now(),
): boolean {
  return getDailyEssenceMarketOffers(nowMs).some((o) => o.essenceId === essenceId && o.price === price)
}
