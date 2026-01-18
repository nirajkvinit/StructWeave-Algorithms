---
id: M286
old_id: A090
slug: task-scheduler
title: Task Scheduler
difficulty: medium
category: medium
topics: ["greedy", "heap", "hash-table"]
patterns: ["greedy-scheduling", "max-heap"]
estimated_time_minutes: 30
frequency: high
related_problems:
  - id: E347
    name: Top K Frequent Elements
    difficulty: easy
  - id: M200
    name: Reorganize String
    difficulty: medium
  - id: H050
    name: Rearrange String k Distance Apart
    difficulty: hard
prerequisites:
  - concept: Greedy algorithms
    level: intermediate
  - concept: Heap/Priority Queue
    level: intermediate
  - concept: Frequency counting
    level: basic
---
# Task Scheduler

## Problem

You're scheduling tasks for a CPU with a thermal management system. The input is an array of tasks represented by characters (e.g., `['A', 'A', 'A', 'B', 'B', 'B']`), where each unique letter represents a different task type. Every task takes exactly 1 time unit to execute, and the CPU can run one task per time unit.

The critical constraint is the cooldown period `n`: after the CPU executes a task of type X, it must wait at least `n` time units before executing another task of type X. During cooldown, the CPU can either work on different task types or sit idle. Your goal is to find the minimum total time (including both active and idle time) needed to complete all tasks.

For example, with `tasks = ['A','A','A','B','B','B']` and `n = 2`:
- One valid schedule: `A → B → idle → A → B → idle → A → B` (8 time units)
- You can't do `A → A → ...` because task A needs 2 idle units between executions
- Interleaving with B reduces idle time

The naive approach is simulation, but there's a beautiful mathematical insight: the task with the highest frequency determines the minimum time structure. If a task appears `max_freq` times, you need at least `(max_freq - 1)` cooldown cycles. Each cycle spans `n + 1` time units (1 for the frequent task + n cooldown slots). Add the final occurrence(s) of the most frequent task(s) at the end.

However, if you have enough task diversity, you might need zero idle time - the answer is then just the total number of tasks. The formula combines these cases elegantly.

## Why This Matters

This problem models real CPU scheduling with thermal constraints, where processors throttle to prevent overheating. Modern CPUs use similar principles for power management. Beyond hardware, the pattern applies to job scheduling with resource conflicts (can't use the same machine twice in a row), distributed task assignment with rate limiting, and even traffic light optimization. The greedy heap approach teaches priority-based scheduling, while the mathematical formula demonstrates how to avoid simulation through insight - a critical skill for system design. This problem frequently appears in interviews because it tests multiple skills: frequency counting, greedy strategy, heap operations, and mathematical reasoning.

## Examples

**Example 1:**
- Input: `tasks = ["A","A","A","B","B","B"], n = 2`
- Output: `8`
- Explanation: A -> B -> idle -> A -> B -> idle -> A -> B
At least 2 time units separate any two identical tasks.

**Example 2:**
- Input: `tasks = ["A","A","A","B","B","B"], n = 0`
- Output: `6`
- Explanation: When n = 0, any arrangement of the 6 tasks works.
["A","A","A","B","B","B"]
["A","B","A","B","A","B"]
["B","B","B","A","A","A"]
...
And so on.

**Example 3:**
- Input: `tasks = ["A","A","A","A","A","A","B","C","D","E","F","G"], n = 2`
- Output: `16`
- Explanation: One possible solution is
A -> B -> C -> A -> D -> E -> A -> F -> G -> A -> idle -> idle -> A -> idle -> idle -> A

## Constraints

- 1 <= task.length <= 10⁴
- tasks[i] is upper-case English letter.
- The integer n is in the range [0, 100].

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Mathematical Formula Based on Most Frequent Task</summary>

Key insight: The task with maximum frequency determines the minimum time.

If the most frequent task appears `max_freq` times:
- We need at least `(max_freq - 1)` cooldown periods
- Each period has length `n + 1` (task + n idle slots)
- Plus final occurrence of most frequent task

```python
# Count frequencies
from collections import Counter
freq = Counter(tasks)
max_freq = max(freq.values())

# Count how many tasks have max frequency
max_count = sum(1 for f in freq.values() if f == max_freq)

# Calculate minimum time
# (max_freq - 1) periods of length (n + 1) + max_count tasks at end
min_time = (max_freq - 1) * (n + 1) + max_count

# But answer can't be less than total tasks
return max(min_time, len(tasks))
```

**Example**: `tasks = ["A","A","A","B","B"], n = 2`
- max_freq = 3 (A appears 3 times)
- max_count = 1 (only A has max frequency)
- Formula: (3-1) × (2+1) + 1 = 2 × 3 + 1 = 7
</details>

<details>
<summary>Hint 2: Understanding the Math Formula</summary>

Why does the formula work?

**Visual representation for Example 1**:
```
tasks = ["A","A","A","B","B","B"], n = 2

Pattern:
A -> ? -> ? -> A -> ? -> ? -> A
Fill with B:
A -> B -> ? -> A -> B -> ? -> A -> B

Total: 8 slots (7 from formula, +1 for last B)
```

The formula creates "frames":
- Frame = one occurrence of most frequent task + n slots
- Number of frames = max_freq - 1
- Last frame just has the final occurrences of max freq tasks

```python
# Frame structure
# [A _ _] [A _ _] [A]
#  ↑ frame 1 ↑ frame 2 ↑ final tasks

# If we have other tasks, they fill the gaps
# If not enough tasks, we need idle time
```
</details>

<details>
<summary>Hint 3: Complete Mathematical Solution</summary>

```python
from collections import Counter

def leastInterval(tasks, n):
    # Count frequency of each task
    freq = Counter(tasks)

    # Find maximum frequency
    max_freq = max(freq.values())

    # Count tasks with maximum frequency
    max_count = sum(1 for count in freq.values() if count == max_freq)

    # Calculate minimum intervals using formula:
    # (max_freq - 1) complete cycles of (n + 1) slots
    # + max_count tasks in the final cycle
    min_intervals = (max_freq - 1) * (n + 1) + max_count

    # The answer is at least the total number of tasks
    # (when tasks are diverse enough to avoid all idle time)
    return max(min_intervals, len(tasks))
```

**Why `max(min_intervals, len(tasks))`?**
When we have many different task types, we might not need any idle time. For example:
- `tasks = ["A","B","C","D","E","F"], n = 2`
- We can schedule: A → B → C → D → E → F (no idle needed)
- Formula gives: (1-1) × (2+1) + 6 = 6
- Total tasks: 6
- Answer: max(0, 6) = 6
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy with Heap | O(n log k) | O(k) | k = unique tasks, simulate scheduling |
| Mathematical Formula | O(n) | O(k) | Count frequencies, apply formula |
| Optimal Solution | O(n) | O(1) | Only 26 possible task types |

**Detailed Analysis:**
- **Time**: O(n) where n = number of tasks
  - Count frequencies: O(n)
  - Find max frequency: O(26) = O(1)
- **Space**: O(1) - At most 26 unique task types (A-Z)
- **Key Insight**: Mathematical formula avoids simulation entirely

## Common Mistakes

### Mistake 1: Simulating the entire schedule
```python
# Wrong: O(n × k) simulation with priority queue
import heapq
heap = []  # Max heap
# Simulate each time unit...
# Too complex and slow

# Correct: Use mathematical formula
min_time = (max_freq - 1) * (n + 1) + max_count
return max(min_time, len(tasks))
```

### Mistake 2: Not handling multiple tasks with max frequency
```python
# Wrong: Only considering one max frequency task
min_time = (max_freq - 1) * (n + 1) + 1

# Correct: Count all tasks with max frequency
max_count = sum(1 for f in freq.values() if f == max_freq)
min_time = (max_freq - 1) * (n + 1) + max_count
```

### Mistake 3: Forgetting the lower bound of total tasks
```python
# Wrong: Can return less than total number of tasks
return (max_freq - 1) * (n + 1) + max_count

# Correct: Answer is at least len(tasks)
return max((max_freq - 1) * (n + 1) + max_count, len(tasks))
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Task Scheduler II | Different cooldown for each task type | Medium |
| Minimum Idle Time | Find minimum idle time instead of total time | Easy |
| K Parallel CPUs | Multiple CPUs can run tasks in parallel | Hard |
| Task Dependencies | Some tasks must complete before others | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] **Initial Attempt** - Solve independently (30 min limit)
- [ ] **Solution Study** - If stuck, study one approach deeply
- [ ] **Implementation** - Code solution from scratch without reference
- [ ] **Optimization** - Achieve O(n) mathematical solution
- [ ] **Edge Cases** - Test: n=0, all same tasks, all different tasks, multiple max freq
- [ ] **Variations** - Solve at least 2 related problems
- [ ] **Spaced Repetition** - Re-solve after: 1 day, 1 week, 1 month

**Mastery Goal**: Solve in < 20 minutes with mathematical formula approach.

**Strategy**: See [Greedy Patterns](../strategies/patterns/greedy.md) and [Frequency Counting](../strategies/patterns/frequency-analysis.md)
