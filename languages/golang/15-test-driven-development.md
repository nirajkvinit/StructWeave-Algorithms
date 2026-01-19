# Test-Driven Development in Go

> Write tests first, code second — and think like a QA engineer while doing both

Test-Driven Development (TDD) is a discipline that transforms how you write code. Instead of writing code and then testing it, you write tests first and let them drive your implementation. This guide covers TDD methodology, Go-specific testing patterns, and most importantly — how to develop the **QA mindset** that separates good tests from great ones.

**Reading time**: 90-120 minutes

---

## Table of Contents

1. [Why TDD? The Case for Test-First Development](#why-tdd-the-case-for-test-first-development)
2. [The TDD Cycle: Red-Green-Refactor](#the-tdd-cycle-red-green-refactor)
3. [The Two Schools of TDD](#the-two-schools-of-tdd)
4. [Thinking Like a QA Engineer](#thinking-like-a-qa-engineer)
5. [TDD in Go: Practical Patterns](#tdd-in-go-practical-patterns)
6. [Test Doubles: Fakes, Stubs, Mocks, and Spies](#test-doubles-fakes-stubs-mocks-and-spies)
7. [Writing Testable Code](#writing-testable-code)
8. [TDD Strategies](#tdd-strategies)
9. [TDD Anti-Patterns](#tdd-anti-patterns)
10. [Advanced TDD Techniques](#advanced-tdd-techniques)
11. [TDD for Different Scenarios](#tdd-for-different-scenarios)
12. [When NOT to Use TDD](#when-not-to-use-tdd)
13. [Interview Questions](#interview-questions)
14. [Quick Reference Cards](#quick-reference-cards)
15. [Resources](#resources)

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
| **Realizing Quality Improvement** | Code written TDD-style has 40-80% fewer bugs |

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

```go
// user_test.go
func TestNewUser_ValidatesEmail(t *testing.T) {
    _, err := NewUser("", "password123")

    if err == nil {
        t.Error("expected error for empty email, got nil")
    }
}
```

**Rules:**
- Test must fail for the right reason (missing code, not syntax error)
- Test should be small and focused on one behavior
- Test name should describe the expected behavior

Run the test — it fails because `NewUser` doesn't exist:

```bash
$ go test
# undefined: NewUser
```

### Phase 2: Green — Make It Pass

Write the **minimum** code to make the test pass.

```go
// user.go
func NewUser(email, password string) (*User, error) {
    if email == "" {
        return nil, errors.New("email required")
    }
    return &User{Email: email, Password: password}, nil
}
```

**Rules:**
- Write the simplest code that passes
- Don't add features the test doesn't require
- It's OK if the code is ugly — you'll fix it next

Run the test — it passes:

```bash
$ go test
PASS
```

### Phase 3: Refactor — Improve the Code

Now improve the code while keeping tests green.

```go
// user.go
var ErrEmailRequired = errors.New("email is required")

func NewUser(email, password string) (*User, error) {
    if email == "" {
        return nil, ErrEmailRequired
    }
    return &User{
        Email:    email,
        Password: password,
    }, nil
}
```

**Rules:**
- Tests must pass after every change
- Improve both production code AND test code
- Remove duplication, improve names, simplify logic
- Don't add new functionality — that requires a new Red phase

### The Complete Cycle Example

Let's implement email validation step by step:

**Cycle 1: Empty email**

```go
// Red
func TestNewUser_EmptyEmail(t *testing.T) {
    _, err := NewUser("", "pass")
    if err == nil {
        t.Error("expected error for empty email")
    }
}

// Green
func NewUser(email, password string) (*User, error) {
    if email == "" {
        return nil, errors.New("email required")
    }
    return &User{Email: email}, nil
}
```

**Cycle 2: Missing @ symbol**

```go
// Red
func TestNewUser_InvalidEmailNoAt(t *testing.T) {
    _, err := NewUser("notanemail", "pass")
    if err == nil {
        t.Error("expected error for email without @")
    }
}

// Green
func NewUser(email, password string) (*User, error) {
    if email == "" || !strings.Contains(email, "@") {
        return nil, errors.New("invalid email")
    }
    return &User{Email: email}, nil
}
```

**Cycle 3: Valid email works**

```go
// Red
func TestNewUser_ValidEmail(t *testing.T) {
    user, err := NewUser("test@example.com", "pass")
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Email != "test@example.com" {
        t.Errorf("email = %q; want %q", user.Email, "test@example.com")
    }
}

// Green: Already passes! Move to refactor.
```

**Refactor: Extract validation**

```go
var (
    ErrInvalidEmail = errors.New("invalid email address")
)

func NewUser(email, password string) (*User, error) {
    if err := validateEmail(email); err != nil {
        return nil, err
    }
    return &User{Email: email, Password: password}, nil
}

func validateEmail(email string) error {
    if email == "" || !strings.Contains(email, "@") {
        return ErrInvalidEmail
    }
    return nil
}
```

---

## The Two Schools of TDD

TDD practitioners follow two main approaches with different philosophies.

### Chicago/Detroit School (Classical/Inside-Out)

The **classical** approach focuses on state verification and minimal mocking.

**Philosophy:**
- Start with domain/business logic, build outward
- Use real objects whenever possible
- Verify state changes, not method calls
- Mocks only for external dependencies (DB, network)

**Example:**

```go
// Test the shopping cart with real objects
func TestShoppingCart_AddItem(t *testing.T) {
    cart := NewShoppingCart()
    product := Product{ID: "SKU123", Price: 1999} // Real object

    cart.Add(product, 2)

    // Verify state
    if cart.TotalItems() != 2 {
        t.Errorf("TotalItems() = %d; want 2", cart.TotalItems())
    }
    if cart.Subtotal() != 3998 {
        t.Errorf("Subtotal() = %d; want 3998", cart.Subtotal())
    }
}
```

**Characteristics:**

| Aspect | Chicago Approach |
|--------|------------------|
| Direction | Inside-out (domain first) |
| Test doubles | Minimal — prefer real objects |
| Verification | State-based |
| Coupling | Tests coupled to behavior, not implementation |
| Refactoring | Tests usually survive refactoring |

### London School (Mockist/Outside-In)

The **mockist** approach focuses on interaction verification and heavy mocking.

**Philosophy:**
- Start from external API/UI, build inward
- Mock all collaborators
- Verify that correct methods are called with correct arguments
- Design emerges from interaction tests

**Example:**

```go
// Test that checkout calls the right collaborators
func TestCheckoutService_Process(t *testing.T) {
    // Create mocks
    mockCart := &MockCart{items: []CartItem{{ProductID: "SKU123", Qty: 2}}}
    mockPayment := &MockPaymentGateway{}
    mockInventory := &MockInventoryService{}

    service := NewCheckoutService(mockCart, mockPayment, mockInventory)

    err := service.Process()

    // Verify interactions
    if !mockInventory.ReserveCalled {
        t.Error("expected Reserve to be called")
    }
    if !mockPayment.ChargeCalled {
        t.Error("expected Charge to be called")
    }
    if mockPayment.ChargeAmount != 3998 {
        t.Errorf("Charge amount = %d; want 3998", mockPayment.ChargeAmount)
    }
}
```

**Characteristics:**

| Aspect | London Approach |
|--------|-----------------|
| Direction | Outside-in (API first) |
| Test doubles | Heavy — mock all collaborators |
| Verification | Interaction-based |
| Coupling | Tests coupled to implementation details |
| Refactoring | Tests may break on refactoring |

### When to Use Which

| Scenario | Recommended Approach |
|----------|---------------------|
| Domain logic, algorithms | Chicago (classical) |
| Complex collaborations | London (mockist) |
| External service integration | Either — mock the external service |
| Greenfield project | Chicago for core, London for boundaries |
| Learning TDD | Start with Chicago — simpler |

### Go's Natural Fit: Chicago with Strategic Mocking

Go's philosophy aligns well with a modified Chicago approach:

```go
// Real objects for domain logic
func TestOrderCalculator_ApplyDiscount(t *testing.T) {
    calc := NewOrderCalculator()
    order := Order{Items: []Item{{Price: 1000}, {Price: 2000}}}

    total := calc.CalculateTotal(order, "SAVE10")

    // State verification
    if total != 2700 { // 10% off 3000
        t.Errorf("total = %d; want 2700", total)
    }
}

// Interfaces only at boundaries
type PaymentProcessor interface {
    Charge(amount int64) error
}

// Fake for testing
type FakePaymentProcessor struct {
    ChargeError error
    Charges     []int64
}

func (f *FakePaymentProcessor) Charge(amount int64) error {
    f.Charges = append(f.Charges, amount)
    return f.ChargeError
}

func TestOrderService_Checkout(t *testing.T) {
    fake := &FakePaymentProcessor{}
    service := NewOrderService(fake)

    err := service.Checkout(Order{Total: 5000})

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if len(fake.Charges) != 1 || fake.Charges[0] != 5000 {
        t.Errorf("expected single charge of 5000")
    }
}
```

---

## Thinking Like a QA Engineer

The most valuable skill in TDD isn't writing test code — it's developing the **QA mindset**. This means actively trying to break your code, not prove it works.

### The Testing Mindset Shift

| Developer Mindset | QA Mindset |
|-------------------|------------|
| "Does it work for valid input?" | "What inputs will break it?" |
| "The happy path passes" | "What about the sad paths?" |
| "It works on my machine" | "What about edge cases?" |
| "Users won't do that" | "What if they do?" |
| "That's an unlikely scenario" | "Murphy's Law says test it" |

### Edge Case Hunting

Systematically find the inputs that expose bugs.

**Numeric Edge Cases:**

```go
func TestDivide(t *testing.T) {
    tests := []struct {
        name      string
        a, b      int
        want      float64
        wantError bool
    }{
        // Happy paths
        {"positive divide", 10, 2, 5.0, false},
        {"negative result", -10, 2, -5.0, false},

        // Edge cases
        {"divide by zero", 10, 0, 0, true},
        {"zero dividend", 0, 5, 0.0, false},
        {"both negative", -10, -2, 5.0, false},
        {"large numbers", math.MaxInt64/2, 2, float64(math.MaxInt64/2)/2, false},
        {"min int", math.MinInt64, -1, 0, true}, // Overflow!
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Divide(tt.a, tt.b)
            if (err != nil) != tt.wantError {
                t.Errorf("error = %v; wantError = %v", err, tt.wantError)
            }
            if !tt.wantError && got != tt.want {
                t.Errorf("Divide(%d, %d) = %v; want %v", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

**String Edge Cases:**

```go
func TestSanitizeUsername(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    string
        wantErr bool
    }{
        // Happy paths
        {"normal", "john_doe", "john_doe", false},
        {"with numbers", "john123", "john123", false},

        // Edge cases
        {"empty string", "", "", true},
        {"whitespace only", "   ", "", true},
        {"leading whitespace", "  john", "john", false},
        {"trailing whitespace", "john  ", "john", false},
        {"single char", "a", "a", false},
        {"very long", strings.Repeat("a", 1000), "", true},

        // Special characters
        {"unicode", "日本語", "日本語", false},
        {"emoji", "john👍", "", true},
        {"newline", "john\ndoe", "", true},
        {"null byte", "john\x00doe", "", true},
        {"tab", "john\tdoe", "", true},

        // Adversarial
        {"sql injection", "'; DROP TABLE users;--", "", true},
        {"xss attempt", "<script>alert(1)</script>", "", true},
        {"path traversal", "../../../etc/passwd", "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := SanitizeUsername(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("error = %v; wantErr = %v", err, tt.wantErr)
            }
            if got != tt.want {
                t.Errorf("got %q; want %q", got, tt.want)
            }
        })
    }
}
```

### Boundary Value Analysis

Test at the edges of valid ranges where bugs hide.

```
          Invalid     │     Valid     │    Invalid
        ◄───────────► │ ◄────────────►│ ◄──────────►
                      │               │
        ●             ●               ●             ●
      n-2           n-1   n       n+1            n+2
                      │               │
                 Boundary         Boundary
```

**Example: Age Validation (valid: 18-120)**

```go
func TestValidateAge(t *testing.T) {
    tests := []struct {
        age   int
        valid bool
    }{
        // Below valid range
        {-1, false},   // Negative
        {0, false},    // Zero
        {17, false},   // Just below minimum (n-1)

        // At boundaries
        {18, true},    // Minimum valid (n)
        {19, true},    // Just above minimum (n+1)
        {119, true},   // Just below maximum (n-1)
        {120, true},   // Maximum valid (n)

        // Above valid range
        {121, false},  // Just above maximum (n+1)
        {200, false},  // Well above
        {math.MaxInt32, false}, // Extreme
    }

    for _, tt := range tests {
        t.Run(fmt.Sprintf("age=%d", tt.age), func(t *testing.T) {
            err := ValidateAge(tt.age)
            isValid := err == nil
            if isValid != tt.valid {
                t.Errorf("ValidateAge(%d) valid = %v; want %v", tt.age, isValid, tt.valid)
            }
        })
    }
}
```

### Equivalence Partitioning

Group inputs that should behave identically, then test one from each group.

```go
func TestCategorizeGrade(t *testing.T) {
    // Partitions:
    // A: 90-100
    // B: 80-89
    // C: 70-79
    // D: 60-69
    // F: 0-59
    // Invalid: < 0 or > 100

    tests := []struct {
        score    int
        expected string
    }{
        // One representative from each partition
        {95, "A"},   // A partition
        {85, "B"},   // B partition
        {75, "C"},   // C partition
        {65, "D"},   // D partition
        {55, "F"},   // F partition

        // Boundary values between partitions
        {90, "A"},   // A/B boundary
        {89, "B"},   // A/B boundary
        {80, "B"},   // B/C boundary
        {79, "C"},   // B/C boundary
        {70, "C"},   // C/D boundary
        {69, "D"},   // C/D boundary
        {60, "D"},   // D/F boundary
        {59, "F"},   // D/F boundary

        // Invalid partitions
        {-1, ""},    // Below valid
        {101, ""},   // Above valid
    }

    for _, tt := range tests {
        t.Run(fmt.Sprintf("score=%d", tt.score), func(t *testing.T) {
            got := CategorizeGrade(tt.score)
            if got != tt.expected {
                t.Errorf("CategorizeGrade(%d) = %q; want %q", tt.score, got, tt.expected)
            }
        })
    }
}
```

### Negative Testing

Explicitly test what should NOT work.

```go
func TestCreateAccount_RejectsInvalid(t *testing.T) {
    validReq := CreateAccountRequest{
        Email:    "valid@example.com",
        Password: "SecureP@ss123",
        Age:      25,
    }

    tests := []struct {
        name    string
        modify  func(*CreateAccountRequest)
        wantErr string
    }{
        {
            name:    "empty email",
            modify:  func(r *CreateAccountRequest) { r.Email = "" },
            wantErr: "email required",
        },
        {
            name:    "invalid email format",
            modify:  func(r *CreateAccountRequest) { r.Email = "not-an-email" },
            wantErr: "invalid email",
        },
        {
            name:    "password too short",
            modify:  func(r *CreateAccountRequest) { r.Password = "short" },
            wantErr: "password must be at least 8 characters",
        },
        {
            name:    "password no uppercase",
            modify:  func(r *CreateAccountRequest) { r.Password = "alllowercase123!" },
            wantErr: "password must contain uppercase",
        },
        {
            name:    "password no number",
            modify:  func(r *CreateAccountRequest) { r.Password = "NoNumbersHere!" },
            wantErr: "password must contain number",
        },
        {
            name:    "underage",
            modify:  func(r *CreateAccountRequest) { r.Age = 12 },
            wantErr: "must be 13 or older",
        },
        {
            name:    "negative age",
            modify:  func(r *CreateAccountRequest) { r.Age = -5 },
            wantErr: "invalid age",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := validReq // Copy
            tt.modify(&req)

            _, err := CreateAccount(req)

            if err == nil {
                t.Fatal("expected error, got nil")
            }
            if !strings.Contains(err.Error(), tt.wantErr) {
                t.Errorf("error = %q; want to contain %q", err.Error(), tt.wantErr)
            }
        })
    }
}
```

### The QA Checklist

Before considering any code complete, verify:

| Category | Checklist Item |
|----------|----------------|
| **Happy Path** | Does the main use case work? |
| **Empty/Nil** | What happens with empty string, nil, zero values? |
| **Boundaries** | Tested at min-1, min, max, max+1? |
| **Type Limits** | What about MaxInt, MinInt, NaN, Infinity? |
| **Concurrency** | Is it safe with concurrent access? |
| **Resources** | Are files/connections properly closed? |
| **Errors** | Are all error paths tested? |
| **Invalid Input** | Does it reject what it should reject? |
| **Timing** | What about timeouts, slow responses? |
| **State** | What happens on retry? Multiple calls? |

### Error Guessing

Experienced testers know common bug patterns:

| Bug Pattern | Test For |
|-------------|----------|
| **Off-by-one** | Array index boundaries, loop conditions |
| **Null/nil** | Optional fields, failed lookups, empty results |
| **Race conditions** | Concurrent modifications |
| **Resource leaks** | Files not closed, goroutines not stopped |
| **Integer overflow** | Large number arithmetic |
| **Encoding issues** | Unicode, special characters, UTF-8 BOM |
| **Time zones** | Date comparisons across zones |
| **Floating point** | Equality comparisons, precision loss |

```go
func TestParseJSON_CommonBugs(t *testing.T) {
    tests := []struct {
        name  string
        input string
        check func(*testing.T, *Result, error)
    }{
        // Null vs missing field
        {
            name:  "null field",
            input: `{"name": null}`,
            check: func(t *testing.T, r *Result, err error) {
                if r.Name != "" {
                    t.Error("null should parse as empty string")
                }
            },
        },
        {
            name:  "missing field",
            input: `{}`,
            check: func(t *testing.T, r *Result, err error) {
                if r.Name != "" {
                    t.Error("missing field should be empty string")
                }
            },
        },

        // Numeric edge cases
        {
            name:  "large number",
            input: `{"count": 9999999999999999999}`,
            check: func(t *testing.T, r *Result, err error) {
                // JSON numbers can overflow int64
                // Should either error or handle gracefully
            },
        },
        {
            name:  "floating point precision",
            input: `{"price": 0.1}`,
            check: func(t *testing.T, r *Result, err error) {
                // 0.1 cannot be represented exactly in float64
                if r.Price == 0.1 {
                    // Actually will be 0.10000000000000001
                }
            },
        },

        // Unicode handling
        {
            name:  "unicode escapes",
            input: `{"emoji": "\u0048\u0065\u006C\u006C\u006F"}`,
            check: func(t *testing.T, r *Result, err error) {
                if r.Emoji != "Hello" {
                    t.Errorf("got %q; want Hello", r.Emoji)
                }
            },
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            var result Result
            err := json.Unmarshal([]byte(tt.input), &result)
            tt.check(t, &result, err)
        })
    }
}
```

---

## TDD in Go: Practical Patterns

### Table-Driven Tests

The idiomatic Go testing pattern:

```go
func TestParseAge(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    int
        wantErr bool
    }{
        // Happy paths
        {"valid age", "25", 25, false},
        {"zero", "0", 0, false},
        {"max valid", "120", 120, false},

        // Edge cases
        {"empty string", "", 0, true},
        {"negative", "-5", 0, true},
        {"too large", "200", 0, true},
        {"float", "25.5", 0, true},
        {"leading zeros", "007", 7, false},
        {"whitespace padded", " 25 ", 25, false},
        {"max int overflow", "9223372036854775808", 0, true},

        // Invalid formats
        {"letters", "abc", 0, true},
        {"mixed", "12abc", 0, true},
        {"special chars", "12!@#", 0, true},

        // Adversarial
        {"sql injection", "1; DROP TABLE", 0, true},
        {"unicode digits", "二十五", 0, true},
        {"null byte", "25\x00", 0, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseAge(tt.input)

            if (err != nil) != tt.wantErr {
                t.Errorf("ParseAge(%q) error = %v; wantErr = %v", tt.input, err, tt.wantErr)
                return
            }

            if got != tt.want {
                t.Errorf("ParseAge(%q) = %d; want %d", tt.input, got, tt.want)
            }
        })
    }
}
```

### Subtests and t.Run()

Organize related tests and enable selective running:

```go
func TestUserService(t *testing.T) {
    // Shared setup
    db := setupTestDB(t)
    service := NewUserService(db)

    t.Run("Create", func(t *testing.T) {
        t.Run("valid user", func(t *testing.T) {
            user, err := service.Create("alice@example.com")
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if user.ID == "" {
                t.Error("expected user ID to be set")
            }
        })

        t.Run("duplicate email", func(t *testing.T) {
            _, _ = service.Create("bob@example.com")
            _, err := service.Create("bob@example.com")
            if !errors.Is(err, ErrDuplicateEmail) {
                t.Errorf("expected ErrDuplicateEmail, got %v", err)
            }
        })
    })

    t.Run("Get", func(t *testing.T) {
        t.Run("existing user", func(t *testing.T) {
            created, _ := service.Create("charlie@example.com")
            found, err := service.Get(created.ID)
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if found.Email != created.Email {
                t.Error("emails don't match")
            }
        })

        t.Run("non-existent user", func(t *testing.T) {
            _, err := service.Get("non-existent-id")
            if !errors.Is(err, ErrNotFound) {
                t.Errorf("expected ErrNotFound, got %v", err)
            }
        })
    })
}

// Run specific subtest:
// go test -run TestUserService/Create/valid_user
```

### Test Helpers

Create reusable helpers with proper error attribution:

```go
// testhelper.go (in *_test.go file or separate package)

func assertEqual[T comparable](t *testing.T, got, want T) {
    t.Helper() // Error points to caller, not here
    if got != want {
        t.Errorf("got %v; want %v", got, want)
    }
}

func assertError(t *testing.T, err error, want error) {
    t.Helper()
    if !errors.Is(err, want) {
        t.Errorf("error = %v; want %v", err, want)
    }
}

func assertNoError(t *testing.T, err error) {
    t.Helper()
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}

func assertContains(t *testing.T, haystack, needle string) {
    t.Helper()
    if !strings.Contains(haystack, needle) {
        t.Errorf("%q does not contain %q", haystack, needle)
    }
}

// Usage
func TestSomething(t *testing.T) {
    result, err := DoSomething()
    assertNoError(t, err)
    assertEqual(t, result.Status, "success")
}
```

### Setup and Teardown

Use `t.Cleanup()` for reliable resource cleanup:

```go
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()

    db, err := sql.Open("postgres", testConnString)
    if err != nil {
        t.Fatalf("failed to open db: %v", err)
    }

    // Create test tables
    _, err = db.Exec(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE
    )`)
    if err != nil {
        t.Fatalf("failed to create table: %v", err)
    }

    // Cleanup runs after test completes (even on failure)
    t.Cleanup(func() {
        db.Exec("DROP TABLE users")
        db.Close()
    })

    return db
}

func TestWithDB(t *testing.T) {
    db := setupTestDB(t)
    // Use db... cleanup happens automatically
}
```

### Golden Files

Compare output against expected files:

```go
var update = flag.Bool("update", false, "update golden files")

func TestGenerateReport(t *testing.T) {
    tests := []struct {
        name   string
        input  Input
        golden string
    }{
        {"basic report", basicInput, "testdata/basic.golden"},
        {"complex report", complexInput, "testdata/complex.golden"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := GenerateReport(tt.input)

            if *update {
                if err := os.WriteFile(tt.golden, got, 0644); err != nil {
                    t.Fatalf("failed to update golden file: %v", err)
                }
                return
            }

            want, err := os.ReadFile(tt.golden)
            if err != nil {
                t.Fatalf("failed to read golden file: %v", err)
            }

            if !bytes.Equal(got, want) {
                t.Errorf("output mismatch; run with -update to update golden files")
                // Optionally show diff
            }
        })
    }
}

// Update golden files: go test -update
```

### Testing Time-Dependent Code

Inject time for testability:

```go
// Production code
type Clock interface {
    Now() time.Time
}

type RealClock struct{}

func (RealClock) Now() time.Time {
    return time.Now()
}

type TokenService struct {
    clock Clock
}

func (s *TokenService) GenerateToken(userID string) Token {
    return Token{
        UserID:    userID,
        ExpiresAt: s.clock.Now().Add(24 * time.Hour),
    }
}

func (s *TokenService) IsExpired(token Token) bool {
    return s.clock.Now().After(token.ExpiresAt)
}

// Test code
type FakeClock struct {
    CurrentTime time.Time
}

func (f *FakeClock) Now() time.Time {
    return f.CurrentTime
}

func (f *FakeClock) Advance(d time.Duration) {
    f.CurrentTime = f.CurrentTime.Add(d)
}

func TestTokenService(t *testing.T) {
    clock := &FakeClock{CurrentTime: time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)}
    service := &TokenService{clock: clock}

    token := service.GenerateToken("user123")

    // Immediately after creation
    if service.IsExpired(token) {
        t.Error("token should not be expired immediately")
    }

    // 23 hours later
    clock.Advance(23 * time.Hour)
    if service.IsExpired(token) {
        t.Error("token should not be expired after 23 hours")
    }

    // 25 hours later (total)
    clock.Advance(2 * time.Hour)
    if !service.IsExpired(token) {
        t.Error("token should be expired after 25 hours")
    }
}
```

---

## Test Doubles: Fakes, Stubs, Mocks, and Spies

Test doubles replace real dependencies in tests. Understanding the differences helps you choose the right tool.

### Types of Test Doubles

| Type | Purpose | Behavior |
|------|---------|----------|
| **Dummy** | Fill parameter lists | Does nothing |
| **Stub** | Provide canned answers | Returns predefined values |
| **Fake** | Working implementation | Simplified but functional |
| **Mock** | Verify interactions | Records and verifies calls |
| **Spy** | Record for later verification | Wraps real object, records calls |

### Dummy

Used when a parameter is required but not used:

```go
type DummyLogger struct{}

func (DummyLogger) Log(msg string) {}

func TestProcessOrder(t *testing.T) {
    // Logger is required but not relevant to this test
    processor := NewOrderProcessor(DummyLogger{})

    result := processor.Process(order)
    // Test result...
}
```

### Stub

Returns predefined responses:

```go
type StubUserRepository struct {
    User  *User
    Error error
}

func (s *StubUserRepository) FindByID(id string) (*User, error) {
    return s.User, s.Error
}

func TestGetUserProfile(t *testing.T) {
    t.Run("user found", func(t *testing.T) {
        stub := &StubUserRepository{
            User: &User{ID: "123", Name: "Alice"},
        }
        service := NewProfileService(stub)

        profile, err := service.GetProfile("123")

        if err != nil {
            t.Fatalf("unexpected error: %v", err)
        }
        if profile.Name != "Alice" {
            t.Errorf("name = %q; want Alice", profile.Name)
        }
    })

    t.Run("user not found", func(t *testing.T) {
        stub := &StubUserRepository{
            Error: ErrNotFound,
        }
        service := NewProfileService(stub)

        _, err := service.GetProfile("456")

        if !errors.Is(err, ErrNotFound) {
            t.Errorf("error = %v; want ErrNotFound", err)
        }
    })
}
```

### Fake

A working but simplified implementation:

```go
// FakeUserRepository is an in-memory implementation
type FakeUserRepository struct {
    users map[string]*User
    mu    sync.RWMutex
}

func NewFakeUserRepository() *FakeUserRepository {
    return &FakeUserRepository{
        users: make(map[string]*User),
    }
}

func (f *FakeUserRepository) Save(user *User) error {
    f.mu.Lock()
    defer f.mu.Unlock()

    if user.ID == "" {
        user.ID = uuid.NewString()
    }
    f.users[user.ID] = user
    return nil
}

func (f *FakeUserRepository) FindByID(id string) (*User, error) {
    f.mu.RLock()
    defer f.mu.RUnlock()

    user, ok := f.users[id]
    if !ok {
        return nil, ErrNotFound
    }
    return user, nil
}

func (f *FakeUserRepository) FindByEmail(email string) (*User, error) {
    f.mu.RLock()
    defer f.mu.RUnlock()

    for _, user := range f.users {
        if user.Email == email {
            return user, nil
        }
    }
    return nil, ErrNotFound
}

// Tests can use the fake like a real database
func TestUserService_CreateAndFind(t *testing.T) {
    repo := NewFakeUserRepository()
    service := NewUserService(repo)

    // Create user
    created, err := service.Create("alice@example.com")
    if err != nil {
        t.Fatalf("failed to create: %v", err)
    }

    // Find by ID
    found, err := service.FindByID(created.ID)
    if err != nil {
        t.Fatalf("failed to find: %v", err)
    }

    if found.Email != created.Email {
        t.Error("emails don't match")
    }
}
```

### Mock

Verifies that specific methods were called with specific arguments:

```go
type MockNotificationService struct {
    SendCalls []SendCall
    SendError error
}

type SendCall struct {
    UserID  string
    Message string
}

func (m *MockNotificationService) Send(userID, message string) error {
    m.SendCalls = append(m.SendCalls, SendCall{userID, message})
    return m.SendError
}

func (m *MockNotificationService) VerifySent(t *testing.T, userID, message string) {
    t.Helper()
    for _, call := range m.SendCalls {
        if call.UserID == userID && call.Message == message {
            return
        }
    }
    t.Errorf("expected Send(%q, %q) to be called", userID, message)
}

func (m *MockNotificationService) VerifyNotCalled(t *testing.T) {
    t.Helper()
    if len(m.SendCalls) > 0 {
        t.Errorf("expected no calls, got %d", len(m.SendCalls))
    }
}

func TestOrderService_NotifiesOnCompletion(t *testing.T) {
    mock := &MockNotificationService{}
    service := NewOrderService(mock)

    service.Complete("order-123", "user-456")

    mock.VerifySent(t, "user-456", "Your order order-123 has been completed")
}

func TestOrderService_NoNotificationOnFailure(t *testing.T) {
    mock := &MockNotificationService{}
    service := NewOrderService(mock)

    service.Fail("order-123", "user-456")

    mock.VerifyNotCalled(t)
}
```

### Spy

Records calls while delegating to real implementation:

```go
type SpyCache struct {
    Cache      Cache // Real implementation
    GetCalls   []string
    SetCalls   []SetCall
    HitCount   int
    MissCount  int
}

type SetCall struct {
    Key   string
    Value interface{}
}

func (s *SpyCache) Get(key string) (interface{}, bool) {
    s.GetCalls = append(s.GetCalls, key)

    value, found := s.Cache.Get(key)
    if found {
        s.HitCount++
    } else {
        s.MissCount++
    }
    return value, found
}

func (s *SpyCache) Set(key string, value interface{}) {
    s.SetCalls = append(s.SetCalls, SetCall{key, value})
    s.Cache.Set(key, value)
}

func TestCacheStrategy(t *testing.T) {
    realCache := NewLRUCache(100)
    spy := &SpyCache{Cache: realCache}
    service := NewCachedUserService(spy)

    // First request - cache miss
    service.GetUser("user-1")
    // Second request - cache hit
    service.GetUser("user-1")
    // Different user - cache miss
    service.GetUser("user-2")

    if spy.HitCount != 1 {
        t.Errorf("HitCount = %d; want 1", spy.HitCount)
    }
    if spy.MissCount != 2 {
        t.Errorf("MissCount = %d; want 2", spy.MissCount)
    }
}
```

### When to Use Each

| Scenario | Recommended Double |
|----------|-------------------|
| Parameter not used in test | Dummy |
| Need specific return values | Stub |
| Need working simplified dependency | Fake |
| Need to verify interactions | Mock |
| Need to observe real behavior | Spy |
| External service (HTTP, DB) | Fake or Stub |
| Business logic under test | Real object (no double) |

### Interface-Based Mocking in Go

Go's implicit interfaces make mocking natural:

```go
// Define interface where you USE it, not where you IMPLEMENT it
type UserGetter interface {
    GetUser(id string) (*User, error)
}

// Production code accepts the interface
type ProfileService struct {
    users UserGetter
}

func NewProfileService(users UserGetter) *ProfileService {
    return &ProfileService{users: users}
}

func (s *ProfileService) GetProfile(id string) (*Profile, error) {
    user, err := s.users.GetUser(id)
    if err != nil {
        return nil, fmt.Errorf("getting user: %w", err)
    }
    return &Profile{
        ID:   user.ID,
        Name: user.Name,
    }, nil
}

// Test with any implementation of UserGetter
type fakeUsers struct {
    users map[string]*User
}

func (f *fakeUsers) GetUser(id string) (*User, error) {
    user, ok := f.users[id]
    if !ok {
        return nil, ErrNotFound
    }
    return user, nil
}

func TestProfileService(t *testing.T) {
    fake := &fakeUsers{
        users: map[string]*User{
            "123": {ID: "123", Name: "Alice"},
        },
    }
    service := NewProfileService(fake)

    profile, err := service.GetProfile("123")

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if profile.Name != "Alice" {
        t.Errorf("name = %q; want Alice", profile.Name)
    }
}
```

---

## Writing Testable Code

Code that's easy to test is usually better designed. Here's how to write it.

### Pure Functions

Functions with no side effects are easiest to test:

```go
// Pure function - same input always gives same output
func CalculateDiscount(price int64, discountPercent int) int64 {
    if discountPercent < 0 || discountPercent > 100 {
        return price
    }
    return price - (price * int64(discountPercent) / 100)
}

// Easy to test - no setup needed
func TestCalculateDiscount(t *testing.T) {
    tests := []struct {
        price    int64
        discount int
        want     int64
    }{
        {1000, 10, 900},
        {1000, 0, 1000},
        {1000, 100, 0},
        {1000, -10, 1000}, // Invalid discount
        {1000, 110, 1000}, // Invalid discount
    }

    for _, tt := range tests {
        got := CalculateDiscount(tt.price, tt.discount)
        if got != tt.want {
            t.Errorf("CalculateDiscount(%d, %d) = %d; want %d",
                tt.price, tt.discount, got, tt.want)
        }
    }
}
```

### Dependency Injection

Pass dependencies instead of creating them:

```go
// BAD: Creates its own dependencies - hard to test
type OrderService struct{}

func (s *OrderService) CreateOrder(items []Item) (*Order, error) {
    db := database.Connect() // Hardcoded dependency
    payment := stripe.NewClient(os.Getenv("STRIPE_KEY")) // Another one

    order := &Order{Items: items}
    if err := db.Save(order); err != nil {
        return nil, err
    }

    if err := payment.Charge(order.Total); err != nil {
        return nil, err
    }

    return order, nil
}

// GOOD: Dependencies injected - easy to test
type OrderService struct {
    db      OrderRepository
    payment PaymentProcessor
}

func NewOrderService(db OrderRepository, payment PaymentProcessor) *OrderService {
    return &OrderService{db: db, payment: payment}
}

func (s *OrderService) CreateOrder(items []Item) (*Order, error) {
    order := &Order{Items: items}
    if err := s.db.Save(order); err != nil {
        return nil, fmt.Errorf("saving order: %w", err)
    }

    if err := s.payment.Charge(order.Total); err != nil {
        return nil, fmt.Errorf("charging: %w", err)
    }

    return order, nil
}

// Test with fakes
func TestOrderService_CreateOrder(t *testing.T) {
    fakeDB := NewFakeOrderRepository()
    fakePayment := &FakePaymentProcessor{}

    service := NewOrderService(fakeDB, fakePayment)

    order, err := service.CreateOrder([]Item{{Price: 1000}})

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if order.Total != 1000 {
        t.Errorf("total = %d; want 1000", order.Total)
    }
}
```

### Interface Segregation

Small, focused interfaces are easier to mock:

```go
// BAD: Large interface - must implement many methods to test
type Database interface {
    Query(sql string, args ...interface{}) (*Rows, error)
    Exec(sql string, args ...interface{}) (Result, error)
    Begin() (*Tx, error)
    Close() error
    Ping() error
    Stats() DBStats
    // ... 20 more methods
}

// GOOD: Small interfaces - only what you need
type UserFinder interface {
    FindUser(id string) (*User, error)
}

type UserSaver interface {
    SaveUser(user *User) error
}

// Service only depends on what it uses
type ProfileService struct {
    finder UserFinder
}

// Easy to test - only need to implement FindUser
type stubUserFinder struct {
    user *User
    err  error
}

func (s *stubUserFinder) FindUser(id string) (*User, error) {
    return s.user, s.err
}
```

### Avoiding Global State

Global state makes tests unreliable:

```go
// BAD: Global state - tests affect each other
var cache = make(map[string]string)

func Get(key string) string {
    return cache[key]
}

func Set(key, value string) {
    cache[key] = value
}

func TestCache(t *testing.T) {
    Set("foo", "bar")
    if Get("foo") != "bar" {
        t.Error("expected bar")
    }
}

func TestCacheEmpty(t *testing.T) {
    // This might fail if TestCache runs first!
    if Get("foo") != "" {
        t.Error("expected empty")
    }
}

// GOOD: Instance-based - tests are isolated
type Cache struct {
    data map[string]string
    mu   sync.RWMutex
}

func NewCache() *Cache {
    return &Cache{data: make(map[string]string)}
}

func (c *Cache) Get(key string) string {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.data[key]
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.data[key] = value
}

func TestCache(t *testing.T) {
    cache := NewCache() // Fresh instance
    cache.Set("foo", "bar")
    if cache.Get("foo") != "bar" {
        t.Error("expected bar")
    }
}

func TestCacheEmpty(t *testing.T) {
    cache := NewCache() // Fresh instance - isolated
    if cache.Get("foo") != "" {
        t.Error("expected empty")
    }
}
```

### Functional Options for Testability

Functional options make dependencies configurable:

```go
type Server struct {
    addr    string
    logger  Logger
    timeout time.Duration
    clock   Clock
}

type Option func(*Server)

func WithLogger(l Logger) Option {
    return func(s *Server) {
        s.logger = l
    }
}

func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

func WithClock(c Clock) Option {
    return func(s *Server) {
        s.clock = c
    }
}

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{
        addr:    addr,
        logger:  DefaultLogger{},
        timeout: 30 * time.Second,
        clock:   RealClock{},
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// In tests, inject test doubles
func TestServer(t *testing.T) {
    fakeClock := &FakeClock{CurrentTime: time.Now()}
    fakeLogger := &FakeLogger{}

    server := NewServer(
        ":8080",
        WithClock(fakeClock),
        WithLogger(fakeLogger),
        WithTimeout(100*time.Millisecond),
    )

    // Test with controlled time and captured logs
}
```

---

## TDD Strategies

Different situations call for different approaches to writing tests.

### Fake It Till You Make It

Start with the simplest possible implementation, then generalize:

```go
// Cycle 1: First test, hardcoded response
func TestFibonacci_Zero(t *testing.T) {
    if Fibonacci(0) != 0 {
        t.Error("Fibonacci(0) should be 0")
    }
}

func Fibonacci(n int) int {
    return 0 // Fake it!
}

// Cycle 2: Another test, still simple
func TestFibonacci_One(t *testing.T) {
    if Fibonacci(1) != 1 {
        t.Error("Fibonacci(1) should be 1")
    }
}

func Fibonacci(n int) int {
    if n == 0 {
        return 0
    }
    return 1 // Still faking it
}

// Cycle 3: Force real implementation
func TestFibonacci_Two(t *testing.T) {
    if Fibonacci(2) != 1 {
        t.Error("Fibonacci(2) should be 1")
    }
}

func Fibonacci(n int) int {
    if n <= 1 {
        return n
    }
    return Fibonacci(n-1) + Fibonacci(n-2) // Now it's real
}
```

### Triangulation

Use multiple examples to force generalization:

```go
// Test 1: Single example
func TestAdd_TwoAndThree(t *testing.T) {
    if Add(2, 3) != 5 {
        t.Error("2 + 3 should be 5")
    }
}

// Could implement as:
func Add(a, b int) int {
    return 5 // Works but not general
}

// Test 2: Triangulate with different inputs
func TestAdd(t *testing.T) {
    tests := []struct {
        a, b, want int
    }{
        {2, 3, 5},
        {0, 0, 0},
        {-1, 1, 0},
        {100, 200, 300},
    }

    for _, tt := range tests {
        got := Add(tt.a, tt.b)
        if got != tt.want {
            t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.want)
        }
    }
}

// Now must be general:
func Add(a, b int) int {
    return a + b
}
```

### Obvious Implementation

When the solution is clear, just write it:

```go
func TestAbs(t *testing.T) {
    tests := []struct {
        input int
        want  int
    }{
        {5, 5},
        {-5, 5},
        {0, 0},
    }

    for _, tt := range tests {
        if got := Abs(tt.input); got != tt.want {
            t.Errorf("Abs(%d) = %d; want %d", tt.input, got, tt.want)
        }
    }
}

// Obvious implementation - no need to fake it
func Abs(n int) int {
    if n < 0 {
        return -n
    }
    return n
}
```

**Use obvious implementation when:**
- The solution is immediately clear
- You're confident it's correct
- It's a simple transformation

**Fall back to Fake It when:**
- The solution isn't obvious
- You make mistakes
- Tests fail unexpectedly

### Test List Planning

Before coding, list all the tests you'll need:

```go
// Test List for shopping cart:
//
// Empty cart:
// - [ ] New cart has zero items
// - [ ] New cart has zero total
//
// Adding items:
// - [ ] Add single item
// - [ ] Add multiple items
// - [ ] Add same item twice increases quantity
// - [ ] Add item with quantity > 1
//
// Removing items:
// - [ ] Remove item that exists
// - [ ] Remove item that doesn't exist (no error)
// - [ ] Remove item reduces quantity
// - [ ] Remove all of an item
//
// Calculations:
// - [ ] Total calculates correctly
// - [ ] Total updates when items change
// - [ ] Discount applies to total
// - [ ] Tax calculated on subtotal
//
// Edge cases:
// - [ ] Very large quantities
// - [ ] Zero price items
// - [ ] Negative quantity (should error)

// Work through the list one test at a time
func TestCart_NewCartHasZeroItems(t *testing.T) {
    cart := NewCart()
    if cart.ItemCount() != 0 {
        t.Errorf("new cart should have 0 items")
    }
}

func TestCart_NewCartHasZeroTotal(t *testing.T) {
    cart := NewCart()
    if cart.Total() != 0 {
        t.Errorf("new cart should have 0 total")
    }
}
// ... continue through the list
```

### Transformation Priority Premise

Some code changes are "safer" than others. Prefer smaller transformations:

| Priority | Transformation | Example |
|----------|---------------|---------|
| 1 | `nil → constant` | `return nil` → `return []` |
| 2 | `constant → variable` | `return 0` → `return n` |
| 3 | `unconditional → if` | `return a` → `if cond { return a }` |
| 4 | `scalar → collection` | `item` → `[]item` |
| 5 | `statement → recursion` | `return x` → `return f(x-1) + x` |
| 6 | `if → loop` | `if` → `for` |
| 7 | `collection → recursion` | `for` → recursive call |

Lower priority (simpler) transformations are less likely to introduce bugs.

---

## TDD Anti-Patterns

Recognize and avoid these common testing mistakes.

### 1. The Liar

Tests that pass but don't actually verify anything meaningful:

```go
// BAD: The Liar - always passes
func TestCalculateTotal_Liar(t *testing.T) {
    result := CalculateTotal([]int{1, 2, 3})
    if result != result {  // Always true!
        t.Error("failed")
    }
}

// BAD: Another Liar - no assertion
func TestProcessOrder_Liar(t *testing.T) {
    ProcessOrder(order)
    // Test passes but doesn't verify anything
}

// BAD: Commenting out the assertion
func TestValidateEmail_Liar(t *testing.T) {
    result := ValidateEmail("test@example.com")
    _ = result
    // if !result {
    //     t.Error("should be valid")
    // }
}

// GOOD: Meaningful assertion
func TestCalculateTotal(t *testing.T) {
    result := CalculateTotal([]int{1, 2, 3})
    if result != 6 {
        t.Errorf("CalculateTotal = %d; want 6", result)
    }
}
```

### 2. The Giant

Tests that verify too much in a single test:

```go
// BAD: The Giant - tests everything in one test
func TestUserService_Giant(t *testing.T) {
    service := NewUserService()

    // Test create
    user, err := service.Create("alice@example.com")
    if err != nil {
        t.Fatal(err)
    }
    if user.Email != "alice@example.com" {
        t.Error("wrong email")
    }

    // Test duplicate
    _, err = service.Create("alice@example.com")
    if err == nil {
        t.Error("should error on duplicate")
    }

    // Test find
    found, err := service.Find(user.ID)
    if err != nil {
        t.Fatal(err)
    }
    if found.Email != user.Email {
        t.Error("emails don't match")
    }

    // Test update
    found.Name = "Alice"
    err = service.Update(found)
    if err != nil {
        t.Fatal(err)
    }

    // Test delete
    err = service.Delete(user.ID)
    if err != nil {
        t.Fatal(err)
    }

    // Verify deleted
    _, err = service.Find(user.ID)
    if err == nil {
        t.Error("should not find deleted user")
    }
}

// GOOD: Focused tests
func TestUserService_Create(t *testing.T) {
    service := NewUserService()
    user, err := service.Create("alice@example.com")

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Email != "alice@example.com" {
        t.Errorf("email = %q; want alice@example.com", user.Email)
    }
}

func TestUserService_CreateDuplicate(t *testing.T) {
    service := NewUserService()
    service.Create("alice@example.com")

    _, err := service.Create("alice@example.com")

    if !errors.Is(err, ErrDuplicateEmail) {
        t.Errorf("error = %v; want ErrDuplicateEmail", err)
    }
}

// ... more focused tests
```

### 3. Excessive Setup

Tests with too much boilerplate before the actual test:

```go
// BAD: Excessive Setup
func TestOrderTotal_ExcessiveSetup(t *testing.T) {
    // 50 lines of setup...
    db := setupDatabase()
    defer db.Close()
    userRepo := NewUserRepository(db)
    user := &User{Name: "Alice", Email: "alice@test.com"}
    err := userRepo.Save(user)
    if err != nil {
        t.Fatal(err)
    }

    productRepo := NewProductRepository(db)
    product1 := &Product{Name: "Widget", Price: 1000}
    productRepo.Save(product1)
    product2 := &Product{Name: "Gadget", Price: 2000}
    productRepo.Save(product2)

    cartRepo := NewCartRepository(db)
    cart := &Cart{UserID: user.ID}
    cartRepo.Save(cart)

    cartItemRepo := NewCartItemRepository(db)
    cartItemRepo.Save(&CartItem{CartID: cart.ID, ProductID: product1.ID, Qty: 2})
    cartItemRepo.Save(&CartItem{CartID: cart.ID, ProductID: product2.ID, Qty: 1})

    orderService := NewOrderService(db, cartRepo, cartItemRepo, productRepo)

    // Actual test (5 lines)
    order, err := orderService.CreateOrder(cart.ID)
    if err != nil {
        t.Fatal(err)
    }
    if order.Total != 4000 {
        t.Errorf("total = %d; want 4000", order.Total)
    }
}

// GOOD: Extract setup, test the unit
func TestCalculateOrderTotal(t *testing.T) {
    // Test the calculation directly, not through the service
    items := []OrderItem{
        {Price: 1000, Quantity: 2},
        {Price: 2000, Quantity: 1},
    }

    total := CalculateOrderTotal(items)

    if total != 4000 {
        t.Errorf("total = %d; want 4000", total)
    }
}

// Or use helpers if integration is needed
func TestOrderService_CreateOrder(t *testing.T) {
    cart := createTestCart(t, []CartItem{
        {ProductID: "widget", Qty: 2, Price: 1000},
        {ProductID: "gadget", Qty: 1, Price: 2000},
    })
    service := createOrderService(t)

    order, err := service.CreateOrder(cart.ID)

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if order.Total != 4000 {
        t.Errorf("total = %d; want 4000", order.Total)
    }
}
```

### 4. The Slow Poke

Tests that are unnecessarily slow:

```go
// BAD: Slow test - real network call
func TestAPIClient_SlowPoke(t *testing.T) {
    client := NewAPIClient("https://api.example.com")

    resp, err := client.GetUser("123") // Real HTTP call!

    if err != nil {
        t.Fatal(err)
    }
    if resp.ID != "123" {
        t.Error("wrong id")
    }
}

// BAD: Unnecessary sleep
func TestWorker_SlowPoke(t *testing.T) {
    worker := NewWorker()
    worker.Start()

    time.Sleep(5 * time.Second) // Just waiting...

    if worker.ProcessedCount() != 10 {
        t.Error("expected 10 processed")
    }
}

// GOOD: Use test server
func TestAPIClient(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        json.NewEncoder(w).Encode(User{ID: "123"})
    }))
    defer server.Close()

    client := NewAPIClient(server.URL)

    resp, err := client.GetUser("123")

    if err != nil {
        t.Fatal(err)
    }
    if resp.ID != "123" {
        t.Error("wrong id")
    }
}

// GOOD: Use channels for synchronization
func TestWorker(t *testing.T) {
    done := make(chan struct{})
    worker := NewWorker(func() { close(done) })
    worker.Start()

    select {
    case <-done:
        // Worker finished
    case <-time.After(100 * time.Millisecond):
        t.Fatal("timeout waiting for worker")
    }

    if worker.ProcessedCount() != 10 {
        t.Error("expected 10 processed")
    }
}
```

### 5. The Peeping Tom

Tests that share state and affect each other:

```go
// BAD: Shared state between tests
var testDB *sql.DB

func TestA_PeepingTom(t *testing.T) {
    testDB.Exec("INSERT INTO users VALUES (1, 'alice')")
    // ...
}

func TestB_PeepingTom(t *testing.T) {
    // Fails if TestA runs first - user already exists!
    testDB.Exec("INSERT INTO users VALUES (1, 'bob')")
    // ...
}

// GOOD: Isolated tests
func TestA(t *testing.T) {
    db := setupTestDB(t) // Fresh database
    t.Cleanup(func() { db.Close() })

    db.Exec("INSERT INTO users VALUES (1, 'alice')")
    // ...
}

func TestB(t *testing.T) {
    db := setupTestDB(t) // Fresh database
    t.Cleanup(func() { db.Close() })

    db.Exec("INSERT INTO users VALUES (1, 'bob')") // No conflict
    // ...
}
```

### 6. The Free Ride

Piggy-backing assertions onto existing tests:

```go
// BAD: Free Ride - adding unrelated assertions
func TestCreateUser_WithFreeRide(t *testing.T) {
    service := NewUserService()

    user, err := service.Create("alice@example.com")

    if err != nil {
        t.Fatal(err)
    }
    if user.Email != "alice@example.com" {
        t.Error("wrong email")
    }

    // Free rides - testing unrelated things
    if !user.CreatedAt.Before(time.Now()) {
        t.Error("created at should be in past")
    }
    if user.ID == "" {
        t.Error("should have ID")
    }
    if !strings.Contains(user.ID, "-") {
        t.Error("ID should be UUID format")
    }
    if service.Count() != 1 {
        t.Error("count should be 1")
    }
}

// GOOD: Separate tests for separate concerns
func TestCreateUser_SetsEmail(t *testing.T) {
    service := NewUserService()
    user, _ := service.Create("alice@example.com")

    if user.Email != "alice@example.com" {
        t.Errorf("email = %q; want alice@example.com", user.Email)
    }
}

func TestCreateUser_AssignsID(t *testing.T) {
    service := NewUserService()
    user, _ := service.Create("alice@example.com")

    if user.ID == "" {
        t.Error("expected ID to be assigned")
    }
}

func TestCreateUser_SetsCreatedAt(t *testing.T) {
    service := NewUserService()
    before := time.Now()
    user, _ := service.Create("alice@example.com")

    if user.CreatedAt.Before(before) {
        t.Error("CreatedAt should not be before creation")
    }
}
```

### 7. Testing Implementation Details

Tests that break when refactoring without behavior change:

```go
// BAD: Testing internal implementation
func TestCache_Implementation(t *testing.T) {
    cache := NewCache()
    cache.Set("key", "value")

    // Testing internal structure!
    if len(cache.data) != 1 {
        t.Error("expected 1 item in internal map")
    }
    if cache.data["key"] != "value" {
        t.Error("wrong value in internal map")
    }
}

// GOOD: Testing public behavior
func TestCache_SetAndGet(t *testing.T) {
    cache := NewCache()
    cache.Set("key", "value")

    got := cache.Get("key")

    if got != "value" {
        t.Errorf("Get(key) = %q; want value", got)
    }
}
```

### 8. 100% Coverage Obsession

Coverage is a tool, not a goal:

```go
// BAD: Test exists only for coverage
func TestGetterSetter_CoverageObsession(t *testing.T) {
    user := &User{}
    user.SetName("Alice")
    if user.GetName() != "Alice" {
        t.Error("wrong name")
    }
}

// BAD: Testing panic recovery for coverage
func TestMustParse_CoverageObsession(t *testing.T) {
    defer func() {
        if r := recover(); r == nil {
            t.Error("expected panic")
        }
    }()
    MustParse("invalid")
}

// GOOD: Test valuable behavior
func TestUser_FullNameFormat(t *testing.T) {
    user := &User{FirstName: "Alice", LastName: "Smith"}

    if user.FullName() != "Alice Smith" {
        t.Errorf("FullName() = %q; want 'Alice Smith'", user.FullName())
    }
}

// GOOD: Test error handling that matters
func TestParse_InvalidInput(t *testing.T) {
    _, err := Parse("invalid")

    if err == nil {
        t.Error("expected error for invalid input")
    }
    if !errors.Is(err, ErrInvalidFormat) {
        t.Errorf("error = %v; want ErrInvalidFormat", err)
    }
}
```

### 9. Copy-Paste Tests

Duplicated test code that becomes a maintenance burden:

```go
// BAD: Copy-paste tests
func TestValidateEmail_Valid(t *testing.T) {
    email := "test@example.com"
    result := ValidateEmail(email)
    if !result {
        t.Errorf("ValidateEmail(%q) = false; want true", email)
    }
}

func TestValidateEmail_Valid2(t *testing.T) {
    email := "user.name@domain.org"
    result := ValidateEmail(email)
    if !result {
        t.Errorf("ValidateEmail(%q) = false; want true", email)
    }
}

func TestValidateEmail_Valid3(t *testing.T) {
    email := "user+tag@example.co.uk"
    result := ValidateEmail(email)
    if !result {
        t.Errorf("ValidateEmail(%q) = false; want true", email)
    }
}
// ... 10 more nearly identical tests

// GOOD: Table-driven test
func TestValidateEmail(t *testing.T) {
    validEmails := []string{
        "test@example.com",
        "user.name@domain.org",
        "user+tag@example.co.uk",
        "123@numbers.com",
    }

    for _, email := range validEmails {
        t.Run(email, func(t *testing.T) {
            if !ValidateEmail(email) {
                t.Errorf("ValidateEmail(%q) = false; want true", email)
            }
        })
    }
}
```

### 10. The Secret Catcher

Tests that only fail in CI, not locally:

```go
// BAD: Environment-dependent test
func TestConfig_SecretCatcher(t *testing.T) {
    // Works locally but fails in CI
    cfg := LoadConfig("/Users/dev/config.json") // Hardcoded path!
    if cfg.AppName != "MyApp" {
        t.Error("wrong app name")
    }
}

// BAD: Timing-dependent test
func TestConcurrent_SecretCatcher(t *testing.T) {
    result := make(chan int, 10)
    for i := 0; i < 10; i++ {
        go func(n int) {
            result <- n
        }(i)
    }

    // Works on fast machine, fails on slow CI
    time.Sleep(10 * time.Millisecond)

    if len(result) != 10 {
        t.Error("expected 10 results")
    }
}

// GOOD: Environment-agnostic
func TestConfig(t *testing.T) {
    // Use test fixtures
    cfg := LoadConfigFromString(`{"appName": "MyApp"}`)
    if cfg.AppName != "MyApp" {
        t.Error("wrong app name")
    }
}

// GOOD: Synchronization instead of timing
func TestConcurrent(t *testing.T) {
    var wg sync.WaitGroup
    result := make(chan int, 10)

    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            result <- n
        }(i)
    }

    wg.Wait()
    close(result)

    count := 0
    for range result {
        count++
    }

    if count != 10 {
        t.Errorf("count = %d; want 10", count)
    }
}
```

---

## Advanced TDD Techniques

### Property-Based Testing

Instead of specific examples, test properties that should always hold:

```go
import "testing/quick"

func TestReverse_Properties(t *testing.T) {
    // Property: Reversing twice gives original
    reverseTwice := func(s string) bool {
        return Reverse(Reverse(s)) == s
    }

    if err := quick.Check(reverseTwice, nil); err != nil {
        t.Error(err)
    }

    // Property: Length is preserved
    preservesLength := func(s string) bool {
        return len(Reverse(s)) == len(s)
    }

    if err := quick.Check(preservesLength, nil); err != nil {
        t.Error(err)
    }
}

func TestSort_Properties(t *testing.T) {
    // Property: Sorted slice is same length
    sameLength := func(nums []int) bool {
        sorted := make([]int, len(nums))
        copy(sorted, nums)
        Sort(sorted)
        return len(sorted) == len(nums)
    }

    // Property: All elements present after sort
    sameElements := func(nums []int) bool {
        sorted := make([]int, len(nums))
        copy(sorted, nums)
        Sort(sorted)

        count := make(map[int]int)
        for _, n := range nums {
            count[n]++
        }
        for _, n := range sorted {
            count[n]--
        }
        for _, c := range count {
            if c != 0 {
                return false
            }
        }
        return true
    }

    // Property: Result is actually sorted
    isSorted := func(nums []int) bool {
        sorted := make([]int, len(nums))
        copy(sorted, nums)
        Sort(sorted)

        for i := 1; i < len(sorted); i++ {
            if sorted[i] < sorted[i-1] {
                return false
            }
        }
        return true
    }

    quick.Check(sameLength, nil)
    quick.Check(sameElements, nil)
    quick.Check(isSorted, nil)
}
```

### Fuzz Testing

Let Go find edge cases automatically:

```go
func FuzzParseURL(f *testing.F) {
    // Seed corpus
    f.Add("https://example.com")
    f.Add("http://localhost:8080/path")
    f.Add("https://user:pass@host.com")
    f.Add("") // Empty
    f.Add("not-a-url")

    f.Fuzz(func(t *testing.T, input string) {
        url, err := ParseURL(input)
        if err != nil {
            return // Invalid input is fine
        }

        // If parsed successfully, should round-trip
        serialized := url.String()
        reparsed, err := ParseURL(serialized)
        if err != nil {
            t.Errorf("round-trip failed: %q -> %q -> error", input, serialized)
        }
        if reparsed.String() != serialized {
            t.Errorf("inconsistent: %q vs %q", reparsed.String(), serialized)
        }
    })
}

func FuzzJSONRoundTrip(f *testing.F) {
    f.Add(`{"name":"test","count":42}`)
    f.Add(`[]`)
    f.Add(`null`)

    f.Fuzz(func(t *testing.T, input string) {
        var v interface{}
        if err := json.Unmarshal([]byte(input), &v); err != nil {
            return // Invalid JSON
        }

        // Marshal back
        output, err := json.Marshal(v)
        if err != nil {
            t.Errorf("marshal failed: %v", err)
            return
        }

        // Should unmarshal to same value
        var v2 interface{}
        if err := json.Unmarshal(output, &v2); err != nil {
            t.Errorf("unmarshal of output failed: %v", err)
        }
    })
}

// Run: go test -fuzz=FuzzParseURL -fuzztime=30s
```

### Mutation Testing

Verify tests catch bugs by introducing mutations:

```go
// Original code
func IsAdult(age int) bool {
    return age >= 18
}

// Mutation 1: Change >= to >
func IsAdult_Mutation1(age int) bool {
    return age > 18 // Bug: 18 is not adult
}

// Mutation 2: Change >= to ==
func IsAdult_Mutation2(age int) bool {
    return age == 18 // Bug: Only 18 is adult
}

// Mutation 3: Change 18 to 17
func IsAdult_Mutation3(age int) bool {
    return age >= 17 // Bug: 17 is adult
}

// Good tests should catch ALL mutations
func TestIsAdult(t *testing.T) {
    tests := []struct {
        age  int
        want bool
    }{
        {17, false}, // Catches Mutation 3
        {18, true},  // Catches Mutation 1
        {19, true},  // Catches Mutation 2
        {0, false},
        {100, true},
    }

    for _, tt := range tests {
        t.Run(fmt.Sprintf("age=%d", tt.age), func(t *testing.T) {
            if got := IsAdult(tt.age); got != tt.want {
                t.Errorf("IsAdult(%d) = %v; want %v", tt.age, got, tt.want)
            }
        })
    }
}
```

### Behavior-Driven Development (BDD) Style

Write tests that read like specifications:

```go
func TestShoppingCart(t *testing.T) {
    t.Run("when empty", func(t *testing.T) {
        cart := NewCart()

        t.Run("has zero items", func(t *testing.T) {
            if cart.ItemCount() != 0 {
                t.Error("expected 0 items")
            }
        })

        t.Run("has zero total", func(t *testing.T) {
            if cart.Total() != 0 {
                t.Error("expected 0 total")
            }
        })
    })

    t.Run("when adding an item", func(t *testing.T) {
        cart := NewCart()
        product := Product{ID: "SKU1", Price: 1000}

        cart.Add(product, 1)

        t.Run("increases item count", func(t *testing.T) {
            if cart.ItemCount() != 1 {
                t.Error("expected 1 item")
            }
        })

        t.Run("updates total", func(t *testing.T) {
            if cart.Total() != 1000 {
                t.Error("expected total 1000")
            }
        })
    })

    t.Run("when adding same item twice", func(t *testing.T) {
        cart := NewCart()
        product := Product{ID: "SKU1", Price: 1000}

        cart.Add(product, 1)
        cart.Add(product, 2)

        t.Run("combines quantity", func(t *testing.T) {
            if cart.QuantityOf("SKU1") != 3 {
                t.Errorf("expected quantity 3, got %d", cart.QuantityOf("SKU1"))
            }
        })

        t.Run("item count remains 1", func(t *testing.T) {
            if cart.ItemCount() != 1 {
                t.Error("expected 1 unique item")
            }
        })
    })
}

// Output with -v:
// === RUN   TestShoppingCart
// === RUN   TestShoppingCart/when_empty
// === RUN   TestShoppingCart/when_empty/has_zero_items
// === RUN   TestShoppingCart/when_empty/has_zero_total
// === RUN   TestShoppingCart/when_adding_an_item
// === RUN   TestShoppingCart/when_adding_an_item/increases_item_count
// === RUN   TestShoppingCart/when_adding_an_item/updates_total
// ...
```

---

## TDD for Different Scenarios

### Business Logic

Pure domain logic is ideal for TDD:

```go
// Start with test
func TestPriceCalculator_AppliesQuantityDiscount(t *testing.T) {
    calc := NewPriceCalculator()

    tests := []struct {
        name     string
        price    int64
        quantity int
        want     int64
    }{
        {"no discount under 10", 100, 5, 500},
        {"5% discount at 10+", 100, 10, 950},    // 10% off
        {"10% discount at 50+", 100, 50, 4500},  // 10% off
        {"15% discount at 100+", 100, 100, 8500}, // 15% off
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := calc.Calculate(tt.price, tt.quantity)
            if got != tt.want {
                t.Errorf("Calculate(%d, %d) = %d; want %d",
                    tt.price, tt.quantity, got, tt.want)
            }
        })
    }
}

// Then implement
type PriceCalculator struct{}

func NewPriceCalculator() *PriceCalculator {
    return &PriceCalculator{}
}

func (c *PriceCalculator) Calculate(unitPrice int64, quantity int) int64 {
    total := unitPrice * int64(quantity)
    discount := c.getDiscount(quantity)
    return total - (total * discount / 100)
}

func (c *PriceCalculator) getDiscount(quantity int) int64 {
    switch {
    case quantity >= 100:
        return 15
    case quantity >= 50:
        return 10
    case quantity >= 10:
        return 5
    default:
        return 0
    }
}
```

### HTTP Handlers

Test handlers with `httptest`:

```go
func TestUserHandler_GetUser(t *testing.T) {
    t.Run("returns user when found", func(t *testing.T) {
        // Arrange
        users := &fakeUserService{
            users: map[string]*User{"123": {ID: "123", Name: "Alice"}},
        }
        handler := NewUserHandler(users)

        req := httptest.NewRequest("GET", "/users/123", nil)
        req.SetPathValue("id", "123") // Go 1.22+
        rec := httptest.NewRecorder()

        // Act
        handler.GetUser(rec, req)

        // Assert
        if rec.Code != http.StatusOK {
            t.Errorf("status = %d; want 200", rec.Code)
        }

        var user User
        json.NewDecoder(rec.Body).Decode(&user)
        if user.Name != "Alice" {
            t.Errorf("name = %q; want Alice", user.Name)
        }
    })

    t.Run("returns 404 when not found", func(t *testing.T) {
        users := &fakeUserService{users: map[string]*User{}}
        handler := NewUserHandler(users)

        req := httptest.NewRequest("GET", "/users/999", nil)
        req.SetPathValue("id", "999")
        rec := httptest.NewRecorder()

        handler.GetUser(rec, req)

        if rec.Code != http.StatusNotFound {
            t.Errorf("status = %d; want 404", rec.Code)
        }
    })

    t.Run("returns 400 for invalid id", func(t *testing.T) {
        users := &fakeUserService{}
        handler := NewUserHandler(users)

        req := httptest.NewRequest("GET", "/users/", nil)
        req.SetPathValue("id", "")
        rec := httptest.NewRecorder()

        handler.GetUser(rec, req)

        if rec.Code != http.StatusBadRequest {
            t.Errorf("status = %d; want 400", rec.Code)
        }
    })
}
```

### Database Operations

Test with fakes or use test containers:

```go
// In-memory fake for unit tests
type FakeUserStore struct {
    users map[string]*User
    mu    sync.RWMutex
}

func (f *FakeUserStore) Create(user *User) error {
    f.mu.Lock()
    defer f.mu.Unlock()

    if user.ID == "" {
        user.ID = fmt.Sprintf("user-%d", len(f.users)+1)
    }

    for _, u := range f.users {
        if u.Email == user.Email {
            return ErrDuplicateEmail
        }
    }

    f.users[user.ID] = user
    return nil
}

func TestUserService_WithFake(t *testing.T) {
    store := &FakeUserStore{users: make(map[string]*User)}
    service := NewUserService(store)

    user, err := service.Register("alice@example.com", "password")

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if user.Email != "alice@example.com" {
        t.Error("wrong email")
    }
}

// Integration test with real DB (run separately)
func TestUserService_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    db := setupTestDB(t)
    store := NewPostgresUserStore(db)
    service := NewUserService(store)

    user, err := service.Register("alice@example.com", "password")

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Verify in database
    found, err := store.FindByID(user.ID)
    if err != nil {
        t.Fatalf("failed to find: %v", err)
    }
    if found.Email != user.Email {
        t.Error("emails don't match")
    }
}
```

### Concurrent Code

Test concurrent behavior with synchronization:

```go
func TestCounter_ConcurrentIncrements(t *testing.T) {
    counter := NewCounter()

    var wg sync.WaitGroup
    iterations := 1000
    goroutines := 10

    for i := 0; i < goroutines; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := 0; j < iterations; j++ {
                counter.Increment()
            }
        }()
    }

    wg.Wait()

    expected := goroutines * iterations
    if counter.Value() != expected {
        t.Errorf("Value() = %d; want %d", counter.Value(), expected)
    }
}

func TestCache_ConcurrentAccess(t *testing.T) {
    cache := NewCache()

    var wg sync.WaitGroup

    // Writer
    wg.Add(1)
    go func() {
        defer wg.Done()
        for i := 0; i < 100; i++ {
            cache.Set(fmt.Sprintf("key%d", i), i)
        }
    }()

    // Readers
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := 0; j < 100; j++ {
                cache.Get(fmt.Sprintf("key%d", j%100))
            }
        }()
    }

    // Should not panic or race
    wg.Wait()
}

// Run with: go test -race
```

---

## When NOT to Use TDD

TDD isn't always the best approach. Skip it when:

### 1. Exploratory/Spike Work

When you don't know what you're building:

```go
// Exploring a new API - write code first, test later (or throw away)
func exploreNewAPI() {
    client := NewExternalAPI()
    resp := client.Call("endpoint")
    fmt.Printf("Response structure: %+v\n", resp)
    // Figure out what the API returns before writing tests
}
```

### 2. Trivial Code

Simple getters/setters aren't worth testing:

```go
// Not worth TDD
func (u *User) Name() string { return u.name }
func (u *User) SetName(n string) { u.name = n }

// Worth testing if it has logic
func (u *User) FullName() string {
    return strings.TrimSpace(u.firstName + " " + u.lastName)
}
```

### 3. UI/Presentation Code

Visual output is hard to test meaningfully:

```go
// Hard to TDD - visual rendering
func RenderDashboard(data DashboardData) string {
    // Complex HTML template
}

// Better: Test the data preparation, not the rendering
func PrepareDashboardData(stats Stats) DashboardData {
    // This is testable
}
```

### 4. Third-Party Integration Code

When you're just wrapping external APIs:

```go
// Not much to test with TDD
func (c *StripeClient) CreatePayment(amount int64) (*stripe.PaymentIntent, error) {
    return c.client.PaymentIntents.New(&stripe.PaymentIntentParams{
        Amount:   stripe.Int64(amount),
        Currency: stripe.String("usd"),
    })
}

// Test integration with real API (or sandbox) instead
```

### 5. Prototype/Throwaway Code

Code you know won't survive:

```go
// Quick demo - will be rewritten
func main() {
    // Hacked together proof of concept
    // No tests needed if it's getting deleted
}
```

### What to Do Instead

| Scenario | Alternative Approach |
|----------|---------------------|
| Exploration | Write code, learn, then decide if tests are needed |
| Trivial code | Skip tests or add integration tests later |
| UI code | Manual testing, visual regression tests |
| Third-party | Integration tests, contract tests |
| Prototypes | Spike, then TDD the real implementation |

---

## Interview Questions

### Q1: What is TDD and what are its benefits?

**Answer**: TDD (Test-Driven Development) is a development practice where you write tests before writing production code, following the Red-Green-Refactor cycle:

1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

**Benefits**:
- Tests serve as executable documentation
- Forces thinking about requirements upfront
- Results in testable, modular design
- Provides regression safety net
- Prevents over-engineering (YAGNI)

### Q2: Explain the difference between Chicago and London schools of TDD.

**Answer**:

| Aspect | Chicago (Classical) | London (Mockist) |
|--------|-------------------|------------------|
| Direction | Inside-out (domain first) | Outside-in (API first) |
| Test doubles | Minimal, use real objects | Heavy mocking |
| Verification | State-based | Interaction-based |
| Refactoring | Tests usually survive | Tests may break |
| Best for | Domain logic, algorithms | Complex collaborations |

**Recommendation for Go**: Start with Chicago for domain logic, use London sparingly at system boundaries.

### Q3: What's the difference between a mock and a stub?

**Answer**:
- **Stub**: Provides canned answers to queries. Used to control the test environment.
- **Mock**: Verifies that specific methods were called with specific arguments. Used to verify behavior.

```go
// Stub - returns predefined data
type stubRepo struct {
    user *User
}
func (s *stubRepo) FindUser(id string) *User { return s.user }

// Mock - verifies calls
type mockNotifier struct {
    sendCalled bool
    lastUserID string
}
func (m *mockNotifier) Send(userID string) {
    m.sendCalled = true
    m.lastUserID = userID
}
```

### Q4: How do you test time-dependent code?

**Answer**: Inject time as a dependency:

```go
type Clock interface {
    Now() time.Time
}

type RealClock struct{}
func (RealClock) Now() time.Time { return time.Now() }

type FakeClock struct {
    CurrentTime time.Time
}
func (f *FakeClock) Now() time.Time { return f.CurrentTime }

// Production code uses Clock interface
type TokenService struct { clock Clock }

// Tests inject FakeClock
func TestToken(t *testing.T) {
    fake := &FakeClock{CurrentTime: fixedTime}
    service := &TokenService{clock: fake}
    // Can control time in tests
}
```

### Q5: What is a test anti-pattern? Give examples.

**Answer**: Test anti-patterns are practices that seem helpful but cause problems:

1. **The Liar**: Test passes but doesn't verify anything meaningful
2. **The Giant**: Too many assertions in one test
3. **The Slow Poke**: Unnecessarily slow tests (real network calls, sleeps)
4. **Testing Implementation Details**: Tests break on refactoring
5. **100% Coverage Obsession**: Writing worthless tests for metrics

### Q6: How would you test an HTTP handler in Go?

**Answer**: Use `httptest` package:

```go
func TestHandler(t *testing.T) {
    // Create fake dependencies
    service := &fakeService{}
    handler := NewHandler(service)

    // Create request and recorder
    req := httptest.NewRequest("GET", "/users/123", nil)
    rec := httptest.NewRecorder()

    // Call handler
    handler.ServeHTTP(rec, req)

    // Assert response
    if rec.Code != http.StatusOK {
        t.Errorf("status = %d; want 200", rec.Code)
    }
}
```

### Q7: What makes code "testable"?

**Answer**: Testable code has these characteristics:

1. **Dependency injection**: Dependencies passed in, not created internally
2. **Small interfaces**: Easy to mock
3. **Pure functions**: No side effects, same input = same output
4. **No global state**: Tests are isolated
5. **Single responsibility**: Each unit does one thing

### Q8: When should you NOT use TDD?

**Answer**:
- Exploratory/spike work (learning phase)
- Trivial code (simple getters/setters)
- UI/presentation code (hard to test meaningfully)
- Third-party integration wrappers
- Prototypes that will be thrown away

### Q9: Explain table-driven tests in Go.

**Answer**: Table-driven tests use a slice of test cases:

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 2, 3, 5},
        {"negative", -1, -2, -3},
        {"zero", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d",
                    tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
```

Benefits: DRY, easy to add cases, clear test organization, subtests for selective running.

### Q10: What is the "QA mindset" in TDD?

**Answer**: The QA mindset means actively trying to break your code rather than prove it works:

- **Edge case hunting**: Test boundaries, limits, empty inputs
- **Boundary value analysis**: Test at n-1, n, n+1
- **Negative testing**: Test invalid inputs, error paths
- **Error guessing**: Anticipate common bugs (off-by-one, null, race conditions)

Instead of asking "Does it work?", ask "How can I make it fail?"

---

## Quick Reference Cards

### TDD Cycle

```
┌─────────────────────────────────────────┐
│                TDD CYCLE                │
├─────────────────────────────────────────┤
│                                         │
│  1. RED    → Write failing test         │
│  2. GREEN  → Minimal code to pass       │
│  3. REFACTOR → Improve, tests stay green│
│                                         │
│  Rules:                                 │
│  • Never write code without a test      │
│  • Only write enough to make test pass  │
│  • Refactor both code AND tests         │
│                                         │
└─────────────────────────────────────────┘
```

### Test Double Types

| Type | Purpose | Example Use |
|------|---------|-------------|
| Dummy | Fill parameters | Logger not used in test |
| Stub | Return canned data | Always return same user |
| Fake | Working simplified impl | In-memory database |
| Mock | Verify interactions | Check method was called |
| Spy | Record for verification | Count cache hits |

### QA Checklist

| Check | Question |
|-------|----------|
| Happy path | Does the main use case work? |
| Empty/nil | What happens with no input? |
| Boundaries | Tested at limits? (n-1, n, n+1) |
| Type limits | MaxInt, MinInt, NaN, Infinity? |
| Concurrency | Race condition safe? |
| Resources | Properly closed/cleaned up? |
| Errors | All error paths tested? |
| Invalid | Rejects what it should? |

### Go Testing Commands

```bash
# Run all tests
go test ./...

# Run with verbose output
go test -v ./...

# Run specific test
go test -run TestUserService/Create

# Run with race detector
go test -race ./...

# Run with coverage
go test -cover ./...
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run benchmarks
go test -bench=. ./...

# Run fuzz tests
go test -fuzz=FuzzParse -fuzztime=30s

# Skip long tests
go test -short ./...
```

### Test File Organization

```
mypackage/
├── user.go              # Production code
├── user_test.go         # Unit tests
├── user_integration_test.go  # Integration tests (// +build integration)
├── testdata/            # Test fixtures
│   ├── valid.json
│   └── invalid.json
└── export_test.go       # Export internals for testing
```

---

## Resources

### Essential Reading

- [Learn Go with Tests](https://quii.gitbook.io/learn-go-with-tests) — Complete TDD tutorial in Go
- [Test-Driven Development: By Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530) — Kent Beck's classic
- [Growing Object-Oriented Software, Guided by Tests](https://www.amazon.com/Growing-Object-Oriented-Software-Guided-Tests/dp/0321503627) — London school approach

### Go Testing

- [Go Testing Package](https://pkg.go.dev/testing) — Official documentation
- [Go Wiki: TableDrivenTests](https://go.dev/wiki/TableDrivenTests) — Table-driven test patterns
- [Dave Cheney: Prefer Table Driven Tests](https://dave.cheney.net/2019/05/07/prefer-table-driven-tests)

### TDD Schools and Philosophy

- [London vs Chicago TDD](https://devlead.io/DevTips/LondonVsChicago) — Comparison
- [Martin Fowler: Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html)
- [Uncle Bob: The Cycles of TDD](http://blog.cleancoder.com/uncle-bob/2014/12/17/TheCyclesOfTDD.html)

### Anti-Patterns

- [Codurance: TDD Anti-Patterns](https://www.codurance.com/publications/tdd-anti-patterns-chapter-1)
- [Learn Go with Tests: Anti-Patterns](https://quii.gitbook.io/learn-go-with-tests/meta/anti-patterns)

### QA Mindset

- [Edge Case Testing Guide](https://www.applause.com/blog/how-to-find-test-edge-cases/)
- [Boundary Value Analysis](https://testsigma.com/blog/edge-case-testing/)
- [The Testing Mindset](https://testuff.com/the-testing-mindset-more-than-just-finding-bugs/)

---

**Previous:** [14-standard-library-essentials.md](14-standard-library-essentials.md) — Go Standard Library Essentials

---

<p align="center">
<b>Tests are the first users of your code.</b><br>
If tests are hard to write, your design needs work.
</p>
