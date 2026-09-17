// Invariant : la valeur vénale d'un véhicule encore commercialisé ne peut pas dépasser son
// prix neuf du jour. On sonde le cas le PLUS favorable (état excellent, très peu de km).
const { JSDOM } = require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('data.js','utf8');
const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
const win=dom.window, doc=win.document; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
const setFY=y=>{const e=doc.getElementById('mecIn');e.value=String(y);e.dispatchEvent(new win.Event('input'));};
setTimeout(()=>{
  const AE=2026; let n=0, viol=0; const pires=[];
  const etats=Object.keys(win.eval('VVPARAMS').etats);
  console.log('états :', etats.join(', '));
  for(const b of Object.keys(win.DB)) for(const m of Object.keys(win.DB[b])) for(const f of win.DB[b][m]){
    const pn=win.prixNeufCourant(f,AE); if(pn==null) continue;
    for(let mec=Math.max(2015,win.yOf(f.d0)); mec<=AE; mec++){
      setFY(mec);
      for(const e of etats){
        const r=win.computeVV(f,1000,e,'particulier',null,AE); if(!r) continue;
        n++;
        // Une populaire au-delà de 2 ans dépasse LÉGITIMEMENT son prix subventionné :
        // c'est précisément l'objet de la réintégration douanière. On l'exclut de l'invariant.
        if(r.ven.popStatut==='majore') continue;
        if(r.vv>pn){ viol++; pires.push({m:m+' · '+f.v,mec,e,vv:r.vv,pn,ec:r.vv/pn-1}); }
      }
    }
  }
  console.log('Cas testés : '+n+' — valeur vénale > prix neuf du jour : '+viol);
  pires.sort((a,b)=>b.ec-a.ec).slice(0,8).forEach(x=>
    console.log('   '+x.m.padEnd(42)+' MEC '+x.mec+' '+x.e.padEnd(10)+x.vv.toLocaleString('fr-FR')+
      ' vs '+x.pn.toLocaleString('fr-FR')+'  (+'+(x.ec*100).toFixed(0)+' %)'));
},900);
