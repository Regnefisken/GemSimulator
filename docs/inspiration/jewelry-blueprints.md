# Smykke Blueprints - Inspirationskatalog for GemSimulator

**Oprettet:** 5. maj 2026
**Kilde:** Inspiration fra https://en.wikipedia.org/wiki/Jewellery og https://en.wikipedia.org/wiki/List_of_jewellery_types

**Vigtigt:** Dette dokument er kun et inspirationskatalog. **Intet i spillets kode eller filer er ændret.** Det er placeret som en ny Markdown-fil i repoet til fremtidig reference.

## 1. Overordnet System-forslag

### Blueprint-systemet (konceptuelt)
- **Blueprints** er nye "design-skabeloner" eller opskrifter, der kan købes.
- Alle nye blueprints (og evt. de eksisterende smykketyper som Simpel Ring, Bronzeamulet osv.) bliver tilgængelige via **køb i Butikken** fra starten.
- Senere udvidelse: Nogle blueprints kan låses via achievements, quests eller findes som loot i miner (f.eks. sjældne miner som Mithrilbjerget).

### Ny sektion i Butikken
- Tilføj en ny fane eller sektion kaldet **"💎 Blueprints"** eller **"Smykke-Designs"**.
- Her vises en liste/grid af alle tilgængelige blueprints (filtreret efter spillerens level).
- Hver blueprint har:
  - Navn og ikon (pixel-art preview af base-designet).
  - Pris i guld.
  - Kort beskrivelse.
  - "Køb"-knap (kun hvis level-krav er opfyldt).
- Når købt: Blueprint tilføjes til `player.unlockedBlueprints` (array af IDs).

### Integration i Smykkeværkstedet
- I **Smedning**-fanen:
  - Først vælger man en unlocked **Blueprint** fra en dropdown eller grid (i stedet for kun hardcoded opskrifter).
  - Derefter vælger man metal-ingot, ædelsten (baseret på gemSlots og renhed/magi-krav), og valgfri essens.
  - Crafting giver: Guld, reputation, XP + bonus afhængig af blueprintens kompleksitet.
- Gamle opskrifter kan konverteres til blueprints (f.eks. "Simpel Ring" bliver en købbar blueprint).

### Visuel Gengivelse (2D og potentiel 3D)
- **Krav A + B opfyldt:** Ædelsten er altid synlig og central i designet.
- **2D Pixel-art system (matcher nuværende):**
  - Hver blueprint har en **base silhouette** (f.eks. ring-band, pendant-drop, hoop).
  - Metal-farve anvendes på rammen/kanten (kobber=orange, guld=gul, mithril=sølv-blå osv.).
  - Ædelsten placeres i specifik "setting"-position med dens farve og glød (baseret på renhed/magi).
  - Eksempel: En "Signet Ring" viser en flad top med gravering + central gem i bezel.
- **3D (hvis tilføjet senere):** Samme princip – base mesh for type + gem insert slot.
- Dette giver tusindvis af unikke kombinationer uden ny grafik pr. smykke.

### Data og progression
- Ny data-fil (f.eks. `src/data/blueprints.ts`): Array af alle blueprints.
- Start: Alle er købbare i butikken.
- Senere: Tilføj `unlockMethod: 'shop' | 'achievement' | 'mine-loot'`.

## 2. Inspirationskatalog over Blueprints

Hentet og tilpasset fra Wikipedia. Hver inkluderer forslag til **visuel repræsentation** der passer perfekt til dit gem + metal system.

### Ringe (Rings)
- **Simpel Ring** (eksisterende – kan gøres til blueprint): Simpel band. Gem i center. Metal kant.
- **Signet Ring**: Flad top til symbol/gravering + central gem. Klassisk herre-ring.
- **Solitaire Ring**: Enkelt stor gem i prong/bezel setting.
- **Halo Ring**: Central gem omgivet af mindre sten (flere gemSlots).
- **Cluster Ring**: Gruppe af gems i cluster.
- **Eternity Ring**: Række af små gems hele vejen rundt.
- **Cocktail Ring**: Stor, overdådig statement gem.
- **Puzzle Ring**: Interlocking bands (fantasy puzzle effekt).
- **Claddagh Ring**: Hænder-hjerte-krone design (keltisk).
- **Thumb Ring**: Bred band til tommelfinger.

### Halskæder & Vedhæng (Necklaces & Pendants)
- **Pendant Necklace**: Simpel kæde med drop-formet vedhæng. Gem i centrum af pendant.
- **Locket**: Åbent vedhæng med plads til gem (eller to).
- **Choker**: Tæt halsbånd med central gem eller flere.
- **Torc**: Stiv, åben halsring (viking/celtic stil, metal-fokus + gem ends).
- **Multi-Strand Necklace**: Flere kæder med gems.
- **Amulet**: Rune- eller symbol-vedhæng med indsat gem.
- **Bulla**: Perle-formet beholder (Etruscan, med gem indeni).

### Øreringe (Earrings)
- **Stud Earrings**: Små knapper med gem i midten.
- **Hoop Earrings**: Klassiske ringe med gem accents.
- **Drop Earrings**: Hængende drop med gem nederst.
- **Chandelier Earrings**: Flere lag med gems (flere slots).
- **Huggie Hoops**: Små hoops der krammer øret.
- **Ear Cuff**: Cuff uden piercing, med gem.

### Armbånd & Armlets (Bracelets)
- **Rigid Bangle**: Stiv cirkel med gem inlay.
- **Cuff Bracelet**: Åbent cuff med statement gem.
- **Tennis Bracelet**: Kæde med række af små gems.
- **Charm Bracelet**: Med charms + hoved-gem.
- **Armlet**: Øvre arm ring (større, tribal).
- **Anklet**: Fodkæde variant.

### Brocher, Pins & Hovedpynt
- **Brooch / Fibula**: Sikkerhedsnål-stil med stor gem.
- **Cameo Brooch**: Relief-design med gem baggrund.
- **Tiara / Diadem**: Hovedbånd med gems (fantasy).
- **Crownlet**: Mini-krone.
- **Hairpin**: Hårnål med gem-top.

### Fantasy & Unikke (tilføjelse til spillet)
- **Mithril Circlet**: Elegant hovedring med magisk gem.
- **Rune Amulet**: Runer indgraveret + kraftig gem.
- **Dragonscale Bracelet**: Skala-mønster med embedded gems.
- **Celestial Pendant**: Stjerne- eller måne-form med gem som kerne.
- **Khamsa Amulet**: Hånd-form (beskyttelse) med central gem.
- **Hei-tiki Pendant**: Māori-inspireret figur med jade-lignende gem.

## 3. Pris- og Krav-forslag (startniveau)
- Simple (Ring/Stud): 200-800 guld, level 8+
- Medium (Pendant/Bangle): 1500-5000 guld, level 15+
- Avancerede (Chandelier/Torc): 8000-25000 guld, level 25+
- Fantasy (Mithril/Rune): 30000+, level 40+, høj rep senere.

## 4. Næste trin (kun forslag)
- Opret `src/data/blueprints.ts` med listen ovenfor.
- Opdater butik og workshop UI til at bruge blueprints.
- Tilføj pixel-assets for hver baseShape.

Dette katalog kan udvides løbende. Kopier gerne ideerne ind i spillet når du er klar! 💍

---

*Fil oprettet automatisk via Grok uden ændring af eksisterende spilfiler.*