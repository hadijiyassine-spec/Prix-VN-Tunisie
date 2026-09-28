// Cas réel précisé par l'expert : Agya 1.2 VVTi BVM, MEC 07/2022, 78 160 km, usage location.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};
const dt = n => Math.round(n).toLocaleString('fr-FR') + ' DT';

setTimeout(() => {
  const CY = win.eval('CY');
  const e = doc.getElementById('mecIn'); e.value = '2022'; e.dispatchEvent(new win.Event('input'));
  const sm = doc.getElementById('mecMois'); sm.value = '7'; sm.dispatchEvent(new win.Event('change', { bubbles: true }));
  const f = win.DB.Toyota['Toyota Agya'][0];
  const KM = 78160, MARCHE = 25500;

  console.log('Agya 1.2 VVTi BVM · MEC 07/2022 · ' + KM.toLocaleString('fr-FR') + ' km · évaluation 09/' + CY);
  console.log('Marché local (expert) : 25 000 à 26 000 DT\n');
  for (const u of ['location', 'particulier']) {
    const r = win.computeVV(f, KM, 'normal', u, null, CY, null, 'aucun', 7, 9);
    console.log(u.padEnd(12) + ' VEN ' + dt(r.ven.VEN) + ' · F_âge ×' + r.fAge.toFixed(3) +
      ' · F_km ×' + r.fKm.toFixed(3) + ' (repère ' + Math.round(r.kmRef).toLocaleString('fr-FR') + ' km)' +
      ' · F_usage ×' + r.fUsage.toFixed(2) + '  →  ' + dt(r.vv) +
      '   écart au marché : ' + ((r.vv / MARCHE - 1) * 100).toFixed(0) + ' %');
  }
  const r = win.computeVV(f, KM, 'normal', 'location', null, CY, null, 'aucun', 7, 9);
  console.log('\nFacteur manquant pour atteindre ' + dt(MARCHE) + ' : ×' + (MARCHE / r.vv).toFixed(3));
  console.log('Rétention réelle du marché : ' + (MARCHE / r.ven.VEN * 100).toFixed(0) +
    ' % de la valeur à neuf en ' + win.libAge(r.age, r.ageMois));
  console.log('Rétention du modèle        : ' + (r.ratio * 100).toFixed(0) + ' %');
  const txImplicite = 1 - Math.pow(MARCHE / (r.ven.VEN * r.fUsage * r.fKm), 1 / r.age);
  console.log('Taux de décote implicite du marché (hors usage et km) : ' + (txImplicite * 100).toFixed(1) + ' %/an');
  console.log('Taux appliqué par le modèle (gamme ' + r.gamme.nom + ')          : ' + (r.tauxDepr * 100).toFixed(2) + ' %/an');

  // Le même exercice sur le prix d'achat réel du véhicule (tarif de juillet 2022).
  const t = win.tarifMillesime(f, 2022, 7);
  console.log('\nPrix catalogue à la MEC (07/2022) : ' + dt(t.p) + ' (' + t.d + ')');
  console.log('Rétention sur le prix d\'achat réel : ' + (MARCHE / t.p * 100).toFixed(0) + ' % en 4 ans et 2 mois' +
    '  → ' + ((1 - Math.pow(MARCHE / t.p, 1 / r.age)) * 100).toFixed(1) + ' %/an');
}, 900);
