---
id: F024
slug: happy-numbers
title: Happy Numbers
difficulty: foundation
topics: ["math", "digit-manipulation", "cycle-detection"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# Happy Numbers

## Problem

A **happy number** is defined by the following process:
1. Start with any positive integer
2. Replace the number by the sum of the squares of its digits
3. Repeat until the number equals 1 (happy!) or loops endlessly in a cycle (unhappy)

If the process ends in 1, the number is **happy**. Otherwise, it's **unhappy**.

**Example: 19 is happy**
```
19 → 1² + 9² = 1 + 81 = 82
82 → 8² + 2² = 64 + 4 = 68
68 → 6² + 8² = 36 + 64 = 100
100 → 1² + 0² + 0² = 1
```
We reached 1, so 19 is happy!

**Example: 2 is unhappy**
```
2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 → ...
```
We entered a cycle (back to 4), so 2 is unhappy.

## Why This Matters

This problem teaches several important concepts:

**1. Cycle Detection**: The process either reaches 1 or enters a cycle. Detecting cycles is crucial in:
- Linked list algorithms (Floyd's cycle detection)
- Random number generator testing
- Graph traversal

**2. State Space Analysis**: Why does the process always terminate or cycle?
- For a d-digit number n, the sum of squared digits ≤ d × 81
- A 3-digit number's sum is at most 3 × 81 = 243
- This bounds the sequence, guaranteeing eventual repetition

**3. Set vs. Two-Pointer**: Two common approaches teach different trade-offs:
- Hash set: O(1) lookup, O(n) space
- Floyd's algorithm: O(1) space, elegant

**4. Digit Manipulation**: Reinforces extracting and processing digits.

**5. Fixed Point vs. Cycle**: 1 is a fixed point (f(1) = 1). Unhappy numbers enter cycles. This distinction matters in dynamical systems.

## Examples

**Example 1:**

- Input: `n = 19`
- Output: `true`
- Explanation: 19 → 82 → 68 → 100 → 1 (reached 1)

**Example 2:**

- Input: `n = 2`
- Output: `false`
- Explanation: 2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 (cycle)

**Example 3:**

- Input: `n = 1`
- Output: `true`
- Explanation: Already 1

**Example 4:**

- Input: `n = 7`
- Output: `true`
- Explanation: 7 → 49 → 97 → 130 → 10 → 1

## Constraints

- 1 <= n <= 2^31 - 1
- Return true if n is a happy number, false otherwise

## Think About

1. How do you compute the sum of squared digits?
2. How can you detect if you've entered a cycle?
3. What are the possible ending states of this process?
4. Is there only one cycle for unhappy numbers?

---

## Approach Hints

<details>
<summary>Hint 1: Sum of Squared Digits</summary>

**Computing the next number in the sequence:**

```
sum_of_squared_digits(n):
    total = 0
    while n > 0:
        digit = n mod 10
        total += digit * digit
        n = n / 10  # integer division
    return total
```

**Example: n = 82**
- digit = 2, total = 4, n = 8
- digit = 8, total = 4 + 64 = 68, n = 0
- Return 68

**This function is O(log n)** — proportional to the number of digits.

</details>

<details>
<summary>Hint 2: HashSet Approach</summary>

**Idea**: Keep track of all numbers seen. If we see a repeat, it's a cycle.

```
is_happy_hashset(n):
    seen = empty set
    while n != 1 and n not in seen:
        seen.add(n)
        n = sum_of_squared_digits(n)
    return n == 1
```

**Trace for n = 2:**
- seen = {}, n = 2
- seen = {2}, n = 4
- seen = {2, 4}, n = 16
- seen = {2, 4, 16}, n = 37
- ... eventually n = 4 (already in seen)
- Return false

**Trace for n = 19:**
- seen = {}, n = 19
- seen = {19}, n = 82
- ... eventually n = 1
- Return true

**Time complexity**: O(log n) per step, O(?) steps (bounded by cycle length)
**Space complexity**: O(number of unique values seen)

</details>

<details>
<summary>Hint 3: Floyd's Cycle Detection (Tortoise and Hare)</summary>

**Insight**: This is like detecting a cycle in a linked list!

The sequence n → f(n) → f(f(n)) → ... either reaches 1 or cycles.

**Floyd's algorithm:**
- Slow pointer moves one step: slow = f(slow)
- Fast pointer moves two steps: fast = f(f(fast))
- If there's a cycle, they'll meet
- If we reach 1, it's happy

```
is_happy_floyd(n):
    slow = n
    fast = sum_of_squared_digits(n)

    while fast != 1 and slow != fast:
        slow = sum_of_squared_digits(slow)
        fast = sum_of_squared_digits(sum_of_squared_digits(fast))

    return fast == 1
```

**Why this works:**
- If the sequence reaches 1, fast will hit 1 first (it's faster)
- If there's a cycle, fast will eventually "lap" slow and meet it
- Either way, the loop terminates

**Time complexity**: O(log n) per step, O(cycle length) steps
**Space complexity**: O(1) — no hash set needed!

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| HashSet | O(k log n) | O(k) | k = steps until termination |
| Floyd's | O(k log n) | O(1) | Same time, constant space |

**Why k is bounded:**
- For an m-digit number, sum of squared digits ≤ 81m
- Numbers quickly shrink to a small range (under 243 for 3+ digits)
- The cycle (if any) is contained in a small set

**The unhappy cycle:**
All unhappy numbers eventually enter the same cycle:
4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4

**Shortcut**: You can check if n reaches 4 to detect unhappiness:
```
is_happy_shortcut(n):
    while n != 1 and n != 4:
        n = sum_of_squared_digits(n)
    return n == 1
```

---

## Key Concept

**Cycle Detection in Sequences**

**The problem structure:**
```
f: input → output
Sequence: x₀ → x₁ → x₂ → ...
where xᵢ₊₁ = f(xᵢ)
```

**Possible behaviors:**
1. **Reach a fixed point**: xᵢ = f(xᵢ) (like reaching 1 in happy numbers)
2. **Enter a cycle**: xᵢ = xⱼ for some i < j
3. **Diverge to infinity**: Not possible here due to bounded sum

**Floyd's cycle detection:**

```
     ┌──────────────────────┐
     ↓                      │
x₀ → x₁ → x₂ → ... → xμ → xμ₊₁ → ... → xμ₊λ₋₁
                      └──────── cycle ────────┘
```

- μ (mu) = length of "tail" before cycle
- λ (lambda) = length of cycle

**Why Floyd's works:**
- When slow enters the cycle at step μ, fast is already λ - (μ mod λ) steps ahead in the cycle
- Fast gains 1 step per iteration, so they meet within λ more iterations
- Total time: O(μ + λ)

**Applications:**
- Linked list cycle detection
- Detecting cycles in functional graphs
- Pollard's rho algorithm for factoring
- Testing pseudorandom number generators

---

## Common Mistakes

1. **Not handling n = 1**: It's already happy (1² = 1).

2. **Using while(true) without termination guarantee**: The sequence is proven to either reach 1 or cycle. Don't add arbitrary iteration limits.

3. **Slow fast initialization in Floyd's**: Initialize slow = n and fast = f(n) (not both to n), otherwise they start equal.

4. **Forgetting the second step for fast**: fast = f(f(fast)), not f(fast).

5. **Integer overflow in digit squaring**: For 32-bit integers, the maximum digit sum squared is 9² × 10 = 810, which is safe. But be careful with intermediate calculations.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Happy primes | Primes that are also happy | Combine primality check |
| nth happy number | Find the nth happy number | Generate sequence, count happy |
| Happy in base b | Use base b digits | Same algorithm, different digit extraction |
| Unhappy cycle | Find the cycle itself | Use Floyd's to find meeting point, then trace |
| Sum of digit cubes | Cube instead of square | Different fixed points and cycles |

**Happy primes under 100:**
7, 13, 19, 23, 31, 79, 97

**Sum of cubed digits:**
Leads to different numbers like 153 (1³ + 5³ + 3³ = 153) — Armstrong numbers!

---

## Practice Checklist

**Correctness:**

- [ ] Handles n = 1 (returns true)
- [ ] Handles simple happy (n = 7)
- [ ] Handles simple unhappy (n = 2)
- [ ] No infinite loop

**Understanding:**

- [ ] Can compute sum of squared digits
- [ ] Understands why the process terminates
- [ ] Can explain Floyd's cycle detection
- [ ] Knows there's only one unhappy cycle

**Mastery:**

- [ ] Solved without hints
- [ ] Implemented both HashSet and Floyd's approaches
- [ ] Can explain time/space trade-offs
- [ ] Can adapt to other "cycle or fixed point" problems

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve with HashSet
- [ ] Day 3: Implement Floyd's approach
- [ ] Day 7: Find first 10 happy numbers
- [ ] Day 14: Solve "detect cycle in linked list" using same technique

---

**Next Step:** [F025 - Collatz Conjecture](F025_collatz_conjecture.md) — Explore another famous sequence with unpredictable behavior
