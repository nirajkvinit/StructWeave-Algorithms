# Language-Specific Programming Guides

> Master algorithms in your preferred language with comprehensive, 80/20-focused guides

This directory contains complete learning paths for **Python**, **Go**, **TypeScript**, and **Rust**. Each guide is designed for developers who want to learn a language quickly, retain knowledge effectively, and prepare for coding interviews.

---

## Choose Your Language

```
Already know Python?        → Dive into python/ for interview prep
Systems programming?        → rust/ for memory safety and performance
Backend/cloud services?     → golang/ for concurrency patterns
Frontend/full-stack?        → typescript/ for type system mastery
Learning your first?        → python/ is the most beginner-friendly
```

---

## Quick Comparison

| Aspect | Python | Go | TypeScript | Rust |
|--------|--------|-----|------------|------|
| **Learning Curve** | Gentle | Moderate | Moderate | Steep |
| **Interview Popularity** | Very High | High | High | Growing |
| **Key Strength** | Readability, rich stdlib | Concurrency, simplicity | Type safety, JS ecosystem | Memory safety, performance |
| **Guides** | 15 | 13 | 14 | 16 |
| **Duration** | 5 weeks | 5 weeks | 6 weeks | 5-6 weeks |
| **Unique Topics** | System design, async | Generics, goroutines | Type system mastery | Ownership, macros, FFI, WASM |

---

## At a Glance

### [Python](python/README.md)

**Best for:** Interviews, rapid prototyping, data science backgrounds

| Prerequisite | Python 3.10+ (3.14+ recommended) |
|--------------|----------------------------------|
| Duration | 5 weeks |
| Guides | 15 files |

**Highlights:**

- Clean syntax lets you focus on algorithms
- Rich standard library (`collections`, `itertools`, `heapq`)
- Most widely accepted in interviews
- Includes system design guide (WSGI/ASGI, FastAPI, Celery)

**Start with:** [01-syntax-quick-reference.md](python/01-syntax-quick-reference.md)

---

### [Go (Golang)](golang/README.md)

**Best for:** Backend engineers, cloud/infrastructure roles, concurrency-heavy problems

| Prerequisite | Go 1.21+ (1.25+ recommended) |
|--------------|------------------------------|
| Duration | 5 weeks |
| Guides | 13 files |

**Highlights:**

- First-class concurrency with goroutines and channels
- Generics with `slices`, `maps`, `cmp` packages
- Simple language spec (~50 keywords)
- Clean/Hexagonal architecture patterns

**Start with:** [01-syntax-quick-reference.md](golang/01-syntax-quick-reference.md)

---

### [TypeScript](typescript/README.md)

**Best for:** Frontend developers, full-stack roles, JavaScript ecosystem

| Prerequisite | Node.js 22+ (TypeScript 5.8+ recommended) |
|--------------|-------------------------------------------|
| Duration | 6 weeks |
| Guides | 14 files |

**Highlights:**

- Type safety catches errors at compile time
- Dedicated type system mastery guide
- Modern tooling (Bun, Vitest, ESLint)
- All JavaScript knowledge transfers directly

**Start with:** [01-syntax-quick-reference.md](typescript/01-syntax-quick-reference.md)

---

### [Rust](rust/README.md)

**Best for:** Systems programming, performance-critical code, memory safety

| Prerequisite | Rust 1.85+ (Rust 2024 Edition) |
|--------------|--------------------------------|
| Duration | 5-6 weeks |
| Guides | 16 files |

**Highlights:**

- Ownership system guarantees memory safety without GC
- Powerful pattern matching with exhaustive `match`
- Advanced topics: macros, unsafe FFI, WebAssembly
- Zero-cost abstractions for performance

**Start with:** [01-syntax-quick-reference.md](rust/01-syntax-quick-reference.md)

---

## Common Structure

Every language guide follows the same proven structure:

### Core Topics (Weeks 1-4)

| Topic | Description |
|-------|-------------|
| **Syntax Quick Reference** | Essential syntax, types, control flow |
| **Data Structures** | Language-specific collections and custom types |
| **Interview Patterns** | 17 algorithm patterns with idiomatic implementations |
| **Idioms & Best Practices** | Language-specific conventions and tooling |
| **Concurrency/Async** | Parallel and asynchronous programming |
| **Tooling & Testing** | Development workflow, testing frameworks |

### Advanced Topics (Week 5+)

| Topic | Description |
|-------|-------------|
| **SOLID Principles** | Object-oriented design adapted per language |
| **Design Patterns** | Creational, structural, and behavioral patterns |
| **Anti-Patterns** | Common mistakes and how to avoid them |
| **Interview Trap Questions** | Gotchas and deep knowledge tests |

### Language-Specific Extras

| Python | Go | TypeScript | Rust |
|--------|-----|------------|------|
| Standard Library Mastery | Generics Deep Dive | Type System Mastery | Ownership & Borrowing |
| System Design | System Design | Utility Types | Macros |
| Type Hints | - | - | Unsafe FFI |
| - | - | - | WebAssembly |

---

## The 80/20 Philosophy

Each guide follows the **80/20 principle**:

> Master the 20% of concepts that solve 80% of problems

This means:

- **Focus on essentials** — Skip rarely-used features
- **Practical examples** — Every concept tied to interview problems
- **Spaced repetition** — Built-in review schedules for retention
- **Pattern recognition** — Learn to identify which tool fits which problem

---

## How to Use These Guides

### For Interview Prep (Recommended Path)

1. **Choose your language** based on target role and familiarity
2. **Follow the week-by-week plan** in the language README
3. **Practice problems** from `../problems/` using your chosen language
4. **Review trap questions** before interviews

### For Language Learning

1. **Start with syntax** (File 01)
2. **Build data structure fluency** (File 02-03)
3. **Learn idiomatic patterns** (File 04-05)
4. **Practice, practice, practice** with StructWeave problems

### For Quick Reference

- Use **syntax quick reference** during timed practice
- Reference **interview patterns** when stuck on a problem type
- Check **trap questions** for edge cases you might miss

---

## Total Content

| Metric | Value |
|--------|-------|
| **Languages** | 4 |
| **Total Guides** | 58 |
| **Combined Learning Time** | 21-23 weeks |

---

## Integration with StructWeave

These language guides complement the main StructWeave content:

```
StructWeave/
├── problems/           ← Practice problems (use any language)
├── strategies/         ← Language-agnostic patterns and concepts
└── languages/          ← YOU ARE HERE: Language-specific implementations
    ├── python/
    ├── golang/
    ├── typescript/
    └── rust/
```

**Workflow:**

1. Learn a pattern from `strategies/patterns/`
2. Study the language-specific implementation in `languages/<your-lang>/04-interview-patterns.md`
3. Practice with problems from `problems/`
4. Review with spaced repetition

---

## Contributing

Want to improve these guides? See [CONTRIBUTING.md](../CONTRIBUTING.md).

**Ways to help:**

- Add language-specific tips and gotchas
- Improve code examples with idiomatic alternatives
- Add more interview trap questions
- Fix typos and clarify explanations
