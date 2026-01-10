/**
 * BitRegistry - Centralized Bit State Management
 * Encapsulates all bit-related state: bitsOnCanvas array, selection, counter
 * Provides safe API for adding, removing, selecting bits
 * Replaces direct array mutations and global bitCounter
 */

export class BitRegistry {
    constructor() {
        // Array of bit objects on canvas
        // Each bit: { id, number, name, x, y, alignment, operation, color, group, baseAbsX, baseAbsY, bitData, groupName }
        this.bits = [];

        // Auto-incrementing bit ID counter
        this.counter = 0;

        // Set of selected bit indices
        this.selectedIndices = new Set();

        // Change listeners for reactive updates
        this.listeners = {
            onBitAdded: [],
            onBitRemoved: [],
            onBitUpdated: [],
            onSelectionChanged: [],
            onBitsCleared: [],
        };
    }

    /**
     * Add new bit to registry
     * @param {Object} bitData - Bit definition from library
     * @param {Object} position - {x, y} position on canvas
     * @param {Object} additional - Additional properties (alignment, operation, color, group, baseAbsX, baseAbsY, groupName)
     * @returns {Object} The created bit object with id and number
     */
    addBit(bitData, position, additional = {}) {
        const bitId = ++this.counter;
        const bit = {
            id: bitId,
            number: this.bits.length + 1,
            name: bitData.name,
            x: position.x,
            y: position.y,
            alignment: additional.alignment || "center",
            operation: additional.operation || "AL",
            color: additional.color || bitData.fillColor || "#cccccc",
            group: additional.group || null,
            baseAbsX: additional.baseAbsX || 0,
            baseAbsY: additional.baseAbsY || 0,
            bitData: bitData,
            groupName: additional.groupName || null,
        };

        this.bits.push(bit);
        this._notifyListeners("onBitAdded", bit);
        return bit;
    }

    /**
     * Remove bit by index
     * @param {number} index - Index in bits array
     * @returns {Object|null} Removed bit or null if not found
     */
    removeBit(index) {
        if (index < 0 || index >= this.bits.length) return null;

        const removedBit = this.bits[index];
        this.bits.splice(index, 1);

        // Update numbers
        this.bits.forEach((bit, idx) => {
            bit.number = idx + 1;
        });

        // Remove from selection if selected
        this.selectedIndices.delete(index);
        // Adjust remaining selections
        const newSelected = new Set();
        this.selectedIndices.forEach((idx) => {
            if (idx > index) newSelected.add(idx - 1);
            else if (idx < index) newSelected.add(idx);
        });
        this.selectedIndices = newSelected;

        this._notifyListeners("onBitRemoved", removedBit);
        return removedBit;
    }

    /**
     * Update bit properties
     * @param {number} index - Bit index
     * @param {Object} updates - Properties to update
     * @returns {Object|null} Updated bit or null if not found
     */
    updateBit(index, updates) {
        if (index < 0 || index >= this.bits.length) return null;

        const bit = this.bits[index];
        Object.assign(bit, updates);

        this._notifyListeners("onBitUpdated", bit);
        return bit;
    }

    /**
     * Get bit by index
     * @param {number} index
     * @returns {Object|null}
     */
    getBit(index) {
        return this.bits[index] || null;
    }

    /**
     * Get all bits (returns copy of array)
     * @returns {Array}
     */
    getAllBits() {
        return [...this.bits];
    }

    /**
     * Clear all bits
     */
    clearAll() {
        const count = this.bits.length;
        this.bits = [];
        this.selectedIndices.clear();
        this.counter = 0;

        this._notifyListeners("onBitsCleared", { count });
    }

    /**
     * Get count of bits
     * @returns {number}
     */
    getCount() {
        return this.bits.length;
    }

    /**
     * Check if bit exists at index
     * @param {number} index
     * @returns {boolean}
     */
    hasBit(index) {
        return index >= 0 && index < this.bits.length;
    }

    /**
     * Get bit by ID
     * @param {number} bitId
     * @returns {Object|null}
     */
    getBitById(bitId) {
        return this.bits.find((bit) => bit.id === bitId) || null;
    }

    /**
     * Get index of bit by ID
     * @param {number} bitId
     * @returns {number} Index or -1 if not found
     */
    getIndexById(bitId) {
        return this.bits.findIndex((bit) => bit.id === bitId);
    }

    /**
     * Selection management - toggle selection
     * @param {number} index
     */
    toggleSelection(index) {
        if (this.selectedIndices.has(index)) {
            this.selectedIndices.delete(index);
        } else {
            this.selectedIndices.add(index);
        }
        this._notifyListeners("onSelectionChanged", {
            selectedIndices: Array.from(this.selectedIndices),
        });
    }

    /**
     * Set selection to specific indices (replace current selection)
     * @param {number|Array} indices - Single index or array of indices
     */
    setSelection(indices) {
        const normalized = Array.isArray(indices) ? indices : [indices];
        this.selectedIndices.clear();
        normalized.forEach((idx) => this.selectedIndices.add(idx));
        this._notifyListeners("onSelectionChanged", {
            selectedIndices: Array.from(this.selectedIndices),
        });
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedIndices.clear();
        this._notifyListeners("onSelectionChanged", { selectedIndices: [] });
    }

    /**
     * Get array of selected indices
     * @returns {Array}
     */
    getSelectedIndices() {
        return Array.from(this.selectedIndices).sort((a, b) => a - b);
    }

    /**
     * Get selected bits
     * @returns {Array}
     */
    getSelectedBits() {
        return this.getSelectedIndices().map((idx) => this.bits[idx]);
    }

    /**
     * Check if index is selected
     * @param {number} index
     * @returns {boolean}
     */
    isSelected(index) {
        return this.selectedIndices.has(index);
    }

    /**
     * Get selection count
     * @returns {number}
     */
    getSelectionCount() {
        return this.selectedIndices.size;
    }

    /**
     * Reorder bits - move bit from srcIndex to destIndex
     * @param {number} srcIndex
     * @param {number} destIndex
     */
    reorderBits(srcIndex, destIndex) {
        if (srcIndex === destIndex) return;

        const [removed] = this.bits.splice(srcIndex, 1);
        this.bits.splice(destIndex, 0, removed);

        // Update numbers
        this.bits.forEach((bit, idx) => {
            bit.number = idx + 1;
        });

        // Handle selection - adjust selected indices
        const oldSelected = this.getSelectedIndices();
        this.selectedIndices.clear();

        oldSelected.forEach((idx) => {
            if (idx === srcIndex) {
                this.selectedIndices.add(destIndex);
            } else if (srcIndex < destIndex) {
                // Moving down
                if (idx > srcIndex && idx <= destIndex) {
                    this.selectedIndices.add(idx - 1);
                } else {
                    this.selectedIndices.add(idx);
                }
            } else {
                // Moving up
                if (idx < srcIndex && idx >= destIndex) {
                    this.selectedIndices.add(idx + 1);
                } else {
                    this.selectedIndices.add(idx);
                }
            }
        });

        this._notifyListeners("onSelectionChanged", {
            selectedIndices: this.getSelectedIndices(),
        });
    }

    /**
     * Event listener management
     */
    addEventListener(eventName, callback) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].push(callback);
        }
    }

    removeEventListener(eventName, callback) {
        if (this.listeners[eventName]) {
            this.listeners[eventName] = this.listeners[eventName].filter(
                (cb) => cb !== callback
            );
        }
    }

    _notifyListeners(eventName, data) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${eventName} listener:`, error);
                }
            });
        }
    }

    /**
     * Get registry state for debugging/logging
     */
    getDebugInfo() {
        return {
            count: this.bits.length,
            counter: this.counter,
            selectedCount: this.selectedIndices.size,
            selectedIndices: this.getSelectedIndices(),
            bits: this.bits.map((bit) => ({
                id: bit.id,
                number: bit.number,
                name: bit.name,
                position: { x: bit.x, y: bit.y },
            })),
        };
    }
}

// Export singleton instance
export const bitRegistry = new BitRegistry();
