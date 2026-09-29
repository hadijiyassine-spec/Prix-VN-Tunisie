// Intégration d'un export de prix neufs dans data.js — FUSION, jamais remplacement.
//
//   node integrer_prix.js                → fusion à blanc : écrit data.candidat.js et le
//                                          rapport, sans toucher à data.js
//   node integrer_prix.js --ecrire       → remplace data.js (après validation seulement)
//   node integrer_prix.js --source X.js  → fusionne à partir d'un autre data.js (idempotence)
//
// Ce que data.js contient et que le classeur n'a pas — et qu'il ne faut donc pas perdre :
//   · les fiches techniques (eg, sp) de chaque finition ;
//   · les tarifs retrouvés sur archive et ceux retirés (substitutions mal attribuées) ;
//   · les corrections du contrôle catalogue du 13.09.2026.
// D'où la règle : un relevé présent seulement dans data.js est CONSERVÉ, une finition présente
// seulement dans data.js est CONSERVÉE intacte, et un conflit de prix n'est jamais tranché en
// silence en faveur du classeur.
const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const ECRIRE = ARGS.includes('--ecrire');
const SRC_DATA = (ARGS.includes('--source') ? ARGS[ARGS.indexOf('--source') + 1] : 'data.js');
const SORTIE = (ARGS.includes('--sortie') ? ARGS[ARGS.indexOf('--sortie') + 1] : 'data.candidat.js');
const CLASSEUR = 'sources/classeur.json';

// ── Normalisation des clés ──
// Espace insécable ramenée à une espace, espaces multiples réduites, comparaison insensible à
// la casse. L'ORTHOGRAPHE RETENUE reste celle de data.js quand la finition existe déjà.
const esp = s => String(s == null ? '' : s).replace(/[     ]/g, ' ').replace(/\s+/g, ' ').trim();
const cle = s => esp(s).toLowerCase();
const cleFin = (marque, modele, version) => cle(marque) + '|' + cle(modele) + '|' + cle(version);
const kDate = d => d.slice(6) + d.slice(3, 5) + d.slice(0, 2);   // JJ.MM.AAAA -> AAAAMMJJ

// ── Lecture de data.js ──
function lireData(chemin) {
  const txt = fs.readFileSync(chemin, 'utf8');
  const lignes = txt.split(/\r?\n/);
  const iDB = lignes.findIndex(l => l.startsWith('window.DB='));
  if (iDB < 0) throw new Error('window.DB introuvable dans ' + chemin);
  const json = lignes[iDB].slice('window.DB='.length).replace(/;\s*$/, '');
  const DB = JSON.parse(json);
  if (JSON.stringify(DB) !== json) throw new Error('aller-retour JSON non neutre sur ' + chemin);
  return { lignes, iDB, DB, json, fin: txt.endsWith('\n') ? '\n' : '' };
}

// ── Relevés vérifiés et corrections du 13.09.2026, lus dans index.html ──
// Ils l'emportent sur le classeur : ils ont été vérifiés un par un, avec leur source.
function lireRelevesVerifies() {
  const html = fs.readFileSync('index.html', 'utf8');
  const i = html.indexOf('const RELEVES_VERIFIES = {');
  // Pas de repli silencieux : un index.html sans cette table, c'est une mauvaise base (branche
  // ancienne, fichier tronqué). Rendre une table vide ferait passer la fusion sans protection,
  // et les tarifs vérifiés seraient écrasés sans que rien ne le signale. Le cas s'est produit.
  if (i < 0) throw new Error('RELEVES_VERIFIES introuvable dans index.html : mauvaise base ?');
  const j = html.indexOf('\n};', i);
  const bloc = html.slice(i + 'const RELEVES_VERIFIES = '.length, j + 2);
  let table;
  try { table = eval('(' + bloc + ')'); } catch (e) { throw new Error('RELEVES_VERIFIES illisible : ' + e.message); }
  const proteges = new Set(), retraits = new Set();
  for (const mod of Object.keys(table))
    for (const fin of Object.keys(table[mod]))
      for (const r of table[mod][fin]) {
        const k = cle(mod) + '|' + cle(fin) + '|' + r.d;
        (r.retrait ? retraits : proteges).add(k);
      }
  console.log('RELEVES_VERIFIES : ' + Object.keys(table).length + ' modèles · ' + proteges.size +
    ' relevés protégés · ' + retraits.size + ' retraits à faire respecter');
  return { table, proteges, retraits };
}

// ── Marques ──
// Jusqu'en 2025 la marque est séparée du modèle par une espace insécable. En 2026 c'est une
// espace ordinaire : il faut retrouver la marque par le PLUS LONG PRÉFIXE CONNU, sinon
// « Alfa Romeo Giulia » donne la marque « Alfa » et « Land Rover Range Rover » la marque « Land ».
const MARQUES_2026 = ['Xpeng', 'Voyah', 'M-Hero', 'Deepal', 'IM Motors', 'Lynk & Co', 'BAIC'];

function trouveMarque(modelBrut, modelNorm, marquesConnues) {
  if (modelBrut.includes(' ')) return esp(modelBrut.split(' ')[0]);
  let best = null;
  for (const m of marquesConnues) {
    const p = cle(m) + ' ';
    if (cle(modelNorm).startsWith(p) && (!best || m.length > best.length)) best = m;
  }
  return best;
}

// ── Rattachement à la clé de marque de data.js ──
// data.js range ses modèles sous une clé de marque parfois PLUS COURTE que ce que porte le
// classeur : « BAIC YX Kenbo S2 » est sous « BAIC », « IM Motors IM5 » sous « IM », « Omoda &
// Jaecoo C5 » sous « Omoda ». Sans ce rattachement, la fusion créait trois marques fantômes et
// onze finitions en double, alors que les modèles existaient déjà.
function marqueDeData(marqueClasseur, modele, DB, modeleVersMarque) {
  const parModele = modeleVersMarque.get(cle(modele));
  if (parModele) return parModele;                       // le modèle existe : sa marque fait foi
  if (DB[marqueClasseur]) return marqueClasseur;
  let best = null;
  for (const b of Object.keys(DB)) {
    const cb = cle(b), cm = cle(marqueClasseur);
    if (cb === cm || cm.startsWith(cb + ' ') || cb.startsWith(cm + ' ')) {
      if (!best || b.length > best.length) best = b;      // « IM Motors » → « IM »
    }
  }
  return best || marqueClasseur;
}

// ── Énergie des finitions nouvelles ──
// Le calcul lit l'énergie dans eg.fuel ou sp.carburant. SANS elle, fuelClass() rend « essence » :
// une électrique passerait pour un thermique, sans module batterie, sans décote VE, sans TVA 7 %.
// On ne renseigne donc QUE ce qui se lit sans ambiguïté, et on liste le reste.
const MARQUES_TOUT_ELECTRIQUE = ['Xpeng', 'IM Motors'];
function energieDuNom(marque, modele, version) {
  const t = (modele + ' ' + version);
  if (/\bphev\b|hybride rechargeable|plug-?in/i.test(t)) return { fuel: '🔌 Hybride rechargeable', regle: 'mention PHEV / rechargeable' };
  if (/\d{2,3}e\b/.test(t) && /bmw|mercedes/i.test(marque)) return { fuel: '🔌 Hybride rechargeable', regle: 'désignation constructeur (330e, 530e…)' };
  if (/\breev\b|range extender|prolongateur/i.test(t)) return { fuel: '🔌 Hybride rechargeable', regle: 'prolongateur d\'autonomie (REEV)' };
  if (/e-hybrid/i.test(t)) return { fuel: '🔌 Hybride rechargeable', regle: 'désignation E-Hybrid (Porsche)' };
  // Volvo réserve la désignation T8 à sa chaîne hybride rechargeable (Twin Engine / Recharge) :
  // confirmé par Yassine Hadiji le 29.09.2026. Sans cette règle, quatre XC60 / XC90 T8 entraient
  // sans énergie, donc traités comme essence — pas de module batterie, pas de décote VE, TVA
  // ordinaire. La règle est bornée à Volvo : « T8 » ne veut pas dire cela ailleurs.
  if (/volvo/i.test(marque) && /\bT8\b/.test(t)) return { fuel: '🔌 Hybride rechargeable', regle: 'désignation Volvo T8 (hybride rechargeable)' };
  if (/e:?-?hev|\bhev\b|hybride|hybrid\b/i.test(t)) return { fuel: '🌿 Hybride', regle: 'mention hybride / HEV' };
  if (/\bkwh\b/i.test(t)) return { fuel: '⚡ Élec.', regle: 'capacité en kWh dans le nom' };
  if (/\be-?tron\b|\bev\b|électrique|electrique/i.test(t)) return { fuel: '⚡ Élec.', regle: 'mention électrique / EV / e-tron' };
  if (MARQUES_TOUT_ELECTRIQUE.includes(marque)) return { fuel: '⚡ Élec.', regle: 'marque intégralement électrique' };
  if (/diesel|\bdci\b|\bhdi\b|\btdi\b|\bcrdi\b|\bd-?4d\b/i.test(t)) return { fuel: '🛢️ Diesel', regle: 'désignation diesel' };
  return null;
}

// ══════════════════════════════════════════════════════════════════════
const R = { conflits: [], quasi: [], nouvellesFinitions: [], nouvellesMarques: [], sansEnergie: [],
            marquesNonResolues: [], marquesRattachees: [], relevesAjoutes: 0, doublonsRetires: 0, casesFusionnees: [],
            protegesConserves: [], retraitsReintroduits: [], baisses2026: [], variations: {},
            doublonsCasseBase: [], dejaSousAutreOrthographe: [] };

const src = lireData(SRC_DATA);
const DB = src.DB;
const RV = lireRelevesVerifies();

// Index des finitions existantes
const index = new Map();               // clé normalisée -> {marque, modele, fin}
const freres = new Map();              // clé normalisée -> toutes les finitions de cette clé
const modeleVersMarque = new Map();    // modèle normalisé -> clé de marque de data.js
for (const marque of Object.keys(DB))
  for (const modele of Object.keys(DB[marque])) {
    modeleVersMarque.set(cle(modele), marque);
    for (const fin of DB[marque][modele]) {
      const k = cleFin(marque, modele, fin.v);
      if (!freres.has(k)) freres.set(k, []);
      freres.get(k).push({ marque, modele, fin });
    }
  }
// data.js contient lui-même quatre finitions en DOUBLE DE CASSE (« 1.0 l » et « 1.0 L » du Grand
// i10 Populaire, etc.) : deux entrées pour une seule finition, avec deux tranches de relevés.
// Le classeur, lui, n'écrit qu'une orthographe. Sans règle, tous ses relevés tombaient dans la
// même entrée : 19 tarifs déjà présents sous l'autre orthographe s'y trouvaient DUPLIQUÉS, et le
// d0 (début de série, qui sert aux phases et à venSerie) reculait de deux ans. D'où deux règles :
//   · l'entrée qui reçoit les relevés nouveaux est celle qui en compte LE PLUS — l'orthographe
//     principale, et non « la dernière rencontrée dans l'ordre de l'objet » ;
//   · un relevé déjà porté par une entrée sœur n'est PAS réécrit ailleurs (voir la fusion).
// Les quatre groupes sont listés dans le rapport : les réunir en une seule finition est une
// modification de la base, elle relève de l'arbitrage de l'expert, pas de l'import.
for (const [k, grp] of freres) {
  const principal = grp.slice().sort((a, b) => b.fin.hist.length - a.fin.hist.length)[0];
  index.set(k, principal);
  if (grp.length > 1) R.doublonsCasseBase.push({ modele: principal.modele,
    orthographes: grp.map(x => x.fin.v + ' (' + x.fin.hist.length + ' relevés, ' + x.fin.d0 + '→' + x.fin.d + ')'),
    retenue: principal.fin.v });
}

const avant = compte(DB);

// ── Lecture du classeur ──
const brutes = JSON.parse(fs.readFileSync(CLASSEUR, 'utf8'));
const marquesConnues = Array.from(new Set(Object.keys(DB).concat(MARQUES_2026)));

const vues = new Set();
const lignes = [];
for (const l of brutes) {
  const modele = esp(l.model);
  const brute = trouveMarque(l.model_brut, modele, marquesConnues);
  if (!brute) { R.marquesNonResolues.push(modele + ' (' + l.date + ')'); continue; }
  const marque = marqueDeData(brute, modele, DB, modeleVersMarque);
  if (cle(marque) !== cle(brute) && !R.marquesRattachees.some(x => x.classeur === brute))
    R.marquesRattachees.push({ classeur: brute, dataJs: marque });
  const version = esp(l.version);
  const sig = cleFin(marque, modele, version) + '|' + l.date + '|' + l.prix;
  if (vues.has(sig)) { R.doublonsRetires++; continue; }          // doublon exact
  vues.add(sig);
  lignes.push({ marque, modele, version, date: l.date, prix: l.prix, variation: l.variation, dealer: l.dealer, feuille: l.feuille });
}

// ── Doublons de casse : « 1.0 L » et « 1.0 l » sont la même finition ──
// On les ramène à l'orthographe de data.js quand elle existe, sinon à la plus fréquente.
const parCle = new Map();
for (const l of lignes) {
  const k = cleFin(l.marque, l.modele, l.version);
  if (!parCle.has(k)) parCle.set(k, []);
  parCle.get(k).push(l);
}
for (const [k, grp] of parCle) {
  const formes = new Map();
  for (const l of grp) formes.set(l.modele + '|' + l.version, (formes.get(l.modele + '|' + l.version) || 0) + 1);
  if (formes.size > 1) {
    const existante = index.get(k);
    const retenue = existante ? (existante.modele + '|' + existante.fin.v)
      : [...formes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    R.casesFusionnees.push({ cle: k, formes: [...formes.keys()], retenue });
    for (const l of grp) { const [mo, ve] = retenue.split('|'); l.modele = mo; l.version = ve; }
  }
}

// ── Conflits internes au classeur : même finition, même date, deux prix ──
const parFinDate = new Map();
for (const l of lignes) {
  const k = cleFin(l.marque, l.modele, l.version) + '|' + l.date;
  if (!parFinDate.has(k)) parFinDate.set(k, []);
  parFinDate.get(k).push(l);
}
for (const [k, grp] of parFinDate) {
  const prix = Array.from(new Set(grp.map(x => x.prix)));
  if (prix.length > 1) {
    const ref = index.get(k.split('|').slice(0, 3).join('|'));
    const dansData = ref ? (ref.fin.hist.find(h => h.d === grp[0].date) || null) : null;
    R.conflits.push({ type: 'interne au classeur', finition: grp[0].marque + ' · ' + grp[0].modele + ' · ' + grp[0].version,
      date: grp[0].date, prix, dansDataJs: dansData ? dansData.p : null,
      regle: dansData ? 'valeur de data.js retenue' : 'AUCUNE valeur retenue — à trancher' });
    // On écarte ces relevés tant que Yassine n'a pas tranché, sauf si data.js sait déjà.
    for (const l of grp) l.ecarte = !dansData || l.prix !== dansData.p;
  }
}

// ── Fusion ──
const touchees = new Set();
for (const l of lignes) {
  if (l.ecarte) continue;
  const k = cleFin(l.marque, l.modele, l.version);
  let cible = index.get(k);

  if (!cible) {
    // Finition nouvelle. Marque nouvelle éventuellement.
    if (!DB[l.marque]) { DB[l.marque] = {}; if (!R.nouvellesMarques.includes(l.marque)) R.nouvellesMarques.push(l.marque); }
    if (!DB[l.marque][l.modele]) DB[l.marque][l.modele] = [];
    let nrj = energieDuNom(l.marque, l.modele, l.version);
    // À défaut, héritage des finitions SŒURS : si le modèle existe déjà et que toutes ses
    // finitions portent la même énergie, la nouvelle la partage nécessairement. On n'hérite
    // JAMAIS d'un modèle à énergies mêlées (un XC60 existe en essence et en rechargeable).
    if (!nrj) {
      const soeurs = (DB[l.marque] && DB[l.marque][l.modele]) ? DB[l.marque][l.modele] : [];
      const fuels = new Set(soeurs.map(f => (f.eg && f.eg.fuel) || (f.sp && f.sp.carburant) || '').filter(Boolean));
      if (soeurs.length && fuels.size === 1)
        nrj = { fuel: [...fuels][0], regle: 'héritée des finitions du même modèle, toutes de cette énergie' };
    }
    const fin = { v: l.version, p: l.prix, d0: l.date, d: l.date, dl: l.dealer || '', n: 0, hist: [] };
    if (nrj) fin.eg = { fuel: nrj.fuel };
    DB[l.marque][l.modele].push(fin);
    cible = { marque: l.marque, modele: l.modele, fin };
    index.set(k, cible);
    R.nouvellesFinitions.push({ marque: l.marque, modele: l.modele, version: l.version,
      energie: nrj ? nrj.fuel : null, regle: nrj ? nrj.regle : null });
    if (!nrj) R.sansEnergie.push(l.marque + ' · ' + l.modele + ' · ' + l.version);
  }

  const h = cible.fin.hist;
  const existant = h.find(x => x.d === l.date);
  // Un retrait déjà décidé ne doit pas revenir par le classeur. Le contrôle catalogue du
  // 13.09.2026 a retiré six tarifs parce qu'ils appartenaient à une AUTRE finition (les
  // substitutions de gamme de la Clio) : chacun porte son motif et sa source. Le classeur est
  // la source même qui a produit l'erreur — le laisser les réécrire, c'est la refaire. Ils sont
  // certes neutralisés à l'exécution par RELEVES_VERIFIES, mais une base sale reviendrait à
  // l'endroit dès qu'on la régénère, et test_vv.js l'a d'ailleurs signalé.
  const kRetrait = cle(cible.modele) + '|' + cle(cible.fin.v) + '|' + l.date;
  if (RV.retraits.has(kRetrait) && !existant) {
    R.retraitsReintroduits.push(cible.modele + ' · ' + cible.fin.v + ' · ' + l.date + ' · écarté (retrait du 13.09.2026)');
    continue;
  }
  if (!existant) {
    // Le relevé est-il déjà dans la base sous une orthographe sœur (doublon de casse) ? Alors il
    // y est déjà : l'ajouter ici le compterait deux fois et ferait reculer le début de série.
    const soeur = (freres.get(k) || []).find(x => x.fin !== cible.fin && x.fin.hist.some(y => y.d === l.date));
    if (soeur) {
      R.dejaSousAutreOrthographe.push(cible.modele + ' · ' + l.date + ' · déjà sous « ' + soeur.fin.v + ' », pas recopié dans « ' + cible.fin.v + ' »');
    } else {
      h.push({ p: l.prix, d: l.date });
      R.relevesAjoutes++;
      touchees.add(k);
    }
  } else if (existant.p !== l.prix) {
    const kProt = cle(cible.modele) + '|' + cle(cible.fin.v) + '|' + l.date;
    if (RV.proteges.has(kProt)) {
      R.protegesConserves.push({ finition: cible.modele + ' · ' + cible.fin.v, date: l.date,
        dataJs: existant.p, classeur: l.prix });
    } else {
      R.conflits.push({ type: 'classeur contre data.js', finition: l.marque + ' · ' + cible.modele + ' · ' + cible.fin.v,
        date: l.date, prix: [existant.p, l.prix], dansDataJs: existant.p,
        regle: 'valeur du classeur retenue (source la plus récente)' });
      existant.p = l.prix;
      touchees.add(k);
    }
  }
}

// ── Recalcul des champs dérivés sur les finitions touchées ──
for (const k of touchees) {
  const { fin } = index.get(k);
  fin.hist.sort((a, b) => kDate(a.d) < kDate(b.d) ? -1 : kDate(a.d) > kDate(b.d) ? 1 : 0);
  fin.d0 = fin.hist[0].d;
  fin.d = fin.hist[fin.hist.length - 1].d;
  fin.p = fin.hist[fin.hist.length - 1].p;
  fin.n = fin.hist.length;
}

// ── Contrôle : rien de perdu ──
const apres = compte(DB);
if (apres.finitions < avant.finitions || apres.releves < avant.releves)
  throw new Error('PERTE DÉTECTÉE : ' + JSON.stringify(avant) + ' -> ' + JSON.stringify(apres));

// ── Analyses pour le rapport ──
analyseVariations(lignes, R);
baisses2026(DB, R);
quasiCorrespondances(lignes, index, DB, R);

// ── Écriture ──
const jsonDB = JSON.stringify(DB);
const lignesSortie = src.lignes.slice();
lignesSortie[0] = '// Prix VN Tunisie — Base septembre 2026 · fusion du classeur prix_VN_2011-092026_1.xlsx ' +
  '(relevés du 14.10.2011 au 24.09.2026, ' + brutes.length + ' lignes) · fiches techniques, tarifs d\'archive ' +
  'et corrections du 13.09.2026 conservés';
lignesSortie[1] = '// ' + apres.marques + ' marques · ' + apres.modeles + ' modèles · ' + apres.finitions + ' finitions · ' + apres.releves + ' relevés';
lignesSortie[src.iDB] = 'window.DB=' + jsonDB + ';';
const sortie = lignesSortie.join('\r\n');
const cible = ECRIRE ? 'data.js' : SORTIE;
fs.writeFileSync(cible, sortie);
// Le nom du rapport suit celui de la sortie : sans cela, la passe d'idempotence de verif_fusion.js
// (qui relance ce script sur data.candidat.js) écrasait le rapport de la vraie fusion par le sien,
// et on lisait ensuite des chiffres pris sur la base déjà fusionnée en croyant lire data.js.
const nomRapport = 'sources/rapport_fusion' + (cible === 'data.candidat.js' || ECRIRE ? '' : '_' + path.basename(cible, '.js')) + '.json';
fs.writeFileSync(nomRapport, JSON.stringify({ source: SRC_DATA, sortie: cible, avant, apres, ...R }, null, 1));

console.log('Source        : ' + SRC_DATA + '  →  ' + cible + (ECRIRE ? '   [data.js REMPLACÉ]' : '   [fusion à blanc]'));
console.log('Avant         : ' + avant.marques + ' marques · ' + avant.modeles + ' modèles · ' + avant.finitions + ' finitions · ' + avant.releves + ' relevés');
console.log('Après         : ' + apres.marques + ' marques · ' + apres.modeles + ' modèles · ' + apres.finitions + ' finitions · ' + apres.releves + ' relevés');
console.log('Relevés ajoutés : ' + R.relevesAjoutes + ' · doublons exacts écartés : ' + R.doublonsRetires);
console.log('Finitions créées : ' + R.nouvellesFinitions.length + ' · marques créées : ' + R.nouvellesMarques.length + ' (' + R.nouvellesMarques.join(', ') + ')');
console.log('Conflits de prix : ' + R.conflits.length + ' · relevés vérifiés conservés : ' + R.protegesConserves.length +
  ' · retraits du 13.09.2026 écartés : ' + R.retraitsReintroduits.length);
console.log('Finitions sans énergie identifiée : ' + R.sansEnergie.length);
console.log('Doublons de casse du classeur ramenés à une orthographe : ' + R.casesFusionnees.length);
console.log('Doublons de casse préexistants dans data.js : ' + R.doublonsCasseBase.length +
  ' · relevés non recopiés car déjà sous l\'orthographe sœur : ' + R.dejaSousAutreOrthographe.length);
console.log('Marques non résolues : ' + R.marquesNonResolues.length);
console.log('Rapport détaillé : ' + nomRapport);

// ══════════════════════════════════════════════════════════════════════
function compte(DB) {
  let modeles = 0, finitions = 0, releves = 0;
  for (const b of Object.keys(DB)) for (const m of Object.keys(DB[b])) {
    modeles++;
    for (const f of DB[b][m]) { finitions++; releves += f.hist.length; }
  }
  return { marques: Object.keys(DB).length, modeles, finitions, releves };
}

// La colonne Variation sert de contrôle de complétude : quand elle vaut exactement l'écart au
// relevé précédent, la série est complète. Sinon, un relevé manque — mais la variation donne
// l'ancien PRIX, pas sa DATE : on ne peut donc pas le reconstituer. On se contente de lister.
function analyseVariations(lignes, R) {
  const par = new Map();
  for (const l of lignes) {
    const k = cleFin(l.marque, l.modele, l.version);
    if (!par.has(k)) par.set(k, []);
    par.get(k).push(l);
  }
  let coherentes = 0, incoherentes = [], debutSigne = 0, reapparitions = 0;
  for (const [k, grp] of par) {
    grp.sort((a, b) => kDate(a.date) < kDate(b.date) ? -1 : 1);
    for (let i = 0; i < grp.length; i++) {
      const v = grp[i].variation;
      if (v == null) continue;
      if (i === 0) { if (v !== grp[i].prix) debutSigne++; continue; }
      const ecart = grp[i].prix - grp[i - 1].prix;
      if (v === grp[i].prix) { reapparitions++; continue; }
      if (v === ecart) coherentes++;
      else incoherentes.push({ finition: grp[i].marque + ' · ' + grp[i].modele + ' · ' + grp[i].version,
        de: grp[i - 1].date + ' ' + grp[i - 1].prix, a: grp[i].date + ' ' + grp[i].prix,
        variationAnnoncee: v, ecartObserve: ecart, prixManquant: grp[i].prix - v });
    }
  }
  R.variations = { coherentes, incoherentes: incoherentes.length, debutSigne, reapparitions,
                   detailIncoherentes: incoherentes.slice(0, 40) };
}

// Fortes baisses sur le dernier relevé de 2026 : elles deviennent le tarif du jour, donc la base
// du calcul (méthode B) et le plafond « prix neuf du jour ».
function baisses2026(DB, R) {
  for (const b of Object.keys(DB)) for (const m of Object.keys(DB[b])) for (const f of DB[b][m]) {
    const h = f.hist;
    if (h.length < 2) continue;
    const dernier = h[h.length - 1], avant = h[h.length - 2];
    if (!dernier.d.endsWith('2026')) continue;
    const var_ = dernier.p / avant.p - 1;
    if (var_ <= -0.15) R.baisses2026.push({ modele: m, version: f.v, de: avant.p, a: dernier.p,
      date: dernier.d, baisse: Math.round(var_ * 1000) / 10 });
  }
  R.baisses2026.sort((a, b) => a.baisse - b.baisse);
}

// Quasi-correspondances : finitions du classeur sans correspondance EXACTE, mais proches d'une
// finition existante du même modèle. On ne les rapproche JAMAIS automatiquement — rapprocher
// « 1.2 L Active » et « 1.2 L Active Pack », c'est refaire l'erreur de la Clio.
function quasiCorrespondances(lignes, index, DB, R) {
  const nouvelles = new Map();
  for (const l of lignes) {
    const k = cleFin(l.marque, l.modele, l.version);
    if (!nouvelles.has(k)) nouvelles.set(k, l);
  }
  for (const [k, l] of nouvelles) {
    const existantes = (DB[l.marque] && DB[l.marque][l.modele]) ? DB[l.marque][l.modele] : [];
    const estNouvelle = R.nouvellesFinitions.some(n => cleFin(n.marque, n.modele, n.version) === k);
    if (!estNouvelle) continue;
    const a = cle(l.version);
    for (const f of existantes) {
      const b = cle(f.v);
      if (b === a) continue;
      if (b.startsWith(a) || a.startsWith(b) || proche(a, b))
        R.quasi.push({ modele: l.modele, classeur: l.version, dataJs: f.v });
    }
  }
}
function proche(a, b) {
  if (Math.abs(a.length - b.length) > 3) return false;
  let d = 0;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++;
  return d <= 2;
}
