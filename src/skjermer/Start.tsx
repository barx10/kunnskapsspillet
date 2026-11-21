type Props = { harSpill: boolean; onNytt: () => void; onMine: () => void; onFortsett: () => void }

const POENG = [100, 200, 300, 400, 500]

export function Start({ harSpill, onNytt, onMine, onFortsett }: Props) {
  return (
    <main className="start">
      <div className="start-innhold">
        <div className="start-ruter" aria-hidden="true">
          {POENG.map((p, i) => (
            <span key={p} className="start-rute" style={{ animationDelay: `${i * 90}ms` }}>
              {p}
            </span>
          ))}
        </div>
        <h1 className="start-tittel">Kunnskapsspillet</h1>
        <p className="start-ingress">Velg fag, tema og kompetansemål. Lag et brett, del klassen i lag, og spill på storskjermen.</p>
        <div className="knapperad">
          {harSpill && (
            <button className="knapp knapp-hoved" onClick={onFortsett}>
              Fortsett spillet
            </button>
          )}
          <button className={harSpill ? 'knapp' : 'knapp knapp-hoved'} onClick={onNytt}>
            Nytt spill
          </button>
          <button className="knapp" onClick={onMine}>
            Mine brett
          </button>
        </div>
      </div>
    </main>
  )
}
