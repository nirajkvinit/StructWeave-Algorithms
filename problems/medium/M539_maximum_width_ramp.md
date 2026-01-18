---
id: M539
old_id: A429
slug: maximum-width-ramp
title: Maximum Width Ramp
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Maximum Width Ramp

## Problem

Imagine you're looking at a series of building heights from left to right. A "ramp" exists when you can find a building on the left that's shorter than or equal to a building on the right. How far apart can these two buildings be?

Consider an integer array `nums`. A valid ramp is a pair of indices `(i, j)` where:
- `i` comes before `j` (i < j)
- The value at position `i` does not exceed the value at position `j` (nums[i] <= nums[j])

For such a pair, the width is simply `j - i`.

Your task is to find the maximum possible width among all valid ramps in the array. If no valid ramps exist, return `0`.

For example, with `[6, 0, 8, 2, 1, 5]`:
- Position 1 has value 0
- Position 5 has value 5
- Since 0 <= 5 and they're 4 positions apart, this gives a width of 4
- This turns out to be the maximum width

## Why This Matters

Maximum width ramp problems appear in time-series analysis and stock trading. Consider finding the maximum profit window where you buy low and sell high (with the constraint that selling price >= buying price), or in sensor data analysis where you're looking for the longest time span between a low measurement and a subsequent high measurement. The problem teaches monotonic stack usage - a powerful technique for maintaining candidates that could potentially be optimal. This pattern appears in parsing (matching brackets over maximum distance), scheduling (finding longest valid task sequences), and signal processing (identifying sustained trends).

## Examples

**Example 1:**
- Input: `nums = [6,0,8,2,1,5]`
- Output: `4`
- Explanation: Indices 1 and 5 form a valid pair with values 0 and 5, giving a distance of 4.

**Example 2:**
- Input: `nums = [9,8,1,0,1,9,4,0,4,1]`
- Output: `7`
- Explanation: Indices 2 and 9 both contain the value 1, creating a distance of 7.

## Constraints

- 2 <= nums.length <= 5 * 10⁴
- 0 <= nums[i] <= 5 * 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
For each position j, you want to find the smallest value to its left (at position i) to maximize j - i. The key is to preprocess information about potential starting positions. A monotonic decreasing stack can help identify candidates for position i.
</details>

<details>
<summary>Main Approach</summary>
Build a decreasing stack from left to right containing indices where values form a decreasing sequence. Then iterate from right to left, and for each position j, pop from the stack while the value at the stack top is less than or equal to nums[j], updating the maximum width. The stack ensures you're always comparing j with the leftmost valid i.
</details>

<details>
<summary>Optimization Tip</summary>
Alternative approach: Create an array of maximum values to the right of each position. For each position i, binary search for the rightmost position where the maximum value is >= nums[i]. This gives you O(n log n) time but may be more intuitive than the stack approach.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all pairs (i, j) where i < j |
| Monotonic Stack | O(n) | O(n) | One pass to build stack, one pass to compute width |
| Max Suffix + Binary Search | O(n log n) | O(n) | Precompute suffix maximums, binary search |
| Optimal | O(n) | O(n) | Monotonic decreasing stack approach |

## Common Mistakes

1. **Using a regular array instead of a monotonic stack**
   ```python
   # Wrong: Storing all indices
   candidates = list(range(n))
   for j in range(n):
       for i in candidates:  # Inefficient
           if nums[i] <= nums[j]:
               max_width = max(max_width, j - i)

   # Correct: Use decreasing stack for candidates
   stack = []
   for i in range(n):
       if not stack or nums[i] < nums[stack[-1]]:
           stack.append(i)
   ```

2. **Iterating in the wrong direction for the second pass**
   ```python
   # Wrong: Iterating left to right in second pass
   for j in range(n):
       while stack and nums[stack[-1]] <= nums[j]:
           stack.pop()  # Might miss larger widths

   # Correct: Iterate right to left
   for j in range(n-1, -1, -1):
       while stack and nums[stack[-1]] <= nums[j]:
           i = stack.pop()
           max_width = max(max_width, j - i)
   ```

3. **Not maintaining monotonic property correctly**
   ```python
   # Wrong: Adding all elements to stack
   for i in range(n):
       stack.append(i)

   # Correct: Only add if it maintains decreasing property
   for i in range(n):
       if not stack or nums[i] < nums[stack[-1]]:
           stack.append(i)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Daily Temperatures | Medium | Next greater element using monotonic stack |
| Largest Rectangle in Histogram | Hard | Area calculation with monotonic stack |
| Trapping Rain Water | Hard | Two-pointer or stack approach with similar logic |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Monotonic Stack](../../strategies/patterns/monotonic-stack.md)
