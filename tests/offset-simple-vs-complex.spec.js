import { describe, it, expect } from 'vitest';
import ExportModule from '../src/export/ExportModule.js';

const exportModule = new ExportModule();

describe('Complex vs Simple offset: where does Y=25 appear?', () => {
  it('should compare simple (works) vs complex (breaks)', async () => {
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    // SIMPLE:  L -> A -> L (works fine, no spurious Y)
    const simple = 'M 2 9 A 1.4142 1.4142 0 0 1 0 8 L 0 0';
    
    // COMPLEX: L -> L -> A -> L -> H -> L -> V (spurious Y=25)
    const complex = 'M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0';
    
    console.log(`\n=== SIMPLE (L -> A -> L) AT d=1 ===`);
    const resultSimple = await engine.processPath(simple, 1.0);
    console.log(resultSimple.pathData);
    console.log(`Segments: ${resultSimple.contours[0]?.segments.length || 0}`);
    if (resultSimple.contours[0]?.segments) {
      resultSimple.contours[0].segments.forEach((s, i) => {
        console.log(`  ${i}: ${s.type} from (${s.start.x.toFixed(2)},${s.start.y.toFixed(2)}) to (${s.end.x.toFixed(2)},${s.end.y.toFixed(2)})`);
      });
    }
    
    console.log(`\n=== COMPLEX (L -> L -> A -> V) AT d=1 ===`);
    const resultComplex = await engine.processPath(complex, 1.0);
    console.log(resultComplex.pathData);
    console.log(`Segments: ${resultComplex.contours[0]?.segments.length || 0}`);
    if (resultComplex.contours[0]?.segments) {
      resultComplex.contours[0].segments.forEach((s, i) => {
        console.log(`  ${i}: ${s.type} from (${s.start.x.toFixed(2)},${s.start.y.toFixed(2)}) to (${s.end.x.toFixed(2)},${s.end.y.toFixed(2)})`);
      });
    }
    
    // Now try MEDIUM complexity: starting with a line like the complex
    console.log(`\n=== MEDIUM (L -> A -> V) AT d=1 ===`);
    const medium = 'M 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0';
    const resultMedium = await engine.processPath(medium, 1.0);
    console.log(resultMedium.pathData);
    
    // Try just the arc + V without the leading L
    console.log(`\n=== ARC -> V ONLY AT d=1 ===`);
    const arcV = 'M 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0';
    const resultArcV = await engine.processPath(arcV, 1.0);
    console.log(resultArcV.pathData);
    
    expect(true).toBe(true);
  });
  
  it('should understand where the Y offset goes', async () => {
    const { OffsetEngine } = await import('../src/operations/OffsetEngine.js');
    const engine = new OffsetEngine({ exportModule });
    
    //  The V segment is unusual: it's "V 0" which means vertical line to y=0
    // At x=0, y value changes only
    // When offset inward by 1, x becomes -1
    // But y stays... 0? Or becomes something else?
    
    const pathWithV = 'M 0 10 L 0 0 V 0';  // Simple: L then V both to same endpoint
    const pathWithL = 'M 0 10 L 0 0 L 0 -1';  // Equivalent using L instead of V
    
    console.log(`\n=== Understanding V segment behavior ===`);
    console.log(`With V: ${pathWithV}`);
    const resultV = await engine.processPath(pathWithV, 1.0);
    console.log(`After offset: ${resultV.pathData}`);
    
    console.log(`\nWith L: ${pathWithL}`); 
    const resultL = await engine.processPath(pathWithL, 1.0);
    console.log(`After offset: ${resultL.pathData}`);
    
    // The user's issue shows V 0 becomes L ...  25.123106
    // This 25 value is suspicious - is it related to some distance calculation?
    // 25 = 5 * 5? 25 = inRadius² ?
    // Actually user said "Y=33.246211" in earlier trace, let me check what that is
    // 33.246211?
    // sqrt(2) * 23? 1.4142 * 23.5 = 33.23
    // Maybe it's related to the arc radius and some other multiplier?
    
    expect(true).toBe(true);
  });
});
