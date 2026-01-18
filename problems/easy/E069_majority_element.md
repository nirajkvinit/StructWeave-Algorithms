---
id: E069
old_id: F169
slug: majority-element
title: Majority Element
difficulty: easy
category: easy
topics: ["array", "hash-table", "divide-and-conquer"]
patterns: ["boyer-moore-voting"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M229", "M075", "E217"]
prerequisites: ["arrays", "hash-maps"]
strategy_ref: ../strategies/patterns/boyer-moore-voting.md
---
# Majority Element

## Problem

Given an array of integers, find the **majority element** - the element that appears more than ⌊n/2⌋ times. The problem guarantees that a majority element always exists.

**What is a majority element?**
- It must appear MORE than half the time (strictly greater than n/2)
- In an array of size 7, it must appear at least 4 times
- In an array of size 8, it must appear at least 5 times

**Examples:**
```
[3,2,3] → 3 appears 2 times out of 3 (2 > 3/2)
[2,2,1,1,1,2,2] → 2 appears 4 times out of 7 (4 > 7/2)
```

**The simple approach:** Count occurrences with a hash map in O(n) time and O(n) space.

**The challenge:** Can you solve this in O(1) space? There's an elegant algorithm called Boyer-Moore Voting that treats elements like they're voting against each other.

**Boyer-Moore intuition:** Imagine different elements "canceling out" when they meet. The majority element appears more than all others combined, so it will survive the cancellation.

## Why This Matters

This problem introduces the **Boyer-Moore Voting Algorithm** - one of the most elegant space-efficient algorithms in computer science. The pattern appears in:
- **Stream processing**: Finding majority in data you can only see once
- **Distributed voting systems**: Determining consensus in distributed databases
- **Data deduplication**: Identifying dominant patterns in logs
- **Fault tolerance**: Majority voting in redundant systems

Beyond the specific algorithm, this teaches a powerful problem-solving approach: when you have constraints (like limited space), think about what properties you can exploit. Here, the property is "majority means > 50%, which survives cancellation with all others."

## Examples

**Example 1:**
- Input: `nums = [3,2,3]`
- Output: `3`

**Example 2:**
- Input: `nums = [2,2,1,1,1,2,2]`
- Output: `2`

## Constraints

- n == nums.length
- 1 <= n <= 5 * 10⁴
- -10⁹ <= nums[i] <= 10⁹

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Count the Occurrences</summary>

The straightforward approach is to count how many times each element appears. The element that appears more than n/2 times is the answer.

What data structure is perfect for counting occurrences? Think about key-value pairs where the key is the element and the value is its count.

But there's a much cleverer O(1) space solution. Think about what "majority element" means - it appears MORE than half the time. What if you could "cancel out" different elements?

</details>

<details>
<summary>🎯 Hint 2: Boyer-Moore Voting Algorithm</summary>

Imagine elements voting against each other:
- If two different elements meet, they "cancel out"
- The majority element, appearing >n/2 times, will survive this cancellation

Algorithm intuition:
1. Keep a candidate and a count
2. When count is 0, pick a new candidate
3. When you see the candidate, increment count
4. When you see a different element, decrement count
5. The final candidate is the majority element

Why does this work? The majority element appears more than all others combined, so it will always remain after cancellations.

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithms</summary>

**Hash Map Approach:**
```
1. Create hash map to count occurrences
2. For each element in nums:
   a. Increment its count in map
   b. If count > n/2, return this element
3. Return any element (majority guaranteed to exist)
```
Time: O(n), Space: O(n)

**Boyer-Moore Voting (Optimal):**
```
1. Initialize candidate = None, count = 0
2. For each element in nums:
   a. If count == 0:
      - candidate = element
   b. If element == candidate:
      - count++
   c. Else:
      - count--
3. Return candidate
```
Time: O(n), Space: O(1)

Example: [2,2,1,1,1,2,2]
- 2: candidate=2, count=1
- 2: count=2
- 1: count=1
- 1: count=0
- 1: candidate=1, count=1
- 2: count=0
- 2: candidate=2, count=1 → Answer: 2
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Count each element's occurrences |
| Sorting | O(n log n) | O(1) or O(n) | Middle element is majority |
| Hash Map | O(n) | O(n) | Count occurrences |
| **Boyer-Moore Voting** | **O(n)** | **O(1)** | Optimal solution |
| Divide & Conquer | O(n log n) | O(log n) | Recursive approach |

## Common Mistakes

### 1. Not Handling the Voting Algorithm Correctly
```python
# WRONG: Not resetting candidate when count is 0
candidate = nums[0]
count = 1
for i in range(1, len(nums)):
    if nums[i] == candidate:
        count += 1
    else:
        count -= 1
# This doesn't switch candidates when count hits 0

# CORRECT: Reset candidate when count is 0
candidate = None
count = 0
for num in nums:
    if count == 0:
        candidate = num
    count += (1 if num == candidate else -1)
```

### 2. Assuming First Element is Majority
```python
# WRONG: Return first element after single pass
candidate = nums[0]
# What if [1,2,2,2,2]? First element isn't majority

# CORRECT: Use voting algorithm to find true majority
# (Or in some problems, verify with second pass)
```

### 3. Misunderstanding "Majority" Definition
```python
# WRONG: Looking for element that appears most (plurality)
# This problem guarantees majority (>n/2), not just most frequent

# CORRECT: Majority means >50%, not just "most common"
# The problem states majority always exists
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Majority Element II (M229) | Find elements appearing >n/3 times | Modified voting with 2 candidates |
| No majority guaranteed | Majority might not exist | Verify candidate with second pass |
| Return all majorities | Multiple elements >n/k | Generalized voting algorithm |
| Majority in subarrays | Find majority in each subarray | Apply algorithm to each subarray |

## Practice Checklist

**Correctness:**
- [ ] Handles array with all same elements
- [ ] Handles array with two distinct elements
- [ ] Handles array with multiple different elements
- [ ] Handles minimum size array (n=1)
- [ ] Handles negative numbers
- [ ] Works when majority is at the end

**Interview Readiness:**
- [ ] Can explain hash map approach
- [ ] Can explain Boyer-Moore voting algorithm
- [ ] Can code both solutions
- [ ] Can prove why voting works
- [ ] Can extend to Majority Element II (>n/3)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Majority Element II variation
- [ ] Day 14: Explain algorithm to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Boyer-Moore Voting Pattern](../../strategies/patterns/boyer-moore-voting.md)
