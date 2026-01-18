---
id: E240
old_id: A327
slug: lemonade-change
title: Lemonade Change
difficulty: easy
category: easy
topics: ["greedy", "array", "simulation"]
patterns: ["greedy-algorithm", "simulation"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["greedy-basics", "array-traversal"]
related_problems: ["E122", "M045", "M055"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Lemonade Change

## Problem

You are operating a stand where every item costs exactly $5. Customers arrive in a sequence (represented by the array `bills`), and each customer buys one item and pays with either a $5, $10, or $20 bill. Your task is to determine whether you can provide the correct change to every customer in the order they arrive.

Here's the constraint that makes this interesting: you start with no money in your cash register. This means the first customer must pay with exact change (a $5 bill), otherwise you can't make change. As you serve customers, you accumulate bills that you can use to make change for future customers. When a customer pays with a $10 bill, you need to give them $5 back. When a customer pays with a $20 bill, you need to give them $15 back.

The challenge is managing your bill inventory strategically. Let's think about what bills you should keep. You never need to keep $20 bills because they're too large to use as change for any denomination. You only need to track $5 and $10 bills. But here's the crucial insight: not all change-making strategies are equal. When someone pays with $20, you can make $15 change in two ways: three $5 bills, or one $10 bill plus one $5 bill. Which should you choose?

The greedy strategy is to prefer using the $10 + $5 combination when possible, saving the three $5 bills option as a fallback. Why? Because $5 bills are more versatile—they can make change for both $10 and $20 bills, while $10 bills can only help with $20 bills. Keeping more $5 bills maintains your flexibility for future transactions. This greedy choice (use less flexible bills first) turns out to be optimal and never needs to be reconsidered.

You process customers one at a time, making irrevocable decisions about change without looking ahead. If at any point you can't make change, you return false immediately.

## Why This Matters

This problem teaches greedy algorithm design through a concrete, relatable scenario. Greedy algorithms make locally optimal choices at each step without reconsidering previous decisions, and this problem demonstrates when such an approach works perfectly. The cash register scenario intuitively shows why the greedy choice (prefer using $10 bills) is optimal: resource flexibility matters.

The pattern appears throughout resource management problems. Operating systems use similar greedy strategies for memory allocation (allocate the most constrained resource carefully), task scheduling (prioritize urgent tasks), and cache management (keep the most versatile cached items). In inventory management, you often need to decide which items to stock when space is limited—keeping more versatile items that can fulfill multiple needs is generally better.

From a financial perspective, this models real-world cash handling in retail and banking. Cashiers need to maintain a balance of different denominations to ensure they can make change. ATMs use similar logic to dispense cash using optimal bill combinations. The principle of maintaining liquid, flexible resources appears in portfolio management and working capital optimization.

The problem also illustrates an important distinction in algorithm design: greedy versus dynamic programming. This problem could be approached with dynamic programming (considering all possible change-making strategies), but the greedy solution is simpler, faster, and guaranteed to be correct. Recognizing when greedy works saves implementation complexity and computational resources. However, not all change-making problems have this property—the classic coin change problem with arbitrary denominations requires dynamic programming.

Understanding why the greedy approach works here (the "matroid" structure of the problem, though you don't need to know that term) builds intuition for recognizing similar patterns in other problems. The key property is that using a $10 bill never closes off future options that wouldn't already be closed without it.

## Examples

**Example 1:**
- Input: `bills = [5,5,5,10,20]`
- Output: `true`
- Explanation: The first three customers pay exact change. The fourth pays with $10, receiving $5 back. The fifth pays with $20, receiving $10 and $5 back. All transactions succeed.

**Example 2:**
- Input: `bills = [5,5,10,10,20]`
- Output: `false`
- Explanation: After the first four customers, you have two $10 bills and no $5 bills. When the last customer pays $20, you need to return $15 but cannot make this amount with only two $10 bills.

## Constraints

- 1 <= bills.length <= 10⁵
- bills[i] is either 5, 10, or 20.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1 - Conceptual Foundation
Track your inventory of $5 and $10 bills (you never keep $20 bills - why?). For each customer, first collect their payment, then determine what change to give. The key insight: when giving $15 change, should you prefer three $5 bills or one $10 and one $5? Which choice keeps your options more flexible?

### Hint 2 - Greedy Strategy
When making change for $20, you need to give back $15. You have two options: (1) three $5 bills, or (2) one $10 and one $5. Which should you choose? Consider that $5 bills are more versatile (can be used for any change), while $10 bills can only help with $10 or $20 payments.

### Hint 3 - Implementation Strategy
Maintain counters for $5 and $10 bills. Process each bill: if $5, increment the $5 counter. If $10, check if you have a $5 (decrement $5, increment $10). If $20, prefer giving one $10 and one $5 if possible (more flexible), otherwise give three $5 bills. Return false immediately if you can't make change.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy with Counters | O(n) | O(1) | Single pass, track only $5 and $10 counts |
| Simulation (Actual Bills) | O(n) | O(n) | Store actual bills, less efficient |

## Common Mistakes

### Mistake 1: Not Prioritizing $10 Bills When Making $15 Change
```python
# INCORRECT: Always uses $5 bills first for $20 change
def lemonade_change(bills):
    five, ten = 0, 0
    for bill in bills:
        if bill == 5:
            five += 1
        elif bill == 10:
            if five == 0:
                return False
            five -= 1
            ten += 1
        else:  # bill == 20
            if five >= 3:  # Wrong: tries three $5 first
                five -= 3
            elif five >= 1 and ten >= 1:
                five -= 1
                ten -= 1
            else:
                return False
    return True
```
**Why it's wrong:** $5 bills are more versatile than $10 bills. Using three $5 bills for change when you could use one $10 and one $5 wastes valuable $5 bills that might be needed later.

**Correct approach:**
```python
# CORRECT: Prioritize using $10 bills for $20 change
def lemonade_change(bills):
    five, ten = 0, 0
    for bill in bills:
        if bill == 5:
            five += 1
        elif bill == 10:
            if five == 0:
                return False
            five -= 1
            ten += 1
        else:  # bill == 20
            # Prefer using $10 + $5 over three $5s
            if ten >= 1 and five >= 1:
                ten -= 1
                five -= 1
            elif five >= 3:
                five -= 3
            else:
                return False
    return True
```

### Mistake 2: Keeping $20 Bills
```python
# INCORRECT: Unnecessarily tracks $20 bills
def lemonade_change(bills):
    five, ten, twenty = 0, 0, 0  # twenty is useless
    for bill in bills:
        if bill == 5:
            five += 1
        elif bill == 10:
            five -= 1
            ten += 1
        else:
            # Complex logic trying to use $20 bills
            twenty += 1
            # ...
```
**Why it's wrong:** You never need to keep $20 bills because they can't be used to make change for any denomination ($5, $10, or $20). Tracking them wastes space and complicates logic.

### Mistake 3: Not Checking Before Making Change
```python
# INCORRECT: Makes change without validation
def lemonade_change(bills):
    five, ten = 0, 0
    for bill in bills:
        if bill == 5:
            five += 1
        elif bill == 10:
            five -= 1  # ERROR: might go negative
            ten += 1
        else:
            five -= 1  # ERROR: might go negative
            ten -= 1   # ERROR: might go negative
    return True  # Always returns true
```
**Why it's wrong:** Counters can go negative, which is invalid. You must check availability before making change and return false immediately if unable.

## Problem Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Lemonade Change with Multiple Denominations | Medium | Handle more bill denominations (e.g., $1, $5, $10, $20, $50) |
| Minimum Bills for Change | Medium | Find minimum number of bills needed as initial inventory |
| Optimal Change Strategy | Hard | Preprocess bills to determine if rearrangement helps |
| Multiple Cashiers | Hard | Distribute customers among cashiers to maximize success |
| Lemonade with Inventory Restocking | Medium | Allow restocking bills at certain points |

## Practice Checklist

- [ ] First solve: Implement greedy solution correctly
- [ ] Handle edge cases: All $5s, immediate failure, large inputs
- [ ] Optimize: Ensure single-pass O(n) solution
- [ ] Review after 1 day: Explain why greedy works here
- [ ] Review after 1 week: Solve without hints, explain $10 prioritization
- [ ] Interview ready: Discuss why this is greedy, not dynamic programming

## Strategy

**Pattern**: Greedy Algorithm with Simulation
- Learn to recognize when greedy choices are optimal
- Master resource tracking and management
- Understand local decision-making without future knowledge

See [Greedy Pattern](../strategies/patterns/greedy.md) for the complete strategy guide.
