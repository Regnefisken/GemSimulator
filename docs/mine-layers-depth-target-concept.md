# Mine Layers, Depth & Target Concept

**Persistent slots, parallelle mål, mobs & roguelike run-struktur**

**Version:** 2.1 (beslutningslog låst – 7. maj 2026)  
**Forfatter:** Regnefisken + Grok (v2-kerne); tidligere v1-udkast indarbejdet  
**Status:** Design-dokument – sandhedsgrundlag for `src/data/` og mining-systemet  

**Relation:** Beskriver *hvad* og *hvorfor*. Teknisk implementering: [`mine-layers-implementation-guide.md`](./mine-layers-implementation-guide.md).

---

## Beslutningslog (låst)

*Nedenstående beslutninger erstatter tidligere “åbne” formuleringer i §9–§14 og udgør ét sandhedsgrundlag indtil de eksplicit revurderes (ny række i loggen).*

| ID | Emne | Beslutning |
|----|------|------------|
| **D1** | Tilbagevenden til tidligere lag i samme run | **Nej.** Ved nedstigning kasseres forrige lags `LayerState`; genbesøg af lag understøttes ikke. |
| **D2** | Krav for nedstigning | **Clear room** — alle obligatoriske slots på laget skal være `cleared` før fade/nedstigning. |
| **D3** | Encounter-model (§9.2) | **Variant A:** roll pr. **slot** ved lag-generering (HP/type/encounter fastlægges når `LayerState` oprettes). |
| **D4** | Loot på jorden ved lag-skifte | **Auto-samlet** til run-inventory før fade (intet tab af droppede items). |
| **D5** | Uåbnede kister | **Blokér nedstigning** indtil åbnet; alternativt er kisten et slot der skal `cleares` under D2 (samme effekt). |
| **D6** | Halvåbnet kiste | **Tvungen afslutning** — spiller skal fuldføre åbning før lag-skifte tillades. |
| **D7** | Død i run | **Fuld tab** af run-inventory og run-bundne midler; `PermanentProgress` bevares uændret. |
| **D8** | Safe ascend | **Behold alt** run-inventory ved retur til hub. |
| **D9** | Mob-loot vs. mining-loot | **Fælles økonomi** (samme valuta/lager); **adskilte drop-tabeller** pr. kilde (mob vs. klippe). |
| **D10** | Crafting / gem-kontekst (§9.5) | **Adskilt:** brug meta-**`worldTier`** (fx afledt af `max` over `PermanentProgress.unlockedDepths`) til crafting/gem-kvalitet hvor det tidligere hang på global dybde; mine-dybde styrer **kun** mining-balance i minen. |
| **D11** | Achievements / telemetri (§9.6) | **Primært per mine**; **meta**-milepæle (“nå dybde *X* i *en* vilkårlig mine”) tilladt som supplement. |
| **D12** | Migration fra global `depth` | Eksisterende global dybde mappes til **alle** kendte miner som startværdi i `unlockedDepths` (dokumentér i patchnotes). |
| **D13** | Målskift-pris | **Ingen** cooldown eller ressource-pris. |
| **D14** | Scope-faser (§15) | **Fase 1:** persistente rock-/klippe-slots og lag-loop; **Fase 2:** mobs / `EntityState` og parallel combat-loot (jf. D9). |

---

## 1. Baggrund: dagens model og hvorfor vi ændrer

### 1.1 Typisk udgangspunkt i kode (før omlægning)

- Ét **globalt** `depth` styrer både balance (HP, drops) og **hvilket felt** i grotten der tælles som aktivt (fx `depth % antal_felter`).
- Der gemmes ofte **ét** `rockHp` for den aktuelle session — ikke konsekvent delvis skade **per synlig klippe**.
- Resultat: Spilleren ser flere klipper, men **kun én** føles som “rigtigt” mål ift. HP; resten kan føles som scenografi.

### 1.2 Retning i denne guide (v2 – kanonisk)

Vi skifter til **per-mine lag** og **persistent skade på laget**, kombineret med **roguelike run-loop**:

- **Lag = rum** med tydelig scene-overgang (fx mørk fade + ny Three.js-scene).
- **Alle slots på samme lag kan have aktiv progress samtidigt** — **ingen HP-reset** ved målskift.
- **Ét primært target** til UI og primær inputlinje; øvrige slots beholder `currentHp` og tilstand.
- **Run:** Nedstigning starter fra hub; dybde/state for run nulstilles ved død eller safe ascend; **permanent** progression (unlocks, story, max dybde pr. mine) lever separat.
- **Town hub** mellem runs: handel, upgrades, valg af mine/buffs — meta-loop.

**Historik (tidligere v1-idé):** En ældre iteration foreslog **reset af forladt felt** ved målskift (én “frisk” klippe ad gangen). Denne guide **erstatter** det med persistent lag-state; reset-loopen findes ikke længere som kerne-design.

---

## 2. Kerneaftaler (v2 – skal overholdes)

| Aftale | Konsekvens |
|--------|------------|
| **Persistent skade på laget** | Hvert slot har egen `currentHp` (og evt. encounter), gemt i `LayerState`, mens spilleren er på laget (og i run-save). Skift af primært mål **nulstiller ikke** andre felter. |
| **Ét primært mål ad gangen** | Ét mål styrer primær HP-bar, crosshair-fokus og hoved-input; undgå forvirring med flere “aktive” bars uden tydelig hierarki. |
| **Målskift øger ikke mine-dybde** | Dybde/lag-index ændres kun ved **lag-overgang** (eller tilsvarende eksplicit regel — se §9.3). |
| **Dybde hører til minen** | Progression og tabeller er **per `mineId`**, ikke globalt for hele spillet. |
| **Lagovergang = rumskifte** | Fade/ny scene så “dybere” er forståeligt; performance: undgå flash af gammel geometri (§12). |
| **Skeln mellem run og permanent state** | Run-specifik RNG/layout/inventory-regler vs. `PermanentProgress` der overlever hub (§6). |
| **Fri målskift (D13)** | Intet ressource- eller tidskrav ved skift af primært mål; ingen reroll af encounters ved skift (D3). |

---

## 3. Domænebegreber (ordbog)

Skil **fire** (eller fem med **run**) begreber tydeligt ad i design og kode:

| Begreb | Beskrivelse |
|--------|-------------|
| **Mine** | Lokation (`LocationId` / `Area` med `kind: 'mine'`). Har egen dybde-/unlock-progression i meta. |
| **Mine-dybde (lag-index)** | Ikke-negativt heltal: “hvor langt nede i *denne* skakt” *i den aktuelle run*. Styrer balance-tabeller, encounter-scripts, tåge, osv. **Stiger kun** ved **fuldført nedstigning** efter de gældende krav (§9.3). |
| **Lag (room / chamber)** | Den konkrete oplevelse på et givet lag-index: scenen efter fade. Alle slots på laget deler typisk **samme** sværhedsgrundlag fra dybde, med mindre I indfører undtagelser. |
| **Slot / mål** | Et interaktivt felt (klippe, mob, event, elevator, …). Har egen tilstand (`SlotState`). **Primært mål** = det valgte slot for hoved-feedback. |
| **Run** | Én dive fra hub til død eller safe ascend; driver run-specifik seed, layout og `RunState`. |

**Vigtigt:** Brug ikke ét ord “dybde” om både *målvalg* og *mine-lag* i samme sætning uden præfiks — reducerer bugs og UX-forvirring.

---

## 4. Data-model (TypeScript – målarkitektur)

```ts
// src/data/types.ts (udvidet)

interface LayerState {
  depth: number; // lag-index inden for den aktuelle mine (i denne run)
  mineId: string;
  slots: Record<string, SlotState>; // persistent mens på laget / i run-save
  activeEntities: EntityState[]; // mobs, NPCs, events der kan være lag-wide
  seed: number; // run-specifik seed til procedural generation
}

interface SlotState {
  id: string;
  type: 'rock' | 'vein' | 'crystal' | 'mob' | 'boss' | 'event' | 'elevator';
  maxHp: number;
  currentHp: number;
  cleared: boolean;
  encounter?: EncounterData;
  position: { x: number; y: number; z: number };
}

interface EntityState {
  id: string;
  type: 'mob' | 'npc' | 'boss';
  hp: number;
  maxHp: number;
  aiType: 'passive' | 'aggressive' | 'defensive';
  // drops, animation, ...
}

interface RunState {
  runId: string;
  mineId: string;
  currentDepth: number;
  // Under D1 holdes typisk kun aktuelt lag i hukommelse; ældre lag persisteres ikke.
  layerStates: Record<number, LayerState>;
  permanentProgress: PermanentProgress;
}

interface PermanentProgress {
  unlockedMines: string[];
  unlockedDepths: Record<string, number>; // mineId → max nået depth (meta)
  storyFlags: Record<string, boolean>;
  // achievements, bestiary, ...
}
```

---

## 5. Persistent slots og samtidige mål

- Ved målskift **gemmes** `currentHp` på alle slots (medmindre slot er clearet).
- Alle uløste slots kan vælges som **primært mål** (klik, piletaster, target-liste).
- **Primær HP-bar** viser kun valgte slot; **mini-bars/highlights** for andre skadede slots i viewport (diskret men læsbart).
- Crosshair: farve/ikon efter type (pickaxe/sword/event …).

### 5.1 Mobs som parallelle mål

- Mob som **egen slot** eller **koblet til rock-slot**.
- Samme combat-/mining-loop kan understøtte flere aktive trusler/mål; design må stadig være læsbart (fx aggro prioriteret i UI).
- Aggressive vs. passive mobs giver taktisk prioritering.

### 5.2 Lag-skifte og hvad der sker med gamle slots

**Besluttet (D1):** Ved nedstigning kasseres forrige lags `LayerState` fuldstændigt (ingen tilbagevenden). Nyt lag → nyt `LayerState` genereres/loades for run.

---

## 6. Roguelike run-struktur og depth-reset

- Start i **Town Hub** (meta-dybde 0 for “ikke i mine”).
- Valg af mine → ned lag for lag i **én run**.
- Slut: **død** (tab af run-inventory efter jeres regler) eller **safe ascend** (elevator/stige).

### 6.1 Permanent vs. run-specifikt

| Element | Permanent (mellem runs) | Run-specifikt |
|--------|-------------------------|----------------|
| Mine-unlocks & story-flags | Ja | Nej |
| Max nået depth pr. mine (meta) | Ja | Nej |
| Balance-tabeller & garantier | Fixed pr. dybde/mine | Nej |
| Layout, encounters, RNG | Garanterede events pr. dybde (data) | Øvrigt proceduralt (seed) |
| NPC/dialog-friskhed | Bedre/rigere med dybde over tid | Ny roll pr. run hvor relevant |
| Inventory & gems | Beholdes ved hub / **safe ascend** (D8) | **Fuld tab** ved død i run (D7) |
| Current depth i run | – | Nulstilles når run slutter |

### 6.2 Hub-forberedelse

Handel, reparation, lantern/pickaxe-upgrades, buffs, valg af mine og evt. difficulty modifier — **meta-progression-kernen**.

### 6.3 RNG + fast mix

- Seed: fx `hash(playerId, runNumber, depth, mineId)` (eller tilsvarende).
- `src/data/`-tabeller for garanterede hændelser og sjældne-gem-chancer pr. mine/dybde.
- Præcist layout, mob-placering og dialog kan være frisk pr. run hvor det giver gen-spilbarhed.

---

## 7. Spillerflow (konceptuelt)

### 7.1 På et lag

1. Spilleren ser **N** slots; flere kan være delvist skadede samtidigt.
2. **Ét** slot er primært mål (styring af hug/mining som i jeres nuværende loop).
3. Hug reducerer HP på **det primære** mål; andre slots kan påvirkes af egne regler (mobs, AoE — hvis I tilføjer det senere).
4. Målskift: **ingen reset** af forrige slot; kun skift af fokus i UI/input.
5. Når et slot **cleares**, marker det visuelt/logisk (depleted, dør, elevator aktiv, …).

### 7.2 Mellem lag (dybde stiger/sænkes i run)

1. Opfyld **krav** for overgang (§9.3).
2. Fade; kort input-lock om nødvendigt.
3. Nyt lag indlæses (seedet layout, lys/tåge, …).
4. `currentDepth` i `RunState` opdateres efter jeres regel (én gang pr. fuldført overgang).
5. Alle slots på **det nye** lag starter med frisk `LayerState` for det lag.

### 7.3 Mellem runs (hub)

Forberedelse, salg, valg af næste dive; permanent progression opdateres (fx `unlockedDepths`).

---

## 8. Per-mine dybde: gating og encounters

### 8.1 Gating af systemer

Eksempler:

- “**Jernkløften** dybde ≥ 8 i meta” låser smelteri-tier eller dialog.
- “**Kobbermine** dybde ≥ 3” aktiverer dynamit-tip i butikken.

Fordel: Krav er **læsbare** og **testbare** per mine.

### 8.2 Garanterede eller styrede encounters

- Datadrevet: fx `encounters: { mineId, minDepth, maxDepth?, spawn: ... }[]` eller script ved **lag-indtræden**.
- Knyt til **mine-dybde ved lag-start**, ikke til “hvilket felt huggede man sidst” — med mindre I bevidst kobler felt til story.

---

## 9. Vigtige designbeslutninger (med rationale)

### 9.1 Skal hug bruge mine-dybde eller felt-index til balance?

**Anbefaling:** **Mine-dybde (lag)** styrer `rockHpForDepth`, drop-rolls, essens-chancer osv. **Felt-index / slot-id** styrer **position**, mesh og evt. **lokale** modifiers — ikke systemisk ulbalance mellem to uløste klipper på samme lag uden grund.

### 9.2 Encounter-typer pr. slot og reroll (erstatter “målskift-reroll”)

**Besluttet (D3):** **Variant A — roll pr. slot ved lag-generering.** Hvert slot får egen encounter/HP/type når `LayerState` oprettes fra run-seed; målskift reroller ikke.

Øvrige modeller (reference, ikke aktive):

| Variant | Kommentar |
|---------|-----------|
| **B: Fælles pool pr. lag** | Ikke valgt — ensartet sværhed kan opnås senere via data, uden at ændre D3. |
| **C: Hybrid** | Ikke valgt — kan genbesøges hvis balance kræver fælles basistype + felt-multiplikator. |

**Anti-abuse:** Enhver fremtidig “re-roll” af slot skal være eksplicit og dyr — ikke sideeffekt af målskift (jf. D13).

### 9.3 Hvornår stiger/sænkes mine-dybde i run?

**Besluttet (D2):** **Clear room** — alle obligatoriske slots på laget skal være `cleared` før nedstigning.

Design skal definere **slot-typer der tæller med** i clear-check (fx rocks, obligatoriske events, elevator der først aktiveres efter clear, osv.).

### 9.4 Verdens-loot og kister ved lag-skifte

**Besluttet:** Se **D4–D6** i beslutningsloggen.

| Element | Regel |
|---------|--------|
| Loot på jorden | **Auto-samlet** til inventory før fade (D4). |
| Uåbnede kister | **Blokér nedstigning** indtil åbnet, eller kisten er et **slot** under clear-room (D5). |
| Halvåbnet kiste | **Tvungen afslutning** før lag-skifte (D6). |

### 9.5 Global vs. mine-lokal dybde i andre systemer (crafting m.m.)

**Besluttet (D10):** **Adskilt model.** Brug **`worldTier`** (meta, fx fra `max` af `unlockedDepths`) til crafting/gem-kvalitet og andre systemer der tidligere hang på én global dybde. **Mine-dybde** styrer **kun** mining-balance (HP, drops i minen) for den pågældende mine.

### 9.6 Achievements og telemetri

**Besluttet (D11):** **Primært per mine** (fx “nå dybde 50 i jernkløften”). **Meta**-milepæle som supplement er tilladt (fx “nå dybde 50 i *en* vilkårlig mine” eller samlet metrisk), så gamle badges kan mappes uden meningsændring.

---

## 10. Acceptkriterier (v2 – persistent lag)

1. På et lag med **≥2** uløste slots kan spilleren skifte primært mål uden at **andre** slots’ `currentHp` nulstilles.
2. Kun **ét** slot er primært mål ad gangen (HP-bar + hoved-feedback matcher valget).
3. Målskift **øger ikke** mine-dybde/lag-index.
4. Efter lag-overgang er **forrige lags** `LayerState` **kasseret** (D1); der gemmes ikke gameplay-state på tidligere lag i samme run.
5. Tutorial/tooltip første gang: *damage på laget persisterer — du kan splitte fokus mellem felter.*

*(Gamle v1-krav om “forladt felt vises fuldt hel” gælder **ikke** længere.)*

---

## 11. UI, feedback og polish

- Tydeligt “valgt felt” (outline/highlight + primær HP-bar).
- Lag-overgang: fade + `Lag X – [MineNavn]` + kort flavor.
- Mini-map eller **target-liste** der skelner **lag** vs. **valgt slot** (undgå `depth % slots`-forvirring fra gamle HUD’er).

---

## 12. Save/load og migration

### 12.1 Run-save

- Gem **`RunState`** med **aktuelle lags** fulde `LayerState` (alle slots’ `currentHp`, `cleared`, encounter-data) — ikke kun ét `rockHp`.
- Under **D1** er typisk kun **ét** lag-index relevant i `layerStates` ad gangen (evt. kun `currentDepth`-nøgle); undlad at gemme kasserede lag.
- `PermanentProgress` gemmes altid separat (meta).

### 12.2 Migration fra global `depth`

**Besluttet (D12):** Ved første load efter opdatering mappes legacy global dybde til **alle** kendte miner som startværdi i `unlockedDepths`. Dokumentér i patchnotes. Undgå at crafting/achievements stiller eksisterende spillere dårligere uden eksplicit kommunikation (evt. midlertidig kompatibilitets-tier).

---

## 13. Faldgruber og udfordringer

- **Reroll:** Fokus er flyttet fra målskift til layout/seed — pas på exploits ved regenerering.
- **UI:** Én primær bar; sekundære må ikke ligne “skjult primær”.
- **Kiste-flow og auto-`INCREMENT_DEPTH`:** Gennemgå alle stier i kode der tidligere øgede global depth; de skal respektere **per-mine** og **kun ved lag-overgang** (eller jeres eksplicitte regel).
- **Performance:** Fade + remount af scene — kort sort/loading, ingen geometri-flash; ambient-lyd passende ved skift.
- **Multiplayer (evt. senere):** Per-spiller lag-state; delt verden øger sync-kompleksitet — for single-player kan ignoreres.

---

## 14. Åbne spørgsmål

**Ingen åbne kernebeslutninger** — tidligere punkter er låst i beslutningsloggen (D1–D14). Eventuelle ændringer kræver ny log-række og versionsnote.

---

## 15. Implementerings-noter og næste skridt

**Besluttet scope (D14):**

1. **Fase 1:** Implementér `LayerState` / `SlotState` og persistente rock-slots (ingen mobs endnu); integration med [`src/data/areas.ts`](../src/data/areas.ts) og mining-logik (fx [`src/gem/mining.ts`](../src/gem/mining.ts)), samt typer i [`src/types.ts`](../src/types.ts) hvor relevant.
2. Lav en **persistent slot demo**-scene før fuld roguelike UI.
3. **Fase 2:** Tilføj mobs / `EntityState` og parallel combat; drop-tabeller jf. **D9**.
4. Profilér lag-skift (Three.js remount, fade).

Se trin-for-trin i [`mine-layers-implementation-guide.md`](./mine-layers-implementation-guide.md).

---

## 16. Opsummering

Systemet kombinerer:

- **Taktisk rummelighed:** Persistent skade på tværs af slots på samme lag.
- **Læsbar UI:** Ét primært mål ad gangen med tydelig hierarki.
- **Roguelike/meta:** Runs der nulstiller dybde og run-state; permanent progression i hub.
- **Designkraft:** Per-mine dybde til unlocks og encounters uden global “dybde-forurening”.
- **Implementerbarhed:** Eksplicit ordliste, data-model, migrations- og pitfall-liste.

Den tidligere **reset-af-forladt-felt**-model er **ikke** længere mål; behold kun referencer til den som historik (§1.2) hvis nogen læser gamle branches eller diskussioner.
