---
id: M009
old_id: F040
slug: combination-sum-ii
title: Combination Sum II
difficulty: medium
category: medium
topics: ["array", "backtracking"]
patterns: ["backtrack-combination", "duplicate-handling"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M008", "M011", "M013"]
prerequisites: ["backtracking-basics", "recursion"]
strategy_ref: ../strategies/patterns/backtracking.md
---

# Combination Sum II

## Problem

You have a collection of numbers (possibly containing duplicates) and a target sum. Find all unique combinations of numbers that add up to the target, where each number from the collection can be used at most once per combination. The critical constraint is avoiding duplicate combinations in your result set. For example, if the input is [10,1,2,7,6,1,5] with target 8, valid combinations include [1,1,6], [1,2,5], [1,7], and [2,6]. Notice the array contains two 1's, but [1,1,6] appears only once in the output - you're not generating it twice by using different 1's. The challenge lies in systematically exploring combinations while skipping duplicate branches during generation rather than generating everything and filtering afterward. Sorting the array first enables an elegant skip pattern that prevents duplicates. Edge cases include arrays with many duplicate values and targets unreachable with any combination.

```
Example visualization:
candidates = [10,1,2,7,6,1,5], target = 8

After sorting: [1,1,2,5,6,7,10]

Valid combinations:
[1,1,6] ✓
[1,2,5] ✓
[1,7]   ✓
[2,6]   ✓

Duplicate to avoid: [1,1,6] appearing twice (using different 1s)
```

## Why This Matters

The duplicate-handling pattern you'll learn here is one of the most important backtracking techniques, appearing across countless combination and permutation problems. Resource allocation systems use this when distributing identical resources (like assigning identical servers to tasks). Inventory management needs to find valid product combinations that meet order requirements without treating identical items as distinct. The "skip at same level" logic is subtle but powerful, teaching you to reason about recursion tree levels. Optimization problems in operations research frequently involve selecting from pools with duplicates. The sorting plus backtracking combination is a fundamental pattern that makes intractable problems tractable. Understanding when to skip versus when to use duplicates deepens your grasp of recursion state management. This is a high-frequency interview question because it extends basic backtracking with a non-obvious optimization that separates novice from experienced problem-solvers. The difference between using i+1 versus i in the recursive call demonstrates the distinction between problems with and without element reuse.

## Examples

**Example 1:**
- Input: `candidates = [10,1,2,7,6,1,5], target = 8`
- Output: `[[1,1,6], [1,2,5], [1,7], [2,6]]`
- Explanation: Note the array contains two 1s, but [1,1,6] appears only once.

**Example 2:**
- Input: `candidates = [2,5,2,1,2], target = 5`
- Output: `[[1,2,2], [5]]`
- Explanation: Three 2s in input, but combinations use them without duplication.

**Example 3:**
- Input: `candidates = [1], target = 1`
- Output: `[[1]]`

**Example 4:**
- Input: `candidates = [1,1,1], target = 2`
- Output: `[[1,1]]`
- Explanation: Only one way to combine two 1s.

## Constraints

- 1 <= candidates.length <= 100
- 1 <= candidates[i] <= 50
- 1 <= target <= 30

## Think About

1. How does sorting help avoid duplicate combinations?
2. What's the difference between skipping a duplicate at the same level vs using it in recursion?
3. When can you stop exploring a branch early?
4. How is this different from Combination Sum I (where reuse is allowed)?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Why sorting is critical</summary>

Without sorting, detecting duplicates is nearly impossible in backtracking.

Consider `[2,5,2,1,2]` unsorted vs `[1,2,2,2,5]` sorted:
- Unsorted: How do you know you're using "the same 2" twice?
- Sorted: Adjacent duplicates are easy to detect!

**Think about:**
- After sorting, how can you identify when you're about to create a duplicate combination?
- What does "same level" vs "different level" mean in the recursion tree?

</details>

<details>
<summary>🎯 Hint 2: The critical skip condition</summary>

This is THE most important pattern for backtracking with duplicates:

```
if i > start and candidates[i] == candidates[i-1]:
    continue  # Skip this duplicate at the same recursion level
```

**Why this works:**
```
candidates = [1, 1, 2], target = 3

At level 0:
  Choose first 1 → explore all combinations starting with 1
  Skip second 1  → would create duplicates!
  Choose 2 → explore combinations starting with 2

The first 1 already explored "1 + anything", so second 1 is redundant.
```

**Key insight:** `i > start` ensures we only skip duplicates at the same recursion level, NOT in deeper levels where we need to use duplicates.

</details>

<details>
<summary>📝 Hint 3: Complete backtracking algorithm</summary>

```
function combinationSum2(candidates, target):
    sort candidates  # Critical for duplicate detection
    result = []
    current = []

    function backtrack(start, remaining):
        if remaining == 0:
            result.add(copy of current)
            return

        if remaining < 0:
            return  # Pruning: exceeded target

        for i from start to end:
            # CRITICAL: Skip duplicates at same level
            if i > start and candidates[i] == candidates[i-1]:
                continue

            # Pruning: sorted array, so no point continuing
            if candidates[i] > remaining:
                break

            current.add(candidates[i])
            backtrack(i + 1, remaining - candidates[i])  # i+1: no reuse
            current.remove_last()

    backtrack(0, target)
    return result
```

**Why `i+1` not `i`?** Each number can only be used once. Compare to Combination Sum I which uses `i` to allow reuse.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Generate all, deduplicate | O(2^n × n log n) | O(2^n) | Simple but wasteful |
| **Backtrack with skip (optimal)** | **O(2^n)** | **O(n)** | Avoids duplicates during generation |
| DFS without pruning | O(2^n × n) | O(n) | Explores unnecessary branches |

**Why backtracking with skip wins:**
- Generates only unique combinations (no deduplication needed)
- Pruning reduces branches significantly
- O(n) sorting is negligible compared to O(2^n) exploration

**Detailed complexity:**
- **Time:** O(n log n) sorting + O(2^n) backtracking (worst case: all subsets)
- **Space:** O(n) recursion depth + O(k) for current combination (k ≤ n)

**Pruning effectiveness:**
- `if candidates[i] > remaining: break` → Stops early in sorted array
- `if i > start and candidates[i] == candidates[i-1]: continue` → Skips duplicate branches

---

## Common Mistakes

### 1. Wrong skip condition
```python
# WRONG: Skips duplicates everywhere, even when needed
if i > 0 and candidates[i] == candidates[i-1]:
    continue  # This breaks [1,1,2] target=2 → should be [[1,1]]

# CORRECT: Only skip at same recursion level
if i > start and candidates[i] == candidates[i-1]:
    continue  # start tracks current recursion level
```

### 2. Using a set for deduplication
```python
# WRONG: Inefficient, generates duplicates then removes
def combinationSum2(candidates, target):
    result = set()  # Tuples for hashing
    # ... backtrack without skip logic ...
    result.add(tuple(sorted(current)))
    return [list(x) for x in result]
# This defeats the purpose of smart backtracking!

# CORRECT: Skip during generation
# Use the skip condition to never create duplicates
```

### 3. Forgetting to sort
```python
# WRONG: Skip condition doesn't work on unsorted array
def combinationSum2(candidates, target):
    # candidates not sorted!
    # Skip logic fails: [2,1,2] → can't detect adjacent duplicates
```

### 4. Using i instead of i+1 in recursion
```python
# WRONG: Allows reusing same element
backtrack(i, remaining - candidates[i])  # Wrong! This is Combination Sum I

# CORRECT: Move to next element
backtrack(i + 1, remaining - candidates[i])  # Each number used once
```

### 5. Not pruning with sorted array
```python
# SUBOPTIMAL: Continues even when impossible
for i in range(start, len(candidates)):
    # ... no break when candidates[i] > remaining
    backtrack(i + 1, remaining - candidates[i])

# OPTIMAL: Break early
for i in range(start, len(candidates)):
    if candidates[i] > remaining:
        break  # Sorted, so all remaining are too large
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Combination Sum I** | Reuse allowed | Use `i` instead of `i+1`, no skip logic |
| **Combination Sum III** | Fixed k numbers | Add depth tracking, stop at k |
| **Subset Sum** | Any subset sums to target | Same approach, different framing |
| **Count combinations** | Return count, not lists | Don't build current, just count |
| **Largest sum ≤ target** | Maximize sum | Track max_sum, don't stop at exact |

**Count combinations variation:**
```python
def combinationSumCount(candidates, target):
    candidates.sort()
    count = 0

    def backtrack(start, remaining):
        nonlocal count
        if remaining == 0:
            count += 1
            return
        if remaining < 0:
            return

        for i in range(start, len(candidates)):
            if i > start and candidates[i] == candidates[i-1]:
                continue
            if candidates[i] > remaining:
                break
            backtrack(i + 1, remaining - candidates[i])

    backtrack(0, target)
    return count
```

---

## Visual Walkthrough

```
candidates = [1, 1, 2], target = 2
After sorting: [1, 1, 2]

Recursion tree with skip logic:

                        []
                     /   |   \
                    1    ×    2
      (i=0, first 1)  (i=1,   (i=2)
                          skip)
                   /|\
                 1  2  (end)
    (i=1, use 2nd 1)  (i=2)
                /      |
              (=2✓)   (>2)

Level 0:
  i=0: Choose first 1 → current=[1], remaining=1
  i=1: SKIP (i > start=0 && candidates[1]==candidates[0])
  i=2: Choose 2 → current=[2], remaining=0 → Found [2] ✓

Level 1 (after choosing first 1):
  i=1: Choose second 1 → current=[1,1], remaining=0 → Found [1,1] ✓
  i=2: Choose 2 → current=[1,2], remaining=-1 (invalid)

Results: [[1,1], [2]]
```

```
More complex: candidates = [10,1,2,7,6,1,5], target = 8
After sorting: [1,1,2,5,6,7,10]

Key branches:
  [1,...] → explores [1,1,6], [1,2,5], [1,7]
  Skip second [1,...] (would duplicate above)
  [2,...] → explores [2,6]
  [5,...] → no valid (5+remaining > 8)
  ...

Final: [[1,1,6], [1,2,5], [1,7], [2,6]]
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles duplicates correctly ([1,1,2] target=2)
- [ ] No duplicate combinations in output
- [ ] Handles no solution case
- [ ] Handles single element
- [ ] Each number used at most once

**Code Quality:**
- [ ] Array sorted before backtracking
- [ ] Correct skip condition: `i > start`
- [ ] Proper pruning with break
- [ ] Clear variable names

**Optimization:**
- [ ] O(2^n) time without unnecessary deduplication
- [ ] Early termination with pruning
- [ ] No generating then filtering duplicates

**Interview Readiness:**
- [ ] Can explain skip logic clearly
- [ ] Can draw recursion tree showing skip
- [ ] Can code solution in 15 minutes
- [ ] Can discuss difference from Combination Sum I

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Combination Sum III variation
- [ ] Day 14: Explain skip condition to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Backtracking Pattern](../../strategies/patterns/backtracking.md) | [Duplicate Handling](../../strategies/patterns/duplicate-handling.md)
