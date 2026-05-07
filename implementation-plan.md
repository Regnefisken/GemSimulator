# GemSimulator — Samlet implementeringsplan

**Status:** Master-plan, ny sandhed for mine-spor, survival/alkymi-spor og equipment/combat-spor.
**Erstatter:** [`mine-layers-implementation-guide.md`](./mine-layers-implementation-guide.md) og [`alchemist-workshop-survival-concept.md`](./alchemist-workshop-survival-concept.md) som ledende kilde til *implementeringsrækkefølge*. Konceptdokumentet `mine-layers-depth-target-concept.md` v2.1 er stadig den narrative/produktmæssige sandhed; ved konflikt opdateres beslutningsloggen her **og** der.
**Version:** 1.2 (2026-05-07)

---

## 1. Vision

GemSimulator består af fire sammenvævede systemer:

1. **Mine-lag** — persistente klippe-slots, dybde-progression pr. mine, ikke-tilbagevendende lag (D1–D14).
2. **Survival** — synlig HP og mana i minen, automatisk regen på overflade/lejr, forbrug af consumables under run (D15–D18).
3. **Equipment & combat** — hakke til mining, sværd til combat, frit skift mellem dem; durability slides ved brug og repareres med kul i den eksisterende smedje; senere armour (D23–D25, D28–D31, D35).
4. **Alkymi & loot-økonomi** — alkymistværksted som hub-facilitet hvor spilleren blander/køber potions; brew bestemmer mana-identitet (farve + evne); blueprints i kister giver permanent opskrifts-unlock; mad/potions kan også findes som mine-loot (D19–D22, D26–D27, D32–D34, D36–D39).

Systemerne er **orthogonale i logik**, men **integreres** via run-inventory, run-kontekst, save-format og UI. Equipment-, survival- og alkymi-sporene er additive lag oven på mine-sporet og må aldrig bryde D1–D14.

**Visuel retning (etableret konvention):** alle items rendres som små pixel-stil 2D-sprites i HUD/inventory/butik. 3D-modeller bruges kun til pickaxe og sværd som *world/character*-repræsentation (sværd følger samme visuelle logik som hakke). Armour er **ikke** synlig på character — den lever kun som 2D-ikon i inventory og giver stat-bonuser når equipped (D35). Blueprints, potions, mad, kul og ingredienser er 2D-sprites på linje med eksisterende loot-items.

---

## 2. Beslutningslog

D1–D14 er overført ordret fra konceptdokumentet og er **ikke-forhandlingsbare**. D15–D39 er nye, låst i denne plan.

### 2.1 Mine-spor (D1–D14, uændret)

| ID | Kort |
|----|------|
| **D1** | Ingen tilbagevenden til tidligere lag i samme run — kassér `LayerState` ved nedstigning. |
| **D2** | Clear room før ned — alle obligatoriske slots `cleared`. |
| **D3** | Encounter/HP per slot ved lag-generering (ingen reroll ved målskift). |
| **D4** | Auto-saml ground loot før fade. |
| **D5–D6** | Kister som i koncept-loggen; halvåbnet kræver afslutning. |
| **D7** | Død = fuldt tab af run-inventory. |
| **D8** | Safe ascend = behold alt til hub. |
| **D9** | Samme økonomi, separate drop-tabeller for mob vs. klippe (Fase 2). |
| **D10** | Crafting m.m.: `worldTier` fra meta; mine-dybde kun til mining i minen. |
| **D11** | Achievements: primært per `mineId` + dybde, sekundært “any mine”. |
| **D12** | Migration: global depth → alle kendte miners `unlockedDepths`. |
| **D13** | Fri målskift — ingen cooldown/pris. |
| **D14** | Fase 1 = rocks only; Fase 2 = mobs. |

### 2.2 Survival, equipment, alkymi (D15–D39)

| ID | Beslutning | Begrundelse |
|----|-----------|-------------|
| **D15** | **MVP-omfang for survival = HP + én neutral mana-pool, ingen brews.** | Validerer run-kontekst-skel og bar-UI uden at bygge identitets-systemet for tidligt. |
| **D16** | **Auto-regen på overflade/lejr/hub er øjeblikkelig fuld heal** af både HP og mana ved scene-entry. | Ingen tick-loop, ingen race conditions. |
| **D17** | **Safe ascend giver fuld heal** ved hub-entry (følger D16). | Konsistent regel. |
| **D18** | **Død nulstiller HP/mana til max** i hub-state. | Spilleren starter altid næste run friskt. |
| **D19** | **Én delt mana-pool**. Brew-skift bevarer `manaCurrent` (clampes til ny `manaMax`). | Simplest model. |
| **D20** | **Brew-skift er hard overskriv**. | Klar state-machine. |
| **D21** | **Mad og potions er samme datakategori** `consumable` med `kind: 'food' \| 'potion'`. **Separate UI-faner**. | Simpel datamodel + visuelt klare loops. |
| **D22** | **Auto-pickup af alle ground-loot consumables, blueprints og kul** følger D4. | Ingen sær-undtagelser. |
| **D23** | **To våbenslot: `pickaxe` og `sword`. Frit skift når som helst** via hotkey eller HUD-toggle. | Maksimal player agency. |
| **D24** | **Både hakke og sværd har durability**. Sværd slides hurtigere. Ved 0 durability er våbnet ubrugeligt. | Kul-økonomien får reel betydning. |
| **D25** | **Kul er repair-materiale**, droppes som biprodukt af mining. Repair-pris skalerer med våben-tier. | Naturligt mining→combat-loop. |
| **D26** | **Blueprints fra kister giver instant permanent unlock** af opskrifter. **Undtagelse fra D7**. | Belejlighed føles med det samme. |
| **D27** | **Sværd har egen tier-ladder, uafhængig af hakke**, med egen butiks-fane og lagermenu. | Klar progression-akse pr. equipment-type. |
| **D28** | **Repair foregår i den eksisterende smedje** (ambolt + hammer-scene). Implementering: tilføj item-input-slot + kul-forbrugs-flow til eksisterende UI. | Eksisterende facilitet — ingen ny `Area`. |
| **D29** | **Hakke slides −1 durability pr. cleared slot** (ikke pr. hit). | Forudsigelig kadence; matcher persistent-slot-modellen. |
| **D30** | **Kul-drop-rate skalerer med depth**: dybere lag = højere drop-rate eller større stacks. | Risiko/belønning-loop; rewarder dybde-progression. |
| **D31** | **Sværd kan ikke bryde rocks** — pickaxe-only. | Klar rolle-adskillelse; loadout-toggle får reel taktisk vægt. |
| **D32** | **HP/mana-bars er helt skjulte på overflade/hub**. Vises kun i mine-scene. | Renere hub-UI; klar visuel signal om sikker zone. |
| **D33** | **3 consumable quick-slots** i mine-HUD (hotkeys 1–2–3). | Plads til heal + mana + mad uden at fylde HUD'et. |
| **D34** | **Blueprints i kister: % chance pr. kiste, depth-vægtet** (højere chance på dybe lag). | Belønner både bredt udforskning og dybde-progression. |
| **D35** | **Armour er usynlig på character. Equipping/swap sker kun via inventory på overfladen** (ikke mid-run). 2D-ikon i inventory. Lille stat-bonus (fx +HP eller +mana). **Én armour-slot i v1**, udvidelse til hjelm/støvler er fremtidig. | Lille scope, simpel datamodel, klare bonus-effekter. |
| **D36** | **Brew-varighed = `until_swap`** (indtil spilleren drikker en anden brew, dør, eller går tilbage til hub). | Matcher D20 hard overskriv; ingen timere. |
| **D37** | **Ingen soul-bound consumables** — alt taber pr. D7. Eneste D7-undtagelse er blueprints (D26). | Holder reglen ren: items tabes, viden bevares. |
| **D38** | **`manaMax` bestemmes af aktiv brew** — hver brew har egen `manaMax`. Neutral mana har en fast baseline (default 50). Skift af brew → `manaCurrent` clampes til ny max (D19). Intet player-level-system kræves. | Simplest og forudsigelig; ingen XP-system pålægges. |
| **D39** | **Hub-butikker restocker efter hvert run** — både ved safe ascend og død. | Ren hub→dive-loop, ingen ventetid. |

---

## 3. Domænemodel (typer)

Foretræk [`src/types.ts`](./src/types.ts) eller dedikeret modul-fil — vælg én konvention og hold den.

### 3.1 Mine-typer (uændret)

- `LayerState`, `SlotState` (mindst `id`, `type`, `maxHp`, `currentHp`, `cleared`, `position`; `encounter` når data findes).
- `RunState` med `currentDepth`, `mineId`, `runId`, **`layerStates` begrænset til aktuelt lag** under D1.
- `PermanentProgress` for hub/meta.

### 3.2 Player state (survival + loadout)

```ts
type PlayerState = {
  // Survival (Fase 1.5)
  hp: number;
  hpMax: number;
  mana: number;
  manaMax: number;            // afledt af aktiv brew pr. D38

  // Brew-identitet (Fase 4; null i MVP pr. D15 → manaMax = NEUTRAL_MANA_MAX, default 50)
  activeBrewId: BrewId | null;
  activeBuffs: BuffInstance[];

  // Loadout (Fase 2)
  equippedWeapon: 'pickaxe' | 'sword';   // D23 toggle
  pickaxeId: PickaxeInstanceId;
  swordId: SwordInstanceId | null;       // null = intet sværd ejet endnu

  // Armour (Fase 5; D35: én slot v1, usynlig på character)
  equippedArmourId: ArmourInstanceId | null;

  // Quick-slots (Fase 3; D33: 3 slots)
  consumableQuickSlots: [ConsumableId | null, ConsumableId | null, ConsumableId | null];
};
```

`PlayerState` lever på `RunState` for run-tilstand. `pickaxeId`, `swordId`, `equippedArmourId` og `consumableQuickSlots` synces til `PermanentProgress` ved safe ascend (D8) og resettes ved død (D7) — undtagen ejede equipment-instanser, som er meta og bevares.

### 3.3 Equipment

```ts
type WeaponInstance = {
  id: WeaponInstanceId;
  kind: 'pickaxe' | 'sword';
  tier: number;             // pr. D27 separate ladders pr. kind
  durabilityCurrent: number;
  durabilityMax: number;
};

type ArmourInstance = {
  id: ArmourInstanceId;
  tier: number;
  durabilityCurrent: number;
  durabilityMax: number;
  bonuses: { hpMax?: number; manaMax?: number; /* udvides */ };
  // D35: ingen sprite på character; kun inventory-ikon
};
```

### 3.4 Consumables (mad + potions)

```ts
type Consumable = {
  id: ConsumableId;
  kind: 'food' | 'potion';           // D21: bestemmer UI-fane
  effect: ConsumableEffect;          // heal_hp | heal_mana | apply_brew | combo
  brewId?: BrewId;                   // kun for apply_brew (Fase 4)
  stack: number;
  sprite: SpriteRef;                 // 2D pixel-stil
};
```

Consumables kan både købes og findes som loot. **Ingen er soul-bound** pr. D37.

### 3.5 Materials (kul + ingredienser)

```ts
type Material = {
  id: MaterialId;                    // 'coal' | 'sulfur' | 'glow_moss' | …
  kind: 'fuel' | 'ingredient' | 'reagent';
  stack: number;
  sprite: SpriteRef;
};
```

Kul er en `Material` med `kind: 'fuel'`; primær funktion er repair-input i smedjen (D25, D28).

### 3.6 Blueprints

```ts
type Blueprint = {
  id: BlueprintId;
  recipeId: RecipeId;
  sprite: SpriteRef;
};
```

Pickup-handler skriver til `PermanentProgress.unlockedRecipes` og dropper item-instansen (D26).

### 3.7 Brew/buff-katalog (Fase 4)

```ts
type Brew = {
  id: BrewId;
  color: string;            // CSS-variabel / hex til themed mana-bar
  abilityId: AbilityId;
  manaMax: number;          // D38: bestemmer ny manaMax når aktiv
  duration: 'until_swap';   // D36: låst til 'until_swap'
};

const NEUTRAL_MANA_MAX = 50; // D38 baseline når activeBrewId === null
```

### 3.8 Permanent progress (udvidelse)

```ts
unlockedDepths: Record<MineId, number>;
unlockedRecipes: RecipeId[];        // D26 blueprint-mål
shopStock: ShopStockState;          // restocker efter hvert run pr. D39
ownedWeapons: WeaponInstance[];
ownedArmour: ArmourInstance[];
```

---

## 4. Run-kontekst (lejr vs. mine)

```ts
function isInActiveMineRun(state): boolean
```

- `regenEnabled = !isInActiveMineRun(state)` — auto-regen kører kun på overfladen. Pr. D16 sættes HP/mana = max **øjeblikkeligt** ved entry.
- HUD-bars (HP/mana) er kun synlige når `isInActiveMineRun` er sand pr. D32.
- Mob-AI / skade-tick / durability-slid må kun køre når `isInActiveMineRun` er sand.
- Drik af consumable er tilladt i begge kontekster, men kun *meningsfuldt* i minen.
- Repair-handler og armour-equip-skift er kun tilgængelige i hub-kontekst (D28, D35).

---

## 5. Verdenskort og hub-faciliteter

Hub består af følgende faciliteter:

- **By/hub** (eksisterende) — udvides med butiks-faner og lager-menuer for nye item-typer.
- **Smedjen** (**eksisterende**, ambolt + hammer) — udvides med item-input-slot + kul-forbrugs-flow til repair pr. D28.
- **Alkymistværksted** (Fase 3, ny `Area`) — butik (Fase 3) og blande-UI (Fase 4).

Hub-facilities behandles som permanent progression. Pr.-mine `RunState` røres ikke.

**Butiks-faner (D21, D27 + udvidelser):** Mad · Potions · Pickaxes · Swords · Ingredienser · Armour. Hver fane er en filtreret view over `shopStock`. Restock pr. D39 efter hvert run.

---

## 6. Implementeringsfaser

Faserne er rækkefølge-følsomme. Hver fase skal kunne shippes selvstændigt og må ikke bryde foregående faser.

### Fase 1 — Mine-spor (rocks only) + kul

**Leverancer:**

1. Typer i §3.1 implementeret/refaktoreret.
2. `generateLayerState(args)` (D3) — én ren funktion.
3. Persistente `SlotState` ved hits (D13) — primært mål kun.
4. Clear-room gate (D2) før `transitionToNextLayer()`.
5. Lag-overgangsflow (D1, D4–D6) i rækkefølge:
   1. Auto-saml ground loot (D4).
   2. Validér kister (D5–D6).
   3. Kassér nuværende `LayerState`.
   4. Inkrementér `currentDepth` én gang.
   5. Generér nyt `LayerState`.
   6. Fade / scene swap.
6. Run-afslutning (D7, D8).
7. Migration (D12).
8. `worldTier` (D10) i crafting-pathen.
9. Achievements (D11) per `mineId` + dybde.
10. **Kul** som ny `Material` (§3.5) tilføjet til klippe-drop-tabellerne. **Drop-rate skalerer med depth** pr. D30 (fx baseline 10% på dybde 1, +2% pr. dybde, eller staircase). Kul-sprite (2D pixel) integreret. Kul har stadig ingen funktion endnu — det samles bare til Fase 2.

### Fase 1.5 — Survival MVP (HP + neutral mana)

**Leverancer:**

1. `PlayerState`-felter (§3.2 survival-del) tilføjet med `manaMax = NEUTRAL_MANA_MAX` (D38).
2. Run-kontekst-prædikat `isInActiveMineRun` defineret ét sted.
3. HUD: HP-bar + mana-bar **kun i mine-scene** pr. D32; helt skjult på overflade.
4. Auto-regen ved scene-entry på overflade/hub/lejr (D16) → `hp = hpMax; mana = manaMax`.
5. Save-format udvidet med survival-felter; load-path tester at `hp ≤ hpMax` etc.
6. Død-handler nulstiller HP/mana sammen med run-inventory (D7 + D18).
7. Safe ascend triggerer auto-regen via samme entry-handler (D17).
8. Tom skade-pipeline: funktion `applyDamageToPlayer(amount, source)` der bruges i Fase 2.

**Bevidst ikke i scope:** brews, farver, evner, alkymistværksted, butik, mob-skade, sværd.

### Fase 2 — Mobs, sværd, loadout, durability, smedje-repair

**Leverancer:**

1. `EntityState` eller `SlotState.type === 'mob'` med AI-hook.
2. Separate drop-tabeller fra `rollMineDrop` (D9).
3. Mob-AI tilkalder `applyDamageToPlayer`.
4. UI: mob-aggro/threat-indikator.
5. **Sværd** som ny equipment-type (§3.3) med egen tier-ladder (D27).
6. **Sværd-butiks-fane** i hub (D27) + lager-menu.
7. **Loadout-toggle** mellem `pickaxe` og `sword` (D23) — hotkey + HUD-knap. Aktivt våben afgør om interaktion → mining eller combat. **Sværd kan ikke bryde rocks** pr. D31.
8. **Durability-system** (D24):
   - Hakke slides **−1 pr. cleared slot** pr. D29.
   - Sværd slides −N pr. mob-hit (N > hakkens slid-rate; konkret tal låses i balance-pass).
   - Ved 0 durability: våben ubrugeligt; UI markerer dette og foreslår repair.
9. **Repair i eksisterende smedje** (D28):
   - Tilføj item-input-slot til smedje-UI (drag-and-drop af våben/armour).
   - Kul-forbrugs-flow: vælg item → vis kul-cost pr. durability-point (skalerer med tier pr. D25) → bekræft → forbrug kul + restorer durability.
   - Smedje er kun tilgængelig i hub-kontekst.
10. Test: mob-skade reducerer player-HP, ikke `SlotState.currentHp`. Loadout-toggle ændrer ikke run-state ud over `equippedWeapon`. Durability bevares ved save/load.

### Fase 3 — Alkymistværksted (køb-første) + blueprints + consumable-loot + quick-slots

**Leverancer:**

1. Nyt `Area`/`LocationId` for workshoppen + verdenskort-route.
2. `ShopStockState` med restock pr. D39 (efter hvert run).
3. Butik-UI med faner: **Mad** (D21), **Potions** (D21), **Ingredienser**.
4. Mindst to consumables: `heal_hp_minor` (potion), `bread_minor` (food).
5. Drik/spis-handler i mine-scene: forbruger consumable, anvender effekt.
6. **Mad og potions kan droppes i minen** (mob-drops + chest-loot). Ingen er soul-bound (D37).
7. **Blueprint-loot i kister** (D26, D34):
   - Chest loot table får ny entry-type `blueprint`.
   - Drop-formel: `chance = baseChance + depth * depthBonus` (konkrete tal låses i balance-pass; baseline-forslag 8% + 1.5%/dybde).
   - Pickup-handler skriver til `PermanentProgress.unlockedRecipes` + viser toast (“Ny opskrift låst op: X”).
8. **Mine-HUD quick-slots** for consumables — **3 slots** pr. D33 ved siden af mana-bar. Spilleren binder consumable-stacks til slots i hub-inventory; hotkeys 1–2–3 i mine-scene.
9. Test: køb i hub → consumable i hub-inventory → medbringes til mine via run-start → forbruges via quick-slot → restorer HP/mana. Kister kan droppe blueprint → permanent unlock overlever død.

**Bevidst ikke i scope:** blanding, brews, farver.

### Fase 4 — Blanding, brews og farvet mana

**Leverancer:**

1. Opskrifts-katalog (`Recipe[]`) — referencer fra `PermanentProgress.unlockedRecipes` (fyldt af Fase 3 blueprints).
2. Ingrediens-items (`Material` med `kind: 'ingredient'`) som droppes i minen og købes i workshop-fanen Ingredienser.
3. Blande-UI på workshop-scene: ingrediensliste → opskrift-match → producér potion.
4. `worldTier` (D10) gates opskrifter/ingredienser.
5. Brew-typer (§3.7) + tilhørende evner. Mindst én farve i første iteration (fx gul styrke). Varighed = `until_swap` pr. D36.
6. `applyBrewEffect`-handler ved drik: opdaterer `activeBrewId`, evne-slot, mana-bar farve, og **`manaMax` til brew's værdi** pr. D38.
7. Hard overskriv ved skift (D20): forrige `activeBrewId` overskrives, `manaCurrent` clampes til ny `manaMax` (D19).
8. UI: themed mana-bar baseret på `activeBrewId.color`; tooltip viser aktiv evne.
9. Save: `activeBrewId` persisteres så brew overlever save/load midt i run.

### Fase 5 — Armour

**Leverancer:**

1. `ArmourInstance` (§3.3) med egen tier-ladder.
2. Én armour-slot på `PlayerState` pr. D35.
3. Armour-butiks-fane i hub.
4. Equip/swap **kun i hub** via inventory-UI (D35) — ikke tilgængeligt mid-run.
5. Stat-bonuser appliceres når equipped (modificerer `hpMax`/`manaMax`/andre); ruller tilbage ved unequip.
6. Armour-durability slides ved player-hits, repareres med kul i smedjen pr. D24/D25/D28.
7. UI: 2D pixel-ikon i inventory og character-panel. **Ingen visuel ændring på character-modellen** pr. D35.

---

## 7. Konsekvenser for eksisterende kode

| Område | Fil (typisk) | Ændring |
|--------|--------------|---------|
| Mining balance | [`src/gem/mining.ts`](./src/gem/mining.ts) | `rockHpForDepth` kaldes med run-depth; klippe-drops udvidet med kul (Fase 1, depth-vægtet pr. D30); separate mob-tabeller (Fase 2). |
| Areas | [`src/data/areas.ts`](./src/data/areas.ts) | Per-mine `depthMultiplier`, slot-templates, ny workshop-`Area` (Fase 3). Smedje eksisterer allerede (D28). |
| Globale typer | [`src/types.ts`](./src/types.ts) | `PlayerState`, `WeaponInstance`, `ArmourInstance`, `Consumable`, `Material`, `Blueprint`, `Brew`, udvidet `LocationId`. |
| Save/game state | *(locate persistenslag)* | Migrér legacy global depth (D12); udvid med survival-felter (Fase 1.5), loadout/durability (Fase 2), consumables/blueprints/recipes/quick-slots (Fase 3+), brews (Fase 4), armour (Fase 5). |
| HUD/UI | *(scene-laget)* | HP-bar + mana-bar **kun i mine** (D32); weapon-toggle, durability-indikator, 3 consumable quick-slots (D33), themed bar pr. brew, armour-inventory-ikon. |
| Loot/chest | *(chest-laget)* | Blueprint som ny chest-loot-type (Fase 3, D34); mad/potions som mob+chest-drop (Fase 3). |
| Smedje | *(eksisterende smedje-scene)* | Tilføj item-input-slot + kul-forbrugs-flow til repair (D28, Fase 2). |
| Verdenskort-routing | *(verdenskort-laget)* | Workshop (Fase 3). |
| Butik | *(shop-laget)* | Faner pr. type: Mad, Potions, Pickaxes, Swords, Ingredienser, Armour. Restock-handler pr. D39. |

Gennemgå alle stier der tidligere har øget global dybde eller antaget ét aktivt klippe-HP (koncept §13 — “auto-INCREMENT_DEPTH”, kister).

---

## 8. Test-checkliste pr. fase

### Fase 1
- [ ] To slots på samme lag: skade på A, skift til B, tilbage til A — HP uændret (persistent).
- [ ] Målskift ændrer ikke `currentDepth`.
- [ ] Nedstigning blokeret indtil alle mandatory slots cleared (D2).
- [ ] Efter nedstigning ingen genindlæsning af forrige lags HP-state (D1).
- [ ] Ved fade: ground loot i inventory (D4); kiste-edge cases (D5, D6) respekteret.
- [ ] Migration: alle miner får legacy depth (D12).
- [ ] `worldTier` bruges i crafting-path som aftalt (D10).
- [ ] Kul drop-rate skalerer med depth (D30).
- [ ] Kul auto-samles ved fade (D22).

### Fase 1.5
- [ ] Auto-regen er **ikke** aktiv i mine-scene.
- [ ] HP/mana-bars helt skjulte på overflade (D32).
- [ ] Auto-regen sætter HP/mana = max ved overflade-entry (D16).
- [ ] Safe ascend trigger giver fuld heal (D17).
- [ ] Død nulstiller HP/mana (D18) og run-inventory (D7).
- [ ] Save/load bevarer HP/mana under aktiv run.

### Fase 2
- [ ] Mob-skade reducerer player-HP, ikke klippe-`SlotState`.
- [ ] Mob-drops bruger separate tabeller (D9), men samme guld/inventory-pipeline.
- [ ] Loadout-toggle skifter mellem pickaxe og sword uden cooldown (D23).
- [ ] Sværd kan **ikke** bryde rocks (D31).
- [ ] Hakke slides −1 pr. cleared slot (D29).
- [ ] Sværd slides ved mob-hit, hurtigere end hakke (D24).
- [ ] Ved 0 durability: våben ubrugeligt indtil repaired.
- [ ] Smedje accepterer item-input + kul → durability restored, kul forbrugt (D25, D28).
- [ ] Repair-pris skalerer med våben-tier (D25).
- [ ] Durability persisteres ved save/load.

### Fase 3
- [ ] Køb i hub-butik flytter consumable til hub-inventory; korrekt fane (D21).
- [ ] Restock sker efter både safe ascend og død (D39).
- [ ] Consumable medbringes til mine via run-start (D8-pipeline omvendt).
- [ ] Drik/spis i mine via quick-slot restorer korrekt mængde, forbruger én stack.
- [ ] Død i mine taber consumable (D7); ingen er soul-bound (D37); blueprints overlever altid (D26).
- [ ] Blueprint pickup tilføjer til `unlockedRecipes` og viser toast.
- [ ] Blueprint drop-rate skalerer med depth (D34).
- [ ] Auto-pickup af consumable/blueprint/kul ved fade (D22 / D4).
- [ ] Quick-slot binding (3 slots) bevares mellem runs (D33).

### Fase 4
- [ ] Brew-skift overskriver tidligere `activeBrewId` hardt (D20).
- [ ] Mana-bar skifter farve ved brew-skift; tooltip viser ny evne.
- [ ] `manaCurrent` bevares ved skift, clampes til ny `manaMax` (D19, D38).
- [ ] Brew udløber kun ved skift, død, eller tilbagevenden til hub (D36 `until_swap`).
- [ ] Opskrifts-låsning gates af `worldTier` (D10).
- [ ] Blanding via workshop forbruger ingredienser og producerer korrekt potion.

### Fase 5
- [ ] Equip armour ændrer `hpMax`/`manaMax` korrekt; unequip ruller tilbage.
- [ ] Equip/swap er **kun** muligt på overfladen (D35).
- [ ] Armour er **ikke** synlig på character-modellen (D35).
- [ ] Armour slides ved player-hit; repareres med kul i smedjen (D24, D25, D28).
- [ ] Armour-pixel-sprite vises i inventory og character-panel.

---

## 9. Fremtidige overvejelser (uden for v1.x scope)

Disse er bevidst udskudt til efter Fase 5 og kræver ikke beslutning nu. Tilføjes som nye D-rækker når tiden kommer.

1. **Armour-slot-udvidelse** — fra én slot til hjelm/torso/støvler. Tilføjes uden save-brud (kun nye slot-felter på `PlayerState`).
2. **Player level / XP-system** — hvis det tilføjes senere, integreres det med `manaMax`-formlen som multiplikator oven på brew-baseline (D38 holder).
3. **In-game tid / dag-nat-cyklus** — hvis tilføjet, kan restock-frekvensen (D39) justeres til daglig i stedet for pr. run.
4. **Soul-bound items** — kan introduceres senere som ny D-række med `soulBound: true` flag (D37 holder indtil videre).
5. **Multi-target combat / AoE-evner** — Fase 4+ udvidelse til brews med større rækkevidde.
6. **Achievement-udvidelser** — D11 "any mine" achievements som senere telemetri-pas.

---

## 10. Versionsreferencer

Når denne plans beslutningslog (§2) ændres:

1. Bump versionsfeltet i headeren.
2. Opdatér konceptdokumentets `D*`-tabel hvis ændringen rør D1–D14.
3. Tilføj en kort changelog-linje i bunden af denne fil.
4. Tjek test-checklisten i §8 for nye eller fjernede regler.

---

## Changelog

- **v1.0 (2026-05-07)** — Første samlede master-plan. Konsoliderer mine-implementeringsguide og alkymi/survival-koncept. Låser D15–D22.
- **v1.1 (2026-05-07)** — Tilføjer equipment/combat-spor (sværd, loadout-toggle, durability), kul som repair-materiale, blueprints som chest-loot, mad/potions som mine-loot, separate butiks-faner, consumable quick-slots i mine-HUD, og armour som Fase 5. Låser D23–D27. Reviderer D21.
- **v1.2 (2026-05-07)** — Låser de 12 sidste åbne beslutninger som D28–D39: smedjen er allerede den eksisterende facilitet (kun item-input + kul-flow mangler), hakke-slid pr. cleared slot, depth-vægtet kul- og blueprint-drop, sværd kan ikke bryde rocks, HUD-bars skjulte på overflade, 3 quick-slots, armour usynlig på character med swap kun på overflade, brew `until_swap`, ingen soul-bound, manaMax fra brew, restock efter hvert run. Trimmer §9 til reelle fremtids-overvejelser.
