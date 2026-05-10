import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { ColorMap, Voxel3DGrid } from '../types'
import { useDisplayRenderGlFallback } from './layout/DisplayRenderContext'
import VoxelMesh from './VoxelMesh'
import VoxelMesh3D from './VoxelMesh3D'

export type VoxelSceneProps2D = {
  mode?: '2d'
  data: string[]
  colorMap: ColorMap
  className?: string
  canvasStyle?: CSSProperties
  cameraTilt?: number
  /**
   * Uden OrbitControls (ingen pointer-listeners på canvas) — bruges til små klik-flader
   * ovenpå knapper (fx kiste-kort), så pointer ikke “hænger” i preview.
   */
  disableOrbitControls?: boolean
}

export type VoxelSceneProps3D = {
  mode: '3d'
  voxel3d: Voxel3DGrid
  className?: string
  canvasStyle?: CSSProperties
  cameraTilt?: number
  /** Ingen orbit — langsom Y-rotation (fx små kiste-kort oven på knapper). */
  disableOrbitControls?: boolean
}

export type VoxelSceneProps = VoxelSceneProps2D | VoxelSceneProps3D

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

/** Samme vinkel som OrbitControls-start i Scene2D med controls. */
const SCENE2D_YAW = -0.45

function Scene2DNoPointer({ data, colorMap, tilt }: { data: string[]; colorMap: ColorMap; tilt: number }) {
  const spinRef = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = spinRef.current
    if (!g) return
    g.rotation.y += dt * 0.55
  })

  return (
    <>
      <AdaptiveCamera data={data} />
      <group ref={spinRef} rotation={[0, SCENE2D_YAW, 0]}>
        <group rotation={[tilt, 0, 0]}>
          <VoxelMesh data={data} colorMap={colorMap} />
        </group>
      </group>
      <ambientLight intensity={0.58} />
      <directionalLight color="#ffffff" intensity={0.9} position={[5, 8, 10]} />
      <directionalLight color="#c7d2fe" intensity={0.32} position={[-6, -3, -4]} />
    </>
  )
}

function Scene2D({
  data,
  colorMap,
  tilt,
  disableOrbitControls,
}: {
  data: string[]
  colorMap: ColorMap
  tilt: number
  disableOrbitControls?: boolean
}) {
  if (disableOrbitControls) {
    return <Scene2DNoPointer data={data} colorMap={colorMap} tilt={tilt} />
  }

  const [autoRotate, setAutoRotate] = useState(true)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  useLayoutEffect(() => {
    const c = controlsRef.current
    if (!c) return
    c.setAzimuthalAngle(SCENE2D_YAW)
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

function Scene3DNoPointer({ voxel3d, tilt }: { voxel3d: Voxel3DGrid; tilt: number }) {
  const spinRef = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = spinRef.current
    if (!g) return
    g.rotation.y += dt * 0.55
  })

  return (
    <>
      <AdaptiveCamera3D voxel3d={voxel3d} />
      <group ref={spinRef} rotation={[0, SCENE2D_YAW, 0]}>
        <group rotation={[tilt, 0, 0]}>
          <VoxelMesh3D voxel3d={voxel3d} />
        </group>
      </group>
      <ambientLight intensity={0.58} />
      <directionalLight color="#ffffff" intensity={0.9} position={[5, 8, 10]} />
      <directionalLight color="#c7d2fe" intensity={0.32} position={[-6, -3, -4]} />
    </>
  )
}

function Scene3D({
  voxel3d,
  tilt,
  disableOrbitControls,
}: {
  voxel3d: Voxel3DGrid
  tilt: number
  disableOrbitControls?: boolean
}) {
  if (disableOrbitControls) {
    return <Scene3DNoPointer voxel3d={voxel3d} tilt={tilt} />
  }

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
        <Scene3D
          voxel3d={props.voxel3d}
          tilt={tilt}
          disableOrbitControls={props.disableOrbitControls}
        />
      ) : (
        <Scene2D
          data={props.data}
          colorMap={props.colorMap}
          tilt={tilt}
          disableOrbitControls={props.disableOrbitControls}
        />
      )}
    </Canvas>
  )
}
