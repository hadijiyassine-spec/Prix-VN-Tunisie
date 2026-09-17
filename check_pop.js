// Vérification systématique de la règle métier : à paramètres identiques, une version
// populaire ne doit jamais ressortir au-dessus de sa jumelle normale.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const app = fs.readFileSync('index.html','utf8'), data = fs.readFileSync('data.js','utf8');
const dom = new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously', url:'https://e.com/a.html', pretendToBeVisual:true});
const win=dom.window, doc=win.document; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
const setFY=y=>{const el=doc.getElementById('mecIn'); el.value=String(y); el.dispatchEvent(new win.Event('input'));};
setTimeout(()=>{
  const DB=win.DB;
  let n=0, viol=0, egal=0, inf=0, sansJum=0;
  const pires=[];
  for(const b of Object.keys(DB)) for(const m of Object.keys(DB[b])) for(const f of DB[b][m]){
    if(!f.pop) continue;
    if(!f.popJum){ sansJum++; continue; }
    for(let mec=2010; mec<=2026; mec++){
      setFY(mec);
      const rp=win.computeVV(f, 120000, 'normal', 'particulier', null, 2026);
      if(!rp) continue;
      // jumelle : finition normale la moins chère disponible à l'année
      let best=null;
      const dispo=f.popJum.filter(x=>win.yOf(x.d0)<=mec && mec<=win.yOf(x.d)+1);
      const pool=dispo.length?dispo:f.popJum;
      for(const x of pool){ const r=win.computeVV(x,120000,'normal','particulier',null,2026);
        if(r && (best===null || r.vv<best.vv)) best=r; }
      if(!best) continue;
      n++;
      const d=rp.vv-best.vv;
      if(d>0){ viol++; pires.push({m,mec,pop:rp.vv,norm:best.vv,d}); }
      else if(d===0) egal++; else inf++;
    }
  }
  console.log('Couples testés : '+n+'  (finitions populaires sans jumelle : '+sansJum+')');
  console.log('  populaire > normale : '+viol+'   ← doit être 0');
  console.log('  populaire = normale : '+egal);
  console.log('  populaire < normale : '+inf);
  pires.sort((a,b)=>b.d-a.d).slice(0,10).forEach(x=>
    console.log('   ✗ '+x.m+' MEC '+x.mec+' : '+x.pop+' vs '+x.norm+'  (+'+x.d+')'));
  process.exit(viol?1:0);
},900);
