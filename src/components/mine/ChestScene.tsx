import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { ChestTier } from '../../types'

type ChestPalette = {
  body: string
  trim: string
  lid: string
  lockClosed: string
  lockOpen: string
  dirLight: string
  pointOpen: string
  wrapClass: string
  hintClass: string
}

const CHEST_VISUALS: Record<ChestTier, ChestPalette> = {
  wood: {
    body: '#7c4e1e',
    trim: '#b8922a',
    lid: '#a06228',
    lockClosed: '#b8922a',
    lockOpen: '#fde68a',
    dirLight: '#ffe4a0',
    pointOpen: '#fde68a',
    wrapClass: 'border-yellow-700/50 bg-gradient-to-b from-amber-950/60 to-slate-950',
    hintClass: 'text-yellow-300/80',
  },
  silver: {
    body: '#475569',
    trim: '#cbd5e1',
    lid: '#64748b',
    lockClosed: '#94a3b8',
    lockOpen: '#f1f5f9',
    dirLight: '#e2e8f0',
    pointOpen: '#f8fafc',
    wrapClass: 'border-slate-400/45 bg-gradient-to-b from-slate-800/80 to-slate-950',
    hintClass: 'text-slate-200/85',
  },
  gold: {
    body: '#713f12',
    trim: '#fbbf24',
    lid: '#92400e',
    lockClosed: '#fcd34d',
    lockOpen: '#fef08a',
    dirLight: '#fde68a',
    pointOpen: '#fff7ed',
    wrapClass: 'border-amber-400/60 bg-gradient-to-b from-amber-900/70 to-slate-950',
    hintClass: 'text-amber-200/90',
  },
}

type ChestProps = {
  onOpen: () => void
  opened: boolean
  palette: ChestPalette
}

function Chest({ onOpen, opened, palette }: ChestProps) {
  const lidRef = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const bounce = useRef(0)

  useFrame((_, delta) => {
    if (!lidRef.current || !bodyRef.current) return

    const targetRot = opened ? -Math.PI * 0.65 : 0
    lidRef.current.rotation.x += (targetRot - lidRef.current.rotation.x) * Math.min(1, delta * 6)

    const t = performance.now() * 0.0015
    bodyRef.current.position.y = Math.sin(t) * 0.04

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
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[1.8, 0.9, 1.2]} />
        <meshStandardMaterial color={palette.body} roughness={0.75} metalness={0.12} />
      </mesh>
      <mesh position={[0, -0.2, 0.62]}>
        <boxGeometry args={[1.82, 0.15, 0.04]} />
        <meshStandardMaterial color={palette.trim} roughness={0.35} metalness={0.65} />
      </mesh>
      <group ref={lidRef} position={[0, 0.3, -0.6]}>
        <mesh position={[0, 0, 0.6]}>
          <boxGeometry args={[1.8, 0.45, 1.2]} />
          <meshStandardMaterial color={palette.lid} roughness={0.72} metalness={0.14} />
        </mesh>
        <mesh position={[0, 0.22, 0.6]}>
          <boxGeometry args={[1.82, 0.08, 1.22]} />
          <meshStandardMaterial color={palette.trim} roughness={0.35} metalness={0.65} />
        </mesh>
      </group>
      <mesh position={[0, 0.08, 0.62]}>
        <boxGeometry args={[0.3, 0.3, 0.08]} />
        <meshStandardMaterial
          color={opened ? palette.lockOpen : palette.lockClosed}
          roughness={0.28}
          metalness={0.82}
          emissive={opened ? palette.lockOpen : '#000000'}
          emissiveIntensity={opened ? 0.45 : 0}
        />
      </mesh>
    </group>
  )
}

type Props = {
  onOpen: () => void
  tier: ChestTier
}

export default function ChestScene({ onOpen, tier }: Props) {
  const [opened, setOpened] = useState(false)
  const palette = CHEST_VISUALS[tier]

  const handleOpen = () => {
    if (opened) return
    setOpened(true)
    window.setTimeout(onOpen, 300)
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border ${palette.wrapClass}`}>
      <div className="w-full h-[min(60vh,420px)] min-h-[220px] touch-none cursor-pointer">
        <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={tier === 'silver' ? 0.55 : 0.6} />
          <directionalLight position={[3, 5, 4]} intensity={1.12} color={palette.dirLight} />
          <pointLight position={[0, 2, 2]} intensity={opened ? 1.55 : 0} color={palette.pointOpen} />
          <Chest onOpen={handleOpen} opened={opened} palette={palette} />
        </Canvas>
      </div>
      {!opened && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
          <span
            className={`text-xs font-semibold animate-pulse tracking-wide ${palette.hintClass}`}
          >
            Klik for at åbne kisten
          </span>
        </div>
      )}
    </div>
  )
}
