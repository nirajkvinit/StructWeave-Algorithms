---
id: E027
old_id: F055
slug: jump-game
title: Jump Game
difficulty: easy
category: easy
topics: ["array", "greedy", "dynamic-programming"]
patterns: ["greedy", "reachability"]
estimated_time_minutes: 20
frequency: high
related_problems: ["M045", "M055", "E121"]
prerequisites: ["array-basics", "greedy-concepts"]
---
# Jump Game

## Problem

You are positioned at the first index of an array of non-negative integers. Each element in the array represents your maximum jump length from that position - not the exact distance you must jump, but the furthest you can jump. Determine whether you can reach the last index of the array.

For example, given [2,3,1,1,4]:
- At index 0 (value 2), you can jump 1 or 2 steps forward to reach indices 1 or 2
- If you jump to index 1 (value 3), you can jump 1, 2, or 3 steps, reaching indices 2, 3, or 4
- Since you can reach index 4 (the last index), return true

However, given [3,2,1,0,4]:
- No matter which path you take, you'll always land on index 3, which has value 0
- With a jump length of 0, you can't move forward, making it impossible to reach index 4
- Therefore, return false

The problem isn't asking for the minimum number of jumps or the specific path - just whether the destination is reachable at all. This is a decision problem that can be solved without exploring all possible paths.

## Why This Matters

This problem teaches the greedy algorithm paradigm through a simple reachability question. It demonstrates:
- **Greedy thinking**: Making locally optimal choices leading to global optimum
- **Reachability analysis**: Tracking what positions are accessible
- **Problem transformation**: From "can jump" to "can reach"

**Real-world applications:**
- Network routing determining if destination is reachable
- Game pathfinding checking if goal is achievable
- Resource allocation determining if target state is attainable

## Examples

**Example 1:**
- Input: `nums = [2,3,1,1,4]`
- Output: `true`
- Explanation: Jump 1 step from index 0 to 1, then 3 steps to the last index.

**Example 2:**
- Input: `nums = [3,2,1,0,4]`
- Output: `false`
- Explanation: You will always arrive at index 3 no matter what. Its maximum jump length is 0, which makes it impossible to reach the last index.

## Constraints

- 1 <= nums.length <= 10⁴
- 0 <= nums[i] <= 10⁵

## Think About

1. Do you need to track the exact path to reach the end?
2. What does it mean for a position to be "reachable"?
3. If you can reach position i, which positions become reachable next?
4. Can you work backwards from the end?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Do you need the path, or just reachability?</summary>

The problem asks "can you reach the last index?" - not "what's the path to reach it?"

This is a **decision problem** (yes/no), not an optimization problem.

**Think about:**
- You don't need to find the actual jumps to take
- You only need to determine if the last index is **reachable**
- Can you track the furthest position reachable so far?

**Example:** `[2,3,1,1,4]`
- From index 0 (value 2): can reach indices 1 or 2
- From index 1 (value 3): can reach indices 2, 3, or 4
- Index 4 is reachable, so return true

</details>

<details>
<summary>🎯 Hint 2: The greedy insight</summary>

Maintain a variable `max_reach` representing the furthest index you can possibly reach.

**Greedy strategy:**
- Iterate through the array left to right
- At each position i, if i <= max_reach, it's reachable
- Update max_reach to max(max_reach, i + nums[i])
- If max_reach >= last index, return true
- If you reach a position i > max_reach, you're stuck (return false)

**Why greedy works:** If you can reach position i, you can also reach all positions before i. You never need to "undo" progress.

**Key insight:** You don't need to try all possible jump sequences - just track the maximum reach.

</details>

<details>
<summary>📝 Hint 3: Greedy algorithm</summary>

```
max_reach = 0

for i in range(len(nums)):
    # If current position is unreachable, we're stuck
    if i > max_reach:
        return False

    # Update the furthest position we can reach
    max_reach = max(max_reach, i + nums[i])

    # Early termination: if we can already reach the end
    if max_reach >= len(nums) - 1:
        return True

return True  # If we finish the loop without getting stuck
```

**Time:** O(n) - single pass through array
**Space:** O(1) - only tracking max_reach

**Alternative (backward greedy):**
```
# Start from the end and work backwards
goal = len(nums) - 1

for i in range(len(nums) - 2, -1, -1):
    # Can we reach the goal from position i?
    if i + nums[i] >= goal:
        goal = i  # Update goal to this closer position

return goal == 0  # Can we reach position 0?
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Backtracking (try all paths) | O(2^n) | O(n) | Explores all jump combinations; too slow |
| Dynamic Programming | O(n²) | O(n) | Checks reachability for each position pair |
| **Greedy (Forward)** | **O(n)** | **O(1)** | Optimal; tracks max reach |
| **Greedy (Backward)** | **O(n)** | **O(1)** | Optimal; tracks closest goal position |

**Why Greedy Wins:**
- Single pass through array
- No need to explore all paths
- Constant space usage
- Works because reachability is monotonic (if you can reach i, you can reach all j < i)

---

## Common Mistakes

### 1. Trying to find the exact path
```python
# WRONG: Unnecessarily complex, wastes time
path = []
def dfs(index):
    if index == len(nums) - 1:
        return True
    for jump in range(1, nums[index] + 1):
        path.append(index + jump)
        if dfs(index + jump):
            return True
        path.pop()
    return False

# CORRECT: Just track reachability
max_reach = 0
for i, num in enumerate(nums):
    if i > max_reach:
        return False
    max_reach = max(max_reach, i + num)
return True
```

### 2. Not checking if current position is reachable
```python
# WRONG: Assumes all positions are reachable
max_reach = 0
for i, num in enumerate(nums):
    max_reach = max(max_reach, i + num)  # What if i > max_reach?

# CORRECT: Check reachability first
if i > max_reach:
    return False
max_reach = max(max_reach, i + num)
```

### 3. Off-by-one error in end condition
```python
# WRONG: Checks if we can go beyond the array
if max_reach > len(nums):  # Should be >= len(nums) - 1
    return True

# CORRECT: Check if we can reach the last index
if max_reach >= len(nums) - 1:
    return True
```

### 4. Not handling zero jump values
```python
# Example: [3,2,1,0,4]
# At index 3, nums[3] = 0, so you can't jump anywhere
# The algorithm naturally handles this:
# - max_reach stops growing at index 3
# - When i = 4, we have i > max_reach, so return False
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Jump Game II (M045)** | Find minimum jumps | BFS or greedy with jump counter |
| **Jump Game III** | Can jump forward/backward | BFS/DFS with visited tracking |
| **Jump Game IV** | Jump to same value anywhere | Graph-based BFS |
| **Minimum cost to reach end** | Each jump has a cost | DP with cost optimization |
| **Maximum reach with k jumps** | Limited number of jumps | DP with jump counter |

**Dynamic Programming Approach (for educational purposes):**
```python
def canJump(nums):
    n = len(nums)
    dp = [False] * n
    dp[0] = True  # Starting position is reachable

    for i in range(n):
        if not dp[i]:  # If position i is not reachable, skip it
            continue

        # Mark all positions reachable from i
        for jump in range(1, nums[i] + 1):
            if i + jump < n:
                dp[i + jump] = True

    return dp[n - 1]

# This works but is O(n²) time and O(n) space
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles successful jump (Example 1)
- [ ] Handles impossible jump (Example 2)
- [ ] Handles single element array
- [ ] Handles array with zeros
- [ ] Handles zero at start (always fails unless array has 1 element)

**Optimization:**
- [ ] Achieved O(n) time complexity
- [ ] Used O(1) space (greedy approach)
- [ ] No backtracking or DP needed

**Interview Readiness:**
- [ ] Can explain greedy approach
- [ ] Can code solution in 5 minutes
- [ ] Can implement both forward and backward greedy
- [ ] Can explain why greedy works (reachability monotonicity)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement backward greedy variant
- [ ] Day 14: Solve M045 (Jump Game II)
- [ ] Day 30: Quick review

---

**Strategy**: See [Greedy Pattern](../../strategies/patterns/greedy.md) | [Dynamic Programming Guide](../../strategies/patterns/dynamic-programming.md)
