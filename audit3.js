const { JSDOM } = require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('data.js','utf8');
const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
const win=dom.window, doc=win.document; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
const setFY=y=>{const e=doc.getElementById('mecIn');e.value=String(y);e.dispatchEvent(new win.Event('input'));};
setTimeout(()=>{
  const ech=[]; let i=0;
  for(const b of Object.keys(win.DB)) for(const m of Object.keys(win.DB[b])) for(const f of win.DB[b][m])
    if((i++)%12===0) ech.push({b,m,f});
  const inv=[], invPop=[];
  for(const x of ech){
    const serie=[];
    for(let mec=2008; mec<=2026; mec++){
      setFY(mec); const r=win.computeVV(x.f,120000,'normal','particulier',null,2026);
      if(r) serie.push({mec,vv:r.vv,st:r.ven.popStatut});
    }
    for(let j=1;j<serie.length;j++) if(serie[j].vv<serie[j-1].vv-0.5){
      const o={n:x.m+' · '+x.f.v,mec:serie[j].mec,a:serie[j-1].vv,b:serie[j].vv,g:1-serie[j].vv/serie[j-1].vv};
      // bascule d'incessibilité d'un véhicule populaire : discontinuité VOULUE
      (serie[j-1].st==='majore'&&serie[j].st==='incessible') ? invPop.push(o) : inv.push(o);
    }
  }
  console.log('Inversions d\'âge restantes : '+inv.length+'  (+ '+invPop.length+
    ' dues à la bascule d\'incessibilité des populaires, voulues)');
  inv.sort((a,b)=>b.g-a.g);
  inv.slice(0,6).forEach(x=>console.log('   '+x.n.padEnd(42)+' MEC '+(x.mec-1)+'→'+x.mec+' : '+
    x.a.toLocaleString('fr-FR')+' → '+x.b.toLocaleString('fr-FR')+'  (−'+(x.g*100).toFixed(0)+' %)'));
},900);
