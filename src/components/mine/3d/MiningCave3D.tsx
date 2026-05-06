import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import type { Area, RockType } from '../../../types'
import OreNode from './OreNode'
import PlayerControls from './PlayerControls'

/** Placeringer af malm-klumper i grotten */
const ORE_SLOTS: [number, number, number][] = [
  [5, 0.48, -2],
  [-4.2, 0.48, 4.5],
  [1.2, 0.48, -6.5],
  [-6.2, 0.48, -3],
  [6.5, 0.48, 5],
]

function dominantMetal(area: Area) {
  const pool = area.metalPool
  if (!pool?.length) return undefined
  return [...pool].sort((a, b) => b.weight - a.weight)[0]?.metal
}

type CaveContentProps = {
  area: Area
  hp: number
  maxHp: number
  hitPulse: number
  rockType: RockType
  disabled: boolean
  depth: number
  onMineHit: () => void
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
}: CaveContentProps) {
  const accent = useMemo(() => dominantMetal(area), [area])
  const activeSlot = depth % ORE_SLOTS.length

  return (
    <>
      <color attach="background" args={['#07070c']} />
      <fog attach="fog" args={['#1a1a28', 6, 34]} />

      <ambientLight intensity={0.14} />
      <pointLight position={[3, 3.5, 2]} intensity={22} distance={22} decay={2} color="#ffaa66" />
      <pointLight position={[-4, 2.8, -5]} intensity={14} distance={18} decay={2} color="#6688cc" />
      <pointLight position={[0, 4, -8]} intensity={10} distance={20} decay={2} color="#ffe0c0" />

      {/* Gulv */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#252018" roughness={0.94} metalness={0.02} />
      </mesh>

      {/* Loft */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5.2, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#151820" roughness={1} metalness={0} />
      </mesh>

      {/* Simpel kasse-grotte */}
      {[
        { pos: [0, 2.6, -11] as [number, number, number], size: [22, 5.4, 1] as [number, number, number] },
        { pos: [-11, 2.6, 0] as [number, number, number], size: [1, 5.4, 22] as [number, number, number] },
        { pos: [11, 2.6, 0] as [number, number, number], size: [1, 5.4, 22] as [number, number, number] },
      ].map((w, i) => (
        <mesh key={i} position={w.pos}>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color="#1e242e" roughness={0.92} metalness={0.04} />
        </mesh>
      ))}

      <PlayerControls />

      {ORE_SLOTS.map((pos, i) => (
        <OreNode
          key={i}
          position={pos}
          hp={hp}
          maxHp={maxHp}
          hitPulse={hitPulse}
          rockType={rockType}
          disabled={disabled}
          interactive={i === activeSlot}
          onMineHit={onMineHit}
          accentMetal={accent}
        />
      ))}
    </>
  )
}

export type MiningCave3DProps = CaveContentProps

export default function MiningCave3D(props: MiningCave3DProps) {
  const [pointerLocked, setPointerLocked] = useState(
    typeof document !== 'undefined' && document.pointerLockElement != null,
  )

  useEffect(() => {
    const onChange = () => {
      setPointerLocked(document.pointerLockElement != null)
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950">
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
      <div className="w-full h-[min(60vh,420px)] min-h-[220px] touch-none cursor-crosshair">
        <Canvas
          camera={{ position: [0, 1.55, 9.2], fov: 58 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <CaveContent {...props} />
        </Canvas>
      </div>
    </div>
  )
}
