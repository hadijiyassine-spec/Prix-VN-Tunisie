// FORME de la courbe de décote, mesurée sur l'échantillon du marché — et non plus un taux unique.
//
// La question posée le 29.09.2026 par Yassine Hadiji : une Opel Corsa de 2022 vaut 34 à 38 000 DT,
// l'application en annonce 43 à 51 000. Le modèle applique UN SEUL taux par gamme, constant sur
// toute la vie du véhicule. On mesure ici, annonce par annonce, le taux que le marché implique
// RÉELLEMENT à chaque âge :
//
//     prix demandé = VEN × (1 - t)^âge × F_km × F_état   →   t = 1 - (prix / (VEN × F_km))^(1/âge)
//
// VEN, F_km et F_état sortent de l'application elle-même, pour que le taux mesuré soit exactement
// celui qui manque au modèle. Si la courbe réelle est raide au début puis plate, un taux constant
// surévaluera forcément les véhicules récents et sous-évaluera les vieux — ou l'inverse, selon la
// fenêtre sur laquelle on l'a ajusté.
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
const ALIAS = { 'Citroen C3': 'Citroën C3', 'BMW Serie 3': 'BMW Série 3' };

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

  const obs = [];
  for (const mode of ['med', 'min']) {
    for (const l of fs.readFileSync('marche_occasion_28092026.csv', 'utf8').trim().split(/\r?\n/).slice(1)) {
      const [, , mo0, aS, kS, pS] = l.split(';');
      const mo = ALIAS[mo0] || mo0;
      const an = +aS, km = +kS, prix = +pS;
      if (!existe[mo] || !an || !prix || !(km >= 0)) continue;
      const f = pickFin(mo, an, mode);
      if (!f) continue;
      setFY(an);
      const r = win.computeVV(f, km, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
      if (!r || !r.ven || !r.ven.VEN || !r.age) continue;
      // Le prix demandé, débarrassé de tout ce que le modèle sait déjà expliquer SAUF l'âge.
      const base = r.ven.VEN * r.fKm * r.fEtat * r.fUsage * r.fCarb * r.fBat;
      if (!(base > 0)) continue;
      const retention = prix / base;
      obs.push({ mode, mo, an, km, prix, age: r.age, gamme: r.gamme.nom, ven: r.ven.VEN,
        retention, taux: 1 - Math.pow(Math.max(retention, 0.01), 1 / r.age), calc: r.vv });
    }
  }

  for (const mode of ['med', 'min']) {
    const o = obs.filter(x => x.mode === mode);
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('CONVENTION DE FINITION : ' + (mode === 'med' ? 'médiane en prix' : 'la moins chère') +
      '   (' + o.length + ' annonces)');
    console.log('\nTaux de décote que le marché implique, par âge :');
    console.log('  âge          n    rétention médiane   taux annuel implicite   taux du modèle');
    const tranches = [[1, 2], [3, 3], [4, 4], [5, 6], [7, 8], [9, 10], [11, 15], [16, 30]];
    for (const [a, b] of tranches) {
      const g = o.filter(x => x.age >= a && x.age <= b);
      if (!g.length) continue;
      const tm = med(g.map(x => x.taux));
      const lib = a === b ? (a + ' ans') : (a + '-' + b + ' ans');
      console.log('  ' + lib.padEnd(12) + String(g.length).padStart(3) + '           ×' +
        med(g.map(x => x.retention)).toFixed(3) + '              ' +
        (tm * 100).toFixed(2).padStart(6) + ' %/an            ' +
        (med(g.map(x => x.age >= 1 ? P.gammes.find(y => x.gamme === y.nom).tauxDeprAn : 0)) * 100).toFixed(2) + ' %/an');
    }

    console.log('\nPar gamme et par tranche d\'âge (taux annuel implicite) :');
    console.log('  gamme                 1-3 ans   4-6 ans   7-10 ans   11 ans et +');
    for (const gm of P.gammes.map(g => g.nom)) {
      const c = [[1, 3], [4, 6], [7, 10], [11, 30]].map(([a, b]) => {
        const g = o.filter(x => x.gamme === gm && x.age >= a && x.age <= b);
        return g.length ? ((med(g.map(x => x.taux)) * 100).toFixed(2) + ' % (' + g.length + ')') : '—';
      });
      console.log('  ' + gm.padEnd(20) + c.map(x => x.padStart(12)).join('  '));
    }
  }

  // ── Ce que cela veut dire pour le cas signalé ──
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('LE CAS SIGNALÉ — Opel Corsa 2022 (4 ans), marché 34 000 à 38 000 DT');
  const o = obs.filter(x => x.mode === 'med');
  const t4 = med(o.filter(x => x.age >= 4 && x.age <= 4 && x.gamme === 'Grand public').map(x => x.taux));
  const t46 = med(o.filter(x => x.age >= 4 && x.age <= 6 && x.gamme === 'Grand public').map(x => x.taux));
  for (const f of win.DB.Opel['Opel Corsa']) {
    setFY(2022);
    const r = win.computeVV(f, 90000, 'normal', 'particulier', null, CY, null, 'aucun', null, null);
    const avecT4 = r.ven.VEN * Math.pow(1 - t4, r.age) * r.fKm;
    const avecT46 = r.ven.VEN * Math.pow(1 - t46, r.age) * r.fKm;
    console.log('  ' + f.v.padEnd(22) + 'VEN ' + Math.round(r.ven.VEN).toLocaleString('fr-FR').padStart(7) +
      '   modèle ' + Math.round(r.vv).toLocaleString('fr-FR').padStart(7) +
      '   au taux mesuré 4 ans (' + (t4 * 100).toFixed(1) + ' %) ' + Math.round(avecT4).toLocaleString('fr-FR').padStart(7) +
      '   au taux 4-6 ans (' + (t46 * 100).toFixed(1) + ' %) ' + Math.round(avecT46).toLocaleString('fr-FR').padStart(7));
  }
  console.log('\n  Rappel de doctrine : la valeur vénale se situe LÉGÈREMENT SOUS la valeur marchande.');
  console.log('  Les prix ci-dessus sont confrontés à des prix DEMANDÉS, qui sont déjà au-dessus');
  console.log('  des prix de transaction : la cible est donc sous la borne basse du marché.');
}, 900);
