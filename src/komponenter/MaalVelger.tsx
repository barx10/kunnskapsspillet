import type { Kompetansemaal } from '../types'
import { finnTrinn } from '../laereplan'

type Props = { fag: string; trinn: string; valgte: Kompetansemaal[]; onEndre: (m: Kompetansemaal[]) => void }

export function MaalVelger({ fag, trinn, valgte, onEndre }: Props) {
  const sett = finnTrinn(fag, trinn)
  if (!sett) return <p className="dempet">Velg et fag og trinn fra listen for å se kompetansemålene.</p>
  const valgt = new Set(valgte.map((m) => m.kode))
  const veksle = (m: Kompetansemaal) => onEndre(valgt.has(m.kode) ? valgte.filter((v) => v.kode !== m.kode) : [...valgte, m])
  return (
    <div className="maal-liste">
      <div className="maal-topp">
        <span className="dempet">
          {valgte.length} av {sett.maal.length} valgt
        </span>
        {valgte.length > 0 && (
          <button className="lenkeknapp" onClick={() => onEndre([])}>
            Fjern alle
          </button>
        )}
      </div>
      {sett.maal.map((m) => (
        <label key={m.kode} className={valgt.has(m.kode) ? 'maal valgt' : 'maal'}>
          <input type="checkbox" checked={valgt.has(m.kode)} onChange={() => veksle(m)} />
          <span>{m.tekst}</span>
        </label>
      ))}
    </div>
  )
}
