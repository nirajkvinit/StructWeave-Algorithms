---
id: E264
old_id: A464
slug: find-the-town-judge
title: Find the Town Judge
difficulty: easy
category: easy
topics: ["array", "graph"]
patterns: ["in-degree-out-degree"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E277", "M207", "M210"]
prerequisites: ["arrays", "graph-basics"]
strategy_ref: ../strategies/data-structures/graphs.md
---
# Find the Town Judge

## Problem

A town has `n` people labeled from 1 to n. According to rumors, one of these people is secretly the town judge. The judge has a unique characteristic that makes them identifiable through trust relationships.

If the town judge exists, they must satisfy two conditions simultaneously: First, the judge trusts absolutely nobody (they have zero outgoing trust relationships). Second, everyone else in the town trusts the judge (they have n-1 incoming trust relationships, one from each other person). These two properties together uniquely identify the judge - there can be at most one such person.

You are given an array `trust` where each element `trust[i] = [a, b]` means person `a` trusts person `b`. This is a directed relationship - just because `a` trusts `b` doesn't mean `b` trusts `a`. If a trust relationship isn't explicitly listed in the array, it doesn't exist.

Your task is to identify the town judge if one exists and can be uniquely determined from the trust data. Return the label (number) of the judge, or return `-1` if no such person exists or cannot be determined.

## Why This Matters

This problem introduces fundamental graph concepts using an intuitive real-world scenario. In graph theory terminology, you're finding a node with in-degree n-1 and out-degree 0. This pattern of counting incoming and outgoing edges is essential in social network analysis (finding influencers), web search algorithms (PageRank), dependency resolution systems (build order, course prerequisites), and recommendation engines. The technique of using a single score that combines in-degree and out-degree is a common optimization that reduces space and simplifies code. Understanding directed graphs through trust relationships prepares you for more complex graph problems like detecting cycles, finding strongly connected components, and topological sorting - all of which appear frequently in system design interviews and real-world applications like package managers and task schedulers.

## Examples

**Example 1:**
- Input: `n = 2, trust = [[1,2]]`
- Output: `2`

**Example 2:**
- Input: `n = 3, trust = [[1,3],[2,3]]`
- Output: `3`

**Example 3:**
- Input: `n = 3, trust = [[1,3],[2,3],[3,1]]`
- Output: `-1`

## Constraints

- 1 <= n <= 1000
- 0 <= trust.length <= 10⁴
- trust[i].length == 2
- All the pairs of trust are **unique**.
- ai != bi
- 1 <= ai, bi <= n

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Conceptual Foundation
- Think of this as a directed graph where trust[a,b] means edge from a to b
- The judge has in-degree = n-1 (everyone trusts them)
- The judge has out-degree = 0 (trusts nobody)
- Track both incoming and outgoing trust counts for each person

### Tier 2: Step-by-Step Strategy
- Create a trust score array where positive means being trusted, negative means trusting
- For each trust relationship [a, b]:
  - Person a trusts someone (decrease their score by 1)
  - Person b is trusted (increase their score by 1)
- The judge will have a score of exactly n-1
- All other people will have scores less than n-1

### Tier 3: Implementation Details
- Initialize `trust_score = [0] * (n + 1)` (1-indexed)
- For each `[a, b]` in trust:
  - `trust_score[a] -= 1` (a trusts someone)
  - `trust_score[b] += 1` (b is trusted by someone)
- Iterate through persons 1 to n:
  - If `trust_score[i] == n - 1`, return i
- Return -1 if no judge found

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Trust Score Array | O(n + t) | O(n) | t = trust relationships, optimal solution |
| In-degree/Out-degree Arrays | O(n + t) | O(n) | Two separate arrays, same complexity |
| Hash Map Tracking | O(n + t) | O(n) | Slightly more overhead, same asymptotic |
| Brute Force Validation | O(n * t) | O(1) | Check each person individually, inefficient |

**Optimal Solution**: Trust score array achieves O(n + t) time with O(n) space.

## Common Mistakes

### Mistake 1: Only tracking who is trusted
```python
# Wrong: incomplete tracking
trusted_count = [0] * (n + 1)
for a, b in trust:
    trusted_count[b] += 1  # Only tracking incoming trust

# This misses checking if the judge trusts anyone!
# Someone could be trusted by n-1 people but still trust others

# Correct: track both in and out
trust_score = [0] * (n + 1)
for a, b in trust:
    trust_score[a] -= 1  # Trusts someone (bad for judge)
    trust_score[b] += 1  # Is trusted (good for judge)
```

### Mistake 2: Off-by-one with 1-indexed persons
```python
# Wrong: using 0-indexed array for 1-indexed persons
trust_score = [0] * n  # Too small! Persons are 1 to n
for a, b in trust:
    trust_score[a] += 1  # IndexError when a == n

# Correct: account for 1-indexing
trust_score = [0] * (n + 1)  # Index 0 unused, 1 to n used
```

### Mistake 3: Not validating the judge trusts nobody
```python
# Wrong: only checking incoming trust
trusted_by = set()
for a, b in trust:
    trusted_by.add(b)

for person in range(1, n + 1):
    count = sum(1 for a, b in trust if b == person)
    if count == n - 1:
        return person  # Didn't check if person trusts others!

# Correct: combined score ensures judge trusts nobody
# If judge trusts anyone, score < n-1
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Find celebrity in party | Easy | Same problem with different context |
| Multiple judges possible | Medium | Return all candidates or count them |
| Directed graph with k-out-degree constraint | Medium | Generalize to k outgoing edges allowed |
| Minimum edges to add to create judge | Medium | Graph modification problem |
| Trust with confidence weights | Medium | Weighted trust relationships |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solved independently on first attempt
- [ ] Completed within 15 minutes
- [ ] Used trust score array approach
- [ ] Correctly tracked both in-degree and out-degree
- [ ] Handled 1-indexed person numbering correctly
- [ ] Wrote bug-free code on first submission
- [ ] Explained solution clearly to someone else
- [ ] Solved without hints after 1 day
- [ ] Solved without hints after 1 week
- [ ] Identified time and space complexity correctly

**Spaced Repetition Schedule**: Review on Day 1, Day 3, Day 7, Day 14, Day 30

**Strategy**: See [Graphs](../strategies/data-structures/graphs.md)
