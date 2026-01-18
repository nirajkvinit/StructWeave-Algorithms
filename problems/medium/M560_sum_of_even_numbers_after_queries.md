---
id: M560
old_id: A452
slug: sum-of-even-numbers-after-queries
title: Sum of Even Numbers After Queries
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Sum of Even Numbers After Queries

## Problem

Imagine you're tracking a scoreboard (integer array `nums`) that gets updated repeatedly. After each update, you need to quickly report the sum of all even scores. The challenge: doing this efficiently without recalculating the entire sum every time.

You're given:
- An integer array `nums` representing initial values
- A `queries` array where each query is `[value, index]`

For each query, process it in sequence:

1. **Add** `value` to the element at position `index` in `nums`
   - `nums[index] += value`
2. **Calculate** the sum of all even numbers currently in `nums`
3. **Record** this sum as your answer for this query

Return an array `answer` where `answer[i]` is the sum of even values after processing query `i`.

Example walkthrough:
```
Initial: nums = [1, 2, 3, 4]
Even sum initially = 2 + 4 = 6

Query 1: [1, 0] → nums[0] += 1 → [2, 2, 3, 4]
Even sum = 2 + 2 + 4 = 8 ✓

Query 2: [-3, 1] → nums[1] += (-3) → [2, -1, 3, 4]
Even sum = 2 + 4 = 6 ✓ (note: -1 is odd)

Query 3: [-4, 0] → nums[0] += (-4) → [-2, -1, 3, 4]
Even sum = -2 + 4 = 2 ✓ (negative even numbers count!)
```

## Why This Matters

Efficiently maintaining aggregate statistics during dynamic updates is fundamental to real-time analytics systems. Stock trading platforms track running totals of profitable trades (even profit values) as new transactions arrive. Game servers calculate team scores aggregating even-numbered bonus points during live gameplay. Database systems maintain summary statistics over actively changing tables without full table scans. Monitoring dashboards track metrics like even-numbered success codes vs odd-numbered error codes in web server logs. IoT sensor networks aggregate readings where even values indicate normal operation while odd values flag anomalies. The key challenge: avoiding expensive recalculation when only one value changes. This pattern of incremental update with conditional aggregation appears in caching systems, financial ledgers, scientific simulations, and any system requiring real-time summaries over evolving datasets.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,4], queries = [[1,0],[-3,1],[-4,0],[2,3]]`
- Output: `[8,6,2,4]`
- Explanation: Initial array: [1,2,3,4]. Query 1: Add 1 to index 0 → [2,2,3,4], even sum = 2+2+4 = 8. Query 2: Add -3 to index 1 → [2,-1,3,4], even sum = 2+4 = 6. Query 3: Add -4 to index 0 → [-2,-1,3,4], even sum = -2+4 = 2. Query 4: Add 2 to index 3 → [-2,-1,3,6], even sum = -2+6 = 4.

**Example 2:**
- Input: `nums = [1], queries = [[4,0]]`
- Output: `[0]`

## Constraints

- 1 <= nums.length <= 10⁴
- -10⁴ <= nums[i] <= 10⁴
- 1 <= queries.length <= 10⁴
- -10⁴ <= vali <= 10⁴
- 0 <= indexi < nums.length

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Instead of recalculating the sum of all even numbers after each query (O(n) per query), maintain a running total and only update it based on how the modified element changes. Track whether the element at the target index was even before and after the update.
</details>

<details>
<summary>Main Approach</summary>
Pre-compute the initial sum of all even numbers. For each query: (1) Check if nums[index] is currently even, (2) Apply the update nums[index] += val, (3) Check if nums[index] is now even, (4) Update the running sum based on the even/odd transitions. Four cases: even→even, even→odd, odd→even, odd→odd.
</details>

<details>
<summary>Optimization Tip</summary>
Before adding val to nums[index], subtract the old value from sum if it was even. After adding val, add the new value to sum if it's now even. This handles all four transition cases elegantly without complex conditional logic.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive | O(n * q) | O(q) | Recalculate sum after each of q queries |
| Optimal | O(n + q) | O(q) | Pre-compute sum, then O(1) per query |

## Common Mistakes

1. **Recalculating sum every time**
   ```python
   # Wrong: O(n) per query - too slow
   def sumEvenAfterQueries(nums, queries):
       result = []
       for val, idx in queries:
           nums[idx] += val
           even_sum = sum(x for x in nums if x % 2 == 0)
           result.append(even_sum)

   # Correct: Maintain running sum - O(1) per query
   even_sum = sum(x for x in nums if x % 2 == 0)
   for val, idx in queries:
       if nums[idx] % 2 == 0:
           even_sum -= nums[idx]
       nums[idx] += val
       if nums[idx] % 2 == 0:
           even_sum += nums[idx]
       result.append(even_sum)
   ```

2. **Not handling negative numbers correctly**
   ```python
   # Wrong: Forgetting that negative even numbers are still even
   if nums[idx] > 0 and nums[idx] % 2 == 0:

   # Correct: Check modulo regardless of sign
   if nums[idx] % 2 == 0:  # Works for negative numbers too
   ```

3. **Incorrect transition logic**
   ```python
   # Wrong: Complicated nested conditionals
   old_even = nums[idx] % 2 == 0
   nums[idx] += val
   new_even = nums[idx] % 2 == 0
   if old_even and new_even:
       even_sum = even_sum - old_value + new_value
   elif old_even and not new_even:
       even_sum -= old_value
   # ... etc

   # Correct: Simple subtract-then-add pattern
   if nums[idx] % 2 == 0:
       even_sum -= nums[idx]
   nums[idx] += val
   if nums[idx] % 2 == 0:
       even_sum += nums[idx]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Range Sum Query (Immutable) | Easy | Pre-compute prefix sums, no updates |
| Range Sum Query (Mutable) | Medium | Updates allowed, use segment tree or BIT |
| Sum of Odd Numbers After Queries | Easy | Same approach, check for odd instead |
| Product of Array Except Self | Medium | Maintain product instead of sum |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Running Sum/Product](../../strategies/patterns/prefix-sum.md)
