// CONTRÔLE DES VALEURS DE FIN DE SÉRIE, sur la totalité de la base.
// Trois invariants, plus un repérage des séries dont la fin est douteuse.
const {JSDOM}=require('jsdom'); const fs=require('fs');
const app=fs.readFileSync('index.html','utf8'), data=fs.readFileSync('data.js','utf8');
const dom=new JSDOM(app.replace('<script src="data.js"></script>','<script>\n'+data+'\n</script>'),
  {runScripts:'dangerously',url:'https://e.com/a.html',pretendToBeVisual:true});
const win=dom.window; win.requestAnimationFrame=cb=>setTimeout(cb,0);
if(!win.Element.prototype.scrollIntoView) win.Element.prototype.scrollIntoView=function(){};
setTimeout(()=>{
  const DB=win.DB, yOf=win.yOf, CY=2026;
  const nett=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/[  ]/g,' ');
  let n=0, koFin=0, koJour=0, koMontant=0, couples=0;
  const pires=[];
  for(const b of Object.keys(DB)) for(const m of Object.keys(DB[b])) for(const f of DB[b][m]){
    n++;
    for(let y=yOf(f.d0); y<=CY; y++){
      const t=win.tarifMillesime(f,y); if(!t) continue;
      // Les repères se calculent DANS LA PHASE du millésime, comme l'application le fait :
      // une génération sortante a sa propre fin de série, même si le modèle continue.
      const H=win.histPhase(f, m, y);
      const dernier=H[H.length-1], anFin=yOf(dernier.d);
      const phCour = !win.eval('PHASES')[m] ||
        win.phaseDeAnnee(m,y).rang === win.rangPhase(m,f.d);
      const auCatalogue = anFin>=CY-1 && phCour;
      couples++;
      const txt=nett(win.blocPrix(f,m,y));
      // 1. le montant mis en avant est LA VALEUR À NEUF : tarif du jour si la finition se
      //    vend encore, valeur de fin de série de sa phase sinon.
      const val=parseInt((txt.match(/^\s*([\d ]+) DT/)||[])[1].replace(/\D/g,''));
      if(val!==dernier.p){ koMontant++; if(pires.length<6) pires.push('montant '+m+' '+f.v+' '+y+' : '+val+' ≠ '+dernier.p); }
      // 2. « fin de série » n'apparaît QUE sur une finition retirée, et « tarif du jour » QUE
      //    sur une finition encore vendue. Jamais les deux, jamais aucun.
      // Le libellé se lit dans la pastille du montant, pas dans les notices explicatives :
      // l'avertissement de changement de génération cite légitimement « le tarif du jour de
      // ce modèle » tout en affichant, lui, une fin de série.
      const brut=win.blocPrix(f,m,y);
      const lbl=(brut.match(/class="price-lbl">([^<]*)</)||[])[1]||'';
      const ditFin=/fin de série du \d{2}\.\d{2}\.\d{4}/.test(lbl);
      const ditJour=/tarif du jour/.test(lbl);
      if(ditFin===ditJour){ koFin++; if(pires.length<6) pires.push('libellé ambigu '+m+' '+f.v+' '+y); }
      else if(ditFin===auCatalogue){ koFin++; if(pires.length<6) pires.push('libellé inversé '+m+' '+f.v+' '+y); }
      // 3. le tarif du millésime reste donné dès qu'il diffère de la valeur à neuf
      if(t.p!==dernier.p && !/1ère mise en circulation/.test(txt)){
        koJour++; if(pires.length<6) pires.push('tarif d\'origine manquant '+m+' '+f.v+' '+y); }
    }
  }
  console.log('CONTRÔLE DES VALEURS DE FIN DE SÉRIE');
  console.log('  finitions : '+n.toLocaleString('fr-FR')+'   ·   couples finition × millésime : '+couples.toLocaleString('fr-FR')+'\n');
  console.log('  montant affiché ≠ valeur à neuf                : '+koMontant+'   ← doit être 0');
  console.log('  libellé « fin de série » / « tarif du jour »   : '+koFin+'   ← doit être 0');
  console.log('  tarif d\'achat d\'origine manquant              : '+koJour+'   ← doit être 0');
  pires.forEach(x=>console.log('     ✗ '+x));

  // ── Repérage : séries dont la fin est DOUTEUSE ──
  // Quand TOUTES les finitions d'un modèle s'arrêtent la même année, il est plus probable que
  // la base ait cessé de suivre le modèle que de les voir toutes retirées le même jour. À
  // l'inverse, des finitions qui s'éteignent l'une après l'autre dessinent une vraie fin.
  const suspects=[];
  for(const b of Object.keys(DB)) for(const m of Object.keys(DB[b])){
    const fins=DB[b][m].map(f=>{const H=win.tarifsCatalogue(f);return H[H.length-1].d;});
    const ans=[...new Set(fins.map(yOf))];
    const anFin=Math.max(...ans);
    if(anFin>=CY-1) continue;                      // encore au catalogue
    if(DB[b][m].length>=3 && ans.length===1) suspects.push({m, an:anFin, nf:DB[b][m].length, d:fins[0]});
  }
  suspects.sort((a,b)=>b.nf-a.nf);
  console.log('\n  modèles dont TOUTES les finitions (≥ 3) s\'arrêtent la même année : '+suspects.length);
  console.log('  → fin de série à confirmer : la base a peut-être simplement cessé de suivre');
  suspects.slice(0,15).forEach(x=>console.log('     '+x.m.slice(0,42).padEnd(44)+x.nf+' finitions, toutes au '+x.d));
  fs.writeFileSync('finserie_suspects.json',JSON.stringify(suspects,null,1));
},1500);
