---
id: M155
old_id: I161
slug: design-hit-counter
title: Design Hit Counter
difficulty: medium
category: medium
topics: ["design", "queue"]
patterns: []
estimated_time_minutes: 30
frequency: high
related_problems: ["M148", "M153", "E001"]
prerequisites: ["queue", "deque", "sliding-window", "design"]
---
# Design Hit Counter

## Problem

Imagine you're building analytics for a website and need to answer the question "how many people clicked this button in the last 5 minutes?" Your task is to design a `HitCounter` data structure that efficiently tracks events (we'll call them "hits") within a sliding 300-second time window. The system receives timestamps in seconds, and you're guaranteed they arrive in chronological order (timestamps never go backwards in time, though multiple events can share the same timestamp). You need to implement three components: a constructor `HitCounter()` that initializes the tracking structure, a method `hit(timestamp)` that records a single event at the given time, and a method `getHits(timestamp)` that returns the total count of hits that occurred in the 5-minute window ending at that timestamp. Here's the key detail about the window: if you call `getHits(300)`, you want to count all hits from timestamp 1 through 300 (the last 300 seconds). Hits at timestamp 0 or earlier would be outside the window. The naive approach of storing every single hit and scanning through all of them on every `getHits` call would be terribly slow - think about a popular website with millions of hits. You need something cleverer that takes advantage of the time-window constraint and the ordered nature of the data. Edge cases include handling the very first hits (when there's no history yet), dealing with bursts of activity at the same timestamp, and efficiently removing old hits that fall outside the current window.

## Why This Matters

This hit counter pattern is the foundation of real-time analytics systems used by virtually every web platform you interact with. Google Analytics uses this exact technique to show "users in the last 30 minutes" on dashboards, Twitter uses it to detect trending topics by counting mentions in sliding time windows, and e-commerce sites like Amazon use it for "X people are viewing this item right now" notifications that create urgency. Beyond analytics, this pattern powers rate limiters that protect APIs from abuse (GitHub limits you to 5000 API requests per hour using this technique), distributed denial-of-service (DDoS) protection systems that block IPs with too many requests in a short window, and fraud detection systems that flag suspicious patterns like 50 login attempts in 2 minutes. The sliding window concept you'll master here is also critical in network monitoring (packet rates per second), financial trading systems (transaction volumes for market surveillance), and IoT sensor data processing where you track recent readings to detect anomalies without storing infinite historical data.

## Constraints

- 1 <= timestamp <= 2 * 10⁹
- All the calls are being made to the system in chronological order (i.e., timestamp is monotonically increasing).
- At most 300 calls will be made to hit and getHits.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Sliding Window Pattern</summary>
This is a classic sliding window problem. You need to track events within a 300-second window. What data structure can efficiently add new events and remove old events that fall outside the window? Think about maintaining events in chronological order.
</details>

<details>
<summary>🎯 Hint 2: Queue or Deque</summary>
Use a queue to store hit timestamps. When getHits(t) is called:
- Remove all timestamps < t - 300 from the front (they're outside the window)
- Return the remaining queue size

Since timestamps are chronological, old events are always at the front of the queue.
</details>

<details>
<summary>📝 Hint 3: Optimized with Buckets</summary>
Two approaches:

**Simple Queue:**
- hit(t): append t to queue, O(1)
- getHits(t): remove old timestamps, return size, O(n) worst case

**Circular Buffer (space-optimized):**
- Use array of 300 buckets, hits[i] = count at second i
- hit(t): increment hits[t % 300], clear if from previous cycle
- getHits(t): sum valid buckets, O(1) amortized

The bucket approach trades space for time efficiency.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Store All Timestamps (Queue) | hit: O(1), getHits: O(n) | O(n) | n = hits in last 300 seconds |
| **Bucket Array** | **hit: O(1), getHits: O(300)** | **O(300)** | Fixed space, amortized O(1) |
| Hash Map (timestamp → count) | hit: O(1), getHits: O(k) | O(k) | k = unique timestamps in window |

## Common Mistakes

**Mistake 1: Not Removing Old Hits**
```python
# Wrong: Stores all hits forever, getHits counts everything
from collections import deque

class HitCounter:
    def __init__(self):
        self.hits = deque()

    def hit(self, timestamp):
        self.hits.append(timestamp)

    def getHits(self, timestamp):
        # Wrong: Returns all hits, not just last 300 seconds
        return len(self.hits)
```

**Correct Approach:**
```python
# Correct: Remove hits outside the window
from collections import deque

class HitCounter:
    def __init__(self):
        self.hits = deque()

    def hit(self, timestamp):
        self.hits.append(timestamp)

    def getHits(self, timestamp):
        # Remove hits older than 300 seconds
        while self.hits and self.hits[0] <= timestamp - 300:
            self.hits.popleft()
        return len(self.hits)
```

**Mistake 2: Off-by-One in Time Window**
```python
# Wrong: Uses < instead of <=
def getHits(self, timestamp):
    while self.hits and self.hits[0] < timestamp - 300:  # Wrong!
        self.hits.popleft()
    return len(self.hits)

# Correct: Window is (timestamp - 300, timestamp] inclusive
def getHits(self, timestamp):
    while self.hits and self.hits[0] <= timestamp - 300:  # Correct!
        self.hits.popleft()
    return len(self.hits)
```

**Mistake 3: Inefficient Bucket Implementation**
```python
# Wrong: Doesn't handle timestamp wrap-around
class HitCounter:
    def __init__(self):
        self.buckets = [0] * 300

    def hit(self, timestamp):
        idx = timestamp % 300
        self.buckets[idx] += 1  # Wrong: doesn't clear old data

    def getHits(self, timestamp):
        return sum(self.buckets)  # Wrong: includes old hits
```

**Correct Approach:**
```python
# Correct: Track timestamp for each bucket
class HitCounter:
    def __init__(self):
        self.times = [0] * 300
        self.hits = [0] * 300

    def hit(self, timestamp):
        idx = timestamp % 300
        if self.times[idx] != timestamp:
            self.times[idx] = timestamp
            self.hits[idx] = 1
        else:
            self.hits[idx] += 1

    def getHits(self, timestamp):
        total = 0
        for i in range(300):
            if timestamp - self.times[i] < 300:
                total += self.hits[i]
        return total
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Variable Time Window | Different window sizes for different queries | Pass window size to getHits |
| Multi-granularity Counter | Track hits per second, minute, hour | Multiple bucket arrays with different sizes |
| Distributed Hit Counter | Handle hits across multiple servers | Use distributed queue or aggregation |
| Top K IPs | Track which IPs have most hits | Combine with hash map and heap |
| Rate Limiting | Block if too many hits in window | Return boolean from hit() |

## Practice Checklist

- [ ] Day 1: Implement using queue/deque
- [ ] Day 2: Implement using circular buffer (bucket array)
- [ ] Day 7: Implement rate limiting variation
- [ ] Day 14: Solve multi-granularity counter
- [ ] Day 30: Solve without looking at hints

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
