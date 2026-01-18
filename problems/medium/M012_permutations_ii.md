---
id: M012
old_id: F047
slug: permutations-ii
title: Permutations II
difficulty: medium
category: medium
topics: ["array", "backtracking"]
patterns: ["backtrack-permutation", "duplicate-handling"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M011", "M009", "E021"]
prerequisites: ["backtracking-basics", "recursion"]
strategy_ref: ../strategies/patterns/backtracking.md
---

# Permutations II

## Problem

Given a collection of numbers that might contain duplicates, generate all unique arrangements (permutations) of these numbers. Unlike the basic permutation problem, you must avoid generating duplicate arrangements that arise from swapping identical elements.

For instance, if you have two identical 1s and one 2, the arrangement [1, 1, 2] should appear only once in your output, not twice (once for each 1 being "first"). A permutation is an ordered arrangement of all elements, so [1, 2, 1] and [2, 1, 1] are different from [1, 1, 2] and from each other.

The core challenge is efficiently skipping duplicate permutations during generation rather than generating everything and removing duplicates afterward (which would be exponentially slower).

```
Example visualization:
nums = [1, 1, 2]

Valid unique permutations:
[1, 1, 2] ✓
[1, 2, 1] ✓
[2, 1, 1] ✓

Invalid (duplicate):
[1, 1, 2] appearing twice by using the two different 1s
```

## Why This Matters

This problem teaches the subtle but crucial difference between handling duplicates in permutations versus combinations. The skip condition `i > 0 && nums[i] == nums[i-1] && !used[i-1]` is elegant but non-obvious, and understanding why it works demonstrates mastery of backtracking state management.

**Real-world applications:**
- **Puzzle solving**: Generating unique solutions in Sudoku solvers or crossword generators
- **Scheduling systems**: Creating distinct work rotations when some workers have identical skills
- **Bioinformatics**: Generating unique protein folding arrangements with repeated amino acids
- **Cryptography**: Producing distinct permutation-based keys without duplicates
- **Testing frameworks**: Creating unique test parameter combinations with repeated values
- **Manufacturing**: Optimizing assembly sequences when identical components exist

This pattern appears frequently in interviews because it tests whether you understand the difference between permutations and combinations, can manage backtracking state correctly (the `used` array), and can implement non-trivial pruning logic. Companies want to see if you can optimize beyond the "generate all then deduplicate" approach.

## Examples

**Example 1:**
- Input: `nums = [1,1,2]`
- Output: `[[1,1,2], [1,2,1], [2,1,1]]`
- Explanation: Three unique permutations despite having duplicate 1s.

**Example 2:**
- Input: `nums = [1,2,3]`
- Output: `[[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]`
- Explanation: No duplicates, so all 3! = 6 permutations are valid.

**Example 3:**
- Input: `nums = [1,1,1]`
- Output: `[[1,1,1]]`
- Explanation: All elements identical, only one unique permutation.

**Example 4:**
- Input: `nums = [1,2,1]`
- Output: `[[1,1,2], [1,2,1], [2,1,1]]`
- Explanation: Same as Example 1 after sorting.

## Constraints

- 1 <= nums.length <= 8
- -10 <= nums[i] <= 10

## Think About

1. How is permutation backtracking different from combination backtracking?
2. Why is sorting necessary for detecting duplicates?
3. What does the "used" array track, and why is it needed?
4. When should you skip a duplicate element in permutations?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Permutations vs Combinations</summary>

**Key difference:**
- **Combinations**: Order doesn't matter, [1,2] same as [2,1], use start index
- **Permutations**: Order matters, [1,2] ≠ [2,1], check all positions

For permutations, you explore ALL remaining elements at each level, not just elements after current index.

**Think about:**
- How do you track which elements are already used in the current permutation?
- What data structure helps mark elements as used/unused?

</details>

<details>
<summary>🎯 Hint 2: The skip condition for permutations</summary>

After sorting, the skip condition for permutations is:

```
if used[i]:
    continue  # Already in current permutation

if i > 0 and nums[i] == nums[i-1] and not used[i-1]:
    continue  # Skip duplicate at same level
```

**Why `not used[i-1]`?**

```
nums = [1₁, 1₂, 2]

At position 0:
  Choose 1₁ → used[0]=true → explore [1₁, ...]
  Skip 1₂   → used[0]=false, nums[1]==nums[0] → duplicate!
  Choose 2  → explore [2, ...]

Within [1₁, ...] at position 1:
  Skip 1₁ → used[0]=true (already used)
  Choose 1₂ → used[0]=true, so DON'T skip! → [1₁, 1₂, ...]
  Choose 2  → [1₁, 2, ...]
```

**Key insight:** Only skip duplicates when the previous identical element is NOT used (meaning we're at the same recursion level).

</details>

<details>
<summary>📝 Hint 3: Complete backtracking algorithm</summary>

```
function permuteUnique(nums):
    sort nums  # Critical for duplicate detection
    result = []
    current = []
    used = array of false, size = nums.length

    function backtrack():
        if current.length == nums.length:
            result.add(copy of current)
            return

        for i from 0 to nums.length - 1:
            # Skip if already used in current permutation
            if used[i]:
                continue

            # CRITICAL: Skip duplicate at same level
            if i > 0 and nums[i] == nums[i-1] and not used[i-1]:
                continue

            # Choose
            current.add(nums[i])
            used[i] = true

            # Explore
            backtrack()

            # Unchoose (backtrack)
            current.remove_last()
            used[i] = false

    backtrack()
    return result
```

**Why no start parameter?** Permutations consider all elements at each position, not just remaining ones.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Generate all, deduplicate with set | O(n! × n log n) | O(n!) | Simple but wasteful |
| **Backtrack with skip (optimal)** | **O(n! × n)** | **O(n)** | Avoids duplicates during generation |
| Swap-based permutation | O(n! × n) | O(n) | Trickier to handle duplicates |

**Why backtracking with skip wins:**
- Generates only unique permutations (no deduplication needed)
- Clear skip logic with sorted array
- O(n log n) sorting is negligible compared to O(n!) generation

**Detailed complexity:**
- **Time:** O(n log n) sorting + O(n! × n) backtracking
  - n! permutations in worst case (no duplicates)
  - O(n) to copy each permutation to result
- **Space:** O(n) recursion depth + O(n) used array + O(n) current permutation

**Pruning effectiveness:**
- Skip condition reduces branches significantly when many duplicates
- Example: [1,1,1,1] → 1 permutation instead of 4! = 24

---

## Common Mistakes

### 1. Wrong skip condition
```python
# WRONG: Skips when previous IS used (opposite logic)
if i > 0 and nums[i] == nums[i-1] and used[i-1]:
    continue  # This is backwards!

# CORRECT: Skip when previous is NOT used
if i > 0 and nums[i] == nums[i-1] and not used[i-1]:
    continue  # Same level duplicate
```

### 2. Using combination logic (start parameter)
```python
# WRONG: This generates combinations, not permutations
def backtrack(start):
    for i in range(start, len(nums)):  # Only considers remaining
        # ...

# CORRECT: Permutations check all positions
def backtrack():
    for i in range(len(nums)):  # Consider all elements
        if used[i]:
            continue
        # ...
```

### 3. Forgetting to mark/unmark used
```python
# WRONG: Doesn't track used elements
current.append(nums[i])
backtrack()
current.pop()
# Missing: used[i] = true/false

# CORRECT: Track used state
current.append(nums[i])
used[i] = True
backtrack()
current.pop()
used[i] = False
```

### 4. Using a set for deduplication
```python
# WRONG: Inefficient, generates duplicates then removes
def permuteUnique(nums):
    result = set()
    # ... backtrack without skip logic ...
    result.add(tuple(current))
    return [list(x) for x in result]
# Defeats the purpose of smart backtracking!

# CORRECT: Skip during generation
# Use skip condition to never create duplicates
```

### 5. Not sorting the array
```python
# WRONG: Skip condition doesn't work on unsorted array
def permuteUnique(nums):
    # nums not sorted!
    # Skip logic fails: [2,1,1] → can't detect adjacent duplicates
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Permutations I** | No duplicates | Remove skip condition, still use used array |
| **Next Permutation** | Find next lexicographic | In-place rearrangement algorithm |
| **K-length permutations** | Only k elements | Stop when current.length == k |
| **Circular permutations** | Rotation-invariant | Fix first element, permute rest |
| **Count permutations** | Return count only | Don't build arrays, just count |

**Count permutations variation:**
```python
def permuteUniqueCount(nums):
    nums.sort()
    used = [False] * len(nums)
    count = 0

    def backtrack(depth):
        nonlocal count
        if depth == len(nums):
            count += 1
            return

        for i in range(len(nums)):
            if used[i]:
                continue
            if i > 0 and nums[i] == nums[i-1] and not used[i-1]:
                continue

            used[i] = True
            backtrack(depth + 1)
            used[i] = False

    backtrack(0)
    return count
```

---

## Visual Walkthrough

```
nums = [1, 1, 2]
After sorting: [1, 1, 2]
used = [F, F, F]

Recursion tree with skip logic:

Level 0 (position 0):
  i=0: Choose 1₁ → current=[1], used=[T,F,F]
  i=1: SKIP (nums[1]==nums[0] && !used[0]) ← prevents duplicates
  i=2: Choose 2  → current=[2], used=[F,F,T]

Branch 1: current=[1], used=[T,F,F]
  Level 1 (position 1):
    i=0: SKIP (used[0]=T, already used)
    i=1: Choose 1₂ → current=[1,1], used=[T,T,F]
         (allowed because used[0]=T, so different level)
    i=2: Choose 2  → current=[1,2], used=[T,F,T]

  Branch 1.1: current=[1,1], used=[T,T,F]
    Level 2 (position 2):
      i=0: SKIP (used[0]=T)
      i=1: SKIP (used[1]=T)
      i=2: Choose 2 → current=[1,1,2] ✓ FOUND

  Branch 1.2: current=[1,2], used=[T,F,T]
    Level 2:
      i=0: SKIP (used[0]=T)
      i=1: Choose 1₂ → current=[1,2,1] ✓ FOUND
      i=2: SKIP (used[2]=T)

Branch 2: current=[2], used=[F,F,T]
  Level 1:
    i=0: Choose 1₁ → current=[2,1], used=[T,F,T]
    i=1: SKIP (nums[1]==nums[0] && !used[0])
    i=2: SKIP (used[2]=T)

  Branch 2.1: current=[2,1], used=[T,F,T]
    Level 2:
      i=0: SKIP (used[0]=T)
      i=1: Choose 1₂ → current=[2,1,1] ✓ FOUND
      i=2: SKIP (used[2]=T)

Results: [[1,1,2], [1,2,1], [2,1,1]]
```

---

## Key Differences: Permutations II vs Combination Sum II

| Aspect | Permutations II | Combination Sum II |
|--------|----------------|-------------------|
| **Order matters?** | Yes | No |
| **Loop range** | All elements (0 to n-1) | Remaining (start to n-1) |
| **Skip condition** | `i>0 && nums[i]==nums[i-1] && !used[i-1]` | `i>start && nums[i]==nums[i-1]` |
| **Used tracking** | Boolean array needed | Not needed (start index tracks) |
| **Recursion** | `backtrack()` - no params | `backtrack(i+1, ...)` - advance start |

---

## Practice Checklist

**Correctness:**
- [ ] Handles duplicates correctly ([1,1,2] → 3 permutations)
- [ ] No duplicate permutations in output
- [ ] Handles all identical elements ([1,1,1] → 1 permutation)
- [ ] Handles no duplicates (generates all n!)
- [ ] Correctly uses and unuses elements

**Code Quality:**
- [ ] Array sorted before backtracking
- [ ] Correct skip condition: `!used[i-1]`
- [ ] Proper used array management
- [ ] Clear variable names

**Optimization:**
- [ ] O(n! × n) time achieved
- [ ] No generating then filtering duplicates
- [ ] Skip condition prevents duplicate branches

**Interview Readiness:**
- [ ] Can explain skip logic clearly
- [ ] Can explain difference from Permutations I
- [ ] Can draw recursion tree showing skip
- [ ] Can code solution in 15 minutes
- [ ] Can discuss difference from combinations

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Permutations I for comparison
- [ ] Day 14: Explain skip condition to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Backtracking Pattern](../../strategies/patterns/backtracking.md) | [Permutation Generation](../../strategies/patterns/permutations.md)
