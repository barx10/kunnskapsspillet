import type { Sporsmal } from './types'

/** Feil svaralternativer som faktisk er fylt inn, uten dubletter og uten selve svaret. */
export const feilAlternativer = (s: Sporsmal) => [...new Set((s.alternativer ?? []).map((a) => a.trim()).filter((a) => a && a !== s.svar.trim()))]
