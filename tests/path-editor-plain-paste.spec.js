import { afterEach, describe, expect, it, vi } from "vitest";

import PathEditor from "../src/panel/PathEditor.js";

function createEditor(variableValues = {}) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return new PathEditor({ container, variableValues });
}

function makeFormulaPath() {
    return {
        type: "path",
        contourId: 1,
        segIds: ["line-1", "line-2"],
        lines: [
            { text: "M 10 20", segId: "line-1", lineGuid: "line-guid-1" },
            { text: "L {w} {h}/2", segId: "line-2", lineGuid: "line-guid-2" },
        ],
        transforms: [],
        groupId: null,
        parentGroupId: null,
    };
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("PathEditor plain clipboard payload", () => {
    it("stores both formula and plain variants at copy time", () => {
        const editor = createEditor({ w: 100, h: 80 });
        const payload = editor._buildClipboardPayload([makeFormulaPath()]);

        expect(payload.elements[0].lines[1].text).toBe("L {w} {h}/2");
        expect(payload.plainElements[0].lines[1].text).toBe("L 100 40");
        expect(payload.bounds).not.toBeNull();
        expect(payload.plainBounds).not.toBeNull();
    });

    it("plain paste uses source-window values instead of destination variables", async () => {
        const sourceEditor = createEditor({ w: 100, h: 80 });
        const payload = sourceEditor._buildClipboardPayload([makeFormulaPath()]);

        const destinationEditor = createEditor({ w: 250, h: 20 });
        const inserted = [];
        destinationEditor._insertClipboardElements = vi.fn((elements) => inserted.push(...elements));

        const result = await destinationEditor._pasteClipboardPayload({
            plain: true,
            clipboardEvent: {
                clipboardData: {
                    getData: () => JSON.stringify(payload),
                },
            },
        });

        expect(result.ok).toBe(true);
        expect(inserted).toHaveLength(1);
        expect(inserted[0].lines[1].text).toBe("L 100 40");
        expect(inserted[0].lines[1].text).not.toBe("L 250 10");
    });
});