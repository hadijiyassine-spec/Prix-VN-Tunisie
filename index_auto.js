// Indice de prix automobile "matched-model" calculé depuis la base elle-même.
// Méthode : pour chaque finition présente en année Y et en année Y+1, on prend le
// ratio de son dernier prix de Y+1 sur son dernier prix de Y. La médiane de ces
// ratios donne l'évolution des prix "à modèle constant" pour cette année.
// C'est la même logique qu'un indice de prix officiel (on compare le même bien à
// lui-même), appliquée aux 10 474 prix observés de la base.
global.window = {};
const fs = require('fs');
eval(fs.readFileSync('data.js', 'utf8'));

function yOf(d) { return parseInt((d || '').split('.')[2] || 0); }

// Pour chaque finition : année -> dernier prix observé cette année-là.
const series = [];
for (const b of Object.keys(window.DB)) {
  for (const m of Object.keys(window.DB[b])) {
    for (const f of window.DB[b][m]) {
      const byYear = {};
      for (const h of f.hist) byYear[yOf(h.d)] = h.p; // hist trié => le dernier de l'année gagne
      series.push(byYear);
    }
  }
}

const CPI = {2012:.0461,2013:.0532,2014:.0463,2015:.0444,2016:.0363,2017:.0531,2018:.0731,2019:.0672,2020:.0563,2021:.0571,2022:.083,2023:.093,2024:.07,2025:.053};

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

console.log('année | paires | médiane auto | IPC général | écart');
console.log('------|--------|--------------|-------------|------');

const autoRate = {};
for (let Y = 2011; Y <= 2025; Y++) {
  const ratios = [];
  for (const s of series) {
    if (s[Y] !== undefined && s[Y + 1] !== undefined && s[Y] > 0) {
      ratios.push(s[Y + 1] / s[Y]);
    }
  }
  if (ratios.length >= 15) {
    const r = median(ratios) - 1;
    autoRate[Y + 1] = r;
    const cpi = CPI[Y + 1];
    console.log(
      String(Y + 1).padStart(5), '|',
      String(ratios.length).padStart(6), '|',
      (r * 100).toFixed(2).padStart(11) + '%', '|',
      (cpi !== undefined ? (cpi * 100).toFixed(2) + '%' : '   n/a').padStart(11), '|',
      (cpi !== undefined ? ((r - cpi) * 100).toFixed(2) + ' pts' : '')
    );
  } else {
    console.log(String(Y + 1).padStart(5), '|', String(ratios.length).padStart(6), '| (trop peu de paires)');
  }
}

// Indices chaînés base 100 en 2011, pour comparer les cumuls.
let ia = 100, ic = 100;
console.log('\nCumul depuis chaque année jusqu\'à 2026 (multiplicateur à appliquer à un prix de l\'année) :');
console.log('année | auto (base) | IPC général');
for (let Y = 2012; Y <= 2026; Y++) {
  let ma = 1, mc = 1;
  for (let k = Y + 1; k <= 2026; k++) {
    if (autoRate[k] !== undefined) ma *= (1 + autoRate[k]);
    if (CPI[k] !== undefined) mc *= (1 + CPI[k]);
  }
  console.log(String(Y).padStart(5), '|', ('×' + ma.toFixed(3)).padStart(11), '|', ('×' + mc.toFixed(3)).padStart(11));
}

console.log('\nautoRate JSON:', JSON.stringify(Object.fromEntries(Object.entries(autoRate).map(([k, v]) => [k, +v.toFixed(4)]))));
