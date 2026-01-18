---
id: E147
old_id: I205
slug: queue-reconstruction-by-height
title: Queue Reconstruction by Height
difficulty: easy
category: easy
topics: ["array", "sorting", "greedy"]
patterns: ["greedy", "sorting"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M015", "E151", "M200"]
prerequisites: ["sorting", "array-manipulation", "greedy-algorithms"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Queue Reconstruction by Height

## Problem

You are given an array representing people standing in a queue, but the data is currently scrambled. Each person is described by a pair of integers: `[height, k]`. The height is the person's actual height, and k indicates how many people standing ahead of this person (earlier positions in the queue) have heights greater than or equal to theirs.

Your task is to reconstruct the correct queue order from this scrambled information. The challenge is that you must use the constraint information to deduce the original positions. For instance, if someone has `[7, 0]`, they must be positioned so that no one taller or equal height stands ahead of them. If someone has `[5, 2]`, exactly two people with heights 5 or greater must be positioned before them in the queue.

The key insight is deciding the order in which to place people. If you try to place shorter people first, their positions might be invalidated when you later insert taller people. The opposite strategy, placing taller people first, works because shorter people don't affect the counts for taller ones. Think about how sorting the input strategically, then using a greedy insertion approach based on the k values, can reconstruct the valid queue efficiently. Edge cases to consider include people with identical heights but different k values, which determines their relative ordering.

## Why This Matters

This problem combines greedy algorithms with clever sorting, demonstrating how preprocessing data in the right order can transform a complex problem into a straightforward insertion task. Greedy algorithms appear throughout computer science in scheduling (CPU task assignment, interval merging), compression (Huffman coding), graph algorithms (Dijkstra's, Prim's), and resource allocation. The pattern of "sort by one dimension, then greedily process using another dimension" appears in meeting room allocation, job sequencing with deadlines, and activity selection problems. This question is frequent in interviews because it tests your ability to recognize when a greedy approach works, how to prove correctness through invariants, and whether you can identify the optimal sorting strategy. Mastering this builds intuition for multi-criteria optimization problems where order of processing determines correctness.

## Examples

**Example 1:**
- Input: `people = [[7,0],[4,4],[7,1],[5,0],[6,1],[5,2]]`
- Output: `[[5,0],[7,0],[5,2],[6,1],[4,4],[7,1]]`
- Explanation: The person with height 5 and k=0 has nobody taller ahead.
The person with height 7 and k=0 also has nobody taller ahead.
The person with height 5 and k=2 has two taller/equal people ahead (the ones at positions 0 and 1).
The person with height 6 and k=1 has one taller/equal person ahead (position 1).
The person with height 4 and k=4 has four taller/equal people ahead (positions 0, 1, 2, and 3).
The person with height 7 and k=1 has one taller/equal person ahead (position 1).
This gives us the reconstructed queue: [[5,0],[7,0],[5,2],[6,1],[4,4],[7,1]].

**Example 2:**
- Input: `people = [[6,0],[5,0],[4,0],[3,2],[2,2],[1,4]]`
- Output: `[[4,0],[5,0],[2,2],[3,2],[1,4],[6,0]]`

## Constraints

- 1 <= people.length <= 2000
- 0 <= hi <= 10⁶
- 0 <= ki < people.length
- It is guaranteed that the queue can be reconstructed.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Sort and Insert by Position
Think about processing people in a specific order. If you place taller people first, then shorter people's positions won't affect the taller ones already placed. Sort people by height (descending), and when heights are equal, sort by k value (ascending). Then insert each person at their k-index position in the result array.

**Key insight**: Taller people should be placed first because they don't care about shorter people behind them.

### Intermediate Approach - Greedy Insertion
After sorting by height (tallest first) and k value (smallest first for same height), build the result by inserting each person at index k. This works because when you insert someone with height h at position k, there are already k people taller than or equal to h in the result.

**Key insight**: The k value directly tells you where to insert in the partially built result.

### Advanced Approach - Optimized with List Operations
Use the same sorting strategy but optimize insertion. In languages with efficient list insertion (like Python), directly insert at index k. For others, consider using a linked list or maintaining indices. The key optimization is recognizing that each insertion maintains the invariant that all previously inserted people are taller or equal.

**Key insight**: Greedy insertion works because taller people establish constraints that shorter people must satisfy.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sort + Array Insert | O(n²) | O(n) | Sorting O(n log n), n insertions each O(n) |
| Sort + List Insert | O(n²) | O(n) | List insertion is O(n) per operation |
| Sort + Linked List | O(n log n) | O(n) | Optimal with O(1) insertion in linked list |

The bottleneck is typically the insertion phase, not the sorting phase.

## Common Mistakes

### Mistake 1: Incorrect Sort Order
```python
# Wrong: Sorting by height ascending
def reconstructQueue(people):
    people.sort(key=lambda x: (x[0], x[1]))  # Ascending height
    result = []
    for p in people:
        result.insert(p[1], p)
    return result
```

**Why it fails**: Inserting shorter people first breaks the invariant. When you insert `[4,4]` before `[7,0]`, the count becomes incorrect.

**Fix**: Sort by height descending, then by k ascending: `people.sort(key=lambda x: (-x[0], x[1]))`.

### Mistake 2: Direct Array Assignment Instead of Insertion
```python
# Wrong: Assigning directly without shifting
def reconstructQueue(people):
    people.sort(key=lambda x: (-x[0], x[1]))
    result = [None] * len(people)
    for p in people:
        result[p[1]] = p  # Overwrites instead of inserting
    return result
```

**Why it fails**: Doesn't shift existing elements, leading to overwrites and missing entries.

**Fix**: Use proper insertion that shifts elements: `result.insert(p[1], p)` or maintain correct indices.

### Mistake 3: Not Handling Equal Heights Correctly
```python
# Wrong: Only sorting by height
def reconstructQueue(people):
    people.sort(key=lambda x: -x[0])  # Missing secondary sort
    result = []
    for p in people:
        result.insert(p[1], p)
    return result
```

**Why it fails**: When people have the same height, the order matters. Person with smaller k should be processed first.

**Fix**: Add secondary sort by k: `people.sort(key=lambda x: (-x[0], x[1]))`.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Queue with Width Constraint | Medium | Each person also has width, reconstruct considering 2D space |
| Minimum Swaps to Reconstruct | Medium | Find minimum adjacent swaps to fix a scrambled queue |
| Circular Queue Reconstruction | Hard | Reconstruct when the queue is circular (no front/back) |
| K Closest People | Medium | Find k people closest to a given height in the queue |
| Weighted Queue Reconstruction | Hard | People have weights affecting their position constraints |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Solve with sort and insert approach (30 min)
- [ ] **Day 1**: Review edge cases (all same height, already sorted, reverse sorted)
- [ ] **Day 3**: Implement without looking at previous solution (20 min)
- [ ] **Day 7**: Explain why greedy approach works to someone else (15 min)
- [ ] **Day 14**: Optimize insertion with different data structures (25 min)
- [ ] **Day 30**: Speed solve in under 15 minutes

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
