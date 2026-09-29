// Contrôles de la fusion, sur data.candidat.js — à passer AVANT d'écrire data.js.
//   node verif_fusion.js
//
// Quatre questions, dans cet ordre :
//   1. la fusion est-elle IDEMPOTENTE (refusionner le candidat ne doit plus rien ajouter) ?
//   2. est-elle NEUTRE à l'octet sur les finitions non touchées ?
//   3. n'a-t-on RIEN PERDU (marque, modèle, finition, relevé, fiche technique) ?
//   4. les clés de RELEVES_VERIFIES et de PHASES se résolvent-elles toujours dans la base ?
// La question 4 est celle qu'on oublie : renommer une finition à l'import ne casse rien de
// visible, mais les tarifs vérifiés et les bornes de génération cessent silencieusement de
// s'appliquer, et le calcul change sans qu'aucun contrôle ne le signale.
const fs = require('fs');
const { execSync } = require('child_process');

const lire = ch => {
  const l = fs.readFileSync(ch, 'utf8').split(/\r?\n/);
  const i = l.findIndex(x => x.startsWith('window.DB='));
  return JSON.parse(l[i].slice('window.DB='.length).replace(/;\s*$/, ''));
};
const esp = s => String(s == null ? '' : s).replace(/[     ]/g, ' ').replace(/\s+/g, ' ').trim();
const cle = s => esp(s).toLowerCase();

// Un bloc de déclaration lu dans index.html. Une déclaration absente = mauvaise base : on lève,
// on ne rend pas un objet vide (un contrôle qui ne contrôle rien est pire que pas de contrôle).
function bloc(html, decl) {
  const i = html.indexOf(decl);
  if (i < 0) throw new Error(decl + ' introuvable dans index.html : mauvaise base ?');
  const j = html.indexOf('\n};', i);
  return eval('(' + html.slice(i + decl.length - 1, j + 2) + ')');
}

// Les deux bases à comparer : celle d'AVANT la fusion et celle d'APRÈS. Avant l'écriture,
// c'était data.js et data.candidat.js ; une fois data.js écrit, il faut repartir de la
// sauvegarde, sans quoi on comparerait la base fusionnée à elle-même.
const AVANT = process.argv[2] || (fs.existsSync('data.candidat.js') ? 'data.js' : '_backup_avant_3d/data.avant_fusion_092026.js');
const APRES = process.argv[3] || (fs.existsSync('data.candidat.js') ? 'data.candidat.js' : 'data.js');
console.log('avant : ' + AVANT + '   après : ' + APRES + '\n');
const A = lire(AVANT);
const B = lire(APRES);
let ko = 0;
const ok = (b, t, det) => { console.log((b ? '  OK   ' : '  ÉCHEC') + ' · ' + t + (det ? '   ' + det : '')); if (!b) ko++; };

// ── 1. Idempotence ──
execSync('node integrer_prix.js --source "' + APRES + '" --sortie data.candidat2.js', { stdio: 'pipe' });
const C = lire('data.candidat2.js');
ok(JSON.stringify(B) === JSON.stringify(C), 'idempotence : refusionner le candidat ne change plus rien');

// ── 2. Neutralité et 3. rien de perdu ──
let finA = 0, finB = 0, identiques = 0, perdues = [], relevesPerdus = [], fichesPerdues = [];
for (const m of Object.keys(A)) {
  if (!B[m]) { perdues.push('marque ' + m); continue; }
  for (const mo of Object.keys(A[m])) {
    if (!B[m][mo]) { perdues.push('modèle ' + m + ' · ' + mo); continue; }
    for (const f of A[m][mo]) {
      finA++;
      // Appariement EXACT d'abord. data.js contient quatre finitions en double de casse
      // (« 1.0 l » et « 1.0 L ») : un appariement uniquement insensible à la casse renvoyait la
      // première des deux pour les deux, et les relevés de la seconde étaient annoncés perdus
      // alors qu'ils étaient là. Fausse alerte, qui masquait le vrai défaut (la duplication).
      const g = B[m][mo].find(x => x.v === f.v) || B[m][mo].find(x => cle(x.v) === cle(f.v));
      if (!g) { perdues.push('finition ' + m + ' · ' + mo + ' · ' + f.v); continue; }
      if (JSON.stringify(f) === JSON.stringify(g)) identiques++;
      for (const h of f.hist)
        if (!g.hist.some(x => x.d === h.d)) relevesPerdus.push(m + ' · ' + mo + ' · ' + f.v + ' · ' + h.d);
      if (f.eg && !g.eg) fichesPerdues.push('eg ' + mo + ' · ' + f.v);
      if (f.sp && !g.sp) fichesPerdues.push('sp ' + mo + ' · ' + f.v);
    }
  }
}
for (const m of Object.keys(B)) for (const mo of Object.keys(B[m])) finB += B[m][mo].length;

ok(perdues.length === 0, 'aucune marque / modèle / finition perdu', perdues.slice(0, 5).join(' | '));
ok(relevesPerdus.length === 0, 'aucun relevé perdu', relevesPerdus.slice(0, 5).join(' | '));
ok(fichesPerdues.length === 0, 'aucune fiche technique perdue', fichesPerdues.slice(0, 5).join(' | '));
console.log('         finitions : ' + finA + ' → ' + finB + ' · identiques à l\'octet : ' + identiques +
  ' (' + Math.round(identiques / finA * 1000) / 10 + ' %)');

// ── 4. Clés de RELEVES_VERIFIES et de PHASES ──
const html = fs.readFileSync('index.html', 'utf8');
const RV = bloc(html, 'const RELEVES_VERIFIES = {');
const PH = bloc(html, 'const PHASES = {');
const finitionsDe = (DB, modele) => {
  for (const m of Object.keys(DB)) for (const mo of Object.keys(DB[m]))
    if (cle(mo) === cle(modele)) return DB[m][mo];
  return null;
};
const orphRV = [], orphPH = [];
for (const mod of Object.keys(RV)) {
  const fs_ = finitionsDe(B, mod);
  if (!fs_) { orphRV.push('modèle ' + mod); continue; }
  for (const fin of Object.keys(RV[mod]))
    if (!fs_.some(f => cle(f.v) === cle(fin))) orphRV.push(mod + ' · ' + fin);
}
for (const mod of Object.keys(PH)) if (!finitionsDe(B, mod)) orphPH.push(mod);
ok(orphRV.length === 0, 'les ' + Object.keys(RV).length + ' clés de RELEVES_VERIFIES se résolvent', orphRV.slice(0, 5).join(' | '));
ok(orphPH.length === 0, 'les ' + Object.keys(PH).length + ' clés de PHASES se résolvent', orphPH.slice(0, 5).join(' | '));

fs.unlinkSync('data.candidat2.js');
console.log(ko === 0 ? '\nTous les contrôles de fusion sont au vert.' : '\n' + ko + ' contrôle(s) en échec — ne pas écrire data.js.');
process.exit(ko === 0 ? 0 : 1);
