// D'où vient la DISPERSION de l'erreur, modèle par modèle ?
//
// Le modèle est +34,7 % sur le Tucson et −25,1 % sur le Symbol, pour un biais d'ensemble de
// +2,7 %. Un changement de taux global ne ferait que tout translater : il corrigerait le Tucson
// en cassant le Symbol. Avant de toucher au taux, il faut savoir ce qui sépare les deux.
//
// Hypothèse testée ici : la méthode B ancre la valeur vénale sur la valeur à neuf D'AUJOURD'HUI
// (dernier tarif de la phase, actualisé). Or les prix du neuf ont fortement monté en Tunisie
// depuis 2021. Si le marché de l'occasion ne suit ce renchérissement qu'en partie, alors plus
// l'écart entre le tarif d'aujourd'hui et celui du millésime est grand, plus le modèle surévalue.
// C'est vérifiable : on classe les annonces par ce rapport et on regarde l'erreur.
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
const ALIAS = { 'Citroen C3': 'Citroën C3', 'BMW Serie 3': 'BMW Série 3' };

setTimeout(() => {
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  function pickFin(k, mec) {
    let br = null; for (const b of Object.keys(win.DB)) if (win.DB[b][k]) br = b;
    if (!br) return null;
    const f = win.DB[br][k];
    const dispo = f.filter(x => win.yOf(x.d0) <= mec && mec <= win.yOf(x.d) + 1);
    const pool = dispo.length ? dispo : f;
    const t = pool.slice().sort((a, b) => a.p - b.p);
    return t[Math.floor(t.length / 2)] || null;
  }

  const obs = [];
  for (const l of fs.readFileSync('marche_occasion_28092026.csv', 'utf8').trim().split(/\r?\n/).slice(1)) {
    const [, , mo0, aS, kS, pS] = l.split(';');
    const mo = ALIAS[mo0] || mo0, an = +aS, km = +kS, prix = +pS;
    if (!existe[mo] || !an || !prix) continue;
    const f = pickFin(mo, an);
    if (!f) continue;
    setFY(an);
    const r = win.computeVV(f, km, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
    if (!r || !r.ven || !r.ven.VEN) continue;
    const tm = win.tarifMillesime(f, an, null);
    if (!tm || !tm.p) continue;
    // Le renchérissement du neuf entre le millésime et aujourd'hui, tel que le modèle le voit.
    obs.push({ mo, an, km, prix, age: r.age, gamme: r.gamme.nom, ven: r.ven.VEN, tarifMec: tm.p,
      inflation: r.ven.VEN / tm.p, ec: r.vv / prix - 1, vv: r.vv });
  }

  console.log('DISPERSION DE L\'ERREUR — 152 annonces du 28.09.2026, finition médiane\n');
  console.log('Hypothèse : plus la valeur à neuf d\'AUJOURD\'HUI dépasse le tarif du MILLÉSIME,');
  console.log('plus le modèle surévalue — parce que l\'occasion ne suit pas tout le renchérissement.\n');
  console.log('renchérissement du neuf (VEN / tarif du millésime)    n   biais médian   |écart| médian');
  const tranches = [[0, 1.00], [1.00, 1.10], [1.10, 1.25], [1.25, 1.45], [1.45, 9]];
  for (const [a, b] of tranches) {
    const g = obs.filter(x => x.inflation >= a && x.inflation < b);
    if (!g.length) continue;
    const lib = (b > 8 ? '×' + a.toFixed(2) + ' et plus' : '×' + a.toFixed(2) + ' à ×' + b.toFixed(2));
    console.log('  ' + lib.padEnd(50) + String(g.length).padStart(3) + '   ' +
      pc(med(g.map(x => x.ec))).padStart(10) + '   ' + pc(med(g.map(x => Math.abs(x.ec)))).padStart(12));
  }

  // Corrélation simple, pour ne pas lire une pente dans du bruit.
  const xs = obs.map(x => x.inflation), ys = obs.map(x => x.ec);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
  console.log('\n  corrélation entre renchérissement et erreur : r = ' + (num / Math.sqrt(dx * dy)).toFixed(3) +
    '   (pente ' + (num / dx).toFixed(3) + ' point d\'erreur par point de renchérissement)');

  console.log('\nPar modèle, du plus surévalué au moins — avec son renchérissement :');
  console.log('  modèle                       n   biais médian   renchérissement médian   âge médian');
  const parMo = {};
  for (const o of obs) { (parMo[o.mo] = parMo[o.mo] || []).push(o); }
  for (const mo of Object.keys(parMo).sort((a, b) => med(parMo[b].map(x => x.ec)) - med(parMo[a].map(x => x.ec)))) {
    const g = parMo[mo];
    console.log('  ' + mo.padEnd(26) + String(g.length).padStart(3) + '   ' + pc(med(g.map(x => x.ec))).padStart(10) +
      '   ×' + med(g.map(x => x.inflation)).toFixed(3).padStart(20) + '   ' + med(g.map(x => x.age)).toFixed(0).padStart(8) + ' ans');
  }

  // Le cas Corsa dans cette grille de lecture.
  setFY(2022);
  const f = win.DB.Opel['Opel Corsa'][0];
  const r = win.computeVV(f, 90000, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
  const tm = win.tarifMillesime(f, 2022, null);
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('L\'Opel Corsa 2022 dans cette grille :');
  console.log('  tarif du millésime 2022 : ' + tm.p.toLocaleString('fr-FR') + ' DT (' + tm.d + ')');
  console.log('  valeur à neuf retenue (VEN ' + CY + ') : ' + Math.round(r.ven.VEN).toLocaleString('fr-FR') + ' DT');
  console.log('  renchérissement : ×' + (r.ven.VEN / tm.p).toFixed(3));
  console.log('  valeur calculée : ' + Math.round(r.vv).toLocaleString('fr-FR') + ' DT · marché 34 000 à 38 000 DT');
  console.log('  rétention exigée par le marché : ' + (34000 / r.ven.VEN).toFixed(3) + ' à ' + (38000 / r.ven.VEN).toFixed(3) +
    ' de la valeur à neuf d\'aujourd\'hui');
  console.log('  rétention exigée sur le PRIX D\'ACHAT de 2022 : ' + (34000 / tm.p).toFixed(3) + ' à ' + (38000 / tm.p).toFixed(3));
}, 900);
