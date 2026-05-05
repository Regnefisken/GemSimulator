# ✨ Visuelle Forbedringsideer til GemSimulator

**Formål:** Løfte spillets visuelle oplevelse fra "pænt" til **"wow – det her ser virkelig fedt ud"**.

Denne fil indeholder konkrete, prioriterede ideer til visuel opgradering. Ingen ændringer er lavet i selve spillet – kun denne dokumentationsfil.

## Top 10 Visuelle Forbedringer

1. **Avanceret Belysning og Glow**  
   Dynamic lighting, emissive materials på gems, intens bloom og pulsing glow der matcher renhed og magiske egenskaber.

2. **Rigelige Partikel Effekter**  
   Sparkles, magic particles, crystal shards og dust ved mining. Forskellige effekter afhængig af gem-type og raritet.

3. **Mere Levende og Atmosfærisk Miljø**  
   Skift fra simpelt baggrund til en rigtig mystisk hule med stalaktitter, ambient occlusion, fog og subtilt stemningslys.

4. **Post-Processing & Visual Polish**  
   Bloom, vignette, subtle chromatic aberration, film grain, color grading og god rays (volumetric lighting).

5. **Forbedret Kamera-system**  
   Smooth orbit controls med inertia, cinematic zoom ved sjældne gems, Depth of Field (DoF) og bedre framing.

6. **Animerede og Reaktive Ædelsten**  
   Subtil rotation, breathing/pulsing animation, magiske auras, trails og particle systems baseret på egenskaber.

7. **Moderne og Poleret UI/UX**  
   Glassmorphic/frosted glass interface, animated buttons, hover states, bedre typografi og ikon-design.

8. **Bedre Materialer og Shading**  
   Forbedret voxel rendering med ambient occlusion, bedre normal mapping, refraction og subsurface scattering-lignende effekter på krystaller.

9. **Visuel Feedback & Screen Effects**  
   Screen shake, temporary color flashes, success particles og flotte achievement pop-ups.

10. **Visual Progression & Showcase**  
    Smuk intro scene, 3D collection gallery med roterende gems, high-quality screenshots og share-funktion.

## Klar Prompt til Claude

Du kan kopiere denne prompt direkte til Claude (i Cursor eller Anthropic):

```
Du er en højt specialiseret 3D/UI/UX designer og Three.js ekspert.

Jeg har et eksisterende voxel-baseret ædelstens simulator-spil lavet i TypeScript + Vite + Three.js (repo: Regnefisken/GemSimulator).

Opgave: Gør spillet **markant mere visuelt appellerende** og professionelt – næsten AAA-feeling i indie-stil.

Brug følgende top 10 prioriterede ideer som udgangspunkt (og gerne flere):

1. Avanceret Belysning og Glow  
2. Rigelige Partikel Effekter  
3. Mere Levende og Atmosfærisk Miljø  
4. Post-Processing & Visual Polish  
5. Forbedret Kamera-system  
6. Animerede og Reaktive Ædelsten  
7. Moderne og Poleret UI/UX  
8. Bedre Materialer og Shading  
9. Visuel Feedback & Screen Effects  
10. Visual Progression & Showcase

Giv mig en trinvis plan for implementering, prioriter hvilke ændringer der giver størst visuel impact for mindst arbejde, og foreslå konkrete kode- og Three.js løsninger (shaders, post-processing, particle systems osv.).

Fokuser på performance-venlige løsninger der stadig ser fantastiske ud.
```