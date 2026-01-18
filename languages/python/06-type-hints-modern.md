# Modern Python Type Hints

> Type annotations for clearer code and better tooling (Python 3.9-3.14)

Type hints make your code self-documenting, catch bugs before runtime, and improve IDE support.

---

## Table of Contents

1. [Basic Type Annotations](#basic-type-annotations)
2. [Built-in Generic Types](#built-in-generic-types)
3. [Union Types](#union-types)
4. [The typing Module](#the-typing-module)
5. [TypedDict](#typeddict)
6. [Protocol](#protocol)
7. [Literal Types](#literal-types)
8. [Type Aliases](#type-aliases)
9. [Generics](#generics)
10. [Python 3.14: Deferred Evaluation](#python-314-deferred-evaluation)
11. [Type Checking in Practice](#type-checking-in-practice)

---

## Basic Type Annotations

### Variable Annotations

```python
# Basic types
name: str = "Alice"
age: int = 30
height: float = 1.75
is_active: bool = True
nothing: None = None

# Without initialization (just declaration)
count: int                          # Declared but not assigned

# Type is hint only - Python won't enforce it
x: int = "hello"                    # No runtime error!
```

### Function Annotations

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

def add(a: int, b: int) -> int:
    return a + b

def process(data: bytes) -> None:
    # Returns nothing
    pass

# Default arguments
def greet(name: str = "World") -> str:
    return f"Hello, {name}!"

# *args and **kwargs
def func(*args: int, **kwargs: str) -> None:
    pass
```

### Class Annotations

```python
class Person:
    name: str
    age: int

    def __init__(self, name: str, age: int) -> None:
        self.name = name
        self.age = age

    def greet(self) -> str:
        return f"Hi, I'm {self.name}"

# Class variables vs instance variables
class Counter:
    count: int = 0                  # Class variable

    def __init__(self) -> None:
        self.value: int = 0         # Instance variable
```

---

## Built-in Generic Types

Python 3.9+ allows using built-in types directly as generics.

### Collections

```python
# Python 3.9+ - use built-in types directly
nums: list[int] = [1, 2, 3]
names: set[str] = {"Alice", "Bob"}
ages: dict[str, int] = {"Alice": 30}
point: tuple[int, int] = (3, 4)

# Variable-length tuple
coords: tuple[float, ...] = (1.0, 2.0, 3.0)

# Nested generics
matrix: list[list[int]] = [[1, 2], [3, 4]]
graph: dict[str, list[str]] = {"a": ["b", "c"]}

# Python 3.8 and earlier - import from typing
from typing import List, Dict, Set, Tuple
nums: List[int] = [1, 2, 3]
```

### Common Types

```python
# Callable
from collections.abc import Callable

def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

# Callable with variable args
handler: Callable[..., None]        # Any args, returns None

# Iterator and Iterable
from collections.abc import Iterator, Iterable

def count_up(n: int) -> Iterator[int]:
    for i in range(n):
        yield i

def process(items: Iterable[str]) -> None:
    for item in items:
        print(item)

# Sequence and Mapping
from collections.abc import Sequence, Mapping

def first(items: Sequence[int]) -> int:
    return items[0]

def get_name(data: Mapping[str, str]) -> str:
    return data["name"]
```

---

## Union Types

### Union with | (Python 3.10+)

```python
# Python 3.10+ syntax
def process(value: int | str) -> str:
    return str(value)

def find(items: list[int], target: int) -> int | None:
    try:
        return items.index(target)
    except ValueError:
        return None

# Multiple types
def parse(data: str | bytes | None) -> dict:
    pass
```

### Optional

```python
# Optional[X] is equivalent to X | None
from typing import Optional

def find(items: list[int], target: int) -> Optional[int]:
    # Same as int | None
    pass

# Python 3.10+ - prefer | None
def find(items: list[int], target: int) -> int | None:
    pass
```

### Pre-3.10 Union

```python
from typing import Union

def process(value: Union[int, str]) -> str:
    return str(value)

# Nested unions flatten
Union[int, Union[str, float]]       # Same as Union[int, str, float]
```

---

## The typing Module

### Special Types

```python
from typing import Any, NoReturn, Never

# Any - disables type checking
def process(data: Any) -> Any:
    return data.whatever()          # No type errors

# NoReturn - function never returns normally
def fail(message: str) -> NoReturn:
    raise RuntimeError(message)

# Never (Python 3.11+) - more precise than NoReturn
def impossible() -> Never:
    raise AssertionError("This should never happen")
```

### TypeVar — Generic Type Variables

```python
from typing import TypeVar

T = TypeVar('T')

def first(items: list[T]) -> T:
    return items[0]

# Constrained TypeVar
Number = TypeVar('Number', int, float)

def double(x: Number) -> Number:
    return x * 2

# Bound TypeVar
from typing import TypeVar

Comparable = TypeVar('Comparable', bound='Comparable')

class Comparable:
    def __lt__(self, other: 'Comparable') -> bool:
        ...
```

### Final — Prevent Reassignment

```python
from typing import Final

MAX_SIZE: Final = 100
MAX_SIZE = 200                      # Type error

class Config:
    DEBUG: Final[bool] = True

# Final methods (can't be overridden)
from typing import final

class Base:
    @final
    def important_method(self) -> None:
        pass
```

### ClassVar — Class Variables

```python
from typing import ClassVar

class Counter:
    count: ClassVar[int] = 0        # Shared across instances

    def __init__(self) -> None:
        Counter.count += 1
```

---

## TypedDict

TypedDict defines dictionaries with specific keys and types.

### Basic TypedDict

```python
from typing import TypedDict

class Person(TypedDict):
    name: str
    age: int

# Usage
person: Person = {"name": "Alice", "age": 30}

# Type checker catches errors
person: Person = {"name": "Alice"}  # Error: missing 'age'
person: Person = {"name": "Alice", "age": "30"}  # Error: wrong type

# Access
name = person["name"]               # str
age = person["age"]                 # int
```

### Optional and Required Keys

```python
from typing import TypedDict, Required, NotRequired

# All keys required by default
class PersonRequired(TypedDict):
    name: str
    age: int

# Mix required and optional (Python 3.11+)
class Person(TypedDict):
    name: str
    age: NotRequired[int]           # Optional

# Or use total=False for all optional
class PersonOptional(TypedDict, total=False):
    name: str
    age: int

# Then mark required ones
class Person(TypedDict, total=False):
    name: Required[str]             # Required
    age: int                        # Optional
```

### Inheritance

```python
class PersonBase(TypedDict):
    name: str
    age: int

class Employee(PersonBase):
    department: str
    salary: float
```

---

## Protocol

Protocols enable structural subtyping (duck typing with type checking).

### Basic Protocol

```python
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None:
        ...

# Any class with draw() method is compatible
class Circle:
    def draw(self) -> None:
        print("Drawing circle")

class Square:
    def draw(self) -> None:
        print("Drawing square")

def render(shape: Drawable) -> None:
    shape.draw()

render(Circle())                    # OK
render(Square())                    # OK
```

### Protocol with Attributes

```python
from typing import Protocol

class Named(Protocol):
    name: str

class Person:
    def __init__(self, name: str):
        self.name = name

def greet(obj: Named) -> str:
    return f"Hello, {obj.name}"

greet(Person("Alice"))              # OK
```

### Runtime Checkable

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None:
        ...

# Can use isinstance at runtime
file = open("test.txt")
isinstance(file, Closeable)         # True
```

### Common Protocols

```python
from typing import Protocol

class Comparable(Protocol):
    def __lt__(self, other: 'Comparable') -> bool:
        ...

class Hashable(Protocol):
    def __hash__(self) -> int:
        ...

class Iterable(Protocol[T]):
    def __iter__(self) -> Iterator[T]:
        ...

class SupportsAdd(Protocol):
    def __add__(self, other: 'SupportsAdd') -> 'SupportsAdd':
        ...
```

---

## Literal Types

Literal types restrict values to specific literals.

### Basic Literals

```python
from typing import Literal

def set_mode(mode: Literal["read", "write"]) -> None:
    pass

set_mode("read")                    # OK
set_mode("write")                   # OK
set_mode("append")                  # Type error

# Numeric literals
def set_level(level: Literal[1, 2, 3]) -> None:
    pass

# Boolean literals
def set_debug(debug: Literal[True]) -> None:
    pass
```

### With Union

```python
from typing import Literal

Status = Literal["pending", "active", "completed"]

def update_status(status: Status) -> None:
    pass

# Expand with more values
ExtendedStatus = Literal[Status, "cancelled", "error"]
```

### Overloads with Literals

```python
from typing import Literal, overload

@overload
def get_value(key: Literal["name"]) -> str: ...
@overload
def get_value(key: Literal["age"]) -> int: ...
@overload
def get_value(key: str) -> str | int: ...

def get_value(key: str) -> str | int:
    if key == "name":
        return "Alice"
    elif key == "age":
        return 30
    return ""

name = get_value("name")            # str
age = get_value("age")              # int
```

---

## Type Aliases

### Simple Aliases

```python
# Simple alias
Vector = list[float]

def scale(v: Vector, factor: float) -> Vector:
    return [x * factor for x in v]

# Complex alias
UserID = int
Username = str
UserMap = dict[UserID, Username]
```

### TypeAlias (Python 3.10+)

```python
from typing import TypeAlias

# Explicit type alias annotation
Vector: TypeAlias = list[float]
ConnectionOptions: TypeAlias = dict[str, str]
```

### type Statement (Python 3.12+)

```python
# New syntax for type aliases
type Vector = list[float]
type Point = tuple[float, float]
type Callback[T] = Callable[[T], None]

# Generic type alias
type ListOrSet[T] = list[T] | set[T]
```

---

## Generics

### Generic Classes

```python
from typing import Generic, TypeVar

T = TypeVar('T')

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

# Usage
int_stack: Stack[int] = Stack()
int_stack.push(1)
value: int = int_stack.pop()

str_stack: Stack[str] = Stack()
str_stack.push("hello")
```

### Python 3.12+ Generic Syntax

```python
# New syntax - no need for TypeVar
class Stack[T]:
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

# Generic function
def first[T](items: list[T]) -> T:
    return items[0]

# Multiple type parameters
class Pair[K, V]:
    def __init__(self, key: K, value: V) -> None:
        self.key = key
        self.value = value
```

### Bounded Generics

```python
# Pre-3.12
from typing import TypeVar

T = TypeVar('T', bound=int)

def process(x: T) -> T:
    return x + 1

# Python 3.12+
def process[T: int](x: T) -> T:
    return x + 1

# Constrained to specific types
def process[T: (int, float)](x: T) -> T:
    return x * 2
```

---

## Python 3.14: Deferred Evaluation

### PEP 649 — Deferred Annotation Evaluation

```python
# Python 3.14 - annotations are NOT evaluated at definition time
# They're stored and evaluated on-demand

# Forward references now work without quotes!
class Node:
    def __init__(self, value: int, next: Node | None = None):
        self.value = value
        self.next = next            # Just works!

class Tree:
    left: Tree | None               # No quotes needed
    right: Tree | None
```

### annotationlib Module

```python
from annotationlib import get_annotations, Format

def func(x: UndefinedType) -> int:
    return 42

# Different evaluation modes
get_annotations(func, format=Format.STRING)
# {'x': 'UndefinedType', 'return': 'int'}

get_annotations(func, format=Format.FORWARDREF)
# {'x': ForwardRef('UndefinedType'), 'return': <class 'int'>}

get_annotations(func, format=Format.VALUE)
# Raises NameError for undefined types
```

### Benefits

```python
# 1. No runtime cost for annotations
class Config:
    # These annotations are NOT evaluated at import time
    setting1: ComplexType[Nested[Types]]
    setting2: AnotherComplexType

# 2. Cleaner forward references
class Parent:
    children: list[Child]           # No quotes!

class Child:
    parent: Parent

# 3. Better error messages when types are missing
# Errors occur at annotation access time, not import time
```

---

## Type Checking in Practice

### mypy — Static Type Checker

```bash
# Install
pip install mypy

# Check file
mypy script.py

# Check directory
mypy src/

# Configuration (mypy.ini or pyproject.toml)
```

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_ignores = true
```

### Common mypy Options

```bash
# Strict mode (recommended for new projects)
mypy --strict script.py

# Ignore missing imports
mypy --ignore-missing-imports script.py

# Show error codes
mypy --show-error-codes script.py
```

### Type Comments (Legacy)

```python
# For Python 2/3 compatible code or old codebases
def add(a, b):
    # type: (int, int) -> int
    return a + b

x = 1  # type: int
```

### Gradual Typing

```python
from typing import Any

# Start with Any, gradually add types
def legacy_function(data: Any) -> Any:
    # TODO: Add proper types
    return data

# Ignore specific lines
x: int = "hello"  # type: ignore

# Ignore specific error codes
x: int = "hello"  # type: ignore[assignment]
```

### pyright / pylance

```bash
# Install (faster than mypy)
pip install pyright

# Check
pyright script.py
```

```json
// pyrightconfig.json
{
    "typeCheckingMode": "strict",
    "pythonVersion": "3.12"
}
```

### When to Use Types in Interviews

```python
# DO: Use types for function signatures
def two_sum(nums: list[int], target: int) -> list[int]:
    pass

# DO: Use types for complex return types
def find_path(graph: dict[str, list[str]],
              start: str,
              end: str) -> list[str] | None:
    pass

# SKIP: Variable annotations in short functions
def solve(nums: list[int]) -> int:
    # No need to annotate these
    result = 0
    seen = set()
    for num in nums:
        result += num
    return result
```

---

## Quick Reference

### Type Syntax Evolution

| Version | Feature |
|---------|---------|
| 3.5 | `typing` module introduced |
| 3.9 | `list[int]` instead of `List[int]` |
| 3.10 | `X \| Y` instead of `Union[X, Y]` |
| 3.11 | `Self`, `Never`, `Required`/`NotRequired` |
| 3.12 | `type` statement, `class Foo[T]:` syntax |
| 3.14 | Deferred evaluation, `annotationlib` |

### Common Patterns

```python
# Function returning None
def process(data: str) -> None:

# Function returning same type as input
from typing import TypeVar
T = TypeVar('T')
def identity(x: T) -> T:

# Optional parameter
def greet(name: str | None = None) -> str:

# Callable
from collections.abc import Callable
def apply(func: Callable[[int], int], x: int) -> int:

# Dictionary with known keys
class Config(TypedDict):
    debug: bool
    port: int

# Duck typing
class Drawable(Protocol):
    def draw(self) -> None: ...
```

### Essential Imports

```python
# Python 3.10+
from typing import (
    Any,
    Callable,
    TypeVar,
    Generic,
    Protocol,
    TypedDict,
    Literal,
    Final,
    overload,
)
from collections.abc import Iterator, Iterable, Sequence, Mapping
```
