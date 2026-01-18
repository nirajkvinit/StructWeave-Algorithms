---
id: M552
old_id: A443
slug: largest-perimeter-triangle
title: Largest Perimeter Triangle
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Largest Perimeter Triangle

## Problem

You have a collection of sticks with various lengths represented by an array `nums`. Your goal is to select any three sticks and form a valid triangle with the largest possible perimeter.

For three sticks to form a valid triangle, they must satisfy the triangle inequality theorem: the sum of any two sides must be strictly greater than the third side. This ensures the triangle has a positive area and isn't just a flat line.

For example, sticks with lengths 3, 4, and 5 form a valid triangle because:
- 3 + 4 > 5 ✓
- 3 + 5 > 4 ✓
- 4 + 5 > 3 ✓

However, sticks with lengths 1, 2, and 10 cannot form a triangle because 1 + 2 is not greater than 10.

Return the maximum perimeter (sum of three sides) of any valid triangle you can construct. If no valid triangle exists, return `0`.

## Why This Matters

Triangle validation and optimization problems appear frequently in computer graphics, CAD systems, and 3D modeling software where triangle meshes form the foundation of object representation. Game engines use triangle perimeter calculations for collision detection and physics simulations. In civil engineering, structural analysis software validates triangle stability in truss designs. Geographic Information Systems (GIS) use triangulation to create terrain models from elevation data. Manufacturing and fabrication systems verify that component dimensions can form valid geometric shapes before production. Even network topology design uses triangle inequality concepts to validate path lengths and routing efficiency.

## Examples

**Example 1:**
- Input: `nums = [2,1,2]`
- Output: `5`
- Explanation: Selecting sides 1, 2, and 2 creates a valid triangle with perimeter 5.

**Example 2:**
- Input: `nums = [1,2,1,10]`
- Output: `0`
- Explanation: No combination of three elements satisfies the triangle inequality. The combination (1,1,2) fails because 1+1 is not greater than 2. The combination (1,1,10) fails because 1+1 < 10. The combination (1,2,10) fails because 1+2 < 10. Since no valid triangle exists, return 0.

## Constraints

- 3 <= nums.length <= 10⁴
- 1 <= nums[i] <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The triangle inequality states: for sides a, b, c to form a valid triangle, a + b > c must hold for all permutations. To maximize perimeter, use the largest possible values. If you sort the array descending, you can check consecutive triplets - if the three largest values don't form a triangle, try the next triplet (drop largest, include next smaller).
</details>

<details>
<summary>Main Approach</summary>
Sort the array in descending order. Iterate through consecutive triplets (nums[i], nums[i+1], nums[i+2]). For each triplet, check if nums[i] < nums[i+1] + nums[i+2] (since array is sorted, this is the only inequality you need to check). If valid, return sum. If no valid triangle found after checking all triplets, return 0.
</details>

<details>
<summary>Optimization Tip</summary>
You only need to check one inequality due to sorting: if a >= b >= c (sorted descending), then a + b > c is already satisfied, and b + c > a is already satisfied. You only need to verify a < b + c. Start from largest values to find maximum perimeter first.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n³) | O(1) | Check all triplets; too slow |
| Sort + Check | O(n log n) | O(1) or O(n) | Sort then iterate; optimal |
| Optimal | O(n log n) | O(1) | Dominated by sorting |

## Common Mistakes

1. **Checking all three triangle inequalities**
   ```python
   # Wrong: Redundant checks when sorted
   def is_valid_triangle(a, b, c):
       return (a + b > c) and (b + c > a) and (a + c > b)

   # Correct: Only one check needed when sorted descending
   nums.sort(reverse=True)
   for i in range(len(nums) - 2):
       if nums[i] < nums[i+1] + nums[i+2]:
           return nums[i] + nums[i+1] + nums[i+2]
   ```

2. **Sorting ascending instead of descending**
   ```python
   # Wrong: Finds smallest valid triangle, not largest
   nums.sort()
   for i in range(len(nums) - 2):
       if nums[i] + nums[i+1] > nums[i+2]:
           return sum(nums[i:i+3])

   # Correct: Sort descending to check largest first
   nums.sort(reverse=True)
   for i in range(len(nums) - 2):
       if nums[i] < nums[i+1] + nums[i+2]:
           return nums[i] + nums[i+1] + nums[i+2]
   ```

3. **Checking non-consecutive triplets**
   ```python
   # Wrong: Checking all possible triplets
   for i in range(len(nums)):
       for j in range(i+1, len(nums)):
           for k in range(j+1, len(nums)):
               # Check triangle inequality

   # Correct: Only consecutive triplets after sorting
   nums.sort(reverse=True)
   for i in range(len(nums) - 2):
       # Check only (i, i+1, i+2)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Triangle Number | Medium | Count all valid triangles |
| Largest Triangle Area | Easy | Find area instead of perimeter |
| Minimum Cost to Connect Sticks | Medium | Different greedy problem with sorting |
| Maximum Perimeter of Rectangle | Easy | Similar greedy with rectangle constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved (O(n log n))
- [ ] Clean, readable code
- [ ] Handled all edge cases (no valid triangle, all equal sides, minimum array size)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
