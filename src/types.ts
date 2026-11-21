export type Kompetansemaal = { kode: string; tekst: string }

export type Sporsmal = { sporsmal: string; svar: string }

export type Kategori = { navn: string; sporsmal: Sporsmal[] }

export type Brett = {
  id: string
  tittel: string
  fag: string
  trinn: string
  tema: string
  maal: Kompetansemaal[]
  kategorier: Kategori[]
  finale: { kategori: string; sporsmal: string; svar: string }
  endret: string
}

export type Tema = 'tavle' | 'studio' | 'lys' | 'fargerik'
export type Poengskala = 100 | 200 | 1

export type Spillmodus = 'klassisk' | 'lynrunde' | 'rolig' | 'egen'

export type Innstillinger = {
  modus: Spillmodus
  /** Hvem svarer først: laget som valgte ruten, eller den som rekker opp hånda først. */
  forstSvar: 'tur' | 'alle'
  /** Hvem velger neste rute: laget som svarte riktig, neste lag i rekken, eller fritt. */
  tur: 'riktig' | 'rekke' | 'fri'
  feilSvar: 'minus' | 'null'
  tidtaker: boolean
  sekunder: number
  /** Når andre lag kan svare: etter feil svar eller når tiden går ut, bare etter feil svar, eller aldri. */
  stjele: 'feilOgTid' | 'feil' | 'av'
  /** Tid for de andre lagene, 0 = ingen tidtaker. */
  stjeleSekunder: number
  stjelePoeng: 'full' | 'halv'
  /** Hvordan andre lag melder seg. Buzzer kommer senere. */
  melding: 'hand' | 'buzzer'
  antallDobbel: number
  /** Spilletid i minutter, 0 = til alle ruter er brukt. */
  spilletid: number
  finale: boolean
  lyd: boolean
  tema: Tema
  poengskala: Poengskala
  storTekst: boolean
}

export type Lag = { navn: string; farge: string; poeng: number }

export type Spilltilstand = {
  brett: Brett
  innstillinger: Innstillinger
  lag: Lag[]
  brukt: string[]
  dobbel: string[]
  fase: 'brett' | 'finale' | 'slutt'
  /** Laget som skal velge neste rute. */
  tur?: number
  /** Når spillet startet (ms), for spilletid. */
  startet?: number
}

export type Valg = { fag: string; trinn: string; tema: string; maal: Kompetansemaal[] }
