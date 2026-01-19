# Test-Driven Development in Rust

> Write tests first, code second — and let the compiler be your first testing partner

Test-Driven Development (TDD) is a discipline that transforms how you write code. Instead of writing code and then testing it, you write tests first and let them drive your implementation. This guide covers TDD methodology, Rust-specific testing patterns, and most importantly — how to develop the **QA mindset** that separates good tests from great ones.

While [05-idioms-best-practices.md](05-idioms-best-practices.md) covers basic testing mechanics, this guide focuses on **methodology, strategy, and anti-patterns**.

**Reading time**: 90-120 minutes

---

## Table of Contents

- [Test-Driven Development in Rust](#test-driven-development-in-rust)
  - [Table of Contents](#table-of-contents)
  - [Why TDD? The Case for Test-First Development](#why-tdd-the-case-for-test-first-development)
    - [The Problem with Test-After](#the-problem-with-test-after)
    - [The TDD Promise](#the-tdd-promise)
    - [TDD + Rust: A Perfect Match](#tdd--rust-a-perfect-match)
    - [Evidence for TDD](#evidence-for-tdd)
  - [The TDD Cycle: Red-Green-Refactor](#the-tdd-cycle-red-green-refactor)
    - [Phase 1: Red — Write a Failing Test](#phase-1-red--write-a-failing-test)
    - [Phase 2: Green — Make It Pass](#phase-2-green--make-it-pass)
    - [Phase 3: Refactor — Improve the Code](#phase-3-refactor--improve-the-code)
    - [Complete Cycle Example: Email Validator](#complete-cycle-example-email-validator)
  - [Rust Testing Framework Deep Dive](#rust-testing-framework-deep-dive)
    - [Test Attributes](#test-attributes)
    - [Assertion Macros](#assertion-macros)
    - [Test Organization](#test-organization)
    - [Result-Returning Tests](#result-returning-tests)
    - [Running Tests](#running-tests)
  - [Thinking Like a QA Engineer](#thinking-like-a-qa-engineer)
    - [The Testing Mindset Shift](#the-testing-mindset-shift)
    - [Edge Case Hunting Techniques](#edge-case-hunting-techniques)
      - [Boundary Value Analysis](#boundary-value-analysis)
      - [Equivalence Partitioning](#equivalence-partitioning)
      - [Error Guessing](#error-guessing)
    - [The ZOMBIES Acronym](#the-zombies-acronym)
  - [Property-Based Testing with proptest](#property-based-testing-with-proptest)
    - [What is Property-Based Testing?](#what-is-property-based-testing)
    - [Basic proptest Usage](#basic-proptest-usage)
    - [Strategies](#strategies)
    - [Writing Good Properties](#writing-good-properties)
    - [Shrinking](#shrinking)
  - [Mocking with mockall](#mocking-with-mockall)
    - [When to Mock](#when-to-mock)
    - [The #\[automock\] Attribute](#the-automock-attribute)
    - [Expectations and Predicates](#expectations-and-predicates)
    - [When NOT to Mock](#when-not-to-mock)
  - [Test Fixtures with rstest](#test-fixtures-with-rstest)
    - [Parameterized Tests](#parameterized-tests)
    - [Fixtures](#fixtures)
    - [Combining Fixtures and Cases](#combining-fixtures-and-cases)
  - [Code Coverage](#code-coverage)
    - [cargo-llvm-cov (Recommended)](#cargo-llvm-cov-recommended)
    - [tarpaulin](#tarpaulin)
    - [grcov](#grcov)
    - [The Coverage Paradox](#the-coverage-paradox)
  - [Writing Testable Code](#writing-testable-code)
    - [Pure Functions](#pure-functions)
    - [Dependency Injection](#dependency-injection)
    - [Functional Core, Imperative Shell](#functional-core-imperative-shell)
    - [Traits for Abstraction](#traits-for-abstraction)
  - [TDD Anti-Patterns](#tdd-anti-patterns)
    - [The Liar](#the-liar)
    - [The Giant](#the-giant)
    - [Excessive Setup](#excessive-setup)
    - [The Slow Poke](#the-slow-poke)
    - [Testing Implementation Details](#testing-implementation-details)
    - [The 100% Coverage Obsession](#the-100-coverage-obsession)
  - [Test Code Smells](#test-code-smells)
    - [Conditional Logic in Tests](#conditional-logic-in-tests)
    - [Magic Numbers](#magic-numbers)
    - [Flaky Tests](#flaky-tests)
  - [The Test Pyramid](#the-test-pyramid)
    - [Pyramid Structure](#pyramid-structure)
    - [The Ice Cream Cone Anti-Pattern](#the-ice-cream-cone-anti-pattern)
  - [TDD Workflows](#tdd-workflows)
    - [New Feature Workflow](#new-feature-workflow)
    - [Bug Fix Workflow](#bug-fix-workflow)
    - [Legacy Code Workflow](#legacy-code-workflow)
  - [TDD for Different Scenarios](#tdd-for-different-scenarios)
    - [Testing Async Code](#testing-async-code)
    - [Testing Error Handling](#testing-error-handling)
    - [Testing Concurrent Code](#testing-concurrent-code)
    - [Testing CLI Applications](#testing-cli-applications)
  - [When NOT to Use TDD](#when-not-to-use-tdd)
    - [Alternatives to TDD](#alternatives-to-tdd)
  - [Interview Questions](#interview-questions)
  - [Quick Reference Cards](#quick-reference-cards)
    - [TDD Cycle Summary](#tdd-cycle-summary)
    - [Test Double Selection](#test-double-selection)
    - [Assertion Macros Reference](#assertion-macros-reference)
    - [proptest Strategies Cheat Sheet](#proptest-strategies-cheat-sheet)
    - [TDD Checklist](#tdd-checklist)
  - [Resources](#resources)

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

### TDD + Rust: A Perfect Match

Rust's strict compiler catches many bugs before tests even run. Combining Rust's guarantees with TDD creates exceptionally robust code:

| Rust Feature | TDD Benefit |
|--------------|-------------|
| **Type system** | Catches type errors at compile time |
| **Ownership** | Prevents data races and dangling pointers |
| **Pattern matching** | Forces exhaustive case handling |
| **`#[cfg(test)]`** | Zero-cost test organization |
| **`cargo test`** | Built-in test runner, no setup required |

```rust
// The compiler is your first tester
fn divide(a: i32, b: i32) -> Option<i32> {
    if b == 0 {
        None  // Compiler forces handling this case
    } else {
        Some(a / b)
    }
}
```

### Evidence for TDD

Studies show TDD's impact:

| Study | Finding |
|-------|---------|
| **IBM Case Study** | 40% fewer defects with 15-35% more initial time |
| **Microsoft Research** | 60-90% reduction in defect density |
| **Quality Studies** | Code written TDD-style has 40-80% fewer bugs |

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

```rust
// test_email_validator.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_string() {
        let result = validate_email("");
        assert!(result.is_err());
    }
}
```

**Rules:**
- Test must fail for the right reason (missing code, not syntax error)
- Test should be small and focused on one behavior
- Test name should describe the expected behavior

Run the test — it fails because the function doesn't exist:

```bash
$ cargo test
error[E0425]: cannot find function `validate_email` in this scope
```

### Phase 2: Green — Make It Pass

Write the **minimum** code to make the test pass.

```rust
#[derive(Debug, PartialEq)]
pub struct InvalidEmailError(String);

pub fn validate_email(email: &str) -> Result<&str, InvalidEmailError> {
    if email.is_empty() {
        return Err(InvalidEmailError("Email cannot be empty".to_string()));
    }
    Ok(email)
}
```

**Rules:**
- Write only enough code to pass the test
- "Ugly is OK" — you'll clean it up in refactor
- Don't add features the test doesn't require

```bash
$ cargo test
running 1 test
test tests::rejects_empty_string ... ok
```

### Phase 3: Refactor — Improve the Code

Now clean up without changing behavior. Tests must pass after every change.

```rust
// Maybe add a custom error type with thiserror
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum EmailError {
    #[error("Email cannot be empty")]
    Empty,
    #[error("Invalid email format: {0}")]
    InvalidFormat(String),
}

pub fn validate_email(email: &str) -> Result<&str, EmailError> {
    if email.is_empty() {
        return Err(EmailError::Empty);
    }
    Ok(email)
}
```

**Rules:**
- Tests must pass after every change
- Improve both production and test code
- No new functionality in this phase

### Complete Cycle Example: Email Validator

Let's build an email validator using multiple TDD cycles.

**Cycle 1: Reject empty strings**

```rust
// RED: Write failing test
#[test]
fn rejects_empty_string() {
    assert!(validate_email("").is_err());
}

// GREEN: Minimal implementation
pub fn validate_email(email: &str) -> Result<&str, &'static str> {
    if email.is_empty() {
        return Err("empty");
    }
    Ok(email)
}
```

**Cycle 2: Require @ symbol**

```rust
// RED: New failing test
#[test]
fn rejects_missing_at_symbol() {
    assert!(validate_email("userexample.com").is_err());
}

// GREEN: Add check
pub fn validate_email(email: &str) -> Result<&str, &'static str> {
    if email.is_empty() {
        return Err("empty");
    }
    if !email.contains('@') {
        return Err("missing @");
    }
    Ok(email)
}
```

**Cycle 3: Require domain**

```rust
// RED: New failing test
#[test]
fn rejects_missing_domain() {
    assert!(validate_email("user@").is_err());
}

// GREEN: Add check
pub fn validate_email(email: &str) -> Result<&str, &'static str> {
    if email.is_empty() {
        return Err("empty");
    }
    if !email.contains('@') {
        return Err("missing @");
    }
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 || parts[1].is_empty() {
        return Err("invalid format");
    }
    Ok(email)
}
```

**Cycle 4: REFACTOR — Clean up**

```rust
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum EmailError {
    #[error("Email cannot be empty")]
    Empty,
    #[error("Email must contain exactly one @ symbol")]
    MissingAt,
    #[error("Email must have a domain after @")]
    MissingDomain,
    #[error("Email must have a local part before @")]
    MissingLocalPart,
}

pub fn validate_email(email: &str) -> Result<&str, EmailError> {
    if email.is_empty() {
        return Err(EmailError::Empty);
    }

    let at_count = email.matches('@').count();
    if at_count != 1 {
        return Err(EmailError::MissingAt);
    }

    let (local, domain) = email.split_once('@').unwrap();

    if local.is_empty() {
        return Err(EmailError::MissingLocalPart);
    }

    if domain.is_empty() {
        return Err(EmailError::MissingDomain);
    }

    Ok(email)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_email() {
        assert_eq!(validate_email("user@example.com"), Ok("user@example.com"));
    }

    #[test]
    fn rejects_empty_string() {
        assert_eq!(validate_email(""), Err(EmailError::Empty));
    }

    #[test]
    fn rejects_missing_at_symbol() {
        assert_eq!(validate_email("userexample.com"), Err(EmailError::MissingAt));
    }

    #[test]
    fn rejects_missing_domain() {
        assert_eq!(validate_email("user@"), Err(EmailError::MissingDomain));
    }

    #[test]
    fn rejects_missing_local_part() {
        assert_eq!(validate_email("@example.com"), Err(EmailError::MissingLocalPart));
    }
}
```

---

## Rust Testing Framework Deep Dive

### Test Attributes

```rust
// Basic test
#[test]
fn basic_test() {
    assert_eq!(2 + 2, 4);
}

// Test that should panic
#[test]
#[should_panic]
fn panics() {
    panic!("This test passes because it panics");
}

// With specific panic message
#[test]
#[should_panic(expected = "divide by zero")]
fn panics_with_message() {
    let _ = 1 / 0;  // Will panic with message containing "divide by zero"
}

// Ignored test (skipped unless explicitly run)
#[test]
#[ignore]
fn slow_test() {
    // Expensive test that we skip by default
    std::thread::sleep(std::time::Duration::from_secs(60));
}

// Conditional compilation for tests
#[cfg(test)]
mod tests {
    use super::*;  // Import from parent module

    #[test]
    fn test_private_function() {
        // Tests can access private functions in the same module
    }
}
```

### Assertion Macros

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn assertion_examples() {
        // Basic equality
        assert_eq!(1 + 1, 2);
        assert_ne!(1 + 1, 3);

        // Boolean conditions
        assert!(true);
        assert!(!false);

        // With custom messages
        let x = 5;
        assert!(x > 0, "x should be positive, but was {}", x);
        assert_eq!(x, 5, "Expected x to be 5, but it was {}", x);

        // Matching patterns
        let result: Result<i32, &str> = Ok(42);
        assert!(result.is_ok());
        assert!(matches!(result, Ok(42)));

        // Debug output on failure (values must implement Debug)
        let vec = vec![1, 2, 3];
        assert_eq!(vec.len(), 3, "Vec was: {:?}", vec);
    }

    // Custom assertions with macro
    macro_rules! assert_approx_eq {
        ($a:expr, $b:expr, $eps:expr) => {
            let diff = ($a - $b).abs();
            assert!(
                diff < $eps,
                "Values not approximately equal: {} vs {} (diff: {})",
                $a, $b, diff
            );
        };
    }

    #[test]
    fn floating_point() {
        assert_approx_eq!(0.1 + 0.2, 0.3, 1e-10);
    }
}
```

### Test Organization

**Unit tests** — in the same file, test private functions:

```rust
// src/lib.rs or src/calculator.rs
fn add(a: i32, b: i32) -> i32 {
    a + b
}

pub fn calculate(a: i32, b: i32) -> i32 {
    add(a, b)  // Private helper
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);  // Can test private function
    }

    #[test]
    fn test_calculate() {
        assert_eq!(calculate(2, 3), 5);
    }

    // Nested modules for organization
    mod addition {
        use super::*;

        #[test]
        fn positive_numbers() {
            assert_eq!(add(1, 2), 3);
        }

        #[test]
        fn negative_numbers() {
            assert_eq!(add(-1, -2), -3);
        }
    }
}
```

**Integration tests** — in `tests/` directory, test public API:

```
project/
├── src/
│   └── lib.rs
└── tests/
    ├── integration_test.rs
    └── common/
        └── mod.rs  # Shared test utilities
```

```rust
// tests/integration_test.rs
use my_crate::calculate;

#[test]
fn test_public_api() {
    assert_eq!(calculate(2, 3), 5);
}

// tests/common/mod.rs (shared setup)
pub fn setup() -> TestContext {
    // Common setup code
}
```

**Doc tests** — in documentation comments:

```rust
/// Adds two numbers together.
///
/// # Examples
///
/// ```
/// use my_crate::add;
/// assert_eq!(add(2, 3), 5);
/// ```
///
/// # Panics
///
/// Doesn't panic.
///
/// ```should_panic
/// // This example shows panic behavior
/// panic!("This will panic");
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

### Result-Returning Tests

Tests can return `Result` to use `?` operator:

```rust
#[test]
fn test_with_result() -> Result<(), Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string("test_data.txt")?;
    assert!(content.contains("expected"));
    Ok(())
}

// Custom error type
#[derive(Debug)]
struct TestError(String);

impl std::error::Error for TestError {}
impl std::fmt::Display for TestError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Test error: {}", self.0)
    }
}

#[test]
fn test_with_custom_error() -> Result<(), TestError> {
    if 2 + 2 != 4 {
        return Err(TestError("Math is broken".to_string()));
    }
    Ok(())
}
```

### Running Tests

```bash
# Run all tests
cargo test

# Run tests matching a name pattern
cargo test test_add
cargo test calculator::tests::

# Run a specific test
cargo test tests::addition::positive_numbers

# Run ignored tests
cargo test -- --ignored

# Run all tests including ignored
cargo test -- --include-ignored

# Show output from passing tests
cargo test -- --nocapture

# Run tests sequentially (not in parallel)
cargo test -- --test-threads=1

# Run only doc tests
cargo test --doc

# Run only unit tests (no integration tests)
cargo test --lib

# Run only integration tests
cargo test --test integration_test

# Run tests in release mode
cargo test --release

# List tests without running
cargo test -- --list
```

---

## Thinking Like a QA Engineer

### The Testing Mindset Shift

The fundamental difference between developer testing and QA thinking:

| Developer Mindset | QA Mindset |
|-------------------|------------|
| "Does it work?" | "How can I break it?" |
| Test happy path | Test all paths |
| Trust user input | Assume malicious input |
| "It works on my machine" | "What about other environments?" |
| Test typical cases | Hunt for edge cases |
| Verify expected behavior | Explore unexpected behavior |

**The QA mantra**: "If I were trying to break this, what would I try?"

### Edge Case Hunting Techniques

#### Boundary Value Analysis

Test at the edges of valid input ranges. Bugs cluster at boundaries.

```rust
// Function: validate age (must be 0-150)
fn is_valid_age(age: i32) -> bool {
    age >= 0 && age <= 150
}

#[cfg(test)]
mod tests {
    use super::*;

    // Boundary values: -1, 0, 1, 149, 150, 151
    #[test]
    fn test_age_boundaries() {
        // Just below minimum
        assert!(!is_valid_age(-1));

        // At minimum boundary
        assert!(is_valid_age(0));

        // Just above minimum
        assert!(is_valid_age(1));

        // Just below maximum
        assert!(is_valid_age(149));

        // At maximum boundary
        assert!(is_valid_age(150));

        // Just above maximum
        assert!(!is_valid_age(151));
    }

    // Also test extreme values
    #[test]
    fn test_extreme_values() {
        assert!(!is_valid_age(i32::MIN));
        assert!(!is_valid_age(i32::MAX));
    }
}
```

#### Equivalence Partitioning

Divide inputs into groups that should behave the same. Test one from each group.

```rust
// Function: categorize temperature
fn categorize_temp(celsius: i32) -> &'static str {
    match celsius {
        ..=-1 => "Freezing",
        0..=15 => "Cold",
        16..=25 => "Comfortable",
        26..=35 => "Warm",
        36.. => "Hot",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // One test per partition, not every value
    #[test]
    fn test_temperature_categories() {
        // Freezing partition (< 0): test any value like -10
        assert_eq!(categorize_temp(-10), "Freezing");

        // Cold partition (0-15): test any value like 10
        assert_eq!(categorize_temp(10), "Cold");

        // Comfortable partition (16-25): test any value like 20
        assert_eq!(categorize_temp(20), "Comfortable");

        // Warm partition (26-35): test any value like 30
        assert_eq!(categorize_temp(30), "Warm");

        // Hot partition (> 35): test any value like 40
        assert_eq!(categorize_temp(40), "Hot");
    }
}
```

#### Error Guessing

Based on experience, guess common problem inputs:

```rust
#[cfg(test)]
mod error_guessing_tests {
    use super::*;

    #[test]
    fn test_string_edge_cases() {
        // Empty string
        assert!(process_string("").is_err());

        // Whitespace only
        assert!(process_string("   ").is_err());

        // Single character
        assert!(process_string("a").is_ok());

        // Very long string
        let long_string = "a".repeat(1_000_000);
        assert!(process_string(&long_string).is_ok());

        // Unicode characters
        assert!(process_string("héllo wörld").is_ok());
        assert!(process_string("你好世界").is_ok());
        assert!(process_string("🦀🦀🦀").is_ok());

        // Special characters
        assert!(process_string("hello\0world").is_ok());  // Null byte
        assert!(process_string("hello\nworld").is_ok());  // Newline

        // Potential injection
        assert!(process_string("'; DROP TABLE users;--").is_ok());
    }

    #[test]
    fn test_numeric_edge_cases() {
        // Zero
        assert!(process_number(0).is_ok());

        // Negative
        assert!(process_number(-1).is_err());

        // Maximum values
        assert!(process_number(i32::MAX).is_ok());

        // Overflow scenarios
        assert!(process_number(i32::MAX - 1).is_ok());
    }

    #[test]
    fn test_collection_edge_cases() {
        // Empty
        assert!(process_vec(&[]).is_ok());

        // Single element
        assert!(process_vec(&[1]).is_ok());

        // Duplicates
        assert!(process_vec(&[1, 1, 1]).is_ok());

        // Already sorted
        assert!(process_vec(&[1, 2, 3]).is_ok());

        // Reverse sorted
        assert!(process_vec(&[3, 2, 1]).is_ok());

        // All same values
        assert!(process_vec(&[5, 5, 5, 5, 5]).is_ok());
    }
}
```

### The ZOMBIES Acronym

A mnemonic for test case generation:

| Letter | Meaning | Examples |
|--------|---------|----------|
| **Z** | Zero | Empty collections, zero values, null/None |
| **O** | One | Single element, single character, value of 1 |
| **M** | Many | Multiple elements, large collections |
| **B** | Boundary | Min/max values, off-by-one scenarios |
| **I** | Interface | Public API contracts, trait implementations |
| **E** | Exception | Error cases, invalid inputs, panics |
| **S** | Simple/Scenarios | Happy path, real-world use cases |

```rust
#[cfg(test)]
mod zombies_tests {
    use super::*;

    // Z - Zero
    #[test]
    fn zero_elements() {
        assert_eq!(sum(&[]), 0);
    }

    // O - One
    #[test]
    fn one_element() {
        assert_eq!(sum(&[42]), 42);
    }

    // M - Many
    #[test]
    fn many_elements() {
        assert_eq!(sum(&[1, 2, 3, 4, 5]), 15);
    }

    // B - Boundary
    #[test]
    fn boundary_values() {
        assert_eq!(sum(&[i32::MAX]), i32::MAX);
        assert_eq!(sum(&[i32::MIN]), i32::MIN);
    }

    // I - Interface (does it match the contract?)
    #[test]
    fn interface_contract() {
        // Sum should be commutative in effect (order shouldn't matter for total)
        assert_eq!(sum(&[1, 2, 3]), sum(&[3, 2, 1]));
    }

    // E - Exception
    #[test]
    fn exception_cases() {
        // Overflow behavior
        let result = std::panic::catch_unwind(|| sum(&[i32::MAX, 1]));
        assert!(result.is_err());  // Should panic on overflow in debug mode
    }

    // S - Simple scenarios
    #[test]
    fn simple_real_world() {
        // Typical use case: summing a shopping cart
        let prices = vec![10, 25, 5, 100];
        assert_eq!(sum(&prices), 140);
    }
}
```

---

## Property-Based Testing with proptest

### What is Property-Based Testing?

Instead of testing specific examples, test **properties** that should hold for all inputs. The framework generates random inputs to find edge cases you wouldn't think of.

Add to `Cargo.toml`:

```toml
[dev-dependencies]
proptest = "1.4"
```

### Basic proptest Usage

```rust
use proptest::prelude::*;

// Property: reversing twice gives back the original
proptest! {
    #[test]
    fn reverse_twice_is_identity(v: Vec<i32>) {
        let reversed_twice: Vec<_> = v.iter().rev().rev().cloned().collect();
        prop_assert_eq!(reversed_twice, v);
    }
}

// Property: sorting is idempotent (sorting twice = sorting once)
proptest! {
    #[test]
    fn sorting_is_idempotent(mut v: Vec<i32>) {
        v.sort();
        let once_sorted = v.clone();
        v.sort();
        prop_assert_eq!(v, once_sorted);
    }
}

// Property: encoding then decoding gives back the original
proptest! {
    #[test]
    fn base64_roundtrip(s: String) {
        use base64::{Engine as _, engine::general_purpose};
        let encoded = general_purpose::STANDARD.encode(&s);
        let decoded = general_purpose::STANDARD.decode(&encoded).unwrap();
        let decoded_str = String::from_utf8(decoded).unwrap();
        prop_assert_eq!(decoded_str, s);
    }
}
```

### Strategies

Control how values are generated:

```rust
use proptest::prelude::*;

proptest! {
    // Constrained integer range
    #[test]
    fn age_is_positive(age in 0..=150i32) {
        prop_assert!(age >= 0 && age <= 150);
    }

    // String with specific pattern
    #[test]
    fn email_format(
        local in "[a-z]{1,10}",
        domain in "[a-z]{2,10}",
        tld in "com|org|net"
    ) {
        let email = format!("{}@{}.{}", local, domain, tld);
        prop_assert!(email.contains('@'));
    }

    // Vector with size constraints
    #[test]
    fn vec_has_bounded_size(v in prop::collection::vec(any::<i32>(), 0..100)) {
        prop_assert!(v.len() < 100);
    }

    // One of several options
    #[test]
    fn color_is_valid(color in prop_oneof!["red", "green", "blue"]) {
        prop_assert!(["red", "green", "blue"].contains(&color.as_str()));
    }

    // Filtered values
    #[test]
    fn only_even(n in (0..1000i32).prop_filter("must be even", |n| n % 2 == 0)) {
        prop_assert!(n % 2 == 0);
    }

    // Mapped values
    #[test]
    fn points_on_circle(
        (x, y) in (0.0..1.0f64, 0.0..1.0f64).prop_map(|(r, theta)| {
            let angle = theta * 2.0 * std::f64::consts::PI;
            (r * angle.cos(), r * angle.sin())
        })
    ) {
        prop_assert!(x * x + y * y <= 1.0);
    }
}
```

### Writing Good Properties

Properties should describe **invariants** — things that are always true:

```rust
use proptest::prelude::*;

// 1. Inverse operations
proptest! {
    #[test]
    fn serialize_deserialize_roundtrip(value: MyStruct) {
        let serialized = serde_json::to_string(&value).unwrap();
        let deserialized: MyStruct = serde_json::from_str(&serialized).unwrap();
        prop_assert_eq!(deserialized, value);
    }
}

// 2. Invariants (things that shouldn't change)
proptest! {
    #[test]
    fn sorting_preserves_length(v: Vec<i32>) {
        let mut sorted = v.clone();
        sorted.sort();
        prop_assert_eq!(sorted.len(), v.len());
    }

    #[test]
    fn sorting_preserves_elements(v: Vec<i32>) {
        let mut sorted = v.clone();
        sorted.sort();
        // Same multiset of elements
        let mut original = v.clone();
        original.sort();
        prop_assert_eq!(sorted, original);
    }
}

// 3. Idempotence (doing twice = doing once)
proptest! {
    #[test]
    fn normalize_is_idempotent(s: String) {
        let once = normalize(&s);
        let twice = normalize(&once);
        prop_assert_eq!(once, twice);
    }
}

// 4. Commutativity (order doesn't matter)
proptest! {
    #[test]
    fn addition_is_commutative(a: i32, b: i32) {
        prop_assert_eq!(a.wrapping_add(b), b.wrapping_add(a));
    }
}

// 5. Associativity
proptest! {
    #[test]
    fn addition_is_associative(a: i32, b: i32, c: i32) {
        prop_assert_eq!(
            (a.wrapping_add(b)).wrapping_add(c),
            a.wrapping_add(b.wrapping_add(c))
        );
    }
}
```

### Shrinking

When proptest finds a failing input, it **shrinks** it to the minimal failing case:

```rust
proptest! {
    #[test]
    fn buggy_function(v: Vec<i32>) {
        // Bug: crashes on vectors with more than 5 elements
        if v.len() > 5 {
            panic!("Too many elements!");
        }
    }
}

// proptest output:
// thread 'buggy_function' panicked at 'Too many elements!'
// proptest: Falsified input:
//   v = [0, 0, 0, 0, 0, 0]  // Shrunk to minimal failing case
```

The shrunk input is the **simplest** case that still triggers the bug.

---

## Mocking with mockall

### When to Mock

Mock when testing interactions with:
- External services (databases, APIs, file systems)
- Slow operations (network calls, disk I/O)
- Non-deterministic behavior (time, random numbers)
- Dependencies you don't control

Add to `Cargo.toml`:

```toml
[dev-dependencies]
mockall = "0.12"
```

### The #\[automock\] Attribute

```rust
use mockall::automock;

// Define a trait for the dependency
#[automock]
pub trait Database {
    fn get(&self, key: &str) -> Option<String>;
    fn set(&mut self, key: &str, value: &str) -> bool;
    fn delete(&mut self, key: &str) -> bool;
}

// Production code uses the trait
pub struct UserService<D: Database> {
    db: D,
}

impl<D: Database> UserService<D> {
    pub fn new(db: D) -> Self {
        Self { db }
    }

    pub fn get_user(&self, id: &str) -> Option<String> {
        self.db.get(&format!("user:{}", id))
    }

    pub fn create_user(&mut self, id: &str, name: &str) -> bool {
        self.db.set(&format!("user:{}", id), name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;

    #[test]
    fn get_user_found() {
        let mut mock = MockDatabase::new();

        // Set up expectation
        mock.expect_get()
            .with(eq("user:123"))
            .times(1)
            .returning(|_| Some("Alice".to_string()));

        let service = UserService::new(mock);
        assert_eq!(service.get_user("123"), Some("Alice".to_string()));
    }

    #[test]
    fn get_user_not_found() {
        let mut mock = MockDatabase::new();

        mock.expect_get()
            .with(eq("user:456"))
            .times(1)
            .returning(|_| None);

        let service = UserService::new(mock);
        assert_eq!(service.get_user("456"), None);
    }

    #[test]
    fn create_user_success() {
        let mut mock = MockDatabase::new();

        mock.expect_set()
            .with(eq("user:789"), eq("Bob"))
            .times(1)
            .returning(|_, _| true);

        let mut service = UserService::new(mock);
        assert!(service.create_user("789", "Bob"));
    }
}
```

### Expectations and Predicates

```rust
use mockall::predicate::*;

#[test]
fn mock_with_predicates() {
    let mut mock = MockDatabase::new();

    // Exact match
    mock.expect_get()
        .with(eq("exact_key"))
        .returning(|_| None);

    // Pattern matching
    mock.expect_get()
        .with(function(|key: &str| key.starts_with("user:")))
        .returning(|_| Some("Found".to_string()));

    // Any value
    mock.expect_set()
        .with(always(), always())
        .returning(|_, _| true);

    // Call count expectations
    mock.expect_delete()
        .times(2)  // Exactly 2 times
        .returning(|_| true);

    mock.expect_delete()
        .times(1..=3)  // 1 to 3 times
        .returning(|_| true);

    mock.expect_delete()
        .never()  // Should never be called
        .returning(|_| false);

    // Sequence of returns
    mock.expect_get()
        .times(3)
        .returning(|_| Some("first".to_string()))
        .returning(|_| Some("second".to_string()))
        .returning(|_| None);
}
```

### When NOT to Mock

| Don't Mock | Why |
|------------|-----|
| **Data structures** | No behavior to mock — just create real instances |
| **Pure functions** | Deterministic, fast — just call them |
| **The system under test** | You're testing it, not mocking it |
| **Everything** | Over-mocking makes tests fragile and meaningless |
| **Internal implementation** | Tests should verify behavior, not call sequences |

```rust
// BAD: Mocking data structures
struct MockVec { ... }  // Don't do this

// GOOD: Use real data
let data = vec![1, 2, 3];

// BAD: Mocking the thing you're testing
struct MockCalculator { ... }  // Don't mock what you're testing

// GOOD: Test the real calculator
let calc = Calculator::new();
assert_eq!(calc.add(2, 3), 5);
```

---

## Test Fixtures with rstest

rstest provides parameterized tests and fixtures. Add to `Cargo.toml`:

```toml
[dev-dependencies]
rstest = "0.18"
```

### Parameterized Tests

```rust
use rstest::rstest;

#[rstest]
#[case("user@example.com", true)]
#[case("user@test.org", true)]
#[case("", false)]
#[case("no-at-symbol", false)]
#[case("@no-local.com", false)]
#[case("no-domain@", false)]
#[case("multiple@@ats.com", false)]
fn test_email_validation(#[case] email: &str, #[case] expected: bool) {
    assert_eq!(is_valid_email(email), expected);
}

// With values expansion
#[rstest]
fn test_addition(
    #[values(1, 2, 3)] a: i32,
    #[values(10, 20, 30)] b: i32,
) {
    // Tests all 9 combinations: (1,10), (1,20), (1,30), (2,10), ...
    assert!(a + b > 0);
}
```

### Fixtures

```rust
use rstest::{fixture, rstest};

// Define a fixture
#[fixture]
fn database() -> MockDatabase {
    let mut db = MockDatabase::new();
    db.expect_get()
        .returning(|_| Some("default".to_string()));
    db
}

// Fixtures can have parameters
#[fixture]
fn database_with_data(#[default(vec![])] initial_data: Vec<(&str, &str)>) -> MockDatabase {
    let mut db = MockDatabase::new();
    for (key, value) in initial_data {
        db.expect_get()
            .with(eq(key.to_string()))
            .returning(move |_| Some(value.to_string()));
    }
    db
}

// Use fixtures in tests
#[rstest]
fn test_with_fixture(database: MockDatabase) {
    let service = UserService::new(database);
    assert!(service.get_user("any").is_some());
}

// Fixtures can depend on other fixtures
#[fixture]
fn user_service(database: MockDatabase) -> UserService<MockDatabase> {
    UserService::new(database)
}

#[rstest]
fn test_with_composed_fixture(user_service: UserService<MockDatabase>) {
    assert!(user_service.get_user("any").is_some());
}
```

### Combining Fixtures and Cases

```rust
use rstest::rstest;

#[fixture]
fn calculator() -> Calculator {
    Calculator::new()
}

#[rstest]
#[case(2, 3, 5)]
#[case(-1, 1, 0)]
#[case(0, 0, 0)]
#[case(i32::MAX, 0, i32::MAX)]
fn test_addition(
    calculator: Calculator,
    #[case] a: i32,
    #[case] b: i32,
    #[case] expected: i32,
) {
    assert_eq!(calculator.add(a, b), expected);
}
```

---

## Code Coverage

### cargo-llvm-cov (Recommended)

The most accurate coverage tool, using LLVM's instrumentation.

```bash
# Install
cargo install cargo-llvm-cov

# Run with coverage
cargo llvm-cov

# Generate HTML report
cargo llvm-cov --html
open target/llvm-cov/html/index.html

# Show uncovered lines
cargo llvm-cov --show-missing-lines

# With branch coverage
cargo llvm-cov --branch

# Exclude test code from coverage
cargo llvm-cov --ignore-filename-regex='tests?\.rs'
```

### tarpaulin

Popular alternative, especially on Linux.

```bash
# Install
cargo install cargo-tarpaulin

# Run
cargo tarpaulin

# Generate HTML report
cargo tarpaulin --out Html

# With branch coverage
cargo tarpaulin --branch

# Exclude specific files
cargo tarpaulin --exclude-files 'tests/*'
```

### grcov

Mozilla's coverage tool, good for CI pipelines.

```bash
# Install
cargo install grcov

# Set up (requires nightly for now)
export CARGO_INCREMENTAL=0
export RUSTFLAGS='-Cinstrument-coverage'
export LLVM_PROFILE_FILE='cargo-test-%p-%m.profraw'

# Run tests
cargo test

# Generate report
grcov . --binary-path ./target/debug/deps/ -s . -t html --branch --ignore-not-existing -o target/coverage/html
```

### The Coverage Paradox

High coverage doesn't mean good tests. Consider:

```rust
fn divide(a: i32, b: i32) -> i32 {
    a / b
}

#[test]
fn test_divide() {
    assert_eq!(divide(10, 2), 5);  // 100% coverage!
}
```

This test has 100% line coverage but:
- Doesn't test division by zero
- Doesn't test negative numbers
- Doesn't test overflow

**Coverage measures quantity, not quality.** Use it to find untested code, not to prove code is well-tested.

```rust
// Better tests (still same coverage, but actually useful)
#[test]
fn test_divide_positive() {
    assert_eq!(divide(10, 2), 5);
}

#[test]
#[should_panic(expected = "attempt to divide by zero")]
fn test_divide_by_zero() {
    divide(10, 0);
}

#[test]
fn test_divide_negative() {
    assert_eq!(divide(-10, 2), -5);
    assert_eq!(divide(10, -2), -5);
    assert_eq!(divide(-10, -2), 5);
}
```

---

## Writing Testable Code

### Pure Functions

Functions without side effects are trivial to test:

```rust
// PURE: Easy to test
fn calculate_tax(amount: f64, rate: f64) -> f64 {
    amount * rate
}

#[test]
fn test_calculate_tax() {
    assert_eq!(calculate_tax(100.0, 0.1), 10.0);
}

// IMPURE: Hard to test (depends on current time)
fn is_business_hours() -> bool {
    let hour = chrono::Local::now().hour();
    hour >= 9 && hour < 17
}

// PURE VERSION: Easy to test
fn is_business_hours_at(hour: u32) -> bool {
    hour >= 9 && hour < 17
}

#[test]
fn test_business_hours() {
    assert!(is_business_hours_at(10));
    assert!(!is_business_hours_at(20));
}
```

### Dependency Injection

Inject dependencies instead of creating them internally:

```rust
// HARD TO TEST: Creates its own dependencies
struct OrderProcessor {
    db: PostgresConnection,  // Hard-coded
    mailer: SmtpMailer,      // Hard-coded
}

impl OrderProcessor {
    fn new() -> Self {
        Self {
            db: PostgresConnection::new("postgres://..."),
            mailer: SmtpMailer::new("smtp://..."),
        }
    }
}

// EASY TO TEST: Dependencies are injected
trait Database {
    fn save_order(&mut self, order: &Order) -> Result<(), Error>;
}

trait Mailer {
    fn send_confirmation(&self, email: &str) -> Result<(), Error>;
}

struct OrderProcessor<D: Database, M: Mailer> {
    db: D,
    mailer: M,
}

impl<D: Database, M: Mailer> OrderProcessor<D, M> {
    fn new(db: D, mailer: M) -> Self {
        Self { db, mailer }
    }

    fn process(&mut self, order: Order) -> Result<(), Error> {
        self.db.save_order(&order)?;
        self.mailer.send_confirmation(&order.customer_email)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::mock;

    mock! {
        Db {}
        impl Database for Db {
            fn save_order(&mut self, order: &Order) -> Result<(), Error>;
        }
    }

    mock! {
        Mail {}
        impl Mailer for Mail {
            fn send_confirmation(&self, email: &str) -> Result<(), Error>;
        }
    }

    #[test]
    fn test_process_order() {
        let mut mock_db = MockDb::new();
        let mut mock_mailer = MockMail::new();

        mock_db.expect_save_order()
            .returning(|_| Ok(()));
        mock_mailer.expect_send_confirmation()
            .returning(|_| Ok(()));

        let mut processor = OrderProcessor::new(mock_db, mock_mailer);
        let order = Order { customer_email: "test@example.com".into() };

        assert!(processor.process(order).is_ok());
    }
}
```

### Functional Core, Imperative Shell

Separate pure logic from side effects:

```rust
// IMPURE SHELL: Handles I/O
fn process_file(path: &str) -> Result<(), Error> {
    let content = std::fs::read_to_string(path)?;  // Side effect
    let result = transform_content(&content);       // Pure function
    std::fs::write(path, result)?;                 // Side effect
    Ok(())
}

// PURE CORE: Easy to test exhaustively
fn transform_content(content: &str) -> String {
    content
        .lines()
        .filter(|line| !line.starts_with('#'))
        .map(|line| line.to_uppercase())
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test the pure core extensively
    #[test]
    fn test_transform_removes_comments() {
        let input = "hello\n# comment\nworld";
        let expected = "HELLO\nWORLD";
        assert_eq!(transform_content(input), expected);
    }

    #[test]
    fn test_transform_empty() {
        assert_eq!(transform_content(""), "");
    }

    // Integration test for the shell (fewer, higher-level tests)
    #[test]
    fn test_process_file_integration() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.txt");
        std::fs::write(&path, "hello\n# comment\nworld").unwrap();

        process_file(path.to_str().unwrap()).unwrap();

        let result = std::fs::read_to_string(&path).unwrap();
        assert_eq!(result, "HELLO\nWORLD");
    }
}
```

### Traits for Abstraction

Define traits at system boundaries:

```rust
// Define trait for external dependency
pub trait Clock {
    fn now(&self) -> DateTime<Utc>;
}

// Production implementation
pub struct SystemClock;
impl Clock for SystemClock {
    fn now(&self) -> DateTime<Utc> {
        Utc::now()
    }
}

// Test implementation
pub struct FakeClock {
    pub time: DateTime<Utc>,
}
impl Clock for FakeClock {
    fn now(&self) -> DateTime<Utc> {
        self.time
    }
}

// Code uses the trait
pub fn is_expired<C: Clock>(clock: &C, expiry: DateTime<Utc>) -> bool {
    clock.now() > expiry
}

#[test]
fn test_expiry() {
    let fake_clock = FakeClock {
        time: Utc.with_ymd_and_hms(2024, 6, 15, 12, 0, 0).unwrap(),
    };

    let past = Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap();
    let future = Utc.with_ymd_and_hms(2024, 12, 31, 0, 0, 0).unwrap();

    assert!(is_expired(&fake_clock, past));
    assert!(!is_expired(&fake_clock, future));
}
```

---

## TDD Anti-Patterns

### The Liar

Tests that pass but don't actually verify anything:

```rust
// BAD: Always passes
#[test]
fn test_liar() {
    let result = complex_calculation(42);
    assert!(true);  // Doesn't check result!
}

// GOOD: Actually verifies behavior
#[test]
fn test_honest() {
    let result = complex_calculation(42);
    assert_eq!(result, expected_value);
}
```

### The Giant

Tests that verify too much at once:

```rust
// BAD: Tests multiple behaviors
#[test]
fn test_giant() {
    let mut service = UserService::new();

    // Test creation
    service.create_user("alice", "Alice");
    assert!(service.user_exists("alice"));

    // Test update
    service.update_email("alice", "alice@example.com");
    assert_eq!(service.get_email("alice"), Some("alice@example.com".into()));

    // Test deletion
    service.delete_user("alice");
    assert!(!service.user_exists("alice"));

    // ... 50 more assertions
}

// GOOD: Focused tests
#[test]
fn create_user_makes_user_exist() {
    let mut service = UserService::new();
    service.create_user("alice", "Alice");
    assert!(service.user_exists("alice"));
}

#[test]
fn update_email_changes_email() {
    let mut service = UserService::new();
    service.create_user("alice", "Alice");
    service.update_email("alice", "alice@example.com");
    assert_eq!(service.get_email("alice"), Some("alice@example.com".into()));
}
```

### Excessive Setup

Tests with too much arrangement:

```rust
// BAD: 50 lines of setup
#[test]
fn test_excessive_setup() {
    let config = Config::builder()
        .set_option_a(true)
        .set_option_b(false)
        // ... 20 more options
        .build();

    let db = Database::connect(&config.db_url);
    let cache = Cache::new(&config.cache_url);
    let logger = Logger::new(&config.log_level);
    // ... more setup

    let service = Service::new(db, cache, logger, config);

    // Finally, the actual test (1 line)
    assert!(service.do_something().is_ok());
}

// GOOD: Use fixtures and builders
#[fixture]
fn service() -> Service {
    Service::with_defaults()  // Encapsulate setup
}

#[rstest]
fn test_with_fixture(service: Service) {
    assert!(service.do_something().is_ok());
}
```

### The Slow Poke

Tests that take too long:

```rust
// BAD: Sleeps in tests
#[test]
fn test_slow() {
    let result = make_http_request();  // Real network call
    std::thread::sleep(Duration::from_secs(5));  // Wait for something
    assert!(result.is_ok());
}

// GOOD: Mock external dependencies
#[test]
fn test_fast() {
    let mut mock = MockHttpClient::new();
    mock.expect_get()
        .returning(|_| Ok(Response::new(200)));

    let result = fetch_data(&mock);
    assert!(result.is_ok());
}
```

### Testing Implementation Details

Tests coupled to internal structure:

```rust
// BAD: Tests internal state
#[test]
fn test_implementation_details() {
    let mut list = SortedList::new();
    list.add(3);
    list.add(1);
    list.add(2);

    // Testing internal structure (fragile!)
    assert_eq!(list.internal_array[0], 1);
    assert_eq!(list.internal_array[1], 2);
    assert_eq!(list.internal_array[2], 3);
}

// GOOD: Tests behavior
#[test]
fn test_behavior() {
    let mut list = SortedList::new();
    list.add(3);
    list.add(1);
    list.add(2);

    // Testing public interface
    assert_eq!(list.get(0), Some(&1));
    assert_eq!(list.get(1), Some(&2));
    assert_eq!(list.get(2), Some(&3));
}
```

### The 100% Coverage Obsession

Testing for coverage, not quality:

```rust
// BAD: Testing getters for coverage
#[test]
fn test_getter() {
    let user = User { name: "Alice".into() };
    assert_eq!(user.name(), "Alice");  // Trivial, adds no value
}

// BAD: Testing the compiler
#[test]
fn test_struct_creation() {
    let point = Point { x: 1, y: 2 };
    assert_eq!(point.x, 1);  // The compiler already checks this
}

// GOOD: Test meaningful behavior
#[test]
fn test_user_full_name() {
    let user = User::new("Alice", "Smith");
    assert_eq!(user.full_name(), "Alice Smith");
}
```

---

## Test Code Smells

### Conditional Logic in Tests

```rust
// BAD: Logic in tests
#[test]
fn test_with_conditions() {
    let result = process(input);
    if input > 0 {
        assert!(result.is_ok());
    } else {
        assert!(result.is_err());
    }
}

// GOOD: Separate tests, no conditions
#[test]
fn test_positive_input() {
    let result = process(5);
    assert!(result.is_ok());
}

#[test]
fn test_negative_input() {
    let result = process(-5);
    assert!(result.is_err());
}

// BEST: Parameterized tests
#[rstest]
#[case(5, true)]
#[case(-5, false)]
fn test_process(#[case] input: i32, #[case] should_succeed: bool) {
    let result = process(input);
    assert_eq!(result.is_ok(), should_succeed);
}
```

### Magic Numbers

```rust
// BAD: Magic numbers
#[test]
fn test_magic() {
    let result = calculate(42, 17, 3);
    assert_eq!(result, 1789);
}

// GOOD: Named constants with meaning
#[test]
fn test_meaningful() {
    const TAX_RATE: f64 = 0.17;
    const DISCOUNT_RATE: f64 = 0.03;
    const PRICE: f64 = 100.0;
    const EXPECTED_TOTAL: f64 = 114.0;

    let result = calculate_total(PRICE, TAX_RATE, DISCOUNT_RATE);
    assert_eq!(result, EXPECTED_TOTAL);
}
```

### Flaky Tests

Tests that sometimes pass, sometimes fail:

```rust
// BAD: Time-dependent (might fail depending on when run)
#[test]
fn test_flaky_time() {
    let now = SystemTime::now();
    let result = is_business_hours(now);
    assert!(result);  // Fails at night!
}

// GOOD: Deterministic time
#[test]
fn test_deterministic_time() {
    let business_hour = NaiveTime::from_hms_opt(14, 0, 0).unwrap();
    let after_hours = NaiveTime::from_hms_opt(20, 0, 0).unwrap();

    assert!(is_business_hours_at(business_hour));
    assert!(!is_business_hours_at(after_hours));
}

// BAD: Order-dependent (depends on other tests)
#[test]
fn test_order_dependent() {
    // Assumes previous test created a user
    assert!(USER_SERVICE.get_user("alice").is_some());
}

// GOOD: Each test sets up its own state
#[test]
fn test_independent() {
    let mut service = UserService::new();
    service.create_user("alice", "Alice");
    assert!(service.get_user("alice").is_some());
}
```

---

## The Test Pyramid

### Pyramid Structure

```
        /\
       /  \      End-to-End Tests (10%)
      /    \     - Full system integration
     /------\    - Slow, expensive
    /        \   - Catch integration bugs
   /          \
  /   Integ    \ Integration Tests (20%)
 /    Tests     \ - Module boundaries
/----------------\ - Medium speed
       ||||
       ||||        Unit Tests (70%)
       ||||        - Fast, isolated
       ||||        - Most coverage
```

| Level | Count | Speed | Scope | Purpose |
|-------|-------|-------|-------|---------|
| **Unit** | Many | Fast (<10ms) | Single function/module | Logic correctness |
| **Integration** | Medium | Medium (<1s) | Multiple modules | Component interaction |
| **E2E** | Few | Slow (>1s) | Full system | User workflows |

### The Ice Cream Cone Anti-Pattern

Inverted pyramid — too many slow E2E tests:

```
    ████████████████
    ████████████████    Many E2E tests (slow, brittle)
    ████████████████
        ████████
        ████████        Some integration
          ████
          ████          Few unit tests
```

**Problems:**
- Slow feedback (tests take minutes/hours)
- Flaky tests (network, timing issues)
- Hard to debug (which component failed?)
- Expensive to maintain

**Fix:** Add unit tests, reduce E2E duplication.

---

## TDD Workflows

### New Feature Workflow

1. **Write acceptance test** (high-level, might not compile yet)
2. **Write first unit test** (RED)
3. **Implement minimal code** (GREEN)
4. **Refactor** (REFACTOR)
5. **Repeat** until acceptance test passes

```rust
// 1. Acceptance test (defines the feature)
#[test]
fn shopping_cart_calculates_total_with_discounts() {
    let mut cart = ShoppingCart::new();
    cart.add_item("apple", 1.00, 3);
    cart.add_item("banana", 0.50, 2);
    cart.apply_discount(0.10);  // 10% off

    assert_eq!(cart.total(), 3.60);  // (3*1 + 2*0.5) * 0.9
}

// 2-4. Unit tests drive implementation
#[test]
fn empty_cart_has_zero_total() { ... }

#[test]
fn cart_sums_item_prices() { ... }

#[test]
fn discount_reduces_total() { ... }
```

### Bug Fix Workflow

1. **Write failing test** that reproduces the bug
2. **Verify test fails** for the right reason
3. **Fix the bug**
4. **Verify test passes**
5. **Add related edge case tests**

```rust
// 1. Reproduce the bug
#[test]
fn bug_123_negative_quantities_crash() {
    // This was crashing before the fix
    let mut cart = ShoppingCart::new();
    cart.add_item("apple", 1.00, -1);  // Bug: negative quantity

    // Expected: error or quantity of 0
    assert!(cart.total() >= 0.0);
}

// 5. Related edge cases
#[test]
fn zero_quantity_items_ignored() {
    let mut cart = ShoppingCart::new();
    cart.add_item("apple", 1.00, 0);
    assert_eq!(cart.total(), 0.0);
}
```

### Legacy Code Workflow

1. **Write characterization tests** (document current behavior)
2. **Find seams** where you can inject test doubles
3. **Break dependencies** carefully
4. **Add tests** as you modify code

```rust
// 1. Characterization test (captures existing behavior, even if buggy)
#[test]
fn characterization_legacy_total_calculation() {
    let legacy = LegacySystem::new();
    // Document actual behavior, even if it seems wrong
    assert_eq!(legacy.calculate(100, 0.1), 110);  // 100 + 10% = 110
}

// 2. Once you understand behavior, refactor safely
```

---

## TDD for Different Scenarios

### Testing Async Code

```toml
[dev-dependencies]
tokio = { version = "1", features = ["rt", "macros"] }
```

```rust
use tokio;

// Async test with tokio
#[tokio::test]
async fn test_async_fetch() {
    let result = fetch_data("http://example.com").await;
    assert!(result.is_ok());
}

// With timeout
#[tokio::test]
async fn test_with_timeout() {
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        slow_operation()
    ).await;

    assert!(result.is_ok());
}

// Multiple concurrent operations
#[tokio::test]
async fn test_concurrent() {
    let (r1, r2) = tokio::join!(
        operation_a(),
        operation_b()
    );

    assert!(r1.is_ok());
    assert!(r2.is_ok());
}
```

### Testing Error Handling

```rust
#[test]
fn test_error_variant() {
    let result = parse_config("invalid");
    assert!(matches!(result, Err(ConfigError::InvalidFormat(_))));
}

#[test]
fn test_error_message() {
    let result = parse_config("");
    let err = result.unwrap_err();
    assert!(err.to_string().contains("empty"));
}

#[test]
fn test_error_chain() {
    let result = load_config("nonexistent.toml");
    let err = result.unwrap_err();

    // Check error chain
    assert!(err.source().is_some());
}

#[test]
#[should_panic(expected = "invariant violated")]
fn test_panic_on_invariant_violation() {
    let mut system = System::new();
    system.break_invariant();  // Should panic
}
```

### Testing Concurrent Code

```rust
use std::sync::{Arc, Mutex};
use std::thread;

#[test]
fn test_concurrent_counter() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..100 {
                let mut num = counter.lock().unwrap();
                *num += 1;
            }
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    assert_eq!(*counter.lock().unwrap(), 1000);
}

// Test for race conditions with loom (advanced)
#[cfg(loom)]
mod loom_tests {
    use loom::sync::Arc;
    use loom::thread;

    #[test]
    fn test_concurrent_with_loom() {
        loom::model(|| {
            // loom explores all possible thread interleavings
        });
    }
}
```

### Testing CLI Applications

```toml
[dev-dependencies]
assert_cmd = "2"
predicates = "3"
```

```rust
use assert_cmd::Command;
use predicates::prelude::*;

#[test]
fn test_cli_help() {
    let mut cmd = Command::cargo_bin("myapp").unwrap();
    cmd.arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("Usage:"));
}

#[test]
fn test_cli_with_input() {
    let mut cmd = Command::cargo_bin("myapp").unwrap();
    cmd.arg("--config")
        .arg("test.toml")
        .assert()
        .success();
}

#[test]
fn test_cli_error() {
    let mut cmd = Command::cargo_bin("myapp").unwrap();
    cmd.arg("--invalid-flag")
        .assert()
        .failure()
        .stderr(predicate::str::contains("error"));
}
```

---

## When NOT to Use TDD

TDD isn't always the right approach:

| Scenario | Why Skip TDD | Alternative |
|----------|--------------|-------------|
| **Exploratory prototypes** | You're learning, not building | Spike, then test later |
| **Throwaway scripts** | One-time use | Manual testing |
| **UI/visual code** | Hard to test appearance | Visual regression testing |
| **Spikes/research** | Discovery, not construction | Document findings |
| **Legacy code (initially)** | No tests to guide you | Characterization tests first |

### Alternatives to TDD

**Spike and Stabilize:**
1. Write experimental code without tests
2. Once design is clear, add tests
3. Refactor with test safety net

**Test-After for Prototypes:**
1. Build prototype quickly
2. If it survives, add tests
3. Use tests to guide production version

**Characterization Tests:**
1. Write tests that document existing behavior
2. Use these as safety net for changes
3. Gradually improve test quality

---

## Interview Questions

### Q1: What is Test-Driven Development?

TDD is a software development discipline where you write tests before writing production code. The cycle is Red (write failing test), Green (make it pass with minimal code), and Refactor (improve the code while keeping tests passing). It leads to better-designed, more testable code with high test coverage.

### Q2: Explain the Red-Green-Refactor cycle.

**Red**: Write a test for functionality that doesn't exist yet. Run it to confirm it fails. **Green**: Write the minimum code to make the test pass. Don't worry about elegance. **Refactor**: Clean up the code (both production and test) while ensuring tests still pass. Then repeat.

### Q3: What's the difference between a mock and a stub?

A **stub** provides canned responses to calls made during the test — it's passive. A **mock** is a stub with expectations about how it should be called — it's active and can fail the test if expectations aren't met. Use stubs when you don't care about interactions, mocks when interactions matter.

### Q4: What is property-based testing?

Property-based testing verifies that certain properties (invariants) hold for all possible inputs, not just specific examples. Instead of testing `add(2, 3) == 5`, you test `add(a, b) == add(b, a)` for all values of a and b. The framework generates random inputs and shrinks failing cases to minimal reproducers.

### Q5: What is the test pyramid?

The test pyramid suggests having many fast unit tests (base), fewer integration tests (middle), and even fewer E2E tests (top). This provides fast feedback, good coverage, and maintainable tests. The anti-pattern is the "ice cream cone" with many slow E2E tests.

### Q6: How do you test code with external dependencies?

Use dependency injection to pass dependencies as parameters, then substitute test doubles (mocks, stubs, fakes) in tests. Define traits for external services and implement them for both production and test scenarios.

### Q7: What makes code hard to test?

Global state, hidden dependencies, non-determinism (time, random), tight coupling, long methods, side effects mixed with logic, and lack of interfaces at boundaries. Testable code has explicit dependencies, pure functions, and clear separation of concerns.

### Q8: What is a flaky test and how do you fix it?

A flaky test passes sometimes and fails other times without code changes. Common causes: time dependencies, race conditions, test order dependencies, and external service instability. Fix by making tests deterministic, independent, and mocking external services.

### Q9: When should you NOT use TDD?

Skip TDD for: exploratory prototypes, one-off scripts, UI/visual code, research spikes, and initial work on legacy code without tests. Use alternatives like spike-and-stabilize or characterization tests.

### Q10: How do you test async code in Rust?

Use the `#[tokio::test]` attribute for async test functions. Mock async dependencies with `mockall` (supports async traits). Use `tokio::time::timeout` to prevent hanging tests. Test concurrent behavior with `tokio::join!` or spawn tasks.

---

## Quick Reference Cards

### TDD Cycle Summary

```
┌─────────────────────────────────────────┐
│ 1. RED: Write failing test              │
│    - Test must fail for right reason    │
│    - Test one behavior at a time        │
├─────────────────────────────────────────┤
│ 2. GREEN: Make it pass                  │
│    - Minimum code to pass               │
│    - "Ugly is OK"                       │
├─────────────────────────────────────────┤
│ 3. REFACTOR: Improve the code           │
│    - Tests must pass after each change  │
│    - Clean both prod and test code      │
├─────────────────────────────────────────┤
│ 4. REPEAT                               │
└─────────────────────────────────────────┘
```

### Test Double Selection

| Need | Type | When to Use |
|------|------|-------------|
| Canned responses | **Stub** | You don't care about interactions |
| Verify interactions | **Mock** | Method calls matter |
| Simplified implementation | **Fake** | In-memory database, test server |
| Record interactions | **Spy** | Need to verify after the fact |
| Placeholder | **Dummy** | Parameter required but unused |

### Assertion Macros Reference

| Macro | Purpose | Example |
|-------|---------|---------|
| `assert!` | Boolean condition | `assert!(x > 0)` |
| `assert_eq!` | Equality | `assert_eq!(a, b)` |
| `assert_ne!` | Inequality | `assert_ne!(a, b)` |
| `assert!(matches!)` | Pattern matching | `assert!(matches!(x, Some(_)))` |
| `#[should_panic]` | Expect panic | `#[should_panic(expected = "msg")]` |

### proptest Strategies Cheat Sheet

| Strategy | Generates |
|----------|-----------|
| `any::<T>()` | Any value of type T |
| `0..100i32` | Integer in range |
| `"[a-z]+"` | String matching regex |
| `prop::collection::vec(any::<T>(), 0..10)` | Vec with 0-10 elements |
| `prop_oneof!["a", "b", "c"]` | One of the values |
| `(a, b).prop_map(f)` | Transform tuple |
| `any::<T>().prop_filter(msg, f)` | Filtered values |

### TDD Checklist

```
Before committing:
□ All tests pass
□ New code has tests
□ Tests are focused (one assertion concept each)
□ No test code in production
□ No production code without tests
□ Tests run in < 10 seconds
□ No flaky tests
□ Coverage didn't decrease
```

---

## Resources

### Official Documentation
- [Rust Book - Testing](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Rust by Example - Testing](https://doc.rust-lang.org/rust-by-example/testing.html)
- [Cargo Test Documentation](https://doc.rust-lang.org/cargo/commands/cargo-test.html)

### Books
- *Test-Driven Development: By Example* — Kent Beck
- *Growing Object-Oriented Software, Guided by Tests* — Freeman & Pryce
- *Working Effectively with Legacy Code* — Michael Feathers

### Crates
- [proptest](https://crates.io/crates/proptest) — Property-based testing
- [mockall](https://crates.io/crates/mockall) — Mocking framework
- [rstest](https://crates.io/crates/rstest) — Fixtures and parameterized tests
- [fake](https://crates.io/crates/fake) — Fake data generation
- [assert_cmd](https://crates.io/crates/assert_cmd) — CLI testing
- [criterion](https://crates.io/crates/criterion) — Benchmarking

### Coverage Tools
- [cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov) — Recommended
- [cargo-tarpaulin](https://github.com/xd009642/tarpaulin) — Linux-focused
- [grcov](https://github.com/mozilla/grcov) — Mozilla's tool

### Related Guides in This Series
- [05-idioms-best-practices.md](05-idioms-best-practices.md) — Testing basics
- [07-tooling-workflow.md](07-tooling-workflow.md) — Cargo and CI/CD
- [17-std-library-essentials.md](17-std-library-essentials.md) — Standard library for testing
