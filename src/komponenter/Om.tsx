import { Modal } from './Modal'

export function Om({ onLukk }: { onLukk: () => void }) {
  return (
    <Modal tittel="Om Kunnskapsspillet" onLukk={onLukk}>
      <p>
        Kunnskapsspillet er et quizspill med poengbrett for klasserommet. Læreren lager et brett knyttet til fag, tema og kompetansemål, og klassen spiller i lag på
        storskjermen. Brettene lagres bare i nettleseren på denne maskinen, og spillet samler ingen opplysninger om elevene.
      </p>
      <div className="om-person">
        <img className="om-logo" src="/logo.png" alt="Lærerliv. Fra klasserom til storsamfunn." width={800} height={453} />
        <h3>Kenneth Bareksten</h3>
        <p>Lærer og hobbyprogrammerer som lager digitale verktøy for å gjøre hverdagen litt enklere og mer kreativ.</p>
        <p>
          <a href="https://www.laererliv.no" target="_blank" rel="noopener noreferrer">
            www.laererliv.no
          </a>
          <br />
          <a href="mailto:kenneth@laererliv.no">kenneth@laererliv.no</a>
        </p>
      </div>
      <p className="dempet liten">Kompetansemålene er hentet fra Utdanningsdirektoratets åpne læreplandata (NLOD).</p>
    </Modal>
  )
}
