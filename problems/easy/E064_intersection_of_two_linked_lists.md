---
id: E064
old_id: F160
slug: intersection-of-two-linked-lists
title: Intersection of Two Linked Lists
difficulty: easy
category: easy
topics: ["linked-list"]
patterns: []
estimated_time_minutes: 15
strategy_ref: ../prerequisites/linked-lists.md
---
# Intersection of Two Linked Lists

## Problem

Given two singly linked lists, determine if they share a common node where they intersect. If they do, return that intersection node. If they don't intersect, return null.

**What does "intersect" mean?** Two linked lists intersect when they merge at some node and continue as a single shared tail. The intersection is not about matching values - it's about the actual node object being shared between both lists.

```
Visual example:
List A: 1 → 2 ↘
              5 → 6 → 7
List B: 3 → 4 ↗

The intersection node is 5 (where the lists physically merge).
```

Important properties to understand:
- After intersection, the remaining nodes are identical (same objects, not just same values)
- List lengths can differ before the intersection point
- The lists may not intersect at all (completely separate)

**Watch out for:**
- The solution must work in O(1) space - no hash tables or extra lists
- You cannot modify the original list structures

## Why This Matters

This problem teaches the elegant **two-pointer synchronization technique** used throughout linked list problems. The core insight - aligning pointers by accounting for length differences - appears in:
- Detecting cycles in linked structures
- Finding middle nodes in streaming data
- Synchronizing iterators over unequal-length sequences

Beyond linked lists, this pattern of "catch-up" pointer movement is fundamental to many algorithms involving sequential data where you can't jump to arbitrary positions. Mastering it builds intuition for pointer manipulation without auxiliary space.

## Constraints

- The number of nodes of listA is in the m.
- The number of nodes of listB is in the n.
- 1 <= m, n <= 3 * 10⁴
- 1 <= Node.val <= 10⁵
- 0 <= skipA < m
- 0 <= skipB < n
- intersectVal is 0 if listA and listB do not intersect.
- intersectVal == listA[skipA] == listB[skipB] if listA and listB intersect.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

**Strategy**: See [Linked List Pattern](../prerequisites/linked-lists.md)
