---
id: M102
old_id: I051
slug: flatten-2d-vector
title: Flatten 2D Vector
difficulty: medium
category: medium
topics: ["design", "array", "iterator"]
patterns: ["two-pointers", "iterator-design"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E281", "M341", "M284"]
prerequisites: ["iterator-pattern", "two-pointers", "class-design"]
---
# Flatten 2D Vector

## Problem

Design and implement a class that acts as an iterator over a two-dimensional array, flattening it into a one-dimensional sequence. Imagine you have a spreadsheet with multiple rows, some potentially empty, and you want to read all the values left-to-right, top-to-bottom, one at a time. Your `Vector2D` class needs a constructor that accepts the 2D array, a `next()` method that returns the current element and moves forward, and a `hasNext()` method that tells you if there are more elements to read. The key challenge is handling empty inner arrays gracefully without wasting memory by flattening everything upfront. You'll need to track your position with two pointers (row and column) and intelligently skip over empty rows. Consider what happens when you call `next()` at the end of a row, or when the 2D array starts with several empty inner arrays. This is an exercise in iterator design where you maintain state across method calls.

## Why This Matters

Iterator patterns are everywhere in software engineering. CSV parsers use this exact technique to iterate over rows and columns in large files without loading everything into memory. Database result sets implement similar iterators to stream query results row-by-row and column-by-column. In data pipeline frameworks like Apache Spark, you'll find iterators that flatten nested data structures for processing. The two-pointer technique you develop here directly applies to pagination systems that need to track position across multiple pages of results. Understanding how to maintain state in an object-oriented way while handling edge cases like empty containers is essential for building robust APIs and libraries that others will depend on.

## Constraints

- 0 <= vec.length <= 200
- 0 <= vec[i].length <= 500
- -500 <= vec[i][j] <= 500
- At most 10⁵ calls will be made to next and hasNext.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Track Position with Two Pointers</summary>

You need to maintain your position in a 2D structure. Consider using two indices: one for the outer array (which row) and one for the inner array (which column within that row). How do you advance these pointers when reaching the end of a row?

</details>

<details>
<summary>🎯 Hint 2: Handle Empty Rows</summary>

The 2D vector might contain empty inner arrays. Your hasNext() method must skip over empty rows to find the next valid element. Implement a helper method to advance pointers past empty rows.

</details>

<details>
<summary>📝 Hint 3: Algorithm Design</summary>

Pseudocode approach:
```
class Vector2D:
    def __init__(vec):
        self.vec = vec
        self.row = 0
        self.col = 0
        self.advance_to_next()  # Skip initial empty rows

    def advance_to_next():
        # Skip empty rows
        while row < len(vec) and col >= len(vec[row]):
            row += 1
            col = 0

    def hasNext():
        return row < len(vec)

    def next():
        value = vec[row][col]
        col += 1
        advance_to_next()
        return value
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Flatten All | O(n) init, O(1) next/hasNext | O(n) | Flatten entire 2D array into 1D array at initialization |
| **Optimal Two Pointers** | **O(1) init, O(v) next/hasNext** | **O(1)** | v = average empty rows to skip, amortized O(1) |

Where n is the total number of elements across all rows.

## Common Mistakes

**Mistake 1: Not handling empty inner arrays**
```python
# Wrong: Crashes when encountering empty rows
class Vector2D:
    def __init__(self, vec):
        self.vec = vec
        self.row = 0
        self.col = 0

    def hasNext(self):
        return self.row < len(self.vec)

    def next(self):
        val = self.vec[self.row][self.col]  # IndexError if row is empty!
        self.col += 1
        if self.col >= len(self.vec[self.row]):
            self.row += 1
            self.col = 0
        return val
```

```python
# Correct: Skip empty rows
class Vector2D:
    def __init__(self, vec):
        self.vec = vec
        self.row = 0
        self.col = 0
        self._advance_to_next()

    def _advance_to_next(self):
        while self.row < len(self.vec) and self.col >= len(self.vec[self.row]):
            self.row += 1
            self.col = 0

    def hasNext(self):
        return self.row < len(self.vec)

    def next(self):
        val = self.vec[self.row][self.col]
        self.col += 1
        self._advance_to_next()
        return val
```

**Mistake 2: Flattening array unnecessarily**
```python
# Wrong: Uses O(n) extra space and O(n) initialization time
class Vector2D:
    def __init__(self, vec):
        self.data = []
        for row in vec:
            for val in row:
                self.data.append(val)
        self.index = 0

    def hasNext(self):
        return self.index < len(self.data)

    def next(self):
        val = self.data[self.index]
        self.index += 1
        return val
```

```python
# Correct: O(1) space with two pointers
class Vector2D:
    def __init__(self, vec):
        self.vec = vec
        self.row = 0
        self.col = 0
        self._advance_to_next()
    # ... rest of implementation
```

**Mistake 3: Not advancing pointers in next()**
```python
# Wrong: Forgets to advance to next valid position after returning
def next(self):
    val = self.vec[self.row][self.col]
    self.col += 1
    # Missing: self._advance_to_next()
    return val
```

```python
# Correct: Always advance after retrieving value
def next(self):
    val = self.vec[self.row][self.col]
    self.col += 1
    self._advance_to_next()  # Prepare for next call
    return val
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Flatten Nested List Iterator | Iterate nested lists with arbitrary depth | Medium |
| Zigzag Iterator | Alternate between multiple lists | Medium |
| Peeking Iterator | Add peek() method to see next without advancing | Medium |
| 3D Vector Iterator | Extend to three dimensions | Medium |
| Flatten with Filter | Skip elements matching a condition | Medium |

## Practice Checklist

- [ ] Initial attempt (Day 0)
- [ ] Reviewed two-pointer technique (Day 0)
- [ ] Implemented with empty row handling (Day 0)
- [ ] First spaced repetition (Day 1)
- [ ] Second spaced repetition (Day 3)
- [ ] Third spaced repetition (Day 7)
- [ ] Fourth spaced repetition (Day 14)
- [ ] Can explain iterator pattern (Day 14)
- [ ] Can code without references (Day 30)
- [ ] Interview-ready confidence (Day 30)

**Strategy**: Use two pointers to track position in 2D array, with helper method to skip empty rows and maintain iterator invariants.
