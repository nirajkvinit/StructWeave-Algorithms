---
title: "Math & Geometry Fundamentals"
category: patterns
difficulty: intermediate
prerequisites: ["basic-math"]
related_patterns: ["geometry", "computational-geometry"]
---

# Math & Geometry Fundamentals

## Quick Reference Card

| Aspect | Details |
|--------|---------|
| **Key Signal** | Distance, coordinates, shapes, spatial reasoning |
| **Time Complexity** | Usually O(1) to O(n) for basic calculations |
| **Space Complexity** | O(1) typically |
| **Common Variants** | Distance, area, angle, intersection |

## Mental Model

**Analogy:** Math-geometry problems are like having a toolkit of measuring instruments. Each formula is a specialized tool—you need to identify which measurement or relationship the problem is asking for, then apply the right formula.

**First Principle:** Most geometry problems can be solved by breaking shapes into simpler components (triangles, rectangles) and applying basic formulas.

## Overview

This guide covers fundamental math and geometry concepts frequently appearing in algorithm problems:

1. **Coordinate Geometry**: Points, lines, distances
2. **Shape Properties**: Areas, perimeters, angles
3. **Spatial Relationships**: Overlap, containment, intersection
4. **Grid-based Geometry**: Manhattan distance, grid traversal

## Essential Formulas

### Distance Formulas

```python
import math

# Euclidean Distance (straight line)
def euclidean_distance(p1, p2):
    return math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)

# Manhattan Distance (grid movement, no diagonals)
def manhattan_distance(p1, p2):
    return abs(p2[0] - p1[0]) + abs(p2[1] - p1[1])

# Chebyshev Distance (grid movement with diagonals)
def chebyshev_distance(p1, p2):
    return max(abs(p2[0] - p1[0]), abs(p2[1] - p1[1]))
```

### Area Formulas

```python
# Rectangle
def rectangle_area(width, height):
    return width * height

# Triangle (base and height)
def triangle_area_base_height(base, height):
    return 0.5 * base * height

# Triangle (three vertices using cross product)
def triangle_area_vertices(p1, p2, p3):
    return abs((p2[0] - p1[0]) * (p3[1] - p1[1]) -
               (p3[0] - p1[0]) * (p2[1] - p1[1])) / 2

# Circle
def circle_area(radius):
    return math.pi * radius * radius
```

### Line and Slope

```python
def slope(p1, p2):
    """Calculate slope between two points. Returns (dy, dx) to avoid division."""
    dy = p2[1] - p1[1]
    dx = p2[0] - p1[0]
    # Normalize by GCD for consistent representation
    g = math.gcd(abs(dy), abs(dx)) if dx != 0 or dy != 0 else 1
    return (dy // g, dx // g)

def collinear(p1, p2, p3):
    """Check if three points are on the same line."""
    return (p2[1] - p1[1]) * (p3[0] - p2[0]) == (p3[1] - p2[1]) * (p2[0] - p1[0])
```

## Common Problem Types

### 1. Rectangle Overlap

```python
def rectangles_overlap(r1, r2):
    """
    Check if two rectangles overlap.
    r1, r2 are [x1, y1, x2, y2] (bottom-left, top-right corners)
    """
    # No overlap if one is to the left, right, above, or below the other
    if r1[2] <= r2[0] or r2[2] <= r1[0]:  # One is to the left of other
        return False
    if r1[3] <= r2[1] or r2[3] <= r1[1]:  # One is above the other
        return False
    return True

def rectangle_intersection_area(r1, r2):
    """Calculate overlap area of two rectangles."""
    x_overlap = max(0, min(r1[2], r2[2]) - max(r1[0], r2[0]))
    y_overlap = max(0, min(r1[3], r2[3]) - max(r1[1], r2[1]))
    return x_overlap * y_overlap
```

### 2. Point to Line Distance

```python
def point_to_line_distance(point, line_p1, line_p2):
    """
    Shortest distance from point to line defined by two points.
    """
    x0, y0 = point
    x1, y1 = line_p1
    x2, y2 = line_p2

    numerator = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
    denominator = math.sqrt((y2 - y1)**2 + (x2 - x1)**2)

    return numerator / denominator if denominator != 0 else 0
```

### 3. Angle Calculations

```python
def angle_between_vectors(v1, v2):
    """Angle in radians between two vectors."""
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    mag1 = math.sqrt(v1[0]**2 + v1[1]**2)
    mag2 = math.sqrt(v2[0]**2 + v2[1]**2)

    if mag1 == 0 or mag2 == 0:
        return 0

    cos_angle = max(-1, min(1, dot / (mag1 * mag2)))  # Clamp for numerical stability
    return math.acos(cos_angle)
```

## Worked Example: Best Meeting Point

**Problem:** Given a grid with people's homes marked as 1, find the point that minimizes total Manhattan distance to all homes.

**Key Insight:** The optimal meeting point's x-coordinate is the median of all x-coordinates, and y-coordinate is the median of all y-coordinates.

```python
def min_total_distance(grid):
    rows = []
    cols = []

    # Collect all home positions
    for i in range(len(grid)):
        for j in range(len(grid[0])):
            if grid[i][j] == 1:
                rows.append(i)
                cols.append(j)

    # rows already sorted (collected row by row)
    cols.sort()

    # Find median
    median_row = rows[len(rows) // 2]
    median_col = cols[len(cols) // 2]

    # Calculate total distance
    total = 0
    for r in rows:
        total += abs(r - median_row)
    for c in cols:
        total += abs(c - median_col)

    return total
```

**Why median?** For 1D case, the point that minimizes sum of absolute differences is the median. This extends to 2D since x and y are independent for Manhattan distance.

## Common Mistakes

1. **Integer Overflow**: Large coordinates can overflow when squared
2. **Floating Point Precision**: Use integer math or epsilon comparisons
3. **Coordinate System Confusion**: Screen coordinates (y increases down) vs math (y increases up)
4. **Forgetting Edge Cases**: Zero-area shapes, collinear points

## Practice Progression

**Day 1 (Learn):**
- Implement all distance formulas
- Solve: Rectangle Overlap

**Day 3 (Reinforce):**
- Solve: Valid Square
- Solve: Rectangle Area problems

**Day 7 (Master):**
- Solve: Best Meeting Point
- Solve: Max Points on a Line

## Related Patterns

| Pattern | When to Use |
|---------|-------------|
| Computational Geometry | Complex polygon operations, convex hull |
| Line Sweep | Multiple intersecting segments |
| Binary Search | Finding optimal distance thresholds |

## Practice Problems

| Problem | Difficulty | Key Concept |
|---------|------------|-------------|
| Rectangle Overlap | Easy | Coordinate comparison |
| Rectangle Area | Medium | Inclusion-exclusion |
| Valid Square | Medium | Distance between all pairs |
| Best Meeting Point | Hard | Median minimizes Manhattan distance |
| Max Points on a Line | Hard | Slope representation, GCD |
