---
id: E184
old_id: I296
slug: random-point-in-non-overlapping-rectangles
title: Random Point in Non-overlapping Rectangles
difficulty: easy
category: easy
topics: ["array", "math", "binary-search", "randomization"]
patterns: ["prefix-sum", "binary-search"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - M062  # Random Pick with Weight
  - M063  # Random Pick Index
  - E001  # Two Sum
prerequisites:
  - Prefix sum
  - Binary search
  - Random number generation
strategy_ref: ../strategies/patterns/prefix-sum.md
---
# Random Point in Non-overlapping Rectangles

## Problem

You're given an array of non-overlapping axis-aligned rectangles, where each rectangle `rects[i] = [ai, bi, xi, yi]` specifies coordinates: `(ai, bi)` is the bottom-left corner and `(xi, yi)` is the top-right corner. Your task is to design a system that can randomly select an integer coordinate point from the total area covered by all these rectangles, where every integer point has equal probability of being chosen.

An integer point is one where both the x and y coordinates are integers. For example, the point (3, 5) is an integer point, but (3.5, 5) is not. Importantly, boundary points count as part of the rectangle, so a rectangle with corners [0, 0, 2, 2] contains 9 integer points: (0,0), (0,1), (0,2), (1,0), (1,1), (1,2), (2,0), (2,1), (2,2).

The challenge is achieving uniform random selection across all rectangles. Naively picking a random rectangle then a random point within it would be biased—larger rectangles would be undersampled because each rectangle would have equal selection probability regardless of size. You need weighted random selection where the probability of choosing from a rectangle is proportional to the number of integer points it contains. This requires efficient preprocessing and fast query responses.

## Why This Matters

This problem combines probability theory with algorithmic efficiency, teaching weighted random sampling—a technique essential for simulation systems, testing frameworks, and Monte Carlo methods. The core challenge is ensuring uniform distribution across a non-uniform space, which appears in diverse scenarios: game development (spawning items in zones of different sizes), A/B testing (proportionally sampling from user segments), graphics rendering (stratified sampling for anti-aliasing), and load balancing (distributing requests proportional to server capacity).

The elegant solution uses prefix sums for O(1) space representation of cumulative weights, combined with binary search for O(log n) lookups. This pattern generalizes to any weighted sampling problem and demonstrates how mathematical preprocessing can transform seemingly expensive operations into efficient queries. The problem also reinforces understanding of inclusive coordinate ranges (a subtle but common source of bugs) and the relationship between discrete probability distributions and cumulative distribution functions. It's a practical interview problem that tests mathematical reasoning, data structure design, and attention to edge cases.

## Constraints

- 1 <= rects.length <= 100
- rects[i].length == 4
- -10⁹ <= ai < xi <= 10⁹
- -10⁹ <= bi < yi <= 10⁹
- xi - ai <= 2000
- yi - bi <= 2000
- All the rectangles do not overlap.
- At most 10⁴ calls will be made to pick.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
Calculate the number of integer points in each rectangle (width * height where width = x2 - x1 + 1, height = y2 - y1 + 1). To pick uniformly, first randomly select a rectangle weighted by its point count, then randomly select a point within that rectangle.

### Intermediate Hint
Use weighted random selection. Build a prefix sum array where prefix[i] stores the total number of points in rectangles 0 through i. Generate a random number in [0, total_points), use binary search to find which rectangle it falls into, then generate random x and y coordinates within that rectangle's bounds.

### Advanced Hint
Preprocessing: compute area (point count) for each rectangle and build prefix sum array. Pick(): generate random target in [0, total_points), binary search prefix sum to find rectangle index, compute random point as [x1 + rand() % width, y1 + rand() % height]. Time: O(log n) per pick, Space: O(n) for prefix array.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive Random Rectangle | O(1) pick | O(n) | Non-uniform: larger rectangles undersampled |
| Linear Search | O(n) pick | O(n) | Prefix sum with linear search |
| Binary Search + Prefix Sum | O(log n) pick | O(n) | Optimal approach |
| Reservoir Sampling | O(total_points) | O(1) | Impractical for large areas |

## Common Mistakes

### Mistake 1: Not accounting for inclusive endpoints
```python
# Wrong: Treating coordinates as exclusive
def __init__(self, rects):
    self.areas = []
    for x1, y1, x2, y2 in rects:
        # Wrong: should be (x2-x1+1) * (y2-y1+1)
        area = (x2 - x1) * (y2 - y1)
        self.areas.append(area)
```

**Issue**: Integer points include both endpoints. Rectangle [0,0,1,1] has 4 points (2x2), not 1 point (1x1).

**Fix**: Use `area = (x2 - x1 + 1) * (y2 - y1 + 1)` to count all integer points.

### Mistake 2: Incorrect random point generation
```python
# Wrong: Off-by-one in random coordinate
def pick(self):
    # ... select rectangle correctly
    x1, y1, x2, y2 = self.rects[idx]
    # Wrong: may generate x2+1 or y2+1
    x = x1 + random.randint(0, x2 - x1 + 1)
    y = y1 + random.randint(0, y2 - y1 + 1)
    return [x, y]
```

**Issue**: `randint(a, b)` includes both endpoints, so `randint(0, width)` can return width, giving x = x1 + width = x2 + 1.

**Fix**: Use `random.randint(x1, x2)` directly or `x1 + random.randint(0, x2 - x1)`.

### Mistake 3: Non-uniform rectangle selection
```python
# Wrong: Selecting rectangle uniformly instead of by area
def pick(self):
    rect_idx = random.randint(0, len(self.rects) - 1)
    x1, y1, x2, y2 = self.rects[rect_idx]
    # ... generate point in this rectangle
```

**Issue**: This gives each rectangle equal probability, not each point equal probability. Larger rectangles should be selected more often.

**Fix**: Use weighted selection based on rectangle areas (point counts).

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Random Point in Triangle | Medium | Pick random point in triangle with uniform distribution |
| Random Point in Circle | Medium | Generate random point within a circle |
| Random Point in Convex Polygon | Hard | Uniform random point in arbitrary convex polygon |
| Random Point with Exclusion | Medium | Pick random point avoiding certain excluded regions |
| Weighted Rectangle Sampling | Medium | Rectangles have different weights beyond area |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (30 min time limit)
- [ ] Implemented prefix sum + binary search solution
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with optimal approach
- [ ] Week 1: Implement without hints
- [ ] Week 2: Solve Random Pick with Weight
- [ ] Month 1: Teach weighted sampling to someone else

**Mastery Goals**
- [ ] Can explain why area weighting is needed
- [ ] Can handle edge cases (single point rectangle, very large coordinates)
- [ ] Can extend to other shapes
- [ ] Can solve in under 25 minutes

**Strategy**: See [Prefix Sum Patterns](../strategies/patterns/prefix-sum.md)
