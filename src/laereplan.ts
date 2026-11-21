import data from './data/kompetansemaal.json'
import type { Kompetansemaal } from './types'

export type Trinnsett = { trinn: string; maal: Kompetansemaal[] }
export type Fag = { navn: string; laereplan: string; trinn: Trinnsett[] }

const rydd = (t: string) =>
  t.trim().replace(/(\d+)\.\s*trinn/i, '$1. trinn').replace(/^vg/i, 'Vg').replace(/\s+/g, ' ')

export const fagListe: Fag[] = data.fag.map((f) => ({
  navn: f.navn,
  laereplan: f.laereplan,
  trinn: f.sett.map((s) => ({ trinn: rydd(s.tittel), maal: s.maal })),
}))

export const kilde = { hentet: data.hentet, tekst: data.kilde }

export function finnTrinn(fag: string, trinn: string) {
  return fagListe.find((f) => f.navn === fag)?.trinn.find((t) => t.trinn === trinn)
}
