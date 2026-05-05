# Visuelle forbedringsideer (opdateret til aktuel version)

Denne plan tager hoejde for den nuvaerende app med:
- bundnavigation (`Kort`, `Lager`, `Butik`)
- lokationer pa kortet (miner, smedje, butik, smykkevaerksted)
- nuvaerende render-presets i settings

Maal: tydelig visuel forbedring uden at skade laesbarhed eller performance.

## Top 10 visuelle forbedringer

1. **Lokationsspecifik stemning**
   - Giv hver mine et eget visuelt "tema" (farve, taethed af fog, accent-lys), sa progression foeles fysisk.

2. **Bedre mined feedback**
   - Udbyg visuel respons ved slag: tydeligere impact, små shards, bedre timing mellem hit og tal/feedback.

3. **Rarity-signaturer**
   - Definer faste visuelle signaturer for uncommon/rare/legendary fund, sa spilleren straks kan aflæse vaerdi.

4. **Konsistent glow-system**
   - Saml glow-regler for gems, UI highlights og toasts, sa "vigtige events" ser ens ud pa tvaers af skærme.

5. **UI-kontrast og hierarchy pass**
   - Forbedr kontrast mellem baggrunde, labels og CTA-knapper i shop/inventory/workshop for hurtigere scanning.

6. **Map polish**
   - Tilfoej diskrete transitions og hover/active-states pa lokationskort, sa kortet foeles levende uden at stoeje.

7. **Smedje- og workshop-identity**
   - Giv smithy og jewelry hver deres visuelle signatur (farveprofil, ikoner, panelstil), sa flows er lettere at genkende.

8. **Preview-kvalitet**
   - Finjuster standardvinkler, lys og baggrund i item/gem previews, sa detaljer fremhaeves ensartet.

9. **Belonningsmomenter**
   - Giv korte "hero moments" ved level up, nye lokationer og achievements med kontrollerede effekter.

10. **Performance-fokuseret polish checkliste**
    - For hver ny effekt: test low/medium/high preset, mobil viewport og fuld lager-scene foer release.

## Hurtig prioritering (impact -> effort)
1. Mined feedback + rarity-signaturer (2, 3)  
2. UI-hierarchy + map polish (5, 6)  
3. Lokationsstemning + reward moments (1, 9)  
4. Konsolidering og QA (4, 7, 8, 10)