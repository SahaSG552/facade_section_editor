import { OffsetEngine } from './src/operations/OffsetEngine.js';
import ExportModule from './src/export/ExportModule.js';

const engine = new OffsetEngine();
const em = new ExportModule();

// Approximate user's example: ~11x11 square with arcs on corners
const testPath = 'M 0 0 A 6 6 0 0 1 5.5 3.5 A 7 7 0 0 0 11 8 L 11 11 H 0 H -11 L -11 8 A 7 7 0 0 0 -5.5 3.5 A 6 6 0 0 1 0 0 Z';

console.log("=== Testing strong inward offset (should fully degenerate) ===");
console.log("Input path (approximate 11x11 with arc corners)");

const resultM8 = engine.calculateOffsetFromPathData(testPath, -8, {
    exportModule: em,
    offsetSignMode: 'direct',
    trimSelfIntersections: true,
});

console.log(`\nOffset -8 result: ${resultM8 ? 'HAS OUTPUT' : 'EMPTY (fully degenerated)'}`);
if (resultM8) {
    const lines = String(resultM8).trim().split(/(?=[ML])/);
    console.log(`  Segment count: ${lines.length}`);
    console.log(`  Path length: ${String(resultM8).length} chars`);
}

const resultM6 = engine.calculateOffsetFromPathData(testPath, -6, {
    exportModule: em,
    offsetSignMode: 'direct',
    trimSelfIntersections: true,
});

console.log(`\nOffset -6 result: ${resultM6 ? 'HAS OUTPUT' : 'EMPTY (fully degenerated)'}`);
if (resultM6) {
    const lines = String(resultM6).trim().split(/(?=[ML])/);
    console.log(`  Segment count: ${lines.length}`);
    console.log(`  Path length: ${String(resultM6).length} chars`);
}

const resultM4 = engine.calculateOffsetFromPathData(testPath, -4, {
    exportModule: em,
    offsetSignMode: 'direct',
    trimSelfIntersections: true,
});

console.log(`\nOffset -4 result: ${resultM4 ? 'HAS OUTPUT' : 'EMPTY (fully degenerated)'}`);
if (resultM4) {
    const lines = String(resultM4).trim().split(/(?=[ML])/);
    console.log(`  Segment count: ${lines.length}`);
}
