---
id: E204
old_id: A095
slug: maximum-product-of-three-numbers
title: Maximum Product of Three Numbers
difficulty: easy
category: easy
topics: ["array", "math", "sorting"]
patterns: ["sorting", "greedy"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E121", "M152", "M238"]
prerequisites: ["sorting", "negative-number-multiplication", "greedy-choice"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Maximum Product of Three Numbers

## Problem

Given an array of integers (which may include negative numbers, positive numbers, and zeros), find three numbers whose product is as large as possible. Return this maximum product value.

The interesting twist here comes from negative numbers. Your intuition might be to simply take the three largest numbers, and that works for arrays with only positive numbers. But when negative numbers are involved, multiplying two very negative numbers (like -10 and -9) produces a large positive number (90), which could then be multiplied by the largest positive number to create a huge product.

For example, in the array [-10, -10, 5, 2], the product of the three largest numbers (5 × 2 × -10 = -100) is actually worse than taking the two smallest (most negative) numbers and the largest positive number (-10 × -10 × 5 = 500). This mathematical property - that the product of two negatives is positive - is key to solving the problem correctly.

After sorting the array, you only need to check two cases: (1) the three largest numbers, and (2) the two smallest numbers (potentially very negative) multiplied by the largest number. The maximum of these two products is your answer. You can optimize further by tracking just five numbers (three largest and two smallest) without fully sorting, achieving linear time complexity.

## Why This Matters

This problem develops mathematical reasoning within algorithmic problem-solving, specifically understanding how arithmetic properties affect optimization. The insight that negative numbers can contribute to maximum products appears in financial algorithms (calculating portfolio returns with short positions), physics simulations (momentum calculations), and signal processing (amplitude maximization).

The greedy approach here is subtle: it's not "always pick the largest," but rather "the answer must be one of these two candidates." Learning to enumerate a small set of possibilities and prove nothing else can be optimal is a crucial technique for optimization problems. This differs from greedy algorithms where you make incremental choices; here you're using greedy reasoning to constrain the search space.

The dual solution approaches (sorting vs. linear scan tracking extremes) illustrate a common trade-off: simpler code vs. optimal complexity. Both are valuable to know, and interviews often ask about both.

## Examples

**Example 1:**
- Input: `nums = [1,2,3]`
- Output: `6`

**Example 2:**
- Input: `nums = [1,2,3,4]`
- Output: `24`

**Example 3:**
- Input: `nums = [-1,-2,-3]`
- Output: `-6`

## Constraints

- 3 <= nums.length <= 10⁴
- -1000 <= nums[i] <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Consider Negative Numbers
The maximum product isn't always the three largest numbers:
- What happens when you multiply two negative numbers?
- If the array is [-10, -10, 1, 3, 2], what's the maximum product?

Think about how negative numbers can create large positive products.

### Hint 2: Identifying Candidates
After sorting, there are only two possible candidates for maximum product:
- The three largest numbers (rightmost elements)
- The two smallest numbers (which might be very negative) times the largest number

Why are these the only cases you need to check?

### Hint 3: Optimization Without Full Sort
Can you find the answer without sorting the entire array?
- Track the three largest values
- Track the two smallest values (most negative)
- Compare the two candidate products

This allows O(n) time complexity instead of O(n log n).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear Scan (Track 5 values) | O(n) | O(1) | Track 3 max and 2 min values; optimal |
| Sorting | O(n log n) | O(log n) | Sort then check two candidates; simpler to code |
| Brute Force | O(n³) | O(1) | Check all triplets; impractical |

## Common Mistakes

### Mistake 1: Only Considering Three Largest
```python
# Wrong: Assumes three largest always give max product
def maximumProduct(nums):
    nums.sort()
    return nums[-1] * nums[-2] * nums[-3]  # Wrong for negative numbers!
```
**Why it's wrong:** If array has large negative numbers like [-10, -10, 5, 2], the product of -10 × -10 × 5 = 500 is greater than 5 × 2 × (next largest).

**Correct approach:** Also check `nums[0] * nums[1] * nums[-1]` and return the maximum.

### Mistake 2: Not Handling All Negative Array
```python
# Wrong: Doesn't handle when all numbers are negative
def maximumProduct(nums):
    nums.sort()
    return max(nums[-1] * nums[-2] * nums[-3],
               nums[0] * nums[1] * nums[-1])
    # Works for mixed arrays, but what if all are negative?
```
**Why it's wrong:** This actually works correctly! Even when all negative, the three largest (least negative) give the maximum product.

**Correct approach:** The approach is actually correct. This is a common misconception, not a mistake.

### Mistake 3: Incorrect Linear Scan Implementation
```python
# Wrong: Doesn't properly track top 3 and bottom 2
def maximumProduct(nums):
    max1 = max2 = max3 = float('-inf')
    min1 = min2 = float('inf')
    for num in nums:
        if num > max1:
            max3, max2, max1 = max2, max1, num
        # Missing: else if checks for max2 and max3
        # Missing: proper min tracking
```
**Why it's wrong:** When updating max values, need to handle all cases. If num > max1, update all three. If num > max2, update max2 and max3, etc.

**Correct approach:** Use cascading if-elif to properly update all max and min values.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Maximum product of k numbers | Generalize to k numbers instead of 3 | Medium |
| Minimum product of three numbers | Find minimum instead of maximum | Easy |
| Maximum product subarray | Find contiguous subarray with max product | Medium |
| Product without using specific element | Max product excluding one element | Medium |
| Constrained product | Product must be within certain range | Hard |

## Practice Checklist

Practice this problem until you can confidently complete these tasks:

- [ ] Day 1: Solve with sorting approach (15 min)
- [ ] Day 3: Implement linear scan O(n) solution (20 min)
- [ ] Day 7: Solve without looking at notes, handle negatives (12 min)
- [ ] Day 14: Explain why only two cases need checking
- [ ] Day 30: Solve a variation (maximum product of k numbers)

**Strategy**: See [Greedy Optimization](../strategies/patterns/greedy.md)
