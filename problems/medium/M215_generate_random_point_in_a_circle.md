---
id: M215
old_id: I277
slug: generate-random-point-in-a-circle
title: Generate Random Point in a Circle
difficulty: medium
category: medium
topics: ["geometry", "probability", "math"]
patterns: ["randomization"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M478", "M497", "M528"]
prerequisites: ["probability", "uniform-distribution", "polar-coordinates", "rejection-sampling"]
---
# Generate Random Point in a Circle

## Problem

Design a class that generates uniformly distributed random points within a circle. "Uniformly distributed" means every location inside the circle has equal probability density - points should not cluster more in any particular region.

Implement the `Solution` class with these methods:

- `Solution(double radius, double x_center, double y_center)` - Constructor that initializes the circle with the given radius and center coordinates.
- `randPoint()` - Generates and returns a random point `[x, y]` within the circle (including the boundary).

The critical challenge here is understanding what "uniform distribution" means for circles. A naive approach might choose a random radius r between 0 and R, and a random angle θ between 0 and 2π, then convert to Cartesian coordinates. However, this produces a non-uniform distribution where points cluster near the center. Why? Because smaller circles have less area, so picking radius linearly gives more density to inner regions.

To achieve true uniformity, you must account for the fact that area grows proportionally to r² (the area of a circle is πr²). This requires a mathematical adjustment to how you select the radius. Alternatively, you could use rejection sampling - generate random points in a bounding square and reject those outside the circle - though this is less efficient.

The circle can be quite large (radius up to 10^8) and positioned anywhere (center coordinates from -10^7 to 10^7), with up to 30,000 calls to `randPoint()`, so efficiency matters.

## Why This Matters

Random point generation in geometric shapes is essential for Monte Carlo simulations, computer graphics (texture mapping, particle systems), game development (spawning objects in zones), and scientific modeling (molecular dynamics, astronomy). This problem reveals a subtle but crucial concept: generating random variables with non-uniform probability distributions. The square root transformation used here is an example of inverse transform sampling, a fundamental technique in computational statistics. Similar problems arise when sampling from triangles, polygons, spheres, or arbitrary probability distributions - understanding the area-based correction principle helps you tackle all of them correctly.

## Constraints

- 0 < radius <= 10⁸
- -10⁷ <= x_center, y_center <= 10⁷
- At most 3 * 10⁴ calls will be made to randPoint.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Naive Approach Fails</summary>

The naive approach of choosing random radius r (0 to R) and random angle θ (0 to 2π) does NOT give uniform distribution. Points near the center would be more dense because smaller circles have less area. The key insight: area grows with r², so you need to compensate for this.

</details>

<details>
<summary>🎯 Hint 2: Square Root for Uniform Distribution</summary>

To get uniform distribution, use r = R × sqrt(random()), where random() returns a value in [0, 1]. This compensates for the area scaling. Then choose a random angle θ uniformly from [0, 2π]. Convert polar coordinates (r, θ) to Cartesian: x = x_center + r × cos(θ), y = y_center + r × sin(θ).

</details>

<details>
<summary>📝 Hint 3: Implementation Approaches</summary>

**Approach 1: Polar coordinates with sqrt**
```
import random
import math

class Solution:
    def __init__(self, radius, x_center, y_center):
        self.radius = radius
        self.x_center = x_center
        self.y_center = y_center

    def randPoint(self):
        # Random angle [0, 2π)
        theta = random.uniform(0, 2 * math.pi)
        # Random radius with sqrt for uniform area distribution
        r = self.radius * math.sqrt(random.random())

        # Convert to Cartesian
        x = self.x_center + r * math.cos(theta)
        y = self.y_center + r * math.sin(theta)
        return [x, y]
```

**Approach 2: Rejection sampling**
```
class Solution:
    def __init__(self, radius, x_center, y_center):
        self.radius = radius
        self.x_center = x_center
        self.y_center = y_center

    def randPoint(self):
        while True:
            # Generate point in bounding square
            x = random.uniform(-self.radius, self.radius)
            y = random.uniform(-self.radius, self.radius)

            # Accept if inside circle
            if x*x + y*y <= self.radius * self.radius:
                return [self.x_center + x, self.y_center + y]
```

Rejection sampling is simpler but less efficient (~78.5% acceptance rate).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive Polar (Wrong!) | O(1) | O(1) | NOT uniform, points cluster near center |
| Polar with sqrt | O(1) | O(1) | Correct uniform distribution |
| Rejection Sampling | O(1) expected | O(1) | ~1.27 iterations on average (4/π) |

## Common Mistakes

**Mistake 1: Linear Radius Selection**

```python
# Wrong: Points cluster near center (NOT uniform!)
def randPoint(self):
    r = random.uniform(0, self.radius)  # Wrong!
    theta = random.uniform(0, 2 * math.pi)
    x = self.x_center + r * math.cos(theta)
    y = self.y_center + r * math.sin(theta)
    return [x, y]
```

```python
# Correct: Use sqrt for uniform area distribution
def randPoint(self):
    r = self.radius * math.sqrt(random.random())
    theta = random.uniform(0, 2 * math.pi)
    x = self.x_center + r * math.cos(theta)
    y = self.y_center + r * math.sin(theta)
    return [x, y]
```

**Mistake 2: Wrong Rejection Condition**

```python
# Wrong: Checks r instead of x²+y²
def randPoint(self):
    while True:
        x = random.uniform(-self.radius, self.radius)
        y = random.uniform(-self.radius, self.radius)
        r = math.sqrt(x*x + y*y)
        if r <= self.radius:  # This is always true! Wrong logic
            return [x, y]
```

```python
# Correct: Check distance from origin
def randPoint(self):
    while True:
        x = random.uniform(-self.radius, self.radius)
        y = random.uniform(-self.radius, self.radius)
        if x*x + y*y <= self.radius * self.radius:
            return [self.x_center + x, self.y_center + y]
```

**Mistake 3: Forgetting Center Offset**

```python
# Wrong: Returns coordinates relative to origin
def randPoint(self):
    r = self.radius * math.sqrt(random.random())
    theta = random.uniform(0, 2 * math.pi)
    x = r * math.cos(theta)  # Missing center offset!
    y = r * math.sin(theta)
    return [x, y]
```

```python
# Correct: Add center coordinates
def randPoint(self):
    r = self.radius * math.sqrt(random.random())
    theta = random.uniform(0, 2 * math.pi)
    x = self.x_center + r * math.cos(theta)
    y = self.y_center + r * math.sin(theta)
    return [x, y]
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| Ellipse | Generate points in ellipse | Scale x and y by different radii |
| Annulus (Ring) | Points between two radii | Use sqrt(random() × (R2²-R1²) + R1²) |
| Triangle | Uniform points in triangle | Use barycentric coordinates |
| Polygon | Arbitrary polygon | Triangulate, then weighted triangle selection |
| Sphere (3D) | Points on or in sphere surface | Use spherical coordinates with appropriate scaling |
| Exclude Center | No points within inner radius | Similar to annulus |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [Probability and Randomization](../strategies/fundamentals/probability.md) and [Geometry](../strategies/fundamentals/geometry.md)
