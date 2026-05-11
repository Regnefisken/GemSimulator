import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  DEFAULT_PICKAXE_TRANSFORM,
  DEFAULT_SWORD_TRANSFORM,
  type HeldFpsTransform,
} from './3d/pickaxeDefaults'

const RAD2DEG = 180 / Math.PI
const DEG2RAD = Math.PI / 180

function pickaxeHeldDefault(): HeldFpsTransform {
  return { ...DEFAULT_PICKAXE_TRANSFORM, scaleMul: 1 }
}

function formatVec3(v: readonly [number, number, number]): string {
  return `[${v.map((n) => (Math.abs(n) < 1e-6 ? 0 : Number(n.toFixed(6)))).join(', ')}]`
}

function formatExport(
  pick: HeldFpsTransform,
  sword: HeldFpsTransform,
  pickGlb: number,
  swordGlb: number,
): string {
  return `// --- Kopiér til pickaxeDefaults.ts ---
// baseRot, meshOrient og inPlaceSpinRad er radianer. inPlaceSpinRad = drejning om synslinjen (kamera→våben).

export const DEFAULT_PICKAXE_TRANSFORM: PickaxeTransform = {
  basePos: ${formatVec3(pick.basePos)},
  baseRot: ${formatVec3(pick.baseRot)},
  meshOrient: ${formatVec3(pick.meshOrient)},
  gripColumn: ${pick.gripColumn},
  inPlaceSpinRad: ${Number((pick.inPlaceSpinRad ?? 0).toFixed(6))},
}

// I Pickaxe3D: PICKAXE_HELD bruger scaleMul ${pick.scaleMul} (voxel-skala)

export const DEFAULT_SWORD_TRANSFORM: HeldFpsTransform = {
  basePos: ${formatVec3(sword.basePos)},
  baseRot: ${formatVec3(sword.baseRot)},
  meshOrient: ${formatVec3(sword.meshOrient)},
  gripColumn: ${sword.gripColumn},
  scaleMul: ${sword.scaleMul},
  inPlaceSpinRad: ${Number((sword.inPlaceSpinRad ?? 0).toFixed(6))},
}

// --- Kopiér til Pickaxe3D.tsx (GLB-gren, erstat glbMul-linjen) ---
// pickaxe: ${Number(pickGlb.toFixed(4))}
// sword:   ${Number(swordGlb.toFixed(4))}
// Brug: const glbMul = heldWeaponKind === 'sword' ? ${Number(swordGlb.toFixed(4))} : ${Number(pickGlb.toFixed(4))}
`
}

type Vec3Key = 'basePos' | 'baseRot' | 'meshOrient'

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function Vec3SliderRow({
  label,
  vecKey,
  weapon,
  onChange,
  eulerAsDegrees,
  min,
  max,
  step,
}: {
  label: string
  vecKey: Vec3Key
  weapon: HeldFpsTransform
  onChange: (key: Vec3Key, axis: 0 | 1 | 2, value: number) => void
  eulerAsDegrees: boolean
  min: number
  max: number
  step: number
}) {
  const v = weapon[vecKey]
  const mul = eulerAsDegrees ? RAD2DEG : 1
  const inv = eulerAsDegrees ? DEG2RAD : 1
  const axes = ['X', 'Y', 'Z'] as const
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-slate-500">{label}{eulerAsDegrees ? ' (grader på slider)' : ''}</div>
      {axes.map((ax, i) => {
        const rawDisplay = v[i]! * mul
        const display = clamp(rawDisplay, min, max)
        return (
          <label key={ax} className="flex items-center gap-2">
            <span className="w-3 shrink-0 text-[9px] text-slate-500">{ax}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={display}
              onChange={(e) => {
                const x = Number(e.target.value)
                if (Number.isNaN(x)) return
                onChange(vecKey, i as 0 | 1 | 2, x * inv)
              }}
              className="flex-1 min-w-0 h-2 accent-amber-600 cursor-grab active:cursor-grabbing"
            />
            <span className="w-[3.25rem] shrink-0 text-right font-mono text-[9px] text-slate-400 tabular-nums">
              {eulerAsDegrees ? display.toFixed(1) : display.toFixed(2)}
            </span>
          </label>
        )
      })}
    </div>
  )
}

function ScalarSliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  decimals = 2,
  accentClass = 'accent-amber-600',
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  decimals?: number
  accentClass?: string
}) {
  const v = clamp(value, min, max)
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-[10px] text-slate-500">
        <span>{label}</span>
        <span className="font-mono text-slate-400 tabular-nums">{v.toFixed(decimals)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => {
          const x = Number(e.target.value)
          if (Number.isNaN(x)) return
          onChange(x)
        }}
        className={`w-full h-2 cursor-grab active:cursor-grabbing ${accentClass}`}
      />
    </div>
  )
}

type Props = {
  pick: HeldFpsTransform
  setPick: Dispatch<SetStateAction<HeldFpsTransform>>
  sword: HeldFpsTransform
  setSword: Dispatch<SetStateAction<HeldFpsTransform>>
  pickGlb: number
  setPickGlb: Dispatch<SetStateAction<number>>
  swordGlb: number
  setSwordGlb: Dispatch<SetStateAction<number>>
}

export default function WeaponFpsDevPanel({
  pick,
  setPick,
  sword,
  setSword,
  pickGlb,
  setPickGlb,
  swordGlb,
  setSwordGlb,
}: Props) {
  const [tab, setTab] = useState<'pick' | 'sword'>('pick')
  const w = tab === 'pick' ? pick : sword
  const setW = tab === 'pick' ? setPick : setSword

  const patchVec = useCallback((key: Vec3Key, axis: 0 | 1 | 2, value: number) => {
    setW((prev) => {
      const next = { ...prev, [key]: [...prev[key]] as [number, number, number] }
      next[key][axis] = value
      return next
    })
  }, [setW])

  const exportText = useMemo(() => formatExport(pick, sword, pickGlb, swordGlb), [pick, sword, pickGlb, swordGlb])

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportText)
    } catch {
      window.prompt('Kopiér manuelt:', exportText)
    }
  }, [exportText])

  const glbVal = tab === 'pick' ? pickGlb : swordGlb
  const setGlb = tab === 'pick' ? setPickGlb : setSwordGlb

  return (
    <div
      className="pointer-events-auto fixed right-2 top-20 z-[200] w-[min(96vw,22rem)] max-h-[min(85vh,620px)] overflow-y-auto rounded-xl border border-amber-600/60 bg-slate-950/95 p-3 text-[11px] text-slate-200 shadow-2xl backdrop-blur-md"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="font-semibold text-amber-200/95 text-xs mb-1">FPS våben (dev)</div>
      <p className="text-[10px] text-slate-500 leading-snug mb-2">
        Kun i development. URL: <code className="text-amber-300/90">?weaponDev=1</code>. Våbenet{' '}
        <strong className="text-slate-300">forbliver synligt</strong> mens du slider. Brug sektionen{' '}
        <strong className="text-slate-300">Størrelse</strong> for GLB (to sliders + samlet tal).{' '}
        <strong className="text-slate-300">gripColumn</strong> forklares under «Greb». Tab skifter aktivt våben — undgå
        at klikke på mine-canvas under justering.
      </p>
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setTab('pick')}
          className={
            'flex-1 rounded-lg py-1 text-xs font-semibold border ' +
            (tab === 'pick' ? 'bg-amber-800/80 border-amber-500 text-amber-50' : 'bg-slate-900 border-slate-600 text-slate-400')
          }
        >
          Hakke
        </button>
        <button
          type="button"
          onClick={() => setTab('sword')}
          className={
            'flex-1 rounded-lg py-1 text-xs font-semibold border ' +
            (tab === 'sword' ? 'bg-violet-800/80 border-violet-400 text-violet-50' : 'bg-slate-900 border-slate-600 text-slate-400')
          }
        >
          Sværd
        </button>
      </div>

      <div className="space-y-3 border-t border-slate-700/80 pt-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Placering & vinkel</div>
        <Vec3SliderRow
          label="basePos (kamera-rum, meter)"
          vecKey="basePos"
          weapon={w}
          onChange={patchVec}
          eulerAsDegrees={false}
          min={-5}
          max={3}
          step={0.02}
        />
        <Vec3SliderRow
          label="baseRot (ydre gruppe)"
          vecKey="baseRot"
          weapon={w}
          onChange={patchVec}
          eulerAsDegrees
          min={-180}
          max={180}
          step={0.5}
        />
        <Vec3SliderRow
          label="meshOrient (undergruppe)"
          vecKey="meshOrient"
          weapon={w}
          onChange={patchVec}
          eulerAsDegrees
          min={-180}
          max={180}
          step={0.5}
        />

        <ScalarSliderRow
          label="Spin på stedet (° om synslinjen)"
          value={(w.inPlaceSpinRad ?? 0) * RAD2DEG}
          min={-180}
          max={180}
          step={1}
          onChange={(v) => setW((p) => ({ ...p, inPlaceSpinRad: v * DEG2RAD }))}
          decimals={0}
          accentClass="accent-cyan-600"
        />
        <p className="text-[9px] text-slate-500 -mt-1 leading-snug">
          Drejer våbnet som et «klistermærke» i billedplanet: akse er linjen fra kameraet til våbenets placering — ikke
          en lokal model-akse (den gav buen).
        </p>

        <div className="rounded-lg border border-slate-700/80 bg-slate-900/40 p-2.5 space-y-2">
          <div className="text-[10px] font-semibold text-slate-200">Størrelse</div>
          <p className="text-[9px] text-slate-500 leading-snug">
            Med <strong className="text-slate-400">GLB</strong>-våben bliver størrelsen:{" "}
            <span className="font-mono text-slate-300">GLB-basis × samlet skala</span>. Begge sliders påvirker
            resultatet — tal i kassen nedenfor viser den <strong className="text-slate-400">samlede</strong> GLB-skala
            lige nu.
          </p>
          <div className="rounded border border-amber-900/40 bg-slate-950/90 px-2 py-1.5 text-center font-mono text-[11px] text-amber-100/95">
            GLB samlet: {(glbVal * w.scaleMul).toFixed(3)}
            <span className="block text-[9px] font-sans font-normal text-slate-500 mt-0.5">
              ({glbVal.toFixed(2)} × {w.scaleMul.toFixed(2)})
            </span>
          </div>
          <ScalarSliderRow
            label="Samlet skala (scaleMul)"
            value={w.scaleMul}
            min={0.1}
            max={6}
            step={0.02}
            onChange={(v) => setW((p) => ({ ...p, scaleMul: v }))}
            decimals={2}
            accentClass="accent-amber-500"
          />
          <ScalarSliderRow
            label={`GLB-basis — ${tab === 'pick' ? 'hakke' : 'sværd'} (.glb)`}
            value={glbVal}
            min={0.05}
            max={3}
            step={0.02}
            onChange={(v) => setGlb(v)}
            decimals={2}
            accentClass={tab === 'pick' ? 'accent-amber-600' : 'accent-violet-500'}
          />
        </div>

        <div className="rounded-lg border border-slate-700/60 bg-slate-900/30 p-2.5 space-y-2">
          <div className="text-[10px] font-semibold text-slate-200">Greb (kun voxel-grid)</div>
          <p className="text-[9px] text-slate-500 leading-snug">
            <strong className="text-slate-400">gripColumn</strong> er hvilken <em>lodrette kolonne</em> (0 = venstre
            kant) i det lille 2D-pixelgitter for hakke/sværd, som bruges som <strong>pivot</strong>, når våbnet tegnes
            som <strong>voxels</strong>. Den flytter «hvor skaftet sidder» i forhold til modellen. Når du bruger{" "}
            <strong className="text-slate-400">GLB</strong>, har den <strong>ingen effekt</strong> — kun placering
            ovenfor + størrelse gælder.
          </p>
          <ScalarSliderRow
            label="gripColumn (kolonne-index)"
            value={w.gripColumn}
            min={-1}
            max={8}
            step={0.05}
            onChange={(v) => setW((p) => ({ ...p, gripColumn: v }))}
            decimals={2}
            accentClass="accent-slate-500"
          />
        </div>

        <div className="flex flex-wrap gap-1 pt-1">
          <button
            type="button"
            onClick={() => {
              if (tab === 'pick') {
                setPick(pickaxeHeldDefault())
                setPickGlb(0.44)
              } else {
                setSword({ ...DEFAULT_SWORD_TRANSFORM })
                setSwordGlb(0.52)
              }
            }}
            className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
          >
            Nulstil {tab === 'pick' ? 'hakke' : 'sværd'}
          </button>
          <button
            type="button"
            onClick={copyAll}
            className="rounded-lg border border-emerald-600/60 bg-emerald-950/80 px-2 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-900/80"
          >
            Kopiér alt
          </button>
        </div>
      </div>

      <details className="mt-2 border-t border-slate-700/80 pt-2">
        <summary className="cursor-pointer text-[10px] text-slate-400 select-none">Rå eksport</summary>
        <textarea
          readOnly
          value={exportText}
          rows={12}
          className="mt-1 w-full resize-y rounded border border-slate-700 bg-slate-900 p-2 font-mono text-[9px] text-slate-300 select-text"
          spellCheck={false}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </details>
    </div>
  )
}

export { pickaxeHeldDefault }
