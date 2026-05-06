import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { ColorMap, Voxel3DGrid } from '../types'
import { resolveColor } from '../gem/colorResolver'
import { useDisplayRenderGlFallback } from './layout/DisplayRenderContext'

const dummy = new THREE.Object3D()
const _color = new THREE.Color()
const MAX_INSTANCES = 1024

export type VoxelSceneProps2D = {
  mode?: '2d'
  data: string[]
  colorMap: ColorMap
  className?: string
  canvasStyle?: CSSProperties
  cameraTilt?: number
}

export type VoxelSceneProps3D = {
  mode: '3d'
  voxel3d: Voxel3DGrid
  className?: string
  canvasStyle?: CSSProperties
  cameraTilt?: number
}

export type VoxelSceneProps = VoxelSceneProps2D | VoxelSceneProps3D

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
    [],
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
        _color.set(resolveColor(ch, colorMap) ?? '#000000')
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

function VoxelMesh3D({ voxel3d }: { voxel3d: Voxel3DGrid }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.4,
        metalness: 0.15,
        flatShading: true,
      }),
    [],
  )

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !voxel3d.layers.length) return
    const depth = voxel3d.depth
    const h = voxel3d.layers[0].length
    const w = voxel3d.layers[0][0].length
    let idx = 0
    outer: for (let z = 0; z < depth; z++) {
      const layer = voxel3d.layers[z]
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ch = layer[y]![x]!
          if (ch === '.') continue
          if (idx >= MAX_INSTANCES) break outer
          dummy.position.set(x - (w - 1) / 2, -y + (h - 1) / 2, z - (depth - 1) / 2)
          dummy.rotation.set(0, 0, 0)
          dummy.scale.set(1, 1, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(idx, dummy.matrix)
          _color.set(resolveColor(ch, voxel3d.colorMap) ?? '#000000')
          mesh.setColorAt(idx, _color)
          idx++
        }
      }
    }
    mesh.count = idx
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [voxel3d])

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

function AdaptiveCamera3D({ voxel3d }: { voxel3d: Voxel3DGrid }) {
  const { camera } = useThree()
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    const w = voxel3d.layers[0]?.[0]?.length ?? 16
    const h = voxel3d.layers[0]?.length ?? 16
    const d = voxel3d.depth
    const maxDim = Math.max(w, h, d)
    const pad = 1.25
    cam.left = -(maxDim / 2) * pad
    cam.right = (maxDim / 2) * pad
    cam.top = (maxDim / 2) * pad
    cam.bottom = -(maxDim / 2) * pad
    cam.updateProjectionMatrix()
  }, [voxel3d, camera])
  return null
}

function Scene2D({ data, colorMap, tilt }: { data: string[]; colorMap: ColorMap; tilt: number }) {
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
      <group rotation={[tilt, 0, 0]}>
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

function Scene3D({ voxel3d, tilt }: { voxel3d: Voxel3DGrid; tilt: number }) {
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
      <AdaptiveCamera3D voxel3d={voxel3d} />
      <group rotation={[tilt, 0, 0]}>
        <VoxelMesh3D voxel3d={voxel3d} />
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

export default function VoxelScene(props: VoxelSceneProps) {
  const { dpr, antialias } = useDisplayRenderGlFallback()
  const tilt = props.cameraTilt ?? 0.3
  const is3d = props.mode === '3d'

  return (
    <Canvas
      key={`voxel-${is3d ? '3d' : '2d'}-${dpr}-${antialias}`}
      orthographic
      camera={
        is3d
          ? { position: [0, 0, 28] as const, near: 0.1, far: 80 }
          : { position: [0, 0, 18] as const, near: 0.1, far: 60 }
      }
      gl={{ antialias }}
      dpr={dpr}
      style={{ width: 320, height: 320, ...props.canvasStyle }}
      className={`pixelated block max-w-full ${props.className ?? ''}`}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(0x020617))
        gl.setPixelRatio(dpr)
      }}
    >
      {is3d ? (
        <Scene3D voxel3d={props.voxel3d} tilt={tilt} />
      ) : (
        <Scene2D data={props.data} colorMap={props.colorMap} tilt={tilt} />
      )}
    </Canvas>
  )
}
