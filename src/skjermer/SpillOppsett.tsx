import { useState } from 'react'
import type { Brett, Innstillinger, Lag, Poengskala, Tema } from '../types'
import { Topplinje } from '../komponenter/Topplinje'
import { poengFor } from '../poeng'

type Props = {
  brett: Brett
  innstillinger: Innstillinger
  setInnstillinger: (i: Innstillinger) => void
  onTilbake: () => void
  onStart: (i: Innstillinger, lag: Lag[]) => void
}

export const LAGFARGER = ['#e4572e', '#2e86de', '#f2c14e', '#3bb273', '#9b5de5', '#ef6fa8']
const LAGNAVN = ['Rødt lag', 'Blått lag', 'Gult lag', 'Grønt lag', 'Lilla lag', 'Rosa lag']

const TEMAER: { id: Tema; navn: string; beskrivelse: string }[] = [
  { id: 'tavle', navn: 'Tavle', beskrivelse: 'Grønn skoletavle med gule tall' },
  { id: 'studio', navn: 'Studio', beskrivelse: 'Mørkt med sterke farger' },
  { id: 'lys', navn: 'Lys', beskrivelse: 'Høy kontrast for lyse rom' },
  { id: 'fargerik', navn: 'Fargerik', beskrivelse: 'Hver kategori har sin farge' },
]

const SKALAER: { id: Poengskala; navn: string }[] = [
  { id: 100, navn: '100–500' },
  { id: 200, navn: '200–1000' },
  { id: 1, navn: '1–5' },
]

const TIDER = [15, 30, 45, 60, 90]

export function SpillOppsett({ brett, innstillinger, setInnstillinger, onTilbake, onStart }: Props) {
  const [i, setI] = useState(innstillinger)
  const [lag, setLag] = useState<Lag[]>(() => LAGNAVN.slice(0, 3).map((navn, n) => ({ navn, farge: LAGFARGER[n], poeng: 0 })))
  const sett = <K extends keyof Innstillinger>(k: K, v: Innstillinger[K]) => setI({ ...i, [k]: v })
  const harFinale = !!brett.finale.sporsmal.trim()
  const rader = brett.kategorier[0]?.sporsmal.length ?? 5

  const antallLag = (n: number) =>
    setLag((l) => (n < l.length ? l.slice(0, n) : [...l, ...LAGNAVN.slice(l.length, n).map((navn, k) => ({ navn, farge: LAGFARGER[l.length + k], poeng: 0 }))]))

  return (
    <main className="side">
      <Topplinje tittel={brett.tittel} onTilbake={onTilbake} />

      <section className="panel">
        <h2>Lag</h2>
        <div className="segment" role="group" aria-label="Antall lag">
          {[2, 3, 4, 5, 6].map((n) => (
            <button key={n} className={lag.length === n ? 'valgt' : ''} aria-pressed={lag.length === n} onClick={() => antallLag(n)}>
              {n} lag
            </button>
          ))}
        </div>
        <div className="lag-felt">
          {lag.map((l, n) => (
            <label key={n} className="lag-navn" style={{ '--lagfarge': l.farge } as React.CSSProperties}>
              <span className="lag-prikk" aria-hidden="true" />
              <input value={l.navn} maxLength={24} aria-label={`Navn på lag ${n + 1}`} onChange={(e) => setLag(lag.map((x, k) => (k === n ? { ...x, navn: e.target.value } : x)))} />
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Regler</h2>
        <Rad tittel="Feil svar" hjelp="Med minuspoeng mister laget like mye som ruten er verdt.">
          <div className="segment">
            <button className={i.feilSvar === 'minus' ? 'valgt' : ''} aria-pressed={i.feilSvar === 'minus'} onClick={() => sett('feilSvar', 'minus')}>
              Minuspoeng
            </button>
            <button className={i.feilSvar === 'null' ? 'valgt' : ''} aria-pressed={i.feilSvar === 'null'} onClick={() => sett('feilSvar', 'null')}>
              0 poeng
            </button>
          </div>
        </Rad>
        <Rad tittel="Tidtaker" hjelp="Starter når spørsmålet vises.">
          <div className="segment">
            <button className={!i.tidtaker ? 'valgt' : ''} aria-pressed={!i.tidtaker} onClick={() => sett('tidtaker', false)}>
              Av
            </button>
            {TIDER.map((t) => (
              <button key={t} className={i.tidtaker && i.sekunder === t ? 'valgt' : ''} aria-pressed={i.tidtaker && i.sekunder === t} onClick={() => setI({ ...i, tidtaker: true, sekunder: t })}>
                {t} s
              </button>
            ))}
          </div>
          {i.tidtaker && !TIDER.includes(i.sekunder) && <span className="dempet liten">Egen tid: {i.sekunder} s</span>}
          {i.tidtaker && (
            <label className="egen-tid">
              Egen tid
              <input type="number" min={5} max={300} value={i.sekunder} onChange={(e) => sett('sekunder', Math.min(300, Math.max(5, +e.target.value || 30)))} />
              sekunder
            </label>
          )}
        </Rad>
        <Bryter tittel="Andre lag kan svare" hjelp="Svarer et lag feil, kan de andre lagene prøve." verdi={i.stjele} onEndre={(v) => sett('stjele', v)} />
        <Bryter tittel="Dobbel-ruter" hjelp="En skjult rute der laget selv satser poeng." verdi={i.dobbel} onEndre={(v) => sett('dobbel', v)} />
        <Bryter
          tittel="Finalerunde"
          hjelp={harFinale ? 'Alle lag satser til slutt på ett spørsmål.' : 'Brettet har ikke noe finalespørsmål. Legg det inn under Rediger.'}
          verdi={i.finale && harFinale}
          deaktivert={!harFinale}
          onEndre={(v) => sett('finale', v)}
        />
        <Bryter tittel="Lyd" verdi={i.lyd} onEndre={(v) => sett('lyd', v)} />
      </section>

      <section className="panel">
        <h2>Utseende</h2>
        <div className="tema-valg">
          {TEMAER.map((t) => (
            <button key={t.id} className={i.tema === t.id ? 'tema-kort valgt' : 'tema-kort'} aria-pressed={i.tema === t.id} onClick={() => sett('tema', t.id)}>
              <span className="tema-forhandsvisning" data-tema={t.id} aria-hidden="true">
                {[0, 1, 2].map((k) => (
                  <span key={k} className="mini-kolonne">
                    <span className="mini-kategori" />
                    <span className="mini-rute">{poengFor(0, i.poengskala)}</span>
                    <span className="mini-rute">{poengFor(1, i.poengskala)}</span>
                  </span>
                ))}
              </span>
              <strong>{t.navn}</strong>
              <span className="dempet liten">{t.beskrivelse}</span>
            </button>
          ))}
        </div>
        <Rad tittel="Poeng">
          <div className="segment">
            {SKALAER.map((s) => (
              <button key={s.id} className={i.poengskala === s.id ? 'valgt' : ''} aria-pressed={i.poengskala === s.id} onClick={() => sett('poengskala', s.id)}>
                {s.id === 1 ? `1–${rader}` : `${s.id}–${s.id * rader}`}
              </button>
            ))}
          </div>
        </Rad>
        <Bryter tittel="Stor tekst" hjelp="For store klasserom eller små skjermer." verdi={i.storTekst} onEndre={(v) => sett('storTekst', v)} />
      </section>

      <div className="knapperad slutt">
        <button
          className="knapp knapp-hoved knapp-stor"
          onClick={() => {
            const ferdig = { ...i, finale: i.finale && harFinale }
            setInnstillinger({ ...ferdig, finale: i.finale })
            onStart(ferdig, lag.map((l, n) => ({ ...l, navn: l.navn.trim() || LAGNAVN[n] })))
          }}
        >
          Start spillet
        </button>
      </div>
    </main>
  )
}

function Rad({ tittel, hjelp, children }: { tittel: string; hjelp?: string; children: React.ReactNode }) {
  return (
    <div className="innstilling">
      <div>
        <strong>{tittel}</strong>
        {hjelp && <span className="dempet liten">{hjelp}</span>}
      </div>
      <div className="innstilling-kontroll">{children}</div>
    </div>
  )
}

function Bryter({ tittel, hjelp, verdi, onEndre, deaktivert }: { tittel: string; hjelp?: string; verdi: boolean; onEndre: (v: boolean) => void; deaktivert?: boolean }) {
  return (
    <Rad tittel={tittel} hjelp={hjelp}>
      <button role="switch" aria-checked={verdi} aria-label={tittel} disabled={deaktivert} className="bryter" onClick={() => onEndre(!verdi)}>
        <span />
      </button>
    </Rad>
  )
}
