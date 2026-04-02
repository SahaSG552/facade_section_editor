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
import { resolveSelfIntersections } from "./PaperBooleanProcessor.js";

const log = LoggerFactory.createLogger("OffsetTrimmer");

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
      const cmd = match[1].toUpperCase();
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
            currentX = params[0];
            currentY = params[1];
            startX = currentX;
            startY = currentY;
          }
          // Ignore implicit line-to for additional params
          break;

        case "L": // Line
          if (params.length >= 2) {
            segments.push({
              type: "line",
              start: { x: currentX, y: currentY },
              end: { x: params[0], y: params[1] },
            });
            currentX = params[0];
            currentY = params[1];
          }
          break;

        case "A": // Arc: rx ry x-axis-rotation large-arc-flag sweep-flag x y
          if (params.length >= 7) {
            const rx = params[0];
            const ry = params[1];
            const rotation = params[2];
            const largeArc = params[3] !== 0 ? 1 : 0;
            const sweep = params[4] !== 0 ? 1 : 0;
            const endX = params[5];
            const endY = params[6];

            // Reconstruct arc center from SVG arc parameters
            // This is approximate - for precise reconstruction, need full SVG arc math
            // For now, store params and let consumer reconstruct if needed
            segments.push({
              type: "arc",
              start: { x: currentX, y: currentY },
              end: { x: endX, y: endY },
              arc: {
                radius: (rx + ry) / 2, // Average for now
                rx,
                ry,
                xAxisRotation: rotation,
                largeArcFlag: largeArc,
                sweepFlag: sweep,
              },
            });
            currentX = endX;
            currentY = endY;
          }
          break;

        case "C": // Cubic Bezier: x1 y1 x2 y2 x y
          if (params.length >= 6) {
            segments.push({
              type: "bezier",
              start: { x: currentX, y: currentY },
              cp1: { x: params[0], y: params[1] },
              cp2: { x: params[2], y: params[3] },
              end: { x: params[4], y: params[5] },
            });
            currentX = params[4];
            currentY = params[5];
          }
          break;

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
  segmentsToPathString,
  pathStringToSegments,
};
