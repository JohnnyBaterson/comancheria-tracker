/** Real Chromium click-journey. No internal game-state injection, DOM-based
 * state mocking, direct reducer use, fake browser storage, or skip buttons.
 * Uses only visible UI radio controls and the user's click events.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,extname,sep} from 'node:path';
import {SCENARIOS} from '../assets/engine.js';
const ROOT=resolve(import.meta.dirname,'..');
const MIME={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=http.createServer(async(req,res)=>{
  try{
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path=resolve(ROOT,'.'+(name==='/'?'/index.html':name));
    if(!path.startsWith(ROOT+sep)&&path!==join(ROOT,'index.html'))throw Error('unsafe path');
    const data=await readFile(path);
    res.writeHead(200,{'Content-Type':MIME[extname(path)]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404);res.end('not found');}
});
function listen(server){return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));}
class CDP{
  constructor(socket){this.socket=socket;this.next=1;this.pending=new Map();this.allowSetupDialog=false;this.unverifiedDialog=false;socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Page.javascriptDialogOpening'){if(!this.allowSetupDialog)this.unverifiedDialog=true;void this.send('Page.handleJavaScriptDialog',{accept:this.allowSetupDialog});}if(m.id){const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}});}
  send(method,params={}){const id=this.next++;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.socket.send(JSON.stringify({id,method,params}));});}
  async js(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}
  close(){this.socket.close();}
}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});return new CDP(socket);}
async function waitUntil(fn,timeoutMs=10000){const start=Date.now();while(Date.now()-start<timeoutMs){try{const v=await fn();if(v)return v;}catch{}await sleep(150);}throw Error('Browser UI did not render the expected element');}

/** This is a product gate, not a smoke test: each officially selectable scenario
 * must become a playable digital board without requiring physical evidence.
 */
test('RELEASE: all five official scenarios can be entered and played using actual browser controls', {timeout:90000},async()=>{
  const port=await listen(server);
  const profile=await mkdtemp(join(tmpdir(),'comancheria-browser-'));
  const chrome=spawn('/usr/bin/chromium',['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-proxy-server','--proxy-bypass-list=<-loopback>','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','about:blank'],{stdio:'ignore'});
  let client;
  try{
    const info=await waitUntil(async()=>{const s=await readFile(join(profile,'DevToolsActivePort'),'utf8');return s.trim().split('\n');},15000);
    const tabs=await fetch(`http://127.0.0.1:${info[0]}/json/list`).then(r=>r.json());
    client=await connect(tabs[0].webSocketDebuggerUrl);
    await client.send('Page.enable'); await client.send('Runtime.enable');
    const problems=[];
    for(const [id,name] of SCENARIOS){
      await client.send('Page.navigate',{url:`http://127.0.0.1:${port}/`});
      await waitUntil(()=>client.js(`Boolean(document.querySelector('[data-action="home-new"]'))`)).catch(async e=>{throw Error(e.message+" BODY="+await client.js(`document.body.innerText.slice(0,600)`));});
      await client.js(`(()=>{document.querySelector('[data-action="home-new"]').click();return true})()`);
      await waitUntil(()=>client.js(`Boolean(document.querySelector('input[name="scenario-preset"][value="${id}"]'))`));
      await client.js(`(()=>{document.querySelector('input[name="scenario-preset"][value="${id}"]').click();document.querySelector('[data-action="setup-load-selected"]').click();return true})()`);
      await waitUntil(()=>client.js(`Boolean(document.querySelector('.setup-progress'))`));
      client.allowSetupDialog=false; // Never auto-accept printed-card or physical-board attestations during play.
      const status=await client.js(`(()=>({ready:!!document.querySelector('[data-action="start"]:not([disabled])'),manualChecks:document.querySelectorAll('.setup-confirm:not(:checked)').length,summary:document.querySelector('.setup-progress')?.innerText||'',body:document.body.innerText.slice(0,300)}))()`);
      if(!status.ready){problems.push(`${name}: digital setup cannot start; ${status.manualChecks} manual setup checks still required; ${status.summary}`);continue;}
      await client.js(`document.querySelector('[data-action="start"]:not([disabled])').click()`);
      const started=await client.js(`Boolean(document.querySelector('.play-map')&&document.body.innerText.includes('PERIOD'))`);
      if(!started){problems.push(`${name}: Start button did not open playable board`);continue;}
      let ended=false;
      for(let turn=0;turn<2500;turn++){
        const step=await client.js(`(()=>{const banner=document.querySelector('.next-action-banner');return {finished:!!banner?.classList.contains('evidence')&&banner?.innerText?.includes('GAME OVER')||document.body.innerText.includes('Campaign finished'),evidence:banner?.classList.contains('evidence'),title:banner?.querySelector('strong')?.innerText||'',reveal:!!document.querySelector('[data-action="next-card-reveal"]'),auto:!!banner?.querySelector('[data-action="director-auto"]'),choices:[...banner?.querySelectorAll('[data-action="director-choice"]')||[]].map(n=>n.innerText)}}))()`);
        if(client.unverifiedDialog){problems.push(`${name}: gameplay requested a manual attestation dialog`);break;}
        if(step.finished){ended=true;break;}
        if(step.evidence){problems.push(`${name}: player UI blocked by unresolved game evidence at step ${turn}: ${step.title}`);break;}
        if(step.reveal){await client.js(`document.querySelector('[data-action="next-card-reveal"]').click()`);continue;}
        if(step.auto){await client.js(`document.querySelector('.next-action-banner [data-action="director-auto"]').click()`);continue;}
        if(step.choices.length){
          // A strategic choice is real input; never use manual correction,
          // physical verification, or confirmation-only options.
          const chosen=await client.js(`(()=>{const choices=[...document.querySelectorAll('.next-action-banner [data-action="director-choice"]')];const item=choices.find(x=>/Culture|Planning|Finish|Decline|Skip/.test(x.innerText))||choices[0];if(!item)return false;item.click();return true})()`);
          if(chosen)continue;
        }
        problems.push(`${name}: no playable digital action at UI step ${turn}: ${step.title}`);break;
      }
      if(!ended&&!problems.some(x=>x.startsWith(name+':')))problems.push(`${name}: no final outcome after 2,500 visible actions`);
    }
    assert.deepEqual(problems,[],`Real browser setup/game entry failures:\n${problems.join('\n')}`);
  }finally{client?.close();chrome.kill('SIGKILL');server.close();await sleep(500);await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200}).catch(()=>{});}
});
