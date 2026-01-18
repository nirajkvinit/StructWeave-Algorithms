# Python Behavioral Design Patterns

> Patterns for object collaboration and communication

Behavioral patterns deal with algorithms and the assignment of responsibilities between objects. They describe how objects communicate and how responsibilities are distributed. Python's first-class functions, generators, and dynamic nature make many behavioral patterns elegant and natural.

**Reading time**: 75-90 minutes

---

## Table of Contents

1. [Pattern Selection Guide](#pattern-selection-guide)
2. [Chain of Responsibility](#chain-of-responsibility)
3. [Command](#command)
4. [Iterator](#iterator)
5. [Mediator](#mediator)
6. [Memento](#memento)
7. [Observer](#observer)
8. [State](#state)
9. [Strategy](#strategy)
10. [Template Method](#template-method)
11. [Visitor](#visitor)
12. [Python-Specific Patterns](#python-specific-patterns)
13. [Interview Questions](#interview-questions)
14. [Quick Reference](#quick-reference)

---

## Pattern Selection Guide

### When to Use Each Pattern

```
Request passes through handlers?
└── Yes → Chain of Responsibility

Encapsulate requests as objects?
└── Yes → Command

Sequential access to collection?
└── Yes → Iterator

Reduce coupling between components?
└── Yes → Mediator

Save/restore object state?
└── Yes → Memento

Notify multiple objects of changes?
└── Yes → Observer

Object behavior depends on state?
└── Yes → State

Interchangeable algorithms?
└── Yes → Strategy

Algorithm skeleton with variable steps?
└── Yes → Template Method

Operations on object structure?
└── Yes → Visitor
```

### Quick Decision Table

| Scenario | Pattern | Python Approach |
|----------|---------|-----------------|
| Middleware, validators | Chain of Responsibility | Generator pipeline or linked handlers |
| Undo/redo, queued actions | Command | Callable objects with `undo()` |
| Custom iteration | Iterator | `__iter__`, `__next__`, generators |
| Event systems | Mediator/Observer | Callback lists, event bus |
| Editor history | Memento | Dataclass snapshots |
| UI event handling | Observer | Callbacks, signals |
| Traffic light, workflow | State | State classes with transitions |
| Sorting, validation | Strategy | Functions or Protocol classes |
| Data processing pipelines | Template Method | ABC with abstract steps |
| AST processing | Visitor | `@singledispatch` |

---

## Chain of Responsibility

> Pass a request along a chain of handlers until one handles it.

Use for middleware, validation chains, or request processing.

### Middleware Chain

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol, Callable


@dataclass
class Request:
    path: str
    method: str
    headers: dict[str, str]
    body: str = ""
    user: str | None = None


@dataclass
class Response:
    status: int
    body: str
    headers: dict[str, str] = None

    def __post_init__(self):
        self.headers = self.headers or {}


class Handler(ABC):
    """Base handler in the chain."""

    def __init__(self):
        self._next: Handler | None = None

    def set_next(self, handler: "Handler") -> "Handler":
        self._next = handler
        return handler

    @abstractmethod
    def handle(self, request: Request) -> Response | None:
        pass

    def handle_next(self, request: Request) -> Response | None:
        if self._next:
            return self._next.handle(request)
        return None


class AuthHandler(Handler):
    """Check authentication."""

    def __init__(self, api_key: str):
        super().__init__()
        self._api_key = api_key

    def handle(self, request: Request) -> Response | None:
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return Response(401, "Missing authorization")

        token = auth.replace("Bearer ", "")
        if token != self._api_key:
            return Response(403, "Invalid token")

        request.user = "authenticated_user"
        return self.handle_next(request)


class RateLimitHandler(Handler):
    """Check rate limits."""

    def __init__(self, max_requests: int = 100):
        super().__init__()
        self._max = max_requests
        self._counts: dict[str, int] = {}

    def handle(self, request: Request) -> Response | None:
        ip = request.headers.get("X-Forwarded-For", "unknown")
        self._counts[ip] = self._counts.get(ip, 0) + 1

        if self._counts[ip] > self._max:
            return Response(429, "Too many requests")

        return self.handle_next(request)


class ValidationHandler(Handler):
    """Validate request."""

    def handle(self, request: Request) -> Response | None:
        if request.method == "POST" and not request.body:
            return Response(400, "Body required for POST")

        return self.handle_next(request)


class LoggingHandler(Handler):
    """Log requests."""

    def handle(self, request: Request) -> Response | None:
        print(f"[LOG] {request.method} {request.path}")
        response = self.handle_next(request)
        if response:
            print(f"[LOG] Response: {response.status}")
        return response


class FinalHandler(Handler):
    """Final handler that processes the request."""

    def handle(self, request: Request) -> Response | None:
        return Response(200, f"Success for {request.user}")


# Build chain
auth = AuthHandler("secret-key")
rate_limit = RateLimitHandler(100)
validation = ValidationHandler()
logging = LoggingHandler()
final = FinalHandler()

logging.set_next(auth).set_next(rate_limit).set_next(validation).set_next(final)

# Process request
request = Request(
    path="/api/users",
    method="GET",
    headers={"Authorization": "Bearer secret-key"}
)

response = logging.handle(request)
print(response)
```

### Validation Chain with Generators

```python
from typing import Generator, Callable
from dataclasses import dataclass


@dataclass
class FormData:
    username: str
    email: str
    password: str
    age: int


ValidationError = str
Validator = Callable[[FormData], Generator[ValidationError, None, None]]


def validate_username(data: FormData) -> Generator[ValidationError, None, None]:
    if len(data.username) < 3:
        yield "Username must be at least 3 characters"
    if not data.username.isalnum():
        yield "Username must be alphanumeric"


def validate_email(data: FormData) -> Generator[ValidationError, None, None]:
    if "@" not in data.email:
        yield "Invalid email format"
    if not data.email.endswith((".com", ".org", ".net")):
        yield "Email must end with .com, .org, or .net"


def validate_password(data: FormData) -> Generator[ValidationError, None, None]:
    if len(data.password) < 8:
        yield "Password must be at least 8 characters"
    if not any(c.isupper() for c in data.password):
        yield "Password must contain uppercase letter"
    if not any(c.isdigit() for c in data.password):
        yield "Password must contain a digit"


def validate_age(data: FormData) -> Generator[ValidationError, None, None]:
    if data.age < 18:
        yield "Must be 18 or older"
    if data.age > 120:
        yield "Invalid age"


def validate(data: FormData, validators: list[Validator]) -> list[ValidationError]:
    """Run all validators and collect errors."""
    errors = []
    for validator in validators:
        errors.extend(validator(data))
    return errors


# Usage
validators = [validate_username, validate_email, validate_password, validate_age]

form = FormData(
    username="ab",
    email="invalid",
    password="weak",
    age=15
)

errors = validate(form, validators)
for error in errors:
    print(f"- {error}")
```

---

## Command

> Encapsulate a request as an object, allowing parameterization and queuing.

Use for undo/redo, queued operations, or transaction-like behavior.

### Text Editor with Undo/Redo

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


class Command(ABC):
    """Command interface with undo support."""

    @abstractmethod
    def execute(self) -> None:
        pass

    @abstractmethod
    def undo(self) -> None:
        pass


class TextEditor:
    """Receiver - the actual text editor."""

    def __init__(self):
        self._text = ""
        self._cursor = 0

    @property
    def text(self) -> str:
        return self._text

    def insert(self, text: str, position: int) -> None:
        self._text = self._text[:position] + text + self._text[position:]
        self._cursor = position + len(text)

    def delete(self, start: int, length: int) -> str:
        deleted = self._text[start:start + length]
        self._text = self._text[:start] + self._text[start + length:]
        self._cursor = start
        return deleted


@dataclass
class InsertCommand(Command):
    """Command to insert text."""

    editor: TextEditor
    text: str
    position: int

    def execute(self) -> None:
        self.editor.insert(self.text, self.position)

    def undo(self) -> None:
        self.editor.delete(self.position, len(self.text))


@dataclass
class DeleteCommand(Command):
    """Command to delete text."""

    editor: TextEditor
    start: int
    length: int
    _deleted_text: str = field(default="", init=False)

    def execute(self) -> None:
        self._deleted_text = self.editor.delete(self.start, self.length)

    def undo(self) -> None:
        self.editor.insert(self._deleted_text, self.start)


class CommandHistory:
    """Invoker - manages command execution and history."""

    def __init__(self):
        self._history: list[Command] = []
        self._redo_stack: list[Command] = []

    def execute(self, command: Command) -> None:
        command.execute()
        self._history.append(command)
        self._redo_stack.clear()  # Clear redo stack on new command

    def undo(self) -> bool:
        if not self._history:
            return False
        command = self._history.pop()
        command.undo()
        self._redo_stack.append(command)
        return True

    def redo(self) -> bool:
        if not self._redo_stack:
            return False
        command = self._redo_stack.pop()
        command.execute()
        self._history.append(command)
        return True


# Usage
editor = TextEditor()
history = CommandHistory()

# Type some text
history.execute(InsertCommand(editor, "Hello", 0))
print(f"After insert: '{editor.text}'")  # "Hello"

history.execute(InsertCommand(editor, " World", 5))
print(f"After insert: '{editor.text}'")  # "Hello World"

history.execute(DeleteCommand(editor, 5, 6))
print(f"After delete: '{editor.text}'")  # "Hello"

# Undo
history.undo()
print(f"After undo: '{editor.text}'")  # "Hello World"

history.undo()
print(f"After undo: '{editor.text}'")  # "Hello"

# Redo
history.redo()
print(f"After redo: '{editor.text}'")  # "Hello World"
```

### Command with Callable Protocol

```python
from typing import Protocol, Callable
from dataclasses import dataclass


class Command(Protocol):
    """Command as callable with undo."""

    def __call__(self) -> None: ...
    def undo(self) -> None: ...


@dataclass
class LambdaCommand:
    """Command from lambda/function."""

    execute_fn: Callable[[], None]
    undo_fn: Callable[[], None]

    def __call__(self) -> None:
        self.execute_fn()

    def undo(self) -> None:
        self.undo_fn()


# Usage with lambdas
counter = [0]

increment = LambdaCommand(
    execute_fn=lambda: counter.__setitem__(0, counter[0] + 1),
    undo_fn=lambda: counter.__setitem__(0, counter[0] - 1),
)

increment()  # counter[0] = 1
increment()  # counter[0] = 2
increment.undo()  # counter[0] = 1
```

---

## Iterator

> Provide a way to access elements of a collection sequentially without exposing its underlying representation.

Python has built-in support for iterators via `__iter__` and `__next__`.

### Custom Iterator

```python
from typing import Iterator, Generic, TypeVar

T = TypeVar("T")


class LinkedListNode(Generic[T]):
    def __init__(self, value: T):
        self.value = value
        self.next: LinkedListNode[T] | None = None


class LinkedList(Generic[T]):
    """Linked list with iterator support."""

    def __init__(self):
        self._head: LinkedListNode[T] | None = None
        self._size = 0

    def append(self, value: T) -> None:
        node = LinkedListNode(value)
        if not self._head:
            self._head = node
        else:
            current = self._head
            while current.next:
                current = current.next
            current.next = node
        self._size += 1

    def __len__(self) -> int:
        return self._size

    def __iter__(self) -> "LinkedListIterator[T]":
        return LinkedListIterator(self._head)


class LinkedListIterator(Generic[T]):
    """Iterator for LinkedList."""

    def __init__(self, head: LinkedListNode[T] | None):
        self._current = head

    def __iter__(self) -> "LinkedListIterator[T]":
        return self

    def __next__(self) -> T:
        if self._current is None:
            raise StopIteration
        value = self._current.value
        self._current = self._current.next
        return value


# Usage
ll = LinkedList[int]()
ll.append(1)
ll.append(2)
ll.append(3)

for item in ll:
    print(item)  # 1, 2, 3

# Works with built-in functions
print(list(ll))  # [1, 2, 3]
print(sum(ll))   # 6
```

### Generator-Based Iterator

```python
from typing import Iterator, Generator


class BinaryTree:
    """Binary tree with multiple iteration orders."""

    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right

    def inorder(self) -> Generator[int, None, None]:
        """In-order traversal using generator."""
        if self.left:
            yield from self.left.inorder()
        yield self.value
        if self.right:
            yield from self.right.inorder()

    def preorder(self) -> Generator[int, None, None]:
        """Pre-order traversal."""
        yield self.value
        if self.left:
            yield from self.left.preorder()
        if self.right:
            yield from self.right.preorder()

    def postorder(self) -> Generator[int, None, None]:
        """Post-order traversal."""
        if self.left:
            yield from self.left.postorder()
        if self.right:
            yield from self.right.postorder()
        yield self.value

    def levelorder(self) -> Generator[int, None, None]:
        """Level-order (BFS) traversal."""
        from collections import deque
        queue = deque([self])
        while queue:
            node = queue.popleft()
            yield node.value
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)


# Build tree:     4
#               /   \
#              2     6
#             / \   / \
#            1   3 5   7
tree = BinaryTree(
    4,
    BinaryTree(2, BinaryTree(1), BinaryTree(3)),
    BinaryTree(6, BinaryTree(5), BinaryTree(7))
)

print("Inorder:", list(tree.inorder()))      # [1, 2, 3, 4, 5, 6, 7]
print("Preorder:", list(tree.preorder()))    # [4, 2, 1, 3, 6, 5, 7]
print("Postorder:", list(tree.postorder()))  # [1, 3, 2, 5, 7, 6, 4]
print("Levelorder:", list(tree.levelorder()))# [4, 2, 6, 1, 3, 5, 7]
```

### Paginated API Iterator

```python
from typing import Iterator, TypeVar, Generic
from dataclasses import dataclass

T = TypeVar("T")


@dataclass
class Page(Generic[T]):
    items: list[T]
    next_cursor: str | None


class PaginatedIterator(Generic[T]):
    """Iterator that handles pagination automatically."""

    def __init__(self, fetcher, page_size: int = 100):
        self._fetcher = fetcher  # Function to fetch a page
        self._page_size = page_size
        self._cursor: str | None = None
        self._buffer: list[T] = []
        self._exhausted = False

    def __iter__(self) -> "PaginatedIterator[T]":
        return self

    def __next__(self) -> T:
        # Refill buffer if empty
        if not self._buffer and not self._exhausted:
            self._fetch_next_page()

        if not self._buffer:
            raise StopIteration

        return self._buffer.pop(0)

    def _fetch_next_page(self) -> None:
        page = self._fetcher(cursor=self._cursor, limit=self._page_size)
        self._buffer.extend(page.items)
        self._cursor = page.next_cursor
        if page.next_cursor is None:
            self._exhausted = True


# Mock API
def fetch_users(cursor: str | None, limit: int) -> Page[dict]:
    """Simulate paginated API."""
    start = int(cursor) if cursor else 0
    items = [{"id": i, "name": f"User {i}"} for i in range(start, min(start + limit, 25))]
    next_cursor = str(start + limit) if start + limit < 25 else None
    return Page(items=items, next_cursor=next_cursor)


# Usage - handles pagination automatically
for user in PaginatedIterator(fetch_users, page_size=10):
    print(user["name"])
```

---

## Mediator

> Define an object that encapsulates how a set of objects interact.

Use to reduce coupling between components.

### Event Bus / Message Broker

```python
from collections import defaultdict
from typing import Callable, Any
from dataclasses import dataclass


@dataclass
class Event:
    name: str
    data: Any


class EventBus:
    """Mediator that routes events between components."""

    def __init__(self):
        self._handlers: dict[str, list[Callable[[Event], None]]] = defaultdict(list)

    def subscribe(self, event_name: str, handler: Callable[[Event], None]) -> Callable[[], None]:
        """Subscribe to an event. Returns unsubscribe function."""
        self._handlers[event_name].append(handler)
        return lambda: self._handlers[event_name].remove(handler)

    def publish(self, event: Event) -> None:
        """Publish an event to all subscribers."""
        for handler in self._handlers[event.name]:
            try:
                handler(event)
            except Exception as e:
                print(f"Handler error: {e}")

    def publish_async(self, event: Event) -> None:
        """Publish event asynchronously."""
        import threading
        for handler in self._handlers[event.name]:
            threading.Thread(target=handler, args=(event,)).start()


# Components that communicate via mediator
class UserService:
    def __init__(self, bus: EventBus):
        self._bus = bus

    def create_user(self, name: str, email: str) -> dict:
        user = {"id": "123", "name": name, "email": email}
        self._bus.publish(Event("user.created", user))
        return user

    def delete_user(self, user_id: str) -> None:
        self._bus.publish(Event("user.deleted", {"id": user_id}))


class EmailService:
    def __init__(self, bus: EventBus):
        bus.subscribe("user.created", self._on_user_created)
        bus.subscribe("user.deleted", self._on_user_deleted)

    def _on_user_created(self, event: Event) -> None:
        print(f"Sending welcome email to {event.data['email']}")

    def _on_user_deleted(self, event: Event) -> None:
        print(f"Sending goodbye email for user {event.data['id']}")


class AuditService:
    def __init__(self, bus: EventBus):
        bus.subscribe("user.created", self._log_event)
        bus.subscribe("user.deleted", self._log_event)

    def _log_event(self, event: Event) -> None:
        print(f"[AUDIT] {event.name}: {event.data}")


class AnalyticsService:
    def __init__(self, bus: EventBus):
        bus.subscribe("user.created", self._track_signup)

    def _track_signup(self, event: Event) -> None:
        print(f"[ANALYTICS] New signup tracked")


# Setup
bus = EventBus()
user_service = UserService(bus)
email_service = EmailService(bus)
audit_service = AuditService(bus)
analytics_service = AnalyticsService(bus)

# Components don't know about each other
user_service.create_user("Alice", "alice@example.com")
# Output:
# Sending welcome email to alice@example.com
# [AUDIT] user.created: {'id': '123', 'name': 'Alice', 'email': 'alice@example.com'}
# [ANALYTICS] New signup tracked
```

---

## Memento

> Capture and externalize an object's internal state so it can be restored later.

Use for undo functionality, snapshots, or checkpoints.

### Editor with History

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass(frozen=True)
class EditorMemento:
    """Immutable snapshot of editor state."""

    content: str
    cursor_position: int
    timestamp: datetime = field(default_factory=datetime.now)


class TextEditor:
    """Originator - the object whose state we want to save."""

    def __init__(self):
        self._content = ""
        self._cursor = 0

    @property
    def content(self) -> str:
        return self._content

    @property
    def cursor(self) -> int:
        return self._cursor

    def type(self, text: str) -> None:
        self._content = (
            self._content[:self._cursor] + text + self._content[self._cursor:]
        )
        self._cursor += len(text)

    def delete(self, count: int = 1) -> None:
        if self._cursor > 0:
            start = max(0, self._cursor - count)
            self._content = self._content[:start] + self._content[self._cursor:]
            self._cursor = start

    def move_cursor(self, position: int) -> None:
        self._cursor = max(0, min(position, len(self._content)))

    def save(self) -> EditorMemento:
        """Create a memento of current state."""
        return EditorMemento(
            content=self._content,
            cursor_position=self._cursor,
        )

    def restore(self, memento: EditorMemento) -> None:
        """Restore state from memento."""
        self._content = memento.content
        self._cursor = memento.cursor_position


class History(Generic[T]):
    """Caretaker - manages mementos."""

    def __init__(self, max_size: int = 100):
        self._history: list[T] = []
        self._max_size = max_size

    def push(self, memento: T) -> None:
        if len(self._history) >= self._max_size:
            self._history.pop(0)
        self._history.append(memento)

    def pop(self) -> T | None:
        return self._history.pop() if self._history else None

    def peek(self) -> T | None:
        return self._history[-1] if self._history else None

    def __len__(self) -> int:
        return len(self._history)


class EditorWithHistory:
    """Editor with undo support using memento."""

    def __init__(self):
        self._editor = TextEditor()
        self._history = History[EditorMemento]()
        self._save_state()

    def type(self, text: str) -> None:
        self._editor.type(text)
        self._save_state()

    def delete(self, count: int = 1) -> None:
        self._editor.delete(count)
        self._save_state()

    def undo(self) -> bool:
        # Pop current state
        self._history.pop()
        # Get previous state
        memento = self._history.peek()
        if memento:
            self._editor.restore(memento)
            return True
        return False

    def _save_state(self) -> None:
        self._history.push(self._editor.save())

    @property
    def content(self) -> str:
        return self._editor.content


# Usage
editor = EditorWithHistory()
editor.type("Hello")
print(f"Content: '{editor.content}'")  # "Hello"

editor.type(" World")
print(f"Content: '{editor.content}'")  # "Hello World"

editor.undo()
print(f"After undo: '{editor.content}'")  # "Hello"

editor.undo()
print(f"After undo: '{editor.content}'")  # ""
```

---

## Observer

> Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified.

Use for event handling, reactive programming, or notifications.

### Callback-Based Observer

```python
from typing import Callable, TypeVar, Generic
from dataclasses import dataclass, field

T = TypeVar("T")


class Observable(Generic[T]):
    """Subject that notifies observers of changes."""

    def __init__(self, initial_value: T):
        self._value = initial_value
        self._observers: list[Callable[[T, T], None]] = []

    @property
    def value(self) -> T:
        return self._value

    @value.setter
    def value(self, new_value: T) -> None:
        old_value = self._value
        self._value = new_value
        self._notify(old_value, new_value)

    def subscribe(self, observer: Callable[[T, T], None]) -> Callable[[], None]:
        """Subscribe to changes. Returns unsubscribe function."""
        self._observers.append(observer)
        return lambda: self._observers.remove(observer)

    def _notify(self, old_value: T, new_value: T) -> None:
        for observer in self._observers:
            observer(old_value, new_value)


# Usage
temperature = Observable(20.0)

# Subscribe to changes
def log_change(old: float, new: float) -> None:
    print(f"Temperature changed from {old}°C to {new}°C")

def check_alert(old: float, new: float) -> None:
    if new > 30:
        print("WARNING: High temperature!")

unsubscribe_log = temperature.subscribe(log_change)
unsubscribe_alert = temperature.subscribe(check_alert)

temperature.value = 25.0  # Temperature changed from 20.0°C to 25.0°C
temperature.value = 35.0  # Temperature changed... WARNING: High temperature!

# Unsubscribe
unsubscribe_log()
temperature.value = 40.0  # Only alert fires
```

### Property-Based Observer

```python
from typing import Callable, Any


def observable_property(name: str):
    """Decorator to create observable properties."""
    private_name = f"_{name}"
    observers_name = f"_{name}_observers"

    def getter(self) -> Any:
        return getattr(self, private_name, None)

    def setter(self, value: Any) -> None:
        old_value = getattr(self, private_name, None)
        setattr(self, private_name, value)

        # Notify observers
        observers = getattr(self, observers_name, [])
        for observer in observers:
            observer(self, name, old_value, value)

    def subscribe(self, observer: Callable) -> Callable[[], None]:
        observers = getattr(self, observers_name, [])
        if not observers:
            setattr(self, observers_name, observers)
        observers.append(observer)
        return lambda: observers.remove(observer)

    prop = property(getter, setter)
    prop.subscribe = subscribe
    return prop


class Stock:
    """Stock with observable price."""

    def __init__(self, symbol: str, price: float):
        self.symbol = symbol
        self._price = price
        self._price_observers: list = []

    @property
    def price(self) -> float:
        return self._price

    @price.setter
    def price(self, value: float) -> None:
        old = self._price
        self._price = value
        for observer in self._price_observers:
            observer(self, old, value)

    def on_price_change(self, observer: Callable) -> Callable[[], None]:
        self._price_observers.append(observer)
        return lambda: self._price_observers.remove(observer)


# Usage
apple = Stock("AAPL", 150.0)

def log_price(stock: Stock, old: float, new: float) -> None:
    change = new - old
    direction = "▲" if change > 0 else "▼"
    print(f"{stock.symbol}: ${old:.2f} → ${new:.2f} ({direction}{abs(change):.2f})")

apple.on_price_change(log_price)
apple.price = 155.0  # AAPL: $150.00 → $155.00 (▲5.00)
apple.price = 148.0  # AAPL: $155.00 → $148.00 (▼7.00)
```

---

## State

> Allow an object to alter its behavior when its internal state changes.

Use for state machines, workflows, or objects with state-dependent behavior.

### Order State Machine

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


class OrderState(ABC):
    """Abstract state for order."""

    @abstractmethod
    def pay(self, order: "Order") -> None:
        pass

    @abstractmethod
    def ship(self, order: "Order") -> None:
        pass

    @abstractmethod
    def deliver(self, order: "Order") -> None:
        pass

    @abstractmethod
    def cancel(self, order: "Order") -> None:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass


class PendingState(OrderState):
    @property
    def name(self) -> str:
        return "Pending"

    def pay(self, order: "Order") -> None:
        print("Payment received")
        order._state = PaidState()

    def ship(self, order: "Order") -> None:
        raise ValueError("Cannot ship unpaid order")

    def deliver(self, order: "Order") -> None:
        raise ValueError("Cannot deliver unpaid order")

    def cancel(self, order: "Order") -> None:
        print("Order cancelled")
        order._state = CancelledState()


class PaidState(OrderState):
    @property
    def name(self) -> str:
        return "Paid"

    def pay(self, order: "Order") -> None:
        raise ValueError("Order already paid")

    def ship(self, order: "Order") -> None:
        print("Order shipped")
        order._state = ShippedState()

    def deliver(self, order: "Order") -> None:
        raise ValueError("Order must be shipped first")

    def cancel(self, order: "Order") -> None:
        print("Order cancelled, refund initiated")
        order._state = CancelledState()


class ShippedState(OrderState):
    @property
    def name(self) -> str:
        return "Shipped"

    def pay(self, order: "Order") -> None:
        raise ValueError("Order already paid")

    def ship(self, order: "Order") -> None:
        raise ValueError("Order already shipped")

    def deliver(self, order: "Order") -> None:
        print("Order delivered")
        order._state = DeliveredState()

    def cancel(self, order: "Order") -> None:
        raise ValueError("Cannot cancel shipped order")


class DeliveredState(OrderState):
    @property
    def name(self) -> str:
        return "Delivered"

    def pay(self, order: "Order") -> None:
        raise ValueError("Order already completed")

    def ship(self, order: "Order") -> None:
        raise ValueError("Order already delivered")

    def deliver(self, order: "Order") -> None:
        raise ValueError("Order already delivered")

    def cancel(self, order: "Order") -> None:
        raise ValueError("Cannot cancel delivered order")


class CancelledState(OrderState):
    @property
    def name(self) -> str:
        return "Cancelled"

    def pay(self, order: "Order") -> None:
        raise ValueError("Order is cancelled")

    def ship(self, order: "Order") -> None:
        raise ValueError("Order is cancelled")

    def deliver(self, order: "Order") -> None:
        raise ValueError("Order is cancelled")

    def cancel(self, order: "Order") -> None:
        raise ValueError("Order already cancelled")


@dataclass
class Order:
    """Context - order with state-dependent behavior."""

    id: str
    items: list[str]
    _state: OrderState = None

    def __post_init__(self):
        self._state = PendingState()

    @property
    def status(self) -> str:
        return self._state.name

    def pay(self) -> None:
        self._state.pay(self)

    def ship(self) -> None:
        self._state.ship(self)

    def deliver(self) -> None:
        self._state.deliver(self)

    def cancel(self) -> None:
        self._state.cancel(self)


# Usage
order = Order("ORD-001", ["Widget", "Gadget"])
print(f"Status: {order.status}")  # Pending

order.pay()
print(f"Status: {order.status}")  # Paid

order.ship()
print(f"Status: {order.status}")  # Shipped

order.deliver()
print(f"Status: {order.status}")  # Delivered

# Invalid transitions raise errors
try:
    order.cancel()
except ValueError as e:
    print(f"Error: {e}")  # Cannot cancel delivered order
```

---

## Strategy

> Define a family of algorithms, encapsulate each one, and make them interchangeable.

Use when you have multiple ways to do the same thing.

### Payment Processing Strategies

```python
from typing import Protocol
from dataclasses import dataclass


class PaymentStrategy(Protocol):
    """Strategy interface for payment processing."""

    def pay(self, amount: float) -> str: ...


class CreditCardPayment:
    def __init__(self, card_number: str, cvv: str):
        self._card = card_number
        self._cvv = cvv

    def pay(self, amount: float) -> str:
        # Process credit card payment
        return f"Paid ${amount:.2f} with card ending in {self._card[-4:]}"


class PayPalPayment:
    def __init__(self, email: str):
        self._email = email

    def pay(self, amount: float) -> str:
        return f"Paid ${amount:.2f} via PayPal ({self._email})"


class CryptoPayment:
    def __init__(self, wallet: str, currency: str = "BTC"):
        self._wallet = wallet
        self._currency = currency

    def pay(self, amount: float) -> str:
        return f"Paid ${amount:.2f} in {self._currency} to {self._wallet[:8]}..."


class BankTransferPayment:
    def __init__(self, account: str, routing: str):
        self._account = account
        self._routing = routing

    def pay(self, amount: float) -> str:
        return f"Paid ${amount:.2f} via bank transfer"


@dataclass
class ShoppingCart:
    """Context that uses payment strategy."""

    items: list[tuple[str, float]]
    payment_strategy: PaymentStrategy | None = None

    @property
    def total(self) -> float:
        return sum(price for _, price in self.items)

    def set_payment_method(self, strategy: PaymentStrategy) -> None:
        self.payment_strategy = strategy

    def checkout(self) -> str:
        if not self.payment_strategy:
            raise ValueError("Payment method not set")
        return self.payment_strategy.pay(self.total)


# Usage
cart = ShoppingCart([("Widget", 29.99), ("Gadget", 49.99)])

# Pay with credit card
cart.set_payment_method(CreditCardPayment("4111111111111111", "123"))
print(cart.checkout())  # Paid $79.98 with card ending in 1111

# Pay with PayPal
cart.set_payment_method(PayPalPayment("user@example.com"))
print(cart.checkout())  # Paid $79.98 via PayPal (user@example.com)

# Pay with crypto
cart.set_payment_method(CryptoPayment("0x1234567890abcdef"))
print(cart.checkout())  # Paid $79.98 in BTC to 0x123456...
```

### Function-Based Strategy

```python
from typing import Callable

# Strategy as function type
SortStrategy = Callable[[list], list]


def bubble_sort(items: list) -> list:
    """Simple bubble sort."""
    items = items.copy()
    n = len(items)
    for i in range(n):
        for j in range(0, n - i - 1):
            if items[j] > items[j + 1]:
                items[j], items[j + 1] = items[j + 1], items[j]
    return items


def quick_sort(items: list) -> list:
    """Quick sort implementation."""
    if len(items) <= 1:
        return items
    pivot = items[len(items) // 2]
    left = [x for x in items if x < pivot]
    middle = [x for x in items if x == pivot]
    right = [x for x in items if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)


def merge_sort(items: list) -> list:
    """Merge sort implementation."""
    if len(items) <= 1:
        return items
    mid = len(items) // 2
    left = merge_sort(items[:mid])
    right = merge_sort(items[mid:])

    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result


class Sorter:
    """Context that uses sort strategy."""

    def __init__(self, strategy: SortStrategy = quick_sort):
        self._strategy = strategy

    def set_strategy(self, strategy: SortStrategy) -> None:
        self._strategy = strategy

    def sort(self, items: list) -> list:
        return self._strategy(items)


# Usage
sorter = Sorter()
data = [64, 34, 25, 12, 22, 11, 90]

sorter.set_strategy(bubble_sort)
print(f"Bubble: {sorter.sort(data)}")

sorter.set_strategy(quick_sort)
print(f"Quick: {sorter.sort(data)}")

sorter.set_strategy(merge_sort)
print(f"Merge: {sorter.sort(data)}")
```

---

## Template Method

> Define the skeleton of an algorithm, deferring some steps to subclasses.

Use when you have algorithms with common structure but varying details.

### Data Processing Pipeline

```python
from abc import ABC, abstractmethod
from typing import Any


class DataProcessor(ABC):
    """Template for data processing."""

    def process(self, source: str, destination: str) -> None:
        """Template method - defines algorithm skeleton."""
        data = self.read(source)
        validated = self.validate(data)
        transformed = self.transform(validated)
        self.write(transformed, destination)

    @abstractmethod
    def read(self, source: str) -> Any:
        """Read data from source."""
        pass

    def validate(self, data: Any) -> Any:
        """Validate data - hook with default implementation."""
        return data  # Default: no validation

    @abstractmethod
    def transform(self, data: Any) -> Any:
        """Transform data."""
        pass

    @abstractmethod
    def write(self, data: Any, destination: str) -> None:
        """Write data to destination."""
        pass


class CSVToJSONProcessor(DataProcessor):
    """Process CSV to JSON."""

    def read(self, source: str) -> list[dict]:
        print(f"Reading CSV from {source}")
        # Simulate reading CSV
        return [
            {"name": "Alice", "age": "30"},
            {"name": "Bob", "age": "25"},
        ]

    def validate(self, data: list[dict]) -> list[dict]:
        print("Validating CSV data")
        # Check required fields
        for row in data:
            if "name" not in row:
                raise ValueError("Missing name field")
        return data

    def transform(self, data: list[dict]) -> list[dict]:
        print("Transforming to JSON format")
        # Convert age to int
        return [{**row, "age": int(row["age"])} for row in data]

    def write(self, data: list[dict], destination: str) -> None:
        import json
        print(f"Writing JSON to {destination}")
        # Simulate writing JSON
        print(json.dumps(data, indent=2))


class XMLToCSVProcessor(DataProcessor):
    """Process XML to CSV."""

    def read(self, source: str) -> list[dict]:
        print(f"Reading XML from {source}")
        return [{"id": "1", "value": "100"}, {"id": "2", "value": "200"}]

    def transform(self, data: list[dict]) -> str:
        print("Transforming to CSV format")
        if not data:
            return ""
        headers = ",".join(data[0].keys())
        rows = [",".join(row.values()) for row in data]
        return headers + "\n" + "\n".join(rows)

    def write(self, data: str, destination: str) -> None:
        print(f"Writing CSV to {destination}")
        print(data)


# Usage
csv_processor = CSVToJSONProcessor()
csv_processor.process("input.csv", "output.json")

print("\n" + "=" * 40 + "\n")

xml_processor = XMLToCSVProcessor()
xml_processor.process("input.xml", "output.csv")
```

---

## Visitor

> Represent an operation to be performed on elements of an object structure.

Use when you need to perform operations on a complex object structure.

### AST Visitor with singledispatch

```python
from functools import singledispatch
from dataclasses import dataclass
from typing import Any


# Expression AST nodes
@dataclass
class Expr:
    """Base expression class."""
    pass


@dataclass
class Number(Expr):
    value: float


@dataclass
class BinaryOp(Expr):
    op: str
    left: Expr
    right: Expr


@dataclass
class UnaryOp(Expr):
    op: str
    operand: Expr


@dataclass
class Variable(Expr):
    name: str


# Visitor using singledispatch
@singledispatch
def evaluate(expr: Expr, env: dict[str, float] = None) -> float:
    """Evaluate an expression."""
    raise NotImplementedError(f"Cannot evaluate {type(expr)}")


@evaluate.register
def _(expr: Number, env: dict[str, float] = None) -> float:
    return expr.value


@evaluate.register
def _(expr: BinaryOp, env: dict[str, float] = None) -> float:
    env = env or {}
    left = evaluate(expr.left, env)
    right = evaluate(expr.right, env)

    ops = {
        "+": lambda a, b: a + b,
        "-": lambda a, b: a - b,
        "*": lambda a, b: a * b,
        "/": lambda a, b: a / b,
        "**": lambda a, b: a ** b,
    }
    return ops[expr.op](left, right)


@evaluate.register
def _(expr: UnaryOp, env: dict[str, float] = None) -> float:
    env = env or {}
    operand = evaluate(expr.operand, env)

    if expr.op == "-":
        return -operand
    elif expr.op == "+":
        return operand
    raise ValueError(f"Unknown unary operator: {expr.op}")


@evaluate.register
def _(expr: Variable, env: dict[str, float] = None) -> float:
    env = env or {}
    if expr.name not in env:
        raise ValueError(f"Undefined variable: {expr.name}")
    return env[expr.name]


# Another visitor: pretty printer
@singledispatch
def to_string(expr: Expr) -> str:
    """Convert expression to string."""
    raise NotImplementedError(f"Cannot stringify {type(expr)}")


@to_string.register
def _(expr: Number) -> str:
    return str(expr.value)


@to_string.register
def _(expr: BinaryOp) -> str:
    return f"({to_string(expr.left)} {expr.op} {to_string(expr.right)})"


@to_string.register
def _(expr: UnaryOp) -> str:
    return f"{expr.op}{to_string(expr.operand)}"


@to_string.register
def _(expr: Variable) -> str:
    return expr.name


# Build expression: (x + 3) * 2
expr = BinaryOp(
    "*",
    BinaryOp("+", Variable("x"), Number(3)),
    Number(2)
)

print(f"Expression: {to_string(expr)}")  # ((x + 3) * 2)
print(f"Evaluate with x=5: {evaluate(expr, {'x': 5})}")  # 16.0
```

---

## Python-Specific Patterns

### Context Manager Pattern

```python
from contextlib import contextmanager
from typing import Generator
import time


@contextmanager
def timer(name: str) -> Generator[None, None, None]:
    """Time a block of code."""
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{name} took {elapsed:.4f}s")


@contextmanager
def transaction(connection) -> Generator:
    """Database transaction context manager."""
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise


@contextmanager
def temporary_attribute(obj: object, name: str, value) -> Generator:
    """Temporarily set an attribute."""
    old_value = getattr(obj, name, None)
    setattr(obj, name, value)
    try:
        yield
    finally:
        if old_value is None:
            delattr(obj, name)
        else:
            setattr(obj, name, old_value)


# Usage
with timer("Data processing"):
    time.sleep(0.1)
    # ... do work
```

### Coroutine-Based Patterns

```python
import asyncio
from typing import AsyncGenerator


async def async_observer(events: asyncio.Queue) -> None:
    """Async observer using queue."""
    while True:
        event = await events.get()
        if event is None:  # Shutdown signal
            break
        print(f"Received: {event}")


async def async_producer(events: asyncio.Queue) -> None:
    """Produce events asynchronously."""
    for i in range(5):
        await asyncio.sleep(0.1)
        await events.put(f"Event {i}")
    await events.put(None)  # Shutdown signal


async def main():
    events = asyncio.Queue()
    await asyncio.gather(
        async_observer(events),
        async_producer(events),
    )


# asyncio.run(main())
```

---

## Interview Questions

### Q1: What's the difference between Strategy and State patterns?

**Answer**:

| Aspect | Strategy | State |
|--------|----------|-------|
| **Purpose** | Interchangeable algorithms | State-dependent behavior |
| **Who controls change** | Client sets strategy | Object changes its own state |
| **Awareness** | Strategies don't know about each other | States know valid transitions |
| **Use case** | Different ways to do same thing | Object acts differently based on state |

```python
# Strategy - client chooses algorithm
cart.set_payment_method(CreditCardPayment())  # Client decides

# State - object manages its own transitions
order.pay()  # Order changes from Pending to Paid internally
```

### Q2: When would you use Chain of Responsibility vs Strategy?

**Answer**:
- **Chain of Responsibility**: Request passes through multiple handlers, each can process OR pass along
- **Strategy**: Single algorithm selected from multiple options

```python
# Chain - multiple handlers, request passes through
auth_handler.set_next(rate_limit).set_next(validation).set_next(handler)
# Each handler can stop the chain or continue

# Strategy - one algorithm, interchangeable
sorter.set_strategy(quick_sort)  # OR merge_sort OR bubble_sort
# Only one executes
```

### Q3: How does Python's `@singledispatch` enable the Visitor pattern?

**Answer**: `@singledispatch` provides multiple dispatch based on the first argument's type, eliminating the need for explicit accept methods:

```python
# Traditional Visitor - requires accept() on each element
class Element:
    def accept(self, visitor): ...

# Python singledispatch - no accept() needed
@singledispatch
def visit(element):
    raise NotImplementedError()

@visit.register
def _(element: ConcreteA):
    return "Visiting A"

@visit.register
def _(element: ConcreteB):
    return "Visiting B"

# Just call visit(element) - dispatches automatically
```

### Q4: What are the benefits of using generators for iterators?

**Answer**:
1. **Simpler code**: No `__iter__`/`__next__` boilerplate
2. **State is automatic**: Local variables preserved between yields
3. **Memory efficient**: Values generated on demand
4. **Composable**: `yield from` chains generators

```python
# Without generator
class Range:
    def __init__(self, n):
        self.n = n
        self.i = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.i >= self.n:
            raise StopIteration
        val = self.i
        self.i += 1
        return val

# With generator - same behavior
def range_gen(n):
    i = 0
    while i < n:
        yield i
        i += 1
```

### Q5: How do you implement undo/redo functionality?

**Answer**: Use **Command** pattern with **Memento**:

1. **Command**: Encapsulate actions with `execute()` and `undo()`
2. **Memento**: Store object state snapshots
3. **History**: Manage stack of commands/mementos

```python
class CommandHistory:
    def __init__(self):
        self._undo_stack = []
        self._redo_stack = []

    def execute(self, command):
        command.execute()
        self._undo_stack.append(command)
        self._redo_stack.clear()

    def undo(self):
        if self._undo_stack:
            cmd = self._undo_stack.pop()
            cmd.undo()
            self._redo_stack.append(cmd)

    def redo(self):
        if self._redo_stack:
            cmd = self._redo_stack.pop()
            cmd.execute()
            self._undo_stack.append(cmd)
```

---

## Quick Reference

### Pattern Selection

| Need | Pattern |
|------|---------|
| Request handling chain | Chain of Responsibility |
| Encapsulate actions | Command |
| Sequential access | Iterator |
| Loose coupling | Mediator |
| Save/restore state | Memento |
| Change notifications | Observer |
| State-dependent behavior | State |
| Interchangeable algorithms | Strategy |
| Algorithm skeleton | Template Method |
| Operations on structure | Visitor |

### Python Idioms

| Pattern | Python Idiom |
|---------|--------------|
| Iterator | Generators, `__iter__`/`__next__` |
| Observer | Callbacks, event bus |
| Strategy | Functions as strategies |
| Visitor | `@singledispatch` |
| Template | ABC with abstract methods |
| Command | Callable objects |
| Memento | `@dataclass(frozen=True)` |

### Common Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Observer memory leak | Observers not unsubscribed | Return unsubscribe function |
| State explosion | Too many state classes | Use state enum for simple cases |
| Chain too long | Performance, hard to debug | Limit chain depth |
| Command without undo | Can't reverse actions | Store inverse operation |

---

**Next**: [13-anti-patterns-best-practices.md](13-anti-patterns-best-practices.md) — Anti-Patterns and Best Practices
