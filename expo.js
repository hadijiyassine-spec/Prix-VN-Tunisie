// Classe les sauts par EXPOSITION : combien de millésimes se retrouvent rattachés à un tarif
// qui n'est peut-être plus celui de leur phase, et de combien.
const fs=require('fs');
const cands=JSON.parse(fs.readFileSync('phases_candidats.json','utf8'));
global.window={}; eval(fs.readFileSync('data.js','utf8'));
const DB=window.DB, GENS=window.GENS||{};
const yOf=d=>parseInt(d.slice(6));
// on ne garde que les sauts qui aboutissent au TARIF COURANT d'une finition encore vendue
const parModele={};
for(const c of cands){
  if(!c.dernier) continue;
  if(yOf(c.d1)<2025) continue;
  const k=c.b+' | '+c.m;
  const fins=DB[c.b][c.m];
  const y0=Math.min(...fins.map(f=>yOf(f.d0)));
  const millesimesAvant=yOf(c.d1)-y0;
  const e=(parModele[k]=parModele[k]||{b:c.b,m:c.m,ecart:0,d1:c.d1,p0:0,p1:0,ans:millesimesAvant,
    gens:GENS[c.m]?GENS[c.m].map(g=>g.gen+' '+g.y0+'-'+(g.y1||'')).join(' / '):'—',nf:0});
  e.nf++;
  if(c.ecart>e.ecart){ e.ecart=c.ecart; e.p0=c.p0; e.p1=c.p1; e.d1=c.d1; }
}
const L=Object.values(parModele).map(e=>({...e,score:e.ecart*e.ans})).sort((a,b)=>b.score-a.score);
console.log('Modèles encore au catalogue dont le TARIF COURANT résulte d\'un saut\n'+
            'divergeant du marché — classés par exposition (écart × millésimes concernés)\n');
console.log('#   modèle'.padEnd(44)+'saut courant'.padEnd(24)+'écart  millés.  générations connues');
L.slice(0,45).forEach((e,i)=>console.log(
  String(i+1).padStart(2)+'  '+(e.b+' '+e.m).slice(0,39).padEnd(42)+
  (e.p0.toLocaleString('fr-FR')+'→'+e.p1.toLocaleString('fr-FR')).padStart(19)+'  '+
  ((e.ecart*100).toFixed(0)+'%').padStart(5)+'   '+String(e.ans).padStart(3)+'    '+e.gens));
console.log('\ntotal modèles concernés : '+L.length);
fs.writeFileSync('phases_modeles.json',JSON.stringify(L,null,1));
