// JEUX COMBINÉS — malus PureTech, forme de la courbe, abattement. Simulation, rien n'est écrit.
//
// Trois leviers, trois questions distinctes qu'il ne faut pas mélanger :
//   A. le MALUS DE MOTORISATION : les PureTech décotent plus (fait apporté par Yassine Hadiji le
//      29.09.2026). Mesuré à ×0,90 sur les 15 annonces PureTech de l'échantillon.
//   B. la FORME de la courbe : le marché implique 11 %/an à 1-2 ans et 6 % à 9-10 ans, alors que
//      le modèle applique 5,80 %/an partout. Mesuré par diag_courbe.js.
//   C. l'ABATTEMENT « prix demandé → valeur vénale » : la valeur vénale est légèrement inférieure
//      à la valeur marchande (doctrine rappelée par Yassine Hadiji). Il n'existe pas aujourd'hui.
//
// Chaque jeu est jugé sur quatre épreuves : l'échantillon entier, le sous-groupe PureTech, la
// Corsa 2022 (HORS échantillon, repère 34-38 000 DT) et l'Agya 2022 en location.
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
// Exclusions nominatives : moteurs de 1.0 / 1.2 litre de ces marques qui NE SONT PAS des EB2.
// La 108 partage sa plateforme et son moteur avec la Toyota Aygo : son 1.0 VTi est un Toyota 1KR,
// pas un PureTech. Les Opel d'avant 2020 ont leurs propres 1.0 / 1.2 (ecoFLEX, Twinport).
const EXCLUS = [/peugeot 108/i, /citroën c1/i, /citroen c1/i];
function estPureTech(marque, modele, fin, millesime) {
  const debut = MARQUES_PSA[marque];
  if (debut == null) return null;
  if (EXCLUS.some(r => r.test(modele))) return null;
  const t = modele + ' ' + fin.v + ' ' + ((fin.eg && (fin.eg.motor || fin.eg.moteur)) || '') + ' ' + ((fin.sp && fin.sp.moteur) || '');
  const fuel = (fin.eg && fin.eg.fuel) || (fin.sp && fin.sp.carburant) || '';
  if (/diesel|hdi|bluehdi/i.test(t + ' ' + fuel)) return null;
  if (/élec|elec|⚡|hybride|🔌|🌿/i.test(fuel) || /\be-|électrique/i.test(t)) return null;
  if (millesime != null && (millesime < debut || millesime > 2023)) return null;
  if (/puretech|pure tech/i.test(t)) return 'libellé PureTech';
  if (/(^|[^0-9.])1[.,]2(\s|$|[^0-9])/.test(t)) return 'essence 1.2 de la période (EB2)';
  return null;
}

const JEUX = {
  ACTUEL: { malus: 1, abatt: 1, paliers: null, note: 'en service : 5,80 / 7,50 / 9,50 %/an, aucun malus moteur, aucun abattement' },
  R1: { malus: 0.90, abatt: 1, paliers: null, note: 'malus PureTech ×0,90 seul — la valeur mesurée sur l\'échantillon' },
  R2: { malus: 0.90, abatt: 0.95, paliers: null, note: 'malus ×0,90 + abattement 5 % (valeur vénale sous le marché)' },
  R3: { malus: 0.90, abatt: 1, note: 'malus ×0,90 + courbe par morceaux adoucie',
        paliers: { 'Grand public': [[2, 0.095], [4, 0.075], [6, 0.065], [99, 0.058]],
                   'Haut de gamme': [[3, 0.090], [6, 0.078], [99, 0.075]],
                   'Luxe / premium': [[3, 0.120], [6, 0.120], [99, 0.095]] } },
  R4: { malus: 0.85, abatt: 0.95, paliers: null, note: 'malus ×0,85 + abattement 5 %' },
};

setTimeout(() => {
  const P = win.eval('VVPARAMS');
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  function fAgeDe(jeu, gamme, age, fAgeModele) {
    if (!jeu.paliers || !jeu.paliers[gamme]) return fAgeModele;
    let f = 1, borne = 0;
    for (const [jusqua, taux] of jeu.paliers[gamme]) {
      const ans = Math.min(Math.max(age - borne, 0), jusqua - borne);
      if (ans > 0) f *= Math.pow(1 - taux, ans);
      borne = jusqua;
      if (age <= jusqua) break;
    }
    return Math.max(f, P.valeurResiduelle);
  }
  const vvDe = (jeu, c) => c.horsAge * fAgeDe(jeu, c.gamme, c.age, c.fAge) * (c.pt ? jeu.malus : 1) * jeu.abatt;

  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  function pickFin(k, mec, mode) {
    let br = null; for (const b of Object.keys(win.DB)) if (win.DB[b][k]) br = b;
    if (!br) return null;
    const f = win.DB[br][k];
    const dispo = f.filter(x => win.yOf(x.d0) <= mec && mec <= win.yOf(x.d) + 1);
    const pool = dispo.length ? dispo : f;
    const t = pool.slice().sort((a, b) => a.p - b.p);
    return { marque: br, fin: (mode === 'min' ? t[0] : t[Math.floor(t.length / 2)]) || null };
  }

  const cache = [];
  for (const mode of ['med', 'min'])
    for (const l of fs.readFileSync('marche_occasion_28092026.csv', 'utf8').trim().split(/\r?\n/).slice(1)) {
      const [, , mo0, aS, kS, pS] = l.split(';');
      const mo = ALIAS[mo0] || mo0, an = +aS, km = +kS, prix = +pS;
      if (!existe[mo] || !an || !prix) continue;
      const p = pickFin(mo, an, mode);
      if (!p || !p.fin) continue;
      setFY(an);
      const r = win.computeVV(p.fin, km, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
      if (!r || !r.ven || !r.ven.VEN) continue;
      cache.push({ mode, mo, an, prix, age: r.age, gamme: r.gamme.nom, fAge: r.fAge,
        horsAge: r.ven.VEN * r.fEtat * r.fKm * r.fUsage * r.fCarb * r.fBat,
        pt: !!estPureTech(p.marque, mo, p.fin, an) });
    }

  console.log('JEUX COMBINÉS — simulation en mémoire, aucun fichier modifié\n');
  console.log('Épreuve 1 — les 152 annonces du 28.09.2026, prix DEMANDÉS\n');
  console.log('jeu      finition médiane          moins chère       PureTech (15)     par gamme gp / hg / prem.');
  console.log('         biais    |écart|  <20 %   biais    |écart|   biais            (finition médiane)');
  for (const n of Object.keys(JEUX)) {
    const j = JEUX[n], R = {};
    for (const mode of ['med', 'min']) {
      const o = cache.filter(x => x.mode === mode).map(x => ({ ...x, ec: vvDe(j, x) / x.prix - 1 }));
      R[mode] = o;
    }
    const g = ['Grand public', 'Haut de gamme', 'Luxe / premium'].map(gm => pc(med(R.med.filter(x => x.gamme === gm).map(x => x.ec))));
    console.log(n.padEnd(8) + pc(med(R.med.map(x => x.ec))).padStart(7) + '  ' + pc(med(R.med.map(x => Math.abs(x.ec)))).padStart(7) + '  ' +
      (R.med.filter(x => Math.abs(x.ec) < 0.20).length + '/' + R.med.length).padStart(7) + '   ' +
      pc(med(R.min.map(x => x.ec))).padStart(7) + '  ' + pc(med(R.min.map(x => Math.abs(x.ec)))).padStart(7) + '   ' +
      pc(med(R.med.filter(x => x.pt).map(x => x.ec))).padStart(7) + '          ' + g.join(' / '));
  }
  console.log('\n  ' + Object.keys(JEUX).map(n => n + ' : ' + JEUX[n].note).join('\n  '));

  console.log('\nBiais médian par tranche d\'âge (finition médiane) :');
  console.log('jeu       1-3 ans   4-6 ans   7-10 ans   11-15 ans   16 ans et +');
  for (const n of Object.keys(JEUX)) {
    const o = cache.filter(x => x.mode === 'med').map(x => ({ ...x, ec: vvDe(JEUX[n], x) / x.prix - 1 }));
    const c = [[1, 3], [4, 6], [7, 10], [11, 15], [16, 40]].map(([a, b]) => {
      const g = o.filter(x => x.age >= a && x.age <= b);
      return g.length ? pc(med(g.map(x => x.ec))) : '—';
    });
    console.log(n.padEnd(8) + c.map(x => x.padStart(10)).join('  '));
  }

  // ── Épreuve 2 : la Corsa, hors échantillon ──
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('Épreuve 2 — Opel Corsa 2022, 90 000 km, particulier · HORS ÉCHANTILLON');
  console.log('Marché de l\'expert : 34 000 à 38 000 DT · cible : un peu SOUS 34 000\n');
  console.log('finition               ' + Object.keys(JEUX).map(n => n.padStart(11)).join(''));
  for (const f of [win.DB.Opel['Opel Corsa'][0], win.DB.Opel['Opel Corsa'][2], win.DB.Opel['Opel Corsa'][4]]) {
    setFY(2022);
    const r = win.computeVV(f, 90000, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
    const c = { horsAge: r.ven.VEN * r.fEtat * r.fKm * r.fUsage * r.fCarb * r.fBat, gamme: r.gamme.nom,
      age: r.age, fAge: r.fAge, pt: !!estPureTech('Opel', 'Opel Corsa', f, 2022) };
    console.log(f.v.padEnd(22) + Object.keys(JEUX).map(n => dt(vvDe(JEUX[n], c)).padStart(11)).join(''));
  }

  // ── Épreuve 3 : l'Agya ──
  console.log('\nÉpreuve 3 — Toyota Agya 1.2 VVTi, MEC 07/2022, 78 160 km, location (non PureTech)');
  const agya = win.DB.Toyota['Toyota Agya'][0];
  setFY(2022);
  const ra = win.computeVV(agya, 78160, 'normal', 'location', null, CY, null, 'aucun', 7, 9);
  const ca = { horsAge: ra.ven.VEN * ra.fEtat * ra.fKm * ra.fUsage * ra.fCarb * ra.fBat, gamme: ra.gamme.nom,
    age: ra.age, fAge: ra.fAge, pt: false };
  console.log('  ' + Object.keys(JEUX).map(n => n + ' ' + dt(vvDe(JEUX[n], ca))).join('  ·  ') + '   (marché public 35 000)');
}, 900);
