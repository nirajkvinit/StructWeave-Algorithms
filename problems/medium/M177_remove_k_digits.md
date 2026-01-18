---
id: M177
old_id: I201
slug: remove-k-digits
title: Remove K Digits
difficulty: medium
category: medium
topics: ["stack", "greedy", "string"]
patterns: ["stack", "greedy"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M316", "M321", "M1081"]
prerequisites: ["stack", "greedy-algorithms", "string-manipulation"]
---
# Remove K Digits

## Problem

Imagine you're holding a string of digits representing a non-negative integer, and you need to remove exactly `k` of these digits to create the smallest possible number. The digits must remain in their original order (you can delete digits, but you can't rearrange them), and your goal is to minimize the numerical value of what remains. This seemingly simple task requires careful strategic thinking about which digits to eliminate.

Let's explore some examples to see the subtleties. Given `num = "1432219"` and `k = 3`, you need to remove 3 digits. If you remove 4, 3, and 2 (reading left to right), you're left with `"1219"`, which equals 1,219. This turns out to be optimal. Why not remove other digits? If you removed 1, 4, and 3, you'd get `"2219"` (2,219), which is larger. The key insight is that you want smaller digits to appear as early (leftmost) as possible, since leftmost positions are the most significant. Here's another example: `num = "10200"` and `k = 1`. Removing the first digit gives you `"0200"`, but since numbers shouldn't have leading zeros, this becomes `"200"` (equal to 200). If you had removed a different digit, like the first `0`, you'd get `"1200"` (1,200), which is much larger.

Edge cases matter too. If `num = "10"` and `k = 2`, you're removing all digits, leaving an empty string. In such cases, the result should be `"0"` by convention. Also consider `num = "112"` with `k = 1`: removing the first `1` gives `"12"`, but removing the `2` gives `"11"`, which is smaller. Another important pattern: if the digits are in increasing order (like `"12345"`) and you need to remove `k` digits, you should remove from the right side, because any removal from the left would bring a larger digit into a more significant position. The constraints are that `num` can have up to 100,000 digits, and `k` can be anywhere from 1 to the length of `num`.

## Why This Matters

Greedy algorithms for sequence optimization appear throughout computer science and operations research. Text compression algorithms decide which characters to encode or skip to minimize output size. In financial trading, algorithms select which orders to fill to minimize execution costs given constraints. Task schedulers remove low-priority jobs to optimize resource usage. This problem specifically teaches the monotonic stack pattern, which is crucial for problems involving "next greater element," "largest rectangle," and "stock span" calculations. The insight here is that when scanning left to right, if you encounter a digit that's larger than the next digit, removing it immediately makes the number smaller. By maintaining a stack that keeps digits in non-decreasing order and popping larger digits when you can still afford removals, you naturally build the smallest possible result. This greedy approach works because the leftmost position has the highest impact, so optimizing locally from left to right produces a globally optimal solution. Understanding when greedy algorithms are correct (versus when you need dynamic programming) is a valuable skill, and this problem provides a perfect example where the greedy choice is provably optimal.

## Examples

**Example 1:**
- Input: `num = "1432219", k = 3`
- Output: `"1219"`
- Explanation: By eliminating digits 4, 3, and 2, we obtain 1219, which represents the minimum achievable value.

**Example 2:**
- Input: `num = "10200", k = 1`
- Output: `"200"`
- Explanation: Deleting the first digit (1) yields 200. Remember that leading zeros should not appear in the result.

**Example 3:**
- Input: `num = "10", k = 2`
- Output: `"0"`
- Explanation: When all digits are removed, the result is 0.

## Constraints

- 1 <= k <= num.length <= 10⁵
- num consists of only digits.
- num does not have any leading zeros except for the zero itself.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Greedy Observation</summary>

To minimize the resulting number, you want smaller digits to appear earlier (leftmost positions are most significant). When scanning left to right, if you find a digit that's larger than the next digit, removing it makes the number smaller. This is the key greedy insight.

</details>

<details>
<summary>🎯 Hint 2: Monotonic Stack Pattern</summary>

Use a stack to build the result while maintaining increasing order. For each new digit:
- While the stack top is greater than the current digit AND you still have removals left, pop from stack
- Push the current digit

This naturally removes larger digits that come before smaller ones.

</details>

<details>
<summary>📝 Hint 3: Edge Cases to Handle</summary>

After processing all digits:
1. If you haven't removed k digits yet, remove from the end (the remaining largest digits)
2. Remove leading zeros from the result
3. If the result is empty, return "0"

These edge cases handle monotonic sequences and complete removals.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Try All Combinations | O(C(n,k)) | O(n) | Exponential, completely impractical |
| Greedy with Stack | O(n) | O(n) | Each digit pushed/popped at most once |
| **Optimized Stack** | **O(n)** | **O(n)** | Optimal: single pass with monotonic stack |

## Common Mistakes

### Mistake 1: Removing k smallest digits

```python
# Wrong: Removing smallest digits doesn't minimize the number
def removeKdigits(num, k):
    # WRONG: This makes the number larger, not smaller
    digits = sorted(num)
    for _ in range(k):
        digits.pop(0)  # Remove smallest

    return ''.join(digits)

# Correct: Use greedy stack approach
def removeKdigits(num, k):
    stack = []
    to_remove = k

    for digit in num:
        while stack and to_remove > 0 and stack[-1] > digit:
            stack.pop()
            to_remove -= 1
        stack.append(digit)

    # Remove remaining if needed
    stack = stack[:len(stack) - to_remove]

    # Remove leading zeros
    result = ''.join(stack).lstrip('0')
    return result if result else '0'
```

### Mistake 2: Not handling remaining removals

```python
# Wrong: Doesn't remove digits if no decreasing pattern found
def removeKdigits(num, k):
    stack = []
    to_remove = k

    for digit in num:
        while stack and to_remove > 0 and stack[-1] > digit:
            stack.pop()
            to_remove -= 1
        stack.append(digit)

    # WRONG: Forgot to remove remaining digits from end
    # For input "12345", k=3, this returns "12345" instead of "12"

    result = ''.join(stack).lstrip('0')
    return result if result else '0'

# Correct: Remove from end if needed
def removeKdigits(num, k):
    stack = []
    to_remove = k

    for digit in num:
        while stack and to_remove > 0 and stack[-1] > digit:
            stack.pop()
            to_remove -= 1
        stack.append(digit)

    # Remove remaining digits from end
    stack = stack[:len(stack) - to_remove]

    result = ''.join(stack).lstrip('0')
    return result if result else '0'
```

### Mistake 3: Not handling leading zeros correctly

```python
# Wrong: Leading zeros not removed
def removeKdigits(num, k):
    stack = []
    to_remove = k

    for digit in num:
        while stack and to_remove > 0 and stack[-1] > digit:
            stack.pop()
            to_remove -= 1
        stack.append(digit)

    stack = stack[:len(stack) - to_remove]

    # WRONG: Doesn't remove leading zeros
    result = ''.join(stack)
    return result  # Could return "0123" instead of "123"

# Correct: Strip leading zeros and handle empty case
def removeKdigits(num, k):
    stack = []
    to_remove = k

    for digit in num:
        while stack and to_remove > 0 and stack[-1] > digit:
            stack.pop()
            to_remove -= 1
        stack.append(digit)

    stack = stack[:len(stack) - to_remove]

    # Remove leading zeros
    result = ''.join(stack).lstrip('0')

    # Handle empty result
    return result if result else '0'
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Maximum number | Remove k digits to create maximum number | Medium |
| Add k digits | Add k digits to minimize/maximize number | Hard |
| Remove to palindrome | Remove k digits to form smallest palindrome | Hard |
| Multiple numbers | Remove k total digits from multiple numbers optimally | Hard |
| Lexicographically smallest | Create lex smallest sequence after removals | Medium |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Implement monotonic stack solution
- [ ] Test edge cases (all same digits, increasing, decreasing)
- [ ] Handle leading zeros and empty results
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [Greedy Stack Patterns](../strategies/patterns/greedy.md)
