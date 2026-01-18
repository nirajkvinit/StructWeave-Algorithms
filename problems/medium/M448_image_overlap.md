---
id: M448
old_id: A302
slug: image-overlap
title: Image Overlap
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Image Overlap

## Problem

You're given two binary square matrices `img1` and `img2`, each of size `n × n`, where every cell contains either `0` or `1`. Your goal is to find the maximum possible **overlap** between these two images.

You can **translate** (shift) one image over the other by any amount horizontally and/or vertically. The **overlap** is defined as the count of positions where **both matrices have a 1** at the same location after the shift is applied.

Important constraints:
- Only **translation** is allowed—no rotation or flipping
- Shifts can be in any direction (up, down, left, right) by any number of cells
- When an image is shifted, any `1` values that move outside the n×n boundary are lost and don't contribute to the overlap
- You're looking for the shift that maximizes the number of overlapping `1` cells

Return the maximum achievable overlap count.

**Visual Example:**

Consider shifting `img2` to find the best alignment with `img1`:

```
img1:           img2:
[1, 1, 0]       [0, 0, 0]
[0, 1, 0]       [0, 1, 1]
[0, 0, 0]       [0, 0, 1]

After shifting img2 right by 1 and up by 1:
Overlap positions where both have 1:
img1[0,0]=1 overlaps with shifted img2[0,0]=1
img1[0,1]=1 overlaps with shifted img2[0,1]=1
img1[1,1]=1 overlaps with shifted img2[1,1]=1

Maximum overlap = 3
```

Think of this like sliding one transparency sheet over another on an overhead projector—you're looking for the position where the most dots line up.

## Why This Matters

This problem teaches a powerful optimization technique: instead of simulating all possible shifts (which would be O(n⁴)), you can use **translation vectors** to reduce complexity to O(k²) where k is the count of `1` cells. This pattern appears in computer vision (image registration, template matching), pattern recognition, and even in bioinformatics (sequence alignment). The key insight—representing spatial relationships as coordinate differences—is fundamental to computational geometry and helps you recognize when brute force grid iteration can be replaced with smarter data structures like hash maps.

## Examples

**Example 1:**
- Input: `img1 = [[1]], img2 = [[1]]`
- Output: `1`

**Example 2:**
- Input: `img1 = [[0]], img2 = [[0]]`
- Output: `0`

## Constraints

- n == img1.length == img1[i].length
- n == img2.length == img2[i].length
- 1 <= n <= 30
- img1[i][j] is either 0 or 1.
- img2[i][j] is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of trying all possible shifts on the entire grid, focus on the positions of 1s. The overlap count is determined by how many 1-positions in one image align with 1-positions in the other after shifting. Think of this as a translation vector problem.
</details>

<details>
<summary>🎯 Main Approach</summary>
Extract all (row, col) positions where img1 has 1s and where img2 has 1s. For each pair of 1-positions (one from img1, one from img2), calculate the translation vector needed to align them. Count how many other 1-pairs share this same translation vector. The translation with the most aligned pairs gives the maximum overlap.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a hash map to count translation vectors. The key can be (delta_row, delta_col) representing the shift needed. This avoids simulating every possible shift position and reduces the problem from O(n^4) to O(n^2 * k^2) where k is the number of 1s.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^4) | O(1) | Try all (2n-1)^2 shifts, check n^2 cells each |
| Optimal (Translation Vector) | O(k^2) where k = count of 1s | O(k^2) | Hash map of translation vectors |

## Common Mistakes

1. **Forgetting boundary checks when shifting**
   ```python
   # Wrong: Not handling out-of-bounds after shift
   for i in range(n):
       for j in range(n):
           overlap += img1[i][j] & img2[i+dx][j+dy]  # IndexError!

   # Correct: Check bounds or extract positions first
   ones1 = [(i, j) for i in range(n) for j in range(n) if img1[i][j]]
   ones2 = [(i, j) for i in range(n) for j in range(n) if img2[i][j]]
   ```

2. **Not considering all possible translation vectors**
   ```python
   # Wrong: Only trying positive shifts
   for dx in range(n):
       for dy in range(n):
           # Missing negative shifts!

   # Correct: Try all relative positions between 1s
   from collections import Counter
   translations = Counter()
   for r1, c1 in ones1:
       for r2, c2 in ones2:
           translations[(r1-r2, c1-c2)] += 1
   return max(translations.values()) if translations else 0
   ```

3. **Inefficient simulation of all shifts**
   ```python
   # Wrong: Simulating each shift completely
   max_overlap = 0
   for shift_r in range(-n+1, n):
       for shift_c in range(-n+1, n):
           count = 0
           for i in range(n):
               for j in range(n):
                   # O(n^4) complexity

   # Correct: Use translation vector counting (O(k^2))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Image Rotation | Hard | Allow 90-degree rotations in addition to translation |
| Maximum Overlap (Multiple Images) | Hard | Find best overlap position for 3+ images |
| Minimum Shift for Overlap | Medium | Find minimum translation to achieve target overlap |
| Image Matching with Scaling | Hard | Allow both translation and uniform scaling |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Table](../../strategies/data-structures/hash-table.md)
