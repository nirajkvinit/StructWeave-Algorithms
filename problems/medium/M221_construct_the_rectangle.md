---
id: M221
old_id: I291
slug: construct-the-rectangle
title: Construct the Rectangle
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E202", "M050", "E167"]
prerequisites: ["math", "square-root", "factorization"]
---
# Construct the Rectangle

## Problem

Imagine you're designing a webpage layout and need to display a certain number of items in a rectangular grid. Given a positive integer representing the total area, find the dimensions that create the most visually balanced rectangle.

Specifically, you need to find two dimensions L (length) and W (width) that satisfy:
- The product of L and W equals the given area (L × W = area)
- L must be greater than or equal to W (ensuring consistency: L ≥ W)
- The difference between L and W should be as small as possible (creating a more square-like, balanced shape)

For example, an area of 4 could form rectangles with dimensions [1,4], [2,2], or [4,1]. The pair [2,2] creates a perfect square with zero difference, making it the most balanced. The pair [1,4] creates a long, narrow rectangle with a difference of 3.

The key insight is that rectangles closer to squares (where length and width are similar) appear more balanced. Your task is to find the dimensions that minimize this difference while satisfying the area constraint.

Return an array `[L, W]` containing the optimal length and width values.

## Why This Matters

This problem teaches fundamental number theory and optimization thinking that appears in many real-world scenarios. Web designers use similar logic when creating responsive grid layouts that adapt to different screen sizes. Image processing applications use these concepts when determining optimal thumbnail dimensions while preserving aspect ratios. The problem also builds intuition about factors and divisibility that's essential for cryptography algorithms, which often rely on properties of prime numbers and factorization. More broadly, it develops the skill of recognizing when a mathematical property (like the square root being the midpoint of factors) can dramatically simplify an optimization problem.

## Examples

**Example 1:**
- Input: `area = 4`
- Output: `[2,2]`
- Explanation: For an area of 4, possible dimension pairs include [1,4], [2,2], and [4,1]. The pair [1,4] violates the constraint that L >= W. The pair [4,1] has a larger difference than [2,2], making [2,2] the optimal solution.

**Example 2:**
- Input: `area = 37`
- Output: `[37,1]`

**Example 3:**
- Input: `area = 122122`
- Output: `[427,286]`

## Constraints

- 1 <= area <= 10⁷

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>

To minimize the difference between L and W, you want them to be as close to each other as possible. For a perfect square, L = W = sqrt(area). For non-squares, you want to find the largest factor of the area that is less than or equal to sqrt(area).

</details>

<details>
<summary>🎯 Hint 2: Optimal Approach</summary>

Start from sqrt(area) and work downward to find the first number that divides the area evenly. This will be your width W. The length L will be area / W. This guarantees the minimum difference because you're starting from the middle and working outward.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

1. Calculate the square root of the area
2. Starting from sqrt(area) rounded down, iterate downward
3. For each candidate width W:
   - Check if area % W == 0
   - If yes, L = area / W and return [L, W]
4. If no factors found (shouldn't happen for valid input), return [area, 1]

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Optimal (from sqrt) | O(√n) | O(1) | Start from sqrt and search downward |
| Trial Division | O(n) | O(1) | Check all numbers from 1 to n |
| Factorization | O(√n) | O(√n) | Find all factors, then pick closest pair |

## Common Mistakes

### Mistake 1: Starting from 1 instead of sqrt
```python
# Wrong: Inefficient search from beginning
def constructRectangle(area):
    for w in range(1, area + 1):
        if area % w == 0:
            l = area // w
            if l >= w:
                # This finds the smallest difference, but inefficiently
                return [l, w]
```

```python
# Correct: Start from sqrt for efficiency
def constructRectangle(area):
    import math
    w = int(math.sqrt(area))
    while w > 0:
        if area % w == 0:
            return [area // w, w]
        w -= 1
    return [area, 1]  # Fallback (shouldn't reach here)
```

### Mistake 2: Not ensuring L >= W constraint
```python
# Wrong: Might return W > L
def constructRectangle(area):
    import math
    w = int(math.sqrt(area))
    while w > 0:
        if area % w == 0:
            l = area // w
            return [w, l]  # Wrong order!
        w -= 1
```

```python
# Correct: Always return [L, W] where L >= W
def constructRectangle(area):
    import math
    w = int(math.sqrt(area))
    while w > 0:
        if area % w == 0:
            return [area // w, w]  # L is always >= W
        w -= 1
```

### Mistake 3: Using floating point arithmetic incorrectly
```python
# Wrong: Precision issues with float division
def constructRectangle(area):
    import math
    sqrt_area = math.sqrt(area)
    w = sqrt_area
    while w > 0:
        l = area / w  # Float division
        if l == int(l):  # Unreliable float comparison
            return [int(l), int(w)]
        w -= 1
```

```python
# Correct: Use integer operations
def constructRectangle(area):
    import math
    w = int(math.sqrt(area))
    while w > 0:
        if area % w == 0:  # Integer modulo
            return [area // w, w]  # Integer division
        w -= 1
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Perfect Squares | Easy | Determine if a number is a perfect square |
| Count Primes | Medium | Count prime numbers less than n |
| Integer Break | Medium | Break integer into sum of integers to maximize product |
| Valid Perfect Square | Easy | Check if number is perfect square without sqrt |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] After 1 day (spaced repetition)
- [ ] After 3 days (spaced repetition)
- [ ] After 1 week (spaced repetition)
- [ ] Before interview (final review)

**Completion Status**: ⬜ Not Started | 🟨 In Progress | ✅ Mastered

**Strategy**: See [Math Fundamentals](../strategies/fundamentals/math-basics.md)
