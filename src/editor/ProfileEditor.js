import LoggerFactory from "../core/LoggerFactory.js";
import EditorStateManager from "./EditorStateManager.js";
import EditorCanvas from "./EditorCanvas.js";
import EditorToolbar from "./EditorToolbar.js";
import CursorTool from "./tools/CursorTool.js";
import MoveTool from "./tools/MoveTool.js";
import RotateTool from "./tools/RotateTool.js";
import LineTool from "./tools/LineTool.js";
import MirrorTool from "./tools/MirrorTool.js";
import FlipTool from "./tools/FlipTool.js";
import FilletTool from "./tools/FilletTool.js";
import ArcTool from "./tools/ArcTool.js";
import CircleTool from "./tools/CircleTool.js";
import RectTool from "./tools/RectTool.js";
import EllipseTool from "./tools/EllipseTool.js";
import OffsetTool from "./tools/OffsetTool.js";
import { getShortcutKeyId, matchesCommandShortcut, hasCommandModifier, matchesShortcut } from "./keyboardShortcuts.js";
import { isSegmentDegenerated } from "../operations/OffsetRules.js";
import { evaluateMathExpression } from "../utils/utils.js";
import { VARIABLE_TOKEN_RE_GLOBAL } from "../utils/variableTokens.js";
import { isFormulaToken, evaluateTokenWithVars } from "../utils/formulaPolicy.js";
import { shapeUiToStoredNumber } from "../utils/yPolicy.js";

const log = LoggerFactory.createLogger("ProfileEditor");

function _optFiniteId(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/**
 * Merge formula tokens from a formula-containing path into a freshly exported
 * numeric path.  At each token position: if the formula path has a `{varname}`
 * token AND the variable's resolved value equals the numeric token (within 1e-4),
 * the formula token is kept; otherwise the numeric token is used.
 *
 * If segment structure changed, merge is done best-effort: matching command/parameter
 * regions keep formula tokens when numerically equivalent, while new/mismatched regions
 * stay numeric.
 *
 * @param {string} numericPath        - Path with all numeric values
 * @param {string} formulaPath        - Original path that may contain {varname} tokens
 * @param {Record<string,number>} vars - Variable name → resolved value map
 * @returns {string}
 */
function _mergeFormulaPath(numericPath, formulaPath, vars) {
    if (!formulaPath) return numericPath;
    const SVG_CMD = /[MmLlHhVvCcSsQqTtAaZz]/;
    const tokenize = (str) => {
        const src = String(str ?? '');
        const out = [];
        let i = 0;
        while (i < src.length) {
            while (i < src.length && /[\s,]/.test(src[i])) i++;
            if (i >= src.length) break;

            if (SVG_CMD.test(src[i])) {
                out.push({ type: 'cmd', value: src[i] });
                i++;
                continue;
            }

            let j = i;
            let braceDepth = 0;
            while (j < src.length) {
                const ch = src[j];
                if (ch === '{') {
                    braceDepth++;
                    j++;
                    continue;
                }
                if (ch === '}') {
                    braceDepth = Math.max(0, braceDepth - 1);
                    j++;
                    continue;
                }
                if (braceDepth === 0 && /[\s,]/.test(ch)) break;
                if (braceDepth === 0 && SVG_CMD.test(ch)) break;
                j++;
            }
            const token = src.slice(i, j).trim();
            if (token) out.push({ type: 'param', value: token });
            i = j > i ? j : i + 1;
        }
        return out;
    };

    const isFormulaToken = (token) => {
        const t = String(token ?? '').trim();
        if (!t) return false;
        const direct = Number(t);
        if (!Number.isNaN(direct) && Number.isFinite(direct)) return false;
        return /\{[^}]+\}/.test(t)
            || /[*/()]/.test(t)
            || (/[+\-]/.test(t) && !/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t));
    };

    const resolveParam = (token) => {
        const t = String(token ?? '').trim();
        if (!t) return NaN;
        const direct = Number(t);
        if (!Number.isNaN(direct) && Number.isFinite(direct)) return direct;
        try {
            const expr = t.replace(VARIABLE_TOKEN_RE_GLOBAL, (_, name) => {
                const v = vars?.[name];
                return v !== undefined && !Number.isNaN(Number(v)) ? String(v) : '0';
            });
            const n = Number(evaluateMathExpression(expr));
            return Number.isNaN(n) ? NaN : n;
        } catch (_) {
            return NaN;
        }
    };

    const numericTokens = tokenize(numericPath);
    const formulaTokens = tokenize(formulaPath);
    const sameCmd = (a, b) => String(a || '').toUpperCase() === String(b || '').toUpperCase();

    const merged = [];
    let fi = 0;
    for (let ni = 0; ni < numericTokens.length; ni++) {
        const nTok = numericTokens[ni];
        if (nTok.type === 'cmd') {
            merged.push(nTok.value);
            const fTok = formulaTokens[fi];
            if (fTok?.type === 'cmd') {
                if (sameCmd(fTok.value, nTok.value)) {
                    fi++;
                } else {
                    let k = fi + 1;
                    while (k < formulaTokens.length && !(formulaTokens[k].type === 'cmd' && sameCmd(formulaTokens[k].value, nTok.value))) k++;
                    if (k < formulaTokens.length) fi = k + 1;
                }
            }
            continue;
        }

        const fTok = formulaTokens[fi];
        if (fTok?.type === 'param' && isFormulaToken(fTok.value)) {
            const nVal = resolveParam(nTok.value);
            const fVal = resolveParam(fTok.value);
            if (!Number.isNaN(nVal) && !Number.isNaN(fVal) && Math.abs(nVal - fVal) <= 1e-4) {
                merged.push(String(fTok.value).trim());
            } else {
                merged.push(nTok.value);
            }
            fi++;
        } else {
            merged.push(nTok.value);
            if (fTok?.type === 'param') fi++;
        }
    }

    return merged.join(' ');
}

// ─── Module-level pure helpers ────────────────────────────────────────────────

/**
 * Split a merged SVG path string into individual SVG command strings.
 * Each element starts with a command letter (M/L/A/Z/…) followed by its parameters.
 *
 * @param {string} str - Full concatenated SVG path string
 * @returns {string[]}
 */
function _splitCmds(str) {
    const src = String(str ?? '').trim();
    if (!src) return [];
    const out = [];
    let current = '';
    let braceDepth = 0;

    const isCmd = (ch) => /[MmLlHhVvCcSsQqTtAaZz]/.test(ch);
    const isBoundary = (ch) => !ch || /[\s,]/.test(ch);

    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);

        const prev = i > 0 ? src[i - 1] : '';
        const startsCommand = braceDepth === 0 && isCmd(ch) && isBoundary(prev);

        if (startsCommand && current.trim()) {
            out.push(current.trim());
            current = ch;
        } else {
            current += ch;
        }
    }

    if (current.trim()) out.push(current.trim());
    return out;
}

/**
 * Attach per-contour path strings and lineSegIds to path/polyline elements so
 * PathEditor can display each contour's commands independently.
 * Shape elements (circle/rect/ellipse) are passed through unchanged.
 *
 * The extracted slice includes:
 * - The preceding M command when its lineSegId is `"m:<cid>"` (synthetic M-row segId).
 * - The trailing Z command when present (Z rows have `null` segId).
 *
 * @param {Array}              elements   - from state.getElements()
 * @param {string}             mergedPath - Full SVG path (all contours concatenated)
 * @param {Array<string|null>} lineSegIds - segId per command: `"m:<cid>"` for M rows,
 *                                          `null` for Z rows, real segId for L/A rows
 * @returns {Array}
 */
function _buildElemsWithPaths(elements, mergedPath, lineSegIds) {
    const cmds = _splitCmds(mergedPath);
    return elements.map(elem => {
        if (elem.type !== 'path' && elem.type !== 'polyline' && elem.type !== 'symmetry') return elem;
        const segSet = new Set(elem.segIds);
        const positions = [];
        lineSegIds.forEach((sid, i) => { if (sid !== null && segSet.has(sid)) positions.push(i); });
        if (!positions.length) return { ...elem, path: null, lineSegIds: [] };
        let lo = positions[0];
        let hi = positions[positions.length - 1];
        // Include the preceding M command.  M rows carry a "m:<cid>" synthetic segId;
        // shape-element placeholder M rows carry null (but never appear in L/A positions).
        const prevSid = lineSegIds[lo - 1];
        const isMRow = prevSid === null || (typeof prevSid === 'string' && prevSid.startsWith('m:'));
        if (lo > 0 && isMRow && /^[Mm]/.test(cmds[lo - 1] ?? '')) lo--;
        // Include the trailing Z command (null segId).
        if (hi + 1 < cmds.length && /^[Zz]/.test(cmds[hi + 1] ?? '')) hi++;
        return {
            ...elem,
            path: cmds.slice(lo, hi + 1).join(' '),
            lineSegIds: lineSegIds.slice(lo, hi + 1),
        };
    });
}

/**
 * Reorder exported state elements to match the current PathEditor top-level order.
 * This keeps preview/edit order stable when canvas-originated updates occur.
 *
 * @param {Array} elements
 * @param {Array} editorSnapshot
 * @returns {Array}
 */
function _orderElementsLikePathEditor(elements, editorSnapshot) {
    if (!Array.isArray(elements) || elements.length === 0) return [];
    if (!Array.isArray(editorSnapshot) || editorSnapshot.length === 0) return [...elements];

    const pool = [...elements];
    const ordered = [];

    const takeFromPool = (predicate) => {
        const idx = pool.findIndex(predicate);
        if (idx < 0) return null;
        const [item] = pool.splice(idx, 1);
        return item;
    };

    for (const ref of editorSnapshot) {
        if (ref?.type === 'group') {
            const gid = Number(ref?.groupId);
            let found = Number.isFinite(gid)
                ? takeFromPool(e => e?.type === 'group' && Number(e?.groupId) === gid)
                : null;
            if (!found) {
                found = takeFromPool(e => e?.type === 'group');
            }
            if (found) ordered.push(found);
            continue;
        }

        if (ref?.type === 'path' || ref?.type === 'polyline' || ref?.type === 'symmetry') {
            const cid = Number(ref?.contourId);
            let found = Number.isFinite(cid)
                ? takeFromPool(e => (e?.type === 'path' || e?.type === 'polyline' || e?.type === 'symmetry') && Number(e?.contourId) === cid)
                : null;
            if (!found) {
                found = takeFromPool(e => e?.type === 'path' || e?.type === 'polyline' || e?.type === 'symmetry');
            }
            if (found) ordered.push(found);
            continue;
        }

        if (ref?.type === 'circle' || ref?.type === 'rect' || ref?.type === 'ellipse') {
            const sid = String(ref?.segId ?? '');
            let found = sid
                ? takeFromPool(e => (e?.type === 'circle' || e?.type === 'rect' || e?.type === 'ellipse') && String(e?.segId ?? '') === sid)
                : null;
            if (!found) {
                found = takeFromPool(e => e?.type === ref?.type);
            }
            if (found) ordered.push(found);
        }
    }

    // Any new elements remaining in pool (not in the old snapshot) are inserted
    // intelligently:
    //   1. Source groups (linkType=null) are placed BEFORE their first child in ordered.
    //   2. Symmetry groups are placed AFTER their source group's last descendant.
    //   3. Everything else is appended at the end.
    if (pool.length > 0) {
        // Helper: index of the last element in `ordered` that belongs to group `gid`
        // (the group row itself or any element with parentGroupId===gid).
        const lastDescendantIdx = (gid) => {
            let last = -1;
            for (let i = 0; i < ordered.length; i++) {
                const e = ordered[i];
                if (e?.type === 'group' && Number(e?.groupId) === gid) { last = i; continue; }
                if (Number(e?.parentGroupId) === gid) last = i;
            }
            return last;
        };

        // Step 1: insert source groups before their first child currently in `ordered`.
        const srcGroupsInPool = pool.filter(e => e?.type === 'group' && String(e?.linkType ?? '') !== 'symmetry');
        for (const srcGroup of srcGroupsInPool) {
            const gid = Number(srcGroup?.groupId);
            const firstChildIdx = ordered.findIndex(e => Number(e?.parentGroupId) === gid);
            const pIdx = pool.indexOf(srcGroup);
            if (pIdx !== -1) pool.splice(pIdx, 1);
            if (firstChildIdx >= 0) {
                ordered.splice(firstChildIdx, 0, srcGroup);
            } else {
                ordered.push(srcGroup);
            }
        }

        // Step 2: insert sym groups (with their children) after their source group's last descendant.
        const symGroupsInPool = pool.filter(e => e?.type === 'group' && String(e?.linkType ?? '') === 'symmetry');
        for (const symGroup of symGroupsInPool) {
            const sourceGid = Number(symGroup?.sourceGroupId);
            const insertAt = Number.isFinite(sourceGid) ? lastDescendantIdx(sourceGid) : -1;
            // Collect this sym group's children from pool too.
            const children = pool.filter(e =>
                (e?.type === 'path' || e?.type === 'polyline' || e?.type === 'symmetry'
                    || e?.type === 'circle' || e?.type === 'rect' || e?.type === 'ellipse')
                && Number(e?.parentGroupId) === Number(symGroup.groupId)
            );
            const toInsert = [symGroup, ...children];
            for (const item of toInsert) {
                const idx = pool.indexOf(item);
                if (idx !== -1) pool.splice(idx, 1);
            }
            if (insertAt >= 0) {
                ordered.splice(insertAt + 1, 0, ...toInsert);
            } else {
                ordered.push(...toInsert);
            }
        }

        // Step 3: attach any remaining pooled children under already-ordered
        // parent groups (critical when parent group already existed in snapshot,
        // but new children appeared after symmetry rebuild).
        let moved;
        do {
            moved = false;
            for (let i = pool.length - 1; i >= 0; i--) {
                const item = pool[i];
                const parentGid = Number(item?.parentGroupId);
                if (!Number.isFinite(parentGid)) continue;
                const parentExists = ordered.some(e => e?.type === 'group' && Number(e?.groupId) === parentGid);
                if (!parentExists) continue;

                const [picked] = pool.splice(i, 1);
                const insertAt = lastDescendantIdx(parentGid);
                if (insertAt >= 0) ordered.splice(insertAt + 1, 0, picked);
                else ordered.push(picked);
                moved = true;
            }
        } while (moved);
    }

    const merged = [...ordered, ...pool];

    // Final guard: normalize by group hierarchy so every child is placed under
    // its parent group block even if editorSnapshot was already inconsistent.
    const groupById = new Map(
        merged
            .filter(e => e?.type === 'group' && Number.isFinite(Number(e?.groupId)))
            .map(g => [Number(g.groupId), g])
    );
    const childrenByParent = new Map();
    for (const item of merged) {
        const parentGid = Number(item?.parentGroupId);
        if (!Number.isFinite(parentGid) || !groupById.has(parentGid)) continue;
        if (!childrenByParent.has(parentGid)) childrenByParent.set(parentGid, []);
        childrenByParent.get(parentGid).push(item);
    }

    const normalized = [];
    const seen = new Set();
    const appendGroupBlock = (groupElem) => {
        if (!groupElem || seen.has(groupElem)) return;
        seen.add(groupElem);
        normalized.push(groupElem);
        const gid = Number(groupElem?.groupId);
        const children = childrenByParent.get(gid) ?? [];
        for (const child of children) {
            if (seen.has(child)) continue;
            if (child?.type === 'group') appendGroupBlock(child);
            else {
                seen.add(child);
                normalized.push(child);
            }
        }
    };

    for (const item of merged) {
        if (seen.has(item)) continue;
        const parentGid = Number(item?.parentGroupId);
        const hasValidParent = Number.isFinite(parentGid) && groupById.has(parentGid);
        if (hasValidParent) continue;
        if (item?.type === 'group') appendGroupBlock(item);
        else {
            seen.add(item);
            normalized.push(item);
        }
    }
    for (const item of merged) {
        if (seen.has(item)) continue;
        seen.add(item);
        normalized.push(item);
    }

    return normalized;
}

function _sanitizeEditorStateSegments(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return [];

    return segments.filter((seg) => {
        if (!seg) return false;
        if (seg.type === 'line' || seg.type === 'arc') {
            if (isSegmentDegenerated(seg)) return false;

            if (seg.type === 'arc') {
                const start = seg.data?.start ?? seg.start;
                const end = seg.data?.end ?? seg.end;
                if (start && end) {
                    const dx = Number(end.x) - Number(start.x);
                    const dy = Number(end.y) - Number(start.y);
                    const chord2 = dx * dx + dy * dy;
                    if (chord2 <= 1e-8) return false;
                }
            }
        }

        return true;
    });
}

/**
 * Resolve a token/expression to numeric value using current variables.
 * @param {string|number} token
 * @param {Record<string,number>} vars
 * @returns {number}
 */
function _resolveTokenNumber(token, vars) {
    return evaluateTokenWithVars(token, vars, Number.NaN);
}

/**
 * Restore shape formula tokens into state segment data when values are equivalent.
 * This keeps formulas visible in edit mode for circle/rect/ellipse parameters.
 *
 * @param {EditorStateManager} state
 * @param {Array<{type:string, segId:string|null, attrs:Record<string,string>}>} snapshot
 * @param {Record<string,number>} vars
 */
function _restoreShapeFormulasIntoState(state, snapshot, vars) {
    if (!state || !Array.isArray(snapshot) || snapshot.length === 0) return;

    const isFormula = (v) => isFormulaToken(v);
    const isEq = (a, b) => !Number.isNaN(a) && !Number.isNaN(b) && Math.abs(a - b) <= 1e-4;
    const shapeSegs = state.segments.filter(s => s.type === 'circle' || s.type === 'rect' || s.type === 'ellipse');
    if (shapeSegs.length === 0) return;

    const queues = new Map();
    for (const seg of shapeSegs) {
        const q = queues.get(seg.type) ?? [];
        q.push(seg);
        queues.set(seg.type, q);
    }

    const updates = [];
    for (const snap of snapshot) {
        const q = queues.get(snap.type) ?? [];
        const seg = q.shift();
        if (!seg) continue;

        const nextData = { ...(seg.data ?? {}) };
        const exprMap = { ...(nextData._expr ?? {}) };
        let changed = false;

        for (const [attr, token] of Object.entries(snap.attrs ?? {})) {
            if (!isFormula(token)) continue;
            const tokenVal = _resolveTokenNumber(token, vars);

            let currentVal = NaN;
            if (seg.type === 'circle') {
                if (attr === 'cx') currentVal = Number(seg.data?.center?.x);
                else if (attr === 'cy') currentVal = Number(seg.data?.center?.y);
                else if (attr === 'r') currentVal = Number(seg.data?.radius);
            } else {
                currentVal = Number(seg.data?.[attr]);
            }
            if (!isEq(tokenVal, currentVal)) continue;

            exprMap[attr] = token;
            changed = true;
            if (seg.type === 'circle' && attr === 'r') nextData.radiusExpr = token;
        }

        if (!changed) continue;
        nextData._expr = exprMap;
        updates.push({ id: seg.id, changes: { data: nextData } });
    }

    if (updates.length > 0) state.updateSegments(updates);
}

/**
 * Restore arc radius formulas from raw PathEditor contour lines into state.
 *
 * Why needed:
 * - PathEditor -> onChange imports evaluated contour path into state.
 * - During that import, `A` command radius token often becomes numeric.
 * - Symmetry sync mirrors state segments, so formula links are lost unless
 *   we re-attach equivalent radius tokens before mirroring.
 *
 * @param {EditorStateManager} state
 * @param {Array} sourceElements
 * @param {Record<string,number>} vars
 */
function _restoreContourFormulasIntoState(state, sourceElements, vars) {
    if (!state || !Array.isArray(sourceElements) || sourceElements.length === 0) return;

    const isEq = (a, b) => !Number.isNaN(a) && !Number.isNaN(b) && Math.abs(a - b) <= 1e-4;
    const parseCmd = (lineText) => {
        const text = String(lineText ?? '').trim();
        if (!text) return null;
        const cmd = text[0];
        if (!/[MmLlHhVvAaZz]/.test(cmd)) return null;
        const params = text.slice(1).trim().split(/[\s,]+/).filter(Boolean);
        return { cmd, cmdUpper: cmd.toUpperCase(), params };
    };

    const nextSegOfType = (queue, fromIdx, wantedType) => {
        let idx = fromIdx;
        while (idx < queue.length) {
            const seg = queue[idx];
            if (seg?.type === wantedType) return { seg, nextIdx: idx + 1 };
            idx++;
        }
        return { seg: null, nextIdx: queue.length };
    };

    const comparableForKey = (seg, key) => {
        if (seg?.type === 'line') {
            if (key === 'ex') return Number(seg?.data?.end?.x);
            if (key === 'ey') return Number(-Number(seg?.data?.end?.y));
            return Number.NaN;
        }
        if (seg?.type === 'arc') {
            if (key === 'rx' || key === 'ry' || key === 'r') {
                const v = Number(seg?.data?.radius);
                return Number.isFinite(v) ? v : Number(seg?.data?.[key]);
            }
            if (key === 'rot') return 0;
            if (key === 'large') return Number(seg?.data?.largeArc ?? 0);
            if (key === 'sweep') return Number(1 - Number(seg?.data?.sweep ?? 0));
            if (key === 'ex') return Number(seg?.data?.end?.x);
            if (key === 'ey') return Number(-Number(seg?.data?.end?.y));
            return Number.NaN;
        }
        return Number.NaN;
    };

    const arcByContour = new Map();
    for (const seg of state.segments) {
        if (seg?.type !== 'line' && seg?.type !== 'arc') continue;
        const cid = Number(seg?.contourId);
        if (!Number.isFinite(cid)) continue;
        const q = arcByContour.get(cid) ?? [];
        q.push(seg);
        arcByContour.set(cid, q);
    }

    const updates = [];

    for (const elem of sourceElements) {
        if (!(elem?.type === 'path' || elem?.type === 'polyline' || elem?.type === 'symmetry')) continue;
        const cid = Number(elem?.contourId);
        if (!Number.isFinite(cid)) continue;

        const segQueue = arcByContour.get(cid) ?? [];
        if (segQueue.length === 0) continue;
        let segIdx = 0;

        const lines = Array.isArray(elem?.lines) ? elem.lines : [];
        for (const line of lines) {
            const parsed = parseCmd(line?.text);
            if (!parsed) continue;

            const { cmdUpper, params } = parsed;
            if (cmdUpper === 'M') continue;

            let wantedType = null;
            if (cmdUpper === 'A') wantedType = 'arc';
            else if (cmdUpper === 'L' || cmdUpper === 'H' || cmdUpper === 'V' || cmdUpper === 'Z') wantedType = 'line';
            if (!wantedType) continue;

            const pick = nextSegOfType(segQueue, segIdx, wantedType);
            segIdx = pick.nextIdx;
            const seg = pick.seg;
            if (!seg) continue;

            if (cmdUpper === 'Z') continue;

            const map = [];
            if (cmdUpper === 'L') map.push(['ex', params[0]], ['ey', params[1]]);
            if (cmdUpper === 'H') map.push(['ex', params[0]]);
            if (cmdUpper === 'V') map.push(['ey', params[0]]);
            if (cmdUpper === 'A') {
                map.push(['rx', params[0]], ['ry', params[1]], ['rot', params[2]], ['large', params[3]], ['sweep', params[4]], ['ex', params[5]], ['ey', params[6]]);
            }

            if (map.length === 0) continue;

            const nextData = { ...(seg.data ?? {}) };
            const exprMap = { ...(nextData?._expr ?? {}) };
            let changed = false;

            for (const [key, rawToken] of map) {
                const token = String(rawToken ?? '').trim();
                if (!token || !isFormulaToken(token)) continue;
                const tokenVal = _resolveTokenNumber(token, vars);
                const currentVal = comparableForKey(seg, key);
                if (!isEq(tokenVal, currentVal)) continue;
                exprMap[key] = token;
                changed = true;
            }

            if (!changed) continue;
            nextData._expr = exprMap;
            if (seg.type === 'arc' && typeof exprMap.rx === 'string') {
                nextData.radiusExpr = exprMap.rx;
            }
            updates.push({ id: seg.id, changes: { data: nextData } });
        }
    }

    if (updates.length > 0) state.updateSegments(updates);
}

/**
 * Sync top-level element transforms from PathEditor into segment metadata
 * without modifying segment geometry.
 *
 * @param {EditorStateManager} state
 * @param {Array<{kind:'path'|'shape', contourId?:number, segId?:string, transforms:Array<object>}>} transformsMeta
 */
function _syncElementTransformsToState(state, transformsMeta, options = {}) {
    if (!state || !Array.isArray(transformsMeta)) return;
    const allowClear = options?.allowClear !== false;

    const normalize = (arr) => (Array.isArray(arr) ? arr : []).map(t => ({
        type: String(t?.type ?? '').toUpperCase(),
        raw: String(t?.raw ?? ''),
        params: Array.isArray(t?.params) ? [...t.params] : [],
    }));
    const readTransforms = (metaEntry) => {
        if (!metaEntry || !Array.isArray(metaEntry.transforms)) return null;
        const normalized = normalize(metaEntry.transforms);
        if (!allowClear && normalized.length === 0) return null;
        return normalized;
    };
    const same = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

    const updates = [];
    const metaPaths = transformsMeta.filter(m => m?.kind === 'path');
    const statePaths = state.getElements().filter(e => e.type === 'path' || e.type === 'polyline' || e.type === 'symmetry');

    const setKey = (arr) => [...new Set(arr.map(v => Number(v)).filter(Number.isFinite))]
        .sort((a, b) => a - b)
        .join('|');
    const stateCidKey = setKey(statePaths.map(e => e?.contourId));
    const metaCidKey = setKey(metaPaths.map(m => m?.contourId));
    const preferPositional = stateCidKey !== metaCidKey;

    for (let i = 0; i < statePaths.length; i++) {
        const elem = statePaths[i];
        const byContour = preferPositional
            ? null
            : metaPaths.find(m => Number(m?.contourId) === Number(elem?.contourId));
        const tr = readTransforms(byContour) ?? readTransforms(metaPaths[i]);
        if (!tr) continue;
        for (const seg of state.segments) {
            if ((seg.contourId ?? 0) !== (elem.contourId ?? 0)) continue;
            if (!same(seg.transforms, tr)) updates.push({ id: seg.id, changes: { transforms: tr } });
        }
    }

    const metaShapes = transformsMeta.filter(m => m?.kind === 'shape');
    const stateShapes = state.segments.filter(s => s.type === 'circle' || s.type === 'rect' || s.type === 'ellipse');
    for (let i = 0; i < stateShapes.length; i++) {
        const seg = stateShapes[i];
        const byId = metaShapes.find(m => typeof m.segId === 'string' && m.segId === seg.id);
        const tr = readTransforms(byId) ?? readTransforms(metaShapes[i]);
        if (!tr) continue;
        if (!same(seg.transforms, tr)) updates.push({ id: seg.id, changes: { transforms: tr } });
    }

    const metaGroups = transformsMeta.filter(m => m?.kind === 'group');
    if (Array.isArray(state.elementGroups) && metaGroups.length > 0) {
        state.elementGroups = state.elementGroups.map((g, i) => {
            const byId = metaGroups.find(m => Number(m?.groupId) === Number(g?.groupId));
            const tr = readTransforms(byId) ?? readTransforms(metaGroups[i]);
            if (!tr) return g;
            if (!same(g?.transforms, tr)) return { ...g, transforms: tr };
            return g;
        });
    }

    if (updates.length > 0) state.updateSegments(updates);
}

/**
 * Re-map imported contour IDs to the contour IDs from source structured elements.
 *
 * `_importPath()` regenerates contour IDs from M-order. Saved transforms are keyed
 * by persisted contour IDs from PathEditor structure, so regenerated IDs can map
 * transforms to wrong contours on edit enter.
 *
 * @param {EditorStateManager} state
 * @param {Array} sourceElements
 */
function _realignContourIdsToSourceOrder(state, sourceElements) {
    if (!state || !Array.isArray(sourceElements) || sourceElements.length === 0) return;

    const srcPathElems = sourceElements.filter(e => e?.type === 'path' || e?.type === 'polyline' || e?.type === 'symmetry');
    const curPathElems = state.getElements().filter(e => e?.type === 'path' || e?.type === 'polyline' || e?.type === 'symmetry');
    if (srcPathElems.length === 0 || curPathElems.length === 0) return;

    const oldToNew = new Map();
    const n = Math.min(srcPathElems.length, curPathElems.length);
    for (let i = 0; i < n; i++) {
        const oldCid = Number(curPathElems[i]?.contourId);
        const newCid = Number(srcPathElems[i]?.contourId);
        if (!Number.isFinite(oldCid) || !Number.isFinite(newCid)) continue;
        oldToNew.set(oldCid, newCid);
    }
    if (oldToNew.size === 0) return;

    state.segments = state.segments.map(seg => {
        const cid = Number(seg?.contourId ?? 0);
        if (!oldToNew.has(cid)) return seg;
        const mapped = oldToNew.get(cid);
        if (!Number.isFinite(mapped) || mapped === cid) return seg;
        return { ...seg, contourId: mapped };
    });

    const maxCid = Math.max(
        0,
        ...state.segments.map(s => Number(s?.contourId ?? 0)).filter(Number.isFinite)
    );
    state._nextContourId = Math.max(Number(state._nextContourId ?? 1), maxCid + 1);
}

/**
 * Restore per-contour link metadata (e.g. symmetry linkage) from structured elements.
 *
 * @param {EditorStateManager} state
 * @param {Array} sourceElements
 */
function _restoreContourLinkMetaFromElements(state, sourceElements) {
    if (!state || !Array.isArray(sourceElements) || sourceElements.length === 0) return;

    const byContour = new Map();
    const byShapeSegId = new Map();
    for (const elem of sourceElements) {
        if (!(elem?.type === 'path' || elem?.type === 'polyline' || elem?.type === 'symmetry')) continue;
        const cid = Number(elem?.contourId);
        if (!Number.isFinite(cid)) continue;
        byContour.set(cid, {
            linkType: elem.type === 'symmetry' ? 'symmetry' : null,
            parentContourId: _optFiniteId(elem?.parentContourId),
            axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
        });
    }
    for (const elem of sourceElements) {
        if (!(elem?.type === 'circle' || elem?.type === 'rect' || elem?.type === 'ellipse')) continue;
        const sid = String(elem?.segId ?? '').trim();
        if (!sid) continue;
        byShapeSegId.set(sid, {
            linkType: String(elem?.linkType ?? '') === 'symmetry' ? 'symmetry' : null,
            parentContourId: _optFiniteId(elem?.parentContourId),
            axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
        });
    }
    if (byContour.size === 0 && byShapeSegId.size === 0) return;

    let changed = false;
    state.segments = state.segments.map((seg) => {
        const cid = Number(seg?.contourId ?? 0);
        const meta = (seg?.type === 'circle' || seg?.type === 'rect' || seg?.type === 'ellipse')
            ? byShapeSegId.get(String(seg?.id ?? ''))
            : byContour.get(cid);
        if (!meta) return seg;

        const nextLinkType = meta.linkType === 'symmetry' ? 'symmetry' : undefined;
        const nextParent = meta.linkType === 'symmetry' ? meta.parentContourId : undefined;
        const nextAxis = meta.linkType === 'symmetry' ? (meta.axis ? JSON.parse(JSON.stringify(meta.axis)) : null) : undefined;

        const sameLink = String(seg?.linkType ?? '') === String(nextLinkType ?? '');
        const sameParent = Number(seg?.parentContourId) === Number(nextParent);
        const sameAxis = JSON.stringify(seg?.axis ?? null) === JSON.stringify(nextAxis ?? null);
        if (sameLink && sameParent && sameAxis) return seg;

        changed = true;
        return {
            ...seg,
            ...(nextLinkType ? { linkType: nextLinkType } : { linkType: undefined }),
            ...(nextLinkType ? { parentContourId: nextParent } : { parentContourId: undefined }),
            ...(nextLinkType ? { axis: nextAxis } : { axis: undefined }),
            ...(nextLinkType ? { selected: false } : {}),
        };
    });

    if (changed && typeof state._syncSymmetryContours === 'function') {
        state._syncSymmetryContours();
    }
}

/**
 * Sanitize external elements snapshot to avoid segId/contourId collisions.
 *
 * @param {Array} elements
 * @returns {Array}
 */
function _sanitizeElementsSnapshot(elements) {
    if (!Array.isArray(elements) || elements.length === 0) return [];

    const cloned = JSON.parse(JSON.stringify(elements));
    const usedSegIds = new Set();
    const usedContourIds = new Set();
    const usedGroupIds = new Set();
    const usedGroupGuids = new Set();

    const segNums = [];
    for (const elem of cloned) {
        const topSegId = String(elem?.segId ?? '').trim();
        if (topSegId) {
            const m = topSegId.match(/^seg-(\d+)$/i);
            if (m) segNums.push(Number(m[1]));
        }
        if (Array.isArray(elem?.segIds)) {
            for (const sid of elem.segIds) {
                const s = String(sid ?? '').trim();
                if (!s) continue;
                const m = s.match(/^line-(\d+)$/i);
                if (m) segNums.push(Number(m[1]));
            }
        }
        if (Array.isArray(elem?.lines)) {
            for (const line of elem.lines) {
                const s = String(line?.segId ?? '').trim();
                if (!s) continue;
                const m = s.match(/^line-(\d+)$/i);
                if (m) segNums.push(Number(m[1]));
            }
        }
        const guid = String(elem?.guid ?? '').trim();
        if (guid) usedGroupGuids.add(guid);
    }

    let nextSegNum = Math.max(1, ...segNums.filter(Number.isFinite).map(n => Math.floor(n) + 1));
    let nextContourId = Math.max(
        1,
        ...cloned
            .map(elem => Number(elem?.contourId))
            .filter(Number.isFinite)
            .map(n => Math.floor(n) + 1)
    );
    let nextGroupId = Math.max(
        1,
        ...cloned
            .map(elem => Number(elem?.groupId))
            .filter(Number.isFinite)
            .map(n => Math.floor(n) + 1)
    );

    const allocSegId = (candidate, prefix) => {
        const c = String(candidate ?? '').trim();
        if (c && !usedSegIds.has(c)) {
            usedSegIds.add(c);
            return c;
        }
        let id = `${prefix}-${nextSegNum++}`;
        while (usedSegIds.has(id)) id = `${prefix}-${nextSegNum++}`;
        usedSegIds.add(id);
        return id;
    };

    const allocContourId = (candidate) => {
        const c = Number(candidate);
        if (Number.isFinite(c) && !usedContourIds.has(c)) {
            usedContourIds.add(c);
            return c;
        }
        let id = nextContourId++;
        while (usedContourIds.has(id)) id = nextContourId++;
        usedContourIds.add(id);
        return id;
    };

    const allocGroupId = (candidate) => {
        const c = Number(candidate);
        if (Number.isFinite(c) && !usedGroupIds.has(c)) {
            usedGroupIds.add(c);
            return c;
        }
        let id = nextGroupId++;
        while (usedGroupIds.has(id)) id = nextGroupId++;
        usedGroupIds.add(id);
        return id;
    };

    const allocGroupGuid = (candidate) => {
        const c = String(candidate ?? '').trim();
        if (c && !usedGroupGuids.has(c)) {
            usedGroupGuids.add(c);
            return c;
        }
        let guid = `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        while (usedGroupGuids.has(guid)) {
            guid = `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        }
        usedGroupGuids.add(guid);
        return guid;
    };

    // Pre-pass: allocate groupIds for all group elements and build a remap
    // table so that parentGroupId references on ALL element types point to the
    // correct NEW ids after sanitisation.  Without this, nested groups would
    // retain stale parentGroupId values that no longer correspond to any groupId
    // in the sanitised snapshot, causing the hierarchy to appear flat on the
    // first canvas-triggered PathEditor rebuild.
    const groupIdRemap = new Map();
    const groupGuidRemap = new Map();
    for (const elem of cloned) {
        if (elem?.type !== 'group') continue;
        const oldId = Number(elem.groupId);
        if (!Number.isFinite(oldId)) continue;
        groupIdRemap.set(oldId, allocGroupId(oldId));
        groupGuidRemap.set(oldId, allocGroupGuid(elem.guid));
    }
    const remapGroupId = (oldId) => {
        const c = Number(oldId);
        return Number.isFinite(c) ? (groupIdRemap.get(c) ?? null) : null;
    };

    // Pre-pass: allocate contourIds and build contour remap so parentContourId
    // links (e.g. symmetry parent contour) stay valid after sanitisation.
    const contourIdRemap = new Map();
    for (const elem of cloned) {
        if (!(elem?.type === 'path' || elem?.type === 'polyline' || elem?.type === 'symmetry')) continue;
        const oldCid = Number(elem.contourId);
        if (!Number.isFinite(oldCid)) continue;
        contourIdRemap.set(oldCid, allocContourId(oldCid));
    }
    const remapContourId = (oldId) => {
        const c = Number(oldId);
        return Number.isFinite(c) ? (contourIdRemap.get(c) ?? null) : null;
    };

    return cloned.map((elem) => {
        if (!elem || typeof elem !== 'object') return elem;

        if (elem.type === 'group') {
            return {
                ...elem,
                groupId: groupIdRemap.get(Number(elem.groupId)) ?? allocGroupId(elem.groupId),
                guid: groupGuidRemap.get(Number(elem.groupId)) ?? allocGroupGuid(elem.guid),
                parentGroupId: remapGroupId(elem?.parentGroupId),
                sourceGroupId: remapGroupId(elem?.sourceGroupId),
                sourceGroupGuid: (() => {
                    const srcOld = Number(elem?.sourceGroupId);
                    if (Number.isFinite(srcOld) && groupGuidRemap.has(srcOld)) return groupGuidRemap.get(srcOld);
                    return String(elem?.sourceGroupGuid ?? '').trim();
                })(),
                name: String(elem?.name ?? ''),
            };
        }

        if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
            return {
                ...elem,
                segId: allocSegId(elem.segId, 'seg'),
                groupId: remapGroupId(elem?.groupId ?? elem?.parentGroupId),
                parentContourId: remapContourId(elem?.parentContourId),
                parentGroupId: remapGroupId(elem?.parentGroupId),
                linkType: String(elem?.linkType ?? '') === 'symmetry' ? 'symmetry' : null,
                axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
            };
        }

        if (elem.type === 'path' || elem.type === 'polyline' || elem.type === 'symmetry') {
            const contourId = contourIdRemap.get(Number(elem.contourId)) ?? allocContourId(elem.contourId);
            const lines = Array.isArray(elem.lines)
                ? elem.lines.map((line) => ({
                    ...(line ?? {}),
                    segId: allocSegId(line?.segId, 'line'),
                }))
                : [];

            let segIds = Array.isArray(elem.segIds)
                ? elem.segIds.map((sid) => allocSegId(sid, 'line'))
                : [];
            if (lines.length > 0) {
                segIds = lines.map((line) => line.segId);
            }

            return {
                ...elem,
                contourId,
                lines,
                segIds: [...new Set(segIds)],
                parentContourId: remapContourId(elem?.parentContourId),
                parentGroupId: remapGroupId(elem?.parentGroupId),
            };
        }

        return { ...elem };
    });
}

/**
 * Build evaluated contour-only path string from a PathEditor elements snapshot.
 * Shape rows are intentionally ignored (they are restored as shapes, not path).
 *
 * @param {Array} elements
 * @param {Record<string,number>} vars
 * @returns {string}
 */
function _buildEvaluatedContoursPathFromElements(elements, vars) {
    if (!Array.isArray(elements) || elements.length === 0) return "";

    const evalToken = (token) => {
        const t = String(token ?? "").trim();
        if (!t) return "";
        const direct = Number(t);
        if (!Number.isNaN(direct) && Number.isFinite(direct)) return String(direct);
        try {
            const expr = t.replace(VARIABLE_TOKEN_RE_GLOBAL, (_, name) => {
                const v = vars?.[name];
                return v !== undefined && !Number.isNaN(Number(v)) ? String(v) : "0";
            });
            const n = Number(evaluateMathExpression(expr));
            return Number.isNaN(n) ? t : String(n);
        } catch (_) {
            return t;
        }
    };

    const evalLine = (lineText) => {
        const text = String(lineText ?? "").trim();
        if (!text) return "";
        const cmd = text[0];
        if (!/[MmLlHhVvCcSsQqTtAaZz]/.test(cmd)) return text;
        if (cmd.toUpperCase() === "Z") return cmd;
        const params = text.slice(1).trim();
        if (!params) return cmd;
        const tokens = params.split(/[\s,]+/).filter(Boolean).map(evalToken);
        return `${cmd} ${tokens.join(" ")}`;
    };

    const contourParts = [];
    for (const elem of elements) {
        if (!(elem?.type === "path" || elem?.type === "polyline" || elem?.type === "symmetry")) continue;
        const lines = Array.isArray(elem.lines) ? elem.lines : [];
        if (lines.length > 0) {
            const part = lines
                .map((line) => evalLine(line?.text ?? ""))
                .filter(Boolean)
                .join(" ");
            if (part) contourParts.push(part);
            continue;
        }
        const flatPath = String(elem.path ?? "").trim();
        if (!flatPath) continue;
        const cmds = _splitCmds(flatPath);
        const part = cmds.map(evalLine).filter(Boolean).join(" ");
        if (part) contourParts.push(part);
    }

    return contourParts.join(" ");
}

/**
 * Restore standalone shape rows from PathEditor elements snapshot into state.
 * Keeps logic deterministic and minimal: no contour reordering heuristics.
 *
 * @param {EditorStateManager} state
 * @param {Array} elements
 * @param {{ resetHistoryBaseline?: boolean }} [options]
 */
function _restoreStateStructureFromElements(state, elements, { resetHistoryBaseline = true, vars = {} } = {}) {
    if (!state || !Array.isArray(elements)) return;
    if (elements.length === 0) {
        state.elementGroups = [];
        return;
    }

    const groupElems = elements.filter(e => e?.type === 'group');
    const shapeElems = elements.filter(e => e?.type === "circle" || e?.type === "rect" || e?.type === "ellipse");
    state.elementGroups = groupElems.map((g) => ({
        groupId: Number(g?.groupId),
        guid: String(g?.guid ?? ''),
        name: String(g?.name ?? ''),
        parentGroupId: _optFiniteId(g?.parentGroupId),
        transforms: Array.isArray(g?.transforms) ? g.transforms.map(t => ({ ...t })) : [],
        // Symmetry-group link metadata (persisted through save/restore cycle)
        linkType: g?.linkType ?? null,
        sourceGroupId: _optFiniteId(g?.sourceGroupId),
        sourceGroupGuid: String(g?.sourceGroupGuid ?? ''),
        axis: g?.axis ? JSON.parse(JSON.stringify(g.axis)) : null,
    })).filter(g => Number.isFinite(g.groupId));
    // Keep only contour segments in state; shape rows are restored from snapshot below.
    const contourMetaByCid = new Map(
        elements
            .filter(e => e?.type === 'path' || e?.type === 'polyline' || e?.type === 'symmetry')
            .map(e => [Number(e.contourId), {
                groupId: _optFiniteId(e?.groupId ?? e?.parentGroupId),
                parentGroupId: _optFiniteId(e?.parentGroupId ?? e?.groupId),
            }])
    );
    state.segments = state.segments
        .filter(s => s.type === 'line' || s.type === 'arc')
        .map((s) => {
            const meta = contourMetaByCid.get(Number(s.contourId));
            if (!meta) return { ...s, groupId: undefined, parentGroupId: undefined };
            return {
                ...s,
                groupId: Number.isFinite(_optFiniteId(meta.groupId)) ? _optFiniteId(meta.groupId) : undefined,
                parentGroupId: Number.isFinite(_optFiniteId(meta.parentGroupId)) ? _optFiniteId(meta.parentGroupId) : undefined,
            };
        });
    if (shapeElems.length === 0) {
        if (resetHistoryBaseline) {
            state._history = [{
                segments: state.segments.map(s => ({ ...s })),
                elementGroups: (state.elementGroups ?? []).map(g => ({ ...g })),
                description: "Import",
            }];
            state._historyIndex = 0;
        }
        return;
    }

    const existingIds = new Set(state.segments.map(s => String(s.id)));
    const normalizeTransforms = (arr) => (Array.isArray(arr) ? arr : []).map(t => ({
        type: String(t?.type ?? "").toUpperCase(),
        raw: String(t?.raw ?? ""),
        params: Array.isArray(t?.params) ? [...t.params] : [],
    }));

    const isFormulaToken = (value) => {
        const t = String(value ?? "").trim();
        if (!t) return false;
        const direct = Number(t);
        if (!Number.isNaN(direct) && Number.isFinite(direct)) return false;
        return /\{[^}]+\}/.test(t)
            || /[*/()]/.test(t)
            || (/[+\-]/.test(t) && !/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t));
    };

    const evalMaybeFormula = (token, fallback = 0) => {
        const raw = String(token ?? "").trim();
        if (!raw) return Number(fallback) || 0;
        if (!isFormulaToken(raw)) {
            const n = Number(raw);
            return Number.isFinite(n) ? n : (Number(fallback) || 0);
        }
        return _resolveTokenNumber(raw, vars);
    };

    const evalShapeData = (type, data) => {
        const src = { ...(data ?? {}) };
        const next = { ...src };
        const expr = src?._expr ?? {};

        if (type === 'circle') {
            const cxTok = expr.cx ?? src?.center?.x;
            const cyTok = expr.cy ?? src?.center?.y;
            const rTok = src?.radiusExpr ?? expr.r ?? src?.radius;

            const cx = evalMaybeFormula(cxTok, src?.center?.x ?? 0);
            const cy = evalMaybeFormula(cyTok, src?.center?.y ?? 0);
            const r = Math.abs(evalMaybeFormula(rTok, src?.radius ?? 0));

            next.center = {
                x: Number.isFinite(cx) ? cx : Number(src?.center?.x ?? 0),
                y: Number.isFinite(cy)
                    ? (isFormulaToken(cyTok)
                        ? shapeUiToStoredNumber('cy', cy, 'canvas')
                        : cy)
                    : Number(src?.center?.y ?? 0),
            };
            next.radius = Number.isFinite(r) ? r : Math.abs(Number(src?.radius ?? 0));

            const prevPt3 = src?.pt3;
            const dx = Number(prevPt3?.x) - next.center.x;
            const dy = Number(prevPt3?.y) - next.center.y;
            const ang = Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) > 1e-9
                ? Math.atan2(dy, dx)
                : 0;
            next.pt3 = {
                x: next.center.x + Math.cos(ang) * next.radius,
                y: next.center.y + Math.sin(ang) * next.radius,
            };
            return next;
        }

        if (type === 'rect') {
            const xTok = expr.x ?? src.x;
            const yTok = expr.y ?? src.y;
            const wTok = expr.w ?? src.w;
            const hTok = expr.h ?? src.h;
            const rxTok = expr.rx ?? src.rx;

            const x = evalMaybeFormula(xTok, src.x ?? 0);
            const y = evalMaybeFormula(yTok, src.y ?? 0);
            const w = evalMaybeFormula(wTok, src.w ?? 0);
            const h = evalMaybeFormula(hTok, src.h ?? 0);
            const rx = Math.abs(evalMaybeFormula(rxTok, src.rx ?? 0));

            next.x = Number.isFinite(x) ? x : Number(src.x ?? 0);
            next.y = Number.isFinite(y)
                ? (isFormulaToken(yTok)
                    ? shapeUiToStoredNumber('y', y, 'canvas')
                    : y)
                : Number(src.y ?? 0);
            next.w = Number.isFinite(w) ? w : Number(src.w ?? 0);
            next.h = Number.isFinite(h) ? h : Number(src.h ?? 0);
            next.dirW = Number(src?.dirW) < 0 ? -1 : 1;
            next.dirH = Object.prototype.hasOwnProperty.call(src ?? {}, 'dirH')
                ? (Number(src?.dirH) < 0 ? -1 : 1)
                : -1;
            next.rx = Number.isFinite(rx) ? rx : Math.abs(Number(src.rx ?? 0));
            return next;
        }

        if (type === 'ellipse') {
            const cxTok = expr.cx ?? src.cx;
            const cyTok = expr.cy ?? src.cy;
            const rxTok = expr.rx ?? src.rx;
            const ryTok = expr.ry ?? src.ry;

            const cx = evalMaybeFormula(cxTok, src.cx ?? 0);
            const cy = evalMaybeFormula(cyTok, src.cy ?? 0);
            const rx = Math.abs(evalMaybeFormula(rxTok, src.rx ?? 0));
            const ry = Math.abs(evalMaybeFormula(ryTok, src.ry ?? 0));

            next.cx = Number.isFinite(cx) ? cx : Number(src.cx ?? 0);
            next.cy = Number.isFinite(cy)
                ? (isFormulaToken(cyTok)
                    ? shapeUiToStoredNumber('cy', cy, 'canvas')
                    : cy)
                : Number(src.cy ?? 0);
            next.rx = Number.isFinite(rx) ? rx : Math.abs(Number(src.rx ?? 0));
            next.ry = Number.isFinite(ry) ? ry : Math.abs(Number(src.ry ?? 0));
            return next;
        }

        return next;
    };

    const segNumFromId = (id) => {
        const m = String(id ?? "").match(/^seg-(\d+)$/);
        return m ? Number(m[1]) : NaN;
    };

    const maxContourId = Math.max(0, ...state.segments.map(s => Number(s.contourId ?? 0)).filter(Number.isFinite));
    state._nextContourId = Math.max(state._nextContourId, maxContourId + 1);

    for (const elem of shapeElems) {
        const requestedId = typeof elem?.segId === "string" ? elem.segId : null;
        const canReuseId = !!requestedId && !existingIds.has(requestedId);
        const id = canReuseId ? requestedId : `seg-${state._nextSegmentId++}`;
        const segNum = segNumFromId(id);
        if (Number.isFinite(segNum)) {
            state._nextSegmentId = Math.max(state._nextSegmentId, segNum + 1);
        }

        // CRITICAL: Check parentContourId != null BEFORE Number() conversion.
        // Number(null) === 0, so null parentContourId would become 0 without this check,
        // causing standalone shapes to incorrectly embed in contour 0.
        const requestedParentCid = elem?.parentContourId != null ? Number(elem.parentContourId) : NaN;
        const hasParentContour = Number.isFinite(requestedParentCid);

        const seg = {
            id,
            selected: false,
            contourId: hasParentContour ? requestedParentCid : state._nextContourId++,
            type: elem.type,
            data: evalShapeData(elem.type, elem.data),
            transforms: normalizeTransforms(elem.transforms),
            ...(hasParentContour ? { parentContourId: requestedParentCid } : {}),
            ...(Number.isFinite(_optFiniteId(elem?.groupId ?? elem?.parentGroupId))
                ? { groupId: _optFiniteId(elem?.groupId ?? elem?.parentGroupId) }
                : {}),
            ...(Number.isFinite(_optFiniteId(elem?.parentGroupId)) ? { parentGroupId: _optFiniteId(elem.parentGroupId) } : {}),
            ...(String(elem?.linkType ?? '') === 'symmetry' ? { linkType: 'symmetry' } : {}),
            ...(String(elem?.linkType ?? '') === 'symmetry'
                ? { axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null }
                : {}),
        };
        state.segments.push(seg);
        existingIds.add(id);
    }

    if (resetHistoryBaseline) {
        state._history = [{
            segments: state.segments.map(s => ({ ...s })),
            elementGroups: (state.elementGroups ?? []).map(g => ({ ...g })),
            description: "Import",
        }];
        state._historyIndex = 0;
    }
}


/**
 * ProfileEditor — top-level orchestrator for the profile cross-section editor.
 *
 * Manages the full lifecycle of edit mode inside the bit modal:
 * 1. **Enter** (`enter()`) — switch UI from preview mode to editor mode:
 *    - Hide the preview zoom toolbar
 *    - Inject the editor toolbar below the canvas SVG
 *    - Initialize sub-components (EditorStateManager, EditorCanvas, EditorToolbar)
 * 2. **Edit** — user draws/edits segments; tools update EditorStateManager;
 *    EditorCanvas re-renders on each state change.
 * 3. **Exit** (`exit(save)`) — return to preview mode:
 *    - If `save=true`, serialize segments to SVG path and call `onSave(path)`
 *    - Restore the preview zoom toolbar
 *    - Tear down all sub-components
 *
 * ### Sub-component relationships
 * ```
 * ProfileEditor
 * ├── EditorStateManager   (mutable state: segments, tool, selection, history)
 * ├── EditorCanvas         (rendering + coordinate helpers, delegates to CanvasManager)
 * │   └── SnapManager      (snap computation)
 * └── EditorToolbar        (tool palette UI + keyboard shortcuts, injected below canvas)
 * ```
 *
 * ### Usage (from BitsManager)
 * ```js
 * const editor = new ProfileEditor();
 * editor.enter({
 *   modal,                          // the bit modal HTMLElement
 *   canvasManager,                  // the shared preview CanvasManager
 *   profilePath: bit.profilePath,   // initial SVG path string
 *   variableValues,                 // current formula variable values
 *   onSave: (newPath) => {          // called when user clicks Done
 *     bit.profilePath = newPath;
 *     updateBitPreview();
 *   },
 * });
 * ```
 */
export default class ProfileEditor {
    constructor() {
        /** @type {import("./EditorStateManager.js").default|null} */
        this.state = null;

        /** @type {import("./EditorCanvas.js").default|null} */
        this.editorCanvas = null;

        /** @type {import("./EditorToolbar.js").default|null} */
        this.toolbar = null;

        /** @type {import("../panel/PathEditor.js").default|null} */
        this._pathEditor = null;

        /** Row-index → segment-ID map (updated on every export). @type {Array<string|null>} */
        this._lineSegIds = [];

        /** Guard flag: true while we are pushing a path to PathEditor to prevent re-entry. @type {boolean} */
        this._syncingToPathEditor = false;

        /** Guard flag: true while a text-editor change is being processed (prevents setPath() round-trip). @type {boolean} */
        this._pathEditorIsSource = false;

        /** Guard flag: true after initial enter() sync is armed.
         *  If sync is invoked before that point, only lightweight ID/selection binding runs. @type {boolean} */
        this._initialSyncDone = false;

        /** Saved PathEditor.onChange before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnChange = null;

        /** Saved PathEditor.onLineClick before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnLineClick = null;
        /** Saved PathEditor.onElementOrderChange before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnElementOrderChange = null;
        /** Saved PathEditor.onShapeElementClick before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnShapeElementClick = null;
        /** Saved PathEditor.onPathElemClick before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnPathElemClick = null;
        /** Saved PathEditor.onGroupElemClick before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnGroupElemClick = null;
        /** Saved PathEditor.onToPathRequest before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnToPathRequest = null;
        /** Saved PathEditor.onDeactivate before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnDeactivate = null;

        /** Saved PathEditor.onDeleteSymmetryGroup before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnDeleteSymmetryGroup = null;
        /** Saved PathEditor.onConvertSymmetryGroup before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnConvertSymmetryGroup = null;

        /** The SVG <circle> dot drawn on the canvas overlay when an M row is selected in edit mode.
         *  Cleared when a segment is selected or edit mode exits. @type {SVGCircleElement|null} */
        this._mDotElement = null;

        /** Saved CanvasManager.config.onZoom before edit mode — restored on exit. @type {Function|null} */
        this._prevOnZoom = null;

        /** @type {boolean} */
        this._active = false;

        // Stored context for exit()
        /** @type {HTMLElement|null} */
        this._modal = null;
        /** @type {((path: string|null) => void)|null} */
        this._onSave = null;
        /** @type {(() => void)|null} */
        this._onClose = null;

        /** @type {((e: KeyboardEvent) => void)|null} */
        this._keyHandler = null;
        /** @type {((e: KeyboardEvent) => void)|null} */
        this._keyUpHandler = null;

        /**
         * The last path text seen from PathEditor (may contain {varname} formula tokens).
         * Updated ONLY when the text editor is the change source, so that formula tokens
         * survive canvas edits unchanged.
         * @type {string}
         */
        this._formulaPath = "";

        /** @type {Array} Structured snapshot captured on enter for cancel-restore. */
        this._entryElementsSnapshot = [];
        /** @type {Record<string, number>} Variable snapshot captured on enter for cancel-restore. */
        this._entryVariableValues = {};

        /** @type {'group'|'ungroup'|null} */
        this._pendingStructureAction = null;
        /** @type {((e: MouseEvent) => void)|null} */
        this._pendingStructureContextmenuHandler = null;
        /** @type {boolean} */
        this._forceExpandGroupSelection = false;

        /** @type {HTMLTextAreaElement|null} */
        this._debugLogEl = null;
        /** @type {number} */
        this._debugLogSeq = 0;
        /** @type {Map<string, number>} */
        this._debugLastTsByAction = new Map();
        /** @type {number} */
        this._debugLastTrimSeq = 0;

        /** @type {HTMLElement|null} */
        this._statusLogEl = null;
        /** @type {number|null} */
        this._statusFadeTimer = null;
        /** @type {string} */
        this._lastToolHintKey = '';
        /** @type {number} */
        this._lastSelectionCount = 0;

        /** Keep PathEditor structure on text-source updates (used by part editor integration). @type {boolean} */
        this._preservePathEditorStructure = false;

        /** @type {{
         *  getPreviewContainer: () => HTMLElement|null,
         *  getPreviewToolbar: () => HTMLElement|null,
         *  getDebugLogElement: () => HTMLTextAreaElement|null,
         *  onEditModeChange: (editMode: boolean) => void,
         * }|null} */
        this._host = null;
    }

    /** @returns {HTMLTextAreaElement|null} @private */
    _getDebugLogField() {
        if (!this._modal && !this._host) return null;
        if (this._debugLogEl && this._debugLogEl.isConnected) return this._debugLogEl;
        this._debugLogEl = this._host?.getDebugLogElement?.() ?? this._modal?.querySelector('#bit-profileDebugLog') ?? null;
        return this._debugLogEl;
    }

    /**
     * Append one line to profile debug log textarea.
     * @param {string} action
     * @param {object|null} [details=null]
     * @private
     */
    _debugLog(action, details = null) {
        const el = this._getDebugLogField();
        if (!el) return;

        // Skip ultra-frequent noisy events to keep the UI responsive while dragging.
        const now = performance.now();
        const throttleMs = (action === 'state.updateSegments' || action === 'state.syncSymmetryContours' || action === 'syncToPathEditor.canvas')
            ? 120
            : 0;
        if (throttleMs > 0) {
            const last = Number(this._debugLastTsByAction.get(action) ?? 0);
            if (now - last < throttleMs) return;
            this._debugLastTsByAction.set(action, now);
        }

        const time = new Date().toISOString().split('T')[1].replace('Z', '');
        this._debugLogSeq += 1;
        let line = `[${this._debugLogSeq}] ${time} ${action}`;
        if (details && typeof details === 'object') {
            try {
                line += ` ${JSON.stringify(details)}`;
            } catch (_) {
                // ignore serialization issues in debug channel
            }
        }
        el.value = el.value ? `${el.value}\n${line}` : line;
        // Hard cap debug textarea size: keep last ~400 lines.
        if (this._debugLogSeq - this._debugLastTrimSeq > 100) {
            const lines = el.value.split('\n');
            if (lines.length > 400) {
                el.value = lines.slice(-400).join('\n');
                this._debugLastTrimSeq = this._debugLogSeq;
            }
        }
        el.scrollTop = el.scrollHeight;
    }

    /** @param {HTMLElement|null} host @private */
    _ensureStatusLog(host) {
        if (!host) return;
        if (this._statusLogEl && this._statusLogEl.isConnected) return;
        const existing = host.querySelector('#editor-status-log');
        if (existing) {
            this._statusLogEl = existing;
            return;
        }
        const el = document.createElement('div');
        el.id = 'editor-status-log';
        el.className = 'editor-status-log';
        el.textContent = '';
        host.appendChild(el);
        this._statusLogEl = el;
    }

    /** @private */
    _resetStatusFade() {
        if (this._statusFadeTimer !== null) {
            window.clearTimeout(this._statusFadeTimer);
            this._statusFadeTimer = null;
        }
    }

    /**
     * @param {string} message
     * @param {{tone?:'info'|'warn', timeoutMs?:number, persist?:boolean}} [options]
     * @private
     */
    _showStatus(message, options = {}) {
        const el = this._statusLogEl;
        if (!el) return;
        const text = String(message ?? '').trim();
        if (!text) return;

        const tone = options?.tone === 'warn' ? 'warn' : 'info';
        const timeoutMs = Number.isFinite(Number(options?.timeoutMs)) ? Number(options.timeoutMs) : 2200;
        const persist = options?.persist === true;

        this._resetStatusFade();
        el.classList.remove('fade-out', 'editor-status-log--warn');
        if (tone === 'warn') el.classList.add('editor-status-log--warn');
        el.textContent = text;

        if (persist) return;

        this._statusFadeTimer = window.setTimeout(() => {
            if (!this._statusLogEl) return;
            this._statusLogEl.classList.add('fade-out');
            window.setTimeout(() => {
                if (!this._active) return;
                this._refreshToolHint(true);
            }, 520);
        }, Math.max(250, timeoutMs));
    }

    /** @param {{x:number,y:number}|null|undefined} a @param {{x:number,y:number}|null|undefined} b @returns {boolean} @private */
    _pointNear(a, b) {
        if (!a || !b) return false;
        const ax = Number(a.x);
        const ay = Number(a.y);
        const bx = Number(b.x);
        const by = Number(b.y);
        if (![ax, ay, bx, by].every(Number.isFinite)) return false;
        return Math.hypot(ax - bx, ay - by) <= 1e-6;
    }

    /** @param {Array<object>} contourSegs @returns {boolean} @private */
    _isClosedContour(contourSegs) {
        if (!Array.isArray(contourSegs) || contourSegs.length === 0) return false;
        const first = contourSegs[0]?.data?.start ?? null;
        const last = contourSegs[contourSegs.length - 1]?.data?.end ?? null;
        return this._pointNear(first, last);
    }

    /** @returns {{open:number, closed:number, total:number}} @private */
    _selectionCurveCounts() {
        if (!this.state) return { open: 0, closed: 0, total: 0 };

        const byId = new Map((this.state.segments ?? []).map((s) => [s.id, s]));
        const selectedContourIds = new Set();
        const selectedShapeIds = new Set();

        for (const id of (this.state.selectedIds ?? [])) {
            if (typeof id !== 'string') continue;
            if (id.startsWith('m:')) {
                const cid = Number(id.slice(2));
                if (Number.isFinite(cid)) selectedContourIds.add(cid);
                continue;
            }
            const seg = byId.get(id);
            if (!seg) continue;
            if (seg.type === 'line' || seg.type === 'arc') {
                const cid = Number(seg?.contourId);
                if (Number.isFinite(cid)) selectedContourIds.add(cid);
                continue;
            }
            if (seg.type === 'circle' || seg.type === 'rect' || seg.type === 'ellipse') {
                selectedShapeIds.add(String(seg.id));
            }
        }

        let open = 0;
        let closed = selectedShapeIds.size;
        for (const cid of selectedContourIds) {
            const contourSegs = (this.state.segments ?? []).filter((s) =>
                (s.type === 'line' || s.type === 'arc') && Number(s?.contourId) === cid,
            );
            if (contourSegs.length === 0) continue;
            if (this._isClosedContour(contourSegs)) closed += 1;
            else open += 1;
        }

        return { open, closed, total: open + closed };
    }

    /** @returns {string} @private */
    _selectionSummaryText() {
        const counts = this._selectionCurveCounts();
        if (counts.total <= 0) return '';
        if (counts.open > 0 && counts.closed === 0) {
            return `${counts.open} open curve${counts.open === 1 ? '' : 's'} selected`;
        }
        if (counts.closed > 0 && counts.open === 0) {
            return `${counts.closed} closed curve${counts.closed === 1 ? '' : 's'} selected`;
        }
        return `${counts.open} open, ${counts.closed} closed curves selected`;
    }

    /** @returns {{message:string,key:string}|null} @private */
    _describeToolHint() {
        const tool = this._currentTool;
        const toolId = String(this._currentToolId ?? '');
        if (!toolId) return null;

        const mode = String(tool?._mode ?? '');
        const phase = String(tool?._phase ?? '');
        const hasSel = (this.state?.selectedIds?.size ?? 0) > 0;
        const selFlag = hasSel ? '1' : '0';
        const key = `${toolId}|${mode}|${phase}|${tool?._startPoint ? 'active' : 'idle'}|${selFlag}`;

        // ─── Drawing tools ────────────────────────────────────────────────
        if (toolId === 'cursor') {
            return { key, message: 'Cursor: select objects with LMB/drag. Ctrl/Shift adds to selection.' };
        }
        if (toolId === 'line') {
            return {
                key,
                message: tool?._startPoint
                    ? 'Line: pick next point. RMB finishes polyline. Esc cancels.'
                    : 'Line: pick first point to start polyline.',
            };
        }
        if (toolId === 'arc' || toolId === 'arc3pt') {
            const phaseNum = Number(tool?._phase ?? 0);
            if (phaseNum <= 0) return { key, message: 'Arc: pick first point.' };
            if (phaseNum === 1) return { key, message: 'Arc: pick second point.' };
            return { key, message: 'Arc: pick third point or Enter to confirm radius.' };
        }
        if (toolId.startsWith('circle')) {
            const phaseNum = Number(tool?._phase ?? 0);
            if (phaseNum <= 0) return { key, message: 'Circle: pick first point/center.' };
            if (phaseNum === 1) return { key, message: 'Circle: pick radius point or second point.' };
            return { key, message: 'Circle: pick third point to finish.' };
        }
        if (toolId.startsWith('rect')) {
            const phaseNum = Number(tool?._phase ?? 0);
            if (phaseNum <= 0) return { key, message: 'Rectangle: pick first point/center.' };
            if (phaseNum === 1) return { key, message: 'Rectangle: pick opposite corner or width.' };
            return { key, message: 'Rectangle: pick height point to finish.' };
        }
        if (toolId.startsWith('ellipse')) {
            const phaseNum = Number(tool?._phase ?? 0);
            if (phaseNum <= 0) return { key, message: 'Ellipse: pick center.' };
            if (phaseNum === 1) return { key, message: 'Ellipse: pick first radius.' };
            return { key, message: 'Ellipse: pick second radius and finish.' };
        }

        // ─── Transform tools ─────────────────────────────────────────────
        if (toolId === 'move') {
            if (mode === 'selecting') {
                return { key, message: hasSel
                    ? 'Move: RMB to confirm selection, Esc to cancel.'
                    : 'Move: Select objects. RMB to confirm, Esc to cancel.' };
            }
            if (mode === 'pick-from') return { key, message: 'Move: Pick source point. LMB to set.' };
            if (mode === 'pick-to')   return { key, message: 'Move: Pick destination. Hold Ctrl to copy. LMB to apply.' };
        }
        if (toolId === 'rotate') {
            if (mode === 'selecting') {
                return { key, message: hasSel
                    ? 'Rotate: RMB to confirm selection, Esc to cancel.'
                    : 'Rotate: Select objects. RMB to confirm, Esc to cancel.' };
            }
            if (mode === 'pick-center') return { key, message: 'Rotate: Pick rotation center. LMB to set.' };
            if (mode === 'pick-ref')    return { key, message: 'Rotate: Pick reference point. LMB to set direction.' };
            if (mode === 'pick-to')     return { key, message: 'Rotate: Pick target point. Hold Ctrl to copy. LMB to apply.' };
        }
        if (toolId === 'mirror' || toolId === 'symmetry') {
            const label = toolId === 'symmetry' ? 'Symmetry' : 'Mirror';
            if (phase === 'selecting') {
                return { key, message: hasSel
                    ? `${label}: RMB to confirm selection, Esc to cancel.`
                    : `${label}: Select objects. RMB to confirm, Esc to cancel.` };
            }
            if (phase === 'pick-axis-start') return { key, message: `${label}: Pick axis start point. LMB to place.` };
            if (phase === 'pick-axis-end') {
                const copyHint = toolId === 'mirror' ? ' Hold Ctrl to copy.' : '';
                return { key, message: `${label}: Pick axis end point.${copyHint} LMB to apply.` };
            }
        }
        if (toolId === 'flip') {
            if (phase === 'selecting') {
                return { key, message: hasSel
                    ? 'Flip: RMB to preview direction, Esc to cancel.'
                    : 'Flip: Select objects. RMB to preview, Esc to cancel.' };
            }
            if (phase === 'preview') return { key, message: 'Flip: RMB to apply, Esc to adjust selection.' };
        }
        if (toolId === 'fillet') {
            return { key, message: 'Fillet: Click a corner to apply fillet. Esc to exit.' };
        }
        if (toolId === 'filletCorners') {
            if (phase === 'selection') {
                return { key, message: hasSel
                    ? 'Fillet corners: RMB to confirm selection, Esc to cancel.'
                    : 'Fillet corners: Select segments. RMB to confirm, Esc to cancel.' };
            }
            if (phase === 'pick-radius') return { key, message: 'Fillet corners: Move cursor or type radius. Enter to apply.' };
            if (phase === 'confirm')     return { key, message: 'Fillet corners: Enter to commit, Esc to adjust.' };
        }
        if (toolId === 'offset' || toolId === 'offsetMultiple' || toolId === 'clipperOffset' || toolId === 'clipperOffsetMultiple') {
            const label = toolId.startsWith('clipper') ? 'Offset (Clipper)' : 'Offset';
            if (phase === 'selecting') {
                return { key, message: hasSel
                    ? `${label}: RMB to confirm selection, Esc to cancel.`
                    : `${label}: Select objects. RMB to confirm, Esc to cancel.` };
            }
            if (phase === 'pickReference') return { key, message: `${label}: Pick offset side/reference point. LMB to set.` };
            if (phase === 'dynamic')       return { key, message: `${label}: Move cursor to set distance. LMB to confirm.` };
            if (phase === 'confirming')    return { key, message: `${label}: RMB to apply, Esc to adjust distance.` };
        }

        return { key, message: 'Use LMB to progress, RMB to confirm, Esc to cancel current tool.' };
    }

    /** @param {boolean} [force=false] @private */
    _refreshToolHint(force = false) {
        const hint = this._describeToolHint();
        if (!hint) return;
        const selectionText = this._selectionSummaryText();
        const message = selectionText ? `${hint.message} ${selectionText}` : hint.message;
        const renderKey = `${hint.key}|${selectionText}`;
        if (!force && renderKey === this._lastToolHintKey) return;
        this._lastToolHintKey = renderKey;
        this._showStatus(message, { persist: true });
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Enter edit mode.
     *
     * @param {object} context
     * @param {HTMLElement} context.modal                 - Bit modal root element
     * @param {import("../canvas/CanvasManager.js").default} context.canvasManager
     * @param {string}      [context.profilePath=""]      - Initial SVG path to edit
     * @param {Record<string, number>} [context.variableValues={}]
     * @param {(path: string) => void} context.onSave     - Called with new path on Done
    * @param {() => void}          [context.onClose]    - Called on both Done and Cancel after cleanup
    * @param {import("../panel/PathEditor.js").default|null} [context.pathEditor] - Optional PathEditor for bidirectional text sync
    * @param {object|null}         [context.host=null]  - Optional host adapter for non-modal integrations
    * @param {object|null}         [context.editorCanvasOptions=null] - EditorCanvas rendering options
    * @param {boolean}             [context.clearOverlayLayerOnEnter=true] - Clear shared overlay layer when entering
    * @param {boolean}             [context.preservePathEditorStructure=false] - Keep PathEditor row structure on text-originated sync
     */
    enter({
        modal,
        canvasManager,
        profilePath = "",
        profileElements = [],
        variableValues = {},
        onSave,
        onClose,
        pathEditor = null,
        host = null,
        editorCanvasOptions = null,
        clearOverlayLayerOnEnter = true,
        preservePathEditorStructure = false,
    }) {
        if (this._active) {
            log.warn("ProfileEditor.enter() called while already active");
            return;
        }
        this._active = true;
        this._modal = modal;
        this._host = this._buildHostAdapter(modal, host);
        this._onSave = onSave;
        this._onClose = onClose ?? null;
        this._pathEditor = pathEditor;
        this._preservePathEditorStructure = !!preservePathEditorStructure;
        this._debugLogEl = this._host.getDebugLogElement();
        this._debugLogSeq = 0;
        const sourceElementsRaw = Array.isArray(profileElements) && profileElements.length > 0
            ? profileElements
            : (pathEditor?.getElementsDebugSnapshot?.() ?? []);
        const sourceElements = _sanitizeElementsSnapshot(sourceElementsRaw);
        this._entryElementsSnapshot = JSON.parse(JSON.stringify(sourceElements ?? []));
        this._entryVariableValues = { ...(variableValues ?? {}) };
        const hasStructuredSource = Array.isArray(sourceElements) && sourceElements.length > 0;
        const evaluatedContoursPath = _buildEvaluatedContoursPathFromElements(sourceElements, variableValues);
        this._formulaPath = pathEditor?.getContoursRawPath?.()
            || evaluatedContoursPath
            || (hasStructuredSource ? "" : profilePath);
        const shapeFormulaSnapshot = pathEditor?.getShapeParamSnapshot?.() ?? [];

        log.info("Entering profile edit mode");
        this._debugLog('enter', {
            hasStructuredSource,
            sourceElements: Array.isArray(sourceElements) ? sourceElements.length : 0,
            profilePathLen: String(profilePath ?? '').length,
        });

        // 1. Initialize state
        this.state = new EditorStateManager({
            profilePath: hasStructuredSource ? evaluatedContoursPath : (evaluatedContoursPath || profilePath),
            variableValues,
        });
        if (hasStructuredSource) {
            _realignContourIdsToSourceOrder(this.state, sourceElements);
        }

        // DEBUG: Log transforms before restore
        const shapesBeforeRestore = sourceElements.filter(e => e.type === 'circle' || e.type === 'rect' || e.type === 'ellipse');
        log.debug("Shapes in sourceElements before restore:", shapesBeforeRestore.map(s => ({
            segId: s.segId,
            transforms: s.transforms
        })));

        _restoreStateStructureFromElements(this.state, sourceElements, {
            vars: variableValues,
        });

        // DEBUG: Log transforms after restore, before sync
        const shapesAfterRestore = this.state.segments.filter(s => s.type === 'circle' || s.type === 'rect' || s.type === 'ellipse');
        log.debug("Shapes in state after restore:", shapesAfterRestore.map(s => ({
            id: s.id,
            transforms: s.transforms
        })));

        _restoreContourLinkMetaFromElements(this.state, sourceElements);
        _restoreContourFormulasIntoState(this.state, sourceElements, variableValues);
        _restoreShapeFormulasIntoState(this.state, shapeFormulaSnapshot, variableValues);

        // DEBUG: Log transforms from pathEditor before sync
        const pathEditorTransforms = pathEditor?.getElementTransformsSnapshot?.() ?? [];
        log.debug("Transforms from pathEditor.getElementTransformsSnapshot():", pathEditorTransforms);

        _syncElementTransformsToState(this.state, pathEditorTransforms, { allowClear: false });

        // DEBUG: Log transforms after sync
        const shapesAfterSync = this.state.segments.filter(s => s.type === 'circle' || s.type === 'rect' || s.type === 'ellipse');
        log.debug("Shapes in state after sync:", shapesAfterSync.map(s => ({
            id: s.id,
            transforms: s.transforms
        })));

        this.state.onDebugLog = (entry) => {
            this._debugLog(`state.${String(entry?.event ?? 'event')}`, entry);
        };

        // 2. Initialize canvas extension
        this.editorCanvas = new EditorCanvas(
            canvasManager,
            this.state,
            editorCanvasOptions || undefined,
        );
        this.editorCanvas.initialize();

        // 3. Clear stale preview overlays (anchor cross, segment highlights) that
        // drawAnchorAndAxis() left on the overlay layer before edit mode was entered.
        if (clearOverlayLayerOnEnter) {
            const overlayLayer = canvasManager.getLayer("overlay");
            if (overlayLayer) overlayLayer.innerHTML = "";
        }

        // 4. Wire PathEditor bidirectional callbacks (preserves formula tokens).
        if (pathEditor) this._setupPathEditorCallbacks(pathEditor);

        // 5. Wire state → canvas re-render + PathEditor sync.
        this.state.onSegmentsChange = () => {
            this.editorCanvas.renderAllSegments(this.state.segments);
            this._syncToPathEditor();
        };

        // Selection change: re-render canvas + sync PathEditor row highlighting.
        this.state.onSelectionChange = () => {
            this.editorCanvas.renderAllSegments(this.state.segments);
            this._syncPathEditorSelectionOnly();
            const count = Number(this.state?.selectedIds?.size ?? 0);
            this._lastSelectionCount = count;
            this._refreshToolHint(true);
        };

        // 6. Initial render.
        // Use the same sync pipeline as normal edit updates so preview/edit stay unified.
        this.editorCanvas.renderAllSegments(this.state.segments);
        this._initialSyncDone = true;
        if (hasStructuredSource) {
            this._bindPathEditorSegmentIdsOnly();
            this._pathEditor?.syncHiddenInputsFromElements?.();
        } else {
            this._syncToPathEditor();
        }

        // If editor was entered from plain path text (no structured source snapshot),
        // capture the fully built structure now so Cancel can always restore it.
        if (this._pathEditor && (!Array.isArray(this._entryElementsSnapshot) || this._entryElementsSnapshot.length === 0)) {
            this._entryElementsSnapshot = JSON.parse(JSON.stringify(this._pathEditor.getElementsDebugSnapshot?.() ?? []));
        }

        // 7. Re-draw M-dot at updated scale whenever the user zooms/pans.
        // The dot radius is zoom-dependent (3px screen = 3/zoom SVG units),
        // so we must recreate it on every zoom change.
        this._prevOnZoom = canvasManager.config.onZoom;
        canvasManager.config.onZoom = (zoom, panX, panY) => {
            if (this._prevOnZoom) this._prevOnZoom(zoom, panX, panY);
            this.editorCanvas?.refreshAxis?.();
            this._currentTool?.onViewportChanged?.({ zoom, panX, panY });
            for (const id of (this.state?.selectedIds ?? new Set())) {
                if (typeof id === 'string' && id.startsWith('m:')) {
                    this._showMDotForContour(Number(id.slice(2)));
                    break;
                }
                // Refresh shape start dot on zoom
                const seg = this.state.segments.find(s => s.id === id);
                if (seg && (seg.type === 'circle' || seg.type === 'rect' || seg.type === 'ellipse')) {
                    this._showShapeStartDot(seg);
                    break;
                }
            }
        };

        // 8. Mount toolbar
        const previewContainer = this._host.getPreviewContainer();
        this.toolbar = new EditorToolbar(previewContainer, {
            onToolChange: (toolId) => {
                if (toolId === "group") {
                    this.toolbar?.setActiveTool?.("group");
                    if (this._pathEditor?.canGroupSelection?.()) this._applyPathEditorGroupAction();
                    else this._armPendingStructureAction('group');
                    return;
                }
                if (toolId === "ungroup") {
                    this.toolbar?.setActiveTool?.("ungroup");
                    if (this._pathEditor?.canUngroupSelection?.()) this._applyPathEditorUngroupAction();
                    else this._armPendingStructureAction('ungroup');
                    return;
                }
                this._clearPendingStructureAction();
                // If Escape wants to switch to cursor while we’re in the middle of an
                // operation (e.g. moving objects), cancel the operation but stay on the
                // current tool rather than switching to cursor.
                if (toolId === "cursor" && this._currentTool?.hasActiveCommand()) {
                    const consumed = this._currentTool.onKeyDown({ key: "Escape", preventDefault() { }, stopPropagation() { } });
                    if (consumed) return;
                }
                // Always keep selection when switching tools — clearing only happens
                // on an empty-space click (CursorTool) or Escape in cursor mode.
                this.state.setTool(toolId, { preserveSelection: true });
                this.toolbar.setActiveTool(toolId);
                this._activateTool(toolId);
                if (toolId !== "cursor") this._lastDrawToolId = toolId;
                this._refreshToolHint(true);
            },
            onDone: () => this.exit(true),
            onCancel: () => this.exit(false),
            onSnapChange: (type, active) => {
                this.editorCanvas.snapManager.setEnabled(type, active);
            },
            onGridSizeChange: (size) => {
                this.editorCanvas.snapManager.setGridSize(size);
            },
        });
        this.toolbar.mount();
        this._ensureStatusLog(previewContainer);
        this.toolbar.setActiveTool("cursor");

        // 9. Switch DOM to editor layout
        this._applyEditLayout(true);

        // 10. Register undo/redo keyboard shortcut
        this._registerKeyboard();

        // 11. Activate canvas mouse events for the current tool
        this._activateTool("cursor");
        this._refreshToolHint(true);
    }

    /**
     * Execute Group action against the current PathEditor selection.
     * @private
     */
    _applyPathEditorGroupAction() {
        if (!this._pathEditor) return;
        this._clearPendingStructureAction();
        this._pathEditor.groupSelection?.();
    }

    /**
     * Execute Ungroup action against the current PathEditor selection.
     * @private
     */
    _applyPathEditorUngroupAction() {
        if (!this._pathEditor) return;
        this._clearPendingStructureAction();
        this._pathEditor.ungroupSelection?.();
    }

    /**
     * Arm delayed Group/Ungroup action, confirmed by RMB.
     * @param {'group'|'ungroup'} action
     * @private
     */
    _armPendingStructureAction(action) {
        if (!this._modal) return;
        this._clearPendingStructureAction();
        this._pendingStructureAction = action;
        this._pendingStructureContextmenuHandler = (e) => {
            if (!this._pendingStructureAction) return;
            e.preventDefault();
            e.stopPropagation();
            if (this._pendingStructureAction === 'group') {
                if (this._pathEditor?.canGroupSelection?.()) this._applyPathEditorGroupAction();
                else this._clearPendingStructureAction();
                return;
            }
            if (this._pendingStructureAction === 'ungroup') {
                if (this._pathEditor?.canUngroupSelection?.()) this._applyPathEditorUngroupAction();
                else this._clearPendingStructureAction();
            }
        };
        this._modal.addEventListener('contextmenu', this._pendingStructureContextmenuHandler, true);
    }

    /** @private */
    _clearPendingStructureAction() {
        const hadPending = !!this._pendingStructureAction;
        this._pendingStructureAction = null;
        if (this._modal && this._pendingStructureContextmenuHandler) {
            this._modal.removeEventListener('contextmenu', this._pendingStructureContextmenuHandler, true);
        }
        this._pendingStructureContextmenuHandler = null;
        if (hadPending) this.toolbar?.setActiveTool?.('cursor');
    }

    /**
     * Exit edit mode.
     * @param {boolean} save - If true, serialize and call onSave(); if false, discard changes.
     */
    exit(save) {
        if (!this._active) return;
        this._active = false;

        log.info(`Exiting profile edit mode (save=${save})`);

        // Tear down sub-components (must happen BEFORE onSave / onClose so
        // that updateBitPreview() triggered inside onSave doesn't fire back
        // through our custom onChange handler and cause an infinite loop).
        this._currentTool?.deactivate();
        this._currentTool = null;

        this._unbindCanvasEvents();
        this._clearPendingStructureAction();

        // Restore PathEditor callbacks BEFORE calling onSave, so that any
        // updateBitPreview() call inside onSave uses the original onChange
        // (not the editor's _importPath handler).
        if (this._pathEditor) {
            this._clearMDot();
            this._pathEditor.onChange = this._origPathEditorOnChange ?? (() => { });
            this._pathEditor.onLineClick = this._origPathEditorOnLineClick ?? null;
            this._pathEditor.onElementOrderChange = this._origPathEditorOnElementOrderChange ?? null;
            this._pathEditor.onShapeElementChange = null;
            this._pathEditor.onShapeElementClick = this._origPathEditorOnShapeElementClick ?? null;
            this._pathEditor.onPathElemClick = this._origPathEditorOnPathElemClick ?? null;
            this._pathEditor.onGroupElemClick = this._origPathEditorOnGroupElemClick ?? null;
            this._pathEditor.onToPathRequest = this._origPathEditorOnToPathRequest ?? null;
            this._pathEditor.onDeactivate = this._origPathEditorOnDeactivate ?? null;
            this._pathEditor.onDeleteSymmetryGroup = this._origPathEditorOnDeleteSymmetryGroup ?? null;
            this._pathEditor.onConvertSymmetryGroup = this._origPathEditorOnConvertSymmetryGroup ?? null;
            this._pathEditor.onStatusMessage = null;
            this.state.activeContourId = null;
            this.state.insertAfterSegId = null;
            this._pathEditor.setShapeElements([]);
            this._pathEditor.clearLineSelection();
            this._pathEditor.clearShapeSelection?.();

            if (!save && Array.isArray(this._entryElementsSnapshot)) {
                const restoreElements = JSON.parse(JSON.stringify(this._entryElementsSnapshot));
                this._pathEditor.setElements(restoreElements);
                this._pathEditor.setVariableValues?.({ ...(this._entryVariableValues ?? {}) });
                this._pathEditor.syncHiddenInputsFromElements?.();
            }

            this._pathEditor = null;
        }
        this._lineSegIds = [];

        if (save && this._onSave) {
            // If no edits were made (canUndo = false), pass null so the caller can
            // preserve any formula text in the raw path input instead of overwriting.
            const path = this.state.canUndo() ? this.state.exportPath() : null;
            this._onSave(path);
        }

        this.toolbar?.unmount();
        this.toolbar = null;

        // Restore the CanvasManager onZoom callback.
        if (this.editorCanvas?.cm) {
            this.editorCanvas.cm.config.onZoom = this._prevOnZoom ?? null;
        }
        this._prevOnZoom = null;

        this.editorCanvas?.destroy();
        this.editorCanvas = null;

        this.state = null;
        this._debugLogEl = null;
        this._debugLogSeq = 0;
        this._initialSyncDone = false;
        this._entryElementsSnapshot = [];
        this._entryVariableValues = {};
        this._preservePathEditorStructure = false;
        this._lastSelectionCount = 0;
        this._lastToolHintKey = '';
        this._resetStatusFade();
        this._statusLogEl = null;

        // Restore keyboard
        if (this._keyHandler) {
            window.removeEventListener("keydown", this._keyHandler);
            this._keyHandler = null;
        }
        if (this._keyUpHandler) {
            window.removeEventListener("keyup", this._keyUpHandler);
            this._keyUpHandler = null;
        }

        // Restore DOM to preview layout
        this._applyEditLayout(false);

        const onClose = this._onClose;
        this._modal = null;
        this._host = null;
        this._onSave = null;
        this._onClose = null;
        // Always notify the caller so it can restore preview rendering
        onClose?.();
    }

    /** @returns {boolean} */
    get isActive() { return this._active; }
    // ─── PathEditor integration ─────────────────────────────────────────────────────

    /**
     * Install all PathEditor callbacks for the duration of an edit session.
     *
     * Saves the original `onChange` and `onLineClick` handlers so they can be
     * restored by `exit()`.  All six callbacks are wired here to keep `enter()`
     * as a clean orchestrator.
     *
     * Callback responsibilities:
     * - `onChange`           — text-editor change → re-import path into state
     * - `onLineClick`        — row click (L/A/M) → select segment on canvas
     * - `onShapeElementChange` — shape attribute edit → update matching segment
     * - `onShapeElementClick`  — shape row click → select shape segment
     * - `onPathElemClick`    — path header click → select all path segments
    * - `onToPathRequest`    — convert selected shape rows to path segments
     * - `onDeactivate`       — background click → clear canvas selection
     *
     * @param {import("../panel/PathEditor.js").default} pathEditor
     * @private
     */
    _setupPathEditorCallbacks(pathEditor) {
        // Save the original handlers so exit() can restore them.
        // We do NOT invoke them while editing (prevents updateBitPreview from
        // overwriting the editor’s line segments in the bits layer).
        this._origPathEditorOnChange = pathEditor.onChange;
        this._origPathEditorOnLineClick = pathEditor.onLineClick;
        this._origPathEditorOnElementOrderChange = pathEditor.onElementOrderChange;
        this._origPathEditorOnShapeElementClick = pathEditor.onShapeElementClick;
        this._origPathEditorOnPathElemClick = pathEditor.onPathElemClick;
        this._origPathEditorOnGroupElemClick = pathEditor.onGroupElemClick;
        this._origPathEditorOnToPathRequest = pathEditor.onToPathRequest;
        this._origPathEditorOnDeactivate = pathEditor.onDeactivate;
        this._origPathEditorOnDeleteSymmetryGroup = pathEditor.onDeleteSymmetryGroup ?? null;
        this._origPathEditorOnConvertSymmetryGroup = pathEditor.onConvertSymmetryGroup ?? null;
        pathEditor.onStatusMessage = (message, meta = {}) => {
            const tone = meta?.tone === 'warn' ? 'warn' : 'info';
            this._showStatus(String(message ?? ''), { tone });
        };

        pathEditor.onElementOrderChange = (order) => {
            if (!Array.isArray(order) || !this.state) return;
            this._debugLog('pathEditor.onElementOrderChange.start', {
                orderItems: order.length,
                stateSegments: this.state.segments.length,
                stateGroups: (this.state.elementGroups ?? []).length,
            });
            const used = new Set();
            const reordered = [];
            const orderedGroups = [];
            const lineArcContours = new Set(
                this.state.segments
                    .filter(s => s.type === 'line' || s.type === 'arc')
                    .map(s => Number(s.contourId ?? 0))
            );

            const allocStandaloneContourId = () => {
                const usedCids = new Set(this.state.segments.map(s => Number(s.contourId ?? 0)).filter(Number.isFinite));
                let nextCid = Math.max(Number(this.state._nextContourId ?? 1), 1);
                while (usedCids.has(nextCid)) nextCid++;
                this.state._nextContourId = nextCid + 1;
                return nextCid;
            };

            for (const item of order) {
                if (item?.kind === 'group') {
                    const gid = Number(item?.groupId);
                    if (!Number.isFinite(gid)) continue;
                    orderedGroups.push({
                        groupId: gid,
                        guid: String(item?.guid ?? ''),
                        name: String(item?.name ?? `Group ${gid}`),
                        parentGroupId: _optFiniteId(item?.parentGroupId),
                        transforms: Array.isArray(item?.transforms) ? item.transforms.map(t => ({ ...t })) : [],
                        linkType: item?.linkType ?? null,
                        sourceGroupId: _optFiniteId(item?.sourceGroupId),
                        sourceGroupGuid: String(item?.sourceGroupGuid ?? ''),
                        axis: item?.axis ? JSON.parse(JSON.stringify(item.axis)) : null,
                    });
                    continue;
                }

                if (item?.kind === 'contour') {
                    const cid = Number(item.contourId);
                    const parentGroupId = _optFiniteId(item?.parentGroupId);
                    const group = this.state.segments.filter(s =>
                        !used.has(s.id)
                        && (s.contourId ?? 0) === cid
                        && (s.type === 'line' || s.type === 'arc')
                    );
                    for (const seg of group) {
                        reordered.push({
                            ...seg,
                            ...(Number.isFinite(parentGroupId)
                                ? { groupId: parentGroupId, parentGroupId }
                                : { groupId: undefined, parentGroupId: undefined }),
                        });
                        used.add(seg.id);
                    }
                } else if (item?.kind === 'shape' && typeof item.segId === 'string') {
                    const seg = this.state.segments.find(s => !used.has(s.id) && s.id === item.segId);
                    if (seg) {
                        const parentGroupId = _optFiniteId(item?.parentGroupId);
                        const shapeGroupId = _optFiniteId(item?.groupId ?? item?.parentGroupId);
                        const shapeLinkType = String(item?.linkType ?? '') === 'symmetry'
                            ? 'symmetry'
                            : (String(seg?.linkType ?? '') === 'symmetry' ? 'symmetry' : null);
                        const shapeAxis = shapeLinkType === 'symmetry'
                            ? (item?.axis
                                ? JSON.parse(JSON.stringify(item.axis))
                                : (seg?.axis ? JSON.parse(JSON.stringify(seg.axis)) : null))
                            : undefined;
                        const linkFields = shapeLinkType === 'symmetry'
                            ? { linkType: 'symmetry', axis: shapeAxis }
                            : { linkType: undefined, axis: undefined };
                        const desiredParent = Number(item?.parentContourId);
                        const hasDesiredParent = Number.isFinite(desiredParent);
                        let nextSeg = seg;
                        if (hasDesiredParent) {
                            nextSeg = {
                                ...seg,
                                contourId: desiredParent,
                                parentContourId: desiredParent,
                                ...(Number.isFinite(shapeGroupId)
                                    ? { groupId: shapeGroupId, parentGroupId: Number.isFinite(parentGroupId) ? parentGroupId : shapeGroupId }
                                    : { groupId: undefined, parentGroupId: undefined }),
                                ...linkFields,
                            };
                        } else {
                            const currentCid = Number(seg.contourId ?? 0);
                            const currentlyEmbedded = Number.isFinite(_optFiniteId(seg?.parentContourId));
                            if (currentlyEmbedded || lineArcContours.has(currentCid)) {
                                const standaloneCid = allocStandaloneContourId();
                                nextSeg = {
                                    ...seg,
                                    contourId: standaloneCid,
                                    parentContourId: undefined,
                                    ...(Number.isFinite(shapeGroupId)
                                        ? { groupId: shapeGroupId, parentGroupId: Number.isFinite(parentGroupId) ? parentGroupId : shapeGroupId }
                                        : { groupId: undefined, parentGroupId: undefined }),
                                    ...linkFields,
                                };
                            } else {
                                nextSeg = {
                                    ...seg,
                                    parentContourId: undefined,
                                    ...(Number.isFinite(shapeGroupId)
                                        ? { groupId: shapeGroupId, parentGroupId: Number.isFinite(parentGroupId) ? parentGroupId : shapeGroupId }
                                        : { groupId: undefined, parentGroupId: undefined }),
                                    ...linkFields,
                                };
                            }
                        }
                        reordered.push(nextSeg);
                        used.add(seg.id);
                    }
                }
            }
            const tail = this.state.segments.filter(s => !used.has(s.id));
            let next = [...reordered, ...tail];

            // Invariant: non-symmetry segments must never live inside a symmetry group.
            // If UI order payload places them there, remap back to source group.
            const symToSource = new Map(
                orderedGroups
                    .filter(g => String(g?.linkType ?? '') === 'symmetry')
                    .map(g => [Number(g?.groupId), _optFiniteId(g?.sourceGroupId)])
            );
            if (symToSource.size > 0) {
                next = next.map((seg) => {
                    if (String(seg?.linkType ?? '') === 'symmetry') return seg;
                    const gid = _optFiniteId(seg?.groupId);
                    const pgid = _optFiniteId(seg?.parentGroupId);
                    const badGid = Number.isFinite(gid) && symToSource.has(Number(gid));
                    const badPgid = Number.isFinite(pgid) && symToSource.has(Number(pgid));
                    if (!badGid && !badPgid) return seg;
                    const src = badGid
                        ? symToSource.get(Number(gid))
                        : symToSource.get(Number(pgid));
                    if (!Number.isFinite(src)) {
                        return { ...seg, groupId: undefined, parentGroupId: undefined };
                    }
                    return { ...seg, groupId: src, parentGroupId: src };
                });
            }

            const sig = (arr) => arr.map(s => `${s.id}:${Number(s.contourId ?? 0)}:${Number(s?.parentContourId ?? NaN)}:${Number(s?.parentGroupId ?? NaN)}`).join('|');
            const groupsSig = (arr) => arr.map(g => [
                Number(g?.groupId),
                String(g?.name ?? ''),
                Number(g?.parentGroupId ?? NaN),
                String(g?.linkType ?? ''),
                Number(g?.sourceGroupId ?? NaN),
                String(g?.sourceGroupGuid ?? ''),
            ].join(':')).join('|');
            const changed = sig(this.state.segments) !== sig(next)
                || groupsSig(this.state.elementGroups ?? []) !== groupsSig(orderedGroups);
            if (!changed) return;

            this._pathEditorIsSource = true;
            this.state.segments = next;
            this.state.elementGroups = orderedGroups;
            if (typeof this.state._syncSymmetryContours === 'function') {
                this.state._syncSymmetryContours();
            }
            this.state._pushHistory("Reorder elements");
            // Allow one state->PathEditor pass so derived symmetry rows appear
            // immediately in PathEditor after structure reorder/group edits.
            this._pathEditorIsSource = false;
            this.state._notifySegments();
            this._debugLog('pathEditor.onElementOrderChange.applied', {
                stateSegments: this.state.segments.length,
                stateGroups: (this.state.elementGroups ?? []).length,
            });
        };

        // PathEditor → canvas: user edited the text — re-import into state.
        pathEditor.onChange = (newPath, meta = null) => {
            // Suppress re-entry caused by setPath() calls from _syncToPathEditor.
            if (this._syncingToPathEditor) return;
            // Keep the formula path in sync with what the user typed.
            this._formulaPath = this._pathEditor?.getContoursRawPath?.() ?? newPath;
            this.state.variableValues = this._pathEditor?.variableValues ?? this.state.variableValues;
            const snapshot = this._pathEditor?.getElementsDebugSnapshot?.() ?? [];
            const contourPath = _buildEvaluatedContoursPathFromElements(
                snapshot,
                this._pathEditor?.variableValues ?? this.state.variableValues ?? {}
            );
            const contourPathTrimmed = String(contourPath ?? '').trim();
            const isVariableUpdate = String(meta?.source ?? '') === 'variable-values';
            if (contourPathTrimmed) {
                log.debug('PathEditor contour path update', contourPathTrimmed);
                this._showStatus(`Path: ${contourPathTrimmed.slice(0, 220)}`, { persist: false });
            }
            this._debugLog('pathEditor.onChange.start', {
                snapshotItems: snapshot.length,
                contourPathLen: String(contourPath ?? '').length,
                selectedRefs: Array.isArray(meta?.selectedLineRefs) ? meta.selectedLineRefs.length : 0,
                isVariableUpdate,
            });
            // Mark that this change originated in the text editor so that
            // _syncToPathEditor does NOT overwrite PathEditor content.
            this._pathEditorIsSource = true;
            if (contourPathTrimmed) {
                // For variable-only updates: don't re-import path (that would
                // destroy shapes). Just propagate updated shape data from the
                // PathEditor's live elements (already re-evaluated via
                // _recomputeShapeDataFromTokens) into state and notify canvas.
                // Variable update: fall through to full _importPath pipeline so
                // path-formula contours also update on canvas.
                // Shapes will be restored by _restoreStateStructureFromElements below.
                this.state._importPath(contourPath, { resetHistory: false });
                // Re-align freshly-created contourIds to match snapshot contourIds
                // (positional order) so the lookups inside _restoreStateStructureFromElements
                // and _restoreContourLinkMetaFromElements find the correct segments.
                _realignContourIdsToSourceOrder(this.state, snapshot);
            } else {
                const hasContourRows = snapshot.some((elem) => {
                    if (!(elem?.type === 'path' || elem?.type === 'polyline' || elem?.type === 'symmetry')) return false;
                    const lines = Array.isArray(elem?.lines) ? elem.lines : [];
                    if (lines.some((line) => String(line?.text ?? '').trim().length > 0)) return true;
                    return String(elem?.path ?? '').trim().length > 0;
                });
                if (hasContourRows) {
                    this._showStatus('Path parse returned empty result. Keeping current geometry.', { tone: 'warn', persist: false });
                    this._pathEditorIsSource = false;
                    return;
                }
                if (isVariableUpdate) {
                    // Variable typing can temporarily produce non-evaluable tokens.
                    // Never destructively clear state on variable-only updates.
                    _restoreStateStructureFromElements(this.state, snapshot, {
                        resetHistoryBaseline: false,
                        vars: this._pathEditor?.variableValues ?? this.state.variableValues ?? {},
                    });
                    _restoreContourLinkMetaFromElements(this.state, snapshot);
                    _restoreContourFormulasIntoState(
                        this.state,
                        snapshot,
                        this._pathEditor?.variableValues ?? this.state.variableValues ?? {}
                    );
                    this.state.segments = _sanitizeEditorStateSegments(this.state.segments);
                    if (typeof this.state._syncSymmetryContours === 'function') {
                        this.state._syncSymmetryContours();
                    }
                    this.state._notifySegments();
                    this._pathEditorIsSource = false;
                    this._debugLog('pathEditor.onChange.variableUpdateApplied', {
                        stateSegments: this.state.segments.length,
                        stateGroups: (this.state.elementGroups ?? []).length,
                    });
                    return;
                }
                this.state.segments = [];
                this.state._pushHistory("Import");
            }
            _restoreStateStructureFromElements(this.state, snapshot, {
                resetHistoryBaseline: false,
                vars: this._pathEditor?.variableValues ?? this.state.variableValues ?? {},
            });
            // Restore per-contour linkType/parentContourId/axis and trigger symmetry sync.
            // This ensures that mirrored contours stay in sync whenever the user edits
            // source-contour text in PathEditor (fixes issues: re-edit breaks symmetry,
            // text edits not mirrored, new elements not appearing in mirror immediately).
            _restoreContourLinkMetaFromElements(this.state, snapshot);
            _restoreContourFormulasIntoState(
                this.state,
                snapshot,
                this._pathEditor?.variableValues ?? this.state.variableValues ?? {}
            );

            // Final UI-path safety net: remove any degenerate segments (especially
            // point-collapsed arcs) before state notify / PathEditor sync.
            this.state.segments = _sanitizeEditorStateSegments(this.state.segments);

            if (typeof this.state._syncSymmetryContours === 'function') {
                this.state._syncSymmetryContours();
            }
            // Optional bit-editor-style behavior for embedded PathEditor integrations:
            // keep PathEditor row structure as the source for this notify cycle.
            if (!this._preservePathEditorStructure) {
                // Allow one state->PathEditor pass so derived symmetry rows appear
                // immediately after text-originated structural edits.
                this._pathEditorIsSource = false;
            }
            this.state._notifySegments();
            this._pathEditorIsSource = false;
            this._debugLog('pathEditor.onChange.applied', {
                stateSegments: this.state.segments.length,
                stateGroups: (this.state.elementGroups ?? []).length,
            });

            // Preserve row selection from PathEditor after text import.
            // PathEditor emits flat selected line indexes; convert them via fresh lineSegIds.
            const selectedRefs = meta?.selectedLineRefs;
            if (Array.isArray(selectedRefs) && selectedRefs.length > 0) {
                const { lineSegIds } = this.state.exportPathWithMap({ skipShapes: true });
                const selectedIds = [];
                for (const ref of selectedRefs) {
                    if (typeof ref === 'number') {
                        const mapped = lineSegIds?.[ref] ?? null;
                        if (mapped) selectedIds.push(mapped);
                    } else if (typeof ref === 'string' && ref.length > 0) {
                        selectedIds.push(ref);
                    }
                }
                this.state.setSelection([...new Set(selectedIds)]);
            }

            // Keep PathEditor row highlight/source selection exactly as user left it,
            // including rows that do not map to canvas segments yet (e.g. first `M`).
            if (Array.isArray(selectedRefs)) {
                this._pathEditor?.setSelectedLines(selectedRefs);
            }

            _syncElementTransformsToState(this.state, meta?.elementTransforms ?? []);
        };

        // PathEditor row click → canvas selection (unified API: segId is always passed).
        pathEditor.onLineClick = (segRef, e, selectedRefs = null) => {
            const resolveSegRef = (ref) => {
                if (typeof ref === 'number') return this._lineSegIds?.[ref] ?? null;
                return ref ?? null;
            };

            const clickedSegId = resolveSegRef(segRef);

            // Unified mode: PathEditor is the source of truth for row selection state.
            // Apply the full selected set (toggle/range/plain) exactly as provided.
            if (Array.isArray(selectedRefs)) {
                const resolvedSelected = [...new Set(
                    selectedRefs
                        .map(resolveSegRef)
                        .filter(id => typeof id === 'string' && id.length > 0)
                )];

                if (resolvedSelected.length === 0) {
                    this.state.activeContourId = null;
                    this.state.insertAfterSegId = null;
                    this._clearMDot();
                    this._pathEditorIsSource = true;
                    this.state.clearSelection();
                    this._pathEditorIsSource = false;
                    return;
                }

                if (typeof clickedSegId === 'string' && clickedSegId.startsWith('m:')) {
                    const contourId = Number(clickedSegId.slice(2));
                    this.state.activeContourId = contourId;
                    this.state.insertAfterSegId = null;
                } else {
                    const focusSegId = (typeof clickedSegId === 'string' && !clickedSegId.startsWith('m:'))
                        ? clickedSegId
                        : resolvedSelected.find(id => !id.startsWith('m:')) ?? null;
                    const seg = focusSegId ? this.state.segments.find(s => s.id === focusSegId) : null;
                    this.state.activeContourId = seg?.contourId ?? null;
                    this.state.insertAfterSegId = focusSegId;
                }

                this._clearMDot();
                this._pathEditorIsSource = true;
                this.state.setSelection(resolvedSelected);
                this._pathEditorIsSource = false;
                return;
            }

            if (typeof clickedSegId === 'string' && clickedSegId.startsWith('m:')) {
                // M row: synthetic segId encodes contourId as "m:<contourId>".
                // Routed through setSelection identically to L/A rows so that
                // state.clearSelection() fires correctly on Escape / empty-canvas click.
                const contourId = Number(clickedSegId.slice(2));
                this.state.activeContourId = contourId;
                this.state.insertAfterSegId = null;
                this._pathEditorIsSource = true;
                this.state.setSelection(clickedSegId);
                this._pathEditorIsSource = false;
                return;
            }
            // Normal segment row (line/arc).
            const seg = this.state.segments.find(s => s.id === clickedSegId);
            this.state.activeContourId = seg?.contourId ?? null;
            this.state.insertAfterSegId = clickedSegId;
            this._clearMDot();
            this._pathEditorIsSource = true;
            // CTRL/Meta+click or Shift+click → toggle; plain click → exclusive select.
            if (e?.ctrlKey || e?.metaKey || e?.shiftKey) this.state.toggleSelection(clickedSegId);
            else this.state.setSelection(clickedSegId);
            this._pathEditorIsSource = false;
        };

        // Shape element attribute edit: merge changes into the matching canvas segment.
        pathEditor.onShapeElementChange = (segId, changes) => {
            if (changes === null) {
                this._debugLog('pathEditor.onShapeElementChange.delete', { segId });
                this.state.deleteSegments([segId]);
                // After shape deletion, force canonical state->PathEditor sync.
                // This prevents stale shape rows with dead segIds when structure
                // was previously preserved from text-source updates.
                this._pathEditorIsSource = false;
                this._syncToPathEditor();
                return;
            }
            // Handle shape creation triggered by PathEditor “Add” buttons.
            // segId is null here; changes._create carries the type string.
            if (changes._create) {
                this._debugLog('pathEditor.onShapeElementChange.create', { type: changes._create });
                this._createDefaultShape(changes._create);
                return;
            }
            // Merge changes into existing data (updateSegments replaces `data` at top level).
            const seg = this.state.segments.find(s => s.id === segId);
            if (!seg) return;
            
            // CRITICAL: Prevent accidental contourId/parentContourId changes which would
            // cause shape embedding in polyline export. Shape contour IDs are determined
            // at creation time and must not change during attribute edits.
            if (Object.prototype.hasOwnProperty.call(changes, 'contourId') && changes.contourId !== seg.contourId) {
                log.warn(`onShapeElementChange: Ignoring contourId change attempt (${seg.contourId} → ${changes.contourId})`);
                delete changes.contourId;
            }
            if (Object.prototype.hasOwnProperty.call(changes, 'parentContourId') && changes.parentContourId !== seg.parentContourId) {
                log.warn(`onShapeElementChange: Ignoring parentContourId change attempt`);
                delete changes.parentContourId;
            }

            this._debugLog('pathEditor.onShapeElementChange.update', {
                segId,
                keys: Object.keys(changes ?? {}),
            });
            const mergedData = { ...seg.data, ...changes };
            if (seg.type === 'circle' && (Object.prototype.hasOwnProperty.call(changes, 'radius')
                || Object.prototype.hasOwnProperty.call(changes, 'center'))) {
                const center = mergedData.center ?? seg.data.center;
                const radius = mergedData.radius ?? seg.data.radius ?? 0;
                const prevPt3 = seg.data.pt3 ?? { x: center.x + radius, y: center.y };
                const dx = prevPt3.x - center.x;
                const dy = prevPt3.y - center.y;
                const ang = Math.atan2(dy, dx);
                mergedData.pt3 = { x: center.x + Math.cos(ang) * radius, y: center.y + Math.sin(ang) * radius };
            }
            // Explicitly remove radiusExpr when the caller passes `radiusExpr: undefined`.
            if (Object.prototype.hasOwnProperty.call(changes, 'radiusExpr') && changes.radiusExpr === undefined) {
                delete mergedData.radiusExpr;
            }
            this._pathEditorIsSource = true;
            // Preserve transforms array if not explicitly provided in changes.
            // Transforms are managed separately via onPathEditorChange's elementTransforms metadata,
            // not through shape attribute changes, so we must not lose them during shape edits.
            const updateChanges = { data: mergedData };
            if (!Object.prototype.hasOwnProperty.call(changes, 'transforms') && Array.isArray(seg.transforms)) {
                updateChanges.transforms = seg.transforms;
            }
            this.state.updateSegments([{ id: segId, changes: updateChanges }]);
            this.state._pushHistory("Edit shape element");
            this._pathEditorIsSource = false;
        };

        // Shape element row click: select on canvas.
        // Clear activeContourId so new segments aren’t incorrectly appended to a path.
        pathEditor.onShapeElementClick = (segId, e, selectedSegIds = null) => {
            this.state.activeContourId = null;
            this.state.insertAfterSegId = null;
            this._clearMDot();
            this._pathEditorIsSource = true;
            if (Array.isArray(selectedSegIds)) {
                this.state.setSelection(selectedSegIds);
            } else if (e?.ctrlKey || e?.metaKey || e?.shiftKey) {
                this.state.toggleSelection(segId);
            } else {
                this.state.setSelection(segId);
            }
            this._pathEditorIsSource = false;
        };

        // Path element header click: select all segments in the path and set
        // activeContourId so that drawing can continue into this path.
        pathEditor.onPathElemClick = (segIds, e, selectedSegIds = null) => {
            this.state.activeContourId = null;
            // Insert after the last line/arc segment of this path.
            const lastLineSegId = [...segIds].reverse().find(id => {
                const s = this.state.segments.find(seg => seg.id === id);
                return s && (s.type === 'line' || s.type === 'arc');
            });
            this.state.insertAfterSegId = lastLineSegId ?? null;
            this._clearMDot();
            this._pathEditorIsSource = true;
            if (Array.isArray(selectedSegIds)) {
                this.state.setSelection(selectedSegIds);
            } else if (e?.shiftKey) {
                this.state.setSelection([...this.state.selectedIds, ...segIds]);
            } else {
                this.state.setSelection(segIds);
            }
            this._pathEditorIsSource = false;
        };

        pathEditor.onGroupElemClick = (segIds, e) => {
            const ids = Array.isArray(segIds) ? [...new Set(segIds.filter(Boolean))] : [];
            this.state.activeContourId = null;
            this.state.insertAfterSegId = null;
            this._clearMDot();
            this._pathEditorIsSource = true;
            if (ids.length > 0) {
                this._forceExpandGroupSelection = true;
                this.state.setSelection(ids);
            }
            else if (e?.ctrlKey || e?.metaKey || e?.shiftKey) this.state.clearSelection();
            this._pathEditorIsSource = false;
        };

        pathEditor.onToPathRequest = (segIds = [], _e = null) => {
            const raw = Array.isArray(segIds) ? segIds : [];
            const shapeSegIds = [...new Set(raw.filter(id => {
                const seg = this.state.segments.find(s => s.id === id);
                return !!seg && (seg.type === 'circle' || seg.type === 'rect' || seg.type === 'ellipse');
            }))];
            if (shapeSegIds.length === 0) return;
            const result = this.state.convertSelectionToPath(shapeSegIds);

            if (result.createdSegIds.length > 0) {
                const first = this.state.segments.find(s => s.id === result.createdSegIds[0]);
                if (first) {
                    this.state.activeContourId = first.contourId ?? null;
                    this.state.insertAfterSegId = result.createdSegIds[result.createdSegIds.length - 1] ?? null;
                }
            }
        };

        // PathEditor background click → clear canvas selection + active contour.
        pathEditor.onDeactivate = () => {
            this.state.activeContourId = null;
            this.state.insertAfterSegId = null;
            this._clearMDot();
            this._pathEditorIsSource = true;
            this.state.clearSelection();
            this._pathEditorIsSource = false;
        };

        /**
         * PathEditor requests deletion of a Symmetry group.
         * Remove all segments belonging to the symmetry group and the group
         * entry itself from state, then push history and notify canvas.
         * @param {number} groupId - The symGroupId to delete.
         */
        pathEditor.onDeleteSymmetryGroup = (groupId) => {
            const gid = Number(groupId);
            if (!Number.isFinite(gid) || !this.state) return;
            this._debugLog('pathEditor.onDeleteSymmetryGroup.start', {
                groupId: gid,
                stateSegments: this.state.segments.length,
                stateGroups: (this.state.elementGroups ?? []).length,
            });
            const before = this.state.segments.length;
            const beforeGroups = Array.isArray(this.state.elementGroups) ? this.state.elementGroups.length : 0;
            this.state.segments = this.state.segments.filter(s => {
                if (Number(s?.groupId) === gid) return false;
                if (Number(s?.parentGroupId) === gid) return false;
                return true;
            });
            if (Array.isArray(this.state.elementGroups)) {
                this.state.elementGroups = this.state.elementGroups.filter(g => Number(g?.groupId) !== gid);
            }
            const groupsChanged = (Array.isArray(this.state.elementGroups) ? this.state.elementGroups.length : 0) !== beforeGroups;
            if (this.state.segments.length !== before || groupsChanged) {
                this.state._pushHistory('Delete Symmetry');
                this.state._notifySegments();
            }
            this._debugLog('pathEditor.onDeleteSymmetryGroup.applied', {
                groupId: gid,
                stateSegments: this.state.segments.length,
                stateGroups: (this.state.elementGroups ?? []).length,
            });
        };

        /**
         * Convert a symmetry group into a regular editable group (detach from source link).
         * @param {number} groupId
         */
        pathEditor.onConvertSymmetryGroup = (groupId) => {
            const gid = Number(groupId);
            if (!Number.isFinite(gid) || !this.state) return;
            const groups = Array.isArray(this.state.elementGroups) ? this.state.elementGroups : [];
            const target = groups.find((g) => Number(g?.groupId) === gid) ?? null;
            if (!target || String(target?.linkType ?? '') !== 'symmetry') return;

            this._debugLog('pathEditor.onConvertSymmetryGroup.start', {
                groupId: gid,
                stateSegments: this.state.segments.length,
                stateGroups: groups.length,
            });

            this.state.elementGroups = groups.map((g) => {
                if (Number(g?.groupId) !== gid) return g;
                return {
                    ...g,
                    linkType: null,
                    sourceGroupId: null,
                    sourceGroupGuid: null,
                    axis: null,
                };
            });

            const updated = this.state.segments.map((seg) => {
                if (Number(seg?.groupId) !== gid && Number(seg?.parentGroupId) !== gid) return seg;
                if (String(seg?.linkType ?? '') !== 'symmetry') return seg;
                return {
                    ...seg,
                    linkType: undefined,
                    parentContourId: undefined,
                    axis: undefined,
                };
            });

            const changed = updated.some((seg, idx) => seg !== this.state.segments[idx]);
            this.state.segments = updated;
            this.state._symmetrySyncCache?.delete?.(gid);

            if (changed) {
                this.state._pushHistory('Convert Symmetry To Group');
                this.state._notifySegments();
            } else {
                this.state._notifySegments();
            }

            this._debugLog('pathEditor.onConvertSymmetryGroup.applied', {
                groupId: gid,
                stateSegments: this.state.segments.length,
                stateGroups: (this.state.elementGroups ?? []).length,
            });
        };
    }

    /**
     * Push current canvas/model state to PathEditor and sync row highlighting.
     *
     * Canvas-originated updates:
     * - Merge formula tokens back into exported contour path.
     * - Prefer in-place row updates; fallback to full `setElements()` only when
     *   structure changed.
     *
     * Text-originated updates:
     * - Keep PathEditor structure as source of truth; only hard-clear when state path is empty.
     *
     * Always refreshes ID binding and M-row anchor-dot visualization.
     * @private
     */
    _syncToPathEditor() {
        if (!this._pathEditor) return;
        this._clearMDot();
        const { path, lineSegIds } = this.state.exportPathWithMap({ skipShapes: true });
        this._lineSegIds = lineSegIds;

        const elements = this.state.getElements();

        // If sync is called before initial enter() synchronization is armed,
        // keep it lightweight and avoid structural updates.
        if (!this._initialSyncDone) {
            this._bindPathEditorSegmentIdsOnly();
            return;
        }

        if (!this._pathEditorIsSource) {
            // Canvas-originated: rebuild sub-line content, merging formula tokens back.
            const currentVars = this._pathEditor?.variableValues && typeof this._pathEditor.variableValues === 'object'
                ? this._pathEditor.variableValues
                : this.state.variableValues;
            this.state.variableValues = currentVars ?? {};
            const mergedPath = _mergeFormulaPath(path, this._formulaPath, currentVars ?? {});
            const editorSnapshot = this._pathEditor?.getElementsDebugSnapshot?.() ?? [];
            const hasSymmetryStructure = elements.some(e =>
                (e?.type === 'group' && String(e?.linkType ?? '') === 'symmetry')
                || e?.type === 'symmetry'
            );
            // For symmetry-heavy structures, canonical state order is the only stable
            // order. Reordering against old PathEditor snapshot can reintroduce stale
            // parent/child placement and mix multiple symmetry trees.
            const orderedElements = hasSymmetryStructure
                ? elements
                : _orderElementsLikePathEditor(elements, editorSnapshot);
            this._debugLog('syncToPathEditor.canvas', {
                elements: elements.length,
                usedCanonicalOrder: hasSymmetryStructure,
            });
            const elemsWithPaths = _buildElemsWithPaths(orderedElements, mergedPath, lineSegIds);
            const needsRebuild = this._pathEditor.needsElementsRebuild?.(elemsWithPaths) ?? true;
            if (needsRebuild) {
                this._syncingToPathEditor = true;
                this._pathEditor.setElements(elemsWithPaths);
                this._syncingToPathEditor = false;
            } else {
                const updatedInPlace = this._pathEditor.updatePathLinesInPlace?.(mergedPath, lineSegIds) ?? false;
                const shapesUpdatedInPlace = this._pathEditor.updateShapeRowsInPlace?.(elemsWithPaths) ?? false;
                if (!updatedInPlace || !shapesUpdatedInPlace) {
                    this._syncingToPathEditor = true;
                    this._pathEditor.setElements(elemsWithPaths);
                    this._syncingToPathEditor = false;
                }
            }
        } else {
            // Text-originated: keep PathEditor structure as the source of truth.
            // We only clear the editor when the exported path is truly empty.
            if (!path) {
                const hasShapeElements = elements.some(e =>
                    e.type === 'circle' || e.type === 'rect' || e.type === 'ellipse');
                if (!hasShapeElements) {
                    // Truly empty state — sync the clear to PathEditor.
                    this._pathEditor.setElements([]);
                }
            }
            // else: non-empty text edits are already reflected in PathEditor DOM.
        }
        this._pathEditor.syncHiddenInputsFromElements?.();
        this._bindPathEditorSegmentIdsOnly();
    }

    /**
     * Lightweight sync used for selection-only updates.
     * Never rebuilds PathEditor structure.
     * @private
     */
    _syncPathEditorSelectionOnly() {
        if (!this._pathEditor) return;
        this._clearMDot();
        this._clearShapeStartDot();
        const expandGroups = !!this._forceExpandGroupSelection;
        this._pathEditor.setSelectedElements(this.state.selectedIds, { expandGroups });
        this._forceExpandGroupSelection = false;
        for (const id of this.state.selectedIds) {
            if (typeof id === 'string' && id.startsWith('m:')) {
                this._showMDotForContour(Number(id.slice(2)));
                break;
            }
            // Show start point for selected shapes
            const seg = this.state.segments.find(s => s.id === id);
            if (seg && (seg.type === 'circle' || seg.type === 'rect' || seg.type === 'ellipse')) {
                this._showShapeStartDot(seg);
                break;
            }
        }
    }

    /**
     * Bind current EditorState segment IDs to existing PathEditor rows without
     * rebuilding PathEditor element structure.
     * @private
     */
    _bindPathEditorSegmentIdsOnly() {
        if (!this._pathEditor || !this.state) return;
        const { lineSegIds } = this.state.exportPathWithMap({ skipShapes: true });
        this._lineSegIds = lineSegIds;
        const shapeSegIds = this.state.getElements()
            .filter(e => e.type === 'circle' || e.type === 'rect' || e.type === 'ellipse')
            .map(e => e.segId)
            .filter(Boolean);
        this._pathEditor.bindSegmentIds?.({ lineSegIds, shapeSegIds });
        this._syncPathEditorSelectionOnly();
    }

    // ─── Default shape creation ──────────────────────────────────────────────────────

    /**
     * Create a new shape segment in the canvas state with sensible default dimensions.
     * Called when the user clicks an “Add <shape>” button in PathEditor suggestions
     * while the editor is in edit mode.
     *
     * @param {'circle'|'rect'|'ellipse'} type
     * @private
     */
    _createDefaultShape(type) {
        if (!this.state) return;
        let segData;
        switch (type) {
            case 'circle':
                segData = { type: 'circle', data: { center: { x: 0, y: 0 }, radius: 10 } };
                break;
            case 'rect':
                segData = { type: 'rect', data: { x: -15, y: -10, w: 30, h: 20, dirW: 1, dirH: -1, rx: 0 } };
                break;
            case 'ellipse':
                segData = { type: 'ellipse', data: { cx: 0, cy: 0, rx: 20, ry: 10 } };
                break;
            default: return;
        }
        // New shape rows are standalone by default; embedding is explicit via drag into path.
        this.state.activeContourId = null;
        this.state.insertAfterSegId = null;
        // addSegment handles contourId assignment and fires onSegmentsChange.
        this.state.addSegment(segData);
        this.state._pushHistory(`Add ${type}`);
    }
    // ─── M-row canvas selection ──────────────────────────────────────────────────

    /**
     * Draw a filled blue circle on the canvas overlay at the M-row anchor point.
     * Used when the user clicks an M-row in the PathEditor during edit mode,
     * giving visual feedback identical to the preview-mode dot.
     * @param {number} contourId - The contour ID encoded in the selected `"m:<cid>"` segId
     * @private
     */
    _showMDotForContour(contourId) {
        this._clearMDot();
        if (!this.editorCanvas) return;
        // Find the first line/arc segment in the given contour; its start is the M anchor.
        const seg = this.state.segments.find(s =>
            s.contourId === contourId && (s.type === 'line' || s.type === 'arc'));
        if (!seg) return;
        const { x, y } = seg.data.start;
        const overlay = this.editorCanvas.getOverlayRoot?.() ?? this.editorCanvas.cm.getLayer("overlay");
        if (!overlay) return;
        const zoom = this.editorCanvas.cm.zoomLevel || 1;
        const r = Math.max(0.5, 3 / zoom);
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
        dot.setAttribute("r", r);
        dot.setAttribute("fill", "#2196F3");
        dot.setAttribute("fill-opacity", "0.85");
        dot.setAttribute("stroke", "#1565C0");
        dot.setAttribute("stroke-width", Math.max(0.05, 0.5 / zoom));
        dot.classList.add("editor-m-selection");
        this._mDotElement = dot;
        overlay.appendChild(dot);
    }

    /**
     * Remove the M-row anchor dot from the canvas overlay (if present).
     */
    _clearMDot() {
        if (this._mDotElement) {
            this._mDotElement.remove();
            this._mDotElement = null;
        }
    }

    /**
     * Draw a filled blue circle on the canvas overlay at the shape's start point.
     * Start points vary by shape type:
     * - Circle: rightmost point (center.x + radius, center.y)
     * - Rect: top-left corner adjusted for rounded corners
     * - Ellipse: rightmost point (cx + rx, cy)
     * @param {object} seg - The shape segment (circle, rect, or ellipse)
     * @private
     */
    _showShapeStartDot(seg) {
        this._clearShapeStartDot();
        if (!this.editorCanvas || !seg) return;
        
        let startX, startY;
        
        if (seg.type === 'circle') {
            // Start point is at the rightmost point
            const { center, radius } = seg.data;
            if (!center || !Number.isFinite(radius)) return;
            startX = center.x + radius;
            startY = center.y;
        } else if (seg.type === 'rect') {
            // Start point is at the top-left corner (adjusted for rounded corners)
            const { x, y, w, h, rx: rx0 = 0 } = seg.data ?? {};
            if (![x, y, w, h].every(Number.isFinite)) return;
            const dirW = Number(seg.data?.dirW) < 0 ? -1 : 1;
            const hasDirH = Object.prototype.hasOwnProperty.call(seg.data ?? {}, 'dirH');
            const dirH = hasDirH ? (Number(seg.data?.dirH) < 0 ? -1 : 1) : -1;
            const x1 = Number(x);
            const y1 = Number(y);
            const x2 = x1 + dirW * Number(w);
            const y2 = y1 + dirH * Number(h);
            const widthAbs = Math.abs(x2 - x1);
            const heightAbs = Math.abs(y2 - y1);
            const rx = Math.max(0, Math.min(Number(rx0), widthAbs / 2, heightAbs / 2));
            const sW = x2 >= x1 ? 1 : -1;
            
            startX = rx > 1e-9 ? x1 + sW * rx : x1;
            startY = y1;
        } else if (seg.type === 'ellipse') {
            // Start point is at the rightmost point
            const { cx, cy, rx } = seg.data;
            if (![cx, cy, rx].every(Number.isFinite)) return;
            startX = cx + rx;
            startY = cy;
        } else {
            return;
        }
        
        const overlay = this.editorCanvas.getOverlayRoot?.() ?? this.editorCanvas.cm.getLayer("overlay");
        if (!overlay) return;
        const zoom = this.editorCanvas.cm.zoomLevel || 1;
        const r = Math.max(0.5, 3 / zoom);
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", startX);
        dot.setAttribute("cy", startY);
        dot.setAttribute("r", r);
        dot.setAttribute("fill", "#2196F3");
        dot.setAttribute("fill-opacity", "0.85");
        dot.setAttribute("stroke", "#1565C0");
        dot.setAttribute("stroke-width", Math.max(0.05, 0.5 / zoom));
        dot.classList.add("editor-shape-start-selection");
        this._shapeStartDotElement = dot;
        overlay.appendChild(dot);
    }

    /**
     * Remove the shape start point dot from the canvas overlay (if present).
     * @private
     */
    _clearShapeStartDot() {
        if (this._shapeStartDotElement) {
            this._shapeStartDotElement.remove();
            this._shapeStartDotElement = null;
        }
    }
    // ─── Tool activation ─────────────────────────────────────────────────────

    /** @type {import("./tools/BaseTool.js").default|null} — the currently active tool instance */
    _currentTool = null;

    /** @type {string|null} — last non-cursor draw tool, for right-click repeat */
    _lastDrawToolId = null;

    /** @type {string|null} — ID of the currently active tool (e.g. "cursor", "line", "arc"). */
    _currentToolId = null;

    /**
     * Switch to the tool with the given ID.
     * Lazily instantiates tool classes on first use.
     * @param {string} toolId
     * @private
     */
    _activateTool(toolId) {
        const tool = this._createTool(toolId);
        if (!tool) return; // unknown tool — keep current tool active

        if (this._currentTool) {
            this._currentTool.deactivate();
            this._currentTool = null;
        }

        // Cursor style: crosshair for all drawing/editing tools; default for select.
        const svgCanvas = this.editorCanvas?.cm?.canvas;
        if (svgCanvas) svgCanvas.style.cursor = toolId === "cursor" ? "" : "crosshair";

        tool.activate({ state: this.state, canvas: this.editorCanvas });
        this._currentTool = tool;
        this._currentToolId = toolId;
        this._bindCanvasEvents(tool);
        this._refreshToolHint(true);
    }

    /**
     * Instantiate a tool by ID.
     * TODO: import and return concrete tool classes.
     * @param {string} toolId
     * @returns {import("./tools/BaseTool.js").default|null}
     * @private
     */
    _createTool(toolId) {
        switch (toolId) {
            case "cursor": return new CursorTool();
            case "move": return new MoveTool();
            case "rotate": return new RotateTool();
            case "line": return new LineTool();
            case "mirror": return new MirrorTool("mirror");
            case "symmetry": return new MirrorTool("symmetry");
            case "flip": return new FlipTool();
            case "fillet": return new FilletTool("fillet");
            case "filletCorners": return new FilletTool("filletCorners");
            case "arc3pt":
            case "arc": return new ArcTool();
            case "circle2pt": return new CircleTool("circle2pt");
            case "circle3pt": return new CircleTool("circle3pt");
            case "rect2pt": return new RectTool("rect2pt");
            case "rect3pt": return new RectTool("rect3pt");
            case "ellipse2pt": return new EllipseTool("ellipse2pt");
            case "ellipse3pt": return new EllipseTool("ellipse3pt");
            case "offset": return new OffsetTool("offset");
            case "offsetMultiple": return new OffsetTool("offsetMultiple");
            case "clipperOffset": return new OffsetTool("clipperOffset");
            case "clipperOffsetMultiple": return new OffsetTool("clipperOffsetMultiple");
            default:
                log.debug("_createTool: tool not implemented:", toolId);
                return null;
        }
    }

    // ─── Canvas mouse event routing ──────────────────────────────────────────

    /**
     * Bind canvas mouse events to route through snap → active tool.
     * Removes any previously bound handlers first.
     * @param {import("./tools/BaseTool.js").default} tool
     * @private
     */
    _bindCanvasEvents(tool) {
        const cm = this.editorCanvas?.cm;
        if (!cm) return;

        const canvas = cm.canvas;

        // Remove old handlers
        if (cm._editorMouseDown) canvas.removeEventListener("mousedown", cm._editorMouseDown);
        if (cm._editorMouseMove) canvas.removeEventListener("mousemove", cm._editorMouseMove);
        if (cm._editorMouseUp) canvas.removeEventListener("mouseup", cm._editorMouseUp);
        if (cm._editorDblClick) canvas.removeEventListener("dblclick", cm._editorDblClick);
        if (cm._editorRightClick) canvas.removeEventListener("mousedown", cm._editorRightClick, { capture: true });
        if (cm._editorContextMenu) canvas.removeEventListener("contextmenu", cm._editorContextMenu);

        const ecvs = this.editorCanvas;

        /**
         * Convert touch point to editor SVG coordinates.
         *
         * TODO(editor-touch-interaction): Current touch route only forwards low-level
         * pointer lifecycle into tools. Selection/hit-testing parity with desktop is
         * incomplete and should be finalized in dedicated editor interaction pass.
         *
         * @param {Touch} touch
         * @returns {{x:number, y:number}}
         */
        const touchPointToSvg = (touch) => {
            const fakeMouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
            };
            return ecvs.screenToSVG(fakeMouseEvent);
        };

        // Track right-button screen position for click-vs-drag detection.
        let rightDownClient = null;
        let activeTouchId = null;

        cm._editorMouseDown = (e) => {
            if (e.button === 2) {
                // Track right-button position so contextmenu can distinguish click from drag.
                rightDownClient = { x: e.clientX, y: e.clientY };
                return; // let CanvasManager handle panning normally
            }
            if (e.button !== 0) return;
            const raw = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            this._lastPoint = snapped;
            tool.onPointerDown(snapped, e);
            this._refreshToolHint();
        };
        cm._editorMouseMove = (e) => {
            // While CanvasManager is panning (right-button drag), don't feed SVG
            // coordinates to the active tool — that would move objects during pan.
            if (cm.isDragging) return;
            const raw = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            tool.onPointerMove(snapped, e);
        };
        cm._editorMouseUp = (e) => {
            if (e.button !== 0) return;
            const raw = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            tool.onPointerUp(snapped, e);
            this._refreshToolHint();
        };
        cm._editorDblClick = (e) => {
            const raw = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            tool.onDblClick(snapped, e);
        };

        // Right-click: contextmenu fires after button is released.
        // If the mouse moved more than 6 px between down and up it was a pan drag —
        // in that case do NOT call onConfirm; only a genuine click triggers confirm.
        cm._editorRightClick = null; // no longer registered as capture-phase mousedown
        cm._editorContextMenu = (e) => {
            e.preventDefault(); // always suppress browser context menu
            const dist = rightDownClient
                ? Math.hypot(e.clientX - rightDownClient.x, e.clientY - rightDownClient.y)
                : 999;
            rightDownClient = null;
            if (dist > 6) return; // was a drag/pan, not a click
            if (!this._currentTool?.hasActiveCommand()) return;
            const raw = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            this._currentTool.onConfirm(snapped, e);
            this._refreshToolHint();
        };

        // TODO(editor-touch-interaction): Rework editor touch gesture arbitration with
        // selection + drawing tools to match desktop click semantics.
        cm._editorTouchStart = (e) => {
            if (e.defaultPrevented) return;
            if (!e.touches || e.touches.length !== 1) return;
            const touch = e.touches[0];
            activeTouchId = touch.identifier;
            const raw = touchPointToSvg(touch);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            this._lastPoint = snapped;
            tool.onPointerDown(snapped, e);
            this._refreshToolHint();
            e.preventDefault();
        };

        cm._editorTouchMove = (e) => {
            if (e.defaultPrevented) return;
            if (!e.touches || e.touches.length === 0) return;
            const touch = Array.from(e.touches).find((t) => t.identifier === activeTouchId) || e.touches[0];
            const raw = touchPointToSvg(touch);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            tool.onPointerMove(snapped, e);
            e.preventDefault();
        };

        cm._editorTouchEnd = (e) => {
            if (e.defaultPrevented) return;
            const touch = Array.from(e.changedTouches || []).find((t) => t.identifier === activeTouchId);
            if (!touch) return;
            const raw = touchPointToSvg(touch);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            tool.onPointerUp(snapped, e);
            activeTouchId = null;
            this._refreshToolHint();
            e.preventDefault();
        };

        canvas.addEventListener("mousedown", cm._editorMouseDown);
        canvas.addEventListener("mousemove", cm._editorMouseMove);
        canvas.addEventListener("mouseup", cm._editorMouseUp);
        canvas.addEventListener("dblclick", cm._editorDblClick);
        canvas.addEventListener("touchstart", cm._editorTouchStart, { passive: false });
        canvas.addEventListener("touchmove", cm._editorTouchMove, { passive: false });
        canvas.addEventListener("touchend", cm._editorTouchEnd, { passive: false });
        canvas.addEventListener("touchcancel", cm._editorTouchEnd, { passive: false });
        // NOTE: _editorRightClick (capture-phase) is intentionally NOT registered anymore.
        canvas.addEventListener("contextmenu", cm._editorContextMenu);
    }

    /** Remove all editor canvas event listeners. */
    _unbindCanvasEvents() {
        const cm = this.editorCanvas?.cm;
        if (!cm) return;
        const canvas = cm.canvas;
        if (cm._editorMouseDown) canvas.removeEventListener("mousedown", cm._editorMouseDown);
        if (cm._editorMouseMove) canvas.removeEventListener("mousemove", cm._editorMouseMove);
        if (cm._editorMouseUp) canvas.removeEventListener("mouseup", cm._editorMouseUp);
        if (cm._editorDblClick) canvas.removeEventListener("dblclick", cm._editorDblClick);
        if (cm._editorTouchStart) canvas.removeEventListener("touchstart", cm._editorTouchStart);
        if (cm._editorTouchMove) canvas.removeEventListener("touchmove", cm._editorTouchMove);
        if (cm._editorTouchEnd) canvas.removeEventListener("touchend", cm._editorTouchEnd);
        if (cm._editorTouchEnd) canvas.removeEventListener("touchcancel", cm._editorTouchEnd);
        if (cm._editorRightClick) canvas.removeEventListener("mousedown", cm._editorRightClick, { capture: true });
        if (cm._editorContextMenu) canvas.removeEventListener("contextmenu", cm._editorContextMenu);
        cm._editorMouseDown = cm._editorMouseMove = cm._editorMouseUp =
            cm._editorDblClick = cm._editorTouchStart = cm._editorTouchMove =
            cm._editorTouchEnd = cm._editorRightClick = cm._editorContextMenu = null;
    }

    /** @type {{ x: number, y: number }|null} */
    _lastPoint = null;

    // ─── Keyboard ────────────────────────────────────────────────────────────

    _registerKeyboard() {
        this._keyHandler = (e) => {
            if (!this._active) return;
            const targetTag = String(e?.target?.tagName ?? '').toUpperCase();
            const isTextInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA';

            const shortcutKey = getShortcutKeyId(e);
            if (matchesCommandShortcut(e, 'c') || matchesCommandShortcut(e, 'v')) {
                if (!this._pathEditor || isTextInput) return;
                e.preventDefault();
                e.stopPropagation();
                if (shortcutKey === 'c') {
                    this._syncPathEditorSelectionOnly();
                    Promise.resolve()
                        .then(() => this._pathEditor.copySelectionToClipboard?.())
                        .then((result) => {
                            if (result?.ok) return;
                            if (Number(this.state?.selectedIds?.size ?? 0) <= 0) return;
                            // Retry once after forcing row-highlight sync for keyboard-only selections.
                            this._pathEditor?.setSelectedElements?.(this.state.selectedIds, { expandGroups: true });
                            return this._pathEditor.copySelectionToClipboard?.();
                        })
                        .catch(() => {
                            this._showStatus('Copy failed', { tone: 'warn' });
                        });
                } else if (e.altKey) {
                    // Ctrl+Alt+V — paste plain: all formula/variable tokens evaluated to numbers.
                    Promise.resolve()
                        .then(() => this._pathEditor.pasteClipboardPayloadPlain?.({ centered: !!e.shiftKey }))
                        .catch(() => {
                            this._showStatus('Paste (plain) failed', { tone: 'warn' });
                        });
                } else {
                    Promise.resolve()
                        .then(() => this._pathEditor.pasteClipboardPayload?.({ centered: !!e.shiftKey }))
                        .catch(() => {
                            this._showStatus('Paste failed', { tone: 'warn' });
                        });
                }
                return;
            }

            if (isTextInput) return;

            if (matchesCommandShortcut(e, "z")) {
                e.preventDefault();
                if (e.shiftKey) this.state.redo(); else this.state.undo();
                return;
            }
            // Escape while cursor tool is active: clear selection (no operation in progress).
            // For other tools, Escape is handled by the toolbar (switches to cursor) or by
            // their own onKeyDown (e.g. MoveTool restores original positions).
            if (matchesShortcut(e, "Escape") && this._currentToolId === "cursor") {
                // Let the tool cancel any active operation (e.g. pt3 drag) before
                // falling back to the generic "clear selection" behaviour.
                if (this._currentTool?.hasActiveCommand()) {
                    if (this._currentTool.onKeyDown(e)) { e.preventDefault(); return; }
                }
                this.state.clearSelection();
                e.preventDefault();
                return;
            }
            // Delegate remaining keys to the active tool
            if (this._currentTool?.onKeyDown(e)) {
                e.preventDefault();
                this._refreshToolHint();
            }
        };
        this._keyUpHandler = (e) => {
            if (!this._active) return;
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            if (this._currentTool?.onKeyUp(e)) {
                e.preventDefault();
                this._refreshToolHint();
            }
        };
        window.addEventListener("keydown", this._keyHandler);
        window.addEventListener("keyup", this._keyUpHandler);
    }

    // ─── Layout switching ────────────────────────────────────────────────────

    /**
     * Toggle between preview mode and editor mode CSS classes on the modal.
     *
     * In editor mode we keep the form and OK/Cancel visible — only the
     * preview zoom/color toolbar is swapped for the editor toolbar, which
     * is injected by EditorToolbar.mount() directly below the SVG canvas.
     *
     * @param {boolean}     editMode
     * @private
     */
    _applyEditLayout(editMode) {
        const previewEl = this._host?.getPreviewContainer?.() ?? null;
        const previewToolbar = this._host?.getPreviewToolbar?.() ?? null;

        if (editMode) {
            previewToolbar?.classList.add("editor-mode-hidden");
            previewEl?.classList.add("bit-preview--editing");
            this._host?.onEditModeChange?.(true);
        } else {
            previewToolbar?.classList.remove("editor-mode-hidden");
            previewEl?.classList.remove("bit-preview--editing");
            const status = previewEl?.querySelector?.('#editor-status-log');
            status?.remove?.();
            this._host?.onEditModeChange?.(false);
        }
    }

    /**
     * @param {HTMLElement|null} modal
     * @param {object|null} host
     * @returns {{
     *  getPreviewContainer: () => HTMLElement|null,
     *  getPreviewToolbar: () => HTMLElement|null,
     *  getDebugLogElement: () => HTMLTextAreaElement|null,
     *  onEditModeChange: (editMode: boolean) => void,
     * }}
     * @private
     */
    _buildHostAdapter(modal, host) {
        const fallback = {
            getPreviewContainer: () => modal?.querySelector?.("#bit-preview") ?? null,
            getPreviewToolbar: () => modal?.querySelector?.("#preview-toolbar") ?? null,
            getDebugLogElement: () => modal?.querySelector?.("#bit-profileDebugLog") ?? null,
            onEditModeChange: () => {},
        };
        if (!host || typeof host !== 'object') return fallback;
        return {
            getPreviewContainer: typeof host.getPreviewContainer === 'function'
                ? () => host.getPreviewContainer() ?? null
                : fallback.getPreviewContainer,
            getPreviewToolbar: typeof host.getPreviewToolbar === 'function'
                ? () => host.getPreviewToolbar() ?? null
                : fallback.getPreviewToolbar,
            getDebugLogElement: typeof host.getDebugLogElement === 'function'
                ? () => host.getDebugLogElement() ?? null
                : fallback.getDebugLogElement,
            onEditModeChange: typeof host.onEditModeChange === 'function'
                ? (editMode) => host.onEditModeChange(editMode)
                : fallback.onEditModeChange,
        };
    }
}
