---
id: M175
old_id: I196
slug: integer-replacement
title: Integer Replacement
difficulty: medium
category: medium
topics: ["bit-manipulation", "greedy", "dynamic-programming"]
patterns: ["greedy", "bit-manipulation"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E070", "M279", "M201"]
prerequisites: ["bit-manipulation", "greedy-algorithms", "memoization"]
---
# Integer Replacement

## Problem

Imagine you're running a process that transforms numbers according to simple rules, and your goal is to reduce any starting number `n` down to 1 using as few operations as possible. The rules are straightforward but lead to surprisingly complex optimization decisions. When your current number is even, you have only one option: divide it by 2. When the number is odd, you have a choice: either add 1 or subtract 1. Your task is to find the minimum number of operations needed to reach 1 from your starting value.

Let's trace through a couple of examples. Starting with `n = 8` (an even number), you divide by 2 to get 4, then divide by 2 again to get 2, then divide one more time to reach 1. That's 3 steps total, with no choices to make since 8, 4, and 2 are all even. Now consider `n = 7`, which is odd. One path is `7 → 8 → 4 → 2 → 1` (add 1, then three divisions), which takes 4 steps. Another path is `7 → 6 → 3 → 2 → 1` (subtract 1, divide, subtract 1, divide), also 4 steps. Both paths are equally good here. The interesting challenge arises when you need to figure out which choice (add or subtract) leads to fewer total operations when facing an odd number.

Here's where it gets clever: if you look at numbers in binary representation, dividing by 2 is just a right shift (removing the last bit), which is fast and predictable. Adding or subtracting 1 changes the last bit, but the choice affects how many divisions you'll need later. For instance, if an odd number ends in binary with `11` (like 7 = `111` or 11 = `1011`), adding 1 creates trailing zeros, which means multiple quick divisions ahead. Conversely, if it ends in `01` (like 5 = `101`), subtracting 1 might be better. There's a special case with 3, though, where subtracting is optimal despite the `11` pattern. The constraint is that `n` can be as large as 2³¹ - 1, so you need an efficient solution that doesn't explore all possible paths.

## Why This Matters

This problem appears in algorithm optimization, cache management, and mathematical computation libraries. Many processors have special instructions for multiplication and division by powers of two (bit shifts), making these operations extremely fast compared to general arithmetic. Understanding when to transform a number to reach more efficient operations is valuable in low-level programming and performance tuning. Database query optimizers use similar greedy decision-making to transform expressions into more efficient forms. Computer graphics rendering pipelines use bit manipulation tricks to quickly scale and transform coordinates. This problem specifically teaches the connection between greedy algorithms and bit manipulation: by examining the binary representation, you can make locally optimal choices (look at the last two bits) that lead to a globally optimal solution. It also demonstrates dynamic programming with memoization when you take the recursive approach, showing how caching subproblem results prevents redundant computation. The greedy bit manipulation approach is particularly elegant, solving in O(log n) time with O(1) space by recognizing that maximizing trailing zeros minimizes future operations.

## Examples

**Example 1:**
- Input: `n = 8`
- Output: `3`
- Explanation: The sequence is 8 -> 4 -> 2 -> 1

**Example 2:**
- Input: `n = 7`
- Output: `4`
- Explanation: Two possible sequences work: 7 -> 8 -> 4 -> 2 -> 1, or alternatively 7 -> 6 -> 3 -> 2 -> 1

**Example 3:**
- Input: `n = 4`
- Output: `2`

## Constraints

- 1 <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Even Numbers Are Easy</summary>

When n is even, there's only one choice: divide by 2. The interesting decision comes when n is odd - should you add 1 or subtract 1? Think about what happens to the binary representation in each case.

</details>

<details>
<summary>🎯 Hint 2: Bit Manipulation Insight</summary>

In binary, dividing by 2 is a right shift. When n is odd, adding 1 or subtracting 1 changes the last bit. Look at the last two bits: if they're "11", adding 1 creates trailing zeros (efficient). If they're "01", subtracting 1 is better (except for n=3).

</details>

<details>
<summary>📝 Hint 3: Greedy Strategy</summary>

Greedy rule for odd n:
- If n = 3, subtract 1 (special case)
- If last two bits are "11", add 1 (creates multiple trailing zeros)
- If last two bits are "01", subtract 1
- Count each operation and continue until n becomes 1

This works because maximizing trailing zeros minimizes future operations.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS | O(log n) | O(log n) | Explores both choices at each odd number |
| DP with Memoization | O(log n) | O(log n) | Cache subproblem results |
| **Greedy Bit Manipulation** | **O(log n)** | **O(1)** | Optimal: single pass with bit tricks |

## Common Mistakes

### Mistake 1: Not handling the special case n=3

```python
# Wrong: Doesn't special-case n=3
def integerReplacement(n):
    steps = 0

    while n != 1:
        if n % 2 == 0:
            n //= 2
        else:
            # WRONG: For n=3, this chooses +1 (3->4->2->1 = 3 steps)
            # But 3->2->1 = 2 steps is better
            if n & 3 == 3:  # Last two bits are 11
                n += 1
            else:
                n -= 1
        steps += 1

    return steps

# Correct: Special case for n=3
def integerReplacement(n):
    steps = 0

    while n != 1:
        if n % 2 == 0:
            n //= 2
        elif n == 3:
            n -= 1  # Special case: 3 -> 2 is optimal
        elif n & 3 == 3:  # Last two bits are 11
            n += 1
        else:
            n -= 1
        steps += 1

    return steps
```

### Mistake 2: Using recursion without memoization

```python
# Wrong: Exponential time without memoization
def integerReplacement(n):
    if n == 1:
        return 0

    if n % 2 == 0:
        return 1 + integerReplacement(n // 2)
    else:
        # WRONG: Recalculates same subproblems many times
        return 1 + min(
            integerReplacement(n + 1),
            integerReplacement(n - 1)
        )

# Correct: Add memoization
def integerReplacement(n):
    memo = {}

    def helper(n):
        if n == 1:
            return 0
        if n in memo:
            return memo[n]

        if n % 2 == 0:
            result = 1 + helper(n // 2)
        else:
            result = 1 + min(helper(n + 1), helper(n - 1))

        memo[n] = result
        return result

    return helper(n)
```

### Mistake 3: Integer overflow when adding 1

```python
# Wrong: Can overflow for n = 2^31 - 1
def integerReplacement(n):
    steps = 0

    while n != 1:
        if n % 2 == 0:
            n //= 2
        elif n == 3:
            n -= 1
        elif n & 3 == 3:
            n += 1  # WRONG: For max int, n+1 overflows!
        else:
            n -= 1
        steps += 1

    return steps

# Correct: Handle large numbers or use greedy carefully
def integerReplacement(n):
    steps = 0

    while n != 1:
        if n % 2 == 0:
            n //= 2
        elif n == 3 or n & 3 == 1:
            n -= 1
        else:  # n & 3 == 3
            n += 1
        steps += 1

    return steps
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Reach target | Minimum steps to reach any target number from n | Medium |
| K operations | Can add/subtract any value 1 to k | Hard |
| Reverse problem | Find starting number that takes exactly k steps | Hard |
| Multiple operations | Allow multiplication/division by any prime | Hard |
| Count all paths | Count all minimum-length paths to 1 | Medium |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Implement greedy bit manipulation solution
- [ ] Implement DP solution with memoization
- [ ] Test edge cases (1, 3, powers of 2, 2^31-1)
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
