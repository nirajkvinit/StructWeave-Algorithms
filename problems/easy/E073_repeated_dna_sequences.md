---
id: E073
old_id: F177
slug: repeated-dna-sequences
title: Repeated DNA Sequences
difficulty: easy
category: easy
topics: ["string", "hash-table", "sliding-window", "bit-manipulation"]
patterns: ["sliding-window", "rolling-hash"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E028", "M030", "M076"]
prerequisites: ["hash-sets", "sliding-window", "strings"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Repeated DNA Sequences

## Problem

DNA sequences are represented as strings composed of four nucleotide characters: 'A' (adenine), 'C' (cytosine), 'G' (guanine), and 'T' (thymine). For example, "ACGAATTCCG" is a valid DNA sequence.

When analyzing genetic data, researchers often need to identify repeated patterns. Given a DNA string `s`, find all 10-character-long sequences (substrings) that appear more than once in the molecule.

For instance, in the sequence "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT", the pattern "AAAAACCCCC" appears at positions 0 and 12, while "CCCCCAAAAA" appears at positions 5 and 13.

Return a list of all 10-letter sequences that occur multiple times. Each sequence should appear only once in your result, regardless of how many times it repeats in the input.

**Key considerations:**
- The sequence length is always exactly 10 characters
- Only four possible characters exist (A, C, G, T)
- Overlapping occurrences count as separate instances
- Empty result if no sequences repeat

## Why This Matters

This problem teaches pattern matching in biological data, a cornerstone of bioinformatics. The same techniques apply to:
- **DNA sequencing**: Identifying genetic markers and mutations in genomic research
- **Plagiarism detection**: Finding repeated text passages in documents
- **Network security**: Detecting repeated packet patterns in intrusion detection systems
- **Data compression**: Finding redundant patterns to optimize storage

Beyond the application, this builds your intuition for sliding window techniques and hash-based frequency tracking, which appear in countless string processing scenarios. The optimization challenge of handling large DNA datasets efficiently mirrors real computational biology constraints.

## Examples

**Example 1:**
- Input: `s = "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"`
- Output: `["AAAAACCCCC","CCCCCAAAAA"]`

**Example 2:**
- Input: `s = "AAAAAAAAAAAAA"`
- Output: `["AAAAAAAAAA"]`

## Constraints

- 1 <= s.length <= 10⁵
- s[i] is either 'A', 'C', 'G', or 'T'.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Sliding Window + Hash Set</summary>

You need to check all 10-letter substrings in the DNA sequence.

Think about using a sliding window:
- Start at position 0, extract substring of length 10
- Move to position 1, extract next substring of length 10
- Continue until end of string

To track which sequences appear more than once, use:
- One set to remember sequences you've seen
- Another set to store sequences that appear more than once

How many 10-letter windows are there in a string of length n? Answer: n - 9 windows.

</details>

<details>
<summary>🎯 Hint 2: Optimize with Hash Set</summary>

Algorithm:
1. Use a hash set `seen` to track sequences encountered once
2. Use a hash set `repeated` to store sequences seen more than once
3. Slide a window of size 10 across the string:
   - Extract current 10-letter substring
   - If in `seen` but not in `repeated`: add to `repeated`
   - If not in `seen`: add to `seen`

Why two sets? To avoid adding duplicates to the result if a sequence appears 3+ times.

Time: O(n), Space: O(n) where n is string length

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

**Hash Set Approach:**
```
1. Initialize seen = empty set
2. Initialize repeated = empty set
3. For i from 0 to len(s) - 10:
   a. sequence = s[i:i+10]  (10-letter substring)
   b. If sequence in seen:
      - Add to repeated
   c. Else:
      - Add to seen
4. Return list(repeated)
```

Example: "AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"
- i=0: "AAAAACCCCC" → add to seen
- i=1: "AAAACCCCCA" → add to seen
- ...
- i=6: "CCCCCAAAAA" → add to seen
- ...
- i=12: "AAAAACCCCC" → already in seen, add to repeated
- ...

**Advanced: Bit Manipulation (Optional)**
Since DNA has only 4 characters (A, C, G, T), you can encode:
- A = 00, C = 01, G = 10, T = 11 (2 bits each)
- 10 letters = 20 bits total
- Use integer hash instead of string (faster comparison)

Time: O(n), Space: O(n)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n² × k) | O(n) | Compare all pairs of substrings (k=10) |
| **Hash Set** | **O(n × k)** | **O(n)** | Slide window, hash substring (k=10) |
| Bit Manipulation Hash | O(n) | O(n) | Encode DNA as bits, O(1) hash |

Note: For this problem k=10 is constant, so O(n×k) = O(n)

## Common Mistakes

### 1. Using Only One Set
```python
# WRONG: Adding to result every time we see duplicate
seen = set()
result = []
for i in range(len(s) - 9):
    seq = s[i:i+10]
    if seq in seen:
        result.append(seq)  # Can add same sequence multiple times!
    seen.add(seq)

# CORRECT: Use two sets to avoid duplicates
seen = set()
repeated = set()
for i in range(len(s) - 9):
    seq = s[i:i+10]
    if seq in seen:
        repeated.add(seq)  # Set prevents duplicates
    seen.add(seq)
return list(repeated)
```

### 2. Incorrect Window Boundary
```python
# WRONG: Off-by-one error
for i in range(len(s) - 10):  # Misses last valid window
    seq = s[i:i+10]

# CORRECT: Include all valid 10-letter windows
for i in range(len(s) - 9):  # or range(len(s) - 10 + 1)
    seq = s[i:i+10]
```

### 3. Not Checking String Length
```python
# WRONG: Doesn't handle strings shorter than 10
for i in range(len(s) - 9):
    seq = s[i:i+10]
# Breaks if len(s) < 10

# CORRECT: Guard against short strings
if len(s) < 10:
    return []
for i in range(len(s) - 9):
    seq = s[i:i+10]
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Different sequence length | Find k-letter sequences | Change window size to k |
| Minimum repetitions | Find sequences appearing ≥m times | Use counter instead of sets |
| Overlapping sequences | Count overlapping occurrences | Same approach works |
| Longest repeated substring | Find longest substring appearing twice | Binary search + sliding window |

## Practice Checklist

**Correctness:**
- [ ] Handles minimum length string (len=10)
- [ ] Handles string with no repeats
- [ ] Handles string with multiple repeats of same sequence
- [ ] Handles sequences appearing 3+ times (no duplicates in output)
- [ ] Returns empty list when appropriate
- [ ] Handles maximum length string (10⁵)

**Interview Readiness:**
- [ ] Can explain sliding window approach
- [ ] Can code solution in 8 minutes
- [ ] Can explain two-set technique
- [ ] Can discuss bit manipulation optimization
- [ ] Can extend to different sequence lengths

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement bit manipulation version
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Sliding Window Pattern](../../strategies/patterns/sliding-window.md)
