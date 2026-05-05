# Analyse og Anbefalinger til Ædelstens-Systemet i GemSimulator

## Indledning

Dit spil startede som en ædelstens-simulator med procedural generation af et stort antal forskellige gems. Du er meget tilfreds med den konsistente 2D- og 3D-gengivelse samt ligheden mellem visningstyper og størrelser. Dog føles systemet nu lidt fastlåst med for få variationer i farver, effekter og mønstre. Dette dokument giver et totalt overblik over det nuværende system baseret på kodeanalysen i `src/gem/generate.ts` og data-filerne i `src/data/`, samt konkrete forslag til at udvide det til et system med en følelse af uendeligt flere spændende, eksotiske ædelsten – inklusive blandinger og spor af metaller.

## Nuværende System – Overblik

### Kernkomponenter og variationer:
- **Paletter (farver)**: 14 faste paletter (f.eks. Smaragd, Rubin, Safir, Ametyst, Diamant osv.). Hver palette definerer 5 farver via chars: `O` (outer), `D` (dark), `G` (gem base), `L` (light), `W` (white/sparkle).
- **Geometriske former / silhuetter (templates)**: 23 forskellige skabeloner (Rektangulær, Dråbeformet, Brilliant, Oval, Hjerte, Princess, Emerald osv.). Hver er en grid af chars, der danner silhuetten.
- **Metaller og inklusioner**: 8 metaller (Tin, Kobber, Jern, Bronze, Sølv, Guld, Mithril, Runestål). Op til 3 inklusioner (chars `1`, `2`, `3`) + speciel Guld (`X`). Vægtede rolls baseret på area-rarity.
- **Magiske effekter**: 9 properties (Ild, Frost, Lyn, Natur, Giftig, Helbredende, Sjælebindende, Tidskontrollerende, Radioaktiv) med rarity (common/uncommon/rare/legendary). 0-3 per gem (61.5% 0, 30% 1, 7% 2, 1.5% 3).
- **Andre parametre**:
  - Purity: 1-4 (påvirker flawless-mutation og værdi).
  - GodTier: ~12% chance (ekstra mutation + højere gold-chance).
  - Karat: Kun ved guld-inklusioner (9-24).
  - Mirror: 48% chance horisontal spejling.

### Hvordan generationen virker (RNG-baseret):
1. Vælg palette + template.
2. Mutate grid: sparkles (`W`), facets (`L`/`D` swaps).
3. Tilføj metal/guld-inklusioner (clumps).
4. Ekstra mutate ved høj purity/GodTier.
5. Optional mirror.
6. Tilføj magic properties.

**Hvor mange forskellige ædelsten kan genereres?**
- Teoretisk: 23 former × 14 paletter × 4 purity × (kombinationer af 8 metaller op til 3) × (kombinationer af 9 magic op til 3) × procedural mutations (sparkle/facet counts, positions) × mirror = **tusinder til millioner unikke gems**.
- I praksis: Variationerne er begrænset visuelt, fordi mutationerne kun ændrer få chars på en foruddefineret måde. Mange gems ser ens ud trods forskellige parametre – her ligger problemet med "for få variationer".

## Styrker i Systemet
- Fantastisk konsistens mellem 2D (grid-baseret canvas) og 3D-gengivelse.
- God RNG-følelse med rarity, value-beregning og GodTier.
- Enkel og effektiv kode.

## Udviklingsforslag – Konkrete Idéer til Mere Variation
Målet: Skab en følelse af **uendeligt flere eksotiske ædelsten** uden at bryde 2D/3D-konsistens. Fokus på farver, effekter, mønstre, blandinger og metaller.

### 1. Udvid Paletter og Farver (høj prioritet)
- Tilføj 20-30 nye paletter: neon, pastel, gradient (bi-color), iriserende (farveskift), metallic sheens.
- Understøt dynamiske colorMaps med flere chars (f.eks. `P` for pattern, `I` for inclusion).
- Eksempel: `BiColorGradient` palette med to farver der blander sig.

### 2. Flere Effekter og Mønstre (avancerede mutations)
- Udvid `mutateGemData` med nye typer:
  - **Bånd/mønstre**: Vandrette/vertikale striber, speckles, veining.
  - **Lys-effekter**: Asterism (stjerne), chatoyancy (katteøje), opalescens.
  - **Inklusioner**: Krystal-frakturer, bobler, feather-inclusions.
- Nye chars i grids: `S` (star), `V` (vein), `C` (crack).
- Procedural patterns baseret på noise (Perlin/Simplex) for organisk look.

### 3. Eksotiske Metal-Blandinger og Spor
- Udvid METALS til 15+ (Platin, Titanium, Orichalcum, Obsidian osv.).
- Layered metals: Flere typer i samme gem (f.eks. guld + sølv-veins).
- Avancerede inklusioner: Metalliske årer der følger silhuetten, rust-spots, rune-etchings.
- Speciel `addExoticMetalInclusions` funktion der kombinerer flere slots.

### 4. Eksotiske Blandinger og Hybrid-Gems
- Bi-/multi-color gems: Vælg 2-3 paletter og blend via grid.
- Crystal-growth: Indre krystaller i anden farve.
- Phantom/ghost inclusions: Semi-transparente lag.
- Rarity tiers der låser op for "forbudte" kombinationer (f.eks. Rainbow + legendary magic).

### 5. Andre Forbedringer for Følelse af Mangfoldighed
- **Navngivning**: Procedural navne som "Flammerubin med Guldåre" baseret på egenskaber.
- **Visual enhancements**: Flere chars i templates for dybde (f.eks. facet-refleksioner).
- **Balancering**: Rarity-system der gør eksotiske sjældne, men mulige.
- **Performance**: Cache ofte brugte grids eller brug WebGL for mere komplekse 3D.

### Prioriteret Implementeringsplan (high-level, ingen kodeændringer her)
1. Udvid data-filer (palettes, metals, magic, templates).
2. Opdater mutate-funktioner med nye effekter.
3. Tilføj blending-logik i generate.ts.
4. Test 2D/3D-konsistens (din styrke).
5. Tilføj achievements for sjældne hybrider.

Med disse ændringer vil spillet føles som en uendelig skattekiste af unikke, eksotiske ædelsten – præcis som du ønskede fra starten.

**Fil oprettet: 05. maj 2026**

---

*Kun placeret som anmodet – ingen ændringer i spillet.*