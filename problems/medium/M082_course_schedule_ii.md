---
id: M082
old_id: I010
slug: course-schedule-ii
title: Course Schedule II
difficulty: medium
category: medium
topics: ["array", "topological-sort"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/topological-sort.md
frequency: high
related_problems: ["M079", "M269", "M310"]
prerequisites: ["graph-representation", "topological-sort", "dfs", "bfs"]
---
# Course Schedule II

## Problem

You need to complete `numCourses` courses, numbered from `0` to `numCourses - 1`. The `prerequisites` array contains entries `prerequisites[i] = [ai, bi]` where course `bi` must be completed before starting course `ai`. For example, the pair `[0, 1]` indicates that to take course `0` you have to first take course `1`. Your task is to find a valid sequence in which to take all courses, respecting all prerequisite relationships. If multiple valid sequences exist, return any one of them. If completing all courses is impossible due to circular dependencies (like course A requires B, B requires C, and C requires A), return an empty array. This is fundamentally a graph problem where courses are nodes and prerequisites are directed edges. You're being asked to find a topological ordering, which arranges nodes such that all edges point forward in the sequence. Edge cases include courses with no prerequisites, multiple independent course chains, and the critical case where circular dependencies make completion impossible.

## Why This Matters

Course scheduling is just one application of topological sorting, a fundamental algorithm in computer science. Build systems like Make, Maven, and Gradle use topological sort to determine compilation order, ensuring dependencies are built before dependent code. Package managers (npm, pip, apt) rely on it to resolve installation order without breaking dependencies. In project management, it determines task ordering when some tasks depend on others completing first. Compiler design uses it for symbol resolution and code generation phases. Database query optimizers apply topological sorting to determine join order. Detecting circular dependencies is equally critical in detecting deadlocks in concurrent systems, preventing infinite loops in spreadsheet formulas, and validating configuration files. This problem teaches you to model dependency relationships as graphs and process them systematically, a skill that transfers to countless real-world scheduling and ordering problems.

## Examples

**Example 1:**
- Input: `numCourses = 2, prerequisites = [[1,0]]`
- Output: `[0,1]`
- Explanation: There are a total of 2 courses to take. To take course 1 you should have finished course 0. So the correct course order is [0,1].

**Example 2:**
- Input: `numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]`
- Output: `[0,2,1,3]`
- Explanation: There are a total of 4 courses to take. To take course 3 you should have finished both courses 1 and 2. Both courses 1 and 2 should be taken after you finished course 0.
So one correct course order is [0,1,2,3]. Another correct ordering is [0,2,1,3].

**Example 3:**
- Input: `numCourses = 1, prerequisites = []`
- Output: `[0]`

## Constraints

- 1 <= numCourses <= 2000
- 0 <= prerequisites.length <= numCourses * (numCourses - 1)
- prerequisites[i].length == 2
- 0 <= ai, bi < numCourses
- ai != bi
- All the pairs [ai, bi] are **distinct**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Building on Course Schedule I</summary>

This is an extension of the Course Schedule problem. You still need to detect cycles (if cycle exists, return empty array), but now you also need to record a valid ordering. The ordering comes naturally from either DFS (post-order) or BFS (topological sort with Kahn's algorithm).

</details>

<details>
<summary>🎯 Hint 2: Two Valid Approaches</summary>

**DFS Approach**: Perform DFS, adding courses to result in post-order (after visiting all dependencies). Reverse the result at the end.

**BFS (Kahn's) Approach**: Start with courses having no prerequisites (in-degree 0). Process them, reducing in-degrees of dependent courses. Add courses to result as you process them. If you process all courses, you have a valid ordering.

</details>

<details>
<summary>📝 Hint 3: Kahn's Algorithm (Recommended)</summary>

Pseudocode:
```
1. Build adjacency list and in-degree array
2. Create queue with all courses having in-degree 0
3. Initialize result array

while queue not empty:
    course = queue.dequeue()
    result.append(course)

    for each neighbor of course:
        neighbor_in_degree -= 1
        if neighbor_in_degree == 0:
            queue.enqueue(neighbor)

if result.length == numCourses:
    return result
else:
    return []  // Cycle detected
```

Time: O(V + E), Space: O(V + E)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Permutations | O(n! × m) | O(n) | Try all orderings, check validity - impractical |
| **BFS Kahn's Algorithm** | **O(V + E)** | **O(V + E)** | Process each node once, each edge once. Clean and intuitive |
| DFS Post-Order | O(V + E) | O(V + E) | Equally efficient, requires reversing result |
| DFS with Stack | O(V + E) | O(V + E) | Iterative version, avoids recursion depth issues |

## Common Mistakes

**Mistake 1: Forgetting to reverse DFS post-order result**

```python
# Wrong - DFS post-order gives reverse topological order
def findOrder(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        graph[b].append(a)

    result = []
    state = [0] * numCourses

    def dfs(course):
        if state[course] == 1: return False
        if state[course] == 2: return True

        state[course] = 1
        for neighbor in graph[course]:
            if not dfs(neighbor):
                return False
        state[course] = 2
        result.append(course)  # This builds reverse order!
        return True

    for i in range(numCourses):
        if state[i] == 0:
            if not dfs(i):
                return []

    return result  # Wrong! Should reverse
```

```python
# Correct - Reverse the DFS result
def findOrder(numCourses, prerequisites):
    # ... same as above ...
    for i in range(numCourses):
        if state[i] == 0:
            if not dfs(i):
                return []

    return result[::-1]  # Reverse for correct order
```

**Mistake 2: Not checking if all courses were processed**

```python
# Wrong - Doesn't detect cycles properly
def findOrder(numCourses, prerequisites):
    graph, in_degree = build_graph(numCourses, prerequisites)
    queue = [i for i in range(numCourses) if in_degree[i] == 0]
    result = []

    while queue:
        course = queue.pop(0)
        result.append(course)
        for neighbor in graph[course]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return result  # Wrong! Might have cycle, need to verify length
```

```python
# Correct - Verify all courses processed
def findOrder(numCourses, prerequisites):
    # ... same logic ...
    while queue:
        course = queue.pop(0)
        result.append(course)
        for neighbor in graph[course]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return result if len(result) == numCourses else []
```

**Mistake 3: Building graph with wrong edge direction**

```python
# Wrong - Edge direction reversed
def findOrder(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        graph[a].append(b)  # Wrong! a depends on b, so b -> a
```

```python
# Correct - Edge from prerequisite to dependent course
def findOrder(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    in_degree = [0] * numCourses

    for a, b in prerequisites:
        graph[b].append(a)  # b must come before a
        in_degree[a] += 1
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Course Schedule | Medium | Just detect if ordering is possible (no need to return it) |
| Course Schedule III | Hard | Select maximum courses within time constraints |
| Alien Dictionary | Hard | Derive character order from sorted alien words |
| Sequence Reconstruction | Medium | Verify if sequences can uniquely determine order |
| Minimum Height Trees | Medium | Find roots that minimize tree height |

## Practice Checklist

- [ ] Day 1: Solve using BFS (Kahn's algorithm)
- [ ] Day 2: Solve using DFS post-order, remember to reverse
- [ ] Day 7: Re-solve from scratch, pick the approach you understand better
- [ ] Day 14: Solve without looking at previous code, explain why it works
- [ ] Day 30: Implement both approaches and compare their pros/cons

**Strategy**: See [Array Pattern](../strategies/patterns/topological-sort.md)
