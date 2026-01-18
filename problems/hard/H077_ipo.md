---
id: H077
old_id: A002
slug: ipo
title: IPO
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# IPO

## Problem

Imagine a company preparing for an **IPO**. To boost its valuation for investors, the company wants to complete projects that will increase its available funds. However, resource constraints limit the company to completing no more than `k` different projects before the IPO date. Your goal is to determine the optimal project selection strategy that maximizes the company's total capital.

You receive information about `n` available projects. Each project `i` yields a net profit of `profits[i]` and requires an initial investment of `capital[i]` to begin.

Your starting capital is `w`. After completing a project, you earn its profit, which gets added to your available capital for future investments.

Select up to `k` distinct projects to **maximize the final capital amount**, and return *that maximum capital value*.

The result will always fit within a 32-bit signed integer.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `k = 2, w = 0, profits = [1,2,3], capital = [0,1,1]`
- Output: `4`
- Explanation: Beginning with zero capital, only project 0 is affordable.
Completing project 0 generates 1 profit, bringing capital to 1.
With 1 capital available, both project 1 and project 2 become viable options.
Given the limit of 2 projects total, selecting project 2 yields the highest return.
Final calculation: 0 + 1 + 3 = 4.

**Example 2:**
- Input: `k = 3, w = 0, profits = [1,2,3], capital = [0,1,2]`
- Output: `6`

## Constraints

- 1 <= k <= 10⁵
- 0 <= w <= 10⁹
- n == profits.length
- n == capital.length
- 1 <= n <= 10⁵
- 0 <= profits[i] <= 10⁴
- 0 <= capital[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This is a greedy problem with two priority considerations:
1. You can only take projects you can afford (capital[i] <= current_capital)
2. Among affordable projects, you should take the most profitable one

The challenge is efficiently maintaining two sets: affordable vs. unaffordable projects, as the boundary changes after each project completion.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use two heaps (priority queues):
1. Min heap of all projects sorted by capital requirement
2. Max heap of currently affordable projects sorted by profit

Algorithm:
- Start with current capital w
- Repeat k times:
  - Move all affordable projects from min heap to max heap
  - If max heap is empty, break (no affordable projects)
  - Take the most profitable project from max heap
  - Add its profit to current capital
- Return final capital

This greedy approach works because taking the most profitable affordable project now never prevents you from taking better projects later.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Instead of repeatedly scanning for affordable projects, sort all projects by capital requirement initially. Maintain a pointer that moves through this sorted list, pushing projects onto the max heap as they become affordable. This ensures each project is considered exactly once for affordability.

Also, if k ≥ n (more project slots than projects), you can simply take all projects, but still need to respect capital constraints in order.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(k × n) | O(1) | For each of k rounds, scan all n projects |
| Sorting + Greedy | O(n log n + k log n) | O(n) | Sort once, k heap operations |
| Optimal (Two Heaps) | O(n log n) | O(n) | Each project pushed/popped once |

## Common Mistakes

1. **Not maintaining project availability correctly**
   ```python
   # Wrong: Rescanning all projects every iteration
   for _ in range(k):
       best = -1
       for i in range(n):
           if capital[i] <= w and not used[i]:
               if best == -1 or profits[i] > profits[best]:
                   best = i
       # O(k × n) - inefficient

   # Correct: Use heaps to efficiently track affordable projects
   import heapq
   projects = sorted(zip(capital, profits))
   available = []  # Max heap of profits
   idx = 0

   for _ in range(k):
       # Add newly affordable projects
       while idx < len(projects) and projects[idx][0] <= w:
           heapq.heappush(available, -projects[idx][1])  # Negative for max heap
           idx += 1
       if not available:
           break
       w += -heapq.heappop(available)
   ```

2. **Taking projects in wrong order**
   ```python
   # Wrong: Taking cheapest projects first
   projects.sort(key=lambda x: x[0])  # Sort by capital
   for i in range(min(k, n)):
       if projects[i][0] <= w:
           w += projects[i][1]
   # Misses more profitable options

   # Correct: Among affordable projects, take most profitable
   # Use max heap to always get highest profit
   while available and rounds < k:
       profit = -heapq.heappop(available)
       w += profit
       rounds += 1
   ```

3. **Not breaking when no affordable projects remain**
   ```python
   # Wrong: Continuing loop even when stuck
   for _ in range(k):
       # ... add affordable projects to heap ...
       w += -heapq.heappop(available)  # Error if heap is empty!

   # Correct: Check if any projects are affordable
   for _ in range(k):
       while idx < n and projects[idx][0] <= w:
           heapq.heappush(available, -projects[idx][1])
           idx += 1
       if not available:
           break  # Can't do any more projects
       w += -heapq.heappop(available)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Maximum Profit in Job Scheduling | Hard | Projects have deadlines (time dimension) |
| Course Schedule III | Hard | Similar with duration and deadline constraints |
| Maximum Performance of a Team | Hard | Multi-dimensional optimization (speed × efficiency) |
| Minimum Cost to Hire K Workers | Hard | Similar greedy with constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (no affordable projects, k > n)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
