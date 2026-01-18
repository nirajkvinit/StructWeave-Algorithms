---
id: H009
old_id: F042
slug: trapping-rain-water
title: Trapping Rain Water
difficulty: hard
category: hard
topics: ["array", "two-pointers", "stack", "monotonic-stack", "dynamic-programming"]
patterns: ["two-pointers", "monotonic-stack", "prefix-suffix-processing"]
estimated_time_minutes: 45
frequency: high
related_problems: ["M011", "M084", "M407", "M135"]
prerequisites: ["two-pointers-basics", "stack-operations", "array-traversal"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Trapping Rain Water

## Problem

Given an elevation map represented by an array of non-negative integers where each element represents the height of a bar with width 1, calculate how much rainwater can be trapped after it rains.

**Diagram:**

```
Elevation Map with Trapped Water:

Height: [0,1,0,2,1,0,1,3,2,1,2,1]

 3 |               █
 2 |       █ ~ ~ ~ █ █ ~ █
 1 |   █ ~ █ █ ~ █ █ █ █ █
 0 | █ █ █ █ █ █ █ █ █ █ █ █
   +---------------------------
     0 1 2 3 4 5 6 7 8 9 10 11

█ = Elevation bar
~ = Trapped water

Trapped water calculation:
- At index 2: min(max_left=1, max_right=3) - height=0 = 1 unit
- At index 4: min(max_left=2, max_right=3) - height=1 = 1 unit
- At index 5: min(max_left=2, max_right=3) - height=0 = 2 units
- At index 6: min(max_left=2, max_right=3) - height=1 = 1 unit
- At index 9: min(max_left=3, max_right=2) - height=1 = 1 unit
- At index 10: min(max_left=3, max_right=2) - height=2 = 0 units

Total trapped water = 6 units
```


## Why This Matters

This is a classic **multi-approach** problem that demonstrates:
- **Pattern recognition**: Identifying that water level depends on surrounding boundaries
- **Optimization progression**: From brute force → precomputation → two pointers → stack
- **Trade-offs**: Time vs space complexity decisions

**Real-world applications:**
- **Civil engineering**: Reservoir capacity calculations
- **Urban planning**: Stormwater drainage system design
- **Graphics rendering**: Water simulation in games
- **Data analysis**: Finding "valleys" or dips in time-series data

**Why it's Hard:**
- Multiple valid approaches with different trade-offs
- Non-obvious insights (e.g., two-pointer invariant, monotonic stack usage)
- Edge cases: flat terrain, all ascending, all descending

## Examples

**Example 1:**
- Input: `height = [0,1,0,2,1,0,1,3,2,1,2,1]`
- Output: `6`
- Explanation: See diagram above. Water trapped at indices 2, 4, 5, 6, 9, 10.

**Example 2:**
- Input: `height = [4,2,0,3,2,5]`
- Output: `9`
- Explanation:
  ```
  5 |                 █
  4 | █               █
  3 | █       █       █
  2 | █ █     █ █     █
  1 | █ █     █ █     █
  0 | █ █ █   █ █ █   █
    +-------------------
      0 1 2 3 4 5

  Water at index 1: min(4,5) - 2 = 2 units
  Water at index 2: min(4,5) - 0 = 4 units
  Water at index 3: min(4,5) - 3 = 1 unit
  Water at index 4: min(4,5) - 2 = 2 units
  Total: 9 units
  ```

**Example 3:**
- Input: `height = [4,2,3]`
- Output: `1`
- Explanation: Only 1 unit of water trapped at index 1 (min(4,3) - 2 = 1)

## Constraints

- n == height.length
- 1 <= n <= 2 * 10⁴
- 0 <= height[i] <= 10⁵

---

## Test Cases

Copy-paste friendly test cases for your IDE:

```json
[
  {
    "input": { "height": [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
    "expected": 6,
    "description": "Classic example - multiple pools"
  },
  {
    "input": { "height": [4, 2, 0, 3, 2, 5] },
    "expected": 9,
    "description": "Single large pool"
  },
  {
    "input": { "height": [4, 2, 3] },
    "expected": 1,
    "description": "Small pool"
  },
  {
    "input": { "height": [1, 2, 3, 4, 5] },
    "expected": 0,
    "description": "Ascending - no water trapped"
  },
  {
    "input": { "height": [5, 4, 3, 2, 1] },
    "expected": 0,
    "description": "Descending - no water trapped"
  },
  {
    "input": { "height": [3, 0, 0, 0, 3] },
    "expected": 9,
    "description": "Flat valley"
  },
  {
    "input": { "height": [5, 2, 1, 2, 1, 5] },
    "expected": 14,
    "description": "Symmetric with valley"
  },
  {
    "input": { "height": [1] },
    "expected": 0,
    "description": "Single element"
  },
  {
    "input": { "height": [1, 2] },
    "expected": 0,
    "description": "Two elements - cannot trap"
  }
]
```

**CSV Format:**
```csv
height,expected,description
"[0,1,0,2,1,0,1,3,2,1,2,1]",6,"Classic example - multiple pools"
"[4,2,0,3,2,5]",9,"Single large pool"
"[4,2,3]",1,"Small pool"
"[1,2,3,4,5]",0,"Ascending - no water trapped"
"[5,4,3,2,1]",0,"Descending - no water trapped"
"[3,0,0,0,3]",9,"Flat valley"
"[5,2,1,2,1,5]",14,"Symmetric with valley"
"[1]",0,"Single element"
"[1,2]",0,"Two elements - cannot trap"
```

---

## Think About

1. For any position i, what determines how much water can be trapped there?
2. If you knew max_left[i] and max_right[i] for every position, how would you calculate trapped water?
3. Can you compute water without explicitly storing all max_left and max_right values?
4. What invariant can two pointers maintain?

---

## Approach Hints

<details>
<summary>💡 Hint 1: The core insight</summary>

**Key observation:** Water trapped at position `i` depends on:
- The tallest bar to its **left** (max_left)
- The tallest bar to its **right** (max_right)

**Formula:** `water[i] = min(max_left[i], max_right[i]) - height[i]`

**Why?** Water fills to the level of the shorter boundary, minus the bar's own height.

```
Example: height = [3, 0, 2, 0, 4]
At index 1 (height=0):
  max_left = 3 (from index 0)
  max_right = 4 (from index 4)
  water = min(3, 4) - 0 = 3 units

At index 3 (height=0):
  max_left = 3 (max of 3, 0, 2)
  max_right = 4 (from index 4)
  water = min(3, 4) - 0 = 3 units

   4 |             █
   3 | █ ~ ~ ~     █
   2 | █ ~ █ ~     █
   1 | █ ~ █ ~     █
   0 | █ █ █ █     █
     +---------------
       0 1 2 3 4
```

**Question:** How can you efficiently compute max_left and max_right for all positions?

</details>

<details>
<summary>🎯 Hint 2: Four different approaches</summary>

### Approach 1: Brute Force
For each position, scan left and scan right to find max heights.
```
for i in range(n):
    max_left = max(height[0:i+1])
    max_right = max(height[i:n])
    water += max(0, min(max_left, max_right) - height[i])
```
- Time: O(n²) - nested loops
- Space: O(1)
- Too slow for large inputs

### Approach 2: Precomputation (Dynamic Programming)
Precompute max_left and max_right arrays in advance.
```
max_left[0] = height[0]
for i in 1 to n-1:
    max_left[i] = max(max_left[i-1], height[i])

max_right[n-1] = height[n-1]
for i in n-2 down to 0:
    max_right[i] = max(max_right[i+1], height[i])

for i in range(n):
    water += min(max_left[i], max_right[i]) - height[i]
```
- Time: O(n) - three passes
- Space: O(n) - two arrays
- Good trade-off, easy to understand

### Approach 3: Two Pointers (Optimal)
Use two pointers moving toward each other, maintaining invariant.
```
left, right = 0, n-1
max_left, max_right = 0, 0
water = 0

while left < right:
    if height[left] < height[right]:
        if height[left] >= max_left:
            max_left = height[left]
        else:
            water += max_left - height[left]
        left += 1
    else:
        if height[right] >= max_right:
            max_right = height[right]
        else:
            water += max_right - height[right]
        right -= 1
```
- Time: O(n) - single pass
- Space: O(1) - just variables
- **Optimal!** But requires understanding the invariant

### Approach 4: Monotonic Stack
Process bars left-to-right, using stack to track potential boundaries.
```
stack = []  # stores indices
water = 0

for i in range(n):
    while stack and height[i] > height[stack[-1]]:
        top = stack.pop()
        if not stack:
            break
        distance = i - stack[-1] - 1
        bounded_height = min(height[i], height[stack[-1]]) - height[top]
        water += distance * bounded_height
    stack.append(i)
```
- Time: O(n) - each element pushed/popped once
- Space: O(n) - stack
- Calculates water horizontally (layer by layer)

**Which to use?**
- **Interviews:** Two pointers (optimal time + space)
- **Understanding:** Precomputation (most intuitive)
- **Learning:** Stack (teaches monotonic stack pattern)

</details>

<details>
<summary>📝 Hint 3: Two-pointer algorithm details</summary>

**The Invariant:**
At each step, one of these is true:
- `height[left] < height[right]`: We know max_right for position `left` is at least `height[right]`
- `height[left] >= height[right]`: We know max_left for position `right` is at least `height[left]`

**Why this works:**
- If `height[left] < height[right]`, the water at `left` is limited by `max_left` (not `max_right`)
  - Because we know there's a taller bar on the right (`height[right]`)
  - So `min(max_left, max_right) = max_left`
- Symmetric logic for the right side

```
Detailed algorithm:

function trap(height):
    n = len(height)
    if n < 3:  # Need at least 3 bars to trap water
        return 0

    left = 0
    right = n - 1
    max_left = 0  # Max height seen from left so far
    max_right = 0  # Max height seen from right so far
    water = 0

    while left < right:
        if height[left] < height[right]:
            # Process left side
            if height[left] >= max_left:
                # New max on left, update but no water trapped here
                max_left = height[left]
            else:
                # Water trapped: difference between max_left and current height
                water += max_left - height[left]
            left += 1
        else:
            # Process right side (symmetric logic)
            if height[right] >= max_right:
                max_right = height[right]
            else:
                water += max_right - height[right]
            right -= 1

    return water
```

**Edge cases handled:**
- Empty array: Covered by `n < 3` check
- All same height: No water trapped (correct)
- Ascending/descending: Pointers meet without trapping water
- Single peak: Water trapped correctly on both sides

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute force | O(n²) | O(1) | Too slow for large inputs |
| Precomputation (DP) | O(n) | O(n) | Intuitive, three passes |
| **Two pointers** | **O(n)** | **O(1)** | Optimal time and space |
| Monotonic stack | O(n) | O(n) | Horizontal calculation, educational |

**Why two pointers is optimal:**
- Single pass through the array (O(n))
- Constant extra space (O(1))
- No data structure overhead
- Demonstrates strong problem-solving skills

**When to use stack approach:**
- Learning monotonic stack pattern (applies to many problems)
- Need to track which bars contribute to water
- Horizontal layer-by-layer calculation is more natural

---

## Common Mistakes

### 1. Not handling edge cases
```python
# WRONG: Crashes on small arrays
def trap(height):
    left, right = 0, len(height) - 1  # Crash if height = []
    # ...

# CORRECT: Check size first
def trap(height):
    if len(height) < 3:
        return 0
    # ...
```

### 2. Incorrect water calculation
```python
# WRONG: Forgetting to subtract current height
water += min(max_left, max_right)  # This is water level, not trapped water!

# CORRECT: Subtract current height
water += min(max_left, max_right) - height[i]
```

### 3. Two-pointer invariant violation
```python
# WRONG: Always processing left or always processing right
while left < right:
    if height[left] >= max_left:
        max_left = height[left]
    else:
        water += max_left - height[left]
    left += 1  # Always moving left!

# CORRECT: Choose side based on height comparison
while left < right:
    if height[left] < height[right]:
        # ... process left, then left += 1
    else:
        # ... process right, then right -= 1
```

### 4. Precomputation off-by-one
```python
# WRONG: Not including current position in max
max_left[i] = max(height[0:i])  # Excludes height[i]!

# CORRECT: Include current position
max_left[i] = max(max_left[i-1], height[i])
```

### 5. Stack approach boundary confusion
```python
# WRONG: Not checking if stack has left boundary
while stack and height[i] > height[stack[-1]]:
    top = stack.pop()
    # Missing check!
    distance = i - stack[-1] - 1  # Crash if stack empty!

# CORRECT: Check before accessing
while stack and height[i] > height[stack[-1]]:
    top = stack.pop()
    if not stack:
        break  # No left boundary
    distance = i - stack[-1] - 1
```

---

## Visual Walkthrough

**Input:** `height = [0,1,0,2,1,0,1,3,2,1,2,1]`

### Two-Pointer Approach Step-by-Step:

```
Initial state:
height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
         L                                R
max_left = 0, max_right = 0, water = 0

Step 1: height[L]=0 < height[R]=1
├─ height[0]=0 >= max_left=0 → update max_left=0
├─ water = 0
└─ L = 1

Step 2: height[L]=1 >= height[R]=1
├─ height[11]=1 >= max_right=0 → update max_right=1
├─ water = 0
└─ R = 10

Step 3: height[L]=1 >= height[R]=2
├─ height[10]=2 >= max_right=1 → update max_right=2
├─ water = 0
└─ R = 9

Step 4: height[L]=1 >= height[R]=1
├─ height[9]=1 < max_right=2 → water += 2-1 = 1
├─ water = 1
└─ R = 8

Step 5: height[L]=1 < height[R]=2
├─ height[1]=1 >= max_left=0 → update max_left=1
├─ water = 1
└─ L = 2

Step 6: height[L]=0 < height[R]=2
├─ height[2]=0 < max_left=1 → water += 1-0 = 1
├─ water = 2
└─ L = 3

Step 7: height[L]=2 >= height[R]=2
├─ height[8]=2 >= max_right=2 → update max_right=2
├─ water = 2
└─ R = 7

Step 8: height[L]=2 < height[R]=3
├─ height[3]=2 >= max_left=1 → update max_left=2
├─ water = 2
└─ L = 4

Step 9: height[L]=1 < height[R]=3
├─ height[4]=1 < max_left=2 → water += 2-1 = 1
├─ water = 3
└─ L = 5

Step 10: height[L]=0 < height[R]=3
├─ height[5]=0 < max_left=2 → water += 2-0 = 2
├─ water = 5
└─ L = 6

Step 11: height[L]=1 < height[R]=3
├─ height[6]=1 < max_left=2 → water += 2-1 = 1
├─ water = 6
└─ L = 7

L = 7, R = 7: Loop ends

Final water = 6 units
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **2D version (Rain Water Trapping II)** | Grid instead of 1D | Use priority queue with BFS from outside |
| **Container with most water** | Only 2 bars, maximize area | Two pointers, move shorter side |
| **Histogram max rectangle** | Find max rectangle under bars | Monotonic stack (similar pattern) |
| **Volume calculation** | Need actual 3D volume | Multiply by bar width |

---

## Practice Checklist

**Correctness:**
- [ ] Handles empty array
- [ ] Handles arrays with < 3 elements
- [ ] Handles all same height (returns 0)
- [ ] Handles ascending order (returns 0)
- [ ] Handles descending order (returns 0)
- [ ] Handles single valley
- [ ] Handles multiple valleys

**Algorithm Understanding:**
- [ ] Can explain the core formula: min(max_left, max_right) - height[i]
- [ ] Can explain two-pointer invariant clearly
- [ ] Understands why two pointers work without storing arrays
- [ ] Can trace through example step-by-step

**Interview Readiness:**
- [ ] Can code two-pointer solution in 15 minutes
- [ ] Can explain precomputation approach as well
- [ ] Can discuss all four approaches and trade-offs
- [ ] Can handle follow-up: what if 2D grid?

**Spaced Repetition Tracker:**
- [ ] Day 1: Study all approaches, understand two-pointer invariant
- [ ] Day 3: Implement precomputation version from scratch
- [ ] Day 7: Implement two-pointer version from scratch
- [ ] Day 14: Implement stack version, explain all trade-offs
- [ ] Day 30: Speed run two-pointer (< 10 min)

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md) | [Monotonic Stack Pattern](../../strategies/patterns/monotonic-stack.md)
