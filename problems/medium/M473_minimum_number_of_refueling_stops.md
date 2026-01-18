---
id: M473
old_id: A338
slug: minimum-number-of-refueling-stops
title: Minimum Number of Refueling Stops
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Minimum Number of Refueling Stops

## Problem

Picture yourself planning a road trip across a long highway. Your car has a certain amount of fuel to start, and there are gas stations scattered along the route. You need to reach your destination using the fewest possible refueling stops.

Your vehicle needs to travel `target` miles eastward. Gas stations are positioned along the route, each described in the `stations` array as `[position, fuel]`, where `position` is the station's distance from the start in miles, and `fuel` is the amount of fuel available at that station.

Your vehicle starts with `startFuel` liters of gas in an unlimited-capacity tank. The car uses exactly 1 liter per mile traveled. When you stop at a station, you take all available fuel from that station (you can't partially refuel).

Find the minimum number of refueling stops needed to reach your destination. Return `-1` if the journey is impossible.

**Important details**: You can refuel even if your tank is empty when you arrive at a station. Reaching the target with exactly 0 fuel counts as success.

## Why This Matters

This problem models real-world route optimization challenges faced by logistics companies planning delivery routes, electric vehicle charging station placement algorithms, and airline fuel stop optimization for long-haul flights. The "greedy with hindsight" strategy you'll develop here (choosing the best stations retroactively) is used in resource allocation systems, emergency response planning where you need to minimize supply depot visits, and even in financial planning where you optimize when to liquidate assets to meet cash flow needs.

## Examples

**Example 1:**
- Input: `target = 1, startFuel = 1, stations = []`
- Output: `0`
- Explanation: Initial fuel is sufficient to reach the destination without stopping.

**Example 2:**
- Input: `target = 100, startFuel = 1, stations = [[10,100]]`
- Output: `-1`
- Explanation: The first station is 10 miles away, but we only have 1 liter, making it unreachable.

**Example 3:**
- Input: `target = 100, startFuel = 10, stations = [[10,60],[20,30],[30,30],[60,40]]`
- Output: `2`
- Explanation: Starting with 10 liters:
Travel 10 miles to first station (0 liters remaining), refuel to 60 liters.
Travel 50 miles to station at position 60 (10 liters remaining), refuel to 50 liters.
Travel final 40 miles to destination.
Total stops: 2.

## Constraints

- 1 <= target, startFuel <= 10⁹
- 0 <= stations.length <= 500
- 1 <= positioni < positioni₊₁ < target
- 1 <= fueli < 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use a greedy strategy with a max heap: as you travel, add all reachable stations' fuel to a heap without actually stopping. When you run out of fuel before reaching the target, retroactively "refuel" at the station that had the most fuel (pop from heap). This minimizes the number of stops while maximizing distance covered.
</details>

<details>
<summary>🎯 Main Approach</summary>
Maintain current fuel and position. Iterate through stations in order. For each station within reach (position ≤ current_fuel), add its fuel to a max heap. When you can't reach the next station or target, pop the largest fuel from the heap, refuel, and increment stop count. Continue until you reach the target or determine it's impossible (heap is empty but target not reached).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a max heap (priority queue) to efficiently track the best stations to refuel at. Only add stations you've passed (within current range). This greedy approach ensures you always use the most valuable stations. Time complexity: O(n log n) where n is the number of stations.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Dynamic Programming | O(n^2) | O(n) | dp[i] = max fuel with i stops |
| Greedy + Max Heap | O(n log n) | O(n) | Optimal approach |

## Common Mistakes

1. **Stopping at stations immediately**
   ```python
   # Wrong: Deciding to stop at each station as you encounter it
   for station in stations:
       if current_fuel >= station[0]:
           current_fuel += station[1]
           stops += 1

   # Correct: Use heap to retroactively choose best stations
   import heapq
   heap = []
   for station in stations:
       if current_fuel >= station[0]:
           heapq.heappush(heap, -station[1])  # max heap
       while current_fuel < target and heap:
           current_fuel += -heapq.heappop(heap)
           stops += 1
   ```

2. **Not checking if target is reachable initially**
   ```python
   # Wrong: Not handling case where target is reachable with start fuel
   if startFuel >= target:
       return 0  # Add this check

   # Correct: Handle base case before main algorithm
   if startFuel >= target:
       return 0
   # Then proceed with main logic
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Jump Game II | Medium | Minimum jumps to reach end |
| Minimum Cost to Reach Destination | Medium | Cost optimization instead of stops |
| Gas Station | Medium | Circular array, different constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy with Heap](../../strategies/patterns/greedy.md)
