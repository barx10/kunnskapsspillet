// Henter LK20-kompetansemål fra Udirs Grep-API og lagrer et øyeblikksbilde i src/data.
// Kjør: node scripts/hent-kompetansemaal.mjs
import { writeFile } from 'node:fs/promises'

const BASE = 'https://data.udir.no/kl06/v201906'
const FAG = {
  Norsk: 'NOR01-06',
  Matematikk: 'MAT01-05',
  Naturfag: 'NAT01-04',
  Samfunnsfag: 'SAF01-04',
  KRLE: 'RLE01-03',
  Engelsk: 'ENG01-04',
  'Kunst og håndverk': 'KHV01-02',
  'Mat og helse': 'MHE01-02',
  'Kroppsøving': 'KRO01-05',
  Musikk: 'MUS01-02',
}

const tekst = (felt) => {
  if (!felt) return ''
  if (typeof felt === 'string') return felt
  const liste = Array.isArray(felt) ? felt : felt.tekst ?? []
  return (liste.find((t) => t.spraak === 'nob') ?? liste.find((t) => t.spraak === 'default'))?.verdi ?? ''
}
const status = (o) => (o.status ?? '').split('/').pop()

async function hent(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function gjeldendePlan(kode) {
  let plan = await hent(`${BASE}/laereplaner-lk20/${kode}`)
  while (status(plan) !== 'status_publisert' && plan['erstattes-av']?.length) {
    plan = await hent(plan['erstattes-av'][0]['url-data'])
  }
  return plan
}

const resultat = { hentet: new Date().toISOString().slice(0, 10), kilde: 'Utdanningsdirektoratet (data.udir.no), NLOD', fag: [] }

for (const [navn, kode] of Object.entries(FAG)) {
  try {
    const plan = await gjeldendePlan(kode)
    const sett = []
    for (const s of plan['kompetansemaal-kapittel']?.kompetansemaalsett ?? []) {
      if (status(s) === 'status_utgaatt') continue
      const full = await hent(s['url-data'])
      const tittel = tekst(full.tittel)
      if (!/trinn|vg\d/i.test(tittel)) continue
      const maal = (full.kompetansemaal ?? []).map((m) => ({ kode: m.kode, tekst: tekst(m.tittel) })).filter((m) => m.tekst)
      if (maal.length) sett.push({ kode: full.kode, tittel: tittel.replace(/^Kompetansemål (og vurdering )?(etter )?/i, ''), maal })
    }
    resultat.fag.push({ navn, laereplan: plan.kode, sett })
    console.log(`${navn} (${plan.kode}): ${sett.map((s) => `${s.tittel} [${s.maal.length}]`).join(', ')}`)
  } catch (e) {
    console.error(`${navn}: ${e.message}`)
  }
}

await writeFile(new URL('../src/data/kompetansemaal.json', import.meta.url), JSON.stringify(resultat, null, 1))
