/** Kun aktiv i Vite dev-build OG når VITE_ENABLE_DEV_CHEATS=true (ingen production-eksponering). */
const viteEnv =
  typeof import.meta !== 'undefined' && 'env' in import.meta
    ? (import.meta as ImportMeta & { env: Record<string, string | boolean | undefined> }).env
    : undefined

export const ENABLE_DEV_CHEATS = Boolean(
  viteEnv?.DEV && viteEnv?.VITE_ENABLE_DEV_CHEATS === 'true',
)
