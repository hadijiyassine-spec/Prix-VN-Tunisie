// A/B : l'application doit rendre EXACTEMENT les mêmes valeurs avec la base corrigée qu'avec
// l'ancienne base corrigée à l'exécution par RELEVES_VERIFIES. C'est la preuve que le
// correctif est fidèle — et que la double application est sans effet.
const {JSDOM}=require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8');
function monte(fdata){
  const data=fs.readFileSync(fdata,'utf8');
  const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
    {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
  const w=dom.window; w.requestAnimationFrame=cb=>setTimeout(cb,0);
  if(!w.Element.prototype.scrollIntoView) w.Element.prototype.scrollIntoView=function(){};
  return w;
}
const A=monte('data.js'), B=monte('data.js.new');
setTimeout(()=>{
  const setFY=(w,y)=>{const e=w.document.getElementById('mecIn');e.value=String(y);
    e.dispatchEvent(new w.Event('input'));};
  let n=0, ecarts=[];
  for(const b of Object.keys(A.DB)) for(const m of Object.keys(A.DB[b])){
    for(let i=0;i<A.DB[b][m].length;i++){
      const fa=A.DB[b][m][i], fb=B.DB[b][m][i];
      if(fa.v!==fb.v){ ecarts.push('ordre des finitions : '+m); continue; }
      const mec=Math.max(2012, A.yOf(fa.d0));
      setFY(A,mec); setFY(B,mec);
      const ra=A.computeVV(fa,120000,'normal','particulier',null,2026);
      const rb=B.computeVV(fb,120000,'normal','particulier',null,2026);
      n++;
      if(!ra||!rb){ if(!!ra!==!!rb) ecarts.push('calcul absent d\'un côté : '+m+' '+fa.v); continue; }
      if(ra.vv!==rb.vv || Math.abs(ra.ven.VEN-rb.ven.VEN)>0.5)
        ecarts.push((m+' · '+fa.v).slice(0,46)+' : '+ra.vv+' vs '+rb.vv);
      // et les tarifs catalogue retenus doivent être identiques
      const sa=A.tarifsCatalogue(fa).map(h=>h.d+':'+h.p).join('|');
      const sb=B.tarifsCatalogue(fb).map(h=>h.d+':'+h.p).join('|');
      if(sa!==sb) ecarts.push('série différente : '+m+' · '+fa.v);
    }
  }
  console.log('finitions comparées : '+n.toLocaleString('fr-FR'));
  console.log('écarts : '+ecarts.length+(ecarts.length?'':'   ← les deux bases donnent le même résultat'));
  ecarts.slice(0,12).forEach(x=>console.log('   ✗ '+x));
  // indice de prix : il est recalculé depuis la base, il doit rester cohérent
  const ia=A.indice(), ib=B.indice();
  console.log('\nindice 2026, général : '+(ia.annees[2026]*100).toFixed(2)+' % (avant)  ·  '+
    (ib.annees[2026]*100).toFixed(2)+' % (après)');
  for(const e of ['essence','diesel','hev','phev','elec']){
    const a=ia.parEnergie[2026]&&ia.parEnergie[2026][e], b=ib.parEnergie[2026]&&ib.parEnergie[2026][e];
    if(a!==undefined||b!==undefined)
      console.log('   '+e.padEnd(8)+(a===undefined?'—':(a*100).toFixed(2)+' %').padStart(9)+'  →  '+
        (b===undefined?'—':(b*100).toFixed(2)+' %').padStart(9));
  }
},2500);
