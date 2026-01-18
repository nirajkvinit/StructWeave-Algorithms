---
id: M443
old_id: A293
slug: most-profit-assigning-work
title: Most Profit Assigning Work
difficulty: medium
category: medium
topics: ["dynamic-programming"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Most Profit Assigning Work

## Problem

You're managing a job assignment platform with `n` available jobs and `m` workers. Your goal is to maximize total profit by optimally matching workers to jobs based on their skill levels.

The system is described by three arrays:

- `difficulty[i]`: The minimum skill level required to complete the `ith` job (ranging from index 0 to n-1)
- `profit[i]`: The profit earned when the `ith` job is successfully completed
- `worker[j]`: The maximum difficulty level that the `jth` worker can handle (their skill ceiling)

**Assignment rules:**
- Each worker can be assigned to **at most one job**
- A worker can only perform a job if their skill level is **greater than or equal** to the job's difficulty (`worker[j] >= difficulty[i]`)
- **Jobs can be reused**: multiple workers can be assigned to the same job (think of it as workers independently completing similar tasks)
- Workers who cannot handle any available job contribute **zero** to the total profit

Given these constraints, determine the **maximum total profit** achievable across all workers. Each worker should be assigned to the highest-profit job they can handle (or no job if they can't handle any).

## Why This Matters

This problem combines greedy algorithms with sorting and preprocessing—a pattern commonly used in resource allocation systems. You might encounter similar logic when building job scheduling systems, auction platforms matching buyers to items, or assignment problems in operations research. The key insight is recognizing that each worker independently wants the best available option, and preprocessing data can transform an O(n×m) brute force into an O(n log n + m log m) solution. This teaches you how small optimizations in data organization can dramatically improve scalability.

## Examples

**Example 1:**
- Input: `difficulty = [2,4,6,8,10], profit = [10,20,30,40,50], worker = [4,5,6,7]`
- Output: `100`
- Explanation: Workers are assigned jobs of difficulty [4,4,6,6] and they get a profit of [20,20,30,30] separately.

**Example 2:**
- Input: `difficulty = [85,47,57], profit = [24,66,99], worker = [40,25,25]`
- Output: `0`

## Constraints

- n == difficulty.length
- n == profit.length
- m == worker.length
- 1 <= n, m <= 10⁴
- 1 <= difficulty[i], profit[i], worker[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For each worker, you want to assign them the job with maximum profit that they can handle. Since each worker should be greedy (take highest profit possible), pre-process jobs to create a mapping from difficulty levels to maximum achievable profit at that difficulty or below.
</details>

<details>
<summary>🎯 Main Approach</summary>
Sort jobs by difficulty. Create a max_profit array where max_profit[d] represents the best profit achievable with ability d or less. Sort workers by ability. For each worker, use binary search or two pointers to find their maximum profit from the preprocessed array.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
After sorting jobs by difficulty, maintain a running maximum profit as you process them. This ensures that if difficulty d₁ < d₂, then max_profit[d₁] ≤ max_profit[d₂]. Use two pointers to assign workers to jobs in a single pass after sorting both arrays.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n * m) | O(1) | For each worker, check all jobs |
| Sort + Binary Search | O((n + m) log n + m log n) | O(n) | Sort jobs, binary search for each worker |
| Optimal (Two Pointers) | O(n log n + m log m) | O(n) | Sort both, single pass with two pointers |

## Common Mistakes

1. **Not maintaining maximum profit invariant**
   ```python
   # Wrong: Just sorting by difficulty doesn't ensure max profit
   jobs = sorted(zip(difficulty, profit))
   for worker_ability in worker:
       # Find job with highest difficulty <= ability
       # But this might not have highest profit!

   # Correct: Maintain running maximum
   jobs = sorted(zip(difficulty, profit))
   max_profit_so_far = 0
   for i in range(len(jobs)):
       max_profit_so_far = max(max_profit_so_far, jobs[i][1])
       jobs[i] = (jobs[i][0], max_profit_so_far)
   ```

2. **Inefficient worker assignment**
   ```python
   # Wrong: Binary search for each worker separately
   total = 0
   for ability in worker:
       # Binary search in jobs array
       total += binary_search_profit(jobs, ability)

   # Correct: Sort workers and use two pointers
   worker.sort()
   j = 0
   max_profit = 0
   for ability in worker:
       while j < len(jobs) and jobs[j][0] <= ability:
           max_profit = max(max_profit, jobs[j][1])
           j += 1
       total += max_profit
   ```

3. **Assuming one job per worker is restrictive**
   ```python
   # Wrong: Trying to assign different jobs to different workers
   # (Problem allows job reuse!)

   # Correct: Each worker independently chooses best available job
   # Jobs can be assigned to multiple workers
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Job assignment without reuse | Hard | Each job assigned once, use matching algorithm |
| Multiple jobs per worker | Hard | Knapsack-style optimization |
| Jobs with time constraints | Hard | Additional temporal dimension |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md) | [Sorting and Searching](../../strategies/patterns/sorting.md)
