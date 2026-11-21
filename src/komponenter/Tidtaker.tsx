import { useEffect, useState } from 'react'
import { lyd } from '../lyd'

export function Tidtaker({ sekunder, lyd: lydPaa, onUte, etikett }: { sekunder: number; lyd: boolean; onUte?: () => void; etikett?: string }) {
  const [igjen, setIgjen] = useState(sekunder)
  const [pause, setPause] = useState(false)

  useEffect(() => {
    if (pause || igjen <= 0) return
    const t = setTimeout(() => {
      const neste = igjen - 1
      setIgjen(neste)
      if (lydPaa && neste > 0 && neste <= 5) lyd.tikk()
      if (lydPaa && neste === 0) lyd.slutt()
      if (neste === 0) onUte?.()
    }, 1000)
    return () => clearTimeout(t)
  }, [igjen, pause, lydPaa, onUte])

  const andel = igjen / sekunder
  return (
    <div className={igjen === 0 ? 'tidtaker ute' : igjen <= 5 ? 'tidtaker snart' : 'tidtaker'}>
      {etikett && <span className="tidtaker-etikett">{etikett}</span>}
      <div className="tidtaker-spor" role="progressbar" aria-valuemin={0} aria-valuemax={sekunder} aria-valuenow={igjen} aria-label="Tid igjen">
        <div className="tidtaker-fyll" style={{ transform: `scaleX(${andel})` }} />
      </div>
      <span className="tidtaker-tall" aria-live={igjen <= 5 ? 'assertive' : 'off'}>
        {igjen === 0 ? 'Tiden er ute' : `${igjen} s`}
      </span>
      {igjen > 0 ? (
        <button className="lenkeknapp" onClick={() => setPause(!pause)}>
          {pause ? 'Fortsett' : 'Pause'}
        </button>
      ) : (
        <button className="lenkeknapp" onClick={() => setIgjen(sekunder)}>
          Start på nytt
        </button>
      )}
    </div>
  )
}
