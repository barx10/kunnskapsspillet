// Leser en fagtekst fra fil. PDF sendes som dokument til KI-en (begge leverandørene leser PDF),
// Word og tekstfiler gjøres om til ren tekst her i nettleseren.

export type Fagtekst = { navn: string } & ({ type: 'tekst'; tekst: string } | { type: 'pdf'; base64: string; storrelse: number })

export const MAKS_TEGN = 120_000
export const MAKS_PDF = 15 * 1024 * 1024
export const FILTYPER = '.pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export class FagtekstFeil extends Error {}

function tilBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

const rydd = (t: string) => t.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

export async function lesFagtekst(fil: File): Promise<Fagtekst> {
  const navn = fil.name
  const endelse = navn.toLowerCase().split('.').pop()

  if (endelse === 'pdf' || fil.type === 'application/pdf') {
    if (fil.size > MAKS_PDF) throw new FagtekstFeil('PDF-en er større enn 15 MB. Del den opp, eller lim inn teksten du trenger.')
    return { type: 'pdf', navn, base64: tilBase64(await fil.arrayBuffer()), storrelse: fil.size }
  }

  let tekst: string
  if (endelse === 'docx') {
    const mammoth = await import('mammoth/mammoth.browser.js')
    try {
      tekst = (await mammoth.extractRawText({ arrayBuffer: await fil.arrayBuffer() })).value
    } catch {
      throw new FagtekstFeil('Klarte ikke å lese Word-filen. Lagre den på nytt som .docx, eller lim inn teksten.')
    }
  } else if (endelse === 'txt' || endelse === 'md' || fil.type.startsWith('text/')) {
    tekst = await fil.text()
  } else if (endelse === 'doc') {
    throw new FagtekstFeil('Gamle .doc-filer støttes ikke. Lagre filen som .docx eller PDF.')
  } else {
    throw new FagtekstFeil('Filtypen støttes ikke. Bruk PDF, Word (.docx) eller en tekstfil.')
  }

  tekst = rydd(tekst)
  if (!tekst) throw new FagtekstFeil('Fant ingen tekst i filen.')
  if (tekst.length > MAKS_TEGN) throw new FagtekstFeil(`Teksten er for lang (${Math.round(tekst.length / 1000)} 000 tegn). Bruk et utdrag på under 120 000 tegn.`)
  return { type: 'tekst', navn, tekst }
}

export const beskrivelse = (f: Fagtekst) =>
  f.type === 'pdf' ? `${f.navn} (PDF, ${f.storrelse < 1024 * 1024 ? `${Math.max(1, Math.round(f.storrelse / 1024))} kB` : `${(f.storrelse / 1024 / 1024).toFixed(1).replace('.', ',')} MB`})` : `${f.navn} (${f.tekst.length.toLocaleString('nb-NO')} tegn)`
