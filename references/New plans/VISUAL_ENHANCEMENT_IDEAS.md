# Visual Enhancement Ideas (aligned with current game)

This list is updated for the present GemSimulator build with:
- map-driven location flow
- mining + smithy + shop + jewelry workshop
- inventory tabs and achievement feedback

Focus is "high impact per effort" without breaking current performance profile.

## Top 10 visual upgrades (next pass)

1. **Location identity color grading**
   - Give each mine area a subtle unique grade (warm/cold/arcane), while keeping UI readable.
   - Reuse this identity in map cards and in-scene accents.

2. **Rarity-tiered hit and drop VFX**
   - Add lightweight particle variants by rarity and event type (normal break, rare drop, unlock).
   - Keep particle budgets fixed to avoid mobile spikes.

3. **Gem material refinement for voxel style**
   - Improve emissive/specular response per gem family before moving to heavy custom shaders.
   - Preserve pixel readability at small card sizes.

4. **Post-processing preset integration**
   - Extend existing render presets with conservative bloom/contrast options.
   - Keep one "performance-safe" preset as default.

5. **Mine scene depth pass**
   - Add low-cost depth cues: layered fog bands, distant silhouettes, subtle parallax movement.
   - Prioritize clarity of breakable rock and damage feedback.

6. **Event camera micro-motions**
   - Add tiny camera impulses for strong actions (critical break, level up, achievement).
   - Cap intensity and duration to avoid motion fatigue.

7. **UI animation polish**
   - Introduce consistent micro-animations for tab switches, button press states, and toast entry/exit.
   - Match pacing across map, shop, and workshop screens.

8. **Inventory and preview cohesion**
   - Align 2D pixel cards and 3D preview lighting so items feel part of the same visual system.
   - Improve visual hierarchy for "selected" and "newly crafted" items.

9. **Reward moments for progression milestones**
   - Add stronger but short-lived visuals for location unlocks, achievement unlocks, and jewelry sales.
   - Keep these moments skippable and non-blocking.

10. **Atmospheric idle details**
    - Add restrained ambient particles and glow breathing in hub screens.
    - Ensure no clutter that competes with key gameplay info.

## Suggested rollout
1. Presets + rarity VFX + UI micro-animations (items 2, 4, 7)  
2. Scene depth + material pass (items 3, 5, 8)  
3. Milestone moments + ambient layer (items 6, 9, 10)
