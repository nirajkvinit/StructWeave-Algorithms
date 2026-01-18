---
id: M465
old_id: A325
slug: mirror-reflection
title: Mirror Reflection
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Mirror Reflection

## Problem

Imagine a perfectly square room where all four walls are mirrors. Three corners of the room have light receptors labeled 0, 1, and 2, while the fourth corner (the southwest corner at coordinates (0, 0)) has a laser source.

The room has side length `p` units. When the laser fires, it shoots eastward (toward the right wall) and hits the east wall at height `q` units above receptor 0.

Here's the layout:
- **Receptor 0**: Southeast corner at (p, 0)
- **Receptor 1**: Northeast corner at (p, p)
- **Receptor 2**: Northwest corner at (0, p)
- **Laser source**: Southwest corner at (0, 0)

The laser follows the law of reflection: when it hits a mirror, it bounces off at the same angle it came in. Given the room dimensions `p` and `q`, determine which receptor (0, 1, or 2) will be the first to receive the laser beam after all its reflections.

All test cases are guaranteed to have the laser eventually hit one of the receptors.


**Diagram:**

Mirror room layout and laser path:
```
Square room with side length p:

    2 +--------+ 1
      |        |
      |        |
    p |   ↗    |
      |  /     |
      | /      |
      |/       |
    0 +--------+ 0
      0        p

Receptor positions:
  - Receptor 0: Southeast corner (p, 0)
  - Receptor 1: Northeast corner (p, p)
  - Receptor 2: Northwest corner (0, p)
  - Laser source: Southwest corner (0, 0)

Example: p = 2, q = 1

Laser path with reflections:

    2 +--------+ 1
      |   ✱    |
      |  /|\   |
    1 | / | \  |
      |/  |  \ |
      |   |   \|
    0 +---●----+ 0
      0   1    2

Starting point: (0, 0)
Hits east wall at: (2, 1)
Reflects to west wall at: (0, 2)
Hits receptor 2 at northwest corner

Path trace:
  Start: (0, 0) → East
  Reflect at: (2, 1) → hits east wall
  Reflect to: (0, 2) → hits receptor 2

Result: receptor 2
```


## Why This Matters

This problem teaches you to transform complex simulations into simple mathematical patterns. Instead of tracking hundreds of reflections, you can solve it with number theory. This approach is fundamental in physics simulations (light ray tracing, particle bouncing), game development (projectile physics), and computer graphics (rendering reflections). The technique of "unfolding" the problem space - imagining infinite reflected copies instead of computing each bounce - is a powerful problem-solving strategy used in geometry, optics, and signal processing. It demonstrates how the right mathematical insight can reduce an O(n) simulation to an O(log n) calculation.

## Examples

**Example 1:**
- Input: `p = 3, q = 1`
- Output: `1`

## Constraints

- 1 <= q <= p <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of simulating reflections, think of "unfolding" the mirrors. Imagine extending the room infinitely by reflecting it horizontally and vertically. The laser travels in a straight line in this unfolded space. The receptor hit depends on where the line intersects a corner in the extended grid.
</details>

<details>
<summary>🎯 Main Approach</summary>
Find the least common multiple (LCM) or simulate: the laser reaches a receptor when both x and y coordinates align with corners. Mathematically, find the smallest multiple m where m*q is divisible by p. Check: if m*q/p is even, ray goes to east wall (receptor 0 or 1); if odd, west wall (receptor 2). If m is odd, top row (receptor 1 or 2); if even, bottom (receptor 0).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use GCD to simplify: divide both p and q by their GCD first. Then check parity: if p is even and q is odd, receptor 0; if both odd, receptor 1; if p is odd and q is even, receptor 2. This avoids LCM calculation entirely and gives O(log min(p,q)) time for GCD.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation | O(LCM(p,q)) | O(1) | Simulate each reflection - can be very slow |
| LCM Calculation | O(log min(p,q)) | O(1) | Find LCM, determine parity |
| GCD + Parity | O(log min(p,q)) | O(1) | Simplify with GCD, check parity directly |

## Common Mistakes

1. **Trying to simulate reflections**
   ```python
   # Wrong: Simulating each bounce (too slow for large p, q)
   x, y = 0, 0
   dx, dy = 1, 1
   while True:
       x += dx
       y += dy
       if x == p and y in [0, p]:
           # Check receptor
       # Handle reflections

   # Correct: Use mathematical approach
   def gcd(a, b):
       while b: a, b = b, a % b
       return a
   g = gcd(p, q)
   p, q = p // g, q // g
   if p % 2 == 0: return 2
   if q % 2 == 0: return 0
   return 1
   ```

2. **Incorrect receptor determination**
   ```python
   # Wrong: Not considering extended grid properly
   if x == p and y == p: return 1
   if x == p and y == 0: return 0
   if x == 0 and y == p: return 2

   # Correct: Use parity after GCD simplification
   # After reducing by GCD:
   # If p even: west wall (receptor 2)
   # If q even: east wall bottom (receptor 0)
   # If both odd: east wall top (receptor 1)
   ```

3. **Not simplifying with GCD**
   ```python
   # Wrong: Using raw p and q values
   lcm = (p * q) // gcd(p, q)
   # Then complex logic...

   # Correct: Simplify first
   g = gcd(p, q)
   p //= g
   q //= g
   # Now p and q are coprime, easier to analyze
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Projection Area of 3D Shapes | Easy | Simpler geometry, no reflections |
| Rectangle Overlap | Easy | Basic coordinate geometry |
| Number of Ways to Stay in Same Place | Hard | Different type of simulation with DP |
| Poor Pigs | Hard | Similar mathematical insight needed |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Mathematical Patterns](../../strategies/patterns/math.md)
