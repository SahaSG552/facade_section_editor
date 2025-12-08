import defaultBits from "../data/defaultBits.js";

const STORAGE_KEY = "facade_bits_v1";
let bits = null;

function genId() {
    return (
        "b_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    );
}

function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            bits = JSON.parse(raw);
            // Merge with defaults to add any missing groups
            let hasNewGroups = false;
            Object.keys(defaultBits).forEach((groupName) => {
                if (!bits[groupName]) {
                    bits[groupName] = defaultBits[groupName].map((b) => ({
                        id: b.id || genId(),
                        ...b,
                    }));
                    hasNewGroups = true;
                }
            });
            if (hasNewGroups) {
                save();
            }
            return;
        } catch (e) {
            console.warn(
                "Failed to parse bits from storage, fallback to defaults.",
                e
            );
        }
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

export function getBits() {
    if (!bits) load();
    // Return a reference (mutations via API will persist)
    return bits;
}

export function setBits(newBits) {
    bits = newBits;
    save();
}

export function addBit(groupName, bitData) {
    if (!bits) load();
    const newBit = { id: genId(), ...bitData };
    if (!Array.isArray(bits[groupName])) bits[groupName] = [];
    bits[groupName].push(newBit);
    save();
    return newBit;
}

export function updateBit(groupName, id, patch) {
    if (!bits) load();
    const idx = bits[groupName].findIndex((b) => b.id === id);
    if (idx === -1) return null;
    bits[groupName][idx] = { ...bits[groupName][idx], ...patch };
    save();
    return bits[groupName][idx];
}

export function deleteBit(groupName, id) {
    if (!bits) load();
    bits[groupName] = bits[groupName].filter((b) => b.id !== id);
    save();
}

export function resetToDefaults() {
    bits = null;
    load();
    save();
}
