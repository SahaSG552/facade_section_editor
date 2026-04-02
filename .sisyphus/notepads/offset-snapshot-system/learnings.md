# Learnings - Offset Snapshot System

## Conventions

## Patterns

## Gotchas

## Task T1 - Snapshot Storage Implementation Complete

### Implementation
- Added `_snapshots = { positive: [], negative: [] }` in constructor (line 644)
- Initialized snapshots in activate() (line 660)
- Added three helper methods with JSDoc:
  - `getSnapshotForOffset(d)` - Floor selection by absolute value from appropriate array
  - `captureSnapshot(offset, pathData, segments, topology)` - Append to sign-specific array
  - `clearSnapshots()` - Reset both arrays
- Added clearSnapshots() call in deactivate() (line 708)

### Key Pattern Observed
- Sign-based branching: `d >= 0 ? positive : negative` determines array
- Snapshot search: Linear scan with absolute value comparison (no sort needed yet)
- Lifecycle: Initialized on activate, cleared on deactivate - clean session isolation

### Ready for T2
- Snapshot structure matches spec: { offset, pathData, segments, topology }
- Selection algorithm follows floor-by-absolute-value rule
- Next step: Add topology detection in T2
