---
id: E104
old_id: I070
slug: encode-and-decode-strings
title: Encode and Decode Strings
difficulty: easy
category: easy
topics: ["string", "design"]
patterns: ["string-encoding"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M271", "M443", "E535"]
prerequisites: ["string-manipulation", "delimiter-handling"]
strategy_ref: ../strategies/patterns/string-manipulation.md
---
# Encode and Decode Strings

## Problem

Design an algorithm to serialize a list of strings into a single string, and deserialize it back to the original list. This simulates sending a collection of strings over a network where you can only transmit a single string, then reconstructing the original collection on the receiving end.

The challenge is that strings can contain any characters from the 256 ASCII character set, including special characters, spaces, and even control characters. This means simple delimiter-based approaches (like separating strings with a pipe "|" character) fail when the delimiter itself appears inside a string. For example, if your strings are ["a|b", "c"] and you use "|" as delimiter, encoding produces "a|b|c", which decodes incorrectly as ["a", "b", "c"].

The robust solution is "length-prefix encoding": before each string, write its length followed by a delimiter (like "#"), then the actual string content. For example, ["Hello", "World"] becomes "5#Hello5#World". When decoding, read the length, skip the delimiter, extract exactly that many characters, and repeat. This works regardless of what characters appear inside the strings because you know exactly how many characters to read.

## Why This Matters

This problem teaches data serialization, a fundamental concept in computer science. Every time data is transmitted over networks, saved to files, or passed between systems, it must be serialized. Understanding why simple delimiters fail and how length-prefixing solves the problem gives you insight into protocols like HTTP (which uses Content-Length headers), binary formats (which often use length prefixes), and data encoding schemes. The pattern of "metadata before data" appears everywhere: database records, network packets, file formats, and memory structures. This problem also demonstrates defensive programming: handling edge cases like empty strings, special characters, and boundary conditions that break naive solutions. These skills are essential for building reliable systems and acing design-focused interview questions.

## Examples

**Example 1:**
- Input: `dummy_input = ["Hello","World"]`
- Output: `["Hello","World"]`
- Explanation: Machine 1:
Codec encoder = new Codec();
String msg = encoder.encode(strs);
Machine 1 ---msg---> Machine 2

Machine 2:
Codec decoder = new Codec();
String[] strs = decoder.decode(msg);

**Example 2:**
- Input: `dummy_input = [""]`
- Output: `[""]`

## Constraints

- 1 <= strs.length <= 200
- 0 <= strs[i].length <= 200
- strs[i] contains any possible characters out of 256 valid ASCII characters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Simple Delimiter Won't Work</summary>

You might think of using a special delimiter like "|" to separate strings: "Hello|World". But what if a string contains "|"? Any single character delimiter can appear in the input strings, making it impossible to distinguish. You need a more robust encoding scheme.

</details>

<details>
<summary>🎯 Hint 2: Length-Prefix Encoding</summary>

Instead of using delimiters, prefix each string with its length. For example: "5#Hello5#World". When decoding, read the length, then read that many characters. This works even if strings contain any special characters. The format: length + delimiter + actual_string.

</details>

<details>
<summary>📝 Hint 3: Implementation with Length Prefix</summary>

Pseudocode:
Encode:
- For each string s:
  - Append: str(len(s)) + "#" + s
- Return concatenated result

Decode:
- result = []
- i = 0
- While i < len(encoded):
  - Find '#' starting from i
  - length = int(encoded[i:hash_pos])
  - Extract string of that length
  - Add to result
  - Move i forward
- Return result

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Escape Special Chars | O(n × m) | O(n × m) | Complex escaping logic |
| **Length-Prefix** | **O(n × m)** | **O(n × m)** | n strings, m avg length; simple & robust |
| JSON Serialization | O(n × m) | O(n × m) | Cheating (prohibited) |

## Common Mistakes

### Mistake 1: Using Simple Delimiter Without Handling Edge Cases

```python
# WRONG: Fails when strings contain the delimiter
def encode(strs):
    return "|".join(strs)  # Bug: what if strs = ["a|b", "c"]?

def decode(s):
    return s.split("|")  # Returns ["a", "b", "c"] instead of ["a|b", "c"]
```

```python
# CORRECT: Use length-prefix encoding
def encode(strs):
    return "".join(f"{len(s)}#{s}" for s in strs)
    # ["a|b", "c"] -> "3#a|b1#c"

def decode(s):
    result, i = [], 0
    while i < len(s):
        j = s.index('#', i)  # Find delimiter
        length = int(s[i:j])
        result.append(s[j+1:j+1+length])
        i = j + 1 + length
    return result  # Correctly returns ["a|b", "c"]
```

### Mistake 2: Not Handling Empty Strings

```python
# WRONG: Empty strings break the split logic
def encode(strs):
    return "#".join(strs)  # Bug: ["a", "", "b"] -> "a##b"

def decode(s):
    return s.split("#")  # Returns ["a", "", "b"] - accidentally works!
    # But fails for ["", ""] -> "#" -> splits to ["", ""]
    # Actually this specific case works, but fragile
```

```python
# CORRECT: Length-prefix handles empty strings naturally
def encode(strs):
    return "".join(f"{len(s)}#{s}" for s in strs)
    # ["a", "", "b"] -> "1#a0#1#b"

def decode(s):
    result, i = [], 0
    while i < len(s):
        j = s.index('#', i)
        length = int(s[i:j])
        if length == 0:
            result.append("")  # Explicit empty string
        else:
            result.append(s[j+1:j+1+length])
        i = j + 1 + length
    return result
```

### Mistake 3: Integer Parsing Error

```python
# WRONG: Not handling multi-digit lengths correctly
def decode(s):
    result, i = [], 0
    while i < len(s):
        length = int(s[i])  # Bug: only reads single digit!
        # "10#abcdefghij" would parse "1" instead of "10"
        result.append(s[i+2:i+2+length])
        i = i + 2 + length
    return result
```

```python
# CORRECT: Find '#' to extract full length number
def decode(s):
    result, i = [], 0
    while i < len(s):
        j = s.index('#', i)  # Find '#' delimiter
        length = int(s[i:j])  # Parse entire number
        result.append(s[j+1:j+1+length])
        i = j + 1 + length
    return result
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Serialize and Deserialize Binary Tree | Medium | Encode tree structure, not just strings |
| String Compression | Easy | Compress repeated characters |
| Design TinyURL | Medium | Encode/decode URLs with short keys |
| Count and Say | Medium | Generate encoding sequences |

## Practice Checklist

- [ ] Day 1: Solve with length-prefix encoding (20 min)
- [ ] Day 2: Handle edge cases (empty strings, special chars) (15 min)
- [ ] Day 7: Solve again, explain why delimiter fails (10 min)
- [ ] Day 14: Code from memory (10 min)
- [ ] Day 30: Solve tree serialization variant (30 min)

**Strategy**: See [String Manipulation Pattern](../strategies/patterns/string-manipulation.md)
