# Implementeringsplan: Indstillingsmenu (øverste højre hjørne)

## Overblik

Tilføj et tandhjul-ikon og en fuldskærmsknap i `LevelBadge.tsx`'s top-bar. Tandhjulet åbner et dropdown-panel med tre sektioner: **Nulstil gem**, **Skærmindstillinger** og **Om spillet**. Nulstilling kræver en bekræftelses-dialog. Fuldskærm bruger browser-native Fullscreen API.

---

## 1. Ny komponent: `src/components/layout/SettingsMenu.tsx`

Oprettes som en selvstændig komponent og importeres i `LevelBadge.tsx`.

### Props

```ts
type Props = {
  onClose: () => void
}
```

### Struktur (JSX-skelet)

```tsx
<div> {/* Overlay – klik udenfor lukker menuen */}
  <div> {/* Panel – fast bredde, fixed position under tandhjulet */}

    {/* ── Sektion 1: Gem ── */}
    <section>
      <h3>💾 Gem</h3>
      <button onClick={handleResetClick}>
        🗑️ Nulstil fremskridt
      </button>
    </section>

    <hr />

    {/* ── Sektion 2: Skærmindstillinger ── */}
    <section>
      <h3>🖥️ Skærmindstillinger</h3>
      <p className="...placeholder-style...">Kommer snart</p>
    </section>

    <hr />

    {/* ── Sektion 3: Om spillet ── */}
    <section>
      <h3>ℹ️ Om spillet</h3>
      <p className="...placeholder-style...">Kommer snart</p>
    </section>

  </div>
</div>

{/* ── Bekræftelsesdialog (vises kun når resetPending === true) ── */}
{resetPending && (
  <div> {/* Modal overlay */}
    <div> {/* Dialog-boks */}
      <p>⚠️ Er du sikker? Alt fremskridt slettes permanent.</p>
      <button onClick={confirmReset}>Ja, nulstil</button>
      <button onClick={() => setResetPending(false)}>Annuller</button>
    </div>
  </div>
)}
```

### Intern state

```ts
const [resetPending, setResetPending] = useState(false)
```

### Reset-logik

```ts
function handleResetClick() {
  setResetPending(true)
}

function confirmReset() {
  localStorage.removeItem('gem-game-state')
  localStorage.removeItem('gem-collection') // legacy nøgle
  window.location.reload()
}
```

> **Vigtigt:** Begge localStorage-nøgler (`'gem-game-state'` og `'gem-collection'`) ryddes, så ingen gammel data lækker ind. Derefter genindlæses siden så `seedState()` starter frisk.

---

## 2. Ændringer i `src/components/layout/LevelBadge.tsx`

### 2a. Tilføj state og handler

```ts
const [settingsOpen, setSettingsOpen] = useState(false)
```

### 2b. Fuldskærmsfunktion

```ts
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

const [isFullscreen, setIsFullscreen] = useState(false)

useEffect(() => {
  function onFsChange() {
    setIsFullscreen(!!document.fullscreenElement)
  }
  document.addEventListener('fullscreenchange', onFsChange)
  return () => document.removeEventListener('fullscreenchange', onFsChange)
}, [])
```

### 2c. Tilføj knapper i top-bar

Placér de to nye knapper i den eksisterende `ml-auto`-container, **efter** lyd-knappen og **før** guld/rep-badges:

```tsx
{/* Fuldskærm */}
<button
  type="button"
  onClick={toggleFullscreen}
  className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg border border-slate-600 bg-slate-800/80 text-lg leading-none hover:bg-slate-700"
  title={isFullscreen ? 'Forlad fuldskærm' : 'Fuldskærm'}
  aria-label={isFullscreen ? 'Forlad fuldskærm' : 'Fuldskærm'}
>
  {isFullscreen ? '⛶' : '⛶'} {/* eller SVG-ikon */}
</button>

{/* Tandhjul / Indstillinger – relativt positioneret for dropdown */}
<div className="relative">
  <button
    type="button"
    onClick={() => setSettingsOpen((o) => !o)}
    className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg border border-slate-600 bg-slate-800/80 text-lg leading-none hover:bg-slate-700"
    title="Indstillinger"
    aria-label="Åbn indstillinger"
    aria-expanded={settingsOpen}
  >
    ⚙️
  </button>

  {settingsOpen && (
    <SettingsMenu onClose={() => setSettingsOpen(false)} />
  )}
</div>
```

> Knap-rækkefølge i top-baren (venstre → højre):
> `Lyd` · `Fuldskærm` · `Indstillinger` · `🪙 Guld` · `✦ Rep`

---

## 3. Styling-retningslinjer (Tailwind)

| Element | Klasser |
|---|---|
| Dropdown-panel | `absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-700 bg-slate-950/98 shadow-2xl backdrop-blur-md p-3 flex flex-col gap-2` |
| Overlay (lukker ved klik udenfor) | `fixed inset-0 z-40` (transparent, ingen baggrund) |
| Sektion `<h3>` | `text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1` |
| Reset-knap | `w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors` |
| Placeholder-tekst | `text-xs text-slate-600 italic px-3 py-1` |
| `<hr>` | `border-slate-800` |
| Bekræftelses-modal overlay | `fixed inset-0 z-[60] bg-black/60 flex items-center justify-center` |
| Bekræftelses-boks | `w-[min(90vw,360px)] rounded-xl border border-amber-500/30 bg-slate-900 p-5 flex flex-col gap-4 shadow-2xl` |
| Advarselstekst | `text-sm text-slate-300` |
| Bekræft-knap | `px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold` |
| Annuller-knap | `px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm` |

---

## 4. Filer der skal oprettes / ændres

| Fil | Handling |
|---|---|
| `src/components/layout/SettingsMenu.tsx` | **Opret** – ny komponent |
| `src/components/layout/LevelBadge.tsx` | **Rediger** – tilføj state, knapper og import |

Ingen andre filer behøver at røres. `App.tsx`, `AppShell.tsx` og `gameState.ts` er uberørte; reset sker udelukkende via `localStorage.removeItem` + `window.location.reload()`.

---

## 5. Rækkefølge for implementering

1. Opret `SettingsMenu.tsx` med intern reset-logik og placeholders.
2. Opdater `LevelBadge.tsx` med fuldskærm-state, knapper og `<SettingsMenu>`.
3. Verificer visuelt at overlay-klik lukker menuen, og at bekræftelsesdialogen vises korrekt.
4. Test reset: bekræft at `localStorage` ryddes og siden genindlæses til tom state.
