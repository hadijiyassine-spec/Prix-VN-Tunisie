// Contrôle EXHAUSTIF des contrastes : toute règle qui fixe à la fois un fond et une couleur
// de texte est vérifiée dans les DEUX thèmes. C'est ce contrôle qui manquait — l'audit
// précédent ne testait qu'une liste de paires choisies à la main, et laissait passer les
// jetons dont le RÔLE change entre les thèmes (un vert sombre de fond devenu vert clair).
const fs=require('fs');
const app=fs.readFileSync('index.html','utf8');
const css=app.slice(app.indexOf('<style>')+7, app.indexOf('</style>'));
const bloc=sel=>{const i=css.indexOf(sel); if(i<0) return {}; const a=css.indexOf('{',i);
  let d=0,j=a; for(;j<css.length;j++){ if(css[j]==='{')d++; else if(css[j]==='}'){d--; if(!d)break;} }
  const t=css.slice(a+1,j), o={};
  (t.match(/--[\w-]+:\s*[^;]+/g)||[]).forEach(x=>{const [k,...v]=x.split(':'); o[k.trim()]=v.join(':').trim();});
  return o;};
const light=bloc(':root{'), dark=Object.assign({}, light, bloc(':root[data-theme="dark"]'));
const val=(v,th)=>{ let x=v.trim(), n=0;
  while(/^var\(/.test(x) && n++<5){ const m=x.match(/^var\(\s*(--[\w-]+)\s*(?:,([^)]*))?\)/);
    if(!m) break; x=(th[m[1]]||m[2]||'').trim(); }
  return /^#[0-9A-Fa-f]{3,8}$/.test(x)?x:null; };
const hex=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');
  return [0,2,4].map(i=>parseInt(h.substr(i,2),16));};
const lum=c=>{const s=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
  return .2126*s[0]+.7152*s[1]+.0722*s[2];};
const ratio=(a,b)=>{const l1=lum(hex(a)),l2=lum(hex(b));return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);};

const regles=css.split('}').map(x=>x.trim()).filter(Boolean);
let ko=0, n=0;
for(const [nom,th] of [['CLAIR',light],['SOMBRE',dark]]){
  const prob=[];
  for(const r of regles){
    const i=r.indexOf('{'); if(i<0) continue;
    const sel=r.slice(0,i).trim(), corps=r.slice(i+1);
    if(/^@|^:root/.test(sel)) continue;
    const mb=corps.match(/background(?:-color)?:\s*([^;]+)/);
    const mc=corps.match(/(?:^|;)\s*color:\s*([^;]+)/);
    if(!mb||!mc) continue;
    // les dégradés : on teste les deux bornes
    const fonds=[];
    if(/gradient/.test(mb[1])){ (mb[1].match(/(#[0-9A-Fa-f]{3,8}|var\(--[\w-]+\))/g)||[]).forEach(x=>fonds.push(x)); }
    else fonds.push(mb[1]);
    const c=val(mc[1],th); if(!c) continue;
    for(const f of fonds){
      const b=val(f,th); if(!b) continue;
      n++;
      const rr=ratio(c,b);
      if(rr<4.5) prob.push({sel:sel.slice(0,46), c, b, r:rr});
    }
  }
  console.log('\nThème '+nom+' — '+(prob.length?prob.length+' paire(s) sous 4,5:1':'toutes les paires fond/texte passent 4,5:1'));
  prob.sort((a,b)=>a.r-b.r).forEach(p=>{ko++;
    console.log('  ✗ '+p.r.toFixed(2)+':1  '+p.sel.padEnd(48)+p.c+' sur '+p.b);});
}
console.log('\n'+n+' paires examinées · '+(ko?ko+' à corriger':'aucune anomalie'));
