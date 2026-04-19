const fs = require('fs');
const jpeg = require('jpeg-js');
const rawImageData = jpeg.decode(fs.readFileSync('src/assets/qr-poster-template.jpg'), {useTArray: true});
const { width, height, data } = rawImageData;
let whitePixels = [];
for (let y = Math.floor(height*0.15); y < height*0.95; y += 2) {
    for (let x = Math.floor(width*0.05); x < width*0.95; x += 2) {
        let i = (y * width + x) * 4;
        if (data[i] >= 235 && data[i+1] >= 235 && data[i+2] >= 235) {
            whitePixels.push({x, y});
        }
    }
}
let ys = Array.from(new Set(whitePixels.map(p => p.y))).sort((a,b)=>a-b);
let cur = []; let regions = [];
for(let y of ys) {
  if(!cur.length) cur.push(y);
  else if(y - cur[cur.length-1] < 20) cur.push(y);
  else { regions.push(cur); cur = [y]; }
}
if(cur.length) regions.push(cur);
regions.forEach((r, i) => {
  let rPixels = whitePixels.filter(p => p.y >= r[0] && p.y <= r[r.length-1]);
  let min_x = Math.min(...rPixels.map(p => p.x));
  let max_x = Math.max(...rPixels.map(p => p.x));
  let min_y = r[0]; let max_y = r[r.length-1];
  if (max_x - min_x > width * 0.1) console.log(`Region ${i}: x=${min_x}-${max_x} (w=${max_x-min_x}), y=${min_y}-${max_y} (h=${max_y-min_y})`);
});
