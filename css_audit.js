// Contrôle du système de couleurs : parité des jetons entre thèmes, absence de couleur
// définie uniquement dans un bloc de thème, et contrastes réels.
const fs=require('fs');
const app=fs.readFileSync('index.html','utf8');
const css=app.slice(app.indexOf('<style>'), app.indexOf('</style>'));
const bloc=(sel)=>{ const i=css.indexOf(sel); if(i<0) return null;
  const a=css.indexOf('{',i), b=css.indexOf('}',a); return css.slice(a+1,b); };
const toks=t=>{const o={}; (t.match(/--[\w-]+:\s*[^;]+/g)||[]).forEach(d=>{
  const [k,...v]=d.split(':'); o[k.trim()]=v.join(':').trim();}); return o;};

const light=toks(css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{'))));
const dark1=toks(bloc(':root:not([data-theme="light"])')||'');
const dark2=toks(bloc(':root[data-theme="dark"]')||'');
console.log('Jetons clairs : '+Object.keys(light).length);
console.log('Jetons sombres (système) : '+Object.keys(dark1).length+' · (choix explicite) : '+Object.keys(dark2).length);
const d=Object.keys(dark1).filter(k=>dark1[k]!==dark2[k]);
console.log(d.length? '✗ les deux blocs sombres divergent : '+d.join(', ') : '✓ les deux blocs sombres sont identiques');
const manquants=Object.keys(dark1).filter(k=>!(k in light));
console.log(manquants.length? '✗ jetons sombres absents du bloc clair : '+manquants.join(', ')
                            : '✓ tout jeton sombre existe aussi en clair');
// Aucune règle de composant à l'intérieur d'un bloc de thème ?
for(const [nom,sel] of [['système','@media (prefers-color-scheme: dark)'],['explicite',':root[data-theme="dark"]']]){
  const i=css.indexOf(sel);
  const fin = nom==='système' ? css.indexOf('\n}',css.indexOf('}',css.indexOf('{',i)+1)) : css.indexOf('}',css.indexOf('{',i));
  const seg=css.slice(i,fin);
  const compos=seg.split('\n').filter(l=>/^\s*\.[\w-]/.test(l));
  console.log(compos.length? '✗ règles de composant dans le bloc '+nom+' : '+compos.length
                           : '✓ le bloc '+nom+' ne contient que des jetons');
}
// Contrastes
const hex=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');
  return [0,2,4].map(i=>parseInt(h.substr(i,2),16));};
const lum=c=>{const s=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
  return .2126*s[0]+.7152*s[1]+.0722*s[2];};
const ratio=(a,b)=>{const l1=lum(hex(a)),l2=lum(hex(b));return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);};
const paires=[['--t1','--sf','texte principal sur carte'],['--t2','--sf','texte secondaire'],
  ['--t3','--sf','texte tertiaire'],['--pr','--sf','accent sur carte'],['--t1','--bg','texte sur fond'],
  ['--el','--ell','batterie sur son fond'],['--am','--aml','alerte sur son fond'],
  ['--pr','--prl','accent sur son fond'],['--bad','--sf','défaut sur carte']];
for(const [nom,vals] of [['CLAIR',light],['SOMBRE',dark1]]){
  console.log('\nContrastes — thème '+nom);
  for(const [a,b,lib] of paires){
    const va=vals[a]||light[a], vb=vals[b]||light[b];
    if(!va||!vb||!/^#/.test(va)||!/^#/.test(vb)) continue;
    const r=ratio(va,vb);
    const seuil = /tertiaire/.test(lib)?3:4.5;
    console.log('  '+(r>=seuil?'✓':'✗')+' '+lib.padEnd(30)+r.toFixed(2)+':1  (seuil '+seuil+')');
  }
}
