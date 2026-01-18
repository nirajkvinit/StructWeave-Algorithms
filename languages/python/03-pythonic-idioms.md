# Pythonic Idioms

> Python-specific patterns that make code clean, efficient, and idiomatic

These idioms distinguish experienced Python developers. Master them to write code that's not just correct, but elegant.

---

## Table of Contents

1. [List Comprehensions](#list-comprehensions)
2. [Dictionary & Set Comprehensions](#dictionary--set-comprehensions)
3. [Generators and Iterators](#generators-and-iterators)
4. [Decorators](#decorators)
5. [Context Managers](#context-managers)
6. [Unpacking and Packing](#unpacking-and-packing)
7. [The Walrus Operator](#the-walrus-operator)
8. [EAFP vs LBYL](#eafp-vs-lbyl)
9. [Iteration Patterns](#iteration-patterns)
10. [Common Anti-Patterns to Avoid](#common-anti-patterns-to-avoid)

---

## List Comprehensions

List comprehensions provide a concise way to create lists. They're not just shorter—they're often clearer and faster.

### Basic Syntax

```python
# Traditional loop
squares = []
for x in range(10):
    squares.append(x ** 2)

# List comprehension
squares = [x ** 2 for x in range(10)]
```

### With Condition (Filter)

```python
# Only even numbers
evens = [x for x in range(10) if x % 2 == 0]
# [0, 2, 4, 6, 8]

# Multiple conditions
result = [x for x in range(100) if x % 2 == 0 if x % 3 == 0]
# [0, 6, 12, 18, 24, ...]

# Same as
result = [x for x in range(100) if x % 2 == 0 and x % 3 == 0]
```

### With Conditional Expression

```python
# if-else in expression (not filter)
labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]
# ['even', 'odd', 'even', 'odd', 'even']

# Replace negatives with zero
nums = [3, -1, 4, -2, 5]
positive = [x if x > 0 else 0 for x in nums]
# [3, 0, 4, 0, 5]
```

### Nested Comprehensions

```python
# Flatten 2D list
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [x for row in matrix for x in row]
# [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Create 2D matrix
rows, cols = 3, 4
matrix = [[0] * cols for _ in range(rows)]
# [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

# Matrix transpose
transposed = [[row[i] for row in matrix] for i in range(cols)]

# Cartesian product
pairs = [(x, y) for x in [1, 2, 3] for y in ['a', 'b']]
# [(1, 'a'), (1, 'b'), (2, 'a'), (2, 'b'), (3, 'a'), (3, 'b')]
```

### When to Use List Comprehensions

```python
# GOOD: Simple transformations and filters
squares = [x**2 for x in nums]
evens = [x for x in nums if x % 2 == 0]
words_upper = [w.upper() for w in words]

# AVOID: Complex logic (use regular loop)
# BAD - too complex
result = [
    (x, y, x + y)
    for x in range(10)
    for y in range(10)
    if x != y
    if (x + y) % 2 == 0
    if x * y < 50
]

# BETTER - use regular loop for complex cases
result = []
for x in range(10):
    for y in range(10):
        if x != y and (x + y) % 2 == 0 and x * y < 50:
            result.append((x, y, x + y))
```

### Comprehension vs map/filter

```python
# Comprehension (preferred in Python)
squares = [x**2 for x in nums]
evens = [x for x in nums if x % 2 == 0]

# map/filter (less Pythonic, but sometimes useful)
squares = list(map(lambda x: x**2, nums))
evens = list(filter(lambda x: x % 2 == 0, nums))

# When map is cleaner: existing function
lengths = list(map(len, words))
# vs
lengths = [len(w) for w in words]
```

---

## Dictionary & Set Comprehensions

### Dictionary Comprehension

```python
# Basic
squares = {x: x**2 for x in range(5)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}

# From two lists
keys = ['a', 'b', 'c']
values = [1, 2, 3]
d = {k: v for k, v in zip(keys, values)}
# {'a': 1, 'b': 2, 'c': 3}

# Invert dictionary
original = {'a': 1, 'b': 2, 'c': 3}
inverted = {v: k for k, v in original.items()}
# {1: 'a', 2: 'b', 3: 'c'}

# Filter dictionary
scores = {'alice': 85, 'bob': 72, 'carol': 90, 'dave': 65}
passing = {k: v for k, v in scores.items() if v >= 75}
# {'alice': 85, 'carol': 90}

# Transform keys and values
lower_scores = {k.upper(): v * 1.1 for k, v in scores.items()}
```

### Set Comprehension

```python
# Unique squares
squares = {x**2 for x in range(-5, 6)}
# {0, 1, 4, 9, 16, 25}

# Unique first characters
words = ['apple', 'banana', 'apricot', 'cherry']
first_chars = {w[0] for w in words}
# {'a', 'b', 'c'}
```

### Common Patterns

```python
# Index lookup dictionary
names = ['alice', 'bob', 'carol']
name_to_idx = {name: i for i, name in enumerate(names)}
# {'alice': 0, 'bob': 1, 'carol': 2}

# Frequency dictionary (alternative to Counter)
text = "hello world"
freq = {c: text.count(c) for c in set(text)}

# Group by attribute
from collections import defaultdict
people = [('Alice', 'eng'), ('Bob', 'sales'), ('Carol', 'eng')]
by_dept = defaultdict(list)
for name, dept in people:
    by_dept[dept].append(name)
# Or with comprehension + groupby
from itertools import groupby
sorted_people = sorted(people, key=lambda x: x[1])
by_dept = {k: [p[0] for p in g] for k, g in groupby(sorted_people, key=lambda x: x[1])}
```

---

## Generators and Iterators

Generators produce values lazily, one at a time, saving memory for large datasets.

### Generator Expressions

```python
# List comprehension - creates list in memory
squares_list = [x**2 for x in range(1000000)]

# Generator expression - creates lazily
squares_gen = (x**2 for x in range(1000000))

# Use in functions that consume iterables
sum(x**2 for x in range(1000000))   # Memory efficient
max(x**2 for x in range(1000000))
any(x > 100 for x in nums)          # Short-circuits
all(x > 0 for x in nums)            # Short-circuits
```

### Generator Functions

```python
def count_up(n):
    """Yield numbers from 0 to n-1."""
    i = 0
    while i < n:
        yield i
        i += 1

# Usage
for num in count_up(5):
    print(num)                      # 0, 1, 2, 3, 4

# Convert to list
list(count_up(5))                   # [0, 1, 2, 3, 4]
```

### Infinite Generators

```python
def infinite_counter(start=0):
    """Count forever starting from start."""
    n = start
    while True:
        yield n
        n += 1

# Use with islice to limit
from itertools import islice
first_ten = list(islice(infinite_counter(), 10))

# Fibonacci generator
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

first_10_fib = list(islice(fibonacci(), 10))
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### yield from

```python
# Delegate to another generator
def flatten(nested):
    for item in nested:
        if isinstance(item, list):
            yield from flatten(item)
        else:
            yield item

nested = [1, [2, 3, [4, 5]], 6]
list(flatten(nested))               # [1, 2, 3, 4, 5, 6]

# Chain generators
def chain(*iterables):
    for it in iterables:
        yield from it

list(chain([1, 2], [3, 4], [5]))    # [1, 2, 3, 4, 5]
```

### Generator vs List: When to Use

```python
# Use generator when:
# - Large dataset (memory matters)
# - Only need to iterate once
# - May not need all values (short-circuit)
# - Chaining transformations

# Use list when:
# - Need to iterate multiple times
# - Need indexing or length
# - Need to modify collection
# - Dataset is small

# Example: Processing large file
def read_large_file(path):
    with open(path) as f:
        for line in f:             # File is already lazy
            yield line.strip()

# Memory-efficient pipeline
def process_logs(path):
    lines = read_large_file(path)
    parsed = (parse(line) for line in lines)
    filtered = (entry for entry in parsed if entry.level == 'ERROR')
    return filtered                 # Still lazy!
```

---

## Decorators

Decorators modify or enhance functions without changing their code.

### Basic Decorator

```python
def timer(func):
    """Measure function execution time."""
    import time
    from functools import wraps

    @wraps(func)                    # Preserve function metadata
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result

    return wrapper

@timer
def slow_function():
    import time
    time.sleep(1)

slow_function()                     # "slow_function took 1.0012s"
```

### Decorator with Arguments

```python
def repeat(times):
    """Repeat function call n times."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(3)
def greet(name):
    print(f"Hello, {name}!")

greet("Alice")
# Hello, Alice!
# Hello, Alice!
# Hello, Alice!
```

### Common Built-in Decorators

```python
# @property - getter/setter
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("Radius must be non-negative")
        self._radius = value

    @property
    def area(self):
        return 3.14159 * self._radius ** 2

# @staticmethod - no self parameter
class Math:
    @staticmethod
    def add(a, b):
        return a + b

# @classmethod - receives class, not instance
class Counter:
    count = 0

    @classmethod
    def increment(cls):
        cls.count += 1
```

### Memoization with @cache

```python
from functools import cache, lru_cache

# @cache - unlimited cache (Python 3.9+)
@cache
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

fibonacci(100)                      # Instant!

# @lru_cache - limited cache (all versions)
@lru_cache(maxsize=128)
def expensive_computation(x):
    # Heavy computation
    return x ** 2

# Clear cache
expensive_computation.cache_clear()

# Cache info
expensive_computation.cache_info()  # CacheInfo(hits=10, misses=5, ...)
```

### Interview Pattern: Memoized DP

```python
from functools import cache

def coin_change(coins: list[int], amount: int) -> int:
    @cache
    def dp(remaining):
        if remaining == 0:
            return 0
        if remaining < 0:
            return float('inf')

        min_coins = float('inf')
        for coin in coins:
            min_coins = min(min_coins, dp(remaining - coin) + 1)
        return min_coins

    result = dp(amount)
    return result if result != float('inf') else -1
```

### Stacking Decorators

```python
@decorator1
@decorator2
@decorator3
def func():
    pass

# Equivalent to:
func = decorator1(decorator2(decorator3(func)))
# Decorators apply bottom-to-top
```

---

## Context Managers

Context managers handle setup and cleanup automatically.

### Using with Statement

```python
# File handling
with open('file.txt', 'r') as f:
    content = f.read()
# File automatically closed, even if exception

# Multiple context managers
with open('input.txt') as fin, open('output.txt', 'w') as fout:
    fout.write(fin.read())

# Python 3.10+ parenthesized form
with (
    open('input.txt') as fin,
    open('output.txt', 'w') as fout,
):
    fout.write(fin.read())
```

### Creating Context Managers

```python
# Method 1: Class-based
class Timer:
    def __enter__(self):
        import time
        self.start = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        import time
        self.elapsed = time.time() - self.start
        print(f"Elapsed: {self.elapsed:.4f}s")
        return False                # Don't suppress exceptions

with Timer() as t:
    # Do something
    pass
print(f"Took {t.elapsed:.4f}s")

# Method 2: @contextmanager decorator
from contextlib import contextmanager

@contextmanager
def timer():
    import time
    start = time.time()
    try:
        yield                       # Code in 'with' block runs here
    finally:
        elapsed = time.time() - start
        print(f"Elapsed: {elapsed:.4f}s")

with timer():
    # Do something
    pass
```

### Common Context Managers

```python
# Suppress specific exceptions
from contextlib import suppress

with suppress(FileNotFoundError):
    os.remove('missing.txt')        # No error if file doesn't exist

# Redirect stdout
from contextlib import redirect_stdout
import io

f = io.StringIO()
with redirect_stdout(f):
    print("This goes to string")
output = f.getvalue()

# Change directory temporarily
from contextlib import chdir        # Python 3.11+

with chdir('/tmp'):
    # Work in /tmp
    pass
# Back to original directory

# Threading lock
import threading
lock = threading.Lock()

with lock:
    # Thread-safe code
    pass
```

---

## Unpacking and Packing

### Tuple Unpacking

```python
# Basic
a, b = 1, 2
a, b = b, a                         # Swap

# From sequence
first, second, third = [1, 2, 3]
x, y = (10, 20)

# Ignore values
a, _, c = (1, 2, 3)                 # Ignore middle
_, *rest = [1, 2, 3, 4]             # Ignore first

# Extended unpacking
first, *rest = [1, 2, 3, 4, 5]      # first=1, rest=[2,3,4,5]
*start, last = [1, 2, 3, 4, 5]      # start=[1,2,3,4], last=5
first, *middle, last = [1, 2, 3, 4, 5]  # first=1, middle=[2,3,4], last=5

# Nested unpacking
(a, b), c = (1, 2), 3               # a=1, b=2, c=3
[(a, b), (c, d)] = [(1, 2), (3, 4)]
```

### Function Arguments

```python
# *args - variable positional arguments
def sum_all(*args):
    return sum(args)

sum_all(1, 2, 3, 4)                 # 10

# **kwargs - variable keyword arguments
def print_info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key}: {value}")

print_info(name="Alice", age=30)

# Combined
def func(required, *args, **kwargs):
    print(f"Required: {required}")
    print(f"Args: {args}")
    print(f"Kwargs: {kwargs}")

# Keyword-only arguments (after *)
def func(a, *, b, c):
    return a + b + c

func(1, b=2, c=3)                   # Works
# func(1, 2, 3)                     # Error

# Positional-only arguments (before /, Python 3.8+)
def func(a, b, /, c, d):
    return a + b + c + d

func(1, 2, 3, d=4)                  # Works
# func(a=1, b=2, c=3, d=4)          # Error for a and b
```

### Unpacking in Function Calls

```python
# Unpack list as arguments
args = [1, 2, 3]
func(*args)                         # func(1, 2, 3)

# Unpack dict as keyword arguments
kwargs = {'a': 1, 'b': 2}
func(**kwargs)                      # func(a=1, b=2)

# Combine
func(*args, **kwargs)

# Merge dictionaries (Python 3.9+)
d1 = {'a': 1, 'b': 2}
d2 = {'b': 3, 'c': 4}
merged = {**d1, **d2}               # {'a': 1, 'b': 3, 'c': 4}
# Or using |
merged = d1 | d2                    # Python 3.9+

# Merge lists
l1 = [1, 2]
l2 = [3, 4]
merged = [*l1, *l2]                 # [1, 2, 3, 4]
```

---

## The Walrus Operator

The walrus operator `:=` (Python 3.8+) assigns and returns a value in a single expression.

### Basic Usage

```python
# Without walrus
n = len(items)
if n > 10:
    print(f"List is too long: {n}")

# With walrus
if (n := len(items)) > 10:
    print(f"List is too long: {n}")
```

### In While Loops

```python
# Without walrus
line = file.readline()
while line:
    process(line)
    line = file.readline()

# With walrus
while (line := file.readline()):
    process(line)

# Reading chunks
while (chunk := file.read(8192)):
    process(chunk)
```

### In Comprehensions

```python
# Filter and transform with computed value
results = [
    y
    for x in data
    if (y := expensive_computation(x)) > threshold
]

# Without walrus (computes twice)
results = [
    expensive_computation(x)
    for x in data
    if expensive_computation(x) > threshold
]
```

### In Regular Expressions

```python
import re

# Without walrus
match = re.search(pattern, text)
if match:
    print(match.group())

# With walrus
if (match := re.search(pattern, text)):
    print(match.group())
```

### When to Use

```python
# GOOD: Avoid repeated computation
if (result := compute()) is not None:
    use(result)

# GOOD: Simplify while loops
while (chunk := read_chunk()):
    process(chunk)

# GOOD: In comprehensions
filtered = [y for x in data if (y := f(x)) > 0]

# AVOID: Simple assignment (use regular =)
# BAD
(x := 5)

# GOOD
x = 5
```

---

## EAFP vs LBYL

**EAFP**: Easier to Ask Forgiveness than Permission (try/except)
**LBYL**: Look Before You Leap (if checks)

Python typically prefers EAFP.

### Dictionary Access

```python
# LBYL (less Pythonic)
if key in d:
    value = d[key]
else:
    value = default

# EAFP (more Pythonic)
try:
    value = d[key]
except KeyError:
    value = default

# Best: use .get()
value = d.get(key, default)
```

### Attribute Access

```python
# LBYL
if hasattr(obj, 'attribute'):
    value = obj.attribute
else:
    value = default

# EAFP
try:
    value = obj.attribute
except AttributeError:
    value = default

# Best: use getattr
value = getattr(obj, 'attribute', default)
```

### File Operations

```python
# LBYL (race condition!)
import os
if os.path.exists(filename):
    with open(filename) as f:
        return f.read()

# EAFP (safer)
try:
    with open(filename) as f:
        return f.read()
except FileNotFoundError:
    return None
```

### Type Checking

```python
# LBYL
if isinstance(value, int):
    return value + 1

# EAFP (duck typing)
try:
    return value + 1
except TypeError:
    raise TypeError("Expected numeric type")
```

### When to Use Each

```python
# Use EAFP when:
# - Exception is rare
# - Check would duplicate work
# - Race conditions possible
# - Duck typing is appropriate

# Use LBYL when:
# - Exception is common
# - Check is very cheap
# - Failure has side effects
# - Debugging/logging needed before attempt
```

---

## Iteration Patterns

### enumerate()

```python
# Get index and value
for i, item in enumerate(items):
    print(f"{i}: {item}")

# Start from different index
for i, item in enumerate(items, start=1):
    print(f"{i}: {item}")

# Build index dictionary
index_map = {item: i for i, item in enumerate(items)}
```

### zip()

```python
# Parallel iteration
names = ['Alice', 'Bob', 'Carol']
ages = [30, 25, 35]

for name, age in zip(names, ages):
    print(f"{name}: {age}")

# Create dict from two lists
d = dict(zip(names, ages))

# Unzip
pairs = [('a', 1), ('b', 2), ('c', 3)]
letters, numbers = zip(*pairs)

# zip_longest for unequal lengths
from itertools import zip_longest
for a, b in zip_longest([1, 2, 3], ['a', 'b'], fillvalue=None):
    print(a, b)                     # 1 a, 2 b, 3 None

# strict mode (Python 3.10+)
for a, b in zip(list1, list2, strict=True):
    pass                            # Raises if lengths differ
```

### reversed() and sorted()

```python
# Reverse iteration (no copy)
for item in reversed(items):
    print(item)

# Sorted iteration (creates copy)
for item in sorted(items):
    print(item)

# Combined
for item in sorted(items, reverse=True):
    print(item)

# With key
sorted(items, key=len)
sorted(items, key=lambda x: x.lower())
sorted(items, key=str.lower)
```

### any() and all()

```python
# any: True if at least one True
any([False, False, True])           # True
any(x > 10 for x in nums)           # Short-circuits

# all: True if all True
all([True, True, True])             # True
all(x > 0 for x in nums)            # Short-circuits

# Common patterns
has_negative = any(x < 0 for x in nums)
all_positive = all(x > 0 for x in nums)
contains_empty = any(len(s) == 0 for s in strings)
all_valid = all(validate(item) for item in items)
```

### Chaining Iterations

```python
from itertools import chain

# Chain multiple iterables
for item in chain([1, 2], [3, 4], [5, 6]):
    print(item)

# Flatten one level
nested = [[1, 2], [3, 4], [5, 6]]
flat = list(chain.from_iterable(nested))

# Using comprehension
flat = [x for sublist in nested for x in sublist]
```

### Grouping with itertools.groupby

```python
from itertools import groupby

# Group consecutive equal elements
data = [1, 1, 2, 2, 2, 3, 1, 1]
for key, group in groupby(data):
    print(key, list(group))
# 1 [1, 1]
# 2 [2, 2, 2]
# 3 [3]
# 1 [1, 1]

# Group by attribute (must be sorted first!)
people = [
    ('Alice', 'eng'),
    ('Bob', 'sales'),
    ('Carol', 'eng'),
    ('Dave', 'sales'),
]
people.sort(key=lambda x: x[1])
for dept, group in groupby(people, key=lambda x: x[1]):
    print(dept, [p[0] for p in group])
```

---

## Common Anti-Patterns to Avoid

### Mutable Default Arguments

```python
# BAD: Mutable default argument
def add_item(item, items=[]):       # items is shared across calls!
    items.append(item)
    return items

add_item(1)                         # [1]
add_item(2)                         # [1, 2] - unexpected!

# GOOD: Use None as default
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

### Late Binding in Closures

```python
# BAD: Late binding
funcs = []
for i in range(5):
    funcs.append(lambda: i)

[f() for f in funcs]                # [4, 4, 4, 4, 4] - all 4!

# GOOD: Capture value with default argument
funcs = []
for i in range(5):
    funcs.append(lambda i=i: i)     # Captures current i

[f() for f in funcs]                # [0, 1, 2, 3, 4]

# GOOD: Use functools.partial
from functools import partial

funcs = [partial(lambda x: x, i) for i in range(5)]
```

### Bare Except Clause

```python
# BAD: Catches everything including KeyboardInterrupt
try:
    risky_operation()
except:
    pass

# GOOD: Catch specific exceptions
try:
    risky_operation()
except ValueError:
    handle_value_error()
except (TypeError, KeyError) as e:
    handle_other_error(e)

# OK: Catch Exception (not BaseException)
try:
    risky_operation()
except Exception as e:
    log_error(e)
```

### String Concatenation in Loops

```python
# BAD: O(n²) string concatenation
result = ""
for item in items:
    result += str(item)             # Creates new string each time

# GOOD: Use join - O(n)
result = "".join(str(item) for item in items)

# GOOD: Use list and join
parts = []
for item in items:
    parts.append(str(item))
result = "".join(parts)
```

### Using list() when not needed

```python
# BAD: Unnecessary list creation
for item in list(some_iterable):
    process(item)

# GOOD: Iterate directly
for item in some_iterable:
    process(item)

# BAD: list(range())
for i in list(range(10)):
    process(i)

# GOOD: range is already iterable
for i in range(10):
    process(i)

# EXCEPTION: When you need to modify while iterating
for item in list(items):            # Copy needed
    if should_remove(item):
        items.remove(item)
```

### Using range(len()) unnecessarily

```python
# BAD: Using index when not needed
for i in range(len(items)):
    print(items[i])

# GOOD: Iterate directly
for item in items:
    print(item)

# If you need index, use enumerate
for i, item in enumerate(items):
    print(f"{i}: {item}")
```

### Comparing to None incorrectly

```python
# BAD
if x == None:
    pass

# GOOD
if x is None:
    pass

# BAD
if x != None:
    pass

# GOOD
if x is not None:
    pass
```

### Using type() for type checking

```python
# BAD: Exact type check
if type(x) == list:
    pass

# GOOD: isinstance handles inheritance
if isinstance(x, list):
    pass

# GOOD: Check for multiple types
if isinstance(x, (list, tuple)):
    pass
```

### Not using context managers

```python
# BAD: Manual resource management
f = open('file.txt')
try:
    content = f.read()
finally:
    f.close()

# GOOD: Context manager
with open('file.txt') as f:
    content = f.read()
```

---

## Quick Reference

### Pythonic Patterns

| Pattern | Example |
|---------|---------|
| List comprehension | `[x**2 for x in nums if x > 0]` |
| Dict comprehension | `{k: v for k, v in items}` |
| Generator expression | `(x**2 for x in nums)` |
| Memoization | `@cache` or `@lru_cache` |
| Unpacking | `a, *rest, b = items` |
| Swap | `a, b = b, a` |
| Walrus | `if (n := len(x)) > 10:` |
| Context manager | `with open(f) as file:` |
| enumerate | `for i, x in enumerate(items):` |
| zip | `for a, b in zip(list1, list2):` |

### Anti-Patterns to Avoid

| Anti-Pattern | Fix |
|--------------|-----|
| Mutable default | Use `None`, then `items = items or []` |
| Late binding | Use `lambda i=i:` |
| Bare except | Use `except Exception:` |
| String += in loop | Use `''.join(parts)` |
| `range(len(x))` | Use `enumerate(x)` |
| `== None` | Use `is None` |
| `type(x) == T` | Use `isinstance(x, T)` |
