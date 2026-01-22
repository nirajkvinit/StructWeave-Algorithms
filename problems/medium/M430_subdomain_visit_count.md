---
id: M430
old_id: A278
slug: subdomain-visit-count
title: Subdomain Visit Count
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Subdomain Visit Count

## Problem

Domain names follow a hierarchical structure from specific to general, separated by dots. For example, "forum.programming.com" contains three levels:
- Third-level (most specific): "forum.programming.com"
- Second-level: "programming.com"
- Top-level (most general): "com"

When someone visits a domain, all parent domains in the hierarchy also receive credit for that visit. So a single visit to "forum.programming.com" counts as one visit to each of: "forum.programming.com", "programming.com", and "com". This aggregation is important for tracking traffic at different levels of specificity.

You're given an array `cpdomains` where each element is a **count-paired domain** string formatted as `"count domain"`. For example, `"9001 forum.programming.com"` indicates that "forum.programming.com" received 9001 visits. Each visit contributes to the count of that domain and all its parent domains.

Your task is to aggregate all these visits and return the total visit count for every unique domain and subdomain that appears. The output should be an array of count-paired strings in the format `"count domain"`, and the order doesn't matter.

For clarity, when processing `"900 google.mail.com"`, you add 900 visits to three domains: "google.mail.com", "mail.com", and "com". If you later process `"1 intel.mail.com"`, you add 1 visit to "intel.mail.com", "mail.com", and "com", resulting in "mail.com" having 901 total visits and "com" having 901 total visits (assuming these are the only inputs).

## Why This Matters

This problem models hierarchical data aggregation, which appears in many real-world scenarios: web analytics tracking traffic at different domain levels, file system usage analysis (aggregating disk space by directory and parent directories), organizational reporting (rolling up metrics from teams to departments to divisions), and DNS query logging. The pattern of parsing structured strings and accumulating counts in a hash map is fundamental to log processing, metrics aggregation, and data pipeline development. Understanding how to efficiently navigate hierarchical structures and aggregate data at multiple levels is crucial for building scalable analytics systems and monitoring infrastructure.

## Examples

**Example 1:**
- Input: `cpdomains = ["9001 forum.programming.com"]`
- Output: `["9001 programming.com","9001 forum.programming.com","9001 com"]`
- Explanation: The single input domain "forum.programming.com" with 9001 visits contributes:
- 9001 visits to "forum.programming.com"
- 9001 visits to "programming.com"
- 9001 visits to "com"

**Example 2:**
- Input: `cpdomains = ["900 google.mail.com", "50 yahoo.com", "1 intel.mail.com", "5 wiki.org"]`
- Output: `["901 mail.com","50 yahoo.com","900 google.mail.com","5 wiki.org","5 org","1 intel.mail.com","951 com"]`
- Explanation: Aggregating visits across all domains:
- "mail.com": 900 (from google) + 1 (from intel) = 901
- "com": 900 (from google) + 50 (from yahoo) + 1 (from intel) = 951
- "org": 5 (from wiki)
All other domains retain their original counts.

## Constraints

- 1 <= cpdomain.length <= 100
- 1 <= cpdomain[i].length <= 100
- cpdomain[i] follows either the "repi d1i.d2i.d3i" format or the "repi d1i.d2i" format.
- repi is an integer in the range [1, 10⁴].
- d1i, d2i, and d3i consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Each domain contributes its visit count to itself and all parent domains. Use a hash map to accumulate counts. For a domain like "a.b.c.com", you need to add counts to "a.b.c.com", "b.c.com", "c.com", and "com".
</details>

<details>
<summary>Main Approach</summary>
Parse each count-domain pair to extract the count and domain. Split the domain by dots and iterate from right to left, building each subdomain progressively. For each subdomain, add the count to a hash map. Finally, format the hash map entries as count-domain strings.
</details>

<details>
<summary>Optimization Tip</summary>
Build subdomains by finding dot positions instead of repeated string splits. Alternatively, reverse the domain parts and accumulate from the end. Use defaultdict to avoid checking if keys exist.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash Map with String Split | O(n * m) | O(n * m) | n = input length, m = avg domain depth |
| Optimal | O(n * m) | O(n * m) | Space dominated by unique subdomain storage |

## Common Mistakes

1. **Not handling all subdomain levels**
   ```python
   # Wrong: Only splitting once and missing intermediate levels
   count, domain = pair.split()
   parts = domain.split('.')
   counts[parts[-1]] += int(count)  # Only top-level

   # Correct: Build all subdomains from right to left
   parts = domain.split('.')
   for i in range(len(parts)):
       subdomain = '.'.join(parts[i:])
       counts[subdomain] += int(count)
   ```

2. **Incorrect string parsing**
   ```python
   # Wrong: Assuming fixed format without proper parsing
   count = int(pair[0])
   domain = pair[1:]

   # Correct: Use split with space delimiter
   count, domain = pair.split(' ')
   count = int(count)
   ```

3. **Building subdomains from left to right**
   ```python
   # Wrong: Building from leftmost part (incorrect hierarchy)
   parts = domain.split('.')
   for i in range(len(parts)):
       subdomain = '.'.join(parts[:i+1])

   # Correct: Build from rightmost (root) to leftmost
   for i in range(len(parts)):
       subdomain = '.'.join(parts[i:])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| File System Path Aggregation | Easy | Similar hierarchy with different delimiter |
| URL Visit Counting | Medium | Parse query parameters and paths |
| Prefix Sum on Hierarchy | Medium | Tree-based aggregation with parent-child |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Tables](../../prerequisites/hash-tables.md)
