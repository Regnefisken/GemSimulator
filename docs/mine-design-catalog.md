# Mine-design: idé-katalog

Et samlet katalog over retninger du kan tage minen i — fra små justeringer til større omlægninger. Målet er at give dig **konkrete billeder og kompromiser**, så du kan vælge hvad der passer til spillet og din tid.

---

## 1. Designprincipper (vælg 2–3 som “nordstjerne”)

| Princip | Kort betydning |
|--------|----------------|
| **Læsbarhed** | Spilleren skal altid forstå mål: hvad skal knuses, hvordan kommer man videre. |
| **Spænding** | Uforudsigelighed: hvad gemmer sig om hjørnet / bag næste væg. |
| **Rytme** | Veksling mellem korte intense lag og lidt luft (loot, orientering). |
| **Fairness** | Overraskelser må ikke føles billige (instant off-screen hits uden advarsel). |
| **Skalerbar performance** | Flere objekter og større rum skal kunne drosles ned på svage maskiner. |

---

## 2. Rumformer — kreativt katalog

Her er **rumtyper** som moduler eller “biomes” pr. dybde, ikke nødvendigvis alt på én gang.

### 2.1 Klassisk kammer (baseline)

- Ét åbent rum, klipper som “øer” på gulvet — tæt på det du har i dag.
- **Fordele:** Simpelt at balancere, god til tutorial og første mine.
- **Ulempe:** Lav udforskningsfølelse; alt synligt forfra.

### 2.2 Smalt kammer (“korridor-kammer”)

- Høj **længde/bredde-ratio** (fx 3:1 eller 4:1): lang gang med loft, smal gulv-stribe.
- Klipper placeret **i rækker** eller skiftevis venstre/højre, så man **skubber** spilleren frem som i en skyttegrav.
- **Twist:** Midt i rummet en **sænkning** eller søjle så man mister linje til udgangen i et sekund.

### 2.3 Aflangt rum med “ø”

- Langt rum, men med en **central blok** (massiv sten, stalagmit-søjle) der bryder synslinjen.
- Monster kan **circle-strafe** om øen; spilleren kan bruge den som cover.
- Passer godt til **5–8 klipper** fordelt langs vægge + bag ø.

### 2.4 L-form, U-form, dogleg

- To eller tre “armer” mødes i et knækpunkt.
- **Gameplay:** Én arm har klipper, en anden **mørkere** eller med **fog** så man vælger rækkefølge.
- **Overraskelse:** Kort arm med kiste eller mob-spawn **først synlig når man drejer**.

### 2.5 Dobbelt niveau (lavt platform)

- Lille **forhøjning** (50–80 cm spil-højde) eller lav bro — ikke fuld Metroid-vault, men nok til at **skjule** noget bag kanten.
- Kræver lidt mere kamera/klip-detektion, men giver “jeg opdagede noget” uden fuld labyrint.

### 2.6 “Snørklet” uden at være åben labyrint

- **Serpentin:** S-formet gulv i stort kammer (vægge følger én kurve), ikke mange døde ender.
- Stadig ét “lag” logisk, men **linje-of-sight** brydes 2–3 gange under gennemløb.
- Lettere at bygge end grid-labyrint; mindre risiko for at spilleren går tabt.

### 2.7 Mikro-labyrint (bevidst kompromis)

- **Lille** grid (fx 3×3 eller 4×3 “celler”) hvor **vægge er lave** (under skulderhøjde) eller **gitter** — du ser **silhuetter** og bevægelse, men ikke HP-bar på alt.
- **Regel:** Maks **1–2** aggressive mobs ad gangen i labyrinten, resten bag låste “gates” (åbner når klippe X knuses).
- **Overraskelse:** Lyd + fodtrin + minimap-ping i stedet for ren stealth-one-shot.

### 2.8 Hub + sidegren (semi-åben)

- Hovedrum med **2–3 låste porte**; hver port fører til **mini-sidekammer** (1–2 klipper eller én elite-mob).
- Spilleren **vælger rækkefølge**; alt hovedrum kan stadig skimtes — mindre klaustrofobi end fuld labyrint.

### 2.9 “Hul i gulvet” / vertikal vignet

- Ikke nyt level — men **stort hul** med lys fra dybet (pure visuals + evt. loot-drop animation ned).
- Psykologisk dybde uden at bygge flere meshes end et par ekstra plan.

### 2.10 Tematiske rum pr. dybde (smagsvariant)

- **Dybde 0–2:** Brede, trygge kamre (læring).
- **Dybde 3–6:** Korridorer og doglegs.
- **Dybde 7+:** Snørkler, lavere tåge-nær, højere mob-chance i blind vinkel.

---

## 3. “Jeg kan se alt foran mig” — hvad kan man gøre?

Du behøver ikke **fuld** skjulthed for at få overraskelser.

| Idé | Effekt | Kompleksitet |
|-----|--------|--------------|
| **Lavere tåge-nær / højere kontrast** | Ting i periferien og i baghjørner falder ud; “noget bevæger sig derovre”. | Lav–mellem |
| **Søjler, stalagmit-clusters, væg-indryk** | Bryder linje mellem spawn og spiller. | Mellem |
| **Mob spawn bag cover** efter klippe ryddes | Narrativt fair hvis der er lyd/advarsels-frame. | Mellem |
| **Directional lyd** (hvis I får audio på plads) | Advarsel uden syn. | Afhænger af audio-stack |
| **Minimap kun for udforskede tiles** | Roguelike-følelse uden at skjule 3D-scenen helt. | Mellem–høj |
| **Kort “blind” tunnel** mellem to kamre** | To logiske “rum” i ét lag (fade eller port). | Høj (mere som to sceners sammensmeltning) |

**Kompromis der ofte virker:** Bevar **ét kammer** som gameplay-enhed, men indfør **1–2 synsblokke** + **bedre brug af lyd og UI-ping** til mobs.

---

## 4. Flere klipper (fx 5 → 10): system og oplevelse

### 4.1 Hvad der typisk skal følge med

- **Mandatory clears:** I dag skal alt obligatorisk væk for at gå ned — flere klipper = længere lag **med mindre** du justerer kriteriet (fx “ryd 7 af 10” eller “ryd hovedåre + 2 sidefelter”).
- **UI:** Valg af mål, minimap, eller tydelig markering af “primær” vs “valgfri” klipper.
- **Varighed & balance:** HP og mob-rate pr. dybde skal måske **ned** lidt hvis der er dobbelt så mange mål, ellers føles laget som slog.

### 4.2 Kan systemet “bære” 10?

- **Logik:** Ofte ja — det er primært arrays/lister og loops.
- **3D:** 10 fulde klippe-meshes + partikler + skygger = **GPU**-tungt før det er CPU-tungt.
- **Anbefaling:** Tænk **10 som “high” preset** med grafik-drosling (se §6), og **6–7 som default** hvis du vil være konservativ.

### 4.3 Hybrid: “10 interessepunkter, 5 aktive klipper”

- Visuelle småsten / inaktive props for fyld, men kun **5** med HP — resten er kosmetik eller én-slags “grus” der knuses i ét hug.
- Giver **fyld** uden at fordoble kamp-tid.

---

## 5. Grafik- og performance-pakke (som del af samme design)

En **Graphics / Mine quality**-menu gør det troværdigt at skrue op på indhold uden at straffe alle spillere.

### 5.1 Forslag til presets

| Preset | Klipper (max) | Skygger | Partikler | Tåge-kvalitet | Cave mesh |
|--------|----------------|---------|-----------|----------------|-----------|
| **Performance** | 6 | Fra / meget lav | Minimal | Simpel, kort draw distance | Lavere subdiv / færre displacement samples |
| **Balanced** | 8 | Kort distance, lav opløsning | Medium | Standard | Som i dag |
| **Rich** | 10 | På | Fuld | Dybere tåge-animationer | Højere detalje |

### 5.2 Konkrete skrue-tråde (Three.js / R3F-venligt)

- **`dpr`:** `[1, 1.5]` vs `[1, 2]` — stor gevinst på mobil/svage GPU’er.
- **Skygger:** Slå `castShadow` / `receiveShadow` fra på sekundære meshes (stalaktitter, småsten).
- **Antal lys:** Færre point lights eller lavere `intensity` + kortere `distance`.
- **Geometri:** Færre segmenter på displacements-planes; simplere klippe-LOD (lav poly på afstand).
- **Instancing:** Hvis mange identiske småting (grus, krystaller), **instancedMesh** frem for N separate meshes.

### 5.3 “Quality budget” knyttet til rum-type

- Smalt snørklet rum: **færre** stalaktitter automatisk.
- Stort kammer: cap på samtidige partikel-bursts.

---

## 6. Forslag til udrulning i faser

**Fase A — Lav risiko, høj læsbarhed**

- Øg antal slots moderat (fx **6–7**) + justér mandatory-regel eller HP.
- Tilføj **én** synsblok (stor søjle / midterø) i eksisterende kammer.
- Grafik: **dpr** + skygge-toggle.

**Fase B — Rumvariation**

- 2–3 **procedurale skabeloner** (bred, lang, L-form) valgt pr. dybde eller pr. `hash(runId, depth)`.
- `oreSlots` genereres eller skaleres ud fra skabelon.

**Fase C — Udforskning**

- Mikro-labyrint eller hub+sidegren + delvist skjult minimap.
- Mobs med spawn-regler der respekterer fair-warning.

---

## 7. Risici og beslutninger du bør skrive ned én gang

1. **Er et “lag” stadig ét rum?** Hvis ja, er “labyrint” begrænset af den metafor — det er ok; bare navngiv det ærligt i design (snørklet kammer vs. ægte grid).
2. **Klippe vs mob tid:** Flere felter uden mob-cap kan føles som slog; `mobSlotChanceForDepth`-lignende knapper skal måske **ned** når slot-count går op.
3. **Kamera:** Smalle rum kræver ofte **nærmere min distance** eller **lidt højere FOV** for ikke at klaustrofobere.
4. **Mobile / browser:** Hvis målgruppen inkluderer svage enheder, er performance-preset **must**, ikke nice-to-have.

---

## 8. Hurtig “vælg din pakke”-matrix

| Pakke | Rum | Klipper | Udforskning | Teknik |
|-------|-----|---------|-------------|--------|
| **A: Poleret kammer** | Ét, lidt større + søjle | 6–8 | Lav | Lav |
| **B: Korridor-minen** | Aflange lag | 7–10 | Mellem | Mellem |
| **C: Rogue-lite vibe** | L / snørklet | 8–10 + valgfrie | Høj | Høj + minimap |
| **D: Safe scale-up** | Som i dag | 10 med hybrid props | Lav | Mellem + grafik-menu |

---

*Fil oprettet som idé-katalog — ingen binding til nuværende implementation; brug det som udgangspunkt til prioritering og senere tasks.*
