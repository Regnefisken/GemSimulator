import type { CSSProperties } from 'react'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { ColorMap } from '../types'
import { useDisplayRenderGlFallback } from './layout/DisplayRenderContext'

const dummy = new THREE.Object3D()
const _color = new THREE.Color()
const MAX_INSTANCES = 320

function VoxelMesh({ data, colorMap }: { data: string[]; colorMap: ColorMap }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.4,
        metalness: 0.15,
        flatShading: true,
      }),
    []
  )

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

  return <instancedMesh ref={meshRef} args={[geo, mat, MAX_INSTANCES]} />
}

function AdaptiveCamera({ data }: { data: string[] }) {
  const { camera } = useThree()
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    const w = data[0]?.length ?? 16
    const h = data.length ?? 16
    const pad = 1.15
    cam.left = -(w / 2) * pad
    cam.right = (w / 2) * pad
    cam.top = (h / 2) * pad
    cam.bottom = -(h / 2) * pad
    cam.updateProjectionMatrix()
  }, [data, camera])
  return null
}

function Scene({
  data,
  colorMap,
}: {
  data: string[]
  colorMap: ColorMap
}) {
  const [autoRotate, setAutoRotate] = useState(true)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  useLayoutEffect(() => {
    const c = controlsRef.current
    if (!c) return
    c.setAzimuthalAngle(-0.45)
    c.update()
  }, [])

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
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
        enableDamping
        dampingFactor={0.08}
        onStart={() => setAutoRotate(false)}
        onEnd={() => setAutoRotate(true)}
      />
    </>
  )
}

export type VoxelSceneHandle = { toDataURL: () => string }

const VoxelScene = forwardRef<
  VoxelSceneHandle,
  { data: string[]; colorMap: ColorMap; className?: string; canvasStyle?: CSSProperties }
>(({ data, colorMap, className, canvasStyle }, ref) => {
    const glRef = useRef<THREE.WebGLRenderer | null>(null)
    const { dpr, antialias } = useDisplayRenderGlFallback()

    useImperativeHandle(ref, () => ({
      toDataURL: () => glRef.current?.domElement.toDataURL('image/png') ?? '',
    }))

    return (
      <Canvas
        key={`voxel-gl-${dpr}-${antialias}`}
        orthographic
        camera={{ position: [0, 0, 18], near: 0.1, far: 60 }}
        gl={{ antialias, preserveDrawingBuffer: true }}
        dpr={dpr}
        style={{ width: 320, height: 320, ...canvasStyle }}
        className={`pixelated block max-w-full ${className ?? ''}`}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(0x020617))
          gl.setPixelRatio(dpr)
          glRef.current = gl
        }}
      >
        <Scene data={data} colorMap={colorMap} />
      </Canvas>
    )
  }
)

VoxelScene.displayName = 'VoxelScene'

export default VoxelScene