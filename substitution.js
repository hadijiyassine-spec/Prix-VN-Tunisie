// SUBSTITUTION DE GAMME MAL ATTRIBUÉE.
// Quand une finition quitte le catalogue et qu'une autre la remplace au même niveau de gamme,
// le relevé attribue parfois le tarif de la NOUVELLE au slug de l'ANCIENNE, le jour de la
// bascule. La finition sortante hérite alors d'un dernier tarif qui n'est pas le sien, et sa
// valeur de fin de série est faussée.
// Signature : le DERNIER point d'une finition A porte le MÊME prix que le PREMIER point d'une
// finition B du même modèle, à quelques jours d'intervalle — alors que A valait autre chose
// juste avant.
global.window={}; const fs=require('fs');
eval(fs.readFileSync('data.js','utf8'));
const DB=window.DB;
const jours=d=>{const [J,M,A]=d.split('.').map(Number);return Date.UTC(A,M-1,J)/86400000;};
const FEN=75;            // fenêtre de bascule, en jours
const cas=[];
for(const b of Object.keys(DB)) for(const m of Object.keys(DB[b])){
  const F=DB[b][m];
  for(const A of F){
    if(A.hist.length<2) continue;
    const der=A.hist[A.hist.length-1], avant=A.hist[A.hist.length-2];
    if(der.p===avant.p) continue;                     // pas de saut sur le dernier point
    for(const B of F){
      if(B===A || !B.hist.length) continue;
      const prem=B.hist[0];
      if(prem.p!==der.p) continue;                    // le prix doit coïncider exactement
      const dt=jours(prem.d)-jours(der.d);
      if(Math.abs(dt)>FEN) continue;
      if(jours(B.hist[0].d) < jours(avant.d)) continue; // B existait déjà avant : pas un remplacement
      // Deux discriminants : l'écart de dates entre la bascule et le dernier point de A, et
      // le TEMPS D'INACTIVITÉ de A avant ce dernier point. Une finition qui n'a plus bougé
      // depuis des années et qui prend soudain le prix exact d'une nouvelle finition n'a pas
      // augmenté : elle a été confondue avec celle qui l'a remplacée.
      const dormance = jours(der.d)-jours(avant.d);
      const force = (Math.abs(dt)<=15 ? 2 : 0) + (dormance>=365 ? 2 : dormance>=180 ? 1 : 0);
      cas.push({b,m,A:A.v,B:B.v,dA:der.d,dB:prem.d,prix:der.p,
                vrai:avant.p, dVrai:avant.d, dt, dormance, force,
                ecart:der.p/avant.p-1, nB:B.hist.length});
      break;
    }
  }
}
cas.sort((x,y)=>(y.force-x.force)||(Math.abs(y.ecart)-Math.abs(x.ecart)));
console.log('SUBSTITUTIONS DE GAMME MAL ATTRIBUÉES — fenêtre de '+FEN+' jours\n');
console.log('  cas détectés : '+cas.length+' sur '+
  Object.values(DB).reduce((s,mm)=>s+Object.values(mm).reduce((t,ff)=>t+ff.length,0),0)+' finitions\n');
const et=f=>'◆'.repeat(f)+'·'.repeat(4-f);
console.log('  preuve  modèle / finition sortante'.padEnd(54)+'vraie fin de série'.padEnd(26)+
  'bascule'.padEnd(12)+'dormance'.padEnd(10)+'écart');
for(const c of cas){
  console.log('  '+et(c.force)+'  '+(c.m+' · '+c.A).slice(0,44).padEnd(46)+
    (c.vrai.toLocaleString('fr-FR')+' ('+c.dVrai+')').padEnd(26)+
    (Math.abs(c.dt)+' j').padStart(6)+'     '+
    (c.dormance>=365?(c.dormance/365).toFixed(1)+' ans':c.dormance+' j').padStart(8)+'  '+
    ((c.ecart>0?'+':'')+(c.ecart*100).toFixed(0)+' %').padStart(6)+
    '  (relevé à '+c.prix.toLocaleString('fr-FR')+')');
}
console.log('\n  ◆◆◆◆ = bascule sous 15 jours ET finition dormante depuis plus d\'un an');
console.log('  '+cas.filter(c=>c.force>=3).length+' cas à preuve forte (◆◆◆ ou ◆◆◆◆)  ·  '+
  cas.filter(c=>c.force<3).length+' à confirmer');
fs.writeFileSync('substitutions.json',JSON.stringify(cas,null,1));
