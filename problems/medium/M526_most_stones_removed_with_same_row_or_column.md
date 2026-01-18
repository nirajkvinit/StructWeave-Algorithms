---
id: M526
old_id: A414
slug: most-stones-removed-with-same-row-or-column
title: Most Stones Removed with Same Row or Column
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Most Stones Removed with Same Row or Column

## Problem

Picture a game board with stones placed at various positions on a 2D grid. You can remove a stone, but only if it shares at least one coordinate (either the same row or the same column) with at least one other stone that's still on the board. The question is: what's the maximum number of stones you can remove following this rule?

More formally, you're given `n` stones positioned at integer coordinates on an infinite 2D plane, where each position contains at most one stone. The positions are provided as an array where `stones[i] = [xi, yi]` represents the location of the i-th stone.

A stone can be removed if and only if there exists at least one other stone sharing either the same row (same x-coordinate) or the same column (same y-coordinate). When you remove a stone, you must check the removal condition again for remaining stones, as the board state changes.

For example, with stones at [[0,0],[0,1],[1,0],[1,2],[2,1],[2,2]], you might remove [2,2] (shares row with [2,1]), then [2,1] (shares column with [0,1]), and continue until only one stone remains that shares no coordinates with others. In this case, you can remove 5 stones, leaving 1.

The challenge is determining the removal sequence that maximizes the total number of removals.

## Why This Matters

This problem disguises itself as a game puzzle but is actually a graph connectivity problem that appears in network infrastructure planning. Consider telecommunication networks where relay stations (stones) share either latitude lines or longitude lines, and you want to minimize the number of critical nodes that, if removed, would disconnect the network. In VLSI chip design, this models wire routing where components sharing horizontal or vertical bus lines form connected groups. Social network analysis uses similar concepts to find community structures where people sharing common attributes (analogous to rows/columns) form clusters. The union-find solution teaches you to recognize disguised graph problems and apply disjoint set data structures, which are essential for Kruskal's minimum spanning tree algorithm, image segmentation, and dynamic connectivity queries in databases.

## Examples

**Example 1:**
- Input: `stones = [[0,0],[0,1],[1,0],[1,2],[2,1],[2,2]]`
- Output: `5`
- Explanation: One possible removal sequence:
1. Remove [2,2] (shares row with [2,1])
2. Remove [2,1] (shares column with [0,1])
3. Remove [1,2] (shares row with [1,0])
4. Remove [1,0] (shares column with [0,0])
5. Remove [0,1] (shares row with [0,0])
Stone [0,0] remains as it no longer shares coordinates with other stones.

**Example 2:**
- Input: `stones = [[0,0],[0,2],[1,1],[2,0],[2,2]]`
- Output: `3`
- Explanation: Possible sequence of 3 removals:
1. Remove [2,2] (shares row with [2,0])
2. Remove [2,0] (shares column with [0,0])
3. Remove [0,2] (shares row with [0,0])
Stones [0,0] and [1,1] remain isolated without shared coordinates.

**Example 3:**
- Input: `stones = [[0,0]]`
- Output: `0`
- Explanation: A single stone cannot be removed as it has no companions.

## Constraints

- 1 <= stones.length <= 1000
- 0 <= xi, yi <= 10⁴
- No two stones are at the same coordinate point.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Stones that share a row or column form a connected component. Within each component, you can remove all stones except one. The answer is: total stones - number of connected components. This is a Union-Find or DFS problem in disguise.
</details>

<details>
<summary>Main Approach</summary>
Union-Find approach:
1. Treat each unique row and column as nodes in a graph
2. For each stone at (x, y), union row x with column y
3. Count the number of connected components
4. Return: total stones - component count

Alternative DFS: Build adjacency list of stones sharing rows/columns, then count connected components.
</details>

<details>
<summary>Optimization Tip</summary>
To avoid row/column coordinate collision, offset column indices by a large number (e.g., column y becomes 10001 + y). This allows using a single Union-Find structure. Path compression and union by rank optimize Union-Find to nearly O(1) per operation.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(n^2) | O(n) | Build adjacency list checking all pairs |
| Optimal (Union-Find) | O(n × α(n)) | O(n) | α is inverse Ackermann (nearly constant) |

## Common Mistakes

1. **Confusing the formula**
   ```python
   # Wrong: Thinking answer is number of components
   return num_components

   # Correct: Answer is stones that CAN be removed
   return len(stones) - num_components
   ```

2. **Not handling row/column namespace collision**
   ```python
   # Wrong: Stone at (5, 5) would union same element
   uf.union(x, y)  # Bug if x == y

   # Correct: Offset columns to different namespace
   uf.union(x, 10001 + y)  # Assuming coordinates < 10001
   ```

3. **Inefficient component counting**
   ```python
   # Wrong: Counting components after each union
   components = set()
   for stone in stones:
       components.add(uf.find(stone))

   # Correct but verbose: Count at end
   # Better: Use DFS or track component count during unions
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of Provinces | Medium | Standard connected components problem |
| Accounts Merge | Medium | Union-Find with string matching |
| Redundant Connection | Medium | Find edge that creates cycle in graph |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Union-Find Pattern](../../strategies/data-structures/union-find.md)
