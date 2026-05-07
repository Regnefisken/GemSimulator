/**
 * Fase 4: alkymi-opskrifter (adskilt fra smykke-`unlockedBlueprints`, jf. §8b).
 * worldTier (D10) gates crafting i reducer.
 */

export type AlchemyRecipeId = string

export type AlchemyRecipeDef = {
  id: AlchemyRecipeId
  name: string
  description: string
  /** Krævet `computeWorldTier(state)` for at kunne blande. */
  requiredWorldTier: number
  /** Ingredienser trækkes fra `GameState.consumables` (consumable-id → antal). */
  ingredients: Partial<Record<string, number>>
  /** Resultat som `ConsumableDef.id` (typisk potion med `apply_brew`). */
  outputConsumableId: string
}

/** Standard unlocked ved ny save / migration v16 — ét eksempel på blanding (Fase 4). */
export const STARTER_UNLOCKED_ALCHEMY_RECIPES: readonly AlchemyRecipeId[] = ['recipe_solar_elixir']

export const ALCHEMY_RECIPES: AlchemyRecipeDef[] = [
  {
    id: 'recipe_solar_elixir',
    name: 'Sol-eliksir',
    description: 'Tre portioner glød-mos destilleret til en gylden bryg.',
    requiredWorldTier: 0,
    ingredients: { ing_glow_moss: 3 },
    outputConsumableId: 'cons_brew_solar_vigor',
  },
]

const BY_ID = new Map(ALCHEMY_RECIPES.map((r) => [r.id, r]))

export function findAlchemyRecipe(id: string): AlchemyRecipeDef | undefined {
  return BY_ID.get(id)
}
