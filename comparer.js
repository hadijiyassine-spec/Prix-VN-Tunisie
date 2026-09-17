// Les deux méthodes, côte à côte, sans rien modifier dans l'application.
//   A — ancrage sur le MILLÉSIME, puis actualisation   (méthode actuelle)
//   B — ancrage sur la VALEUR À NEUF (tarif du jour ou fin de série), puis actualisation
const {JSDOM}=require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('data.js','utf8');
const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
const win=dom.window, doc=win.document; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
const setFY=y=>{const e=doc.getElementById('mecIn');e.value=String(y);e.dispatchEvent(new win.Event('input'));};
setTimeout(()=>{
  const CY=2026;
  const med=a=>{const t=a.slice().sort((x,y)=>x-y),n=t.length;return n?(n%2?t[(n-1)/2]:(t[n/2-1]+t[n/2])/2):0;};
  const duo=(b,m,vn,mec,km)=>{
    const v=win.DB[b][m].find(x=>x.v===vn); if(!v) return null;
    setFY(mec);
    const rA=win.computeVV(v,km,'normal','particulier',null,CY); if(!rA) return null;
    const H=win.histPhase(v,m,mec), der=H[H.length-1], anFin=win.yOf(der.d);
    const venB=win.computeVEN(v, anFin, CY, win.regimeDe(v));
    if(!venB) return null;
    const vvB=Math.round(rA.vv*(venB.VEN/rA.ven.VEN)/100)*100;
    return {v, mec, km, anFin, tarifMil:win.tarifMillesime(v,mec).p, finSerie:der.p,
            venA:Math.round(rA.ven.VEN), venB:Math.round(venB.VEN), vvA:rA.vv, vvB};
  };
  console.log('CAS CONCRETS\n');
  console.log('véhicule'.padEnd(42)+'MEC   valeur à neuf   méthode A   méthode B    écart');
  const cas=[
    ['Renault','Renault Symbol','1.2 Confort',2017,133525],
    ['Renault','Renault Symbol','1.2 Confort',2013,220000],
    ['Renault','Renault Clio','1.0 L SCe Life Plus',2022,80000],
    ['Volkswagen','Volkswagen Polo Sedan','1.4 L Highline',2016,180000],
    ['Skoda','Skoda Kushaq','1.0 TSI Style BVA',2024,40000],
    ['MG','MG 5','1.5 L Confort Plus',2021,110000],
    ['Toyota','Toyota RAV 4 Hybride','2.5 L',2022,90000],
    ['KIA','KIA Picanto','1.0 L LX',2019,120000],
  ];
  for(const c of cas){
    const r=duo(...c); if(!r) { console.log('  '+c[1]+' · '+c[2]+' — introuvable'); continue; }
    console.log('  '+(c[1]+' · '+c[2]).slice(0,38).padEnd(40)+r.mec+'   '+
      (r.finSerie.toLocaleString('fr-FR')).padStart(9)+'   '+
      r.vvA.toLocaleString('fr-FR').padStart(9)+'   '+r.vvB.toLocaleString('fr-FR').padStart(9)+
      '   '+((r.vvB/r.vvA-1)*100>=0?'+':'')+((r.vvB/r.vvA-1)*100).toFixed(1)+' %');
  }
  // effet global
  const e=[];
  for(const b of Object.keys(win.DB)) for(const m of Object.keys(win.DB[b])) for(const f of win.DB[b][m]){
    const mec=Math.max(2012, win.yOf(f.d0));
    setFY(mec);
    const rA=win.computeVV(f,120000,'normal','particulier',null,CY); if(!rA) continue;
    const H=win.histPhase(f,m,mec), der=H[H.length-1];
    const venB=win.computeVEN(f, win.yOf(der.d), CY, win.regimeDe(f)); if(!venB) continue;
    e.push(venB.VEN/rA.ven.VEN-1);
  }
  const abs=e.map(Math.abs);
  console.log('\nEFFET SUR LES 2 522 FINITIONS');
  console.log('  écart médian B/A        : '+(med(e)*100>=0?'+':'')+(med(e)*100).toFixed(1)+' %');
  console.log('  écart absolu médian     : '+(med(abs)*100).toFixed(1)+' %');
  console.log('  écarts de plus de 5 %   : '+abs.filter(x=>x>=0.05).length+' finitions ('+
    (abs.filter(x=>x>=0.05).length/e.length*100).toFixed(0)+' %)');
  console.log('  écarts de plus de 10 %  : '+abs.filter(x=>x>=0.10).length+' finitions ('+
    (abs.filter(x=>x>=0.10).length/e.length*100).toFixed(0)+' %)');
},2000);
