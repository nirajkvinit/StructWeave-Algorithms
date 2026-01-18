---
id: M550
old_id: A441
slug: subarray-sums-divisible-by-k
title: Subarray Sums Divisible by K
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Subarray Sums Divisible by K

## Problem

Imagine you're analyzing financial transactions where you need to find all sequences of consecutive transactions whose total is evenly divisible by a certain amount `k`—perhaps for tax reporting, budget allocation, or fraud detection.

Given an integer array `nums` and an integer `k`, count how many contiguous subarrays have a sum that divides evenly by `k` (sum % k == 0).

**Example visualization:**
```
Array: [4, 5, 0, -2, -3, 1]  k = 5

Subarrays with sum divisible by 5:
• [4, 5, 0, -2, -3, 1] → sum = 5  ✓
• [5]                  → sum = 5  ✓
• [5, 0]               → sum = 5  ✓
• [5, 0, -2, -3]       → sum = 0  ✓
• [0]                  → sum = 0  ✓
• [0, -2, -3]          → sum = -5 ✓ (divides evenly)
• [-2, -3]             → sum = -5 ✓

Total: 7 subarrays
```

A contiguous subarray is any sequence of adjacent elements from the array.

## Why This Matters

The subarray sum divisibility problem is fundamental to understanding prefix sums and modular arithmetic—two pillars of efficient algorithm design. In financial software, finding transaction sequences that meet specific divisibility requirements helps with automated reconciliation and compliance checking. Checksum algorithms for data integrity (like credit card validation using the Luhn algorithm) rely on similar divisibility checks. In cryptography, modular arithmetic operations are the foundation of encryption algorithms. Load balancing systems use divisibility properties to distribute tasks evenly across servers. This problem teaches the critical "prefix sum remainder" technique, which generalizes to solving range query problems in databases, cumulative statistics in analytics pipelines, and streaming data aggregation where you need to answer questions about contiguous subsequences efficiently.

## Examples

**Example 1:**
- Input: `nums = [4,5,0,-2,-3,1], k = 5`
- Output: `7`
- Explanation: Seven contiguous subsequences have sums divisible by 5:
[4, 5, 0, -2, -3, 1], [5], [5, 0], [5, 0, -2, -3], [0], [0, -2, -3], [-2, -3]

**Example 2:**
- Input: `nums = [5], k = 9`
- Output: `0`

## Constraints

- 1 <= nums.length <= 3 * 10⁴
- -10⁴ <= nums[i] <= 10⁴
- 2 <= k <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Use the prefix sum remainder theorem: if two prefix sums have the same remainder when divided by k, the subarray between them has a sum divisible by k. This is because (prefix[j] - prefix[i]) % k = 0 when prefix[j] % k = prefix[i] % k. Count occurrences of each remainder using a hash map.
</details>

<details>
<summary>Main Approach</summary>
Compute prefix sum while tracking remainders modulo k in a hash map. For each position, calculate (prefix_sum % k). If this remainder has appeared before, each previous occurrence forms a valid subarray with current position. Add the count of previous occurrences to result. Update the hash map with current remainder. Initialize map with {0: 1} to handle subarrays starting from index 0.
</details>

<details>
<summary>Optimization Tip</summary>
Handle negative remainders correctly by converting negative modulo to positive: use ((prefix_sum % k) + k) % k. This ensures remainders are in range [0, k-1]. Also, when counting pairs, if remainder r appears c times, it contributes c*(c-1)/2 subarrays, but it's easier to increment count as you go by adding previous occurrences.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all subarrays; too slow for n=30000 |
| Prefix Sum + HashMap | O(n) | O(k) | Track remainders in map; optimal |
| Optimal | O(n) | O(k) | Single pass with constant-time lookups |

## Common Mistakes

1. **Not handling negative remainders**
   ```python
   # Wrong: Negative remainders cause issues
   remainder = prefix_sum % k
   # In Python, -5 % 3 = 1, but in some languages it's -2

   # Correct: Normalize to positive remainder
   remainder = ((prefix_sum % k) + k) % k
   ```

2. **Forgetting to initialize map with {0: 1}**
   ```python
   # Wrong: Misses subarrays starting from index 0
   count_map = {}
   for num in nums:
       prefix_sum += num
       remainder = prefix_sum % k
       if remainder in count_map:
           result += count_map[remainder]

   # Correct: Initialize with 0 remainder
   count_map = {0: 1}  # Handles prefix[0..i] divisible by k
   for num in nums:
       prefix_sum += num
       remainder = ((prefix_sum % k) + k) % k
       result += count_map.get(remainder, 0)
       count_map[remainder] = count_map.get(remainder, 0) + 1
   ```

3. **Computing all pairs at the end instead of incrementally**
   ```python
   # Wrong: Compute all pairs after building frequency map
   for r in count_map:
       c = count_map[r]
       result += c * (c - 1) // 2
   # This works but is less clear

   # Correct: Increment as you go
   for num in nums:
       remainder = ((prefix_sum % k) + k) % k
       result += count_map.get(remainder, 0)  # Add existing count
       count_map[remainder] += 1  # Then update count
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Subarray Sum Equals K | Medium | Count subarrays with exact sum k |
| Continuous Subarray Sum | Medium | Check if any subarray sum is multiple of k |
| Make Sum Divisible by P | Medium | Remove smallest subarray to make sum divisible |
| Count Number of Nice Subarrays | Medium | Count subarrays with k odd numbers |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved (O(n))
- [ ] Clean, readable code
- [ ] Handled all edge cases (negative numbers, k=1, empty array)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Prefix Sum](../../strategies/patterns/prefix-sum.md)
