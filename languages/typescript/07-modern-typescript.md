# Modern TypeScript

> Latest features from TypeScript 5.x and preview of 6.0/7.0

This guide covers TypeScript 5.x features (current stable) and previews the upcoming TypeScript 6.0/7.0 releases with the revolutionary Go-based compiler.

---

## Table of Contents

1. [TypeScript 5.0 Features](#typescript-50-features)
2. [TypeScript 5.4-5.5 Features](#typescript-54-55-features)
3. [TypeScript 5.6-5.8 Features](#typescript-56-58-features)
4. [Node.js Native TypeScript](#nodejs-native-typescript)
5. [Runtime Validation & Type Safety](#runtime-validation--type-safety)
6. [TypeScript 6.0/7.0 Preview](#typescript-6070-preview)
7. [Migration Guide](#migration-guide)

---

## TypeScript 5.0 Features

### Decorators (Stage 3 Standard)

TypeScript 5.0 introduced standard ECMAScript decorators.

```typescript
// Class decorator
function logged(target: typeof BaseClass, context: ClassDecoratorContext) {
    return class extends target {
        constructor(...args: any[]) {
            super(...args);
            console.log(`Created ${context.name}`);
        }
    };
}

@logged
class User {
    constructor(public name: string) {}
}

// Method decorator
function measure(
    target: Function,
    context: ClassMethodDecoratorContext
): void {
    const methodName = String(context.name);

    function replacement(this: any, ...args: any[]) {
        const start = performance.now();
        const result = target.apply(this, args);
        const end = performance.now();
        console.log(`${methodName} took ${end - start}ms`);
        return result;
    }

    return replacement as any;
}

class Calculator {
    @measure
    compute(n: number): number {
        let result = 0;
        for (let i = 0; i < n; i++) {
            result += i;
        }
        return result;
    }
}
```

### The satisfies Operator

Validate types without widening.

```typescript
// Problem: Type annotation loses specificity
type Color = { r: number; g: number; b: number } | string;

const palette: Record<string, Color> = {
    red: { r: 255, g: 0, b: 0 },
    green: "#00ff00",
};

// palette.green.toUpperCase();  // Error: might be RGB object

// Solution: satisfies preserves specific types
const palette2 = {
    red: { r: 255, g: 0, b: 0 },
    green: "#00ff00",
} satisfies Record<string, Color>;

palette2.green.toUpperCase();  // OK! TypeScript knows it's string
palette2.red.r;                // OK! TypeScript knows it's RGB
```

### Const Type Parameters

Get literal types without `as const`.

```typescript
// Without const modifier
function getNames<T extends readonly string[]>(names: T): T {
    return names;
}
const names1 = getNames(["Alice", "Bob"]);
// Type: string[]

// With const modifier
function getNamesConst<const T extends readonly string[]>(names: T): T {
    return names;
}
const names2 = getNamesConst(["Alice", "Bob"]);
// Type: readonly ["Alice", "Bob"]

// Useful for configuration objects
function defineConfig<const T extends { routes: readonly string[] }>(
    config: T
): T {
    return config;
}

const config = defineConfig({
    routes: ["/home", "/about", "/contact"],
});
// Type: { routes: readonly ["/home", "/about", "/contact"] }
```

### Multiple Config Files (extends)

```json
// tsconfig.base.json
{
    "compilerOptions": {
        "strict": true,
        "target": "ES2022"
    }
}

// tsconfig.json
{
    "extends": ["./tsconfig.base.json", "./tsconfig.paths.json"],
    "compilerOptions": {
        "outDir": "./dist"
    }
}
```

---

## TypeScript 5.4-5.5 Features

### Improved Type Narrowing in Closures (5.4)

```typescript
function processValue(value: string | null) {
    if (value !== null) {
        // Previously, TypeScript lost narrowing in callbacks
        setTimeout(() => {
            // Now TypeScript knows value is string!
            console.log(value.toUpperCase());
        }, 100);
    }
}
```

### NoInfer Utility Type (5.4)

Prevent type inference at specific positions.

```typescript
// Without NoInfer
function createState<T>(initial: T, valid: T[]): T {
    return initial;
}
// T is inferred as string | number
createState("hello", [1, 2, 3]);  // No error, but probably wrong

// With NoInfer
function createStateSafe<T>(initial: T, valid: NoInfer<T>[]): T {
    return initial;
}
// createStateSafe("hello", [1, 2, 3]);  // Error! number not assignable to string
```

### Inferred Type Predicates (5.5)

```typescript
const nums = [1, 2, null, 3, undefined, 4];

// Before 5.5: filtered is (number | null | undefined)[]
// After 5.5: filtered is number[]
const filtered = nums.filter(x => x !== null && x !== undefined);

// TypeScript now infers type predicates automatically
function isString(x: unknown) {
    return typeof x === "string";
}
// Inferred as: function isString(x: unknown): x is string
```

### Regular Expression Syntax Checking (5.5)

```typescript
// TypeScript now validates regex syntax
const good = /hello/;
const withFlags = /hello/gi;

// Error: Invalid regular expression
// const bad = /hello(/;
```

---

## TypeScript 5.6-5.8 Features

### Iterator Helper Methods (5.6)

```typescript
// New iterator methods on generators and iterators
function* numbers() {
    yield 1;
    yield 2;
    yield 3;
}

// map, filter, take, drop, etc.
const doubled = numbers()
    .map(x => x * 2)
    .toArray();  // [2, 4, 6]

const filtered = numbers()
    .filter(x => x > 1)
    .toArray();  // [2, 3]

const taken = numbers()
    .take(2)
    .toArray();  // [1, 2]
```

### Disallowed Nullish and Truthy Checks (5.6)

```typescript
// TypeScript now warns about always-truthy/falsy checks
function process(value: string) {
    // Error: This condition will always return true
    // since typeof string is always truthy
    if (value) {
        // ...
    }
}

// Error: This expression is always nullish
const x = null;
if (x ?? true) {
    // ...
}
```

### noUncheckedSideEffectImports (5.6)

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "noUncheckedSideEffectImports": true
    }
}

// Now TypeScript errors on unresolved side-effect imports
import "./styles.css";       // Error if file doesn't exist
import "nonexistent-module"; // Error if module not found
```

### Improved Error Messages (5.7)

```typescript
// TypeScript 5.7 provides more helpful error messages
interface User {
    name: string;
    age: number;
}

const user: User = {
    name: "Alice",
    agee: 30,  // Error: Did you mean 'age'?
};
```

### rewriteRelativeImportExtensions (5.7)

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "rewriteRelativeImportExtensions": true
    }
}

// In source code
import { helper } from "./utils.ts";

// Compiled output automatically becomes
import { helper } from "./utils.js";
```

### V8 Compile Caching (5.7)

```typescript
// Node.js 22+ with TypeScript 5.7
// Automatically benefits from V8 compile caching
// No code changes needed - just faster cold starts
```

### Checked Indexed Access (5.8)

```typescript
interface Data {
    items: string[];
}

const data: Data = { items: ["a", "b", "c"] };

// TypeScript 5.8 with noUncheckedIndexedAccess
// data.items[0] is string | undefined, not just string
const first = data.items[0];  // string | undefined

// Must handle undefined
if (first !== undefined) {
    console.log(first.toUpperCase());
}
```

---

## Node.js Native TypeScript

### Running TypeScript Directly (Node.js 22+)

```bash
# Node.js 22.6.0+ with experimental flag
node --experimental-strip-types script.ts

# Node.js 22.18.0+ (July 2025) - stable, no flag needed
node script.ts
```

### How It Works

```typescript
// Node strips types at runtime - no transpilation needed
function greet(name: string): string {
    return `Hello, ${name}!`;
}

console.log(greet("World"));

// Limitations:
// - Enums must be const enums
// - Namespaces not supported
// - Some advanced type-only syntax may not work
```

### Using tsx (Recommended for Development)

```bash
# Install tsx
npm install -g tsx

# Run TypeScript directly
tsx script.ts

# Watch mode
tsx watch script.ts
```

### Bun Runtime

```bash
# Bun has native TypeScript support
bun run script.ts

# Install and run
bun install
bun run start
```

---

## Runtime Validation & Type Safety

TypeScript types are erased at runtime. For external data (API responses, user input, config files), you need runtime validation to bridge compile-time and runtime type safety.

### Zod: Schema-First Validation

Zod lets you define schemas that generate both runtime validators and static types.

```typescript
import { z } from "zod";

// Define schema - single source of truth
const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(2).max(100),
    age: z.number().int().positive().optional(),
    role: z.enum(["admin", "user", "guest"]),
    metadata: z.record(z.unknown()).optional(),
});

// Derive TypeScript type from schema
type User = z.infer<typeof UserSchema>;
// { id: string; email: string; name: string; age?: number; role: "admin" | "user" | "guest"; ... }
```

### parse() vs safeParse()

```typescript
// parse() - throws on invalid data
function fetchUserStrict(data: unknown): User {
    return UserSchema.parse(data);  // Throws ZodError if invalid
}

// safeParse() - returns result object
async function fetchUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    const data: unknown = await response.json();

    const result = UserSchema.safeParse(data);
    if (!result.success) {
        console.error("Validation failed:", result.error.format());
        throw new Error(`Invalid user data: ${result.error.message}`);
    }
    return result.data;  // Fully typed as User
}
```

**When to use which:**
- `parse()`: High confidence in data structure, want early failure
- `safeParse()`: External/untrusted data, need graceful error handling

### Schema Composition

```typescript
// Reuse and transform schemas
const CreateUserSchema = UserSchema.omit({ id: true });
const UpdateUserSchema = UserSchema.partial().required({ id: true });
const PublicUserSchema = UserSchema.pick({ id: true, name: true });

// Extend schemas
const AdminSchema = UserSchema.extend({
    permissions: z.array(z.string()),
    department: z.string(),
});

// Transform data during validation
const DateSchema = z.string().transform((str) => new Date(str));
```

### Config File Validation

```typescript
const ConfigSchema = z.object({
    apiUrl: z.string().url(),
    timeout: z.number().positive().default(5000),
    features: z.object({
        darkMode: z.boolean(),
        analytics: z.boolean(),
    }),
    retries: z.number().int().min(0).max(10).default(3),
});

type Config = z.infer<typeof ConfigSchema>;

function loadConfig(path: string): Config {
    const raw = JSON.parse(fs.readFileSync(path, "utf-8"));
    return ConfigSchema.parse(raw);  // Throws detailed errors if invalid
}
```

### ArkType: High-Performance Alternative

ArkType offers TypeScript-native syntax with ~100x better performance than Zod.

```typescript
import { type } from "arktype";

// Syntax mirrors TypeScript
const User = type({
    id: "string",
    name: "string",
    age: "number >= 0",        // Inline constraints
    email: "email",            // Built-in validators
    role: "'admin' | 'user'",  // Literal unions
});

type User = typeof User.infer;

// Validation
const result = User({ id: "1", name: "Alice", age: 30, email: "alice@example.com" });
if (result instanceof type.errors) {
    console.log(result.summary);
} else {
    console.log(result.name);  // Fully typed
}
```

### Choosing a Validation Library

| Feature | Zod | ArkType |
|---------|-----|---------|
| Performance | ~281ns | ~14ns (100x faster) |
| Ecosystem | Mature, widely adopted | Growing |
| Syntax | Method chaining | TypeScript-native |
| Transformations | Excellent | Good |
| Cyclic types | Manual workaround | Native support |
| Bundle size | Small | Larger runtime |

**Recommendations:**
- **Zod**: General use, transformations, mature ecosystem
- **ArkType**: Performance-critical paths, complex type inference

### Best Practices

1. **Validate at trust boundaries** - API responses, user input, config files
2. **Use `z.infer`** - Don't duplicate type definitions
3. **Fail fast** - Validate early in request lifecycle
4. **Cache schemas** - Define once, reuse everywhere
5. **Share schemas** - Same validation on client and server

---

## TypeScript 6.0/7.0 Preview

### Project Corsa: The Go-Based Compiler

TypeScript 7.0 (targeting mid-2026) introduces a complete rewrite of the compiler in Go, codenamed "Project Corsa."

**Performance Improvements:**
- ~10x faster full builds
- Near-instant incremental builds
- Multi-threaded compilation
- Dramatically improved editor responsiveness

**Benchmark Examples:**
| Codebase | TypeScript 5.x | TypeScript 7.0 |
|----------|----------------|----------------|
| VS Code | 77.8s | 7.5s |
| Playwright | 11.1s | 1.1s |
| TypeORM | 17.5s | 1.3s |

### TypeScript 6.0: The Bridge Release

TypeScript 6.0 serves as a transition between 5.x and 7.0:

```typescript
// Deprecation warnings for features removed in 7.0
// - ES5 target
// - AMD/UMD/SystemJS module formats
// - Classic Node module resolution
```

### Breaking Changes in 7.0

1. **Strict by Default**
```json
// tsconfig.json - strict is now default
{
    "compilerOptions": {
        // "strict": true is implied
    }
}
```

2. **ES5 Target Removed**
```json
// These will error in TS 7.0
{
    "compilerOptions": {
        "target": "ES5"  // Error: Use ES2015 or later
    }
}
```

3. **Module Formats Removed**
```json
// These will error in TS 7.0
{
    "compilerOptions": {
        "module": "AMD"     // Error: Use ES modules
        // "module": "UMD"   // Error
        // "module": "System" // Error
    }
}
```

4. **Classic Module Resolution Removed**
```json
// This will error in TS 7.0
{
    "compilerOptions": {
        "moduleResolution": "classic"  // Error: Use Node16 or Bundler
    }
}
```

### Preparing for TypeScript 7.0

```json
// Recommended tsconfig.json for future compatibility
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "isolatedModules": true,
        "verbatimModuleSyntax": true
    }
}
```

---

## Migration Guide

### Upgrading to TypeScript 5.x

```bash
# Update TypeScript
npm install typescript@latest

# Check for issues
npx tsc --noEmit

# Common fixes:
# 1. Update decorator syntax for new standard
# 2. Review type inference changes
# 3. Fix new strict checks
```

### Preparing for 6.0/7.0

1. **Use Modern Module Settings**
```json
{
    "compilerOptions": {
        "module": "NodeNext",
        "moduleResolution": "NodeNext"
    }
}
```

2. **Avoid Deprecated Features**
```typescript
// Avoid namespaces (use modules)
// namespace Utils { ... }  // Avoid
export function util() { ... }  // Prefer

// Use const enums or string unions
const enum Status { Active, Inactive }  // OK
type Status = "active" | "inactive";    // Also OK
```

3. **Enable Strict Mode Now**
```json
{
    "compilerOptions": {
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "exactOptionalPropertyTypes": true
    }
}
```

4. **Use verbatimModuleSyntax**
```json
{
    "compilerOptions": {
        "verbatimModuleSyntax": true
    }
}
```

```typescript
// With verbatimModuleSyntax
import type { User } from "./types";    // Type-only (removed)
import { User } from "./types";          // Value import (kept)
```

### Feature Detection

```typescript
// Check TypeScript version at compile time
// Note: This is a build-time check, not runtime

// In package.json
{
    "devDependencies": {
        "typescript": "^5.8.0"
    },
    "engines": {
        "node": ">=22.0.0"
    }
}
```

---

## Quick Reference

### New Operators & Syntax (5.0+)

| Feature | Syntax | Version |
|---------|--------|---------|
| satisfies | `x satisfies Type` | 5.0 |
| const type param | `<const T>` | 5.0 |
| Decorators | `@decorator` | 5.0 |
| NoInfer | `NoInfer<T>` | 5.4 |

### Compiler Options (New/Updated)

| Option | Purpose | Version |
|--------|---------|---------|
| `verbatimModuleSyntax` | Strict import/export types | 5.0 |
| `noUncheckedSideEffectImports` | Check side-effect imports | 5.6 |
| `rewriteRelativeImportExtensions` | Auto-rewrite .ts → .js | 5.7 |
| `noUncheckedIndexedAccess` | Stricter array access | 4.1+ |

### Recommended tsconfig.json (2026)

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "compilerOptions": {
        "target": "ES2023",
        "lib": ["ES2023"],
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "exactOptionalPropertyTypes": true,
        "noImplicitOverride": true,
        "noPropertyAccessFromIndexSignature": true,
        "noFallthroughCasesInSwitch": true,
        "isolatedModules": true,
        "verbatimModuleSyntax": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true
    }
}
```
