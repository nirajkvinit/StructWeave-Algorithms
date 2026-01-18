---
id: M419
old_id: A267
slug: similar-rgb-color
title: Similar RGB Color
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Similar RGB Color

## Problem

RGB colors are typically represented as 6-character hexadecimal strings like "#AABBCC", where AA, BB, and CC represent the red, green, and blue components respectively (each ranging from 00 to FF in hexadecimal, or 0 to 255 in decimal).

There's a shorthand notation where colors like "#ABC" can represent "#AABBCC" by duplicating each hex digit. For example, "#09c" expands to "#0099cc", and "#f4e" expands to "#ff44ee". Not all full-length colors can be represented in shorthand - only those where each pair has matching digits.

Given two RGB colors, we define their similarity as the negative sum of squared differences between corresponding components: `-(AB - UV)² - (CD - WX)² - (EF - YZ)²`, where hex pairs are converted to decimal values for calculation. The negative sign means larger (less negative) values indicate more similar colors.

Your task: given an RGB color in the format "#ABCDEF", find the color representable in shorthand format (meaning "#XYZ" where each component is a repeated hex digit like 00, 11, 22, ..., ff) that has maximum similarity to the input. If multiple shorthand colors have the same maximum similarity, any of them is acceptable.

For example, given "#09f166", the closest shorthand color is "#11ee66". The similarity calculation is: -(0x09 - 0x11)² -(0xf1 - 0xee)² -(0x66 - 0x66)² = -64 -9 -0 = -73.

The key insight is that you can optimize each color component independently - the best red component doesn't depend on the green or blue choices.

## Why This Matters

This problem demonstrates decomposition of optimization problems. When an objective function can be separated into independent components (similarity here equals the sum of individual component similarities), you can optimize each piece separately rather than trying all combinations. This principle appears in machine learning (separable loss functions), image processing (independent color channel operations), resource allocation, and compression algorithms. The rounding technique here - finding the nearest value from a discrete set - is fundamental to quantization in digital signal processing, color reduction in graphics, and discretization in numerical methods.

## Examples

**Example 1:**
- Input: `color = "#09f166"`
- Output: `"#11ee66"`
- Explanation: Computing similarity: -(0x09 - 0x11)² -(0xf1 - 0xee)² - (0x66 - 0x66)² = -64 -9 -0 = -73.
This represents the maximum similarity among all shorthand colors.

**Example 2:**
- Input: `color = "#4e3fe1"`
- Output: `"#5544dd"`

## Constraints

- color.length == 7
- color[0] == '#'
- color[i] is either digit or character in the range ['a', 'f'] for i > 0.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The shorthand format "#ABC" expands to "#AABBCC", meaning each component must be a repeated hex digit (00, 11, 22, ..., ff). For each of the three color components in the input, find the closest shorthand-representable value. Since similarity is based on negative squared differences, you want to minimize the absolute difference for each component independently.
</details>

<details>
<summary>Main Approach</summary>
Process each of the three hex pairs (red, green, blue) separately. For each pair, find the closest value from the 17 valid shorthand digits: 00, 11, 22, 33, 44, 55, 66, 77, 88, 99, aa, bb, cc, dd, ee, ff. Convert the input hex pair to decimal, find which shorthand value it's closest to (by checking the two candidates before and after dividing by 17), and construct the result by combining the three closest components.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of checking all 17 possible values for each component, you can round the decimal value to the nearest multiple of 17. For example, if a component has value 0x5c (92 in decimal), divide by 17 to get 5.4, which rounds to 5, giving you 0x55. This gives you O(1) lookup per component instead of O(17).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(17³) | O(1) | Try all combinations of shorthand values |
| Optimal | O(1) | O(1) | Process each component independently with rounding |

## Common Mistakes

1. **Incorrect rounding logic**
   ```python
   # Wrong: Simple rounding doesn't account for hex boundaries
   value = int(component, 16)
   closest = round(value / 17) * 17

   # Correct: Check both floor and ceiling candidates
   value = int(component, 16)
   lower = (value // 17) * 17
   upper = lower + 17
   closest = lower if abs(value - lower) <= abs(value - upper) else upper
   ```

2. **Forgetting to format hex correctly**
   ```python
   # Wrong: May produce single-digit hex values
   result = f"#{r:x}{g:x}{b:x}"

   # Correct: Use zero-padding for two-digit hex
   result = f"#{r:02x}{g:02x}{b:02x}"
   ```

3. **Treating components as dependent**
   ```python
   # Wrong: Trying to optimize all three components together
   for r in range(0, 256, 17):
       for g in range(0, 256, 17):
           for b in range(0, 256, 17):
               # This is O(17³) - too slow!

   # Correct: Optimize each component independently
   # Each component's best value doesn't depend on others
   best_r = find_closest(red_component)
   best_g = find_closest(green_component)
   best_b = find_closest(blue_component)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Color Blending | Easy | Mix two colors with given weights |
| Nearest Color in Palette | Medium | Find closest from arbitrary color set |
| Color Quantization | Hard | Reduce full-color image to limited palette |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days
