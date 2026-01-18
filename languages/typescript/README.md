# TypeScript Programming Guide

> **The 80/20 Guide**: Master the 20% of TypeScript that solves 80% of problems

This guide is designed for developers who want to learn TypeScript quickly, retain knowledge effectively, and prepare for coding interviews. It follows the 80/20 principle—focusing on the essential concepts that give you maximum leverage.

---

## Prerequisites

- **Node.js 22+** required (native TypeScript support available)
- **TypeScript 5.8+** recommended (current stable as of January 2026)
- `node` and `npm` installed (or `bun` for modern development)
- Basic JavaScript knowledge

---

## Why TypeScript for Interviews?

| Advantage | Details |
|-----------|---------|
| **Type Safety** | Catch errors at compile time, demonstrate attention to detail |
| **IntelliSense** | Better autocomplete helps during timed problems |
| **Readable Code** | Types serve as documentation, interviewers understand intent |
| **Industry Standard** | Most companies use TypeScript; shows production readiness |
| **JavaScript Superset** | All JS knowledge transfers; easy onboarding |
| **Modern Features** | Generics, utility types, and type inference are powerful tools |

---

## Learning Path (6-Week Plan)

```
Week 1: Foundations
├── Day 1-2: Syntax & Types (01-syntax-quick-reference.md)
├── Day 3-4: Data Structures (02-data-structures.md)
└── Day 5-7: Practice easy problems in TypeScript

Week 2: Type System Mastery
├── Day 1-2: Type System Deep Dive (03-type-system-mastery.md)
├── Day 3-4: Interview Patterns Part 1 (04-interview-patterns.md)
└── Day 5-7: Practice medium problems

Week 3: Patterns & Advanced Types
├── Day 1-2: Interview Patterns Part 2 (04-interview-patterns.md)
├── Day 3-4: Utility Types & Generics (05-utility-types-generics.md)
└── Day 5-7: Practice hard problems

Week 4: Advanced TypeScript
├── Day 1: Async Patterns (06-async-patterns.md)
├── Day 2: Modern TypeScript (07-modern-typescript.md)
├── Day 3: Tooling & Testing (08-tooling-testing.md)
├── Day 4-5: Timed problem solving
└── Day 6-7: Review and consolidate

Week 5: Design Principles & Patterns
├── Day 1: SOLID Principles (09-solid-principles.md)
├── Day 2-3: Creational & Structural Patterns (10, 11)
├── Day 4-5: Behavioral Patterns (12-design-patterns-behavioral.md)
└── Day 6-7: Practice applying patterns

Week 6: Best Practices & Interview Prep
├── Day 1-2: Anti-Patterns & Best Practices (13-anti-patterns-best-practices.md)
├── Day 3-4: Interview Trap Questions (14-interview-trap-questions.md)
├── Day 5: Timed problem solving
└── Day 6-7: Mock interviews with trap questions
```

---

## Guide Contents

| File | Focus | Time |
|------|-------|------|
| [01-syntax-quick-reference.md](01-syntax-quick-reference.md) | Essential syntax, types, modern features | 45 min |
| [02-data-structures.md](02-data-structures.md) | Arrays, Maps, Sets, typed collections | 60 min |
| [03-type-system-mastery.md](03-type-system-mastery.md) | Type narrowing, generics, conditional types | 75 min |
| [04-interview-patterns.md](04-interview-patterns.md) | 17 algorithm patterns in idiomatic TypeScript | 120 min |
| [05-utility-types-generics.md](05-utility-types-generics.md) | Built-in utility types, generic patterns | 45 min |
| [06-async-patterns.md](06-async-patterns.md) | Promises, async/await, concurrency | 45 min |
| [07-modern-typescript.md](07-modern-typescript.md) | TS 5.x features, Node.js native support | 30 min |
| [08-tooling-testing.md](08-tooling-testing.md) | Bun, Vitest, ESLint, development workflow | 30 min |
| [09-solid-principles.md](09-solid-principles.md) | SOLID principles with TypeScript examples | 60 min |
| [10-design-patterns-creational.md](10-design-patterns-creational.md) | Singleton, Factory, Builder, Prototype | 45 min |
| [11-design-patterns-structural.md](11-design-patterns-structural.md) | Adapter, Decorator, Facade, Proxy, Composite | 50 min |
| [12-design-patterns-behavioral.md](12-design-patterns-behavioral.md) | Observer, Strategy, State, Command, Iterator | 60 min |
| [13-anti-patterns-best-practices.md](13-anti-patterns-best-practices.md) | Common mistakes and modern best practices | 60 min |
| [14-interview-trap-questions.md](14-interview-trap-questions.md) | Deep TypeScript gotchas and trap questions | 60 min |

---

## The 80/20 of TypeScript

### 20% of Concepts That Matter Most

1. **Type Annotations** — Explicit types: `const name: string = "hello"`
2. **Type Inference** — Let TypeScript infer: `const nums = [1, 2, 3]` is `number[]`
3. **Interfaces & Types** — Define shapes: `interface User { name: string; age: number }`
4. **Union Types** — Multiple options: `string | number | null`
5. **Generics** — Reusable types: `function first<T>(arr: T[]): T | undefined`
6. **Type Guards** — Narrow types: `if (typeof x === "string")`
7. **Map<K, V>** — O(1) lookups for complement search, counting
8. **Set<T>** — O(1) membership, deduplication
9. **Optional Chaining** — Safe access: `user?.address?.city`
10. **Nullish Coalescing** — Default values: `value ?? defaultValue`

### Essential Imports for Interviews

```typescript
// TypeScript doesn't need imports for built-in types!
// All these are available globally:

// Collections
const nums: number[] = [1, 2, 3];               // Array
const seen = new Set<number>([1, 2, 3]);        // Set
const freq = new Map<string, number>();         // Map

// Common operations
nums.length;                                     // Length
nums[nums.length - 1];                          // Last element
nums.slice().reverse();                         // Reversed copy
nums.filter((_, i) => i % 2 === 0);            // Every other element

// Map operations (O(1) for all)
freq.set("a", 1);
freq.get("a") ?? 0;                             // Get with default
freq.has("a");                                  // Check existence

// Set operations (O(1) for all)
seen.add(4);
seen.has(4);
seen.delete(4);

// Useful array methods
const squares = nums.map(x => x ** 2);
const evens = nums.filter(x => x % 2 === 0);
const sum = nums.reduce((acc, x) => acc + x, 0);
const lookup = new Map(nums.map((x, i) => [x, i]));
```

---

## Quick Start: Your First Algorithm in TypeScript

### Two Sum Implementation

```typescript
function twoSum(nums: number[], target: number): [number, number] | null {
    const seen = new Map<number, number>();

    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];

        if (seen.has(complement)) {
            return [seen.get(complement)!, i];
        }

        seen.set(nums[i], i);
    }

    return null;
}

// Example usage
const nums = [2, 7, 11, 15];
const target = 9;
const result = twoSum(nums, target);
console.log(`Indices: ${result}`);  // Indices: 0,1
```

**Key TypeScript concepts demonstrated:**
- `number[]` — Typed array parameter
- `Map<number, number>` — Typed Map for O(1) lookups
- `[number, number] | null` — Tuple return type with union
- `seen.get(complement)!` — Non-null assertion (we checked with `has`)
- Template literal — String interpolation with `${}`

---

## TypeScript vs Other Languages

| Feature | TypeScript | Python | Rust | Go |
|---------|------------|--------|------|-----|
| Array declaration | `const a: number[] = [1,2,3]` | `a = [1,2,3]` | `vec![1,2,3]` | `[]int{1,2,3}` |
| Hash map | `new Map<K,V>()` | `{}` or `dict()` | `HashMap::new()` | `make(map[K]V)` |
| For loop | `for (let i = 0; i < n; i++)` | `for i in range(n)` | `for i in 0..n` | `for i := 0; i < n; i++` |
| Iteration | `for (const x of arr)` | `for x in arr` | `for x in &arr` | `for _, x := range arr` |
| Null check | `if (x !== null)` | `if x is not None` | `if let Some(x) = opt` | `if x != nil` |
| Error handling | `try/catch` | `try/except` | `Result<T, E>` | `if err != nil` |
| Memory | Garbage collected | Garbage collected | Ownership | Garbage collected |
| Typing | Static (optional) | Dynamic (optional) | Static | Static |

---

## Interview Tips for TypeScript

### 1. Start with the Signature

```typescript
// Always clarify input/output types first
function solve(nums: number[], target: number): number[] {
    // Return indices of two numbers that sum to target
    return [];
}
```

### 2. Use TypeScript Idioms

```typescript
// Good: Map for O(1) lookups
const freq = new Map<string, number>();
freq.set(key, (freq.get(key) ?? 0) + 1);

// Good: Array destructuring
const [first, ...rest] = nums;

// Good: Optional chaining
const city = user?.address?.city ?? "Unknown";

// Good: Type guard
function isString(value: unknown): value is string {
    return typeof value === "string";
}

// Good: Tuple for returning multiple values
function minMax(nums: number[]): [number, number] {
    return [Math.min(...nums), Math.max(...nums)];
}
```

### 3. Know Your Complexities

```typescript
// O(1) - Map/Set operations
map.get(key);               // Get
map.set(key, value);        // Set
map.has(key);               // Check
set.has(value);             // Membership

// O(1) amortized - Array push
nums.push(x);

// O(n) - Array operations
nums.includes(x);           // Use Set for O(1)
nums.unshift(x);            // Insert at front
nums.indexOf(x);            // Find index

// O(n log n) - Sorting
nums.sort((a, b) => a - b); // MUST provide comparator for numbers!

// O(log n) - Binary search (manual implementation)
// TypeScript has no built-in binary search
```

### 4. Handle Edge Cases

```typescript
function solve(nums: number[]): number {
    // Always check edge cases first
    if (nums.length === 0) {
        return 0;
    }
    if (nums.length === 1) {
        return nums[0];
    }

    // Main logic...
    return result;
}
```

### 5. Leverage Type System

```typescript
// Use discriminated unions for state
type Result<T> =
    | { success: true; value: T }
    | { success: false; error: string };

// Use const assertions for literals
const directions = ["up", "down", "left", "right"] as const;
type Direction = typeof directions[number]; // "up" | "down" | "left" | "right"

// Use generics for reusable functions
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}
```

---

## Practice Problems by Pattern

Start with these problems from the main repository, implementing solutions in TypeScript:

### Foundation (Start Here)
- [E001 Two Sum](../../problems/easy/E001_two_sum.md) — Map lookup
- [E014 Valid Parentheses](../../problems/easy/E014_valid_parentheses.md) — Stack with array

### Two Pointers
- [E006 Container With Most Water](../../problems/easy/E006_container_with_most_water.md)
- Practice with sorted arrays, palindrome checking

### Sliding Window
- [M002 Longest Substring](../../problems/medium/M002_longest_substring_without_repeating.md)
- Practice with Map for character tracking

### Binary Search
- Practice implementing binary search from scratch

### Dynamic Programming
- Practice with Map-based memoization

---

## Resources

### Official Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — Comprehensive guide
- [TypeScript Playground](https://www.typescriptlang.org/play) — Interactive editor
- [What's New](https://www.typescriptlang.org/docs/handbook/release-notes/overview.html) — Release notes

### Interactive Learning
- [TypeScript Exercises](https://typescript-exercises.github.io/) — Progressive challenges
- [Exercism TypeScript Track](https://exercism.org/tracks/typescript) — Practice with mentorship
- [Type Challenges](https://github.com/type-challenges/type-challenges) — Advanced type puzzles

### Interview Preparation
- [The Algorithms - TypeScript](https://github.com/TheAlgorithms/TypeScript) — Algorithm implementations
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/) — In-depth book

---

## Essential Tools

| Category | Tool | Purpose |
|----------|------|---------|
| **Runtime** | [Node.js 22+](https://nodejs.org/) | Native TS support |
| **Runtime** | [Bun](https://bun.sh/) | Fast all-in-one toolkit |
| **Execution** | [tsx](https://github.com/privatenumber/tsx) | Run TS files directly |
| **Testing** | [Vitest](https://vitest.dev/) | Fast, native TS testing |
| **Linting** | [ESLint](https://eslint.org/) + [@typescript-eslint](https://typescript-eslint.io/) | Code quality |
| **Formatting** | [Biome](https://biomejs.dev/) | Fast linter & formatter |

---

## Spaced Repetition Schedule

Use this schedule to retain TypeScript knowledge:

| Day | Review |
|-----|--------|
| 1 | Write Two Sum from memory using Map |
| 3 | Implement stack operations, explain array vs linked structure |
| 7 | Write binary search, explain complexity |
| 14 | Implement BFS with proper typing, use Map for graph |
| 21 | Code a DP solution with Map memoization |
| 30 | Timed mock interview in TypeScript |

---

## The TypeScript Mindset

```
"TypeScript is JavaScript that scales."
— TypeScript tagline
```

TypeScript's design philosophy balances flexibility with safety:

1. **Types are documentation** — Your interviewer reads your types before your logic
2. **Inference is your friend** — Don't over-annotate; let TypeScript work for you
3. **Use strict mode** — `"strict": true` catches bugs before interviews do
4. **Maps beat objects** — `Map<K, V>` has clearer semantics and proper typing
5. **Know your utilities** — `Partial`, `Pick`, `Omit` show TypeScript mastery

---

<p align="center">
<b>TypeScript lets you think in types while writing JavaScript.</b><br>
Master the type system, and your code becomes self-documenting.
</p>
