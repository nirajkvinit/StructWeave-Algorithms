---
id: E173
old_id: I278
slug: largest-palindrome-product
title: Largest Palindrome Product
difficulty: easy
category: easy
topics: ["string", "math", "palindrome"]
patterns: ["palindrome-generation", "number-theory"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E009", "E125", "E564"]
prerequisites: ["palindrome-check", "number-properties", "modulo-arithmetic"]
strategy_ref: ../strategies/patterns/palindrome.md
---
# Largest Palindrome Product

## Problem

Your task is to find the largest palindrome number that can be created by multiplying two n-digit numbers together. A palindrome reads the same forwards and backwards (like 9009 or 12321). Since the result can become astronomically large for bigger values of n, return your answer modulo 1337 to keep it manageable.

For context, when n=2, you're looking at all possible products of two-digit numbers (10 through 99). The largest palindrome from this range is 9009, which equals 91 × 99. Note that there's no straightforward mathematical formula to find this directly - you need a clever search strategy because checking all possible products would be far too slow for larger values of n.

The modulo 1337 requirement is particularly important: you must find the actual largest palindrome first, then apply the modulo operation. Applying modulo during your search would give incorrect results since it changes the values you're comparing.

## Why This Matters

This problem combines number theory, optimization, and algorithmic efficiency in a way that mirrors real-world computational challenges. The core skill is recognizing when brute force becomes impractical and finding smarter search strategies. Instead of generating all products and checking for palindromes (which becomes infeasible quickly), you learn to generate candidate palindromes and verify if they can be factored appropriately. This "generate and verify" pattern appears in cryptography (finding prime factors), scheduling problems (generating valid configurations), and constraint satisfaction. The problem also teaches you about search space reduction - a critical optimization technique for problems with exponential possibilities.

## Examples

**Example 1:**
- Input: `n = 2`
- Output: `987`
- Explanation: 99 x 91 = 9009, 9009 % 1337 = 987

**Example 2:**
- Input: `n = 1`
- Output: `9`

## Constraints

- 1 <= n <= 8

## Think About

1. What makes this problem challenging?
   - Search space is enormous for large n (e.g., n=8 means checking 10^16 products)
   - Need to find palindromes that are products of two n-digit numbers
   - Verifying if a number is a palindrome requires conversion to string
   - Starting from the largest possible product and working down is inefficient

2. Can you identify subproblems?
   - Generating palindromes in descending order
   - Checking if a palindrome can be expressed as product of two n-digit numbers
   - Finding divisors of a number within a specific range
   - Applying modulo operation to large results

3. What invariants must be maintained?
   - Both factors must be n-digit numbers
   - The product must be a palindrome
   - Looking for the maximum such palindrome
   - Result must be taken modulo 1337

4. Is there a mathematical relationship to exploit?
   - Generate palindromes from largest to smallest, check if factorizable
   - For n-digit numbers, max product is (10^n - 1)²
   - Palindrome structure: reverse of first half forms second half
   - Can check divisibility: if p is palindrome, test if p % x == 0 for x in range

## Approach Hints

### Hint 1: Brute Force - Check All Products
Try all pairs of n-digit numbers from largest to smallest. For each product, check if it's a palindrome. Keep track of the maximum palindrome found.

**Key insight**: Start from largest numbers (10^n - 1) and work downward.

**Limitations**: Time complexity O((10^n)²) which is impractical for n > 3. Checking billions of products.

### Hint 2: Generate Palindromes and Check Factorizability
Instead of generating products, generate palindromes from largest to smallest. For each palindrome, check if it can be expressed as a product of two n-digit numbers.

**Key insight**: Far fewer palindromes exist than products, more efficient to generate and test them.

**How to implement**:
- For n-digit factors, palindrome has at most 2n digits
- Generate palindromes from 10^(2n) - 1 down to 10^(2n-1)
- For each palindrome p, check if p = a * b where both a and b are n-digit
- Test divisors from 10^(n-1) to 10^n - 1

### Hint 3: Optimized Palindrome Generation with Early Exit
Generate candidate palindromes by mirroring the first half. For each palindrome, try to factor it by checking divisors in the n-digit range. Exit as soon as you find a valid factorization.

**Key insight**: Build palindromes systematically, test factorization with optimized range.

**Optimization strategy**:
- Start with max possible first half for 2n-digit palindrome
- Mirror to create full palindrome
- Check if palindrome / divisor gives another n-digit number
- Upper bound for divisor: min(sqrt(palindrome), 10^n - 1)
- Lower bound: 10^(n-1)

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All products) | O(10^(2n)) | O(1) | Check all pairs of n-digit numbers, impractical for n > 3 |
| Optimized Product Check | O(10^(2n)) | O(1) | Start from max, early exit, but still too slow |
| Generate Palindromes | O(10^n * 10^(n/2)) | O(1) | Generate ~10^n palindromes, check ~10^(n/2) divisors each |
| Optimized Palindrome Gen | O(10^n * √(10^(2n))) | O(1) | Best practical approach, early exit on first valid palindrome |

## Common Mistakes

### Mistake 1: Not considering the full range of palindrome lengths
```
// Wrong - assumes palindrome has exactly 2n digits
maxPalindrome = 0
for (let p = 10^(2n) - 1; p >= 10^(2n-1); p--) {
    if (isPalindrome(p) && canFactor(p, n)) {
        return p % 1337
    }
}

// Why it fails: Largest palindrome might have 2n-1 digits, not 2n
// Example: n=2, largest is 9009 (4 digits), not 5-digit palindrome

// Correct - check both 2n and 2n-1 digit palindromes
// Or generate palindromes by mirroring first half
```

### Mistake 2: Inefficient palindrome checking
```
// Wrong - generates all products then checks palindrome
for (let a = 10^n - 1; a >= 10^(n-1); a--) {
    for (let b = a; b >= 10^(n-1); b--) {
        product = a * b
        if (isPalindrome(product)) {
            maxPalindrome = Math.max(maxPalindrome, product)
        }
    }
}

// Why it's inefficient: Checks O(10^(2n)) products even after finding answer
// No early exit, wastes computation

// Correct - generate palindromes or use early exit with better bounds
```

### Mistake 3: Not handling modulo correctly
```
// Wrong - applies modulo during comparison
for each palindrome p:
    if (canFactor(p % 1337, n)) {  // Wrong!
        return p % 1337
    }

// Why it fails: Modulo changes the value, affects factorization
// Need to find actual largest palindrome first, then apply modulo

// Correct - find largest palindrome, then apply modulo at the end
maxPalindrome = findLargestPalindromeProduct(n)
return maxPalindrome % 1337
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Smallest palindrome product | Find smallest palindrome product instead of largest | Easy |
| K factors | Find largest palindrome that is product of k n-digit numbers | Hard |
| Palindrome in different base | Find palindrome in base b instead of base 10 | Medium |
| Palindrome sum | Find largest palindrome that is sum of two n-digit numbers | Medium |
| Constrained factors | Factors must be prime or satisfy other constraints | Hard |
| Count palindrome products | Count all distinct palindrome products of n-digit numbers | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Implement brute force for small n
- [ ] Understand palindrome generation approach
- [ ] Implement palindrome generation with factorization check
- [ ] Optimize with proper bounds and early exit
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 30 minutes

**Strategy**: See [Palindrome Pattern](../strategies/patterns/palindrome.md)
