# Test-Driven Development in Python

> Write tests first, code second — and think like a QA engineer while doing both

Test-Driven Development (TDD) is a discipline that transforms how you write code. Instead of writing code and then testing it, you write tests first and let them drive your implementation. This guide covers TDD methodology, Python-specific testing patterns, and most importantly — how to develop the **QA mindset** that separates good tests from great ones.

While [08-tooling-testing.md](08-tooling-testing.md) covers basic pytest and unittest mechanics, this guide focuses on **methodology, strategy, and anti-patterns**.

**Reading time**: 90-120 minutes

---

## Table of Contents

1. [Why TDD? The Case for Test-First Development](#why-tdd-the-case-for-test-first-development)
2. [The TDD Cycle: Red-Green-Refactor](#the-tdd-cycle-red-green-refactor)
3. [Thinking Like a QA Engineer](#thinking-like-a-qa-engineer)
4. [pytest Deep Dive](#pytest-deep-dive)
5. [unittest Advanced Patterns](#unittest-advanced-patterns)
6. [Mocking and Test Doubles](#mocking-and-test-doubles)
7. [Property-Based Testing with Hypothesis](#property-based-testing-with-hypothesis)
8. [Test Design Strategies](#test-design-strategies)
9. [Writing Testable Code](#writing-testable-code)
10. [TDD Anti-Patterns](#tdd-anti-patterns)
11. [Test Code Smells](#test-code-smells)
12. [The Test Pyramid](#the-test-pyramid)
13. [Coverage and Mutation Testing](#coverage-and-mutation-testing)
14. [TDD Workflows](#tdd-workflows)
15. [TDD for Different Scenarios](#tdd-for-different-scenarios)
16. [When NOT to Use TDD](#when-not-to-use-tdd)
17. [Interview Questions](#interview-questions)
18. [Quick Reference Cards](#quick-reference-cards)
19. [Resources](#resources)

---

## Why TDD? The Case for Test-First Development

### The Problem with Test-After

Traditional development follows this pattern:

```
Write code → Manual testing → Write tests (maybe) → Move on
```

This approach has several problems:

| Problem | Consequence |
|---------|-------------|
| **Tests as an afterthought** | Tests document what code does, not what it should do |
| **Confirmation bias** | You test to prove code works, not to find bugs |
| **Untestable code** | Code written without tests in mind is hard to test |
| **Skipped tests** | Under time pressure, tests are first to be cut |
| **Regression blindness** | Changes break things you don't realize |

### The TDD Promise

TDD inverts the process:

```
Write failing test → Write minimal code → Test passes → Refactor → Repeat
```

**Benefits of TDD:**

| Benefit | Impact |
|---------|--------|
| **Executable specifications** | Tests document requirements, not just behavior |
| **Design feedback** | Hard-to-test code signals design problems |
| **Confidence** | Every change is verified against expectations |
| **Regression safety** | Refactoring with a safety net |
| **Focus** | Write only code that's needed (YAGNI) |

### Evidence for TDD

Studies show TDD's impact:

| Study | Finding |
|-------|---------|
| **IBM Case Study** | 40% fewer defects with 15-35% more initial time |
| **Microsoft Research** | 60-90% reduction in defect density |
| **Quality Improvement Studies** | Code written TDD-style has 40-80% fewer bugs |

The initial time investment pays off through reduced debugging and maintenance.

---

## The TDD Cycle: Red-Green-Refactor

TDD follows a strict three-phase cycle:

```
┌─────────────────────────────────────────────┐
│                                             │
│    ┌───────┐    ┌───────┐    ┌──────────┐  │
│    │       │    │       │    │          │  │
│    │  RED  │───►│ GREEN │───►│ REFACTOR │  │
│    │       │    │       │    │          │  │
│    └───────┘    └───────┘    └──────────┘  │
│         ▲                          │       │
│         └──────────────────────────┘       │
│                                             │
└─────────────────────────────────────────────┘
```

### Phase 1: Red — Write a Failing Test

Write a test for behavior that doesn't exist yet.

```python
# test_email_validator.py
import pytest
from email_validator import validate_email, InvalidEmailError

def test_validate_email_rejects_empty_string():
    """Empty string should raise InvalidEmailError."""
    with pytest.raises(InvalidEmailError):
        validate_email("")
```

**Rules:**
- Test must fail for the right reason (missing code, not syntax error)
- Test should be small and focused on one behavior
- Test name should describe the expected behavior

Run the test — it fails because the module doesn't exist:

```bash
$ pytest test_email_validator.py
ModuleNotFoundError: No module named 'email_validator'
```

### Phase 2: Green — Make It Pass

Write the **minimum** code to make the test pass.

```python
# email_validator.py
class InvalidEmailError(Exception):
    """Raised when email validation fails."""
    pass

def validate_email(email: str) -> str:
    """Validate an email address and return it if valid."""
    if email == "":
        raise InvalidEmailError("Email cannot be empty")
    return email
```

**Rules:**
- Write the simplest code that passes
- Don't add features the test doesn't require
- It's OK if the code is ugly — you'll fix it next

Run the test — it passes:

```bash
$ pytest test_email_validator.py
PASSED
```

### Phase 3: Refactor — Improve the Code

Now improve the code while keeping tests green.

```python
# email_validator.py (refactored)
class InvalidEmailError(Exception):
    """Raised when email validation fails."""
    pass

def validate_email(email: str) -> str:
    """Validate an email address and return it if valid.

    Args:
        email: The email address to validate

    Returns:
        The validated email address

    Raises:
        InvalidEmailError: If the email is invalid
    """
    if not email:  # More Pythonic
        raise InvalidEmailError("Email cannot be empty")
    return email
```

**Rules:**
- Tests must pass after every change
- Improve both production code AND test code
- Remove duplication, improve names, simplify logic
- Don't add new functionality — that requires a new Red phase

### The Complete Cycle: Email Validator Example

Let's build a complete email validator step by step:

**Cycle 1: Empty email**

```python
# Red
def test_validate_email_rejects_empty_string():
    with pytest.raises(InvalidEmailError):
        validate_email("")

# Green
def validate_email(email: str) -> str:
    if not email:
        raise InvalidEmailError("Email cannot be empty")
    return email
```

**Cycle 2: Missing @ symbol**

```python
# Red
def test_validate_email_requires_at_symbol():
    with pytest.raises(InvalidEmailError):
        validate_email("invalid.email")

# Green
def validate_email(email: str) -> str:
    if not email:
        raise InvalidEmailError("Email cannot be empty")
    if "@" not in email:
        raise InvalidEmailError("Email must contain @")
    return email
```

**Cycle 3: Valid email passes**

```python
# Red (this should pass, so we verify the happy path)
def test_validate_email_accepts_valid_email():
    result = validate_email("user@example.com")
    assert result == "user@example.com"

# Green: Already passes! Move to refactor.
```

**Cycle 4: Local part cannot be empty**

```python
# Red
def test_validate_email_requires_local_part():
    with pytest.raises(InvalidEmailError):
        validate_email("@example.com")

# Green
def validate_email(email: str) -> str:
    if not email:
        raise InvalidEmailError("Email cannot be empty")
    if "@" not in email:
        raise InvalidEmailError("Email must contain @")
    local, _, domain = email.partition("@")
    if not local:
        raise InvalidEmailError("Email must have local part")
    return email
```

**Cycle 5: Domain cannot be empty**

```python
# Red
def test_validate_email_requires_domain():
    with pytest.raises(InvalidEmailError):
        validate_email("user@")

# Green
def validate_email(email: str) -> str:
    if not email:
        raise InvalidEmailError("Email cannot be empty")
    if "@" not in email:
        raise InvalidEmailError("Email must contain @")
    local, _, domain = email.partition("@")
    if not local:
        raise InvalidEmailError("Email must have local part")
    if not domain:
        raise InvalidEmailError("Email must have domain")
    return email
```

**Refactor: Extract validation logic**

```python
# email_validator.py (final)
import re

class InvalidEmailError(Exception):
    """Raised when email validation fails."""
    pass

# Simple email regex (not RFC 5322 compliant, but practical)
EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

def validate_email(email: str) -> str:
    """Validate an email address.

    Args:
        email: The email address to validate

    Returns:
        The validated email address (normalized to lowercase)

    Raises:
        InvalidEmailError: If the email is invalid
    """
    if not email:
        raise InvalidEmailError("Email cannot be empty")

    if not EMAIL_PATTERN.match(email):
        raise InvalidEmailError(f"Invalid email format: {email}")

    return email.lower()
```

---

## Thinking Like a QA Engineer

The biggest difference between a developer and QA engineer is **mindset**:

| Developer Mindset | QA Mindset |
|-------------------|------------|
| "How do I make this work?" | "How can I break this?" |
| Tests prove code works | Tests find defects |
| Focus on happy path | Focus on edge cases |
| "It works on my machine" | "What about other environments?" |

### Edge Case Hunting Techniques

#### 1. Boundary Value Analysis

Test at the edges of valid ranges:

```python
def test_age_validation():
    """Test boundary values for age field (valid: 0-150)."""
    # At boundaries
    assert is_valid_age(0)     # Minimum valid
    assert is_valid_age(150)   # Maximum valid

    # Just outside boundaries
    assert not is_valid_age(-1)   # Below minimum
    assert not is_valid_age(151)  # Above maximum

    # Just inside boundaries
    assert is_valid_age(1)     # One above minimum
    assert is_valid_age(149)   # One below maximum
```

#### 2. Equivalence Partitioning

Divide inputs into groups that should behave the same:

```python
def test_discount_tiers():
    """Test discount calculation for different purchase amounts."""
    # Partition 1: No discount (< $100)
    assert calculate_discount(50) == 0
    assert calculate_discount(99.99) == 0

    # Partition 2: 10% discount ($100-$499)
    assert calculate_discount(100) == 10
    assert calculate_discount(250) == 25

    # Partition 3: 20% discount ($500+)
    assert calculate_discount(500) == 100
    assert calculate_discount(1000) == 200
```

#### 3. Error Guessing

Use experience to anticipate common errors:

```python
def test_string_processing_edge_cases():
    """Test with inputs that commonly cause bugs."""
    process = string_processor

    # Empty/null-like inputs
    assert process("") == ""
    assert process("   ") == ""  # Whitespace only

    # Special characters
    assert process("hello\nworld") == "hello world"  # Newlines
    assert process("hello\tworld") == "hello world"  # Tabs
    assert process("hello\0world") == "hello world"  # Null char

    # Unicode
    assert process("héllo") == "hello"  # Accented chars
    assert process("你好") == ""         # Non-ASCII

    # Very long strings
    assert len(process("a" * 1_000_000)) <= 1000  # Truncation

    # SQL injection attempt
    assert "DROP TABLE" not in process("'; DROP TABLE users;--")
```

#### 4. State Transition Testing

Test behavior across state changes:

```python
class TestShoppingCart:
    """Test cart state transitions."""

    def test_empty_cart_to_has_items(self):
        """Adding item to empty cart."""
        cart = ShoppingCart()
        assert cart.is_empty

        cart.add_item("SKU123", quantity=1)

        assert not cart.is_empty
        assert cart.item_count == 1

    def test_remove_last_item_returns_to_empty(self):
        """Removing last item returns cart to empty state."""
        cart = ShoppingCart()
        cart.add_item("SKU123", quantity=1)

        cart.remove_item("SKU123")

        assert cart.is_empty
        assert cart.item_count == 0

    def test_checkout_clears_cart(self):
        """Successful checkout empties cart."""
        cart = ShoppingCart()
        cart.add_item("SKU123", quantity=2)

        cart.checkout(payment_info={})

        assert cart.is_empty

### The ZOMBIES Acronym

A useful mnemonic for edge cases:

| Letter | Meaning | Example |
|--------|---------|---------|
| **Z** | Zero | Empty list, zero quantity |
| **O** | One | Single element, first item |
| **M** | Many | Multiple items, large datasets |
| **B** | Boundary | Min/max values, edge of ranges |
| **I** | Interface | Public API, contracts |
| **E** | Exception | Error conditions, invalid input |
| **S** | Simple/Scenarios | Happy path, real-world use cases |

```python
class TestStack:
    """Test stack using ZOMBIES."""

    # Z - Zero
    def test_empty_stack_has_zero_size(self):
        assert Stack().size() == 0

    def test_pop_empty_stack_raises(self):
        with pytest.raises(EmptyStackError):
            Stack().pop()

    # O - One
    def test_push_one_item(self):
        stack = Stack()
        stack.push("item")
        assert stack.size() == 1
        assert stack.peek() == "item"

    # M - Many
    def test_push_multiple_items(self):
        stack = Stack()
        for i in range(100):
            stack.push(i)
        assert stack.size() == 100
        assert stack.pop() == 99  # LIFO

    # B - Boundary
    def test_large_number_of_items(self):
        stack = Stack(max_size=1000)
        for i in range(1000):
            stack.push(i)
        with pytest.raises(StackOverflowError):
            stack.push("overflow")

    # E - Exception
    def test_peek_empty_stack_raises(self):
        with pytest.raises(EmptyStackError):
            Stack().peek()
```

---

## pytest Deep Dive

### Advanced Fixtures

#### Fixture Scopes

```python
import pytest

@pytest.fixture(scope="function")  # Default: new instance per test
def user():
    return User("test@example.com")

@pytest.fixture(scope="class")  # Shared within test class
def database():
    db = Database()
    yield db
    db.close()

@pytest.fixture(scope="module")  # Shared within test module
def api_client():
    return APIClient()

@pytest.fixture(scope="session")  # Shared across entire test session
def config():
    return load_config()
```

#### Factory Fixtures

```python
@pytest.fixture
def make_user():
    """Factory fixture for creating users with custom attributes."""
    created = []

    def _make_user(email="test@example.com", name="Test User", **kwargs):
        user = User(email=email, name=name, **kwargs)
        created.append(user)
        return user

    yield _make_user

    # Cleanup
    for user in created:
        user.delete()

def test_user_creation(make_user):
    user1 = make_user(email="alice@example.com")
    user2 = make_user(email="bob@example.com", role="admin")

    assert user1.email != user2.email
    assert user2.role == "admin"
```

#### Fixture Composition

```python
@pytest.fixture
def database():
    db = Database()
    yield db
    db.close()

@pytest.fixture
def user_repository(database):
    """Depends on database fixture."""
    return UserRepository(database)

@pytest.fixture
def authenticated_user(user_repository, make_user):
    """Depends on multiple fixtures."""
    user = make_user()
    user_repository.save(user)
    return user

def test_user_profile(authenticated_user, user_repository):
    """Uses composed fixtures."""
    profile = user_repository.get_profile(authenticated_user.id)
    assert profile is not None
```

#### Parametrized Fixtures

```python
@pytest.fixture(params=["sqlite", "postgres", "mysql"])
def database(request):
    """Run tests against multiple database backends."""
    db_type = request.param
    db = create_database(db_type)
    yield db
    db.close()

def test_user_save(database):
    """This test runs 3 times - once per database type."""
    user = User("test@example.com")
    database.save(user)
    assert database.get(user.id) == user
```

### Advanced Markers

```python
import pytest
import sys

# Skip with condition
@pytest.mark.skipif(sys.version_info < (3, 10), reason="Requires Python 3.10+")
def test_pattern_matching():
    pass

# Expected failure
@pytest.mark.xfail(reason="Known bug, fix pending")
def test_known_broken_feature():
    pass

# Custom markers
@pytest.mark.slow
def test_large_dataset():
    pass

@pytest.mark.integration
def test_external_api():
    pass

# Run specific markers:
# pytest -m slow
# pytest -m "not slow"
# pytest -m "slow and integration"
```

### Parametrize with IDs

```python
@pytest.mark.parametrize("email,expected_valid", [
    pytest.param("user@example.com", True, id="valid_email"),
    pytest.param("", False, id="empty_string"),
    pytest.param("no-at-symbol", False, id="missing_at"),
    pytest.param("@no-local.com", False, id="missing_local_part"),
    pytest.param("user@", False, id="missing_domain"),
])
def test_email_validation(email, expected_valid):
    result = is_valid_email(email)
    assert result == expected_valid
```

### conftest.py Patterns

```python
# conftest.py - shared fixtures and hooks

import pytest
from pathlib import Path

# Fixtures available to all tests in this directory and subdirectories
@pytest.fixture
def temp_dir(tmp_path):
    """Create a temporary directory with test files."""
    test_file = tmp_path / "test.txt"
    test_file.write_text("test content")
    return tmp_path

@pytest.fixture(autouse=True)
def reset_singleton():
    """Automatically reset singleton before each test."""
    MySingleton._instance = None
    yield
    MySingleton._instance = None

# Hooks
def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "integration: marks integration tests")

def pytest_collection_modifyitems(config, items):
    """Skip slow tests unless --slow flag is passed."""
    if not config.getoption("--slow"):
        skip_slow = pytest.mark.skip(reason="need --slow option to run")
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)

def pytest_addoption(parser):
    """Add custom command line options."""
    parser.addoption("--slow", action="store_true", help="run slow tests")
```

---

## unittest Advanced Patterns

### assertRaises with Context

```python
import unittest

class TestEmailValidator(unittest.TestCase):
    def test_empty_email_raises_with_message(self):
        """Verify exception message content."""
        with self.assertRaises(ValueError) as context:
            validate_email("")

        self.assertIn("cannot be empty", str(context.exception))

    def test_invalid_email_raises_specific_error(self):
        """Verify exception type and message."""
        with self.assertRaisesRegex(ValueError, r"Invalid email.*@"):
            validate_email("no-at-symbol")
```

### assertLogs

```python
import unittest
import logging

class TestLogging(unittest.TestCase):
    def test_warning_logged_on_retry(self):
        """Verify warning is logged when operation retries."""
        with self.assertLogs('myapp.retry', level='WARNING') as logs:
            retry_operation()

        self.assertEqual(len(logs.output), 1)
        self.assertIn("Retrying", logs.output[0])

    def test_debug_logging_captures_details(self):
        """Verify debug information is logged."""
        with self.assertLogs('myapp', level='DEBUG') as logs:
            process_request({"id": 123})

        # Find the specific log entry
        debug_logs = [log for log in logs.output if 'DEBUG' in log]
        self.assertTrue(any("request_id=123" in log for log in debug_logs))
```

### subTest for Data-Driven Tests

```python
import unittest

class TestMathOperations(unittest.TestCase):
    def test_square_multiple_values(self):
        """Test square function with multiple inputs."""
        test_cases = [
            (0, 0),
            (1, 1),
            (2, 4),
            (3, 9),
            (-2, 4),
            (0.5, 0.25),
        ]

        for value, expected in test_cases:
            with self.subTest(value=value):
                result = square(value)
                self.assertEqual(result, expected)
```

---

## Mocking and Test Doubles

### Types of Test Doubles

| Type | Purpose | Example Use |
|------|---------|-------------|
| **Dummy** | Fill parameter lists | Unused logger passed to constructor |
| **Stub** | Provide canned answers | Return fixed data from API |
| **Fake** | Working implementation (simplified) | In-memory database |
| **Mock** | Verify interactions | Check that email was "sent" |
| **Spy** | Record interactions | Track method calls for later assertion |

### unittest.mock Deep Dive

```python
from unittest.mock import Mock, MagicMock, patch, call

# Basic Mock
mock = Mock()
mock.method.return_value = 42
result = mock.method()  # 42

# Verify calls
mock.method.assert_called_once()
mock.method.assert_called_with()
mock.method.assert_not_called()

# Call history
mock.method("arg1", key="value")
mock.method.call_args  # call('arg1', key='value')
mock.method.call_count  # 1

# Side effects
mock.method.side_effect = ValueError("Error!")
# mock.method()  # Raises ValueError

mock.method.side_effect = [1, 2, 3]
mock.method()  # 1
mock.method()  # 2
mock.method()  # 3
```

### The Critical Rule: Patch Where It's Used

```python
# myapp/service.py
from myapp.client import APIClient

def fetch_user(user_id):
    client = APIClient()
    return client.get(f"/users/{user_id}")

# test_service.py
from unittest.mock import patch

# WRONG: Patching where it's defined
@patch('myapp.client.APIClient')
def test_fetch_user_wrong(mock_client):
    # This doesn't work because service.py already imported APIClient
    pass

# CORRECT: Patch where it's used (looked up)
@patch('myapp.service.APIClient')
def test_fetch_user_correct(mock_client_class):
    # This works!
    mock_client = mock_client_class.return_value
    mock_client.get.return_value = {"id": 1, "name": "Alice"}

    result = fetch_user(1)

    assert result["name"] == "Alice"
    mock_client.get.assert_called_once_with("/users/1")
```

### pytest-mock

```python
def test_with_mocker(mocker):
    """pytest-mock provides a cleaner interface."""
    # Patch
    mock_client = mocker.patch('myapp.service.APIClient')
    mock_client.return_value.get.return_value = {"id": 1}

    # Spy (track calls to real object)
    spy = mocker.spy(real_object, 'method')
    real_object.method("arg")
    spy.assert_called_once_with("arg")

    # Stub attribute
    mocker.patch.object(obj, 'attribute', new="value")
```

### Monkeypatch for Simple Cases

```python
def test_with_monkeypatch(monkeypatch):
    """monkeypatch is good for environment and simple mocks."""
    # Environment variables
    monkeypatch.setenv("API_KEY", "test-key")
    monkeypatch.delenv("DEBUG", raising=False)

    # Attributes
    monkeypatch.setattr(module, "CONSTANT", 999)

    # Dictionary items
    monkeypatch.setitem(config_dict, "timeout", 30)

    # Sys.path
    monkeypatch.syspath_prepend("/custom/path")
```

### When NOT to Mock

```python
# DON'T mock data structures
# BAD
def test_with_mock_list(mocker):
    mock_list = mocker.Mock()
    mock_list.__len__ = mocker.Mock(return_value=3)
    # This is testing your mock, not your code!

# GOOD
def test_with_real_list():
    real_list = [1, 2, 3]
    assert len(real_list) == 3

# DON'T mock the system under test
# BAD
def test_calculator_mocked(mocker):
    calc = Calculator()
    mocker.patch.object(calc, 'add', return_value=5)
    assert calc.add(2, 3) == 5  # Testing the mock!

# GOOD
def test_calculator():
    calc = Calculator()
    assert calc.add(2, 3) == 5  # Testing the calculator

# DO mock external services
# GOOD
def test_weather_service(mocker):
    mocker.patch('app.weather_api.fetch', return_value={"temp": 72})
    weather = get_weather("NYC")
    assert weather["temp"] == 72
```

---

## Property-Based Testing with Hypothesis

Property-based testing generates random inputs to find edge cases you wouldn't think of.

### Installation

```bash
pip install hypothesis
```

### Basic Usage

```python
from hypothesis import given, strategies as st

@given(st.integers())
def test_integer_round_trip(n):
    """int -> str -> int should be identity."""
    assert int(str(n)) == n

@given(st.text())
def test_reverse_twice_is_identity(s):
    """Reversing a string twice gives the original."""
    assert s[::-1][::-1] == s

@given(st.lists(st.integers()))
def test_sorted_list_is_sorted(lst):
    """sorted() should produce a sorted list."""
    result = sorted(lst)
    assert all(result[i] <= result[i+1] for i in range(len(result)-1))
```

### Strategies

```python
from hypothesis import strategies as st

# Basic types
st.integers()
st.integers(min_value=0, max_value=100)
st.floats(allow_nan=False)
st.text()
st.text(min_size=1, max_size=50)
st.booleans()
st.none()

# Collections
st.lists(st.integers())
st.lists(st.integers(), min_size=1, max_size=10)
st.sets(st.text())
st.dictionaries(st.text(), st.integers())
st.tuples(st.integers(), st.text())

# Combining strategies
st.one_of(st.integers(), st.text())
st.integers() | st.none()  # Same as one_of

# Custom objects
@st.composite
def user_strategy(draw):
    """Generate random User objects."""
    email = draw(st.emails())
    name = draw(st.text(min_size=1, max_size=50))
    age = draw(st.integers(min_value=0, max_value=150))
    return User(email=email, name=name, age=age)

@given(user_strategy())
def test_user_serialization(user):
    """Users should survive JSON round-trip."""
    json_str = user.to_json()
    restored = User.from_json(json_str)
    assert restored == user
```

### Writing Good Properties

```python
from hypothesis import given, strategies as st, assume

# Property 1: Inverse operations
@given(st.text())
def test_encode_decode_roundtrip(s):
    """Encoding then decoding should return original."""
    encoded = encode(s)
    decoded = decode(encoded)
    assert decoded == s

# Property 2: Invariants
@given(st.lists(st.integers()))
def test_sort_preserves_length(lst):
    """Sorting shouldn't change list length."""
    assert len(sorted(lst)) == len(lst)

@given(st.lists(st.integers()))
def test_sort_preserves_elements(lst):
    """Sorting shouldn't add or remove elements."""
    from collections import Counter
    assert Counter(sorted(lst)) == Counter(lst)

# Property 3: Idempotence
@given(st.text())
def test_normalize_is_idempotent(s):
    """Normalizing twice should equal normalizing once."""
    assert normalize(normalize(s)) == normalize(s)

# Using assume() to filter inputs
@given(st.integers(), st.integers())
def test_division_inverse(a, b):
    """(a / b) * b should equal a."""
    assume(b != 0)  # Skip when b is zero
    result = (a / b) * b
    assert abs(result - a) < 1e-9  # Float comparison
```

### Shrinking

Hypothesis automatically shrinks failing examples to minimal cases:

```python
@given(st.lists(st.integers()))
def test_sum_is_positive(lst):
    """Intentionally wrong property for demonstration."""
    assert sum(lst) >= 0

# Hypothesis might find: [1, -2]
# Then shrink to: [-1]
```

---

## Test Design Strategies

### Boundary Value Analysis

Test at the boundaries of input domains:

```python
@pytest.mark.parametrize("age,expected_valid", [
    # Boundary: minimum age (0)
    (-1, False),   # Below minimum
    (0, True),     # At minimum
    (1, True),     # Above minimum

    # Boundary: maximum age (150)
    (149, True),   # Below maximum
    (150, True),   # At maximum
    (151, False),  # Above maximum
])
def test_age_validation(age, expected_valid):
    result = is_valid_age(age)
    assert result == expected_valid
```

### Equivalence Partitioning

Group inputs that should behave identically:

```python
class TestUsernameValidation:
    """Test username validation using equivalence partitions."""

    # Partition 1: Valid usernames (5-20 chars, alphanumeric + underscore)
    @pytest.mark.parametrize("username", [
        "alice",           # Minimum length
        "alice_smith",     # Contains underscore
        "user123",         # Contains numbers
        "a" * 20,          # Maximum length
    ])
    def test_valid_usernames(self, username):
        assert is_valid_username(username)

    # Partition 2: Too short (< 5 chars)
    @pytest.mark.parametrize("username", ["", "a", "ab", "abc", "abcd"])
    def test_too_short_usernames(self, username):
        assert not is_valid_username(username)

    # Partition 3: Too long (> 20 chars)
    @pytest.mark.parametrize("username", ["a" * 21, "a" * 100])
    def test_too_long_usernames(self, username):
        assert not is_valid_username(username)

    # Partition 4: Invalid characters
    @pytest.mark.parametrize("username", [
        "alice!",          # Special char
        "alice smith",     # Space
        "alice@email",     # At symbol
        "alice-name",      # Hyphen
    ])
    def test_invalid_character_usernames(self, username):
        assert not is_valid_username(username)
```

### Decision Table Testing

For complex business rules:

```python
# Decision table for shipping cost:
# | Order > $100 | Member | Free Shipping |
# |--------------|--------|---------------|
# | Yes          | Yes    | Yes           |
# | Yes          | No     | Yes           |
# | No           | Yes    | Yes           |
# | No           | No     | No            |

@pytest.mark.parametrize("order_total,is_member,expected_free", [
    (150, True, True),   # Over $100, member
    (150, False, True),  # Over $100, non-member
    (50, True, True),    # Under $100, member
    (50, False, False),  # Under $100, non-member
    (100, True, True),   # Exactly $100, member (boundary)
    (100, False, True),  # Exactly $100, non-member (boundary)
])
def test_free_shipping_rules(order_total, is_member, expected_free):
    shipping = calculate_shipping(order_total, is_member)
    assert (shipping == 0) == expected_free
```

---

## Writing Testable Code

### Pure Functions

Functions without side effects are easiest to test:

```python
# HARD TO TEST: Side effects
def process_order_hard(order_id):
    order = database.get(order_id)     # Database call
    send_email(order.user)             # Email side effect
    update_inventory(order.items)       # More side effects
    return order.total

# EASY TO TEST: Pure function
def calculate_order_total(items: list[Item], discount: float) -> float:
    """Pure function: no side effects, deterministic."""
    subtotal = sum(item.price * item.quantity for item in items)
    return subtotal * (1 - discount)

def test_calculate_order_total():
    items = [Item(price=10.0, quantity=2), Item(price=5.0, quantity=3)]
    total = calculate_order_total(items, discount=0.1)
    assert total == 31.5  # (20 + 15) * 0.9
```

### Dependency Injection

Inject dependencies instead of creating them:

```python
# HARD TO TEST: Creates own dependency
class OrderService:
    def __init__(self):
        self.db = PostgresDatabase()  # Hard-coded dependency
        self.email = SMTPEmailService()

    def process(self, order_id):
        order = self.db.get(order_id)
        self.email.send(order.user, "Order confirmed")
        return order

# EASY TO TEST: Dependencies injected
class OrderService:
    def __init__(self, db: Database, email: EmailService):
        self.db = db
        self.email = email

    def process(self, order_id):
        order = self.db.get(order_id)
        self.email.send(order.user, "Order confirmed")
        return order

def test_order_processing():
    fake_db = FakeDatabase()
    fake_db.save(Order(id=1, user="alice@example.com", total=100))
    fake_email = FakeEmailService()

    service = OrderService(db=fake_db, email=fake_email)
    result = service.process(1)

    assert result.total == 100
    assert fake_email.sent_to == ["alice@example.com"]
```

### Functional Core, Imperative Shell

Separate pure logic from side effects:

```python
# Pure core: All business logic, no I/O
def calculate_pricing(items: list[Item], rules: PricingRules) -> PricingResult:
    """Pure function with all business logic."""
    subtotal = sum(item.price * item.quantity for item in items)
    discount = rules.calculate_discount(subtotal)
    tax = rules.calculate_tax(subtotal - discount)
    return PricingResult(
        subtotal=subtotal,
        discount=discount,
        tax=tax,
        total=subtotal - discount + tax
    )

# Imperative shell: I/O at edges
def checkout(cart_id: str) -> Receipt:
    """Thin shell that handles I/O."""
    # Input
    cart = database.get_cart(cart_id)
    rules = config.get_pricing_rules()

    # Pure calculation
    pricing = calculate_pricing(cart.items, rules)

    # Output
    receipt = create_receipt(cart, pricing)
    database.save_receipt(receipt)
    email_service.send_receipt(cart.user_email, receipt)

    return receipt

# Testing is easy!
def test_pricing_calculation():
    items = [Item("SKU1", price=10, quantity=2)]
    rules = PricingRules(discount_threshold=100, tax_rate=0.1)

    result = calculate_pricing(items, rules)

    assert result.subtotal == 20
    assert result.discount == 0
    assert result.tax == 2
    assert result.total == 22
```

---

## TDD Anti-Patterns

### The Liar

Tests that pass but don't verify anything meaningful:

```python
# BAD: The Liar - always passes
def test_user_created():
    user = User("alice@example.com")
    assert user  # Truthy check, not meaningful
    assert True  # Always passes!

# GOOD: Meaningful assertions
def test_user_created():
    user = User("alice@example.com")
    assert user.email == "alice@example.com"
    assert user.created_at is not None
    assert user.id is not None
```

### The Giant

Tests that test too much:

```python
# BAD: The Giant - tests everything
def test_user_workflow():
    # Registration
    user = register("alice@example.com", "password123")
    assert user.email == "alice@example.com"

    # Login
    token = login("alice@example.com", "password123")
    assert token is not None

    # Update profile
    update_profile(user.id, name="Alice")
    assert get_user(user.id).name == "Alice"

    # Password change
    change_password(user.id, "password123", "newpassword")
    assert login("alice@example.com", "newpassword")

    # Deletion
    delete_user(user.id)
    assert get_user(user.id) is None

# GOOD: Focused tests
def test_user_registration():
    user = register("alice@example.com", "password123")
    assert user.email == "alice@example.com"

def test_user_login():
    user = register("alice@example.com", "password123")
    token = login("alice@example.com", "password123")
    assert token is not None

def test_profile_update():
    user = register("alice@example.com", "password123")
    update_profile(user.id, name="Alice")
    assert get_user(user.id).name == "Alice"
```

### Excessive Setup

Tests with too much arrangement:

```python
# BAD: Excessive setup
def test_order_discount():
    # 20 lines of setup...
    company = Company(name="Acme")
    department = Department(company=company, name="Sales")
    employee = Employee(department=department, role="Manager")
    user = User(employee=employee, email="test@example.com")
    account = Account(user=user, type="Premium")
    cart = Cart(account=account)
    product1 = Product(name="Widget", price=100)
    product2 = Product(name="Gadget", price=200)
    cart.add(product1)
    cart.add(product2)
    # ...finally the actual test
    discount = calculate_discount(cart)
    assert discount == 30

# GOOD: Use fixtures and factories
def test_order_discount(premium_cart_with_items):
    discount = calculate_discount(premium_cart_with_items)
    assert discount == 30

@pytest.fixture
def premium_cart_with_items(make_cart, make_product):
    cart = make_cart(account_type="Premium")
    cart.add(make_product(price=100))
    cart.add(make_product(price=200))
    return cart
```

### The Slow Poke

Tests that take too long:

```python
# BAD: Slow test with real delays
def test_rate_limiting():
    for i in range(100):
        response = make_request()
        time.sleep(1)  # Real delay!
    assert response.status_code == 429

# GOOD: Mock the clock
def test_rate_limiting(mocker):
    mock_time = mocker.patch('time.time')
    mock_time.side_effect = range(0, 200, 2)  # Simulated time

    for i in range(100):
        response = make_request()

    assert response.status_code == 429
```

### Testing Implementation Details

```python
# BAD: Tests implementation
def test_user_stored_in_dict(mocker):
    service = UserService()
    spy = mocker.spy(service, '_users')

    service.add_user(User("alice@example.com"))

    # Fragile: breaks if internal storage changes
    assert "alice@example.com" in service._users

# GOOD: Tests behavior
def test_user_can_be_retrieved():
    service = UserService()
    service.add_user(User("alice@example.com"))

    user = service.get_user("alice@example.com")

    assert user.email == "alice@example.com"
```

### The 100% Coverage Obsession

```python
# BAD: Testing just for coverage
def test_property_getter():
    user = User(name="Alice")
    assert user.name == "Alice"  # Tests Python, not your code

def test_trivial_delegation():
    service = UserService(repo)
    service.get_user(1)
    repo.get.assert_called_with(1)  # Just verifies wiring

# GOOD: Focus on meaningful behavior
def test_user_not_found_raises():
    service = UserService(EmptyRepository())

    with pytest.raises(UserNotFoundError):
        service.get_user(1)

def test_user_email_validation():
    with pytest.raises(ValueError):
        User(name="Alice", email="invalid")
```

---

## Test Code Smells

### Conditional Logic in Tests

```python
# BAD: Conditional logic
def test_processing(data_type):
    if data_type == "json":
        result = process(json_data)
        assert result.format == "json"
    elif data_type == "xml":
        result = process(xml_data)
        assert result.format == "xml"

# GOOD: Parametrize instead
@pytest.mark.parametrize("data,expected_format", [
    (json_data, "json"),
    (xml_data, "xml"),
])
def test_processing(data, expected_format):
    result = process(data)
    assert result.format == expected_format
```

### Magic Numbers

```python
# BAD: Magic numbers
def test_discount():
    result = calculate_discount(150)
    assert result == 15  # Why 15? Why 150?

# GOOD: Named constants
def test_discount_for_orders_over_threshold():
    PREMIUM_THRESHOLD = 100
    ORDER_TOTAL = 150
    EXPECTED_DISCOUNT = 15  # 10% of 150

    result = calculate_discount(ORDER_TOTAL)

    assert result == EXPECTED_DISCOUNT
```

### Flaky Tests

```python
# BAD: Time-dependent flaky test
def test_created_today():
    user = User("alice@example.com")
    assert user.created_at.date() == date.today()  # Fails at midnight!

# GOOD: Freeze time
def test_created_today(freezer):
    freezer.move_to("2025-01-15 12:00:00")
    user = User("alice@example.com")
    assert user.created_at == datetime(2025, 1, 15, 12, 0, 0)

# BAD: Order-dependent test
def test_user_count():
    assert User.count() == 5  # Depends on other tests

# GOOD: Isolated test
def test_user_count(empty_database):
    User.create("alice@example.com")
    User.create("bob@example.com")
    assert User.count() == 2
```

---

## The Test Pyramid

```
                    /\
                   /  \
                  / E2E\        Few, slow, expensive
                 /      \
                /--------\
               /          \
              /Integration \    Some, moderate
             /              \
            /----------------\
           /                  \
          /       Unit         \  Many, fast, cheap
         /                      \
        /------------------------\
```

### Recommended Ratios

| Level | Percentage | Characteristics |
|-------|------------|-----------------|
| Unit | 70% | Fast, isolated, no I/O |
| Integration | 20% | Test module boundaries |
| E2E | 10% | Full system, slow, brittle |

### The Ice Cream Cone Anti-Pattern

```
        /------------------------\
       /                          \
      /          E2E (many)        \   WRONG!
     /                              \
    /--------------------------------\
   /                                  \
  /        Integration (some)          \
 /                                      \
/----------------------------------------\
               Unit (few)
```

This inverts the pyramid: too many slow, brittle E2E tests and too few fast unit tests.

---

## Coverage and Mutation Testing

### Line vs Branch Coverage

```python
def categorize(value):
    if value > 0:
        return "positive"
    elif value < 0:
        return "negative"
    else:
        return "zero"

# Line coverage: 100% with these tests
def test_positive():
    assert categorize(1) == "positive"

def test_negative():
    assert categorize(-1) == "negative"

def test_zero():
    assert categorize(0) == "zero"

# Branch coverage considers all paths through conditionals
# Both branches of each if/else are tested above
```

### pytest-cov

```bash
# Run with coverage
pytest --cov=myapp tests/

# Generate HTML report
pytest --cov=myapp --cov-report=html tests/

# Fail if coverage below threshold
pytest --cov=myapp --cov-fail-under=80 tests/
```

### The Coverage Paradox

High coverage doesn't mean good tests:

```python
# 100% coverage but useless
def test_square():
    square(4)  # No assertion!

# 50% coverage but valuable
def test_square_positive():
    assert square(4) == 16

def test_square_negative():
    assert square(-4) == 16
```

### Mutation Testing (Introduction)

Mutation testing checks test quality by introducing bugs:

```python
# Original code
def is_adult(age):
    return age >= 18

# Mutant 1: Change >= to >
def is_adult_mutant1(age):
    return age > 18  # Boundary error

# Mutant 2: Change 18 to 17
def is_adult_mutant2(age):
    return age >= 17  # Off by one

# Good tests kill mutants:
def test_is_adult_at_boundary():
    assert is_adult(18) == True   # Kills mutant1
    assert is_adult(17) == False  # Kills mutant2
```

Tools: `mutmut`, `cosmic-ray`

---

## TDD Workflows

### New Feature Workflow

1. **Write acceptance test** (high-level, may be skipped initially)
2. **Red**: Write failing unit test for first behavior
3. **Green**: Implement minimal code
4. **Refactor**: Clean up
5. **Repeat** steps 2-4 for each behavior
6. **Integrate**: Run acceptance test

### Bug Fix Workflow

1. **Write failing test** that reproduces the bug
2. **Verify** the test fails for the right reason
3. **Fix** the bug with minimal change
4. **Verify** the test passes
5. **Refactor** if needed
6. **Add** related edge case tests

```python
# Bug report: "Discount not applied for exactly $100 orders"

# Step 1: Write failing test
def test_discount_applied_at_exact_threshold():
    """Regression test for bug #1234."""
    order = Order(total=100)
    discount = calculate_discount(order)
    assert discount == 10  # 10% discount at $100

# Step 2: Verify it fails
# pytest shows: AssertionError: assert 0 == 10

# Step 3: Find and fix the bug
# Original: if order.total > 100:  # Bug: > instead of >=
# Fixed:    if order.total >= 100:

# Step 4: Verify it passes
# pytest shows: PASSED

# Step 5: Add related tests
def test_discount_just_below_threshold():
    order = Order(total=99.99)
    discount = calculate_discount(order)
    assert discount == 0  # No discount below $100
```

### Legacy Code Workflow

1. **Identify** the change point
2. **Write characterization test** (tests current behavior)
3. **Find seams** for testing
4. **Break dependencies** carefully
5. **Write tests** for new behavior
6. **Make changes** with safety net

---

## TDD for Different Scenarios

### Testing APIs

```python
import pytest
from fastapi.testclient import TestClient
from myapp import app

@pytest.fixture
def client():
    return TestClient(app)

def test_create_user(client):
    response = client.post("/users", json={
        "email": "alice@example.com",
        "name": "Alice"
    })

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "alice@example.com"
    assert "id" in data

def test_create_user_invalid_email(client):
    response = client.post("/users", json={
        "email": "not-an-email",
        "name": "Alice"
    })

    assert response.status_code == 422  # Validation error
```

### Testing Database Operations

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def db_session():
    """Create a test database session with rollback."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    yield session

    session.rollback()
    session.close()

def test_user_repository_save(db_session):
    repo = UserRepository(db_session)
    user = User(email="alice@example.com", name="Alice")

    repo.save(user)

    saved = repo.get_by_email("alice@example.com")
    assert saved.name == "Alice"
```

### Testing Async Code

```python
import pytest
import asyncio

@pytest.mark.asyncio
async def test_async_fetch():
    result = await fetch_data("https://api.example.com/data")
    assert result is not None

@pytest.mark.asyncio
async def test_async_with_mock(mocker):
    mock_fetch = mocker.patch("myapp.client.aiohttp.get")
    mock_fetch.return_value.__aenter__.return_value.json = asyncio.coroutine(
        lambda: {"data": "test"}
    )

    result = await fetch_data("https://api.example.com/data")

    assert result["data"] == "test"
```

### Testing CLI Applications

```python
from click.testing import CliRunner
from myapp.cli import main

def test_cli_help():
    runner = CliRunner()
    result = runner.invoke(main, ["--help"])

    assert result.exit_code == 0
    assert "Usage:" in result.output

def test_cli_process_file(tmp_path):
    runner = CliRunner()
    input_file = tmp_path / "input.txt"
    input_file.write_text("test data")

    result = runner.invoke(main, ["process", str(input_file)])

    assert result.exit_code == 0
    assert "Processed" in result.output
```

---

## When NOT to Use TDD

TDD isn't always the best approach:

| Scenario | Why TDD Might Not Fit |
|----------|----------------------|
| **Exploratory prototypes** | Design is unknown; you're learning |
| **Throwaway scripts** | One-time use; not worth testing |
| **UI/visual code** | Hard to test automatically |
| **Spikes/research** | Goal is learning, not production code |
| **Legacy code first contact** | Characterization tests first |

### Alternatives

- **Spike and stabilize**: Explore first, then add tests
- **Test-after for prototypes**: Write tests before committing
- **Characterization tests**: Document existing behavior before changes

---

## Interview Questions

### Q1: What is Test-Driven Development?

**Answer:** TDD is a development methodology where you write a failing test before writing the code to make it pass. The cycle is:
1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

TDD leads to better-designed, more testable code with comprehensive test coverage.

### Q2: What's the difference between a mock and a stub?

**Answer:**
- **Stub**: Returns canned data. Used when you need to control inputs.
  ```python
  stub_api.get_user.return_value = {"id": 1, "name": "Alice"}
  ```
- **Mock**: Verifies interactions. Used when you need to check calls.
  ```python
  mock_email.send_email("alice@example.com", "Welcome!")
  mock_email.send_email.assert_called_once()
  ```

### Q3: What is property-based testing?

**Answer:** Property-based testing generates random inputs to verify properties that should always hold, rather than testing specific examples. For example:

```python
@given(st.lists(st.integers()))
def test_sorted_list_is_sorted(lst):
    result = sorted(lst)
    assert all(result[i] <= result[i+1] for i in range(len(result)-1))
```

This finds edge cases you wouldn't think to test manually.

### Q4: What is the test pyramid?

**Answer:** The test pyramid recommends:
- **70% unit tests**: Fast, isolated, many
- **20% integration tests**: Test boundaries, moderate
- **10% E2E tests**: Full system, few

The inverted pyramid (ice cream cone) with many E2E tests is an anti-pattern because E2E tests are slow and brittle.

### Q5: How do you test code that depends on external services?

**Answer:** Use test doubles:
1. **Mock/stub** the external call
2. **Use dependency injection** to swap implementations
3. **Create a fake** (in-memory implementation)

```python
def test_weather_service(mocker):
    mocker.patch('app.weather_api.get_weather', return_value={"temp": 72})

    result = get_weather_report("NYC")

    assert result["temperature"] == 72
```

### Q6: What's the difference between pytest fixtures and unittest setUp?

**Answer:**
- **unittest setUp**: Runs before every test method in class
- **pytest fixtures**: More flexible scopes (function, class, module, session), composable, and can be parametrized

```python
# Fixture with scope and composition
@pytest.fixture(scope="module")
def database():
    db = connect()
    yield db
    db.close()

@pytest.fixture
def user(database):  # Composed with database fixture
    return database.create_user()
```

### Q7: What is a flaky test and how do you fix it?

**Answer:** A flaky test passes sometimes and fails other times without code changes. Common causes and fixes:
- **Time-dependent**: Use time freezing libraries
- **Order-dependent**: Ensure test isolation
- **Concurrency**: Use proper synchronization
- **External services**: Mock external calls

### Q8: What is mutation testing?

**Answer:** Mutation testing checks test quality by introducing small bugs (mutants) into code and checking if tests catch them. If a test suite kills all mutants, it's effective. If mutants survive, tests may be weak.

### Q9: Why is "patch where it's used" important?

**Answer:** Python imports create references at import time. If you patch where a function is defined instead of where it's used, the reference in the using module still points to the original.

```python
# myapp/service.py imports from myapp/client.py
# Patch in service.py, not client.py:
@patch('myapp.service.APIClient')  # Correct
@patch('myapp.client.APIClient')   # Wrong
```

### Q10: What makes code hard to test?

**Answer:**
- **Global state** and singletons
- **Hard-coded dependencies** instead of injection
- **Side effects** mixed with logic
- **Tight coupling** between components
- **Long methods** doing many things

Solution: Use dependency injection, separate pure logic from I/O, and follow SOLID principles.

---

## Quick Reference Cards

### TDD Cycle

```
1. RED:    Write failing test (test doesn't compile? That counts!)
2. GREEN:  Write minimal code to pass (ugly is OK)
3. REFACTOR: Clean up (tests must stay green)
```

### Test Double Selection

| Need | Use |
|------|-----|
| Canned return value | Stub |
| Verify method called | Mock |
| Track all calls | Spy |
| Working fake implementation | Fake |
| Fill unused parameter | Dummy |

### Mock Configuration Quick Reference

```python
# Return value
mock.method.return_value = 42

# Raise exception
mock.method.side_effect = ValueError("error")

# Multiple returns
mock.method.side_effect = [1, 2, 3]

# Verify called
mock.method.assert_called()
mock.method.assert_called_once()
mock.method.assert_called_with("arg")
mock.method.assert_not_called()

# Call info
mock.method.call_count
mock.method.call_args
mock.method.call_args_list
```

### TDD Checklist

- [ ] Test name describes expected behavior
- [ ] Test is focused on one thing
- [ ] Test would fail without the code
- [ ] Test doesn't test implementation details
- [ ] Test is deterministic (not flaky)
- [ ] Test is fast (< 1 second)
- [ ] Test is isolated (no shared state)
- [ ] Test has clear arrange/act/assert

---

## Resources

### Official Documentation

- [pytest documentation](https://docs.pytest.org/)
- [unittest documentation](https://docs.python.org/3/library/unittest.html)
- [unittest.mock documentation](https://docs.python.org/3/library/unittest.mock.html)

### TDD Methodology

- [Test-Driven Development: By Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/) — Kent Beck
- [Growing Object-Oriented Software, Guided by Tests](http://www.growing-object-oriented-software.com/) — Freeman & Pryce
- [Modern TDD in Python](https://testdriven.io/blog/modern-tdd/) — TestDriven.io

### Testing Best Practices

- [Python Testing Best Practices 2025](https://danielsarney.com/blog/python-testing-best-practices-2025-building-reliable-applications/)
- [TDD Anti-Patterns](https://www.codurance.com/publications/tdd-anti-patterns-chapter-1) — Codurance
- [Software Testing Anti-patterns](https://blog.codepipes.com/testing/software-testing-antipatterns.html)

### Property-Based Testing

- [Hypothesis documentation](https://hypothesis.readthedocs.io/)
- [Property-Based Testing with Python](https://hypothesis.works/articles/)
- [OOPSLA 2025: Evaluation of Property-Based Testing](https://2025.splashcon.org/details/OOPSLA/102/)

### Tools

- [pytest-mock](https://pytest-mock.readthedocs.io/) — pytest plugin for mocking
- [pytest-cov](https://pytest-cov.readthedocs.io/) — Coverage plugin
- [freezegun](https://github.com/spulec/freezegun) — Time freezing
- [mutmut](https://github.com/boxed/mutmut) — Mutation testing
