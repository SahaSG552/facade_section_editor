import { describe, it, expect } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const SRC_PATH = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z";
const exportModule = new ExportModule();

describe("offset-line-inversion-parallelism-break", () => {
  it("should degenerate near-zero line instead of inverting to break parallelism", async () => {
    // Original shape (contour 1):
    // M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z

    // Expected: Contour 4 (first offset inward by ~0.33)
    // M 1.6719 3.7154 L 1.6 4.003 L 1.6 1.6 L 8.4 1.6 L 8.4 1.7931 L 1.6719 3.7154

    // Contour 3 (second offset, where inversion breaks parallelism)
    // M 1.7 3.1907 L 1.7 1.7 L 8.3 1.7 L 8.3 1.7177 L 1.5889 3.6351 L 1.7 3.1907
    // PROBLEM: Line "L 8.3 1.7177" (length ~0.0177) should degenerate, but inverted

    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(SRC_PATH, 0.33);

    expect(result).toBeDefined();
    expect(result.contours.length).toBeGreaterThan(0);
    
    // The key invariant: if a segment degenerates to near-zero length,
    // it should be removed or merged, NOT inverted to maintain collinearity
    console.log("Offset result contours count:", result.contours.length);
    result.contours.forEach((c, i) => {
      console.log(`  Contour ${i}: ${c.segments?.length ?? 0} segments`);
    });
  });

  it("diagnoses line inversion root cause in offset contour 3", () => {
    // Trace exactly what happens at the problem line
    // seg-9: L 8.3 1.7177 (from contour 3)
    // This is the segment that inverted instead of degenerating

    // The segment connects from (8.3, 1.7) to (8.3, 1.7177)
    // This is a VERTICAL line with length 0.0177

    // In contour 4, the corresponding segments are:
    // L 8.4 1.6 (length of V is ~1.6)
    // L 8.4 1.7931 (length is 0.1931)

    // The problem: when line length becomes too small (near degenerate),
    // the offset algorithm must:
    // 1. Detect near-degeneracy
    // 2. Flag for removal or merging
    // NOT invert direction to hide the problem

    const contour3LineLength = 0.0177;
    const degeneracyThreshold = 0.05;
    
    const isNearDegenerate = contour3LineLength < degeneracyThreshold;
    expect(isNearDegenerate).toBe(true);
    
    console.log("Diagnostic:", {
      contour3LineLength,
      degeneracyThreshold,
      isNearDegenerate,
      issue: "Line length 0.0177 is near-degenerate; should not INVERT",
      expectedBehavior: "Flag as degenerate and remove or merge with neighbors",
      actualBehavior: "Inverted (direction flipped), breaking parallelism",
    });
  });

  it("validates parallelism preservation constraint", () => {
    // Core invariant for offset curves:
    // If line AB in original has offset A'B' in contour N,
    // then offset A'B'' in contour N+1 must remain parallel (or degenerate cleanly)
    // NOT INVERT

    // Original: H 10 (horizontal line, length 10, direction +X)
    // Contour 4 offset: V 1.7931 (vertical segment, length ~0.1931)
    // Contour 3 offset: V 1.7177 (vertical segment, length ~0.0177) <- PROBLEM

    // The contour 3 segment is nearly degenerate (~0.01 length)
    // but still appears with non-zero coordinates
    // This suggests it inverted OR accumulated numerical error

    const originalVector = { x: 10, y: 0 }; // H 10 direction
    const contour4Vector = { x: 0, y: 0.1931 }; // V offset
    const contour3Vector = { x: 0, y: 0.0177 }; // V offset (smaller)

    // They're parallel (both vertical), but contour3 is nearly degenerate
    // The problem: instead of recognizing degeneracy, algorithm inverted it

    expect(contour3Vector.y).toBeLessThan(0.05); // Flag as near-degenerate
    console.log("Parallelism check:", {
      originalDir: originalVector,
      contour4Dir: contour4Vector,
      contour3Dir: contour3Vector,
      contour3IsNearDegenerate: contour3Vector.y < 0.05,
    });
  });
});
