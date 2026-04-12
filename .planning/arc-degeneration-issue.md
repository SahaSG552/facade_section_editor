# Arc Degenerationissue Summary

## Problem
User reports two issues with offset operation:

1. **Outward offset (positive distance):** Arc degenerates immediately, segments connect directly. **Arc should NOT degenerate here.**

2. **Inward offset (after arc degeneration):** Strange Y coordinates appear (e.g., L -2.000000 33.246211), segments get pulled to wrong positions.

## Test Data
```
Input arc: M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z
Original arc: radius = 1.4142 (√2), sweepFlag = 1 (CCW)
```

##Observations from Tracing

At d=-2 (inward):
- Arc should shrink: newRadius = 1.4142 - (-2)*(-1) = 0.4142 (still valid!)
- But output shows weird segment: `L -2.000000 33.246211` (Y way out of bounds!)

At d=+2 (outward):
- Arc should grow: newRadius = 1.4142 + 2*(-1) = -0.5858 (goes negative!)
- Result: Arc degenerates, segments missing

## Possible Causes

1. **Sign convention mismatch**: User expects positive = outward, but code uses positive = inward

2. **Wrong tangent calculation**: When arc degenerates, tangent calculation can flip, causing gap-bridge to calculate wrong direction (leads to Y=33.246)

3. **Arc center issue**: For SVG endpoint form, if center is being calculated incorrectly, offset formulas break

## Next Steps

1. Verify sign convention with user (positive = outward or inward?)
2. Check if arc center is being computed correctly from SVG endpoint form
3. Investigate tangent direction when arc is near-degenerate
4. Consider explicit safeguards for near-degenerate arcs before bridge construction
