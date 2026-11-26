import type { Sporsmal } from './types'

const lik = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Feil svaralternativer som faktisk er fylt inn, uten dubletter og uten selve svaret.
 * Det riktige svaret legges alltid til av spillet, så læreren skriver bare de feile.
 * Uten svar gir det ingen alternativer, fordi det riktige da ville manglet.
 */
export function feilAlternativer(s: Sporsmal): string[] {
  if (!s.svar.trim()) return []
  const ut: string[] = []
  for (const a of s.alternativer ?? []) {
    const t = a.trim()
    if (t && !lik(t, s.svar) && !ut.some((x) => lik(x, t))) ut.push(t)
  }
  return ut
}
