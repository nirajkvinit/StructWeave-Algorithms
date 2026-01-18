---
id: M205
old_id: I254
slug: assign-cookies
title: Assign Cookies
difficulty: medium
category: medium
topics: ["array", "greedy", "sorting"]
patterns: ["two-pointer", "greedy"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M135", "M455", "M881"]
prerequisites: ["greedy-algorithms", "two-pointer", "sorting"]
---
# Assign Cookies

## Problem

You're distributing cookies to children, aiming to maximize the number of satisfied children. Each child has a greed factor `g[i]` representing the minimum cookie size they'll accept. Each cookie has a size `s[j]`. A child is satisfied only if they receive a cookie at least as large as their greed factor (where `s[j] >= g[i]`). Each child can receive at most one cookie, and each cookie can be given to at most one child.

The greedy strategy here involves making locally optimal choices at each step. Should you give your largest cookies to the most demanding children, or save those for later? Should you try to satisfy children in a particular order? The key insight is that wasting a large cookie on a child who would be satisfied with a smaller cookie is inefficient.

By sorting both arrays and using a two-pointer technique, you can efficiently match each child with the smallest cookie that satisfies them. This ensures you don't waste large cookies and maximizes the total number of happy children. Edge cases include having no cookies, having more cookies than children, or having all children with greed factors larger than your largest cookie.

## Why This Matters

This greedy algorithm pattern models real-world resource allocation problems like assigning servers to requests, matching tasks to workers based on skill levels, or distributing limited supplies based on need. The two-pointer technique combined with sorting is a fundamental pattern that appears in countless optimization problems. Understanding when greedy algorithms produce optimal solutions (versus when dynamic programming is needed) is a critical skill for algorithm design. This problem type frequently appears in interviews to test your ability to recognize greedy opportunities and implement efficient matching strategies with sorted data.

## Examples

**Example 1:**
- Input: `g = [1,2,3], s = [1,1]`
- Output: `1`
- Explanation: There are 3 children with satisfaction thresholds 1, 2, and 3, and 2 cookies both of size 1.
Since both cookies have size 1, only the child with threshold 1 can be satisfied.
The answer is 1.

**Example 2:**
- Input: `g = [1,2], s = [1,2,3]`
- Output: `2`
- Explanation: There are 2 children with satisfaction thresholds 1 and 2, and 3 cookies with sizes 1, 2, and 3.
The available cookies are large enough to satisfy both children.
The answer is 2.

## Constraints

- 1 <= g.length <= 3 * 10⁴
- 0 <= s.length <= 3 * 10⁴
- 1 <= g[i], s[j] <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Greedy Assignment</summary>

The key insight is to use a greedy approach: assign the smallest cookie that satisfies each child. By sorting both arrays, you can use two pointers to efficiently match children with cookies. Start with the least demanding child and try to satisfy them with the smallest available cookie that meets their requirement.

</details>

<details>
<summary>🎯 Hint 2: Two Pointer Strategy</summary>

Sort both the greed array (children) and size array (cookies) in ascending order. Use two pointers: one for children and one for cookies. If the current cookie satisfies the current child, assign it and move both pointers forward. If not, move only the cookie pointer to try a larger cookie. This ensures each cookie is optimally assigned.

</details>

<details>
<summary>📝 Hint 3: Implementation Algorithm</summary>

```
Sort g (children greed) in ascending order
Sort s (cookie sizes) in ascending order

child_index = 0
cookie_index = 0
satisfied = 0

While child_index < len(g) AND cookie_index < len(s):
    if s[cookie_index] >= g[child_index]:
        # Cookie satisfies child
        satisfied += 1
        child_index += 1
    cookie_index += 1  # Try next cookie

Return satisfied
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (try all assignments) | O(2^n) | O(n) | Exponential, infeasible |
| Greedy with Sorting | O(n log n + m log m) | O(1) | Optimal, n = children, m = cookies |
| Hash-based | O(n + m) | O(m) | Not applicable here, no lookup needed |

**Recommended approach:** Greedy with sorting and two pointers (O(n log n + m log m) time, O(1) space)

## Common Mistakes

### Mistake 1: Not sorting both arrays
**Wrong:**
```python
def findContentChildren(g, s):
    # Only sorting one array
    g.sort()
    satisfied = 0
    used = [False] * len(s)

    for greed in g:
        for i in range(len(s)):
            if not used[i] and s[i] >= greed:
                satisfied += 1
                used[i] = True
                break
    return satisfied
# O(n * m) - inefficient
```

**Correct:**
```python
def findContentChildren(g, s):
    g.sort()  # Sort children by greed
    s.sort()  # Sort cookies by size

    child_i = 0
    cookie_i = 0
    satisfied = 0

    while child_i < len(g) and cookie_i < len(s):
        if s[cookie_i] >= g[child_i]:
            satisfied += 1
            child_i += 1
        cookie_i += 1

    return satisfied
# O(n log n + m log m) - efficient
```

### Mistake 2: Assigning larger cookies to less greedy children
**Wrong:**
```python
# Starting with larger cookies or more greedy children
g.sort(reverse=True)  # Wrong direction
s.sort(reverse=True)
# This wastes large cookies on children who could be satisfied with smaller ones
```

**Correct:**
```python
# Sort in ascending order - greedy approach
g.sort()  # Least greedy first
s.sort()  # Smallest cookie first
# This ensures we don't waste large cookies
```

### Mistake 3: Moving both pointers when cookie is too small
**Wrong:**
```python
while child_i < len(g) and cookie_i < len(s):
    if s[cookie_i] >= g[child_i]:
        satisfied += 1
        child_i += 1
        cookie_i += 1
    else:
        child_i += 1  # Wrong: skip child instead of trying larger cookie
        cookie_i += 1
```

**Correct:**
```python
while child_i < len(g) and cookie_i < len(s):
    if s[cookie_i] >= g[child_i]:
        satisfied += 1
        child_i += 1
    cookie_i += 1  # Always try next cookie (whether assigned or not)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Assign Cookies with costs | Medium | Minimize cost while satisfying children |
| Multiple cookies per child | Hard | Each child can receive multiple cookies |
| Maximum satisfaction value | Medium | Maximize total satisfaction instead of count |
| Candy distribution (equal neighbors) | Hard | Different constraints on assignment |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Understood greedy strategy
- [ ] Implemented with two pointers
- [ ] Handled edge cases (no cookies, no children, no match possible)
- [ ] Verified sorting order
- [ ] Tested with custom cases
- [ ] Reviewed after 1 day
- [ ] Reviewed after 1 week
- [ ] Could explain solution to others
- [ ] Comfortable with variations

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
