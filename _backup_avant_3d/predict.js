// Prédictions du modèle pour des véhicules courants en Tunisie, afin de les
// confronter aux prix réels du marché de l'occasion.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('app.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const html = app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.com/app.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));

const WANTED = [
  'Volkswagen Golf', 'Peugeot 208', 'Renault Clio', 'KIA Picanto', 'Hyundai i10',
  'Hyundai i20', 'Dacia Duster', 'Dacia Sandero', 'Seat Ibiza', 'Citroën C3',
  'Toyota Yaris', 'Volkswagen Polo', 'Peugeot 301', 'Renault Symbol', 'Skoda Fabia',
  'Fiat Tipo', 'Suzuki Swift', 'Nissan Qashqai', 'Volkswagen Tiguan', 'Hyundai Tucson',
];

function setFY(y) { const el = doc.getElementById('mecIn'); el.value = String(y); el.dispatchEvent(new win.Event('input')); }

setTimeout(() => {
  // Repérer les modèles voulus dans la base
  const found = [];
  for (const b of Object.keys(win.DB)) {
    for (const m of Object.keys(win.DB[b])) {
      for (const w of WANTED) {
        if (m.toLowerCase() === w.toLowerCase()) {
          const fins = win.DB[b][m];
          // finition dont le dernier prix est le plus récent = la plus représentative du catalogue actuel
          const best = fins.slice().sort((x, y) => win.yOf(y.d) - win.yOf(x.d) || y.p - x.p)[0];
          found.push({ b, m, f: best, nFin: fins.length });
        }
      }
    }
  }
  found.sort((a, b) => a.m.localeCompare(b.m));

  console.log('modèle | finition retenue | dernier prix catalogue | VEN 2026');
  console.log('='.repeat(100));
  for (const x of found) {
    const ven = win.computeVEN(x.f);
    console.log(
      x.m.padEnd(22) + '| ' + x.f.v.slice(0, 26).padEnd(27) + '| ' +
      (x.f.p.toLocaleString('fr-FR') + ' (' + win.yOf(x.f.d) + ')').padStart(18) + ' | ' +
      Math.round(ven.VEN / 100 * 100).toLocaleString('fr-FR').padStart(9)
    );
  }

  console.log('\n\nValeur vénale estimée — état normal, usage particulier, kilométrage = 15 000 km/an');
  console.log('='.repeat(100));
  const years = [2022, 2019, 2016, 2013];
  console.log('modèle'.padEnd(22) + years.map(y => ('MEC ' + y).padStart(14)).join(''));
  console.log('-'.repeat(100));
  const rows = [];
  for (const x of found) {
    let line = x.m.padEnd(22);
    const vals = {};
    for (const y of years) {
      setFY(y);
      const age = 2026 - y;
      const r = win.computeVV(x.f, age * 15000, 'normal', 'particulier');
      vals[y] = r.vv;
      line += (r.vv.toLocaleString('fr-FR') + ' DT').padStart(14);
    }
    rows.push({ model: x.m, brand: x.b, fin: x.f.v, cat: x.f.p, catY: win.yOf(x.f.d), vals });
    console.log(line);
  }
  fs.writeFileSync('predictions.json', JSON.stringify(rows, null, 1));
  console.log('\n(' + rows.length + ' modèles écrits dans predictions.json)');
}, 900);
