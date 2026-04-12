import { describe, it, expect } from 'vitest';
import ExportModule from '../src/export/ExportModule.js';

const exportModule = new ExportModule();

describe('User exact profile: arcs with degeneration', () => {
  it('should reproduce user issue #1: outward offset arc degenerates too early', async () => {
    // User reported: "при оффсете наружу арка сразу вырождается и соседние сегменты соединяются напрямую. но арка не должна в этом случае выродиться"
    // Meaning: outward offset (negative d in code), arc degenerates immediately, neighbors connect directly, BUT ARC SHOULD NOT DEGENERATE
    
    // Unfortunately, user didn't provide exact pathData. Let's construct from their description:
    // - Arc with radius ≈ 1.4142 (√2)
    // - The arc is part of a closed contour
    // - Multiple contours in the shape
    
    // For now, use the test contour:
    const pathData = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    console.log('\n=== USER ISSUE #1: OUTWARD OFFSET ===');
    console.log('Input:', pathData);
    
    // Test different outward (negative) offsets
    for (const d of [-0.5, -1, -1.5, -2, -2.5, -3]) {
      const result = await engine.processPath(pathData, d);
      console.log(`\nOutward d=${d}:`);
      console.log(`  Path length: ${result.pathData.length}`);
      console.log(`  Segments: ${(result.pathData.match(/[MLAVHCQz]/g) || []).length}`);
      console.log(`  Arc present: ${result.pathData.includes('A')}`);
      console.log(`  Path: ${result.pathData.substring(0, 100)}...`);
      
      // Arc should NOT disappear for outward offsets with small magnitude
      if (Math.abs(d) <= 1.0) {
        expect(result.pathData).not.toBe('');
        expect(result.pathData.includes('A')).toBe(true);  // Arc should exist
      }
    }
  });
  
  it('should reproduce user issue #2: inward offset segments disappear after arc degeneration', async () => {
    // User reported: "при оффсете внутрь после вырождения арки пропадают и другие сегменты"
    // Meaning: inward offset (positive d in code), after arc degenerates, OTHER SEGMENTS DISAPPEAR
    // Also reported: spurious Y coordinates like 33.246211
    
    const pathData = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    console.log('\n=== USER ISSUE #2: INWARD OFFSET ===');
    console.log('Input:', pathData);
    console.log('Expected segments: 5 (L L A V H L Z)');
    
    // Test different inward (positive) offsets
    for (const d of [0.5, 1.0, 1.4, 1.5, 2.0, 3.0, 5.0]) {
      const result = await engine.processPath(pathData, d);
      const segmentCount = (result.pathData.match(/[MLAVHCQz]/g) || []).length;
      console.log(`\nInward d=${d}:`);
      console.log(`  Path length: ${result.pathData.length}`);
      console.log(`  Segments: ${segmentCount}`);
      console.log(`  Path: ${result.pathData}`);
      
      // After arc degeneration (d > 1.4142), OTHER SEGMENTS should still exist
      if (d > 1.5) {
        expect(result.pathData).not.toBe('', `Outward d=${d}: output should not be empty`);
        expect(segmentCount).toBeGreaterThan(0, `Inward d=${d}: should have segments`);
      }
    }
  });
  
  it('should trace spurious Y coordinate issue at specific inward offsets', async () => {
    // User reported Y coordinates like 33.246211 appearing in offset results
    // This suggests gap-bridge tangent calculation is wrong for degenerate arcs
    
    const pathData = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    console.log('\n=== CHECKING FOR SPURIOUS COORDINATES ===');
    
    // Test near-degenerate inward offsets
    for (const d of [1.0, 1.4, 1.5, 2.0]) {
      const result = await engine.processPath(pathData, d);
      const pathStr = result.pathData;
      
      // Extract all Y coordinates
      const yMatches = pathStr.match(/[ML\s-]?(\d+\.?\d*)[^0-9.]/g);
      console.log(`\nInward d=${d}:`);
      console.log(`  Path: ${pathStr}`);
      
      // Check for any Y coordinates that are suspiciously large (like 25, 33, etc.)
      if (pathStr.match(/\s\d+\.\d{6,}\s/)) {
        console.log(`  WARNING: Found suspicious coordinates with many decimal places!`);
        const coords = pathStr.match(/(\d+\.\d+)\s+(\d+\.\d+)/g);
        if (coords) {
          coords.forEach(coord => {
            const [x, y] = coord.split(/\s+/);
            if (parseFloat(y) > 20 || parseFloat(y) < -20) {
              console.log(`    → Suspicious Y: ${y}`);
            }
          });
        }
      }
    }
  });
  
  it('should show actual empty output at high inward offset', async () => {
    const pathData = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    console.log('\n=== CRITICAL: HIGH INWARD OFFSET PRODUCES EMPTY OUTPUT ===');
    
    const result5 = await engine.processPath(pathData, 5.0);
    console.log(`Inward d=+5.0:`);
    console.log(`  Path: "${result5.pathData}"`);
    console.log(`  Length: ${result5.pathData.length}`);
    console.log(`  Is empty: ${result5.pathData === ''}`);
    
    // This is WRONG - output should not be completely empty
    // Arc degenerates at d ≈ 1.4, but other segments should remain
    expect(result5.pathData).not.toBe('', 'High inward offset should not produce empty output');
  });
});
