// Diagnostic du cas signalé le 29.09.2026 : Opel Corsa, MEC 2022.
// Repère de marché donné par Yassine Hadiji : 34 000 à 38 000 DT.
// Rappel de doctrine, posé par lui : la valeur vénale est LÉGÈREMENT INFÉRIEURE à la valeur
// marchande, qui est celle du marché. La cible n'est donc pas 34-38 : c'est un peu en dessous
// de la borne basse du marché pour un véhicule comparable.
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
const MARCHE_BAS = 34000, MARCHE_HAUT = 38000;

setTimeout(() => {
  const CY = win.eval('CY'), P = win.eval('VVPARAMS');
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const setFM = m => { const e = doc.getElementById('mecMois'); e.value = m == null ? '' : String(m); e.dispatchEvent(new win.Event('change', { bubbles: true })); };

  // Toutes les finitions de Corsa présentes dans la base, y compris les populaires.
  const modeles = [];
  for (const mo of Object.keys(win.DB.Opel)) if (/corsa/i.test(mo)) modeles.push(mo);

  console.log('DIAGNOSTIC — Opel Corsa, MEC 2022, évaluation ' + CY + ' (mois 09), état normal');
  console.log('Repère de marché (Yassine Hadiji, 29.09.2026) : ' + dt(MARCHE_BAS) + ' à ' + dt(MARCHE_HAUT));
  console.log('La valeur vénale doit se situer un peu EN DESSOUS de ce marché.\n');

  const lignes = [];
  for (const mo of modeles) {
    console.log('══════════════ ' + mo);
    for (const f of win.DB.Opel[mo]) {
      setFY(2022); setFM(null);
      const H = win.tarifsCatalogue(f);
      const t2022 = win.tarifMillesime(f, 2022, null);
      const dernier = H[H.length - 1];
      console.log('\n  ── ' + f.v);
      console.log('     série : ' + H.map(h => h.d + ':' + h.p).join('  '));
      console.log('     tarif du millésime 2022 : ' + (t2022 ? dt(t2022.p) + ' (' + t2022.d + ')' : '—') +
        '   |   ancrage méthode B : ' + dt(dernier.p) + ' (' + dernier.d + ')');

      // Les clés d'usage de VVPARAMS sont particulier / pro / location / taxi — « societe »
      // n'existe pas et retomberait en silence sur « particulier ».
      for (const usage of ['particulier', 'pro']) {
        for (const km of [60000, 90000, 120000]) {
          const r = win.computeVV(f, km, 'normal', usage, null, CY, null, 'aucun', null, 9);
          lignes.push({ mo, v: f.v, usage, km, vv: r.vv, ven: r.ven.VEN, fAge: r.fAge, fKm: r.fKm,
            taux: r.tauxDepr, gamme: r.gamme.nom, age: r.age });
          const ecartBas = (r.vv / MARCHE_BAS - 1) * 100;
          console.log('     ' + usage.padEnd(12) + String(km / 1000).padStart(4) + ' 000 km   VEN ' + dt(r.ven.VEN).padStart(12) +
            '   F_âge ×' + f2(r.fAge) + '   F_km ×' + f2(r.fKm) +
            '   VV ' + dt(r.vv).padStart(11) +
            '   vs 34 000 : ' + (ecartBas >= 0 ? '+' : '') + ecartBas.toFixed(0) + ' %');
        }
      }
      console.log('     gamme : ' + lignes[lignes.length - 1].gamme + ' · taux ' +
        (lignes[lignes.length - 1].taux * 100).toFixed(2) + ' %/an · âge ' + lignes[lignes.length - 1].age + ' ans');
    }
    console.log('');
  }

  // ── Lecture d'ensemble ──
  const part = lignes.filter(l => l.usage === 'particulier' && l.km === 90000 && !/populaire/i.test(l.mo));
  if (part.length) {
    const vs = part.map(l => l.vv).sort((a, b) => a - b);
    const med = vs[Math.floor(vs.length / 2)];
    console.log('══════════════ Lecture d\'ensemble (particulier, 90 000 km, hors populaires)');
    console.log('  éventail calculé : ' + dt(vs[0]) + ' à ' + dt(vs[vs.length - 1]) + ' · médiane ' + dt(med));
    console.log('  marché annoncé   : ' + dt(MARCHE_BAS) + ' à ' + dt(MARCHE_HAUT));
    console.log('  écart de la médiane à la borne basse du marché : ' +
      ((med / MARCHE_BAS - 1) * 100).toFixed(1) + ' %');
    console.log('  → une valeur vénale « légèrement inférieure » au marché viserait plutôt ' +
      dt(MARCHE_BAS * 0.95) + ' à ' + dt(MARCHE_BAS));
  }

  // ── Quel taux de décote ramènerait la médiane sous le marché ? ──
  const ref = part.length ? part[Math.floor(part.length / 2)] : null;
  if (ref) {
    console.log('\n══════════════ Sensibilité au taux de décote (même finition, même km)');
    console.log('  finition de référence : ' + ref.v + ' · VEN ' + dt(ref.ven) + ' · âge ' + ref.age + ' ans');
    for (const t of [0.058, 0.07, 0.08, 0.09, 0.10, 0.12]) {
      const fAge = Math.max(Math.pow(1 - t, ref.age), P.valeurResiduelle);
      const vv = ref.ven * fAge * ref.fKm;
      console.log('    taux ' + (t * 100).toFixed(2) + ' %/an → F_âge ×' + f2(fAge) + ' → ' + dt(vv).padStart(11) +
        '   vs 34 000 : ' + ((vv / MARCHE_BAS - 1) * 100).toFixed(0) + ' %');
    }
  }
}, 900);
