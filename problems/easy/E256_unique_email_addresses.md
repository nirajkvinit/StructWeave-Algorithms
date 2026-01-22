---
id: E256
old_id: A396
slug: unique-email-addresses
title: Unique Email Addresses
difficulty: easy
category: easy
topics: ["array", "string"]
patterns: ["string-parsing"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E001", "E020", "E028"]
prerequisites: ["hash-set", "string-manipulation"]
strategy_ref: ../prerequisites/hash-tables.md
---
# Unique Email Addresses

## Problem

Email addresses consist of two parts separated by an '@' symbol: a local name (before the '@') and a domain name (after the '@'). For example, in "alice@programming.com", "alice" is the local name and "programming.com" is the domain. Email routing systems apply special filtering rules to local names that affect where messages are delivered, though domain names are never modified. Two rules apply to local names only: first, any dots ('.') are completely ignored, so "alice.z@programming.com" and "alicez@programming.com" route to the same inbox; second, everything from the first plus sign ('+') onward in the local name is discarded, so "m.y+filter@email.com" routes to "my@email.com". Both rules can apply simultaneously, for instance "first.last+tag@programming.com" becomes "firstlast@programming.com". You're given an array `emails` where each element is an email address string. Your task is to calculate how many distinct actual recipients will receive mail when one message is sent to each address in the array. For example, ["test.email+alex@programming.com", "test.e.mail+bob@programming.com"] both normalize to "testemail@programming.com", counting as just one recipient. Note that different domains always represent different recipients, even if the local names normalize to the same value.

## Why This Matters

String parsing and normalization is a fundamental skill in data processing, where you must identify which representations are semantically equivalent despite superficial differences. This problem teaches you to decompose strings by delimiters, apply transformation rules selectively to components, and use hash sets for efficient duplicate detection. The email filtering scenario directly mirrors real systems like Gmail's dot and plus-sign filtering, but the pattern extends far beyond email: URL canonicalization (treating "example.com" and "www.example.com" as equivalent), file path normalization (handling "./" and "../"), username deduplication (ignoring case and special characters), and data deduplication in ETL pipelines. In technical interviews, this problem is popular because it combines string manipulation, hash table usage, and attention to detail (applying rules only to the correct component). The problem also reinforces the importance of the Single Responsibility Principle - processing the local name separately from the domain keeps your code clean and testable.

## Examples

**Example 1:**
- Input: `emails = ["test.email+alex@programming.com","test.e.mail+bob.cathy@programming.com","testemail+david@lee.tcode.com"]`
- Output: `2`
- Explanation: "testemail@programming.com" and "testemail@lee.tcode.com" actually receive mails.

**Example 2:**
- Input: `emails = ["a@programming.com","b@programming.com","c@programming.com"]`
- Output: `3`

## Constraints

- 1 <= emails.length <= 100
- 1 <= emails[i].length <= 100
- emails[i] consist of lowercase English letters, '+', '.' and '@'.
- Each emails[i] contains exactly one '@' character.
- All local and domain names are non-empty.
- Local names do not start with a '+' character.
- Domain names end with the ".com" suffix.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Conceptual Foundation
- Consider what makes two email addresses equivalent according to the routing rules
- Think about how to track unique addresses you've already encountered
- The domain name is never modified, only the local name needs processing
- What data structure efficiently tracks uniqueness?

### Tier 2: Step-by-Step Strategy
- Split each email into local and domain parts using the '@' delimiter
- For the local part: remove all dots and truncate at the first '+' sign
- Combine the normalized local part with the original domain
- Store normalized emails in a collection that automatically handles duplicates
- The size of your collection gives you the count of unique recipients

### Tier 3: Implementation Details
- Use `split('@')` to separate local from domain
- For local name normalization: `split('+')[0].replace('.', '')`
- Use a hash set to collect unique normalized addresses
- String concatenation: `normalized_local + '@' + domain`
- Return the size/length of your set

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Set with String Processing | O(n * m) | O(n * m) | n = number of emails, m = average email length |
| Brute Force (Compare All Pairs) | O(n² * m) | O(1) | Inefficient, not recommended |

**Optimal Solution**: Hash Set approach provides O(n * m) time where you process each email once.

## Common Mistakes

### Mistake 1: Forgetting to preserve domain exactly
```python
# Wrong: modifying domain
email = "a.b+c@test.com"
normalized = email.replace('.', '').split('+')[0]  # Affects domain too!

# Correct: split first, then normalize local only
local, domain = email.split('@')
normalized_local = local.split('+')[0].replace('.', '')
result = normalized_local + '@' + domain
```

### Mistake 2: Using a list instead of a set
```python
# Wrong: inefficient duplicate checking
unique_emails = []
for email in emails:
    normalized = normalize(email)
    if normalized not in unique_emails:  # O(n) lookup each time
        unique_emails.append(normalized)

# Correct: use set for O(1) lookup
unique_emails = set()
for email in emails:
    normalized = normalize(email)
    unique_emails.add(normalized)  # O(1) insertion and deduplication
```

### Mistake 3: Not handling edge cases
```python
# Wrong: assumes '+' always exists
local_part = local.split('+')[0]  # Works even without '+'

# But be careful with empty results:
# Wrong: not checking for multiple '@' symbols
parts = email.split('@')  # Assumes exactly one '@'

# Correct: the problem guarantees exactly one '@', so this is safe
# But in real-world code, validate your assumptions
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Case-insensitive emails | Easy | Normalize to lowercase before comparison |
| Multiple domains with different rules | Medium | Use a map of domain to rule set |
| Find duplicate email groups | Medium | Store original emails mapped to normalized form |
| Validate email format | Easy | Add regex validation before processing |
| Count frequency of each unique email | Easy | Use hash map instead of hash set |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solved independently on first attempt
- [ ] Completed within 15 minutes
- [ ] Identified hash set as the optimal data structure
- [ ] Handled string parsing correctly (split, replace operations)
- [ ] Wrote bug-free code on first submission
- [ ] Explained solution clearly to someone else
- [ ] Solved without hints after 1 day
- [ ] Solved without hints after 1 week
- [ ] Implemented alternative approach (without built-in split)
- [ ] Identified time and space complexity correctly

**Spaced Repetition Schedule**: Review on Day 1, Day 3, Day 7, Day 14, Day 30

**Strategy**: See [Hash Tables](../prerequisites/hash-tables.md)
