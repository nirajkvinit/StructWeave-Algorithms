---
id: H106
old_id: A324
slug: minimum-cost-to-hire-k-workers
title: Minimum Cost to Hire K Workers
difficulty: hard
category: hard
topics: ["array", "dynamic-programming"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Minimum Cost to Hire K Workers

## Problem

You have `n` candidates for hire, each with two attributes defined by arrays `quality` and `wage`:
- `quality[i]` represents the work quality level of worker `i`
- `wage[i]` represents the minimum acceptable payment for worker `i`

Your goal is to select exactly `k` workers while minimizing total cost, subject to these constraints:

	- Within the selected group, each worker's pay must be proportional to their quality level.
	- No worker can be paid less than their minimum wage requirement.

Find the minimum total payment needed to hire `k` workers under these conditions. Solutions within `10⁻⁵` of the exact answer are acceptable.

## Why This Matters

This problem develops optimization skills and teaches how to balance multiple constraints when working with numerical data.

## Examples

**Example 1:**
- Input: `quality = [10,20,5], wage = [70,50,30], k = 2`
- Output: `105.00000`
- Explanation: Hire workers 0 and 2, paying 70 and 35 respectively.

**Example 2:**
- Input: `quality = [3,1,10,10,1], wage = [4,8,2,2,7], k = 3`
- Output: `30.66667`
- Explanation: Hire workers 0, 2, and 3, paying 4, 13.33333, and 13.33333 respectively.

## Constraints

- n == quality.length == wage.length
- 1 <= k <= n <= 10⁴
- 1 <= quality[i], wage[i] <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

**Strategy**: See [Array Pattern](../strategies/patterns/dynamic-programming.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

The key is understanding the wage-to-quality ratio. If you fix one worker's ratio as the "captain" of the group, all other workers must be paid at least this ratio times their quality. To minimize cost, sort workers by their wage/quality ratio, and for each potential captain, greedily select the K-1 workers with smallest quality from those with ratio <= captain's ratio.

</details>

<details>
<summary>🎯 Main Approach</summary>

Sort workers by wage/quality ratio. Iterate through workers as potential "captain" (the one with highest ratio in the group). Maintain a max heap of the K smallest qualities seen so far. For each captain, the total cost is (sum of K smallest qualities) * (captain's ratio). Use a max heap to efficiently track and remove the largest quality when we exceed K workers.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Use a max heap (negative values in Python's min heap) to maintain the K smallest qualities efficiently. As you iterate through workers in sorted ratio order, add current worker's quality to heap and sum. If heap size exceeds K, pop the largest quality (top of max heap) and subtract from sum. This maintains the invariant that you always have the K smallest qualities among valid candidates.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^k * n) | O(1) | Try all k-combinations, check validity |
| Optimal with Heap | O(n log n) | O(n) | Sort by ratio + heap operations |

## Common Mistakes

1. **Not understanding the ratio constraint**
   ```python
   # Wrong: Trying to minimize individual wages independently
   def min_cost(quality, wage, k):
       # Pick k workers with smallest wages
       sorted_by_wage = sorted(zip(wage, quality))
       return sum(w for w, q in sorted_by_wage[:k])

   # Correct: All workers paid at same ratio as highest ratio in group
   def min_cost(quality, wage, k):
       ratio = [(w/q, q, w) for w, q in zip(wage, quality)]
       ratio.sort()
       # For each captain ratio, pay all workers at that rate
       heap = []
       total_quality = 0
       min_cost = float('inf')
       for r, q, w in ratio:
           heapq.heappush(heap, -q)  # Max heap
           total_quality += q
           if len(heap) > k:
               total_quality += heapq.heappop(heap)  # Remove largest
           if len(heap) == k:
               min_cost = min(min_cost, total_quality * r)
       return min_cost
   ```

2. **Using min heap instead of max heap**
   ```python
   # Wrong: Min heap doesn't help remove largest quality
   heap = []  # Min heap
   for quality in qualities:
       heapq.heappush(heap, quality)
       if len(heap) > k:
           heapq.heappop(heap)  # Removes smallest, not largest!

   # Correct: Max heap (negate values)
   heap = []
   total = 0
   for quality in qualities:
       heapq.heappush(heap, -quality)  # Negate for max heap
       total += quality
       if len(heap) > k:
           total += heapq.heappop(heap)  # Removes largest (most negative)
   ```

3. **Not waiting for K workers before calculating cost**
   ```python
   # Wrong: Calculating cost before having K workers
   min_cost = float('inf')
   for r, q, w in workers_by_ratio:
       add_to_heap(q)
       min_cost = min(min_cost, sum_qualities * r)  # May have < k workers

   # Correct: Only calculate when we have exactly K workers
   for r, q, w in workers_by_ratio:
       add_to_heap(q)
       if len(heap) == k:  # Important check
           min_cost = min(min_cost, sum_qualities * r)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Hire Workers with Skills | Hard | Workers have multiple skill dimensions |
| Hire with Budget Constraint | Medium | Maximum total budget instead of K workers |
| Hire with Team Requirements | Hard | Certain skill combinations required |
| Dynamic Worker Availability | Hard | Workers available at different time slots |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (k=n, all same ratio, minimum wages)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy with Heap Pattern](../../strategies/patterns/greedy.md)
