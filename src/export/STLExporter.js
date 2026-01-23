import * as THREE from "three";

/**
 * STL Exporter for 3D Geometry
 * Exports Three.js meshes to ASCII STL format
 */
class STLExporter {
    constructor(logger) {
        this.log = logger;
    }

    /**
     * Export meshes to STL ASCII format
     * @param {Array<THREE.Mesh>} meshes - Array of THREE.Mesh objects to export
     * @param {string} filename - Output filename (without .stl extension)
     * @returns {void} Triggers download
     */
    exportToSTL(meshes, filename = "export") {
        if (!meshes || meshes.length === 0) {
            this.log?.warn?.("No meshes to export");
            return;
        }

        const stlContent = this.generateSTL(meshes);
        this.downloadSTL(stlContent, filename);
    }

    /**
     * Generate ASCII STL content from meshes
     * @param {Array<THREE.Mesh>} meshes
     * @returns {string} STL content
     */
    generateSTL(meshes) {
        let stl = "";

        const exportableMeshes = this.collectMeshes(meshes);

        exportableMeshes.forEach((mesh, meshIdx) => {
            if (!mesh?.geometry) {
                this.log?.warn?.(`Mesh ${meshIdx} has no geometry, skipping`);
                return;
            }

            const geometry = mesh.geometry;
            const matrixWorld = mesh.matrixWorld;
            const solidName = mesh.name || `mesh_${meshIdx}`;

            // Ensure geometry is indexed and cloned so we never mutate the original
            let indexedGeom;
            if (geometry.index) {
                indexedGeom = geometry; // safe to read; not mutating
            } else {
                indexedGeom = geometry.clone().toNonIndexed();
            }

            const positions = indexedGeom.attributes.position.array;
            const indices = indexedGeom.index
                ? indexedGeom.index.array
                : Array.from({ length: positions.length / 3 }, (_, i) => i);

            // Begin solid block per mesh
            stl += `solid ${solidName}\n`;

            for (let i = 0; i < indices.length; i += 3) {
                const i0 = indices[i] * 3;
                const i1 = indices[i + 1] * 3;
                const i2 = indices[i + 2] * 3;

                const v0 = new THREE.Vector3(
                    positions[i0],
                    positions[i0 + 1],
                    positions[i0 + 2]
                ).applyMatrix4(matrixWorld);
                const v1 = new THREE.Vector3(
                    positions[i1],
                    positions[i1 + 1],
                    positions[i1 + 2]
                ).applyMatrix4(matrixWorld);
                const v2 = new THREE.Vector3(
                    positions[i2],
                    positions[i2 + 1],
                    positions[i2 + 2]
                ).applyMatrix4(matrixWorld);

                const edge1 = new THREE.Vector3().subVectors(v1, v0);
                const edge2 = new THREE.Vector3().subVectors(v2, v0);
                const normal = new THREE.Vector3()
                    .crossVectors(edge1, edge2)
                    .normalize();

                stl += `  facet normal ${this.formatNumber(
                    normal.x
                )} ${this.formatNumber(normal.y)} ${this.formatNumber(
                    normal.z
                )}\n`;
                stl += "    outer loop\n";
                stl += `      vertex ${this.formatNumber(
                    v0.x
                )} ${this.formatNumber(v0.y)} ${this.formatNumber(v0.z)}\n`;
                stl += `      vertex ${this.formatNumber(
                    v1.x
                )} ${this.formatNumber(v1.y)} ${this.formatNumber(v1.z)}\n`;
                stl += `      vertex ${this.formatNumber(
                    v2.x
                )} ${this.formatNumber(v2.y)} ${this.formatNumber(v2.z)}\n`;
                stl += "    endloop\n";
                stl += "  endfacet\n";
            }

            stl += `endsolid ${solidName}\n`;

            if (!geometry.index && indexedGeom) {
                indexedGeom.dispose?.();
            }
        });

        return stl;
    }

    /**
     * Format number for STL (6 decimal places)
     */
    formatNumber(num) {
        return parseFloat(num).toFixed(6);
    }

    /**
     * Download STL file
     */
    downloadSTL(content, filename) {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().split("T")[0]
            }.stl`;
        link.click();
        URL.revokeObjectURL(url);
        this.log?.info?.(`STL exported: ${link.download}`);
    }

    /**
     * Recursively collect valid meshes for export
     * Ignores Line2 (fat lines), Edges, and meshes without geometry
     */
    collectMeshes(objects) {
        const result = [];
        const process = (obj) => {
            // Check if object is a Mesh and not a Line/Line2/Helper
            // Line2 extends Mesh but has isLine2 flag
            if (obj.isMesh && obj.geometry && !obj.isLine2 && !obj.userData?.isEdge) {
                result.push(obj);
            }
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(process);
            }
        };

        const list = Array.isArray(objects) ? objects : [objects];
        list.forEach(process);
        return result;
    }
}

export default STLExporter;
