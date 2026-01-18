---
id: E109
old_id: I086
slug: find-the-duplicate-number
title: Find the Duplicate Number
difficulty: easy
category: easy
topics: ["array", "cycle-detection", "binary-search"]
patterns: ["floyd-cycle-detection", "binary-search"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E041", "M142", "M287"]
prerequisites: ["floyd-cycle-detection", "binary-search", "array-as-graph"]
strategy_ref: ../strategies/patterns/cycle-detection.md
---
# Find the Duplicate Number

## Problem

You're given an integer array `nums` containing `n + 1` elements, where each value falls between `1` and `n` inclusive. By the pigeonhole principle, at least one number must appear more than once in this array. Your task is to find that duplicate number.

The challenge adds two critical constraints: you cannot modify the original array, and you must use only constant extra space O(1). This means the typical hash set or sorting approaches won't work here. These constraints force you to think creatively about the problem's structure.

Consider what the array represents. Since every value is between 1 and n, you can treat each element as a pointer to an index. For example, if `nums[0] = 3`, you can "jump" to index 3 next. Because there's a duplicate value, multiple indices will point to the same location, creating a cycle in this implicit graph structure. This transforms the problem from finding a duplicate into detecting and locating a cycle, which can be solved elegantly using Floyd's cycle detection algorithm (the "tortoise and hare" technique).

Alternatively, you can approach this with binary search on the value range. For any midpoint value `mid`, count how many numbers in the array are less than or equal to `mid`. If the count exceeds `mid`, then the duplicate must be in the lower half; otherwise, it's in the upper half.

## Why This Matters

This problem is a masterclass in creative constraint handling and appears frequently in technical interviews at major companies. It teaches you to recognize hidden graph structures in array problems, a pattern that appears in many advanced algorithms. When an array's values can serve as indices, you're often looking at an implicit linked list or graph.

Floyd's cycle detection is a foundational algorithm used in memory leak detection, consensus algorithms (like Bitcoin's proof-of-work), and analyzing state machines. Learning this technique here prepares you for problems involving linked lists, graph cycles, and detecting repeating states in simulations.

The binary search approach demonstrates how counting properties can enable searching on answer values rather than indices. This "binary search on answer" pattern appears in optimization problems across scheduling, resource allocation, and competitive programming.

## Examples

**Example 1:**
- Input: `nums = [1,3,4,2,2]`
- Output: `2`

**Example 2:**
- Input: `nums = [3,1,3,4,2]`
- Output: `3`

## Constraints

- 1 <= n <= 10⁵
- nums.length == n + 1
- 1 <= nums[i] <= n
- All the integers in nums appear only **once** except for **precisely one integer** which appears **two or more** times.
- How can we prove that at least one duplicate number must exist in nums?
- Can you solve the problem in linear runtime complexity?

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Array as a Graph</summary>

Since all values are between 1 and n, and the array has n+1 elements, you can think of the array as representing a graph where each index points to another index (using the value as the next index). The duplicate value creates a cycle in this graph. How do you detect cycles efficiently?

</details>

<details>
<summary>🎯 Hint 2: Floyd's Cycle Detection</summary>

Use Floyd's tortoise and hare algorithm (slow and fast pointers). Start both pointers at index 0. Move slow by one step and fast by two steps. When they meet, there's a cycle. To find the cycle entrance (the duplicate), reset one pointer to the start and move both one step at a time until they meet again.

</details>

<details>
<summary>📝 Hint 3: Alternative Binary Search Approach</summary>

Pseudocode for cycle detection:
```
// Phase 1: Find intersection point in cycle
slow = fast = nums[0]
do:
    slow = nums[slow]
    fast = nums[nums[fast]]
while slow != fast

// Phase 2: Find entrance to cycle (the duplicate)
slow = nums[0]
while slow != fast:
    slow = nums[slow]
    fast = nums[fast]
return slow
```

Alternatively, use binary search on the value range [1, n] and count how many numbers are ≤ mid.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash Set | O(n) | O(n) | Store seen numbers - violates space constraint |
| Sorting | O(n log n) | O(1) or O(n) | Sort and find adjacent duplicates - violates no-modify constraint |
| Binary Search | O(n log n) | O(1) | Search value range, count numbers ≤ mid each iteration |
| **Floyd's Cycle** | **O(n)** | **O(1)** | Optimal: Meets all constraints, treats array as linked list |

## Common Mistakes

### Mistake 1: Using Extra Space

**Wrong:**
```python
seen = set()
for num in nums:
    if num in seen:
        return num
    seen.add(num)
# O(n) space - violates constraint
```

**Correct:**
```python
# Floyd's algorithm - O(1) space
slow = fast = nums[0]
while True:
    slow = nums[slow]
    fast = nums[nums[fast]]
    if slow == fast:
        break
slow = nums[0]
while slow != fast:
    slow = nums[slow]
    fast = nums[fast]
return slow
```

Hash sets violate the O(1) space requirement.

### Mistake 2: Modifying the Array

**Wrong:**
```python
for i in range(len(nums)):
    idx = abs(nums[i])
    if nums[idx] < 0:
        return idx
    nums[idx] = -nums[idx]
# Modifies original array - violates constraint
```

**Correct:**
```python
# Floyd's algorithm doesn't modify array
slow = fast = nums[0]
# ... (same as above)
```

Negation marking modifies the array, violating the constraint.

### Mistake 3: Incorrect Cycle Detection Logic

**Wrong:**
```python
slow = fast = 0  # Starting at index instead of value
while True:
    slow = nums[slow]
    fast = nums[fast]  # Only moving one step!
    if slow == fast:
        break
```

**Correct:**
```python
slow = fast = nums[0]  # Start at nums[0], not index 0
while True:
    slow = nums[slow]
    fast = nums[nums[fast]]  # Must move TWO steps
    if slow == fast:
        break
```

Fast pointer must move two steps per iteration to catch up to slow pointer in the cycle.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Find All Duplicates | Find all numbers that appear twice | Medium |
| Missing and Duplicate | Find both the missing and duplicate number | Medium |
| K Duplicates | Find number that appears k times | Medium |
| First Missing Positive | Find smallest missing positive integer | Hard |
| Duplicate with Modifications Allowed | Solve when array modification is allowed | Easy |

## Practice Checklist

- [ ] Solve using Floyd's cycle detection (20 min)
- [ ] Solve using binary search approach (15 min)
- [ ] Understand why array represents a graph (10 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Explain why duplicate creates cycle to someone else

**Strategy**: See [Cycle Detection Pattern](../strategies/patterns/cycle-detection.md)
