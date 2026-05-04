import type { MetalName } from '../types'

/** Basispris i guld pr. enhed rå malm. */
export const ORE_SELL_PRICES: Record<MetalName, number> = {
  Tin: 2,
  Kobber: 3,
  Jern: 5,
  Bronze: 0, // Bronze er kun en legering — kan ikke sælges som malm
  Sølv: 12,
  Guld: 25,
  Mithril: 100,
  Runestål: 300,
}

/** Basispris i guld pr. metalklump (nugget). Altid 4× malm-prisen. */
export const NUGGET_SELL_PRICES: Record<MetalName, number> = {
  Tin: 8,
  Kobber: 12,
  Jern: 20,
  Bronze: 0,
  Sølv: 48,
  Guld: 100,
  Mithril: 400,
  Runestål: 1200,
}

/**
 * Gems sælges til fuldt `gem.goldValue` — ingen rabat.
 * Denne konstant bruges ikke i beregning, men dokumenterer intentionen.
 */
export const GEM_SELL_FACTOR = 1.0
