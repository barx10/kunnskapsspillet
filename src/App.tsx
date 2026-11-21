import { useEffect, useState } from 'react'
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

type Skjerm =
  | { navn: 'start' }
  | { navn: 'oppsett' }
  | { navn: 'mine' }
  | { navn: 'rediger'; brett: Brett; tilbake: 'oppsett' | 'mine' }
  | { navn: 'spilloppsett'; brett: Brett; tilbake: 'oppsett' | 'mine' }
  | { navn: 'spill' }
  | { navn: 'ki' }

const tomtValg: Valg = { fag: '', trinn: '', tema: '', maal: [] }

export default function App() {
  const [skjerm, setSkjerm] = useState<Skjerm>({ navn: 'start' })
  const [brett, setBrett] = useState<Brett[]>(hentBrett)
  const [innstillinger, setInnstillinger] = useState<Innstillinger>(hentInnstillinger)
  const [spill, setSpill] = useState<Spilltilstand | null>(hentSpill)
  const [valg, setValg] = useState<Valg>(tomtValg)

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
    setSpill({ brett: b, innstillinger: i, lag, brukt: [], dobbel: velgDobbel(b, i), fase: 'brett' })
    setSkjerm({ navn: 'spill' })
  }

  switch (skjerm.navn) {
    case 'start':
      return (
        <Start
          harSpill={!!spill && spill.fase !== 'slutt'}
          onNytt={() => setSkjerm({ navn: 'oppsett' })}
          onMine={() => setSkjerm({ navn: 'mine' })}
          onFortsett={() => setSkjerm({ navn: 'spill' })}
          onKi={() => setSkjerm({ navn: 'ki' })}
        />
      )
    case 'ki':
      return <KiInnstillinger onTilbake={() => setSkjerm({ navn: 'start' })} />
    case 'oppsett':
      return (
        <Oppsett
          valg={valg}
          setValg={setValg}
          brett={brett}
          onTilbake={() => setSkjerm({ navn: 'start' })}
          onNyttBrett={() => setSkjerm({ navn: 'rediger', brett: tomtBrett(valg.fag, valg.trinn, valg.tema, valg.maal), tilbake: 'oppsett' })}
          onRediger={(b) => setSkjerm({ navn: 'rediger', brett: b, tilbake: 'oppsett' })}
          onVelg={(b) => setSkjerm({ navn: 'spilloppsett', brett: b, tilbake: 'oppsett' })}
        />
      )
    case 'mine':
      return (
        <MineBrett
          brett={brett}
          setBrett={setBrett}
          onTilbake={() => setSkjerm({ navn: 'start' })}
          onNytt={() => setSkjerm({ navn: 'rediger', brett: tomtBrett(), tilbake: 'mine' })}
          onRediger={(b) => setSkjerm({ navn: 'rediger', brett: b, tilbake: 'mine' })}
          onSpill={(b) => setSkjerm({ navn: 'spilloppsett', brett: b, tilbake: 'mine' })}
        />
      )
    case 'rediger':
      return (
        <Redigering
          start={skjerm.brett}
          onAvbryt={() => setSkjerm({ navn: skjerm.tilbake })}
          onLagre={(b) => {
            lagre(b)
            setSkjerm({ navn: skjerm.tilbake })
          }}
        />
      )
    case 'spilloppsett':
      return (
        <SpillOppsett
          brett={skjerm.brett}
          innstillinger={innstillinger}
          setInnstillinger={setInnstillinger}
          onTilbake={() => setSkjerm({ navn: skjerm.tilbake })}
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
              setSkjerm({ navn: 'start' })
            }}
          />
        )
      return <Spill spill={spill} setSpill={setSpill} onPause={() => setSkjerm({ navn: 'start' })} />
  }
}

function velgDobbel(b: Brett, i: Innstillinger): string[] {
  if (!i.dobbel) return []
  const kandidater: string[] = []
  b.kategorier.forEach((k, ki) =>
    k.sporsmal.forEach((s, ri) => {
      if (s.sporsmal.trim() && ri >= Math.floor(k.sporsmal.length / 2)) kandidater.push(`${ki}-${ri}`)
    }),
  )
  const antall = kandidater.length >= 20 ? 2 : 1
  return kandidater.sort(() => Math.random() - 0.5).slice(0, antall)
}
