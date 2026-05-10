import { ENABLE_DEV_CHEATS } from './featureFlags'

const STORAGE_KEY = 'gemSimulator.devMineGearProtect'

/** Sand når dev-cheats er på OG checkbox er aktiveret — ingen skade på dig eller værktøj/rustning i minen. */
export function isDevMineGearProtectEnabled(): boolean {
  if (!ENABLE_DEV_CHEATS) return false
  try {
    if (typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setDevMineGearProtect(enabled: boolean): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    if (enabled) sessionStorage.setItem(STORAGE_KEY, '1')
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
