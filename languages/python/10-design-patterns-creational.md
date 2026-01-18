# Python Creational Design Patterns

> Patterns for object creation that increase flexibility and reuse

Creational patterns deal with object creation mechanisms, trying to create objects in a manner suitable to the situation. Python's dynamic nature, first-class functions, and duck typing make many of these patterns simpler than in statically-typed languages — and some are built right into the language.

**Reading time**: 60-75 minutes

---

## Table of Contents

1. [Pattern Selection Guide](#pattern-selection-guide)
2. [Singleton](#singleton)
3. [Factory Method](#factory-method)
4. [Abstract Factory](#abstract-factory)
5. [Builder](#builder)
6. [Prototype](#prototype)
7. [Object Pool](#object-pool)
8. [Python-Specific Patterns](#python-specific-patterns)
9. [Interview Questions](#interview-questions)
10. [Quick Reference](#quick-reference)

---

## Pattern Selection Guide

### When to Use Each Pattern

```
Need only one instance?
└── Yes → Singleton (or just use a module)

Creating objects based on input/config?
└── Yes → Factory Method

Creating families of related objects?
└── Yes → Abstract Factory

Complex object with many optional parameters?
└── Yes → Builder

Creating objects by copying existing ones?
└── Yes → Prototype

Expensive object creation + reuse?
└── Yes → Object Pool
```

### Quick Decision Table

| Scenario | Pattern | Python Approach |
|----------|---------|-----------------|
| Global config/state | Singleton | Module-level variables |
| Parse format → object | Factory | Dict mapping or factory function |
| Database-specific objects | Abstract Factory | Factory class per database |
| Complex configuration | Builder | `@dataclass` with defaults or fluent API |
| Expensive to create | Prototype | `copy.deepcopy()` |
| Limited resources (connections) | Object Pool | `queue.Queue` + context manager |

---

## Singleton

> Ensure a class has only one instance and provide a global point of access to it.

Python has several ways to implement Singleton, but often the simplest approach is using a module — Python modules are natural singletons.

### Module-Level Singleton (Python's Natural Singleton)

```python
# config.py - The module IS the singleton
"""Application configuration singleton."""

import os
from dataclasses import dataclass

@dataclass
class Config:
    database_url: str
    api_key: str
    debug: bool


# Module-level instance - created once on first import
_config: Config | None = None


def get_config() -> Config:
    """Get the singleton config instance."""
    global _config
    if _config is None:
        _config = Config(
            database_url=os.environ.get("DATABASE_URL", "sqlite:///app.db"),
            api_key=os.environ["API_KEY"],
            debug=os.environ.get("DEBUG", "false").lower() == "true",
        )
    return _config


def reset_config() -> None:
    """Reset config (useful for testing)."""
    global _config
    _config = None


# Usage in other modules:
# from config import get_config
# config = get_config()
# print(config.database_url)
```

### Metaclass Singleton

```python
class SingletonMeta(type):
    """Metaclass that creates Singleton instances."""

    _instances: dict[type, object] = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            instance = super().__call__(*args, **kwargs)
            cls._instances[cls] = instance
        return cls._instances[cls]


class Database(metaclass=SingletonMeta):
    """Database connection singleton."""

    def __init__(self, url: str):
        self.url = url
        self._connection = None
        print(f"Connecting to {url}")

    def query(self, sql: str) -> list:
        # Execute query
        return []


# Usage
db1 = Database("postgresql://localhost/mydb")  # "Connecting to..."
db2 = Database("postgresql://localhost/mydb")  # No output - returns same instance
print(db1 is db2)  # True
```

### Decorator Singleton

```python
import functools

def singleton(cls):
    """Decorator that makes a class a singleton."""
    instances = {}

    @functools.wraps(cls)
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    return get_instance


@singleton
class Logger:
    """Application logger singleton."""

    def __init__(self):
        self._logs = []

    def log(self, message: str) -> None:
        self._logs.append(message)
        print(f"[LOG] {message}")


# Usage
logger1 = Logger()
logger2 = Logger()
print(logger1 is logger2)  # True
```

### `__new__` Method Singleton

```python
class Singleton:
    """Singleton using __new__."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        # Warning: __init__ is called EVERY time!
        pass


# Note: __init__ is called each time, __new__ returns same instance
s1 = Singleton()
s2 = Singleton()
print(s1 is s2)  # True
```

### Thread-Safe Singleton

```python
import threading

class ThreadSafeSingleton:
    """Thread-safe singleton with double-checked locking."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                # Double-check after acquiring lock
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance


# Alternative: Use threading.Lock in module-level function
_instance = None
_lock = threading.Lock()

def get_instance():
    global _instance
    if _instance is None:
        with _lock:
            if _instance is None:
                _instance = ExpensiveObject()
    return _instance
```

### When NOT to Use Singleton

```python
# Problems with Singleton:
# 1. Global state - makes testing difficult
# 2. Hidden dependencies - not explicit in function signatures
# 3. Tight coupling - hard to swap implementations

# BAD: Hidden dependency on singleton
class OrderService:
    def process(self, order):
        db = Database()  # Hidden dependency!
        db.save(order)


# GOOD: Explicit dependency injection
class OrderService:
    def __init__(self, db: Database):
        self._db = db  # Explicit, testable

    def process(self, order):
        self._db.save(order)
```

**Prefer dependency injection over singletons for testability.**

---

## Factory Method

> Define an interface for creating an object, but let subclasses decide which class to instantiate.

In Python, factory functions and factory methods are idiomatic and simple.

### Basic Factory Function

```python
from dataclasses import dataclass
from abc import ABC, abstractmethod

@dataclass
class User:
    id: str
    name: str
    email: str


@dataclass
class AdminUser(User):
    permissions: list[str]


@dataclass
class GuestUser(User):
    expires_at: str


def create_user(user_type: str, **kwargs) -> User:
    """Factory function to create users by type."""
    factories = {
        "regular": lambda **kw: User(**kw),
        "admin": lambda **kw: AdminUser(permissions=["all"], **kw),
        "guest": lambda **kw: GuestUser(expires_at="2024-12-31", **kw),
    }

    factory = factories.get(user_type)
    if factory is None:
        raise ValueError(f"Unknown user type: {user_type}")

    return factory(**kwargs)


# Usage
user = create_user("admin", id="1", name="Alice", email="alice@example.com")
print(type(user))  # <class 'AdminUser'>
```

### Factory with Validation

```python
from dataclasses import dataclass
from typing import Protocol
import re


class Serializer(Protocol):
    def serialize(self, data: dict) -> str: ...
    def deserialize(self, text: str) -> dict: ...


class JSONSerializer:
    def serialize(self, data: dict) -> str:
        import json
        return json.dumps(data)

    def deserialize(self, text: str) -> dict:
        import json
        return json.loads(text)


class XMLSerializer:
    def serialize(self, data: dict) -> str:
        # Simple XML generation
        items = "".join(f"<{k}>{v}</{k}>" for k, v in data.items())
        return f"<root>{items}</root>"

    def deserialize(self, text: str) -> dict:
        # Simple XML parsing
        import xml.etree.ElementTree as ET
        root = ET.fromstring(text)
        return {child.tag: child.text for child in root}


class YAMLSerializer:
    def serialize(self, data: dict) -> str:
        import yaml
        return yaml.dump(data)

    def deserialize(self, text: str) -> dict:
        import yaml
        return yaml.safe_load(text)


def create_serializer(format: str) -> Serializer:
    """Factory with format validation."""
    format = format.lower().strip()

    serializers = {
        "json": JSONSerializer,
        "xml": XMLSerializer,
        "yaml": YAMLSerializer,
        "yml": YAMLSerializer,
    }

    if format not in serializers:
        valid = ", ".join(serializers.keys())
        raise ValueError(f"Unknown format '{format}'. Valid formats: {valid}")

    return serializers[format]()


# Usage
serializer = create_serializer("json")
data = {"name": "Alice", "age": 30}
text = serializer.serialize(data)
print(text)  # {"name": "Alice", "age": 30}
```

### Factory with Registration (Plugin Pattern)

```python
from typing import Protocol, Callable

class Parser(Protocol):
    def parse(self, content: str) -> dict: ...


# Registry for parsers
_parsers: dict[str, Callable[[], Parser]] = {}


def register_parser(extension: str):
    """Decorator to register a parser for a file extension."""
    def decorator(cls):
        _parsers[extension.lower()] = cls
        return cls
    return decorator


def get_parser(extension: str) -> Parser:
    """Factory function using registry."""
    ext = extension.lower().lstrip(".")
    if ext not in _parsers:
        raise ValueError(f"No parser registered for .{ext} files")
    return _parsers[ext]()


# Register parsers using decorator
@register_parser("json")
class JSONParser:
    def parse(self, content: str) -> dict:
        import json
        return json.loads(content)


@register_parser("yaml")
@register_parser("yml")
class YAMLParser:
    def parse(self, content: str) -> dict:
        import yaml
        return yaml.safe_load(content)


@register_parser("toml")
class TOMLParser:
    def parse(self, content: str) -> dict:
        import tomllib
        return tomllib.loads(content)


# Usage
parser = get_parser(".json")
data = parser.parse('{"key": "value"}')

# Easy to extend - just add new class with decorator
@register_parser("ini")
class INIParser:
    def parse(self, content: str) -> dict:
        import configparser
        config = configparser.ConfigParser()
        config.read_string(content)
        return {s: dict(config[s]) for s in config.sections()}
```

### Factory Method Pattern (Class-Based)

```python
from abc import ABC, abstractmethod

class Document(ABC):
    @abstractmethod
    def render(self) -> str:
        pass


class PDFDocument(Document):
    def __init__(self, content: str):
        self.content = content

    def render(self) -> str:
        return f"[PDF] {self.content}"


class HTMLDocument(Document):
    def __init__(self, content: str):
        self.content = content

    def render(self) -> str:
        return f"<html><body>{self.content}</body></html>"


class MarkdownDocument(Document):
    def __init__(self, content: str):
        self.content = content

    def render(self) -> str:
        return f"# Document\n\n{self.content}"


class DocumentCreator(ABC):
    """Abstract creator with factory method."""

    @abstractmethod
    def create_document(self, content: str) -> Document:
        """Factory method - subclasses decide which Document to create."""
        pass

    def process(self, content: str) -> str:
        """Template method using the factory method."""
        doc = self.create_document(content)
        return doc.render()


class PDFCreator(DocumentCreator):
    def create_document(self, content: str) -> Document:
        return PDFDocument(content)


class HTMLCreator(DocumentCreator):
    def create_document(self, content: str) -> Document:
        return HTMLDocument(content)


class MarkdownCreator(DocumentCreator):
    def create_document(self, content: str) -> Document:
        return MarkdownDocument(content)


# Usage
def export_document(format: str, content: str) -> str:
    creators = {
        "pdf": PDFCreator(),
        "html": HTMLCreator(),
        "markdown": MarkdownCreator(),
    }
    creator = creators.get(format)
    if not creator:
        raise ValueError(f"Unknown format: {format}")
    return creator.process(content)


result = export_document("html", "Hello, World!")
print(result)  # <html><body>Hello, World!</body></html>
```

---

## Abstract Factory

> Provide an interface for creating families of related objects without specifying their concrete classes.

Use when you need to create multiple related objects that work together.

### Database Factory Example

```python
from abc import ABC, abstractmethod
from typing import Protocol


# Abstract product interfaces
class Connection(Protocol):
    def execute(self, query: str) -> list: ...
    def close(self) -> None: ...


class Cursor(Protocol):
    def fetchone(self) -> dict | None: ...
    def fetchall(self) -> list[dict]: ...


class Transaction(Protocol):
    def commit(self) -> None: ...
    def rollback(self) -> None: ...


# Abstract factory
class DatabaseFactory(ABC):
    """Abstract factory for database components."""

    @abstractmethod
    def create_connection(self, url: str) -> Connection:
        pass

    @abstractmethod
    def create_cursor(self, connection: Connection) -> Cursor:
        pass

    @abstractmethod
    def create_transaction(self, connection: Connection) -> Transaction:
        pass


# PostgreSQL family
class PostgresConnection:
    def __init__(self, url: str):
        self.url = url
        print(f"Connected to PostgreSQL: {url}")

    def execute(self, query: str) -> list:
        print(f"[PostgreSQL] Executing: {query}")
        return []

    def close(self) -> None:
        print("PostgreSQL connection closed")


class PostgresCursor:
    def __init__(self, conn: PostgresConnection):
        self._conn = conn

    def fetchone(self) -> dict | None:
        return {"id": 1, "name": "test"}

    def fetchall(self) -> list[dict]:
        return [{"id": 1}, {"id": 2}]


class PostgresTransaction:
    def __init__(self, conn: PostgresConnection):
        self._conn = conn

    def commit(self) -> None:
        print("[PostgreSQL] Transaction committed")

    def rollback(self) -> None:
        print("[PostgreSQL] Transaction rolled back")


class PostgresFactory(DatabaseFactory):
    def create_connection(self, url: str) -> Connection:
        return PostgresConnection(url)

    def create_cursor(self, connection: Connection) -> Cursor:
        return PostgresCursor(connection)

    def create_transaction(self, connection: Connection) -> Transaction:
        return PostgresTransaction(connection)


# SQLite family
class SQLiteConnection:
    def __init__(self, url: str):
        self.url = url
        print(f"Connected to SQLite: {url}")

    def execute(self, query: str) -> list:
        print(f"[SQLite] Executing: {query}")
        return []

    def close(self) -> None:
        print("SQLite connection closed")


class SQLiteCursor:
    def __init__(self, conn: SQLiteConnection):
        self._conn = conn

    def fetchone(self) -> dict | None:
        return {"id": 1}

    def fetchall(self) -> list[dict]:
        return [{"id": 1}]


class SQLiteTransaction:
    def __init__(self, conn: SQLiteConnection):
        self._conn = conn

    def commit(self) -> None:
        print("[SQLite] Transaction committed")

    def rollback(self) -> None:
        print("[SQLite] Transaction rolled back")


class SQLiteFactory(DatabaseFactory):
    def create_connection(self, url: str) -> Connection:
        return SQLiteConnection(url)

    def create_cursor(self, connection: Connection) -> Cursor:
        return SQLiteCursor(connection)

    def create_transaction(self, connection: Connection) -> Transaction:
        return SQLiteTransaction(connection)


# Client code works with any database family
class Repository:
    def __init__(self, factory: DatabaseFactory, url: str):
        self._factory = factory
        self._conn = factory.create_connection(url)

    def save(self, data: dict) -> None:
        tx = self._factory.create_transaction(self._conn)
        try:
            self._conn.execute(f"INSERT INTO items VALUES ({data})")
            tx.commit()
        except Exception:
            tx.rollback()
            raise


# Factory selection
def get_database_factory(db_type: str) -> DatabaseFactory:
    factories = {
        "postgresql": PostgresFactory(),
        "postgres": PostgresFactory(),
        "sqlite": SQLiteFactory(),
    }
    factory = factories.get(db_type.lower())
    if not factory:
        raise ValueError(f"Unsupported database: {db_type}")
    return factory


# Usage
factory = get_database_factory("postgresql")
repo = Repository(factory, "postgresql://localhost/mydb")
repo.save({"id": 1, "name": "test"})
```

### UI Component Factory Example

```python
from abc import ABC, abstractmethod
from typing import Protocol


# Abstract products
class Button(Protocol):
    def render(self) -> str: ...
    def on_click(self, handler) -> None: ...


class TextField(Protocol):
    def render(self) -> str: ...
    def get_value(self) -> str: ...


class Dialog(Protocol):
    def render(self) -> str: ...
    def show(self) -> None: ...


# Abstract factory
class UIFactory(ABC):
    @abstractmethod
    def create_button(self, label: str) -> Button: ...

    @abstractmethod
    def create_text_field(self, placeholder: str) -> TextField: ...

    @abstractmethod
    def create_dialog(self, title: str, content: str) -> Dialog: ...


# Material Design family
class MaterialButton:
    def __init__(self, label: str):
        self.label = label
        self._handler = None

    def render(self) -> str:
        return f'<button class="mdc-button">{self.label}</button>'

    def on_click(self, handler) -> None:
        self._handler = handler


class MaterialTextField:
    def __init__(self, placeholder: str):
        self.placeholder = placeholder
        self._value = ""

    def render(self) -> str:
        return f'<input class="mdc-text-field" placeholder="{self.placeholder}">'

    def get_value(self) -> str:
        return self._value


class MaterialDialog:
    def __init__(self, title: str, content: str):
        self.title = title
        self.content = content

    def render(self) -> str:
        return f'<div class="mdc-dialog"><h2>{self.title}</h2><p>{self.content}</p></div>'

    def show(self) -> None:
        print(f"Showing Material dialog: {self.title}")


class MaterialUIFactory(UIFactory):
    def create_button(self, label: str) -> Button:
        return MaterialButton(label)

    def create_text_field(self, placeholder: str) -> TextField:
        return MaterialTextField(placeholder)

    def create_dialog(self, title: str, content: str) -> Dialog:
        return MaterialDialog(title, content)


# Bootstrap family
class BootstrapButton:
    def __init__(self, label: str):
        self.label = label

    def render(self) -> str:
        return f'<button class="btn btn-primary">{self.label}</button>'

    def on_click(self, handler) -> None:
        pass


class BootstrapTextField:
    def __init__(self, placeholder: str):
        self.placeholder = placeholder

    def render(self) -> str:
        return f'<input class="form-control" placeholder="{self.placeholder}">'

    def get_value(self) -> str:
        return ""


class BootstrapDialog:
    def __init__(self, title: str, content: str):
        self.title = title
        self.content = content

    def render(self) -> str:
        return f'<div class="modal"><div class="modal-header">{self.title}</div><div class="modal-body">{self.content}</div></div>'

    def show(self) -> None:
        print(f"Showing Bootstrap modal: {self.title}")


class BootstrapUIFactory(UIFactory):
    def create_button(self, label: str) -> Button:
        return BootstrapButton(label)

    def create_text_field(self, placeholder: str) -> TextField:
        return BootstrapTextField(placeholder)

    def create_dialog(self, title: str, content: str) -> Dialog:
        return BootstrapDialog(title, content)


# Client code
def create_login_form(factory: UIFactory) -> str:
    """Creates a login form using the provided UI factory."""
    username = factory.create_text_field("Username")
    password = factory.create_text_field("Password")
    submit = factory.create_button("Login")

    return f"""
    <form>
        {username.render()}
        {password.render()}
        {submit.render()}
    </form>
    """


# Usage
material_factory = MaterialUIFactory()
bootstrap_factory = BootstrapUIFactory()

print(create_login_form(material_factory))
print(create_login_form(bootstrap_factory))
```

---

## Builder

> Separate the construction of a complex object from its representation.

Use Builder when object construction requires many steps or optional parameters.

### Traditional Builder with Method Chaining

```python
from dataclasses import dataclass, field
from typing import Self


@dataclass
class HTTPRequest:
    method: str
    url: str
    headers: dict[str, str]
    body: str | None
    timeout: int
    retries: int


class HTTPRequestBuilder:
    """Builder with fluent API (method chaining)."""

    def __init__(self):
        self._method = "GET"
        self._url = ""
        self._headers: dict[str, str] = {}
        self._body: str | None = None
        self._timeout = 30
        self._retries = 0

    def method(self, method: str) -> Self:
        self._method = method.upper()
        return self

    def url(self, url: str) -> Self:
        self._url = url
        return self

    def header(self, key: str, value: str) -> Self:
        self._headers[key] = value
        return self

    def headers(self, headers: dict[str, str]) -> Self:
        self._headers.update(headers)
        return self

    def body(self, body: str) -> Self:
        self._body = body
        return self

    def json_body(self, data: dict) -> Self:
        import json
        self._body = json.dumps(data)
        self._headers["Content-Type"] = "application/json"
        return self

    def timeout(self, seconds: int) -> Self:
        self._timeout = seconds
        return self

    def retries(self, count: int) -> Self:
        self._retries = count
        return self

    def build(self) -> HTTPRequest:
        if not self._url:
            raise ValueError("URL is required")
        return HTTPRequest(
            method=self._method,
            url=self._url,
            headers=self._headers,
            body=self._body,
            timeout=self._timeout,
            retries=self._retries,
        )


# Usage with method chaining
request = (
    HTTPRequestBuilder()
    .method("POST")
    .url("https://api.example.com/users")
    .header("Authorization", "Bearer token123")
    .json_body({"name": "Alice", "email": "alice@example.com"})
    .timeout(60)
    .retries(3)
    .build()
)

print(request)
```

### Builder with Dataclass (Python 3.10+)

```python
from dataclasses import dataclass, field
from typing import Self


@dataclass
class QueryBuilder:
    """Query builder using dataclass with defaults."""

    table: str
    columns: list[str] = field(default_factory=lambda: ["*"])
    where_clauses: list[str] = field(default_factory=list)
    order_by: str | None = None
    limit: int | None = None
    offset: int | None = None

    def select(self, *columns: str) -> Self:
        self.columns = list(columns) if columns else ["*"]
        return self

    def where(self, condition: str) -> Self:
        self.where_clauses.append(condition)
        return self

    def order(self, column: str, desc: bool = False) -> Self:
        direction = "DESC" if desc else "ASC"
        self.order_by = f"{column} {direction}"
        return self

    def take(self, count: int) -> Self:
        self.limit = count
        return self

    def skip(self, count: int) -> Self:
        self.offset = count
        return self

    def build(self) -> str:
        """Build the SQL query string."""
        parts = [f"SELECT {', '.join(self.columns)}", f"FROM {self.table}"]

        if self.where_clauses:
            parts.append(f"WHERE {' AND '.join(self.where_clauses)}")

        if self.order_by:
            parts.append(f"ORDER BY {self.order_by}")

        if self.limit is not None:
            parts.append(f"LIMIT {self.limit}")

        if self.offset is not None:
            parts.append(f"OFFSET {self.offset}")

        return " ".join(parts)


# Usage
query = (
    QueryBuilder("users")
    .select("id", "name", "email")
    .where("active = true")
    .where("created_at > '2024-01-01'")
    .order("created_at", desc=True)
    .take(10)
    .skip(20)
    .build()
)

print(query)
# SELECT id, name, email FROM users WHERE active = true AND created_at > '2024-01-01' ORDER BY created_at DESC LIMIT 10 OFFSET 20
```

### Builder with Director

```python
from dataclasses import dataclass
from typing import Self


@dataclass
class Email:
    sender: str
    recipients: list[str]
    cc: list[str]
    bcc: list[str]
    subject: str
    body: str
    attachments: list[str]
    is_html: bool


class EmailBuilder:
    def __init__(self):
        self._sender = ""
        self._recipients: list[str] = []
        self._cc: list[str] = []
        self._bcc: list[str] = []
        self._subject = ""
        self._body = ""
        self._attachments: list[str] = []
        self._is_html = False

    def sender(self, email: str) -> Self:
        self._sender = email
        return self

    def to(self, *emails: str) -> Self:
        self._recipients.extend(emails)
        return self

    def cc(self, *emails: str) -> Self:
        self._cc.extend(emails)
        return self

    def bcc(self, *emails: str) -> Self:
        self._bcc.extend(emails)
        return self

    def subject(self, subject: str) -> Self:
        self._subject = subject
        return self

    def body(self, content: str, html: bool = False) -> Self:
        self._body = content
        self._is_html = html
        return self

    def attach(self, *files: str) -> Self:
        self._attachments.extend(files)
        return self

    def build(self) -> Email:
        if not self._sender:
            raise ValueError("Sender is required")
        if not self._recipients:
            raise ValueError("At least one recipient is required")
        return Email(
            sender=self._sender,
            recipients=self._recipients,
            cc=self._cc,
            bcc=self._bcc,
            subject=self._subject,
            body=self._body,
            attachments=self._attachments,
            is_html=self._is_html,
        )


class EmailDirector:
    """Director that knows how to build common email types."""

    def __init__(self, builder: EmailBuilder):
        self._builder = builder

    def build_welcome_email(self, user_email: str, username: str) -> Email:
        return (
            self._builder
            .sender("noreply@example.com")
            .to(user_email)
            .subject(f"Welcome, {username}!")
            .body(f"<h1>Welcome to our platform, {username}!</h1>", html=True)
            .build()
        )

    def build_password_reset(self, user_email: str, reset_link: str) -> Email:
        return (
            self._builder
            .sender("security@example.com")
            .to(user_email)
            .subject("Password Reset Request")
            .body(f"Click here to reset your password: {reset_link}")
            .build()
        )

    def build_report_email(
        self,
        recipients: list[str],
        report_name: str,
        report_file: str,
    ) -> Email:
        return (
            self._builder
            .sender("reports@example.com")
            .to(*recipients)
            .subject(f"Report: {report_name}")
            .body(f"Please find the {report_name} report attached.")
            .attach(report_file)
            .build()
        )


# Usage
director = EmailDirector(EmailBuilder())

welcome = director.build_welcome_email("alice@example.com", "Alice")
reset = director.build_password_reset("bob@example.com", "https://example.com/reset/abc123")
report = director.build_report_email(
    ["team@example.com", "manager@example.com"],
    "Monthly Sales",
    "/reports/sales_2024_01.pdf",
)
```

---

## Prototype

> Create objects by copying an existing object (the prototype).

Use when object creation is expensive and you can clone existing objects.

### Using copy Module

```python
import copy
from dataclasses import dataclass, field


@dataclass
class Address:
    street: str
    city: str
    country: str


@dataclass
class Person:
    name: str
    email: str
    address: Address
    tags: list[str] = field(default_factory=list)


# Original object
original = Person(
    name="Alice",
    email="alice@example.com",
    address=Address("123 Main St", "New York", "USA"),
    tags=["developer", "python"],
)

# Shallow copy - nested objects are shared
shallow = copy.copy(original)
shallow.name = "Bob"
shallow.address.city = "Boston"  # Affects original!

print(original.address.city)  # "Boston" - oops!


# Deep copy - completely independent
original = Person(
    name="Alice",
    email="alice@example.com",
    address=Address("123 Main St", "New York", "USA"),
    tags=["developer", "python"],
)

deep = copy.deepcopy(original)
deep.name = "Carol"
deep.address.city = "Chicago"  # Independent

print(original.address.city)  # "New York" - unchanged
print(deep.address.city)  # "Chicago"
```

### Custom `__copy__` and `__deepcopy__`

```python
import copy
from dataclasses import dataclass, field


@dataclass
class ExpensiveResource:
    """Resource that's expensive to create from scratch."""

    data: dict
    computed_cache: dict = field(default_factory=dict)
    _initialized: bool = field(default=False, repr=False)

    def initialize(self) -> None:
        """Expensive initialization."""
        print("Performing expensive initialization...")
        self.computed_cache = self._compute_cache()
        self._initialized = True

    def _compute_cache(self) -> dict:
        # Simulate expensive computation
        return {k: v * 2 for k, v in self.data.items()}

    def __copy__(self):
        """Shallow copy - share the data, copy the cache."""
        new = ExpensiveResource(
            data=self.data,  # Shared reference
            computed_cache=self.computed_cache.copy(),  # Shallow copy of cache
            _initialized=self._initialized,
        )
        return new

    def __deepcopy__(self, memo):
        """Deep copy - independent copy of everything."""
        new = ExpensiveResource(
            data=copy.deepcopy(self.data, memo),
            computed_cache=copy.deepcopy(self.computed_cache, memo),
            _initialized=self._initialized,
        )
        memo[id(self)] = new
        return new


# Create and initialize expensive resource
prototype = ExpensiveResource(data={"a": 1, "b": 2, "c": 3})
prototype.initialize()  # "Performing expensive initialization..."

# Clone without re-initialization
clone1 = copy.copy(prototype)
clone2 = copy.deepcopy(prototype)

# No initialization needed - cache is copied
print(clone1.computed_cache)  # {'a': 2, 'b': 4, 'c': 6}
print(clone2.computed_cache)  # {'a': 2, 'b': 4, 'c': 6}
```

### Prototype Registry

```python
import copy
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


class Prototype(ABC):
    @abstractmethod
    def clone(self) -> "Prototype":
        pass


@dataclass
class Document(Prototype):
    title: str
    content: str
    author: str
    template: str
    styles: dict = field(default_factory=dict)

    def clone(self) -> "Document":
        return copy.deepcopy(self)


class PrototypeRegistry:
    """Registry of prototype objects."""

    def __init__(self):
        self._prototypes: dict[str, Prototype] = {}

    def register(self, name: str, prototype: Prototype) -> None:
        self._prototypes[name] = prototype

    def unregister(self, name: str) -> None:
        del self._prototypes[name]

    def clone(self, name: str) -> Prototype:
        prototype = self._prototypes.get(name)
        if prototype is None:
            raise KeyError(f"No prototype registered with name: {name}")
        return prototype.clone()


# Setup registry with prototypes
registry = PrototypeRegistry()

# Register document templates
registry.register(
    "report",
    Document(
        title="",
        content="",
        author="",
        template="report",
        styles={"font": "Arial", "size": 12, "margins": "1in"},
    )
)

registry.register(
    "memo",
    Document(
        title="",
        content="",
        author="",
        template="memo",
        styles={"font": "Times New Roman", "size": 11, "margins": "0.5in"},
    )
)

# Clone prototypes
report = registry.clone("report")
report.title = "Q4 Sales Report"
report.author = "Alice"

memo = registry.clone("memo")
memo.title = "Team Meeting Notes"
memo.author = "Bob"

print(report.styles)  # {'font': 'Arial', 'size': 12, 'margins': '1in'}
print(memo.styles)  # {'font': 'Times New Roman', 'size': 11, 'margins': '0.5in'}
```

---

## Object Pool

> Manage a pool of reusable objects to avoid expensive creation/destruction.

Use for database connections, thread pools, or any expensive-to-create objects.

### Simple Pool with Queue

```python
from queue import Queue, Empty
from contextlib import contextmanager
from typing import TypeVar, Generic, Callable

T = TypeVar("T")


class ObjectPool(Generic[T]):
    """Generic object pool using a queue."""

    def __init__(
        self,
        factory: Callable[[], T],
        size: int = 10,
        max_size: int | None = None,
    ):
        self._factory = factory
        self._size = size
        self._max_size = max_size or size
        self._pool: Queue[T] = Queue(maxsize=self._max_size)
        self._created = 0

        # Pre-populate pool
        for _ in range(size):
            self._pool.put(self._factory())
            self._created += 1

    def acquire(self, timeout: float | None = None) -> T:
        """Get an object from the pool."""
        try:
            return self._pool.get(timeout=timeout)
        except Empty:
            # Pool empty - create new if under max
            if self._created < self._max_size:
                self._created += 1
                return self._factory()
            raise RuntimeError("Pool exhausted and at max capacity")

    def release(self, obj: T) -> None:
        """Return an object to the pool."""
        try:
            self._pool.put_nowait(obj)
        except Exception:
            # Pool full, discard object
            pass

    @contextmanager
    def connection(self):
        """Context manager for automatic release."""
        obj = self.acquire()
        try:
            yield obj
        finally:
            self.release(obj)

    @property
    def available(self) -> int:
        return self._pool.qsize()


# Database connection example
class DatabaseConnection:
    _counter = 0

    def __init__(self, url: str):
        DatabaseConnection._counter += 1
        self.id = DatabaseConnection._counter
        self.url = url
        print(f"Creating connection #{self.id}")

    def execute(self, query: str) -> list:
        print(f"Connection #{self.id} executing: {query}")
        return []

    def close(self) -> None:
        print(f"Closing connection #{self.id}")


# Create pool
pool = ObjectPool(
    factory=lambda: DatabaseConnection("postgresql://localhost/mydb"),
    size=3,
    max_size=5,
)

# Use connections
with pool.connection() as conn:
    conn.execute("SELECT * FROM users")

# Or manually
conn = pool.acquire()
try:
    conn.execute("SELECT * FROM orders")
finally:
    pool.release(conn)

print(f"Available connections: {pool.available}")
```

### Thread-Safe Pool with Validation

```python
import threading
import time
from queue import Queue, Empty
from contextlib import contextmanager
from dataclasses import dataclass
from typing import TypeVar, Generic, Callable, Protocol

T = TypeVar("T")


class Poolable(Protocol):
    """Protocol for objects that can be pooled."""

    def is_valid(self) -> bool:
        """Check if the object is still valid."""
        ...

    def reset(self) -> None:
        """Reset the object for reuse."""
        ...


@dataclass
class PoolStats:
    total_created: int
    available: int
    in_use: int
    max_size: int


class ThreadSafePool(Generic[T]):
    """Thread-safe object pool with validation."""

    def __init__(
        self,
        factory: Callable[[], T],
        validator: Callable[[T], bool] | None = None,
        resetter: Callable[[T], None] | None = None,
        min_size: int = 2,
        max_size: int = 10,
    ):
        self._factory = factory
        self._validator = validator or (lambda x: True)
        self._resetter = resetter or (lambda x: None)
        self._min_size = min_size
        self._max_size = max_size

        self._pool: Queue[T] = Queue()
        self._lock = threading.Lock()
        self._created = 0
        self._in_use = 0

        # Pre-populate
        for _ in range(min_size):
            self._pool.put(self._create_new())

    def _create_new(self) -> T:
        self._created += 1
        return self._factory()

    def acquire(self, timeout: float = 5.0) -> T:
        """Acquire an object from the pool."""
        start = time.time()

        while time.time() - start < timeout:
            # Try to get from pool
            try:
                obj = self._pool.get_nowait()

                # Validate before returning
                if self._validator(obj):
                    with self._lock:
                        self._in_use += 1
                    return obj

                # Invalid, create new
                with self._lock:
                    self._created -= 1
            except Empty:
                pass

            # Try to create new
            with self._lock:
                if self._created < self._max_size:
                    obj = self._create_new()
                    self._in_use += 1
                    return obj

            # Pool exhausted, wait a bit
            time.sleep(0.1)

        raise TimeoutError("Could not acquire object from pool")

    def release(self, obj: T) -> None:
        """Release an object back to the pool."""
        with self._lock:
            self._in_use -= 1

        # Reset and validate before returning to pool
        try:
            self._resetter(obj)
            if self._validator(obj):
                self._pool.put_nowait(obj)
            else:
                with self._lock:
                    self._created -= 1
        except Exception:
            with self._lock:
                self._created -= 1

    @contextmanager
    def acquire_context(self):
        """Context manager for automatic release."""
        obj = self.acquire()
        try:
            yield obj
        finally:
            self.release(obj)

    def stats(self) -> PoolStats:
        with self._lock:
            return PoolStats(
                total_created=self._created,
                available=self._pool.qsize(),
                in_use=self._in_use,
                max_size=self._max_size,
            )


# Example with database connections
class DBConnection:
    def __init__(self, url: str):
        self.url = url
        self._closed = False
        self._last_used = time.time()

    def execute(self, query: str) -> list:
        self._last_used = time.time()
        return []

    def is_valid(self) -> bool:
        # Connection is valid if not closed and used recently
        return not self._closed and (time.time() - self._last_used) < 300

    def reset(self) -> None:
        # Reset connection state
        pass

    def close(self) -> None:
        self._closed = True


# Create pool with validation
pool = ThreadSafePool(
    factory=lambda: DBConnection("postgresql://localhost/db"),
    validator=lambda c: c.is_valid(),
    resetter=lambda c: c.reset(),
    min_size=2,
    max_size=10,
)

# Thread-safe usage
def worker(worker_id: int):
    with pool.acquire_context() as conn:
        conn.execute(f"SELECT * FROM table_{worker_id}")


threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(pool.stats())
```

---

## Python-Specific Patterns

### `__call__` as Factory

```python
class ConnectionFactory:
    """Factory using __call__ for callable instances."""

    def __init__(self, host: str, port: int, **default_options):
        self.host = host
        self.port = port
        self.default_options = default_options

    def __call__(self, database: str, **options) -> "Connection":
        """Create a connection when instance is called."""
        merged_options = {**self.default_options, **options}
        return Connection(
            host=self.host,
            port=self.port,
            database=database,
            **merged_options
        )


class Connection:
    def __init__(self, host: str, port: int, database: str, **options):
        self.host = host
        self.port = port
        self.database = database
        self.options = options


# Create factory with defaults
postgres_factory = ConnectionFactory(
    host="localhost",
    port=5432,
    pool_size=5,
    timeout=30,
)

# Use factory as callable
conn1 = postgres_factory("users_db")
conn2 = postgres_factory("orders_db", timeout=60)

print(conn1.database)  # "users_db"
print(conn2.options)   # {'pool_size': 5, 'timeout': 60}
```

### `@classmethod` as Alternative Constructor

```python
from dataclasses import dataclass
from datetime import datetime, date
import json


@dataclass
class Event:
    name: str
    timestamp: datetime
    data: dict

    @classmethod
    def from_dict(cls, d: dict) -> "Event":
        """Create from dictionary."""
        return cls(
            name=d["name"],
            timestamp=datetime.fromisoformat(d["timestamp"]),
            data=d.get("data", {}),
        )

    @classmethod
    def from_json(cls, json_str: str) -> "Event":
        """Create from JSON string."""
        return cls.from_dict(json.loads(json_str))

    @classmethod
    def now(cls, name: str, data: dict | None = None) -> "Event":
        """Create event with current timestamp."""
        return cls(
            name=name,
            timestamp=datetime.now(),
            data=data or {},
        )


@dataclass
class Date:
    year: int
    month: int
    day: int

    @classmethod
    def from_string(cls, date_str: str, fmt: str = "%Y-%m-%d") -> "Date":
        """Parse from string."""
        dt = datetime.strptime(date_str, fmt)
        return cls(dt.year, dt.month, dt.day)

    @classmethod
    def from_date(cls, d: date) -> "Date":
        """Create from datetime.date."""
        return cls(d.year, d.month, d.day)

    @classmethod
    def today(cls) -> "Date":
        """Create for today."""
        d = date.today()
        return cls(d.year, d.month, d.day)


# Usage
event1 = Event.now("user_signup", {"user_id": 123})
event2 = Event.from_json('{"name": "click", "timestamp": "2024-01-15T10:30:00"}')

d1 = Date.from_string("2024-01-15")
d2 = Date.today()
```

### Dataclass with Factory Defaults

```python
from dataclasses import dataclass, field
from uuid import uuid4
from datetime import datetime


def generate_id() -> str:
    return str(uuid4())


def now() -> datetime:
    return datetime.now()


@dataclass
class Entity:
    """Base entity with auto-generated ID and timestamps."""
    id: str = field(default_factory=generate_id)
    created_at: datetime = field(default_factory=now)
    updated_at: datetime = field(default_factory=now)


@dataclass
class User(Entity):
    name: str = ""
    email: str = ""
    tags: list[str] = field(default_factory=list)

    def __post_init__(self):
        # Validation or transformation after init
        self.email = self.email.lower()


@dataclass
class Config:
    """Config with environment-aware defaults."""
    debug: bool = field(default_factory=lambda: os.environ.get("DEBUG", "").lower() == "true")
    log_level: str = field(default_factory=lambda: os.environ.get("LOG_LEVEL", "INFO"))
    database_url: str = field(default_factory=lambda: os.environ.get("DATABASE_URL", "sqlite:///app.db"))


# Auto-generated fields
user = User(name="Alice", email="ALICE@example.com")
print(user.id)         # "550e8400-e29b-41d4-a716-446655440000" (random UUID)
print(user.created_at) # 2024-01-15 10:30:00.123456
print(user.email)      # "alice@example.com" (lowercased in __post_init__)
```

### Lazy Initialization

```python
from functools import cached_property


class ExpensiveService:
    """Service with lazy-loaded dependencies."""

    def __init__(self, config: dict):
        self._config = config
        # Don't initialize expensive resources here

    @cached_property
    def database(self) -> "Database":
        """Lazy-load database connection."""
        print("Initializing database...")
        return Database(self._config["database_url"])

    @cached_property
    def cache(self) -> "Cache":
        """Lazy-load cache connection."""
        print("Initializing cache...")
        return Cache(self._config["cache_url"])

    @cached_property
    def search_client(self) -> "SearchClient":
        """Lazy-load search client."""
        print("Initializing search...")
        return SearchClient(self._config["search_url"])

    def get_user(self, user_id: int):
        # Only initializes database on first access
        return self.database.find_user(user_id)

    def search_users(self, query: str):
        # Only initializes search on first access
        return self.search_client.search(query)


# Service created but nothing initialized
service = ExpensiveService({
    "database_url": "postgresql://...",
    "cache_url": "redis://...",
    "search_url": "elasticsearch://...",
})

# Only database initialized
service.get_user(123)  # "Initializing database..."

# Database already initialized, only search initialized
service.search_users("alice")  # "Initializing search..."
```

---

## Interview Questions

### Q1: When would you use a Singleton vs module-level state in Python?

**Answer**: In Python, module-level state is often preferred over Singleton because:

1. **Modules are natural singletons** - Python imports modules once and caches them
2. **Simpler code** - No metaclass or decorator boilerplate
3. **Explicit** - Import statement shows dependency clearly

Use Singleton pattern when:
- You need lazy initialization with parameters
- You're implementing a library where import time shouldn't trigger initialization
- You need `isinstance()` checks
- You're working with a team that expects OOP patterns

```python
# Module singleton (preferred for simple cases)
# config.py
_config = None
def get_config():
    global _config
    if _config is None:
        _config = load_config()
    return _config

# Class singleton (when you need more control)
class ConfigManager(metaclass=SingletonMeta):
    def __init__(self, env="production"):
        self.env = env
        self.settings = load_settings(env)
```

### Q2: How does Python's duck typing affect the Factory pattern?

**Answer**: Duck typing makes Factory simpler in Python because:

1. **No interface declarations needed** - Factory returns any object with required methods
2. **Dict-based dispatch** - Simple mapping replaces class hierarchy
3. **First-class functions** - Functions can be factories themselves

```python
# In Java/C++, you'd need interfaces and abstract classes
# In Python, just return objects that have the methods you need

def create_storage(type: str):
    storages = {
        "file": FileStorage,      # Class itself is the factory
        "s3": S3Storage,
        "memory": dict,           # Built-in type works too!
    }
    return storages[type]()

# All these work if they have get/set methods
storage = create_storage("file")
storage = create_storage("memory")  # dict has different interface but duck typing works
```

### Q3: What's the difference between `copy.copy()` and `copy.deepcopy()`?

**Answer**:

**`copy.copy()` (shallow copy)**:
- Creates new container object
- Interior objects are **shared references**
- Fast, but changes to nested objects affect both

**`copy.deepcopy()` (deep copy)**:
- Creates new container object
- Recursively copies **all nested objects**
- Slower, but completely independent copy

```python
import copy

original = {"list": [1, 2, 3], "value": 42}

shallow = copy.copy(original)
shallow["list"].append(4)  # Affects original!
print(original["list"])  # [1, 2, 3, 4]

original = {"list": [1, 2, 3], "value": 42}
deep = copy.deepcopy(original)
deep["list"].append(4)  # Independent
print(original["list"])  # [1, 2, 3]
```

**When to use each**:
- **Shallow**: Immutable or primitive contents, performance critical
- **Deep**: Nested mutable objects, need full independence

### Q4: How would you implement a connection pool in Python?

**Answer**: Key considerations:
1. Thread-safety (use `threading.Lock` or `queue.Queue`)
2. Connection validation (check before returning)
3. Max pool size (prevent resource exhaustion)
4. Graceful handling of failures
5. Context manager for automatic release

```python
from queue import Queue
from contextlib import contextmanager
import threading

class ConnectionPool:
    def __init__(self, factory, min_size=2, max_size=10):
        self._factory = factory
        self._pool = Queue(maxsize=max_size)
        self._lock = threading.Lock()
        self._size = 0
        self._max_size = max_size

        for _ in range(min_size):
            self._pool.put(self._factory())
            self._size += 1

    @contextmanager
    def connection(self):
        conn = self._acquire()
        try:
            yield conn
        finally:
            self._release(conn)

    def _acquire(self):
        try:
            return self._pool.get_nowait()
        except:
            with self._lock:
                if self._size < self._max_size:
                    self._size += 1
                    return self._factory()
            return self._pool.get(timeout=5)

    def _release(self, conn):
        self._pool.put(conn)
```

### Q5: What are the trade-offs between Builder and `@dataclass` with defaults?

**Answer**:

**`@dataclass` with defaults**:
- Simpler, less code
- Good for objects with few optional parameters
- All-or-nothing validation in `__post_init__`
- Immutable with `frozen=True`

**Builder pattern**:
- Better for many optional parameters
- Step-by-step validation
- Clear fluent API
- Can enforce required steps
- Reusable builders for templates

```python
# Use dataclass when:
@dataclass
class User:
    name: str
    email: str
    age: int = 0
    active: bool = True

# Use Builder when:
# - Many optional fields with complex defaults
# - Need step-by-step construction
# - Want to validate at each step
# - Building complex nested objects

request = (
    RequestBuilder()
    .method("POST")            # Validates method
    .url("/api/users")         # Validates URL format
    .json({"name": "Alice"})   # Sets content-type automatically
    .timeout(30)               # Validates positive number
    .build()                   # Final validation
)
```

---

## Quick Reference

### Pattern Selection

| Need | Pattern | Python Approach |
|------|---------|-----------------|
| Single instance | Singleton | Module-level or metaclass |
| Create by type | Factory | Dict mapping or registry |
| Related object families | Abstract Factory | Factory class per family |
| Complex construction | Builder | Fluent API or dataclass |
| Clone existing | Prototype | `copy.deepcopy()` |
| Reuse expensive objects | Pool | Queue + context manager |

### Python Idioms for Creational Patterns

| Pattern | Python Idiom |
|---------|--------------|
| Factory | Dict mapping: `{"type": Class}[type]()` |
| Alternative constructors | `@classmethod` methods |
| Lazy initialization | `@cached_property` |
| Resource management | Context manager (`with`) |
| Immutable objects | `@dataclass(frozen=True)` |
| Default values | `field(default_factory=...)` |

### Code Smells

| Smell | Problem | Solution |
|-------|---------|----------|
| `if type == "a"` chains | Not extensible | Factory with registry |
| Global `instance = Cls()` | Hidden dependency | Explicit injection |
| Constructor with 10+ params | Too complex | Builder pattern |
| `new Obj(); obj.setX(); obj.setY()` | Incomplete state | Builder or factory |
| Creating same object repeatedly | Performance waste | Prototype or Pool |

---

**Next**: [11-design-patterns-structural.md](11-design-patterns-structural.md) — Structural Design Patterns
