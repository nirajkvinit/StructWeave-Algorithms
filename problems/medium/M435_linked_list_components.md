---
id: M435
old_id: A284
slug: linked-list-components
title: Linked List Components
difficulty: medium
category: medium
topics: ["array", "linked-list", "union-find"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/linked-lists.md
---
# Linked List Components

## Problem

Given a linked list with distinct integer values and a separate array `nums` containing some of those values, count how many connected components exist in the list.

A connected component is defined as a maximal sequence of consecutive nodes whose values all appear in the `nums` array. In other words, you're looking for continuous segments of the linked list where every node's value is present in `nums`, and these segments cannot be extended further without breaking this property.

For example, if your linked list is `0 → 1 → 2 → 3 → 4` and `nums = [0, 3, 1, 4]`, you have two components: `[0 → 1]` and `[3 → 4]`. The node with value 2 is not in `nums`, which breaks the first component. Even though nodes 0, 1, 3, and 4 are all in `nums`, they form two separate components because they're not consecutive in the linked list.

The key insight is recognizing when a component starts and ends. A component starts when you encounter a node in `nums` after seeing a node not in `nums` (or at the beginning). A component ends when you encounter a node not in `nums` after seeing a node in `nums` (or at the end of the list). You need to count these distinct maximal sequences efficiently without modifying the linked list structure.


**Diagram:**

```
Example 1: Count connected components

Linked List: 0 → 1 → 2 → 3 → 4
nums = [0, 3, 1, 4]

Components (consecutive nodes in nums):
   [0 → 1]    (component 1)
   [3 → 4]    (component 2)

Node 2 is not in nums, so it breaks the components
Answer: 2 components
```

```
Example 2: Count connected components

Linked List: 0 → 1 → 2 → 3
nums = [0, 1, 3]

Components (consecutive nodes in nums):
   [0 → 1]    (component 1)
   [3]        (component 2)

Node 2 breaks the first component
Answer: 2 components
```


## Why This Matters

Component counting in data structures appears in network analysis (finding connected user groups), data deduplication (identifying continuous blocks of valid records), and graph algorithms (connected components in graphs). This problem specifically teaches you the pattern of using sets for O(1) membership testing, which is crucial for optimizing many algorithms. It also demonstrates how to track state transitions in linear data structures, a technique used in text processing (finding word boundaries), time series analysis (identifying event sequences), and stream processing (detecting pattern runs).

## Constraints

- The number of nodes in the linked list is n.
- 1 <= n <= 10⁴
- 0 <= Node.val < n
- All the values Node.val are **unique**.
- 1 <= nums.length <= n
- 0 <= nums[i] < n
- All the values of nums are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Convert the nums array to a set for O(1) lookup. Traverse the linked list and count how many times you transition from a node in the set to a node not in the set (or reach the end). Each such transition marks the end of a component.
</details>

<details>
<summary>🎯 Main Approach</summary>
Create a set from nums for fast lookup. Walk through the linked list, tracking whether the current node is in the set. When you find a node in the set followed by a node not in the set (or the end of the list), increment the component count. This counts connected sequences.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The set conversion is O(m) where m is the length of nums, and the traversal is O(n). Total time is O(n + m) which is optimal. You can also think of it as counting "starts" of components - increment when a node is in the set but its previous node wasn't.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Set Lookup with Traversal | O(n + m) | O(m) | n = list length, m = nums length |
| Optimal | O(n + m) | O(m) | Single pass with set for lookups |

## Common Mistakes

1. **Counting nodes instead of components**
   ```python
   # Wrong: Counting how many nodes are in nums
   count = 0
   while head:
       if head.val in nums_set:
           count += 1
       head = head.next

   # Correct: Count transitions ending components
   count = 0
   while head:
       if head.val in nums_set and (not head.next or head.next.val not in nums_set):
           count += 1
       head = head.next
   ```

2. **Not using a set for O(1) lookup**
   ```python
   # Wrong: Using list with O(m) lookup
   while head:
       if head.val in nums:  # O(m) for each node
           # process

   # Correct: Convert to set first
   nums_set = set(nums)
   while head:
       if head.val in nums_set:  # O(1) lookup
   ```

3. **Complex state tracking instead of simple transition counting**
   ```python
   # Wrong: Maintaining complex state
   in_component = False
   for node in list:
       if node in set and not in_component:
           count += 1
           in_component = True
       elif node not in set:
           in_component = False

   # Correct: Count component ends directly
   while head:
       if head.val in nums_set and (not head.next or head.next.val not in nums_set):
           count += 1
       head = head.next
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of Connected Components in Graph | Medium | Graph instead of linked list |
| Number of Islands | Medium | 2D grid with component counting |
| Friend Circles | Medium | Adjacency matrix with Union-Find |
| Split Linked List in Parts | Medium | Partitioning instead of counting |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

**Strategy**: See [Linked Lists](../strategies/data-structures/linked-lists.md)
