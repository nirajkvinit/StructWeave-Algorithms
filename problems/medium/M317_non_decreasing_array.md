---
id: M317
old_id: A132
slug: non-decreasing-array
title: Non-decreasing Array
difficulty: medium
category: medium
topics: ["array", "greedy"]
patterns: ["greedy-choice", "local-modification"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E088", "M376", "M280"]
prerequisites: ["arrays", "greedy-algorithms"]
---
# Non-decreasing Array

## Problem

Given an integer array `nums` with `n` elements, determine whether you can transform it into a non-decreasing sequence by modifying at most one element.

A non-decreasing sequence means each element is less than or equal to all subsequent elements: `nums[i] <= nums[i+1]` for every valid index `i`. For example, `[1,2,2,3]` is non-decreasing, but `[3,2,1]` and `[1,4,2,3]` are not.

The challenge arises when you encounter a violation where `nums[i] > nums[i+1]`. You have two repair strategies: lower `nums[i]` to match `nums[i+1]`, or raise `nums[i+1]` to match `nums[i]`. The correct choice depends on the surrounding elements. If you lower `nums[i]`, you must ensure it doesn't become smaller than `nums[i-1]`. If you raise `nums[i+1]`, you must ensure it doesn't exceed `nums[i+2]`.

Consider `[3,4,2,3]`: when you encounter the violation at 4 > 2, lowering 4 to 2 creates a new violation with 3, and raising 2 to 4 creates a violation with the next 3. Neither works, so the answer is false. Compare this to `[4,2,3]`: lowering 4 to 2 successfully creates `[2,2,3]`, which is non-decreasing.

Return `true` if the transformation is possible with at most one modification, `false` otherwise.

## Why This Matters

This problem demonstrates greedy local repair strategies constrained by global properties, a pattern common in data validation and error correction systems. Database systems use similar logic to detect and correct anomalies in time-series data where at most one measurement error is expected. Network protocol implementations employ comparable techniques when detecting packet corruption and deciding whether to request retransmission or attempt local correction. The decision between lowering versus raising values mirrors conflict resolution in collaborative editing systems where concurrent modifications create inconsistencies. Understanding when greedy choices preserve global invariants is essential for designing efficient validation algorithms and building intuition for problems where local decisions must maintain structural properties.

## Examples

**Example 1:**
- Input: `nums = [4,2,3]`
- Output: `true`
- Explanation: Changing the first element from 4 to 1 creates a non-decreasing sequence.

**Example 2:**
- Input: `nums = [4,2,1]`
- Output: `false`
- Explanation: No single modification can produce a non-decreasing sequence.

## Constraints

- n == nums.length
- 1 <= n <= 10⁴
- -10⁵ <= nums[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Identifying the Violation</summary>

Scan through the array and count violations where `nums[i] > nums[i+1]`. If there are more than one violation, return false immediately (can't fix with one change). If there are zero violations, return true (already non-decreasing). The interesting case is exactly one violation - you need to verify if modifying either element can fix it.

</details>

<details>
<summary>Hint 2: Two Modification Strategies</summary>

When you find a violation at position i (nums[i] > nums[i+1]), you have two options:
1. **Lower nums[i]** to nums[i+1]: Set `nums[i] = nums[i+1]`
2. **Raise nums[i+1]** to nums[i]: Set `nums[i+1] = nums[i]`

Which should you choose? Consider the surrounding elements:
- If `i == 0` OR `nums[i-1] <= nums[i+1]`: You can safely lower nums[i]
- Otherwise: You must raise nums[i+1] to nums[i]

After modification, check if the rest of the array is non-decreasing.

</details>

<details>
<summary>Hint 3: Greedy Choice and Edge Cases</summary>

The greedy strategy: when fixing a violation, prefer modifying nums[i] over nums[i+1] when possible, because changing an earlier element gives more flexibility for future elements. However, if nums[i-1] > nums[i+1], you're forced to raise nums[i+1].

Edge cases to consider:
- Array length 1 or 2: always true (at most one change needed)
- Violation at the start (i=0): always fixable by lowering nums[0]
- Violation at the end: only need to ensure this one fix works
- Multiple violations: immediately return false

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Single Pass | O(n) | O(1) | Count violations and check fix validity |
| Two Pass | O(n) | O(1) | First pass count, second pass verify |
| Greedy Modification | O(n) | O(1) | Modify in-place and continue checking |

## Common Mistakes

**Mistake 1: Not Considering Previous Element**
```python
# WRONG: Only looking at current violation, not previous element
def checkPossibility(nums):
    count = 0
    for i in range(len(nums) - 1):
        if nums[i] > nums[i + 1]:
            count += 1
            # Wrong: always lowering nums[i] without checking nums[i-1]
            nums[i] = nums[i + 1]
            if count > 1:
                return False
    return True

# CORRECT: Consider nums[i-1] when deciding how to fix
def checkPossibility(nums):
    count = 0
    for i in range(len(nums) - 1):
        if nums[i] > nums[i + 1]:
            count += 1
            if count > 1:
                return False

            # Check if we can lower nums[i] or must raise nums[i+1]
            if i == 0 or nums[i - 1] <= nums[i + 1]:
                nums[i] = nums[i + 1]  # Safe to lower
            else:
                nums[i + 1] = nums[i]  # Must raise

    return True
```

**Mistake 2: Counting Violations Without Fixing**
```python
# WRONG: Counting violations but not verifying the fix works
def checkPossibility(nums):
    violations = 0
    for i in range(len(nums) - 1):
        if nums[i] > nums[i + 1]:
            violations += 1
    return violations <= 1  # Wrong: doesn't check if fix is valid

# Example: [3,4,2,3] has one violation but can't be fixed
# Lowering 4→2 gives [3,2,2,3] (still broken)
# Raising 2→4 gives [3,4,4,3] (still broken)

# CORRECT: Actually attempt the fix and verify
def checkPossibility(nums):
    count = 0
    for i in range(len(nums) - 1):
        if nums[i] > nums[i + 1]:
            count += 1
            if count > 1:
                return False

            # Try to fix and continue checking
            if i == 0 or nums[i - 1] <= nums[i + 1]:
                nums[i] = nums[i + 1]
            else:
                nums[i + 1] = nums[i]

    return True
```

**Mistake 3: Early Return on First Violation**
```python
# WRONG: Returning true immediately after fixing first violation
def checkPossibility(nums):
    for i in range(len(nums) - 1):
        if nums[i] > nums[i + 1]:
            # Fix the violation
            nums[i] = nums[i + 1]
            return True  # Wrong: don't check rest of array

    return True

# Example: [2,3,3,2,4] - fixes first violation at index 3
# but doesn't check if the rest is valid after modification

# CORRECT: Continue checking after fix
def checkPossibility(nums):
    count = 0
    for i in range(len(nums) - 1):
        if nums[i] > nums[i + 1]:
            count += 1
            if count > 1:
                return False

            if i == 0 or nums[i - 1] <= nums[i + 1]:
                nums[i] = nums[i + 1]
            else:
                nums[i + 1] = nums[i]

    return True  # All violations fixed (at most 1)
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| K Modifications Allowed | Check if array can be non-decreasing with k changes | Medium |
| Strictly Increasing | Require strictly increasing (no equal adjacent elements) | Medium |
| Minimum Modifications | Count minimum changes needed for non-decreasing | Medium |
| Non-Increasing Array | Check for non-increasing with one modification | Easy |
| Circular Array | Array wraps around (last connects to first) | Hard |

## Practice Checklist

- [ ] First attempt (30 min)
- [ ] Understand when to lower vs raise elements
- [ ] Consider the previous element (nums[i-1])
- [ ] Test: [4,2,3] (can fix by lowering)
- [ ] Test: [3,4,2,3] (cannot fix)
- [ ] Test: [-1,4,2,3] (must raise 2→4)
- [ ] Handle edge cases: length 1, length 2, already sorted
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Attempt variation: k modifications allowed

**Strategy**: See [Greedy Pattern](../strategies/patterns/greedy-algorithms.md)
