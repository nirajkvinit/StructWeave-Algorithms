---
id: E211
old_id: A128
slug: image-smoother
title: Image Smoother
difficulty: easy
category: easy
topics: ["array", "matrix"]
patterns: ["matrix-traversal", "simulation"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["2d-arrays", "matrix-traversal"]
related_problems: ["E598", "M289", "M304"]
strategy_ref: ../prerequisites/arrays.md
---
# Image Smoother

## Problem

You're implementing a basic image filter that smooths a grayscale image. The image is represented as a 2D matrix where each cell contains a pixel value (an integer from 0 to 255, where 0 is black and 255 is white). Your filter works by replacing each pixel with the average of itself and its surrounding neighbors.

Here's how the smoothing works: for each cell at position (i, j), look at the 3x3 grid centered at that cell - that's up to 8 neighbors plus the cell itself. Calculate the average of all these values (but only include neighbors that actually exist - cells on edges and corners have fewer neighbors). Then round the average down to the nearest integer (floor division).

For example, consider the center cell of a 3x3 grid with all 1s except a 0 in the middle. The average would be (1+1+1+1+0+1+1+1+1)/9 = 8/9, which rounds down to 0. Notice that edge cells only have 5 neighbors (plus themselves = 6 values to average), and corner cells only have 3 neighbors (plus themselves = 4 values to average).

A critical requirement: you cannot modify the original image while calculating new values, because each cell's new value depends on the original values of its neighbors. If you overwrite a cell, you'll corrupt the calculations for cells processed later.

Return the smoothed image as a new matrix.

## Why This Matters

This problem introduces you to convolution operations, which are fundamental to computer vision, image processing, and deep learning. Gaussian blur in photo editing apps, edge detection in self-driving cars, and convolutional neural networks in AI all use similar sliding-window operations over matrices. In production systems, you'll encounter this pattern when implementing video filters, medical imaging analysis, and signal processing. The problem teaches you to handle boundary conditions carefully - a skill essential when working with any grid-based data like game boards, spreadsheet calculations, or geographical maps. It also demonstrates the need to avoid in-place modification when new values depend on old values, a common pitfall in matrix algorithms. Many engineers first encounter matrix traversal and neighbor calculation in problems like this, making it an excellent introduction to 2D array manipulation.

## Constraints

- m == img.length
- n == img[i].length
- 1 <= m, n <= 200
- 0 <= img[i][j] <= 255

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Create New Matrix (Direct Approach)
For each cell (i, j) in the input matrix, iterate through all neighboring cells in the 3x3 grid centered at (i, j). Sum the values of valid neighbors (checking bounds to avoid going out of matrix) and count how many valid cells exist. Divide the sum by the count and store in a new result matrix. This ensures you don't overwrite values needed for subsequent calculations.

### Hint 2: Direction Vectors for Neighbors
Define eight direction vectors representing the 8 possible neighbors: [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]. For each cell, iterate through these directions, check if the neighbor is within bounds, and accumulate the sum. Don't forget to include the cell itself in the average.

### Hint 3: In-Place with Bit Manipulation (Advanced)
Since pixel values are at most 255 (8 bits), you can store both old and new values in a single integer using bit manipulation. Store the old value in the lower 8 bits and the new smoothed value in the upper bits. After processing all cells, extract the new values. This achieves O(1) space but adds complexity.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| New Matrix | O(m * n) | O(m * n) | Simple, clear, uses extra space |
| Direction Vectors | O(m * n) | O(m * n) | Same complexity, cleaner code |
| In-Place Bit Manipulation | O(m * n) | O(1) | Space-optimized, more complex |
| Convolution (Matrix) | O(m * n * 9) | O(m * n) | General approach, constant factor |

## Common Mistakes

### Mistake 1: Modifying input matrix during iteration
```
// Wrong: Overwriting values still needed
for (int i = 0; i < m; i++) {
    for (int j = 0; j < n; j++) {
        int sum = 0, count = 0;
        // ... calculate sum and count ...
        img[i][j] = sum / count;  // Wrong! Affects future calculations
    }
}
```
**Why it's wrong**: When processing cell (i+1, j), you need the original value of cell (i, j), but you've already overwritten it.

**Correct approach**: Create a new result matrix and copy values there, or use bit manipulation to store both values.

### Mistake 2: Incorrect boundary checking
```
// Wrong: Not checking all boundaries properly
for (int di = -1; di <= 1; di++) {
    for (int dj = -1; dj <= 1; dj++) {
        int ni = i + di, nj = j + dj;
        if (ni >= 0 && nj >= 0) {  // Missing upper bound checks!
            sum += img[ni][nj];
            count++;
        }
    }
}
```
**Why it's wrong**: Must check both lower bounds (>= 0) AND upper bounds (< m, < n) to prevent array access violations.

**Correct approach**: `if (ni >= 0 && ni < m && nj >= 0 && nj < n)`

### Mistake 3: Integer division precision loss
```
// Wrong: Not handling division correctly
int avg = sum / count;  // Integer division truncates
result[i][j] = avg;
```
**Why it's wrong**: This is actually correct for this problem since we need to round down. The mistake would be using floating point when the problem asks for integer floor.

**Correct approach**: Integer division naturally floors, which is what we want. Just ensure sum is correctly calculated.

## Variations

| Variation | Difference | Difficulty Increase |
|-----------|------------|---------------------|
| Gaussian blur | Weighted average with Gaussian kernel | Medium (requires understanding kernels) |
| Median filter | Use median instead of average | Medium (requires sorting neighbors) |
| Variable kernel size | k x k kernel instead of 3x3 | None (generalize loop) |
| Color image smoothing | RGB channels to smooth | None (apply to each channel) |
| Adaptive smoothing | Kernel size varies by region | Hard (requires edge detection) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve with new result matrix
- [ ] Implement using direction vectors
- [ ] Handle edge and corner cells correctly
- [ ] Handle edge cases (1x1 matrix, 1xn or nx1)
- [ ] Implement without bugs on first try
- [ ] Explain why new matrix is needed
- [ ] Test with small matrices (2x2, 3x3)
- [ ] Solve in under 15 minutes
- [ ] Try in-place bit manipulation approach
- [ ] Revisit after 3 days (spaced repetition)
- [ ] Revisit after 1 week (spaced repetition)
- [ ] Implement median filter variation

**Strategy**: See [Array and Matrix Patterns](../prerequisites/arrays.md)
