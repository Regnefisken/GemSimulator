/** Fase 4: brew-identitet (D36–D38) — farvet mana og manaMax pr. bryg. */

export type BrewId = string

export type BrewDef = {
  id: BrewId
  name: string
  /** Kort beskrivelse til mine-HUD / tooltip (evne). */
  abilityDescription: string
  /** Themed mana-bar (gradient/highlight). */
  color: string
  /** D38: ny manaMax når denne bryg er aktiv. */
  manaMax: number
}

export const BREWS: BrewDef[] = [
  {
    id: 'brew_solar_vigor',
    name: 'Sol-vigor',
    abilityDescription: 'Gylden alkymi: større mana-pulje mens bryggen er aktiv.',
    color: '#fbbf24',
    manaMax: 65,
  },
]

const BY_ID = new Map(BREWS.map((b) => [b.id, b]))

export function findBrew(id: string): BrewDef | undefined {
  return BY_ID.get(id)
}
