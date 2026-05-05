# ✨ Visuel Forbedring af GemSimulator

Denne fil indeholder **top 10 konkrete ideer** til at gøre spillet markant mere visuelt appellerende og premium. Den indeholder også en **færdig, stærk prompt** du kan kopiere direkte til Claude.

## 📋 Top 10 Visuelle Forbedringsideer

1. **Avancerede Gem Shaders & Materialer**  
   Implementer custom Three.js shaders med refraction, chromatic dispersion, iridescence, subsurface scattering og environment mapping, så ædelstenene ser ægte glas/ædelsten-agtige ud.

2. **Rigelige Particle Effects**  
   Tilføj kraftfulde particle systemer ved mining, indsamling og specielle gems — sparkles, magisk støv, farvede lysglimt og floating particles.

3. **Dynamic + Colored Lighting**  
   Hver gem-type udsender sit eget farvede lys. Tilføj pulsing glow, rim lighting og point lights der reagerer på gemmens egenskaber.

4. **Post-Processing Stack**  
   Brug EffectComposer med: Unreal Bloom, Vignette, Chromatic Aberration, God Rays (volumetric light), subtle Film Grain og Color Grading.

5. **Forbedret Miljø / Scene**  
   Lav en mere levende mine/hule baggrund med parallax, atmospheric fog, stalactites, subtle ambient animations og bedre depth.

6. **Smooth & Cinematic Camera**  
   Forbedrede OrbitControls med damping, auto-rotate når inaktiv, og mulighed for cinematic camera angles ved sjældne fund.

7. **Poleret & Moderne UI**  
   Brug glassmorphism, neon/glow effekter, micro-animations på knapper, bedre typografi, hover states og progress bars med visuel feedback.

8. **Flot Collection / Gallery System**  
   Lav en dedikeret 3D inventory/grid hvor gems kan inspiceres fra alle vinkler med høj kvalitet preview.

9. **Rarity & Special Effects**  
   Kraftige visuelle belønninger ved høj-rarity gems: screen shake, lens flares, confetti, rainbow trails, slow-motion osv.

10. **Små Atmosfæriske Detaljer**  
    Tilføj floating dust particles i luften, gentle bob/rotation animation på gems, refleksioner i gulvet/vægge og bedre shadows.

---

## 🚀 Klar Prompt til Claude

**Kopier hele teksten nedenfor og indsæt direkte til Claude:**

```
Du er ekspert i Three.js, Vite + TypeScript og visuel polering af web-baserede 3D-spil.

Jeg har et eksisterende projekt kaldet GemSimulator — et 3D voxel ædelstens mining/simulator spil.

Jeg vil have dig til at hjælpe mig med at løfte det visuelle niveau markant, så det føles premium og meget mere appellerende.

Her er 10 konkrete visuelle forbedringsområder jeg gerne vil have prioriteret (i prioriteret rækkefølge):

1. Avancerede Gem Shaders & Materialer (refraction, dispersion, iridescence, subsurface scattering)
2. Rigelige particle effects ved mining og collection
3. Dynamic colored lighting + pulsing glows
4. Post-processing (Bloom, Vignette, Chromatic Aberration, God Rays osv.)
5. Bedre miljø og atmospheric scene
6. Forbedret kamera og smooth animationer
7. Moderne, poleret UI/UX med glassmorphism og micro-animations
8. Flot 3D collection/gallery view
9. Stærke rarity/special effects
10. Små atmosfæriske detaljer (dust, gentle animations, reflections)

Projektet bruger: Three.js, TypeScript, Vite og Tailwind.

Giv mig en trinvis, professionel plan for hvordan vi kan implementere disse forbedringer. Prioritér de ændringer der giver størst visuel impact først. Inkluder kodeeksempler hvor relevant, især til shaders og post-processing.
```

---

**Fil oprettet:** `VISUAL_ENHANCEMENT_IDEAS.md`

Du kan nu `git pull` for at hente filen lokalt.
