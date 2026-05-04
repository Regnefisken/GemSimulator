# Migrationsplan: Vanilla TS → React + React Three Fiber

## Kontekst

Nuværende stack:
- **Vite** + **TypeScript** (ingen framework)
- **Three.js** (imperativ klasse `VoxelGemView`)
- **Tailwind CSS v4**
- Al DOM-manipulation sker i `src/main.ts` via `innerHTML` og `createElement`

Målstack:
- **React 19** + **ReactDOM** (UI-lag)
- **React Three Fiber (R3F)** + **@react-three/drei** (3D-scene deklarativt)
- **Tailwind CSS v4** (uændret)
- Alle `data/`-, `types.ts`- og `gem/generate.ts`/`draw2d.ts`-filer **bevares uændret**

---

## Beslutninger (alle afklaringer besvaret)

| # | Emne | Beslutning | Begrundelse |
|---|---|---|---|
| A | Samlingen overlever reload | **Ja — localStorage** | `collection` serialiseres til `localStorage` ved hver ændring og indlæses ved opstart |
| B | Rotation af 3D-sten | **Auto-rotation + manuel drag** | `OrbitControls` fra `@react-three/drei`: autoroterer på Y-aksen, pauser ved museklik og genoptager ved slip |
| C | Klik på 3D-sten → ny sten | **Nej** | — |
| D | 700ms preload-forsinkelse | **Droppes** | Se begrundelse nedenfor |
| E | `confirm()` til "Ryd" | **Bevares** | Se begrundelse nedenfor |

### D — Hvorfor droppe 700ms-forsinkelsen

Den nuværende forsinkelse var et pragmatisk trick i imperativ kode for at undgå at 5 `createElement`-kald blokkerede den første DOM-render. I React er dette irrelevant: state-opdateringer batches automatisk, og `useState` initializer kører synkront én gang. Med localStorage gælder desuden:

- **Nye besøgende:** Samlingen initialiseres med 1 genereret sten + 5 preloads i én setState-kald. De vises alle på samme render — ingen visuel forskel.
- **Tilbagevendende besøgende:** Samlingen indlæses fra localStorage øjeblikkeligt. Preloads genereres **ikke** igen — de gemte sten vises med det samme.

Der er ingen visuelt gevinst ved forsinkelsen i React. Den droppes.

### E — Hvorfor beholde `confirm()`

"Ryd"-funktionen er planlagt til at blive fjernet i spillet. At bygge en custom React-modal til en midlertidig funktion er spild. `confirm()` er zero-code, fungerer perfekt og fjernes når knappen fjernes.

---

## Trin 1 — Installer nye afhængigheder

```bash
npm install react react-dom @react-three/fiber @react-three/drei
npm install -D @types/react @types/react-dom @vitejs/plugin-react
```

`three` og `@types/three` er allerede installeret og bevares.

---

## Trin 2 — Opdater Vite-konfigurationen

Opret eller opdater `vite.config.ts`:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

---

## Trin 3 — Entry point

### `index.html`
Ingen ændring nødvendig. `<div id="app">` bruges stadig.
Opdater blot script-src fra `src/main.ts` til `src/main.tsx`.

### `src/main.tsx` (erstatter `src/main.ts`)

```tsx
import './style.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

---

## Trin 4 — Filstruktur efter migration

```
src/
  main.tsx                    ← entry (nyt, erstatter main.ts)
  App.tsx                     ← rod-komponent med al state (nyt)
  style.css                   ← uændret
  types.ts                    ← uændret
  data/
    magic.ts                  ← uændret
    palettes.ts               ← uændret
    templates.ts              ← uændret
  gem/
    generate.ts               ← uændret
    draw2d.ts                 ← uændret
    voxelScene.ts             ← SLETTES (erstattes af VoxelScene.tsx)
  lib/
    storage.ts                ← nyt (localStorage-hjælpefunktioner)
  components/
    Header.tsx                ← nyt
    GemViewer.tsx             ← nyt (wrapper med glow-lag, navn, tid, knapper)
    VoxelScene.tsx            ← nyt (R3F Canvas + instanced mesh + OrbitControls)
    GemCard.tsx               ← nyt (samlings-kort med 2D canvas)
    Collection.tsx            ← nyt (grid af GemCard)
```

---

## Trin 5 — `src/lib/storage.ts`

```ts
import type { Gem } from '../types'

const KEY = 'gem-collection'

export function loadCollection(): Gem[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Gem[]) : []
  } catch {
    return []
  }
}

export function saveCollection(gems: Gem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(gems))
  } catch {
    // localStorage kan være utilgængelig (f.eks. privat tilstand med fuld kvota)
  }
}
```

---

## Trin 6 — `src/App.tsx` (rod-komponent og state)

`App.tsx` erstatter al state og logik fra `main.ts`.

### State-initialisering

```tsx
// Indlæs gemt samling synkront (én gang ved mount)
const [collection, setCollection] = useState<Gem[]>(() => loadCollection())

// Vis seneste gemte sten med det samme, eller null
const [currentGem, setCurrentGem] = useState<Gem | null>(() => {
  const saved = loadCollection()
  return saved[0] ?? null
})
```

### Første-besøg logik (useEffect)

```tsx
useEffect(() => {
  setCollection(prev => {
    if (prev.length === 0) {
      // Første besøg: generer én rigtig sten + 5 preloads synkront
      const first = createRandomGem()
      const preloads = Array.from({ length: 5 }, (_, i) => createPreloadGem(i))
      setCurrentGem(first)
      return [first, ...preloads]
    }
    // Tilbagevendende bruger: samlingen vises som den er fra localStorage
    return prev
  })
}, [])
```

### Gem til localStorage ved hver ændring

```tsx
useEffect(() => {
  saveCollection(collection)
}, [collection])
```

### Handlinger

```tsx
function handleGenerate() {
  const gem = createRandomGem()
  setCurrentGem(gem)
  setCollection(prev => [gem, ...prev].slice(0, 40))
}

function handleSelectGem(gem: Gem) {
  setCurrentGem(gem)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleDownload() {
  if (!currentGem || !voxelRef.current) return
  const url = voxelRef.current.toDataURL()
  const a = document.createElement('a')
  let filename = currentGem.name.replace(/ /g, '_')
  if (currentGem.magicProperty) filename += `_${currentGem.magicProperty.name}`
  a.download = `${filename}_${currentGem.timestamp}.png`
  a.href = url
  a.click()
}

function handleClear() {
  if (confirm('Slet hele samlingen?')) {
    setCollection([])
  }
}
```

### JSX-struktur

```tsx
<div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
  <Header templateCount={TEMPLATES.length} />
  <GemViewer
    gem={currentGem}
    voxelRef={voxelRef}
    onGenerate={handleGenerate}
    onDownload={handleDownload}
  />
  {collection.length > 1 && (
    <Collection gems={collection} onSelect={handleSelectGem} onClear={handleClear} />
  )}
</div>
```

---

## Trin 7 — UI-komponenter

### `src/components/Header.tsx`

Direkte port af `<header>`-blokken. Modtager `templateCount` som prop.

```tsx
export default function Header({ templateCount }: { templateCount: number }) {
  return (
    <header className="text-center space-y-4">
      <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent tracking-tighter">
        Den Magiske Ædelstens Smedje
      </h1>
      <p className="text-slate-400 max-w-md mx-auto text-lg">
        14 ædelstenstyper •{' '}
        <span>{templateCount}</span> former • Guldklumper •{' '}
        <span className="text-fuchsia-400">Magiske Egenskaber</span>
      </p>
    </header>
  )
}
```

### `src/components/GemViewer.tsx`

Props: `gem: Gem | null`, `voxelRef`, `onGenerate`, `onDownload`.

Al logik fra `renderCurrentGem()` i `main.ts` porteres som rene beregninger på `gem`-prop (ingen DOM-manipulation):

- Stjerne-prefix beregnes til JSX: `★`, `★★★`, `★★★★ {karat}K`, `✦`
- Magic-badge: `<span className={gem.magicProperty.color}>...</span>`
- Glow-lag: `style={{ backgroundColor: glowColor }}` + className `gem-glow` / `glow-radioactive`
- Opacity styres af `purity` og `isGodTier`

```tsx
export default function GemViewer({ gem, voxelRef, onGenerate, onDownload }) {
  // Beregn glow-farve og CSS-klasse
  const glowColor = gem?.magicProperty
    ? gem.magicProperty.glow
    : gem?.colorMap?.G ?? '#eab308'

  const glowOpacity = gem?.magicProperty
    ? 0.6
    : (gem?.purity === 4 || gem?.purity === 3 || gem?.isGodTier ? 0.48 : 0.25)

  const glowClass = gem?.magicProperty?.name === 'Radioaktiv'
    ? 'glow-radioactive'
    : (gem?.purity >= 3 || gem?.isGodTier || gem?.magicProperty ? 'gem-glow' : '')

  return (
    <section className="flex flex-col items-center">
      <div className="relative gem-container bg-slate-800 p-8 rounded-3xl border-4 border-slate-700 shadow-2xl w-fit">
        {/* Glow-lag */}
        <div
          className={`absolute inset-0 blur-3xl rounded-3xl pointer-events-none transition-all ${glowClass}`}
          style={{ backgroundColor: glowColor, opacity: glowOpacity }}
        />
        <div className="relative z-10 flex flex-col items-center">
          {/* 3D-canvas */}
          <div className="bg-slate-950 p-5 rounded-2xl shadow-inner border border-slate-600 mb-6 relative">
            {gem ? (
              <VoxelScene ref={voxelRef} data={gem.data} colorMap={gem.colorMap} />
            ) : (
              <div className="w-[320px] h-[320px]" />
            )}
          </div>
          {/* Navn + badge + tid + download */}
          {gem && <GemInfo gem={gem} onDownload={onDownload} />}
        </div>
      </div>

      {/* Generer-knap */}
      <button
        type="button"
        onClick={onGenerate}
        className="mt-10 px-10 py-5 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white font-bold text-xl rounded-3xl shadow-2xl flex items-center gap-x-4 transition-all active:scale-95"
      >
        {/* SVG-ikon bevares fra nuværende kode */}
        <span>Slib Ny Ædelsten</span>
      </button>
    </section>
  )
}
```

`GemInfo` er en lille intern komponent (eller inline JSX) der viser navn med stjerner, magic-badge og timestamp. Al nuværende HTML-string-logik fra `renderCurrentGem()` porteres 1:1 til betinget JSX.

### `src/components/Collection.tsx`

```tsx
export default function Collection({ gems, onSelect, onClear }) {
  return (
    <section className="pt-8 border-t border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-semibold flex items-center gap-3">
          <span className="text-amber-400">✦</span>
          Din Samling
          <span className="text-slate-400 text-sm font-mono bg-slate-800 px-3 py-0.5 rounded-full">
            ({gems.length})
          </span>
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-xs px-4 py-2 text-slate-400 hover:text-slate-300 flex items-center gap-1"
        >
          {/* SVG X-ikon bevares */}
          Ryd
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {gems.map((gem, i) => (
          <GemCard key={gem.id} gem={gem} isNewest={i === 0} onClick={() => onSelect(gem)} />
        ))}
      </div>
    </section>
  )
}
```

### `src/components/GemCard.tsx`

Bruger `useRef<HTMLCanvasElement>` + `useEffect` til at kalde den uændrede `drawGem()`:

```tsx
import { useRef, useEffect } from 'react'
import { drawGem } from '../gem/draw2d'
import type { Gem } from '../types'

interface Props { gem: Gem; isNewest: boolean; onClick: () => void }

export default function GemCard({ gem, isNewest, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) drawGem(canvasRef.current, gem.data, gem.colorMap, 5)
  }, [gem])

  const isRadioaktiv = gem.magicProperty?.name === 'Radioaktiv'
  const borderClass = isRadioaktiv
    ? 'border-lime-500/50 hover:border-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.3)]'
    : 'border-slate-700 hover:border-slate-500'

  let displayName = gem.name
  if (gem.purity === 4 && gem.karat) displayName = `★★★★ ${gem.karat}K ${displayName}`
  else if (gem.purity === 3) displayName = `★★★ ${displayName}`
  else if (gem.purity === 1) displayName = `★ ${displayName}`

  return (
    <div
      onClick={onClick}
      className={`group bg-slate-800/70 hover:bg-slate-700 border rounded-2xl p-3 cursor-pointer transition-all flex flex-col items-center ${borderClass} ${isNewest ? 'ring-2 ring-amber-400/60' : ''}`}
    >
      <canvas
        ref={canvasRef}
        width={80}
        height={80}
        className="pixelated mb-3 group-hover:scale-105 transition-transform"
      />
      <div className="text-xs font-medium text-center leading-tight text-slate-300 group-hover:text-white">
        {displayName}
        {gem.magicProperty && (
          <div className={`text-[10px] mt-1 font-bold ${isRadioaktiv ? 'text-lime-400 animate-pulse' : 'text-slate-400'}`}>
            {gem.magicProperty.icon} {gem.magicProperty.name}
          </div>
        )}
      </div>
      <div className="text-[10px] font-mono text-slate-500 mt-1">{gem.timestamp}</div>
    </div>
  )
}
```

---

## Trin 8 — `src/components/VoxelScene.tsx`

Dette er den teknisk mest centrale del. Erstatter `src/gem/voxelScene.ts` fuldt ud.

### Hvad der bevares præcist

| Parameter | Nuværende værdi |
|---|---|
| Kamera | `OrthographicCamera`, position `(0,0,18)`, dynamisk frustum |
| Initial X-tilt på gruppe | `rotation.x = 0.3` |
| Boks geometri | `BoxGeometry(0.9, 0.9, 0.7)` |
| Material | `MeshStandardMaterial`, `roughness:0.4`, `metalness:0.15`, `flatShading:true` |
| Ambient lys | intensitet `0.58` |
| Key lys | `DirectionalLight(#fff, 0.9)`, pos `(5,8,10)` |
| Rim lys | `DirectionalLight(#c7d2fe, 0.32)`, pos `(-6,-3,-4)` |
| Renderer | `antialias:false`, `pixelRatio:1`, `preserveDrawingBuffer:true` |
| Baggrund | `#020617` |
| Canvas-størrelse | `320×320` |

**Ændring:** Den faste Y-rotation `-0.45` på gruppen fjernes. `OrbitControls` starter med en tilsvarende startposition og tager herefter over for Y-aksen.

### Rotation-adfærd med OrbitControls

`@react-three/drei`'s `OrbitControls` er den kanoniske løsning til netop dette mønster:

- `autoRotate={autoRotate}` — sætter Y-rotation i gang hver frame via `useFrame` internt i drei
- `autoRotateSpeed={1.5}` — ca. én omgang per 4 sekunder (justerbart)
- `enableZoom={false}` — ingen scroll-zoom
- `enablePan={false}` — ingen pan
- `onStart={() => setAutoRotate(false)}` — pauser auto-rotation ved mousedown
- `onEnd={() => setAutoRotate(true)}` — genoptager auto-rotation ved mouseup/mouseleave

```tsx
const [autoRotate, setAutoRotate] = useState(true)

<OrbitControls
  enableZoom={false}
  enablePan={false}
  autoRotate={autoRotate}
  autoRotateSpeed={1.5}
  onStart={() => setAutoRotate(false)}
  onEnd={() => setAutoRotate(true)}
/>
```

Musen viser automatisk `grab`/`grabbing`-cursor via OrbitControls' interne pointer-håndtering.

### Komplet komponent

```tsx
// src/components/VoxelScene.tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { ColorMap } from '../types'

const dummy = new THREE.Object3D()
const _color = new THREE.Color()
const MAX_INSTANCES = 320

function VoxelMesh({ data, colorMap }: { data: string[]; colorMap: ColorMap }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !data.length) return
    const h = data.length
    const w = data[0].length
    let idx = 0
    outer: for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = data[y][x]
        if (ch === '.') continue
        if (idx >= MAX_INSTANCES) break outer
        dummy.position.set(x - (w - 1) / 2, -y + (h - 1) / 2, 0)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(idx, dummy.matrix)
        _color.set(colorMap[ch] ?? '#000000')
        mesh.setColorAt(idx, _color)
        idx++
      }
    }
    mesh.count = idx
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [data, colorMap])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_INSTANCES]}>
      <boxGeometry args={[0.9, 0.9, 0.7]} />
      <meshStandardMaterial roughness={0.4} metalness={0.15} flatShading />
    </instancedMesh>
  )
}

function AdaptiveCamera({ data }: { data: string[] }) {
  const { camera } = useThree()
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    const w = data[0]?.length ?? 16
    const h = data.length ?? 16
    const pad = 1.15
    cam.left   = -(w / 2) * pad
    cam.right  =  (w / 2) * pad
    cam.top    =  (h / 2) * pad
    cam.bottom = -(h / 2) * pad
    cam.updateProjectionMatrix()
  }, [data, camera])
  return null
}

function Scene({
  data,
  colorMap,
  glRef,
}: {
  data: string[]
  colorMap: ColorMap
  glRef: React.MutableRefObject<THREE.WebGLRenderer | null>
}) {
  const { gl } = useThree()
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    glRef.current = gl
  }, [gl, glRef])

  return (
    <>
      <AdaptiveCamera data={data} />
      <group rotation={[0.3, 0, 0]}>
        <VoxelMesh data={data} colorMap={colorMap} />
      </group>
      <ambientLight intensity={0.58} />
      <directionalLight color="#ffffff" intensity={0.9} position={[5, 8, 10]} />
      <directionalLight color="#c7d2fe" intensity={0.32} position={[-6, -3, -4]} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
        onStart={() => setAutoRotate(false)}
        onEnd={() => setAutoRotate(true)}
      />
    </>
  )
}

export type VoxelSceneHandle = { toDataURL: () => string }

const VoxelScene = forwardRef<VoxelSceneHandle, { data: string[]; colorMap: ColorMap }>(
  ({ data, colorMap }, ref) => {
    const glRef = useRef<THREE.WebGLRenderer | null>(null)

    useImperativeHandle(ref, () => ({
      toDataURL: () => glRef.current?.domElement.toDataURL('image/png') ?? '',
    }))

    return (
      <Canvas
        orthographic
        camera={{ position: [0, 0, 18], near: 0.1, far: 60 }}
        gl={{ antialias: false, preserveDrawingBuffer: true }}
        dpr={1}
        style={{ width: 320, height: 320 }}
        className="pixelated block"
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x020617))}
      >
        <Scene data={data} colorMap={colorMap} glRef={glRef} />
      </Canvas>
    )
  }
)

export default VoxelScene
```

**Bemærk:** `Scene` er en separat indre komponent fordi `useThree()` kun virker inde i en R3F `<Canvas>`. `glRef` sendes ind for at `toDataURL` kan tilgå rendereren udefra.

---

## Trin 9 — `style.css`

Ingen ændringer. Alle klasser (`.pixelated`, `.gem-glow`, `.glow-radioactive`, `.star-3`, `.gem-container`) bevares og bruges i JSX.

---

## Trin 10 — `tsconfig.json`

Sørg for at JSX er aktiveret:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

---

## Trin 11 — Slet udgåede filer

- `src/gem/voxelScene.ts` — erstattes fuldt af `src/components/VoxelScene.tsx`
- `src/main.ts` — erstattes af `src/main.tsx`

---

## Rækkefølge til Composer

Implementer i nøjagtig denne rækkefølge. Hvert trin bør kunne verificeres med `npm run dev` inden næste påbegyndes.

1. **Deps + config:** `npm install`, opdater `vite.config.ts`, opdater `tsconfig.json`
2. **Entry:** Opret `src/main.tsx`, opdater `index.html` (script-src)
3. **Storage:** Opret `src/lib/storage.ts`
4. **Header:** Opret `src/components/Header.tsx`
5. **GemCard:** Opret `src/components/GemCard.tsx`
6. **Collection:** Opret `src/components/Collection.tsx`
7. **VoxelScene:** Opret `src/components/VoxelScene.tsx`
8. **GemViewer:** Opret `src/components/GemViewer.tsx`
9. **App:** Opret `src/App.tsx`
10. **Ryd op:** Slet `src/main.ts` og `src/gem/voxelScene.ts`
