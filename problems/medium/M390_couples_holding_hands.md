---
id: M390
old_id: A232
slug: couples-holding-hands
title: Couples Holding Hands
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Couples Holding Hands

## Problem

Picture a row of `2n` seats filled with `n` couples who want to sit next to their partners. People are currently sitting in some mixed-up arrangement, and you need to fix it with the minimum number of swaps.

Here's how partners are identified: people are numbered starting from 0, and partners have consecutive IDs:
- Person 0 and person 1 are a couple
- Person 2 and person 3 are a couple
- Person 4 and person 5 are a couple
- And so on... person `2k` and person `2k+1` are a couple

You're given an array `row` where `row[i]` is the ID of the person sitting at position `i`. For example, `row = [0, 2, 1, 3]` means:
- Position 0: person 0
- Position 1: person 2
- Position 2: person 1
- Position 3: person 3

Seats are grouped in pairs: positions (0,1) form a seat pair, (2,3) form another pair, (4,5) another, etc. The goal is for partners to share a seat pair.

In each swap operation, you can pick any two people and have them exchange seats (they don't need to be sitting next to each other).

Your task: Find the minimum number of swaps needed so that every seat pair contains a couple. For the example `[0, 2, 1, 3]`, one swap between positions 1 and 2 gives `[0, 1, 2, 3]`, where couples are properly seated.

## Why This Matters

This problem demonstrates the power of greedy algorithms and cycle detection in permutation problems. The same patterns appear in sorting with minimal swaps, memory allocation (defragmentation), and task scheduling (reordering to satisfy dependencies). The key insight - that you can greedily fix each seat pair from left to right - is a technique that extends to many optimization problems. Additionally, the alternative union-find approach (viewing misplaced couples as forming cycles) teaches you to recognize graph structures in array problems, a valuable skill for advanced interview questions and real-world optimization scenarios in operating systems and database query planning.

## Examples

**Example 1:**
- Input: `row = [0,2,1,3]`
- Output: `1`
- Explanation: A single swap between positions 1 and 2 arranges all couples correctly.

**Example 2:**
- Input: `row = [3,2,0,1]`
- Output: `0`
- Explanation: Partners are already seated adjacently, requiring no swaps.

## Constraints

- 2n == row.length
- 2 <= n <= 30
- n is even.
- 0 <= row[i] < 2n
- All the elements of row are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Think of this as a cycle detection problem using Union-Find. Each misplaced couple creates a cycle, and the number of swaps equals n - (number of cycles), where n is the number of couples.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a greedy approach: iterate through pairs of seats (positions 0-1, 2-3, 4-5, etc.). For each pair, if they're not partners, find the partner of the first person and swap them into position. Count each swap.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Maintain a position map to quickly locate where each person is sitting, avoiding O(n) search for each swap. Update the map after each swap to keep it synchronized.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n!) | O(1) | Try all permutations |
| Greedy | O(n²) | O(1) | Without position map |
| Optimal | O(n) | O(n) | Greedy with position map |

## Common Mistakes

1. **Incorrect Partner Calculation**
   ```python
   # Wrong: Using modulo which doesn't work for odd/even pairs
   partner = (person + 1) % n

   # Correct: XOR with 1 flips between even/odd
   partner = person ^ 1  # 0↔1, 2↔3, 4↔5, etc.
   ```

2. **Not Updating Position Map After Swap**
   ```python
   # Wrong: Swapping without updating the map
   row[i], row[j] = row[j], row[i]
   swaps += 1

   # Correct: Update position map to reflect the swap
   row[i], row[j] = row[j], row[i]
   pos[row[i]], pos[row[j]] = i, j
   swaps += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| First Missing Positive | Hard | Finding misplaced elements in cyclic arrangement |
| Find All Duplicates | Medium | Cycle detection in array with constraints |
| Minimum Swaps to Sort | Medium | Similar swapping problem with different goal |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
