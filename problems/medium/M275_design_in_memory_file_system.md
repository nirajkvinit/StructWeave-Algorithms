---
id: M275
old_id: A073
slug: design-in-memory-file-system
title: Design In-Memory File System
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["M208", "M211", "M588"]
prerequisites: ["trie", "hash-map", "system-design"]
---
# Design In-Memory File System

## Problem

Design and implement a simplified file system that operates entirely in memory. Your file system should support creating directories, adding files with content, listing directory contents, and reading file contents. All operations work with absolute paths starting from the root directory "/".

Your FileSystem class needs four operations: (1) ls(path) to list files and subdirectories at a given path, returning results in lexicographic (alphabetical) order, (2) mkdir(path) to create a directory and any necessary parent directories along the path, (3) addContentToFile(filePath, content) to create a new file or append content to an existing file, and (4) readContentFromFile(filePath) to retrieve a file's complete contents.

The key design challenge is choosing a data structure that efficiently represents hierarchical paths. A directory can contain both subdirectories and files, similar to a real file system. When listing a directory, you return all immediate children (both files and subdirectories). When listing a file path, you return just that file's name. Parent directories should be created automatically if they don't exist when creating nested paths.

For example, calling mkdir("/a/b/c") should create directories a, b, and c even if none existed before. Calling addContentToFile("/a/b/c/d", "hello") creates file d with content "hello", and also creates any missing parent directories. Subsequent calls to addContentToFile on the same path should append to the existing content, not replace it.


**Diagram:**

```
Example: File System Operations

Input:
["FileSystem", "ls", "mkdir", "addContentToFile", "ls", "readContentFromFile"]
[[], ["/"], ["/a/b/c"], ["/a/b/c/d", "hello"], ["/"], ["/a/b/c/d"]]

File system tree after operations:
/
└── a/
    └── b/
        └── c/
            └── d (file with content "hello")

Output:
[null, [], null, null, ["a"], "hello"]

Explanation:
- FileSystem(): Initialize
- ls("/"): Returns [] (empty root)
- mkdir("/a/b/c"): Creates directory structure
- addContentToFile("/a/b/c/d", "hello"): Creates file with content
- ls("/"): Returns ["a"] (directory in root)
- readContentFromFile("/a/b/c/d"): Returns "hello"
```


## Why This Matters

This problem teaches system design fundamentals by modeling a real-world hierarchical structure. Understanding how to represent file systems prepares you for working with actual filesystem APIs, building developer tools, or implementing virtual file systems for sandboxed environments.

The trie-like tree structure used here appears in many contexts beyond file systems: nested menus in user interfaces, organizational hierarchies, URL routing in web frameworks, and namespace management in programming languages. The pattern of navigating paths, lazy creation of parent nodes, and distinguishing between leaf nodes (files) and internal nodes (directories) is broadly applicable.

This is a popular system design question because it tests your ability to choose appropriate data structures, handle edge cases (empty paths, root directory, file vs directory), and design clean APIs. The skills transfer directly to building configuration systems, document databases, and hierarchical key-value stores.

## Constraints

- 1 <= path.length, filePath.length <= 100
- path and filePath are absolute paths which begin with '/' and do not end with '/' except that the path is just "/".
- You can assume that all directory names and file names only contain lowercase letters, and the same names will not exist in the same directory.
- You can assume that all operations will be passed valid parameters, and users will not attempt to retrieve file content or list a directory or file that does not exist.
- 1 <= content.length <= 50
- At most 300 calls will be made to ls, mkdir, addContentToFile, and readContentFromFile.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Choosing the Right Data Structure</summary>

Think about how a real file system is organized:
- Directories contain subdirectories and files
- Each directory/file has a name
- Paths are hierarchical: `/a/b/c` means `c` is inside `b`, which is inside `a`

A **Trie-like tree structure** is perfect here, where:
- Each node represents a directory
- Each node stores a mapping of names to child nodes
- Leaf nodes (or specially marked nodes) represent files with content

Alternative approach: Use a single hash map with full paths as keys, but this makes `ls` operations more complex.
</details>

<details>
<summary>Hint 2: Representing Files vs Directories</summary>

Each node in your file system tree needs to track:
1. Whether it's a file or directory
2. Its children (if directory)
3. Its content (if file)

A clean design:
```python
class Node:
    def __init__(self):
        self.children = {}  # name -> Node mapping
        self.content = ""    # Empty if directory, has content if file
        self.is_file = False
```

When a node has `is_file = True`, it represents a file. Otherwise, it's a directory.
</details>

<details>
<summary>Hint 3: Complete Solution Strategy</summary>

```python
class FileSystem:
    class Node:
        def __init__(self):
            self.children = {}
            self.content = ""
            self.is_file = False

    def __init__(self):
        self.root = self.Node()

    def _navigate_to(self, path):
        """Helper: navigate to node at given path, creating if needed"""
        if path == "/":
            return self.root

        parts = path.split("/")[1:]  # Skip empty string before first /
        current = self.root

        for part in parts:
            if part not in current.children:
                current.children[part] = self.Node()
            current = current.children[part]

        return current

    def ls(self, path):
        node = self._navigate_to(path)

        if node.is_file:
            # If it's a file, return just the filename
            return [path.split("/")[-1]]
        else:
            # If it's a directory, return sorted children
            return sorted(node.children.keys())

    def mkdir(self, path):
        # Navigate creates directories automatically
        self._navigate_to(path)

    def addContentToFile(self, filePath, content):
        node = self._navigate_to(filePath)
        node.is_file = True
        node.content += content  # Append content

    def readContentFromFile(self, filePath):
        node = self._navigate_to(filePath)
        return node.content
```

**Key insights:**
- Path parsing: Split by "/" and skip empty strings
- Lazy creation: Create directories as needed during navigation
- File detection: Use `is_file` flag to distinguish files from directories
- Content accumulation: Use `+=` for appending to files
</details>

## Complexity Analysis

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| ls(path) | O(k + m log m) | O(m) | k = path depth, m = children count (for sorting) |
| mkdir(path) | O(k) | O(k) | k = path depth; creates nodes along path |
| addContentToFile | O(k + c) | O(k + c) | k = path depth, c = content length |
| readContentFromFile | O(k) | O(1) | k = path depth |

## Common Mistakes

### Mistake 1: Not handling root path correctly
```python
# WRONG: Incorrect parsing of root path
def _navigate_to(self, path):
    parts = path.split("/")  # Results in ["", "a", "b"] for "/a/b"
    current = self.root

    for part in parts:  # Bug: first part is empty string!
        if part not in current.children:
            current.children[part] = self.Node()
        current = current.children[part]

    return current

# CORRECT: Skip empty strings
parts = path.split("/")[1:]  # Skip first empty element
# Or: parts = [p for p in path.split("/") if p]
```
**Why it's wrong:** Splitting "/a/b" produces `["", "a", "b"]`. The first empty string causes issues. Always filter it out.

### Mistake 2: Forgetting to sort ls() results
```python
# WRONG: Returning unsorted directory listing
def ls(self, path):
    node = self._navigate_to(path)
    if node.is_file:
        return [path.split("/")[-1]]
    else:
        return list(node.children.keys())  # NOT SORTED!

# CORRECT:
return sorted(node.children.keys())
```
**Why it's wrong:** The problem explicitly requires lexicographic (alphabetical) ordering. Dictionary keys have no guaranteed order in older Python versions.

### Mistake 3: Overwriting file content instead of appending
```python
# WRONG: Replacing content instead of appending
def addContentToFile(self, filePath, content):
    node = self._navigate_to(filePath)
    node.is_file = True
    node.content = content  # Should be +=, not =

# CORRECT:
node.content += content  # Append to existing content
```
**Why it's wrong:** The specification says "appends content to the existing file if filePath already exists." Use `+=` to accumulate content.

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Implement Trie | Medium | Similar tree structure for string prefixes |
| Design Add and Search Words | Medium | Trie with wildcard search |
| File System (with size tracking) | Medium | Track file sizes and directory sizes |
| LRU Cache | Medium | Different data structure problem with get/put operations |

## Practice Checklist

- [ ] Implement basic file system with Trie structure (Day 1)
- [ ] Handle path parsing correctly (Day 1)
- [ ] Test with nested directories and files (Day 2)
- [ ] Optimize ls() for large directories (Day 3)
- [ ] Review after 1 week (Day 8)
- [ ] Review after 2 weeks (Day 15)
- [ ] Solve without looking at hints (Day 30)
