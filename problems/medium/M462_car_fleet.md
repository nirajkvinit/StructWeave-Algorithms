---
id: M462
old_id: A320
slug: car-fleet
title: Car Fleet
difficulty: medium
category: medium
topics: ["array", "linked-list"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/linked-lists.md
---
# Car Fleet

## Problem

Picture a highway with multiple cars all heading toward the same destination, but there's a catch: it's a single-lane road where no one can overtake. When a faster car catches up to a slower one, it must slow down and travel at the slower car's speed. From that point on, they move together as a unit.

You're given `n` cars on a highway, all traveling toward a target location that's `target` miles away. Each car has:
- `position[i]`: where car `i` starts on the highway (in miles from the start)
- `speed[i]`: how fast car `i` travels (in miles per hour)

A **car fleet** is one or more cars traveling together at the same position and speed. Even a single car traveling alone counts as a fleet. The key rule: when a faster car catches a slower car ahead, they form a fleet and continue together at the slower speed.

Important: If a car catches another exactly at the destination point, they still count as one fleet for that arrival.

Your task: Calculate how many distinct car fleets will arrive at the destination.

## Why This Matters

This problem models real-world traffic flow analysis and collision detection systems. Think about autonomous vehicle coordination where cars must calculate when they'll catch up to vehicles ahead, or delivery route optimization where trucks on the same route might consolidate. It also appears in process scheduling where tasks with different speeds might get blocked behind slower tasks, and in network packet transmission where data packets can't overtake each other on a single channel. The core skill is transforming a dynamic simulation problem into a static analysis using mathematical reasoning about arrival times.

## Examples

**Example 1:**
- Input: `target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]`
- Output: `3`
- Explanation: Car at position 10 (speed 2) and car at position 8 (speed 4) merge at the destination to form one fleet.
Car at position 0 never catches anyone and arrives as its own fleet.
Cars at positions 5 (speed 1) and 3 (speed 3) merge at position 6 and continue together as one fleet.
Total: 3 fleets arrive.

**Example 2:**
- Input: `target = 10, position = [3], speed = [3]`
- Output: `1`
- Explanation: With only one car, there's only one fleet.

**Example 3:**
- Input: `target = 100, position = [0,2,4], speed = [4,2,1]`
- Output: `1`
- Explanation: The car from position 0 catches the car from position 2, forming a fleet traveling at speed 2. This fleet then catches the car at position 4, creating a single fleet of all three cars traveling at speed 1.

## Constraints

- n == position.length == speed.length
- 1 <= n <= 10⁵
- 0 < target <= 10⁶
- 0 <= position[i] < target
- All the values of position are **unique**.
- 0 < speed[i] <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Cars can only merge if a faster car catches a slower car ahead. The key is to process cars from closest to target to farthest. Calculate each car's arrival time: (target - position) / speed. If a car behind takes longer or equal time to reach target than the car ahead, they form separate fleets.
</details>

<details>
<summary>🎯 Main Approach</summary>
Sort cars by starting position (descending - closest to target first). Calculate arrival time for each car. Use a stack or counter: iterate through sorted cars, and if current car's arrival time is greater than the previous car's, it forms a new fleet. Otherwise, it joins the previous fleet. Count the number of distinct arrival times (fleets).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of simulating the actual movement, just calculate when each car would arrive at the target without obstruction. Process from position closest to target backward. Use a monotonic stack approach: if current car arrives after the car ahead, it forms a new fleet. Track maximum arrival time seen so far.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation | O(n × max_time) | O(n) | Simulate each time unit - too slow |
| Sort + Stack | O(n log n) | O(n) | Sort by position, use stack for fleet tracking |
| Sort + Greedy | O(n log n) | O(1) | Sort and count fleets with single variable |

## Common Mistakes

1. **Processing cars in wrong order**
   ```python
   # Wrong: Processing from farthest to closest
   cars = sorted(zip(position, speed))  # Ascending order

   # Correct: Process from closest to target first
   cars = sorted(zip(position, speed), reverse=True)
   ```

2. **Incorrect fleet merging logic**
   ```python
   # Wrong: Comparing speeds instead of arrival times
   if speed[i] > speed[i+1]:
       fleets += 1

   # Correct: Compare arrival times
   time_to_target = (target - pos) / speed
   if time_to_target > prev_time:
       fleets += 1
       prev_time = time_to_target
   ```

3. **Not handling equal arrival times**
   ```python
   # Wrong: Treating equal times as separate fleets
   if arrival_time[i] != arrival_time[i-1]:
       fleets += 1

   # Correct: Cars arriving at same time or later join fleet
   # Use > not >= when comparing with max arrival time
   if arrival_time > max_arrival_time:
       fleets += 1
       max_arrival_time = arrival_time
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Car Fleet II | Hard | Calculate collision times between consecutive cars |
| Meeting Rooms II | Medium | Similar interval merging concept |
| Merge Intervals | Medium | Overlapping intervals without speed component |
| Maximum Performance of Team | Hard | Optimization with constraints, different objective |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Monotonic Stack](../../strategies/patterns/monotonic-stack.md)
