---
id: E234
old_id: A299
slug: flipping-an-image
title: Flipping an Image
difficulty: easy
category: easy
topics: ["matrix", "array", "bit-manipulation"]
patterns: ["two-pointers-opposite", "in-place"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["array-reversal", "bit-manipulation", "2d-array"]
related_problems: ["E048", "E190", "E206"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Flipping an Image

## Problem

You are given a square binary matrix called `image`, where each element is either `0` or `1`. Your task is to transform this image by performing two sequential operations: first flip it horizontally, then invert all the pixel values.

Let's break down what each operation means. A horizontal flip reverses each row from left to right, similar to what happens when you look at a mirror image. For instance, the row `[1,1,0]` becomes `[0,1,1]` after flipping. The inversion operation then replaces every `0` with `1` and every `1` with `0`, like creating a photographic negative. Continuing our example, `[0,1,1]` becomes `[1,0,0]` after inversion.

Here's what makes this interesting: while you could perform these operations separately, there's an elegant optimization available. Since you know exactly where each element will end up and what its final value will be, you can combine both transformations into a single pass through the matrix. Think about position `j` in a row of length `n`: after flipping, it moves to position `n-1-j`, and its value gets inverted. Can you leverage this to solve the problem more efficiently?

The problem also has a nice symmetry property worth considering. When you flip and invert simultaneously using two pointers at opposite ends of a row, what happens to the middle element when the row has odd length? Understanding this edge case is key to an in-place solution.

## Why This Matters

This problem teaches fundamental matrix manipulation patterns that appear throughout image processing, computer graphics, and data transformation tasks. The horizontal flip operation mirrors the image reflection techniques used in graphics libraries and photo editing software, while bit inversion is central to image filtering and color manipulation.

Beyond the specific operations, this problem demonstrates the power of combining transformations to reduce computational overhead. The same optimization principle appears in graphics pipelines where multiple transformations are composed into a single operation, and in database query optimization where multiple passes over data are consolidated.

The two-pointer technique you'll develop here is a foundational pattern for in-place array manipulation. It appears in string reversal, palindrome checking, and numerous other problems where you need to process elements from both ends of a sequence simultaneously. Mastering this pattern with a concrete example like image flipping builds intuition that transfers to more complex scenarios.

From an interview perspective, this problem tests your ability to recognize optimization opportunities and handle edge cases like odd-length arrays. The bit manipulation aspect (using XOR or subtraction from 1 to flip binary values) is a common technique in low-level programming and algorithm design.

## Examples

**Example 1:**
- Input: `image = [[1,1,0],[1,0,1],[0,0,0]]`
- Output: `[[1,0,0],[0,1,0],[1,1,1]]`
- Explanation: First reverse each row: [[0,1,1],[1,0,1],[0,0,0]].
Then, invert the image: [[1,0,0],[0,1,0],[1,1,1]]

**Example 2:**
- Input: `image = [[1,1,0,0],[1,0,0,1],[0,1,1,1],[1,0,1,0]]`
- Output: `[[1,1,0,0],[0,1,1,0],[0,0,0,1],[1,0,1,0]]`
- Explanation: First reverse each row: [[0,0,1,1],[1,0,0,1],[1,1,1,0],[0,1,0,1]].
Then invert the image: [[1,1,0,0],[0,1,1,0],[0,0,0,1],[1,0,1,0]]

## Constraints

- n == image.length
- n == image[i].length
- 1 <= n <= 20
- images[i][j] is either 0 or 1.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Two-Step Process
The straightforward approach is to perform the operations separately. First, reverse each row (flip horizontally). Then, invert all values in the matrix (0 becomes 1, 1 becomes 0). How would you reverse an array? How would you toggle a binary value?

### Tier 2: Combined Operation
Can you combine both operations into a single pass? Think about what happens to each element: it gets moved to a new position AND inverted. For element at position j in a row of length n, where does it end up? And what value does it have? Using XOR with 1 (value ^ 1) flips binary digits.

### Tier 3: In-Place Optimization
You can do this in-place using two pointers for each row. Start with left and right pointers at opposite ends. Swap the elements AND invert them simultaneously. What's special about the middle element when the row has odd length? It stays in the same position but still needs to be inverted.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two-Pass (flip then invert) | O(n²) | O(1) | Two separate iterations over the matrix |
| Single-Pass Combined | O(n²) | O(1) | Flip and invert simultaneously |
| Two-Pointer In-Place (Optimal) | O(n²) | O(1) | Swap and invert in one pass |

Where n = dimension of n×n matrix

## Common Mistakes

### Mistake 1: Not Inverting After Flip
```python
# Wrong: Only flips, doesn't invert
def flipAndInvertImage(image):
    for row in image:
        row.reverse()  # Only reverses, missing inversion
    return image

# Correct: Reverse AND invert
def flipAndInvertImage(image):
    for row in image:
        row.reverse()
        for i in range(len(row)):
            row[i] = 1 - row[i]  # or row[i] ^= 1
    return image
```

### Mistake 2: Wrong Inversion Logic
```python
# Wrong: Incorrect bit flip
def flipAndInvertImage(image):
    for row in image:
        row.reverse()
        for i in range(len(row)):
            row[i] = not row[i]  # Returns True/False, not 1/0
    return image

# Correct: Use 1 - x or x ^ 1
row[i] = 1 - row[i]
# or
row[i] ^= 1
```

### Mistake 3: Inefficient Two-Pointer Logic
```python
# Wrong: Swaps without considering the middle element correctly
def flipAndInvertImage(image):
    for row in image:
        left, right = 0, len(row) - 1
        while left < right:  # Should be left <= right
            row[left], row[right] = row[right] ^ 1, row[left] ^ 1
            left += 1
            right -= 1
    return image

# Correct: Use <= to handle middle element in odd-length rows
while left <= right:
    if left == right:
        row[left] ^= 1  # Middle element: just invert
    else:
        row[left], row[right] = row[right] ^ 1, row[left] ^ 1
    left += 1
    right -= 1
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Rotate and Invert | Medium | Rotate 90 degrees and invert instead of horizontal flip. |
| Vertical Flip and Invert | Easy | Flip vertically (reverse row order) instead of horizontally. |
| Multi-bit Image | Medium | Image has values 0-255 instead of binary. Invert means 255 - value. |
| Selective Inversion | Medium | Only invert pixels that match a certain pattern or condition. |
| Flip Multiple Times | Easy | Apply flip and invert operation k times. |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Solved with two-pass approach
- [ ] Optimized to single-pass in-place solution
- [ ] Handled edge case: 1×1 matrix
- [ ] Handled edge case: all 0s or all 1s
- [ ] Handled edge case: odd-length rows (middle element)
- [ ] Tested with even and odd dimensions
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [Two Pointers Patterns](../strategies/patterns/two-pointers.md)
