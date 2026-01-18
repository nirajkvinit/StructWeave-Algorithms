---
id: M535
old_id: A424
slug: prison-cells-after-n-days
title: Prison Cells After N Days
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Prison Cells After N Days

## Problem

Imagine a prison with 8 cells in a row, where each cell is either occupied by a prisoner or empty. Every day, the prison state changes based on a simple rule: a cell becomes occupied if both neighbors have the same state (both occupied or both empty), otherwise it becomes vacant. The cells on the ends always become empty since they don't have two neighbors.

A prison consists of `8` cells arranged in a row. Each cell is either occupied (1) or vacant (0).

The state changes daily based on these transition rules:

- A cell becomes occupied if both adjacent neighbors have the same state (both occupied or both vacant).
- Otherwise, the cell becomes vacant.

**Note**: The first and last cells cannot have two neighbors, so they always become vacant after day 1.

Given the initial state and a number of days `n` (which could be as large as 1 billion), you need to determine the final state. The trick is that simulating each day individually would be too slow for large `n`.

For example, starting with `[0,1,0,1,1,0,0,1]` and simulating for 7 days:
- After 1 day: `[0,1,1,0,0,0,0,0]` (ends become 0, middle cells follow the rule)
- The state continues evolving each day until day 7

Given an integer array `cells` representing the initial state (where `cells[i] == 1` means occupied and `cells[i] == 0` means vacant) and an integer `n`, compute the state after `n` days.

Return the final prison state after `n` transitions.

## Why This Matters

Cellular automaton problems like this model real-world systems that evolve over time following simple rules - from Conway's Game of Life to traffic pattern simulations, epidemic modeling, and even crystal growth. The key learning here is cycle detection: many systems that follow deterministic rules eventually repeat themselves, and recognizing this pattern lets you simulate billions of steps in constant time. This technique appears in game state analysis, random number generators, hash collision detection, and any system where you need to predict far-future states efficiently.

## Examples

**Example 1:**
- Input: `cells = [0,1,0,1,1,0,0,1], n = 7`
- Output: `[0,0,1,1,0,0,0,0]`
- Explanation: State progression over 7 days:
Day 0: [0, 1, 0, 1, 1, 0, 0, 1]
Day 1: [0, 1, 1, 0, 0, 0, 0, 0]
Day 2: [0, 0, 0, 0, 1, 1, 1, 0]
Day 3: [0, 1, 1, 0, 0, 1, 0, 0]
Day 4: [0, 0, 0, 0, 0, 1, 0, 0]
Day 5: [0, 1, 1, 1, 0, 1, 0, 0]
Day 6: [0, 0, 1, 0, 1, 1, 0, 0]
Day 7: [0, 0, 1, 1, 0, 0, 0, 0]

**Example 2:**
- Input: `cells = [1,0,0,1,0,0,1,0], n = 1000000000`
- Output: `[0,0,1,1,1,1,1,0]`

## Constraints

- cells.length == 8
- cells[i] is either 0 or 1.
- 1 <= n <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Since there are only 8 cells and each cell has 2 states, there are at most 2^8 = 256 possible states. With n up to 10^9, the state must cycle. Detect the cycle, then use modulo arithmetic to find the state at day n without simulating all days.
</details>

<details>
<summary>Main Approach</summary>
Simulate the transitions day by day while storing each state in a dictionary with its first occurrence day. When you see a repeated state, you've found the cycle. Calculate cycle length, use (n - cycle_start) % cycle_length to determine which state in the cycle corresponds to day n.
</details>

<details>
<summary>Optimization Tip</summary>
The first and last cells always become 0 after day 1 and stay 0. This reduces possible states. Also, the cycle always starts after at most 14 states because there are only 2^6 = 64 possible internal states (cells 1-6), and it must cycle within that.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Simulate n Days) | O(n) | O(1) | Timeout for large n (10^9) |
| Optimal (Cycle Detection) | O(2^k) | O(2^k) | k=6 internal cells, max 64 states |

## Common Mistakes

1. **Simulating all n days**
   ```python
   # Wrong: Times out for n = 10^9
   for day in range(n):
       cells = next_state(cells)
   return cells

   # Correct: Detect cycle
   seen = {}
   day = 0
   while day < n:
       state = tuple(cells)
       if state in seen:
           cycle_length = day - seen[state]
           remaining = (n - day) % cycle_length
           for _ in range(remaining):
               cells = next_state(cells)
           return cells
       seen[state] = day
       cells = next_state(cells)
       day += 1
   ```

2. **Incorrect state transition**
   ```python
   # Wrong: Modifying cells in place without preserving previous state
   for i in range(8):
       cells[i] = compute_next(cells, i)  # Uses already-modified cells

   # Correct: Use previous state for all computations
   prev = cells[:]
   for i in range(8):
       if i == 0 or i == 7:
           cells[i] = 0
       else:
           cells[i] = 1 if prev[i-1] == prev[i+1] else 0
   ```

3. **Not using tuple for dictionary key**
   ```python
   # Wrong: Lists are unhashable, can't be dict keys
   seen[cells] = day  # Error if cells is a list

   # Correct: Convert to tuple
   seen[tuple(cells)] = day
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Game of Life (Infinite Board) | Medium | 2D grid, similar state transition rules |
| Bulls and Cows with Cycles | Medium | Different cycle detection application |
| Stone Game with Cycles | Medium | Game theory with repeating patterns |
| Frog Jump with Cycle | Hard | Detect cycles in dynamic programming |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Cycle Detection](../../strategies/patterns/cycle-detection.md)
