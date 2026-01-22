
import * as THREE from "three";
import { LoggerFactory } from "../core/LoggerFactory.js";

/**
 * SelectionManager
 * Handles raycasting, hover effects, and selection of specific CSG parts (faces/origins).
 * Uses Manifold metadata (runOriginalID) to identify distinct parts of the mesh.
 */
export default class SelectionManager {
    constructor(config = {}) {
        this.log = LoggerFactory.createLogger("SelectionManager");
        this.scene = config.scene;
        this.camera = config.camera;
        this.renderer = config.renderer;
        this.container = config.container;
        this.materialManager = config.materialManager; // Optional, for coherence

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.targetMesh = null; // The CSG result partMesh
        this.isEnabled = false;

        // Highlight Overlay
        this.highlightMesh = null;
        this.highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00, // Bright yellow
            transparent: true,
            opacity: 0.3,
            depthTest: false, // Always show on top
            depthWrite: false,
            side: THREE.DoubleSide,
        });

        // Edge Highlight (Optional, for crisp outline)
        this.highlightEdges = null;

        // State
        this.hoveredID = null;

        // Event bindings
        this._onMouseMove = this.onMouseMove.bind(this);
        this._onClick = this.onClick.bind(this);
    }

    /**
     * Initialize listeners
     */
    enable() {
        if (this.isEnabled) return;
        if (this.container) {
            this.container.addEventListener("mousemove", this._onMouseMove);
            this.container.addEventListener("click", this._onClick);
        }
        this.isEnabled = true;
        this.log.info("Enabled");
    }

    disable() {
        if (!this.isEnabled) return;
        if (this.container) {
            this.container.removeEventListener("mousemove", this._onMouseMove);
            this.container.removeEventListener("click", this._onClick);
        }
        this.clearHighlight();
        this.isEnabled = false;
        this.log.info("Disabled");
    }

    /**
     * Set the mesh to interact with (usually the CSG result)
     */
    setTargetMesh(mesh) {
        this.targetMesh = mesh;
        this.clearHighlight();
    }

    onMouseMove(event) {
        if (!this.targetMesh || !this.targetMesh.visible) {
            this.clearHighlight();
            return;
        }

        this.updateMouse(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObject(this.targetMesh, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const faceIndex = hit.faceIndex;

            // Resolve the Logical ID (Face or Part)
            const id = this.getSelectionID(faceIndex);

            if (id !== null && id !== this.hoveredID) {
                this.hoveredID = id;
                this.updateHighlight(id);
            }
        } else {
            if (this.hoveredID !== null) {
                this.hoveredID = null;
                this.clearHighlight();
            }
        }
    }

    onClick(event) {
        // Placeholder for selection logic (e.g., sticking the selection)
        if (this.hoveredID !== null) {
            this.log.info("Clicked Part ID:", this.hoveredID);
        }
    }

    updateMouse(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Get the ID for selection. Prioritizes faceID (logical face) over runOriginalID (whole part).
     */
    getSelectionID(faceIndex) {
        if (!this.targetMesh || !this.targetMesh.userData) return null;
        const meta = this.targetMesh.userData.manifoldMeta;

        // Prefer Face ID (granular selection of faces/strips)
        if (meta && meta.faceID && faceIndex >= 0 && faceIndex < meta.faceID.length) {
            return meta.faceID[faceIndex];
        }

        // Fallback to Component ID (whole bit/panel)
        if (meta && meta.runOriginalID && faceIndex >= 0 && faceIndex < meta.runOriginalID.length) {
            return meta.runOriginalID[faceIndex];
        }

        return null;
    }

    /**
     * Create/Update geometry for the highlighted part
     */
    updateHighlight(targetID) {
        if (!this.targetMesh) return;

        const geometry = this.targetMesh.geometry;
        const meta = this.targetMesh.userData.manifoldMeta;

        if (!geometry || !meta || !meta.runOriginalID) return;

        // 1. Gather triangles belonging to this ID
        // We need to determine if this ID is a FaceID or a RunOriginalID.
        // Heuristic: Check if the ID exists in FaceID array first (since we prioritize it).

        const faceIDs = meta.faceID;
        const runOriginalID = meta.runOriginalID;
        const indices = [];

        let foundInFaces = false;

        // Optimization: If we just picked this ID, we know where it came from in `getSelectionID`. 
        // But here we only have the ID.
        // Let's assume Face IDs are unique enough? Or just scan faceID first.

        if (faceIDs) {
            for (let i = 0; i < faceIDs.length; i++) {
                if (faceIDs[i] === targetID) {
                    indices.push(i);
                    foundInFaces = true;
                }
            }
        }

        // If not found in faces, try components
        if (!foundInFaces && runOriginalID) {
            for (let i = 0; i < runOriginalID.length; i++) {
                if (runOriginalID[i] === targetID) {
                    indices.push(i);
                }
            }
        }

        if (indices.length === 0) {
            this.clearHighlight();
            return;
        }

        this.log.debug(`Highlighting ID ${targetID} (${indices.length} tris)`);

        // 2. Build Subset Geometry
        // We need to extract the specific triangles.
        // Three.js geometry is indexed or non-indexed. Manifold usually returns indexed.

        const posAttr = geometry.getAttribute("position");
        const indexAttr = geometry.getIndex();

        // Create a non-indexed geometry for simplicity of extraction 
        // (or re-map indices, which is cleaner but more complex)
        // Let's go simple: new non-indexed geometry with just the triangle vertices.

        const newPositions = new Float32Array(indices.length * 9); // 3 verts * 3 floats
        let ptr = 0;

        if (indexAttr) {
            for (const triIdx of indices) {
                const a = indexAttr.getX(triIdx * 3);
                const b = indexAttr.getX(triIdx * 3 + 1);
                const c = indexAttr.getX(triIdx * 3 + 2);

                newPositions[ptr++] = posAttr.getX(a);
                newPositions[ptr++] = posAttr.getY(a);
                newPositions[ptr++] = posAttr.getZ(a);

                newPositions[ptr++] = posAttr.getX(b);
                newPositions[ptr++] = posAttr.getY(b);
                newPositions[ptr++] = posAttr.getZ(b);

                newPositions[ptr++] = posAttr.getX(c);
                newPositions[ptr++] = posAttr.getY(c);
                newPositions[ptr++] = posAttr.getZ(c);
            }
        } else {
            for (const triIdx of indices) {
                const base = triIdx * 3;
                for (let k = 0; k < 9; k++) {
                    newPositions[ptr++] = posAttr.array[base * 3 + k]; // vertex is 3 floats, so 9 floats per tri
                }
            }
        }

        // 3. Update Mesh
        if (!this.highlightMesh) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.BufferAttribute(newPositions, 3));
            this.highlightMesh = new THREE.Mesh(geo, this.highlightMaterial);
            this.highlightMesh.frustumCulled = false; // Avoid internal bounding box bugs

            // Ensure visual priority
            this.highlightMesh.renderOrder = 999;

            this.scene.add(this.highlightMesh);
        } else {
            // Reuse geometry object if possible to avoid memory churn?
            // Actually, simplest is to dispose and recreate or update attribute.
            this.highlightMesh.geometry.dispose();
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.BufferAttribute(newPositions, 3));
            this.highlightMesh.geometry = geo;
            this.highlightMesh.visible = true;
        }

        // Copy transform
        this.highlightMesh.position.copy(this.targetMesh.position);
        this.highlightMesh.rotation.copy(this.targetMesh.rotation);
        this.highlightMesh.scale.copy(this.targetMesh.scale);
        this.highlightMesh.updateMatrixWorld();
    }

    clearHighlight() {
        if (this.highlightMesh) {
            this.highlightMesh.visible = false;
        }
        this.hoveredID = null;
    }
}
