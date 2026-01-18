# Rust Tooling and Development Workflow

> Essential tools every Rust developer should know

Master these tools to write, lint, format, and ship production-quality Rust code efficiently.

---

## Table of Contents

1. [Cargo Essentials](#cargo-essentials)
2. [Clippy — Linting](#clippy--linting)
3. [Rustfmt — Code Formatting](#rustfmt--code-formatting)
4. [rust-analyzer — IDE Support](#rust-analyzer--ide-support)
5. [Development Tools](#development-tools)
6. [CI/CD Integration](#cicd-integration)
7. [Debugging](#debugging)
8. [Essential Crates](#essential-crates)
9. [Community & Conferences](#community--conferences)

---

## Cargo Essentials

Cargo is Rust's build system and package manager.

### Common Commands

```bash
# Create a new project
cargo new my_project          # Binary project
cargo new my_lib --lib        # Library project

# Build
cargo build                   # Debug build
cargo build --release         # Optimized release build

# Run
cargo run                     # Build and run
cargo run --release           # Run optimized build
cargo run -- arg1 arg2        # Pass arguments to your program

# Test
cargo test                    # Run all tests
cargo test test_name          # Run specific test
cargo test --lib              # Only library tests
cargo test --doc              # Only documentation tests
cargo test -- --nocapture     # Show println! output

# Check (faster than build, no codegen)
cargo check                   # Type-check without building

# Documentation
cargo doc --open              # Generate and open docs

# Dependencies
cargo add serde               # Add dependency (cargo-edit)
cargo update                  # Update dependencies
cargo tree                    # Show dependency tree
```

### Cargo.toml Configuration

```toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2024"              # Rust edition
rust-version = "1.88"         # Minimum supported Rust version

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }

[dev-dependencies]
criterion = "0.5"
proptest = "1.4"

[profile.release]
lto = true                    # Link-time optimization
codegen-units = 1             # Better optimization, slower compile

[profile.dev]
opt-level = 0                 # Fast compile, slow runtime
debug = true                  # Debug symbols

[profile.dev.package."*"]
opt-level = 2                 # Optimize dependencies in dev
```

### Workspaces

For multi-crate projects:

```toml
# Cargo.toml (workspace root)
[workspace]
members = [
    "crates/core",
    "crates/cli",
    "crates/web",
]

[workspace.dependencies]
serde = { version = "1.0", features = ["derive"] }
```

```toml
# crates/core/Cargo.toml
[package]
name = "my-core"

[dependencies]
serde.workspace = true        # Inherit from workspace
```

---

## Clippy — Linting

Clippy catches common mistakes and suggests idiomatic improvements.

### Running Clippy

```bash
# Basic usage
cargo clippy

# Treat warnings as errors (for CI)
cargo clippy -- -D warnings

# Fix auto-fixable lints
cargo clippy --fix

# Check all targets (tests, benches, examples)
cargo clippy --all-targets --all-features
```

### Configuring Clippy

Create `clippy.toml` in your project root:

```toml
# clippy.toml
msrv = "1.88"                 # Minimum supported Rust version
cognitive-complexity-threshold = 30
too-many-arguments-threshold = 10
```

### Common Lint Attributes

```rust
// Allow specific lint for an item
#[allow(clippy::too_many_arguments)]
fn complex_function(a: i32, b: i32, c: i32, d: i32, e: i32, f: i32, g: i32) {}

// Deny a lint (turn warning into error)
#![deny(clippy::unwrap_used)]

// Warn on a lint category
#![warn(clippy::pedantic)]

// Allow at module level
#![allow(dead_code)]
```

### Useful Lint Categories

```rust
// In lib.rs or main.rs

// Recommended for most projects
#![warn(clippy::all)]

// Stricter lints (may have false positives)
#![warn(clippy::pedantic)]

// Nursery lints (experimental)
#![warn(clippy::nursery)]

// Restriction lints (opt-in, very strict)
// #![warn(clippy::restriction)]  // Usually too strict

// Common specific lints to enable
#![warn(
    clippy::unwrap_used,          // Prefer expect() or ?
    clippy::expect_used,          // Consider proper error handling
    clippy::panic,                // Avoid panics in library code
    clippy::todo,                 // Don't ship TODOs
    clippy::dbg_macro,            // Remove debug macros
)]
```

---

## Rustfmt — Code Formatting

Rustfmt automatically formats code to the Rust style guide.

### Running Rustfmt

```bash
# Format all files
cargo fmt

# Check formatting without changing files
cargo fmt -- --check

# Format specific file
rustfmt src/main.rs
```

### Configuration

Create `rustfmt.toml` in your project root:

```toml
# rustfmt.toml
edition = "2024"
max_width = 100
tab_spaces = 4
use_small_heuristics = "Default"

# Import organization
imports_granularity = "Module"
group_imports = "StdExternalCrate"
reorder_imports = true

# Other options
format_code_in_doc_comments = true
format_macro_matchers = true
```

### Common Options

| Option | Values | Description |
|--------|--------|-------------|
| `max_width` | integer | Maximum line width |
| `tab_spaces` | integer | Spaces per indentation |
| `use_small_heuristics` | Default, Off, Max | Control formatting heuristics |
| `imports_granularity` | Crate, Module, Item | How to group imports |
| `reorder_imports` | bool | Sort imports alphabetically |

---

## rust-analyzer — IDE Support

rust-analyzer provides IDE features via the Language Server Protocol (LSP).

### VS Code Setup

1. Install the "rust-analyzer" extension
2. Recommended settings in `.vscode/settings.json`:

```json
{
    "rust-analyzer.checkOnSave.command": "clippy",
    "rust-analyzer.cargo.features": "all",
    "rust-analyzer.procMacro.enable": true,
    "rust-analyzer.inlayHints.chainingHints.enable": true,
    "rust-analyzer.inlayHints.typeHints.enable": true,
    "editor.formatOnSave": true,
    "[rust]": {
        "editor.defaultFormatter": "rust-lang.rust-analyzer"
    }
}
```

### Key Features

| Feature | Shortcut (VS Code) | Description |
|---------|-------------------|-------------|
| Go to definition | F12 | Jump to symbol definition |
| Find references | Shift+F12 | Find all usages |
| Rename symbol | F2 | Rename across project |
| Quick fix | Ctrl+. | Apply suggested fixes |
| Expand macro | Command palette | See macro expansion |
| Inlay hints | Auto | Show inferred types |

### Other Editors

- **Neovim**: Use `nvim-lspconfig` with rust-analyzer
- **Emacs**: Use `lsp-mode` or `eglot` with rust-analyzer
- **Helix**: Built-in LSP support, just install rust-analyzer
- **Zed**: Built-in Rust support

---

## Development Tools

### cargo-watch — Auto-rebuild

Automatically rebuild on file changes:

```bash
# Install
cargo install cargo-watch

# Watch and check
cargo watch -x check

# Watch and run tests
cargo watch -x test

# Watch and run
cargo watch -x run

# Chain commands
cargo watch -x check -x test -x run

# Ignore files
cargo watch -x test -i "*.log"
```

### cargo-expand — Macro Debugging

See what macros expand to:

```bash
# Install
cargo install cargo-expand

# Expand all macros in a file
cargo expand

# Expand specific item
cargo expand my_module::my_function
```

### cargo-edit — Dependency Management

```bash
# Install
cargo install cargo-edit

# Add dependency
cargo add serde
cargo add serde --features derive
cargo add tokio@1.0

# Add dev dependency
cargo add --dev criterion

# Remove dependency
cargo rm serde

# Upgrade dependencies
cargo upgrade
```

### cargo-audit — Security Scanning

```bash
# Install
cargo install cargo-audit

# Scan for known vulnerabilities
cargo audit

# Fix vulnerabilities if possible
cargo audit fix
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/rust.yml
name: Rust CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  CARGO_TERM_COLOR: always

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt

      - name: Cache cargo
        uses: Swatinem/rust-cache@v2

      - name: Check formatting
        run: cargo fmt -- --check

      - name: Clippy
        run: cargo clippy --all-targets --all-features -- -D warnings

      - name: Build
        run: cargo build --verbose

      - name: Run tests
        run: cargo test --verbose

  # Optional: Security audit
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rustsec/audit-check@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Pre-commit Hooks

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: cargo-fmt
        name: cargo fmt
        entry: cargo fmt --
        language: system
        types: [rust]
        pass_filenames: false

      - id: cargo-clippy
        name: cargo clippy
        entry: cargo clippy -- -D warnings
        language: system
        types: [rust]
        pass_filenames: false
```

Or use a simple git hook (`.git/hooks/pre-commit`):

```bash
#!/bin/sh
cargo fmt -- --check && cargo clippy -- -D warnings
```

---

## Debugging

### Debug Printing

```rust
// Debug trait - use {:?}
let v = vec![1, 2, 3];
println!("{:?}", v);        // [1, 2, 3]
println!("{:#?}", v);       // Pretty-printed

// dbg! macro - prints file, line, and expression
let x = dbg!(5 + 5);        // [src/main.rs:10] 5 + 5 = 10

// Debug with variable name
let name = "Alice";
println!("{name:?}");       // "Alice"
```

### Using a Debugger

For VS Code with CodeLLDB extension:

```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "lldb",
            "request": "launch",
            "name": "Debug",
            "cargo": {
                "args": ["build", "--bin=my_app"],
            },
            "args": [],
            "cwd": "${workspaceFolder}"
        },
        {
            "type": "lldb",
            "request": "launch",
            "name": "Debug Tests",
            "cargo": {
                "args": ["test", "--no-run"]
            },
            "args": [],
            "cwd": "${workspaceFolder}"
        }
    ]
}
```

### Profiling

```bash
# CPU profiling with flamegraph
cargo install flamegraph
cargo flamegraph --bin my_app

# Memory profiling with heaptrack (Linux)
heaptrack ./target/release/my_app
heaptrack_gui heaptrack.my_app.*.gz
```

---

## Essential Crates

These are the most important crates to know in the Rust ecosystem.

### Async Runtime
| Crate | Purpose |
|-------|---------|
| **tokio** | Async runtime (dominant, production-ready). See [TokioConf 2026](https://tokio.rs/blog/2026-01-12-tokio-conf-program) |
| smol | Lightweight async runtime |

### Serialization
| Crate | Purpose |
|-------|---------|
| **serde** | Serialization framework |
| **serde_json** | JSON support |
| serde_yaml | YAML support |
| toml | TOML support |

### Error Handling
| Crate | Purpose |
|-------|---------|
| **thiserror** | Derive Error for libraries |
| **anyhow** | Error handling for applications |

### Web & HTTP
| Crate | Purpose |
|-------|---------|
| **axum** | Web framework (Tokio ecosystem) |
| reqwest | HTTP client |
| hyper | Low-level HTTP |
| tonic | gRPC framework |

### Database
| Crate | Purpose |
|-------|---------|
| **sqlx** | Async SQL (compile-time checked queries) |
| diesel | ORM with compile-time checked queries |
| sea-orm | Async ORM |

### Concurrency
| Crate | Purpose |
|-------|---------|
| **rayon** | Data parallelism |
| crossbeam | Concurrent data structures |
| parking_lot | Faster synchronization primitives |

### CLI
| Crate | Purpose |
|-------|---------|
| **clap** | Command-line argument parsing |
| indicatif | Progress bars |
| colored | Terminal colors |

### Logging & Observability
| Crate | Purpose |
|-------|---------|
| **tracing** | Structured logging/tracing |
| tracing-subscriber | Tracing formatters |
| log | Logging facade (older) |

### Testing
| Crate | Purpose |
|-------|---------|
| **proptest** | Property-based testing |
| **mockall** | Mocking framework |
| criterion | Benchmarking |

---

## Recommended Project Setup

For a new production project:

```bash
# Create project
cargo new my_project && cd my_project

# Add essential dev tools
rustup component add clippy rustfmt

# Create config files
echo 'edition = "2024"' > rustfmt.toml
echo 'msrv = "1.96"' > clippy.toml

# Add common dependencies
cargo add serde --features derive
cargo add tokio --features full
cargo add anyhow
cargo add tracing tracing-subscriber
cargo add --dev proptest
```

```
my_project/
├── .github/
│   └── workflows/
│       └── rust.yml        # CI configuration
├── src/
│   ├── main.rs
│   └── lib.rs
├── tests/
│   └── integration_test.rs
├── benches/
│   └── benchmark.rs
├── Cargo.toml
├── clippy.toml
├── rustfmt.toml
└── README.md
```

---

## Community & Conferences

Stay connected with the Rust ecosystem:

### Conferences (2026)

| Event | Date | Location |
|-------|------|----------|
| [TokioConf 2026](https://tokio.rs/blog/2026-01-12-tokio-conf-program) | April 20-22, 2026 | Portland, OR |
| RustConf | TBA | TBA |
| EuroRust | TBA | Europe |

TokioConf 2026 is the **inaugural** dedicated conference for async Rust developers, featuring workshops on async runtime internals.

### Online Resources

- [This Week in Rust](https://this-week-in-rust.org/) — Weekly newsletter
- [Rust Blog](https://blog.rust-lang.org/) — Official announcements
- [r/rust](https://reddit.com/r/rust) — Community discussions
- [Rust Discord](https://discord.gg/rust-lang) — Real-time chat
- [Rust Users Forum](https://users.rust-lang.org/) — Q&A

---

<p align="center">
<b>Good tooling makes good code easier to write.</b><br>
Invest time in your development environment.
</p>
