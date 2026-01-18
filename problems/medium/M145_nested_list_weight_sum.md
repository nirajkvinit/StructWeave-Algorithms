---
id: M145
old_id: I138
slug: nested-list-weight-sum
title: Nested List Weight Sum
difficulty: medium
category: medium
topics: ["depth-first-search", "breadth-first-search", "recursion"]
patterns: ["dfs", "level-tracking"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M146", "M364", "M690"]
prerequisites: ["dfs", "recursion", "nested-structures"]
---
# Nested List Weight Sum

## Problem

You're provided with a nested structure where elements can be integers or lists containing other integers and lists, forming multiple levels of nesting. Think of this like a hierarchical file system where folders (lists) can contain files (integers) or more folders, creating a tree-like structure of arbitrary depth. Each level of nesting adds one layer to the depth counter.

Calculate a weighted sum where each integer is multiplied by its nesting level (depth). The depth represents how many list layers surround an integer, starting from 1 for the outermost level. For instance, in `[1,[2,2],[[3],2],1]`, the outermost integers (the first 1 and last 1) are at depth 1, the integers inside one bracket (2, 2, and the second 2) are at depth 2, and the integer inside two brackets (3) is at depth 3. Elements at the same visual depth level have the same multiplier, regardless of their position in the list.

Your goal is to compute the total of all integers, each weighted by their respective depth level. The challenge involves traversing the nested structure while maintaining accurate depth tracking, handling arbitrarily deep nesting, and processing mixed elements (integers and lists) at each level. Edge cases include empty nested lists (which contribute 0 to the sum), single integers with no nesting (depth 1), and deeply nested structures where the depth significantly amplifies the values.

**Diagram:**

Example 1: `[[1,1],2,[1,1]]`
```
Depth 1: [...............]
         /       |        \
Depth 2: [1,1]   2      [1,1]

Calculation: 1*2 + 1*2 + 2*1 + 1*2 + 1*2 = 10
```

Example 2: `[1,[4,[6]]]`
```
Depth 1: [.........]
         /        \
Depth 2: 1      [.....]
                /     \
Depth 3:       4     [.]
                      |
Depth 4:             6

Calculation: 1*1 + 4*2 + 6*3 = 27
```


## Why This Matters

Nested structures appear everywhere in real-world software systems. JSON and XML parsing requires traversing nested objects while tracking depth for validation or transformation rules where nesting level matters (like CSS specificity in web development). File system search utilities calculate weighted scores based on directory depth to prioritize shallower matches. Organizational hierarchies in business software compute weighted voting or cost allocation where decisions at higher levels carry more weight. Compiler design uses depth-weighted calculations when analyzing nested scopes or evaluating expression trees with operator precedence. This problem teaches depth-first traversal with state tracking, a fundamental technique for processing any hierarchical data structure from parse trees to organizational charts to multi-level configuration files.

## Examples

**Example 1:**
- Input: `nestedList = [0]`
- Output: `0`

## Constraints

- 1 <= nestedList.length <= 50
- The values of the integers in the nested list is in the range [-100, 100].
- The maximum **depth** of any integer is less than or equal to 50.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Traverse with Depth Tracking</summary>

You need to visit every element in the nested structure while keeping track of the current depth level. As you go deeper into nested lists, increment the depth. When you encounter an integer, multiply it by the current depth and add to your sum. Think about whether depth-first search (DFS) or breadth-first search (BFS) would be more natural for this problem.

</details>

<details>
<summary>🎯 Hint 2: Recursive DFS Approach</summary>

Use recursion to handle the nested structure naturally. Define a helper function that takes the current list and current depth as parameters. For each element:
- If it's an integer, add `value × depth` to the sum
- If it's a nested list, recursively call the helper with `depth + 1`

This elegantly handles arbitrary nesting levels.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

**DFS Approach:**
```
Define helper function dfs(nested_list, depth):
  sum = 0
  For each element in nested_list:
    If element is integer:
      sum += element * depth
    Else (element is list):
      sum += dfs(element, depth + 1)
  Return sum

Return dfs(nestedList, 1)
```

**BFS Approach:**
```
1. Initialize queue with (nestedList, depth=1)
2. Initialize total_sum = 0
3. While queue not empty:
   - Dequeue (current_list, current_depth)
   - For each element in current_list:
     - If integer: total_sum += element * current_depth
     - If list: enqueue (element, current_depth + 1)
4. Return total_sum
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Flatten then Weight | O(n) | O(n) | Flatten with depth tags, then sum |
| **DFS Recursion** | **O(n)** | **O(d)** | **d is max depth, optimal space** |
| BFS with Queue | O(n) | O(n) | Queue can hold many elements |

Where n is total number of integers. DFS uses less space due to recursion stack being limited by depth.

## Common Mistakes

### Mistake 1: Not Incrementing Depth for Nested Lists

**Wrong Approach:**
```python
# Using same depth for all levels
def depth_sum(nested_list):
    total = 0
    depth = 1  # Wrong: fixed depth

    def dfs(lst):
        nonlocal total
        for element in lst:
            if isinstance(element, int):
                total += element * depth  # Always multiplies by 1
            else:
                dfs(element)  # Missing depth increment

    dfs(nested_list)
    return total
```

**Correct Approach:**
```python
# Pass depth as parameter and increment
def depth_sum(nested_list):
    def dfs(lst, depth):
        total = 0
        for element in lst:
            if isinstance(element, int):
                total += element * depth  # Correct: uses current depth
            else:
                total += dfs(element, depth + 1)  # Increment depth
        return total

    return dfs(nested_list, 1)
```

### Mistake 2: Starting Depth at 0 Instead of 1

**Wrong Approach:**
```python
# Starting depth at 0
def depth_sum(nested_list):
    def dfs(lst, depth):
        total = 0
        for element in lst:
            if isinstance(element, int):
                total += element * depth  # Wrong: outer elements get weight 0
            else:
                total += dfs(element, depth + 1)
        return total

    return dfs(nested_list, 0)  # Wrong: should start at 1
```

**Correct Approach:**
```python
# Starting depth at 1
def depth_sum(nested_list):
    def dfs(lst, depth):
        total = 0
        for element in lst:
            if isinstance(element, int):
                total += element * depth  # Correct: minimum weight is 1
            else:
                total += dfs(element, depth + 1)
        return total

    return dfs(nested_list, 1)  # Correct: outermost depth is 1
```

### Mistake 3: Not Handling Empty Lists

**Wrong Approach:**
```python
# Crashes on empty nested lists
def depth_sum(nested_list):
    def dfs(lst, depth):
        total = 0
        for element in lst:
            if isinstance(element, int):
                total += element * depth
            else:
                total += dfs(element, depth + 1)  # Works fine on empty
        return total

    return dfs(nested_list, 1)  # Actually this is correct!
```

**Note:** This is actually correct - empty lists naturally return 0 from the loop. The real mistake would be trying to special-case them unnecessarily.

## Variations

| Variation | Difference | Key Insight |
|-----------|------------|-------------|
| Nested List Weight Sum II | Weight by inverse depth | Calculate max depth first, then use (max_depth - current_depth + 1) |
| Flatten Nested List Iterator | Return elements in order | Use stack or generator for lazy evaluation |
| Mini Parser | Parse string to nested structure | Use stack with parenthesis matching |
| Nested Array Depth Sum (Multi-type) | Handle mixed types | Add type checking |
| Maximum Depth of Nested Lists | Find deepest nesting | Track max depth instead of sum |

## Practice Checklist

- [ ] Implement DFS recursive solution
- [ ] Implement BFS iterative solution
- [ ] Handle edge case: empty nested list
- [ ] Handle edge case: single integer (no nesting)
- [ ] Handle edge case: deeply nested (depth 50)
- [ ] Handle edge case: negative integers
- [ ] Test with mixed depths at same level
- [ ] Verify correct depth calculation
- [ ] Verify O(n) time complexity
- [ ] Code without looking at solution

**Spaced Repetition Schedule:**
- First review: 24 hours
- Second review: 3 days
- Third review: 1 week
- Fourth review: 2 weeks
- Fifth review: 1 month

**Strategy**: See [DFS Patterns](../strategies/patterns/depth-first-search.md)
