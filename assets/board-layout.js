/**
 * Independent original diagram of the Comanchería map's spatial arrangement.
 * Reference: photographed retail map and GMT Living Rules §1.3.1.
 * This is an approximation for visual navigation, NOT publisher artwork and NOT a
 * verified transcription of printed movement-line topology. Coordinates are
 * deliberately kept separate from movement legality (state.edges).
 * v0.12 refines the lower Red River corridor; v0.11 places Red River #6 by the Upper Arkansas #4 / Lower Arkansas #5
 * corridor, and Lower Arkansas #6 immediately below Upper Arkansas #6,
 * following the GMT close-up photo instead of the former rough grid.
 */
export const BOARD_WIDTH = 1080;
export const BOARD_HEIGHT = 720;
export const MAP_POSITIONS = Object.freeze({
  'UA-1':[190,117],
  'UA-2':[343,143],
  'UA-3':[285,224],
  'UA-4':[398,210],
  'UA-5':[486,175],
  'UA-6':[590,143],
  'LA-1':[842,406],
  'LA-2':[844,333],
  'LA-3':[737,312],
  'LA-4':[650,278],
  'LA-5':[548,270],
  'LA-6':[610,222],
  'LE-1':[197,277],
  'LE-2':[175,398],
  'LE-3':[258,348],
  'LE-4':[238,485],
  'LE-5':[310,563],
  'LE-6':[380,493],
  'RG-1':[83,420],
  'RG-2':[87,495],
  'RG-3':[148,567],
  'RG-4':[197,632],
  'RG-5':[317,674],
  'RG-6':[374,631],
  'RR-1':[862,557],
  'RR-2':[771,514],
  'RR-3':[743,402],
  'RR-4':[627,389],
  'RR-5':[513,372],
  'RR-6':[462,252],
  'BC-1':[691,572],
  'BC-2':[595,541],
  'BC-3':[525,446],
  'BC-4':[639,631],
  'BC-5':[479,574],
  'BC-6':[486,671],
  'PD':[366,361],
  'N':[591,47],
  'W':[90,350],
  'S':[70,675],
  'E1':[930,393],
  'E2':[725,67],
  'RESERVATION':[735,173]
});
export const MAP_PALETTE = Object.freeze({
  UA:'#8770b8', LA:'#68b8c6', RR:'#c98758',
  LE:'#be7387', RG:'#75ad75', BC:'#b9a27e',
  enemy:'#d9ca99', canyon:'#c8b7a0', reservation:'#a7b4a6'
});
export const MAP_REGION_LABELS = Object.freeze([
  ['UA','UPPER ARKANSAS',340,96],
  ['LA','LOWER ARKANSAS',755,250],
  ['LE','LLANO ESTACADO',295,337],
  ['RR','RED RIVER',735,365],
  ['RG','RIO GRANDE',265,605],
  ['BC','BRAZOS COLORADO',565,532]
]);
export function boardPosition(id){return MAP_POSITIONS[id]||null;}
export function mapEdgesForDisplay(edges){
  // Only user-entered and successfully engine-validated links are displayed;
  // this module never manufactures adjacency from visual distance.
  return edges.filter(edge=>MAP_POSITIONS[edge.a]&&MAP_POSITIONS[edge.b]);
}
