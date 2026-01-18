# Python Syntax Quick Reference

> Essential Python syntax for coding interviews with Python 3.14 features

---

## Table of Contents

1. [Variables & Types](#variables--types)
2. [Basic Types](#basic-types)
3. [Strings](#strings)
4. [Control Flow](#control-flow)
5. [Loops](#loops)
6. [Functions](#functions)
7. [Classes](#classes)
8. [Exception Handling](#exception-handling)
9. [Python 3.10+ Pattern Matching](#python-310-pattern-matching)
10. [Python 3.12-3.14 Features](#python-312-314-features)
11. [Quick Reference Card](#quick-reference-card)

---

## Variables & Types

### Variable Declaration

```python
# Dynamic typing - no type declaration required
x = 42                      # int
name = "Alice"              # str
pi = 3.14159               # float
is_valid = True            # bool
nothing = None             # NoneType

# Type hints (optional, for readability)
x: int = 42
name: str = "Alice"
nums: list[int] = [1, 2, 3]
mapping: dict[str, int] = {"a": 1}
```

### Multiple Assignment

```python
# Simultaneous assignment
a, b = 1, 2

# Swap without temp variable
a, b = b, a

# Unpack from list/tuple
first, second, third = [1, 2, 3]

# Unpack with rest (Python 3.0+)
first, *rest = [1, 2, 3, 4]        # first=1, rest=[2, 3, 4]
first, *middle, last = [1, 2, 3, 4] # first=1, middle=[2, 3], last=4
*start, last = [1, 2, 3, 4]        # start=[1, 2, 3], last=4

# Unpack nested
(a, b), c = (1, 2), 3              # a=1, b=2, c=3
```

### Constants (Convention)

```python
# Python has no true constants - use UPPER_SNAKE_CASE by convention
MAX_SIZE = 100
PI = 3.14159
DEFAULT_NAME = "Unknown"

# For truly immutable values, use frozen dataclass or named tuple
from dataclasses import dataclass

@dataclass(frozen=True)
class Config:
    max_size: int = 100
```

### Type Checking at Runtime

```python
# Check type
isinstance(x, int)                  # True if x is int
isinstance(x, (int, float))         # True if x is int or float
type(x) == int                      # Exact type check (less preferred)

# Get type name
type(x).__name__                    # "int", "str", etc.
```

---

## Basic Types

### Numeric Types

```python
# Integers (arbitrary precision)
x = 42
big = 10**100                       # No overflow in Python
binary = 0b1010                     # 10 in binary
octal = 0o12                        # 10 in octal
hex_val = 0xFF                      # 255 in hex
with_underscores = 1_000_000        # Readable large numbers

# Integer operations
7 // 3                              # 2 (floor division)
7 % 3                               # 1 (modulo)
2 ** 10                             # 1024 (exponentiation)
abs(-5)                             # 5
divmod(7, 3)                        # (2, 1) - quotient and remainder

# Floats
pi = 3.14159
scientific = 1.5e-10                # 0.00000000015
inf = float('inf')                  # Positive infinity
neg_inf = float('-inf')             # Negative infinity
nan = float('nan')                  # Not a number

# Float operations
round(3.14159, 2)                   # 3.14
import math
math.floor(3.7)                     # 3
math.ceil(3.2)                      # 4
math.trunc(-3.7)                    # -3 (toward zero)

# Complex numbers (rarely used in interviews)
c = 3 + 4j
c.real                              # 3.0
c.imag                              # 4.0
abs(c)                              # 5.0 (magnitude)
```

### Boolean

```python
# Boolean values
is_valid = True
is_empty = False

# Falsy values (evaluate to False in boolean context)
# False, None, 0, 0.0, "", [], {}, set(), ()

# Truthy: everything else

# Boolean operations
True and False                      # False
True or False                       # True
not True                            # False

# Short-circuit evaluation
x = None
result = x and x.value              # None (doesn't access x.value)
result = x or "default"             # "default"

# Comparison chaining
1 < x < 10                          # True if x is between 1 and 10
a == b == c                         # True if all equal
```

### None

```python
x = None

# Check for None
if x is None:
    print("x is None")

# Never use == for None comparison
if x is not None:                   # Correct
    process(x)

# Common pattern: default arguments
def func(items=None):
    if items is None:
        items = []
    return items
```

### Type Conversions

```python
# To integer
int("42")                           # 42
int(3.7)                            # 3 (truncates)
int("1010", 2)                      # 10 (binary to int)
int("ff", 16)                       # 255 (hex to int)

# To float
float("3.14")                       # 3.14
float(42)                           # 42.0

# To string
str(42)                             # "42"
str([1, 2, 3])                      # "[1, 2, 3]"
repr([1, 2, 3])                     # "[1, 2, 3]" (with quotes for strings)

# To boolean
bool(0)                             # False
bool(1)                             # True
bool([])                            # False
bool([1])                           # True

# To list/tuple/set
list("abc")                         # ['a', 'b', 'c']
list(range(5))                      # [0, 1, 2, 3, 4]
tuple([1, 2, 3])                    # (1, 2, 3)
set([1, 2, 2, 3])                   # {1, 2, 3}

# To dict
dict([("a", 1), ("b", 2)])          # {"a": 1, "b": 2}
dict(a=1, b=2)                      # {"a": 1, "b": 2}
```

---

## Strings

### String Literals

```python
# Single and double quotes
s1 = 'hello'
s2 = "hello"
s3 = "it's easy"                    # Use double for apostrophe
s4 = 'say "hello"'                  # Use single for quotes

# Triple quotes for multiline
multiline = """
This is a
multiline string
"""

# Raw strings (no escape processing)
path = r"C:\Users\name"             # Backslashes not escaped
regex = r"\d+\.\d+"                 # Regex patterns
```

### f-Strings (Formatted String Literals)

```python
name = "Alice"
age = 30

# Basic interpolation
greeting = f"Hello, {name}!"

# Expressions inside braces
result = f"Next year: {age + 1}"

# Format specifiers
pi = 3.14159
f"{pi:.2f}"                         # "3.14" (2 decimal places)
f"{42:05d}"                         # "00042" (zero-padded)
f"{255:x}"                          # "ff" (hex)
f"{255:b}"                          # "11111111" (binary)
f"{1000000:,}"                      # "1,000,000" (thousands separator)
f"{'hello':>10}"                    # "     hello" (right-aligned)
f"{'hello':<10}"                    # "hello     " (left-aligned)
f"{'hello':^10}"                    # "  hello   " (centered)

# Debug format (Python 3.8+)
x = 42
f"{x=}"                             # "x=42"
f"{x=:05d}"                         # "x=00042"

# Python 3.12+: Any expression, including quotes
matrix = [[1, 2], [3, 4]]
f"First row: {matrix[0]}"           # Works in all versions
f"Quote: {"nested"}"                # Works in 3.12+ only
```

### String Methods

```python
s = "  Hello, World!  "

# Case conversion
s.lower()                           # "  hello, world!  "
s.upper()                           # "  HELLO, WORLD!  "
s.capitalize()                      # "  hello, world!  "
s.title()                           # "  Hello, World!  "
s.swapcase()                        # "  hELLO, wORLD!  "

# Whitespace handling
s.strip()                           # "Hello, World!"
s.lstrip()                          # "Hello, World!  "
s.rstrip()                          # "  Hello, World!"

# Search
s.find("World")                     # 9 (index or -1)
s.index("World")                    # 9 (raises ValueError if not found)
s.rfind("o")                        # 11 (last occurrence)
s.count("l")                        # 3
"World" in s                        # True
s.startswith("  He")                # True
s.endswith("!  ")                   # True

# Replace and split
s.replace("World", "Python")        # "  Hello, Python!  "
"a,b,c".split(",")                  # ["a", "b", "c"]
"a b  c".split()                    # ["a", "b", "c"] (splits on whitespace)
"a,b,c".split(",", 1)               # ["a", "b,c"] (max splits)

# Join
",".join(["a", "b", "c"])           # "a,b,c"
"".join(["a", "b", "c"])            # "abc"

# Character checks
"hello".isalpha()                   # True
"123".isdigit()                     # True
"hello123".isalnum()                # True
"   ".isspace()                     # True
"HELLO".isupper()                   # True
"hello".islower()                   # True

# Padding
"42".zfill(5)                       # "00042"
"hi".ljust(5)                       # "hi   "
"hi".rjust(5)                       # "   hi"
"hi".center(5)                      # " hi  "
```

### String Slicing

```python
s = "Python"

# Basic slicing [start:end:step]
s[0]                                # "P" (first character)
s[-1]                               # "n" (last character)
s[0:2]                              # "Py" (first two)
s[:2]                               # "Py" (same as above)
s[2:]                               # "thon" (from index 2 to end)
s[-2:]                              # "on" (last two)
s[::2]                              # "Pto" (every other)
s[::-1]                             # "nohtyP" (reversed)

# Common patterns
s[1:-1]                             # "ytho" (remove first and last)
s[:-1]                              # "Pytho" (remove last)
```

---

## Control Flow

### If/Elif/Else

```python
x = 10

# Basic if-else
if x > 0:
    print("positive")
elif x < 0:
    print("negative")
else:
    print("zero")

# Ternary expression (inline if)
result = "even" if x % 2 == 0 else "odd"

# Multiple conditions
if 0 < x < 100:                     # Chained comparison
    print("in range")

if x > 0 and x < 100:               # Equivalent
    print("in range")

# Truthy/Falsy checks
items = []
if items:                           # False if empty
    process(items)

if not items:                       # True if empty
    print("no items")

# None checks
if value is not None:
    use(value)

# Walrus operator (Python 3.8+)
if (n := len(items)) > 10:
    print(f"Too many: {n}")
```

### Comparison Operators

```python
# Equality
x == y                              # Equal
x != y                              # Not equal

# Identity (same object in memory)
x is y                              # Same object
x is not y                          # Different objects
x is None                           # Check for None

# Comparison
x < y                               # Less than
x <= y                              # Less than or equal
x > y                               # Greater than
x >= y                              # Greater than or equal

# Membership
x in collection                     # True if x is in collection
x not in collection                 # True if x is not in collection

# Chained comparisons
1 < x < 10                          # True if x is between 1 and 10
a <= b <= c                         # True if a <= b and b <= c
```

---

## Loops

### For Loops

```python
# Iterate over range
for i in range(5):                  # 0, 1, 2, 3, 4
    print(i)

for i in range(1, 6):               # 1, 2, 3, 4, 5
    print(i)

for i in range(0, 10, 2):           # 0, 2, 4, 6, 8 (step of 2)
    print(i)

for i in range(5, 0, -1):           # 5, 4, 3, 2, 1 (counting down)
    print(i)

# Iterate over collection
for item in [1, 2, 3]:
    print(item)

for char in "hello":
    print(char)

for key in {"a": 1, "b": 2}:        # Iterates over keys
    print(key)

# Enumerate (index + value)
for i, item in enumerate(["a", "b", "c"]):
    print(f"{i}: {item}")           # 0: a, 1: b, 2: c

for i, item in enumerate(items, start=1):  # Start from 1
    print(f"{i}: {item}")

# Zip (parallel iteration)
names = ["Alice", "Bob"]
ages = [30, 25]
for name, age in zip(names, ages):
    print(f"{name}: {age}")

# Iterate over dict items
for key, value in {"a": 1, "b": 2}.items():
    print(f"{key}: {value}")
```

### While Loops

```python
# Basic while
i = 0
while i < 5:
    print(i)
    i += 1

# While with condition
while queue:                        # While not empty
    item = queue.pop()
    process(item)

# Infinite loop with break
while True:
    data = get_input()
    if data == "quit":
        break
    process(data)
```

### Loop Else Clause

```python
# Else runs if loop completes without break
# Useful for search patterns

for item in items:
    if item == target:
        print("Found!")
        break
else:
    print("Not found")              # Only if no break

# Example: check if prime
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    else:
        return True                 # No divisor found
```

### Break, Continue, Pass

```python
# Break: exit loop entirely
for i in range(10):
    if i == 5:
        break                       # Stop at 5
    print(i)                        # 0, 1, 2, 3, 4

# Continue: skip current iteration
for i in range(5):
    if i == 2:
        continue                    # Skip 2
    print(i)                        # 0, 1, 3, 4

# Pass: placeholder (do nothing)
for i in range(5):
    pass                            # Empty loop body

def not_implemented_yet():
    pass                            # Empty function body
```

---

## Functions

### Basic Functions

```python
# Simple function
def greet(name):
    return f"Hello, {name}!"

# With type hints
def greet(name: str) -> str:
    return f"Hello, {name}!"

# Multiple return values
def min_max(nums):
    return min(nums), max(nums)

low, high = min_max([1, 5, 3])      # Unpacking
```

### Default Arguments

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

greet("Alice")                      # "Hello, Alice!"
greet("Alice", "Hi")                # "Hi, Alice!"

# WARNING: Mutable default argument trap
# DON'T DO THIS:
def add_item(item, items=[]):       # BAD: shared mutable default
    items.append(item)
    return items

# DO THIS:
def add_item(item, items=None):     # GOOD: use None
    if items is None:
        items = []
    items.append(item)
    return items
```

### *args and **kwargs

```python
# *args: variable positional arguments
def sum_all(*args):
    return sum(args)

sum_all(1, 2, 3)                    # 6
sum_all(1, 2, 3, 4, 5)              # 15

# **kwargs: variable keyword arguments
def print_info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key}: {value}")

print_info(name="Alice", age=30)

# Combined
def func(required, *args, **kwargs):
    print(f"Required: {required}")
    print(f"Args: {args}")
    print(f"Kwargs: {kwargs}")

func(1, 2, 3, x=4, y=5)
# Required: 1
# Args: (2, 3)
# Kwargs: {'x': 4, 'y': 5}

# Keyword-only arguments (after *)
def func(a, *, b, c):               # b and c must be keyword args
    return a + b + c

func(1, b=2, c=3)                   # OK
func(1, 2, 3)                       # Error: b and c must be keyword

# Positional-only arguments (Python 3.8+, before /)
def func(a, b, /, c, d):            # a and b must be positional
    return a + b + c + d

func(1, 2, 3, d=4)                  # OK
func(a=1, b=2, c=3, d=4)            # Error: a and b must be positional
```

### Lambda Functions

```python
# Anonymous function
square = lambda x: x ** 2
square(5)                           # 25

# Common use: sorting key
pairs = [(1, "b"), (3, "a"), (2, "c")]
pairs.sort(key=lambda x: x[1])      # Sort by second element
# [(3, 'a'), (1, 'b'), (2, 'c')]

# Multiple arguments
add = lambda x, y: x + y
add(2, 3)                           # 5

# With map/filter
nums = [1, 2, 3, 4, 5]
squared = list(map(lambda x: x**2, nums))       # [1, 4, 9, 16, 25]
evens = list(filter(lambda x: x % 2 == 0, nums)) # [2, 4]
```

### Scope and Closures

```python
# Global vs local
x = 10                              # Global

def func():
    x = 20                          # Local (shadows global)
    print(x)                        # 20

func()
print(x)                            # 10 (unchanged)

# Modify global
def func():
    global x
    x = 20

func()
print(x)                            # 20 (modified)

# Closure: function that captures variables
def make_counter():
    count = 0
    def counter():
        nonlocal count              # Access enclosing scope
        count += 1
        return count
    return counter

counter = make_counter()
counter()                           # 1
counter()                           # 2
counter()                           # 3
```

---

## Classes

### Basic Class

```python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

    def __str__(self):
        return f"({self.x}, {self.y})"

    def distance(self, other):
        dx = self.x - other.x
        dy = self.y - other.y
        return (dx**2 + dy**2) ** 0.5

p1 = Point(0, 0)
p2 = Point(3, 4)
print(p1.distance(p2))              # 5.0
```

### Special Methods (Dunder Methods)

```python
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    # String representations
    def __repr__(self):             # For debugging
        return f"Vector({self.x}, {self.y})"

    def __str__(self):              # For users
        return f"<{self.x}, {self.y}>"

    # Comparison
    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    def __lt__(self, other):        # For sorting
        return (self.x, self.y) < (other.x, other.y)

    def __hash__(self):             # For sets/dicts
        return hash((self.x, self.y))

    # Arithmetic
    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        return Vector(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar):
        return Vector(self.x * scalar, self.y * scalar)

    # Container methods
    def __len__(self):
        return 2

    def __getitem__(self, index):
        if index == 0:
            return self.x
        elif index == 1:
            return self.y
        raise IndexError

    def __iter__(self):
        yield self.x
        yield self.y

    # Boolean
    def __bool__(self):
        return self.x != 0 or self.y != 0
```

### Dataclasses (Python 3.7+)

```python
from dataclasses import dataclass, field

@dataclass
class Point:
    x: float
    y: float

    def distance(self, other):
        return ((self.x - other.x)**2 + (self.y - other.y)**2) ** 0.5

# Automatic __init__, __repr__, __eq__
p = Point(3, 4)
print(p)                            # Point(x=3, y=4)

# With default values
@dataclass
class Config:
    name: str
    debug: bool = False
    items: list = field(default_factory=list)  # Mutable default

# Frozen (immutable)
@dataclass(frozen=True)
class ImmutablePoint:
    x: float
    y: float

# Ordered (for sorting)
@dataclass(order=True)
class SortablePoint:
    x: float
    y: float
```

### Properties

```python
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
    def area(self):                 # Computed property
        return 3.14159 * self._radius ** 2

c = Circle(5)
print(c.radius)                     # 5
print(c.area)                       # 78.53975
c.radius = 10                       # Uses setter
```

### Inheritance

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        raise NotImplementedError

class Dog(Animal):
    def speak(self):
        return f"{self.name} says woof!"

class Cat(Animal):
    def speak(self):
        return f"{self.name} says meow!"

dog = Dog("Rex")
print(dog.speak())                  # Rex says woof!

# Check inheritance
isinstance(dog, Dog)                # True
isinstance(dog, Animal)             # True
issubclass(Dog, Animal)             # True
```

---

## Exception Handling

### Try/Except/Else/Finally

```python
try:
    result = 10 / x
except ZeroDivisionError:
    print("Cannot divide by zero")
except (TypeError, ValueError) as e:
    print(f"Error: {e}")
except Exception as e:              # Catch-all (avoid in production)
    print(f"Unexpected error: {e}")
else:
    print(f"Result: {result}")      # Only if no exception
finally:
    print("Cleanup here")           # Always runs
```

### Common Exceptions

```python
# ValueError - wrong value type
int("hello")                        # ValueError

# TypeError - wrong type
"hello" + 5                         # TypeError

# KeyError - missing dict key
d = {}
d["missing"]                        # KeyError

# IndexError - list index out of range
nums = [1, 2, 3]
nums[10]                            # IndexError

# AttributeError - missing attribute
None.something                      # AttributeError

# ZeroDivisionError
1 / 0                               # ZeroDivisionError

# FileNotFoundError
open("nonexistent.txt")             # FileNotFoundError

# StopIteration - iterator exhausted
next(iter([]))                      # StopIteration
```

### Raising Exceptions

```python
def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

# Re-raise with context
try:
    result = process(data)
except ValueError as e:
    raise RuntimeError("Processing failed") from e

# Raise without traceback (rare)
raise ValueError("message") from None
```

### Custom Exceptions

```python
class ValidationError(Exception):
    def __init__(self, field, message):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")

try:
    raise ValidationError("email", "Invalid format")
except ValidationError as e:
    print(f"Field: {e.field}, Message: {e.message}")
```

### Python 3.14: Bracketless Except

```python
# Python 3.14+ allows omitting parentheses
try:
    risky_operation()
except TimeoutError, ConnectionError:  # No parentheses needed
    print("Network error")

# Equivalent to (pre-3.14)
except (TimeoutError, ConnectionError):
    print("Network error")
```

---

## Python 3.10+ Pattern Matching

### Basic Match Statement

```python
def describe(value):
    match value:
        case 0:
            return "zero"
        case 1:
            return "one"
        case _:                     # Wildcard (default)
            return "something else"
```

### Matching Patterns

```python
# Literal patterns
match command:
    case "quit":
        return quit()
    case "help":
        return show_help()

# Sequence patterns
match point:
    case (0, 0):
        return "origin"
    case (x, 0):
        return f"on x-axis at {x}"
    case (0, y):
        return f"on y-axis at {y}"
    case (x, y):
        return f"at ({x}, {y})"

# Mapping patterns
match config:
    case {"debug": True}:
        enable_debug()
    case {"host": host, "port": port}:
        connect(host, port)

# Class patterns
match event:
    case Click(x=x, y=y):
        handle_click(x, y)
    case KeyPress(key="q"):
        quit()

# Guards (if conditions)
match point:
    case (x, y) if x == y:
        return "on diagonal"
    case (x, y):
        return f"at ({x}, {y})"

# OR patterns
match command:
    case "quit" | "exit" | "q":
        return quit()

# Capture patterns
match data:
    case [first, *rest]:
        print(f"First: {first}, rest: {rest}")
```

### Interview Use Cases

```python
# Parsing commands
def handle_command(cmd):
    match cmd.split():
        case ["move", direction]:
            return move(direction)
        case ["move", direction, amount]:
            return move(direction, int(amount))
        case ["quit"]:
            return quit()
        case _:
            return "Unknown command"

# Type-based dispatch
def process(node):
    match node:
        case int(n):
            return n
        case str(s):
            return len(s)
        case list(items):
            return sum(process(item) for item in items)
        case dict(mapping):
            return {k: process(v) for k, v in mapping.items()}
```

---

## Python 3.12-3.14 Features

### Python 3.12: Improved F-Strings

```python
# Python 3.12+ allows any expression in f-strings
# Including nested quotes and complex expressions

# Nested quotes (3.12+)
name = "Alice"
f"Hello, {name.upper()}"            # Works in all versions
f"Say {"hello"}"                    # Works in 3.12+ only
f"{'hello'}"                        # Works in 3.12+ only

# Multiline expressions
f"""Result: {
    calculate_something(
        arg1,
        arg2
    )
}"""

# Backslashes in expressions (3.12+)
items = ["a", "b", "c"]
f"Items: {'\n'.join(items)}"        # Works in 3.12+

# Comments in f-strings (3.12+)
f"{
    x  # This is x
    +
    y  # This is y
}"
```

### Python 3.12: Type Parameter Syntax

```python
# Old way (pre-3.12)
from typing import TypeVar, Generic
T = TypeVar('T')

class Stack(Generic[T]):
    def __init__(self):
        self._items: list[T] = []

# New way (3.12+)
class Stack[T]:
    def __init__(self):
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

# Generic functions (3.12+)
def first[T](items: list[T]) -> T:
    return items[0]

# Type aliases (3.12+)
type Point = tuple[float, float]
type Callback[T] = Callable[[T], None]
```

### Python 3.13: copy.replace

```python
# Python 3.13+ adds copy.replace for named tuples and dataclasses
import copy
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

p1 = Point(1, 2)
p2 = copy.replace(p1, x=10)         # Point(x=10, y=2)
```

### Python 3.14: Template Strings (t-strings)

```python
# Template strings provide access to parts before combination
# Use 't' prefix instead of 'f'

from string.templatelib import Template, Interpolation

name = "Alice"
age = 30

# f-string (immediate evaluation)
f_result = f"Name: {name}, Age: {age}"  # "Name: Alice, Age: 30"

# t-string (returns Template object)
t_result = t"Name: {name}, Age: {age}"
print(type(t_result))               # <class 'string.templatelib.Template'>

# Access parts
for part in t_result:
    print(part)
# Output:
# "Name: "
# Interpolation(value='Alice', expression='name', ...)
# ", Age: "
# Interpolation(value=30, expression='age', ...)

# Use case: Safe SQL (sanitize interpolations)
def safe_sql(template):
    parts = []
    for part in template:
        if isinstance(part, Interpolation):
            # Sanitize the value
            parts.append(sanitize(part.value))
        else:
            parts.append(part)
    return "".join(parts)

query = t"SELECT * FROM users WHERE name = {user_input}"
safe_query = safe_sql(query)
```

### Python 3.14: Deferred Annotation Evaluation (PEP 649)

```python
# Annotations are no longer evaluated at definition time
# They're stored in special functions and evaluated on demand

# This now works without quotes or __future__ import
class Node:
    def __init__(self, value: int, next: Node | None = None):
        self.value = value
        self.next = next  # Forward reference works!

# Access annotations with annotationlib
from annotationlib import get_annotations, Format

def func(x: UndefinedType) -> int:
    return 42

# Different evaluation modes
get_annotations(func, format=Format.STRING)
# {'x': 'UndefinedType', 'return': 'int'}

get_annotations(func, format=Format.FORWARDREF)
# {'x': ForwardRef('UndefinedType'), 'return': <class 'int'>}
```

### Python 3.14: Free-Threaded Mode (No GIL)

```python
# Python 3.14 officially supports free-threaded builds (PEP 779)
# The GIL can be disabled for true parallelism

# Check if running in free-threaded mode
import sys
print(sys._is_gil_enabled())        # False if free-threaded

# Performance characteristics:
# - Single-threaded: 5-10% overhead (down from 40% in 3.13)
# - Multi-threaded CPU-bound: Up to 3.1x speedup

# Install free-threaded Python:
# python3.14t (note the 't' suffix)

# Thread safety considerations:
# - Most built-in types are thread-safe
# - Use threading.Lock for custom synchronization
# - Some C extensions may need updates

import threading

counter = 0
lock = threading.Lock()

def increment():
    global counter
    for _ in range(1000000):
        with lock:                  # Still need locks for shared mutable state
            counter += 1

# With free-threaded Python, threads run truly parallel on multiple cores
```

### Python 3.14: Multiple Interpreters (PEP 734)

```python
# Run isolated Python interpreters in the same process
from concurrent.interpreters import create

# Create interpreter
interp = create()

# Run code in isolated interpreter
interp.run('x = 1 + 1')
interp.run('print(x)')              # 2

# Interpreters don't share state
# Each has its own GIL (in non-free-threaded builds)
# Useful for true parallelism without multiprocessing overhead
```

### Python 3.14: Zstandard Compression

```python
# New compression.zstd module
from compression import zstd

# Compress data
data = b"Hello, World!" * 1000
compressed = zstd.compress(data)
print(f"Ratio: {len(compressed) / len(data):.2%}")

# Decompress
original = zstd.decompress(compressed)
assert original == data

# Also available in tarfile and zipfile
import tarfile
with tarfile.open("archive.tar.zst", "w:zst") as tar:
    tar.add("file.txt")
```

---

## Quick Reference Card

### Variables

```python
x = 10                              # Integer
x: int = 10                         # With type hint
a, b = 1, 2                         # Multiple assignment
a, b = b, a                         # Swap
first, *rest = [1, 2, 3]            # Unpack with rest
```

### Collections

```python
# List
nums = [1, 2, 3]
nums.append(4)
nums.pop()
nums[0], nums[-1]                   # First, last

# Dict
d = {"a": 1, "b": 2}
d.get("c", 0)                       # Default value
d["c"] = 3

# Set
s = {1, 2, 3}
s.add(4)
s.discard(1)
```

### Control Flow

```python
if x > 0:
    pass
elif x < 0:
    pass
else:
    pass

for i in range(n):
    pass

for i, v in enumerate(items):
    pass

while condition:
    pass
```

### Functions

```python
def func(x: int, y: int = 0) -> int:
    return x + y

lambda x: x * 2

@decorator
def func():
    pass
```

### Classes

```python
@dataclass
class Point:
    x: float
    y: float
```

### Common Imports

```python
from collections import defaultdict, Counter, deque
from heapq import heappush, heappop, heapify
from functools import cache, lru_cache
from itertools import permutations, combinations
from bisect import bisect_left, bisect_right
```

### Complexity Quick Reference

| Operation | List | Dict | Set | deque |
|-----------|------|------|-----|-------|
| Access by index | O(1) | - | - | O(n) |
| Search | O(n) | O(1) | O(1) | O(n) |
| Insert/Delete start | O(n) | - | - | O(1) |
| Insert/Delete end | O(1)* | O(1) | O(1) | O(1) |
| Insert/Delete middle | O(n) | - | - | O(n) |

*amortized
