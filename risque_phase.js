// Où la méthode B fait-elle porter la valeur à neuf d'un véhicule ancien sur un tarif qui
// n'est peut-être plus celui du même véhicule ? On croise :
//   · le mouvement de valeur vénale mesuré entre les deux méthodes (snapshots) ;
//   · le détecteur de discontinuité déjà présent dans l'application.
//   node risque_phase.js avant.json apres.json
const { JSDOM } = require('jsdom');
const fs = require('fs');
const A = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const B = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));

const app = fs.readFileSync(fs.existsSync('app.html') ? 'app.html' : 'index.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window;
win.requestAnimationFrame = cb => setTimeout(cb, 0);
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

setTimeout(() => {
  const CY = win.eval('CY');
  const parModele = {};
  for (const k of Object.keys(A)) {
    if (!B[k]) continue;
    const e = B[k].vv / A[k].vv - 1;
    if (Math.abs(e) <= 0.10) continue;
    const [b, m, fin, an] = k.split('|');
    const cle = b + ' · ' + m;
    const g = parModele[cle] = parModele[cle] || { n: 0, pire: 0, ans: [], fins: new Set(), mod: m, marque: b };
    g.n++; g.ans.push(parseInt(an)); g.fins.add(fin);
    if (Math.abs(e) > Math.abs(g.pire)) g.pire = e;
  }
  // Pour chaque modèle concerné, on redit ce que le détecteur de discontinuité voit.
  const lignes = [];
  for (const cle of Object.keys(parModele)) {
    const g = parModele[cle];
    let d = null, f0 = null;
    for (const b of Object.keys(win.DB)) {
      if (!win.DB[b][g.mod]) continue;
      for (const f of win.DB[b][g.mod]) {
        if (!g.fins.has(f.v)) continue;
        const an0 = Math.min.apply(null, g.ans);
        const x = win.discontinuite(f, an0, CY);
        if (x && (!d || x.ecart > d.ecart)) { d = x; f0 = f; }
      }
    }
    const H = f0 ? win.tarifsCatalogue(f0) : null;
    lignes.push({
      cle, n: g.n, pire: g.pire, an0: Math.min.apply(null, g.ans), an1: Math.max.apply(null, g.ans),
      phase: !!win.eval('PHASES')[g.mod],
      saut: d ? Math.round(d.ecart * 100) : null,
      quand: d ? d.d1 : null, p0: d ? d.p0 : null, p1: d ? d.p1 : null,
      serie: H ? win.yOf(H[0].d) + '→' + win.yOf(H[H.length - 1].d) : ''
    });
  }
  lignes.sort((x, y) => y.n - x.n);
  console.log('Modèles dont au moins un millésime bouge de plus de 10 % : ' + lignes.length);
  console.log('dont avec un saut de tarif divergent détecté : ' + lignes.filter(l => l.saut != null).length);
  console.log('dont une phase déjà documentée dans PHASES : ' + lignes.filter(l => l.phase).length);
  console.log('\nmodèle                              | mil. | millésimes | série     | pire  | saut détecté');
  for (const l of lignes)
    console.log(l.cle.slice(0, 35).padEnd(35), '|', String(l.n).padStart(4), '|',
      (l.an0 + '-' + l.an1).padStart(10), '|', l.serie.padStart(9), '|',
      ((l.pire > 0 ? '+' : '') + Math.round(l.pire * 100) + '%').padStart(5), '|',
      l.saut != null ? ('+' + l.saut + '% en ' + l.quand + ' (' + l.p0 + '→' + l.p1 + ')') : '—');
}, 300);
