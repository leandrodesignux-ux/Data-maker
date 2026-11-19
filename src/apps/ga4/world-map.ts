import * as echarts from "echarts";

// Coarse public-domain-style geometry authored for the simulator; no map tiles or reference image data.
const land: Record<string, number[][]> = {
  "América del Norte": [[-168,70],[-140,69],[-130,55],[-125,49],[-115,48],[-105,50],[-95,48],[-85,45],[-80,30],[-90,25],[-98,16],[-105,21],[-110,30],[-117,33],[-125,40],[-135,52],[-160,60]],
  "México": [[-117,32],[-110,31],[-106,28],[-101,26],[-97,25],[-92,18],[-87,21],[-90,16],[-97,16],[-105,21],[-110,28]],
  "América del Sur": [[-80,12],[-70,12],[-61,9],[-51,4],[-48,-5],[-35,-8],[-39,-18],[-46,-25],[-52,-34],[-57,-40],[-67,-55],[-73,-50],[-75,-30],[-80,-15]],
  "Europa": [[-11,36],[-10,44],[-4,50],[5,55],[15,59],[28,60],[38,53],[32,44],[25,40],[10,36]],
  "África": [[-17,35],[4,37],[15,32],[33,31],[42,12],[51,11],[43,-12],[34,-22],[18,-35],[9,-34],[-1,-18],[-15,5]],
  "Asia": [[28,60],[45,67],[75,71],[110,70],[145,61],[165,58],[177,50],[152,42],[132,33],[124,22],[108,11],[102,0],[88,8],[79,17],[72,25],[60,29],[48,39],[38,53]],
  "India": [[69,25],[78,32],[87,28],[89,20],[78,7],[74,13]],
  "Australia": [[113,-10],[126,-12],[138,-11],[153,-22],[151,-35],[134,-39],[116,-33]],
  "Groenlandia": [[-53,59],[-43,60],[-38,70],[-42,82],[-56,83],[-61,72]],
};
let registered = false;
export function ensureGaWorldMap() {
  if (registered) return;
  const features = Object.entries(land).map(([name, points]) => ({ type: "Feature" as const, properties: { name }, geometry: { type: "Polygon" as const, coordinates: [[...points, points[0]]] } }));
  echarts.registerMap("ga-training-world", { type: "FeatureCollection", features });
  registered = true;
}
