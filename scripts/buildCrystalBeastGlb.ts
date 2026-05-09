/**
 * Bygger crystal_beast.glb (samme hierarki + walk/attack som Crystal Beast-generator HTML).
 * Kør: npx tsx scripts/buildCrystalBeastGlb.ts
 */
/* GLTFExporter bruger FileReader — polyfill til Node. */
class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) {
    void blob
      .arrayBuffer()
      .then((ab) => {
        this.result = ab
        this.onloadend?.()
      })
      .catch((e) => {
        console.error(e)
      })
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
;(globalThis as any).FileReader = NodeFileReader

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

function buildBeast(): THREE.Group {
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a24,
    roughness: 0.95,
    metalness: 0.1,
    flatShading: true,
  })

  const bodyGeo = new THREE.DodecahedronGeometry(1, 1)
  const limbGeo = new THREE.IcosahedronGeometry(1, 0)

  const beastRoot = new THREE.Group()
  beastRoot.name = 'Root'

  const body = new THREE.Group()
  body.name = 'Body'
  body.position.set(0, 0.75, 0)
  beastRoot.add(body)

  const bodyMesh = new THREE.Mesh(bodyGeo, rockMat)
  bodyMesh.scale.set(0.45, 0.55, 0.4)
  bodyMesh.castShadow = true
  bodyMesh.receiveShadow = true
  body.add(bodyMesh)

  const head = new THREE.Group()
  head.name = 'Head'
  head.position.set(0, 0.35, 0.3)
  body.add(head)

  const headMesh = new THREE.Mesh(limbGeo, rockMat)
  headMesh.scale.set(0.25, 0.2, 0.3)
  headMesh.castShadow = true
  head.add(headMesh)

  const eyeGeo = new THREE.BoxGeometry(0.06, 0.04, 0.02)
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x00ffcc,
    emissiveIntensity: 5,
  })
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
  leftEye.position.set(0.12, 0.05, 0.28)
  leftEye.rotation.y = Math.PI / 6
  const rightEye = leftEye.clone()
  rightEye.position.set(-0.12, 0.05, 0.28)
  rightEye.rotation.y = -Math.PI / 6
  head.add(leftEye, rightEye)

  function createArm(isLeft: boolean) {
    const arm = new THREE.Group()
    arm.name = isLeft ? 'Arm_L' : 'Arm_R'
    const sign = isLeft ? 1 : -1
    arm.position.set(sign * 0.55, 0.25, 0)
    const upperArm = new THREE.Mesh(limbGeo, rockMat)
    upperArm.scale.set(0.18, 0.35, 0.18)
    upperArm.position.set(sign * 0.05, -0.25, 0)
    upperArm.castShadow = true
    arm.add(upperArm)
    const lowerArm = new THREE.Mesh(bodyGeo, rockMat)
    lowerArm.scale.set(0.25, 0.35, 0.25)
    lowerArm.position.set(sign * 0.05, -0.75, 0.1)
    lowerArm.castShadow = true
    arm.add(lowerArm)
    return arm
  }
  body.add(createArm(true))
  body.add(createArm(false))

  function createLeg(isLeft: boolean) {
    const leg = new THREE.Group()
    leg.name = isLeft ? 'Leg_L' : 'Leg_R'
    const sign = isLeft ? 1 : -1
    leg.position.set(sign * 0.25, -0.25, 0)
    const legMesh = new THREE.Mesh(limbGeo, rockMat)
    legMesh.scale.set(0.2, 0.35, 0.25)
    legMesh.position.set(0, -0.25, 0)
    legMesh.castShadow = true
    leg.add(legMesh)
    return leg
  }
  body.add(createLeg(true))
  body.add(createLeg(false))

  return beastRoot
}

function createAnimationClips(): THREE.AnimationClip[] {
  const q = new THREE.Quaternion()
  const euler = new THREE.Euler()

  function makeQuatTrack(name: string, times: number[], eulerAngles: [number, number, number][]) {
    const values: number[] = []
    eulerAngles.forEach((e) => {
      q.setFromEuler(euler.set(e[0], e[1], e[2]))
      values.push(q.x, q.y, q.z, q.w)
    })
    return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values)
  }

  function makePosTrack(name: string, times: number[], positions: [number, number, number][]) {
    const values: number[] = []
    positions.forEach((p) => values.push(p[0], p[1], p[2]))
    return new THREE.VectorKeyframeTrack(`${name}.position`, times, values)
  }

  const walkTimes = [0, 0.5, 1.0, 1.5, 2.0]
  const tWalk = [
    makePosTrack('Body', walkTimes, [
      [0, 0.75, 0],
      [0, 0.8, 0],
      [0, 0.75, 0],
      [0, 0.8, 0],
      [0, 0.75, 0],
    ]),
    makeQuatTrack('Body', walkTimes, [
      [0, 0, 0],
      [0, -0.1, 0.05],
      [0, 0, 0],
      [0, 0.1, -0.05],
      [0, 0, 0],
    ]),
    makeQuatTrack('Leg_L', walkTimes, [
      [0, 0, 0],
      [0.4, 0, 0],
      [0, 0, 0],
      [-0.4, 0, 0],
      [0, 0, 0],
    ]),
    makeQuatTrack('Leg_R', walkTimes, [
      [0, 0, 0],
      [-0.4, 0, 0],
      [0, 0, 0],
      [0.4, 0, 0],
      [0, 0, 0],
    ]),
    makeQuatTrack('Arm_L', walkTimes, [
      [0, 0, 0.1],
      [-0.3, 0, 0.1],
      [0, 0, 0.1],
      [0.3, 0, 0.1],
      [0, 0, 0.1],
    ]),
    makeQuatTrack('Arm_R', walkTimes, [
      [0, 0, -0.1],
      [0.3, 0, -0.1],
      [0, 0, -0.1],
      [-0.3, 0, -0.1],
      [0, 0, -0.1],
    ]),
  ]
  const walkClip = new THREE.AnimationClip('walk', 2.0, tWalk)

  const attackTimes = [0, 0.6, 0.9, 1.3, 2.0]
  const tAttack = [
    makePosTrack('Body', attackTimes, [
      [0, 0.75, 0],
      [0, 0.65, 0],
      [0, 0.85, 0],
      [0, 0.85, 0],
      [0, 0.75, 0],
    ]),
    makeQuatTrack('Body', attackTimes, [
      [0, 0, 0],
      [-0.2, 0.2, 0],
      [0.3, -0.3, 0],
      [0.3, -0.3, 0],
      [0, 0, 0],
    ]),
    makeQuatTrack('Arm_R', attackTimes, [
      [0, 0, -0.1],
      [0.8, 0, -0.3],
      [-1.8, 0, 0.3],
      [-1.8, 0, 0.3],
      [0, 0, -0.1],
    ]),
    makeQuatTrack('Arm_L', attackTimes, [
      [0, 0, 0.1],
      [-0.3, 0, 0.1],
      [0.6, 0, 0.2],
      [0.6, 0, 0.2],
      [0, 0, 0.1],
    ]),
    makeQuatTrack('Head', attackTimes, [
      [0, 0, 0],
      [0.2, 0, 0],
      [-0.3, 0, 0],
      [-0.3, 0, 0],
      [0, 0, 0],
    ]),
  ]
  const attackClip = new THREE.AnimationClip('attack', 2.0, tAttack)

  return [walkClip, attackClip]
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry?.dispose()
      const m = o.material
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m?.dispose()
    }
  })
}

async function main() {
  const beastRoot = buildBeast()
  const clips = createAnimationClips()

  const exporter = new GLTFExporter()
  const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      beastRoot,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(result)
        else reject(new Error('Forventede binær GLB-output'))
      },
      (err) => reject(err),
      { binary: true, animations: clips, onlyVisible: true, truncateDrawRange: true },
    )
  })

  const outDir = join(dirname(fileURLToPath(import.meta.url)), '../public/assets/mobs')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'crystal_beast.glb')
  writeFileSync(outPath, Buffer.from(glb))
  disposeTree(beastRoot)
  console.log('Skrev', outPath, `(${glb.byteLength} bytes)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
