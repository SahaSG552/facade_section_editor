#!/usr/bin/env node
// Fix open-contour П-bridge in OffsetContourBuilder.js
const fs = require('fs');
const f = 'src/operations/OffsetContourBuilder.js';
let c = fs.readFileSync(f, 'utf8');

// Fix 1: lineToArcNoIntersection + anti-parallel + open → tangent bridge
const F1_OLD = '              const sharpBridge = buildSharpTangentBridge(\n                current,\n                next,\n                inTangent,\n                outTangent,\n                distance\n              );\n              if (sharpBridge.length > 0) {\n                result.push(...sharpBridge);\n                continue;\n              }\n            }\n          }\n\n          // Arc→line convex case';
const F1_NEW = '              // For open contours, П-bridge creates a spurious closing segment.\n              // Use a simple straight connector so the path stays open.\n              if (!closed) {\n                const tangent = buildTangentBridge(current, next);\n                if (tangent) { result.push(tangent); continue; }\n              }\n              const sharpBridge = buildSharpTangentBridge(\n                current,\n                next,\n                inTangent,\n                outTangent,\n                distance\n              );\n              if (sharpBridge.length > 0) {\n                result.push(...sharpBridge);\n                continue;\n              }\n            }\n          }\n\n          // Arc→line convex case';

if (!c.includes(F1_OLD)) {
  console.error('FIX1 target not found');
  process.exit(1);
}
c = c.replace(F1_OLD, F1_NEW);
console.log('Fix1 (lineToArcNoIntersection) applied');

// Fix 2: arcToLineNoIntersection + anti-parallel + open → tangent bridge
const F2_OLD = '          if (arcToLineNoIntersection) {\n            const isAntiParallel = dot(inTangent, outTangent) < -0.5;\n            if (isAntiParallel) {\n              const sharpBridge = buildSharpTangentBridge(';
const F2_NEW = '          if (arcToLineNoIntersection) {\n            const isAntiParallel = dot(inTangent, outTangent) < -0.5;\n            if (isAntiParallel) {\n              // For open contours, П-bridge creates a spurious closing segment.\n              // Use a simple straight connector so the path stays open.\n              if (!closed) {\n                const tangent = buildTangentBridge(current, next);\n                if (tangent) { result.push(tangent); continue; }\n              }\n              const sharpBridge = buildSharpTangentBridge(';

if (!c.includes(F2_OLD)) {
  console.error('FIX2 target not found');
  process.exit(1);
}
c = c.replace(F2_OLD, F2_NEW);
console.log('Fix2 (arcToLineNoIntersection) applied');

// Fix 3: droppedGap early-exit for open contours with dropped arc
// Insert after "let droppedArcRadius = null;" block, before directIntersection
const F3_OLD = '        // Priority rule: prefer a direct intersection over a bridge, but only when\n        // the intersection lies "in front of" both segments (t-parameters >= 0).\n        // When the intersection is behind next.start (t2 < 0), the two offset\n        // lines are already past each other — a bridge is required instead.';
const F3_NEW = '        // For open contours with a dropped concave arc: connect endpoints with\n        // a straight segment instead of building a П/U-bridge. The bridge is only\n        // appropriate for closed contours (where the collapsed arc forms an enclosed\n        // pocket). Open contours should just close the gap directly.\n        if (!closed && droppedArcRadius != null) {\n          const gapLen = Math.hypot(next.start.x - current.end.x, next.start.y - current.end.y);\n          if (gapLen > EPSILON) {\n            result.push({ type: "line", start: clonePoint(current.end), end: clonePoint(next.start) });\n          }\n          continue;\n        }\n\n        // Priority rule: prefer a direct intersection over a bridge, but only when\n        // the intersection lies "in front of" both segments (t-parameters >= 0).\n        // When the intersection is behind next.start (t2 < 0), the two offset\n        // lines are already past each other — a bridge is required instead.';

if (!c.includes(F3_OLD)) {
  console.error('FIX3 target not found');
  process.exit(1);
}
c = c.replace(F3_OLD, F3_NEW);
console.log('Fix3 (droppedGap open early-exit) applied');

fs.writeFileSync(f, c, 'utf8');
console.log('Saved. Length: ' + c.length);
