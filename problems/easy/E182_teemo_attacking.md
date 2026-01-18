---
id: E182
old_id: I294
slug: teemo-attacking
title: Teemo Attacking
difficulty: easy
category: easy
topics: ["array", "simulation"]
patterns: ["interval-merge"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - M057  # Merge Intervals
  - M058  # Insert Interval
  - E177  # Max Consecutive Ones
prerequisites:
  - Array traversal
  - Interval handling
  - Math operations
strategy_ref: ../strategies/patterns/intervals.md
---
# Teemo Attacking

## Problem

Imagine a character launching poison attacks on a target. Each attack triggers a poison effect that lasts for a specific duration (measured in seconds). Here's how the poison mechanics work: when an attack lands at time `t`, it poisons the target for the inclusive time interval `[t, t + duration - 1]`. For example, if `duration = 2` and an attack occurs at time 5, the target is poisoned during seconds 5 and 6.

The interesting twist is that poison effects don't stack—they reset instead. If a new attack hits while the target is already poisoned, the poison timer resets to the full duration starting from the new attack time, rather than extending or adding additional damage.

You're given a non-decreasing integer array `timeSeries` representing when each attack occurs (in chronological order) and an integer `duration` specifying how long each poison effect lasts. Your task is to calculate the total number of seconds the target spends in a poisoned state. This requires careful handling of overlapping poison intervals, where successive attacks may cut short previous poison effects or allow them to expire naturally before the next attack.

## Why This Matters

This problem teaches interval arithmetic and overlap detection, fundamental skills for systems programming and time-based simulations. The core pattern—determining when consecutive time intervals overlap versus when they're separate—appears in diverse real-world contexts: calendar scheduling (booking conflicts), network packet analysis (detecting overlapping transmission windows), resource allocation (CPU time slices), and video game buff/debuff systems.

The elegant mathematical insight is that you don't need to track every individual second. Instead, for each attack-to-attack transition, you calculate the effective poison duration as the minimum of either the natural expiration time or when the next attack resets it. This reduces what could be an O(n * duration) simulation to an O(n) linear scan, teaching the valuable skill of replacing explicit iteration with mathematical reasoning. The problem also reinforces working with sorted sequences where the ordering enables single-pass solutions.

## Examples

**Example 1:**
- Input: `timeSeries = [1,4], duration = 2`
- Output: `4`
- Explanation: Attack sequence:
- Attack at time 1 causes poison during seconds 1 and 2.
- Attack at time 4 causes poison during seconds 4 and 5.
Total poisoned time: seconds 1, 2, 4, and 5 = 4 seconds.

**Example 2:**
- Input: `timeSeries = [1,2], duration = 2`
- Output: `3`
- Explanation: Attack sequence:
- Attack at time 1 causes poison during seconds 1 and 2.
- Attack at time 2 resets the timer, extending poison to seconds 2 and 3.
Total poisoned time: seconds 1, 2, and 3 = 3 seconds.

## Constraints

- 1 <= timeSeries.length <= 10⁴
- 0 <= timeSeries[i], duration <= 10⁷
- timeSeries is sorted in **non-decreasing** order.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
Iterate through the time series array. For each attack, check if the next attack happens before the current poison effect ends. If yes, add the gap between attacks to the total. If no, add the full duration. Don't forget to handle the last attack separately.

### Intermediate Hint
Use a single pass through the array. For consecutive attacks at times t1 and t2, the poisoned duration from attack at t1 is min(t2 - t1, duration) because either the poison expires naturally or gets reset by the next attack. Add the full duration for the last attack.

### Advanced Hint
Recognize this as an interval merging variant. For each attack interval [t, t+duration-1], check overlap with the next interval. Sum = Σ min(timeSeries[i+1] - timeSeries[i], duration) for i in [0, n-2] plus duration for the last attack. Time: O(n), Space: O(1).

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Simulate Each Second) | O(n * duration) | O(1) | Track each poisoned second |
| Interval Array | O(n) | O(n) | Create intervals, merge, sum lengths |
| Single Pass with Min | O(n) | O(1) | Optimal approach |
| Set of Poisoned Times | O(n * duration) | O(n * duration) | Store all poisoned seconds in set |

## Common Mistakes

### Mistake 1: Not handling the last attack
```python
# Wrong: Forgetting to add duration for last attack
def findPoisonedDuration(timeSeries, duration):
    total = 0
    for i in range(len(timeSeries) - 1):
        total += min(timeSeries[i+1] - timeSeries[i], duration)
    # Missing: add duration for the last attack
    return total
```

**Issue**: The last attack always poisons for the full duration since there's no subsequent attack to reset it.

**Fix**: Add `total += duration` after the loop to account for the last attack.

### Mistake 2: Off-by-one in interval calculation
```python
# Wrong: Incorrect interval endpoints
def findPoisonedDuration(timeSeries, duration):
    total = 0
    for i in range(len(timeSeries) - 1):
        # Wrong: should be timeSeries[i+1] - timeSeries[i], not +1
        gap = timeSeries[i+1] - timeSeries[i] + 1
        total += min(gap, duration)
    return total + duration
```

**Issue**: The gap between attacks is the difference, not difference + 1. Attack at time t means poison at [t, t+duration-1].

**Fix**: Use `timeSeries[i+1] - timeSeries[i]` without adding 1.

### Mistake 3: Creating overlapping interval objects unnecessarily
```python
# Wrong: Over-engineering with interval objects
def findPoisonedDuration(timeSeries, duration):
    intervals = []
    for t in timeSeries:
        intervals.append([t, t + duration - 1])
    # Now merge intervals... (unnecessary complexity)
```

**Issue**: This approach works but is unnecessarily complex and uses O(n) space when O(1) is possible.

**Fix**: Use the direct mathematical approach with min() in a single pass.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Multiple Poison Types | Medium | Different attacks have different durations |
| Poison Stacking | Medium | Poison effects stack instead of resetting |
| Immune Periods | Medium | Target has immunity periods where poison doesn't work |
| Maximum Poison Level | Hard | Track maximum poison concentration over time |
| Intermittent Poison | Medium | Poison only active during certain time intervals |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (15 min time limit)
- [ ] Implemented O(n) time, O(1) space solution
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with optimal approach
- [ ] Week 1: Implement without hints
- [ ] Week 2: Solve Merge Intervals variation
- [ ] Month 1: Teach interval concept to someone else

**Mastery Goals**
- [ ] Can explain why min() is needed
- [ ] Can handle edge cases (single attack, zero duration, large gaps)
- [ ] Can extend to multiple poison types
- [ ] Can solve in under 10 minutes

**Strategy**: See [Interval Patterns](../strategies/patterns/intervals.md)
