// Instantané de la valeur vénale sur TOUTE la base, millésime par millésime.
// Sert à mesurer l'effet d'un changement de méthode : on l'exécute avant, puis après,
// et on compare les deux fichiers JSON.
//   node snapshot.js avant.json
const { JSDOM } = require('jsdom');
const fs = require('fs');

const app = fs.readFileSync(fs.existsSync('app.html') ? 'app.html' : 'index.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const html = app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.com/app.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const sortie = process.argv[2] || 'snapshot.json';

setTimeout(() => {
  const el = doc.getElementById('mecIn');
  const setFY = y => { el.value = String(y); el.dispatchEvent(new win.Event('input')); };
  const CY = win.eval('CY');
  const out = {};
  let n = 0;
  for (const b of Object.keys(win.DB)) {
    for (const m of Object.keys(win.DB[b])) {
      for (const f of win.DB[b][m]) {
        const H = win.tarifsCatalogue(f);
        if (!H || !H.length) continue;
        const y0 = win.yOf(H[0].d), y1 = Math.min(win.yOf(H[H.length - 1].d), CY);
        for (let y = y0; y <= y1; y++) {
          setFY(y);
          const km = 15000 * Math.max(0, CY - y);
          const r = win.computeVV(f, km, 'normal', 'particulier', null, CY, null, 'aucun');
          if (!r) continue;
          out[b + '|' + m + '|' + f.v + '|' + y] = { vv: r.vv, ven: Math.round(r.ven.VEN), a: r.ven.ancre };
          n++;
        }
      }
    }
  }
  fs.writeFileSync(sortie, JSON.stringify(out));
  console.log(n + ' couples finition × millésime écrits dans ' + sortie);
}, 300);
