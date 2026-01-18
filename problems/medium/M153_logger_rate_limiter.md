---
id: M153
old_id: I158
slug: logger-rate-limiter
title: Logger Rate Limiter
difficulty: medium
category: medium
topics: ["design", "hash-table"]
patterns: []
estimated_time_minutes: 30
frequency: high
related_problems: ["M148", "M155", "E001"]
prerequisites: ["hash-map", "timestamp-handling", "design"]
---
# Logger Rate Limiter

## Problem

Imagine you're building a logging system for a large-scale application, and you're getting flooded with duplicate error messages. Your task is to create a rate limiter that prevents the same message from being logged too frequently. Specifically, you need to design a `Logger` class that implements a 10-second cooldown: once a particular message is logged at time `t`, that exact same message cannot be logged again until at least time `t + 10`. Different messages are independent - if you log "error: database timeout" at timestamp 5 and "warning: cache miss" at timestamp 6, each has its own 10-second window. The system receives messages in chronological order (timestamps never decrease), and multiple different messages may arrive at the same timestamp. You need to implement two methods: a constructor `Logger()` that initializes your data structure, and `shouldPrintMessage(timestamp, message)` that returns `true` if the message should be logged (either it's the first time seeing it, or enough time has passed) and `false` otherwise. The key challenge is handling this efficiently - you can't just store every message and every timestamp forever, as memory would grow unbounded. Edge cases to consider include the very first occurrence of any message (should always return `true`), messages that arrive exactly 10 seconds apart (should allow the second one), and managing memory as messages accumulate over time.

## Why This Matters

Rate limiting is a critical feature in production systems, and this problem models exactly how application monitoring tools like Datadog, Splunk, and CloudWatch prevent log spam from overwhelming storage and making it impossible to find real issues. When a database connection fails, you don't want to log the same error message 10,000 times per second - you want to see it once, wait a bit, then check if it's still happening. This technique also powers API rate limiters that prevent abuse (like GitHub's API limits or Twitter's tweet rate restrictions), DDoS protection systems that throttle requests from the same IP address, and anti-spam filters in email systems. The pattern you learn here - maintaining a sliding time window for events - appears in fraud detection (flagging suspicious transaction patterns), real-time analytics (counting unique visitors per minute), and distributed systems monitoring where you track service health metrics without storing every single data point.

## Constraints

- 0 <= timestamp <= 10⁹
- Every timestamp will be passed in non-decreasing order (chronological order).
- 1 <= message.length <= 30
- At most 10⁴ calls will be made to shouldPrintMessage.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Track Last Print Time</summary>
For each unique message, you need to remember when it was last printed. What data structure efficiently stores key-value pairs where the key is the message and the value is the timestamp? When a message arrives, check if enough time has elapsed since the last print.
</details>

<details>
<summary>🎯 Hint 2: The 10-Second Rule</summary>
When a message arrives at time `t`:
- If message not seen before: print it, store timestamp t
- If message seen before at time `last_t`:
  - If `t - last_t >= 10`: print it, update timestamp to t
  - Otherwise: don't print

The key insight is that you only need to store one timestamp per message (the last time it was printed).
</details>

<details>
<summary>📝 Hint 3: Hash Map Implementation</summary>
Algorithm:
1. Use a hash map: message → last_print_timestamp
2. For each shouldPrintMessage(timestamp, message):
   - If message not in map OR timestamp - map[message] >= 10:
     - Update map[message] = timestamp
     - Return true
   - Else:
     - Return false

Time: O(1) per call, Space: O(M) where M is number of unique messages
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Store All Timestamps | O(1) per call | O(N) | Store every timestamp for every message |
| **Hash Map (Last Timestamp)** | **O(1) per call** | **O(M)** | M = unique messages, only store last timestamp |
| Clean Old Entries | O(1) amortized | O(M) | Periodically remove old entries to save space |

## Common Mistakes

**Mistake 1: Storing All Timestamps**
```python
# Wrong: Stores all timestamps for each message (wastes space)
class Logger:
    def __init__(self):
        self.messages = {}  # message -> list of timestamps

    def shouldPrintMessage(self, timestamp, message):
        if message not in self.messages:
            self.messages[message] = [timestamp]
            return True

        # Check if any timestamp in last 10 seconds
        for ts in self.messages[message]:
            if timestamp - ts < 10:
                return False

        self.messages[message].append(timestamp)
        return True
```

**Correct Approach:**
```python
# Correct: Only store last print timestamp
class Logger:
    def __init__(self):
        self.message_timestamps = {}

    def shouldPrintMessage(self, timestamp, message):
        if message not in self.message_timestamps:
            self.message_timestamps[message] = timestamp
            return True

        if timestamp - self.message_timestamps[message] >= 10:
            self.message_timestamps[message] = timestamp
            return True

        return False
```

**Mistake 2: Off-by-One Error in Time Window**
```python
# Wrong: Uses > instead of >=
def shouldPrintMessage(self, timestamp, message):
    if message in self.message_timestamps:
        if timestamp - self.message_timestamps[message] > 10:  # Wrong!
            self.message_timestamps[message] = timestamp
            return True
        return False
    # ...

# Correct: Use >= for 10-second window
def shouldPrintMessage(self, timestamp, message):
    if message in self.message_timestamps:
        if timestamp - self.message_timestamps[message] >= 10:  # Correct
            self.message_timestamps[message] = timestamp
            return True
        return False
    # ...
```

**Mistake 3: Not Updating Timestamp When Printing**
```python
# Wrong: Forgets to update timestamp
def shouldPrintMessage(self, timestamp, message):
    if message not in self.message_timestamps:
        self.message_timestamps[message] = timestamp
        return True

    if timestamp - self.message_timestamps[message] >= 10:
        # Forgot to update!
        return True

    return False

# Correct: Always update when printing
def shouldPrintMessage(self, timestamp, message):
    if message not in self.message_timestamps:
        self.message_timestamps[message] = timestamp
        return True

    if timestamp - self.message_timestamps[message] >= 10:
        self.message_timestamps[message] = timestamp  # Update!
        return True

    return False
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Variable Time Window | Different rate limits per message type | Store window duration with each message |
| Memory Optimization | Clean up old entries periodically | Use queue to track order, remove old messages |
| Out-of-Order Timestamps | Timestamps not guaranteed chronological | Need to handle past timestamps differently |
| Multiple Rate Limits | Check multiple time windows (1s, 10s, 60s) | Store multiple timestamps or use sliding window log |
| Token Bucket | Allow burst with token refill | Track tokens and last refill time |

## Practice Checklist

- [ ] Day 1: Implement basic hash map solution
- [ ] Day 2: Add memory optimization to clean old entries
- [ ] Day 7: Implement variable time window variation
- [ ] Day 14: Solve token bucket rate limiter
- [ ] Day 30: Solve without looking at hints

**Strategy**: See [Design Patterns](../strategies/fundamentals/design-patterns.md)
