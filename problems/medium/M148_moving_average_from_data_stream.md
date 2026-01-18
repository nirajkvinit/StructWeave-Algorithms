---
id: M148
old_id: I145
slug: moving-average-from-data-stream
title: Moving Average from Data Stream
difficulty: medium
category: medium
topics: ["sliding-window"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/sliding-window.md
frequency: high
related_problems: ["M153", "M155", "E001"]
prerequisites: ["queue", "circular-buffer", "amortized-analysis"]
---
# Moving Average from Data Stream

## Problem

Design a data structure that computes the moving average from a continuous stream of integers using a fixed-size sliding window. Imagine you're building a stock price monitoring system that shows the average price over the last 30 transactions, updating in real-time as new trades arrive. The window "slides" forward with each new data point, maintaining a constant size by dropping the oldest value when a new one arrives.

Your `MovingAverage` class should support the following operations: `MovingAverage(int size)` creates a new instance configured to maintain a window of the specified `size`, and `double next(int val)` adds a new value to the stream and returns the average of the most recent `size` values (or fewer if less than `size` values have been received yet). For example, if size is 3 and you call `next(1)`, `next(10)`, `next(3)`, `next(5)`, the fourth call returns `(10 + 3 + 5) / 3 = 6.0` because the window has slid past the initial 1.

The challenge is maintaining efficiency: a naive approach that recalculates the sum from scratch for each new value would take O(size) time per operation, making it slow for large windows or high-frequency data streams. Instead, you can maintain a running sum and update it in constant time by subtracting values that leave the window and adding new values that enter. Edge cases include handling the initial phase when fewer than `size` values have been seen (average should be over the actual count, not the window size) and managing potential overflow if values are large and the window is big.

## Why This Matters

Moving averages are fundamental to time-series analysis across industries. Stock trading platforms use them to smooth price volatility and generate buy/sell signals when short-term and long-term moving averages cross. Server monitoring systems track moving averages of CPU usage, request latency, or error rates to detect anomalies without overreacting to brief spikes. IoT sensor networks in manufacturing compute moving averages of temperature, pressure, or vibration readings to filter noise from real trends. Mobile apps use moving averages of GPS coordinates to smooth location tracking despite jittery signals. The sliding window pattern with running sum optimization appears in many algorithms: calculating substring metrics, processing network packet streams, and analyzing real-time logs. Mastering this technique prepares you for stream processing frameworks like Apache Flink or Amazon Kinesis, where efficient windowed aggregations are crucial for low-latency data pipelines.

## Constraints

- 1 <= size <= 1000
- -10⁵ <= val <= 10⁵
- At most 10⁴ calls will be made to next.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding the Window</summary>
A moving average only needs the most recent `size` values. Think about how you can maintain just these values without storing the entire stream. What happens when you add a new value and already have `size` values stored?
</details>

<details>
<summary>🎯 Hint 2: Avoiding Recomputation</summary>
The naive approach recalculates the sum from scratch each time. Instead, consider maintaining a running sum. When a new value enters the window and an old value leaves, how can you update the sum in constant time?
</details>

<details>
<summary>📝 Hint 3: Data Structure Choice</summary>
Use a queue (or circular buffer) to store the window values and a variable to track the running sum. Algorithm:
1. Add new value to queue and sum
2. If queue size exceeds window size, remove oldest value from both queue and sum
3. Return sum divided by current queue size
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recalculate Each Time | O(size) per call | O(size) | Sum all values on each `next()` call |
| **Optimal (Queue + Running Sum)** | **O(1) per call** | **O(size)** | Maintain running sum, update in constant time |

## Common Mistakes

**Mistake 1: Storing Entire Stream**
```python
# Wrong: Stores all values indefinitely
class MovingAverage:
    def __init__(self, size):
        self.size = size
        self.values = []

    def next(self, val):
        self.values.append(val)
        # Only need last 'size' values, wastes space
        return sum(self.values[-self.size:]) / min(len(self.values), self.size)
```

**Correct Approach:**
```python
# Correct: Only store window values
from collections import deque

class MovingAverage:
    def __init__(self, size):
        self.size = size
        self.window = deque()
        self.window_sum = 0

    def next(self, val):
        self.window.append(val)
        self.window_sum += val

        if len(self.window) > self.size:
            self.window_sum -= self.window.popleft()

        return self.window_sum / len(self.window)
```

**Mistake 2: Recomputing Sum Each Time**
```python
# Wrong: O(size) time per operation
class MovingAverage:
    def __init__(self, size):
        self.size = size
        self.window = []

    def next(self, val):
        self.window.append(val)
        if len(self.window) > self.size:
            self.window.pop(0)  # Also O(n)!
        return sum(self.window) / len(self.window)  # Recalculates
```

**Correct Approach:**
```python
# Correct: Maintain running sum for O(1) updates
class MovingAverage:
    def __init__(self, size):
        self.size = size
        self.window = deque()
        self.window_sum = 0

    def next(self, val):
        self.window.append(val)
        self.window_sum += val

        if len(self.window) > self.size:
            self.window_sum -= self.window.popleft()

        return self.window_sum / len(self.window)
```

**Mistake 3: Integer Division**
```python
# Wrong: Returns integer instead of float
def next(self, val):
    # ... update logic ...
    return self.window_sum // len(self.window)  # Integer division!

# Correct: Use float division
def next(self, val):
    # ... update logic ...
    return self.window_sum / len(self.window)
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Weighted Moving Average | Recent values have higher weight | Multiply each value by weight factor |
| Exponential Moving Average | Weight decays exponentially | EMA = α × new_value + (1-α) × previous_EMA |
| Moving Median | Find median instead of average | Use two heaps or sorted container |
| Moving Max/Min | Track maximum/minimum | Use deque with monotonic property |
| Variable Window Size | Window size changes dynamically | Allow resize operation |

## Practice Checklist

- [ ] Day 1: Implement with queue and running sum
- [ ] Day 2: Implement using circular buffer (array + index)
- [ ] Day 7: Implement weighted moving average variation
- [ ] Day 14: Solve without looking at hints
- [ ] Day 30: Implement exponential moving average

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
