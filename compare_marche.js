// Confrontation annonce par annonce : valeur calculée contre prix demandé.
// Échantillon relevé le 28.09.2026 sur automobile.tn (rubrique occasion), 18 modèles.
//
// PRÉCAUTION DE LECTURE, qui commande toute l'interprétation :
// les annonces NE DISENT PAS l'usage du véhicule, et encore moins qu'il sort d'une société de
// location. L'échantillon est donc un MÉLANGE — particuliers, sociétés, ex-location, ex-taxi —
// alors que le calcul, lui, suppose un usage. On compare donc par défaut en « particulier »,
// puis on mesure ce que la composition d'usage inconnue peut expliquer de l'écart restant.
//
//   node compare_marche.js              → paramètres actuels
//   node compare_marche.js P1 | P3      → jeux de paramètres candidats (simulation en mémoire)
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const JEU = (process.argv[2] || 'ACTUEL').toUpperCase();
const CY = 2026;
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const pc = x => ((x >= 0 ? '+' : '') + (x * 100).toFixed(1) + ' %');
const dt = n => Math.round(n).toLocaleString('fr-FR');

// Noms du relevé -> noms de la base
const ALIAS = {
  'Citroen C3': 'Citroën C3', 'BMW Serie 3': 'BMW Série 3', 'Renault Symbol': 'Renault Symbol',
  'Volkswagen Golf 7': 'Volkswagen Golf 7', 'Mercedes-Benz Classe C': 'Mercedes-Benz Classe C',
};

setTimeout(() => {
  const P = win.eval('VVPARAMS');
  let ABATT = 1;
  const VARIANTES = {
    P1: { gp: 0.068, hg: 0.0698, lx: 0.0833, km: 0.0091, abatt: 1 },
    P3: { gp: 0.068, hg: 0.0698, lx: 0.0833, km: 0.0091, abatt: 0.93 },
    // Correction plus prudente : la moitié du chemin sur la gamme grand public.
    P4: { gp: 0.058, hg: 0.0698, lx: 0.0833, km: 0.0091, abatt: 1 },
    // Le premium est la gamme la plus surévaluée de l'échantillon : on l'accélère aussi.
    P5: { gp: 0.058, hg: 0.075, lx: 0.095, km: 0.0091, abatt: 1 },
  };
  if (VARIANTES[JEU]) {
    const v = VARIANTES[JEU];
    P.gammes[0].tauxDeprAn = v.gp; P.gammes[1].tauxDeprAn = v.hg; P.gammes[2].tauxDeprAn = v.lx;
    P.malusPar10000km = v.km; ABATT = v.abatt;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) { delete f.__vs; delete f.__cg; }
  }
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };

  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  // Deux façons de choisir la finition, parce que ce choix pèse autant que les paramètres :
  //   'med'  — la finition médiane en prix, comme le fait validation.js ;
  //   'min'  — la moins chère disponible, plus proche de ce qui se vend d'occasion
  //            (les annonces portent rarement sur les finitions hautes).
  function pickFin(k, mec, mode) {
    let br = null; for (const b of Object.keys(win.DB)) if (win.DB[b][k]) br = b;
    if (!br) return null;
    const f = win.DB[br][k];
    const dispo = f.filter(x => win.yOf(x.d0) <= mec && mec <= win.yOf(x.d) + 1);
    const pool = dispo.length ? dispo : f;
    const t = pool.slice().sort((a, b) => a.p - b.p);
    return (mode === 'min' ? t[0] : t[Math.floor(t.length / 2)]) || null;
  }

  const lignes = fs.readFileSync('marche_occasion_28092026.csv', 'utf8').trim().split(/\r?\n/).slice(1);
  const obs = [];
  let rejet = 0;
  for (const l of lignes) {
    const [date, src, mo0, aS, kS, pS, ville] = l.split(';');
    const mo = ALIAS[mo0] || mo0;
    const an = +aS, km = +kS, prix = +pS;
    if (!existe[mo]) { rejet++; continue; }
    if (!(an >= 2005 && an <= CY) || !(prix >= 8000) || !(km > 0)) { rejet++; continue; }
    const fin = pickFin(mo, an, 'med'), finMin = pickFin(mo, an, 'min');
    if (!fin) { rejet++; continue; }
    setFY(an);
    const r = win.computeVV(fin, km, 'normal', 'particulier', null, CY, null, 'aucun');
    const rMin = finMin ? win.computeVV(finMin, km, 'normal', 'particulier', null, CY, null, 'aucun') : null;
    if (!r) { rejet++; continue; }
    const vv = Math.round(r.vv * ABATT / 100) * 100;
    const vvMin = rMin ? Math.round(rMin.vv * ABATT / 100) * 100 : null;
    obs.push({ mo, an, km, prix, vv, vvMin, age: CY - an, ecart: vv / prix - 1,
               ecartMin: vvMin != null ? vvMin / prix - 1 : null, gamme: r.gamme.nom, ven: r.ven.VEN });
  }

  console.log('ÉCHANTILLON DU MARCHÉ — relevé du 28.09.2026, automobile.tn (occasion)');
  console.log('Jeu de paramètres : ' + JEU + (ABATT < 1 ? ' (abattement ' + Math.round((1 - ABATT) * 100) + ' %)' : ''));
  console.log(obs.length + ' annonces exploitées, ' + rejet + ' écartées (modèle absent de la base, prix ou km manquants)\n');

  const bilan = (nom, sub) => {
    if (sub.length < 3) return;
    const e = sub.map(x => x.ecart);
    console.log(nom.padEnd(26) + String(sub.length).padStart(5) +
      pc(med(e)).padStart(12) + pc(med(e.map(Math.abs))).padStart(14) +
      (sub.filter(x => Math.abs(x.ecart) <= 0.20).length + '/' + sub.length).padStart(10) +
      (sub.filter(x => x.ecart > 0).length / sub.length * 100).toFixed(0).padStart(9) + ' %');
  };
  console.log('ensemble / groupe'.padEnd(26) + 'n'.padStart(5) + 'biais méd.'.padStart(12) + 'écart abs.'.padStart(14) + 'sous 20 %'.padStart(10) + 'au-dessus'.padStart(11));
  console.log('-'.repeat(78));
  bilan('TOUT L\'ÉCHANTILLON', obs);
  console.log('');
  for (const g of ['Grand public', 'Haut de gamme', 'Luxe / premium']) bilan('gamme : ' + g, obs.filter(x => x.gamme === g));
  console.log('');
  for (const [nom, min, max] of [['0-3 ans', 0, 3], ['4-6 ans', 4, 6], ['7-10 ans', 7, 10], ['11-15 ans', 11, 15], ['16 ans et +', 16, 99]])
    bilan('âge : ' + nom, obs.filter(x => x.age >= min && x.age <= max));
  console.log('');
  const parModele = {};
  for (const o of obs) (parModele[o.mo] = parModele[o.mo] || []).push(o);
  for (const m of Object.keys(parModele).sort((a, b) => med(parModele[b].map(x => x.ecart)) - med(parModele[a].map(x => x.ecart))))
    bilan(m, parModele[m]);

  // ── Le choix de la finition pèse autant que les paramètres ──
  const avecMin = obs.filter(x => x.ecartMin != null);
  console.log('\n══ Effet du choix de la finition ══');
  console.log('finition médiane en prix   : biais médian ' + pc(med(obs.map(x => x.ecart))) +
    ' · écart absolu ' + pc(med(obs.map(x => Math.abs(x.ecart)))));
  console.log('finition la moins chère    : biais médian ' + pc(med(avecMin.map(x => x.ecartMin))) +
    ' · écart absolu ' + pc(med(avecMin.map(x => Math.abs(x.ecartMin)))));
  console.log('Les annonces ne précisent pas la finition : la vérité est entre les deux, plus près');
  console.log('de la seconde pour les modèles à large gamme (Tucson, 208, Classe C).');

  // ── Ce que l'usage inconnu peut expliquer ──
  console.log('\n══ L\'usage n\'est pas déclaré dans les annonces ══');
  console.log('Le calcul ci-dessus suppose « particulier ». Si une part des annonces porte en réalité');
  console.log('sur des véhicules de société, de location ou ex-taxi, le prix demandé est plus bas que');
  console.log('celui d\'un véhicule de particulier comparable, et le modèle paraît d\'autant plus haut.');
  const biais = med(obs.map(x => x.ecart));
  console.log('\nBiais médian observé : ' + pc(biais));
  console.log('part supposée d\'annonces non-particulier | coefficient d\'usage moyen | biais corrigé');
  for (const part of [0, 0.15, 0.25, 0.40]) {
    for (const coef of [0.92, 0.85, 0.80]) {
      if (part === 0 && coef !== 0.92) continue;
      const moyen = 1 - part * (1 - coef);
      console.log(('  ' + (part * 100).toFixed(0) + ' %').padEnd(42) + ('×' + moyen.toFixed(3)).padStart(26) +
        pc((1 + biais) * moyen - 1).padStart(15));
    }
  }
  console.log('\nLecture : à 25 % d\'annonces non-particulier et un coefficient de 0,80, le biais médian');
  console.log('se lit environ 5 points plus bas que le chiffre brut. Cela ne se mesure pas sur les');
  console.log('annonces — c\'est une fourchette, pas une correction à appliquer.');

  // Les dix annonces les plus mal reproduites
  console.log('\n══ Dix annonces les plus mal reproduites ══');
  const pires = obs.slice().sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart)).slice(0, 10);
  console.log('modèle'.padEnd(26) + 'an'.padStart(6) + 'km'.padStart(10) + 'demandé'.padStart(10) + 'calculé'.padStart(10) + 'écart'.padStart(9));
  for (const o of pires)
    console.log(o.mo.slice(0, 25).padEnd(26) + String(o.an).padStart(6) + dt(o.km).padStart(10) +
      dt(o.prix).padStart(10) + dt(o.vv).padStart(10) + pc(o.ecart).padStart(9));
}, 900);
