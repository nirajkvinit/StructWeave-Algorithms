---
id: M069
old_id: F165
slug: compare-version-numbers
title: Compare Version Numbers
difficulty: medium
category: medium
topics: ["string", "two-pointers"]
patterns: ["string-parsing"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M068", "M070", "E001"]
prerequisites: ["string-manipulation", "parsing", "comparison"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Compare Version Numbers

## Problem

Given two version number strings like "1.01" and "1.001" or "1.0" and "1.0.0", compare them and return -1 if the first version is smaller, 0 if they're equal, and 1 if the first is greater. Version numbers consist of numeric revision levels separated by dots. The tricky parts are: leading zeros should be ignored (so "01" equals "1"), missing revisions are treated as zero (so "1.0" equals "1.0.0"), and you must compare numerically not lexicographically (so "1.10" is greater than "1.9", not less than it as string comparison would suggest). For example, "0.1" versus "1.1" returns -1 because 0 < 1 at the first revision level. "1.0.1" versus "1" returns 1 because after comparing the first levels (both 1), the second level is 0 vs 0, and the third level is 1 vs 0 (treated as 0). You can split the strings by dot and compare revision by revision, or parse them on-the-fly using two pointers to save space.

## Why This Matters

Version comparison is fundamental to package managers like npm, pip, Maven, and apt, which need to determine if installed versions satisfy dependency requirements or if updates are available. Software update systems compare currently running version against available versions to decide whether to prompt users for upgrades. API versioning in web services compares request version headers against supported versions to route requests to compatible handlers. Mobile app stores compare app version numbers to determine update eligibility and backward compatibility. Container orchestration systems like Kubernetes compare image tags to decide which containers need pulling. Database migration tools compare schema versions to determine which migrations to apply. The skills you learn - parsing structured strings, handling leading zeros, dealing with variable-length formats - apply broadly to parsing semantic versions, IP addresses, dates in various formats, hierarchical identifiers, and any dotted-notation data that needs ordering or comparison in systems programming.

## Examples

**Example 1:**
- Input: `version1 = "1.01", version2 = "1.001"`
- Output: `0`
- Explanation: Ignoring leading zeroes, both "01" and "001" represent the same integer "1".

**Example 2:**
- Input: `version1 = "1.0", version2 = "1.0.0"`
- Output: `0`
- Explanation: version1 does not specify revision 2, which means it is treated as "0".

**Example 3:**
- Input: `version1 = "0.1", version2 = "1.1"`
- Output: `-1`
- Explanation: version1's revision 0 is "0", while version2's revision 0 is "1". 0 < 1, so version1 < version2.

## Constraints

- 1 <= version1.length, version2.length <= 500
- version1 and version2 only contain digits and '.'.
- version1 and version2 **are valid version numbers**.
- All the given revisions in version1 and version2 can be stored in a **32-bit integer**.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Split vs. Parse</summary>

You could split both strings by '.' and compare arrays, but this creates extra space. Alternatively, parse on-the-fly comparing revision numbers one at a time. Leading zeros complicate comparison - how do you handle "01" vs "1"?

</details>

<details>
<summary>🎯 Hint 2: Two Pointer Parsing</summary>

Use two pointers (one for each version string) to extract revision numbers segment by segment. Parse each segment as an integer (this automatically handles leading zeros). Compare the integers at each level and return early if they differ.

</details>

<details>
<summary>📝 Hint 3: Unequal Length Handling</summary>

When one version string is shorter, treat missing revisions as 0. For example, "1.0" is equivalent to "1.0.0.0...". Continue iterating until both pointers reach the end of their respective strings.

Pseudocode:
```
i = 0, j = 0
while i < len(v1) or j < len(v2):
    num1 = extract_next_revision(v1, i)
    num2 = extract_next_revision(v2, j)
    if num1 < num2: return -1
    if num1 > num2: return 1
return 0
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Split + Array Compare | O(m + n) | O(m + n) | Creates arrays for each version |
| **Optimal (Two Pointer Parse)** | **O(m + n)** | **O(1)** | Parse on-the-fly, no extra storage |

## Common Mistakes

### 1. String Comparison Instead of Integer

```python
# WRONG: Lexicographic comparison fails for numbers
def compareVersion(v1, v2):
    parts1 = v1.split('.')
    parts2 = v2.split('.')
    return (parts1 > parts2) - (parts1 < parts2)  # "2" > "10" is True!

# CORRECT: Convert to integers
def compareVersion(v1, v2):
    parts1 = [int(x) for x in v1.split('.')]
    parts2 = [int(x) for x in v2.split('.')]
    # ... compare integers
```

### 2. Not Handling Different Lengths

```python
# WRONG: Fails when lengths differ
def compareVersion(v1, v2):
    parts1 = v1.split('.')
    parts2 = v2.split('.')
    for i in range(min(len(parts1), len(parts2))):
        # ... misses trailing zeros

# CORRECT: Pad or iterate to max length
def compareVersion(v1, v2):
    parts1 = v1.split('.')
    parts2 = v2.split('.')
    max_len = max(len(parts1), len(parts2))
    for i in range(max_len):
        num1 = int(parts1[i]) if i < len(parts1) else 0
        num2 = int(parts2[i]) if i < len(parts2) else 0
```

### 3. Not Handling Leading Zeros

```python
# WRONG: String comparison with leading zeros
if parts1[i] < parts2[i]:  # "01" < "1" is False!

# CORRECT: Convert to integer first
if int(parts1[i]) < int(parts2[i]):
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Semantic Versioning | Major.Minor.Patch with special rules | Add priority weighting to comparisons |
| Alphanumeric Versions | Include letters (e.g., "1.0a") | Parse and compare string segments separately |
| Wildcard Matching | Support wildcards (e.g., "1.*") | Add pattern matching logic |
| Return Distance | Return how many revisions differ | Count differences instead of early return |

## Practice Checklist

- [ ] Handles empty/edge cases (single revision, trailing zeros)
- [ ] Can explain approach in 2 min (split or two-pointer parsing)
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity (O(m+n) time, O(1) or O(m+n) space)
- [ ] Handles leading zeros and unequal lengths

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
