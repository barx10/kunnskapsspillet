import { useEffect, useRef, useState } from 'react'
import type { Spilltilstand } from '../types'
import { poengFor } from '../poeng'
import { lyd } from '../lyd'
import { Tidtaker } from '../komponenter/Tidtaker'
import { Finale } from './Finale'

type Props = { spill: Spilltilstand; setSpill: (s: Spilltilstand) => void; onPause: () => void }

type Aapen = {
  id: string
  ki: number
  ri: number
  verdi: number
  dobbel: boolean
  steg: 'dobbel-innsats' | 'sporsmal'
  dobbelLag: number | null
  innsats: number
  feil: number[]
  riktig: number | null
  visSvar: boolean
}

export function Spill({ spill, setSpill, onPause }: Props) {
  const { brett, innstillinger: inn, lag } = spill
  const [aapen, setAapen] = useState<Aapen | null>(null)
  const [historikk, setHistorikk] = useState<Spilltilstand[]>([])
  const [justerer, setJusterer] = useState<number | null>(null)
  const [fullskjerm, setFullskjerm] = useState(!!document.fullscreenElement)
  const spill_lyd = (f: () => void) => inn.lyd && f()

  const rader = brett.kategorier[0]?.sporsmal.length ?? 5
  const gyldige = brett.kategorier.flatMap((k, ki) => k.sporsmal.map((s, ri) => (s.sporsmal.trim() ? `${ki}-${ri}` : null)).filter(Boolean)) as string[]
  const gjenstar = gyldige.filter((id) => !spill.brukt.includes(id)).length
  const hoyesteVerdi = poengFor(rader - 1, inn.poengskala)

  useEffect(() => {
    const f = () => setFullskjerm(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])

  const oppdater = (s: Spilltilstand) => {
    setHistorikk((h) => [...h.slice(-30), spill])
    setSpill(s)
  }
  const angre = () => {
    const forrige = historikk.at(-1)
    if (!forrige) return
    setHistorikk((h) => h.slice(0, -1))
    setSpill(forrige)
    setAapen(null)
  }
  const endrePoeng = (n: number, delta: number, s: Spilltilstand = spill) => ({ ...s, lag: s.lag.map((l, k) => (k === n ? { ...l, poeng: l.poeng + delta } : l)) })

  const apne = (ki: number, ri: number) => {
    const id = `${ki}-${ri}`
    const dobbel = spill.dobbel.includes(id)
    if (dobbel) spill_lyd(lyd.dobbel)
    setAapen({ id, ki, ri, verdi: poengFor(ri, inn.poengskala), dobbel, steg: dobbel ? 'dobbel-innsats' : 'sporsmal', dobbelLag: null, innsats: 0, feil: [], riktig: null, visSvar: false })
  }

  const lukk = () => {
    if (!aapen) return
    oppdater({ ...spill, brukt: [...spill.brukt, aapen.id] })
    setAapen(null)
  }

  const svar = (n: number, riktig: boolean) => {
    if (!aapen) return
    const verdi = aapen.dobbel ? aapen.innsats : aapen.verdi
    if (riktig) {
      spill_lyd(lyd.riktig)
      oppdater(endrePoeng(n, verdi))
      setAapen({ ...aapen, riktig: n, visSvar: true })
    } else {
      spill_lyd(lyd.feil)
      const trekk = inn.feilSvar === 'minus' || aapen.dobbel ? -verdi : 0
      if (trekk) oppdater(endrePoeng(n, trekk))
      const feil = [...aapen.feil, n]
      const ferdig = aapen.dobbel || !inn.stjele || feil.length >= lag.length
      setAapen({ ...aapen, feil, visSvar: ferdig || aapen.visSvar })
    }
  }

  const tilFinale = () => {
    if (aapen) return
    oppdater({ ...spill, fase: inn.finale ? 'finale' : 'slutt' })
  }

  const fullskjermKnapp = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})

  if (spill.fase === 'finale') return <Finale spill={spill} setSpill={oppdater} />

  const sporsmal = aapen ? brett.kategorier[aapen.ki].sporsmal[aapen.ri] : null
  const maksInnsats = aapen?.dobbelLag != null ? Math.max(lag[aapen.dobbelLag].poeng, hoyesteVerdi) : hoyesteVerdi

  return (
    <div className="spill spill-brett">
      <header className="spill-topp">
        <span className="spill-tittel">{brett.tittel}</span>
        <div className="spill-verktoy">
          <button className="lenkeknapp" onClick={angre} disabled={historikk.length === 0}>
            Angre
          </button>
          <button className="lenkeknapp" onClick={fullskjermKnapp}>
            {fullskjerm ? 'Avslutt fullskjerm' : 'Fullskjerm'}
          </button>
          <button className="lenkeknapp" onClick={tilFinale}>
            {inn.finale ? 'Gå til finalen' : 'Avslutt spillet'}
          </button>
          <button className="lenkeknapp" onClick={onPause}>
            Pause
          </button>
        </div>
      </header>

      <div className="brett" style={{ '--kolonner': brett.kategorier.length, '--rader': rader } as React.CSSProperties}>
        {brett.kategorier.map((k, ki) => (
          <div key={ki} className="brett-kolonne" data-kolonne={ki}>
            <div className="brett-kategori">{k.navn || `Kategori ${ki + 1}`}</div>
            {k.sporsmal.map((s, ri) => {
              const id = `${ki}-${ri}`
              const brukt = spill.brukt.includes(id)
              const tom = !s.sporsmal.trim()
              return (
                <button key={ri} className="brett-rute" disabled={brukt || tom} onClick={() => apne(ki, ri)} aria-label={brukt ? `${k.navn}, ${poengFor(ri, inn.poengskala)}, brukt` : `${k.navn} for ${poengFor(ri, inn.poengskala)}`}>
                  {!brukt && !tom && poengFor(ri, inn.poengskala)}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {gjenstar === 0 && !aapen && (
        <div className="brett-ferdig">
          <button className="knapp knapp-hoved knapp-stor" onClick={tilFinale}>
            {inn.finale ? 'Til finalen' : 'Se resultatet'}
          </button>
        </div>
      )}

      <footer className="poengtavle">
        {lag.map((l, n) => (
          <div key={n} className="lag-poeng" style={{ '--lagfarge': l.farge } as React.CSSProperties}>
            <span className="lag-poeng-navn">{l.navn}</span>
            <button className="lag-poeng-tall" onClick={() => setJusterer(justerer === n ? null : n)} aria-label={`${l.navn}: ${l.poeng} poeng. Juster poeng`}>
              {l.poeng}
            </button>
            {justerer === n && (
              <span className="juster">
                <button onClick={() => oppdater(endrePoeng(n, -inn.poengskala))} aria-label="Trekk fra">
                  −{inn.poengskala}
                </button>
                <button onClick={() => oppdater(endrePoeng(n, inn.poengskala))} aria-label="Legg til">
                  +{inn.poengskala}
                </button>
              </span>
            )}
          </div>
        ))}
      </footer>

      {aapen && sporsmal && (
        <Sporsmalsvisning
          key={aapen.id + aapen.steg}
          aapen={aapen}
          setAapen={setAapen}
          kategori={brett.kategorier[aapen.ki].navn}
          sporsmal={sporsmal}
          spill={spill}
          maksInnsats={maksInnsats}
          onSvar={svar}
          onLukk={lukk}
          lydPaa={inn.lyd}
        />
      )}
    </div>
  )
}

type VisningProps = {
  aapen: Aapen
  setAapen: (a: Aapen) => void
  kategori: string
  sporsmal: { sporsmal: string; svar: string }
  spill: Spilltilstand
  maksInnsats: number
  onSvar: (n: number, riktig: boolean) => void
  onLukk: () => void
  lydPaa: boolean
}

function Sporsmalsvisning({ aapen, setAapen, kategori, sporsmal, spill, maksInnsats, onSvar, onLukk, lydPaa }: VisningProps) {
  const { innstillinger: inn, lag } = spill
  const ferdig = aapen.riktig !== null || aapen.visSvar
  const hovedknapp = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    hovedknapp.current?.focus()
  }, [ferdig, aapen.steg])

  useEffect(() => {
    const tast = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'Escape' && ferdig) onLukk()
    }
    window.addEventListener('keydown', tast)
    return () => window.removeEventListener('keydown', tast)
  }, [ferdig, onLukk])

  if (aapen.steg === 'dobbel-innsats') {
    const lagValgt = aapen.dobbelLag
    return (
      <div className="sporsmal-lag" role="dialog" aria-modal="true" aria-label="Dobbel">
        <div className="sporsmal-boks dobbel">
          <p className="sporsmal-meta">
            {kategori} – {aapen.verdi}
          </p>
          <h2 className="dobbel-tittel">Dobbel!</h2>
          <p>Hvilket lag valgte ruten, og hvor mye satser de?</p>
          <div className="lag-velger">
            {lag.map((l, n) => (
              <button
                key={n}
                className={lagValgt === n ? 'lag-knapp valgt' : 'lag-knapp'}
                style={{ '--lagfarge': l.farge } as React.CSSProperties}
                aria-pressed={lagValgt === n}
                onClick={() => setAapen({ ...aapen, dobbelLag: n, innsats: Math.min(aapen.innsats || aapen.verdi, Math.max(l.poeng, maksInnsats)) })}
              >
                {l.navn} <span className="dempet">({l.poeng})</span>
              </button>
            ))}
          </div>
          {lagValgt !== null && (
            <label className="innsats">
              <span>Innsats (maks {maksInnsats})</span>
              <input type="range" min={0} max={maksInnsats} step={inn.poengskala === 1 ? 1 : 50} value={aapen.innsats} onChange={(e) => setAapen({ ...aapen, innsats: +e.target.value })} />
              <output>{aapen.innsats}</output>
            </label>
          )}
          <div className="knapperad slutt">
            <button ref={hovedknapp} className="knapp knapp-hoved knapp-stor" disabled={lagValgt === null} onClick={() => setAapen({ ...aapen, steg: 'sporsmal' })}>
              Vis spørsmålet
            </button>
          </div>
        </div>
      </div>
    )
  }

  const aktuelleLag = aapen.dobbel && aapen.dobbelLag !== null ? [aapen.dobbelLag] : lag.map((_, n) => n)

  return (
    <div className="sporsmal-lag" role="dialog" aria-modal="true" aria-label={`${kategori} for ${aapen.verdi}`}>
      <div className="sporsmal-boks">
        <p className="sporsmal-meta">
          {kategori} – {aapen.dobbel ? `dobbel, innsats ${aapen.innsats}` : aapen.verdi}
        </p>
        <p className="sporsmal-tekst">{sporsmal.sporsmal}</p>

        {inn.tidtaker && !ferdig && <Tidtaker sekunder={inn.sekunder} lyd={lydPaa} />}

        <div className={aapen.visSvar ? 'svar synlig' : 'svar'} aria-live="polite">
          {aapen.visSvar ? (
            <>
              <span className="svar-etikett">Svar</span>
              <p className="svar-tekst">{sporsmal.svar || 'Ingen fasit er lagt inn.'}</p>
            </>
          ) : (
            <button className="lenkeknapp" onClick={() => setAapen({ ...aapen, visSvar: true })}>
              Vis svaret
            </button>
          )}
        </div>

        {aapen.riktig === null && (
          <div className="svar-lag">
            {aktuelleLag.map((n) => {
              const l = lag[n]
              const ute = aapen.feil.includes(n)
              return (
                <div key={n} className={ute ? 'svar-rad ute' : 'svar-rad'} style={{ '--lagfarge': l.farge } as React.CSSProperties}>
                  <span className="svar-lagnavn">{l.navn}</span>
                  {ute ? (
                    <span className="dempet">Svarte feil</span>
                  ) : (
                    <span className="knapperad">
                      <button className="knapp knapp-feil" onClick={() => onSvar(n, false)} disabled={ferdig && !aapen.dobbel && aapen.feil.length > 0 && !inn.stjele}>
                        Feil
                      </button>
                      <button className="knapp knapp-riktig" onClick={() => onSvar(n, true)}>
                        Riktig
                      </button>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {aapen.riktig !== null && (
          <p className="riktig-melding" style={{ '--lagfarge': lag[aapen.riktig].farge } as React.CSSProperties}>
            {lag[aapen.riktig].navn} fikk {aapen.dobbel ? aapen.innsats : aapen.verdi} poeng
          </p>
        )}

        <div className="knapperad slutt">
          <button ref={hovedknapp} className={ferdig ? 'knapp knapp-hoved knapp-stor' : 'knapp'} onClick={onLukk}>
            {ferdig ? 'Tilbake til brettet' : 'Ingen svarte – lukk'}
          </button>
        </div>
      </div>
    </div>
  )
}
