---
id: M195
old_id: I239
slug: k-th-smallest-in-lexicographical-order
title: K-th Smallest in Lexicographical Order
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E386", "M440", "M230"]
prerequisites: ["trie", "dfs", "combinatorics"]
---
# K-th Smallest in Lexicographical Order

## Problem

Imagine you need to find a specific number in a dictionary-style ordering of all integers from `1` to `n`. You are provided with two integer values: `n` (the upper limit) and `k` (the position you're seeking). Your task is to determine which number appears at the `kth` position when all integers from `1` to `n` are arranged in lexicographical (dictionary) order.

Lexicographical ordering means numbers are sorted as if they were strings, not by numeric value. For example, with `n = 13`, the sequence becomes `[1, 10, 11, 12, 13, 2, 3, 4, 5, 6, 7, 8, 9]` because "10" comes before "2" alphabetically (just like "apple" comes before "banana"). The challenge is that for very large `n` (up to 10⁹), you cannot simply generate and sort all numbers since that would require too much time and memory. You need a clever way to navigate directly to the kth position without enumerating everything. Think about edge cases like when `k = 1` (always returns 1), when `n` is a single digit, or when you're looking for the last element in a large range.

## Why This Matters

This problem models real-world scenarios in distributed systems and databases where data is sorted lexicographically but you need random access to specific positions. NoSQL databases like Cassandra and HBase store keys in lexicographical order, and query optimizers need to estimate how many keys fall within certain prefixes without scanning everything. File systems display files lexicographically, and file managers need to jump to the "10,000th file" efficiently when dealing with millions of entries. The skip-counting technique you'll develop treating numbers as a 10-ary tree and calculating subtree sizes is the same principle behind B-tree index navigation in databases and trie-based autocomplete systems. Search engines use similar algorithms to rank results lexicographically by URL or title while supporting pagination ("show me results 1000-1010"). The mathematical insight of counting ranges by level rather than enumeration appears in skip lists, fractal trees, and any hierarchical data structure where you need logarithmic-time access by position in sorted order.

## Examples

**Example 1:**
- Input: `n = 13, k = 2`
- Output: `10`
- Explanation: When ordered lexicographically, the sequence becomes [1, 10, 11, 12, 13, 2, 3, 4, 5, 6, 7, 8, 9]. Therefore, the element at position 2 is 10.

**Example 2:**
- Input: `n = 1, k = 1`
- Output: `1`

## Constraints

- 1 <= k <= n <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>
Think of lexicographical order as a 10-ary tree where root has children 1-9, and each node i has children 10i through 10i+9 (if <= n). For example, node 1 has children [10, 11, ..., 19], node 10 has [100, ..., 109]. Finding the k-th smallest is equivalent to finding the k-th node in a pre-order traversal of this tree.
</details>

<details>
<summary>🎯 Hint 2: Skip Counting Strategy</summary>
Instead of traversing all k nodes, count how many nodes are in the subtree rooted at each prefix. If the subtree count < k, skip the entire subtree and try the next sibling prefix. Otherwise, descend into that prefix. This allows you to skip large portions of the tree without enumeration.
</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>
```
def countSteps(n, prefix1, prefix2):
    # Count numbers between prefix1 (inclusive) and prefix2 (exclusive)
    steps = 0
    while prefix1 <= n:
        steps += min(n + 1, prefix2) - prefix1
        prefix1 *= 10
        prefix2 *= 10
    return steps

def findKthNumber(n, k):
    current = 1
    k -= 1  # We start at 1, so decrease k

    while k > 0:
        steps = countSteps(n, current, current + 1)
        if steps <= k:
            # Skip this subtree, move to next sibling
            current += 1
            k -= steps
        else:
            # Descend into this subtree
            current *= 10
            k -= 1

    return current
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute force enumeration | O(n log n) | O(n) | Generate all, sort, return k-th |
| DFS with skip counting | O((log n)²) | O(1) | Optimal - no enumeration needed |
| Build trie and traverse | O(n) | O(n) | Memory intensive for large n |
| Iterative generation | O(k) | O(1) | Better than brute force, still slow |

**Recommended approach**: DFS with skip counting for O((log n)²) time.

## Common Mistakes

**Mistake 1: Trying to generate all numbers**
```python
# Wrong: O(n log n) time, O(n) space - fails for n=10^9
def findKthNumber(n, k):
    numbers = list(range(1, n + 1))
    numbers.sort(key=str)  # Sort lexicographically
    return numbers[k - 1]
```

```python
# Correct: Skip counting without enumeration
def findKthNumber(n, k):
    def countSteps(prefix1, prefix2):
        steps = 0
        while prefix1 <= n:
            steps += min(n + 1, prefix2) - prefix1
            prefix1 *= 10
            prefix2 *= 10
        return steps

    current = 1
    k -= 1

    while k > 0:
        steps = countSteps(current, current + 1)
        if steps <= k:
            current += 1
            k -= steps
        else:
            current *= 10
            k -= 1

    return current
```

**Mistake 2: Incorrect step counting**
```python
# Wrong: Doesn't handle boundaries correctly
def countSteps(n, prefix1, prefix2):
    steps = 0
    while prefix1 <= n:
        steps += prefix2 - prefix1  # Missing min(n+1, prefix2)
        prefix1 *= 10
        prefix2 *= 10
    return steps
```

```python
# Correct: Clamps to n+1 boundary
def countSteps(n, prefix1, prefix2):
    steps = 0
    while prefix1 <= n:
        # Count only numbers <= n in this level
        steps += min(n + 1, prefix2) - prefix1
        prefix1 *= 10
        prefix2 *= 10
    return steps
```

**Mistake 3: Not decrementing k initially**
```python
# Wrong: Off-by-one error
def findKthNumber(n, k):
    def countSteps(prefix1, prefix2):
        steps = 0
        while prefix1 <= n:
            steps += min(n + 1, prefix2) - prefix1
            prefix1 *= 10
            prefix2 *= 10
        return steps

    current = 1
    # Missing: k -= 1 (since we start at position 1)

    while k > 0:
        steps = countSteps(current, current + 1)
        if steps <= k:
            current += 1
            k -= steps
        else:
            current *= 10
            k -= 1

    return current
```

```python
# Correct: Decrement k since we start at 1
def findKthNumber(n, k):
    def countSteps(prefix1, prefix2):
        steps = 0
        while prefix1 <= n:
            steps += min(n + 1, prefix2) - prefix1
            prefix1 *= 10
            prefix2 *= 10
        return steps

    current = 1
    k -= 1  # We're already at position 1

    while k > 0:
        steps = countSteps(current, current + 1)
        if steps <= k:
            current += 1
            k -= steps
        else:
            current *= 10
            k -= 1

    return current
```

## Variations

| Variation | Difference | Key Insight |
|-----------|-----------|-------------|
| Lexicographical Numbers | Return all in order | Generate iteratively, multiply by 10 or increment |
| K-th Smallest BST Node | BST instead of 1..n | In-order traversal with counter |
| Find Missing Number | Lexicographical sequence | Skip counting detects gaps |
| Custom Alphabet Order | Different ordering | Build custom trie with alphabet mapping |
| Range Lexicographical Count | Count in range [a,b] | Two calls to skip count function |

## Practice Checklist

Use spaced repetition to master this problem:

- [ ] Day 1: Solve using skip counting algorithm
- [ ] Day 2: Understand and derive countSteps formula
- [ ] Day 4: Implement without looking at notes
- [ ] Day 7: Solve and draw tree visualization for small n
- [ ] Day 14: Solve variations (lexicographical numbers)
- [ ] Day 30: Speed test - solve in under 18 minutes
