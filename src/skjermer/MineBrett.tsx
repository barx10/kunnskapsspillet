import { useRef, useState } from 'react'
import type { Brett } from '../types'
import { eksporter, importer, nyId } from '../lagring'
import { Topplinje } from '../komponenter/Topplinje'
import { antallSporsmal } from './Oppsett'

type Props = {
  brett: Brett[]
  setBrett: (f: (b: Brett[]) => Brett[]) => void
  onTilbake: () => void
  onNytt: () => void
  onRediger: (b: Brett) => void
  onSpill: (b: Brett) => void
}

export function MineBrett({ brett, setBrett, onTilbake, onNytt, onRediger, onSpill }: Props) {
  const fil = useRef<HTMLInputElement>(null)
  const [melding, setMelding] = useState<{ type: 'ok' | 'feil'; tekst: string } | null>(null)
  const [sletter, setSletter] = useState<string | null>(null)

  const lesFil = async (f: File) => {
    try {
      if (f.size > 500_000) throw new Error('Filen er for stor. Et brett er vanligvis under 50 kB.')
      const b = importer(await f.text())
      setBrett((liste) => [b, ...liste])
      setMelding({ type: 'ok', tekst: `Åpnet «${b.tittel}». Det ligger nå øverst i listen.` })
    } catch (e) {
      setMelding({ type: 'feil', tekst: e instanceof Error ? e.message : 'Kunne ikke lese filen.' })
    }
  }

  return (
    <main className="side">
      <Topplinje tittel="Mine brett" onTilbake={onTilbake} tilbakeTekst="Til start">
        <button className="knapp" onClick={() => fil.current?.click()}>
          Åpne brett fra fil
        </button>
        <button className="knapp knapp-hoved" onClick={onNytt}>
          Lag nytt brett
        </button>
      </Topplinje>
      <input ref={fil} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && lesFil(e.target.files[0]).finally(() => (e.target.value = ''))} />
      {melding && <p className={`melding melding-${melding.type}`} role="status">{melding.tekst}</p>}

      <section className="panel">
        {brett.length === 0 && <p className="dempet">Du har ingen brett. Lag et nytt, eller åpne en brettfil du har fått av en kollega.</p>}
        <ul className="brettliste">
          {brett.map((b) => {
            const n = antallSporsmal(b)
            return (
              <li key={b.id} className="brettkort">
                <div>
                  <strong>{b.tittel}</strong>
                  <span className="dempet">
                    {[b.fag, b.trinn].filter(Boolean).join(', ') || 'Uten fag'} – {n} spørsmål, {b.maal.length} kompetansemål
                  </span>
                </div>
                {sletter === b.id ? (
                  <div className="knapperad">
                    <span>Slette «{b.tittel}»?</span>
                    <button className="knapp" onClick={() => setSletter(null)}>
                      Behold
                    </button>
                    <button className="knapp knapp-fare" onClick={() => setBrett((l) => l.filter((x) => x.id !== b.id))}>
                      Slett
                    </button>
                  </div>
                ) : (
                  <div className="knapperad">
                    <button className="lenkeknapp" onClick={() => setSletter(b.id)}>
                      Slett
                    </button>
                    <button className="lenkeknapp" onClick={() => setBrett((l) => [{ ...b, id: nyId(), tittel: `${b.tittel} (kopi)` }, ...l])}>
                      Kopier
                    </button>
                    <button className="lenkeknapp" onClick={() => eksporter(b)}>
                      Lagre som fil
                    </button>
                    <button className="knapp" onClick={() => onRediger(b)}>
                      Rediger
                    </button>
                    <button className="knapp knapp-hoved" disabled={n === 0} onClick={() => onSpill(b)}>
                      Spill
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <p className="kilde">Brettene lagres bare i denne nettleseren. Bruk «Lagre som fil» for å ta vare på et brett eller dele det med kolleger.</p>
    </main>
  )
}
