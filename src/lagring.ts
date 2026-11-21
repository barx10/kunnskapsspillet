import type { Brett, Innstillinger, Spilltilstand } from './types'
import { eksempelbrett } from './data/eksempel'

const NOKLER = { brett: 'ks.brett', innstillinger: 'ks.innstillinger', spill: 'ks.spill' }

function les<T>(nokkel: string, standard: T): T {
  try {
    const raw = localStorage.getItem(nokkel)
    return raw ? (JSON.parse(raw) as T) : standard
  } catch {
    return standard
  }
}
const skriv = (nokkel: string, verdi: unknown) => localStorage.setItem(nokkel, JSON.stringify(verdi))

export const MODUSER: Record<Exclude<Innstillinger['modus'], 'egen'>, Pick<Innstillinger, 'forstSvar' | 'tur' | 'feilSvar' | 'tidtaker' | 'sekunder' | 'stjele' | 'stjeleSekunder' | 'stjelePoeng' | 'antallDobbel'>> = {
  klassisk: { forstSvar: 'tur', tur: 'riktig', feilSvar: 'minus', tidtaker: true, sekunder: 30, stjele: 'feilOgTid', stjeleSekunder: 10, stjelePoeng: 'full', antallDobbel: 1 },
  lynrunde: { forstSvar: 'alle', tur: 'rekke', feilSvar: 'minus', tidtaker: true, sekunder: 20, stjele: 'feil', stjeleSekunder: 10, stjelePoeng: 'full', antallDobbel: 0 },
  rolig: { forstSvar: 'tur', tur: 'rekke', feilSvar: 'null', tidtaker: false, sekunder: 30, stjele: 'feil', stjeleSekunder: 0, stjelePoeng: 'full', antallDobbel: 1 },
}

export const standardInnstillinger: Innstillinger = {
  modus: 'klassisk',
  ...MODUSER.klassisk,
  melding: 'hand',
  spilletid: 0,
  finale: true,
  lyd: true,
  tema: 'tavle',
  poengskala: 100,
  storTekst: false,
}

export function hentBrett(): Brett[] {
  const lagrede = les<Brett[] | null>(NOKLER.brett, null)
  if (lagrede) return lagrede
  const start = [eksempelbrett]
  skriv(NOKLER.brett, start)
  return start
}
export const lagreBrett = (brett: Brett[]) => skriv(NOKLER.brett, brett)

/** Fyller inn manglende felt og gjør om innstillinger fra eldre versjoner. */
export function normaliserInnstillinger(raw: unknown): Innstillinger {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const i = { ...standardInnstillinger, ...r } as Innstillinger & { dobbel?: unknown }
  if (typeof r.stjele === 'boolean') i.stjele = r.stjele ? 'feil' : 'av'
  if (typeof r.dobbel === 'boolean' && r.antallDobbel === undefined) i.antallDobbel = r.dobbel ? 1 : 0
  if (r.modus === undefined && (typeof r.stjele === 'boolean' || typeof r.dobbel === 'boolean')) i.modus = 'egen'
  if (!['tur', 'alle'].includes(i.forstSvar)) i.forstSvar = 'tur'
  if (!['riktig', 'rekke', 'fri'].includes(i.tur)) i.tur = 'riktig'
  if (i.tur === 'fri') i.forstSvar = 'alle'
  if (!['feilOgTid', 'feil', 'av'].includes(i.stjele)) i.stjele = 'feil'
  if (!['hand', 'buzzer'].includes(i.melding)) i.melding = 'hand'
  i.antallDobbel = Math.min(3, Math.max(0, Number(i.antallDobbel) || 0))
  delete i.dobbel
  return i
}

export const hentInnstillinger = (): Innstillinger => normaliserInnstillinger(les<unknown>(NOKLER.innstillinger, {}))
export const lagreInnstillinger = (i: Innstillinger) => skriv(NOKLER.innstillinger, i)

export function hentSpill(): Spilltilstand | null {
  const s = les<Spilltilstand | null>(NOKLER.spill, null)
  if (!s?.brett || !Array.isArray(s.lag)) return null
  return { ...s, innstillinger: normaliserInnstillinger(s.innstillinger), tur: s.tur ?? 0, startet: s.startet ?? Date.now() }
}
export const lagreSpill = (s: Spilltilstand | null) => (s ? skriv(NOKLER.spill, s) : localStorage.removeItem(NOKLER.spill))

export const nyId = () => crypto.randomUUID()

export function tomtBrett(fag = '', trinn = '', tema = '', maal: Brett['maal'] = [], kolonner = 5, rader = 5): Brett {
  return {
    id: nyId(),
    tittel: tema || 'Nytt brett',
    fag,
    trinn,
    tema,
    maal,
    kategorier: Array.from({ length: kolonner }, () => ({
      navn: '',
      sporsmal: Array.from({ length: rader }, () => ({ sporsmal: '', svar: '' })),
    })),
    finale: { kategori: '', sporsmal: '', svar: '' },
    endret: new Date().toISOString(),
  }
}

// --- Eksport/import. Importerte filer valideres strengt og behandles bare som tekst. ---

const MAKS = { tekst: 600, kategorier: 6, rader: 5, maal: 40 }
const str = (v: unknown, maks = MAKS.tekst) => (typeof v === 'string' ? v.slice(0, maks) : '')

export function eksporter(brett: Brett) {
  const blob = new Blob([JSON.stringify({ format: 'kunnskapsspillet', versjon: 1, brett }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(brett.tittel || 'brett').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.kunnskapsspillet.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function importer(tekst: string): Brett {
  let data: unknown
  try {
    data = JSON.parse(tekst)
  } catch {
    throw new Error('Filen er ikke gyldig JSON.')
  }
  const d = data as { format?: unknown; brett?: Record<string, unknown> }
  if (d?.format !== 'kunnskapsspillet' || typeof d.brett !== 'object' || !d.brett) {
    throw new Error('Filen er ikke et brett fra Kunnskapsspillet.')
  }
  const b = d.brett
  const kategorier = Array.isArray(b.kategorier) ? b.kategorier.slice(0, MAKS.kategorier) : []
  if (kategorier.length < 1) throw new Error('Brettet har ingen kategorier.')
  const rader = Math.min(MAKS.rader, Math.max(...kategorier.map((k: { sporsmal?: unknown[] }) => (Array.isArray(k?.sporsmal) ? k.sporsmal.length : 0))))
  if (rader < 1) throw new Error('Brettet har ingen spørsmål.')
  const finale = (b.finale ?? {}) as Record<string, unknown>
  return {
    id: nyId(),
    tittel: str(b.tittel, 120) || 'Importert brett',
    fag: str(b.fag, 80),
    trinn: str(b.trinn, 80),
    tema: str(b.tema, 120),
    maal: (Array.isArray(b.maal) ? b.maal.slice(0, MAKS.maal) : []).map((m: Record<string, unknown>) => ({ kode: str(m?.kode, 20), tekst: str(m?.tekst) })),
    kategorier: kategorier.map((k: Record<string, unknown>) => ({
      navn: str(k?.navn, 60),
      sporsmal: Array.from({ length: rader }, (_, i) => {
        const s = (Array.isArray(k?.sporsmal) ? k.sporsmal[i] : null) as Record<string, unknown> | null
        return { sporsmal: str(s?.sporsmal), svar: str(s?.svar) }
      }),
    })),
    finale: { kategori: str(finale.kategori, 60), sporsmal: str(finale.sporsmal), svar: str(finale.svar) },
    endret: new Date().toISOString(),
  }
}
