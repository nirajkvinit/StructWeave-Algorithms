# TypeScript Tooling & Testing

> Modern development workflow for TypeScript projects

---

## Table of Contents

1. [Runtime & Build Tools](#runtime--build-tools)
2. [TypeScript Configuration](#typescript-configuration)
3. [Linting & Formatting](#linting--formatting)
4. [Testing with Vitest](#testing-with-vitest)
5. [Debugging](#debugging)
6. [Development Workflow](#development-workflow)
7. [Quick Reference](#quick-reference)

---

## Runtime & Build Tools

### Node.js (22+)

Node.js 22+ supports running TypeScript directly.

```bash
# Check Node version
node --version  # v22.x.x or higher

# Run TypeScript directly (Node 22.18.0+)
node script.ts

# With experimental flag (Node 22.6.0+)
node --experimental-strip-types script.ts
```

### Bun

Fast all-in-one JavaScript runtime with native TypeScript support.

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Run TypeScript
bun run script.ts

# Install dependencies (faster than npm)
bun install

# Run package.json scripts
bun run dev

# Bundle TypeScript
bun build ./src/index.ts --outdir ./dist
```

### tsx

TypeScript execution for Node.js without configuration.

```bash
# Install globally
npm install -g tsx

# Run TypeScript files
tsx script.ts

# Watch mode
tsx watch script.ts

# With node options
tsx --inspect script.ts
```

### esbuild

Ultra-fast TypeScript/JavaScript bundler.

```bash
# Install
npm install esbuild

# Bundle
npx esbuild src/index.ts --bundle --outfile=dist/bundle.js

# Minify for production
npx esbuild src/index.ts --bundle --minify --outfile=dist/bundle.min.js

# Watch mode
npx esbuild src/index.ts --bundle --watch --outfile=dist/bundle.js
```

### SWC

Rust-based TypeScript/JavaScript compiler.

```bash
# Install
npm install @swc/core @swc/cli

# Compile TypeScript
npx swc src -d dist

# With configuration
# Create .swcrc file
```

---

## TypeScript Configuration

### Essential tsconfig.json

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "compilerOptions": {
        // Language & Environment
        "target": "ES2022",
        "lib": ["ES2022"],

        // Modules
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "resolveJsonModule": true,

        // Strictness (highly recommended)
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,

        // Interop
        "esModuleInterop": true,
        "isolatedModules": true,
        "verbatimModuleSyntax": true,

        // Output
        "outDir": "./dist",
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,

        // Performance
        "skipLibCheck": true,
        "incremental": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

### Common Configurations

#### Library/Package

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "declaration": true,
        "declarationMap": true,
        "outDir": "./dist",
        "strict": true
    },
    "include": ["src/**/*"]
}
```

#### Web Application (with Bundler)

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "jsx": "react-jsx",
        "strict": true,
        "noEmit": true
    },
    "include": ["src/**/*"]
}
```

#### Node.js Application

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "outDir": "./dist",
        "strict": true,
        "esModuleInterop": true
    },
    "include": ["src/**/*"]
}
```

### Path Aliases

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"],
            "@components/*": ["src/components/*"],
            "@utils/*": ["src/utils/*"]
        }
    }
}
```

---

## Linting & Formatting

### ESLint with TypeScript

```bash
# Install
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Or with the new flat config
npm install -D eslint typescript-eslint
```

#### eslint.config.js (Flat Config)

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
            }],
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    }
);
```

### Biome (Recommended)

Fast, all-in-one linter and formatter.

```bash
# Install
npm install -D @biomejs/biome

# Initialize
npx biome init

# Format
npx biome format --write .

# Lint
npx biome lint .

# Check (format + lint)
npx biome check --write .
```

#### biome.json

```json
{
    "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
    "organizeImports": {
        "enabled": true
    },
    "formatter": {
        "enabled": true,
        "indentStyle": "space",
        "indentWidth": 4
    },
    "linter": {
        "enabled": true,
        "rules": {
            "recommended": true
        }
    },
    "javascript": {
        "formatter": {
            "quoteStyle": "double",
            "semicolons": "always"
        }
    }
}
```

### Prettier (Alternative)

```bash
# Install
npm install -D prettier

# Create .prettierrc
```

```json
{
    "semi": true,
    "singleQuote": false,
    "tabWidth": 4,
    "trailingComma": "es5"
}
```

---

## Testing with Vitest

### Setup

```bash
# Install
npm install -D vitest

# For coverage
npm install -D @vitest/coverage-v8
```

#### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
        },
        include: ["**/*.test.ts", "**/*.spec.ts"],
    },
});
```

### Writing Tests

```typescript
// sum.ts
export function sum(a: number, b: number): number {
    return a + b;
}

// sum.test.ts
import { describe, it, expect } from "vitest";
import { sum } from "./sum";

describe("sum", () => {
    it("adds two positive numbers", () => {
        expect(sum(1, 2)).toBe(3);
    });

    it("handles negative numbers", () => {
        expect(sum(-1, 1)).toBe(0);
    });

    it("handles zero", () => {
        expect(sum(0, 0)).toBe(0);
    });
});
```

### Testing Patterns

#### Testing Async Code

```typescript
import { describe, it, expect, vi } from "vitest";

async function fetchUser(id: number): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
}

describe("fetchUser", () => {
    it("fetches user by id", async () => {
        // Mock fetch
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ id: 1, name: "Alice" }),
        });

        const user = await fetchUser(1);

        expect(user.name).toBe("Alice");
        expect(fetch).toHaveBeenCalledWith("/api/users/1");
    });
});
```

#### Testing with Mocks

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Module to mock
import * as db from "./database";

vi.mock("./database");

describe("UserService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates user in database", async () => {
        vi.mocked(db.save).mockResolvedValue({ id: 1, name: "Alice" });

        const result = await createUser("Alice");

        expect(db.save).toHaveBeenCalledWith({ name: "Alice" });
        expect(result.id).toBe(1);
    });
});
```

#### Testing Error Cases

```typescript
describe("divide", () => {
    it("throws on division by zero", () => {
        expect(() => divide(10, 0)).toThrow("Division by zero");
    });

    it("throws async error", async () => {
        await expect(asyncDivide(10, 0)).rejects.toThrow("Division by zero");
    });
});
```

### Running Tests

```bash
# Run all tests
npx vitest

# Run once (CI mode)
npx vitest run

# Watch mode
npx vitest --watch

# With coverage
npx vitest run --coverage

# Run specific file
npx vitest run sum.test.ts

# Run tests matching pattern
npx vitest run -t "should add"
```

### package.json Scripts

```json
{
    "scripts": {
        "test": "vitest",
        "test:run": "vitest run",
        "test:coverage": "vitest run --coverage",
        "test:ui": "vitest --ui"
    }
}
```

---

## Debugging

### VS Code Configuration

#### launch.json

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug TypeScript",
            "type": "node",
            "request": "launch",
            "runtimeExecutable": "tsx",
            "args": ["${file}"],
            "cwd": "${workspaceFolder}",
            "console": "integratedTerminal"
        },
        {
            "name": "Debug Tests",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
            "args": ["run", "--reporter=verbose"],
            "cwd": "${workspaceFolder}",
            "console": "integratedTerminal"
        }
    ]
}
```

### Console Debugging

```typescript
// Basic logging
console.log("Value:", value);
console.dir(object, { depth: null });

// Group related logs
console.group("Processing");
console.log("Step 1");
console.log("Step 2");
console.groupEnd();

// Time measurement
console.time("operation");
// ... code
console.timeEnd("operation");  // operation: 123.456ms

// Table for arrays/objects
console.table([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
]);

// Assertions
console.assert(condition, "Condition failed!");

// Stack trace
console.trace("How did we get here?");
```

### Node.js Inspector

```bash
# Start with inspector
node --inspect-brk script.ts

# Or with tsx
tsx --inspect script.ts

# Then open Chrome at chrome://inspect
```

---

## Development Workflow

### Project Setup Script

```bash
#!/bin/bash
# setup-project.sh

mkdir my-project && cd my-project

# Initialize
npm init -y

# Install dependencies
npm install -D typescript tsx vitest @biomejs/biome

# Create tsconfig
npx tsc --init

# Create biome config
npx biome init

# Create directories
mkdir src tests

# Create initial files
echo 'export function main() { console.log("Hello!"); }' > src/index.ts
echo 'import { describe, it, expect } from "vitest";' > tests/example.test.ts
```

### package.json Template

```json
{
    "name": "my-project",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "tsx watch src/index.ts",
        "build": "tsc",
        "start": "node dist/index.js",
        "test": "vitest",
        "test:run": "vitest run",
        "lint": "biome check .",
        "format": "biome format --write .",
        "typecheck": "tsc --noEmit"
    },
    "devDependencies": {
        "@biomejs/biome": "^1.9.0",
        "tsx": "^4.19.0",
        "typescript": "^5.8.0",
        "vitest": "^2.1.0"
    }
}
```

### Git Hooks with Husky

```bash
# Install
npm install -D husky lint-staged

# Initialize
npx husky init
```

#### .husky/pre-commit

```bash
#!/bin/sh
npx lint-staged
```

#### package.json

```json
{
    "lint-staged": {
        "*.{ts,tsx}": [
            "biome check --write",
            "vitest related --run"
        ]
    }
}
```

### CI/CD (GitHub Actions)

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
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:run
```

---

## Quick Reference

### Essential Commands

| Task | Command |
|------|---------|
| Run TypeScript | `tsx script.ts` |
| Type check | `tsc --noEmit` |
| Build | `tsc` |
| Test | `vitest run` |
| Test (watch) | `vitest` |
| Lint | `biome check .` |
| Format | `biome format --write .` |
| Coverage | `vitest run --coverage` |

### Tool Comparison

| Tool | Speed | Features | Use Case |
|------|-------|----------|----------|
| **tsx** | Fast | Execution only | Development |
| **tsc** | Moderate | Full type checking | Build/CI |
| **esbuild** | Very fast | Bundle/minify | Production builds |
| **swc** | Very fast | Compile/bundle | Large projects |
| **Bun** | Very fast | All-in-one | Full workflow |

### Testing Cheatsheet

```typescript
// Assertions
expect(value).toBe(expected);          // Strict equality
expect(value).toEqual(expected);       // Deep equality
expect(value).toBeTruthy();            // Truthy
expect(value).toBeFalsy();             // Falsy
expect(value).toBeNull();              // null
expect(value).toBeUndefined();         // undefined
expect(value).toBeDefined();           // Not undefined
expect(value).toContain(item);         // Array/string contains
expect(value).toHaveLength(n);         // Length check
expect(value).toMatch(/regex/);        // Regex match
expect(fn).toThrow();                  // Throws error
expect(fn).toThrow("message");         // Throws specific error

// Async
await expect(promise).resolves.toBe(x);
await expect(promise).rejects.toThrow();

// Mocks
const fn = vi.fn();                    // Create mock function
vi.mock("./module");                   // Mock module
vi.spyOn(obj, "method");               // Spy on method
fn.mockReturnValue(x);                 // Set return value
fn.mockResolvedValue(x);               // Set async return
expect(fn).toHaveBeenCalled();         // Was called
expect(fn).toHaveBeenCalledWith(x);    // Called with args
expect(fn).toHaveBeenCalledTimes(n);   // Call count
```

### VS Code Extensions

| Extension | Purpose |
|-----------|---------|
| **TypeScript Vue Plugin** | Vue support |
| **Biome** | Linting/formatting |
| **Error Lens** | Inline errors |
| **Pretty TypeScript Errors** | Readable errors |
| **Vitest** | Test runner UI |

### Node.js TypeScript Support

| Node.js Version | TypeScript Support |
|-----------------|-------------------|
| 22.6.0+ | `--experimental-strip-types` |
| 22.18.0+ | Native (no flag) |
| 23.x+ | Native |
