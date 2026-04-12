import { describe, it, expect } from 'vitest';
import ExportModule from '../src/export/ExportModule.js';

const exportModule = new ExportModule();

describe('Tracing coordinate corruption source', () => {
  it('should show step-by-step segment offsets at d=1 where arc degenerates', async () => {
    // Original: M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5
    // Segments:
    //  0: L from (3,5) to (2,9)
    //  1: A arc from (2,9) to (0,8) with r=1.4142, sweep=1  [WILL DEGENERATE]
    //  2: L from (0,8) to (0,0)
    //  3: H line from (0,0) to (10,0)
    //  4: V line from (10,0) to (10,3)
    //  5: L from (10,3) to (3,5)
    
    console.log(`\n=== SEGMENT-BY-SEGMENT OFFSET TRACE AT d=1.0 ===`);
    console.log(`Arc radius: 1.4142, sweepFlag: 1`);
    console.log(`Expected arc offset: newRadius = 1.4142 - 1.0 = 0.4142 (NOT degenerate)`);
    console.log(`But code shows "failed to offset segment 1, type=arc"`);
    console.log(`This suggests the degeneration check happens at a different point!`);
    
    // Let me create a simpler test case: just L -> A -> L
    const pathData = 'M 2 9 A 1.4142 1.4142 0 0 1 0 8 L 0 0';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    console.log(`\nSimpler test: L -> A (r=1.4142) -> L`);
    console.log(`Input: ${pathData}`);
    
    for (const d of [0.5, 1.0, 1.3, 1.4, 1.414, 1.415, 1.5]) {
      const newRadius = 1.4142 - d;  // offset formula for sweep=1
      const shouldDegenerate = newRadius <= 0.001;
      
      const result = await engine.processPath(pathData, d);
      console.log(`\nd=${d.toFixed(3)}: newRadius=${newRadius.toFixed(4)} ${shouldDegenerate ? '[DEGENERATE]' : '[VALID]'}`);
      console.log(`  Output: ${result.pathData}`);
      
      if (result.contours.length > 0 &&result.contours[0].segments.length > 0) {
        result.contours[0].segments.forEach((s, idx) => {
          const hasArc = s.type === 'arc';
          console.log(`  Seg ${idx}: ${s.type} ${hasArc ? `r=${s.arc.radius.toFixed(4)}` : ''}`);
        });
      }
    }
    
    expect(true).toBe(true);
  });

  it('should trace where the X=-5.830 coordinate comes from', async () => {
    // The problem output shows:
    // L 1.000000 7.872290 L -5.830060 9.823740 L 1.196020 8.092820
    // The X=-5.830 is a computed value, let's work backwards
    
    const pathData = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    const result = await engine.processPath(pathData, 1.0);
    console.log(`\n=== COORDINATE ANALYSIS ===`);
    console.log(`At d=1.0, output path:`);
    console.log(result.pathData);
    
    // The source path has:
    // L 2 9 initial
    // A 1.4142 ... 0 8
    // V 0
    
    // After offset d=1, the V line should move from x=0 to x=-1 (inward)
    // The L 0 8 to 0 0 becomes L ?  to -1 0
    
    // But we're seeing X=-5.830 which is way off
    // This suggests a tangent calculation or bridge calculation is wrong
    
    // Hypothesis: The bridge between the offset V and the next segment
    // is calculating using a wrong tangent, leading to:
    // p1 = V.start + inTangent * leg
    // If inTangent points in a very wrong direction, we get extreme coordinates
    
    console.log(`\nHypothesis: buildSharpTangentBridge is using wrong tangent direction`);
    console.log(`When arc drops, the gap-bridge tangent comes from the OFFSET segment before the arc,`);
    console.log(`not from the arc itself. This causes wrong direction.`);
    
    expect(true).toBe(true);
  });
});
