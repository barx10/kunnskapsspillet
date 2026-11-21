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

export type Innstillinger = {
  feilSvar: 'minus' | 'null'
  tidtaker: boolean
  sekunder: number
  stjele: boolean
  dobbel: boolean
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
}

export type Valg = { fag: string; trinn: string; tema: string; maal: Kompetansemaal[] }
