# MINE-MILJØ-INSPIRATIONSKATALOG

## Indledning
Dette er et inspirationskatalog til at omdanne de nuværende simple mine-lokationer til rigtige 3D-miljøer med first-person bevægelse.

## Overordnet Arkitektur
- Brug **én fælles 3D Mine Scene** som placeholder for alle miner.
- Forskellige miner (Jernkløften, Guldgrotten osv.) vælger forskellige varianter/temaer af den samme base-mine via parametre (materialer, lys, props).
- Start med Jernkløften som første fulde implementation.

## Anbefalet Teknologi
- Three.js (mest sandsynligt passende til dit React/TS setup)
- PointerLockControls + custom WASD movement
- Raycaster til mining (venstreklik)
- Mulighed for senere at skifte til Babylon.js hvis du vil have mere indbygget fysik.

## Core Features
- WASD bevægelse (førsteperson)
- Mus-look (Pointer Lock)
- Venstreklik = hakke på klipper/ressourcer
- Simpel grotte-følelse (vægge, loft, gulv)
- Start med én interaktiv sten/klippe-model

## Implementeringsplan (Fase 1 - Jernkløften)
1. Opret ny komponent `Mine3DScene.tsx`
2. Implementer FPS controls
3. Lav simpel cave geometry (box + noise eller Blender model)
4. Tilføj raycast mining
5. Integrer med eksisterende game state (udvinding af ressourcer)

## Senere Udvidelser
- Forskellige mine-temaer (farver, lys, størrelse)
- Flere interaktive objekter
- Procedurale elementer
- osv.

(Detaljeret indhold følger i den rigtige fil)