/** Stage board decisions one at a time. The original form and reducer remain authoritative. */
const CONTROL='input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea';

export function mountGuidedFormSteps(root,{artForField=()=>null}={}){
 if(!root)return 0;
 let mounted=0;
 const areas=root.querySelectorAll('.player-panel[role="dialog"], .board-turn-hud.board-focus-battle, .board-turn-hud.board-focus-passage, #modal-root [role="dialog"]');
 for(const area of areas){
  for(const form of area.querySelectorAll('form')){
   if(form.dataset.guidedSteps==='ready')continue;
   const controls=[...form.querySelectorAll(CONTROL)].filter(c=>!c.disabled&&c.type!=='file'&&c.type!=='hidden');
   const fields=[];
   for(const c of controls){
    const field=c.closest('label')||c.closest('.field')||c;
    if(fields.some(f=>f.node===field))continue;
    fields.push({node:field,control:c,label:(field.querySelector('span')?.textContent||field.textContent||c.getAttribute('aria-label')||c.name||'Confirm this choice').trim().replace(/\s+/g,' ').slice(0,110)});
   }
   if(fields.length<2)continue;
   form.dataset.guidedSteps='ready';mounted++;
   const footer=[...form.querySelectorAll('button[type="submit"], button:not([type])')].map(b=>b.closest('.form-end')||b);
   const uniqueFooter=[...new Set(footer)];
   const host=document.createElement('div');host.className='guided-stepper';host.setAttribute('aria-live','polite');
   host.innerHTML='<div class="guided-stepper-progress"><span class="guided-stepper-count"></span><div class="guided-stepper-track"><i></i></div></div><div class="guided-stepper-hero"><span class="guided-stepper-medallion" aria-hidden="true">✦</span><img class="guided-stepper-art" alt="Printed game counter" hidden><div><small>YOUR DECISION</small><strong class="guided-stepper-title"></strong></div></div><div class="guided-stepper-navigation"><button type="button" class="btn sm guided-stepper-back">Previous</button><button type="button" class="btn primary sm guided-stepper-next">Next choice</button></div>';
   form.prepend(host);
   const count=host.querySelector('.guided-stepper-count'),track=host.querySelector('.guided-stepper-track i'),title=host.querySelector('.guided-stepper-title'),img=host.querySelector('.guided-stepper-art'),back=host.querySelector('.guided-stepper-back'),next=host.querySelector('.guided-stepper-next');
   let current=0;
   function refreshArt(){
    const art=artForField(fields[current].control,form);
    img.hidden=!art;img.removeAttribute('src');if(art)img.src=art;
   }
   function show(index){
    current=Math.max(0,Math.min(index,fields.length-1));
    fields.forEach((f,i)=>{f.node.classList.toggle('guided-step-hidden',i!==current);f.node.classList.toggle('guided-step-active',i===current);});
    uniqueFooter.forEach(n=>n.classList.toggle('guided-step-hidden',current!==fields.length-1));
    count.textContent=`Choice ${current+1} of ${fields.length}`;track.style.width=`${100*(current+1)/fields.length}%`;
    title.textContent=fields[current].label;
    back.hidden=current===0;next.hidden=current===fields.length-1;
    refreshArt();
    host.classList.remove('guided-step-enter');void host.offsetWidth;host.classList.add('guided-step-enter');
   }
   // Build direct choice surfaces for native select/checkbox fields. Keep the
   // original control as the source of truth; there is no new game command.
   for(const f of fields){
    const c=f.control;
    if(c.tagName==='SELECT'&&!c.multiple&&c.size<=1){
     const choices=[...c.options].filter(o=>!o.disabled&&!o.hidden&&!(!o.value&&/^select|choose|pick/i.test(o.textContent.trim())));
     if(!choices.length)continue;
     const panel=document.createElement('div');panel.className='guided-choice-tiles';panel.setAttribute('role','group');panel.setAttribute('aria-label',f.label);
     const buttons=choices.map(option=>{
      const button=document.createElement('button');button.type='button';button.className='guided-choice-tile';
      button.textContent=option.textContent.trim();button.dataset.value=option.value;
      button.addEventListener('click',()=>{
       c.value=option.value;c.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('change',{bubbles:true}));update();
      });
      panel.append(button);return button;
     });
     function update(){for(const b of buttons){const selected=b.dataset.value===c.value;b.classList.toggle('is-chosen',selected);b.setAttribute('aria-pressed',String(selected));}}
     c.addEventListener('change',update);
     if(choices.length>6){
      let page=0;const size=6,total=Math.ceil(buttons.length/size);
      const nav=document.createElement('div');nav.className='guided-choice-pages';
      const previous=document.createElement('button'),following=document.createElement('button'),caption=document.createElement('span');
      previous.type=following.type='button';previous.textContent='Previous options';following.textContent='More options';
      function render(){buttons.forEach((b,i)=>b.hidden=Math.floor(i/size)!==page);caption.textContent=`Options ${page*size+1}–${Math.min(buttons.length,(page+1)*size)} of ${buttons.length}`;previous.disabled=page===0;following.disabled=page===total-1;}
      previous.addEventListener('click',()=>{page--;render();});following.addEventListener('click',()=>{page++;render();});
      nav.append(previous,caption,following);f.node.append(panel,nav);render();
     }else f.node.append(panel);
     c.classList.add('guided-native-select');update();
    }else if(c.tagName==='INPUT'&&c.type==='number'&&c.min!==''&&c.max!==''&&Number.isInteger(Number(c.min))&&Number.isInteger(Number(c.max))&&Number(c.max)>=Number(c.min)&&Number(c.max)-Number(c.min)<=24){
     // Finite printed die/track/modifier values should be explicit decisions,
     // not little numeric text boxes. Preserve the native input for validation.
     const values=Array.from({length:Number(c.max)-Number(c.min)+1},(_,i)=>Number(c.min)+i);
     const panel=document.createElement('div');panel.className='guided-choice-tiles';panel.setAttribute('role','group');panel.setAttribute('aria-label',f.label);
     const buttons=values.map(value=>{
      const button=document.createElement('button');button.type='button';button.className='guided-choice-tile';button.textContent=String(value);button.dataset.value=String(value);
      button.addEventListener('click',()=>{c.value=String(value);c.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('change',{bubbles:true}));update();});
      panel.append(button);return button;
     });
     function update(){for(const b of buttons){const selected=b.dataset.value===c.value;b.classList.toggle('is-chosen',selected);b.setAttribute('aria-pressed',String(selected));}}
     c.addEventListener('change',update);
     if(buttons.length>6){
      let page=0;const size=6,total=Math.ceil(buttons.length/size);
      const nav=document.createElement('div');nav.className='guided-choice-pages';
      const previous=document.createElement('button'),following=document.createElement('button'),caption=document.createElement('span');
      previous.type=following.type='button';previous.textContent='Previous values';following.textContent='More values';
      function render(){buttons.forEach((b,i)=>b.hidden=Math.floor(i/size)!==page);caption.textContent=`Values ${page*size+1}–${Math.min(buttons.length,(page+1)*size)} of ${buttons.length}`;previous.disabled=page===0;following.disabled=page===total-1;}
      previous.addEventListener('click',()=>{page--;render();});following.addEventListener('click',()=>{page++;render();});
      nav.append(previous,caption,following);f.node.append(panel,nav);render();
     }else f.node.append(panel);
     c.classList.add('guided-native-number');update();
    }else if(c.tagName==='INPUT'&&c.type==='checkbox'){
     const panel=document.createElement('div');panel.className='guided-choice-tiles';panel.setAttribute('role','group');panel.setAttribute('aria-label',f.label);
     const yes=document.createElement('button'),no=document.createElement('button');
     for(const [button,value,label] of [[yes,true,'Yes — confirm'],[no,false,'No — not confirmed']]){
      button.type='button';button.className='guided-choice-tile';button.textContent=label;
      button.addEventListener('click',()=>{c.checked=value;c.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('change',{bubbles:true}));update();});
      panel.append(button);
     }
     function update(){yes.setAttribute('aria-pressed',String(c.checked));no.setAttribute('aria-pressed',String(!c.checked));yes.classList.toggle('is-chosen',c.checked);no.classList.toggle('is-chosen',!c.checked);}
     c.addEventListener('change',update);f.node.append(panel);c.classList.add('guided-native-checkbox');update();
    }
   }
   next.addEventListener('click',()=>{
    const c=fields[current].control;
    if(!c.checkValidity()){c.reportValidity();return;}
    show(current+1);
   });
   back.addEventListener('click',()=>show(current-1));
   form.addEventListener('change',refreshArt);
   form.addEventListener('submit',event=>{
    if(current!==fields.length-1){event.preventDefault();event.stopImmediatePropagation();next.click();}
   },true);
   show(0);
  }
 }
 return mounted;
}
