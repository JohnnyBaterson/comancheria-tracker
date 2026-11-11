/** Placement coordinates on the existing, owner-imported TTS board image.
 * All values are in the shared 1080 × 720 SVG viewBox. This draws NO board art.
 * Source: original supplied TTS map anchors + supplied physical-board photos.
 * No rule state is stored here. These are visual counter destinations only.
 */
export const PRINTED_BOARD={
  width:1080,height:720,
  rancheria:{firstY:50,rowGap:76,mahY:0,paraY:28,medicineX:782,medicineGap:25,successX:742,resourcesX:961,resourcesY:1,resourcesWidth:93},
  instructions:{firstX:851,firstY:512,colGap:43,rowGap:25,cols:['West','South','East','North','Inactive']},
  supply:{available:{x:598,y:632,w:190,h:66},out:{x:800,y:646,w:72,h:52},enemyAP:{x:920,y:676,w:136,h:26}},
  records:{x:{military:40,culture:62,ap:84},bottomY:665,step:34},
  operations:{x:68,bottomY:303,step:20},
  history:{x:735,y:500,w:90,h:104}
};
export function rancheriaPrintedIndex(ranch,index){
 const matches=String(ranch.subtype||ranch.label||ranch.id||'').match(/(?:^|\W)([A-E])(?:$|\W)/i);
 return matches?matches[1].toUpperCase().charCodeAt(0)-65:Math.min(4,index);
}
export function rancheriaMedicinePoint(index,type,rating){
 const r=PRINTED_BOARD.rancheria;
 return [r.medicineX+Math.max(0,Math.min(6,rating))*r.medicineGap,r.firstY+index*r.rowGap+(type==='Mahimiana'?r.mahY:r.paraY)];
}
export function instructionPrintedPoint(enemy,row){
 const cfg=PRINTED_BOARD.instructions,col=cfg.cols.indexOf(enemy),idx=String('ABCDEF').indexOf(row);
 return col<0||idx<0?null:[cfg.firstX+col*cfg.colGap,cfg.firstY+idx*cfg.rowGap];
}
export function recordPrintedPoint(key,value){
 const r=PRINTED_BOARD.records;return [r.x[key],r.bottomY-Math.max(0,Math.min(9,value))*r.step];
}
export function spreadPrintedCounters(items,region,maxColumns=7){
 if(!items.length)return [];
 const columns=Math.min(maxColumns,Math.max(1,Math.floor(region.w/21))),rows=Math.max(1,Math.floor(region.h/21));
 // Retain one DOM counter per physical identity, overlapping when the printed
 // supply becomes crowded, like a physical stack; never make proxy inventory.
 return items.map((piece,i)=>({piece,x:region.x+(i%columns)*Math.min(21,(region.w-20)/Math.max(1,columns-1)),y:region.y+(Math.floor(i/columns)%rows)*Math.min(20,(region.h-19)/Math.max(1,rows-1)),pile:Math.floor(i/(columns*rows))}));
}
