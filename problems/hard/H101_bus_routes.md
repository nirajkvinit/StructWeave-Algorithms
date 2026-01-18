---
id: H101
old_id: A282
slug: bus-routes
title: Bus Routes
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Bus Routes

## Problem

You have access to a bus system represented by an array `routes`, where each element `routes[i]` contains the sequence of stops that bus `i` visits in a continuous loop.

	- As an illustration, when `routes[0] = [1, 5, 7]`, bus 0 cycles through stops in the pattern `1 -> 5 -> 7 -> 1 -> 5 -> 7 -> 1 -> ...` indefinitely.

Starting from bus stop `source` without being on any bus, you need to reach bus stop `target`. Movement between stops is only possible by boarding and riding buses.

Determine the minimum number of different buses required to complete the journey from `source` to `target`. If reaching the destination is impossible, return `-1`.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `routes = [[1,2,7],[3,6,7]], source = 1, target = 6`
- Output: `2`
- Explanation: An optimal approach involves riding the first bus to stop 7, then switching to the second bus to reach stop 6.

**Example 2:**
- Input: `routes = [[7,12],[4,5,15],[6],[15,19],[9,12,13]], source = 15, target = 12`
- Output: `-1`

## Constraints

- 1 <= routes.length <= 500.
- 1 <= routes[i].length <= 10⁵
- All the values of routes[i] are **unique**.
- sum(routes[i].length) <= 10⁵
- 0 <= routes[i][j] < 10⁶
- 0 <= source, target < 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

Think of this as a graph problem where buses (not stops) are nodes. Two buses are connected if they share at least one stop. You need to find the shortest path from any bus serving the source stop to any bus serving the target stop. The key breakthrough is realizing that minimizing bus transfers is equivalent to finding the shortest path in a bus-to-bus graph.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use BFS on the bus network. Create a mapping from stops to buses serving them. Start BFS from all buses that contain the source stop. For each bus in the queue, check all its stops, and for each stop, explore all other buses serving that stop (these are your neighbors in the bus graph). Track visited buses to avoid cycles. Return the BFS level when you first encounter a bus containing the target stop.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

To avoid redundant work, mark stops as visited in addition to buses. Once you've explored all buses from a particular stop, you never need to process that stop again. This prevents re-exploring the same bus connections multiple times and reduces time complexity significantly.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(n^n) | O(n) | Try all bus sequences, exponential |
| Optimal BFS | O(n * m) | O(n * m) | n = number of buses, m = stops per bus |

## Common Mistakes

1. **Treating stops as graph nodes instead of buses**
   ```python
   # Wrong: BFS on stops creates incorrect transfer count
   queue = deque([source])
   for stop in queue:
       for bus in buses_at_stop[stop]:
           for next_stop in bus:
               queue.append(next_stop)  # Counts stops, not buses

   # Correct: BFS on buses
   queue = deque([(bus_idx, 1) for bus_idx in buses_with_source])
   for bus_idx, transfers in queue:
       for stop in routes[bus_idx]:
           for next_bus in buses_at_stop[stop]:
               if not visited_bus[next_bus]:
                   queue.append((next_bus, transfers + 1))
   ```

2. **Not handling source == target case**
   ```python
   # Wrong: Always performs BFS
   def solve(routes, source, target):
       return bfs(routes, source, target)

   # Correct: Early return for trivial case
   def solve(routes, source, target):
       if source == target:
           return 0
       return bfs(routes, source, target)
   ```

3. **Revisiting the same stop multiple times**
   ```python
   # Wrong: Only tracking visited buses
   visited_buses = set()
   # This allows processing same stop many times

   # Correct: Track both visited buses and stops
   visited_buses = set()
   visited_stops = set()
   if stop not in visited_stops:
       visited_stops.add(stop)
       # Process buses at this stop
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Transfers with Costs | Hard | Each bus has a cost, minimize total cost |
| Bus Routes with Time Windows | Hard | Buses run at specific times, minimize wait time |
| Multi-Modal Transportation | Hard | Multiple transport types (bus, train, ferry) |
| K-Stop Bus Routes | Medium | Find routes with at most K transfers |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (source == target, no path exists)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [BFS Pattern](../../strategies/patterns/breadth-first-search.md)
