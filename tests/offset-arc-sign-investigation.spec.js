import { describe, it, expect } from 'vitest';
import ExportModule from '../src/export/ExportModule.js';

const exportModule = new ExportModule();

describe('Arc Sign Convention Investigation', () => {
  it('should clarify arc radius change with positive vs negative distance', async () => {
    // User's arc: radius = 1.4142 (≈√2), sweepFlag = 1
    // Arc: A 1.4142 1.4142 0 0 1 0 8
    // Connected to polyline: M 3 5 L 2 9 (then arc) L 0 8 V 0 H 10 V 3 L 3 5
    
    // The arc endpoint form: start=(2,9), radius=(1.4142, 1.4142), rotation=0, largeArc=0, sweep=1, end=(0,8)
    // This means arc goes counterclockwise from (2,9) to (0,8)
    
    const pathData = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    console.log(`\n=== TRACING ARC RADIUS WITH DIFFERENT OFFSETS ===`);
    console.log(`Original path: ${pathData}`);
    console.log(`Arc: start=(2,9), sweep=1 (CCW), end=(0,8), radius=1.4142`);
    
    // Test different offset distances
    const distances = [-3, -2, -1, 0, 1, 2, 3, 5];
    const engine = new (await import('../src/operations/OffsetEngine.js')).OffsetEngine({ exportModule });
    
    for (const distance of distances) {
      // According to OffsetCurveEvaluator.offsetArc():
      // For sweep=1: newRadius = radius - distance
      const origRadius = 1.4142;
      const expectedNewRadius = origRadius - distance;
      
      console.log(`\n--- Distance d=${distance} ---`);
      console.log(`  Formula: newRadius = ${origRadius} - ${distance} = ${expectedNewRadius}`);
      
      if (expectedNewRadius > 0.001) {
        console.log(`  ✓ Arc would be valid (newRadius = ${expectedNewRadius})`);
      } else {
        console.log(`  ✗ Arc would be DEGENERATE (newRadius = ${expectedNewRadius} ≤ EPSILON)`);
      }
      
      // Now test what actually happens
      try {
        const result = await engine.processPath(pathData, distance);
        const offsetPath = result.pathData;
        const segmentCount = (offsetPath.match(/[MLAVHZz]/g) || []).length;
        console.log(`  Actual output: ${segmentCount} segments, path length = ${offsetPath.length}`);
        if (offsetPath.length < 20) {
          console.log(`  WARNING: Output too short! Path="${offsetPath}"`);
        }
      } catch (e) {
        console.log(`  ERROR: ${e.message}`);
      }
    }
    
    // Key insight
    console.log(`\n=== KEY INSIGHT ===`);
    console.log(`For arc with sweep=1:`);
    console.log(`  - Positive distance (inward): newRadius = 1.4142 - (+d) → SHRINKS `);
    console.log(`  - Negative distance (outward): newRadius = 1.4142 - (-d) = 1.4142 + |d| → GROWS`);
    console.log(`\nBut user says arc degenerates when "offsetting outward"`);
    console.log(`This suggests: either (1) user is using opposite sign convention,`);
    console.log(`or (2) there's a bug in how we determine arc center/endpoints`);
    
    expect(true).toBe(true);  // This test is diagnostic only
  });
  
  it('should trace arc center calculation for endpoint form', async () => {
    // SVG arc endpoint form requires center to be calculated from endpoints + radii + flags
    // This is the most likely place for sign errors
    
    const startPoint = { x: 2, y: 9 };
    const endPoint = { x: 0, y: 8 };
    const rx = 1.4142;
    const ry = 1.4142;
    const xAxisRotation = 0;
    const largeArcFlag = 0;
    const sweepFlag = 1;
    
    console.log(`\n=== ARC CENTER CALCULATION ===`);
    console.log(`Start: (${startPoint.x}, ${startPoint.y})`);
    console.log(`End: (${endPoint.x}, ${endPoint.y})`);
    console.log(`Radii: rx=${rx}, ry=${ry}`);
    console.log(`Flags: large-arc=${largeArcFlag}, sweep=${sweepFlag}`);
    
    // The arc center should be calculated using SVG spec formulas
    // This is where errors could occur relative to actual versus expected geometry
    
    const dx = (endPoint.x - startPoint.x) / 2;
    const dy = (endPoint.y - startPoint.y) / 2;
    const midpoint = { x: startPoint.x + dx, y: startPoint.y + dy };
    
    console.log(`\nMidpoint: (${midpoint.x}, ${midpoint.y})`);
    
    // For debugging: let user manually verify center calculation
    // by parsing our OffsetEngine output
    const pathData = `M 2 9 A ${rx} ${ry} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${endPoint.x} ${endPoint.y}`;
    console.log(`Arc path: ${pathData}`);
    
    expect(true).toBe(true);  // Diagnostic only
  });
});
