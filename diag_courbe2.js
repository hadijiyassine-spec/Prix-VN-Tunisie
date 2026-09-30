// Jeux candidats pour le NIVEAU et la FORME de la décote — simulation en mémoire, rien n'est écrit.
//
// Constat du 29.09.2026 (Yassine Hadiji) : une Opel Corsa de 2022 se vend 34 à 38 000 DT, et
// l'application en annonce 43 300 (finition d'entrée) à 51 200 (finition médiane). Doctrine
// rappelée par lui : la valeur vénale est LÉGÈREMENT INFÉRIEURE à la valeur marchande.
//
// Ce que diag_courbe.js a mesuré : le taux que le marché implique n'est PAS constant. Avec la
// convention « finition médiane », il vaut 11,2 %/an à 1-2 ans, 8,2 % à 3-4 ans, 6,6 % à 5-6 ans,
// puis ~5,8 % — alors que le modèle applique 5,80 %/an à tous les âges. Un taux unique ne peut
// pas coller aux deux bouts : ajusté sur les vieux, il surévalue les récents.
//
// On simule donc quatre familles de correctifs, chacune évaluée sur TROIS épreuves indépendantes :
//   · les 152 annonces du 28.09.2026 (échantillon de calibration) ;
//   · la Corsa 2022, qui n'est PAS dans cet échantillon — épreuve hors échantillon ;
//   · l'Agya 2022 en location, le cas de la v55.
// Aucun paramètre n'est ajusté sur la Corsa seule : elle ne sert qu'à contrôler.
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

// ── Les jeux candidats ──
// palier : [âge inclus jusqu'à, taux annuel appliqué SUR CETTE TRANCHE]. Le facteur d'âge est le
// produit des tranches traversées — c'est une courbe par morceaux, pas un taux moyen.
// abatt : abattement « prix demandé → valeur vénale ». Il est SÉPARÉ de la décote : confondre les
// deux, c'est ce qui avait fait aller P3 trop bas en v55.
const JEUX = {
  ACTUEL: { paliers: null, abatt: 1, note: 'taux constant par gamme : 5,80 / 7,50 / 9,50 %/an' },
  Q1: { abatt: 1, note: 'courbe par morceaux, mesurée (finition médiane), sans abattement',
        paliers: { 'Grand public': [[2, 0.112], [4, 0.082], [6, 0.066], [10, 0.058], [99, 0.055]],
                   'Haut de gamme': [[3, 0.094], [6, 0.081], [10, 0.069], [99, 0.082]],
                   'Luxe / premium': [[3, 0.144], [6, 0.151], [10, 0.103], [99, 0.095]] } },
  Q2: { abatt: 0.93, note: 'taux actuels + abattement de 7 % (valeur vénale sous le marché)',
        paliers: null },
  Q3: { abatt: 0.95, note: 'courbe par morceaux ADOUCIE + abattement de 5 %',
        paliers: { 'Grand public': [[2, 0.095], [4, 0.075], [6, 0.065], [99, 0.058]],
                   'Haut de gamme': [[3, 0.090], [6, 0.078], [99, 0.075]],
                   'Luxe / premium': [[3, 0.120], [6, 0.120], [99, 0.095]] } },
  Q4: { abatt: 1, note: 'courbe par morceaux adoucie, SANS abattement',
        paliers: { 'Grand public': [[2, 0.095], [4, 0.075], [6, 0.065], [99, 0.058]],
                   'Haut de gamme': [[3, 0.090], [6, 0.078], [99, 0.075]],
                   'Luxe / premium': [[3, 0.120], [6, 0.120], [99, 0.095]] } },
};

setTimeout(() => {
  const P = win.eval('VVPARAMS');
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  function pickFin(k, mec, mode) {
    let br = null; for (const b of Object.keys(win.DB)) if (win.DB[b][k]) br = b;
    if (!br) return null;
    const f = win.DB[br][k];
    const dispo = f.filter(x => win.yOf(x.d0) <= mec && mec <= win.yOf(x.d) + 1);
    const pool = dispo.length ? dispo : f;
    const t = pool.slice().sort((a, b) => a.p - b.p);
    return (mode === 'min' ? t[0] : t[Math.floor(t.length / 2)]) || null;
  }
  // Facteur d'âge d'un jeu : produit des tranches traversées, borné au plancher résiduel.
  function fAgeDe(jeu, gamme, age, fAgeModele) {
    if (!jeu.paliers) return fAgeModele;
    const p = jeu.paliers[gamme];
    if (!p) return fAgeModele;
    let reste = age, f = 1, borneBasse = 0;
    for (const [jusqua, taux] of p) {
      const ans = Math.min(Math.max(age - borneBasse, 0), jusqua - borneBasse);
      if (ans > 0) f *= Math.pow(1 - taux, ans);
      borneBasse = jusqua;
      if (age <= jusqua) break;
    }
    return Math.max(f, P.valeurResiduelle);
  }

  // ── Les 152 annonces, une seule passe dans l'application ──
  const cache = [];
  for (const mode of ['med', 'min']) {
    for (const l of fs.readFileSync('marche_occasion_28092026.csv', 'utf8').trim().split(/\r?\n/).slice(1)) {
      const [, , mo0, aS, kS, pS] = l.split(';');
      const mo = ALIAS[mo0] || mo0, an = +aS, km = +kS, prix = +pS;
      if (!existe[mo] || !an || !prix) continue;
      const f = pickFin(mo, an, mode);
      if (!f) continue;
      setFY(an);
      const r = win.computeVV(f, km, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
      if (!r || !r.ven || !r.ven.VEN) continue;
      cache.push({ mode, mo, an, km, prix, age: r.age, gamme: r.gamme.nom,
        horsAge: r.ven.VEN * r.fEtat * r.fKm * r.fUsage * r.fCarb * r.fBat, fAge: r.fAge, vv: r.vv });
    }
  }

  console.log('CANDIDATS POUR LA DÉCOTE — simulation en mémoire, aucun fichier modifié\n');
  console.log('Épreuve 1 — les 152 annonces du 28.09.2026 (prix DEMANDÉS)\n');
  console.log('jeu      finition médiane          finition la moins chère        par gamme (médiane)');
  console.log('         biais    |écart|  <20 %   biais    |écart|  <20 %       gp / hg / premium');
  for (const nom of Object.keys(JEUX)) {
    const jeu = JEUX[nom];
    const res = {};
    for (const mode of ['med', 'min']) {
      const o = cache.filter(x => x.mode === mode).map(x => {
        const vv = x.horsAge * fAgeDe(jeu, x.gamme, x.age, x.fAge) * jeu.abatt;
        return { ...x, vv, ec: vv / x.prix - 1 };
      });
      res[mode] = { biais: med(o.map(x => x.ec)), abs: med(o.map(x => Math.abs(x.ec))),
        sous: o.filter(x => Math.abs(x.ec) < 0.20).length, n: o.length, o };
    }
    const g = ['Grand public', 'Haut de gamme', 'Luxe / premium'].map(gm =>
      pc(med(res.med.o.filter(x => x.gamme === gm).map(x => x.ec))));
    console.log(nom.padEnd(8) + pc(res.med.biais).padStart(7) + '  ' + pc(res.med.abs).padStart(7) + '  ' +
      (res.med.sous + '/' + res.med.n).padStart(7) + '   ' + pc(res.min.biais).padStart(7) + '  ' +
      pc(res.min.abs).padStart(7) + '  ' + (res.min.sous + '/' + res.min.n).padStart(7) + '     ' + g.join(' / '));
    JEUX[nom].res = res;
  }
  console.log('\n  ' + Object.keys(JEUX).map(n => n + ' : ' + JEUX[n].note).join('\n  '));

  // ── Épreuve 2 : la Corsa 2022, hors échantillon ──
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('Épreuve 2 — Opel Corsa 2022, 90 000 km, particulier, HORS ÉCHANTILLON');
  console.log('Marché donné par l\'expert : 34 000 à 38 000 DT · cible : un peu SOUS 34 000\n');
  const corsa = [win.DB.Opel['Opel Corsa'][0], win.DB.Opel['Opel Corsa'][2], win.DB.Opel['Opel Corsa'][4]];
  console.log('finition                 VEN' + Object.keys(JEUX).map(n => n.padStart(10)).join(''));
  for (const f of corsa) {
    setFY(2022);
    const r = win.computeVV(f, 90000, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
    const horsAge = r.ven.VEN * r.fEtat * r.fKm * r.fUsage * r.fCarb * r.fBat;
    console.log(f.v.padEnd(22) + dt(r.ven.VEN).padStart(8) +
      Object.keys(JEUX).map(n => dt(horsAge * fAgeDe(JEUX[n], r.gamme.nom, r.age, r.fAge) * JEUX[n].abatt).padStart(10)).join(''));
  }

  // ── Épreuve 3 : l'Agya de la v55 ──
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('Épreuve 3 — Toyota Agya 1.2 VVTi, MEC 07/2022, 78 160 km, LOCATION');
  console.log('Marché public relevé le 28.09 : 35 000 DT · expert : 25 500 DT\n');
  const agya = win.DB.Toyota['Toyota Agya'][0];
  setFY(2022);
  const ra = win.computeVV(agya, 78160, 'normal', 'location', null, CY, null, 'aucun', 7, 9);
  const hA = ra.ven.VEN * ra.fEtat * ra.fKm * ra.fUsage * ra.fCarb * ra.fBat;
  console.log('VEN ' + dt(ra.ven.VEN) + ' · âge ' + win.libAge(ra.age, ra.ageMois));
  for (const n of Object.keys(JEUX))
    console.log('  ' + n.padEnd(8) + dt(hA * fAgeDe(JEUX[n], ra.gamme.nom, ra.age, ra.fAge) * JEUX[n].abatt).padStart(9) + ' DT');

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('Ce que la simulation ne dit pas : les prix de l\'échantillon sont DEMANDÉS, pas');
  console.log('transigés ; l\'usage n\'y est pas déclaré ; et la convention de finition déplace');
  console.log('le biais de 6 à 7 points à elle seule. Le choix entre ces jeux est un arbitrage');
  console.log('d\'expert, pas le résultat d\'un ajustement.');
}, 900);
