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
        let stl = `solid Exported3DModel\n`;

        meshes.forEach((mesh, meshIdx) => {
            if (!mesh.geometry) {
                this.log?.warn?.(`Mesh ${meshIdx} has no geometry, skipping`);
                return;
            }

            const geometry = mesh.geometry;
            const matrixWorld = mesh.matrixWorld;

            // Ensure geometry is indexed
            let indexedGeom = geometry;
            if (!geometry.index) {
                indexedGeom = geometry.clone();
                indexedGeom = indexedGeom.toNonIndexed();
            }

            const positions = indexedGeom.attributes.position.array;
            const indices = indexedGeom.index
                ? indexedGeom.index.array
                : Array.from({ length: positions.length / 3 }, (_, i) => i);

            // Process triangles
            const triangles = [];
            for (let i = 0; i < indices.length; i += 3) {
                const i0 = indices[i] * 3;
                const i1 = indices[i + 1] * 3;
                const i2 = indices[i + 2] * 3;

                const v0 = new THREE.Vector3(
                    positions[i0],
                    positions[i0 + 1],
                    positions[i0 + 2]
                );
                const v1 = new THREE.Vector3(
                    positions[i1],
                    positions[i1 + 1],
                    positions[i1 + 2]
                );
                const v2 = new THREE.Vector3(
                    positions[i2],
                    positions[i2 + 1],
                    positions[i2 + 2]
                );

                // Apply mesh world transform
                v0.applyMatrix4(matrixWorld);
                v1.applyMatrix4(matrixWorld);
                v2.applyMatrix4(matrixWorld);

                // Calculate normal
                const edge1 = new THREE.Vector3().subVectors(v1, v0);
                const edge2 = new THREE.Vector3().subVectors(v2, v0);
                const normal = new THREE.Vector3()
                    .crossVectors(edge1, edge2)
                    .normalize();

                triangles.push({ normal, v0, v1, v2 });
            }

            // Write triangles to STL
            triangles.forEach((tri) => {
                stl += `  facet normal ${this.formatNumber(
                    tri.normal.x
                )} ${this.formatNumber(tri.normal.y)} ${this.formatNumber(
                    tri.normal.z
                )}\n`;
                stl += `    outer loop\n`;
                stl += `      vertex ${this.formatNumber(
                    tri.v0.x
                )} ${this.formatNumber(tri.v0.y)} ${this.formatNumber(
                    tri.v0.z
                )}\n`;
                stl += `      vertex ${this.formatNumber(
                    tri.v1.x
                )} ${this.formatNumber(tri.v1.y)} ${this.formatNumber(
                    tri.v1.z
                )}\n`;
                stl += `      vertex ${this.formatNumber(
                    tri.v2.x
                )} ${this.formatNumber(tri.v2.y)} ${this.formatNumber(
                    tri.v2.z
                )}\n`;
                stl += `    endloop\n`;
                stl += `  endfacet\n`;
            });

            if (geometry !== indexedGeom) {
                indexedGeom.dispose();
            }
        });

        stl += `endsolid Exported3DModel\n`;
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
        link.download = `${filename}_${
            new Date().toISOString().split("T")[0]
        }.stl`;
        link.click();
        URL.revokeObjectURL(url);
        this.log?.info?.(`STL exported: ${link.download}`);
    }
}

export default STLExporter;
