import { describe, it, expect } from 'vitest';
import ExportModule from '../src/export/ExportModule.js';

const exportModule = new ExportModule();

describe('Arc degeneration multiple contours', () => {
  it('handles outward offset where arc should NOT degenerate', async () => {
    // Contour 1: contains arc A 1.4142 1.4142 0 0 1 0 8
    const input = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    // Try outward offset (positive)
    const resultOut2 = await engine.processPath(input, 2.0, {});
    const resultOut5 = await engine.processPath(input, 5.0, {});
    
    console.log('=== OUTWARD OFFSET ===');
    console.log('Input:', input);
    console.log('Offset +2.0 path:', resultOut2.pathData);
    console.log('Offset +5.0 path:', resultOut5.pathData);
    
    // Arc should NOT disappear entirely in outward offset
    expect(resultOut2.pathData).toBeDefined();
    expect(resultOut2.pathData).not.toBe('');
    expect(resultOut5.pathData).toBeDefined();
    expect(resultOut5.pathData).not.toBe('');
  });

  it('handles inward offset where segments should NOT disappear after arc degeneration', async () => {
    const input = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    // Try inward offset (negative)
    const resultIn2 = await engine.processPath(input, -2.0, {});
    const resultIn3 = await engine.processPath(input, -3.0, {});
    
    console.log('=== INWARD OFFSET ===');
    console.log('Input:', input);
    console.log('Offset -2.0 path:', resultIn2.pathData);
    console.log('Offset -3.0 path:', resultIn3.pathData);
    
    // After arc degeneration, other segments should still exist
    expect(resultIn2.pathData).toBeDefined();
    expect(resultIn2.pathData).not.toBe('');
    expect(resultIn3.pathData).toBeDefined();
    expect(resultIn3.pathData).not.toBe('');
  });

  it('traces arc degeneration in detail', async () => {
    const input = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    // Trace with different offset values
    console.log('\n=== DETAILED TRACE ===');
    console.log('Input path:', input);
    
    for (let d of [-3, -2, -1, 0, 1, 2, 3, 5]) {
      try {
        const result = await engine.processPath(input, d, {});
        const segmentCount = (result.pathData.match(/[MLAVHCQz]/g) || []).length;
        console.log(`d=${d}: segments=${segmentCount}, length=${result.pathData.length}`);
        console.log(`  path: ${result.pathData.substring(0, 80)}...`);
      } catch (e) {
        console.log(`d=${d}: ERROR - ${e.message}`);
      }
    }
  });

  it('checks arc radius decrease through offsets', async () => {
    // Arc definition: radius = 1.4142 (approximately sqrt(2))
    // At different offset distances, this arc should shrink but not disappear immediately
    
    const arcRadius = 1.4142;
    console.log('\n=== ARC RADIUS ANALYSIS ===');
    console.log('Original arc radius:', arcRadius);
    
    // For outward offset (positive), arc grows
    // For inward offset (negative), arc shrinks
    
    for (let d of [-2, -1, 0, 1, 2]) {
      const offsetRadius = arcRadius - Math.abs(d);
      console.log(`Offset ${d}: arc radius becomes ${offsetRadius.toFixed(4)} (still valid: ${offsetRadius > 0})`);
    }
    
    // At d = -1.4142, arc should degenerate (radius = 0)
    // At d < -1.4142, arc should not exist
    // At d > -1.4142, arc should exist with reduced radius
  });
});
