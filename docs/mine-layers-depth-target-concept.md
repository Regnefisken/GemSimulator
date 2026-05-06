# Konceptuel guide: Mine-lag, per-minedybde og målvalg

**Status:** Koncept / designgrundlag (ikke implementeringsplan)  
**Formål:** Samle de aftalte designprincipper for et nyt minesystem: **lag med oplevet dybde**, **dybde per mine**, **frit skift mellem uløste mål** med **reset af forladt felt**, og brug af dybde til **gating** og **forudsigelige encounters**.  
**Relation til eksisterende dokumentation:** Den nuværende tekniske minespor findes i [`mining-implementation-plan-v1.md`](./mining-implementation-plan-v1.md). Denne fil beskriver *hvad* og *hvorfor* på konceptniveau; implementering kan ske i senere faser og bør krydsreferere hertil.

---

## 1. Baggrund og problemstilling

### 1.1 Dagens model (kort)

- Ét globalt `depth` styrer både balance (HP, drops) og **hvilket felt** i grotten der tælles som aktivt (`depth % antal_felter`).
- Der gemmes **ét** `rockHp` for den aktuelle session — ikke delvis skade per synlig klippe.
- Resultat: Spilleren oplever flere klipper i scenen, men **kun én** er “rigtig” mål ad gangen; de andre er primært scenografi i forhold til HP.

### 1.2 Ønsket retning

1. **Oplevet progression:** Når man går videre i den *samme* mine, skal det føles som et **nyt rum / friskt lag** (fx mørk fade + overgang), ikke som en abstrakt tæller der roterer prikker.
2. **Én kamp ad gangen, men valgfrihed:** Behold **ét aktivt mål** og **ét HP-bar-lignende forløb** ad gangen — men tillad **frit skift** mellem **uløste** klipper **på samme lag**.
3. **Aftalt tradeoff:** Når spilleren vælger et **nyt** mål, **resetter** det forladte felt til “frisk” (100 % oplevelse / fuld HP for den klippe hvis man vender tilbage). Ingen stillestående halvskadede klipper i baggrunden.
4. **Dybde hører til minen:** Kobbermine og jernkløft (osv.) har **hver sin** dybdeprogression.
5. **Designkraft:** Dybde skal kunne **låse systemer op** og placere **garanterede eller styrede encounters** på bestemte dybder **i den pågældende mine** uden at andre miner forstyrrer tælleren.

---

## 2. Kerneaftaler (skal overholdes)

| Aftale | Konsekvens |
|--------|------------|
| **Frit målskift** mellem uløste klipper på samme lag | UI og input skal kunne vælge felt/mesh uden at øge mine-dybde. |
| **Reset af forladt felt** | Delvis skade på et mål **persistes ikke**, når målet ikke længere er valgt. Visuelt og logisk: klippen er “hel” igen, indtil den vælges. |
| **Ét logisk mål ad gangen** | Ét sæt encounter-regler pr. hug (HP, event-type, mm.) for det **valgte** mål — ingen parallel `rockHp` for flere klipper uden at udvide modellen. |
| **Dybde per mine** | `depth` (eller tilsvarende) er **nøglelagret pr. mine-id**, ikke globalt for hele spillet. |
| **Lagovergang som rumskifte** | Når mine-**dybde** (lag-index) stiger, skal spilleren **opleve** et nyt lag (fade, evt. ny seed/variant), så “dybere ned” er forståeligt. |

---

## 3. Domænebegreber (ordbog)

Anbefalet at skille **fire** begreber tydeligt ad i design og kode:

| Begreb | Beskrivelse |
|--------|-------------|
| **Mine** | En lokation (`LocationId` / `Area` med `kind: 'mine'`). Har egen dybdeprogression. |
| **Mine-dybde (lag-index)** | Et ikke-negativt heltal: “hvor langt nede i *denne* skakt”. Styrer balance-tabeller, encounter-scripts, tåge, osv. **Stiger kun**, når spilleren **fuldfører overgang til næste lag** efter de gældende krav.** |
| **Lag (room / chamber)** | Den konkrete **oplevelse** på et givet mine-dybde: scenen efter fade — samme mine, men “friskt rum”. Alle malm-felter på laget spiller under **samme** mine-dybde mht. drops/HP-formler, med mindre I bevidst indfører undtagelser. |
| **Mål (target)** | Hvilken **synlig klippe/felt-index** på det aktuelle lag der modtager hug og viser “aktiv” feedback. Skiftes uden at ændre mine-dybde. |

**Vigtigt:** Undgå at bruge ét ord “dybde” om både *målvalg* og *mine-lag* i samme sætning uden præfiks — det reducerer bugs og UX-forvirring.

---

## 4. Spillerflow (konceptuelt)

### 4.1 På et lag

1. Spilleren ser et kammer med **N** malm-noder (felter), der **alle** kan være uløste samtidig.
2. Ét felt er **valgt mål** (crosshair / klik / tab til næste — implementation åben).
3. Hug reducerer HP for **det** mål. HUD afspejler det valgte encounter.
4. Spilleren kan **skifte mål** til en anden uløst klippe:
   - Det **forrige** mål **resetter** (fuld HP / “frisk” klippe).
   - Det **nye** mål får et **nyt** encounter (HP, type, mm.) — se designbeslutning §6.2.
5. Når et mål **knuses**, markeres feltet som **løst** (depleted / visuelt hul). Spilleren kan vælge et andet uløst mål uden lag-skifte.

### 4.2 Mellem lag (mine-dybde stiger)

1. Spilleren opfylder **krav** for at gå dybere (se §7).
2. **Mørk fade** (eller tilsvarende) afspilles; input kan være kortvarigt låst.
3. **Nyt lag** indlæses: evt. ny procedural seed, justeret tåge/lys, tomt kammer eller foruddefineret layout — aftalt “frisk rum”-fornemmelse.
4. `mineDepth[mineId]` (eller tilsvarende) **inkrementeres én gang** pr. fuldført nedstigning.
5. Alle felter på det nye lag er igen **uløste**; målvalg starter forfra.

---

## 5. Per-minedybde: gating og encounters

### 5.1 Gating af systemer

Eksempler på hvad mine-lokal dybde muliggør:

- “**Jernkløften dybde ≥ 8** låser smelteri-opgradering / essensmarkeds-tier / dialog.”
- “**Kobbermine dybde ≥ 3** aktiverer dynamit-tip i butikken.”

Fordel: Krav er **læsbare** og **testbare** (`assert depth >= n` for mine X). Ingen sideeffekt fra at have gruset i en anden mine.

### 5.2 Garanterede eller styrede encounters

- Datadrevet: `encounters: { mineId, minDepth, maxDepth?, spawn: ... }[]` eller script der kører ved **lag-indtræden**.
- Eksempler: garanteret kiste på dybde 10 i guldgrotten; “hard rock”-uge på dybde 15–20; tutorial-ven på dybde 0–1 kun i kobbermine.

**Bemærk:** Encounters knyttes til **mine-dybde ved lag-start**, ikke til “hvilket felt-index” spilleren huggede sidst — med mindre I eksplicit kobler felt til story (sjældent nødvendigt).

---

## 6. Vigtige designbeslutninger (med rationale)

### 6.1 Skal hug bruge `mineDepth` eller felt-index til balance?

**Anbefaling:** **Mine-dybde** (lag) styrer `rockHpForDepth`, `rollMineDrop`, essens-chancer, osv. **Felt-index** styrer kun **position** (burst, loot spawn) og **hvilket mesh** der er interaktivt.

**Rationale:** Ellers bliver felt 0 og felt 3 på samme lag ubalanceret uden grund. Spilleren skal opleve laget som én sværhedsgrad.

### 6.2 Hvad sker der ved målskift — nyt `RockEvent` eller samme?

**Beslutning der skal træffes eksplicit:**

| Variant | Fordele | Ulemper |
|---------|---------|---------|
| **A: Nyt roll pr. mål** (hver gang man vælger et felt) | Variation, “jagt på rig klippe” som meta. | Kan føles som save-scumming hvis spilleren spam-skifter for at rerolle. |
| **B: Fast encounter pr. lag** (samme pool/type for alle felter på laget) | Forudsigeligt, fair. | Mindre variation på samme lag. |
| **C: Hybrid** (fx type fast per lag, HP-multiplikator per felt) | Balance + lidt spice. | Mere kompleks dokumentation. |

**Aftalen om reset** påvirker ikke direkte A/B/C — men **A** kræver evt. **anti-abuse** (cooldown på skift, eller max N rerolls pr. lag).

### 6.3 Hvornår stiger mine-dybde?

Eksempler (vælg én primær model eller kombiner tydeligt):

- **Alle felter skal knuses** før nedstigning (klassiske “clear the room”).
- **Valgfri nedstigning** efter minimumskrav (fx “mindst én klippe knust” + knap “Gå dybere”).
- **Blandet:** boss-felt eller nøgle på laget skal cleares før fade er aktiv.

**Rationale for at beslutte tidligt:** Påvirker pacing, session-længde og om spilleren føler sig **tvunget** vs. **i kontrol**.

### 6.4 Verdens-loot og kister ved lag-skifte

| Element | Mulige valg |
|---------|-------------|
| **Loot på jorden** | Følger ikke med ned (ryddes ved fade) *eller* konverteres til inventar — aftal eksplicit. |
| **Uåbnede kister** | Samme som loot — ellers efterlader I “hængende” progression på forrige lag. |
| **Halvåbnet kiste** | Sjælden edge case; enten tvungen afslutning før fade eller auto-luk. |

### 6.5 Global vs. mine-lokal “dybde” i andre systemer

**Crafting / gem-generering** bruger i dag global `depth` i dele af koden. I skal beslutte:

- **Koblet til mine:** Gem-kvalitet følger den mine man minede i (kræver at crafting kender kontekst).
- **Adskilt:** Behold en **global** `worldTier` / `maxDepthReachedAcrossMines` til balance, og brug **kun** per-mine dybde i minen.

**Rationale:** Undgår at smykkebalancen bliver uforudsigelig fordi spilleren skifter mellem miner.

### 6.6 Achievements og telemetri

Eksisterende idéer som “nå dybde 50” skal omskrives til enten:

- **Per mine:** “Nå dybde 50 i jernkløften”, eller  
- **Meta:** “Nå dybde 50 i *en* mine” / “samlet dybde krydser X”.

Ellers ændrer I meningen af gamle badges når global depth splittes.

---

## 7. Målskift og reset — præcis adfærd (acceptkriterier)

1. På et lag med mindst to uløste felter kan spilleren **aktivere felt B** uden at have knuset felt A.
2. Umiddelbart efter skift vises felt A som **fuldt / ubeskadiget** (ingen rest-HP i UI for A).
3. Der er **højst ét** felt, der på et givet tidspunkt modtager `onMineHit` / hug-skade for encounter-økonomi (hakkeholdbarhed, XP pr. hug, osv.).
4. Skift af mål **øger ikke** mine-dybde.
5. (Valgfrit men anbefalet) Første gang eller via indstillinger: **kort tekst** om at skift af mål genskaber den forrige klippe — så “mærkelig reset” ikke forveksles med en bug.

---

## 8. Faldgruber og udfordringer

### 8.1 Save / load midt på et lag

- Hvis kun **ét** mål har “runtime HP” og andre er reset når de ikke er valgt, skal save-formatet enten:
  - **Gemme** valgt felt-index + `rockHp` + liste over **løste** felter på laget, **eller**
  - Ved load **nulstille** alle uløste til fuld (straffe ved crash — dårlig UX).

**Anbefaling:** Persistér `mineId`, `mineDepth`, `solvedSlots: number[]`, `selectedSlot`, `rockHp`, `rockEvent` (eller seed til at genskabe det).

### 8.2 Reroll-exploit (hvis nyt event pr. mål)

- Spilleren skifter hurtigt mellem felter for at “farme” gunstige `RockEvent`-rolls.
- **Modtræk:** Cooldown, fast encounter pr. lag, eller begrænset antal skift der trigger nyt roll.

### 8.3 UI-forvirring

- Én HP-bar skal altid matche **det valgte** mål — aldrig forrige mål.
- Minimap: I dag kan den implicit knytte “aktiv prik” til `depth % slots`. Med målvalg skal HUD skelne **lag** vs. **valgt felt**.

### 8.4 Kiste-flow og auto-`INCREMENT_DEPTH`

I den nuværende kodebase findes særlige stier (fx kiste), der kan påvirke dybde. Ved omlægning til **per-mine dybde** og **lag-krav** skal alle stier, der tidligere kaldte “increment depth”, gennemgås så de:

- Kun øger **den aktuelle mines** dybde, og  
- Kun når **lag-overgang** (eller det I definerer) sker — ikke ved målskift.

### 8.5 Migration fra global `depth`

- Eksisterende spillere har ét tal. **Strategi:** Map global depth til **alle** kendte miner som startværdi, eller kun til den mine spilleren senest var i — dokumentér valget.
- **Crafting/achievements** skal ikke stille spilleren dårligere uden changelog-kommunikation.

### 8.6 Performance og oplevelse

- Fade + evt. remount af `Canvas`/scene: sikr kort **sort** eller **loading**, undgå flash af gammel geometri.
- Lyd: stopp/start af ambient passende til lag-skifte.

### 8.7 Multiplayer (hvis nogensinde relevant)

- Per-mine dybde er naturligt **per spiller**; delt verden kræver synkroniseret lag-state — udvider scope kraftigt. For single-player ignoreres.

---

## 9. Åbne spørgsmål (til produkt / designmøde)

1. **Minimumskrav for nedstigning:** Alt clearet, valgfri knap, eller blandet?
2. **Encounter pr. målskift:** A, B eller C (§6.2)?
3. **Loot på jorden** ved lag-skifte: tabt, auto-samlet, eller “kan ikke gå ned før tomt”?
4. **Skal målskift koste** noget (tid, holdbarhed, guld) for at undgå gratis rerolls?
5. **Skal reset gælde**, hvis spilleren *ved et uheld* rammer forkert felt — eller kun ved bevidst “bekræft skift”?

---

## 10. Opsummering

Det nye system kombinerer:

- **Strukturel enkelhed:** Ét HP / ét aktivt encounter ad gangen.  
- **Spilleragency:** Frit målvalg mellem uløste klipper på samme lag.  
- **Aftalt pris:** Forladt mål resetter — ingen skjult del-skade på flere klipper.  
- **Rumfornemmelse og progression:** Fade og lag som “nyt kammer” + **mine-dybde** der kun hører til den aktuelle mine.  
- **Designkraft:** Dybde som **nøgle** til unlocks og **placerede** encounters uden krydsforurening mellem miner.

Når implementering påbegyndes, bør denne fil opdateres med **konkrete** beslutninger fra §6 og §9, så kode og tests kan verificeres mod ét sandhedsgrundlag.
