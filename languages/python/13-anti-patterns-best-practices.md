# Python Anti-Patterns and Best Practices

> **Reading time**: 75-90 minutes | **Difficulty**: Intermediate to Advanced | **Python**: 3.10+

Master the common pitfalls that trip up Python developers and learn the best practices that distinguish production-quality code from amateur scripts.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Mutable Default Arguments](#mutable-default-arguments)
3. [Late Binding Closures](#late-binding-closures)
4. [Exception Handling Anti-Patterns](#exception-handling-anti-patterns)
5. [Memory and Performance Anti-Patterns](#memory-and-performance-anti-patterns)
6. [Concurrency Anti-Patterns](#concurrency-anti-patterns)
7. [Code Style Anti-Patterns](#code-style-anti-patterns)
8. [Class Design Anti-Patterns](#class-design-anti-patterns)
9. [Testing Anti-Patterns](#testing-anti-patterns)
10. [Import Anti-Patterns](#import-anti-patterns)
11. [Best Practices to Apply](#best-practices-to-apply)
12. [Detection Tools](#detection-tools)
13. [Quick Reference](#quick-reference)
14. [Interview Questions](#interview-questions)

---

## Introduction

Anti-patterns are common programming practices that appear to solve a problem but actually create more issues—bugs, maintenance nightmares, or performance problems. Understanding these pitfalls is essential for:

- **Writing reliable code** that doesn't surprise you at runtime
- **Code reviews** where you'll spot these issues in others' code
- **Interviews** where these are frequently tested
- **Debugging** when mysterious behavior originates from these traps

### The Cost of Anti-Patterns

| Anti-Pattern | Common Symptom | Discovery Time |
|--------------|----------------|----------------|
| Mutable defaults | Data corruption across calls | Hours to days |
| Late binding | Wrong values in callbacks | Minutes to hours |
| Bare except | Silent failures | Days to weeks |
| GIL misunderstanding | No speedup from threading | Hours |
| Memory leaks | Gradual slowdown | Days to months |

---

## Mutable Default Arguments

**The single most common Python gotcha.** This anti-pattern has bitten virtually every Python developer.

### The Problem

```python
# BAD: Mutable default argument
def add_item(item: str, items: list[str] = []) -> list[str]:
    """Add item to list and return the list."""
    items.append(item)
    return items

# Watch what happens
print(add_item("apple"))   # ['apple'] - looks fine
print(add_item("banana"))  # ['apple', 'banana'] - WHAT?!
print(add_item("cherry"))  # ['apple', 'banana', 'cherry'] - disaster!
```

### Why This Happens

Default arguments are evaluated **once** when the function is defined, not each time it's called. The empty list `[]` is created once and shared across all calls.

```python
def add_item(item: str, items: list[str] = []) -> list[str]:
    print(f"items id: {id(items)}")  # Same id every call!
    items.append(item)
    return items

add_item("a")  # items id: 140234567890
add_item("b")  # items id: 140234567890  <- Same object!
```

### The Fix: Use None Sentinel

```python
# GOOD: None sentinel pattern
def add_item(item: str, items: list[str] | None = None) -> list[str]:
    """Add item to list and return the list."""
    if items is None:
        items = []
    items.append(item)
    return items

# Now it works correctly
print(add_item("apple"))   # ['apple']
print(add_item("banana"))  # ['banana'] - fresh list each time
print(add_item("cherry"))  # ['cherry']
```

### All Mutable Types Are Affected

```python
# BAD: All of these have the same problem
def add_to_dict(key: str, value: int, data: dict = {}) -> dict:
    data[key] = value
    return data

def add_to_set(item: str, items: set = set()) -> set:
    items.add(item)
    return items

class Config:
    def __init__(self, options: dict = {}):  # BAD
        self.options = options

# GOOD: Fix all of them with None sentinel
def add_to_dict(key: str, value: int, data: dict | None = None) -> dict:
    if data is None:
        data = {}
    data[key] = value
    return data

def add_to_set(item: str, items: set | None = None) -> set:
    if items is None:
        items = set()
    items.add(item)
    return items

class Config:
    def __init__(self, options: dict | None = None):  # GOOD
        self.options = options if options is not None else {}
```

### When Mutable Defaults Are Intentional

Sometimes the shared state is desired (rarely):

```python
# Intentional cache using mutable default
def fibonacci(n: int, cache: dict[int, int] = {}) -> int:
    """Fibonacci with memoization using mutable default."""
    if n in cache:
        return cache[n]
    if n < 2:
        return n
    result = fibonacci(n - 1, cache) + fibonacci(n - 2, cache)
    cache[n] = result
    return result

# Better: Use functools.cache instead
from functools import cache

@cache
def fibonacci(n: int) -> int:
    """Fibonacci with proper memoization."""
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

---

## Late Binding Closures

Another classic Python gotcha that frequently appears in interviews.

### The Problem

```python
# BAD: Late binding closure
def create_multipliers() -> list:
    """Create functions that multiply by 0, 1, 2, 3, 4."""
    multipliers = []
    for i in range(5):
        multipliers.append(lambda x: x * i)
    return multipliers

# Test it
mults = create_multipliers()
print([m(2) for m in mults])  # [8, 8, 8, 8, 8] - All 8s! Not [0, 2, 4, 6, 8]
```

### Why This Happens

Closures in Python capture **variables by reference**, not by value. When the lambda is called, it looks up `i` at that moment. By then, the loop has finished and `i` is 4.

```python
def create_multipliers() -> list:
    multipliers = []
    for i in range(5):
        # The lambda captures a REFERENCE to i, not its value
        multipliers.append(lambda x: x * i)  # All lambdas share same i
    # After loop: i = 4
    return multipliers
```

### Fix 1: Default Argument Capture

```python
# GOOD: Capture value via default argument
def create_multipliers() -> list:
    multipliers = []
    for i in range(5):
        # i=i creates a NEW local variable in each lambda
        multipliers.append(lambda x, i=i: x * i)
    return multipliers

mults = create_multipliers()
print([m(2) for m in mults])  # [0, 2, 4, 6, 8] - Correct!
```

### Fix 2: functools.partial

```python
# GOOD: Use functools.partial
from functools import partial

def multiply(x: int, factor: int) -> int:
    return x * factor

def create_multipliers() -> list:
    return [partial(multiply, factor=i) for i in range(5)]

mults = create_multipliers()
print([m(2) for m in mults])  # [0, 2, 4, 6, 8]
```

### Fix 3: Factory Function

```python
# GOOD: Use a factory function
def create_multipliers() -> list:
    def make_multiplier(factor: int):
        return lambda x: x * factor  # factor is bound when make_multiplier returns

    return [make_multiplier(i) for i in range(5)]

mults = create_multipliers()
print([m(2) for m in mults])  # [0, 2, 4, 6, 8]
```

### Real-World Example: Event Handlers

```python
# BAD: Common mistake in GUI/web programming
buttons = []
for i in range(5):
    button = Button(text=f"Button {i}")
    button.on_click = lambda: print(f"Clicked button {i}")  # All print 4!
    buttons.append(button)

# GOOD: Fix with default argument
buttons = []
for i in range(5):
    button = Button(text=f"Button {i}")
    button.on_click = lambda i=i: print(f"Clicked button {i}")
    buttons.append(button)
```

---

## Exception Handling Anti-Patterns

Exception handling done wrong can hide bugs and make debugging a nightmare.

### Anti-Pattern 1: Bare Except

```python
# BAD: Bare except catches EVERYTHING
def risky_operation():
    try:
        return dangerous_calculation()
    except:  # Catches KeyboardInterrupt, SystemExit, MemoryError!
        return None

# Even Ctrl+C won't stop this:
while True:
    try:
        user_input = input("Enter something: ")
    except:  # Catches KeyboardInterrupt - user can't exit!
        pass
```

**What bare `except` catches:**
- `KeyboardInterrupt` (Ctrl+C)
- `SystemExit` (sys.exit())
- `MemoryError`
- `GeneratorExit`
- All other exceptions

```python
# GOOD: Be specific about exceptions
def risky_operation():
    try:
        return dangerous_calculation()
    except ValueError as e:
        logger.warning(f"Invalid value: {e}")
        return None
    except IOError as e:
        logger.error(f"IO error: {e}")
        raise

# If you must catch everything (rare), at least allow interrupts
def risky_operation():
    try:
        return dangerous_calculation()
    except Exception as e:  # Exception, not BaseException
        logger.error(f"Unexpected error: {e}")
        return None
```

### Anti-Pattern 2: Pokémon Exception Handling

```python
# BAD: "Gotta catch 'em all" - catches too much, hides real errors
def process_data(data):
    try:
        result = parse(data)
        validated = validate(result)
        return transform(validated)
    except Exception:
        return None  # Which step failed? What went wrong? No idea.

# GOOD: Catch specific exceptions at appropriate levels
def process_data(data):
    try:
        result = parse(data)
    except json.JSONDecodeError as e:
        raise DataParseError(f"Invalid JSON: {e}") from e

    try:
        validated = validate(result)
    except ValidationError as e:
        raise DataValidationError(f"Validation failed: {e}") from e

    return transform(validated)
```

### Anti-Pattern 3: Swallowing Exceptions Silently

```python
# BAD: Exception is caught and ignored
def save_user(user: User) -> bool:
    try:
        db.save(user)
        return True
    except Exception:
        return False  # What happened? Connection error? Constraint violation?

# GOOD: Log the exception, let caller know what happened
def save_user(user: User) -> bool:
    try:
        db.save(user)
        return True
    except IntegrityError as e:
        logger.warning(f"Duplicate user: {user.email}")
        raise DuplicateUserError(user.email) from e
    except DatabaseError as e:
        logger.error(f"Database error saving user: {e}")
        raise
```

### Anti-Pattern 4: Raising in Finally

```python
# BAD: Exception in finally replaces original exception
def process_file(path: str) -> str:
    f = open(path)
    try:
        return f.read()
    except IOError:
        raise ProcessingError("Failed to read file")
    finally:
        if not f.closed:
            raise CleanupError("File still open")  # Replaces ProcessingError!

# GOOD: Use context manager, don't raise in finally
def process_file(path: str) -> str:
    try:
        with open(path) as f:
            return f.read()
    except IOError as e:
        raise ProcessingError("Failed to read file") from e
```

### Anti-Pattern 5: Exception for Flow Control

```python
# BAD: Using exceptions for normal flow control
def find_user(users: list[User], email: str) -> User | None:
    try:
        for user in users:
            if user.email == email:
                raise StopIteration(user)  # Misusing exception
    except StopIteration as e:
        return e.value
    return None

# GOOD: Use normal control flow
def find_user(users: list[User], email: str) -> User | None:
    for user in users:
        if user.email == email:
            return user
    return None

# Even better with next()
def find_user(users: list[User], email: str) -> User | None:
    return next((u for u in users if u.email == email), None)
```

### Best Practices for Exceptions

```python
# 1. Create custom exception hierarchies
class AppError(Exception):
    """Base exception for application."""
    pass

class ValidationError(AppError):
    """Raised when validation fails."""
    pass

class NotFoundError(AppError):
    """Raised when resource not found."""
    pass

# 2. Always chain exceptions with 'from'
try:
    data = json.loads(raw_data)
except json.JSONDecodeError as e:
    raise ValidationError(f"Invalid JSON format") from e  # Preserves traceback

# 3. Use exception groups (Python 3.11+)
def process_batch(items: list[Item]) -> list[Result]:
    errors = []
    results = []
    for item in items:
        try:
            results.append(process(item))
        except ProcessingError as e:
            errors.append(e)

    if errors:
        raise ExceptionGroup("batch processing failed", errors)
    return results
```

---

## Memory and Performance Anti-Patterns

These anti-patterns cause slowdowns, memory bloat, or both.

### Anti-Pattern 1: String Concatenation in Loops

```python
# BAD: O(n²) time complexity due to string immutability
def build_html(items: list[str]) -> str:
    html = "<ul>"
    for item in items:
        html += f"<li>{item}</li>"  # Creates new string each time!
    html += "</ul>"
    return html

# With 10,000 items: ~0.5 seconds
# With 100,000 items: ~50 seconds (100x slower for 10x more items)

# GOOD: O(n) time with join
def build_html(items: list[str]) -> str:
    parts = ["<ul>"]
    parts.extend(f"<li>{item}</li>" for item in items)
    parts.append("</ul>")
    return "".join(parts)

# With 100,000 items: ~0.05 seconds

# Even better: Use io.StringIO for very large strings
from io import StringIO

def build_html(items: list[str]) -> str:
    buffer = StringIO()
    buffer.write("<ul>")
    for item in items:
        buffer.write(f"<li>{item}</li>")
    buffer.write("</ul>")
    return buffer.getvalue()
```

### Anti-Pattern 2: Creating Lists When Generators Suffice

```python
# BAD: Creates entire list in memory
def get_even_squares(n: int) -> list[int]:
    return [x**2 for x in range(n) if x % 2 == 0]

# Memory usage for n=10_000_000: ~80 MB

# GOOD: Generator uses constant memory
def get_even_squares(n: int):
    return (x**2 for x in range(n) if x % 2 == 0)

# Memory usage: ~0 MB (generates values on demand)

# Use list only when you need:
# - Multiple iterations
# - Random access (indexing)
# - Length checking
# - Actual storage
```

### Anti-Pattern 3: Not Knowing `in` Complexity

```python
# BAD: O(n) lookup in list
def has_duplicates_slow(items: list[str]) -> bool:
    seen = []
    for item in items:
        if item in seen:  # O(n) for each check!
            return True
        seen.append(item)
    return False
# Total: O(n²)

# GOOD: O(1) lookup in set
def has_duplicates_fast(items: list[str]) -> bool:
    seen = set()
    for item in items:
        if item in seen:  # O(1) average
            return True
        seen.add(item)
    return False
# Total: O(n)

# Even simpler
def has_duplicates(items: list[str]) -> bool:
    return len(items) != len(set(items))
```

### Anti-Pattern 4: Repeated Lookups

```python
# BAD: Calling same method repeatedly
def process_items(items: list[Item]) -> list[Result]:
    results = []
    for item in items:
        if item.get_category().lower() == "premium":  # Called 3 times!
            if item.get_category().lower() in SPECIAL_CATEGORIES:
                results.append(process_premium(item, item.get_category().lower()))
    return results

# GOOD: Cache the result
def process_items(items: list[Item]) -> list[Result]:
    results = []
    for item in items:
        category = item.get_category().lower()  # Called once
        if category == "premium":
            if category in SPECIAL_CATEGORIES:
                results.append(process_premium(item, category))
    return results
```

### Anti-Pattern 5: Creating Unnecessary Intermediate Lists

```python
# BAD: Creates 3 intermediate lists
def get_processed_names(users: list[User]) -> list[str]:
    active_users = [u for u in users if u.is_active]  # List 1
    names = [u.name for u in active_users]  # List 2
    upper_names = [n.upper() for n in names]  # List 3
    return upper_names

# GOOD: Single pass with generator expressions
def get_processed_names(users: list[User]) -> list[str]:
    return [
        u.name.upper()
        for u in users
        if u.is_active
    ]

# Or with multiple conditions
def get_processed_names(users: list[User]) -> list[str]:
    return [
        user.name.upper()
        for user in users
        if user.is_active
        if user.name  # Skip empty names
    ]
```

### Anti-Pattern 6: Not Using Slots for Memory-Heavy Classes

```python
# BAD: Each instance has a __dict__ (56+ bytes overhead)
class Point:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

# Memory per instance: ~152 bytes

# GOOD: Use __slots__ for fixed attributes
class Point:
    __slots__ = ('x', 'y')

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

# Memory per instance: ~56 bytes (63% reduction)

# Or use dataclass with slots
from dataclasses import dataclass

@dataclass(slots=True)
class Point:
    x: float
    y: float
```

### Anti-Pattern 7: Circular References Creating Memory Leaks

```python
# BAD: Circular reference
class Parent:
    def __init__(self, name: str):
        self.name = name
        self.children: list[Child] = []

    def add_child(self, child: "Child"):
        self.children.append(child)
        child.parent = self  # Circular reference!

class Child:
    def __init__(self, name: str):
        self.name = name
        self.parent: Parent | None = None

# Reference cycle: parent -> children -> child -> parent
# Won't be freed by reference counting

# GOOD: Use weakref for back-references
import weakref

class Parent:
    def __init__(self, name: str):
        self.name = name
        self.children: list[Child] = []

    def add_child(self, child: "Child"):
        self.children.append(child)
        child._parent_ref = weakref.ref(self)

class Child:
    def __init__(self, name: str):
        self.name = name
        self._parent_ref: weakref.ref[Parent] | None = None

    @property
    def parent(self) -> Parent | None:
        return self._parent_ref() if self._parent_ref else None
```

---

## Concurrency Anti-Patterns

Python's concurrency model has unique gotchas due to the GIL and async/await semantics.

### Anti-Pattern 1: Threading for CPU-Bound Work

```python
# BAD: GIL prevents parallel execution for CPU-bound tasks
import threading

def cpu_intensive(n: int) -> int:
    return sum(i * i for i in range(n))

def parallel_compute_threading(values: list[int]) -> list[int]:
    results = [0] * len(values)
    threads = []

    for i, v in enumerate(values):
        t = threading.Thread(target=lambda i=i, v=v: results.__setitem__(i, cpu_intensive(v)))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()
    return results

# This is NOT faster than sequential - may even be slower due to GIL contention!

# GOOD: Use multiprocessing for CPU-bound work
from multiprocessing import Pool

def parallel_compute_multiprocessing(values: list[int]) -> list[int]:
    with Pool() as pool:
        return pool.map(cpu_intensive, values)

# This WILL be faster on multi-core machines
```

### Anti-Pattern 2: Assuming Operations Are Atomic

```python
# BAD: counter += 1 is NOT atomic
import threading

counter = 0

def increment():
    global counter
    for _ in range(100_000):
        counter += 1  # Read, modify, write - can interleave!

threads = [threading.Thread(target=increment) for _ in range(10)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(counter)  # Often less than 1_000_000!

# GOOD: Use Lock or atomic operations
import threading

counter = 0
lock = threading.Lock()

def increment():
    global counter
    for _ in range(100_000):
        with lock:
            counter += 1

# Or use atomic-like structures
from collections import Counter
from threading import Lock

class ThreadSafeCounter:
    def __init__(self):
        self._value = 0
        self._lock = Lock()

    def increment(self):
        with self._lock:
            self._value += 1

    @property
    def value(self) -> int:
        with self._lock:
            return self._value
```

### Anti-Pattern 3: Blocking Calls in Async Functions

```python
# BAD: Blocking call in async function blocks entire event loop
import asyncio
import requests  # Blocking library!

async def fetch_url(url: str) -> str:
    response = requests.get(url)  # BLOCKS entire event loop!
    return response.text

async def fetch_all(urls: list[str]) -> list[str]:
    # Despite being async, these run sequentially because requests.get blocks
    return [await fetch_url(url) for url in urls]

# GOOD: Use async-compatible libraries
import asyncio
import aiohttp  # Non-blocking library

async def fetch_url(session: aiohttp.ClientSession, url: str) -> str:
    async with session.get(url) as response:
        return await response.text()

async def fetch_all(urls: list[str]) -> list[str]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_url(session, url) for url in urls]
        return await asyncio.gather(*tasks)

# If you must use blocking code in async context
async def fetch_url_with_blocking(url: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, requests.get, url)
```

### Anti-Pattern 4: Forgetting to Await

```python
# BAD: Forgetting await - coroutine never executes
async def send_email(to: str, message: str) -> bool:
    # ... send email logic
    return True

async def process_order(order: Order):
    # ... process order
    send_email(order.customer_email, "Order confirmed")  # Forgot await!
    # Warning: coroutine 'send_email' was never awaited
    return order

# GOOD: Always await coroutines
async def process_order(order: Order):
    # ... process order
    await send_email(order.customer_email, "Order confirmed")
    return order

# For fire-and-forget, use create_task explicitly
async def process_order(order: Order):
    # ... process order
    asyncio.create_task(send_email(order.customer_email, "Order confirmed"))
    return order  # Email sends in background
```

### Anti-Pattern 5: Shared Mutable State in Async Code

```python
# BAD: Race condition in async code
results = []

async def fetch_and_store(url: str):
    data = await fetch_url(url)
    results.append(data)  # Race condition!

# GOOD: Return values instead of mutating shared state
async def fetch_all(urls: list[str]) -> list[str]:
    tasks = [fetch_url(url) for url in urls]
    return await asyncio.gather(*tasks)

# Or use asyncio-safe structures
import asyncio

async def fetch_all_with_queue(urls: list[str]) -> list[str]:
    queue: asyncio.Queue[str] = asyncio.Queue()

    async def fetch_and_enqueue(url: str):
        data = await fetch_url(url)
        await queue.put(data)

    await asyncio.gather(*[fetch_and_enqueue(url) for url in urls])

    results = []
    while not queue.empty():
        results.append(await queue.get())
    return results
```

---

## Code Style Anti-Patterns

These patterns indicate code that's harder to read, maintain, or debug.

### Anti-Pattern 1: Using `range(len())` Unnecessarily

```python
# BAD: Iterating with range(len())
def process_items(items: list[str]) -> list[str]:
    results = []
    for i in range(len(items)):
        results.append(items[i].upper())
    return results

# GOOD: Iterate directly
def process_items(items: list[str]) -> list[str]:
    return [item.upper() for item in items]

# BAD: range(len()) for index and value
for i in range(len(items)):
    print(f"{i}: {items[i]}")

# GOOD: Use enumerate
for i, item in enumerate(items):
    print(f"{i}: {item}")

# BAD: range(len()) for parallel iteration
for i in range(len(names)):
    print(f"{names[i]}: {ages[i]}")

# GOOD: Use zip
for name, age in zip(names, ages):
    print(f"{name}: {age}")

# Python 3.10+: zip with strict=True
for name, age in zip(names, ages, strict=True):  # Raises if lengths differ
    print(f"{name}: {age}")
```

### Anti-Pattern 2: Comparing to None/True/False with `==`

```python
# BAD: Using == for None/True/False
if x == None:
    ...
if flag == True:
    ...
if result == False:
    ...

# GOOD: Use is for None, direct boolean for True/False
if x is None:
    ...
if flag:  # For True
    ...
if not result:  # For False
    ...

# Why? == can be overridden, 'is' checks identity
class Sneaky:
    def __eq__(self, other):
        return True

x = Sneaky()
print(x == None)  # True (wrong!)
print(x is None)  # False (correct!)
```

### Anti-Pattern 3: Using `type()` Instead of `isinstance()`

```python
# BAD: type() doesn't handle inheritance
def process(value):
    if type(value) == list:  # Fails for subclasses!
        return sum(value)
    elif type(value) == dict:
        return sum(value.values())

class MyList(list):
    pass

process(MyList([1, 2, 3]))  # Returns None, not 6!

# GOOD: isinstance() handles inheritance
def process(value):
    if isinstance(value, list):  # Works with subclasses
        return sum(value)
    elif isinstance(value, dict):
        return sum(value.values())

process(MyList([1, 2, 3]))  # Returns 6

# Multiple types
if isinstance(value, (list, tuple)):  # Either list or tuple
    ...
```

### Anti-Pattern 4: Not Using Context Managers

```python
# BAD: Manual resource management
def read_file(path: str) -> str:
    f = open(path)
    try:
        content = f.read()
    finally:
        f.close()
    return content

# What if open() fails? f is undefined in finally!
# What if read() raises and we catch it elsewhere?

# GOOD: Use context manager
def read_file(path: str) -> str:
    with open(path) as f:
        return f.read()

# Handles all edge cases automatically

# BAD: Multiple resources
def copy_file(src: str, dst: str):
    f_in = open(src)
    try:
        f_out = open(dst, 'w')
        try:
            f_out.write(f_in.read())
        finally:
            f_out.close()
    finally:
        f_in.close()

# GOOD: Nested context managers
def copy_file(src: str, dst: str):
    with open(src) as f_in, open(dst, 'w') as f_out:
        f_out.write(f_in.read())
```

### Anti-Pattern 5: Magic Numbers and Strings

```python
# BAD: Magic numbers and strings
def calculate_shipping(weight: float) -> float:
    if weight > 50:  # What's 50?
        return weight * 0.75  # What's 0.75?
    return weight * 1.25

def process_order(order: Order):
    if order.status == "pending_payment":  # String literal scattered
        ...
    elif order.status == "processing":
        ...

# GOOD: Named constants or enums
MAX_STANDARD_WEIGHT = 50  # kg
HEAVY_RATE = 0.75  # $ per kg
STANDARD_RATE = 1.25  # $ per kg

def calculate_shipping(weight: float) -> float:
    if weight > MAX_STANDARD_WEIGHT:
        return weight * HEAVY_RATE
    return weight * STANDARD_RATE

from enum import Enum, auto

class OrderStatus(Enum):
    PENDING_PAYMENT = auto()
    PROCESSING = auto()
    SHIPPED = auto()
    DELIVERED = auto()

def process_order(order: Order):
    if order.status == OrderStatus.PENDING_PAYMENT:
        ...
```

### Anti-Pattern 6: Deeply Nested Code

```python
# BAD: Deep nesting
def process_order(order: Order) -> Result:
    if order is not None:
        if order.is_valid():
            if order.customer is not None:
                if order.customer.is_active:
                    if order.total > 0:
                        return process_valid_order(order)
                    else:
                        return Error("Invalid total")
                else:
                    return Error("Inactive customer")
            else:
                return Error("No customer")
        else:
            return Error("Invalid order")
    else:
        return Error("No order")

# GOOD: Early returns (guard clauses)
def process_order(order: Order) -> Result:
    if order is None:
        return Error("No order")

    if not order.is_valid():
        return Error("Invalid order")

    if order.customer is None:
        return Error("No customer")

    if not order.customer.is_active:
        return Error("Inactive customer")

    if order.total <= 0:
        return Error("Invalid total")

    return process_valid_order(order)
```

---

## Class Design Anti-Patterns

Patterns that indicate poorly designed classes.

### Anti-Pattern 1: God Object

```python
# BAD: God object - does everything
class UserManager:
    def __init__(self, db_connection):
        self.db = db_connection
        self.email_server = EmailServer()
        self.cache = RedisCache()
        self.logger = Logger()
        self.metrics = MetricsClient()

    def create_user(self, data): ...
    def update_user(self, user_id, data): ...
    def delete_user(self, user_id): ...
    def get_user(self, user_id): ...
    def send_welcome_email(self, user): ...
    def send_password_reset(self, user): ...
    def validate_email(self, email): ...
    def hash_password(self, password): ...
    def log_user_action(self, user, action): ...
    def cache_user(self, user): ...
    def get_cached_user(self, user_id): ...
    def track_signup_metrics(self, user): ...
    # ... 50 more methods

# GOOD: Single Responsibility - separate concerns
class UserRepository:
    """Handles user persistence."""
    def __init__(self, db_connection):
        self.db = db_connection

    def create(self, user: User) -> User: ...
    def update(self, user: User) -> User: ...
    def delete(self, user_id: str) -> None: ...
    def find_by_id(self, user_id: str) -> User | None: ...

class UserNotificationService:
    """Handles user notifications."""
    def __init__(self, email_server: EmailServer):
        self.email_server = email_server

    def send_welcome_email(self, user: User) -> None: ...
    def send_password_reset(self, user: User) -> None: ...

class PasswordService:
    """Handles password operations."""
    def hash(self, password: str) -> str: ...
    def verify(self, password: str, hashed: str) -> bool: ...
```

### Anti-Pattern 2: `__init__` Doing Too Much

```python
# BAD: __init__ does heavy work
class DataProcessor:
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)  # I/O in __init__
        self.db = Database(self.config['db_url'])      # Connection in __init__
        self.db.connect()                               # Side effect in __init__
        self.data = self._fetch_initial_data()         # More I/O in __init__
        self._validate_data()                          # Processing in __init__

# Problems:
# - Hard to test (need real DB, files)
# - Can't create without side effects
# - Slow instantiation

# GOOD: __init__ just initializes, use factory or explicit methods
class DataProcessor:
    def __init__(self, config: Config, db: Database):
        self.config = config
        self.db = db
        self._data: list | None = None

    @classmethod
    def from_config_file(cls, config_path: str) -> "DataProcessor":
        """Factory method for file-based setup."""
        config = Config.load(config_path)
        db = Database(config.db_url)
        return cls(config, db)

    def connect(self) -> None:
        """Explicit connection method."""
        self.db.connect()

    def load_data(self) -> None:
        """Explicit data loading."""
        self._data = self._fetch_data()
```

### Anti-Pattern 3: Overusing Inheritance

```python
# BAD: Deep inheritance hierarchy
class Animal:
    def eat(self): ...

class Mammal(Animal):
    def give_birth(self): ...

class Canine(Mammal):
    def bark(self): ...

class Dog(Canine):
    def fetch(self): ...

class GermanShepherd(Dog):
    def guard(self): ...

# What if we need a mute dog? Or a dog that doesn't fetch?
# Changes to any parent affect all children

# GOOD: Composition over inheritance
from dataclasses import dataclass
from typing import Protocol

class Eater(Protocol):
    def eat(self) -> None: ...

class Barker(Protocol):
    def bark(self) -> None: ...

@dataclass
class Dog:
    name: str
    can_bark: bool = True
    can_fetch: bool = True

    def bark(self) -> None:
        if self.can_bark:
            print("Woof!")

    def fetch(self) -> None:
        if self.can_fetch:
            print(f"{self.name} fetches the ball!")

# Easy to create variations
quiet_dog = Dog("Silent Sam", can_bark=False)
lazy_dog = Dog("Lazy Larry", can_fetch=False)
```

### Anti-Pattern 4: Mutable Class Attributes

```python
# BAD: Mutable class attribute shared by all instances
class User:
    permissions = []  # Shared by ALL instances!

    def __init__(self, name: str):
        self.name = name

    def add_permission(self, perm: str):
        self.permissions.append(perm)

alice = User("Alice")
bob = User("Bob")

alice.add_permission("read")
print(bob.permissions)  # ['read'] - Bob has Alice's permission!

# GOOD: Initialize mutable attributes in __init__
class User:
    def __init__(self, name: str):
        self.name = name
        self.permissions: list[str] = []  # Instance attribute

    def add_permission(self, perm: str):
        self.permissions.append(perm)

# Immutable class attributes are fine
class User:
    DEFAULT_ROLE = "guest"  # Immutable, safe as class attribute

    def __init__(self, name: str):
        self.name = name
        self.role = self.DEFAULT_ROLE
```

---

## Testing Anti-Patterns

Patterns that make tests unreliable, slow, or hard to maintain.

### Anti-Pattern 1: Testing Implementation Details

```python
# BAD: Testing internal implementation
class Calculator:
    def __init__(self):
        self._cache = {}

    def add(self, a: int, b: int) -> int:
        key = (a, b)
        if key not in self._cache:
            self._cache[key] = a + b
        return self._cache[key]

# Bad test - coupled to implementation
def test_add_uses_cache():
    calc = Calculator()
    calc.add(1, 2)
    assert (1, 2) in calc._cache  # Testing internal detail!
    assert calc._cache[(1, 2)] == 3  # If we change caching strategy, test breaks

# GOOD: Test behavior, not implementation
def test_add_returns_sum():
    calc = Calculator()
    assert calc.add(1, 2) == 3
    assert calc.add(-1, 1) == 0
    assert calc.add(0, 0) == 0

def test_add_is_consistent():
    calc = Calculator()
    # Same inputs should always give same result
    assert calc.add(5, 3) == calc.add(5, 3)
```

### Anti-Pattern 2: Flaky Tests

```python
# BAD: Test depends on timing
import time

def test_cache_expires():
    cache = Cache(ttl_seconds=1)
    cache.set("key", "value")
    time.sleep(1.1)  # Flaky! May pass/fail based on system load
    assert cache.get("key") is None

# GOOD: Mock time for deterministic behavior
from unittest.mock import patch
from datetime import datetime

def test_cache_expires():
    with patch('cache.datetime') as mock_dt:
        mock_dt.now.return_value = datetime(2024, 1, 1, 12, 0, 0)

        cache = Cache(ttl_seconds=60)
        cache.set("key", "value")

        # Advance time by 61 seconds
        mock_dt.now.return_value = datetime(2024, 1, 1, 12, 1, 1)

        assert cache.get("key") is None

# BAD: Test depends on external service
def test_api_integration():
    response = requests.get("https://api.example.com/data")
    assert response.status_code == 200  # Fails if API is down!

# GOOD: Mock external services
def test_api_integration(mocker):
    mock_response = mocker.Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": "test"}

    mocker.patch('requests.get', return_value=mock_response)

    result = fetch_data()
    assert result == {"data": "test"}
```

### Anti-Pattern 3: Excessive Mocking

```python
# BAD: Mocking everything
def test_process_order(mocker):
    mock_db = mocker.Mock()
    mock_cache = mocker.Mock()
    mock_email = mocker.Mock()
    mock_logger = mocker.Mock()
    mock_metrics = mocker.Mock()
    mock_validator = mocker.Mock()

    mock_validator.validate.return_value = True
    mock_db.save.return_value = Order(id=1, status="created")

    service = OrderService(
        db=mock_db,
        cache=mock_cache,
        email=mock_email,
        logger=mock_logger,
        metrics=mock_metrics,
        validator=mock_validator
    )

    result = service.process(order_data)

    # Test is just verifying mock calls, not real behavior!
    mock_validator.validate.assert_called_once()
    mock_db.save.assert_called_once()
    mock_email.send.assert_called_once()
    mock_metrics.track.assert_called_once()

# GOOD: Use real collaborators where practical, mock at boundaries
def test_process_order(mocker):
    # Real validator (pure function, no I/O)
    validator = OrderValidator()

    # Real in-memory implementations for testing
    db = InMemoryOrderRepository()
    cache = InMemoryCache()

    # Mock only external services
    mock_email = mocker.Mock()
    mock_metrics = mocker.Mock()

    service = OrderService(
        db=db,
        cache=cache,
        email=mock_email,
        metrics=mock_metrics,
        validator=validator
    )

    result = service.process(valid_order_data)

    # Test real behavior
    assert result.status == "created"
    assert db.find_by_id(result.id) == result
```

### Anti-Pattern 4: Tests Without Assertions

```python
# BAD: Test runs but doesn't verify anything
def test_process_data():
    data = load_test_data()
    result = process(data)  # No assertion! Test always passes

# GOOD: Every test should have clear assertions
def test_process_data():
    data = load_test_data()
    result = process(data)

    assert result is not None
    assert len(result.items) == 3
    assert all(item.is_processed for item in result.items)
```

---

## Import Anti-Patterns

These patterns cause circular imports, slow startup, or confusing code.

### Anti-Pattern 1: Circular Imports

```python
# BAD: Circular import
# user.py
from order import Order

class User:
    def get_orders(self) -> list["Order"]:
        return Order.find_by_user(self.id)

# order.py
from user import User  # Circular import!

class Order:
    def __init__(self, user: User):
        self.user = user

# GOOD: Import inside function or use TYPE_CHECKING
# user.py
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from order import Order

class User:
    def get_orders(self) -> list["Order"]:
        from order import Order  # Import at runtime when needed
        return Order.find_by_user(self.id)

# Better: Restructure to avoid circular dependency
# models.py
class User:
    id: str
    name: str

class Order:
    user_id: str

# services.py (depends on models, not circular)
from models import User, Order

def get_user_orders(user: User) -> list[Order]:
    return Order.find_by_user_id(user.id)
```

### Anti-Pattern 2: Star Imports

```python
# BAD: Star import in non-__init__.py
from utils import *  # What did we import? No idea without reading utils.py
from helpers import *  # Name collisions? Who knows!

result = process_data(data)  # Where is process_data from?

# GOOD: Explicit imports
from utils import process_data, validate_input
from helpers import format_output

result = process_data(data)  # Clear origin

# Star imports are acceptable in __init__.py for public API
# mypackage/__init__.py
from .core import *  # Exposing public API
from .utils import *

# But define __all__ in each module
# core.py
__all__ = ['CoreClass', 'core_function']

class CoreClass: ...
def core_function(): ...
def _internal_helper(): ...  # Not exported
```

### Anti-Pattern 3: Heavy Top-Level Imports

```python
# BAD: Expensive import at module level
import pandas as pd  # Takes ~1 second to import!
import tensorflow as tf  # Takes ~3 seconds!
import matplotlib.pyplot as plt

def rarely_used_function():
    """This function is called once a day."""
    df = pd.DataFrame(data)
    return df.describe()

# Every import of this module pays the pandas/tf cost!

# GOOD: Lazy import for expensive modules
def rarely_used_function():
    """This function is called once a day."""
    import pandas as pd  # Import only when function is called
    df = pd.DataFrame(data)
    return df.describe()

# Or use lazy import pattern
_pd = None

def get_pandas():
    global _pd
    if _pd is None:
        import pandas as pd
        _pd = pd
    return _pd

def rarely_used_function():
    pd = get_pandas()
    df = pd.DataFrame(data)
    return df.describe()
```

---

## Best Practices to Apply

Positive patterns that improve code quality.

### PEP 8 Highlights

```python
# Naming conventions
module_name           # lowercase_with_underscores
ClassName             # CapWords (PascalCase)
function_name         # lowercase_with_underscores
CONSTANT_NAME         # UPPER_CASE_WITH_UNDERSCORES
_private_attr         # single leading underscore
__private_method      # double leading underscore (name mangling)
__dunder__            # double leading and trailing (magic methods)

# Line length: 79 characters for code, 72 for docstrings

# Imports order (use isort or ruff to automate)
# 1. Standard library
import os
import sys
from collections import defaultdict

# 2. Third-party packages
import numpy as np
import requests
from pydantic import BaseModel

# 3. Local application imports
from myapp.models import User
from myapp.utils import helper

# Blank lines
# Two blank lines around top-level definitions
# One blank line between methods
```

### PEP 20: The Zen of Python (Most Relevant)

```python
# Beautiful is better than ugly
# UGLY
def f(x):return x*2 if x>0 else -x*2

# BEAUTIFUL
def double_absolute(x: int) -> int:
    """Return double the absolute value."""
    return abs(x) * 2

# Explicit is better than implicit
# IMPLICIT
from config import *
db = connect()  # Where does connect come from?

# EXPLICIT
from config import DATABASE_URL
from database import connect
db = connect(DATABASE_URL)

# Simple is better than complex
# COMPLEX
result = (lambda f: (lambda x: f(lambda y: x(x)(y)))(lambda x: f(lambda y: x(x)(y))))(
    lambda f: lambda n: 1 if n < 2 else n * f(n - 1)
)(5)

# SIMPLE
def factorial(n: int) -> int:
    if n < 2:
        return 1
    return n * factorial(n - 1)

result = factorial(5)

# Flat is better than nested
# NESTED (see earlier example)

# FLAT (guard clauses)

# Errors should never pass silently
# SILENT
try:
    risky_operation()
except Exception:
    pass  # BAD

# EXPLICIT
try:
    risky_operation()
except SpecificError as e:
    logger.warning(f"Known issue occurred: {e}")
    # Handle appropriately

# In the face of ambiguity, refuse the temptation to guess
# GUESSING
def parse_date(s: str) -> date:
    # Is "01/02/03" Jan 2 2003? Feb 1 2003? Feb 3 2001?
    return datetime.strptime(s, "%m/%d/%y").date()

# EXPLICIT
def parse_date(s: str, format: str = "%Y-%m-%d") -> date:
    """Parse date string. Format must be specified for non-ISO formats."""
    return datetime.strptime(s, format).date()
```

### Production Code Guidelines

```python
# 1. Logging (never use print in production)
import logging

logger = logging.getLogger(__name__)

def process_order(order: Order) -> Result:
    logger.info("Processing order", extra={"order_id": order.id})
    try:
        result = _process(order)
        logger.info("Order processed successfully", extra={
            "order_id": order.id,
            "duration_ms": result.duration_ms
        })
        return result
    except ValidationError as e:
        logger.warning("Order validation failed", extra={
            "order_id": order.id,
            "error": str(e)
        })
        raise
    except Exception as e:
        logger.exception("Unexpected error processing order", extra={
            "order_id": order.id
        })
        raise

# 2. Configuration from environment
import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Config:
    database_url: str
    api_key: str
    debug: bool = False
    max_connections: int = 10

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            database_url=os.environ["DATABASE_URL"],
            api_key=os.environ["API_KEY"],
            debug=os.environ.get("DEBUG", "").lower() == "true",
            max_connections=int(os.environ.get("MAX_CONNECTIONS", "10")),
        )

# 3. Graceful shutdown
import signal
import sys

def shutdown_handler(signum, frame):
    logger.info("Shutdown signal received, cleaning up...")
    cleanup_resources()
    sys.exit(0)

signal.signal(signal.SIGTERM, shutdown_handler)
signal.signal(signal.SIGINT, shutdown_handler)

# 4. Health checks
from dataclasses import dataclass
from datetime import datetime

@dataclass
class HealthStatus:
    status: str  # "healthy", "degraded", "unhealthy"
    timestamp: datetime
    checks: dict[str, bool]

def health_check() -> HealthStatus:
    checks = {
        "database": check_database(),
        "cache": check_cache(),
        "external_api": check_external_api(),
    }

    if all(checks.values()):
        status = "healthy"
    elif checks["database"]:
        status = "degraded"
    else:
        status = "unhealthy"

    return HealthStatus(
        status=status,
        timestamp=datetime.utcnow(),
        checks=checks,
    )
```

---

## Detection Tools

Tools that automatically catch anti-patterns.

### Ruff: All-in-One Linter and Formatter

```bash
# Install
pip install ruff

# Lint
ruff check .

# Lint and fix automatically
ruff check . --fix

# Format (like black)
ruff format .
```

```toml
# pyproject.toml
[tool.ruff]
target-version = "py310"
line-length = 88

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "B",    # flake8-bugbear (catches common bugs)
    "C4",   # flake8-comprehensions
    "I",    # isort
    "UP",   # pyupgrade (modernize syntax)
    "SIM",  # flake8-simplify
    "PIE",  # flake8-pie (misc improvements)
]
ignore = [
    "E501",  # line too long (handled by formatter)
]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]  # Allow assert in tests
```

### Mypy: Static Type Checking

```bash
# Install
pip install mypy

# Check
mypy src/
```

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.10"
strict = true
warn_return_any = true
warn_unused_ignores = true
disallow_untyped_defs = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### Bandit: Security Scanning

```bash
# Install
pip install bandit

# Scan
bandit -r src/
```

```yaml
# .bandit.yaml
skips:
  - B101  # assert_used (OK in tests)
  - B601  # paramiko calls (if you use it intentionally)
```

### pytest: Testing Framework

```bash
# Install
pip install pytest pytest-cov pytest-xdist

# Run tests
pytest

# With coverage
pytest --cov=src --cov-report=html

# Parallel execution
pytest -n auto
```

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --strict-markers"
markers = [
    "slow: marks tests as slow",
    "integration: marks tests as integration tests",
]
```

### Pre-commit: Automated Checks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.3.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]

  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.7
    hooks:
      - id: bandit
        args: [-c, pyproject.toml]
```

```bash
# Install and set up
pip install pre-commit
pre-commit install

# Now checks run automatically on each commit!
```

---

## Quick Reference

### Anti-Pattern Detection Checklist

| Pattern | How to Spot | Fix |
|---------|-------------|-----|
| Mutable default | `def f(x=[])` or `def f(x={})` | Use `None` sentinel |
| Late binding | Lambda in loop without `i=i` | Default argument or `partial` |
| Bare except | `except:` without exception type | `except Exception:` minimum |
| String concat loop | `+=` on string in loop | Use `''.join()` |
| List for lookup | `if x in my_list` in loop | Use `set` for O(1) lookup |
| range(len()) | `for i in range(len(items))` | Direct iteration or `enumerate` |
| == for None | `if x == None` | `if x is None` |
| type() check | `if type(x) == int` | `isinstance(x, int)` |
| God object | Class with 20+ methods | Split by responsibility |
| Circular import | `ImportError` at startup | `TYPE_CHECKING` or restructure |

### Code Review Checklist

**Before approving a PR, check for:**

- [ ] No mutable default arguments
- [ ] No bare `except` clauses
- [ ] Exceptions are logged or re-raised, not swallowed
- [ ] No `range(len())` (use `enumerate` or direct iteration)
- [ ] Comparisons to `None` use `is`/`is not`
- [ ] Type checks use `isinstance()`, not `type()`
- [ ] Context managers used for resources
- [ ] No string concatenation in loops
- [ ] Sets used for membership testing when appropriate
- [ ] No circular imports
- [ ] Tests have assertions (not just running code)
- [ ] Logging used instead of `print()` in production code

---

## Interview Questions

### Q1: What's wrong with this code?

```python
def create_user(name, roles=[]):
    roles.append("user")
    return {"name": name, "roles": roles}
```

**Answer:**

The default argument `roles=[]` is evaluated once at function definition time, not each call. The same list object is shared across all calls.

```python
# What happens:
user1 = create_user("Alice")  # {"name": "Alice", "roles": ["user"]}
user2 = create_user("Bob")    # {"name": "Bob", "roles": ["user", "user"]}
user3 = create_user("Carol")  # {"name": "Carol", "roles": ["user", "user", "user"]}
```

**Fix:**
```python
def create_user(name, roles=None):
    if roles is None:
        roles = []
    roles.append("user")
    return {"name": name, "roles": roles}
```

---

### Q2: Why is this code slow?

```python
def build_report(data):
    report = ""
    for row in data:  # 100,000 rows
        report += f"{row['name']}: {row['value']}\n"
    return report
```

**Answer:**

String concatenation with `+=` creates a new string object each iteration because strings are immutable. This is O(n²) time complexity:
- Iteration 1: Create string of length 1
- Iteration 2: Create string of length 2 (copy 1, add 1)
- Iteration n: Create string of length n (copy n-1, add 1)
- Total: 1 + 2 + 3 + ... + n = n(n+1)/2 = O(n²)

**Fix:**
```python
def build_report(data):
    lines = [f"{row['name']}: {row['value']}" for row in data]
    return "\n".join(lines)
```
This is O(n) - each string is created once, then joined in a single operation.

---

### Q3: What's the bug here?

```python
def process_items(items):
    for item in items:
        if not item.is_valid():
            items.remove(item)
    return items
```

**Answer:**

Modifying a list while iterating over it causes items to be skipped. When you remove an item, all subsequent items shift down, but the iterator's index advances.

```python
# Example:
items = [invalid1, invalid2, valid1]
# Index 0: Check invalid1, remove it -> [invalid2, valid1]
# Index 1: Check valid1 (invalid2 is now at index 0, gets skipped!)
```

**Fix:**
```python
# Option 1: Create new list
def process_items(items):
    return [item for item in items if item.is_valid()]

# Option 2: Iterate over copy
def process_items(items):
    for item in items[:]:  # Iterate over copy
        if not item.is_valid():
            items.remove(item)
    return items

# Option 3: Iterate in reverse (if you must modify in place)
def process_items(items):
    for i in range(len(items) - 1, -1, -1):
        if not items[i].is_valid():
            del items[i]
    return items
```

---

### Q4: Identify all anti-patterns in this function:

```python
def fetch_data(url, cache={}):
    try:
        if url in cache.keys():
            return cache[url]
        response = requests.get(url)
        if response.status_code == 200:
            cache[url] = response.json()
            return cache[url]
        else:
            return None
    except:
        return None
```

**Answer:**

1. **Mutable default argument** (`cache={}`): Shared across calls
2. **`cache.keys()`**: Unnecessary, should be `url in cache`
3. **Bare `except`**: Catches everything including `KeyboardInterrupt`
4. **Silent exception handling**: Swallows errors, returns `None` with no logging
5. **`== 200` magic number**: Should use constants or `response.ok`
6. **No timeout**: `requests.get` can hang forever

**Fixed:**
```python
import logging
import requests
from functools import lru_cache

logger = logging.getLogger(__name__)

@lru_cache(maxsize=100)
def fetch_data(url: str) -> dict | None:
    """Fetch JSON data from URL with caching."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.Timeout:
        logger.warning(f"Timeout fetching {url}")
        return None
    except requests.RequestException as e:
        logger.error(f"Error fetching {url}: {e}")
        return None
```

---

### Q5: What's the issue with this async code?

```python
import asyncio
import time

async def fetch_data():
    time.sleep(1)  # Simulate API call
    return {"data": "value"}

async def main():
    tasks = [fetch_data() for _ in range(10)]
    results = await asyncio.gather(*tasks)
    return results
```

**Answer:**

`time.sleep(1)` is a **blocking call** that blocks the entire event loop. All 10 tasks run sequentially, taking 10 seconds total instead of 1 second.

In async code, you must use `asyncio.sleep()` or other async-compatible functions.

**Fix:**
```python
import asyncio

async def fetch_data():
    await asyncio.sleep(1)  # Non-blocking sleep
    return {"data": "value"}

async def main():
    tasks = [fetch_data() for _ in range(10)]
    results = await asyncio.gather(*tasks)
    return results  # Takes ~1 second, not 10
```

For real HTTP calls, use `aiohttp` instead of `requests`:
```python
import aiohttp
import asyncio

async def fetch_data(session, url):
    async with session.get(url) as response:
        return await response.json()

async def main(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_data(session, url) for url in urls]
        return await asyncio.gather(*tasks)
```

---

## Summary

**Key Takeaways:**

1. **Mutable defaults are dangerous** - Always use `None` sentinel
2. **Late binding captures references** - Use `i=i` or `functools.partial`
3. **Be specific with exceptions** - Never use bare `except`
4. **Strings are immutable** - Use `''.join()` for concatenation
5. **Sets are O(1) for lookup** - Use them instead of lists when appropriate
6. **Threading doesn't help CPU-bound work** - Use multiprocessing
7. **`asyncio.sleep()` not `time.sleep()`** - Never block the event loop
8. **Use tools** - Ruff, mypy, bandit catch these automatically

**The best defense against anti-patterns:**
- Use a linter (ruff) with strict rules
- Use type checking (mypy) in strict mode
- Write tests that verify behavior, not implementation
- Code review with an anti-pattern checklist
- Keep learning - new Python versions introduce better patterns
