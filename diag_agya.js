// Diagnostic du cas signalé : Toyota Agya, usage location, MEC 07/2022.
// L'application annonce ~36 000 DT, le marché local 25 000 à 26 000 DT.
// On décompose la valeur vénale facteur par facteur, à deux kilométrages.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync(fs.existsSync('app.html') ? 'app.html' : 'index.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://example.com/app.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const f2 = n => (Math.round(n * 1000) / 1000).toFixed(3);
const dt = n => Math.round(n).toLocaleString('fr-FR') + ' DT';

setTimeout(() => {
  const CY = win.eval('CY'), P = win.eval('VVPARAMS');
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const setFM = m => { const e = doc.getElementById('mecMois'); e.value = m == null ? '' : String(m); e.dispatchEvent(new win.Event('change', { bubbles: true })); };

  const cas = [
    { nom: 'Agya 1.2 L VVTi (entrée de gamme)', f: win.DB.Toyota['Toyota Agya'][0] },
    { nom: 'Agya 1.2 L VVTi BVA', f: win.DB.Toyota['Toyota Agya'][1] },
    { nom: 'Agya Populaire 1.0 L', f: win.DB.Toyota['Toyota Agya Populaire'][0], regime: 'populaire' },
  ];

  console.log('DIAGNOSTIC — Toyota Agya, MEC 07/2022, évaluation ' + (CY) + ' (mois 09), usage LOCATION');
  console.log('Marché annoncé par l\'expert : 25 000 à 26 000 DT\n');

  for (const c of cas) {
    setFY(2022); setFM(7);
    const H = win.tarifsCatalogue(c.f);
    console.log('══════ ' + c.nom);
    console.log('  série tarifaire : ' + H.map(h => h.d + ':' + h.p).join('  '));
    const t2022 = win.tarifMillesime(c.f, 2022, 7);
    console.log('  tarif du millésime 2022 : ' + dt(t2022.p) + ' (' + t2022.d + ')');
    console.log('  dernier tarif (ancrage méthode B) : ' + dt(H[H.length - 1].p) + ' (' + H[H.length - 1].d + ')');
    const fc = win.fuelClass((c.f.eg && c.f.eg.fuel) || null);
    const idx2022 = win.indexMultiplier(2022, CY, fc).m, idxFin = win.indexMultiplier(win.yOf(H[H.length - 1].d), CY, fc).m;
    console.log('  indice prix auto : 2022→' + CY + ' ×' + f2(idx2022) + '  |  ' +
      win.yOf(H[H.length - 1].d) + '→' + CY + ' ×' + f2(idxFin));
    console.log('  → méthode A (tarif 2022 actualisé) : ' + dt(t2022.p * idx2022));
    console.log('  → méthode B (fin de série actualisée) : ' + dt(H[H.length - 1].p * idxFin));

    for (const km of [60000, 150000, 180000]) {
      const r = win.computeVV(c.f, km, 'normal', 'location', null, CY, null, c.regime || 'aucun', 7, 9);
      console.log('\n  ── kilométrage ' + km.toLocaleString('fr-FR') + ' km ──');
      console.log('  ' + 'facteur'.padEnd(34) + 'valeur'.padStart(12) + '   effet cumulé');
      let cum = r.ven.VEN;
      const ligne = (nom, val, apres) => console.log('  ' + nom.padEnd(34) + String(val).padStart(12) + '   ' + dt(apres));
      ligne('Valeur à neuf actualisée (VEN)', dt(r.ven.VEN), r.ven.VEN);
      cum *= r.fAge; ligne('F_âge (' + (r.tauxDepr * 100).toFixed(2) + ' %/an, ' + win.libAge(r.age, r.ageMois) + ')', '×' + f2(r.fAge), cum);
      cum *= r.fEtat; ligne('F_état (' + r.etat.label + ')', '×' + f2(r.fEtat), cum);
      cum *= r.fKm; ligne('F_km (repère ' + Math.round(r.kmRef).toLocaleString('fr-FR') + ' km)', '×' + f2(r.fKm), cum);
      cum *= r.fUsage; ligne('F_usage (' + r.usage.label + ')', '×' + f2(r.fUsage), cum);
      cum *= r.fCarb; ligne('F_carburant', '×' + f2(r.fCarb), cum);
      cum *= r.fBat; ligne('F_batterie', '×' + f2(r.fBat), cum);
      console.log('  ' + 'VALEUR VÉNALE'.padEnd(34) + dt(r.vv).padStart(12) +
        '   écart au marché (25 500) : ' + ((r.vv / 25500 - 1) * 100).toFixed(0) + ' %');
      console.log('  ' + 'gamme retenue'.padEnd(34) + r.gamme.nom +
        (r.ven.popStatut ? ' · régime ' + r.ven.popStatut : '') +
        (r.ven.neufPlafonne ? ' · plafonnée au prix neuf du jour' : ''));
    }
    console.log('');
  }

  // Combien faudrait-il pour tomber à 25 500 DT, sur l'entrée de gamme à 180 000 km ?
  const f = win.DB.Toyota['Toyota Agya'][0];
  setFY(2022); setFM(7);
  const r = win.computeVV(f, 180000, 'normal', 'location', null, CY, null, 'aucun', 7, 9);
  console.log('══════ Ce qu\'il manque, sur la 1.2 VVTi à 180 000 km');
  console.log('  calculé ' + dt(r.vv) + ' contre 25 500 DT visés → facteur manquant ×' + f2(25500 / r.vv));
  console.log('  Décomposition de l\'écart, à titre indicatif :');
  const tauxTest = [0.0427, 0.06, 0.08, 0.10];
  for (const t of tauxTest) {
    const fAge = Math.max(Math.pow(1 - t, r.age), P.valeurResiduelle);
    console.log('    taux ' + (t * 100).toFixed(2) + ' %/an → F_âge ×' + f2(fAge) +
      ' → ' + dt(r.ven.VEN * fAge * r.fEtat * r.fKm * r.fUsage * r.fCarb));
  }
  const penteTest = [0.007, 0.015, 0.02, 0.03];
  for (const p of penteTest) {
    const ecart = (180000 - r.kmRef) / 10000;
    const fKm = 1 - Math.max(-P.plafondBonusKm, Math.min(ecart * p, P.plafondMalusKm));
    console.log('    pente km ' + (p * 100).toFixed(2) + ' %/10 000 km → F_km ×' + f2(fKm) +
      ' → ' + dt(r.ven.VEN * r.fAge * r.fEtat * fKm * r.fUsage * r.fCarb));
  }
  for (const u of [0.92, 0.85, 0.80]) {
    console.log('    F_usage location ×' + f2(u) + ' → ' + dt(r.ven.VEN * r.fAge * r.fEtat * r.fKm * u * r.fCarb));
  }
}, 900);
