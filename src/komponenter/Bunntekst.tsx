type Props = { onHvordan: () => void; onOm: () => void; onKi: () => void }

export function Bunntekst({ onHvordan, onOm, onKi }: Props) {
  return (
    <footer className="bunntekst">
      <span>© Lærerliv 2026</span>
      <nav className="bunntekst-lenker" aria-label="Hjelp og informasjon">
        <button className="lenkeknapp" onClick={onHvordan}>
          Slik spiller du
        </button>
        <button className="lenkeknapp" onClick={onOm}>
          Om
        </button>
        <button className="lenkeknapp" onClick={onKi}>
          KI-innstillinger
        </button>
      </nav>
    </footer>
  )
}
