---
id: M092
old_id: I029
slug: majority-element-ii
title: Majority Element II
difficulty: medium
category: medium
topics: ["array", "hash-table", "counting"]
patterns: ["boyer-moore-voting"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E169", "M229", "M275"]
prerequisites: ["hash-table", "boyer-moore-algorithm", "counting"]
---
# Majority Element II

## Problem

You are provided with an integer array containing `n` elements. Your task is to identify and return all values that appear more than `⌊ n/3 ⌋` times in the array. For example, if the array has 9 elements, you're looking for elements that appear at least 4 times (since `⌊9/3⌋ = 3` and we need more than 3 occurrences). Here's an important mathematical insight: there can be at most two such elements in any array. Why? Because if three elements each appeared more than n/3 times, their combined occurrences would exceed n, which is impossible. The straightforward approach is to count frequencies using a hash table, but the challenge is to solve this using constant extra space. This requires a clever voting algorithm that can track multiple candidates simultaneously while efficiently eliminating non-majority elements.

## Why This Matters

Finding majority elements is crucial in voting systems, distributed consensus algorithms, and data stream analysis. In blockchain networks, consensus protocols need to identify which version of the ledger has majority support among nodes. In network monitoring, you might want to detect if certain IP addresses or error codes dominate your traffic patterns beyond a threshold, which could indicate DDoS attacks or system failures. Social media platforms use similar techniques to identify trending topics that appear disproportionately often in a stream of posts. The constant-space solution (Boyer-Moore Voting Algorithm) is particularly valuable when processing massive datasets where storing a frequency table for every unique element would consume too much memory.

## Examples

**Example 1:**
- Input: `nums = [3,2,3]`
- Output: `[3]`

**Example 2:**
- Input: `nums = [1]`
- Output: `[1]`

**Example 3:**
- Input: `nums = [1,2]`
- Output: `[1,2]`

## Constraints

- 1 <= nums.length <= 5 * 10⁴
- -10⁹ <= nums[i] <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

How many elements can possibly appear more than ⌊n/3⌋ times? Think about it: if an element appears more than n/3 times, at most how many such elements can exist? This mathematical constraint is key to an optimal solution.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

There can be at most 2 elements that appear more than ⌊n/3⌋ times. Use Boyer-Moore Voting Algorithm extended to find two candidates. Maintain two candidate variables and two count variables. After finding candidates, verify they actually appear more than n/3 times with a second pass.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

```
# Phase 1: Find candidates
candidate1, candidate2 = None, None
count1, count2 = 0, 0

for num in nums:
  if num == candidate1:
    count1 += 1
  elif num == candidate2:
    count2 += 1
  elif count1 == 0:
    candidate1, count1 = num, 1
  elif count2 == 0:
    candidate2, count2 = num, 1
  else:
    count1 -= 1
    count2 -= 1

# Phase 2: Verify candidates
result = []
for candidate in [candidate1, candidate2]:
  if nums.count(candidate) > n // 3:
    result.append(candidate)
return result
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash Table | O(n) | O(n) | Count frequencies, filter results |
| Sorting | O(n log n) | O(1) | Sort and count consecutive runs |
| **Boyer-Moore Voting** | **O(n)** | **O(1)** | Two-pass: find candidates, then verify |

## Common Mistakes

### Mistake 1: Not verifying candidates after voting phase
```python
# Wrong - assumes candidates are automatically valid
candidate1, candidate2 = find_candidates(nums)
return [candidate1, candidate2]  # May not appear > n/3 times!

# Correct - verify counts in second pass
candidate1, candidate2 = find_candidates(nums)
result = []
for candidate in [candidate1, candidate2]:
    if candidate is not None and nums.count(candidate) > len(nums) // 3:
        result.append(candidate)
return result
```

### Mistake 2: Incorrect count comparison (>= vs >)
```python
# Wrong - using >= instead of >
if nums.count(candidate) >= len(nums) // 3:
    result.append(candidate)

# Correct - must be strictly greater than n/3
if nums.count(candidate) > len(nums) // 3:
    result.append(candidate)
```

### Mistake 3: Not handling the case when candidates are the same
```python
# Wrong - may return duplicate if candidate1 == candidate2
return [candidate1, candidate2]

# Correct - avoid duplicates
result = []
for candidate in set([candidate1, candidate2]):
    if candidate is not None and nums.count(candidate) > len(nums) // 3:
        result.append(candidate)
return result
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Majority Element I | Easy | Find element appearing > n/2 times (only 1 possible) |
| Majority Element III | Hard | Find elements appearing > n/k times for any k |
| Find All Duplicates | Medium | Find all elements appearing exactly twice |
| Top K Frequent Elements | Medium | Return k most frequent elements |

## Practice Checklist

- [ ] Implement hash table solution
- [ ] Implement Boyer-Moore voting algorithm
- [ ] Test with no majority elements
- [ ] Test with one majority element
- [ ] Test with two majority elements
- [ ] Test with all same elements
- [ ] Verify O(1) space complexity

**Spaced Repetition Schedule:**
- Day 1: Initial attempt, understand n/3 constraint
- Day 3: Implement Boyer-Moore without hints
- Day 7: Solve Majority Element I and III
- Day 14: Explain why at most 2 candidates exist
- Day 30: Speed solve under 15 minutes

**Strategy**: See [Boyer-Moore Voting](../strategies/patterns/voting-algorithms.md)
