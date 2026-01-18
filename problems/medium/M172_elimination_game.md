---
id: M172
old_id: I189
slug: elimination-game
title: Elimination Game
difficulty: medium
category: medium
topics: ["bit-manipulation", "math", "recursion"]
patterns: ["mathematical-pattern"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E202", "M375", "M292"]
prerequisites: ["recursion", "mathematical-thinking"]
---
# Elimination Game

## Problem

Picture a lineup of numbers from 1 to `n`, all arranged in order. You're going to repeatedly eliminate numbers following a specific alternating pattern until only one survivor remains. In the first round, you scan from left to right and eliminate every second number, starting by removing the very first number (so you'd remove 1, 3, 5, 7, and so on). In the second round, you reverse direction, scanning from right to left and again eliminating every second number, but this time starting from the rightmost position. You keep alternating: odd-numbered rounds go left-to-right, even-numbered rounds go right-to-left, always removing every other element.

Let's trace through an example with `n = 9`. Initially, you have `[1, 2, 3, 4, 5, 6, 7, 8, 9]`. After round 1 (left-to-right elimination), you remove 1, 3, 5, 7, and 9, leaving `[2, 4, 6, 8]`. In round 2 (right-to-left), you eliminate 8 and 4, leaving `[2, 6]`. Finally, in round 3 (left-to-right again), you remove 2, leaving just `[6]` as the sole survivor. Your task is to determine which number survives when you perform this elimination process starting with the sequence 1 through `n`. The naive approach of simulating each round works fine for small values, but when `n` reaches a billion, you need a smarter strategy that finds the pattern mathematically rather than tracking the entire array.

## Why This Matters

This problem is a variant of the famous Josephus problem, which has fascinating historical roots dating back to an ancient story about soldiers in a circle choosing who would survive. Beyond its historical interest, elimination games model real-world scenarios in distributed systems and load balancing. When servers are taken offline in rotation for maintenance, or when round-robin scheduling eliminates tasks from a queue, similar patterns emerge. The deeper lesson here is recognizing when brute-force simulation is infeasible and learning to extract mathematical patterns instead. By analyzing how the first element's position changes with each round and how the gap between remaining elements grows, you can derive a recursive relationship that solves the problem in logarithmic time. This technique of finding closed-form solutions or recursive patterns appears frequently in competitive programming, algorithm design interviews, and performance-critical systems where you must handle massive inputs efficiently without exhausting memory or time budgets.

## Examples

**Example 1:**
- Input: `n = 9`
- Output: `6`
- Explanation:
  - Start: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  - After round 1 (left to right): [2, 4, 6, 8]
  - After round 2 (right to left): [2, 6]
  - After round 3 (left to right): [6]

**Example 2:**
- Input: `n = 1`
- Output: `1`
- Explanation: With only one element, it is the survivor.

## Constraints

- 1 <= n <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Simulation is Too Slow</summary>

With n up to 10⁹, simulating the actual elimination process would require too much memory and time. Instead, look for a mathematical pattern or recursive relationship. Try working through small examples (n=1,2,3,4,5) to see if you can spot a pattern.

</details>

<details>
<summary>🎯 Hint 2: Track the Head Position</summary>

Instead of maintaining the entire array, track only the first element's value and the step size between remaining elements. After each elimination round, these values change predictably. The head moves by the step size when eliminating from left, or stays/moves based on array size parity when eliminating from right.

</details>

<details>
<summary>📝 Hint 3: Recursive Pattern</summary>

Define the problem recursively:
- leftToRight(n) = 2 * rightToLeft(n/2)
- rightToLeft(n) depends on whether n is even or odd
  - If n is even: 2 * leftToRight(n/2) - 1
  - If n is odd: 2 * leftToRight(n/2)

Base case: when n=1, return 1. This eliminates the need for simulation entirely.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Simulation | O(n) | O(n) | TLE for large n, stores entire array |
| Track Head + Step | O(log n) | O(1) | Iterative approach tracking first element |
| **Recursive Pattern** | **O(log n)** | **O(log n)** | Optimal: elegant mathematical solution |

## Common Mistakes

### Mistake 1: Attempting to simulate with arrays

```python
# Wrong: Memory and time limit exceeded for large n
def lastRemaining(n):
    arr = list(range(1, n + 1))
    left_to_right = True

    while len(arr) > 1:
        if left_to_right:
            arr = arr[1::2]  # Remove every other starting from index 0
        else:
            arr = arr[-2::-2][::-1]  # Remove from right
        left_to_right = not left_to_right

    return arr[0]

# Correct: Use mathematical pattern
def lastRemaining(n):
    def helper(n, is_left):
        if n == 1:
            return 1

        if is_left:
            # Left to right always eliminates first element
            return 2 * helper(n // 2, False)
        else:
            # Right to left depends on parity
            if n % 2 == 1:
                return 2 * helper(n // 2, True)
            else:
                return 2 * helper(n // 2, True) - 1

    return helper(n, True)
```

### Mistake 2: Incorrect recursive relationship

```python
# Wrong: Doesn't handle direction changes correctly
def lastRemaining(n):
    if n == 1:
        return 1

    # WRONG: Doesn't differentiate between left and right elimination
    return 2 * lastRemaining(n // 2)

# Correct: Track direction and handle parity
def lastRemaining(n):
    def helper(n, is_left):
        if n == 1:
            return 1

        if is_left:
            return 2 * helper(n // 2, False)
        else:
            if n % 2 == 1:
                return 2 * helper(n // 2, True)
            else:
                return 2 * helper(n // 2, True) - 1

    return helper(n, True)
```

### Mistake 3: Off-by-one errors in iterative approach

```python
# Wrong: Incorrect head tracking
def lastRemaining(n):
    head = 1
    step = 1
    remaining = n
    left_to_right = True

    while remaining > 1:
        # WRONG: Not updating head correctly for right-to-left
        if left_to_right:
            head += step

        remaining //= 2
        step *= 2
        left_to_right = not left_to_right

    return head

# Correct: Properly track when head changes
def lastRemaining(n):
    head = 1
    step = 1
    remaining = n
    left_to_right = True

    while remaining > 1:
        # Head changes when going left-to-right OR
        # when going right-to-left with odd remaining count
        if left_to_right or remaining % 2 == 1:
            head += step

        remaining //= 2
        step *= 2
        left_to_right = not left_to_right

    return head
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Start from any position | First elimination starts from a given index | Medium |
| K-step elimination | Remove every k-th element instead of every 2nd | Hard |
| Josephus problem | Classic circular elimination problem | Medium |
| Last k survivors | Find the last k elements instead of just one | Hard |
| Reverse process | Given final number, find what n was | Hard |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Work through small examples by hand
- [ ] Implement recursive solution
- [ ] Implement iterative solution
- [ ] Verify pattern with n=1 through n=10
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [Mathematical Patterns](../strategies/patterns/mathematical-thinking.md)
