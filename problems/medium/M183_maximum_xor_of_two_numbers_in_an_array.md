---
id: M183
old_id: I220
slug: maximum-xor-of-two-numbers-in-an-array
title: Maximum XOR of Two Numbers in an Array
difficulty: medium
category: medium
topics: ["array", "bit-manipulation", "trie"]
patterns: ["bit-manipulation", "trie"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M421", "M1707", "E191"]
prerequisites: ["bit-manipulation", "trie", "xor-properties"]
---
# Maximum XOR of Two Numbers in an Array

## Problem

Given an array of integers called `nums`, your challenge is to find the maximum possible value that can be obtained by performing the XOR (exclusive OR) operation between any two numbers in the array. You can pick the same number twice (i and j can be equal), and you need to examine all possible pairs to find which combination produces the largest XOR result. For those unfamiliar, XOR is a bitwise operation where each bit position in the result is 1 if the corresponding bits in the two operands differ, and 0 if they're the same. For example, `5 XOR 25` equals `28` because in binary: `00101 XOR 11001 = 11100`. The naive approach of checking all pairs works but takes O(n²) time, which becomes impractical for arrays with 200,000 elements. The key insight is that to maximize XOR, you want the result to have as many 1s as possible in the highest bit positions. This leads to solutions involving binary tries (prefix trees where each level represents a bit position) or greedy bit-by-bit construction starting from the most significant bit. When building the maximum XOR, you work from bit 31 down to bit 0, at each position trying to find two numbers whose bits differ at that position. Edge cases include arrays with duplicate numbers, arrays where all numbers are the same (XOR would be 0), and efficiently handling the full 32-bit integer range.

## Why This Matters

XOR operations are fundamental in cryptography, error detection codes, data compression, and network protocols. This problem directly applies to cryptographic key generation where you need to find input pairs that maximize entropy (randomness), implementing checksums and parity bits for error detection in data transmission, and building hash functions for distributed systems. In low-level systems programming, XOR tricks enable memory-efficient algorithms like finding duplicate elements or swapping variables without temporary storage. The trie-based approach you'll learn here is the foundation for IP routing tables (prefix matching in network routers), autocomplete systems, and genome sequence analysis in bioinformatics where you match DNA subsequences efficiently. Understanding how to construct optimal XOR values bit-by-bit strengthens your grasp of binary representation and bit manipulation, skills essential for competitive programming, embedded systems development, and optimizing performance-critical code. Companies building networking equipment, security systems, or database engines frequently ask this problem because it tests both algorithmic thinking and practical understanding of how computers represent and manipulate data at the bit level.

## Examples

**Example 1:**
- Input: `nums = [3,10,5,25,2,8]`
- Output: `28`
- Explanation: Computing 5 XOR 25 yields the maximum value of 28.

**Example 2:**
- Input: `nums = [14,70,53,83,49,91,36,80,92,51,66,70]`
- Output: `127`

## Constraints

- 1 <= nums.length <= 2 * 10⁵
- 0 <= nums[i] <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Build from the most significant bit</summary>

To maximize XOR, you want the result to have as many 1s as possible in the highest bit positions. Start from the most significant bit (bit 31) and work your way down. For each bit position, try to find two numbers whose XOR has a 1 in that position.
</details>

<details>
<summary>🎯 Hint 2: Use a Trie for efficient bit matching</summary>

Build a binary trie where each node represents a bit (0 or 1). Insert all numbers into the trie. For each number, traverse the trie trying to take the opposite path at each bit (to maximize XOR). This gives O(n × 31) = O(n) time complexity.
</details>

<details>
<summary>📝 Hint 3: Trie-based algorithm</summary>

```
1. Build binary trie:
   - For each number, insert bits from MSB to LSB (31 down to 0)
   - Each node has two children: bit 0 and bit 1
2. For each number in array:
   - Traverse trie, trying to take opposite bit at each level
   - If opposite bit exists, take it (maximizes XOR)
   - Otherwise, take the same bit
   - Calculate XOR value along the path
3. Return maximum XOR found

Alternative: Use hash set and greedy bit construction
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Trie (Binary Tree) | O(n × 31) = O(n) | O(n × 31) = O(n) | 31 bits per integer |
| Hash Set (Greedy) | O(n × 31) = O(n) | O(n) | Build result bit by bit |
| Brute Force | O(n²) | O(1) | Check all pairs |

## Common Mistakes

### Mistake 1: Not considering all 32 bits

```python
# Wrong: Only checking lower bits
def max_xor_wrong(nums):
    max_xor = 0
    for i in range(len(nums)):
        for j in range(i+1, len(nums)):
            max_xor = max(max_xor, nums[i] ^ nums[j])
    return max_xor  # Works but O(n²)
```

```python
# Correct: Trie-based approach handling all bits
class TrieNode:
    def __init__(self):
        self.children = {}

def max_xor_correct(nums):
    root = TrieNode()

    # Insert all numbers into trie
    for num in nums:
        node = root
        for i in range(31, -1, -1):
            bit = (num >> i) & 1
            if bit not in node.children:
                node.children[bit] = TrieNode()
            node = node.children[bit]

    max_xor = 0
    # For each number, find maximum XOR
    for num in nums:
        node = root
        current_xor = 0
        for i in range(31, -1, -1):
            bit = (num >> i) & 1
            toggle_bit = 1 - bit  # Opposite bit
            if toggle_bit in node.children:
                current_xor |= (1 << i)
                node = node.children[toggle_bit]
            else:
                node = node.children[bit]
        max_xor = max(max_xor, current_xor)

    return max_xor
```

### Mistake 2: Incorrect bit manipulation

```python
# Wrong: Not properly extracting or setting bits
def find_max_xor_wrong(nums):
    trie = {}
    for num in nums:
        node = trie
        for i in range(32):  # Wrong: should go from 31 down
            bit = num & 1  # Wrong: should use (num >> i) & 1
            num >>= 1
```

```python
# Correct: Proper bit extraction from MSB to LSB
def find_max_xor_correct(nums):
    root = TrieNode()
    for num in nums:
        node = root
        for i in range(31, -1, -1):  # MSB to LSB
            bit = (num >> i) & 1  # Extract i-th bit
            if bit not in node.children:
                node.children[bit] = TrieNode()
            node = node.children[bit]
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Maximum XOR with Bound | Hard | Find max XOR where both elements <= bound - M1707 |
| Maximum XOR of Subarrays | Hard | Find subarray with maximum XOR sum |
| Minimum XOR | Medium | Find minimum XOR instead of maximum |
| XOR Queries on Array | Medium | Handle range XOR queries efficiently |

## Practice Checklist

- [ ] Day 1: Solve using Trie approach (35-45 min)
- [ ] Day 2: Implement using hash set greedy method (30 min)
- [ ] Day 7: Re-solve and optimize trie space (25 min)
- [ ] Day 14: Understand XOR properties deeply (complement, associativity) (20 min)
- [ ] Day 30: Explain why building from MSB maximizes XOR (10 min)

**Strategy**: See [Bit Manipulation Pattern](../strategies/patterns/bit-manipulation.md)
