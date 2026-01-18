---
id: E025
old_id: F046
slug: permutations
title: Permutations
difficulty: easy
category: easy
topics: ["array", "backtracking"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 20
frequency: high
related_problems: ["M047", "M022", "E077"]
prerequisites: ["recursion", "backtracking-basics"]
---
# Permutations

## Problem

Given an array of distinct integers, return all possible permutations in any order. A permutation is an arrangement of all the elements where order matters - [1,2,3] and [3,2,1] are different permutations.

For example, given [1,2,3], there are 6 permutations: [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]. With n distinct elements, there are exactly n! (n factorial) permutations because you have n choices for the first position, n-1 choices for the second, and so on: 3 × 2 × 1 = 6.

The challenge is to generate all permutations systematically without missing any or creating duplicates. You'll need to track which elements have already been used in the current permutation being built, and when you've placed all n elements, you've found one complete permutation. This requires exploring a decision tree where each level represents choosing an element for a position, then recursively filling the remaining positions.

## Why This Matters

This problem is the canonical introduction to backtracking algorithms. It teaches:
- **Backtracking fundamentals**: Exploring all possibilities systematically
- **State management**: Building and undoing choices
- **Combinatorial thinking**: Understanding factorial growth

**Real-world applications:**
- Scheduling systems exploring all shift combinations
- Game AI exploring possible move sequences
- Cryptography generating key permutations for testing

## Examples

**Example 1:**
- Input: `nums = [1,2,3]`
- Output: `[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]`

**Example 2:**
- Input: `nums = [0,1]`
- Output: `[[0,1],[1,0]]`

**Example 3:**
- Input: `nums = [1]`
- Output: `[[1]]`

## Constraints

- 1 <= nums.length <= 6
- -10 <= nums[i] <= 10
- All the integers of nums are **unique**.

## Think About

1. How many permutations exist for n distinct elements?
2. How do you build a permutation incrementally?
3. What defines a "valid" permutation?
4. How do you ensure you don't reuse elements?

---

## Approach Hints

<details>
<summary>💡 Hint 1: How many permutations are there?</summary>

For n distinct elements, there are **n!** (n factorial) permutations.

For [1,2,3]:
- First position: 3 choices
- Second position: 2 remaining choices
- Third position: 1 remaining choice
- Total: 3 × 2 × 1 = 6 permutations

**Think about:**
- Can you build permutations one element at a time?
- How do you track which elements are already used?
- What happens when you've placed all elements?

</details>

<details>
<summary>🎯 Hint 2: The backtracking pattern</summary>

Use **backtracking** to systematically explore all possibilities:

1. **Choose**: Pick an unused element for the current position
2. **Explore**: Recursively fill the remaining positions
3. **Unchoose**: Remove the element and try the next choice

**Key insight:** Maintain a set or boolean array to track which elements are currently in use. When you reach length n, you've found a complete permutation.

**Recursion tree visualization** for [1,2,3]:
```
                    []
         /          |          \
       [1]         [2]         [3]
      /   \       /   \       /   \
   [1,2] [1,3] [2,1] [2,3] [3,1] [3,2]
     |     |     |     |     |     |
  [1,2,3][1,3,2][2,1,3][2,3,1][3,1,2][3,2,1]
```

</details>

<details>
<summary>📝 Hint 3: Backtracking algorithm</summary>

```
result = []
current_permutation = []
used = set()

def backtrack():
    # Base case: permutation is complete
    if len(current_permutation) == len(nums):
        result.append(current_permutation.copy())  # Must copy!
        return

    # Try each unused element
    for num in nums:
        if num in used:
            continue  # Skip already used elements

        # Choose
        current_permutation.append(num)
        used.add(num)

        # Explore
        backtrack()

        # Unchoose (backtrack)
        current_permutation.pop()
        used.remove(num)

backtrack()
return result
```

**Why copy?** `current_permutation.copy()` creates a snapshot. Without it, all results point to the same list that keeps changing.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Backtracking (Standard)** | **O(n! × n)** | **O(n)** | Generates all permutations |
| Backtracking with swap | O(n! × n) | O(n) | In-place modification |
| Iterative (next permutation) | O(n! × n) | O(n) | Lexicographic order |

**Time Breakdown:**
- n! permutations to generate
- Each permutation takes O(n) time to construct/copy
- Total: O(n! × n)

**Space Breakdown:**
- Recursion depth: O(n)
- Used set: O(n)
- Current permutation: O(n)
- Output storage: O(n! × n) - not counted as auxiliary space

---

## Common Mistakes

### 1. Not copying the permutation before adding to result
```python
# WRONG: All results point to the same list
result.append(current_permutation)  # Reference to same object!

# CORRECT: Create a snapshot
result.append(current_permutation.copy())
# OR
result.append(list(current_permutation))
```

### 2. Forgetting to backtrack (unchoose)
```python
# WRONG: State not restored, leads to incorrect results
current_permutation.append(num)
used.add(num)
backtrack()
# Missing: current_permutation.pop() and used.remove(num)

# CORRECT: Always backtrack
current_permutation.append(num)
used.add(num)
backtrack()
current_permutation.pop()
used.remove(num)
```

### 3. Using index-based tracking incorrectly
```python
# WRONG: Used indices doesn't work with duplicate values
# (Though this problem has distinct values, it's a common mistake)
used_indices = set()
for i, num in enumerate(nums):
    if i in used_indices:  # This tracks positions, not values
        continue

# CORRECT: Track values (or use swap-based approach)
used_values = set()
for num in nums:
    if num in used_values:
        continue
```

### 4. Not handling base case correctly
```python
# WRONG: Off-by-one error
if len(current_permutation) == len(nums) - 1:  # Should be ==, not == -1
    result.append(current_permutation.copy())
    return

# CORRECT
if len(current_permutation) == len(nums):
    result.append(current_permutation.copy())
    return
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Permutations with duplicates** | Input has duplicate values | Sort + skip duplicates at same level |
| **Next permutation** | Find lexicographically next | Swap and reverse algorithm |
| **Kth permutation** | Find specific permutation | Mathematical formula using factorials |
| **Unique subsequences** | Generate all subsequences | Include/exclude at each step |
| **Letter case permutation** | Toggle case of letters | Backtrack with case choices |

**Swap-based approach (in-place):**
```python
def permute(nums):
    result = []

    def backtrack(start):
        if start == len(nums):
            result.append(nums[:])  # Copy entire array
            return

        for i in range(start, len(nums)):
            # Swap to put nums[i] at position start
            nums[start], nums[i] = nums[i], nums[start]

            # Recurse on remaining elements
            backtrack(start + 1)

            # Swap back (backtrack)
            nums[start], nums[i] = nums[i], nums[start]

    backtrack(0)
    return result
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles single element (Example 3)
- [ ] Handles two elements (Example 2)
- [ ] Handles three elements (Example 1)
- [ ] Generates all n! permutations
- [ ] No duplicate permutations

**Optimization:**
- [ ] Used backtracking (optimal approach)
- [ ] Proper state management (choose/explore/unchoose)
- [ ] Correctly copies permutations to result

**Interview Readiness:**
- [ ] Can explain backtracking pattern
- [ ] Can code solution in 8 minutes
- [ ] Can draw recursion tree
- [ ] Can implement swap-based variant

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement swap-based version
- [ ] Day 14: Solve M047 (permutations with duplicates)
- [ ] Day 30: Quick review

---

**Strategy**: See [Backtracking Pattern](../../strategies/patterns/backtracking.md)
