---
id: M308
old_id: A118
slug: 4-keys-keyboard
title: 4 Keys Keyboard
difficulty: medium
category: medium
topics: ["dynamic-programming", "math"]
patterns: ["dp-optimization"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E001", "M001", "M150"]
prerequisites: ["dynamic-programming-basics", "greedy-algorithms"]
---
# 4 Keys Keyboard

## Problem

Imagine a special keyboard with exactly four keys that manipulate the character `'A'` on a screen:

- **Key A**: Types a single `'A'` character to the screen
- **Ctrl-A**: Selects all characters currently displayed on the screen
- **Ctrl-C**: Copies the current selection to a buffer (clipboard)
- **Ctrl-V**: Pastes the buffered content, appending it to the existing screen content

Given an integer `n` representing the maximum number of key presses allowed, determine the maximum number of `'A'` characters you can get on the screen.

The challenge lies in deciding when to stop pressing 'A' and start using the copy-paste sequence. For small `n` (like 1-6 presses), just typing 'A' repeatedly is optimal. But for larger `n`, using the 3-key copy-paste sequence (Ctrl-A, Ctrl-C, Ctrl-V) to multiply your current count becomes more efficient. For example, with 7 presses, you could type "A, A, A, Ctrl-A, Ctrl-C, Ctrl-V, Ctrl-V" to get 9 A's (3 typed, then doubled twice = 3 × 3 = 9).

The decision point involves understanding when multiplication (costing 3 keys minimum for a 2x effect) beats addition (1 key for +1 A). You can also chain copy-paste operations: copy what you have, paste multiple times, then copy that larger amount and paste again.

## Why This Matters

This problem extends the 2-keys keyboard problem by adding selection capability, making it more realistic (similar to actual text editors) and significantly more complex. It teaches you to optimize sequences of operations where some operations (Ctrl-A, Ctrl-C, Ctrl-V) work together as a group, a pattern common in instruction scheduling, batch processing, and compiler optimization. The dynamic programming solution involves considering multiple copy-paste windows, teaching you how to handle state spaces where previous decisions cascade into current ones. This models resource allocation problems where you commit resources (key presses) to setup operations (select, copy) hoping for multiplicative payoff (multiple pastes).

## Examples

**Example 1:**
- Input: `n = 3`
- Output: `3`
- Explanation: We can at most get 3 A's on screen by pressing the following key sequence:
A, A, A

**Example 2:**
- Input: `n = 7`
- Output: `9`
- Explanation: We can at most get 9 A's on screen by pressing following key sequence:
A, A, A, Ctrl A, Ctrl C, Ctrl V, Ctrl V

## Constraints

- 1 <= n <= 50

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Optimization Problem</summary>

The key insight is deciding when to stop printing 'A' and start using copy-paste operations. For small n (≤ 6), just pressing 'A' is optimal. But for larger n, the copy-paste sequence (Ctrl-A, Ctrl-C, Ctrl-V, Ctrl-V, ...) multiplies your current count. Think about: at what point does multiplication (3 keys for 2x) become more efficient than addition (1 key for +1)?

</details>

<details>
<summary>Hint 2: Dynamic Programming State</summary>

Define `dp[i]` as the maximum number of 'A's achievable with i key presses. For each position, you have two choices:
1. Press 'A' one more time: `dp[i] = dp[i-1] + 1`
2. Use the last j presses for copy-paste operations: select-all, copy, then paste (j-2) times, which multiplies the content from position (i-j) by (j-1)

The recurrence becomes: `dp[i] = max(dp[i-1] + 1, dp[i-j] * (j-1))` for all valid j values.

</details>

<details>
<summary>Hint 3: Optimization and Pattern Recognition</summary>

Notice that you only need to check small values of j (the copy-paste window), because beyond a certain point, breaking down the operations yields better results. For n ≤ 50, checking j from 3 to approximately sqrt(n) or a small constant is sufficient. Also observe: the best strategy often involves copying when you have a number that's a good multiplier (like when current count divides well into remaining operations).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Dynamic Programming | O(n²) | O(n) | Check all possible copy-paste positions for each state |
| Optimized DP | O(n·√n) | O(n) | Only check reasonable copy-paste window sizes |
| Mathematical Pattern | O(n) | O(1) | Exploit mathematical relationships between operations |

## Common Mistakes

**Mistake 1: Forgetting Copy-Paste Cost**
```python
# WRONG: Not accounting for the 3-key cost of Ctrl-A, Ctrl-C, Ctrl-V
def maxA(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i-1] + 1
        # Missing: need at least 3 keys for copy-paste to be valid
        for j in range(2, i):
            dp[i] = max(dp[i], dp[i-j] * j)
    return dp[n]

# CORRECT: Ensure enough keys for copy-paste
def maxA(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i-1] + 1
        for j in range(3, i + 1):  # Need at least 3 keys
            # i-j keys to build, then j keys: Ctrl-A, Ctrl-C, (j-2)×Ctrl-V
            dp[i] = max(dp[i], dp[i-j] * (j-1))
    return dp[n]
```

**Mistake 2: Incorrect Multiplication Factor**
```python
# WRONG: Using j instead of (j-1) as multiplier
for j in range(3, i + 1):
    dp[i] = max(dp[i], dp[i-j] * j)  # Should be (j-1)

# CORRECT: j keys = 1 select + 1 copy + (j-2) pastes = multiply by (j-1)
for j in range(3, i + 1):
    dp[i] = max(dp[i], dp[i-j] * (j-1))
```

**Mistake 3: Not Initializing Base Cases**
```python
# WRONG: Missing base case initialization
def maxA(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        for j in range(3, i + 1):
            dp[i] = max(dp[i], dp[i-j] * (j-1))
    return dp[n]

# CORRECT: Each single press adds one 'A'
def maxA(n):
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        dp[i] = dp[i-1] + 1  # Base: press 'A'
        for j in range(3, i + 1):
            dp[i] = max(dp[i], dp[i-j] * (j-1))
    return dp[n]
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| K-Keys Keyboard | Generalize to k different operations | Hard |
| Minimum Steps to Target | Find minimum key presses to reach exactly m 'A's | Medium |
| Weighted Operations | Each operation has different costs | Medium |
| Multiple Buffers | Allow multiple copy buffers | Hard |
| Undo Operation | Add ability to undo last operation | Medium |

## Practice Checklist

- [ ] First attempt (30 min)
- [ ] Review dynamic programming approach
- [ ] Understand the 3-key copy-paste cost
- [ ] Implement and test with small examples (n=3,7,10)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Attempt variations: weighted operations, minimum steps

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
