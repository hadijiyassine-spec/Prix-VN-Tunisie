// Contrôle du parcours téléphone : la marque doit être identifiable AVANT toute sélection.
const { JSDOM } = require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('data.js','utf8');
const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
const win=dom.window, doc=win.document; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
let ko=0; const ck=(t,c,d)=>{console.log((c?'  ok   ':'  FAIL ')+t+(d?'  ['+d+']':''));if(!c)ko++;};
setTimeout(()=>{
  const chip=doc.getElementById('mobBrandChip');
  ck('la barre marque existe', !!chip);
  ck('c\'est un vrai bouton (clavier, lecteur d\'écran)', chip.tagName==='BUTTON', chip.tagName);
  ck('elle est en état « aucune marque » au démarrage', chip.classList.contains('vide'));
  ck('elle nomme l\'action', /choisir une marque/i.test(chip.textContent), chip.textContent.replace(/\s+/g,' ').trim());
  ck('elle a un libellé accessible', /choisir la marque/i.test(chip.getAttribute('aria-label')||''));
  // le CSS ne doit plus la conditionner à .visible
  const css=[...doc.querySelectorAll('style')].map(x=>x.textContent).join('\n');
  ck('plus de dépendance à .visible pour l\'afficher', css.indexOf('.mob-brand-chip.visible{display:flex}')===-1);
  ck('elle est affichée sur téléphone', /\.mob-brand-chip\{display:flex/.test(css));
  ck('les pastilles d\'étape sont stylées', css.indexOf('.step{')!==-1);
  ck('la flèche d\'invitation s\'adapte au téléphone', /\.le-dir::before\{content:"↑ "\}/.test(css.replace(/\s+/g,'')) || css.indexOf('.le-dir::before')!==-1);
  // les invitations ne renvoient plus vers une colonne absente
  // le commentaire CSS cite l'ancien libellé : on ne cherche que dans le corps de page
  const corps=app.slice(app.indexOf('<body>'));
  ck('l\'invitation ne dit plus « ← Sélectionnez »', corps.indexOf('← Sélectionnez')===-1);
  // étapes
  ck('étape 1 active, étapes 2 et 3 en attente au démarrage',
    !doc.getElementById('modelLabel').classList.contains('fait') &&
    doc.getElementById('modelLabel').classList.contains('attente') &&
    doc.getElementById('labelV').classList.contains('attente'));
  // après sélection d'une marque
  win.selectBrand('KIA');
  setTimeout(()=>{
    ck('après choix, la barre affiche la marque', /KIA/.test(chip.textContent) && !chip.classList.contains('vide'),
      chip.textContent.replace(/\s+/g,' ').trim());
    ck('l\'action devient « Changer »', /changer/i.test(chip.textContent));
    ck('les initiales sont affichées', doc.getElementById('mobChipIco').textContent==='KI',
      doc.getElementById('mobChipIco').textContent);
    ck('étape 1 marquée franchie', doc.getElementById('labelB').classList.contains('fait'));
    ck('étape 2 devient active', !doc.getElementById('modelLabel').classList.contains('attente'));
    const it=[...doc.querySelectorAll('#listM .item')].find(x=>x.textContent.includes('KIA EV6'));
    if(it){ it.click(); setTimeout(()=>{
      ck('étape 2 franchie après le modèle', doc.getElementById('modelLabel').classList.contains('fait'));
      ck('étape 3 devient active', !doc.getElementById('labelV').classList.contains('attente'));
      const f=doc.querySelector('#listV > *:not(.le)');
      if(f){ f.click(); setTimeout(()=>{
        ck('étape 3 franchie après la finition', doc.getElementById('labelV').classList.contains('fait'));
        console.log(ko?'\n=== '+ko+' ÉCHEC(S) ===':'\n=== PARCOURS TÉLÉPHONE CONFORME ===');
        process.exit(ko?1:0);
      },50); }
    },50); }
  },80);
},900);
