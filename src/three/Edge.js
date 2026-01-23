import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * Edge - Represents a BREP edge as a thick polyline
 * Extends Line2 from three.js examples to render edges as thick lines.
 * Stores references to adjacent faces and polyline data.
 */
export class Edge extends Line2 {
    constructor(geometry = null, material = null) {
        // Default material if not provided
        const defaultMaterial = new LineMaterial({
            color: 0x000000,
            linewidth: 2, // pixels
            resolution: new THREE.Vector2(
                typeof window !== 'undefined' ? window.innerWidth : 1920,
                typeof window !== 'undefined' ? window.innerHeight : 1080
            ),
            alphaToCoverage: true,
        });

        super(geometry || new LineGeometry(), material || defaultMaterial);

        this.type = 'EDGE';
        this.edgeName = '';
        this.closedLoop = false;
        this.faces = []; // Up to 2 Face objects sharing this edge
        this.parentSolid = null; // Reference to parent solid/group

        // Store default material for restoration
        this.userData.defaultMaterial = this.material;

        // Compute line distances for dashed lines support
        this.computeLineDistances();
    }

    /**
     * Update the resolution of the line material
     * Should be called on window resize
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    updateResolution(width, height) {
        if (this.material && this.material.resolution) {
            this.material.resolution.set(width, height);
        }
    }

    /**
     * Set the polyline positions from an array of [x,y,z] coordinates
     * @param {Array<Array<number>>} positions - Array of [x,y,z] points
     */
    setPolyline(positions) {
        if (!Array.isArray(positions) || positions.length < 2) {
            console.warn('Edge.setPolyline: Invalid positions array');
            return;
        }

        // Flatten positions array
        const flatPositions = [];
        for (const p of positions) {
            if (!Array.isArray(p) || p.length !== 3) continue;
            flatPositions.push(p[0], p[1], p[2]);
        }

        // Create new geometry with positions
        const geometry = new LineGeometry();
        geometry.setPositions(flatPositions);

        // Replace geometry
        if (this.geometry) {
            this.geometry.dispose();
        }
        this.geometry = geometry;

        // Store polyline in userData
        this.userData.polylineLocal = positions;

        // Recompute line distances
        this.computeLineDistances();
    }

    /**
     * Get the polyline positions
     * @returns {Array<Array<number>>} Array of [x,y,z] points
     */
    getPolyline() {
        return this.userData.polylineLocal || [];
    }

    /**
     * Get the length of the edge polyline
     * @returns {number} Total length
     */
    getLength() {
        const positions = this.getPolyline();
        if (positions.length < 2) return 0;

        let length = 0;
        for (let i = 1; i < positions.length; i++) {
            const p0 = positions[i - 1];
            const p1 = positions[i];
            const dx = p1[0] - p0[0];
            const dy = p1[1] - p0[1];
            const dz = p1[2] - p0[2];
            length += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }

        return length;
    }
}
