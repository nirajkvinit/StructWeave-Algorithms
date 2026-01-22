---
id: E193
old_id: A047
slug: student-attendance-record-i
title: Student Attendance Record I
difficulty: easy
category: easy
topics: ["string"]
patterns: ["string-validation", "sliding-window", "state-tracking"]
estimated_time_minutes: 15
frequency: low
prerequisites: ["string-iteration", "counter", "consecutive-elements"]
related_problems: ["E020", "M003", "M552"]
strategy_ref: ../prerequisites/strings.md
---
# Student Attendance Record I

## Problem

You're given a string representing a student's attendance record, where each character represents a single day. The character `'A'` means absent, `'L'` means late, and `'P'` means present. Your job is to determine whether this student qualifies for an attendance award based on two strict rules.

First, the student must have fewer than 2 absences total. Note that "fewer than 2" means 0 or 1 absences are acceptable, but 2 or more absences disqualify them. Second, the student must never have 3 or more consecutive late days. Even if `'L'` appears many times throughout the record, it only matters if three or more appear in a row.

Both conditions must be satisfied simultaneously. A student with 1 absence and 2 consecutive lates qualifies, but a student with 0 absences and 3 consecutive lates does not. The challenge is checking these independent conditions efficiently, potentially in a single pass through the string.

## Why This Matters

This problem models rule-based validation systems common in compliance checking, access control, and monitoring applications. The pattern of counting total occurrences while simultaneously tracking consecutive sequences appears in fraud detection (detecting suspicious transaction patterns), system health monitoring (identifying repeated failures), and quality control (spotting defect clusters). The techniques you learn translate directly to parsing log files for error patterns, validating password complexity rules, or implementing rate limiting where you need to track both total requests and consecutive bursts. Companies building SaaS platforms, security systems, or analytics tools regularly implement these kinds of multi-condition validators. The problem also introduces you to efficient string processing with early termination, a key optimization when processing large datasets.

## Examples

**Example 1:**
- Input: `s = "PPALLP"`
- Output: `true`
- Explanation: The student has fewer than 2 absences and was never late 3 or more consecutive days.

**Example 2:**
- Input: `s = "PPALLL"`
- Output: `false`
- Explanation: The student was late 3 consecutive days in the last 3 days, so is not eligible for the award.

## Constraints

- 1 <= s.length <= 1000
- s[i] is either 'A', 'L', or 'P'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Two Independent Conditions
The problem has two separate requirements that both must be true. Can you check each condition independently? Which one is simpler to verify?

### Hint 2: Counting Absences
How can you efficiently count the total number of 'A' characters? Do you need to count all of them, or can you stop early once you find too many?

### Hint 3: Detecting Consecutive Lates
For the consecutive 'L' check, you need to find if "LLL" appears anywhere in the string. Can you use a built-in string method? Alternatively, how would you track consecutive occurrences manually while iterating?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| String Contains Check | O(n) | O(1) | Check for "LLL" substring and count 'A's |
| Single Pass with Counter | O(n) | O(1) | Track absence count and consecutive lates |
| Early Termination | O(n) | O(1) | Stop as soon as either condition fails |

## Common Mistakes

### Mistake 1: Allowing exactly 2 absences
```python
# Wrong: Should be "less than 2", not "less than or equal to 2"
def checkRecord(s):
    absent_count = s.count('A')
    has_three_lates = 'LLL' in s
    return absent_count <= 2 and not has_three_lates  # Should be < 2
```
**Why it's wrong**: Problem states "strictly less than 2", meaning 0 or 1 absences are allowed, not 2.

### Mistake 2: Not resetting consecutive late counter
```python
# Wrong: Doesn't reset counter when non-'L' character appears
def checkRecord(s):
    absent_count = 0
    late_count = 0
    for c in s:
        if c == 'A':
            absent_count += 1
        if c == 'L':
            late_count += 1  # Should reset when c != 'L'
        if late_count >= 3:
            return False
    return absent_count < 2
```
**Why it's wrong**: The late_count accumulates all 'L's, not just consecutive ones. Must reset to 0 when a non-'L' character appears.

### Mistake 3: Inefficient multiple passes
```python
# Inefficient: Makes multiple passes unnecessarily
def checkRecord(s):
    # Count absences
    absent_count = 0
    for c in s:
        if c == 'A':
            absent_count += 1
    if absent_count >= 2:
        return False

    # Check for three consecutive lates
    for i in range(len(s) - 2):
        if s[i] == 'L' and s[i+1] == 'L' and s[i+2] == 'L':
            return False

    return True
```
**Why it's wrong**: While correct, this makes multiple passes. Can combine into single pass or use simpler built-in methods.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Student Attendance Record II | Hard | Count valid attendance records of length n (DP) |
| Maximum Consecutive Characters | Easy | Find longest consecutive sequence of any character |
| Valid Attendance with Different Rules | Medium | Customize rules (e.g., max 3 absences, 4 consecutive lates) |
| Count Award-Eligible Students | Medium | Given list of records, count how many qualify |
| Fix Attendance Record | Medium | Minimum changes to make record valid |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve using built-in methods (count, contains)
- [ ] Implement single-pass solution with counters
- [ ] Test edge cases: "A", "L", "LLL", "PPALLP"

**After 1 Day**
- [ ] Implement with early termination optimization
- [ ] Can you explain both conditions clearly?
- [ ] Code without looking at reference

**After 1 Week**
- [ ] Solve in under 8 minutes
- [ ] Implement most concise solution possible
- [ ] Explain time-space tradeoff of different approaches

**After 1 Month**
- [ ] Solve with generalized parameters (max absences, max consecutive)
- [ ] Implement Student Attendance Record II (hard DP variation)
- [ ] Apply consecutive element pattern to other problems

## Strategy

**Pattern**: String Validation with Multiple Conditions
**Key Insight**: Check two independent conditions: total count of one character and consecutive occurrences of another.

See [String Manipulation](../prerequisites/strings.md) for more on character counting and pattern detection.
