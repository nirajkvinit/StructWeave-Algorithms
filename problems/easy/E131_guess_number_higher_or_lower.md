---
id: E131
old_id: I173
slug: guess-number-higher-or-lower
title: Guess Number Higher or Lower
difficulty: easy
category: easy
topics: ["binary-search"]
patterns: ["binary-search"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E128", "M278", "E069"]
prerequisites: ["binary-search", "integer-overflow"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Guess Number Higher or Lower

## Problem

Imagine playing a guessing game where a secret number has been selected from the range `1` to `n`, and you need to figure out what it is. Each time you make a guess, you receive feedback telling you whether your guess was too high, too low, or exactly correct.

You interact with a pre-defined API function `int guess(int num)` that returns three possible values based on your guess. If you guess too high (your number is greater than the secret), it returns `-1`. If you guess too low (your number is less than the secret), it returns `1`. If you guess correctly (your number equals the secret), it returns `0`.

Your task is to implement a function that finds the secret number using this guessing API. The challenge is to minimize the number of API calls you make. With `n` potentially as large as 2³¹ - 1 (over 2 billion), a linear search that tries every number from 1 upward would be far too slow. Each API call gives you perfect information about which direction to search next, which makes this a classic binary search scenario.

## Why This Matters

This problem is a quintessential example of binary search applied to an interactive API, a pattern you'll encounter frequently in production systems. Real-world applications include version control systems (finding the commit that introduced a bug via git bisect), database indexing (locating records efficiently), rate limiting (binary search for optimal request rates), and A/B testing (finding optimal parameter values). The interactive nature teaches you to work with external systems where you don't have direct access to the data structure but can query it incrementally. Understanding how to avoid integer overflow when calculating midpoints is critical for systems dealing with large identifiers like timestamps, user IDs, or memory addresses.

## Examples

**Example 1:**
- Input: `n = 10, pick = 6`
- Output: `6`
- Note: The secret number is 6, which must be found within the range 1-10

**Example 2:**
- Input: `n = 1, pick = 1`
- Output: `1`
- Note: Only one possibility exists

**Example 3:**
- Input: `n = 2, pick = 1`
- Output: `1`
- Note: The secret is the smaller of two options

## Constraints

- 1 <= n <= 2³¹ - 1
- 1 <= pick <= n

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Linear Search
Start from 1 and check each number sequentially until you find the target.

**Key Steps:**
1. Iterate from i = 1 to n
2. Call guess(i) for each number
3. Return when guess(i) returns 0

**When to use:** Only for understanding the problem. Very inefficient - O(n) API calls.

### Intermediate Approach - Binary Search
The feedback tells you which half of the search space contains the answer. Can you eliminate half each time?

**Key Steps:**
1. Initialize left = 1, right = n
2. Calculate mid point
3. Use guess(mid) to determine which half to search
4. Adjust left or right based on feedback

**When to use:** This is the optimal solution - O(log n) API calls.

### Advanced Approach - Ternary Search
Can you divide the search space into thirds instead of halves for faster convergence?

**Key Steps:**
1. Divide range into three parts
2. Make two guess calls per iteration
3. Eliminate 2/3 of search space based on results

**When to use:** Theoretically interesting but not better than binary search for this problem (more API calls).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear Search | O(n) | O(1) | n API calls in worst case |
| Binary Search | O(log n) | O(1) | log₂(n) API calls; optimal |
| Ternary Search | O(log₃ n) | O(1) | Looks better but uses 2× API calls per iteration |

## Common Mistakes

### Mistake 1: Integer overflow when calculating mid
```python
# Wrong - can overflow for large n
def guessNumber(n):
    left, right = 1, n
    while left <= right:
        mid = (left + right) // 2  # Can overflow if left + right > max int
        result = guess(mid)
        if result == 0:
            return mid
        elif result == -1:
            right = mid - 1
        else:
            left = mid + 1
```

**Why it's wrong:** When n is close to 2³¹ - 1, left + right can exceed the maximum integer value, causing overflow.

**Fix:** Use mid = left + (right - left) // 2 to avoid overflow.

### Mistake 2: Incorrect boundary update
```python
# Wrong - not excluding mid after checking
def guessNumber(n):
    left, right = 1, n
    while left <= right:
        mid = left + (right - left) // 2
        result = guess(mid)
        if result == 0:
            return mid
        elif result == -1:
            right = mid  # Wrong: should be mid - 1
        else:
            left = mid   # Wrong: should be mid + 1
```

**Why it's wrong:** Not excluding mid after checking can cause infinite loops when left and right converge.

**Fix:** Always use mid - 1 for right and mid + 1 for left after confirming mid is not the answer.

### Mistake 3: Confusing the return values
```python
# Wrong - reversed logic for guess() return value
def guessNumber(n):
    left, right = 1, n
    while left <= right:
        mid = left + (right - left) // 2
        result = guess(mid)
        if result == 0:
            return mid
        elif result == -1:
            left = mid + 1  # Wrong direction
        else:
            right = mid - 1  # Wrong direction
```

**Why it's wrong:** When guess returns -1, it means your guess is too high, so you should search lower (right = mid - 1), not higher.

**Fix:** Remember: -1 means too high (search left), 1 means too low (search right).

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| Guess Number II | Medium | Minimize worst-case cost with pay per guess | Dynamic programming with binary search |
| First Bad Version | Easy | Similar binary search with different API | Same pattern, different context |
| Search Insert Position | Easy | Binary search for target or insertion point | No API call; standard binary search |
| Peak Element | Medium | Find any peak in an array | Modified binary search |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Implemented binary search solution
- [ ] Handled integer overflow correctly
- [ ] Understood guess() return value semantics
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain binary search clearly

**Strategy Guide:** For pattern recognition and detailed techniques, see [Binary Search Pattern](../strategies/patterns/binary-search.md)
