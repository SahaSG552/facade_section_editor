import { describe, it, expect } from 'vitest';
import ExportModule from '../src/export/ExportModule.js';

const exportModule = new ExportModule();

describe('Debug arc degeneration coordinate issue', () => {
  it('traces the strange coordinate at d=-2', async () => {
    const input = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    console.log('\n=== INWARD OFFSET d=-2 DEBUG ===');
    console.log('Input:', input);
    
    const result = await engine.processPath(input, -2.0, {});
    
    console.log('Result pathData:', result.pathData);
    console.log('Result contours:', result.contours.length);
    
    if (result.contours.length > 0) {
      const contour = result.contours[0];
      console.log('Contour segments:', contour.segments.length);
      contour.segments.forEach((seg, i) => {
        console.log(`  Seg ${i}: type=${seg.type}, start=${JSON.stringify(seg.start)}, end=${JSON.stringify(seg.end)}`);
      });
    }
    
    // Parse the pathData to see what's there
    const commands = result.pathData.match(/[MLZ][^MLZ]*/g) || [];
    console.log('\nPath commands:');
    commands.forEach((cmd, i) => {
      console.log(`  ${i}: ${cmd.trim()}`);
    });
  });

  it('compares offset steps vs direct offset', async () => {
    const input = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z';
    
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    console.log('\n=== STEP-BY-STEP DECOMPOSITION ===');
    console.log('Input:', input);
    
    // Direct -2
    const direct = await engine.processPath(input, -2.0, {});
    console.log('\nDirect d=-2:');
    console.log('  pathData:', direct.pathData);
    
    // Try -1
    const step1 = await engine.processPath(input, -1.0, {});
    console.log('\nStep 1: d=-1 from input');
    console.log('  pathData:', step1.pathData);
    
    // Then -1 from step1
    if (step1.pathData) {
      const step2 = await engine.processPath(step1.pathData, -1.0, {});
      console.log('\nStep 2: d=-1 from previous result');
      console.log('  pathData:', step2.pathData);
    }
  });
});
