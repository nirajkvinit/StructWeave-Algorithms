---
id: M279
old_id: A078
slug: valid-square
title: Valid Square
difficulty: medium
category: medium
topics: ["geometry", "math"]
patterns: ["distance-calculation", "sorting"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E100
    name: Valid Perfect Square
    difficulty: easy
  - id: M220
    name: Valid Triangle Number
    difficulty: medium
  - id: M150
    name: Max Points on a Line
    difficulty: medium
prerequisites:
  - concept: Distance formula (Euclidean distance)
    level: basic
  - concept: Properties of squares
    level: basic
  - concept: Sorting algorithms
    level: basic
---
# Valid Square

## Problem

Given four points in a 2D plane, determine whether these points can form a valid square. Each point is represented as [x, y] coordinates, and the points may be given in any order. Return true if they form a square with four equal sides and four right angles, false otherwise.

A valid square has specific geometric properties: all four sides must have equal length, both diagonals must have equal length, and the diagonal length must equal the side length multiplied by √2 (from the Pythagorean theorem). Critically, the sides must have positive length, meaning all four points cannot be the same or collinear.

The challenge is that the input points have no guaranteed ordering. Point 1 might not be adjacent to point 2 in the actual square. To handle this, calculate all pairwise distances between the four points. With 4 points, there are exactly 6 distances: 4 should be the side length (smaller value) and 2 should be the diagonal length (larger value).

Use squared distances (x₂-x₁)² + (y₂-y₁)² to avoid floating-point precision issues from square roots. If you sort the 6 distances, a valid square will have the pattern: [s, s, s, s, d, d] where s is the squared side length, d is the squared diagonal length, s > 0, and d = 2s.


## Why This Matters

This problem teaches computational geometry fundamentals and how to validate geometric properties algorithmically. The distance formula and Pythagorean theorem appear constantly in graphics programming, game development, robotics (path planning), and geographic information systems (GIS).

The technique of comparing distances rather than angles demonstrates a key principle: choose representations that avoid floating-point issues. Squared distances are exact for integer coordinates, while angles would require trigonometric functions with rounding errors. This insight applies broadly to numerical computing.

Understanding geometric invariants (properties that remain true regardless of orientation or position) helps you design robust validation algorithms. This pattern extends to validating other shapes, detecting collisions in games, and verifying spatial relationships in CAD software and map applications.

## Examples

**Example 1:**
- Input: `p1 = [0,0], p2 = [1,1], p3 = [1,0], p4 = [0,1]`
- Output: `true`

**Example 2:**
- Input: `p1 = [0,0], p2 = [1,1], p3 = [1,0], p4 = [0,12]`
- Output: `false`

**Example 3:**
- Input: `p1 = [1,0], p2 = [-1,0], p3 = [0,1], p4 = [0,-1]`
- Output: `true`

## Constraints

- p1.length == p2.length == p3.length == p4.length == 2
- -10⁴ <= xi, yi <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding Square Properties</summary>

A valid square has specific geometric properties:
- **4 equal sides**: All four sides have the same length
- **2 equal diagonals**: Both diagonals have the same length
- **Diagonal relationship**: Diagonal length = side length × √2

Also, critical edge case: All sides must have **positive length** (not degenerate to a point or line).

```python
# Key insight: In a square with side length s
# - 4 sides each have length s
# - 2 diagonals each have length s√2
# So you should find exactly 2 distinct distances:
# - 4 occurrences of the smaller distance (sides)
# - 2 occurrences of the larger distance (diagonals)
```
</details>

<details>
<summary>Hint 2: Calculate All Pairwise Distances</summary>

Since you have 4 points, calculate distances between all pairs:
- Total pairs = C(4,2) = 6 distances
- Use squared distances to avoid floating-point issues

```python
def distance_squared(p1, p2):
    return (p1[0] - p2[0])**2 + (p1[1] - p2[1])**2

# Calculate all 6 distances
distances = []
points = [p1, p2, p3, p4]
for i in range(4):
    for j in range(i+1, 4):
        distances.append(distance_squared(points[i], points[j]))
```
</details>

<details>
<summary>Hint 3: Validate Distance Pattern</summary>

After calculating all 6 distances, sort them and check the pattern:
1. Sort the 6 distances
2. Check that first 4 are equal (sides) and non-zero
3. Check that last 2 are equal (diagonals)
4. Verify diagonal² = 2 × side² (Pythagorean theorem)

```python
distances.sort()

# Valid square pattern:
# distances[0] == distances[1] == distances[2] == distances[3] > 0  (4 sides)
# distances[4] == distances[5]  (2 diagonals)
# distances[4] == 2 * distances[0]  (diagonal = side * √2)

is_valid = (distances[0] > 0 and
            distances[0] == distances[1] == distances[2] == distances[3] and
            distances[4] == distances[5] and
            distances[4] == 2 * distances[0])
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Distance Calculation + Sort | O(1) | O(1) | Fixed 4 points, 6 distances |
| Distance Set Validation | O(1) | O(1) | Check two distinct distance values |

**Detailed Analysis:**
- **Time**: O(1) - Always calculate exactly 6 distances, sort 6 elements
- **Space**: O(1) - Store at most 6 distance values
- **Key Insight**: With fixed input size (4 points), all operations are constant time

## Common Mistakes

### Mistake 1: Using floating-point arithmetic for distances
```python
# Wrong: Floating-point precision issues
import math
distance = math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)

# Correct: Use squared distances
distance_sq = (p1[0]-p2[0])**2 + (p1[1]-p2[1])**2
```

### Mistake 2: Forgetting to check for degenerate cases
```python
# Wrong: Not checking if all points are the same
if min(distances) == max(distances):
    return True  # Could be all points at same location!

# Correct: Ensure positive side length
if distances[0] == 0:
    return False  # Degenerate case
```

### Mistake 3: Not validating the diagonal-to-side ratio
```python
# Wrong: Only checking 4 equal sides and 2 equal diagonals
is_square = (distances[0] == distances[3] and distances[4] == distances[5])

# Correct: Also verify diagonal = √2 × side
is_square = (distances[0] == distances[3] and
             distances[4] == distances[5] and
             distances[4] == 2 * distances[0])
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Valid Rectangle | Check if 4 points form a rectangle | Medium |
| Valid Parallelogram | Check if 4 points form a parallelogram | Medium |
| Valid Triangle | Check if 3 points form a valid triangle | Easy |
| Largest Square | Find largest square among N points | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] **Initial Attempt** - Solve independently (30 min limit)
- [ ] **Solution Study** - If stuck, study one approach deeply
- [ ] **Implementation** - Code solution from scratch without reference
- [ ] **Optimization** - Achieve O(1) time and space
- [ ] **Edge Cases** - Test: all same points, collinear points, rectangle but not square
- [ ] **Variations** - Solve at least 2 related problems
- [ ] **Spaced Repetition** - Re-solve after: 1 day, 1 week, 1 month

**Mastery Goal**: Solve in < 15 minutes with bug-free code.

**Strategy**: See [Geometry Patterns](../strategies/patterns/geometry.md)
