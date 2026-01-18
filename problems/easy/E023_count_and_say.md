---
id: E023
old_id: F038
slug: count-and-say
title: Count and Say
difficulty: easy
category: easy
topics: ["string", "recursion"]
patterns: ["sequence-generation"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E271", "M443", "E028"]
prerequisites: ["strings", "iteration", "recursion"]
strategy_ref: ../../strategies/fundamentals/recursion.md
---
# Count and Say

## Problem

Generate the nth term of the "count-and-say" sequence, a sequence where each term is formed by reading and describing the previous term. The sequence starts with "1" as the first term, and each subsequent term is created by saying what you see in the previous term.

Here's how it works:
- Term 1: "1" (the base case)
- Term 2: Read "1" aloud: "one 1" → write as "11"
- Term 3: Read "11" aloud: "two 1s" → write as "21"
- Term 4: Read "21" aloud: "one 2, then one 1" → write as "1211"
- Term 5: Read "1211" aloud: "one 1, one 2, two 1s" → write as "111221"

The reading process groups consecutive identical digits and describes each group with its count followed by the digit. For example, "111221" has three 1s, two 2s, then one 1, which becomes "312211". Given an integer n, return the nth term of this sequence as a string.

## Why This Matters

This problem teaches run-length encoding, a fundamental compression technique used in file formats (like PNG images), data transmission, and string algorithms. It builds skills in:

- **Iterative sequence generation**: Building terms one-by-one based on previous results, rather than using a closed-form formula.
- **Character-level string processing**: Scanning through strings to identify patterns and groups of consecutive characters.
- **State tracking**: Maintaining count and current character while iterating through a string.

The pattern of "describe the previous state to generate the next state" appears in many algorithm problems, from encoding algorithms to game state transitions. It's also an interesting mathematical sequence (known as the "look-and-say" sequence) with surprising properties - for instance, the length grows by approximately 30% each iteration.

## Examples

**Example 1:**
- Input: `n = 1`
- Output: `"1"`
- Explanation: This is the base case.

**Example 2:**
- Input: `n = 4`
- Output: `"1211"`
- Explanation: countAndSay(1) = "1"
countAndSay(2) = say "1" = one 1 = "11"
countAndSay(3) = say "11" = two 1's = "21"
countAndSay(4) = say "21" = one 2 + one 1 = "12" + "11" = "1211"

## Constraints

- 1 <= n <= 30

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Building the Sequence</summary>

This sequence is defined iteratively, not by a formula. Each term depends only on the previous term. Start with "1" and build up to the nth term by repeatedly "reading" the current string.

Key insight: How do you "say" a string like "111221"? You count consecutive identical digits: "three 1s, two 2s, one 1" becomes "312211".

</details>

<details>
<summary>🎯 Hint 2: Run-Length Encoding Pattern</summary>

This is essentially run-length encoding applied repeatedly. For each group of consecutive identical characters, output the count followed by the character itself.

Think about: How do you identify where one group ends and another begins? What happens when you reach the end of the string?

</details>

<details>
<summary>📝 Hint 3: Iterative Algorithm</summary>

```
Algorithm:
1. Start with result = "1"
2. For i from 2 to n:
   - Build next string by reading current:
     a. Initialize: count=1, current_char=result[0]
     b. For each character from index 1:
        - If same as current_char: count++
        - Else: append count+current_char to next_result
                reset count=1, current_char=new char
     c. Don't forget to append final group
   - result = next_result
3. Return result

Example trace for n=4:
n=1: "1"
n=2: read "1" → one 1 → "11"
n=3: read "11" → two 1s → "21"
n=4: read "21" → one 2, one 1 → "1211"
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive | O(n × L) | O(n × L) | L = average length of string, grows exponentially |
| **Iterative** | **O(n × L)** | **O(L)** | Build one string at a time |

Note: String length grows roughly by factor of 1.3 each iteration (Conway's constant ≈ 1.303577...)

## Common Mistakes

### 1. Forgetting Final Group
```python
# WRONG: Missing the last group of characters
for i in range(1, len(s)):
    if s[i] == current:
        count += 1
    else:
        result += str(count) + current
        count = 1
        current = s[i]
return result  # Missing last group!

# CORRECT: Append final group after loop
for i in range(1, len(s)):
    # ... same logic
result += str(count) + current  # Don't forget this!
return result
```

### 2. Wrong Order of Count and Digit
```python
# WRONG: Digit before count
result += current + str(count)  # "13" instead of "31"

# CORRECT: Count before digit
result += str(count) + current  # "31" for three 1s
```

### 3. Modifying String In-Place
```python
# WRONG: Trying to build result in the same string
for char in s:
    s += str(count) + char  # Modifying while iterating!

# CORRECT: Use separate variable for result
next_result = ""
for char in s:
    next_result += str(count) + char
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Look and Say Backwards | Decode the sequence | Parse pairs (count, digit) and expand |
| Find Pattern | Detect if sequence contains substring | Generate terms and search |
| Max Digit Count | Find largest count in sequence | Track max during generation |

## Practice Checklist

**Correctness:**
- [ ] Handles n = 1 (base case)
- [ ] Handles small n (2-5)
- [ ] Handles larger n (up to 30)
- [ ] Correctly counts consecutive digits
- [ ] Returns correct string format

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity
- [ ] Can trace through example manually

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement decode variation
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Recursion](../../strategies/fundamentals/recursion.md)
