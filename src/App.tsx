import { useEffect, useRef, useState } from 'react'
import type { Brett, Innstillinger, Lag, Spilltilstand, Valg } from './types'
import { hentBrett, hentInnstillinger, hentSpill, lagreBrett, lagreInnstillinger, lagreSpill, tomtBrett } from './lagring'
import { Start } from './skjermer/Start'
import { Oppsett } from './skjermer/Oppsett'
import { Redigering } from './skjermer/Redigering'
import { MineBrett } from './skjermer/MineBrett'
import { SpillOppsett } from './skjermer/SpillOppsett'
import { Spill } from './skjermer/Spill'
import { Resultat } from './skjermer/Resultat'
import { KiInnstillinger } from './skjermer/KiInnstillinger'
import { Bunntekst } from './komponenter/Bunntekst'
import { Om } from './komponenter/Om'
import { Hvordan } from './komponenter/Hvordan'

type Skjerm =
  | { navn: 'start' }
  | { navn: 'oppsett'; steg: number }
  | { navn: 'mine' }
  | { navn: 'rediger'; brett: Brett; tilbake: 'oppsett' | 'mine' }
  | { navn: 'spilloppsett'; brett: Brett; tilbake: 'oppsett' | 'mine' }
  | { navn: 'spill' }
  | { navn: 'ki' }

const tomtValg: Valg = { fag: '', trinn: '', alder: '', tema: '', maal: [] }
const START: Skjerm = { navn: 'start' }
const ULAGRET = 'Du har endringer som ikke er lagret. Vil du forlate redigeringen uten å lagre?'

export default function App() {
  const [modal, setModal] = useState<'om' | 'hvordan' | null>(null)
  const [skjerm, setSkjerm] = useState<Skjerm>(START)
  // Skjermene ligger i en stabel som speiler nettleserhistorikken, så tilbakeknappen
  // i nettleseren går til forrige skjerm i appen i stedet for å forlate siden.
  const stabel = useRef<Skjerm[]>([START])
  const dybde = useRef(0)
  const ulagret = useRef(false)
  const [brett, setBrett] = useState<Brett[]>(hentBrett)
  const [innstillinger, setInnstillinger] = useState<Innstillinger>(hentInnstillinger)
  const [spill, setSpill] = useState<Spilltilstand | null>(hentSpill)
  const [valg, setValg] = useState<Valg>(tomtValg)

  useEffect(() => {
    history.replaceState({ ks: 0 }, '')
    const tilbake = (e: PopStateEvent) => {
      const d = typeof e.state?.ks === 'number' ? e.state.ks : 0
      if (d === dybde.current) return // samme skjerm, f.eks. et spørsmål som lukkes
      if (ulagret.current && !confirm(ULAGRET)) {
        history.pushState({ ks: dybde.current }, '')
        return
      }
      ulagret.current = false
      dybde.current = d
      setModal(null)
      setSkjerm(stabel.current[d] ?? START)
    }
    const lukkFane = (e: BeforeUnloadEvent) => {
      if (ulagret.current) e.preventDefault()
    }
    window.addEventListener('popstate', tilbake)
    window.addEventListener('beforeunload', lukkFane)
    return () => {
      window.removeEventListener('popstate', tilbake)
      window.removeEventListener('beforeunload', lukkFane)
    }
  }, [])

  /** Gå til en ny skjerm (legges i historikken). */
  const gaTil = (ny: Skjerm) => {
    ulagret.current = false
    const d = dybde.current + 1
    stabel.current = [...stabel.current.slice(0, d), ny]
    dybde.current = d
    history.pushState({ ks: d }, '')
    setModal(null)
    setSkjerm(ny)
  }

  /** Tilbake til en skjerm: bruker nettleserhistorikken når forrige skjerm er den samme. */
  const tilbakeTil = (mal: Skjerm) => {
    const forrige = stabel.current[dybde.current - 1]
    if (forrige && forrige.navn === mal.navn && JSON.stringify(forrige) === JSON.stringify(mal)) {
      ulagret.current = false
      history.back()
    } else gaTil(mal)
  }

  useEffect(() => lagreBrett(brett), [brett])
  useEffect(() => lagreInnstillinger(innstillinger), [innstillinger])
  useEffect(() => lagreSpill(spill), [spill])

  const tema = skjerm.navn === 'spill' && spill ? spill.innstillinger : innstillinger
  useEffect(() => {
    document.documentElement.dataset.tema = tema.tema
    document.documentElement.dataset.tekst = tema.storTekst ? 'stor' : 'normal'
  }, [tema.tema, tema.storTekst])

  const lagre = (b: Brett) => {
    const oppdatert = { ...b, endret: new Date().toISOString() }
    setBrett((liste) => (liste.some((x) => x.id === b.id) ? liste.map((x) => (x.id === b.id ? oppdatert : x)) : [oppdatert, ...liste]))
    return oppdatert
  }

  const startSpill = (b: Brett, i: Innstillinger, lag: Lag[]) => {
    setInnstillinger(i)
    setSpill({ brett: b, innstillinger: i, lag, brukt: [], dobbel: velgDobbel(b, i), fase: 'brett', tur: 0, startet: Date.now() })
    gaTil({ navn: 'spill' })
  }

  return (
    <>
      {innhold()}
      <Bunntekst onHvordan={() => setModal('hvordan')} onOm={() => setModal('om')} onKi={() => skjerm.navn !== 'ki' && (!ulagret.current || confirm(ULAGRET)) && gaTil({ navn: 'ki' })} />
      {modal === 'om' && <Om onLukk={() => setModal(null)} />}
      {modal === 'hvordan' && <Hvordan onLukk={() => setModal(null)} />}
    </>
  )

  function innhold() {
  switch (skjerm.navn) {
    case 'start':
      return (
        <Start
          harSpill={!!spill && spill.fase !== 'slutt'}
          onNytt={() => gaTil({ navn: 'oppsett', steg: valg.fag ? 2 : 0 })}
          onMine={() => gaTil({ navn: 'mine' })}
          onFortsett={() => gaTil({ navn: 'spill' })}
        />
      )
    case 'ki':
      return <KiInnstillinger onTilbake={() => tilbakeTil(START)} />
    case 'oppsett':
      return (
        <Oppsett
          valg={valg}
          setValg={setValg}
          brett={brett}
          steg={skjerm.steg}
          onSteg={(steg) => (steg < skjerm.steg ? tilbakeTil({ navn: 'oppsett', steg }) : gaTil({ navn: 'oppsett', steg }))}
          onTilbake={() => tilbakeTil(START)}
          onNyttBrett={() => gaTil({ navn: 'rediger', brett: tomtBrett(valg.fag, valg.trinn, valg.tema, valg.maal, 5, 5, valg.alder), tilbake: 'oppsett' })}
          onRediger={(b) => gaTil({ navn: 'rediger', brett: b, tilbake: 'oppsett' })}
          onVelg={(b) => gaTil({ navn: 'spilloppsett', brett: b, tilbake: 'oppsett' })}
        />
      )
    case 'mine':
      return (
        <MineBrett
          brett={brett}
          setBrett={setBrett}
          onTilbake={() => tilbakeTil(START)}
          onNytt={() => gaTil({ navn: 'rediger', brett: tomtBrett(), tilbake: 'mine' })}
          onRediger={(b) => gaTil({ navn: 'rediger', brett: b, tilbake: 'mine' })}
          onSpill={(b) => gaTil({ navn: 'spilloppsett', brett: b, tilbake: 'mine' })}
        />
      )
    case 'rediger':
      return (
        <Redigering
          start={skjerm.brett}
          onEndret={(e) => {
            ulagret.current = e
          }}
          onAvbryt={() => {
            if (ulagret.current && !confirm(ULAGRET)) return
            ulagret.current = false
            history.back()
          }}
          onLagre={(b) => {
            const lagret = lagre(b)
            ulagret.current = false
            // Oppdater brettet i skjermen vi går tilbake til, så «Spill» bruker den lagrede versjonen.
            stabel.current = stabel.current.map((s) => ('brett' in s && s.brett.id === lagret.id ? { ...s, brett: lagret } : s))
            history.back()
          }}
        />
      )
    case 'spilloppsett':
      return (
        <SpillOppsett
          brett={skjerm.brett}
          innstillinger={innstillinger}
          setInnstillinger={setInnstillinger}
          onTilbake={() => history.back()}
          onStart={(i, lag) => startSpill(skjerm.brett, i, lag)}
        />
      )
    case 'spill':
      if (!spill) return null
      if (spill.fase === 'slutt')
        return (
          <Resultat
            spill={spill}
            onIgjen={() => startSpill(spill.brett, spill.innstillinger, spill.lag.map((l) => ({ ...l, poeng: 0 })))}
            onStart={() => {
              setSpill(null)
              tilbakeTil(START)
            }}
          />
        )
      return <Spill spill={spill} setSpill={setSpill} onPause={() => tilbakeTil(START)} />
  }
  }
}

function velgDobbel(b: Brett, i: Innstillinger): string[] {
  if (i.antallDobbel < 1) return []
  const kandidater: string[] = []
  b.kategorier.forEach((k, ki) =>
    k.sporsmal.forEach((s, ri) => {
      if (s.sporsmal.trim() && ri >= Math.floor(k.sporsmal.length / 2)) kandidater.push(`${ki}-${ri}`)
    }),
  )
  return kandidater.sort(() => Math.random() - 0.5).slice(0, i.antallDobbel)
}
