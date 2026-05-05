# Drop-notits ved knust klippe — `RockDropBanner`

## Mål

Når en klippe knuses skal spilleren straks se en lille, klar notits direkte under 3D-lærredet med:
- Hvad der droppede (type + navn + mængde + rarity-farve)
- Eventuel bonus-essens som en sekundær linje
- "Ingen fund" ved `nothing`-drop
- Auto-forsvinder efter ~2,5 s med fade-ud

Notitsen erstattes på sigt af en 3D-partikelfeedback, men er designet så det er **nemt at skille ud** — al logik ligger i ét isoleret komponent.

---

## Arkitektur

```
src/components/mine/
  RockDropBanner.tsx   ← NY  (ren præsentation; modtager notice-objekt)
  MineScreen.tsx       ← ændres (state + push notice)
src/style.css          ← tilføj én keyframe (drop-banner-enter)
```

**Ingen** nye globale typer, reducers eller dispatchhandlere.

---

## Typen `DropNotice`

Defineres **lokalt** i `MineScreen.tsx` (ikke i `types.ts`) fordi det er ren UI-state:

```ts
type DropNotice = {
  id: number
  drop: MineDrop          // allerede importeret
  essenceId: string | null
  essenceName: string | null
}
```

---

## `RockDropBanner.tsx` — fuld spec

### Props

```ts
type Props = { notice: DropNotice }
```

### Visuel layout

```
┌─────────────────────────────────────────────┐
│  IKON  Titel (fed)             [rarity-badge]│
│        Underline: essens (hvis til stede)    │
└─────────────────────────────────────────────┘
```

Placeret som absolut overlay i bunden af `<div className="relative">` der
indeholder `Rock3DScene` — altså **inde i** klippe-boksen, men over lærredet.

### Drop → visning

| `drop.kind`     | Icon | Titel                              | Badge-farve       |
|-----------------|------|------------------------------------|-------------------|
| `ore`           | ⛏️   | `{qty}× {metalName} malm`          | `text-blue-300`   |
| `nugget`        | 🔩   | `{qty}× {metalName} klump`         | `text-yellow-300` |
| `rough-stone`   | 🪨   | `Rå klippe ({quality-label})`      | rarity-farve (se nedenfor) |
| `gem`           | ✦    | `Ædelsten fundet!`                 | `text-fuchsia-300`|
| `nothing`       | —    | `Ingen fund`                       | `text-slate-500`  |

**Quality-label til rå klippe:**
- `crude` → "grov" (slate-400)
- `fine` → "fin" (emerald-300)
- `pristine` → "uberørt" (amber-300)

**Gem-varianter:**
- Er `isGodTier` → badge "GUDDOMMELIG" med `text-fuchsia-300`
- Ellers → badge "Sjælden"

### Essens-linje (sekundær)
Vises kun hvis `essenceName != null`:
```
  🌟 Essens: {essenceName}   (text-cyan-300, text-xs)
```

### Animation

**Enter:** slide op fra bunden + fade in (`drop-banner-enter`, 250 ms ease-out).  
**Exit:** fade ud via `opacity-0 transition-opacity duration-500` — udløses af
en `useEffect` der sætter `leaving=true` 2000 ms efter mount.

Komponenten renders kun når `notice != null`, så der er ingen
"tom container" i DOM'et når der ikke er noget at vise.

### Styling (Tailwind)

```
absolute bottom-3 left-3 right-3 z-20
rounded-xl border bg-slate-900/90 backdrop-blur-sm px-4 py-3
flex items-start gap-3
animate-drop-banner-enter
transition-opacity duration-500
pointer-events-none
```

Border-farve varierer med drop-type:
- ore → `border-blue-700/60`
- nugget → `border-yellow-700/60`
- rough-stone → `border-slate-600/60`
- gem → `border-fuchsia-600/70`
- nothing → `border-slate-700/40`

---

## Ændringer i `MineScreen.tsx`

### Ny state

```ts
const noticeId = useRef(0)
const [dropNotice, setDropNotice] = useState<DropNotice | null>(null)
```

### Push notice ved knust klippe

Indsættes i `handleMineHit` **efter** `applyDrop` og essens-dispatch:

```ts
// Byg notice
const ess = bonusEss ? getEssenceDef(bonusEss) : null
setDropNotice({
  id: noticeId.current++,
  drop,
  essenceId: bonusEss ?? null,
  essenceName: ess?.name ?? null,
})
```

Fjern:
- `setWow(...)` / `wow`-state og det store fullscreen-overlay (erstattes af banneret)
- `showToast(...)` for essens-fund (vises nu i banneret)
- Toast for "lager fuldt" beholdes (det er en fejltilstand, ikke et drop)

### Render

Inden i `<div className="relative">` der allerede indeholder `Rock3DScene`:

```tsx
<div className="relative">
  <Rock3DScene ... />
  <PickaxeOverlay striking={striking} />
  <DamageNumbers items={floaters} />
  {dropNotice && (
    <RockDropBanner
      key={dropNotice.id}            // ← key tvinger re-mount = ny animation
      notice={dropNotice}
      onDone={() => setDropNotice(null)}
    />
  )}
</div>
```

`onDone`-callback tilføjes som prop til `RockDropBanner` — kaldes når
fade-ud er færdig (efter 2500 ms), så state nulstilles og DOM-elementet fjernes.

---

## CSS — `style.css`

Tilføj én ny keyframe:

```css
@keyframes drop-banner-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-drop-banner-enter {
  animation: drop-banner-enter 250ms ease-out forwards;
}
```

---

## Hvad fjernes / erstattes

| Eksisterende                          | Erstattes af                        |
|---------------------------------------|-------------------------------------|
| `wow` state + `setWow` + fullscreen-overlay | `dropNotice` + `RockDropBanner` |
| `showToast('Essens fundet: ...')`     | Essens-linje i banneret             |
| `playEssenceFound()` kaldt i toast-blok | beholdes, men flyttes til notice-blokken |

---

## Rækkefølge for composer

1. **`src/style.css`** — tilføj `drop-banner-enter` keyframe og `.animate-drop-banner-enter` klasse.
2. **`src/components/mine/RockDropBanner.tsx`** — opret komponent fra spec ovenfor.
3. **`src/components/mine/MineScreen.tsx`** — indsæt `noticeId` ref, `dropNotice` state; byg og push notice i `handleMineHit`; fjern `wow`-state og fullscreen-overlay; fjern toast for essens-fund; render `<RockDropBanner>` inde i `.relative`-wrapperen.
4. Tjek linter — ingen nye dependencies nødvendige.
