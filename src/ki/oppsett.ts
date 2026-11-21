// KI-oppsett (BYOK). Nøkkelen ligger bare i denne nettleseren og sendes bare til leverandøren.
// Standard er sessionStorage (glemmes når nettleseren lukkes); læreren kan velge å huske den.

export type Leverandor = 'claude' | 'gemini'
export type KiOppsett = { leverandor: Leverandor; nokkel: string; modell: string; husk: boolean }

const NOKKEL = 'ks.ki'

export const CLAUDE_MODELLER = [
  { id: 'claude-opus-5-5', navn: 'Claude Opus 5.5 (best kvalitet)' },
  { id: 'claude-sonnet-5-5', navn: 'Claude Sonnet 5.5 (billigere)' },
  { id: 'claude-haiku-5-5', navn: 'Claude Haiku 5.5 (billigst)' },
]

export const LEVERANDORER: Record<Leverandor, { navn: string; nokkelside: string; prefiks: string }> = {
  gemini: { navn: 'Google Gemini', nokkelside: 'https://aistudio.google.com/apikey', prefiks: 'AIza' },
  claude: { navn: 'Anthropic Claude', nokkelside: 'https://console.anthropic.com/settings/keys', prefiks: 'sk-ant-' },
}

export function hentKiOppsett(): KiOppsett | null {
  for (const lager of [sessionStorage, localStorage]) {
    try {
      const raw = lager.getItem(NOKKEL)
      if (raw) {
        const o = JSON.parse(raw) as KiOppsett
        if (o?.nokkel && (o.leverandor === 'claude' || o.leverandor === 'gemini')) return o
      }
    } catch {
      /* ugyldig innhold ignoreres */
    }
  }
  return null
}

export function lagreKiOppsett(o: KiOppsett) {
  slettKiOppsett()
  ;(o.husk ? localStorage : sessionStorage).setItem(NOKKEL, JSON.stringify(o))
}

export function slettKiOppsett() {
  sessionStorage.removeItem(NOKKEL)
  localStorage.removeItem(NOKKEL)
}

export const maskert = (nokkel: string) => (nokkel.length > 10 ? `${nokkel.slice(0, 6)}…${nokkel.slice(-4)}` : '••••')
