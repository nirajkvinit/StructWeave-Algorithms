# Python Standard Library Essentials

> Master the modules that power production Python applications

Python's standard library is famously "batteries included." While [05-standard-library.md](05-standard-library.md) covers interview-focused modules (collections, itertools, functools, bisect, heapq), this guide covers the **practical day-to-day modules** you'll use in production code — from file handling to datetime parsing to structured logging.

**Reading time**: 60-90 minutes

---

## Table of Contents

1. [Philosophy: Beyond Interviews](#philosophy-beyond-interviews)
2. [pathlib — Modern File System Paths](#pathlib--modern-file-system-paths)
3. [shutil — High-Level File Operations](#shutil--high-level-file-operations)
4. [datetime and time — Working with Time](#datetime-and-time--working-with-time)
5. [json — JSON Processing](#json--json-processing)
6. [pickle and csv — Data Serialization](#pickle-and-csv--data-serialization)
7. [tomllib — Configuration Files](#tomllib--configuration-files)
8. [re — Regular Expressions](#re--regular-expressions)
9. [logging — Application Logging](#logging--application-logging)
10. [dataclasses — Data Containers](#dataclasses--data-containers)
11. [enum — Enumerations](#enum--enumerations)
12. [contextlib — Context Managers](#contextlib--context-managers)
13. [os and sys — System Interface](#os-and-sys--system-interface)
14. [subprocess — Running External Commands](#subprocess--running-external-commands)
15. [textwrap and difflib — Text Processing](#textwrap-and-difflib--text-processing)
16. [Python 3.12+ New Features](#python-312-new-features)
17. [Quick Reference Cards](#quick-reference-cards)
18. [Interview Questions](#interview-questions)
19. [Resources](#resources)

---

## Philosophy: Beyond Interviews

The standard library follows key design principles:

| Principle | Description |
|-----------|-------------|
| **Batteries included** | Common tasks shouldn't require external packages |
| **Explicit over implicit** | Clear APIs with no hidden magic |
| **One obvious way** | Canonical solutions for common problems |
| **Consistency** | Similar patterns across modules |

### When to Use Standard Library vs Third-Party

```python
# PREFER standard library for:
# - File operations (pathlib, shutil)
# - JSON handling (json covers most cases)
# - Configuration (tomllib for TOML)
# - Logging (logging module)
# - Date/time (datetime, zoneinfo)
# - Basic HTTP (urllib.request for simple cases)

# CONSIDER third-party packages for:
# - Advanced HTTP (httpx, requests)
# - Data validation (pydantic)
# - Complex config (dynaconf, python-dotenv)
# - Date handling with timezones (pendulum, arrow)
# - Advanced logging (structlog, loguru)
```

---

## pathlib — Modern File System Paths

The `pathlib` module provides object-oriented filesystem paths. It's the modern replacement for `os.path`.

### Creating Paths

```python
from pathlib import Path

# Current directory
cwd = Path.cwd()                         # /Users/alice/project

# Home directory
home = Path.home()                       # /Users/alice

# Create from string
path = Path("/usr/local/bin")

# Create relative path
relative = Path("src/main.py")

# Join paths (use / operator)
config = home / ".config" / "app.toml"   # /Users/alice/.config/app.toml

# From multiple parts
full = Path("project", "src", "main.py") # project/src/main.py
```

### Path Components

```python
path = Path("/Users/alice/project/src/main.py")

path.parts          # ('/', 'Users', 'alice', 'project', 'src', 'main.py')
path.parent         # /Users/alice/project/src
path.parents[0]     # /Users/alice/project/src
path.parents[1]     # /Users/alice/project
path.name           # main.py
path.stem           # main (filename without extension)
path.suffix         # .py
path.suffixes       # ['.py'] (handles .tar.gz → ['.tar', '.gz'])
path.anchor         # / (root on Unix, C:\ on Windows)

# Navigate up
path.parent.parent  # /Users/alice/project
```

### Path Manipulation

```python
path = Path("/project/data/input.csv")

# Change components
path.with_name("output.csv")             # /project/data/output.csv
path.with_stem("processed")              # /project/data/processed.csv (3.9+)
path.with_suffix(".json")                # /project/data/input.json

# Make absolute
Path("src/main.py").resolve()            # /Users/alice/project/src/main.py

# Make relative
Path("/project/src/main.py").relative_to("/project")  # src/main.py
```

### Path Queries

```python
path = Path("src/main.py")

# Existence checks
path.exists()                            # True/False
path.is_file()                           # True if regular file
path.is_dir()                            # True if directory
path.is_symlink()                        # True if symbolic link

# Path comparisons
path.is_absolute()                       # False (relative path)
path.is_relative_to("src")               # True (3.9+)

# Pattern matching
path.match("*.py")                       # True
path.match("src/*.py")                   # True
```

### Directory Operations

```python
from pathlib import Path

base = Path("project")

# Create directories
base.mkdir()                             # Create single dir (error if exists)
base.mkdir(exist_ok=True)                # No error if exists
base.mkdir(parents=True)                 # Create parent dirs too

# List directory contents
list(base.iterdir())                     # All items (files + dirs)

# Glob patterns
list(base.glob("*.py"))                  # Python files in dir
list(base.glob("**/*.py"))               # Recursive search
list(base.rglob("*.py"))                 # Same as **/*.py

# Find specific patterns
for pyfile in Path("src").rglob("*.py"):
    print(pyfile.name)
```

### File Operations

```python
path = Path("data.txt")

# Read file
content = path.read_text()               # Returns str
content = path.read_text(encoding="utf-8")
data = path.read_bytes()                 # Returns bytes

# Write file
path.write_text("Hello, World!")
path.write_text("Hello", encoding="utf-8")
path.write_bytes(b"\x00\x01\x02")

# File stats
stats = path.stat()
stats.st_size                            # Size in bytes
stats.st_mtime                           # Modification time (Unix timestamp)
stats.st_mode                            # File mode

# Rename and delete
path.rename("new_name.txt")              # Rename/move
path.replace("target.txt")               # Replace if exists
path.unlink()                            # Delete file
path.unlink(missing_ok=True)             # No error if missing (3.8+)

# Delete directory
Path("empty_dir").rmdir()                # Must be empty
```

### Common Patterns

```python
from pathlib import Path

# Find all config files
def find_configs(root: Path) -> list[Path]:
    """Find all .yaml and .toml config files."""
    configs = []
    for pattern in ("*.yaml", "*.yml", "*.toml"):
        configs.extend(root.rglob(pattern))
    return configs

# Ensure directory exists
def ensure_dir(path: Path) -> Path:
    """Create directory if it doesn't exist."""
    path.mkdir(parents=True, exist_ok=True)
    return path

# Safe file read with default
def read_or_default(path: Path, default: str = "") -> str:
    """Read file content, return default if missing."""
    if path.exists():
        return path.read_text()
    return default

# Process all files in directory
def process_directory(src: Path, dest: Path) -> None:
    """Copy and process all Python files."""
    ensure_dir(dest)
    for pyfile in src.rglob("*.py"):
        # Preserve directory structure
        relative = pyfile.relative_to(src)
        target = dest / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        content = pyfile.read_text()
        target.write_text(process(content))
```

---

## shutil — High-Level File Operations

The `shutil` module provides high-level file operations that work across platforms.

### Copying Files and Directories

```python
import shutil
from pathlib import Path

# Copy single file
shutil.copy("src.txt", "dest.txt")       # Copy file, preserve mode
shutil.copy2("src.txt", "dest.txt")      # Copy + preserve metadata
shutil.copyfile("src.txt", "dest.txt")   # Copy content only

# Copy to directory (keeps filename)
shutil.copy("data.csv", "backup/")       # Creates backup/data.csv

# Copy entire directory tree
shutil.copytree("src_dir", "dest_dir")
shutil.copytree("src", "dest", dirs_exist_ok=True)  # 3.8+

# Copy with filter
def ignore_pyc(dir, files):
    return [f for f in files if f.endswith(".pyc")]

shutil.copytree("src", "dest", ignore=ignore_pyc)

# Using ignore_patterns helper
shutil.copytree(
    "src", "dest",
    ignore=shutil.ignore_patterns("*.pyc", "__pycache__", ".git")
)
```

### Moving and Removing

```python
import shutil

# Move file or directory
shutil.move("old_path", "new_path")      # Works for files and dirs

# Remove directory tree
shutil.rmtree("directory")               # Remove dir and all contents
shutil.rmtree("dir", ignore_errors=True) # No error if missing

# Remove with error handler
def on_error(func, path, exc_info):
    print(f"Error removing {path}: {exc_info[1]}")

shutil.rmtree("dir", onerror=on_error)   # 3.11: onexc parameter
```

### Disk Usage

```python
import shutil

# Get disk usage statistics
usage = shutil.disk_usage("/")
print(f"Total: {usage.total / (1024**3):.1f} GB")
print(f"Used:  {usage.used / (1024**3):.1f} GB")
print(f"Free:  {usage.free / (1024**3):.1f} GB")

# Find executable
python_path = shutil.which("python")     # Returns path or None
```

### Archives

```python
import shutil

# Create archive
shutil.make_archive("backup", "zip", "src_dir")     # Creates backup.zip
shutil.make_archive("backup", "tar", "src_dir")     # Creates backup.tar
shutil.make_archive("backup", "gztar", "src_dir")   # Creates backup.tar.gz

# Unpack archive
shutil.unpack_archive("backup.zip", "dest_dir")
shutil.unpack_archive("backup.tar.gz", "dest_dir")

# List supported formats
shutil.get_archive_formats()             # [('zip', ...), ('tar', ...), ...]
shutil.get_unpack_formats()
```

---

## datetime and time — Working with Time

### datetime Basics

```python
from datetime import datetime, date, time, timedelta

# Current time
now = datetime.now()                     # Local time
utc_now = datetime.now(datetime.UTC)     # UTC time (3.11+)

# Create specific datetime
dt = datetime(2025, 1, 15, 14, 30, 0)    # 2025-01-15 14:30:00
d = date(2025, 1, 15)                    # Just date
t = time(14, 30, 0)                      # Just time

# Combine date and time
dt = datetime.combine(d, t)

# From timestamp
dt = datetime.fromtimestamp(1705330200)  # Unix timestamp to datetime
ts = dt.timestamp()                      # datetime to Unix timestamp

# Today/now shortcuts
today = date.today()
now = datetime.now()
```

### Formatting and Parsing

```python
from datetime import datetime

dt = datetime(2025, 1, 15, 14, 30, 0)

# Format to string (strftime)
dt.strftime("%Y-%m-%d")                  # "2025-01-15"
dt.strftime("%B %d, %Y")                 # "January 15, 2025"
dt.strftime("%H:%M:%S")                  # "14:30:00"
dt.strftime("%Y-%m-%dT%H:%M:%S")         # "2025-01-15T14:30:00" (ISO-like)

# ISO format
dt.isoformat()                           # "2025-01-15T14:30:00"
dt.date().isoformat()                    # "2025-01-15"

# Parse from string (strptime)
dt = datetime.strptime("2025-01-15", "%Y-%m-%d")
dt = datetime.strptime("Jan 15, 2025", "%b %d, %Y")

# ISO format parsing (3.7+)
dt = datetime.fromisoformat("2025-01-15T14:30:00")
dt = datetime.fromisoformat("2025-01-15")
```

### Common Format Codes

| Code | Meaning | Example |
|------|---------|---------|
| `%Y` | 4-digit year | 2025 |
| `%m` | Zero-padded month | 01-12 |
| `%d` | Zero-padded day | 01-31 |
| `%H` | Hour (24-hour) | 00-23 |
| `%M` | Minute | 00-59 |
| `%S` | Second | 00-59 |
| `%f` | Microsecond | 000000-999999 |
| `%A` | Full weekday | Monday |
| `%a` | Short weekday | Mon |
| `%B` | Full month | January |
| `%b` | Short month | Jan |
| `%Z` | Timezone name | UTC, EST |
| `%z` | UTC offset | +0000, -0500 |

### timedelta — Duration Arithmetic

```python
from datetime import datetime, timedelta

now = datetime.now()

# Create timedelta
delta = timedelta(days=7)
delta = timedelta(hours=3, minutes=30)
delta = timedelta(weeks=2, days=3, hours=4)

# Arithmetic
tomorrow = now + timedelta(days=1)
last_week = now - timedelta(weeks=1)
difference = tomorrow - now              # Returns timedelta

# Access components
delta = timedelta(days=2, hours=3, minutes=30)
delta.days                               # 2
delta.seconds                            # 12600 (3h 30m in seconds)
delta.total_seconds()                    # 185400.0 (total seconds)

# Comparison
timedelta(days=1) > timedelta(hours=12)  # True
```

### Timezone Handling with zoneinfo (3.9+)

```python
from datetime import datetime
from zoneinfo import ZoneInfo

# Create timezone-aware datetime
utc = ZoneInfo("UTC")
eastern = ZoneInfo("America/New_York")
pacific = ZoneInfo("America/Los_Angeles")

# Current time in timezone
now_utc = datetime.now(utc)
now_eastern = datetime.now(eastern)

# Convert between timezones
dt_utc = datetime(2025, 1, 15, 12, 0, tzinfo=utc)
dt_eastern = dt_utc.astimezone(eastern)  # 2025-01-15 07:00:00-05:00

# Make naive datetime timezone-aware
naive = datetime(2025, 1, 15, 12, 0)
aware = naive.replace(tzinfo=utc)

# Common timezones
# UTC, America/New_York, America/Los_Angeles, Europe/London
# Asia/Tokyo, Asia/Kolkata, Australia/Sydney
```

### time Module — Performance Timing

```python
import time

# Sleep
time.sleep(1.5)                          # Sleep for 1.5 seconds

# Performance counter (for benchmarking)
start = time.perf_counter()
do_work()
elapsed = time.perf_counter() - start
print(f"Elapsed: {elapsed:.4f} seconds")

# Monotonic clock (for measuring intervals)
start = time.monotonic()
# ... work ...
elapsed = time.monotonic() - start

# CPU time (process time)
start = time.process_time()
# ... work ...
cpu_time = time.process_time() - start

# Unix timestamp
time.time()                              # Current time as float
time.time_ns()                           # Nanosecond precision (3.7+)
```

### Business Day Calculator Example

```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

def add_business_days(
    start: datetime,
    days: int,
    holidays: set[datetime] | None = None
) -> datetime:
    """Add business days to a date, skipping weekends and holidays."""
    holidays = holidays or set()
    current = start
    added = 0

    while added < days:
        current += timedelta(days=1)
        # Skip weekends (Saturday=5, Sunday=6)
        if current.weekday() >= 5:
            continue
        # Skip holidays
        if current.date() in {h.date() for h in holidays}:
            continue
        added += 1

    return current

# Usage
start = datetime(2025, 1, 15)
result = add_business_days(start, 10)
print(result)
```

---

## json — JSON Processing

### Basic Encoding/Decoding

```python
import json

# Python to JSON string
data = {"name": "Alice", "age": 30, "active": True}
json_str = json.dumps(data)              # '{"name": "Alice", "age": 30, "active": true}'

# JSON string to Python
parsed = json.loads(json_str)            # {'name': 'Alice', 'age': 30, 'active': True}

# Pretty printing
json_str = json.dumps(data, indent=2)
json_str = json.dumps(data, indent=2, sort_keys=True)

# File operations
with open("data.json", "w") as f:
    json.dump(data, f)

with open("data.json", "r") as f:
    data = json.load(f)
```

### Type Mapping

| Python | JSON |
|--------|------|
| `dict` | object |
| `list`, `tuple` | array |
| `str` | string |
| `int`, `float` | number |
| `True`/`False` | true/false |
| `None` | null |

### Custom Encoding

```python
import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path

class CustomEncoder(json.JSONEncoder):
    """Handle non-serializable types."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, Path):
            return str(obj)
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        return super().default(obj)

# Usage
data = {
    "timestamp": datetime.now(),
    "path": Path("/home/user"),
    "price": Decimal("19.99")
}
json_str = json.dumps(data, cls=CustomEncoder)
```

### Custom Decoding

```python
import json
from datetime import datetime

def decode_datetime(dct):
    """Convert ISO strings back to datetime."""
    for key, value in dct.items():
        if isinstance(value, str):
            try:
                dct[key] = datetime.fromisoformat(value)
            except ValueError:
                pass
    return dct

# Usage
json_str = '{"timestamp": "2025-01-15T14:30:00"}'
data = json.loads(json_str, object_hook=decode_datetime)
# data['timestamp'] is now a datetime object
```

### Handling Edge Cases

```python
import json

# Non-ASCII characters
data = {"name": "Alice"}
json.dumps(data)                         # Default: ASCII only, escapes non-ASCII
json.dumps(data, ensure_ascii=False)     # Allow UTF-8

# NaN and Infinity (not valid JSON)
import math
data = {"value": math.nan}
# json.dumps(data)                       # Raises ValueError
json.dumps(data, allow_nan=True)         # '{"value": NaN}'

# Trailing commas and comments (strict mode)
# Standard JSON doesn't allow these
# Use a library like json5 for relaxed parsing

# Large numbers
data = {"big": 10**100}
json.dumps(data)                         # Works, but may lose precision in JS
```

---

## pickle and csv — Data Serialization

### pickle — Binary Serialization

```python
import pickle

# Serialize to bytes
data = {"complex": [1, 2, {3, 4}], "func": lambda x: x**2}
pickled = pickle.dumps(data)

# Deserialize
restored = pickle.loads(pickled)

# File operations
with open("data.pkl", "wb") as f:
    pickle.dump(data, f)

with open("data.pkl", "rb") as f:
    data = pickle.load(f)
```

**Security Warning:**

```python
# NEVER unpickle untrusted data!
# pickle.loads() can execute arbitrary code

# Safe alternative for simple data:
import json
# Use JSON instead when possible

# If you must use pickle with untrusted sources:
# Consider using hmac to verify the source
```

### csv — CSV Processing

```python
import csv

# Read CSV
with open("data.csv", newline="") as f:
    reader = csv.reader(f)
    for row in reader:
        print(row)                       # ['col1', 'col2', 'col3']

# Write CSV
with open("output.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["name", "age"])
    writer.writerows([["Alice", 30], ["Bob", 25]])

# DictReader/DictWriter (recommended)
with open("data.csv", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["age"])   # Access by column name

# Write with DictWriter
with open("output.csv", "w", newline="") as f:
    fieldnames = ["name", "age", "city"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerow({"name": "Alice", "age": 30, "city": "NYC"})

# Custom delimiters
with open("data.tsv", newline="") as f:
    reader = csv.reader(f, delimiter="\t")
```

---

## tomllib — Configuration Files

Python 3.11+ includes `tomllib` for reading TOML configuration files.

```python
import tomllib  # Python 3.11+

# Parse TOML string
toml_str = """
[database]
host = "localhost"
port = 5432
name = "mydb"

[server]
host = "0.0.0.0"
port = 8080
debug = true

[server.ssl]
enabled = true
cert_path = "/etc/ssl/cert.pem"
"""

config = tomllib.loads(toml_str)
print(config["database"]["host"])        # "localhost"
print(config["server"]["ssl"]["enabled"]) # True

# Parse TOML file
with open("config.toml", "rb") as f:     # Must open in binary mode!
    config = tomllib.load(f)
```

**Note:** `tomllib` is read-only. To write TOML, use the third-party `tomli-w` package.

---

## re — Regular Expressions

### Basic Operations

```python
import re

# Search for pattern (first match)
match = re.search(r"\d+", "Price: $42")
if match:
    print(match.group())                 # "42"

# Match at beginning only
match = re.match(r"\d+", "42 items")     # Matches
match = re.match(r"\d+", "Items: 42")    # None (not at start)

# Find all matches
numbers = re.findall(r"\d+", "10 apples, 20 oranges")
# ['10', '20']

# Find with match objects
for match in re.finditer(r"\d+", "10 apples, 20 oranges"):
    print(match.group(), match.span())   # ('10', (0, 2)), ('20', (11, 13))
```

### Pattern Compilation

```python
import re

# Compile for reuse (more efficient)
pattern = re.compile(r"\b\w+@\w+\.\w+\b")
emails = pattern.findall("Contact: alice@example.com, bob@test.org")

# With flags
pattern = re.compile(r"hello", re.IGNORECASE)
pattern.search("Hello World")            # Matches
```

### Common Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| `\d` | Digit | `0-9` |
| `\D` | Non-digit | `a, @, _` |
| `\w` | Word character | `a-z, A-Z, 0-9, _` |
| `\W` | Non-word | `@, #, space` |
| `\s` | Whitespace | `space, tab, newline` |
| `\S` | Non-whitespace | `a, 1, @` |
| `.` | Any char (except newline) | `a, 1, @` |
| `^` | Start of string | |
| `$` | End of string | |
| `\b` | Word boundary | |

### Groups and Capturing

```python
import re

# Capturing groups
match = re.search(r"(\d{4})-(\d{2})-(\d{2})", "Date: 2025-01-15")
match.group(0)                           # "2025-01-15" (full match)
match.group(1)                           # "2025" (first group)
match.group(2)                           # "01" (second group)
match.groups()                           # ('2025', '01', '15')

# Named groups
pattern = r"(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})"
match = re.search(pattern, "Date: 2025-01-15")
match.group("year")                      # "2025"
match.groupdict()                        # {'year': '2025', 'month': '01', 'day': '15'}

# Non-capturing group
pattern = r"(?:https?://)?(\w+\.com)"    # (?:...) doesn't capture
```

### Substitution

```python
import re

# Simple replacement
text = re.sub(r"\d+", "NUM", "10 apples, 20 oranges")
# "NUM apples, NUM oranges"

# Replacement with groups
text = re.sub(r"(\w+)@(\w+)", r"\1 at \2", "alice@example")
# "alice at example"

# Replacement function
def double(match):
    return str(int(match.group()) * 2)

text = re.sub(r"\d+", double, "10 apples, 20 oranges")
# "20 apples, 40 oranges"

# Split on pattern
parts = re.split(r"[,;\s]+", "apple, banana; cherry orange")
# ['apple', 'banana', 'cherry', 'orange']
```

### Log Parser Example

```python
import re
from dataclasses import dataclass
from datetime import datetime

@dataclass
class LogEntry:
    timestamp: datetime
    level: str
    message: str

LOG_PATTERN = re.compile(
    r"(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})"
    r"\s+(?P<level>INFO|WARNING|ERROR|DEBUG)"
    r"\s+(?P<message>.+)"
)

def parse_log_line(line: str) -> LogEntry | None:
    """Parse a log line into structured data."""
    match = LOG_PATTERN.match(line)
    if not match:
        return None

    data = match.groupdict()
    return LogEntry(
        timestamp=datetime.fromisoformat(data["timestamp"]),
        level=data["level"],
        message=data["message"]
    )

# Usage
log_line = "2025-01-15 14:30:00 ERROR Database connection failed"
entry = parse_log_line(log_line)
print(entry)
```

---

## logging — Application Logging

### Basic Usage

```python
import logging

# Quick setup (configure root logger)
logging.basicConfig(level=logging.INFO)

# Log messages
logging.debug("Debug info")              # Not shown (below INFO)
logging.info("Server started")
logging.warning("Disk space low")
logging.error("Connection failed")
logging.critical("System crash")

# With formatting
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
```

### Log Levels

| Level | Value | Use Case |
|-------|-------|----------|
| DEBUG | 10 | Detailed diagnostic information |
| INFO | 20 | General operational information |
| WARNING | 30 | Unexpected but handled situations |
| ERROR | 40 | Failures that don't crash the app |
| CRITICAL | 50 | Severe failures, app may crash |

### Named Loggers (Best Practice)

```python
import logging

# Create logger for this module
logger = logging.getLogger(__name__)

def process_data(data):
    logger.debug(f"Processing {len(data)} items")
    try:
        result = transform(data)
        logger.info(f"Processed successfully: {len(result)} results")
        return result
    except ValueError as e:
        logger.error(f"Processing failed: {e}")
        raise
```

### Handlers and Formatters

```python
import logging
from logging.handlers import RotatingFileHandler

# Create logger
logger = logging.getLogger("myapp")
logger.setLevel(logging.DEBUG)

# Console handler (INFO and above)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
console.setFormatter(logging.Formatter(
    "%(levelname)s - %(message)s"
))

# File handler (DEBUG and above, with rotation)
file_handler = RotatingFileHandler(
    "app.log",
    maxBytes=10_000_000,                 # 10 MB
    backupCount=5
)
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
))

# Add handlers
logger.addHandler(console)
logger.addHandler(file_handler)
```

### Configuration from File

```python
import logging.config

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "standard"
        },
        "file": {
            "class": "logging.FileHandler",
            "filename": "app.log",
            "level": "DEBUG",
            "formatter": "standard"
        }
    },
    "loggers": {
        "myapp": {
            "level": "DEBUG",
            "handlers": ["console", "file"],
            "propagate": False
        }
    },
    "root": {
        "level": "WARNING",
        "handlers": ["console"]
    }
}

logging.config.dictConfig(LOGGING_CONFIG)
```

### Best Practices

```python
import logging

logger = logging.getLogger(__name__)

# DO: Use lazy formatting (% style or f-strings in 3.12+)
logger.debug("Processing item %s", item_id)

# DON'T: Format before logging (wastes CPU if level is filtered)
# logger.debug(f"Processing item {item_id}")  # Always evaluated

# DO: Include context
logger.error("Failed to process order", extra={"order_id": order_id})

# DO: Log exceptions with stack trace
try:
    process()
except Exception:
    logger.exception("Unexpected error")  # Includes traceback

# DO: Use structured data for log aggregators
logger.info("Request completed", extra={
    "method": "GET",
    "path": "/api/users",
    "status": 200,
    "duration_ms": 45
})
```

---

## dataclasses — Data Containers

### Basic Usage

```python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

# Auto-generated __init__, __repr__, __eq__
p1 = Point(3.0, 4.0)
p2 = Point(3.0, 4.0)
print(p1)                                # Point(x=3.0, y=4.0)
print(p1 == p2)                          # True
```

### Field Options

```python
from dataclasses import dataclass, field
from typing import ClassVar

@dataclass
class User:
    # Required fields first
    name: str
    email: str

    # Default values
    active: bool = True
    role: str = "user"

    # Mutable default (use field())
    tags: list[str] = field(default_factory=list)

    # Exclude from repr
    password_hash: str = field(repr=False)

    # Exclude from comparison
    created_at: str = field(compare=False, default="")

    # Class variable (not an instance field)
    MAX_TAGS: ClassVar[int] = 10

# Usage
user = User("Alice", "alice@example.com", password_hash="abc123")
print(user)  # User(name='Alice', email='alice@example.com', active=True, role='user', tags=[], created_at='')
```

### Frozen (Immutable) Dataclasses

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Config:
    host: str
    port: int
    debug: bool = False

config = Config("localhost", 8080)
# config.port = 9000                     # FrozenInstanceError!

# Frozen dataclasses are hashable (can use in sets/dicts)
configs = {config}
```

### Post-Init Processing

```python
from dataclasses import dataclass, field

@dataclass
class Rectangle:
    width: float
    height: float
    area: float = field(init=False)

    def __post_init__(self):
        self.area = self.width * self.height

rect = Rectangle(10.0, 5.0)
print(rect.area)                         # 50.0
```

### Conversion Methods

```python
from dataclasses import dataclass, asdict, astuple, fields

@dataclass
class Point:
    x: float
    y: float

p = Point(3.0, 4.0)

# Convert to dict
asdict(p)                                # {'x': 3.0, 'y': 4.0}

# Convert to tuple
astuple(p)                               # (3.0, 4.0)

# Get field metadata
for f in fields(p):
    print(f.name, f.type)                # x <class 'float'>, y <class 'float'>
```

### Inheritance

```python
from dataclasses import dataclass

@dataclass
class Person:
    name: str
    age: int

@dataclass
class Employee(Person):
    employee_id: str
    department: str

emp = Employee("Alice", 30, "E123", "Engineering")
print(emp)
```

### Dataclass with Validation

```python
from dataclasses import dataclass

@dataclass
class User:
    name: str
    email: str
    age: int

    def __post_init__(self):
        if not self.name:
            raise ValueError("Name cannot be empty")
        if "@" not in self.email:
            raise ValueError("Invalid email format")
        if self.age < 0:
            raise ValueError("Age cannot be negative")

# Raises ValueError
# user = User("", "invalid", -5)
```

---

## enum — Enumerations

### Basic Enum

```python
from enum import Enum

class Color(Enum):
    RED = 1
    GREEN = 2
    BLUE = 3

# Access members
Color.RED                                # <Color.RED: 1>
Color.RED.name                           # 'RED'
Color.RED.value                          # 1

# Lookup by value
Color(1)                                 # <Color.RED: 1>

# Lookup by name
Color["RED"]                             # <Color.RED: 1>

# Iteration
for color in Color:
    print(color.name, color.value)

# Comparison
Color.RED == Color.RED                   # True
Color.RED == 1                           # False (use is or ==)
Color.RED is Color.RED                   # True
```

### IntEnum and StrEnum

```python
from enum import IntEnum, StrEnum

# IntEnum: behaves like int
class Status(IntEnum):
    PENDING = 0
    APPROVED = 1
    REJECTED = 2

Status.APPROVED == 1                     # True (unlike regular Enum)
Status.APPROVED > Status.PENDING         # True

# StrEnum (Python 3.11+): behaves like str
class Color(StrEnum):
    RED = "red"
    GREEN = "green"
    BLUE = "blue"

Color.RED == "red"                       # True
print(f"Color is {Color.RED}")           # "Color is red"
```

### Auto Values

```python
from enum import Enum, auto

class Direction(Enum):
    NORTH = auto()                       # 1
    SOUTH = auto()                       # 2
    EAST = auto()                        # 3
    WEST = auto()                        # 4

# Custom auto behavior
class Color(Enum):
    def _generate_next_value_(name, start, count, last_values):
        return name.lower()

    RED = auto()                         # "red"
    GREEN = auto()                       # "green"
    BLUE = auto()                        # "blue"
```

### Flag Enum (Bitwise Operations)

```python
from enum import Flag, auto

class Permission(Flag):
    READ = auto()                        # 1
    WRITE = auto()                       # 2
    EXECUTE = auto()                     # 4

# Combine flags
user_perms = Permission.READ | Permission.WRITE
print(user_perms)                        # Permission.READ|WRITE

# Check flags
Permission.READ in user_perms            # True
Permission.EXECUTE in user_perms         # False

# All permissions
all_perms = Permission.READ | Permission.WRITE | Permission.EXECUTE
```

### Enum with Methods

```python
from enum import Enum

class HttpStatus(Enum):
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    NOT_FOUND = 404
    INTERNAL_ERROR = 500

    @property
    def is_success(self) -> bool:
        return 200 <= self.value < 300

    @property
    def is_error(self) -> bool:
        return self.value >= 400

    @classmethod
    def from_code(cls, code: int) -> "HttpStatus | None":
        for status in cls:
            if status.value == code:
                return status
        return None

# Usage
status = HttpStatus.NOT_FOUND
print(status.is_error)                   # True
print(HttpStatus.from_code(200))         # HttpStatus.OK
```

---

## contextlib — Context Managers

### Creating Context Managers

```python
from contextlib import contextmanager

@contextmanager
def timer(name: str):
    """Time a code block."""
    import time
    start = time.perf_counter()
    try:
        yield                            # Code runs here
    finally:
        elapsed = time.perf_counter() - start
        print(f"{name}: {elapsed:.4f}s")

# Usage
with timer("Processing"):
    process_data()
```

### Suppressing Exceptions

```python
from contextlib import suppress

# Ignore specific exceptions
with suppress(FileNotFoundError):
    Path("missing.txt").unlink()

# Equivalent to:
try:
    Path("missing.txt").unlink()
except FileNotFoundError:
    pass
```

### Redirect Output

```python
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

# Capture stdout
buffer = StringIO()
with redirect_stdout(buffer):
    print("Captured!")
output = buffer.getvalue()               # "Captured!\n"

# Redirect to file
with open("output.txt", "w") as f:
    with redirect_stdout(f):
        print("Goes to file")
```

### ExitStack — Dynamic Context Management

```python
from contextlib import ExitStack

# Open multiple files dynamically
def process_files(filenames: list[str]):
    with ExitStack() as stack:
        files = [
            stack.enter_context(open(fn))
            for fn in filenames
        ]
        for f in files:
            print(f.read())

# Cleanup callbacks
with ExitStack() as stack:
    resource = acquire_resource()
    stack.callback(release_resource, resource)
    # Use resource...
    # release_resource(resource) called on exit
```

### nullcontext — No-Op Context Manager

```python
from contextlib import nullcontext

def process(data, lock=None):
    """Process with optional locking."""
    # Use real lock if provided, otherwise no-op
    with lock or nullcontext():
        return do_processing(data)

# Without lock
result = process(data)

# With lock
from threading import Lock
lock = Lock()
result = process(data, lock)
```

### Async Context Managers

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def async_timer(name: str):
    import time
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"{name}: {elapsed:.4f}s")

# Usage
async def main():
    async with async_timer("Async op"):
        await some_async_operation()
```

### Closing Resources

```python
from contextlib import closing
import urllib.request

# Ensure close() is called even if object isn't a context manager
with closing(urllib.request.urlopen("https://example.com")) as page:
    html = page.read()
```

---

## os and sys — System Interface

### os Module

```python
import os

# Environment variables
os.environ["API_KEY"] = "secret"
api_key = os.environ.get("API_KEY", "default")
os.getenv("API_KEY", "default")          # Same as above

# Current directory
os.getcwd()                              # Current working directory
os.chdir("/path/to/dir")                 # Change directory

# Create/remove directories
os.mkdir("new_dir")                      # Create single directory
os.makedirs("a/b/c", exist_ok=True)      # Create nested, ignore if exists
os.rmdir("empty_dir")                    # Remove empty directory

# List directory
os.listdir(".")                          # ['file1.txt', 'dir1', ...]

# Path operations (prefer pathlib for most cases)
os.path.join("a", "b", "c")              # "a/b/c"
os.path.exists("/path/to/file")
os.path.isfile("/path")
os.path.isdir("/path")
os.path.dirname("/a/b/c.txt")            # "/a/b"
os.path.basename("/a/b/c.txt")           # "c.txt"
os.path.splitext("file.tar.gz")          # ("file.tar", ".gz")
```

### sys Module

```python
import sys

# Command line arguments
sys.argv                                 # ['script.py', 'arg1', 'arg2']

# Python version
sys.version                              # '3.12.0 (main, ...)'
sys.version_info                         # sys.version_info(major=3, minor=12, ...)
sys.version_info >= (3, 10)              # True

# Module search paths
sys.path                                 # List of import paths
sys.path.append("/custom/path")

# Exit program
sys.exit(0)                              # Exit successfully
sys.exit(1)                              # Exit with error
sys.exit("Error message")                # Print message and exit with 1

# Standard streams
sys.stdin                                # Standard input
sys.stdout                               # Standard output
sys.stderr                               # Standard error

# Platform info
sys.platform                             # 'darwin', 'linux', 'win32'

# Memory/recursion limits
sys.getrecursionlimit()                  # Default: 1000
sys.setrecursionlimit(2000)
sys.getsizeof(obj)                       # Memory size of object in bytes
```

---

## subprocess — Running External Commands

### Basic Usage

```python
import subprocess

# Simple command (Python 3.5+)
result = subprocess.run(["ls", "-la"])
result.returncode                        # 0 if success

# Capture output
result = subprocess.run(
    ["ls", "-la"],
    capture_output=True,
    text=True                            # Return str instead of bytes
)
print(result.stdout)                     # Command output
print(result.stderr)                     # Error output
print(result.returncode)                 # Exit code

# Check for errors
result = subprocess.run(["ls", "-la"], check=True)  # Raises on non-zero exit
```

### Input and Timeouts

```python
import subprocess

# Provide input
result = subprocess.run(
    ["grep", "hello"],
    input="hello world\ngoodbye world\n",
    capture_output=True,
    text=True
)
print(result.stdout)                     # "hello world\n"

# Timeout
try:
    result = subprocess.run(
        ["sleep", "10"],
        timeout=5                        # Seconds
    )
except subprocess.TimeoutExpired:
    print("Command timed out")
```

### Security: Avoid shell=True

```python
import subprocess

# DANGEROUS: shell=True allows command injection
# user_input = "; rm -rf /"
# subprocess.run(f"echo {user_input}", shell=True)  # DON'T DO THIS

# SAFE: Pass arguments as list
user_input = "hello; rm -rf /"
subprocess.run(["echo", user_input])     # Safely escapes special chars
```

### Working Directory and Environment

```python
import subprocess
import os

# Change working directory
result = subprocess.run(
    ["ls"],
    cwd="/tmp",
    capture_output=True,
    text=True
)

# Modify environment
env = os.environ.copy()
env["API_KEY"] = "secret"
result = subprocess.run(
    ["./script.sh"],
    env=env
)
```

### Streaming Output

```python
import subprocess

# Real-time output (for long-running commands)
process = subprocess.Popen(
    ["tail", "-f", "/var/log/syslog"],
    stdout=subprocess.PIPE,
    text=True
)

for line in process.stdout:
    print(line, end="")
    if "error" in line.lower():
        process.terminate()
        break
```

---

## textwrap and difflib — Text Processing

### textwrap — Text Formatting

```python
import textwrap

text = "Python is a programming language that lets you work quickly and integrate systems more effectively."

# Wrap to width
wrapped = textwrap.wrap(text, width=40)
# ['Python is a programming language', 'that lets you work quickly and', ...]

# Fill (wrap and join)
filled = textwrap.fill(text, width=40)

# Shorten with ellipsis
short = textwrap.shorten(text, width=50, placeholder="...")
# "Python is a programming language that..."

# Dedent (remove common leading whitespace)
code = """
    def hello():
        print("Hello")
"""
dedented = textwrap.dedent(code)
# 'def hello():\n    print("Hello")\n'

# Indent
indented = textwrap.indent(dedented, "    ")
# '    def hello():\n        print("Hello")\n'
```

### difflib — Difference Comparison

```python
import difflib

# Find close matches
words = ["apple", "application", "apply", "banana", "appetizer"]
difflib.get_close_matches("appel", words)  # ['apple', 'apply', 'application']
difflib.get_close_matches("appel", words, n=2, cutoff=0.6)

# Compare sequences
a = "hello world"
b = "hallo world"
ratio = difflib.SequenceMatcher(None, a, b).ratio()
# 0.909... (91% similar)

# Unified diff
lines1 = ["one", "two", "three"]
lines2 = ["one", "TWO", "three", "four"]
diff = difflib.unified_diff(lines1, lines2, lineterm="")
print("\n".join(diff))
# ---
# +++
# @@ -1,3 +1,4 @@
#  one
# -two
# +TWO
#  three
# +four
```

---

## Python 3.12+ New Features

### batched (itertools, 3.12+)

```python
from itertools import batched

# Split iterable into chunks
data = range(10)
list(batched(data, 3))                   # [(0, 1, 2), (3, 4, 5), (6, 7, 8), (9,)]

# Process in batches
for batch in batched(records, 100):
    process_batch(batch)
```

### F-String Improvements (3.12+)

```python
# Nested quotes (no escaping needed)
name = "Alice"
f"Hello, {name.replace("A", "a")}"       # "Hello, alice"

# Multiline expressions
data = {"key": "value"}
f"Data: {
    data
}"                                       # "Data: {'key': 'value'}"

# Backslashes in f-strings (3.12+)
path = "C:\\Users"
f"Path: {path.replace("\\", "/")}"       # "Path: C:/Users"
```

### @override Decorator (3.12+)

```python
from typing import override

class Base:
    def process(self) -> None:
        pass

class Child(Base):
    @override
    def process(self) -> None:           # OK
        print("Child processing")

    @override
    def proccess(self) -> None:          # Error! Typo detected
        pass
```

### Type Parameter Syntax (3.12+)

```python
# Old way
from typing import TypeVar, Generic
T = TypeVar("T")

class Box(Generic[T]):
    def __init__(self, value: T) -> None:
        self.value = value

# New way (3.12+)
class Box[T]:
    def __init__(self, value: T) -> None:
        self.value = value

# Generic functions
def first[T](items: list[T]) -> T:
    return items[0]
```

### Python 3.13+ Features

```python
# Improved error messages
# Better suggestions for typos, missing imports

# New REPL with colors and multiline editing
# python -i gets a major upgrade

# Free-threaded mode (experimental)
# python --disable-gil (removes the GIL)

# Deprecated modules removed:
# - aifc, audioop, cgi, cgitb, chunk, crypt, imghdr, mailcap
# - msilib, nis, nntplib, ossaudiodev, pipes, sndhdr, spwd
# - sunau, telnetlib, uu, xdrlib
```

---

## Quick Reference Cards

### pathlib Operations

| Operation | Code |
|-----------|------|
| Current dir | `Path.cwd()` |
| Home dir | `Path.home()` |
| Join paths | `path / "subdir" / "file.txt"` |
| Parent dir | `path.parent` |
| Filename | `path.name` |
| Extension | `path.suffix` |
| Stem | `path.stem` |
| Exists? | `path.exists()` |
| Is file? | `path.is_file()` |
| Read text | `path.read_text()` |
| Write text | `path.write_text(content)` |
| Glob | `path.glob("*.py")` |
| Recursive glob | `path.rglob("*.py")` |

### datetime Format Codes

| Code | Meaning | Example |
|------|---------|---------|
| `%Y` | Year (4-digit) | 2025 |
| `%m` | Month | 01-12 |
| `%d` | Day | 01-31 |
| `%H` | Hour (24h) | 00-23 |
| `%I` | Hour (12h) | 01-12 |
| `%M` | Minute | 00-59 |
| `%S` | Second | 00-59 |
| `%p` | AM/PM | AM, PM |
| `%A` | Weekday | Monday |
| `%B` | Month name | January |
| `%z` | UTC offset | +0000 |

### Regular Expression Patterns

| Pattern | Matches |
|---------|---------|
| `\d` | Digit (0-9) |
| `\D` | Non-digit |
| `\w` | Word char (a-z, A-Z, 0-9, _) |
| `\W` | Non-word char |
| `\s` | Whitespace |
| `\S` | Non-whitespace |
| `.` | Any char (except newline) |
| `^` | Start of string |
| `$` | End of string |
| `\b` | Word boundary |
| `*` | 0 or more |
| `+` | 1 or more |
| `?` | 0 or 1 |
| `{n}` | Exactly n |
| `{n,m}` | n to m times |
| `(...)` | Capture group |
| `(?:...)` | Non-capture group |
| `(?P<name>...)` | Named group |

---

## Interview Questions

### Q1: When should you use pathlib vs os.path?

**Answer:** Prefer `pathlib` for new code. It provides an object-oriented API that's more readable and less error-prone:

```python
# os.path (verbose, easy to make mistakes)
import os
path = os.path.join(os.path.dirname(__file__), "data", "config.json")

# pathlib (cleaner, harder to mess up)
from pathlib import Path
path = Path(__file__).parent / "data" / "config.json"
```

Use `os.path` when: working with legacy code, needing string paths for APIs that don't accept Path objects (though most do now via `os.fspath()`).

### Q2: How do you handle timezone-aware datetimes?

**Answer:** Use `zoneinfo` (Python 3.9+) for timezone handling:

```python
from datetime import datetime
from zoneinfo import ZoneInfo

# Create timezone-aware datetime
utc_time = datetime.now(ZoneInfo("UTC"))
local_time = datetime.now(ZoneInfo("America/New_York"))

# Convert between timezones
eastern = utc_time.astimezone(ZoneInfo("America/New_York"))

# Never use naive datetimes for timestamps that cross timezone boundaries
```

### Q3: What's the difference between json.dumps() and json.dump()?

**Answer:**
- `json.dumps()` returns a JSON string
- `json.dump()` writes JSON directly to a file object

```python
import json

# dumps() - to string
json_str = json.dumps({"key": "value"})

# dump() - to file
with open("data.json", "w") as f:
    json.dump({"key": "value"}, f)
```

### Q4: How do you make a dataclass immutable?

**Answer:** Use `frozen=True`:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Point:
    x: float
    y: float

p = Point(1.0, 2.0)
# p.x = 3.0  # FrozenInstanceError!

# Frozen dataclasses are hashable
points = {p}
```

### Q5: Why should you avoid shell=True in subprocess?

**Answer:** `shell=True` passes the command to the shell, which can lead to command injection vulnerabilities:

```python
import subprocess

# DANGEROUS - user input can inject commands
user_input = "file.txt; rm -rf /"
subprocess.run(f"cat {user_input}", shell=True)  # Executes rm -rf /!

# SAFE - arguments are properly escaped
subprocess.run(["cat", user_input])  # Treats whole string as filename
```

### Q6: What's the difference between Enum and IntEnum?

**Answer:** `IntEnum` members compare equal to integers, `Enum` members don't:

```python
from enum import Enum, IntEnum

class Color(Enum):
    RED = 1

class Status(IntEnum):
    ACTIVE = 1

Color.RED == 1       # False
Status.ACTIVE == 1   # True
Status.ACTIVE > 0    # True (supports int operations)
```

### Q7: How do you create a context manager?

**Answer:** Use `@contextmanager` decorator or implement `__enter__` and `__exit__`:

```python
from contextlib import contextmanager

@contextmanager
def managed_resource():
    resource = acquire()
    try:
        yield resource
    finally:
        release(resource)

# Or as a class:
class ManagedResource:
    def __enter__(self):
        self.resource = acquire()
        return self.resource

    def __exit__(self, exc_type, exc_val, exc_tb):
        release(self.resource)
        return False  # Don't suppress exceptions
```

### Q8: What's the purpose of logging.getLogger(__name__)?

**Answer:** It creates a logger named after the module, enabling hierarchical configuration:

```python
# In myapp/database/connection.py
logger = logging.getLogger(__name__)  # Logger named "myapp.database.connection"

# Configure all database loggers at once:
logging.getLogger("myapp.database").setLevel(logging.DEBUG)

# Or all app loggers:
logging.getLogger("myapp").setLevel(logging.INFO)
```

### Q9: How do you read a TOML config file in Python 3.11+?

**Answer:** Use the built-in `tomllib` module:

```python
import tomllib

with open("config.toml", "rb") as f:  # Binary mode required!
    config = tomllib.load(f)

# Or from string
config = tomllib.loads("""
[database]
host = "localhost"
port = 5432
""")
```

### Q10: What's the best way to measure code execution time?

**Answer:** Use `time.perf_counter()` for wall-clock time or `time.process_time()` for CPU time:

```python
import time

# Wall-clock time (includes sleep, I/O waits)
start = time.perf_counter()
result = do_work()
elapsed = time.perf_counter() - start
print(f"Wall time: {elapsed:.4f}s")

# CPU time (only counts CPU usage)
start = time.process_time()
result = do_cpu_intensive_work()
cpu_time = time.process_time() - start
print(f"CPU time: {cpu_time:.4f}s")
```

---

## Resources

### Official Documentation

- [Python Standard Library](https://docs.python.org/3/library/) — Complete reference
- [pathlib](https://docs.python.org/3/library/pathlib.html) — Object-oriented paths
- [datetime](https://docs.python.org/3/library/datetime.html) — Date and time handling
- [logging](https://docs.python.org/3/library/logging.html) — Logging facility
- [re](https://docs.python.org/3/library/re.html) — Regular expressions
- [dataclasses](https://docs.python.org/3/library/dataclasses.html) — Data containers

### What's New

- [What's New in Python 3.12](https://docs.python.org/3/whatsnew/3.12.html)
- [What's New in Python 3.13](https://docs.python.org/3/whatsnew/3.13.html)
- [What's New in Python 3.14](https://docs.python.org/3/whatsnew/3.14.html)

### Tutorials

- [Real Python - pathlib](https://realpython.com/python-pathlib/)
- [Real Python - Logging](https://realpython.com/python-logging/)
- [Real Python - dataclasses](https://realpython.com/python-data-classes/)
