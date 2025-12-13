/**
 * Offset Calculator - calculates parallel curves (offsets) for polylines
 * Based on the algorithm described in: https://seant23.wordpress.com/wp-content/uploads/2010/11/anoffsetalgorithm.pdf
 */

export class OffsetCalculator {
    constructor() {
        this.EPSILON = 1e-6; // Small value for floating point comparisons
    }

    /**
     * Calculate offset curve for a polygon
     * @param {Array} points - Array of {x, y} points
     * @param {number} offset - Offset distance (positive = outward, negative = inward)
     * @returns {Array} Array of offset points
     */
    calculateOffset(points, offset) {
        if (!points || points.length < 3) {
            return points;
        }

        // Ensure the polygon is closed
        const closedPoints = this.ensureClosed(points);

        // Calculate offset for each edge
        const offsetSegments = [];

        for (let i = 0; i < closedPoints.length - 1; i++) {
            const p1 = closedPoints[i];
            const p2 = closedPoints[i + 1];

            const offsetSegment = this.calculateEdgeOffset(p1, p2, offset);
            if (offsetSegment) {
                offsetSegments.push(offsetSegment);
            }
        }

        // Find intersection points between adjacent offset segments
        const resultPoints = [];

        for (let i = 0; i < offsetSegments.length; i++) {
            const currentSegment = offsetSegments[i];
            const nextSegment = offsetSegments[(i + 1) % offsetSegments.length];

            const intersection = this.findIntersection(
                currentSegment,
                nextSegment
            );

            if (intersection) {
                resultPoints.push(intersection);
            } else {
                // If no intersection, use the midpoint of the offset segments
                const midPoint = {
                    x: (currentSegment.end.x + nextSegment.start.x) / 2,
                    y: (currentSegment.end.y + nextSegment.start.y) / 2,
                };
                resultPoints.push(midPoint);
            }
        }

        // Remove duplicate points and ensure counter-clockwise orientation
        const cleanedPoints = this.removeDuplicatePoints(resultPoints);

        return this.ensureCounterClockwise(cleanedPoints);
    }

    /**
     * Ensure polygon is closed (last point equals first point)
     */
    ensureClosed(points) {
        if (points.length === 0) return points;

        const first = points[0];
        const last = points[points.length - 1];

        if (
            Math.abs(first.x - last.x) > this.EPSILON ||
            Math.abs(first.y - last.y) > this.EPSILON
        ) {
            return [...points, { x: first.x, y: first.y }];
        }

        return points;
    }

    /**
     * Calculate offset segment for a single edge
     */
    calculateEdgeOffset(p1, p2, offset) {
        // Vector from p1 to p2
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        // Length of the edge
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < this.EPSILON) {
            return null; // Degenerate edge
        }

        // Unit vector perpendicular to the edge (rotated 90 degrees)
        const perpX = -dy / length;
        const perpY = dx / length;

        // Offset the edge
        const offsetP1 = {
            x: p1.x + perpX * offset,
            y: p1.y + perpY * offset,
        };

        const offsetP2 = {
            x: p2.x + perpX * offset,
            y: p2.y + perpY * offset,
        };

        return {
            start: offsetP1,
            end: offsetP2,
        };
    }

    /**
     * Find intersection point between two line segments
     */
    findIntersection(segment1, segment2) {
        const p1 = segment1.start;
        const p2 = segment1.end;
        const p3 = segment2.start;
        const p4 = segment2.end;

        const denom =
            (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);

        if (Math.abs(denom) < this.EPSILON) {
            return null; // Lines are parallel
        }

        const t =
            ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) /
            denom;
        const u =
            -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) /
            denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y),
            };
        }

        return null; // No intersection within segment bounds
    }

    /**
     * Remove duplicate points from array
     */
    removeDuplicatePoints(points) {
        const result = [];
        const tolerance = this.EPSILON;

        for (const point of points) {
            let isDuplicate = false;

            for (const existing of result) {
                if (
                    Math.abs(point.x - existing.x) < tolerance &&
                    Math.abs(point.y - existing.y) < tolerance
                ) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                result.push(point);
            }
        }

        return result;
    }

    /**
     * Ensure polygon is oriented counter-clockwise
     */
    ensureCounterClockwise(points) {
        if (points.length < 3) return points;

        // Calculate signed area
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y - points[j].x * points[i].y;
        }

        // If area is negative, polygon is clockwise, so reverse
        if (area < 0) {
            points.reverse();
        }

        return points;
    }

    /**
     * Convert SVG rectangle to polygon points
     */
    rectToPoints(rect) {
        const x = parseFloat(rect.getAttribute("x")) || 0;
        const y = parseFloat(rect.getAttribute("y")) || 0;
        const width = parseFloat(rect.getAttribute("width")) || 0;
        const height = parseFloat(rect.getAttribute("height")) || 0;

        return [
            { x: x, y: y },
            { x: x + width, y: y },
            { x: x + width, y: y + height },
            { x: x, y: y + height },
            { x: x, y: y }, // Close the polygon
        ];
    }
}

export default OffsetCalculator;
