const { JSDOM } = require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('data.js','utf8');
const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
const win=dom.window, doc=win.document; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
setTimeout(()=>{
  // parcours réel : marque → modèle → finition, sur un électrique
  doc.getElementById('mecIn').value='2023'; doc.getElementById('mecIn').dispatchEvent(new win.Event('input'));
  win.selectBrand('KIA');
  setTimeout(()=>{
    const cl=(sel,txt)=>{const e=[...doc.querySelectorAll(sel)].find(x=>x.textContent.includes(txt));
      if(!e) throw new Error('introuvable '+txt); e.click();};
    cl('#listM .item','KIA EV6');
    setTimeout(()=>{
      const f=doc.querySelector('#listV > *:not(.le)'); if(!f) throw new Error('pas de finition'); f.click();
      setTimeout(()=>{
        const soh=doc.getElementById('vvSoh');
        console.log('champ SOH présent : '+(soh?'oui':'NON'));
        if(soh){ soh.value='84'; soh.dispatchEvent(new win.Event('input')); }
        setTimeout(()=>{
          const bat=doc.querySelector('.bat');
          console.log('bloc batterie rendu : '+(bat?'oui':'NON'));
          if(bat) console.log(bat.textContent.replace(/\s+/g,' ').trim());
          console.log('prix : '+(doc.getElementById('vvPrix')||{}).innerHTML);
          console.log('pastilles : '+[...doc.querySelectorAll('#vvChips .vv-chip')].map(x=>x.textContent).join(' | '));
          const nz=doc.getElementById('vvNotices');
          console.log('notices : '+(nz?nz.textContent.replace(/\s+/g,' ').slice(0,220):'—'));
        },60);
      },60);
    },60);
  },60);
},1000);
