// Vector helper functions (2D)
function vecSub(a, b) {
    return [a[0] - b[0], a[1] - b[1]];
}
function vecAdd(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}
function vecScale(v, s) {
    return [v[0] * s, v[1] * s];
}
function vecDot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
}
function vecCross(a, b) {
    return a[0] * b[1] - a[1] * b[0];
} // 2D scalar
function vecMag(v) {
    return Math.sqrt(vecDot(v, v));
}
function vecNorm(v) {
    const mag = vecMag(v);
    return mag > 1e-6 ? vecScale(v, 1 / mag) : [0, 0];
}
function vecPerp(v) {
    return [-v[1], v[0]];
} // Perpendicular (left normal)

// Douglas-Peucker simplification
function simplifyPolyline(points, epsilon = 1) {
    if (points.length < 3) return points.slice();

    function simplify(start, end) {
        // Find the point with the maximum distance from line between start and end
        let maxDist = 0;
        let maxIdx = start;
        const lineVec = vecSub(points[end], points[start]);
        const lineMag = vecMag(lineVec);
        if (lineMag < 1e-6) return []; // Degenerate

        for (let i = start + 1; i < end; i++) {
            const pointVec = vecSub(points[i], points[start]);
            const proj = vecDot(pointVec, lineVec) / lineMag;
            const perpVec = vecSub(pointVec, vecScale(lineVec, proj / lineMag));
            const dist = vecMag(perpVec);
            if (dist > maxDist) {
                maxDist = dist;
                maxIdx = i;
            }
        }

        if (maxDist > epsilon) {
            // Recurse on subsegments
            const left = simplify(start, maxIdx);
            const right = simplify(maxIdx, end);
            return [...left.slice(0, -1), ...right]; // Avoid duplicating maxIdx
        } else {
            // Keep only endpoints
            return [points[start], points[end]];
        }
    }

    const simplified = simplify(0, points.length - 1);
    return simplified;
}

// Biarc class based on Ryan Juckett's algorithm
class Biarc {
    constructor(p1, t1, p2, t2) {
        this.p1 = p1.slice();
        this.t1 = vecNorm(t1);
        this.p2 = p2.slice();
        this.t2 = vecNorm(t2);
        this.pm = [0, 0]; // Midpoint
        this.c1 = [0, 0]; // Center 1
        this.r1 = 0;
        this.theta1 = 0;
        this.c2 = [0, 0];
        this.r2 = 0;
        this.theta2 = 0;
        this.compute();
    }

    compute() {
        const v = vecSub(this.p2, this.p1);
        const vMag2 = vecDot(v, v);
        if (vMag2 < 1e-6) return; // Points coincide

        const a = 1 - vecDot(this.t1, this.t2);
        const b = vecDot(v, vecAdd(this.t1, this.t2));
        const c = -0.5 * vMag2;

        let d = 0;
        if (Math.abs(a) < 1e-6) {
            // Parallel tangents
            const vDotT2 = vecDot(v, this.t2);
            if (Math.abs(vDotT2) < 1e-6) {
                // Perpendicular case, use two semicircles
                const mid = vecAdd(this.p1, vecScale(v, 0.5));
                const perp = vecNorm(vecPerp(v));
                const offset = vecScale(
                    perp,
                    (vecMag(v) / 4) * (vecCross(this.t1, v) > 0 ? 1 : -1)
                );
                this.c1 = vecAdd(mid, offset);
                this.c2 = vecAdd(mid, vecScale(offset, -1));
                this.r1 = this.r2 = vecMag(v) / 2;
                this.theta1 = this.theta2 = Math.PI;
                this.pm = vecAdd(
                    this.p1,
                    vecScale(vecSub(this.c2, this.c1), 0.5)
                );
                return;
            }
            d = vMag2 / (2 * vDotT2); // Infinite solutions, choose one
        } else {
            const disc = b * b - 4 * a * c;
            if (disc < 0) return; // No real solution
            d = (-b + Math.sqrt(disc)) / (2 * a); // Positive root for shorter arc
        }

        // Compute pm
        this.pm = vecScale(
            vecAdd(
                vecAdd(this.p1, vecScale(this.t1, d)),
                vecAdd(this.p2, vecScale(this.t2, -d))
            ),
            0.5
        );

        // Compute arc1
        this.computeArc(
            this.c1,
            (this.r1 = 0),
            (this.theta1 = 0),
            this.p1,
            this.t1,
            this.pm,
            d > 0
        ); // Reset to avoid reference issues

        // Compute arc2
        const t2AtPm = vecScale(this.t2, -1);
        this.computeArc(
            this.c2,
            (this.r2 = 0),
            (this.theta2 = 0),
            this.p2,
            t2AtPm,
            this.pm,
            d < 0
        );
    }

    computeArc(c, r, theta, p, t, pm, isShort) {
        r = 0; // Reset
        theta = 0;
        const pmToP = vecSub(pm, p);
        const n = vecPerp(t); // Perp to t
        const denom = 2 * vecDot(n, pmToP);
        if (Math.abs(denom) < 1e-6) {
            // Straight line
            c[0] = p[0] + pmToP[0] * 0.5;
            c[1] = p[1] + pmToP[1] * 0.5;
            r = 0;
            theta = 0;
            return;
        }

        const s = vecDot(pmToP, pmToP) / denom;
        c[0] = p[0] + n[0] * s;
        c[1] = p[1] + n[1] * s;
        r = Math.abs(s);

        if (r < 1e-6) {
            theta = 0;
            return;
        }

        // Compute angle
        const op = vecNorm(vecSub(p, c));
        const om = vecNorm(vecSub(pm, c));
        const cosTheta = vecDot(op, om);
        let angle = Math.acos(Math.max(-1, Math.min(1, cosTheta))); // Clamp
        const sinTheta = vecCross(op, om);

        if (isShort) {
            if (sinTheta <= 0) angle = -angle;
        } else {
            if (sinTheta > 0) angle = -2 * Math.PI + angle;
            else angle = 2 * Math.PI - angle;
        }

        if (vecDot(n, pmToP) < 0) angle = -angle;

        theta = angle;
    }
}

// Distance from point to biarc (min dist to arc1 or arc2)
function distanceToBiarc(point, biarc) {
    const dist1 = distanceToArc(
        point,
        biarc.p1,
        biarc.pm,
        biarc.c1,
        biarc.r1,
        biarc.theta1
    );
    const dist2 = distanceToArc(
        point,
        biarc.pm,
        biarc.p2,
        biarc.c2,
        biarc.r2,
        biarc.theta2
    );
    return Math.min(dist1, dist2);
}

function distanceToArc(point, start, end, center, r, theta) {
    if (r === 0) {
        // Distance to line segment start to end
        const v = vecSub(end, start);
        const w = vecSub(point, start);
        const c1 = vecDot(w, v);
        if (c1 <= 0) return vecMag(w);
        const c2 = vecDot(v, v);
        if (c2 <= c1) return vecMag(vecSub(point, end));
        const b = c1 / c2;
        const pb = vecAdd(start, vecScale(v, b));
        return vecMag(vecSub(point, pb));
    }

    // Distance to circular arc
    const toCenter = vecSub(point, center);
    const distToCenter = vecMag(toCenter);
    if (distToCenter === 0) return Math.abs(r);

    // Project to circle
    const projected = vecAdd(center, vecScale(toCenter, r / distToCenter));

    // Get angle from start
    const startVec = vecNorm(vecSub(start, center));
    const projVec = vecNorm(vecSub(projected, center));
    const projAngle = signedAngle(startVec, projVec);

    if (Math.abs(projAngle) <= Math.abs(theta) / 2) {
        // Simplified check, adjust if needed
        return Math.abs(distToCenter - r);
    }

    // Outside arc, min to endpoints
    return Math.min(vecMag(vecSub(point, start)), vecMag(vecSub(point, end)));
}

function signedAngle(from, to) {
    const dot = vecDot(from, to);
    const cross = vecCross(from, to);
    return Math.atan2(cross, dot);
}

// Recursive approximation
function approximatePolyline(points, epsilon = 1) {
    if (points.length < 2) return [];

    function approx(start, end) {
        if (end - start < 2) return [];

        // Compute tangents
        let t1 =
            start === 0
                ? vecSub(points[1], points[0])
                : vecSub(points[start + 1], points[start - 1]);
        let t2 =
            end === points.length - 1
                ? vecSub(points[end], points[end - 1])
                : vecSub(points[end + 1], points[end - 1]);

        const biarc = new Biarc(points[start], t1, points[end], t2);
        if (!biarc.r1 && !biarc.r2) return []; // Invalid

        // Find max error and split index
        let maxErr = 0;
        let splitIdx = start;
        for (let i = start + 1; i < end; i++) {
            const err = distanceToBiarc(points[i], biarc);
            if (err > maxErr) {
                maxErr = err;
                splitIdx = i;
            }
        }

        if (maxErr <= epsilon) {
            return [biarc];
        } else {
            return [...approx(start, splitIdx), ...approx(splitIdx, end)];
        }
    }

    return approx(0, points.length - 1);
}

// Generate SVG path data from biarcs
function generatePathFromBiarcs(biarcs) {
    if (biarcs.length === 0) return "";

    let pathStr = `M ${biarcs[0].p1[0]} ${biarcs[0].p1[1]}`;

    biarcs.forEach((biarc) => {
        // Arc 1
        if (biarc.r1 === 0) {
            pathStr += ` L ${biarc.pm[0]} ${biarc.pm[1]}`;
        } else {
            const largeArc = Math.abs(biarc.theta1) > Math.PI ? 1 : 0;
            const sweep = biarc.theta1 > 0 ? 1 : 0;
            pathStr += ` A ${biarc.r1} ${biarc.r1} 0 ${largeArc} ${sweep} ${biarc.pm[0]} ${biarc.pm[1]}`;
        }
        // Arc 2
        if (biarc.r2 === 0) {
            pathStr += ` L ${biarc.p2[0]} ${biarc.p2[1]}`;
        } else {
            const largeArc = Math.abs(biarc.theta2) > Math.PI ? 1 : 0;
            const sweep = biarc.theta2 > 0 ? 1 : 0;
            pathStr += ` A ${biarc.r2} ${biarc.r2} 0 ${largeArc} ${sweep} ${biarc.p2[0]} ${biarc.p2[1]}`;
        }
    });

    return pathStr;
}

// Main function: Input SVG polyline element, output path d string
function polylineToArcs(polylineElement, epsilon = 1) {
    const pointsStr = polylineElement.getAttribute("points");
    const points = pointsStr
        .trim()
        .split(/\s+/)
        .reduce((acc, val, i) => {
            if (i % 2 === 0) acc.push([parseFloat(val), 0]);
            else acc[acc.length - 1][1] = parseFloat(val);
            return acc;
        }, []);

    // Добавлен Douglas-Peucker для упрощения перед аппроксимацией
    const simplifiedPoints = simplifyPolyline(points, epsilon);

    const biarcs = approximatePolyline(simplifiedPoints, epsilon);
    return generatePathFromBiarcs(biarcs);
}

// Example usage:
// const polyline = document.querySelector('polyline');
// const pathD = polylineToArcs(polyline, 0.5); // epsilon = 0.5
// const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
// newPath.setAttribute('d', pathD);
// svg.appendChild(newPath);
