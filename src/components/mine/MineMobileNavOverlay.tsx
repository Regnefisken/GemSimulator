import { useEffect, useRef, useState } from 'react'
import { mineMobileSurface } from './mineMobileSurface'

const STICK_RADIUS = 52
const LOOK_PAD_SIZE = 112

function stickVec(dx: number, dy: number) {
  let vx = dx
  let vy = dy
  const len = Math.hypot(vx, vy)
  if (len > STICK_RADIUS) {
    const s = STICK_RADIUS / len
    vx *= s
    vy *= s
  }
  return { x: vx / STICK_RADIUS, z: -vy / STICK_RADIUS }
}

type Props = {
  /** Fx åben kiste — skjul kontroller og stop input. */
  disabled?: boolean
}

/**
 * Venstre: virtuel joystick (WASD). Højre: lille kig-flade så enkelttryk på scenen stadig kan hugge/vælge mål.
 */
export default function MineMobileNavOverlay({ disabled = false }: Props) {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  const stickRootRef = useRef<HTMLDivElement>(null)
  const stickActive = useRef(false)
  const lookActive = useRef(false)
  const lastLook = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const fn = () => setCoarse(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  useEffect(() => {
    if (disabled) {
      mineMobileSurface.moveStick.x = 0
      mineMobileSurface.moveStick.z = 0
      stickActive.current = false
      lookActive.current = false
    }
  }, [disabled])

  const onStickPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    stickActive.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const el = stickRootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const v = stickVec(e.clientX - cx, e.clientY - cy)
    mineMobileSurface.moveStick.x = v.x
    mineMobileSurface.moveStick.z = v.z
  }

  const onStickPointerMove = (e: React.PointerEvent) => {
    if (disabled || !stickActive.current) return
    const el = stickRootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const v = stickVec(e.clientX - cx, e.clientY - cy)
    mineMobileSurface.moveStick.x = v.x
    mineMobileSurface.moveStick.z = v.z
  }

  const endStick = () => {
    stickActive.current = false
    mineMobileSurface.moveStick.x = 0
    mineMobileSurface.moveStick.z = 0
  }

  const onLookPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    lookActive.current = true
    lastLook.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onLookPointerMove = (e: React.PointerEvent) => {
    if (disabled || !lookActive.current) return
    const dx = e.clientX - lastLook.current.x
    const dy = e.clientY - lastLook.current.y
    lastLook.current = { x: e.clientX, y: e.clientY }
    mineMobileSurface.lookDelta.x += dx
    mineMobileSurface.lookDelta.y += dy
  }

  const endLook = () => {
    lookActive.current = false
  }

  if (!coarse) return null
  if (disabled) return null

  return (
    <>
      <div
        ref={stickRootRef}
        className="pointer-events-auto absolute z-[22] bottom-[max(7.5rem,env(safe-area-inset-bottom,0px)+6rem)] left-3 flex h-[120px] w-[120px] touch-none select-none items-center justify-center rounded-full border border-slate-600/50 bg-slate-950/55 shadow-lg backdrop-blur-sm"
        onPointerDown={onStickPointerDown}
        onPointerMove={onStickPointerMove}
        onPointerUp={endStick}
        onPointerCancel={endStick}
        role="application"
        aria-label="Virtuel joystick — bevægelse"
      >
        <div className="pointer-events-none h-10 w-10 rounded-full border border-amber-500/40 bg-amber-500/15 shadow-inner" />
      </div>
      <div
        className="pointer-events-auto absolute z-[22] bottom-[max(7.5rem,env(safe-area-inset-bottom,0px)+6rem)] right-3 flex touch-none select-none items-center justify-center rounded-2xl border border-slate-600/50 bg-slate-950/55 shadow-lg backdrop-blur-sm"
        style={{ width: LOOK_PAD_SIZE, height: LOOK_PAD_SIZE }}
        onPointerDown={onLookPointerDown}
        onPointerMove={onLookPointerMove}
        onPointerUp={endLook}
        onPointerCancel={endLook}
        role="application"
        aria-label="Kig — træk for at dreje hovedet"
      >
        <span className="pointer-events-none text-center text-[10px] font-medium leading-tight text-slate-400 px-1">
          Kig
        </span>
      </div>
    </>
  )
}
