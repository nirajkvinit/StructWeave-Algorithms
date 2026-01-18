---
id: M256
old_id: A045
slug: split-array-with-equal-sum
title: Split Array with Equal Sum
difficulty: medium
category: medium
topics: ["array", "prefix-sum", "hash-table"]
patterns: ["prefix-sum", "hash-set", "two-pointer"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - M560_subarray_sum_equals_k.md
  - M548_split_array_with_equal_sum.md
  - E724_find_pivot_index.md
prerequisites:
  - prefix sum arrays
  - hash set operations
  - array partitioning
---
# Split Array with Equal Sum

## Problem

Determine whether you can partition an integer array into four non-empty subarrays with equal sums by placing three dividers. The dividers are placed at indices i, j, and k, where they must satisfy strict ordering constraints: the indices must be spaced at least two positions apart to ensure each resulting subarray contains at least one element.

Specifically, you need indices i, j, k such that 0 < i < i+1 < j < j+1 < k < n-1. The array elements at indices i, j, and k themselves are excluded from all subarrays (they act as dividers). This creates four subarrays: elements before index i, elements between i and j (excluding both), elements between j and k (excluding both), and elements after k.

For example, with array [1,2,1,2,1,2,1] and indices i=1, j=3, k=5, the four subarrays are [1], [1], [1], and [1], all with sum 1. The elements at positions 1, 3, and 5 (all having value 2) are not included in any subarray.

The minimum array length is 7, since you need at least one element in each of the four subarrays plus the three divider positions. Arrays with negative numbers are allowed, making simple optimizations like early termination based on total sum unreliable.

A brute force approach checking all possible (i,j,k) combinations would be O(n³), but you can optimize to O(n²) by fixing the middle divider j, then using hash sets to efficiently match equal sums from the left and right portions.

## Why This Matters

This problem teaches advanced prefix sum techniques and strategic use of hash sets for optimization, patterns common in financial data analysis (finding balanced portfolios), load balancing algorithms, and database query optimization. The fix-middle-variable strategy is a powerful technique that reduces complexity in many partitioning problems. Understanding when to trade space for time by caching intermediate results is a key skill in algorithm optimization. While not frequently interviewed, this problem builds problem-solving intuition for multi-constraint optimization.

## Examples

**Example 1:**
- Input: `nums = [1,2,1,2,1,2,1]`
- Output: `true`
- Explanation: i = 1, j = 3, k = 5.
sum(0, i - 1) = sum(0, 0) = 1
sum(i + 1, j - 1) = sum(2, 2) = 1
sum(j + 1, k - 1) = sum(4, 4) = 1
sum(k + 1, n - 1) = sum(6, 6) = 1

**Example 2:**
- Input: `nums = [1,2,1,2,1,2,1,2]`
- Output: `false`

## Constraints

- n == nums.length
- 1 <= n <= 2000
- -10⁶ <= nums[i] <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Use Prefix Sums to Calculate Subarray Sums Efficiently</summary>

Instead of recalculating sums repeatedly, build a prefix sum array where `prefix[i]` = sum of elements from index 0 to i.

Then, any subarray sum from index `l` to `r` can be calculated as:
```python
subarray_sum(l, r) = prefix[r] - (prefix[l-1] if l > 0 else 0)
```

This reduces each sum calculation from O(n) to O(1).

For this problem:
- sum(0, i-1) = prefix[i-1]
- sum(i+1, j-1) = prefix[j-1] - prefix[i]
- sum(j+1, k-1) = prefix[k-1] - prefix[j]
- sum(k+1, n-1) = prefix[n-1] - prefix[k]
</details>

<details>
<summary>Hint 2: Fix Middle Index j and Search for Valid i and k</summary>

The constraint structure suggests fixing the middle index `j` and then finding valid `i` and `k`:

1. For each possible `j` (from index 3 to n-4):
   - Find all valid `i` values (1 to j-2) where sum(0,i-1) == sum(i+1,j-1)
   - Store these equal sums in a hash set
   - Find all valid `k` values (j+2 to n-2) where sum(j+1,k-1) == sum(k+1,n-1)
   - Check if any of these sums match the ones from the left side

This is O(n²) with proper use of hash sets.
</details>

<details>
<summary>Hint 3: Optimize with Hash Set for Left Sums</summary>

For a fixed `j`:

```python
left_sums = set()
left_sum = 0  # sum(0, i-1)

for i in range(1, j-1):
    left_sum += nums[i-1]  # sum(0, i-1)
    right_sum = prefix[j-1] - prefix[i]  # sum(i+1, j-1)

    if left_sum == right_sum:
        left_sums.add(left_sum)

# Now check right side of j for matching sums
right_sum = 0  # sum(j+1, k-1)
for k in range(j+2, n-1):
    right_sum += nums[k-1]  # sum(j+1, k-1)
    far_right_sum = prefix[n-1] - prefix[k]  # sum(k+1, n-1)

    if right_sum == far_right_sum and right_sum in left_sums:
        return True
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (3 loops) | O(n³) | O(1) | Check all (i,j,k) combinations |
| Prefix Sum + 3 loops | O(n³) | O(n) | Prefix sum speeds up sum calculation |
| Fix j + Hash Set | O(n²) | O(n) | Optimal approach; iterate j, use set for i/k |

## Common Mistakes

### Mistake 1: Not Respecting Index Constraints
```python
# Wrong: Allows invalid index ranges
def splitArray(nums):
    n = len(nums)
    for i in range(n):
        for j in range(n):
            for k in range(n):
                # Missing constraints: 0 < i < j-1 < j < k-1 < k < n-1
                # ...

# Correct: Enforce proper constraints
def splitArray(nums):
    n = len(nums)
    if n < 7:  # Minimum length needed
        return False

    for j in range(3, n-3):  # j must have room for i and k
        for i in range(1, j-1):
            for k in range(j+2, n-1):
                # Now indices are guaranteed valid
                # ...
```

### Mistake 2: Recalculating Prefix Sums Inefficiently
```python
# Wrong: Recalculates sums every time
def splitArray(nums):
    n = len(nums)
    for j in range(3, n-3):
        for i in range(1, j-1):
            sum1 = sum(nums[0:i])  # O(n) calculation!
            sum2 = sum(nums[i+1:j])  # O(n) calculation!
            # ...

# Correct: Precompute prefix sums
def splitArray(nums):
    n = len(nums)
    prefix = [0] * n
    prefix[0] = nums[0]
    for i in range(1, n):
        prefix[i] = prefix[i-1] + nums[i]

    # Now use prefix array for O(1) sum queries
    # sum(l, r) = prefix[r] - (prefix[l-1] if l > 0 else 0)
```

### Mistake 3: Not Using Hash Set Optimization
```python
# Inefficient: O(n³) by checking all combinations
def splitArray(nums):
    n = len(nums)
    prefix = [0] * n
    # ... build prefix

    for j in range(3, n-3):
        for i in range(1, j-1):
            for k in range(j+2, n-1):
                # Check all combinations - O(n³)
                sum1 = prefix[i-1]
                sum2 = prefix[j-1] - prefix[i]
                sum3 = prefix[k-1] - prefix[j]
                sum4 = prefix[n-1] - prefix[k]
                if sum1 == sum2 == sum3 == sum4:
                    return True

# Better: O(n²) with hash set
def splitArray(nums):
    n = len(nums)
    prefix = [0] * n
    # ... build prefix

    for j in range(3, n-3):
        left_sums = set()

        # Find valid i values and store their equal sums
        for i in range(1, j-1):
            sum1 = prefix[i-1]
            sum2 = prefix[j-1] - prefix[i]
            if sum1 == sum2:
                left_sums.add(sum1)

        # Check k values against stored left sums
        for k in range(j+2, n-1):
            sum3 = prefix[k-1] - prefix[j]
            sum4 = prefix[n-1] - prefix[k]
            if sum3 == sum4 and sum3 in left_sums:
                return True

    return False
```

## Variations

| Variation | Difference | Complexity Impact |
|-----------|------------|-------------------|
| Three Equal Parts | Split into 3 parts (2 dividers) instead of 4 | Simpler O(n) solution possible |
| Five Equal Parts | Split into 5 parts (4 dividers) | O(n⁴) or higher |
| Equal Sum with K Dividers | Generalize to k dividers | Exponential in k |
| Maximum Equal Sum | Find maximum achievable equal sum | Different optimization objective |

## Practice Checklist

Track your progress with spaced repetition:

- [ ] First attempt (understand 4-part split constraint)
- [ ] Implement prefix sum array
- [ ] Implement brute force O(n³) solution
- [ ] Optimize to O(n²) with hash set
- [ ] Test edge cases (n < 7, all same values, impossible cases)
- [ ] After 1 day: Solve without hints
- [ ] After 1 week: Solve in under 25 minutes
- [ ] Before interview: Explain optimization from O(n³) to O(n²)

**Strategy**: See [Prefix Sum Pattern](../strategies/patterns/prefix-sum.md)
