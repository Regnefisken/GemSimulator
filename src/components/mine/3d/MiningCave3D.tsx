import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Area, PixelItem, RockType } from '../../../types'
import { getCaveConfig } from '../../../types'
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
  hp: number
  maxHp: number
  hitPulse: number
  rockType: RockType
  disabled: boolean
  depth: number
  onMineHit: () => void
  swingTrigger: number
  pickaxePixelItem: PixelItem | null
  lootEntities: WorldLootEntity[]
  /** Felter hvor klippen netop er brudt — ingen bund-plade under loot */
  depletedSlots: ReadonlySet<number>
  onCollectLoot: (id: string) => void
  worldChests: WorldChestEntity[]
  onChestClick: (id: string) => void
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
  hp,
  maxHp,
  hitPulse,
  rockType,
  disabled,
  depth,
  onMineHit,
  swingTrigger,
  pickaxePixelItem,
  lootEntities,
  depletedSlots,
  onCollectLoot,
  worldChests,
  onChestClick,
  onCrosshairTargetChange,
  caveSeed,
  pointerLocked,
}: CaveProps) {
  const { camera } = useThree()
  const cfg = useMemo(() => getCaveConfig(area), [area])
  const oreSlots = cfg.oreSlots
  const activeSlot = depth % oreSlots.length
  const accent = useMemo(() => dominantMetal(area), [area])

  const fogNear = cfg.depthFogScale ? cfg.fogNear + depth * 0.06 : cfg.fogNear
  const fogFar = cfg.depthFogScale ? cfg.fogFar + depth * 0.1 : cfg.fogFar

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
      <color attach="background" args={['#0c0c14']} />
      <fog attach="fog" args={[cfg.fogColor, fogNear, fogFar]} />

      <ambientLight color={cfg.ambientColor} intensity={cfg.ambientIntensity} />
      <hemisphereLight color="#c4ccdc" groundColor="#4a4036" intensity={0.32} />
      <pointLight position={[3, 3.5, 2]} intensity={30} distance={26} decay={2} color="#ffcc88" />
      <pointLight position={[-4, 2.8, -5]} intensity={20} distance={22} decay={2} color="#88a8dd" />
      <pointLight position={[0, 4, -8]} intensity={14} distance={24} decay={2} color="#fff0dc" />
      <pointLight position={[0, 2.2, 6]} intensity={12} distance={24} decay={2} color="#e8ddd0" />

      <ProceduralCave
        caveConfig={cfg}
        seed={caveSeed}
        hitTrigger={hitPulse}
        burstOrigin={burstOrigin}
      />

      <PlayerControls bounds={cfg.bounds} />

      {oreSlots.map((pos, i) => (
        <OreNode
          key={i}
          position={pos}
          hp={hp}
          maxHp={maxHp}
          hitPulse={hitPulse}
          rockType={rockType}
          disabled={disabled}
          interactive={i === activeSlot}
          depleted={depletedSlots.has(i)}
          onMineHit={onMineHit}
          accentMetal={accent}
          hitTargetRef={i === activeSlot ? activeOreMeshRef : undefined}
        />
      ))}

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

      {pickaxePixelItem && (
        <Pickaxe3D
          pixelItem={pickaxePixelItem}
          swingTrigger={swingTrigger}
          disabled={disabled}
          visible={pointerLocked}
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
