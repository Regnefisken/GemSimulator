import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  DEFAULT_SWORD_TRANSFORM,
  defaultHeldPickaxeTransform,
  type HeldFpsTransform,
} from './3d/pickaxeDefaults'

const RAD2DEG = 180 / Math.PI
const DEG2RAD = Math.PI / 180

type PrecisionId = 'normal' | 'fine' | 'ultra'

const PRECISION: Record<PrecisionId, { pos: number; deg: number; spin: number; scale: number; grip: number }> = {
  normal: { pos: 0.02, deg: 0.5, spin: 1, scale: 0.02, grip: 0.05 },
  fine: { pos: 0.005, deg: 0.1, spin: 0.25, scale: 0.005, grip: 0.01 },
  ultra: { pos: 0.001, deg: 0.02, spin: 0.05, scale: 0.001, grip: 0.005 },
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

function NudgePair({ onMinus, onPlus, title }: { onMinus: () => void; onPlus: () => void; title?: string }) {
  return (
    <div className="flex shrink-0 gap-0.5" title={title}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onMinus()
        }}
        className="h-6 w-6 rounded border border-slate-600 bg-slate-800 text-[11px] leading-none text-slate-300 hover:bg-slate-700"
      >
        −
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onPlus()
        }}
        className="h-6 w-6 rounded border border-slate-600 bg-slate-800 text-[11px] leading-none text-slate-300 hover:bg-slate-700"
      >
        +
      </button>
    </div>
  )
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
      <div className="text-[10px] text-slate-500">
        {label}
        {eulerAsDegrees ? ' (grader)' : ''}
      </div>
      {axes.map((ax, i) => {
        const rawDisplay = v[i]! * mul
        const display = clamp(rawDisplay, min, max)
        const applyDisplay = (next: number) => {
          const c = clamp(next, min, max)
          onChange(vecKey, i as 0 | 1 | 2, c * inv)
        }
        return (
          <div key={ax} className="flex items-center gap-1">
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
                applyDisplay(x)
              }}
              className="min-w-0 flex-1 h-2 cursor-grab accent-amber-600 active:cursor-grabbing"
            />
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={display}
              onChange={(e) => {
                const x = parseFloat(e.target.value)
                if (Number.isNaN(x)) return
                applyDisplay(x)
              }}
              className="w-[3.25rem] shrink-0 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[9px] text-slate-200 tabular-nums"
              onPointerDown={(e) => e.stopPropagation()}
            />
            <NudgePair title={`Trin: ${step}`} onMinus={() => applyDisplay(display - step)} onPlus={() => applyDisplay(display + step)} />
          </div>
        )
      })}
    </div>
  )
}

function ScalarControlRow({
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
  const apply = (next: number) => onChange(clamp(next, min, max))
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-[10px] text-slate-500">
        <span>{label}</span>
        <span className="font-mono text-slate-400 tabular-nums">{v.toFixed(decimals)}</span>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={(e) => {
            const x = Number(e.target.value)
            if (Number.isNaN(x)) return
            apply(x)
          }}
          className={`min-w-0 flex-1 h-2 cursor-grab active:cursor-grabbing ${accentClass}`}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={(e) => {
            const x = parseFloat(e.target.value)
            if (Number.isNaN(x)) return
            apply(x)
          }}
          className="w-[3.25rem] shrink-0 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 font-mono text-[9px] text-slate-200 tabular-nums"
          onPointerDown={(e) => e.stopPropagation()}
        />
        <NudgePair title={`Trin: ${step}`} onMinus={() => apply(v - step)} onPlus={() => apply(v + step)} />
      </div>
    </div>
  )
}

type Props = {
  equippedWeapon: 'pickaxe' | 'sword'
  pick: HeldFpsTransform
  setPick: Dispatch<SetStateAction<HeldFpsTransform>>
  sword: HeldFpsTransform
  setSword: Dispatch<SetStateAction<HeldFpsTransform>>
  pickGlb: number
  setPickGlb: Dispatch<SetStateAction<number>>
  swordGlb: number
  setSwordGlb: Dispatch<SetStateAction<number>>
  onClearStoredWeaponDev?: () => void
}

export default function WeaponFpsDevPanel({
  equippedWeapon,
  pick,
  setPick,
  sword,
  setSword,
  pickGlb,
  setPickGlb,
  swordGlb,
  setSwordGlb,
  onClearStoredWeaponDev,
}: Props) {
  const [precision, setPrecision] = useState<PrecisionId>('normal')
  const pr = PRECISION[precision]
  const tab = equippedWeapon === 'sword' ? 'sword' : 'pick'
  const w = tab === 'pick' ? pick : sword
  const setW = tab === 'pick' ? setPick : setSword

  const patchVec = useCallback(
    (key: Vec3Key, axis: 0 | 1 | 2, value: number) => {
      setW((prev) => {
        const next = { ...prev, [key]: [...prev[key]] as [number, number, number] }
        next[key][axis] = value
        return next
      })
    },
    [setW],
  )

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
      className="pointer-events-auto fixed right-2 top-20 z-[200] w-[min(96vw,24rem)] max-h-[min(85vh,680px)] overflow-y-auto rounded-xl border border-amber-600/60 bg-slate-950/95 p-3 text-[11px] text-slate-200 shadow-2xl backdrop-blur-md"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-1 text-xs font-semibold text-amber-200/95">FPS våben (dev)</div>
      <p className="mb-2 text-[10px] leading-snug text-slate-500">
        Kun i development. URL: <code className="text-amber-300/90">?weaponDev=1</code>. Våbenet{' '}
        <strong className="text-slate-300">forbliver synligt</strong> mens du justerer. Panelet følger det våben du{' '}
        <strong className="text-slate-300">holder</strong> (skift med Tab i spillet). <strong className="text-slate-300">Præcision</strong>{' '}
        ændrer slider-trin; brug tal-felter eller ± for fin justering. Justeringer gemmes lokalt i denne browser (
        <code className="text-slate-400">localStorage</code>).
      </p>

      <div
        className={
          'mb-2 flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ' +
          (tab === 'pick' ? 'border-amber-800/80 bg-amber-950/40' : 'border-violet-800/60 bg-violet-950/35')
        }
      >
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-slate-200">Tuner nu: {tab === 'pick' ? 'Hakke' : 'Sværd'}</div>
          <div className="text-[9px] text-slate-500">Skift våben med Tab for at tune det andet.</div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
          Præcision
          <select
            value={precision}
            onChange={(e) => setPrecision(e.target.value as PrecisionId)}
            className="rounded-md border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-200"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <option value="normal">Normal</option>
            <option value="fine">Fin</option>
            <option value="ultra">Ultra</option>
          </select>
        </label>
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
          step={pr.pos}
        />
        <Vec3SliderRow
          label="baseRot (ydre gruppe)"
          vecKey="baseRot"
          weapon={w}
          onChange={patchVec}
          eulerAsDegrees
          min={-180}
          max={180}
          step={pr.deg}
        />
        <Vec3SliderRow
          label="meshOrient (undergruppe)"
          vecKey="meshOrient"
          weapon={w}
          onChange={patchVec}
          eulerAsDegrees
          min={-180}
          max={180}
          step={pr.deg}
        />

        <ScalarControlRow
          label="Spin på stedet (° om synslinjen)"
          value={(w.inPlaceSpinRad ?? 0) * RAD2DEG}
          min={-180}
          max={180}
          step={pr.spin}
          onChange={(v) => setW((p) => ({ ...p, inPlaceSpinRad: v * DEG2RAD }))}
          decimals={0}
          accentClass="accent-cyan-600"
        />
        <p className="-mt-1 text-[9px] leading-snug text-slate-500">
          Drejer våbnet som et «klistermærke» i billedplanet: akse er linjen fra kameraet til våbenets placering — ikke en lokal
          model-akse.
        </p>

        <div className="space-y-2 rounded-lg border border-slate-700/80 bg-slate-900/40 p-2.5">
          <div className="text-[10px] font-semibold text-slate-200">Størrelse</div>
          <p className="text-[9px] leading-snug text-slate-500">
            Med <strong className="text-slate-400">GLB</strong>-våben bliver størrelsen:{' '}
            <span className="font-mono text-slate-300">GLB-basis × samlet skala</span>.
          </p>
          <div className="rounded border border-amber-900/40 bg-slate-950/90 px-2 py-1.5 text-center font-mono text-[11px] text-amber-100/95">
            GLB samlet: {(glbVal * w.scaleMul).toFixed(3)}
            <span className="mt-0.5 block font-sans text-[9px] font-normal text-slate-500">
              ({glbVal.toFixed(2)} × {w.scaleMul.toFixed(2)})
            </span>
          </div>
          <ScalarControlRow
            label="Samlet skala (scaleMul)"
            value={w.scaleMul}
            min={0.1}
            max={6}
            step={pr.scale}
            onChange={(v) => setW((p) => ({ ...p, scaleMul: v }))}
            decimals={2}
            accentClass="accent-amber-500"
          />
          <ScalarControlRow
            label={`GLB-basis — ${tab === 'pick' ? 'hakke' : 'sværd'} (.glb)`}
            value={glbVal}
            min={0.05}
            max={3}
            step={pr.scale}
            onChange={(v) => setGlb(v)}
            decimals={2}
            accentClass={tab === 'pick' ? 'accent-amber-600' : 'accent-violet-500'}
          />
        </div>

        <div className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/30 p-2.5">
          <div className="text-[10px] font-semibold text-slate-200">Greb (kun voxel-grid)</div>
          <p className="text-[9px] leading-snug text-slate-500">
            <strong className="text-slate-400">gripColumn</strong> er pivot-kolonne i 2D-pixelgitteret (GLB ignorerer).
          </p>
          <ScalarControlRow
            label="gripColumn (kolonne-index)"
            value={w.gripColumn}
            min={-1}
            max={8}
            step={pr.grip}
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
                setPick(defaultHeldPickaxeTransform())
                setPickGlb(0.45)
              } else {
                setSword({ ...DEFAULT_SWORD_TRANSFORM })
                setSwordGlb(0.57)
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
          {onClearStoredWeaponDev != null ? (
            <button
              type="button"
              title="Nulstil begge våben + GLB og slet gemt localStorage"
              onClick={onClearStoredWeaponDev}
              className="rounded-lg border border-rose-700/50 bg-rose-950/70 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-900/70"
            >
              Slet gemt
            </button>
          ) : null}
        </div>
      </div>

      <details className="mt-2 border-t border-slate-700/80 pt-2">
        <summary className="cursor-pointer select-none text-[10px] text-slate-400">Rå eksport</summary>
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

export { defaultHeldPickaxeTransform as pickaxeHeldDefault }
