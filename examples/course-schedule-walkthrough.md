---
title: Course Schedule - Complete Walkthrough
type: worked-example
problem_id: M079
patterns: ["topological-sort", "graph-cycle-detection", "dfs", "bfs"]
estimated_time: 40
difficulty: medium
topics: ["graph", "topological-sort", "depth-first-search", "breadth-first-search"]
---

# Course Schedule - Complete Walkthrough

## Overview

This walkthrough demonstrates how to solve the Course Schedule problem using graph algorithms. This is a fundamental problem in graph theory that models dependency relationships and teaches cycle detection in directed graphs.

**Problem Statement:** You need to take `numCourses` courses labeled from `0` to `numCourses-1`. Some courses have prerequisites. Given a list of prerequisite pairs `[a, b]` where you must take course `b` before course `a`, determine if you can finish all courses.

**Learning Goals:**
- Model problems as graphs
- Understand directed graphs and cycles
- Master depth-first search (DFS) for cycle detection
- Learn topological sorting fundamentals
- Compare BFS and DFS approaches
- Recognize dependency problems

---

## Understanding the Problem

### What Are We Really Asking?

The problem is asking: **Can we order the courses so all prerequisites are satisfied?**

This is only possible if there are **no circular dependencies** (cycles).

**Valid example:**
```
Course 1 requires Course 0
Course 2 requires Course 1
Course 3 requires Course 2

Order: 0 → 1 → 2 → 3 ✓
Can complete all courses!
```

**Invalid example (cycle):**
```
Course 1 requires Course 0
Course 0 requires Course 1

Cycle: 0 → 1 → 0 ✗
Cannot complete (circular dependency)!
```

### Translating to Graph Theory

**Graph representation:**
- Each course = a node
- Each prerequisite `[a, b]` = directed edge from `b` to `a`
  - "b must come before a"
  - Edge direction: b → a

**Example 1:**
```
numCourses = 2
prerequisites = [[1,0]]

Graph:
0 → 1

Explanation:
- Take course 0 first
- Then take course 1
- Valid order exists ✓
```

**Example 2:**
```
numCourses = 2
prerequisites = [[1,0], [0,1]]

Graph:
0 → 1
↑   ↓
└───┘

Explanation:
- Course 0 requires course 1
- Course 1 requires course 0
- Circular dependency (cycle) ✗
```

**The key insight:**
> If the graph has a cycle, courses cannot be completed.
> If the graph has no cycles, courses can be completed.

**Problem becomes:** Detect if directed graph has a cycle.

---

## Graph Modeling

### Building the Graph

Given prerequisites, we build an adjacency list:

```python
# Example: numCourses = 4, prerequisites = [[1,0], [2,0], [3,1], [3,2]]

graph = {
    0: [1, 2],      # Course 0 is prerequisite for 1 and 2
    1: [3],         # Course 1 is prerequisite for 3
    2: [3],         # Course 2 is prerequisite for 3
    3: []           # Course 3 has no dependents
}

Visual:
    0
   / \
  1   2
   \ /
    3

Valid ordering: 0, 1, 2, 3 (or 0, 2, 1, 3)
```

### Why Directed Graph?

Prerequisites have direction:
- `[1, 0]` means 0 → 1 (must take 0 before 1)
- This is NOT the same as 1 → 0

```
If we had undirected edges:
0 — 1 would mean "0 requires 1 AND 1 requires 0"
→ Always a cycle! ✗

Directed edges preserve prerequisite direction ✓
```

---

## Approach 1: DFS with Cycle Detection

### The Intuition

Use DFS to explore the graph. Track the current path. If we revisit a node in the current path, we found a cycle.

**Key insight:**
- During DFS, we're following a path
- If we encounter a node already in our current path: CYCLE
- If we encounter a node from a different completed path: OK

### State Tracking

We need to distinguish three states for each node:

```python
UNVISITED = 0    # Haven't explored this node yet
VISITING = 1     # Currently exploring (in current DFS path)
VISITED = 2      # Fully explored (all paths from here checked)
```

**Why three states?**

```
Example graph:
    0
   / \
  1   2
   \ /
    3

DFS from 0:
  Path: 0 → 1 → 3
    - 0: VISITING
    - 1: VISITING
    - 3: VISITING → VISITED
    - 1: VISITING → VISITED
  Path: 0 → 2 → 3
    - 2: VISITING
    - 3: Already VISITED (from earlier path, NOT cycle)
    - 2: VISITING → VISITED
    - 0: VISITING → VISITED

If 3 was still VISITING, we'd think it's a cycle!
VISITED tells us "this path already checked, it's safe"
```

### The Algorithm

```
Algorithm (DFS Cycle Detection):

1. Create adjacency list from prerequisites
2. Initialize all nodes as UNVISITED
3. For each course:
   - If UNVISITED, run DFS from it
   - If DFS finds cycle, return False
4. If all DFS complete without cycles, return True

DFS(node):
  Mark node as VISITING (in current path)

  For each neighbor:
    If neighbor is VISITING:
      → Found cycle! Return False
    If neighbor is UNVISITED:
      → Recursively DFS(neighbor)
      → If it found cycle, return False

  Mark node as VISITED (fully explored)
  Return True (no cycle from this node)
```

### Complete DFS Implementation

```python
def can_finish_dfs(numCourses, prerequisites):
    """
    Check if all courses can be completed (no cycles)

    Approach: DFS with cycle detection

    Time: O(V + E) where V = courses, E = prerequisites
    Space: O(V + E) for graph + O(V) for recursion
    """
    # Build adjacency list
    graph = {i: [] for i in range(numCourses)}
    for course, prereq in prerequisites:
        graph[prereq].append(course)

    # Three states
    UNVISITED = 0
    VISITING = 1   # In current DFS path
    VISITED = 2    # Fully explored

    state = [UNVISITED] * numCourses

    def has_cycle(node):
        """
        DFS to detect cycle

        Returns True if cycle found, False otherwise
        """
        # Mark as currently visiting
        state[node] = VISITING

        # Explore neighbors
        for neighbor in graph[node]:
            if state[neighbor] == VISITING:
                # Back edge to node in current path → cycle!
                return True
            if state[neighbor] == UNVISITED:
                # Recursively check this path
                if has_cycle(neighbor):
                    return True

        # Done exploring this node
        state[node] = VISITED
        return False

    # Check each course
    for course in range(numCourses):
        if state[course] == UNVISITED:
            if has_cycle(course):
                return False

    return True
```

### Line-by-Line Explanation

```python
graph = {i: [] for i in range(numCourses)}
```
- Create adjacency list for all courses
- Each course initially has empty list of dependents

```python
for course, prereq in prerequisites:
    graph[prereq].append(course)
```
- Add directed edge: prereq → course
- "prereq is prerequisite for course"
- Direction matters!

```python
state = [UNVISITED] * numCourses
```
- Track state of each course
- Initially all unvisited

```python
state[node] = VISITING
```
- Mark node as being explored
- It's now in the current DFS path

```python
if state[neighbor] == VISITING:
    return True
```
- Neighbor is in current path
- We've come back to a node we're still exploring
- This is a cycle (back edge)

```python
if state[neighbor] == UNVISITED:
    if has_cycle(neighbor):
        return True
```
- Explore unvisited neighbor
- If it finds a cycle, propagate that up

```python
state[node] = VISITED
```
- Finished exploring this node
- All paths from here are cycle-free
- Future visits can skip this node

```python
for course in range(numCourses):
    if state[course] == UNVISITED:
        if has_cycle(course):
            return False
```
- Check all courses (graph might be disconnected)
- Start DFS from any unvisited course
- If any starting point finds cycle, return False

---

## Detailed DFS Trace

### Example 1: Valid (No Cycle)

**Input:**
```
numCourses = 4
prerequisites = [[1,0], [2,0], [3,1], [3,2]]
```

**Graph:**
```
    0
   / \
  1   2
   \ /
    3
```

**Trace:**

```
Initial state: [0, 0, 0, 0] (all UNVISITED)

DFS(0):
  state[0] = VISITING → [1, 0, 0, 0]
  Neighbors: [1, 2]

  DFS(1):
    state[1] = VISITING → [1, 1, 0, 0]
    Neighbors: [3]

    DFS(3):
      state[3] = VISITING → [1, 1, 0, 1]
      Neighbors: []
      state[3] = VISITED → [1, 1, 0, 2]
      Return False (no cycle)

    state[1] = VISITED → [1, 2, 0, 2]
    Return False

  DFS(2):
    state[2] = VISITING → [1, 2, 1, 2]
    Neighbors: [3]

    Check neighbor 3:
      state[3] == VISITED (already fully explored)
      Skip it (not VISITING or UNVISITED)

    state[2] = VISITED → [1, 2, 2, 2]
    Return False

  state[0] = VISITED → [2, 2, 2, 2]
  Return False

All courses explored, no cycles found
Return: True ✓
```

### Example 2: Invalid (Has Cycle)

**Input:**
```
numCourses = 2
prerequisites = [[1,0], [0,1]]
```

**Graph:**
```
0 → 1
↑   ↓
└───┘
```

**Trace:**

```
Initial state: [0, 0] (all UNVISITED)

DFS(0):
  state[0] = VISITING → [1, 0]
  Neighbors: [1]

  DFS(1):
    state[1] = VISITING → [1, 1]
    Neighbors: [0]

    Check neighbor 0:
      state[0] == VISITING ✗
      → Node 0 is in current path!
      → Found cycle!
      Return True (cycle detected)

    (DFS(1) returns True)

  (DFS(0) returns True)

Return: False ✗ (cannot finish courses)
```

**Visual of cycle detection:**
```
Path: 0 → 1
      ↑   ↓
      └───┘
      CYCLE!

When at node 1, we try to visit 0
But 0 is still VISITING (in our current path)
→ We've completed a cycle
```

---

## Approach 2: BFS with Topological Sort (Kahn's Algorithm)

### The Intuition

Different approach: track in-degrees (number of prerequisites).

**Key insight:**
- Courses with 0 prerequisites can be taken first
- After taking a course, reduce in-degree of its dependents
- If we can process all courses this way: no cycle
- If some courses remain (stuck with prerequisites): cycle exists

### In-Degree Concept

**In-degree:** Number of incoming edges (prerequisites)

```
Example:
    0
   / \
  1   2
   \ /
    3

In-degrees:
  0: 0 (no prerequisites)
  1: 1 (needs course 0)
  2: 1 (needs course 0)
  3: 2 (needs courses 1 and 2)
```

### The Algorithm

```
Algorithm (Kahn's Topological Sort):

1. Build graph and calculate in-degrees
2. Add all courses with in-degree 0 to queue
3. While queue is not empty:
   a. Remove course from queue
   b. Increment count of completed courses
   c. For each dependent course:
      - Decrease its in-degree
      - If in-degree becomes 0, add to queue
4. If completed count == numCourses: no cycle (True)
   Else: cycle exists (False)
```

**Why this works:**

If there's a cycle:
```
0 → 1 → 2 → 0

In-degrees: {0: 1, 1: 1, 2: 1}
All have in-degree > 0
Queue never gets any nodes
Cannot process any course
→ Detect cycle!
```

If there's no cycle:
```
0 → 1 → 2

Start: in-degrees = {0: 0, 1: 1, 2: 1}
Queue: [0]

Process 0: queue = [1] (in-degree[1] becomes 0)
Process 1: queue = [2] (in-degree[2] becomes 0)
Process 2: queue = []

Processed all 3 courses → No cycle!
```

### Complete BFS Implementation

```python
from collections import deque

def can_finish_bfs(numCourses, prerequisites):
    """
    Check if all courses can be completed (no cycles)

    Approach: BFS topological sort (Kahn's algorithm)

    Time: O(V + E)
    Space: O(V + E)
    """
    # Build adjacency list
    graph = {i: [] for i in range(numCourses)}
    in_degree = [0] * numCourses

    # Populate graph and in-degrees
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1

    # Queue of courses with no prerequisites
    queue = deque()
    for course in range(numCourses):
        if in_degree[course] == 0:
            queue.append(course)

    # Process courses
    completed = 0

    while queue:
        # Take a course with no prerequisites
        course = queue.popleft()
        completed += 1

        # Reduce in-degree of dependent courses
        for neighbor in graph[course]:
            in_degree[neighbor] -= 1

            # If all prerequisites met, can take this course
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # Check if all courses completed
    return completed == numCourses
```

### Line-by-Line Explanation

```python
graph = {i: [] for i in range(numCourses)}
in_degree = [0] * numCourses
```
- Graph: adjacency list
- in_degree: count of prerequisites for each course

```python
for course, prereq in prerequisites:
    graph[prereq].append(course)
    in_degree[course] += 1
```
- Add edge: prereq → course
- Increment course's in-degree (gained a prerequisite)

```python
queue = deque()
for course in range(numCourses):
    if in_degree[course] == 0:
        queue.append(course)
```
- Find courses with no prerequisites
- These can be taken immediately
- Start BFS from these

```python
course = queue.popleft()
completed += 1
```
- "Take" a course (remove from queue)
- Increment count of completed courses

```python
for neighbor in graph[course]:
    in_degree[neighbor] -= 1
```
- We completed this course
- Dependents now have one less prerequisite
- Decrease their in-degree

```python
if in_degree[neighbor] == 0:
    queue.append(neighbor)
```
- If all prerequisites met (in-degree = 0)
- This course can now be taken
- Add to queue

```python
return completed == numCourses
```
- If we completed all courses: no cycle ✓
- If some stuck with prerequisites: cycle ✗

---

## Detailed BFS Trace

### Example 1: Valid (No Cycle)

**Input:**
```
numCourses = 4
prerequisites = [[1,0], [2,0], [3,1], [3,2]]
```

**Graph:**
```
    0
   / \
  1   2
   \ /
    3
```

**Trace:**

```
Build graph:
  graph = {0: [1,2], 1: [3], 2: [3], 3: []}
  in_degree = [0, 1, 1, 2]
              0 has 0 prerequisites
              1 has 1 (needs 0)
              2 has 1 (needs 0)
              3 has 2 (needs 1 and 2)

Initialize queue with in_degree 0:
  queue = [0]
  completed = 0

Iteration 1:
  course = 0
  completed = 1
  Neighbors: [1, 2]
    in_degree[1] = 1 - 1 = 0 → add to queue
    in_degree[2] = 1 - 1 = 0 → add to queue
  in_degree = [0, 0, 0, 2]
  queue = [1, 2]

Iteration 2:
  course = 1
  completed = 2
  Neighbors: [3]
    in_degree[3] = 2 - 1 = 1 (not 0, don't add)
  in_degree = [0, 0, 0, 1]
  queue = [2]

Iteration 3:
  course = 2
  completed = 3
  Neighbors: [3]
    in_degree[3] = 1 - 1 = 0 → add to queue
  in_degree = [0, 0, 0, 0]
  queue = [3]

Iteration 4:
  course = 3
  completed = 4
  Neighbors: []
  queue = []

Queue empty, loop ends
completed = 4 == numCourses = 4
Return: True ✓
```

### Example 2: Invalid (Has Cycle)

**Input:**
```
numCourses = 2
prerequisites = [[1,0], [0,1]]
```

**Graph:**
```
0 → 1
↑   ↓
└───┘
```

**Trace:**

```
Build graph:
  graph = {0: [1], 1: [0]}
  in_degree = [1, 1]
              Both have 1 prerequisite (circular!)

Initialize queue:
  No courses with in_degree 0
  queue = []
  completed = 0

Loop doesn't execute (queue is empty)

completed = 0 != numCourses = 2
Return: False ✗

Explanation:
- Both courses require the other
- Neither can be taken first
- Queue never gets populated
- Cannot complete any course
```

---

## DFS vs BFS: When to Use Each?

### DFS Approach

**Pros:**
- More intuitive for cycle detection
- Natural recursive implementation
- Uses less memory in sparse graphs
- Can track actual cycle path easily

**Cons:**
- Stack overflow risk with deep recursion
- Harder to explain state transitions

**Use when:**
- You need to find the actual cycle
- Graph is sparse (few edges)
- Recursion is allowed

### BFS Approach

**Pros:**
- Iterative (no recursion, no stack overflow)
- Easier to understand in-degree concept
- Natural for topological sort problems
- Can build the actual ordering easily

**Cons:**
- Uses more memory for queue
- In-degree tracking adds complexity

**Use when:**
- You need the topological ordering (not just cycle detection)
- Graph is dense (many edges)
- Recursion is problematic

### Complexity Comparison

| Approach | Time | Space | Recursion |
|----------|------|-------|-----------|
| DFS | O(V + E) | O(V + E) | Yes |
| BFS | O(V + E) | O(V + E) | No |

Both are optimal! Choice depends on requirements and personal preference.

---

## Common Mistakes and Edge Cases

### Mistake 1: Wrong Edge Direction

**Wrong:**
```python
# Building graph backwards
for course, prereq in prerequisites:
    graph[course].append(prereq)  # WRONG direction
```

**Why wrong:**
```
[1, 0] means "course 1 requires course 0"
Should be: 0 → 1 (0 enables 1)
Not: 1 → 0 (1 enables 0)

With wrong direction:
  Can't detect actual cycles correctly
```

**Correct:**
```python
graph[prereq].append(course)
```

### Mistake 2: Forgetting Disconnected Components

**Wrong:**
```python
# Only starting DFS from course 0
if has_cycle(0):
    return False
return True
```

**Why wrong:**
```
Graph might be disconnected:

  0 → 1    2 → 3
           ↑   ↓
           └───┘

Starting from 0 only checks 0→1
Misses the cycle in 2→3
```

**Correct:**
```python
for course in range(numCourses):
    if state[course] == UNVISITED:
        if has_cycle(course):
            return False
```

### Mistake 3: Two States Instead of Three (DFS)

**Wrong:**
```python
visited = [False] * numCourses

def has_cycle(node):
    if visited[node]:
        return True  # WRONG: can't distinguish current path from completed path
    visited[node] = True
    # ...
```

**Why wrong:**
```
Graph: 0 → 1 → 3
       2 → 3

DFS from 0:
  Visit 0, 1, 3 (all marked visited)

DFS from 2:
  Visit 2, then 3
  3 is visited, think it's a cycle!
  But 3 is from a different path, not current path

Need VISITING vs VISITED to distinguish!
```

### Mistake 4: Not Initializing All Nodes in Graph

**Wrong:**
```python
graph = {}
for course, prereq in prerequisites:
    graph[prereq].append(course)  # Crashes if prereq not in graph
```

**Why wrong:**
```
If course has no prerequisites, it won't be in graph
Later access will cause KeyError
```

**Correct:**
```python
graph = {i: [] for i in range(numCourses)}  # Initialize all
```

### Edge Case 1: No Prerequisites

```python
numCourses = 3
prerequisites = []

Graph: 0  1  2 (no edges)

All courses have in_degree 0
Can complete in any order
Return: True ✓
```

### Edge Case 2: Linear Chain

```python
numCourses = 4
prerequisites = [[1,0], [2,1], [3,2]]

Graph: 0 → 1 → 2 → 3

No cycles, linear dependency
Return: True ✓
```

### Edge Case 3: Self-Loop

```python
numCourses = 2
prerequisites = [[0,0]]

Graph: 0 → 0 (self-loop)

This is a cycle!
Return: False ✗
```

---

## Complexity Analysis

### Time Complexity: O(V + E)

**V = numCourses, E = len(prerequisites)**

**DFS:**
```
1. Build graph: O(E)
   - Iterate through prerequisites once

2. DFS traversal: O(V + E)
   - Visit each node once: O(V)
   - Check each edge once: O(E)
   - Total: O(V + E)

Total: O(E) + O(V + E) = O(V + E)
```

**BFS:**
```
1. Build graph and in-degrees: O(E)

2. Initialize queue: O(V)

3. BFS process: O(V + E)
   - Each node added/removed from queue once: O(V)
   - Each edge processed once: O(E)

Total: O(E) + O(V) + O(V + E) = O(V + E)
```

### Space Complexity: O(V + E)

**DFS:**
```
- Graph: O(V + E)
- State array: O(V)
- Recursion stack: O(V) worst case
Total: O(V + E)
```

**BFS:**
```
- Graph: O(V + E)
- In-degree array: O(V)
- Queue: O(V) worst case
Total: O(V + E)
```

---

## Variations and Extensions

### Variation 1: Return Topological Ordering

**Problem:** Return actual course order (if possible)

```python
def find_order(numCourses, prerequisites):
    """
    Return a valid course order, or empty if impossible

    Uses BFS approach (easier to build ordering)
    """
    graph = {i: [] for i in range(numCourses)}
    in_degree = [0] * numCourses

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1

    queue = deque([i for i in range(numCourses) if in_degree[i] == 0])
    order = []

    while queue:
        course = queue.popleft()
        order.append(course)  # Build the ordering

        for neighbor in graph[course]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return order if len(order) == numCourses else []
```

### Variation 2: Find All Cycles

**Problem:** Find all cycles in the graph

```python
def find_all_cycles(numCourses, prerequisites):
    """
    Find all cycles in course dependencies
    """
    graph = {i: [] for i in range(numCourses)}
    for course, prereq in prerequisites:
        graph[prereq].append(course)

    cycles = []
    state = [0] * numCourses
    path = []

    def dfs(node):
        state[node] = 1
        path.append(node)

        for neighbor in graph[node]:
            if state[neighbor] == 1:
                # Found cycle
                cycle_start = path.index(neighbor)
                cycles.append(path[cycle_start:] + [neighbor])
            elif state[neighbor] == 0:
                dfs(neighbor)

        path.pop()
        state[node] = 2

    for course in range(numCourses):
        if state[course] == 0:
            dfs(course)

    return cycles
```

### Variation 3: Course Schedule with Limited Semesters

**Problem:** Can you finish in `k` semesters? (Parallel course taking)

```python
def can_finish_in_k_semesters(numCourses, prerequisites, k):
    """
    Check if courses can be finished in k semesters

    Each semester, can take all courses with prerequisites met
    """
    graph = {i: [] for i in range(numCourses)}
    in_degree = [0] * numCourses

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1

    semesters = 0
    queue = deque([i for i in range(numCourses) if in_degree[i] == 0])

    while queue:
        # One semester: take all available courses
        semesters += 1
        size = len(queue)

        for _ in range(size):
            course = queue.popleft()

            for neighbor in graph[course]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

    return semesters <= k
```

---

## Interview Talking Points

### How to Explain the Solution (2-minute version)

> "This is a graph cycle detection problem in disguise. Each course is a node, and each prerequisite creates a directed edge. The question asks if we can complete all courses, which is only possible if there are no circular dependencies.
>
> I'll use DFS with three states: unvisited, visiting, and visited. I traverse the graph, marking nodes as 'visiting' when entering them. If I encounter a node that's already 'visiting', I've found a back edge - a cycle. After exploring all paths from a node, I mark it 'visited'.
>
> I check all courses since the graph might be disconnected. If any DFS finds a cycle, courses cannot be completed.
>
> Time complexity is O(V + E) where V is courses and E is prerequisites - we visit each node and edge once. Space is O(V + E) for the graph plus recursion stack.
>
> An alternative is BFS using Kahn's algorithm with in-degrees, which also works in O(V + E) but doesn't use recursion."

### Questions to Ask

1. "Can there be duplicate prerequisites?" → Usually no
2. "Can a course be its own prerequisite?" → Usually no (but check!)
3. "Are courses always numbered 0 to n-1?" → Yes per problem statement
4. "Do I need to return the actual ordering or just check if possible?" → Just check
5. "Can prerequisites be empty?" → Yes (all courses independent)

### Common Follow-Ups

**Q: How would you return the actual course order?**

A: "I'd use BFS with Kahn's algorithm. As I remove nodes from the queue, I append them to the result. If we process all courses, the result is a valid topological ordering."

**Q: What if you needed to take courses in minimum number of semesters?**

A: "That's asking for the longest path in the DAG. I'd use BFS and track levels - each level is one semester. The number of levels is the minimum semesters needed."

**Q: What's the difference between DFS and BFS for this problem?**

A: "Both are O(V + E). DFS is more intuitive for cycle detection and uses less memory. BFS is better if you need the actual ordering and doesn't risk stack overflow. For just checking if courses can be completed, either works."

**Q: How would you handle very large graphs?**

A: "For distributed systems, I'd partition the graph and check each partition separately. For streaming prerequisites, I'd incrementally update the graph and re-check affected components using union-find."

---

## Practice Exercises

### Exercise 1: Implement Both Approaches
Code both DFS and BFS solutions from scratch. Which feels more natural?

### Exercise 2: Test Edge Cases
```python
# Test these:
can_finish(1, [])                    # Single course, no prereqs
can_finish(2, [[0,0]])               # Self-loop
can_finish(5, [[1,0],[2,1],[3,2],[4,3]])  # Linear chain
can_finish(3, [[0,1],[1,2],[2,0]])   # Triangle cycle
can_finish(4, [[1,0],[2,0],[3,1],[3,2]])  # Diamond (no cycle)
```

### Exercise 3: Trace on Paper
Trace both DFS and BFS for:
```
numCourses = 4
prerequisites = [[1,0], [2,1], [3,2], [1,3]]
```
Does it have a cycle?

### Exercise 4: Build Topological Order
Modify BFS to return the actual course order.

### Exercise 5: Find the Cycle
If a cycle exists, modify DFS to return the actual cycle path.

---

## Summary

### Key Takeaways

1. **Model as graph:** Recognize when a problem is really asking about graph properties

2. **Cycle detection:** Understanding directed graph cycles is fundamental to many problems

3. **Three-state DFS:** For cycle detection, distinguish between "in current path" and "fully explored"

4. **In-degree BFS:** Kahn's algorithm uses in-degrees for topological sort

5. **Both approaches work:** DFS and BFS both solve this in O(V + E), choose based on requirements

### Algorithm Patterns

**DFS Cycle Detection:**
```
1. Three states: unvisited, visiting, visited
2. Mark visiting when entering node
3. If encounter visiting node → cycle
4. Mark visited when leaving node
```

**BFS Topological Sort:**
```
1. Calculate in-degrees
2. Queue all in-degree 0 nodes
3. Process: remove node, decrease neighbor in-degrees
4. If processed all → no cycle
```

### Complexity Reference

| Approach | Time | Space | Recursion |
|----------|------|-------|-----------|
| DFS | O(V + E) | O(V + E) | Yes |
| BFS | O(V + E) | O(V + E) | No |

### Pattern Recognition

Use this pattern when you see:
- Dependency relationships (tasks, courses, packages)
- Circular dependency detection
- Build order problems
- Topological sorting needs
- Prerequisite chains

### Real-World Applications

- **Package managers**: npm, pip, apt (dependency resolution)
- **Build systems**: Make, Maven (build order)
- **Spreadsheets**: Excel (formula dependencies)
- **Schedulers**: Project management (task dependencies)
- **Compilers**: Symbol resolution order

### Next Steps

1. Solve M082 (Course Schedule II) - return the actual ordering
2. Study more topological sort problems
3. Learn about strongly connected components (Tarjan's algorithm)
4. Practice Union-Find for cycle detection in undirected graphs

---

**Remember:** Graph algorithms like this are fundamental to computer science. The ability to model problems as graphs and detect cycles appears in countless real-world scenarios - from detecting deadlocks in operating systems to preventing circular imports in code. Master this pattern, and you'll recognize it everywhere.
