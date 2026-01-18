---
id: M291
old_id: A098
slug: design-excel-sum-formula
title: Design Excel Sum Formula
difficulty: medium
category: medium
topics: ["design", "graph", "topological-sort"]
patterns: ["dependency-graph"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M166", "M398", "H042"]
prerequisites: ["graph-theory", "topological-sort", "dependency-tracking"]
---
# Design Excel Sum Formula

## Problem

Build a simplified spreadsheet system that mimics Excel's core functionality: storing values in cells and creating formulas that dynamically reference other cells.

Your spreadsheet has rows numbered from 1 to `height` and columns labeled from 'A' to `width` (like 'A', 'B', 'C', etc.). All cells initially contain zero. Create the `Excel` class with these methods:

- `Excel(int height, char width)` - Initializes a spreadsheet grid of the specified dimensions.

- `void set(int row, char column, int val)` - Updates a specific cell to hold a constant value. This overwrites any existing formula.

- `int get(int row, char column)` - Returns the current value of a cell. If the cell contains a formula, this computes the formula's result by summing the referenced cells.

- `int sum(int row, char column, List<String> numbers)` - Creates a dynamic sum formula in the target cell. The formula adds up all cells specified in the `numbers` list. The formula stays active until you overwrite it with `set()` or another `sum()`. Cell references can be:
  - Single cells like `"F7"` (column F, row 7)
  - Rectangular ranges like `"B3:F7"` (all cells from B3 to F7, inclusive)

The tricky part: when you change a cell that's referenced by a formula, the formula's value should automatically update when you call `get()`. For example, if cell A1 contains `sum(["B1"])` and you `set(1, 'B', 10)`, then `get(1, 'A')` should return 10.

An important guarantee: the input will never create circular references where cell A depends on B and B depends on A (either directly or through a chain).

## Why This Matters

This problem teaches dependency tracking, a fundamental concept in many real-world systems. Spreadsheet engines like Excel or Google Sheets must track which cells depend on which, updating dependent cells when source data changes. Build tools like Make or Gradle use similar dependency graphs to determine which files need recompilation. Reactive programming frameworks like React or Vue track dependencies between data and UI components to efficiently re-render only what changed. Mastering this problem builds your ability to reason about directed acyclic graphs (DAGs), lazy evaluation versus eager propagation, and designing systems where changes cascade through dependencies.

## Constraints

- 1 <= height <= 26
- 'A' <= width <= 'Z'
- 1 <= row <= height
- 'A' <= column <= width
- -100 <= val <= 100
- 1 <= numbers.length <= 5
- numbers[i] has the format "ColRow" or "ColRow1:ColRow2".
- At most 100 calls will be made to set, get, and sum.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Dependency Graph Approach</summary>

The core challenge is managing dependencies between cells. When cell A depends on cells B and C (via a sum formula), and B changes, A must update automatically. Model this as a directed graph where edges represent dependencies. Each cell stores either a direct value or a formula (list of dependencies). When computing a cell's value, recursively evaluate all its dependencies.

</details>

<details>
<summary>Hint 2: Formula Storage Strategy</summary>

Store formulas as lists of cell references rather than computing and caching values. When `sum(r, c, numbers)` is called, parse the numbers array to extract all individual cell references (expanding ranges like "A1:B2" into ["A1", "A2", "B1", "B2"]). Store this dependency list with the cell. When `get` is called, recursively compute the sum by getting values of all dependent cells.

</details>

<details>
<summary>Hint 3: Lazy Evaluation vs Eager Update</summary>

Two approaches exist: (1) Lazy evaluation - store formulas and compute values on-demand during `get()` calls by recursively summing dependencies. This is simpler but may be slower for repeated gets. (2) Eager update - maintain a reverse dependency graph and propagate updates through all dependent cells when `set()` is called. Lazy evaluation is typically sufficient given the constraint of at most 100 calls.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Lazy Evaluation | O(d) per get | O(n * m + f) | d is dependency depth, f is total formula cells |
| Eager Propagation | O(1) per get, O(d) per set | O(n * m + f + e) | e is edges in dependency graph |
| Topological Sort | O(v + e) per update | O(v + e) | v is cells, e is dependencies; overkill here |

## Common Mistakes

1. **Not parsing cell ranges correctly**
```python
# Wrong: doesn't expand ranges
def sum(self, row, col, numbers):
    self.formulas[(row, col)] = numbers  # Stores "A1:B2" as is
    # Later get() won't know how to sum a range

# Correct: expand ranges into individual cells
def sum(self, row, col, numbers):
    cells = []
    for num in numbers:
        if ':' in num:
            cells.extend(self.expand_range(num))
        else:
            cells.append(num)
    self.formulas[(row, col)] = cells
```

2. **Not handling formula overwriting**
```python
# Wrong: set() doesn't clear formulas
def set(self, row, col, val):
    self.cells[(row, col)] = val
    # Formula still exists and get() might return wrong value

# Correct: remove formula when setting value
def set(self, row, col, val):
    self.cells[(row, col)] = val
    if (row, col) in self.formulas:
        del self.formulas[(row, col)]
```

3. **Incorrect recursive sum calculation**
```python
# Wrong: doesn't recursively evaluate dependencies
def get(self, row, col):
    if (row, col) in self.formulas:
        return sum(self.cells[cell] for cell in self.formulas[(row, col)])
        # If dependent cells have formulas, this returns wrong value

# Correct: recursively get values
def get(self, row, col):
    if (row, col) in self.formulas:
        total = 0
        for cell_ref in self.formulas[(row, col)]:
            r, c = self.parse_cell(cell_ref)
            total += self.get(r, c)  # Recursive call
        return total
    return self.cells.get((row, col), 0)
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Add More Formula Types | Support AVERAGE, MAX, MIN formulas | Medium |
| Circular Reference Detection | Detect and report circular dependencies | Hard |
| Formula Change Notification | Notify all affected cells when a cell changes | Hard |
| Multi-Sheet Excel | Support multiple sheets with cross-sheet references | Hard |

## Practice Checklist

- [ ] Implement lazy evaluation approach
- [ ] Parse cell references correctly (e.g., "A1" to row=1, col='A')
- [ ] Expand cell ranges (e.g., "A1:B2" to ["A1", "A2", "B1", "B2"])
- [ ] Handle formula overwriting in set()
- [ ] Implement recursive get() for formulas
- [ ] Test with simple formula: sum(1, 'A', ["B1", "C1"])
- [ ] Test with range: sum(1, 'A', ["B1:C2"])
- [ ] Test formula update after set()
- [ ] **Review in 24 hours**: Re-implement from memory
- [ ] **Review in 1 week**: Solve without hints
- [ ] **Review in 2 weeks**: Implement eager propagation approach
