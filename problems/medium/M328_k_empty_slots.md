---
id: M328
old_id: A150
slug: k-empty-slots
title: K Empty Slots
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E001
    title: Two Sum
    difficulty: easy
  - id: M001
    title: Add Two Numbers
    difficulty: medium
prerequisites:
  - Array traversal
  - Sliding window technique
  - Index mapping
---
# K Empty Slots

## Problem

Imagine n bulbs arranged in a line, numbered from 1 to n, all initially off. Each day, exactly one bulb is turned on according to a schedule. You're given an array `bulbs` where `bulbs[i] = x` means on day i+1, the bulb at position x will be turned on.

Your task is to find the earliest day when there exist two lit bulbs with exactly k unlit bulbs between them. If this configuration never occurs, return -1.

The key challenge is understanding the mapping: array indices are 0-based (day 0, 1, 2...) while bulb positions are 1-based (bulb 1, 2, 3...). On day i+1, you turn on the bulb at position bulbs[i]. Note that bulbs is a permutation of 1 to n, meaning each bulb is turned on exactly once.

For example, with bulbs = [1,3,2] and k = 1:
- Day 1: Turn on bulb 1 → [ON, off, off]
- Day 2: Turn on bulb 3 → [ON, off, ON] ← Found it! Bulbs 1 and 3 are on with exactly 1 off bulb (position 2) between them

The naive approach of simulating each day and checking all pairs would be O(n²), too slow for n up to 20,000. Instead, transform the problem: create a reverse mapping where days[position] tells you which day the bulb at that position turns on. Then use a sliding window to check windows of size k+2 (two boundaries plus k in between).

## Why This Matters

This problem teaches you to transform array problems by changing perspective. Instead of simulating time forward (day by day), you can analyze positions and when they activate. This "reverse the viewpoint" technique appears in scheduling algorithms, event processing systems, and interval problems.

The sliding window pattern with index mapping is common in stock trading algorithms (finding price patterns), time-series analysis (detecting anomalies), and any domain where you need to detect specific spatial or temporal patterns.

Understanding 0-based vs 1-based indexing and handling the conversion carefully is essential for array manipulation and prevents off-by-one errors, one of the most common bugs in programming.

## Examples

**Example 1:**
- Input: `bulbs = [1,3,2], k = 1`
- Output: `2`
- Explanation:
Day 1: bulbs[0] = 1, so bulb at position 1 turns on: [1,0,0]
Day 2: bulbs[1] = 3, so bulb at position 3 turns on: [1,0,1]
Day 3: bulbs[2] = 2, so bulb at position 2 turns on: [1,1,1]
The answer is 2 because on day 2, bulbs at positions 1 and 3 are on with exactly 1 off bulb (at position 2) between them.

**Example 2:**
- Input: `bulbs = [1,2,3], k = 1`
- Output: `-1`

## Constraints

- n == bulbs.length
- 1 <= n <= 2 * 10⁴
- 1 <= bulbs[i] <= n
- bulbs is a permutation of numbers from 1 to n.
- 0 <= k <= 2 * 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Problem Space</summary>

Instead of simulating the bulb-turning process day by day, consider transforming the problem. Create a reverse mapping: for each position, record which day the bulb at that position turns on. This gives you a `days` array where `days[position-1]` tells you when the bulb at that position lights up.

Now the question becomes: find two positions `i` and `j` where `j - i = k + 1`, such that all bulbs between them turn on after both bulbs at positions `i` and `j` have turned on.

</details>

<details>
<summary>Hint 2: Sliding Window Approach</summary>

Use a sliding window of size `k+2` (the two boundary bulbs plus k bulbs in between). For positions `left` and `right` where `right = left + k + 1`, check if all bulbs in the range `(left, right)` turn on after both `days[left]` and `days[right]`.

Maintain a window and track the maximum day among all bulbs in between. If this maximum is greater than `min(days[left], days[right])`, it means some middle bulb turned on before one of the boundaries, so the condition fails for this window.

</details>

<details>
<summary>Hint 3: Optimization Strategy</summary>

To optimize, iterate through positions and maintain the minimum day needed for a valid configuration. For each potential left boundary, check if the window `[left, left+k+1]` satisfies the condition.

When you find a valid configuration, the answer is `max(days[left], days[right])` because that's the day when both boundaries are lit (and all middle bulbs are still off).

Track the minimum such day across all valid windows.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force Simulation | O(n²) | O(n) | Simulate each day and check all windows |
| Sliding Window | O(n) | O(n) | Single pass with position-to-day mapping |
| Optimized Window | O(n) | O(n) | Efficient boundary checking |

## Common Mistakes

### Mistake 1: Confusing Day vs Position Indexing
```python
# WRONG: Direct indexing without conversion
def kEmptySlots(bulbs, k):
    for day in range(len(bulbs)):
        position = bulbs[day]  # This is 1-indexed!
        # Using position directly as 0-indexed array index
        state[position] = True  # Bug: position is 1-indexed
```

**Why it's wrong**: The `bulbs` array contains 1-indexed positions, but array access in most languages is 0-indexed. You must subtract 1 when using positions as array indices.

### Mistake 2: Incorrect Window Validation
```python
# WRONG: Not checking all bulbs in the window
def kEmptySlots(bulbs, k):
    days = [0] * len(bulbs)
    for i, pos in enumerate(bulbs):
        days[pos-1] = i + 1

    result = float('inf')
    for left in range(len(days) - k - 1):
        right = left + k + 1
        # Missing: check if middle bulbs turn on AFTER boundaries
        if days[left] and days[right]:
            result = min(result, max(days[left], days[right]))
```

**Why it's wrong**: This doesn't verify that all k bulbs between left and right remain off when both boundaries are lit. You must ensure no middle bulb turns on before `max(days[left], days[right])`.

### Mistake 3: Off-by-One in Window Size
```python
# WRONG: Incorrect window size calculation
def kEmptySlots(bulbs, k):
    days = [0] * len(bulbs)
    for i, pos in enumerate(bulbs):
        days[pos-1] = i + 1

    for left in range(len(days)):
        right = left + k  # Bug: should be left + k + 1
        # k empty slots means k+2 total positions (2 boundaries + k middle)
```

**Why it's wrong**: If you want exactly k empty slots between two bulbs, the distance between them is k+1, so the right boundary should be at `left + k + 1`.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| K Identical Slots | Medium | Find earliest day with k consecutive lit bulbs |
| Minimum Gap | Hard | Find the minimum gap between any two lit bulbs over all days |
| Multiple Gaps | Hard | Find all days when exactly k gaps of size m exist |
| 2D Grid Version | Hard | Extend to a 2D grid with orthogonal adjacency |

## Practice Checklist

- [ ] **First attempt**: Solve independently (60 min time limit)
- [ ] **Analyze**: Study and understand the sliding window solution
- [ ] **Optimize**: Achieve O(n) time complexity
- [ ] **Edge cases**: Handle k=0, k>=n, single bulb
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain solution in under 5 minutes
- [ ] **Variations**: Solve at least 2 related problems
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Array Pattern](../prerequisites/arrays.md)
