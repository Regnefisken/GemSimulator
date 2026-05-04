# Implementeringsplan: Salgssystem — Tidlig indkomst fra level 1

## Overordnet designfilosofi

Systemet bygger direkte på mønsteret fra smykkeværkstedet:
- Ét fast sted at sælge (butikken, som allerede er tilgængelig fra start)
- Varer vises med pixel-kort, pris og en tydelig "Sælg"-knap — præcis som "Sælg på Adelsmarkedet"
- Salg giver guld **og** XP (lille belønning, fremmer progression)
- Gem salg er den primære indkomst (niveau 1+), råvarer er sekundær nødventil

Ingen nye lokationer eller skærmbilleder. Butikken udvides fra "kun køb" til et ægte tovejsmarked.

---

## Ændringer, lag for lag

### Lag 1 — Ny datafil: `src/data/market.ts`

Oprettes som ny fil. Definerer basispriserne for råvarer pr. metal.

```ts
import type { MetalName } from '../types'

/** Basispris i guld pr. enhed rå malm. */
export const ORE_SELL_PRICES: Record<MetalName, number> = {
  Tin:      2,
  Kobber:   3,
  Jern:     5,
  Bronze:   0,   // Bronze er kun en legering — kan ikke sælges som malm
  Sølv:    12,
  Guld:    25,
  Mithril: 100,
  Runestål: 300,
}

/** Basispris i guld pr. metalklump (nugget). Altid 4× malm-prisen. */
export const NUGGET_SELL_PRICES: Record<MetalName, number> = {
  Tin:       8,
  Kobber:   12,
  Jern:     20,
  Bronze:    0,
  Sølv:     48,
  Guld:    100,
  Mithril:  400,
  Runestål: 1200,
}

/**
 * Gems sælges til fuldt `gem.goldValue` — ingen rabat.
 * Denne konstant bruges ikke i beregning, men dokumenterer intentionen.
 */
export const GEM_SELL_FACTOR = 1.0
```

> **Begrundelse for priser:** En simpel kobberring (billigste smykke, level 8) sælges for 50g. Det kræver 1 kobber-ingot = 3 kobbermalm smeltede. At sælge 3 kobbermalm direkte giver kun 9g — langt under smykkeprisen, så der er stadig god grund til at investere i smelteprocessen og smykkeværkstedet.

---

### Lag 2 — Nye Actions + Reducer-cases i `src/lib/gameState.ts`

#### 2a. Tilføj til `Action`-unionen (efter eksisterende `SELL_JEWELRY`-linje)

```ts
| { type: 'SELL_GEM'; id: string }
| { type: 'SELL_GEMS_BULK'; ids: string[] }
| { type: 'SELL_RAW_ORE'; metalName: MetalName; quantity: number }
| { type: 'SELL_NUGGET'; metalName: MetalName; quantity: number }
```

#### 2b. Tilføj XP-belønninger i `XP_REWARDS`-objektet (i `src/lib/leveling.ts` eller øverst i gameState.ts — der hvor `XP_REWARDS` er defineret)

```ts
gemSold: 8,          // pr. enkelt salg
rawOreSold: 1,       // pr. enhed malm
nuggetSold: 3,       // pr. nugget
```

#### 2c. Tilføj fire nye `case`-blokke i `reducer`

```ts
case 'SELL_GEM': {
  const gem = state.gems.find((g) => g.id === action.id)
  if (!gem) return state
  const next: GameState = {
    ...state,
    gems: state.gems.filter((g) => g.id !== action.id),
    gold: state.gold + gem.goldValue,
    gameNotice: null,
  }
  return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.gemSold))
}

case 'SELL_GEMS_BULK': {
  if (action.ids.length === 0) return state
  const selling = state.gems.filter((g) => action.ids.includes(g.id))
  const totalGold = selling.reduce((s, g) => s + g.goldValue, 0)
  const totalXp = selling.length * XP_REWARDS.gemSold
  const next: GameState = {
    ...state,
    gems: state.gems.filter((g) => !action.ids.includes(g.id)),
    gold: state.gold + totalGold,
    gameNotice: null,
  }
  return applyEligibleUnlocks(applyXpGain(next, totalXp))
}

case 'SELL_RAW_ORE': {
  const row = state.rawOre.find((o) => o.metalName === action.metalName)
  if (!row) return state
  const qty = Math.max(1, Math.min(action.quantity, row.quantity))
  const price = ORE_SELL_PRICES[action.metalName] ?? 0
  const newRow = { ...row, quantity: row.quantity - qty }
  const rawOre = newRow.quantity > 0
    ? state.rawOre.map((o) => (o.metalName === action.metalName ? newRow : o))
    : state.rawOre.filter((o) => o.metalName !== action.metalName)
  const next: GameState = {
    ...state,
    rawOre,
    gold: state.gold + price * qty,
    gameNotice: null,
  }
  return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.rawOreSold * qty))
}

case 'SELL_NUGGET': {
  const row = state.metalNuggets.find((n) => n.metalName === action.metalName)
  if (!row) return state
  const qty = Math.max(1, Math.min(action.quantity, row.quantity))
  const price = NUGGET_SELL_PRICES[action.metalName] ?? 0
  const newRow = { ...row, quantity: row.quantity - qty }
  const metalNuggets = newRow.quantity > 0
    ? state.metalNuggets.map((n) => (n.metalName === action.metalName ? newRow : n))
    : state.metalNuggets.filter((n) => n.metalName !== action.metalName)
  const next: GameState = {
    ...state,
    metalNuggets,
    gold: state.gold + price * qty,
    gameNotice: null,
  }
  return applyEligibleUnlocks(applyXpGain(next, XP_REWARDS.nuggetSold * qty))
}
```

> Import øverst i `gameState.ts`: `import { ORE_SELL_PRICES, NUGGET_SELL_PRICES } from '../data/market'`

---

### Lag 3 — Ny komponent: `src/components/shop/SellTab.tsx`

Ny komponent der vises under "Sælg"-fanen i `ShopScreen`. Tre sektioner med samme kortbaserede pixel-UX som resten af butikken og smykkeværkstedet.

```
SellTab
├── Sektion: Ædelsten (state.gems)
│   ├── "Sælg alle"-knap øverst (deaktiveret hvis ingen gems)
│   └── Grid: én GemCard pr. gem + Sælg-knap med goldValue
├── Sektion: Rå malm (state.rawOre)
│   └── Liste: pr. metal → pris pr. enhed, input til antal, Sælg-knap
└── Sektion: Metalklumper (state.metalNuggets)
    └── Liste: pr. metal → pris pr. nugget, input til antal, Sælg-knap
```

#### Props

```ts
type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
}
```

#### Intern state

```ts
// Antal der ønskes solgt pr. metal (malm og nuggets)
const [oreSell, setOreSell]       = useState<Partial<Record<MetalName, number>>>({})
const [nuggetSell, setNuggetSell] = useState<Partial<Record<MetalName, number>>>({})
```

#### Gem-sektion — JSX-skelet

```tsx
<section>
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
      💎 Ædelsten — {state.gems.length} stk
    </h3>
    <button
      type="button"
      disabled={state.gems.length === 0}
      onClick={() =>
        dispatch({ type: 'SELL_GEMS_BULK', ids: state.gems.map((g) => g.id) })
      }
      className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/60 text-red-300 disabled:opacity-30 transition-colors"
    >
      Sælg alle ({totalGemValue} g)
    </button>
  </div>

  {state.gems.length === 0 ? (
    <p className="text-slate-500 text-sm">Ingen ædelsten at sælge.</p>
  ) : (
    <ul className="grid gap-3 sm:grid-cols-2">
      {state.gems.map((gem) => (
        <li key={gem.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 flex items-center gap-3">
          {/* Mini GemCard (pixel display — brug eksisterende GemCard med lille størrelse) */}
          <div className="shrink-0">
            <GemCard gem={gem} isNewest={false} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{gem.name}</p>
            <p className="text-xs text-slate-400">Renhed {gem.purity} · {gem.magicProperties.length} magi</p>
            <p className="text-amber-200 text-sm font-mono">{gem.goldValue} g</p>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SELL_GEM', id: gem.id })}
            className="shrink-0 min-h-[44px] px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm"
          >
            Sælg
          </button>
        </li>
      ))}
    </ul>
  )}
</section>
```

#### Rå malm-sektion — JSX-skelet

```tsx
<section>
  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
    ⛏️ Rå malm
  </h3>
  {state.rawOre.length === 0 ? (
    <p className="text-slate-500 text-sm">Ingen rå malm.</p>
  ) : (
    <ul className="space-y-2">
      {state.rawOre.map((ore) => {
        const unitPrice = ORE_SELL_PRICES[ore.metalName] ?? 0
        const qty = oreSell[ore.metalName] ?? 1
        return (
          <li key={ore.metalName} className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 flex items-center gap-3">
            <PixelItemCard item={ore.pixelItem} label={ore.metalName} subtitle="Rå malm" count={ore.quantity} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-100 font-semibold">{ore.metalName}</p>
              <p className="text-xs text-slate-400">{unitPrice} g/stk · {ore.quantity} tilgængelig</p>
              <p className="text-amber-200 text-sm font-mono">{unitPrice * qty} g</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <input
                type="number"
                min={1}
                max={ore.quantity}
                value={qty}
                onChange={(e) => setOreSell((s) => ({ ...s, [ore.metalName]: Math.max(1, Math.min(ore.quantity, Number(e.target.value))) }))}
                className="w-16 text-right rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm px-2 py-1"
              />
              <button
                type="button"
                onClick={() => dispatch({ type: 'SELL_RAW_ORE', metalName: ore.metalName, quantity: qty })}
                className="min-h-[36px] px-3 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-semibold text-sm"
              >
                Sælg
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )}
</section>
```

> Metalklumpe-sektionen er identisk med rå malm-sektionen, blot med `NUGGET_SELL_PRICES` og `SELL_NUGGET`-action.

---

### Lag 4 — Opdater `src/components/shop/ShopScreen.tsx`

#### 4a. Tilføj `'sell'` til `ShopTabId` i `src/data/shop.ts`

```ts
// I ShopTabId-typen:
export type ShopTabId = 'pickaxes' | 'smelter' | 'consumables' | 'inventory' | 'charms' | 'sell'

// I SHOP_TAB_LABELS:
sell: '💰 Sælg',
```

#### 4b. I `ShopScreen.tsx` — importer og vis `SellTab`

```tsx
import SellTab from './SellTab'

// I JSX:
{tab === 'sell' && <SellTab state={state} dispatch={dispatch} />}
```

Tab-rækkefølge (anbefalet): `Hakker` · `Smelter` · `Forbrug` · `Lager` · `Charms` · `💰 Sælg`

---

## Filfortegnelse

| Fil | Handling |
|---|---|
| `src/data/market.ts` | **Opret** — prisdata |
| `src/lib/gameState.ts` | **Rediger** — 4 nye actions + 4 reducer-cases + import |
| `src/lib/leveling.ts` | **Rediger** — 3 nye XP_REWARDS-nøgler (eller der hvor `XP_REWARDS` er defineret) |
| `src/data/shop.ts` | **Rediger** — tilføj `'sell'` til `ShopTabId` og `SHOP_TAB_LABELS` |
| `src/components/shop/SellTab.tsx` | **Opret** — ny salgs-UI |
| `src/components/shop/ShopScreen.tsx` | **Rediger** — import + render `SellTab` |

---

## Implementeringsrækkefølge

1. Opret `src/data/market.ts`
2. Tilføj XP-belønningerne i leveling/gameState
3. Tilføj de 4 nye actions og reducer-cases i `gameState.ts` (inkl. import af market.ts)
4. Tilføj `'sell'` til `ShopTabId` og labels i `shop.ts`
5. Opret `SellTab.tsx`
6. Opdater `ShopScreen.tsx` med import og render-betingelse
7. TypeScript-check: `npx tsc --noEmit`

---

## Balanceoversigt

| Fase | Spiller er | Primær indkomst |
|---|---|---|
| Level 1–4 | Miner kobbermine | Sælg ædelsten direkte (5–30 g/stk typisk) |
| Level 5–7 | Dybere miner, bedre gems | Sælg gems (50–200 g/stk) + evt. rå malm |
| Level 8+ | Adgang til smykkeværksted | Smykker dominerer (50–500+ g/smykke) |
| Level 15+ | Dybe miner + mithril | Sjældne gems (500–5000 g) + premium smykker |

Gems sælges til **fuld** `goldValue` (ingen "handler-rabat"). Dette er en bevidst beslutning: at sælge en sjælden sten er altid lidt ærgerligt, men ikke uretfærdigt — og det motiverer spilleren til at beholde gode gems til smykkeproduktion.
