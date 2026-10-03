// AUDIT SYSTÉMATIQUE DES CHANGEMENTS DE GÉNÉRATION NON DÉCLARÉS — toutes marques.
//
//   node audit_phases.js            → les 40 premiers candidats par impact
//   node audit_phases.js 200        → les 200 premiers
//
// Pourquoi ce contrôle existe. La méthode B ancre la valeur à neuf sur le DERNIER TARIF DE LA
// PHASE du véhicule. Quand une même étiquette de finition recouvre deux générations — le
// constructeur reprend le nom, le tarif bondit — et qu'aucune frontière n'est déclarée dans
// PHASES, tous les millésimes de la génération SORTANTE sont évalués sur le tarif de l'ENTRANTE.
// C'est le défaut trouvé le 03.10.2026 sur la Honda CR-V (10 % de trop sur 2018-2022) et sur la
// Honda City LX. Ce script cherche les mêmes cas partout ailleurs, et les classe par ce qu'ils
// coûtent réellement.
//
// Ce qu'il NE fait PAS : décider. Un saut de tarif peut venir d'une refonte fiscale, d'une
// dévaluation du dinar ou d'un changement d'importateur aussi bien que d'une génération nouvelle.
// Le script produit une liste de SUSPECTS à instruire, chacun avec de quoi l'instruire : les deux
// tarifs, les deux dates, le trou, l'écart net de l'indice et le nombre de millésimes en jeu.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const LIMITE = +(process.argv[2] || 40);
const dt = n => Math.round(n).toLocaleString('fr-FR');

setTimeout(() => {
  const CY = win.eval('CY');
  const PH = win.eval('PHASES');
  const dejaDeclares = new Set(Object.keys(PH));

  // Deux signatures d'un changement de génération, et il suffit de l'une :
  //   · un TROU de deux ans ou plus dans la série — le modèle a quitté le catalogue puis est
  //     revenu, ce qui est la trace la plus nette d'un renouvellement ;
  //   · un SAUT de tarif de 12 % ou plus NET DE L'INDICE de prix — c'est-à-dire au-delà de ce que
  //     l'inflation du neuf explique. Le seuil de 12 % est au-dessus du seuil de confiance de
  //     l'application (sautTarif), volontairement : on cherche les cas qui déplacent la valeur,
  //     pas tous ceux qui méritent un avertissement.
  const SEUIL_SAUT = 0.12, SEUIL_TROU = 2;

  // ── D'ABORD, séparer les chocs de marché des changements de génération ──
  //
  // Sans cela l'audit est inexploitable. Ma première exécution classait en tête une vingtaine de
  // Mercedes, BMW et Land Rover dont le tarif bondit de 17 à 21 % AU MÊME JOUR, en janvier 2018 :
  // ce n'est aucun renouvellement de modèle, c'est la loi de finances 2018 et sa refonte des
  // droits sur les véhicules. Même chose à l'automne 2026. Un changement de génération ne touche
  // qu'UN modèle à la fois ; une mesure fiscale ou une dévaluation en touche des dizaines le même
  // jour. On compte donc, pour chaque date de saut, combien de MODÈLES distincts sautent ce
  // jour-là — et au-delà de huit, on tient un événement de marché, pas une génération.
  const sautsParDate = new Map();
  for (const marque of Object.keys(win.DB)) for (const modele of Object.keys(win.DB[marque]))
    for (const f of win.DB[marque][modele]) {
      const HC = win.tarifsCatalogue(f);
      const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
      for (let i = 1; i < HC.length; i++) {
        const a = HC[i - 1], c = HC[i];
        if (!(a.p > 0)) continue;
        const y0 = win.yOf(a.d), y1 = win.yOf(c.d);
        const attendu = (y0 === y1) ? 1 : win.indexMultiplier(y0, y1, fc).m;
        if ((c.p / a.p) / attendu - 1 < 0.12) continue;
        if (!sautsParDate.has(c.d)) sautsParDate.set(c.d, new Set());
        sautsParDate.get(c.d).add(marque + '|' + modele);
      }
    }
  const SEUIL_MARCHE = 8, SEUIL_IMPORTATEUR = 3;
  const datesMarche = new Map();
  for (const [d, mods] of sautsParDate) if (mods.size >= SEUIL_MARCHE) datesMarche.set(d, mods.size);
  console.log('Dates où huit modèles ou plus sautent ensemble — événements de marché :');
  for (const [d, n] of [...datesMarche.entries()].sort((a, b) => b[1] - a[1]))
    console.log('   ' + d + ' : ' + n + ' modèles, toutes marques');
  // Second filet, et c'est lui qui fait le gros du travail : une REPRICING D'IMPORTATEUR. Un
  // constructeur ne renouvelle pas cinq modèles le même jour, mais un importateur réétiquette
  // bien tout son catalogue d'un coup — cinq Mercedes le 19.01.2018, onze jours après un premier
  // ajustement, c'est la loi de finances 2018 qui passe, pas cinq générations nouvelles.
  const repricing = new Map();   // 'marque|date' -> nombre de modèles
  for (const [d, mods] of sautsParDate) {
    const parMarque = new Map();
    for (const m of mods) { const b = m.split('|')[0]; parMarque.set(b, (parMarque.get(b) || 0) + 1); }
    for (const [b, n] of parMarque) if (n >= SEUIL_IMPORTATEUR) repricing.set(b + '|' + d, n);
  }
  console.log('\nRepricings d\'importateur — une marque, plusieurs modèles le même jour :');
  for (const [k, n] of [...repricing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12))
    console.log('   ' + k.split('|')[1] + ' · ' + k.split('|')[0] + ' : ' + n + ' modèles');
  console.log('   (' + repricing.size + ' au total)\n');

  const candidats = [];
  for (const marque of Object.keys(win.DB)) for (const modele of Object.keys(win.DB[marque])) {
    if (dejaDeclares.has(modele)) continue;
    for (const f of win.DB[marque][modele]) {
      const HC = win.tarifsCatalogue(f);
      if (HC.length < 2) continue;
      const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
      let pire = null;
      for (let i = 1; i < HC.length; i++) {
        const a = HC[i - 1], c = HC[i];
        const y0 = win.yOf(a.d), y1 = win.yOf(c.d);
        if (!(a.p > 0)) continue;
        const attendu = (y0 === y1) ? 1 : win.indexMultiplier(y0, y1, fc).m;
        const net = (c.p / a.p) / attendu - 1;       // au-delà de ce que l'indice explique
        const trou = y1 - y0;
        if (net < SEUIL_SAUT && trou < SEUIL_TROU) continue;
        // Saut survenu un jour d'événement de marché, et sans trou dans la série : c'est la
        // fiscalité ou le change, pas une génération nouvelle. On l'écarte.
        if (datesMarche.has(c.d) && trou < SEUIL_TROU) continue;
        if (repricing.has(marque + '|' + c.d) && trou < SEUIL_TROU) continue;
        // Ce que la frontière changerait : l'ancrage passerait du dernier tarif de la série au
        // dernier tarif D'AVANT le saut, chacun actualisé à l'année d'évaluation.
        const vAct = HC[HC.length - 1].p * win.indexMultiplier(win.yOf(HC[HC.length - 1].d), CY, fc).m;
        const vPh = a.p * win.indexMultiplier(y0, CY, fc).m;
        const impact = vPh > 0 ? (vAct / vPh - 1) : 0;
        const millesimes = y0 - win.yOf(HC[0].d) + 1;   // millésimes du côté sortant
        // On retient le saut le plus coûteux de la finition, pas le plus grand en pourcentage :
        // un saut énorme en fin de série ne concerne qu'un millésime ou deux.
        const poids = impact * Math.min(millesimes, 10);
        // Marqueur POSITIF d'un renouvellement : à la date du saut, le modèle gagne des étiquettes
        // de finition nouvelles et en perd d'anciennes. C'est ce qui a confirmé la Honda City —
        // la LX Sport naît le 16.10.2021, l'ancienne EX meurt deux mois plus tôt. Un choc fiscal,
        // lui, ne crée ni ne supprime aucune finition.
        let nees = 0, mortes = 0;
        for (const g of win.DB[marque][modele]) {
          const HG = win.tarifsCatalogue(g);
          if (!HG.length) continue;
          if (HG[0].d === c.d) nees++;
          if (win.yOf(HG[HG.length - 1].d) < y1 && win.yOf(HG[HG.length - 1].d) >= y0 - 1) mortes++;
        }
        if (!pire || poids > pire.poids)
          pire = { marque, modele, v: f.v, d0: a.d, d1: c.d, p0: a.p, p1: c.p, net, trou,
                   impact, millesimes, poids, vAct, vPh, nees, mortes, dernier: HC[HC.length - 1] };
      }
      if (pire && pire.impact > 0.03) candidats.push(pire);
    }
  }

  // Regroupement par modèle : une frontière se déclare par MODÈLE, pas par finition.
  const parModele = new Map();
  for (const c of candidats) {
    const k = c.marque + '|' + c.modele;
    if (!parModele.has(k)) parModele.set(k, []);
    parModele.get(k).push(c);
  }
  const modeles = [...parModele.entries()].map(([k, arr]) => {
    const pire = arr.slice().sort((a, b) => b.poids - a.poids)[0];
    return { k, pire, n: arr.length, poidsTotal: arr.reduce((s, x) => s + x.poids, 0) };
  }).sort((a, b) => b.poidsTotal - a.poidsTotal);

  console.log('AUDIT DES CHANGEMENTS DE GÉNÉRATION NON DÉCLARÉS — ' + CY + '\n');
  console.log('Critère : une même étiquette de finition dont la série porte un TROU de ' + SEUIL_TROU +
    ' ans ou plus,\nou un SAUT de ' + Math.round(SEUIL_SAUT * 100) + ' % ou plus net de l\'indice de prix.');
  console.log('Frontières déjà déclarées (exclues) : ' + [...dejaDeclares].join(', ') + '\n');
  console.log(parModele.size + ' modèles suspects, ' + candidats.length + ' finitions concernées.');
  console.log('Classés par impact : l\'écart de valeur à neuf, multiplié par le nombre de');
  console.log('millésimes qui le subissent (plafonné à dix).\n');

  console.log('   modèle                            saut observé                                impact  mill.  nouvelles/éteintes');
  for (const m of modeles.slice(0, LIMITE)) {
    const c = m.pire;
    const saut = c.d0 + ' ' + dt(c.p0) + ' → ' + c.d1 + ' ' + dt(c.p1) +
      (c.trou >= SEUIL_TROU ? ' [' + c.trou + ' ans]' : '') + ' (' + (c.net * 100).toFixed(0) + ' % net)';
    console.log('   ' + (c.marque + ' ' + c.modele.replace(c.marque + ' ', '')).slice(0, 32).padEnd(34) +
      saut.padEnd(44) + ('+' + (c.impact * 100).toFixed(0) + ' %').padStart(7) + '  ' +
      String(c.millesimes).padStart(3) + '    ' + c.nees + ' / ' + c.mortes +
      (m.n > 1 ? '   (' + m.n + ' finitions)' : ''));
  }

  if (modeles.length > LIMITE) console.log('\n   … et ' + (modeles.length - LIMITE) + ' autres modèles.');

  // Le total en jeu, pour savoir si ce chantier mérite d'être mené jusqu'au bout.
  const gros = modeles.filter(m => m.pire.impact >= 0.10);
  console.log('\nModèles dont l\'ancrage est faussé de 10 % ou plus : ' + gros.length +
    ' sur ' + modeles.length + '.');
  console.log('Finitions concernées, toutes marques : ' + candidats.length + ' sur ' +
    Object.values(win.DB).reduce((n, b) => n + Object.values(b).reduce((m, l) => m + l.length, 0), 0) + '.');

  fs.writeFileSync('sources/audit_phases.json', JSON.stringify(modeles.map(m => ({
    modele: m.pire.marque + ' · ' + m.pire.modele, finitions: m.n, impact: m.pire.impact,
    millesimes: m.pire.millesimes, saut: { de: m.pire.d0, p0: m.pire.p0, a: m.pire.d1, p1: m.pire.p1,
    net: m.pire.net, trou: m.pire.trou }, detail: parModele.get(m.k).map(c => c.v),
  })), null, 1));
  console.log('\nListe complète : sources/audit_phases.json');
}, 900);
