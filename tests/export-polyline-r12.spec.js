import { describe, it, expect } from "vitest";
import ExportModule from "../src/export/ExportModule.js";

function pairMap(lines) {
    const out = [];
    for (let i = 0; i < lines.length; i += 2) {
        out.push([lines[i], lines[i + 1]]);
    }
    return out;
}

describe("DXF R12 POLYLINE writer", () => {
    it("writes closed polyline with arc bulges using POLYLINE/VERTEX/SEQEND", () => {
        const exporter = new ExportModule().dxfExporter;
        exporter.dxfContent = [];

        const vertices = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
        ];
        const bulges = [0.414213562, 0, 0];

        exporter.writePolyline_R12(vertices, bulges, "CUT", true);

        const content = exporter.dxfContent;
        expect(content).toContain("POLYLINE");
        expect(content).toContain("VERTEX");
        expect(content).toContain("SEQEND");
        expect(content).not.toContain("LWPOLYLINE");

        const joined = content.join("\n");
        expect(joined).toContain("\n66\n1\n");
        expect(joined).toContain("\n70\n1\n");
        expect(joined).toContain("\n42\n0.414213562\n");
        expect(content.filter((x) => x === "VERTEX")).toHaveLength(3);
    });

    it("writes closed polyline with only lines and no bulges", () => {
        const exporter = new ExportModule().dxfExporter;
        exporter.dxfContent = [];

        const vertices = [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 20, y: 20 },
            { x: 0, y: 20 },
        ];
        const bulges = [0, 0, 0, 0];

        exporter.writePolyline_R12(vertices, bulges, "LINES", true);

        const content = exporter.dxfContent;
        const joined = content.join("\n");

        expect(joined).toContain("\n70\n1\n");
        expect(content.filter((x) => x === "VERTEX")).toHaveLength(4);
        expect(content.filter((x) => x === "42")).toHaveLength(0);
        expect(content).not.toContain("LWPOLYLINE");
    });

    it("writes open polyline through segment collection and sets flag 70=0", () => {
        const exporter = new ExportModule().dxfExporter;
        exporter.dxfContent = [];

        const segments = [
            {
                type: "line",
                start: { x: 0, y: 0 },
                end: { x: 10, y: 0 },
            },
            {
                type: "arc",
                start: { x: 10, y: 0 },
                end: { x: 20, y: 10 },
                arc: {
                    centerX: 10,
                    centerY: 10,
                    radius: 10,
                    startAngle: 270,
                    endAngle: 0,
                    sweepFlag: 0,
                },
            },
            {
                type: "line",
                start: { x: 20, y: 10 },
                end: { x: 30, y: 10 },
            },
        ];

        exporter.writePolylineWithBulge(segments, "OPEN");

        const content = exporter.dxfContent;
        const joined = content.join("\n");
        const expectedBulge = exporter.calculateBulge(segments[1].arc).toString();

        expect(content).toContain("POLYLINE");
        expect(content).toContain("SEQEND");
        expect(content).not.toContain("LWPOLYLINE");
        expect(joined).toContain("\n70\n0\n");
        expect(joined).toContain(`\n42\n${expectedBulge}\n`);

        const pairs = pairMap(content);
        const hasVertexZ0 = pairs.some(
            ([code, value], idx) =>
                code === "30" &&
                value === "0" &&
                idx > 0 &&
                pairs[idx - 1][0] === "20"
        );
        expect(hasVertexZ0).toBe(true);
    });
});
