---
id: M296
old_id: A103
slug: exclusive-time-of-functions
title: Exclusive Time of Functions
difficulty: medium
category: medium
topics: ["stack", "array"]
patterns: ["stack-simulation"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E020", "M071", "M227"]
prerequisites: ["stack", "array-manipulation", "time-interval-calculation"]
strategy_ref: ../strategies/data-structures/stack.md
---
# Exclusive Time of Functions

## Problem

Imagine profiling a program to measure how much CPU time each function actually uses - not including time spent in functions it calls. This is called "exclusive time" or "self time" in performance profilers.

You have `n` functions (numbered 0 to n-1) running on a single-threaded CPU. You're given execution logs showing when each function starts and ends. Your task is to calculate the total exclusive execution time for each function.

The logs are formatted as `"{function_id}:{"start" | "end"}:{timestamp}"`:
- `"0:start:3"` means function 0 starts executing at the beginning of time unit 3
- `"1:end:5"` means function 1 finishes executing at the end of time unit 5

Functions follow a call stack model (like all programming languages):
- When function A calls function B, A pauses while B runs
- When B finishes, A resumes
- Functions can call themselves recursively

Important timing details:
- "start" events occur at the beginning of a timestamp (before the time unit)
- "end" events occur at the end of a timestamp (after the time unit completes)
- If a function starts at time 3 and ends at time 5, it runs during time units 3, 4, and 5 - that's 3 units of time (inclusive counting)

Example: Given logs `["0:start:0", "0:start:2", "0:end:5", "0:start:6", "0:end:6", "0:end:7"]` for one function:
- Function 0 runs from 0-1 (2 units)
- Then it calls itself recursively, running from 2-5 (4 units)
- Parent resumes and calls itself again, running from 6-6 (1 unit)
- Parent finishes running from 7-7 (1 unit)
- Total: 2 + 4 + 1 + 1 = 8 units

Return an array where `result[i]` is the total exclusive time for function `i`.

## Why This Matters

This problem models exactly how performance profilers like Chrome DevTools, Python's cProfile, or Java's VisualVM work. When you profile code to find bottlenecks, you need to distinguish between a function's total time (inclusive of functions it calls) versus its self time (exclusive, just the function's own work). Understanding stack-based execution timing is fundamental to debugging performance issues, analyzing call graphs, and optimizing real applications. The problem teaches you to simulate call stacks, handle time interval arithmetic carefully (especially the start/end boundary conditions), and track state as events occur sequentially - skills that apply to any event-driven system simulation.

## Examples

**Example 1:**
- Input: `n = 1, logs = ["0:start:0","0:start:2","0:end:5","0:start:6","0:end:6","0:end:7"]`
- Output: `[8]`
- Explanation: Function 0 begins at time 0 and runs for 2 units before calling itself. The recursive invocation runs from time 2 through time 5 (4 units). Control returns to the original call, which immediately invokes itself again from time 6 through time 6 (1 unit). Finally, the original call resumes at time 7 and runs for 1 more unit. Total: 2 + 4 + 1 + 1 = 8 units.

**Example 2:**
- Input: `n = 2, logs = ["0:start:0","0:start:2","0:end:5","1:start:6","1:end:6","0:end:7"]`
- Output: `[7,1]`
- Explanation: Function 0 begins at time 0, runs for 2 units, then recursively calls itself. The recursive call executes from time 2 to time 5 (4 units). After returning, function 0 invokes function 1, which executes from time 6 to time 6 (1 unit). Function 0 then continues for 1 more unit. Totals: function 0 has 2 + 4 + 1 = 7 units, function 1 has 1 unit.

## Constraints

- 1 <= n <= 100
- 1 <= logs.length <= 500
- 0 <= function_id < n
- 0 <= timestamp <= 10⁹
- No two start events will happen at the same timestamp.
- No two end events will happen at the same timestamp.
- Each function has an "end" log for each "start" log.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Stack-Based Simulation</summary>

Use a stack to track the currently executing function calls. When you encounter a "start" log, if there's a function already on the stack, pause it by adding the elapsed time since its last start to its total. Push the new function onto the stack. When you encounter an "end" log, pop the function from the stack, calculate its execution time, and if there's a previous function underneath, resume it.

</details>

<details>
<summary>Hint 2: Time Interval Calculation</summary>

The key is correctly calculating time intervals. A "start" event occurs at the beginning of a timestamp, while an "end" event occurs at the end. When function X starts at time t1 and ends at time t2, it runs for (t2 - t1 + 1) units. When function X is interrupted by function Y starting at time t, the time accumulated for X is (t - prev_time) where prev_time is when X last started or resumed.

</details>

<details>
<summary>Hint 3: Tracking Previous Timestamp</summary>

Maintain a variable tracking the previous timestamp processed. When processing a "start" event, if the stack isn't empty, add (current_time - prev_time) to the function at the top of the stack. When processing an "end" event, add (current_time - prev_time + 1) to the function being popped. Update prev_time after each operation to be either current_time (for start) or current_time + 1 (for end).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Stack Simulation | O(m) | O(n) | m is number of logs, n is number of functions |
| Recursive Parsing | O(m²) | O(n + m) | Inefficient; requires matching start/end pairs |
| Interval Tree | O(m log m) | O(m) | Overkill for this problem |

## Common Mistakes

1. **Incorrect time interval calculation**
```python
# Wrong: doesn't add 1 for end events
def exclusiveTime(n, logs):
    # ...
    if action == "end":
        duration = timestamp - prev_time  # Missing +1
        result[func_id] += duration

# Correct: end events include the current timestamp
def exclusiveTime(n, logs):
    # ...
    if action == "end":
        duration = timestamp - prev_time + 1  # Include current unit
        result[func_id] += duration
```

2. **Not pausing interrupted functions**
```python
# Wrong: doesn't account for paused function time
def exclusiveTime(n, logs):
    for log in logs:
        func_id, action, timestamp = parse(log)
        if action == "start":
            stack.append((func_id, timestamp))
            # Missing: add time to previous function on stack

# Correct: pause current function when new one starts
def exclusiveTime(n, logs):
    for log in logs:
        func_id, action, timestamp = parse(log)
        if action == "start":
            if stack:
                result[stack[-1]] += timestamp - prev_time
            stack.append(func_id)
            prev_time = timestamp
```

3. **Wrong prev_time update after end event**
```python
# Wrong: sets prev_time to timestamp instead of timestamp + 1
def exclusiveTime(n, logs):
    # ...
    if action == "end":
        result[func_id] += timestamp - prev_time + 1
        stack.pop()
        prev_time = timestamp  # Wrong! Should be timestamp + 1

# Correct: next timestamp starts after current one ends
def exclusiveTime(n, logs):
    # ...
    if action == "end":
        result[func_id] += timestamp - prev_time + 1
        stack.pop()
        prev_time = timestamp + 1  # Resume at next unit
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Inclusive Time Calculation | Calculate total time including called functions (not just exclusive) | Medium |
| Multi-threaded Execution | Track execution time across multiple threads | Hard |
| Function Call Graph | Build complete call graph with execution times | Hard |
| Memory Profiling | Track memory usage in addition to time | Hard |

## Practice Checklist

- [ ] Implement stack-based simulation
- [ ] Parse log entries correctly (function_id, action, timestamp)
- [ ] Calculate time intervals for start events (pause previous)
- [ ] Calculate time intervals for end events (+1 inclusive)
- [ ] Update prev_time correctly (timestamp for start, timestamp+1 for end)
- [ ] Test with Example 1: recursive calls
- [ ] Test with Example 2: different functions
- [ ] Test edge case: single function, single call
- [ ] **Review in 24 hours**: Re-implement from memory
- [ ] **Review in 1 week**: Solve without hints
- [ ] **Review in 2 weeks**: Implement inclusive time variation

**Strategy**: See [Stack Pattern](../strategies/data-structures/stack.md)
