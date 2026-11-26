import { useState } from 'react'
import type { Brett, Innstillinger, Lag, Poengskala, Tema } from '../types'
import { Topplinje } from '../komponenter/Topplinje'
import { poengFor } from '../poeng'
import { feilAlternativer } from '../alternativer'

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
const SPILLETIDER = [0, 15, 20, 30, 45]

type SegmentValg<T> = { verdi: T; tekst: string }

function Segment<T extends string | number>({ valg, verdi, onEndre, etikett }: { valg: SegmentValg<T>[]; verdi: T; onEndre: (v: T) => void; etikett: string }) {
  return (
    <div className="segment" role="group" aria-label={etikett}>
      {valg.map((v) => (
        <button key={String(v.verdi)} className={verdi === v.verdi ? 'valgt' : ''} aria-pressed={verdi === v.verdi} onClick={() => onEndre(v.verdi)}>
          {v.tekst}
        </button>
      ))}
    </div>
  )
}

export function SpillOppsett({ brett, innstillinger, setInnstillinger, onTilbake, onStart }: Props) {
  const [i, setI] = useState(innstillinger)
  const [lag, setLag] = useState<Lag[]>(() => LAGNAVN.slice(0, 3).map((navn, n) => ({ navn, farge: LAGFARGER[n] })))
  const sett = <K extends keyof Innstillinger>(k: K, v: Innstillinger[K]) => setI({ ...i, [k]: v })
  const harFinale = !!brett.finale.sporsmal.trim()
  const rader = brett.kategorier[0]?.sporsmal.length ?? 5
  const sporsmalene = brett.kategorier.flatMap((k) => k.sporsmal).filter((s) => s.sporsmal.trim())
  const medAlt = sporsmalene.filter((s) => feilAlternativer(s).length > 0).length
  const medHint = sporsmalene.filter((s) => feilAlternativer(s).length > 1).length
  const hintPriser = [0, 0.5, 1, 2].filter((f) => !(i.poengskala === 1 && f === 0.5))

  const startvalg = i.poengskala === 1 ? [0, 5, 10] : [0, 500, 1000]

  const antallLag = (n: number) =>
    setLag((l) => (n < l.length ? l.slice(0, n) : [...l, ...LAGNAVN.slice(l.length, n).map((navn, k) => ({ navn, farge: LAGFARGER[l.length + k] }))]))

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
        <p className="dempet liten">Lagene velger rute etter tur. Bare laget som valgte ruten, svarer. Deretter går turen videre til neste lag.</p>
        <Rad tittel="Tidtaker" hjelp="Tiden laget har til å svare. Starter når spørsmålet vises.">
          <Segment
            etikett="Tidtaker"
            verdi={i.tidtaker ? i.sekunder : 0}
            onEndre={(v) => setI(v === 0 ? { ...i, tidtaker: false } : { ...i, tidtaker: true, sekunder: v })}
            valg={[{ verdi: 0, tekst: 'Av' }, ...TIDER.map((t) => ({ verdi: t, tekst: `${t} s` }))]}
          />
          {i.tidtaker && (
            <label className="egen-tid">
              Egen tid
              <input type="number" min={5} max={300} value={i.sekunder} onChange={(e) => sett('sekunder', Math.min(300, Math.max(5, +e.target.value || 30)))} />
              sekunder
            </label>
          )}
        </Rad>
        <Rad tittel="Feil svar" hjelp="Med minuspoeng mister laget like mye som det kunne vunnet.">
          <Segment
            etikett="Feil svar"
            verdi={i.feilSvar}
            onEndre={(v) => sett('feilSvar', v)}
            valg={[
              { verdi: 'minus', tekst: 'Minuspoeng' },
              { verdi: 'null', tekst: '0 poeng' },
            ]}
          />
        </Rad>

        <h3 className="regel-gruppe">Hjelp til elevene</h3>
        <Bryter
          tittel="Svaralternativer"
          hjelp={medAlt === 0 ? 'Brettet har ingen svaralternativer. Legg dem inn under Rediger, eller la KI lage dem.' : `Viser svaret og de feile alternativene som A–D. ${medAlt} av ${sporsmalene.length} spørsmål har alternativer.`}
          verdi={i.alternativer && medAlt > 0}
          deaktivert={medAlt === 0}
          onEndre={(v) => sett('alternativer', v)}
        />
        {i.alternativer && medAlt > 0 && (
          <Rad tittel="Hint" hjelp={`Laget som svarer, kan kjøpe hint. Hvert hint fjerner ett feil alternativ og koster poeng. Minst ett feil alternativ blir stående. ${medHint} spørsmål har nok alternativer til hint.`}>
            <Segment etikett="Pris for hint" verdi={i.hintPris} onEndre={(v) => sett('hintPris', v)} valg={hintPriser.map((f) => ({ verdi: f, tekst: f === 0 ? 'Av' : `${Math.max(1, Math.round(f * i.poengskala))} poeng` }))} />
          </Rad>
        )}

        <h3 className="regel-gruppe">Spillet</h3>
        <Rad tittel="Startpoeng" hjelp="Poengene hvert lag har når spillet starter. Med startpoeng kan alle lag satse på dobbel og finale fra første stund.">
          <Segment etikett="Startpoeng" verdi={startvalg.includes(i.startpoeng) ? i.startpoeng : -1} onEndre={(v) => v >= 0 && sett('startpoeng', v)} valg={startvalg.map((v) => ({ verdi: v, tekst: String(v) }))} />
          <label className="egen-tid">
            Eget tall
            <input type="number" min={0} max={10000} step={i.poengskala === 1 ? 1 : 50} value={i.startpoeng} onChange={(e) => sett('startpoeng', Math.min(10_000, Math.max(0, Math.round(+e.target.value) || 0)))} />
            poeng
          </label>
        </Rad>
        <Rad tittel="Dobbel-ruter" hjelp="Skjulte ruter der laget som valgte, satser poeng selv. Riktig svar gir innsatsen, feil svar gir minus innsatsen.">
          <Segment etikett="Antall dobbel-ruter" verdi={i.antallDobbel} onEndre={(v) => sett('antallDobbel', v)} valg={[0, 1, 2, 3].map((n) => ({ verdi: n, tekst: n === 0 ? 'Ingen' : String(n) }))} />
        </Rad>
        <Rad tittel="Spilletid" hjelp="Brettet viser hvor lang tid som er igjen. Når tiden er ute, går dere til finalen eller resultatet.">
          <Segment etikett="Spilletid" verdi={i.spilletid} onEndre={(v) => sett('spilletid', v)} valg={SPILLETIDER.map((t) => ({ verdi: t, tekst: t === 0 ? 'Til brettet er tomt' : `${t} min` }))} />
        </Rad>
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
            const ferdig = { ...i, finale: i.finale && harFinale, alternativer: i.alternativer && medAlt > 0 }
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
