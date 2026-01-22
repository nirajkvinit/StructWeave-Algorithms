---
id: E001
old_id: F001
slug: two-sum
title: Two Sum
difficulty: easy
category: easy
topics: ["array", "hash-table"]
patterns: ["complement-search", "hash-map-lookup"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E010", "E013", "M002"]
prerequisites: ["arrays-basics", "hash-table-basics"]
---

# Two Sum

## Problem

Given an array of integers and a target sum, find the positions (indices) of two numbers that add up to the target. Return these positions as a pair of indices.

For example, if you have the array `[2, 7, 11, 15]` and target `9`, you should return `[0, 1]` because `2 + 7 = 9`. The problem guarantees exactly one valid solution exists in every input, and you cannot use the same array element twice. The indices can be returned in any order.

Note that you're returning the positions where the numbers appear in the array, not the numbers themselves. So for the example above, you return `[0, 1]` (the indices), not `[2, 7]` (the values).

## Why This Matters

This problem is the foundation of algorithmic problem-solving and appears in some form in nearly every technical interview. It introduces the critical concept of complement searching, where instead of looking for two numbers that sum to a target, you ask "for each number, does its complement (target minus the number) exist elsewhere?" This mental shift from searching for pairs to searching for complements is a pattern you'll use in dozens of other problems.

The problem also teaches a fundamental trade-off in algorithm design: you can solve it in O(n²) time using no extra space by checking every pair, or in O(n) time using O(n) extra space with a hash table. Understanding when to trade space for speed is essential for building efficient systems. Hash tables enable O(1) average lookup time, making them indispensable in real-world applications like database indexing, caching layers in web services, and matching engines in financial trading systems.

## Examples

**Example 1:**

- Input: `nums = [2,7,11,15], target = 9`
- Output: `[0,1]`
- Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

**Example 2:**

- Input: `nums = [3,2,4], target = 6`
- Output: `[1,2]`
- Explanation: nums[1] + nums[2] = 2 + 4 = 6.

**Example 3:**

- Input: `nums = [3,3], target = 6`
- Output: `[0,1]`
- Explanation: Same values at different indices is valid.

## Constraints

- 2 <= nums.length <= 10⁴
- -10⁹ <= nums[i] <= 10⁹
- -10⁹ <= target <= 10⁹
- **Only one valid answer exists.**

---

## Test Cases

Copy-paste friendly test cases for your IDE:

```json
[
  {
    "input": { "nums": [2, 7, 11, 15], "target": 9 },
    "expected": [0, 1],
    "description": "Basic case - first two elements"
  },
  {
    "input": { "nums": [3, 2, 4], "target": 6 },
    "expected": [1, 2],
    "description": "Answer not at beginning"
  },
  {
    "input": { "nums": [3, 3], "target": 6 },
    "expected": [0, 1],
    "description": "Duplicate values"
  },
  {
    "input": { "nums": [-1, -2, -3, -4, -5], "target": -8 },
    "expected": [2, 4],
    "description": "Negative numbers"
  },
  {
    "input": { "nums": [0, 4, 3, 0], "target": 0 },
    "expected": [0, 3],
    "description": "Zero values"
  }
]
```

**CSV Format:**
```csv
nums,target,expected
"[2,7,11,15]",9,"[0,1]"
"[3,2,4]",6,"[1,2]"
"[3,3]",6,"[0,1]"
"[-1,-2,-3,-4,-5]",-8,"[2,4]"
"[0,4,3,0]",0,"[0,3]"
```

---

## Think About

1. What's the brute force approach? What's its time complexity?
2. For each number, what value would complete the pair?
3. Which data structure provides O(1) average lookup?
4. Should you store a number before or after checking for its complement?

---

## Approach Hints

<details>
<summary>💡 Hint 1: What's the naive approach?</summary>

The brute force checks every pair of numbers. For each element at index `i`, you check every element at index `j > i`.

**Think about:**

- How many pairs are there in an array of n elements?
- What's the time complexity of this approach?
- Can you do better than O(n²)?

</details>

<details>
<summary>🎯 Hint 2: The complement insight</summary>

Instead of searching for pairs, think about what you **need** for each number.

For a number `x`, you need `target - x` to exist somewhere else in the array.

**Key question:** Which data structure lets you check "does value Y exist?" in O(1) time?

Store what you've seen, and for each new number, check if its complement was already seen.

</details>

<details>
<summary>📝 Hint 3: Hash map algorithm</summary>

```
create empty hash map: value → index

for each index i, number in array:
    complement = target - number

    if complement exists in hash map:
        return [hash_map[complement], i]

    store number → i in hash map

return []  # no solution (won't happen per constraints)
```

**Why store after checking?** To avoid using the same element twice. If target = 6 and we see 3, we don't want to match 3 with itself.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force | O(n²) | O(1) | Simple but slow; checks all pairs |
| Sorting + Two Pointers | O(n log n) | O(n) | Faster but loses original indices |
| **Hash Map (Optimal)** | **O(n)** | **O(n)** | Single pass; optimal time |

**Why Hash Map Wins:**

- Single pass through array
- Each lookup/insert is O(1) average
- Space trade-off is acceptable for 10⁴ elements

---

## Common Mistakes

### 1. Using the same element twice

```
# WRONG: This matches element with itself
if target == 2 * nums[i]:  # e.g., [3], target=6
    return [i, i]  # Invalid!

# CORRECT: Check if complement exists at different index
if complement in seen and seen[complement] != i:
    return [seen[complement], i]
```

### 2. Returning values instead of indices

```
# WRONG
return [nums[i], nums[j]]

# CORRECT
return [i, j]
```

### 3. Storing before checking

```
# WRONG: Allows same element to be used twice
seen[num] = i
if complement in seen:  # Might find the number we just stored!
    ...

# CORRECT: Check first, then store
if complement in seen:
    return [seen[complement], i]
seen[num] = i
```

### 4. Forgetting negative numbers

- The array can contain negatives: `[-3, 4, 3, 90]`, target = 0
- Your solution must handle this (hash maps work fine with negatives)

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Sorted array** | Input is sorted | Use two pointers: O(1) space |
| **Return all pairs** | Multiple solutions exist | Collect all, don't return early |
| **Duplicates allowed** | Same indices reusable | Store counts, not just presence |
| **Find if pair exists** | Boolean output | Same approach, return true/false |
| **Three Sum (E010)** | Find triplets | Fix one element, Two Sum on rest |
| **Four Sum (E013)** | Find quadruplets | Fix two elements, Two Sum on rest |

**Two Pointers Variation (sorted input):**

```
left, right = 0, len(nums) - 1
while left < right:
    current_sum = nums[left] + nums[right]
    if current_sum == target:
        return [left, right]
    elif current_sum < target:
        left += 1
    else:
        right -= 1
```

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic case (Example 1)
- [ ] Handles same values at different indices (Example 3)
- [ ] Handles negative numbers
- [ ] Returns indices, not values

**Optimization:**

- [ ] Achieved O(n) time complexity
- [ ] Single pass solution implemented
- [ ] Explained time/space trade-off

**Interview Readiness:**

- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 5 minutes
- [ ] Can discuss variations and follow-ups
- [ ] Identified edge cases without prompting

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve with variations
- [ ] Day 14: Explain to someone else
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md) | [Hash Table Guide](../../prerequisites/hash-tables.md)
