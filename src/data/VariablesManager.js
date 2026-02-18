/**
 * VariablesManager - manages bit variables and formulas
 * 
 * Default variables are hardcoded for each bit type.
 * Custom variables are stored per bit type in localStorage.
 */

const STORAGE_KEY = "bit_custom_variables_v1";

// Default variable definitions for each bit type
const DEFAULT_VARIABLES = {
    // Common variables for all bit types
    common: [
        { id: "d", name: "Diameter", varName: "d", defaultValue: 10, unit: "mm" },
        { id: "l", name: "Length", varName: "l", defaultValue: 20, unit: "mm" },
        { id: "sd", name: "Shank Diameter", varName: "sd", defaultValue: 6, unit: "mm" },
        { id: "tl", name: "Total Length", varName: "tl", defaultValue: 50, unit: "mm" },
        { id: "tn", name: "Tool Number", varName: "tn", defaultValue: 1, unit: "" },
    ],
    // Conical-specific variables
    conical: [
        { id: "a", name: "Angle", varName: "a", defaultValue: 90, unit: "°" },
    ],
    // Ball-specific variables
    ball: [
        { id: "h", name: "Height", varName: "h", defaultValue: 5, unit: "mm" },
    ],
    // Fillet/Bull-specific variables
    fillet: [
        { id: "h", name: "Height", varName: "h", defaultValue: 3, unit: "mm" },
        { id: "cr", name: "Corner Radius", varName: "cr", defaultValue: 3, unit: "mm" },
        { id: "f", name: "Flat", varName: "f", defaultValue: 0, unit: "mm" },
    ],
    bull: [
        { id: "h", name: "Height", varName: "h", defaultValue: 3, unit: "mm" },
        { id: "cr", name: "Corner Radius", varName: "cr", defaultValue: 3, unit: "mm" },
        { id: "f", name: "Flat", varName: "f", defaultValue: 4, unit: "mm" },
    ],
    // Profile-specific variables (custom profile bits)
    profile: [],
};

class VariablesManager {
    constructor() {
        this.customVariables = this.loadCustomVariables();
    }

    /**
     * Load custom variables from localStorage
     */
    loadCustomVariables() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn("Failed to load custom variables:", e);
        }
        return {};
    }

    /**
     * Save custom variables to localStorage
     */
    saveCustomVariables() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customVariables));
        } catch (e) {
            console.warn("Failed to save custom variables:", e);
        }
    }

    /**
     * Get all variables for a bit type (default + custom)
     * @param {string} bitType - The bit type (cylindrical, conical, ball, fillet, bull, profile)
     * @returns {Array} Array of variable definitions
     */
    getVariablesForType(bitType) {
        const common = DEFAULT_VARIABLES.common || [];
        const typeSpecific = DEFAULT_VARIABLES[bitType] || [];
        const custom = this.customVariables[bitType] || [];

        return [...common, ...typeSpecific, ...custom];
    }

    /**
     * Get default variables only (not custom)
     * @param {string} bitType - The bit type
     * @returns {Array} Array of default variable definitions
     */
    getDefaultVariables(bitType) {
        const common = DEFAULT_VARIABLES.common || [];
        const typeSpecific = DEFAULT_VARIABLES[bitType] || [];
        return [...common, ...typeSpecific];
    }

    /**
     * Get custom variables for a bit type
     * @param {string} bitType - The bit type
     * @returns {Array} Array of custom variable definitions
     */
    getCustomVariables(bitType) {
        return this.customVariables[bitType] || [];
    }

    /**
     * Add a custom variable to a bit type
     * @param {string} bitType - The bit type
     * @param {Object} variable - { name, varName, defaultValue, unit }
     * @returns {Object|null} The added variable or null if failed
     */
    addCustomVariable(bitType, variable) {
        if (!bitType || !variable || !variable.varName) {
            return null;
        }

        // Check if varName already exists
        const existing = this.getVariablesForType(bitType);
        if (existing.some(v => v.varName === variable.varName)) {
            console.warn(`Variable ${variable.varName} already exists for ${bitType}`);
            return null;
        }

        if (!this.customVariables[bitType]) {
            this.customVariables[bitType] = [];
        }

        const newVariable = {
            id: `custom_${Date.now()}`,
            name: variable.name,
            varName: variable.varName,
            defaultValue: variable.defaultValue || 0,
            unit: variable.unit || "",
            isCustom: true,
        };

        this.customVariables[bitType].push(newVariable);
        this.saveCustomVariables();

        return newVariable;
    }

    /**
     * Remove a custom variable from a bit type
     * @param {string} bitType - The bit type
     * @param {string} varId - The variable ID to remove
     * @returns {boolean} True if removed, false otherwise
     */
    removeCustomVariable(bitType, varId) {
        if (!this.customVariables[bitType]) {
            return false;
        }

        const index = this.customVariables[bitType].findIndex(v => v.id === varId);
        if (index === -1) {
            return false;
        }

        this.customVariables[bitType].splice(index, 1);
        this.saveCustomVariables();

        return true;
    }

    /**
     * Get available custom variables from all bit types (for suggestions)
     * Also includes type-specific variables from other bit types that don't exist in current type
     * @param {string} excludeType - Bit type to exclude
     * @returns {Array} Array of unique custom variable definitions
     */
    getAvailableCustomVariables(excludeType) {
        const allVars = [];
        const seenVarNames = new Set();
        
        // Get variables already in current type to exclude them
        const currentVars = this.getVariablesForType(excludeType);
        currentVars.forEach(v => seenVarNames.add(v.varName));

        // Add custom variables from other bit types
        Object.keys(this.customVariables).forEach(bitType => {
            if (bitType === excludeType) return;
            
            this.customVariables[bitType].forEach(v => {
                if (!seenVarNames.has(v.varName)) {
                    seenVarNames.add(v.varName);
                    allVars.push({ ...v, sourceType: bitType });
                }
            });
        });

        // Also add type-specific default variables from other types
        Object.keys(DEFAULT_VARIABLES).forEach(bitType => {
            if (bitType === excludeType || bitType === "common") return;
            
            DEFAULT_VARIABLES[bitType].forEach(v => {
                if (!seenVarNames.has(v.varName)) {
                    seenVarNames.add(v.varName);
                    allVars.push({ ...v, sourceType: bitType, isDefault: true });
                }
            });
        });

        return allVars;
    }

    /**
     * Evaluate a formula string using variable values
     * @param {string} formula - The formula string (e.g., "{d} / 2" or "10 + 5")
     * @param {Object} values - Object with variable values { d: 10, l: 20, ... }
     * @returns {number|string} The evaluated result or original string if invalid
     */
    evaluateFormula(formula, values = {}) {
        if (!formula || typeof formula !== "string") {
            return formula;
        }

        // Replace variable placeholders {varName} with values
        let expression = formula;
        const varPattern = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;
        
        expression = expression.replace(varPattern, (match, varName) => {
            const value = values[varName];
            if (value !== undefined && !isNaN(parseFloat(value))) {
                return parseFloat(value);
            }
            return match; // Keep original if variable not found
        });

        // Check if there are still unresolved variables
        if (varPattern.test(expression)) {
            return formula; // Return original if variables not resolved
        }

        // Evaluate the expression using math.js if available
        try {
            if (typeof math !== "undefined" && math.evaluate) {
                return math.evaluate(expression);
            } else {
                // Fallback: simple eval (not recommended for production)
                // Use Function constructor for slightly safer evaluation
                const result = new Function(`return ${expression}`)();
                return result;
            }
        } catch (e) {
            // If evaluation fails, try to extract numbers
            const numMatch = expression.match(/^[\d.]+$/);
            if (numMatch) {
                return parseFloat(numMatch[0]);
            }
            return formula;
        }
    }

    /**
     * Check if a string contains a formula (has variable placeholders)
     * @param {string} value - The value to check
     * @returns {boolean} True if contains formula
     */
    isFormula(value) {
        if (!value || typeof value !== "string") return false;
        return /\{[a-zA-Z][a-zA-Z0-9]*\}/.test(value);
    }

    /**
     * Get variable info by varName
     * @param {string} bitType - The bit type
     * @param {string} varName - The variable name
     * @returns {Object|null} Variable definition or null
     */
    getVariableByVarName(bitType, varName) {
        const vars = this.getVariablesForType(bitType);
        return vars.find(v => v.varName === varName) || null;
    }

    /**
     * Create a values object from form inputs
     * @param {string} bitType - The bit type
     * @param {Object} formData - Form data { diameter: 10, length: 20, ... }
     * @returns {Object} Values object with varNames as keys
     */
    createValuesObject(bitType, formData) {
        const vars = this.getVariablesForType(bitType);
        const values = {};

        vars.forEach(v => {
            // Map form field names to varNames
            const fieldMapping = {
                diameter: "d",
                length: "l",
                shankDiameter: "sd",
                totalLength: "tl",
                toolNumber: "tn",
                angle: "a",
                height: "h",
                cornerRadius: "cr",
                flat: "f",
            };

            const formKey = Object.keys(fieldMapping).find(k => fieldMapping[k] === v.varName);
            if (formKey && formData[formKey] !== undefined) {
                values[v.varName] = parseFloat(formData[formKey]) || 0;
            } else if (formData[v.varName] !== undefined) {
                values[v.varName] = parseFloat(formData[v.varName]) || 0;
            } else if (v.defaultValue !== undefined) {
                values[v.varName] = v.defaultValue;
            }
        });

        return values;
    }
}

// Export singleton instance
const variablesManager = new VariablesManager();
export default variablesManager;
export { VariablesManager, DEFAULT_VARIABLES };