// L'indicateur de confiance prédit-il RÉELLEMENT l'erreur ? On le confronte aux 580 annonces
// de la validation marché : si les estimations dites « fragiles » ne s'écartent pas plus des
// prix réels que les autres, l'indicateur est décoratif et n'a rien à faire dans la fiche.
const { JSDOM } = require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('data.js','utf8');
const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
const win=dom.window, doc=win.document; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
const setFY=y=>{const e=doc.getElementById('mecIn');e.value=String(y);e.dispatchEvent(new win.Event('input'));};
const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):null;};
setTimeout(()=>{
  const existe={};
  for(const b of Object.keys(win.DB)) for(const m of Object.keys(win.DB[b])) existe[m]=true;
  const cle=(n,a)=>existe[n]?n:/^Volkswagen Golf$/i.test(n)?(a>=2020?'Volkswagen Golf 8':a>=2013?'Volkswagen Golf 7':'Volkswagen Golf 6'):null;
  function pickFin(k,mec){
    let br=null; for(const b of Object.keys(win.DB)) if(win.DB[b][k]) br=b;
    if(!br) return null;
    const f=win.DB[br][k];
    const d=f.filter(x=>win.yOf(x.d0)<=mec && mec<=win.yOf(x.d)+1);
    const pool=d.length?d:f;
    const t=pool.slice().sort((a,b)=>a.p-b.p);
    return t[Math.floor(t.length/2)]||null;
  }
  const lignes=fs.readFileSync('marche_occasion.csv','utf8').trim().split('\n').slice(1);
  const par={bonne:[],moyenne:[],faible:[]};
  let n=0;
  for(const l of lignes){
    const [mo,aS,pS,kS]=l.split(';');
    const an=+aS, pr=+pS, km=(kS===''||kS==null||kS==='\r')?null:+kS;
    const k=cle(mo,an); if(!k) continue;
    if(!(an>=2005&&an<=2026)||!(pr>=8000&&pr<=400000)) continue;
    const fin=pickFin(k,an); if(!fin) continue;
    setFY(an);
    const r=win.computeVV(fin,km,'normal','particulier',null,2026,null,null,false,'aucun'); if(!r) continue;
    const ecart=Math.abs(r.vv/pr-1);
    if(!(ecart<3)) continue;
    const c=win.evaluerConfiance(fin,r);
    par[c.niveau].push(ecart*100); n++;
  }
  console.log('Annonces confrontées : '+n+'\n');
  console.log('niveau'.padEnd(10)+'n'.padStart(5)+'   écart absolu médian au prix réel');
  for(const k of ['bonne','moyenne','faible']){
    const a=par[k];
    console.log('  '+k.padEnd(10)+String(a.length).padStart(4)+'        '+(a.length?med(a).toFixed(1)+' %':'—'));
  }
  const mb=med(par.bonne), mf=med(par.faible);
  if(mb!=null&&mf!=null)
    console.log('\n  L\'écart est '+(mf/mb).toFixed(2)+' fois plus grand sur les estimations « fragiles » '+
      (mf>mb?'— l\'indicateur prédit bien l\'erreur.':'— ATTENTION : l\'indicateur ne prédit rien.'));
},900);
