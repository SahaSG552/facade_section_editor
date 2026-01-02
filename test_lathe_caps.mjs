/**
 * Test script for lathe end cap closure
 * Tests whether merged lathe + end caps geometry is closed (watertight)
 */

import * as THREE from "three";
import ExtrusionBuilder from "./src/three/ExtrusionBuilder.js";

// Mock LoggerFactory
global.LoggerFactory = {
    createLogger: (name) => ({
        info: (...args) => console.log(`[${name}]`, ...args),
        debug: (...args) => console.log(`[${name}]`, ...args),
        warn: (...args) => console.warn(`[${name}]`, ...args),
        error: (...args) => console.error(`[${name}]`, ...args),
    }),
};

// Mock MaterialManager
const mockMaterialManager = {
    isWireframeEnabled: () => false,
};

// Create a simple circular test profile
function createCircleProfile() {
    const shape = new THREE.Shape();
    const radius = 5;
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

// Check if geometry is closed (no boundary edges)
function isGeometryClosed(geometry) {
    try {
        const geom = geometry.index ? geometry : geometry.toNonIndexed();
        const index = geom.index.array;
        const positions = geom.attributes.position.array;
        const edgeCount = new Map();
        const boundaryEdges = [];

        const addEdge = (a, b) => {
            const key = a < b ? `${a}_${b}` : `${b}_${a}`;
            edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
        };

        for (let i = 0; i < index.length; i += 3) {
            const a = index[i],
                b = index[i + 1],
                c = index[i + 2];
            addEdge(a, b);
            addEdge(b, c);
            addEdge(c, a);
        }

        for (const [edge, count] of edgeCount) {
            if (count === 1) {
                boundaryEdges.push(edge);
            }
        }

        return {
            isClosed: boundaryEdges.length === 0,
            boundaryCount: boundaryEdges.length,
            samples: boundaryEdges.slice(0, 3).map((edge) => {
                const [a, b] = edge.split("_").map(Number);
                return {
                    edge: `${a}_${b}`,
                    v1: [
                        positions[a * 3],
                        positions[a * 3 + 1],
                        positions[a * 3 + 2],
                    ],
                    v2: [
                        positions[b * 3],
                        positions[b * 3 + 1],
                        positions[b * 3 + 2],
                    ],
                };
            }),
        };
    } catch (e) {
        return { isClosed: false, boundaryCount: -1, samples: [] };
    }
}

// Run tests
async function runTests() {
    console.log("Initializing ExtrusionBuilder...\n");
    const builder = new ExtrusionBuilder();
    builder.initialize({ materialManager: mockMaterialManager });

    const profile = createCircleProfile();

    const testAngles = [45, 90, 180];
    let successCount = 0;

    for (const angleSize of testAngles) {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`Testing ${angleSize}° partial lathe + end caps`);
        console.log(`${"=".repeat(60)}`);

        const phiStart = 0;
        const phiLength = (angleSize * Math.PI) / 180;
        const segments = Math.max(8, Math.ceil(32 * (angleSize / 360)));

        const lathePoints = builder.createLatheHalfProfilePoints(profile, null);

        // Create complete lathe with end caps using new method
        const latheGeom = builder.createLatheWithEndCaps(
            lathePoints,
            segments,
            phiStart,
            phiLength,
            true // includeCaps
        );

        if (!latheGeom) {
            console.log(`✗ FAIL: Failed to create lathe with end caps`);
            continue;
        }

        // Analyze boundary edges of the generated geometry
        const geom = latheGeom.index ? latheGeom : latheGeom.toNonIndexed();
        const index = geom.index.array;
        const edgeCount = new Map();

        const addEdge = (a, b) => {
            const key = a < b ? `${a}_${b}` : `${b}_${a}`;
            edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
        };

        for (let i = 0; i < index.length; i += 3) {
            const a = index[i],
                b = index[i + 1],
                c = index[i + 2];
            addEdge(a, b);
            addEdge(b, c);
            addEdge(c, a);
        }

        let boundaryCount = 0;
        for (const [, count] of edgeCount) {
            if (count === 1) boundaryCount++;
        }

        const isClosed = boundaryCount === 0;
        console.log(
            `  Vertices: ${
                latheGeom.attributes.position.count
            }, Boundary edges: ${boundaryCount} ${
                isClosed ? "✓ CLOSED" : "✗ OPEN"
            }`
        );

        if (isClosed) {
            console.log(`✓ PASS: Generated geometry is CLOSED (watertight)`);
            successCount++;
        } else {
            console.log(`✗ FAIL: Generated geometry is OPEN`);
            console.log(`  Boundary edges: ${boundaryCount}`);
        }
    }

    // Summary
    console.log(`\n${"=".repeat(60)}`);
    console.log(`SUMMARY: ${successCount}/${testAngles.length} tests passed`);
    console.log(`${"=".repeat(60)}`);

    if (successCount === testAngles.length) {
        console.log(
            `\n✓ SUCCESS! All partial lathes + end caps are properly closed.`
        );
    } else {
        console.log(`\n✗ ISSUE: Some configurations produce open meshes.`);
        console.log(`Need to adjust vertex matching or cap positioning.`);
    }
}

// Run it
runTests().catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
