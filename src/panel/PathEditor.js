/**
 * PathEditor - SVG Path Editor with table-based row editing
 * 
 * Key design principles:
 * - Each line is displayed as a flex row with individual cells per argument
 * - First cell = SVG command (clickable to change)
 * - Remaining cells = individual parameters (clickable to edit)
 * - Formulas/variables preserved in storage, evaluated for output
 * - Autocomplete suggestions for commands and variables
 * 
 * @module PathEditor
 */

import { evaluateMathExpression } from "../utils/utils.js";

/**
 * Valid SVG path commands with their argument counts and labels
 * @constant {Object.<string, {args: string[], label: string}>}
 */
const SVG_COMMAND_DEFS = {
    'M': { args: ['x', 'y'], label: 'Move to' },
    'L': { args: ['x', 'y'], label: 'Line to' },
    'H': { args: ['x'], label: 'Horizontal line' },
    'V': { args: ['y'], label: 'Vertical line' },
    'C': { args: ['x1', 'y1', 'x2', 'y2', 'x', 'y'], label: 'Cubic bezier' },
    'S': { args: ['x2', 'y2', 'x', 'y'], label: 'Smooth cubic bezier' },
    'Q': { args: ['x1', 'y1', 'x', 'y'], label: 'Quadratic bezier' },
    'T': { args: ['x', 'y'], label: 'Smooth quadratic bezier' },
    'A': { args: ['rx', 'ry', 'angle', 'large', 'sweep', 'x', 'y'], label: 'Arc' },
    'Z': { args: [], label: 'Close path' },
};

/** Set of valid SVG path commands (both uppercase and lowercase) */
const SVG_COMMANDS = new Set([...Object.keys(SVG_COMMAND_DEFS), ...Object.keys(SVG_COMMAND_DEFS).map(c => c.toLowerCase())]);

/**
 * SVG Path Editor with table-based row editing
 * 
 * @example
 * const editor = new PathEditor({
 *   container: document.getElementById('path-container'),
 *   hiddenInput: document.getElementById('evaluated-path'),
 *   rawHiddenInput: document.getElementById('raw-path'),
 *   onChange: (path) => console.log('Path changed:', path),
 *   variableValues: { w: 100, h: 50 }
 * });
 * 
 * editor.setPath('M 0 0 L {w} 0 L {w} {h} L 0 {h} Z');
 */
export default class PathEditor {
    /**
     * Create a new PathEditor instance
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element to render the editor
     * @param {HTMLInputElement} [options.hiddenInput] - Hidden input for evaluated path
     * @param {HTMLInputElement} [options.rawHiddenInput] - Hidden input for raw path with variables
     * @param {Function} [options.onChange] - Callback when path changes, receives evaluated path
     * @param {Object} [options.variableValues] - Variable name -> value mapping
     * @param {Function} [options.getVariableList] - Function to get available variables
     */
    constructor(options = {}) {
        this.container = options.container;
        this.hiddenInput = options.hiddenInput;
        this.rawHiddenInput = options.rawHiddenInput;
        this.onChange = options.onChange || (() => {});
        this.variableValues = options.variableValues || {};
        this.getVariableList = options.getVariableList || (() => []);
        
        /** @type {HTMLElement|null} Main editor element */
        this.element = null;
        /** @type {Array<{id: number, text: string, element: HTMLElement|null}>} */
        this.lines = [];
        /** @type {Object|null} Currently dragged line data */
        this.draggedLine = null;
        
        /** @type {Object|null} Currently edited line data */
        this.activeEditLineData = null;
        /** @type {string|null} Type of active edit ('cmd' or 'param') */
        this.activeEditType = null;
        /** @type {number|null} Index of actively edited parameter */
        this.activeEditArgIndex = null;
        /** @type {HTMLInputElement|null} Reference to active inline input */
        this.activeEditInput = null;
        
        this.init();
    }
    
    /**
     * Initialize the editor DOM structure
     * @private
     */
    init() {
        this.element = document.createElement('div');
        this.element.className = 'path-editor-container';
        this.element.innerHTML = `
            <div class="path-editor-lines"></div>
            <div class="path-editor-input-area">
                <div class="path-editor-input-row">
                    <input type="text" class="path-editor-input" placeholder="Type command (M, L, H, V, C, S, Q, T, A, Z) or click suggestions below...">
                    <button type="button" class="path-editor-add-btn" title="Add line">+</button>
                </div>
                <div class="path-editor-suggestions"></div>
            </div>
        `;
        
        this.container.appendChild(this.element);
        
        this.linesContainer = this.element.querySelector('.path-editor-lines');
        this.input = this.element.querySelector('.path-editor-input');
        this.addBtn = this.element.querySelector('.path-editor-add-btn');
        this.suggestionsEl = this.element.querySelector('.path-editor-suggestions');
        
        this.bindEvents();
        this.renderSuggestions();
    }
    
    /**
     * Bind event listeners to input elements
     * @private
     */
    bindEvents() {
        this.input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                this.tryAddLine();
            }
        });
        
        this.input.addEventListener('input', () => {
            this.renderSuggestions();
        });
        
        this.addBtn.addEventListener('click', () => {
            this.tryAddLine();
        });
        
        this.input.addEventListener('paste', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const text = e.clipboardData.getData('text/plain');
            const lines = text.split(/[\n\r]+/).filter(l => l.trim());
            lines.forEach(line => this.addLine(line.trim()));
        });
    }
    
    /**
     * Attempt to add a line from the input field
     * @private
     */
    tryAddLine() {
        const text = this.input.value.trim();
        if (text) {
            if (this.addLine(text)) {
                this.input.value = '';
                this.renderSuggestions();
            }
        }
    }
    
    /**
     * Render command/variable suggestions below input
     * @private
     */
    renderSuggestions() {
        const inputVal = this.input.value.trim().toUpperCase();
        const parts = this.splitBySpaces(this.input.value.trim());
        const hasCmd = parts.length > 0 && parts[0].length === 1 && SVG_COMMANDS.has(parts[0]);
        
        let html = '';
        
        if (!hasCmd) {
            // Show command suggestions
            html += '<div class="path-suggestions-group">';
            html += '<span class="path-suggestions-label">Commands:</span>';
            Object.entries(SVG_COMMAND_DEFS).forEach(([cmd, def]) => {
                const active = inputVal === cmd ? ' active' : '';
                html += `<button type="button" class="path-suggestion-btn cmd-btn${active}" data-cmd="${cmd}" title="${def.label}">${cmd}</button>`;
            });
            html += '</div>';
        } else {
            // Show variable suggestions for the current argument position
            const cmd = parts[0].toUpperCase();
            const def = SVG_COMMAND_DEFS[cmd];
            if (def && def.args.length > 0) {
                const argIndex = parts.length - 1;
                const argLabel = def.args[argIndex - 1] || def.args[def.args.length - 1];
                
                // Show remaining args hint
                const remainingArgs = def.args.slice(parts.length - 1);
                if (remainingArgs.length > 0) {
                    html += '<div class="path-suggestions-group">';
                    html += `<span class="path-suggestions-label">Next: <em>${remainingArgs[0]}</em></span>`;
                    html += '</div>';
                }
                
                // Show variable suggestions
                const vars = this.getAvailableVariables();
                if (vars.length > 0) {
                    html += '<div class="path-suggestions-group">';
                    html += '<span class="path-suggestions-label">Variables:</span>';
                    vars.forEach(v => {
                        const val = this.variableValues[v.varName];
                        const valStr = val !== undefined ? ` = ${val}` : '';
                        html += `<button type="button" class="path-suggestion-btn var-btn" data-var="${v.varName}" title="${v.name}${valStr}">{${v.varName}}</button>`;
                    });
                    html += '</div>';
                }
            }
        }
        
        this.suggestionsEl.innerHTML = html;
        this.bindSuggestionEvents();
    }
    
    /**
     * Bind click events to suggestion buttons
     * @private
     */
    bindSuggestionEvents() {
        // Command buttons
        this.suggestionsEl.querySelectorAll('.cmd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cmd = btn.dataset.cmd;
                this.input.value = cmd + ' ';
                this.input.focus();
                this.renderSuggestions();
            });
        });
        
        // Variable buttons
        this.suggestionsEl.querySelectorAll('.var-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const varName = btn.dataset.var;
                const current = this.input.value;
                this.input.value = current.endsWith(' ') || current === '' 
                    ? current + `{${varName}}` 
                    : current + ` {${varName}}`;
                this.input.focus();
                this.renderSuggestions();
            });
        });
    }
    
    /**
     * Get available variables for suggestions
     * @returns {Array<{varName: string, name: string, value: *}>}
     * @private
     */
    getAvailableVariables() {
        const vars = [];
        const seen = new Set();
        
        Object.keys(this.variableValues).forEach(varName => {
            if (!seen.has(varName)) {
                seen.add(varName);
                vars.push({ varName, name: varName, value: this.variableValues[varName] });
            }
        });
        
        return vars;
    }
    
    /**
     * Set variable values for evaluation (does NOT modify stored text)
     * @param {Object} values - Variable name -> value mapping
     */
    setVariableValues(values) {
        this.variableValues = values || {};
        this.lines.forEach(line => this.rerenderLine(line));
        this.updateHiddenInput();
        this.onChange(this.getEvaluatedPath());
        this.renderSuggestions();
    }
    
    /**
     * Parse a line into command + parameter tokens
     * @param {string} text - Line text to parse
     * @returns {Object|null} Parsed line object or null if invalid
     * @private
     */
    parseLine(text) {
        if (!text || !text.trim()) return null;
        
        const trimmed = text.trim();
        const parts = this.splitBySpaces(trimmed);
        
        if (parts.length === 0) return null;
        
        const firstPart = parts[0];
        if (firstPart.length === 1 && SVG_COMMANDS.has(firstPart)) {
            const cmd = firstPart.toUpperCase();
            return {
                cmd: firstPart,
                cmdUpper: cmd,
                params: parts.slice(1),
                def: SVG_COMMAND_DEFS[cmd] || { args: [], label: '' }
            };
        }
        
        return null;
    }
    
    /**
     * Split string by spaces, keeping {varName} blocks together
     * @param {string} text - Text to split
     * @returns {string[]} Array of parts
     * @private
     */
    splitBySpaces(text) {
        const parts = [];
        let current = '';
        let braceDepth = 0;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '{') { braceDepth++; current += char; }
            else if (char === '}') { braceDepth--; current += char; }
            else if (char === ' ' && braceDepth === 0) {
                if (current.trim()) parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        if (current.trim()) parts.push(current.trim());
        return parts;
    }
    
    /**
     * Evaluate a single parameter token (replace variables, compute math)
     * @param {string} token - Token to evaluate
     * @returns {string} Evaluated value as string
     * @private
     */
    evaluateToken(token) {
        if (!token || !token.trim()) return '0';
        
        let expr = token.trim();
        
        // Replace variable references {varName}
        expr = expr.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, varName) => {
            const value = this.variableValues[varName];
            return value !== undefined && !isNaN(Number(value)) ? String(value) : '0';
        });
        
        // Simple number check
        const num = parseFloat(expr);
        if (!isNaN(num) && isFinite(num)) {
            if (expr.trim().replace(/\s/g, '') === String(num)) return String(num);
        }
        
        // Math expression
        try {
            const result = evaluateMathExpression(expr);
            if (result !== null && result !== undefined && !isNaN(Number(result)) && isFinite(Number(result))) {
                return String(Math.round(Number(result) * 1000000) / 1000000);
            }
        } catch (e) { /* ignore */ }
        
        return '0';
    }
    
    /**
     * Evaluate a full line (replace variables, compute expressions)
     * @param {string} text - Line text
     * @returns {string} Evaluated line
     * @private
     */
    evaluateLine(text) {
        if (!text || !text.trim()) return '';
        const parsed = this.parseLine(text);
        if (!parsed) return '';
        const { cmd, params } = parsed;
        if (cmd.toUpperCase() === 'Z') return cmd;
        return cmd + ' ' + params.map(p => this.evaluateToken(p)).join(' ');
    }
    
    /**
     * Add a new line to the editor
     * @param {string} text - Line text (command + parameters)
     * @returns {boolean} True if added successfully
     */
    addLine(text) {
        if (!text || !text.trim()) return false;
        
        const parsed = this.parseLine(text);
        if (!parsed) {
            this.input.style.borderColor = 'red';
            setTimeout(() => { this.input.style.borderColor = ''; }, 1000);
            return false;
        }
        
        const lineData = {
            id: Date.now() + Math.random(),
            text: text.trim(),
            element: null
        };
        
        this.lines.push(lineData);
        const lineEl = this.createLineElement(lineData);
        lineData.element = lineEl;
        
        const numEl = lineEl.querySelector('.path-line-number');
        if (numEl) this.addDragHandlers(numEl, lineData);
        this.linesContainer.appendChild(lineEl);
        
        this.updateLineNumbers();
        this.updateHiddenInput();
        this.onChange(this.getEvaluatedPath());
        return true;
    }
    
    /**
     * Create DOM element for a line
     * @param {Object} lineData - Line data object
     * @returns {HTMLElement} Line element
     * @private
     */
    createLineElement(lineData) {
        const lineEl = document.createElement('div');
        lineEl.className = 'path-line';
        lineEl.dataset.id = lineData.id;
        this.buildLineCells(lineEl, lineData, false);
        return lineEl;
    }
    
    /**
     * Build/rebuild cells inside a line element
     * @param {HTMLElement} lineEl - Line element to populate
     * @param {Object} lineData - Line data object
     * @param {boolean} [addDrag=true] - Whether to add drag handlers
     * @private
     */
    buildLineCells(lineEl, lineData, addDrag = true) {
        lineEl.innerHTML = '';
        
        const parsed = this.parseLine(lineData.text);
        if (!parsed) return;
        
        const { cmd, params, def } = parsed;
        
        // Line number (drag handle)
        const numEl = document.createElement('span');
        numEl.className = 'path-line-number';
        numEl.draggable = true;
        numEl.title = 'Drag to reorder';
        numEl.textContent = this.lines.indexOf(lineData) + 1;
        lineEl.appendChild(numEl);
        
        // Command cell
        const cmdCell = document.createElement('button');
        cmdCell.type = 'button';
        cmdCell.className = 'path-cell path-cell-cmd';
        cmdCell.title = def.label || cmd;
        cmdCell.textContent = cmd;
        cmdCell.addEventListener('click', () => this.activateCmdEdit(lineData));
        lineEl.appendChild(cmdCell);
        
        // Parameter cells
        const expectedArgs = def.args;
        const maxCells = Math.max(params.length, expectedArgs.length);
        
        for (let i = 0; i < maxCells; i++) {
            const paramVal = params[i] || '';
            const argLabel = expectedArgs[i] || `arg${i+1}`;
            
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'path-cell path-cell-param';
            cell.dataset.argIndex = i;
            cell.dataset.argLabel = argLabel;
            
            const evaluated = paramVal ? this.evaluateToken(paramVal) : '';
            const hasFormula = paramVal && paramVal !== evaluated;
            cell.title = hasFormula ? `${argLabel}=${evaluated}` : argLabel;
            
            if (paramVal) {
                cell.textContent = paramVal;
            } else {
                cell.textContent = argLabel;
                cell.classList.add('cell-empty');
            }
            
            cell.addEventListener('click', (e) => this.activateParamEdit(lineData, i, argLabel, e));
            lineEl.appendChild(cell);
        }
        
        // Delete button
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'path-line-delete';
        delBtn.title = 'Delete line';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeLine(lineData.id);
        });
        lineEl.appendChild(delBtn);
        
        if (addDrag && lineData.element) {
            this.addDragHandlers(numEl, lineData);
        }
    }
    
    /**
     * Re-render a line's cells
     * @param {Object} lineData - Line data object
     * @private
     */
    rerenderLine(lineData) {
        if (lineData.element) {
            this.buildLineCells(lineData.element, lineData);
        }
    }
    
    /**
     * Clear active edit state
     * @private
     */
    clearActiveEdit() {
        this.linesContainer.querySelectorAll('.path-cell.active-edit').forEach(c => c.classList.remove('active-edit'));
        this.activeEditLineData = null;
        this.activeEditType = null;
        this.activeEditArgIndex = null;
        this.activeEditInput = null;
    }
    
    /**
     * Activate command edit mode
     * @param {Object} lineData - Line data to edit
     * @private
     */
    activateCmdEdit(lineData) {
        // Toggle off if already editing this command
        if (this.activeEditLineData === lineData && this.activeEditType === 'cmd') {
            this.clearActiveEdit();
            this.renderSuggestions();
            this.rerenderLine(lineData);
            return;
        }
        
        this.clearActiveEdit();
        this.activeEditLineData = lineData;
        this.activeEditType = 'cmd';
        
        const cmdCell = lineData.element?.querySelector('.path-cell-cmd');
        if (cmdCell) {
            cmdCell.classList.add('active-edit');
            cmdCell.textContent = '?';
        }
        
        // Show command buttons in suggestions
        let html = '<div class="path-suggestions-group">';
        html += '<span class="path-suggestions-label">Select command:</span>';
        Object.entries(SVG_COMMAND_DEFS).forEach(([c, def]) => {
            html += `<button type="button" class="path-suggestion-btn cmd-btn" data-cmd="${c}" title="${def.label}">${c}</button>`;
        });
        html += '</div>';
        this.suggestionsEl.innerHTML = html;
        
        this.suggestionsEl.querySelectorAll('.cmd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newCmd = btn.dataset.cmd;
                const newDef = SVG_COMMAND_DEFS[newCmd];
                const parsed = this.parseLine(lineData.text);
                
                // Transform params based on argument names, not just positions
                const newParams = this.transformParamsForCommand(
                    parsed ? parsed.params : [],
                    parsed ? parsed.def.args : [],
                    newDef ? newDef.args : []
                );
                
                lineData.text = newCmd + (newParams.length > 0 ? ' ' + newParams.join(' ') : '');
                this.clearActiveEdit();
                this.rerenderLine(lineData);
                this.updateHiddenInput();
                this.onChange(this.getEvaluatedPath());
                this.renderSuggestions();
            });
        });
    }
    
    /**
     * Activate parameter edit mode with inline input
     * @param {Object} lineData - Line data to edit
     * @param {number} argIndex - Parameter index
     * @param {string} argLabel - Parameter label for placeholder
     * @param {MouseEvent} [clickEvent] - Click event for cursor positioning
     * @private
     */
    activateParamEdit(lineData, argIndex, argLabel, clickEvent = null) {
        // If already editing this param, just reposition cursor
        if (this.activeEditLineData === lineData && this.activeEditType === 'param' && this.activeEditArgIndex === argIndex) {
            if (this.activeEditInput && clickEvent) {
                this.positionCursorAtClick(this.activeEditInput, clickEvent);
            }
            return;
        }
        
        this.clearActiveEdit();
        this.activeEditLineData = lineData;
        this.activeEditType = 'param';
        this.activeEditArgIndex = argIndex;
        
        const parsed = this.parseLine(lineData.text);
        const currentVal = parsed ? (parsed.params[argIndex] || '') : '';
        
        const paramCells = lineData.element?.querySelectorAll('.path-cell-param');
        const cell = paramCells?.[argIndex];
        if (!cell) return;
        
        cell.classList.add('active-edit');
        cell.innerHTML = '';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'path-cell-inline-input';
        input.value = currentVal;
        input.placeholder = argLabel;
        cell.appendChild(input);
        
        // Auto-resize input
        const resizeInput = () => {
            const textWidth = this.measureTextWidth(input.value || input.placeholder);
            input.style.width = Math.max(25, Math.ceil(textWidth) + 6) + 'px';
        };
        
        resizeInput();
        input.addEventListener('input', resizeInput);
        
        // Focus and position cursor
        requestAnimationFrame(() => {
            input.focus();
            if (clickEvent) {
                this.positionCursorAtClick(input, clickEvent);
            } else {
                input.select();
            }
        });
        
        // Finish editing handlers
        const finish = (save = true) => {
            if (save) {
                this.finishParamEdit(lineData, argIndex, input.value);
            } else {
                this.rerenderLine(lineData);
            }
            this.clearActiveEdit();
            this.renderSuggestions();
        };
        
        input.addEventListener('blur', () => finish(true));
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { 
                e.preventDefault();
                finish(true); 
            } else if (e.key === 'Escape') { 
                e.preventDefault();
                finish(false); 
            } else if (e.key === 'Tab') {
                e.preventDefault();
                finish(true);
                const nextCell = paramCells?.[argIndex + 1];
                if (nextCell) nextCell.click();
            }
        });
        
        input.addEventListener('input', (e) => e.stopPropagation());
        
        // Double-click to select all text
        input.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            input.select();
        });
        
        this.activeEditInput = input;
        this.renderVariableSuggestions(argLabel);
    }
    
    /**
     * Render variable suggestions for parameter editing
     * @param {string} argLabel - Parameter label
     * @private
     */
    renderVariableSuggestions(argLabel) {
        const vars = this.getAvailableVariables();
        let html;
        
        if (vars.length > 0) {
            html = '<div class="path-suggestions-group">';
            html += `<span class="path-suggestions-label">Variables for <em>${argLabel}</em>:</span>`;
            vars.forEach(v => {
                const val = this.variableValues[v.varName];
                const valStr = val !== undefined ? `=${val}` : '';
                html += `<button type="button" class="path-suggestion-btn var-btn" data-var="${v.varName}" title="${v.varName}${valStr}">{${v.varName}}${valStr}</button>`;
            });
            html += '</div>';
        } else {
            html = '<div class="path-suggestions-group"><span class="path-suggestions-label">No variables defined</span></div>';
        }
        this.suggestionsEl.innerHTML = html;
        
        this.suggestionsEl.querySelectorAll('.var-btn').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.activeEditInput) {
                    this.insertVariableAtCursor(this.activeEditInput, btn.dataset.var);
                }
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
    }
    
    /**
     * Finish parameter editing and save value
     * @param {Object} lineData - Line data being edited
     * @param {number} argIndex - Parameter index
     * @param {string} newVal - New parameter value
     * @private
     */
    finishParamEdit(lineData, argIndex, newVal) {
        const parsed = this.parseLine(lineData.text);
        if (!parsed) { this.rerenderLine(lineData); return; }
        
        const params = [...parsed.params];
        while (params.length <= argIndex) params.push('0');
        params[argIndex] = newVal.trim() || '0';
        
        lineData.text = parsed.cmd + ' ' + params.join(' ');
        this.rerenderLine(lineData);
        this.updateHiddenInput();
        this.onChange(this.getEvaluatedPath());
    }
    
    /**
     * Transform parameters when changing command type
     * Preserves values by argument name (x, y) rather than position
     * 
     * Examples:
     * - L 10 20 → H: keeps x=10, drops y → H 10
     * - L 10 20 → V: keeps y=20, drops x → V 20
     * - V 20 → L: keeps y=20, adds default x=0 → L 0 20
     * - H 10 → L: keeps x=10, adds default y=0 → L 10 0
     * 
     * @param {string[]} oldParams - Original parameter values
     * @param {string[]} oldArgs - Original argument names
     * @param {string[]} newArgs - New argument names
     * @returns {string[]} Transformed parameters for new command
     * @private
     */
    transformParamsForCommand(oldParams, oldArgs, newArgs) {
        // Build map of argName -> value from old params
        const argValues = {};
        oldArgs.forEach((argName, index) => {
            if (index < oldParams.length && oldParams[index]) {
                argValues[argName] = oldParams[index];
            }
        });
        
        // Build new params by looking up values by arg name
        const newParams = [];
        newArgs.forEach(argName => {
            if (argValues[argName] !== undefined) {
                newParams.push(argValues[argName]);
            } else {
                // Default value for missing args
                newParams.push('0');
            }
        });
        
        return newParams;
    }
    
    /**
     * Measure text width using canvas
     * @param {string} text - Text to measure
     * @returns {number} Width in pixels
     * @private
     */
    measureTextWidth(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '11px "JetBrains Mono", monospace';
        return ctx.measureText(text).width;
    }
    
    /**
     * Position cursor in input based on click coordinates
     * @param {HTMLInputElement} input - Input element
     * @param {MouseEvent} clickEvent - Click event
     * @private
     */
    positionCursorAtClick(input, clickEvent) {
        const rect = input.getBoundingClientRect();
        const clickX = clickEvent.clientX - rect.left;
        const text = input.value;
        let pos = 0;
        let currentWidth = 0;
        
        while (pos < text.length) {
            const charWidth = this.measureTextWidth(text[pos]);
            if (currentWidth + charWidth / 2 > clickX) break;
            currentWidth += charWidth;
            pos++;
        }
        
        input.focus();
        input.setSelectionRange(pos, pos);
    }
    
    /**
     * Insert variable reference at cursor position
     * @param {HTMLInputElement} input - Input element
     * @param {string} varName - Variable name to insert
     * @private
     */
    insertVariableAtCursor(input, varName) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const before = input.value.substring(0, start);
        const after = input.value.substring(end);
        input.value = before + `{${varName}}` + after;
        input.focus();
        input.setSelectionRange(start + varName.length + 2, start + varName.length + 2);
    }
    
    /**
     * Add drag and drop handlers to a line
     * @param {HTMLElement} numEl - Line number element (drag handle)
     * @param {Object} lineData - Line data object
     * @private
     */
    addDragHandlers(numEl, lineData) {
        numEl.addEventListener('dragstart', (e) => {
            this.draggedLine = lineData;
            lineData.element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(lineData.id));
        });
        
        numEl.addEventListener('dragend', () => {
            if (this.draggedLine) this.draggedLine.element.classList.remove('dragging');
            this.draggedLine = null;
            this.lines.forEach(l => l.element.classList.remove('drag-over'));
        });
        
        lineData.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.draggedLine && this.draggedLine.id !== lineData.id) {
                lineData.element.classList.add('drag-over');
            }
        });
        
        lineData.element.addEventListener('dragleave', () => {
            lineData.element.classList.remove('drag-over');
        });
        
        lineData.element.addEventListener('drop', (e) => {
            e.preventDefault();
            lineData.element.classList.remove('drag-over');
            if (this.draggedLine && this.draggedLine.id !== lineData.id) {
                this.reorderLines(this.draggedLine, lineData);
            }
        });
    }
    
    /**
     * Reorder lines by moving dragged line to target position
     * @param {Object} draggedLine - Dragged line data
     * @param {Object} targetLine - Target line data
     * @private
     */
    reorderLines(draggedLine, targetLine) {
        const di = this.lines.indexOf(draggedLine);
        const ti = this.lines.indexOf(targetLine);
        if (di === -1 || ti === -1) return;
        
        this.lines.splice(di, 1);
        this.lines.splice(ti, 0, draggedLine);
        this.linesContainer.innerHTML = '';
        this.lines.forEach(line => this.linesContainer.appendChild(line.element));
        this.updateLineNumbers();
        this.updateHiddenInput();
        this.onChange(this.getEvaluatedPath());
    }
    
    /**
     * Remove a line by ID
     * @param {number} id - Line ID
     */
    removeLine(id) {
        const index = this.lines.findIndex(l => l.id === id);
        if (index !== -1) {
            this.lines[index].element.remove();
            this.lines.splice(index, 1);
            this.updateLineNumbers();
            this.updateHiddenInput();
            this.onChange(this.getEvaluatedPath());
        }
    }
    
    /**
     * Update line numbers after reorder/delete
     * @private
     */
    updateLineNumbers() {
        this.lines.forEach((line, index) => {
            const numEl = line.element?.querySelector('.path-line-number');
            if (numEl) numEl.textContent = index + 1;
        });
    }
    
    /**
     * Update hidden input values
     * @private
     */
    updateHiddenInput() {
        if (this.hiddenInput) this.hiddenInput.value = this.getEvaluatedPath();
        if (this.rawHiddenInput) this.rawHiddenInput.value = this.getPath();
    }
    
    /**
     * Get raw path string with variables
     * @returns {string} Raw path
     */
    getPath() {
        return this.lines.map(l => l.text).join(' ');
    }
    
    /**
     * Get evaluated path string with variables replaced
     * @returns {string} Evaluated path
     */
    getEvaluatedPath() {
        return this.lines.map(l => this.evaluateLine(l.text)).filter(l => l).join(' ');
    }
    
    /**
     * Set path from string (parses and adds lines)
     * @param {string} pathString - SVG path string
     */
    setPath(pathString) {
        this.clear();
        if (!pathString) return;
        const commands = this.splitPathIntoCommands(pathString);
        commands.forEach(cmd => { if (cmd.trim()) this.addLine(cmd.trim()); });
    }
    
    /**
     * Split path string into individual commands
     * @param {string} pathString - Full path string
     * @returns {string[]} Array of command strings
     * @private
     */
    splitPathIntoCommands(pathString) {
        const commands = [];
        let current = '';
        let i = 0;
        
        while (i < pathString.length) {
            const char = pathString[i];
            if (SVG_COMMANDS.has(char)) {
                const prevChar = i > 0 ? pathString[i - 1] : '';
                const isAfterSpace = !prevChar || prevChar === ' ' || prevChar === '\n' || prevChar === '\r';
                if (i === 0 || isAfterSpace) {
                    if (current.trim()) commands.push(current.trim());
                    current = char;
                    i++;
                    continue;
                }
            }
            current += char;
            i++;
        }
        if (current.trim()) commands.push(current.trim());
        return commands;
    }
    
    /**
     * Clear all lines
     */
    clear() {
        this.lines.forEach(l => { if (l.element?.parentNode) l.element.remove(); });
        this.lines = [];
        if (this.hiddenInput) this.hiddenInput.value = '';
        if (this.rawHiddenInput) this.rawHiddenInput.value = '';
    }
    
    /**
     * Destroy the editor and clean up
     */
    destroy() {
        if (this.element?.parentNode) this.element.remove();
        this.lines = [];
    }
}