---
id: H086
old_id: A076
slug: tag-validator
title: Tag Validator
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Tag Validator

## Problem

You receive a string containing a code snippet. Build a validator that determines whether the code follows proper tag syntax rules.

The code is considered valid when these conditions are satisfied:

	- The entire code must be enclosed within a properly formed closed tag.
	- Closed tags follow this structure: `<TAG_NAME>TAG_CONTENT</TAG_NAME>`, where the opening `<TAG_NAME>` and closing `</TAG_NAME>` must use identical tag names. Both the tag name and content must meet validity requirements.
	- Tag names are valid only when they consist exclusively of uppercase letters with a length between 1 and 9 characters inclusive.
	- Tag content is valid when it contains only valid nested closed tags, CDATA sections, and regular characters. It cannot have unmatched `<` symbols, mismatched opening/closing tags, or tags with invalid names.
	- Tags must be properly balanced. An opening tag without a matching closing tag (or vice versa) with the same name is invalid. Nested tags must maintain proper nesting structure.
	- Every `<` must have a corresponding `>`. Characters following `<` or `</` up to the next `>` are interpreted as the tag name.
	- CDATA sections use the format `<![CDATA[CDATA_CONTENT]]>`, where content spans from `<![CDATA[` to the first occurrence of `]]>`.
	- CDATA content can contain any characters. The parser must treat everything inside CDATA as literal text, ignoring any tag-like patterns.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `code = "<DIV>This is the first line <![CDATA[]]></DIV>"`
- Output: `true`
- Explanation: Valid code enclosed by matching `<DIV>` and `</DIV>` tags.
The tag name meets requirements, and the content includes text plus a CDATA section.
Even though the CDATA section internally has characters resembling tags, they're treated as literal text.
Therefore, the content is valid, making the entire code valid.

**Example 2:**
- Input: `code = "<DIV>>>  ![cdata[]] <![CDATA[]>]]>]]>>]</DIV>"`
- Output: `true`
- Explanation: Breaking down the structure: opening tag, content, closing tag.
Opening: `<DIV>`
Closing: `</DIV>`
Content breakdown: plain text, CDATA, more plain text.
First text: `>>  ![cdata[]] `
CDATA: `<![CDATA[]>]]>` containing `]>` as the actual data
Second text: `]]>>]`
The opening tag stops at the first `>`, not extending to `>>>`.
The CDATA section ends at the first `]]>` occurrence.

**Example 3:**
- Input: `code = "<A>  <B> </A>   </B>"`
- Output: `false`
- Explanation: Tags are improperly nested. The `<B>` tag overlaps incorrectly with `<A>`.

## Constraints

- 1 <= code.length <= 500
- code consists of English letters, digits, '<', '>', '/', '!', '[', ']', '.', and ' '.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a parsing problem that requires state machine thinking. You need to handle three distinct states: parsing tags, parsing CDATA sections, and parsing regular content. CDATA sections take precedence and must be detected before tag parsing. Use a stack to track open tags.
</details>

<details>
<summary>Main Approach</summary>
Iterate through the string character by character. When encountering '<', determine if it's a CDATA start, opening tag, or closing tag. For CDATA, skip everything until ']]>'. For tags, extract the tag name, validate it, and push/pop from a stack. Ensure the entire code is wrapped in a valid outer tag and the stack is empty at the end.
</details>

<details>
<summary>Optimization Tip</summary>
Check if the code starts with '<' and ends with '>' early to fail fast. When parsing CDATA, use string methods to find ']]>' instead of character-by-character iteration. Validate tag names inline rather than with separate regex or validation functions to avoid overhead.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Regex Parsing | O(n^2) | O(n) | Regex backtracking can be expensive |
| Optimal | O(n) | O(n) | Single pass with stack, n = string length |

## Common Mistakes

1. **Not prioritizing CDATA detection**
   ```python
   # Wrong: Checking for tags before CDATA
   if s[i] == '<':
       if s[i:i+2] == '</':
           parse_closing_tag()
       elif s[i:i+9] == '<![CDATA[':  # Too late, already in tag parsing

   # Correct: Check CDATA first
   if s[i:i+9] == '<![CDATA[':
       skip_to_cdata_end()
   elif s[i] == '<':
       parse_tag()
   ```

2. **Allowing content before the first tag**
   ```python
   # Wrong: Not checking if code starts with tag
   stack = []
   for char in code:
       parse(char)
   return len(stack) == 0

   # Correct: Entire code must be wrapped in valid tag
   if not code.startswith('<') or not code.endswith('>'):
       return False
   # First tag must be opening tag, not CDATA or text
   ```

3. **Incorrect tag name validation**
   ```python
   # Wrong: Accepting lowercase or long tag names
   def is_valid_tag_name(name):
       return name.isalpha()  # Missing uppercase and length checks

   # Correct: Strictly validate per requirements
   def is_valid_tag_name(name):
       return (1 <= len(name) <= 9 and
               name.isalpha() and
               name.isupper())
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Parentheses | Easy | Simple stack matching without content parsing |
| HTML Parser | Medium | Similar but different tag rules |
| XML Parser | Hard | Full XML specification with attributes |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Stack Patterns](../../strategies/patterns/stack-based-problems.md)
