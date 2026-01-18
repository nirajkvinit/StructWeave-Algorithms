---
id: E078
old_id: I002
slug: happy-number
title: Happy Number
difficulty: easy
category: easy
topics: ["math", "hash-table"]
patterns: ["cycle-detection"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E141", "E202", "E876"]
prerequisites: ["hash-set", "cycle-detection", "floyd-algorithm"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Happy Number

## Problem

A **happy number** is defined by a specific iterative process involving digit squares. Starting with any positive integer, repeatedly replace the number with the sum of the squares of its digits. Continue this process until one of two outcomes occurs:

1. The sequence reaches 1 (a stable endpoint)
2. The sequence enters an infinite loop that never reaches 1

Numbers that eventually reach 1 through this process are called "happy numbers."

**Example walkthrough for n = 19:**
```
19 → 1² + 9² = 1 + 81 = 82
82 → 8² + 2² = 64 + 4 = 68
68 → 6² + 8² = 36 + 64 = 100
100 → 1² + 0² + 0² = 1  ← Reached 1! (happy)
```

**Example of an unhappy number, n = 2:**
```
2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 ...
                                            ↑____|
(Notice 4 repeats - infinite cycle, never reaches 1)
```

**Your task:** Given an integer `n`, return `true` if it's a happy number, `false` otherwise.

**Key challenge:** How do you detect if you've entered a cycle versus still progressing toward 1?

## Why This Matters

This problem elegantly combines mathematical iteration with **cycle detection**, teaching fundamental patterns:
- **Floyd's tortoise and hare algorithm**: Used in linked list cycle detection, memory corruption detection, and random number generator analysis
- **Hash-based tracking**: State management for detecting repeated patterns
- **Convergence analysis**: Understanding when iterative processes terminate versus loop infinitely

Real-world applications include:
- **Checksum algorithms**: Detecting transmission errors in network protocols
- **Pseudorandom number generators**: Testing for period cycles
- **Game theory**: Detecting repeated game states to identify draws
- **Cryptographic hash analysis**: Finding collisions and cycles

The elegance lies in recognizing that any mathematical sequence either terminates, diverges, or cycles—and developing techniques to detect which.

## Examples

**Example 1:**
- Input: `n = 19`
- Output: `true`
- Explanation: 1² + 9² = 82
8² + 2² = 68
6² + 8² = 100
1² + 0² + 0² = 1

**Example 2:**
- Input: `n = 2`
- Output: `false`

## Constraints

- 1 <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

The key insight is recognizing that the sequence will either reach 1 or enter a cycle. How can you detect if you've seen a number before in the sequence? Consider what happens if the same number appears twice.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

There are two main approaches: (1) Use a hash set to track all numbers seen so far and detect cycles, or (2) Use Floyd's cycle detection algorithm (slow and fast pointers) without extra space. Both work, but the hash set approach is more intuitive.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Hash Set Approach:**
1. Create a helper function to compute sum of squared digits
2. Initialize a hash set to store seen numbers
3. While n is not 1 and not in the set:
   - Add n to the set
   - Compute n = sum of squared digits of n
4. Return true if n == 1, false otherwise

**Floyd's Algorithm:**
Use slow (one step) and fast (two steps) pointers to detect cycles.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Hash Set** | **O(log n)** | **O(log n)** | Most intuitive; log n iterations max |
| Floyd's Algorithm | O(log n) | O(1) | Space-optimized cycle detection |
| Hardcoded Cycle | O(log n) | O(1) | Check if number is in known cycle |

## Common Mistakes

**Mistake 1: Not Detecting Cycles**

```python
# Wrong: Will run forever on unhappy numbers
def isHappy(n):
    while n != 1:
        n = sum_of_squares(n)  # Infinite loop if n is unhappy
    return True
```

```python
# Correct: Track seen numbers to detect cycles
def isHappy(n):
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = sum_of_squares(n)
    return n == 1
```

**Mistake 2: Incorrect Digit Extraction**

```python
# Wrong: String conversion is inefficient
def sum_of_squares(n):
    s = str(n)
    total = 0
    for char in s:
        total += int(char) ** 2
    return total
```

```python
# Correct: Use modulo and division
def sum_of_squares(n):
    total = 0
    while n > 0:
        digit = n % 10
        total += digit * digit
        n //= 10
    return total
```

**Mistake 3: Missing Base Case**

```python
# Wrong: Doesn't handle n = 1 initially
def isHappy(n):
    seen = set()
    while n not in seen:  # Will add 1 to set before checking
        seen.add(n)
        n = sum_of_squares(n)
    return n == 1  # Returns false for n = 1
```

```python
# Correct: Check termination condition first
def isHappy(n):
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = sum_of_squares(n)
    return n == 1
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Linked List Cycle | Detect cycle in linked list using same technique | Easy |
| Ugly Number | Check if number's prime factors are limited | Easy |
| Add Digits | Repeatedly sum digits until single digit | Easy |
| Find Duplicate Number | Cycle detection in array | Medium |
| Sum of Square Numbers | Check if number is sum of two squares | Medium |

## Practice Checklist

- [ ] Day 1: Solve using hash set approach
- [ ] Day 2: Implement Floyd's cycle detection variant
- [ ] Day 3: Optimize digit extraction without string conversion
- [ ] Week 1: Solve without hints, explain why cycles occur
- [ ] Week 2: Apply cycle detection to linked list problems
- [ ] Month 1: Study mathematical properties of happy numbers

**Strategy**: See [Cycle Detection Pattern](../strategies/patterns/two-pointers.md)
