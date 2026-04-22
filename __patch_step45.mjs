/**
 * Patch script: insert Step 4.5 (inverted-line gap reconnection) into OffsetContourBuilder.js
 * after the Step 4 filter block.
 *
 * OffsetContourBuilder.js uses CRLF line endings which confuse replace_string_in_file.
 * This script reads and writes the file correctly via Node.js.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, "src/operations/OffsetContourBuilder.js");

let src = readFileSync(filePath, "utf8");

// Anchor: the last line of the Step 4 filter block, right before Step 4b comment
const ANCHOR =
  "    return true;\r\n  });\r\n\r\n  // Step 4b: Enforce monotonic arc";

const STEP_4_5 = `    return true;
  });

  // Step 4.5: Reconnect flanking segments where the non-resurrection filter
  // (above) removed inverted offset-lines, leaving segment-endpoint gaps.
  // This mirrors Step 4b (arc inversion reconnection) but for LINE segments.
  // After removing an inverted line, the previous step leaves a gap between
  // the two flanking segments.  We close that gap by computing the miter
  // intersection of their current directions.
  {
    const _n45 = finalSegments.length;
    for (let _i45 = 0; _i45 < _n45; _i45++) {
      const _cur45 = finalSegments[_i45];
      const _nxtIdx45 = closed ? (_i45 + 1) % _n45 : _i45 + 1;
      if (!closed && _i45 === _n45 - 1) break;
      const _nxt45 = finalSegments[_nxtIdx45];
      const _gapDist45 = Math.hypot(
        _nxt45.start.x - _cur45.end.x,
        _nxt45.start.y - _cur45.end.y
      );
      if (_gapDist45 <= EPSILON) continue; // no gap
      const _d1_45 = getTangent(_cur45, "end");
      const _d2_45 = getTangent(_nxt45, "start");
      if (!_d1_45 || !_d2_45) continue;
      const _mitrePt45 = lineLineIntersection(_cur45.end, _d1_45, _nxt45.start, _d2_45);
      if (_mitrePt45 && Number.isFinite(_mitrePt45.x) && Number.isFinite(_mitrePt45.y)) {
        log.debug(
          "buildOffsetContour Step 4.5: reconnecting gap of " + _gapDist45.toFixed(4) +
          " via miter at (" + _mitrePt45.x.toFixed(4) + "," + _mitrePt45.y.toFixed(4) + ")"
        );
        setSegmentEndpoint(_cur45, "end", _mitrePt45);
        setSegmentEndpoint(_nxt45, "start", _mitrePt45);
      }
    }
  }

  // Step 4b: Enforce monotonic arc`;

if (!src.includes(ANCHOR)) {
  console.error(
    "ERROR: anchor string not found — file may have changed. Aborting.",
  );
  process.exit(1);
}

const patched = src.replace(ANCHOR, STEP_4_5.replace(/\n/g, "\r\n"));
if (patched === src) {
  console.error(
    "ERROR: replacement produced no change. Check anchor and replacement.",
  );
  process.exit(1);
}

writeFileSync(filePath, patched, "utf8");
console.log("Step 4.5 patch applied successfully.");
