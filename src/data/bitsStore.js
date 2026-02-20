import defaultBits from "./defaultBits.js";
import variablesManager from "./VariablesManager.js";

const STORAGE_KEY = "facade_bits_v1";
let bits = null;
const VALID_GROUPS = new Set(Object.keys(defaultBits));

// Helper to get group data from defaultBits
function getGroupData(groupName) {
    const group = defaultBits[groupName];
    if (group && typeof group === "object" && group.bits) {
        return { operations: group.operations || [], bits: group.bits };
    }
    // Backward compatibility for old structure
    return { operations: ["AL"], bits: group || [] };
}

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
                    bits[groupName] = getGroupData(groupName).bits.map((b) => ({
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
                    bits[groupName] = getGroupData(groupName).bits.map((b) => ({
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
    bits = {};
    Object.keys(defaultBits).forEach((groupName) => {
        bits[groupName] = getGroupData(groupName).bits.map((b) => ({
            id: b.id || genId(),
            ...b,
        }));
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
            getGroupData(groupName).bits.map((b) => ({
                id: b.id || genId(),
                ...b,
            }));
    });
    save();
}

// Get operations for a group
export function getOperationsForGroup(groupName) {
    if (!VALID_GROUPS.has(groupName)) return [];
    return getGroupData(groupName).operations;
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

// Export bits data to JSON file (includes custom variables)
export function exportToJSON() {
    if (!bits) return null;

    // Include custom variables in export
    const exportData = {
        bits: bits,
        customVariables: variablesManager.customVariables || {},
        exportVersion: 1
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = "userBits.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return dataBlob;
}

// Import bits data from JSON file (includes custom variables)
export function importFromJSON(jsonData) {
    try {
        const parsed = JSON.parse(jsonData);
        const validGroups = Object.keys(defaultBits);
        
        // Check if new format with bits and customVariables
        let importedBits;
        let importedCustomVars = null;
        
        if (parsed.bits && typeof parsed.bits === "object") {
            // New format: { bits: {...}, customVariables: {...}, exportVersion: 1 }
            importedBits = parsed.bits;
            importedCustomVars = parsed.customVariables || null;
        } else {
            // Old format: just the bits object { cylindrical: [...], ... }
            importedBits = parsed;
        }
        
        // Validate bits structure
        const isValid = validGroups.every((group) =>
            Array.isArray(importedBits[group])
        );

        if (!isValid) {
            throw new Error("Invalid JSON structure");
        }

        // Set imported bits data
        bits = {};
        validGroups.forEach((groupName) => {
            bits[groupName] = (importedBits[groupName] || []).map((b) => ({
                id: b.id || genId(),
                ...b,
            }));
        });
        save();

        // Import custom variables if present
        if (importedCustomVars) {
            variablesManager.importCustomVariables(importedCustomVars);
        }

        return true;
    } catch (e) {
        console.error("Failed to import JSON:", e);
        return false;
    }
}
