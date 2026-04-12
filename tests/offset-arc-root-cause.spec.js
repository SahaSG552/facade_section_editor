import { describe, it, expect } from 'vitest';
import ExportModule from '../src/export/ExportModule.js';
import { getTangent } from '../src/operations/OffsetContourBuilder.js';

const exportModule = new ExportModule();

describe('Root cause: dropped arc bridge tangent direction', () => {
  it('should trace tangent calculation when arc is dropped', async () => {
    // Simple case: L -> A -> L
    // When A drops, the bridge should use tangent from A's endpoint, not L's
    
    const pathData = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0';  // L0, A1, L2
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    // At d=1, A should dropbecause newRadius = 1.4142 - 1 = 0.4142
    // At d=1.5, A should definitely drop because newRadius = 1.4142 - 1.5 = -0.0858
    
    const result1_5 = await engine.processPath(pathData, 1.5);
    console.log(`\nAt d=1.5 (A should drop):`);
    console.log(`Result: "${result1_5.pathData}"`);
    console.log(`Contours: ${result1_5.contours.length}`);
    
    if (result1_5.contours.length > 0) {
      const segs = result1_5.contours[0].segments;
      console.log(`Segments: ${segs.length}`);
      segs.forEach((s, i) => {
        console.log(`  ${i}: ${s.type} from (${s.start.x.toFixed(2)},${s.start.y.toFixed(2)}) to (${s.end.x.toFixed(2)},${s.end.y.toFixed(2)})`);
      });
    }
    
    // The suspicious Y coordinate problem  likely happens because:
    // When calculating bridge from L0 to L2 after A drops:
    // - inTangent = getTangent(L0, "end") = direction of L0
    // - outTangent = getTangent(L2, "start") = direction of L2
    // But these tangents don't represent the actual gap!
    // The actual gap was between these two segments with A in between.
    
    // When buildSharpTangentBridge uses these wrong tangents:
    // p1 = L0.end + inTangent * leg  ← could point wrong direction!
    // p2 = L2.start - outTangent * leg  ← could point wrong direction!
    
    expect(true).toBe(true);
  });

  it('should show the fix direction: use A tangent instead of L0 tangent',()  => {
    //When A drops, the correct bridge should use:
    // - inTangent = tangent of A's END point (from original A)
    // - outTangent = tangent of L2's START (from offset L2)
    // NOT:
    // - inTangent = tangent of L0's END (from offset L0)
    // - outTangent = tangent of L2's START (from offset L2)
    
    console.log(`\n=== FIX DIRECTION ===`);
    console.log(`When segment i is dropped (returns null from offsetSegment):`);
    console.log(`1. Record the ORIGINAL segment's end tangent`);
    console.log(`2. Store it indexed by source index`);
    console.log(`3. When building bridge, use DROPPED segment's tangent, not previous segment's tangent`);
    
    expect(true).toBe(true);
  });
});
