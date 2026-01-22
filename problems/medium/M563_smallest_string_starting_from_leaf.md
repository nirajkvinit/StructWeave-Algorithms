---
id: M563
old_id: A455
slug: smallest-string-starting-from-leaf
title: Smallest String Starting From Leaf
difficulty: medium
category: medium
topics: ["string", "tree"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../prerequisites/trees.md
---
# Smallest String Starting From Leaf

## Problem

Imagine a tree where each node contains a letter instead of a number. You need to find all possible words you can form by reading letters from any bottom leaf up to the top root, then determine which word comes first alphabetically.

Given a binary tree where each node contains a value between `0` and `25` (representing letters `'a'` through `'z'`), find the lexicographically smallest string formed by reading values from any leaf node up to the root.

The key insight: you're reading backwards - from leaf to root - not the usual root to leaf direction. So if you traverse from root down to a leaf passing through nodes with values [0, 1, 2] (which would be "abc" top-down), reading from leaf to root gives you "cba".

A leaf node is a node with no children. Lexicographically smaller means earlier in dictionary order - for example, "abc" comes before "abd", and "ab" comes before "aba".


**Diagram:**

Example 1:
```
       0(a)
      /   \
    1(b)  2(c)
   /  \     \
 3(d) 4(e) 3(d)

Leaf-to-root paths:
- Leaf 3 → 1 → 0: "dba"
- Leaf 4 → 1 → 0: "eba"
- Leaf 3 → 2 → 0: "dca"

Output: "dba" (lexicographically smallest)
```

Example 2:
```
      25(z)
     /   \
   1(b)  3(d)
   /  \     \
 1(b) 3(d) 0(a)

Paths: "zzb", "zzbdd", "zdz", "zda"
Output: "zda"
```

Example 3:
```
       2(c)
      /   \
    2(c)  1(b)
   /  \     \
 3(d) 0(a) 0(a)

Paths: "adcc", "acc", "abc"
Output: "abc"
```


## Why This Matters

String comparison and path finding in trees appear in many real-world applications. This problem mirrors scenarios in file system navigation (finding the "smallest" path through directories), network routing (finding lexicographically preferred routes for tie-breaking), and data compression algorithms that build optimal encoding trees. The technique of building strings during tree traversal and comparing them efficiently is fundamental to text processing systems, autocomplete features, and search suggestion engines where you need to find the best match among many possible paths through a data structure.

## Constraints

- The number of nodes in the tree is in the range [1, 8500].
- 0 <= Node.val <= 25

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [String Pattern](../prerequisites/trees.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
You need to explore all root-to-leaf paths and build strings from leaf to root. The challenge is comparing strings during traversal rather than collecting all paths first, which would use more memory.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use DFS to traverse the tree. For each path, build the string from leaf to root by prepending characters. Keep track of the lexicographically smallest string found so far. Only update when you reach a leaf node and compare complete strings.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Pass the current string down during recursion and only create final strings at leaf nodes. This avoids building incomplete strings. Be careful: comparing partial paths can give wrong results since "abc" vs "ab" - the shorter one is smaller, but this doesn't apply when paths aren't complete.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| DFS with String Building | O(N * H) | O(H) | N = nodes, H = height. Each path requires string operations |
| Optimal | O(N * H) | O(H) | String comparison at leaves, recursion stack depth H |

## Common Mistakes

1. **Comparing Incomplete Paths**
   ```python
   # Wrong: Comparing strings before reaching leaves
   def dfs(node, path):
       if not node:
           return path
       path = chr(ord('a') + node.val) + path
       # Comparing here is wrong - not at leaf yet!
       if path < min_string:
           min_string = path

   # Correct: Only compare at leaf nodes
   def dfs(node, path):
       if not node:
           return
       path = chr(ord('a') + node.val) + path
       if not node.left and not node.right:  # Leaf node
           if path < self.min_string:
               self.min_string = path
       else:
           dfs(node.left, path)
           dfs(node.right, path)
   ```

2. **Forgetting Root-Only Tree**
   ```python
   # Wrong: Assumes tree has children
   if not node.left and not node.right:
       return

   # Correct: Handle single-node tree
   if not node:
       return
   # Process current node
   if not node.left and not node.right:  # This node is a leaf
       # Update result
   ```

3. **Building String in Wrong Direction**
   ```python
   # Wrong: Building from root to leaf
   def dfs(node, path):
       path += chr(ord('a') + node.val)  # Wrong direction!

   # Correct: Prepend to build from leaf to root
   def dfs(node, path):
       path = chr(ord('a') + node.val) + path  # Prepend
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Sum Root to Leaf Numbers | Medium | Build numbers instead of strings from root to leaf |
| Binary Tree Paths | Easy | Return all root-to-leaf paths as strings |
| Path Sum II | Medium | Find all paths with a given sum |
| Longest Path in Binary Tree | Medium | Find path with maximum length/sum |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Trees](../../prerequisites/trees.md)
