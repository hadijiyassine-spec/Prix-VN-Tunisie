// MOTORISATIONS À DÉFAUT CONNU — identification dans la base, pour relecture avant tout malus.
//
// Demande de Yassine Hadiji le 29.09.2026 : recenser les défauts connus des véhicules présents
// sur le marché tunisien, pour arrêter la décote. Chaque famille ci-dessous porte :
//   · le défaut, tel que la presse spécialisée et les rappels constructeurs le documentent ;
//   · la PÉRIODE DE PRODUCTION concernée — c'est elle qui compte, pas le modèle : le même modèle
//     change de moteur, et un défaut corrigé ne doit plus peser sur les millésimes suivants ;
//   · la règle de reconnaissance dans les libellés de data.js, et ses exclusions nominatives.
//
// Ce script N'APPLIQUE RIEN. Il liste, il compte, il donne des exemples. Un malus posé sur un
// moteur mal reconnu est pire que pas de malus : il déplace la valeur du mauvais véhicule.
const fs = require('fs');
const lire = ch => {
  const l = fs.readFileSync(ch, 'utf8').split(/\r?\n/);
  const i = l.findIndex(x => x.startsWith('window.DB='));
  return JSON.parse(l[i].slice('window.DB='.length).replace(/;\s*$/, ''));
};
const DB = lire('data.js');
const yOf = d => +d.slice(6);

// Un libellé complet : marque + modèle + finition + ce que la fiche technique dit du moteur.
const txt = (b, mo, f) => (b + ' ' + mo + ' ' + f.v + ' ' +
  ((f.eg && (f.eg.motor || f.eg.moteur || f.eg.fuel)) || '') + ' ' + ((f.sp && (f.sp.moteur || f.sp.carburant)) || ''));
const estDiesel = (b, mo, f) => /diesel|hdi|bluehdi|\bdci\b|\btdi\b|\bcrdi\b|\bcdi\b|d-4d|🛢/i.test(txt(b, mo, f));
const estElecOuHybride = (b, mo, f) => /⚡|🔌|🌿|élec|electr|hybride/i.test(txt(b, mo, f));

const FAMILLES = [
  {
    nom: 'PureTech / EB2 essence 1.0-1.2 (Stellantis)',
    defaut: 'courroie de distribution HUMIDE qui se délite dans l\'huile, colmate la crépine de pompe à ' +
            'huile et détruit le moteur ; surconsommation d\'huile associée. Courroie modifiée en 2017-2018 ' +
            'sans que les ruptures cessent ; chaîne à partir de 2023, avec un défaut de calage sur les ' +
            'exemplaires produits jusqu\'au 17.02.2024.',
    periode: [2012, 2024],
    marques: { 'Peugeot': 2013, 'Citroën': 2013, 'DS': 2013, 'Opel': 2020, 'Vauxhall': 2020 },
    // La 108 et la C1 partagent leur moteur avec la Toyota Aygo (1KR Toyota), pas avec le PureTech.
    // Les Opel d'avant 2020 ont leurs propres 1.0 / 1.2 (ecoFLEX, Twinport).
    exclus: [/peugeot 108/i, /citroën c1/i, /citroen c1/i],
    reconnait: (b, mo, f) => {
      if (estDiesel(b, mo, f) || estElecOuHybride(b, mo, f)) return null;
      const t = txt(b, mo, f);
      if (/puretech|pure tech/i.test(t)) return 'libellé PureTech';
      if (/(^|[^0-9.])1[.,]2(\s|$|[^0-9])/.test(t)) return 'essence 1.2 (EB2) de la période';
      return null;
    },
  },
  {
    nom: 'Renault 1.2 TCe H5Ft (Renault, Dacia, Nissan)',
    defaut: 'segments de piston défaillants (rappel R/2019/050) : l\'huile est aspirée dans les cylindres, ' +
            '0,5 à 1,5 L/1 000 km dans les cas avancés, casse moteur entre 40 000 et 150 000 km. ' +
            'Production fautive du 01.10.2012 au 20.07.2016 ; moteur au catalogue jusqu\'en 2018.',
    periode: [2012, 2018],
    marques: { 'Renault': 2012, 'Dacia': 2012, 'Nissan': 2012 },
    exclus: [],
    reconnait: (b, mo, f) => {
      if (estDiesel(b, mo, f) || estElecOuHybride(b, mo, f)) return null;
      const t = txt(b, mo, f);
      if (/\btce\b/i.test(t) && /(^|[^0-9.])1[.,]2(\s|$|[^0-9])/.test(t)) return '1.2 TCe';
      return null;
    },
  },
  {
    nom: 'Hyundai / Kia Theta II GDI 2.0 et 2.4',
    defaut: 'débris métalliques laissés dans les canaux d\'huile du vilebrequin à la fabrication : usure ' +
            'puis rupture des coussinets de bielle, casse moteur, parfois incendie. Rappels massifs aux ' +
            'États-Unis, millésimes 2011 à 2019 (Sonata, Santa Fe, Tucson, Optima, Sportage, Sorento).',
    periode: [2011, 2019],
    marques: { 'Hyundai': 2011, 'KIA': 2011, 'Kia': 2011, 'Genesis': 2011 },
    exclus: [],
    reconnait: (b, mo, f) => {
      if (estDiesel(b, mo, f) || estElecOuHybride(b, mo, f)) return null;
      const t = txt(b, mo, f);
      if (/\bgdi\b/i.test(t) && /(^|[^0-9.])2[.,][04](\s|$|[^0-9])/.test(t)) return '2.0 / 2.4 GDI';
      return null;
    },
  },
  {
    nom: 'Volkswagen 1.4 TSI EA111 (avant juillet 2012)',
    defaut: 'chaîne de distribution qui s\'allonge avant 80 000 km — bruit à froid, saut de chaîne, ' +
            'soupapes cassées — pistons fragiles et consommation d\'huile jusqu\'à 1 L/1 000 km. ' +
            'Corrigé avec l\'EA211 à partir de juillet 2012.',
    periode: [2007, 2012],
    marques: { 'Volkswagen': 2007, 'Seat': 2007, 'Skoda': 2007, 'Audi': 2007 },
    exclus: [],
    reconnait: (b, mo, f) => {
      if (estDiesel(b, mo, f) || estElecOuHybride(b, mo, f)) return null;
      const t = txt(b, mo, f);
      if (/\btsi\b/i.test(t) && /(^|[^0-9.])1[.,]4(\s|$|[^0-9])/.test(t)) return '1.4 TSI';
      return null;
    },
  },
  {
    nom: 'Boîte DSG 7 à sec DQ200 (groupe VW)',
    defaut: 'mécatronique défaillante entre 80 000 et 180 000 km : à-coups violents, refus d\'engager la ' +
            'première, calage en pente. Réputation durablement mauvaise sur les premières séries.',
    periode: [2008, 2016],
    marques: { 'Volkswagen': 2008, 'Seat': 2008, 'Skoda': 2008, 'Audi': 2008 },
    exclus: [],
    reconnait: (b, mo, f) => {
      const t = txt(b, mo, f);
      if (/\bdsg\b|s-?tronic/i.test(t)) return 'boîte DSG / S-tronic';
      return null;
    },
  },
  {
    nom: 'Boîte CVT Xtronic Jatco (Nissan)',
    defaut: 'surchauffe et fragilité mécanique : défaillances documentées dès 60 000 km, systématiques ' +
            'entre 80 000 et 130 000 km. Générations d\'avant 2017 les plus touchées.',
    periode: [2007, 2017],
    marques: { 'Nissan': 2007, 'Renault': 2007 },
    exclus: [],
    reconnait: (b, mo, f) => {
      const t = txt(b, mo, f);
      if (/\bcvt\b|xtronic/i.test(t)) return 'boîte CVT / Xtronic';
      return null;
    },
  },
  {
    nom: 'BMW N47 diesel 2.0 (2007 à fin 2011)',
    defaut: 'chaîne de distribution placée côté boîte, dans une zone surchauffée : usure puis rupture ' +
            'avant 100 000 km. Les millésimes 2007 à 2009 sont les plus fragiles ; patins et guides ' +
            'modifiés en usine ensuite.',
    periode: [2007, 2011],
    marques: { 'BMW': 2007 },
    exclus: [],
    reconnait: (b, mo, f) => {
      if (!estDiesel(b, mo, f)) return null;
      const t = txt(b, mo, f);
      if (/\b(1(1[68]|20)|3(16|18|20)|4(18|20)|5(18|20)|X1\s*(18|20)|X3\s*(18|20))\s*d\b/i.test(t) ||
          /(^|[^0-9.])2[.,]0\s*d\b/i.test(t)) return 'quatre cylindres 2.0 diesel de la période';
      return null;
    },
  },
  {
    nom: 'Mercedes OM651 diesel (2008 à 2013)',
    defaut: 'injecteurs piézo Delphi qui se grippent dans la culasse, chaîne de distribution qui ' +
            's\'allonge sur les millésimes 2008-2013, volant bi-masse au-delà de 180 000 km. ' +
            'Nettement fiabilisé sur les Euro 6 d\'après 2014.',
    periode: [2008, 2013],
    marques: { 'Mercedes-Benz': 2008, 'Mercedes': 2008 },
    exclus: [],
    reconnait: (b, mo, f) => {
      if (!estDiesel(b, mo, f)) return null;
      const t = txt(b, mo, f);
      if (/\b(180|200|220|250)\s*(cdi|d)\b/i.test(t) || /(^|[^0-9.])2[.,][12]\s*cdi/i.test(t)) return 'quatre cylindres CDI de la période';
      return null;
    },
  },
];

console.log('MOTORISATIONS À DÉFAUT CONNU — recensement dans data.js. RIEN N\'EST APPLIQUÉ.\n');
console.log('Règle commune : le malus suivrait la PÉRIODE DE PRODUCTION du défaut, pas le modèle.');
console.log('Une finition n\'est retenue ici que si sa série tarifaire recoupe cette période.\n');

const total = {};
for (const fam of FAMILLES) {
  const hits = [];
  for (const b of Object.keys(DB)) {
    const debutMarque = fam.marques[b];
    if (debutMarque == null) continue;
    for (const mo of Object.keys(DB[b])) {
      if (fam.exclus.some(r => r.test(mo))) continue;
      for (const f of DB[b][mo]) {
        const motif = fam.reconnait(b, mo, f);
        if (!motif) continue;
        // La série doit recouper la période du défaut.
        const a0 = yOf(f.d0), a1 = yOf(f.d);
        const bas = Math.max(fam.periode[0], debutMarque);
        if (a1 < bas || a0 > fam.periode[1]) continue;
        hits.push({ b, mo, v: f.v, motif, de: a0, a: a1, p: f.p });
        total[b + '|' + mo + '|' + f.v] = (total[b + '|' + mo + '|' + f.v] || 0) + 1;
      }
    }
  }
  console.log('══════════════════════════════════════════════════════════════');
  console.log(fam.nom + '   —   ' + hits.length + ' finition(s) de la base');
  console.log('  période retenue : millésimes ' + fam.periode[0] + ' à ' + fam.periode[1]);
  console.log('  défaut : ' + fam.defaut.replace(/\s+/g, ' '));
  const parMarque = {};
  for (const h of hits) (parMarque[h.b] = parMarque[h.b] || []).push(h);
  for (const m of Object.keys(parMarque)) {
    const parMod = {};
    for (const h of parMarque[m]) (parMod[h.mo] = parMod[h.mo] || []).push(h);
    console.log('  ' + m + ' : ' + Object.keys(parMod).map(mo => mo.replace(m + ' ', '') + ' (' + parMod[mo].length + ')').join(', '));
  }
  if (hits.length) console.log('  exemples : ' + hits.slice(0, 3).map(h => h.mo + ' · ' + h.v + ' [' + h.de + '-' + h.a + ']').join('   |   '));
  fam.hits = hits;
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log('RÉCAPITULATIF');
let n = 0;
for (const fam of FAMILLES) { console.log('  ' + String(fam.hits.length).padStart(4) + '  ' + fam.nom); n += fam.hits.length; }
console.log('  ' + String(n).padStart(4) + '  total des occurrences (une finition peut cumuler deux défauts,');
console.log('        par exemple un 1.4 TSI avec boîte DSG)');
const cumul = Object.entries(total).filter(([, v]) => v > 1);
console.log('\n  finitions portant DEUX défauts : ' + cumul.length +
  (cumul.length ? ' — ex. ' + cumul.slice(0, 3).map(([k]) => k.split('|').slice(1).join(' · ')).join(' | ') : ''));
console.log('\nÀ trancher avant toute application :');
console.log('  1. la reconnaissance est-elle juste, famille par famille ? (c\'est un fait technique)');
console.log('  2. quel malus pour quel défaut — un moteur qui casse ne décote pas comme une boîte qui broute ;');
console.log('  3. le malus se cumule-t-il quand un véhicule porte deux défauts, ou retient-on le plus fort ?');
console.log('  4. le malus doit-il s\'éteindre avec l\'âge, quand le défaut s\'est déjà manifesté ou non ?');
