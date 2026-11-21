# Kunnskapsspillet

Et quizspill for klasserommet. Læreren velger fag, trinn og kompetansemål og lager et brett med
kategorier og poeng. Klassen deles i lag, og spillet vises på storskjermen.

**Nettside:** https://kunnskapsspillet.laererliv.no

## Funksjoner
- Kompetansemål fra LK20 for ti fag, hentet fra Udirs åpne data (`src/data/kompetansemaal.json`).
- Redigering av brett med 3–6 kategorier og 3–5 spørsmål per kategori, pluss finalespørsmål.
- 2–6 lag, poengtavle, angreknapp og manuell justering av poeng.
- Innstillinger: minuspoeng eller 0 ved feil svar, tidtaker (15–90 s eller egen tid), andre lag kan
  svare, dobbel-ruter, finalerunde, lyd, fire visuelle temaer, poengskala og stor tekst.
- Brett lagres i nettleseren og kan lastes ned og deles som filer.
- Ingen innlogging, ingen elevdata, ingen sporing.

## Utvikling
```sh
npm install
npm run dev
```

Oppdatere kompetansemålene fra Udir:
```sh
node scripts/hent-kompetansemaal.mjs
```

Ved push til `main` publiseres siden til GitHub Pages med `.github/workflows/pages.yml`.
Se `PLAN.md` for videre utvikling.
