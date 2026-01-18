# Python Data Structures

> Master the data structures used in 90% of coding interviews

---

## Table of Contents

1. [Lists](#lists)
2. [Tuples](#tuples)
3. [Dictionaries](#dictionaries)
4. [Sets](#sets)
5. [Deque](#deque)
6. [Heaps (heapq)](#heaps-heapq)
7. [Strings as Data Structures](#strings-as-data-structures)
8. [Custom Data Structures](#custom-data-structures)
9. [Complexity Cheat Sheet](#complexity-cheat-sheet)

---

## Lists

Lists are Python's workhorse data structure—dynamic arrays that can hold any type.

### Creation

```python
# Empty list
nums = []
nums = list()

# With initial values
nums = [1, 2, 3]
nums = list(range(5))               # [0, 1, 2, 3, 4]
nums = [0] * 5                      # [0, 0, 0, 0, 0]

# 2D list (matrix)
matrix = [[0] * cols for _ in range(rows)]

# WRONG way to create 2D list (shared references)
# matrix = [[0] * cols] * rows      # DON'T DO THIS

# From other iterables
chars = list("hello")               # ['h', 'e', 'l', 'l', 'o']
nums = list({1, 2, 3})              # [1, 2, 3] (from set)
```

### Indexing and Slicing

```python
nums = [10, 20, 30, 40, 50]

# Positive indices (0-based)
nums[0]                             # 10 (first)
nums[2]                             # 30 (third)

# Negative indices (from end)
nums[-1]                            # 50 (last)
nums[-2]                            # 40 (second to last)

# Slicing [start:end:step]
nums[1:4]                           # [20, 30, 40]
nums[:3]                            # [10, 20, 30] (first 3)
nums[2:]                            # [30, 40, 50] (from index 2)
nums[::2]                           # [10, 30, 50] (every other)
nums[::-1]                          # [50, 40, 30, 20, 10] (reversed)

# Slice assignment
nums[1:3] = [100, 200]              # [10, 100, 200, 40, 50]
nums[1:3] = [100]                   # [10, 100, 40, 50] (can change size)
```

### List Methods

```python
nums = [1, 2, 3]

# Adding elements
nums.append(4)                      # [1, 2, 3, 4] - O(1) amortized
nums.extend([5, 6])                 # [1, 2, 3, 4, 5, 6] - O(k)
nums.insert(0, 0)                   # [0, 1, 2, 3, 4, 5, 6] - O(n)
nums += [7, 8]                      # [0, 1, 2, 3, 4, 5, 6, 7, 8]

# Removing elements
nums.pop()                          # Returns and removes last - O(1)
nums.pop(0)                         # Returns and removes first - O(n)
nums.remove(3)                      # Remove first occurrence of 3 - O(n)
del nums[1]                         # Remove by index - O(n)
nums.clear()                        # Remove all - O(n)

# Finding elements
nums = [10, 20, 30, 20]
nums.index(20)                      # 1 (first occurrence)
nums.index(20, 2)                   # 3 (search from index 2)
nums.count(20)                      # 2
20 in nums                          # True - O(n)

# Other operations
len(nums)                           # 4
nums.copy()                         # Shallow copy
nums.reverse()                      # Reverse in-place
list(reversed(nums))                # Reversed copy
```

### List as Stack

```python
stack = []

# Push
stack.append(1)
stack.append(2)
stack.append(3)
# stack = [1, 2, 3]

# Peek
top = stack[-1]                     # 3

# Pop
top = stack.pop()                   # 3, stack = [1, 2]

# Check empty
if stack:
    print("Not empty")
if not stack:
    print("Empty")
```

### Sorting

```python
nums = [3, 1, 4, 1, 5, 9, 2, 6]

# Sort in-place
nums.sort()                         # [1, 1, 2, 3, 4, 5, 6, 9]
nums.sort(reverse=True)             # [9, 6, 5, 4, 3, 2, 1, 1]

# Return sorted copy (original unchanged)
sorted_nums = sorted(nums)
sorted_nums = sorted(nums, reverse=True)

# Sort with key function
words = ["banana", "pie", "apple"]
words.sort(key=len)                 # ['pie', 'apple', 'banana']
words.sort(key=str.lower)           # Case-insensitive

# Sort by multiple criteria
items = [(1, 'b'), (2, 'a'), (1, 'a')]
items.sort(key=lambda x: (x[0], x[1]))  # [(1, 'a'), (1, 'b'), (2, 'a')]

# Sort with custom comparator
from functools import cmp_to_key

def compare(a, b):
    return a - b                    # Ascending

nums.sort(key=cmp_to_key(compare))
```

### Common List Patterns

```python
# Find min/max with index
nums = [3, 1, 4, 1, 5]
min_val = min(nums)                 # 1
max_val = max(nums)                 # 5
min_idx = nums.index(min(nums))     # 1
max_idx = nums.index(max(nums))     # 4

# More efficient for index
min_idx = min(range(len(nums)), key=lambda i: nums[i])

# Sum and product
total = sum(nums)                   # 14
from math import prod
product = prod(nums)                # 60

# Filter
evens = [x for x in nums if x % 2 == 0]
evens = list(filter(lambda x: x % 2 == 0, nums))

# Transform
squares = [x**2 for x in nums]
squares = list(map(lambda x: x**2, nums))

# Flatten 2D list
matrix = [[1, 2], [3, 4], [5, 6]]
flat = [x for row in matrix for x in row]  # [1, 2, 3, 4, 5, 6]

# Zip lists
names = ["Alice", "Bob"]
ages = [30, 25]
pairs = list(zip(names, ages))      # [('Alice', 30), ('Bob', 25)]

# Unzip
names, ages = zip(*pairs)           # ('Alice', 'Bob'), (30, 25)
```

### List Complexity Table

| Operation | Average | Worst |
|-----------|---------|-------|
| `list[i]` | O(1) | O(1) |
| `list[i] = x` | O(1) | O(1) |
| `list.append(x)` | O(1)* | O(n) |
| `list.pop()` | O(1) | O(1) |
| `list.pop(0)` | O(n) | O(n) |
| `list.insert(i, x)` | O(n) | O(n) |
| `list.remove(x)` | O(n) | O(n) |
| `x in list` | O(n) | O(n) |
| `list.index(x)` | O(n) | O(n) |
| `list.sort()` | O(n log n) | O(n log n) |
| `len(list)` | O(1) | O(1) |
| `list.copy()` | O(n) | O(n) |
| `list + list` | O(n) | O(n) |
| `list * k` | O(nk) | O(nk) |
| `list[i:j]` | O(j-i) | O(j-i) |

*amortized

---

## Tuples

Tuples are immutable sequences—useful for fixed collections and as dict keys.

### Creation and Usage

```python
# Creation
point = (3, 4)
single = (1,)                       # Note trailing comma
empty = ()
from_list = tuple([1, 2, 3])

# Unpacking
x, y = point                        # x=3, y=4
first, *rest = (1, 2, 3, 4)         # first=1, rest=[2, 3, 4]

# Access (same as list)
point[0]                            # 3
point[-1]                           # 4
point[0:1]                          # (3,)

# Immutable - cannot modify
# point[0] = 5                      # TypeError

# Methods
point.count(3)                      # 1
point.index(4)                      # 1
len(point)                          # 2
```

### Named Tuples

```python
from collections import namedtuple

# Define a named tuple type
Point = namedtuple('Point', ['x', 'y'])

# Create instances
p = Point(3, 4)
p = Point(x=3, y=4)

# Access by name or index
p.x                                 # 3
p[0]                                # 3

# Unpack
x, y = p

# Convert to dict
p._asdict()                         # {'x': 3, 'y': 4}

# Create with defaults (Python 3.7+)
Point = namedtuple('Point', ['x', 'y'], defaults=[0, 0])
Point()                             # Point(x=0, y=0)
Point(5)                            # Point(x=5, y=0)
```

### When to Use Tuples vs Lists

| Use Tuple | Use List |
|-----------|----------|
| Immutable data (coordinates, RGB) | Mutable collections |
| Dict keys or set elements | When you need to modify |
| Function return multiple values | When order might change |
| Heterogeneous data | Homogeneous collections |
| Memory efficiency needed | When growth is needed |

---

## Dictionaries

Dictionaries provide O(1) average-case lookups, insertions, and deletions.

### Creation

```python
# Empty dict
d = {}
d = dict()

# With initial values
d = {"a": 1, "b": 2}
d = dict(a=1, b=2)                  # Keys must be valid identifiers
d = dict([("a", 1), ("b", 2)])      # From list of tuples

# Dict comprehension
squares = {x: x**2 for x in range(5)}  # {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}

# From keys with default value
keys = ["a", "b", "c"]
d = dict.fromkeys(keys, 0)          # {'a': 0, 'b': 0, 'c': 0}
```

### Access and Modification

```python
d = {"a": 1, "b": 2}

# Access
d["a"]                              # 1
d.get("a")                          # 1
d.get("c")                          # None (no KeyError)
d.get("c", 0)                       # 0 (default value)

# Modify
d["a"] = 10                         # Update
d["c"] = 3                          # Insert

# Delete
del d["a"]                          # Remove key
value = d.pop("b")                  # Remove and return value
value = d.pop("x", None)            # With default (no KeyError)
key, value = d.popitem()            # Remove and return arbitrary item

# setdefault - get or set
d.setdefault("x", []).append(1)     # If "x" missing, set to [], then append
# Useful for building lists in dicts
```

### Dictionary Methods

```python
d = {"a": 1, "b": 2, "c": 3}

# Iteration
for key in d:                       # Keys only (default)
    print(key)

for key in d.keys():                # Keys (explicit)
    print(key)

for value in d.values():            # Values
    print(value)

for key, value in d.items():        # Key-value pairs
    print(f"{key}: {value}")

# Check membership
"a" in d                            # True (checks keys)
1 in d.values()                     # True (checks values)

# Copy
d2 = d.copy()                       # Shallow copy

# Update (merge)
d.update({"b": 20, "d": 4})         # Modify in place
d = d | {"e": 5}                    # Merge (Python 3.9+)
d |= {"f": 6}                       # Update in place (Python 3.9+)

# Clear
d.clear()                           # Remove all items
```

### defaultdict

```python
from collections import defaultdict

# Auto-initializing dict
# int() returns 0, list() returns [], set() returns set()

# Counting
counts = defaultdict(int)
for char in "hello":
    counts[char] += 1               # No KeyError
# {'h': 1, 'e': 1, 'l': 2, 'o': 1}

# Grouping
groups = defaultdict(list)
for name, dept in employees:
    groups[dept].append(name)

# Sets
graph = defaultdict(set)
for u, v in edges:
    graph[u].add(v)
    graph[v].add(u)

# Custom factory
from collections import defaultdict
dd = defaultdict(lambda: "N/A")
dd["missing"]                       # "N/A"
```

### Counter

```python
from collections import Counter

# Create from iterable
counts = Counter("abracadabra")
# Counter({'a': 5, 'b': 2, 'r': 2, 'c': 1, 'd': 1})

# Create from dict
counts = Counter({"a": 4, "b": 2})

# Access
counts["a"]                         # 5
counts["z"]                         # 0 (no KeyError)

# Most common
counts.most_common(2)               # [('a', 5), ('b', 2)]
counts.most_common()                # All, sorted by count

# Arithmetic
c1 = Counter("aab")
c2 = Counter("abc")
c1 + c2                             # Counter({'a': 3, 'b': 2, 'c': 1})
c1 - c2                             # Counter({'a': 1}) (no negatives)
c1 & c2                             # Counter({'a': 1, 'b': 1}) (min)
c1 | c2                             # Counter({'a': 2, 'b': 1, 'c': 1}) (max)

# Total count
counts.total()                      # Sum of all counts (Python 3.10+)
sum(counts.values())                # Works in all versions

# Elements iterator
list(Counter("aab").elements())     # ['a', 'a', 'b']
```

### OrderedDict

```python
from collections import OrderedDict

# Maintains insertion order (dict also does in Python 3.7+)
# OrderedDict useful for:
# 1. move_to_end() method
# 2. Equality considers order
# 3. LRU cache implementation

od = OrderedDict()
od["a"] = 1
od["b"] = 2
od["c"] = 3

od.move_to_end("a")                 # Move to end
od.move_to_end("c", last=False)     # Move to beginning

od.popitem()                        # Remove last
od.popitem(last=False)              # Remove first

# LRU Cache pattern
class LRUCache:
    def __init__(self, capacity):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)
```

### Dictionary Complexity

| Operation | Average | Worst |
|-----------|---------|-------|
| `d[k]` | O(1) | O(n) |
| `d[k] = v` | O(1) | O(n) |
| `del d[k]` | O(1) | O(n) |
| `k in d` | O(1) | O(n) |
| `d.get(k)` | O(1) | O(n) |
| `d.keys()` | O(1) | O(1) |
| `d.values()` | O(1) | O(1) |
| `d.items()` | O(1) | O(1) |
| `len(d)` | O(1) | O(1) |
| `d.copy()` | O(n) | O(n) |
| Iteration | O(n) | O(n) |

---

## Sets

Sets provide O(1) membership testing and eliminate duplicates.

### Creation

```python
# Empty set (not {} - that's empty dict)
s = set()

# With values
s = {1, 2, 3}
s = set([1, 2, 2, 3])               # {1, 2, 3} (duplicates removed)
s = set("hello")                    # {'h', 'e', 'l', 'o'}

# Set comprehension
squares = {x**2 for x in range(5)}  # {0, 1, 4, 9, 16}

# Frozenset (immutable, hashable)
fs = frozenset([1, 2, 3])
# Can be used as dict key or set element
```

### Set Operations

```python
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

# Add/remove
a.add(5)                            # Add element
a.discard(5)                        # Remove if exists (no error)
a.remove(5)                         # Remove (raises KeyError if missing)
a.pop()                             # Remove and return arbitrary element
a.clear()                           # Remove all

# Set operations
a | b                               # Union: {1, 2, 3, 4, 5, 6}
a & b                               # Intersection: {3, 4}
a - b                               # Difference: {1, 2}
a ^ b                               # Symmetric difference: {1, 2, 5, 6}

# In-place operations
a.update(b)                         # a |= b
a.intersection_update(b)            # a &= b
a.difference_update(b)              # a -= b
a.symmetric_difference_update(b)    # a ^= b

# Comparisons
a.issubset(b)                       # a <= b
a.issuperset(b)                     # a >= b
a.isdisjoint(b)                     # True if no common elements
```

### Common Set Patterns

```python
# Remove duplicates while preserving order
def dedupe_ordered(items):
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result

# Or using dict (Python 3.7+)
list(dict.fromkeys(items))

# Find duplicates
def find_duplicates(items):
    seen = set()
    duplicates = set()
    for item in items:
        if item in seen:
            duplicates.add(item)
        seen.add(item)
    return duplicates

# Two-sum using set
def has_pair_sum(nums, target):
    seen = set()
    for num in nums:
        if target - num in seen:
            return True
        seen.add(num)
    return False
```

### Set Complexity

| Operation | Average | Worst |
|-----------|---------|-------|
| `x in s` | O(1) | O(n) |
| `s.add(x)` | O(1) | O(n) |
| `s.remove(x)` | O(1) | O(n) |
| `s.discard(x)` | O(1) | O(n) |
| `s \| t` | O(len(s)+len(t)) | O(len(s)*len(t)) |
| `s & t` | O(min(len(s),len(t))) | O(len(s)*len(t)) |
| `s - t` | O(len(s)) | O(len(s)*len(t)) |
| `len(s)` | O(1) | O(1) |

---

## Deque

`collections.deque` provides O(1) operations on both ends—ideal for queues and sliding windows.

### Creation

```python
from collections import deque

# Empty deque
d = deque()

# From iterable
d = deque([1, 2, 3])
d = deque("abc")                    # deque(['a', 'b', 'c'])

# With max length (auto-discards old items)
d = deque([1, 2, 3], maxlen=3)
d.append(4)                         # deque([2, 3, 4]) - 1 is discarded
```

### Operations

```python
d = deque([1, 2, 3])

# Add elements
d.append(4)                         # Right: [1, 2, 3, 4]
d.appendleft(0)                     # Left: [0, 1, 2, 3, 4]
d.extend([5, 6])                    # Right: [0, 1, 2, 3, 4, 5, 6]
d.extendleft([-2, -1])              # Left (reversed): [-1, -2, 0, 1, ...]

# Remove elements
d.pop()                             # Right: returns and removes last
d.popleft()                         # Left: returns and removes first
d.clear()                           # Remove all

# Access
d[0]                                # First element - O(1)
d[-1]                               # Last element - O(1)
d[n]                                # Middle element - O(n)

# Rotate
d = deque([1, 2, 3, 4, 5])
d.rotate(2)                         # [4, 5, 1, 2, 3] (right)
d.rotate(-2)                        # [1, 2, 3, 4, 5] (left)

# Other
len(d)                              # Length
d.count(x)                          # Count occurrences
d.remove(x)                         # Remove first occurrence
d.reverse()                         # Reverse in-place
```

### BFS with Deque

```python
from collections import deque

def bfs(graph, start):
    visited = {start}
    queue = deque([start])

    while queue:
        node = queue.popleft()      # O(1) - important!
        process(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

# Level-order traversal
def level_order(root):
    if not root:
        return []

    result = []
    queue = deque([root])

    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)

    return result
```

### Sliding Window with Deque

```python
from collections import deque

def max_sliding_window(nums, k):
    """Find max in each sliding window of size k."""
    result = []
    dq = deque()  # Stores indices, values are decreasing

    for i, num in enumerate(nums):
        # Remove indices outside window
        while dq and dq[0] < i - k + 1:
            dq.popleft()

        # Remove smaller elements (they're useless)
        while dq and nums[dq[-1]] < num:
            dq.pop()

        dq.append(i)

        # Window is complete
        if i >= k - 1:
            result.append(nums[dq[0]])

    return result
```

### Deque Complexity

| Operation | Time |
|-----------|------|
| `d.append(x)` | O(1) |
| `d.appendleft(x)` | O(1) |
| `d.pop()` | O(1) |
| `d.popleft()` | O(1) |
| `d[0]`, `d[-1]` | O(1) |
| `d[n]` (middle) | O(n) |
| `len(d)` | O(1) |
| `d.rotate(k)` | O(k) |

---

## Heaps (heapq)

Python's `heapq` module provides a min-heap implementation.

### Basic Operations

```python
import heapq

# Create heap from list (in-place)
nums = [3, 1, 4, 1, 5, 9, 2, 6]
heapq.heapify(nums)                 # O(n) - modifies in-place
# nums is now a valid min-heap

# Push
heapq.heappush(nums, 0)             # O(log n)

# Pop (returns smallest)
smallest = heapq.heappop(nums)      # O(log n)

# Peek (don't remove)
smallest = nums[0]                  # O(1)

# Push then pop (more efficient than separate ops)
result = heapq.heappushpop(nums, 5) # Push 5, then pop smallest

# Pop then push
result = heapq.heapreplace(nums, 5) # Pop smallest, then push 5
```

### Max Heap (using negation)

```python
import heapq

# Python only has min-heap, so negate values for max-heap
nums = [3, 1, 4, 1, 5]

# Create max heap
max_heap = [-x for x in nums]
heapq.heapify(max_heap)

# Push (negate)
heapq.heappush(max_heap, -10)

# Pop (negate result)
largest = -heapq.heappop(max_heap)  # 10

# Peek (negate)
largest = -max_heap[0]
```

### Find K Largest/Smallest

```python
import heapq

nums = [3, 1, 4, 1, 5, 9, 2, 6]

# K smallest
heapq.nsmallest(3, nums)            # [1, 1, 2]

# K largest
heapq.nlargest(3, nums)             # [9, 6, 5]

# With key function
items = [("apple", 5), ("banana", 2), ("cherry", 8)]
heapq.nsmallest(2, items, key=lambda x: x[1])
# [('banana', 2), ('apple', 5)]
```

### Heap with Custom Objects

```python
import heapq

# Method 1: Tuples (compare by first element)
heap = []
heapq.heappush(heap, (5, "task5"))
heapq.heappush(heap, (1, "task1"))
heapq.heappush(heap, (3, "task3"))

priority, task = heapq.heappop(heap)  # (1, "task1")

# Method 2: Counter to break ties
counter = 0
heap = []

def push(priority, item):
    global counter
    heapq.heappush(heap, (priority, counter, item))
    counter += 1

def pop():
    priority, _, item = heapq.heappop(heap)
    return priority, item

# Method 3: Dataclass with __lt__
from dataclasses import dataclass, field

@dataclass(order=True)
class Task:
    priority: int
    name: str = field(compare=False)  # Don't compare by name

heap = []
heapq.heappush(heap, Task(5, "task5"))
heapq.heappush(heap, Task(1, "task1"))
task = heapq.heappop(heap)          # Task(priority=1, name='task1')
```

### Common Heap Patterns

```python
import heapq

# Merge k sorted lists
def merge_k_lists(lists):
    heap = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst[0], i, 0))

    result = []
    while heap:
        val, list_idx, elem_idx = heapq.heappop(heap)
        result.append(val)

        if elem_idx + 1 < len(lists[list_idx]):
            next_val = lists[list_idx][elem_idx + 1]
            heapq.heappush(heap, (next_val, list_idx, elem_idx + 1))

    return result

# Top K frequent elements
def top_k_frequent(nums, k):
    counts = Counter(nums)
    # Use min-heap of size k
    return heapq.nlargest(k, counts.keys(), key=counts.get)

# Kth largest element
def find_kth_largest(nums, k):
    # Min-heap of size k
    heap = []
    for num in nums:
        heapq.heappush(heap, num)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]
```

### Heap Complexity

| Operation | Time |
|-----------|------|
| `heapify(list)` | O(n) |
| `heappush(heap, x)` | O(log n) |
| `heappop(heap)` | O(log n) |
| `heap[0]` (peek) | O(1) |
| `nsmallest(k, iter)` | O(n log k) |
| `nlargest(k, iter)` | O(n log k) |

---

## Strings as Data Structures

### String Immutability

```python
s = "hello"

# Strings are immutable - cannot modify in place
# s[0] = "H"                        # TypeError

# Create new string instead
s = "H" + s[1:]                     # "Hello"
s = s.replace("h", "H")             # "Hello"
```

### Building Strings Efficiently

```python
# BAD: String concatenation in loop - O(n²)
result = ""
for char in chars:
    result += char                  # Creates new string each time

# GOOD: List + join - O(n)
parts = []
for char in chars:
    parts.append(char)
result = "".join(parts)

# BETTER: List comprehension + join
result = "".join(process(c) for c in chars)
```

### String as Character Array

```python
s = "hello"

# Convert to list for modifications
chars = list(s)                     # ['h', 'e', 'l', 'l', 'o']
chars[0] = 'H'
result = "".join(chars)             # "Hello"

# Reverse a string
s[::-1]                             # "olleh"
"".join(reversed(s))                # "olleh"

# Check palindrome
s == s[::-1]
```

---

## Custom Data Structures

### Linked List

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Create linked list
def create_list(values):
    dummy = ListNode(0)
    current = dummy
    for val in values:
        current.next = ListNode(val)
        current = current.next
    return dummy.next

# Convert to list
def to_list(head):
    result = []
    while head:
        result.append(head.val)
        head = head.next
    return result

# Reverse linked list
def reverse_list(head):
    prev = None
    current = head
    while current:
        next_node = current.next
        current.next = prev
        prev = current
        current = next_node
    return prev

# Find middle (slow/fast pointers)
def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow

# Detect cycle
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
```

### Binary Tree

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# Create from list (level order)
def create_tree(values):
    if not values:
        return None

    root = TreeNode(values[0])
    queue = deque([root])
    i = 1

    while queue and i < len(values):
        node = queue.popleft()

        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1

        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1

    return root

# Traversals
def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def preorder(root):
    if not root:
        return []
    return [root.val] + preorder(root.left) + preorder(root.right)

def postorder(root):
    if not root:
        return []
    return postorder(root.left) + postorder(root.right) + [root.val]

# Iterative inorder
def inorder_iterative(root):
    result = []
    stack = []
    current = root

    while current or stack:
        while current:
            stack.append(current)
            current = current.left
        current = stack.pop()
        result.append(current.val)
        current = current.right

    return result
```

### Graph Representations

```python
from collections import defaultdict

# Adjacency List (most common)
# For: sparse graphs, most algorithms
graph = defaultdict(list)
edges = [(0, 1), (0, 2), (1, 2), (2, 3)]
for u, v in edges:
    graph[u].append(v)
    graph[v].append(u)              # For undirected graph

# Adjacency List with weights
graph = defaultdict(list)
edges = [(0, 1, 5), (0, 2, 3), (1, 2, 1)]  # (from, to, weight)
for u, v, w in edges:
    graph[u].append((v, w))

# Adjacency Matrix
# For: dense graphs, quick edge lookups
n = 4
matrix = [[0] * n for _ in range(n)]
for u, v in edges:
    matrix[u][v] = 1
    matrix[v][u] = 1                # For undirected

# Adjacency Set (for quick edge lookup)
graph = defaultdict(set)
for u, v in edges:
    graph[u].add(v)
    graph[v].add(u)
```

### Trie (Prefix Tree)

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self._find_node(word)
        return node is not None and node.is_end

    def starts_with(self, prefix: str) -> bool:
        return self._find_node(prefix) is not None

    def _find_node(self, prefix: str):
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node

# Usage
trie = Trie()
trie.insert("apple")
trie.search("apple")                # True
trie.search("app")                  # False
trie.starts_with("app")             # True
```

### Union-Find (Disjoint Set)

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n              # Number of components

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False            # Already connected

        # Union by rank
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px

        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1

        self.count -= 1
        return True

    def connected(self, x, y):
        return self.find(x) == self.find(y)

# Usage
uf = UnionFind(5)
uf.union(0, 1)
uf.union(2, 3)
uf.connected(0, 1)                  # True
uf.connected(0, 2)                  # False
uf.count                            # 3 components
```

---

## Complexity Cheat Sheet

### Built-in Data Structures

| Structure | Access | Search | Insert | Delete | Space |
|-----------|--------|--------|--------|--------|-------|
| List | O(1) | O(n) | O(n)* | O(n) | O(n) |
| Dict | O(1) | O(1) | O(1) | O(1) | O(n) |
| Set | - | O(1) | O(1) | O(1) | O(n) |
| Deque | O(n) | O(n) | O(1)** | O(1)** | O(n) |
| Heap | O(1)*** | O(n) | O(log n) | O(log n) | O(n) |

*O(1) amortized for append at end
**O(1) at both ends
***O(1) for min only (peek)

### Custom Data Structures

| Structure | Access | Search | Insert | Delete | Space |
|-----------|--------|--------|--------|--------|-------|
| Linked List | O(n) | O(n) | O(1)* | O(1)* | O(n) |
| Binary Tree | O(n) | O(n) | O(n) | O(n) | O(n) |
| BST (balanced) | O(log n) | O(log n) | O(log n) | O(log n) | O(n) |
| Trie | O(k) | O(k) | O(k) | O(k) | O(nk) |
| Union-Find | - | O(α(n)) | O(α(n)) | - | O(n) |

*With pointer to position
k = key/word length
α(n) ≈ O(1) (inverse Ackermann)

### Sorting Algorithms

| Algorithm | Best | Average | Worst | Space | Stable |
|-----------|------|---------|-------|-------|--------|
| Tim Sort (Python) | O(n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quick Sort | O(n log n) | O(n log n) | O(n²) | O(log n) | No |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) | No |
| Counting Sort | O(n+k) | O(n+k) | O(n+k) | O(k) | Yes |
