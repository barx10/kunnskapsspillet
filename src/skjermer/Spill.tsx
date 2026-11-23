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

/** Ett svar på et spørsmål. poeng er med fortegn: +200 for riktig, −200 eller 0 for feil. */
type Svar = { lag: number; riktig: boolean; poeng: number }

/**
 * Et åpent spørsmål.
 * - forsteLag: laget som svarer først (laget med turen). null = alle lag kan svare med en gang.
 * - andreLag: laget som trekkes tilfeldig når forsteLag bommer eller tiden går ut.
 * - fase: 'forste' mens forsteLag svarer, 'andre' mens andreLag svarer, 'apen' når alle gjenværende lag kan melde seg.
 * - stengt: ingen flere lag kan svare på spørsmålet.
 * - svar og hint: alt som gir poeng. Poengene for ruten regnes alltid ut fra disse, så de kan ikke telles dobbelt.
 * - forrige: tilstanden før siste svar, så læreren kan angre inne i spørsmålet.
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
  andreLag: number | null
  fase: 'forste' | 'andre' | 'apen'
  stengt: boolean
  svar: Svar[]
  hint: number[]
  /** Feil alternativer som er fjernet med hint. */
  fjernet: string[]
  visSvar: boolean
  tidUte: boolean
  forrige: Aapen | null
}

const riktigLag = (a: Aapen) => a.svar.find((s) => s.riktig)?.lag ?? null
const feilLag = (a: Aapen) => a.svar.filter((s) => !s.riktig).map((s) => s.lag)

export function Spill({ spill, endre, onPause }: Props) {
  const { brett, innstillinger: inn, lag } = spill
  const tur = spill.tur ?? 0
  const harTur = inn.tur !== 'fri'
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
  const maksInnsatsFor = (n: number | null) => (n === null ? hoyesteVerdi : Math.max(sum[n], hoyesteVerdi))
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
      const avgjort = a.svar.length > 0 || a.hint.length > 0 || a.visSvar
      if (markerBrukt.current || avgjort) {
        const for_ = vedApning.current
        if (for_) setHistorikk((h) => [...h.slice(-30), for_])
        endre((s) => ({ ...s, brukt: s.brukt.includes(a.id) ? s.brukt : [...s.brukt, a.id], tur: nesteTur(s, a) }))
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
    const nye: Hendelse[] = [
      ...a.hint.map((n) => ({ lag: n, poeng: -hintPris, tekst: `${navn}: hint`, rute: a.id })),
      ...a.svar.filter((s) => s.poeng !== 0).map((s) => ({ lag: s.lag, poeng: s.poeng, tekst: `${navn}: ${s.riktig ? 'riktig' : 'feil'}`, rute: a.id })),
    ]
    endre((s) => ({ ...s, hendelser: [...s.hendelser.filter((h) => h.rute !== a.id), ...nye] }))
  }

  const apne = (ki: number, ri: number) => {
    const id = `${ki}-${ri}`
    const dobbel = spill.dobbel.includes(id)
    if (dobbel) spillLyd(lyd.dobbel)
    setJusterer(null)
    vedApning.current = spill
    history.pushState({ ...history.state, sporsmal: id }, '')
    const forsteLag = dobbel ? null : inn.forstSvar === 'tur' && harTur ? tur : null
    const verdi = poengFor(ri, inn.poengskala)
    const dobbelLag = dobbel && harTur ? tur : null
    setAapen({
      id,
      ki,
      ri,
      verdi,
      dobbel,
      steg: dobbel ? 'dobbel-innsats' : 'sporsmal',
      dobbelLag,
      innsats: Math.min(verdi, maksInnsatsFor(dobbelLag)),
      forsteLag,
      andreLag: null,
      fase: forsteLag === null ? 'apen' : 'forste',
      stengt: false,
      svar: [],
      hint: [],
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

  /** Hva et riktig svar er verdt i nåværende fase. */
  const verdiFor = (a: Aapen) => {
    if (a.dobbel) return a.innsats
    const stjeler = a.forsteLag !== null && a.fase !== 'forste'
    return stjeler && inn.stjelePoeng === 'halv' ? Math.max(1, Math.round(a.verdi / 2)) : a.verdi
  }

  const svar = (n: number, riktig: boolean) => {
    if (!aapen) return
    const verdi = verdiFor(aapen)
    if (riktig) {
      spillLyd(lyd.riktig)
      settAapen({ ...aapen, svar: [...aapen.svar, { lag: n, riktig: true, poeng: verdi }], visSvar: true, tidUte: false, forrige: aapen })
      return
    }
    spillLyd(lyd.feil)
    // Dobbel gir alltid minus innsatsen ved feil svar. Ellers følger det regelen for feil svar.
    const poeng = aapen.dobbel || inn.feilSvar === 'minus' ? -verdi : 0
    const b: Aapen = { ...aapen, svar: [...aapen.svar, { lag: n, riktig: false, poeng }], tidUte: false, forrige: aapen }
    if (aapen.dobbel || inn.stjele === 'av') settAapen(steng(b))
    else if (aapen.fase === 'apen') settAapen(aktuelle(b, lag.length).length ? b : steng(b))
    else settAapen(videre(b, lag.length))
  }

  const angreSvar = () => aapen?.forrige && settAapen(aapen.forrige)

  /** Lag n kjøper et hint: ett tilfeldig feil alternativ fjernes. Minst ett feil alternativ blir stående. */
  const kjopHint = (n: number) => {
    if (!aapen) return
    const igjen = feilAlternativer(brett.kategorier[aapen.ki].sporsmal[aapen.ri]).filter((a) => !aapen.fjernet.includes(a))
    if (igjen.length < 2) return
    settAapen({ ...aapen, fjernet: [...aapen.fjernet, igjen[Math.floor(Math.random() * igjen.length)]], hint: [...aapen.hint, n], forrige: aapen })
  }

  /** Tiden til laget med turen (eller det trukne laget) er ute. */
  const turTidUte = useCallback(() => {
    setAapen((a) => {
      if (!a || a.fase === 'apen') return a
      if (inn.stjele === 'feilOgTid' && !a.dobbel) return { ...videre(a, lag.length), forrige: a }
      return { ...a, tidUte: true }
    })
  }, [inn.stjele, lag.length])
  const apenTidUte = useCallback(() => setAapen((a) => (a ? { ...a, tidUte: true } : a)), [])

  const slippTilAndre = () => aapen && setAapen({ ...videre(aapen, lag.length), forrige: aapen })

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
        {harTur && !ferdigBrett && (
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
          <div key={n} className={harTur && n === tur && !ferdigBrett ? 'lag-poeng har-tur' : 'lag-poeng'} style={{ '--lagfarge': l.farge } as React.CSSProperties}>
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
                {harTur && n !== tur && (
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
          maksInnsatsFor={maksInnsatsFor}
          verdi={verdiFor(aapen)}
          onSvar={svar}
          onAngre={angreSvar}
          hintPris={hintPris}
          onHint={kjopHint}
          onLukk={lukk}
          onTurTidUte={turTidUte}
          onApenTidUte={apenTidUte}
          onSlippTilAndre={slippTilAndre}
        />
      )}
    </div>
  )
}

const steng = (a: Aapen): Aapen => ({ ...a, stengt: true, visSvar: true, tidUte: false })

/** Lagene som kan svare nå. */
function aktuelle(a: Aapen, antallLag: number): number[] {
  if (a.stengt || riktigLag(a) !== null) return []
  if (a.fase === 'forste' && a.forsteLag !== null) return [a.forsteLag]
  if (a.fase === 'andre' && a.andreLag !== null) return [a.andreLag]
  const feil = feilLag(a)
  return Array.from({ length: antallLag }, (_, n) => n).filter((n) => !feil.includes(n) && n !== a.forsteLag && n !== a.andreLag)
}

/** Laget med turen bommet: spørsmålet går til et tilfeldig annet lag. Bommer også det, kan alle gjenværende lag svare. */
function videre(a: Aapen, antallLag: number): Aapen {
  const b: Aapen = { ...a, tidUte: false }
  if (a.fase === 'forste') {
    const feil = feilLag(a)
    const kandidater = Array.from({ length: antallLag }, (_, n) => n).filter((n) => n !== a.forsteLag && !feil.includes(n))
    if (!kandidater.length) return steng(b)
    return { ...b, fase: 'andre', andreLag: kandidater[Math.floor(Math.random() * kandidater.length)] }
  }
  const apen: Aapen = { ...b, fase: 'apen' }
  return aktuelle(apen, antallLag).length ? apen : steng(apen)
}

/** Hvem velger neste rute etter at et spørsmål er lukket. */
function nesteTur(s: Spilltilstand, a: Aapen) {
  const tur = s.tur ?? 0
  if (s.innstillinger.tur === 'riktig') return riktigLag(a) ?? tur
  if (s.innstillinger.tur === 'rekke') return (tur + 1) % s.lag.length
  return tur
}

type VisningProps = {
  aapen: Aapen
  setAapen: (a: Aapen) => void
  kategori: string
  sporsmal: Sporsmal
  spill: Spilltilstand
  maksInnsatsFor: (n: number | null) => number
  verdi: number
  onSvar: (n: number, riktig: boolean) => void
  onAngre: () => void
  hintPris: number
  onHint: (n: number) => void
  onLukk: () => void
  onTurTidUte: () => void
  onApenTidUte: () => void
  onSlippTilAndre: () => void
}

function Sporsmalsvisning({ aapen, setAapen, kategori, sporsmal, spill, maksInnsatsFor, verdi, onSvar, onAngre, hintPris, onHint, onLukk, onTurTidUte, onApenTidUte, onSlippTilAndre }: VisningProps) {
  const { innstillinger: inn, lag } = spill
  const riktig = riktigLag(aapen)
  const feil = feilLag(aapen)
  const ferdig = riktig !== null || aapen.visSvar
  const hovedknapp = useRef<HTMLButtonElement>(null)
  const feilAlt = feilAlternativer(sporsmal)
  const medAlternativer = inn.alternativer && feilAlt.length > 0
  const [alternativer] = useState(() => [sporsmal.svar.trim(), ...feilAlt].sort(() => Math.random() - 0.5))
  const kanHint = medAlternativer && hintPris > 0 && !ferdig && feilAlt.filter((a) => !aapen.fjernet.includes(a)).length >= 2

  const iTur = (aapen.fase === 'forste' && aapen.forsteLag !== null) || (aapen.fase === 'andre' && aapen.andreLag !== null)
  const aktuelleLag = aktuelle(aapen, lag.length)

  // Poengene hvert lag har fått eller mistet på dette spørsmålet.
  const ruteposter = lag
    .map((l, n) => ({ l, n, poeng: aapen.svar.reduce((s, x) => (x.lag === n ? s + x.poeng : s), 0) - aapen.hint.filter((h) => h === n).length * hintPris }))
    .filter((r) => aapen.svar.some((x) => x.lag === r.n) || aapen.hint.includes(r.n))

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
    const maksInnsats = maksInnsatsFor(lagValgt)
    const sett = (v: number) => setAapen({ ...aapen, innsats: Math.min(maksInnsats, Math.max(inn.poengskala, Math.round(v) || inn.poengskala)) })
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
                onClick={() => setAapen({ ...aapen, dobbelLag: n, innsats: Math.min(aapen.innsats, maksInnsatsFor(n)) })}
              >
                {l.navn} <span className="dempet">({poengsum(spill)[n]})</span>
              </button>
            ))}
          </div>
          {lagValgt !== null && (
            <label className="innsats">
              <span>
                Innsats ({inn.poengskala}–{maksInnsats})
              </span>
              <input type="range" min={inn.poengskala} max={maksInnsats} step={inn.poengskala === 1 ? 1 : 50} value={aapen.innsats} onChange={(e) => sett(+e.target.value)} />
              <input type="number" className="innsats-tall" min={inn.poengskala} max={maksInnsats} value={aapen.innsats} onChange={(e) => sett(+e.target.value)} aria-label="Innsats" />
            </label>
          )}
          {lagValgt !== null && (
            <p className="dempet">
              Riktig svar gir +{aapen.innsats}. Feil svar gir −{aapen.innsats}.
            </p>
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

  const kanSlippes = iTur && !aapen.stengt && inn.stjele !== 'av' && !aapen.dobbel && lag.length > 1

  // Overskrift over lagene
  let melding: string
  if (iTur && aapen.fase === 'forste') melding = `${lag[aapen.forsteLag as number].navn} svarer`
  else if (iTur) melding = `Turen går til ${lag[aapen.andreLag as number].navn}`
  else if (aapen.forsteLag === null && feil.length === 0) melding = 'Laget som rekker opp hånda først, får svare'
  else if (aapen.andreLag !== null) melding = 'Nå kan alle lag svare. Rekk opp hånda!'
  else melding = 'De andre lagene kan svare. Rekk opp hånda!'

  const forsteSvar = aapen.fase === 'forste' || (aapen.forsteLag === null && feil.length === 0)
  const visTidtaker = !ferdig && (forsteSvar ? inn.tidtaker : inn.stjeleSekunder > 0)
  const sekunder = forsteSvar ? inn.sekunder : inn.stjeleSekunder
  const visLag = riktig === null && aktuelleLag.length > 0

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

        {visTidtaker && <Tidtaker key={`${aapen.fase}-${feil.length}`} sekunder={sekunder} lyd={inn.lyd} onUte={iTur ? onTurTidUte : onApenTidUte} />}

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

        {visLag && (
          <div className="svar-lag">
            <p className="svar-melding">
              {melding}
              {aapen.fase !== 'forste' && aapen.forsteLag !== null && verdi !== aapen.verdi && <span className="dempet"> ({verdi} poeng)</span>}
            </p>
            {aktuelleLag.map((n) => (
              <div key={n} className="svar-rad" style={{ '--lagfarge': lag[n].farge } as React.CSSProperties}>
                <span className="svar-lagnavn">{lag[n].navn}</span>
                <span className="knapperad">
                  {kanHint && (
                    <button className="knapp knapp-hint" onClick={() => onHint(n)} aria-label={`${lag[n].navn} kjøper hint for ${hintPris} poeng`}>
                      Hint −{hintPris}
                    </button>
                  )}
                  <button className="knapp knapp-feil" onClick={() => onSvar(n, false)}>
                    Feil
                  </button>
                  <button className="knapp knapp-riktig" onClick={() => onSvar(n, true)}>
                    Riktig
                  </button>
                </span>
              </div>
            ))}
            {kanSlippes && (
              <button className="lenkeknapp slipp" onClick={onSlippTilAndre}>
                {aapen.fase === 'forste' ? (aapen.tidUte ? 'Tiden er ute. Gi spørsmålet til et tilfeldig lag' : 'Gi spørsmålet til et tilfeldig lag') : aapen.tidUte ? 'Tiden er ute. La alle lag svare' : 'La alle lag svare'}
              </button>
            )}
          </div>
        )}

        {riktig !== null && (
          <p className="riktig-melding" style={{ '--lagfarge': lag[riktig].farge } as React.CSSProperties}>
            {lag[riktig].navn} fikk {aapen.svar.find((s) => s.riktig)?.poeng} poeng
          </p>
        )}

        {ruteposter.length > 0 && (
          <div className="rute-poeng" aria-live="polite">
            <span className="dempet">Poeng på dette spørsmålet:</span>
            {ruteposter.map((r) => (
              <span key={r.n} className="rute-poeng-lag" style={{ '--lagfarge': r.l.farge } as React.CSSProperties}>
                {r.l.navn} {r.poeng > 0 ? `+${r.poeng}` : r.poeng < 0 ? `−${-r.poeng}` : '0'}
              </span>
            ))}
          </div>
        )}

        <div className="knapperad slutt">
          {aapen.forrige && (
            <button className="knapp" onClick={onAngre}>
              Angre siste
            </button>
          )}
          <button ref={hovedknapp} className={ferdig ? 'knapp knapp-hoved knapp-stor' : 'knapp'} onClick={onLukk}>
            {ferdig ? 'Tilbake til brettet' : 'Ingen svarte – lukk'}
          </button>
        </div>
      </div>
    </div>
  )
}
