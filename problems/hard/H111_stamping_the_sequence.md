---
id: H111
old_id: A403
slug: stamping-the-sequence
title: Stamping The Sequence
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Stamping The Sequence

## Problem

You have two strings: `stamp` and `target`. Begin with a string `s` having the same length as `target`, where every character is initially `'?'`.

During each operation, you can position the `stamp` string at any valid location within `s` and overwrite the characters at that position with the characters from `stamp`.

	- For instance, with `stamp = "abc"` and `target = "abcba"`, the initial state is `s = "?????"`. Valid operations include:

    	- Stamping at position `0` transforms `s` to `"abc??"`,
    	- Stamping at position `1` transforms `s` to `"?abc?"`, or
    	- Stamping at position `2` transforms `s` to `"??abc"`.

    The stamp must fit entirely within the string boundaries (you cannot stamp beyond the string's end).

Your goal is to transform `s` into `target` using no more than `10 * target.length` stamping operations.

Return an array containing the starting positions (leftmost index) of each stamp operation in order. If it's impossible to achieve the target within the allowed operations, return an empty array.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `stamp = "abc", target = "ababc"`
- Output: `[0,2]`
- Explanation: Starting with s = "?????".
- Stamp at position 0 yields "abc??".
- Stamp at position 2 yields "ababc".
Other valid sequences like [1,0,2] are also acceptable.

**Example 2:**
- Input: `stamp = "abca", target = "aabcaca"`
- Output: `[3,0,1]`
- Explanation: Starting with s = "???????".
- Stamp at position 3 yields "???abca".
- Stamp at position 0 yields "abcabca".
- Stamp at position 1 yields "aabcaca".

## Constraints

- 1 <= stamp.length <= target.length <= 1000
- stamp and target consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Think backwards! Instead of building the target from "?????", work in reverse: start from the target and replace parts with "?" until you reach all "?". The stamp positions you find in reverse order need to be reversed to get the final answer.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a greedy backward approach. At each step, find positions where you can "unstamp" (replace characters with '?'). A position can be unstamped if it matches the stamp pattern, allowing some characters to already be '?'. Keep track of which characters have been turned into '?' and continue until all characters become '?'. Return the reversed sequence of positions.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
To efficiently check if a position can be unstamped, a match is valid if: (1) at least one character in target matches stamp at that position, and (2) all non-'?' characters in target match stamp. Use a window-based approach to check all possible positions repeatedly until no more progress can be made.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Greedy Backward | O(n * (n + m)) | O(n) | n = target length, m = stamp length; may need multiple passes |
| Optimal | O(n * m) | O(n) | With careful bookkeeping to avoid redundant checks |

## Common Mistakes

1. **Trying to Build Forward**
   ```python
   # Wrong: Forward building is extremely complex
   s = ['?'] * len(target)
   # Trying all possible positions to stamp forward leads to exponential complexity

   # Correct: Work backwards from target
   result = []
   target_list = list(target)
   stamped = [False] * len(target)
   # Reverse the stamping process
   ```

2. **Not Handling Partial Matches**
   ```python
   # Wrong: Requiring exact match with stamp
   if target[i:i+len(stamp)] == stamp:
       # This won't work because some chars might already be '?'

   # Correct: Allow '?' characters in matches
   def can_unstamp(pos):
       for j in range(len(stamp)):
           if target_list[pos + j] != '?' and target_list[pos + j] != stamp[j]:
               return False
       return any(target_list[pos + j] != '?' for j in range(len(stamp)))
   ```

3. **Forgetting the 10x Limit Check**
   ```python
   # Wrong: Not checking operation count
   while not all_questions(target_list):
       # Could exceed 10 * len(target) operations

   # Correct: Track and validate operation count
   if len(result) > 10 * len(target):
       return []
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| String Building with Pattern | Medium | Forward construction instead of backward deconstruction |
| Minimum Stamps to Form String | Hard | Optimize for minimum operations vs finding any valid sequence |
| Pattern Matching with Wildcards | Medium | Similar matching logic but different objective |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
