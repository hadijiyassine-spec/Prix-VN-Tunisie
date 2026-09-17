// Détecte les SAUTS DE TARIF qui ne ressemblent pas à une hausse de marché : candidats à un
// changement de génération ou à un restylage. Le repère n'est pas la hausse absolue mais
// l'ÉCART au mouvement du marché de la même énergie, la même année.
const {JSDOM}=require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('data.js','utf8');
const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
const win=dom.window; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
setTimeout(()=>{
  const IX=win.indice(), DB=win.DB, GENS=win.GENS||{};
  const CY=2026;
  const tauxDe=(y,fc)=>{
    const pe=IX.parEnergie[y];
    if(pe&&pe[fc]!==undefined) return pe[fc];
    if(IX.annees[y]!==undefined) return IX.annees[y];
    return IX.tauxPredit;
  };
  const cands=[];
  for(const b of Object.keys(DB)) for(const m of Object.keys(DB[b])) for(const f of DB[b][m]){
    const fc=win.fuelClass((f.eg&&f.eg.fuel)||(f.sp&&f.sp.carburant));
    const H=f.hist;
    for(let i=1;i<H.length;i++){
      const a=H[i-1], c=H[i];
      if(!(a.p>0)) continue;
      const hausse=c.p/a.p-1;
      if(hausse<0.08) continue;                        // un saut, pas une révision
      const y0=win.yOf(a.d), y1=win.yOf(c.d);
      // mouvement de marché attendu entre les deux points
      let attendu=1;
      for(let y=y0+1;y<=y1;y++) attendu*=(1+tauxDe(y,fc));
      if(y0===y1) attendu=1;                            // même année : aucun mouvement attendu
      const ecart=(1+hausse)/attendu-1;
      if(ecart<0.07) continue;                          // aligné sur le marché : pas un saut
      cands.push({b,m,v:f.v,fc,d0:a.d,d1:c.d,p0:a.p,p1:c.p,hausse,attendu:attendu-1,ecart,
        dernier:i===H.length-1, gens:GENS[m]?GENS[m].length:0});
    }
  }
  cands.sort((x,y)=>y.ecart-x.ecart);
  console.log('Sauts de tarif divergeant du marché : '+cands.length+' sur '+
    Object.values(DB).reduce((s,mm)=>s+Object.values(mm).reduce((t,ff)=>t+ff.length,0),0)+' finitions\n');
  const recents=cands.filter(c=>win.yOf(c.d1)>=2024);
  console.log('── Les plus marqués depuis 2024 (modèles encore au catalogue) ──');
  console.log('modèle'.padEnd(38)+'finition'.padEnd(26)+'  saut          écart/marché  date');
  for(const c of recents.slice(0,40))
    console.log((c.b+' '+c.m).slice(0,37).padEnd(38)+c.v.slice(0,25).padEnd(26)+
      ' '+c.p0.toLocaleString('fr-FR').padStart(8)+'→'+c.p1.toLocaleString('fr-FR').padStart(8)+
      '  '+((c.ecart*100).toFixed(0)+' %').padStart(6)+'      '+c.d1+(c.dernier?'  ← tarif courant':''));
  fs.writeFileSync('phases_candidats.json',JSON.stringify(cands,null,1));
  console.log('\n('+cands.length+' candidats écrits dans phases_candidats.json)');
},1200);
