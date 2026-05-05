# Implementeringsplan: Hakker som unikke redskaber + manuel reparation i smedjen

## Designfilosofi

Den nuværende hakke-økonomi er flad: spilleren spammer "Køb Tinhakke" til 10g hver gang holdbarheden falder. Det føles som en straf — ikke som en investering. Vi vender det om:

- **Hakker er unikke værktøjer**, ikke forbrugsvarer. Du ejer maks. **én** af hver tier.
- **Holdbarhed er en hindring, ikke en dødsdom.** Når den når 0, kan du gå til smedjen og **selv reparere** hakken — gratis.
- **Reparation er en aktiv handling, ikke en transaktion.** Spilleren rammer ambolten gentagne gange og ser holdbarheden stige slag for slag. Lyd, partikler og rystelser sælger fornemmelsen af håndværk.
- Investering ligger i at opnå **bedre** hakker (jern → stål → mithril → rune), ikke i at hamstre kopier.

Resultatet: Tidlig spillere føler ikke længere, at de "skal købe 10 tinhakker for at komme i gang". De starter med én tinhakke, bruger den indtil den slides ned, går til smedjen, banker den i form, og fortsætter. Senere køb er ægte progression — ikke vedligehold.

---

## Lag 1 — Butik: Maks. én pr. tier + fjern starter-genkøb

### 1a. `src/data/shop.ts` — fjern tier 0-tilbuddet

Tinhakken (tier 0) får man ved spilstart og kan ikke længere købes — den eksisterer kun som starthakke og kan repareres uendeligt.

```ts
export const SHOP_PICKAXE_OFFERS = [
  { tier: 1, price: 200,    minLevel: 3 },
  { tier: 2, price: 1000,   minLevel: 8 },
  { tier: 3, price: 10000,  minLevel: 25 },
  { tier: 4, price: 100000, minLevel: 50 },
] as const
```

> Fjern den tidligere `{ tier: 0, price: 10, minLevel: 1 }`-linje. Inline-kommentaren "billig erstatning" er ikke længere relevant.

### 1b. Fjern (eller marker udgået) `cons_repair`-forbruget

Med gratis reparation i smedjen er reparations-kit'et redundant. Anbefaling: **fjern det helt** for at undgå at narre nye spillere til at bruge guld på en feature de allerede har gratis.

```ts
export const SHOP_CONSUMABLE_IDS = {
  dynamite:  'cons_dynamite',
  whetstone: 'cons_whetstone',
  // 'cons_repair' fjernet — reparation sker gratis i smedjen
} as const

export const SHOP_CONSUMABLES = [
  { id: SHOP_CONSUMABLE_IDS.dynamite,  name: 'Dynamit',   price: 250, description: '...' },
  { id: SHOP_CONSUMABLE_IDS.whetstone, name: 'Slibesten', price: 120, description: '...' },
] as const
```

> Hvis du ikke vil bryde gamle saves, kan `cons_repair`-strengen blive i koden, men ingen UI viser den længere. Konsekvenser i `BUY_CONSUMABLE`-reducer-casen kan blive — den udløses bare aldrig.

---

## Lag 2 — Reducer: bloker dubletter + ny `REPAIR_PICKAXE`-action

### 2a. Tilføj `REPAIR_PICKAXE` til `Action`-unionen i `src/lib/gameState.ts`

```ts
| { type: 'REPAIR_PICKAXE'; amount: number }
```

> `amount` er holdbarhed pr. enkelt hammerslag. UI'en bestemmer størrelsen baseret på hakkens `maxDurability` (se Lag 4).

### 2b. Ny case i `reducer`

```ts
case 'REPAIR_PICKAXE': {
  if (action.amount <= 0) return state
  const pickaxes = state.pickaxes.map((p) =>
    p.id === state.activePickaxeId
      ? { ...p, durability: Math.min(p.maxDurability, p.durability + action.amount) }
      : p,
  )
  return { ...state, pickaxes }
}
```

> Kun den **aktive** hakke kan repareres — hvilket matcher kravet: "vælg redskab som man vil reparere som aktiv → gå til smedje → tryk på knap".

### 2c. Opdater `BUY_PICKAXE`-casen — afvis dubletter

```ts
case 'BUY_PICKAXE': {
  const offer = findPickaxeOffer(action.tier)
  if (!offer) return state
  if (state.level < offer.minLevel) {
    return { ...state, gameNotice: `Kræver level ${offer.minLevel}.` }
  }
  if (state.gold < offer.price) return { ...state, gameNotice: 'Ikke nok guld.' }
  if (state.pickaxes.some((p) => p.tier === action.tier)) {
    return { ...state, gameNotice: 'Du ejer allerede denne hakke. Reparér den i smedjen.' }
  }
  if (state.pickaxes.length >= state.inventoryCapacity.tools) {
    return { ...state, gameNotice: 'Værktøjslager er fuldt.' }
  }
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const pickaxe = makePickaxe(offer.tier, unique)
  return {
    ...state,
    gold: state.gold - offer.price,
    pickaxes: [...state.pickaxes, pickaxe],
    activePickaxeId: pickaxe.id,
    gameNotice: null,
  }
}
```

> Ekstra fordel: Vi kan slette `unique`-suffix-logikken på sigt, da der nu kun kan eksistere én hakke pr. tier. Behold den indtil videre for at undgå at bryde eksisterende save-filer.

---

## Lag 3 — Migration: dedupér eksisterende dubletter

Eksisterende spillere kan have N tinhakker fra det gamle system. Migrationen skal kollapse hver tier til den **bedst ladede** kopi (højest `durability`), så ingen mister fremskridt.

### `src/lib/migrations.ts` — bump version + ny migration-step

```ts
export const CURRENT_STATE_VERSION = 8
```

I `migrateGameState`, **efter** den eksisterende `next.pickaxes`-validering, tilføj:

```ts
if (version < 8) {
  const byTier = new Map<number, Pickaxe>()
  for (const p of next.pickaxes) {
    const cur = byTier.get(p.tier)
    if (!cur || p.durability > cur.durability) byTier.set(p.tier, p)
  }
  const deduped = [...byTier.values()].sort((a, b) => a.tier - b.tier)

  if (deduped.length !== next.pickaxes.length) {
    next.pickaxes = deduped
    if (!deduped.some((p) => p.id === next.activePickaxeId)) {
      const newest = deduped[deduped.length - 1] ?? deduped[0]
      if (newest) next.activePickaxeId = newest.id
    }
  }
}
```

> Vælger den hakke med højest `durability` per tier — den der er mindst slidt. ID'er kan ændre sig (de andre dubletter slettes), så `activePickaxeId` valideres bagefter.

---

## Lag 4 — Ny komponent: `src/components/smithy/RepairStation.tsx`

Smedjens nye hjerte. En tydelig sektion med ambolt, aktiv hakke, holdbarheds-bar og en stor "Hammer"-knap.

### Komponent-skelet

```
RepairStation
├── Sektionshovede: "🔨 Reparationsbænk"
├── Aktiv-hakke kort (PixelItemCard af state.activePickaxe)
│   ├── Navn + tier
│   ├── Holdbarheds-bar (animeret fyld)
│   └── Tal: durability / maxDurability
├── Ambolt-zone
│   ├── Pixel-ambolt (statisk)
│   ├── Pixel-hammer (animerer ned ved klik)
│   ├── Spark-partikler (genereres pr. klik)
│   └── Floating "+N"-tekst (fade-up animation)
└── Stor Hammer-knap: "Slå med hammeren"
```

### Props

```ts
type Props = {
  state: GameState
  dispatch: React.Dispatch<Action>
}
```

### Intern state — visuelle effekter

```ts
const [sparks, setSparks]     = useState<{ id: number; x: number; y: number }[]>([])
const [floats, setFloats]     = useState<{ id: number; amount: number }[]>([])
const [swing, setSwing]       = useState(0)   // bruges som key/trigger til hammer-animation
const idRef                   = useRef(0)
```

### Beregning: chunk pr. slag

Reparation tager **20 slag** fra 0 til fuld holdbarhed — uanset hakke-tier. Det giver konsistent UX uanset om det er en tinhakke eller runehakke:

```ts
const active = state.pickaxes.find((p) => p.id === state.activePickaxeId)
const SLAGS_FOR_FULD_REPARATION = 20
const chunk = active ? Math.max(1, Math.ceil(active.maxDurability / SLAGS_FOR_FULD_REPARATION)) : 0
const isFull = active ? active.durability >= active.maxDurability : true
```

> Tinhakke (50 max): chunk ≈ 3 → ~17 slag.
> Runehakke (800 max): chunk ≈ 40 → 20 slag.
>
> Der er **ingen cooldown**: spilleren kan spam-klikke. Hvert klik er en bevidst handling, og den taktile feedback (lyd + animation) er belønningen i sig selv.

### Klik-handler

```ts
function handleStrike(e: React.MouseEvent<HTMLButtonElement>) {
  if (!active || isFull) return
  dispatch({ type: 'REPAIR_PICKAXE', amount: chunk })
  playAnvilStrike()
  if (navigator.vibrate) navigator.vibrate(15)

  const id = ++idRef.current
  setSwing(id)

  // 4–6 sparks i tilfældig spredning omkring ambolt-centrum
  const newSparks = Array.from({ length: 4 + Math.floor(Math.random() * 3) }, () => ({
    id: ++idRef.current,
    x: 50 + (Math.random() - 0.5) * 60,   // procent inden for ambolt-zonen
    y: 50 + (Math.random() - 0.5) * 30,
  }))
  setSparks((s) => [...s, ...newSparks])
  window.setTimeout(() => {
    setSparks((s) => s.filter((sp) => !newSparks.some((n) => n.id === sp.id)))
  }, 450)

  // floating "+N" tekst
  const floatId = ++idRef.current
  setFloats((f) => [...f, { id: floatId, amount: chunk }])
  window.setTimeout(() => {
    setFloats((f) => f.filter((fl) => fl.id !== floatId))
  }, 800)
}
```

### JSX-skelet

```tsx
<section className="rounded-2xl border border-amber-900/50 bg-slate-900/80 p-4 sm:p-6 shadow-lg">
  <h2 className="text-lg font-bold text-amber-100 mb-1 flex items-center gap-2">
    🔨 Reparationsbænk
  </h2>
  <p className="text-slate-400 text-sm mb-4">
    Slå på ambolten for at reparere din aktive hakke. Skift aktiv hakke i lageret.
  </p>

  {!active ? (
    <p className="text-slate-500 text-sm">Du har ingen aktiv hakke.</p>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
      {/* Venstre: hakke-kort med holdbarhed */}
      <div className="flex flex-col items-center gap-2">
        <PixelItemCard item={active.pixelItem} label={active.name} subtitle={`Tier ${active.tier}`} />
        <div className="w-full">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Holdbarhed</span>
            <span className="font-mono text-slate-200">
              {active.durability} / {active.maxDurability}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-150"
              style={{ width: `${(active.durability / active.maxDurability) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Højre: ambolt-zone + hammer-knap */}
      <div className="relative flex flex-col items-center gap-3">
        <div className="relative w-full h-40 rounded-xl bg-slate-950/60 border border-slate-700 overflow-hidden">
          {/* Pixel-ambolt — SVG eller billede, centreret nederst */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            {/* <AnvilPixel /> eller emoji 🔩 / 🛠️ som fallback */}
          </div>

          {/* Pixel-hammer der falder ned ved klik (animeret med key={swing}) */}
          <div
            key={swing}
            className="absolute top-2 left-1/2 -translate-x-1/2 hammer-strike"
          >
            {/* <HammerPixel /> */}
          </div>

          {/* Sparks */}
          {sparks.map((sp) => (
            <span
              key={sp.id}
              className="absolute w-1 h-1 rounded-full bg-amber-300 spark-fly"
              style={{ left: `${sp.x}%`, top: `${sp.y}%` }}
            />
          ))}

          {/* Floating +N */}
          {floats.map((fl) => (
            <span
              key={fl.id}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 text-emerald-300 font-bold text-lg float-up pointer-events-none"
            >
              +{fl.amount}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={handleStrike}
          disabled={isFull}
          className="
            w-full min-h-[56px] px-6 rounded-xl
            bg-gradient-to-b from-amber-600 to-amber-700
            hover:from-amber-500 hover:to-amber-600
            active:translate-y-0.5 active:from-amber-700 active:to-amber-800
            disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed
            text-slate-950 font-extrabold text-lg shadow-lg
            transition-all duration-75
          "
        >
          {isFull ? '✓ Færdigreparet' : '🔨 Slå med hammeren'}
        </button>
      </div>
    </div>
  )}
</section>
```

### CSS-keyframes — tilføj til `src/style.css`

```css
@keyframes hammer-strike {
  0%   { transform: translateX(-50%) rotate(-20deg); }
  40%  { transform: translateX(-50%) rotate(35deg); }
  60%  { transform: translateX(-50%) rotate(35deg); }
  100% { transform: translateX(-50%) rotate(-20deg); }
}
.hammer-strike {
  animation: hammer-strike 250ms ease-out;
  transform-origin: top center;
}

@keyframes spark-fly {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  100% {
    transform: translate(var(--dx, calc((var(--seed, 0.5) - 0.5) * 60px)), -40px) scale(0.2);
    opacity: 0;
  }
}
.spark-fly {
  animation: spark-fly 400ms ease-out forwards;
}

@keyframes float-up {
  0%   { transform: translate(-50%, 0); opacity: 0; }
  20%  { opacity: 1; }
  100% { transform: translate(-50%, -40px); opacity: 0; }
}
.float-up {
  animation: float-up 750ms ease-out forwards;
}
```

> Spark-retninger varieres simpelt ved at sætte `style={{ '--seed': Math.random() }}` på hver `<span>`, eller ved at lade hver spark have separate `--dx`/`--dy` CSS-vars beregnet i JS.

---

## Lag 5 — Lyd: `src/lib/sounds.ts`

Tilføj en metallisk **klang** med kort efterklang og let pitch-variation, så hvert slag føles unikt:

```ts
export function playAnvilStrike(): void {
  // Kort, høj impact-tone (~880-1100 Hz med variation)
  const pitch = 880 + Math.random() * 240
  tone(pitch, 0.05, 0.06, 'square')
  // Efterklang — lavere tone, lidt forsinket
  window.setTimeout(() => tone(pitch * 0.5, 0.18, 0.04, 'triangle'), 25)
  // Højfrekvent "ting" oven på
  window.setTimeout(() => tone(pitch * 2, 0.08, 0.03, 'sine'), 10)
}
```

> De tre lag overlappende toner giver en troværdig "klang!" — ikke bare en bip. Pitch-variationen forhindrer monotoni ved spam-klik.

---

## Lag 6 — Indsæt `RepairStation` i smedjen

### `src/components/smithy/SmithyScreen.tsx`

Importer den nye station og placér den **øverst** i smedjen — det er nu det første spilleren ser:

```tsx
import RepairStation from './RepairStation'

// I JSX, mellem <Header /> og <Smelter />:
<RepairStation state={state} dispatch={dispatch} />
<Smelter ... />
<AlloyStation ... />
<GemCrafter ... />
```

> Reparationsbænken kommer først, fordi den er den hyppigste interaktion — spillere går ofte til smedjen for at fikse en hakke før en ny minetur. Smelter/legering bruges sjældnere.

---

## Lag 7 — UX-finpudsning: hint i lager + minen

### 7a. `src/components/inventory/ToolsInventoryTab.tsx`

Når en hakkes durability er 0, skal kortet tydeligt indikere "Reparer i smedjen" i stedet for bare at se trist ud:

```tsx
<PixelItemCard
  ...
  subtitle={
    p.durability === 0
      ? '⚠️ Slidt op — reparér i smedjen'
      : `${p.durability}/${p.maxDurability} · ${p.damage} skade`
  }
/>
```

Og i `ItemPreviewModal`-footeren, hvis det er den aktive hakke OG `durability < maxDurability`:

```tsx
<button onClick={() => /* skift til smedje-tab eller naviger til smedjen */}>
  Reparér i smedjen →
</button>
```

> Optionel forbedring: knappen kan dispatch'e `CHANGE_LOCATION + SET_VIEW_MODE` til smedjen direkte. Holder dog ud af scope — en simpel tekstuel henvisning er nok i første implementering.

### 7b. `src/components/mine/MineScreen.tsx` (eller hvor "hakke ødelagt"-tilstanden vises)

Hvis hakken når 0 durability midt i en mine-session, skal feedback'en pege spilleren mod smedjen — ikke butikken. F.eks.:

```tsx
{activePickaxe.durability === 0 && (
  <div className="...notice...">
    🔨 Din hakke er slidt op. Gå til <strong>smedjen</strong> og reparér den.
  </div>
)}
```

> Dette eksisterer formentlig allerede med butiks-henvisning — opdater teksten.

---

## Filfortegnelse

| Fil | Handling |
|---|---|
| `src/data/shop.ts` | **Rediger** — fjern tier 0-tilbud, fjern `cons_repair` fra arrays |
| `src/lib/gameState.ts` | **Rediger** — ny `REPAIR_PICKAXE`-action + reducer-case, opdater `BUY_PICKAXE` til at afvise dubletter |
| `src/lib/migrations.ts` | **Rediger** — bump til version 8, dedupér eksisterende hakker per tier |
| `src/lib/sounds.ts` | **Rediger** — tilføj `playAnvilStrike()` |
| `src/style.css` | **Rediger** — tilføj 3 keyframe-animationer (`hammer-strike`, `spark-fly`, `float-up`) |
| `src/components/smithy/RepairStation.tsx` | **Opret** — ny komponent |
| `src/components/smithy/SmithyScreen.tsx` | **Rediger** — importér og indsæt `<RepairStation>` |
| `src/components/inventory/ToolsInventoryTab.tsx` | **Rediger** — indikator når durability er 0 |
| `src/components/mine/MineScreen.tsx` | **Rediger** — opdater "hakke slidt"-tekst til at pege på smedjen |

Ingen ændringer i `types.ts`, `pickaxes.ts`, `pickaxeTemplates.ts` eller `App.tsx`.

---

## Implementeringsrækkefølge

1. **Data først** (`shop.ts`): fjern tier 0 og `cons_repair`.
2. **Reducer** (`gameState.ts`): tilføj `REPAIR_PICKAXE` + opdater `BUY_PICKAXE` med dublet-tjek.
3. **Migration** (`migrations.ts`): bump til v8 + dedupér eksisterende saves.
4. **Lyd** (`sounds.ts`): tilføj `playAnvilStrike()`.
5. **CSS** (`style.css`): tilføj de 3 keyframe-animationer.
6. **Komponent** (`RepairStation.tsx`): byg ambolt-UI med klik-handler, sparks, floats og hammer-swing.
7. **Smedje** (`SmithyScreen.tsx`): indsæt `<RepairStation>` øverst.
8. **UX-hints** (`ToolsInventoryTab.tsx`, `MineScreen.tsx`): peg slidte hakker mod smedjen.
9. **TypeScript-check**: `npx tsc --noEmit`.
10. **Manuel test**:
    - Start fresh save → tinhakke kan repareres uendeligt.
    - Eksisterende save med 5× tinhakker → migrationen kollapser til den med højest durability.
    - Køb jernhakke → kan ikke længere købe en til.
    - Slid hakke til 0 → smedjen genskaber den slag for slag.
    - Lyd, sparks og hammer-animation udløses ved hvert klik.

---

## Balance- og UX-noter

| Aspekt | Værdi | Begrundelse |
|---|---|---|
| Slag for fuld reparation | 20 | Lang nok til at føles som arbejde, kort nok til at undgå frustration. ~3 sek. spam, ~10 sek. afslappet rytme. |
| Cooldown mellem klik | 0 ms | Hvert klik er bevidst — lad spilleren styre tempoet. |
| Reparations-omkostning | 0 g | Smedjen er **din** smedje. At opkræve dig selv ville være absurd. |
| Tier 0 starthakke | Uændret 50 max | Kan repareres uendeligt → ingen grund til genkøb. |
| Phoenix Down-essens (`+5 max`) | Uændret | Permanent buff oven på reparationssystemet — perfekt synergi. |
| Slibesten (`+1 purity`) | Uændret | Ikke relateret til hakker, beholdes. |
| Reparations-kit (`cons_repair`) | **Fjernes** | Redundant. Hvis spilleren spørger hvor det blev af: "Smedjen gør det gratis nu." |
| `inventoryCapacity.tools = 10` | Uændret | Med maks. 5 hakker (1 starter + 4 købte) udnyttes feltet ikke længere — men at sænke det vil bryde gamle saves uden gevinst. Lad det stå. |

### Hvorfor 20 slag, ikke 5 eller 50?

- **5 slag**: føles som et trick — ingen ægte håndværkfornemmelse.
- **20 slag**: lang nok til at lyd, animation og partikler bygger et rytmisk loop. Spilleren kommer ind i en "smid hammer"-flow.
- **50 slag**: bliver tedious. Hånden kommer til at gøre ondt på rune-hakker.

20 er sweet spot'et hvor det føles ægte uden at være straffende.

### Hvorfor ingen cooldown?

Cooldowns gør gameplay mekaniske. Et autentisk smedjebesøg har ingen cooldown — du slår så hurtigt eller langsomt du vil. Lyd og animation skalerer naturligt: spam-klik bliver et metallisk maskingevær, langsomme klik bliver meditative slag.

### Mobil-touch

`navigator.vibrate(15)` på hvert slag giver haptisk feedback på Android. iOS ignorerer det stille, så ingen skade sker. Knappen er 56 px høj (over 44 px-minimum) for at være komfortabel på touch.
