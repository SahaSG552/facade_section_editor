
import * as THREE from 'three';
import { Manifold, Mesh } from 'manifold-3d';
import ManifoldCSG from '../src/three/ManifoldCSG.js';

// Mock logger
const logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
};

async function runTest() {
    console.log("Starting Manifold Metadata Verification...");

    const manifoldCSG = new ManifoldCSG(logger);
    const ready = await manifoldCSG.ensureModule();
    if (!ready) {
        console.error("Failed to load Manifold module");
        return;
    }

    console.log("Manifold module loaded.");

    // 1. Create Base Geometry (Box)
    const boxGeom = new THREE.BoxGeometry(10, 10, 10);
    const boxMatrix = new THREE.Matrix4(); // Identity

    // 2. Create Cutter Geometry (Sphere)
    const sphereGeom = new THREE.SphereGeometry(6, 16, 16);
    const sphereMesh = new THREE.Mesh(sphereGeom);
    sphereMesh.position.set(5, 5, 5); // Corner cut
    sphereMesh.updateMatrixWorld(true);

    // 3. Perform Subtraction
    // We expect the result to contain triangles from the box and triangles from the sphere.
    // The wrapper should handle ID assignment if we look at ManifoldCSG.js.
    // Looking at ManifoldCSG.js, it calls `idStart = Manifold.reserveIDs(1 + cutters.length)`.
    // Then it calls `toManifold(..., idStart, ...)` for panel
    // And `toManifold(..., idStart + 1 + idx, ...)` for cutters.

    const result = await manifoldCSG.subtract({
        panelGeometry: boxGeom,
        panelMatrix: boxMatrix,
        cutters: [sphereMesh],
        tolerance: 0.001
    });

    if (!result) {
        console.error("Subtraction failed");
        return;
    }

    const { geometry, meta } = result;

    console.log("Result Geometry Vertex Count:", geometry.attributes.position.count);
    console.log("Result Metadata:", meta);

    // 4. Verify Metadata
    // runOriginalID should map triangles back to their source (Panel vs Sphere)
    if (meta && meta.runOriginalID) {
        console.log("runOriginalID found. Length:", meta.runOriginalID.length);
        const uniqueIDs = new Set(meta.runOriginalID);
        console.log("Unique runOriginalIDs:", Array.from(uniqueIDs));

        if (uniqueIDs.size >= 2) {
            console.log("SUCCESS: Multiple Source IDs detected. Provenance is working.");
        } else {
            console.warn("WARNING: Only one Source ID found. Did the cut happen?");
        }
    } else {
        console.error("FAILURE: No runOriginalID in metadata");
    }

    // faceID comes from local labels we might assign.
    // ManifoldCSG.js doesn't seem to assign specific faceIDs inside `toManifold` unless we passed them?
    // Let's check `toManifold` in ManifoldCSG.js again later.
    // But basic provenance (runOriginalID) is the first step.
}

runTest().catch(console.error);
