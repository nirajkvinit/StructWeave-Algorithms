---
id: E030
old_id: F066
slug: plus-one
title: Plus One
difficulty: easy
category: easy
topics: ["array", "math"]
patterns: ["digit-manipulation", "carry-propagation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M001", "E055", "M066"]
prerequisites: ["arrays-basics", "basic-arithmetic"]
---

# Plus One

## Problem

Given a large integer represented as an array of digits, add one to that number and return the result as an array. The digits are stored in big-endian order, meaning the most significant digit comes first (leftmost position).

For example, the array [1, 2, 3] represents the number 123. If you add one to it, you get 124, which should be returned as [1, 2, 4]. The array contains no leading zeros except when representing the number 0 itself.

The challenging aspect of this problem is handling carry propagation. When the last digit is 9, adding one produces 10, requiring you to set that digit to 0 and carry 1 to the next position. This carry can cascade through multiple positions, and in the extreme case where all digits are 9 (like [9, 9, 9]), you need to add a new leading digit to represent the result ([1, 0, 0, 0] for 1000).

You must solve this without converting the array to an integer, as the array can contain up to 100 digits, which would overflow standard integer types.

```
Example visualization:
digits: [1, 2, 3]  represents 123
result: [1, 2, 4]  represents 124

digits: [9, 9, 9]  represents 999
result: [1, 0, 0, 0]  represents 1000
```

## Why This Matters

This problem teaches essential array manipulation and carry propagation:
- **Digit-by-digit processing**: Working with numbers too large for native types
- **Carry handling**: Understanding overflow and propagation
- **In-place vs new array**: Memory efficiency trade-offs

**Real-world applications:**
- Arbitrary precision arithmetic (BigInteger libraries)
- Financial systems handling large monetary values
- Version number incrementing (semver auto-updates)
- Incrementing database IDs stored as digit arrays

## Examples

**Example 1:**
- Input: `digits = [1,2,3]`
- Output: `[1,2,4]`
- Explanation: The array represents the integer 123. Incrementing by one gives 123 + 1 = 124. Thus, the result should be [1,2,4].

**Example 2:**
- Input: `digits = [4,3,2,1]`
- Output: `[4,3,2,2]`
- Explanation: The array represents the integer 4321. Incrementing by one gives 4321 + 1 = 4322. Thus, the result should be [4,3,2,2].

**Example 3:**
- Input: `digits = [9]`
- Output: `[1,0]`
- Explanation: The array represents the integer 9. Incrementing by one gives 9 + 1 = 10. Thus, the result should be [1,0].

**Example 4:**
- Input: `digits = [9,9,9]`
- Output: `[1,0,0,0]`
- Explanation: 999 + 1 = 1000. Carry propagates through all digits, requiring a new leading digit.

## Constraints

- 1 <= digits.length <= 100
- 0 <= digits[i] <= 9
- digits does not contain any leading 0's.

## Think About

1. When do you need to carry over to the next digit?
2. What's special about the case where all digits are 9?
3. Can you solve this without converting to an integer?
4. Should you traverse from left to right or right to left?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Start from the right</summary>

Think about how you add numbers by hand: you start from the rightmost digit (least significant).

When you add 1 to the last digit:
- If it's 0-8: increment it and you're done
- If it's 9: it becomes 0, and you carry 1 to the left

**Think about:**
- What direction should you iterate through the array?
- When can you stop early?
- What happens if you carry all the way to the start?

</details>

<details>
<summary>🎯 Hint 2: The carry propagation pattern</summary>

Adding 1 is like adding with a carry that starts at 1:

```
digits: [9, 9, 9]
         ↑  ↑  ↑
Step 1:  9  9  9+1=10 → digit=0, carry=1
Step 2:  9  9+1=10  0 → digit=0, carry=1
Step 3:  9+1=10  0  0 → digit=0, carry=1
Step 4:  carry still 1 → prepend [1]
Result: [1, 0, 0, 0]
```

**Key insights:**
- Only continue if current digit is 9
- If digit < 9, increment and return immediately
- If carry reaches the start, prepend 1

</details>

<details>
<summary>📝 Hint 3: Algorithm pseudocode</summary>

```
iterate from right to left (i = length-1 down to 0):
    if digits[i] < 9:
        digits[i] += 1
        return digits  # Done! No more carry

    # Current digit is 9, becomes 0
    digits[i] = 0

# If we reach here, all digits were 9
# Example: [9,9,9] → [0,0,0] → need [1,0,0,0]
prepend 1 to the front
return [1] + digits
```

**Alternative approach:**
```
# More explicit carry tracking
carry = 1
for i from right to left:
    sum = digits[i] + carry
    digits[i] = sum % 10
    carry = sum // 10

    if carry == 0:
        return digits  # Early exit

if carry == 1:
    prepend 1 to array
return digits
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Convert to int, add, convert back | O(n) | O(n) | Simple but integer overflow |
| **Digit-by-digit (optimal)** | **O(n)** | **O(1)** | Handles arbitrary length |
| Create new array always | O(n) | O(n) | Simpler code, more memory |

**Why digit-by-digit wins:**
- No overflow concerns (handles 100+ digit numbers)
- Often O(1) average case: exits early if rightmost digit < 9
- In-place modification when possible

**Best case:** O(1) when last digit < 9 (e.g., [1,2,3] → [1,2,4])
**Worst case:** O(n) when all 9s (e.g., [9,9,9] → [1,0,0,0])

---

## Common Mistakes

### 1. Converting to integer (overflow)
```python
# WRONG: Fails for large inputs (100 digits!)
num = int(''.join(map(str, digits)))
num += 1
return [int(d) for d in str(num)]
# This violates the spirit of the problem and fails constraints

# CORRECT: Process digit by digit
for i in range(len(digits)-1, -1, -1):
    if digits[i] < 9:
        digits[i] += 1
        return digits
    digits[i] = 0
return [1] + digits
```

### 2. Iterating left to right
```python
# WRONG: Can't easily handle carry from right
for i in range(len(digits)):
    digits[i] += 1  # Where does the 1 come from on later digits?

# CORRECT: Start from the right (least significant)
for i in range(len(digits)-1, -1, -1):
    # Process carry naturally
```

### 3. Forgetting the all-9s case
```python
# WRONG: Doesn't handle [9,9,9]
for i in range(len(digits)-1, -1, -1):
    if digits[i] < 9:
        digits[i] += 1
        return digits
    digits[i] = 0
# Forgot to handle remaining carry!

# CORRECT: Handle final carry
for i in range(len(digits)-1, -1, -1):
    if digits[i] < 9:
        digits[i] += 1
        return digits
    digits[i] = 0
return [1] + digits  # Prepend 1 for carry
```

### 4. Inefficient array prepending
```python
# WRONG: Inefficient in many languages
digits.insert(0, 1)  # O(n) shift in most languages

# BETTER: Create new array
return [1] + digits  # More efficient in Python
# Or: new_array = [1]; new_array.extend(digits)
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Plus K** | Add arbitrary number K | Track carry = K initially, propagate |
| **Subtract one** | Decrement instead | Handle borrow instead of carry |
| **Add two arrays** | Two digit arrays | Similar to M001 (Add Two Numbers) |
| **Multiply by K** | Multiply instead of add | Long multiplication algorithm |
| **Reverse order** | Least significant first | Easier! Start from index 0 |

**Plus K variation:**
```python
def plusK(digits, k):
    carry = k
    for i in range(len(digits)-1, -1, -1):
        total = digits[i] + carry
        digits[i] = total % 10
        carry = total // 10
        if carry == 0:
            return digits

    # Convert remaining carry to digits
    result = []
    while carry:
        result.append(carry % 10)
        carry //= 10
    return result[::-1] + digits
```

---

## Visual Walkthrough

```
Example: [9, 9, 9] + 1

Initial: [9, 9, 9]
                ↑ (start here)

Step 1: i=2 (rightmost)
  digits[2] = 9
  9 == 9, so set to 0
  [9, 9, 0]
  carry continues

Step 2: i=1 (middle)
  digits[1] = 9
  9 == 9, so set to 0
  [9, 0, 0]
  carry continues

Step 3: i=0 (leftmost)
  digits[0] = 9
  9 == 9, so set to 0
  [0, 0, 0]
  carry continues

Step 4: Loop ended, carry still exists
  Prepend 1
  [1, 0, 0, 0]

Result: [1, 0, 0, 0]
```

```
Example: [1, 2, 8] + 1

Initial: [1, 2, 8]
                ↑ (start here)

Step 1: i=2 (rightmost)
  digits[2] = 8
  8 < 9, so increment
  [1, 2, 9]
  return immediately (no carry)

Result: [1, 2, 9]
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles simple case (e.g., [1,2,3] → [1,2,4])
- [ ] Handles single digit 9 (e.g., [9] → [1,0])
- [ ] Handles all 9s (e.g., [9,9,9] → [1,0,0,0])
- [ ] Handles carry in middle (e.g., [1,9,9] → [2,0,0])
- [ ] Doesn't modify input if creating new array

**Optimization:**
- [ ] O(n) time complexity achieved
- [ ] O(1) space (or justified why O(n))
- [ ] Early exit when no carry

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 5 minutes
- [ ] Can discuss variations (plus K, subtract one)
- [ ] Identified edge cases without prompting

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve plus K variation
- [ ] Day 14: Explain to someone else
- [ ] Day 30: Quick review

---

**Strategy**: See [Array Manipulation](../../strategies/data-structures/arrays.md) | [Digit Processing](../../strategies/fundamentals/digit-processing.md)
