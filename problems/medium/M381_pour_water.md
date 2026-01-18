---
id: M381
old_id: A222
slug: pour-water
title: Pour Water
difficulty: medium
category: medium
topics: ["array"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Pour Water

## Problem

Imagine pouring water onto a stepped terrain, like pouring water onto a staircase. Given an elevation map represented by an integer array `heights`, where `heights[i]` is the ground height at position `i`, simulate pouring `volume` droplets of water at position `k`. Your task is to determine where the water settles and return the final heights including both terrain and water.

Each position has width 1, and water flows according to gravity-like physics. When you pour a droplet at index `k`, it lands on top of whatever is already there (terrain or previously settled water). Then it flows following these priority rules:

1. **Left preference**: The droplet tries to flow left first. It will move left if it can eventually reach a position with lower total height by going in that direction.
2. **Right fallback**: If moving left doesn't lead to lower ground, the droplet tries flowing right.
3. **Stay put**: If neither left nor right leads to lower ground, the droplet stays at position `k`.

The key phrase **"ultimately lead to a lower elevation"** means the droplet looks ahead in that direction until it either finds lower ground or hits a rise. For example, if heights are `[3, 2, 2, 1]`, a droplet at index 1 can "ultimately" reach the lower position at index 3 by flowing left.

Important constraints: The terrain has infinitely high walls at both ends (water can't spill off the edges), and each water unit occupies exactly one position (no fractional distribution).


**Diagram:**

```
Water pouring simulation at index k:

Step 1: Initial terrain
Heights: [2, 1, 1, 2, 1, 2, 2]
         ■
         ■     ■ ■
       ■ ■ ■ ■ ■ ■ ■
Index:  0 1 2 3 4 5 6

Step 2: First drop at k=3
         ■
       ~ ■     ■ ■
       ■ ■ ■ ■ ■ ■ ■
(water settles at index 2)

Step 3: Second drop at k=3
       ~ ■
       ~ ■     ■ ■
       ■ ■ ■ ■ ■ ■ ■
(water settles at index 1)

Step 4: Third drop at k=3
       ~ ■
       ~ ■   ~ ■ ■
       ■ ■ ■ ■ ■ ■ ■
(water settles at index 4)

Step 5: Fourth drop at k=3
       ~ ■   ~
       ~ ■   ~ ■ ■
       ■ ■ ■ ■ ■ ■ ■
(water settles at index 3)

Legend: ■ = terrain, ~ = water
```


## Why This Matters

This problem simulates physical phenomena using discrete data structures, a core technique in computational physics, game development, and engineering simulations. Whether modeling water flow in terrain analysis, simulating particle movement in graphics engines, or designing irrigation systems, the ability to translate real-world physics into algorithmic rules is invaluable. The greedy left-then-right priority rule mirrors how many physics simulations work: testing conditions in order and taking the first valid action. This builds fundamental skills in simulation logic and step-by-step state management.

## Examples

**Example 1:**
- Input: `heights = [1,2,3,4], volume = 2, k = 2`
- Output: `[2,3,3,4]`
- Explanation: The final droplet comes to rest at position 1, as continuing leftward wouldn't result in reaching a lower elevation.

**Example 2:**
- Input: `heights = [3,1,3], volume = 5, k = 1`
- Output: `[4,4,4]`

## Constraints

- 1 <= heights.length <= 100
- 0 <= heights[i] <= 99
- 0 <= volume <= 2000
- 0 <= k < heights.length

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Simulate water physics: each drop falls at position k, then flows left if possible (seeking lowest point), otherwise flows right if possible, otherwise stays at k. The "ultimately lower" rule means we scan left/right until we hit a rising edge or boundary, tracking the lowest position encountered.
</details>

<details>
<summary>Main Approach</summary>
For each water unit: (1) Start at position k. (2) Scan left from k-1 to 0, tracking the lowest height; stop when height increases. (3) If no lower position found left, scan right from k+1 tracking lowest; stop when height increases. (4) Place water at the lowest position found (or k if none). (5) Update heights array.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of rescanning from k each time, you could track water levels separately from terrain. However, for the given constraints (volume <= 2000, length <= 100), the simulation approach is simple and efficient enough. Early termination when scanning (break on first increase) keeps it fast.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation | O(volume * n) | O(1) | Modify heights in-place; n = array length |
| Optimized Simulation | O(volume * n) | O(n) | Track water separately, same complexity |

## Common Mistakes

1. **Not checking left before right**
   ```python
   # Wrong: Check right first or check both simultaneously
   if can_flow_right:
       flow_right()

   # Correct: Left has priority over right
   if can_flow_left:
       flow_left()
   elif can_flow_right:
       flow_right()
   ```

2. **Misunderstanding "ultimately lower"**
   ```python
   # Wrong: Only check immediate neighbors
   if heights[k-1] < heights[k]:
       settle_at(k-1)

   # Correct: Scan until hitting a rise, track minimum
   lowest_pos = k
   for i in range(k-1, -1, -1):
       if heights[i] > heights[i+1]:
           break
       if heights[i] < heights[lowest_pos]:
           lowest_pos = i
   ```

3. **Forgetting to update heights**
   ```python
   # Wrong: Don't modify heights array
   water[pos] += 1  # separate tracking

   # Correct: Update heights to reflect water
   heights[pos] += 1  # water increases total height
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Trapping Rain Water | Medium | Calculate total water trapped, not simulation |
| Trapping Rain Water II | Hard | 2D version with priority queue |
| Container With Most Water | Medium | Find maximum area, not simulation |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Simulation](../../strategies/patterns/simulation.md)
