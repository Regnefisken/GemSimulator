/** Kun aktiv i Vite dev-build OG når VITE_ENABLE_DEV_CHEATS=true (ingen production-eksponering). */
export const ENABLE_DEV_CHEATS =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_CHEATS === 'true'
