---
id: M281
old_id: A083
slug: design-compressed-string-iterator
title: Design Compressed String Iterator
difficulty: medium
category: medium
topics: ["string", "design"]
patterns: ["iterator-pattern", "state-machine"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: E100
    name: String Compression
    difficulty: easy
  - id: M150
    name: Decode String
    difficulty: medium
  - id: M200
    name: Design Add and Search Words Data Structure
    difficulty: medium
prerequisites:
  - concept: Iterator design pattern
    level: intermediate
  - concept: String parsing
    level: basic
  - concept: State management
    level: basic
---
# Design Compressed String Iterator

## Problem

Design an iterator that processes compressed strings, where the compression format encodes repeated characters efficiently. In this format, a character is immediately followed by a number indicating how many times it appears. For example, "a3b2c1" represents "aaabbc" - the character 'a' repeated 3 times, 'b' repeated 2 times, and 'c' repeated once.

Your task is to create a StringIterator class that behaves like a standard iterator, allowing character-by-character access to the decompressed string without actually expanding the entire string in memory. This is crucial because the count can be as large as 10^9, making full decompression impractical.

The class must support two key operations:

- `next()` returns the next character in the decompressed sequence, advancing the internal state. If all characters have been consumed, return a space character (' ').
- `hasNext()` returns true if there are still characters remaining in the sequence, false otherwise.

The challenge lies in maintaining state efficiently. You need to track which character you're currently iterating through, how many times it still needs to be returned, and when to move to the next character-count pair in the compressed string. Think about parsing the compressed format incrementally rather than all at once, especially given that counts can reach 10^9.

## Why This Matters

This problem exemplifies the iterator design pattern, a fundamental concept in software engineering used in nearly every programming language's standard library. Iterators allow uniform access to collection elements without exposing underlying implementation details. Beyond pattern recognition, this problem teaches lazy evaluation - processing data on-demand rather than eagerly, which is essential for handling large datasets that don't fit in memory. Real-world applications include streaming log file processors, network protocol handlers that parse compressed data streams, and text editors that work with massive files. The combination of string parsing, state management, and efficient memory usage makes this excellent preparation for system design interviews.

## Constraints

- 1 <= compressedString.length <= 1000
- compressedString consists of lower-case an upper-case English letters and digits.
- The number of a single character repetitions in compressedString is in the range [1, 10^9]
- At most 100 calls will be made to next and hasNext.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Parse and Store Character-Count Pairs</summary>

Parse the compressed string during initialization to extract character-count pairs. Two approaches:

**Approach A: Parse all pairs upfront**
```python
class StringIterator:
    def __init__(self, compressedString: str):
        self.pairs = []  # [(char, count), ...]
        i = 0
        while i < len(compressedString):
            char = compressedString[i]
            i += 1
            count = 0
            while i < len(compressedString) and compressedString[i].isdigit():
                count = count * 10 + int(compressedString[i])
                i += 1
            self.pairs.append((char, count))
        self.pair_idx = 0
        self.count_remaining = self.pairs[0][1] if self.pairs else 0
```

**Approach B: Parse on-demand** (more memory efficient for large counts)
</details>

<details>
<summary>Hint 2: Maintain State for Current Character</summary>

Track which character you're currently iterating through and how many times it remains:

```python
class StringIterator:
    def __init__(self, compressedString: str):
        self.s = compressedString
        self.ptr = 0  # Current position in compressed string
        self.current_char = ' '
        self.current_count = 0

    def _advance_to_next_char(self):
        """Parse next character and its count"""
        if self.ptr >= len(self.s):
            return False

        self.current_char = self.s[self.ptr]
        self.ptr += 1

        count = 0
        while self.ptr < len(self.s) and self.s[self.ptr].isdigit():
            count = count * 10 + int(self.s[self.ptr])
            self.ptr += 1

        self.current_count = count
        return True
```
</details>

<details>
<summary>Hint 3: Implement next() and hasNext() Methods</summary>

Use the state maintained to implement the required methods:

```python
class StringIterator:
    def __init__(self, compressedString: str):
        self.s = compressedString
        self.ptr = 0
        self.current_char = ' '
        self.current_count = 0
        self._load_next()

    def _load_next(self):
        """Load next character segment"""
        if self.ptr >= len(self.s):
            self.current_char = ' '
            self.current_count = 0
            return

        self.current_char = self.s[self.ptr]
        self.ptr += 1

        count_str = ''
        while self.ptr < len(self.s) and self.s[self.ptr].isdigit():
            count_str += self.s[self.ptr]
            self.ptr += 1

        self.current_count = int(count_str)

    def next(self) -> str:
        if not self.hasNext():
            return ' '

        result = self.current_char
        self.current_count -= 1

        if self.current_count == 0:
            self._load_next()

        return result

    def hasNext(self) -> bool:
        return self.current_count > 0
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Parse All Upfront | O(k) init, O(1) next/hasNext | O(k) | k = number of unique char segments |
| On-Demand Parsing | O(1) init, O(1) next/hasNext | O(1) | More space efficient |

**Detailed Analysis:**
- **Time**:
  - `next()`: O(1) average, O(log count) worst case when parsing new count
  - `hasNext()`: O(1)
- **Space**: O(k) where k is number of character-count pairs (can be O(1) with on-demand parsing)
- **Key Insight**: Lazy evaluation avoids storing large counts in memory

## Common Mistakes

### Mistake 1: Not handling multi-digit counts correctly
```python
# Wrong: Only reading single digit
count = int(compressedString[i])

# Correct: Parse full number
count = 0
while i < len(compressedString) and compressedString[i].isdigit():
    count = count * 10 + int(compressedString[i])
    i += 1
```

### Mistake 2: Forgetting to advance to next character when count reaches 0
```python
# Wrong: Not loading next character
def next(self):
    if self.current_count > 0:
        self.current_count -= 1
        return self.current_char
    return ' '

# Correct: Load next segment when current exhausted
def next(self):
    result = self.current_char
    self.current_count -= 1
    if self.current_count == 0:
        self._load_next()
    return result
```

### Mistake 3: Incorrect hasNext() implementation
```python
# Wrong: Not checking if characters remain
def hasNext(self):
    return self.ptr < len(self.s)

# Correct: Check current count
def hasNext(self):
    return self.current_count > 0
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| String Compression | Design encoder for the compressed format | Easy |
| Run-Length Encoding Iterator | Support both encode and decode operations | Medium |
| Compressed String Indexing | Support random access by index | Medium |
| Two-Way Iterator | Support both next() and previous() | Medium |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] **Initial Attempt** - Solve independently (30 min limit)
- [ ] **Solution Study** - If stuck, study one approach deeply
- [ ] **Implementation** - Code solution from scratch without reference
- [ ] **Optimization** - Achieve O(1) next/hasNext operations
- [ ] **Edge Cases** - Test: empty string, single character, large counts (10^9)
- [ ] **Variations** - Solve at least 2 related problems
- [ ] **Spaced Repetition** - Re-solve after: 1 day, 1 week, 1 month

**Mastery Goal**: Solve in < 20 minutes with clean OOP design.

**Strategy**: See [Iterator Pattern](../strategies/patterns/design-patterns.md) and [String Parsing](../strategies/patterns/string-manipulation.md)
