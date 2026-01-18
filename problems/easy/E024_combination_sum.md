---
id: E024
old_id: F039
slug: combination-sum
title: Combination Sum
difficulty: easy
category: easy
topics: ["array", "backtracking"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E025", "M040", "M216"]
prerequisites: ["arrays-basics", "recursion-basics", "backtracking-fundamentals"]
---
# Combination Sum

## Problem

Given an array of distinct positive integers called "candidates" and a target integer, find all unique combinations of candidates that sum exactly to the target. You can use the same candidate number unlimited times - there's no restriction on how many times you pick each number.

For example, with candidates [2,3,6,7] and target 7, the valid combinations are [[2,2,3], [7]] because:
- 2 + 2 + 3 = 7 (using 2 twice)
- 7 = 7 (using 7 once)

Note that [2,2,3] and [2,3,2] are considered the same combination, so you should only return one of them. The order within each combination doesn't matter, but you need to avoid generating duplicates like [2,3,2] and [3,2,2].

The challenge is systematically exploring all possible combinations without missing any or creating duplicates, while also avoiding paths that clearly won't work (like continuing to add numbers when the sum already exceeds the target). This requires a backtracking approach that makes choices, explores their consequences, and undoes choices to try alternatives.

## Why This Matters

This problem is a fundamental introduction to backtracking, one of the most powerful algorithmic paradigms. It teaches:
- **Exploration with constraints**: How to systematically explore solution spaces
- **Recursive thinking**: Building solutions incrementally
- **Pruning strategies**: Eliminating invalid paths early

**Real-world applications:**
- Change-making systems in financial software
- Resource allocation with repeatable options
- Subset generation in data analysis
- Configuration optimization in systems design

## Examples

**Example 1:**
- Input: `candidates = [2,3,6,7], target = 7`
- Output: `[[2,2,3],[7]]`
- Explanation: 2 and 3 are candidates, and 2 + 2 + 3 = 7. Note that 2 can be used multiple times.
7 is a candidate, and 7 = 7.
These are the only two combinations.

**Example 2:**
- Input: `candidates = [2,3,5], target = 8`
- Output: `[[2,2,2,2],[2,3,3],[3,5]]`

**Example 3:**
- Input: `candidates = [2], target = 1`
- Output: `[]`

## Constraints

- 1 <= candidates.length <= 30
- 2 <= candidates[i] <= 40
- All elements of candidates are **distinct**.
- 1 <= target <= 40

## Think About

1. How would you explore all possible combinations systematically?
2. When can you reuse the same candidate number?
3. How do you avoid generating duplicate combinations?
4. When should you stop exploring a particular path?

---

## Approach Hints

<details>
<summary>💡 Hint 1: How to explore all possibilities?</summary>

Think about decision trees. For each candidate, you have a choice:
- Use it (and potentially use it again)
- Skip it and move to the next candidate

**Think about:**
- How does this relate to tree traversal?
- What's the base case when you've found a valid combination?
- What's the base case when a path is invalid?

</details>

<details>
<summary>🎯 Hint 2: Backtracking with reuse</summary>

The key insight is that you can **reuse the same element** but you must avoid duplicates.

**Strategy:**
- Start from each candidate and try to reach the target
- At each step, you can either:
  1. Add the current candidate again (staying at the same index)
  2. Move to the next candidate
- Stop when sum equals target (success) or exceeds it (backtrack)

**Avoiding duplicates:** By always moving forward in the candidates array (never backward), you ensure [2,3,2] and [3,2,2] aren't both generated.

</details>

<details>
<summary>📝 Hint 3: Backtracking algorithm</summary>

```
function findCombinations(candidates, target):
    result = []

    function backtrack(start_index, current_combination, remaining_sum):
        if remaining_sum == 0:
            result.add(copy of current_combination)
            return

        if remaining_sum < 0:
            return  # pruning: this path won't work

        for i from start_index to end of candidates:
            candidate = candidates[i]

            # Make choice
            current_combination.add(candidate)

            # Recurse with same index (can reuse candidate)
            backtrack(i, current_combination, remaining_sum - candidate)

            # Undo choice (backtrack)
            current_combination.remove_last()

    backtrack(0, [], target)
    return result
```

**Key detail:** Pass `i` (not `i+1`) to allow reusing the same candidate.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Backtracking | O(N^(T/M)) | O(T/M) | N=candidates, T=target, M=min candidate |
| Dynamic Programming | O(N * T) | O(T) | Better for counting, not listing all |
| **Backtracking (Optimal)** | **O(N^(T/M))** | **O(T/M)** | Explores only valid paths with pruning |

**Why Backtracking:**
- Generates all solutions explicitly (required by problem)
- Pruning eliminates invalid paths early
- Space complexity is just recursion depth
- Time is exponential in worst case but much faster with pruning

**Explanation of O(N^(T/M)):**
- Worst case: smallest candidate is M, so max depth is T/M
- At each level, we have N choices
- Total nodes in tree: N^(T/M)

---

## Common Mistakes

### 1. Generating duplicate combinations
```
# WRONG: Starting from index 0 each time allows duplicates
def backtrack(current, remaining):
    for i in range(len(candidates)):  # Always starts at 0!
        backtrack(current + [candidates[i]], remaining - candidates[i])
# This generates [2,3,2] and [3,2,2] as separate combinations

# CORRECT: Pass start index to avoid duplicates
def backtrack(start, current, remaining):
    for i in range(start, len(candidates)):
        backtrack(i, current + [candidates[i]], remaining - candidates[i])
```

### 2. Not allowing reuse of elements
```
# WRONG: Incrementing index prevents reuse
backtrack(i + 1, current, remaining - candidates[i])

# CORRECT: Keep same index to allow reuse
backtrack(i, current, remaining - candidates[i])
```

### 3. Forgetting to copy the combination
```
# WRONG: Appends reference, not copy
if remaining == 0:
    result.append(current)  # current will be modified later!

# CORRECT: Append a copy
if remaining == 0:
    result.append(current[:])  # or list(current) or current.copy()
```

### 4. Not pruning early
```
# INEFFICIENT: Continues even when sum exceeded
if remaining == 0:
    result.append(current[:])
for i in range(start, len(candidates)):
    backtrack(i, current + [candidates[i]], remaining - candidates[i])

# EFFICIENT: Prune early when remaining becomes negative
if remaining < 0:
    return
if remaining == 0:
    result.append(current[:])
    return
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **No reuse allowed** | Each candidate once only | Pass `i+1` instead of `i` in recursion |
| **Combination Sum II** | Duplicates in input | Sort array, skip duplicates at same level |
| **Combination Sum III** | Fixed combination size k | Add size constraint to base case |
| **Count combinations** | Return count, not list | Use DP: `dp[i] = sum(dp[i-c] for c in candidates)` |
| **Minimum combinations** | Fewest coins needed | BFS or DP with min tracking |
| **Sorted candidates** | Can break early | If candidate > remaining, break loop |

**Variation: Combination Sum II (no reuse, duplicates in input):**
```
candidates.sort()  # Sort to group duplicates

def backtrack(start, current, remaining):
    if remaining == 0:
        result.append(current[:])
        return

    for i in range(start, len(candidates)):
        # Skip duplicates at the same recursion level
        if i > start and candidates[i] == candidates[i-1]:
            continue

        if candidates[i] > remaining:
            break  # Optimization: sorted array

        current.append(candidates[i])
        backtrack(i + 1, current, remaining - candidates[i])  # i+1: no reuse
        current.pop()
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles basic case (Example 1)
- [ ] Allows reusing same candidate multiple times
- [ ] Avoids duplicate combinations
- [ ] Handles case with no valid combinations (Example 3)
- [ ] Returns all valid combinations

**Optimization:**
- [ ] Implements early pruning (remaining < 0)
- [ ] Avoids generating duplicate combinations
- [ ] Correctly copies combinations before adding to result

**Interview Readiness:**
- [ ] Can explain backtracking approach in 2 minutes
- [ ] Can code solution in 8 minutes
- [ ] Can explain time/space complexity
- [ ] Can discuss variations (no reuse, fixed size k)
- [ ] Can optimize with sorting and early termination

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Combination Sum II variant
- [ ] Day 14: Explain backtracking pattern to someone
- [ ] Day 30: Quick review and complexity analysis

---

**Strategy**: See [Backtracking Pattern](../../strategies/patterns/backtracking.md) | [Recursion Guide](../../strategies/fundamentals/recursion.md)
