// Contrôle de la bascule de phase par le mois, sur les cinq modèles à frontière vérifiée.
// Pour chaque frontière : la finition qui l'enjambe, évaluée le mois d'avant et le mois d'après.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

setTimeout(() => {
  const PH = win.eval('PHASES'), CY = win.eval('CY');
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const setFM = m => { const e = doc.getElementById('mecMois'); e.value = m == null ? '' : String(m); e.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const kh = d => parseInt(d.slice(6)) * 100 + parseInt(d.slice(3, 5));
  const fmt = n => Math.round(n).toLocaleString('fr-FR');

  console.log('modèle / finition'.padEnd(46) + 'frontière    mois-1 → VEN        mois+1 → VEN        écart');
  console.log('='.repeat(118));
  for (const mod of Object.keys(PH)) {
    let marque = null;
    for (const b of Object.keys(win.DB)) if (win.DB[b][mod]) marque = b;
    if (!marque) { console.log(mod + ' : modèle absent de la base'); continue; }
    for (const f of PH[mod]) {
      const kF = kh(f.date), an = parseInt(f.date.slice(6)), mo = parseInt(f.date.slice(3, 5));
      const fin = win.DB[marque][mod].find(x => kh(x.hist[0].d) < kF && kh(x.hist[x.hist.length - 1].d) > kF);
      if (!fin) { console.log((mod + ' — ' + f.date).padEnd(46) + 'aucune finition n\'enjambe la frontière'); continue; }
      setFY(an);
      const avantM = mo > 1 ? mo - 1 : 1, apresM = mo < 12 ? mo + 1 : 12;
      setFM(avantM);
      const a = win.computeVV(fin, 60000, 'normal', 'particulier', null, CY);
      setFM(apresM);
      const b2 = win.computeVV(fin, 60000, 'normal', 'particulier', null, CY);
      setFM(null);
      const sansMois = win.computeVV(fin, 60000, 'normal', 'particulier', null, CY);
      const e = (b2.ven.VEN / a.ven.VEN - 1) * 100;
      console.log((mod + ' ' + fin.v).slice(0, 44).padEnd(46) +
        f.date.padEnd(13) +
        (String(avantM).padStart(2, '0') + '/' + an + ' → ' + fmt(a.ven.VEN)).padEnd(20) +
        (String(apresM).padStart(2, '0') + '/' + an + ' → ' + fmt(b2.ven.VEN)).padEnd(20) +
        (e >= 0 ? '+' : '') + e.toFixed(0) + ' %');
      console.log('   '.padEnd(46) + 'sans mois : ' + fmt(sansMois.ven.VEN) +
        '  (phase sortante par prudence — comportement d\'avant : ' +
        (Math.abs(sansMois.ven.VEN - a.ven.VEN) < 1 ? 'identique au mois d\'avant' : 'ATTENTION, différent') + ')');
    }
  }
}, 900);
