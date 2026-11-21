import { useEffect, useRef, useState } from 'react'
import type { Brett } from '../types'
import { hentKiOppsett, LEVERANDORER, type KiOppsett } from './oppsett'
import { genererForslag } from './generer'
import { KiNokkelSkjema } from './KiNokkelSkjema'

type Modus = 'tomme' | 'alt' | 'kategori'
type Props = { brett: Brett; startKategori?: number; onBruk: (b: Brett) => void; onLukk: () => void }

const harInnhold = (b: Brett) => b.kategorier.some((k) => k.navn.trim() || k.sporsmal.some((s) => s.sporsmal.trim() || s.svar.trim()))

export function KiDialog({ brett, startKategori, onBruk, onLukk }: Props) {
  const [oppsett, setOppsett] = useState<KiOppsett | null>(hentKiOppsett)
  const [visNokkel, setVisNokkel] = useState(false)
  const [modus, setModus] = useState<Modus>(startKategori !== undefined ? 'kategori' : harInnhold(brett) ? 'tomme' : 'alt')
  const [kategori, setKategori] = useState(startKategori ?? 0)
  const [onsker, setOnsker] = useState('')
  const [jobber, setJobber] = useState(false)
  const [feil, setFeil] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const rader = brett.kategorier[0]?.sporsmal.length ?? 5

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  const lag = async () => {
    if (!oppsett) return
    setJobber(true)
    setFeil('')
    const alleSporsmal = brett.kategorier.flatMap((k) => k.sporsmal.map((s) => s.sporsmal.trim()).filter(Boolean))
    try {
      if (modus === 'kategori') {
        const k = brett.kategorier[kategori]
        const andre = brett.kategorier.filter((_, i) => i !== kategori).flatMap((x) => x.sporsmal.map((s) => s.sporsmal.trim()).filter(Boolean))
        const f = await genererForslag(oppsett, { ...grunn(brett), kategorinavn: [k.navn], rader, eksisterende: andre, onsker })
        onBruk({ ...brett, kategorier: brett.kategorier.map((x, i) => (i === kategori ? f.kategorier[0] : x)) })
      } else if (modus === 'alt') {
        const f = await genererForslag(oppsett, { ...grunn(brett), kategorinavn: brett.kategorier.map(() => ''), rader, eksisterende: [], onsker })
        onBruk({ ...brett, kategorier: f.kategorier, finale: f.finale })
      } else {
        const f = await genererForslag(oppsett, { ...grunn(brett), kategorinavn: brett.kategorier.map((k) => k.navn), rader, eksisterende: alleSporsmal, onsker })
        onBruk({
          ...brett,
          kategorier: brett.kategorier.map((k, i) => ({
            navn: k.navn.trim() || f.kategorier[i].navn,
            sporsmal: k.sporsmal.map((s, r) => (s.sporsmal.trim() ? s : { sporsmal: f.kategorier[i].sporsmal[r].sporsmal, svar: s.svar.trim() || f.kategorier[i].sporsmal[r].svar })),
          })),
          finale: brett.finale.sporsmal.trim() ? brett.finale : f.finale,
        })
      }
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt.')
      setJobber(false)
    }
  }

  const tomme = brett.kategorier.reduce((n, k) => n + k.sporsmal.filter((s) => !s.sporsmal.trim()).length, 0)

  return (
    <dialog ref={dialog} className="dialog" onCancel={(e) => (jobber ? e.preventDefault() : onLukk())} aria-labelledby="ki-tittel">
      <h2 id="ki-tittel">Foreslå spørsmål med KI</h2>

      {!oppsett || visNokkel ? (
        <>
          <p className="dempet">For å bruke KI trenger du en API-nøkkel fra Google eller Anthropic. Du kan også fylle inn spørsmålene selv uten KI.</p>
          <KiNokkelSkjema
            onLagret={(o) => (setOppsett(o), setVisNokkel(false))}
            onSlettet={() => setOppsett(null)}
            onAvbryt={onLukk}
          />
        </>
      ) : (
        <>
          <p className="dempet liten">
            Bruker {LEVERANDORER[oppsett.leverandor].navn}.{' '}
            <button className="lenkeknapp" onClick={() => setVisNokkel(true)}>
              Endre
            </button>
          </p>
          <p className="dempet">
            Forslagene bygger på fag, trinn, tema og kompetansemålene du har valgt for brettet ({[brett.fag, brett.trinn, brett.tema].filter(Boolean).join(', ') || 'ikke fylt inn ennå'}).
          </p>

          <fieldset className="valg-liste">
            <legend>Hva skal KI-en fylle inn?</legend>
            <label className="avkryssing">
              <input type="radio" name="modus" checked={modus === 'tomme'} onChange={() => setModus('tomme')} disabled={tomme === 0} />
              <span>Bare tomme ruter ({tomme}). Det du har skrevet blir stående.</span>
            </label>
            <label className="avkryssing">
              <input type="radio" name="modus" checked={modus === 'alt'} onChange={() => setModus('alt')} />
              <span>Hele brettet, med nye kategorier. Erstatter alt som står der nå.</span>
            </label>
            <label className="avkryssing">
              <input type="radio" name="modus" checked={modus === 'kategori'} onChange={() => setModus('kategori')} />
              <span>
                Én kategori:{' '}
                <select value={kategori} onChange={(e) => (setKategori(+e.target.value), setModus('kategori'))} aria-label="Velg kategori">
                  {brett.kategorier.map((k, i) => (
                    <option key={i} value={i}>
                      {k.navn || `Kategori ${i + 1}`}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          </fieldset>

          <label className="felt">
            <span>Ønsker (valgfritt)</span>
            <textarea rows={2} value={onsker} placeholder="For eksempel: Ta med spørsmål om nordlys. Unngå tall med desimaler." onChange={(e) => setOnsker(e.target.value)} />
          </label>

          {feil && (
            <p className="melding melding-feil" role="alert">
              {feil}
            </p>
          )}
          {jobber && (
            <p className="melding" role="status">
              Lager forslag. Dette kan ta opptil et minutt.
            </p>
          )}
          <p className="dempet liten">KI kan ta feil. Les gjennom spørsmål og svar før du spiller.</p>
          <div className="knapperad slutt">
            <button className="knapp" onClick={onLukk} disabled={jobber}>
              Avbryt
            </button>
            <button className="knapp knapp-hoved" onClick={lag} disabled={jobber}>
              {jobber ? 'Lager forslag …' : 'Lag forslag'}
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}

const grunn = (b: Brett) => ({ fag: b.fag, trinn: b.trinn, tema: b.tema, maal: b.maal })
