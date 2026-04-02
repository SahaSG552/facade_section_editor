/**
 * QA Scenarios for Task 4: OffsetTrimmer
 * 
 * Run with: node .sisyphus/qa-task-4.mjs
 */

// Import the trimmer module
import OffsetTrimmer from '../src/operations/OffsetTrimmer.js';

const { trimSelfIntersections, segmentsToPathString, pathStringToSegments } = OffsetTrimmer;

console.log("=".repeat(80));
console.log("QA SCENARIO 1: Trim self-intersecting contour");
console.log("=".repeat(80));

// Create a simple self-intersecting contour (figure-8 like shape)
// This is a concave offset scenario that would create self-intersections
const selfIntersectingSegments = [
  { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
  { type: "line", start: { x: 10, y: 0 }, end: { x: 15, y: 5 } },
  { type: "line", start: { x: 15, y: 5 }, end: { x: 10, y: 10 } },
  { type: "line", start: { x: 10, y: 10 }, end: { x: 0, y: 10 } },
  { type: "line", start: { x: 0, y: 10 }, end: { x: 5, y: 5 } },
  { type: "line", start: { x: 5, y: 5 }, end: { x: 0, y: 0 } },  // Creates crossing
];

console.log("\nInput segments (6 lines forming a contour with potential self-intersection):");
selfIntersectingSegments.forEach((seg, i) => {
  console.log(`  ${i}: ${seg.type} (${seg.start.x},${seg.start.y}) → (${seg.end.x},${seg.end.y})`);
});

const pathStr1 = segmentsToPathString(selfIntersectingSegments);
console.log(`\nConverted to SVG path: ${pathStr1.substring(0, 100)}...`);

const cleanSegments = trimSelfIntersections(selfIntersectingSegments);
console.log(`\nAfter trimming: ${cleanSegments.length} segments`);
cleanSegments.forEach((seg, i) => {
  if (seg.type === "line") {
    console.log(`  ${i}: ${seg.type} (${seg.start.x.toFixed(2)},${seg.start.y.toFixed(2)}) → (${seg.end.x.toFixed(2)},${seg.end.y.toFixed(2)})`);
  } else if (seg.type === "arc") {
    console.log(`  ${i}: ${seg.type} (${seg.start.x.toFixed(2)},${seg.start.y.toFixed(2)}) → (${seg.end.x.toFixed(2)},${seg.end.y.toFixed(2)})`);
  }
});

console.log("\n" + "=".repeat(80));
console.log("QA SCENARIO 2: Pass-through non-intersecting contour");
console.log("=".repeat(80));

// Simple rectangle - no self-intersections
const cleanContour = [
  { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
  { type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
  { type: "line", start: { x: 10, y: 10 }, end: { x: 0, y: 10 } },
  { type: "line", start: { x: 0, y: 10 }, end: { x: 0, y: 0 } },  // Closed
];

console.log("\nInput segments (4 lines forming a clean rectangle):");
cleanContour.forEach((seg, i) => {
  console.log(`  ${i}: ${seg.type} (${seg.start.x},${seg.start.y}) → (${seg.end.x},${seg.end.y})`);
});

const pathStr2 = segmentsToPathString(cleanContour);
console.log(`\nConverted to SVG path: ${pathStr2}`);

const trimmedClean = trimSelfIntersections(cleanContour);
console.log(`\nAfter trimming: ${trimmedClean.length} segments (should be same or similar)`);
trimmedClean.forEach((seg, i) => {
  if (seg.type === "line") {
    console.log(`  ${i}: ${seg.type} (${seg.start.x.toFixed(2)},${seg.start.y.toFixed(2)}) → (${seg.end.x.toFixed(2)},${seg.end.y.toFixed(2)})`);
  }
});

console.log("\n" + "=".repeat(80));
console.log("QA SCENARIO 3: Round-trip test - segments → SVG → segments");
console.log("=".repeat(80));

const testSegments = [
  { type: "line", start: { x: 0, y: 0 }, end: { x: 5, y: 0 } },
  { type: "arc", start: { x: 5, y: 0 }, end: { x: 5, y: 5 }, arc: { radius: 5, sweepFlag: 1, largeArcFlag: 0 } },
  { type: "line", start: { x: 5, y: 5 }, end: { x: 0, y: 5 } },
];

console.log("\nOriginal segments:");
testSegments.forEach((seg, i) => {
  console.log(`  ${i}: ${seg.type}`);
});

const svgPath = segmentsToPathString(testSegments);
console.log(`\nSVG path: ${svgPath}`);

const parsedBack = pathStringToSegments(svgPath);
console.log(`\nParsed back: ${parsedBack.length} segments`);
parsedBack.forEach((seg, i) => {
  console.log(`  ${i}: ${seg.type}`);
});

console.log("\n" + "=".repeat(80));
console.log("QA Complete");
console.log("=".repeat(80));
