// Comparaison de deux instantanés produits par snapshot.js.
//   node ab_methode.js avant.json apres.json
const fs = require('fs');
const A = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const B = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));

const med = a => { const s = [...a].sort((x, y) => x - y); const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };

const ecarts = [], parAge = {}, gros = [];
const CY = 2026;
for (const k of Object.keys(A)) {
  if (!B[k]) continue;
  const a = A[k].vv, b = B[k].vv;
  if (!(a > 0)) continue;
  const e = b / a - 1;
  ecarts.push(e);
  const an = parseInt(k.split('|')[3]);
  const age = CY - an;
  const tr = age <= 2 ? '0-2 ans' : age <= 5 ? '3-5 ans' : age <= 9 ? '6-9 ans' : age <= 14 ? '10-14 ans' : '15 ans et +';
  (parAge[tr] = parAge[tr] || []).push(e);
  gros.push({ k, a, b, e });
}
gros.sort((x, y) => Math.abs(y.e) - Math.abs(x.e));

console.log('Couples comparés :', ecarts.length);
console.log('Écart médian      :', (med(ecarts) * 100).toFixed(1) + ' %');
console.log('Écart absolu médian:', (med(ecarts.map(Math.abs)) * 100).toFixed(1) + ' %');
console.log('Inchangés (<0,5 %):', (ecarts.filter(e => Math.abs(e) < 0.005).length / ecarts.length * 100).toFixed(0) + ' %');
console.log('Bougent de +5 %   :', (ecarts.filter(e => Math.abs(e) > 0.05).length / ecarts.length * 100).toFixed(0) + ' %');
console.log('Bougent de +10 %  :', (ecarts.filter(e => Math.abs(e) > 0.10).length / ecarts.length * 100).toFixed(0) + ' %');
console.log('Sens : ' + (ecarts.filter(e => e > 0.005).length / ecarts.length * 100).toFixed(0) + ' % à la hausse, ' +
  (ecarts.filter(e => e < -0.005).length / ecarts.length * 100).toFixed(0) + ' % à la baisse');

console.log('\nPar tranche d\'âge du véhicule :');
console.log('tranche      | couples | méd. | méd. abs. | >10 %');
for (const t of ['0-2 ans', '3-5 ans', '6-9 ans', '10-14 ans', '15 ans et +']) {
  const a = parAge[t] || [];
  if (!a.length) continue;
  console.log(t.padEnd(12), '|', String(a.length).padStart(7), '|',
    (med(a) * 100).toFixed(1).padStart(5) + '%', '|',
    (med(a.map(Math.abs)) * 100).toFixed(1).padStart(8) + '%', '|',
    (a.filter(e => Math.abs(e) > 0.10).length / a.length * 100).toFixed(0).padStart(4) + '%');
}

console.log('\n20 plus gros mouvements :');
for (const g of gros.slice(0, 20))
  console.log('  ' + (g.e > 0 ? '+' : '') + (g.e * 100).toFixed(0).padStart(5) + '%  ' +
    String(g.a).padStart(8) + ' -> ' + String(g.b).padStart(8) + '   ' + g.k.replace(/\|/g, ' · '));
