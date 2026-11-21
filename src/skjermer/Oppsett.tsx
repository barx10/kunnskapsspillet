import type { Brett, Valg } from '../types'
import { fagListe, kilde } from '../laereplan'
import { MaalVelger } from '../komponenter/MaalVelger'
import { Topplinje } from '../komponenter/Topplinje'

type Props = {
  valg: Valg
  setValg: (v: Valg) => void
  brett: Brett[]
  steg: number
  onSteg: (steg: number) => void
  onTilbake: () => void
  onNyttBrett: () => void
  onRediger: (b: Brett) => void
  onVelg: (b: Brett) => void
}

const STEG = ['Fag og tema', 'Kompetansemål', 'Brett']

export function Oppsett({ valg, setValg, brett, steg, onSteg: setSteg, onTilbake, onNyttBrett, onRediger, onVelg }: Props) {
  const fag = fagListe.find((f) => f.navn === valg.fag)
  const annet = valg.fag !== '' && !fag

  const passer = brett.filter((b) => b.fag === valg.fag && (!valg.trinn || b.trinn === valg.trinn))
  const andre = brett.filter((b) => !passer.includes(b))

  return (
    <main className="side">
      <Topplinje tittel="Nytt spill" onTilbake={steg === 0 ? onTilbake : () => setSteg(steg - 1)} tilbakeTekst={steg === 0 ? 'Til start' : 'Forrige steg'} />
      <ol className="steg">
        {STEG.map((s, i) => (
          <li key={s} className={i === steg ? 'aktiv' : i < steg ? 'ferdig' : ''}>
            <button onClick={() => i < steg && setSteg(i)} disabled={i >= steg}>
              <span className="steg-nr">{i + 1}</span> {s}
            </button>
          </li>
        ))}
      </ol>

      {steg === 0 && (
        <section className="panel">
          <h2>Hvilket fag?</h2>
          <div className="valgrutenett">
            {fagListe.map((f) => (
              <button key={f.navn} className={valg.fag === f.navn ? 'valgknapp valgt' : 'valgknapp'} onClick={() => setValg({ ...valg, fag: f.navn, trinn: '', maal: [] })}>
                {f.navn}
              </button>
            ))}
            <button className={annet ? 'valgknapp valgt' : 'valgknapp'} onClick={() => setValg({ ...valg, fag: 'Annet', trinn: '', maal: [] })}>
              Annet fag
            </button>
          </div>

          {fag && (
            <>
              <h2>Trinn</h2>
              <div className="valgrutenett">
                {fag.trinn.map((t) => (
                  <button key={t.trinn} className={valg.trinn === t.trinn ? 'valgknapp valgt' : 'valgknapp'} onClick={() => setValg({ ...valg, trinn: t.trinn, maal: [] })}>
                    {t.trinn}
                  </button>
                ))}
              </div>
            </>
          )}

          {annet && (
            <div className="felt-rad">
              <label className="felt">
                <span>Fag</span>
                <input value={valg.fag === 'Annet' ? '' : valg.fag} placeholder="For eksempel Programmering" onChange={(e) => setValg({ ...valg, fag: e.target.value || 'Annet' })} />
              </label>
              <label className="felt">
                <span>Trinn</span>
                <input value={valg.trinn} placeholder="For eksempel 9. trinn" onChange={(e) => setValg({ ...valg, trinn: e.target.value })} />
              </label>
            </div>
          )}

          <label className="felt">
            <span>Tema (valgfritt)</span>
            <input value={valg.tema} placeholder="For eksempel Vikingtiden" onChange={(e) => setValg({ ...valg, tema: e.target.value })} />
          </label>

          <div className="knapperad slutt">
            <button className="knapp knapp-hoved" disabled={!valg.fag || (!!fag && !valg.trinn)} onClick={() => setSteg(fag ? 1 : 2)}>
              Neste
            </button>
          </div>
        </section>
      )}

      {steg === 1 && (
        <section className="panel">
          <h2>
            Kompetansemål i {valg.fag.toLowerCase()} etter {valg.trinn}
          </h2>
          <p className="dempet">Velg målene spillet skal dekke. Du kan også hoppe over dette.</p>
          <MaalVelger fag={valg.fag} trinn={valg.trinn} valgte={valg.maal} onEndre={(maal) => setValg({ ...valg, maal })} />
          <p className="kilde">
            Kilde: {kilde.tekst}. Hentet {kilde.hentet}.
          </p>
          <div className="knapperad slutt">
            <button className="knapp knapp-hoved" onClick={() => setSteg(2)}>
              Neste
            </button>
          </div>
        </section>
      )}

      {steg === 2 && (
        <section className="panel">
          <div className="panel-topp">
            <h2>Velg et brett</h2>
            <button className="knapp knapp-hoved" onClick={onNyttBrett}>
              Lag nytt brett
            </button>
          </div>
          {passer.length === 0 && (
            <p className="dempet">
              Du har ingen brett i {valg.fag.toLowerCase()} {valg.trinn} ennå. Lag et nytt, eller bruk et av de andre.
            </p>
          )}
          <BrettListe liste={passer} onVelg={onVelg} onRediger={onRediger} />
          {andre.length > 0 && (
            <>
              <h3 className="undertittel">Andre brett</h3>
              <BrettListe liste={andre} onVelg={onVelg} onRediger={onRediger} />
            </>
          )}
        </section>
      )}
    </main>
  )
}

export function antallSporsmal(b: Brett) {
  return b.kategorier.reduce((n, k) => n + k.sporsmal.filter((s) => s.sporsmal.trim()).length, 0)
}

function BrettListe({ liste, onVelg, onRediger }: { liste: Brett[]; onVelg: (b: Brett) => void; onRediger: (b: Brett) => void }) {
  return (
    <ul className="brettliste">
      {liste.map((b) => {
        const n = antallSporsmal(b)
        return (
          <li key={b.id} className="brettkort">
            <div>
              <strong>{b.tittel}</strong>
              <span className="dempet">
                {[b.fag, b.trinn].filter(Boolean).join(', ')} – {b.kategorier.length} kategorier, {n} spørsmål
              </span>
            </div>
            <div className="knapperad">
              <button className="knapp" onClick={() => onRediger(b)}>
                Rediger
              </button>
              <button className="knapp knapp-hoved" disabled={n === 0} onClick={() => onVelg(b)}>
                Bruk dette brettet
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
