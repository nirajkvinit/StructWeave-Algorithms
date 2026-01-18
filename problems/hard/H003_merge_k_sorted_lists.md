---
id: H003
old_id: F023
slug: merge-k-sorted-lists
title: Merge k Sorted Lists
difficulty: hard
category: hard
topics: ["linked-list", "heap", "divide-and-conquer", "priority-queue"]
patterns: ["k-way-merge", "divide-and-conquer", "heap-based-optimization"]
estimated_time_minutes: 45
frequency: high
related_problems: ["E021", "M148", "M373", "H378"]
prerequisites: ["linked-list-basics", "heap-operations", "merge-two-lists"]
strategy_ref: ../strategies/patterns/k-way-merge.md
---
# Merge k Sorted Lists

## Problem

Given an array of `k` sorted linked lists, merge all the linked lists into one sorted linked list and return it.

Each individual list is sorted in ascending order. Your task is to efficiently combine them into a single sorted list.

```
Visualization:
List 1: 1 -> 4 -> 5
List 2: 1 -> 3 -> 4
List 3: 2 -> 6

Step-by-step merge:
Pick smallest: 1 (from List 1 or List 2)
Pick next smallest: 1 (from the other list)
Pick next smallest: 2 (from List 3)
...

Result: 1 -> 1 -> 2 -> 3 -> 4 -> 4 -> 5 -> 6
```

## Why This Matters

This is a foundational **K-way Merge** problem that appears in:
- **Distributed systems**: Merging sorted results from multiple servers/shards
- **External sorting**: Merge phase of merge sort on disk-based data
- **Database query processing**: Combining sorted index scans
- **Log aggregation**: Merging timestamped logs from multiple sources

**Why it's Hard:**
- Naive approaches scale poorly with k (number of lists)
- Requires choosing optimal data structure (heap vs divide-and-conquer)
- Edge cases: empty lists, single element lists, varying lengths

## Examples

**Example 1:**
- Input: `lists = [[1,4,5],[1,3,4],[2,6]]`
- Output: `[1,1,2,3,4,4,5,6]`
- Explanation: The linked-lists are:
[
  1->4->5,
  1->3->4,
  2->6
]
merging them into one sorted list:
1->1->2->3->4->4->5->6

**Example 2:**
- Input: `lists = []`
- Output: `[]`
- Explanation: No lists to merge

**Example 3:**
- Input: `lists = [[]]`
- Output: `[]`
- Explanation: Array contains one empty list

**Example 4:**
- Input: `lists = [[1],[1,3,4],[2,6]]`
- Output: `[1,1,2,3,4,6]`
- Explanation: Mixed list lengths

## Constraints

- k == lists.length
- 0 <= k <= 10⁴
- 0 <= lists[i].length <= 500
- -10⁴ <= lists[i][j] <= 10⁴
- lists[i] is sorted in **ascending order**.
- The sum of lists[i].length will not exceed 10⁴.

## Think About

1. If you merge lists pairwise sequentially, what's the total work done?
2. How does a min-heap help when choosing the next smallest element across k lists?
3. What's the relationship between this and merge sort's merge phase?
4. Can divide-and-conquer improve the pairwise merge approach?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding the bottleneck</summary>

Consider different approaches and their bottlenecks:

**Brute force: Merge lists one by one**
- Merge list[0] with list[1] → result1
- Merge result1 with list[2] → result2
- Continue until all merged

**Problem:** If each list has average N nodes:
- First merge: N + N = 2N work
- Second merge: 2N + N = 3N work
- Third merge: 3N + N = 4N work
- Total: N + 2N + 3N + ... + kN = O(k²N)

**Key insight:** We're re-processing elements multiple times!

**Better question:** At each step, what's the single smallest element across all k lists?
- This suggests we need efficient "minimum finding" across k sources
- What data structure gives O(log k) min-extraction?

</details>

<details>
<summary>🎯 Hint 2: Three approaches with trade-offs</summary>

### Approach 1: Brute Force (Sequential Merging)
```
result = lists[0]
for i = 1 to k-1:
    result = mergeTwoLists(result, lists[i])
```
- Time: O(k²N) where N = average list length
- Space: O(1) extra (excluding result)
- Simple but inefficient for large k

### Approach 2: Min-Heap (Priority Queue)
```
heap = min-heap with (value, list_index, node)
Initialize heap with head of each list

while heap not empty:
    Extract min (smallest value)
    Add to result
    If extracted node has next, add next to heap
```
- Time: O(Nk log k) - each of Nk nodes has log k heap operation
- Space: O(k) for heap
- Optimal for streaming/large k

### Approach 3: Divide and Conquer
```
Pair up lists and merge in rounds:
Round 1: Merge (0,1), (2,3), (4,5), ... → k/2 lists
Round 2: Merge (0,1), (2,3), ... → k/4 lists
...
Until 1 list remains
```
- Time: O(Nk log k) - log k rounds, each processes all Nk nodes
- Space: O(1) extra (or O(log k) recursion stack)
- Best for batch processing

**Which to choose?**
- Heap: Best for interviews (demonstrates data structure knowledge)
- Divide & Conquer: Best if lists come all at once
- Sequential: Only if k is very small (k ≤ 3)

</details>

<details>
<summary>📝 Hint 3: Min-Heap implementation details</summary>

```
Define ListNode:
    val, next

function mergeKLists(lists):
    # Edge case: empty input
    if lists is empty or all lists are null:
        return null

    # Min-heap: stores (node.val, list_index, node)
    heap = MinHeap()

    # Initialize heap with head of each non-empty list
    for i = 0 to k-1:
        if lists[i] is not null:
            heap.push((lists[i].val, i, lists[i]))

    # Build result list
    dummy = ListNode(0)
    current = dummy

    while heap is not empty:
        val, list_idx, node = heap.pop()

        # Add to result
        current.next = node
        current = current.next

        # Add next node from same list to heap
        if node.next is not null:
            heap.push((node.next.val, list_idx, node.next))

    return dummy.next
```

**Key edge cases:**
- Empty lists array: return null
- Some lists empty, some not: skip nulls during initialization
- Single list: heap will just extract all nodes from that list
- All lists have same values: heap handles duplicates naturally

**Why include list_index?**
- Helps with heap tie-breaking (some languages require stable comparison)
- Useful for debugging which list a node came from

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Sequential pairwise merge | O(k²N) | O(1) | Inefficient, re-processes nodes |
| Brute force (collect + sort) | O(Nk log(Nk)) | O(Nk) | Loses linked list structure |
| **Min-Heap (Priority Queue)** | **O(Nk log k)** | **O(k)** | Optimal, heap size = k |
| Divide and Conquer | O(Nk log k) | O(1) or O(log k) | Iterative O(1), recursive O(log k) |

**Where N = average nodes per list, k = number of lists**

**Why Min-Heap is often preferred:**
- O(Nk log k) matches divide-and-conquer time complexity
- O(k) space is minimal (only k nodes in heap at once)
- Handles streaming lists (don't need all lists upfront)
- Demonstrates understanding of heaps in interviews

**Divide-and-conquer wins when:**
- All lists available upfront
- Want to minimize space (iterative implementation)
- k is a power of 2 (clean recursion)

---

## Common Mistakes

### 1. Using O(k) scan instead of heap
```python
# WRONG: Linear scan to find min among k lists
while any list has nodes:
    min_val = infinity
    min_idx = -1
    for i in range(k):
        if lists[i] and lists[i].val < min_val:
            min_val = lists[i].val
            min_idx = i
    # Add lists[min_idx] to result
    # Time: O(Nk²) - disaster for large k!

# CORRECT: Use heap
import heapq
heap = [(lists[i].val, i, lists[i]) for i in range(k) if lists[i]]
heapq.heapify(heap)
while heap:
    val, idx, node = heapq.heappop(heap)
    # ... process and add next
```

### 2. Not handling empty lists
```python
# WRONG: Crashes on null list heads
for i in range(len(lists)):
    heap.push((lists[i].val, i, lists[i]))  # NPE if lists[i] is null!

# CORRECT: Filter out nulls
for i in range(len(lists)):
    if lists[i] is not None:
        heap.push((lists[i].val, i, lists[i]))
```

### 3. Forgetting to advance list pointer
```python
# WRONG: Infinite loop - always adding same node
val, idx, node = heappop(heap)
current.next = node
heappush(heap, (node.val, idx, node))  # Same node again!

# CORRECT: Add next node
if node.next:
    heappush(heap, (node.next.val, idx, node.next))
```

### 4. Sequential merge inefficiency
```python
# WRONG: Merging sequentially
result = lists[0]
for i in range(1, k):
    result = merge_two_lists(result, lists[i])
# Time: O(k²N) - acceptable only if k ≤ 3

# CORRECT: Use heap or divide-and-conquer for large k
```

### 5. Not using dummy head
```python
# WRONG: Special case for first node
if heap:
    val, idx, head_node = heappop(heap)
    result = head_node
    current = result
    # Complex logic...

# CORRECT: Dummy head simplifies
dummy = ListNode(0)
current = dummy
# ... process all nodes uniformly
return dummy.next
```

---

## Visual Walkthrough

```
Input: k=3 lists
List 0: 1 → 4 → 5
List 1: 1 → 3 → 4
List 2: 2 → 6

STEP 1: Initialize heap with heads
Heap: [(1, 0, node1), (1, 1, node1'), (2, 2, node2)]
Result: dummy →

STEP 2: Pop min (1, 0, node_with_val_1)
Heap: [(1, 1, node1'), (2, 2, node2), (4, 0, node4)]
Result: dummy → 1 →
        (from list 0, added next=4 to heap)

STEP 3: Pop min (1, 1, node_with_val_1)
Heap: [(2, 2, node2), (3, 1, node3), (4, 0, node4)]
Result: dummy → 1 → 1 →
        (from list 1, added next=3 to heap)

STEP 4: Pop min (2, 2, node_with_val_2)
Heap: [(3, 1, node3), (4, 0, node4), (6, 2, node6)]
Result: dummy → 1 → 1 → 2 →
        (from list 2, added next=6 to heap)

STEP 5: Pop min (3, 1, node_with_val_3)
Heap: [(4, 0, node4), (4, 1, node4'), (6, 2, node6)]
Result: dummy → 1 → 1 → 2 → 3 →
        (from list 1, added next=4 to heap)

STEP 6: Pop min (4, 0, node_with_val_4)
Heap: [(4, 1, node4'), (5, 0, node5), (6, 2, node6)]
Result: dummy → 1 → 1 → 2 → 3 → 4 →
        (from list 0, added next=5 to heap)

STEP 7: Pop min (4, 1, node_with_val_4)
Heap: [(5, 0, node5), (6, 2, node6)]
Result: dummy → 1 → 1 → 2 → 3 → 4 → 4 →
        (from list 1, no next)

STEP 8: Pop min (5, 0, node_with_val_5)
Heap: [(6, 2, node6)]
Result: dummy → 1 → 1 → 2 → 3 → 4 → 4 → 5 →
        (from list 0, no next)

STEP 9: Pop min (6, 2, node_with_val_6)
Heap: []
Result: dummy → 1 → 1 → 2 → 3 → 4 → 4 → 5 → 6 →
        (from list 2, no next)

Final: 1 → 1 → 2 → 3 → 4 → 4 → 5 → 6
```

**Heap visualization at each step:**
```
Step 1:        1           Step 2:        1           Step 3:        2
              / \                        / \                        / \
             1   2                      2   4                      3   4

Step 4:        3           Step 5:        4           Step 6:        4
              / \                        / \                        / \
             4   6                      4   6                      5   6
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Merge k sorted arrays** | Arrays instead of lists | Same heap approach, use indices |
| **Find kth smallest in k lists** | Only need kth element | Stop after k pops from heap |
| **Merge infinite streams** | Lists are infinite/streaming | Min-heap still works, never exhausts |
| **Weighted merge** | Each list has priority | Add weight to heap key |
| **Merge in descending order** | Want largest first | Use max-heap instead |

---

## Practice Checklist

**Correctness:**
- [ ] Handles k = 0 (empty lists array)
- [ ] Handles all lists empty
- [ ] Handles single list (k = 1)
- [ ] Handles lists of different lengths
- [ ] Handles duplicate values across lists
- [ ] Handles negative numbers

**Algorithm Understanding:**
- [ ] Can explain heap approach without code
- [ ] Can compare heap vs divide-and-conquer trade-offs
- [ ] Understands why O(Nk log k) is optimal
- [ ] Can trace heap operations step-by-step

**Interview Readiness:**
- [ ] Can code heap solution in 20 minutes
- [ ] Can explain complexity analysis clearly
- [ ] Can discuss alternative approaches (divide-and-conquer)
- [ ] Can handle follow-up: what if lists are arrays?

**Spaced Repetition Tracker:**
- [ ] Day 1: Study solution, understand heap invariant
- [ ] Day 3: Implement heap version from scratch
- [ ] Day 7: Implement divide-and-conquer version
- [ ] Day 14: Explain both approaches to someone
- [ ] Day 30: Speed run (< 15 min)

---

**Strategy**: See [K-way Merge Pattern](../../strategies/patterns/k-way-merge.md) | [Heap/Priority Queue](../../strategies/data-structures/heap.md)
