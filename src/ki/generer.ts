import { z } from 'zod'
import type { KiOppsett } from './oppsett'
import type { Kompetansemaal } from '../types'

export const BrettForslag = z.object({
  kategorier: z.array(
    z.object({
      navn: z.string(),
      sporsmal: z.array(z.object({ sporsmal: z.string(), svar: z.string() })),
    }),
  ),
  finale: z.object({ kategori: z.string(), sporsmal: z.string(), svar: z.string() }),
})
export type BrettForslag = z.infer<typeof BrettForslag>

export type Bestilling = {
  fag: string
  trinn: string
  tema: string
  maal: Kompetansemaal[]
  kategorinavn: string[] // tom streng = KI velger
  rader: number
  eksisterende: string[] // spørsmål som allerede finnes, for å unngå dubletter
  onsker: string
}

export class KiFeil extends Error {}

const SYSTEM = `Du lager spørsmål til et quizspill med poengbrett som spilles i lag i et norsk klasserom.
Læreren styrer spillet på storskjerm og leser spørsmålene høyt.

Krav:
- Skriv på norsk bokmål, tilpasset elevenes trinn.
- Hver kategori har spørsmål i stigende vanskelighetsgrad: første spørsmål er lettest, siste er vanskeligst.
- Spørsmålene skal være faglig korrekte og ha ett tydelig riktig svar, så læreren raskt kan avgjøre om et lag svarte riktig.
- Spørsmål: én eller to setninger. Svar: kort fasit, gjerne med en kort forklaring eller godkjente varianter i parentes.
- Knytt spørsmålene til de oppgitte kompetansemålene når de finnes.
- Ikke gjenta spørsmål som allerede finnes på brettet.
- Finalespørsmålet skal være litt mer krevende og kunne besvares skriftlig på et ark.`

function lagPrompt(b: Bestilling) {
  const linjer = [
    `Fag: ${b.fag || 'ikke oppgitt'}`,
    `Trinn: ${b.trinn || 'ikke oppgitt'}`,
    `Tema: ${b.tema || 'ikke oppgitt'}`,
  ]
  if (b.maal.length) linjer.push('', 'Kompetansemål:', ...b.maal.map((m) => `- ${m.tekst}`))
  linjer.push(
    '',
    `Lag ${b.kategorinavn.length} kategorier med nøyaktig ${b.rader} spørsmål hver, og ett finalespørsmål.`,
    'Kategorinavn (behold oppgitte navn i samme rekkefølge, finn på korte navn der det står «velg selv»):',
    ...b.kategorinavn.map((n, i) => `${i + 1}. ${n.trim() || 'velg selv'}`),
  )
  if (b.eksisterende.length) linjer.push('', 'Spørsmål som allerede finnes på brettet:', ...b.eksisterende.map((s) => `- ${s}`))
  if (b.onsker.trim()) linjer.push('', `Lærerens ønsker: ${b.onsker.trim()}`)
  return linjer.join('\n')
}

export async function genererForslag(o: KiOppsett, b: Bestilling): Promise<BrettForslag> {
  const prompt = lagPrompt(b)
  const forslag = o.leverandor === 'claude' ? await medClaude(o, prompt) : await medGemini(o, prompt)
  return normaliser(forslag, b)
}

function normaliser(f: BrettForslag, b: Bestilling): BrettForslag {
  const kategorier = b.kategorinavn.map((navn, i) => {
    const k = f.kategorier[i]
    const sporsmal = Array.from({ length: b.rader }, (_, r) => ({
      sporsmal: (k?.sporsmal[r]?.sporsmal ?? '').slice(0, 600),
      svar: (k?.sporsmal[r]?.svar ?? '').slice(0, 600),
    }))
    return { navn: navn.trim() || (k?.navn ?? '').slice(0, 60), sporsmal }
  })
  if (kategorier.every((k) => k.sporsmal.every((s) => !s.sporsmal))) throw new KiFeil('KI-en svarte uten spørsmål. Prøv igjen.')
  return { kategorier, finale: { kategori: f.finale.kategori.slice(0, 60), sporsmal: f.finale.sporsmal.slice(0, 600), svar: f.finale.svar.slice(0, 600) } }
}

// ---------- Claude (offisiell SDK, lastes først når den trengs) ----------

async function medClaude(o: KiOppsett, prompt: string): Promise<BrettForslag> {
  const [{ default: Anthropic }, { zodOutputFormat }] = await Promise.all([import('@anthropic-ai/sdk'), import('@anthropic-ai/sdk/helpers/zod')])
  const client = new Anthropic({ apiKey: o.nokkel, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 180_000 })
  try {
    const svar = await client.messages.parse({
      model: o.modell || 'claude-opus-5-5',
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: zodOutputFormat(BrettForslag) },
    })
    if (svar.stop_reason === 'refusal') throw new KiFeil('KI-en ville ikke lage spørsmål til dette temaet. Prøv å formulere temaet annerledes.')
    if (svar.stop_reason === 'max_tokens') throw new KiFeil('Svaret ble for langt. Prøv med færre kategorier.')
    if (!svar.parsed_output) throw new KiFeil('Klarte ikke å lese svaret fra KI-en. Prøv igjen.')
    return svar.parsed_output
  } catch (e) {
    if (e instanceof KiFeil) throw e
    if (e instanceof Anthropic.AuthenticationError) throw new KiFeil('Claude avviste nøkkelen. Sjekk at den er riktig.')
    if (e instanceof Anthropic.PermissionDeniedError) throw new KiFeil('Nøkkelen har ikke tilgang til denne modellen.')
    if (e instanceof Anthropic.NotFoundError) throw new KiFeil('Fant ikke modellen. Velg en annen modell i KI-innstillingene.')
    if (e instanceof Anthropic.RateLimitError) throw new KiFeil('For mange forespørsler, eller kontoen er tom for kreditt. Vent litt og prøv igjen.')
    if (e instanceof Anthropic.APIConnectionError) throw new KiFeil('Fikk ikke kontakt med Claude. Sjekk nettforbindelsen.')
    if (e instanceof Anthropic.APIError) throw new KiFeil(`Claude svarte med en feil (${e.status ?? 'ukjent'}). Prøv igjen.`)
    throw e
  }
}

export async function testClaude(nokkel: string) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: nokkel, dangerouslyAllowBrowser: true, maxRetries: 0 })
  try {
    await client.models.list({ limit: 1 })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new KiFeil('Claude avviste nøkkelen. Sjekk at du har limt inn hele nøkkelen.')
    if (e instanceof Anthropic.APIConnectionError) throw new KiFeil('Fikk ikke kontakt med Claude. Sjekk nettforbindelsen.')
    throw new KiFeil('Kunne ikke bekrefte nøkkelen hos Claude.')
  }
}

// ---------- Gemini (REST) ----------

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta'

const geminiSkjema = {
  type: 'OBJECT',
  properties: {
    kategorier: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          navn: { type: 'STRING' },
          sporsmal: {
            type: 'ARRAY',
            items: { type: 'OBJECT', properties: { sporsmal: { type: 'STRING' }, svar: { type: 'STRING' } }, required: ['sporsmal', 'svar'] },
          },
        },
        required: ['navn', 'sporsmal'],
      },
    },
    finale: { type: 'OBJECT', properties: { kategori: { type: 'STRING' }, sporsmal: { type: 'STRING' }, svar: { type: 'STRING' } }, required: ['kategori', 'sporsmal', 'svar'] },
  },
  required: ['kategorier', 'finale'],
}

async function geminiFetch(nokkel: string, sti: string, init?: RequestInit) {
  let res: Response
  try {
    res = await fetch(`${GEMINI}/${sti}`, { ...init, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': nokkel }, referrerPolicy: 'no-referrer' })
  } catch {
    throw new KiFeil('Fikk ikke kontakt med Gemini. Sjekk nettforbindelsen.')
  }
  if (res.ok) return res.json()
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    const tekst = await res.text()
    if (/API key|API_KEY|PERMISSION_DENIED|unauthorized/i.test(tekst) || res.status !== 400) throw new KiFeil('Gemini avviste nøkkelen. Sjekk at den er riktig.')
    throw new KiFeil('Gemini kunne ikke behandle forespørselen. Prøv igjen.')
  }
  if (res.status === 404) throw new KiFeil('Fant ikke modellen. Velg en annen modell i KI-innstillingene.')
  if (res.status === 429) throw new KiFeil('For mange forespørsler, eller gratiskvoten er brukt opp. Vent litt og prøv igjen.')
  throw new KiFeil(`Gemini svarte med en feil (${res.status}). Prøv igjen.`)
}

type GeminiModell = { name: string; displayName?: string; supportedGenerationMethods?: string[] }

/** Henter tekstmodeller nøkkelen har tilgang til, beste «flash»-modell først. */
export async function geminiModeller(nokkel: string): Promise<{ id: string; navn: string }[]> {
  const data = (await geminiFetch(nokkel, 'models?pageSize=200')) as { models?: GeminiModell[] }
  const versjon = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0')
  const rang = (n: string) => (/flash/.test(n) && !/lite/.test(n) ? 0 : /pro/.test(n) ? 1 : 2)
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .filter((m) => /gemini/.test(m.name) && !/(image|tts|audio|live|embed|vision|thinking-exp|learnlm)/.test(m.name))
    .map((m) => ({ id: m.name.replace(/^models\//, ''), navn: m.displayName ?? m.name }))
    .sort((a, b) => rang(a.id) - rang(b.id) || versjon(b.id) - versjon(a.id) || a.id.length - b.id.length)
}

async function medGemini(o: KiOppsett, prompt: string): Promise<BrettForslag> {
  const modell = o.modell || (await geminiModeller(o.nokkel))[0]?.id
  if (!modell) throw new KiFeil('Fant ingen Gemini-modell for denne nøkkelen.')
  const data = (await geminiFetch(o.nokkel, `models/${encodeURIComponent(modell)}:generateContent`, {
    method: 'POST',
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: geminiSkjema, maxOutputTokens: 16000 },
    }),
  })) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } }

  if (data.promptFeedback?.blockReason) throw new KiFeil('Gemini ville ikke lage spørsmål til dette temaet. Prøv å formulere temaet annerledes.')
  const kandidat = data.candidates?.[0]
  if (kandidat?.finishReason === 'SAFETY') throw new KiFeil('Gemini stoppet svaret av sikkerhetshensyn. Prøv å formulere temaet annerledes.')
  if (kandidat?.finishReason === 'MAX_TOKENS') throw new KiFeil('Svaret ble for langt. Prøv med færre kategorier.')
  const tekst = kandidat?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  try {
    return BrettForslag.parse(JSON.parse(tekst))
  } catch {
    throw new KiFeil('Klarte ikke å lese svaret fra Gemini. Prøv igjen.')
  }
}
