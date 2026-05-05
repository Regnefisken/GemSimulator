# Implementeringsplan: Udvidet Ædelstens-Variation

> **Kilde:** `references/New plans/GEM_ANALYSE_OG_ANBEFALINGER.md`
> **Scope:** Alle 4 hovedpunkter fra kilden (§1 Paletter, §2 Mønstre/effekter, §3 Eksotiske metaller, §4 Navngivning fra taxonomi) implementeres samlet, opdelt i 6 faser.
> **Format:** Denne plan er bindende. Composer skal følge faserne i rækkefølge. Hver fase har konkrete filer, signaturer og acceptkriterier.

---

## 0. TL;DR — Låste designvalg

Disse beslutninger er truffet og ændres ikke under implementering. Hvis composer mener et valg er forkert, skal det rejses som spørgsmål før relevant fase påbegyndes.

| Område | Valg |
|---|---|
| **Scope** | Alle 4 punkter, samlet plan opdelt i 6 faser |
| **Grid-chars** | Udvid med **4 nye chars**: `P` (pattern/secondary base), `V` (vein), `S` (star/asterism), `C` (crack). Eksisterende `O,D,G,L,W,1,2,3,X,.` bevares uændret. |
| **Antal nye paletter** | **+20**, fordelt 5/5/5/5 på neon, pastel, gradient/bi-color, metallic/iriserende. Ender på 14 + 20 = **34 paletter**. |
| **Antal nye metaller** | **+4**: Platin og Titanium (mineable), Orichalcum og Elektrum (alloy-only). Total: 11 + 1 alloy = 12 metaller. |
| **Save-strategi** | Bump `CURRENT_STATE_VERSION` til 9. **Ingen** smart migration af gem-navne / gamle gems. Brugeren nulstiller manuelt før test. |
| **Noise-bibliotek** | `simplex-noise` (npm). Seed altid fra `gem.id` så samme gem altid renderer ens. |
| **Navne-system** | Data-drevne fraser (skabelon-strenge i `src/data/namePatterns/`), samlet i én funktion `deriveGemName()`. Ingen mini-DSL. |

---

## 1. Forudsætninger (køres én gang før Fase 0)

```bash
npm install simplex-noise
```

`simplex-noise@4` eksporterer `createNoise2D(rng?)` der returnerer `(x, y) => number` i intervallet `[-1, 1]`. Vi seeder ved at konstruere en deterministisk RNG fra `gem.id` (lille `mulberry32`-funktion i `src/lib/rng.ts`, se Fase 0).

**Save reset:** Brugeren rydder localStorage manuelt før første smoke-test efter Fase 0. Composer skal **ikke** skrive migration-kode for gem-navne; gamle gems må kasseres.

---

## 2. Fase-oversigt

| Fase | Tema | Hovedleverance | Afhængigheder |
|------|------|----------------|---------------|
| **0** | Fundament | Type-udvidelser, save-bump, char-system, RNG/noise-utils, fallback-regler | — |
| **1** | Navngivning (§4) | `deriveGemName()` + datafiler; alle generations-stier kalder den | Fase 0 |
| **2** | Paletter (§1) | 20 nye paletter; alle udnytter de nye chars hvor relevant | Fase 0, 1 |
| **3** | Mønstre & effekter (§2) | `src/gem/patterns.ts` med veining, banding, asterism, opalescens, m.m. | Fase 0, 2 |
| **4** | Eksotiske metaller (§3) | 4 nye metaller, fuld pipeline (ore→nugget→ingot→inklusion→2D+3D-assets→shop→naming) | Fase 0, 1 |
| **5** | Polish, performance, test | Cache, FPS-tjek, lint, simulationer, dokumentation | Alle |

Hver fase er en **selvstændig PR/commit**. Faser merges ikke før alle acceptkriterier er afkrydset.

---

## 3. Fase 0 — Fundament

### 3.1 Type-udvidelser i `src/types.ts`

Tilføj to felter til `Gem` så taxonomi-lag B (silhuet) og C (palette) er eksplicit tilgængelige (kilde i kodebasen: gem-typen i `src/types.ts`):

```typescript
export type Gem = {
  id: string
  name: string                  
  shapeName: string             
  paletteName: string           
  purity: number
  karat: number | null
  data: string[]
  colorMap: ColorMap
  timestamp: string
  isGodTier: boolean
  metalInclusions: MetalInclusion[]
  magicProperties: MagicProperty[]
  goldValue: number
}
```

`Palette`-typen udvides med valgfri felter:

```typescript
export type PaletteCategory = 'classic' | 'neon' | 'pastel' | 'gradient' | 'metallic'
export type PaletteEffectTag = 'iridescent' | 'opalescent' | 'starry' | 'banded' | 'veined' | 'cracked'

export type Palette = {
  name: string
  category: PaletteCategory       
  colorMap: ColorMap              
  effectTags?: PaletteEffectTag[] 
}
```

Eksisterende 14 paletter får `category: 'classic'` og ingen `effectTags`. **Bagudkompatibilitet:** ingen — `Palette` er kun et internt data-objekt; ingen save-data refererer til det.

### 3.2 Char-system

Kanonisk char-tabel (skal dokumenteres som kommentar i `src/types.ts` lige over `ColorMap`):

| Char | Betydning | Pligtig | Fallback hvis mangler |
|------|-----------|---------|------------------------|
| `.` | Tom (transparent) | — | — |
| `O` | Outer rim (silhuet-kant) | Ja | — |
| `D` | Dark (skyggefacet) | Ja | — |
| `G` | Gem base | Ja | — |
| `L` | Light (lysfacet) | Ja | — |
| `W` | White / sparkle | Ja | — |
| `1`,`2`,`3` | Metal-inklusion (slot) | Kun ved metal | Skip cellen |
| `X` | Guld-inklusion | Kun ved guld | Skip cellen |
| **`P`** | **Pattern / sekundær base** | Nej | `G` |
| **`V`** | **Vein / åre** | Nej | `L` |
| **`S`** | **Star / asterism highlight** | Nej | `W` |
| **`C`** | **Crack / fraktur-line** | Nej | `O` |

**Fallback-mekanisme:** centraliseres i `src/gem/colorResolver.ts` (ny fil):

```typescript
export const CHAR_FALLBACKS: Record<string, string> = { P: 'G', V: 'L', S: 'W', C: 'O' }
export function resolveColor(char: string, colorMap: ColorMap): string | null
```

`drawGem` (i `src/gem/draw2d.ts`) og `VoxelMesh` (i `src/components/VoxelScene.tsx`) **skal** bruge `resolveColor()` i stedet for direkte `colorMap[char]`-opslag. Det sikrer at en gammel gem med en gammel palette og et nyt char falder tilbage på sin nærmeste tvilling i stedet for at vise sort.

### 3.3 RNG & noise i `src/lib/rng.ts` (ny)

```typescript
export function mulberry32(seed: number): () => number
export function hashStringToInt(s: string): number
export function makeNoise2D(seed: string | number): (x: number, y: number) => number
```

`makeNoise2D` bruger `simplex-noise.createNoise2D(mulberry32(hashStringToInt(seed)))`. Brug altid `gem.id` som seed når der renderes en specifik gem, og `Math.random()` (eller en globalt seedet RNG) når der genereres en ny.

### 3.4 Save-version bump

I `src/lib/migrations.ts`:

```typescript
export const CURRENT_STATE_VERSION = 9
```

Tilføj en `if (version < 9) { /* nuke gems */ }`-blok der **rydder** følgende felter fra ældre saves:
- `gems: []`
- `roughStones: []`
- `totalGemsFound: 0`

Det matcher brugerens "jeg er stadig i udvikling, det er fint at nulstille". Composer skal logge én console.warn ved migration så det er synligt at den er sket.

### 3.5 Acceptkriterier — Fase 0

- [ ] `npm run build` bygger uden fejl
- [ ] `tsc --noEmit` (eller eksisterende lint/typecheck-script) er grøn
- [ ] Eksisterende 2D + 3D rendering ser identisk ud (visuel diff på 5 tilfældige gems før/efter)
- [ ] En gem med char `P` i sit data og uden `colorMap.P` falder tilbage på `colorMap.G` i både 2D og 3D
- [ ] Ny `Gem` har `shapeName` + `paletteName` udfyldt fra alle 3 generations-stier (`createRandomGem`, `createPreloadGem`, `craftGemFromRoughStone`)
- [ ] Save fra version 8 indlæses, gems nulstilles, ingen crash

---

## 4. Fase 1 — Navngivning fra taxonomi (§4)

### 4.1 Datafiler

Opret mappe `src/data/namePatterns/` med:

**`magicPrefixes.ts`** — præfiks pr. magitype (kort, max 1 ord). Eksempler:
```
Ild → "Flamme-"
Frost → "Frost-"
Lyn → "Lyn-"
Natur → "Naturens "
Giftig → "Gift-"
Helbredende → "Liv-"
Sjælebindende → "Sjæle-"
Tidskontrollerende → "Tids-"
Radioaktiv → "Aske-"
```

Format:
```typescript
export const MAGIC_PREFIXES: Record<string, string> = { ... }
export const MAGIC_SUFFIXES: Record<string, string> = { Ild: 'af Ild', ... } 
```

**`metalPhrases.ts`** — fraser pr. metal-inklusion. Eksempler:
```
Guld → "med Guldåre"
Sølv → "med Sølvspor"
Kobber → "med Kobberveining"
Jern → "med Jern-fnug"
Tin → "med Tinprikker"
Bronze → "med Bronze-spor"
Mithril → "med Mithril-glød"
Runestål → "med Rune-årer"
Platin → "med Platin-glans"      
Titanium → "med Titanium-streger"
Orichalcum → "med Orichalcum-flammer"
Elektrum → "med Elektrum-skær"
```

Når 2 metaller: brug `"med {A}- og {B}-spor"`. Når 3: `"med {A}-, {B}- og {C}-spor"` (kort dansk-grammatik-funktion).

**`qualityPhrases.ts`**:
```typescript
export const PURITY_PREFIXES: Record<number, string> = {
  1: '',
  2: '',
  3: 'Klar ',
  4: 'Uplettet ',
}
export const GOD_TIER_PREFIX = 'Guddommelig '
export const KARAT_TEMPLATE = (k: number) => `${k}K-`
```

**`paletteAdjectives.ts`** (valgfri 2. iteration; springes over hvis tid presser) — alternative former for paletteName i navne, fx Smaragd→Smaragd-. Default: brug `palette.name` direkte.

### 4.2 Selve funktionen — `src/gem/naming.ts` (ny)

```typescript
import type { Gem } from '../types'

export type GemNameLayers = Pick<
  Gem,
  'shapeName' | 'paletteName' | 'metalInclusions' | 'magicProperties' | 'purity' | 'isGodTier' | 'karat'
>

export function deriveGemName(g: GemNameLayers): string
```

**Sammensætningsrækkefølge** (læses venstre→højre):

1. **GodTier-præfiks** (kun hvis `isGodTier`): `"Guddommelig "`
2. **Purity-præfiks** (kun ved purity 3 eller 4): `"Klar "` / `"Uplettet "`
3. **Karat-præfiks** (kun hvis `karat != null`): `"24K-"`
4. **Magi-præfiks** (kun fra første magic-property; resten droppes for at undgå støj): fx `"Flamme-"`
5. **Palette-navn** (lag C): fx `"Rubin"`
6. **Shape** (lag B): fx `"Brilliant"` — kommer FØR paletten på dansk: faktisk skal vi vende → bliv ved nuværende mønster: `"{shapeName} {paletteName}"`. *(Se note nedenfor.)*
7. **Metal-frase** (lag F): fx `"med Guldåre"`
8. **Magi-suffiks** (kun hvis 2+ magic eller hvis præfiks ikke blev brugt): fx `"af Ild og Frost"`

> **Note om rækkefølge:** Den nuværende kode bruger `"{shapeName} {paletteName}"` (fx "Brilliant Rubin"). Bevar dette mønster for ikke at ændre alle eksisterende strings i tests/UI; magi-præfikset bindes direkte ind i paletteName-leddet uden mellemrum (`"Flammerubin"`-mønstret kun når magien matcher palettens første konsonant; ellers bevares mellemrum `"Flamme-Rubin"`). Composer må vælge den mere robuste variant: **altid bindestreg**, dvs. `"Flamme-Rubin"`. Det er forudsigeligt og oversættervenligt.

**Endeligt målformat:**
```
[GodTier ][Purity ][Karat-][Magi-præfix-]{shapeName} {paletteName}[ metalfrase][ magi-suffiks]
```

Eksempler:
- Standard rubin uden metal/magi → `"Brilliant Rubin"`
- Med ild → `"Flamme-Brilliant Rubin"`
- Med ild + guld → `"Flamme-Brilliant Rubin med Guldåre"`
- GodTier + 24K guld + ild + frost → `"Guddommelig Uplettet 24K-Flamme-Brilliant Rubin med Guldåre af Frost"`

### 4.3 Længde- og dedupe-regler (R2)

- **Max 60 tegn.** Hvis overskredet, droppes ledd i denne rækkefølge: 8 (magi-suffiks) → 7 (metalfrase forkortes til `"med spor"`) → 4 (magi-præfiks) → 1 (GodTier).
- **Synonym-dedupe:** hvis `paletteName` indeholder magi-stamme (fx palette "Vulkan" + magi "Ild"), skip magi-præfikset. Tabel i `magicSynonyms.ts`:
  ```typescript
  export const MAGIC_SYNONYM_PALETTES: Record<string, string[]> = {
    Ild: ['Vulkan', 'Solnedgang'],
    Frost: ['Akvamarin', 'Havdyb'],
    Natur: ['Smaragd', 'Peridot'],
  }
  ```

### 4.4 Integration

Tre steder skal nu kalde `deriveGemName()`:

1. `src/gem/generate.ts` — `createRandomGem` (linje ~309) og `createPreloadGem` (linje ~371)
2. `src/gem/crafting.ts` — `craftGemFromRoughStone` (linje ~70)

Erstat alle tre `name: \`${templateObj.shapeName} ${palette.name}\``-linjer med:
```typescript
gem.shapeName = templateObj.shapeName
gem.paletteName = palette.name
gem.name = deriveGemName(gem)
```

(NB: kald `deriveGemName` **efter** purity, karat, isGodTier, metalInclusions og magicProperties er sat, da alle bidrager til navnet.)

### 4.5 Acceptkriterier — Fase 1

- [ ] Alle 3 generationsstier producerer gems med korrekte taxonomi-navne
- [ ] Enhedstest i `src/gem/naming.test.ts` (eller hvor tests bor) dækker:
  - Tom magi + tom metal
  - 1 magi + 1 metal
  - 3 magi + 3 metaller (max-længde-trim trigger)
  - GodTier + 24K + ild + guld (kombineret prefix-kæde)
  - Synonym-dedupe (Vulkan + Ild)
- [ ] Inventory og GemPreviewModal viser de nye navne uden layout-bugs
- [ ] Lint + typecheck grøn

---

## 5. Fase 2 — Paletter (§1)

### 5.1 De 20 nye paletter

Tilføjes til `src/data/palettes.ts`. Hver palette får: `name`, `category`, `colorMap` (med 5 kerne-chars + valgfri `P`, `V`, `S`, `C`), og `effectTags`.

#### Neon (5)
| Navn | O | D | G | L | W | P | Effect tags |
|------|---|---|---|---|---|---|-------------|
| Neon Pink | `#581c87` | `#be185d` | `#ec4899` | `#f9a8d4` | `#fdf2f8` | `#fb7185` | — |
| Neon Grøn | `#052e16` | `#16a34a` | `#22c55e` | `#86efac` | `#f0fdf4` | `#bef264` | — |
| Neon Blå | `#1e1b4b` | `#1d4ed8` | `#3b82f6` | `#93c5fd` | `#eff6ff` | `#22d3ee` | — |
| Neon Lilla | `#3b0764` | `#7c3aed` | `#a855f7` | `#d8b4fe` | `#faf5ff` | `#f0abfc` | — |
| Neon Orange | `#7c2d12` | `#ea580c` | `#fb923c` | `#fdba74` | `#fff7ed` | `#facc15` | — |

#### Pastel (5)
| Navn | O | D | G | L | W | P | Effect tags |
|------|---|---|---|---|---|---|-------------|
| Pastel Mint | `#134e4a` | `#5eead4` | `#a7f3d0` | `#ccfbf1` | `#f0fdfa` | `#fef3c7` | — |
| Pastel Lavendel | `#3b0764` | `#a78bfa` | `#c4b5fd` | `#ddd6fe` | `#f5f3ff` | `#fbcfe8` | — |
| Pastel Fersken | `#7c2d12` | `#fdba74` | `#fed7aa` | `#ffedd5` | `#fff7ed` | `#fecaca` | — |
| Pastel Himmel | `#0c4a6e` | `#7dd3fc` | `#bae6fd` | `#e0f2fe` | `#f0f9ff` | `#a5f3fc` | — |
| Pastel Rose | `#831843` | `#f9a8d4` | `#fbcfe8` | `#fce7f3` | `#fdf2f8` | `#fed7aa` | — |

#### Gradient / bi-color (5) — bruger `P` aktivt
| Navn | O | D | G | L | W | P | Effect tags |
|------|---|---|---|---|---|---|-------------|
| Solnedgang | `#7c2d12` | `#dc2626` | `#f97316` | `#fb923c` | `#fde68a` | `#a855f7` | `banded` |
| Aurora | `#0f172a` | `#15803d` | `#22c55e` | `#86efac` | `#f0fdf4` | `#a855f7` | `banded`, `veined` |
| Havdyb | `#0c4a6e` | `#1e40af` | `#0ea5e9` | `#22d3ee` | `#a5f3fc` | `#1e3a8a` | `veined` |
| Vulkan | `#0c0a09` | `#7f1d1d` | `#dc2626` | `#f97316` | `#fde68a` | `#1c1917` | `cracked` |
| Ametyst-Stjerne | `#1e1b4b` | `#6d28d9` | `#a855f7` | `#d8b4fe` | `#fafaf9` | `#fafaf9` | `starry` |

#### Metallic / iriserende (5) — bruger `V`, `S`, `C` aktivt
| Navn | O | D | G | L | W | P | V | S | C | Effect tags |
|------|---|---|---|---|---|---|---|---|---|-------------|
| Opal | `#475569` | `#94a3b8` | `#e2e8f0` | `#f8fafc` | `#ffffff` | `#fbbf24` | `#34d399` | `#f9a8d4` | — | `opalescent` |
| Pearl | `#64748b` | `#cbd5e1` | `#f1f5f9` | `#fafafa` | `#ffffff` | `#fce7f3` | — | `#fff7ed` | — | `iridescent` |
| Iridescent | `#1e1b4b` | `#7c3aed` | `#22d3ee` | `#a3e635` | `#fde68a` | `#f472b6` | — | — | — | `iridescent`, `banded` |
| Quicksilver | `#0f172a` | `#475569` | `#94a3b8` | `#e2e8f0` | `#ffffff` | — | `#cbd5e1` | `#ffffff` | — | `veined`, `starry` |
| Galaxy | `#020617` | `#1e1b4b` | `#312e81` | `#7c3aed` | `#fef3c7` | — | — | `#ffffff` | `#1e293b` | `starry`, `cracked` |

> **Composer-note:** Kategori-strukturen (klassisk vs. neon vs. metallic) bruges senere af `createRandomGem` til at vægte sjældenhed (metallic ~ rare, neon ~ uncommon). Det implementeres i Fase 3 / 5.

### 5.2 Paletternes integration i generation

`createRandomGem` skal vægte paletter efter kategori (rarity-følelse — R1 + R5):

```typescript
const PALETTE_WEIGHTS: Record<PaletteCategory, number> = {
  classic: 100,
  pastel: 60,
  neon: 35,
  gradient: 18,
  metallic: 6,
}
```

Erstat den eksisterende Citrin-special-case (linje ~241–246) med en generisk vægtet udvælgelse. Citrin's "9% chance"-logik bevares som en tweak i klassik-vægten (Citrin får dobbelt vægt inden for `classic`).

### 5.3 Acceptkriterier — Fase 2

- [ ] 34 paletter total i `PALETTES`-arrayet
- [ ] Hver palette har `category` og lovlig `colorMap` (alle 5 kerne-chars)
- [ ] `createRandomGem` udvælger paletter vægtet efter kategori
- [ ] Manuelt review: 20 gens af hver ny palette inspiceres i 2D + 3D (skærmbillede / hurtig devcheat) — ingen sorte celler, ingen åbenlys hæslighed
- [ ] Eksisterende 14 paletter ser identisk ud (ingen utilsigtet regression i klassik)
- [ ] Lint + typecheck grøn

---

## 6. Fase 3 — Mønstre & effekter (§2)

### 6.1 Ny fil `src/gem/patterns.ts`

```typescript
import type { ColorMap } from '../types'

type PatternCtx = {
  data: string[]              
  rng: () => number           
  noise: (x: number, y: number) => number 
}

export function applyVeining(ctx: PatternCtx, density?: number): string[]
export function applyBanding(ctx: PatternCtx, orientation: 'h' | 'v', count?: number): string[]
export function applySpeckles(ctx: PatternCtx, density?: number): string[]
export function applyAsterism(ctx: PatternCtx): string[]            
export function applyChatoyancy(ctx: PatternCtx): string[]         
export function applyOpalescence(ctx: PatternCtx): string[]      
export function applyCracks(ctx: PatternCtx, count?: number): string[]
```

#### Opførsel pr. funktion

- **`applyVeining`** — bruger `noise(x*0.3, y*0.3)`; celler hvor `|noise| < density` (default 0.08) og current-char er `G`/`D` overskrives med `V`. Giver tynde organiske årer.
- **`applyBanding`** — vandrette eller vertikale striber af bredde 2 med L/D alternerende. Position styres af `noise` så striber krummer let.
- **`applySpeckles`** — random `C`-celler (default 1.5% af G-celler).
- **`applyAsterism`** — tegner et 6-strålet stjernemønster centreret i gem'ens tyngdepunkt (beregnet fra hvor G/D-celler ligger). `S`-char overskriver eksisterende W/L celler langs strålerne.
- **`applyChatoyancy`** — én sammenhængende `S`-stribe gennem gem'ens midte (katteøje), 1 cell bred, med `S` på ekstremerne og `W` i centrum.
- **`applyOpalescence`** — fordeler 8–12 små farvepletter ved at swappe G/L→W/P i klynger af 2×2.
- **`applyCracks`** — tegner 1–3 sammenhængende `C`-linjer (bresenham-streger fra random kant til random kant inde i gem).

### 6.2 Integration i `createRandomGem`

Efter `addMetalInclusionMarks` og før `mutateGemData(finalData, isFlawless)` tilføjes en effekt-kæde der lytter til palettens `effectTags`:

```typescript
const noise = makeNoise2D(gem.id)
const rng = mulberry32(hashStringToInt(gem.id))
const ctx = { data: finalData, rng, noise }

if (palette.effectTags?.includes('veined')) finalData = applyVeining({ ...ctx, data: finalData })
if (palette.effectTags?.includes('banded')) finalData = applyBanding({ ...ctx, data: finalData }, rng() < 0.5 ? 'h' : 'v')
if (palette.effectTags?.includes('starry')) finalData = applyAsterism({ ...ctx, data: finalData })
if (palette.effectTags?.includes('opalescent')) finalData = applyOpalescence({ ...ctx, data: finalData })
if (palette.effectTags?.includes('cracked')) finalData = applyCracks({ ...ctx, data: finalData })
if (palette.effectTags?.includes('iridescent')) {
  
  finalData = applyBanding({ ...ctx, data: finalData }, 'h', 4)
  finalData = applyVeining({ ...ctx, data: finalData }, 0.04)
}
```

**GodTier-bonus:** Når `isGodTier === true`, anvendes `applyAsterism` ekstra (selv hvis paletten ikke har `starry`-tag). Det giver en visuel "wow"-faktor til GodTier-gems.

**Tilfældig effekt-bonus (uden tag):** 4% chance for at en hvilken som helst gem får `applySpeckles` (mineral-følelse). Dette er rent procedural variation, ikke palette-bundet.

### 6.3 Performance (R4)

- Cache er **ikke** nødvendig på generations-tidspunkt — det sker én gang pr. gem.
- Hvis 2D/3D rendering bliver langsom med mange gems: tilføj `pixelItemCache: WeakMap<Gem, ImageBitmap>` i `GemCard.tsx` så drawGem ikke kører hver render.
- FPS-tjek udskydes til Fase 5.

### 6.4 Acceptkriterier — Fase 3

- [ ] Alle 7 effektfunktioner implementeret og enhedstestet på et 16×16 dummy-grid
- [ ] Same `gem.id` giver pixelperfekt samme `data` ved gen-rendering (deterministisk noise)
- [ ] Manuel inspektion: Opal, Aurora, Galaxy paletter viser tydeligt anderledes mønstre i forhold til klassiske paletter
- [ ] GodTier-gems har synlig asterism-stjerne
- [ ] Lint + typecheck grøn
- [ ] FPS ved 50 gems i inventory ≥ 30 fps (måles uformelt; hvis under, skub til Fase 5 med cache)

---

## 7. Fase 4 — Eksotiske metaller (§3)

### 7.1 Nye metaller — definitioner

| Navn | Type | goldBonus | pixelColor | icon | effect | Crafting |
|------|------|-----------|------------|------|--------|----------|
| **Titanium** | Mineable | 1.7 | `#71717a` | `🔘` | `+70% guld + lethed` | — |
| **Platin** | Mineable | 3.2 | `#e2e8f0` | `⚪` | `+220% guld + glans` | — |
| **Orichalcum** | Alloy | 5.0 | `#fb923c` | `🟠` | `+400% guld + ild-aura` | Guld + Mithril |
| **Elektrum** | Alloy | 2.2 | `#fef3c7` | `🟨` | `+120% guld + sølv-skær` | Guld + Sølv |

(Værdier kalibreres i Fase 5 hvis simulation viser skæv distribution — R5.)

### 7.2 Filer der opdateres

#### `src/types.ts`
```typescript
export type MetalName =
  | 'Tin' | 'Kobber' | 'Jern' | 'Bronze' | 'Sølv' | 'Guld' | 'Mithril' | 'Runestål'
  | 'Titanium' | 'Platin' | 'Orichalcum' | 'Elektrum'

export const MINEABLE_METALS: MetalName[] = [
  'Tin', 'Kobber', 'Jern', 'Sølv', 'Titanium', 'Guld', 'Platin', 'Mithril', 'Runestål',
]
export const ALLOY_ONLY_METALS: MetalName[] = ['Bronze', 'Orichalcum', 'Elektrum']
```

#### `src/data/metals.ts`
Tilføj 4 nye records.

#### `src/data/areas.ts` — opdater `metalPool` for relevante miner
- **Sølvhulen:** Tilføj `{ metal: 'Titanium', weight: 8 }`
- **Guldgrotten:** Tilføj `{ metal: 'Titanium', weight: 5 }`, `{ metal: 'Platin', weight: 6 }`
- **Mithrilbjerget:** Tilføj `{ metal: 'Platin', weight: 12 }`
- **Rune-Dybet:** Tilføj `{ metal: 'Platin', weight: 10 }`

**Ingen ny lokation tilføjes** — eksotiske metaller er sjældne tilstande i eksisterende miner, ikke nye områder. (Hvis brugeren senere vil have et "Krystaldyb"-område: separat opgave, ikke i denne plan.)

#### `src/gem/crafting.ts` — udvid `craftAlloy`
```typescript
export function craftAlloy(input: { a: MetalName; b: MetalName }): MetalName | null {
  const set = [input.a, input.b].sort().join('+')
  switch (set) {
    case 'Kobber+Tin': return 'Bronze'
    case 'Guld+Mithril': return 'Orichalcum'
    case 'Guld+Sølv': return 'Elektrum'
    default: return null
  }
}
```

#### `src/data/oreTemplates.ts`, `src/data/ingotTemplates.ts`
Tilføj 2D-pixel templates (ore, nugget, ingot) for **alle 4 nye metaller**. Hver pixel-asset følger samme størrelse og format som de eksisterende (12×12 grid, ColorMap med metallets `pixelColor`).

> **Composer-note:** For at undgå at sidde fast med pixelkunst, må composer genbruge eksisterende silhuetter for ore/nugget/ingot og kun ændre `colorMap` så det matcher det nye metals farver. Det er en bevidst kompromis — visuel fællesnævner er bedre end ingen asset.

#### Andre filer der **skal verificeres** men typisk ikke kræver kodeændringer
- `src/data/shop.ts` — sell-priser for nye ore/nugget/ingot. Tilføj entries i `ORE_SELL_PRICES` og `NUGGET_SELL_PRICES` (`src/data/market.ts`).
- `src/data/jewelry.ts` — verificér at nye metaller kan bruges i recipes; tilføj evt. 1-2 nye recipes (fx "Platin-ring", "Orichalcum-amulet"). Hvis tid presser: ingen nye recipes, eksisterende metaller fortsætter som krav i jewelry — nye metaller bruges kun som inklusioner.
- `src/data/namePatterns/metalPhrases.ts` — fraser for de 4 nye (allerede skrevet i Fase 1's tabel).
- `src/components/inventory/MaterialsInventoryTab.tsx` — verificér at nye metaller vises korrekt.
- `src/components/smithy/AlloyStation.tsx` — verificér at de nye recipes kan craftes.

### 7.3 Acceptkriterier — Fase 4

- [ ] `MetalName`-union er udvidet og typecheck grøn på tværs af kodebasen
- [ ] Alle 4 metaller kan ses i inventory som ore, nugget, ingot (manuel devcheat: spawn alle)
- [ ] Mining i Sølvhulen → Rune-Dybet kan droppe nye metaller (logget i 100-tick devcheat-simulation)
- [ ] Orichalcum og Elektrum kan craftes i AlloyStation
- [ ] Alle 4 metaller kan optræde som inklusion i en gem (devcheat: force-spawn med inclusion)
- [ ] Naming-funktion producerer korrekt frase for hvert nyt metal
- [ ] 1.000-gem simulation logger value-distribution; ingen metal er over- eller underrepræsenteret >2× sin forventede vægt (R5)
- [ ] Lint + typecheck grøn

---

## 8. Fase 5 — Polish, performance, test

### 8.1 Performance

- Mål FPS i inventory med 50+ gems (R4). Hvis under 30:
  - Implementer `pixelItemCache: Map<gemId, ImageBitmap>` i `GemCard` med max 100 entries (LRU)
  - Eller pre-render alle synlige gems som static PNGs ved første mount
- Brug `npm run build` + lighthouse på dev-build for at fange åbenlyse regressioner

### 8.2 Test-suite

Hvis projektet allerede har Vitest/Jest: tilføj enhedstest for:
- `deriveGemName()` (allerede dækket i Fase 1)
- `resolveColor()` med fallback-stier
- Hver `apply*`-funktion i `patterns.ts` (deterministisk output ved samme seed)
- `craftAlloy()` med alle nye recipes
- `migrateGameState` ved version 8 → 9 nuking

Hvis intet test-framework: minimum manuel devcheat-tjekliste i `DevCheatPanel.tsx` der trigger hvert kritisk scenarie.

### 8.3 Dokumentation

- Opdater `README.md` § "Features" med de nye paletter, metaller og effekter
- Tilføj kort sektion til `README.md` om hvordan char-systemet fungerer (P/V/S/C + fallbacks)
- Markér denne plan som ✅ implementeret med dato i toppen af filen

### 8.4 Acceptkriterier — Fase 5

- [ ] FPS ≥ 30 ved 50 gems i inventory
- [ ] Eventuel test-suite grøn
- [ ] README opdateret
- [ ] Kort visuel showcase: 8 hand-pickede gems (mix af klassiske + nye paletter, GodTier, eksotiske metaller, magi-stack) screenshottes og lægges i `references/screenshots/` (eller `public/`) som dokumentation af det færdige resultat

---

## 9. Konsoliderede tjeklister

### 9.1 Per ny palette (genbrug fra kilden — udvidet)
- [ ] Definer i `src/data/palettes.ts` med `category`, alle 5 kerne-chars og evt. `P`/`V`/`S`/`C` + `effectTags`
- [ ] Spot-test 20 generationer i 2D + 3D
- [ ] Verificér i inventory og GemPreviewModal
- [ ] Tilføj evt. dedupe-entry i `magicSynonyms.ts` hvis paletten konnoterer en magitype
- [ ] Lint + typecheck grøn

### 9.2 Per nyt metal (fuld pipeline)
- [ ] `src/types.ts` — `MetalName`-union + `MINEABLE_METALS` / `ALLOY_ONLY_METALS`
- [ ] `src/data/metals.ts` — `MetalInclusion`-record
- [ ] `src/data/areas.ts` — `metalPool`-vægte
- [ ] `src/data/oreTemplates.ts` + `src/data/ingotTemplates.ts` — pixel-assets
- [ ] `src/data/market.ts` — ore + nugget priser
- [ ] `src/gem/crafting.ts` — alloy-recipe (kun for alloy-only)
- [ ] `src/data/jewelry.ts` — verificér / tilføj recipes (valgfrit)
- [ ] `src/data/namePatterns/metalPhrases.ts` — frase
- [ ] `DevCheatPanel.tsx` — spawn-knap til alle nye assets
- [ ] 1.000-gem simulation; rapport vedlagt i PR
- [ ] `CURRENT_STATE_VERSION` bumpet (én gang for alle 4 metaller — sker i Fase 0)

### 9.3 Per ny char i grid (bruges hvis flere chars tilføjes senere)
- [ ] Dokumenteres i char-tabellen (sektion 3.2)
- [ ] Fallback registreret i `CHAR_FALLBACKS`
- [ ] `drawGem` og `VoxelMesh` håndterer charen via `resolveColor`
- [ ] Mindst én palette-kategori bruger den
- [ ] Spot-test: gammel palette + ny char = fallback fungerer

### 9.4 Per ny effekt-funktion
- [ ] Tilføjet til `src/gem/patterns.ts` med konsistent `PatternCtx`-signatur
- [ ] Deterministisk: samme seed → samme output
- [ ] Mindst én palette har effekten i `effectTags`
- [ ] Visuel inspektion på 5 forskellige paletter
- [ ] Enhedstest hvis test-framework eksisterer

---

## 10. Risici & mitigationer (kobles til kildens risikomatrix)

| # | Risiko (kilde) | Mitigation i denne plan |
|---|---|---|
| **R1** | Visuel variation forbliver begrænset | Fase 3 introducerer 7 noise-baserede mønstre + udvidede chars; palette-tags driver effekter automatisk |
| **R2** | Navngivning følger ikke taxonomien | Fase 1 implementeres **først** efter Fase 0; alle 3 generations-stier opdateres samtidigt |
| **R3** | Halvfærdige features ved ny content | §9.1 + §9.2 er gates — ingen fase merges før alle felter afkrydset; konservativt 4-metal-scope (ikke 7+) |
| **R4** | Performance ved mange gems | Deterministisk noise (cachable), Fase 5 har FPS-tjek og evt. ImageBitmap-cache |
| **R5** | Økonomi-balance skævvrides | Fase 4 acceptkriterium kræver 1.000-gem simulation; metaller kalibreres i Fase 5 hvis distribution skæv |
| **R6** | Save-inkompatibilitet | Fase 0 bumper version til 9 og nuker gems eksplicit (med console.warn). Ingen smart migration = ingen smarte bugs. |
| **R7** | Lyd ikke planlagt | Bevidst out-of-scope; noteres til separat backlog |
| **R8** | Mobil/touch ikke testet | Fase 5 indeholder valgfri mobil-spot-test; ingen ny touch-interaktion introduceres |

---

## 11. Filer der berøres — cheat sheet

### Nye filer
- `src/lib/rng.ts` — mulberry32 + seeded simplex-noise wrapper
- `src/gem/colorResolver.ts` — char fallback resolver
- `src/gem/naming.ts` — `deriveGemName()`
- `src/gem/patterns.ts` — alle effekt-funktioner
- `src/data/namePatterns/magicPrefixes.ts`
- `src/data/namePatterns/metalPhrases.ts`
- `src/data/namePatterns/qualityPhrases.ts`
- `src/data/namePatterns/magicSynonyms.ts`

### Ændrede filer
- `src/types.ts` — `Gem`, `Palette`, `MetalName`, `MINEABLE_METALS`, `ALLOY_ONLY_METALS`, char-tabel-kommentar
- `src/data/palettes.ts` — +20 paletter, `category` + `effectTags`
- `src/data/metals.ts` — +4 metaller
- `src/data/areas.ts` — opdaterede `metalPool` for 4 miner
- `src/data/oreTemplates.ts`, `src/data/ingotTemplates.ts` — pixel-assets for nye metaller
- `src/data/market.ts` — priser
- `src/data/jewelry.ts` — verificering / valgfri recipes
- `src/data/shop.ts` — verificering
- `src/gem/generate.ts` — `createRandomGem`, `createPreloadGem` (palette-vægtning, effekt-kæde, naming)
- `src/gem/crafting.ts` — `craftGemFromRoughStone` (naming) + `craftAlloy` (nye recipes)
- `src/gem/draw2d.ts` — bruger `resolveColor`
- `src/components/VoxelScene.tsx` — bruger `resolveColor`
- `src/lib/migrations.ts` — `CURRENT_STATE_VERSION = 9` + nuke-blok
- `src/dev/DevCheatPanel.tsx` — spawn-knapper til nye metaller (verificering)
- `README.md` — ny features-sektion

### Ikke berørte (men verificeres i acceptkriterier)
- `src/components/inventory/*` — ingen ændring forventet, men spot-test
- `src/components/smithy/AlloyStation.tsx`, `Smelter.tsx`, `GemCrafter.tsx` — verificér at nye metaller flows
- `src/components/shop/SellTab.tsx` — verificér priser

---

## 12. Anbefalet rækkefølge for composer

1. Læs hele denne plan + `GEM_ANALYSE_OG_ANBEFALINGER.md` igen
2. Lav Fase 0 som **én** PR/commit, byg + smoke-test, mergé
3. Lav Fase 1 som én PR/commit
4. Lav Fase 2 som én PR/commit
5. Lav Fase 3 som én PR/commit
6. Lav Fase 4 som én PR/commit
7. Lav Fase 5 som én PR/commit (kan splittes i polish vs. dokumentation hvis stort)

**Stop og spørg brugeren** hvis:
- En låst designbeslutning fra § 0 viser sig forkert under implementering
- En fase overskrider 2× forventet diff-størrelse
- En acceptkriterium ikke kan opfyldes uden ekstra scope

---

## 13. Slut-tilstand (sådan ser spillet ud efter Fase 5)

- 34 paletter fordelt over 5 kategorier
- 12 metaller (9 mineable + 3 alloy)
- 4 nye grid-chars med systematisk fallback
- 7 noise-baserede effektfunktioner styret af palette-tags
- Et samlet navngivningssystem hvor `gem.name` altid afspejler taxonomi-lagene
- Save version 9 (gamle saves nukes deres gems)
- Alle nye assets fremstår konsistent på tværs af 2D, 3D, inventory, shop, smedje og smykkeværksted

> Resultatet skal føles som "jeg ser stadig en ny variant hver gang jeg minerer", uden at to faser nogensinde efterlod et halvfærdigt feature.

---

**Plan oprettet:** 5. maj 2026  
**Status:** Implementeret 5. maj 2026 (Fase 0–5)
