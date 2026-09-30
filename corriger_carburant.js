// Porte les corrections d'énergie DANS data.js, en rejouant la table CARBURANTS_VERIFIES
// d'index.html — la même table, pas une copie : deux listes finiraient par divergier.
//
//   node corriger_carburant.js            → contrôle seul, n'écrit rien
//   node corriger_carburant.js --ecrire   → applique dans data.js
//
// Pourquoi porter la correction dans la base alors que la table est rejouée au démarrage :
// pour la même raison que les relevés vérifiés de la v51. La base est ce qui sert aux scripts
// de contrôle, aux audits et à l'indice recalculé hors de l'application ; la table est le filet
// qui rattrape une régénération. L'une sans l'autre laisse un trou.
const fs = require('fs');
const ECRIRE = process.argv.includes('--ecrire');

// La table, lue dans index.html — jamais recopiée ici.
function lireTable(){
  const html = fs.readFileSync('index.html', 'utf8');
  const i = html.indexOf('const CARBURANTS_VERIFIES = {');
  if (i < 0) throw new Error('CARBURANTS_VERIFIES introuvable dans index.html : mauvaise base ?');
  const j = html.indexOf('\n};', i);
  return eval('(' + html.slice(i + 'const CARBURANTS_VERIFIES = '.length, j + 2) + ')');
}

const CANON = ['⛽ Ess.', '⛽ Diesel', '⚡ Élec.', '🔌 PHEV', '🌿 HEV'];
const txt = fs.readFileSync('data.js', 'utf8');
const lignes = txt.split(/\r?\n/);
const iDB = lignes.findIndex(l => l.startsWith('window.DB='));
const json = lignes[iDB].slice('window.DB='.length).replace(/;\s*$/, '');
const DB = JSON.parse(json);
if (JSON.stringify(DB) !== json) throw new Error('aller-retour JSON non neutre sur data.js');

const TABLE = lireTable();
let corrigees = 0, deja = 0;
const absentes = [], detail = [];
for (const modele of Object.keys(TABLE)) {
  const c = TABLE[modele];
  let liste = null, marque = null;
  for (const b of Object.keys(DB)) if (DB[b][modele]) { liste = DB[b][modele]; marque = b; }
  if (!liste) { absentes.push(modele); continue; }
  for (const nom of c.finitions) {
    const f = liste.find(x => x.v === nom);
    if (!f) { absentes.push(modele + ' · ' + nom); continue; }
    const avant = (f.eg && f.eg.fuel) || null;
    if (avant === c.fuel) { deja++; continue; }
    detail.push({ marque, modele, v: nom, avant, apres: c.fuel, motif: c.motif });
    if (ECRIRE) { f.eg = f.eg || {}; f.eg.fuel = c.fuel; }
    corrigees++;
  }
}

console.log('CARBURANTS_VERIFIES : ' + Object.keys(TABLE).length + ' modèles · ' +
  Object.values(TABLE).reduce((n, c) => n + c.finitions.length, 0) + ' finitions visées\n');
for (const d of detail)
  console.log('  ' + (d.modele + ' · ' + d.v).slice(0, 52).padEnd(54) +
    (d.avant || '(aucune)').padEnd(22) + ' → ' + d.apres.padEnd(12) + '  ' + d.motif);
console.log('\n  à corriger : ' + corrigees + ' · déjà conformes : ' + deja +
  ' · sans correspondance : ' + absentes.length + (absentes.length ? ' (' + absentes.join(' | ') + ')' : ''));

// ── Contrôles, qui valent avant comme après ──
let ko = 0;
const ok = (b, t, d) => { console.log((b ? '  OK   ' : '  ÉCHEC') + ' · ' + t + (d ? '   ' + d : '')); if (!b) ko++; };
const dieselNom = /\b(\d\.\d\s*d\b|dci|hdi|bluehdi|tdi|crdi|cdi|d-4d|multijet|diesel|di-d|bitdi)\b/i;
const restants = [], horsCanon = [];
for (const b of Object.keys(DB)) for (const mo of Object.keys(DB[b])) for (const f of DB[b][mo]) {
  const fuel = (f.eg && f.eg.fuel) || '';
  if (dieselNom.test(mo + ' ' + f.v) && /Ess\./i.test(fuel)) restants.push(mo + ' · ' + f.v);
  if (fuel && !CANON.includes(fuel)) horsCanon.push(mo + ' · ' + f.v + ' [' + fuel + ']');
}
console.log('');
ok(restants.length === 0, 'aucun libellé diesel rangé en essence', restants.slice(0, 4).join(' | '));
ok(horsCanon.length === 0, 'tous les libellés d\'énergie sont canoniques', horsCanon.slice(0, 4).join(' | '));
ok(absentes.length === 0, 'chaque entrée de la table trouve sa finition dans la base');

if (ECRIRE) {
  const sortie = JSON.stringify(DB);
  lignes[iDB] = 'window.DB=' + sortie + ';';
  fs.writeFileSync('data.js', lignes.join('\r\n'));
  console.log('\ndata.js RÉÉCRIT — ' + corrigees + ' énergie(s) corrigée(s).');
} else {
  console.log('\nRien n\'a été écrit. Relancer avec --ecrire pour appliquer.');
}
process.exit(ko === 0 || !ECRIRE ? 0 : 1);
