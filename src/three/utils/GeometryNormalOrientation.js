/**
 * Geometry normal orientation utilities.
 *
 * The helpers in this module keep face winding and normals consistent for
 * mixed topologies (closed shells + open ribbons) produced by extrusion and
 * lathe merges.
 */

/**
 * Reverse triangle winding for a geometry in-place.
 *
 * @param {import("three").BufferGeometry} geometry - Indexed geometry.
 * @param {{warn?: Function}} [log] - Optional logger with warn method.
 * @returns {boolean} True when geometry was modified.
 */
export function invertGeometryNormals(geometry, log = null) {
    try {
        if (!geometry || !geometry.index) return false;
        const index = geometry.index.array;
        for (let i = 0; i < index.length; i += 3) {
            const b = index[i + 1];
            index[i + 1] = index[i + 2];
            index[i + 2] = b;
        }
        geometry.index.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.normalizeNormals();
        return true;
    } catch (error) {
        if (log && typeof log.warn === "function") {
            log.warn("Failed to invert geometry normals", error);
        }
        return false;
    }
}

/**
 * Compute signed volume from triangle winding.
 *
 * @param {import("three").BufferGeometry} geometry - Geometry to evaluate.
 * @returns {number} Signed volume in model units.
 */
export function computeSignedVolume(geometry) {
    if (!geometry?.attributes?.position) return 0;

    const pos = geometry.attributes.position;
    const idx = geometry.index?.array;
    let volume = 0;

    const triAt = (i0, i1, i2) => {
        const ax = pos.getX(i0);
        const ay = pos.getY(i0);
        const az = pos.getZ(i0);
        const bx = pos.getX(i1);
        const by = pos.getY(i1);
        const bz = pos.getZ(i1);
        const cx = pos.getX(i2);
        const cy = pos.getY(i2);
        const cz = pos.getZ(i2);

        volume +=
            (ax * (by * cz - bz * cy) +
                ay * (bz * cx - bx * cz) +
                az * (bx * cy - by * cx)) /
            6;
    };

    if (idx && idx.length >= 3) {
        for (let i = 0; i + 2 < idx.length; i += 3) {
            triAt(idx[i], idx[i + 1], idx[i + 2]);
        }
    } else {
        for (let i = 0; i + 2 < pos.count; i += 3) {
            triAt(i, i + 1, i + 2);
        }
    }

    return volume;
}

function flipTriangleIndices(indexArray, triangles) {
    for (const tri of triangles) {
        const i = tri * 3;
        const b = indexArray[i + 1];
        indexArray[i + 1] = indexArray[i + 2];
        indexArray[i + 2] = b;
    }
}

/**
 * Ensure normals point outward for closed and open components.
 *
 * Steps:
 * 1) unify local triangle winding by edge adjacency,
 * 2) split mesh into connected components,
 * 3) orient each component using signed volume for closed parts,
 *    and robust face-direction voting for open parts,
 * 4) fallback to whole-mesh checks for degenerate cases.
 *
 * @param {import("three").BufferGeometry} geometry - Geometry to fix.
 * @param {{
 *   label?: string,
 *   volumeEpsilon?: number,
 *   quantization?: number,
 *   log?: {debug?: Function, warn?: Function}
 * }} [options] - Runtime options.
 * @returns {boolean} True when winding was changed.
 */
export function ensureOutwardNormals(geometry, options = {}) {
    if (!geometry?.attributes?.position) return false;

    const {
        label = "",
        volumeEpsilon = 1e-6,
        quantization = 1e5,
        log = null,
    } = options;

    if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
        geometry.normalizeNormals();
    }

    const pos = geometry.attributes.position;
    const idx = geometry.index?.array;
    if (!idx || idx.length < 3) return false;

    const vertexGeomKey = (vi) =>
        `${Math.round(pos.getX(vi) * quantization)}:${Math.round(pos.getY(vi) * quantization)}:${Math.round(pos.getZ(vi) * quantization)}`;

    const triCount = Math.floor(idx.length / 3);

    // 1) Winding consistency pass
    const adjacency = Array.from({ length: triCount }, () => []);
    const edgeMap = new Map();

    for (let tri = 0; tri < triCount; tri++) {
        const a = idx[tri * 3];
        const b = idx[tri * 3 + 1];
        const c = idx[tri * 3 + 2];
        for (const [u, v] of [[a, b], [b, c], [c, a]]) {
            const ku = vertexGeomKey(u);
            const kv = vertexGeomKey(v);
            const key = ku < kv ? `${ku}|${kv}` : `${kv}|${ku}`;
            if (!edgeMap.has(key)) edgeMap.set(key, []);
            edgeMap.get(key).push({ tri, u: ku, v: kv });
        }
    }

    for (const owners of edgeMap.values()) {
        if (owners.length < 2) continue;
        for (let i = 0; i < owners.length; i++) {
            for (let j = i + 1; j < owners.length; j++) {
                const a = owners[i];
                const b = owners[j];
                const sameDirection = a.u === b.u && a.v === b.v;
                adjacency[a.tri].push({ tri: b.tri, invert: sameDirection });
                adjacency[b.tri].push({ tri: a.tri, invert: sameDirection });
            }
        }
    }

    const state = new Int8Array(triCount);
    state.fill(-1);
    let changedByWinding = false;

    for (let start = 0; start < triCount; start++) {
        if (state[start] !== -1) continue;
        state[start] = 0;

        const queue = [start];
        for (let qi = 0; qi < queue.length; qi++) {
            const t = queue[qi];
            const st = state[t];
            for (const nb of adjacency[t]) {
                const required = st ^ (nb.invert ? 1 : 0);
                if (state[nb.tri] === -1) {
                    state[nb.tri] = required;
                    queue.push(nb.tri);
                }
            }
        }
    }

    for (let tri = 0; tri < triCount; tri++) {
        if (state[tri] === 1) {
            flipTriangleIndices(idx, [tri]);
            changedByWinding = true;
        }
    }

    if (changedByWinding) {
        geometry.index.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.normalizeNormals();
    }

    // 2) Connected components by geometric edges
    const parent = Array.from({ length: triCount }, (_, i) => i);
    const rank = new Uint8Array(triCount);

    const find = (x) => {
        while (parent[x] !== x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };

    const unite = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra === rb) return;
        if (rank[ra] < rank[rb]) {
            parent[ra] = rb;
        } else if (rank[ra] > rank[rb]) {
            parent[rb] = ra;
        } else {
            parent[rb] = ra;
            rank[ra]++;
        }
    };

    const compEdgeOwner = new Map();
    for (let tri = 0; tri < triCount; tri++) {
        const a = idx[tri * 3];
        const b = idx[tri * 3 + 1];
        const c = idx[tri * 3 + 2];
        for (const [uRaw, vRaw] of [[a, b], [b, c], [c, a]]) {
            const ku = vertexGeomKey(uRaw);
            const kv = vertexGeomKey(vRaw);
            const key = ku < kv ? `${ku}|${kv}` : `${kv}|${ku}`;
            if (!compEdgeOwner.has(key)) {
                compEdgeOwner.set(key, tri);
            } else {
                unite(tri, compEdgeOwner.get(key));
            }
        }
    }

    const components = new Map();
    for (let tri = 0; tri < triCount; tri++) {
        const root = find(tri);
        if (!components.has(root)) components.set(root, []);
        components.get(root).push(tri);
    }

    // 3) Component orientation pass
    let changedByComponent = false;

    for (const componentTriangles of components.values()) {
        const componentEdgeCounts = new Map();
        for (const tri of componentTriangles) {
            const i0 = idx[tri * 3];
            const i1 = idx[tri * 3 + 1];
            const i2 = idx[tri * 3 + 2];
            for (const [uRaw, vRaw] of [[i0, i1], [i1, i2], [i2, i0]]) {
                const ku = vertexGeomKey(uRaw);
                const kv = vertexGeomKey(vRaw);
                const key = ku < kv ? `${ku}|${kv}` : `${kv}|${ku}`;
                componentEdgeCounts.set(
                    key,
                    (componentEdgeCounts.get(key) || 0) + 1,
                );
            }
        }

        let hasBoundaryEdges = false;
        for (const count of componentEdgeCounts.values()) {
            if (count === 1) {
                hasBoundaryEdges = true;
                break;
            }
        }

        let shouldFlip = false;

        if (!hasBoundaryEdges) {
            let volume = 0;
            for (const tri of componentTriangles) {
                const i0 = idx[tri * 3];
                const i1 = idx[tri * 3 + 1];
                const i2 = idx[tri * 3 + 2];
                const ax = pos.getX(i0);
                const ay = pos.getY(i0);
                const az = pos.getZ(i0);
                const bx = pos.getX(i1);
                const by = pos.getY(i1);
                const bz = pos.getZ(i1);
                const cx = pos.getX(i2);
                const cy = pos.getY(i2);
                const cz = pos.getZ(i2);
                volume +=
                    (ax * (by * cz - bz * cy) +
                        ay * (bz * cx - bx * cz) +
                        az * (bx * cy - by * cx)) /
                    6;
            }
            if (Number.isFinite(volume) && Math.abs(volume) > volumeEpsilon) {
                shouldFlip = volume < 0;
            }
        }

        if (hasBoundaryEdges || !shouldFlip) {
            let minX = Infinity;
            let minY = Infinity;
            let minZ = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            let maxZ = -Infinity;

            for (const tri of componentTriangles) {
                const i0 = idx[tri * 3];
                const i1 = idx[tri * 3 + 1];
                const i2 = idx[tri * 3 + 2];
                for (const vi of [i0, i1, i2]) {
                    const vx = pos.getX(vi);
                    const vy = pos.getY(vi);
                    const vz = pos.getZ(vi);
                    if (vx < minX) minX = vx;
                    if (vy < minY) minY = vy;
                    if (vz < minZ) minZ = vz;
                    if (vx > maxX) maxX = vx;
                    if (vy > maxY) maxY = vy;
                    if (vz > maxZ) maxZ = vz;
                }
            }

            const boxCx = (minX + maxX) / 2;
            const boxCy = (minY + maxY) / 2;
            const boxCz = (minZ + maxZ) / 2;

            let inwardFaces = 0;
            let outwardFaces = 0;

            for (const tri of componentTriangles) {
                const i0 = idx[tri * 3];
                const i1 = idx[tri * 3 + 1];
                const i2 = idx[tri * 3 + 2];
                const ax = pos.getX(i0);
                const ay = pos.getY(i0);
                const az = pos.getZ(i0);
                const bx = pos.getX(i1);
                const by = pos.getY(i1);
                const bz = pos.getZ(i1);
                const cx = pos.getX(i2);
                const cy = pos.getY(i2);
                const cz = pos.getZ(i2);

                const abx = bx - ax;
                const aby = by - ay;
                const abz = bz - az;
                const acx = cx - ax;
                const acy = cy - ay;
                const acz = cz - az;

                const nx = aby * acz - abz * acy;
                const ny = abz * acx - abx * acz;
                const nz = abx * acy - aby * acx;

                const fcx = (ax + bx + cx) / 3;
                const fcy = (ay + by + cy) / 3;
                const fcz = (az + bz + cz) / 3;

                const boxDot =
                    nx * (fcx - boxCx) +
                    ny * (fcy - boxCy) +
                    nz * (fcz - boxCz);

                if (boxDot < 0) {
                    inwardFaces++;
                } else {
                    outwardFaces++;
                }
            }

            if (inwardFaces > outwardFaces) {
                shouldFlip = true;
            }
        }

        if (shouldFlip) {
            flipTriangleIndices(idx, componentTriangles);
            changedByComponent = true;
        }
    }

    if (changedByComponent) {
        geometry.index.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.normalizeNormals();
        if (log && typeof log.debug === "function") {
            log.debug(`Flipped normals by connected components (${label})`, {
                components: components.size,
            });
        }
        return true;
    }

    if (changedByWinding) {
        if (log && typeof log.debug === "function") {
            log.debug(`Flipped normals by winding consistency (${label})`);
        }
        return true;
    }

    // 4) Whole-mesh fallback
    const volume = computeSignedVolume(geometry);
    if (Number.isFinite(volume) && Math.abs(volume) > volumeEpsilon) {
        if (volume < 0) {
            invertGeometryNormals(geometry, log);
            if (log && typeof log.debug === "function") {
                log.debug(`Flipped normals by signed volume (${label})`, {
                    volume,
                });
            }
            return true;
        }
        return false;
    }

    const normal = geometry.attributes.normal;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < pos.count; i++) {
        cx += pos.getX(i);
        cy += pos.getY(i);
        cz += pos.getZ(i);
    }

    const invCount = pos.count > 0 ? 1 / pos.count : 0;
    cx *= invCount;
    cy *= invCount;
    cz *= invCount;

    let dotSum = 0;
    for (let i = 0; i < pos.count; i++) {
        const rx = pos.getX(i) - cx;
        const ry = pos.getY(i) - cy;
        const rz = pos.getZ(i) - cz;
        dotSum +=
            normal.getX(i) * rx +
            normal.getY(i) * ry +
            normal.getZ(i) * rz;
    }

    if (dotSum < 0) {
        invertGeometryNormals(geometry, log);
        if (log && typeof log.debug === "function") {
            log.debug(`Flipped normals by radial fallback (${label})`, {
                dotSum,
            });
        }
        return true;
    }

    return false;
}
