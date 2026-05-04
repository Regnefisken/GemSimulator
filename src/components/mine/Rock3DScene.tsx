import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Mesh } from 'three'

type Props = {
  hp: number
  maxHp: number
  hitPulse: number
  onMineHit: () => void
  disabled?: boolean
}

function Rock({ hp, maxHp, hitPulse, onMineHit, disabled }: Props) {
  const ref = useRef<Mesh>(null)
  const shake = useRef(0)

  useEffect(() => {
    shake.current = Math.min(1, shake.current + 0.9)
  }, [hitPulse])

  useFrame((_, delta) => {
    shake.current *= Math.pow(0.92, delta * 50)
    const m = ref.current
    if (!m) return
    const t = performance.now() * 0.008
    m.rotation.z = Math.sin(t) * 0.07 * shake.current
    m.rotation.x = Math.cos(t * 1.1) * 0.06 * shake.current
    m.position.x = Math.sin(t * 2) * 0.09 * shake.current
  })

  const color = useMemo(() => {
    const l = Math.max(0.16, (hp / Math.max(maxHp, 1)) * 0.38 + 0.14)
    return `hsl(28, 24%, ${l * 100}%)`
  }, [hp, maxHp])

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
      <meshStandardMaterial color={color} roughness={0.88} metalness={0.08} />
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
