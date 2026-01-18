---
id: M481
old_id: A349
slug: reachable-nodes-in-subdivided-graph
title: Reachable Nodes In Subdivided Graph
difficulty: medium
category: medium
topics: ["array", "graph"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/data-structures/graphs.md
---
# Reachable Nodes In Subdivided Graph

## Problem

Imagine you're designing a network routing system where some connections have intermediate relay stations. You start with a simple graph of `n` nodes numbered `0` to `n - 1`, but each edge can contain multiple intermediate nodes that data must pass through.

You're given a graph structure as a 2D array `edges` where each element `edges[i] = [ui, vi, cnti]` tells you:
- There's a connection between nodes `ui` and `vi` in the original graph
- This connection has `cnti` intermediate relay nodes inserted along the path
- When `cnti == 0`, it's a direct connection with no intermediate nodes

Think of it like this: if you have an edge `[0, 1, 2]`, the connection from node 0 to node 1 actually looks like a chain: `0 → relay₁ → relay₂ → 1`. That single edge becomes a path of 3 individual hops.

Starting from node `0`, you have a limited number of moves (`maxMoves`). Each hop to an adjacent node (whether original or relay) consumes one move. Your goal is to count how many total nodes you can reach within your move budget.

**Diagram:**

```
Original Graph:           Subdivided Graph:
    0 ------- 1              0 - x1 - x2 - 1
    |         |              |             |
    |         |              x3            x4
    |         |              |             |
    2 ------- 3              2 - x5 - x6 - 3

Example: Edge [0,1,2] means insert 2 nodes between 0 and 1
Result: 0 - x1 - x2 - 1 (chain of 3 edges)

If maxMoves = 3 from node 0:
- Can reach: 0, x1, x2, 1 (distance ≤ 3)
- Cannot reach: nodes beyond distance 3
```


## Why This Matters

This problem mirrors real-world network engineering challenges. Consider a telecommunications network where fiber optic cables have repeater stations, a delivery route with intermediate waypoints, or a data center network with switches between servers. The problem teaches you to work with weighted shortest path algorithms in scenarios where edges themselves contain additional nodes. You'll develop skills in handling graph transformations and optimizing path calculations under constraints - essential for network optimization, resource allocation systems, and distributed computing infrastructure. The techniques here apply directly to problems like finding optimal routes through networks with varying connection costs or determining service coverage areas with limited resources.

## Examples

**Example 1:**
- Input: `edges = [[0,1,4],[1,2,6],[0,2,8],[1,3,1]], maxMoves = 10, n = 4`
- Output: `23`

**Example 2:**
- Input: `edges = [[1,2,4],[1,4,5],[1,3,1],[2,3,4],[3,4,5]], maxMoves = 17, n = 5`
- Output: `1`
- Explanation: Node 0 has no connections to other nodes in the graph, making it isolated. Therefore, only node 0 itself is reachable.

## Constraints

- 0 <= edges.length <= min(n * (n - 1) / 2, 10⁴)
- edges[i].length == 3
- 0 <= ui < vi < n
- There are **no multiple edges** in the graph.
- 0 <= cnti <= 10⁴
- 0 <= maxMoves <= 10⁹
- 1 <= n <= 3000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Array Pattern](../strategies/data-structures/graphs.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a shortest path problem with a twist: edges have "subdivided" nodes that you can partially traverse. Use Dijkstra's algorithm to find shortest distances from node 0, tracking how many moves remain when you reach each original node. For subdivided nodes on each edge, count how many you can reach from both endpoints combined (being careful not to double-count).
</details>

<details>
<summary>🎯 Main Approach</summary>
Run Dijkstra's algorithm from node 0, maintaining distances to all original nodes. For each edge [u, v, cnt], calculate how many subdivided nodes are reachable: from u, you can reach min(moves_left_at_u, cnt) nodes; from v, you can reach min(moves_left_at_v, cnt) nodes. The total reachable on this edge is min(cnt, reachable_from_u + reachable_from_v). Sum all reachable original nodes plus subdivided nodes.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a priority queue for Dijkstra's algorithm to efficiently get the next closest node. When processing an edge, track how many subdivided nodes you've "used" from each direction to avoid counting the same node twice. Store the graph as an adjacency list with edge weights equal to cnt+1 (the number of steps to traverse the entire edge).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS (Wrong) | O(V + E) | O(V) | Doesn't handle weighted edges correctly |
| Dijkstra's Algorithm | O((V + E) log V) | O(V + E) | V = original nodes, E = edges |
| Optimal | O((V + E) log V) | O(V + E) | Priority queue with adjacency list |

## Common Mistakes

1. **Using BFS instead of Dijkstra's**
   ```python
   # Wrong: BFS doesn't work for weighted graphs
   queue = deque([0])
   visited = {0}
   while queue:
       node = queue.popleft()
       # BFS assumes all edges have weight 1

   # Correct: Use Dijkstra's with priority queue
   import heapq
   pq = [(0, 0)]  # (distance, node)
   dist = {0: 0}
   while pq:
       d, node = heapq.heappop(pq)
   ```

2. **Double-counting subdivided nodes**
   ```python
   # Wrong: Counting nodes reached from both directions without limit
   reachable = moves_from_u + moves_from_v

   # Correct: Cap at the actual number of subdivided nodes
   reachable = min(cnt, moves_from_u + moves_from_v)
   ```

3. **Not handling disconnected components**
   ```python
   # Wrong: Assuming all nodes are reachable
   return len(dist) + subdivided_count

   # Correct: Only count nodes actually reached by Dijkstra
   reachable_original = sum(1 for node in range(n) if node in dist)
   return reachable_original + subdivided_count
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Network Delay Time | Medium | Standard Dijkstra's, find maximum distance |
| Path with Maximum Probability | Medium | Dijkstra's variant maximizing probability product |
| Cheapest Flights Within K Stops | Medium | Modified Dijkstra's with hop constraint |
| Minimum Cost to Reach Destination | Hard | Dijkstra's with edge restrictions |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Graphs - Dijkstra's Algorithm](../../strategies/data-structures/graphs.md)
