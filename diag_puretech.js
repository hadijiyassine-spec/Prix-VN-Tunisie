// MALUS DE MOTORISATION À RISQUE — les essence PureTech (Stellantis, 3 cylindres 1.0 / 1.2).
//
// Fait apporté par Yassine Hadiji le 29.09.2026 : ces moteurs décotent PLUS que les autres, à
// cause de la consommation d'huile (et, sur les versions turbo, de la courroie de distribution
// humide qui se délite et détruit le moteur). C'est un défaut connu du marché, donc un facteur de
// valeur : deux véhicules identiques par ailleurs ne valent pas le même prix selon le moteur.
//
// Le modèle ne connaît pas cette distinction aujourd'hui. Ce script fait deux choses :
//   1. il IDENTIFIE les finitions concernées, par une règle écrite et vérifiable, et les liste
//      pour relecture — on ne peut pas appliquer un malus à un moteur qu'on a mal reconnu ;
//   2. il mesure le malus que le marché réclame, sur la Peugeot 208 (12 annonces de l'échantillon)
//      et sur l'Opel Corsa (repère de l'expert, HORS échantillon) — deux sources indépendantes.
//
// Périmètre de la règle, et pourquoi il est borné :
//   · marques : Peugeot, Citroën, DS depuis 2013 ; Opel/Vauxhall seulement depuis 2020, car les
//     Opel d'avant utilisaient les moteurs Opel (1.0 / 1.2 ecoFLEX), pas le PureTech ;
//   · essence 1.0 ou 1.2 trois cylindres uniquement — les 1.6 THP, les HDi/BlueHDi diesel, les
//     électriques et les hybrides sont hors sujet ;
//   · millésimes 2013 à 2023 : la courroie humide a été remplacée par une courroie sèche à
//     partir de 2022-2023 sur la génération EB2 « Gen3 ». Au-delà, le défaut ne s'applique plus.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const CY = 2026;
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const pc = x => ((x >= 0 ? '+' : '') + (x * 100).toFixed(1) + ' %');
const dt = n => Math.round(n).toLocaleString('fr-FR');
const ALIAS = { 'Citroen C3': 'Citroën C3', 'BMW Serie 3': 'BMW Série 3' };

const MARQUES_PSA = { 'Peugeot': 2013, 'Citroën': 2013, 'DS': 2013, 'Opel': 2020, 'Vauxhall': 2020 };
const DERNIER_MILLESIME = 2023;   // courroie humide

// Reconnaissance du moteur. Renvoie le motif retenu, ou null.
function estPureTech(marque, modele, fin, millesime) {
  const debut = MARQUES_PSA[marque];
  if (debut == null) return null;
  const t = modele + ' ' + fin.v + ' ' + ((fin.eg && (fin.eg.motor || fin.eg.moteur)) || '') + ' ' + ((fin.sp && fin.sp.moteur) || '');
  const fuel = (fin.eg && fin.eg.fuel) || (fin.sp && fin.sp.carburant) || '';
  if (/diesel|hdi|bluehdi|\bhdi\b/i.test(t + ' ' + fuel)) return null;
  if (/élec|elec|⚡|hybride|🔌|🌿/i.test(fuel)) return null;
  if (/\be-|électrique/i.test(t)) return null;
  if (millesime != null && (millesime < debut || millesime > DERNIER_MILLESIME)) return null;
  if (/puretech|pure tech/i.test(t)) return 'libellé PureTech';
  // Les 1.0 et 1.2 essence de ces marques sur cette période SONT des EB2 : 1.2 VTi, 1.2 THP,
  // 1.2 Turbo, ou simplement « 1.2 L ». Il n'existe pas d'autre essence de cette cylindrée au
  // catalogue Stellantis sur la période.
  if (/(^|[^0-9.])1[.,]2(\s|$|[^0-9])/.test(t)) return 'essence 1.2 de la période (EB2)';
  if (/(^|[^0-9.])1[.,]0(\s|$|[^0-9])/.test(t) && /\bvti\b|\bturbo\b|puretech/i.test(t)) return 'essence 1.0 turbo de la période';
  return null;
}

setTimeout(() => {
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };

  // ── 1. Ce que la règle reconnaît ──
  const trouves = [];
  for (const b of Object.keys(win.DB)) for (const mo of Object.keys(win.DB[b])) for (const f of win.DB[b][mo]) {
    const motif = estPureTech(b, mo, f, null);
    if (motif) trouves.push({ marque: b, modele: mo, v: f.v, motif, d0: f.d0, d: f.d });
  }
  console.log('MALUS PURETECH — identification et mesure. Rien n\'est écrit.\n');
  console.log('1. FINITIONS RECONNUES COMME PURETECH : ' + trouves.length + ' — à relire, c\'est un fait technique\n');
  const parMarque = {};
  for (const t of trouves) (parMarque[t.marque] = parMarque[t.marque] || []).push(t);
  for (const m of Object.keys(parMarque)) {
    console.log('  ── ' + m + ' (' + parMarque[m].length + ')');
    const parMod = {};
    for (const t of parMarque[m]) (parMod[t.modele] = parMod[t.modele] || []).push(t);
    for (const mo of Object.keys(parMod))
      console.log('     ' + mo.padEnd(26) + parMod[mo].map(x => x.v).join(' · ').slice(0, 130));
  }
  const motifs = {};
  for (const t of trouves) motifs[t.motif] = (motifs[t.motif] || 0) + 1;
  console.log('\n  par motif de reconnaissance : ' + Object.entries(motifs).map(([k, v]) => k + ' : ' + v).join(' · '));

  // ── 2. Le malus que le marché réclame ──
  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  function pickFin(k, mec) {
    let br = null; for (const b of Object.keys(win.DB)) if (win.DB[b][k]) br = b;
    if (!br) return null;
    const f = win.DB[br][k];
    const dispo = f.filter(x => win.yOf(x.d0) <= mec && mec <= win.yOf(x.d) + 1);
    const pool = dispo.length ? dispo : f;
    const t = pool.slice().sort((a, b) => a.p - b.p);
    return { marque: br, fin: t[Math.floor(t.length / 2)] || null };
  }
  const obs = [];
  for (const l of fs.readFileSync('marche_occasion_28092026.csv', 'utf8').trim().split(/\r?\n/).slice(1)) {
    const [, , mo0, aS, kS, pS] = l.split(';');
    const mo = ALIAS[mo0] || mo0, an = +aS, km = +kS, prix = +pS;
    if (!existe[mo] || !an || !prix) continue;
    const p = pickFin(mo, an);
    if (!p || !p.fin) continue;
    setFY(an);
    const r = win.computeVV(p.fin, km, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
    if (!r || !r.vv) continue;
    obs.push({ mo, an, prix, vv: r.vv, ec: r.vv / prix - 1, pt: !!estPureTech(p.marque, mo, p.fin, an) });
  }
  const pt = obs.filter(x => x.pt), npt = obs.filter(x => !x.pt);
  console.log('\n2. CE QUE DIT L\'ÉCHANTILLON DU 28.09.2026 (152 annonces, finition médiane)\n');
  console.log('  groupe                        n   biais médian   |écart| médian');
  console.log('  PureTech reconnu            ' + String(pt.length).padStart(3) + '   ' + pc(med(pt.map(x => x.ec))).padStart(10) + '   ' + pc(med(pt.map(x => Math.abs(x.ec)))).padStart(12));
  console.log('  autres motorisations        ' + String(npt.length).padStart(3) + '   ' + pc(med(npt.map(x => x.ec))).padStart(10) + '   ' + pc(med(npt.map(x => Math.abs(x.ec)))).padStart(12));
  if (pt.length) {
    const malusImplicite = 1 / (1 + med(pt.map(x => x.ec)));
    console.log('\n  → malus qui annulerait le biais des PureTech : ×' + malusImplicite.toFixed(3));
  }
  console.log('\n  détail des annonces PureTech reconnues :');
  for (const o of pt) console.log('     ' + o.mo.padEnd(22) + o.an + '   demandé ' + dt(o.prix).padStart(7) + '   calculé ' + dt(o.vv).padStart(7) + '   ' + pc(o.ec).padStart(8));

  // ── 3. Effet d'un malus, sur l'échantillon entier et sur les deux cas de référence ──
  console.log('\n3. EFFET D\'UN MALUS, SUR L\'ENSEMBLE ET SUR LES DEUX CAS DE RÉFÉRENCE\n');
  console.log('  malus    échantillon entier        PureTech seuls        Corsa 1.2 L 2022 90 000 km');
  console.log('           biais    |écart|  <20 %   biais    |écart|      (marché 34 000 à 38 000)');
  setFY(2022);
  const corsa = win.DB.Opel['Opel Corsa'][0];
  const rc = win.computeVV(corsa, 90000, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
  const corsaPT = estPureTech('Opel', 'Opel Corsa', corsa, 2022);
  for (const m of [1, 0.90, 0.85, 0.80, 0.75]) {
    const o = obs.map(x => ({ ...x, ec2: (x.vv * (x.pt ? m : 1)) / x.prix - 1 }));
    const p2 = o.filter(x => x.pt);
    console.log('  ×' + m.toFixed(2) + '   ' + pc(med(o.map(x => x.ec2))).padStart(7) + '  ' +
      pc(med(o.map(x => Math.abs(x.ec2)))).padStart(7) + '  ' +
      (o.filter(x => Math.abs(x.ec2) < 0.20).length + '/' + o.length).padStart(7) + '   ' +
      pc(med(p2.map(x => x.ec2))).padStart(7) + '  ' + pc(med(p2.map(x => Math.abs(x.ec2)))).padStart(7) + '      ' +
      dt(rc.vv * (corsaPT ? m : 1)).padStart(7) + ' DT   ' + pc(rc.vv * (corsaPT ? m : 1) / 34000 - 1).padStart(8) + ' / 34 000');
  }
  console.log('\n  la Corsa 1.2 L 2022 est reconnue PureTech : ' + (corsaPT ? 'oui — ' + corsaPT : 'NON'));
  console.log('\n  Les deux sources convergent-elles ? Le malus lu sur la 208 (échantillon) et celui');
  console.log('  qu\'il faut pour amener la Corsa sous 34 000 DT (repère de l\'expert, hors échantillon)');
  console.log('  sont à comparer : s\'ils se rejoignent, le malus n\'est pas un ajustement de circonstance.');
}, 900);
