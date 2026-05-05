# Mine Events: Implementeringsguide til Composer

**Scope:** Rock-typer, Kiste-events, Kritisk slag, Visuel polish af mine-scene  
**Baseret på:** `MINE_LOOP_OG_VISUEL_POLISH_PLAN.md` + designsession maj 2026  
**Udarbejdet til:** Cursor Composer

---

## Designbeslutninger (opsummering)

| Emne | Beslutning |
|---|---|
| Kiste-trigger | Kisten *erstatter hele klippen* (~5 % spawn-chance). Spilleren ser en 3D-kiste og klikker den åben. |
| Kiste-tiers | Én type nu, indholdet skalerer med dybde/område. Arkitektur designes til fremtidige tiers. |
| Kiste-indhold | Guld (direkte). Struktur åbner for gem, essenser, ingots i v2. |
| Rock-typer | Normal, Hård sten, Rig åre, Krystalvene |
| Rock-visuals | Farveskift på 3D-klippen pr. rock-type. Rød emission-glow + øget rystelse ved <25 % HP. |
| Kritisk slag | 10 % tilfældig chance pr. hug → dobbelt skade + særlig "KRITISK!"-floater |
| Hakke-nicher | Udskydes — fladt system indtil videre |
| Chest-visuals | Simpel 3D-kiste (Three.js BoxGeometry) erstatter Rock3DScene |

---

## Arkitektur-overblik

```
src/types.ts               ← tilføj RockType, RockEvent
src/gem/mining.ts          ← tilføj rollRockEvent(), rollChestReward(), modificer rollMineDrop()
src/lib/gameState.ts       ← tilføj OPEN_CHEST action
src/components/mine/
  MineScreen.tsx           ← rockEvent local state, handleOpenChest, kritisk slag
  Rock3DScene.tsx          ← rockType prop, farvetint, low-HP glow
  ChestScene.tsx           ← NY: 3D kiste-scene
  MineHUD.tsx              ← rockType badge
  DamageNumbers.tsx        ← isCrit variant
  RockDropBanner.tsx       ← 'chest' drop-kind
```

**Vigtig note:** `rockEvent` er **lokal UI-state** i `MineScreen` (ikke persisteret i `GameState`). Den ruller ved hvert nyt dybde-niveau.

---

## Trin 1 — `src/types.ts`

Tilføj følgende typer **efter** `export type ViewMode`:

```typescript
export type RockType = 'normal' | 'hard' | 'rich' | 'crystal' | 'chest'

export type RockEvent = {
  type: RockType
  /** HP-multiplikator ift. normal rockHpForDepth(). Chest = 0 (ingen HP). */
  hpMultiplier: number
}
```

---

## Trin 2 — `src/gem/mining.ts`

### 2a. Udvid `MineDrop`-typen

Tilføj `chest`-variant til union:

```typescript
export type MineDrop =
  | { kind: 'ore'; ore: RawOre }
  | { kind: 'nugget'; nugget: MetalNugget }
  | { kind: 'rough-stone'; stone: RoughStone }
  | { kind: 'gem'; gem: Gem }
  | { kind: 'chest'; gold: number }
  | { kind: 'nothing' }
```

### 2b. Tilføj `rollRockEvent()`

Indsæt **øverst** i filen (efter imports):

```typescript
export type { RockEvent } from '../types'

const ROCK_EVENT_WEIGHTS: Record<RockType, number> = {
  chest:   5,
  hard:   20,
  rich:   15,
  crystal: 10,
  normal: 50,
}

const ROCK_HP_MULTIPLIERS: Record<RockType, number> = {
  normal:  1.0,
  hard:    1.6,
  rich:    1.0,
  crystal: 0.9,
  chest:   0,
}

export function rollRockEvent(area: Area): RockEvent {
  if (area.kind !== 'mine') return { type: 'normal', hpMultiplier: 1.0 }

  const entries = Object.entries(ROCK_EVENT_WEIGHTS) as [RockType, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [type, weight] of entries) {
    if (r < weight) return { type, hpMultiplier: ROCK_HP_MULTIPLIERS[type] }
    r -= weight
  }
  return { type: 'normal', hpMultiplier: 1.0 }
}
```

### 2c. Tilføj `rollChestReward()`

```typescript
export function rollChestReward(area: Area, depth: number): number {
  const base = 10 + depth * 3
  const scaled = Math.floor(base * area.depthMultiplier * (0.8 + Math.random() * 0.4))
  return Math.max(5, scaled)
}
```

### 2d. Modificer `rollMineDrop()` — tilføj `rockType` parameter

Skift signaturen og justér sandsynligheder baseret på rock-type:

```typescript
export function rollMineDrop(
  area: Area,
  depth: number,
  activeCharms: string[] = [],
  rockType: RockType = 'normal',
): MineDrop {
  if (area.kind !== 'mine' || !area.metalPool?.length) {
    return { kind: 'nothing' }
  }

  const r = Math.random()
  const bonus = area.rarityBonus
  const lucky = activeCharms.includes(CHARM_IDS.luckyMiner) ? 0.05 : 0
  const valueCharms = {
    smithEye: activeCharms.includes(CHARM_IDS.smithEye),
    deepCalm: activeCharms.includes(CHARM_IDS.deepCalm),
  }

  // Krystalvene: kraftigt boosted gem + rough-stone, ingen nuggets
  if (rockType === 'crystal') {
    const crystalGem = Math.min(0.18, (0.02 + bonus + lucky) * 3.5)
    const crystalStone = crystalGem + Math.min(0.55, (0.17 + bonus * 0.5 + lucky) * 2.5)
    if (r < crystalGem) return { kind: 'gem', gem: createRandomGem(depth, area, valueCharms) }
    if (r < crystalStone) return { kind: 'rough-stone', stone: rollRoughStone() }
    if (r < 0.75) return { kind: 'ore', ore: rollRawOreFromArea(area, depth) }
    return { kind: 'nothing' }
  }

  // Rig åre: normale tærskler, men dobbelt ore-mængde og ekstra nugget-chance
  const gemThreshold = 0.02 + bonus + lucky
  const nuggetThreshold = gemThreshold + 0.03 + bonus * 0.5 + lucky + (rockType === 'rich' ? 0.06 : 0)
  const stoneThreshold = nuggetThreshold + 0.17 + bonus * 0.5 + lucky
  const oreThreshold = 0.9

  if (r < gemThreshold) return { kind: 'gem', gem: createRandomGem(depth, area, valueCharms) }
  if (r < nuggetThreshold) return { kind: 'nugget', nugget: rollNuggetFromArea(area) }
  if (r < stoneThreshold) return { kind: 'rough-stone', stone: rollRoughStone() }
  if (r < oreThreshold) {
    const ore = rollRawOreFromArea(area, depth, rockType === 'rich')
    return { kind: 'ore', ore }
  }
  return { kind: 'nothing' }
}
```

### 2e. Modificer `rollRawOreFromArea()` — tilføj `isRich` parameter

```typescript
function rollRawOreFromArea(area: Area, _depth: number, isRich = false): RawOre {
  const metal = rollMetalFromPool(area)
  const qty = isRich
    ? 2 + Math.floor(Math.random() * 3)   // 2–4 ved rig åre
    : 1 + Math.floor(Math.random() * 2)   // 1–2 normalt
  return {
    metalName: metal,
    quantity: qty,
    pixelItem: makeOrePixelItem(metal),
  }
}
```

### 2f. Importer `RockType` øverst i filen

Tilføj `RockType` til import-linjen fra `'../types'`:

```typescript
import { MINEABLE_METALS, type ActiveEffect, type Area, type Gem, type MetalName, type MetalNugget, type RawOre, type RoughStone, type RockType } from '../types'
```

---

## Trin 3 — `src/lib/gameState.ts`

### 3a. Tilføj `OPEN_CHEST` til `Action`-typen

```typescript
| { type: 'OPEN_CHEST'; gold: number }
```

### 3b. Tilføj case i `reducer`

```typescript
case 'OPEN_CHEST': {
  let next = applyXpGain({ ...state, gold: state.gold + action.gold, gameNotice: null }, XP_REWARDS.rockBroken)
  return applyEligibleUnlocks(next)
}
```

---

## Trin 4 — `src/components/mine/DamageNumbers.tsx`

Udvid `DamageFloater` med `isCrit` og vis særlig styling:

```tsx
export type DamageFloater = {
  id: number
  value: number
  left: string
  top: string
  isCrit?: boolean
}

type Props = { items: DamageFloater[] }

export default function DamageNumbers({ items }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {items.map((it) => (
        <span
          key={it.id}
          className={[
            'absolute font-bold tabular-nums drop-shadow-lg animate-damage-float',
            it.isCrit
              ? 'text-yellow-200 text-2xl sm:text-3xl tracking-wide'
              : 'text-amber-300 text-lg sm:text-xl',
          ].join(' ')}
          style={{ left: it.left, top: it.top }}
        >
          {it.isCrit ? `⚡ KRITISK! -${it.value}` : `-${it.value}`}
        </span>
      ))}
    </div>
  )
}
```

---

## Trin 5 — `src/components/mine/RockDropBanner.tsx`

### 5a. Tilføj `chest`-case i `borderClassForDrop`

```typescript
case 'chest':
  return 'border-yellow-500/70'
```

### 5b. Tilføj `chest`-case i `switch (drop.kind)`

```tsx
case 'chest': {
  icon = '🎁'
  title = (
    <>
      Kiste åbnet! <span className="text-yellow-300 font-bold">+{drop.gold} guld</span>
    </>
  )
  badgeClass = 'text-yellow-300'
  badgeText = 'Kiste'
  break
}
```

---

## Trin 6 — NY: `src/components/mine/ChestScene.tsx`

Opret filen fra bunden. Kisten er bygget med Three.js BoxGeometry (krop + låg).  
Klik → lille animation → `onOpen` kaldes.

```tsx
import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'

type ChestProps = {
  onOpen: () => void
  opened: boolean
}

function Chest({ onOpen, opened }: ChestProps) {
  const lidRef = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const bounce = useRef(0)

  useFrame((_, delta) => {
    if (!lidRef.current || !bodyRef.current) return

    // Lid åbner sig gradvis når opened=true
    const targetRot = opened ? -Math.PI * 0.65 : 0
    lidRef.current.rotation.x += (targetRot - lidRef.current.rotation.x) * Math.min(1, delta * 6)

    // Idle bob
    const t = performance.now() * 0.0015
    bodyRef.current.position.y = Math.sin(t) * 0.04

    // Bounce ved klik
    bounce.current *= Math.pow(0.88, delta * 60)
    bodyRef.current.rotation.z = Math.sin(performance.now() * 0.01) * 0.04 * bounce.current
  })

  const handleClick = () => {
    if (!opened) {
      bounce.current = 1
      onOpen()
    }
  }

  return (
    <group ref={bodyRef} onClick={handleClick}>
      {/* Kiste-krop */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[1.8, 0.9, 1.2]} />
        <meshStandardMaterial color="#7c4e1e" roughness={0.75} metalness={0.1} />
      </mesh>
      {/* Metalbeslag på krop */}
      <mesh position={[0, -0.2, 0.62]}>
        <boxGeometry args={[1.82, 0.15, 0.04]} />
        <meshStandardMaterial color="#b8922a" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Låg (pivot ved bagest kant) */}
      <group ref={lidRef} position={[0, 0.3, -0.6]}>
        <mesh position={[0, 0, 0.6]}>
          <boxGeometry args={[1.8, 0.45, 1.2]} />
          <meshStandardMaterial color="#a06228" roughness={0.72} metalness={0.1} />
        </mesh>
        {/* Hængselliste */}
        <mesh position={[0, 0.22, 0.6]}>
          <boxGeometry args={[1.82, 0.08, 1.22]} />
          <meshStandardMaterial color="#b8922a" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
      {/* Lås */}
      <mesh position={[0, 0.08, 0.62]}>
        <boxGeometry args={[0.3, 0.3, 0.08]} />
        <meshStandardMaterial
          color={opened ? '#fde68a' : '#b8922a'}
          roughness={0.3}
          metalness={0.8}
          emissive={opened ? '#fde68a' : '#000'}
          emissiveIntensity={opened ? 0.4 : 0}
        />
      </mesh>
    </group>
  )
}

type Props = {
  onOpen: () => void
}

export default function ChestScene({ onOpen }: Props) {
  const [opened, setOpened] = useState(false)

  const handleOpen = () => {
    if (opened) return
    setOpened(true)
    // Lille delay så animation starter inden callback
    window.setTimeout(onOpen, 300)
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-yellow-700/50 bg-gradient-to-b from-amber-950/60 to-slate-950">
      <div className="w-full h-[min(60vh,420px)] min-h-[220px] touch-none cursor-pointer">
        <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 4]} intensity={1.1} color="#ffe4a0" />
          <pointLight position={[0, 2, 2]} intensity={opened ? 1.5 : 0} color="#fde68a" />
          <Chest onOpen={handleOpen} opened={opened} />
        </Canvas>
      </div>
      {!opened && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-xs text-yellow-300/80 font-semibold animate-pulse tracking-wide">
            Klik for at åbne kisten
          </span>
        </div>
      )}
    </div>
  )
}
```

---

## Trin 7 — `src/components/mine/Rock3DScene.tsx`

Tilføj `rockType` prop og farvekort. Tilføj rød emission-glow ved lav HP.

```tsx
import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Mesh } from 'three'
import type { RockType } from '../../types'

type Props = {
  hp: number
  maxHp: number
  hitPulse: number
  onMineHit: () => void
  disabled?: boolean
  rockType?: RockType
}

// hue, saturation pr. rock-type
const ROCK_TYPE_COLOR: Record<RockType, [number, number]> = {
  normal:  [28,  24],
  hard:    [220, 10],
  rich:    [38,  55],
  crystal: [185, 55],
  chest:   [28,  24], // vises ikke
}

function Rock({ hp, maxHp, hitPulse, onMineHit, disabled, rockType = 'normal' }: Props) {
  const ref = useRef<Mesh>(null)
  const shake = useRef(0)
  const pct = maxHp > 0 ? hp / maxHp : 1
  const isLowHp = pct < 0.25

  useEffect(() => {
    shake.current = Math.min(1, shake.current + (isLowHp ? 1.2 : 0.9))
  }, [hitPulse, isLowHp])

  useFrame((_, delta) => {
    shake.current *= Math.pow(0.92, delta * 50)
    const m = ref.current
    if (!m) return
    const t = performance.now() * 0.008
    const amp = isLowHp ? shake.current * 1.5 : shake.current
    m.rotation.z = Math.sin(t) * 0.07 * amp
    m.rotation.x = Math.cos(t * 1.1) * 0.06 * amp
    m.position.x = Math.sin(t * 2) * 0.09 * amp
  })

  const [hue, sat] = ROCK_TYPE_COLOR[rockType]
  const color = useMemo(() => {
    const l = Math.max(0.16, pct * 0.38 + 0.14)
    return `hsl(${hue}, ${sat}%, ${l * 100}%)`
  }, [pct, hue, sat])

  const emissive = isLowHp ? '#ff2200' : '#000000'
  const emissiveIntensity = isLowHp ? 0.5 * (1 - pct / 0.25) : 0

  return (
    <mesh
      ref={ref}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onMineHit()
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <icosahedronGeometry args={[1.2, 1]} />
      <meshStandardMaterial
        color={color}
        roughness={isLowHp ? 0.65 : 0.88}
        metalness={0.08}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  )
}

export default function Rock3DScene(props: Props) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="w-full h-[min(60vh,420px)] min-h-[220px] touch-none cursor-pointer">
        <Canvas camera={{ position: [0, 1, 5], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 5, 4]} intensity={1.05} />
          <Rock {...props} />
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Canvas>
      </div>
    </div>
  )
}
```

---

## Trin 8 — `src/components/mine/MineHUD.tsx`

Tilføj `rockType` prop og vis en badge for ikke-normale typer.

```tsx
import type { RockType } from '../../types'

type Props = {
  depth: number
  hp: number
  maxHp: number
  pickaxeName: string
  durability: number
  maxDurability: number
  dynamiteReady?: boolean
  rockType?: RockType
}

// Tilføj disse konstanter i filen
const ROCK_TYPE_LABEL: Partial<Record<RockType, string>> = {
  hard:    '🪨 Hård sten',
  rich:    '💰 Rig åre',
  crystal: '💎 Krystalvene',
}

const ROCK_TYPE_CLASS: Partial<Record<RockType, string>> = {
  hard:    'bg-slate-700/60 border-slate-500/40 text-slate-300',
  rich:    'bg-amber-900/50 border-amber-600/40 text-amber-300',
  crystal: 'bg-cyan-900/50 border-cyan-600/40 text-cyan-300',
}
```

I JSX, tilføj badge **under** dynamite-banner:

```tsx
{rockType && ROCK_TYPE_LABEL[rockType] && (
  <div
    className={`text-[11px] font-semibold border rounded-lg px-2 py-1 ${ROCK_TYPE_CLASS[rockType]}`}
  >
    {ROCK_TYPE_LABEL[rockType]}
  </div>
)}
```

Husk at opdatere funktionssignaturen med `rockType` i destructuring.

---

## Trin 9 — `src/components/mine/MineScreen.tsx`

Dette er det mest komplekse trin. Her samles alle de nye systemer.

### 9a. Tilføj imports

```typescript
import { rockHpForDepth, rollBonusMineEssence, rollMineDrop, rollRockEvent, rollChestReward, type MineDrop } from '../../gem/mining'
import type { RockEvent } from '../../types'
import ChestScene from './ChestScene'
```

### 9b. Tilføj lokal state for rock-event

```typescript
const [rockEvent, setRockEvent] = useState<RockEvent>(() => rollRockEvent(area))
```

### 9c. Erstat `useLayoutEffect` — rul ny rock-event ved hvert dybde-skift

```typescript
useLayoutEffect(() => {
  const event = rollRockEvent(area)
  setRockEvent(event)
  if (event.type !== 'chest') {
    const max = Math.floor(rockHpForDepth(state.depth, area) * event.hpMultiplier)
    setMaxHp(max)
    setRockHp(max)
  } else {
    setMaxHp(0)
    setRockHp(0)
  }
}, [state.depth, area])
```

### 9d. Tilføj `isCrit` i `handleMineHit` og opdater floater-kald

Erstat:
```typescript
const dmg = useDynamite ? rockHp : pickaxe.damage
```
Med:
```typescript
const isCrit = !useDynamite && Math.random() < 0.10
const dmg = useDynamite ? rockHp : (isCrit ? pickaxe.damage * 2 : pickaxe.damage)
```

Opdater `pushFloater`-kaldet til:
```typescript
pushFloater(dmg, isCrit)
```

### 9e. Opdater `pushFloater` — tilføj `isCrit`

```typescript
const pushFloater = useCallback((value: number, isCrit = false) => {
  const id = hitId.current++
  const left = `${42 + Math.random() * 16}%`
  const top = `${38 + Math.random() * 12}%`
  setFloaters((prev) => [...prev, { id, value, left, top, isCrit }])
  window.setTimeout(() => {
    setFloaters((prev) => prev.filter((f) => f.id !== id))
  }, isCrit ? 900 : 600)
}, [])
```

### 9f. Tilføj `handleOpenChest`

```typescript
const handleOpenChest = useCallback(() => {
  const gold = rollChestReward(area, state.depth)
  dispatch({ type: 'OPEN_CHEST', gold })
  playRockBreak()
  const bonusEss = rollBonusMineEssence(area, state.activeEffects, state.activeCharms)
  if (bonusEss) {
    dispatch({ type: 'ADD_ESSENCE', essenceId: bonusEss, quantity: 1 })
    playEssenceFound()
  }
  const ess = bonusEss ? getEssenceDef(bonusEss) : null
  setDropNotice({
    id: noticeId.current++,
    drop: { kind: 'chest', gold },
    essenceId: bonusEss ?? null,
    essenceName: ess?.name ?? null,
  })
  dispatch({ type: 'INCREMENT_DEPTH' })
}, [area, state.depth, state.activeEffects, state.activeCharms, dispatch])
```

### 9g. Opdater `rollMineDrop`-kald med `rockType`

Erstat:
```typescript
const drop = rollMineDrop(area, state.depth, state.activeCharms)
```
Med:
```typescript
const drop = rollMineDrop(area, state.depth, state.activeCharms, rockEvent.type)
```

### 9h. Opdater `extraMaterialsFromDrop`

```typescript
function extraMaterialsFromDrop(drop: MineDrop): number {
  switch (drop.kind) {
    case 'ore':        return drop.ore.quantity
    case 'nugget':     return drop.nugget.quantity
    case 'rough-stone': return 1
    case 'chest':      return 0
    default:           return 0
  }
}
```

### 9i. Opdater JSX — vis `ChestScene` vs `Rock3DScene`

Erstat `<Rock3DScene ...>` blokken med:

```tsx
<div className="relative">
  {rockEvent.type === 'chest' ? (
    <ChestScene onOpen={handleOpenChest} />
  ) : (
    <Rock3DScene
      hp={rockHp}
      maxHp={maxHp}
      hitPulse={hitPulse}
      onMineHit={handleMineHit}
      disabled={mineDisabled}
      rockType={rockEvent.type}
    />
  )}
  <PickaxeOverlay striking={striking} />
  <DamageNumbers items={floaters} />
  {dropNotice && (
    <RockDropBanner
      key={dropNotice.id}
      notice={dropNotice}
      onDone={() => setDropNotice(null)}
    />
  )}
</div>
```

### 9j. Opdater `<MineHUD>` — tilføj `rockType`

```tsx
<MineHUD
  depth={state.depth}
  hp={rockHp}
  maxHp={maxHp}
  pickaxeName={pickaxe?.name ?? '—'}
  durability={pickaxe?.durability ?? 0}
  maxDurability={pickaxe?.maxDurability ?? 1}
  dynamiteReady={state.instantBreakNextRock}
  rockType={rockEvent.type !== 'chest' ? rockEvent.type : undefined}
/>
```

### 9k. Opdater `useCallback`-dependency arrays

Tilføj `rockEvent` og `rockEvent.type` til relevante dependency arrays:
- `handleMineHit`: tilføj `rockEvent`
- `handleOpenChest` er ny, ingen ændring nødvendig

---

## Trin 10 — Tjek linter-fejl

Efter alle ændringer: kør `ReadLints` på de modificerede filer og fix eventuelle TypeScript-fejl.  
Særlig opmærksomhed på:
- `RockType` import i alle filer der bruger den
- `MineDrop` type-exhaustiveness checks (tilføj `chest`-case overalt)
- `DamageFloater.isCrit` optional property

---

## Implementeringsrækkefølge (til Composer)

1. `src/types.ts` — tilføj `RockType`, `RockEvent`
2. `src/gem/mining.ts` — alle ændringer samlet (imports, nye funktioner, modificerede funktioner)
3. `src/lib/gameState.ts` — `OPEN_CHEST` action
4. `src/components/mine/DamageNumbers.tsx` — `isCrit`
5. `src/components/mine/RockDropBanner.tsx` — `chest` kind
6. `src/components/mine/ChestScene.tsx` — opret ny fil
7. `src/components/mine/Rock3DScene.tsx` — rockType + visuals
8. `src/components/mine/MineHUD.tsx` — badge
9. `src/components/mine/MineScreen.tsx` — alt samles her

---

## Fremtidigt scope (IKKE del af denne implementering)

- **Kiste-tiers** (Træ / Sølv / Guld): udvid `RockEvent` med `chestTier: 'wood' | 'silver' | 'gold'`, juster `rollChestReward` og `ChestScene` farver.
- **Kiste-indhold v2**: gem, essenser, ingots. Udvid `{ kind: 'chest' }` drop til `{ kind: 'chest'; rewards: ChestReward[] }`.
- **3D mine-verden**: `rockEvent` og `ChestScene` er allerede isolerede komponenter — klar til at flyttes ind i en free-roam mine-scene.
- **Hakke-nicher**: `RockEvent` har `type`-feltet, så det er ligetil at tilføje `pickaxe.bonusVs?: RockType[]`.
- **Område-unikke lys**: `Rock3DScene` kan modtage en `ambientColor` fra `Area`-data.
