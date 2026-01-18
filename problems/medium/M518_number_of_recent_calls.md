---
id: M518
old_id: A400
slug: number-of-recent-calls
title: Number of Recent Calls
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Number of Recent Calls

## Problem

Imagine you're building a rate-limiting system for an API service. Your system needs to track incoming requests and quickly answer: "How many requests have we received in the last 3 seconds?" This helps enforce usage quotas and detect potential abuse.

Design and implement a `RecentCounter` class that efficiently tracks requests within a sliding time window of 3000 milliseconds (3 seconds).

Your `RecentCounter` class must support:

1. `RecentCounter()` - Constructor that initializes an empty request counter
2. `int ping(int t)` - Records a new request at timestamp `t` (in milliseconds) and returns the count of all requests that occurred in the time range `[t - 3000, t]` (inclusive)

The system guarantees that `ping()` will always be called with strictly increasing timestamps—meaning time never goes backward.

Example workflow:
```
RecentCounter counter = new RecentCounter()
counter.ping(1)     → returns 1  (requests in [1-3000, 1] = just this one)
counter.ping(100)   → returns 2  (requests in [100-3000, 100] = both)
counter.ping(3001)  → returns 3  (requests in [1, 3001] = all three)
counter.ping(3002)  → returns 3  (requests in [2, 3002] = only last 3, first one too old)
```

## Why This Matters

Rate limiting is critical for production systems to prevent abuse, ensure fair resource allocation, and protect against denial-of-service attacks. Web services like Twitter, Stripe, and GitHub use sliding window counters to enforce API rate limits ("100 requests per minute"). Cloud platforms use similar techniques for billing and quota management. E-commerce sites track user actions to detect bot activity. The sliding window pattern appears in network traffic analysis, real-time monitoring dashboards, and streaming data processing. Understanding how to efficiently maintain a moving time window teaches you to manage memory in bounded space even with unbounded input streams—essential for building scalable, production-grade systems that process millions of events per second without memory leaks.

## Constraints

- 1 <= t <= 10⁹
- Each test case will call ping with **strictly increasing** values of t.
- At most 10⁴ calls will be made to ping.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The sliding window only cares about requests within the last 3000ms. Older requests can be discarded since they'll never be counted again. This suggests a FIFO (First In, First Out) data structure.
</details>

<details>
<summary>Main Approach</summary>
Use a queue to store timestamps. For each new ping:
1. Add the current timestamp to the queue
2. Remove all timestamps older than t - 3000 from the front
3. Return the queue size

The queue automatically maintains only relevant timestamps.
</details>

<details>
<summary>Optimization Tip</summary>
Since timestamps are strictly increasing, older timestamps will always be at the front of the queue. Use a deque for O(1) operations on both ends, removing from front while adding to back.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n) per ping | O(n) | Store all timestamps, scan entire list each time |
| Optimal (Queue) | O(1) amortized | O(3000) = O(1) | At most 3000 elements in queue at any time |

## Common Mistakes

1. **Storing all timestamps without cleanup**
   ```python
   # Wrong: Memory grows unbounded
   def __init__(self):
       self.requests = []

   def ping(self, t):
       self.requests.append(t)
       return sum(1 for req in self.requests if req >= t - 3000)

   # Correct: Remove old timestamps
   def __init__(self):
       self.queue = deque()

   def ping(self, t):
       self.queue.append(t)
       while self.queue and self.queue[0] < t - 3000:
           self.queue.popleft()
       return len(self.queue)
   ```

2. **Using wrong boundary condition**
   ```python
   # Wrong: Exclusive boundary (should be inclusive)
   while self.queue[0] <= t - 3000:
       self.queue.popleft()

   # Correct: Inclusive boundary [t-3000, t]
   while self.queue[0] < t - 3000:
       self.queue.popleft()
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Moving Average from Data Stream | Easy | Similar sliding window but compute average instead of count |
| Time-Based Key-Value Store | Medium | Multiple keys with time-based retrieval |
| Design Hit Counter | Medium | Similar concept but with different time window semantics |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Queue Pattern](../../strategies/data-structures/queues.md)
