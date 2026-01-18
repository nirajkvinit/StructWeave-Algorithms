---
id: M290
old_id: A097
slug: course-schedule-iii
title: Course Schedule III
difficulty: medium
category: medium
topics: ["array", "greedy", "heap"]
patterns: ["greedy-scheduling"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M180", "M181", "H024"]
prerequisites: ["greedy-algorithms", "heap", "sorting"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Course Schedule III

## Problem

You want to maximize the number of online courses you can complete, given time constraints. Each course is represented as `[duration, lastDay]` where:
- `duration` is how many consecutive days you need to complete it
- `lastDay` is the deadline - you must finish on or before this day

Starting on day 1, you work on one course at a time (no multitasking). If a course takes 100 days and you start on day 1, you finish on day 100. You can then start the next course on day 101.

For example, with courses `[[100,200], [200,1300], [1000,1250], [2000,3200]]`:
- Take course 1 (100 days): finish on day 100 ≤ 200 ✓
- Take course 3 (1000 days): finish on day 1100 ≤ 1250 ✓
- Take course 2 (200 days): finish on day 1300 ≤ 1300 ✓
- Can't take course 4: would finish on day 3300 > 3200 ✗
- Maximum: 3 courses

The naive approach would try all permutations, but there are n! orderings. The breakthrough insight combines two strategies:

1. **Greedy sorting**: Process courses by deadline (earliest first). This ensures you don't waste time on courses with flexible deadlines while missing urgent ones.

2. **Regretful swapping**: If a course would exceed its deadline, you can still include it by "swapping out" a previously taken course that was longer. Use a max heap to track the longest course taken so far. If the current course is shorter than the longest taken course, swap them - you free up time without losing a course count.

This "regretful" aspect is subtle: you might take a long course early on, then realize later that you could've taken more total courses if you'd skipped that long one for several shorter ones.

## Why This Matters

This problem models real project scheduling under deadlines - a scenario in software sprints, construction management, and academic planning. The combination of greedy deadline sorting with dynamic course swapping demonstrates a sophisticated optimization technique where you make tentative choices, then revise them when better options emerge. This "greedy with revision" pattern appears in online algorithms and streaming data scenarios where you process items sequentially but can retroactively adjust decisions. The heap data structure enables efficient tracking of the best candidate for removal (longest course). Understanding this pattern prepares you for interval scheduling variations, resource allocation with constraints, and other NP-hard problems where greedy heuristics with backtracking produce optimal or near-optimal solutions.

## Examples

**Example 1:**
- Input: `courses = [[100,200],[200,1300],[1000,1250],[2000,3200]]`
- Output: `3`
- Explanation: Out of 4 available courses, you can complete at most 3: Take course 1 (100 days), completing on day 100, available to start next on day 101. Take course 3 (1000 days), completing on day 1100, available to start next on day 1101. Take course 2 (200 days), completing on day 1300. Course 4 cannot fit because it would finish on day 3300, past its deadline.

**Example 2:**
- Input: `courses = [[1,2]]`
- Output: `1`

**Example 3:**
- Input: `courses = [[3,2],[4,3]]`
- Output: `0`

## Constraints

- 1 <= courses.length <= 10⁴
- 1 <= durationi, lastDayi <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Greedy Sorting Strategy</summary>

The key insight is to sort courses by their deadlines (lastDay) in ascending order. By considering courses with earlier deadlines first, you maximize your chances of fitting in more courses. This greedy choice ensures you don't miss early deadlines while waiting for later ones.

</details>

<details>
<summary>Hint 2: Swap Out Longer Courses</summary>

As you iterate through sorted courses, maintain a running total of time spent. If adding a course exceeds its deadline, you can still include it by removing a previously taken course with a longer duration (if one exists). Use a max heap to efficiently track and remove the longest course taken so far. This swap can only improve or maintain the number of courses completed.

</details>

<details>
<summary>Hint 3: Max Heap Implementation</summary>

Use a max heap to store durations of courses you've taken. When the current time plus new course duration exceeds the new course's deadline, check if the heap's maximum (longest course taken) is longer than the current course. If so, remove the longest course and add the current one. This maintains the invariant that you take the maximum number of courses while staying within deadlines.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy + Max Heap | O(n log n) | O(n) | Sorting takes O(n log n), heap operations O(n log n) |
| Brute Force | O(n! * n) | O(n) | Try all permutations and check validity |
| Dynamic Programming | O(n * T) | O(n * T) | T is sum of all durations; impractical for large T |

## Common Mistakes

1. **Sorting by duration instead of deadline**
```python
# Wrong: sorts by duration
def scheduleCourse(courses):
    courses.sort(key=lambda x: x[0])  # Wrong criteria
    # This doesn't prioritize urgent deadlines

# Correct: sort by deadline
def scheduleCourse(courses):
    courses.sort(key=lambda x: x[1])  # Sort by lastDay
    # Now we handle urgent courses first
```

2. **Not using heap for efficient removal**
```python
# Wrong: uses list and removes inefficiently
def scheduleCourse(courses):
    taken = []  # List of durations
    for duration, deadline in courses:
        if time + duration > deadline and taken:
            taken.remove(max(taken))  # O(n) removal

# Correct: use max heap
import heapq
def scheduleCourse(courses):
    max_heap = []  # Store negative durations for max heap
    for duration, deadline in courses:
        if time + duration > deadline and max_heap:
            heapq.heappushpop(max_heap, -duration)  # O(log n)
```

3. **Incorrect time tracking after swap**
```python
# Wrong: doesn't update time when swapping
if time + duration > deadline:
    longest = -heapq.heappop(max_heap)
    heapq.heappush(max_heap, -duration)
    # Missing: time = time - longest + duration

# Correct: update time correctly
if time + duration > deadline and max_heap:
    longest = -max_heap[0]
    if longest > duration:
        heapq.heapreplace(max_heap, -duration)
        time = time - longest + duration
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Maximum Profit Courses | Each course has a profit value; maximize total profit | Hard |
| Parallel Course Scheduling | Can take k courses simultaneously | Hard |
| Prerequisite Course Scheduling | Some courses have prerequisite constraints | Hard |
| Weighted Course Scheduling | Courses have different priorities/weights | Medium |

## Practice Checklist

- [ ] Implement greedy solution with max heap
- [ ] Sort courses by deadline correctly
- [ ] Handle swap logic when deadline exceeded
- [ ] Track time correctly after swaps
- [ ] Test with example: [[100,200],[200,1300],[1000,1250],[2000,3200]]
- [ ] Test edge case: all courses have same deadline
- [ ] Test edge case: impossible to take any course
- [ ] **Review in 24 hours**: Re-implement from memory
- [ ] **Review in 1 week**: Solve without hints
- [ ] **Review in 2 weeks**: Explain why greedy strategy works

**Strategy**: See [Greedy Pattern](../strategies/patterns/greedy.md)
