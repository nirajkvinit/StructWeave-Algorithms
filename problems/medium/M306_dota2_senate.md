---
id: M306
old_id: A116
slug: dota2-senate
title: Dota2 Senate
difficulty: medium
category: medium
topics: ["string", "queue", "greedy", "simulation"]
patterns: ["queue", "greedy"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E649", "M950", "E860"]
prerequisites: ["E232", "E860"]
---
# Dota2 Senate

## Problem

Imagine a senate with two competing political parties: Radiant and Dire. They're voting on a crucial proposal using a turn-based system where senators act in a specific order, round after round. On each senator's turn, they can choose one of two actions:

1. **Ban another senator's voting rights**: Permanently remove an opponent's ability to vote in this round and all future rounds
2. **Declare victory**: If all remaining active senators belong to your party, announce your party's win and end the process

You're given a string `senate` where each character represents a senator in turn order: `'R'` for Radiant party members and `'D'` for Dire party members. For example, `"RDD"` means a Radiant senator goes first, then two Dire senators.

The process works in rounds: in round 1, senators act left-to-right according to the string. Any senator who was banned skips their turn. After the last senator acts, round 2 begins again from the left, cycling through only the senators who haven't been banned. This continues until one party can declare victory.

Assume all senators play optimally (always make the best strategic decision for their party). Determine which party wins and return either `"Radiant"` or `"Dire"`.

Key insight: the optimal strategy is greedy - each senator should ban the next opponent who would act, not a random opponent or one far in the future. Banning the soonest-to-act opponent prevents them from banning your allies.

## Why This Matters

This problem models strategic decision-making in competitive scenarios where timing and order matter - similar to turn-based games, resource allocation with priorities, or process scheduling where tasks can preempt others. The greedy insight (always eliminate the next opponent) teaches you to recognize when local optimization leads to global optimality. The queue-based simulation pattern appears in event-driven systems, round-robin scheduling, and multiplayer game engines. Understanding how to track positions across multiple rounds while efficiently removing elements builds skills applicable to task schedulers, network packet processing, and any system managing ordered resources with dynamic removal.

## Examples

**Example 1:**
- Input: `senate = "RD"`
- Output: `"Radiant"`
- Explanation: The first senator comes from Radiant and he can just ban the next senator's right in round 1.
And the second senator can't exercise any rights anymore since his right has been banned.
And in round 2, the first senator can just announce the victory since he is the only guy in the senate who can vote.

**Example 2:**
- Input: `senate = "RDD"`
- Output: `"Dire"`
- Explanation: The first senator comes from Radiant and he can just ban the next senator's right in round 1.
And the second senator can't exercise any rights anymore since his right has been banned.
And the third senator comes from Dire and he can ban the first senator's right in round 1.
And in round 2, the third senator can just announce the victory since he is the only guy in the senate who can vote.

## Constraints

- n == senate.length
- 1 <= n <= 10⁴
- senate[i] is either 'R' or 'D'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Greedy Strategy - Ban Closest Opponent</summary>

The optimal strategy for each senator is to ban the closest upcoming opponent (greedy choice). Why?

If a Radiant senator has a turn, they should ban the nearest upcoming Dire senator. Banning a senator earlier in the queue is always better than banning one later because:
- It prevents that opponent from taking their turn sooner
- Maximizes your faction's control over subsequent rounds

This is a greedy algorithm where each senator makes the locally optimal choice, which leads to a globally optimal outcome.

</details>

<details>
<summary>Hint 2: Use Two Queues to Track Positions</summary>

Simulate the process using two queues:
- `radiant_queue`: stores indices of Radiant senators
- `dire_queue`: stores indices of Dire senators

Algorithm:
1. Initialize both queues with senator positions
2. While both queues are non-empty:
   - Compare front of each queue (smallest index goes first)
   - The senator with smaller index bans the other
   - Winner re-enters at position `index + n` (next round)
   - Loser is removed from queue
3. The faction with non-empty queue wins

The key insight: re-adding to queue with `index + n` maintains round-based ordering.

</details>

<details>
<summary>Hint 3: Implement Queue-Based Simulation</summary>

Implementation details:

```python
from collections import deque

radiant = deque()
dire = deque()

# Initialize queues with indices
for i, senator in enumerate(senate):
    if senator == 'R':
        radiant.append(i)
    else:
        dire.append(i)

# Simulate rounds
n = len(senate)
while radiant and dire:
    r_index = radiant.popleft()
    d_index = dire.popleft()

    if r_index < d_index:
        # Radiant bans Dire, Radiant continues to next round
        radiant.append(r_index + n)
    else:
        # Dire bans Radiant, Dire continues to next round
        dire.append(d_index + n)

return "Radiant" if radiant else "Dire"
```

Time: O(n), Space: O(n) for the queues.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two Queues | O(n) | O(n) | Optimal, each senator processed once |
| Simulation with Array | O(n²) | O(n) | Mark banned senators, multiple passes |
| Greedy with Counters | O(n) | O(1) | Track floating bans, trickier to implement |

**Recommended**: Two queues approach for clarity and optimal complexity.

## Common Mistakes

1. **Not handling circular rounds correctly**
```python
# Wrong: Not cycling back for next rounds
while radiant and dire:
    r = radiant.popleft()
    d = dire.popleft()
    if r < d:
        radiant.append(r)  # Wrong! Same index repeats
    else:
        dire.append(d)

# Correct: Add n to index for next round
while radiant and dire:
    r = radiant.popleft()
    d = dire.popleft()
    if r < d:
        radiant.append(r + n)  # Next round position
    else:
        dire.append(d + n)
```

2. **Removing from middle of queue**
```python
# Wrong: Trying to find and remove specific senator
while radiant and dire:
    current = min(radiant[0], dire[0])
    if current in radiant:
        # Remove closest dire senator - complex!
        next_dire = min([d for d in dire if d > current])
        dire.remove(next_dire)  # O(n) operation

# Correct: Use queue comparison, front elements are next to act
while radiant and dire:
    r = radiant.popleft()
    d = dire.popleft()
    if r < d:
        radiant.append(r + n)
    else:
        dire.append(d + n)
```

3. **Not comparing indices properly**
```python
# Wrong: Banning randomly instead of closest opponent
while radiant and dire:
    r = radiant.popleft()
    d = dire.popleft()
    # Both get banned? No! Only one survives
    radiant.append(r + n)
    dire.append(d + n)

# Correct: Only winner continues
while radiant and dire:
    r = radiant.popleft()
    d = dire.popleft()
    if r < d:
        radiant.append(r + n)  # Only Radiant continues
    else:
        dire.append(d + n)     # Only Dire continues
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| K Factions Senate | Hard | Multiple factions instead of just two |
| Weighted Voting | Hard | Senators have different voting powers |
| Alliance Formation | Hard | Senators can form temporary alliances |
| Limited Bans | Medium | Each senator can only ban k opponents |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Understand greedy strategy (ban closest opponent)
- [ ] Implement two-queue simulation
- [ ] Handle circular rounds with index + n technique
- [ ] Test with edge cases (all same faction, alternating pattern, RDD vs DRR)
- [ ] Trace through examples by hand to verify logic
- [ ] Compare to simpler greedy problems for pattern recognition
- [ ] Review after 1 day: Can you recall the queue approach?
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Review after 1 month: Solve a variation with k factions

**Strategy**: See [Queue Pattern](../strategies/data-structures/stacks-and-queues.md)
