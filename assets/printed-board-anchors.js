/** Placement coordinates on the existing, owner-imported TTS board image.
 * All values are in the shared 1080 × 720 TTS board-coordinate viewBox. This draws NO board art.
 * Source: original supplied TTS map anchors + supplied physical-board photos.
 * No rule state is stored here. These are visual counter destinations only.
 */
export const PRINTED_BOARD={
  width:1080,height:720,
  rancheria:{firstY:89,rowGap:69,mahY:0,paraY:27,medicineX:794,medicineGap:24,successX:762,resourcesX:951,resourcesY:1,resourcesWidth:69},
  instructions:{firstY:516,rowGap:22,cols:['West','South','East','North','Inactive'],columnX:{West:893,South:920,East:946,North:973,Inactive:1000}},
  supply:{available:{x:572,y:590,w:126,h:78},out:{x:790,y:594,w:65,h:61},enemyAP:{x:917,y:664,w:103,h:26}},
  records:{x:{military:34,culture:58,ap:82},yByValue:[658,608,571,545,518,493,469,443,419,394]},
  operations:{x:67,yByValue:[168,198,227,257,288,318,349]},
  history:{x:735,y:500,w:90,h:104}
};
export function rancheriaPrintedIndex(ranch,index){
 const matches=String(ranch.subtype||ranch.label||ranch.id||'').match(/(?:^|\W)([A-E])(?:$|\W)/i);
 // The physical display runs from E (top) to A (bottom).
 return matches?69-matches[1].toUpperCase().charCodeAt(0):Math.min(4,index);
}
export function rancheriaMedicinePoint(index,type,rating){
 const r=PRINTED_BOARD.rancheria;
 return [r.medicineX+Math.max(0,Math.min(6,rating))*r.medicineGap,r.firstY+index*r.rowGap+(type==='Mahimiana'?r.mahY:r.paraY)];
}
export function instructionPrintedPoint(enemy,row){
 const cfg=PRINTED_BOARD.instructions,col=cfg.cols.indexOf(enemy),idx=String('ABCDEF').indexOf(row);
 return col<0||idx<0?null:[cfg.columnX[enemy],cfg.firstY+idx*cfg.rowGap];
}
export function recordPrintedPoint(key,value){
 const r=PRINTED_BOARD.records;return [r.x[key],r.yByValue[Math.max(0,Math.min(9,Math.floor(value)))] ];
}
export function spreadPrintedCounters(items,region,maxColumns=7){
 if(!items.length)return [];
 const columns=Math.min(maxColumns,Math.max(1,Math.floor(region.w/21))),rows=Math.max(1,Math.floor(region.h/21));
 // Retain one DOM counter per physical identity, overlapping when the printed
 // supply becomes crowded, like a physical stack; never make proxy inventory.
 return items.map((piece,i)=>({piece,x:region.x+(i%columns)*Math.min(21,(region.w-20)/Math.max(1,columns-1)),y:region.y+(Math.floor(i/columns)%rows)*Math.min(20,(region.h-19)/Math.max(1,rows-1)),pile:Math.floor(i/(columns*rows))}));
}
