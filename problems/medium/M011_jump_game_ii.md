---
id: M011
old_id: F045
slug: jump-game-ii
title: Jump Game II
difficulty: medium
category: medium
topics: ["array", "greedy", "dynamic-programming"]
patterns: ["greedy-algorithm", "bfs-implicit"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M018", "M095", "H003"]
prerequisites: ["greedy-algorithms", "array-traversal"]
strategy_ref: ../strategies/patterns/greedy.md
---

# Jump Game II

## Problem

Imagine you're standing at the start of an array where each position tells you the maximum distance you can jump forward. Your goal is to reach the last position using the fewest jumps possible. For example, if you're at position 0 and the value is 2, you can jump to position 1 or position 2 (but not further).

You are given a 0-indexed array `nums` where `nums[i]` represents the maximum jump length from index `i`. Starting at `nums[0]`, return the minimum number of jumps needed to reach `nums[n - 1]`. You're guaranteed that reaching the end is always possible.

Think of it like hopping across stones in a river: each stone has a number indicating how far ahead you can leap. The key insight is that you don't need to try every possible path. Instead, you can think in "waves" or "levels": all positions reachable with one jump form the first wave, positions reachable with two jumps form the second wave, and so on.

```
Example visualization:
nums = [2, 3, 1, 1, 4]
       0  1  2  3  4

Jump 1: From index 0 (value=2), reach indices 1 or 2
Jump 2: From index 1 (value=3), reach indices 2, 3, or 4 (end!)

Minimum jumps: 2
```

## Why This Matters

This problem is a masterclass in greedy optimization and demonstrates why sometimes the "obviously correct" brute-force approach (trying every path) is unnecessarily slow. The elegant solution treats the problem as breadth-first search without actually using a queue, processing positions in "waves" based on jump count.

**Real-world applications:**
- **Network routing**: Finding minimum hop paths between servers (BGP routing, CDN optimization)
- **Transportation planning**: Minimizing transfers in multi-modal transit systems
- **Game AI pathfinding**: Computing optimal move sequences in grid-based games
- **Compiler optimization**: Minimizing register transfers in assembly code generation
- **Supply chain logistics**: Reducing handoffs in multi-stage distribution networks

The pattern appears in technical interviews constantly because it tests your ability to recognize when greedy choices are provably optimal (not always true!) and whether you can avoid exploring unnecessary states. The difference between the O(n) greedy solution and O(n²) dynamic programming matters enormously when n reaches thousands or millions.

## Examples

**Example 1:**
- Input: `nums = [2,3,1,1,4]`
- Output: `2`
- Explanation: The minimum number of jumps to reach the last index is 2. Jump 1 step from index 0 to 1, then 3 steps to the last index.

**Example 2:**
- Input: `nums = [2,3,0,1,4]`
- Output: `2`
- Explanation: Same as example 1 (the zero at index 2 doesn't block us).

**Example 3:**
- Input: `nums = [1,2,3]`
- Output: `2`
- Explanation: Jump 1 step from index 0 to 1, then 2 steps to index 3 (last).

## Constraints

- 1 <= nums.length <= 10^4
- 0 <= nums[i] <= 1000
- It's guaranteed that you can reach nums[n - 1].

## Think About

1. Can you solve it without exploring all possible paths?
2. What information do you need to track at each step?
3. How is this similar to BFS (breadth-first search)?
4. What makes the greedy approach correct here?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Think in terms of ranges</summary>

Instead of considering every possible jump, think about the **farthest position you can reach** with a given number of jumps.

```
nums = [2, 3, 1, 1, 4]
       0  1  2  3  4

Jump 0 (start): Can reach indices in range [0, 0]
Jump 1: From range [0, 0], can reach [1, 2]
  - From index 0: can reach 0+2=2
  - Farthest: 2

Jump 2: From range [1, 2], can reach [2, 4]
  - From index 1: can reach 1+3=4
  - From index 2: can reach 2+1=3
  - Farthest: 4 (reached end!)
```

**Key insight:** You only need to track the farthest reachable position, not all individual positions.

</details>

<details>
<summary>🎯 Hint 2: Greedy BFS-like approach</summary>

Think of this as BFS where:
- Each "level" represents positions reachable with k jumps
- You want to find the minimum k such that level k contains the last index

```
Level 0: [0]           (start position)
Level 1: [1, 2]        (positions reachable with 1 jump)
Level 2: [3, 4]        (positions reachable with 2 jumps)

Last index (4) is in level 2 → answer is 2
```

You don't need a queue! Just track:
- `current_end`: rightmost position in current level
- `farthest`: rightmost position in next level
- When you reach `current_end`, increment jump count

</details>

<details>
<summary>📝 Hint 3: Greedy algorithm template</summary>

```
def jump(nums):
    if len(nums) <= 1:
        return 0

    jumps = 0
    current_end = 0      # End of current jump range
    farthest = 0         # Farthest we can reach

    # Don't need to process last index
    for i in range(len(nums) - 1):
        # Update farthest position reachable
        farthest = max(farthest, i + nums[i])

        # If we've reached the end of current jump range
        if i == current_end:
            jumps += 1           # Must make a jump
            current_end = farthest  # New range ends at farthest

            # Early exit if we can reach the end
            if current_end >= len(nums) - 1:
                break

    return jumps
```

**Why it works:**
- We're guaranteed to reach the end, so greedy works
- Always choose the jump that reaches farthest
- No need to explore all paths

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Greedy (range-based)** | **O(n)** | **O(1)** | Optimal solution |
| BFS with queue | O(n) | O(n) | Uses extra space for queue |
| Dynamic Programming | O(n²) | O(n) | Correct but slower |
| DFS + memoization | O(n²) | O(n) | Explores unnecessary paths |

**Why greedy wins:**
- Single pass through array
- Constant extra space
- No backtracking or state exploration needed

**Time breakdown:**
- One loop through n-1 elements
- Each iteration: O(1) operations
- Total: O(n)

**Proof of correctness:**
- At each position, we know the farthest we can reach
- We must jump when current range ends
- Choosing farthest position is always optimal (no disadvantage)

---

## Common Mistakes

### 1. Processing the last index
```python
# WRONG: May add extra jump
for i in range(len(nums)):  # Includes last index
    farthest = max(farthest, i + nums[i])
    if i == current_end:
        jumps += 1  # Might jump past the end!

# CORRECT: Stop before last index
for i in range(len(nums) - 1):
    farthest = max(farthest, i + nums[i])
    if i == current_end:
        jumps += 1
```

### 2. Not updating farthest correctly
```python
# WRONG: Only checks at jump boundaries
if i == current_end:
    jumps += 1
    farthest = max(farthest, i + nums[i])

# CORRECT: Update farthest at every position
farthest = max(farthest, i + nums[i])
if i == current_end:
    jumps += 1
    current_end = farthest
```

### 3. Confusing current_end and farthest
```python
# WRONG: Uses wrong variable
if i == farthest:  # Should be current_end
    jumps += 1

# CORRECT: Check current_end, update to farthest
if i == current_end:
    jumps += 1
    current_end = farthest
```

### 4. Not handling edge case
```python
# WRONG: Returns 1 for single element array
def jump(nums):
    jumps = 0
    # ... logic ...
    return jumps  # Should be 0 for [1]

# CORRECT: Early return for base case
def jump(nums):
    if len(nums) <= 1:
        return 0
    # ... rest of logic ...
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Can you reach the end?** | Boolean return | Same greedy, check if farthest >= n-1 |
| **Minimum jumps with cost** | Each jump has cost | DP approach, track min cost to each position |
| **Backward jumps allowed** | Can jump left | Use BFS or DP (greedy doesn't work) |
| **Maximum jumps given** | Limited number of jumps | DP with jump count constraint |
| **Ladder variation** | Jump exactly k steps | Different DP formulation |

**Can you reach end variation:**
```python
def canJump(nums):
    farthest = 0

    for i in range(len(nums)):
        # Can't reach position i
        if i > farthest:
            return False

        # Update farthest reachable
        farthest = max(farthest, i + nums[i])

        # Early exit if end is reachable
        if farthest >= len(nums) - 1:
            return True

    return farthest >= len(nums) - 1
```

---

## Visual Walkthrough

```
nums = [2, 3, 1, 1, 4]
       0  1  2  3  4

Initial state:
  jumps = 0
  current_end = 0
  farthest = 0

i=0: nums[0]=2
  farthest = max(0, 0+2) = 2
  i == current_end (0 == 0) → make a jump!
    jumps = 1
    current_end = 2
  State: jumps=1, current_end=2, farthest=2

i=1: nums[1]=3
  farthest = max(2, 1+3) = 4
  i != current_end (1 != 2)
  State: jumps=1, current_end=2, farthest=4

i=2: nums[2]=1
  farthest = max(4, 2+1) = 4
  i == current_end (2 == 2) → make a jump!
    jumps = 2
    current_end = 4
  State: jumps=2, current_end=4, farthest=4

i=3: nums[3]=1
  farthest = max(4, 3+1) = 4
  i != current_end (3 != 4)
  State: jumps=2, current_end=4, farthest=4

Stop at i=3 (before last index)

Return jumps = 2

BFS Level visualization:
Level 0: [0]        → positions reachable with 0 jumps
Level 1: [1, 2]     → positions reachable with 1 jump
Level 2: [3, 4]     → positions reachable with 2 jumps
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles single element array (returns 0)
- [ ] Handles array where last jump reaches exactly n-1
- [ ] Handles array where last jump overshoots n-1
- [ ] Doesn't count extra jump at the end
- [ ] Works with zeros in the array

**Code Quality:**
- [ ] Iterates to n-1, not n
- [ ] Updates farthest at every step
- [ ] Only increments jumps at current_end
- [ ] Clean variable names (current_end, farthest)

**Interview Readiness:**
- [ ] Can explain greedy approach in 2 minutes
- [ ] Can draw BFS level diagram
- [ ] Can code solution in 10 minutes
- [ ] Can explain why greedy is correct

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve with greedy
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement "can reach end" variation
- [ ] Day 14: Compare with Jump Game I
- [ ] Day 30: Explain greedy correctness proof

---

**Strategy**: See [Greedy Algorithm Pattern](../../strategies/patterns/greedy.md)
