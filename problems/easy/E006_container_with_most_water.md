---
id: E006
old_id: F011
slug: container-with-most-water
title: Container With Most Water
difficulty: easy
category: easy
topics: ["array"]
patterns: ["two-pointers-opposite"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E011", "M042", "M084"]
prerequisites: ["arrays-basics", "two-pointers-pattern"]
---
# Container With Most Water

## Problem

Given an array of positive integers representing vertical line heights at different positions along a horizontal axis, find two lines that form a container capable of holding the maximum amount of water. Return the maximum water area.

The water container is formed by choosing two vertical lines from the array. The area of water trapped is determined by the shorter of the two lines (which limits the water height) multiplied by the horizontal distance between them. For example, if you choose lines at positions i and j with heights 8 and 7, and they are 7 positions apart, the area is min(8, 7) × 7 = 49.

**Visual example with height = [1,8,6,2,5,4,8,3,7]:**

```
Index:  0   1   2   3   4   5   6   7   8
Height: 1   8   6   2   5   4   8   3   7

Visualization:
8 |   |                       |
7 |   |                       |       |
6 |   |   |                   |       |
5 |   |   |       |           |       |
4 |   |   |       |   |       |       |
3 |   |   |       |   |       |   |   |
2 |   |   |   |   |   |       |   |   |
1 | | |   |   |   |   |       |   |   |
  +---+---+---+---+---+---+---+---+---+
  0   1   2   3   4   5   6   7   8

Area = min(height[i], height[j]) × (j - i)
Optimal: lines at positions 1 and 8 give min(8,7) × 7 = 49
```

The brute force approach checks all possible pairs, giving O(n²) time. However, there's a clever O(n) solution using the two-pointer technique.


## Why This Matters

This problem teaches the **greedy two-pointer technique** - a powerful pattern that appears in geometry, optimization, and resource allocation problems.

**Real-world applications:**
- **Memory allocation**: Finding optimal buffer sizes in operating systems
- **Financial trading**: Maximizing profit windows in stock price analysis
- **Logistics**: Optimizing cargo loading and container packing
- **Image processing**: Finding largest rectangular regions in histograms

**Core concept**: Sometimes the optimal solution requires eliminating impossible candidates rather than trying everything. The two-pointer approach proves that local greedy decisions (moving the shorter line) lead to the global optimum.

## Examples

**Example 1:**
- Input: `height = [1,1]`
- Output: `1`

## Constraints

- n == height.length
- 2 <= n <= 10⁵
- 0 <= height[i] <= 10⁴

## Think About

1. Why does checking every pair of lines give us O(n²) time? How many pairs exist?
2. If you have two lines, what determines the water capacity - the taller or shorter line?
3. When the left line is shorter than the right line, could moving the right pointer inward ever increase the area?
4. What invariant can we maintain that guarantees we don't miss the maximum?

---

## Approach Hints

<details>
<summary>💡 Hint 1: What determines container capacity?</summary>

When you form a container with two lines at positions `i` and `j`:
- **Width**: `j - i` (distance between lines)
- **Height**: `min(height[i], height[j])` (the shorter line limits water level)
- **Area**: `width × height`

**Think about:** If you have a short line and a tall line, what happens to capacity if you move the tall line closer? Can the area ever increase?

</details>

<details>
<summary>🎯 Hint 2: The greedy insight</summary>

Start with the **widest possible container** (leftmost and rightmost lines). This maximizes width.

Now you must make the container narrower. Which pointer should move?

**Key insight:** Moving the pointer at the **taller line** can never improve the result because:
- Width decreases (guaranteed)
- Height can't increase (still limited by the shorter line on the other side)

Therefore, always move the pointer at the **shorter line**. This is the only move that could potentially increase area.

</details>

<details>
<summary>📝 Hint 3: Two-pointer algorithm</summary>

```
initialize left = 0, right = n-1
max_area = 0

while left < right:
    width = right - left
    height = min(heights[left], heights[right])
    area = width × height

    max_area = max(max_area, area)

    # Move the pointer at the shorter line
    if heights[left] < heights[right]:
        left += 1
    else:
        right -= 1

return max_area
```

**Why this works:** We start with maximum width and systematically eliminate impossible candidates. Moving the shorter line is the only move that could lead to a taller container.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force | O(n²) | O(1) | Check all pairs; simple but slow |
| **Two Pointers (Optimal)** | **O(n)** | **O(1)** | Single pass; greedy elimination |

**Why Two Pointers Wins:**
- Single pass through array (each element visited at most once)
- No extra space needed
- Greedy strategy is provably optimal (moving shorter line is always correct)
- Eliminates (n-1) + (n-2) + ... + 1 = O(n²) impossible candidates in O(n) time

---

## Common Mistakes

### 1. Moving the wrong pointer
```
# WRONG: Always move left pointer
while left < right:
    area = (right - left) * min(height[left], height[right])
    max_area = max(max_area, area)
    left += 1  # This misses optimal solutions!

# CORRECT: Move the pointer at shorter line
if height[left] < height[right]:
    left += 1
else:
    right -= 1
```

### 2. Trying to optimize by skipping equal heights
```
# WRONG: Skipping duplicates might miss optimal answer
while left < right and height[left] == height[left+1]:
    left += 1  # Don't do this!

# CORRECT: Check every position
# The width decrease might be compensated by height increase
```

### 3. Calculating area incorrectly
```
# WRONG: Using max height instead of min
area = (right - left) * max(height[left], height[right])

# CORRECT: Container height limited by shorter line
area = (right - left) * min(height[left], height[right])
```

### 4. Off-by-one errors in width
```
# WRONG: Forgetting that indices represent positions
width = right - left - 1

# CORRECT: Distance between index i and j is (j - i)
width = right - left
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Find specific volume** | Return if volume >= target exists | Same algorithm, return true when found |
| **Multiple containers** | Can skip lines between boundaries | Still two pointers, but count only boundary lines |
| **3D container** | Add depth dimension | Becomes NP-hard, requires different approach |
| **Weighted lines** | Different material densities | Modify area formula to include weights |
| **Trapping Rain Water (M042)** | Water fills gaps between bars | Different problem - requires prefix/suffix max |

**Related Problems:**
- **Longest Subarray with Sum <= K**: Same two-pointer pattern
- **Rectangle in Histogram (M084)**: Uses stack instead of two pointers
- **Boats to Save People**: Weight-based two-pointer variation

---

## Practice Checklist

**Correctness:**
- [ ] Handles minimum case (2 lines)
- [ ] Handles all same heights
- [ ] Handles strictly increasing heights
- [ ] Handles strictly decreasing heights
- [ ] Returns maximum area correctly

**Optimization:**
- [ ] Achieved O(n) time complexity
- [ ] O(1) space complexity
- [ ] Single pass solution implemented
- [ ] Can explain why greedy approach works

**Interview Readiness:**
- [ ] Can prove correctness of moving shorter pointer
- [ ] Can explain why moving taller pointer fails
- [ ] Can draw diagram showing algorithm execution
- [ ] Can code solution in 5 minutes
- [ ] Can discuss tradeoffs with brute force

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Prove correctness on paper
- [ ] Day 14: Explain greedy strategy verbally
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
