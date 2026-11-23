import type { Poengskala, Spilltilstand } from './types'

export const poengFor = (rad: number, skala: Poengskala) => (rad + 1) * skala

/** Poengsummen til hvert lag: startpoeng pluss alle hendelser. Summen lagres aldri, den regnes alltid ut. */
export const poengsum = (s: Pick<Spilltilstand, 'lag' | 'hendelser' | 'innstillinger'>) =>
  s.lag.map((_, n) => s.hendelser.reduce((sum, h) => (h.lag === n ? sum + h.poeng : sum), s.innstillinger.startpoeng))
