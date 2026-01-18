---
id: M258
old_id: A050
slug: brick-wall
title: Brick Wall
difficulty: medium
category: medium
topics: ["hash-table", "array"]
patterns: ["dp-2d", "greedy"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M001_add_two_numbers", "M262_subarray_sum_equals_k", "E001_two_sum"]
prerequisites: ["hash-table", "prefix-sum"]
---
# Brick Wall

## Problem

Imagine standing in front of a brick wall made of n rows, where each row contains bricks of varying widths but uniform height. All rows have identical total width. Your task is to draw a single vertical line from top to bottom that crosses the fewest bricks possible.

When the line passes exactly along an edge between two bricks, that doesn't count as crossing a brick. You cannot draw the line along either outer edge of the wall (the leftmost or rightmost border), as that would trivially cross zero bricks by going around the wall.

The wall is represented as a 2D array where each inner array contains the widths of bricks in that row. For example, [1,2,2,1] means a row with four bricks of widths 1, 2, 2, and 1 units respectively. The key insight is that you want to find a position where the maximum number of rows have brick edges aligned, because that minimizes the number of bricks your line must cut through.

Think of it as finding the most popular edge position across all rows. If many rows have edges at the same position, drawing your line there means it passes through edges instead of brick faces. Convert brick widths to cumulative positions (like prefix sums), count how often each position appears as an edge across all rows, and find the maximum frequency.

For instance, if position 4 is an edge in 5 out of 6 rows, drawing the line there crosses only 1 brick (the row without an edge at position 4). The answer is n minus the maximum edge frequency.

## Why This Matters

This problem teaches efficient counting with hash maps and demonstrates the prefix sum pattern in a spatial context. Similar algorithms power 2D range queries in databases, collision detection in graphics engines, and layout optimization in circuit design. The technique of converting widths to cumulative positions appears frequently when working with intervals, time series data, and geographic information systems. It's a common interview question because it combines multiple concepts (hash maps, prefix sums, greedy selection) in a visually intuitive problem that tests problem transformation skills.

## Examples

**Example 1:**
- Input: `wall = [[1],[1],[1]]`
- Output: `3`

## Constraints

- n == wall.length
- 1 <= n <= 10⁴
- 1 <= wall[i].length <= 10⁴
- 1 <= sum(wall[i].length) <= 2 * 10⁴
- sum(wall[i]) is the same for each row i.
- 1 <= wall[i][j] <= 2³¹ - 1

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Problem</summary>

The key insight is that we want to maximize the number of edges our line passes through, which means minimizing the number of bricks crossed. Instead of trying every position, count how many brick edges align at each position across all rows.

Think about converting from brick widths to cumulative positions. For a row like [1,2,2,1], the edges appear at positions 1, 3, and 5 (not 6, since that's the outer edge).
</details>

<details>
<summary>Hint 2: Hash Map Solution</summary>

Use a hash map to count the frequency of each edge position across all rows. For each row:
1. Calculate cumulative positions (prefix sums)
2. Store each position (except the final one) in the hash map
3. Track the maximum frequency

The answer is: total_rows - maximum_edge_frequency. This gives you the minimum bricks crossed.
</details>

<details>
<summary>Hint 3: Implementation Details</summary>

```python
# Pseudocode structure:
edge_count = {}
for each row in wall:
    position = 0
    for each brick in row (excluding the last):
        position += brick_width
        edge_count[position] += 1

max_edges = max(edge_count.values()) if edge_count else 0
return len(wall) - max_edges
```

Be careful to exclude the last brick in each row to avoid counting the outer wall edge.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Map (Optimal) | O(n * m) | O(n * m) | n = rows, m = avg bricks per row |
| Brute Force | O(n * m * w) | O(1) | w = total wall width; check every position |

## Common Mistakes

1. **Including the outer edge**
```python
# Wrong: Counting the final edge
for row in wall:
    pos = 0
    for brick in row:  # Should exclude last brick
        pos += brick
        edge_count[pos] += 1
```

2. **Not handling empty hash map**
```python
# Wrong: Crashes when all rows have single brick
max_edges = max(edge_count.values())  # KeyError if empty

# Correct: Handle empty case
max_edges = max(edge_count.values()) if edge_count else 0
```

3. **Forgetting to subtract from total rows**
```python
# Wrong: Returning max edges instead of min bricks crossed
return max(edge_count.values())

# Correct: Convert edges to bricks crossed
return len(wall) - max(edge_count.values())
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Horizontal Line | Medium | Find minimum bricks crossed by horizontal line |
| Multiple Lines | Hard | Draw k vertical lines minimizing total crossings |
| Weighted Bricks | Hard | Each brick has a cost; minimize total cost |
| 3D Wall | Hard | Extend to 3D cube structure |

## Practice Checklist

- [ ] Solve using hash map approach
- [ ] Handle edge case: single column wall
- [ ] Handle edge case: single brick per row
- [ ] Optimize space by processing one row at a time
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Implement horizontal line variation
- [ ] **Week 2**: Solve from memory in under 20 minutes

**Strategy**: See [Hash Table Patterns](../strategies/data-structures/hash-tables.md)
