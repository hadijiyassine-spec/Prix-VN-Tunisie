const { JSDOM } = require('jsdom');
const fs = require('fs');

// app.html + data.js fusionnés pour le test
const app = fs.readFileSync('app.html', 'utf8');
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

    doc.getElementById('mecClr').click();
    check('effacement de la MEC : retour à l\'invitation, sans erreur', !!doc.getElementById('vvAskMec'));

    console.log('\n' + (fails === 0 ? '=== TOUS LES TESTS PASSENT ===' : '=== ' + fails + ' ÉCHEC(S) ==='));
  } catch (e) {
    console.log('EXCEPTION:', e.message);
    console.log(e.stack);
    fails++;
  }
}, 900);
