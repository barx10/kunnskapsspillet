import { useCallback, useEffect, useRef, useState } from 'react'
import type { Hendelse, Spilltilstand, Sporsmal } from '../types'
import { poengFor, poengsum } from '../poeng'
import { feilAlternativer } from '../alternativer'
import { lyd } from '../lyd'
import { Tidtaker } from '../komponenter/Tidtaker'
import { Modal } from '../komponenter/Modal'
import { Finale } from './Finale'

type Endre = (f: (s: Spilltilstand) => Spilltilstand) => void
type Props = { spill: Spilltilstand; endre: Endre; onPause: () => void }

/**
 * Et åpent spørsmål. Bare laget med turen (lag) svarer, også på dobbel.
 * - svar: null til læreren har trykket «Riktig» eller «Feil».
 * - hint: antall hint laget har kjøpt. Poengene for ruten regnes alltid ut fra svar og hint, så de kan ikke telles dobbelt.
 * - forrige: tilstanden før siste svar, så læreren kan angre inne i spørsmålet.
 */
type Aapen = {
  id: string
  ki: number
  ri: number
  verdi: number
  dobbel: boolean
  steg: 'innsats' | 'sporsmal'
  lag: number
  innsats: number
  svar: { riktig: boolean; poeng: number } | null
  hint: number
  /** Feil alternativer som er fjernet med hint. */
  fjernet: string[]
  visSvar: boolean
  tidUte: boolean
  forrige: Aapen | null
}

export function Spill({ spill, endre, onPause }: Props) {
  const { brett, innstillinger: inn, lag } = spill
  const tur = spill.tur ?? 0
  const sum = poengsum(spill)
  const [aapen, setAapen] = useState<Aapen | null>(null)
  const [historikk, setHistorikk] = useState<Spilltilstand[]>([])
  const [justerer, setJusterer] = useState<number | null>(null)
  const [visLogg, setVisLogg] = useState(false)
  const [fullskjerm, setFullskjerm] = useState(!!document.fullscreenElement)
  const [na, setNa] = useState(() => Date.now())
  const spillLyd = (f: () => void) => inn.lyd && f()

  // Et åpent spørsmål får sitt eget punkt i nettleserhistorikken, så tilbakeknappen lukker
  // spørsmålet i stedet for å forlate spillet. Ubesvarte spørsmål kan da åpnes igjen.
  const aapenRef = useRef<Aapen | null>(null)
  const markerBrukt = useRef(false)
  const vedApning = useRef<Spilltilstand | null>(null)
  useEffect(() => {
    aapenRef.current = aapen
  })

  const rader = brett.kategorier[0]?.sporsmal.length ?? 5
  const gyldige = brett.kategorier.flatMap((k, ki) => k.sporsmal.map((s, ri) => (s.sporsmal.trim() ? `${ki}-${ri}` : null)).filter(Boolean)) as string[]
  const gjenstar = gyldige.filter((id) => !spill.brukt.includes(id)).length
  const hoyesteVerdi = poengFor(rader - 1, inn.poengskala)
  /** Et lag kan satse sine egne poeng, eller opp til den høyeste ruteverdien. */
  const maksInnsatsFor = (n: number) => Math.max(sum[n], hoyesteVerdi)
  const hintPris = inn.hintPris > 0 ? Math.max(1, Math.round(inn.hintPris * inn.poengskala)) : 0
  const steg = inn.poengskala === 1 ? [1, 2, 5] : [50, 100, 200]

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

  // Spørsmålet lukkes: ruten blir brukt og turen går videre. Poengene er allerede ført.
  useEffect(() => {
    const tilbake = () => {
      const a = aapenRef.current
      if (!a) return
      const avgjort = a.svar !== null || a.hint > 0 || a.visSvar
      if (markerBrukt.current || avgjort) {
        const for_ = vedApning.current
        if (for_) setHistorikk((h) => [...h.slice(-30), for_])
        endre((s) => ({ ...s, brukt: s.brukt.includes(a.id) ? s.brukt : [...s.brukt, a.id], tur: (a.lag + 1) % s.lag.length }))
      }
      markerBrukt.current = false
      vedApning.current = null
      setAapen(null)
    }
    window.addEventListener('popstate', tilbake)
    return () => window.removeEventListener('popstate', tilbake)
  }, [endre])

  /** Endring på brettet som kan angres. */
  const medAngre = (f: (s: Spilltilstand) => Spilltilstand) => {
    setHistorikk((h) => [...h.slice(-30), spill])
    endre(f)
  }
  const angre = () => {
    const forrige = historikk.at(-1)
    if (!forrige) return
    setHistorikk((h) => h.slice(0, -1))
    endre(() => forrige)
  }
  const leggTil = (h: Hendelse) => medAngre((s) => ({ ...s, hendelser: [...s.hendelser, h] }))
  const fjernHendelse = (i: number) => medAngre((s) => ({ ...s, hendelser: s.hendelser.filter((_, k) => k !== i) }))

  /** Oppdaterer det åpne spørsmålet, og lar poengene for ruten følge svarene. */
  const settAapen = (a: Aapen) => {
    setAapen(a)
    const navn = `${brett.kategorier[a.ki].navn || `Kategori ${a.ki + 1}`} ${a.verdi}${a.dobbel ? ' (dobbel)' : ''}`
    const nye: Hendelse[] = Array.from({ length: a.hint }, () => ({ lag: a.lag, poeng: -hintPris, tekst: `${navn}: hint`, rute: a.id }))
    if (a.svar && a.svar.poeng !== 0) nye.push({ lag: a.lag, poeng: a.svar.poeng, tekst: `${navn}: ${a.svar.riktig ? 'riktig' : 'feil'}`, rute: a.id })
    endre((s) => ({ ...s, hendelser: [...s.hendelser.filter((h) => h.rute !== a.id), ...nye] }))
  }

  const apne = (ki: number, ri: number) => {
    const id = `${ki}-${ri}`
    const dobbel = spill.dobbel.includes(id)
    if (dobbel) spillLyd(lyd.dobbel)
    setJusterer(null)
    vedApning.current = spill
    history.pushState({ ...history.state, sporsmal: id }, '')
    const verdi = poengFor(ri, inn.poengskala)
    const lagNr = Math.min(tur, lag.length - 1)
    setAapen({
      id,
      ki,
      ri,
      verdi,
      dobbel,
      steg: dobbel ? 'innsats' : 'sporsmal',
      lag: lagNr,
      innsats: Math.min(verdi, maksInnsatsFor(lagNr)),
      svar: null,
      hint: 0,
      fjernet: [],
      visSvar: false,
      tidUte: false,
      forrige: null,
    })
  }

  const lukk = () => {
    if (!aapen) return
    markerBrukt.current = true
    history.back()
  }

  const svar = (riktig: boolean) => {
    if (!aapen) return
    const verdi = aapen.dobbel ? aapen.innsats : aapen.verdi
    spillLyd(riktig ? lyd.riktig : lyd.feil)
    // Dobbel gir alltid minus innsatsen ved feil svar. Ellers følger det regelen for feil svar.
    const poeng = riktig ? verdi : aapen.dobbel || inn.feilSvar === 'minus' ? -verdi : 0
    settAapen({ ...aapen, svar: { riktig, poeng }, visSvar: true, tidUte: false, forrige: aapen })
  }

  const angreSvar = () => aapen?.forrige && settAapen(aapen.forrige)

  /** Laget kjøper et hint: ett tilfeldig feil alternativ fjernes. Minst ett feil alternativ blir stående. */
  const kjopHint = () => {
    if (!aapen) return
    const igjen = feilAlternativer(brett.kategorier[aapen.ki].sporsmal[aapen.ri]).filter((a) => !aapen.fjernet.includes(a))
    if (igjen.length < 2) return
    settAapen({ ...aapen, fjernet: [...aapen.fjernet, igjen[Math.floor(Math.random() * igjen.length)]], hint: aapen.hint + 1, forrige: aapen })
  }

  const tidUte = useCallback(() => setAapen((a) => (a ? { ...a, tidUte: true } : a)), [])

  const tilFinale = () => {
    if (aapen) return
    medAngre((s) => ({ ...s, fase: inn.finale ? 'finale' : 'slutt' }))
  }

  const fullskjermKnapp = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})

  if (spill.fase === 'finale')
    return (
      <Finale
        spill={spill}
        onTilbake={historikk.length ? angre : undefined}
        onFerdig={(nye) => medAngre((s) => ({ ...s, hendelser: [...s.hendelser, ...nye], fase: 'slutt' }))}
      />
    )

  const sporsmal = aapen ? brett.kategorier[aapen.ki].sporsmal[aapen.ri] : null
  const ferdigBrett = gjenstar === 0 || tidenErUte

  return (
    <div className="spill spill-brett">
      <header className="spill-topp">
        <span className="spill-tittel">{brett.tittel}</span>
        {!ferdigBrett && (
          <span className="tur-melding" style={{ '--lagfarge': lag[tur]?.farge } as React.CSSProperties}>
            {lag[tur]?.navn} velger rute
          </span>
        )}
        <div className="spill-verktoy">
          {igjenMs !== null && <span className={tidenErUte ? 'spilletid ute' : 'spilletid'}>{tidenErUte ? 'Spilletiden er ute' : `${Math.ceil(igjenMs / 60_000)} min igjen`}</span>}
          <button className="lenkeknapp" onClick={angre} disabled={historikk.length === 0}>
            Angre
          </button>
          <button className="lenkeknapp" onClick={() => setVisLogg(true)}>
            Poenglogg
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
          <div key={n} className={n === tur && !ferdigBrett ? 'lag-poeng har-tur' : 'lag-poeng'} style={{ '--lagfarge': l.farge } as React.CSSProperties}>
            <span className="lag-poeng-navn">{l.navn}</span>
            <button className="lag-poeng-tall" disabled={!!aapen} onClick={() => setJusterer(justerer === n ? null : n)} aria-label={`${l.navn}: ${sum[n]} poeng. Juster poeng`}>
              {sum[n]}
            </button>
            {justerer === n && !aapen && (
              <span className="juster">
                {[...steg].reverse().map((d) => (
                  <button key={-d} onClick={() => leggTil({ lag: n, poeng: -d, tekst: 'Justert' })} aria-label={`Trekk fra ${d}`}>
                    −{d}
                  </button>
                ))}
                {steg.map((d) => (
                  <button key={d} onClick={() => leggTil({ lag: n, poeng: d, tekst: 'Justert' })} aria-label={`Legg til ${d}`}>
                    +{d}
                  </button>
                ))}
                {n !== tur && (
                  <button onClick={() => medAngre((s) => ({ ...s, tur: n }))} aria-label={`Gi turen til ${l.navn}`}>
                    Gi turen
                  </button>
                )}
              </span>
            )}
          </div>
        ))}
      </footer>

      {visLogg && (
        <Modal tittel="Poenglogg" onLukk={() => setVisLogg(false)} bred>
          <p className="dempet">
            Alle lag startet med {inn.startpoeng} poeng. Fjerner du en linje, endres poengsummen med en gang.
          </p>
          {spill.hendelser.length === 0 ? (
            <p>Ingen poeng er gitt ennå.</p>
          ) : (
            <ol className="poenglogg" reversed>
              {spill.hendelser.map((h, i) => ({ h, i })).reverse().map(({ h, i }) => (
                <li key={i} style={{ '--lagfarge': lag[h.lag]?.farge } as React.CSSProperties}>
                  <span className="poenglogg-lag">{lag[h.lag]?.navn}</span>
                  <span className="poenglogg-tekst">{h.tekst}</span>
                  <span className="poenglogg-poeng">{h.poeng > 0 ? `+${h.poeng}` : `−${-h.poeng}`}</span>
                  <button className="lenkeknapp" onClick={() => fjernHendelse(i)} aria-label={`Fjern ${h.tekst} for ${lag[h.lag]?.navn}`}>
                    Fjern
                  </button>
                </li>
              ))}
            </ol>
          )}
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
          maksInnsats={maksInnsatsFor(aapen.lag)}
          onSvar={svar}
          onAngre={angreSvar}
          hintPris={hintPris}
          onHint={kjopHint}
          onLukk={lukk}
          onTidUte={tidUte}
        />
      )}
    </div>
  )
}

type VisningProps = {
  aapen: Aapen
  setAapen: (a: Aapen) => void
  kategori: string
  sporsmal: Sporsmal
  spill: Spilltilstand
  maksInnsats: number
  onSvar: (riktig: boolean) => void
  onAngre: () => void
  hintPris: number
  onHint: () => void
  onLukk: () => void
  onTidUte: () => void
}

function Sporsmalsvisning({ aapen, setAapen, kategori, sporsmal, spill, maksInnsats, onSvar, onAngre, hintPris, onHint, onLukk, onTidUte }: VisningProps) {
  const { innstillinger: inn } = spill
  const lag = spill.lag[aapen.lag]
  const lagfarge = { '--lagfarge': lag.farge } as React.CSSProperties
  const ferdig = aapen.svar !== null || aapen.visSvar
  const hovedknapp = useRef<HTMLButtonElement>(null)
  const feilAlt = feilAlternativer(sporsmal)
  const medAlternativer = inn.alternativer && feilAlt.length > 0
  const [alternativer] = useState(() => [sporsmal.svar.trim(), ...feilAlt].sort(() => Math.random() - 0.5))
  const kanHint = medAlternativer && hintPris > 0 && !ferdig && feilAlt.filter((a) => !aapen.fjernet.includes(a)).length >= 2
  const rutepoeng = (aapen.svar?.poeng ?? 0) - aapen.hint * hintPris

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

  if (aapen.steg === 'innsats') {
    const sett = (v: number) => setAapen({ ...aapen, innsats: Math.min(maksInnsats, Math.max(inn.poengskala, Math.round(v) || inn.poengskala)) })
    return (
      <div className="sporsmal-lag" role="dialog" aria-modal="true" aria-label="Dobbel">
        <div className="sporsmal-boks dobbel">
          <p className="sporsmal-meta">
            {kategori} – {aapen.verdi}
          </p>
          <h2 className="dobbel-tittel">Dobbel!</h2>
          <p className="svar-melding">
            <span className="lag-merke" style={lagfarge}>
              {lag.navn}
            </span>{' '}
            har {poengsum(spill)[aapen.lag]} poeng. Hvor mye satser dere?
          </p>
          <label className="innsats">
            <span>
              Innsats ({inn.poengskala}–{maksInnsats})
            </span>
            <input type="range" min={inn.poengskala} max={maksInnsats} step={inn.poengskala === 1 ? 1 : 50} value={aapen.innsats} onChange={(e) => sett(+e.target.value)} />
            <input type="number" className="innsats-tall" min={inn.poengskala} max={maksInnsats} value={aapen.innsats} onChange={(e) => sett(+e.target.value)} aria-label="Innsats" />
          </label>
          <p className="dempet">
            Riktig svar gir +{aapen.innsats}. Feil svar gir −{aapen.innsats}. Bare {lag.navn} kan svare.
          </p>
          <div className="knapperad slutt">
            <button ref={hovedknapp} className="knapp knapp-hoved knapp-stor" onClick={() => setAapen({ ...aapen, steg: 'sporsmal' })}>
              Vis spørsmålet
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sporsmal-lag" role="dialog" aria-modal="true" aria-label={`${kategori} for ${aapen.verdi}`}>
      <div className="sporsmal-boks">
        <p className="sporsmal-meta">
          {kategori} – {aapen.dobbel ? `dobbel, innsats ${aapen.innsats}` : aapen.verdi}
        </p>
        <p className="sporsmal-tekst">{sporsmal.sporsmal}</p>

        {medAlternativer && (
          <ol className="alternativer" aria-label="Svaralternativer">
            {alternativer.map((a, i) => {
              const fjernet = aapen.fjernet.includes(a)
              const klasse = aapen.visSvar ? (a === sporsmal.svar.trim() ? 'riktig' : 'feil') : fjernet ? 'fjernet' : ''
              return (
                <li key={a} className={`alternativ ${klasse}`} aria-label={fjernet ? `${a}, fjernet` : undefined}>
                  <span className="alternativ-bokstav">{'ABCD'[i]}</span>
                  <span>{a}</span>
                </li>
              )
            })}
          </ol>
        )}

        {!ferdig && inn.tidtaker && <Tidtaker sekunder={inn.sekunder} lyd={inn.lyd} onUte={onTidUte} />}

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

        {aapen.svar === null ? (
          <div className="svar-rad" style={lagfarge}>
            <span className="svar-lagnavn">
              {lag.navn} svarer{aapen.tidUte && <span className="dempet"> – tiden er ute</span>}
            </span>
            <span className="knapperad">
              {kanHint && (
                <button className="knapp knapp-hint" onClick={onHint} aria-label={`${lag.navn} kjøper hint for ${hintPris} poeng`}>
                  Hint −{hintPris}
                </button>
              )}
              <button className="knapp knapp-feil" onClick={() => onSvar(false)}>
                Feil
              </button>
              <button className="knapp knapp-riktig" onClick={() => onSvar(true)}>
                Riktig
              </button>
            </span>
          </div>
        ) : (
          <p className={aapen.svar.riktig ? 'resultat-melding riktig' : 'resultat-melding'} style={lagfarge} aria-live="polite">
            {lag.navn} svarte {aapen.svar.riktig ? 'riktig' : 'feil'}: {rutepoeng > 0 ? `+${rutepoeng}` : rutepoeng < 0 ? `−${-rutepoeng}` : '0'} poeng
          </p>
        )}
        {aapen.svar === null && aapen.hint > 0 && <p className="dempet">Hint: −{aapen.hint * hintPris} poeng</p>}

        <div className="knapperad slutt">
          {aapen.forrige && (
            <button className="knapp" onClick={onAngre}>
              Angre siste
            </button>
          )}
          <button ref={hovedknapp} className={ferdig ? 'knapp knapp-hoved knapp-stor' : 'knapp'} onClick={onLukk}>
            {ferdig ? 'Tilbake til brettet' : 'Lukk uten svar'}
          </button>
        </div>
      </div>
    </div>
  )
}
