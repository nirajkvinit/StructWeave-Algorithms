---
id: M005
old_id: F022
slug: generate-parentheses
title: Generate Parentheses
difficulty: medium
category: medium
topics: ["backtracking", "recursion"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E020", "M017", "M046", "M078"]
prerequisites: ["recursion", "valid-parentheses"]
strategy_ref: ../strategies/patterns/backtracking.md
---
# Generate Parentheses

## Problem

Given a positive integer n, generate all possible combinations of n pairs of properly balanced parentheses. "Properly balanced" means every opening parenthesis has a matching closing parenthesis in the correct order. For n=3, valid combinations include "((()))", "(()())", "(())()", "()(())", and "()()()", but not "(((" or "())" or "(()(". The challenge is generating only valid combinations efficiently, rather than creating all possible strings and filtering out invalid ones. You need to build strings character by character, deciding at each step whether you can legally add an opening or closing parenthesis. Think about the rules: you can always add an opening parenthesis if you haven't used all n pairs yet, but when can you add a closing parenthesis? The answer reveals the key to pruning invalid paths early.

## Why This Matters

Backtracking is one of the most important algorithmic paradigms, used whenever you need to explore a space of possibilities with constraints. Compilers use backtracking for parsing expressions with nested structures like the parentheses in this problem. Game AI systems employ backtracking for move exploration in chess, Go, and puzzle solving. Configuration management tools use similar logic to generate valid system configurations from constraints. This problem teaches you to prune invalid branches before exploring them, dramatically improving efficiency. The concept of "valid at each step" versus "validate at the end" is crucial for scalable algorithms. This pattern appears in problems involving permutations, combinations, Sudoku solving, and constraint satisfaction. It's extremely common in interviews because it tests your ability to think recursively and identify pruning opportunities. The connection to Catalan numbers makes it mathematically interesting as well.

## Examples

**Example 1:**
- Input: `n = 3`
- Output: `["((()))","(()())","(())()","()(())","()()()"]`

**Example 2:**
- Input: `n = 1`
- Output: `["()"]`

## Constraints

- 1 <= n <= 8

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?
4. What rules make parentheses "well-formed"?
5. Can you prune invalid branches early?
6. How do you build strings incrementally?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding well-formed rules</summary>

What makes parentheses valid?

Consider these examples:
- Valid: "()()", "((()))", "(()())"
- Invalid: "(()", "())", ")("

**Two critical rules:**
1. At any point while reading left-to-right, the count of '(' must be ≥ count of ')'
2. Final counts must be equal: exactly n opening and n closing

**Think about:**
- Can you add a ')' when you have no unmatched '(' to close?
- Can you add more than n '(' characters?
- If you track open and close counts, what constraints apply?

**Key insight:** Build strings character by character, only adding valid characters at each step.

</details>

<details>
<summary>🎯 Hint 2: Backtracking with pruning</summary>

Use **backtracking** to build all combinations, but **prune** invalid paths early.

**State to track:**
- `current`: String being built
- `open_count`: Number of '(' added so far
- `close_count`: Number of ')' added so far

**Decision at each step:**
- Can add '(' if `open_count < n`
- Can add ')' if `close_count < open_count` (ensures we have a '(' to match)

```
For n=2, decision tree:
                    ""
                   /
                  (
                /   \
               ((    ()
              /      / \
            (()    ()(
           /       /
         (())   ()()

Pruned paths (not shown):
  - Can't add ')' when close_count >= open_count
  - Can't add '(' when open_count >= n
```

**When to add to results:**
When `open_count == close_count == n`

</details>

<details>
<summary>📝 Hint 3: Recursive backtracking implementation</summary>

```python
def generateParenthesis(n):
    result = []

    def backtrack(current, open_count, close_count):
        # Base case: valid combination complete
        if len(current) == 2 * n:
            result.append(current)
            return

        # Choice 1: Add '(' if we haven't used all n
        if open_count < n:
            backtrack(current + '(', open_count + 1, close_count)

        # Choice 2: Add ')' if it would be valid
        if close_count < open_count:
            backtrack(current + ')', open_count, close_count + 1)

    backtrack('', 0, 0)
    return result
```

**Why this works:**
- Each recursive call represents a decision point
- Only explores valid paths (pruning happens via the `if` conditions)
- Builds strings incrementally without generating invalid ones
- No need to validate after generation

**Alternative check for completion:**
```python
if open_count == n and close_count == n:
    result.append(current)
    return
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Generate all, filter invalid | O(2^(2n) × n) | O(2^(2n)) | Wastes time on invalid strings |
| **Backtracking with pruning** | **O(4^n / √n)** | **O(n)** | Optimal, only generates valid |
| Dynamic programming | O(4^n / √n) | O(4^n / √n) | Same complexity, different style |

**Time complexity explanation:**
- Total valid combinations: Catalan number C_n = 4^n / (n√n)
- Each combination takes O(n) to build/copy
- Total: O(4^n / √n)
- For practical purposes, treat as O(4^n)

**Space complexity breakdown:**
- Recursion depth: O(2n) = O(n)
- Each call stores O(n) for the string
- But strings are built incrementally (often passed by value)
- Result list: O(C_n × n) to store all valid combinations

**Why backtracking wins:**
- Never generates invalid combinations
- Prunes search space aggressively
- Clean recursive structure
- No post-processing needed

---

## Common Mistakes

### 1. Not pruning early (generating invalid strings)
```python
# WRONG: Generates all 2^(2n) combinations then filters
def generateParenthesis(n):
    def generate(current, remaining):
        if remaining == 0:
            if isValid(current):  # Expensive validation
                result.append(current)
            return
        generate(current + '(', remaining - 1)
        generate(current + ')', remaining - 1)

# CORRECT: Only generate valid combinations
def backtrack(current, open_count, close_count):
    if len(current) == 2 * n:
        result.append(current)
        return
    if open_count < n:
        backtrack(current + '(', open_count + 1, close_count)
    if close_count < open_count:
        backtrack(current + ')', open_count, close_count + 1)
```

### 2. Incorrect closing parenthesis condition
```python
# WRONG: Allows too many closing parens
if close_count < n:
    backtrack(current + ')', open_count, close_count + 1)

# CORRECT: Only close when there's an open paren to match
if close_count < open_count:
    backtrack(current + ')', open_count, close_count + 1)
```

### 3. Using global state incorrectly
```python
# WRONG: Mutable state shared across branches
current = []
def backtrack(open_count, close_count):
    current.append('(')  # Modifies shared list!
    backtrack(open_count + 1, close_count)
    current.pop()  # Must remember to undo

# CORRECT: Pass string as parameter (immutable in recursion)
def backtrack(current, open_count, close_count):
    backtrack(current + '(', open_count + 1, close_count)
```

### 4. Not handling the base case correctly
```python
# WRONG: Might add strings multiple times or too early
if open_count == n:
    result.append(current)

# CORRECT: Only add when completely built
if len(current) == 2 * n:
    result.append(current)
# OR
if open_count == n and close_count == n:
    result.append(current)
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Count valid combinations** | Return count not list | Same backtracking, increment counter |
| **K different bracket types** | (), [], {} | Track open/close counts for each type |
| **Remove invalid parens** | Fix string with min deletions | BFS or backtracking with deletion count |
| **Valid parenthesis string** | '*' can be '(', ')', or empty | Track min/max open count ranges |
| **Longest valid substring** | Find longest valid portion | Stack or DP |

**Count valid combinations (Catalan number):**
```python
def countParenthesis(n):
    count = 0

    def backtrack(open_count, close_count):
        nonlocal count
        if open_count == n and close_count == n:
            count += 1
            return

        if open_count < n:
            backtrack(open_count + 1, close_count)
        if close_count < open_count:
            backtrack(open_count, close_count + 1)

    backtrack(0, 0)
    return count

# Mathematical formula (faster):
def catalanNumber(n):
    if n <= 1:
        return 1
    result = 0
    for i in range(n):
        result += catalanNumber(i) * catalanNumber(n - 1 - i)
    return result
```

**K different bracket types:**
```python
def generateParenthesisKTypes(n, k):
    brackets = ['()', '[]', '{}'][:k]
    result = []

    def backtrack(current, open_counts):
        if len(current) == 2 * n:
            result.append(current)
            return

        total_open = sum(open_counts.values())

        # Try adding each type of opening bracket
        for i, (open_b, close_b) in enumerate(brackets):
            if open_counts[i] < n:
                new_counts = open_counts.copy()
                new_counts[i] += 1
                backtrack(current + open_b, new_counts)

        # Try adding each type of closing bracket
        for i, (open_b, close_b) in enumerate(brackets):
            if open_counts[i] > 0:
                new_counts = open_counts.copy()
                new_counts[i] -= 1
                backtrack(current + close_b, new_counts)

    backtrack('', {i: 0 for i in range(k)})
    return result
```

---

## Visual Walkthrough

```
n = 3: Generate all valid combinations of 3 pairs

Decision tree (pruned):
                        ""
                        |
                        ( open=1, close=0
                      /   \
                     (     )  ← pruned (close > open)
                  o=2,c=0
                   /    \
                  (      )
               o=3,c=0  o=2,c=1
                /         /    \
               )         (      )
            o=3,c=1   o=3,c=1  o=2,c=2
              /          /        /
             )          )        (
          o=3,c=2    o=3,c=2  o=3,c=2
            /          /         /
           )          )         )
        o=3,c=3    o=3,c=3   o=3,c=3
           |          |         |
        ((()))    (()())    (())()

Full trace for "((()))":
  Step 1: Add '(' → "(" (open=1, close=0)
  Step 2: Add '(' → "((" (open=2, close=0)
  Step 3: Add '(' → "(((" (open=3, close=0)
  Step 4: Add ')' → "((()" (open=3, close=1)
  Step 5: Add ')' → "((())" (open=3, close=2)
  Step 6: Add ')' → "((()))" (open=3, close=3) ✓

Result for n=3: ["((()))","(()())","(())()","()(())","()()()"]
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles n=0 (edge case, returns [""] or [])
- [ ] Handles n=1 (returns ["()"])
- [ ] Generates all valid combinations
- [ ] Never generates invalid combinations
- [ ] No duplicate results
- [ ] Results in consistent order (optional)

**Code Quality:**
- [ ] Clean recursive structure
- [ ] Clear base case
- [ ] Proper pruning conditions
- [ ] No global state issues
- [ ] Readable variable names

**Interview Readiness:**
- [ ] Can explain backtracking pattern in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can draw decision tree for n=2
- [ ] Can discuss Catalan number connection
- [ ] Can handle follow-up: count valid combinations

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve count variation
- [ ] Day 14: Explain to someone else
- [ ] Day 30: Quick review

---

**Strategy**: See [Backtracking Pattern](../../strategies/patterns/backtracking.md)
