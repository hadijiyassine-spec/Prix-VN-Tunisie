// Recherche des règles CSS et des fonctions JS qui ne servent plus à rien.
const fs=require('fs');
const app=fs.readFileSync('index.html','utf8');
const css=(app.match(/<style>([\s\S]*?)<\/style>/g)||[]).join('\n');
const reste=app.replace(/<style>[\s\S]*?<\/style>/g,'');
const classes=new Set();
for(const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) classes.add(m[1]);
const mortes=[...classes].filter(c=>{
  const re=new RegExp('(^|[\\s"\'`.])'+c.replace(/[-]/g,'\\-')+'($|[\\s"\'`.])');
  return !re.test(reste);
}).sort();
console.log('Classes CSS jamais posées ('+mortes.length+') :');
console.log('  '+(mortes.join(' ')||'—'));

const js=(app.match(/<script>([\s\S]*?)<\/script>/g)||[]).join('\n');
const fns=[...js.matchAll(/^function ([a-zA-Z_][\w]*)/gm)].map(m=>m[1]);
const inutiles=fns.filter(f=>{
  const n=(js.match(new RegExp('\\b'+f+'\\b','g'))||[]).length
        + (reste.match(new RegExp('\\b'+f+'\\b','g'))||[]).length - 1; // -1 : la déclaration
  return n<=0;
}).sort();
console.log('\nFonctions jamais appelées ('+inutiles.length+') :');
console.log('  '+(inutiles.join(' ')||'—'));

const ids=[...reste.matchAll(/id="([\w-]+)"/g)].map(m=>m[1]);
const orphelins=[...new Set(ids)].filter(i=>!new RegExp("getElementById\\('"+i+"'\\)|querySelector\\([^)]*#"+i).test(js)
  && !new RegExp('#'+i+'\\b').test(css)).sort();
console.log('\nIdentifiants posés mais jamais lus ni stylés ('+orphelins.length+') :');
console.log('  '+(orphelins.join(' ')||'—'));
