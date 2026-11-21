type Props = { tittel: string; onTilbake: () => void; tilbakeTekst?: string; children?: React.ReactNode }

export function Topplinje({ tittel, onTilbake, tilbakeTekst = 'Tilbake', children }: Props) {
  return (
    <header className="topplinje">
      <button className="lenkeknapp" onClick={onTilbake}>
        ‹ {tilbakeTekst}
      </button>
      <h1>{tittel}</h1>
      <div className="topplinje-hoyre">{children}</div>
    </header>
  )
}
