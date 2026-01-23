import * as THREE from 'three';

/**
 * Face - Represents a logical BREP face
 * Extends THREE.Mesh to represent a single face with its own geometry and material.
 * Stores references to connected edges and provides utilities for face analysis.
 */
export class Face extends THREE.Mesh {
    constructor(geometry, material = null) {
        // Default material if not provided
        const defaultMaterial = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.1,
            roughness: 0.6,
            side: THREE.DoubleSide,
        });

        super(geometry, material || defaultMaterial);

        this.type = 'FACE';
        this.faceName = '';
        this.faceID = -1;
        this.edges = []; // Array of Edge objects connected to this face
        this.parentSolid = null; // Reference to parent solid/group

        // Store default material for restoration
        this.userData.defaultMaterial = this.material;
    }

    /**
     * Calculate the average normal of this face, weighted by triangle area
     * @returns {THREE.Vector3} Average normal vector
     */
    getAverageNormal() {
        const geometry = this.geometry;
        const posAttr = geometry.getAttribute('position');

        if (!posAttr) {
            return new THREE.Vector3(0, 0, 1);
        }

        const normal = new THREE.Vector3();
        const v0 = new THREE.Vector3();
        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        const edge1 = new THREE.Vector3();
        const edge2 = new THREE.Vector3();
        const triNormal = new THREE.Vector3();

        const indexAttr = geometry.getIndex();
        const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

        let totalArea = 0;

        for (let i = 0; i < triCount; i++) {
            const i3 = i * 3;
            const i0 = indexAttr ? indexAttr.getX(i3) : i3;
            const i1 = indexAttr ? indexAttr.getX(i3 + 1) : i3 + 1;
            const i2 = indexAttr ? indexAttr.getX(i3 + 2) : i3 + 2;

            v0.fromBufferAttribute(posAttr, i0);
            v1.fromBufferAttribute(posAttr, i1);
            v2.fromBufferAttribute(posAttr, i2);

            edge1.subVectors(v1, v0);
            edge2.subVectors(v2, v0);
            triNormal.crossVectors(edge1, edge2);

            const area = triNormal.length() / 2;
            totalArea += area;

            triNormal.normalize();
            normal.add(triNormal.multiplyScalar(area));
        }

        if (totalArea > 0) {
            normal.divideScalar(totalArea);
        }

        normal.normalize();
        return normal;
    }

    /**
     * Get the surface area of this face
     * @returns {number} Total surface area
     */
    getSurfaceArea() {
        const geometry = this.geometry;
        const posAttr = geometry.getAttribute('position');

        if (!posAttr) return 0;

        const v0 = new THREE.Vector3();
        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        const edge1 = new THREE.Vector3();
        const edge2 = new THREE.Vector3();
        const cross = new THREE.Vector3();

        const indexAttr = geometry.getIndex();
        const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

        let totalArea = 0;

        for (let i = 0; i < triCount; i++) {
            const i3 = i * 3;
            const i0 = indexAttr ? indexAttr.getX(i3) : i3;
            const i1 = indexAttr ? indexAttr.getX(i3 + 1) : i3 + 1;
            const i2 = indexAttr ? indexAttr.getX(i3 + 2) : i3 + 2;

            v0.fromBufferAttribute(posAttr, i0);
            v1.fromBufferAttribute(posAttr, i1);
            v2.fromBufferAttribute(posAttr, i2);

            edge1.subVectors(v1, v0);
            edge2.subVectors(v2, v0);
            cross.crossVectors(edge1, edge2);

            totalArea += cross.length() / 2;
        }

        return totalArea;
    }

    /**
     * Get neighboring faces via shared edges
     * @returns {Face[]} Array of neighboring Face objects
     */
    getNeighbors() {
        const neighbors = new Set();

        // Traverse edges to find connected faces
        for (const edge of this.edges) {
            if (!edge || !Array.isArray(edge.faces)) continue;

            for (const face of edge.faces) {
                if (face && face !== this) {
                    neighbors.add(face);
                }
            }
        }

        return Array.from(neighbors);
    }
}
