import { afterEach, describe, expect, it, vi } from "vitest";

import PathEditor from "../src/panel/PathEditor.js";

function createEditor(options = {}) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return new PathEditor({ container, ...options });
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("PathEditor Add element fallback", () => {
    it("creates shape locally when external onShapeElementChange is not provided", () => {
        const onChange = vi.fn();
        const editor = createEditor({ onChange });

        editor._renderSuggestions();

        const circleBtn = editor.suggestionsEl.querySelector('.elem-btn[data-elem="circle"]');
        expect(circleBtn).not.toBeNull();

        circleBtn.click();

        const snapshot = editor.getElementsDebugSnapshot();
        expect(snapshot).toHaveLength(1);
        expect(snapshot[0].type).toBe("circle");
        expect(String(snapshot[0].segId || "")).toMatch(/^seg-\d+$/);
        expect(onChange).toHaveBeenCalled();
    });
});
