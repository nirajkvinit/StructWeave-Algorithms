---
id: M531
old_id: A419
slug: largest-component-size-by-common-factor
title: Largest Component Size by Common Factor
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Largest Component Size by Common Factor

## Problem

Imagine you have a collection of distinct positive integers, and you want to group them by their mathematical relationships. Two numbers can be connected if they share a common factor greater than 1. For example, 6 and 15 share the factor 3, so they connect. Similarly, 15 and 35 share the factor 5.

You have an integer array `nums` containing distinct positive values. Build an undirected graph based on these rules:

- Each element `nums[i]` represents a node.
- Two nodes `nums[i]` and `nums[j]` are connected by an edge if they share at least one common factor greater than `1`.

Your task is to find the largest connected group of numbers. Return *the number of nodes in the largest connected component of this graph*.

For instance, given `[4, 6, 15, 35]`:
- 4 and 6 share factor 2 (they connect)
- 6 and 15 share factor 3 (they connect)
- 15 and 35 share factor 5 (they connect)
- All four numbers form one connected group of size 4


**Diagram:**

```
Example 1: nums = [4,6,15,35]

Graph connections (numbers share common factors > 1):
    4 ─── 6     (GCD = 2)
    6 ─── 15    (GCD = 3)
    15 ─── 35   (GCD = 5)

Connected component: {4, 6, 15, 35}
Size: 4

Example 2: nums = [20,50,9,63]

Graph connections:
    20 ─── 50   (GCD = 10)
    9 ─── 63    (GCD = 9)

Two components: {20, 50} and {9, 63}
Largest size: 2

Example 3: nums = [2,3,6,7,4,12,21,39]

Graph connections:
    2 ─── 6 ─── 3
    |     |
    4 ─── 12

    7 ─── 21 ─── 39

Components: {2,3,4,6,12} size=5 and {7,21,39} size=3
Largest: 5
```


## Why This Matters

Understanding how to group related data is fundamental in computer science. This problem appears in real-world scenarios like social network analysis (finding communities of connected users), recommendation systems (grouping similar products through shared attributes), and data clustering. The mathematical twist with prime factorization teaches you how to transform a seemingly complex relationship problem into an efficient graph connectivity challenge. It's also a practical application of Union-Find, a powerful technique used in network design, image segmentation, and compiler optimization.

## Constraints

- 1 <= nums.length <= 2 * 10⁴
- 1 <= nums[i] <= 10⁵
- All the values of nums are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Instead of comparing every pair of numbers (O(n²)), connect numbers through their prime factors. If two numbers share a prime factor, they're in the same component. Use Union-Find to efficiently group numbers by their factors.
</details>

<details>
<summary>Main Approach</summary>
Use Union-Find (Disjoint Set Union) with prime factorization. For each number, find all its prime factors. Union the number with each of its prime factors. This way, numbers sharing any prime factor end up in the same component. Finally, count the size of each component and return the maximum.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of finding GCD for all pairs (O(n² log max_val)), factorize each number once (O(n√max_val)). Use a sieve to precompute smallest prime factors for efficient factorization. Map each prime factor to its representative number to avoid creating union-find nodes for all possible primes.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Check All Pairs) | O(n² log max_val) | O(n) | Compute GCD for every pair |
| Union-Find with Factorization | O(n√max_val × α(n)) | O(n + max_val) | α(n) is inverse Ackermann, nearly constant |
| Optimal (Sieve + Union-Find) | O(max_val log log max_val + n√max_val) | O(max_val) | Sieve preprocessing, then factorize |

## Common Mistakes

1. **Checking all pairs with GCD**
   ```python
   # Wrong: O(n²) comparisons, too slow for large n
   from math import gcd
   def largestComponentSize(nums):
       n = len(nums)
       parent = list(range(n))
       for i in range(n):
           for j in range(i + 1, n):
               if gcd(nums[i], nums[j]) > 1:
                   union(i, j)

   # Correct: Connect through prime factors
   def largestComponentSize(nums):
       def prime_factors(n):
           factors = set()
           d = 2
           while d * d <= n:
               while n % d == 0:
                   factors.add(d)
                   n //= d
               d += 1
           if n > 1:
               factors.add(n)
           return factors
       # Use Union-Find with factors
   ```

2. **Not using union-find optimization**
   ```python
   # Wrong: No path compression or union by rank
   def find(x):
       if parent[x] != x:
           parent[x] = find(parent[x])  # Missing this optimization
       return parent[x]

   # Correct: Path compression for efficiency
   def find(x):
       if parent[x] != x:
           parent[x] = find(parent[x])  # Path compression
       return parent[x]
   ```

3. **Creating too many union-find nodes**
   ```python
   # Wrong: Creating nodes for all numbers up to max_val
   parent = list(range(100001))  # Wastes space

   # Correct: Only create nodes for numbers and factors that appear
   parent = {num: num for num in nums}
   # Dynamically add factors as needed
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of Connected Components | Medium | Count components instead of finding largest |
| Graph Connectivity with Conditions | Medium | Different connectivity rules, same Union-Find approach |
| Accounts Merge | Medium | Union-Find with different grouping criteria |
| Redundant Connection | Medium | Detect cycles using Union-Find |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Union-Find Pattern](../../strategies/data-structures/union-find.md)
