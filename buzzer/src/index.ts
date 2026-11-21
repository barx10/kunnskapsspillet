// Buzzer-server for Kunnskapsspillet.
// Ett Durable Object per spillrom. Lærerskjermen («vert») og lagenhetene («lag») kobler seg til
// med WebSocket. Serveren avgjør hvem som buzzet først, så klokka på enhetene spiller ingen rolle.

import { DurableObject } from 'cloudflare:workers'

type Env = { ROM: DurableObjectNamespace<Rom>; TILLATTE_OPPRINNELSER: string; BEGRENS: RateLimit }

type LagInfo = { navn: string; farge: string }

type Tilstand = {
  token: string | null
  lag: LagInfo[]
  /** Hvilket lag hver enhet har valgt, nøkkel er enhetens klient-id. */
  valgt: Record<string, number>
  apen: boolean
  runde: string
  tillatt: number[]
  /** Lagene i den rekkefølgen de buzzet i denne runden. */
  rekkefolge: number[]
}

type Vedlegg = { rolle: 'vert' | 'lag'; klient: string }

const KODE = /^[A-Z2-9]{4,8}$/
const LEVETID_MS = 8 * 60 * 60 * 1000
const MAKS_TILKOBLINGER = 40
const FARGE = /^#[0-9a-fA-F]{3,8}$/

const tom = (): Tilstand => ({ token: null, lag: [], valgt: {}, apen: false, runde: '', tillatt: [], rekkefolge: [] })

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const m = url.pathname.match(/^\/rom\/([A-Za-z0-9]+)$/)
    if (!m) return new Response(null, { status: 404 })

    const opprinnelse = req.headers.get('Origin') ?? ''
    const tillatte = env.TILLATTE_OPPRINNELSER.split(',').map((s) => s.trim())
    if (!tillatte.includes(opprinnelse) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(opprinnelse)) {
      return new Response('Ikke tillatt', { status: 403 })
    }
    if (req.headers.get('Upgrade') !== 'websocket') return new Response(null, { status: 426 })

    // Bremser gjetting av romkoder: maks antall tilkoblingsforsøk per IP-adresse og minutt.
    const ip = req.headers.get('CF-Connecting-IP') ?? 'ukjent'
    const { success } = await env.BEGRENS.limit({ key: ip })
    if (!success) return new Response(null, { status: 429 })

    const kode = m[1].toUpperCase()
    if (!KODE.test(kode)) return new Response('Ugyldig romkode', { status: 400 })
    return env.ROM.get(env.ROM.idFromName(kode)).fetch(req)
  },
}

export class Rom extends DurableObject<Env> {
  private s: Tilstand = tom()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      this.s = { ...tom(), ...((await ctx.storage.get<Tilstand>('s')) ?? {}) }
    })
    // Svarer på ping uten å vekke objektet.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const rolle = url.searchParams.get('rolle')
    const klient = (url.searchParams.get('klient') ?? '').slice(0, 64)
    const token = url.searchParams.get('token') ?? ''

    const [klientSide, serverSide] = Object.values(new WebSocketPair())

    let feil: [number, string] | null = null
    if (this.ctx.getWebSockets().length >= MAKS_TILKOBLINGER) feil = [4029, 'Rommet er fullt']
    else if (rolle === 'vert') {
      if (!/^[0-9a-f]{32}$/.test(token)) feil = [4001, 'Mangler nøkkel']
      else if (this.s.token === null) {
        this.s.token = token
        await this.lagre()
      } else if (!likt(this.s.token, token)) feil = [4003, 'Rommet er i bruk']
    } else if (rolle === 'lag') {
      if (!klient) feil = [4001, 'Mangler klient-id']
      else if (this.s.token === null) feil = [4004, 'Fant ikke rommet. Sjekk koden.']
    } else feil = [4001, 'Ukjent rolle']

    if (feil) {
      serverSide.accept()
      serverSide.close(feil[0], feil[1])
      return new Response(null, { status: 101, webSocket: klientSide })
    }

    this.ctx.acceptWebSocket(serverSide, [rolle as string])
    serverSide.serializeAttachment({ rolle: rolle as Vedlegg["rolle"], klient } satisfies Vedlegg)
    await this.forny()
    this.kringkast()
    return new Response(null, { status: 101, webSocket: klientSide })
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    if (typeof data !== 'string' || data.length > 4000) return
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }
    const { rolle, klient } = ws.deserializeAttachment() as Vedlegg
    const s = this.s

    if (rolle === 'vert') {
      if (msg.t === 'lag' && Array.isArray(msg.lag)) {
        s.lag = msg.lag.slice(0, 8).map((l: Partial<LagInfo>) => ({ navn: String(l?.navn ?? '').slice(0, 24), farge: FARGE.test(String(l?.farge)) ? String(l?.farge) : '#888888' }))
        for (const [k, n] of Object.entries(s.valgt)) if (n >= s.lag.length) delete s.valgt[k]
        s.tillatt = s.tillatt.filter((n) => n < s.lag.length)
      } else if (msg.t === 'apne' && typeof msg.runde === 'string' && Array.isArray(msg.tillatt)) {
        const tillatt = msg.tillatt.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < s.lag.length)
        // Samme runde og samme lag: ikke nullstill (f.eks. når lærerskjermen kobler seg til igjen).
        if (!(s.apen && s.runde === msg.runde && same(s.tillatt, tillatt))) {
          s.apen = true
          s.runde = msg.runde.slice(0, 64)
          s.tillatt = tillatt
          s.rekkefolge = []
        }
      } else if (msg.t === 'steng') {
        s.apen = false
        s.tillatt = []
        s.rekkefolge = []
      } else return
    } else {
      if (msg.t === 'velg') {
        const n = msg.lag
        if (n === null) delete s.valgt[klient]
        else if (Number.isInteger(n) && (n as number) >= 0 && (n as number) < s.lag.length) {
          if (this.opptatt(klient).includes(n as number)) {
            ws.send(JSON.stringify({ t: 'feil', tekst: 'Det laget er allerede valgt på en annen enhet.' }))
            return
          }
          s.valgt[klient] = n as number
        } else return
      } else if (msg.t === 'buzz') {
        const n = s.valgt[klient]
        if (!s.apen || n === undefined || msg.runde !== s.runde || !s.tillatt.includes(n) || s.rekkefolge.includes(n)) return
        s.rekkefolge.push(n)
      } else return
    }

    await this.lagre()
    await this.forny()
    this.kringkast()
  }

  async webSocketClose(ws: WebSocket) {
    try {
      ws.close()
    } catch {
      // allerede lukket
    }
    this.kringkast()
  }

  async webSocketError() {
    this.kringkast()
  }

  async alarm() {
    if (this.ctx.getWebSockets().length > 0) return this.forny()
    await this.ctx.storage.deleteAll()
    this.s = tom()
  }

  private async lagre() {
    await this.ctx.storage.put('s', this.s)
  }

  private async forny() {
    await this.ctx.storage.setAlarm(Date.now() + LEVETID_MS)
  }

  /** Klienter med åpen tilkobling. */
  private tilkobledeLagKlienter() {
    const k = new Set<string>()
    for (const ws of this.ctx.getWebSockets('lag')) {
      if (ws.readyState !== WebSocket.OPEN) continue
      k.add((ws.deserializeAttachment() as Vedlegg).klient)
    }
    return k
  }

  /** Lag som er valgt av en annen tilkoblet enhet enn `unntatt`. */
  private opptatt(unntatt?: string) {
    const tilkoblet = this.tilkobledeLagKlienter()
    return [...new Set(Object.entries(this.s.valgt).filter(([k]) => k !== unntatt && tilkoblet.has(k)).map(([, n]) => n))]
  }

  private kringkast() {
    const s = this.s
    const tilkoblet = this.opptatt()
    const send = (ws: WebSocket, msg: unknown) => {
      try {
        ws.send(JSON.stringify(msg))
      } catch {
        // frakoblet
      }
    }
    for (const ws of this.ctx.getWebSockets('vert')) {
      send(ws, { t: 'tilstand', tilkoblet, apen: s.apen, runde: s.runde, rekkefolge: s.rekkefolge })
    }
    for (const ws of this.ctx.getWebSockets('lag')) {
      const { klient } = ws.deserializeAttachment() as Vedlegg
      const mitt = s.valgt[klient] ?? null
      send(ws, {
        t: 'tilstand',
        lag: s.lag,
        opptatt: this.opptatt(klient),
        mitt,
        apen: s.apen && mitt !== null && s.tillatt.includes(mitt),
        runde: s.runde,
        rekkefolge: s.rekkefolge,
      })
    }
  }
}

function same(a: number[], b: number[]) {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

/** Sammenligning som tar like lang tid uansett hvor strengene er ulike. */
function likt(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
