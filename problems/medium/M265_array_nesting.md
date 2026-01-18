---
id: M265
old_id: A061
slug: array-nesting
title: Array Nesting
difficulty: medium
category: medium
topics: ["array", "graph", "cycle-detection"]
patterns: ["backtrack-permutation", "graph-cycle"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M142_linked_list_cycle_ii", "M287_find_the_duplicate_number", "M565_array_nesting"]
prerequisites: ["array-traversal", "cycle-detection", "graph-basics"]
---
# Array Nesting

## Problem

Given an integer array `nums` of length `n` containing a permutation of numbers from `0` to `n-1`, find the length of the longest possible nesting sequence you can construct.

A nesting sequence works by using array values as indices to jump to the next position. Starting at any index `k`, you build a sequence by following this chain: `nums[k]` → `nums[nums[k]]` → `nums[nums[nums[k]]]` → and so on. The sequence terminates when you encounter a value you've already visited, forming a cycle.

For example, if `nums = [5,4,0,3,1,6,2]` and you start at index 0, your sequence is: position 0 (value 5) → position 5 (value 6) → position 6 (value 2) → position 2 (value 0) → back to position 0. This creates a cycle of length 4: {5, 6, 2, 0}.

The key insight is that each element can only belong to one cycle since the array is a permutation (each value appears exactly once). This means once you've explored a cycle, you don't need to re-explore it from different starting points within that same cycle. Your goal is to find the length of the longest cycle across all possible starting positions.

## Why This Matters

Cycle detection in implicit graphs (where edges are defined by array values as indices) appears frequently in problems involving permutations, linked lists, and functional graphs. This exact pattern shows up in the "Find the Duplicate Number" problem and various linked list cycle problems. Understanding how to efficiently detect and measure cycles is valuable for detecting infinite loops in program analysis, finding repeating states in simulations, and analyzing state machines. The in-place marking technique you learn here is a space optimization strategy applicable to many graph traversal problems.

## Examples

**Example 1:**
- Input: `nums = [5,4,0,3,1,6,2]`
- Output: `4`
- Explanation: Starting from index 0, we trace: nums[0] = 5, nums[5] = 6, nums[6] = 2, nums[2] = 0. This creates a sequence of length 4: {5, 6, 2, 0}.

**Example 2:**
- Input: `nums = [0,1,2]`
- Output: `1`

## Constraints

- 1 <= nums.length <= 10⁵
- 0 <= nums[i] < nums.length
- All the values of nums are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Cycle Detection Insight</summary>

The key insight is that following the pattern `nums[nums[k]]` creates cycles. Since all values are unique and form a permutation, each element points to exactly one other element, forming disjoint cycles.

Think of the array as a graph where each index points to another index. You're looking for the longest cycle. Once you've traversed a cycle, you don't need to explore it again from a different starting point within that cycle - they'll all have the same length.
</details>

<details>
<summary>Hint 2: Marking Visited Elements</summary>

To avoid re-exploring cycles, mark visited elements. You can either:
1. Use a separate boolean array to track visited indices
2. Modify the array in-place (mark as visited with a special value like -1)

When starting from an index, follow the chain until you either:
- Hit a visited element (you've completed a cycle)
- Return to the starting element (completed a full cycle)

Both indicate the cycle length.
</details>

<details>
<summary>Hint 3: Optimal In-Place Solution</summary>

```python
# Pseudocode:
max_length = 0

for i in range(len(nums)):
    if nums[i] != -1:  # Not visited
        length = 0
        current = i

        # Follow the cycle
        while nums[current] != -1:
            next_idx = nums[current]
            nums[current] = -1  # Mark as visited
            current = next_idx
            length += 1

        max_length = max(max_length, length)

return max_length
```

Space complexity: O(1) by modifying the array. If you can't modify, use O(n) visited set.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| In-Place Marking | O(n) | O(1) | Each element visited exactly once |
| Visited Set | O(n) | O(n) | Cleaner if array can't be modified |
| Brute Force | O(n²) | O(n) | Try each starting point without marking |

## Common Mistakes

1. **Re-exploring the same cycle**
```python
# Wrong: Not marking visited, leading to redundant work
for i in range(len(nums)):
    current = i
    count = 0
    while True:  # Will revisit same cycles
        current = nums[current]
        count += 1
        if current == i:
            break
    max_len = max(max_len, count)

# Correct: Skip already visited indices
if nums[i] != -1:  # Check if not visited
    # ... explore and mark
```

2. **Incorrect cycle detection**
```python
# Wrong: Using index instead of value as next position
current = current + 1  # Wrong pattern
current = nums[current]  # Correct

# Wrong: Checking wrong termination condition
while current != 0:  # Wrong
while current != start_index:  # Correct for cycle
```

3. **Off-by-one in length counting**
```python
# Wrong: Not counting the starting element
length = 0
while nums[current] != -1:
    current = nums[current]
    length += 1  # Counts transitions, not elements

# Correct: Count elements properly
length = 0
while nums[current] != -1:
    next_idx = nums[current]
    nums[current] = -1
    current = next_idx
    length += 1  # Counts elements correctly
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Count All Cycles | Medium | Count total number of distinct cycles |
| Longest Cycle in Graph | Medium | General directed graph instead of permutation |
| K-Step Nesting | Hard | Follow k steps instead of single step (nums[nums[...k times]]) |
| Minimum Cycle Length | Easy | Find shortest cycle instead of longest |

## Practice Checklist

- [ ] Solve using in-place marking
- [ ] Solve using visited set (without modifying array)
- [ ] Handle edge case: array [0] (self-loop)
- [ ] Handle edge case: array [1, 0] (cycle of 2)
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Implement count all cycles variation
- [ ] **Week 2**: Solve from memory in under 20 minutes

**Strategy**: See [Cycle Detection Patterns](../strategies/patterns/cycle-detection.md)
