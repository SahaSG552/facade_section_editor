function roundPoint(point, precision = 6) {
    const factor = 10 ** precision;
    return {
        x: Math.round(point.x * factor) / factor,
        y: Math.round(point.y * factor) / factor,
    };
}

export function sanitizeSegments(segments, deps) {
    const { distance, EPSILON } = deps;

    return segments.filter((segment) => {
        if (!segment.start || !segment.end) return false;
        if (segment.degenerate) return false;
        if (distance(segment.start, segment.end) < EPSILON) return false;
        if (segment.type === "arc" && segment.arc) {
            const radius = segment.arc.radius || segment.arc.rx || 0;
            if (radius <= EPSILON) return false;
        }
        return true;
    });
}

export function stitchSegments(segments, deps, tolerance = deps.defaultTolerance) {
    const { cloneSegment, distance, clonePoint } = deps;

    if (!segments || segments.length === 0) return segments;

    const stitched = [cloneSegment(segments[0])];
    for (let index = 1; index < segments.length; index++) {
        const previous = stitched[stitched.length - 1];
        const current = cloneSegment(segments[index]);

        if (distance(previous.end, current.start) <= tolerance) {
            current.start = clonePoint(previous.end);
            if (current.type === "arc" && current.arc) {
                current.arc.startAngle = Math.atan2(
                    current.start.y - current.arc.centerY,
                    current.start.x - current.arc.centerX,
                );
            }
        }

        stitched.push(current);
    }

    return stitched;
}

export function quantizeSegments(segments, precision = 6) {
    return segments.map((segment) => {
        const quantized = {
            ...segment,
            start: roundPoint(segment.start, precision),
            end: roundPoint(segment.end, precision),
        };

        if (segment.cp1) quantized.cp1 = roundPoint(segment.cp1, precision);
        if (segment.cp2) quantized.cp2 = roundPoint(segment.cp2, precision);
        if (segment.arc) quantized.arc = { ...segment.arc };

        return quantized;
    });
}

function gapSealPass(segments, closed, maxMiterLen, offset, deps) {
    const { applyMiterJoin, isNear, joinTolerance } = deps;
    const sealed = [];

    for (let index = 0; index < segments.length; index++) {
        sealed.push(segments[index]);
        if (index < segments.length - 1) {
            const current = segments[index];
            const next = segments[index + 1];
            if (!isNear(current.end, next.start, joinTolerance)) {
                const gap = applyMiterJoin(current, next, maxMiterLen, offset);
                if (gap) sealed.push(...gap);
            }
        }
    }

    if (closed && sealed.length >= 2) {
        const last = sealed[sealed.length - 1];
        const first = sealed[0];
        if (!isNear(last.end, first.start, joinTolerance)) {
            const gap = applyMiterJoin(last, first, maxMiterLen, offset);
            if (gap) sealed.push(...gap);
        }
    }

    return sealed;
}

export function joinOffsetSegments(offsetSegments, options, offset, closed, deps) {
    const maxMiter = Math.abs(offset) * (options?.limit ?? 10);
    const joined = resolveOffsetSegmentJoints(offsetSegments, options, offset, closed, deps);
    return finalizeOffsetTopology(joined, options, offset, closed, maxMiter, deps);
}

export function resolveOffsetSegmentJoints(offsetSegments, options, offset, closed, deps) {
    const { cloneSegment, applyMiterJoin } = deps;
    const segments = offsetSegments.map(cloneSegment);
    const count = segments.length;
    if (count === 0) return [];

    const maxMiter = Math.abs(offset) * (options?.limit ?? 10);
    const result = [];
    const pairCount = closed ? count : count - 1;

    for (let index = 0; index < pairCount; index++) {
        const current = segments[index];
        const next = segments[(index + 1) % count];
        const bridge = applyMiterJoin(current, next, maxMiter, offset);
        result.push(current);
        if (bridge) {
            result.push(...bridge);
        }
    }

    if (!closed && count > 0) {
        result.push(segments[count - 1]);
    }

    return result;
}

function traceSegments(label, segments) {
    console.log(label);
    segments.forEach((segment, index) => console.log(`  [${index}] ${segment.type} degen=${segment.degenerate} bridge=${segment.isBridge} (${segment.start?.x?.toFixed(3)},${segment.start?.y?.toFixed(3)})→(${segment.end?.x?.toFixed(3)},${segment.end?.y?.toFixed(3)})`));
}


export function finalizeOffsetTopology(joinedSegments, options, offset, closed, maxMiter, deps) {
    const { log } = deps;
    const debugTrace = options?.debugTrace === true;

    if (debugTrace) {
        traceSegments("--- After first pass ---", joinedSegments);
    }

    const clean = sanitizeSegments(joinedSegments, deps);

    if (debugTrace) {
        traceSegments("--- After sanitize ---", clean);
    }

    const sealed = gapSealPass(clean, closed, maxMiter, offset, deps);

    if (debugTrace) {
        traceSegments("--- After gapSealPass ---", sealed);
    }

    const maxIterations = 3;
    let iteration = 0;
    let working = sealed;

    while (iteration < maxIterations) {
        const reSanitized = sanitizeSegments(working, deps);
        if (reSanitized.length === working.length) break;

        working = gapSealPass(reSanitized, closed, maxMiter, offset, deps);
        iteration += 1;

        if (iteration === maxIterations) {
            log.warn(`Max degenerate iterations (${maxIterations}) reached - potential cascaded degeneracy in geometry`);
        }
    }

    return working;
}

export function reverseSegments(segments, deps) {
    const { clonePoint, computeAngleDelta } = deps;
    const reversed = [];

    for (let index = segments.length - 1; index >= 0; index--) {
        const segment = segments[index];
        if (segment.type === "line") {
            reversed.push({
                type: "line",
                start: clonePoint(segment.end),
                end: clonePoint(segment.start),
            });
        } else if (segment.type === "bezier") {
            reversed.push({
                type: "bezier",
                start: clonePoint(segment.end),
                cp1: clonePoint(segment.cp2),
                cp2: clonePoint(segment.cp1),
                end: clonePoint(segment.start),
            });
        } else if (segment.type === "arc") {
            const arc = { ...segment.arc };
            const sweep = arc.sweepFlag ?? 1;
            arc.sweepFlag = sweep === 1 ? 0 : 1;
            const startAngle = arc.startAngle;
            arc.startAngle = arc.endAngle;
            arc.endAngle = startAngle;
            const delta = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag);
            arc.largeArcFlag = Math.abs(delta) > Math.PI ? 1 : 0;

            reversed.push({
                type: "arc",
                start: clonePoint(segment.end),
                end: clonePoint(segment.start),
                arc,
            });
        }
    }

    return reversed;
}

export function normalizeArcAngles(segment) {
    if (segment.type !== "arc" || !segment.arc) {
        return segment;
    }

    const arc = { ...segment.arc };
    const start = arc.startAngle;
    const end = arc.endAngle;

    if (start !== undefined && end !== undefined) {
        const threshold = Math.PI * 2 + 0.001;
        if (Math.abs(start) > threshold || Math.abs(end) > threshold) {
            const degToRad = Math.PI / 180;
            arc.startAngle = start * degToRad;
            arc.endAngle = end * degToRad;
        }
    }

    return { ...segment, arc };
}