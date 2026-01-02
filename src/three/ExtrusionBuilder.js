import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import {
    mergeGeometries,
    mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import Earcut from "earcut";
import { Brush, Evaluator, ADDITION, SUBTRACTION } from "three-bvh-csg";
import {
    MeshBVH,
    acceleratedRaycast,
    computeBoundsTree,
    disposeBoundsTree,
} from "three-mesh-bvh";
import LoggerFactory from "../core/LoggerFactory.js";

// Add three-mesh-bvh extensions to BufferGeometry
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

// Two tested normal variants
const NORMAL_VARIANTS = {
    variant1: (angle) =>
        new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0),
    variant3: (angle) =>
        new THREE.Vector3(Math.sin(angle), -Math.cos(angle), 0),
};

// Auto: even segment -> variant3, odd segment -> variant1 (per user testing)
let currentNormalVariant = "auto";

const computeNormalFromVariant = (
    angle,
    isAtEnd,
    cornerNumber,
    segmentIndex
) => {
    let variant = currentNormalVariant;
    if (variant === "auto") {
        variant = segmentIndex % 2 === 0 ? "variant3" : "variant1";
    }

    const fn = NORMAL_VARIANTS[variant] || NORMAL_VARIANTS.variant1;
    return fn(angle).normalize();
};

// Aligns coincident edges across meshes to avoid tiny gaps before merge
class MeshEdgeMatcher {
    constructor(tolerance = 0.001) {
        this.tolerance = tolerance;
    }

    matchEdges(sourceMesh, targetMesh) {
        sourceMesh.updateMatrixWorld(true);
        targetMesh.updateMatrixWorld(true);

        const sourceVertices = this.getWorldVertices(sourceMesh);
        const targetVertices = this.getWorldVertices(targetMesh);

        const sourceBoundary = this.getBoundaryVertexIndices(
            sourceMesh.geometry
        );
        const targetBoundary = this.getBoundaryVertexIndices(
            targetMesh.geometry
        );

        // Quick reject by bounding boxes
        const sourceBox = new THREE.Box3().setFromArray(
            sourceVertices.flatMap((v) => [v.x, v.y, v.z])
        );
        const targetBox = new THREE.Box3().setFromArray(
            targetVertices.flatMap((v) => [v.x, v.y, v.z])
        );
        if (
            !sourceBox.expandByScalar(this.tolerance).intersectsBox(targetBox)
        ) {
            return 0;
        }

        let matches = this.findMatchingPairs(
            sourceVertices,
            targetVertices,
            this.tolerance,
            sourceBoundary,
            targetBoundary
        );

        // Optional coarse pass if nothing snapped
        if (matches.length === 0) {
            const coarseTol = this.tolerance * 2;
            matches = this.findMatchingPairs(
                sourceVertices,
                targetVertices,
                coarseTol,
                sourceBoundary,
                targetBoundary
            );
        }
        if (matches.length === 0) {
            return 0;
        }

        this.applyVertexCorrections(sourceMesh, matches, true);
        this.applyVertexCorrections(targetMesh, matches, false);

        return matches.length;
    }

    matchMultipleMeshes(meshes) {
        const results = [];

        for (let i = 0; i < meshes.length; i++) {
            for (let j = i + 1; j < meshes.length; j++) {
                const matchedVertices = this.matchEdges(meshes[i], meshes[j]);
                if (matchedVertices > 0) {
                    results.push({ source: i, target: j, matchedVertices });
                }
            }
        }

        return results;
    }

    getWorldVertices(mesh) {
        const worldVertices = [];
        const position = mesh.geometry.attributes.position;

        for (let i = 0; i < position.count; i++) {
            const vertex = new THREE.Vector3(
                position.getX(i),
                position.getY(i),
                position.getZ(i)
            );
            vertex.applyMatrix4(mesh.matrixWorld);
            worldVertices.push(vertex);
        }

        return worldVertices;
    }

    findMatchingPairs(
        sourceVertices,
        targetVertices,
        tol,
        boundarySource,
        boundaryTarget
    ) {
        const matches = [];

        // Spatial hash for faster lookup
        const index = this.buildSpatialIndex(targetVertices, tol);

        for (let i = 0; i < sourceVertices.length; i++) {
            if (boundarySource && !boundarySource.has(i)) continue;
            const sourceVertex = sourceVertices[i];

            const neighbors = this.querySpatialIndex(index, sourceVertex);
            let best = null;
            let bestDist = tol;

            for (const neighbor of neighbors) {
                if (boundaryTarget && !boundaryTarget.has(neighbor.index))
                    continue;
                const d = sourceVertex.distanceTo(neighbor.pos);
                if (d < bestDist) {
                    bestDist = d;
                    best = neighbor;
                }
            }

            if (best) {
                const averaged = new THREE.Vector3()
                    .addVectors(sourceVertex, best.pos)
                    .multiplyScalar(0.5);

                matches.push({
                    sourceIndex: i,
                    targetIndex: best.index,
                    averagedPos: averaged,
                });
            }
        }

        return matches;
    }

    getBoundaryVertexIndices(geometry) {
        try {
            const geom = geometry.index ? geometry : geometry.toNonIndexed();
            const index = geom.index.array;
            const edgeCount = new Map();
            const addEdge = (a, b) => {
                const key = a < b ? `${a}_${b}` : `${b}_${a}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            };
            for (let i = 0; i < index.length; i += 3) {
                const a = index[i];
                const b = index[i + 1];
                const c = index[i + 2];
                addEdge(a, b);
                addEdge(b, c);
                addEdge(c, a);
            }
            const boundary = new Set();
            edgeCount.forEach((count, key) => {
                if (count === 1) {
                    const [a, b] = key.split("_").map((v) => parseInt(v, 10));
                    boundary.add(a);
                    boundary.add(b);
                }
            });
            return boundary.size ? boundary : null;
        } catch (e) {
            return null;
        }
    }

    buildSpatialIndex(vertices, tol) {
        const grid = new Map();
        const inv = 1 / tol;
        const keyOf = (v) =>
            `${Math.floor(v.x * inv)}|${Math.floor(v.y * inv)}|${Math.floor(
                v.z * inv
            )}`;

        vertices.forEach((v, idx) => {
            const key = keyOf(v);
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push({ pos: v, index: idx });
        });

        return { grid, tol };
    }

    querySpatialIndex(index, point) {
        const { grid, tol } = index;
        const inv = 1 / tol;
        const cx = Math.floor(point.x * inv);
        const cy = Math.floor(point.y * inv);
        const cz = Math.floor(point.z * inv);

        const results = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const key = `${cx + dx}|${cy + dy}|${cz + dz}`;
                    const bucket = grid.get(key);
                    if (bucket) results.push(...bucket);
                }
            }
        }
        return results;
    }

    applyVertexCorrections(mesh, matches, useSourceIndex) {
        const geometry = mesh.geometry;
        const position = geometry.attributes.position;
        const inverseMatrix = new THREE.Matrix4()
            .copy(mesh.matrixWorld)
            .invert();

        for (const correction of matches) {
            const vertexIndex = useSourceIndex
                ? correction.sourceIndex
                : correction.targetIndex;

            if (vertexIndex === undefined || vertexIndex < 0) continue;

            const localPos = correction.averagedPos
                .clone()
                .applyMatrix4(inverseMatrix);

            position.setXYZ(vertexIndex, localPos.x, localPos.y, localPos.z);
        }

        position.needsUpdate = true;
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        geometry.normalizeNormals();
    }
}

// Expose control to window
if (typeof window !== "undefined") {
    window.clippingControl = {
        variants: () => [...Object.keys(NORMAL_VARIANTS), "auto"],
        setVariant: (variantName) => {
            if (variantName === "auto" || NORMAL_VARIANTS[variantName]) {
                currentNormalVariant = variantName;
                console.log(`✓ Switching to ${variantName}`);
                return true;
            }
            console.log(
                `✗ Unknown variant: ${variantName}. Available: ${[
                    ...Object.keys(NORMAL_VARIANTS),
                    "auto",
                ].join(", ")}`
            );
            return false;
        },
        getCurrentVariant: () => currentNormalVariant,
        listVariants: () => {
            console.log("Available clipping plane normal variants:");
            [...Object.keys(NORMAL_VARIANTS), "auto"].forEach((v) => {
                console.log(
                    `  - ${v}${v === currentNormalVariant ? " (ACTIVE)" : ""}`
                );
            });
        },
    };
    console.log(
        'Use window.clippingControl.setVariant("variant1"|"variant3"|"auto") to switch. Call window.clippingControl.listVariants() to see all.'
    );
}

/**
 * ExtrusionBuilder
 * Handles all extrusion-related geometry creation:
 * - SVG path parsing to Three.js curves
 * - Bit profile creation from SVG or fallback shapes
 * - Profiled contour geometry with mitered corners
 * - Path visualization for debugging
 */
export default class ExtrusionBuilder {
    constructor() {
        this.log = LoggerFactory.createLogger("ExtrusionBuilder");
        this.materialManager = null;
        this.csgEngine = null;
        this.edgeMatcher = new MeshEdgeMatcher(0.001);
        this.log.info("Created");
    }

    /**
     * Initialize with dependencies
     * @param {object} config - Configuration object
     * @param {MaterialManager} config.materialManager - Material manager for wireframe state
     * @param {CSGEngine} config.csgEngine - CSG engine for boolean operations
     */
    initialize(config) {
        this.materialManager = config.materialManager;
        this.csgEngine = config.csgEngine;
        this.log.info("Initialized");
    }

    /**
     * Parse SVG path data into Three.js curves
     * @param {string} pathData - SVG path data string
     * @returns {Array<THREE.Curve>} Array of Three.js curves
     */
    parsePathToCurves(pathData) {
        const curves = [];
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);

        let currentX = 0;
        let currentY = 0;
        let startX = 0;
        let startY = 0;

        commands?.forEach((cmd) => {
            const type = cmd[0].toUpperCase();
            const params = cmd
                .slice(1)
                .trim()
                .split(/[\s,]+/)
                .map(Number)
                .filter((n) => !isNaN(n));

            switch (type) {
                case "M": // Move to
                    if (params.length >= 2) {
                        currentX = params[0];
                        currentY = params[1];
                        startX = currentX;
                        startY = currentY;
                    }
                    break;
                case "L": // Line to
                    if (params.length >= 2) {
                        const x = params[0];
                        const y = params[1];
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(x, y, 0)
                            )
                        );
                        currentX = x;
                        currentY = y;
                    }
                    break;
                case "H": // Horizontal line
                    if (params.length >= 1) {
                        const x = params[0];
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(x, currentY, 0)
                            )
                        );
                        currentX = x;
                    }
                    break;
                case "V": // Vertical line
                    if (params.length >= 1) {
                        const y = params[0];
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(currentX, y, 0)
                            )
                        );
                        currentY = y;
                    }
                    break;
                case "C": // Cubic Bézier curve
                    if (params.length >= 6) {
                        const cp1x = params[0];
                        const cp1y = params[1];
                        const cp2x = params[2];
                        const cp2y = params[3];
                        const x = params[4];
                        const y = params[5];
                        curves.push(
                            new THREE.CubicBezierCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(cp1x, cp1y, 0),
                                new THREE.Vector3(cp2x, cp2y, 0),
                                new THREE.Vector3(x, y, 0)
                            )
                        );
                        currentX = x;
                        currentY = y;
                    }
                    break;
                case "Q": // Quadratic Bézier curve
                    if (params.length >= 4) {
                        const cpx = params[0];
                        const cpy = params[1];
                        const x = params[2];
                        const y = params[3];
                        curves.push(
                            new THREE.QuadraticBezierCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(cpx, cpy, 0),
                                new THREE.Vector3(x, y, 0)
                            )
                        );
                        currentX = x;
                        currentY = y;
                    }
                    break;
                case "A": // Arc (approximated as line for simplicity)
                    if (params.length >= 7) {
                        const x = params[5];
                        const y = params[6];
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(x, y, 0)
                            )
                        );
                        currentX = x;
                        currentY = y;
                    }
                    break;
                case "Z": // Close path
                    if (curves.length > 0) {
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(startX, startY, 0)
                            )
                        );
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
            }
        });

        return curves;
    }

    /**
     * Create 3D curve from 2D path curves
     * Curves are in 2D canvas coordinates (from SVG offsetContour)
     * partFront defines the position and size of the front view in canvas space
     * Panel in 3D is positioned at (0, 0, 0) with front face at z=thickness/2
     */
    createCurveFromCurves(
        pathCurves,
        partFrontX,
        partFrontY,
        partFrontWidth,
        partFrontHeight,
        depth,
        panelThickness,
        panelAnchor
    ) {
        this.log.debug("Creating curve from curves:", {
            curvesCount: pathCurves.length,
            firstCurve: pathCurves[0],
            depth,
            panelThickness,
            panelAnchor,
        });

        // Create 3D versions of curves
        const curves3D = pathCurves
            .map((curve) => {
                if (curve instanceof THREE.LineCurve3) {
                    const v1 = this.convertPoint2DTo3D(
                        curve.v1.x,
                        curve.v1.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    const v2 = this.convertPoint2DTo3D(
                        curve.v2.x,
                        curve.v2.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    return new THREE.LineCurve3(v1, v2);
                } else if (curve instanceof THREE.CubicBezierCurve3) {
                    const v0 = this.convertPoint2DTo3D(
                        curve.v0.x,
                        curve.v0.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    const v1 = this.convertPoint2DTo3D(
                        curve.v1.x,
                        curve.v1.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    const v2 = this.convertPoint2DTo3D(
                        curve.v2.x,
                        curve.v2.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    const v3 = this.convertPoint2DTo3D(
                        curve.v3.x,
                        curve.v3.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    return new THREE.CubicBezierCurve3(v0, v1, v2, v3);
                } else if (curve instanceof THREE.QuadraticBezierCurve3) {
                    const v0 = this.convertPoint2DTo3D(
                        curve.v0.x,
                        curve.v0.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    const v1 = this.convertPoint2DTo3D(
                        curve.v1.x,
                        curve.v1.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    const v2 = this.convertPoint2DTo3D(
                        curve.v2.x,
                        curve.v2.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    return new THREE.QuadraticBezierCurve3(v0, v1, v2);
                }
                // For unsupported curves, approximate with line
                return null;
            })
            .filter((c) => c !== null);

        this.log.debug("Sample 3D curves:", {
            first: curves3D[0],
            middle: curves3D[Math.floor(curves3D.length / 2)],
            last: curves3D[curves3D.length - 1],
        });

        // Create exact path using the curves
        const path = new THREE.CurvePath();
        curves3D.forEach((curve) => {
            path.add(curve);
        });

        return path;
    }

    /**
     * Convert 2D point to 3D coordinates
     * For CSG operations, extrudes need to pass completely through the panel
     */
    convertPoint2DTo3D(
        x2d,
        y2d,
        partFrontX,
        partFrontY,
        partFrontWidth,
        partFrontHeight,
        depth,
        panelThickness,
        panelAnchor
    ) {
        // Panel in 3D space:
        // - X=0 is horizontal center
        // - Y=0 is bottom of panel
        // - Z depends on anchor

        // Convert X: subtract partFront left edge, then center
        const x3d = x2d - partFrontX - partFrontWidth / 2;

        // Convert Y: path Y is in canvas space where Y increases downward
        // partFrontY is the top of the front view rectangle
        // In 3D, Y=0 is bottom and increases upward
        // Adjust based on panel anchor
        const partFrontBottom = partFrontY + partFrontHeight;
        let y3d = partFrontBottom - y2d;

        // For bottom-left anchor, invert Y (material bottom becomes Y=0)
        if (panelAnchor === "bottom-left") {
            y3d = y2d - partFrontY;
        }

        // Z: depth into material from the anchor surface
        let z3d;
        if (panelAnchor === "top-left") {
            // From front surface inward
            z3d = depth - panelThickness / 2;
        } else if (panelAnchor === "bottom-left") {
            // From back surface inward
            z3d = depth + panelThickness / 2;
        } else {
            // Default to front
            z3d = -depth;
        }

        return new THREE.Vector3(x3d, y3d, z3d);
    }

    /**
     * Create path visualization for debugging
     * Shows the exact path as a colored line
     */
    createPathVisualization(curve, color) {
        try {
            // Get points from the curve
            const points = curve.getPoints(200); // Get 200 points along the path

            // Create line geometry
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            // Create line material (thick colored line)
            const material = new THREE.LineBasicMaterial({
                color: new THREE.Color(color || "#ff0000"),
                linewidth: 3, // Note: linewidth > 1 may not work on all platforms
                opacity: 0.8,
                transparent: true,
            });

            // Create line object
            const line = new THREE.Line(geometry, material);

            this.log.debug(
                "Created path visualization with",
                points.length,
                "points"
            );

            return line;
        } catch (error) {
            this.log.error("Error creating path visualization:", error);
            return null;
        }
    }

    /**
     * Create bit profile shape based on bit type
     */
    async createBitProfile(bitData) {
        // If bitData has a profilePath (SVG path), use SVGLoader
        if (bitData.profilePath) {
            try {
                const svgString = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${bitData.profilePath}"/></svg>`;
                const dataUrl = "data:image/svg+xml;base64," + btoa(svgString);
                const loader = new SVGLoader();

                return new Promise((resolve, reject) => {
                    loader.load(
                        dataUrl,
                        (data) => {
                            const shapes = SVGLoader.createShapes(
                                data.paths[0]
                            );
                            if (shapes.length > 0) {
                                let shape = shapes[0];
                                // No rotation needed here, rotation is done in ProfiledContourGeometry
                                resolve(shape);
                            } else {
                                resolve(this.createFallbackShape(bitData));
                            }
                        },
                        undefined,
                        (error) => {
                            this.log.error("Error loading SVG:", error);
                            resolve(this.createFallbackShape(bitData));
                        }
                    );
                });
            } catch (error) {
                this.log.error("Error parsing SVG profile:", error);
                return this.createFallbackShape(bitData);
            }
        }

        // Fallback to circular profile
        return this.createFallbackShape(bitData);
    }

    /**
     * Create fallback circular shape
     */
    createFallbackShape(bitData) {
        const diameter = bitData.diameter || 10;
        const radius = diameter / 2;

        const shape = new THREE.Shape();
        const segments = 32;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }

        return shape;
    }

    /**
     * Extrude profile along path
     * @param {THREE.Shape} profile - The profile shape to extrude
     * @param {THREE.Curve} curve - The path curve to extrude along
     * @param {string|number} color - Color for the mesh material
     * @returns {THREE.Mesh} The extruded mesh
     */
    extrudeAlongPath(profile, curve, color) {
        try {
            // Get contour points from the curve
            // For linear segments, use minimal points (just start and end)
            let segments;
            if (curve instanceof THREE.LineCurve3) {
                segments = 1; // Only 2 points needed for a straight line
            } else {
                // For curves, use adaptive segmentation
                segments = Math.max(50, Math.floor(curve.getLength() / 5));
            }
            const contourPoints = curve.getPoints(segments);

            // Convert Vector3 to Vector2 for ProfiledContourGeometry
            let contour = contourPoints.map(
                (p) => new THREE.Vector3(p.x, p.y, p.z)
            );

            // Determine if the path is closed
            // Check if first and last points are close enough
            const firstPoint = contour[0];
            const lastPoint = contour[contour.length - 1];
            const contourClosed = firstPoint.distanceTo(lastPoint) < 0.01;

            // For closed contours, remove the duplicate last point
            if (contourClosed && contour.length > 1) {
                contour = contour.slice(0, -1);
            }

            this.log.debug("Extruding with mitered corners:", {
                profilePoints: profile.getPoints().length,
                contourPoints: contour.length,
                contourClosed,
                curveLength: curve.getLength(),
            });

            // Use ProfiledContourGeometry for mitered corners
            // openEnded = false means add end caps for open paths
            const geometry = this.createProfiledContourGeometry(
                profile,
                contour,
                contourClosed,
                false // openEnded - false means create closed ends
            );

            // Check if geometry was created successfully
            if (!geometry) {
                throw new Error("Failed to create ProfiledContourGeometry");
            }

            // Log geometry info before modifications
            this.log.debug("ProfiledContourGeometry created:", {
                vertices: geometry.attributes.position.count,
                hasNormals: !!geometry.attributes.normal,
                hasUV: !!geometry.attributes.uv,
                indexCount: geometry.index ? geometry.index.count : 0,
            });

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color || "#cccccc"),
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.FrontSide, // Only render front faces for proper shading
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            return mesh;
        } catch (error) {
            this.log.error("Error extruding along path:", error.message);
            this.log.error("Error stack:", error.stack);
            return null;
        }
    }

    /**
     * Create profiled contour geometry with mitered corners
     * Based on https://jsfiddle.net/prisoner849/bygy1xkt/
     * @param {THREE.Shape} profileShape - Profile shape
     * @param {Array<THREE.Vector3>} contour - Contour points
     * @param {boolean} contourClosed - Whether contour is closed
     * @param {boolean} openEnded - Whether to leave ends open (default: false = add caps)
     */
    createProfiledContourGeometry(
        profileShape,
        contour,
        contourClosed,
        openEnded
    ) {
        try {
            contourClosed = contourClosed !== undefined ? contourClosed : true;
            openEnded = openEnded !== undefined ? openEnded : false;
            openEnded = contourClosed === true ? false : openEnded;

            let profileGeometry = new THREE.ShapeGeometry(profileShape);
            profileGeometry.rotateX(-Math.PI * 0.5);
            let profile = profileGeometry.attributes.position;

            // Calculate total vertices needed: profile points for each contour
            // (Earcut uses existing vertices, no need for center points)
            const posCount = profile.count * contour.length;
            let profilePoints = new Float32Array(posCount * 3);

            for (let i = 0; i < contour.length; i++) {
                let v1 = new THREE.Vector2().subVectors(
                    contour[i - 1 < 0 ? contour.length - 1 : i - 1],
                    contour[i]
                );
                let v2 = new THREE.Vector2().subVectors(
                    contour[i + 1 == contour.length ? 0 : i + 1],
                    contour[i]
                );
                let angle = v2.angle() - v1.angle();
                let halfAngle = angle * 0.5;

                let hA = halfAngle;
                let tA = v2.angle() + Math.PI * 0.5;
                if (!contourClosed) {
                    if (i == 0 || i == contour.length - 1) {
                        hA = Math.PI * 0.5;
                    }
                    if (i == contour.length - 1) {
                        tA = v1.angle() - Math.PI * 0.5;
                    }
                }

                let shift = Math.tan(hA - Math.PI * 0.5);
                let shiftMatrix = new THREE.Matrix4().set(
                    1,
                    0,
                    0,
                    0,
                    -shift,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1
                );

                let tempAngle = tA;
                let rotationMatrix = new THREE.Matrix4().set(
                    Math.cos(tempAngle),
                    -Math.sin(tempAngle),
                    0,
                    0,
                    Math.sin(tempAngle),
                    Math.cos(tempAngle),
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1
                );

                let translationMatrix = new THREE.Matrix4().set(
                    1,
                    0,
                    0,
                    contour[i].x,
                    0,
                    1,
                    0,
                    contour[i].y,
                    0,
                    0,
                    1,
                    contour[i].z,
                    0,
                    0,
                    0,
                    1
                );

                let cloneProfile = profile.clone();
                cloneProfile.applyMatrix4(shiftMatrix);
                cloneProfile.applyMatrix4(rotationMatrix);
                cloneProfile.applyMatrix4(translationMatrix);

                profilePoints.set(
                    cloneProfile.array,
                    cloneProfile.count * i * 3
                );
            }

            let fullProfileGeometry = new THREE.BufferGeometry();
            fullProfileGeometry.setAttribute(
                "position",
                new THREE.BufferAttribute(profilePoints, 3)
            );
            let index = [];

            let lastCorner =
                contourClosed == false ? contour.length - 1 : contour.length;
            for (let i = 0; i < lastCorner; i++) {
                for (let j = 0; j < profile.count; j++) {
                    let currCorner = i;
                    let nextCorner = i + 1 == contour.length ? 0 : i + 1;
                    let currPoint = j;
                    let nextPoint = j + 1 == profile.count ? 0 : j + 1;

                    let a = nextPoint + profile.count * currCorner;
                    let b = currPoint + profile.count * currCorner;
                    let c = currPoint + profile.count * nextCorner;
                    let d = nextPoint + profile.count * nextCorner;

                    // Ensure consistent winding order for normals pointing outward
                    index.push(a, d, b);
                    index.push(b, d, c);
                }
            }

            // Add end caps if not openEnded
            if (!openEnded && !contourClosed) {
                // Use Earcut for proper triangulation (handles concave profiles)
                // Extract 2D profile coordinates
                const flatCoords = [];
                for (let j = 0; j < profile.count; j++) {
                    flatCoords.push(
                        profile.array[j * 3],
                        profile.array[j * 3 + 1]
                    );
                }

                // Triangulate using Earcut
                const triangles = Earcut(flatCoords, null, 2);

                // Add start cap triangles (at first contour point)
                for (let i = 0; i < triangles.length; i += 3) {
                    const a = triangles[i];
                    const b = triangles[i + 1];
                    const c = triangles[i + 2];
                    // Normal winding for start cap
                    index.push(a, b, c);
                }

                // Add end cap triangles (at last contour point)
                const lastContourOffset = (contour.length - 1) * profile.count;
                for (let i = 0; i < triangles.length; i += 3) {
                    const a = lastContourOffset + triangles[i];
                    const b = lastContourOffset + triangles[i + 1];
                    const c = lastContourOffset + triangles[i + 2];
                    // Reversed winding for end cap
                    index.push(a, c, b);
                }
            }

            fullProfileGeometry.setIndex(index);
            fullProfileGeometry.computeVertexNormals();
            fullProfileGeometry.normalizeNormals();

            return fullProfileGeometry;
        } catch (error) {
            this.log.error("Error in createProfiledContourGeometry:", error);
            // Fallback to simple box geometry
            return new THREE.BoxGeometry(1, 1, 1);
        }
    }

    /**
     * Extrude with round (revolved) corners: mitered base extrusion minus lathe bounding boxes, then union with lathes
     * Returns a single merged mesh suitable for downstream CSG operations
     * @param {THREE.Shape} profile
     * @param {THREE.CurvePath} path
     * @param {string|number} color
     * @returns {THREE.Mesh|null}
     */
    extrudeAlongPathRound(profile, path, color) {
        try {
            // Get path segments (curves) directly
            if (!path.curves || path.curves.length === 0) {
                this.log.warn("Round extrusion: No curves in path");
                return null;
            }

            const segments = path.curves.map((curve) => ({
                curve,
                startPoint: curve.getPointAt(0),
                endPoint: curve.getPointAt(1),
            }));

            const firstPoint = segments[0].startPoint;
            const lastPoint = segments[segments.length - 1].endPoint;
            const pathClosed = firstPoint.distanceTo(lastPoint) < 0.01;

            const directions = segments.map((seg) =>
                new THREE.Vector3()
                    .subVectors(seg.endPoint, seg.startPoint)
                    .normalize()
            );

            // Create array to hold all segment meshes
            const segmentMeshes = [];
            const latheMeshes = [];
            const junctionDataArray = [];

            // Create individual extrusion for each path segment
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const curve = segment.curve;

                // Determine segment detail level
                let segmentPoints;
                if (curve instanceof THREE.LineCurve3) {
                    // Straight line: only 2 points needed
                    segmentPoints = 1; // getPoints(1) returns 2 points
                } else {
                    // Arc/curve: adaptive segmentation based on length
                    const curveLength = curve.getLength();
                    segmentPoints = Math.max(8, Math.floor(curveLength / 2));
                }

                const contourPoints = curve.getPoints(segmentPoints);
                let contour = contourPoints.map(
                    (p) => new THREE.Vector3(p.x, p.y, p.z)
                );

                // Create closed extrusion WITH caps at segment ends
                const geometry = this.createProfiledContourGeometry(
                    profile,
                    contour,
                    false, // contourClosed = false
                    false // openEnded = false (WITH caps)
                );

                if (!geometry) {
                    this.log.warn(`Failed to create geometry for segment ${i}`);
                    continue;
                }

                geometry.computeVertexNormals();
                geometry.normalizeNormals();

                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(color || "#cccccc"),
                    roughness: 0.5,
                    metalness: 0.2,
                    side: THREE.FrontSide, // Single-sided for closed extrusions
                    wireframe: this.materialManager
                        ? this.materialManager.isWireframeEnabled()
                        : false,
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.userData.segmentIndex = i;
                segmentMeshes.push(mesh);
            }

            // Create lathes at junctions
            const usePartialLathes = true; // Set to false for full 360° lathes
            if (pathClosed) {
                for (let i = 0; i < segments.length; i++) {
                    const junctionPoint = segments[i].endPoint;
                    const prevDir = directions[i];
                    const nextDir = directions[(i + 1) % segments.length];
                    const data = this.createPartialLatheAtJunction(
                        profile,
                        junctionPoint,
                        prevDir,
                        nextDir,
                        color,
                        i + 1,
                        usePartialLathes
                    );
                    if (data) {
                        latheMeshes.push(data.mesh);
                        junctionDataArray.push(data);
                    }
                }
            } else {
                for (let i = 0; i < segments.length - 1; i++) {
                    const junctionPoint = segments[i].endPoint;
                    const prevDir = directions[i];
                    const nextDir = directions[i + 1];
                    const data = this.createPartialLatheAtJunction(
                        profile,
                        junctionPoint,
                        prevDir,
                        nextDir,
                        color,
                        i + 1,
                        usePartialLathes
                    );
                    if (data) {
                        latheMeshes.push(data.mesh);
                        junctionDataArray.push(data);
                    }
                }
            }

            // Return array of segment and lathe meshes only (solid geometry)
            const allMeshes = [...segmentMeshes, ...latheMeshes];

            if (allMeshes.length === 0) {
                this.log.warn("Round extrusion: No meshes created");
                return null;
            }

            // Test if meshes are watertight (closed)
            this.log.info("Testing mesh closure (watertight)...");
            segmentMeshes.forEach((mesh, i) => {
                const isClosed = this.isMeshWatertight(mesh);
                this.log.info(
                    `Segment ${i}: ${isClosed ? "CLOSED ✓" : "OPEN ✗"}`
                );
            });
            latheMeshes.forEach((mesh, i) => {
                const isClosed = this.isMeshWatertight(mesh);
                this.log.info(
                    `Lathe ${i}: ${isClosed ? "CLOSED ✓" : "OPEN ✗"}`
                );
            });

            this.log.info("Round extrusion built:", {
                segments: segmentMeshes.length,
                lathes: latheMeshes.length,
                total: allMeshes.length,
                junctionsProcessed: junctionDataArray.length,
            });

            // Group all solid meshes as separate bit parts (for CSG subtraction)
            // Mark them as part of the same bit for proper CSG operation
            allMeshes.forEach((mesh, index) => {
                mesh.userData.isBitPart = true;
                mesh.userData.bitPartIndex = index;
            });

            this.log.info(
                `Returning ${allMeshes.length} bit parts (segments + lathes)`
            );

            // Return all parts separately (NO union)
            return allMeshes;
        } catch (error) {
            this.log.error("Error in extrudeAlongPathRound:", error.message);
            return null;
        }
    }

    /**
     * Create a lathe (revolve) at a junction point
     * @param {THREE.Shape} profile - Profile to revolve
     * @param {THREE.Vector3} point - Junction point in 3D space
     * @returns {THREE.Mesh|null}
     */
    createLatheAtPoint(profile, point) {
        try {
            const lathePoints = this.createLatheHalfProfilePoints(
                profile,
                null
            );

            if (!lathePoints || lathePoints.length < 2) {
                this.log.warn("Not enough points for lathe at junction");
                return null;
            }

            // Create lathe geometry - simple revolve without caps for now
            const latheGeometry = new THREE.LatheGeometry(
                lathePoints,
                32,
                0,
                Math.PI * 2
            );

            // Rotate 90 degrees to align properly with path
            latheGeometry.rotateX(-Math.PI / 2);

            // Position at junction point
            latheGeometry.translate(point.x, point.y, point.z);

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#ffaa00"),
                roughness: 0.6,
                metalness: 0.1,
                side: THREE.FrontSide,
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mesh = new THREE.Mesh(latheGeometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.isLatheJunction = true;

            return mesh;
        } catch (error) {
            this.log.error("Error creating lathe at point:", error.message);
            return null;
        }
    }

    /**
     * Create a partial lathe (revolve) at a junction point based on angle between segments
     * Uses custom geometry generation with integrated end caps for watertight result
     * @param {THREE.Shape} profile - Profile to revolve
     * @param {THREE.Vector3} point - Junction point in 3D space
     * @param {THREE.Vector3} prevDir - Direction vector of previous segment (normalized)
     * @param {THREE.Vector3} nextDir - Direction vector of next segment (normalized)
     * @param {string|number} color - Color for the mesh
     * @param {number} cornerNumber - Corner number for logging (optional)
     * @param {boolean} isPartial - Create partial lathe (true) or full 360° lathe (false). Default: true
     * @returns {Object|null} Object with mesh and metadata
     */
    createPartialLatheAtJunction(
        profile,
        point,
        prevDir,
        nextDir,
        color,
        cornerNumber = 0,
        isPartial = true
    ) {
        try {
            const lathePoints = this.createLatheHalfProfilePoints(
                profile,
                null
            );

            if (!lathePoints || lathePoints.length < 2) {
                this.log.warn(
                    "Not enough points for partial lathe at junction"
                );
                return null;
            }

            // Calculate angle between segments
            const dotProduct = prevDir.dot(nextDir);
            const clampedDot = Math.max(-1, Math.min(1, dotProduct));
            const angle = Math.acos(clampedDot);

            // Determine rotation direction using cross product
            const cross = new THREE.Vector3().crossVectors(prevDir, nextDir);
            const turnDirection = cross.z; // Positive = CCW, Negative = CW

            // Calculate angles in XY plane
            const prevAngleXY = Math.atan2(prevDir.y, prevDir.x);
            const nextAngleXY = Math.atan2(nextDir.y, nextDir.x);

            // Calculate angular difference with proper wrapping
            let angleDiff = nextAngleXY - prevAngleXY;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Determine geometry parameters
            let phiStart, phiLength;

            if (isPartial) {
                // PARTIAL LATHE: Create sector based on interior angle
                if (turnDirection < 0) {
                    // CW turn = interior angle
                    if (cornerNumber % 2 === 1) {
                        phiStart = prevAngleXY + Math.PI;
                    } else {
                        phiStart = prevAngleXY;
                    }
                    phiLength = Math.abs(angleDiff);
                } else {
                    // CCW turn = exterior angle
                    phiStart = nextAngleXY;
                    phiLength = 2 * Math.PI - Math.abs(angleDiff);
                }

                this.log.info(
                    `Corner ${cornerNumber} (${color}) | Junction angle: ${THREE.MathUtils.radToDeg(
                        angle
                    ).toFixed(1)}° | PARTIAL | Turn: ${
                        turnDirection < 0 ? "CW" : "CCW"
                    } | phiStart: ${THREE.MathUtils.radToDeg(phiStart).toFixed(
                        1
                    )}° | phiLength: ${THREE.MathUtils.radToDeg(
                        phiLength
                    ).toFixed(1)}°`
                );
            } else {
                // FULL 360° LATHE
                phiStart = 0;
                phiLength = Math.PI * 2;

                this.log.info(
                    `Corner ${cornerNumber} (${color}) | Junction angle: ${THREE.MathUtils.radToDeg(
                        angle
                    ).toFixed(1)}° | FULL 360°`
                );
            }

            // Calculate segments based on the angle
            const segments = Math.max(
                8,
                Math.ceil(32 * (Math.abs(phiLength) / (Math.PI * 2)))
            );

            // Create complete lathe geometry with integrated end caps
            const finalGeometry = this.createLatheWithEndCaps(
                lathePoints,
                segments,
                phiStart,
                phiLength,
                isPartial
            );

            if (!finalGeometry) {
                this.log.error("Failed to create lathe geometry with end caps");
                return null;
            }

            // Position at junction point
            finalGeometry.translate(point.x, point.y, point.z);

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color || "#ffaa00"),
                roughness: 0.6,
                metalness: 0.1,
                side: THREE.FrontSide,
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mesh = new THREE.Mesh(finalGeometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.isPartialLathe = true;
            mesh.userData.angle = angle;
            mesh.userData.cornerNumber = cornerNumber;

            // Return mesh + angle metadata
            return {
                mesh,
                phiStart,
                phiLength,
                junctionPoint: point.clone(),
                angle,
                cornerNumber,
            };
        } catch (error) {
            this.log.error("Error creating partial lathe:", error.message);
            return null;
        }
    }

    /**
     * Create lathe geometry with end caps all in one geometry (watertight)
     * Vertices and triangles are generated with matching coordinates for perfect vertex sharing
     * @param {Array<THREE.Vector2>} profilePoints - Profile points (radius, height)
     * @param {number} segments - Number of angular segments
     * @param {number} phiStart - Start angle in radians
     * @param {number} phiLength - Angular extent in radians
     * @param {boolean} includeCaps - Whether to add end caps for partial lathes
     * @returns {THREE.BufferGeometry} Complete lathe geometry with caps
     */
    createLatheWithEndCaps(
        profilePoints,
        segments,
        phiStart,
        phiLength,
        includeCaps = true
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
                return (
                    segmentVertexBase + segmentIdx * nonAxisCount + nonAxisIdx
                );
            };

            // Step 4: Create quads connecting consecutive angular rings
            for (let i = 0; i < segments; i++) {
                for (let j = 0; j < profileCount - 1; j++) {
                    const a = getVertexIndex(i, j);
                    const b = getVertexIndex(i + 1, j);
                    const c = getVertexIndex(i, j + 1);
                    const d = getVertexIndex(i + 1, j + 1);

                    // Two triangles per quad
                    indices.push(a, b, c);
                    indices.push(b, d, c);
                }
            }

            // Step 5: Add end caps if partial lathe
            if (includeCaps && phiLength < 2 * Math.PI - 0.01) {
                // Use Earcut for proper triangulation (handles concave profiles)
                this.addEarcutCapsToLathe(
                    indices,
                    profilePoints,
                    segments,
                    getVertexIndex
                );
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                "position",
                new THREE.BufferAttribute(new Float32Array(vertices), 3)
            );
            geometry.setIndex(indices);

            // Rotate to match lathe orientation (Z becomes height axis)
            geometry.rotateX(-Math.PI / 2);

            // Compute normals for proper lighting
            geometry.computeVertexNormals();
            geometry.normalizeNormals();

            return geometry;
        } catch (error) {
            this.log.error(
                "Error creating lathe with end caps:",
                error.message
            );
            return null;
        }
    }

    /**
     * Add properly triangulated caps using Earcut
     * Handles both convex and concave profiles correctly
     * @param {Array<number>} indices - Index array to append to
     * @param {Array<THREE.Vector2>} profilePoints - Profile points
     * @param {number} segments - Total number of angular segments
     * @param {Function} getVertexIndex - Function to get vertex index (segment, profileIdx)
     */
    addEarcutCapsToLathe(indices, profilePoints, segments, getVertexIndex) {
        const profileCount = profilePoints.length;

        // Prepare 2D coordinates for Earcut
        const flatCoords = [];
        for (let j = 0; j < profileCount; j++) {
            flatCoords.push(profilePoints[j].x, profilePoints[j].y);
        }

        // Triangulate the profile shape
        const triangles = Earcut(flatCoords, null, 2);

        // Add start cap triangles
        // Normal should point in -phi direction (backward along rotation)
        for (let i = 0; i < triangles.length; i += 3) {
            const a = getVertexIndex(0, triangles[i]);
            const b = getVertexIndex(0, triangles[i + 1]);
            const c = getVertexIndex(0, triangles[i + 2]);
            // Same winding as Earcut output
            indices.push(a, b, c);
        }

        // Add end cap triangles
        // Normal should point in +phi direction (forward along rotation)
        for (let i = 0; i < triangles.length; i += 3) {
            const a = getVertexIndex(segments, triangles[i]);
            const b = getVertexIndex(segments, triangles[i + 1]);
            const c = getVertexIndex(segments, triangles[i + 2]);
            // Reversed winding from Earcut output
            indices.push(a, c, b);
        }
    }

    /**
     * Add end caps using THREE.ShapeGeometry for proper triangulation
     * @param {Array<number>} vertices - Vertex array
     * @param {Array<number>} indices - Index array
     * @param {Array<THREE.Vector2>} profilePoints - Profile points
     * @param {number} segments - Number of segments
     * @param {number} phiStart - Start angle
     * @param {number} phiLength - Angular extent
     */
    addShapeGeometryCaps(
        vertices,
        indices,
        profilePoints,
        segments,
        phiStart,
        phiLength
    ) {
        const profileCount = profilePoints.length;
        const startBaseIdx = 0;
        const endBaseIdx = segments * profileCount;

        // Create shape from profile points
        const shape = new THREE.Shape();
        shape.moveTo(profilePoints[0].x, profilePoints[0].y);
        for (let i = 1; i < profileCount; i++) {
            shape.lineTo(profilePoints[i].x, profilePoints[i].y);
        }
        // Close the shape back to start
        shape.lineTo(profilePoints[0].x, profilePoints[0].y);

        // Generate triangulation using ShapeGeometry
        const shapeGeo = new THREE.ShapeGeometry(shape);
        const shapeIndices = shapeGeo.index.array;

        // Add triangles for start cap (using existing vertices)
        for (let i = 0; i < shapeIndices.length; i += 3) {
            const a = startBaseIdx + shapeIndices[i];
            const b = startBaseIdx + shapeIndices[i + 1];
            const c = startBaseIdx + shapeIndices[i + 2];
            indices.push(a, c, b); // Reversed winding
        }

        // Add triangles for end cap (using existing vertices)
        for (let i = 0; i < shapeIndices.length; i += 3) {
            const a = endBaseIdx + shapeIndices[i];
            const b = endBaseIdx + shapeIndices[i + 1];
            const c = endBaseIdx + shapeIndices[i + 2];
            indices.push(a, b, c); // Normal winding
        }

        shapeGeo.dispose();
    }

    /**
     * Add connections along axis between all segments
     * For each axis point, create triangles connecting it across segments
     * This closes the "seam" along the axis for partial lathes
     * @param {Array<number>} indices - Index array to append to
     * @param {Array<THREE.Vector2>} profilePoints - Profile points
     * @param {number} segments - Total number of angular segments
     */

    addAxisConnections(indices, profilePoints, segments) {
        const profileCount = profilePoints.length;

        // Find all axis points (points where radius ≈ 0)
        const axisPointIndices = [];
        for (let j = 0; j < profileCount; j++) {
            if (Math.abs(profilePoints[j].x) < 0.0001) {
                axisPointIndices.push(j);
            }
        }

        // For each axis point, connect it across all segments
        for (const axisIdx of axisPointIndices) {
            // Find the adjacent non-axis point
            let adjacentIdx = -1;
            if (axisIdx === 0) {
                // First point is on axis, next point should be off-axis
                adjacentIdx = axisIdx + 1;
            } else if (axisIdx === profileCount - 1) {
                // Last point is on axis, previous point should be off-axis
                adjacentIdx = axisIdx - 1;
            }

            if (adjacentIdx === -1) continue;

            // Create triangles from axis to adjacent point across all segments
            for (let i = 0; i < segments; i++) {
                const axisA = i * profileCount + axisIdx;
                const axisB = (i + 1) * profileCount + axisIdx;
                const adjA = i * profileCount + adjacentIdx;
                const adjB = (i + 1) * profileCount + adjacentIdx;

                // Create two triangles to close the quad
                // Winding depends on whether axis is at start or end
                if (axisIdx === 0) {
                    // Bottom axis - normal winding
                    indices.push(axisA, adjA, axisB);
                    indices.push(axisB, adjA, adjB);
                } else {
                    // Top axis - reversed winding
                    indices.push(axisA, axisB, adjA);
                    indices.push(axisB, adjB, adjA);
                }
            }
        }
    }

    /**
     * Adds triangulated end caps using Earcut library
     * Creates proper triangulated faces for the start and end of partial lathe
     * @param {Array<number>} vertices - Vertex array (already contains all lathe vertices)
     * @param {Array<number>} indices - Index array to append to
     * @param {Array<THREE.Vector2>} profilePoints - Profile points
     * @param {number} segments - Total number of angular segments
     * @param {number} phiStart - Start angle in radians
     * @param {number} phiLength - Angular extent in radians
     */
    addLatheEndCapsWithEarcut(
        vertices,
        indices,
        profilePoints,
        segments,
        phiStart,
        phiLength
    ) {
        const profileCount = profilePoints.length;

        // CAP 1: At phiStart (first segment, indices 0 to profileCount-1)
        this.addEarcutCap(
            vertices,
            indices,
            profilePoints,
            0, // baseIndex for first segment
            phiStart,
            true // isStart
        );

        // CAP 2: At phiStart + phiLength (last segment, indices segments*profileCount to (segments+1)*profileCount-1)
        this.addEarcutCap(
            vertices,
            indices,
            profilePoints,
            segments * profileCount, // baseIndex for last segment
            phiStart + phiLength,
            false // isEnd
        );
    }

    /**
     * Add a single triangulated end cap using Earcut
     * @param {Array<number>} vertices - Vertex array (contains 3D coordinates)
     * @param {Array<number>} indices - Index array to append to
     * @param {Array<THREE.Vector2>} profilePoints - Profile points in 2D
     * @param {number} baseIndex - Starting index for this segment's vertices
     * @param {number} phi - Angle for this cap
     * @param {boolean} isStart - Whether this is the start cap (affects winding)
     */
    addEarcutCap(vertices, indices, profilePoints, baseIndex, phi, isStart) {
        const profileCount = profilePoints.length;

        // Create simple triangle fan from first point (axis) to all others
        // This closes the cap by creating triangles between consecutive profile points
        for (let i = 1; i < profileCount - 1; i++) {
            const a = baseIndex; // First point (on axis)
            const b = baseIndex + i;
            const c = baseIndex + i + 1;

            // Wind triangles consistently - opposite for start vs end
            if (isStart) {
                indices.push(a, c, b); // Reversed winding for start cap
            } else {
                indices.push(a, b, c); // Normal winding for end cap
            }
        }

        // Add one more triangle to close the last edge (from first axis point to last axis point)
        // This triangle uses the first non-axis point
        const firstAxis = baseIndex; // Point 0
        const lastAxis = baseIndex + profileCount - 1; // Point 17
        const firstNonAxis = baseIndex + 1; // Point 1

        if (isStart) {
            indices.push(firstAxis, firstNonAxis, lastAxis);
        } else {
            indices.push(firstAxis, lastAxis, firstNonAxis);
        }
    }

    /**
     * Creates wedge shape for extrusion
     * @param {number} radius - Radius of the wedge
     * @param {number} phiStart - Start angle in radians
     * @param {number} phiLength - Angular extent in radians
     * @param {number} cornerNumber - Corner number (unused, kept for compatibility)
     * @returns {THREE.Shape} 2D wedge shape
     */
    createWedgeShape(radius, phiStart, phiLength, cornerNumber) {
        const shape = new THREE.Shape();

        // Start at center
        shape.moveTo(0, 0);

        // Line to start point on arc
        const startX = Math.cos(phiStart) * radius;
        const startY = Math.sin(phiStart) * radius;
        shape.lineTo(startX, startY);

        // Draw arc from phiStart to phiStart + phiLength
        // Same direction as LatheGeometry (CCW sweep)
        const segments = Math.max(
            8,
            Math.ceil(32 * (Math.abs(phiLength) / (2 * Math.PI)))
        );
        const angleStep = phiLength / segments;

        for (let i = 1; i <= segments; i++) {
            const angle = phiStart + angleStep * i;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            shape.lineTo(x, y);
        }

        // Line back to center
        shape.lineTo(0, 0);

        return shape;
    }

    /**
     * Create a wedge (angular sector) geometry for CSG subtraction
     * Uses LatheGeometry with rectangular profile + closing planes
     * @param {THREE.Vector3} center - Center point (junction/vertex)
     * @param {number} radius - Radius of the wedge
     * @param {number} height - Height (Z thickness) of the wedge
     * @param {number} phiStart - Start angle in radians (XY plane before rotation)
     * @param {number} phiLength - Angular extent in radians
     * @param {number} cornerNumber - Corner number for winding direction (1-based)
     * @returns {THREE.BufferGeometry} Wedge geometry
     */
    createWedgeGeometry(
        center,
        radius,
        height,
        phiStart,
        phiLength,
        cornerNumber
    ) {
        // Create rectangular profile for lathe (from z=-height/2 to z=+height/2)
        const rectProfile = [
            new THREE.Vector2(0, -height / 2), // Bottom center
            new THREE.Vector2(radius, -height / 2), // Bottom outer
            new THREE.Vector2(radius, height / 2), // Top outer
            new THREE.Vector2(0, height / 2), // Top center
        ];

        // Calculate segments based on angle
        const segments = Math.max(
            8,
            Math.ceil(16 * (Math.abs(phiLength) / Math.PI))
        );

        // Create lathe geometry with same phiStart and phiLength as partial lathe
        const latheGeometry = new THREE.LatheGeometry(
            rectProfile,
            segments,
            phiStart,
            phiLength
        );

        // Rotate to match lathe orientation (XY plane with Z height)
        latheGeometry.rotateX(-Math.PI / 2);

        // Now create closing planes at start and end of the sector
        // For odd corners, LatheGeometry uses adjusted phiStart (phiStart + π)
        // so closing planes need to account for this by rotating them 180° around Z
        const angleOffset = cornerNumber % 2 === 1 ? Math.PI : 0;

        const startPlane = this.createWedgeSidePlane(
            radius,
            height,
            phiStart + angleOffset
        );

        // Plane 2: at phiStart + phiLength angle
        const endPlane = this.createWedgeSidePlane(
            radius,
            height,
            phiStart + phiLength + angleOffset
        );

        // Merge all geometries
        const geometries = [latheGeometry, startPlane, endPlane];
        const mergedGeometry = mergeGeometries(geometries);

        // Recalculate normals to ensure they all point outward
        mergedGeometry.computeVertexNormals();
        mergedGeometry.normalizeNormals();
        mergedGeometry.computeBoundingBox();

        // Translate to junction point
        mergedGeometry.translate(center.x, center.y, center.z);

        return mergedGeometry;
    }

    /**
     * Create a cutting plane for corner trimming in round extrusions
     * Plane is perpendicular to X axis, rotated around Y based on corner angle
     * @param {THREE.Vector3} junctionPoint - Center of the plane at junction
     * @param {number} phiStart - Start angle of the corner (radians)
     * @param {number} phiLength - Angular extent of the corner (radians)
     * @param {number} cornerNumber - Corner number for debugging
     * @returns {THREE.BufferGeometry} Cutting plane geometry
     */
    /**
     * Create a rectangular side plane for wedge closure
     * @param {number} radius - Wedge radius
     * @param {number} height - Wedge height
     * @param {number} angle - Angle in radians for plane orientation
     * @returns {THREE.BufferGeometry}
     */
    createWedgeSidePlane(radius, height, angle) {
        // Create a vertical rectangle from center to radius
        const shape = new THREE.Shape();
        shape.moveTo(0, -height / 2);
        shape.lineTo(radius, -height / 2);
        shape.lineTo(radius, height / 2);
        shape.lineTo(0, height / 2);
        shape.lineTo(0, -height / 2);

        const geometry = new THREE.ShapeGeometry(shape);

        // Rotate 90° around X to make it vertical (YZ -> XZ plane)
        geometry.rotateX(Math.PI / 2);

        // Now rotate around Z to align with the angle
        geometry.rotateZ(angle);

        return geometry;
    }

    /**
     * Create debug visualization for wedge geometry
     * @param {THREE.Vector3} center - Center point
     * @param {number} radius - Wedge radius
     * @param {number} height - Wedge height
     * @param {number} phiStart - Start angle
     * @param {number} phiLength - Angular extent
     * @param {number} cornerNumber - Corner number for winding
     * @param {string|number} color - Debug color
     * @returns {THREE.Mesh} Debug mesh with wireframe
     */
    createWedgeDebugHelper(
        center,
        radius,
        height,
        phiStart,
        phiLength,
        cornerNumber,
        color
    ) {
        const geometry = this.createWedgeGeometry(
            center,
            radius,
            height,
            phiStart,
            phiLength,
            cornerNumber
        );
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color || "#ff00ff"),
            wireframe: true,
            transparent: true,
            opacity: 0.6,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isWedgeDebugHelper = true;
        return mesh;
    }

    /**
     * Analyze and debug boundary edges of a geometry
     * Shows which vertices form the boundary
     * @param {THREE.BufferGeometry} geometry - Geometry to analyze
     * @param {string} label - Label for logging
     */
    debugBoundaryEdges(geometry, label = "Geometry") {
        try {
            const geom = geometry.index ? geometry : geometry.toNonIndexed();
            const index = geom.index.array;
            const positions = geom.attributes.position.array;
            const edgeCount = new Map();
            const edges = [];

            const addEdge = (a, b) => {
                const key = a < b ? `${a}_${b}` : `${b}_${a}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
                if (
                    !edges.find(
                        (e) =>
                            (e.a === a && e.b === b) || (e.a === b && e.b === a)
                    )
                ) {
                    edges.push({ a, b });
                }
            };

            for (let i = 0; i < index.length; i += 3) {
                const a = index[i],
                    b = index[i + 1],
                    c = index[i + 2];
                addEdge(a, b);
                addEdge(b, c);
                addEdge(c, a);
            }

            const boundaryVertices = new Set();
            for (const [edge, count] of edgeCount) {
                if (count === 1) {
                    const [a, b] = edge.split("_").map(Number);
                    boundaryVertices.add(a);
                    boundaryVertices.add(b);
                }
            }

            this.log.info(`${label} boundary analysis:`, {
                totalVertices: positions.length / 3,
                boundaryVertices: boundaryVertices.size,
                boundaryEdges: edgeCount.size,
            });

            if (boundaryVertices.size > 0) {
                const samples = Array.from(boundaryVertices).slice(0, 3);
                this.log.info(`Sample boundary vertices:`, {
                    count: boundaryVertices.size,
                    samples: samples.map((i) => ({
                        idx: i,
                        x: positions[i * 3],
                        y: positions[i * 3 + 1],
                        z: positions[i * 3 + 2],
                    })),
                });
            }

            return {
                boundaryVertices: Array.from(boundaryVertices),
                totalEdges: edgeCount.size,
                boundaryEdgeCount: Array.from(edgeCount.values()).filter(
                    (c) => c === 1
                ).length,
            };
        } catch (e) {
            this.log.error("debugBoundaryEdges failed:", e);
            return null;
        }
    }

    /**
     * Build lathe-ready half profile points from the bit profile shape.
     * Extracts the right half (x >= 0) of the profile and sorts by Y for proper revolve.
     * Returns points as Vector2 for LatheGeometry (x = distance from axis, y = height along axis)
     * @param {THREE.Shape} profile - The bit profile shape
     * @param {number} toolRadius - Tool radius hint (unused, kept for compatibility)
     * @returns {Array<THREE.Vector2>}
     */
    createLatheHalfProfilePoints(profile, toolRadius) {
        try {
            // Get all points from the profile shape
            const fullProfile = profile.getPoints(64);

            // Find center X and bottom Y (reference point is bottom-center)
            let sumX = 0,
                minY = Infinity,
                maxY = -Infinity;
            fullProfile.forEach((p) => {
                sumX += p.x;
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            });
            const centerX = sumX / fullProfile.length;
            const baseY = minY; // Use bottom as reference, not center

            this.log.debug("Profile reference:", {
                centerX,
                baseY,
                minY,
                maxY,
                points: fullProfile.length,
            });

            // Filter points on the right side (x >= centerX) and translate to bottom-center origin
            const rightHalf = fullProfile
                .map((p) => ({
                    x: p.x - centerX,
                    y: p.y - baseY, // Shift so bottom is at y=0
                    distFromCenter: Math.sqrt(
                        (p.x - centerX) ** 2 + (p.y - baseY) ** 2
                    ),
                }))
                .filter((p) => p.x >= -0.01) // Small tolerance for center line
                .sort((a, b) => a.y - b.y); // Sort by Y (bottom to top)

            if (rightHalf.length < 2) {
                this.log.warn(
                    "Not enough points for lathe profile, using fallback circle"
                );
                const r = toolRadius || 5;
                const pts = [];
                for (let i = 0; i <= 16; i++) {
                    const a = (i / 16) * Math.PI;
                    pts.push(
                        new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)
                    );
                }
                return pts;
            }

            // Convert to Vector2 with (x = distance from axis, y = height)
            const lathePoints = rightHalf.map(
                (p) => new THREE.Vector2(Math.abs(p.x), p.y)
            );

            // Ensure profile touches the axis at start/end to avoid open lathe caps
            if (lathePoints.length >= 1) {
                if (lathePoints[0].x > 1e-4) {
                    lathePoints.unshift(new THREE.Vector2(0, lathePoints[0].y));
                }
                const last = lathePoints[lathePoints.length - 1];
                if (last.x > 1e-4) {
                    lathePoints.push(new THREE.Vector2(0, last.y));
                }
            }

            this.log.debug("Lathe profile points:", lathePoints.length);
            return lathePoints;
        } catch (e) {
            this.log.error("Error creating lathe profile:", e);
            // Fallback: simple circle
            const r = toolRadius || 5;
            const pts = [];
            for (let i = 0; i <= 16; i++) {
                const a = (i / 16) * Math.PI;
                pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
            }
            return pts;
        }
    }

    /**
     * Merge multiple extrude meshes into a single solid using CSG ADDITION
     * Combines all segment and lathe meshes into one unified geometry
     * @param {Array<THREE.Mesh>} meshes - Array of extrude meshes to merge
     * @returns {THREE.Mesh|null} Single merged mesh or null if merge fails
     */
    mergeExtrudeMeshes(meshes) {
        try {
            const meshesToMerge = (meshes || []).filter(Boolean);

            if (meshesToMerge.length === 0) {
                this.log.warn("No meshes to merge");
                return null;
            }

            if (meshesToMerge.length === 1) {
                // Only one mesh, return as-is
                this.log.debug("Only one mesh, returning directly");
                return meshesToMerge[0];
            }

            // Keep transforms in sync before matching/merging
            meshesToMerge.forEach((mesh) => mesh.updateMatrixWorld(true));

            // Nudge coincident vertices together to avoid naked edges
            const matchResults =
                this.edgeMatcher.matchMultipleMeshes(meshesToMerge);
            const matchedVerticesTotal = matchResults.reduce(
                (sum, r) => sum + r.matchedVertices,
                0
            );
            this.log.info("Edge alignment before merge:", {
                pairs: matchResults.length,
                matchedVertices: matchedVerticesTotal,
            });

            // Log detailed info about each mesh before merging
            this.log.info("Merging", meshesToMerge.length, "meshes:");
            meshesToMerge.forEach((mesh, idx) => {
                const geom = mesh.geometry;
                const bbox = new THREE.Box3().setFromObject(mesh);
                this.log.debug(`  Mesh ${idx}:`, {
                    vertices: geom.attributes.position.count,
                    isLathe: mesh.userData.isLatheJunction || false,
                    bboxSize: {
                        x: bbox.max.x - bbox.min.x,
                        y: bbox.max.y - bbox.min.y,
                        z: bbox.max.z - bbox.min.z,
                    },
                });
            });

            // Collect all geometries and ensure compatible attributes
            const geometries = meshesToMerge.map((mesh) => mesh.geometry);

            // Normalize all geometries to have consistent attributes
            // Remove UV attributes that may be incompatible
            const normalizedGeometries = geometries.map((geom, index) => {
                const normalized = geom.clone();
                normalized.applyMatrix4(meshesToMerge[index].matrixWorld);

                // Remove UV attribute if it exists (they may be incompatible across geometries)
                if (normalized.hasAttribute("uv")) {
                    normalized.deleteAttribute("uv");
                }

                // Remove UV2 attribute if it exists
                if (normalized.hasAttribute("uv2")) {
                    normalized.deleteAttribute("uv2");
                }

                return normalized;
            });

            this.log.debug(
                "Normalized",
                normalizedGeometries.length,
                "geometries for merging"
            );

            // Use BufferGeometryUtils to merge
            const mergedGeometry = mergeGeometries(normalizedGeometries);

            if (!mergedGeometry) {
                this.log.error("Failed to merge geometries");
                return null;
            }

            // Weld vertices after alignment to remove duplicate verts on shared edges
            const weldTolerance = this.edgeMatcher?.tolerance || 0.001;
            const weldedGeometry = mergeVertices(mergedGeometry, weldTolerance);
            const weldedCountDiff =
                mergedGeometry.attributes.position.count -
                weldedGeometry.attributes.position.count;
            if (weldedCountDiff > 0) {
                this.log.info("Welded vertices after merge", {
                    removed: weldedCountDiff,
                    tolerance: weldTolerance,
                });
            }

            // Ensure normals are computed correctly
            weldedGeometry.computeVertexNormals();
            weldedGeometry.normalizeNormals();

            // Create material for merged mesh
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#cccccc"),
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.FrontSide,
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mergedMesh = new THREE.Mesh(weldedGeometry, material);
            mergedMesh.castShadow = true;
            mergedMesh.receiveShadow = true;
            mergedMesh.userData.isMergedExtrude = true;

            this.log.info(
                "Successfully merged",
                meshesToMerge.length,
                "meshes",
                {
                    matchedVertices: matchedVerticesTotal,
                }
            );
            return mergedMesh;
        } catch (error) {
            this.log.error("Error merging extrude meshes:", error.message);
            return null;
        }
    }

    /**
     * Create a cutting plane geometry at a junction point
     * Plane is perpendicular to X axis and rotated around Y axis
     * @param {THREE.Vector3} junctionPoint - Junction point position
     * @param {number} phiStart - Start angle in radians (rotation around Y axis)
     * @param {number} phiLength - Angular extent in radians
     * @param {number} size - Size of the plane (default 100)
     * @returns {THREE.Mesh} Cutting plane mesh
     */
    createCuttingPlane(junctionPoint, phiStart, phiLength, size = 100) {
        try {
            // Create a plane geometry perpendicular to X axis
            const planeGeometry = new THREE.PlaneGeometry(size, size);

            // Apply same transformations as LatheGeometry:
            // 1. Rotate 90 degrees around X to align with lathe (Z becomes up axis)
            planeGeometry.rotateX(-Math.PI / 2);

            // 2. Rotate around Z by the angle (middle of phiStart to phiStart + phiLength)
            // This matches the lathe's angular position
            const rotationAngle = phiStart + phiLength / 2;
            planeGeometry.rotateZ(rotationAngle);

            // Position at junction point
            planeGeometry.translate(
                junctionPoint.x,
                junctionPoint.y,
                junctionPoint.z
            );

            // Create material for visualization (semi-transparent)
            const material = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.3,
                wireframe: false,
            });

            const planeMesh = new THREE.Mesh(planeGeometry, material);
            planeMesh.userData.isCuttingPlane = true;

            this.log.debug("Created cutting plane at junction:", {
                position: junctionPoint,
                rotation: THREE.MathUtils.radToDeg(rotationAngle),
                size,
            });

            return planeMesh;
        } catch (error) {
            this.log.error("Error creating cutting plane:", error.message);
            return null;
        }
    }

    /**
     * Clip geometry using a plane with three-mesh-bvh
     * @param {THREE.BufferGeometry} geometry - Geometry to clip
     * @param {THREE.Plane} plane - Clipping plane
     * @param {boolean} keepAbove - Keep geometry above the plane (default true)
     * @returns {THREE.BufferGeometry} Clipped geometry
     */
    clipGeometryWithPlane(geometry, plane, keepAbove = true) {
        try {
            // Build BVH for the geometry if not already built
            if (!geometry.boundsTree) {
                geometry.computeBoundsTree();
            }

            const positions = geometry.attributes.position;
            const normals = geometry.attributes.normal;
            const indices = geometry.index ? geometry.index.array : null;

            // Create arrays for new geometry
            const newPositions = [];
            const newNormals = [];
            const newIndices = [];

            // Helper function to interpolate vertex on plane
            const interpolateOnPlane = (v1, v2, d1, d2) => {
                const t = d1 / (d1 - d2);
                return new THREE.Vector3().lerpVectors(v1, v2, t);
            };

            // Helper function to interpolate normal
            const interpolateNormal = (n1, n2, t) => {
                return new THREE.Vector3().lerpVectors(n1, n2, t).normalize();
            };

            // Process each triangle
            const triangleCount = indices
                ? indices.length / 3
                : positions.count / 3;

            for (let i = 0; i < triangleCount; i++) {
                const i0 = indices ? indices[i * 3] : i * 3;
                const i1 = indices ? indices[i * 3 + 1] : i * 3 + 1;
                const i2 = indices ? indices[i * 3 + 2] : i * 3 + 2;

                const v0 = new THREE.Vector3(
                    positions.getX(i0),
                    positions.getY(i0),
                    positions.getZ(i0)
                );
                const v1 = new THREE.Vector3(
                    positions.getX(i1),
                    positions.getY(i1),
                    positions.getZ(i1)
                );
                const v2 = new THREE.Vector3(
                    positions.getX(i2),
                    positions.getY(i2),
                    positions.getZ(i2)
                );

                const n0 = normals
                    ? new THREE.Vector3(
                          normals.getX(i0),
                          normals.getY(i0),
                          normals.getZ(i0)
                      )
                    : new THREE.Vector3(0, 0, 1);
                const n1 = normals
                    ? new THREE.Vector3(
                          normals.getX(i1),
                          normals.getY(i1),
                          normals.getZ(i1)
                      )
                    : new THREE.Vector3(0, 0, 1);
                const n2 = normals
                    ? new THREE.Vector3(
                          normals.getX(i2),
                          normals.getY(i2),
                          normals.getZ(i2)
                      )
                    : new THREE.Vector3(0, 0, 1);

                // Check which side of the plane each vertex is on
                const d0 = plane.distanceToPoint(v0);
                const d1 = plane.distanceToPoint(v1);
                const d2 = plane.distanceToPoint(v2);

                const epsilon = 0.0001;
                const sign = keepAbove ? 1 : -1;
                const keep0 = d0 * sign >= -epsilon;
                const keep1 = d1 * sign >= -epsilon;
                const keep2 = d2 * sign >= -epsilon;

                const keepCount =
                    (keep0 ? 1 : 0) + (keep1 ? 1 : 0) + (keep2 ? 1 : 0);

                // Helper to add vertex
                const addVertex = (v, n) => {
                    const baseIndex = newPositions.length / 3;
                    newPositions.push(v.x, v.y, v.z);
                    newNormals.push(n.x, n.y, n.z);
                    return baseIndex;
                };

                // All vertices on the keep side
                if (keepCount === 3) {
                    const idx0 = addVertex(v0, n0);
                    const idx1 = addVertex(v1, n1);
                    const idx2 = addVertex(v2, n2);
                    newIndices.push(idx0, idx1, idx2);
                }
                // Two vertices on keep side - split into two triangles
                else if (keepCount === 2) {
                    let keptVerts = [];
                    let keptNormals = [];
                    let clippedVert, clippedNormal, clippedDist;

                    if (keep0 && keep1 && !keep2) {
                        keptVerts = [v0, v1];
                        keptNormals = [n0, n1];
                        clippedVert = v2;
                        clippedNormal = n2;
                        clippedDist = d2;

                        // Interpolate new vertices on plane
                        const t0 = d0 / (d0 - d2);
                        const t1 = d1 / (d1 - d2);
                        const newV0 = interpolateOnPlane(v0, v2, d0, d2);
                        const newV1 = interpolateOnPlane(v1, v2, d1, d2);
                        const newN0 = interpolateNormal(n0, n2, t0);
                        const newN1 = interpolateNormal(n1, n2, t1);

                        // Create two triangles
                        const idx0 = addVertex(v0, n0);
                        const idx1 = addVertex(v1, n1);
                        const idx2 = addVertex(newV0, newN0);
                        const idx3 = addVertex(newV1, newN1);

                        newIndices.push(idx0, idx1, idx2);
                        newIndices.push(idx1, idx3, idx2);
                    } else if (keep1 && keep2 && !keep0) {
                        const t1 = d1 / (d1 - d0);
                        const t2 = d2 / (d2 - d0);
                        const newV1 = interpolateOnPlane(v1, v0, d1, d0);
                        const newV2 = interpolateOnPlane(v2, v0, d2, d0);
                        const newN1 = interpolateNormal(n1, n0, t1);
                        const newN2 = interpolateNormal(n2, n0, t2);

                        const idx0 = addVertex(v1, n1);
                        const idx1 = addVertex(v2, n2);
                        const idx2 = addVertex(newV1, newN1);
                        const idx3 = addVertex(newV2, newN2);

                        newIndices.push(idx0, idx1, idx2);
                        newIndices.push(idx1, idx3, idx2);
                    } else if (keep2 && keep0 && !keep1) {
                        const t2 = d2 / (d2 - d1);
                        const t0 = d0 / (d0 - d1);
                        const newV2 = interpolateOnPlane(v2, v1, d2, d1);
                        const newV0 = interpolateOnPlane(v0, v1, d0, d1);
                        const newN2 = interpolateNormal(n2, n1, t2);
                        const newN0 = interpolateNormal(n0, n1, t0);

                        const idx0 = addVertex(v2, n2);
                        const idx1 = addVertex(v0, n0);
                        const idx2 = addVertex(newV2, newN2);
                        const idx3 = addVertex(newV0, newN0);

                        newIndices.push(idx0, idx1, idx2);
                        newIndices.push(idx1, idx3, idx2);
                    }
                }
                // One vertex on keep side - create single triangle
                else if (keepCount === 1) {
                    if (keep0 && !keep1 && !keep2) {
                        const t1 = d0 / (d0 - d1);
                        const t2 = d0 / (d0 - d2);
                        const newV1 = interpolateOnPlane(v0, v1, d0, d1);
                        const newV2 = interpolateOnPlane(v0, v2, d0, d2);
                        const newN1 = interpolateNormal(n0, n1, t1);
                        const newN2 = interpolateNormal(n0, n2, t2);

                        const idx0 = addVertex(v0, n0);
                        const idx1 = addVertex(newV1, newN1);
                        const idx2 = addVertex(newV2, newN2);

                        newIndices.push(idx0, idx1, idx2);
                    } else if (!keep0 && keep1 && !keep2) {
                        const t0 = d1 / (d1 - d0);
                        const t2 = d1 / (d1 - d2);
                        const newV0 = interpolateOnPlane(v1, v0, d1, d0);
                        const newV2 = interpolateOnPlane(v1, v2, d1, d2);
                        const newN0 = interpolateNormal(n1, n0, t0);
                        const newN2 = interpolateNormal(n1, n2, t2);

                        const idx0 = addVertex(v1, n1);
                        const idx1 = addVertex(newV0, newN0);
                        const idx2 = addVertex(newV2, newN2);

                        newIndices.push(idx0, idx1, idx2);
                    } else if (!keep0 && !keep1 && keep2) {
                        const t0 = d2 / (d2 - d0);
                        const t1 = d2 / (d2 - d1);
                        const newV0 = interpolateOnPlane(v2, v0, d2, d0);
                        const newV1 = interpolateOnPlane(v2, v1, d2, d1);
                        const newN0 = interpolateNormal(n2, n0, t0);
                        const newN1 = interpolateNormal(n2, n1, t1);

                        const idx0 = addVertex(v2, n2);
                        const idx1 = addVertex(newV0, newN0);
                        const idx2 = addVertex(newV1, newN1);

                        newIndices.push(idx0, idx1, idx2);
                    }
                }
                // keepCount === 0: discard triangle completely
            }

            // Create new geometry
            const clippedGeometry = new THREE.BufferGeometry();
            clippedGeometry.setAttribute(
                "position",
                new THREE.Float32BufferAttribute(newPositions, 3)
            );
            clippedGeometry.setAttribute(
                "normal",
                new THREE.Float32BufferAttribute(newNormals, 3)
            );
            clippedGeometry.setIndex(newIndices);

            // Dispose of BVH from original geometry
            if (geometry.boundsTree) {
                geometry.disposeBoundsTree();
            }

            this.log.debug("Clipped geometry:", {
                originalTriangles: triangleCount,
                clippedTriangles: newIndices.length / 3,
            });

            return clippedGeometry;
        } catch (error) {
            this.log.error(
                "Error clipping geometry with plane:",
                error.message
            );
            return geometry;
        }
    }

    /**
     * Clip extrusion meshes at junction points using cutting planes
     * @param {Array<THREE.Mesh>} extrusionMeshes - Array of extrusion meshes
     * @param {Array<Object>} junctionData - Array of junction data with phiStart, phiLength, junctionPoint
     * @returns {Object} Object with clippedMeshes and cuttingPlanes arrays
     */
    clipExtrusionsAtJunctions(extrusionMeshes, junctionData) {
        try {
            const clippedMeshes = [];
            const cuttingPlanes = [];

            this.log.info("Clipping extrusions at junctions:", {
                meshCount: extrusionMeshes.length,
                junctionCount: junctionData.length,
            });

            // Create cutting plane visualizations for each junction
            for (const junctionInfo of junctionData) {
                if (!junctionInfo || !junctionInfo.junctionPoint) {
                    continue;
                }

                const planeMesh = this.createCuttingPlane(
                    junctionInfo.junctionPoint,
                    junctionInfo.phiStart,
                    junctionInfo.phiLength,
                    100
                );

                if (planeMesh) {
                    cuttingPlanes.push(planeMesh);
                }
            }

            for (const mesh of extrusionMeshes) {
                // Skip lathe meshes
                if (
                    mesh.userData.isPartialLathe ||
                    mesh.userData.isLatheJunction
                ) {
                    clippedMeshes.push(mesh);
                    continue;
                }

                const segmentIndex = mesh.userData.segmentIndex;
                if (segmentIndex === undefined) {
                    this.log.warn(
                        "Mesh without segmentIndex, skipping clipping"
                    );
                    clippedMeshes.push(mesh);
                    continue;
                }

                let currentGeometry = mesh.geometry.clone();

                // Apply world matrix to geometry before clipping
                currentGeometry.applyMatrix4(mesh.matrixWorld);

                // For closed paths: each segment has 2 junctions (at start and end)
                // For open paths: first segment has 1 junction (at end), last has 1 (at start), middle have 2
                // segmentIndex corresponds to the segment number

                // Determine which junctions affect this segment
                const affectingJunctions = [];

                // Junction at the end of this segment (if exists)
                if (junctionData[segmentIndex]) {
                    affectingJunctions.push({
                        data: junctionData[segmentIndex],
                        isAtEnd: true, // This junction is at END of current segment
                    });
                }

                // Junction at the start of this segment (end of previous segment)
                const prevJunctionIndex = segmentIndex - 1;
                if (prevJunctionIndex >= 0 && junctionData[prevJunctionIndex]) {
                    affectingJunctions.push({
                        data: junctionData[prevJunctionIndex],
                        isAtEnd: false, // This junction is at START of current segment
                    });
                } else if (
                    prevJunctionIndex < 0 &&
                    junctionData[junctionData.length - 1]
                ) {
                    // For closed path, first segment connects to last junction
                    affectingJunctions.push({
                        data: junctionData[junctionData.length - 1],
                        isAtEnd: false,
                    });
                }

                // Clip against affecting junction planes only
                for (const junctionEntry of affectingJunctions) {
                    const junctionInfo = junctionEntry.data;
                    const isAtEnd = junctionEntry.isAtEnd;

                    if (!junctionInfo || !junctionInfo.junctionPoint) {
                        continue;
                    }

                    // Create clipping plane from junction data
                    // Apply same transformation as LatheGeometry: rotateX(-π/2) then rotateZ(angle)
                    const rotationAngle =
                        junctionInfo.phiStart + junctionInfo.phiLength / 2;

                    // Calculate normal using current variant (auto chooses by segment parity)
                    const normal = computeNormalFromVariant(
                        rotationAngle,
                        isAtEnd,
                        junctionInfo.cornerNumber,
                        segmentIndex
                    );

                    this.log.debug(
                        `Clipping segment ${segmentIndex} at junction ${junctionInfo.cornerNumber}:`,
                        {
                            angle: THREE.MathUtils.radToDeg(
                                rotationAngle
                            ).toFixed(1),
                            normalX: normal.x.toFixed(4),
                            normalY: normal.y.toFixed(4),
                            position: isAtEnd ? "END" : "START",
                            inverted: !isAtEnd,
                        }
                    );

                    // Create plane at junction point
                    const plane =
                        new THREE.Plane().setFromNormalAndCoplanarPoint(
                            normal,
                            junctionInfo.junctionPoint
                        );

                    // Clip the geometry - keep the side pointing away from junction
                    currentGeometry = this.clipGeometryWithPlane(
                        currentGeometry,
                        plane,
                        true
                    );
                }

                // Only add clipped geometry if it has vertices
                if (
                    currentGeometry.attributes.position &&
                    currentGeometry.attributes.position.count > 0
                ) {
                    // Create new mesh with clipped geometry
                    const clippedMesh = new THREE.Mesh(
                        currentGeometry,
                        mesh.material.clone()
                    );
                    clippedMesh.castShadow = mesh.castShadow;
                    clippedMesh.receiveShadow = mesh.receiveShadow;
                    clippedMesh.userData = { ...mesh.userData, clipped: true };

                    clippedMeshes.push(clippedMesh);
                }
            }

            this.log.info("Clipping complete:", {
                inputMeshes: extrusionMeshes.length,
                outputMeshes: clippedMeshes.length,
                cuttingPlanes: cuttingPlanes.length,
            });

            return { clippedMeshes, cuttingPlanes };
        } catch (error) {
            this.log.error(
                "Error clipping extrusions at junctions:",
                error.message
            );
            return { clippedMeshes: extrusionMeshes, cuttingPlanes: [] };
        }
    }

    /**
     * Check if a mesh is watertight (closed, no holes)
     * A mesh is watertight if every edge is shared by exactly 2 triangles
     * @param {THREE.Mesh} mesh - Mesh to check
     * @returns {boolean} True if mesh is watertight
     */
    isMeshWatertight(mesh) {
        try {
            const geometry = mesh.geometry;
            if (!geometry || !geometry.index) {
                this.log.warn("Geometry has no index buffer");
                return false;
            }

            const indices = geometry.index.array;
            const edgeMap = new Map();

            // Process each triangle
            for (let i = 0; i < indices.length; i += 3) {
                const v0 = indices[i];
                const v1 = indices[i + 1];
                const v2 = indices[i + 2];

                // Check all three edges
                this._addEdge(edgeMap, v0, v1);
                this._addEdge(edgeMap, v1, v2);
                this._addEdge(edgeMap, v2, v0);
            }

            // Check if all edges are shared by exactly 2 triangles
            let openEdges = 0;
            let totalEdges = 0;
            for (const [edge, count] of edgeMap) {
                totalEdges++;
                if (count !== 2) {
                    openEdges++;
                }
            }

            const watertight = openEdges === 0;
            if (!watertight) {
                this.log.debug(
                    `Mesh has ${openEdges} open edges out of ${totalEdges} total edges`
                );
            }

            return watertight;
        } catch (error) {
            this.log.error("Error checking mesh watertight:", error.message);
            return false;
        }
    }

    /**
     * Helper to add edge to edge map
     * @private
     */
    _addEdge(edgeMap, v1, v2) {
        // Normalize edge direction (smaller index first)
        const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.log.info("Disposed");
    }
}
