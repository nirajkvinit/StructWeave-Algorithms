---
title: "Arrays and Strings"
category: data-structures
difficulty: beginner
estimated_time_minutes: 25
prerequisites: []
---

# Arrays and Strings

## What is an Array?

An **array** is a collection of elements stored in **contiguous memory locations**. Each element can be accessed directly using its index, making arrays one of the most fundamental and efficient data structures.

Think of an array like a row of mailboxes in an apartment building - each mailbox has a number (index), and you can go directly to any mailbox without checking the others first.

## Memory Layout

```mermaid
graph LR
    subgraph "Array in Memory"
        A[arr[0]<br/>5] --> B[arr[1]<br/>12]
        B --> C[arr[2]<br/>7]
        C --> D[arr[3]<br/>20]
        D --> E[arr[4]<br/>3]
    end

    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style C fill:#e1f5ff
    style D fill:#e1f5ff
    style E fill:#e1f5ff
```

The contiguous memory layout enables **O(1) access time** - calculating the memory address is simple:
```
address = base_address + (index × element_size)
```

## Common Array Operations

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Access by index | O(1) | Direct memory calculation |
| Search (unsorted) | O(n) | Must check each element |
| Search (sorted) | O(log n) | Binary search possible |
| Insert at end | O(1)* | *Amortized if dynamic array |
| Insert at position | O(n) | Must shift elements |
| Delete at end | O(1) | Just reduce size |
| Delete at position | O(n) | Must shift elements |

## Strings as Character Arrays

In most programming languages, **strings are implemented as arrays of characters**. This means:
- You can access individual characters by index: `s[0]`
- String length is typically O(1) (stored as metadata)
- String operations often have array-like complexities

```mermaid
graph LR
    subgraph "String: 'HELLO'"
        A[H] --> B[E]
        B --> C[L]
        C --> D[L]
        D --> E[O]
        E --> F[\0<br/>null terminator]
    end

    style A fill:#ffe1e1
    style B fill:#ffe1e1
    style C fill:#ffe1e1
    style D fill:#ffe1e1
    style E fill:#ffe1e1
    style F fill:#fff4e1
```

### Important String Considerations

- **Immutability**: In many languages (Java, Python), strings are immutable - modifications create new strings
- **StringBuilder/StringBuffer**: Use these for efficient concatenation in loops
- **Character encoding**: Be aware of Unicode, UTF-8, etc. when working with international text

## Common Array Techniques

### 1. Two Pointers
Use two indices moving through the array:
- **Same direction**: Sliding window
- **Opposite directions**: Reversing, finding pairs

### 2. Sliding Window
Maintain a window of elements and slide it across the array:
```
[1, 3, 2, 6, -1, 4]
 ←---window---→
```

### 3. Prefix Sum
Pre-compute cumulative sums for fast range queries:
```
arr:        [3, 1, 4, 2, 5]
prefix:  [0, 3, 4, 8, 10, 15]
```

### 4. Reversal
Common operations:
- Reverse entire array
- Reverse portions (rotate array)
- Palindrome checking

### 5. In-place Modification
Modify array without extra space:
- Swap elements
- Partition (like in quicksort)
- Remove duplicates

## String Manipulation Patterns

### 1. Character Frequency
Use hash map or array (for ASCII):
```
Count characters → HashMap<char, int>
Or for ASCII only → int[128]
```

### 2. Anagram Detection
Two strings are anagrams if they have the same character frequencies.

### 3. Palindrome Checking
Check if string reads same forwards and backwards:
- Two pointers from both ends
- Expand around center (for substrings)

### 4. String Building
For multiple concatenations:
- Avoid `str = str + newChar` in loops (O(n²))
- Use StringBuilder/StringBuffer (O(n))

### 5. Pattern Matching
- Naive: O(n×m)
- KMP algorithm: O(n+m)
- Rabin-Karp: O(n) average

## When to Use Arrays

### Arrays are Great For:
- ✅ Random access needed (by index)
- ✅ Fixed or predictable size
- ✅ Memory efficiency (no pointer overhead)
- ✅ Cache-friendly operations (contiguous memory)
- ✅ Iterating through all elements

### Avoid Arrays When:
- ❌ Frequent insertions/deletions in middle
- ❌ Unknown/highly variable size
- ❌ Need constant-time insertions at arbitrary positions
- ❌ Need to maintain sorted order with frequent updates

## Arrays vs Other Structures

| Need | Use This Instead |
|------|-----------------|
| Fast insert/delete in middle | Linked List |
| Fast lookup by value | Hash Table |
| Maintain sorted order with updates | Binary Search Tree |
| Fixed maximum size, fast ops | Array |
| Size varies, need flexibility | Dynamic Array (ArrayList, Vector) |

## Space Complexity Considerations

- **Fixed array**: O(n) space
- **Dynamic array**: O(n) space, but may have unused capacity
- **Multi-dimensional**: O(n×m) for 2D array
- **In-place algorithms**: O(1) extra space (array itself doesn't count)

## Common Pitfalls

1. **Off-by-one errors**: Remember arrays are 0-indexed
2. **Array bounds**: Check `index < length` before accessing
3. **String immutability**: Don't concatenate strings in loops
4. **Fixed vs dynamic**: Static arrays can't grow; use ArrayList/Vector for dynamic sizing
5. **Reference vs value**: Arrays are often passed by reference

## Practice Strategy

Start with these fundamental problems:
1. Two Sum (hash table + array)
2. Reverse String (two pointers)
3. Valid Anagram (frequency counting)
4. Maximum Subarray (Kadane's algorithm)
5. Rotate Array (reversal technique)

Master array manipulation before moving to complex data structures - arrays are the foundation for many advanced algorithms!
