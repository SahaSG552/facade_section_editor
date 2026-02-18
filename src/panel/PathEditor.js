/**
 * PathEditor - SVG Path Editor with table-based row editing
 * 
 * Key design principles:
 * - Each line is displayed as a flex row with individual cells per argument
 * - First cell = SVG command (clickable to change)
 * - Remaining cells = individual parameters (clickable to edit)
 * - Formulas/variables preserved in storage, evaluated for output
 * - Autocomplete suggestions for commands and variables
 */

import { evaluateMathExpression } from "../utils/utils.js";

// Valid SVG path commands with their argument counts and labels
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

const SVG_COMMANDS = new Set([...Object.keys(SVG_COMMAND_DEFS), ...Object.keys(SVG_COMMAND_DEFS).map(c => c.toLowerCase())]);

export default class PathEditor {
    constructor(options = {}) {
        this.container = options.container;
        this.hiddenInput = options.hiddenInput;
        this.rawHiddenInput = options.rawHiddenInput;
        this.onChange = options.onChange || (() => {});
        this.variableValues = options.variableValues || {};
        this.getVariableList = options.getVariableList || (() => []);
        
        this.element = null;
        this.lines = [];
        this.draggedLine = null;
        
        this.init();
    }
    
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
    
    // Try to add a line from the input field
    tryAddLine() {
        const text = this.input.value.trim();
        if (text) {
            if (this.addLine(text)) {
                this.input.value = '';
                this.renderSuggestions();
            }
        }
    }
    
    // Render command/variable suggestions below input
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
                html += `<button class="path-suggestion-btn cmd-btn${active}" data-cmd="${cmd}" title="${def.label}">${cmd}</button>`;
            });
            html += '</div>';
        } else {
            // Show variable suggestions for the current argument position
            const cmd = parts[0].toUpperCase();
            const def = SVG_COMMAND_DEFS[cmd];
            if (def && def.args.length > 0) {
                const argIndex = parts.length - 1; // current arg being typed (0 = cmd, 1 = first arg)
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
                        html += `<button class="path-suggestion-btn var-btn" data-var="${v.varName}" title="${v.name}${valStr}">{${v.varName}}</button>`;
                    });
                    html += '</div>';
                }
            }
        }
        
        this.suggestionsEl.innerHTML = html;
        
        // Bind suggestion button events
        this.suggestionsEl.querySelectorAll('.cmd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cmd = btn.dataset.cmd;
                this.input.value = cmd + ' ';
                this.input.focus();
                this.renderSuggestions();
            });
        });
        
        this.suggestionsEl.querySelectorAll('.var-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const varName = btn.dataset.var;
                const current = this.input.value;
                // Add variable reference at end
                if (current.endsWith(' ') || current === '') {
                    this.input.value = current + `{${varName}}`;
                } else {
                    this.input.value = current + ` {${varName}}`;
                }
                this.input.focus();
                this.renderSuggestions();
            });
        });
    }
    
    // Get available variables (from variableValues + any registered list)
    getAvailableVariables() {
        const vars = [];
        const seen = new Set();
        
        // From variableValues object
        Object.keys(this.variableValues).forEach(varName => {
            if (!seen.has(varName)) {
                seen.add(varName);
                vars.push({ varName, name: varName, value: this.variableValues[varName] });
            }
        });
        
        return vars;
    }
    
    // Set variable values for evaluation (does NOT modify stored text)
    setVariableValues(values) {
        this.variableValues = values || {};
        // Re-render all lines to update evaluated values display
        this.lines.forEach(line => this.rerenderLine(line));
        this.updateHiddenInput();
        this.onChange(this.getEvaluatedPath());
        // Update suggestions
        this.renderSuggestions();
    }
    
    // Parse a line into command + parameter tokens
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
    
    // Split string by spaces, keeping {varName} together
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
    
    // Evaluate a single parameter token
    evaluateToken(token) {
        if (!token || !token.trim()) return '0';
        
        let expr = token.trim();
        
        // Replace variable references
        expr = expr.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, varName) => {
            const value = this.variableValues[varName];
            if (value !== undefined && !isNaN(Number(value))) return String(value);
            return '0';
        });
        
        // Simple number check
        const num = parseFloat(expr);
        if (!isNaN(num) && isFinite(num)) {
            // Check if the whole string is just this number
            if (expr.trim().replace(/\s/g, '') === String(num)) return String(num);
        }
        
        // Math expression
        try {
            const result = evaluateMathExpression(expr);
            if (result !== null && result !== undefined && !isNaN(Number(result)) && isFinite(Number(result))) {
                return String(Math.round(Number(result) * 1000000) / 1000000);
            }
        } catch (e) {}
        
        return '0';
    }
    
    // Evaluate a full line
    evaluateLine(text) {
        if (!text || !text.trim()) return '';
        const parsed = this.parseLine(text);
        if (!parsed) return '';
        const { cmd, params } = parsed;
        if (cmd.toUpperCase() === 'Z') return cmd;
        const evaluatedParams = params.map(p => this.evaluateToken(p));
        return cmd + ' ' + evaluatedParams.join(' ');
    }
    
    // Add a new line - returns true if successful
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
        // Now that lineData.element is set, add drag handlers
        const numEl = lineEl.querySelector('.path-line-number');
        if (numEl) this.addDragHandlers(numEl, lineData);
        this.linesContainer.appendChild(lineEl);
        
        this.updateLineNumbers();
        this.updateHiddenInput();
        this.onChange(this.getEvaluatedPath());
        return true;
    }
    
    // Create the DOM element for a line (flex row with cells)
    createLineElement(lineData) {
        const lineEl = document.createElement('div');
        lineEl.className = 'path-line';
        lineEl.dataset.id = lineData.id;
        
        // Build cells WITHOUT drag handlers (lineData.element not set yet)
        this.buildLineCells(lineEl, lineData, false);
        
        return lineEl;
    }
    
    // Build/rebuild the cells inside a line element
    // addDragHandlers: false when called before lineData.element is set
    buildLineCells(lineEl, lineData, addDrag = true) {
        lineEl.innerHTML = '';
        
        const parsed = this.parseLine(lineData.text);
        if (!parsed) return;
        
        const { cmd, cmdUpper, params, def } = parsed;
        
        // Line number (drag handle)
        const numEl = document.createElement('span');
        numEl.className = 'path-line-number';
        numEl.draggable = true;
        numEl.title = 'Drag to reorder';
        numEl.textContent = this.lines.indexOf(lineData) + 1;
        lineEl.appendChild(numEl);
        
        // Command cell
        const cmdCell = document.createElement('span');
        cmdCell.className = 'path-cell path-cell-cmd';
        cmdCell.title = def.label || cmd;
        cmdCell.textContent = cmd;
        cmdCell.addEventListener('click', () => this.editCmdCell(lineData, cmdCell));
        lineEl.appendChild(cmdCell);
        
        // Parameter cells
        const expectedArgs = def.args;
        const maxCells = Math.max(params.length, expectedArgs.length);
        
        for (let i = 0; i < maxCells; i++) {
            const paramVal = params[i] || '';
            const argLabel = expectedArgs[i] || `arg${i+1}`;
            
            const cell = document.createElement('span');
            cell.className = 'path-cell path-cell-param';
            cell.dataset.argIndex = i;
            cell.dataset.argLabel = argLabel;
            cell.title = argLabel;
            
            // Show raw value with evaluated result if different
            const evaluated = paramVal ? this.evaluateToken(paramVal) : '';
            const hasFormula = paramVal && paramVal !== evaluated;
            
            if (paramVal) {
                cell.innerHTML = `<span class="cell-raw">${this.escapeHtml(paramVal)}</span>`;
                if (hasFormula) {
                    cell.innerHTML += `<span class="cell-eval">=${evaluated}</span>`;
                }
            } else {
                cell.innerHTML = `<span class="cell-placeholder">${argLabel}</span>`;
                cell.classList.add('cell-empty');
            }
            
            cell.addEventListener('click', () => this.editParamCell(lineData, cell, i, argLabel));
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
        
        // Drag handlers - only add if lineData.element is set
        if (addDrag && lineData.element) {
            this.addDragHandlers(numEl, lineData);
        }
    }
    
    // Re-render a line's cells (after variable values change)
    rerenderLine(lineData) {
        if (lineData.element) {
            this.buildLineCells(lineData.element, lineData);
        }
    }
    
    // Edit the command cell
    editCmdCell(lineData, cmdCell) {
        const parsed = this.parseLine(lineData.text);
        if (!parsed) return;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'path-cell-input cmd-input';
        input.value = parsed.cmd;
        input.maxLength = 1;
        
        // Show command dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'path-cell-dropdown';
        Object.entries(SVG_COMMAND_DEFS).forEach(([c, def]) => {
            const opt = document.createElement('button');
            opt.className = 'path-dropdown-opt';
            opt.textContent = `${c} - ${def.label}`;
            opt.addEventListener('mousedown', (e) => {
                e.preventDefault();
                input.value = c;
                this.finishCmdEdit(lineData, input.value, input, dropdown);
            });
            dropdown.appendChild(opt);
        });
        
        cmdCell.innerHTML = '';
        cmdCell.appendChild(input);
        cmdCell.appendChild(dropdown);
        input.focus();
        input.select();
        
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            dropdown.remove();
            this.finishCmdEdit(lineData, input.value, input, null);
        };
        
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            else if (e.key === 'Escape') { finished = true; this.rerenderLine(lineData); }
            else if (e.key === 'Tab') { e.preventDefault(); input.blur(); }
        });
    }
    
    finishCmdEdit(lineData, newCmd, input, dropdown) {
        if (dropdown) dropdown.remove();
        const newCmdUpper = newCmd.trim().toUpperCase();
        if (newCmdUpper.length === 1 && SVG_COMMANDS.has(newCmdUpper)) {
            const parsed = this.parseLine(lineData.text);
            const params = parsed ? parsed.params : [];
            lineData.text = newCmdUpper + (params.length > 0 ? ' ' + params.join(' ') : '');
        }
        this.rerenderLine(lineData);
        this.updateHiddenInput();
        this.onChange(this.getEvaluatedPath());
    }
    
    // Edit a parameter cell
    editParamCell(lineData, cell, argIndex, argLabel) {
        const parsed = this.parseLine(lineData.text);
        if (!parsed) return;
        
        const currentVal = parsed.params[argIndex] || '';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'path-cell-edit-wrapper';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'path-cell-input';
        input.value = currentVal;
        input.placeholder = argLabel;
        
        // Variable suggestions dropdown
        const vars = this.getAvailableVariables();
        let dropdown = null;
        if (vars.length > 0) {
            dropdown = document.createElement('div');
            dropdown.className = 'path-cell-dropdown';
            vars.forEach(v => {
                const val = this.variableValues[v.varName];
                const valStr = val !== undefined ? ` = ${val}` : '';
                const opt = document.createElement('button');
                opt.className = 'path-dropdown-opt var-opt';
                opt.textContent = `{${v.varName}}${valStr}`;
                opt.title = v.name || v.varName;
                opt.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    // Insert variable at cursor or append
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const before = input.value.substring(0, start);
                    const after = input.value.substring(end);
                    input.value = before + `{${v.varName}}` + after;
                    input.focus();
                    input.setSelectionRange(start + v.varName.length + 2, start + v.varName.length + 2);
                });
                dropdown.appendChild(opt);
            });
            wrapper.appendChild(dropdown);
        }
        
        wrapper.appendChild(input);
        
        cell.innerHTML = '';
        cell.appendChild(wrapper);
        input.focus();
        input.select();
        
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            if (dropdown) dropdown.remove();
            this.finishParamEdit(lineData, argIndex, input.value);
        };
        
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            else if (e.key === 'Escape') { finished = true; this.rerenderLine(lineData); }
            else if (e.key === 'Tab') {
                e.preventDefault();
                finish();
                // Move to next cell
                const nextCell = cell.nextElementSibling;
                if (nextCell && nextCell.classList.contains('path-cell-param')) {
                    nextCell.click();
                }
            }
        });
    }
    
    finishParamEdit(lineData, argIndex, newVal) {
        const parsed = this.parseLine(lineData.text);
        if (!parsed) { this.rerenderLine(lineData); return; }
        
        const params = [...parsed.params];
        // Extend params array if needed
        while (params.length <= argIndex) params.push('0');
        params[argIndex] = newVal.trim() || '0';
        
        lineData.text = parsed.cmd + ' ' + params.join(' ');
        this.rerenderLine(lineData);
        this.updateHiddenInput();
        this.onChange(this.getEvaluatedPath());
    }
    
    // Drag and drop
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
    
    updateLineNumbers() {
        this.lines.forEach((line, index) => {
            const numEl = line.element?.querySelector('.path-line-number');
            if (numEl) numEl.textContent = index + 1;
        });
    }
    
    escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    
    updateHiddenInput() {
        if (this.hiddenInput) this.hiddenInput.value = this.getEvaluatedPath();
        if (this.rawHiddenInput) this.rawHiddenInput.value = this.getPath();
    }
    
    getPath() {
        return this.lines.map(l => l.text).join(' ');
    }
    
    getEvaluatedPath() {
        return this.lines.map(l => this.evaluateLine(l.text)).filter(l => l).join(' ');
    }
    
    setPath(pathString) {
        this.clear();
        if (!pathString) return;
        const commands = this.splitPathIntoCommands(pathString);
        commands.forEach(cmd => { if (cmd.trim()) this.addLine(cmd.trim()); });
    }
    
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
    
    clear() {
        this.lines.forEach(l => { if (l.element?.parentNode) l.element.remove(); });
        this.lines = [];
        if (this.hiddenInput) this.hiddenInput.value = '';
        if (this.rawHiddenInput) this.rawHiddenInput.value = '';
    }
    
    destroy() {
        if (this.element?.parentNode) this.element.remove();
        this.lines = [];
    }
}
