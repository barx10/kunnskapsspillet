import { Topplinje } from '../komponenter/Topplinje'
import { KiNokkelSkjema } from '../ki/KiNokkelSkjema'

export function KiInnstillinger({ onTilbake }: { onTilbake: () => void }) {
  return (
    <main className="side">
      <Topplinje tittel="KI-innstillinger" onTilbake={onTilbake} tilbakeTekst="Til start" />
      <section className="panel">
        <h2>Egen API-nøkkel</h2>
        <p className="dempet">
          Med en nøkkel fra Google eller Anthropic kan du få KI til å foreslå spørsmål når du lager brett. Alt annet i Kunnskapsspillet virker uten nøkkel.
        </p>
        <KiNokkelSkjema />
      </section>
    </main>
  )
}
