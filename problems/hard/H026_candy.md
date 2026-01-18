---
id: H026
old_id: F135
slug: candy
title: Candy
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Candy

## Problem

Distribute candy to children in a line: higher rated children get more than neighbors.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `ratings = [1,0,2]`
- Output: `5`
- Explanation: You can allocate to the first, second and third child with 2, 1, 2 candies respectively.

**Example 2:**
- Input: `ratings = [1,2,2]`
- Output: `4`
- Explanation: You can allocate to the first, second and third child with 1, 2, 1 candies respectively.
The third child gets 1 candy because it satisfies the above two conditions.

## Constraints

- n == ratings.length
- 1 <= n <= 2 * 10⁴
- 0 <= ratings[i] <= 2 * 10⁴

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Each child must have at least 1 candy, and children with higher ratings than their neighbors must have more candy. The constraint works in both directions (left and right neighbors), so you need two passes: one left-to-right and one right-to-left.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use two arrays or two passes. First pass (left-to-right): if a child has higher rating than the left neighbor, give them one more candy than the left neighbor. Second pass (right-to-left): if a child has higher rating than the right neighbor, ensure they have more than the right neighbor while keeping the maximum from both passes.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can optimize space to O(1) by using a single-pass approach that detects peaks and valleys, calculating candies for ascending and descending sequences. However, the two-pass approach with O(n) space is clearer and easier to implement correctly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Two Pass | O(n) | O(n) | Two arrays or two passes with one array |
| Single Pass (Peak/Valley) | O(n) | O(1) | More complex but optimal space |

## Common Mistakes

1. **Only checking one direction**
   ```python
   # Wrong: Only satisfies left neighbor constraint
   for i in range(1, n):
       if ratings[i] > ratings[i-1]:
           candies[i] = candies[i-1] + 1
       else:
           candies[i] = 1

   # Correct: Check both directions
   # Left-to-right pass
   for i in range(1, n):
       if ratings[i] > ratings[i-1]:
           candies[i] = candies[i-1] + 1
   # Right-to-left pass
   for i in range(n-2, -1, -1):
       if ratings[i] > ratings[i+1]:
           candies[i] = max(candies[i], candies[i+1] + 1)
   ```

2. **Not taking maximum in second pass**
   ```python
   # Wrong: Overwrites first pass results
   if ratings[i] > ratings[i+1]:
       candies[i] = candies[i+1] + 1

   # Correct: Preserve maximum from both constraints
   if ratings[i] > ratings[i+1]:
       candies[i] = max(candies[i], candies[i+1] + 1)
   ```

3. **Not initializing all children with at least 1 candy**
   ```python
   # Wrong: Some children might end up with 0 candies
   candies = [0] * n

   # Correct: Everyone gets at least 1
   candies = [1] * n
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Candy Distribution with Cost | Hard | Minimize cost with different candy prices |
| Trapping Rain Water | Hard | Similar two-pass technique for different problem |
| Container With Most Water | Medium | Greedy approach with two pointers |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
