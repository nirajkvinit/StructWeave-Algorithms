---
id: M322
old_id: A137
slug: maximum-swap
title: Maximum Swap
difficulty: medium
category: medium
topics: ["greedy", "string"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["E009", "M670", "M556"]
prerequisites: ["greedy-algorithms", "digit-manipulation", "array-traversal"]
---
# Maximum Swap

## Problem

Given a non-negative integer `num`, you can swap exactly two of its digits (at most once) to create the largest possible value. Your goal is to find and return that maximum value.

The key insight is that you want larger digits as far left as possible, since leftmost digits contribute more to the overall value. For example, with 2736, swapping the 2 and 7 gives 7236, which is larger than any other single swap.

However, there's a subtle complication: what if the number is already in descending order, like 9973? In that case, no swap will improve it, so you return the original number. You also need to handle duplicates carefully. For instance, with 1993, you should swap the first 1 with the rightmost 9 to get 9913, not with the first 9 which would give 9193.

The problem constrains you to at most one swap, meaning you either make one beneficial swap or none at all. You can't perform multiple swaps to gradually improve the number. This makes it a greedy problem: you need to identify the single best swap that maximizes the result.

Think about scanning from left to right to find the first position where a larger digit exists somewhere to the right. Then, among those larger digits to the right, choose the largest one, and if there are duplicates, choose the rightmost occurrence to maximize value.

## Why This Matters

Greedy digit manipulation problems appear in trading algorithms, price optimization systems, and number formatting utilities. The strategy of making locally optimal choices that lead to globally optimal solutions is a fundamental algorithmic pattern.

This problem specifically teaches you to think about positional value and how to exploit the structure of decimal numbers. Understanding when greedy approaches work (and when they don't) is crucial for algorithm design. Here, the greedy choice of "swap the first too-small digit with the largest available digit to its right" provably gives the optimal answer.

The problem also builds skills in index tracking and handling edge cases like duplicates and already-optimal inputs, both common requirements in string and array manipulation tasks.

## Examples

**Example 1:**
- Input: `num = 2736`
- Output: `7236`
- Explanation: Exchanging digits 2 and 7 produces the maximum value.

**Example 2:**
- Input: `num = 9973`
- Output: `9973`
- Explanation: No swap is beneficial.

## Constraints

- 0 <= num <= 10⁸

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Identify the Optimal Swap Strategy</summary>

To maximize the number, you want the largest possible digit in the leftmost position. The greedy strategy is:
1. Find the first position from the left where a larger digit exists to the right
2. Swap with the rightmost occurrence of the largest such digit (to handle duplicates)

Example: `2736` → The first position (2) has larger digits to the right (7,3,6). The largest is 7, so swap 2 and 7.

</details>

<details>
<summary>Hint 2: Track Last Occurrence of Each Digit</summary>

Build an array `last[d]` that stores the rightmost index where digit `d` appears. Then scan from left to right:

```python
digits = list(str(num))
last = {int(d): i for i, d in enumerate(digits)}

for i, digit in enumerate(digits):
    # Check if a larger digit exists to the right
    for d in range(9, int(digit), -1):
        if last[d] > i:
            # Found a swap that improves the number
            digits[i], digits[last[d]] = digits[last[d]], digits[i]
            return int(''.join(digits))
```

This ensures we swap with the largest possible digit from the rightmost position.

</details>

<details>
<summary>Hint 3: Handle Edge Cases</summary>

Consider these scenarios:
- Already maximum (sorted descending): `9973` → No swap needed
- All same digits: `5555` → No swap needed
- Single digit: `7` → No swap needed
- Duplicates: `1993` → Swap first 1 with rightmost 9 → `9913`

The algorithm naturally handles these by only swapping when it finds an improvement.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy with Last Index | O(n) | O(n) | n = number of digits; optimal solution |
| Brute Force (all swaps) | O(n²) | O(n) | Try all possible swaps |
| Sort and Compare | O(n log n) | O(n) | Not sufficient; doesn't find correct swap |

## Common Mistakes

**Mistake 1: Swapping with First Occurrence of Larger Digit**
```python
# Wrong: Swapping with first occurrence
num = "1993"
# Swapping first '1' with first '9' gives "9913"
# But should swap with rightmost '9' for same result
# Consider "1929": should give "9921", not "9129"

# Correct: Use last occurrence
last = {int(d): i for i, d in enumerate(digits)}
for i in range(len(digits)):
    for d in range(9, int(digits[i]), -1):
        if d in last and last[d] > i:
            # Swap with rightmost occurrence
```

**Mistake 2: Multiple Swaps**
```python
# Wrong: Swapping multiple times
num = "2736"
# First swap 2 and 7: "7236"
# Then swap 3 and 6: "7632"  # Wrong! Only one swap allowed

# Correct: Make exactly one swap (or none)
# Return after first beneficial swap
```

**Mistake 3: Not Checking if Swap is Beneficial**
```python
# Wrong: Always swapping something
digits = list(str(num))
digits[0], digits[-1] = digits[-1], digits[0]

# Correct: Only swap if it increases the value
for i in range(len(digits)):
    for d in range(9, int(digits[i]), -1):
        if d in last and last[d] > i:
            # Beneficial swap found
            return
# If no swap found, return original
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Minimum swap (minimize number) | Easy | Swap smallest to front |
| K swaps allowed | Medium | Dynamic programming or greedy |
| Adjacent swaps only | Hard | Bubble sort variant with limit |
| Maximize difference after swap | Medium | Different optimization objective |
| Swap to make palindrome | Medium | Additional structural constraint |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Analyzed time/space complexity
- [ ] Solved without hints
- [ ] Tested edge cases (sorted, duplicates, single digit)
- [ ] Reviewed alternative approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 1 week
- [ ] Could explain solution to others
