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
import ArcTool from "./tools/ArcTool.js";
import CircleTool from "./tools/CircleTool.js";
import RectTool from "./tools/RectTool.js";
import EllipseTool from "./tools/EllipseTool.js";
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
function _syncElementTransformsToState(state, transformsMeta) {
    if (!state || !Array.isArray(transformsMeta)) return;

    const normalize = (arr) => (Array.isArray(arr) ? arr : []).map(t => ({
        type: String(t?.type ?? '').toUpperCase(),
        raw: String(t?.raw ?? ''),
        params: Array.isArray(t?.params) ? [...t.params] : [],
    }));
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
        const tr = normalize(byContour?.transforms ?? metaPaths[i]?.transforms);
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
        const tr = normalize(byId?.transforms ?? metaShapes[i]?.transforms);
        if (!same(seg.transforms, tr)) updates.push({ id: seg.id, changes: { transforms: tr } });
    }

    const metaGroups = transformsMeta.filter(m => m?.kind === 'group');
    if (Array.isArray(state.elementGroups) && metaGroups.length > 0) {
        state.elementGroups = state.elementGroups.map((g, i) => {
            const byId = metaGroups.find(m => Number(m?.groupId) === Number(g?.groupId));
            const tr = normalize(byId?.transforms ?? metaGroups[i]?.transforms);
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

        const requestedParentCid = Number(elem?.parentContourId);
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
    }

    /** @returns {HTMLTextAreaElement|null} @private */
    _getDebugLogField() {
        if (!this._modal) return null;
        if (this._debugLogEl && this._debugLogEl.isConnected) return this._debugLogEl;
        this._debugLogEl = this._modal.querySelector('#bit-profileDebugLog');
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
     */
    enter({ modal, canvasManager, profilePath = "", profileElements = [], variableValues = {}, onSave, onClose, pathEditor = null }) {
        if (this._active) {
            log.warn("ProfileEditor.enter() called while already active");
            return;
        }
        this._active = true;
        this._modal = modal;
        this._onSave = onSave;
        this._onClose = onClose ?? null;
        this._pathEditor = pathEditor;
        this._debugLogEl = this._modal?.querySelector('#bit-profileDebugLog') ?? null;
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
        _restoreStateStructureFromElements(this.state, sourceElements, {
            vars: variableValues,
        });
        _restoreContourLinkMetaFromElements(this.state, sourceElements);
        _restoreContourFormulasIntoState(this.state, sourceElements, variableValues);
        _restoreShapeFormulasIntoState(this.state, shapeFormulaSnapshot, variableValues);
        _syncElementTransformsToState(this.state, pathEditor?.getElementTransformsSnapshot?.() ?? []);
        this.state.onDebugLog = (entry) => {
            this._debugLog(`state.${String(entry?.event ?? 'event')}`, entry);
        };

        // 2. Initialize canvas extension
        this.editorCanvas = new EditorCanvas(canvasManager, this.state);
        this.editorCanvas.initialize();

        // 3. Clear stale preview overlays (anchor cross, segment highlights) that
        // drawAnchorAndAxis() left on the overlay layer before edit mode was entered.
        const overlayLayer = canvasManager.getLayer("overlay");
        if (overlayLayer) overlayLayer.innerHTML = "";

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
            this._currentTool?.onViewportChanged?.({ zoom, panX, panY });
            for (const id of (this.state?.selectedIds ?? new Set())) {
                if (typeof id === 'string' && id.startsWith('m:')) {
                    this._showMDotForContour(Number(id.slice(2)));
                    break;
                }
            }
        };

        // 8. Mount toolbar
        const previewContainer = modal.querySelector("#bit-preview");
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
        this.toolbar.setActiveTool("cursor");

        // 9. Switch DOM to editor layout
        this._applyEditLayout(modal, true);

        // 10. Register undo/redo keyboard shortcut
        this._registerKeyboard();

        // 11. Activate canvas mouse events for the current tool
        this._activateTool("cursor");
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
        if (this._modal) this._applyEditLayout(this._modal, false);

        const onClose = this._onClose;
        this._modal = null;
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
            this._debugLog('pathEditor.onChange.start', {
                snapshotItems: snapshot.length,
                contourPathLen: String(contourPath ?? '').length,
                selectedRefs: Array.isArray(meta?.selectedLineRefs) ? meta.selectedLineRefs.length : 0,
            });
            // Mark that this change originated in the text editor so that
            // _syncToPathEditor does NOT overwrite PathEditor content.
            this._pathEditorIsSource = true;
            if (contourPath && contourPath.trim()) {
                this.state._importPath(contourPath, { resetHistory: false });
                // Re-align freshly-created contourIds to match snapshot contourIds
                // (positional order) so the lookups inside _restoreStateStructureFromElements
                // and _restoreContourLinkMetaFromElements find the correct segments.
                _realignContourIdsToSourceOrder(this.state, snapshot);
            } else {
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
            if (typeof this.state._syncSymmetryContours === 'function') {
                this.state._syncSymmetryContours();
            }
            // Allow one state->PathEditor pass so derived symmetry rows appear
            // immediately after text-originated structural edits.
            this._pathEditorIsSource = false;
            this.state._notifySegments();
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
            this.state.updateSegments([{ id: segId, changes: { data: mergedData } }]);
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
        const expandGroups = !!this._forceExpandGroupSelection;
        this._pathEditor.setSelectedElements(this.state.selectedIds, { expandGroups });
        this._forceExpandGroupSelection = false;
        for (const id of this.state.selectedIds) {
            if (typeof id === 'string' && id.startsWith('m:')) {
                this._showMDotForContour(Number(id.slice(2)));
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
        const overlay = this.editorCanvas.cm.getLayer("overlay");
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
            case "arc3pt":
            case "arc": return new ArcTool();
            case "circle2pt": return new CircleTool("circle2pt");
            case "circle3pt": return new CircleTool("circle3pt");
            case "rect2pt": return new RectTool("rect2pt");
            case "rect3pt": return new RectTool("rect3pt");
            case "ellipse2pt": return new EllipseTool("ellipse2pt");
            case "ellipse3pt": return new EllipseTool("ellipse3pt");
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

        // Track right-button screen position for click-vs-drag detection.
        let rightDownClient = null;

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
        };

        canvas.addEventListener("mousedown", cm._editorMouseDown);
        canvas.addEventListener("mousemove", cm._editorMouseMove);
        canvas.addEventListener("mouseup", cm._editorMouseUp);
        canvas.addEventListener("dblclick", cm._editorDblClick);
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
        if (cm._editorRightClick) canvas.removeEventListener("mousedown", cm._editorRightClick, { capture: true });
        if (cm._editorContextMenu) canvas.removeEventListener("contextmenu", cm._editorContextMenu);
        cm._editorMouseDown = cm._editorMouseMove = cm._editorMouseUp =
            cm._editorDblClick = cm._editorRightClick = cm._editorContextMenu = null;
    }

    /** @type {{ x: number, y: number }|null} */
    _lastPoint = null;

    // ─── Keyboard ────────────────────────────────────────────────────────────

    _registerKeyboard() {
        this._keyHandler = (e) => {
            if (!this._active) return;
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            if ((e.ctrlKey || e.metaKey) && e.key === "z") {
                e.preventDefault();
                if (e.shiftKey) this.state.redo(); else this.state.undo();
                return;
            }
            // Escape while cursor tool is active: clear selection (no operation in progress).
            // For other tools, Escape is handled by the toolbar (switches to cursor) or by
            // their own onKeyDown (e.g. MoveTool restores original positions).
            if (e.key === "Escape" && this._currentToolId === "cursor") {
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
            if (this._currentTool?.onKeyDown(e)) e.preventDefault();
        };
        this._keyUpHandler = (e) => {
            if (!this._active) return;
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            if (this._currentTool?.onKeyUp(e)) e.preventDefault();
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
     * @param {HTMLElement} modal
     * @param {boolean}     editMode
     * @private
     */
    _applyEditLayout(modal, editMode) {
        const previewEl = modal.querySelector("#bit-preview");
        const previewToolbar = modal.querySelector("#preview-toolbar");

        if (editMode) {
            previewToolbar?.classList.add("editor-mode-hidden");
            previewEl?.classList.add("bit-preview--editing");
        } else {
            previewToolbar?.classList.remove("editor-mode-hidden");
            previewEl?.classList.remove("bit-preview--editing");
        }
    }
}
