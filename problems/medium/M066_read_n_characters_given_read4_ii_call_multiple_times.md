---
id: M066
old_id: F158
slug: read-n-characters-given-read4-ii-call-multiple-times
title: Read N Characters Given read4 II - Call Multiple Times
difficulty: medium
category: medium
topics: ["string", "design"]
patterns: ["buffer-management", "state-machine"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E157", "M535", "M271"]
prerequisites: ["string", "buffer", "state-management"]
strategy_ref: ../strategies/fundamentals/problem-solving.md
---
# Read N Characters Given read4 II - Call Multiple Times

## Problem

You have access to a file reading API that provides a method read4(buf) which reads up to 4 characters from a file into a buffer and returns the number of characters actually read (less than 4 means end of file). Your task is to implement a read(buf, n) method that reads exactly n characters from the file using this read4 API, and this read method will be called multiple times on the same file. The challenge is managing state between calls: if read4 returns 4 characters but you only need 2 for the current read call, you must buffer the remaining 2 characters for the next read call. For example, if the file contains "abcdefgh" and you call read(buf, 3) then read(buf, 2) then read(buf, 3), the first call should return "abc", the second should return "de", and the third should return "fgh". The internal buffer persists across calls, storing leftover characters from previous read4 calls that weren't consumed. You need to track the buffer contents, the current position in the buffer, and how many valid characters remain buffered. Edge cases include requests for more characters than remain in the file, requests smaller than the buffered amount, and reaching end of file partway through a read call.

## Why This Matters

This problem models real operating system buffer management where system calls like read() operate on fixed-size blocks from disk or network but applications request arbitrary amounts of data. Web servers use buffered reading when streaming HTTP responses, reading from sockets in chunks but serving exact byte ranges to clients. Video streaming services implement this pattern when buffering video packets that arrive in fixed network frames but need to be delivered in precise segments to players. Text editors use persistent buffers when reading large files incrementally as users scroll, maintaining state about what's been read. Database systems implement this when reading pages from disk in fixed blocks but returning variable-length records to queries. The state management aspect teaches you about designing stateful APIs and object-oriented encapsulation, skills essential for building file system abstractions, network protocol handlers, and any system that bridges between fixed-size I/O operations and variable-size application requests.

## Examples

**Example 1:**
- Input: `file = "abc", queries = [1,2,1]`
- Output: `[1,2,0]`
- Explanation: The test case represents the following scenario:
File file("abc");
Solution sol;
sol.read(buf, 1); // After calling your read method, buf should contain "a". We read a total of 1 character from the file, so return 1.
sol.read(buf, 2); // Now buf should contain "bc". We read a total of 2 characters from the file, so return 2.
sol.read(buf, 1); // We have reached the end of file, no more characters can be read. So return 0.
Assume buf is allocated and guaranteed to have enough space for storing all characters from the file.

**Example 2:**
- Input: `file = "abc", queries = [4,1]`
- Output: `[3,0]`
- Explanation: The test case represents the following scenario:
File file("abc");
Solution sol;
sol.read(buf, 4); // After calling your read method, buf should contain "abc". We read a total of 3 characters from the file, so return 3.
sol.read(buf, 1); // We have reached the end of file, no more characters can be read. So return 0.

## Constraints

- 1 <= file.length <= 500
- file consist of English letters and digits.
- 1 <= queries.length <= 10
- 1 <= queries[i] <= 500

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Why State Management?</summary>

Unlike the simpler version where you read once, this problem requires multiple calls to read(). The challenge is that read4() always reads 4 characters (or fewer at EOF), but you might need fewer than 4 characters in a given call. You need to buffer leftover characters for the next call.

</details>

<details>
<summary>🎯 Hint 2: Buffer Design</summary>

Maintain an internal buffer that persists between calls:
- When read() is called, first use any buffered characters from previous calls
- Then call read4() to get more characters as needed
- If read4() returns more than needed, store extras in buffer
- Track buffer content and current position in buffer

Think of it like a queue of characters waiting to be consumed.

</details>

<details>
<summary>📝 Hint 3: Implementation Structure</summary>

**Class state (persists between calls):**
```
buffer4 = char[4]  // Internal buffer for read4
buffPtr = 0        // Current position in buffer
buffCnt = 0        // How many valid chars in buffer
```

**read(buf, n) algorithm:**
```
idx = 0  // Position in output buf

while idx < n:
    if buffPtr == 0:  // Buffer empty, need more data
        buffCnt = read4(buffer4)

    if buffCnt == 0:  // EOF reached
        break

    // Copy from buffer to output
    while idx < n and buffPtr < buffCnt:
        buf[idx] = buffer4[buffPtr]
        idx++
        buffPtr++

    if buffPtr == buffCnt:  // Used all buffered chars
        buffPtr = 0

return idx
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Buffered State** | **O(n)** | **O(1)** | Small internal buffer, optimal |
| Without buffer | O(n) | O(n) | Would need to track all remaining chars |

## Common Mistakes

### 1. Not Maintaining State Between Calls
```python
# WRONG: Resets buffer every call
class Solution:
    def read(self, buf, n):
        buffer4 = [None] * 4  # Wrong! Should be instance variable
        idx = 0
        while idx < n:
            count = read4(buffer4)
            # ...
```

```python
# CORRECT: Persistent buffer state
class Solution:
    def __init__(self):
        self.buffer4 = [None] * 4
        self.buffPtr = 0
        self.buffCnt = 0

    def read(self, buf, n):
        idx = 0
        while idx < n:
            # Use persistent buffer
```

### 2. Not Handling Partial Buffer Usage
```python
# WRONG: Always reads new data, ignores leftover buffer
class Solution:
    def __init__(self):
        self.buffer4 = [None] * 4

    def read(self, buf, n):
        idx = 0
        while idx < n:
            count = read4(self.buffer4)  # Always reads new!
            # Loses leftover characters from previous call
```

```python
# CORRECT: Check buffer first before reading
class Solution:
    def __init__(self):
        self.buffer4 = [None] * 4
        self.buffPtr = 0
        self.buffCnt = 0

    def read(self, buf, n):
        idx = 0
        while idx < n:
            if self.buffPtr == 0:  # Only read if buffer empty
                self.buffCnt = read4(self.buffer4)
            # ...
```

### 3. Not Resetting Buffer Pointer
```python
# WRONG: Doesn't reset pointer when buffer exhausted
while idx < n and self.buffPtr < self.buffCnt:
    buf[idx] = self.buffer4[self.buffPtr]
    idx += 1
    self.buffPtr += 1
# If buffPtr == buffCnt, should reset to 0!
```

```python
# CORRECT: Reset pointer for next read4 call
while idx < n and self.buffPtr < self.buffCnt:
    buf[idx] = self.buffer4[self.buffPtr]
    idx += 1
    self.buffPtr += 1

if self.buffPtr == self.buffCnt:
    self.buffPtr = 0  # Ready for next read4
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| read4 once only | Simple version without state | No internal buffer needed |
| Seekable file | Support seek(position) | Reset buffer when seeking |
| Multiple buffers | K different files | Maintain separate buffer state for each |
| Async read | Non-blocking reads | Add ready/pending state tracking |

## Practice Checklist

- [ ] Handles n < 4 requests
- [ ] Handles n > 4 requests
- [ ] Handles multiple small reads in sequence
- [ ] Handles EOF correctly
- [ ] Can explain buffer state transitions
- [ ] Can handle queries = [1,1,1,...] pattern
- [ ] Can code solution in 20 min
- [ ] Can discuss time/space complexity

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Problem Solving Fundamentals](../../strategies/fundamentals/problem-solving.md)
