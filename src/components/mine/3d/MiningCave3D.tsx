import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Area, CaveConfig, PixelItem } from '../../../types'
import { getCaveConfig } from '../../../types'
import type { MineRunSlotState } from '../../../lib/mineTypes'
import type { WorldLootEntity } from '../../../lib/lootEntities'
import { hashMineRockVisualSeed } from '../../../gem/procedural/mineRockSeed'
import { getRockLayoutParams } from '../../../gem/procedural/rockLayout'
import OreNode from './OreNode'
import Pickaxe3D from './Pickaxe3D'
import PlayerControls from './PlayerControls'
import ProceduralCave from './ProceduralCave'
import WorldChest, { type WorldChestEntity } from './WorldChest'
import WorldLootItem from './WorldLootItem'
import { sinkOreSlotPosition } from '../sinkOreSlotPosition'

function dominantMetal(area: Area) {
  const pool = area.metalPool
  if (!pool?.length) return undefined
  return [...pool].sort((a, b) => b.weight - a.weight)[0]?.metal
}

export type MiningCave3DProps = {
  area: Area
  mineSlots: MineRunSlotState[]
  /** Bruges til deterministisk klippe‑mesh pr. felt. */
  mineRunId: string
  runDepth: number
  targetSlotIndex: number
  hitPulse: number
  disabled: boolean
  /** Hug på slot-index (inkl. første hug uden forvalgt mål). */
  onMineHit: (slotIndex: number) => void
  swingTrigger: number
  heldWeaponKind: 'pickaxe' | 'sword'
  weaponPixelItem: PixelItem | null
  lootEntities: WorldLootEntity[]
  /** Felter hvor klippen er ryddet — ingen bund-plade under verdens-loot */
  depletedSlots: ReadonlySet<number>
  onCollectLoot: (id: string) => void
  worldChests: WorldChestEntity[]
  onChestClick: (id: string) => void
  /** Venstreklik på en anden klippe for at sætte den som aktivt mål (D13). */
  onSelectMineSlot?: (slotIndex: number) => void
  onCrosshairTargetChange?: (active: boolean) => void
  className?: string
  canvasClassName?: string
}

type CaveProps = Omit<
  MiningCave3DProps,
  'className' | 'canvasClassName' | 'weaponPixelItem' | 'swingTrigger' | 'heldWeaponKind'
> & {
  caveSeed: number
}

/** Kopierer hovedkamera til delt ref — overlay‑canvas tegner våben ovenpå (Html‑labels under). */
function CameraMirrorInto({ mirror }: { mirror: THREE.PerspectiveCamera }) {
  const { camera, size } = useThree()
  useFrame(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      mirror.copy(camera)
      mirror.aspect = size.width / Math.max(1, size.height)
      mirror.updateProjectionMatrix()
    }
  })
  return null
}

function OverlayWeaponCamera({ mirror }: { mirror: THREE.PerspectiveCamera }) {
  const { camera, size } = useThree()
  useFrame(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.copy(mirror)
      camera.aspect = size.width / Math.max(1, size.height)
      camera.updateProjectionMatrix()
    }
  })
  return null
}

/** Samme lys som hovedscenen — overlay‑canvas har ingen geometri, kun våben, så lys skal gentages her. */
function MineSceneLights({ cfg }: { cfg: CaveConfig }) {
  return (
    <>
      <ambientLight color={cfg.ambientColor} intensity={cfg.ambientIntensity} />
      <hemisphereLight color="#d8e0f0" groundColor="#5c5044" intensity={0.55} />
      <pointLight position={[3, 3.5, 2]} intensity={44} distance={30} decay={2} color="#ffddaa" />
      <pointLight position={[-4, 2.8, -5]} intensity={32} distance={28} decay={2} color="#a8c0f0" />
      <pointLight position={[0, 4, -8]} intensity={22} distance={28} decay={2} color="#fff4e8" />
      <pointLight position={[0, 2.2, 6]} intensity={19} distance={28} decay={2} color="#f0e8dc" />
    </>
  )
}

function CaveContent({
  area,
  mineSlots,
  mineRunId,
  runDepth,
  targetSlotIndex,
  hitPulse,
  disabled,
  onMineHit,
  lootEntities,
  depletedSlots,
  onCollectLoot,
  worldChests,
  onChestClick,
  onSelectMineSlot,
  onCrosshairTargetChange,
  caveSeed,
}: CaveProps) {
  const { camera } = useThree()
  const cfg = useMemo(() => getCaveConfig(area), [area])
  const oreSlots = cfg.oreSlots
  const activeSlotIndex =
    mineSlots.length === 0 || targetSlotIndex < 0
      ? -1
      : ((targetSlotIndex % mineSlots.length) + mineSlots.length) % mineSlots.length
  const accent = useMemo(() => dominantMetal(area), [area])

  const fogNear = cfg.depthFogScale ? cfg.fogNear + runDepth * 0.06 : cfg.fogNear
  const fogFar = cfg.depthFogScale ? cfg.fogFar + runDepth * 0.1 : cfg.fogFar

  const activeOreMeshRef = useRef<THREE.Object3D | null>(null)
  const chestHits = useRef(new Map<string, THREE.Mesh>())
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const prevCrosshair = useRef(false)
  const [chestHoverId, setChestHoverId] = useState<string | null>(null)
  const prevChestHover = useRef<string | null>(null)

  const ndc = useRef(new THREE.Vector2(0, 0))

  const registerChestMesh = (id: string, mesh: THREE.Mesh | null) => {
    if (mesh) chestHits.current.set(id, mesh)
    else chestHits.current.delete(id)
  }

  useFrame(() => {
    raycaster.setFromCamera(ndc.current, camera)
    let hid: string | null = null
    for (const [id, mesh] of chestHits.current) {
      if (raycaster.intersectObject(mesh, false).length > 0) {
        hid = id
        break
      }
    }
    if (prevChestHover.current !== hid) {
      prevChestHover.current = hid
      setChestHoverId(hid)
    }

    const oreHit =
      activeOreMeshRef.current != null &&
      raycaster.intersectObject(activeOreMeshRef.current, true).length > 0
    const any = oreHit || hid !== null
    if (prevCrosshair.current !== any) {
      prevCrosshair.current = any
      onCrosshairTargetChange?.(any)
    }
  })

  const burstOrigin = useMemo(() => {
    const fallback = [0, 0.55, 0] as [number, number, number]
    if (activeSlotIndex < 0) return sinkOreSlotPosition(fallback, 0)
    const pos = (oreSlots[activeSlotIndex] ?? fallback) as [number, number, number]
    const slot = mineSlots[activeSlotIndex]
    if (!slot || slot.kind === 'chest') return sinkOreSlotPosition(pos, 0)
    const { extraSinkY } = getRockLayoutParams(mineRunId, runDepth, activeSlotIndex, slot.rockType)
    return sinkOreSlotPosition(pos, extraSinkY)
  }, [activeSlotIndex, oreSlots, mineSlots, mineRunId, runDepth])

  return (
    <>
      <color attach="background" args={['#18182a']} />
      <fog attach="fog" args={[cfg.fogColor, fogNear, fogFar]} />

      <MineSceneLights cfg={cfg} />

      <ProceduralCave
        caveConfig={cfg}
        seed={caveSeed}
        hitTrigger={hitPulse}
        burstOrigin={burstOrigin}
      />

      <PlayerControls bounds={cfg.bounds} />

      {oreSlots.map((pos, i) => {
        const slot = mineSlots[i]
        if (!slot || slot.kind === 'chest') return null
        const depleted = depletedSlots.has(i) || slot.cleared
        const isVisualTarget = activeSlotIndex === i && targetSlotIndex >= 0 && !depleted
        const canStrikeHere = !depleted && (targetSlotIndex < 0 || activeSlotIndex === i)
        const layout = getRockLayoutParams(mineRunId, runDepth, i, slot.rockType)
        return (
          <OreNode
            key={`${i}-${slot.cleared}`}
            position={sinkOreSlotPosition(pos, layout.extraSinkY)}
            meshScaleMultiplier={layout.meshScaleMultiplier}
            extraSinkY={layout.extraSinkY}
            hp={slot.currentHp}
            maxHp={slot.maxHp}
            hitPulse={hitPulse}
            visualSeed={hashMineRockVisualSeed(mineRunId, runDepth, i, slot.rockType)}
            rockType={slot.rockType}
            disabled={disabled}
            interactive={isVisualTarget}
            depleted={depleted}
            onMineHit={canStrikeHere ? () => onMineHit(i) : undefined}
            onSelectTarget={
              targetSlotIndex >= 0 && activeSlotIndex !== i && !depleted
                ? () => onSelectMineSlot?.(i)
                : undefined
            }
            accentMetal={accent}
            hitTargetRef={isVisualTarget ? activeOreMeshRef : undefined}
          />
        )
      })}

      {worldChests.map((c) => (
        <WorldChest
          key={c.id}
          entity={c}
          highlighted={chestHoverId === c.id}
          registerHitMesh={registerChestMesh}
          onClick={onChestClick}
        />
      ))}

      {lootEntities.map((e) => (
        <WorldLootItem key={e.id} entity={e} onCollect={onCollectLoot} />
      ))}
    </>
  )
}

export default function MiningCave3D({
  className = '',
  canvasClassName = '',
  weaponPixelItem,
  swingTrigger,
  heldWeaponKind,
  ...caveProps
}: MiningCave3DProps) {
  const [pointerLocked, setPointerLocked] = useState(
    typeof document !== 'undefined' && document.pointerLockElement != null,
  )

  const [caveSeed] = useState(() => Math.floor(Math.random() * 1e9))

  const weaponCameraMirror = useMemo(() => {
    const c = new THREE.PerspectiveCamera(58, 1, 0.1, 2000)
    c.position.set(0, 1.55, 9.2)
    return c
  }, [])

  const weaponCaveCfg = useMemo(() => getCaveConfig(caveProps.area), [caveProps.area])

  useEffect(() => {
    const onChange = () => {
      setPointerLocked(document.pointerLockElement != null)
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  const canvasCn =
    canvasClassName ||
    'w-full h-[min(60vh,420px)] min-h-[220px] touch-none cursor-crosshair'

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 ${className}`}
    >
      {!pointerLocked && (
        <div
          className="fixed left-1/2 bottom-[calc(9rem+5.75rem)] z-[83] w-full max-w-[min(90vw,420px)] -translate-x-1/2 pointer-events-none px-3"
          role="status"
        >
          <div className="rounded-xl border border-amber-700/40 bg-slate-950/90 px-4 py-2.5 text-center text-sm text-amber-100/95 shadow-lg backdrop-blur-sm">
            <p className="font-semibold text-amber-50">Klik for at gå ind i minen</p>
            <p className="mt-1 text-slate-400 text-xs leading-snug">
              WASD bevæger dig · Mus ser rundt · Venstreklik hugger malmen · ESC frigiver musen
            </p>
          </div>
        </div>
      )}
      <div className={`relative ${canvasCn}`}>
        <Canvas
          key={caveSeed}
          camera={{ position: [0, 1.55, 9.2], fov: 58 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <CameraMirrorInto mirror={weaponCameraMirror} />
          <CaveContent {...caveProps} caveSeed={caveSeed} />
        </Canvas>
        {weaponPixelItem && (
          <div
            className="pointer-events-none absolute inset-0 touch-none"
            style={{ zIndex: 9000 }}
          >
            <Canvas
              className="h-full w-full"
              camera={{ position: [0, 1.55, 9.2], fov: 58 }}
              dpr={[1, 2]}
              gl={{
                alpha: true,
                antialias: true,
                /** false gør ofte transparente lag mørke ved komposit oven på hoved-canvas */
                premultipliedAlpha: true,
              }}
              onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
            >
              <OverlayWeaponCamera mirror={weaponCameraMirror} />
              <MineSceneLights cfg={weaponCaveCfg} />
              <Pickaxe3D
                pixelItem={weaponPixelItem}
                swingTrigger={swingTrigger}
                disabled={caveProps.disabled}
                visible={pointerLocked}
                heldWeaponKind={heldWeaponKind}
              />
            </Canvas>
          </div>
        )}
      </div>
    </div>
  )
}
