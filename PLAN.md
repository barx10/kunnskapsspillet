# Kunnskapsspillet

Quizspill med kategorier og poengverdier på et brett hele klassen ser. Elevene spiller i lag.
Læreren lager brett knyttet til fag, tema og kompetansemål.

## Kjerneidé

- **Brett:** 5–6 kategorier × 5 spørsmål (100–500 poeng). Ruter som er brukt, blir grå.
- **Lag:** 2–6 lag med navn og farge. Poengtavle synlig hele tiden.
- **Lærerstyrt:** læreren åpner ruter, viser svaret og gir poeng (riktig: +, feil: − eller 0).
- **Spesialruter:** «Dobbel» (laget satser selv) og en finalerunde der alle lag satser.

## Faser

### Fase 1: Hovedskjerm (MVP) – ferdig
- Alt på én skjerm, læreren styrer med mus eller tastatur.
- Redigering av brett: fag, trinn, tema, kategorier, spørsmål/svar, valgfritt bilde.
- Lagring i nettleseren (localStorage) + eksport/import som JSON-fil, så lærere kan dele brett.
- Fullskjerm, tidtaker, lyder (kan skrus av), store fonter som er lesbare bakerst i klasserommet.
- Ingen innlogging og ingen elevdata.

### Fase 2: Kompetansemål – ferdig (snapshot av 10 fag)
- Velg fag og trinn → velg kompetansemål fra LK20 (Udirs åpne læreplandata, Grep).
- Starter med en lagret JSON-snapshot for utvalgte fag; henter fra Udir senere.
- Brettet viser hvilke mål det dekker (nyttig for planlegging og dokumentasjon).

### Fase 3: KI-hjelp (valgfritt, BYOK) – ferdig i første versjon
- «Foreslå spørsmål» ut fra tema, trinn og kompetansemål. Læreren går gjennom og redigerer alt
  før bruk.
- Læreren bruker sin egen API-nøkkel (Claude eller Gemini). Nøkkelen lagres bare i nettleseren,
  og kallene går rett fra nettleseren til leverandøren. Vi har ingen server og ingen kostnad.
- Appen fungerer fullt ut uten nøkkel. Bare innhold læreren selv har skrevet sendes, aldri
  elevdata.

### Fase 4: Elevenheter (vurderes)
- Romkode → ett nettbrett/én PC per lag som buzzer.
- Krever sanntidsbackend (f.eks. Supabase Realtime).
- Merk: mobilforbud på mange skoler, så hvis vi lager det, bør det være én enhet per lag og ikke
  elevenes egne mobiler.

### Fase 5: Deling
- Kontoer for lærere, delte brett på tvers av skolen, et bibliotek med ferdige brett.

## Flyt
1. **Startskjerm:** «Kunnskapsspillet». Knappene «Nytt spill» og «Mine brett».
2. **Velg fag → tema → kompetansemål** (flere mål kan velges).
3. **Brett:** velg et lagret brett eller lag nytt (manuelt eller med KI-forslag).
4. **Innstillinger og lag.**
5. **Spill → resultatskjerm.**

## Spillinnstillinger (per spill)
- Feil svar: minuspoeng eller 0.
- Tidtaker: av/på og antall sekunder (f.eks. 15/30/45/60/egendefinert).
- Om andre lag kan prøve («stjele») hvis et lag svarer feil.
- Dobbel-ruter og finalerunde: av/på.
- Lyd: av/på.

## Visuelle valg
- Tema: Klassisk (mørkeblå/gull), Lys (høy kontrast for projektor i lyse rom), Mørk, Fargerik
  (barnetrinn).
- Brettstørrelse: 3–6 kategorier × 3–5 spørsmål.
- Poengskala: 100–500, 200–1000 eller 1–5.
- Tekststørrelse: normal/stor.

## Sikkerhet (BYOK)
- Ingen tredjepartsskript eller analyse, og en streng Content-Security-Policy som bare tillater
  kall til KI-leverandørene.
- Aldri rendre HTML fra importerte brett eller KI-svar. Alt vises som ren tekst.
- Nøkkelen huskes bare for økten som standard (sessionStorage). «Husk på denne maskinen» velges
  aktivt. Knapp for å slette nøkkelen.
- Nøkkelfeltet er maskert, så nøkkelen ikke vises på projektoren.
- Egen origin: GitHub Pages deler origin (brukernavn.github.io) mellom alle repoene dine. Bruk
  eget (sub)domene slik at andre prosjekter ikke kan lese nøkkelen.
- Anbefal lærere å sette et utgiftstak hos leverandøren.

## Åpne spørsmål
- Buzzer per lag er bygget (Cloudflare Worker + Durable Object, mappen buzzer/). Bare når alle lag svarer med en gang (Lynrunde).
- Hvilke fag/trinn skal vi starte med?

## Teknisk
- Vite + React + TypeScript + Tailwind som en statisk app, hostet på GitHub Pages med GitHub Actions.
- Hele fase 1–3 er ren frontend, også KI-delen siden den bruker BYOK.
- Fase 4 (buzzer) kan bruke Supabase Realtime rett fra nettleseren, så den kan også ligge
  statisk. Vercel er reserveløsningen hvis vi trenger serverkode senere.

## Navn
«Jeopardy» er et varemerke, så appen har eget navn og eget visuelt uttrykk.
