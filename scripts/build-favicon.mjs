import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../',import.meta.url);
const source = readFileSync(new URL('src/components/BrandLockup.astro',root),'utf8');
const polygons = [...source.matchAll(/<polygon points="([^"]+)"\s*\/>/g)].map(match=>match[1]);
const points = polygons.map(p=>p.split(/\s+/).map(Number)).map(p=>Array.from({length:p.length/2},(_,i)=>[p[i*2],p[i*2+1]]));
const all=points.flat();
const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0]));
const minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));
const size=Math.max(maxX-minX,maxY-minY)*1.18;
const x=(minX+maxX-size)/2,y=(minY+maxY-size)/2;
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[x,y,size,size].join(' ')+'"><style>polygon{fill:#26262a}@media(prefers-color-scheme:dark){polygon{fill:#ededf0}}</style>'+polygons.map(p=>'<polygon points="'+p+'"/>').join('')+'</svg>\n';
writeFileSync(new URL('public/favicon.svg',root),svg);
// ICO DIB frames: supersampled original polygons, transparent background.
// Neutral graphite fill with pale outline remains visible on light and dark chrome.
function inside(px,py,polygon) {
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [ax,ay]=polygon[i],[bx,by]=polygon[j];
    if((ay>py)!==(by>py)&&px<(bx-ax)*(py-ay)/(by-ay)+ax)hit=!hit;
  }
  return hit;
}
function coverage(px,py,n) {
  let count=0;
  for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){
    const xx=x+(px+(sx+.5)/4)*size/n, yy=y+(py+(sy+.5)/4)*size/n;
    if(points.some(p=>inside(xx,yy,p)))count++;
  }
  return count/16;
}
function frame(n) {
  const maskStride=Math.ceil(n/32)*4;
  const bitmap=Buffer.alloc(40+n*n*4+maskStride*n);
  bitmap.writeUInt32LE(40,0);bitmap.writeInt32LE(n,4);bitmap.writeInt32LE(n*2,8);
  bitmap.writeUInt16LE(1,12);bitmap.writeUInt16LE(32,14);bitmap.writeUInt32LE(n*n*4,20);
  const coverageGrid=Array.from({length:n*n},(_,i)=>coverage(i%n,Math.floor(i/n),n));
  for(let py=0;py<n;py++)for(let px=0;px<n;px++){
    const cov=coverageGrid[py*n+px];
    const halo=Math.max(...[-1,0,1].flatMap(dy=>[-1,0,1].map(dx=>px+dx>=0&&px+dx<n&&py+dy>=0&&py+dy<n?coverageGrid[(py+dy)*n+px+dx]:0)))*.8;
    const alpha=Math.max(cov,halo);
    const offset=40+((n-1-py)*n+px)*4;
    const grey=alpha?Math.round((cov*38+(alpha-cov)*235)/alpha):0;
    bitmap[offset]=grey;bitmap[offset+1]=grey;bitmap[offset+2]=grey;bitmap[offset+3]=Math.round(alpha*255);
    if(!alpha)bitmap[40+n*n*4+(n-1-py)*maskStride+(px>>3)]|=1<<(7-(px&7));
  }
  return bitmap;
}
const sizes=[16,32],frames=sizes.map(frame),directory=Buffer.alloc(6+16*sizes.length);
directory.writeUInt16LE(1,2);directory.writeUInt16LE(sizes.length,4);
let offset=directory.length;
for(let i=0;i<sizes.length;i++){
  const p=6+16*i,n=sizes[i],data=frames[i];
  directory[p]=n;directory[p+1]=n;directory.writeUInt16LE(1,p+4);directory.writeUInt16LE(32,p+6);directory.writeUInt32LE(data.length,p+8);directory.writeUInt32LE(offset,p+12);offset+=data.length;
}
writeFileSync(new URL('public/favicon.ico',root),Buffer.concat([directory,...frames]));
