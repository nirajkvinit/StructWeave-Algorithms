---
id: H100
old_id: A265
slug: smallest-rotation-with-highest-score
title: Smallest Rotation with Highest Score
difficulty: hard
category: hard
topics: ["array"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 45
---
# Smallest Rotation with Highest Score

## Problem

You have an array `nums` that can be rotated by any non-negative integer `k`, resulting in the arrangement `[nums[k], nums[k + 1], ... nums[nums.length - 1], nums[0], nums[1], ..., nums[k-1]]`. After rotation, calculate a score by counting each element that is less than or equal to its position index (each such element contributes one point).

	- For instance, with `nums = [2,4,1,3,0]` rotated by `k = 2`, we get `[1,3,0,2,4]`. The score is `3` points: `1 > 0` [0 points], `3 > 1` [0 points], `0 <= 2` [1 point], `2 <= 3` [1 point], `4 <= 4` [1 point].

Find the rotation value `k` that yields the maximum score. If multiple values of `k` produce the same maximum score, return the smallest `k`.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [2,3,1,4,0]`
- Output: `3`
- Explanation: Evaluating each rotation:
k = 0,  nums = [2,3,1,4,0],    score 2
k = 1,  nums = [3,1,4,0,2],    score 3
k = 2,  nums = [1,4,0,2,3],    score 3
k = 3,  nums = [4,0,2,3,1],    score 4
k = 4,  nums = [0,2,3,1,4],    score 3
The rotation k = 3 produces the maximum score.

**Example 2:**
- Input: `nums = [1,3,0,2,4]`
- Output: `0`
- Explanation: All rotations of this array yield the same score of 3 points.
Therefore, we select the minimum rotation index, which is 0.

## Constraints

- 1 <= nums.length <= 10⁵
- 0 <= nums[i] < nums.length

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of calculating score for each rotation (O(n²)), determine for each element at which rotations it contributes to the score. Each element nums[i] scores a point when it's at position j where nums[i] ≤ j. Calculate the range of valid rotations for each element using difference array technique.
</details>

<details>
<summary>🎯 Main Approach</summary>
For each element at index i, calculate which rotations k make it score: when rotated by k, element lands at position (i-k+n)%n, and it scores if nums[i] ≤ (i-k+n)%n. This creates a range of valid k values. Use a difference array to efficiently track score changes across all rotations, then find rotation with maximum accumulated score.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
For element at index i with value v, it scores at rotation k when (i-k) mod n ≥ v. This translates to a range: element contributes in rotations [bad_start, bad_end) where bad_start = (i-v+1) mod n and bad_end = (i+1) mod n. Use difference array: increment at good range start, decrement at bad range start. Accumulate to find maximum.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Calculate score for each rotation |
| Optimized Simulation | O(n²) | O(n) | Slightly better constant factors |
| Difference Array | O(n) | O(n) | Track score changes efficiently |
| Optimal | O(n) | O(n) | Single pass with difference array |

## Common Mistakes

1. **Calculating all rotations explicitly**
   ```python
   # Wrong: O(n²) approach
   max_score = 0
   best_k = 0
   for k in range(n):
       rotated = nums[k:] + nums[:k]
       score = sum(1 for i, v in enumerate(rotated) if v <= i)
       if score > max_score:
           max_score, best_k = score, k

   # Correct: Use difference array O(n)
   changes = [0] * n
   for i, v in enumerate(nums):
       # Calculate range where element scores
       bad_start = (i - v + 1) % n
       bad_end = (i + 1) % n
       # Update difference array
   ```

2. **Incorrect range calculation for element contribution**
   ```python
   # Wrong: Not handling circular array properly
   for i, v in enumerate(nums):
       if v <= i:
           changes[0] += 1  # Oversimplified

   # Correct: Calculate exact rotation range
   for i, v in enumerate(nums):
       # Element at index i lands at (i-k+n)%n after rotation k
       # Scores if nums[i] <= (i-k+n)%n
       # Bad range: [i-nums[i]+1, i+1) mod n
       start = (i - nums[i] + 1) % n
       end = (i + 1) % n
       # Handle wrap-around in difference array
   ```

3. **Not handling wraparound in difference array**
   ```python
   # Wrong: Missing circular range handling
   changes[start] -= 1
   changes[end] += 1  # Doesn't work for wraparound

   # Correct: Handle circular ranges properly
   if start <= end:
       changes[start] -= 1
       changes[end] += 1
   else:  # Range wraps around
       changes[0] -= 1
       changes[end] += 1
       changes[start] -= 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Rotate Array | Easy | Simple rotation, no scoring |
| K-th Symbol in Grammar | Medium | Different scoring mechanism |
| Best Position for a Service Centre | Hard | Continuous rotation problem |
| Maximum Sum Circular Subarray | Medium | Similar circular array optimization |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (circular ranges, difference array)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Difference Array](../../strategies/patterns/prefix-sum.md) | [Array Rotation](../../strategies/patterns/array-manipulation.md)
