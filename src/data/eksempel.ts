import type { Brett } from '../types'
import data from './kompetansemaal.json'

const naturfag7 = data.fag.find((f) => f.navn === 'Naturfag')?.sett.find((s) => s.tittel.trim() === '7. trinn')
const koder = ['KM13852', 'KM13841', 'KM13850', 'KM13846', 'KM13847', 'KM13845', 'KM13848']

const k = (navn: string, rader: [string, string, string[]?][]) => ({
  navn,
  sporsmal: rader.map(([sporsmal, svar, alternativer]) => ({ sporsmal, svar, ...(alternativer ? { alternativer } : {}) })),
})

export const eksempelbrett: Brett = {
  id: 'eksempel-naturfag-7',
  tittel: 'Naturfag 7. trinn – eksempel',
  fag: 'Naturfag',
  trinn: '7. trinn',
  alder: '7. trinn',
  tema: 'Stoffer, kroppen, verdensrommet og naturen',
  maal: naturfag7?.maal.filter((m) => koder.includes(m.kode)) ?? [],
  kategorier: [
    k('Stoffer', [
      ['Hva heter det når vann går fra væske til gass?', 'Fordamping', ['Kondensering', 'Smelting', 'Frysing']],
      ['Hvilke tre tilstandsformer kan stoffer ha?', 'Fast stoff, væske og gass', ['Fast stoff, væske og lys', 'Is, vann og snø', 'Metall, plast og tre']],
      ['Hva skjer med partiklene i et stoff når det blir varmere?', 'De beveger seg raskere og får større avstand til hverandre', ['De beveger seg saktere og kommer nærmere hverandre', 'Partiklene blir større', 'Partiklene står helt stille']],
      ['Hva heter det når et stoff går rett fra fast form til gass?', 'Sublimasjon', ['Fordamping', 'Kondensering', 'Størkning']],
      ['Nevn to tegn på at en kjemisk reaksjon har skjedd.', 'For eksempel: nye stoffer dannes, fargen endres, det bobler gass, eller det avgis lys eller varme'],
    ]),
    k('Kroppen', [
      ['Hvilket organ pumper blodet rundt i kroppen?', 'Hjertet', ['Lungene', 'Leveren', 'Nyrene']],
      ['Hvilket organsystem tar opp oksygen fra lufta?', 'Respirasjonssystemet (lungene)', ['Fordøyelsessystemet', 'Nervesystemet', 'Skjelettet']],
      ['Omtrent hvor mange bein har et voksent menneske?', 'Omtrent 206', ['Omtrent 50', 'Omtrent 106', 'Omtrent 506']],
      ['Hva heter blodårene som fører blodet bort fra hjertet?', 'Arterier (pulsårer)', ['Vener (blodårer)', 'Kapillærer (hårrørsårer)', 'Nerver']],
      ['Hvor tas det meste av næringsstoffene opp i fordøyelsen?', 'I tynntarmen', ['I magesekken', 'I tykktarmen', 'I spiserøret']],
    ]),
    k('Verdensrommet', [
      ['Hvilken planet er nærmest sola?', 'Merkur', ['Venus', 'Mars', 'Jorda']],
      ['Hvorfor har vi dag og natt?', 'Jorda roterer rundt sin egen akse, én gang i døgnet', ['Sola går rundt jorda, én gang i døgnet', 'Månen skygger for sola halve døgnet', 'Jorda går rundt sola, én gang i døgnet']],
      ['Hvor lang tid bruker jorda på én runde rundt sola?', 'Omtrent ett år (365,25 døgn)', ['Ett døgn', 'Omtrent én måned', 'Omtrent ti år']],
      ['Hvorfor har vi årstider?', 'Jordaksen heller, så sollyset treffer nord- og sørhalvkula ulikt gjennom året', ['Jorda er mye nærmere sola om sommeren enn om vinteren', 'Sola lyser sterkere om sommeren enn om vinteren', 'Månen varmer opp jorda i deler av året']],
      ['Nevn to ting som gjør at det kan være liv på jorda.', 'For eksempel: flytende vann, passe avstand til sola, en atmosfære med oksygen, og et magnetfelt som beskytter mot stråling'],
    ]),
    k('Livet i naturen', [
      ['Hva kaller vi en organisme som lager sin egen næring ved hjelp av sollys?', 'En produsent, for eksempel en plante', ['En konsument, for eksempel en hare', 'En nedbryter, for eksempel en sopp', 'Et rovdyr, for eksempel en rev']],
      ['Hva heter prosessen der planter lager næring av lys, vann og karbondioksid?', 'Fotosyntese', ['Forbrenning', 'Fordøyelse', 'Fordamping']],
      ['Hva er en nedbryter? Gi et eksempel.', 'En organisme som bryter ned døde planter og dyr, for eksempel sopp, bakterier eller meitemark', ['Et dyr som jakter og spiser andre dyr, for eksempel ulv, gaupe eller ørn', 'En plante som lager næring av sollys, for eksempel gress, mose eller bjørk', 'Et dyr som bare spiser planter, for eksempel elg, hare eller sau']],
      ['Lag en næringskjede med tre ledd.', 'For eksempel: gress → hare → rev'],
      ['Hva betyr biologisk mangfold?', 'Variasjonen av arter, gener og naturtyper (økosystemer)', ['Hvor mange dyr det finnes i en skog', 'At alle arter lever på samme sted', 'At planter og dyr blir like store']],
    ]),
    k('Jorda', [
      ['Hva heter den smeltede steinen som renner ut av en vulkan?', 'Lava', ['Magma', 'Aske', 'Basalt']],
      ['Hva kaller vi de store bitene jordskorpa er delt opp i?', 'Kontinentalplater (tektoniske plater)', ['Kontinenter', 'Fjellkjeder', 'Bergarter']],
      ['Hvilke tre hovedtyper bergarter finnes?', 'Størkningsbergarter, avsetningsbergarter og omdanningsbergarter', ['Granitt, kalkstein og sandstein', 'Leire, grus og sand', 'Vulkanbergarter, havbergarter og fjellbergarter']],
      ['Hva kaller vi det når vind, vann og is flytter stein og jord?', 'Erosjon', ['Forvitring', 'Avsetning', 'Fotosyntese']],
      ['Hva formet de dype fjordene i Norge?', 'Isbreer under istidene', ['Jordskjelv for lenge siden', 'Store vulkanutbrudd', 'Elver som rant fra havet']],
    ]),
  ],
  finale: {
    kategori: 'Månen',
    sporsmal: 'Hvorfor ser månen ulik ut gjennom en måned?',
    svar: 'Månen går i bane rundt jorda, og vi ser ulike deler av den siden som er belyst av sola',
  },
  endret: '2026-11-21T00:00:00.000Z',
}
