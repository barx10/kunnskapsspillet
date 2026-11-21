import { useState } from 'react'
import type { Spilltilstand } from '../types'
import { Tidtaker } from '../komponenter/Tidtaker'
import { lyd } from '../lyd'

type Props = { spill: Spilltilstand; setSpill: (s: Spilltilstand) => void }

export function Finale({ spill, setSpill }: Props) {
  const { brett, lag, innstillinger: inn } = spill
  const [steg, setSteg] = useState<'innsats' | 'sporsmal' | 'svar'>('innsats')
  const [innsats, setInnsats] = useState(lag.map(() => 0))
  const [resultat, setResultat] = useState<(boolean | null)[]>(lag.map(() => null))
  const maks = (n: number) => Math.max(0, lag[n].poeng)
  const alleVurdert = resultat.every((r) => r !== null)

  const ferdig = () =>
    setSpill({
      ...spill,
      fase: 'slutt',
      lag: lag.map((l, n) => ({ ...l, poeng: l.poeng + (resultat[n] ? innsats[n] : -innsats[n]) })),
    })

  return (
    <div className="spill finale">
      <div className="sporsmal-boks finale-boks">
        <p className="sporsmal-meta">Finalerunde – {brett.finale.kategori || 'uten kategori'}</p>

        {steg === 'innsats' && (
          <>
            <p className="sporsmal-tekst liten-tekst">Hvert lag skriver ned hvor mye de satser. Lag med 0 eller færre poeng kan ikke satse.</p>
            <div className="svar-lag">
              {lag.map((l, n) => (
                <label key={n} className="svar-rad" style={{ '--lagfarge': l.farge } as React.CSSProperties}>
                  <span className="svar-lagnavn">
                    {l.navn} <span className="dempet">({l.poeng})</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={maks(n)}
                    value={innsats[n]}
                    disabled={maks(n) === 0}
                    aria-label={`Innsats for ${l.navn}`}
                    onChange={(e) => setInnsats(innsats.map((v, k) => (k === n ? Math.min(maks(n), Math.max(0, +e.target.value || 0)) : v)))}
                  />
                </label>
              ))}
            </div>
            <div className="knapperad slutt">
              <button className="knapp knapp-hoved knapp-stor" onClick={() => setSteg('sporsmal')}>
                Vis finalespørsmålet
              </button>
            </div>
          </>
        )}

        {steg !== 'innsats' && <p className="sporsmal-tekst">{brett.finale.sporsmal}</p>}

        {steg === 'sporsmal' && (
          <>
            <Tidtaker sekunder={Math.max(inn.sekunder, 30)} lyd={inn.lyd} />
            <div className="knapperad slutt">
              <button className="knapp knapp-hoved knapp-stor" onClick={() => setSteg('svar')}>
                Vis svaret
              </button>
            </div>
          </>
        )}

        {steg === 'svar' && (
          <>
            <div className="svar synlig">
              <span className="svar-etikett">Svar</span>
              <p className="svar-tekst">{brett.finale.svar}</p>
            </div>
            <div className="svar-lag">
              {lag.map((l, n) => (
                <div key={n} className="svar-rad" style={{ '--lagfarge': l.farge } as React.CSSProperties}>
                  <span className="svar-lagnavn">
                    {l.navn} <span className="dempet">satset {innsats[n]}</span>
                  </span>
                  <span className="knapperad">
                    <button
                      className={resultat[n] === false ? 'knapp knapp-feil valgt' : 'knapp knapp-feil'}
                      aria-pressed={resultat[n] === false}
                      onClick={() => {
                        if (inn.lyd) lyd.feil()
                        setResultat(resultat.map((r, k) => (k === n ? false : r)))
                      }}
                    >
                      Feil
                    </button>
                    <button
                      className={resultat[n] === true ? 'knapp knapp-riktig valgt' : 'knapp knapp-riktig'}
                      aria-pressed={resultat[n] === true}
                      onClick={() => {
                        if (inn.lyd) lyd.riktig()
                        setResultat(resultat.map((r, k) => (k === n ? true : r)))
                      }}
                    >
                      Riktig
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <div className="knapperad slutt">
              <button className="knapp knapp-hoved knapp-stor" disabled={!alleVurdert} onClick={ferdig}>
                Se resultatet
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
