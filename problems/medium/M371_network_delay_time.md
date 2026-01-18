---
id: M371
old_id: A210
slug: network-delay-time
title: Network Delay Time
difficulty: medium
category: medium
topics: ["graph", "shortest-path", "heap"]
patterns: ["dijkstra", "bfs"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - id: M226
    title: Cheapest Flights Within K Stops
    difficulty: medium
  - id: M354
    title: The Maze II
    difficulty: medium
  - id: M329
    title: Path with Maximum Probability
    difficulty: medium
prerequisites:
  - Graph Representation (Adjacency List)
  - Dijkstra's Algorithm
  - Priority Queue/Heap
  - BFS
strategy_ref: ../strategies/patterns/graph-algorithms.md
---
# Network Delay Time

## Problem

Imagine a network of computers where signals take time to travel between them. You have `n` nodes (computers) numbered from `1` to `n`, connected by directed communication channels. The network topology is defined by an array `times`, where each entry `times[i] = [ui, vi, wi]` describes a one-way connection:
- `ui`: the source node sending the signal
- `vi`: the destination node receiving the signal
- `wi`: the time (in seconds, milliseconds, etc.) for the signal to travel from `ui` to `vi`

You send a signal from a starting node `k`. This signal propagates through the network along the available connections, with each node immediately forwarding the signal to its neighbors once received. Your task is to calculate the minimum time needed for all `n` nodes to receive the signal at least once.

However, network connectivity isn't guaranteed. If any node cannot be reached from the starting node `k` (perhaps it's isolated or only has incoming connections from unreachable nodes), return `-1` to indicate the signal cannot reach the entire network.

Think of this like broadcasting a message through a relay network where each relay station has a specific delay before it can forward the message onward. The answer is the time when the slowest node finally receives the signal.

**Diagram:**

Network delay example:
```
Graph representation (times = [[2,1,1],[2,3,1],[3,4,1]], n=4, k=2):

    1 <──1── 2 (source)
             │
             1
             ↓
             3
             │
             1
             ↓
             4

Signal propagation times from node 2:
- Node 2: 0 (source)
- Node 1: 1 (direct)
- Node 3: 1 (direct)
- Node 4: 2 (via node 3)

Maximum delay: 2
```


## Why This Matters

This problem models real-world scenarios like network packet routing, blockchain transaction propagation, and distributed system synchronization. It's a classic single-source shortest path problem, which forms the foundation for routing protocols (like OSPF), GPS navigation systems, and social network analysis. Mastering this teaches you Dijkstra's algorithm, one of the most important graph algorithms in computer science. This problem appears frequently in technical interviews at companies building distributed systems, networking infrastructure, or any application involving weighted graph traversal.

## Examples

**Example 1:**
- Input: `times = [[1,2,1]], n = 2, k = 1`
- Output: `1`
- Explanation: Node 1 transmits to node 2 in 1 time unit.

**Example 2:**
- Input: `times = [[1,2,1]], n = 2, k = 2`
- Output: `-1`
- Explanation: Node 1 cannot be reached from node 2, making complete signal propagation impossible.

## Constraints

- 1 <= k <= n <= 100
- 1 <= times.length <= 6000
- times[i].length == 3
- 1 <= ui, vi <= n
- ui != vi
- 0 <= wi <= 100
- All the pairs (ui, vi) are **unique**. (i.e., no multiple edges.)

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Recognize as Single-Source Shortest Path</summary>

This is a classic single-source shortest path problem. You need to find the shortest path from source node `k` to all other nodes in a weighted directed graph.

The answer is the maximum of all shortest paths. If any node is unreachable, return -1.

Key algorithms to consider:
- **Dijkstra's Algorithm**: Best for graphs with non-negative weights (which this has)
- **Bellman-Ford**: Works with negative weights but slower
- **BFS**: Only works for unweighted graphs (not applicable here)

</details>

<details>
<summary>Hint 2: Dijkstra's Algorithm Implementation</summary>

Implement Dijkstra's algorithm using a min-heap (priority queue):

1. Build an adjacency list from the `times` array
2. Initialize distances: `dist[k] = 0`, all others to infinity
3. Use a min-heap starting with `(0, k)` (distance, node)
4. For each node popped from heap:
   - If already processed with a better distance, skip
   - For each neighbor, if we found a shorter path, update distance and add to heap
5. After processing, check if all nodes were reached

The time when all nodes receive the signal is `max(dist[1], dist[2], ..., dist[n])`.

</details>

<details>
<summary>Hint 3: Implementation Details and Edge Cases</summary>

Key implementation considerations:

1. **Graph representation**: Use adjacency list `graph[u] = [(v, w), ...]`
2. **Visited tracking**: Track which nodes have been processed to avoid reprocessing
3. **Distance initialization**: Use a dictionary or array with initial value infinity
4. **Final check**: Count how many nodes have finite distance. If less than `n`, return -1

Python tip: Use `heapq` for the priority queue. Store tuples as `(distance, node)` so the heap naturally orders by distance.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS/BFS (unweighted) | O(V + E) | O(V) | Incorrect - doesn't handle weights |
| Bellman-Ford | O(V * E) | O(V) | Works but slower than needed |
| Dijkstra (naive) | O(V^2) | O(V) | Using linear search for minimum |
| Dijkstra (heap) | O((V + E) log V) | O(V + E) | Optimal for this problem |
| Dijkstra (Fibonacci heap) | O(E + V log V) | O(V + E) | Theoretical optimum, complex implementation |

## Common Mistakes

### Mistake 1: Using BFS for Weighted Graph
```python
# Wrong: BFS doesn't account for edge weights
def networkDelayTime(times, n, k):
    graph = build_graph(times)
    queue = [k]
    visited = {k}
    time = 0
    while queue:
        # BFS finds shortest path by edge count, not by weight
        for _ in range(len(queue)):
            node = queue.pop(0)
            for neighbor, weight in graph[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        time += 1
    # This doesn't give correct weighted distances
```

**Fix:** Use Dijkstra's algorithm with priority queue:
```python
# Correct: Dijkstra handles weighted edges
import heapq
def networkDelayTime(times, n, k):
    graph = build_graph(times)
    heap = [(0, k)]  # (distance, node)
    dist = {}
    while heap:
        d, node = heapq.heappop(heap)
        if node in dist:
            continue
        dist[node] = d
        for neighbor, weight in graph[node]:
            if neighbor not in dist:
                heapq.heappush(heap, (d + weight, neighbor))
```

### Mistake 2: Not Checking if All Nodes are Reachable
```python
# Wrong: Returns max distance without checking if all nodes reached
def networkDelayTime(times, n, k):
    dist = dijkstra(times, k)
    return max(dist.values())  # What if some nodes aren't in dist?
```

**Fix:** Verify all n nodes are reachable:
```python
# Correct: Check if all nodes reached
def networkDelayTime(times, n, k):
    dist = dijkstra(times, k)
    if len(dist) < n:  # Not all nodes reached
        return -1
    return max(dist.values())
```

### Mistake 3: Reprocessing Nodes with Worse Distances
```python
# Wrong: Not checking if node already processed with better distance
while heap:
    d, node = heapq.heappop(heap)
    # Processes node even if we've seen it with better distance
    for neighbor, weight in graph[node]:
        new_dist = d + weight
        heapq.heappush(heap, (new_dist, neighbor))
    # This causes unnecessary work and potential errors
```

**Fix:** Skip if already processed:
```python
# Correct: Only process each node once with best distance
while heap:
    d, node = heapq.heappop(heap)
    if node in dist:  # Already processed with better/equal distance
        continue
    dist[node] = d
    for neighbor, weight in graph[node]:
        if neighbor not in dist:
            heapq.heappush(heap, (d + weight, neighbor))
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Cheapest Flights Within K Stops | Shortest path with hop limit constraint | Medium |
| Path with Maximum Probability | Maximize probability instead of minimize time | Medium |
| Network Delay with Multiple Sources | Multiple simultaneous signal sources | Medium |
| Dynamic Network Delay | Edges can be added/removed over time | Hard |
| All-Pairs Shortest Paths | Find delay between every pair of nodes | Hard |

## Practice Checklist

- [ ] First attempt (within 30 minutes)
- [ ] Implement Dijkstra's algorithm correctly
- [ ] Build adjacency list from edge list
- [ ] Handle unreachable nodes correctly
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Can explain why Dijkstra works here
- [ ] Attempted Cheapest Flights variation

**Strategy**: See [Graph Algorithms Pattern](../strategies/patterns/graph-algorithms.md)
