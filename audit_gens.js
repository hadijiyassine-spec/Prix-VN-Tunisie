// CROISEMENT DES GÉNÉRATIONS CONNUES AVEC LES SÉRIES TARIFAIRES — proposition de frontières.
//
//   node audit_gens.js
//
// `window.GENS`, dans data.js, porte les générations de 117 modèles avec leurs années de
// production MONDIALES. Ce n'est pas la même chose qu'une date de lancement tunisienne : un
// modèle arrive ici avec un à trois ans de retard, parfois plus. Mais c'est exactement le
// matériau qu'il faut pour SAVOIR QU'UNE RUPTURE EXISTE, et la base dit alors QUAND elle a
// atteint la Tunisie — par le premier tarif de la génération entrante.
//
// La règle appliquée ici :
//   · une génération mondiale commence l'année Y ;
//   · on cherche, dans chaque série de finition, une cassure — trou d'un an ou plus, ou saut de
//     12 % net de l'indice — située entre Y et Y+4 (la fenêtre d'importation) ;
//   · si une ÉTIQUETTE DE FINITION traverse cette cassure, la frontière est nécessaire, et sa
//     date est celle du premier tarif d'après la cassure.
//
// Ce que ce script NE fait PAS : écrire. Il propose, avec de quoi vérifier chaque proposition.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const dt = n => Math.round(n).toLocaleString('fr-FR');
const FENETRE = 4;        // retard d'importation toléré, en années
const SEUIL_SAUT = 0.12;

setTimeout(() => {
  const CY = win.eval('CY');
  const GENS = win.GENS || {};
  const PH = win.eval('PHASES');
  const dejaDeclares = new Set(Object.keys(PH));

  // Les mêmes filtres que audit_phases.js : un saut partagé par toute une marque le même jour,
  // ou par tout le marché, n'est pas une génération.
  const sautsParDate = new Map();
  for (const b of Object.keys(win.DB)) for (const mo of Object.keys(win.DB[b])) for (const f of win.DB[b][mo]) {
    const HC = win.tarifsCatalogue(f);
    const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
    for (let i = 1; i < HC.length; i++) {
      const a = HC[i - 1], c = HC[i];
      if (!(a.p > 0)) continue;
      const y0 = win.yOf(a.d), y1 = win.yOf(c.d);
      const att = (y0 === y1) ? 1 : win.indexMultiplier(y0, y1, fc).m;
      if ((c.p / a.p) / att - 1 < SEUIL_SAUT) continue;
      if (!sautsParDate.has(c.d)) sautsParDate.set(c.d, new Set());
      sautsParDate.get(c.d).add(b + '|' + mo);
    }
  }
  const marche = new Set(), repricing = new Set();
  for (const [d, mods] of sautsParDate) {
    if (mods.size >= 8) marche.add(d);
    const parMarque = new Map();
    for (const m of mods) { const b = m.split('|')[0]; parMarque.set(b, (parMarque.get(b) || 0) + 1); }
    for (const [b, n] of parMarque) if (n >= 3) repricing.add(b + '|' + d);
  }

  const propositions = [];
  for (const b of Object.keys(win.DB)) for (const mo of Object.keys(win.DB[b])) {
    if (dejaDeclares.has(mo)) continue;
    const gens = GENS[mo];
    if (!gens || gens.length < 2) continue;
    for (let gi = 1; gi < gens.length; gi++) {
      const Y = gens[gi].y0;
      if (!Y) continue;
      // Cassures candidates dans la fenêtre [Y, Y+FENETRE], toutes finitions confondues.
      const cassures = new Map();     // date du premier tarif d'après -> infos
      for (const f of win.DB[b][mo]) {
        const HC = win.tarifsCatalogue(f);
        const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
        for (let i = 1; i < HC.length; i++) {
          const a = HC[i - 1], c = HC[i];
          if (!(a.p > 0)) continue;
          const y0 = win.yOf(a.d), y1 = win.yOf(c.d);
          if (y1 < Y || y0 > Y + FENETRE) continue;
          const att = (y0 === y1) ? 1 : win.indexMultiplier(y0, y1, fc).m;
          const net = (c.p / a.p) / att - 1;
          const trou = y1 - y0;
          if (net < SEUIL_SAUT && trou < 1) continue;
          if ((marche.has(c.d) || repricing.has(b + '|' + c.d)) && trou < 2) continue;
          if (!cassures.has(c.d)) cassures.set(c.d, { date: c.d, finitions: [], netMax: 0, trouMax: 0 });
          const e = cassures.get(c.d);
          e.finitions.push({ v: f.v, p0: a.p, p1: c.p, d0: a.d, net, trou });
          e.netMax = Math.max(e.netMax, net); e.trouMax = Math.max(e.trouMax, trou);
        }
      }
      if (!cassures.size) continue;
      // La cassure la plus marquée de la fenêtre.
      const cass = [...cassures.values()].sort((x, y) =>
        (y.finitions.length - x.finitions.length) || (y.netMax - x.netMax))[0];
      // Combien d'étiquettes NAISSENT et MEURENT à cette date — le marqueur positif.
      let nees = 0, mortes = 0;
      for (const f of win.DB[b][mo]) {
        const H = win.tarifsCatalogue(f);
        if (!H.length) continue;
        if (H[0].d === cass.date) nees++;
        const yf = win.yOf(H[H.length - 1].d);
        if (yf < win.yOf(cass.date) && yf >= win.yOf(cass.date) - 2) mortes++;
      }
      // Impact : seules comptent les finitions dont l'ÉTIQUETTE traverse la cassure.
      let impactMax = 0, traversantes = [];
      for (const f of win.DB[b][mo]) {
        const H = win.tarifsCatalogue(f);
        if (H.length < 2) continue;
        const kd = d => d.slice(6) + d.slice(3, 5) + d.slice(0, 2);
        const avant = H.filter(h => kd(h.d) < kd(cass.date));
        const apres = H.filter(h => kd(h.d) >= kd(cass.date));
        if (!avant.length || !apres.length) continue;      // ne traverse pas
        const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
        const vAct = H[H.length - 1].p * win.indexMultiplier(win.yOf(H[H.length - 1].d), CY, fc).m;
        const vPh = avant[avant.length - 1].p * win.indexMultiplier(win.yOf(avant[avant.length - 1].d), CY, fc).m;
        const imp = vPh > 0 ? vAct / vPh - 1 : 0;
        if (imp > 0.03) { traversantes.push({ v: f.v, imp }); impactMax = Math.max(impactMax, imp); }
      }
      if (!traversantes.length) continue;                  // rien à corriger
      propositions.push({ marque: b, modele: mo, gen: gens[gi], genPrec: gens[gi - 1],
        date: cass.date, netMax: cass.netMax, trouMax: cass.trouMax, nees, mortes,
        traversantes, impact: impactMax, exemples: cass.finitions.slice(0, 2) });
    }
  }
  propositions.sort((a, b) => b.impact * b.traversantes.length - a.impact * a.traversantes.length);

  console.log('FRONTIÈRES PROPOSÉES PAR CROISEMENT DES GÉNÉRATIONS CONNUES\n');
  console.log('GENS couvre ' + Object.keys(GENS).length + ' modèles. Frontières déjà déclarées : ' +
    dejaDeclares.size + '.');
  console.log(propositions.length + ' propositions, chacune portant sur un modèle dont une ÉTIQUETTE');
  console.log('de finition traverse la rupture — seul cas où la frontière change une valeur.\n');
  console.log('   modèle                          génération          frontière     saut   trou  né/mort  impact  finitions');
  for (const p of propositions) {
    console.log('   ' + (p.marque + ' ' + p.modele.replace(p.marque + ' ', '')).slice(0, 30).padEnd(32) +
      ((p.genPrec.gen || '?') + ' → ' + (p.gen.gen || '?') + ' (' + p.gen.y0 + ')').slice(0, 18).padEnd(20) +
      p.date + '   ' + (Math.round(p.netMax * 100) + ' %').padStart(5) + '  ' +
      String(p.trouMax).padStart(4) + '   ' + p.nees + ' / ' + p.mortes + '    ' +
      ('+' + Math.round(p.impact * 100) + ' %').padStart(6) + '   ' +
      p.traversantes.map(t => t.v).join(', ').slice(0, 42));
  }

  fs.writeFileSync('sources/audit_gens.json', JSON.stringify(propositions, null, 1));
  console.log('\nDétail : sources/audit_gens.json');
  console.log('\nÀ vérifier sur Wikipédia ou sur une source tunisienne avant de déclarer :');
  console.log('la génération mondiale dit QU\'une rupture existe, pas QUAND elle a atteint la Tunisie —');
  console.log('c\'est la base qui le dit, par le premier tarif d\'après la cassure.');
}, 900);
