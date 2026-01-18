---
id: M385
old_id: A226
slug: employee-free-time
title: Employee Free Time
difficulty: medium
category: medium
topics: ["sorting"]
patterns: []
estimated_time_minutes: 30
---
# Employee Free Time

## Problem

Imagine you manage a team and need to find time slots when everyone is available for a meeting. You're given each employee's work schedule as a list of time intervals. Each employee has multiple non-overlapping work blocks already sorted by time.

Your goal is to find all the gaps when every single employee is free simultaneously. These are the "common free time" slots where you could schedule a team meeting.

Here's what you're working with:
- `schedule`: A list of employee schedules, where `schedule[i]` is the i-th employee's list of work intervals
- Each interval represents a busy period, like `[start_time, end_time]`
- For example, `schedule = [[[1,3], [6,7]], [[2,4]], [[2,5], [9,12]]]` means:
  - Employee 0 is busy during `[1,3]` and `[6,7]`
  - Employee 1 is busy during `[2,4]`
  - Employee 2 is busy during `[2,5]` and `[9,12]`

To find common free time, think of it as finding gaps between busy periods when nobody is working. First, you'd need to merge all employees' schedules into one unified busy timeline. Then, the gaps between these merged busy blocks are when everyone is free.

Important notes:
- The input uses `Interval` objects with `.start` and `.end` properties (not arrays)
- Only return gaps with positive duration (exclude zero-length intervals like `[5, 5]`)
- Don't include infinite ranges at the beginning or end (like "free before hour 1" or "free after hour 12")

## Why This Matters

Finding common availability is ubiquitous in scheduling systems, from calendar apps like Google Calendar to meeting schedulers like Calendly. This problem teaches interval merging, a pattern that extends beyond scheduling to CPU task scheduling (finding idle periods), network packet analysis (detecting quiet periods), and database transaction management (finding gaps in lock acquisition). The technique of flattening multiple sorted lists, merging overlapping intervals, and finding gaps is a versatile algorithmic pattern you'll encounter in systems programming and distributed systems design.

## Examples

**Example 1:**
- Input: `schedule = [[[1,2],[5,6]],[[1,3]],[[4,10]]]`
- Output: `[[3,4]]`
- Explanation: With three employees total, the common free periods are [-inf, 1], [3, 4], and [10, inf].
We exclude intervals extending to infinity since they're not finite.

**Example 2:**
- Input: `schedule = [[[1,3],[6,7]],[[2,4]],[[2,5],[9,12]]]`
- Output: `[[5,6],[7,9]]`

## Constraints

- 1 <= schedule.length , schedule[i].length <= 50
- 0 <= schedule[i].start < schedule[i].end <= 10^8

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Free time exists in gaps between busy periods. Flatten all employee schedules into a single list of intervals, sort by start time, then find gaps between non-overlapping busy periods. Merge overlapping intervals first to identify truly busy times, then gaps between merged intervals are free times.
</details>

<details>
<summary>Main Approach</summary>
Collect all intervals from all employees into one list. Sort by start time. Merge overlapping intervals to get consolidated busy periods. Scan merged intervals: the gap between end of interval i and start of interval i+1 is free time. Return all such gaps.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of fully merging intervals first, use a min-heap (priority queue) to process intervals in chronological order. Track the maximum end time seen so far. When current interval's start exceeds this max end, there's a gap (free time). This avoids creating intermediate merged list.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Flatten + Sort + Merge | O(n log n) | O(n) | n = total number of intervals |
| Priority Queue | O(n log n) | O(n) | Same complexity, more elegant |

## Common Mistakes

1. **Not flattening all employee schedules**
   ```python
   # Wrong: Process each employee separately
   for employee in schedule:
       find_gaps(employee)

   # Correct: Flatten all intervals into one list
   all_intervals = []
   for employee in schedule:
       all_intervals.extend(employee)
   ```

2. **Forgetting to merge overlapping intervals**
   ```python
   # Wrong: Find gaps without merging
   all_intervals.sort()
   for i in range(len(all_intervals) - 1):
       gap = all_intervals[i+1].start - all_intervals[i].end

   # Correct: Merge first, then find gaps
   merged = merge_intervals(all_intervals)
   for i in range(len(merged) - 1):
       gap = merged[i+1].start - merged[i].end
   ```

3. **Including zero-length intervals**
   ```python
   # Wrong: Include gaps even when end == next start
   if next_start >= current_end:
       free_time.append([current_end, next_start])

   # Correct: Only positive duration gaps
   if next_start > current_end:
       free_time.append([current_end, next_start])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Merge Intervals | Medium | Core interval merging without gap finding |
| Meeting Rooms II | Medium | Count overlapping intervals |
| Insert Interval | Medium | Insert and merge single interval |
| My Calendar II | Medium | Track double bookings |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Interval Merging](../../strategies/patterns/intervals.md)
