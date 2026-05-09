# GemSimulator – Mine System  
**Arkitektur, Koncept og Fuldt Implementerings-Spec**

**Version:** 2.1 (9. maj 2026)  
**Formål:** Give minen mere variation i rum-udformning og størrelse fra run til run og dybde til dybde, samtidig med at vi bevarer perfekt balance, performance og læsbarhed.

---

## Vedtagne designvalg (klar til implementerings-guide)

Beslutninger fra produkt / design — skal følges i kode og tests.

| # | Valg | Kort betydning |
|---|------|----------------|
| **1** | **A** | Rum-layout (`CaveConfig`: `oreSlots`, `bounds`, …) afledes **kun** deterministisk af `runId`, `mineId`, `currentDepth` (+ evt. area-baseline). **Ingen** ekstra rum-metadata gemmes i save til at genskabe layout. |
| **2** | **A** | Kosmetiske klipper: seed skal inkludere **grafik-preset** (og en lille `graphicsSchemaVersion` ved behov), så skift af preset giver **ny** kosmetik; interagerbare slots forbliver defineret af samme run/dybde som før. |
| **3** | **A** | Nedstigning som i dag: **alle** felter med `kind === 'rock'` eller `kind === 'mob'` skal være ryddet; kister er valgfrie. |
| **4** | **Fuld RNG + vægte + 4a** | Pr. felt trækkes type med RNG. **Kiste** og **mob** har **lavere** sandsynlighed end “øvrige” (sten-)felter. **Gode** klippertyper (fx rich / crystal — defineres i loot-tabeller) er **underrepræsenteret** ift. almindelige klipper. Ekstremt udfald *kun monstre* er muligt men sjældent. **4a — Bonusetage:** et lag kan være **kun kister** (ultra-sjældent); der er da **ingen** mandatory felter, så **nedstigning er mulig med det samme** (bevidst “gratis etage” / bonus — ikke en fejl). Senere kan UI eller copy signalere bonusetage tydeligere. |
| **5** | **A + udvidelse** | `MobType` er **kun kosmetisk** i første omgang (fx samme rig, farvevariation). Strukturen skal dog tillade **senere** anderledes eller bedre loot pr. type (fx separat profil / `rollMobMineDrop(..., mobType)`), **uden** at ændre HP eller skade pr. tick før det besluttes. |
| **6** | **A** | Smalle templates (fx `corridor`): **kun** geometri og bounds i v1 — samme kamera- og mob-adfærd som i dag. |
| **7** | **A** (vej til **C**) | Én **global** generator for alle miner nu. Arkitekturen bør ikke låse muligheden for senere **to spor** (fx “story-miner” med fast katalog vs. “rogue” med fuld RNG) ude. |

**Fremtidig balance-note (kister):** Sandsynlighed for kister **med** værdifuldt indhold kan øges senere via **tuning af vægte og loot-tabeller**; det ændrer ikke nødvendigvis seed-kontrakten, så længe felt-type-rækkefølgen stadig kommer fra samme deterministiske RNG-strøm (kun tallene i tabellerne ændres).

---

## A: Overordnet Arkitektur, Koncept og Fokus

### 1. Kernekoncept
Vi beholder det nuværende **single-room** system som fundament, men løfter det til næste niveau ved at introducere:

- **Varierede rum-templates** – statiske, håndlavede layouts (classic, corridor, island, dogleg).
- **Dynamisk størrelses-variation** – small / medium / large kamre der skaleres med depth og run-seed.
- **Kosmetiske klipper** (2–3 custom modeller) som visuel fyld – placeret på gulv **og** vægge.
- **Fast antal interagerbare objekter** – minimum 5 og maksimum 10 pr. rum (uafhængigt af grafik-preset for konsistens i balance).
- **Grafik-presets** (Performance / Balanced / Rich) der kun skaleres kosmetik, partikler, skygger og tåge.
- **Nye monstertyper** (du leverer modeller) med depth-vægtet RNG.

**Overordnede designprincipper der styrer alt:**
- Læsbarhed, spænding, rytme, fairness og skalerbar performance.
- Ingen unfair blocking af loot, drops eller spiller-veje.
- Alt er **deterministisk**: kerne-lag (slots + layout) via `runId + mineId + depth` som i dag; **kosmetik** følger desuden **grafik-preset** i seed (designvalg 2A).

### 2. Arkitektur-overblik (hvordan det hænger sammen)

```
Mine Generation (mineLayer.ts)
├── getRoomTemplate() + getRoomSize()          → vælger template + størrelse
├── generateCaveConfig(template, size)         → bygger oreSlots + bounds
├── generateInteractiveSlots()                 → 5–10 faste interagerbare
├── generateCosmeticRocks()                    → 15–120 (preset + size)
└── nonBlockingPlacement()                     → sikrer afstand til interagerbare
3D Scene (VoxelScene.tsx + InstancedMesh)
├── Interagerbare objekter (individuelle meshes)
├── Kosmetiske klipper (InstancedMesh pr. modelId)
└── Grafik-preset toggles (dpr, shadows, fog, particle cap)
Game State & UI
├── GraphicsSettings.tsx
└── MineRunSlotState (udvidet med mobType, cosmetic data)
```

**Nøglebeslutninger:**
- Interagerbare objekter (klipper, kister, mobs) er **altid** 5–10 – uanset preset eller rum-størrelse.
- Kosmetiske klipper er **ekstra** og skaleres med preset + room size.
- Loot/drops ligger **kun** på interagerbare slots.
- Kosmetiske klipper kan aldrig blokere eller interagere.

---

## B: Fuldt Mini-Spec

### Fase 1 – Forberedelse (skal gøres først)

#### 1.1 Kosmetiske klipper

- Ny type i `src/types.ts`:

```ts
export type CosmeticRock = {
  id: string;
  modelId: 1 | 2 | 3;                    // dine 2–3 custom GLB'er
  position: { x: number; y: number; z: number };
  rotation: [number, number, number];
  scale: number;
  variant: string;                       // palet-farve
  isOnWall?: boolean;
};
```

Generering i `mineLayer.ts` (efter interagerbare slots):

- Brug deterministisk RNG; seed skal følge **designvalg 2A** (fx `runId`, `mineId`, `depth`, **grafik-preset**, evt. `slotIndex` / dedikeret under-seed — dokumentér én hash-strategi i implementerings-guiden).
- Antal: 15–30 (Performance), 40–80 (Balanced), 60–120 (Rich) + bonus fra room size.
- Non-blocking: afstand > 2.5 enheder til alle interagerbare slots.
- Fordeling: ~65 % gulv, ~35 % vægge (med 90° rotation).

#### 1.2 Grafik-presets

- Opret `src/gem/graphicsPresets.ts` med tre presets.
- Tilføj `GraphicsSettings.tsx` komponent + state (localStorage).
- Presets styrer kun: antal kosmetiske klipper, dpr, shadows, fog, particle count, LOD på kosmetik.

#### 1.3 Interagerbare objekter

- Fast regel: `minInteractive = 5`, `maxInteractive = 10`.
- Opdater `generateLayerState()` til at respektere dette loft.
- **Slot-type-RNG (designvalg 4):** Fuld RNG pr. felt med lavere vægt på kiste og mob end på sten; inden for sten lavere vægt på “gode” typer end almindelige. **Bonusetage (4a):** alle felter kan teoretisk blive kister — sjældent; mandatory-count kan være 0, så nedstigning er tilladt straks (se **Vedtagne designvalg**).

#### 1.4 Nye monstertyper

- Tilføj `export type MobType = 'goblin' | 'bat' | 'crystal_beast' | ...` i `types.ts`.
- Tilføj `mobType?: MobType` til `MineRunSlotState`.
- Ny funktion `rollMobType(depth, rng)` i `mining.ts`.
- Understøttelse af forskellige GLB-modeller via `mobModel?: string` i slot-data.

---

### Fase 2 – Rum-variation (templates + størrelse)

#### 2.1 Nye typer i `src/types.ts`

```ts
export type RoomTemplate = 'classic' | 'corridor' | 'island' | 'dogleg';
export type RoomSize = 'small' | 'medium' | 'large';

export interface CaveConfig {
  template: RoomTemplate;
  size: RoomSize;
  oreSlots: [number, number, number][];
  bounds: number;                    // nu dynamisk
  // ... eksisterende felter
}
```

#### 2.2 Generator-funktioner i `src/gem/mineLayer.ts`

- `getRoomTemplate(currentDepth: number, runId: string): RoomTemplate`
- `getRoomSize(currentDepth: number, runId: string): RoomSize`
- `generateCaveConfig(template: RoomTemplate, size: RoomSize): CaveConfig`

#### 2.3 Template-definitioner (eksempler)

- **classic:** dit nuværende layout (baseline).
- **corridor:** lang smal (ratio ~3:1 eller 4:1).
- **island:** central ø + circle-strafe muligheder.
- **dogleg:** L-form eller let knæk.

Hver template returnerer færdige `oreSlots` + justeret `bounds`.

#### 2.4 Integration

- Generér først de 5–10 interagerbare slots ud fra template.
- Derefter kosmetiske klipper (non-blocking + gulv/væg).
- Opdater `VoxelScene.tsx` til at bruge den nye bounds og template-data (kamera justeres automatisk).

---

### Fase 3 (valgfrit senere)

- Fuldt procedurale templates.
- Mikro-labyrint eller hub+sidegren.

---

## Performance & Balance-noter

- Interagerbare objekter påvirkes aldrig af grafik-preset.
- Kosmetiske klipper er altid InstancedMesh → billige selv ved 120 stk.
- **Nedstigning:** Uændret logik — **alle** mandatory slots (`rock` + `mob`) skal ryddes, uanset om der er 5 eller 10 felter (designvalg 3A). Ved **kun kister** (4a) er der ingen mandatory slots.

---

## Næste trin (anbefalet)

1. Implementér Fase 1 (kosmetik + presets + mob-typer).
2. Implementér Fase 2 (templates + størrelse).
3. Test med samme seed for reproducerbarhed.
