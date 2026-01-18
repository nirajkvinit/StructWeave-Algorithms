---
id: M551
old_id: A442
slug: odd-even-jump
title: Odd Even Jump
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Odd Even Jump

## Problem

Imagine you're standing on a stepping stone path where you can only jump forward, and the rules for which stone you can jump to alternate with each leap. Given an integer array `arr` representing stone values, your challenge is to determine how many starting positions let you successfully reach the final stone.

Here's how the jumping rules work:

**On odd-numbered jumps** (your 1st, 3rd, 5th jumps, etc.):
- Look forward at all stones with values greater than or equal to your current stone's value
- Jump to the one with the smallest value among those options
- If multiple stones have the same smallest value, choose the closest one (leftmost index)

**On even-numbered jumps** (your 2nd, 4th, 6th jumps, etc.):
- Look forward at all stones with values less than or equal to your current stone's value
- Jump to the one with the largest value among those options
- Again, if there's a tie, choose the closest one (leftmost index)

Remember, you can only jump to higher indices (forward movement), and you always start with an odd jump from any position.

A starting position is **good** if following these alternating rules allows you to reach the last stone (or you're already on it). Your task is to count all good starting positions.

## Why This Matters

This problem appears in pathfinding scenarios where movement constraints change dynamically. Consider a video game where your character's abilities alternate (strong jump vs. precise jump), or stock trading algorithms that alternate between conservative and aggressive moves based on market conditions. Real-world applications include robot navigation with varying movement modes, delivery route optimization with alternating vehicle types, and network packet routing where transmission rules alternate based on congestion levels. The underlying pattern of conditional state transitions with look-ahead constraints mirrors many real optimization problems in logistics, gaming, and automated decision-making systems.

## Examples

**Example 1:**
- Input: `arr = [10,13,12,14,15]`
- Output: `2`
- Explanation: Starting at position 0: The first jump goes to position 2 (value 12 is the smallest that's >= 10), but no further jumps are possible. Starting at positions 1 or 2: Can jump to position 3, then get stuck. Starting at position 3: One jump reaches position 4 (the end). Starting at position 4: Already at the end. Only 2 positions (indices 3 and 4) successfully reach the end.

**Example 2:**
- Input: `arr = [2,3,1,1,4]`
- Output: `3`
- Explanation: Starting at position 0: Jump sequence goes 0 → 1 → 2 → 3, but cannot proceed from 3 to 4, so this starting position fails. Starting at position 1: Jumps directly to position 4 (success). Starting at position 2: Jumps to position 3, then gets blocked. Starting at position 3: Jumps to position 4 (success). Starting at position 4: Already at destination. Total of 3 successful starting positions: indices 1, 3, and 4.

**Example 3:**
- Input: `arr = [5,1,3,4,2]`
- Output: `3`
- Explanation: Three starting indices (1, 2, and 4) enable reaching the final position.

## Constraints

- 1 <= arr.length <= 2 * 10⁴
- 0 <= arr[i] < 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Work backwards from the end. The last index is always good. For each position, precompute where you'd land on an odd jump and where you'd land on an even jump. Then use dynamic programming: a position is good on odd jump if its odd-jump destination is good on even jump, and vice versa.
</details>

<details>
<summary>Main Approach</summary>
1) Create sorted index mappings: sort indices by value (ascending for odd jump, descending for even jump). 2) For each position, find the next position in sorted order to determine jump destinations using a monotonic stack or TreeMap. 3) Use two DP arrays: odd[i] = can reach end starting with odd jump from i, even[i] = can reach end starting with even jump from i. 4) Work backwards: odd[i] = even[next_odd[i]], even[i] = odd[next_even[i]]. 5) Count positions where odd[i] is true.
</details>

<details>
<summary>Optimization Tip</summary>
Use a sorted map (TreeMap in Java, SortedDict in Python) to efficiently find the next jump destination. For odd jumps, find ceiling (smallest value >= current). For even jumps, find floor (largest value <= current). Process indices from right to left while maintaining the sorted structure of remaining reachable indices.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | For each position, linearly search for next jump |
| Sorted + Monotonic Stack | O(n log n) | O(n) | Sort indices by value, use stack to find next |
| TreeMap approach | O(n log n) | O(n) | Use balanced BST for finding ceiling/floor |
| Optimal | O(n log n) | O(n) | Dominated by sorting step |

## Common Mistakes

1. **Processing forward instead of backward**
   ```python
   # Wrong: Can't determine reachability going forward
   for i in range(n):
       if odd_jump_possible[i]:
           odd_jump_possible[next_position] = True

   # Correct: Work backward from end
   odd[n-1] = even[n-1] = True
   for i in range(n-2, -1, -1):
       if next_odd[i] != -1:
           odd[i] = even[next_odd[i]]
       if next_even[i] != -1:
           even[i] = odd[next_even[i]]
   ```

2. **Confusing odd and even jump logic**
   ```python
   # Wrong: Same logic for both jump types
   for i in range(n):
       next_idx = find_next_greater(arr, i)  # Used for both

   # Correct: Different logic for each
   # Odd jump: smallest value >= arr[i], leftmost if tie
   # Even jump: largest value <= arr[i], leftmost if tie
   def make_odd_jumps():
       # Sort by (value, index)
   def make_even_jumps():
       # Sort by (-value, index)
   ```

3. **Not handling the "leftmost on tie" requirement**
   ```python
   # Wrong: Not considering index when values are equal
   indices.sort(key=lambda i: arr[i])

   # Correct: Secondary sort by index for ties
   # Odd jumps
   indices.sort(key=lambda i: (arr[i], i))
   # Even jumps
   indices.sort(key=lambda i: (-arr[i], i))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Jump Game | Medium | Each element defines max jump distance |
| Jump Game II | Medium | Find minimum jumps to reach end |
| Jump Game III | Medium | Can jump forward or backward by arr[i] steps |
| Minimum Jumps to Reach Home | Medium | Forbidden positions and bidirectional jumps |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved (O(n log n))
- [ ] Clean, readable code
- [ ] Handled all edge cases (single element, duplicate values, no valid jumps)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
