// Ce qu'une frontière de génération en mars 2026 changerait sur le Peugeot Landtrek.
// Yassine Hadiji signale le 06.10.2026 un changement de phase depuis mars 2026. La base ne porte
// AUCUN relevé daté de mars 2026 sur ce modèle : le dernier tarif d'avant est du 16.02.2026, le
// premier d'après du 06.04.2026. On simule donc la frontière au 01.03.2026 et on regarde, finition
// par finition et millésime par millésime, ce que l'ancrage deviendrait.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const dt = n => Math.round(n).toLocaleString('fr-FR') + ' DT';
const kd = d => d.slice(6) + d.slice(3, 5) + d.slice(0, 2);
const FRONTIERE = '01.03.2026';

setTimeout(() => {
  const CY = win.eval('CY');
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };

  // D'abord : quels relevés l'application écarte-t-elle comme PROMOTIONS ? Si les tarifs de
  // l'été 2026 en sont, la « baisse » d'après mars n'existe pas et il n'y a rien à phaser.
  console.log('═══════ Relevés écartés du catalogue (promotions, retraits vérifiés)');
  for (const mo of Object.keys(win.DB.Peugeot).filter(m => /landtrek/i.test(m)))
    for (const f of win.DB.Peugeot[mo]) {
      const H = win.tarifsCatalogue(f);
      const ecartes = f.hist.filter(h => !H.some(x => x.d === h.d && x.p === h.p));
      if (ecartes.length) console.log('  ' + mo.replace('Peugeot ', '') + ' · ' + f.v + ' → ' +
        ecartes.map(h => h.d + ':' + h.p).join(', '));
    }
  console.log('');

  for (const mo of Object.keys(win.DB.Peugeot).filter(m => /landtrek/i.test(m))) {
    console.log('═══════ ' + mo);
    for (const f of win.DB.Peugeot[mo]) {
      const H = win.tarifsCatalogue(f);
      const avant = H.filter(h => kd(h.d) < kd(FRONTIERE));
      const apres = H.filter(h => kd(h.d) >= kd(FRONTIERE));
      const traverse = avant.length && apres.length;
      console.log('\n  ── ' + f.v);
      console.log('     ' + H.length + ' relevés · ' + H[0].d + ' → ' + H[H.length - 1].d +
        ' · ' + (traverse ? 'TRAVERSE le 01.03.2026' : (apres.length ? 'entièrement après' : 'entièrement avant')));
      if (!traverse) continue;
      const fc = win.fuelClass((f.eg && f.eg.fuel) || null);
      const ancreAct = H[H.length - 1], ancrePh = avant[avant.length - 1];
      const vAct = ancreAct.p * win.indexMultiplier(win.yOf(ancreAct.d), CY, fc).m;
      const vPh = ancrePh.p * win.indexMultiplier(win.yOf(ancrePh.d), CY, fc).m;
      console.log('     ancrage actuel  : ' + ancreAct.d + ' ' + dt(ancreAct.p) + '  → valeur à neuf ' + dt(vAct));
      console.log('     ancrage phasé   : ' + ancrePh.d + ' ' + dt(ancrePh.p) + '  → valeur à neuf ' + dt(vPh));
      console.log('     écart           : ' + ((vAct / vPh - 1) * 100).toFixed(1) + ' %');
      for (const an of [2021, 2023, 2025]) {
        setFY(an);
        const r = win.computeVV(f, 100000, 'normal', 'pro', null, CY, null, 'aucun');
        if (r) console.log('       MEC ' + an + ' · 100 000 km · société : VV ' + dt(r.vv) +
          '   (deviendrait ' + dt(r.vv * vPh / vAct) + ')');
      }
    }
    console.log('');
  }
}, 900);
