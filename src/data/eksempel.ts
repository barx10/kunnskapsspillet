import type { Brett } from '../types'
import data from './kompetansemaal.json'

const naturfag7 = data.fag.find((f) => f.navn === 'Naturfag')?.sett.find((s) => s.tittel.trim() === '7. trinn')
const koder = ['KM13852', 'KM13841', 'KM13850', 'KM13846', 'KM13847', 'KM13845', 'KM13848']

const k = (navn: string, par: [string, string][]) => ({ navn, sporsmal: par.map(([sporsmal, svar]) => ({ sporsmal, svar })) })

export const eksempelbrett: Brett = {
  id: 'eksempel-naturfag-7',
  tittel: 'Naturfag 7. trinn – eksempel',
  fag: 'Naturfag',
  trinn: '7. trinn',
  tema: 'Stoffer, kroppen, verdensrommet og naturen',
  maal: naturfag7?.maal.filter((m) => koder.includes(m.kode)) ?? [],
  kategorier: [
    k('Stoffer', [
      ['Hva heter det når vann går fra væske til gass?', 'Fordamping'],
      ['Hvilke tre tilstandsformer kan stoffer ha?', 'Fast stoff, væske og gass'],
      ['Hva skjer med partiklene i et stoff når det blir varmere?', 'De beveger seg raskere og får større avstand til hverandre'],
      ['Hva heter det når et stoff går rett fra fast form til gass?', 'Sublimasjon'],
      ['Nevn to tegn på at en kjemisk reaksjon har skjedd.', 'For eksempel: nye stoffer dannes, fargen endres, det bobler gass, eller det avgis lys eller varme'],
    ]),
    k('Kroppen', [
      ['Hvilket organ pumper blodet rundt i kroppen?', 'Hjertet'],
      ['Hvilket organsystem tar opp oksygen fra lufta?', 'Respirasjonssystemet (lungene)'],
      ['Omtrent hvor mange bein har et voksent menneske?', 'Omtrent 206'],
      ['Hva heter blodårene som fører blodet bort fra hjertet?', 'Arterier (pulsårer)'],
      ['Hvor tas det meste av næringsstoffene opp i fordøyelsen?', 'I tynntarmen'],
    ]),
    k('Verdensrommet', [
      ['Hvilken planet er nærmest sola?', 'Merkur'],
      ['Hvorfor har vi dag og natt?', 'Jorda roterer rundt sin egen akse, én gang i døgnet'],
      ['Hvor lang tid bruker jorda på én runde rundt sola?', 'Omtrent ett år (365,25 døgn)'],
      ['Hvorfor har vi årstider?', 'Jordaksen heller, så sollyset treffer nord- og sørhalvkula ulikt gjennom året'],
      ['Nevn to ting som gjør at det kan være liv på jorda.', 'For eksempel: flytende vann, passe avstand til sola, en atmosfære med oksygen, og et magnetfelt som beskytter mot stråling'],
    ]),
    k('Livet i naturen', [
      ['Hva kaller vi en organisme som lager sin egen næring ved hjelp av sollys?', 'En produsent, for eksempel en plante'],
      ['Hva heter prosessen der planter lager næring av lys, vann og karbondioksid?', 'Fotosyntese'],
      ['Hva er en nedbryter? Gi et eksempel.', 'En organisme som bryter ned døde planter og dyr, for eksempel sopp, bakterier eller meitemark'],
      ['Lag en næringskjede med tre ledd.', 'For eksempel: gress → hare → rev'],
      ['Hva betyr biologisk mangfold?', 'Variasjonen av arter, gener og naturtyper (økosystemer)'],
    ]),
    k('Jorda', [
      ['Hva heter den smeltede steinen som renner ut av en vulkan?', 'Lava'],
      ['Hva kaller vi de store bitene jordskorpa er delt opp i?', 'Kontinentalplater (tektoniske plater)'],
      ['Hvilke tre hovedtyper bergarter finnes?', 'Størkningsbergarter, avsetningsbergarter og omdanningsbergarter'],
      ['Hva kaller vi det når vind, vann og is flytter stein og jord?', 'Erosjon'],
      ['Hva formet de dype fjordene i Norge?', 'Isbreer under istidene'],
    ]),
  ],
  finale: {
    kategori: 'Månen',
    sporsmal: 'Hvorfor ser månen ulik ut gjennom en måned?',
    svar: 'Månen går i bane rundt jorda, og vi ser ulike deler av den siden som er belyst av sola',
  },
  endret: '2026-11-21T00:00:00.000Z',
}
