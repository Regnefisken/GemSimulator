# Top 10 Forbedringsplan for GemSimulator (opdateret)

Denne version matcher den nuvaerende game-loop: `Kort -> Lokationer -> Mine/Smedje/Butik/Smykkevaerksted`,
med eksisterende progression (XP/level), achievements, save/load, inventory-kapacitet og dagligt essensmarked.

## Prioriteret Top 10 (naeste iteration)

### 1) Save-system v2 (backup/import/export)
- Basis save/load i localStorage findes allerede.
- Tilfoej manuel eksport/import af save-fil (JSON) + "download backup" knap i indstillinger.
- Tilfoej versions- og valideringsfeedback ved import (forkert format, gammel version, succes-toast).

### 2) Balancing pass for oekonomi og progression
- Fine-tun priser, XP-gevinster og unlock-krav pa tvrs af mineomraader, butik, smedje og smykker.
- Lav et tydeligt "midgame"-tempo mellem level 8-35, sa spilleren konstant har meningsfulde maal.
- Dokumenter baseline-tal i en separat balance-matrix.

### 3) Mine-loop + mine-scene: samlet variation og feedback
- Udvid rock-typer og mine-events (fx haard sten, rig aaere, "kritisk fund") og koble dem til tydelige visuelle cues.
- Differentier drops tydeligere pr. omraade/metalpulje for bedre lokationsidentitet, understottet af unikke lys/materiale-profiler pr. mine.
- Tilfoej tydelig feedback ved naesten-brudt sten og "kritisk slag" via korte animationer, VFX og klar hit-respons.

### 4) Smedjen: dybere materialeflow
- Udbyg sammenhaengen mellem Repair, Smelter, Alloy og GemCrafter med tydelig "naeste bedste handling".
- Overvej batch-handlinger (fx smelt X gange) for mindre klik-friktion.
- Vis samlet input/output-prognose foer crafting/smeltning.

### 5) Smykkevaerksted: recipe depth og rewards
- Tilfoej flere recipes med nichekrav (renhed, magi, specifikke metaller/essenser).
- Introducer "set bonus"-taenkning for spillere, der samler bestemte smykketyper.
- Udvid salgsvalg (instant salg vs. hoejere risiko/gevinst over tid).

### 6) UI/UX for overblik pa mobil og desktop
- Giv spilleren bedre statuskort for kapacitet (gems/materialer/tools) og flaskehalse.
- Forbedr tab-overgange og mikrofeedback, sa det er tydeligt hvad der opdateres efter en handling.
- Saml "hjaelp/ordbog" for centrale begreber (renhed, essens, omdoemme, rarity-bonus).

### 7) Visuel polish af 3D-view og mine-scene (integreret i punkt 3)
- Leveres sammen med punkt 3 som en samlet mine-oplevelse frem for et separat spor.
- Fokus: performance-venlige forbedringer af lys, post-processing, materials og rarity-laesbarhed.
- Overgangsanimationer prioriteres, hvor de styrker feedback for mining-events og loot.

### 8) Audio pass + indstillinger
- Udvid variation i mining/smedje/salg lyde for at undgaa repetition.
- Tilfoej volumekontrol (master/sfx/musik) i settings.
- Knyt vigtige game-events til tydelige lydsignaler (unlock, achievement, inventory-fuld).

### 9) Achievements 2.0 + meta-maal
- Achievement-systemet findes allerede; udvid med "milestones" for lokationer, crafting og salg.
- Tilfoej kategori-visning med progress-bars og naeste maalsaetning.
- Overvej "seasonal challenge"-struktur uden at bryde core-loop.

### 10) Teknisk oprydning og robusthed
- Fjern duplikerede filstier/artefakter og konsolider komponentstruktur.
- Udvid tests for reducer-logik og migrationer.
- Etabler mini-checkliste for releases (save-migration, performance, UI-regression).

## Anbefalet implementeringsraekkefolge
1. Save v2 + balancing (punkt 1-2)  
2. Core-loop dybde (punkt 3-5, inkl. visuel mine-polish fra punkt 7)  
3. Polish-lag (punkt 6, 8-9)  
4. Teknisk haerdning (punkt 10)