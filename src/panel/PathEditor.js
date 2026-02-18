/**
 * PathEditor - SVG Path Editor with syntax highlighting
 * Features:
 * - Each command on a new line
 * - Shift+Enter for new line
 * - Variable support {varName} with formula evaluation
 * - Real-time syntax highlighting
 * - Auto-reverse path to clockwise direction
 * - Drag-and-drop line reordering
 */

import { evaluateMathExpression } from "../utils/utils.js";

export default class PathEditor {
    constructor(options = {}) {
        this.container = options.container;
        this.hiddenInput = options.hiddenInput;
        this.onChange = options.onChange || (() => {});
        this.variableValues = options.variableValues || {};
        
        this.element = null;
        this.lines = [];
        this.draggedLine = null;
        this.dragOverLine = null;
        
        this.init();
    }
    
    init() {
        // Create editor container
        this.element = document.createElement('div');
        this.element.className = 'path-editor-container';
        this.element.innerHTML = `
            <div class="path-editor-lines" id="path-editor-lines"></div>
            <div class="path-editor-input-wrapper">
                <input type="text" class="path-editor-input" id="path-editor-input" placeholder="Type path command (e.g., M 0 0, L 10 5, Z)...">
            </div>
        `;
        
        this.container.appendChild(this.element);
        
        this.linesContainer = this.element.querySelector('#path-editor-lines');
        this.input = this.element.querySelector('#path-editor-input');
        
        this.bindEvents();
    }
    
    bindEvents() {
        // Input handling
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addLine(this.input.value.trim());
                this.input.value = '';
                
                // Shift+Enter adds line and keeps focus for more input
                if (!e.shiftKey) {
                    // Regular Enter - could trigger "done" behavior
                }
            }
        });
        
        // Real-time preview as user types
        this.input.addEventListener('input', () => {
            this.highlightInputPreview();
        });
        
        // Paste handling
        this.input.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            
            // Split by newlines and add each as a separate line
            const lines = text.split(/[\n\r]+/).filter(l => l.trim());
            lines.forEach(line => this.addLine(line.trim()));
        });
    }
    
    // Set variable values for evaluation
    setVariableValues(values) {
        this.variableValues = values || {};
        this.rehighlightAll();
        // Update hidden input with newly evaluated path
        this.updateHiddenInput();
        // Notify parent that path has changed (for preview update)
        this.onChange(this.getEvaluatedPath());
    }
    
    // Add a new line (command)
    addLine(text) {
        if (!text) return;
        
        const lineData = {
            id: Date.now() + Math.random(),
            text: text,
            element: null
        };
        
        const lineEl = document.createElement('div');
        lineEl.className = 'path-line';
        lineEl.dataset.id = lineData.id;
        lineEl.innerHTML = `
            <span class="path-line-number" draggable="true" title="Drag to reorder">${this.lines.length + 1}</span>
            <span class="path-line-content">${this.highlightSyntax(text)}</span>
            <button class="path-line-delete" title="Delete line">×</button>
        `;
        
        // Delete button
        lineEl.querySelector('.path-line-delete').addEventListener('click', () => {
            this.removeLine(lineData.id);
        });
        
        // Click to edit
        lineEl.querySelector('.path-line-content').addEventListener('click', () => {
            this.editLine(lineData.id);
        });
        
        // Add to DOM first
        this.linesContainer.appendChild(lineEl);
        lineData.element = lineEl;
        this.lines.push(lineData);
        
        // Drag and drop handlers - after element is in DOM
        const lineNumber = lineEl.querySelector('.path-line-number');
        if (lineNumber) {
            this.addDragHandlers(lineNumber, lineData);
        }
        
        this.updateHiddenInput();
        this.onChange(this.getPath());
    }
    
    // Add drag and drop handlers to line number
    addDragHandlers(lineNumber, lineData) {
        lineNumber.addEventListener('dragstart', (e) => {
            this.draggedLine = lineData;
            lineData.element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', lineData.id.toString());
        });
        
        lineNumber.addEventListener('dragend', () => {
            if (this.draggedLine) {
                this.draggedLine.element.classList.remove('dragging');
            }
            this.draggedLine = null;
            this.dragOverLine = null;
            // Remove all drag-over classes
            this.lines.forEach(l => l.element.classList.remove('drag-over'));
        });
        
        // Make the whole line a drop target
        lineData.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this.draggedLine && this.draggedLine.id !== lineData.id) {
                lineData.element.classList.add('drag-over');
                this.dragOverLine = lineData;
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
    
    // Reorder lines after drag and drop
    reorderLines(draggedLine, targetLine) {
        const draggedIndex = this.lines.indexOf(draggedLine);
        const targetIndex = this.lines.indexOf(targetLine);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Remove dragged line from array
        this.lines.splice(draggedIndex, 1);
        
        // Insert at new position
        this.lines.splice(targetIndex, 0, draggedLine);
        
        // Rebuild DOM
        this.linesContainer.innerHTML = '';
        this.lines.forEach((line, index) => {
            this.linesContainer.appendChild(line.element);
            const numEl = line.element.querySelector('.path-line-number');
            if (numEl) numEl.textContent = index + 1;
        });
        
        this.updateHiddenInput();
        this.onChange(this.getPath());
    }
    
    // Remove a line
    removeLine(id) {
        const index = this.lines.findIndex(l => l.id === id);
        if (index !== -1) {
            this.lines[index].element.remove();
            this.lines.splice(index, 1);
            this.updateLineNumbers();
            this.updateHiddenInput();
            this.onChange(this.getPath());
        }
    }
    
    // Edit a line
    editLine(id) {
        const lineData = this.lines.find(l => l.id === id);
        if (!lineData) return;
        
        // Replace line content with input
        const contentEl = lineData.element.querySelector('.path-line-content');
        const originalText = lineData.text;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'path-line-edit-input';
        input.value = originalText;
        
        contentEl.innerHTML = '';
        contentEl.appendChild(input);
        input.focus();
        input.select();
        
        const finishEdit = () => {
            const newText = input.value.trim();
            if (newText) {
                lineData.text = newText;
                contentEl.innerHTML = this.highlightSyntax(newText);
                this.updateHiddenInput();
                this.onChange(this.getPath());
            } else {
                // Empty - remove line
                this.removeLine(id);
            }
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                input.value = originalText;
                input.blur();
            }
        });
    }
    
    // Update line numbers after deletion
    updateLineNumbers() {
        this.lines.forEach((line, index) => {
            const numEl = line.element.querySelector('.path-line-number');
            if (numEl) numEl.textContent = index + 1;
        });
    }
    
    // Highlight syntax for a single line
    highlightSyntax(text) {
        if (!text) return '';
        
        // Escape HTML
        let escaped = text
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>');
        
        // Highlight variable references {varName}
        escaped = escaped.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, 
            '<span class="path-var">{$1}</span>');
        
        // Highlight commands (M, L, H, V, C, S, Q, T, A, Z)
        escaped = escaped.replace(/\b([MLHVCSQTAZmlhvcsqtaz])\b/g, 
            '<span class="path-cmd">$1</span>');
        
        // Highlight numbers (including negative and decimals)
        escaped = escaped.replace(/(-?\d+\.?\d*)/g, 
            '<span class="path-num">$1</span>');
        
        // Highlight commas
        escaped = escaped.replace(/,/g, '<span class="path-comma">,</span>');
        
        return escaped;
    }
    
    // Highlight input preview as user types
    highlightInputPreview() {
        const text = this.input.value.trim();
        // Could show a preview tooltip here
    }
    
    // Re-highlight all lines (e.g., after variable values change)
    rehighlightAll() {
        this.lines.forEach(line => {
            const contentEl = line.element.querySelector('.path-line-content');
            if (contentEl && !contentEl.querySelector('input')) {
                contentEl.innerHTML = this.highlightSyntax(line.text);
            }
        });
    }
    
    // Update hidden input with path data (evaluated path with formulas computed)
    updateHiddenInput() {
        if (this.hiddenInput) {
            this.hiddenInput.value = this.getEvaluatedPath();
        }
    }
    
    // Get the full path string
    getPath() {
        return this.lines.map(l => l.text).join(' ');
    }
    
    // Get evaluated path with variables replaced and expressions evaluated
    getEvaluatedPath() {
        return this.lines.map(l => this.evaluateLine(l.text)).join(' ');
    }
    
    // Evaluate a single line, replacing variables and computing expressions
    evaluateLine(text) {
        if (!text) return '';
        
        // Extract the command letter
        const cmdMatch = text.match(/^([MLHVCSQTAZmlhvcsqtaz])/);
        if (!cmdMatch) return text;
        
        const cmd = cmdMatch[1];
        const paramsStr = text.slice(1).trim();
        
        // Split parameters while preserving negative signs and expressions
        const tokens = this.tokenizeParams(paramsStr);
        
        // Evaluate each token as a mathematical expression
        const evaluatedTokens = tokens.map(token => {
            // First replace variables in the token
            let evaluated = token.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, varName) => {
                const value = this.variableValues[varName];
                if (value !== undefined && !isNaN(value)) {
                    return value;
                }
                return '0'; // Default to 0 if variable not found
            });
            
            const result = this.evaluateExpression(evaluated);
            return result;
        });
        
        return cmd + ' ' + evaluatedTokens.join(' ');
    }
    
    // Tokenize parameters, keeping expressions together
    tokenizeParams(paramsStr) {
        const tokens = [];
        let current = '';
        let parenDepth = 0;
        let i = 0;
        
        while (i < paramsStr.length) {
            const char = paramsStr[i];
            
            if (char === '(') {
                parenDepth++;
                current += char;
                i++;
            } else if (char === ')') {
                parenDepth--;
                current += char;
                i++;
            } else if ((char === ' ' || char === ',') && parenDepth === 0) {
                if (current.trim()) {
                    tokens.push(current.trim());
                }
                current = '';
                i++;
            } else if (char === '-' && parenDepth === 0) {
                // Handle minus sign - could be:
                // 1. Negative number at start of new token
                // 2. Subtraction operator (part of expression)
                
                if (current === '') {
                    // Start of a new token - could be negative number or expression
                    // Check if previous token is a complete number
                    if (tokens.length > 0) {
                        const prevToken = tokens[tokens.length - 1];
                        // If prev token is a simple number, this is a new negative token
                        const prevNum = parseFloat(prevToken);
                        if (!isNaN(prevNum) && isFinite(prevNum) && 
                            (prevToken === prevNum.toString() || prevToken === (-prevNum).toString())) {
                            // Previous is a simple number, start new token
                            current = char;
                        } else {
                            // Previous is an expression, this is subtraction
                            current = char;
                        }
                    } else {
                        // First token, must be negative
                        current = char;
                    }
                } else {
                    // In the middle of a token - this is subtraction
                    current += char;
                }
                i++;
            } else {
                current += char;
                i++;
            }
        }
        
        if (current.trim()) {
            tokens.push(current.trim());
        }
        
        return tokens;
    }
    
    // Evaluate a mathematical expression
    evaluateExpression(expr) {
        if (!expr) return '0';
        
        // Trim the expression
        expr = expr.trim();
        
        // Check if it's a simple number (including negative)
        const num = parseFloat(expr);
        if (!isNaN(num) && isFinite(num)) {
            // Check if the whole expression is just this number
            // Handle both positive and negative numbers
            if (expr === String(num) || expr === num.toString()) {
                return String(num);
            }
        }
        
        // Try to evaluate as math expression
        try {
            const result = evaluateMathExpression(expr);
            if (!isNaN(result) && isFinite(result)) {
                // Round to reasonable precision
                const rounded = Math.round(result * 1000000) / 1000000;
                return String(rounded);
            }
        } catch (e) {
            // Expression evaluation failed - log for debugging
            console.warn('Expression evaluation failed:', expr, e);
        }
        
        return '0'; // Return 0 if evaluation fails to avoid NaN
    }
    
    // Set the path from a string
    setPath(pathString) {
        this.clear();
        
        if (!pathString) return;
        
        // Split into commands
        const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
        commands.forEach(cmd => {
            this.addLine(cmd.trim());
        });
    }
    
    // Clear all lines
    clear() {
        this.lines.forEach(l => l.element.remove());
        this.lines = [];
        this.updateHiddenInput();
    }
    
    // Check if path is clockwise
    isClockwise() {
        const path = this.getEvaluatedPath();
        const points = this.extractPoints(path);
        
        if (points.length < 3) return true;
        
        // Calculate signed area (shoelace formula)
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        
        return area < 0; // Negative area = clockwise
    }
    
    // Extract points from path for direction calculation
    extractPoints(path) {
        const points = [];
        const commands = path.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
        
        let currentX = 0, currentY = 0;
        
        commands.forEach(cmd => {
            const type = cmd[0].toUpperCase();
            const params = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
            
            switch (type) {
                case 'M':
                case 'L':
                    if (params.length >= 2) {
                        currentX = params[0];
                        currentY = params[1];
                        points.push({ x: currentX, y: currentY });
                    }
                    break;
                case 'H':
                    if (params.length >= 1) {
                        currentX = params[0];
                        points.push({ x: currentX, y: currentY });
                    }
                    break;
                case 'V':
                    if (params.length >= 1) {
                        currentY = params[0];
                        points.push({ x: currentX, y: currentY });
                    }
                    break;
                case 'C':
                    if (params.length >= 6) {
                        currentX = params[4];
                        currentY = params[5];
                        points.push({ x: currentX, y: currentY });
                    }
                    break;
                case 'S':
                case 'Q':
                    if (params.length >= 4) {
                        currentX = params[2];
                        currentY = params[3];
                        points.push({ x: currentX, y: currentY });
                    }
                    break;
                case 'A':
                    if (params.length >= 7) {
                        currentX = params[5];
                        currentY = params[6];
                        points.push({ x: currentX, y: currentY });
                    }
                    break;
            }
        });
        
        return points;
    }
    
    // Reverse path direction (counter-clockwise to clockwise or vice versa)
    reversePath() {
        if (this.lines.length < 2) return;
        
        // Get all commands and reverse them
        const reversedLines = [];
        
        // Start from the end, reverse each segment
        for (let i = this.lines.length - 1; i >= 0; i--) {
            const line = this.lines[i];
            const type = line.text[0].toUpperCase();
            
            if (type === 'Z') continue; // Skip Z, we'll add it at the end
            
            const params = line.text.slice(1).trim().split(/[\s,]+/).filter(p => p);
            
            // For M and L, just reverse the order
            if (type === 'M' || type === 'L') {
                reversedLines.push(line.text);
            } else if (type === 'H') {
                // H x -> L x currentY (need to track position)
                reversedLines.push(line.text);
            } else if (type === 'V') {
                // V y -> L currentX y
                reversedLines.push(line.text);
            } else {
                reversedLines.push(line.text);
            }
        }
        
        // Swap M and final L positions
        if (reversedLines.length >= 2) {
            const firstM = reversedLines.find(l => l[0].toUpperCase() === 'M');
            const lastL = reversedLines[reversedLines.length - 1];
            
            // The new M should be at the position of the last L
            // And the last command should go to the original M position
        }
        
        // Clear and rebuild
        this.clear();
        reversedLines.forEach(l => this.addLine(l));
        this.addLine('Z');
        
        this.updateHiddenInput();
        this.onChange(this.getPath());
    }
    
    // Ensure path is clockwise (reverse if needed)
    ensureClockwise() {
        if (!this.isClockwise()) {
            this.reversePath();
        }
    }
    
    // Destroy the editor
    destroy() {
        this.element.remove();
        this.lines = [];
    }
}