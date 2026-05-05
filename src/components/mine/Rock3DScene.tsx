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

const ROCK_TYPE_COLOR: Record<RockType, [number, number]> = {
  normal: [28, 24],
  hard: [220, 10],
  rich: [38, 55],
  crystal: [185, 55],
  chest: [28, 24],
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
