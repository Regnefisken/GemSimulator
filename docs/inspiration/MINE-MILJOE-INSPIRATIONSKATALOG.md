# Mine-Miljø Inspirationskatalog

**Filnavn:** `docs/inspiration/MINE-MILJOE-INSPIRATIONSKATALOG.md`

## Vision
Omdanne de nuværende simple 2D/klik-baserede miner til en **immersiv 3D first-person grotte-oplevelse**, hvor spilleren kan gå rundt med WASD, kigge rundt med musen og hakke ressourcer ved at klikke på dem.

Målet er at have **én genbrugelig 3D placeholder-mine**, der kan bruges til alle mining-lokationer (Kobbermine, Jernkløften, Sølvhulen osv.). Forskellene ligger primært i konfiguration (ores, sværhedsgrad, visuel stil).

## Anbefalet Teknisk Stack
- **@react-three/fiber** + **@react-three/drei** (bedst match til dit nuværende React/TS projekt)
- `PointerLockControls` fra drei
- Custom movement script (WASD)
- Raycaster til venstreklik-interaktion
- `useFrame` til game loop / mining cooldown

Alternativ: Pure Three.js hvis du vil holde det mere letvægtigt.

## Kontrolsystem
- **W / A / S / D** – bevægelse frem, venstre, tilbage, højre
- **Mus** – frit kig rundt (Pointer Lock)
- **Venstreklik** – hakke på det objekt man sigter på
- **ESC** – frigiv musen
- Eventuelt **Shift** = løb, **Space** = hop (senere)

## Miljø Design (Grotte)
- En stor, uregelmæssig grotte med flere tunneler og rum
- Ujævnt gulv, ru vægge, lavt loft i nogle områder
- Mørk, stemningsfuld belysning (dim ambient light + få point lights / spot lights som fakler)
- Let fog for at give dybde og begrænse synsfeltet
- Start simpelt: Én stor hovedgrotte + nogle sidepassager

## Interaktion (Fase 1)
- Flere `OreNode` objekter spredt rundt i grotten
- Hver node har:
  - En simpel 3D sten/klippe-model (kan starte med BoxGeometry + nogle deformationer)
  - En type (Kobber, Jern, etc.)
  - Holdbarhed / health
- Venstreklik → raycast → hvis rammer node → start mining animation + ressource udvinding

## Implementeringsplan – Start med Jernkløften

1. **Setup**  
   Installer nødvendige pakker: `npm install @react-three/fiber @react-three/drei three`

2. **Ny komponentstruktur**  
   - `src/components/mining/3D/MiningCave.tsx`
   - `src/components/mining/3D/OreNode.tsx`
   - `src/components/mining/3D/PlayerControls.tsx`

3. **Base Scene**  
   Lav en grundlæggende grotte med Plane (gulv), Box-meshes (vægge), og nogle Cylinder/ custom geometry for stalagmitter/stalaktitter.

4. **Integration**  
   Når spilleren vælger en mine på verdenskortet, skift til `viewMode: 'mining-3d'` og render `MiningCave` med den relevante config (f.eks. `mineType: 'jernkløften'`).

5. **Game State**  
   Genbrug eksisterende mining-logik, bare udløst fra 3D-klik i stedet for 2D-knap.

## Udvidelsesmuligheder (fremtid)
- Forskellige cave presets (narrow tunnels, big caverns, vertical shafts)
- Procedurale generation (senere)
- Flere interaktive objekter: kister, specielle krystaller, svampe, miner-vogne
- Forskellige visuelle temaer pr. mine (guld-gul belysning i Guldgrotten, blå magiske krystaller i Rune-Dybet)
- Sound design (hakke-lyde med reverb, baggrunds-echo)
- Mining particles (stenstøv)

## Asset Inspiration
- Simpel sten: BoxGeometry med `MeshStandardMaterial` + roughness
- Ore: Samme sten + emissive map i metal-farve
- Brug Blender til at lave 1-2 bedre low-poly stenmodeller senere

Dette katalog giver et solidt fundament. Du kan udvide det gradvist uden at bryde det eksisterende spil.
