const { JSDOM } = require('jsdom');
const fs = require('fs');

// index.html + data.js fusionnés pour le test
const app = fs.readFileSync('index.html', 'utf8');
const cssBat = app;
const data = fs.readFileSync('data.js', 'utf8');
const html = app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>');

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.com/app.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

let fails = 0;
function check(label, cond, detail) {
  console.log((cond ? '  ok   ' : '  FAIL ') + label + (detail ? '  [' + detail + ']' : ''));
  if (!cond) fails++;
}

function setFY(y) {
  const el = doc.getElementById('mecIn');
  el.value = String(y);
  el.dispatchEvent(new win.Event('input'));
}

setTimeout(() => {
  try {
    // Finition essence avec un prix récent, pour des tests lisibles
    let sample = null;
    for (const b of Object.keys(win.DB)) {
      for (const m of Object.keys(win.DB[b])) {
        for (const f of win.DB[b][m]) {
          const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
          if (fc === 'essence' && win.yOf(f.d) >= 2025 && !sample) sample = { b, m, f };
        }
      }
    }
    const v = sample.f;
    console.log('Échantillon :', sample.b, sample.m, sample.f.v, '| prix', v.p, 'en', win.yOf(v.d), '\n');

    // ── 1. Ordre par usage, à kilométrage et âge identiques ──
    console.log('1. Ordre par usage (âge 6 ans, 90 000 km, état normal) :');
    setFY(2020);
    const KM = 90000;
    const u = ['particulier', 'pro', 'location', 'taxi'].map(k => win.computeVV(v, KM, 'normal', k));
    u.forEach((r, i) => console.log('   ' + r.usage.label.padEnd(22) + String(r.vv).padStart(8) + ' DT   (F_usage ×' + r.fUsage.toFixed(2) + ', F_km ×' + r.fKm.toFixed(3) + ')'));
    check('particulier > société > location > taxi', u[0].vv > u[1].vv && u[1].vv > u[2].vv && u[2].vv > u[3].vv);
    check('F_km identique pour tous les usages (plus de double comptage)',
      new Set(u.map(r => r.fKm.toFixed(6))).size === 1, 'F_km=' + u[0].fKm.toFixed(3));

    // ── 2. Un taxi très roulé doit être pénalisé DEUX fois (km + usage) ──
    console.log('\n2. Effet du kilométrage réel (âge 6 ans) :');
    const taxiHigh = win.computeVV(v, 400000, 'normal', 'taxi');
    const partLow = win.computeVV(v, 60000, 'normal', 'particulier');
    console.log('   taxi 400 000 km      ' + String(taxiHigh.vv).padStart(8) + ' DT  (F_km ×' + taxiHigh.fKm.toFixed(3) + ' × F_usage ×' + taxiHigh.fUsage.toFixed(2) + ')');
    console.log('   particulier 60 000 km' + String(partLow.vv).padStart(8) + ' DT  (F_km ×' + partLow.fKm.toFixed(3) + ')');
    check('taxi très roulé nettement sous particulier peu roulé', taxiHigh.vv < partLow.vv * 0.7);
    check('malus km plafonné à -45%', taxiHigh.fKm >= 0.55 - 1e-9);

    // ── 3. F_âge géométrique : doit continuer à décroître au-delà de 9 ans ──
    console.log('\n3. Dépréciation par âge (100 000 km, normal, particulier) :');
    const ages = [2026, 2024, 2021, 2016, 2011];
    const vals = ages.map(y => { setFY(y); return { y, r: win.computeVV(v, 100000, 'normal', 'particulier') }; });
    vals.forEach(x => console.log('   MEC ' + x.y + ' (' + String(x.r.age).padStart(2) + ' ans)  F_âge ×' + x.r.fAge.toFixed(3) + '   ' + String(x.r.vv).padStart(8) + ' DT'));
    check('valeur strictement décroissante avec l\'âge',
      vals.every((x, i) => i === 0 || x.r.vv < vals[i - 1].r.vv));
    check('un véhicule de 15 ans vaut moins qu\'un de 10 ans (l\'ancien plafond les égalisait)',
      vals[4].r.fAge < vals[3].r.fAge);

    // ── 4. État ──
    console.log('\n4. État (âge 6 ans, 90 000 km, particulier) :');
    setFY(2020);
    const etats = ['mauvais', 'moyen', 'normal', 'bon', 'tresbon'].map(k => win.computeVV(v, KM, k, 'particulier'));
    etats.forEach(r => console.log('   ' + r.etat.label.padEnd(10) + String(r.vv).padStart(8) + ' DT'));
    check('valeur croissante avec l\'état', etats.every((r, i) => i === 0 || r.vv > etats[i - 1].vv));

    // ── 5. Indice auto vs IPC sur la VEN ──
    console.log('\n5. Valeur à neuf actualisée (indice auto mesuré vs IPC général) :');
    let old = null;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
      if (win.yOf(f.d) === 2012 && !old) old = { b, m, f };
    }
    if (old) {
      const ven = win.computeVEN(old.f);
      const cpi = 2.142; // cumul IPC 2012->2026 (ancienne méthode)
      console.log('   ' + old.b + ' ' + old.f.v + ' : ' + old.f.p + ' DT en 2012');
      console.log('   indice auto mesuré ×' + ven.idx.toFixed(3) + ' => ' + Math.round(ven.VEN) + ' DT');
      console.log('   ancienne méthode IPC ×' + cpi.toFixed(3) + ' => ' + Math.round(old.f.p * cpi) + ' DT');
      check('l\'indice auto donne une valeur à neuf plus basse que l\'IPC', ven.idx < cpi);
    }

    // ── 6. Réforme fiscale 2026 : mesurée, pas ré-appliquée ──
    console.log('\n6. Réforme fiscale 2026 (hybrides rechargeables) :');
    let phevOld = null, phev2026 = null;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
      const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
      if (fc !== 'phev') continue;
      if (win.yOf(f.d) < 2026 && !phevOld) phevOld = { b, m, f };
      if (win.yOf(f.d) >= 2026 && !phev2026) phev2026 = { b, m, f };
    }
    if (phevOld) {
      const ven = win.computeVEN(phevOld.f);
      console.log('   prix 2023 : ' + phevOld.b + ' ' + phevOld.f.v + '  ' + phevOld.f.p + ' -> VEN ' + Math.round(ven.VEN) + ' (×' + ven.idx.toFixed(3) + ')');
      check('baisse 2026 appliquée à un PHEV encore tarifé avant la réforme', ven.idx < 0.85, 'idx=' + ven.idx.toFixed(3));
      check('réforme détectée automatiquement, par divergence au marché',
        !!ven.reforme && ven.reforme.fc === 'phev' && Math.abs(ven.reforme.divergence) >= 0.05,
        ven.reforme && (ven.reforme.divergence * 100).toFixed(1) + ' pts en ' + ven.reforme.annee);
    }
    if (phev2026) {
      const ven = win.computeVEN(phev2026.f);
      console.log('   prix 2026 : ' + phev2026.b + ' ' + phev2026.f.v + '  ' + phev2026.f.p + ' -> VEN ' + Math.round(ven.VEN));
      check('PHEV déjà tarifé 2026 : aucune baisse ré-appliquée', Math.abs(ven.idx - 1) < 1e-9 && ven.reforme === null);
    }

    // ── 7. Cohérence indicateur de cotation ──
    console.log('\n7. Indicateur de cotation :');
    setFY(2020);
    const r7 = win.computeVV(v, KM, 'normal', 'particulier');
    check('pourcentage affiché = VV / valeur à neuf',
      Math.abs(r7.ratio * 100 - (r7.vv / r7.ven.VEN * 100)) < 0.5,
      'ratio=' + (r7.ratio * 100).toFixed(1) + '% vs vv/VEN=' + (r7.vv / r7.ven.VEN * 100).toFixed(1) + '%');
    check('le libellé porte sur la position relative à l\'âge, pas sur l\'âge lui-même',
      win.coteInfo(1.15).label === 'Bien coté pour son âge' &&
      win.coteInfo(1.00).label === 'Conforme à son âge' &&
      win.coteInfo(0.70).label === 'Décoté pour son âge');
    const neuf = win.computeVV(v, KM, 'normal', 'particulier');
    check('un véhicule standard est dit conforme quel que soit son âge',
      win.coteInfo(neuf.relatif).label === 'Conforme à son âge', 'relatif=' + neuf.relatif.toFixed(3));
    check('la gamme est déterminée et exposée', !!neuf.gamme && neuf.gamme.tauxDeprAn > 0, neuf.gamme && neuf.gamme.nom);

    // ── 8. Cas limites ──
    console.log('\n8. Cas limites :');
    setFY(2026);
    const rNew = win.computeVV(v, 0, 'normal', 'particulier');
    check('véhicule neuf (âge 0) : pas de division par zéro, F_km neutre', rNew.fKm === 1 && isFinite(rNew.vv), 'vv=' + rNew.vv);
    setFY(2020);
    check('kilométrage non renseigné accepté', win.computeVV(v, null, 'normal', 'particulier').fKm === 1);
    check('kilométrage 0 sur véhicule ancien : bonus plafonné, pas de valeur absurde',
      win.computeVV(v, 0, 'normal', 'particulier').fKm <= 1.15 + 1e-9);
    doc.getElementById('mecClr').click();
    check('sans année de MEC, aucun calcul', win.computeVV(v, KM, 'normal', 'particulier') === null);

    // ── 9. Parcours complet dans l'interface ──
    console.log('\n9. Parcours complet dans l\'interface :');
    doc.getElementById('listB').children[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    doc.getElementById('listM').children[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    doc.getElementById('listV').children[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    check('sans MEC : invitation à saisir l\'année affichée', !!doc.getElementById('vvAskMec'));
    check('classe tablette posée sur la grille', doc.querySelector('.main').classList.contains('with-result'));
    check('bouton retour à la sélection présent', !!doc.querySelector('.back-to-sel'));
    setFY(2019);
    check('champs du module présents une fois la MEC saisie',
      !!doc.getElementById('vvKm') && !!doc.getElementById('vvEtat') && !!doc.getElementById('vvUsage'));
    const kmField = doc.getElementById('vvKm');
    kmField.value = '120000';
    kmField.dispatchEvent(new win.Event('input', { bubbles: true }));
    const out1 = doc.getElementById('vvOut').textContent;
    // Assertion volontairement peu sensible au libellé : on vérifie qu'un montant et
    // l'indicateur sont bien rendus, pas la formulation exacte (qui a déjà cassé ce test).
    check('résultat recalculé à la saisie', /\bDT\b/.test(out1) && /norme de son âge/.test(out1));
    const usageSel = doc.getElementById('vvUsage');
    usageSel.value = 'taxi';
    usageSel.dispatchEvent(new win.Event('change', { bubbles: true }));
    check('changement d\'usage pris en compte', doc.getElementById('vvOut').textContent !== out1);
    const others = doc.querySelectorAll('.or');
    if (others.length) {
      others[0].dispatchEvent(new win.Event('click', { bubbles: true }));
      check('saisies conservées en changeant de finition',
        doc.getElementById('vvKm').value === '120000' && doc.getElementById('vvUsage').value === 'taxi');
    }
    doc.getElementById('mecClr').click();
    // ── 10. Curseur de cotation réglable ──
    console.log('\n10. Curseur de cotation réglable :');
    setFY(2018);
    // La section précédente a laissé l'usage sur « taxi » : on repart d'un état connu,
    // sinon on compare le curseur à un conseil calculé pour un autre usage.
    const us10 = doc.getElementById('vvUsage');
    us10.value = 'particulier'; us10.dispatchEvent(new win.Event('change', { bubbles: true }));
    const km10 = doc.getElementById('vvKm'); km10.value = '90000';
    km10.dispatchEvent(new win.Event('input', { bubbles: true }));
    const slider = doc.getElementById('vvCote');
    check('le curseur est présent et accessible (input range natif)',
      !!slider && slider.type === 'range' && !!slider.getAttribute('aria-label'));
    const prixInitial = doc.getElementById('vvPrix').textContent;
    const posConseil = parseFloat(slider.value);
    check('le curseur démarre sur la valeur conseillée par le calcul',
      Math.abs(posConseil - win.computeVV(v, 90000, 'normal', 'particulier').relatif) < 0.001,
      'position=' + posConseil.toFixed(3));
    check('le repère du conseil est posé', !!doc.getElementById('vvCoteRef'));
    check('aucun bouton de retour au conseil tant que rien n\'est ajusté',
      doc.getElementById('vvCoteReset').hidden === true);

    // Déplacement vers la droite : le véhicule est jugé mieux coté que la norme
    slider.value = String(Math.min(1.25, posConseil + 0.15));
    slider.dispatchEvent(new win.Event('input', { bubbles: true }));
    const prixHaut = doc.getElementById('vvPrix').textContent;
    check('déplacer le curseur à droite augmente la valeur vénale', prixHaut !== prixInitial,
      prixInitial + ' -> ' + prixHaut);
    check('l\'ajustement manuel est signalé', /ajust/i.test(doc.getElementById('vvCoteNote').textContent));
    check('le bouton de retour au conseil apparaît', doc.getElementById('vvCoteReset').hidden === false);
    check('le curseur n\'est pas reconstruit pendant le réglage (le glissement ne se coupe pas)',
      doc.getElementById('vvCote') === slider);

    // Déplacement vers la gauche
    slider.value = String(Math.max(0.50, posConseil - 0.15));
    slider.dispatchEvent(new win.Event('input', { bubbles: true }));
    const prixBas = doc.getElementById('vvPrix').textContent;
    const n = x => parseFloat(x.replace(/[^0-9]/g, ''));
    check('déplacer le curseur à gauche diminue la valeur vénale', n(prixBas) < n(prixHaut),
      prixHaut + ' -> ' + prixBas);

    // Retour au conseil
    doc.getElementById('vvCoteReset').dispatchEvent(new win.Event('click', { bubbles: true }));
    check('le retour au conseil restaure la valeur calculée',
      doc.getElementById('vvPrix').textContent === prixInitial);

    // Changer un champ doit repartir du nouveau conseil, pas d'un ajustement périmé
    const s2 = doc.getElementById('vvCote');
    s2.value = String(Math.min(1.25, posConseil + 0.12));
    s2.dispatchEvent(new win.Event('input', { bubbles: true }));
    const etat10 = doc.getElementById('vvEtat');
    etat10.value = 'bon'; etat10.dispatchEvent(new win.Event('change', { bubbles: true }));
    const s3 = doc.getElementById('vvCote');
    check('modifier l\'état remet le curseur sur le nouveau conseil',
      Math.abs(parseFloat(s3.value) - win.computeVV(v, 90000, 'bon', 'particulier').relatif) < 0.001 &&
      doc.getElementById('vvCoteReset').hidden === true);

    // ── 11. Évaluation à une année antérieure ──
    console.log('\n11. Évaluation à une année antérieure :');
    const CYnow = win.eval('CY');
    setFY(2016);
    const rAuj = win.computeVV(v, 120000, 'normal', 'particulier', null, null);
    const rPasse = win.computeVV(v, 120000, 'normal', 'particulier', null, CYnow - 4);
    console.log('   évaluation ' + CYnow + ' : ' + rAuj.age + ' ans, ' + rAuj.vv.toLocaleString('fr-FR') + ' DT');
    console.log('   évaluation ' + (CYnow - 4) + ' : ' + rPasse.age + ' ans, ' + rPasse.vv.toLocaleString('fr-FR') + ' DT');
    check('par défaut, le calcul se fait à l\'année courante', rAuj.anneeEval === CYnow);
    check('l\'âge se compte à la date d\'évaluation', rPasse.age === rAuj.age - 4);
    check('un véhicule valait plus cher 4 ans plus tôt', rPasse.vv > rAuj.vv);

    // Point critique : une réforme fiscale postérieure ne doit PAS s'appliquer
    let phevAncien = null;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
      const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
      if (fc === 'phev' && win.yOf(f.d) < 2026 && !phevAncien) phevAncien = f;
    }
    if (phevAncien) {
      const venApres = win.computeVEN(phevAncien, 2022, 2026);
      const venAvant = win.computeVEN(phevAncien, 2022, 2024);
      console.log('   PHEV évalué en 2026 : VEN ' + Math.round(venApres.VEN).toLocaleString('fr-FR') +
        ' | évalué en 2024 : ' + Math.round(venAvant.VEN).toLocaleString('fr-FR'));
      check('la réforme fiscale 2026 s\'applique à une évaluation 2026', !!venApres.reforme);
      check('elle ne s\'applique PAS à une évaluation 2024', venAvant.reforme === null);
      check('la valeur à neuf 2024 est donc supérieure à celle de 2026', venAvant.VEN > venApres.VEN);
    }

    // Évaluation antérieure au prix catalogue retenu : on déflate au lieu d'actualiser
    let recent = null;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
      if (!recent && win.yOf(f.d0) >= 2023) recent = f;
    }
    if (recent) {
      const M = win.yOf(recent.d);
      const vRetro = win.computeVEN(recent, M, M - 2);
      check('évaluation antérieure au prix catalogue : déflation, pas actualisation',
        isFinite(vRetro.VEN) && vRetro.VEN > 0 && vRetro.idx !== 1,
        'multiplicateur ×' + vRetro.idx.toFixed(3));
    }

    // Interface : le champ existe, il est borné, et il modifie le résultat
    setFY(2016);
    const km11 = doc.getElementById('vvKm'); km11.value = '120000';
    km11.dispatchEvent(new win.Event('input', { bubbles: true }));
    const selAnnee = doc.getElementById('vvAnnee');
    check('le champ année d\'évaluation est présent', !!selAnnee);
    check('il est sur l\'année courante par défaut', parseInt(selAnnee.value) === CYnow);
    check('il ne propose pas d\'année antérieure à la mise en circulation',
      Math.min(...[...selAnnee.options].map(o => parseInt(o.value))) === 2016);
    const prixAvant = doc.getElementById('vvPrix').textContent;
    selAnnee.value = String(CYnow - 4);
    selAnnee.dispatchEvent(new win.Event('change', { bubbles: true }));
    check('changer l\'année recalcule la valeur', doc.getElementById('vvPrix').textContent !== prixAvant,
      prixAvant + ' -> ' + doc.getElementById('vvPrix').textContent);
    check('l\'évaluation à une date passée est signalée',
      /Évaluation au/.test(doc.getElementById('vvNotices').textContent));
    // L'en-tête n'est pas reconstruit quand l'année change : il doit tout de même suivre.
    check('la pastille d\'année passe en état « date antérieure »',
      doc.querySelector('#vvSect .vv-annee').classList.contains('passe'));
    check('le rappel sur le kilométrage à la date d\'évaluation apparaît',
      doc.getElementById('vvAnneeRappel').hidden === false);
    selAnnee.value = String(CYnow);
    selAnnee.dispatchEvent(new win.Event('change', { bubbles: true }));
    check('retour à l\'année courante : l\'en-tête redevient neutre',
      !doc.querySelector('#vvSect .vv-annee').classList.contains('passe') &&
      doc.getElementById('vvAnneeRappel').hidden === true);

    // ── 12. Véhicules populaires ──
    console.log('\n12. Véhicules populaires (exonération douanière) :');
    let pop = null, popMod = null, normale = null;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) {
      if (/populaire$/i.test(m) && !pop) {
        const base = m.replace(/\s*populaire$/i, '');
        if (win.DB[b][base]) { pop = win.DB[b][m][0]; popMod = m; normale = win.DB[b][base][0]; }
      }
    }
    check('les finitions populaires sont repérées', !!pop && pop.pop === true, popMod);
    const nonPop = win.DB[Object.keys(win.DB)[0]];
    let unePasPop = null;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m])
      if (!unePasPop && !/populaire/i.test(m) && !/populaire/i.test(f.v)) unePasPop = f;
    check('les autres ne le sont pas', unePasPop.pop === false);

    if (pop) {
      const M = win.yOf(pop.d);
      // Moins de 2 ans : incessible, pas de majoration
      const jeune = win.computeVEN(pop, M, M + 1);
      // Au-delà : majoration douanière
      const mur = win.computeVEN(pop, M, M + 5);
      console.log('   ' + popMod + ' — MEC ' + M);
      console.log('   évalué à ' + (M + 1) + ' (1 an)  : ' + Math.round(jeune.VEN).toLocaleString('fr-FR') + ' DT · ' + jeune.popStatut);
      console.log('   évalué à ' + (M + 5) + ' (5 ans) : ' + Math.round(mur.VEN).toLocaleString('fr-FR') + ' DT · ' + mur.popStatut);
      check('avant 2 ans : incessible, valeur à neuf non majorée',
        jeune.popStatut === 'incessible' && jeune.majPop === 1);
      check('après 2 ans : taxe douanière réintégrée',
        mur.popStatut === 'majore' && Math.abs(mur.majPop - 1.30) < 1e-9);
      const seuil2 = win.computeVEN(pop, M, M + 2);
      check('la bascule se fait bien à 2 ans révolus', seuil2.popStatut === 'majore');

      // Effet sur la valeur vénale
      setFY(M);
      const vvJeune = win.computeVV(pop, 20000, 'normal', 'particulier', null, M + 1);
      const vvMur = win.computeVV(pop, 20000, 'normal', 'particulier', null, M + 3);
      console.log('   valeur vénale à 1 an : ' + vvJeune.vv.toLocaleString('fr-FR') +
        ' DT | à 3 ans : ' + vvMur.vv.toLocaleString('fr-FR') + ' DT');
      check('la majoration remonte bien jusqu\'à la valeur vénale', vvMur.ven.majPop > 1);
    }
    // Un véhicule non populaire n'est jamais majoré
    const venNormal = win.computeVEN(unePasPop, 2018, 2026);
    check('un véhicule normal n\'est pas majoré', venNormal.majPop === 1 && venNormal.popStatut === null);

    // ── 12 bis. Une populaire ne peut pas valoir plus que sa jumelle normale ──
    // Règle métier (Yassine) : à paramètres identiques, populaire et normale doivent tomber
    // au même niveau, la populaire pouvant à la rigueur être en dessous — jamais au-dessus.
    // Le cas qui a révélé le défaut : Chery QQ 2016, +30 % sur le prix subventionné (18 760)
    // donnaient 24 388, au-dessus du catalogue réel de la version normale (22 900).
    let nCouples = 0, nViol = 0, nEgal = 0, pire = null;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
      if (!f.pop || !f.popJum) continue;
      for (let mec = 2012; mec <= 2024; mec += 2) {
        setFY(mec);
        const rp = win.computeVV(f, 120000, 'normal', 'particulier', null, 2026);
        if (!rp) continue;
        const dispo = f.popJum.filter(x => win.yOf(x.d0) <= mec && mec <= win.yOf(x.d) + 1);
        const pool = dispo.length ? dispo : f.popJum;
        let best = null;
        for (const x of pool) {
          const r = win.computeVV(x, 120000, 'normal', 'particulier', null, 2026);
          if (r && (best === null || r.vv < best.vv)) best = r;
        }
        if (!best) continue;
        nCouples++;
        const d = rp.vv - best.vv;
        if (d > 0) { nViol++; if (!pire || d > pire.d) pire = { m, mec, pop: rp.vv, norm: best.vv, d }; }
        else if (d === 0) nEgal++;
      }
    }
    console.log('   ' + nCouples + ' couples populaire/normale comparés — ' + nEgal + ' à égalité, ' +
      (nCouples - nEgal - nViol) + ' en dessous');
    check('aucune populaire au-dessus de sa jumelle normale', nViol === 0,
      pire ? pire.m + ' MEC ' + pire.mec + ' : ' + pire.pop + ' vs ' + pire.norm : String(nCouples) + ' couples');
    check('la règle mord réellement (des cas plafonnés existent)', nEgal > 0, nEgal + ' à égalité');

    // Le cas nommé par Yassine, vérifié pour lui-même
    if (win.DB.Chery && win.DB.Chery['Chery QQ'] && win.DB.Chery['Chery QQ Populaire']) {
      setFY(2016);
      const par = [125000, 'normal', 'particulier', null, 2026];
      const qqN = win.computeVV(win.DB.Chery['Chery QQ'][0], ...par);
      const qqP = win.computeVV(win.DB.Chery['Chery QQ Populaire'][0], ...par);
      console.log('   Chery QQ 2016 — normale : ' + qqN.vv.toLocaleString('fr-FR') +
        ' DT | populaire : ' + qqP.vv.toLocaleString('fr-FR') + ' DT');
      check('Chery QQ 2016 : la populaire n\'excède pas la normale', qqP.vv <= qqN.vv,
        qqP.vv + ' vs ' + qqN.vv);
      // On teste la RÈGLE (la populaire ne dépasse pas), pas le mécanisme : depuis l'enveloppe
      // décroissante des tarifs, l'ancrage suffit souvent et le plafond n'a plus à mordre.
      // Et surtout on teste ce que la réintégration douanière est censée FAIRE : RESSERRER
      // l'écart de valeur vénale par rapport à l'écart des tarifs catalogue. Un seuil en dur
      // ne dirait rien — celui-ci se recalcule sur la base à chaque exécution.
      const pN16 = win.DB.Chery['Chery QQ'][0].hist.filter(h => win.yOf(h.d) === 2016).pop();
      const pP16 = win.DB.Chery['Chery QQ Populaire'][0].hist.filter(h => win.yOf(h.d) === 2016).pop();
      const ecartCat = pP16.p / pN16.p - 1;
      const ecartVV = qqP.vv / qqN.vv - 1;
      check('Chery QQ 2016 : la majoration resserre bien l\'écart au catalogue',
        Math.abs(ecartVV) < Math.abs(ecartCat),
        'catalogue ' + (ecartCat * 100).toFixed(1) + ' % → valeur vénale ' + (ecartVV * 100).toFixed(1) + ' %');
      check('Chery QQ 2016 : même gamme des deux côtés', qqP.gamme.nom === qqN.gamme.nom);
    }

    doc.getElementById('mecClr').click();
    check('effacement de la MEC : retour à l\'invitation, sans erreur', !!doc.getElementById('vvAskMec'));

    // ── 12 ter. Plafond « prix neuf du jour » ──
    // Une valeur vénale ne peut jamais dépasser le prix auquel le véhicule se remplace
    // aujourd'hui à l'état neuf. Le cas signalé par Yassine (Chery Tiggo 4 Pro) venait d'un
    // tarif catalogue en BAISSE : la valeur actualisée depuis un ancrage ancien passait
    // au-dessus du prix du jour. Deux plafonds : sur la VEN, puis sur le résultat.
    console.log('\n12 ter. Plafond « prix neuf du jour » :');
    // Le balayage exhaustif (5 400 cas) est fait par check_neuf.js ; ici on garde un
    // échantillon rapide plus le cas d'origine, pour que la suite reste utilisable.
    {
      const ech = [];
      for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b]))
        if (ech.length < 60) ech.push(win.DB[b][m][0]);
      let total = 0, plafonnes = 0, depassements = 0;
      for (const f of ech) {
        const pn = win.prixNeufCourant(f, 2026);
        const mec = win.yOf(f.d0);
        if (pn == null || !mec || mec < 2015) continue;
        setFY(mec);
        for (const e of ['normal', 'tresbon']) {
          const r = win.computeVV(f, 1000, e, 'particulier', null, 2026);
          if (!r) continue;
          total++;
          if (r.vvPlafonnee || r.ven.neufPlafonne) plafonnes++;
          // Une populaire au-delà de son délai dépasse LÉGITIMEMENT son prix subventionné :
          // c'est l'objet même de la réintégration douanière.
          if (r.ven.popStatut !== 'majore' && r.vv > pn) depassements++;
        }
      }
      check('aucune valeur vénale au-dessus du prix neuf du jour', depassements === 0,
        total + ' cas · ' + depassements + ' dépassement(s)');
      check('le plafond mord effectivement sur les tarifs en baisse', plafonnes > 0,
        plafonnes + ' cas plafonnés sur ' + total);
      // Le cas d'origine, nommément.
      if (win.DB.Chery && win.DB.Chery['Chery Tiggo 4 Pro']) {
        const tig = win.DB.Chery['Chery Tiggo 4 Pro'][0];
        setFY(win.yOf(tig.d0));
        const pnT = win.prixNeufCourant(tig, 2026);
        const rT = win.computeVV(tig, 500, 'tresbon', 'particulier', null, 2026);
        check('Chery Tiggo 4 Pro : la valeur vénale reste sous le prix neuf du jour', rT.vv <= pnT,
          rT.vv.toLocaleString('fr-FR') + ' ≤ ' + pnT.toLocaleString('fr-FR') + ' DT');
      }
    }

    // ── 10 bis. Le curseur repart du conseil à chaque nouvelle consultation ──
    // Signalé par Yassine : la position réglée à la main sur une consultation était conservée
    // à la suivante, et le curseur s'affichait décalé de son repère de conseil sans raison.
    // Un ajustement ne vaut que pour LE véhicule sur lequel il a été porté.
    console.log('\n10 bis. Retour au conseil à chaque consultation :');
    {
      const VVI = win.eval('vvInputs');
      const curseur = () => doc.getElementById('vvCote');
      const bouger = x => { const s = curseur(); s.value = String(x);
        s.dispatchEvent(new win.Event('input', { bubbles: true })); };
      const choisirFin = i => {
        const f = [...doc.querySelectorAll('#listV > *:not(.le)')];
        if (f[i]) { f[i].click(); return true; }
        return false;
      };
      setFY(2019);
      win.selectBrand('Volkswagen');
      const mods = [...doc.querySelectorAll('#listM .item')];
      const golf = mods.find(x => /Golf/.test(x.textContent));
      if (golf) golf.click();
      if (choisirFin(0) && curseur()) {
        const conseil = parseFloat(curseur().value);
        check('à l\'ouverture, le curseur est sur le conseil', VVI.cote === null);
        bouger(conseil * 0.72);
        check('l\'expert peut le déplacer', VVI.cote !== null && Math.abs(VVI.cote - conseil * 0.72) < 1e-6,
          String(VVI.cote));
        if (choisirFin(1)) {
          check('changer de finition le ramène au conseil', VVI.cote === null,
            VVI.cote === null ? 'conseil' : 'ajustement conservé');
        }
        bouger(parseFloat(curseur().value) * 0.8);
        win.selectBrand('Toyota');
        const cor = [...doc.querySelectorAll('#listM .item')].find(x => /Corolla/.test(x.textContent));
        if (cor) { cor.click(); choisirFin(0); }
        check('changer de modèle le ramène au conseil', VVI.cote === null,
          VVI.cote === null ? 'conseil' : 'ajustement conservé');
        bouger(parseFloat(curseur().value) * 0.8);
        setFY(2015);
        check('changer l\'année de 1ère MEC le ramène au conseil', VVI.cote === null,
          VVI.cote === null ? 'conseil' : 'ajustement conservé');
        // et le curseur doit alors coïncider avec le repère de conseil
        const s = curseur(), ref = doc.getElementById('vvCoteRef');
        const pos = (parseFloat(s.value) - parseFloat(s.min)) / (parseFloat(s.max) - parseFloat(s.min)) * 100;
        const rp = parseFloat(ref.style.left);
        check('curseur et repère de conseil sont superposés', Math.abs(pos - rp) < 0.5,
          pos.toFixed(1) + ' % contre ' + rp.toFixed(1) + ' %');
        // en revanche, ce qui ne change pas de véhicule ne doit pas être perdu par surprise :
        // km, état et usage remettent au conseil parce que LE CONSEIL LUI-MÊME change.
        bouger(parseFloat(s.value) * 0.75);
        const kmF = doc.getElementById('vvKm');
        kmF.value = '150000'; kmF.dispatchEvent(new win.Event('input', { bubbles: true }));
        check('saisir un kilométrage recalcule le conseil et s\'y remet', VVI.cote === null);
      }
      setFY(2019);
    }

    // ── 12 ter ter. Valeur de fin de série : le tarif de SON millésime ──
    // Signalé par Yassine, captures d'archive à l'appui : la fiche affichait le DERNIER tarif
    // de la finition quel que soit le millésime. Une Clio 1.0 SCe Life Plus de 2023 sortait à
    // 64 950 DT (tarif du 06.05.2024) au lieu des 60 900 DT en vigueur en 2023.
    console.log('\n12 ter ter. Valeur de fin de série du millésime :');
    {
      // Les sept valeurs relevées sur web.archive.org par Yassine. Elles font foi.
      const releves = [
        ['Renault', 'Renault Clio', '1.0 L SCe Life Plus', 2023, 60900, '24.04.2024'],
        ['Skoda', 'Skoda Kushaq', '1.0 TSI Style BVA', 2026, 92980, '17.04.2026'],
        ['MG', 'MG 5', '1.5 L Confort', 2024, 63950, '07.09.2024'],
        ['MG', 'MG 5', '1.5 L Confort Plus', 2024, 67450, '07.09.2024'],
        ['MG', 'MG 5', '1.5 L Luxe BVA', 2024, 71950, '07.09.2024'],
        ['Volkswagen', 'Volkswagen Polo Sedan', '1.4 L Highline', 2022, 72980, '26.10.2022'],
        ['Skoda', 'Skoda Kamiq', '1.0 L TSI Style DSG', 2023, 96980, '18.07.2023'],
      ];
      const esp = t => t.replace(/[\u202f\u00a0\u2009]/g, ' ');
      for (const [b, m, vn, an, attendu, cap] of releves) {
        const v = win.DB[b] && win.DB[b][m] && win.DB[b][m].find(x => x.v === vn);
        check('la finition existe : ' + m + ' · ' + vn, !!v);
        if (!v) continue;
        check(m.replace(/^\w+ /, '') + ' ' + an + ' : tarif du millésime conforme à la capture du ' + cap,
          win.tarifMillesime(v, an).p === attendu,
          win.tarifMillesime(v, an).p + ' contre ' + attendu);
        const aff = esp(win.blocPrix(v, m, an));
        check('…et c\'est bien lui qui s\'affiche',
          aff.indexOf(attendu.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')) !== -1);
      }
      // La convention : dans une année à plusieurs relevés, c'est le DERNIER qui fait foi.
      const clio = win.DB.Renault['Renault Clio'].find(x => x.v === '1.0 L SCe Life Plus');
      check('dans une année à plusieurs tarifs, le dernier fait foi',
        win.tarifMillesime(clio, 2022).p === 56950, win.tarifMillesime(clio, 2022).p + ' DT');
      // Sans relevé l'année du véhicule, on reprend le dernier tarif antérieur, jamais le suivant.
      const luxe = win.DB.MG['MG 5'].find(x => x.v === '1.5 L Luxe BVA');
      check('sans relevé l\'année du véhicule, on reprend le dernier tarif antérieur',
        win.tarifMillesime(luxe, 2022).p === 74800, win.tarifMillesime(luxe, 2022).p + ' DT');
      // Sans millésime saisi, c'est le dernier tarif de la finition qui s'affiche — 60 900 DT
      // depuis que les 64 950 DT du 06.05.2024, qui appartenaient à la TCe 100 Evolution, ont
      // été retirés de la Life Plus.
      check('sans millésime saisi, le dernier tarif de la finition s\'affiche',
        esp(win.blocPrix(clio, 'Renault Clio', null)).indexOf('60 900') !== -1);

      // ── Les prix promotionnels ne sont pas des tarifs ──
      // automobile.tn affiche la promo avec le tarif catalogue barré ; la base ne retient que
      // le prix affiché. Un creux qui revient EXACTEMENT à sa valeur antérieure est une promo.
      const kushaq = win.DB.Skoda['Skoda Kushaq'].find(x => x.v === '1.0 TSI Style BVA');
      check('le prix promotionnel est écarté des tarifs catalogue',
        win.tarifsCatalogue(kushaq).every(h => h.p !== 90980)
        && kushaq.hist.some(h => h.p === 90980),
        kushaq.hist.length + ' relevés → ' + win.tarifsCatalogue(kushaq).length + ' tarifs');
      check('la valeur à neuf 2026 est donc le tarif catalogue, pas la promo',
        win.tarifMillesime(kushaq, 2026).p === 92980);
      // …mais une vraie baisse durable, elle, est conservée.
      const pop = win.DB.Chery['Chery QQ Populaire'][0];
      check('une baisse de tarif durable n\'est pas prise pour une promotion',
        win.tarifsCatalogue(pop).some(h => h.p === 19990));

      // ── LA VALEUR À NEUF : tarif du jour, ou valeur de fin de série ──
      // Règle posée par Yassine : « la valeur à neuf à afficher est soit la valeur actuelle,
      // soit la valeur de fin de série de la finition du modèle en question ». La fiche
      // mettait en avant le tarif du MILLÉSIME — 34 100 DT pour une Symbol 1.2 Confort de
      // 2017, soit un prix de 2017 en dinars de 2017 — alors que le calcul part de la valeur
      // actualisée. Elle annonçait donc 34 100 DT pour une valeur vénale de 32 900.
      {
        const esp = t => t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
          .replace(/[\u202f\u00a0]/g, ' ');
        const sym = win.DB.Renault['Renault Symbol'].find(x => x.v === '1.2 Confort');
        check('la Symbol 1.2 Confort est bien dans la base', !!sym);
        if (sym) {
          const a17 = esp(win.blocPrix(sym, 'Renault Symbol', 2017));
          check('le montant mis en avant est la valeur de fin de série',
            /price-val|41 900/.test(a17) && a17.indexOf('41 900') < a17.indexOf('34 100'),
            'fin de série 41 900 DT');
          check('…nommée et datée comme telle', /fin de série du 12\.02\.2019/.test(a17));
          check('…et ce n\'est plus le tarif du millésime qui est mis en avant',
            !/tarif catalogue 2017<\/span>/.test(win.blocPrix(sym, 'Renault Symbol', 2017)));
          check('l\'équivalent à neuf actualisé est donné', /Équivalent à neuf 2026/.test(a17));
          check('le tarif d\'achat d\'origine reste lisible, sous son nom',
            /1ère mise en circulation \(2017\)/.test(a17) && /34 100/.test(a17));
          check('la fin de série du modèle est distinguée de celle de la finition',
            /jusqu.au 11\.11\.2020/.test(a17));
          // Sur le millésime qui EST la fin de série, rien ne change : c'est le même montant.
          const a19 = esp(win.blocPrix(sym, 'Renault Symbol', 2019));
          check('un millésime de fin de série donne le même montant', /41 900/.test(a19));
        }
        // Finition encore vendue : c'est le tarif du jour qui fait la valeur à neuf.
        const kush = win.DB.Skoda['Skoda Kushaq'].find(x => x.v === '1.0 TSI Style BVA');
        const ak = esp(win.blocPrix(kush, 'Skoda Kushaq', 2024));
        check('une finition encore au catalogue affiche son tarif du jour',
          /tarif du jour/.test(ak) && /92 980/.test(ak) && !/fin de série/i.test(ak));
        check('…et son tarif d\'achat d\'origine en dessous',
          /1ère mise en circulation \(2024\)/.test(ak) && /89 980/.test(ak));
        // Phase sortante : la valeur à neuf est celle de SA phase, pas de la génération suivante.
        const rav = win.DB.Toyota['Toyota RAV 4 Hybride'][0];
        const ar = esp(win.blocPrix(rav, 'Toyota RAV 4 Hybride', 2022));
        check('une phase sortante prend la fin de série de sa propre phase',
          /184 800/.test(ar) && /fin de série du 04\.03\.2026/.test(ar));
        check('…et surtout pas le tarif de la génération suivante',
          ar.indexOf('204 800') > ar.indexOf('184 800'));
        check('le tarif du millésime 2022 reste donné', /152 000/.test(ar));
      }

      // ── L'indice de prix se calcule sur les TARIFS CATALOGUE ──
      // Défaut resté invisible tant que les corrections vivaient hors de la base : l'indice
      // lisait `f.hist` brut, donc les prix promotionnels et les tarifs mal attribués entraient
      // dans la mesure. Il annonçait un marché en baisse de 4,3 % en 2026 ; sur les tarifs
      // catalogue, il ressort à −0,7 %. La baisse venait des promotions.
      {
        const IX = win.indice();
        check('l\'indice est bien recalculé depuis la base', IX.auto !== false);
        check('2026 : le marché thermique ne s\'effondre pas',
          Math.abs(IX.parEnergie[2026].essence) < 0.02
          && Math.abs(IX.parEnergie[2026].diesel) < 0.02,
          'essence ' + (IX.parEnergie[2026].essence * 100).toFixed(1) + ' % · diesel '
          + (IX.parEnergie[2026].diesel * 100).toFixed(1) + ' %');
        check('mais la refonte fiscale des rechargeables, elle, reste visible',
          IX.parEnergie[2026].phev < -0.15,
          (IX.parEnergie[2026].phev * 100).toFixed(1) + ' %');
        // Le contrôle qui aurait attrapé le défaut : aucun prix écarté ne doit peser sur l'indice.
        const kush = win.DB.Skoda['Skoda Kushaq'].find(x => x.v === '1.0 TSI Style BVA');
        check('un prix promotionnel n\'entre pas dans le calcul de l\'indice',
          kush.hist.some(h => h.p === 90980)
          && win.tarifsCatalogue(kush).every(h => h.p !== 90980));
      }

      // ── Aucune clé de modèle en double dans la table des relevés ──
      // Un objet littéral accepte deux fois la même clé sans broncher : la seconde écrase la
      // première. En injectant le contrôle catalogue du 13.09.2026, le relevé d'archive du
      // Skoda Kamiq a disparu de cette façon, sans la moindre erreur. Le contrôle est donc
      // structurel — il porte sur le TEXTE du fichier, pas sur l'objet une fois construit.
      {
        const i = app.indexOf('const RELEVES_VERIFIES'), j = app.indexOf('function relevesDe');
        const cles = [...app.slice(i, j).matchAll(/^  '([^']+)':/gm)].map(m => m[1]);
        const dbl = cles.filter((x, k) => cles.indexOf(x) !== k);
        check('aucune clé de modèle en double dans les relevés vérifiés', dbl.length === 0,
          cles.length + ' modèles' + (dbl.length ? ' · doublons : ' + dbl.join(', ') : ''));
      }

      // ── Relevés vérifiés sur archive ──
      const RV = win.eval('RELEVES_VERIFIES');
      // Deux formes : un AJOUT porte un prix, un RETRAIT porte un motif. Les deux portent une
      // date et une source — sans quoi la correction n'est pas opposable dans un rapport.
      check('chaque relevé vérifié porte sa date et sa source',
        Object.keys(RV).every(m => Object.keys(RV[m]).every(f => RV[m][f].every(r =>
          /^\d{2}\.\d{2}\.\d{4}$/.test(r.d) && r.source && r.source.length > 10
          && (r.retrait ? (r.motif && r.motif.length > 15) : r.p > 0)))));
      check('un retrait retire bien le tarif de la série',
        win.tarifsCatalogue(win.DB.Renault['Renault Clio']
          .find(x => x.v === '1.0 L SCe Life Plus')).every(h => h.p !== 64950));
      // Les corrections sont désormais PORTÉES DANS data.js, et la table les rejoue. La double
      // application doit être sans effet : un ajout dont la date existe déjà est ignoré, un
      // retrait dont la date est déjà absente aussi. C'est ce qui permet à la table de rester
      // en place comme filet de sécurité si la base est régénérée depuis la source brute.
      const polo = win.DB.Volkswagen['Volkswagen Polo Sedan'].find(x => x.v === '1.4 L Highline');
      const hp = win.tarifsCatalogue(polo);
      check('la correction est dans la base ET rejouée par la table, sans doublon',
        polo.hist.filter(h => h.d === '26.10.2022').length === 1
        && hp.filter(h => h.d === '26.10.2022').length === 1
        && hp[hp.length - 1].p === 72980);
      check('un retrait déjà appliqué dans la base ne casse rien',
        (() => {
          const c = win.DB.Renault['Renault Clio'].find(x => x.v === '1.0 L SCe Life Plus');
          return c.hist.every(h => h.d !== '06.05.2024')
            && win.tarifsCatalogue(c).every(h => h.d !== '06.05.2024')
            && win.tarifsCatalogue(c).length === c.hist.length;
        })());
      check('et la fraîcheur du tarif suit la série corrigée',
        win.yOf(win.derniereDateTarif(polo)) === 2022 && win.yOf(polo.d) === 2022);
      const kamiq = win.DB.Skoda['Skoda Kamiq'].find(x => x.v === '1.0 L TSI Style DSG');
      check('Kamiq : le millésime 2023 est désormais ancré exactement',
        win.yOf(win.derniereDateTarif(kamiq)) === 2023);
      setFY(2023);
      const rk = win.computeVV(kamiq, 80000, 'normal', 'particulier', null, 2026);
      // Méthode B : la valeur à neuf retenue est la FIN DE SÉRIE de la finition — ici le
      // relevé vérifié de 2023, qui n'existait pas dans la base brute.
      check('…et le calcul s\'y ancre', rk.ven.ancre === 'finserie' && rk.ven.M === 2023,
        rk.ven.ancre + ' ' + rk.ven.M);
      setFY(2019);
    }

    // ── 12 ter bis. Changements de phase : une série, deux véhicules ──
    // Signalé par Yassine sur la RAV 4 Hybride : « le prix affiché est celui de la phase
    // actuelle alors qu'elle est différente de la phase qui la précède ». La base suit une
    // finition par son NOM ; quand la génération change sans changer d'intitulé, les deux
    // véhicules se retrouvent dans la même série tarifaire.
    console.log('\n12 ter bis. Changements de phase :');
    {
      const PH = win.eval('PHASES');
      check('une table de phases vérifiées existe', !!PH && typeof PH === 'object');
      check('chaque frontière porte sa date, son motif et sa source',
        Object.keys(PH).every(m => PH[m].every(f => /^\d{2}\.\d{2}\.\d{4}$/.test(f.date)
          && f.motif && f.motif.length > 30 && f.source && f.source.length > 5)),
        Object.keys(PH).join(', '));
      const rav = win.DB.Toyota && win.DB.Toyota['Toyota RAV 4 Hybride'];
      if (rav) {
        const v = rav[0];
        const M = 'Toyota RAV 4 Hybride';
        check('la frontière RAV 4 est bien celle du lancement de la XA60',
          PH[M] && PH[M][0].date === '14.06.2026' && PH[M][0].gen === 'XA60');
        // le tarif du jour de la phase sortante, et non celui de la nouvelle génération
        check('un millésime antérieur est ramené au tarif de SA phase',
          win.prixNeufCourant(v, 2026, 2022) === 184800 && win.prixNeufCourant(v, 2026) === 204800,
          win.prixNeufCourant(v, 2026, 2022) + ' contre ' + win.prixNeufCourant(v, 2026));
        // l'ancrage ne doit jamais aller chercher un tarif de l'autre phase
        for (const y of [2019, 2021, 2022, 2025]) {
          setFY(y);
          const r = win.computeVV(v, 100000, 'normal', 'particulier', null, 2026);
          check('MEC ' + y + ' : la valeur à neuf reste sous le tarif de sa phase',
            r.ven.VEN <= 184800 * 1.001, Math.round(r.ven.VEN) + ' DT');
          check('MEC ' + y + ' : le plafond n\'est pas celui de la génération suivante',
            r.ven.plafondNeuf == null || r.ven.plafondNeuf <= 184800 * 1.001);
        }
        // l'affichage : c'est le défaut visible qui a été signalé
        // toLocaleString('fr-TN') sépare les milliers par une espace insécable étroite :
        // on normalise avant de comparer, sinon indexOf ne trouve jamais rien.
        const esp = t => t.replace(/[\u202f\u00a0\u2009]/g, ' ');
        const sansMec = esp(win.blocPrix(v, M, null));
        const avant = esp(win.blocPrix(v, M, 2022));
        const aCheval = esp(win.blocPrix(v, M, 2026));
        check('sans millésime, le tarif du jour est affiché tel quel',
          sansMec.indexOf('204 800') !== -1 && sansMec.indexOf('Changement de génération') === -1);
        check('avec un millésime antérieur, c\'est le tarif de sa phase qui est mis en avant',
          avant.indexOf('184 800') !== -1 && /Changement de génération/.test(avant));
        check('et le tarif du jour est nommé, pas escamoté', /204\s800/.test(avant));
        check('un millésime à cheval est signalé comme tel, sans trancher',
          /Millésime à cheval/.test(aCheval) && !/Changement de génération/.test(aCheval));
        // et la réserve correspondante
        setFY(2022);
        const rc = win.computeVV(v, 100000, 'normal', 'particulier', null, 2026);
        check('l\'indicateur de confiance signale la phase antérieure',
          win.evaluerConfiance(v, rc).motifs.some(m => /phase antérieure/i.test(m)));
        setFY(2026);
        const rch = win.computeVV(v, 100000, 'normal', 'particulier', null, 2026);
        check('et le millésime à cheval',
          win.evaluerConfiance(v, rch).motifs.some(m => /à cheval/i.test(m)));
      }
      // ── L'avertissement générique, pour les discontinuités non documentées ──
      // Vingt modèles encore au catalogue présentent un saut divergeant du marché ; la
      // recherche n'en a confirmé qu'UN comme changement de génération. Pour les autres on
      // avertit sans corriger : substitution de finition, fin de promotion ou millésime.
      // La Seat Ibiza a quitté cette liste : son « saut » de 2026 était une substitution de
      // gamme, corrigée par un retrait. C'est le résultat attendu — une discontinuité qui
      // disparaît parce que sa cause a été identifiée, pas parce qu'on l'a masquée.
      check('la Seat Ibiza n\'est plus discontinue : la cause a été corrigée',
        (() => {
          const f = win.DB.Seat['Seat Ibiza'].find(x => x.v === '1.0 L TSI Style BVA');
          setFY(2019);
          const r = win.computeVV(f, 120000, 'normal', 'particulier', null, 2026);
          return !win.evaluerConfiance(f, r).motifs.some(x => /saut de tarif/i.test(x));
        })());
      const disc = [['Land Rover', 'Land Rover Defender 110', '3.0 L P400 S'],
                    ['Seat', 'Seat Leon', '1.4 TSI Emotion']];
      for (const [b, m, vn] of disc) {
        if (!win.DB[b] || !win.DB[b][m]) continue;
        const f = win.DB[b][m].find(x => x.v === vn);
        if (!f) continue;
        setFY(2019);
        const r = win.computeVV(f, 120000, 'normal', 'particulier', null, 2026);
        check(m + ' : le saut de tarif est signalé',
          win.evaluerConfiance(f, r).motifs.some(x => /saut de tarif/i.test(x)));
      }
      // …et ne se déclenche pas sur une série régulière
      if (win.DB.Toyota && win.DB.Toyota['Toyota Corolla']) {
        const c = win.DB.Toyota['Toyota Corolla'][0];
        setFY(2019);
        const r = win.computeVV(c, 120000, 'normal', 'particulier', null, 2026);
        check('une série régulière ne déclenche aucun avertissement',
          !win.evaluerConfiance(c, r).motifs.some(x => /saut de tarif/i.test(x)));
      }
      // la détection ne regarde QUE la période qui sépare le millésime de l'évaluation
      if (rav) {
        setFY(2026);
        const r26 = win.computeVV(rav[0], 20000, 'normal', 'particulier', null, 2026);
        check('un saut antérieur au millésime n\'est pas reproché au véhicule',
          !win.evaluerConfiance(rav[0], r26).motifs.some(x => /saut de tarif/i.test(x)));
      }
      setFY(2019);
    }

    // ── 12 quater. Batterie de traction ──
    // Sur un véhicule à batterie, l'état de santé (SOH) est la mesure la plus discriminante
    // entre deux exemplaires de même âge. Piège rencontré : `eg.kwh` est une CHAÎNE avec son
    // unité (« 100kWh ») — toute arithmétique directe donne NaN, silencieusement.
    console.log('\n12 quater. Batterie de traction :');
    let unEV = null;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m])
      if (!unEV && win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant)) === 'elec' && win.kwhDe(f)) unEV = f;
    {
      check('la capacité se lit malgré son unité collée au nombre',
        !!unEV && isFinite(win.kwhDe(unEV)) && win.kwhDe(unEV) > 0,
        unEV ? win.kwhDe(unEV) + ' kWh' : 'aucun VE avec capacité');
      // Norme d'usure : ~2,4 %/an, décroissante et bornée.
      const B = win.eval('VVPARAMS').batterie;
      let mono = true, prev = 2;
      for (let a = 0; a <= 15; a++) { const x = win.sohAttendu(a); if (x > prev) mono = false; prev = x; }
      check('le SOH attendu décroît avec l\'âge', mono);
      check('il reste dans des bornes physiques',
        win.sohAttendu(0) <= 1.001 && win.sohAttendu(20) >= B.sohMin - 1e-9,
        (win.sohAttendu(0) * 100).toFixed(0) + ' % à neuf · ' + (win.sohAttendu(20) * 100).toFixed(0) + ' % à 20 ans');
    }
    if (unEV) {
      setFY(2023);
      const par = [60000, 'normal', 'particulier', null, 2026];
      const sans = win.computeVV(unEV, ...par, null);
      const conforme = win.computeVV(unEV, ...par, win.sohAttendu(3));
      const basse = win.computeVV(unEV, ...par, 0.75);
      const haute = win.computeVV(unEV, ...par, 1.00);
      check('le module batterie s\'active sur un électrique', !!sans.partBat && sans.partBat.part > 0,
        Math.round(sans.partBat.part * 100) + ' % de la valeur');
      // C'est l'écart À LA NORME DE L'ÂGE qui compte, pas le SOH absolu : un SOH conforme
      // ne doit ni pénaliser ni bonifier.
      check('un SOH conforme à l\'âge ne change rien', Math.abs(conforme.fBat - 1) < 0.02,
        '×' + conforme.fBat.toFixed(3));
      check('un SOH dégradé pénalise', basse.vv < conforme.vv, basse.vv + ' < ' + conforme.vv);
      check('un SOH excellent valorise', haute.vv >= conforme.vv, haute.vv + ' ≥ ' + conforme.vv);
      let monoV = true, prevV = -1;
      for (let x = 40; x <= 102; x += 2) { const rr = win.computeVV(unEV, ...par, x / 100); if (rr.vv < prevV) monoV = false; prevV = rr.vv; }
      check('la valeur croît continûment avec le SOH', monoV);
      const morte = win.computeVV(unEV, ...par, 0.001);
      check('une batterie hors service ne produit pas de valeur absurde',
        morte.vv > 0 && morte.vv < conforme.vv, morte.vv.toLocaleString('fr-FR') + ' DT');
      // Décote propre aux véhicules à batterie : la courbe européenne, corrigée du climat.
      const rEV = win.computeVV(unEV, ...par, null);
      check('la décote suit la courbe européenne', !!rEV.baseVE);
      const VE = win.eval('VVPARAMS').ve;
      const attendu = VE.tauxEuropeBrut - VE.baisseNeufAnnuelle + VE.deltaClimatBatterie;
      check('à un taux annuel cohérent avec ses paramètres',
        Math.abs(rEV.tauxDepr - attendu) < 0.01,
        (rEV.tauxDepr * 100).toFixed(1).replace('.', ',') + ' %/an');
    }
    {
      // Une seule définition de « véhicule à batterie », partagée par le formulaire et le
      // calcul : deux listes séparées avaient divergé (panneau affiché sur un hybride simple,
      // sans champ pour le renseigner).
      let incoherences = 0, vus = 0;
      setFY(2023);
      for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
        if (vus >= 60) break;
        const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
        vus++;
        const r = win.computeVV(f, 60000, 'normal', 'particulier', null, 2026, null);
        const champ = win.renderVVBlock(f).indexOf('id="vvSoh"') !== -1;
        if (!!(r && r.partBat) !== champ || win.aBatterie(fc) !== champ) incoherences++;
      }
      check('le panneau batterie et le champ SOH vont toujours ensemble', incoherences === 0,
        vus + ' finitions · ' + incoherences + ' incohérence(s)');
    }

    // ── La plateforme calcule une VALEUR VÉNALE, et rien d'autre ──
    // Rappel de Yassine : « c'est une plateforme pour calculer la valeur vénale, aucune
    // relation avec une indemnité quelconque ». Le module « mise à l'épave », qui ajoutait
    // la taxe douanière de régularisation au montant affiché, a donc été retiré : la taxe
    // est une charge du règlement de sinistre, pas une composante de la valeur du véhicule.
    // Les RÉGIMES restent, eux : ils changent la base de calcul de la valeur vénale.
    console.log('\nAucune composante d\'indemnité dans le résultat :');
    {
      const interdits = ['taxePop', 'vvMarche', 'taxeBase', 'taxeEpave', 'vvEpave', 'vvPoids',
        'vvDtKg', 'vvTaxe', 'vvDecomp', 'epaveCochee', 'poidsSaisi', 'tarifSaisi', 'Indemnité'];
      for (const t of interdits)
        check('« ' + t + " » ne subsiste nulle part", app.indexOf(t) === -1);
      let popX = null;
      for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b]))
        if (/populaire$/i.test(m) && !popX) popX = win.DB[b][m][0];
      if (popX) {
        setFY(win.yOf(popX.d));
        const r = win.computeVV(popX, 15000, 'normal', 'particulier', null, null, null, 'populaire');
        check('le résultat ne porte aucun champ de taxe',
          r.taxePop === undefined && r.vvMarche === undefined && r.taxeBase === undefined);
        check('mais le régime est bien pris en compte', r.ven.regimeKey === 'populaire');
      }
      const vvOut = app.slice(app.indexOf("'<div class=\"vv-resultat\">'"), app.indexOf('const slider='));
      check('le titre du montant est fixe et neutre',
        vvOut.indexOf('Valeur vénale estimée') !== -1 && vvOut.indexOf('id="vvPrixLbl"') === -1);
    }

    // ── Régimes douaniers de faveur, au-delà de la seule voiture populaire ──
    // Le régime est une propriété du VÉHICULE (carte grise), pas du modèle : il se saisit.
    console.log('\nRégimes douaniers de faveur :');
    const RG = win.eval('VVPARAMS').regimes;
    // Le FCR « série TU » a été retiré : il n'existe qu'une immatriculation FCR, RS.
    // Un véhicule passé en TU a acquitté ses droits — c'est du droit commun, pas un régime.
    const attendus = ['aucun', 'populaire', 'fcr_rs', 'diplomatique', 'taxi_louage', 'agence', 'autre'];
    check('le FCR « série TU » n\'est plus proposé', !RG.fcr_partiel);
    check('tous les régimes annoncés sont présents', attendus.every(k => !!RG[k]),
      Object.keys(RG).join(', '));
    check('seule la populaire a un catalogue subventionné',
      Object.keys(RG).filter(k => RG[k].subventionne).join(',') === 'populaire');
    check('la majoration douanière ne s\'applique qu\'au catalogue subventionné',
      Object.keys(RG).every(k => RG[k].majorationDouane === 0 || RG[k].subventionne));
    check('taxi et agence portent la marque d\'un usage intensif',
      RG.taxi_louage.usageIntensif === true && RG.agence.usageIntensif === true);
    check('le diplomatique n\'a aucun délai (véhicule assimilé à un véhicule étranger)',
      RG.diplomatique.incessibilite === 0 && RG.diplomatique.baseHorsDouane === true);
    check('taxi, louage et agence : affectation de 5 ans', 
      RG.taxi_louage.incessibilite === 5 && RG.agence.incessibilite === 5);
    // « Autre régime de faveur » est un fourre-tout volontairement non spécifié : il ne
    // compte pas comme une règle incertaine.
    check('tous les régimes nommés sont confirmés',
      Object.keys(RG).filter(k => k !== 'autre' && k !== 'aucun').every(k => RG[k].sur === true),
      Object.keys(RG).filter(k => RG[k].sur === false).join(',') || 'aucun régime incertain');

    // Un véhicule ordinaire sous FCR : régime saisi, sans majoration du catalogue
    setFY(2023);
    const ordinaire = unePasPop;
    const dc = win.computeVV(ordinaire, 60000, 'normal', 'particulier', null, 2026, null, 'aucun');
    const fcr = win.computeVV(ordinaire, 60000, 'normal', 'particulier', null, 2026, null, 'fcr_rs');
    check('un véhicule ordinaire peut recevoir un régime de faveur',
      fcr.ven.regimeKey === 'fcr_rs' && fcr.ven.regime.court === 'FCR RS');
    // La base de calcul n'est PAS la même : un FCR RS est entré sans droits de douane, sa
    // valeur à neuf est le prix catalogue MOINS ces droits. Il ne subit pas non plus de
    // majoration : le catalogue les contient déjà, c'est bien un abattement qu'il faut.
    check('le FCR RS n\'est jamais majoré', fcr.ven.majPop === 1);
    // L'abattement N'EST PAS le taux douanier : les droits frappent la valeur en douane, pas
    // le prix de détail. Il vient de l'écart MESURÉ au prix européen converti (+15 % médian
    // sur quatre modèles), soit environ 13 %.
    const BR = win.eval('VVPARAMS').baseRegime;
    check('sa valeur à neuf est abattue de l\'écart mesuré au marché européen',
      Math.abs(fcr.ven.abattement - (1 - BR.abattementFranchise)) < 1e-9 &&
      Math.abs(fcr.ven.VEN - dc.ven.VEN * (1 - BR.abattementFranchise)) < 1,
      '×' + fcr.ven.abattement.toFixed(3) + ' · ' + Math.round(fcr.ven.VEN) + ' vs ' + Math.round(dc.ven.VEN));
    check('cet abattement reste bien plus faible que le taux douanier',
      BR.abattementFranchise < win.eval('VVPARAMS').regimes.populaire.majorationDouane / 1.5,
      (BR.abattementFranchise * 100).toFixed(0) + ' % contre 30 % de droits');
    check('et le motif de l\'abattement est nommé', /droits de douane/i.test(fcr.ven.abattementMotif || ''),
      fcr.ven.abattementMotif);
    check('la gamme reste celle du marché, pas celle de la valeur abattue',
      fcr.gamme.nom === dc.gamme.nom, fcr.gamme.nom + ' vs ' + dc.gamme.nom);
    check('FCR RS : incessibilité de durée illimitée', RG.fcr_rs.incessibilite === Infinity);
    check('FCR RS : la mesure transitoire de régularisation est datée',
      RG.fcr_rs.finMesureTransitoire === 2025);
    check('sa valeur vénale reste inférieure à celle du droit commun', fcr.vv < dc.vv,
      fcr.vv + ' < ' + dc.vv);
    // L'avantage d'un taxi s'éteint à cinq ans : il redevient de droit commun, mais son
    // usage a été intensif. Le diplomatique, lui, garde sa base hors droits à tout âge.
    setFY(2015);
    const taxiVieux = win.computeVV(ordinaire, 200000, 'normal', 'taxi', null, 2026, null, 'taxi_louage');
    check('un taxi de plus de cinq ans repasse en base de droit commun',
      Math.abs(taxiVieux.ven.abattement - 1) < 1e-9, '×' + taxiVieux.ven.abattement.toFixed(3));
    setFY(2024);
    const taxiJeune = win.computeVV(ordinaire, 60000, 'normal', 'taxi', null, 2026, null, 'taxi_louage');
    check('un taxi encore sous les cinq ans garde sa base réduite',
      taxiJeune.ven.abattement < 1, '×' + taxiJeune.ven.abattement.toFixed(3));
    setFY(2010);
    check('le corps diplomatique garde sa base hors droits à tout âge',
      win.computeVV(ordinaire, 200000, 'normal', 'particulier', null, 2026, null, 'diplomatique').ven.abattement < 1);
    setFY(2024);
    for (const k of ['diplomatique', 'taxi_louage', 'agence', 'autre']) {
      const rr = win.computeVV(ordinaire, 60000, 'normal', 'particulier', null, 2026, null, k);
      check('régime « ' + RG[k].court + '» : base abattue, valeur à neuf non majorée',
        rr.ven.abattement < 1 && rr.ven.majPop === 1);
    }
    check('le droit commun n\'abat jamais la base',
      win.computeVV(ordinaire, 60000, 'normal', 'particulier', null, 2026, null, 'aucun').ven.abattement === 1);
    // Le menu des régimes est replié derrière une case : la plupart des véhicules relèvent
    // du droit commun et n'ont rien à y lire.
    // vvInputs est un `let` de module : on le lit par win.eval, comme VVPARAMS.
    const VVI = win.eval('vvInputs');
    VVI.privilege = false;
    const sansPriv = win.renderVVBlock(ordinaire);
    check('sans privilège, le menu des régimes est masqué', sansPriv.indexOf('id="vvRegime"') === -1);
    check('mais la case « Privilège douanier » est là', sansPriv.indexOf('id="vvPriv"') !== -1);
    check('et le calcul reste en droit commun', win.regimeDe(ordinaire) === 'aucun');
    VVI.privilege = true;
    const avecPriv = win.renderVVBlock(ordinaire);
    check('cochée, elle fait apparaître le menu', avecPriv.indexOf('id="vvRegime"') !== -1);
    check('qui ne propose que des régimes de faveur',
      avecPriv.indexOf('Droit commun') === -1 && win.regimesFaveur(ordinaire).indexOf('aucun') === -1,
      win.regimesFaveur(ordinaire).join(', '));
    VVI.privilege = false;

    // ── Bases de calcul propres à chaque régime ──
    console.log('\n   bases de calcul par régime :');
    // Un véhicule RS reste incessible quel que soit son âge : jamais de bascule « majore ».
    for (const mec of [2015, 2020, 2024]) {
      setFY(mec);
      const rr = win.computeVV(ordinaire, 60000, 'normal', 'particulier', null, 2026, null, 'fcr_rs');
      check('FCR RS reste incessible à ' + (2026 - mec) + ' ans', rr.ven.popStatut === 'incessible');
    }
    setFY(2023);

    // ── Électriques et rechargeables : la charge douanière se résume à la TVA de 7 % ──
    // Elle intervient là où une charge douanière entre encore dans le calcul : la
    // réintégration de la taxe dans la valeur à neuf d'une populaire au-delà de son délai.
    let unEVb = null, unPHEV = null;
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
      const fc = win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant));
      if (fc === 'elec' && !unEVb) unEVb = f;
      if (fc === 'phev' && !unPHEV) unPHEV = f;
    }
    const TVA = win.eval('VVPARAMS').tvaElectrique;
    check('la TVA réduite couvre bien l\'électrique ET le rechargeable',
      TVA.energies.indexOf('elec') !== -1 && TVA.energies.indexOf('phev') !== -1);
    check('elle est fixée à 7 %', Math.abs(TVA.taux - 0.07) < 1e-9, (TVA.taux * 100) + ' %');
    for (const [nom, veh] of [['électrique', unEVb], ['hybride rechargeable', unPHEV]]) {
      if (!veh) continue;
      const cd = win.chargeDouaniere(win.fuelClass((veh.eg && veh.eg.fuel) || (veh.sp && veh.sp.carburant)),
        win.eval('VVPARAMS').regimes.populaire.majorationDouane);
      check('un ' + nom + ' ne supporte que la TVA, pas les 30 % de droits',
        cd.tva === true && Math.abs(cd.taux - TVA.taux) < 1e-9, (cd.taux * 100).toFixed(0) + ' %');
    }
    const cdTh = win.chargeDouaniere('essence', win.eval('VVPARAMS').regimes.populaire.majorationDouane);
    check('un thermique garde le droit de douane plein',
      !cdTh.tva && Math.abs(cdTh.taux - 0.30) < 1e-9, (cdTh.taux * 100).toFixed(0) + ' %');

    // Traçabilité des sources : chaque régime doit dire si sa règle est PUBLIÉE ou repose
    // sur la PRATIQUE de l'expert. Un rapport d'expertise doit pouvoir citer ses appuis.
    check('chaque régime de faveur déclare sa source',
      Object.keys(RG).filter(k => k !== 'aucun').every(k => RG[k].source === 'publie' || RG[k].source === 'pratique'),
      Object.keys(RG).filter(k => k !== 'aucun').map(k => k + ':' + (RG[k].source || '—')).join(' '));
    check('le taxi s\'appuie sur des textes publiés', RG.taxi_louage.source === 'publie');

    // Au plancher de valeur résiduelle, le bonus kilométrique doit s'éteindre : un véhicule
    // à sa valeur de carcasse ne se revend pas 15 % plus cher parce qu'il a peu roulé.
    // Sans cette règle, l'âge ne faisant plus rien perdre, le seul bonus km suffisait à
    // faire ressortir un millésime plus ancien au-dessus d'un plus récent (50 inversions).
    const VP = win.eval('VVPARAMS');
    // 1990 : le plancher est atteint quelle que soit la gamme (29 ans suffisent à 6,98 %/an)
    setFY(1990);
    const vieux = win.computeVV(ordinaire, 20000, 'normal', 'particulier', null, 2026, null, 'aucun');
    check('un véhicule très ancien est bien au plancher',
      Math.abs(vieux.fAge - VP.valeurResiduelle) < 1e-9, vieux.fAge.toFixed(4));
    check('et son bonus kilométrique est éteint', vieux.fKm === 1, vieux.fKm.toFixed(4));
    const vieuxRoule = win.computeVV(ordinaire, 900000, 'normal', 'particulier', null, 2026, null, 'aucun');
    check('mais le malus kilométrique continue de s\'appliquer', vieuxRoule.fKm < 1,
      vieuxRoule.fKm.toFixed(4));
    setFY(2022);
    const horsPlancher = win.computeVV(ordinaire, 20000, 'normal', 'particulier', null, 2026, null, 'aucun');
    check('un véhicule hors plancher garde son bonus', horsPlancher.fKm > 1, horsPlancher.fKm.toFixed(4));
    setFY(2019);

    // Les champs d'une même rangée doivent rester alignés quel que soit le nombre de lignes
    // de leur intitulé : un libellé sur deux lignes poussait son menu vers le bas et
    // désalignait la rangée. La hauteur des intitulés est donc réservée, et ils se calent
    // en bas — corriger la longueur d'un seul libellé n'aurait tenu que jusqu'au prochain.
    check('les intitulés de champ ont une hauteur réservée',
      /\.vv-fields\.spec-label\{display:flex;align-items:flex-end;min-height/.test(cssBat.replace(/\s+/g, '')),
      'règle d\'alignement');
    check('et se calent en bas de leur zone', /align-items:flex-end/.test(cssBat));

    // ── Indicateur de confiance ──
    // Il ne corrige rien : il nomme ce sur quoi le chiffre repose. Sa valeur a été mesurée
    // contre les 580 annonces (conf_valid.js) : écart absolu médian de 13,4 % quand il dit
    // « bien étayée », 16,4 % « à confirmer », 26,1 % « fragile » — soit deux fois plus.
    console.log('\nConfiance de l\'estimation :');
    setFY(2019);
    const rConf = win.computeVV(ordinaire, 120000, 'normal', 'particulier', null, 2026, null, 'aucun');
    const c0 = win.evaluerConfiance(ordinaire, rConf);
    check('un niveau est attribué', ['bonne', 'moyenne', 'faible'].indexOf(c0.niveau) !== -1, c0.niveau);
    check('chaque réserve est nommée en toutes lettres',
      c0.motifs.every(m => typeof m === 'string' && m.length > 8 && m.indexOf('{') === -1),
      c0.motifs.join(' · ') || 'aucune réserve');
    // le kilométrage manquant doit dégrader la confiance
    const sansKm = win.computeVV(ordinaire, null, 'normal', 'particulier', null, 2026, null, 'aucun');
    const cSansKm = win.evaluerConfiance(ordinaire, sansKm);
    check('un kilométrage absent dégrade la confiance', cSansKm.pts > c0.pts,
      cSansKm.pts + ' vs ' + c0.pts);
    check('et la réserve le dit', cSansKm.motifs.some(m => /kilom/i.test(m)));
    // un véhicule à batterie sans SOH doit être pénalisé, et l'être moins une fois mesuré
    if (unEV) {
      setFY(2023);
      const sSoh = win.computeVV(unEV, 60000, 'normal', 'particulier', null, 2026, null);
      const aSoh = win.computeVV(unEV, 60000, 'normal', 'particulier', null, 2026, 0.92);
      check('un SOH non mesuré est signalé',
        win.evaluerConfiance(unEV, sSoh).motifs.some(m => /santé/i.test(m)));
      check('le mesurer améliore la confiance',
        win.evaluerConfiance(unEV, aSoh).pts < win.evaluerConfiance(unEV, sSoh).pts);
    }
    // ordre des seuils, et cohérence points → niveau
    const CC = win.eval('VVPARAMS').confiance;
    check('les seuils sont ordonnés', CC.seuils.bonne < CC.seuils.moyenne);
    check('plus de points ne donne jamais un meilleur niveau',
      (function () {
        const rang = { bonne: 0, moyenne: 1, faible: 2 };
        let ok = true, prev = -1;
        for (const pts of [0, 1, 2, 3, 4, 8]) {
          const niv = pts <= CC.seuils.bonne ? 'bonne' : pts <= CC.seuils.moyenne ? 'moyenne' : 'faible';
          if (rang[niv] < prev) ok = false;
          prev = rang[niv];
        }
        return ok;
      })());
    for (const sel of ['.conf{', '.conf-bonne{', '.conf-moyenne{', '.conf-faible{', '.conf-pip{'])
      check('règle présente : ' + sel, cssBat.indexOf(sel) !== -1);
    // La fiche doit livrer un résultat, pas un dossier : seuls le montant, la jauge et la
    // ligne de confiance restent visibles ; pastilles, batterie, détail et notices se
    // consultent sous le pli.
    const blocHtml = app.slice(app.indexOf("'<div class=\"vv-resultat\">'"), app.indexOf("const slider="));
    const iPli = blocHtml.indexOf('<details');
    check('les pastilles sont passées sous le pli', blocHtml.indexOf('id="vvChips"') > iPli);
    check('le panneau batterie aussi', blocHtml.indexOf('id="vvBat"') > iPli);
    check('les notices aussi', blocHtml.indexOf('id="vvNotices"') > iPli);
    check('le montant reste visible', blocHtml.indexOf('id="vvPrix"') < iPli && blocHtml.indexOf('id="vvPrix"') > 0);
    check('la jauge de cotation reste visible', blocHtml.indexOf('coteGaugeHtml') < iPli);
    check('la ligne de confiance reste visible', blocHtml.indexOf('id="vvConf"') < iPli);
    check('la confiance n\'est plus un bloc dépliable de plus',
      /\.conf\{display:flex/.test(cssBat.replace(/\s+/g, '')));
    setFY(2023);

    // Les blocs propres au téléphone ne doivent pas fuir sur grand écran : leur masquage
    // doit être déclaré HORS du média, sinon aucune règle ne s'applique en desktop.
    check('le chip « Modèle » est masqué hors téléphone',
      /\.mob-model-chip\{display:none\}/.test(cssBat.replace(/\s+/g, '')));

    // ── Le catalogue subventionné est une propriété de la FINITION, pas du régime ──
    // Défaut signalé par Yassine sur une Citroën C3 Populaire de 2016 : choisir « droit
    // commun » faisait traiter le prix SUBVENTIONNÉ comme un prix de marché, d'où 21 000 DT
    // au lieu de 27 300 — un quart trop bas sur un chiffre qui sert à indemniser.
    console.log('\nCatalogue subventionné et régime déclaré :');
    if (win.DB['Citroën'] && win.DB['Citroën']['Citroën C3 Populaire']) {
      const c3p = win.DB['Citroën']['Citroën C3 Populaire'][0];
      setFY(2016);
      // Une populaire ne relève que du régime populaire : c'est le seul cas à vérifier.
      const popHors = win.computeVV(c3p, 120000, 'normal', 'particulier', null, 2026, null, 'populaire');
      console.log('   C3 Populaire 2016, hors délai : ' + popHors.vv.toLocaleString('fr-FR') + ' DT');
      check('hors délai, la taxe du catalogue est réintégrée', popHors.ven.majPop > 1,
        '×' + popHors.ven.majPop.toFixed(2));
      check('et aucun abattement ne s\'y ajoute', popHors.ven.abattement === 1);
      // le calcul ne doit plus dépendre d'un régime qu'elle ne peut pas porter
      check('le régime retenu reste populaire quoi qu\'on demande',
        win.computeVV(c3p, 120000, 'normal', 'particulier', null, 2026, null, 'aucun').ven.majPop > 1);
      // sous le délai POPULAIRE, et seulement là, le prix subventionné est gelé
      setFY(2025);
      const inc = win.computeVV(c3p, 20000, 'normal', 'particulier', null, 2026, null, 'populaire');
      const libre = win.computeVV(c3p, 20000, 'normal', 'particulier', null, 2026, null, 'aucun');
      check('sous le délai populaire, la valeur suit le prix subventionné',
        inc.ven.majPop === 1 && inc.vv < libre.vv, inc.vv + ' < ' + libre.vv);
      check('le délai d\'un AUTRE régime ne gèle pas le prix subventionné',
        win.computeVV(c3p, 20000, 'normal', 'particulier', null, 2026, null, 'fcr_rs').ven.majPop > 1);
    }
    // un modèle ordinaire n'est jamais majoré, quel que soit le régime
    setFY(2019);
    for (const rg of ['aucun', 'populaire', 'fcr_rs', 'diplomatique'])
      check('modèle ordinaire sous « ' + rg + '» : aucune majoration de catalogue',
        win.computeVV(ordinaire, 120000, 'normal', 'particulier', null, 2026, null, null, false, rg).ven.majPop === 1);

    // ── Régimes ouverts à un véhicule donné ──
    // Une voiture populaire ne relève QUE du régime populaire ; réciproquement, aucun autre
    // modèle ne peut l'être. Les combinaisons impossibles ouvraient la porte aux incohérences.
    console.log('\nRégimes ouverts par véhicule :');
    if (win.DB['Citroën'] && win.DB['Citroën']['Citroën C3 Populaire']) {
      const c3p2 = win.DB['Citroën']['Citroën C3 Populaire'][0];
      check('une populaire n\'a que le régime populaire',
        JSON.stringify(win.regimesPossibles(c3p2)) === '["populaire"]',
        win.regimesPossibles(c3p2).join(','));
      // Une populaire n'a pas le choix : la case est cochée et figée.
      const blocPop = win.renderVVBlock(c3p2);
      check('sa case privilège est cochée et figée',
        /id="vvPriv" checked disabled/.test(blocPop.replace(/\s+/g, ' ')));
      check('et son menu de régime est verrouillé', blocPop.indexOf('id="vvRegime"') !== -1 &&
        blocPop.indexOf('disabled') !== -1);
      check('le privilège lui est acquis quoi qu\'on coche', win.privilegeActif(c3p2) === true);
      check('et le régime retenu est bien populaire', win.regimeDe(c3p2) === 'populaire');
    }
    const ouvertsOrd = win.regimesPossibles(ordinaire);
    check('un modèle ordinaire ne peut pas être populaire', ouvertsOrd.indexOf('populaire') === -1,
      ouvertsOrd.join(', '));
    check('il garde tous les autres régimes', ouvertsOrd.length === Object.keys(RG).length - 1);
    check('un modèle ordinaire n\'a pas de case figée',
      win.renderVVBlock(ordinaire).indexOf('disabled') === -1);

    // ── Le balisage du module doit être ÉQUILIBRÉ dans tous ses états ──
    // Défaut signalé par Yassine : la fiche apparaissait EN DOUBLE. Cause exacte — un
    // « </div> » de trop dans le bloc de saisie fermait « .vv-fields » trop tôt ; « #vvOut »
    // se retrouvait alors HORS de « #vvSect ». Or `relance2` remplace « #vvSect » par son
    // outerHTML : l'ancien « #vvOut », devenu orphelin, restait dans la page, et chaque
    // basculement d'une case ajoutait un panneau de résultat de plus.
    // Le contrôle est donc structurel, pas cosmétique : renderVVBlock doit toujours rendre
    // UN SEUL élément racine, avec autant de balises ouvrantes que de fermantes.
    console.log('\nBalisage du module (cause du panneau en double) :');
    {
      const etats = [];
      const VVI2 = win.eval('vvInputs');
      let popB = null;
      for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b]))
        if (/populaire$/i.test(m) && !popB) popB = win.DB[b][m][0];
      let evB = null;
      for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m])
        if (!evB && win.aBatterie(win.fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant)))) evB = f;
      for (const [nom, veh] of [['ordinaire', ordinaire], ['populaire', popB], ['à batterie', evB]]) {
        if (!veh) continue;
        for (const priv of [false, true]) {
          VVI2.privilege = priv;
          setFY(2024);
          etats.push([nom + (priv ? ' · privilège coché' : ''), win.renderVVBlock(veh)]);
        }
      }
      VVI2.privilege = false;
      for (const [nom, html] of etats) {
        const ouv = (html.match(/<div\b/g) || []).length, fer = (html.match(/<\/div>/g) || []).length;
        const d = win.document.createElement('div'); d.innerHTML = html;
        check('balisage équilibré — ' + nom, ouv === fer && d.children.length === 1,
          ouv + ' ouvrantes / ' + fer + ' fermantes · ' + d.children.length + ' racine(s)');
        check('#vvOut est bien À L\'INTÉRIEUR de #vvSect — ' + nom,
          !!(d.querySelector('#vvSect #vvOut')));
      }
      // Et la conséquence : basculer les cases ne doit jamais dupliquer le panneau.
      const doc = win.document;
      const priv = doc.getElementById('vvPriv');
      if (priv) {
        for (let n = 0; n < 3; n++) {
          priv.checked = !priv.checked;
          priv.dispatchEvent(new win.Event('change', { bubbles: true }));
        }
        check('après plusieurs basculements, un seul panneau de résultat',
          doc.querySelectorAll('.vv-resultat').length === 1 && doc.querySelectorAll('#vvOut').length === 1,
          doc.querySelectorAll('.vv-resultat').length + ' panneau(x)');
      }
      setFY(2019);
    }

    // Le facteur d'état doit porter la règle de métier : réparé aux normes = aucun malus
    const E = win.eval('VVPARAMS').etats;
    check('le niveau neutre dit explicitement qu\'il n\'y a pas de malus',
      /aucun malus/i.test(E.normal.label) && E.normal.idx === 0, E.normal.label);
    check('chaque niveau d\'état porte une aide de lecture',
      Object.keys(E).every(k => typeof E[k].aide === 'string' && E[k].aide.length > 10));
    check('l\'aide est affichée sous le champ', cssBat.indexOf('.fld-aide{') !== -1);

    // ── 12 quinquies. Parcours téléphone : la marque doit être identifiable ──
    // Sur téléphone la colonne des marques n'existe pas. La barre marque n'apparaissait
    // qu'APRÈS un choix : l'écran d'accueil n'offrait donc aucune trace de la première
    // étape, seulement un hamburger et un « ← Sélectionnez une marque » qui désignait une
    // colonne absente. Ces contrôles empêchent la régression.
    console.log('\n12 quinquies. Parcours téléphone :');
    const chip = doc.getElementById('mobBrandChip');
    check('la barre marque existe', !!chip);
    check('c\'est un vrai bouton', chip && chip.tagName === 'BUTTON', chip && chip.tagName);
    check('elle ne dépend plus d\'une classe .visible',
      cssBat.indexOf('.mob-brand-chip.visible{display:flex}') === -1);
    check('elle est affichée sur téléphone', /\.mob-brand-chip\{display:flex/.test(cssBat));
    check('les pastilles d\'étape existent', cssBat.indexOf('.step{') !== -1);
    check('la flèche d\'invitation s\'adapte au téléphone', cssBat.indexOf('.le-dir::before') !== -1);
    const corpsHtml = app.slice(app.indexOf('<body>'));
    check('plus d\'invitation vers une colonne absente', corpsHtml.indexOf('← Sélectionnez') === -1);
    // états successifs
    win.majBarreMarque(null);
    check('sans marque : invitation explicite',
      chip.classList.contains('vide') && /choisir une marque/i.test(chip.textContent));
    win.majBarreMarque('Volkswagen');
    check('avec marque : nom affiché et action « Changer »',
      !chip.classList.contains('vide') && /Volkswagen/.test(chip.textContent) && /changer/i.test(chip.textContent),
      chip.textContent.replace(/\s+/g, ' ').trim());
    check('initiales de la marque', doc.getElementById('mobChipIco').textContent === 'VO');

    // ── 12 sexies. Repère de version ──
    // Sans lui, un fichier remplacé mais servi depuis le cache du navigateur est
    // indiscernable de l'ancien : on ne peut pas vérifier ce qui tourne réellement.
    console.log('\n12 sexies. Repère de version :');
    const vb = doc.getElementById('verBadge');
    check('le repère de version est présent dans la barre du haut', !!vb);
    check('il affiche un numéro', vb && /^v\d+/.test(vb.textContent.trim()), vb && vb.textContent.trim());
    check('il porte la date et le contenu de la build en infobulle',
      vb && /\d{2}\/\d{2}\/\d{4}/.test(vb.getAttribute('title') || ''), vb && vb.getAttribute('title'));
    check('il est stylé et non masqué sur téléphone',
      cssBat.indexOf('.ver{') !== -1 && !/\.ver\{[^}]*display:none/.test(cssBat));

    // ── 13. Présence des règles de style essentielles ──
    // Un remaniement du CSS a déjà supprimé par accident les règles du montant et de la
    // carte du module : le rendu se dégradait sans qu'aucun test ne bronche. Ces
    // assertions sont volontairement grossières — elles ne jugent pas l'esthétique,
    // elles vérifient seulement que les règles n'ont pas disparu.
    console.log('\n13. Règles de style essentielles :');
    const css = [...doc.querySelectorAll('style')].map(x => x.textContent).join('\n');
    const regles = [
      ['#vvSect{', 'carte du module'],
      ['.vv-prix-val{', 'typographie du montant'],
      ['.vv-prix-note{', 'mention sous le montant'],
      ['.vv-chip{', 'pastilles de synthèse'],
      ['.cote-track{', 'piste du curseur'],
      ['.cote-range::-webkit-slider-thumb', 'poignée du curseur'],
      ['.vv-annee{', 'sélecteur d\'année'],
      ['.vv-fields{', 'grille des champs'],
    ];
    for (const [sel, quoi] of regles) check('règle présente : ' + quoi, css.includes(sel), sel);
    // Le montant et sa mention doivent être des blocs distincts, sinon ils se collent.
    check('le montant et sa mention sont sur des lignes séparées',
      /\.vv-prix-val\{display:block/.test(css) && /\.vv-prix-note\{display:block/.test(css));

    // ── 14. Thème, relief 3D et corrections v50 ──
    console.log('\n14. Thème et relief 3D :');
    // Parité des jetons : les deux blocs sombres doivent définir exactement la même liste,
    // sinon une couleur ne s'applique que dans l'un des deux états (système / choix explicite).
    const blocMedia = (css.match(/:root:not\(\[data-theme="light"\]\)\{([\s\S]*?)\}/) || [])[1] || '';
    const blocExplicite = (css.match(/:root\[data-theme="dark"\]\{([\s\S]*?)\}/) || [])[1] || '';
    const noms = b => [...b.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]).sort().join(',');
    check('mêmes jetons dans les deux blocs du thème sombre',
      blocMedia.length > 0 && noms(blocMedia) === noms(blocExplicite),
      noms(blocMedia).split(',').length + ' jetons');
    const blocClair = (css.match(/:root\{([\s\S]*?)\n\}/) || [])[1] || '';
    const manquants = noms(blocMedia).split(',').filter(n => !new RegExp(n.replace(/-/g, '\\-') + '\\s*:').test(blocClair));
    check('chaque jeton sombre existe aussi en thème clair', manquants.length === 0, manquants.join(' '));
    check('module valeur vénale sans fond blanc codé en dur', !/#vvSect\{[^}]*#FFFFFF/i.test(css));
    check('aucun calc() sans espaces autour du +', !/calc\([^)]*\)\+\d/.test(css));
    check('bouton « Retour à la sélection » stylé', css.includes('.back-to-sel{'));
    // L'effet 3D a été retiré pour lenteur d'affichage : il ne doit pas revenir par accident.
    check('effet 3D retiré (ni scène, ni inclinaison, ni perspective, ni flou, ni animation perpétuelle)',
      !doc.querySelector('.scene3d, [data-tilt], .cube') && !/perspective\(|backdrop-filter:blur\(1\d|infinite/.test(css));

    // Saisie de l'année : aucun rendu tant que l'année est incomplète.
    doc.getElementById('mecClr').click();
    const rBrandsOrig = win.rBrands; let rendus = 0;
    win.rBrands = function () { rendus++; return rBrandsOrig.apply(this, arguments); };
    const mecEl = doc.getElementById('mecIn');
    for (const v of ['2', '20', '201']) { mecEl.value = v; mecEl.dispatchEvent(new win.Event('input')); }
    const rendusPartiels = rendus;
    mecEl.value = '2019'; mecEl.dispatchEvent(new win.Event('input'));
    mecEl.dispatchEvent(new win.Event('input'));   // même année saisie deux fois
    win.rBrands = rBrandsOrig;
    check('saisie de l\'année : rien n\'est redessiné avant le 4e chiffre, ni pour une année inchangée',
      rendusPartiels === 0 && rendus === 1, 'rendus=' + rendusPartiels + '/' + rendus);

    // Tri : les modèles actifs à l'année de MEC en tête (le rang 0 était converti en 2 par `||2`).
    let ordreOk = true, marqueMixte = null;
    for (const b of Object.keys(win.DB)) {
      win.selectBrand(b);
      const tags = [...doc.querySelectorAll('#listM .item')].map(x => !!x.querySelector('.itag.ok'));
      if (tags.includes(true) && tags.includes(false)) {
        marqueMixte = b;
        ordreOk = tags.indexOf(false) > tags.lastIndexOf(true);
        break;
      }
    }
    check('tri : les modèles actifs à la MEC sont listés en tête', !!marqueMixte && ordreOk, marqueMixte);

    const themeBtn = doc.getElementById('themeBtn');
    check('sélecteur de thème présent', !!themeBtn);
    const racine = doc.documentElement;
    const themes = [];
    for (let i = 0; i < 3; i++) { win.basculerTheme(); themes.push(racine.getAttribute('data-theme')); }
    check('le thème tourne système → clair → sombre → système',
      themes[0] === 'light' && themes[1] === 'dark' && themes[2] === null, JSON.stringify(themes));

    check('frise des années bornée à l\'année courante', win.pctY(CYnow) <= 97 && win.pctY(2011) === 0);

    // Recherche globale : l'ancienne fiche ne doit pas survivre au changement de modèle.
    const listeB = doc.getElementById('listB');
    listeB.children[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    doc.getElementById('listM').children[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    doc.getElementById('listV').children[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    check('une fiche est affichée avant la recherche', doc.getElementById('resContent').style.display === 'block');
    const gs = doc.getElementById('gsInput');
    gs.value = 'clio'; gs.dispatchEvent(new win.Event('input', { bubbles: true }));
    const premier = doc.querySelector('#gsResults .gs-result-item');
    check('la recherche est insensible à la casse et trouve un modèle', !!premier);
    premier.dispatchEvent(new win.Event('click', { bubbles: true }));
    const selApres = win.eval('sel');
    check('recherche : modèle sélectionné, finition remise à zéro', !!selApres.m && selApres.v === null, selApres.m);
    check('recherche : l\'ancienne fiche n\'est plus affichée',
      doc.getElementById('resContent').style.display === 'none' &&
      !doc.querySelector('.main').classList.contains('with-result'));
    check('recherche : la barre marque du téléphone suit la marque choisie',
      doc.getElementById('mobChipName').textContent === selApres.b &&
      !doc.getElementById('mobBrandChip').classList.contains('vide'));



    // ── 15. Méthode B : l'ancrage est la valeur à neuf, pas le tarif du millésime ──
    // Choix de Yassine, 16.09.2026. Le calcul doit partir du dernier tarif catalogue de la
    // PHASE du véhicule — son tarif du jour s'il est encore vendu, sa valeur de fin de série
    // sinon — et non plus du tarif en vigueur l'année de sa mise en circulation.
    console.log('\n15. Méthode B — ancrage sur la valeur à neuf :');
    {
      const CY15 = win.eval('CY');
      const PH15 = win.eval('PHASES');

      // 15.1 L'ancrage EST le dernier tarif de la phase, sur un échantillon large.
      let ecarts = 0, testes = 0, exemple = null;
      let i = 0;
      for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
        if ((i++) % 17) continue;
        const H = win.tarifsCatalogue(f);
        if (!H.length) continue;
        const an = win.yOf(H[0].d);
        setFY(an);
        const r = win.computeVV(f, 100000, 'normal', 'particulier', null, CY15);
        if (!r) continue;
        const attendu = win.histPhase(f, m, an).slice(-1)[0];
        testes++;
        if (r.ven.L !== attendu.p) { ecarts++; if (!exemple) exemple = m + ' ' + f.v + ' : ' + r.ven.L + ' vs ' + attendu.p; }
      }
      check('le prix de référence est le dernier tarif de la phase du véhicule',
        testes > 100 && ecarts === 0, testes + ' finitions testées' + (exemple ? ' — ' + exemple : ''));

      // 15.2 Tous les millésimes d'une même phase partagent la même valeur à neuf : ce qui
      // les sépare, c'est l'âge. (Au-delà du plancher de vétusté, l'enveloppe de cohérence
      // reprend la main — on borne donc le contrôle aux millésimes récents.)
      let memeVEN = true, detail = '';
      for (const b of Object.keys(win.DB)) {
        for (const m of Object.keys(win.DB[b])) {
          if (PH15[m]) continue;
          for (const f of win.DB[b][m]) {
            // Les populaires sont hors sujet ici : la bascule d'incessibilité change
            // volontairement leur valeur à neuf d'un millésime au suivant.
            if (f.pop) continue;
            const H = win.tarifsCatalogue(f);
            const y0 = win.yOf(H[0].d), y1 = win.yOf(H[H.length - 1].d);
            if (y1 - y0 < 3 || CY15 - y0 > 10) continue;
            const vens = [];
            for (let y = y0; y <= y1; y++) { setFY(y); vens.push(Math.round(win.computeVV(f, 0, 'normal', 'particulier', null, CY15).ven.VEN)); }
            if (new Set(vens).size !== 1) { memeVEN = false; detail = m + ' ' + f.v + ' : ' + vens.join('/'); }
            if (!memeVEN) break;
          }
          if (!memeVEN) break;
        }
        if (!memeVEN) break;
      }
      check('tous les millésimes d\'une phase partagent la même valeur à neuf', memeVEN, detail);

      // 15.3 La phase reste le périmètre : une RAV 4 Hybride de 2022 s'ancre sur la XA50.
      const rav = win.DB.Toyota['Toyota RAV 4 Hybride'][0];
      setFY(2022);
      const rr = win.computeVV(rav, 80000, 'normal', 'particulier', null, CY15);
      check('RAV 4 Hybride 2022 : ancrée sur sa propre génération, pas sur la XA60',
        rr.ven.L < 204800, 'ancrage ' + rr.ven.L + ' de ' + rr.ven.M);

      // 15.4 Frontière ajoutée : une Peugeot 208 de 2018 ne doit pas valoir le tarif 2024 de
      // la deuxième génération.
      const p208 = win.DB.Peugeot['Peugeot 208'].find(x => x.v === '1.2 L Active');
      setFY(2018);
      const rp = win.computeVV(p208, 150000, 'normal', 'particulier', null, CY15);
      check('Peugeot 208 de 2018 : ancrée avant le lancement de la 2e génération',
        rp.ven.M <= 2020 && rp.ven.L <= 49990, 'ancrage ' + rp.ven.L + ' de ' + rp.ven.M);

      // 15.5 Une expertise datée du passé ne peut pas s'appuyer sur un tarif postérieur.
      setFY(2018);
      const rPasse15 = win.computeVV(p208, 150000, 'normal', 'particulier', null, 2019);
      check('évaluation datée de 2019 : aucun tarif postérieur à 2019 retenu',
        rPasse15.ven.M <= 2019, 'ancrage ' + rPasse15.ven.L + ' de ' + rPasse15.ven.M);

      // 15.6 Le libellé d'ancrage dit la vérité, et il dit la même chose que la fiche.
      const finCat = win.DB.Renault['Renault Symbol'].find(x => x.v && win.yOf(win.derniereDateTarif(x)) < CY15 - 1);
      if (finCat) {
        setFY(win.yOf(win.tarifsCatalogue(finCat)[0].d));
        const rf = win.computeVV(finCat, 200000, 'normal', 'particulier', null, CY15);
        // « enveloppe » est une fin de série que la borne de cohérence inter-phases a
        // rabotée : c'est le même ancrage, signalé comme corrigé.
        check('finition retirée du catalogue : ancrage nommé « fin de série »',
          rf.ven.ancre === 'finserie' || rf.ven.ancre === 'enveloppe', rf.ven.ancre);
        const bloc = win.blocPrix(finCat, 'Renault Symbol', win.yOf(win.tarifsCatalogue(finCat)[0].d));
        check('…et la fiche affiche ce même montant en valeur à neuf',
          bloc.includes(rf.ven.L.toLocaleString('fr-TN')), 'attendu ' + rf.ven.L);
      }

      // 15.7 Une frontière de phase ne s'inscrit qu'avec sa source et son motif — déjà
      // vérifié en 12 ter bis, on contrôle ici que les nouvelles s'y plient aussi.
      check('les frontières ajoutées portent toutes une source datée',
        ['Peugeot 208', 'Hyundai i20', 'Opel Corsa', 'Suzuki Swift'].every(m =>
          PH15[m] && PH15[m].every(f => /\d{4}/.test(f.source) && f.motif.length > 60)),
        Object.keys(PH15).length + ' modèles avec frontière');
    }
    setFY(2019);

    // ── 16. Mois de 1ère mise en circulation (facultatif) ──
    // Le mois lève l'ambiguïté des millésimes à cheval sur un changement de génération et
    // affine le tri des finitions. Règle intangible : SANS mois, tout doit rendre le chiffre
    // d'avant, au dinar près.
    console.log('\n16. Mois de 1ère mise en circulation :');
    {
      const CY16 = win.eval('CY');
      const PH16 = win.eval('PHASES');
      const setFM = m => {
        const el = doc.getElementById('mecMois');
        el.value = m == null ? '' : String(m);
        el.dispatchEvent(new win.Event('change', { bubbles: true }));
      };
      const moisDe = d => parseInt(d.slice(3, 5));

      // 16.1 Sans mois, rien ne bouge — y compris après un détour par plusieurs mois, ce qui
      // vérifie du même coup que le cache de venSerie n'est pas pollué par le mois.
      const p208 = win.DB.Peugeot['Peugeot 208'].find(x => x.v === '1.2 L Active');
      setFY(2021); setFM(null);
      const sansMoisAvant = win.computeVV(p208, 60000, 'normal', 'particulier', null, CY16).vv;
      setFM(1); setFM(6); setFM(11); setFM(null);
      const sansMoisApres = win.computeVV(p208, 60000, 'normal', 'particulier', null, CY16).vv;
      check('sans mois, la valeur vénale est exactement celle d\'avant (cache non pollué)',
        sansMoisAvant === sansMoisApres, sansMoisAvant + ' DT');

      // 16.2 Peugeot 208, MEC 2021 : la frontière du 03.02.2021 sépare les deux générations.
      const fr208 = PH16['Peugeot 208'][0];
      setFY(2021); setFM(1);
      const janv = win.computeVV(p208, 60000, 'normal', 'particulier', null, CY16);
      setFM(6);
      const juin = win.computeVV(p208, 60000, 'normal', 'particulier', null, CY16);
      check('Peugeot 208 : 01/2021 relève de la génération sortante, 06/2021 de l\'entrante',
        janv.ven.L !== juin.ven.L && janv.vv !== juin.vv,
        'janv. ' + janv.ven.L + ' (' + janv.ven.M + ') vs juin ' + juin.ven.L + ' (' + juin.ven.M + ')');
      check('…et la bascule se fait bien à la date de la frontière (' + fr208.date + ')',
        win.phaseDeAnnee('Peugeot 208', 2021, 1).rang < win.phaseDeAnnee('Peugeot 208', 2021, 6).rang);

      // 16.3 Hyundai i20 : même bascule autour du 05.04.2021 (ce modèle a deux frontières).
      const fri20 = (PH16['Hyundai i20'] || []).find(f => f.date.endsWith('2021'));
      if (fri20) {
        // Il faut une finition qui ENJAMBE la frontière : celles qui naissent le jour du
        // lancement (« 1.2 L High Grade », 05.04.2021) n'ont qu'une phase, et ne basculent pas.
        const kFront = parseInt(fri20.date.slice(6)) * 100 + parseInt(fri20.date.slice(3, 5));
        const kh = d => parseInt(d.slice(6)) * 100 + parseInt(d.slice(3, 5));
        const i20 = win.DB.Hyundai['Hyundai i20'].find(f =>
          kh(f.hist[0].d) < kFront && kh(f.hist[f.hist.length - 1].d) > kFront)
          || win.DB.Hyundai['Hyundai i20'][0];
        setFY(2021); setFM(1);
        const i20a = win.computeVV(i20, 60000, 'normal', 'particulier', null, CY16);
        setFM(Math.min(12, moisDe(fri20.date) + 2));
        const i20b = win.computeVV(i20, 60000, 'normal', 'particulier', null, CY16);
        check('Hyundai i20 : bascule de génération autour du ' + fri20.date,
          i20a.ven.L !== i20b.ven.L, i20.v + ' : ' + i20a.ven.L + ' (' + i20a.ven.M + ') vs ' + i20b.ven.L + ' (' + i20b.ven.M + ')');
      }

      // 16.4 Tolérance de 12 mois après le DERNIER TARIF RELEVÉ — et pas au-delà.
      let finMars2020 = null;
      for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m])
        if (!finMars2020 && /^\d\d\.03\.2020$/.test(f.d) && win.yOf(f.d0) <= 2019) finMars2020 = f;
      if (finMars2020) {
        setFY(2021); setFM(1);
        const c1 = win.vCompat(finMars2020);
        setFM(6);
        const c6 = win.vCompat(finMars2020);
        check('dernier tarif de mars 2020 : actif en 01/2021, hors période en 06/2021',
          c1 === 'ok' && c6 === 'apres', finMars2020.v + ' → ' + c1 + ' / ' + c6);
      }

      // 16.5 Mois égal au mois de la frontière : seul le jour trancherait, l'ambiguïté demeure.
      const phFront = win.phaseDeAnnee('Peugeot 208', 2021, moisDe(fr208.date));
      check('mois égal à celui de la frontière : le millésime reste « à cheval »',
        phFront.aCheval === true && phFront.tranche === false);
      check('mois différent : l\'ambiguïté est levée',
        win.phaseDeAnnee('Peugeot 208', 2021, 11).aCheval === false &&
        win.phaseDeAnnee('Peugeot 208', 2021, 11).tranche === true);
      // Sans mois, le comportement d'avant est conservé : l'année entière reste à cheval.
      check('sans mois, le millésime de la frontière reste à cheval comme avant',
        win.phaseDeAnnee('Peugeot 208', 2021).aCheval === true);

      // 16.6 La pénalité « millésime à cheval » tombe quand le mois a tranché.
      setFY(2021); setFM(null);
      const confSans = win.computeVV(p208, 60000, 'normal', 'particulier', null, CY16);
      setFM(11);
      const confAvec = win.computeVV(p208, 60000, 'normal', 'particulier', null, CY16);
      const mSans = win.evaluerConfiance(p208, confSans).motifs.join(' ');
      const mAvec = win.evaluerConfiance(p208, confAvec).motifs.join(' ');
      check('la réserve « millésime à cheval » disparaît quand le mois tranche',
        /cheval/i.test(mSans) && !/cheval/i.test(mAvec));

      // 16.7 Affichage : badge, libellé de compatibilité et bannière en MM/AAAA.
      setFY(2020); setFM(11);
      check('le badge affiche MM/AAAA', doc.getElementById('mecBadge').textContent === '11/2020',
        doc.getElementById('mecBadge').textContent);
      check('le libellé de compatibilité affiche MM/AAAA', /actif en 11\/2020/.test(win.tagHtml('ok', 2012, 2021)));
      const vAff = win.DB.Peugeot['Peugeot 208'].find(x => win.vCompat(x) === 'ok') || p208;
      win.selectBrand('Peugeot');
      [...doc.querySelectorAll('#listM .item')].find(x => x.querySelector('.item-name').textContent.trim().endsWith('Peugeot 208')).click();
      const ligne = [...doc.querySelectorAll('#listV > .vi')].find(x => x.__v && x.__v.v === vAff.v);
      if (ligne) ligne.click();
      check('la bannière de la fiche affiche MM/AAAA',
        /1ère MEC \(11\/2020\)|non actif en 11\/2020|en Tunisie en 11\/2020/.test(doc.getElementById('resContent').innerHTML));
      check('l\'invitation à saisir le mois n\'apparaît que sans mois saisi',
        !/lèverait l.ambiguïté|affinerait le choix/.test(doc.getElementById('resContent').innerHTML));
      setFM(null);
      check('…et elle apparaît quand le mois changerait quelque chose',
        /lèverait l.ambiguïté|affinerait le choix/.test(doc.getElementById('resContent').innerHTML));

      // 16.8 Le sélecteur : inactif sans année, actif ensuite, remis à zéro par la croix.
      const selMois = doc.getElementById('mecMois');
      check('le sélecteur de mois est un menu déroulant étiqueté', !!selMois && !!selMois.getAttribute('aria-label'));
      check('il est actif une fois l\'année saisie', selMois.disabled === false);
      setFM(7);
      doc.getElementById('mecClr').click();
      check('la croix efface l\'année ET le mois, et désactive le sélecteur',
        win.eval('FY') === null && win.eval('FM') === null && selMois.disabled === true && selMois.value === '');

      // 16.9 Aucun redessin superflu au changement de mois (même technique qu'en section 14).
      setFY(2021);
      const rBrandsOrig16 = win.rBrands; let rendus16 = 0;
      win.rBrands = function () { rendus16++; return rBrandsOrig16.apply(this, arguments); };
      setFM(5); setFM(5);            // deux fois le même mois : un seul redessin
      const apresMeme = rendus16;
      setFM(9);                       // un mois différent : un redessin de plus
      win.rBrands = rBrandsOrig16;
      check('un changement de mois redessine une fois, un mois identique ne redessine pas',
        apresMeme === 1 && rendus16 === 2, 'rendus=' + apresMeme + '/' + rendus16);

      // 16.10 L'âge n'est PAS passé en mois : il reste en années pleines.
      setFY(2021); setFM(1);
      const ageJanv = win.computeVV(p208, 60000, 'normal', 'particulier', null, CY16).age;
      setFM(12);
      const ageDec = win.computeVV(p208, 60000, 'normal', 'particulier', null, CY16).age;
      check('l\'âge reste compté en années pleines, quel que soit le mois',
        ageJanv === ageDec && ageJanv === CY16 - 2021, 'âge ' + ageJanv);
      setFM(null);
    }
    setFY(2019);

    console.log('\n' + (fails === 0 ? '=== TOUS LES TESTS PASSENT ===' : '=== ' + fails + ' ÉCHEC(S) ==='));
  } catch (e) {
    console.log('EXCEPTION:', e.message);
    console.log(e.stack);
    fails++;
  }
}, 900);
