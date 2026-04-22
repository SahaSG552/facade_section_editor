import { afterEach, describe, expect, it, vi } from "vitest";

import EditorToolbar from "../src/editor/EditorToolbar.js";
import PathEditor from "../src/panel/PathEditor.js";
import { getShortcutKeyId, matchesShortcut } from "../src/editor/keyboardShortcuts.js";

function createContainer() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return container;
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("layout-independent keyboard shortcuts", () => {
    it("normalizes physical letter keys using KeyboardEvent.code", () => {
        const event = new KeyboardEvent("keydown", { key: "ь", code: "KeyM" });

        expect(getShortcutKeyId(event)).toBe("m");
        expect(matchesShortcut(event, "m")).toBe(true);
    });

    it("switches toolbar tool by physical key regardless of active layout", () => {
        const onToolChange = vi.fn();
        const toolbar = new EditorToolbar(createContainer(), { onToolChange });
        toolbar.mount();

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ь", code: "KeyM", bubbles: true }));

        expect(onToolChange).toHaveBeenCalledWith("move");
        toolbar.unmount();
    });

    it("handles clipboard shortcuts in PathEditor by physical key", () => {
        const editor = new PathEditor({ container: createContainer() });
        editor._hasClipboardSelection = vi.fn(() => true);
        editor._copySelectionToClipboard = vi.fn();

        const preventDefault = vi.fn();
        const stopPropagation = vi.fn();

        editor._handleClipboardKeydown({
            key: "с",
            code: "KeyC",
            ctrlKey: true,
            metaKey: false,
            preventDefault,
            stopPropagation,
        });

        expect(editor._copySelectionToClipboard).toHaveBeenCalledTimes(1);
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });
});