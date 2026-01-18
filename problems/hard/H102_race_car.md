---
id: H102
old_id: A285
slug: race-car
title: Race Car
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Race Car

## Problem

A vehicle is positioned at coordinate `0` with an initial speed of `+1` on an unbounded number line that extends infinitely in both directions. The vehicle responds to two types of commands: `'A'` (accelerate) and `'R'` (reverse).

	- Executing command `'A'` triggers these actions:

    	- `position += speed`
    	- `speed *= 2`

    - Executing command `'R'` triggers these actions:

    	- When current speed is positive: set `speed = -1`
    	- When current speed is negative: set `speed = 1`

    The position remains unchanged during reverse operations.

As a demonstration, the command sequence `"AAR"` produces position transitions `0 --> 1 --> 3 --> 3` with corresponding speed changes `1 --> 2 --> 4 --> -1`.

For a specified target position `target`, determine the minimum number of instructions needed to reach that position.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `target = 3`
- Output: `2`
- Explanation: Using "AA" as the command sequence results in position progression 0 --> 1 --> 3.

**Example 2:**
- Input: `target = 6`
- Output: `5`
- Explanation: The optimal sequence "AAARA" produces position changes 0 --> 1 --> 3 --> 7 --> 7 --> 6.

## Constraints

- 1 <= target <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

The position after k consecutive 'A' commands follows the pattern 2^k - 1 (0→1→3→7→15...). Since you can overshoot and reverse, consider two strategies: (1) accelerate to just before target, reverse, fine-tune backward, then reverse and reach; (2) accelerate past target, reverse, and come back. The minimum comes from exploring both.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use BFS with state (position, speed) or dynamic programming. For DP, define dp[i] as minimum instructions to reach position i. For each position, try: (1) accelerate k times to reach 2^k - 1, if it goes past i, reverse and solve for the gap; (2) accelerate k-1 times, reverse, go back j steps, reverse again, then cover remaining distance. Use memoization to cache results.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Instead of exploring infinite states with BFS, use mathematical insight: you only need to consider accelerating to positions near target (within 2*target range). For DP, observe that if you accelerate to position p = 2^k - 1 where p >= target, you have limited useful patterns. Prune states by bounding position to [-target, 2*target] to avoid infinite exploration.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS | O(T log T) | O(T log T) | T = target, exploring states within bounds |
| DP with Memoization | O(T log T) | O(T) | Cache subproblem results |
| Optimal Mathematical DP | O(T log T) | O(T) | Enumerate acceleration patterns |

## Common Mistakes

1. **Unbounded BFS exploration**
   ```python
   # Wrong: Exploring all possible positions infinitely
   queue = deque([(0, 1, 0)])  # position, speed, moves
   while queue:
       pos, speed, moves = queue.popleft()
       queue.append((pos + speed, speed * 2, moves + 1))
       # No bounds check - infinite states

   # Correct: Bound exploration space
   queue = deque([(0, 1, 0)])
   visited = {(0, 1)}
   while queue:
       pos, speed, moves = queue.popleft()
       if abs(pos) > 2 * target:
           continue  # Prune far positions
       # Add valid next states only
   ```

2. **Not considering backward movement patterns**
   ```python
   # Wrong: Only considering forward acceleration
   def dp(pos):
       if pos == target:
           return 0
       # Only try accelerating forward
       return 1 + dp(pos + speed)

   # Correct: Consider reverse and backward adjustments
   def dp(pos):
       if pos == target:
           return 0
       # Try: accelerate forward OR reverse and adjust
       option1 = accelerate_pattern(pos)
       option2 = reverse_and_adjust(pos)
       return min(option1, option2)
   ```

3. **Incorrect speed reset logic**
   ```python
   # Wrong: Not resetting speed correctly on reverse
   if command == 'R':
       speed = -speed  # Wrong for both positive and negative

   # Correct: Reset to +1 or -1 based on current direction
   if command == 'R':
       speed = -1 if speed > 0 else 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Race Car with Obstacles | Hard | Can't occupy certain positions |
| Multi-Speed Race Car | Hard | Different acceleration rates available |
| Race Car with Fuel Limit | Hard | Limited number of operations |
| Bidirectional Race Car | Medium | Can accelerate in reverse initially |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (small targets, power-of-2 targets)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
