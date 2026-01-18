# Python Standard Library for Interviews

> Essential modules that solve 90% of interview auxiliary needs

---

## Table of Contents

1. [collections](#collections)
2. [itertools](#itertools)
3. [functools](#functools)
4. [bisect](#bisect)
5. [heapq](#heapq)
6. [math](#math)
7. [operator](#operator)
8. [string](#string)
9. [copy](#copy)
10. [When to Use What](#when-to-use-what)

---

## collections

The `collections` module provides specialized container datatypes.

### deque — Double-Ended Queue

```python
from collections import deque

# Create
d = deque()
d = deque([1, 2, 3])
d = deque([1, 2, 3], maxlen=3)      # Bounded deque

# Add elements - O(1) both ends
d.append(4)                         # Right
d.appendleft(0)                     # Left
d.extend([5, 6])                    # Right multiple
d.extendleft([0, -1])               # Left multiple (reversed)

# Remove elements - O(1) both ends
d.pop()                             # Right
d.popleft()                         # Left

# Rotate
d.rotate(2)                         # Rotate right
d.rotate(-2)                        # Rotate left

# Common use: BFS queue
def bfs(start):
    visited = {start}
    queue = deque([start])
    while queue:
        node = queue.popleft()      # O(1)
        for neighbor in get_neighbors(node):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

# Common use: Sliding window
def max_in_window(nums, k):
    result = []
    dq = deque()                    # Stores indices
    for i, num in enumerate(nums):
        while dq and dq[0] < i - k + 1:
            dq.popleft()
        while dq and nums[dq[-1]] < num:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            result.append(nums[dq[0]])
    return result
```

### defaultdict — Auto-Initializing Dictionary

```python
from collections import defaultdict

# With int (default 0)
counts = defaultdict(int)
for char in "hello":
    counts[char] += 1               # No KeyError
# defaultdict(<class 'int'>, {'h': 1, 'e': 1, 'l': 2, 'o': 1})

# With list (default [])
graph = defaultdict(list)
edges = [(1, 2), (1, 3), (2, 3)]
for u, v in edges:
    graph[u].append(v)
    graph[v].append(u)

# With set (default set())
connections = defaultdict(set)
for u, v in edges:
    connections[u].add(v)

# With custom factory
def default_value():
    return {"count": 0, "items": []}
d = defaultdict(default_value)
d["key"]["count"] += 1

# Nested defaultdict
tree = lambda: defaultdict(tree)
taxonomy = tree()
taxonomy["animal"]["mammal"]["cat"] = "meow"
```

### Counter — Counting Hashable Objects

```python
from collections import Counter

# Create
c = Counter("abracadabra")          # Counter({'a': 5, 'b': 2, 'r': 2, 'c': 1, 'd': 1})
c = Counter(['a', 'b', 'a'])        # From list
c = Counter(a=4, b=2)               # From keyword args
c = Counter({'a': 4, 'b': 2})       # From dict

# Access (returns 0 for missing, not KeyError)
c['a']                              # 5
c['z']                              # 0

# Most common
c.most_common(3)                    # [('a', 5), ('b', 2), ('r', 2)]
c.most_common()                     # All, sorted by count

# Arithmetic
c1 = Counter("aab")
c2 = Counter("abc")
c1 + c2                             # Counter({'a': 3, 'b': 2, 'c': 1})
c1 - c2                             # Counter({'a': 1}) (no negatives)
c1 & c2                             # Counter({'a': 1, 'b': 1}) (min)
c1 | c2                             # Counter({'a': 2, 'b': 1, 'c': 1}) (max)

# Total (Python 3.10+)
c.total()                           # Sum of all counts

# Elements iterator (repeats by count)
list(Counter("aab").elements())     # ['a', 'a', 'b']

# Update
c.update("aaa")                     # Add counts
c.subtract("aa")                    # Subtract counts

# Common pattern: Top K frequent
def top_k_frequent(nums, k):
    return [num for num, _ in Counter(nums).most_common(k)]

# Common pattern: Check anagram
def is_anagram(s1, s2):
    return Counter(s1) == Counter(s2)
```

### OrderedDict — Dictionary with Insertion Order

```python
from collections import OrderedDict

# Note: Regular dict maintains order since Python 3.7
# OrderedDict is useful for:
# 1. move_to_end() method
# 2. Equality considers order
# 3. LRU cache implementation

od = OrderedDict()
od['a'] = 1
od['b'] = 2
od['c'] = 3

# Move to end
od.move_to_end('a')                 # Move 'a' to end
od.move_to_end('c', last=False)     # Move 'c' to beginning

# Pop
od.popitem()                        # Pop last
od.popitem(last=False)              # Pop first

# LRU Cache implementation
class LRUCache:
    def __init__(self, capacity: int):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)
```

### namedtuple — Lightweight Immutable Class

```python
from collections import namedtuple

# Define
Point = namedtuple('Point', ['x', 'y'])
Point = namedtuple('Point', 'x y')  # Alternative syntax

# Create instances
p = Point(3, 4)
p = Point(x=3, y=4)

# Access
p.x                                 # 3
p[0]                                # 3

# Unpack
x, y = p

# Immutable
# p.x = 5                           # AttributeError

# Convert to dict
p._asdict()                         # {'x': 3, 'y': 4}

# Create from dict
Point(**{'x': 3, 'y': 4})

# Replace (returns new instance)
p._replace(x=10)                    # Point(x=10, y=4)

# With defaults (Python 3.7+)
Point = namedtuple('Point', ['x', 'y'], defaults=[0, 0])
Point()                             # Point(x=0, y=0)

# Use case: Return multiple values with names
def get_stats(nums):
    Stats = namedtuple('Stats', ['min', 'max', 'mean'])
    return Stats(min(nums), max(nums), sum(nums)/len(nums))

stats = get_stats([1, 2, 3, 4, 5])
print(stats.mean)                   # 3.0
```

### ChainMap — Multiple Dictionary View

```python
from collections import ChainMap

# Combine multiple dicts (first has priority)
defaults = {'color': 'red', 'size': 'medium'}
user_prefs = {'color': 'blue'}
combined = ChainMap(user_prefs, defaults)

combined['color']                   # 'blue' (from user_prefs)
combined['size']                    # 'medium' (from defaults)

# Useful for: scope chains, configuration layers
scopes = ChainMap()
scopes = scopes.new_child()         # Push new scope
scopes['x'] = 1                     # Define in current scope
scopes.parents                      # Get parent scopes
```

---

## itertools

The `itertools` module provides memory-efficient iteration tools.

### Infinite Iterators

```python
from itertools import count, cycle, repeat

# count - infinite counter
for i in count(10):                 # 10, 11, 12, ...
    if i > 15:
        break
    print(i)

for i in count(0, 0.5):             # 0, 0.5, 1.0, 1.5, ...
    if i > 2:
        break

# cycle - infinite cycling
for i, char in zip(range(7), cycle('ABC')):
    print(char)                     # A B C A B C A

# repeat - repeat value
list(repeat(5, 3))                  # [5, 5, 5]
list(map(pow, range(5), repeat(2))) # [0, 1, 4, 9, 16]
```

### Combinatoric Iterators

```python
from itertools import permutations, combinations, combinations_with_replacement, product

# permutations - all orderings
list(permutations([1, 2, 3]))
# [(1, 2, 3), (1, 3, 2), (2, 1, 3), (2, 3, 1), (3, 1, 2), (3, 2, 1)]

list(permutations([1, 2, 3], 2))    # Length-2 permutations
# [(1, 2), (1, 3), (2, 1), (2, 3), (3, 1), (3, 2)]

# combinations - unique selections (no repetition)
list(combinations([1, 2, 3], 2))
# [(1, 2), (1, 3), (2, 3)]

# combinations_with_replacement
list(combinations_with_replacement([1, 2, 3], 2))
# [(1, 1), (1, 2), (1, 3), (2, 2), (2, 3), (3, 3)]

# product - cartesian product
list(product([1, 2], ['a', 'b']))
# [(1, 'a'), (1, 'b'), (2, 'a'), (2, 'b')]

list(product([0, 1], repeat=3))     # Binary strings of length 3
# [(0, 0, 0), (0, 0, 1), (0, 1, 0), (0, 1, 1), ...]

# Use case: Generate all subsets
def subsets(nums):
    result = []
    for r in range(len(nums) + 1):
        for combo in combinations(nums, r):
            result.append(list(combo))
    return result
```

### Terminating Iterators

```python
from itertools import (
    chain, islice, takewhile, dropwhile,
    accumulate, groupby, starmap, filterfalse, compress
)

# chain - concatenate iterables
list(chain([1, 2], [3, 4], [5]))    # [1, 2, 3, 4, 5]
list(chain.from_iterable([[1, 2], [3, 4]]))  # [1, 2, 3, 4]

# islice - slice iterator
list(islice(range(10), 3))          # [0, 1, 2]
list(islice(range(10), 2, 5))       # [2, 3, 4]
list(islice(range(10), 0, 10, 2))   # [0, 2, 4, 6, 8]

# takewhile - take while condition true
list(takewhile(lambda x: x < 5, [1, 3, 5, 2, 1]))
# [1, 3]

# dropwhile - drop while condition true
list(dropwhile(lambda x: x < 5, [1, 3, 5, 2, 1]))
# [5, 2, 1]

# accumulate - running totals
list(accumulate([1, 2, 3, 4]))      # [1, 3, 6, 10]
list(accumulate([1, 2, 3, 4], initial=0))  # [0, 1, 3, 6, 10]

# With different operators
from operator import mul
list(accumulate([1, 2, 3, 4], mul)) # [1, 2, 6, 24]
list(accumulate([3, 1, 4], max))    # [3, 3, 4] (running max)

# groupby - group consecutive elements
# IMPORTANT: Must sort first for global grouping!
data = ['a', 'a', 'b', 'b', 'b', 'a']
for key, group in groupby(data):
    print(key, list(group))
# a ['a', 'a']
# b ['b', 'b', 'b']
# a ['a']

# Group by attribute
people = [('Alice', 'eng'), ('Bob', 'sales'), ('Carol', 'eng')]
people.sort(key=lambda x: x[1])
for dept, group in groupby(people, key=lambda x: x[1]):
    print(dept, [p[0] for p in group])

# filterfalse - opposite of filter
from itertools import filterfalse
list(filterfalse(lambda x: x % 2, range(10)))  # [0, 2, 4, 6, 8]

# compress - select by mask
list(compress('ABCDEF', [1, 0, 1, 0, 1, 1]))  # ['A', 'C', 'E', 'F']

# starmap - apply function to unpacked arguments
from itertools import starmap
list(starmap(pow, [(2, 5), (3, 2), (10, 3)]))  # [32, 9, 1000]
```

### pairwise (Python 3.10+)

```python
from itertools import pairwise

list(pairwise([1, 2, 3, 4]))        # [(1, 2), (2, 3), (3, 4)]

# Use case: Check if sorted
def is_sorted(iterable):
    return all(a <= b for a, b in pairwise(iterable))

# Pre-3.10 equivalent
def pairwise_compat(iterable):
    a, b = tee(iterable)
    next(b, None)
    return zip(a, b)
```

### batched (Python 3.12+)

```python
from itertools import batched

list(batched('ABCDEFG', 3))         # [('A', 'B', 'C'), ('D', 'E', 'F'), ('G',)]

# Pre-3.12 equivalent
def batched_compat(iterable, n):
    from itertools import islice
    it = iter(iterable)
    while batch := tuple(islice(it, n)):
        yield batch
```

---

## functools

The `functools` module provides higher-order functions.

### cache and lru_cache — Memoization

```python
from functools import cache, lru_cache

# @cache - unlimited cache (Python 3.9+)
@cache
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

fibonacci(100)                      # Instant!

# @lru_cache - limited cache
@lru_cache(maxsize=128)
def expensive_computation(x, y):
    return x ** y

# Cache management
fibonacci.cache_info()              # CacheInfo(hits=98, misses=101, ...)
fibonacci.cache_clear()             # Clear cache

# With typed=True, different types are cached separately
@lru_cache(maxsize=128, typed=True)
def typed_func(x):
    return x * 2

typed_func(3)                       # int
typed_func(3.0)                     # float (separate cache entry)

# Interview pattern: Memoized DP
@cache
def min_cost_path(grid, i, j):
    if i < 0 or j < 0:
        return float('inf')
    if i == 0 and j == 0:
        return grid[0][0]
    return grid[i][j] + min(
        min_cost_path(grid, i-1, j),
        min_cost_path(grid, i, j-1)
    )
```

### reduce — Fold Operation

```python
from functools import reduce

# Sum
reduce(lambda a, b: a + b, [1, 2, 3, 4])  # 10

# Product
reduce(lambda a, b: a * b, [1, 2, 3, 4])  # 24

# With initial value
reduce(lambda a, b: a + b, [1, 2, 3], 10)  # 16

# Find maximum
reduce(lambda a, b: a if a > b else b, [3, 1, 4, 1, 5])  # 5

# Flatten
reduce(lambda a, b: a + b, [[1, 2], [3, 4], [5]])  # [1, 2, 3, 4, 5]

# GCD of list
from math import gcd
reduce(gcd, [12, 18, 24])           # 6

# Note: Often better to use built-in functions
sum([1, 2, 3, 4])                   # Better than reduce for sum
max([3, 1, 4, 1, 5])                # Better than reduce for max
```

### partial — Partial Function Application

```python
from functools import partial

# Create specialized function
def power(base, exponent):
    return base ** exponent

square = partial(power, exponent=2)
cube = partial(power, exponent=3)

square(5)                           # 25
cube(5)                             # 125

# Use case: Callbacks with arguments
from functools import partial

def callback(message, sender):
    print(f"{sender}: {message}")

error_callback = partial(callback, sender="ERROR")
info_callback = partial(callback, sender="INFO")

error_callback("Something went wrong")  # ERROR: Something went wrong

# Use case: Default arguments for sorting
from functools import partial

def compare(x, y, reverse=False):
    if reverse:
        return y - x
    return x - y

from functools import cmp_to_key
sorted([3, 1, 4], key=cmp_to_key(partial(compare, reverse=True)))
```

### cmp_to_key — Custom Comparator

```python
from functools import cmp_to_key

# Compare function: return negative (a < b), 0 (equal), positive (a > b)
def compare(a, b):
    return a - b                    # Ascending

sorted([3, 1, 4, 1, 5], key=cmp_to_key(compare))

# Use case: Custom string sorting
def compare_versions(v1, v2):
    v1_parts = [int(x) for x in v1.split('.')]
    v2_parts = [int(x) for x in v2.split('.')]
    for a, b in zip(v1_parts, v2_parts):
        if a != b:
            return a - b
    return len(v1_parts) - len(v2_parts)

versions = ['1.2', '1.10', '1.2.3', '1.1']
sorted(versions, key=cmp_to_key(compare_versions))
# ['1.1', '1.2', '1.2.3', '1.10']

# Use case: Largest number
def largest_number_compare(x, y):
    if x + y > y + x:
        return -1
    elif x + y < y + x:
        return 1
    return 0

nums = ['3', '30', '34', '5', '9']
sorted(nums, key=cmp_to_key(largest_number_compare))
# ['9', '5', '34', '3', '30'] -> "9534330"
```

### total_ordering — Complete Comparison from Two

```python
from functools import total_ordering

@total_ordering
class Student:
    def __init__(self, name, grade):
        self.name = name
        self.grade = grade

    def __eq__(self, other):
        return self.grade == other.grade

    def __lt__(self, other):
        return self.grade < other.grade

# Now has __le__, __gt__, __ge__ automatically
s1 = Student("Alice", 85)
s2 = Student("Bob", 90)
s1 < s2                             # True
s1 <= s2                            # True
s1 > s2                             # False
s1 >= s2                            # False
```

### wraps — Preserve Function Metadata

```python
from functools import wraps

def timer(func):
    @wraps(func)                    # Preserve __name__, __doc__, etc.
    def wrapper(*args, **kwargs):
        import time
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__} took {time.time() - start:.4f}s")
        return result
    return wrapper

@timer
def slow_function():
    """This is a slow function."""
    import time
    time.sleep(1)

slow_function.__name__              # "slow_function" (not "wrapper")
slow_function.__doc__               # "This is a slow function."
```

---

## bisect

The `bisect` module provides binary search functions for sorted sequences.

### Basic Functions

```python
from bisect import bisect_left, bisect_right, insort_left, insort_right

nums = [1, 2, 2, 2, 3, 4, 5]

# bisect_left - leftmost insertion point
bisect_left(nums, 2)                # 1

# bisect_right (or bisect) - rightmost insertion point
bisect_right(nums, 2)               # 4

# insort_left - insert maintaining order
insort_left(nums, 2.5)              # nums = [1, 2, 2, 2, 2.5, 3, 4, 5]

# insort_right
insort_right(nums, 2.5)
```

### Common Patterns

```python
from bisect import bisect_left, bisect_right

# Find first occurrence
def find_first(nums, target):
    i = bisect_left(nums, target)
    if i < len(nums) and nums[i] == target:
        return i
    return -1

# Find last occurrence
def find_last(nums, target):
    i = bisect_right(nums, target) - 1
    if i >= 0 and nums[i] == target:
        return i
    return -1

# Count occurrences
def count(nums, target):
    return bisect_right(nums, target) - bisect_left(nums, target)

# Find floor (largest <= target)
def floor(nums, target):
    i = bisect_right(nums, target)
    if i > 0:
        return nums[i - 1]
    return None

# Find ceiling (smallest >= target)
def ceiling(nums, target):
    i = bisect_left(nums, target)
    if i < len(nums):
        return nums[i]
    return None

# Range search [lo, hi)
def range_count(nums, lo, hi):
    return bisect_left(nums, hi) - bisect_left(nums, lo)
```

### With Custom Key (Python 3.10+)

```python
from bisect import bisect_left

# Search by attribute
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

people = [Person("Alice", 25), Person("Bob", 30), Person("Carol", 35)]

# Find insertion point for age 28
idx = bisect_left(people, 28, key=lambda p: p.age)

# Pre-3.10: Use separate key list
ages = [p.age for p in people]
idx = bisect_left(ages, 28)
```

---

## heapq

See [02-data-structures.md](02-data-structures.md#heaps-heapq) for comprehensive heapq coverage.

### Quick Reference

```python
import heapq

# Create heap (min-heap)
heap = []
heapq.heappush(heap, 3)
heapq.heappush(heap, 1)
heapq.heappush(heap, 4)

# Or heapify existing list - O(n)
nums = [3, 1, 4, 1, 5]
heapq.heapify(nums)

# Pop minimum - O(log n)
smallest = heapq.heappop(heap)

# Peek minimum - O(1)
smallest = heap[0]

# Push then pop (more efficient)
result = heapq.heappushpop(heap, 5)

# Pop then push
result = heapq.heapreplace(heap, 5)

# K largest/smallest - O(n log k)
heapq.nlargest(3, nums)
heapq.nsmallest(3, nums)
heapq.nlargest(3, items, key=lambda x: x.score)

# Merge sorted iterables
heapq.merge([1, 3, 5], [2, 4, 6])   # Iterator

# Max heap (negate values)
max_heap = [-x for x in nums]
heapq.heapify(max_heap)
largest = -heapq.heappop(max_heap)
```

---

## math

Mathematical functions for interviews.

### Common Functions

```python
import math

# Basic
math.sqrt(16)                       # 4.0
math.isqrt(16)                      # 4 (integer, Python 3.8+)
math.pow(2, 10)                     # 1024.0
math.log(100, 10)                   # 2.0
math.log2(8)                        # 3.0
math.log10(100)                     # 2.0

# Rounding
math.floor(3.7)                     # 3
math.ceil(3.2)                      # 4
math.trunc(-3.7)                    # -3 (toward zero)

# Special values
math.inf                            # Positive infinity
-math.inf                           # Negative infinity
math.nan                            # Not a number
math.isinf(x)                       # Check if infinite
math.isnan(x)                       # Check if NaN

# GCD and LCM
math.gcd(12, 18)                    # 6
math.gcd(12, 18, 24)                # 6 (Python 3.9+)
math.lcm(4, 6)                      # 12 (Python 3.9+)
math.lcm(4, 6, 8)                   # 24 (Python 3.9+)

# Factorial and combinatorics
math.factorial(5)                   # 120
math.comb(5, 2)                     # 10 (Python 3.8+)
math.perm(5, 2)                     # 20 (Python 3.8+)

# Absolute value
abs(-5)                             # 5 (built-in)
math.fabs(-5.0)                     # 5.0 (always float)

# Sum with precision
math.fsum([0.1, 0.2, 0.3])          # 0.6 (more precise than sum)

# Product
math.prod([1, 2, 3, 4])             # 24 (Python 3.8+)
```

### Interview Patterns

```python
import math

# Check if perfect square
def is_perfect_square(n):
    if n < 0:
        return False
    root = math.isqrt(n)
    return root * root == n

# Check if power of two
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0

# Distance between points
def distance(p1, p2):
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

# Or use math.dist (Python 3.8+)
math.dist([0, 0], [3, 4])           # 5.0

# Angle calculations
math.degrees(math.pi)               # 180.0
math.radians(180)                   # 3.14159...
math.atan2(1, 1)                    # 0.785... (pi/4)
```

---

## operator

The `operator` module provides function equivalents of operators.

### Common Operators

```python
from operator import (
    add, sub, mul, truediv, floordiv, mod, pow, neg,
    eq, ne, lt, le, gt, ge,
    and_, or_, not_, xor,
    itemgetter, attrgetter, methodcaller
)

# Arithmetic (useful with reduce)
from functools import reduce
reduce(add, [1, 2, 3, 4])           # 10
reduce(mul, [1, 2, 3, 4])           # 24

# Comparison
lt(1, 2)                            # True (1 < 2)
```

### itemgetter — Get Items by Key/Index

```python
from operator import itemgetter

# Single key
get_first = itemgetter(0)
get_first([1, 2, 3])                # 1

# Multiple keys
get_parts = itemgetter(0, 2)
get_parts(['a', 'b', 'c', 'd'])     # ('a', 'c')

# Sorting by key
pairs = [('b', 2), ('a', 1), ('c', 3)]
sorted(pairs, key=itemgetter(0))    # [('a', 1), ('b', 2), ('c', 3)]
sorted(pairs, key=itemgetter(1))    # [('a', 1), ('b', 2), ('c', 3)]

# Multi-level sort
data = [('b', 2), ('a', 1), ('b', 1)]
sorted(data, key=itemgetter(0, 1))  # [('a', 1), ('b', 1), ('b', 2)]
```

### attrgetter — Get Attributes

```python
from operator import attrgetter

class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

people = [Person("Alice", 30), Person("Bob", 25), Person("Carol", 35)]

# Sort by attribute
sorted(people, key=attrgetter('age'))

# Multiple attributes
sorted(people, key=attrgetter('age', 'name'))

# Nested attributes
get_city = attrgetter('address.city')
```

### methodcaller — Call Methods

```python
from operator import methodcaller

# Call method with arguments
upper = methodcaller('upper')
upper('hello')                      # 'HELLO'

replace_a = methodcaller('replace', 'a', 'X')
replace_a('banana')                 # 'bXnXnX'

# Sort by method result
words = ['banana', 'pie', 'apple']
sorted(words, key=methodcaller('count', 'a'))  # By count of 'a'
```

---

## string

String constants and templates.

### String Constants

```python
import string

string.ascii_lowercase              # 'abcdefghijklmnopqrstuvwxyz'
string.ascii_uppercase              # 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
string.ascii_letters                # Both cases
string.digits                       # '0123456789'
string.hexdigits                    # '0123456789abcdefABCDEF'
string.octdigits                    # '01234567'
string.punctuation                  # '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'
string.whitespace                   # ' \t\n\r\x0b\x0c'
string.printable                    # All printable characters

# Use case: Check if string is alphabetic
def is_alpha(s):
    return all(c in string.ascii_letters for c in s)

# Use case: Generate alphabet
alphabet = list(string.ascii_lowercase)
```

---

## copy

Deep and shallow copying.

### Shallow vs Deep Copy

```python
import copy

# Shallow copy - copies container, but not nested objects
original = [[1, 2], [3, 4]]
shallow = copy.copy(original)
shallow[0][0] = 99                  # Modifies original too!
# original = [[99, 2], [3, 4]]

# Deep copy - copies everything recursively
original = [[1, 2], [3, 4]]
deep = copy.deepcopy(original)
deep[0][0] = 99                     # original unchanged
# original = [[1, 2], [3, 4]]

# Other ways to shallow copy
list_copy = original[:]
list_copy = list(original)
dict_copy = original.copy()
set_copy = original.copy()
```

### copy.replace (Python 3.13+)

```python
import copy
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

p1 = Point(1, 2)
p2 = copy.replace(p1, x=10)         # Point(x=10, y=2)
```

---

## When to Use What

### Data Structure Selection

| Need | Use |
|------|-----|
| O(1) append/pop both ends | `deque` |
| Auto-initializing dict | `defaultdict` |
| Count frequencies | `Counter` |
| Named fields, immutable | `namedtuple` or `dataclass(frozen=True)` |
| LRU cache | `OrderedDict` |
| Priority queue | `heapq` |
| Sorted container | `bisect` + list |

### Iteration Selection

| Need | Use |
|------|-----|
| All permutations | `itertools.permutations` |
| All combinations | `itertools.combinations` |
| Cartesian product | `itertools.product` |
| Concatenate iterables | `itertools.chain` |
| Running totals | `itertools.accumulate` |
| Group consecutive | `itertools.groupby` |
| Limit infinite | `itertools.islice` |

### Function Selection

| Need | Use |
|------|-----|
| Memoization | `@cache` or `@lru_cache` |
| Fold/reduce | `functools.reduce` |
| Partial application | `functools.partial` |
| Custom comparator | `functools.cmp_to_key` |
| Preserve metadata | `@functools.wraps` |

### Common Imports for Interviews

```python
# Essential imports for most interview problems
from collections import defaultdict, Counter, deque
from heapq import heappush, heappop, heapify
from functools import cache, lru_cache
from itertools import permutations, combinations, accumulate
from bisect import bisect_left, bisect_right
import math
```
