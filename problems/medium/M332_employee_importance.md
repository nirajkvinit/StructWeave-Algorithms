---
id: M332
old_id: A157
slug: employee-importance
title: Employee Importance
difficulty: medium
category: medium
topics: ["array", "graph", "tree"]
patterns: ["dfs", "bfs"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: M337
    title: Max Area of Island
    difficulty: medium
  - id: M329
    title: Redundant Connection
    difficulty: medium
prerequisites:
  - Graph/Tree traversal
  - DFS and BFS
  - Hash map usage
---
# Employee Importance

## Problem

You're given a list of employees in a company's organizational structure. Each employee record is an object containing three attributes:

- `employees[i].id`: a unique integer identifier for the employee
- `employees[i].importance`: a numerical score representing that employee's individual importance
- `employees[i].subordinates`: a list of employee IDs who directly report to this employee (their immediate team members)

Given a specific employee `id`, calculate the total importance value for that employee and everyone in their reporting chain. This means you need to sum:
- The target employee's own importance score
- The importance scores of all their direct reports
- The importance scores of all their direct reports' subordinates
- And so on, recursively down through the entire hierarchy

Think of it like calculating the total "organizational weight" of a manager by including themselves and everyone who reports to them at any level. The result represents the cumulative importance of the entire sub-organization under that person's leadership.


**Diagram:**

Example 1: Employee hierarchy
```
       [1, 5]
       /    \
   [2, 3]  [3, 3]

Employee 1 (importance=5) has subordinates [2, 3]
Employee 2 (importance=3) has no subordinates
Employee 3 (importance=3) has no subordinates
Total importance for employee 1: 5 + 3 + 3 = 11
```

Example 2: Simple hierarchy
```
    [1, 2]
       |
    [2, 3]

Employee 1 (importance=2) has subordinate [2]
Employee 2 (importance=3) has no subordinates
Total importance for employee 1: 2 + 3 = 5
```


## Why This Matters

Tree and graph traversal patterns appear everywhere: organizational charts, social network analysis, dependency resolution in build systems, and component hierarchies in GUI frameworks. This problem teaches you to convert linear data structures (arrays) into graph representations for efficient lookups, a technique used in database query optimization and caching systems. The pattern of "traverse all reachable nodes and aggregate a value" is fundamental to calculating metrics like total disk usage in file systems or cumulative costs in project management tools.

## Constraints

- 1 <= employees.length <= 2000
- 1 <= employees[i].id <= 2000
- All employees[i].id are **unique**.
- -100 <= employees[i].importance <= 100
- One employee has at most one direct leader and may have several subordinates.
- The IDs in employees[i].subordinates are valid IDs.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Building an Efficient Lookup Structure</summary>

The employee list is given as an array, but you need to quickly find an employee by their ID. First, create a hash map (dictionary) that maps employee ID to the employee object:

```
id_to_employee = {emp.id: emp for emp in employees}
```

This allows O(1) lookup when you need to access an employee's data. Without this preprocessing, you'd need O(n) time to find each employee in the array.

</details>

<details>
<summary>Hint 2: Recursive DFS Approach</summary>

Once you have the hash map, this becomes a simple tree/graph traversal problem. The total importance for an employee is:
- Their own importance, plus
- The sum of total importance for all their subordinates

This is a classic recursive pattern:
```
def getTotalImportance(emp_id):
    employee = id_to_employee[emp_id]
    total = employee.importance

    for sub_id in employee.subordinates:
        total += getTotalImportance(sub_id)

    return total
```

Start the recursion from the given employee ID.

</details>

<details>
<summary>Hint 3: Iterative BFS/DFS Alternative</summary>

You can also solve this iteratively using a queue (BFS) or stack (DFS):

```
# BFS approach with queue
queue = [starting_id]
total = 0

while queue:
    emp_id = queue.pop(0)
    employee = id_to_employee[emp_id]
    total += employee.importance

    for sub_id in employee.subordinates:
        queue.append(sub_id)

return total
```

Both recursive and iterative approaches work equally well. The iterative version avoids potential stack overflow for very deep hierarchies.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive Linear Search | O(n²) | O(h) | Search array for each employee during traversal |
| DFS with Hash Map | O(n) | O(n) | Build hash map once, then single traversal |
| BFS with Hash Map | O(n) | O(n) | Same as DFS, just different traversal order |

Note: n is the number of employees, h is the hierarchy depth (recursion stack in DFS).

## Common Mistakes

### Mistake 1: Not Creating ID-to-Employee Mapping
```python
# WRONG: Linear search for each employee
def getImportance(employees, id):
    def dfs(emp_id):
        # Finding employee by linear search - O(n) per lookup!
        employee = None
        for emp in employees:
            if emp.id == emp_id:
                employee = emp
                break

        total = employee.importance
        for sub_id in employee.subordinates:
            total += dfs(sub_id)
        return total

    return dfs(id)
```

**Why it's wrong**: This performs a linear search through the entire employee list for every single employee in the hierarchy, resulting in O(n²) time complexity. Always build a hash map first for O(1) lookups.

### Mistake 2: Not Handling Empty Subordinates List
```python
# WRONG: Assuming subordinates list always exists and is non-empty
def getImportance(employees, id):
    emp_map = {e.id: e for e in employees}

    def dfs(emp_id):
        employee = emp_map[emp_id]
        total = employee.importance

        # Bug: what if subordinates is empty or None?
        for sub_id in employee.subordinates:
            total += dfs(sub_id)

        return total

    return dfs(id)
```

**Why it's wrong**: While this code might work if `subordinates` is always an empty list (not `None`), it's safer to check. If `subordinates` could be `None`, this will crash. Add a check: `if employee.subordinates:` before the loop.

### Mistake 3: Modifying Global State Incorrectly
```python
# WRONG: Using a global variable without proper initialization
total_importance = 0

def getImportance(employees, id):
    emp_map = {e.id: e for e in employees}

    def dfs(emp_id):
        global total_importance
        employee = emp_map[emp_id]
        total_importance += employee.importance  # Bug: not reset between calls

        for sub_id in employee.subordinates:
            dfs(sub_id)

    dfs(id)
    return total_importance
```

**Why it's wrong**: If this function is called multiple times, the global `total_importance` accumulates values across calls unless explicitly reset. Either initialize it inside `getImportance` or return values from recursion instead of using global state.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Maximum Importance Path | Medium | Find path from root to leaf with maximum total importance |
| Minimum Spanning Importance | Hard | Find minimum subset of employees covering all departments |
| K-Level Subordinates | Medium | Calculate importance for employees exactly k levels down |
| Multi-Root Organization | Medium | Handle multiple CEOs with separate reporting chains |

## Practice Checklist

- [ ] **First attempt**: Solve independently (30 min time limit)
- [ ] **Build hash map**: Create ID-to-employee mapping for O(1) lookup
- [ ] **Implement both**: Code both recursive DFS and iterative BFS
- [ ] **Edge cases**: Single employee, no subordinates, deep hierarchy
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain tree traversal approach clearly
- [ ] **Variations**: Solve similar graph traversal problems
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Graph Traversal Pattern](../strategies/data-structures/graphs.md)
