---
id: E171
old_id: I268
slug: convex-polygon
title: Convex Polygon
difficulty: easy
category: easy
topics: ["array", "geometry", "math"]
patterns: ["cross-product", "vector-math"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E149", "E587", "E812"]
prerequisites: ["cross-product", "vector-operations", "coordinate-geometry"]
strategy_ref: ../strategies/fundamentals/computational-geometry.md
---
# Convex Polygon

## Problem

You are given a sequence of 2D points `points` where each element `points[i] = [xi, yi]` represents a coordinate in the plane. These points, when connected in the order given (and closing the loop from the last point back to the first), form a polygon. Your task is to determine whether this polygon is convex.

A polygon is convex if all its interior angles are less than 180 degrees. Equivalently, a convex polygon "bulges outward" at every vertex—it has no indentations or "caves" pointing inward. If you imagine walking along the boundary, you should always be turning in the same direction (either always left or always right), never switching between left and right turns.

The input is guaranteed to be a simple polygon (edges only meet at vertices, no self-intersections), which simplifies the problem. The key mathematical insight involves computing the cross product of consecutive edge vectors. The cross product tells you whether you're turning left (positive) or right (negative) at each vertex. For a convex polygon, all these cross products should have the same sign (or be zero for collinear points). If you encounter both positive and negative cross products, the polygon has both left and right turns, indicating concavity.

## Why This Matters

Convex polygon detection is fundamental in computational geometry with applications in computer graphics (collision detection, mesh generation), robotics (path planning, obstacle avoidance), geographic information systems (spatial analysis), and computer vision (shape recognition). Convex shapes have special properties that enable efficient algorithms: point-in-polygon tests are faster, intersection tests are simpler, and many optimization problems become tractable when restricted to convex regions.

This problem introduces the cross product, one of the most useful tools in computational geometry. Understanding how the cross product's sign indicates turn direction is essential for many geometric algorithms including convex hull construction, polygon triangulation, and line segment intersection. The technique of checking sign consistency across all vertices is a pattern that extends to validating other geometric properties and detecting anomalies in sequential data.

## Constraints

- 3 <= points.length <= 10⁴
- points[i].length == 2
- -10⁴ <= xi, yi <= 10⁴
- All the given points are **unique**.

## Think About

1. What makes this problem challenging?
   - Understanding the geometric property of convexity
   - Determining turn direction at each vertex
   - Handling edge cases like collinear points
   - Applying cross product for turn detection

2. Can you identify subproblems?
   - Computing vectors between consecutive points
   - Calculating cross product to determine turn direction
   - Checking if all turns have the same sign (all left or all right)

3. What invariants must be maintained?
   - A polygon is convex if all interior angles are less than 180°
   - Equivalently, all cross products have the same sign (or are zero)
   - Must traverse all vertices in order

4. Is there a mathematical relationship to exploit?
   - Cross product of vectors tells turn direction: positive = left, negative = right
   - For convex polygon, all cross products should have consistent sign
   - Cross product: (p2-p1) × (p3-p2) = (x2-x1)(y3-y2) - (y2-y1)(x3-x2)

## Approach Hints

### Hint 1: Check Interior Angles
For each vertex, calculate the angle formed by the two adjacent edges. If any interior angle exceeds 180 degrees, the polygon is concave.

**Key insight**: Interior angle calculation can be done using dot product or atan2.

**Limitations**: Requires trigonometric functions, can be less efficient and have floating-point precision issues.

### Hint 2: Cross Product for Turn Direction
Use the cross product of consecutive edge vectors to determine if each turn is left (positive) or right (negative). A convex polygon should have all turns in the same direction.

**Key insight**: Cross product sign indicates turn direction without needing angles.

**How to implement**:
- For each triplet of consecutive points (p1, p2, p3)
- Compute vectors: v1 = p2 - p1, v2 = p3 - p2
- Calculate cross product: cp = v1.x * v2.y - v1.y * v2.x
- Track the sign of all cross products

### Hint 3: Consistent Sign Checking
Iterate through all vertices, computing the cross product at each turn. Keep track of whether you've seen positive, negative, or both signs. If both signs appear, the polygon is concave.

**Key insight**: Can use flags or count positive/negative occurrences to detect inconsistency.

**Optimization strategy**:
- Initialize flags: hasPositive = false, hasNegative = false
- For each vertex i, compute cross product with i-1 and i+1 (wrap around)
- If cp > 0: hasPositive = true; if cp < 0: hasNegative = true
- If cp == 0: continue (collinear points, skip)
- Return false if both hasPositive and hasNegative are true

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Interior Angle Calculation | O(n) | O(1) | Check each vertex's angle using trigonometry |
| Cross Product (Basic) | O(n) | O(1) | Compute cross product for each consecutive triplet |
| Cross Product with Early Exit | O(n) | O(1) | Same but can exit early when inconsistency detected |
| Sign Tracking Optimized | O(n) | O(1) | Single pass with boolean flags for sign detection |

## Common Mistakes

### Mistake 1: Not handling wraparound for first and last points
```
// Wrong - doesn't check all vertices properly
for (let i = 1; i < points.length - 1; i++) {
    cp = crossProduct(points[i-1], points[i], points[i+1])
    // ... check sign
}

// Why it fails: Misses the turn at first point and last point
// Example: Points 0, 1, 2, ..., n-1 - misses turns at 0 and n-1

// Correct - handle wraparound with modulo
for (let i = 0; i < points.length; i++) {
    p1 = points[i]
    p2 = points[(i + 1) % n]
    p3 = points[(i + 2) % n]
    cp = crossProduct(p1, p2, p3)
}
```

### Mistake 2: Incorrect cross product calculation
```
// Wrong - computes dot product instead of cross product
crossProduct(p1, p2, p3) {
    v1 = [p2[0] - p1[0], p2[1] - p1[1]]
    v2 = [p3[0] - p2[0], p3[1] - p2[1]]
    return v1[0] * v2[0] + v1[1] * v2[1]  // This is dot product!
}

// Why it fails: Dot product gives magnitude, not turn direction
// Need cross product for 2D turn detection

// Correct - use cross product formula
crossProduct(p1, p2, p3) {
    return (p2[0] - p1[0]) * (p3[1] - p2[1]) -
           (p2[1] - p1[1]) * (p3[0] - p2[0])
}
```

### Mistake 3: Not handling collinear points correctly
```
// Wrong - treats zero cross product as invalid
for (let i = 0; i < n; i++) {
    cp = getCrossProduct(i)
    if (cp > 0) hasPositive = true
    if (cp < 0) hasNegative = true
    if (cp === 0) return false  // Wrong!
}

// Why it fails: Collinear points (cp = 0) are valid in convex polygons
// They represent a straight line segment, not a concave turn

// Correct - skip zero cross products
if (cp > 0) hasPositive = true
else if (cp < 0) hasNegative = true
// cp === 0 is ignored, it doesn't affect convexity
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Strictly convex polygon | No collinear points allowed (all cross products must be non-zero) | Easy |
| Find concave vertices | Return the indices of vertices causing concavity | Medium |
| Convex hull verification | Check if given polygon is the convex hull of points | Medium |
| Polygon area calculation | Calculate signed area using cross products | Easy |
| Point in polygon test | Determine if a point lies inside a convex polygon | Medium |
| 3D convex polyhedron | Extend to three dimensions | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Understand cross product concept
- [ ] Implement basic cross product solution
- [ ] Handle wraparound for boundary vertices
- [ ] Handle collinear points correctly
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 20 minutes

**Strategy**: See [Computational Geometry Fundamentals](../strategies/fundamentals/computational-geometry.md)
