import * as THREE from 'three';

/**
 * Vertex - Represents a BREP vertex as a point marker
 * Extends THREE.Points to render vertices at edge endpoints.
 */
export class Vertex extends THREE.Points {
    constructor(position, options = {}) {
        // Ensure position is a valid array
        const pos = Array.isArray(position) ? position : [0, 0, 0];

        // Create geometry with single point
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(pos, 3)
        );

        // Default material
        const material = new THREE.PointsMaterial({
            color: options.color || 0x000000,
            size: options.size || 5,
            sizeAttenuation: false, // Keep constant size regardless of distance
        });

        super(geometry, material);

        this.type = 'VERTEX';
        this.name = options.name || `VERTEX(${pos[0].toFixed(3)},${pos[1].toFixed(3)},${pos[2].toFixed(3)})`;
        this.parentSolid = null;

        // Store position in userData
        this.userData.position = pos;
    }

    /**
     * Get the vertex position
     * @returns {Array<number>} [x, y, z] position
     */
    getPosition() {
        return this.userData.position || [0, 0, 0];
    }

    /**
     * Set the vertex position
     * @param {Array<number>} position - [x, y, z] position
     */
    setPosition(position) {
        if (!Array.isArray(position) || position.length !== 3) {
            console.warn('Vertex.setPosition: Invalid position');
            return;
        }

        this.userData.position = position;

        // Update geometry
        const posAttr = this.geometry.getAttribute('position');
        if (posAttr) {
            posAttr.setXYZ(0, position[0], position[1], position[2]);
            posAttr.needsUpdate = true;
        }

        // Update name
        this.name = `VERTEX(${position[0].toFixed(3)},${position[1].toFixed(3)},${position[2].toFixed(3)})`;
    }
}
