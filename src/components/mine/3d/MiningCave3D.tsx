import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Area, PixelItem } from '../../../types'
import { getCaveConfig } from '../../../types'
import type { MineRunSlotState } from '../../../lib/mineTypes'
import type { WorldLootEntity } from '../../../lib/lootEntities'
import OreNode from './OreNode'
import Pickaxe3D from './Pickaxe3D'
import PlayerControls from './PlayerControls'
import ProceduralCave from './ProceduralCave'
import WorldChest, { type WorldChestEntity } from './WorldChest'
import WorldLootItem from './WorldLootItem'

function dominantMetal(area: Area) {
  const pool = area.metalPool
  if (!pool?.length) return undefined
  return [...pool].sort((a, b) => b.weight - a.weight)[0]?.metal
}

export type MiningCave3DProps = {
  area: Area
  mineSlots: MineRunSlotState[]
  runDepth: number
  targetSlotIndex: number
  hitPulse: number
  disabled: boolean
  onMineHit: () => void
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

type CaveProps = Omit<MiningCave3DProps, 'className' | 'canvasClassName'> & {
  caveSeed: number
  pointerLocked: boolean
}

function CaveContent({
  area,
  mineSlots,
  runDepth,
  targetSlotIndex,
  hitPulse,
  disabled,
  onMineHit,
  swingTrigger,
  heldWeaponKind,
  weaponPixelItem,
  lootEntities,
  depletedSlots,
  onCollectLoot,
  worldChests,
  onChestClick,
  onSelectMineSlot,
  onCrosshairTargetChange,
  caveSeed,
  pointerLocked,
}: CaveProps) {
  const { camera } = useThree()
  const cfg = useMemo(() => getCaveConfig(area), [area])
  const oreSlots = cfg.oreSlots
  const activeSlot = mineSlots.length > 0 ? targetSlotIndex % mineSlots.length : 0
  const accent = useMemo(() => dominantMetal(area), [area])

  const fogNear = cfg.depthFogScale ? cfg.fogNear + runDepth * 0.06 : cfg.fogNear
  const fogFar = cfg.depthFogScale ? cfg.fogFar + runDepth * 0.1 : cfg.fogFar

  const activeOreMeshRef = useRef<THREE.Mesh | null>(null)
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
      raycaster.intersectObject(activeOreMeshRef.current, false).length > 0
    const any = oreHit || hid !== null
    if (prevCrosshair.current !== any) {
      prevCrosshair.current = any
      onCrosshairTargetChange?.(any)
    }
  })

  const burstOrigin = oreSlots[activeSlot] ?? [0, 0.55, 0]

  return (
    <>
      <color attach="background" args={['#18182a']} />
      <fog attach="fog" args={[cfg.fogColor, fogNear, fogFar]} />

      <ambientLight color={cfg.ambientColor} intensity={cfg.ambientIntensity} />
      <hemisphereLight color="#d8e0f0" groundColor="#5c5044" intensity={0.55} />
      <pointLight position={[3, 3.5, 2]} intensity={44} distance={30} decay={2} color="#ffddaa" />
      <pointLight position={[-4, 2.8, -5]} intensity={32} distance={28} decay={2} color="#a8c0f0" />
      <pointLight position={[0, 4, -8]} intensity={22} distance={28} decay={2} color="#fff4e8" />
      <pointLight position={[0, 2.2, 6]} intensity={19} distance={28} decay={2} color="#f0e8dc" />

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
        const isTarget = i === activeSlot && !slot.cleared
        return (
          <OreNode
            key={`${i}-${slot.currentHp}-${slot.cleared}`}
            position={pos}
            hp={slot.currentHp}
            maxHp={slot.maxHp}
            hitPulse={hitPulse}
            rockType={slot.rockType}
            disabled={disabled}
            interactive={isTarget}
            depleted={depleted}
            onMineHit={onMineHit}
            onSelectTarget={!isTarget && !depleted ? () => onSelectMineSlot?.(i) : undefined}
            accentMetal={accent}
            hitTargetRef={isTarget ? activeOreMeshRef : undefined}
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

      {weaponPixelItem && (
        <Pickaxe3D
          pixelItem={weaponPixelItem}
          swingTrigger={swingTrigger}
          disabled={disabled}
          visible={pointerLocked}
          heldWeaponKind={heldWeaponKind}
        />
      )}
    </>
  )
}

export default function MiningCave3D({
  className = '',
  canvasClassName = '',
  ...props
}: MiningCave3DProps) {
  const [pointerLocked, setPointerLocked] = useState(
    typeof document !== 'undefined' && document.pointerLockElement != null,
  )

  const [caveSeed] = useState(() => Math.floor(Math.random() * 1e9))

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
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="rounded-xl border border-amber-700/40 bg-slate-950/85 px-4 py-3 text-center text-sm text-amber-100/95 shadow-lg max-w-sm mx-4">
            <p className="font-semibold text-amber-50">Klik for at gå ind i minen</p>
            <p className="mt-1 text-slate-400 text-xs">
              WASD bevæger dig · Mus ser rundt · Venstreklik hugger malmen · ESC frigiver musen
            </p>
          </div>
        </div>
      )}
      <div className={canvasCn}>
        <Canvas
          key={caveSeed}
          camera={{ position: [0, 1.55, 9.2], fov: 58 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <CaveContent {...props} caveSeed={caveSeed} pointerLocked={pointerLocked} />
        </Canvas>
      </div>
    </div>
  )
}
