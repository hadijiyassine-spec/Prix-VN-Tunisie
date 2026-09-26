// Audit de l'âge compté au mois près (v53).
//
// Trois questions, et trois seulement :
//   1. MONOTONIE — la valeur vénale croît-elle strictement à mesure que la MEC se rapproche,
//      mois après mois, y compris au franchissement d'une frontière de PHASES où la valeur à
//      neuf change d'un coup ? C'est là que ça casse si ça doit casser.
//   2. CONTINUITÉ AUX BORNES D'ANNÉE — l'écart 12/N → 01/N+1 est-il du même ordre que celui de
//      deux mois consécutifs à l'intérieur d'une année ? Un saut signalerait que l'âge et
//      l'ancrage ne se parlent pas.
//   3. AMPLITUDE — que rapporte réellement la saisie du mois ? Écart entre le mois le plus
//      favorable et le moins favorable d'un même millésime, par gamme.
//
// Échantillon : une finition sur douze, comme audit3.js.
//   node age_mois.js
const { JSDOM } = require('jsdom');
const fs = require('fs');

const app = fs.readFileSync(fs.existsSync('app.html') ? 'app.html' : 'index.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://example.com/app.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const PAS = 12;            // une finition sur douze
const MOIS_EVAL = 9;       // date d'évaluation fixe : septembre de l'année courante

const med = a => { const s = [...a].sort((x, y) => x - y); const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
const pct = x => (x * 100).toFixed(2) + ' %';

setTimeout(() => {
  const CY = win.eval('CY'), PHASES = win.eval('PHASES');
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const setFM = m => { const e = doc.getElementById('mecMois'); e.value = m == null ? '' : String(m); e.dispatchEvent(new win.Event('change', { bubbles: true })); };

  // Valeur vénale d'une finition pour une MEC (année, mois), évaluée en MOIS_EVAL/CY.
  // Kilométrage fixé à la norme de l'âge pour isoler l'effet du mois : sans cela le bonus
  // kilométrique se déplacerait en même temps que l'âge et brouillerait la lecture.
  const vvDe = (f, an, mo) => {
    setFY(an); setFM(mo);
    const r = win.computeVV(f, null, 'normal', 'particulier', null, CY, null, 'aucun', mo, MOIS_EVAL);
    return r ? r.vv : null;
  };

  const echantillon = [];
  let i = 0;
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
    if ((i++) % PAS) continue;
    const H = win.tarifsCatalogue(f);
    if (!H || !H.length) continue;
    echantillon.push({ b, m, f });
  }

  // ── 1. Monotonie mensuelle ──────────────────────────────────────────────────────────────
  // Sur cinq millésimes consécutifs, 60 points mensuels : chacun doit valoir davantage que le
  // précédent (MEC plus récente = véhicule plus jeune à date d'évaluation constante).
  let points = 0, inversions = 0, aPlancher = 0;
  const pires = [], sautsFrontiere = [], interieurs = [], bornes = [];
  for (const { b, m, f } of echantillon) {
    const H = win.tarifsCatalogue(f);
    const anMax = Math.min(win.yOf(H[H.length - 1].d), CY - 1);
    const anMin = Math.max(win.yOf(H[0].d), anMax - 4);
    if (anMax < anMin) continue;
    let prec = null;
    for (let an = anMin; an <= anMax; an++) {
      for (let mo = 1; mo <= 12; mo++) {
        if (an === CY && mo > MOIS_EVAL) continue;
        const vv = vvDe(f, an, mo);
        if (vv == null) continue;
        points++;
        if (prec) {
          const ecart = vv / prec.vv - 1;
          // Au plancher de valeur résiduelle, F_âge ne bouge plus : l'égalité est normale.
          const auPlancher = Math.abs(ecart) < 1e-9;
          if (auPlancher) aPlancher++;
          else if (vv < prec.vv) {
            inversions++;
            pires.push({ nom: m + ' ' + f.v, de: prec.an + '/' + prec.mo, a: an + '/' + mo, avant: prec.vv, apres: vv, ecart });
          }
          const frontiere = !!(PHASES[m] && PHASES[m].some(fr => {
            const y = parseInt(fr.date.slice(6)), mm = parseInt(fr.date.slice(3, 5));
            return (y === an && mm === mo) || (y === prec.an && mm === prec.mo);
          }));
          if (frontiere) sautsFrontiere.push({ nom: m + ' ' + f.v, de: prec.an + '/' + prec.mo, a: an + '/' + mo, ecart });
          else if (prec.an === an) interieurs.push(ecart);
          else bornes.push(ecart);
        }
        prec = { an, mo, vv };
      }
    }
  }
  pires.sort((x, y) => x.ecart - y.ecart);

  console.log('\n═══ 1. Monotonie mensuelle ═══');
  console.log('Finitions examinées : ' + echantillon.length + ' · points mensuels : ' + points);
  console.log('Inversions (valeur qui BAISSE quand la MEC se rapproche) : ' + inversions);
  console.log('Paliers plats (plancher de valeur résiduelle atteint, normal) : ' + aPlancher);
  if (pires.length) {
    console.log('Dix pires :');
    for (const p of pires.slice(0, 10))
      console.log('  ' + pct(p.ecart).padStart(9) + '  ' + p.de + ' → ' + p.a + '  ' +
        p.avant + ' → ' + p.apres + '   ' + p.nom);
  }

  // ── 2. Continuité aux bornes d'année ────────────────────────────────────────────────────
  console.log('\n═══ 2. Continuité aux bornes d\'année ═══');
  console.log('Écart médian entre deux mois consécutifs DANS une année : ' + pct(med(interieurs)) +
    '  (' + interieurs.length + ' paires)');
  console.log('Écart médian entre 12/N et 01/N+1                       : ' + pct(med(bornes)) +
    '  (' + bornes.length + ' paires)');
  const rapport = med(bornes) / med(interieurs);
  console.log('Rapport des deux : ×' + rapport.toFixed(2) + ' — ' +
    (rapport > 0.5 && rapport < 2 ? 'même ordre de grandeur, pas de saut à la bascule d\'année'
                                  : 'ATTENTION : la bascule d\'année ne se comporte pas comme un mois ordinaire'));
  if (sautsFrontiere.length) {
    console.log('\nFranchissements de frontière de génération observés : ' + sautsFrontiere.length);
    for (const s of sautsFrontiere.slice(0, 8))
      console.log('  ' + pct(s.ecart).padStart(9) + '  ' + s.de + ' → ' + s.a + '   ' + s.nom);
  }

  // ── 3. Amplitude introduite par le mois ─────────────────────────────────────────────────
  // Pour un millésime donné : écart entre 01 et 12 du même millésime, à date d'évaluation fixe.
  console.log('\n═══ 3. Ce que la saisie du mois apporte ═══');
  const parGamme = {};
  let nAmp = 0;
  for (const { b, m, f } of echantillon) {
    const H = win.tarifsCatalogue(f);
    const an = Math.min(Math.max(win.yOf(H[0].d), CY - 6), CY - 2);
    const bas = vvDe(f, an, 1), haut = vvDe(f, an, 12);
    if (!bas || !haut) continue;
    setFY(an); setFM(12);
    const r = win.computeVV(f, null, 'normal', 'particulier', null, CY, null, 'aucun', 12, MOIS_EVAL);
    if (!r) continue;
    const g = r.gamme.nom;
    (parGamme[g] = parGamme[g] || []).push(haut / bas - 1);
    nAmp++;
  }
  console.log('gamme'.padEnd(18) + 'finitions'.padStart(10) + 'écart médian 01→12'.padStart(20) + 'maximum'.padStart(10));
  const tous = [];
  for (const g of Object.keys(parGamme)) {
    const a = parGamme[g]; tous.push(...a);
    console.log(g.padEnd(18) + String(a.length).padStart(10) + pct(med(a)).padStart(20) +
      pct(Math.max(...a)).padStart(10));
  }
  console.log('ENSEMBLE'.padEnd(18) + String(nAmp).padStart(10) + pct(med(tous)).padStart(20) +
    pct(Math.max(...tous)).padStart(10));
  console.log('\nLecture : c\'est l\'écart de valeur entre un véhicule de janvier et un de décembre du');
  console.log('même millésime, à date d\'évaluation identique — ce que l\'expert gagne à saisir le mois.');

  console.log('\n' + (inversions === 0
    ? '=== AUCUNE INVERSION : l\'âge mensuel est monotone, frontières de génération comprises ==='
    : '=== ' + inversions + ' INVERSION(S) À CORRIGER ==='));
}, 900);
