# Python Structural Design Patterns

> Patterns for composing classes and objects into larger structures

Structural patterns deal with object composition, creating relationships between objects to form larger structures while keeping them flexible and efficient. Python's duck typing, decorators, and dynamic attributes make many of these patterns elegant and natural.

**Reading time**: 50-60 minutes

---

## Table of Contents

1. [Pattern Selection Guide](#pattern-selection-guide)
2. [Adapter](#adapter)
3. [Bridge](#bridge)
4. [Composite](#composite)
5. [Decorator](#decorator)
6. [Facade](#facade)
7. [Flyweight](#flyweight)
8. [Proxy](#proxy)
9. [Interview Questions](#interview-questions)
10. [Quick Reference](#quick-reference)

---

## Pattern Selection Guide

### When to Use Each Pattern

```
Need to use incompatible interface?
└── Yes → Adapter

Separate abstraction from implementation?
└── Yes → Bridge

Tree structure with uniform interface?
└── Yes → Composite

Add behavior without modifying class?
└── Yes → Decorator

Simplify complex subsystem?
└── Yes → Facade

Many similar objects (memory concern)?
└── Yes → Flyweight

Control access to object?
└── Yes → Proxy
```

### Quick Decision Table

| Scenario | Pattern | Python Approach |
|----------|---------|-----------------|
| Third-party library integration | Adapter | Wrapper class or `__getattr__` |
| Multiple dimensions of variation | Bridge | Composition with Protocol |
| File system / menu / org chart | Composite | Recursive structure |
| Add logging, caching, retry | Decorator | `@decorator` functions |
| Complex API simplification | Facade | Single entry-point class |
| Thousands of similar objects | Flyweight | Shared state + `__slots__` |
| Lazy loading, access control | Proxy | Wrapper with `__getattr__` |

---

## Adapter

> Convert the interface of a class into another interface clients expect.

Use when you need to use existing code with an incompatible interface.

### Object Adapter

```python
from typing import Protocol


# Target interface that client code expects
class PaymentProcessor(Protocol):
    def process_payment(self, amount: float, currency: str) -> str:
        """Process payment and return transaction ID."""
        ...


# Existing third-party library with different interface
class LegacyPaymentGateway:
    """Third-party payment system with different method names."""

    def make_transaction(self, cents: int, currency_code: str) -> dict:
        """Process in cents, returns dict with 'txn_id'."""
        print(f"Legacy gateway: Processing {cents} {currency_code}")
        return {"txn_id": "TXN123", "status": "approved"}


# Adapter wraps the legacy system
class LegacyPaymentAdapter:
    """Adapts LegacyPaymentGateway to PaymentProcessor interface."""

    def __init__(self, legacy_gateway: LegacyPaymentGateway):
        self._gateway = legacy_gateway

    def process_payment(self, amount: float, currency: str) -> str:
        # Convert interface: dollars to cents, return only txn_id
        cents = int(amount * 100)
        result = self._gateway.make_transaction(cents, currency.upper())
        return result["txn_id"]


# Client code works with any PaymentProcessor
def checkout(processor: PaymentProcessor, amount: float) -> str:
    return processor.process_payment(amount, "USD")


# Usage
legacy = LegacyPaymentGateway()
adapter = LegacyPaymentAdapter(legacy)
txn_id = checkout(adapter, 99.99)  # Works seamlessly
```

### Function Adapter

```python
from typing import Callable


# Expected signature
Callback = Callable[[str, int], None]


# Library function with different signature
def old_callback(data: dict) -> bool:
    """Old callback expects dict, returns bool."""
    print(f"Processing: {data}")
    return True


# Adapter function
def adapt_callback(old_fn: Callable[[dict], bool]) -> Callback:
    """Adapt old callback to new signature."""
    def adapted(message: str, code: int) -> None:
        old_fn({"message": message, "code": code})
    return adapted


# Usage
new_callback = adapt_callback(old_callback)
new_callback("Hello", 200)  # Works with new interface
```

### Using `__getattr__` for Dynamic Adaptation

```python
class DynamicAdapter:
    """Adapter that dynamically maps attribute access."""

    def __init__(self, adaptee, attribute_mapping: dict[str, str]):
        self._adaptee = adaptee
        self._mapping = attribute_mapping

    def __getattr__(self, name: str):
        # Map attribute name if in mapping, otherwise use original
        adapted_name = self._mapping.get(name, name)
        return getattr(self._adaptee, adapted_name)


# Example: Adapt different data sources to common interface
class MySQLConnection:
    def fetch_rows(self, query: str) -> list:
        return [{"id": 1}, {"id": 2}]

    def row_count(self) -> int:
        return 2


class PostgresConnection:
    def execute_query(self, sql: str) -> list:
        return [{"id": 1}, {"id": 2}]

    def affected_rows(self) -> int:
        return 2


# Create adapters with different mappings
mysql_adapter = DynamicAdapter(MySQLConnection(), {
    "query": "fetch_rows",
    "count": "row_count",
})

postgres_adapter = DynamicAdapter(PostgresConnection(), {
    "query": "execute_query",
    "count": "affected_rows",
})

# Both work with same interface
for db in [mysql_adapter, postgres_adapter]:
    results = db.query("SELECT * FROM users")
    print(f"Count: {db.count()}")
```

### Adapter with Caching

```python
from functools import lru_cache
from typing import Protocol


class DataFetcher(Protocol):
    def fetch(self, key: str) -> dict: ...


class SlowAPIClient:
    """Third-party API client that's slow."""

    def get_resource(self, resource_id: str) -> dict:
        print(f"Fetching {resource_id} from API...")
        import time
        time.sleep(1)  # Simulate slow API
        return {"id": resource_id, "data": "..."}


class CachingAPIAdapter:
    """Adapter that adds caching to slow API."""

    def __init__(self, client: SlowAPIClient, maxsize: int = 100):
        self._client = client
        # Create cached version of fetch
        self._cached_fetch = lru_cache(maxsize=maxsize)(self._do_fetch)

    def _do_fetch(self, key: str) -> tuple:
        # Convert to tuple for hashability
        result = self._client.get_resource(key)
        return tuple(result.items())

    def fetch(self, key: str) -> dict:
        # Convert back to dict
        return dict(self._cached_fetch(key))

    def clear_cache(self) -> None:
        self._cached_fetch.cache_clear()


# Usage
adapter = CachingAPIAdapter(SlowAPIClient())
result1 = adapter.fetch("user-123")  # Slow - hits API
result2 = adapter.fetch("user-123")  # Fast - from cache
```

---

## Bridge

> Decouple an abstraction from its implementation so that the two can vary independently.

Use when you have multiple dimensions of variation.

### Notification System Bridge

```python
from abc import ABC, abstractmethod
from typing import Protocol


# Implementation interface
class MessageSender(Protocol):
    """How to send the message."""
    def send(self, recipient: str, content: str) -> None: ...


# Concrete implementations
class EmailSender:
    def __init__(self, smtp_host: str):
        self._host = smtp_host

    def send(self, recipient: str, content: str) -> None:
        print(f"[Email via {self._host}] To: {recipient}")
        print(f"  Content: {content}")


class SMSSender:
    def __init__(self, api_key: str):
        self._api_key = api_key

    def send(self, recipient: str, content: str) -> None:
        print(f"[SMS] To: {recipient}")
        print(f"  Content: {content[:160]}")  # SMS limit


class SlackSender:
    def __init__(self, webhook_url: str):
        self._webhook = webhook_url

    def send(self, recipient: str, content: str) -> None:
        print(f"[Slack #{recipient}]")
        print(f"  Content: {content}")


class PushNotificationSender:
    def send(self, recipient: str, content: str) -> None:
        print(f"[Push to device {recipient}]")
        print(f"  Content: {content}")


# Abstraction
class Notification(ABC):
    """What kind of notification to send."""

    def __init__(self, sender: MessageSender):
        self._sender = sender

    @abstractmethod
    def notify(self, recipient: str, **kwargs) -> None:
        pass


# Refined abstractions
class AlertNotification(Notification):
    """Urgent alert with priority."""

    def notify(self, recipient: str, message: str, priority: str = "high") -> None:
        content = f"[{priority.upper()} ALERT] {message}"
        self._sender.send(recipient, content)


class ReminderNotification(Notification):
    """Friendly reminder."""

    def notify(self, recipient: str, message: str, due_date: str = "") -> None:
        content = f"Reminder: {message}"
        if due_date:
            content += f" (Due: {due_date})"
        self._sender.send(recipient, content)


class PromotionalNotification(Notification):
    """Marketing promotion."""

    def notify(self, recipient: str, message: str, offer_code: str = "") -> None:
        content = f"Special Offer: {message}"
        if offer_code:
            content += f"\nUse code: {offer_code}"
        self._sender.send(recipient, content)


# Usage - can combine any notification type with any sender
email = EmailSender("smtp.example.com")
sms = SMSSender("api-key-123")
slack = SlackSender("https://hooks.slack.com/...")

# Alert via different channels
alert_email = AlertNotification(email)
alert_email.notify("user@example.com", message="Server is down!", priority="critical")

alert_sms = AlertNotification(sms)
alert_sms.notify("+1234567890", message="Server is down!", priority="critical")

# Promotion via email
promo = PromotionalNotification(email)
promo.notify("user@example.com", message="50% off today!", offer_code="SAVE50")

# Reminder via Slack
reminder = ReminderNotification(slack)
reminder.notify("general", message="Team meeting in 15 minutes")
```

### Renderer Bridge

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol


# Implementation: How to render
class Renderer(Protocol):
    def render_title(self, text: str) -> str: ...
    def render_paragraph(self, text: str) -> str: ...
    def render_list(self, items: list[str]) -> str: ...
    def render_link(self, text: str, url: str) -> str: ...


class HTMLRenderer:
    def render_title(self, text: str) -> str:
        return f"<h1>{text}</h1>"

    def render_paragraph(self, text: str) -> str:
        return f"<p>{text}</p>"

    def render_list(self, items: list[str]) -> str:
        li = "".join(f"<li>{item}</li>" for item in items)
        return f"<ul>{li}</ul>"

    def render_link(self, text: str, url: str) -> str:
        return f'<a href="{url}">{text}</a>'


class MarkdownRenderer:
    def render_title(self, text: str) -> str:
        return f"# {text}\n"

    def render_paragraph(self, text: str) -> str:
        return f"{text}\n\n"

    def render_list(self, items: list[str]) -> str:
        return "\n".join(f"- {item}" for item in items) + "\n"

    def render_link(self, text: str, url: str) -> str:
        return f"[{text}]({url})"


class PlainTextRenderer:
    def render_title(self, text: str) -> str:
        return f"{text}\n{'=' * len(text)}\n"

    def render_paragraph(self, text: str) -> str:
        return f"{text}\n\n"

    def render_list(self, items: list[str]) -> str:
        return "\n".join(f"* {item}" for item in items) + "\n"

    def render_link(self, text: str, url: str) -> str:
        return f"{text} ({url})"


# Abstraction: What to render
class Document(ABC):
    def __init__(self, renderer: Renderer):
        self._renderer = renderer

    @abstractmethod
    def render(self) -> str:
        pass


@dataclass
class Article(Document):
    title: str
    content: str
    tags: list[str]

    def __init__(self, renderer: Renderer, title: str, content: str, tags: list[str]):
        super().__init__(renderer)
        self.title = title
        self.content = content
        self.tags = tags

    def render(self) -> str:
        parts = [
            self._renderer.render_title(self.title),
            self._renderer.render_paragraph(self.content),
            self._renderer.render_list(self.tags),
        ]
        return "\n".join(parts)


@dataclass
class ProductPage(Document):
    name: str
    description: str
    features: list[str]
    buy_url: str

    def __init__(
        self,
        renderer: Renderer,
        name: str,
        description: str,
        features: list[str],
        buy_url: str,
    ):
        super().__init__(renderer)
        self.name = name
        self.description = description
        self.features = features
        self.buy_url = buy_url

    def render(self) -> str:
        parts = [
            self._renderer.render_title(self.name),
            self._renderer.render_paragraph(self.description),
            self._renderer.render_list(self.features),
            self._renderer.render_link("Buy Now", self.buy_url),
        ]
        return "\n".join(parts)


# Usage
html = HTMLRenderer()
markdown = MarkdownRenderer()

article = Article(html, "Python Tips", "Learn Python the right way.", ["python", "tips"])
print(article.render())

product = ProductPage(
    markdown,
    "Super Widget",
    "The best widget ever.",
    ["Fast", "Reliable", "Affordable"],
    "https://example.com/buy",
)
print(product.render())
```

---

## Composite

> Compose objects into tree structures and treat individual objects and compositions uniformly.

Use for hierarchical structures like file systems, menus, or organization charts.

### File System Composite

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


class FileSystemNode(ABC):
    """Component interface for file system items."""

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def size(self) -> int:
        pass

    @abstractmethod
    def display(self, indent: int = 0) -> str:
        pass


@dataclass
class File(FileSystemNode):
    """Leaf node - a file."""

    _name: str
    _size: int

    @property
    def name(self) -> str:
        return self._name

    def size(self) -> int:
        return self._size

    def display(self, indent: int = 0) -> str:
        return f"{'  ' * indent}📄 {self._name} ({self._size} bytes)"


@dataclass
class Directory(FileSystemNode):
    """Composite node - a directory containing files and subdirectories."""

    _name: str
    _children: list[FileSystemNode] = field(default_factory=list)

    @property
    def name(self) -> str:
        return self._name

    def size(self) -> int:
        # Recursively calculate total size
        return sum(child.size() for child in self._children)

    def display(self, indent: int = 0) -> str:
        lines = [f"{'  ' * indent}📁 {self._name}/"]
        for child in self._children:
            lines.append(child.display(indent + 1))
        return "\n".join(lines)

    def add(self, node: FileSystemNode) -> None:
        self._children.append(node)

    def remove(self, node: FileSystemNode) -> None:
        self._children.remove(node)

    def find(self, name: str) -> FileSystemNode | None:
        """Find a node by name recursively."""
        for child in self._children:
            if child.name == name:
                return child
            if isinstance(child, Directory):
                found = child.find(name)
                if found:
                    return found
        return None


# Build a file system tree
root = Directory("project")
root.add(File("README.md", 1024))
root.add(File("setup.py", 512))

src = Directory("src")
src.add(File("main.py", 2048))
src.add(File("utils.py", 1536))

models = Directory("models")
models.add(File("user.py", 768))
models.add(File("product.py", 896))
src.add(models)

root.add(src)

tests = Directory("tests")
tests.add(File("test_main.py", 1024))
tests.add(File("test_utils.py", 768))
root.add(tests)

# Uniform interface for files and directories
print(root.display())
print(f"\nTotal size: {root.size()} bytes")

# Find a node
user_model = root.find("user.py")
if user_model:
    print(f"\nFound: {user_model.display()}")
```

### Menu Composite

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Callable


class MenuComponent(ABC):
    """Component interface for menu items."""

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def display(self, indent: int = 0) -> str:
        pass

    def is_enabled(self) -> bool:
        return True


@dataclass
class MenuItem(MenuComponent):
    """Leaf - clickable menu item."""

    _name: str
    action: Callable[[], None]
    shortcut: str = ""
    _enabled: bool = True

    @property
    def name(self) -> str:
        return self._name

    def display(self, indent: int = 0) -> str:
        prefix = "  " * indent
        enabled = "" if self._enabled else " (disabled)"
        shortcut = f" [{self.shortcut}]" if self.shortcut else ""
        return f"{prefix}• {self._name}{shortcut}{enabled}"

    def is_enabled(self) -> bool:
        return self._enabled

    def click(self) -> None:
        if self._enabled:
            self.action()


@dataclass
class Menu(MenuComponent):
    """Composite - menu containing items and submenus."""

    _name: str
    _items: list[MenuComponent] = field(default_factory=list)

    @property
    def name(self) -> str:
        return self._name

    def display(self, indent: int = 0) -> str:
        prefix = "  " * indent
        lines = [f"{prefix}▼ {self._name}"]
        for item in self._items:
            lines.append(item.display(indent + 1))
        return "\n".join(lines)

    def add(self, item: MenuComponent) -> None:
        self._items.append(item)

    def remove(self, item: MenuComponent) -> None:
        self._items.remove(item)

    def get_item(self, name: str) -> MenuComponent | None:
        for item in self._items:
            if item.name == name:
                return item
            if isinstance(item, Menu):
                found = item.get_item(name)
                if found:
                    return found
        return None


# Build menu structure
def new_file():
    print("Creating new file...")

def open_file():
    print("Opening file...")

def save_file():
    print("Saving file...")

def cut():
    print("Cut")

def copy():
    print("Copy")

def paste():
    print("Paste")


# File menu
file_menu = Menu("File")
file_menu.add(MenuItem("New", new_file, "Ctrl+N"))
file_menu.add(MenuItem("Open", open_file, "Ctrl+O"))
file_menu.add(MenuItem("Save", save_file, "Ctrl+S"))

# Edit menu with submenu
edit_menu = Menu("Edit")
edit_menu.add(MenuItem("Cut", cut, "Ctrl+X"))
edit_menu.add(MenuItem("Copy", copy, "Ctrl+C"))
edit_menu.add(MenuItem("Paste", paste, "Ctrl+V"))

# Main menu bar
menu_bar = Menu("Menu Bar")
menu_bar.add(file_menu)
menu_bar.add(edit_menu)

print(menu_bar.display())

# Click an item
save_item = menu_bar.get_item("Save")
if save_item and isinstance(save_item, MenuItem):
    save_item.click()
```

---

## Decorator

> Attach additional responsibilities to an object dynamically.

Python has built-in decorator syntax (`@decorator`) that's perfect for this pattern.

### Function Decorators

```python
import functools
import time
import logging
from typing import Callable, TypeVar, ParamSpec

P = ParamSpec("P")
R = TypeVar("R")


def timer(func: Callable[P, R]) -> Callable[P, R]:
    """Measure and log execution time."""
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper


def retry(max_attempts: int = 3, delay: float = 1.0):
    """Retry function on failure."""
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            last_error = None
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_attempts - 1:
                        print(f"Attempt {attempt + 1} failed, retrying...")
                        time.sleep(delay)
            raise last_error
        return wrapper
    return decorator


def log_calls(level: int = logging.INFO):
    """Log function calls with arguments and results."""
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        logger = logging.getLogger(func.__module__)

        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            logger.log(level, f"Calling {func.__name__}({args}, {kwargs})")
            result = func(*args, **kwargs)
            logger.log(level, f"{func.__name__} returned {result}")
            return result
        return wrapper
    return decorator


def validate_args(**validators):
    """Validate function arguments."""
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            # Get function signature
            import inspect
            sig = inspect.signature(func)
            bound = sig.bind(*args, **kwargs)
            bound.apply_defaults()

            # Validate each argument
            for arg_name, validator in validators.items():
                if arg_name in bound.arguments:
                    value = bound.arguments[arg_name]
                    if not validator(value):
                        raise ValueError(f"Invalid value for {arg_name}: {value}")

            return func(*args, **kwargs)
        return wrapper
    return decorator


# Usage with stacking
@timer
@retry(max_attempts=3)
@validate_args(x=lambda v: v > 0)
def fetch_data(x: int) -> dict:
    """Fetch data from API."""
    if x < 5:
        raise ConnectionError("Random failure")
    return {"data": x * 2}


# Decorators apply bottom to top:
# validate_args checks x > 0
# retry retries on failure
# timer measures total time including retries
result = fetch_data(10)
```

### Class-Based Decorator (The Pattern)

```python
from abc import ABC, abstractmethod
from typing import Protocol


# Component interface
class DataSource(Protocol):
    def read(self) -> str: ...
    def write(self, data: str) -> None: ...


# Concrete component
class FileDataSource:
    def __init__(self, filename: str):
        self._filename = filename

    def read(self) -> str:
        with open(self._filename, "r") as f:
            return f.read()

    def write(self, data: str) -> None:
        with open(self._filename, "w") as f:
            f.write(data)


# Base decorator
class DataSourceDecorator(ABC):
    def __init__(self, source: DataSource):
        self._wrapped = source

    @abstractmethod
    def read(self) -> str:
        pass

    @abstractmethod
    def write(self, data: str) -> None:
        pass


# Concrete decorators
class EncryptionDecorator(DataSourceDecorator):
    """Adds encryption/decryption."""

    def __init__(self, source: DataSource, key: str):
        super().__init__(source)
        self._key = key

    def read(self) -> str:
        data = self._wrapped.read()
        return self._decrypt(data)

    def write(self, data: str) -> None:
        encrypted = self._encrypt(data)
        self._wrapped.write(encrypted)

    def _encrypt(self, data: str) -> str:
        # Simple XOR encryption for demo
        return "".join(chr(ord(c) ^ ord(self._key[i % len(self._key)]))
                      for i, c in enumerate(data))

    def _decrypt(self, data: str) -> str:
        return self._encrypt(data)  # XOR is symmetric


class CompressionDecorator(DataSourceDecorator):
    """Adds compression/decompression."""

    def read(self) -> str:
        import gzip
        import base64
        data = self._wrapped.read()
        compressed = base64.b64decode(data)
        return gzip.decompress(compressed).decode()

    def write(self, data: str) -> None:
        import gzip
        import base64
        compressed = gzip.compress(data.encode())
        self._wrapped.write(base64.b64encode(compressed).decode())


class LoggingDecorator(DataSourceDecorator):
    """Adds logging of operations."""

    def read(self) -> str:
        print(f"Reading from data source...")
        data = self._wrapped.read()
        print(f"Read {len(data)} characters")
        return data

    def write(self, data: str) -> None:
        print(f"Writing {len(data)} characters...")
        self._wrapped.write(data)
        print("Write complete")


# Stack decorators
source = FileDataSource("data.txt")
source = LoggingDecorator(source)
source = CompressionDecorator(source)
source = EncryptionDecorator(source, "secret")

# Writes: encrypt -> compress -> log -> file
source.write("Hello, World!")

# Reads: file -> log -> decompress -> decrypt
data = source.read()
```

### HTTP Middleware Decorator

```python
from dataclasses import dataclass
from typing import Callable, Protocol


@dataclass
class Request:
    method: str
    path: str
    headers: dict[str, str]
    body: str = ""


@dataclass
class Response:
    status: int
    headers: dict[str, str]
    body: str


Handler = Callable[[Request], Response]
Middleware = Callable[[Handler], Handler]


def logging_middleware(handler: Handler) -> Handler:
    """Log all requests and responses."""
    def wrapper(request: Request) -> Response:
        print(f"→ {request.method} {request.path}")
        response = handler(request)
        print(f"← {response.status}")
        return response
    return wrapper


def auth_middleware(api_key: str) -> Middleware:
    """Require API key authentication."""
    def middleware(handler: Handler) -> Handler:
        def wrapper(request: Request) -> Response:
            if request.headers.get("Authorization") != f"Bearer {api_key}":
                return Response(401, {}, "Unauthorized")
            return handler(request)
        return wrapper
    return middleware


def cors_middleware(allowed_origins: list[str]) -> Middleware:
    """Add CORS headers."""
    def middleware(handler: Handler) -> Handler:
        def wrapper(request: Request) -> Response:
            response = handler(request)
            origin = request.headers.get("Origin", "")
            if origin in allowed_origins or "*" in allowed_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
            return response
        return wrapper
    return middleware


def rate_limit_middleware(max_requests: int, window: int) -> Middleware:
    """Simple rate limiting."""
    from collections import defaultdict
    import time

    request_counts: dict[str, list[float]] = defaultdict(list)

    def middleware(handler: Handler) -> Handler:
        def wrapper(request: Request) -> Response:
            # Simple IP-based rate limiting
            ip = request.headers.get("X-Forwarded-For", "unknown")
            now = time.time()

            # Clean old requests
            request_counts[ip] = [t for t in request_counts[ip] if now - t < window]

            if len(request_counts[ip]) >= max_requests:
                return Response(429, {}, "Too Many Requests")

            request_counts[ip].append(now)
            return handler(request)
        return wrapper
    return middleware


# Compose middleware
def create_handler() -> Handler:
    def handler(request: Request) -> Response:
        return Response(200, {"Content-Type": "application/json"}, '{"status": "ok"}')
    return handler


# Stack middleware (applied inner to outer)
handler = create_handler()
handler = rate_limit_middleware(100, 60)(handler)
handler = auth_middleware("secret-key")(handler)
handler = cors_middleware(["https://example.com"])(handler)
handler = logging_middleware(handler)

# Test
request = Request(
    method="GET",
    path="/api/data",
    headers={"Authorization": "Bearer secret-key", "Origin": "https://example.com"},
)
response = handler(request)
print(response)
```

---

## Facade

> Provide a unified interface to a set of interfaces in a subsystem.

Use to simplify complex APIs or libraries.

### Video Converter Facade

```python
class VideoFile:
    def __init__(self, filename: str):
        self.filename = filename
        self.codec = self._detect_codec()

    def _detect_codec(self) -> str:
        if self.filename.endswith(".mp4"):
            return "h264"
        elif self.filename.endswith(".avi"):
            return "mpeg4"
        return "unknown"


class CodecFactory:
    @staticmethod
    def extract(file: VideoFile) -> "Codec":
        if file.codec == "h264":
            return H264Codec()
        elif file.codec == "mpeg4":
            return MPEG4Codec()
        raise ValueError(f"Unknown codec: {file.codec}")


class Codec:
    def decode(self, data: bytes) -> bytes:
        raise NotImplementedError


class H264Codec(Codec):
    def decode(self, data: bytes) -> bytes:
        print("Decoding H264...")
        return data


class MPEG4Codec(Codec):
    def decode(self, data: bytes) -> bytes:
        print("Decoding MPEG4...")
        return data


class AudioMixer:
    def fix_audio(self, data: bytes) -> bytes:
        print("Mixing audio...")
        return data


class BitrateReader:
    @staticmethod
    def read(file: VideoFile) -> bytes:
        print(f"Reading {file.filename}...")
        return b"video_data"

    @staticmethod
    def convert(data: bytes, codec: Codec) -> bytes:
        print("Converting bitrate...")
        return codec.decode(data)


# Facade - simple interface to complex subsystem
class VideoConverter:
    """
    Facade that provides simple video conversion.

    Hides complexity of:
    - Codec detection and extraction
    - Bitrate reading and conversion
    - Audio mixing
    """

    def convert(self, filename: str, output_format: str) -> str:
        print(f"Converting {filename} to {output_format}...")

        # Complex subsystem operations hidden behind simple interface
        file = VideoFile(filename)
        codec = CodecFactory.extract(file)
        data = BitrateReader.read(file)
        converted = BitrateReader.convert(data, codec)

        mixer = AudioMixer()
        result = mixer.fix_audio(converted)

        output_name = filename.rsplit(".", 1)[0] + f".{output_format}"
        print(f"Saving to {output_name}")
        return output_name


# Client code - simple!
converter = VideoConverter()
output = converter.convert("movie.avi", "mp4")
```

### API Client Facade

```python
from dataclasses import dataclass
from typing import Protocol
import json


# Complex subsystems
class AuthService:
    def __init__(self, api_key: str):
        self._api_key = api_key
        self._token = None

    def authenticate(self) -> str:
        print("Authenticating...")
        self._token = "auth_token_123"
        return self._token

    def get_token(self) -> str:
        if not self._token:
            self.authenticate()
        return self._token


class HTTPClient:
    def get(self, url: str, headers: dict) -> dict:
        print(f"GET {url}")
        return {"status": "ok"}

    def post(self, url: str, headers: dict, data: dict) -> dict:
        print(f"POST {url}")
        return {"id": "123", **data}


class ResponseParser:
    def parse_user(self, data: dict) -> "User":
        return User(**data)

    def parse_users(self, data: list) -> list["User"]:
        return [User(**u) for u in data]


class CacheService:
    def __init__(self):
        self._cache = {}

    def get(self, key: str):
        return self._cache.get(key)

    def set(self, key: str, value, ttl: int = 300):
        self._cache[key] = value


class RateLimiter:
    def __init__(self, max_requests: int = 100):
        self._count = 0
        self._max = max_requests

    def check(self) -> bool:
        self._count += 1
        return self._count <= self._max


@dataclass
class User:
    id: str = ""
    name: str = ""
    email: str = ""


# Facade
class UserAPIClient:
    """
    Simple interface to user management API.

    Handles:
    - Authentication
    - Request construction
    - Response parsing
    - Caching
    - Rate limiting
    """

    def __init__(self, base_url: str, api_key: str):
        self._base_url = base_url
        self._auth = AuthService(api_key)
        self._http = HTTPClient()
        self._parser = ResponseParser()
        self._cache = CacheService()
        self._limiter = RateLimiter()

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._auth.get_token()}",
            "Content-Type": "application/json",
        }

    def get_user(self, user_id: str) -> User:
        """Get a user by ID."""
        # Check cache
        cached = self._cache.get(f"user:{user_id}")
        if cached:
            return cached

        # Check rate limit
        if not self._limiter.check():
            raise Exception("Rate limit exceeded")

        # Make request
        response = self._http.get(
            f"{self._base_url}/users/{user_id}",
            self._headers()
        )

        # Parse and cache
        user = self._parser.parse_user(response)
        self._cache.set(f"user:{user_id}", user)
        return user

    def create_user(self, name: str, email: str) -> User:
        """Create a new user."""
        if not self._limiter.check():
            raise Exception("Rate limit exceeded")

        response = self._http.post(
            f"{self._base_url}/users",
            self._headers(),
            {"name": name, "email": email}
        )

        return self._parser.parse_user(response)

    def search_users(self, query: str) -> list[User]:
        """Search for users."""
        if not self._limiter.check():
            raise Exception("Rate limit exceeded")

        response = self._http.get(
            f"{self._base_url}/users/search?q={query}",
            self._headers()
        )

        return self._parser.parse_users(response.get("users", []))


# Simple client usage
api = UserAPIClient("https://api.example.com", "my-api-key")
user = api.get_user("123")
new_user = api.create_user("Alice", "alice@example.com")
```

---

## Flyweight

> Use sharing to support large numbers of fine-grained objects efficiently.

Use when you have many similar objects and memory is a concern.

### Text Formatting Flyweight

```python
from dataclasses import dataclass
from typing import ClassVar


@dataclass(frozen=True)
class CharacterStyle:
    """
    Flyweight - shared character formatting.

    This is the intrinsic (shared) state.
    """
    font: str
    size: int
    bold: bool
    italic: bool


class StyleFactory:
    """Factory that manages shared style instances."""

    _styles: ClassVar[dict[tuple, CharacterStyle]] = {}

    @classmethod
    def get_style(
        cls,
        font: str = "Arial",
        size: int = 12,
        bold: bool = False,
        italic: bool = False,
    ) -> CharacterStyle:
        key = (font, size, bold, italic)
        if key not in cls._styles:
            cls._styles[key] = CharacterStyle(font, size, bold, italic)
            print(f"Created new style: {key}")
        return cls._styles[key]

    @classmethod
    def style_count(cls) -> int:
        return len(cls._styles)


@dataclass
class Character:
    """
    Character with flyweight style.

    - char: extrinsic state (unique per character)
    - position: extrinsic state (unique per character)
    - style: flyweight (shared among many characters)
    """
    char: str
    position: int
    style: CharacterStyle

    def render(self) -> str:
        prefix = ""
        if self.style.bold:
            prefix += "**"
        if self.style.italic:
            prefix += "_"
        return f"{prefix}{self.char}{prefix[::-1]}"


class TextDocument:
    """Document using flyweight characters."""

    def __init__(self):
        self._characters: list[Character] = []

    def add_character(
        self,
        char: str,
        font: str = "Arial",
        size: int = 12,
        bold: bool = False,
        italic: bool = False,
    ) -> None:
        # Get shared style (flyweight)
        style = StyleFactory.get_style(font, size, bold, italic)
        position = len(self._characters)
        self._characters.append(Character(char, position, style))

    def render(self) -> str:
        return "".join(c.render() for c in self._characters)


# Usage
doc = TextDocument()

# Add normal text
for char in "Hello, ":
    doc.add_character(char)

# Add bold text
for char in "World":
    doc.add_character(char, bold=True)

# Add italic text
for char in "!":
    doc.add_character(char, italic=True)

print(doc.render())
print(f"Unique styles created: {StyleFactory.style_count()}")
# Only 3 styles created despite many characters
```

### Game Object Flyweight

```python
from dataclasses import dataclass
from typing import ClassVar


@dataclass(frozen=True)
class TreeType:
    """
    Flyweight - shared tree appearance.

    Intrinsic state: texture, color, mesh (shared by all trees of this type)
    """
    name: str
    texture: str  # Would be actual texture data in real code
    color: str
    mesh: str     # Would be actual mesh data in real code

    def render(self, x: int, y: int) -> str:
        return f"{self.name} at ({x}, {y}) [{self.color}]"


class TreeFactory:
    """Factory for flyweight tree types."""

    _types: ClassVar[dict[str, TreeType]] = {}

    @classmethod
    def get_tree_type(cls, name: str, texture: str, color: str, mesh: str) -> TreeType:
        key = name
        if key not in cls._types:
            cls._types[key] = TreeType(name, texture, color, mesh)
            print(f"Created tree type: {name}")
        return cls._types[key]

    @classmethod
    def type_count(cls) -> int:
        return len(cls._types)


@dataclass
class Tree:
    """
    Tree instance with flyweight type.

    Extrinsic state: x, y (unique per tree)
    Intrinsic state: type (shared flyweight)
    """
    x: int
    y: int
    type: TreeType

    __slots__ = ("x", "y", "type")  # Memory optimization

    def render(self) -> str:
        return self.type.render(self.x, self.y)


class Forest:
    """Forest containing many trees."""

    def __init__(self):
        self._trees: list[Tree] = []

    def plant_tree(
        self,
        x: int,
        y: int,
        name: str,
        texture: str,
        color: str,
        mesh: str,
    ) -> None:
        # Get shared type (flyweight)
        tree_type = TreeFactory.get_tree_type(name, texture, color, mesh)
        self._trees.append(Tree(x, y, tree_type))

    def render(self) -> None:
        for tree in self._trees:
            print(tree.render())

    @property
    def tree_count(self) -> int:
        return len(self._trees)


# Create forest with many trees
import random

forest = Forest()

# Plant 1000 trees of 3 types
tree_data = [
    ("Oak", "oak.png", "green", "oak_mesh"),
    ("Pine", "pine.png", "dark_green", "pine_mesh"),
    ("Birch", "birch.png", "light_green", "birch_mesh"),
]

for _ in range(1000):
    name, texture, color, mesh = random.choice(tree_data)
    x, y = random.randint(0, 1000), random.randint(0, 1000)
    forest.plant_tree(x, y, name, texture, color, mesh)

print(f"Trees planted: {forest.tree_count}")
print(f"Tree types created: {TreeFactory.type_count()}")
# 1000 trees, only 3 TreeType objects!
```

### Using `__slots__` for Memory Efficiency

```python
import sys

class RegularPoint:
    """Regular class without __slots__."""
    def __init__(self, x: float, y: float, z: float):
        self.x = x
        self.y = y
        self.z = z


class SlottedPoint:
    """Memory-efficient class with __slots__."""
    __slots__ = ("x", "y", "z")

    def __init__(self, x: float, y: float, z: float):
        self.x = x
        self.y = y
        self.z = z


# Compare memory usage
regular_points = [RegularPoint(i, i, i) for i in range(10000)]
slotted_points = [SlottedPoint(i, i, i) for i in range(10000)]

print(f"Regular point size: {sys.getsizeof(regular_points[0])} bytes")
print(f"Slotted point size: {sys.getsizeof(slotted_points[0])} bytes")
# Slotted is typically 40-50% smaller

# Regular class can add attributes
regular_points[0].extra = "data"  # Works

# Slotted class cannot
try:
    slotted_points[0].extra = "data"  # AttributeError!
except AttributeError as e:
    print(f"Cannot add attribute: {e}")
```

---

## Proxy

> Provide a surrogate or placeholder for another object to control access to it.

Use for lazy loading, access control, logging, or caching.

### Lazy Loading Proxy

```python
from typing import Protocol


class Image(Protocol):
    def display(self) -> str: ...
    def get_dimensions(self) -> tuple[int, int]: ...


class RealImage:
    """Heavy object that's expensive to create."""

    def __init__(self, filename: str):
        self._filename = filename
        self._data: bytes | None = None
        self._load()

    def _load(self) -> None:
        """Simulate expensive image loading."""
        print(f"Loading image from disk: {self._filename}")
        import time
        time.sleep(1)  # Simulate slow I/O
        self._data = b"image_data"

    def display(self) -> str:
        return f"Displaying {self._filename}"

    def get_dimensions(self) -> tuple[int, int]:
        return (1920, 1080)


class LazyImageProxy:
    """
    Proxy that defers image loading until needed.

    Virtual proxy - creates real object only when needed.
    """

    def __init__(self, filename: str):
        self._filename = filename
        self._real_image: RealImage | None = None

    def _get_image(self) -> RealImage:
        if self._real_image is None:
            self._real_image = RealImage(self._filename)
        return self._real_image

    def display(self) -> str:
        # Load only when displaying
        return self._get_image().display()

    def get_dimensions(self) -> tuple[int, int]:
        # Can return cached/default dimensions without loading
        # Or load if needed:
        return self._get_image().get_dimensions()


# Without proxy - loads immediately
# image = RealImage("photo.jpg")  # 1 second wait

# With proxy - loads only when needed
proxy = LazyImageProxy("photo.jpg")  # Instant
print("Proxy created, image not loaded yet")

# Image loads on first access
print(proxy.display())  # Now it loads
```

### Caching Proxy

```python
from functools import lru_cache
from typing import Protocol
import time


class DataService(Protocol):
    def fetch(self, key: str) -> dict: ...


class SlowDataService:
    """Service that's slow to fetch data."""

    def fetch(self, key: str) -> dict:
        print(f"Fetching {key} from database...")
        time.sleep(0.5)  # Simulate slow query
        return {"key": key, "value": f"data_{key}"}


class CachingProxy:
    """
    Proxy that caches results from the real service.

    Caching proxy - stores results for repeated requests.
    """

    def __init__(self, service: DataService, ttl: int = 60):
        self._service = service
        self._cache: dict[str, tuple[dict, float]] = {}
        self._ttl = ttl

    def fetch(self, key: str) -> dict:
        # Check cache
        if key in self._cache:
            data, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl:
                print(f"Cache hit for {key}")
                return data
            else:
                print(f"Cache expired for {key}")
                del self._cache[key]

        # Fetch from service
        print(f"Cache miss for {key}")
        data = self._service.fetch(key)
        self._cache[key] = (data, time.time())
        return data

    def invalidate(self, key: str) -> None:
        """Invalidate cache entry."""
        self._cache.pop(key, None)

    def clear(self) -> None:
        """Clear entire cache."""
        self._cache.clear()


# Usage
service = SlowDataService()
proxy = CachingProxy(service, ttl=30)

# First fetch - slow
data1 = proxy.fetch("user_123")  # Cache miss, 0.5s

# Second fetch - fast
data2 = proxy.fetch("user_123")  # Cache hit, instant

# Different key - slow again
data3 = proxy.fetch("user_456")  # Cache miss, 0.5s
```

### Access Control Proxy

```python
from dataclasses import dataclass
from enum import Enum
from typing import Protocol


class Permission(Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"


@dataclass
class User:
    id: str
    name: str
    permissions: set[Permission]


class Document(Protocol):
    def read(self) -> str: ...
    def write(self, content: str) -> None: ...
    def delete(self) -> None: ...


class RealDocument:
    """Real document with no access control."""

    def __init__(self, filename: str):
        self._filename = filename
        self._content = ""

    def read(self) -> str:
        return f"Content of {self._filename}: {self._content}"

    def write(self, content: str) -> None:
        self._content = content
        print(f"Written to {self._filename}")

    def delete(self) -> None:
        print(f"Deleted {self._filename}")


class ProtectedDocumentProxy:
    """
    Proxy that controls access based on user permissions.

    Protection proxy - checks access rights before operation.
    """

    def __init__(self, document: RealDocument, user: User):
        self._document = document
        self._user = user

    def _check_permission(self, required: Permission) -> None:
        if required not in self._user.permissions:
            raise PermissionError(
                f"User {self._user.name} lacks {required.value} permission"
            )

    def read(self) -> str:
        self._check_permission(Permission.READ)
        print(f"[Audit] {self._user.name} read document")
        return self._document.read()

    def write(self, content: str) -> None:
        self._check_permission(Permission.WRITE)
        print(f"[Audit] {self._user.name} wrote to document")
        self._document.write(content)

    def delete(self) -> None:
        self._check_permission(Permission.DELETE)
        print(f"[Audit] {self._user.name} deleted document")
        self._document.delete()


# Usage
admin = User("1", "Alice", {Permission.READ, Permission.WRITE, Permission.DELETE})
reader = User("2", "Bob", {Permission.READ})

document = RealDocument("secret.txt")

# Admin can do everything
admin_proxy = ProtectedDocumentProxy(document, admin)
admin_proxy.write("Secret content")
admin_proxy.read()

# Reader can only read
reader_proxy = ProtectedDocumentProxy(document, reader)
reader_proxy.read()  # OK

try:
    reader_proxy.write("Hacked!")  # PermissionError
except PermissionError as e:
    print(f"Access denied: {e}")
```

### Using `__getattr__` for Generic Proxy

```python
import time
from typing import Any


class LoggingProxy:
    """
    Generic proxy that logs all method calls.

    Uses __getattr__ to intercept any attribute access.
    """

    def __init__(self, target: Any, name: str = ""):
        self._target = target
        self._name = name or type(target).__name__

    def __getattr__(self, name: str) -> Any:
        attr = getattr(self._target, name)

        if callable(attr):
            def wrapper(*args, **kwargs):
                print(f"[{self._name}] Calling {name}({args}, {kwargs})")
                start = time.perf_counter()
                result = attr(*args, **kwargs)
                elapsed = time.perf_counter() - start
                print(f"[{self._name}] {name} returned {result} in {elapsed:.4f}s")
                return result
            return wrapper

        print(f"[{self._name}] Accessing {name} = {attr}")
        return attr


# Works with any object
class Calculator:
    def add(self, a: int, b: int) -> int:
        return a + b

    def multiply(self, a: int, b: int) -> int:
        return a * b


calc = Calculator()
proxy = LoggingProxy(calc, "Calculator")

proxy.add(2, 3)      # Logged
proxy.multiply(4, 5)  # Logged


# Works with built-in types too
list_proxy = LoggingProxy([1, 2, 3], "MyList")
list_proxy.append(4)  # Logged
list_proxy.pop()      # Logged
```

---

## Interview Questions

### Q1: What's the difference between Adapter and Facade?

**Answer**:

| Aspect | Adapter | Facade |
|--------|---------|--------|
| **Purpose** | Make incompatible interfaces work together | Simplify a complex subsystem |
| **Interfaces** | Converts one interface to another | Provides a new, simpler interface |
| **Scope** | Usually wraps one class | Wraps multiple classes/subsystem |
| **Client expectation** | Client expects a specific interface | Client wants simpler interaction |

```python
# Adapter - converts interface
class OldAPI:
    def get_data_v1(self) -> str: ...

class NewAPIAdapter:
    def __init__(self, old: OldAPI):
        self._old = old

    def fetch(self) -> str:  # New interface
        return self._old.get_data_v1()  # Calls old interface


# Facade - simplifies
class Facade:
    def __init__(self):
        self._auth = AuthSystem()
        self._db = Database()
        self._cache = Cache()

    def get_user(self, id: str) -> User:
        # Orchestrates multiple systems
        if cached := self._cache.get(id):
            return cached
        self._auth.verify_token()
        user = self._db.query(id)
        self._cache.set(id, user)
        return user
```

### Q2: When would you use Decorator pattern vs Python's decorator syntax?

**Answer**:

**Python decorator syntax (`@decorator`)** - for:
- Adding cross-cutting concerns to functions (logging, timing, auth)
- Wrapping at definition time
- Clean, readable syntax

**Decorator pattern (class-based)** - for:
- Adding behavior to objects at runtime
- Multiple decorators that can be stacked/removed dynamically
- When decorators need state

```python
# Python decorator - wraps function at definition
@retry(3)
@log_calls
def fetch_data(): ...

# Decorator pattern - wraps object at runtime
source = FileDataSource("data.txt")
source = CompressionDecorator(source)  # Can be conditional
if encrypt:
    source = EncryptionDecorator(source)  # Dynamic decision
```

### Q3: How does the Composite pattern help with tree structures?

**Answer**: Composite provides a **uniform interface** for both individual objects (leaves) and collections (composites). This lets client code treat them identically.

**Benefits**:
- Recursive operations are natural (size, display, search)
- Client code doesn't need type checking
- Easy to add new component types

```python
class Component(ABC):
    @abstractmethod
    def operation(self) -> int: ...

class Leaf(Component):
    def operation(self) -> int:
        return 1

class Composite(Component):
    def __init__(self):
        self._children: list[Component] = []

    def operation(self) -> int:
        # Uniform interface - works for leaves and composites
        return sum(child.operation() for child in self._children)

# Client code treats both uniformly
def process(component: Component) -> int:
    return component.operation()  # Works for any component
```

### Q4: What are the different types of Proxy patterns?

**Answer**:

1. **Virtual Proxy** - Lazy loading, creates expensive object on demand
2. **Protection Proxy** - Access control, checks permissions
3. **Remote Proxy** - Represents object in different address space
4. **Caching Proxy** - Stores results of expensive operations
5. **Smart Reference** - Reference counting, logging, locking

```python
# Virtual Proxy - lazy loading
class LazyImage:
    def display(self):
        if not self._loaded:
            self._load()  # Load on first access

# Protection Proxy - access control
class SecureDocument:
    def read(self):
        if not self._user.can_read:
            raise PermissionError()
        return self._doc.read()

# Caching Proxy
class CachedAPI:
    def fetch(self, key):
        if key in self._cache:
            return self._cache[key]
        result = self._api.fetch(key)
        self._cache[key] = result
        return result
```

### Q5: How does Flyweight reduce memory usage?

**Answer**: Flyweight separates **intrinsic state** (shared, immutable) from **extrinsic state** (unique per instance).

```python
# Without Flyweight - each tree stores everything
class Tree:
    def __init__(self, x, y, texture, mesh, color):
        self.x = x           # Unique
        self.y = y           # Unique
        self.texture = texture  # Same for all oaks
        self.mesh = mesh        # Same for all oaks
        self.color = color      # Same for all oaks

# 1000 oak trees = 1000 copies of texture, mesh, color

# With Flyweight - shared intrinsic state
class TreeType:  # Flyweight (intrinsic)
    def __init__(self, texture, mesh, color):
        self.texture = texture
        self.mesh = mesh
        self.color = color

class Tree:  # Extrinsic state only
    __slots__ = ("x", "y", "type")
    def __init__(self, x, y, tree_type):
        self.x = x
        self.y = y
        self.type = tree_type  # Reference to shared flyweight

# 1000 oak trees = 1 TreeType + 1000 small Tree objects
```

Memory savings: If TreeType is 1MB and Tree is 24 bytes:
- Without Flyweight: 1000 trees × 1MB = 1GB
- With Flyweight: 1 TreeType (1MB) + 1000 × 24 bytes = ~1MB

---

## Quick Reference

### Pattern Selection

| Need | Pattern |
|------|---------|
| Convert interface | Adapter |
| Decouple abstraction/implementation | Bridge |
| Tree structures | Composite |
| Add behavior dynamically | Decorator |
| Simplify complex API | Facade |
| Share common state | Flyweight |
| Control access | Proxy |

### Python Idioms for Structural Patterns

| Pattern | Python Idiom |
|---------|--------------|
| Adapter | `__getattr__` for dynamic forwarding |
| Decorator | `@decorator` syntax, `functools.wraps` |
| Composite | Recursive methods, shared Protocol |
| Proxy | `__getattr__` for transparent forwarding |
| Flyweight | `__slots__`, `@dataclass(frozen=True)` |

### Common Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Adapter that changes behavior | Not just interface conversion | Adapter should only convert interface |
| Deep composite hierarchies | Hard to navigate | Limit depth, consider flat alternatives |
| Decorator not preserving interface | Breaks substitutability | Use `functools.wraps`, same signature |
| Flyweight with mutable state | Shared mutation bugs | Make flyweight immutable |
| Proxy that's not transparent | Client needs to know about proxy | Match interface exactly |

---

**Next**: [12-design-patterns-behavioral.md](12-design-patterns-behavioral.md) — Behavioral Design Patterns
