---
id: M231
old_id: A017
slug: random-flip-matrix
title: Random Flip Matrix
difficulty: medium
category: medium
topics: ["matrix", "hash-table", "math", "randomized"]
patterns: ["dp-2d", "reservoir-sampling"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - E384_shuffle_an_array
  - M398_random_pick_index
  - M528_random_pick_with_weight
prerequisites:
  - E217_contains_duplicate
  - M054_spiral_matrix
strategy_ref: ../prerequisites/hash-tables.md
---
# Random Flip Matrix

## Problem

Design a data structure that efficiently manages a binary matrix (2D grid) where all cells start as `0`. The challenge is to randomly flip cells from `0` to `1`, ensuring each remaining `0` has equal probability of being chosen.

Here's what makes this interesting: the grid can be huge (up to 10,000 x 10,000 = 100 million cells), so you cannot simply store a full matrix in memory. Instead, you need a clever approach that tracks only the flipped cells while maintaining truly random selection.

Implement the `Solution` class with these operations:

- `Solution(int m, int n)` - Initialize your data structure for an `m x n` grid. Don't actually create the full matrix.
- `int[] flip()` - Randomly select a cell that's currently `0`, change it to `1`, and return its coordinates `[row, col]`. Every remaining `0` must have exactly `1/remaining` probability of selection.
- `void reset()` - Restore all cells back to `0` without rebuilding massive data structures.

The key constraint: your solution must use much less than O(m x n) space for typical usage patterns. Think of how you can virtually track a 100-million-cell grid using only a small hash map.

## Why This Matters

This problem teaches the Fisher-Yates shuffle adaptation for virtual arrays, a technique used in memory-efficient random sampling across massive datasets. You'll encounter similar patterns in recommendation systems (sampling from millions of items), gaming engines (procedural generation without storing full worlds), and statistical simulations (reservoir sampling). The core insight translates directly to problems like "Random Pick with Blacklist" and weighted random selection. Mastering this space-time tradeoff demonstrates advanced understanding of how to represent sparse data structures efficiently.

## Constraints

- 1 <= m, n <= 10⁴
- There will be at least one free cell for each call to flip.
- At most 1000 calls will be made to flip and reset.

## Approach Hints

<details>
<summary>Hint 1: Virtual 1D Array Mapping</summary>

Instead of storing an actual 2D matrix (which could be 10⁴ × 10⁴ = 10⁸ cells!), think virtually.

Map each 2D position (i, j) to a 1D index: `index = i * n + j`
Reverse mapping: `i = index // n`, `j = index % n`

Now the problem becomes: Pick a random number from `[0, total-1]` where `total` is the number of remaining 0s.

Initially, `total = m × n`. After each flip, decrease `total`.

But how do you track which cells are flipped without using O(m×n) space?

</details>

<details>
<summary>Hint 2: Hash Map for Swap Tracking</summary>

Use the **Fisher-Yates shuffle** concept:
- Maintain a hash map to track swapped positions
- Keep `total` count of remaining cells
- When flipping:
  1. Pick random index `r` in range `[0, total-1]`
  2. Map `r` to actual cell using hash map (if `r` is in map, use mapped value; else use `r` itself)
  3. Swap position `r` with position `total-1` (like removing from available pool)
  4. Decrease `total`

The hash map only stores swapped positions, not all cells! This is O(flips) space, not O(m×n).

Example: m=3, n=3 (9 cells)
- total=9, pick r=4 → flip cell 4 → swap map[4]=8, total=8
- total=8, pick r=2 → flip cell 2 → swap map[2]=7, total=7
- etc.

</details>

<details>
<summary>Hint 3: Why Hash Map is Better Than List</summary>

Why not just maintain a list of available cells and remove from it?

List approach:
- Space: O(m×n) - stores all cell indices initially
- flip(): O(1) - random pick and swap with last element
- reset(): O(m×n) - rebuild the entire list

Hash map approach:
- Space: O(k) where k = number of flips (much smaller!)
- flip(): O(1) - random pick and hash map update
- reset(): O(k) - clear hash map and reset total

For m=n=10⁴, a single flip could require 10⁸ space with list but only O(1) with hash map!

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive (Store Matrix) | flip: O(1), reset: O(m×n) | O(m×n) | Not acceptable for large grids |
| List of Available | flip: O(1), reset: O(m×n) | O(m×n) | Initialize entire list |
| Hash Map (Optimal) | flip: O(1), reset: O(k) | O(k) | k = number of flips so far |
| Reservoir Sampling | flip: O(total), reset: O(1) | O(k) | Too slow per flip |

## Common Mistakes

### Mistake 1: Actually Creating the 2D Matrix
```python
# WRONG: Uses O(m×n) space always
class Solution:
    def __init__(self, m: int, n: int):
        self.m = m
        self.n = n
        self.matrix = [[0] * n for _ in range(m)]  # 10^8 cells!

    def flip(self):
        # Need to search for random 0... inefficient
        while True:
            i = random.randint(0, self.m - 1)
            j = random.randint(0, self.n - 1)
            if self.matrix[i][j] == 0:
                self.matrix[i][j] = 1
                return [i, j]

# CORRECT: Virtual mapping with hash map
class Solution:
    def __init__(self, m: int, n: int):
        self.m = m
        self.n = n
        self.total = m * n
        self.map = {}  # Only stores swapped positions

    def flip(self):
        r = random.randint(0, self.total - 1)
        x = self.map.get(r, r)
        self.map[r] = self.map.get(self.total - 1, self.total - 1)
        self.total -= 1
        return [x // self.n, x % self.n]

    def reset(self):
        self.map.clear()
        self.total = self.m * self.n
```

### Mistake 2: Not Handling the Swap Correctly
```python
# WRONG: Doesn't swap, just marks as used
class Solution:
    def __init__(self, m: int, n: int):
        self.m = m
        self.n = n
        self.total = m * n
        self.used = set()

    def flip(self):
        r = random.randint(0, self.total - 1)
        while r in self.used:  # Could loop many times!
            r = random.randint(0, self.total - 1)
        self.used.add(r)
        return [r // self.n, r % self.n]

# CORRECT: Swap to maintain compact available pool
class Solution:
    def __init__(self, m: int, n: int):
        self.m = m
        self.n = n
        self.total = m * n
        self.map = {}

    def flip(self):
        r = random.randint(0, self.total - 1)
        x = self.map.get(r, r)
        self.map[r] = self.map.get(self.total - 1, self.total - 1)
        self.total -= 1
        return [x // self.n, x % self.n]
```

### Mistake 3: Incorrect 2D to 1D Mapping
```python
# WRONG: Wrong formula for 2D to 1D conversion
class Solution:
    def flip(self):
        r = random.randint(0, self.total - 1)
        x = self.map.get(r, r)
        self.map[r] = self.map.get(self.total - 1, self.total - 1)
        self.total -= 1
        return [x % self.n, x // self.n]  # WRONG ORDER!

# CORRECT: i = index // n, j = index % n
class Solution:
    def flip(self):
        r = random.randint(0, self.total - 1)
        x = self.map.get(r, r)
        self.map[r] = self.map.get(self.total - 1, self.total - 1)
        self.total -= 1
        return [x // self.n, x % self.n]  # CORRECT
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Random Pick with Blacklist | Avoid certain indices | Medium |
| Random Pick with Weight | Cells have different selection weights | Medium |
| Random Rectangle Flip | Flip entire rectangles instead of cells | Hard |
| Undo Last Flip | Support undo operation | Medium |
| K Random Flips at Once | Flip k distinct cells simultaneously | Medium |

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Practice Checklist

- [ ] Implement hash map solution (Day 1)
- [ ] Verify correctness with small examples (m=2, n=2) (Day 1)
- [ ] Compare space usage: matrix vs hash map (Day 3)
- [ ] Solve related: Random Pick with Weight (Day 7)
- [ ] Solve related: Shuffle an Array (Day 7)
- [ ] Solve without looking at notes (Day 14)
- [ ] Teach the solution to someone else (Day 30)

**Strategy**: See [Hash Tables Pattern](../prerequisites/hash-tables.md)
