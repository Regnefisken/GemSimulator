import * as THREE from 'three'
import type { ColorMap } from '../types'

const dummy = new THREE.Object3D()
const _color = new THREE.Color()

/** Orthographic voxel stack (option A): one box per non-`.` cell, flat shading. */
export class VoxelGemView {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.OrthographicCamera
  private readonly group: THREE.Group
  private readonly instanced: THREE.InstancedMesh
  private readonly maxInstances: number

  constructor(container: HTMLElement, maxInstances = 320) {
    this.maxInstances = maxInstances
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x020617)

    this.camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 60)
    this.camera.position.set(0, 0, 18)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(320, 320)
    this.renderer.domElement.className = 'pixelated block max-w-full'
    container.appendChild(this.renderer.domElement)

    this.group = new THREE.Group()
    this.group.rotation.x = 0.3
    this.group.rotation.y = -0.45
    this.scene.add(this.group)

    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.7)
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.15,
      flatShading: true,
    })
    this.instanced = new THREE.InstancedMesh(geo, mat, this.maxInstances)
    this.instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.instanced.count = 0
    this.group.add(this.instanced)

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.58))
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(5, 8, 10)
    this.scene.add(key)
    const rim = new THREE.DirectionalLight(0xc7d2fe, 0.32)
    rim.position.set(-6, -3, -4)
    this.scene.add(rim)

    this.render()
  }

  setGem(data: string[], colorMap: ColorMap): void {
    const h = data.length
    const w = data[0]?.length ?? 0
    let idx = 0
    outer: for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = data[y][x]
        if (ch === '.') continue
        if (idx >= this.maxInstances) break outer
        const hex = colorMap[ch] ?? '#000000'
        const cx = x - (w - 1) / 2
        const cy = -y + (h - 1) / 2
        dummy.position.set(cx, cy, 0)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        this.instanced.setMatrixAt(idx, dummy.matrix)
        _color.set(hex)
        this.instanced.setColorAt(idx, _color)
        idx++
      }
    }
    this.instanced.count = idx
    this.instanced.instanceMatrix.needsUpdate = true
    if (this.instanced.instanceColor) {
      this.instanced.instanceColor.needsUpdate = true
    }
    this.fitCamera(w, h)
    this.render()
  }

  private fitCamera(w: number, h: number): void {
    const pad = 1.15
    const halfW = (w / 2) * pad
    const halfH = (h / 2) * pad
    this.camera.left = -halfW
    this.camera.right = halfW
    this.camera.top = halfH
    this.camera.bottom = -halfH
    this.camera.updateProjectionMatrix()
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  toDataURL(type = 'image/png'): string {
    this.render()
    return this.renderer.domElement.toDataURL(type)
  }

  dispose(): void {
    this.instanced.geometry.dispose()
    ;(this.instanced.material as THREE.Material).dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
