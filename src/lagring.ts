import type { Brett, Hendelse, Innstillinger, Lag, Spilltilstand } from './types'
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

export const standardInnstillinger: Innstillinger = {
  feilSvar: 'minus',
  tidtaker: true,
  sekunder: 30,
  antallDobbel: 1,
  startpoeng: 0,
  alternativer: false,
  hintPris: 0,
  spilletid: 0,
  finale: true,
  lyd: true,
  tema: 'tavle',
  poengskala: 100,
  storTekst: false,
}

export function hentBrett(): Brett[] {
  const lagrede = les<Brett[] | null>(NOKLER.brett, null)
  if (lagrede) return lagrede.map(medEksempelAlternativer)
  const start = [eksempelbrett]
  skriv(NOKLER.brett, start)
  return start
}
/** Eksempelbrett lagret før svaralternativer fantes, får alternativene fra den nye versjonen. */
function medEksempelAlternativer(b: Brett): Brett {
  if (b.id !== eksempelbrett.id) return b
  const fasit = new Map(eksempelbrett.kategorier.flatMap((k) => k.sporsmal.map((s) => [s.sporsmal, s.alternativer] as const)))
  return { ...b, kategorier: b.kategorier.map((k) => ({ ...k, sporsmal: k.sporsmal.map((s) => (s.alternativer?.length ? s : { ...s, alternativer: fasit.get(s.sporsmal) ?? s.alternativer })) })) }
}
export const lagreBrett = (brett: Brett[]) => skriv(NOKLER.brett, brett)

/** Felt fra eldre versjoner som ikke brukes lenger. */
const UTGATTE = ['dobbel', 'melding', 'modus', 'forstSvar', 'tur', 'stjele', 'stjeleSekunder', 'stjelePoeng']

/** Fyller inn manglende felt og gjør om innstillinger fra eldre versjoner. */
export function normaliserInnstillinger(raw: unknown): Innstillinger {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const i = { ...standardInnstillinger, ...r } as Innstillinger
  if (typeof r.dobbel === 'boolean' && r.antallDobbel === undefined) i.antallDobbel = r.dobbel ? 1 : 0
  if (!['minus', 'null'].includes(i.feilSvar)) i.feilSvar = 'minus'
  i.startpoeng = Math.min(10_000, Math.max(0, Math.round(Number(i.startpoeng) || 0)))
  i.antallDobbel = Math.min(3, Math.max(0, Number(i.antallDobbel) || 0))
  i.alternativer = i.alternativer === true
  if (![0, 0.5, 1, 2].includes(i.hintPris)) i.hintPris = 0
  for (const k of UTGATTE) delete (i as Record<string, unknown>)[k]
  return i
}

export const hentInnstillinger = (): Innstillinger => normaliserInnstillinger(les<unknown>(NOKLER.innstillinger, {}))
export const lagreInnstillinger = (i: Innstillinger) => skriv(NOKLER.innstillinger, i)

export function hentSpill(): Spilltilstand | null {
  const s = les<(Omit<Spilltilstand, 'lag'> & { lag: (Lag & { poeng?: number })[] }) | null>(NOKLER.spill, null)
  if (!s?.brett || !Array.isArray(s.lag)) return null
  // Spill fra eldre versjoner lagret poengsummen direkte. Den blir én hendelse per lag.
  const hendelser: Hendelse[] = Array.isArray(s.hendelser)
    ? s.hendelser
    : s.lag.map((l, n) => ({ lag: n, poeng: l.poeng ?? 0, tekst: 'Poeng fra før' })).filter((h) => h.poeng !== 0)
  // Ruter med poeng regnes som brukt, også om siden ble lastet på nytt mens spørsmålet var åpent.
  const brukt = [...new Set([...(s.brukt ?? []), ...hendelser.flatMap((h) => (h.rute ? [h.rute] : []))])]
  const innstillinger = normaliserInnstillinger(s.innstillinger)
  if (!Array.isArray(s.hendelser)) innstillinger.startpoeng = 0
  return {
    ...s,
    lag: s.lag.map(({ navn, farge }) => ({ navn, farge })),
    hendelser,
    brukt,
    innstillinger,
    tur: s.tur ?? 0,
    startet: s.startet ?? Date.now(),
  }
}
export const lagreSpill = (s: Spilltilstand | null) => (s ? skriv(NOKLER.spill, s) : localStorage.removeItem(NOKLER.spill))

export const nyId = () => crypto.randomUUID()

export function tomtBrett(fag = '', trinn = '', tema = '', maal: Brett['maal'] = [], kolonner = 5, rader = 5, alder = ''): Brett {
  return {
    id: nyId(),
    tittel: tema || 'Nytt brett',
    fag,
    trinn,
    alder,
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
    alder: str(b.alder, 80),
    tema: str(b.tema, 120),
    maal: (Array.isArray(b.maal) ? b.maal.slice(0, MAKS.maal) : []).map((m: Record<string, unknown>) => ({ kode: str(m?.kode, 20), tekst: str(m?.tekst) })),
    kategorier: kategorier.map((k: Record<string, unknown>) => ({
      navn: str(k?.navn, 60),
      sporsmal: Array.from({ length: rader }, (_, i) => {
        const s = (Array.isArray(k?.sporsmal) ? k.sporsmal[i] : null) as Record<string, unknown> | null
        const alternativer = (Array.isArray(s?.alternativer) ? s.alternativer : []).slice(0, 3).map((a: unknown) => str(a, 200)).filter(Boolean)
        return { sporsmal: str(s?.sporsmal), svar: str(s?.svar), ...(alternativer.length ? { alternativer } : {}) }
      }),
    })),
    finale: { kategori: str(finale.kategori, 60), sporsmal: str(finale.sporsmal), svar: str(finale.svar) },
    endret: new Date().toISOString(),
  }
}
