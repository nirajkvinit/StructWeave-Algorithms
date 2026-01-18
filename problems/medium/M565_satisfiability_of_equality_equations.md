---
id: M565
old_id: A457
slug: satisfiability-of-equality-equations
title: Satisfiability of Equality Equations
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Satisfiability of Equality Equations

## Problem

Imagine you're building a constraint solver for a type system or a logic puzzle validator. You have a set of rules stating which variables must equal each other and which must be different. Your job is to determine if it's possible to assign values that satisfy all the rules simultaneously, or if the rules contradict each other.

You're given an array `equations` where each equation is a string with exactly 4 characters in one of two formats:
- `"xi==yi"` means variables x and y must have equal values
- `"xi!=yi"` means variables x and y must have different values

Here, `xi` and `yi` are single lowercase letters representing variable names (like `a`, `b`, `c`, etc.).

Return `true` if you can assign integer values to all variables such that every equation is satisfied. Return `false` if there's a contradiction - when the rules make it impossible to find valid assignments.

For example, if you have `a==b` and `b==c`, then `a` and `c` must equal each other. So if you also have `a!=c`, that's a contradiction - it's impossible to satisfy all three equations.


## Why This Matters

This problem appears in type inference systems used by programming language compilers (determining if type constraints are consistent), SAT solvers that power formal verification tools, dependency resolution in package managers (checking if version requirements are compatible), and database query optimizers (detecting contradictory join conditions). The Union-Find data structure you'll use here is fundamental to network connectivity analysis (finding if two computers can communicate), image processing (identifying connected regions), and social network analysis (detecting friend groups). Understanding how to detect contradictions in equality systems helps you build robust constraint checking systems in any domain where relationships and rules need validation.

## Examples

**Example 1:**
- Input: `equations = ["a==b","b!=a"]`
- Output: `false`
- Explanation: If we assign say, a = 1 and b = 1, then the first equation is satisfied, but not the second.
There is no way to assign the variables to satisfy both equations.

**Example 2:**
- Input: `equations = ["b==a","a==b"]`
- Output: `true`
- Explanation: We could assign a = 1 and b = 1 to satisfy both equations.

## Constraints

- 1 <= equations.length <= 500
- equations[i].length == 4
- equations[i][0] is a lowercase letter.
- equations[i][1] is either '=' or '!'.
- equations[i][2] is '='.
- equations[i][3] is a lowercase letter.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a graph connectivity problem in disguise. Equality equations (==) create connections between variables, forming groups. Inequality equations (!=) state that two variables must be in different groups.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use Union-Find (Disjoint Set Union) to group variables. First, process all equality equations to union variables into the same set. Then, check all inequality equations - if two variables that should be unequal are in the same set, return false.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Since variables are single lowercase letters (only 26 possibilities), you can use an array of size 26 for parent pointers instead of a hash map. Use path compression and union by rank for optimal Union-Find performance.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Graph DFS) | O(N * 26) | O(26) | Check connectivity for each inequality |
| Optimal (Union-Find) | O(N * α(26)) ≈ O(N) | O(26) = O(1) | α is inverse Ackermann function |

## Common Mistakes

1. **Processing Inequalities First**
   ```python
   # Wrong: Checking inequalities before building equality groups
   for eq in equations:
       if '!=' in eq:
           if find(eq[0]) == find(eq[3]):
               return False
       else:
           union(eq[0], eq[3])

   # Correct: Process all equalities first, then check inequalities
   for eq in equations:
       if '==' in eq:
           union(eq[0], eq[3])
   for eq in equations:
       if '!=' in eq:
           if find(eq[0]) == find(eq[3]):
               return False
   return True
   ```

2. **Not Implementing Path Compression**
   ```python
   # Wrong: Basic find without path compression
   def find(x):
       if parent[x] != x:
           return find(parent[x])
       return x

   # Correct: Find with path compression
   def find(x):
       if parent[x] != x:
           parent[x] = find(parent[x])  # Path compression
       return parent[x]
   ```

3. **Incorrect Equation Parsing**
   ```python
   # Wrong: Incorrect indexing
   if equation[1] == '=':  # Wrong index
       union(equation[0], equation[2])

   # Correct: Equation format is "a==b" or "a!=b"
   if equation[1:3] == '==':
       union(equation[0], equation[3])
   elif equation[1:3] == '!=':
       # Check inequality
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of Connected Components | Medium | Count groups instead of checking satisfiability |
| Redundant Connection | Medium | Find edge that creates cycle in union-find |
| Accounts Merge | Medium | Merge accounts using union-find on emails |
| Similar String Groups | Hard | Group anagrams using union-find |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Union-Find](../../strategies/data-structures/union-find.md)
