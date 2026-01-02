/**
 * Test script for lathe end cap closure
 * Tests whether end caps properly close partial lathe geometry
 */

import * as THREE from "three";
import ExtrusionBuilder from "./src/three/ExtrusionBuilder.js";

// Mock LoggerFactory for standalone testing
global.LoggerFactory = {
    createLogger: (name) => ({
        info: console.log,
        debug: console.log,
        warn: console.warn,
        error: console.error,
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

// Run tests
function runTests() {
    console.log("Initializing ExtrusionBuilder...");
    const builder = new ExtrusionBuilder();
    builder.initialize({ materialManager: mockMaterialManager });

    const profile = createCircleProfile();

    console.log("\n================================================");
    console.log("TEST 1: 90° Partial Lathe");
    console.log("================================================");
    const result90 = builder.testLatheEndCapClosure(profile, 90);

    console.log("\n================================================");
    console.log("TEST 2: 45° Partial Lathe (narrow sector)");
    console.log("================================================");
    const result45 = builder.testLatheEndCapClosure(profile, 45);

    console.log("\n================================================");
    console.log("TEST 3: 180° Partial Lathe (half circle)");
    console.log("================================================");
    const result180 = builder.testLatheEndCapClosure(profile, 180);

    // Analyze results
    console.log("\n================================================");
    console.log("ANALYSIS");
    console.log("================================================");

    const tests = [
        { name: "90° sector", result: result90 },
        { name: "45° sector", result: result45 },
        { name: "180° sector", result: result180 },
    ];

    let successCount = 0;
    tests.forEach((test) => {
        const status = test.result.mergedIsClosed ? "✓ PASS" : "✗ FAIL";
        console.log(`${status}: ${test.name}`);
        if (test.result.mergedIsClosed) successCount++;
    });

    console.log(`\nOverall: ${successCount}/${tests.length} tests passed`);

    if (successCount === tests.length) {
        console.log(
            "\n✓ All tests PASSED! End caps are properly closing lathes."
        );
    } else {
        console.log(
            "\n✗ Some tests FAILED. Need to adjust end cap positioning."
        );
    }
}

// Run it
runTests();
