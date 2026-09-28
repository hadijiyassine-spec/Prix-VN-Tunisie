// Simulation de jeux de paramètres candidats, SANS MODIFIER index.html : les paramètres sont
// surchargés en mémoire dans la page chargée sous jsdom, et les caches de valeur à neuf vidés.
// Produit : les cas de référence de l'expert, et la performance globale face aux annonces.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const app = fs.readFileSync('index.html', 'utf8'), data = fs.readFileSync('data.js', 'utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>'),
  { runScripts: 'dangerously', url: 'https://e.com/a.html', pretendToBeVisual: true });
const win = dom.window, doc = win.document;
win.requestAnimationFrame = win.requestAnimationFrame || (cb => setTimeout(cb, 0));
if (!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView = function () {};

const CY = 2026;
const med = a => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const dt = n => Math.round(n).toLocaleString('fr-FR');

setTimeout(() => {
  const P = win.eval('VVPARAMS');
  const setFY = y => { const e = doc.getElementById('mecIn'); e.value = String(y); e.dispatchEvent(new win.Event('input')); };
  const setFM = m => { const e = doc.getElementById('mecMois'); e.value = m == null ? '' : String(m); e.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const videCaches = () => {
    for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) for (const f of win.DB[b][m]) {
      delete f.__vs; delete f.__cg;
    }
  };
  // Abattement annonce → transaction, appliqué en simulation par un facteur sur le résultat.
  let ABATT = 1;
  const vv = (f, km, usage, an, mois, regime) => {
    setFY(an); setFM(mois || null);
    const r = win.computeVV(f, km, 'normal', usage, null, CY, null, regime || 'aucun', mois || null, 9);
    return r ? { ...r, vv: Math.round(r.vv * ABATT / 100) * 100 } : null;
  };
  const trouve = (marque, modele, motif) => {
    const l = win.DB[marque] && win.DB[marque][modele];
    if (!l) return null;
    return motif ? (l.find(x => new RegExp(motif, 'i').test(x.v)) || l[0]) : l[0];
  };

  // ── Cas de référence, couvrant gammes, âges, kilométrages et usages ──
  const CAS = [
    ['Toyota', 'Toyota Agya', '1.2 L VVTi$', 2022, 7, 78160, 'location', 'cas signalé par l\'expert'],
    ['Toyota', 'Toyota Agya', '1.2 L VVTi$', 2022, 7, 78160, 'particulier', 'même véhicule, usage privé'],
    ['Toyota', 'Toyota Agya Populaire', null, 2022, 7, 80000, 'particulier', 'jumelle populaire'],
    ['Hyundai', 'Hyundai i10', null, 2022, null, 60000, 'particulier', 'citadine récente'],
    ['KIA', 'KIA Picanto', null, 2019, null, 105000, 'particulier', 'citadine 7 ans'],
    ['Peugeot', 'Peugeot 208', '1.2 L Active', 2018, null, 150000, 'particulier', 'citadine 8 ans'],
    ['Renault', 'Renault Clio', null, 2016, null, 190000, 'particulier', 'citadine 10 ans'],
    ['Renault', 'Renault Symbol', null, 2013, null, 250000, 'taxi', 'berline ex-taxi'],
    ['Volkswagen', 'Volkswagen Golf 7', null, 2015, null, 180000, 'particulier', 'compacte 11 ans'],
    ['Nissan', 'Nissan Qashqai', null, 2018, null, 140000, 'particulier', 'SUV 8 ans'],
    ['Volkswagen', 'Volkswagen Tiguan', null, 2022, null, 70000, 'particulier', 'SUV récent'],
    ['Hyundai', 'Hyundai Tucson', null, 2020, null, 120000, 'pro', 'SUV société'],
    ['BMW', 'BMW Série 3', null, 2017, null, 160000, 'particulier', 'premium 9 ans'],
    ['Mercedes-Benz', 'Mercedes-Benz Classe C', null, 2013, null, 260000, 'particulier', 'premium 13 ans'],
    ['Dacia', 'Dacia Sandero', null, 2021, null, 90000, 'location', 'ex-location récente'],
  ];

  // ── Jeux de paramètres ──
  const base = { gp: P.gammes[0].tauxDeprAn, hg: P.gammes[1].tauxDeprAn, lx: P.gammes[2].tauxDeprAn,
                 km: P.malusPar10000km, loc: P.usages.location.coef };
  const applique = j => {
    P.gammes[0].tauxDeprAn = j.gp; P.gammes[1].tauxDeprAn = j.hg; P.gammes[2].tauxDeprAn = j.lx;
    P.malusPar10000km = j.km; P.usages.location.coef = j.loc; ABATT = j.abatt;
    videCaches();
  };
  const JEUX = [
    { nom: 'ACTUEL (v54)', gp: base.gp, hg: base.hg, lx: base.lx, km: base.km, loc: base.loc, abatt: 1 },
    { nom: 'P1 taux+km mesurés', gp: 0.068, hg: 0.0698, lx: 0.0833, km: 0.0091, loc: base.loc, abatt: 1 },
    { nom: 'P2 = P1 + location 0,80', gp: 0.068, hg: 0.0698, lx: 0.0833, km: 0.0091, loc: 0.80, abatt: 1 },
    { nom: 'P3 = P2 + abattement 7 %', gp: 0.068, hg: 0.0698, lx: 0.0833, km: 0.0091, loc: 0.80, abatt: 0.93 },
  ];

  // ── Performance globale face aux annonces (même méthode que validation.js) ──
  const existe = {};
  for (const b of Object.keys(win.DB)) for (const m of Object.keys(win.DB[b])) existe[m] = true;
  const cle = (n, a) => existe[n] ? n : /^Volkswagen Golf$/i.test(n)
    ? (a >= 2020 ? 'Volkswagen Golf 8' : a >= 2013 ? 'Volkswagen Golf 7' : 'Volkswagen Golf 6') : null;
  function pickFin(k, mec) {
    let br = null; for (const b of Object.keys(win.DB)) if (win.DB[b][k]) br = b;
    if (!br) return null;
    const f = win.DB[br][k];
    const d = f.filter(x => win.yOf(x.d0) <= mec && mec <= win.yOf(x.d) + 1);
    const pool = d.length ? d : f;
    const t = pool.slice().sort((a, b) => a.p - b.p);
    return t[Math.floor(t.length / 2)] || null;
  }
  const lignes = fs.readFileSync('marche_occasion.csv', 'utf8').trim().split(/\r?\n/).slice(1);
  const annonces = [];
  for (const l of lignes) {
    const [mo, aS, pS, kS] = l.split(';');
    const an = +aS, pr = +pS; const kT = kS == null ? '' : kS.trim();
    const km = kT === '' ? null : +kT;
    const k = cle(mo, an); if (!k) continue;
    if (!(an >= 2005 && an <= CY) || !(pr >= 8000 && pr <= 400000)) continue;
    const fin = pickFin(k, an); if (!fin) continue;
    const ven = win.computeVEN(fin, an, CY).VEN;
    if (!(pr / ven >= 0.03 && pr / ven <= 1.30)) continue;
    annonces.push({ mo, k, an, pr, km, age: CY - an });
  }
  const groupes = {};
  for (const r of annonces) { const t = Math.floor(r.age / 3) * 3; (groupes[r.mo + '|' + t] = groupes[r.mo + '|' + t] || []).push(r); }

  const perf = () => {
    const ecarts = [];
    for (const key of Object.keys(groupes)) {
      const g = groupes[key]; if (g.length < 4) continue;
      const ageMed = med(g.map(r => r.age));
      const kmMed = med(g.map(r => r.km).filter(x => x != null && isFinite(x)));
      const marche = med(g.map(r => r.pr));
      const fin = pickFin(g[0].k, CY - Math.round(ageMed));
      const r = vv(fin, kmMed, 'particulier', CY - Math.round(ageMed));
      if (r) ecarts.push(r.vv / marche - 1);
    }
    return { n: ecarts.length, median: med(ecarts), abs: med(ecarts.map(Math.abs)),
             sous20: ecarts.filter(e => Math.abs(e) <= 0.20).length };
  };

  const resultats = {};
  for (const j of JEUX) {
    applique(j);
    const cas = CAS.map(([mq, mo, mt, an, mois, km, us, note]) => {
      const f = trouve(mq, mo, mt);
      if (!f) return { nom: mo, vv: null, note };
      const r = vv(f, km, us, an, mois, /populaire/i.test(mo) ? 'populaire' : 'aucun');
      return { nom: mo + (mt ? ' ' + f.v : ''), an, km, us, note, vv: r ? r.vv : null };
    });
    resultats[j.nom] = { cas, perf: perf(), jeu: j };
  }

  console.log('══════ CAS DE RÉFÉRENCE — valeur vénale selon le jeu de paramètres ══════\n');
  const noms = JEUX.map(j => j.nom);
  console.log('véhicule'.padEnd(34) + 'MEC'.padStart(6) + 'km'.padStart(9) + 'usage'.padStart(13) +
    noms.map(n => n.slice(0, 13).padStart(15)).join(''));
  for (let i = 0; i < CAS.length; i++) {
    const l = resultats[noms[0]].cas[i];
    console.log(l.nom.slice(0, 33).padEnd(34) + String(l.an).padStart(6) + dt(l.km).padStart(9) + String(l.us).padStart(13) +
      noms.map(n => (resultats[n].cas[i].vv != null ? dt(resultats[n].cas[i].vv) : '—').padStart(15)).join(''));
  }

  console.log('\n══════ PERFORMANCE GLOBALE face aux 561 annonces (usage particulier) ══════');
  console.log('jeu'.padEnd(26) + 'biais médian'.padStart(14) + 'écart abs. médian'.padStart(19) + 'groupes < 20 %'.padStart(16));
  for (const n of noms) {
    const p = resultats[n].perf;
    console.log(n.padEnd(26) + ((p.median >= 0 ? '+' : '') + (p.median * 100).toFixed(1) + ' %').padStart(14) +
      ((p.abs * 100).toFixed(1) + ' %').padStart(19) + (p.sous20 + ' / ' + p.n).padStart(16));
  }

  console.log('\nRappel : les annonces sont des prix DEMANDÉS. Une valeur vénale de transaction doit');
  console.log('se situer un peu EN DESSOUS — un biais médian légèrement négatif est donc l\'objectif,');
  console.log('pas un biais nul.');
}, 900);
