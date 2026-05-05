# Jewelry Blueprint Inspiration Catalog for GemSimulator

**Dato:** Maj 2026

Dette dokument er et inspirationskatalog og forslag til et nyt **Blueprint-system** til smykker. Det er udarbejdet uden at ændre på spillets kode eller datafiler.

## Overordnet Systemforslag

### Hvordan Blueprints skal fungere

- Blueprints er en ny type genstand (item), der repræsenterer en specifik *smykketype* eller *design*.
- De købes primært i **Butikken** under en ny sektion/tab kaldet "**Blueprints**" eller "**Smykke Designs**".
- Når en blueprint er købt, bliver den permanent unlocked og dukker op i **Smykkeværkstedet** (i Smedning-fanen) som en ekstra mulighed i dropdown eller en separat liste.
- **Crafting flow:** Vælg Blueprint (type) → Vælg Metal (ingot) → Vælg Ædelsten (med renhed/magi-krav) → Valgfri Essens → Lav smykke.
- Senere udvidelse: Nogle blueprints kan også findes som loot i miner, gives via achievements eller specielle quests.

### Visuelt Design System (vigtigt!)

Hvert blueprint definerer en **baseDesign** (f.eks. "ring_solitaire", "necklace_pendant_drop", "earring_hoop").

**Rendering-logik (forslag):**
1. Tegn **base-struktur** i metal (farvetint baseret på metal-type: kobber = rødlig, guld = gul, mithril = sølvblå osv.)
2. Placer **ædelsten** i den/de definerede positioner med stenens farve, størrelse og glans.
3. Understøt både 2D pixel-art og evt. simpel 3D-visning senere.
4. Eksempler på kombinationer:
   - Simple Ring + Rubin = klassisk rød sten i prong/bezel på metalband.
   - Pendant Necklace + Smaragd = dråbeformet vedhæng med grøn sten i midten.
   - Hoop Earrings + Safir = cirkulære ringe med små sten indsat.

Dette sikrer at både smykketypen og ædelstenen/metallet er tydeligt synlige.

## Eksisterende smykker som Blueprints

Følgende nuværende typer kan konverteres til blueprints:
- Simpel Ring → "Simple Band Ring"
- Bronzeamulet → "Basic Amulet Pendant"
- Sølvamulet, Guldcirklet osv.

## Nyt Blueprint Katalog

### Rings (Ringe)
- Simple Band Ring (lvl 8, 800g)
- Solitaire Ring (lvl 15, 2500g) – enkelt stor sten i midten
- Cluster Ring (lvl 22, 6000g) – flere små sten omkring en centersten
- Eternity Band (lvl 28, 12000g) – sten hele vejen rundt
- Signet Ring (lvl 18, 3500g)
- Halo Ring (lvl 35, 18000g)

### Necklaces (Halskæder)
- Pendant Necklace (lvl 12, 1800g) – klassisk vedhæng
- Choker (lvl 16, 3200g)
- Locket (lvl 25, 7500g) – åbent vedhæng til foto/mini-sten
- Chain Necklace med multiple drops (lvl 30, 14000g)
- Bib Necklace (statement, lvl 40, 28000g)

### Earrings (Øreringe)
- Stud Earrings (lvl 10, 1200g) – små stifter
- Hoop Earrings (lvl 14, 2200g)
- Drop Earrings (lvl 20, 4500g)
- Chandelier Earrings (lvl 32, 15000g) – elegante hængende
- Huggie Hoops (lvl 26, 8000g)

### Bracelets & Bangles
- Bangle (lvl 13, 2800g) – stiv armring
- Cuff Bracelet (lvl 19, 5200g)
- Charm Bracelet (lvl 24, 9500g) – med plads til charms
- Tennis Bracelet (lvl 38, 25000g) – sten hele vejen

### Andre typer
- Brooch / Pin (lvl 22, 6800g)
- Tiara / Diadem (lvl 45, 45000g) – passer til eksisterende Mithril-Diadem
- Anklet (lvl 17, 3000g)
- Cufflinks (lvl 20, 4000g)
- Belly Chain / Body Chain (høj lvl, dekorativ)

**I alt foreslås 25-35 blueprints** til start, med stigende pris og krav.

## Næste trin (forslag)
1. Opret `src/data/blueprints.ts` med alle definitioner.
2. Tilføj ny tab i Butikken.
3. Opdater JewelryWorkshopScreen til at bruge blueprints.
4. Implementér rendering-logik baseret på baseDesign + metal + gem.

Dette katalog kan udvides løbende. Sig til hvis du vil have mere detaljerede lister, priser, krav eller specifikke visual notes til hver type!