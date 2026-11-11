import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {resolve,dirname,relative,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const read=(p)=>readFileSync(resolve(root,p),'utf8');
const required=['index.html','service-worker.js','manifest.webmanifest','assets/app.js','assets/engine.js','assets/card-reveal.js','assets/style.css'];
for(const p of required)assert(existsSync(resolve(root,p)),`Required runtime asset missing: ${p}`);
const sw=read('service-worker.js'),html=read('index.html'),engine=read('assets/engine.js');
const manifest=JSON.parse(read('manifest.webmanifest')),pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'1.18.0');
assert(engine.includes("1.18.0-setup-director"),'Engine version mismatch');
assert(sw.includes('v1.18.0-setup-director'),'Stale service-worker cache');
assert(manifest.start_url==='./'&&manifest.scope==='./','Subpath Pages deployment scope must be relative');
assert(html.includes('Content-Security-Policy'),'Missing CSP');
assert(/object-src 'none'/.test(html)&&/connect-src 'self'/.test(html),'CSP weakened');
assert(!/type=["']file["'][^>]*accept=["'][^"']*\.json/i.test(read('assets/app.js')),'Save import should remain disabled');
const assets=[...sw.matchAll(/'\.\/(?:assets\/[^']+|index\.html|manifest\.webmanifest)'/g)].map(x=>x[0].slice(3,-1));
assert(assets.length>=16,'Service worker precache unexpectedly small');
for(const file of assets)assert(existsSync(resolve(root,file)),`Offline precache missing: ${file}`);
const imports=new Set();
for(const file of readdirSync(resolve(root,'assets')).filter(x=>x.endsWith('.js'))){
 const body=read('assets/'+file);
 for(const m of body.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["'](\.\/[^"']+)["']/g)){
  const target=resolve(root,'assets',m[1]);
  assert(existsSync(target),`Broken import in ${file}: ${m[1]}`);
  imports.add('assets/'+relative(resolve(root,'assets'),target).replaceAll('\\','/'));
 }
}
for(const file of imports)assert(assets.includes(file),`Imported runtime JS not cached offline: ${file}`);
const visit=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?visit(resolve(dir,x.name)):[resolve(dir,x.name)]);
const files=visit(root);
for(const f of files){const rel=relative(root,f);if(rel.endsWith('.zip'))throw new Error(`Nested archive: ${rel}`);
 if(/\.(?:jpg|jpeg|png|webp|gif|ttf|woff2?|otf)$/i.test(rel))throw new Error(`Unexpected distributable artwork/font: ${rel}`);
 if(/(?:^|\/)(?:\.env(?:\.|$)|id_rsa|credentials\.json|service-account\.json)/i.test(rel))throw new Error(`Sensitive filename in release: ${rel}`);
}
for(const f of files.filter(f=>/\.(?:js|json|html|md|css)$/i.test(f))){
 const t=readFileSync(f,'utf8');
 assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(t),`Private key detected in ${f}`);
 assert(!/\b(?:sk-proj-|sk_live_|ghp_)[A-Za-z0-9_-]{16,}/.test(t),`Possible secret detected in ${f}`);
}
console.log(`RELEASE GATE PASS: ${files.length} source files, ${assets.length} precached paths, ${imports.size} JavaScript imports; no bundled raster art or obvious keys.`);
