// Effet des frontières ajoutées le 03.10.2026, finition par finition et millésime par millésime.
// Chaque cas ci-dessous est une étiquette de finition REPRISE d'une génération à l'autre : c'est
// le seul cas où la frontière change quelque chose, puisque la méthode B ancre sur le dernier
// tarif de la phase.
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
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const cas = [
    ['Mercedes-Benz', 'Mercedes-Benz Classe A', '180 AMG', [2015, 2016, 2018, 2019, 2021]],
    ['Ssangyong', 'Ssangyong Rexton', '2.0 L e-XDI BVA', [2015, 2016, 2017, 2018, 2019]],
    ['Ssangyong', 'Ssangyong Korando', '2.2 L Diesel e-XDI BVA', [2015, 2016, 2017, 2018]],
    ['MG', 'MG 3', '1.5 l Confort', [2016, 2017, 2018, 2024, 2025]],
  ];
  for (const [b, mo, v, ans] of cas) {
    const f = win.DB[b][mo].find(x => x.v === v);
    if (!f) { console.log('ABSENTE : ' + mo + ' · ' + v); continue; }
    console.log('══ ' + mo + ' · ' + v);
    console.log('   série : ' + win.tarifsCatalogue(f).map(h => h.d.slice(3) + ':' + h.p).join('  '));
    for (const an of ans) {
      setFY(an);
      const r = win.computeVV(f, 100000, 'normal', 'particulier', null, CY, null, 'aucun');
      if (r) console.log('   MEC ' + an + '  ancrage ' +
        (r.ven.ancre === 'jour' ? 'tarif du jour' : 'fin de série ' + (r.ven.dAncre || r.ven.M)).padEnd(26) +
        'valeur à neuf ' + dt(r.ven.VEN).padStart(12) + '   VV ' + dt(r.vv));
    }
    console.log('');
  }
}, 900);
