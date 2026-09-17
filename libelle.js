// Deux libellés à vérifier sur toute la base :
//  · « fin de série <année du millésime> » — or le millésime n'est la fin de série que si la
//    finition a cessé d'être cataloguée cette année-là ;
//  · « Tarif du jour de cette finition » — or une finition retirée du catalogue n'a plus de
//    tarif du jour : son dernier tarif est sa VALEUR DE FIN DE SÉRIE.
global.window={}; const fs=require('fs');
eval(fs.readFileSync('data.js','utf8'));
const DB=window.DB, yOf=d=>parseInt(d.slice(6));
const CY=2026;
let fin=0, cour=0, couples=0, fauxFinSerie=0, fauxTarifJour=0;
const ex=[];
for(const b of Object.keys(DB)) for(const m of Object.keys(DB[b])) for(const f of DB[b][m]){
  const dern=yOf(f.d);
  const encore = dern>=CY-1;         // tarif de 2025 ou 2026 : encore au catalogue
  if(encore) cour++; else fin++;
  const y0=yOf(f.d0);
  for(let y=y0; y<=CY; y++){
    // le millésime a-t-il un tarif propre ?
    const dans=f.hist.filter(h=>yOf(h.d)===y);
    if(!dans.length && y>dern) continue;
    couples++;
    if(dans.length && y!==dern) fauxFinSerie++;       // libellé « fin de série <y> » abusif
    if(!encore && dans.length) fauxTarifJour++;        // libellé « tarif du jour » abusif
  }
  if(!encore && ex.length<8 && f.hist.length>6)
    ex.push({m,v:f.v,fin:f.p,d:f.d});
}
console.log('finitions encore au catalogue : '+cour+'   ·   retirées : '+fin+
  '  ('+(fin/(fin+cour)*100).toFixed(0)+' %)');
console.log('couples finition × millésime avec tarif propre : '+couples.toLocaleString('fr-FR'));
console.log('  dont libellés « fin de série <millésime> » abusifs : '+fauxFinSerie.toLocaleString('fr-FR')+
  '  ('+(fauxFinSerie/couples*100).toFixed(0)+' %)');
console.log('  dont libellés « tarif du jour » sur finition retirée : '+fauxTarifJour.toLocaleString('fr-FR')+
  '  ('+(fauxTarifJour/couples*100).toFixed(0)+' %)');
console.log('\nexemples de vraies valeurs de fin de série :');
ex.forEach(x=>console.log('   '+(x.m+' · '+x.v).slice(0,46).padEnd(48)+
  x.fin.toLocaleString('fr-FR').padStart(9)+' DT au '+x.d));
// répartition des années de fin de série
const parAn={};
for(const b of Object.keys(DB)) for(const m of Object.keys(DB[b])) for(const f of DB[b][m]){
  const y=yOf(f.d); if(y<CY-1) parAn[y]=(parAn[y]||0)+1;
}
console.log('\nannées de fin de série des finitions retirées :');
console.log('   '+Object.keys(parAn).sort().map(y=>y+' : '+parAn[y]).join('  ·  '));
