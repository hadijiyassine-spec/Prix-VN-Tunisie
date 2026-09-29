// Effet des fortes baisses de tarif de septembre 2026 sur la valeur vénale.
//   node effet_baisses.js
//
// Pourquoi ce script : le calcul est ancré sur le DERNIER tarif de la phase (méthode B) et
// plafonné au prix neuf du jour. Une finition dont le tarif chute de 20 % voit donc sa valeur
// vénale chuter d'autant — pour TOUS les millésimes, y compris ceux achetés au prix d'avant.
// C'est le seul effet de la fusion qui change des valeurs déjà rendues par l'application :
// il doit être vu et accepté, pas découvert après coup sur un rapport d'expertise.
const fs = require('fs');

const lire = ch => {
  const l = fs.readFileSync(ch, 'utf8').split(/\r?\n/);
  const i = l.findIndex(x => x.startsWith('window.DB='));
  return JSON.parse(l[i].slice('window.DB='.length).replace(/;\s*$/, ''));
};
const A = lire('data.js');
const B = lire('data.candidat.js');
const cle = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

// Décote d'âge du jeu P5, gamme déduite de la valeur à neuf, pour un véhicule de 2 ans.
const TAUX = ven => ven <= 100000 ? 0.0580 : ven <= 180000 ? 0.0750 : 0.0950;
const AGE = 2;

const lignes = [];
for (const m of Object.keys(B)) for (const mo of Object.keys(B[m])) for (const g of B[m][mo]) {
  const h = g.hist;
  if (h.length < 2 || !h[h.length - 1].d.endsWith('2026')) continue;
  const neuf = h[h.length - 1].p, avant = h[h.length - 2].p;
  const bais = neuf / avant - 1;
  if (bais > -0.15) continue;
  // Valeur avant fusion : le dernier tarif que data.js connaissait pour cette finition.
  const fA = (A[m] && A[m][mo]) ? A[m][mo].find(x => cle(x.v) === cle(g.v)) : null;
  const neufA = fA ? fA.p : null;
  const vvA = neufA ? neufA * Math.pow(1 - TAUX(neufA), AGE) : null;
  const vvB = neuf * Math.pow(1 - TAUX(neuf), AGE);
  lignes.push({ modele: mo, version: g.v, date: h[h.length - 1].d,
    neufAvant: neufA, neufApres: neuf, baisseTarif: bais,
    vvAvant: vvA, vvApres: vvB, effetVV: vvA ? (vvB / vvA - 1) : null });
}
lignes.sort((a, b) => a.baisseTarif - b.baisseTarif);

const fmt = n => n == null ? '     —' : String(Math.round(n)).padStart(7);
const pct = p => p == null ? '    —' : ((p > 0 ? '+' : '') + (Math.round(p * 1000) / 10).toFixed(1) + ' %').padStart(8);
console.log(lignes.length + ' finition(s) en baisse de 15 % ou plus sur le dernier relevé de 2026.\n');
console.log('modèle · finition'.padEnd(52) + '  neuf av.  neuf ap.  tarif      VV 2 ans av.  ap.    effet VV');
for (const l of lignes)
  console.log((l.modele + ' · ' + l.version).slice(0, 50).padEnd(52) + fmt(l.neufAvant) + '  ' + fmt(l.neufApres) +
    '  ' + pct(l.baisseTarif) + '   ' + fmt(l.vvAvant) + '  ' + fmt(l.vvApres) + '  ' + pct(l.effetVV));

const avecEffet = lignes.filter(l => l.effetVV != null && Math.abs(l.effetVV) > 0.005);
console.log('\nFinitions dont la valeur vénale change réellement : ' + avecEffet.length + ' / ' + lignes.length);
console.log('Les autres sont des finitions NOUVELLES (aucune valeur rendue auparavant) ou dont le tarif');
console.log('de référence dans data.js était déjà celui d\'après la baisse : la baisse est interne au');
console.log('classeur et ne modifie aucune valeur que l\'application rendait déjà.');
