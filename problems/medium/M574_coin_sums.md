---
id: M574
slug: coin-sums
title: Coin Sums
difficulty: medium
category: medium
topics: ["dynamic-programming", "combinatorics"]
patterns: ["dynamic-programming", "unbounded-knapsack"]
estimated_time_minutes: 25
frequency: high
related_problems: ["M322", "M518", "E070"]
prerequisites: ["dynamic-programming-basics", "recursion"]
---

# Coin Sums

## Problem

Given a set of coin denominations and a target amount, determine how many different ways you can make that amount using any number of coins from the given denominations. You have an unlimited supply of each coin (this is the "unbounded" aspect).

For example, with coins `[1, 2, 5]` and target `5`, there are 4 ways:
1. 5 (one 5-coin)
2. 2 + 2 + 1 (two 2-coins and one 1-coin)
3. 2 + 1 + 1 + 1 (one 2-coin and three 1-coins)
4. 1 + 1 + 1 + 1 + 1 (five 1-coins)

Note that order doesn't matter: `[2, 2, 1]` and `[1, 2, 2]` are the same way.

```
Visualization of the 4 ways to make 5:
[5]           = 5
[2, 2, 1]     = 5
[2, 1, 1, 1]  = 5
[1, 1, 1, 1, 1] = 5
```

## Why This Matters

The coin change counting problem is the canonical example of unbounded knapsack - a pattern that appears throughout computer science and real life. Unlike the 0/1 knapsack where each item is used once, here you can reuse items infinitely. This pattern applies to: making change in vending machines, resource allocation in games, portfolio construction in finance (how many ways to allocate budget), and inventory management (how many ways to fill an order). The problem teaches the crucial distinction between permutations (order matters) and combinations (order doesn't matter), which trips up many candidates. Understanding how to iterate over coins to avoid counting duplicates is a key insight applicable to many counting problems. The DP solution here builds intuition for bottom-up table construction, a skill essential for harder DP problems. This problem frequently appears in interviews because it tests multiple concepts: DP state definition, iteration order, and combinatorial thinking.

## Examples

**Example 1:**
- Input: `amount = 5, coins = [1, 2, 5]`
- Output: `4`
- Explanation: The 4 ways are listed above.

**Example 2:**
- Input: `amount = 3, coins = [2]`
- Output: `0`
- Explanation: Amount 3 cannot be made with only 2-coins.

**Example 3:**
- Input: `amount = 10, coins = [10]`
- Output: `1`
- Explanation: Only one way - use one 10-coin.

**Example 4:**
- Input: `amount = 4, coins = [1, 2, 3]`
- Output: `4`
- Explanation:
  1. [1, 1, 1, 1]
  2. [1, 1, 2]
  3. [2, 2]
  4. [1, 3]

**Example 5:**
- Input: `amount = 0, coins = [1, 2, 5]`
- Output: `1`
- Explanation: One way to make 0 - use no coins (the empty set).

## Constraints

- 0 <= amount <= 5000
- 1 <= coins.length <= 300
- 1 <= coins[i] <= 5000
- All coins are distinct positive integers
- The answer is guaranteed to fit in a 32-bit integer

## Think About

1. What's the base case? How many ways to make amount 0?
2. If you know how many ways to make amount `i`, how does that help with amount `i + coin`?
3. Why does the order of iterating through coins matter?
4. How is this different from counting permutations vs combinations?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Combinations vs Permutations</summary>

**Critical distinction:**

**Permutations** (order matters):
- For amount 3 with coins [1,2]: {1,1,1}, {1,2}, {2,1} → 3 ways
- {1,2} and {2,1} are different

**Combinations** (order doesn't matter):
- For amount 3 with coins [1,2]: {1,1,1}, {1,2} → 2 ways
- {1,2} and {2,1} are the same

**This problem asks for combinations!**

**How to avoid counting permutations as different:**
Process coins in a specific order. Once you've decided how many of coin A to use, you never reconsider it when processing coin B.

```
Process coin 1, then coin 2, then coin 5:
- When adding coin 2, you only add to amounts that may already contain coin 1
- When adding coin 5, you only add to amounts that may already contain coins 1 and 2
- This ensures you never count [1,2] separately from [2,1]
```

</details>

<details>
<summary>🎯 Hint 2: DP state and recurrence</summary>

**State definition:**
`dp[i]` = number of ways to make amount `i`

**Base case:**
`dp[0] = 1` (one way to make 0: use no coins)

**Recurrence:**
For each coin denomination `c` and for each amount `i >= c`:
```
dp[i] += dp[i - c]
```

**Intuition:**
- If we can make amount `(i - c)` in `k` ways
- Then we can make amount `i` in those same `k` ways by adding coin `c`
- We accumulate (`+=`) because there might be multiple coins that contribute to amount `i`

**Example:** amount = 5, coins = [1, 2, 5]
```
Initial: dp = [1, 0, 0, 0, 0, 0]  (only dp[0] = 1)

Process coin 1:
  dp[1] += dp[0] = 1  → dp = [1, 1, 0, 0, 0, 0]
  dp[2] += dp[1] = 1  → dp = [1, 1, 1, 0, 0, 0]
  dp[3] += dp[2] = 1  → dp = [1, 1, 1, 1, 0, 0]
  dp[4] += dp[3] = 1  → dp = [1, 1, 1, 1, 1, 0]
  dp[5] += dp[4] = 1  → dp = [1, 1, 1, 1, 1, 1]
  (Each amount can be made with all 1s)

Process coin 2:
  dp[2] += dp[0] = 1  → dp[2] = 2  (now {1,1} and {2})
  dp[3] += dp[1] = 1  → dp[3] = 2  (now {1,1,1} and {1,2})
  dp[4] += dp[2] = 2  → dp[4] = 3  (now {1,1,1,1}, {1,1,2}, {2,2})
  dp[5] += dp[3] = 2  → dp[5] = 3
  → dp = [1, 1, 2, 2, 3, 3]

Process coin 5:
  dp[5] += dp[0] = 1  → dp[5] = 4
  → dp = [1, 1, 2, 2, 3, 4]

Answer: dp[5] = 4 ✓
```

</details>

<details>
<summary>🚀 Hint 3: Complete implementation</summary>

```python
def coin_change_ways(amount, coins):
    # dp[i] = number of ways to make amount i
    dp = [0] * (amount + 1)
    dp[0] = 1  # Base case: one way to make 0

    # Process each coin type
    for coin in coins:
        # Update all amounts that can include this coin
        for i in range(coin, amount + 1):
            dp[i] += dp[i - coin]

    return dp[amount]
```

**Why outer loop is coins:**
```python
# CORRECT: Outer loop is coins
for coin in coins:
    for i in range(coin, amount + 1):
        dp[i] += dp[i - coin]
# This counts combinations (order doesn't matter)

# WRONG: Outer loop is amounts (would count permutations)
for i in range(1, amount + 1):
    for coin in coins:
        if i >= coin:
            dp[i] += dp[i - coin]
# This would count [1,2] and [2,1] as different!
```

**Iteration order analogy:**
Think of it like building a meal:
- **Combinations**: "First add all salads you want, then all mains you want, then all desserts you want"
  - Salad + Main + Dessert (one ordering)
- **Permutations**: "At each step, add any item"
  - Salad + Main + Dessert, Main + Salad + Dessert, etc. (many orderings)

Our iteration (coins outer loop) enforces the first style - combinations.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute force recursion | O(S^n) | O(n) | S = amount, n = # coins, exponential |
| Top-down DP (memo) | O(amount × n) | O(amount) | Recursive overhead |
| **Bottom-up DP** | **O(amount × n)** | **O(amount)** | Optimal, iterative |
| Space-optimized | O(amount × n) | O(amount) | Same as bottom-up |

Where:
- `amount` = target amount
- `n` = number of coin denominations

**Time complexity breakdown:**
- Outer loop: n iterations (one per coin)
- Inner loop: amount iterations (for each amount from coin to amount)
- Total: O(amount × n)

**Space complexity:**
- DP array: O(amount + 1) ≈ O(amount)
- No additional data structures needed

**Practical performance:**
For amount = 5000, coins = 300:
- Operations: 5000 × 300 = 1,500,000 (very fast)
- Memory: 5000 integers ≈ 20KB

**Why this is optimal:**
- Every amount up to the target must be considered
- Every coin must be considered for each amount
- Cannot do better than O(amount × n)

---

## Common Mistakes

### 1. Wrong iteration order (counting permutations instead of combinations)
```python
# WRONG: This counts permutations!
for i in range(1, amount + 1):
    for coin in coins:
        if i >= coin:
            dp[i] += dp[i - coin]

# Example: amount=3, coins=[1,2]
# This would count {1,2} and {2,1} as different, giving wrong answer

# CORRECT: Coins in outer loop
for coin in coins:
    for i in range(coin, amount + 1):
        dp[i] += dp[i - coin]
```

### 2. Forgetting base case
```python
# WRONG: Initializing all to 0
dp = [0] * (amount + 1)
# Now dp[0] = 0, but should be 1!

# CORRECT:
dp = [0] * (amount + 1)
dp[0] = 1  # One way to make 0: use no coins
```

### 3. Wrong range in inner loop
```python
# WRONG: Starting from 0 or 1
for coin in coins:
    for i in range(amount + 1):  # Should start from coin!
        if i >= coin:
            dp[i] += dp[i - coin]

# CORRECT: Start from coin value
for coin in coins:
    for i in range(coin, amount + 1):
        dp[i] += dp[i - coin]
```

### 4. Confusing "number of ways" with "minimum coins"
```python
# This problem: COUNT ways (addition, +=)
dp[i] += dp[i - coin]

# Different problem: MINIMIZE coins (minimum, min)
dp[i] = min(dp[i], dp[i - coin] + 1)

# Don't mix these up!
```

### 5. Off-by-one in array size
```python
# WRONG: Array too small
dp = [0] * amount  # Missing amount itself!

# CORRECT: Include amount
dp = [0] * (amount + 1)  # Indices 0 to amount
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Minimum coins needed** | Find minimum count, not # ways | `dp[i] = min(dp[i], dp[i-coin] + 1)` |
| **Count permutations** | Order matters | Swap loop order (amounts outer) |
| **Exact number of coins** | Must use exactly k coins | 2D DP: `dp[i][j]` = ways to make i with j coins |
| **Limited coin supply** | Each coin can be used at most m times | Bounded knapsack (process each coin m times or use 3D DP) |
| **Fewest coins possible** | Minimum coins needed | Different problem (coin change minimum) |

**Minimum coins variation (Coin Change II):**
```python
def coin_change_min(amount, coins):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0  # 0 coins needed to make 0

    for coin in coins:
        for i in range(coin, amount + 1):
            dp[i] = min(dp[i], dp[i - coin] + 1)

    return dp[amount] if dp[amount] != float('inf') else -1
```

**Permutations variation (order matters):**
```python
def coin_change_permutations(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1

    # Swap the loops!
    for i in range(1, amount + 1):
        for coin in coins:
            if i >= coin:
                dp[i] += dp[i - coin]

    return dp[amount]

# Example: amount=3, coins=[1,2]
# Permutations: {1,1,1}, {1,2}, {2,1} → 3 ways
# Combinations: {1,1,1}, {1,2} → 2 ways
```

---

## Visual Walkthrough

```
Amount = 5, Coins = [1, 2, 5]

Initial state:
dp = [1, 0, 0, 0, 0, 0]
      ↑
   Amount 0: 1 way (empty set)

═══════════════════════════════════════
Process coin = 1:
───────────────────────────────────────
i=1: dp[1] += dp[0] → dp[1] = 0 + 1 = 1
i=2: dp[2] += dp[1] → dp[2] = 0 + 1 = 1
i=3: dp[3] += dp[2] → dp[3] = 0 + 1 = 1
i=4: dp[4] += dp[3] → dp[4] = 0 + 1 = 1
i=5: dp[5] += dp[4] → dp[5] = 0 + 1 = 1

After coin 1: dp = [1, 1, 1, 1, 1, 1]
Interpretation: Each amount can be made with all 1-coins

═══════════════════════════════════════
Process coin = 2:
───────────────────────────────────────
i=2: dp[2] += dp[0] → dp[2] = 1 + 1 = 2
     (Ways: {1,1}, {2})
i=3: dp[3] += dp[1] → dp[3] = 1 + 1 = 2
     (Ways: {1,1,1}, {1,2})
i=4: dp[4] += dp[2] → dp[4] = 1 + 2 = 3
     (Ways: {1,1,1,1}, {1,1,2}, {2,2})
i=5: dp[5] += dp[3] → dp[5] = 1 + 2 = 3
     (Ways: {1,1,1,1,1}, {1,1,1,2}, {1,2,2})

After coin 2: dp = [1, 1, 2, 2, 3, 3]

═══════════════════════════════════════
Process coin = 5:
───────────────────────────────────────
i=5: dp[5] += dp[0] → dp[5] = 3 + 1 = 4
     (Ways: previous 3 + {5})

After coin 5: dp = [1, 1, 2, 2, 3, 4]
                                    ↑
                                Answer!

Final 4 ways to make 5:
1. {1, 1, 1, 1, 1}
2. {1, 1, 1, 2}
3. {1, 2, 2}
4. {5}
```

---

## Practice Checklist

**Understanding:**
- [ ] Can explain combinations vs permutations
- [ ] Understand why loop order matters
- [ ] Can trace DP table updates by hand
- [ ] Know the base case and why dp[0] = 1

**Implementation:**
- [ ] Correct loop order (coins outer)
- [ ] Proper base case initialization
- [ ] Correct range for inner loop (start at coin value)
- [ ] Uses `+=` not `=` for accumulation

**Edge Cases:**
- [ ] Handles amount = 0 (should return 1)
- [ ] Handles impossible amounts (no valid coins)
- [ ] Handles amount < smallest coin
- [ ] Handles single coin denomination

**Interview Readiness:**
- [ ] Can code solution in 10 minutes
- [ ] Can explain why loop order prevents duplicates
- [ ] Can discuss difference from minimum coins problem
- [ ] Can convert to permutations variant if asked

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve (combinations)
- [ ] Day 3: Solve permutations variant
- [ ] Day 7: Solve minimum coins variant
- [ ] Day 14: Explain loop order to someone else
- [ ] Day 30: Compare all three variants

---

**Strategy Reference:** See [Dynamic Programming](../../strategies/patterns/dynamic-programming.md#unbounded-knapsack) and [Counting Problems](../../strategies/patterns/dynamic-programming.md#counting-dp)
