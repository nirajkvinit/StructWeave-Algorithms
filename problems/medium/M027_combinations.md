---
id: M027
old_id: F077
slug: combinations
title: Combinations
difficulty: medium
category: medium
topics: ["backtracking", "recursion", "combinatorics"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M031", "M046", "E030"]
prerequisites: ["recursion-basics", "backtracking-pattern"]
strategy_ref: ../strategies/patterns/backtracking.md
---

# Combinations

## Problem

Given two integers n and k, generate all possible combinations of k numbers selected from the range [1, n]. A combination is a subset where the order of elements doesn't matter. For instance, [1,2] and [2,1] represent the same combination, so only one should appear in your result.

The mathematical formula for the number of combinations is C(n,k) = n! / (k! × (n-k)!), also written as "n choose k". For example, with n=4 and k=2, there are C(4,2) = 6 combinations: [1,2], [1,3], [1,4], [2,3], [2,4], and [3,4]. Your task is to generate all of these combinations, not just count them.

This problem is fundamentally about systematic exploration. You need to build combinations incrementally, making choices one element at a time while avoiding duplicates. The key technique is backtracking: recursively add elements to a growing combination, and when you've added k elements, save that combination and backtrack to explore other possibilities. To prevent duplicates, once you choose a number, only consider larger numbers for subsequent positions. This ensures [1,2] is generated but [2,1] is not.

You can optimize by pruning the search space early. If you've already chosen some elements and there aren't enough remaining numbers to complete a k-length combination, you can stop exploring that branch immediately rather than recursing deeper only to find no valid solutions.

```
Example visualization for n=4, k=2:
Available numbers: 1, 2, 3, 4

All combinations:
[1, 2]  [1, 3]  [1, 4]
        [2, 3]  [2, 4]
                [3, 4]

Total: C(4,2) = 6 combinations
```

## Why This Matters

This problem teaches essential skills for combinatorial generation:
- **Backtracking pattern**: Building solutions incrementally and abandoning invalid paths
- **Search space pruning**: Avoiding redundant computation
- **Combination vs permutation**: Understanding when order matters

**Real-world applications:**
- Team selection algorithms (choosing k people from n candidates)
- Feature selection in machine learning (selecting k features from n)
- Portfolio optimization (selecting k assets from n available)
- Lottery systems and probability calculations

## Examples

**Example 1:**
- Input: `n = 4, k = 2`
- Output: `[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]`
- Explanation: There are C(4,2) = 6 total combinations. Note that combinations are unordered, i.e., [1,2] and [2,1] are considered to be the same combination.

**Example 2:**
- Input: `n = 1, k = 1`
- Output: `[[1]]`
- Explanation: There is C(1,1) = 1 total combination.

**Example 3:**
- Input: `n = 5, k = 3`
- Output: `[[1,2,3],[1,2,4],[1,2,5],[1,3,4],[1,3,5],[1,4,5],[2,3,4],[2,3,5],[2,4,5],[3,4,5]]`
- Explanation: C(5,3) = 10 combinations

## Constraints

- 1 <= n <= 20
- 1 <= k <= n

## Think About

1. How can you build combinations incrementally?
2. What prevents duplicate combinations (e.g., [1,2] and [2,1])?
3. When can you stop exploring a branch early?
4. What's the relationship between C(n,k) and the total number of recursive calls?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Build combinations incrementally</summary>

Instead of trying to generate all combinations at once, build them one number at a time.

**Key insight:** Once you choose a number, only consider numbers **greater than it** for the next position. This prevents duplicates like [1,2] and [2,1].

```
Start with empty combination: []
Choose 1: [1] → next choices: 2,3,4
  Choose 2: [1,2] ✓ (k=2, done!)
  Choose 3: [1,3] ✓
  Choose 4: [1,4] ✓
Choose 2: [2] → next choices: 3,4
  Choose 3: [2,3] ✓
  Choose 4: [2,4] ✓
Choose 3: [3] → next choices: 4
  Choose 4: [3,4] ✓
Choose 4: [4] → no more choices (need k=2)
```

**Think about:** Why does starting each choice "after" the previous number avoid duplicates?

</details>

<details>
<summary>🎯 Hint 2: Early pruning optimization</summary>

You can stop exploring early if there aren't enough numbers left to complete the combination.

```
If you need k more numbers but only have m numbers remaining:
  If m < k, stop exploring (impossible to complete)

Example: n=5, k=4, current=[1,2]
  At position 5, you need 2 more numbers
  But only number 5 remains (1 number)
  Can't make a valid combination → prune this branch
```

**Pruning condition:**
```
remaining_needed = k - current_combination_size
remaining_available = n - current_number + 1
if remaining_available < remaining_needed:
    return  # prune
```

This optimization significantly reduces the search space!

</details>

<details>
<summary>📝 Hint 3: Backtracking template</summary>

```
def combine(n, k):
    result = []

    def backtrack(start, current_combination):
        # Base case: combination is complete
        if len(current_combination) == k:
            result.append(current_combination[:])  # Make a copy!
            return

        # Pruning: not enough numbers left
        remaining_needed = k - len(current_combination)

        # Try each number from start to n
        for num in range(start, n + 1):
            # Optimization: early termination
            remaining_available = n - num + 1
            if remaining_available < remaining_needed:
                break  # No point continuing

            # Choose: add number to combination
            current_combination.append(num)

            # Explore: recurse with next start position
            backtrack(num + 1, current_combination)

            # Unchoose: remove number (backtrack)
            current_combination.pop()

    backtrack(1, [])
    return result
```

**Critical details:**
- `start` parameter ensures we only pick numbers >= previous choice
- `current_combination[:]` creates a copy (don't append reference!)
- `num + 1` in recursive call prevents reusing the same number

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Backtracking with pruning** | **O(k × C(n,k))** | **O(k)** | Optimal for generation |
| Iterative (bit manipulation) | O(n × 2^n) | O(k) | Simple but explores invalid states |
| Generate all, filter | O(k × 2^n) | O(2^n) | Wasteful for small k |

**Why backtracking wins:**
- Only generates valid combinations (no wasted work)
- C(n,k) is much smaller than 2^n for most cases
- O(k) space for recursion stack (excluding output)

**Time breakdown:**
- Number of valid combinations: C(n,k) = n! / (k! × (n-k)!)
- Each combination requires O(k) work to build
- Total: O(k × C(n,k))

**Pruning impact:**
- Without pruning: explores many invalid branches
- With pruning: reduces recursive calls by ~30-50% in practice

---

## Common Mistakes

### 1. Returning reference instead of copy
```python
# WRONG: All results point to same list!
if len(current) == k:
    result.append(current)  # Reference to mutable list

# After backtracking, all results become empty []

# CORRECT: Make a copy
if len(current) == k:
    result.append(current[:])  # or list(current)
```

### 2. Allowing duplicates
```python
# WRONG: Generates [1,2] and [2,1]
for num in range(1, n + 1):  # Always starts from 1
    backtrack(num)

# CORRECT: Only consider numbers after current
for num in range(start, n + 1):  # start increases each level
    backtrack(num + 1)
```

### 3. Incorrect base case
```python
# WRONG: Misses combinations
if start > n:
    return

# CORRECT: Check combination size
if len(current) == k:
    result.append(current[:])
    return
```

### 4. Not pruning effectively
```python
# INEFFICIENT: Explores doomed branches
for num in range(start, n + 1):
    current.append(num)
    backtrack(num + 1)
    current.pop()

# OPTIMIZED: Stop early when impossible
for num in range(start, n + 1):
    if n - num + 1 < k - len(current):
        break  # Not enough numbers left
    current.append(num)
    backtrack(num + 1)
    current.pop()
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Combinations with repetition** | Can reuse numbers | Pass `num` instead of `num+1` to recursion |
| **k-length subsets of list** | Input is list not range | Same algorithm, iterate over list indices |
| **Combination sum** | Sum must equal target | Add sum tracking, prune when sum > target |
| **All subsets (2^n)** | All sizes, not just k | Remove k constraint, generate for all sizes |
| **Lexicographic order** | Specific ordering | Natural with backtracking (already in order) |

**Combination with repetition:**
```python
# Allow reusing same number multiple times
def combineWithRepetition(n, k):
    result = []

    def backtrack(start, current):
        if len(current) == k:
            result.append(current[:])
            return

        for num in range(start, n + 1):
            current.append(num)
            backtrack(num, current)  # num, not num+1!
            current.pop()

    backtrack(1, [])
    return result

# Example: n=3, k=2
# Output: [[1,1],[1,2],[1,3],[2,2],[2,3],[3,3]]
```

---

## Visual Walkthrough

```
n=4, k=2 - Decision Tree:

                    []
        ┌─────┬─────┼─────┬─────┐
        1     2     3     4    (n=5 pruned)
        │     │     │     │
    ┌───┼───┐ ┌───┐ │    (no more)
    2   3   4 3   4 4
    │   │   │ │   │ │
   [1,2][1,3][1,4][2,3][2,4][3,4]
    ✓   ✓   ✓ ✓   ✓ ✓

Pruning example (if k=3):
Starting at 3 with current=[1,2]:
  remaining_needed = 3 - 2 = 1
  remaining_available = 4 - 3 + 1 = 2
  2 >= 1 → continue

Starting at 4 with current=[1,2]:
  remaining_needed = 3 - 2 = 1
  remaining_available = 4 - 4 + 1 = 1
  1 >= 1 → continue (just enough!)

Starting at 5 with current=[1,2]:
  remaining_needed = 3 - 2 = 1
  remaining_available = 4 - 5 + 1 = 0
  0 < 1 → PRUNE (impossible)
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles k=1 (single elements)
- [ ] Handles k=n (all elements)
- [ ] No duplicate combinations
- [ ] Correct count: C(n,k) combinations
- [ ] All combinations in valid range [1,n]

**Code Quality:**
- [ ] Makes copy of combination before adding to result
- [ ] Uses start parameter to avoid duplicates
- [ ] Implements pruning optimization
- [ ] Clean backtracking pattern (choose/explore/unchoose)

**Interview Readiness:**
- [ ] Can explain backtracking pattern in 2 minutes
- [ ] Can code solution in 12 minutes
- [ ] Can calculate C(n,k) for given inputs
- [ ] Can handle combination-with-repetition variation

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve with pruning
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement combination-with-repetition variation
- [ ] Day 14: Explain to someone else
- [ ] Day 30: Compare with permutations problem

---

**Strategy**: See [Backtracking Pattern](../../strategies/patterns/backtracking.md)
