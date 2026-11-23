import { Modal } from './Modal'

const STEG: { tittel: string; tekst: React.ReactNode }[] = [
  {
    tittel: 'Velg fag, tema og kompetansemål',
    tekst: 'Trykk «Nytt spill» og velg fag, kompetansemål og trinn. Skriv gjerne et tema, og kryss av kompetansemålene spillet skal dekke. Du kan hoppe over målene.',
  },
  {
    tittel: 'Lag et brett',
    tekst: (
      <>
        Velg et brett du har fra før, eller trykk «Lag nytt brett». Skriv inn kategorier, spørsmål og svar. Første spørsmål i hver kategori er det letteste. Har du en
        API-nøkkel fra Google eller Anthropic, kan du trykke «Foreslå spørsmål med KI» og rette forslagene etterpå. Der kan du også laste opp en fagtekst (PDF, Word eller tekstfil), så lager KI-en spørsmål ut fra den. Husk å trykke «Lagre brett».
      </>
    ),
  },
  {
    tittel: 'Del klassen i lag og velg spillmodus',
    tekst: (
      <>
        Velg 2–6 lag og gi dem navn. Velg så en spillmodus: <strong>Klassisk</strong> (lagene velger og svarer etter tur, bommer laget eller tiden går ut, går spørsmålet til et
        tilfeldig lag og deretter til alle), <strong>Lynrunde</strong> (laget som rekker opp hånda først, svarer) eller <strong>Rolig</strong> (uten tidtaker og minuspoeng). Du kan justere reglene etterpå,
        for eksempel tid, halve poeng til de andre lagene, antall dobbel-ruter og spilletid.
      </>
    ),
  },
  {
    tittel: 'Spill',
    tekst: (
      <>
        Vis siden på storskjermen og trykk «Fullskjerm». Øverst står det hvilket lag som skal velge rute. Les spørsmålet høyt, og trykk «Riktig» eller «Feil» ved laget som
        svarer. Bommer laget, eller tiden går ut, trekkes et tilfeldig lag som får prøve. Bommer også det, står det på skjermen at alle lagene kan rekke opp hånda.
        Trykk «Vis svaret» når dere vil se fasiten, og «Tilbake til brettet» for å gå videre. Esc-tasten tar deg også tilbake når spørsmålet er avgjort.
      </>
    ),
  },
  {
    tittel: 'Dobbel og finale',
    tekst: 'Bak en eller to ruter skjuler det seg en dobbel. Laget som valgte ruten, satser selv poeng før spørsmålet vises, minst den laveste ruteverdien og maks egen poengsum eller den høyeste ruteverdien. Riktig svar gir innsatsen. Feil svar gir minus innsatsen hvis minuspoeng er valgt, ellers 0. Til slutt satser alle lag på finalespørsmålet og skriver svaret på et ark.',
  },
  {
    tittel: 'Del brettene',
    tekst: 'Under «Mine brett» kan du lagre et brett som fil og sende det til en kollega. Kollegaen bruker «Åpne brett fra fil». Det er også slik du tar vare på brettene hvis du bytter maskin.',
  },
]

export function Hvordan({ onLukk }: { onLukk: () => void }) {
  return (
    <Modal tittel="Slik bruker du Kunnskapsspillet" onLukk={onLukk} bred>
      <ol className="hvordan-steg">
        {STEG.map((s) => (
          <li key={s.tittel}>
            <h3>{s.tittel}</h3>
            <p>{s.tekst}</p>
          </li>
        ))}
      </ol>
      <h3 className="hvordan-tips">Greit å vite</h3>
      <ul className="hvordan-liste">
        <li>Har du gitt feil poeng, trykker du «Angre». Du kan også trykke på et lags poengsum for å justere den eller gi laget turen.</li>
        <li>Trykker du «Pause», blir spillet husket. Du fortsetter fra startskjermen, også etter at nettleseren har vært lukket.</li>
        <li>Velg utseendet «Lys» hvis rommet er lyst og projektoren svak.</li>
        <li>KI kan ta feil. Les gjennom spørsmålene før du spiller.</li>
      </ul>
    </Modal>
  )
}
