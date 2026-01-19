# Test-Driven Development in TypeScript

> Write tests first, code second — and build the QA mindset that catches bugs before they exist

Test-Driven Development (TDD) is a discipline that transforms how you write code. Instead of writing code and then testing it, you write tests first and let them drive your implementation. This guide covers TDD methodology, TypeScript-specific testing patterns, and most importantly — how to develop the **QA mindset** that separates good tests from great ones.

While [08-tooling-testing.md](08-tooling-testing.md) covers basic testing mechanics, this guide focuses on **methodology, strategy, and anti-patterns**.

**Reading time**: 90-120 minutes

---

## Table of Contents

- [Test-Driven Development in TypeScript](#test-driven-development-in-typescript)
  - [Table of Contents](#table-of-contents)
  - [Why TDD? The Case for Test-First Development](#why-tdd-the-case-for-test-first-development)
    - [The Problem with Test-After](#the-problem-with-test-after)
    - [The TDD Promise](#the-tdd-promise)
    - [TDD + TypeScript: A Perfect Match](#tdd--typescript-a-perfect-match)
    - [Evidence for TDD](#evidence-for-tdd)
  - [The TDD Cycle: Red-Green-Refactor](#the-tdd-cycle-red-green-refactor)
    - [Phase 1: Red — Write a Failing Test](#phase-1-red--write-a-failing-test)
    - [Phase 2: Green — Make It Pass](#phase-2-green--make-it-pass)
    - [Phase 3: Refactor — Improve the Code](#phase-3-refactor--improve-the-code)
    - [Complete Cycle Example: Email Validator](#complete-cycle-example-email-validator)
  - [TypeScript Testing Framework Deep Dive](#typescript-testing-framework-deep-dive)
    - [Vitest vs Jest vs Node Test Runner (2025-2026)](#vitest-vs-jest-vs-node-test-runner-2025-2026)
    - [Test Structure](#test-structure)
    - [Assertion Patterns](#assertion-patterns)
    - [Test Organization](#test-organization)
  - [Thinking Like a QA Engineer](#thinking-like-a-qa-engineer)
    - [The Testing Mindset Shift](#the-testing-mindset-shift)
    - [Edge Case Hunting Techniques](#edge-case-hunting-techniques)
      - [Boundary Value Analysis](#boundary-value-analysis)
      - [Equivalence Partitioning](#equivalence-partitioning)
      - [Error Guessing](#error-guessing)
    - [The ZOMBIES Acronym](#the-zombies-acronym)
  - [Property-Based Testing with fast-check](#property-based-testing-with-fast-check)
    - [What is Property-Based Testing?](#what-is-property-based-testing)
    - [Basic fast-check Usage](#basic-fast-check-usage)
    - [Arbitraries (Generators)](#arbitraries-generators)
    - [Writing Good Properties](#writing-good-properties)
    - [Shrinking](#shrinking)
  - [Mocking and Test Doubles](#mocking-and-test-doubles)
    - [When to Mock](#when-to-mock)
    - [Vitest Mocking](#vitest-mocking)
    - [Test Double Types](#test-double-types)
    - [When NOT to Mock](#when-not-to-mock)
  - [Test Fixtures and Setup](#test-fixtures-and-setup)
    - [Shared Setup Patterns](#shared-setup-patterns)
    - [Factory Functions](#factory-functions)
    - [Test Data Builders](#test-data-builders)
  - [Code Coverage](#code-coverage)
    - [Coverage Tools](#coverage-tools)
    - [The Coverage Paradox](#the-coverage-paradox)
    - [Meaningful Coverage](#meaningful-coverage)
  - [Writing Testable Code](#writing-testable-code)
    - [Pure Functions](#pure-functions)
    - [Dependency Injection in TypeScript](#dependency-injection-in-typescript)
    - [Functional Core, Imperative Shell](#functional-core-imperative-shell)
    - [Interfaces for Abstraction](#interfaces-for-abstraction)
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
    - [Test Interdependence](#test-interdependence)
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
    - [Testing React Components](#testing-react-components)
    - [Testing APIs](#testing-apis)
  - [When NOT to Use TDD](#when-not-to-use-tdd)
    - [Alternatives to TDD](#alternatives-to-tdd)
  - [AI-Powered TDD in 2025-2026](#ai-powered-tdd-in-2025-2026)
  - [Interview Questions](#interview-questions)
  - [Quick Reference Cards](#quick-reference-cards)
    - [TDD Cycle Summary](#tdd-cycle-summary)
    - [Test Double Selection](#test-double-selection)
    - [Assertion Methods Reference](#assertion-methods-reference)
    - [fast-check Arbitraries Cheat Sheet](#fast-check-arbitraries-cheat-sheet)
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

### TDD + TypeScript: A Perfect Match

TypeScript's type system catches many bugs at compile time. Combining TypeScript's guarantees with TDD creates exceptionally robust code:

| TypeScript Feature | TDD Benefit |
|-------------------|-------------|
| **Static types** | Catches type errors before tests run |
| **Interfaces** | Define contracts that tests can verify |
| **Type guards** | Make runtime checks type-safe |
| **Strict null checks** | Force handling of undefined/null cases |
| **Generics** | Write reusable test utilities |

```typescript
// TypeScript is your first tester
interface User {
    id: string;
    email: string;
    age: number;
}

function validateUser(user: User): boolean {
    // TypeScript ensures user has required fields
    // Tests ensure the validation logic is correct
    return user.email.includes("@") && user.age >= 0;
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

```typescript
// email-validator.test.ts
import { describe, it, expect } from "vitest";
import { validateEmail } from "./email-validator";

describe("validateEmail", () => {
    it("rejects empty string", () => {
        const result = validateEmail("");
        expect(result.valid).toBe(false);
    });
});
```

**Rules:**
- Test must fail for the right reason (missing code, not syntax error)
- Test should be small and focused on one behavior
- Test name should describe the expected behavior

Run the test — it fails because the function doesn't exist:

```bash
$ npm test
FAIL  email-validator.test.ts
  ✕ rejects empty string
    Error: validateEmail is not defined
```

### Phase 2: Green — Make It Pass

Write the **minimum** code to make the test pass.

```typescript
// email-validator.ts
interface ValidationResult {
    valid: boolean;
    error?: string;
}

export function validateEmail(email: string): ValidationResult {
    if (email === "") {
        return { valid: false, error: "Email cannot be empty" };
    }
    return { valid: true };
}
```

**Rules:**
- Write only enough code to pass the test
- "Ugly is OK" — you'll clean it up in refactor
- Don't add features the test doesn't require

```bash
$ npm test
PASS  email-validator.test.ts
  ✓ rejects empty string
```

### Phase 3: Refactor — Improve the Code

Now clean up without changing behavior. Tests must pass after every change.

```typescript
// Improved with better types
interface ValidationSuccess {
    valid: true;
}

interface ValidationFailure {
    valid: false;
    error: string;
}

type ValidationResult = ValidationSuccess | ValidationFailure;

export function validateEmail(email: string): ValidationResult {
    if (!email) {
        return { valid: false, error: "Email cannot be empty" };
    }
    return { valid: true };
}
```

**Rules:**
- Tests must pass after every change
- Improve both production and test code
- No new functionality in this phase

### Complete Cycle Example: Email Validator

Let's build an email validator using multiple TDD cycles.

**Cycle 1: Reject empty strings**

```typescript
// RED: Write failing test
it("rejects empty string", () => {
    expect(validateEmail("").valid).toBe(false);
});

// GREEN: Minimal implementation
export function validateEmail(email: string): ValidationResult {
    if (!email) {
        return { valid: false, error: "Email cannot be empty" };
    }
    return { valid: true };
}
```

**Cycle 2: Require @ symbol**

```typescript
// RED: New failing test
it("rejects email without @ symbol", () => {
    expect(validateEmail("userexample.com").valid).toBe(false);
});

// GREEN: Add check
export function validateEmail(email: string): ValidationResult {
    if (!email) {
        return { valid: false, error: "Email cannot be empty" };
    }
    if (!email.includes("@")) {
        return { valid: false, error: "Email must contain @" };
    }
    return { valid: true };
}
```

**Cycle 3: Require domain**

```typescript
// RED: New failing test
it("rejects email without domain", () => {
    expect(validateEmail("user@").valid).toBe(false);
});

// GREEN: Add check
export function validateEmail(email: string): ValidationResult {
    if (!email) {
        return { valid: false, error: "Email cannot be empty" };
    }
    if (!email.includes("@")) {
        return { valid: false, error: "Email must contain @" };
    }
    const [local, domain] = email.split("@");
    if (!domain) {
        return { valid: false, error: "Email must have a domain" };
    }
    return { valid: true };
}
```

**Cycle 4: REFACTOR — Clean up**

```typescript
// Clean implementation
type ValidationResult =
    | { valid: true }
    | { valid: false; error: string };

const fail = (error: string): ValidationResult => ({ valid: false, error });
const success = (): ValidationResult => ({ valid: true });

export function validateEmail(email: string): ValidationResult {
    if (!email.trim()) {
        return fail("Email cannot be empty");
    }

    const atIndex = email.indexOf("@");
    if (atIndex === -1) {
        return fail("Email must contain @");
    }

    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex + 1);

    if (!local) {
        return fail("Email must have a local part");
    }

    if (!domain) {
        return fail("Email must have a domain");
    }

    if (!domain.includes(".")) {
        return fail("Domain must contain a dot");
    }

    return success();
}
```

---

## TypeScript Testing Framework Deep Dive

### Vitest vs Jest vs Node Test Runner (2025-2026)

| Feature | Vitest | Jest | Node Test Runner |
|---------|--------|------|------------------|
| **Speed** | Very fast (Vite-based) | Moderate | Fast |
| **TypeScript** | Native support | Needs ts-jest/babel | Needs tsx |
| **ESM** | Native | Needs configuration | Native |
| **Config** | Uses vite.config | Separate jest.config | Minimal |
| **Watch mode** | Instant | Slower | Basic |
| **Ecosystem** | Growing | Mature | Minimal |
| **Best for** | Modern projects, Vite apps | Legacy, React Native | Simple Node apps |

**Recommendation for 2025-2026:**
- **New projects**: Use **Vitest** — faster, better TypeScript support, modern
- **Existing Jest projects**: Keep Jest unless migration provides clear benefits
- **Minimal dependencies**: Use **Node test runner** with tsx

### Test Structure

```typescript
// Vitest/Jest structure
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";

describe("UserService", () => {
    // Run once before all tests in this describe block
    beforeAll(async () => {
        await connectToTestDatabase();
    });

    // Run once after all tests in this describe block
    afterAll(async () => {
        await disconnectFromTestDatabase();
    });

    // Run before each test
    beforeEach(() => {
        resetMocks();
    });

    // Run after each test
    afterEach(() => {
        cleanupTestData();
    });

    describe("createUser", () => {
        it("creates a user with valid data", async () => {
            const user = await createUser({ name: "Alice", email: "alice@test.com" });
            expect(user.id).toBeDefined();
            expect(user.name).toBe("Alice");
        });

        it("throws on duplicate email", async () => {
            await createUser({ name: "Alice", email: "alice@test.com" });
            await expect(
                createUser({ name: "Bob", email: "alice@test.com" })
            ).rejects.toThrow("Email already exists");
        });
    });

    // Nested describes for organization
    describe("deleteUser", () => {
        it("removes user from database", async () => {
            // ...
        });
    });
});
```

### Assertion Patterns

```typescript
import { expect, it } from "vitest";

// Equality
expect(1 + 1).toBe(2);                    // Strict equality (===)
expect({ a: 1 }).toEqual({ a: 1 });       // Deep equality
expect({ a: 1, b: 2 }).toMatchObject({ a: 1 }); // Partial match

// Truthiness
expect(true).toBeTruthy();
expect(false).toBeFalsy();
expect(null).toBeNull();
expect(undefined).toBeUndefined();
expect("value").toBeDefined();

// Numbers
expect(0.1 + 0.2).toBeCloseTo(0.3);       // Floating point
expect(10).toBeGreaterThan(5);
expect(5).toBeLessThanOrEqual(5);

// Strings
expect("Hello World").toContain("World");
expect("hello@test.com").toMatch(/^[\w.-]+@[\w.-]+\.\w+$/);

// Arrays
expect([1, 2, 3]).toContain(2);
expect([1, 2, 3]).toHaveLength(3);
expect([{ id: 1 }, { id: 2 }]).toContainEqual({ id: 1 });

// Objects
expect({ name: "Alice" }).toHaveProperty("name");
expect({ name: "Alice" }).toHaveProperty("name", "Alice");

// Errors
expect(() => throwingFunction()).toThrow();
expect(() => throwingFunction()).toThrow("specific message");
expect(() => throwingFunction()).toThrow(CustomError);

// Async
await expect(asyncFunction()).resolves.toBe("value");
await expect(failingAsync()).rejects.toThrow("error");

// Negation
expect(1).not.toBe(2);
expect([1, 2]).not.toContain(3);

// Snapshot (use sparingly)
expect(complexObject).toMatchSnapshot();
expect(renderOutput).toMatchInlineSnapshot(`"<div>Hello</div>"`);
```

### Test Organization

**File structure:**

```
src/
├── services/
│   ├── user-service.ts
│   └── user-service.test.ts     # Co-located unit tests
├── utils/
│   ├── validation.ts
│   └── validation.test.ts
└── __tests__/                    # Integration tests
    └── user-api.integration.test.ts
```

**Test file naming:**
- `*.test.ts` or `*.spec.ts` — both are conventions
- Place next to source file for unit tests
- Use `__tests__` folder for integration tests

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

> "When you test software, just assume there are bugs. If you approach software as if it should work, you won't find many bugs. However, if you assume bugs exist, you will suddenly see them everywhere."

### Edge Case Hunting Techniques

#### Boundary Value Analysis

Test at the edges of valid input ranges. Bugs cluster at boundaries.

```typescript
// Function: validate age (must be 0-150)
function isValidAge(age: number): boolean {
    return age >= 0 && age <= 150;
}

describe("isValidAge - Boundary Value Analysis", () => {
    // Boundary values: -1, 0, 1, 149, 150, 151
    it("rejects just below minimum", () => {
        expect(isValidAge(-1)).toBe(false);
    });

    it("accepts at minimum boundary", () => {
        expect(isValidAge(0)).toBe(true);
    });

    it("accepts just above minimum", () => {
        expect(isValidAge(1)).toBe(true);
    });

    it("accepts just below maximum", () => {
        expect(isValidAge(149)).toBe(true);
    });

    it("accepts at maximum boundary", () => {
        expect(isValidAge(150)).toBe(true);
    });

    it("rejects just above maximum", () => {
        expect(isValidAge(151)).toBe(false);
    });

    // Extreme values
    it("rejects negative infinity", () => {
        expect(isValidAge(-Infinity)).toBe(false);
    });

    it("rejects positive infinity", () => {
        expect(isValidAge(Infinity)).toBe(false);
    });

    it("rejects NaN", () => {
        expect(isValidAge(NaN)).toBe(false);
    });
});
```

#### Equivalence Partitioning

Divide inputs into groups that should behave the same. Test one from each group.

```typescript
// Function: categorize temperature
function categorizeTemp(celsius: number): string {
    if (celsius < 0) return "Freezing";
    if (celsius < 16) return "Cold";
    if (celsius < 26) return "Comfortable";
    if (celsius < 36) return "Warm";
    return "Hot";
}

describe("categorizeTemp - Equivalence Partitioning", () => {
    // One test per partition, not every value
    it("categorizes freezing temperatures", () => {
        expect(categorizeTemp(-10)).toBe("Freezing");
    });

    it("categorizes cold temperatures", () => {
        expect(categorizeTemp(10)).toBe("Cold");
    });

    it("categorizes comfortable temperatures", () => {
        expect(categorizeTemp(20)).toBe("Comfortable");
    });

    it("categorizes warm temperatures", () => {
        expect(categorizeTemp(30)).toBe("Warm");
    });

    it("categorizes hot temperatures", () => {
        expect(categorizeTemp(40)).toBe("Hot");
    });
});
```

#### Error Guessing

Based on experience, guess common problem inputs:

```typescript
describe("String Processing - Error Guessing", () => {
    describe("common problematic inputs", () => {
        // Empty and whitespace
        it("handles empty string", () => {
            expect(processString("")).toBe(/* expected */);
        });

        it("handles whitespace only", () => {
            expect(processString("   ")).toBe(/* expected */);
            expect(processString("\t\n")).toBe(/* expected */);
        });

        // Single character
        it("handles single character", () => {
            expect(processString("a")).toBe(/* expected */);
        });

        // Unicode and special characters
        it("handles unicode characters", () => {
            expect(processString("héllo wörld")).toBe(/* expected */);
            expect(processString("你好世界")).toBe(/* expected */);
            expect(processString("🎉🚀")).toBe(/* expected */);
        });

        // Special characters
        it("handles special characters", () => {
            expect(processString("hello\0world")).toBe(/* expected */);  // Null byte
            expect(processString("hello\nworld")).toBe(/* expected */);  // Newline
        });

        // Potential injection
        it("handles potential injection strings", () => {
            expect(processString("'; DROP TABLE users;--")).toBe(/* expected */);
            expect(processString("<script>alert('xss')</script>")).toBe(/* expected */);
        });

        // Very long strings
        it("handles very long strings", () => {
            const longString = "a".repeat(1_000_000);
            expect(() => processString(longString)).not.toThrow();
        });
    });
});

describe("Numeric Processing - Error Guessing", () => {
    it("handles zero", () => {
        expect(processNumber(0)).toBe(/* expected */);
    });

    it("handles negative zero", () => {
        expect(processNumber(-0)).toBe(/* expected */);
    });

    it("handles negative numbers", () => {
        expect(processNumber(-1)).toBe(/* expected */);
    });

    it("handles maximum safe integer", () => {
        expect(processNumber(Number.MAX_SAFE_INTEGER)).toBe(/* expected */);
    });

    it("handles NaN", () => {
        expect(processNumber(NaN)).toBe(/* expected */);
    });

    it("handles Infinity", () => {
        expect(processNumber(Infinity)).toBe(/* expected */);
    });
});

describe("Array Processing - Error Guessing", () => {
    it("handles empty array", () => {
        expect(processArray([])).toEqual(/* expected */);
    });

    it("handles single element", () => {
        expect(processArray([1])).toEqual(/* expected */);
    });

    it("handles duplicates", () => {
        expect(processArray([1, 1, 1])).toEqual(/* expected */);
    });

    it("handles already sorted", () => {
        expect(processArray([1, 2, 3])).toEqual(/* expected */);
    });

    it("handles reverse sorted", () => {
        expect(processArray([3, 2, 1])).toEqual(/* expected */);
    });

    it("handles sparse arrays", () => {
        const sparse = [1, , , 4];  // Has holes
        expect(processArray(sparse)).toEqual(/* expected */);
    });
});
```

### The ZOMBIES Acronym

A mnemonic for test case generation:

| Letter | Meaning | Examples |
|--------|---------|----------|
| **Z** | Zero | Empty collections, zero values, null/undefined |
| **O** | One | Single element, single character, value of 1 |
| **M** | Many | Multiple elements, large collections |
| **B** | Boundary | Min/max values, off-by-one scenarios |
| **I** | Interface | Public API contracts, type contracts |
| **E** | Exception | Error cases, invalid inputs, thrown errors |
| **S** | Simple/Scenarios | Happy path, real-world use cases |

```typescript
describe("sum function - ZOMBIES", () => {
    // Z - Zero
    it("returns 0 for empty array", () => {
        expect(sum([])).toBe(0);
    });

    // O - One
    it("returns the element for single-element array", () => {
        expect(sum([42])).toBe(42);
    });

    // M - Many
    it("sums multiple elements", () => {
        expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    // B - Boundary
    it("handles maximum safe integers", () => {
        expect(sum([Number.MAX_SAFE_INTEGER, 1])).toBe(Number.MAX_SAFE_INTEGER + 1);
    });

    it("handles negative numbers", () => {
        expect(sum([-1, -2, -3])).toBe(-6);
    });

    // I - Interface (does it match the contract?)
    it("returns a number type", () => {
        const result = sum([1, 2, 3]);
        expect(typeof result).toBe("number");
    });

    // E - Exception
    it("handles arrays with NaN", () => {
        expect(sum([1, NaN, 3])).toBeNaN();
    });

    // S - Simple scenarios (real-world use)
    it("calculates shopping cart total", () => {
        const prices = [10.99, 25.50, 5.00, 100.00];
        expect(sum(prices)).toBeCloseTo(141.49);
    });
});
```

---

## Property-Based Testing with fast-check

### What is Property-Based Testing?

Instead of testing specific examples, test **properties** that should hold for all inputs. The framework generates random inputs to find edge cases you wouldn't think of.

```bash
npm install -D fast-check
```

### Basic fast-check Usage

```typescript
import fc from "fast-check";
import { describe, it, expect } from "vitest";

describe("Property-Based Testing", () => {
    // Property: reversing twice gives back the original
    it("reverse(reverse(arr)) === arr", () => {
        fc.assert(
            fc.property(fc.array(fc.integer()), (arr) => {
                const reversedTwice = [...arr].reverse().reverse();
                expect(reversedTwice).toEqual(arr);
            })
        );
    });

    // Property: sorting is idempotent
    it("sort(sort(arr)) === sort(arr)", () => {
        fc.assert(
            fc.property(fc.array(fc.integer()), (arr) => {
                const sortedOnce = [...arr].sort((a, b) => a - b);
                const sortedTwice = [...sortedOnce].sort((a, b) => a - b);
                expect(sortedTwice).toEqual(sortedOnce);
            })
        );
    });

    // Property: encoding then decoding returns original
    it("JSON.parse(JSON.stringify(obj)) deep equals obj", () => {
        fc.assert(
            fc.property(fc.object(), (obj) => {
                const roundTripped = JSON.parse(JSON.stringify(obj));
                expect(roundTripped).toEqual(obj);
            })
        );
    });
});
```

### Arbitraries (Generators)

```typescript
import fc from "fast-check";

// Basic arbitraries
fc.integer();                           // Any integer
fc.integer({ min: 0, max: 100 });       // Constrained integer
fc.float();                             // Any float
fc.string();                            // Any string
fc.boolean();                           // true or false

// Constrained strings
fc.string({ minLength: 1, maxLength: 10 });
fc.stringMatching(/^[a-z]+$/);          // Match regex
fc.emailAddress();                      // Valid email format
fc.uuid();                              // Valid UUID

// Arrays
fc.array(fc.integer());                 // Array of integers
fc.array(fc.integer(), { minLength: 1, maxLength: 5 });

// Objects
fc.object();                            // Any object
fc.record({ name: fc.string(), age: fc.integer({ min: 0 }) });

// Tuples
fc.tuple(fc.string(), fc.integer());    // [string, number]

// One of
fc.constantFrom("red", "green", "blue"); // One of these values
fc.oneof(fc.string(), fc.integer());    // String or integer

// Filtered
fc.integer().filter(n => n % 2 === 0);  // Only even integers

// Mapped
fc.integer({ min: 1, max: 12 }).map(month => new Date(2024, month - 1));
```

### Writing Good Properties

Properties should describe **invariants** — things that are always true:

```typescript
// 1. Inverse operations
it("addition and subtraction are inverses", () => {
    fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
            expect(a + b - b).toBe(a);
        })
    );
});

// 2. Invariants (things that shouldn't change)
it("sorting preserves length", () => {
    fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
            const sorted = [...arr].sort((a, b) => a - b);
            expect(sorted.length).toBe(arr.length);
        })
    );
});

it("sorting preserves elements (multiset equality)", () => {
    fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
            const sorted = [...arr].sort((a, b) => a - b);
            const originalSorted = [...arr].sort((a, b) => a - b);
            expect(sorted).toEqual(originalSorted);
        })
    );
});

// 3. Idempotence (doing twice = doing once)
it("normalizing is idempotent", () => {
    fc.assert(
        fc.property(fc.string(), (s) => {
            const once = normalize(s);
            const twice = normalize(once);
            expect(once).toBe(twice);
        })
    );
});

// 4. Commutativity (order doesn't matter)
it("addition is commutative", () => {
    fc.assert(
        fc.property(fc.integer(), fc.integer(), (a, b) => {
            expect(a + b).toBe(b + a);
        })
    );
});

// 5. Associativity
it("addition is associative", () => {
    fc.assert(
        fc.property(fc.integer(), fc.integer(), fc.integer(), (a, b, c) => {
            expect((a + b) + c).toBe(a + (b + c));
        })
    );
});
```

### Shrinking

When fast-check finds a failing input, it **shrinks** it to the minimal failing case:

```typescript
it("demonstrates shrinking", () => {
    fc.assert(
        fc.property(fc.array(fc.integer()), (arr) => {
            // Bug: crashes on arrays with more than 5 elements
            if (arr.length > 5) {
                throw new Error("Too many elements!");
            }
            return true;
        })
    );
});

// fast-check output:
// Property failed after 15 tests
// Counterexample: [0, 0, 0, 0, 0, 0]  // Shrunk to minimal case
// Shrunk 5 time(s)
```

The shrunk input is the **simplest** case that still triggers the bug.

---

## Mocking and Test Doubles

### When to Mock

Mock when testing interactions with:
- External services (databases, APIs, file systems)
- Slow operations (network calls, disk I/O)
- Non-deterministic behavior (time, random numbers)
- Dependencies you don't control

### Vitest Mocking

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock a module
vi.mock("./database", () => ({
    getUser: vi.fn(),
    saveUser: vi.fn(),
}));

import { getUser, saveUser } from "./database";
import { UserService } from "./user-service";

describe("UserService", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("fetches user from database", async () => {
        // Arrange
        const mockUser = { id: "1", name: "Alice" };
        vi.mocked(getUser).mockResolvedValue(mockUser);

        // Act
        const service = new UserService();
        const user = await service.getUser("1");

        // Assert
        expect(user).toEqual(mockUser);
        expect(getUser).toHaveBeenCalledWith("1");
        expect(getUser).toHaveBeenCalledTimes(1);
    });

    it("saves user to database", async () => {
        // Arrange
        vi.mocked(saveUser).mockResolvedValue(undefined);

        // Act
        const service = new UserService();
        await service.createUser({ name: "Bob", email: "bob@test.com" });

        // Assert
        expect(saveUser).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Bob", email: "bob@test.com" })
        );
    });
});

// Spying on methods
describe("spy example", () => {
    it("spies on existing method", () => {
        const obj = {
            method: (x: number) => x * 2,
        };

        const spy = vi.spyOn(obj, "method");

        obj.method(5);

        expect(spy).toHaveBeenCalledWith(5);
        expect(spy).toHaveReturnedWith(10);
    });
});

// Mock timers
describe("timer mocking", () => {
    it("handles setTimeout", () => {
        vi.useFakeTimers();

        const callback = vi.fn();
        setTimeout(callback, 1000);

        expect(callback).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);

        expect(callback).toHaveBeenCalledTimes(1);

        vi.useRealTimers();
    });
});

// Mock date
describe("date mocking", () => {
    it("mocks current date", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-01-15"));

        expect(new Date().toISOString()).toContain("2024-01-15");

        vi.useRealTimers();
    });
});
```

### Test Double Types

| Type | Purpose | Example |
|------|---------|---------|
| **Stub** | Provides canned responses | `vi.fn().mockReturnValue(42)` |
| **Mock** | Verifies interactions | `expect(fn).toHaveBeenCalledWith(...)` |
| **Fake** | Simplified working implementation | In-memory database |
| **Spy** | Records calls to real implementation | `vi.spyOn(obj, 'method')` |
| **Dummy** | Placeholder for required parameters | Empty object `{}` |

```typescript
// Stub: Returns canned data
const stubFetch = vi.fn().mockResolvedValue({ data: "test" });

// Mock: Verifies interactions
const mockLogger = vi.fn();
myFunction(mockLogger);
expect(mockLogger).toHaveBeenCalledWith("expected message");

// Fake: Working implementation
class FakeUserRepository implements UserRepository {
    private users = new Map<string, User>();

    async save(user: User): Promise<void> {
        this.users.set(user.id, user);
    }

    async findById(id: string): Promise<User | null> {
        return this.users.get(id) ?? null;
    }
}

// Spy: Records while calling real implementation
const consoleSpy = vi.spyOn(console, "log");
console.log("hello");
expect(consoleSpy).toHaveBeenCalledWith("hello");
```

### When NOT to Mock

| Don't Mock | Why |
|------------|-----|
| **Data structures** | No behavior to mock — just create real instances |
| **Pure functions** | Deterministic, fast — just call them |
| **The system under test** | You're testing it, not mocking it |
| **Everything** | Over-mocking makes tests fragile and meaningless |
| **Internal implementation** | Tests should verify behavior, not call sequences |

```typescript
// BAD: Mocking data structures
const mockArray = vi.fn();  // Don't do this

// GOOD: Use real data
const data = [1, 2, 3];

// BAD: Mocking the thing you're testing
vi.mock("./calculator");  // If you're testing Calculator, don't mock it

// GOOD: Test the real thing
const calc = new Calculator();
expect(calc.add(2, 3)).toBe(5);
```

---

## Test Fixtures and Setup

### Shared Setup Patterns

```typescript
import { describe, it, beforeEach, afterEach } from "vitest";

describe("UserService", () => {
    let service: UserService;
    let repository: FakeUserRepository;

    beforeEach(() => {
        repository = new FakeUserRepository();
        service = new UserService(repository);
    });

    afterEach(() => {
        repository.clear();
    });

    it("creates user", async () => {
        await service.createUser({ name: "Alice" });
        expect(await repository.count()).toBe(1);
    });
});
```

### Factory Functions

```typescript
// test/factories/user.ts
interface UserOptions {
    id?: string;
    name?: string;
    email?: string;
    age?: number;
}

export function createUser(options: UserOptions = {}): User {
    return {
        id: options.id ?? crypto.randomUUID(),
        name: options.name ?? "Test User",
        email: options.email ?? "test@example.com",
        age: options.age ?? 25,
    };
}

// Usage in tests
describe("UserService", () => {
    it("processes adult user", () => {
        const user = createUser({ age: 30 });
        expect(service.isAdult(user)).toBe(true);
    });

    it("processes minor user", () => {
        const user = createUser({ age: 16 });
        expect(service.isAdult(user)).toBe(false);
    });
});
```

### Test Data Builders

```typescript
// Builder pattern for complex objects
class UserBuilder {
    private user: Partial<User> = {};

    withId(id: string): this {
        this.user.id = id;
        return this;
    }

    withName(name: string): this {
        this.user.name = name;
        return this;
    }

    withEmail(email: string): this {
        this.user.email = email;
        return this;
    }

    withAge(age: number): this {
        this.user.age = age;
        return this;
    }

    asAdmin(): this {
        this.user.role = "admin";
        return this;
    }

    build(): User {
        return {
            id: this.user.id ?? crypto.randomUUID(),
            name: this.user.name ?? "Test User",
            email: this.user.email ?? "test@example.com",
            age: this.user.age ?? 25,
            role: this.user.role ?? "user",
        };
    }
}

// Usage
const adminUser = new UserBuilder()
    .withName("Admin Alice")
    .asAdmin()
    .build();

const youngUser = new UserBuilder()
    .withAge(16)
    .build();
```

---

## Code Coverage

### Coverage Tools

```bash
# Vitest (built-in v8 coverage)
vitest --coverage

# c8 (standalone)
npx c8 npm test

# nyc (Istanbul)
npx nyc npm test
```

**Vitest configuration:**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov"],
            exclude: [
                "node_modules/",
                "**/*.test.ts",
                "**/*.d.ts",
            ],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
    },
});
```

### The Coverage Paradox

High coverage doesn't mean good tests. Consider:

```typescript
function divide(a: number, b: number): number {
    return a / b;
}

// This test has 100% line coverage but is terrible
it("divides numbers", () => {
    expect(divide(10, 2)).toBe(5);  // 100% coverage!
});
```

This test has 100% line coverage but:
- Doesn't test division by zero
- Doesn't test negative numbers
- Doesn't test edge cases like Infinity, NaN

**Coverage measures quantity, not quality.** Use it to find untested code, not to prove code is well-tested.

### Meaningful Coverage

```typescript
// Better tests (same coverage, actually useful)
describe("divide", () => {
    it("divides positive numbers", () => {
        expect(divide(10, 2)).toBe(5);
    });

    it("returns Infinity for division by zero", () => {
        expect(divide(10, 0)).toBe(Infinity);
    });

    it("handles negative numbers", () => {
        expect(divide(-10, 2)).toBe(-5);
        expect(divide(10, -2)).toBe(-5);
        expect(divide(-10, -2)).toBe(5);
    });

    it("returns NaN for 0/0", () => {
        expect(divide(0, 0)).toBeNaN();
    });
});
```

**Rule of thumb**: Aim for meaningful coverage + mutation testing score, not 100% line coverage.

---

## Writing Testable Code

### Pure Functions

Functions without side effects are trivial to test:

```typescript
// PURE: Easy to test
function calculateTax(amount: number, rate: number): number {
    return amount * rate;
}

it("calculates tax", () => {
    expect(calculateTax(100, 0.1)).toBe(10);
});

// IMPURE: Hard to test (depends on current time)
function isBusinessHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 9 && hour < 17;
}

// PURE VERSION: Easy to test
function isBusinessHoursAt(hour: number): boolean {
    return hour >= 9 && hour < 17;
}

it("identifies business hours", () => {
    expect(isBusinessHoursAt(10)).toBe(true);
    expect(isBusinessHoursAt(20)).toBe(false);
});
```

### Dependency Injection in TypeScript

Inject dependencies instead of creating them internally:

```typescript
// HARD TO TEST: Creates its own dependencies
class OrderProcessor {
    private db = new PostgresConnection("postgres://...");
    private mailer = new SmtpMailer("smtp://...");

    async process(order: Order): Promise<void> {
        await this.db.saveOrder(order);
        await this.mailer.sendConfirmation(order.customerEmail);
    }
}

// EASY TO TEST: Dependencies are injected
interface Database {
    saveOrder(order: Order): Promise<void>;
}

interface Mailer {
    sendConfirmation(email: string): Promise<void>;
}

class OrderProcessor {
    constructor(
        private db: Database,
        private mailer: Mailer
    ) {}

    async process(order: Order): Promise<void> {
        await this.db.saveOrder(order);
        await this.mailer.sendConfirmation(order.customerEmail);
    }
}

// Test with fakes
it("processes order", async () => {
    const fakeDb: Database = { saveOrder: vi.fn() };
    const fakeMailer: Mailer = { sendConfirmation: vi.fn() };

    const processor = new OrderProcessor(fakeDb, fakeMailer);
    await processor.process({ customerEmail: "test@example.com" });

    expect(fakeDb.saveOrder).toHaveBeenCalled();
    expect(fakeMailer.sendConfirmation).toHaveBeenCalledWith("test@example.com");
});
```

### Functional Core, Imperative Shell

Separate pure logic from side effects:

```typescript
// IMPURE SHELL: Handles I/O
async function processFile(path: string): Promise<void> {
    const content = await fs.readFile(path, "utf-8");  // Side effect
    const result = transformContent(content);           // Pure function
    await fs.writeFile(path, result);                  // Side effect
}

// PURE CORE: Easy to test exhaustively
function transformContent(content: string): string {
    return content
        .split("\n")
        .filter(line => !line.startsWith("#"))
        .map(line => line.toUpperCase())
        .join("\n");
}

// Test the pure core extensively
describe("transformContent", () => {
    it("removes comments", () => {
        expect(transformContent("hello\n# comment\nworld"))
            .toBe("HELLO\nWORLD");
    });

    it("handles empty string", () => {
        expect(transformContent("")).toBe("");
    });

    it("handles all comments", () => {
        expect(transformContent("# comment 1\n# comment 2")).toBe("");
    });
});

// Integration test for the shell (fewer, higher-level tests)
it("processes file end-to-end", async () => {
    const tempPath = await createTempFile("hello\n# comment\nworld");
    await processFile(tempPath);
    const result = await fs.readFile(tempPath, "utf-8");
    expect(result).toBe("HELLO\nWORLD");
});
```

### Interfaces for Abstraction

Define interfaces at system boundaries:

```typescript
// Define interface for external dependency
interface Clock {
    now(): Date;
}

// Production implementation
const systemClock: Clock = {
    now: () => new Date(),
};

// Test implementation
function createFakeClock(fixedTime: Date): Clock {
    return { now: () => fixedTime };
}

// Code uses the interface
function isExpired(clock: Clock, expiryDate: Date): boolean {
    return clock.now() > expiryDate;
}

// Test with fake clock
it("detects expired dates", () => {
    const clock = createFakeClock(new Date("2024-06-15"));
    const past = new Date("2024-01-01");
    const future = new Date("2024-12-31");

    expect(isExpired(clock, past)).toBe(true);
    expect(isExpired(clock, future)).toBe(false);
});
```

---

## TDD Anti-Patterns

### The Liar

Tests that pass but don't actually verify anything:

```typescript
// BAD: Always passes
it("processes data", () => {
    const result = complexCalculation(42);
    expect(true).toBe(true);  // Doesn't check result!
});

// GOOD: Actually verifies behavior
it("processes data", () => {
    const result = complexCalculation(42);
    expect(result).toBe(expectedValue);
});
```

### The Giant

Tests that verify too much at once:

```typescript
// BAD: Tests multiple behaviors
it("manages users", async () => {
    const service = new UserService();

    // Test creation
    await service.createUser("alice", "Alice");
    expect(await service.userExists("alice")).toBe(true);

    // Test update
    await service.updateEmail("alice", "alice@example.com");
    expect(await service.getEmail("alice")).toBe("alice@example.com");

    // Test deletion
    await service.deleteUser("alice");
    expect(await service.userExists("alice")).toBe(false);

    // ... 20 more assertions
});

// GOOD: Focused tests
it("creates a user", async () => {
    const service = new UserService();
    await service.createUser("alice", "Alice");
    expect(await service.userExists("alice")).toBe(true);
});

it("updates user email", async () => {
    const service = new UserService();
    await service.createUser("alice", "Alice");
    await service.updateEmail("alice", "alice@example.com");
    expect(await service.getEmail("alice")).toBe("alice@example.com");
});
```

### Excessive Setup

Tests with too much arrangement:

```typescript
// BAD: 30 lines of setup
it("processes order", async () => {
    const config = new Config()
        .setOptionA(true)
        .setOptionB(false)
        // ... 15 more options
        .build();

    const db = await Database.connect(config.dbUrl);
    const cache = new Cache(config.cacheUrl);
    const logger = new Logger(config.logLevel);
    const eventBus = new EventBus();
    // ... more setup

    const service = new OrderService(db, cache, logger, eventBus, config);

    // Finally, the actual test (1 line)
    expect(await service.process(order)).toBe(true);
});

// GOOD: Use fixtures and factories
it("processes order", async () => {
    const service = createOrderService();  // Encapsulate setup
    const order = createOrder();

    expect(await service.process(order)).toBe(true);
});
```

### The Slow Poke

Tests that take too long:

```typescript
// BAD: Real network calls, sleeps
it("fetches data", async () => {
    const result = await fetch("https://api.example.com/data");  // Real network!
    await new Promise(r => setTimeout(r, 5000));  // Why?
    expect(result.ok).toBe(true);
});

// GOOD: Mock external dependencies
it("fetches data", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });

    const result = await fetchData(mockFetch);

    expect(result.ok).toBe(true);
});
```

### Testing Implementation Details

Tests coupled to internal structure:

```typescript
// BAD: Tests internal state
it("sorts correctly", () => {
    const list = new SortedList();
    list.add(3);
    list.add(1);
    list.add(2);

    // Testing internal array (fragile!)
    expect((list as any)._internalArray[0]).toBe(1);
    expect((list as any)._internalArray[1]).toBe(2);
});

// GOOD: Tests behavior
it("sorts correctly", () => {
    const list = new SortedList();
    list.add(3);
    list.add(1);
    list.add(2);

    // Testing public interface
    expect(list.toArray()).toEqual([1, 2, 3]);
});
```

### The 100% Coverage Obsession

Testing for coverage, not quality:

```typescript
// BAD: Testing getters for coverage
it("gets name", () => {
    const user = new User("Alice");
    expect(user.name).toBe("Alice");  // Trivial, adds no value
});

// BAD: Testing the type system
it("creates user", () => {
    const user = { name: "Alice", age: 30 };
    expect(user.name).toBeDefined();  // TypeScript already checks this
});

// GOOD: Test meaningful behavior
it("formats full name", () => {
    const user = new User("Alice", "Smith");
    expect(user.fullName).toBe("Alice Smith");
});
```

---

## Test Code Smells

### Conditional Logic in Tests

```typescript
// BAD: Logic in tests
it("handles input", () => {
    const input = getTestInput();
    const result = process(input);

    if (input > 0) {
        expect(result.status).toBe("success");
    } else {
        expect(result.status).toBe("error");
    }
});

// GOOD: Separate tests, no conditions
it("succeeds for positive input", () => {
    expect(process(5).status).toBe("success");
});

it("fails for negative input", () => {
    expect(process(-5).status).toBe("error");
});

// BEST: Parameterized tests
it.each([
    [5, "success"],
    [0, "success"],
    [-5, "error"],
])("process(%i) returns %s", (input, expected) => {
    expect(process(input).status).toBe(expected);
});
```

### Magic Numbers

```typescript
// BAD: Magic numbers
it("calculates total", () => {
    const result = calculate(42, 17, 3);
    expect(result).toBe(1789);
});

// GOOD: Named constants
it("calculates total with tax and discount", () => {
    const PRICE = 100;
    const TAX_RATE = 0.17;
    const DISCOUNT_RATE = 0.03;
    const EXPECTED_TOTAL = 114;

    const result = calculateTotal(PRICE, TAX_RATE, DISCOUNT_RATE);

    expect(result).toBe(EXPECTED_TOTAL);
});
```

### Flaky Tests

Tests that sometimes pass, sometimes fail:

```typescript
// BAD: Time-dependent
it("checks business hours", () => {
    const result = isBusinessHours();
    expect(result).toBe(true);  // Fails at night!
});

// GOOD: Deterministic
it("checks business hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T14:00:00"));

    expect(isBusinessHours()).toBe(true);

    vi.setSystemTime(new Date("2024-03-15T22:00:00"));

    expect(isBusinessHours()).toBe(false);

    vi.useRealTimers();
});

// BAD: Random without seed
it("processes random data", () => {
    const data = generateRandomData();
    expect(process(data).valid).toBe(true);  // Might fail randomly
});

// GOOD: Seeded random
it("processes random data", () => {
    const data = generateRandomData({ seed: 12345 });
    expect(process(data).valid).toBe(true);
});
```

### Test Interdependence

```typescript
// BAD: Tests depend on each other
describe("User flow", () => {
    let userId: string;

    it("creates user", async () => {
        const user = await createUser({ name: "Alice" });
        userId = user.id;  // Shared state!
        expect(user).toBeDefined();
    });

    it("updates user", async () => {
        // This fails if run alone!
        await updateUser(userId, { name: "Bob" });
        expect(await getUser(userId)).toHaveProperty("name", "Bob");
    });
});

// GOOD: Independent tests
describe("User operations", () => {
    it("creates user", async () => {
        const user = await createUser({ name: "Alice" });
        expect(user).toBeDefined();
    });

    it("updates user", async () => {
        // Create fresh user for this test
        const user = await createUser({ name: "Alice" });
        await updateUser(user.id, { name: "Bob" });
        expect(await getUser(user.id)).toHaveProperty("name", "Bob");
    });
});
```

---

## The Test Pyramid

### Pyramid Structure

```
        /\
       /  \      E2E Tests (10%)
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

```typescript
// 1. Acceptance test (defines the feature)
it("calculates cart total with discounts", () => {
    const cart = new ShoppingCart();
    cart.addItem("apple", 1.00, 3);
    cart.addItem("banana", 0.50, 2);
    cart.applyDiscount(0.10);  // 10% off

    expect(cart.total).toBe(3.60);  // (3*1 + 2*0.5) * 0.9
});

// 2-4. Unit tests drive implementation
it("starts with zero total", () => { /* ... */ });
it("adds item to total", () => { /* ... */ });
it("applies discount", () => { /* ... */ });
```

### Bug Fix Workflow

1. **Write failing test** that reproduces the bug
2. **Verify test fails** for the right reason
3. **Fix the bug**
4. **Verify test passes**
5. **Add related edge case tests**

```typescript
// 1. Reproduce the bug
it("BUG-123: handles negative quantities", () => {
    const cart = new ShoppingCart();
    cart.addItem("apple", 1.00, -1);  // Bug: was crashing

    expect(cart.total).toBe(0);  // Should be zero or throw
});

// 5. Related edge cases
it("ignores zero quantity items", () => {
    const cart = new ShoppingCart();
    cart.addItem("apple", 1.00, 0);

    expect(cart.total).toBe(0);
});
```

### Legacy Code Workflow

1. **Write characterization tests** (document current behavior)
2. **Find seams** where you can inject test doubles
3. **Break dependencies** carefully
4. **Add tests** as you modify code

```typescript
// 1. Characterization test (captures existing behavior)
it("CHARACTERIZATION: calculates legacy total", () => {
    const legacy = new LegacyCalculator();

    // Document actual behavior, even if it seems wrong
    expect(legacy.calculate(100, 0.1)).toBe(110);  // 100 + 10%
});

// Once you understand behavior, refactor safely
```

---

## TDD for Different Scenarios

### Testing Async Code

```typescript
import { describe, it, expect, vi } from "vitest";

// Async/await
it("fetches user data", async () => {
    const user = await fetchUser(1);
    expect(user.name).toBe("Alice");
});

// Resolves/rejects
it("resolves with data", async () => {
    await expect(fetchUser(1)).resolves.toMatchObject({ name: "Alice" });
});

it("rejects on error", async () => {
    await expect(fetchUser(-1)).rejects.toThrow("User not found");
});

// With timeouts
it("completes within timeout", async () => {
    vi.useFakeTimers();

    const promise = fetchWithTimeout("/api/data", 5000);

    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow("Timeout");

    vi.useRealTimers();
});
```

### Testing Error Handling

```typescript
// Testing thrown errors
it("throws on invalid input", () => {
    expect(() => validateAge(-1)).toThrow("Age must be positive");
});

it("throws specific error type", () => {
    expect(() => validateAge(-1)).toThrow(ValidationError);
});

// Testing error properties
it("includes field in error", () => {
    try {
        validateEmail("invalid");
        expect.fail("Should have thrown");
    } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe("email");
    }
});

// Testing Result types
it("returns error result", () => {
    const result = parseConfig("invalid json");

    expect(result.ok).toBe(false);
    if (!result.ok) {
        expect(result.error).toContain("parse");
    }
});
```

### Testing React Components

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Counter } from "./Counter";

describe("Counter", () => {
    it("renders initial count", () => {
        render(<Counter initialCount={5} />);
        expect(screen.getByText("Count: 5")).toBeInTheDocument();
    });

    it("increments on click", () => {
        render(<Counter initialCount={0} />);

        fireEvent.click(screen.getByRole("button", { name: "Increment" }));

        expect(screen.getByText("Count: 1")).toBeInTheDocument();
    });

    it("calls onChange when count changes", () => {
        const onChange = vi.fn();
        render(<Counter initialCount={0} onChange={onChange} />);

        fireEvent.click(screen.getByRole("button", { name: "Increment" }));

        expect(onChange).toHaveBeenCalledWith(1);
    });
});
```

### Testing APIs

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "./server";

describe("User API", () => {
    let server: ReturnType<typeof createServer>;
    let baseUrl: string;

    beforeAll(async () => {
        server = createServer();
        await server.listen(0);
        baseUrl = `http://localhost:${server.port}`;
    });

    afterAll(async () => {
        await server.close();
    });

    it("GET /users returns users", async () => {
        const response = await fetch(`${baseUrl}/users`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
    });

    it("POST /users creates user", async () => {
        const response = await fetch(`${baseUrl}/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Alice", email: "alice@test.com" }),
        });

        expect(response.status).toBe(201);

        const user = await response.json();
        expect(user.id).toBeDefined();
        expect(user.name).toBe("Alice");
    });

    it("returns 404 for unknown user", async () => {
        const response = await fetch(`${baseUrl}/users/unknown-id`);

        expect(response.status).toBe(404);
    });
});
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

## AI-Powered TDD in 2025-2026

AI is not replacing TDD—it's accelerating it:

| TDD Phase | AI Assistance |
|-----------|--------------|
| **Test scaffolding** | AI generates starter unit tests for new functions |
| **Edge cases** | LLMs suggest corner scenarios humans miss |
| **Refactoring** | AI tools highlight redundant tests and suggest cleaner patterns |
| **Regression automation** | Platforms auto-maintain repetitive tests |

**Best practices for AI + TDD:**

1. **Review AI-generated tests** — AI can miss business context
2. **Use AI for edge cases** — "What edge cases should I test for this function?"
3. **Let AI suggest property tests** — "What properties should hold for this function?"
4. **Maintain human oversight** — AI tests the code, humans test the requirements

**Result**: Faster cycles, higher coverage, fewer regressions—but human judgment remains essential.

---

## Interview Questions

### Q1: What is Test-Driven Development?

TDD is a software development discipline where you write tests before writing production code. The cycle is Red (write failing test), Green (make it pass with minimal code), and Refactor (improve the code while keeping tests passing). It leads to better-designed, more testable code with high test coverage.

### Q2: Explain the Red-Green-Refactor cycle.

**Red**: Write a test for functionality that doesn't exist yet. Run it to confirm it fails. **Green**: Write the minimum code to make the test pass. Don't worry about elegance. **Refactor**: Clean up the code (both production and test) while ensuring tests still pass. Then repeat.

### Q3: What's the difference between a mock and a stub?

A **stub** provides canned responses to calls made during the test — it's passive. A **mock** is a stub with expectations about how it should be called — it's active and can fail the test if expectations aren't met. Use stubs when you don't care about interactions, mocks when interactions matter.

### Q4: What is property-based testing?

Property-based testing verifies that certain properties (invariants) hold for all possible inputs, not just specific examples. Instead of testing `add(2, 3) === 5`, you test `add(a, b) === add(b, a)` for all values. The framework generates random inputs and shrinks failing cases to minimal reproducers.

### Q5: What is the test pyramid?

The test pyramid suggests having many fast unit tests (base), fewer integration tests (middle), and even fewer E2E tests (top). This provides fast feedback, good coverage, and maintainable tests. The anti-pattern is the "ice cream cone" with many slow E2E tests.

### Q6: How do you test code with external dependencies?

Use dependency injection to pass dependencies as parameters, then substitute test doubles (mocks, stubs, fakes) in tests. Define interfaces for external services and implement them for both production and test scenarios.

### Q7: What makes code hard to test?

Global state, hidden dependencies, non-determinism (time, random), tight coupling, long methods, side effects mixed with logic, and lack of interfaces at boundaries. Testable code has explicit dependencies, pure functions, and clear separation of concerns.

### Q8: What is a flaky test and how do you fix it?

A flaky test passes sometimes and fails other times without code changes. Common causes: time dependencies, race conditions, test order dependencies, and external service instability. Fix by making tests deterministic, independent, and mocking external services.

### Q9: When should you NOT use TDD?

Skip TDD for: exploratory prototypes, one-off scripts, UI/visual code, research spikes, and initial work on legacy code without tests. Use alternatives like spike-and-stabilize or characterization tests.

### Q10: What is the ZOMBIES acronym?

ZOMBIES helps generate test cases: **Z**ero (empty/null cases), **O**ne (single element), **M**any (multiple elements), **B**oundary (edge values), **I**nterface (API contracts), **E**xception (error cases), **S**imple scenarios (happy paths).

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

### Assertion Methods Reference

| Method | Purpose | Example |
|--------|---------|---------|
| `toBe` | Strict equality | `expect(x).toBe(5)` |
| `toEqual` | Deep equality | `expect(obj).toEqual({a: 1})` |
| `toContain` | Array/string contains | `expect([1,2]).toContain(1)` |
| `toThrow` | Function throws | `expect(fn).toThrow()` |
| `resolves` | Promise resolves | `await expect(p).resolves.toBe(x)` |
| `rejects` | Promise rejects | `await expect(p).rejects.toThrow()` |
| `toBeNull` | Is null | `expect(x).toBeNull()` |
| `toBeDefined` | Is defined | `expect(x).toBeDefined()` |
| `toMatchObject` | Partial match | `expect(obj).toMatchObject({a:1})` |

### fast-check Arbitraries Cheat Sheet

| Arbitrary | Generates |
|-----------|-----------|
| `fc.integer()` | Any integer |
| `fc.integer({min, max})` | Integer in range |
| `fc.string()` | Any string |
| `fc.stringMatching(/regex/)` | String matching pattern |
| `fc.array(arb)` | Array of arbitrary |
| `fc.object()` | Any object |
| `fc.record({...})` | Object with shape |
| `fc.constantFrom(...values)` | One of the values |
| `fc.oneof(...arbs)` | One of the arbitraries |
| `arb.filter(predicate)` | Filtered values |
| `arb.map(fn)` | Transformed values |

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
- [Vitest Documentation](https://vitest.dev/) — Modern testing framework
- [Jest Documentation](https://jestjs.io/docs/getting-started) — Popular testing framework
- [Node.js Test Runner](https://nodejs.org/api/test.html) — Built-in test runner

### Books
- *Test-Driven Development: By Example* — Kent Beck
- *Growing Object-Oriented Software, Guided by Tests* — Freeman & Pryce
- *Working Effectively with Legacy Code* — Michael Feathers

### Libraries
- [fast-check](https://fast-check.dev/) — Property-based testing
- [Testing Library](https://testing-library.com/) — DOM testing
- [MSW](https://mswjs.io/) — Mock Service Worker for API mocking
- [Faker](https://fakerjs.dev/) — Fake data generation

### Related Guides in This Series
- [08-tooling-testing.md](08-tooling-testing.md) — Testing basics and tools
- [13-anti-patterns-best-practices.md](13-anti-patterns-best-practices.md) — Code quality practices
- [15-std-library-essentials.md](15-std-library-essentials.md) — Built-in APIs for testing
