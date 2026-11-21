// Lærerskjermens tilkobling til buzzer-serveren. Én felles tilkobling for hele appen,
// så den lever videre fra oppsettskjermen og inn i spillet.
import { useSyncExternalStore } from 'react'
import { BUZZER_URL } from './config'

export type VertTilstand = {
  kode: string | null
  status: 'av' | 'kobler' | 'tilkoblet' | 'feil'
  feilTekst?: string
  /** Lag som har en tilkoblet enhet. */
  tilkoblet: number[]
  apen: boolean
  runde: string
  rekkefolge: number[]
}

const NOKKEL = 'ks.buzzerrom2'
const TEGN = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

let tilstand: VertTilstand = { kode: null, status: 'av', tilkoblet: [], apen: false, runde: '', rekkefolge: [] }
const lyttere = new Set<() => void>()
let ws: WebSocket | null = null
let ping: ReturnType<typeof setInterval> | undefined
let nyttForsok: ReturnType<typeof setTimeout> | undefined
let forsok = 0
let token = ''
// Det siste vi har sendt, så det kan sendes på nytt etter en ny tilkobling.
let sisteLag: string | null = null
let sisteRunde: string | null = null

function sett(endring: Partial<VertTilstand>) {
  tilstand = { ...tilstand, ...endring }
  lyttere.forEach((f) => f())
}

const tilfeldig = (n: number, tegn: string) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => tegn[x % tegn.length]).join('')

function hentRom(): { kode: string; token: string } {
  try {
    const r = JSON.parse(localStorage.getItem(NOKKEL) ?? '')
    if (typeof r?.kode === 'string' && typeof r?.token === 'string') return r
  } catch {
    // nytt rom
  }
  const rom = { kode: tilfeldig(6, TEGN), token: tilfeldig(32, '0123456789abcdef') }
  localStorage.setItem(NOKKEL, JSON.stringify(rom))
  return rom
}

function send(data: string) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(data)
}

function kobleTil() {
  clearTimeout(nyttForsok)
  const rom = hentRom()
  token = rom.token
  sett({ kode: rom.kode, status: 'kobler' })
  const sokket = new WebSocket(`${BUZZER_URL}/rom/${rom.kode}?rolle=vert&token=${token}`)
  ws = sokket
  sokket.onopen = () => {
    forsok = 0
    sett({ status: 'tilkoblet', feilTekst: undefined })
    if (sisteLag) send(sisteLag)
    if (sisteRunde) send(sisteRunde)
    clearInterval(ping)
    ping = setInterval(() => send('ping'), 25_000)
  }
  sokket.onmessage = (e) => {
    if (e.data === 'pong') return
    try {
      const m = JSON.parse(e.data)
      if (m.t === 'tilstand') sett({ tilkoblet: m.tilkoblet, apen: m.apen, runde: m.runde, rekkefolge: m.rekkefolge })
    } catch {
      // ignorer
    }
  }
  sokket.onclose = (e) => {
    if (ws !== sokket) return
    clearInterval(ping)
    ws = null
    if (tilstand.status === 'av') return
    if (e.code === 4003) {
      // Romkoden er tatt av noen andre. Lag et nytt rom.
      localStorage.removeItem(NOKKEL)
      kobleTil()
      return
    }
    sett({ status: 'feil', feilTekst: 'Mistet kontakten med buzzer-serveren. Prøver igjen …', tilkoblet: [] })
    forsok++
    nyttForsok = setTimeout(kobleTil, Math.min(10_000, 500 * 2 ** forsok))
  }
}

export const buzzer = {
  /** Kobler til (eller fortsetter med) rommet. Trygg å kalle flere ganger. */
  start() {
    if (tilstand.status !== 'av') return
    kobleTil()
  },
  stopp() {
    sett({ status: 'av', tilkoblet: [], apen: false, rekkefolge: [] })
    clearTimeout(nyttForsok)
    clearInterval(ping)
    ws?.close()
    ws = null
  },
  /** Nytt rom med ny kode. Lagene må koble til på nytt. */
  nyttRom() {
    this.stopp()
    localStorage.removeItem(NOKKEL)
    kobleTil()
  },
  settLag(lag: { navn: string; farge: string }[]) {
    const data = JSON.stringify({ t: 'lag', lag: lag.map(({ navn, farge }) => ({ navn, farge })) })
    if (data === sisteLag) return
    sisteLag = data
    send(data)
  },
  apne(runde: string, tillatt: number[]) {
    const data = JSON.stringify({ t: 'apne', runde, tillatt })
    if (data === sisteRunde) return
    sisteRunde = data
    send(data)
  },
  steng() {
    if (sisteRunde === null) return
    sisteRunde = null
    send(JSON.stringify({ t: 'steng' }))
  },
}

const abonner = (f: () => void) => {
  lyttere.add(f)
  return () => lyttere.delete(f)
}

export const useBuzzer = () => useSyncExternalStore(abonner, () => tilstand)

export const lagLenke = (kode: string) => `${location.origin}/?rom=${kode}`
