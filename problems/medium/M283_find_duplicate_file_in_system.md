---
id: M283
old_id: A086
slug: find-duplicate-file-in-system
title: Find Duplicate File in System
difficulty: medium
category: medium
topics: ["hash-table", "string"]
patterns: ["grouping", "hashing"]
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: E049
    name: Group Anagrams
    difficulty: easy
  - id: M150
    name: Group Shifted Strings
    difficulty: medium
  - id: M200
    name: Find Duplicate Subtrees
    difficulty: medium
prerequisites:
  - concept: Hash tables and dictionaries
    level: basic
  - concept: String parsing
    level: basic
  - concept: Grouping with hashing
    level: intermediate
---
# Find Duplicate File in System

## Problem

You're building a duplicate file detector for a file system. Given a list of directory information, find all groups of files that contain identical content. Each element in the input `paths` array describes one directory and all files within it, using a specific encoded format.

Understanding the input format is critical. Each string in `paths` looks like:

`"root/d1/d2/.../dm f1.txt(f1_content) f2.txt(f2_content) ... fn.txt(fn_content)"`

Breaking this down:
- The first part (up to the first space) is the directory path: `"root/d1/d2/.../dm"`
- Everything after the space is a series of file entries
- Each file entry has the format `filename(content)` where content is enclosed in parentheses
- `n >= 1` means there's at least one file per directory
- `m >= 0` means the path can be just "root" (when m=0, no subdirectories)

For example: `"root/a 1.txt(abcd) 2.txt(efgh)"` means:
- Directory: "root/a"
- File 1: "1.txt" with content "abcd" -> full path is "root/a/1.txt"
- File 2: "2.txt" with content "efgh" -> full path is "root/a/2.txt"

Your task is to return groups of files where each group contains files with identical content. Only return groups with 2 or more files (singletons aren't duplicates). The challenge involves parsing the encoded format correctly, grouping files by content efficiently, and building the proper output paths.

## Why This Matters

Duplicate file detection is a real system administration task found in backup software, cloud storage deduplication, and disk cleanup tools. Companies like Dropbox and Google Drive use content hashing to avoid storing multiple copies of identical files, saving massive amounts of storage. This problem teaches the fundamental "grouping by property" pattern using hash tables, where you map from a shared characteristic (content) to all items with that characteristic (file paths). This same pattern appears in anagram grouping, finding similar records in databases, and clustering problems. The string parsing aspect mirrors real-world data processing where you extract structured information from formatted text like logs, CSV files, or API responses.

## Examples

**Example 1:**
- Input: `paths = ["root/a 1.txt(abcd) 2.txt(efgh)","root/c 3.txt(abcd)","root/c/d 4.txt(efgh)","root 4.txt(efgh)"]`
- Output: `[["root/a/2.txt","root/c/d/4.txt","root/4.txt"],["root/a/1.txt","root/c/3.txt"]]`

**Example 2:**
- Input: `paths = ["root/a 1.txt(abcd) 2.txt(efgh)","root/c 3.txt(abcd)","root/c/d 4.txt(efgh)"]`
- Output: `[["root/a/2.txt","root/c/d/4.txt"],["root/a/1.txt","root/c/3.txt"]]`

## Constraints

- 1 <= paths.length <= 2 * 10⁴
- 1 <= paths[i].length <= 3000
- 1 <= sum(paths[i].length) <= 5 * 10⁵
- paths[i] consist of English letters, digits, '/', '.', '(', ')', and ' '.
- You may assume no files or directories share the same name in the same directory.
- You may assume each given directory info represents a unique directory. A single blank space separates the directory path and file info.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Parse Directory Information</summary>

Break down each path string to extract:
1. Directory path (first part before space)
2. File entries (remaining parts after space)
3. For each file: filename and content

```python
def parse_path(path_str):
    parts = path_str.split(' ')
    directory = parts[0]
    files = []

    for i in range(1, len(parts)):
        # Extract filename and content
        file_entry = parts[i]
        # Format: "filename.txt(content)"
        paren_idx = file_entry.index('(')
        filename = file_entry[:paren_idx]
        content = file_entry[paren_idx+1:-1]  # Remove '(' and ')'

        # Build full path
        full_path = directory + '/' + filename
        files.append((full_path, content))

    return files
```
</details>

<details>
<summary>Hint 2: Group Files by Content Using Hash Map</summary>

Use a hash map where:
- **Key**: File content (string)
- **Value**: List of file paths with that content

```python
from collections import defaultdict

def findDuplicate(paths):
    content_map = defaultdict(list)

    for path in paths:
        files = parse_path(path)
        for file_path, content in files:
            content_map[content].append(file_path)

    # Filter groups with 2+ files
    result = []
    for content, file_list in content_map.items():
        if len(file_list) >= 2:
            result.append(file_list)

    return result
```

**Key Insight**: Content serves as a natural grouping key. Files with identical content hash to the same bucket.
</details>

<details>
<summary>Hint 3: Complete Solution with Proper Parsing</summary>

```python
from collections import defaultdict

def findDuplicate(paths):
    content_to_paths = defaultdict(list)

    for path_info in paths:
        parts = path_info.split(' ')
        directory = parts[0]

        # Process each file in this directory
        for i in range(1, len(parts)):
            file_entry = parts[i]

            # Parse "filename.txt(content)"
            open_paren = file_entry.index('(')
            filename = file_entry[:open_paren]
            content = file_entry[open_paren + 1:-1]

            # Build full path and group by content
            full_path = directory + '/' + filename
            content_to_paths[content].append(full_path)

    # Return only groups with duplicates (2+ files)
    return [paths for paths in content_to_paths.values() if len(paths) >= 2]
```

**Optimization**: For very large files in real systems, use content hash (MD5, SHA) instead of full content as key.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Map Grouping | O(n × m) | O(n × m) | n = total files, m = avg content length |
| With Content Hashing | O(n × m) | O(n) | Using MD5/SHA reduces space |

**Detailed Analysis:**
- **Time**: O(n × m) where n is total number of files, m is average content length
  - Parse all path strings: O(total input length)
  - Group by content: O(n × m) for string comparisons
- **Space**: O(n × m) to store content-to-paths mapping
- **Real-world optimization**: Use content hash (O(1) space per content) instead of storing full content

## Common Mistakes

### Mistake 1: Incorrect path concatenation
```python
# Wrong: Missing '/' separator
full_path = directory + filename

# Correct: Proper path separator
full_path = directory + '/' + filename
```

### Mistake 2: Returning all groups including singletons
```python
# Wrong: Including files with no duplicates
return list(content_map.values())

# Correct: Only return groups with 2+ files
return [paths for paths in content_map.values() if len(paths) >= 2]
```

### Mistake 3: Not handling parentheses in content correctly
```python
# Wrong: Incorrect parsing
content = file_entry.split('(')[1].split(')')[0]

# Correct: Using index to find parentheses
open_paren = file_entry.index('(')
content = file_entry[open_paren + 1:-1]
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| File Size Comparison | Find duplicates by size first, then content | Medium |
| Content Hash | Use MD5/SHA for large file comparison | Medium |
| Distributed System | Find duplicates across multiple servers | Hard |
| Similar Files | Find files with similar (not identical) content | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] **Initial Attempt** - Solve independently (30 min limit)
- [ ] **Solution Study** - If stuck, study one approach deeply
- [ ] **Implementation** - Code solution from scratch without reference
- [ ] **Optimization** - Achieve O(n × m) solution with hash map
- [ ] **Edge Cases** - Test: single file, all unique, all duplicates, nested directories
- [ ] **Variations** - Solve at least 2 related problems
- [ ] **Spaced Repetition** - Re-solve after: 1 day, 1 week, 1 month

**Mastery Goal**: Solve in < 20 minutes with clean parsing logic.

**Strategy**: See [Hash Table Patterns](../strategies/data-structures/hash-tables.md) and [String Parsing](../strategies/patterns/string-manipulation.md)
