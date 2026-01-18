# Python Tooling and Testing

> Development tools, testing, debugging, and best practices

---

## Table of Contents

1. [Testing with pytest](#testing-with-pytest)
2. [Testing with unittest](#testing-with-unittest)
3. [Debugging](#debugging)
4. [Code Formatting](#code-formatting)
5. [Linting](#linting)
6. [Virtual Environments](#virtual-environments)
7. [Project Structure](#project-structure)
8. [CI/CD Integration](#cicd-integration)
9. [Performance Profiling](#performance-profiling)
10. [Interview Environment Tips](#interview-environment-tips)

---

## Testing with pytest

pytest is Python's most popular testing framework.

### Installation

```bash
pip install pytest
```

### Basic Tests

```python
# test_example.py

def add(a, b):
    return a + b

def test_add():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, 1) == 0

def test_add_floats():
    assert add(0.1, 0.2) == pytest.approx(0.3)
```

### Running Tests

```bash
# Run all tests
pytest

# Run specific file
pytest test_example.py

# Run specific test
pytest test_example.py::test_add

# Verbose output
pytest -v

# Show print statements
pytest -s

# Stop on first failure
pytest -x

# Run last failed
pytest --lf

# Run tests matching pattern
pytest -k "add"
```

### Fixtures

```python
import pytest

@pytest.fixture
def sample_data():
    return [1, 2, 3, 4, 5]

def test_sum(sample_data):
    assert sum(sample_data) == 15

def test_len(sample_data):
    assert len(sample_data) == 5

# Fixture with setup and teardown
@pytest.fixture
def database():
    # Setup
    db = connect_to_database()
    yield db
    # Teardown
    db.close()

# Fixture scopes
@pytest.fixture(scope="module")     # Once per module
def expensive_resource():
    return create_resource()

@pytest.fixture(scope="session")    # Once per test session
def global_config():
    return load_config()
```

### Parametrized Tests

```python
import pytest

@pytest.mark.parametrize("input,expected", [
    (1, 1),
    (2, 4),
    (3, 9),
    (4, 16),
])
def test_square(input, expected):
    assert input ** 2 == expected

# Multiple parameters
@pytest.mark.parametrize("a,b,result", [
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
])
def test_add(a, b, result):
    assert add(a, b) == result
```

### Testing Exceptions

```python
import pytest

def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

def test_divide_by_zero():
    with pytest.raises(ValueError) as excinfo:
        divide(1, 0)
    assert "Cannot divide by zero" in str(excinfo.value)

def test_divide_by_zero_simple():
    with pytest.raises(ValueError):
        divide(1, 0)
```

### Mocking

```python
from unittest.mock import Mock, patch, MagicMock

# Simple mock
mock = Mock()
mock.method.return_value = 42
assert mock.method() == 42

# Patch a module function
def get_data():
    return fetch_from_api()         # External call

def test_get_data():
    with patch('module.fetch_from_api') as mock_fetch:
        mock_fetch.return_value = {"data": "test"}
        result = get_data()
        assert result == {"data": "test"}

# Patch as decorator
@patch('module.fetch_from_api')
def test_get_data(mock_fetch):
    mock_fetch.return_value = {"data": "test"}
    result = get_data()
    assert result == {"data": "test"}

# MagicMock for more complex mocking
mock_file = MagicMock()
mock_file.__enter__.return_value = mock_file
mock_file.read.return_value = "content"
```

### Test Organization

```
project/
├── src/
│   └── mypackage/
│       ├── __init__.py
│       └── module.py
└── tests/
    ├── __init__.py
    ├── conftest.py           # Shared fixtures
    ├── test_module.py
    └── unit/
        └── test_specific.py
```

```python
# conftest.py - shared fixtures
import pytest

@pytest.fixture
def app():
    return create_app()

@pytest.fixture
def client(app):
    return app.test_client()
```

---

## Testing with unittest

Built-in testing framework, no installation required.

### Basic Tests

```python
import unittest

class TestMath(unittest.TestCase):
    def test_add(self):
        self.assertEqual(1 + 1, 2)

    def test_subtract(self):
        self.assertEqual(5 - 3, 2)

    def test_multiply(self):
        self.assertAlmostEqual(0.1 + 0.2, 0.3, places=10)

if __name__ == '__main__':
    unittest.main()
```

### Assert Methods

```python
class TestAsserts(unittest.TestCase):
    def test_equality(self):
        self.assertEqual(a, b)
        self.assertNotEqual(a, b)

    def test_truth(self):
        self.assertTrue(condition)
        self.assertFalse(condition)

    def test_none(self):
        self.assertIsNone(x)
        self.assertIsNotNone(x)

    def test_membership(self):
        self.assertIn(item, container)
        self.assertNotIn(item, container)

    def test_instance(self):
        self.assertIsInstance(obj, cls)

    def test_raises(self):
        with self.assertRaises(ValueError):
            risky_function()

    def test_almost_equal(self):
        self.assertAlmostEqual(0.1 + 0.2, 0.3, places=5)
```

### Setup and Teardown

```python
class TestDatabase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Run once before all tests in class."""
        cls.db = create_database()

    @classmethod
    def tearDownClass(cls):
        """Run once after all tests in class."""
        cls.db.close()

    def setUp(self):
        """Run before each test method."""
        self.connection = self.db.connect()

    def tearDown(self):
        """Run after each test method."""
        self.connection.rollback()
```

---

## Debugging

### print Debugging

```python
# Simple but effective
print(f"DEBUG: x = {x}")
print(f"DEBUG: {type(x) = }")         # Python 3.8+

# Better: use logging
import logging
logging.basicConfig(level=logging.DEBUG)
logging.debug(f"x = {x}")
```

### pdb — Python Debugger

```python
# Insert breakpoint
import pdb; pdb.set_trace()

# Python 3.7+ - simpler
breakpoint()

# In code
def suspicious_function():
    x = compute_something()
    breakpoint()                    # Execution stops here
    return x * 2
```

### pdb Commands

```
n(ext)      - Execute next line
s(tep)      - Step into function
c(ontinue)  - Continue until next breakpoint
r(eturn)    - Continue until function returns
l(ist)      - Show source code
p expr      - Print expression
pp expr     - Pretty print
w(here)     - Show stack trace
u(p)        - Move up in stack
d(own)      - Move down in stack
q(uit)      - Quit debugger
h(elp)      - Show help
```

### Python 3.14: Zero-Overhead Debugger

```python
import sys

# Remote debugging
sys.remote_exec(pid, "debug_script.py")

# Or via command line
# python -m pdb -p 1234

# Security: Disable remote debugging
# -X disable-remote-debug
# PYTHON_DISABLE_REMOTE_DEBUG=1
```

### IDE Debugging

Most IDEs (VS Code, PyCharm) offer visual debugging:
- Set breakpoints by clicking line numbers
- Inspect variables in debug panel
- Step through code visually
- Evaluate expressions in debug console

---

## Code Formatting

### ruff format

```bash
# Install
pip install ruff

# Format file
ruff format script.py

# Format directory
ruff format src/

# Check without modifying
ruff format --check src/
```

### black

```bash
# Install
pip install black

# Format file
black script.py

# Format directory
black src/

# Check only
black --check src/

# Diff
black --diff src/
```

### Configuration

```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py312']
include = '\.pyi?$'

[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

### isort — Import Sorting

```bash
pip install isort
isort script.py
```

```toml
# pyproject.toml
[tool.isort]
profile = "black"                   # Compatible with black
```

---

## Linting

### ruff

ruff is an extremely fast linter that replaces flake8, pylint, and more.

```bash
# Install
pip install ruff

# Lint
ruff check .

# Fix automatically
ruff check --fix .

# Watch mode
ruff check --watch .
```

### Configuration

```toml
# pyproject.toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # Pyflakes
    "I",      # isort
    "B",      # flake8-bugbear
    "C4",     # flake8-comprehensions
    "UP",     # pyupgrade
]
ignore = ["E501"]                   # Line too long

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]                # Allow assert in tests
```

### flake8

```bash
pip install flake8
flake8 src/
```

### pylint

```bash
pip install pylint
pylint src/
```

### mypy — Type Checking

```bash
pip install mypy
mypy src/

# Strict mode
mypy --strict src/
```

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
```

---

## Virtual Environments

### venv (Built-in)

```bash
# Create
python -m venv .venv

# Activate
source .venv/bin/activate           # Linux/macOS
.venv\Scripts\activate              # Windows

# Deactivate
deactivate

# Install packages
pip install requests

# Save requirements
pip freeze > requirements.txt

# Install from requirements
pip install -r requirements.txt
```

### uv (Modern, Fast)

```bash
# Install uv
pip install uv

# Create venv
uv venv

# Install package
uv pip install requests

# Install from requirements
uv pip install -r requirements.txt

# Sync with lockfile
uv pip sync requirements.txt
```

### pip-tools

```bash
pip install pip-tools

# Compile requirements
pip-compile requirements.in

# Sync environment
pip-sync requirements.txt
```

---

## Project Structure

### Standard Layout

```
myproject/
├── pyproject.toml              # Project config (modern)
├── README.md
├── LICENSE
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── main.py
│       └── utils.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_main.py
└── docs/
    └── index.md
```

### pyproject.toml

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mypackage"
version = "0.1.0"
description = "My awesome package"
readme = "README.md"
requires-python = ">=3.10"
dependencies = [
    "requests>=2.28",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "ruff>=0.1",
    "mypy>=1.0",
]

[project.scripts]
mycommand = "mypackage.main:main"

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]

[tool.ruff]
line-length = 88
target-version = "py312"

[tool.mypy]
python_version = "3.12"
strict = true
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12", "3.13"]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"

      - name: Lint with ruff
        run: |
          ruff check .
          ruff format --check .

      - name: Type check with mypy
        run: mypy src/

      - name: Run tests
        run: pytest -v --cov=src/
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.6
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]
```

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Run on all files
pre-commit run --all-files
```

---

## Performance Profiling

### timeit — Microbenchmarks

```python
import timeit

# Time a statement
timeit.timeit('sum(range(1000))', number=10000)

# Time a function
def my_function():
    return sum(range(1000))

timeit.timeit(my_function, number=10000)

# In Jupyter/IPython
# %timeit sum(range(1000))
```

### cProfile — Function-Level Profiling

```python
import cProfile
import pstats

# Profile a function
cProfile.run('my_function()', 'output.prof')

# Analyze results
stats = pstats.Stats('output.prof')
stats.sort_stats('cumulative')
stats.print_stats(10)               # Top 10 functions

# Command line
# python -m cProfile -s cumulative script.py
```

### line_profiler — Line-by-Line

```python
# Install: pip install line_profiler

from line_profiler import profile

@profile
def slow_function():
    total = 0
    for i in range(1000000):
        total += i
    return total

# Run: kernprof -l -v script.py
```

### memory_profiler

```python
# Install: pip install memory_profiler

from memory_profiler import profile

@profile
def memory_heavy():
    large_list = [i for i in range(1000000)]
    return sum(large_list)

# Run: python -m memory_profiler script.py
```

---

## Interview Environment Tips

### Quick Test Setup

```python
# No imports needed for basic testing
def test():
    assert solution([1, 2, 3]) == expected
    assert solution([]) == []
    print("All tests passed!")

test()
```

### Handling Edge Cases

```python
def solve(nums):
    # Always check edge cases first
    if not nums:
        return []
    if len(nums) == 1:
        return nums

    # Main logic
    ...
```

### Common Import Pattern

```python
# Copy-paste this at the start of interviews
from collections import defaultdict, Counter, deque
from heapq import heappush, heappop, heapify
from functools import cache, lru_cache
from itertools import permutations, combinations, accumulate
from bisect import bisect_left, bisect_right
import math
```

### Quick Complexity Test

```python
import time

def benchmark(func, *args, iterations=1000):
    start = time.time()
    for _ in range(iterations):
        func(*args)
    elapsed = time.time() - start
    print(f"{func.__name__}: {elapsed:.4f}s for {iterations} iterations")

# Test different input sizes
for n in [100, 1000, 10000]:
    data = list(range(n))
    benchmark(solution, data, iterations=100)
```

### Online Editor Tips

- Most support `print()` for output
- Use simple test cases first
- Copy-paste common imports
- Test locally if possible before submitting
- Know the time/memory limits

### Debugging Without Debugger

```python
def solve(nums):
    # Strategic prints
    print(f"Input: {nums}")

    result = []
    for i, num in enumerate(nums):
        print(f"  i={i}, num={num}, result={result}")
        # ... logic ...

    print(f"Output: {result}")
    return result
```

---

## Quick Reference

### Testing

```bash
# pytest
pytest                              # Run all tests
pytest -v                           # Verbose
pytest -x                           # Stop on first failure
pytest -k "pattern"                 # Run matching tests
pytest --lf                         # Run last failed

# Coverage
pip install pytest-cov
pytest --cov=src/
```

### Formatting & Linting

```bash
# ruff (recommended - does both)
ruff check --fix .
ruff format .

# Or separately
black .                             # Format
isort .                             # Sort imports
flake8 .                            # Lint
mypy .                              # Type check
```

### Virtual Environment

```bash
# Create
python -m venv .venv

# Activate
source .venv/bin/activate

# Install
pip install -r requirements.txt

# Freeze
pip freeze > requirements.txt
```

### Common pyproject.toml

```toml
[project]
name = "myproject"
version = "0.1.0"
requires-python = ">=3.10"

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
line-length = 88
target-version = "py312"

[tool.mypy]
strict = true
```
