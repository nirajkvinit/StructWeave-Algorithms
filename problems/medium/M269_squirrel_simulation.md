---
id: M269
old_id: A066
slug: squirrel-simulation
title: Squirrel Simulation
difficulty: medium
category: medium
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E001", "M062", "M064"]
prerequisites: ["manhattan-distance", "greedy-algorithms"]
---
# Squirrel Simulation

## Problem

Imagine a rectangular garden grid with dimensions `height x width` where a squirrel must collect all nuts and bring them to a tree. The garden contains: a tree at position `tree = [treer, treec]`, a squirrel starting at position `squirrel = [squirrelr, squirrelc]`, and multiple nuts where each `nuts[i] = [nutir, nutic]` represents the location of the ith nut.

The squirrel operates under these rules: it can only carry one nut at a time, must return each nut to the tree before collecting the next one, and moves via Manhattan distance (only up, down, left, right between adjacent cells - no diagonal movement). Each move to an adjacent cell counts as one unit of distance.

Here's the key insight: after the squirrel picks up the first nut, every subsequent trip follows an identical pattern - start at the tree, go to a nut, return to the tree. The distance for these trips is always `2 × manhattan_distance(tree, nut)`. The only special case is the very first nut, where the squirrel starts from its initial position instead of the tree.

Your task is to determine which nut should be collected first to minimize the total distance traveled. The order of collecting the remaining nuts doesn't matter since they all start from the tree. This transforms what seems like a complex optimization problem into a simple greedy choice.

**Diagram:**

```
Example 1:
Input: height = 5, width = 7, tree = [2,2], squirrel = [4,4], nuts = [[3,0], [2,5]]

Grid (5 rows x 7 cols):
   0 1 2 3 4 5 6
0  . . . . . . .
1  . . . . . . .
2  . . T . . N .
3  N . . . . . .
4  . . . . S . .

T = Tree at [2,2]
S = Squirrel at [4,4]
N = Nuts at [3,0] and [2,5]

Output: 12
```

```
Example 2:
Input: height = 1, width = 3, tree = [0,1], squirrel = [0,0], nuts = [[0,2]]

Grid (1 row x 3 cols):
   0 1 2
0  S T N

T = Tree at [0,1]
S = Squirrel at [0,0]
N = Nut at [0,2]

Output: 3
```


## Why This Matters

This problem teaches greedy algorithm optimization where local choices lead to global optimality - a principle used in scheduling algorithms, resource allocation, and routing problems. The insight that "only the first choice matters" appears in many real-world scenarios: cache warming strategies (which data to load first), delivery route optimization (first stop selection), and task scheduling (breaking ties in priority queues). Understanding Manhattan distance is crucial for grid-based pathfinding in robotics, video games, and warehouse automation systems. The mathematical transformation from seemingly complex optimization to simple difference calculation demonstrates how reframing problems can reveal elegant solutions.

## Constraints

- 1 <= height, width <= 100
- tree.length == 2
- squirrel.length == 2
- 1 <= nuts.length <= 5000
- nuts[i].length == 2
- 0 <= treer, squirrelr, nutir <= height
- 0 <= treec, squirrelc, nutic <= width

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Pattern</summary>

After the squirrel picks up the first nut, every subsequent trip follows the same pattern:
- Start at tree
- Go to nut location
- Return to tree

For nuts 2 through N, the distance is always: `2 × distance(tree, nut)`

The only special case is the FIRST nut, where the squirrel starts at its initial position, not at the tree. This is the key insight to optimize the solution.
</details>

<details>
<summary>Hint 2: Mathematical Formula</summary>

The total distance can be expressed as:
```
Total = (Sum of all round trips from tree to each nut) + (Adjustment for first nut)
```

Where:
- Round trip distance for nut i = 2 × manhattan_distance(tree, nut[i])
- Adjustment for first nut = manhattan_distance(squirrel, first_nut) - manhattan_distance(tree, first_nut)

The key question: Which nut should be picked first to minimize the total distance?
</details>

<details>
<summary>Hint 3: Complete Solution Strategy</summary>

1. Calculate the base cost: sum of all round trips from tree to each nut (2 × distance for each)

2. For the first nut picked, we save one tree-to-nut trip but add one squirrel-to-nut trip:
   - Savings = distance(tree, nut) - distance(squirrel, nut)
   - We want to MAXIMIZE this savings (or minimize the cost)

3. Algorithm:
   ```
   total_distance = 0
   max_savings = -infinity

   for each nut:
       tree_to_nut = manhattan_distance(tree, nut)
       squirrel_to_nut = manhattan_distance(squirrel, nut)
       total_distance += 2 * tree_to_nut
       savings = tree_to_nut - squirrel_to_nut
       max_savings = max(max_savings, savings)

   return total_distance - max_savings
   ```

Manhattan distance: `|x1 - x2| + |y1 - y2|`
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy Selection | O(n) | O(1) | n = number of nuts; single pass to find optimal first nut |
| Brute Force | O(n²) | O(1) | Try each nut as first choice; unnecessary |

## Common Mistakes

### Mistake 1: Trying to optimize all nut orderings
```python
# WRONG: Attempting to try all permutations
def minDistance(height, width, tree, squirrel, nuts):
    from itertools import permutations
    min_dist = float('inf')
    # This is O(n!) - way too slow!
    for perm in permutations(nuts):
        dist = calculate_total_distance(tree, squirrel, perm)
        min_dist = min(min_dist, dist)
    return min_dist
```
**Why it's wrong:** After picking the first nut, the order doesn't matter since all trips start from the tree. You only need to choose which nut to pick FIRST, not order all nuts.

### Mistake 2: Incorrect distance calculation
```python
# WRONG: Using Euclidean distance instead of Manhattan
def distance(p1, p2):
    return ((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)**0.5  # Wrong!

# CORRECT: Manhattan distance
def distance(p1, p2):
    return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1])
```
**Why it's wrong:** The squirrel moves in 4 directions (up/down/left/right), not diagonally. Manhattan distance is required, not Euclidean.

### Mistake 3: Not considering all nuts as first choice
```python
# WRONG: Always picking closest nut to squirrel
def minDistance(height, width, tree, squirrel, nuts):
    total = 0
    first_nut = min(nuts, key=lambda n: distance(squirrel, n))
    # This greedy choice is incorrect!
    # Should consider savings, not absolute distance
```
**Why it's wrong:** The closest nut to the squirrel might not minimize total distance. You need to maximize the SAVINGS (difference between tree-to-nut and squirrel-to-nut distances).

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Robot Room Cleaner | Hard | Grid traversal with unknown boundaries |
| Minimum Path Sum | Medium | Find minimum cost path in grid with weights |
| Shortest Path to Get All Keys | Hard | Multiple items to collect with dependencies |
| Cherry Pickup | Hard | Optimal path to collect items in grid |

## Practice Checklist

- [ ] Solve with greedy approach (Day 1)
- [ ] Verify Manhattan distance calculation (Day 1)
- [ ] Handle edge case: single nut (Day 2)
- [ ] Optimize code for readability (Day 3)
- [ ] Review after 1 week (Day 8)
- [ ] Review after 2 weeks (Day 15)
- [ ] Solve without looking at hints (Day 30)
