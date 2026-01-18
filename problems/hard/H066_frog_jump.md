---
id: H066
old_id: I202
slug: frog-jump
title: Frog Jump
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Frog Jump

## Problem

A frog needs to traverse a river where stones are placed at various positions. The river is measured in discrete units, and each unit may or may not contain a stone for the frog to land on. The frog cannot leap into water.

You are provided with an array `stones` containing stone positions in strictly increasing order. Determine whether the frog can successfully reach the final stone starting from the first one. The frog begins at the first stone and must make its initial jump of exactly `1` unit.

The jumping mechanics work as follows: after a jump of `k` units, the subsequent jump must be one of three distances: `k - 1`, `k`, or `k + 1` units. The frog can only move forward.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `stones = [0,1,3,5,6,8,12,17]`
- Output: `true`
- Explanation: A valid path exists: jump 1 unit to stone 2, then 2 units to stone 3, then 2 units to stone 4, then 3 units to stone 6, followed by 4 units to stone 7, and finally 5 units to reach stone 8.

**Example 2:**
- Input: `stones = [0,1,2,3,4,8,9,11]`
- Output: `false`
- Explanation: No valid jumping sequence exists because the distance between stones 5 and 6 is insurmountable.

## Constraints

- 2 <= stones.length <= 2000
- 0 <= stones[i] <= 2³¹ - 1
- stones[0] == 0
- stones is sorted in a strictly increasing order.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a reachability problem with state-dependent transitions. The key state is (current_position, last_jump_size). Use dynamic programming or BFS where each state tracks not just the position but also the momentum (last jump). A stone can be reached with multiple different jump sizes, so store sets of possible jump sizes at each stone.
</details>

<details>
<summary>🎯 Main Approach</summary>
Create a hash map where keys are stone positions and values are sets of possible jump sizes that can reach that stone. Start at position 0 with jump size 0. For each stone, iterate through all possible jump sizes that can reach it, and try jumps of k-1, k, and k+1 to subsequent stones. If the last stone is reached with any jump size, return true.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Convert stones array to a set for O(1) lookup of whether a position has a stone. This is critical because you'll be checking "position + jump" frequently. Also, prune impossible states: if a gap between consecutive stones is larger than the maximum possible jump from any previous stone, return false early.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(3^n) | O(n) | Try all 3 jump options at each step |
| DP with memoization | O(n²) | O(n²) | At most n positions × n possible jump sizes |
| Optimal (BFS with pruning) | O(n²) | O(n²) | Same complexity but better constant factors |

## Common Mistakes

1. **Not tracking jump size in state**
   ```python
   # Wrong: only tracking position
   visited = set()
   visited.add(current_position)

   # Correct: track both position and jump size
   visited = set()
   visited.add((current_position, last_jump))
   # Same position can be reached with different jumps
   ```

2. **Missing the initial jump constraint**
   ```python
   # Wrong: allowing any initial jump
   queue = [(stones[0], 0)]

   # Correct: first jump must be exactly 1
   if len(stones) > 1 and stones[1] != 1:
       return False  # Can't reach second stone
   # Start from position 1 with jump size 1
   ```

3. **Not using set for stone lookup**
   ```python
   # Wrong: checking if position in stones list
   if next_pos in stones:  # O(n) lookup

   # Correct: convert to set first
   stone_set = set(stones)
   if next_pos in stone_set:  # O(1) lookup
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Jump Game II | Medium | Fixed jump constraints, find minimum jumps |
| Minimum Jumps to Reach Home | Medium | Forward/backward jumps with limits |
| Stone Game | Medium | Different objective, game theory |
| Reach a Number | Medium | Similar jump mechanics on number line |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
