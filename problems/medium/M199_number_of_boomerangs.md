---
id: M199
old_id: I246
slug: number-of-boomerangs
title: Number of Boomerangs
difficulty: medium
category: medium
topics: ["hash-table", "geometry"]
patterns: ["counting"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E001", "M149", "M356"]
prerequisites: ["hash-table", "distance-formula", "combinatorics"]
---
# Number of Boomerangs

## Problem

Given a collection of `n` unique points on a 2D plane where each point `points[i] = [xi, yi]` represents coordinates, count the total number of boomerangs you can form. A boomerang is defined as an ordered triple of point indices `(i, j, k)` where the distance from point `i` to point `j` equals the distance from point `i` to point `k`. Think of point `i` as the "center" that is equidistant from two other points `j` and `k`.

The critical detail is that order matters in the triple. The boomerang `(i, j, k)` is different from `(i, k, j)` because you're distinguishing between which point is "first" and which is "second" among the two equidistant points. For example, with three points `[0,0], [1,0], [2,0]` forming a horizontal line, point `[1,0]` is equidistant from both `[0,0]` and `[2,0]`. This creates two distinct boomerangs: `([1,0], [0,0], [2,0])` and `([1,0], [2,0], [0,0])`.

Your challenge is to efficiently count all such boomerangs without explicitly enumerating all possible triples, which would be too slow for large inputs. Think about edge cases like when all points are collinear (forming a line), when points form regular patterns like squares or circles, or when you have only one or two points (which cannot form any boomerangs).

## Why This Matters

This problem models geometric pattern recognition used in computer vision, wireless network topology analysis, and molecular chemistry. In computer vision, detecting sets of points with specific distance relationships helps identify shapes and features in images for object recognition and tracking systems. Wireless mesh networks use similar algorithms to find nodes equidistant from a central relay, optimizing signal routing and redundancy planning. The hash map grouping technique for counting by distance is fundamental to spatial indexing in geographic information systems (GIS), where you might need to find all landmarks equidistant from a city center or all sensors within equal range of a data collection point. Molecular modeling software uses distance-based grouping to identify symmetric molecular structures and predict chemical properties. The pattern of fixing one element and counting pairs among the remaining elements appears in social network analysis (finding mutual friends), recommendation systems (finding items with equal ratings), and any domain where you need to detect symmetric or balanced relationships in high-dimensional data.

## Examples

**Example 1:**
- Input: `points = [[0,0],[1,0],[2,0]]`
- Output: `2`
- Explanation: Two valid boomerangs exist: [[1,0],[0,0],[2,0]] and [[1,0],[2,0],[0,0]].

**Example 2:**
- Input: `points = [[1,1],[2,2],[3,3]]`
- Output: `2`

**Example 3:**
- Input: `points = [[1,1]]`
- Output: `0`

## Constraints

- n == points.length
- 1 <= n <= 500
- points[i].length == 2
- -10⁴ <= xi, yi <= 10⁴
- All the points are **unique**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding the Ordering</summary>

A boomerang is an ordered triple (i, j, k) where i is the "center" point equidistant from j and k. For a fixed center i, if there are m points at the same distance from i, they can form m * (m-1) boomerangs (choosing 2 points from m in order). The key insight is to fix each point as the center and count equidistant pairs.

</details>

<details>
<summary>🎯 Hint 2: Distance Calculation Strategy</summary>

You don't need to calculate the actual Euclidean distance using square roots. Use squared distance instead: dist² = (x₂-x₁)² + (y₂-y₁)². This avoids floating-point precision issues and is faster. For each center point, use a hash map to group other points by their squared distance from the center.

</details>

<details>
<summary>📝 Hint 3: Counting Algorithm</summary>

```
result = 0
For each point i as the center:
    Create a hash map: distance -> count

    For each other point j:
        dist = squared_distance(i, j)
        distance_map[dist] += 1

    For each distance d in distance_map:
        count = distance_map[d]
        result += count * (count - 1)  # Ordered pairs

Return result
```

The formula count * (count - 1) gives ordered pairs from count items.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (3 loops) | O(n³) | O(1) | Check every triple, calculate distances |
| Hash Map (optimal) | O(n²) | O(n) | Fix center, group by distance |
| Sort-based | O(n² log n) | O(n²) | Less efficient than hash map |

**Recommended approach:** Hash Map per center point (O(n²) time, O(n) space)

## Common Mistakes

### Mistake 1: Using actual distance with floating point
**Wrong:**
```python
import math

def numberOfBoomerangs(points):
    result = 0
    for i in range(len(points)):
        dist_map = {}
        for j in range(len(points)):
            if i != j:
                # Using square root introduces precision errors
                dist = math.sqrt((points[i][0] - points[j][0])**2 +
                                (points[i][1] - points[j][1])**2)
                dist_map[dist] = dist_map.get(dist, 0) + 1
```

**Correct:**
```python
def numberOfBoomerangs(points):
    result = 0
    for i in range(len(points)):
        dist_map = {}
        for j in range(len(points)):
            if i != j:
                # Use squared distance - exact integer comparison
                dist_sq = (points[i][0] - points[j][0])**2 + \
                         (points[i][1] - points[j][1])**2
                dist_map[dist_sq] = dist_map.get(dist_sq, 0) + 1

        for count in dist_map.values():
            result += count * (count - 1)

    return result
```

### Mistake 2: Counting unordered pairs
**Wrong:**
```python
# Using combinations instead of permutations
for count in dist_map.values():
    result += count * (count - 1) // 2  # Wrong: this counts unordered pairs
```

**Correct:**
```python
# Boomerangs are ordered: (i,j,k) != (i,k,j)
for count in dist_map.values():
    result += count * (count - 1)  # Correct: ordered pairs
```

### Mistake 3: Not clearing hash map between centers
**Wrong:**
```python
dist_map = {}  # Created once outside loop
for i in range(len(points)):
    for j in range(len(points)):
        # ... populate dist_map
    # Wrong: carries over from previous centers
```

**Correct:**
```python
for i in range(len(points)):
    dist_map = {}  # Fresh map for each center
    for j in range(len(points)):
        if i != j:
            dist_sq = (points[i][0] - points[j][0])**2 + \
                     (points[i][1] - points[j][1])**2
            dist_map[dist_sq] = dist_map.get(dist_sq, 0) + 1
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Number of Triangles | Medium | Count unordered triples with specific property |
| Valid Boomerang (check if valid) | Easy | Check if 3 points form valid boomerang |
| K-equidistant Points | Hard | Find k points equidistant from center |
| Closest Pair of Points | Medium | Find minimum distance pair |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Understood ordering vs unordered counting
- [ ] Implemented with squared distance
- [ ] Handled edge cases (1 point, 2 points, all collinear)
- [ ] Verified hash map clearing
- [ ] Tested with custom cases
- [ ] Reviewed after 1 day
- [ ] Reviewed after 1 week
- [ ] Could explain solution to others
- [ ] Comfortable with variations

**Strategy**: See [Hash Table Pattern](../prerequisites/hash-tables.md)
