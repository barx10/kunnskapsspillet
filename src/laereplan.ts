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

/** Trinnene et kompetansemålsett dekker: fra trinnet etter forrige sett til og med dette. */
export function trinnForSett(fag: string, sett: string): string[] {
  const liste = fagListe.find((f) => f.navn === fag)?.trinn ?? []
  const vg = sett.match(/^Vg(\d)/)
  if (vg) return [`Vg${vg[1]}`]
  const n = Number(sett.match(/^(\d+)\. trinn/)?.[1])
  if (!n) return []
  const tidligere = liste.map((t) => Number(t.trinn.match(/^(\d+)\. trinn/)?.[1])).filter((t) => t && t < n)
  const fra = tidligere.length ? Math.max(...tidligere) + 1 : 1
  return Array.from({ length: n - fra + 1 }, (_, i) => `${fra + i}. trinn`)
}

export function finnTrinn(fag: string, trinn: string) {
  return fagListe.find((f) => f.navn === fag)?.trinn.find((t) => t.trinn === trinn)
}
