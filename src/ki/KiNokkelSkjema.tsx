import { useState } from 'react'
import { CLAUDE_MODELLER, LEVERANDORER, hentKiOppsett, lagreKiOppsett, maskert, slettKiOppsett, type KiOppsett, type Leverandor } from './oppsett'
import { KiFeil, geminiModeller, testClaude } from './generer'

type Props = { onLagret?: (o: KiOppsett) => void; onSlettet?: () => void; onAvbryt?: () => void }

export function KiNokkelSkjema({ onLagret, onSlettet, onAvbryt }: Props) {
  const [lagret, setLagret] = useState(hentKiOppsett)
  const [redigerer, setRedigerer] = useState(!lagret)
  const [leverandor, setLeverandor] = useState<Leverandor>(lagret?.leverandor ?? 'gemini')
  const [nokkel, setNokkel] = useState('')
  const [husk, setHusk] = useState(lagret?.husk ?? false)
  const [modell, setModell] = useState(lagret?.modell ?? '')
  const [geminiListe, setGeminiListe] = useState<{ id: string; navn: string }[]>([])
  const [status, setStatus] = useState<{ type: 'jobber' | 'feil'; tekst: string } | null>(null)
  const info = LEVERANDORER[leverandor]

  const lagre = async () => {
    const n = nokkel.trim()
    if (!n) return setStatus({ type: 'feil', tekst: 'Lim inn nøkkelen først.' })
    setStatus({ type: 'jobber', tekst: 'Sjekker nøkkelen …' })
    try {
      let valgtModell = modell
      if (leverandor === 'gemini') {
        const liste = await geminiModeller(n)
        if (!liste.length) throw new KiFeil('Nøkkelen virker, men har ikke tilgang til noen Gemini-modeller.')
        setGeminiListe(liste)
        if (!liste.some((m) => m.id === valgtModell)) valgtModell = liste[0].id
      } else {
        await testClaude(n)
        if (!CLAUDE_MODELLER.some((m) => m.id === valgtModell)) valgtModell = CLAUDE_MODELLER[0].id
      }
      const o = { leverandor, nokkel: n, modell: valgtModell, husk }
      lagreKiOppsett(o)
      setLagret(o)
      setModell(valgtModell)
      setNokkel('')
      setRedigerer(false)
      setStatus(null)
      onLagret?.(o)
    } catch (e) {
      setStatus({ type: 'feil', tekst: e instanceof Error ? e.message : 'Noe gikk galt.' })
    }
  }

  const byttModell = async (id: string) => {
    if (!lagret) return
    const o = { ...lagret, modell: id }
    lagreKiOppsett(o)
    setLagret(o)
    setModell(id)
  }

  if (lagret && !redigerer) {
    const modeller = lagret.leverandor === 'claude' ? CLAUDE_MODELLER : geminiListe.length ? geminiListe : [{ id: lagret.modell, navn: lagret.modell }]
    return (
      <div className="ki-skjema">
        <p>
          <strong>{LEVERANDORER[lagret.leverandor].navn}</strong> er koblet til med nøkkelen <code>{maskert(lagret.nokkel)}</code>.{' '}
          {lagret.husk ? 'Den er lagret på denne maskinen.' : 'Den glemmes når nettleseren lukkes.'}
        </p>
        <label className="felt">
          <span>Modell</span>
          <select
            value={lagret.modell}
            onFocus={() => lagret.leverandor === 'gemini' && !geminiListe.length && geminiModeller(lagret.nokkel).then(setGeminiListe).catch(() => {})}
            onChange={(e) => byttModell(e.target.value)}
          >
            {modeller.map((m) => (
              <option key={m.id} value={m.id}>
                {m.navn}
              </option>
            ))}
          </select>
        </label>
        <div className="knapperad slutt">
          <button
            className="knapp"
            onClick={() => {
              slettKiOppsett()
              setLagret(null)
              setRedigerer(true)
              onSlettet?.()
            }}
          >
            Slett nøkkelen
          </button>
          <button className="knapp" onClick={() => setRedigerer(true)}>
            Bytt nøkkel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ki-skjema">
      <div className="segment" role="group" aria-label="Leverandør">
        {(Object.keys(LEVERANDORER) as Leverandor[]).map((l) => (
          <button key={l} className={leverandor === l ? 'valgt' : ''} aria-pressed={leverandor === l} onClick={() => (setLeverandor(l), setModell(''), setStatus(null))}>
            {LEVERANDORER[l].navn}
          </button>
        ))}
      </div>
      <p className="dempet liten">
        {leverandor === 'gemini'
          ? 'Gemini har en gratisvariant med begrenset bruk. Logg inn med en Google-konto og lag en nøkkel.'
          : 'Claude krever en konto med kreditt hos Anthropic.'}{' '}
        <a href={info.nokkelside} target="_blank" rel="noopener noreferrer">
          Lag en nøkkel hos {info.navn}
        </a>
        .
      </p>
      <label className="felt">
        <span>API-nøkkel</span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={nokkel}
          placeholder={`${info.prefiks}…`}
          onChange={(e) => setNokkel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lagre()}
        />
      </label>
      {leverandor === 'claude' && (
        <label className="felt">
          <span>Modell</span>
          <select value={modell || CLAUDE_MODELLER[0].id} onChange={(e) => setModell(e.target.value)}>
            {CLAUDE_MODELLER.map((m) => (
              <option key={m.id} value={m.id}>
                {m.navn}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="avkryssing">
        <input type="checkbox" checked={husk} onChange={(e) => setHusk(e.target.checked)} />
        <span>Husk nøkkelen på denne maskinen. Ikke velg dette på delte maskiner.</span>
      </label>
      <p className="dempet liten">
        Nøkkelen lagres bare i denne nettleseren og sendes direkte til {info.navn}, aldri til oss. Sett gjerne et utgiftstak hos leverandøren.
      </p>
      {status && (
        <p className={status.type === 'feil' ? 'melding melding-feil' : 'melding'} role="status">
          {status.tekst}
        </p>
      )}
      <div className="knapperad slutt">
        {(lagret || onAvbryt) && (
          <button className="knapp" onClick={() => (lagret ? (setRedigerer(false), setStatus(null)) : onAvbryt?.())}>
            Avbryt
          </button>
        )}
        <button className="knapp knapp-hoved" disabled={status?.type === 'jobber'} onClick={lagre}>
          Lagre nøkkelen
        </button>
      </div>
    </div>
  )
}
