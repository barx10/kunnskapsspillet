export type Kompetansemaal = { kode: string; tekst: string }

/** alternativer: feil svaralternativer (opptil tre). Det riktige alternativet er svaret. */
export type Sporsmal = { sporsmal: string; svar: string; alternativer?: string[] }

export type Kategori = { navn: string; sporsmal: Sporsmal[] }

export type Brett = {
  id: string
  tittel: string
  fag: string
  /** Kompetansemålsettet (for eksempel «etter 7. trinn»). */
  trinn: string
  /** Trinnet elevene går på, så KI kan tilpasse språk og nivå. */
  alder?: string
  tema: string
  maal: Kompetansemaal[]
  kategorier: Kategori[]
  finale: { kategori: string; sporsmal: string; svar: string }
  endret: string
}

export type Tema = 'tavle' | 'studio' | 'lys' | 'fargerik'
export type Poengskala = 100 | 200 | 1

/** Lagene velger rute etter tur, og bare laget med turen svarer. */
export type Innstillinger = {
  feilSvar: 'minus' | 'null'
  tidtaker: boolean
  sekunder: number
  /** Poengene hvert lag starter med. */
  startpoeng: number
  antallDobbel: number
  /** Vis svaralternativer på spørsmål som har det. */
  alternativer: boolean
  /** Pris for et hint (fjerner ett feil alternativ), som andel av poengskalaen. 0 = ingen hint. */
  hintPris: number
  /** Spilletid i minutter, 0 = til alle ruter er brukt. */
  spilletid: number
  finale: boolean
  lyd: boolean
  tema: Tema
  poengskala: Poengskala
  storTekst: boolean
}

export type Lag = { navn: string; farge: string }

/** Én poengendring. Poengsummen er alltid startpoeng pluss summen av hendelsene. */
export type Hendelse = { lag: number; poeng: number; tekst: string; /** Ruten hendelsen hører til. */ rute?: string }

export type Spilltilstand = {
  brett: Brett
  innstillinger: Innstillinger
  lag: Lag[]
  hendelser: Hendelse[]
  brukt: string[]
  dobbel: string[]
  fase: 'brett' | 'finale' | 'slutt'
  /** Laget som velger og svarer på neste rute. */
  tur?: number
  /** Når spillet startet (ms), for spilletid. */
  startet?: number
}

export type Valg = { fag: string; trinn: string; alder: string; tema: string; maal: Kompetansemaal[] }
