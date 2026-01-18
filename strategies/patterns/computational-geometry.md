---
title: "Computational Geometry"
category: patterns
difficulty: advanced
prerequisites: ["geometry-basics", "math"]
related_patterns: ["line-sweep", "divide-and-conquer"]
---

# Computational Geometry

## Quick Reference Card

| Aspect | Details |
|--------|---------|
| **Key Signal** | Problems involving points, lines, polygons, or spatial relationships |
| **Time Complexity** | O(n log n) for most algorithms using sorting/divide-conquer |
| **Space Complexity** | O(n) typically |
| **Common Variants** | Convex hull, line intersection, point in polygon |

## Mental Model

**Analogy:** Think of computational geometry like being an architect with a drafting table. You have tools (formulas) for measuring distances, finding intersections, and determining if shapes overlap. The key is knowing which tool to use for each problem.

**First Principle:** Most geometric problems reduce to understanding relationships between points using vectors, cross products, and dot products.

## Pattern Decision Tree

```mermaid
flowchart TD
    START[Geometry Problem?] --> TYPE{What type?}

    TYPE --> |Points only| POINTS{Operation?}
    TYPE --> |Lines/Segments| LINES{Operation?}
    TYPE --> |Polygons| POLY{Operation?}

    POINTS --> |Closest pair| DIVIDE[Divide & Conquer O(n log n)]
    POINTS --> |All pairs distance| BRUTE[O(n²) or spatial hashing]
    POINTS --> |Enclosing shape| HULL[Convex Hull]

    LINES --> |Intersection| SWEEP[Line Sweep]
    LINES --> |Segment intersection| CROSS[Cross Product Check]

    POLY --> |Point inside?| PIP[Point in Polygon]
    POLY --> |Area| SHOELACE[Shoelace Formula]
    POLY --> |Overlap| CLIP[Polygon Clipping]

    style HULL fill:#90EE90
    style SWEEP fill:#90EE90
    style CROSS fill:#90EE90
```

## Overview

Computational geometry deals with algorithms for solving geometric problems efficiently. Key building blocks include:

1. **Vector Operations**: Addition, subtraction, dot product, cross product
2. **Orientation Tests**: Determining if points are collinear or turn left/right
3. **Intersection Detection**: Finding where lines/segments meet
4. **Convex Hull**: Finding the smallest convex polygon containing all points

## Core Formulas

### Distance Between Points
```python
import math

def distance(p1, p2):
    """Euclidean distance between two points."""
    return math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)

def squared_distance(p1, p2):
    """Squared distance (faster, avoids sqrt)."""
    return (p2[0] - p1[0])**2 + (p2[1] - p1[1])**2
```

### Cross Product (2D)
```python
def cross_product(o, a, b):
    """
    Cross product of vectors OA and OB.
    Returns:
        > 0: Counter-clockwise turn (left)
        < 0: Clockwise turn (right)
        = 0: Collinear
    """
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
```

### Triangle Area
```python
def triangle_area(p1, p2, p3):
    """Area of triangle using cross product."""
    return abs(cross_product(p1, p2, p3)) / 2
```

### Polygon Area (Shoelace Formula)
```python
def polygon_area(vertices):
    """
    Area of polygon given vertices in order.
    Works for both convex and concave polygons.
    """
    n = len(vertices)
    area = 0
    for i in range(n):
        j = (i + 1) % n
        area += vertices[i][0] * vertices[j][1]
        area -= vertices[j][0] * vertices[i][1]
    return abs(area) / 2
```

## Template: Convex Hull (Graham Scan)

```python
def convex_hull(points):
    """
    Find convex hull using Graham Scan.
    Time: O(n log n)
    Space: O(n)
    """
    points = sorted(set(map(tuple, points)))
    if len(points) <= 1:
        return points

    # Build lower hull
    lower = []
    for p in points:
        while len(lower) >= 2 and cross_product(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    # Build upper hull
    upper = []
    for p in reversed(points):
        while len(upper) >= 2 and cross_product(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    return lower[:-1] + upper[:-1]
```

## Template: Point in Polygon

```python
def point_in_polygon(point, polygon):
    """
    Check if point is inside polygon using ray casting.
    Time: O(n) where n is number of vertices
    """
    x, y = point
    n = len(polygon)
    inside = False

    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]

        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i

    return inside
```

## Template: Line Segment Intersection

```python
def segments_intersect(p1, p2, p3, p4):
    """
    Check if line segment p1-p2 intersects with p3-p4.
    """
    d1 = cross_product(p3, p4, p1)
    d2 = cross_product(p3, p4, p2)
    d3 = cross_product(p1, p2, p3)
    d4 = cross_product(p1, p2, p4)

    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
       ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True

    # Check collinear cases
    if d1 == 0 and on_segment(p3, p4, p1): return True
    if d2 == 0 and on_segment(p3, p4, p2): return True
    if d3 == 0 and on_segment(p1, p2, p3): return True
    if d4 == 0 and on_segment(p1, p2, p4): return True

    return False

def on_segment(p, q, r):
    """Check if point r lies on segment p-q."""
    return (min(p[0], q[0]) <= r[0] <= max(p[0], q[0]) and
            min(p[1], q[1]) <= r[1] <= max(p[1], q[1]))
```

## Worked Example: Erect the Fence (Convex Hull)

**Problem:** Given trees as points, find minimum length of rope to enclose all trees.

**Solution:** This is the classic convex hull problem.

```python
def outer_trees(trees):
    # Sort by x, then by y
    points = sorted(trees, key=lambda p: (p[0], p[1]))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    # Build lower and upper hulls
    lower, upper = [], []

    for p in points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) < 0:
            lower.pop()
        lower.append(p)

    for p in reversed(points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) < 0:
            upper.pop()
        upper.append(p)

    # Remove duplicates and return
    return list(set(map(tuple, lower + upper)))
```

## Common Mistakes

1. **Floating Point Errors**: Use integer arithmetic or epsilon comparisons
2. **Forgetting Collinear Points**: Handle edge cases where points are on the same line
3. **Polygon Orientation**: Some algorithms require counter-clockwise vertex ordering
4. **Off-by-One in Loops**: When iterating polygon vertices cyclically

## Practice Progression

**Day 1 (Learn):**
- Study cross product and its geometric meaning
- Implement distance and area formulas

**Day 3 (Reinforce):**
- Solve: Convex Hull problem
- Solve: Valid Square (check if 4 points form square)

**Day 7 (Master):**
- Solve: Erect the Fence
- Solve: Max Points on a Line

## Related Patterns

| Pattern | When to Use Instead |
|---------|---------------------|
| Line Sweep | Multiple segments, finding all intersections |
| Divide & Conquer | Closest pair of points |
| Math | Simple distance/area calculations |

## Practice Problems

| Problem | Difficulty | Key Insight |
|---------|------------|-------------|
| Valid Square | Medium | Distance between all point pairs |
| Erect the Fence | Hard | Convex Hull with collinear points |
| Max Points on a Line | Hard | Count collinear points using slope |
| Minimum Area Rectangle | Medium | Use diagonals or hash set approach |
