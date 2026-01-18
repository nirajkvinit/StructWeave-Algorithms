---
id: H072
old_id: I264
slug: optimal-account-balancing
title: Optimal Account Balancing
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Optimal Account Balancing

## Problem

You receive an array `transactions` where each entry `transactions[i] = [fromi, toi, amounti]` represents a money transfer: the individual identified by `ID = fromi` paid `amounti $` to the individual identified by `ID = toi`.

Find and return the *smallest number of money transfers needed to balance all debts*.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `transactions = [[0,1,10],[2,0,5]]`
- Output: `2`
- Explanation: Individual 0 transferred $10 to individual 1.
Individual 2 transferred $5 to individual 0.
Two transfers can resolve all debts. One possible solution: individual 1 sends $5 to both individual 0 and individual 2.

**Example 2:**
- Input: `transactions = [[0,1,10],[1,0,1],[1,2,5],[2,0,5]]`
- Output: `1`
- Explanation: Individual 0 transferred $10 to individual 1.
Individual 1 transferred $1 to individual 0.
Individual 1 transferred $5 to individual 2.
Individual 2 transferred $5 to individual 0.
Net result: individual 1 needs only to transfer $4 to individual 0, settling all accounts.

## Constraints

- 1 <= transactions.length <= 8
- transactions[i].length == 3
- 0 <= fromi, toi < 12
- fromi != toi
- 1 <= amounti <= 100

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

First, calculate the net balance for each person (total received minus total given). People with positive balances are creditors, negative balances are debtors, and zero balances need no transactions. The key insight: you only need to settle the non-zero balances, and the problem becomes finding the minimum number of transactions to zero out all balances.

This is essentially a balanced partition problem - you're trying to pair up positive and negative amounts optimally.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use backtracking with pruning:
1. Calculate net balance for each person
2. Filter out zero balances (they're already settled)
3. For each debt, try pairing it with every credit
4. When a debt-credit pair is created, reduce both amounts and recurse
5. Track the minimum number of transactions across all possible pairings

The small constraint (transactions.length <= 8) makes backtracking feasible, though it's still exponential in worst case.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Prune early: if you find a credit that exactly matches a debt, pair them immediately and remove both from consideration. Also, when backtracking, you can skip trying to settle a debt with multiple credits if you've already found a perfect match. Use memoization to cache results for specific balance states if you convert the balance array to a hashable key.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n! × 2^n) | O(n) | Try all possible transaction sequences |
| Backtracking with Pruning | O(2^n) | O(n) | n is number of non-zero balances (≤12) |
| Optimal (with memoization) | O(2^n × n) | O(2^n × n) | Cache states to avoid recomputation |

## Common Mistakes

1. **Not consolidating balances first**
   ```python
   # Wrong: Working directly with transactions
   def min_transfers(transactions):
       count = 0
       for i in range(len(transactions)):
           for j in range(i + 1, len(transactions)):
               # Trying to optimize raw transactions - inefficient
               pass

   # Correct: Calculate net balances first
   def min_transfers(transactions):
       balance = {}
       for frm, to, amount in transactions:
           balance[frm] = balance.get(frm, 0) - amount
           balance[to] = balance.get(to, 0) + amount
       # Only work with non-zero balances
       debts = [b for b in balance.values() if b != 0]
   ```

2. **Greedy approach doesn't work**
   ```python
   # Wrong: Greedily matching largest debt with largest credit
   def min_transfers(transactions):
       # Calculate balances...
       debts = sorted([b for b in balances if b < 0])
       credits = sorted([b for b in balances if b > 0], reverse=True)
       # Pairing largest with largest doesn't guarantee minimum
       return len(debts)  # Wrong!

   # Correct: Use backtracking to explore all possibilities
   def min_transfers_helper(debts, start):
       while start < len(debts) and debts[start] == 0:
           start += 1
       if start == len(debts):
           return 0
       result = float('inf')
       for i in range(start + 1, len(debts)):
           if debts[i] * debts[start] < 0:  # Opposite signs
               debts[i] += debts[start]
               result = min(result, 1 + min_transfers_helper(debts, start + 1))
               debts[i] -= debts[start]  # Backtrack
       return result
   ```

3. **Including zero balances in computation**
   ```python
   # Wrong: Processing people with zero balance
   balances = list(balance.values())  # Includes zeros
   return backtrack(balances, 0)

   # Correct: Filter out settled accounts
   balances = [b for b in balance.values() if b != 0]
   return backtrack(balances, 0)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Cash Flow | Hard | Same problem, different framing |
| Optimal Task Scheduling | Hard | Similar backtracking with constraints |
| Partition Equal Subset Sum | Medium | Simpler - only two partitions |
| Graph Coloring | Hard | Similar backtracking structure |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (zero balances, exact matches)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking](../../strategies/patterns/backtracking.md)
