// Écart entre la VEN retenue par le calcul (ancrage sur le millésime, actualisé) et la
// VALEUR À NEUF au sens de l'expertise : tarif du jour si la finition se vend encore,
// valeur de fin de série sinon.
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
  const vendue=[], retiree=[];
  let n=0;
  for(const b of Object.keys(win.DB)) for(const m of Object.keys(win.DB[b])) for(const f of win.DB[b][m]){
    const H=win.tarifsCatalogue(f);
    const der=H[H.length-1], anFin=win.yOf(der.d);
    const auCat=anFin>=CY-1;
    const mec=Math.max(2012, win.yOf(f.d0));
    setFY(mec);
    const r=win.computeVV(f,120000,'normal','particulier',null,CY);
    if(!r) continue;
    n++;
    // valeur à neuf au sens expertise : tarif du jour, ou fin de série actualisée
    const fc=win.fuelClass((f.eg&&f.eg.fuel)||(f.sp&&f.sp.carburant));
    const vanExp = auCat ? der.p : der.p*win.indexMultiplier(anFin, CY, fc).m;
    const e=r.ven.VEN/vanExp-1;
    (auCat?vendue:retiree).push(e);
  }
  const f=a=>(med(a)*100>=0?'+':'')+(med(a)*100).toFixed(1)+' %';
  console.log('Écart VEN du calcul / valeur à neuf au sens expertise — '+n.toLocaleString('fr-FR')+' finitions\n');
  console.log('  finitions encore vendues ('+vendue.length+') : écart médian '+f(vendue)+
    '   ·   |écart| médian '+(med(vendue.map(Math.abs))*100).toFixed(1)+' %');
  console.log('  finitions retirées      ('+retiree.length+') : écart médian '+f(retiree)+
    '   ·   |écart| médian '+(med(retiree.map(Math.abs))*100).toFixed(1)+' %');
  // exemple parlant
  console.log('\n  exemple — Renault Symbol 1.2 Confort, MEC 2017, 133 525 km :');
  const sy=win.DB.Renault['Renault Symbol'].find(x=>x.v==='1.2 Confort');
  setFY(2017);
  const rs=win.computeVV(sy,133525,'normal','particulier',null,2026);
  const H=win.tarifsCatalogue(sy), d=H[H.length-1];
  const fcs=win.fuelClass((sy.eg&&sy.eg.fuel)||(sy.sp&&sy.sp.carburant));
  console.log('     tarif du millésime 2017      : '+win.tarifMillesime(sy,2017).p.toLocaleString('fr-FR')+' DT');
  console.log('     fin de série (12.02.2019)    : '+d.p.toLocaleString('fr-FR')+' DT');
  console.log('     fin de série actualisée 2026 : '+Math.round(d.p*win.indexMultiplier(2019,2026,fcs).m).toLocaleString('fr-FR')+' DT');
  console.log('     VEN retenue par le calcul    : '+Math.round(rs.ven.VEN).toLocaleString('fr-FR')+' DT');
  console.log('     valeur vénale                : '+rs.vv.toLocaleString('fr-FR')+' DT');
},1500);
