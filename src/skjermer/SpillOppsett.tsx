import { useEffect, useState } from 'react'
import type { Brett, Innstillinger, Lag, Poengskala, Spillmodus, Tema } from '../types'
import { MODUSER } from '../lagring'
import { buzzer } from '../buzzer/vert'
import { RomPanel } from '../buzzer/RomPanel'
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
const STJELETIDER = [0, 5, 10, 15, 20]
const SPILLETIDER = [0, 15, 20, 30, 45]

const MODUSKORT: { id: Spillmodus; navn: string; beskrivelse: string }[] = [
  { id: 'klassisk', navn: 'Klassisk', beskrivelse: 'Lagene velger rute etter tur og svarer først. Svarer de feil eller tiden går ut, kan de andre lagene prøve.' },
  { id: 'lynrunde', navn: 'Lynrunde', beskrivelse: 'Alle lag kan svare med en gang. Laget som rekker opp hånda først, får svare.' },
  { id: 'rolig', navn: 'Rolig', beskrivelse: 'Ingen tidtaker og ingen minuspoeng. Lagene bytter på å velge og svare.' },
  { id: 'egen', navn: 'Egne regler', beskrivelse: 'Sett sammen reglene selv nedenfor.' },
]

type SegmentValg<T> = { verdi: T; tekst: string; deaktivert?: boolean }

function Segment<T extends string | number>({ valg, verdi, onEndre, etikett }: { valg: SegmentValg<T>[]; verdi: T; onEndre: (v: T) => void; etikett: string }) {
  return (
    <div className="segment" role="group" aria-label={etikett}>
      {valg.map((v) => (
        <button key={String(v.verdi)} className={verdi === v.verdi ? 'valgt' : ''} aria-pressed={verdi === v.verdi} disabled={v.deaktivert} onClick={() => onEndre(v.verdi)}>
          {v.tekst}
        </button>
      ))}
    </div>
  )
}

export function SpillOppsett({ brett, innstillinger, setInnstillinger, onTilbake, onStart }: Props) {
  const [i, setI] = useState(innstillinger)
  const [lag, setLag] = useState<Lag[]>(() => LAGNAVN.slice(0, 3).map((navn, n) => ({ navn, farge: LAGFARGER[n], poeng: 0 })))
  // Endrer du en regel, går modusen over til «Egne regler».
  const regel = <K extends keyof Innstillinger>(k: K, v: Innstillinger[K]) => {
    const ny = { ...i, [k]: v, modus: 'egen' as Spillmodus }
    if (k === 'tur' && v === 'fri') ny.forstSvar = 'alle'
    setI(ny)
  }
  const sett = <K extends keyof Innstillinger>(k: K, v: Innstillinger[K]) => setI({ ...i, [k]: v })
  const velgModus = (m: Spillmodus) => setI(m === 'egen' ? { ...i, modus: m } : { ...i, ...MODUSER[m], modus: m })
  const harFinale = !!brett.finale.sporsmal.trim()
  const rader = brett.kategorier[0]?.sporsmal.length ?? 5

  // Buzzer gir mening når noen lag skal melde seg: alle med en gang, eller de andre etter feil svar.
  const kanMelde = i.forstSvar === 'alle' || i.stjele !== 'av'
  const brukerBuzzer = kanMelde && i.melding === 'buzzer'
  useEffect(() => {
    if (!brukerBuzzer) return
    buzzer.start()
    buzzer.settLag(lag.map((l, n) => ({ navn: l.navn.trim() || LAGNAVN[n], farge: l.farge })))
  }, [brukerBuzzer, lag])

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
        <h2>Spillmodus</h2>
        <div className="modus-valg">
          {MODUSKORT.map((m) => (
            <button key={m.id} className={i.modus === m.id ? 'modus-kort valgt' : 'modus-kort'} aria-pressed={i.modus === m.id} onClick={() => velgModus(m.id)}>
              <strong>{m.navn}</strong>
              <span className="dempet liten">{m.beskrivelse}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Regler</h2>
        <h3 className="regel-gruppe">Tur og svar</h3>
        <Rad tittel="Hvem velger rute" hjelp="Brettet viser hvilket lag som har turen.">
          <Segment
            etikett="Hvem velger rute"
            verdi={i.tur}
            onEndre={(v) => regel('tur', v)}
            valg={[
              { verdi: 'riktig', tekst: 'Laget som svarte riktig' },
              { verdi: 'rekke', tekst: 'Etter tur' },
              { verdi: 'fri', tekst: 'Fritt' },
            ]}
          />
        </Rad>
        <Rad tittel="Hvem svarer først" hjelp={i.tur === 'fri' ? 'Når ingen har turen, svarer laget som rekker opp hånda først.' : undefined}>
          <Segment
            etikett="Hvem svarer først"
            verdi={i.forstSvar}
            onEndre={(v) => regel('forstSvar', v)}
            valg={[
              { verdi: 'tur', tekst: 'Laget som valgte ruten', deaktivert: i.tur === 'fri' },
              { verdi: 'alle', tekst: 'Raskeste hånd' },
            ]}
          />
        </Rad>
        <Rad tittel="Tidtaker" hjelp="Tiden laget har til å svare. Starter når spørsmålet vises.">
          <Segment
            etikett="Tidtaker"
            verdi={i.tidtaker ? i.sekunder : 0}
            onEndre={(v) => (v === 0 ? regel('tidtaker', false) : setI({ ...i, tidtaker: true, sekunder: v, modus: 'egen' }))}
            valg={[{ verdi: 0, tekst: 'Av' }, ...TIDER.map((t) => ({ verdi: t, tekst: `${t} s` }))]}
          />
          {i.tidtaker && (
            <label className="egen-tid">
              Egen tid
              <input type="number" min={5} max={300} value={i.sekunder} onChange={(e) => regel('sekunder', Math.min(300, Math.max(5, +e.target.value || 30)))} />
              sekunder
            </label>
          )}
        </Rad>

        <h3 className="regel-gruppe">Når et lag ikke klarer det</h3>
        <Rad tittel="Andre lag kan svare" hjelp={i.forstSvar === 'alle' ? 'Svarer laget som rakk opp hånda feil, kan de andre prøve.' : undefined}>
          <Segment
            etikett="Andre lag kan svare"
            verdi={i.stjele}
            onEndre={(v) => regel('stjele', v)}
            valg={[
              { verdi: 'feilOgTid', tekst: 'Etter feil svar eller når tiden går ut', deaktivert: !i.tidtaker || i.forstSvar === 'alle' },
              { verdi: 'feil', tekst: 'Etter feil svar' },
              { verdi: 'av', tekst: 'Nei' },
            ]}
          />
        </Rad>
        {kanMelde && (
          <Rad tittel={i.forstSvar === 'alle' ? 'Slik melder lagene seg' : 'Slik melder de andre lagene seg'} hjelp={i.melding === 'buzzer' ? 'Lærerskjermen viser hvilket lag som buzzet først.' : undefined}>
            <Segment
              etikett="Slik melder lagene seg"
              verdi={i.melding}
              onEndre={(v) => sett('melding', v)}
              valg={[
                { verdi: 'hand', tekst: 'Rekker opp hånda' },
                { verdi: 'buzzer', tekst: 'Buzzer på egen enhet' },
              ]}
            />
          </Rad>
        )}
        {kanMelde && i.melding === 'buzzer' && <RomPanel lag={lag} />}
        {i.stjele !== 'av' && (
          <>
            <Rad tittel="Tid for de andre lagene">
              <Segment
                etikett="Tid for de andre lagene"
                verdi={i.stjeleSekunder}
                onEndre={(v) => regel('stjeleSekunder', v)}
                valg={STJELETIDER.map((t) => ({ verdi: t, tekst: t === 0 ? 'Ingen' : `${t} s` }))}
              />
            </Rad>
            {i.forstSvar === 'tur' && (
              <Rad tittel="Poeng til de andre lagene" hjelp="Når et annet lag svarer riktig.">
                <Segment
                  etikett="Poeng til de andre lagene"
                  verdi={i.stjelePoeng}
                  onEndre={(v) => regel('stjelePoeng', v)}
                  valg={[
                    { verdi: 'full', tekst: 'Hele verdien' },
                    { verdi: 'halv', tekst: 'Halve verdien' },
                  ]}
                />
              </Rad>
            )}
          </>
        )}
        <Rad tittel="Feil svar" hjelp="Med minuspoeng mister laget like mye som det kunne vunnet.">
          <Segment
            etikett="Feil svar"
            verdi={i.feilSvar}
            onEndre={(v) => regel('feilSvar', v)}
            valg={[
              { verdi: 'minus', tekst: 'Minuspoeng' },
              { verdi: 'null', tekst: '0 poeng' },
            ]}
          />
        </Rad>

        <h3 className="regel-gruppe">Spillet</h3>
        <Rad tittel="Dobbel-ruter" hjelp="Skjulte ruter der laget som valgte, satser poeng selv.">
          <Segment etikett="Antall dobbel-ruter" verdi={i.antallDobbel} onEndre={(v) => regel('antallDobbel', v)} valg={[0, 1, 2, 3].map((n) => ({ verdi: n, tekst: n === 0 ? 'Ingen' : String(n) }))} />
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
