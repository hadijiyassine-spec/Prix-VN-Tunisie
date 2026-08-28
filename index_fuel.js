// Évolution 2025->2026 par type de motorisation : permet de voir si la réforme
// fiscale LDF 2026 est DÉJÀ visible dans les prix de la base (auquel cas il ne
// faut pas la ré-appliquer via un coefficient législatif).
global.window = {};
const fs = require('fs');
eval(fs.readFileSync('data.js', 'utf8'));

function yOf(d) { return parseInt((d || '').split('.')[2] || 0); }
function fuelClass(fuel) {
  if (!fuel) return 'essence';
  const fl = fuel.toLowerCase();
  if (fuel.includes('⚡') || fl.includes('élec') || fl.includes('elec') || fl.includes('bev')) return 'elec';
  if (fuel.includes('🔌') || fl.includes('phev') || fl.includes('rech')) return 'phev';
  if (fuel.includes('🌿') || fl.includes('hev') || fl.includes('hybr')) return 'hev';
  if (fuel.includes('💨') || fl.includes('gpl') || fl.includes('cng')) return 'gpl';
  if (fl.includes('diesel')) return 'diesel';
  return 'essence';
}
function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

const rows = [];
for (const b of Object.keys(window.DB)) {
  for (const m of Object.keys(window.DB[b])) {
    for (const f of window.DB[b][m]) {
      const byYear = {};
      for (const h of f.hist) byYear[yOf(h.d)] = h.p;
      rows.push({ fc: fuelClass((f.eg && f.eg.fuel) || (f.sp && f.sp.carburant)), byYear, name: b + ' ' + m + ' ' + f.v });
    }
  }
}

for (const pair of [[2024, 2025], [2025, 2026]]) {
  const [Y1, Y2] = pair;
  console.log('\n=== ' + Y1 + ' -> ' + Y2 + ' par motorisation ===');
  const groups = {};
  for (const r of rows) {
    if (r.byYear[Y1] !== undefined && r.byYear[Y2] !== undefined && r.byYear[Y1] > 0) {
      (groups[r.fc] = groups[r.fc] || []).push({ ratio: r.byYear[Y2] / r.byYear[Y1], name: r.name });
    }
  }
  for (const fc of ['essence', 'diesel', 'hev', 'phev', 'elec', 'gpl']) {
    const g = groups[fc] || [];
    if (!g.length) { console.log(fc.padEnd(8), 'aucune paire'); continue; }
    const med = median(g.map(x => x.ratio));
    const nDown = g.filter(x => x.ratio < 0.98).length;
    console.log(
      fc.padEnd(8),
      'n=' + String(g.length).padStart(4),
      'médiane=' + ((med - 1) * 100).toFixed(2).padStart(7) + '%',
      'min=' + ((Math.min(...g.map(x => x.ratio)) - 1) * 100).toFixed(1) + '%',
      'max=' + ((Math.max(...g.map(x => x.ratio)) - 1) * 100).toFixed(1) + '%',
      '· baisses>2%: ' + nDown + '/' + g.length
    );
  }
  // détail PHEV
  const ph = groups['phev'] || [];
  if (ph.length) {
    console.log('  détail PHEV :');
    ph.slice(0, 12).forEach(x => console.log('    ' + ((x.ratio - 1) * 100).toFixed(1).padStart(7) + '%  ' + x.name));
  }
}

// Combien de finitions PHEV/BEV ont un prix daté 2026 (donc déjà post-réforme) ?
console.log('\n=== Couverture des prix 2026 par motorisation ===');
const cov = {};
for (const r of rows) {
  const last = Math.max(...Object.keys(r.byYear).map(Number));
  cov[r.fc] = cov[r.fc] || { total: 0, y2026: 0 };
  cov[r.fc].total++;
  if (last >= 2026) cov[r.fc].y2026++;
}
for (const fc of Object.keys(cov)) {
  const c = cov[fc];
  console.log(fc.padEnd(8), c.y2026 + '/' + c.total, 'finitions ont un dernier prix en 2026 (' + (100 * c.y2026 / c.total).toFixed(0) + '%)');
}
