# SOLID Principles in Python

> Applying object-oriented design principles using Python's dynamic nature, ABC, protocols, and composition

SOLID principles were originally defined for statically-typed object-oriented languages with classes and inheritance. Python takes a different approach — duck typing, dynamic types, first-class functions, and "we're all consenting adults here." This guide shows how each principle applies idiomatically in Python, making your code more maintainable, testable, and extensible.

**Reading time**: 60-75 minutes

---

## Table of Contents

1. [SOLID Overview for Python](#solid-overview-for-python)
2. [Single Responsibility Principle (SRP)](#single-responsibility-principle-srp)
3. [Open/Closed Principle (OCP)](#openclosed-principle-ocp)
4. [Liskov Substitution Principle (LSP)](#liskov-substitution-principle-lsp)
5. [Interface Segregation Principle (ISP)](#interface-segregation-principle-isp)
6. [Dependency Inversion Principle (DIP)](#dependency-inversion-principle-dip)
7. [SOLID in Practice: Complete Example](#solid-in-practice-complete-example)
8. [Interview Questions](#interview-questions)
9. [Quick Reference](#quick-reference)

---

## SOLID Overview for Python

### Why SOLID Matters

SOLID principles help you write code that is:
- **Maintainable**: Easy to modify without breaking other parts
- **Testable**: Components can be tested in isolation
- **Extensible**: New features added without changing existing code
- **Understandable**: Clear boundaries and responsibilities

### Python vs Traditional OOP

Python doesn't enforce strict OOP patterns, but SOLID still applies:

| Traditional OOP | Python Equivalent |
|-----------------|-------------------|
| Interface | `ABC` with `@abstractmethod` or `Protocol` |
| Abstract class | `ABC` base class |
| Polymorphism | Duck typing / Protocol |
| Constructor | `__init__` + `@classmethod` factories |
| Private/Public | Convention (`_underscore`, `__dunder`) |
| Multiple inheritance | Multiple inheritance (with MRO) |
| Dependency injection | Constructor arguments |

### ABC vs Protocol: When to Use Each

```python
# ABC - Use when you want:
# 1. Runtime type checking with isinstance()
# 2. To enforce implementation at class definition time
# 3. Shared implementation via inheritance

from abc import ABC, abstractmethod

class DataStore(ABC):
    @abstractmethod
    def save(self, data: dict) -> str:
        """Save data and return ID."""
        pass

    # Can include concrete methods
    def save_batch(self, items: list[dict]) -> list[str]:
        return [self.save(item) for item in items]


# Protocol - Use when you want:
# 1. Structural subtyping (duck typing with type hints)
# 2. No inheritance requirement
# 3. Static type checking without runtime overhead

from typing import Protocol

class Saveable(Protocol):
    def save(self, data: dict) -> str: ...

# Any class with matching method signature satisfies Protocol
class MemoryStore:
    def save(self, data: dict) -> str:
        # Implements Saveable without inheriting
        return "id-123"

def process(store: Saveable) -> None:
    store.save({})  # Type checker knows this is valid
```

### The SOLID Principles

| Principle | One-Line Summary |
|-----------|------------------|
| **S**ingle Responsibility | One reason to change |
| **O**pen/Closed | Open for extension, closed for modification |
| **L**iskov Substitution | Subtypes must be substitutable |
| **I**nterface Segregation | Many small interfaces > one large interface |
| **D**ependency Inversion | Depend on abstractions, not concretions |

---

## Single Responsibility Principle (SRP)

> "A module should have one, and only one, reason to change."
> — Robert C. Martin

In Python, SRP applies at three levels: **modules**, **classes**, and **functions**.

### Module-Level SRP

Each module should have a focused, cohesive purpose.

```python
# BAD: utils.py does too many unrelated things
# utils.py

def parse_json(data: str) -> dict: ...
def send_http_request(url: str) -> Response: ...
def validate_email(email: str) -> bool: ...
def format_date(dt: datetime) -> str: ...
def hash_password(password: str) -> str: ...
def generate_uuid() -> str: ...
```

```python
# GOOD: Separate modules with focused responsibilities
# json_utils.py   - parse(), serialize()
# http_client.py  - get(), post(), request()
# validators.py   - email(), phone(), url()
# formatters.py   - date(), currency(), duration()
# auth.py         - hash_password(), verify_password()
# identifiers.py  - uuid(), nanoid()
```

**Why it matters**: When JSON parsing logic changes, you only touch `json_utils.py`. When validation rules change, you only touch `validators.py`. Changes are isolated.

### Class-Level SRP

Each class should represent one concept and have one responsibility.

```python
# BAD: User class does too many things
class User:
    def __init__(self, id: int, email: str, password: str):
        self.id = id
        self.email = email
        self.password = password
        self._db = Database()
        self._mailer = EmailClient()

    def save(self) -> None:
        """Persistence - reason to change #1"""
        self._db.execute(
            "INSERT INTO users VALUES (?, ?, ?)",
            (self.id, self.email, self.password)
        )

    def send_welcome_email(self) -> None:
        """Notification - reason to change #2"""
        self._mailer.send(self.email, "Welcome!", "...")

    def validate_password(self) -> bool:
        """Validation - reason to change #3"""
        return len(self.password) >= 8

    def generate_report(self) -> str:
        """Reporting - reason to change #4"""
        return f"User {self.id}: {self.email}"
```

```python
# GOOD: Separate responsibilities into focused types
from dataclasses import dataclass

@dataclass
class User:
    """Pure data object - represents a user"""
    id: int
    email: str
    password: str


class UserRepository:
    """Handles persistence only"""

    def __init__(self, db: Database):
        self._db = db

    def save(self, user: User) -> None:
        self._db.execute(
            "INSERT INTO users VALUES (?, ?, ?)",
            (user.id, user.email, user.password)
        )

    def find_by_id(self, user_id: int) -> User | None:
        row = self._db.fetch_one("SELECT * FROM users WHERE id = ?", (user_id,))
        return User(**row) if row else None


class EmailService:
    """Handles notifications only"""

    def __init__(self, client: EmailClient):
        self._client = client

    def send_welcome(self, user: User) -> None:
        self._client.send(user.email, "Welcome!", "...")


class PasswordValidator:
    """Handles validation only"""

    def __init__(self, min_length: int = 8):
        self.min_length = min_length

    def validate(self, password: str) -> bool:
        if len(password) < self.min_length:
            return False
        # Additional rules...
        return True
```

### Function-Level SRP

Each function should do one thing well.

```python
# BAD: Function does too many things
def process_order(order: Order) -> None:
    # Validate
    if order.total <= 0:
        raise ValueError("Invalid total")
    if not order.items:
        raise ValueError("No items")

    # Calculate tax
    tax = order.total * 0.08
    order.tax = tax
    order.grand_total = order.total + tax

    # Save to database
    db.execute("INSERT INTO orders...", order.id, order.grand_total)

    # Send confirmation email
    mailer.send(order.customer_email, "Order Confirmed", "...")

    # Update inventory
    for item in order.items:
        db.execute("UPDATE inventory SET qty = qty - ?...", item.qty)
```

```python
# GOOD: Separate functions with single responsibilities
class OrderService:
    def __init__(
        self,
        validator: OrderValidator,
        calculator: TaxCalculator,
        repo: OrderRepository,
        notifier: NotificationService,
        inventory: InventoryService,
    ):
        self._validator = validator
        self._calculator = calculator
        self._repo = repo
        self._notifier = notifier
        self._inventory = inventory

    def process_order(self, order: Order) -> None:
        self._validator.validate(order)
        self._calculator.apply_tax(order)
        self._repo.save(order)
        self._notifier.send_confirmation(order)  # Fire-and-forget
        self._inventory.deduct(order.items)


class OrderValidator:
    def validate(self, order: Order) -> None:
        if order.total <= 0:
            raise ValueError("Invalid total")
        if not order.items:
            raise ValueError("No items")


class TaxCalculator:
    def __init__(self, rate: float = 0.08):
        self.rate = rate

    def apply_tax(self, order: Order) -> None:
        order.tax = order.total * self.rate
        order.grand_total = order.total + order.tax
```

### Signs of SRP Violation

| Code Smell | What It Indicates |
|------------|-------------------|
| Module named `utils.py`, `common.py`, `helpers.py` | No clear responsibility |
| Class with 10+ methods | Too many responsibilities |
| Function longer than 30 lines | Doing too much |
| Multiple reasons to modify a file | Mixed concerns |
| Difficulty writing unit tests | Too many dependencies |
| Class name includes "And" or "Manager" | Multiple responsibilities |

---

## Open/Closed Principle (OCP)

> "Software entities should be open for extension, but closed for modification."
> — Bertrand Meyer

In Python, we achieve OCP through **ABC/Protocol**, **decorators**, **first-class functions**, and **composition**.

### Extension Through ABC

Define behavior as abstract base classes, then add new implementations without changing existing code.

```python
from abc import ABC, abstractmethod

# NotificationSender defines the contract
# CLOSED: This interface won't change when we add new notification types
class NotificationSender(ABC):
    @abstractmethod
    def send(self, message: str) -> None:
        pass


# NotificationService uses the interface
# CLOSED: This service won't change when we add new senders
class NotificationService:
    def __init__(self, senders: list[NotificationSender]):
        self._senders = senders

    def notify_all(self, message: str) -> None:
        for sender in self._senders:
            sender.send(message)


# OPEN: Add new notification types by implementing the interface
class EmailSender(NotificationSender):
    def __init__(self, smtp_client: SMTPClient):
        self._client = smtp_client

    def send(self, message: str) -> None:
        self._client.send_mail("notifications@example.com", message)


class SMSSender(NotificationSender):
    def __init__(self, twilio_client: TwilioClient):
        self._client = twilio_client

    def send(self, message: str) -> None:
        self._client.send_sms("+1234567890", message)


class SlackSender(NotificationSender):
    def __init__(self, webhook_url: str):
        self._webhook_url = webhook_url

    def send(self, message: str) -> None:
        requests.post(self._webhook_url, json={"text": message})


# Adding PushNotificationSender requires:
# 1. Create new class implementing NotificationSender
# 2. NO changes to NotificationService!
```

### Extension Through Protocol

Use Protocol for structural subtyping without inheritance.

```python
from typing import Protocol

# CLOSED: Protocol defines the contract
class Processor(Protocol):
    def process(self, data: bytes) -> bytes: ...


# CLOSED: Function works with any Processor
def run_pipeline(data: bytes, processors: list[Processor]) -> bytes:
    result = data
    for processor in processors:
        result = processor.process(result)
    return result


# OPEN: Add new processors without modifying run_pipeline
class Compressor:
    def process(self, data: bytes) -> bytes:
        import gzip
        return gzip.compress(data)


class Encryptor:
    def __init__(self, key: bytes):
        self._key = key

    def process(self, data: bytes) -> bytes:
        # Encrypt data
        return encrypted_data


class Base64Encoder:
    def process(self, data: bytes) -> bytes:
        import base64
        return base64.b64encode(data)


# Usage - no changes to run_pipeline
result = run_pipeline(
    data,
    [Compressor(), Encryptor(key), Base64Encoder()]
)
```

### Extension Through Decorators

Python decorators are natural for OCP — add behavior without modifying original code.

```python
import functools
import time
import logging

# Original function - CLOSED for modification
def fetch_data(url: str) -> dict:
    response = requests.get(url)
    return response.json()


# OPEN: Extend with decorators
def retry(max_attempts: int = 3, delay: float = 1.0):
    """Add retry behavior without modifying function"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator


def cache_result(ttl_seconds: int = 300):
    """Add caching without modifying function"""
    cache = {}

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            if key in cache:
                value, timestamp = cache[key]
                if time.time() - timestamp < ttl_seconds:
                    return value
            result = func(*args, **kwargs)
            cache[key] = (result, time.time())
            return result
        return wrapper
    return decorator


def log_calls(func):
    """Add logging without modifying function"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logging.info(f"Calling {func.__name__} with {args}, {kwargs}")
        result = func(*args, **kwargs)
        logging.info(f"{func.__name__} returned {result}")
        return result
    return wrapper


# Extend behavior by stacking decorators
@retry(max_attempts=3)
@cache_result(ttl_seconds=60)
@log_calls
def fetch_data(url: str) -> dict:
    response = requests.get(url)
    return response.json()
```

### Strategy Pattern for OCP

```python
from typing import Protocol

# Strategy interface
class PaymentStrategy(Protocol):
    def pay(self, amount: float) -> str: ...


# PaymentProcessor is CLOSED for modification
class PaymentProcessor:
    def __init__(self, strategy: PaymentStrategy):
        self._strategy = strategy

    def process(self, amount: float) -> str:
        return self._strategy.pay(amount)


# OPEN: Add new payment methods
class CreditCardPayment:
    def __init__(self, card_number: str):
        self._card = card_number

    def pay(self, amount: float) -> str:
        # Process credit card
        return f"Paid ${amount:.2f} via card ending in {self._card[-4:]}"


class PayPalPayment:
    def __init__(self, email: str):
        self._email = email

    def pay(self, amount: float) -> str:
        return f"Paid ${amount:.2f} via PayPal ({self._email})"


class CryptoPayment:
    def __init__(self, wallet_address: str):
        self._wallet = wallet_address

    def pay(self, amount: float) -> str:
        return f"Paid ${amount:.2f} in crypto to {self._wallet[:8]}..."


# Adding Apple Pay, Google Pay doesn't touch PaymentProcessor
```

### Extension Through First-Class Functions

Python's first-class functions make OCP natural without needing classes.

```python
from typing import Callable

# Type alias for processor function
Processor = Callable[[str], str]


# CLOSED: Pipeline doesn't change when we add processors
def run_text_pipeline(text: str, processors: list[Processor]) -> str:
    result = text
    for process in processors:
        result = process(result)
    return result


# OPEN: Add new processors as functions
def remove_whitespace(text: str) -> str:
    return text.strip()


def lowercase(text: str) -> str:
    return text.lower()


def remove_punctuation(text: str) -> str:
    import string
    return text.translate(str.maketrans("", "", string.punctuation))


def normalize_spaces(text: str) -> str:
    return " ".join(text.split())


# Usage
result = run_text_pipeline(
    "  Hello, World!  ",
    [remove_whitespace, lowercase, remove_punctuation, normalize_spaces]
)
# "hello world"
```

---

## Liskov Substitution Principle (LSP)

> "If S is a subtype of T, then objects of type T may be replaced with objects of type S without altering program correctness."
> — Barbara Liskov

In Python, LSP means: **implementations must honor the behavioral contract, not just the type signature**.

### Python's Duck Typing and LSP

Python's duck typing ("if it walks like a duck...") makes LSP both easier and trickier. The type system won't catch violations — you must ensure behavioral correctness.

```python
from abc import ABC, abstractmethod

# Cache interface defines the BEHAVIORAL contract (in docstrings)
class Cache(ABC):
    @abstractmethod
    def get(self, key: str) -> tuple[any, bool]:
        """
        Get value by key.

        Returns:
            (value, True) if found
            (None, False) if not found

        Must never raise KeyError.
        """
        pass

    @abstractmethod
    def set(self, key: str, value: any, ttl: int = 300) -> None:
        """
        Store value with TTL.

        Args:
            ttl: Time-to-live in seconds. Must be honored.

        Raises:
            CacheError: On storage failure
        """
        pass


# MemoryCache honors the contract
class MemoryCache(Cache):
    def __init__(self):
        self._data: dict[str, tuple[any, float]] = {}

    def get(self, key: str) -> tuple[any, bool]:
        if key not in self._data:
            return None, False  # Contract: return (None, False) if not found

        value, expires_at = self._data[key]
        if time.time() > expires_at:
            del self._data[key]
            return None, False  # Expired = not found

        return value, True

    def set(self, key: str, value: any, ttl: int = 300) -> None:
        self._data[key] = (value, time.time() + ttl)


# RedisCache can substitute MemoryCache anywhere Cache is expected
class RedisCache(Cache):
    def __init__(self, client: redis.Redis):
        self._client = client

    def get(self, key: str) -> tuple[any, bool]:
        try:
            value = self._client.get(key)
            if value is None:
                return None, False  # Same contract
            return pickle.loads(value), True
        except redis.RedisError:
            return None, False  # Treat errors as "not found"

    def set(self, key: str, value: any, ttl: int = 300) -> None:
        try:
            self._client.setex(key, ttl, pickle.dumps(value))
        except redis.RedisError as e:
            raise CacheError(f"Redis error: {e}") from e
```

### LSP Violations to Avoid

#### Violation 1: Stricter Preconditions

```python
from abc import ABC, abstractmethod

class DataStore(ABC):
    @abstractmethod
    def save(self, data: bytes) -> str:
        """Save data and return ID. No size limit specified."""
        pass


# BAD: Adds stricter precondition than interface promises
class LimitedStore(DataStore):
    def save(self, data: bytes) -> str:
        if len(data) > 1024:
            raise ValueError("Data too large")  # Violates LSP!
        # Interface doesn't promise a size limit
        return self._store(data)


# GOOD: Handle gracefully or document in interface
class DataStore(ABC):
    @abstractmethod
    def save(self, data: bytes) -> str:
        """
        Save data and return ID.

        Implementations may chunk large data automatically.
        """
        pass


class ChunkingStore(DataStore):
    def save(self, data: bytes) -> str:
        """Chunks large data instead of rejecting."""
        if len(data) <= 1024:
            return self._store(data)

        # Chunk large data
        chunk_ids = []
        for i in range(0, len(data), 1024):
            chunk_id = self._store(data[i:i+1024])
            chunk_ids.append(chunk_id)
        return self._store_manifest(chunk_ids)
```

#### Violation 2: Weaker Postconditions

```python
class Repository(ABC):
    @abstractmethod
    def save(self, data: dict) -> str:
        """
        Save data and return ID.

        Postcondition: Returned ID can be used to retrieve data.
        """
        pass


# BAD: Weaker postcondition - ID might not work for retrieval
class VolatileRepository(Repository):
    def save(self, data: dict) -> str:
        id = str(uuid.uuid4())
        self._memory[id] = data  # Might be garbage collected!
        return id  # Violates postcondition


# GOOD: Honor the postcondition
class PersistentRepository(Repository):
    def __init__(self, storage: Storage):
        self._storage = storage

    def save(self, data: dict) -> str:
        id = str(uuid.uuid4())
        self._storage.write(id, json.dumps(data))
        return id  # Guaranteed to be retrievable
```

#### Violation 3: Raising Unexpected Exceptions

```python
from typing import Protocol

class Reader(Protocol):
    def read(self, size: int = -1) -> bytes:
        """
        Read up to size bytes.

        Returns empty bytes at EOF.
        Raises IOError on read failure.
        """
        ...


# BAD: Raises exception not in contract
class PanickingReader:
    def read(self, size: int = -1) -> bytes:
        raise NotImplementedError("Not implemented")  # Unexpected!


# BAD: Raises ValueError not in contract
class StrictReader:
    def read(self, size: int = -1) -> bytes:
        if size == 0:
            raise ValueError("Size cannot be zero")  # Not in contract!
        return self._data[:size]


# GOOD: Honor the contract
class SafeReader:
    def read(self, size: int = -1) -> bytes:
        if size == 0:
            return b""  # Valid per contract
        try:
            return self._source.read(size)
        except Exception as e:
            raise IOError(f"Read failed: {e}") from e  # Contract allows IOError
```

#### Violation 4: Breaking Invariants

```python
class Rectangle:
    def __init__(self, width: float, height: float):
        self._width = width
        self._height = height

    @property
    def width(self) -> float:
        return self._width

    @width.setter
    def width(self, value: float) -> None:
        self._width = value

    @property
    def height(self) -> float:
        return self._height

    @height.setter
    def height(self, value: float) -> None:
        self._height = value

    def area(self) -> float:
        return self._width * self._height


# BAD: Square violates Rectangle's invariants
class Square(Rectangle):
    def __init__(self, side: float):
        super().__init__(side, side)

    @Rectangle.width.setter
    def width(self, value: float) -> None:
        self._width = value
        self._height = value  # Breaks independence of width/height!

    @Rectangle.height.setter
    def height(self, value: float) -> None:
        self._width = value
        self._height = value


# This test passes for Rectangle but fails for Square:
def test_rectangle(rect: Rectangle):
    rect.width = 5
    rect.height = 10
    assert rect.area() == 50  # Fails for Square!


# GOOD: Use composition or separate hierarchies
class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        pass


class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height


class Square(Shape):
    def __init__(self, side: float):
        self.side = side

    def area(self) -> float:
        return self.side ** 2
```

### The LSP Mantra

> **"Require no more, promise no less."**

| Aspect | Requirement |
|--------|-------------|
| **Preconditions** | Cannot be strengthened (can't require more than interface) |
| **Postconditions** | Cannot be weakened (must deliver what interface promises) |
| **Invariants** | Must be preserved |
| **Exception types** | Cannot throw exceptions not in contract |

---

## Interface Segregation Principle (ISP)

> "Clients should not be forced to depend on methods they do not use."
> — Robert C. Martin

Python's Protocol and ABC support ISP beautifully through small, composable interfaces.

### Small Interfaces with Protocol

```python
from typing import Protocol

# Small, focused protocols
class Reader(Protocol):
    def read(self, size: int = -1) -> bytes: ...


class Writer(Protocol):
    def write(self, data: bytes) -> int: ...


class Closer(Protocol):
    def close(self) -> None: ...


class Seeker(Protocol):
    def seek(self, offset: int, whence: int = 0) -> int: ...


# Compose when needed
class ReadWriter(Reader, Writer, Protocol):
    pass


class ReadCloser(Reader, Closer, Protocol):
    pass


class ReadWriteSeeker(Reader, Writer, Seeker, Protocol):
    pass


# Functions accept only what they need
def copy_data(src: Reader, dst: Writer) -> int:
    """Only needs read and write capabilities."""
    data = src.read()
    return dst.write(data)


def read_all(source: Reader) -> bytes:
    """Only needs read capability."""
    return source.read()


def with_cleanup(resource: Closer, action: Callable) -> None:
    """Only needs close capability."""
    try:
        action()
    finally:
        resource.close()
```

### Kitchen Sink Anti-Pattern

```python
from abc import ABC, abstractmethod

# BAD: Giant interface forces implementations to include unused methods
class DataManager(ABC):
    @abstractmethod
    def create(self, data: dict) -> str: ...

    @abstractmethod
    def read(self, id: str) -> dict: ...

    @abstractmethod
    def update(self, id: str, data: dict) -> None: ...

    @abstractmethod
    def delete(self, id: str) -> None: ...

    @abstractmethod
    def list_all(self) -> list[str]: ...

    @abstractmethod
    def search(self, query: str) -> list[dict]: ...

    @abstractmethod
    def export(self, format: str) -> bytes: ...

    @abstractmethod
    def import_data(self, data: bytes) -> None: ...

    @abstractmethod
    def backup(self) -> bytes: ...

    @abstractmethod
    def restore(self, backup: bytes) -> None: ...


# Implementation must provide ALL methods, even if unused
# Testing requires mocking 10 methods!
class MockDataManager(DataManager):
    def create(self, data): return ""
    def read(self, id): return {}
    def update(self, id, data): pass
    def delete(self, id): pass
    def list_all(self): return []
    def search(self, query): return []
    def export(self, format): return b""
    def import_data(self, data): pass
    def backup(self): return b""
    def restore(self, backup): pass
```

```python
# GOOD: Segregated interfaces
from typing import Protocol

class Creator(Protocol):
    def create(self, data: dict) -> str: ...


class Reader(Protocol):
    def read(self, id: str) -> dict: ...


class Updater(Protocol):
    def update(self, id: str, data: dict) -> None: ...


class Deleter(Protocol):
    def delete(self, id: str) -> None: ...


class Lister(Protocol):
    def list_all(self) -> list[str]: ...


class Searcher(Protocol):
    def search(self, query: str) -> list[dict]: ...


# Compose for specific use cases
class CRUD(Creator, Reader, Updater, Deleter, Protocol):
    pass


class ReadOnlyStore(Reader, Lister, Searcher, Protocol):
    pass


# Functions accept only what they need
def import_data(creator: Creator, data: list[dict]) -> list[str]:
    """Only needs create capability."""
    return [creator.create(item) for item in data]


def generate_report(reader: Reader, lister: Lister) -> str:
    """Only needs read and list capabilities."""
    ids = lister.list_all()
    items = [reader.read(id) for id in ids]
    return format_report(items)


# Testing is trivial - only mock what you need
class MockCreator:
    def __init__(self):
        self.created = []

    def create(self, data: dict) -> str:
        id = f"id-{len(self.created)}"
        self.created.append(data)
        return id


def test_import_data():
    mock = MockCreator()
    result = import_data(mock, [{"a": 1}, {"b": 2}])
    assert len(result) == 2
    assert len(mock.created) == 2
```

### Accept Interfaces, Return Structs

This Python idiom embodies ISP:

```python
from typing import Protocol, Iterator

class Iterable(Protocol):
    def __iter__(self) -> Iterator: ...


# BAD: Requires more than needed
def process_items(items: list[str]) -> list[str]:
    """Forces caller to create a list even if they have a generator."""
    return [item.upper() for item in items]


# GOOD: Accept minimal interface
def process_items(items: Iterable[str]) -> list[str]:
    """Works with any iterable - list, tuple, generator, set, etc."""
    return [item.upper() for item in items]


# Now works with anything iterable:
process_items(["a", "b", "c"])           # list
process_items(("a", "b", "c"))           # tuple
process_items({"a", "b", "c"})           # set
process_items(x for x in "abc")          # generator
process_items(line.strip() for line in f) # file iterator
```

### Define Interfaces Where They're Used

```python
# service/user_service.py
# Define the interface where it's CONSUMED, not where it's implemented
from typing import Protocol

class UserStore(Protocol):
    """What UserService needs - nothing more."""
    def get_user(self, id: int) -> User | None: ...
    def save_user(self, user: User) -> None: ...


class UserService:
    def __init__(self, store: UserStore):
        self._store = store

    def update_email(self, user_id: int, new_email: str) -> User:
        user = self._store.get_user(user_id)
        if user is None:
            raise UserNotFound(user_id)
        user.email = new_email
        self._store.save_user(user)
        return user


# postgres/user_store.py
# Implementation satisfies the Protocol defined elsewhere
class PostgresUserStore:
    def __init__(self, db: Database):
        self._db = db

    def get_user(self, id: int) -> User | None:
        row = self._db.fetch_one("SELECT * FROM users WHERE id = ?", (id,))
        return User(**row) if row else None

    def save_user(self, user: User) -> None:
        self._db.execute(
            "UPDATE users SET email = ? WHERE id = ?",
            (user.email, user.id)
        )

    # May have additional methods that UserService doesn't need
    def delete_user(self, id: int) -> None: ...
    def list_users(self) -> list[User]: ...
```

---

## Dependency Inversion Principle (DIP)

> "High-level modules should not depend on low-level modules. Both should depend on abstractions."
> — Robert C. Martin

In Python:
- **Define interfaces (Protocol/ABC) where they're consumed**
- **Use constructor injection**
- **Push concrete dependencies to the composition root** (usually `main.py`)

### Traditional vs Inverted Dependencies

```
Traditional (BAD):
┌─────────────────┐
│   UserService   │ ──depends on──> ┌───────────────────┐
└─────────────────┘                 │ PostgresUserStore │
                                    └───────────────────┘

Inverted (GOOD):
┌─────────────────┐                 ┌─────────────┐
│   UserService   │ ──depends on──> │  UserStore  │ (Protocol)
└─────────────────┘                 └─────────────┘
                                          ▲
                                          │ implements
                                    ┌───────────────────┐
                                    │ PostgresUserStore │
                                    └───────────────────┘
```

### Interface Ownership

```python
# BAD: Low-level module defines the interface
# database/user_repository.py
from abc import ABC, abstractmethod

class UserRepository(ABC):
    @abstractmethod
    def find(self, id: int) -> User: ...
    @abstractmethod
    def save(self, user: User) -> None: ...


class PostgresUserRepository(UserRepository):
    def find(self, id: int) -> User: ...
    def save(self, user: User) -> None: ...


# service/user_service.py
from database.user_repository import UserRepository  # High depends on low!

class UserService:
    def __init__(self, repo: UserRepository):
        self._repo = repo  # Coupled to database package
```

```python
# GOOD: High-level module defines the interface
# service/user_service.py
from typing import Protocol

class UserStore(Protocol):
    """Interface defined where it's USED."""
    def get_user(self, id: int) -> User | None: ...
    def save_user(self, user: User) -> None: ...


class UserService:
    def __init__(self, store: UserStore):
        self._store = store  # Depends on abstraction it owns


# postgres/user_store.py
# Low-level implements interface defined by high-level
class PostgresUserStore:
    def __init__(self, db: Database):
        self._db = db

    def get_user(self, id: int) -> User | None: ...
    def save_user(self, user: User) -> None: ...
    # Implements service.UserStore without importing it!
```

### Constructor Injection

```python
from typing import Protocol

class EmailSender(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class Logger(Protocol):
    def info(self, message: str, **kwargs) -> None: ...
    def error(self, message: str, **kwargs) -> None: ...


class OrderStore(Protocol):
    def save(self, order: Order) -> None: ...
    def get(self, order_id: str) -> Order | None: ...


class OrderService:
    """High-level module depends only on abstractions."""

    def __init__(
        self,
        store: OrderStore,
        email: EmailSender,
        logger: Logger,
    ):
        self._store = store
        self._email = email
        self._logger = logger

    def place_order(self, order: Order) -> None:
        self._logger.info("Placing order", order_id=order.id)

        try:
            self._store.save(order)
        except Exception as e:
            self._logger.error("Failed to save order", error=str(e))
            raise

        try:
            self._email.send(
                order.customer_email,
                "Order Confirmed",
                f"Your order {order.id} has been placed."
            )
        except Exception as e:
            self._logger.error("Failed to send confirmation", error=str(e))
            # Non-critical, don't fail the order
```

### Composition Root Pattern

Wire everything together in `main.py` (the composition root):

```python
# main.py
import os
import logging
from service.order_service import OrderService
from service.user_service import UserService
from postgres.order_store import PostgresOrderStore
from postgres.user_store import PostgresUserStore
from email_providers.sendgrid import SendGridEmailSender
from cache.redis_cache import RedisCache


def create_app() -> Application:
    """Composition root - wire all dependencies."""

    # Create low-level dependencies
    db = Database(os.environ["DATABASE_URL"])
    redis_client = redis.Redis.from_url(os.environ["REDIS_URL"])

    # Create concrete implementations
    order_store = PostgresOrderStore(db)
    user_store = PostgresUserStore(db)
    cache = RedisCache(redis_client)
    email_sender = SendGridEmailSender(os.environ["SENDGRID_API_KEY"])
    logger = logging.getLogger("app")

    # Wire up services with dependencies
    user_service = UserService(
        store=user_store,
        cache=cache,
        logger=logger,
    )
    order_service = OrderService(
        store=order_store,
        email=email_sender,
        logger=logger,
    )

    # Create application with services
    return Application(
        user_service=user_service,
        order_service=order_service,
    )


if __name__ == "__main__":
    app = create_app()
    app.run()
```

### Package Structure for DIP

```
myapp/
├── main.py                         # Composition root
├── service/                        # Business logic (high-level)
│   ├── __init__.py
│   ├── user_service.py             # Defines UserStore Protocol
│   ├── order_service.py            # Defines OrderStore Protocol
│   └── protocols.py                # Shared protocols
├── postgres/                       # Implementation (low-level)
│   ├── __init__.py
│   ├── user_store.py               # Implements service.UserStore
│   └── order_store.py              # Implements service.OrderStore
├── redis_impl/
│   ├── __init__.py
│   └── cache.py                    # Implements service.Cache
├── email_providers/
│   ├── __init__.py
│   ├── sendgrid.py                 # Implements service.EmailSender
│   └── ses.py                      # Alternative implementation
└── api/
    ├── __init__.py
    └── routes.py                   # HTTP handlers
```

### Optional Dependencies with Defaults

```python
from typing import Protocol
from dataclasses import dataclass, field


class Logger(Protocol):
    def info(self, msg: str) -> None: ...
    def error(self, msg: str) -> None: ...


class Cache(Protocol):
    def get(self, key: str) -> any: ...
    def set(self, key: str, value: any, ttl: int) -> None: ...


# No-op implementations for optional dependencies
class NullLogger:
    def info(self, msg: str) -> None:
        pass

    def error(self, msg: str) -> None:
        pass


class NullCache:
    def get(self, key: str) -> any:
        return None

    def set(self, key: str, value: any, ttl: int) -> None:
        pass


@dataclass
class ServiceConfig:
    store: DataStore                           # Required
    logger: Logger = field(default_factory=NullLogger)   # Optional
    cache: Cache = field(default_factory=NullCache)      # Optional


class DataService:
    def __init__(self, config: ServiceConfig):
        self._store = config.store
        self._logger = config.logger
        self._cache = config.cache

    def get_item(self, id: str) -> dict:
        # Try cache first
        if cached := self._cache.get(f"item:{id}"):
            self._logger.info(f"Cache hit for {id}")
            return cached

        # Fetch from store
        item = self._store.get(id)
        self._cache.set(f"item:{id}", item, ttl=300)
        return item


# Usage with all dependencies
service = DataService(ServiceConfig(
    store=PostgresStore(db),
    logger=StructuredLogger(),
    cache=RedisCache(redis),
))

# Usage with minimal dependencies
service = DataService(ServiceConfig(
    store=PostgresStore(db),
    # logger and cache use no-op defaults
))
```

---

## SOLID in Practice: Complete Example

Let's build a notification system applying all SOLID principles:

```python
"""
Notification System demonstrating all SOLID principles.

SRP: Each class has one responsibility
OCP: New notification types added without modifying existing code
LSP: All senders honor the NotificationSender contract
ISP: Small, focused protocols
DIP: High-level NotificationService depends on abstractions
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol
from datetime import datetime


# ============================================
# DOMAIN MODELS
# ============================================

@dataclass
class Notification:
    id: str
    recipient: str
    subject: str
    body: str
    created_at: datetime


@dataclass
class NotificationResult:
    notification_id: str
    success: bool
    error: str | None = None


# ============================================
# PROTOCOLS (ISP: Small, focused interfaces)
# ============================================

class NotificationSender(Protocol):
    """Send a notification. Single responsibility."""
    def send(self, notification: Notification) -> NotificationResult: ...


class NotificationStore(Protocol):
    """Store notification records. Single responsibility."""
    def save(self, notification: Notification) -> None: ...
    def get(self, id: str) -> Notification | None: ...


class NotificationLogger(Protocol):
    """Log notification events. Single responsibility."""
    def log_sent(self, notification: Notification, result: NotificationResult) -> None: ...
    def log_error(self, notification: Notification, error: Exception) -> None: ...


class NotificationValidator(Protocol):
    """Validate notifications. Single responsibility."""
    def validate(self, notification: Notification) -> list[str]: ...


# ============================================
# SERVICE (SRP: Orchestration only)
# ============================================

class NotificationService:
    """
    Orchestrates notification sending.

    DIP: Depends on abstractions (protocols), not concrete implementations.
    SRP: Only orchestrates, delegates actual work to dependencies.
    """

    def __init__(
        self,
        sender: NotificationSender,
        store: NotificationStore,
        logger: NotificationLogger,
        validator: NotificationValidator,
    ):
        self._sender = sender
        self._store = store
        self._logger = logger
        self._validator = validator

    def send(self, notification: Notification) -> NotificationResult:
        # Validate
        errors = self._validator.validate(notification)
        if errors:
            return NotificationResult(
                notification_id=notification.id,
                success=False,
                error=f"Validation failed: {', '.join(errors)}"
            )

        # Store
        self._store.save(notification)

        # Send
        try:
            result = self._sender.send(notification)
            self._logger.log_sent(notification, result)
            return result
        except Exception as e:
            self._logger.log_error(notification, e)
            return NotificationResult(
                notification_id=notification.id,
                success=False,
                error=str(e)
            )


# ============================================
# IMPLEMENTATIONS (OCP: Open for extension)
# ============================================

# Email sender
class EmailSender:
    """
    Sends notifications via email.

    LSP: Honors NotificationSender contract.
    """

    def __init__(self, smtp_client):
        self._smtp = smtp_client

    def send(self, notification: Notification) -> NotificationResult:
        try:
            self._smtp.send_mail(
                to=notification.recipient,
                subject=notification.subject,
                body=notification.body,
            )
            return NotificationResult(notification.id, success=True)
        except Exception as e:
            return NotificationResult(notification.id, success=False, error=str(e))


# SMS sender - added without modifying EmailSender or NotificationService
class SMSSender:
    """
    Sends notifications via SMS.

    OCP: New sender type without modifying existing code.
    LSP: Same contract as EmailSender.
    """

    def __init__(self, twilio_client):
        self._twilio = twilio_client

    def send(self, notification: Notification) -> NotificationResult:
        try:
            # SMS uses body only, subject ignored
            self._twilio.send_sms(
                to=notification.recipient,
                message=notification.body[:160],  # SMS length limit
            )
            return NotificationResult(notification.id, success=True)
        except Exception as e:
            return NotificationResult(notification.id, success=False, error=str(e))


# Slack sender - added without modifying existing senders
class SlackSender:
    """
    Sends notifications via Slack.

    OCP: Yet another sender without modification.
    """

    def __init__(self, webhook_url: str):
        self._webhook_url = webhook_url

    def send(self, notification: Notification) -> NotificationResult:
        import requests
        try:
            response = requests.post(
                self._webhook_url,
                json={
                    "text": f"*{notification.subject}*\n{notification.body}"
                }
            )
            response.raise_for_status()
            return NotificationResult(notification.id, success=True)
        except Exception as e:
            return NotificationResult(notification.id, success=False, error=str(e))


# Multi-sender for broadcasting
class MultipleSender:
    """
    Sends to multiple channels.

    OCP: Composes senders without modifying them.
    """

    def __init__(self, senders: list[NotificationSender]):
        self._senders = senders

    def send(self, notification: Notification) -> NotificationResult:
        results = [sender.send(notification) for sender in self._senders]

        failures = [r for r in results if not r.success]
        if failures:
            errors = [r.error for r in failures if r.error]
            return NotificationResult(
                notification.id,
                success=False,
                error=f"Some channels failed: {', '.join(errors)}"
            )

        return NotificationResult(notification.id, success=True)


# ============================================
# SUPPORTING IMPLEMENTATIONS
# ============================================

class PostgresNotificationStore:
    def __init__(self, db):
        self._db = db

    def save(self, notification: Notification) -> None:
        self._db.execute(
            "INSERT INTO notifications (id, recipient, subject, body, created_at) VALUES (?, ?, ?, ?, ?)",
            (notification.id, notification.recipient, notification.subject,
             notification.body, notification.created_at)
        )

    def get(self, id: str) -> Notification | None:
        row = self._db.fetch_one("SELECT * FROM notifications WHERE id = ?", (id,))
        return Notification(**row) if row else None


class StructuredLogger:
    def log_sent(self, notification: Notification, result: NotificationResult) -> None:
        print(f"[INFO] Notification {notification.id} sent: success={result.success}")

    def log_error(self, notification: Notification, error: Exception) -> None:
        print(f"[ERROR] Notification {notification.id} failed: {error}")


class StandardValidator:
    def validate(self, notification: Notification) -> list[str]:
        errors = []
        if not notification.recipient:
            errors.append("recipient is required")
        if not notification.body:
            errors.append("body is required")
        return errors


# ============================================
# COMPOSITION ROOT (DIP: Wire in main)
# ============================================

def create_notification_service(config: dict) -> NotificationService:
    """
    Factory function to create fully configured NotificationService.

    This is the composition root where all dependencies are wired together.
    """

    # Create low-level dependencies based on config
    db = Database(config["database_url"])

    # Choose sender based on config
    sender: NotificationSender
    match config["notification_channel"]:
        case "email":
            smtp = SMTPClient(config["smtp_host"])
            sender = EmailSender(smtp)
        case "sms":
            twilio = TwilioClient(config["twilio_sid"], config["twilio_token"])
            sender = SMSSender(twilio)
        case "slack":
            sender = SlackSender(config["slack_webhook"])
        case "all":
            sender = MultipleSender([
                EmailSender(SMTPClient(config["smtp_host"])),
                SlackSender(config["slack_webhook"]),
            ])
        case _:
            raise ValueError(f"Unknown channel: {config['notification_channel']}")

    # Create service with dependencies
    return NotificationService(
        sender=sender,
        store=PostgresNotificationStore(db),
        logger=StructuredLogger(),
        validator=StandardValidator(),
    )


# Usage
if __name__ == "__main__":
    config = {
        "database_url": "postgresql://localhost/notifications",
        "notification_channel": "email",
        "smtp_host": "smtp.example.com",
    }

    service = create_notification_service(config)

    notification = Notification(
        id="notif-001",
        recipient="user@example.com",
        subject="Welcome!",
        body="Welcome to our platform.",
        created_at=datetime.now(),
    )

    result = service.send(notification)
    print(f"Sent: {result.success}")
```

---

## Interview Questions

### Q1: How does duck typing affect SOLID principles in Python?

**Answer**: Duck typing makes SOLID both easier and harder in Python:

**Easier**:
- ISP is natural — functions can accept any object with the needed methods
- DIP doesn't require explicit interfaces — any object satisfying the Protocol works
- No boilerplate interface declarations needed in many cases

**Harder**:
- LSP violations aren't caught at compile time — behavioral contracts must be documented and tested
- No compiler enforcement of interface implementation
- Duck typing can mask missing methods until runtime

**Best practice**: Use `typing.Protocol` for static type checking while maintaining duck typing flexibility. Document behavioral contracts in docstrings.

```python
from typing import Protocol

class Sortable(Protocol):
    def __lt__(self, other: "Sortable") -> bool: ...

def sort_items(items: list[Sortable]) -> list[Sortable]:
    return sorted(items)  # Works with any object that has __lt__
```

### Q2: Protocol vs ABC — when to use each?

**Answer**:

Use **Protocol** when:
- You want structural subtyping (duck typing with type hints)
- Implementation shouldn't need to inherit from anything
- You're defining an interface for code you don't control
- You want static type checking without runtime overhead

Use **ABC** when:
- You need `isinstance()` checks at runtime
- You want to enforce implementation at class definition time
- You have shared implementation to provide (concrete methods)
- You're building a plugin system with explicit registration

```python
# Protocol - structural subtyping
from typing import Protocol

class Closeable(Protocol):
    def close(self) -> None: ...

# Any class with close() method satisfies this
# No inheritance required


# ABC - nominal subtyping with enforcement
from abc import ABC, abstractmethod

class Plugin(ABC):
    @abstractmethod
    def execute(self) -> None:
        pass

    def cleanup(self) -> None:  # Shared implementation
        print("Cleaning up...")

# Must explicitly inherit and implement
class MyPlugin(Plugin):
    def execute(self) -> None:
        print("Executing...")
```

### Q3: What's wrong with this code from a SOLID perspective?

```python
class ReportGenerator:
    def __init__(self):
        self.db = PostgresDatabase()
        self.cache = RedisCache()

    def generate(self, report_type: str) -> str:
        if report_type == "sales":
            data = self.db.query("SELECT * FROM sales")
            return self._format_sales(data)
        elif report_type == "inventory":
            data = self.db.query("SELECT * FROM inventory")
            return self._format_inventory(data)
        else:
            raise ValueError(f"Unknown report type: {report_type}")

    def _format_sales(self, data): ...
    def _format_inventory(self, data): ...
```

**Answer**: Multiple violations:

1. **DIP violated**: Directly instantiates `PostgresDatabase()` and `RedisCache()` — high-level module depends on low-level modules
2. **OCP violated**: Adding new report types requires modifying `generate()` method
3. **SRP violated**: Class handles data fetching, caching, AND formatting
4. **Testability**: Cannot test without real database and cache

**Fix**:
```python
from typing import Protocol

class DataSource(Protocol):
    def query(self, sql: str) -> list[dict]: ...

class ReportFormatter(Protocol):
    def format(self, data: list[dict]) -> str: ...

class ReportGenerator:
    def __init__(
        self,
        data_source: DataSource,
        formatters: dict[str, ReportFormatter],
    ):
        self._data_source = data_source
        self._formatters = formatters

    def generate(self, report_type: str, query: str) -> str:
        formatter = self._formatters.get(report_type)
        if not formatter:
            raise ValueError(f"Unknown report type: {report_type}")

        data = self._data_source.query(query)
        return formatter.format(data)
```

### Q4: When should you NOT apply SOLID principles?

**Answer**: SOLID can be over-applied:

1. **Simple scripts**: A 50-line script doesn't need dependency injection
2. **Prototypes**: Get it working first, refactor later when patterns emerge
3. **Performance-critical code**: Abstractions add overhead (function calls, attribute lookups)
4. **Single implementations**: Creating a Protocol for one implementation is premature
5. **Internal implementation details**: Not every helper function needs an interface

**Signs of over-engineering**:
- More interfaces than implementations
- Deep inheritance hierarchies
- Excessive indirection making code hard to follow
- "Architecture astronaut" syndrome

The goal is maintainability, not dogmatic adherence. Apply SOLID when:
- Code will be modified by multiple developers
- Components need to be tested in isolation
- Requirements are likely to change
- You're building a library or framework

### Q5: How do you test SOLID-compliant code?

**Answer**: SOLID makes testing easier through dependency injection:

```python
# Production code
class OrderService:
    def __init__(self, store: OrderStore, notifier: Notifier):
        self._store = store
        self._notifier = notifier

    def place_order(self, order: Order) -> None:
        self._store.save(order)
        self._notifier.notify(order.customer, f"Order {order.id} placed")


# Test with simple mocks
class MockOrderStore:
    def __init__(self):
        self.saved = []

    def save(self, order: Order) -> None:
        self.saved.append(order)


class MockNotifier:
    def __init__(self):
        self.notifications = []

    def notify(self, recipient: str, message: str) -> None:
        self.notifications.append((recipient, message))


def test_place_order():
    store = MockOrderStore()
    notifier = MockNotifier()
    service = OrderService(store, notifier)

    order = Order(id="123", customer="alice@example.com", total=99.99)
    service.place_order(order)

    assert len(store.saved) == 1
    assert store.saved[0].id == "123"
    assert len(notifier.notifications) == 1
    assert "alice@example.com" in notifier.notifications[0]
```

---

## Quick Reference

### SOLID Mapping to Python

| Principle | Python Implementation |
|-----------|----------------------|
| **SRP** | Focused modules, single-purpose classes, small functions |
| **OCP** | Protocol/ABC, decorators, first-class functions, composition |
| **LSP** | Honor behavioral contracts, consistent return types/exceptions |
| **ISP** | Small Protocols, accept minimal types, use structural subtyping |
| **DIP** | Protocol at consumer, constructor injection, composition root |

### Common Patterns

| Pattern | Principle | Python Implementation |
|---------|-----------|----------------------|
| Repository | SRP, DIP | Protocol in service, impl in storage module |
| Strategy | OCP | Protocol or Callable for interchangeable algorithms |
| Decorator | OCP | `@functools.wraps` function decorators |
| Factory | DIP | `@classmethod` or standalone factory functions |
| Observer | OCP | Callback lists, event emitters |

### Code Smells

| Smell | Violation | Fix |
|-------|-----------|-----|
| `utils.py` module | SRP | Split by domain |
| 10+ method class | SRP, ISP | Split responsibilities |
| `from database import db` in service | DIP | Inject dependency |
| `if type == "x"` chains | OCP | Use strategy/factory |
| Method raises unexpected exception | LSP | Document and honor contract |

### Questions to Ask

| Question | Helps With |
|----------|------------|
| "How many reasons could this change?" | SRP |
| "Can I add features without modifying this?" | OCP |
| "Can any implementation substitute here?" | LSP |
| "Does caller use all these methods?" | ISP |
| "Who owns this interface?" | DIP |

---

## Resources

- [Real Python - SOLID Principles in Python](https://realpython.com/solid-principles-python/)
- [Python Patterns Guide](https://python-patterns.guide/)
- [PEP 544 - Protocols: Structural subtyping](https://peps.python.org/pep-0544/)
- [Clean Code in Python (O'Reilly)](https://www.oreilly.com/library/view/clean-code-in/9781788835831/)

---

**Next**: [10-design-patterns-creational.md](10-design-patterns-creational.md) — Creational Design Patterns
