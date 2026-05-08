import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useState, type RefObject } from 'react'
import type { Camera, Object3D } from 'three'
import * as THREE from 'three'

const _objPos = new THREE.Vector3()
const _camPos = new THREE.Vector3()
const _wPos = new THREE.Vector3()

/** Samme som drei `Html` `objectScale` — skala der ganges på `distanceFactor` i ikke-`transform`-tilstand. */
function objectScaleForHtml(el: Object3D, camera: Camera): number {
  if (camera instanceof THREE.OrthographicCamera) {
    return camera.zoom
  }
  if (camera instanceof THREE.PerspectiveCamera) {
    _wPos.setFromMatrixPosition(el.matrixWorld)
    camera.getWorldPosition(_camPos)
    const vFOV = (camera.fov * Math.PI) / 180
    const dist = _wPos.distanceTo(_camPos)
    const scaleFOV = 2 * Math.tan(vFOV / 2) * dist
    return 1 / scaleFOV
  }
  return 1
}

/**
 * Drei `<Html distanceFactor>` (uden `transform`): endelig CSS-scale ≈ `objectScale * distanceFactor`.
 * Tæt på kamera bliver den enorm → sløret tekst/bar.
 *
 * 1) Afstands-dæmpning under `minWorldDistance`.
 * 2) Loft på `objectScale * distanceFactor` så overlay aldrig overskrider `maxCssScale`.
 */
export function useLabelHtmlDistanceFactor(
  anchorRef: RefObject<Object3D | null>,
  baseDistanceFactor: number,
  minWorldDistance: number,
  maxCssScale: number,
): number {
  const camera = useThree((s) => s.camera)
  const [distanceFactor, setDistanceFactor] = useState(baseDistanceFactor)
  const prevRef = useRef(baseDistanceFactor)

  useFrame(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    anchor.getWorldPosition(_objPos)
    camera.getWorldPosition(_camPos)
    const dist = _objPos.distanceTo(_camPos)
    let next = baseDistanceFactor * Math.min(1, dist / minWorldDistance)
    const os = objectScaleForHtml(anchor, camera)
    if (os * next > maxCssScale) {
      next = maxCssScale / os
    }
    if (Math.abs(prevRef.current - next) > 0.015) {
      prevRef.current = next
      setDistanceFactor(next)
    }
  })

  return distanceFactor
}
