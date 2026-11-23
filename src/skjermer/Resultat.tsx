import type { Spilltilstand } from '../types'
import { poengsum } from '../poeng'

type Props = { spill: Spilltilstand; onIgjen: () => void; onStart: () => void }

export function Resultat({ spill, onIgjen, onStart }: Props) {
  const sum = poengsum(spill)
  const sortert = spill.lag.map((l, n) => ({ ...l, poeng: sum[n] })).sort((a, b) => b.poeng - a.poeng)
  const topp = sortert[0].poeng
  const vinnere = sortert.filter((l) => l.poeng === topp)
  const hoyeste = Math.max(1, ...sortert.map((l) => Math.abs(l.poeng)))

  return (
    <main className="spill resultat">
      <h1 className="resultat-tittel">{vinnere.length > 1 ? `Uavgjort mellom ${vinnere.map((v) => v.navn).join(' og ')}` : `${vinnere[0].navn} vant`}</h1>
      <ol className="resultat-liste">
        {sortert.map((l) => (
          <li key={l.navn} style={{ '--lagfarge': l.farge, '--andel': Math.max(0, l.poeng) / hoyeste } as React.CSSProperties}>
            <span className="resultat-navn">{l.navn}</span>
            <span className="resultat-stolpe" aria-hidden="true" />
            <span className="resultat-poeng">{l.poeng}</span>
          </li>
        ))}
      </ol>
      {spill.brett.maal.length > 0 && (
        <details className="resultat-maal">
          <summary>Kompetansemål dette spillet dekket ({spill.brett.maal.length})</summary>
          <ul>
            {spill.brett.maal.map((m) => (
              <li key={m.kode}>{m.tekst}</li>
            ))}
          </ul>
        </details>
      )}
      <div className="knapperad">
        <button className="knapp" onClick={onStart}>
          Til start
        </button>
        <button className="knapp knapp-hoved" onClick={onIgjen}>
          Spill brettet igjen
        </button>
      </div>
    </main>
  )
}
