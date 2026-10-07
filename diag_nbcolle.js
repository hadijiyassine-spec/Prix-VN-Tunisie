// Contrôle du séparateur de milliers purement visuel (demande du 07.10.2026).
// Deux choses à vérifier, et la seconde est la seule qui compte vraiment :
//   · le montant se LIT séparé — les groupes de tête portent la classe .mil ;
//   · le montant se COPIE collé — le texte du nœud ne contient aucune espace.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

setTimeout(() => {
  let ko = 0;
  const ok = (b, t, d) => { console.log((b ? '  OK   ' : '  ÉCHEC') + ' · ' + t + (d ? '   ' + d : '')); if (!b) ko++; };

  console.log('SÉPARATEUR DE MILLIERS — lu séparé, copié collé\n');
  for (const n of [0, 7, 980, 1234, 12345, 122980, 1234567, -45600]) {
    const html = win.nbColle(n);
    const texte = html.replace(/<[^>]+>/g, '');
    console.log('  ' + String(n).padStart(9) + '  →  ' + html.padEnd(58) + ' copié : « ' + texte + ' »');
    if (/\s| /.test(texte)) { console.log('       ÉCHEC : le texte copié contient une espace'); ko++; }
    if (texte !== String(Math.round(n))) { console.log('       ÉCHEC : le texte copié ne vaut pas le nombre'); ko++; }
  }
  console.log('');

  // Dans l'interface, sur un véhicule réel.
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const clic = (id, f) => { const l = doc.getElementById(id); if (!l) return false;
    for (const el of l.children) if (f(el.textContent)) { el.dispatchEvent(new win.Event('click', { bubbles: true })); return true; } return false; };
  clic('listB', t => /^\s*Honda/.test(t)); clic('listM', t => /CR-V/.test(t) && !/Hybride/.test(t));
  setFY(2020);
  const fins = doc.getElementById('listV');
  if (fins && fins.children.length) fins.children[0].dispatchEvent(new win.Event('click', { bubbles: true }));
  const km = doc.getElementById('vvKm');
  if (km) { km.value = '120000'; km.dispatchEvent(new win.Event('input', { bubbles: true })); }

  const pv = doc.querySelector('.price-val');
  ok(!!pv, 'la valeur à neuf est rendue', pv && pv.textContent);
  if (pv) {
    ok(!/\s| /.test(pv.textContent), 'valeur à neuf : rien à nettoyer au collage', '« ' + pv.textContent + ' »');
    ok(pv.querySelectorAll('.mil').length >= 1, 'valeur à neuf : la séparation visuelle est là',
      pv.querySelectorAll('.mil').length + ' groupe(s)');
  }
  const vv = doc.getElementById('vvPrix');
  ok(!!vv, 'la valeur vénale est rendue');
  if (vv) {
    const chiffres = vv.textContent.replace(/DT/i, '');
    ok(!/\s| /.test(chiffres), 'valeur vénale : rien à nettoyer au collage', '« ' + chiffres + ' »');
    ok(vv.querySelectorAll('.mil').length >= 1, 'valeur vénale : la séparation visuelle est là',
      vv.querySelectorAll('.mil').length + ' groupe(s)');
  }
  // La marge existe-t-elle dans la feuille de style ?
  ok(/\.mil\{margin-right:/.test(app), 'la classe .mil porte bien une marge, pas une espace');

  console.log(ko === 0 ? '\nTout est au vert.' : '\n' + ko + ' contrôle(s) en échec.');
  process.exit(ko ? 1 : 0);
}, 900);
