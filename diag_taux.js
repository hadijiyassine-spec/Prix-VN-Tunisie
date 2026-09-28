// Le taux « grand public » de 4,27 %/an est-il soutenu par les données, ou est-il un artefact
// de composition ? La bande de gamme est définie sur la valeur à neuf ACTUELLE : les véhicules
// à faible VEN sont donc massivement des VIEUX véhicules, dont la courbe est aplatie par le
// plancher de valeur résiduelle. On refait donc l'ajustement en bornant l'âge.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));

const CY = 2026;
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
function wls(pts) { let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of pts) { sw += p.w; sx += p.w * p.x; sy += p.w * p.y; sxx += p.w * p.x * p.x; sxy += p.w * p.x * p.y; }
  const d = sw * sxx - sx * sx; const b = (sw * sxy - sx * sy) / d; return { a: (sy - b * sx) / sw, b }; }

setTimeout(() => {
  const P = win.eval('VVPARAMS');
  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  const cle = (n, a) => existe[n] ? n : /^Volkswagen Golf$/i.test(n)
    ? (a >= 2020 ? 'Volkswagen Golf 8' : a >= 2013 ? 'Volkswagen Golf 7' : 'Volkswagen Golf 6') : null;
  function pickFin(k, mec) {
    let br = null; for (const b of Object.keys(win.DB)) if (win.DB[b][k]) br = b;
    if (!br) return null;
    const f = win.DB[br][k];
    const d = f.filter(x => win.yOf(x.d0) <= mec && mec <= win.yOf(x.d) + 1);
    const pool = d.length ? d : f;
    const t = pool.slice().sort((a, b) => a.p - b.p);
    return t[Math.floor(t.length / 2)] || null;
  }
  const fKm = (km, age) => {
    if (!(age > 0 && km != null && !isNaN(km) && km >= 0)) return 1;
    const i = ((km - age * P.kmRefAnnuel) / 10000) * P.malusPar10000km;
    return 1 - Math.max(-P.plafondBonusKm, Math.min(i, P.plafondMalusKm));
  };

  const lignes = fs.readFileSync('marche_occasion.csv', 'utf8').trim().split(/\r?\n/).slice(1);
  const rows = [];
  for (const l of lignes) {
    const [mo, aS, pS, kS] = l.split(';');
    const an = +aS, pr = +pS; const kT = kS == null ? '' : kS.trim();
    const km = kT === '' ? null : +kT;
    const k = cle(mo, an); if (!k) continue;
    if (!(an >= 2005 && an <= CY) || !(pr >= 8000 && pr <= 700000)) continue;
    const fin = pickFin(k, an); if (!fin) continue;
    const ven = win.computeVEN(fin, an, CY).VEN;
    const ret = pr / ven;
    if (!(ret >= 0.03 && ret <= 1.6)) continue;
    rows.push({ mo, an, pr, km, age: CY - an, ven, ret: ret / fKm(km, CY - an) });
  }

  const BANDES = [
    { nom: '< 60 000 DT', min: 0, max: 60000 },
    { nom: '60 à 100 000', min: 60000, max: 100000 },
    { nom: '100 à 180 000', min: 100000, max: 180000 },
    { nom: '>= 180 000', min: 180000, max: Infinity },
  ];
  const ajuste = (sub, ageMax) => {
    const parAge = {};
    for (const r of sub) { if (r.age < 1 || r.age > ageMax) continue; if (r.ret > 0.05 && r.ret < 1.8) (parAge[r.age] = parAge[r.age] || []).push(r.ret); }
    const pts = [];
    for (const a of Object.keys(parAge).map(Number)) { const g = parAge[a]; if (g.length < 3) continue; pts.push({ x: a, y: Math.log(med(g)), w: g.length }); }
    if (pts.length < 4) return null;
    const { a, b } = wls(pts);
    return { taux: 1 - Math.exp(b), cst: Math.exp(a), n: sub.filter(r => r.age <= ageMax).length, pts: pts.length };
  };

  console.log('Ajustement du taux par bande de valeur à neuf, selon la fenêtre d\'âge retenue');
  console.log('(le taux du modèle est calibré sur 1-20 ans ; les véhicules récents pèsent peu)\n');
  console.log('bande'.padEnd(16) + 'taux 1-20 ans'.padStart(15) + 'taux 1-10 ans'.padStart(15) + 'taux 1-8 ans'.padStart(14) + 'taux 1-6 ans'.padStart(14) + '   n');
  for (const B of BANDES) {
    const sub = rows.filter(r => r.ven >= B.min && r.ven < B.max);
    const l = [20, 10, 8, 6].map(m => { const f = ajuste(sub, m); return f ? (f.taux * 100).toFixed(2) + ' %' : '—'; });
    console.log(B.nom.padEnd(16) + l[0].padStart(15) + l[1].padStart(15) + l[2].padStart(14) + l[3].padStart(14) + '   ' + sub.length);
  }

  console.log('\nRétention observée (prix annoncé / valeur à neuf, corrigée du kilométrage) contre le modèle');
  console.log('âge'.padStart(4) + 'n'.padStart(6) + 'observé'.padStart(10) + 'modèle 4,27 %'.padStart(15) + 'écart'.padStart(9) + '   modèle 6,50 %'.padStart(16) + 'écart'.padStart(9));
  for (let a = 1; a <= 10; a++) {
    const g = rows.filter(r => r.age === a && r.ret > 0.05 && r.ret < 1.8).map(r => r.ret);
    if (g.length < 3) continue;
    const o = med(g), m1 = Math.pow(1 - 0.0427, a), m2 = Math.pow(1 - 0.065, a);
    console.log(String(a).padStart(4) + String(g.length).padStart(6) + o.toFixed(3).padStart(10) +
      m1.toFixed(3).padStart(15) + ((m1 / o - 1) * 100).toFixed(0).padStart(8) + ' %' +
      m2.toFixed(3).padStart(16) + ((m2 / o - 1) * 100).toFixed(0).padStart(8) + ' %');
  }

  // Pente kilométrique : mesurée sur les annonces, résidus une fois l'âge retiré.
  console.log('\nPente kilométrique mesurée (résidus après retrait de l\'âge)');
  for (const tx of [0.0427, 0.065]) {
    const pts = [];
    for (const r of rows) {
      if (r.age < 1 || r.km == null || !isFinite(r.km) || r.km <= 0) continue;
      const fAge = Math.max(Math.pow(1 - tx, r.age), P.valeurResiduelle);
      const resid = (r.pr / r.ven) / fAge;
      if (!(resid > 0.2 && resid < 3)) continue;
      const x = (r.km - r.age * P.kmRefAnnuel) / 10000;
      if (Math.abs(x) > 30) continue;
      pts.push({ x, y: Math.log(resid), w: 1 });
    }
    const { b } = wls(pts);
    console.log('  avec un taux d\'âge de ' + (tx * 100).toFixed(2) + ' %/an → ' + (-b * 100).toFixed(2) +
      ' %/10 000 km  (' + pts.length + ' annonces)   [paramètre actuel : ' + (P.malusPar10000km * 100).toFixed(2) + ' %]');
  }
  const plafondAtteint = rows.filter(r => r.km != null && r.age > 0 && ((r.km - r.age * P.kmRefAnnuel) / 10000) * P.malusPar10000km >= P.plafondMalusKm).length;
  console.log('  annonces atteignant le plafond de malus (−45 %) : ' + plafondAtteint + ' sur ' + rows.length);
}, 900);
