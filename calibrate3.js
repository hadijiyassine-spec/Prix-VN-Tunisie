// Recalibration après ancrage de la VEN sur l'année de mise en circulation.
// La base de calcul ayant changé, le taux d'âge et la sensibilité kilométrique doivent
// être réajustés conjointement sur les mêmes annonces.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('app.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const html = app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.com/app.html', pretendToBeVisual: true });
const win = dom.window;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));

const CY = 2026, MARGE = 0.93;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

setTimeout(() => {
  const P = win.eval('VVPARAMS');

  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  const cle = (nom, an) => existe[nom] ? nom
    : /^Volkswagen Golf$/i.test(nom) ? (an >= 2020 ? 'Volkswagen Golf 8' : an >= 2013 ? 'Volkswagen Golf 7' : 'Volkswagen Golf 6')
      : null;

  // Sélection de la finition comme le ferait l'utilisateur : parmi les finitions du modèle,
  // celles qui étaient effectivement référencées à l'année de mise en circulation (c'est ce
  // que l'application met en tête de liste et signale par le bandeau de compatibilité).
  // À défaut, la finition dont la période de commercialisation est la plus proche.
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


  const lines = fs.readFileSync('marche_occasion.csv', 'utf8').trim().split('\n').slice(1);
  const rows = [];
  for (const l of lines) {
    const [modele, aS, pS, kS] = l.split(';');
    const annee = +aS, prix = +pS, km = kS === '' || kS == null ? null : +kS;
    const k = cle(modele, annee);
    if (!k || !existe[k]) continue;
    if (!(annee >= 2005 && annee <= CY) || !(prix >= 8000 && prix <= 400000)) continue;
    const fin = pickFin(k, annee);
    if (!fin) continue;
    // VEN ancrée sur l'année de MEC de CETTE annonce
    const ven = win.computeVEN(fin, annee).VEN;
    const ret = (prix * MARGE) / ven;
    if (!(ret >= 0.03 && ret <= 1.30)) continue;
    rows.push({ modele, k, annee, prix, km, age: CY - annee, ven, ret });
  }
  console.log('Annonces exploitables :', rows.length);

  const fKmOf = (km, age, sens) => {
    if (!(age > 0 && km != null && !isNaN(km) && km >= 0)) return 1;
    const impact = ((km - age * P.kmRefAnnuel) / 10000) * sens;
    return 1 - Math.max(-P.plafondBonusKm, Math.min(impact, P.plafondMalusKm));
  };
  function fitTaux(sens) {
    const parAge = {};
    for (const r of rows) {
      if (r.age < 1) continue;
      const f = r.ret / fKmOf(r.km, r.age, sens);
      if (f > 0.05 && f < 1.4) (parAge[r.age] = parAge[r.age] || []).push(f);
    }
    let sxy = 0, sxx = 0, pts = [];
    for (const a of Object.keys(parAge).map(Number)) {
      const g = parAge[a]; if (g.length < 3) continue;
      const obs = median(g); pts.push({ age: a, obs, n: g.length });
      sxy += g.length * a * Math.log(obs); sxx += g.length * a * a;
    }
    return { taux: 1 - Math.exp(sxy / sxx), pts };
  }
  function fitSens(taux) {
    let sxy = 0, sxx = 0, n = 0;
    for (const r of rows) {
      if (r.age < 1 || r.km == null || !isFinite(r.km) || r.km <= 0) continue;
      const fAge = Math.max(Math.pow(1 - taux, r.age), P.valeurResiduelle);
      const resid = r.ret / fAge;
      if (!(resid > 0.2 && resid < 3)) continue;
      const x = (r.km - r.age * P.kmRefAnnuel) / 10000;
      if (Math.abs(x) > 30) continue;
      sxy += x * Math.log(resid); sxx += x * x; n++;
    }
    return -(sxy / sxx);
  }

  let taux = P.tauxDeprAn, sens = P.malusPar10000km;
  for (let i = 0; i < 8; i++) { taux = fitTaux(sens).taux; sens = fitSens(taux); }
  console.log('Taux d\'âge recalibré        : ' + (taux * 100).toFixed(2) + ' %/an');
  console.log('Sensibilité km recalibrée   : ' + (sens * 100).toFixed(2) + ' %/10 000 km');

  const final = fitTaux(sens);
  console.log('\nâge | n  | observé | modèle | écart');
  const ec = [];
  for (const p of final.pts.sort((a, b) => a.age - b.age)) {
    const theo = Math.max(Math.pow(1 - taux, p.age), P.valeurResiduelle);
    const e = (theo / p.obs - 1) * 100; ec.push(e);
    console.log(String(p.age).padStart(3) + ' | ' + String(p.n).padStart(2) + ' | ' + p.obs.toFixed(3).padStart(7) + ' | ' + theo.toFixed(3).padStart(6) + ' | ' + (e >= 0 ? '+' : '') + e.toFixed(0) + ' %');
  }
  console.log('biais médian ' + median(ec).toFixed(1) + ' % | écart absolu médian ' + median(ec.map(Math.abs)).toFixed(1) + ' %');
  console.log('\n>>> tauxDeprAn = ' + taux.toFixed(4) + ' | malusPar10000km = ' + sens.toFixed(4));
}, 900);
