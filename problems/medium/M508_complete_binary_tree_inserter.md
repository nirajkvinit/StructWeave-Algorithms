---
id: M508
old_id: A386
slug: complete-binary-tree-inserter
title: Complete Binary Tree Inserter
difficulty: medium
category: medium
topics: ["tree"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../prerequisites/trees.md
---
# Complete Binary Tree Inserter

## Problem

You need to build a data structure that maintains a complete binary tree while supporting efficient insertions.

First, let's clarify what a **complete binary tree** is:
- All levels are completely filled except possibly the last level
- The last level is filled from left to right with no gaps
- This is different from a "full" tree (where every node has 0 or 2 children) or a "perfect" tree (where all levels are completely filled)

For example, this is a complete binary tree:
```
      1
     / \
    2   3
   / \
  4   5
```

But this is NOT complete (gap on the left):
```
      1
     / \
    2   3
     \
      5
```

Your task is to implement the `CBTInserter` class:

1. `CBTInserter(TreeNode root)`: Initialize with an existing complete binary tree
2. `int insert(int v)`: Insert a new node with value `v` while maintaining the complete tree property. Return the value of the new node's parent.
3. `TreeNode get_root()`: Return the root of the tree

The key challenge: When inserting, you must place the new node in the leftmost available position to maintain the complete tree structure.

**Diagram:**

Example: Building a complete binary tree

```
Initial tree:           After insert(3):      After insert(4):
      1                       1                      1
     / \                     / \                    / \
    2   3                   2   3                  2   3
                           /                      / \
                          3                      3   4
                       (parent=2)             (parent=2)

Step-by-step insertion maintains complete tree property:
1. Tree fills level by level, left to right
2. New nodes always attach to leftmost incomplete parent
3. insert() returns the parent's value

Example sequence:
- CBTInserter([1,2,3])
- insert(3) → returns 2 (node 3 added as left child of 2)
- insert(4) → returns 2 (node 4 added as right child of 2)
- get_root() → returns node 1
```


## Why This Matters

Complete binary trees are fundamental to heap data structures, which power priority queues in operating system schedulers, event-driven simulations, and graph algorithms like Dijkstra's shortest path. Unlike arbitrary binary trees, complete binary trees can be efficiently stored in arrays without wasting space - the parent of node at index `i` is at `(i-1)/2`, and its children are at `2i+1` and `2i+2`. This array representation is why binary heaps achieve O(1) space overhead. Understanding how to maintain the complete tree property during insertions teaches you the mechanics behind heap operations, which are essential when implementing task schedulers, bandwidth allocation systems, or any scenario where you need to repeatedly process the "most important" item efficiently.

## Constraints

- The number of nodes in the tree will be in the range [1, 1000].
- 0 <= Node.val <= 5000
- root is a complete binary tree.
- 0 <= val <= 5000
- At most 10⁴ calls will be made to insert and get_root.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Tree Pattern](../prerequisites/trees.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The complete binary tree property means nodes fill level by level, left to right. You can use a queue to track all nodes that might still need children. When inserting, the parent is always at the front of this queue.
</details>

<details>
<summary>🎯 Main Approach</summary>
Initialize by performing a level-order traversal (BFS) to populate a queue with all nodes that have incomplete children (0 or 1 child). During insert(), the first node in the queue becomes the parent - add the child to its left (if empty) or right, and enqueue the new node since it could become a parent.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Only store nodes with missing children in the queue. Complete nodes (with both children) can be safely removed. This keeps the queue minimal and ensures O(1) insertion time.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS Queue | O(n) init, O(1) insert | O(w) | w = width of tree (nodes at max level), maintains incomplete nodes queue |
| Optimal | O(n) init, O(1) insert | O(w) | Preferred approach using level-order queue |

## Common Mistakes

1. **Forgetting to enqueue newly inserted nodes**
   ```python
   # Wrong: New node not added to queue
   def insert(self, v):
       parent = self.queue[0]
       new_node = TreeNode(v)
       if not parent.left:
           parent.left = new_node
       else:
           parent.right = new_node
       return parent.val  # Missing: self.queue.append(new_node)

   # Correct: Always enqueue new nodes
   def insert(self, v):
       parent = self.queue[0]
       new_node = TreeNode(v)
       if not parent.left:
           parent.left = new_node
       else:
           parent.right = new_node
           self.queue.pop(0)  # Parent complete
       self.queue.append(new_node)  # New node might be parent later
       return parent.val
   ```

2. **Not removing completed parents from queue**
   ```python
   # Wrong: Queue grows unnecessarily
   def insert(self, v):
       parent = self.queue[0]
       new_node = TreeNode(v)
       if not parent.left:
           parent.left = new_node
       else:
           parent.right = new_node
       # Missing: remove parent when both children exist
       self.queue.append(new_node)
       return parent.val

   # Correct: Remove parent when both children filled
   def insert(self, v):
       parent = self.queue[0]
       new_node = TreeNode(v)
       if not parent.left:
           parent.left = new_node
       else:
           parent.right = new_node
           self.queue.pop(0)  # Parent complete, remove it
       self.queue.append(new_node)
       return parent.val
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Serialize Complete Binary Tree | Medium | Convert tree to string representation |
| Count Complete Tree Nodes | Medium | Count nodes efficiently using completeness property |
| Find Kth Ancestor of a Tree Node | Hard | Navigate upward in tree hierarchy |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Trees](../../prerequisites/trees.md)
