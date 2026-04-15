import { buildOffsetContour } from './src/operations/OffsetContourBuilder.js';

const sourcePath = 'M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385 A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 L -3 0';

function parsePath(d) {
  const segs = [];
  const cmds = d.match(/[MmLlAaZz][^MmLlAaZz]*/g) || [];
  let cx=0,cy=0,sx=0,sy=0;
  for (const cmd of cmds) {
    const type = cmd[0].toUpperCase();
    const nums = cmd.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (type==='M') { cx=nums[0]; cy=nums[1]; sx=cx; sy=cy; }
    else if (type==='L') {
      const ex=nums[0],ey=nums[1];
      segs.push({type:'line',start:{x:cx,y:cy},end:{x:ex,y:ey}});
      cx=ex;cy=ey;
    } else if (type==='A') {
      const [rx,ry,rot,laf,sf,ex,ey]=nums;
      segs.push({type:'arc',start:{x:cx,y:cy},end:{x:ex,y:ey},arc:{rx,ry,xRotation:rot,largeArcFlag:laf,sweepFlag:sf}});
      cx=ex;cy=ey;
    } else if (type==='Z') { cx=sx;cy=sy; }
  }
  return segs;
}

const segs = parsePath(sourcePath);
console.log('Source segments:', segs.length);
segs.forEach((s,i) => {
  const len = s.type==='line' ? Math.hypot(s.end.x-s.start.x,s.end.y-s.start.y) : '(arc)';
  console.log(`  [${i}] ${s.type}  ${s.start.x.toFixed(4)},${s.start.y.toFixed(4)} -> ${s.end.x.toFixed(4)},${s.end.y.toFixed(4)}  ${s.type==='line'?'len='+len.toFixed(3):''}`);
});
console.log('');

for (const d of [70]) {
  try {
    const result = buildOffsetContour(segs, d, { joinType:'sharp', closed:true });
    console.log('Offset', d, '->', result.length, 'segments:');
    const first = result[0], last = result[result.length-1];
    const closedGap = Math.hypot(last.end.x-first.start.x, last.end.y-first.start.y);
    console.log('  closed gap:', closedGap.toFixed(4));
    for (const s of result) {
      if (s.type==='line') {
        const len = Math.hypot(s.end.x-s.start.x,s.end.y-s.start.y);
        const flag = len < 2 ? ' *** SHORT ***' : '';
        console.log(`  L  ${s.start.x.toFixed(3)},${s.start.y.toFixed(3)} -> ${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}  len=${len.toFixed(3)}${flag}`);
      } else if (s.type==='arc') {
        const r = s.arc?.r ?? s.arc?.rx ?? '?';
        console.log(`  A  r=${typeof r==='number'?r.toFixed(3):r}  ${s.start.x.toFixed(3)},${s.start.y.toFixed(3)} -> ${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}`);
      } else {
        console.log(' ', s.type);
      }
    }
    console.log('');
  } catch(e) { console.error('offset',d,'error:',e.message, e.stack?.split('\n').slice(0,3).join('\n')); }
}
