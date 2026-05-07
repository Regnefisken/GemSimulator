# Mine Layers — Implementeringsguide

**Status:** Teknisk spor til kode og tests  
**Sandhedsgrundlag:** [`mine-layers-depth-target-concept.md`](./mine-layers-depth-target-concept.md) (v2.1, beslutningslog **D1–D14**)

Denne fil må **ikke** modsige konceptdokumentet. Ved konflikt opdateres først beslutningsloggen der.

---

## 1. Ikke-forhandlingsbare regler (fra beslutningslog)

| ID | Kort |
|----|------|
| **D1** | Ingen tilbagevenden til tidligere lag i samme run — kassér `LayerState` ved nedstigning. |
| **D2** | Clear room før ned — alle obligatoriske slots `cleared`. |
| **D3** | Encounter/HP per slot ved lag-generering (ingen reroll ved målskift). |
| **D4–D6** | Auto-saml ground loot før fade; kister som i loggen; halvåbnet kræver afslutning. |
| **D7–D8** | Død = fuldt tab af run-inventory; safe ascend = behold alt til hub. |
| **D9** | Samme økonomi, separate drop-tabeller for mob vs. klippe (Fase 2). |
| **D10** | Crafting m.m.: `worldTier` fra meta; mine-dybde kun til mining i minen. |
| **D12** | Migration: global depth → alle kendte miners `unlockedDepths`. |
| **D13** | Fri målskift — ingen cooldown/pris. |
| **D14** | Fase 1 = rocks only; Fase 2 = mobs. |

---

## 2. Fase 1 — Datamodel og single-layer run-save

### 2.1 Typer

Introducér eller udvid typer i tråd med konceptets §4:

- `LayerState`, `SlotState` (mindst `id`, `type`, `maxHp`, `currentHp`, `cleared`, `position`; `encounter` når data findes).
- `RunState` med `currentDepth`, `mineId`, `runId`, **`layerStates` begrænset til aktuelt lag** under D1 (fx kun én nøgle ad gangen).
- `PermanentProgress` for hub/meta (inkl. `unlockedDepths` til **D10** og **D12**).

Placering: foretræk [`src/types.ts`](../src/types.ts) eller dedikeret `src/data/mineRunTypes.ts` hvis I vil holde `types.ts` slank — vælg én konvention og hold den.

### 2.2 Mine / area data

[`src/data/areas.ts`](../src/data/areas.ts): udvid med hvad der kræves for **per-mine** `depthMultiplier`, slot-templates og evt. garanterede encounters (koncept §8). Balance-funktioner som [`rockHpForDepth`](../src/gem/mining.ts) skal kaldes med **run-depth for den mine**, ikke global dybde.

### 2.3 Lag-generering (**D3**)

Én ren funktion eller service, fx `generateLayerState(args): LayerState`:

1. Afled seed fra run (`runId`, `mineId`, `currentDepth` — jf. koncept §6.3).
2. For hvert slot på layoutet: roll encounter, `maxHp`, `currentHp = maxHp`, `cleared = false`.
3. Returnér komplet `LayerState` — ingen senere reroll ved målskift.

### 2.4 Mining / hug (**D13**, persistent slots)

- Ved hit: opdater **kun** det primære måls `currentHp` (og evt. linked entities i Fase 2).
- Ved målskift: **ingen** ændring af andre slots’ HP.
- `currentDepth` / lag-index må **ikke** ændres ved målskift.

Refaktorér eksisterende mining-flow så den læser/skriver `SlotState` i stedet for ét globalt `rockHp` hvor det er relevant.

### 2.5 Clear-room gate (**D2**)

Før `transitionToNextLayer()`:

1. Definér `isSlotMandatory(slot): boolean` per type (data-drevet eller konstant tabel).
2. `canDescend = mandatorySlots.every(s => s.cleared)`.
3. Hvis `canDescend` er falsk: nedstignings-UI deaktiveret eller feedback til spiller.

### 2.6 Lag-overgang (**D1**, **D4–D6**)

Rækkefølge anbefalet:

1. Hvis ground loot findes: **auto-saml** til run-inventory (**D4**).
2. Validér kiste-regler (**D5**, **D6**) — blokér hvis uåbnet/halvåbnet ikke er lovligt.
3. Kassér nuværende `LayerState` fra `RunState` (eller overskriv nøgle).
4. Inkrementér `currentDepth` **én gang** pr. fuldført nedstigning.
5. Generér nyt `LayerState` for nyt dybdelevel via §2.3.
6. Fade / scene swap (koncept §11, §13 performance).

### 2.7 Run-afslutning (**D7**, **D8**)

- **Død:** nulstil run-inventory; behold `PermanentProgress`; evt. opdater meta (statistik).
- **Safe ascend:** overfør run-inventory til hub-state; nulstil `RunState` eller markér ingen aktiv run.

### 2.8 Migration (**D12**)

Ved første load efter release:

1. Læs legacy global depth (hvis felt findes).
2. For hver kendt `mineId` i data: sæt `unlockedDepths[mineId] = max(legacy, existing)`.
3. Persistér ny struktur; dokumentér i bruger-facing patchnotes.

---

## 3. Fase 2 — Mobs og D9

- Tilføj `EntityState` eller mob som `SlotState.type === 'mob'` med egen AI-hook.
- Drops: **separate** tabeller fra `rollMineDrop`, men samme inventory/guld-pipeline (**D9**).
- Primært mål + aggro/mob UI jf. koncept §5.1 og §11.

---

## 4. Crafting og `worldTier` (**D10**)

1. Implementér `computeWorldTier(permanentProgress): number` (fx `Math.max(...Object.values(unlockedDepths), 0)` eller aftalt formel).
2. Erstat kald der bruger global mining-depth til gem-generering/crafting med `worldTier` **hvor konceptet kræver meta-tier**.
3. Behold **run-depth** som argument til alt der kun skal skala i minen.

---

## 5. Achievements (**D11**)

- Primære triggers: per `mineId` + dybde.
- Sekundære: “any mine” optional — implementér som separat achievement-id for ikke at blande telemetri.

---

## 6. Test-checkliste (minimal)

- [ ] To slots på samme lag: skade på A, skift til B, tilbage til A — HP uændret (**persistent**).
- [ ] Målskift ændrer ikke `currentDepth`.
- [ ] Nedstigning blokeret indtil alle mandatory slots cleared (**D2**).
- [ ] Efter nedstigning findes ingen genindlæsning af forrige lags HP-state (**D1**).
- [ ] Ved fade: ground loot i inventory (**D4**); kiste-edge cases (**D5**, **D6**) respekteret.
- [ ] Migration: alle miner får legacy depth (**D12**).
- [ ] `worldTier` bruges i crafting-path som aftalt (**D10**).

---

## 7. Kendte kodeberøringer (startpunkt)

| Område | Fil (typisk) |
|--------|----------------|
| Mining balance | [`src/gem/mining.ts`](../src/gem/mining.ts) (`rockHpForDepth`, drops) |
| Areas | [`src/data/areas.ts`](../src/data/areas.ts) |
| Globale typer | [`src/types.ts`](../src/types.ts) (`Area`, voxel/mining-relateret) |
| Save/game state | *(locate)* persistenslag der i dag gemmer depth/inventory |

Gennemgå alle stier der tidligere har øget global dybde eller antaget ét aktivt klippe-HP (koncept §13 — “auto-INCREMENT_DEPTH”, kister).

---

## 8. Versionsreferencer

Når beslutningsloggen ændres i konceptfilen, opdatér **§1** i denne guide og versionsfelt i konceptets header, så implementering og QA altid deler samme **D***-referencer.
