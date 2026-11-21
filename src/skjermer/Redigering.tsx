import { useState } from 'react'
import type { Brett } from '../types'
import { Topplinje } from '../komponenter/Topplinje'
import { MaalVelger } from '../komponenter/MaalVelger'
import { fagListe } from '../laereplan'

type Props = { start: Brett; onAvbryt: () => void; onLagre: (b: Brett) => void }

export function Redigering({ start, onAvbryt, onLagre }: Props) {
  const [b, setB] = useState<Brett>(start)
  const [visMaal, setVisMaal] = useState(false)
  const rader = b.kategorier[0]?.sporsmal.length ?? 5
  const kjentFag = fagListe.find((f) => f.navn === b.fag)

  const settKategori = (ki: number, navn: string) => setB({ ...b, kategorier: b.kategorier.map((k, i) => (i === ki ? { ...k, navn } : k)) })
  const settSporsmal = (ki: number, ri: number, felt: 'sporsmal' | 'svar', verdi: string) =>
    setB({
      ...b,
      kategorier: b.kategorier.map((k, i) => (i === ki ? { ...k, sporsmal: k.sporsmal.map((s, j) => (j === ri ? { ...s, [felt]: verdi } : s)) } : k)),
    })

  const settKolonner = (n: number) => {
    const mister = b.kategorier.slice(n).some((k) => k.navn || k.sporsmal.some((x) => x.sporsmal || x.svar))
    if (mister && !confirm('Kategoriene du fjerner har innhold. Vil du slette dem?')) return
    const kat = b.kategorier.slice(0, n)
    while (kat.length < n) kat.push({ navn: '', sporsmal: Array.from({ length: rader }, () => ({ sporsmal: '', svar: '' })) })
    setB({ ...b, kategorier: kat })
  }
  const settRader = (n: number) => {
    const mister = b.kategorier.some((k) => k.sporsmal.slice(n).some((x) => x.sporsmal || x.svar))
    if (mister && !confirm('Radene du fjerner har spørsmål. Vil du slette dem?')) return
    setB({
      ...b,
      kategorier: b.kategorier.map((k) => {
        const s = k.sporsmal.slice(0, n)
        while (s.length < n) s.push({ sporsmal: '', svar: '' })
        return { ...k, sporsmal: s }
      }),
    })
  }


  return (
    <main className="side side-bred">
      <Topplinje tittel={start.tittel ? 'Rediger brett' : 'Nytt brett'} onTilbake={onAvbryt} tilbakeTekst="Avbryt">
        <button className="knapp knapp-hoved" onClick={() => onLagre(b)}>
          Lagre brett
        </button>
      </Topplinje>

      <section className="panel">
        <div className="felt-rad">
          <label className="felt felt-bred">
            <span>Navn på brettet</span>
            <input value={b.tittel} onChange={(e) => setB({ ...b, tittel: e.target.value })} />
          </label>
          <label className="felt">
            <span>Fag</span>
            <input value={b.fag} onChange={(e) => setB({ ...b, fag: e.target.value })} />
          </label>
          <label className="felt">
            <span>Trinn</span>
            <input value={b.trinn} onChange={(e) => setB({ ...b, trinn: e.target.value })} />
          </label>
        </div>
        <label className="felt">
          <span>Tema</span>
          <input value={b.tema} onChange={(e) => setB({ ...b, tema: e.target.value })} />
        </label>

        <div className="maal-oppsummering">
          <span>
            {b.maal.length === 0 ? 'Ingen kompetansemål valgt.' : `${b.maal.length} kompetansemål valgt.`}
          </span>
          {kjentFag && (
            <button className="lenkeknapp" onClick={() => setVisMaal(!visMaal)}>
              {visMaal ? 'Skjul kompetansemål' : 'Velg kompetansemål'}
            </button>
          )}
        </div>
        {visMaal && <MaalVelger fag={b.fag} trinn={b.trinn} valgte={b.maal} onEndre={(maal) => setB({ ...b, maal })} />}
        {!visMaal && b.maal.length > 0 && (
          <ul className="maal-kort">
            {b.maal.map((m) => (
              <li key={m.kode}>{m.tekst}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-topp">
          <h2>Spørsmål</h2>
          <div className="storrelse">
            <label>
              Kategorier
              <select value={b.kategorier.length} onChange={(e) => settKolonner(+e.target.value)}>
                {[3, 4, 5, 6].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              Spørsmål per kategori
              <select value={rader} onChange={(e) => settRader(+e.target.value)}>
                {[3, 4, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="redigering-kolonner" style={{ '--kolonner': b.kategorier.length } as React.CSSProperties}>
          {b.kategorier.map((k, ki) => (
            <div key={ki} className="redigering-kolonne">
              <input className="kategori-input" value={k.navn} placeholder={`Kategori ${ki + 1}`} aria-label={`Navn på kategori ${ki + 1}`} onChange={(e) => settKategori(ki, e.target.value)} />
              {k.sporsmal.map((s, ri) => (
                <div key={ri} className="sporsmal-felt">
                  <span className="sporsmal-nivaa">Nivå {ri + 1}</span>
                  <textarea rows={2} value={s.sporsmal} placeholder="Spørsmål" aria-label={`Spørsmål, kategori ${ki + 1}, nivå ${ri + 1}`} onChange={(e) => settSporsmal(ki, ri, 'sporsmal', e.target.value)} />
                  <input value={s.svar} placeholder="Svar" aria-label={`Svar, kategori ${ki + 1}, nivå ${ri + 1}`} onChange={(e) => settSporsmal(ki, ri, 'svar', e.target.value)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Finalerunde</h2>
        <p className="dempet">Alle lag satser poeng og skriver svaret på et ark. Brukes bare hvis finale er slått på i innstillingene.</p>
        <div className="felt-rad">
          <label className="felt">
            <span>Kategori</span>
            <input value={b.finale.kategori} onChange={(e) => setB({ ...b, finale: { ...b.finale, kategori: e.target.value } })} />
          </label>
          <label className="felt felt-bred">
            <span>Spørsmål</span>
            <input value={b.finale.sporsmal} onChange={(e) => setB({ ...b, finale: { ...b.finale, sporsmal: e.target.value } })} />
          </label>
          <label className="felt felt-bred">
            <span>Svar</span>
            <input value={b.finale.svar} onChange={(e) => setB({ ...b, finale: { ...b.finale, svar: e.target.value } })} />
          </label>
        </div>
      </section>

      <div className="knapperad slutt">
        <button className="knapp" onClick={onAvbryt}>
          Avbryt
        </button>
        <button className="knapp knapp-hoved" onClick={() => onLagre(b)}>
          Lagre brett
        </button>
      </div>
    </main>
  )
}
