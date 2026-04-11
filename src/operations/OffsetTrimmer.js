/**
 * OffsetTrimmer — Paper.js Boolean Wrapper
 *
 * Thin wrapper around PaperBooleanProcessor for self-intersection trimming in offset operations.
 * Converts offset contour segments to SVG path format, delegates trimming to PaperBooleanProcessor,
 * and parses result back to segment array.
 *
 * Patterns from Tasks 2-3:
 * - Segment format: {type: "line"|"arc"|"bezier", start: {x,y}, end: {x,y}, arc?: {...}}
 * - Immutability: Always returns new objects, never mutates input
 * - Y-down coordinate system (SVG/Paper.js standard)
 * - Both arc formats supported: {arc: {center: {x,y}}} and {arc: {centerX, centerY}}
 */

import LoggerFactory from "../core/LoggerFactory.js";
import { resolveSelfIntersections, resolveSelfIntersectionsDetailed } from "./PaperBooleanProcessor.js";

const log = LoggerFactory.createLogger("OffsetTrimmer");

const BEZIER_TOLERANCE = 1e-4;

/**
 * Evaluate one coordinate at parameter t on a cubic bezier.
 */
function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

/**
 * Compute how many line segments are needed to approximate a cubic bezier
 * within BEZIER_TOLERANCE. Uses the convex-hull bound: error <= 3/4 * max
 * distance of control points from the chord.
 */
function computeBezierSteps(x0, y0, x1, y1, x2, y2, x3, y3) {
  // Rough bound based on control polygon
  const dx1 = x1 - x0, dy1 = y1 - y0;
  const dx2 = x2 - x1, dy2 = y2 - y1;
  const dx3 = x3 - x2, dy3 = y3 - y2;
  const maxDeviation = Math.max(
    Math.abs(dx1 * dy2 - dy1 * dx2),
    Math.abs(dx2 * dy3 - dy2 * dx3),
  );
  if (maxDeviation < BEZIER_TOLERANCE) return 1;
  // More segments for larger curves
  const steps = Math.max(1, Math.ceil(Math.sqrt(maxDeviation / BEZIER_TOLERANCE)));
  return Math.min(steps, 32); // cap to avoid over-segmentation
}

/**
 * Trim self-intersections from offset contour using Paper.js Boolean operations.
 *
 * Main entry point: Converts segments to SVG path, calls PaperBooleanProcessor.resolveSelfIntersections(),
 * and parses result back to segment array.
 *
 * @param {Array<Object>} segments - Array of segment objects (line, arc, bezier)
 *   - Each segment: {type: "line"|"arc"|"bezier", start: {x,y}, end: {x,y}, arc?: {...}, cp1?: {...}, cp2?: {...}}
 * @returns {Array<Object>} Clean segments without self-intersections (immutable copy)
 *   - Returns empty array if input is invalid or trimming fails
 *   - Non-intersecting contours pass through cleanly
 *
 * @example
 * // Segment with self-intersection (e.g., concave offset)
 * const dirtySegments = [
 *   {type: "line", start: {x: 0, y: 0}, end: {x: 10, y: 0}},
 *   {type: "arc", start: {x: 10, y: 0}, end: {x: 5, y: 10}, arc: {center: {x: 5, y: 5}, radius: 5, ...}},
 *   // ... segments that create self-intersection
 * ];
 * const cleanSegments = trimSelfIntersections(dirtySegments);
 */
export function trimSelfIntersections(segments) {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    log.warn("trimSelfIntersections: invalid or empty segments input");
    return [];
  }

  try {
    // 1. Convert segments to SVG path string
    const pathData = segmentsToPathString(segments);
    if (!pathData) {
      log.warn("trimSelfIntersections: failed to convert segments to path");
      return [];
    }

    log.debug(
      `[Trimmer] Input path: ${pathData.substring(0, 100)}${pathData.length > 100 ? "..." : ""}`
    );

    // 2. Call resolveSelfIntersections to resolve self-intersections
    const cleanedPathData = resolveSelfIntersections(pathData);
    if (!cleanedPathData) {
      log.warn("trimSelfIntersections: PaperBooleanProcessor returned empty path");
      return [];
    }

    log.debug(
      `[Trimmer] Cleaned path: ${cleanedPathData.substring(0, 100)}${cleanedPathData.length > 100 ? "..." : ""}`
    );

    // 3. Parse result back to segment array
    const cleanSegments = pathStringToSegments(cleanedPathData);
    if (!cleanSegments || cleanSegments.length === 0) {
      log.warn("trimSelfIntersections: failed to parse cleaned path back to segments");
      return [];
    }

    log.info(
      `Trimmed ${segments.length} input segments → ${cleanSegments.length} clean segments`
    );
    return cleanSegments;
  } catch (error) {
    log.error("trimSelfIntersections failed:", error);
    return [];
  }
}

export function trimSelfIntersectionsDetailed(segments) {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    log.warn("trimSelfIntersectionsDetailed: invalid or empty segments input");
    return [];
  }

  try {
    const pathData = segmentsToPathString(segments);
    if (!pathData) {
      log.warn("trimSelfIntersectionsDetailed: failed to convert segments to path");
      return [];
    }

    const resolved = resolveSelfIntersectionsDetailed(pathData, { preserveAllComponents: true });
    if (!resolved?.hadSelfIntersections) {
      return [];
    }
    if (!resolved?.components?.length) {
      return [];
    }

    const detailedComponents = resolved.components
      .map((component) => ({
        pathData: component.pathData,
        area: Number(component.area) || 0,
        clockwise: !!component.clockwise,
        segments: pathStringToSegments(component.pathData),
      }))
      .filter((component) => Array.isArray(component.segments) && component.segments.length > 0);

    log.info(
      `Trimmed ${segments.length} input segments → ${detailedComponents.reduce((sum, c) => sum + c.segments.length, 0)} clean segments`
    );
    return detailedComponents;
  } catch (error) {
    log.error("trimSelfIntersectionsDetailed failed:", error);
    return [];
  }
}

/**
 * Convert segment array to SVG path string (d attribute).
 *
 * Transforms segment objects to SVG path data format suitable for Paper.js operations.
 * Supports line, arc (with both center formats), and bezier segments.
 * Automatically closes path if first start point ≈ last end point (within 0.001 tolerance).
 *
 * @param {Array<Object>} segments - Segment objects to convert
 *   - Line: {type: "line", start: {x,y}, end: {x,y}}
 *   - Arc: {type: "arc", start: {x,y}, end: {x,y}, arc: {center: {x,y} | centerX/centerY, radius, ...}}
 *   - Bezier: {type: "bezier", start: {x,y}, cp1: {x,y}, cp2: {x,y}, end: {x,y}}
 * @returns {string} SVG path data string (e.g., "M 0 0 L 10 0 A 5 5 0 0 1 10 10 Z")
 *   - Empty string if input is invalid
 *
 * @example
 * const path = segmentsToPathString([
 *   {type: "line", start: {x: 0, y: 0}, end: {x: 10, y: 0}},
 *   {type: "line", start: {x: 10, y: 0}, end: {x: 10, y: 10}}
 * ]);
 * // Returns: "M 0 0 L 10 0 L 10 10"
 */
export function segmentsToPathString(segments) {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return "";
  }

  const pathCommands = [];
  let currentX = null;
  let currentY = null;

  try {
    segments.forEach((segment, index) => {
      if (!segment || !segment.start) {
        log.warn(
          `[segmentsToPathString] Invalid segment at index ${index}: ${JSON.stringify(segment)}`
        );
        return;
      }

      // First segment or discontinuity: emit Move command
      if (
        index === 0 ||
        currentX !== segment.start.x ||
        currentY !== segment.start.y
      ) {
        pathCommands.push(
          `M ${segment.start.x.toFixed(6)} ${segment.start.y.toFixed(6)}`
        );
        currentX = segment.start.x;
        currentY = segment.start.y;
      }

      switch (segment.type) {
        case "line": {
          if (!segment.end) {
            log.warn(`[segmentsToPathString] Line segment missing end point`);
            return;
          }
          pathCommands.push(
            `L ${segment.end.x.toFixed(6)} ${segment.end.y.toFixed(6)}`
          );
          currentX = segment.end.x;
          currentY = segment.end.y;
          break;
        }

        case "arc": {
          if (!segment.end || !segment.arc) {
            log.warn(`[segmentsToPathString] Arc segment missing end or arc data`);
            return;
          }

          const arc = segment.arc;

          // Extract radius (can be rx/ry or radius)
          let rx = arc.radius || arc.rx || 0;
          let ry = arc.radius || arc.ry || 0;

          // Extract rotation (usually 0 for circular arcs)
          const rotation = arc.xAxisRotation || 0;

          // Extract flags
          const largeArc = arc.largeArcFlag !== undefined ? arc.largeArcFlag : 0;
          let sweep;
          if (arc.sweepFlag !== undefined) {
            sweep = arc.sweepFlag;
          } else if (arc.isCCW !== undefined) {
            sweep = arc.isCCW ? 0 : 1;
          } else {
            sweep = 1; // default clockwise
          }

          pathCommands.push(
            `A ${rx.toFixed(6)} ${ry.toFixed(6)} ${rotation} ${largeArc} ${sweep} ${segment.end.x.toFixed(
              6
            )} ${segment.end.y.toFixed(6)}`
          );
          currentX = segment.end.x;
          currentY = segment.end.y;
          break;
        }

        case "bezier": {
          if (!segment.cp1 || !segment.cp2 || !segment.end) {
            log.warn(
              `[segmentsToPathString] Bezier segment missing control points or end`
            );
            return;
          }
          pathCommands.push(
            `C ${segment.cp1.x.toFixed(6)} ${segment.cp1.y.toFixed(
              6
            )} ${segment.cp2.x.toFixed(6)} ${segment.cp2.y.toFixed(
              6
            )} ${segment.end.x.toFixed(6)} ${segment.end.y.toFixed(6)}`
          );
          currentX = segment.end.x;
          currentY = segment.end.y;
          break;
        }

        default: {
          log.warn(`[segmentsToPathString] Unknown segment type: ${segment.type}`);
        }
      }
    });

    // Auto-close path if first start ≈ last end
    if (segments.length > 0) {
      const firstSeg = segments[0];
      const lastSeg = segments[segments.length - 1];
      const eps = 0.001;

      if (
        firstSeg &&
        lastSeg &&
        firstSeg.start &&
        lastSeg.end &&
        Math.abs(firstSeg.start.x - lastSeg.end.x) < eps &&
        Math.abs(firstSeg.start.y - lastSeg.end.y) < eps
      ) {
        pathCommands.push("Z");
      }
    }

    const pathData = pathCommands.join(" ");
    return pathData;
  } catch (error) {
    log.error("segmentsToPathString failed:", error);
    return "";
  }
}

/**
 * Convert SVG arc endpoint parameterization to center parameterization.
 *
 * Implements the W3C SVG spec Appendix F.6 algorithm:
 * https://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter
 *
 * @param {number} x1 - Arc start X.
 * @param {number} y1 - Arc start Y.
 * @param {number} rx - X-axis radius.
 * @param {number} ry - Y-axis radius.
 * @param {number} xAxisRotation - X-axis rotation in radians.
 * @param {number} largeArcFlag - Large arc flag (0 or 1).
 * @param {number} sweepFlag - Sweep flag (0 = CW, 1 = CCW).
 * @param {number} x2 - Arc end X.
 * @param {number} y2 - Arc end Y.
 * @returns {{cx:number, cy:number, rx:number, ry:number, startAngle:number, endAngle:number}}
 */
function svgArcToCenter(x1, y1, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x2, y2) {
  // Handle degenerate case: start and end are the same point
  if (Math.abs(x1 - x2) < 1e-10 && Math.abs(y1 - y2) < 1e-10) {
    return { cx: x1, cy: y1, rx: Math.abs(rx), ry: Math.abs(ry), startAngle: 0, endAngle: 0 };
  }

  // Use absolute values for radii
  let rxAbs = Math.abs(rx);
  let ryAbs = Math.abs(ry);

  // If either radius is zero, treat as line (degenerate arc)
  if (rxAbs < 1e-10 || ryAbs < 1e-10) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    return { cx: midX, cy: midY, rx: rxAbs, ry: ryAbs, startAngle: 0, endAngle: 0 };
  }

  const cosAngle = Math.cos(xAxisRotation);
  const sinAngle = Math.sin(xAxisRotation);

  // Step 1: Compute (x1′, y1′)
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosAngle * dx + sinAngle * dy;
  const y1p = -sinAngle * dx + cosAngle * dy;

  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  let rxSq = rxAbs * rxAbs;
  let rySq = ryAbs * ryAbs;

  // Step 2: Check if radii are large enough; scale up if needed
  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rxAbs *= sqrtLambda;
    ryAbs *= sqrtLambda;
    rxSq = rxAbs * rxAbs;
    rySq = ryAbs * ryAbs;
  }

  // Step 3: Compute (cx′, cy′)
  const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
  const den = rxSq * y1pSq + rySq * x1pSq;
  const sq = den > 1e-20 ? Math.sqrt(num / den) : 0;
  const sign = largeArcFlag === sweepFlag ? -1 : 1;

  const cxp = sign * sq * (rxAbs * y1p) / ryAbs;
  const cyp = -sign * sq * (ryAbs * x1p) / rxAbs;

  // Step 4: Compute (cx, cy) in original coordinate system
  const cx = cosAngle * cxp - sinAngle * cyp + (x1 + x2) / 2;
  const cy = sinAngle * cxp + cosAngle * cyp + (y1 + y2) / 2;

  // Step 5: Compute startAngle and endAngle
  const ux = (x1p - cxp) / rxAbs;
  const uy = (y1p - cyp) / ryAbs;
  const vx = (-x1p - cxp) / rxAbs;
  const vy = (-y1p - cyp) / ryAbs;

  const startAngle = Math.atan2(uy, ux);
  const endAngle = Math.atan2(vy, vx);

  return { cx, cy, rx: rxAbs, ry: ryAbs, startAngle, endAngle };
}

/**
 * Parse SVG path string back to segment array.
 *
 * This is a specialized parser for contours that were previously converted TO SVG paths.
 * It handles the output of segmentsToPathString() and reconstructs segment objects.
 *
 * Note: Full SVG path parsing is complex (with all relative commands, etc.).
 * This implementation handles common patterns from offset processing:
 * - M (move), L (line), A (arc), C (bezier), Z (close)
 * - Absolute coordinates (uppercase commands)
 *
 * For full SVG parsing with relative coordinates, use ExportModule.dxfExporter.parseSVGPathSegments().
 * This lightweight version is suitable for round-trip segmentsToPathString() → pathStringToSegments().
 *
 * @param {string} pathString - SVG path data (e.g., "M 0 0 L 10 0 A 5 5 0 0 1 10 10 Z")
 * @returns {Array<Object>} Parsed segments in standard format
 *   - Empty array if input is invalid or parsing fails
 *   - For complex paths with relative commands, recommend using ExportModule parser instead
 *
 * @example
 * const segments = pathStringToSegments("M 0 0 L 10 0 L 10 10 Z");
 * // Returns: [{type: "line", start: {x: 0, y: 0}, end: {x: 10, y: 0}}, ...]
 */
export function pathStringToSegments(pathString) {
  if (!pathString || typeof pathString !== "string" || pathString.trim() === "") {
    log.warn("pathStringToSegments: invalid path string");
    return [];
  }

  try {
    const segments = [];
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;

    // Simple SVG command parser for absolute coordinates
    // Regex: Extract command letter + following numbers
    const commandRegex = /([MLACZmlacz])([^MLACZmlacz]*)/g;
    const commandMatches = [];
    let cmdMatch = commandRegex.exec(pathString);
    while (cmdMatch !== null) {
      commandMatches.push(cmdMatch);
      cmdMatch = commandRegex.exec(pathString);
    }

    commandMatches.forEach((match) => {
      const rawCmd = match[1];
      const rel = rawCmd === rawCmd.toLowerCase();
      const cmd = rawCmd.toUpperCase();
      const paramsStr = match[2].trim();

      // Parse numbers from params string
      // Handle different number formats: integers, decimals, scientific notation
      const numberRegex = /-?\d+\.?\d*([eE][+-]?\d+)?/g;
      const params = [];
      let numMatch = numberRegex.exec(paramsStr);
      while (numMatch !== null) {
        params.push(parseFloat(numMatch[0]));
        numMatch = numberRegex.exec(paramsStr);
      }

      if (params.length === 0 && cmd !== "Z") {
        log.warn(
          `[pathStringToSegments] Command ${cmd} has no parameters: ${paramsStr}`
        );
        return; // skip this command
      }

      switch (cmd) {
        case "M": // Move
          if (params.length >= 2) {
            currentX = rel ? currentX + params[0] : params[0];
            currentY = rel ? currentY + params[1] : params[1];
            startX = currentX;
            startY = currentY;
          }
          // Ignore implicit line-to for additional params
          break;

        case "L": // Line
          if (params.length >= 2) {
            const endX = rel ? currentX + params[0] : params[0];
            const endY = rel ? currentY + params[1] : params[1];
            segments.push({
              type: "line",
              start: { x: currentX, y: currentY },
              end: { x: endX, y: endY },
            });
            currentX = endX;
            currentY = endY;
          }
          break;

        case "A": // Arc: rx ry x-axis-rotation large-arc-flag sweep-flag x y
          if (params.length >= 7) {
            const rx = params[0];
            const ry = params[1];
            const rotation = params[2];
            const largeArc = params[3] !== 0 ? 1 : 0;
            const sweep = params[4] !== 0 ? 1 : 0;
            const endX = rel ? currentX + params[5] : params[5];
            const endY = rel ? currentY + params[6] : params[6];

            // Reconstruct arc center, startAngle, endAngle from SVG endpoint parameterization
            // Algorithm: W3C SVG spec Appendix F.6 (Endpoint to Center conversion)
            const arcCenter = svgArcToCenter(
              currentX, currentY, rx, ry, rotation, largeArc, sweep, endX, endY
            );

            segments.push({
              type: "arc",
              start: { x: currentX, y: currentY },
              end: { x: endX, y: endY },
              arc: {
                center: { x: arcCenter.cx, y: arcCenter.cy },
                radius: (arcCenter.rx + arcCenter.ry) / 2,
                rx: arcCenter.rx,
                ry: arcCenter.ry,
                xAxisRotation: rotation,
                largeArcFlag: largeArc,
                sweepFlag: sweep,
                startAngle: arcCenter.startAngle,
                endAngle: arcCenter.endAngle,
              },
            });
            currentX = endX;
            currentY = endY;
          }
          break;

        case "C": { // Cubic Bezier: x1 y1 x2 y2 x y
          if (params.length >= 6) {
            const cp1x = rel ? currentX + params[0] : params[0];
            const cp1y = rel ? currentY + params[1] : params[1];
            const cp2x = rel ? currentX + params[2] : params[2];
            const cp2y = rel ? currentY + params[3] : params[3];
            const endX = rel ? currentX + params[4] : params[4];
            const endY = rel ? currentY + params[5] : params[5];

            // Approximate cubic bezier as line segments for downstream consumers
            // that only support line/arc (OffsetTool, parsePathToSegments, etc.)
            const steps = computeBezierSteps(currentX, currentY, cp1x, cp1y, cp2x, cp2y, endX, endY);
            let prevX = currentX;
            let prevY = currentY;
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const px = cubicBezierPoint(currentX, cp1x, cp2x, endX, t);
              const py = cubicBezierPoint(currentY, cp1y, cp2y, endY, t);

              segments.push({
                type: "line",
                start: { x: prevX, y: prevY },
                end: { x: px, y: py },
              });

              prevX = px;
              prevY = py;
            }

            currentX = endX;
            currentY = endY;
          }
          break;
        }

        case "Z": // Close path
          if (currentX !== startX || currentY !== startY) {
            segments.push({
              type: "line",
              start: { x: currentX, y: currentY },
              end: { x: startX, y: startY },
            });
            currentX = startX;
            currentY = startY;
          }
          break;

        default:
          log.warn(`[pathStringToSegments] Unsupported command: ${cmd}`);
      }
    });

    log.debug(`Parsed ${segments.length} segments from path string`);
    return segments;
  } catch (error) {
    log.error("pathStringToSegments failed:", error);
    return [];
  }
}

export default {
  trimSelfIntersections,
  trimSelfIntersectionsDetailed,
  segmentsToPathString,
  pathStringToSegments,
};
