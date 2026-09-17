// Les quatre captures d'archive, finition par finition, à leur date de capture.
const {JSDOM}=require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('data.js','utf8');
const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
const win=dom.window; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
setTimeout(()=>{
  const C=[
    ['Volkswagen','Volkswagen Polo Sedan','1.4 L Highline','26.10.2022',72980,null],
    ['Skoda','Skoda Kamiq','1.0 L TSI Style DSG','18.07.2023',96980,null],
    ['Skoda','Skoda Kushaq','1.0 TSI Ambition','17.04.2026',78980,77980],
    ['Skoda','Skoda Kushaq','1.0 TSI Ambition BVA','17.04.2026',85980,84980],
    ['Skoda','Skoda Kushaq','1.0 TSI Style BVA','17.04.2026',92980,90980],
    ['MG','MG 5','1.5 L Confort','07.09.2024',63950,null],
    ['MG','MG 5','1.5 L Confort Plus','07.09.2024',67450,null],
    ['MG','MG 5','1.5 L Luxe BVA','07.09.2024',71950,null],
  ];
  console.log('finition'.padEnd(46)+'capture'.padEnd(13)+'tarif'.padEnd(11)+'promo'.padEnd(11)+'retenu  millésime');
  let ko=0;
  for(const [b,m,vn,d,tarif,promo] of C){
    const v=win.DB[b][m].find(x=>x.v===vn);
    if(!v){console.log('  INTROUVABLE '+m+' · '+vn);ko++;continue;}
    const H=win.tarifsCatalogue(v);
    const pt=H.find(h=>h.d===d);
    const an=parseInt(d.slice(6));
    const tm=win.tarifMillesime(v,an);
    const bon = pt && pt.p===tarif;
    if(!bon) ko++;
    console.log('  '+(m+' · '+vn).slice(0,42).padEnd(44)+d.padEnd(13)+
      String(tarif).padStart(8)+'   '+String(promo||'—').padStart(8)+'   '+
      (pt?String(pt.p).padStart(8):'  absent')+(bon?' ✓':' ✗')+
      '   '+an+' → '+tm.p.toLocaleString('fr-FR'));
    if(promo && H.some(h=>h.p===promo && h.d===d)) { console.log('     ✗ le prix promotionnel a été retenu'); ko++; }
  }
  console.log('\n  '+(ko===0?'les 8 relevés sont en place, aux bonnes dates et aux tarifs catalogue'
                       :ko+' anomalie(s)'));
},1500);
