# GemSimulator – Mine System  
**Arkitektur, Koncept og Fuldt Implementerings-Spec**

**Version:** 2.0 (9. maj 2026)  
**Formål:** Give minen mere variation i rum-udformning og størrelse fra run til run og dybde til dybde, samtidig med at vi bevarer perfekt balance, performance og læsbarhed.

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
- Alt er **deterministisk** via samme `runId + depth`-seed som i dag.

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

- Brug deterministisk RNG (mulberry32(runId + depth + slotIndex)).
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
- Mandatory-clear-regel justeres til "ryd X af 10" ved højere antal slots.

---

## Næste trin (anbefalet)

1. Implementér Fase 1 (kosmetik + presets + mob-typer).
2. Implementér Fase 2 (templates + størrelse).
3. Test med samme seed for reproducerbarhed.
