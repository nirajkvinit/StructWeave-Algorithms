---
id: M554
old_id: A446
slug: distribute-coins-in-binary-tree
title: Distribute Coins in Binary Tree
difficulty: medium
category: medium
topics: ["tree"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/trees.md
---
# Distribute Coins in Binary Tree

## Problem

Imagine a binary tree where `n` nodes represent treasure chests, each holding some number of gold coins (stored in `node.val`). The total coin count across all chests equals exactly `n` - the same as the number of chests. However, the coins are distributed unevenly: some chests might be empty, while others overflow with multiple coins.

Your task is to redistribute these coins so that every chest contains exactly one coin. The only way to move coins is by transferring them one at a time along the tree's edges (between parent and child nodes, in either direction). Each single coin transfer counts as one move.

What's the minimum number of moves needed to achieve perfect balance?

For example, consider this tree:
```
      3
     / \
    0   0
```
The root has 3 coins while its children have none. You need to move 1 coin to the left child (1 move) and 1 coin to the right child (1 move), plus the root now has an extra coin that must move somewhere - but since it only needs to give to its children, total is 3 moves.

## Why This Matters

This problem models resource distribution in hierarchical systems. Consider cloud computing infrastructure where computational resources (CPU, memory) need balancing across server clusters organized in tree topologies. Network load balancers distribute traffic through hierarchical routing trees to prevent bottlenecks. Company budgets flow through organizational hierarchies, requiring optimal allocation from corporate headquarters down through divisions and departments. File system defragmentation reorganizes data blocks across directory trees. Supply chain management distributes inventory through warehouse networks. Power grids balance electrical load through hierarchical distribution networks. The key challenge in all these scenarios: minimizing transfer operations while achieving equilibrium across a tree structure, where movements can only occur along existing connections.

## Constraints

- The number of nodes in the tree is n.
- 1 <= n <= 100
- 0 <= Node.val <= n
- The sum of all Node.val is n.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Tree Pattern](../strategies/data-structures/trees.md)

## Approach Hints

<details>
<summary>Key Insight</summary>
Each subtree needs to pass its excess coins (or deficit) to its parent. For any node, calculate how many coins need to flow through the edge connecting it to its parent. This equals |coins_in_subtree - nodes_in_subtree|. Use post-order DFS to calculate excess/deficit bottom-up, and sum all the absolute excesses.
</details>

<details>
<summary>Main Approach</summary>
Use post-order traversal (process children before parent). For each node, calculate: excess = node.val + left_excess + right_excess - 1 (keep 1 coin for current node). The number of moves through edges to left and right children equals |left_excess| + |right_excess|. Return excess to parent. Sum all absolute excesses to get total moves.
</details>

<details>
<summary>Optimization Tip</summary>
The number of moves equals the sum of absolute values of excess coins in all subtrees. You can track this in a global variable or return tuple (excess, moves) from each recursive call. The excess can be negative (deficit) or positive (surplus), and moves accumulate as |excess| for each subtree.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Post-order DFS | O(n) | O(h) | Visit each node once; recursion depth = tree height |
| Optimal | O(n) | O(h) | h = O(log n) for balanced, O(n) for skewed |

## Common Mistakes

1. **Not using absolute value for moves**
   ```python
   # Wrong: Only counting positive excess
   moves += left_excess + right_excess

   # Correct: Count absolute value (coins move both ways)
   moves += abs(left_excess) + abs(right_excess)
   ```

2. **Forgetting to subtract 1 for current node**
   ```python
   # Wrong: Not keeping 1 coin for current node
   excess = node.val + left_excess + right_excess

   # Correct: Each node keeps 1, passes rest to parent
   excess = node.val + left_excess + right_excess - 1
   ```

3. **Using pre-order instead of post-order**
   ```python
   # Wrong: Can't calculate excess before processing children
   def dfs(node):
       excess = node.val - 1
       dfs(node.left)
       dfs(node.right)
       # Don't know children's excess yet!

   # Correct: Post-order to get children's results first
   def dfs(node):
       if not node:
           return 0
       left_excess = dfs(node.left)
       right_excess = dfs(node.right)
       nonlocal moves
       moves += abs(left_excess) + abs(right_excess)
       return node.val + left_excess + right_excess - 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Binary Tree Maximum Path Sum | Hard | Find path with max sum instead of balancing |
| Distribute Candies | Easy | Array-based distribution problem |
| Minimum Moves to Equal Array Elements | Medium | Array version with different constraints |
| Balance a Binary Search Tree | Medium | Restructure tree for balance |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved (O(n))
- [ ] Clean, readable code
- [ ] Handled all edge cases (single node, all coins in one node, already balanced)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Trees - Post-order Traversal](../../strategies/data-structures/trees.md)
