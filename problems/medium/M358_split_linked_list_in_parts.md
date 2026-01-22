---
id: M358
old_id: A192
slug: split-linked-list-in-parts
title: Split Linked List in Parts
difficulty: medium
category: medium
topics: ["array", "linked-list"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E021", "M002", "M143"]
prerequisites: ["linked-list-traversal", "basic-math"]
strategy_ref: ../prerequisites/linked-lists.md
---
# Split Linked List in Parts

## Problem

Given the head of a singly linked list and an integer `k`, split the linked list into `k` consecutive parts that are as equal in size as possible. Return an array of length `k` containing the head nodes of these parts.

The key requirements for the split:

**Equal distribution**: All parts should have nearly the same number of nodes. Specifically, if the list has `n` nodes, each part gets a base size of `n // k` nodes. Since `n` might not divide evenly by `k`, there will be `n % k` "extra" nodes that need to be distributed.

**Front-loading**: Distribute any extra nodes to the earlier parts. If there are `r` extra nodes (where `r = n % k`), the first `r` parts get one additional node each. This ensures that `part[0].length >= part[1].length >= ... >= part[k-1].length`, with sizes differing by at most 1.

**Null parts**: If `k > n` (more parts than nodes), the later parts will be `null` (empty linked lists). For example, splitting a 3-node list into 5 parts yields 3 single-node parts followed by 2 null parts.

**Severing connections**: You must physically break the original linked list into separate lists by setting the appropriate `next` pointers to `null`. Don't just return references to nodes in the original list—actually disconnect them.

**Diagram:**

Example 1: Split list [1,2,3] into k=5 parts
```
Original: 1 -> 2 -> 3

Result:
Part 1: 1
Part 2: 2
Part 3: 3
Part 4: null
Part 5: null
```

Example 2: Split list [1,2,3,4,5,6,7,8,9,10] into k=3 parts
```
Original: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

Result:
Part 1: 1 -> 2 -> 3 -> 4  (4 nodes - gets extra node)
Part 2: 5 -> 6 -> 7       (3 nodes)
Part 3: 8 -> 9 -> 10      (3 nodes)
```

The algorithm typically involves: (1) counting the total nodes to compute base size and remainder, (2) iterating through the list `k` times, each time extracting the appropriate number of nodes and severing the connection before the next part.

## Why This Matters

This problem teaches linked list manipulation fundamentals essential for memory management, load balancing systems, and distributed computing. Splitting data into equal chunks is exactly what MapReduce frameworks do when distributing work across servers, what database sharding systems use to partition data, and how multiprocessing libraries divide tasks among CPU cores. The skill of "walking a pointer N steps and severing" is also fundamental for implementing linked list operations like reversing segments, detecting cycles, and finding middle elements. Understanding how to distribute remainders fairly (front-loading) translates to fair scheduling algorithms in operating systems.

## Constraints

- The number of nodes in the list is in the range [0, 1000].
- 0 <= Node.val <= 1000
- 1 <= k <= 50

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the Distribution</summary>

First, count the total number of nodes in the list. Then use division and modulo to determine:
- Base size for each part: `length // k`
- How many parts get an extra node: `length % k`

The first `length % k` parts will have `(length // k) + 1` nodes, and the remaining parts will have `length // k` nodes (or be null if base size is 0).

</details>

<details>
<summary>Hint 2: Severing Connections</summary>

Traverse the list while keeping track of:
1. Current position in the list
2. Which part number you're building
3. How many nodes the current part should contain

For each part, advance the appropriate number of nodes, then sever the connection by setting the previous node's next pointer to null before starting the next part.

</details>

<details>
<summary>Hint 3: Handling Edge Cases</summary>

Consider these scenarios:
- When `k > length`, some parts will be null
- When `length == 0`, all parts are null
- Keep the head of each part before advancing
- Be careful not to lose references when severing connections

Store each part's head in the result array before moving to the next segment.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two-pass (count + split) | O(n) | O(k) | First pass counts nodes, second pass splits; result array needs k slots |
| Single-pass calculation | O(n) | O(k) | Calculate lengths mathematically, then traverse once to split |

Where n is the number of nodes in the linked list.

## Common Mistakes

**Mistake 1: Losing the head reference**
```python
# Wrong - loses the head of each part
current = head
for i in range(part_size):
    current = current.next
result[part_num] = current  # This is not the head!

# Correct - save the head before advancing
result[part_num] = current
for i in range(part_size - 1):
    current = current.next
```

**Mistake 2: Incorrect severing logic**
```python
# Wrong - disconnects at the wrong position
for i in range(part_size):
    prev = current
    current = current.next
prev.next = None  # May disconnect in the middle

# Correct - advance exactly part_size - 1 times, then sever
for i in range(part_size - 1):
    current = current.next
temp = current.next
current.next = None
current = temp
```

**Mistake 3: Not handling the remainder correctly**
```python
# Wrong - distributes remainder to the end
base_size = length // k
# All parts get base_size, then add remainder somehow

# Correct - first 'remainder' parts get one extra node
remainder = length % k
for i in range(k):
    part_size = base_size + (1 if i < remainder else 0)
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Split array into k parts | Use array slicing instead of pointer manipulation | Easy |
| Split with maximum part size | Given max size instead of k parts | Medium |
| Merge k sorted lists | Reverse operation - combine instead of split | Hard |
| Rotate list by k positions | Involves finding split point and reconnecting | Medium |

## Practice Checklist

- [ ] Solve with two-pass approach (count, then split)
- [ ] Test with edge cases: empty list, k > length, k == 1
- [ ] Verify remainder distribution (first parts get extra nodes)
- [ ] Test with k == length (each part has 1 node)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Implement without looking at solution
- [ ] Optimize to single-pass if possible
- [ ] Explain approach to someone else

**Strategy**: See [Array Pattern](../prerequisites/linked-lists.md)
