/**
 * OLD EXTRUSION METHODS - DEPRECATED
 *
 * This file contains deprecated round extrusion methods that used full profile with lathe corners.
 * These methods are preserved for reference but are no longer used in the main codebase.
 *
 * Current implementation uses half-profile extrusion (formerly round-half, now just "round").
 *
 * @deprecated All methods in this file are deprecated and should not be used in new code
 */

import * as THREE from "three";

/**
 * OLD: Create round extrusion (lathe-filled corners) with FULL PROFILE
 * @deprecated Use _extrudeRound (formerly _extrudeRoundHalf) instead
 * @private
 */
export function _extrudeRound_OLD(
    profile,
    pathOrString,
    color,
    side = "top",
    options = {},
    context,
) {
    try {
        let path;

        // Check if pathOrString is a string (SVG path data)
        if (typeof pathOrString === "string") {
            // Parse SVG path to curves
            const pathCurves = context.parsePathToCurves(pathOrString);
            if (pathCurves.length === 0) {
                context.log.warn("No curves parsed from SVG path");
                return [];
            }

            // Create 3D curve from 2D curves using coordinate transformation
            const {
                partFrontX = 0,
                partFrontY = 0,
                partFrontWidth = 100,
                partFrontHeight = 100,
                depth = 0,
                panelThickness = 19,
                panelAnchor = { x: 0, y: 0 },
            } = options;

            path = context.createCurveFromCurves(
                pathCurves,
                partFrontX,
                partFrontY,
                partFrontWidth,
                partFrontHeight,
                depth,
                panelThickness,
                panelAnchor,
            );
        } else {
            // pathOrString is already a CurvePath
            path = pathOrString;
        }

        // Calculate adaptive curve segments
        const curveSegments = context.calculateAdaptiveCurveSegments(profile);
        const profileGeometry = new THREE.ShapeGeometry(profile, curveSegments);

        // Extract points from geometry for lathe synchronization
        const posAttr = profileGeometry.attributes.position;
        const profilePoints = [];
        for (let i = 0; i < posAttr.count; i++) {
            profilePoints.push(
                new THREE.Vector2(posAttr.getX(i), posAttr.getY(i)),
            );
        }

        // Get path segments
        if (!path.curves || path.curves.length === 0) {
            context.log.warn("Round extrusion: No curves in path");
            return [];
        }

        // Group curves using shared logic
        const curveGroups = context.groupCurves(path.curves);

        // Check if path is closed
        let isClosedPath = false;
        let contourIsClockwise = false;

        if (path.curves.length > 0) {
            const firstCurve = path.curves[0];
            const lastCurve = path.curves[path.curves.length - 1];
            const firstPoint = firstCurve.getPoint(0);
            const lastPoint = lastCurve.getPoint(1);
            const closureGap = firstPoint.distanceTo(lastPoint);
            isClosedPath = closureGap < 0.01;

            // Determine winding direction
            if (isClosedPath) {
                let signedArea = 0;
                for (const curve of path.curves) {
                    const p0 = curve.getPoint(0);
                    const p1 = curve.getPoint(1);
                    signedArea += (p1.x - p0.x) * (p1.y + p0.y);
                }
                contourIsClockwise = signedArea > 0;
            }
        }

        // Create meshes for each group
        const allMeshes = [];
        const junctionPoints = [];

        for (
            let groupIndex = 0;
            groupIndex < curveGroups.length;
            groupIndex++
        ) {
            const group = curveGroups[groupIndex];
            const contourPoints = [];

            for (const curve of group.curves) {
                const samples = 1;
                const points = curve.getPoints(samples);
                if (contourPoints.length === 0) {
                    contourPoints.push(...points);
                } else {
                    contourPoints.push(points[points.length - 1]);
                }
            }

            // Add junction after each group (except last), and between last and first if closed
            if (groupIndex < curveGroups.length - 1) {
                junctionPoints.push({
                    point: contourPoints[contourPoints.length - 1].clone(),
                    groupIndex: groupIndex,
                });
            } else if (isClosedPath && curveGroups.length > 1) {
                junctionPoints.push({
                    point: contourPoints[contourPoints.length - 1].clone(),
                    groupIndex: groupIndex,
                    closesContour: true,
                });
            }

            // Check if this group forms a closed path
            const firstPoint = contourPoints[0];
            const lastPoint = contourPoints[contourPoints.length - 1];
            const groupClosed = firstPoint.distanceTo(lastPoint) < 0.01;

            // Create geometry for this group
            const flags = context._getGeometryTransformFlags(side, false);
            const geometry = context.createProfiledContourGeometry(
                profile,
                contourPoints,
                groupClosed,
                false,
                curveSegments,
                flags.invertExtrusionCaps,
                side,
            );

            if (!geometry) {
                context.log.warn(
                    `Failed to create geometry for group ${groupIndex}`,
                );
                continue;
            }

            geometry.computeVertexNormals();
            geometry.normalizeNormals();

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color || "#cccccc"),
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.FrontSide,
                wireframe: context.materialManager
                    ? context.materialManager.isWireframeEnabled()
                    : false,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.isBitPart = true;
            mesh.userData.groupIndex = groupIndex;
            mesh.userData.groupType = group.type;

            allMeshes.push(mesh);
        }

        // Partial lathe at every junction
        if (junctionPoints.length > 0) {
            // Calculate extension profile height from profilePoints (for BOTTOM positioning)
            let extensionHeight = 0;
            if (options.zOffset && options.zOffset !== 0) {
                // For extensions, calculate height from profile points
                const yCoords = profilePoints.map((p) => p.y);
                const minY = Math.min(...yCoords);
                const maxY = Math.max(...yCoords);
                extensionHeight = Math.abs(maxY - minY);
            }

            for (let i = 0; i < junctionPoints.length; i++) {
                const junction = junctionPoints[i];
                const groupIndex = junction.groupIndex;
                let currentGroup, nextGroup;

                if (junction.closesContour) {
                    currentGroup = curveGroups[curveGroups.length - 1];
                    nextGroup = curveGroups[0];
                } else {
                    currentGroup = curveGroups[groupIndex];
                    nextGroup = curveGroups[groupIndex + 1];
                }

                if (!currentGroup || !nextGroup) continue;

                const lastCurve =
                    currentGroup.curves[currentGroup.curves.length - 1];
                const firstCurve = nextGroup.curves[0];

                const t1 = 0.9;
                const t2 = 0.1;
                const prevPoint = lastCurve.getPoint(t1);
                const nextPoint = firstCurve.getPoint(t2);
                const prevDir = new THREE.Vector3()
                    .subVectors(junction.point, prevPoint)
                    .normalize();
                const nextDir = new THREE.Vector3()
                    .subVectors(nextPoint, junction.point)
                    .normalize();

                const latheResult = context.createPartialLatheAtJunction(
                    profile,
                    junction.point,
                    prevDir,
                    nextDir,
                    color,
                    i,
                    true,
                    profilePoints,
                    contourIsClockwise,
                    side,
                    options.zOffset && options.zOffset !== 0,
                    extensionHeight,
                );

                if (latheResult && latheResult.mesh) {
                    const latheMesh = latheResult.mesh;
                    latheMesh.userData.isBitPart = true;
                    latheMesh.userData.isLatheCorner = true;
                    latheMesh.userData.isPartialLathe = true;
                    latheMesh.userData.junctionAfterGroup = junction.groupIndex;
                    allMeshes.push(latheMesh);
                }
            }
        }

        return allMeshes;
    } catch (error) {
        context.log.error("Error in _extrudeRound_OLD:", error.message);
        return [];
    }
}

/**
 * OLD: Create lathe geometry with end caps all in one geometry (watertight)
 * @deprecated Used only by old _extrudeRound_OLD that creates full profile with caps
 * @param {Array<THREE.Vector2>} profilePoints - Profile points (radius, height)
 * @param {number} segments - Number of angular segments
 * @param {number} phiStart - Start angle in radians
 * @param {number} phiLength - Angular extent in radians
 * @param {boolean} includeCaps - Whether to add end caps for partial lathes
 * @param {boolean} invertNormals - Whether to invert triangle winding
 * @param {string} side - Panel side: 'top' or 'bottom'
 * @param {boolean} invertCaps - Whether to invert caps separately
 * @returns {THREE.BufferGeometry} Complete lathe geometry with caps
 */
export function createLatheWithEndCaps_OLD(
    profilePoints,
    segments,
    phiStart,
    phiLength,
    includeCaps = true,
    invertNormals = false,
    side = "top",
    invertCaps = false,
) {
    try {
        const vertices = [];
        const indices = [];
        const profileCount = profilePoints.length;

        // Step 1: Create shared axis vertices (one per axis point, shared across all segments)
        const axisVertexIndices = {}; // Maps profile index -> vertex index
        for (let j = 0; j < profileCount; j++) {
            if (Math.abs(profilePoints[j].x) < 0.0001) {
                const vIdx = vertices.length / 3;
                axisVertexIndices[j] = vIdx;
                vertices.push(0, profilePoints[j].y, 0);
            }
        }

        // Step 2: Create non-axis vertices for each segment
        const segmentVertexBase = vertices.length / 3;
        const axisCount = Object.keys(axisVertexIndices).length;
        const nonAxisCount = profileCount - axisCount;

        for (let i = 0; i <= segments; i++) {
            const phi = phiStart + (i / segments) * phiLength;
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);

            for (let j = 0; j < profileCount; j++) {
                if (axisVertexIndices[j] !== undefined) continue; // Skip axis points

                const p = profilePoints[j];
                const x = p.x * sinPhi;
                const y = p.y;
                const z = p.x * cosPhi;
                vertices.push(x, y, z);
            }
        }

        // Step 3: Helper to get vertex index for (segment, profile point)
        const getVertexIndex = (segmentIdx, profileIdx) => {
            if (axisVertexIndices[profileIdx] !== undefined) {
                return axisVertexIndices[profileIdx];
            }
            // Count non-axis profile points before this one
            let nonAxisIdx = 0;
            for (let j = 0; j < profileIdx; j++) {
                if (axisVertexIndices[j] === undefined) nonAxisIdx++;
            }
            return segmentVertexBase + segmentIdx * nonAxisCount + nonAxisIdx;
        };

        // Step 4: Create quads connecting consecutive angular rings
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < profileCount - 1; j++) {
                const a = getVertexIndex(i, j);
                const b = getVertexIndex(i + 1, j);
                const c = getVertexIndex(i, j + 1);
                const d = getVertexIndex(i + 1, j + 1);

                // Two triangles per quad
                if (invertNormals) {
                    indices.push(a, c, b);
                    indices.push(b, c, d);
                } else {
                    indices.push(a, b, c);
                    indices.push(b, d, c);
                }
            }
        }

        // Step 5: Add end caps if partial lathe
        if (includeCaps && phiLength < 2 * Math.PI - 0.01) {
            addEarcutCapsToLathe_OLD(
                indices,
                profilePoints,
                segments,
                getVertexIndex,
                invertNormals,
                invertCaps,
            );
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(vertices), 3),
        );
        geometry.setIndex(indices);

        // Rotate to match lathe orientation (Z becomes height axis)
        geometry.rotateX(Math.PI / 2);

        // Compute normals for proper lighting
        geometry.computeVertexNormals();
        geometry.normalizeNormals();

        return geometry;
    } catch (error) {
        console.error("Error creating lathe with end caps:", error.message);
        return null;
    }
}

/**
 * OLD: Add properly triangulated caps using Earcut
 * @deprecated Used only by old createLatheWithEndCaps_OLD
 * @param {Array<number>} indices - Index array to append to
 * @param {Array<THREE.Vector2>} profilePoints - Profile points
 * @param {number} segments - Total number of angular segments
 * @param {Function} getVertexIndex - Function to get vertex index
 * @param {boolean} invertNormals - Whether to invert main geometry normals
 * @param {boolean} invertCaps - Whether to invert caps independently
 */
export function addEarcutCapsToLathe_OLD(
    indices,
    profilePoints,
    segments,
    getVertexIndex,
    invertNormals = false,
    invertCaps = false,
) {
    // Note: Earcut must be available globally
    if (typeof Earcut === "undefined") {
        console.warn("Earcut library not available for lathe caps");
        return;
    }

    const profileCount = profilePoints.length;

    // Prepare 2D coordinates for Earcut
    const flatCoords = [];
    for (let j = 0; j < profileCount; j++) {
        flatCoords.push(profilePoints[j].x, profilePoints[j].y);
    }

    // Triangulate the profile shape
    const triangles = Earcut(flatCoords, null, 2);

    // Add start cap triangles - base Earcut winding needs inversion
    for (let i = 0; i < triangles.length; i += 3) {
        const a = getVertexIndex(0, triangles[i]);
        const b = getVertexIndex(0, triangles[i + 1]);
        const c = getVertexIndex(0, triangles[i + 2]);
        indices.push(a, b, c);
    }

    // Add end cap triangles - opposite winding from start
    for (let i = 0; i < triangles.length; i += 3) {
        const a = getVertexIndex(segments, triangles[i]);
        const b = getVertexIndex(segments, triangles[i + 1]);
        const c = getVertexIndex(segments, triangles[i + 2]);
        indices.push(a, c, b);
    }
}
