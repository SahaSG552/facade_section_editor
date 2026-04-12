import { describe, it, expect } from 'vitest';
import ExportModule from '../src/export/ExportModule.js';

const exportModule = new ExportModule();

describe('Debug: Why is hasSkippedBetween not detecting?', () => {
  it('should add detailed logging to trace segment indices', async () => {
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    // COMPLEX case: L -> L -> A -> V
    // Expected segments:
    // 0: L (3,5) -> (2,9)
    // 1: A (2,9) -> (0,8) with r=1.4142  [DEGENERATE - will be skipped]
    // 2: V (0,8) -> (0,0)
    
    const pathData = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0';
    
    console.log(`\n=== COMPLEX PATH STRUCTURE ===`);
    console.log(`Input: ${pathData}`);
    console.log(`Expected original segments:`);
    console.log(`  0: Line from (3,5) to (2,9)`);
    console.log(`  1: Arc from (2,9) to (0,8), r=1.4142, sweep=1 [WILL DEGENERATE]`);
    console.log(`  2: Line from (0,8) to (0,0)`);
    console.log(`\nAfter offsetting at d=1.0:`);
    console.log(`  Offset segments array will be: [offsetLine0, offsetLine2]`);
    console.log(`  SourceIndices will be: [0, 2]`);
    console.log(`  Gap detected between 0 and 2? YES (nextIdx=2, currentIdx=0, gap=1)`);
    console.log(`\nWhen building gap-bridge at i=0 (offset segment 0):`);
    console.log(`  currentSourceIndex = 0 (source of offsetLine0)`);
    console.log(`  nextSourceIndex = 2 (source of offsetLine2)`);
    console.log(`  hasSkippedBetween should check: is segment 1 in skippedSegments? YES`);
    console.log(`  → Should find arc segment 1`);
    console.log(`  → Should correct inTangent to arc's end tangent`);
    console.log(`\nBUT THE FIX ISN'T TRIGGERING!`);
    console.log(`Possible reasons:`);
    console.log(`  1. skippedSegments isn't populated for index 1`);
    console.log(`  2. hasSkippedBetween logic has wrong indices`);
    console.log(`  3. Gap-bridge logic isn't being reached (direct intersection succeeds?)`);
    
    const result = await engine.processPath(pathData, 1.0);
    console.log(`\nActual output: ${result.pathData}`);
    console.log(`Still shows Y=25? ${result.pathData.includes('25.')}`);
    
    expect(true).toBe(true);  // Diagnostic only
  });
});
