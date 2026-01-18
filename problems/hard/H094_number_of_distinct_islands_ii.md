---
id: H094
old_id: A178
slug: number-of-distinct-islands-ii
title: Number of Distinct Islands II
difficulty: hard
category: hard
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 45
---
# Number of Distinct Islands II

## Problem

You are provided with an `m x n` binary matrix `grid` where `1` represents land and `0` represents water. Islands are formed by land cells connected in the four cardinal directions (up, down, left, right). All grid boundaries are treated as water.

Two islands are considered identical if they share the same shape, either directly or after any combination of rotations (90°, 180°, or 270°) and reflections (horizontal or vertical).

Calculate and return the count of unique island shapes.


**Diagram:**

Example 1: These two islands are considered identical (can be rotated/reflected to match)
```
Island 1:        Island 2 (rotated 90°):
1 1              1 0
1 0              1 1
```

Example 2: Grid showing multiple distinct island shapes
```
Grid:
1 1 0 0 0
1 1 0 0 0
0 0 0 1 1
0 0 0 1 1

Two distinct islands:
- Island A: 2x2 square (top-left)
- Island B: 2x2 square (bottom-right)
Both are the same shape = 1 distinct island
```


## Why This Matters

2D arrays model grids, images, and spatial data. This problem develops your ability to navigate multi-dimensional structures.

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 50
- grid[i][j] is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Two islands are the same if one can be transformed into the other through rotations and reflections. Generate all 8 possible transformations (4 rotations × 2 reflections) of each island's shape, normalize them to a canonical form, and use the lexicographically smallest representation as the unique signature.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use DFS/BFS to find all islands and collect their cell coordinates. For each island, generate 8 transformations: rotate by 0°, 90°, 180°, 270° and reflect each. Normalize coordinates by translating to origin (subtract minimum x and y). Sort coordinates and convert to tuple for hashing. Store unique signatures in a set.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Normalize coordinates efficiently by sorting them and subtracting the first coordinate from all others. For rotations: (x,y) → (y,-x) for 90° clockwise. For reflection: (x,y) → (-x,y) for vertical flip. Choose the lexicographically smallest transformation as canonical form to ensure consistency.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(m²n²) | O(mn) | Compare each island pair directly |
| DFS + Transformations | O(mn · k) | O(mn) | k is average island size |
| Optimal | O(mn · k) | O(mn) | Single pass with 8 transformations |

## Common Mistakes

1. **Not generating all 8 transformations**
   ```python
   # Wrong: Only checking rotations, missing reflections
   def normalize(island):
       rotations = []
       for _ in range(4):
           island = rotate_90(island)
           rotations.append(island)
       return min(rotations)  # Missing reflections

   # Correct: Include both rotations and reflections
   def normalize(island):
       transformations = []
       for reflect in [False, True]:
           curr = reflect_if_needed(island, reflect)
           for _ in range(4):
               curr = rotate_90(curr)
               transformations.append(normalize_coords(curr))
       return min(transformations)
   ```

2. **Incorrect coordinate normalization**
   ```python
   # Wrong: Not translating to origin
   def normalize(coords):
       return tuple(sorted(coords))  # Doesn't handle offset

   # Correct: Translate to start at (0,0)
   def normalize(coords):
       coords = sorted(coords)
       min_x = min(x for x, y in coords)
       min_y = min(y for x, y in coords)
       return tuple((x - min_x, y - min_y) for x, y in coords)
   ```

3. **Wrong rotation formula**
   ```python
   # Wrong: Incorrect rotation transformation
   def rotate_90(x, y):
       return (-y, x)  # This is counter-clockwise

   # Correct: Clockwise 90° rotation
   def rotate_90(coords):
       return [(y, -x) for x, y in coords]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of Distinct Islands | Medium | No rotations/reflections allowed |
| Max Area of Island | Medium | Find largest island, ignore uniqueness |
| Making A Large Island | Hard | Add one cell to maximize island size |
| Surrounded Regions | Medium | Capture regions surrounded by opposite value |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (8 transformations, normalization)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graph Traversal](../../strategies/patterns/graph-traversal.md) | [DFS](../../strategies/patterns/depth-first-search.md)
