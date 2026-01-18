---
id: M494
old_id: A368
slug: online-stock-span
title: Online Stock Span
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Online Stock Span

## Problem

Design a system that processes stock prices as they arrive in real-time and calculates the "price span" for each trading day.

The price span for a given day is defined as the maximum number of consecutive trading days (counting backward from today, including today) during which the stock price was less than or equal to today's price.

Let's look at a concrete example. Suppose the stock prices over the past few days were:
- Day 1: price = 100 (span = 1, because no previous days)
- Day 2: price = 80 (span = 1, because 80 < 100)
- Day 3: price = 60 (span = 1, because 60 < 80)
- Day 4: price = 70 (span = 2, because day 3's 60 and day 4's 70 are both <= 70)
- Day 5: price = 60 (span = 1, because 60 < 70)
- Day 6: price = 75 (span = 4, because days 3,4,5,6 all have prices <= 75)
- Day 7: price = 85 (span = 6, because days 2,3,4,5,6,7 all have prices <= 85)

Notice how on day 7, when the price hits 85, we can look back and count 6 consecutive days where prices didn't exceed 85. This span helps traders identify bullish trends and price momentum.

Implement the `StockSpanner` class:

- `StockSpanner()`: Initialize the price tracking system
- `int next(int price)`: Process a new day's stock price and return its span value

## Why This Matters

Financial trading platforms use stock span calculations in real-time to generate technical analysis indicators. When a trader sees that today's span is unusually large (say, 20 days), it signals strong bullish momentum, the stock has been steadily rising or holding for 20 consecutive days. This information drives automated trading algorithms that detect breakout patterns and momentum shifts.

Real-time monitoring dashboards in many industries use similar "span" calculations. For example, website reliability engineers track server response times and calculate "how many consecutive minutes has latency been under 100ms?" This span helps identify performance trends and triggers alerts when spans suddenly drop (indicating degrading service). The pattern of efficiently computing spans over streaming data is fundamental to time-series analysis in DevOps, finance, and IoT applications.

## Constraints

- 1 <= price <= 10⁵
- At most 10⁴ calls will be made to next.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For each new price, you need to count consecutive previous days where price was at most the current price. This is similar to finding the "next greater element" problem - you're looking backward for the first day with a price greater than today. A monotonic stack can help track potential boundaries efficiently.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a monotonic decreasing stack that stores (price, span) pairs. When a new price arrives, pop all elements from the stack with price less than or equal to the current price, accumulating their spans. The current span is 1 plus the sum of all popped spans. Push (current price, current span) onto the stack.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Each price is pushed and popped from the stack at most once, giving amortized O(1) time per next() call. The stack maintains a decreasing sequence of prices, representing boundaries where the price jumped to a higher level.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n) per next | O(n) | Scan backward for each price |
| Optimal (Stack) | O(1) amortized | O(n) | Each element pushed/popped once |

Where n = total number of prices processed so far

## Common Mistakes

1. **Scanning backward on every call**
   ```python
   # Wrong: O(n) time per next() call
   def __init__(self):
       self.prices = []

   def next(self, price):
       self.prices.append(price)
       span = 1
       i = len(self.prices) - 2
       while i >= 0 and self.prices[i] <= price:
           span += 1
           i -= 1
       return span

   # Correct: Use stack for O(1) amortized
   def __init__(self):
       self.stack = []  # (price, span)

   def next(self, price):
       span = 1
       while self.stack and self.stack[-1][0] <= price:
           span += self.stack.pop()[1]
       self.stack.append((price, span))
       return span
   ```

2. **Not accumulating spans correctly**
   ```python
   # Wrong: Only counting popped elements
   def next(self, price):
       span = 1
       while self.stack and self.stack[-1][0] <= price:
           self.stack.pop()
           span += 1  # Should add the popped span, not just 1

   # Correct: Add the span of popped elements
   def next(self, price):
       span = 1
       while self.stack and self.stack[-1][0] <= price:
           span += self.stack.pop()[1]  # Accumulate spans
   ```

3. **Using the wrong comparison operator**
   ```python
   # Wrong: Using < instead of <=
   while self.stack and self.stack[-1][0] < price:
       # This won't count days with equal price

   # Correct: Use <= to include equal prices
   while self.stack and self.stack[-1][0] <= price:
       span += self.stack.pop()[1]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Next Greater Element | Medium | Find next larger element, not count |
| Daily Temperatures | Medium | Days until warmer temperature |
| Largest Rectangle in Histogram | Hard | Use stack for area calculation |
| Trapping Rain Water | Hard | Calculate trapped water with boundaries |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Monotonic Stack](../../strategies/patterns/monotonic-stack.md)
