// Validation finale : valeur vénale calculée par l'application vs prix réellement
// observés sur le marché tunisien de l'occasion, modèle par modèle.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('app.html', 'utf8');
const data = fs.readFileSync('data.js', 'utf8');
const html = app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.com/app.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));

const CY = 2026;
// Aucune marge de négociation supposée : on compare au prix DEMANDÉ brut. Le modèle,
// ancré sur le prix catalogue, doit logiquement se situer un peu EN DESSOUS.
const MARGE = 1;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const fmt = n => Math.round(n).toLocaleString('fr-FR');

setTimeout(() => {
  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  function cle(nom, annee) {
    if (existe[nom]) return nom;
    if (/^Volkswagen Golf$/i.test(nom)) return annee >= 2020 ? 'Volkswagen Golf 8' : annee >= 2013 ? 'Volkswagen Golf 7' : 'Volkswagen Golf 6';
    return null;
  }

  // Sélection de la finition comme le ferait l'utilisateur : parmi les finitions du modèle,
  // celles qui étaient effectivement référencées à l'année de mise en circulation (c'est ce
  // que l'application met en tête de liste et signale par le bandeau de compatibilité).
  // À défaut, la finition dont la période de commercialisation est la plus proche.
  function pickFin(cleModele, mec) {
    let brand = null;
    for (const b of Object.keys(win.DB)) if (win.DB[b][cleModele]) brand = b;
    if (!brand) return null;
    const fins = win.DB[brand][cleModele];
    const dispo = fins.filter(f => win.yOf(f.d0) <= mec && mec <= win.yOf(f.d) + 1);
    const pool = dispo.length ? dispo : (() => {
      let best = Infinity, out = [];
      for (const f of fins) {
        const y0 = win.yOf(f.d0), y1 = win.yOf(f.d);
        const gap = mec < y0 ? y0 - mec : mec > y1 ? mec - y1 : 0;
        if (gap < best) { best = gap; out = [f]; } else if (gap === best) out.push(f);
      }
      return out;
    })();
    const tri = pool.slice().sort((a, b) => a.p - b.p);
    return tri[Math.floor(tri.length / 2)] || null;
  }


  const lines = fs.readFileSync('marche_occasion.csv', 'utf8').trim().split('\n').slice(1);
  const rows = [];
  for (const l of lines) {
    const [modele, aS, pS, kS] = l.split(';');
    const annee = +aS, prix = +pS, km = kS === '' || kS == null ? null : +kS;
    const k = cle(modele, annee);
    if (!k || !existe[k]) continue;
    if (!(annee >= 2005 && annee <= CY) || !(prix >= 8000 && prix <= 400000)) continue;
    const fin = pickFin(k, annee);
    if (!fin) continue;
    const ven = win.computeVEN(fin, annee).VEN;
    const ret = (prix * MARGE) / ven;
    if (!(ret >= 0.03 && ret <= 1.30)) continue;
    rows.push({ modele, k, annee, prix, km, age: CY - annee });
  }

  // Regroupement par modèle et tranche d'âge de 3 ans
  const groupes = {};
  for (const r of rows) {
    const tranche = Math.floor(r.age / 3) * 3;
    const key = r.modele + '|' + tranche;
    (groupes[key] = groupes[key] || []).push(r);
  }

  console.log('Valeur vénale calculée vs marché réel — état normal, usage particulier');
  console.log('(marché = médiane des prix DEMANDÉS ; le calcul doit logiquement se situer un peu en dessous)');
  console.log('='.repeat(104));
  console.log('modèle'.padEnd(18) + 'âge'.padStart(6) + 'n'.padStart(4) + 'km méd.'.padStart(10) +
    'marché'.padStart(12) + 'calculé'.padStart(12) + 'écart'.padStart(9));
  console.log('-'.repeat(104));

  const ecarts = [];
  const keysTriees = Object.keys(groupes).sort((a, b) => {
    const [ma, ta] = a.split('|'), [mb, tb] = b.split('|');
    return ma.localeCompare(mb) || (+ta) - (+tb);
  });
  for (const key of keysTriees) {
    const g = groupes[key];
    if (g.length < 4) continue;
    const [modele, tranche] = key.split('|');
    const ageMed = median(g.map(r => r.age));
    const kmMed = median(g.map(r => r.km).filter(x => x != null && isFinite(x)));
    const marche = median(g.map(r => r.prix)) * MARGE;

    const mecEl = doc.getElementById('mecIn');
    mecEl.value = String(CY - Math.round(ageMed));
    mecEl.dispatchEvent(new win.Event('input'));
    const finRef = pickFin(g[0].k, CY - Math.round(ageMed));
    const r = win.computeVV(finRef, kmMed, 'normal', 'particulier');
    const ecart = (r.vv / marche - 1) * 100;
    ecarts.push(ecart);

    console.log(
      modele.slice(0, 17).padEnd(18) +
      (tranche + '-' + (+tranche + 2) + ' a').padStart(6) +
      String(g.length).padStart(4) +
      (kmMed != null ? fmt(kmMed) : '—').padStart(10) +
      (fmt(marche) + ' DT').padStart(12) +
      (fmt(r.vv) + ' DT').padStart(12) +
      ((ecart >= 0 ? '+' : '') + ecart.toFixed(0) + ' %').padStart(9)
    );
  }
  console.log('-'.repeat(104));
  console.log('Écart médian : ' + (median(ecarts) >= 0 ? '+' : '') + median(ecarts).toFixed(1) + ' %' +
    '   |   écart absolu médian : ' + median(ecarts.map(Math.abs)).toFixed(1) + ' %' +
    '   |   ' + ecarts.length + ' groupes');
  const dans20 = ecarts.filter(e => Math.abs(e) <= 20).length;
  console.log('Groupes à moins de 20 % d\'écart : ' + dans20 + '/' + ecarts.length +
    ' (' + Math.round(100 * dans20 / ecarts.length) + ' %)');
}, 900);
