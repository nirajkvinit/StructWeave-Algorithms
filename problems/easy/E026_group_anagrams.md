---
id: E026
old_id: F049
slug: group-anagrams
title: Group Anagrams
difficulty: easy
category: easy
topics: ["array", "string", "hash-table"]
patterns: ["hash-map-grouping", "string-sorting"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E242", "E438", "M049"]
prerequisites: ["arrays-basics", "hash-table-basics", "string-manipulation"]
---
# Group Anagrams

## Problem

Given an array of strings, group together all strings that are anagrams of each other. Two strings are anagrams if they contain exactly the same characters with the same frequencies, just in different orders. For example, "eat", "tea", and "ate" are all anagrams because they each contain one 'e', one 'a', and one 't'.

Your task is to return a list of groups, where each group contains all the anagrams of a particular pattern. For input ["eat","tea","tan","ate","nat","bat"], you should return [["eat","tea","ate"], ["tan","nat"], ["bat"]] (the order of groups and strings within groups doesn't matter).

The key insight is finding a way to identify which strings are anagrams efficiently. If you sorted the characters in "eat", you'd get "aet". If you sorted "tea", you'd also get "aet". This sorted form can serve as a unique identifier or "key" for all anagrams, allowing you to group them together using a hash map. The challenge is doing this efficiently for potentially thousands of strings.

## Why This Matters

This problem demonstrates the power of hash maps for grouping and categorization. It teaches:
- **Canonical representation**: Converting different forms to a standard key
- **Hash map grouping pattern**: Using hash tables to cluster related data
- **Trade-off analysis**: Sorting vs. counting for string comparison

**Real-world applications:**
- Search engines grouping similar queries
- Plagiarism detection systems
- DNA sequence analysis and clustering
- Natural language processing for word similarity

## Examples

**Example 1:**
- Input: `strs = ["eat","tea","tan","ate","nat","bat"]`
- Output: `[["bat"],["nat","tan"],["ate","eat","tea"]]`

**Example 2:**
- Input: `strs = [""]`
- Output: `[[""]]`

**Example 3:**
- Input: `strs = ["a"]`
- Output: `[["a"]]`

## Constraints

- 1 <= strs.length <= 10⁴
- 0 <= strs[i].length <= 100
- strs[i] consists of lowercase English letters.

## Think About

1. What makes two strings anagrams of each other?
2. How can you generate a unique identifier for all anagrams?
3. Which data structure is best for grouping items by a key?
4. Should you sort the strings or count their characters?

---

## Approach Hints

<details>
<summary>💡 Hint 1: What defines an anagram?</summary>

Two strings are anagrams if they contain the same characters with the same frequencies, just in different orders.

**Think about:**
- "eat" and "tea" both have: 1 'e', 1 'a', 1 't'
- If you sorted both strings, what would they become?
- Can you use this sorted form as a grouping key?

</details>

<details>
<summary>🎯 Hint 2: The canonical key insight</summary>

Create a **canonical representation** for each string that's identical for all anagrams.

**Two approaches:**
1. **Sorting**: Sort the characters alphabetically
   - "eat" → "aet"
   - "tea" → "aet"
   - "bat" → "abt"

2. **Character counting**: Count frequency of each character
   - "eat" → (1,0,0,0,1,0,...,1,0,...) for 'a','b',...,'z'
   - "tea" → same pattern

Use this canonical form as a hash map key to group all anagrams together.

</details>

<details>
<summary>📝 Hint 3: Hash map grouping algorithm</summary>

```
function groupAnagrams(strings):
    groups = new HashMap<String, List<String>>()

    for each string in strings:
        # Create canonical key (sorted version)
        key = sort_characters(string)  # e.g., "eat" → "aet"

        # Add string to its group
        if key not in groups:
            groups[key] = []
        groups[key].append(string)

    # Return all groups as list
    return groups.values()
```

**Alternative key generation (character count):**
```
# Instead of sorting, use character frequency
key = character_frequency_tuple(string)
# "eat" → (1,0,0,0,1,0,...,1,0,0) representing counts of a-z
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force (compare all pairs) | O(n² * k) | O(n * k) | n=strings, k=max length; too slow |
| **Sorting as Key** | **O(n * k log k)** | **O(n * k)** | Most common; simple to implement |
| Character Count as Key | O(n * k) | O(n * k) | Optimal time; more complex |

**Why Sorting Approach:**
- Time: O(n * k log k) where sorting each string takes O(k log k)
- Space: O(n * k) to store all strings and keys
- Simple and readable code
- Hash map provides O(1) average lookup

**Character Count Optimization:**
- Time: O(n * k) - counting is linear
- Uses tuple of 26 counts as key: `(count_a, count_b, ..., count_z)`
- Faster but more verbose

---

## Common Mistakes

### 1. Not handling empty strings
```
# WRONG: Might fail on empty string edge case
key = sorted(string)  # What if string is ""?

# CORRECT: Empty string sorts to empty string, works fine
key = ''.join(sorted(string))  # "" → ""
```

### 2. Using list as hash key
```
# WRONG: Lists aren't hashable in most languages
key = sorted(string)  # Returns a list
groups[key] = ...  # Error: unhashable type 'list'

# CORRECT: Convert to string or tuple
key = ''.join(sorted(string))  # String is hashable
# or
key = tuple(sorted(string))  # Tuple is hashable
```

### 3. Inefficient character counting
```
# INEFFICIENT: Creating strings for keys
counts = [0] * 26
for char in string:
    counts[ord(char) - ord('a')] += 1
key = str(counts)  # String conversion is slow

# BETTER: Use tuple directly
key = tuple(counts)  # Tuples are hashable and efficient
```

### 4. Forgetting output format
```
# WRONG: Returning the hash map
return groups  # Returns dict, not list of lists

# CORRECT: Return values as list
return list(groups.values())
# or
return [group for group in groups.values()]
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Case-insensitive** | "Eat" and "Tea" are anagrams | Convert to lowercase before sorting |
| **Unicode characters** | Beyond a-z | Character count needs larger array or dict |
| **Return largest group** | Find biggest anagram group | Track max size while building groups |
| **Count anagram groups** | Return number of groups | Return `len(groups)` instead of groups |
| **Find anagram pairs** | Return pairs only | Filter groups with size > 1 |
| **Custom comparison** | Ignore certain characters | Preprocess strings before grouping |

**Variation: Case-insensitive grouping:**
```
def groupAnagrams(strings):
    groups = {}
    for string in strings:
        # Convert to lowercase, then sort
        key = ''.join(sorted(string.lower()))
        if key not in groups:
            groups[key] = []
        groups[key].append(string)
    return list(groups.values())
```

**Variation: Character count approach (optimal time):**
```
def groupAnagrams(strings):
    groups = {}
    for string in strings:
        # Count character frequencies
        count = [0] * 26
        for char in string:
            count[ord(char) - ord('a')] += 1

        # Use tuple as key
        key = tuple(count)

        if key not in groups:
            groups[key] = []
        groups[key].append(string)

    return list(groups.values())
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles basic case (Example 1)
- [ ] Handles empty string (Example 2)
- [ ] Handles single string (Example 3)
- [ ] Groups all anagrams together correctly
- [ ] Returns list of lists, not dict

**Optimization:**
- [ ] Achieved O(n * k log k) or better
- [ ] Used hash map for O(1) grouping
- [ ] Avoided comparing all pairs (O(n²))

**Interview Readiness:**
- [ ] Can explain sorting approach in 2 minutes
- [ ] Can code solution in 5 minutes
- [ ] Can discuss character count optimization
- [ ] Can explain time/space trade-offs
- [ ] Can handle follow-up: "How to make it faster?"

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve with sorting
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement character count version
- [ ] Day 14: Solve related problem (Valid Anagram)
- [ ] Day 30: Quick review and complexity analysis

---

**Strategy**: See [Hash Map Grouping](../../strategies/patterns/hash-map-grouping.md) | [String Processing](../../prerequisites/strings.md)
