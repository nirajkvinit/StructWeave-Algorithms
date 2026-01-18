---
id: M549
old_id: A440
slug: k-closest-points-to-origin
title: K Closest Points to Origin
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# K Closest Points to Origin

## Problem

Imagine you're developing a location-based app that needs to find the `k` nearest coffee shops to a user's current position. On a map (2D coordinate plane), you have an array of locations `points` where each `points[i] = [xi, yi]` represents a specific place.

Your task: Given an integer `k`, identify and return the `k` points closest to the origin `(0, 0)`.

**Distance calculation:** Use the standard Euclidean distance formula:
```
distance = √((x₁ - x₂)² + (y₁ - y₂)²)
```

For distance to the origin (0, 0), this simplifies to:
```
distance = √(x² + y²)
```

The answer can be returned in any order. The problem guarantees that there's always a unique set of `k` closest points (no ties at the boundary).


**Diagram:**

```
K Closest Points to Origin (0,0)

    Y
    |
  4 |     •(-2,4)
    |
  2 |
    |         •(3,3)
  0 |___•(0,0)________X
 -2 |
    |               •(5,-1)
 -4 |
    -2  0  2  4  6

Example: k = 2
Distances from origin:
- (3,3):   √(9+9) = √18 ≈ 4.24
- (-2,4):  √(4+16) = √20 ≈ 4.47
- (5,-1):  √(25+1) = √26 ≈ 5.10

Closest 2 points: [(3,3), (-2,4)]
```


## Why This Matters

Finding the k-nearest elements is one of the most common operations in modern software. Ride-sharing apps like Uber and Lyft use this exact algorithm to match you with nearby drivers in real-time. Recommendation engines (Netflix, Spotify, Amazon) find your k-nearest neighbors based on preference vectors to suggest similar content. In machine learning, the k-Nearest Neighbors (k-NN) algorithm is a fundamental classification technique used in fraud detection, image recognition, and natural language processing. Game development uses k-nearest queries for AI pathfinding (finding closest enemies) and collision detection. Geographic information systems (GIS) rely heavily on spatial proximity searches for mapping applications. Mastering efficient k-selection algorithms is essential for any system dealing with rankings, recommendations, or spatial data.

## Examples

**Example 1:**
- Input: `points = [[3,3],[5,-1],[-2,4]], k = 2`
- Output: `[[3,3],[-2,4]]`
- Explanation: Alternative orderings like [[-2,4],[3,3]] are equally valid.

## Constraints

- 1 <= k <= points.length <= 10⁴
- -10⁴ <= xi, yi <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
You don't need to calculate the actual square root for distance comparison - just use x² + y² since square root is monotonic (if a² < b² then a < b). This saves computation. The problem is essentially finding k smallest elements, which is a classic heap problem.
</details>

<details>
<summary>Main Approach</summary>
Use a max heap of size k. For each point, calculate its squared distance (x² + y²). If heap has fewer than k elements, add the point. If heap is full and current point's distance is smaller than the max in heap, remove the max and add current point. At the end, the heap contains the k closest points.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of maintaining a max heap of size k, you can use Python's heapq.nsmallest() or sort all points by distance and take first k (O(n log n)). For better average case, use QuickSelect algorithm (O(n) average, O(n²) worst). The max heap approach is O(n log k) which is optimal when k << n.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Sort All | O(n log n) | O(1) or O(n) | Sort by distance, take first k; simple but not optimal |
| Max Heap | O(n log k) | O(k) | Maintain heap of size k; optimal when k << n |
| QuickSelect | O(n) average | O(1) | Partition-based selection; best average case |
| Optimal | O(n log k) | O(k) | Max heap gives best worst-case guarantee |

## Common Mistakes

1. **Calculating unnecessary square roots**
   ```python
   # Wrong: Expensive square root calculation
   import math
   distance = math.sqrt(x*x + y*y)

   # Correct: Use squared distance for comparison
   distance = x*x + y*y
   ```

2. **Using min heap instead of max heap**
   ```python
   # Wrong: Min heap keeps k smallest distances but in wrong order
   import heapq
   heap = []
   for x, y in points:
       heapq.heappush(heap, (x*x + y*y, [x, y]))
       if len(heap) > k:
           heapq.heappop(heap)  # Removes smallest, not largest!

   # Correct: Use max heap (negate distances in Python)
   heap = []
   for x, y in points:
       dist = -(x*x + y*y)  # Negate for max heap
       if len(heap) < k:
           heapq.heappush(heap, (dist, [x, y]))
       elif dist > heap[0][0]:  # Current is closer than max
           heapq.heapreplace(heap, (dist, [x, y]))
   ```

3. **Not handling k = n edge case efficiently**
   ```python
   # Wrong: Still using heap when k = n
   if k == n:
       # Build heap unnecessarily

   # Correct: Short-circuit when k = n
   if k >= len(points):
       return points
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Kth Largest Element | Medium | Find kth largest instead of k smallest |
| Top K Frequent Elements | Medium | Frequency-based instead of distance |
| Find K Pairs with Smallest Sums | Medium | Pairs from two arrays with smallest sums |
| Closest Point to Query | Easy | Find single closest point to given point |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved (O(n log k))
- [ ] Clean, readable code
- [ ] Handled all edge cases (k=n, k=1, duplicate distances)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Heap](../../strategies/data-structures/heap.md)
