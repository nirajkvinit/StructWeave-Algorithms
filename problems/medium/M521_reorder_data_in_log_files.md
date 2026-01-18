---
id: M521
old_id: A404
slug: reorder-data-in-log-files
title: Reorder Data in Log Files
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Reorder Data in Log Files

## Problem

Imagine you're building a log management system that needs to organize server entries intelligently. You have an array of log entries, where each entry is a space-separated string with a specific structure: the first word is an identifier (like "server1" or "log42"), and the remaining words are the actual log content.

These logs come in two distinct types:

- **Letter-logs**: The content after the identifier contains only lowercase letters (like "error occurred" or "system started")
- **Digit-logs**: The content after the identifier contains only numeric digits (like "8 1 5 1" or "3 6")

Your task is to reorganize these logs according to these specific rules:

1. All letter-logs must appear before any digit-logs in the result
2. Letter-logs should be sorted alphabetically by their content first. If two logs have identical content, then sort them by their identifiers
3. Digit-logs must keep their original relative order from the input (this is called stable ordering)

For example, given logs like `["dig1 8 1 5 1", "let1 art can", "dig2 3 6", "let2 own kit dig", "let3 art zero"]`, you need to group all letter-logs first (sorted alphabetically), followed by digit-logs in their original order.

## Why This Matters

This problem mirrors real-world log aggregation systems used by companies like Splunk, Datadog, and CloudWatch. When debugging production systems, engineers need to quickly find textual error messages (letter-logs) while preserving the temporal order of numerical performance metrics (digit-logs). The custom sorting rules teach you how to implement multi-level sorting criteria, a skill essential for database query optimization, search engines ranking algorithms, and data pipeline processing. You'll practice partition-based sorting, where different subsets of data follow different ordering rules, which is common in ETL (Extract-Transform-Load) workflows and distributed systems.

## Examples

**Example 1:**
- Input: `logs = ["dig1 8 1 5 1","let1 art can","dig2 3 6","let2 own kit dig","let3 art zero"]`
- Output: `["let1 art can","let3 art zero","let2 own kit dig","dig1 8 1 5 1","dig2 3 6"]`
- Explanation: All letter-log contents differ, sorted as "art can", "art zero", "own kit dig".
The digit-logs maintain their input order: "dig1 8 1 5 1", "dig2 3 6".

**Example 2:**
- Input: `logs = ["a1 9 2 3 1","g1 act car","zo4 4 7","ab1 off key dog","a8 act zoo"]`
- Output: `["g1 act car","a8 act zoo","ab1 off key dog","a1 9 2 3 1","zo4 4 7"]`

## Constraints

- 1 <= logs.length <= 100
- 3 <= logs[i].length <= 100
- All the tokens of logs[i] are separated by a **single** space.
- logs[i] is guaranteed to have an identifier and at least one word after the identifier.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
The problem requires stable partitioning (letter-logs before digit-logs) with custom sorting within partitions. The key is to separate the two log types and apply different sorting rules to each.
</details>

<details>
<summary>Main Approach</summary>
Three-step approach:
1. Partition logs into letter-logs and digit-logs based on whether the content (after first space) starts with a digit
2. Sort letter-logs using a custom comparator: primary key is content, secondary key is identifier
3. Concatenate sorted letter-logs with original-order digit-logs
</details>

<details>
<summary>Optimization Tip</summary>
Use Python's sort with a custom key function. For letter-logs, create a tuple (content, identifier) as the sort key. This naturally handles both primary and secondary sorting criteria. Digit-logs don't need sorting since they maintain input order.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Optimal (Partition + Sort) | O(M × N × log N) | O(M × N) | M = avg log length, N = number of logs |

## Common Mistakes

1. **Sorting all logs together with complex comparator**
   ```python
   # Wrong: Overly complex single-sort approach
   def compare(log1, log2):
       is_digit1 = log1.split()[1].isdigit()
       is_digit2 = log2.split()[1].isdigit()
       # Complex nested conditions...

   # Correct: Separate letter and digit logs first
   letter_logs = [log for log in logs if not log.split()[1].isdigit()]
   digit_logs = [log for log in logs if log.split()[1].isdigit()]
   letter_logs.sort(key=lambda x: (x.split()[1:], x.split()[0]))
   return letter_logs + digit_logs
   ```

2. **Incorrect parsing of identifier vs content**
   ```python
   # Wrong: Only considers first word after identifier
   content = log.split()[1]

   # Correct: Everything after first space is content
   parts = log.split(' ', 1)
   identifier, content = parts[0], parts[1]
   ```

3. **Not preserving digit-log order**
   ```python
   # Wrong: Sorting digit logs
   digit_logs.sort()

   # Correct: Keep original order
   return letter_logs + digit_logs  # digit_logs unchanged
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Custom Sort String | Medium | Custom ordering of characters |
| Largest Number | Medium | Custom comparator for numeric strings |
| Sort Array By Parity | Easy | Simpler partitioning problem |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sorting Pattern](../../strategies/patterns/sorting.md)
