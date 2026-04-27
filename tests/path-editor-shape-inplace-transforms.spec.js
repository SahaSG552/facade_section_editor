import { afterEach, describe, expect, it } from "vitest";

import PathEditor from "../src/panel/PathEditor.js";

afterEach(() => {
    document.body.innerHTML = "";
});

describe("PathEditor shape in-place transforms", () => {
    it("keeps shape modifiers when rect data is updated in place", () => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        const editor = new PathEditor({ container });

        editor.setElements([
            {
                type: "rect",
                segId: "seg-rect-1",
                data: { x: 10, y: 10, w: 30, h: 20, dirW: 1, dirH: -1, rx: 0 },
                transforms: [{ type: "RT", raw: "MOD RT 45", params: ["45"] }],
            },
        ]);

        const ok = editor.updateShapeRowsInPlace([
            {
                type: "rect",
                segId: "seg-rect-1",
                data: { x: 10, y: 10, w: 42, h: 20, dirW: 1, dirH: -1, rx: 4 },
                transforms: [{ type: "RT", raw: "MOD RT 45", params: ["45"] }],
            },
        ]);

        expect(ok).toBe(true);

        const snapshot = editor.getElementTransformsSnapshot();
        expect(snapshot).toHaveLength(1);
        expect(snapshot[0].kind).toBe("shape");
        expect(snapshot[0].segId).toBe("seg-rect-1");
        expect(snapshot[0].transforms).toHaveLength(1);
        expect(snapshot[0].transforms[0].type).toBe("RT");
        expect(snapshot[0].transforms[0].params?.[0]).toBe("45");
    });
});
