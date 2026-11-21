import { useMemo } from 'react'
import qrcode from 'qrcode-generator'
import type { Lag } from '../types'
import { buzzer, lagLenke, useBuzzer } from './vert'

function QrKode({ tekst }: { tekst: string }) {
  const { n, sti } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(tekst)
    qr.make()
    const n = qr.getModuleCount()
    let sti = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) sti += `M${c} ${r}h1v1h-1z`
    return { n, sti }
  }, [tekst])
  return (
    <svg className="qr" viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label={`QR-kode til ${tekst}`} shapeRendering="crispEdges">
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      <path d={sti} fill="#000" />
    </svg>
  )
}

/** Romkode, QR-kode og hvilke lag som er koblet til. */
export function RomPanel({ lag }: { lag: Pick<Lag, 'navn' | 'farge'>[] }) {
  const b = useBuzzer()
  if (!b.kode) return <p className="dempet">Kobler til …</p>
  const lenke = lagLenke(b.kode)
  const vist = lenke.replace(/^https?:\/\//, '')
  return (
    <div className="rom-panel">
      <QrKode tekst={lenke} />
      <div className="rom-info">
        <p className="dempet liten">Ett nettbrett eller én PC per lag. Skann koden eller gå til</p>
        <p className="rom-lenke">{vist}</p>
        <p className="dempet liten">Romkode</p>
        <p className="rom-kode">{b.kode}</p>
        {b.status === 'feil' && <p className="feilmelding">{b.feilTekst}</p>}
        {b.status === 'kobler' && <p className="dempet liten">Kobler til …</p>}
        <ul className="rom-lag">
          {lag.map((l, n) => (
            <li key={n} className={b.tilkoblet.includes(n) ? 'klar' : ''} style={{ '--lagfarge': l.farge } as React.CSSProperties}>
              <span className="lag-prikk" aria-hidden="true" />
              {l.navn || `Lag ${n + 1}`}
              <span className="dempet liten">{b.tilkoblet.includes(n) ? 'Klar' : 'Venter'}</span>
            </li>
          ))}
        </ul>
        <button className="lenkeknapp" onClick={() => confirm('Lage et nytt rom? Lagene må koble til på nytt.') && buzzer.nyttRom()}>
          Ny romkode
        </button>
      </div>
    </div>
  )
}
