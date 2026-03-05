import { evalAngle } from "../../transforms/TransformCommands.js";

export function sumRtAngle(transforms, vars = {}) {
    const list = Array.isArray(transforms) ? transforms : [];
    let angle = 0;
    for (const t of list) {
        if (String(t?.type ?? "").toUpperCase() !== "RT") continue;
        const v = evalAngle(t?.params?.[0] ?? "", vars);
        if (Number.isFinite(v)) angle += v;
    }
    return angle;
}

export function withRtAngle(transforms, nextAngle) {
    const list = Array.isArray(transforms)
        ? transforms.map(t => ({ ...t, params: Array.isArray(t.params) ? [...t.params] : [] }))
        : [];
    const token = String(parseFloat(nextAngle.toFixed(6)));
    const idx = list.findIndex(t => String(t?.type ?? "").toUpperCase() === "RT");
    if (idx >= 0) {
        list[idx] = { ...list[idx], raw: `MOD RT ${token}`, params: [token] };
        return list;
    }
    list.push({ type: "RT", raw: `MOD RT ${token}`, params: [token] });
    return list;
}

export function rotatePoint(p, angleDeg) {
    const r = angleDeg * Math.PI / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function mirrorPoint(p, A, B) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-12) return { x: p.x, y: p.y };
    const t = ((p.x - A.x) * dx + (p.y - A.y) * dy) / lenSq;
    const footX = A.x + t * dx;
    const footY = A.y + t * dy;
    return { x: 2 * footX - p.x, y: 2 * footY - p.y };
}

export function worldFromRaw(rawPoint, rtAngle) {
    if (Math.abs(rtAngle) < 1e-9) return { x: rawPoint.x, y: rawPoint.y };
    return rotatePoint(rawPoint, rtAngle);
}

export function rawFromWorld(worldPoint, rtAngle) {
    if (Math.abs(rtAngle) < 1e-9) return { x: worldPoint.x, y: worldPoint.y };
    return rotatePoint(worldPoint, -rtAngle);
}

export function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

export function axisAngleDeg(A, B) {
    return Math.atan2(B.y - A.y, B.x - A.x) * 180 / Math.PI;
}
