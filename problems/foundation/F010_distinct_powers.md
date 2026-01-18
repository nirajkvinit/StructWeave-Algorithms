---
id: F010
euler_id: 29
slug: distinct-powers
title: Distinct Powers
difficulty: foundation
topics: ["math", "sets", "powers"]
patterns: []
estimated_time_minutes: 10
prerequisites: ["programming-basics"]
---

# Distinct Powers

## Problem

Consider all integer combinations of a^b for 2 <= a <= n and 2 <= b <= n. How many distinct terms are in this sequence?

For example, with n = 5, you compute:
- 2^2=4, 2^3=8, 2^4=16, 2^5=32
- 3^2=9, 3^3=27, 3^4=81, 3^5=243
- 4^2=16, 4^3=64, 4^4=256, 4^5=1024
- 5^2=25, 5^3=125, 5^4=625, 5^5=3125

Notice that 2^4 = 4^2 = 16, so 16 appears twice. After removing duplicates, there are 15 distinct values.

Your task is to count how many unique values appear when computing all a^b where both a and b range from 2 to n inclusive.

## Why This Matters

This problem introduces **sets** as a data structure for automatic duplicate elimination. Sets are fundamental to many algorithms:
- **Deduplication**: Remove duplicate elements from any collection
- **Membership testing**: Check if an element exists in O(1) average time
- **Set operations**: Union, intersection, difference for combining datasets
- **Graph algorithms**: Track visited nodes, prevent cycles

The mathematical aspect reveals that some powers are equivalent. For instance:
- 2^4 = 4^2 = 16 (because 4 = 2²)
- 2^6 = 4^3 = 64
- 2^8 = 4^4 = 16^2 = 256

This happens when a = c^k and b = d/k for some integers c, d, k. Understanding when duplicates occur leads to mathematical insights about exponentiation and prime factorization.

**Real-world applications:**
- **Cryptography**: Discrete logarithm problem (given g^x, find x) is hard for large numbers
- **Hashing**: Hash functions often use modular exponentiation
- **Number theory**: Properties of powers appear in Fermat's Little Theorem, Euler's Theorem
- **Data analysis**: Counting unique values in large datasets

The brute-force approach (generate all, use set to deduplicate) is actually optimal for this problem. Not all problems require clever optimizations - sometimes the straightforward solution is best!

## Examples

**Example 1:**

- Input: `n = 5`
- Output: `15`
- Explanation: 15 distinct values from 2^2 to 5^5

**Example 2:**

- Input: `n = 3`
- Output: `4`
- Explanation: Computing 2^2, 2^3, 3^2, 3^3 gives 4, 8, 9, 27 (all distinct)

**Example 3:**

- Input: `n = 2`
- Output: `1`
- Explanation: Only 2^2 = 4

## Constraints

- 2 <= n <= 100
- Both a and b range from 2 to n inclusive

## Think About

1. What's the simplest approach that works?
2. Which data structure automatically handles duplicates?
3. How many total pairs (a, b) are there?
4. Can you predict when duplicates will occur?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started</summary>

The straightforward approach works perfectly:

1. Create an empty set to store unique values
2. For each a from 2 to n:
   - For each b from 2 to n:
     - Compute a^b
     - Add to the set
3. Return the size of the set

Sets automatically handle duplicates - if you add the same value twice, it's only stored once.

**Pseudocode:**
```
distinct_values = empty set

for a in range(2, n + 1):
    for b in range(2, n + 1):
        value = a ** b
        add value to distinct_values

return size of distinct_values
```

</details>

<details>
<summary>Hint 2: Key Insight - Sets for Deduplication</summary>

**In Python:**
```python
distinct = set()
for a in range(2, n + 1):
    for b in range(2, n + 1):
        distinct.add(a ** b)
return len(distinct)
```

**Or more concisely using set comprehension:**
```python
return len({a**b for a in range(2, n+1) for b in range(2, n+1)})
```

**In other languages:**
- Java: Use `HashSet<BigInteger>`
- JavaScript: Use `Set` with BigInt
- C++: Use `std::unordered_set` or `std::set`

The set automatically deduplicates. When you add 16 the second time (from 4^2 after 2^4), it's ignored.

</details>

<details>
<summary>Hint 3: Mathematical Insight - When Duplicates Occur</summary>

Duplicates occur when:
```
a^b = c^d
```

This happens when a and c share a common base. For example:
- 2^6 = 64
- 4^3 = 64 (because 4 = 2²)
- 8^2 = 64 (because 8 = 2³)

More formally, if a = p^i and c = p^j for some prime p, then:
```
a^b = c^d when i*b = j*d
```

For n = 100, there are 99 × 99 = 9801 total pairs, but fewer distinct values due to these overlaps.

**Advanced**: You could count duplicates mathematically, but the set-based solution is simpler and fast enough for n <= 100.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Set-based | O(n² log n) | O(n²) | n² pairs to compute and store; log n for big integer exponentiation |
| Mathematical counting | O(n² log n) | O(n²) | Complex to implement; same complexity |

**Note:**
- Computing a^b for large a, b requires O(log b) multiplications of potentially large numbers
- For n = 100, we compute ~10,000 values, which is very fast on modern computers
- The set holds at most n² elements (and typically fewer due to duplicates)

---

## Key Concept

**Sets for Unique Value Collection**

A **set** is an unordered collection that stores unique elements. Key properties:
- **No duplicates**: Adding an element already in the set has no effect
- **Fast membership test**: Checking if x is in the set is O(1) average time (hash-based) or O(log n) (tree-based)
- **Efficient deduplication**: Perfect for "count unique values" problems

**Set operations** include:
- Add element: `set.add(x)`
- Check membership: `x in set`
- Remove element: `set.remove(x)`
- Size: `len(set)`
- Union: `set1 | set2`
- Intersection: `set1 & set2`
- Difference: `set1 - set2`

**When to use sets:**
1. Remove duplicates from a list
2. Check if element exists (fast lookup)
3. Find common elements between collections
4. Track visited states in graph/tree algorithms
5. Count unique values

**Mathematical note on duplicates:**
Powers can be equal when their prime factorizations are equal. For example:
- 2^10 = 1024
- 4^5 = 1024 (4 = 2²)
- 32^2 = 1024 (32 = 2^5)

All equal because they all equal 2^10 in prime factorization form.

The number of distinct values for large n approaches n² but grows slightly slower due to these overlaps.

---

## Common Mistakes

1. **Using lists instead of sets**: If you store values in a list, you'll count duplicates. Use a set for automatic deduplication.

2. **Integer overflow**: For large n (like 100), values like 100^100 are enormous (200 digits!). Use languages with big integers (Python) or big integer libraries (Java's BigInteger).

3. **Off-by-one in range**: Ensure both a and b go from 2 to n **inclusive**. In Python, use `range(2, n + 1)`.

4. **Checking for duplicates manually**: Don't loop through existing values to check for duplicates. Let the set handle it automatically.

5. **Premature optimization**: For n <= 100, the straightforward approach is fast. Don't waste time on complex mathematical formulas unless n is much larger.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Count duplicates | Find how many duplicates | Compute n² - len(set) |
| Largest distinct value | Find maximum | Track max instead of count |
| Distinct products a×b | Multiplication instead | Same approach, use a*b |
| Only prime bases | Restrict a to primes | Filter a values |
| Three factors a^b^c | Triple exponentiation | Three nested loops |
| Sum of distinct values | Sum instead of count | Sum set elements |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (Examples 1-3)
- [ ] Handles edge cases (n = 2, n = 100)
- [ ] Uses inclusive ranges (2 to n, not 2 to n-1)
- [ ] Produces correct output format (single integer)

**Understanding:**

- [ ] Can explain why duplicates occur
- [ ] Understands set data structure
- [ ] Can give examples of equivalent powers

**Mastery:**

- [ ] Solved without hints
- [ ] Can explain to someone else
- [ ] Implemented using set comprehension (if using Python)
- [ ] Knows when sets are appropriate vs. other structures

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain why duplicates exist
- [ ] Day 14: Implement in a different language

---

**Euler Reference:** [Problem 29](https://projecteuler.net/problem=29)

**Next Step:** After mastering this, explore more Foundation problems or move to [Easy Problems](../easy/README.md)
