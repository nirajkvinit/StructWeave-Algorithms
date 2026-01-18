---
id: M079
old_id: I007
slug: course-schedule
title: Course Schedule
difficulty: medium
category: medium
topics: ["array", "topological-sort"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/topological-sort.md
frequency: high
related_problems: ["M082", "M210", "M269"]
prerequisites: ["graph-representation", "cycle-detection", "dfs", "bfs"]
---
# Course Schedule

## Problem

You need to complete numCourses courses, labeled 0 through numCourses-1. Some courses have prerequisites - for example, to take Data Structures (course 1), you might first need to complete Programming Basics (course 0). You're given a prerequisites array where each pair [a, b] means "to take course a, you must first complete course b." Determine whether it's possible to complete all courses, or whether circular dependencies make it impossible. A circular dependency occurs when course A requires course B, which requires course C, which requires course A again - creating an impossible loop. This is fundamentally a graph problem: courses are nodes, prerequisites are directed edges, and you need to detect whether a cycle exists. If you can topologically sort the courses (arrange them in an order where all prerequisites come before dependent courses), then completion is possible. Consider edge cases like courses with no prerequisites, disconnected course groups, and direct cycles (A requires B, B requires A).

## Why This Matters

Dependency resolution is critical in package managers, build systems, and task scheduling. Package managers like npm, pip, and Maven use cycle detection to validate that software dependencies can be installed without conflicts - if package A depends on B v2.0, which depends on C, which depends on A v1.0, installation fails. Build systems like Make, Gradle, and Webpack employ topological sorting to determine the correct order to compile files, ensuring dependencies are built before dependent code. Project management tools use this algorithm to detect impossible task schedules where circular dependencies exist (task A blocks B, B blocks C, C blocks A). Database migration systems check for circular foreign key constraints. Job schedulers in operating systems apply dependency graphs to determine safe execution orders for concurrent processes. The cycle detection techniques you learn here - using DFS with three states (unvisited, visiting, visited) or BFS with in-degree counting - are fundamental algorithms you'll encounter in compiler design, deadlock detection, and any system with ordering constraints.

## Examples

**Example 1:**
- Input: `numCourses = 2, prerequisites = [[1,0]]`
- Output: `true`
- Explanation: There are a total of 2 courses to take.
To take course 1 you should have finished course 0. So it is possible.

**Example 2:**
- Input: `numCourses = 2, prerequisites = [[1,0],[0,1]]`
- Output: `false`
- Explanation: There are a total of 2 courses to take.
To take course 1 you should have finished course 0, and to take course 0 you should also have finished course 1. So it is impossible.

## Constraints

- 1 <= numCourses <= 2000
- 0 <= prerequisites.length <= 5000
- prerequisites[i].length == 2
- 0 <= ai, bi < numCourses
- All the pairs prerequisites[i] are **unique**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Graph Representation</summary>

This is fundamentally a graph problem. Model courses as nodes and prerequisites as directed edges. The question becomes: does this directed graph contain a cycle? If a cycle exists, you cannot complete all courses.

</details>

<details>
<summary>🎯 Hint 2: Cycle Detection Strategies</summary>

You can detect cycles using either DFS or BFS (Kahn's algorithm):
- **DFS approach**: Track three states for each node (unvisited, visiting, visited). If you encounter a node in "visiting" state, you've found a cycle.
- **BFS approach (Topological Sort)**: Count in-degrees for each node. Start with nodes having in-degree 0. If you can't process all nodes, a cycle exists.

</details>

<details>
<summary>📝 Hint 3: DFS Algorithm</summary>

Pseudocode for DFS approach:
1. Build adjacency list from prerequisites
2. Create a state array: 0=unvisited, 1=visiting, 2=visited
3. For each unvisited course, run DFS:
   - Mark as visiting (1)
   - For each neighbor, if visiting (cycle found) return false
   - If unvisited, recursively check
   - Mark as visited (2)
4. If all courses processed without cycle, return true

Alternative BFS (Kahn's):
1. Build graph and count in-degrees
2. Add all 0 in-degree nodes to queue
3. Process queue, decrementing in-degrees of neighbors
4. Count processed nodes; if equals numCourses, no cycle exists

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n! × m) | O(n) | Try all course orderings, check validity. Exponential complexity |
| **DFS Cycle Detection** | **O(V + E)** | **O(V + E)** | Visit each node once, check each edge once. V=courses, E=prerequisites |
| BFS Topological Sort | O(V + E) | O(V + E) | Kahn's algorithm, equally efficient as DFS |
| Floyd-Warshall | O(V³) | O(V²) | Overkill for this problem, used for all-pairs shortest paths |

## Common Mistakes

**Mistake 1: Incorrect graph direction**

```python
# Wrong - Reversing the edge direction
def canFinish(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        graph[a].append(b)  # Wrong! Should be b -> a
    # ...
```

```python
# Correct - Edge from prerequisite to course
def canFinish(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        graph[b].append(a)  # b must be taken before a
    # ...
```

**Mistake 2: Not tracking visited states properly in DFS**

```python
# Wrong - Only using visited set, can't detect cycles
def canFinish(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        graph[b].append(a)

    visited = set()

    def dfs(course):
        if course in visited:
            return True  # Wrong! This might be a cycle
        visited.add(course)
        for neighbor in graph[course]:
            if not dfs(neighbor):
                return False
        return True
```

```python
# Correct - Track three states: unvisited, visiting, visited
def canFinish(numCourses, prerequisites):
    graph = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        graph[b].append(a)

    state = [0] * numCourses  # 0=unvisited, 1=visiting, 2=visited

    def dfs(course):
        if state[course] == 1:  # Cycle detected
            return False
        if state[course] == 2:  # Already processed
            return True

        state[course] = 1  # Mark as visiting
        for neighbor in graph[course]:
            if not dfs(neighbor):
                return False
        state[course] = 2  # Mark as visited
        return True

    return all(dfs(i) for i in range(numCourses) if state[i] == 0)
```

**Mistake 3: Forgetting to handle disconnected components**

```python
# Wrong - Only checking from course 0
def canFinish(numCourses, prerequisites):
    # ... build graph ...
    return dfs(0)  # Wrong! Some courses might not connect to course 0
```

```python
# Correct - Check all unvisited courses
def canFinish(numCourses, prerequisites):
    # ... build graph and state array ...
    for i in range(numCourses):
        if state[i] == 0:  # Unvisited
            if not dfs(i):
                return False
    return True
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Course Schedule II | Medium | Return the actual course order (topological sort) |
| Course Schedule III | Hard | Select maximum courses within time constraints |
| Course Schedule IV | Medium | Answer queries about prerequisite relationships |
| Alien Dictionary | Hard | Derive character ordering from sorted alien words |
| Parallel Courses | Medium | Minimum semesters to complete all courses |

## Practice Checklist

- [ ] Day 1: Solve using DFS with three-state tracking
- [ ] Day 2: Solve using BFS (Kahn's algorithm) with in-degree counting
- [ ] Day 7: Re-solve from scratch, can you recall both approaches?
- [ ] Day 14: Solve Course Schedule II (return the actual ordering)
- [ ] Day 30: Explain to someone how cycle detection works in graphs

**Strategy**: See [Array Pattern](../strategies/patterns/topological-sort.md)
