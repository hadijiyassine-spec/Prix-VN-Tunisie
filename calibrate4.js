// Calibration de la COURBE de dévalorisation à partir des annonces d'occasion.
//
// Principe méthodologique (remarque de Yassine) : les prix d'annonce sont majorés par le
// vendeur et ne doivent PAS servir de référence de niveau. On ne s'en sert donc que pour
// la FORME de la courbe.
//
// Concrètement : on régresse log(F_âge observé) sur l'âge en laissant une CONSTANTE LIBRE.
//   log(ret) = log(k) + âge × log(1 - taux)
// La constante k absorbe la majoration vendeur (et tout biais de niveau : mélange de
// finitions, base VEN), la pente donne le taux de dépréciation. On ne retient QUE la pente.
// Le niveau, lui, reste ancré sur le prix catalogue : F_âge(0) = 1 par construction.
//
// C'est un vrai correctif : la version précédente forçait la droite par l'origine, ce qui
// obligeait la pente à absorber la majoration et faussait donc le taux.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('app.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const html = app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.com/app.html', pretendToBeVisual: true });
const win = dom.window;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));

const CY = 2026;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

// Régression pondérée avec constante libre : y = a + b·x
function wls(points) {
  let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of points) {
    const w = p.w;
    sw += w; sx += w * p.x; sy += w * p.y; sxx += w * p.x * p.x; sxy += w * p.x * p.y;
  }
  const d = sw * sxx - sx * sx;
  const b = (sw * sxy - sx * sy) / d;
  const a = (sy - b * sx) / sw;
  return { a, b };
}

setTimeout(() => {
  const P = win.eval('VVPARAMS');

  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  const cle = (nom, an) => existe[nom] ? nom
    : /^Volkswagen Golf$/i.test(nom) ? (an >= 2020 ? 'Volkswagen Golf 8' : an >= 2013 ? 'Volkswagen Golf 7' : 'Volkswagen Golf 6')
      : null;

  function pickFin(cleModele, mec) {
    let brand = null;
    for (const b of Object.keys(win.DB)) if (win.DB[b][cleModele]) brand = b;
    if (!brand) return null;
    const fins = win.DB[brand][cleModele];
    const dispo = fins.filter(f => win.yOf(f.d0) <= mec && mec <= win.yOf(f.d) + 1);
    const pool = dispo.length ? dispo : (() => {
      let best = Infinity, out = [];
      for (const f of fins) {
        const y0 = win.yOf(f.d0), y1 = win.yOf(f.d);
        const gap = mec < y0 ? y0 - mec : mec > y1 ? mec - y1 : 0;
        if (gap < best) { best = gap; out = [f]; } else if (gap === best) out.push(f);
      }
      return out;
    })();
    const tri = pool.slice().sort((a, b) => a.p - b.p);
    return tri[Math.floor(tri.length / 2)] || null;
  }

  // ── Lecture et nettoyage ──
  // Aucune minoration forfaitaire n'est appliquée au prix : la majoration vendeur sera
  // estimée par la constante de régression, pas supposée.
  const lines = fs.readFileSync('marche_occasion.csv', 'utf8').trim().split('\n').slice(1);
  const rows = [];
  let rej = 0;
  for (const l of lines) {
    const [modele, aS, pS, kS] = l.split(';');
    const annee = +aS, prix = +pS, km = kS === '' || kS == null || kS === '\r' ? null : +kS;
    const k = cle(modele, annee);
    if (!k || !existe[k]) { rej++; continue; }
    if (!(annee >= 2005 && annee <= CY) || !(prix >= 8000 && prix <= 400000)) { rej++; continue; }
    const fin = pickFin(k, annee);
    if (!fin) { rej++; continue; }
    const ven = win.computeVEN(fin, annee).VEN;
    const ret = prix / ven;                 // rétention BRUTE, majoration incluse
    if (!(ret >= 0.03 && ret <= 1.60)) { rej++; continue; }
    rows.push({ modele, k, annee, prix, km, age: CY - annee, ven, ret });
  }
  console.log('Annonces exploitables :', rows.length, '(rejetées :', rej + ')');
  const parModele = {};
  for (const r of rows) parModele[r.modele] = (parModele[r.modele] || 0) + 1;
  console.log('Répartition :', Object.entries(parModele).map(([m, n]) => m + '=' + n).join(' · '), '\n');

  const fKmOf = (km, age, sens) => {
    if (!(age > 0 && km != null && !isNaN(km) && km >= 0)) return 1;
    const impact = ((km - age * P.kmRefAnnuel) / 10000) * sens;
    return 1 - Math.max(-P.plafondBonusKm, Math.min(impact, P.plafondMalusKm));
  };

  // Ajustement du taux d'âge AVEC constante libre
  function fitTaux(sens, sousEnsemble) {
    const src = sousEnsemble || rows;
    const parAge = {};
    for (const r of src) {
      if (r.age < 1) continue;
      const f = r.ret / fKmOf(r.km, r.age, sens);
      if (f > 0.05 && f < 1.8) (parAge[r.age] = parAge[r.age] || []).push(f);
    }
    const pts = [];
    for (const a of Object.keys(parAge).map(Number)) {
      const g = parAge[a]; if (g.length < 3) continue;
      pts.push({ age: a, obs: median(g), n: g.length });
    }
    if (pts.length < 4) return null;
    const { a, b } = wls(pts.map(p => ({ x: p.age, y: Math.log(p.obs), w: p.n })));
    return { taux: 1 - Math.exp(b), majoration: Math.exp(a), pts };
  }

  // Ajustement de la sensibilité km, également avec constante libre
  function fitSens(taux) {
    const pts = [];
    for (const r of rows) {
      if (r.age < 1 || r.km == null || !isFinite(r.km) || r.km <= 0) continue;
      const fAge = Math.max(Math.pow(1 - taux, r.age), P.valeurResiduelle);
      const resid = r.ret / fAge;
      if (!(resid > 0.2 && resid < 3)) continue;
      const x = (r.km - r.age * P.kmRefAnnuel) / 10000;
      if (Math.abs(x) > 30) continue;
      pts.push({ x, y: Math.log(resid), w: 1 });
    }
    const { b } = wls(pts);
    return { sens: -b, n: pts.length };
  }

  let taux = 0.05, sens = P.malusPar10000km, majoration = 1;
  for (let i = 0; i < 10; i++) {
    const ft = fitTaux(sens); taux = ft.taux; majoration = ft.majoration;
    sens = fitSens(taux).sens;
  }

  console.log('=== Ajustement avec constante libre ===');
  console.log('Taux de dépréciation (pente)      : ' + (taux * 100).toFixed(2) + ' %/an');
  console.log('Sensibilité kilométrique          : ' + (sens * 100).toFixed(2) + ' %/10 000 km');
  console.log('Constante estimée (à ÉCARTER)     : ×' + majoration.toFixed(3) +
    '  => majoration vendeur + biais de niveau ≈ ' + ((majoration - 1) * 100).toFixed(1) + ' %');

  const final = fitTaux(sens);
  console.log('\nCourbe : observé (majoration incluse) vs modèle × constante');
  console.log('âge |  n  | observé | ajusté | écart');
  const ec = [];
  for (const p of final.pts.sort((a, b) => a.age - b.age)) {
    const theo = majoration * Math.max(Math.pow(1 - taux, p.age), P.valeurResiduelle);
    const e = (theo / p.obs - 1) * 100; ec.push(e);
    console.log(String(p.age).padStart(3) + ' | ' + String(p.n).padStart(3) + ' | ' +
      p.obs.toFixed(3).padStart(7) + ' | ' + theo.toFixed(3).padStart(6) + ' | ' + (e >= 0 ? '+' : '') + e.toFixed(0) + ' %');
  }
  console.log('Qualité d\'ajustement de la COURBE : écart absolu médian ' + median(ec.map(Math.abs)).toFixed(1) + ' %');

  // ── Le taux diffère-t-il selon le segment ? ──
  const SUV = ['Hyundai Tucson', 'Nissan Qashqai', 'Volkswagen Tiguan', 'Dacia Duster'];
  const citadines = rows.filter(r => !SUV.includes(r.modele));
  const suv = rows.filter(r => SUV.includes(r.modele));
  console.log('\n=== Taux par segment (contrôle) ===');
  for (const [nom, sub] of [['Citadines/berlines', citadines], ['SUV', suv]]) {
    const f = fitTaux(sens, sub);
    if (f) console.log(nom.padEnd(20) + ' n=' + String(sub.length).padStart(3) +
      ' → ' + (f.taux * 100).toFixed(2) + ' %/an (constante ×' + f.majoration.toFixed(2) + ')');
    else console.log(nom.padEnd(20) + ' échantillon insuffisant');
  }

  // ── Robustesse : jackknife par modèle ──
  // Si retirer un seul modèle déplace fortement le taux, l'estimation groupée repose sur
  // ce modèle et non sur le marché. On veut au contraire une faible amplitude.
  console.log('\n=== Robustesse : retrait d\'un modèle à la fois ===');
  const modeles = [...new Set(rows.map(r => r.modele))];
  const tauxJack = [];
  for (const m of modeles) {
    const sub = rows.filter(r => r.modele !== m);
    const f = fitTaux(sens, sub);
    if (!f) continue;
    tauxJack.push({ m, t: f.taux });
  }
  tauxJack.sort((a, b) => a.t - b.t);
  const tmin = tauxJack[0], tmax = tauxJack[tauxJack.length - 1];
  console.log('  taux le plus bas  : ' + (tmin.t * 100).toFixed(2) + ' %/an (sans ' + tmin.m + ')');
  console.log('  taux le plus haut : ' + (tmax.t * 100).toFixed(2) + ' %/an (sans ' + tmax.m + ')');
  console.log('  amplitude : ' + ((tmax.t - tmin.t) * 100).toFixed(2) + ' points — ' +
    ((tmax.t - tmin.t) < 0.015 ? 'estimation robuste, aucun modèle ne la porte à lui seul'
                               : 'ATTENTION : un modèle pèse fortement sur le résultat'));

  console.log('\n>>> tauxDeprAn = ' + taux.toFixed(4) + ' | malusPar10000km = ' + sens.toFixed(4));
  console.log('>>> La constante ×' + majoration.toFixed(3) + ' n\'est PAS reportée dans le modèle :');
  console.log('    le niveau reste ancré sur le prix catalogue (F_âge(0) = 1).');
}, 900);
