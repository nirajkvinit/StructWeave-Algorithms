---
id: M273
old_id: A070
slug: kill-process
title: Kill Process
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E104", "M102", "M107"]
prerequisites: ["tree-traversal", "graph-traversal", "bfs", "dfs"]
---
# Kill Process

## Problem

You're managing a system with n processes arranged in a tree hierarchy. You receive two arrays: `pid` (process IDs) and `ppid` (parent process IDs), where ppid[i] indicates the parent of process pid[i]. The process tree has one root (where ppid equals 0) and each process may have multiple children.

When you terminate a process, all its descendant processes are automatically killed as well, creating a cascading shutdown. Given a target process ID to kill, return the complete list of process IDs that will be terminated, including the target itself. The order of returned IDs doesn't matter.

For example, if you have a tree where process 3 is the root with children 1 and 5, and process 5 has child 10, then killing process 5 will terminate both 5 and 10 (but not 3 or 1). This models how operating systems handle process trees, where killing a parent process typically kills all its children to avoid orphaned processes.

The input format uses parallel arrays rather than traditional tree nodes. The pid array contains [1, 3, 10, 5] and ppid contains [3, 0, 5, 3], meaning process 1's parent is 3, process 3's parent is 0 (root), process 10's parent is 5, and process 5's parent is 3. Your task is to convert this representation into a usable structure and traverse it efficiently.


**Diagram:**

```
Example: Process Tree
Input: pid = [1,3,10,5], ppid = [3,0,5,3], kill = 5

Process hierarchy:
       3 (root, ppid=0)
      / \
     1   5
         |
        10

If we kill process 5, we also kill its children.
Output: [5,10]
```


## Why This Matters

This problem teaches you to work with tree structures represented as parallel arrays, a common format in system APIs and database queries. Many systems represent hierarchical relationships this way (employee reporting structures, file systems, organizational charts), and you need to convert flat representations into traversable structures.

The solution combines graph building (creating an adjacency list from parallel arrays) with tree traversal (BFS or DFS), both fundamental algorithms. Understanding cascading operations in hierarchies is essential for database cascade deletes, permission propagation, and dependency management. This pattern appears in process management, organizational software, and any system modeling parent-child relationships.

## Examples

**Example 1:**
- Input: `pid = [1], ppid = [0], kill = 1`
- Output: `[1]`

## Constraints

- n == pid.length
- n == ppid.length
- 1 <= n <= 5 * 10⁴
- 1 <= pid[i] <= 5 * 10⁴
- 0 <= ppid[i] <= 5 * 10⁴
- Only one process has no parent.
- All the values of pid are **unique**.
- kill is **guaranteed** to be in pid.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Building the Tree Structure</summary>

The given arrays `pid` and `ppid` represent a tree, but not in a traditional tree node structure. You need to convert this representation into something more usable.

Think about creating a mapping from parent process to all its children:
```
parent_to_children = {
    3: [1, 5],
    5: [10],
    1: [],
    10: []
}
```

This adjacency list representation makes it easy to find all children of any process. How would you build this from the input arrays?
</details>

<details>
<summary>Hint 2: Traversing the Tree</summary>

Once you have the parent-to-children mapping, killing a process becomes a tree traversal problem:
1. Start at the target process (`kill`)
2. Add it to the result list
3. Find all its children
4. Recursively kill each child (which kills their descendants)

This can be done with either:
- **BFS (Breadth-First Search)**: Use a queue
- **DFS (Depth-First Search)**: Use recursion or a stack

Both approaches work equally well for this problem.
</details>

<details>
<summary>Hint 3: Complete Solution Strategy</summary>

**Step 1: Build adjacency list**
```python
from collections import defaultdict

parent_to_children = defaultdict(list)
for i in range(len(pid)):
    parent_to_children[ppid[i]].append(pid[i])
```

**Step 2: BFS Traversal**
```python
from collections import deque

result = []
queue = deque([kill])

while queue:
    current = queue.popleft()
    result.append(current)

    # Add all children to queue
    for child in parent_to_children[current]:
        queue.append(child)

return result
```

**Alternative: DFS with recursion**
```python
def dfs(process_id):
    result.append(process_id)
    for child in parent_to_children[process_id]:
        dfs(child)

result = []
dfs(kill)
return result
```

Both solutions are O(n) time and O(n) space.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| BFS | O(n) | O(n) | Queue + adjacency list + result |
| DFS (Recursive) | O(n) | O(n) | Call stack + adjacency list + result |
| DFS (Iterative) | O(n) | O(n) | Stack + adjacency list + result |

## Common Mistakes

### Mistake 1: Not building adjacency list
```python
# WRONG: Trying to traverse without proper data structure
def killProcess(pid, ppid, kill):
    result = [kill]

    # Inefficient: scanning entire arrays repeatedly
    for i in range(len(pid)):
        if ppid[i] == kill:  # Found a child
            result.extend(killProcess(pid, ppid, pid[i]))

    return result
# This works but is O(n²) - very slow!
```
**Why it's wrong:** Without preprocessing into an adjacency list, you must scan the entire `ppid` array for each process. This leads to O(n²) complexity instead of O(n).

### Mistake 2: Forgetting to include the killed process
```python
# WRONG: Only adding children, not the process itself
def killProcess(pid, ppid, kill):
    parent_to_children = build_adjacency_list(pid, ppid)
    result = []
    queue = deque()

    # Starting queue with children, not the process itself!
    for child in parent_to_children[kill]:
        queue.append(child)

    # ... BFS logic ...
    return result
# Missing the 'kill' process from result!
```
**Why it's wrong:** The killed process itself should be in the result. Start the queue with `kill`, not its children.

### Mistake 3: Modifying during iteration
```python
# WRONG: Modifying result list during iteration (doesn't apply here, but common bug)
def killProcess(pid, ppid, kill):
    parent_to_children = build_adjacency_list(pid, ppid)
    result = [kill]

    # Don't iterate over result while adding to it!
    for process in result:  # BAD: result changes during iteration
        for child in parent_to_children[process]:
            result.append(child)

    return result
# This actually works in Python but is confusing and error-prone
```
**Why it's wrong:** While Python handles this, it's clearer to use a proper BFS queue or DFS stack. Modifying a list while iterating over it is error-prone and hard to reason about.

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Binary Tree Level Order Traversal | Medium | BFS on binary tree |
| Clone Graph | Medium | Traverse and copy graph structure |
| Course Schedule | Medium | Detect cycles in directed graph |
| Employee Importance | Medium | Sum values in tree structure |

## Practice Checklist

- [ ] Solve using BFS approach (Day 1)
- [ ] Implement DFS recursive version (Day 2)
- [ ] Implement DFS iterative version (Day 2)
- [ ] Build adjacency list efficiently (Day 3)
- [ ] Review after 1 week (Day 8)
- [ ] Review after 2 weeks (Day 15)
- [ ] Solve without looking at hints (Day 30)
