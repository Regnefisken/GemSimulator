/**
 * D45: kun lokal telemetri — append-only ring buffer i hukommelse.
 * Ingen netværks-upload; ingen netværkskald i denne sti.
 */

export type TelemetryEvent = {
  event: string
  timestamp: number
  payload: Record<string, unknown>
}

const CAP = 200
const buffer: TelemetryEvent[] = []

function trimBuffer(): void {
  if (buffer.length > CAP) {
    buffer.splice(0, buffer.length - CAP)
  }
}

export function logTelemetry(event: string, payload: Record<string, unknown> = {}): void {
  buffer.push({ event, timestamp: Date.now(), payload })
  trimBuffer()
  attachDevConsoleHook()
}

export function getRecentTelemetry(max = 50): TelemetryEvent[] {
  const n = Math.max(0, Math.min(max, buffer.length))
  return buffer.slice(-n)
}

/** Kun til tests — nulstil buffer. */
export function __resetTelemetryForTests(): void {
  buffer.length = 0
}

type TelemetryHook = {
  /** Seneste N events (default 30). */
  recent: (n?: number) => TelemetryEvent[]
}

function attachDevConsoleHook(): void {
  if (typeof window === 'undefined') return
  const w = window as Window & { __telemetry?: TelemetryHook }
  if (w.__telemetry) return
  w.__telemetry = {
    recent: (n = 30) => getRecentTelemetry(n),
  }
}
