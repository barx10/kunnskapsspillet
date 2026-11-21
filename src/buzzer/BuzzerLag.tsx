// Siden lagene åpner på sin egen enhet: velg lag og trykk på buzzeren.
import { useCallback, useEffect, useRef, useState } from 'react'
import { BUZZER_URL } from './config'

type LagInfo = { navn: string; farge: string }
type Tilstand = { lag: LagInfo[]; opptatt: number[]; mitt: number | null; apen: boolean; runde: string; rekkefolge: number[] }

const KLIENT = 'ks.klient'
const klientId = () => {
  let id = localStorage.getItem(KLIENT)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KLIENT, id)
  }
  return id
}

const renKode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)

export function BuzzerLag() {
  const [kode, setKode] = useState(() => renKode(new URLSearchParams(location.search).get('rom') ?? ''))
  const [inntastet, setInntastet] = useState(kode)
  const [t, setT] = useState<Tilstand | null>(null)
  const [status, setStatus] = useState<'kobler' | 'tilkoblet' | 'borte'>('kobler')
  const [feil, setFeil] = useState('')
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    document.title = kode ? `Buzzer – ${kode}` : 'Buzzer'
    if (!kode) return
    let aktiv = true
    let forsok = 0
    let ping: ReturnType<typeof setInterval> | undefined
    let igjen: ReturnType<typeof setTimeout> | undefined
    const kobleTil = () => {
      setStatus('kobler')
      const s = new WebSocket(`${BUZZER_URL}/rom/${kode}?rolle=lag&klient=${klientId()}`)
      ws.current = s
      s.onopen = () => {
        forsok = 0
        setStatus('tilkoblet')
        setFeil('')
        ping = setInterval(() => s.readyState === WebSocket.OPEN && s.send('ping'), 25_000)
      }
      s.onmessage = (e) => {
        if (e.data === 'pong') return
        const m = JSON.parse(e.data)
        if (m.t === 'tilstand') setT(m)
        if (m.t === 'feil') setFeil(m.tekst)
      }
      s.onclose = (e) => {
        clearInterval(ping)
        if (!aktiv) return
        if (e.code === 4004) {
          setFeil(e.reason || 'Fant ikke rommet. Sjekk koden.')
          setKode('')
          return
        }
        setStatus('borte')
        forsok++
        igjen = setTimeout(kobleTil, Math.min(8_000, 400 * 2 ** forsok))
      }
    }
    kobleTil()
    return () => {
      aktiv = false
      clearInterval(ping)
      clearTimeout(igjen)
      ws.current?.close()
    }
  }, [kode])

  const send = useCallback((m: unknown) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(m)), [])

  // Hold skjermen våken mens laget venter.
  const mitt = t?.mitt ?? null
  useEffect(() => {
    if (mitt === null || !('wakeLock' in navigator)) return
    let lås: WakeLockSentinel | null = null
    const be = () => navigator.wakeLock.request('screen').then((l) => (lås = l), () => {})
    be()
    const synlig = () => document.visibilityState === 'visible' && be()
    document.addEventListener('visibilitychange', synlig)
    return () => {
      document.removeEventListener('visibilitychange', synlig)
      lås?.release()
    }
  }, [mitt])

  if (!kode)
    return (
      <main className="buzz-side">
        <h1>Buzzer</h1>
        <form
          className="buzz-kode"
          onSubmit={(e) => {
            e.preventDefault()
            if (renKode(inntastet).length >= 4) {
              setFeil('')
              setKode(renKode(inntastet))
              history.replaceState(null, '', `?rom=${renKode(inntastet)}`)
            }
          }}
        >
          <label htmlFor="romkode">Romkode fra lærerskjermen</label>
          <input id="romkode" value={inntastet} onChange={(e) => setInntastet(renKode(e.target.value))} autoComplete="off" autoCapitalize="characters" spellCheck={false} autoFocus />
          {feil && <p className="feilmelding">{feil}</p>}
          <button className="knapp knapp-hoved knapp-stor" disabled={renKode(inntastet).length < 4}>
            Bli med
          </button>
        </form>
      </main>
    )

  if (!t)
    return (
      <main className="buzz-side">
        <p className="dempet">{status === 'borte' ? 'Mistet kontakten. Prøver igjen …' : 'Kobler til …'}</p>
      </main>
    )

  if (mitt === null || !t.lag[mitt])
    return (
      <main className="buzz-side">
        <h1>Hvilket lag er dere?</h1>
        <div className="buzz-lagvalg">
          {t.lag.map((l, n) => {
            const opptatt = t.opptatt.includes(n)
            return (
              <button key={n} className="lag-knapp" style={{ '--lagfarge': l.farge } as React.CSSProperties} disabled={opptatt} onClick={() => send({ t: 'velg', lag: n })}>
                {l.navn}
                {opptatt && <span className="dempet liten"> (valgt)</span>}
              </button>
            )
          })}
        </div>
        {t.lag.length === 0 && <p className="dempet">Venter på at læreren setter opp lagene …</p>}
        {feil && <p className="feilmelding">{feil}</p>}
      </main>
    )

  return <Buzzknapp lag={t.lag[mitt]} mitt={mitt} t={t} tilkoblet={status === 'tilkoblet'} onBuzz={() => send({ t: 'buzz', runde: t.runde })} onBytt={() => send({ t: 'velg', lag: null })} />
}

function Buzzknapp({ lag, mitt, t, tilkoblet, onBuzz, onBytt }: { lag: LagInfo; mitt: number; t: Tilstand; tilkoblet: boolean; onBuzz: () => void; onBytt: () => void }) {
  const plass = t.rekkefolge.indexOf(mitt)
  const forst = t.rekkefolge[0]
  const kanBuzze = t.apen && plass === -1 && tilkoblet

  const buzz = useCallback(() => {
    if (!kanBuzze) return
    navigator.vibrate?.(60)
    onBuzz()
  }, [kanBuzze, onBuzz])

  useEffect(() => {
    const tast = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        buzz()
      }
    }
    window.addEventListener('keydown', tast)
    return () => window.removeEventListener('keydown', tast)
  }, [buzz])

  let tekst: string
  if (plass === 0) tekst = 'Dere var først!'
  else if (plass > 0) tekst = `Dere var nummer ${plass + 1}`
  else if (forst !== undefined) tekst = `${t.lag[forst]?.navn ?? 'Et annet lag'} var først`
  else if (t.apen) tekst = 'Trykk!'
  else tekst = 'Vent på neste spørsmål'

  return (
    <main className="buzz-side" style={{ '--lagfarge': lag.farge } as React.CSSProperties}>
      <p className="buzz-lagnavn">{lag.navn}</p>
      <button className={`buzz-knapp${kanBuzze ? ' klar' : ''}${plass === 0 ? ' forst' : ''}`} onPointerDown={buzz} disabled={!kanBuzze} aria-label="Buzz">
        BUZZ
      </button>
      <p className="buzz-status" aria-live="assertive">
        {tilkoblet ? tekst : 'Mistet kontakten. Prøver igjen …'}
      </p>
      <button className="lenkeknapp" onClick={onBytt}>
        Bytt lag
      </button>
    </main>
  )
}
