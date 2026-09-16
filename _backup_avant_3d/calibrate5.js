// Test de l'effet de GAMME sur la vitesse de dévalorisation.
//
// Hypothèse métier (Yassine) : la cotation dépend de la demande locale et de la gamme —
// un véhicule de luxe se déprécie plus vite qu'une berline ou une citadine.
//
// Le test précédent opposait SUV et citadines : mauvais axe (un Duster est un SUV sans être
// haut de gamme, une Classe C est une berline haut de gamme). On classe ici par NIVEAU DE
// PRIX À NEUF (VEN), qui est la vraie variable de gamme et que l'application connaît déjà
// au moment du calcul.
//
// Méthode identique au reste : régression de log(F_âge) sur l'âge AVEC CONSTANTE LIBRE,
// pour que la majoration vendeur n'entre pas dans la pente.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('app.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window;
win.requestAnimationFrame = cb => setTimeout(cb, 0);

const CY = 2026;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
function wls(pts) {
  let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of pts) { sw += p.w; sx += p.w * p.x; sy += p.w * p.y; sxx += p.w * p.x * p.x; sxy += p.w * p.x * p.y; }
  const d = sw * sxx - sx * sx;
  const b = (sw * sxy - sx * sy) / d;
  return { a: (sy - b * sx) / sw, b };
}

// Gammes définies par la valeur à neuf actualisée (VEN), en dinars.
const GAMMES = [
  { nom: 'Entrée de gamme', max: 60000 },
  { nom: 'Moyenne gamme', max: 100000 },
  { nom: 'Haut de gamme', max: 180000 },
  { nom: 'Luxe / premium', max: Infinity },
];
const gammeDe = ven => GAMMES.find(g => ven < g.max).nom;

setTimeout(() => {
  const P = win.eval('VVPARAMS');
  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  const cle = (n, a) => existe[n] ? n
    : /^Volkswagen Golf$/i.test(n) ? (a >= 2020 ? 'Volkswagen Golf 8' : a >= 2013 ? 'Volkswagen Golf 7' : 'Volkswagen Golf 6') : null;
  function pickFin(k, mec) {
    let br = null; for (const b of Object.keys(win.DB)) if (win.DB[b][k]) br = b;
    if (!br) return null;
    const f = win.DB[br][k];
    const d = f.filter(x => win.yOf(x.d0) <= mec && mec <= win.yOf(x.d) + 1);
    const pool = d.length ? d : (() => {
      let best = Infinity, out = [];
      for (const x of f) { const y0 = win.yOf(x.d0), y1 = win.yOf(x.d); const g = mec < y0 ? y0 - mec : mec > y1 ? mec - y1 : 0; if (g < best) { best = g; out = [x]; } else if (g === best) out.push(x); }
      return out;
    })();
    const t = pool.slice().sort((a, b) => a.p - b.p);
    return t[Math.floor(t.length / 2)] || null;
  }
  const fKm = (km, age, sens) => {
    if (!(age > 0 && km != null && !isNaN(km) && km >= 0)) return 1;
    const i = ((km - age * P.kmRefAnnuel) / 10000) * sens;
    return 1 - Math.max(-P.plafondBonusKm, Math.min(i, P.plafondMalusKm));
  };

  const lines = fs.readFileSync('marche_occasion.csv', 'utf8').trim().split('\n').slice(1);
  const rows = [];
  for (const l of lines) {
    const [mo, aS, pS, kS] = l.split(';');
    const an = +aS, pr = +pS, km = (kS === '' || kS == null || kS === '\r') ? null : +kS;
    const k = cle(mo, an); if (!k || !existe[k]) continue;
    if (!(an >= 2005 && an <= CY) || !(pr >= 8000 && pr <= 700000)) continue;
    const fin = pickFin(k, an); if (!fin) continue;
    const ven = win.computeVEN(fin, an).VEN;
    const ret = pr / ven;
    if (!(ret >= 0.03 && ret <= 1.60)) continue;
    rows.push({ mo, k, an, pr, km, age: CY - an, ven, ret, gamme: gammeDe(ven) });
  }
  console.log('Annonces exploitables :', rows.length, '\n');

  function fit(sub, sens) {
    const parAge = {};
    for (const r of sub) {
      if (r.age < 1) continue;
      const f = r.ret / fKm(r.km, r.age, sens);
      if (f > 0.05 && f < 1.8) (parAge[r.age] = parAge[r.age] || []).push(f);
    }
    const pts = [];
    for (const a of Object.keys(parAge).map(Number)) {
      const g = parAge[a]; if (g.length < 3) continue;
      pts.push({ age: a, obs: median(g), n: g.length });
    }
    if (pts.length < 5) return null;
    const { a, b } = wls(pts.map(p => ({ x: p.age, y: Math.log(p.obs), w: p.n })));
    return { taux: 1 - Math.exp(b), cst: Math.exp(a), pts, n: sub.length };
  }

  const sens = P.malusPar10000km;
  console.log('=== Dépréciation par gamme (classée sur la valeur à neuf) ===');
  console.log('gamme'.padEnd(18) + 'n'.padStart(5) + ' modèles' + '  tranches' + '   taux/an' + '  constante');
  const res = {};
  for (const g of GAMMES) {
    const sub = rows.filter(r => r.gamme === g.nom);
    const f = fit(sub, sens);
    const nMod = new Set(sub.map(r => r.mo)).size;
    if (!f) { console.log(g.nom.padEnd(18) + String(sub.length).padStart(5) + String(nMod).padStart(8) + '     — échantillon insuffisant'); continue; }
    res[g.nom] = f;
    console.log(g.nom.padEnd(18) + String(sub.length).padStart(5) + String(nMod).padStart(8) +
      String(f.pts.length).padStart(10) + (f.taux * 100).toFixed(2).padStart(9) + ' %' + ('×' + f.cst.toFixed(2)).padStart(11));
  }

  // Robustesse : jackknife par modèle à l'intérieur de chaque gamme
  console.log('\n=== Robustesse : retrait d\'un modèle à la fois, par gamme ===');
  for (const nom of Object.keys(res)) {
    const sub = rows.filter(r => r.gamme === nom);
    const mods = [...new Set(sub.map(r => r.mo))];
    const taux = [];
    for (const m of mods) {
      const f = fit(sub.filter(r => r.mo !== m), sens);
      if (f) taux.push(f.taux);
    }
    if (taux.length < 2) { console.log(nom.padEnd(18) + 'trop peu de modèles pour tester'); continue; }
    console.log(nom.padEnd(18) + 'taux de ' + (Math.min(...taux) * 100).toFixed(2) + ' % à ' +
      (Math.max(...taux) * 100).toFixed(2) + ' %  (amplitude ' + ((Math.max(...taux) - Math.min(...taux)) * 100).toFixed(2) + ' pt)');
  }

  // Le classement des gammes est-il monotone, et l'écart dépasse-t-il le bruit ?
  console.log('\n=== Lecture ===');
  const ordre = GAMMES.map(g => g.nom).filter(n => res[n]);
  const taux = ordre.map(n => res[n].taux);
  const monotone = taux.every((t, i) => i === 0 || t >= taux[i - 1] - 0.002);
  console.log('Taux croissant avec la gamme ? ' + (monotone ? 'OUI' : 'NON'));
  if (ordre.length >= 2) {
    console.log('Écart entrée de gamme → haut : ' +
      ((taux[taux.length - 1] - taux[0]) * 100).toFixed(2) + ' points de dépréciation annuelle');
  }
  console.log('\nRétention à 10 ans selon la gamme :');
  for (const n of ordre) console.log('  ' + n.padEnd(18) + (Math.pow(1 - res[n].taux, 10) * 100).toFixed(0) + ' %');
}, 900);
