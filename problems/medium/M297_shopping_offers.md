---
id: M297
old_id: A105
slug: shopping-offers
title: Shopping Offers
difficulty: medium
category: medium
topics: ["array", "dynamic-programming", "backtracking"]
patterns: ["memoization", "state-space-search"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M322", "M377", "H072"]
prerequisites: ["dynamic-programming", "memoization", "backtracking"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Shopping Offers

## Problem

You're shopping at a store that offers bundle deals. Each item has an individual price, but you can also buy special offers that bundle multiple items together at a discount. Your goal is to buy exactly what you need at the minimum cost.

You're given:
- `price`: array where `price[i]` is the cost of buying one unit of item `i` individually
- `needs`: array where `needs[i]` is how many units of item `i` you need to buy
- `special`: array of bundle offers, where each offer is a list of length n+1
  - The first n numbers tell you how many of each item the bundle contains
  - The last number is the bundle's total price

For example, if `special[0] = [3, 0, 5]` and you have 2 items, this bundle contains 3 units of item 0, 0 units of item 1, and costs $5 total.

Important constraints:
- You can use the same special offer multiple times
- You cannot buy more than you need, even if it would be cheaper (leftover items have no value)
- Find the absolute minimum cost to buy exactly the quantities in `needs`

Example: `price = [2,5]`, `special = [[3,0,5], [1,2,10]]`, `needs = [3,2]`
- Bundle 1: 3 units of item 0 for $5 (normally $6)
- Bundle 2: 1 unit of item 0 + 2 units of item 1 for $10 (normally $12)
- Best strategy: buy bundle 2 ($10) + 2 individual units of item 0 ($4) = $14
- This is cheaper than buying all individually ($6 + $10 = $16)

The challenge is efficiently exploring different combinations of bundles without exhaustively trying every possibility.

## Why This Matters

This problem models real shopping scenarios like Amazon's "frequently bought together" bundles, combo meals at restaurants, or bulk discount pricing. More broadly, it represents resource allocation problems with bundle constraints: cloud computing packages (CPU + memory + storage bundles), telecommunications plans (minutes + data + texts), or manufacturing procurement (buying components in bulk deals). The algorithmic challenge combines constraint satisfaction (can't exceed needs) with optimization (minimize cost). You'll learn state-space search with memoization - tracking "how much I still need to buy" as state, and avoiding recomputation when you reach the same state through different bundle combinations. This pattern appears in many optimization problems where you make sequential decisions with overlapping subproblems.

## Examples

**Example 1:**
- Input: `price = [2,5], special = [[3,0,5],[1,2,10]], needs = [3,2]`
- Output: `14`
- Explanation: Two items exist with individual prices of $2 and $5. Bundle 1 offers 3 units of item 0 for $5. Bundle 2 offers 1 unit of item 0 and 2 units of item 1 for $10. To acquire 3 units of item 0 and 2 units of item 1, use bundle 2 ($10) plus 2 individual units of item 0 ($4), totaling $14.

**Example 2:**
- Input: `price = [2,3,4], special = [[1,1,0,4],[2,2,1,9]], needs = [1,2,1]`
- Output: `11`
- Explanation: Individual prices are $2, $3, and $4 for items 0, 1, and 2. Bundle 1 provides 1 unit each of items 0 and 1 for $4. Bundle 2 provides 2 units each of items 0 and 1 plus 1 unit of item 2 for $9. To purchase 1 unit of item 0, 2 units of item 1, and 1 unit of item 2, use bundle 1 ($4), then buy 1 more unit of item 1 ($3) and 1 unit of item 2 ($4), totaling $11. Bundle 2 cannot be used as it would exceed the required quantity of item 0.

## Constraints

- n == price.length == needs.length
- 1 <= n <= 6
- 0 <= price[i], needs[i] <= 10
- 1 <= special.length <= 100
- special[i].length == n + 1
- 0 <= special[i][j] <= 50

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: State-Space Search with Memoization</summary>

Model this as a state-space search where each state is defined by the current needs (remaining items to purchase). For each state, try two options: (1) use each special offer if it doesn't exceed needs, recursively solve for reduced needs, or (2) buy all remaining items individually at full price. The minimum cost across all valid choices is the answer. Use memoization to avoid recomputing the same state.

</details>

<details>
<summary>Hint 2: Validating Special Offers</summary>

Before applying a special offer, verify that it doesn't exceed current needs for any item. For offer `special[i]`, check that `special[i][j] <= needs[j]` for all items j. If valid, subtract the offer quantities from needs to get a new state, add the offer price, and recursively find the minimum cost for the new state. The base case is when all needs are zero (cost = 0).

</details>

<details>
<summary>Hint 3: Memoization Key Design</summary>

Since needs is a list and lists aren't hashable in Python, convert needs to a tuple for use as a dictionary key. The memoization dictionary maps `tuple(needs) -> minimum_cost`. This ensures that if you encounter the same needs configuration again (e.g., [2,1] reached through different offer combinations), you reuse the previously computed result.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DFS + Memoization | O(s * k^n) | O(k^n) | s is special offers, k is max need value, n is items |
| Brute Force DFS | O(s^m) | O(m) | m is total items needed; exponential without memoization |
| Bottom-Up DP | O(k^n * s) | O(k^n) | Build table for all possible need states |

## Common Mistakes

1. **Not checking if offer exceeds needs**
```python
# Wrong: applies offer without validation
def shoppingOffers(price, special, needs):
    for offer in special:
        new_needs = [needs[i] - offer[i] for i in range(len(needs))]
        cost = offer[-1] + dfs(new_needs)  # May have negative values!

# Correct: validate before applying
def shoppingOffers(price, special, needs):
    for offer in special:
        if all(offer[i] <= needs[i] for i in range(len(needs))):
            new_needs = [needs[i] - offer[i] for i in range(len(needs))]
            cost = offer[-1] + dfs(new_needs)
```

2. **Not using memoization**
```python
# Wrong: exponential time without memoization
def dfs(needs):
    if all(n == 0 for n in needs):
        return 0
    min_cost = sum(needs[i] * price[i] for i in range(len(needs)))
    for offer in special:
        # ... recursive calls without memo ...
    return min_cost

# Correct: use memoization
memo = {}
def dfs(needs):
    needs_tuple = tuple(needs)
    if needs_tuple in memo:
        return memo[needs_tuple]
    # ... compute min_cost ...
    memo[needs_tuple] = min_cost
    return min_cost
```

3. **Forgetting the baseline (buy individually)**
```python
# Wrong: only considers special offers
def dfs(needs):
    if all(n == 0 for n in needs):
        return 0
    min_cost = float('inf')
    for offer in special:
        # ... only special offers, no individual purchase option

# Correct: always consider buying individually
def dfs(needs):
    if all(n == 0 for n in needs):
        return 0
    # Baseline: buy all individually
    min_cost = sum(needs[i] * price[i] for i in range(len(needs)))
    # Try each special offer
    for offer in special:
        if all(offer[i] <= needs[i] for i in range(len(needs))):
            new_needs = [needs[i] - offer[i] for i in range(len(needs))]
            min_cost = min(min_cost, offer[-1] + dfs(new_needs))
    return min_cost
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Maximum Savings | Return maximum savings compared to buying individually | Easy |
| Limited Offer Usage | Each offer can be used at most k times | Medium |
| Bundled Offers with Requirements | Offers require buying exactly the bundle (no partial) | Medium |
| Dynamic Pricing | Prices change based on quantity purchased | Hard |

## Practice Checklist

- [ ] Implement DFS with memoization
- [ ] Validate special offers before applying
- [ ] Convert needs list to tuple for memoization key
- [ ] Include baseline cost (buy all individually)
- [ ] Handle base case: all needs satisfied (return 0)
- [ ] Test with Example 1: price=[2,5], special=[[3,0,5],[1,2,10]], needs=[3,2]
- [ ] Test with Example 2: multiple items with constraints
- [ ] Test edge case: no beneficial special offers
- [ ] Test edge case: needs=[0,0,...] (return 0)
- [ ] **Review in 24 hours**: Re-implement from memory
- [ ] **Review in 1 week**: Solve without hints
- [ ] **Review in 2 weeks**: Implement bottom-up DP approach

**Strategy**: See [Dynamic Programming Pattern](../strategies/patterns/dynamic-programming.md)
