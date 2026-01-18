---
id: M214
old_id: I276
slug: total-hamming-distance
title: Total Hamming Distance
difficulty: medium
category: medium
topics: ["array", "bit-manipulation"]
patterns: ["bit-counting"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E461", "M477", "M1863"]
prerequisites: ["bit-manipulation", "hamming-distance", "combinatorics"]
---
# Total Hamming Distance

## Problem

The Hamming distance between two integers measures how many bit positions differ when you compare their binary representations. For example, the Hamming distance between `4` (binary `100`) and `14` (binary `1110`) is 2 because they differ at two bit positions.

Given an integer array `nums` containing up to 10,000 integers (each up to 10^9), calculate the total Hamming distance across all possible pairs. If you have three numbers `[a, b, c]`, you'd compute Hamming(a,b) + Hamming(a,c) + Hamming(b,c).

The naive approach of comparing every pair would require O(n²) comparisons, with each comparison examining up to 32 bits - resulting in O(32n²) operations. For n=10,000, this means over 3 billion operations, which will timeout. The key insight is to shift your perspective: instead of comparing pairs of numbers, analyze individual bit positions across all numbers.

Consider a specific bit position (say, bit 0). Some numbers have 0 at that position, others have 1. Every pair where one number has 0 and the other has 1 contributes exactly 1 to the total Hamming distance. By processing each of the 32 bit positions independently and counting how many zeros and ones appear, you can compute the answer efficiently.

## Why This Matters

Hamming distance is fundamental to error detection and correction in telecommunications, storage systems, and network protocols. When data gets corrupted during transmission, Hamming distance helps identify and fix single-bit errors. This problem also appears in genomics (comparing DNA sequences), similarity detection (finding duplicate or near-duplicate content), and machine learning (measuring distance between feature vectors). The optimization technique here - switching from pairwise comparison to per-feature analysis - is a powerful pattern that applies to many aggregate statistics problems. Learning to process data columnwise rather than rowwise can transform O(n²) algorithms into O(n) solutions.

## Examples

**Example 1:**
- Input: `nums = [4,14,2]`
- Output: `6`
- Explanation: Binary representations are 4=0100, 14=1110, and 2=0010.
Computing pairwise Hamming distances:
HammingDistance(4, 14) + HammingDistance(4, 2) + HammingDistance(14, 2) = 2 + 2 + 2 = 6.

**Example 2:**
- Input: `nums = [4,14,4]`
- Output: `4`

## Constraints

- 1 <= nums.length <= 10⁴
- 0 <= nums[i] <= 10⁹
- The answer for the given input will fit in a **32-bit** integer.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Think Bit by Bit</summary>

Instead of comparing pairs of numbers, think about each bit position independently. For a specific bit position (say bit 0), some numbers have 0 and some have 1. Every pair where one number has 0 and another has 1 contributes 1 to the total Hamming distance. This is a key insight for optimization.

</details>

<details>
<summary>🎯 Hint 2: Count Zeros and Ones</summary>

For each of the 32 bit positions, count how many numbers have 0 in that position (count0) and how many have 1 (count1). The contribution to the total Hamming distance from that bit position is count0 × count1 (every 0 pairs with every 1). Sum this across all 32 bit positions.

</details>

<details>
<summary>📝 Hint 3: Optimized Algorithm</summary>

```
def total_hamming_distance(nums):
    total = 0
    n = len(nums)

    # Process each of the 32 bit positions
    for bit_pos in range(32):
        count_ones = 0

        # Count how many numbers have 1 at this bit position
        for num in nums:
            if num & (1 << bit_pos):
                count_ones += 1

        # Numbers with 0 at this position
        count_zeros = n - count_ones

        # Each 0 pairs with each 1
        total += count_zeros * count_ones

    return total
```

Time: O(32n) = O(n)
Space: O(1)

Alternative: Use bit counting in single pass
```
def total_hamming_distance(nums):
    total = 0
    for bit in range(32):
        ones = sum((num >> bit) & 1 for num in nums)
        zeros = len(nums) - ones
        total += ones * zeros
    return total
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All Pairs) | O(n² × 32) | O(1) | Compare every pair, count different bits |
| Optimized (Bit by Bit) | O(32n) = O(n) | O(1) | Process each bit position independently |
| Precompute Bit Counts | O(n) | O(32) or O(1) | Store counts for each bit position |

n = nums.length

## Common Mistakes

**Mistake 1: Brute Force Timeout**

```python
# Wrong: O(n²) approach times out for large inputs
def total_hamming_distance(nums):
    total = 0
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            # Count different bits
            xor = nums[i] ^ nums[j]
            total += bin(xor).count('1')
    return total
```

```python
# Correct: O(n) by processing bit positions
def total_hamming_distance(nums):
    total = 0
    for bit in range(32):
        ones = sum((num >> bit) & 1 for num in nums)
        zeros = len(nums) - ones
        total += ones * zeros
    return total
```

**Mistake 2: Incorrect Pair Counting**

```python
# Wrong: Double counts or misses pairs
def total_hamming_distance(nums):
    total = 0
    for bit in range(32):
        ones = sum((num >> bit) & 1 for num in nums)
        # Wrong: Should multiply by zeros, not square ones
        total += ones * ones
    return total
```

```python
# Correct: Multiply zeros by ones
def total_hamming_distance(nums):
    total = 0
    n = len(nums)
    for bit in range(32):
        ones = sum((num >> bit) & 1 for num in nums)
        zeros = n - ones
        total += ones * zeros  # Each 0 pairs with each 1
    return total
```

**Mistake 3: Not Checking All 32 Bits**

```python
# Wrong: Only checks bits up to max number
def total_hamming_distance(nums):
    total = 0
    max_num = max(nums)
    bit_len = max_num.bit_length()
    for bit in range(bit_len):  # Wrong! Should check all 32 bits
        # ...
```

```python
# Correct: Check all 32 bits for consistency
def total_hamming_distance(nums):
    total = 0
    for bit in range(32):  # All possible bit positions
        ones = sum((num >> bit) & 1 for num in nums)
        zeros = len(nums) - ones
        total += ones * zeros
    return total
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| K-way Hamming Distance | Sum distances for K numbers at a time | Extend combinatorics, C(ones, k/2) × C(zeros, k/2) |
| Weighted Hamming Distance | Different bit positions have different weights | Multiply by weight for each bit position |
| Minimum Hamming Distance | Find minimum distance pair | Need to check all pairs or use clever pruning |
| Hamming Distance Range Query | Answer queries for subarrays | Prefix sums on bit counts |
| Fixed Hamming Distance | Count pairs with exactly K different bits | Filter pairs based on XOR popcount |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [Bit Manipulation](../strategies/patterns/bit-manipulation.md)
