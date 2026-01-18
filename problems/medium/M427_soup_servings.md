---
id: M427
old_id: A275
slug: soup-servings
title: Soup Servings
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Soup Servings

## Problem

You begin with `n` milliliters each of two different soup types: type A and type B. At each step, you randomly choose one of four serving operations, each with equal probability (25% each):

1. Serve 100 ml of soup A and 0 ml of soup B
2. Serve 75 ml of soup A and 25 ml of soup B
3. Serve 50 ml of soup A and 50 ml of soup B
4. Serve 25 ml of soup A and 75 ml of soup B

Notice that every operation serves at least as much soup A as soup B, meaning soup A will deplete faster on average. When a serving would require more soup than remains, you serve whatever is left instead. The process stops when at least one soup type is completely empty.

You need to calculate a specific probability: the chance that soup A runs out first, plus half the probability that both soups run out at the same time. Mathematically, this is: P(A empty first) + 0.5 × P(both empty together).

The problem becomes interesting for large values of n. Since soup A depletes faster, as n grows very large, the probability approaches 1.0 (soup A almost certainly empties first). Solutions within 10⁻⁵ of the actual answer are considered correct, allowing for optimizations that approximate the result for large n.

## Why This Matters

This problem combines probability theory with dynamic programming memoization, a powerful combination used in financial modeling (option pricing, risk analysis), machine learning (Markov decision processes), and game theory (expected value calculations). The optimization of scaling down the problem space and recognizing when probabilities converge is critical in computational statistics and Monte Carlo simulations. Understanding when to trade exact precision for computational efficiency by identifying convergence patterns is a valuable skill in data science and quantitative analysis.

## Examples

**Example 1:**
- Input: `n = 50`
- Output: `0.62500`
- Explanation: Analyzing each operation's outcome:
Operation 1: A depletes first (contributes 1.0)
Operation 2: A depletes first (contributes 1.0)
Operation 3: Both deplete together (contributes 0.5)
Operation 4: B depletes first (contributes 0.0)
Expected value: 0.25 × (1 + 1 + 0.5 + 0) = 0.625

**Example 2:**
- Input: `n = 100`
- Output: `0.71875`

## Constraints

- 0 <= n <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a probability problem solved with dynamic programming. Define prob(a, b) as the probability that soup A runs out first (plus 0.5 times both run out together) when starting with a ml of A and b ml of B. Use memoization to cache results. Key observation: for large n, the probability approaches 1.0 because soup A always depletes faster, so you can return 1.0 for n >= 5000.
</details>

<details>
<summary>Main Approach</summary>
Use recursive DP with memoization. Base cases: if both soups are empty, return 0.5; if only A is empty, return 1.0; if only B is empty, return 0.0. For the recursive case, try all four operations with 0.25 probability each and sum the results. To optimize, divide all quantities by 25 (GCD of 100, 75, 50, 25) to reduce state space. For n >= 5000, return 1.0 immediately.
</details>

<details>
<summary>Optimization Tip</summary>
Scale down the problem by dividing n by 25 since all operations are multiples of 25. This reduces the state space from potentially n × n to (n/25) × (n/25). Also, notice that for large n (≥ 5000), the answer is effectively 1.0 due to soup A depleting faster. This early termination saves massive computation for large inputs.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive Recursion | O(4^n) | O(n²) | Exponential without memoization |
| DP with Memoization | O(n²) | O(n²) | After scaling by 25: O((n/25)²) |
| Optimal (with cutoff) | O(1) for n≥5000 | O(200²) | Bounded by cutoff threshold |

## Common Mistakes

1. **Not handling the base cases correctly**
   ```python
   # Wrong: Not distinguishing between A empty, B empty, both empty
   if a <= 0 or b <= 0:
       return 1.0

   # Correct: Three separate base cases
   if a <= 0 and b <= 0:
       return 0.5
   if a <= 0:
       return 1.0
   if b <= 0:
       return 0.0
   ```

2. **Forgetting to scale down**
   ```python
   # Wrong: Working with original n (up to 10^9)
   def prob(a, b):
       if (a, b) in memo:
           return memo[(a, b)]
       # This creates huge state space!

   # Correct: Scale by dividing by 25
   n = (n + 24) // 25  # Ceiling division
   def prob(a, b):
       # Now a and b are much smaller
   ```

3. **Not using the large n optimization**
   ```python
   # Wrong: Computing for all n up to 10^9
   return prob(n, n)

   # Correct: Early return for large n
   if n >= 5000:
       return 1.0
   n = (n + 24) // 25
   return prob(n, n)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Coin Change Probability | Medium | Calculate probability of making exact change |
| Knight Probability in Chessboard | Medium | Probability knight stays on board after k moves |
| New 21 Game | Medium | Probability of reaching target score in card game |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming - Memoization](../../strategies/patterns/dynamic-programming.md)
