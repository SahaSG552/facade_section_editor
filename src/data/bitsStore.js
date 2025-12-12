import defaultBits from "./defaultBits.js";

const STORAGE_KEY = "facade_bits_v1";
let bits = null;
const VALID_GROUPS = new Set(Object.keys(defaultBits));

function genId() {
    return (
        "b_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    );
}

async function load() {
    // First try to load from localStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const stored = JSON.parse(raw);
            bits = {};
            let hasNewGroups = false;
            Object.keys(defaultBits).forEach((groupName) => {
                if (stored[groupName]) {
                    bits[groupName] = stored[groupName];
                } else {
                    bits[groupName] = defaultBits[groupName].map((b) => ({
                        id: b.id || genId(),
                        ...b,
                    }));
                    hasNewGroups = true;
                }
            });
            if (hasNewGroups) save();
            return;
        } catch (e) {
            console.warn(
                "Failed to parse bits from storage, fallback to defaults.",
                e
            );
        }
    }

    // If no localStorage data, try to load from userBits.json
    try {
        const response = await fetch("./src/data/userBits.json");
        if (response.ok) {
            const userBits = await response.json();
            bits = {};
            Object.keys(defaultBits).forEach((groupName) => {
                if (userBits[groupName] && Array.isArray(userBits[groupName])) {
                    bits[groupName] = userBits[groupName].map((b) => ({
                        id: b.id || genId(),
                        ...b,
                    }));
                } else {
                    bits[groupName] = defaultBits[groupName].map((b) => ({
                        id: b.id || genId(),
                        ...b,
                    }));
                }
            });
            save(); // Save to localStorage for faster subsequent loads
            return;
        }
    } catch (e) {
        console.warn("Failed to load from userBits.json, using defaults.", e);
    }

    // Deep clone defaults and ensure ids
    bits = JSON.parse(JSON.stringify(defaultBits));
    Object.keys(bits).forEach((group) => {
        bits[group] = bits[group].map((b) => ({ id: b.id || genId(), ...b }));
    });
    save();
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bits));
}

let initialized = false;
let initPromise = null;

async function ensureInitialized() {
    if (!initialized) {
        if (!initPromise) {
            initPromise = load();
        }
        await initPromise;
        initialized = true;
    }
}

export async function getBits() {
    await ensureInitialized();
    // Return a reference (mutations via API will persist)
    return bits;
}

export function setBits(newBits) {
    bits = {};
    Object.keys(defaultBits).forEach((groupName) => {
        bits[groupName] =
            newBits[groupName] ||
            defaultBits[groupName].map((b) => ({
                id: b.id || genId(),
                ...b,
            }));
    });
    save();
}

export function addBit(groupName, bitData) {
    if (!bits) load();
    if (!VALID_GROUPS.has(groupName)) return null;
    const newBit = { id: genId(), ...bitData };
    if (!Array.isArray(bits[groupName])) bits[groupName] = [];
    bits[groupName].push(newBit);
    save();
    return newBit;
}

export function updateBit(groupName, id, patch) {
    if (!bits) load();
    if (!VALID_GROUPS.has(groupName)) return null;
    const idx = bits[groupName].findIndex((b) => b.id === id);
    if (idx === -1) return null;
    bits[groupName][idx] = { ...bits[groupName][idx], ...patch };
    save();
    return bits[groupName][idx];
}

export function deleteBit(groupName, id) {
    if (!bits) load();
    if (!VALID_GROUPS.has(groupName)) return;
    bits[groupName] = bits[groupName].filter((b) => b.id !== id);
    save();
}

export function resetToDefaults() {
    bits = null;
    load();
    save();
}

// Export bits data to JSON file
export function exportToJSON() {
    if (!bits) return null;

    const dataStr = JSON.stringify(bits, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = "userBits.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return dataBlob;
}

// Import bits data from JSON file
export function importFromJSON(jsonData) {
    try {
        const importedBits = JSON.parse(jsonData);
        // Validate structure
        const validGroups = Object.keys(defaultBits);
        const isValid = validGroups.every((group) =>
            Array.isArray(importedBits[group])
        );

        if (!isValid) {
            throw new Error("Invalid JSON structure");
        }

        // Set imported data
        bits = {};
        validGroups.forEach((groupName) => {
            bits[groupName] = (importedBits[groupName] || []).map((b) => ({
                id: b.id || genId(),
                ...b,
            }));
        });

        save();
        return true;
    } catch (e) {
        console.error("Failed to import JSON:", e);
        return false;
    }
}
