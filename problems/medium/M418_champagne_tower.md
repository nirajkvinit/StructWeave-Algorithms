---
id: M418
old_id: A266
slug: champagne-tower
title: Champagne Tower
difficulty: medium
category: medium
topics: ["two-pointers"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Champagne Tower

## Problem

Champagne glasses are stacked in a triangular pyramid formation. The first row contains 1 glass at the top, the second row has 2 glasses, the third row has 3 glasses, and so on, up to the 100th row. Each glass can hold exactly one cup of champagne.

When you pour champagne, you start by pouring into the topmost glass. When that glass becomes full (holds exactly 1.0 cup), any additional champagne overflows and splits equally between the two glasses directly below it - one to the bottom-left and one to the bottom-right. This cascading continues down the pyramid. Glasses at the bottom row simply spill excess champagne onto the floor.

```
Champagne Tower Structure:

Row 0:              (0,0)
                     ╱ ╲
Row 1:          (1,0) (1,1)
                 ╱ ╲   ╱ ╲
Row 2:      (2,0) (2,1) (2,2)
             ╱ ╲   ╱ ╲   ╱ ╲
Row 3:  (3,0) (3,1) (3,2) (3,3)

When a glass overflows, excess champagne splits equally:
- 50% flows to the glass below-left
- 50% flows to the glass below-right

Example: 2 cups poured
Row 0: [1.0]       (full, 1 cup overflow)
Row 1: [0.5, 0.5]  (each gets half the overflow)
```

Given the number of cups poured and a specific glass position (row `query_row`, index `query_glass` within that row), determine how full that glass is. Both rows and positions within rows use 0-based indexing.

For example, pouring 2 cups fills the top glass completely (1.0) with 1 cup of overflow. That overflow splits equally to the two glasses in row 1, giving each 0.5 cups. If you query glass (1,1), the answer is 0.5.

## Why This Matters

This is a classic simulation problem that teaches how to model physical processes mathematically. The champagne tower demonstrates a cascade or propagation pattern where changes at one level affect subsequent levels - similar to how updates propagate in dependency graphs, how heat diffuses in physical systems, or how resources flow through hierarchical networks. The key algorithmic skill here is recognizing that you need to track intermediate states (overflow amounts) beyond just the final visible result. This pattern of "forward simulation" appears in physics simulations, game engines, financial modeling (compound interest), and distributed systems (load balancing across tiers).

## Examples

**Example 1:**
- Input: `poured = 1, query_row = 1, query_glass = 1`
- Output: `0.00000`
- Explanation: Pouring 1 cup into the apex glass at position (0, 0) fills it completely with no overflow, leaving all glasses below it empty.

**Example 2:**
- Input: `poured = 2, query_row = 1, query_glass = 1`
- Output: `0.50000`
- Explanation: Pouring 2 cups into the top glass at (0, 0) fills it with one cup of overflow. This excess splits evenly between glasses (1, 0) and (1, 1), giving each one half cup.

**Example 3:**
- Input: `poured = 100000009, query_row = 33, query_glass = 17`
- Output: `1.00000`

## Constraints

- 0 <= poured <= 10⁹
- 0 <= query_glass <= query_row < 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a simulation problem, not a two-pointers problem. Think about how champagne flows downward - when a glass overflows, the excess is distributed equally to the two glasses below it. You can model this as a grid where each position (i, j) represents a glass, and simulate the pouring process row by row.
</details>

<details>
<summary>Main Approach</summary>
Create a 2D array to track the amount of champagne in each glass. Start by pouring all champagne into the top glass (0, 0). For each glass that receives more than 1.0 cup, calculate the overflow and distribute half to each of the two glasses below it. Process row by row from top to bottom, ensuring overflow cascades correctly. Finally, return the amount in the queried glass, capped at 1.0.
</details>

<details>
<summary>Optimization Tip</summary>
Since champagne only flows downward, you only need to track rows up to the query_row. Also, the amount of champagne in each glass is capped at 1.0 for the return value, but during calculation, you need to track the full amount to compute overflow correctly. For very large pour amounts, the queried glass will almost certainly be full if it's within the tower range.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Simulation | O(R²) | O(R²) | R = query_row + 1, simulate all glasses up to query row |
| Optimal (Space Optimized) | O(R²) | O(R) | Can use rolling array since we only need previous row |

## Common Mistakes

1. **Capping overflow too early**
   ```python
   # Wrong: Capping at 1.0 prevents overflow calculation
   glasses[i][j] = min(1.0, champagne)
   overflow = 0  # Lost the overflow!

   # Correct: Calculate overflow before capping for display
   if champagne > 1.0:
       overflow = champagne - 1.0
       glasses[i][j] = 1.0
   ```

2. **Forgetting to check bounds**
   ```python
   # Wrong: May index out of bounds on edges
   glasses[i+1][j] += overflow / 2
   glasses[i+1][j+1] += overflow / 2

   # Correct: Check row bounds before accessing
   if i + 1 <= query_row:
       glasses[i+1][j] += overflow / 2
       if j + 1 < len(glasses[i+1]):
           glasses[i+1][j+1] += overflow / 2
   ```

3. **Not handling edge positions**
   ```python
   # Wrong: Assumes every glass has two glasses below
   # This fails for edge glasses

   # Correct: Position (i, j) flows to (i+1, j) and (i+1, j+1)
   # But check that j+1 is valid for row i+1
   if j <= i + 1:  # Valid left-below glass
       glasses[i+1][j] += overflow / 2
   if j + 1 <= i + 1:  # Valid right-below glass
       glasses[i+1][j+1] += overflow / 2
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Triangle Minimum Path Sum | Medium | Find minimum sum path from top to bottom |
| Pascal's Triangle | Easy | Generate rows where each element is sum of two above |
| Pour Water Between Buckets | Hard | Multiple pour operations with bidirectional flow |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
