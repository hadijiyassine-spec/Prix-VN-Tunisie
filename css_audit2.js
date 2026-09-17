// Une couleur de texte littérale sans fond à elle est le vrai casseur de thème sombre :
// elle reste noire sur une carte devenue foncée. On les traque.
const fs=require('fs');
const app=fs.readFileSync('index.html','utf8');
const css=app.slice(app.indexOf('<style>')+7, app.indexOf('</style>'));
const regles=css.split('}').map(x=>x.trim()).filter(Boolean);
const suspects=[];
for(const r of regles){
  const i=r.indexOf('{'); if(i<0) continue;
  const sel=r.slice(0,i).trim(), corps=r.slice(i+1);
  if(/^@/.test(sel)||/^:root/.test(sel)) continue;
  const col=corps.match(/(?:^|;)\s*color:\s*(#[0-9A-Fa-f]{3,8})/);
  const bg=/background(?:-color)?:/.test(corps);
  if(col && !bg && !/#fff|#FFF|#FFFFFF/i.test(col[1])) suspects.push(sel+'  → color:'+col[1]);
}
console.log(suspects.length? '✗ couleurs de texte littérales sans fond propre ('+suspects.length+') :' : '✓ aucune couleur de texte littérale sans fond propre');
suspects.forEach(x=>console.log('   '+x));
// fonds littéraux sur de grandes surfaces
const gros=[];
for(const r of regles){
  const i=r.indexOf('{'); if(i<0) continue;
  const sel=r.slice(0,i).trim(), corps=r.slice(i+1);
  if(/^@|^:root/.test(sel)) continue;
  const bg=corps.match(/background(?:-color)?:\s*(#[0-9A-Fa-f]{3,8})/);
  if(bg && /^(html|body|\.app|\.main|\.col|\.sect|\.card|\.panel)/.test(sel)) gros.push(sel+' → '+bg[1]);
}
console.log(gros.length? '✗ grandes surfaces à fond littéral : '+gros.join(', ') : '✓ aucune grande surface à fond littéral');
