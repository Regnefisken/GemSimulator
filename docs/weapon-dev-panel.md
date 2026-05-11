# FPS-våben dev-panel (`weaponDev`)

Kort guide til justering af hakke/sværd i minen og til at rydde op bagefter.

## Hvornår virker det?

- Kun i **development** (`npm run dev`), ikke i et almindeligt production-build.
- Du skal være **inde i en mine** (samme skærm som 3D-minen).

## Sådan tænder du panelet

1. Start spillet med `npm run dev`.
2. Gå ind i en mine som vanligt.
3. Tilføj **`?weaponDev=1`** til sidens URL (fx `http://localhost:5173/...?weaponDev=1`).
4. **Genindlæs siden** (F5), så query-parametren læses fra start.

Panelet vises øverst til højre.

## Sådan bruger du det

- **Hakke / Sværd**: Brug fanerne øverst i panelet. I minen kan du også skifte aktivt våben med **Tab** (eller HUD-knapperne) — panelet følger det aktive våben.
- **Placering & vinkel**: `basePos`, `baseRot`, `meshOrient` (rotationer vises i **grader** på sliderne; i eksport er de **radianer**).
- **Spin på stedet**: Drejer om **synslinjen** (kamera → våben), så det ligner rotation i billedplanet.
- **Størrelse** (GLB): **Samlet skala** (`scaleMul`) og **GLB-basis** — den viste «GLB samlet» er produktet af de to.
- **gripColumn**: Kun relevant for **voxel**-visning; **GLB** ignorerer den.
- **Nulstil**: Sætter det valgte våben tilbage til standardværdier for det våben.
- **Kopiér alt** / **Rå eksport**: Gem teksten et sikkert sted (notes, DM til dig selv), hvis du vil have tallene ind i koden senere.

**Tip:** Undgå at klikke på mine-canvas mens du justerer, så du ikke mister pointer lock unødigt. Våbnet kan stadig vises uden pointer lock, når panelet er aktivt.

## Sådan «slukker» du panelet (uden at slette kode)

- Fjern **`?weaponDev=1`** fra URL’en (eller sæt den til noget andet end `1`).
- Genindlæs siden.

Panelet vises ikke længere; koden ligger stadig i repoet.

## Sådan fjerner du panelet fra projektet (efter du er færdig)

Når du har kopieret de værdier, du skal bruge, og evt. få dem lagt ind i `pickaxeDefaults.ts` / `Pickaxe3D.tsx`:

1. **Git**: Rul de relevante commits tilbage, eller lav en ny commit der fjerner dev-funktionen.
2. Typiske filer der blev tilføjet eller ændret til panelet (til reference ved oprydning):
   - `src/components/mine/WeaponFpsDevPanel.tsx`
   - `src/components/mine/weaponFpsDevRuntime.ts`
   - `src/components/mine/MineScreen.tsx` (state, `weaponDev`, import af panel)
   - `src/components/mine/3d/MiningCave3D.tsx` (`weaponFpsDev`, synlighed af våben)
   - `src/components/mine/3d/Pickaxe3D.tsx` (dev-overrides + spin-logik)
   - `src/components/mine/3d/pickaxeDefaults.ts` (fx `inPlaceSpinRad` — behold feltet hvis du stadig bruger det i produktion)

3. Slet evt. denne guide, hvis du ikke vil have den i repoet: `docs/weapon-dev-panel.md`.

## Efter oprydning

Behold kun de **endelige** tal i `pickaxeDefaults.ts` (og evt. GLB-skala i `Pickaxe3D.tsx`), som du har aftalt med udvikler / AI ud fra din kopierede eksport.
