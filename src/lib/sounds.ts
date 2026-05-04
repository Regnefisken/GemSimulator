const MUTE_KEY = 'gem-game-sound-muted'

export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1')
    else localStorage.removeItem(MUTE_KEY)
  } catch {
    // ignore
  }
}

let audioCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return null
    }
  }
  return audioCtx
}

function tone(freq: number, durationSec: number, gain = 0.06, type: OscillatorType = 'sine'): void {
  if (isSoundMuted()) return
  const c = ctx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const t0 = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + durationSec)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + durationSec)
}

export function playMineHit(): void {
  tone(180 + Math.random() * 40, 0.05, 0.05, 'triangle')
}

export function playRockBreak(): void {
  tone(90, 0.12, 0.07, 'square')
}

export function playGemFound(): void {
  tone(880, 0.08, 0.045)
  window.setTimeout(() => tone(1320, 0.12, 0.035), 60)
}

export function playEssenceFound(): void {
  tone(660, 0.06, 0.04)
  window.setTimeout(() => tone(990, 0.1, 0.03), 70)
}

export function playGoldSpend(): void {
  tone(520, 0.07, 0.055)
  window.setTimeout(() => tone(780, 0.09, 0.03), 50)
}

export function playLevelUp(): void {
  tone(392, 0.1, 0.05)
  window.setTimeout(() => tone(523, 0.1, 0.045), 90)
  window.setTimeout(() => tone(659, 0.14, 0.04), 180)
}
