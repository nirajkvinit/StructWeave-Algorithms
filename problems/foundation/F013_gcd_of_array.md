---
id: F013
slug: gcd-of-array
title: GCD of Array
difficulty: foundation
topics: ["math", "gcd", "reduction"]
patterns: []
estimated_time_minutes: 12
prerequisites: ["programming-basics"]
---

# GCD of Array

## Problem

Given an array of positive integers, find the greatest common divisor (GCD) of all elements in the array.

The GCD of two numbers is the largest positive integer that divides both numbers without leaving a remainder. The GCD of an array is the largest positive integer that divides every element of the array.

**Examples:**
- GCD(12, 18) = 6
- GCD(12, 18, 24) = 6
- GCD(5, 10, 15) = 5

Write a function that takes an array of integers and returns their GCD.

## Why This Matters

Computing the GCD of multiple numbers is a fundamental operation with many applications:

**1. Simplifying Fractions**: To reduce a fraction to lowest terms, divide both numerator and denominator by their GCD. For ratios involving multiple numbers (like a:b:c), you need the GCD of all three.

**2. Problem Simplification**: Many algorithm problems involve finding the "step size" that evenly divides multiple values:
- Water jug problems: Can you measure X liters with jugs of capacity A and B?
- Coin problems: What amounts can be made with coins of given denominations?
- Scheduling: Finding intervals that align with multiple periodic events

**3. Cryptography**: The extended Euclidean algorithm (based on GCD) is essential for:
- Computing modular inverses
- RSA key generation
- Solving linear Diophantine equations

**4. Array Processing Pattern**: This problem introduces the powerful "reduction" pattern—applying a binary operation iteratively across an array. The same pattern applies to finding LCM, XOR of array, product, etc.

## Examples

**Example 1:**

- Input: `[12, 18, 24]`
- Output: `6`
- Explanation: 6 divides all three numbers. No larger number divides 12 evenly.

**Example 2:**

- Input: `[7, 14, 21, 28]`
- Output: `7`
- Explanation: All numbers are multiples of 7.

**Example 3:**

- Input: `[17, 23, 31]`
- Output: `1`
- Explanation: These are all prime numbers with no common factor, so GCD is 1.

**Example 4:**

- Input: `[100]`
- Output: `100`
- Explanation: GCD of a single number is the number itself.

## Constraints

- 1 <= array.length <= 10^4
- 1 <= array[i] <= 10^9
- The array contains at least one element

## Think About

1. How do you compute GCD of two numbers efficiently?
2. How can you extend the two-number GCD to work on an array?
3. Is the order in which you process elements important?
4. What happens if the GCD becomes 1 during processing?

---

## Approach Hints

<details>
<summary>Hint 1: Euclidean Algorithm for Two Numbers</summary>

The Euclidean algorithm computes GCD(a, b) efficiently:

**Key insight**: GCD(a, b) = GCD(b, a mod b)

**Why this works:**
- If d divides both a and b, then d also divides (a mod b)
- The remainder (a mod b) is always smaller than b
- Eventually, the remainder becomes 0
- When b = 0, GCD(a, 0) = a

**Implementation:**
```
gcd(a, b):
    while b != 0:
        temp = b
        b = a mod b
        a = temp
    return a
```

**Example: GCD(48, 18)**
- GCD(48, 18) → 48 mod 18 = 12 → GCD(18, 12)
- GCD(18, 12) → 18 mod 12 = 6 → GCD(12, 6)
- GCD(12, 6) → 12 mod 6 = 0 → GCD(6, 0)
- GCD(6, 0) = 6

**Time complexity**: O(log(min(a, b))) per GCD call.

</details>

<details>
<summary>Hint 2: Extending to Arrays via Reduction</summary>

**Key property**: GCD is associative.

GCD(a, b, c) = GCD(GCD(a, b), c) = GCD(a, GCD(b, c))

This means you can process the array left to right:

```
gcd_of_array(arr):
    result = arr[0]
    for i from 1 to length(arr) - 1:
        result = gcd(result, arr[i])
    return result
```

**Example: GCD([12, 18, 24])**
- Start: result = 12
- Step 1: result = GCD(12, 18) = 6
- Step 2: result = GCD(6, 24) = 6
- Final: 6

**Alternative using reduce/fold:**
```
gcd_of_array(arr):
    return reduce(gcd, arr)
```

</details>

<details>
<summary>Hint 3: Early Termination Optimization</summary>

**Observation**: GCD can only stay the same or decrease as you process more numbers.

**Important**: If GCD becomes 1, it will stay 1 for all remaining elements (since 1 divides everything, and no positive integer smaller than 1 exists).

**Optimized implementation:**
```
gcd_of_array(arr):
    result = arr[0]
    for i from 1 to length(arr) - 1:
        result = gcd(result, arr[i])
        if result == 1:
            return 1  # Early termination
    return result
```

**Why this matters:**
- For arrays with coprime elements, you don't need to process all elements
- In the worst case (result never becomes 1), this doesn't help
- But in practice, many arrays have GCD = 1, and early termination saves time

**Edge cases to handle:**
- Empty array: Return 0 or handle as error
- Single element: Return that element
- All elements equal: Return that element

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive (check all divisors) | O(n × min) | O(1) | min = smallest element |
| Euclidean reduction | O(n × log(max)) | O(1) | max = largest element |
| With early termination | O(k × log(max)) | O(1) | k = elements until GCD=1 |

**Why Euclidean is efficient:**
- Each GCD call is O(log(min(a, b)))
- We make n-1 GCD calls
- Total: O(n × log(max value))

---

## Key Concept

**Reduction Operations**

A **reduction** (also called **fold**) applies a binary operation iteratively to combine all elements of a collection into a single value.

```
reduce(op, [a, b, c, d]) = op(op(op(a, b), c), d)
```

**Requirements for reduction:**
1. **Binary operation**: Takes two inputs, produces one output
2. **Associativity** (for correctness): (a op b) op c = a op (b op c)
3. **Identity element** (for empty arrays): op(identity, x) = x

**Common reductions:**

| Operation | Identity | Example |
|-----------|----------|---------|
| Sum | 0 | reduce(+, [1,2,3]) = 6 |
| Product | 1 | reduce(×, [2,3,4]) = 24 |
| GCD | 0* | reduce(gcd, [12,18]) = 6 |
| LCM | 1 | reduce(lcm, [4,6]) = 12 |
| XOR | 0 | reduce(⊕, [5,3,5]) = 3 |
| Min | +∞ | reduce(min, [3,1,4]) = 1 |
| Max | -∞ | reduce(max, [3,1,4]) = 4 |

*Note: GCD(0, x) = x, so 0 acts as identity for GCD.

**In interviews**: When you see "find the X of an array" where X is a binary operation, think reduction!

---

## Common Mistakes

1. **Using subtraction instead of modulo**: The subtraction-based algorithm (a - b repeatedly) is O(max value), much slower than the modulo-based Euclidean algorithm.

2. **Forgetting edge cases**:
   - GCD(x, 0) = x (not an error)
   - GCD(0, 0) is undefined (handle as needed)
   - Single-element array returns that element

3. **Not handling large numbers**: For very large numbers, ensure your modulo operation doesn't overflow. Most languages handle this correctly for integers.

4. **Processing in wrong order**: While GCD is commutative and associative (order doesn't matter mathematically), the early termination optimization is most effective when smaller numbers are processed first (more likely to reduce GCD quickly).

5. **Returning 0 for empty array**: Decide on convention—either return 0, throw error, or require non-empty input.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| LCM of array | Find least common multiple | LCM(a,b) = (a × b) / GCD(a,b); reduce with LCM |
| GCD of range queries | Multiple range GCD queries | Sparse table or segment tree |
| Number of pairs with GCD = k | Count pairs where GCD equals k | Divide all by k, count coprime pairs |
| Make all elements equal | Min operations to make GCD | Final GCD must divide all elements |
| GCD with updates | Array changes, query GCD | Segment tree with GCD operation |

**LCM formula:**
```
lcm(a, b) = (a × b) / gcd(a, b)
```
For arrays: reduce with LCM, but watch for overflow!

---

## Practice Checklist

**Correctness:**

- [ ] Handles single-element array
- [ ] Handles array where GCD = 1
- [ ] Handles array of identical elements
- [ ] Handles large numbers (up to 10^9)

**Understanding:**

- [ ] Can implement Euclidean algorithm from memory
- [ ] Understands why GCD is associative
- [ ] Can explain the reduction pattern
- [ ] Knows when to apply early termination

**Mastery:**

- [ ] Solved without hints
- [ ] Can extend to LCM of array
- [ ] Can explain time complexity analysis
- [ ] Can identify reduction patterns in other problems

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement LCM of array variation
- [ ] Day 14: Explain reduction pattern to someone

---

**Next Step:** After mastering this, try [F014: Coprime Pairs](./F014_coprime_pairs.md)
