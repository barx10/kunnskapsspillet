import { useCallback, useEffect, useRef, useState } from 'react'
import type { Spilltilstand } from '../types'
import { poengFor } from '../poeng'
import { lyd } from '../lyd'
import { Tidtaker } from '../komponenter/Tidtaker'
import { Finale } from './Finale'
import { buzzer, useBuzzer } from '../buzzer/vert'
import { RomPanel } from '../buzzer/RomPanel'
import { Modal } from '../komponenter/Modal'

type Props = { spill: Spilltilstand; setSpill: (s: Spilltilstand) => void; onPause: () => void }

/**
 * Et åpent spørsmål.
 * - forsteLag: laget som svarer først (laget med turen). null = alle lag kan svare med en gang.
 * - fase: 'forste' mens forsteLag svarer, 'apen' når de andre lagene kan melde seg.
 */
type Aapen = {
  id: string
  ki: number
  ri: number
  verdi: number
  dobbel: boolean
  steg: 'dobbel-innsats' | 'sporsmal'
  dobbelLag: number | null
  innsats: number
  forsteLag: number | null
  fase: 'forste' | 'apen'
  feil: number[]
  riktig: number | null
  visSvar: boolean
  tidUte: boolean
}

export function Spill({ spill, setSpill, onPause }: Props) {
  const { brett, innstillinger: inn, lag } = spill
  const tur = spill.tur ?? 0
  const harTur = inn.tur !== 'fri'
  const [aapen, setAapen] = useState<Aapen | null>(null)
  const [historikk, setHistorikk] = useState<Spilltilstand[]>([])
  const [justerer, setJusterer] = useState<number | null>(null)
  const [fullskjerm, setFullskjerm] = useState(!!document.fullscreenElement)
  const [na, setNa] = useState(() => Date.now())
  const spill_lyd = (f: () => void) => inn.lyd && f()
  const medBuzzer = inn.melding === 'buzzer' && (inn.forstSvar === 'alle' || inn.stjele !== 'av')
  const bz = useBuzzer()
  const [visRom, setVisRom] = useState(false)
  const lagNavn = JSON.stringify(lag.map(({ navn, farge }) => ({ navn, farge })))
  useEffect(() => {
    if (!medBuzzer) return
    buzzer.start()
    buzzer.settLag(JSON.parse(lagNavn))
  }, [medBuzzer, lagNavn])
  // Et åpent spørsmål får sitt eget punkt i nettleserhistorikken, så tilbakeknappen lukker
  // spørsmålet i stedet for å forlate spillet. Ubesvarte spørsmål kan da åpnes igjen.
  const aapenRef = useRef<Aapen | null>(null)
  const markerBrukt = useRef(false)
  const spillRef = useRef(spill)
  useEffect(() => {
    aapenRef.current = aapen
    spillRef.current = spill
  })

  const rader = brett.kategorier[0]?.sporsmal.length ?? 5
  const gyldige = brett.kategorier.flatMap((k, ki) => k.sporsmal.map((s, ri) => (s.sporsmal.trim() ? `${ki}-${ri}` : null)).filter(Boolean)) as string[]
  const gjenstar = gyldige.filter((id) => !spill.brukt.includes(id)).length
  const hoyesteVerdi = poengFor(rader - 1, inn.poengskala)

  // Spilletid
  const igjenMs = inn.spilletid > 0 ? (spill.startet ?? na) + inn.spilletid * 60_000 - na : null
  const tidenErUte = igjenMs !== null && igjenMs <= 0
  useEffect(() => {
    if (!inn.spilletid) return
    const t = setInterval(() => setNa(Date.now()), 5_000)
    return () => clearInterval(t)
  }, [inn.spilletid])

  useEffect(() => {
    const f = () => setFullskjerm(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])

  useEffect(() => {
    const tilbake = () => {
      const a = aapenRef.current
      if (!a) return
      const avgjort = a.riktig !== null || a.visSvar || a.feil.length > 0
      if (markerBrukt.current || avgjort) {
        const s = spillRef.current
        setHistorikk((h) => [...h.slice(-30), s])
        setSpill({ ...s, brukt: [...s.brukt, a.id], tur: nesteTur(s, a) })
      }
      markerBrukt.current = false
      setAapen(null)
    }
    window.addEventListener('popstate', tilbake)
    return () => window.removeEventListener('popstate', tilbake)
  }, [setSpill])

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
    history.pushState({ ...history.state, sporsmal: id }, '')
    const forsteLag = dobbel ? null : inn.forstSvar === 'tur' && harTur ? tur : null
    setAapen({
      id,
      ki,
      ri,
      verdi: poengFor(ri, inn.poengskala),
      dobbel,
      steg: dobbel ? 'dobbel-innsats' : 'sporsmal',
      dobbelLag: dobbel && harTur ? tur : null,
      innsats: 0,
      forsteLag,
      fase: forsteLag === null ? 'apen' : 'forste',
      feil: [],
      riktig: null,
      visSvar: false,
      tidUte: false,
    })
  }

  const lukk = () => {
    if (!aapen) return
    markerBrukt.current = true
    history.back()
  }

  /** Poeng for et svar fra lag n i nåværende fase. */
  const verdiFor = (a: Aapen) => {
    if (a.dobbel) return a.innsats
    const stjeler = a.forsteLag !== null && a.fase === 'apen'
    return stjeler && inn.stjelePoeng === 'halv' ? Math.max(1, Math.round(a.verdi / 2)) : a.verdi
  }

  const svar = (n: number, riktig: boolean) => {
    if (!aapen) return
    const verdi = verdiFor(aapen)
    if (riktig) {
      spill_lyd(lyd.riktig)
      oppdater(endrePoeng(n, verdi))
      setAapen({ ...aapen, riktig: n, visSvar: true })
      return
    }
    spill_lyd(lyd.feil)
    const trekk = inn.feilSvar === 'minus' || aapen.dobbel ? -verdi : 0
    if (trekk) oppdater(endrePoeng(n, trekk))
    const feil = [...aapen.feil, n]
    const igjen = lag.filter((_, k) => !feil.includes(k) && k !== aapen.forsteLag).length
    const ingenIgjen = aapen.forsteLag === null ? feil.length >= lag.length : igjen === 0
    const ferdig = aapen.dobbel || inn.stjele === 'av' || ingenIgjen
    setAapen({ ...aapen, feil, fase: ferdig ? aapen.fase : 'apen', tidUte: false, visSvar: ferdig || aapen.visSvar })
  }

  /** Tiden til laget som svarer først, er ute. */
  const forsteTidUte = useCallback(() => {
    setAapen((a) => {
      if (!a || a.fase !== 'forste') return a
      if (inn.stjele === 'feilOgTid' && !a.dobbel) return { ...a, fase: 'apen', tidUte: false }
      return { ...a, tidUte: true }
    })
  }, [inn.stjele])
  const apenTidUte = useCallback(() => setAapen((a) => (a ? { ...a, tidUte: true } : a)), [])

  const slippTilAndre = () => aapen && setAapen({ ...aapen, fase: 'apen', tidUte: false })

  const tilFinale = () => {
    if (aapen) return
    oppdater({ ...spill, fase: inn.finale ? 'finale' : 'slutt' })
  }

  const fullskjermKnapp = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})

  if (spill.fase === 'finale') return <Finale spill={spill} setSpill={oppdater} />

  const sporsmal = aapen ? brett.kategorier[aapen.ki].sporsmal[aapen.ri] : null
  const maksInnsats = aapen?.dobbelLag != null ? Math.max(lag[aapen.dobbelLag].poeng, hoyesteVerdi) : hoyesteVerdi
  const ferdigBrett = gjenstar === 0 || tidenErUte

  return (
    <div className="spill spill-brett">
      <header className="spill-topp">
        <span className="spill-tittel">{brett.tittel}</span>
        {harTur && !ferdigBrett && (
          <span className="tur-melding" style={{ '--lagfarge': lag[tur]?.farge } as React.CSSProperties}>
            {lag[tur]?.navn} velger rute
          </span>
        )}
        <div className="spill-verktoy">
          {medBuzzer && (
            <button className={bz.status === 'tilkoblet' ? 'lenkeknapp rom-merke' : 'lenkeknapp rom-merke frakoblet'} onClick={() => setVisRom(true)}>
              Buzzer {bz.kode} · {bz.tilkoblet.length}/{lag.length} lag
            </button>
          )}
          {igjenMs !== null && <span className={tidenErUte ? 'spilletid ute' : 'spilletid'}>{tidenErUte ? 'Spilletiden er ute' : `${Math.ceil(igjenMs / 60_000)} min igjen`}</span>}
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

      {ferdigBrett && !aapen && (
        <div className="brett-ferdig">
          {tidenErUte && gjenstar > 0 && <span>Spilletiden er ute.</span>}
          <button className="knapp knapp-hoved knapp-stor" onClick={tilFinale}>
            {inn.finale ? 'Til finalen' : 'Se resultatet'}
          </button>
        </div>
      )}

      <footer className="poengtavle">
        {lag.map((l, n) => (
          <div key={n} className={harTur && n === tur && !ferdigBrett ? 'lag-poeng har-tur' : 'lag-poeng'} style={{ '--lagfarge': l.farge } as React.CSSProperties}>
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
                {harTur && n !== tur && (
                  <button onClick={() => oppdater({ ...spill, tur: n })} aria-label={`Gi turen til ${l.navn}`}>
                    Gi turen
                  </button>
                )}
              </span>
            )}
          </div>
        ))}
      </footer>

      {visRom && (
        <Modal tittel="Buzzer" onLukk={() => setVisRom(false)} bred>
          <RomPanel lag={lag} />
        </Modal>
      )}

      {aapen && sporsmal && (
        <Sporsmalsvisning
          key={aapen.id + aapen.steg}
          aapen={aapen}
          setAapen={setAapen}
          kategori={brett.kategorier[aapen.ki].navn}
          sporsmal={sporsmal}
          spill={spill}
          maksInnsats={maksInnsats}
          verdi={verdiFor(aapen)}
          onSvar={svar}
          onLukk={lukk}
          onForsteTidUte={forsteTidUte}
          onApenTidUte={apenTidUte}
          onSlippTilAndre={slippTilAndre}
          medBuzzer={medBuzzer}
        />
      )}
    </div>
  )
}

/** Hvem velger neste rute etter at et spørsmål er lukket. */
function nesteTur(s: Spilltilstand, a: Aapen) {
  const n = s.lag.length
  const tur = s.tur ?? 0
  if (s.innstillinger.tur === 'riktig') return a.riktig ?? tur
  if (s.innstillinger.tur === 'rekke') return (tur + 1) % n
  return tur
}

type VisningProps = {
  aapen: Aapen
  setAapen: (a: Aapen) => void
  kategori: string
  sporsmal: { sporsmal: string; svar: string }
  spill: Spilltilstand
  maksInnsats: number
  verdi: number
  onSvar: (n: number, riktig: boolean) => void
  onLukk: () => void
  onForsteTidUte: () => void
  onApenTidUte: () => void
  onSlippTilAndre: () => void
  medBuzzer: boolean
}

function Sporsmalsvisning({ aapen, setAapen, kategori, sporsmal, spill, maksInnsats, verdi, onSvar, onLukk, onForsteTidUte, onApenTidUte, onSlippTilAndre, medBuzzer }: VisningProps) {
  const { innstillinger: inn, lag } = spill
  const ferdig = aapen.riktig !== null || aapen.visSvar
  const hovedknapp = useRef<HTMLButtonElement>(null)

  const iForste = aapen.fase === 'forste' && aapen.forsteLag !== null
  const aktuelleLag = iForste ? [aapen.forsteLag as number] : lag.map((_, n) => n).filter((n) => !aapen.feil.includes(n) && n !== aapen.forsteLag)

  // Buzzer: åpne for lagene som kan svare nå, og steng når ingen kan det.
  const bz = useBuzzer()
  const buzzAktiv = medBuzzer && aapen.steg === 'sporsmal' && !ferdig && !iForste && aapen.riktig === null && aktuelleLag.length > 0
  const runde = `${aapen.id}-${aapen.feil.length}`
  const tillatt = aktuelleLag.join(',')
  useEffect(() => {
    if (buzzAktiv) buzzer.apne(runde, tillatt.split(',').map(Number))
    else buzzer.steng()
  }, [buzzAktiv, runde, tillatt])
  useEffect(() => () => buzzer.steng(), [])
  const rekkefolge = buzzAktiv && bz.runde === runde ? bz.rekkefolge.filter((n) => aktuelleLag.includes(n)) : []
  const forstBuzz = rekkefolge.at(0)
  useEffect(() => {
    if (forstBuzz !== undefined && inn.lyd) lyd.buzz()
  }, [forstBuzz, inn.lyd])

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
          <p>{lagValgt !== null ? `${lag[lagValgt].navn} valgte ruten. Hvor mye satser dere?` : 'Hvilket lag valgte ruten, og hvor mye satser de?'}</p>
          <div className="lag-velger">
            {lag.map((l, n) => (
              <button
                key={n}
                className={lagValgt === n ? 'lag-knapp valgt' : 'lag-knapp'}
                style={{ '--lagfarge': l.farge } as React.CSSProperties}
                aria-pressed={lagValgt === n}
                onClick={() => setAapen({ ...aapen, dobbelLag: n })}
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
            <button ref={hovedknapp} className="knapp knapp-hoved knapp-stor" disabled={lagValgt === null} onClick={() => setAapen({ ...aapen, steg: 'sporsmal', forsteLag: lagValgt, fase: 'forste' })}>
              Vis spørsmålet
            </button>
          </div>
        </div>
      </div>
    )
  }

  const kanSlippes = iForste && inn.stjele !== 'av' && !aapen.dobbel && lag.length > 1

  // Overskrift over lagene
  let melding: string
  if (iForste) melding = `${lag[aapen.forsteLag as number].navn} svarer`
  else if (forstBuzz !== undefined) melding = `${lag[forstBuzz].navn} var først!`
  else if (medBuzzer) melding = aapen.forsteLag === null && aapen.feil.length === 0 ? 'Laget som buzzer først, får svare' : 'De andre lagene kan buzze nå!'
  else if (aapen.forsteLag === null && aapen.feil.length === 0) melding = 'Laget som rekker opp hånda først, får svare'
  else melding = 'De andre lagene kan svare. Rekk opp hånda!'

  const visTidtaker = !ferdig && forstBuzz === undefined && (iForste ? inn.tidtaker : aapen.forsteLag === null && aapen.feil.length === 0 ? inn.tidtaker : inn.stjeleSekunder > 0)
  const sekunder = iForste || (aapen.forsteLag === null && aapen.feil.length === 0) ? inn.sekunder : inn.stjeleSekunder

  return (
    <div className="sporsmal-lag" role="dialog" aria-modal="true" aria-label={`${kategori} for ${aapen.verdi}`}>
      <div className="sporsmal-boks">
        <p className="sporsmal-meta">
          {kategori} – {aapen.dobbel ? `dobbel, innsats ${aapen.innsats}` : aapen.verdi}
        </p>
        <p className="sporsmal-tekst">{sporsmal.sporsmal}</p>

        {visTidtaker && <Tidtaker key={`${aapen.fase}-${aapen.feil.length}`} sekunder={sekunder} lyd={inn.lyd} onUte={iForste ? onForsteTidUte : onApenTidUte} />}

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

        {aapen.riktig === null && !(aapen.visSvar && aktuelleLag.length === 0) && (
          <div className="svar-lag">
            {!ferdig && (
              <p className="svar-melding">
                {melding}
                {!iForste && aapen.forsteLag !== null && verdi !== aapen.verdi && <span className="dempet"> ({verdi} poeng)</span>}
              </p>
            )}
            {[...rekkefolge, ...aktuelleLag.filter((n) => !rekkefolge.includes(n))].map((n) => {
              const l = lag[n]
              const plass = rekkefolge.indexOf(n)
              return (
                <div key={n} className={plass === 0 ? 'svar-rad forst' : 'svar-rad'} style={{ '--lagfarge': l.farge } as React.CSSProperties}>
                  <span className="svar-lagnavn">
                    {l.navn}
                    {plass >= 0 && <span className="buzz-plass">{plass === 0 ? 'Først' : `${plass + 1}.`}</span>}
                  </span>
                  <span className="knapperad">
                    <button className="knapp knapp-feil" onClick={() => onSvar(n, false)}>
                      Feil
                    </button>
                    <button className="knapp knapp-riktig" onClick={() => onSvar(n, true)}>
                      Riktig
                    </button>
                  </span>
                </div>
              )
            })}
            {aapen.feil.length > 0 && <p className="dempet liten">Svarte feil: {aapen.feil.map((n) => lag[n].navn).join(', ')}</p>}
            {kanSlippes && (
              <button className="lenkeknapp slipp" onClick={onSlippTilAndre}>
                {aapen.tidUte ? 'Tiden er ute. La de andre lagene svare' : 'La de andre lagene svare'}
              </button>
            )}
          </div>
        )}
        {aapen.riktig !== null && (
          <p className="riktig-melding" style={{ '--lagfarge': lag[aapen.riktig].farge } as React.CSSProperties}>
            {lag[aapen.riktig].navn} fikk {verdi} poeng
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
