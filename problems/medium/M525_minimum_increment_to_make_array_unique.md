---
id: M525
old_id: A412
slug: minimum-increment-to-make-array-unique
title: Minimum Increment to Make Array Unique
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Minimum Increment to Make Array Unique

## Problem

Imagine you're managing a system that assigns unique IDs to database records, but due to a bug, some IDs are duplicated. You can only fix this by incrementing duplicate IDs (making them larger), never decrementing. What's the minimum number of increment operations needed to ensure all IDs are unique?

Given an integer array `nums`, you have one operation available: select any element at any index and increase its value by 1. You can repeat this operation as many times as needed on any elements.

Your goal is to find the minimum total number of increment operations required to transform the array so that every value appears exactly once (no duplicates).

For example, with `[1, 2, 2]`, you have two 2's. The cheapest fix is to increment one of them once to get `[1, 2, 3]`, requiring just 1 operation. With `[3, 2, 1, 2, 1, 7]`, you might end up with something like `[3, 4, 1, 2, 5, 7]` after 6 total increments.

The challenge is to determine the optimal strategy: which duplicates should be incremented, and by how much, to minimize the total cost?

## Why This Matters

This problem models resource allocation systems where uniqueness is required but only upward adjustments are possible. Database systems use similar logic when generating auto-increment primary keys after merging tables with conflicting IDs. Load balancers employ this pattern when assigning unique port numbers to connections, where you can only try higher ports. Version control systems apply this when resolving conflicting version numbers across merged branches. The greedy sorting approach teaches you how to transform seemingly complex constraint problems into simple sequential processing by changing your perspective (sorting the data first). This pattern appears in scheduling algorithms, memory allocation, and timestamp synchronization in distributed systems where monotonicity (always increasing) must be maintained.

## Examples

**Example 1:**
- Input: `nums = [1,2,2]`
- Output: `1`
- Explanation: One increment transforms the array to [1, 2, 3].

**Example 2:**
- Input: `nums = [3,2,1,2,1,7]`
- Output: `6`
- Explanation: Six increments can produce [3, 4, 1, 2, 5, 7].
It's provable that fewer than 6 operations cannot make all values unique.

## Constraints

- 1 <= nums.length <= 10⁵
- 0 <= nums[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
After sorting, duplicates and conflicts become adjacent or near-adjacent. Each element should be at least (previous element + 1). The difference between where an element needs to be and where it is gives the increment cost.
</details>

<details>
<summary>Main Approach</summary>
Greedy with sorting:
1. Sort the array
2. Track the minimum value the next element should have (initially arr[0])
3. For each element, if it's less than the required minimum, increment it to reach the minimum
4. Add the increment cost to total
5. Update minimum to (current element + 1)
</details>

<details>
<summary>Optimization Tip</summary>
You don't need to actually modify the array - just track what each element "should be" and calculate the difference. The key insight: after sorting, we can greedily assign each element to the smallest available value >= itself.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Set) | O(n^2) | O(n) | Repeatedly find next available number |
| Optimal (Sort + Greedy) | O(n log n) | O(1) | Sorting dominates |

## Common Mistakes

1. **Not sorting first**
   ```python
   # Wrong: Process in original order
   for i in range(len(nums)):
       while nums[i] in seen:
           nums[i] += 1
           moves += 1
       seen.add(nums[i])

   # Correct: Sort first for greedy approach
   nums.sort()
   moves = 0
   need = nums[0]
   for num in nums:
       need = max(need, num)
       moves += need - num
       need += 1
   ```

2. **Tracking minimum incorrectly**
   ```python
   # Wrong: Only use previous element
   if nums[i] == nums[i-1]:
       moves += 1
       nums[i] += 1

   # Correct: Track cumulative minimum requirement
   need = max(need, num)  # Handle sequences of duplicates
   moves += need - num
   need += 1
   ```

3. **Integer overflow concerns**
   ```python
   # Wrong: Not considering that final values can be large
   # Python handles big integers automatically

   # In other languages: use long/int64
   long long moves = 0;  // C++
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Make Array Strictly Increasing | Hard | Can swap elements from another array |
| Minimum Moves to Equal Array Elements | Medium | Different increment rule |
| Array Transformation | Medium | Various array uniqueness problems |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Pattern](../../strategies/patterns/greedy.md)
