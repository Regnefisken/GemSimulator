export const PURITY_PREFIXES: Record<number, string> = {
  1: '',
  2: '',
  3: 'Klar ',
  4: 'Uplettet ',
}

export const GOD_TIER_PREFIX = 'Guddommelig '

export function KARAT_TEMPLATE(k: number): string {
  return `${k}K-`
}
