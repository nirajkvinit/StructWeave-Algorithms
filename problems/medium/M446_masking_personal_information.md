---
id: M446
old_id: A298
slug: masking-personal-information
title: Masking Personal Information
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Masking Personal Information

## Problem

You're building a privacy protection system that masks sensitive personal information. Given a string `s` containing either an email address or a phone number, return the properly masked version according to specific formatting rules.

The input is guaranteed to be valid (either a correctly formatted email OR a correctly formatted phone number), so you can determine the type by checking for the presence of the `@` symbol.

**Email Address Format and Masking:**

Valid email structure:
- **Name portion**: one or more uppercase/lowercase English letters
- The `@` symbol
- **Domain portion**: uppercase/lowercase English letters with exactly one `.` character (the dot cannot be at the start or end of the domain)

Masking rules for emails:
1. Convert **all** letters in both name and domain to **lowercase**
2. In the name portion, keep only the **first** and **last** characters visible
3. Replace all characters between the first and last with exactly **5 asterisks** (`*****`)

Example: `"ProGrammer@Programming.com"` becomes `"p*****r@programming.com"`

Note: Even if the name has only 2 characters like `"AB"`, you still insert 5 asterisks between them: `"a*****b@..."`

**Phone Number Format and Masking:**

Valid phone structure:
- Contains **10 to 13 total digits** (after removing separators)
- The last 10 digits represent the **local number**
- The first 0-3 digits (if present) represent the **country code**
- May contain separator characters: `+`, `-`, `(`, `)`, or space (these are decorative and should be stripped)

Masking rules for phones:
1. Extract all digits and remove all separator characters
2. Keep the **last 4 digits** of the local number visible
3. Format based on country code length:
   - **0 digits** (10 total digits): `"***-***-XXXX"`
   - **1 digit** (11 total digits): `"+*-***-***-XXXX"`
   - **2 digits** (12 total digits): `"+**-***-***-XXXX"`
   - **3 digits** (13 total digits): `"+***-***-***-XXXX"`

   Where `XXXX` represents the last 4 visible digits.

Example: `"1(234)567-890"` has 10 digits total, so the country code length is 0, resulting in `"***-***-7890"`.

## Why This Matters

This problem simulates real-world data sanitization requirements found in every system handling user information. You'll encounter similar logic when implementing GDPR compliance, building customer service tools that display partial information, or creating logging systems that must mask sensitive data before writing to files. The challenge teaches you to handle multiple format variations, parse out noise characters, and apply different transformation rules based on input type—all critical skills for production data processing pipelines.

## Examples

**Example 1:**
- Input: `s = "ProGrammer@Programming.com"`
- Output: `"p*****r@programming.com"`
- Explanation: s is an email address.
The name and domain are converted to lowercase, and the middle of the name is replaced by 5 asterisks.

**Example 2:**
- Input: `s = "AB@qq.com"`
- Output: `"a*****b@qq.com"`
- Explanation: s is an email address.
The name and domain are converted to lowercase, and the middle of the name is replaced by 5 asterisks.
Note that even though "ab" is 2 characters, it still must have 5 asterisks in the middle.

**Example 3:**
- Input: `s = "1(234)567-890"`
- Output: `"***-***-7890"`
- Explanation: s is a phone number.
There are 10 digits, so the local number is 10 digits and the country code is 0 digits.
Thus, the resulting masked number is "***-***-7890".

## Constraints

- s is either a **valid** email or a phone number.
- If s is an email:
- 8 <= s.length <= 40
- s consists of uppercase and lowercase English letters and exactly one '@' symbol and '.' symbol.
- If s is a phone number:
- 10 <= s.length <= 20
- s consists of digits, spaces, and the symbols '(', ')', '-', and '+'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The input is guaranteed to be either a valid email or phone number. Check for the presence of '@' to distinguish between them. Email masking is straightforward string manipulation, while phone masking requires extracting digits and formatting based on count.
</details>

<details>
<summary>🎯 Main Approach</summary>
If '@' is present, it's an email: split on '@', take first and last character of name part, insert 5 asterisks between them, lowercase everything. If no '@', it's a phone: extract all digits, count them, keep last 4 visible, format based on total digit count (10-13) with appropriate country code masking.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
For phone numbers, use a filter or list comprehension to extract digits: digits = [c for c in s if c.isdigit()]. Then construct the result string based on length. For emails, use string slicing and .lower() method. No need for complex regex parsing.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| String Processing | O(n) | O(n) | Single pass through input, where n is length |

## Common Mistakes

1. **Not handling email edge case with 2-character name**
   ```python
   # Wrong: Assuming name has length > 2
   name, domain = email.split('@')
   masked_name = name[0] + '*****' + name[-1]

   # Correct: Works even when len(name) == 2
   # name[0] and name[-1] correctly give first and last
   # This is actually fine! The first and last can be the same char
   masked_name = name[0].lower() + '*****' + name[-1].lower()
   ```

2. **Incorrect phone formatting based on digit count**
   ```python
   # Wrong: Not handling country code properly
   digits = [c for c in s if c.isdigit()]
   if len(digits) == 10:
       return '***-***-' + ''.join(digits[-4:])
   else:
       # Incorrect formatting for 11, 12, 13 digits

   # Correct: Map digit count to format
   local = ''.join(digits[-10:])
   country_code_len = len(digits) - 10
   if country_code_len == 0:
       return f"***-***-{local[-4:]}"
   else:
       return f"+{'*' * country_code_len}-***-***-{local[-4:]}"
   ```

3. **Not converting email to lowercase**
   ```python
   # Wrong: Forgetting to lowercase
   masked = name[0] + '*****' + name[-1] + '@' + domain

   # Correct: Lowercase entire result
   masked = name[0].lower() + '*****' + name[-1].lower() + '@' + domain.lower()
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Credit card masking | Easy | Similar masking pattern |
| Partial reveal based on user role | Medium | Conditional masking rules |
| Reversible encryption | Hard | Two-way transformation |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [String Manipulation](../../strategies/fundamentals/string-processing.md)
