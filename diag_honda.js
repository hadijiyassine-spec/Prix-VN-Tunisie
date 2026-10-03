// Contrôle des finitions Honda, et en particulier de la CR-V (demande du 03.10.2026).
//
// Ce que la lecture de la base fait soupçonner, et qu'on vérifie ici :
//   1. CR-V « 1.5 T CVT » : la série saute de 155 990 DT (18.01.2021) à 190 990 (16.01.2025),
//      quatre ans de silence et +22,4 %. Les finitions LX et EX, elles, s'arrêtent le 16.01.2023.
//      Or la fiche automobile.tn du tarif actuel décrit un véhicule de 4 706 mm à SEPT places :
//      c'est la 6e génération (RS). La 5e (RW) mesurait 4 592 mm et n'avait que cinq places.
//      Une seule étiquette de finition recouvre donc DEUX véhicules — et la méthode B ancre la
//      valeur vénale sur le DERNIER tarif de la phase : sans frontière déclarée, toute CR-V de
//      2018 à 2022 est évaluée sur le tarif d'une voiture qui n'existait pas encore.
//   2. City : « 1.5 L CVT EX » (16.05.2016 → 20.08.2021) et « 1.5 L EX CVT » (16.10.2021 →
//      10.05.2022) — les mêmes mots dans un autre ordre, et deux séries qui s'enchaînent sans se
//      recouvrir. Si c'est la même finition, sa série est coupée en deux et la fin de série de la
//      première est fausse.
//   3. Brio Amaze « 1.2 L Pack Look » : un seul relevé (41 500 DT au 06.03.2018) alors que la
//      « 1.2 L » de base continue jusqu'à 41 980 DT en 2019. La finition la plus chère peut donc
//      ressortir SOUS la finition de base sur les millésimes récents.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const dt = n => Math.round(n).toLocaleString('fr-FR') + ' DT';
const f3 = n => (Math.round(n * 1000) / 1000).toFixed(3);

setTimeout(() => {
  const CY = win.eval('CY');
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const PH = win.eval('PHASES');

  console.log('CONTRÔLE HONDA — évaluation ' + CY + ', état normal, usage particulier, 100 000 km\n');
  console.log('Phases déclarées pour Honda : ' +
    (Object.keys(PH).filter(k => /honda/i.test(k)).join(', ') || 'AUCUNE') + '\n');

  // ── 1. La CR-V, millésime par millésime ──
  const crv = win.DB.Honda['Honda CR-V'].find(f => f.v === '1.5 T CVT');
  const H = win.tarifsCatalogue(crv);
  console.log('══ CR-V · 1.5 T CVT — une étiquette, deux générations');
  console.log('   série : ' + H.map(h => h.d.slice(6) + ':' + h.p).join(' ') + '\n');
  console.log('   MEC   ancrage retenu        valeur à neuf      VV 100 000 km');
  for (const an of [2018, 2019, 2020, 2021, 2022, 2023, 2025, 2026]) {
    setFY(an);
    const r = win.computeVV(crv, 100000, 'normal', 'particulier', null, CY, null, 'aucun');
    if (!r) { console.log('   ' + an + '   —'); continue; }
    console.log('   ' + an + '   ' + (r.ven.ancre === 'jour' ? 'tarif du jour' : 'fin de série ' + (r.ven.dAncre || r.ven.M)).padEnd(22) +
      dt(r.ven.VEN).padStart(12) + '   ' + dt(r.vv).padStart(12) +
      '   (âge ' + r.age + ' ans, F_âge ×' + f3(r.fAge) + ')');
  }

  // Ce que donnerait l'ancrage correct : la 5e génération s'arrête au dernier tarif d'avant le
  // trou, soit 155 990 DT au 18.01.2021, actualisé à 2026 par l'indice.
  const fc = win.fuelClass((crv.eg && crv.eg.fuel) || null);
  const idx = win.indexMultiplier(2021, CY, fc).m;
  console.log('\n   Si la frontière de génération était déclarée, une CR-V de la 5e génération');
  console.log('   serait ancrée sur 155 990 DT (18.01.2021) × indice ' + f3(idx) + ' = ' + dt(155990 * idx) + ',');
  console.log('   au lieu de ' + dt(190980 * win.indexMultiplier(2026, CY, fc).m) + ' aujourd\'hui — soit ' +
    Math.round((190980 * win.indexMultiplier(2026, CY, fc).m / (155990 * idx) - 1) * 100) + ' % de trop.');

  // ── 1 bis. Le millésime à cheval sur la frontière, avec et sans le mois ──
  // La frontière CR-V tombe le 16.01.2025 : presque toute l'année 2025 appartient à la génération
  // entrante. Sans mois de mise en circulation, le calcul range le millésime du côté SORTANT —
  // c'est le choix prudent, hérité de la 208 — donc il sous-évalue une CR-V de mars 2025 jusqu'à
  // ce que le mois soit saisi. Il faut pouvoir le chiffrer pour savoir ce que coûte l'oubli.
  const setFM = m => { const e = doc.getElementById('mecMois'); e.value = m == null ? '' : String(m); e.dispatchEvent(new win.Event('change', { bubbles: true })); };
  console.log('\n══ CR-V 2025, de part et d\'autre du 16.01.2025');
  for (const m of [null, 1, 3, 9]) {
    setFY(2025); setFM(m);
    const r = win.computeVV(crv, 30000, 'normal', 'particulier', null, CY, null, 'aucun', m, 9);
    if (r) console.log('   MEC ' + (m ? String(m).padStart(2, '0') + '/2025' : '2025 sans mois').padEnd(16) +
      'ancrage ' + (r.ven.ancre === 'jour' ? 'tarif du jour' : 'fin de série ' + (r.ven.dAncre || r.ven.M)).padEnd(24) +
      'valeur à neuf ' + dt(r.ven.VEN).padStart(11) + '   VV ' + dt(r.vv));
  }
  setFM(null);

  // ── 1 ter. La City LX, dont la série traverse aussi une frontière ──
  console.log('\n══ City · 1.5 L CVT LX — série du 05.11.2020 au 19.01.2026, frontière le 16.10.2021');
  const lx = win.DB.Honda['Honda City'].find(f => f.v === '1.5 L CVT LX');
  for (const an of [2020, 2021, 2022, 2024]) {
    setFY(an);
    const r = win.computeVV(lx, 100000, 'normal', 'particulier', null, CY, null, 'aucun');
    if (r) console.log('   MEC ' + an + '   ancrage ' + (r.ven.ancre === 'jour' ? 'tarif du jour' : 'fin de série ' + (r.ven.dAncre || r.ven.M)).padEnd(24) +
      'valeur à neuf ' + dt(r.ven.VEN).padStart(11) + '   VV ' + dt(r.vv));
  }

  // ── 2. Les deux City EX ──
  console.log('\n══ City · deux étiquettes pour la même finition ?');
  for (const nom of ['1.5 L CVT EX', '1.5 L EX CVT']) {
    const f = win.DB.Honda['Honda City'].find(x => x.v === nom);
    if (!f) { console.log('   ' + nom + ' : absente'); continue; }
    const h = win.tarifsCatalogue(f);
    console.log('   ' + nom.padEnd(16) + h.length + ' relevés  ' + h[0].d + ' → ' + h[h.length - 1].d +
      '  fin de série ' + dt(h[h.length - 1].p));
    for (const an of [2019, 2021, 2022]) {
      setFY(an);
      const r = win.computeVV(f, 100000, 'normal', 'particulier', null, CY, null, 'aucun');
      if (r) console.log('        MEC ' + an + ' → valeur à neuf ' + dt(r.ven.VEN).padStart(11) + ', VV ' + dt(r.vv));
    }
  }

  // ── 3. Inversions entre finitions d'un même modèle Honda ──
  // Une finition PLUS CHÈRE à neuf ne doit pas ressortir SOUS une finition moins chère du même
  // modèle, au même millésime et au même kilométrage. Le contrôle check_pop ne regarde que les
  // couples populaire/normale : celui-ci regarde toutes les finitions, deux à deux.
  // RESTREINT AUX FINITIONS RÉELLEMENT AU CATALOGUE AU MILLÉSIME TESTÉ. Sans cette restriction,
  // le contrôle compare des voitures qui ne se vendaient pas la même année — une CR-V 2.4 L de
  // 2016 « évaluée » en MEC 2022 — et crie à l'inversion sur une extrapolation que personne ne
  // ferait. Ma première version signalait ainsi 36 inversions dont la quasi-totalité étaient des
  // artefacts de ce genre.
  console.log('\n══ Inversions entre finitions au catalogue le même millésime, tous modèles Honda');
  let n = 0;
  for (const mo of Object.keys(win.DB.Honda)) {
    const fins = win.DB.Honda[mo];
    for (const an of [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]) {
      setFY(an);
      const vals = [];
      for (const f of fins) {
        const h = win.tarifsCatalogue(f);
        if (!h.length) continue;
        // Au catalogue cette année-là, à un an de tolérance en fin de série (un véhicule se
        // vend encore quelques mois après son dernier tarif).
        if (an < win.yOf(h[0].d) || an > win.yOf(h[h.length - 1].d) + 1) continue;
        const r = win.computeVV(f, 100000, 'normal', 'particulier', null, CY, null, 'aucun');
        if (r) vals.push({ v: f.v, vv: r.vv, ven: r.ven.VEN });
      }
      // Le repère est la VALEUR À NEUF RETENUE PAR LE CALCUL (r.ven.VEN), pas le dernier tarif de
      // la série. Avec le dernier tarif, une finition dont la série traverse deux générations est
      // créditée du prix de la génération suivante, et le contrôle croit voir une inversion là où
      // il n'y a qu'une étiquette réutilisée : c'est ce qui faisait sortir quatre faux positifs
      // sur la CR-V, tous sur « 1.5 T CVT » comparée à « 1.5 T CVT EX ».
      for (let i = 0; i < vals.length; i++) for (let j = 0; j < vals.length; j++) {
        if (vals[i].ven > vals[j].ven * 1.02 && vals[i].vv < vals[j].vv * 0.99) {
          console.log('   ' + mo + ' · MEC ' + an + ' : « ' + vals[i].v + ' » (valeur à neuf ' + dt(vals[i].ven) +
            ') → ' + dt(vals[i].vv) + '  SOUS  « ' + vals[j].v + ' » (valeur à neuf ' + dt(vals[j].ven) + ') → ' + dt(vals[j].vv));
          n++;
        }
      }
    }
  }
  console.log('   ' + (n ? n + ' inversion(s) de finition' : 'aucune inversion de finition'));

  // ── 4. Séries interrompues chez Honda ──
  // Un trou de plus de deux ans dans une série, c'est presque toujours un changement de
  // génération non déclaré — et la méthode B s'ancre alors sur le mauvais véhicule.
  console.log('\n══ Trous de plus de deux ans dans une série Honda');
  let t = 0;
  for (const mo of Object.keys(win.DB.Honda)) for (const f of win.DB.Honda[mo]) {
    const h = win.tarifsCatalogue(f);
    for (let i = 1; i < h.length; i++) {
      const a0 = win.yOf(h[i - 1].d), a1 = win.yOf(h[i].d);
      if (a1 - a0 >= 2) {
        console.log('   ' + (mo + ' · ' + f.v).padEnd(40) + h[i - 1].d + ' (' + h[i - 1].p + ')  →  ' +
          h[i].d + ' (' + h[i].p + ')   ' + ((h[i].p / h[i - 1].p - 1) * 100).toFixed(1) + ' %');
        t++;
      }
    }
  }
  console.log('   ' + (t ? t + ' trou(s)' : 'aucun trou'));
}, 900);
