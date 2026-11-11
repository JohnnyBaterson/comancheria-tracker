/** Product release gate always runs every suite, including browser checks,
 * even if an earlier suite fails. A technical inability to run browser tests
 * is an explicit UNVERIFIED gate, never an automatic pass.
 */
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const stages=[
 ['Printed-rule regressions','tests/printed-rules.regression.mjs'],
 ['Gameplay scenario + evidence','tests/scenario-foundations.acceptance.mjs','tests/product-journey.acceptance.mjs','tests/rules-evidence.acceptance.mjs'],
 ['Chromium real UI','scripts/browser-journey.mjs'],
 ['Static/security/offline','scripts/release-check.mjs'],
];
const results=[];
for(const [name,...files] of stages){
 console.log(`\n========== ${name} ==========`);
 const args=files[0]?.endsWith('release-check.mjs')?files:['--test',...files];
 const out=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
 if(out.stdout)process.stdout.write(out.stdout);
 if(out.stderr)process.stderr.write(out.stderr);
 const status=out.error?`UNVERIFIED (${out.error.message})`:out.status===0?'PASS':'FAIL';
 results.push({name,status});
}
console.log('\nPRODUCT RELEASE GATE:');for(const x of results)console.log(`${x.status} ${x.name}`);
if(results.some(x=>x.status!=='PASS')){console.error('NOT RELEASE READY: one or more end-product gates have not passed.');process.exitCode=1;}
