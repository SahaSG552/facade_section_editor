# Learnings — offset-processor-correctness-hardening

*Conventions, patterns, and wisdom discovered during this hardening effort.*

---

[2026-03-16T00:00:00Z] Task-1 audit learnings
- CustomOffsetProcessor already enforces arc-center invariance and trim-only arc acceptance via isValidStartTrim/isValidEndTrim gates in applyMiterJoin.
- Two-pass reconciliation (first join pass -> sanitize -> second gap-seal pass) is central; correctness is sensitive to in-place mutation order when degenerate arcs are removed.
- Bridge lines are explicit first-class segments inserted into the stream and only removed by degenerate/zero-length sanitation.
- Strict rules that assume lines+arcs only do not fully match implementation because bezier offsets are intentionally supported.
- OffsetTool direction choice is sign-based candidate selection (+d vs -d) around a reference normal; this is a practical source of sign-convention fragility across Y-inverted conversions.
- Tolerance values are intentionally mixed across stages (1e-6, 0.001, 0.5), which should be treated as a known precision-risk surface in future hardening.
