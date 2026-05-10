/**
 * Bygger grotte_goblin.glb (samme hierarki + idle/walk/attack som Grotte-Goblin-generator HTML).
 * Kør: npx tsx scripts/buildGrotteGoblinGlb.ts
 */
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

/** Fast krystaller (HTML brugte Math.random — deterministisk til reproducerbar GLB). */
const CRYSTAL_LOCAL = [
  { pos: [-0.14, 0.14, -0.17] as const, rot: [0.4, 0.2, 0.1] as const },
  { pos: [0.11, 0.24, -0.19] as const, rot: [-0.2, 0.5, 0.3] as const },
  { pos: [-0.07, 0.29, -0.15] as const, rot: [0.3, -0.1, 0.4] as const },
  { pos: [0.17, 0.11, -0.21] as const, rot: [-0.4, 0.3, -0.2] as const },
]

function buildGoblin(): THREE.Group {
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 })
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 })
  const gemMat = new THREE.MeshStandardMaterial({
    color: 0x24e0b5,
    emissive: 0x24e0b5,
    emissiveIntensity: 2.0,
    roughness: 0.1,
    metalness: 0.8,
  })
  const purpleEyeMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0xa855f7,
    emissiveIntensity: 2.0,
    roughness: 0.1,
    metalness: 0.8,
  })
  const weaponMetalMat = new THREE.MeshStandardMaterial({
    color: 0x777777,
    roughness: 0.4,
    metalness: 0.9,
  })

  const bodyGeo = new THREE.BoxGeometry(0.5, 0.5, 0.35)
  const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35)
  const limbGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15)
  const crystalGeo = new THREE.DodecahedronGeometry(0.08, 0)

  const root = new THREE.Group()
  root.name = 'Grotte_Goblin'

  const spine = new THREE.Group()
  spine.name = 'Spine'
  spine.position.y = 0.5
  root.add(spine)

  const torsoMesh = new THREE.Mesh(bodyGeo, skinMat)
  torsoMesh.position.y = 0.25
  torsoMesh.castShadow = true
  spine.add(torsoMesh)

  const headGroup = new THREE.Group()
  headGroup.name = 'Head'
  headGroup.position.y = 0.55
  spine.add(headGroup)

  const headMesh = new THREE.Mesh(headGeo, skinMat)
  headMesh.position.y = 0.15
  headMesh.castShadow = true
  headGroup.add(headMesh)

  const eyeGeo = new THREE.BoxGeometry(0.08, 0.04, 0.02)
  const eyeL = new THREE.Mesh(eyeGeo, purpleEyeMat)
  eyeL.position.set(-0.08, 0.2, 0.18)
  const eyeR = new THREE.Mesh(eyeGeo, purpleEyeMat)
  eyeR.position.set(0.08, 0.2, 0.18)
  headGroup.add(eyeL, eyeR)

  for (let i = 0; i < CRYSTAL_LOCAL.length; i++) {
    const { pos, rot } = CRYSTAL_LOCAL[i]!
    const crystal = new THREE.Mesh(crystalGeo, gemMat)
    crystal.position.set(pos[0], pos[1], pos[2])
    crystal.rotation.set(rot[0], rot[1], rot[2])
    spine.add(crystal)
  }

  const armLGroup = new THREE.Group()
  armLGroup.name = 'ArmL'
  armLGroup.position.set(-0.35, 0.45, 0)
  spine.add(armLGroup)
  const armLMesh = new THREE.Mesh(limbGeo, skinMat)
  armLMesh.position.y = -0.15
  armLMesh.castShadow = true
  armLGroup.add(armLMesh)

  const armRGroup = new THREE.Group()
  armRGroup.name = 'ArmR'
  armRGroup.position.set(0.35, 0.45, 0)
  spine.add(armRGroup)
  const armRMesh = new THREE.Mesh(limbGeo, skinMat)
  armRMesh.position.y = -0.15
  armRMesh.castShadow = true
  armRGroup.add(armRMesh)

  const weaponGroup = new THREE.Group()
  weaponGroup.name = 'Weapon'
  weaponGroup.position.set(0, -0.3, 0.1)
  weaponGroup.rotation.x = Math.PI / 2
  armRGroup.add(weaponGroup)

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8), leatherMat)
  const pickHead = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), weaponMetalMat)
  pickHead.position.y = 0.3
  const pickSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), gemMat)
  pickSpike.position.set(0, 0.3, 0.3)
  pickSpike.rotation.x = Math.PI / 2
  weaponGroup.add(handle, pickHead, pickSpike)

  const legLGroup = new THREE.Group()
  legLGroup.name = 'LegL'
  legLGroup.position.set(-0.15, 0.5, 0)
  root.add(legLGroup)
  const legLMesh = new THREE.Mesh(limbGeo, leatherMat)
  legLMesh.position.y = -0.25
  legLMesh.castShadow = true
  legLGroup.add(legLMesh)

  const legRGroup = new THREE.Group()
  legRGroup.name = 'LegR'
  legRGroup.position.set(0.15, 0.5, 0)
  root.add(legRGroup)
  const legRMesh = new THREE.Mesh(limbGeo, leatherMat)
  legRMesh.position.y = -0.25
  legRMesh.castShadow = true
  legRGroup.add(legRMesh)

  return root
}

function createAnimationClips(): THREE.AnimationClip[] {
  function createQuatTrack(nodeName: string, times: number[], eulerAngles: [number, number, number][]) {
    const values: number[] = []
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    for (let i = 0; i < eulerAngles.length; i++) {
      const ea = eulerAngles[i]!
      e.set(ea[0], ea[1], ea[2])
      q.setFromEuler(e)
      values.push(q.x, q.y, q.z, q.w)
    }
    return new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, values)
  }

  function createVectorTrack(nodeName: string, times: number[], positions: [number, number, number][]) {
    const values: number[] = []
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]!
      values.push(p[0], p[1], p[2])
    }
    return new THREE.VectorKeyframeTrack(`${nodeName}.position`, times, values)
  }

  const idleTimes = [0, 1.5, 3.0]
  const idleSpineRot = createQuatTrack('Spine', idleTimes, [
    [0.1, 0, 0],
    [0.15, 0, 0],
    [0.1, 0, 0],
  ])
  const idleSpinePos = createVectorTrack('Spine', idleTimes, [
    [0, 0.5, 0],
    [0, 0.48, 0],
    [0, 0.5, 0],
  ])
  const idleArmL = createQuatTrack('ArmL', idleTimes, [
    [0.1, 0, 0.1],
    [0.15, 0, 0.15],
    [0.1, 0, 0.1],
  ])
  const idleArmR = createQuatTrack('ArmR', idleTimes, [
    [-0.2, 0, -0.1],
    [-0.15, 0, -0.15],
    [-0.2, 0, -0.1],
  ])
  const idleHead = createQuatTrack('Head', idleTimes, [
    [0, 0, 0],
    [0.05, 0, 0],
    [0, 0, 0],
  ])
  const clipIdle = new THREE.AnimationClip('idle', 3.0, [
    idleSpineRot,
    idleSpinePos,
    idleArmL,
    idleArmR,
    idleHead,
  ])

  const walkTimes = [0, 0.3, 0.6, 0.9, 1.2]
  const walkSpineRot = createQuatTrack('Spine', walkTimes, [
    [0.3, 0, 0],
    [0.35, -0.1, 0.05],
    [0.3, 0, 0],
    [0.35, 0.1, -0.05],
    [0.3, 0, 0],
  ])
  const walkSpinePos = createVectorTrack('Spine', walkTimes, [
    [0, 0.45, 0],
    [0, 0.48, 0],
    [0, 0.45, 0],
    [0, 0.48, 0],
    [0, 0.45, 0],
  ])
  const walkLegL = createQuatTrack('LegL', walkTimes, [
    [-0.5, 0, 0],
    [0, 0, 0],
    [0.5, 0, 0],
    [0, 0, 0],
    [-0.5, 0, 0],
  ])
  const walkLegR = createQuatTrack('LegR', walkTimes, [
    [0.5, 0, 0],
    [0, 0, 0],
    [-0.5, 0, 0],
    [0, 0, 0],
    [0.5, 0, 0],
  ])
  const walkArmL = createQuatTrack('ArmL', walkTimes, [
    [0.6, 0, 0.2],
    [0, 0, 0.2],
    [-0.4, 0, 0.2],
    [0, 0, 0.2],
    [0.6, 0, 0.2],
  ])
  const walkArmR = createQuatTrack('ArmR', walkTimes, [
    [-0.4, 0, -0.2],
    [0, 0, -0.2],
    [0.6, 0, -0.2],
    [0, 0, -0.2],
    [-0.4, 0, -0.2],
  ])
  const walkHead = createQuatTrack('Head', walkTimes, [
    [-0.1, 0, 0],
    [-0.1, 0.1, 0],
    [-0.1, 0, 0],
    [-0.1, -0.1, 0],
    [-0.1, 0, 0],
  ])
  const clipWalk = new THREE.AnimationClip('walk', 1.2, [
    walkSpineRot,
    walkSpinePos,
    walkLegL,
    walkLegR,
    walkArmL,
    walkArmR,
    walkHead,
  ])

  const atkTimes = [0, 0.5, 0.8, 1.1, 1.5]
  const atkSpine = createQuatTrack('Spine', atkTimes, [
    [0.1, 0, 0],
    [0, 0.5, 0],
    [0.4, -0.2, 0],
    [0.2, 0, 0],
    [0.1, 0, 0],
  ])
  const atkArmR = createQuatTrack('ArmR', atkTimes, [
    [-0.2, 0, -0.1],
    [-2.0, 0.5, -0.2],
    [1.0, -0.5, 0],
    [0.5, -0.2, 0],
    [-0.2, 0, -0.1],
  ])
  const atkArmL = createQuatTrack('ArmL', atkTimes, [
    [0.1, 0, 0.1],
    [-0.5, 0, 0.2],
    [0.5, 0, 0.4],
    [0.2, 0, 0.2],
    [0.1, 0, 0.1],
  ])
  const atkHead = createQuatTrack('Head', atkTimes, [
    [0, 0, 0],
    [0, -0.4, 0],
    [-0.2, 0.2, 0],
    [0, 0, 0],
    [0, 0, 0],
  ])
  const atkLegL = createQuatTrack('LegL', [0, 1.5], [
    [0, 0, 0],
    [0, 0, 0],
  ])
  const atkLegR = createQuatTrack('LegR', [0, 1.5], [
    [0, 0, 0],
    [0, 0, 0],
  ])
  const clipAttack = new THREE.AnimationClip('attack', 1.5, [
    atkSpine,
    atkArmR,
    atkArmL,
    atkHead,
    atkLegL,
    atkLegR,
  ])

  return [clipIdle, clipWalk, clipAttack]
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
  const root = buildGoblin()
  const clips = createAnimationClips()

  const exporter = new GLTFExporter()
  const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      root,
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
  const outPath = join(outDir, 'grotte_goblin.glb')
  writeFileSync(outPath, Buffer.from(glb))
  disposeTree(root)
  console.log('Skrev', outPath, `(${glb.byteLength} bytes)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
