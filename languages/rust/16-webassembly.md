# Rust and WebAssembly

> **Reading time**: 45-60 minutes | **Difficulty**: Intermediate | **Rust Edition**: 2024

Rust's first-class WebAssembly support makes it ideal for high-performance web applications, server-side WASM, and the emerging Component Model ecosystem.

---

## Table of Contents

1. [Why Rust + WebAssembly](#why-rust--webassembly)
2. [Setup and Toolchain](#setup-and-toolchain)
3. [Building Your First WASM Module](#building-your-first-wasm-module)
4. [JavaScript Integration](#javascript-integration)
5. [WASI: WebAssembly System Interface](#wasi-webassembly-system-interface)
6. [Component Model](#component-model)
7. [Browser vs Server-Side WASM](#browser-vs-server-side-wasm)
8. [Performance Considerations](#performance-considerations)
9. [Real-World Use Cases](#real-world-use-cases)
10. [Interview Relevance](#interview-relevance)
11. [Quick Reference](#quick-reference)

---

## Why Rust + WebAssembly

WebAssembly (WASM) is a binary instruction format designed for safe, fast execution in browsers and beyond. Rust is uniquely suited for WASM development.

### The Rust + WASM Advantage

```
┌─────────────────────────────────────────────────────────────────┐
│                     WHY RUST FOR WASM?                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │ No Garbage  │     │  Small      │     │  Memory     │       │
│  │ Collector   │     │  Binary     │     │  Safety     │       │
│  │             │     │  Size       │     │             │       │
│  │ WASM has no │     │ No runtime  │     │ Same safety │       │
│  │ GC support  │     │ overhead    │     │ in browser  │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │ Predictable │     │ First-Class │     │  Ecosystem  │       │
│  │ Performance │     │ Tooling     │     │  Mature     │       │
│  │             │     │             │     │             │       │
│  │ No GC pauses│     │ wasm-pack,  │     │ Years of    │       │
│  │             │     │ wasm-bindgen│     │ production  │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Comparison with Other Languages

| Language | WASM Support | Binary Size | GC Needed | Performance |
|----------|--------------|-------------|-----------|-------------|
| **Rust** | First-class | Small | No | Excellent |
| C/C++ | Good | Small | No | Excellent |
| Go | Supported | Large (~2MB min) | Yes (bundled) | Good |
| TypeScript | Via AssemblyScript | Medium | No | Good |
| Python | Experimental | Very large | Yes | Poor |

### Two Main Use Cases

1. **Browser WASM**: High-performance computation in web apps
2. **Server-side WASM**: Sandboxed, portable, secure execution

---

## Setup and Toolchain

### Installing the Tools

```bash
# 1. Add WASM target for browser use
rustup target add wasm32-unknown-unknown

# 2. Add WASI target for server-side WASM (WASI 0.2)
rustup target add wasm32-wasip2

# 3. Install wasm-pack (high-level build tool)
cargo install wasm-pack

# 4. Install wasmtime (WASI runtime) - optional for testing
curl https://wasmtime.dev/install.sh -sSf | bash
```

### WASM Targets Explained

| Target | Use Case | Features |
|--------|----------|----------|
| `wasm32-unknown-unknown` | Browser, no system access | Minimal, JS interop |
| `wasm32-wasip1` | WASI Preview 1 | Filesystem, env, args |
| `wasm32-wasip2` | WASI Preview 2 (0.2+) | Component Model, async |

### Project Setup

```bash
# Create a library crate (required for WASM)
cargo new --lib my-wasm-project
cd my-wasm-project
```

**Cargo.toml:**

```toml
[package]
name = "my-wasm-project"
version = "0.1.0"
edition = "2024"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"

[dependencies.web-sys]
version = "0.3"
features = ["console", "Window", "Document"]

[profile.release]
opt-level = "s"        # Optimize for size
lto = true             # Link-time optimization
```

---

## Building Your First WASM Module

### Hello World

**src/lib.rs:**

```rust
use wasm_bindgen::prelude::*;

// Import the JavaScript console.log function
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Export a function to JavaScript
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    log(&format!("Hello from Rust, {}!", name));
    format!("Hello, {}!", name)
}

// Export a computation function
#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => {
            let mut a = 0;
            let mut b = 1;
            for _ in 2..=n {
                let tmp = a + b;
                a = b;
                b = tmp;
            }
            b
        }
    }
}
```

### Building with wasm-pack

```bash
# Build for web bundlers (webpack, vite, etc.)
wasm-pack build --target bundler

# Build for direct browser use (no bundler)
wasm-pack build --target web

# Build for Node.js
wasm-pack build --target nodejs

# Release build with optimizations
wasm-pack build --release --target web
```

### Using in HTML/JavaScript

**index.html:**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>WASM Demo</title>
</head>
<body>
    <h1>Rust WASM Demo</h1>
    <div id="output"></div>

    <script type="module">
        import init, { greet, fibonacci } from './pkg/my_wasm_project.js';

        async function main() {
            // Initialize the WASM module
            await init();

            // Call Rust functions
            const greeting = greet("World");
            document.getElementById('output').textContent = greeting;

            // Compute Fibonacci
            console.log(`fib(10) = ${fibonacci(10)}`);  // 55
        }

        main();
    </script>
</body>
</html>
```

### Serving Locally

```bash
# Install a simple HTTP server
cargo install simple-http-server

# Serve the project
simple-http-server --cors -p 8080 .
```

---

## JavaScript Integration

### wasm-bindgen Basics

`wasm-bindgen` generates JavaScript bindings for Rust code:

```rust
use wasm_bindgen::prelude::*;

// Export a Rust struct to JavaScript
#[wasm_bindgen]
pub struct Counter {
    count: i32,
}

#[wasm_bindgen]
impl Counter {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Counter {
        Counter { count: 0 }
    }

    pub fn increment(&mut self) {
        self.count += 1;
    }

    pub fn get_count(&self) -> i32 {
        self.count
    }
}

// Usage in JavaScript:
// const counter = new Counter();
// counter.increment();
// console.log(counter.get_count());
```

### Passing Data Types

| Rust Type | JavaScript Type | Notes |
|-----------|-----------------|-------|
| `i32`, `u32`, `f64` | `number` | Direct mapping |
| `bool` | `boolean` | Direct mapping |
| `String` | `string` | Copied across boundary |
| `&str` | `string` | Copied across boundary |
| `Vec<T>` | Array | Copied, or use `js_sys::Array` |
| `JsValue` | Any JS value | General escape hatch |
| Struct with `#[wasm_bindgen]` | Class instance | Methods callable |

### Working with web-sys

`web-sys` provides Rust bindings for Web APIs:

```rust
use wasm_bindgen::prelude::*;
use web_sys::{console, window, Document, Element};

#[wasm_bindgen]
pub fn manipulate_dom() -> Result<(), JsValue> {
    // Get the window and document
    let window = window().expect("no global window");
    let document = window.document().expect("no document");

    // Create an element
    let div = document.create_element("div")?;
    div.set_inner_html("<h2>Created by Rust!</h2>");
    div.set_class_name("rust-content");

    // Append to body
    let body = document.body().expect("no body");
    body.append_child(&div)?;

    // Log to console
    console::log_1(&"DOM manipulated from Rust!".into());

    Ok(())
}
```

**Enable features in Cargo.toml:**

```toml
[dependencies.web-sys]
version = "0.3"
features = [
    "console",
    "Window",
    "Document",
    "Element",
    "HtmlElement",
    "Node",
]
```

### js-sys for JavaScript Built-ins

```rust
use wasm_bindgen::prelude::*;
use js_sys::{Array, Date, Math, Object, Reflect};

#[wasm_bindgen]
pub fn js_interop_demo() -> Array {
    // Create a JavaScript array
    let arr = Array::new();
    arr.push(&JsValue::from(1));
    arr.push(&JsValue::from(2));
    arr.push(&JsValue::from(3));

    // Use JavaScript Math
    let random = Math::random();
    arr.push(&JsValue::from(random));

    // Get current date
    let now = Date::now();
    arr.push(&JsValue::from(now));

    arr
}
```

### Async/Await in WASM

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Request, RequestInit, Response, window};

#[wasm_bindgen]
pub async fn fetch_data(url: &str) -> Result<JsValue, JsValue> {
    let window = window().expect("no window");

    // Create request
    let opts = RequestInit::new();
    opts.set_method("GET");

    let request = Request::new_with_str_and_init(url, &opts)?;

    // Fetch and await
    let response_value = JsFuture::from(window.fetch_with_request(&request)).await?;
    let response: Response = response_value.dyn_into()?;

    // Parse JSON
    let json = JsFuture::from(response.json()?).await?;

    Ok(json)
}
```

---

## WASI: WebAssembly System Interface

WASI provides a standard interface for WASM modules to access system resources outside the browser.

### WASI Capabilities

```
┌─────────────────────────────────────────────────────────────┐
│                      WASI CAPABILITIES                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Filesystem  │  │   Network    │  │    Clock     │      │
│  │              │  │  (0.2+)      │  │              │      │
│  │  Read/Write  │  │  TCP/UDP     │  │  Monotonic   │      │
│  │  files       │  │  HTTP        │  │  Wall clock  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Random     │  │    Env       │  │   Stdio      │      │
│  │              │  │  Variables   │  │              │      │
│  │  Secure RNG  │  │  Args        │  │  stdin/out   │      │
│  │              │  │              │  │  stderr      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### WASI Preview 1 (wasip1)

The original WASI specification:

```rust
// Simple WASI program
fn main() {
    // Environment and args work like normal Rust
    let args: Vec<String> = std::env::args().collect();
    println!("Arguments: {:?}", args);

    // Filesystem access (if granted by runtime)
    if let Ok(contents) = std::fs::read_to_string("input.txt") {
        println!("File contents: {}", contents);
    }

    // Write output
    std::fs::write("output.txt", "Hello from WASI!").ok();
}
```

**Build and run:**

```bash
# Build for WASI Preview 1
cargo build --target wasm32-wasip1 --release

# Run with wasmtime (granting filesystem access)
wasmtime --dir=. target/wasm32-wasip1/release/my_app.wasm -- arg1 arg2
```

### WASI Preview 2 (wasip2) — The Future

WASI 0.2+ brings the Component Model and composable interfaces:

```rust
// Using the new wit-bindgen for WASI 0.2
// Cargo.toml: wit-bindgen = "0.35"

wit_bindgen::generate!({
    world: "my-world",
    path: "wit",
});

fn main() {
    // Async I/O with the new async model
    // HTTP, filesystem, and more through WIT interfaces
}
```

**WASI 0.3 (2026) Features:**

| Feature | Description |
|---------|-------------|
| Composable Concurrency | Native async/await support |
| Simplified APIs | Fewer resource types (11 → 5 for HTTP) |
| WASIp2 Compatibility | Backwards compatible |
| First-class Streams | Better I/O handling |

### Running WASI Modules

```bash
# Wasmtime - reference implementation
wasmtime run --dir=. module.wasm

# Wasmer - alternative runtime
wasmer run --dir=. module.wasm

# WasmEdge - optimized for cloud
wasmedge --dir .:. module.wasm
```

---

## Component Model

The **Component Model** enables language-agnostic module composition and is the future of WASM.

### What is the Component Model?

```
┌─────────────────────────────────────────────────────────────────┐
│                     WASM COMPONENT MODEL                         │
│                                                                   │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │   Rust      │     │  Python     │     │    Go       │        │
│  │  Component  │────→│  Component  │────→│  Component  │        │
│  │             │     │             │     │             │        │
│  └─────────────┘     └─────────────┘     └─────────────┘        │
│         │                   │                   │                │
│         └───────────────────┴───────────────────┘                │
│                             │                                     │
│                    WIT Interface                                  │
│              (WebAssembly Interface Types)                        │
│                                                                   │
│  • Language-agnostic interfaces                                   │
│  • Rich types (strings, records, variants, lists)                │
│  • Composable modules                                            │
│  • Virtualizable resources                                       │
└─────────────────────────────────────────────────────────────────┘
```

### WIT (WebAssembly Interface Types)

WIT defines interfaces between components:

**my-api.wit:**

```wit
package my:api@1.0.0;

interface types {
    record user {
        id: u64,
        name: string,
        email: string,
    }

    variant result {
        ok(user),
        error(string),
    }
}

interface users {
    use types.{user, result};

    get-user: func(id: u64) -> result;
    create-user: func(name: string, email: string) -> result;
    list-users: func() -> list<user>;
}

world my-world {
    export users;
}
```

### Building Rust Components

```rust
// Using wit-bindgen to generate bindings
wit_bindgen::generate!({
    world: "my-world",
    path: "wit",
});

struct MyComponent;

impl Guest for MyComponent {
    fn get_user(id: u64) -> Result {
        // Implementation
        Result::Ok(User {
            id,
            name: "Alice".to_string(),
            email: "alice@example.com".to_string(),
        })
    }

    fn create_user(name: String, email: String) -> Result {
        // Implementation
        Result::Ok(User { id: 1, name, email })
    }

    fn list_users() -> Vec<User> {
        vec![]
    }
}

export!(MyComponent);
```

**Build with Component Model:**

```bash
# Build the core module
cargo build --target wasm32-wasip2 --release

# Package as a component (using wasm-tools)
wasm-tools component new target/wasm32-wasip2/release/my_component.wasm \
    -o my_component.component.wasm
```

### Composing Components

```bash
# Compose multiple components together
wasm-tools compose component_a.wasm component_b.wasm \
    -o composed.wasm
```

---

## Browser vs Server-Side WASM

### Browser Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER WASM                              │
│                                                              │
│  User's Browser                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JavaScript Engine                                   │   │
│  │  ┌──────────────┐    ┌──────────────────────────┐  │   │
│  │  │   Your JS    │←──→│    WASM Module           │  │   │
│  │  │   Code       │    │    (Rust compiled)       │  │   │
│  │  └──────────────┘    └──────────────────────────┘  │   │
│  │         │                      │                    │   │
│  │         └──────────┬───────────┘                    │   │
│  │                    ↓                                │   │
│  │              DOM / Web APIs                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Optimization for browser delivery:**

```bash
# Optimize for size
wasm-pack build --release

# Further optimization with wasm-opt (part of binaryen)
wasm-opt -Os pkg/my_module_bg.wasm -o pkg/my_module_bg.wasm
```

### Edge Computing Platforms

| Platform | Description | Runtime |
|----------|-------------|---------|
| **Cloudflare Workers** | Edge functions | V8 Isolates + WASM |
| **Fastly Compute** | Edge compute | Lucet → Wasmtime |
| **Fermyon Spin** | Microservices | Wasmtime |
| **wasmCloud** | Distributed apps | wasmtime |
| **Vercel Edge Functions** | Serverless edge | V8 |

**Example: Cloudflare Worker with Rust WASM**

```rust
use worker::*;

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let router = Router::new();

    router
        .get_async("/", |_, _| async move {
            Response::ok("Hello from Rust WASM at the edge!")
        })
        .get_async("/compute/:n", |_, ctx| async move {
            let n: u32 = ctx.param("n").unwrap().parse().unwrap();
            let result = fibonacci(n);
            Response::ok(format!("fib({}) = {}", n, result))
        })
        .run(req, env)
        .await
}

fn fibonacci(n: u32) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => {
            let mut a = 0u64;
            let mut b = 1u64;
            for _ in 2..=n {
                let tmp = a.wrapping_add(b);
                a = b;
                b = tmp;
            }
            b
        }
    }
}
```

### Embedded WASM Runtimes

Run WASM in your own applications:

```rust
use wasmtime::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create the engine and store
    let engine = Engine::default();
    let mut store = Store::new(&engine, ());

    // Compile the WASM module
    let module = Module::from_file(&engine, "path/to/module.wasm")?;

    // Create instance with imports
    let instance = Instance::new(&mut store, &module, &[])?;

    // Get and call the exported function
    let greet = instance.get_typed_func::<i32, i32>(&mut store, "fibonacci")?;
    let result = greet.call(&mut store, 10)?;

    println!("Result: {}", result);
    Ok(())
}
```

---

## Performance Considerations

### When WASM Outperforms JavaScript

| Scenario | JS Performance | WASM Performance | Winner |
|----------|---------------|------------------|--------|
| Simple DOM manipulation | Fast | Overhead from boundary | JS |
| Tight numeric loops | JIT optimized | Predictable | WASM |
| Large data processing | GC pauses | Consistent | WASM |
| Crypto operations | Slow | Near-native | WASM |
| Image/video processing | Very slow | Near-native | WASM |
| Parsing/serialization | Good with native JSON | Depends | Varies |

### Binary Size Optimization

```toml
# Cargo.toml
[profile.release]
opt-level = "z"           # Optimize for size (over speed)
lto = true                # Link-time optimization
codegen-units = 1         # Single codegen unit (slower compile, smaller binary)
panic = "abort"           # Don't include panic unwinding
strip = true              # Strip symbols
```

**Additional tools:**

```bash
# wasm-opt for further optimization
wasm-opt -Oz input.wasm -o output.wasm

# Measure size
wc -c output.wasm

# Analyze what's taking space
twiggy top output.wasm
```

### Minimizing Boundary Crossing

```rust
// BAD: Many small calls across JS-WASM boundary
#[wasm_bindgen]
pub fn process_item(item: i32) -> i32 {
    item * 2
}
// Called in a loop from JS: slow!

// GOOD: Batch processing in WASM
#[wasm_bindgen]
pub fn process_items(items: &[i32]) -> Vec<i32> {
    items.iter().map(|x| x * 2).collect()
}
// Single call, process entire array: fast!
```

### Memory Considerations

```rust
use wasm_bindgen::prelude::*;

// Allocate memory that JS can write into directly
#[wasm_bindgen]
pub fn get_buffer_ptr(size: usize) -> *mut u8 {
    let mut buffer = Vec::with_capacity(size);
    let ptr = buffer.as_mut_ptr();
    std::mem::forget(buffer);  // Don't drop, JS will manage
    ptr
}

#[wasm_bindgen]
pub fn process_buffer(ptr: *mut u8, len: usize) -> i32 {
    // SAFETY: ptr and len from get_buffer_ptr
    let slice = unsafe { std::slice::from_raw_parts(ptr, len) };
    slice.iter().map(|&b| b as i32).sum()
}
```

---

## Real-World Use Cases

### 1. Image Processing

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn apply_grayscale(data: &mut [u8]) {
    // data is RGBA pixels (4 bytes each)
    for pixel in data.chunks_exact_mut(4) {
        let gray = (pixel[0] as u32 * 299
            + pixel[1] as u32 * 587
            + pixel[2] as u32 * 114) / 1000;
        pixel[0] = gray as u8;
        pixel[1] = gray as u8;
        pixel[2] = gray as u8;
        // pixel[3] is alpha, leave unchanged
    }
}

#[wasm_bindgen]
pub fn apply_blur(data: &mut [u8], width: usize, height: usize) {
    // Box blur implementation
    let mut output = data.to_vec();

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            for c in 0..3 {
                let idx = (y * width + x) * 4 + c;
                let mut sum = 0u32;
                for dy in -1i32..=1 {
                    for dx in -1i32..=1 {
                        let ny = (y as i32 + dy) as usize;
                        let nx = (x as i32 + dx) as usize;
                        sum += data[(ny * width + nx) * 4 + c] as u32;
                    }
                }
                output[idx] = (sum / 9) as u8;
            }
        }
    }

    data.copy_from_slice(&output);
}
```

### 2. Cryptography

```rust
use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};

#[wasm_bindgen]
pub fn sha256_hash(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}

#[wasm_bindgen]
pub fn verify_password(password: &str, hash: &[u8]) -> bool {
    let computed = sha256_hash(password.as_bytes());
    computed == hash
}
```

### 3. Game Logic / Physics

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

#[wasm_bindgen]
pub struct Particle {
    pos: Vec2,
    vel: Vec2,
    mass: f32,
}

#[wasm_bindgen]
pub struct Physics {
    particles: Vec<Particle>,
    gravity: f32,
}

#[wasm_bindgen]
impl Physics {
    #[wasm_bindgen(constructor)]
    pub fn new(gravity: f32) -> Physics {
        Physics {
            particles: Vec::new(),
            gravity,
        }
    }

    pub fn add_particle(&mut self, x: f32, y: f32, mass: f32) {
        self.particles.push(Particle {
            pos: Vec2 { x, y },
            vel: Vec2 { x: 0.0, y: 0.0 },
            mass,
        });
    }

    pub fn step(&mut self, dt: f32) {
        for particle in &mut self.particles {
            // Apply gravity
            particle.vel.y += self.gravity * dt;

            // Update position
            particle.pos.x += particle.vel.x * dt;
            particle.pos.y += particle.vel.y * dt;
        }
    }

    pub fn get_positions(&self) -> Vec<f32> {
        self.particles
            .iter()
            .flat_map(|p| vec![p.pos.x, p.pos.y])
            .collect()
    }
}
```

### 4. Plugin Systems

```rust
// Host application loads WASM plugins dynamically
use wasmtime::*;

pub trait Plugin {
    fn name(&self) -> &str;
    fn process(&self, input: &[u8]) -> Vec<u8>;
}

pub struct WasmPlugin {
    store: Store<()>,
    instance: Instance,
}

impl WasmPlugin {
    pub fn load(path: &str) -> Result<Self, Error> {
        let engine = Engine::default();
        let module = Module::from_file(&engine, path)?;
        let mut store = Store::new(&engine, ());
        let instance = Instance::new(&mut store, &module, &[])?;
        Ok(WasmPlugin { store, instance })
    }
}
```

---

## Interview Relevance

### Common Interview Questions

**Q: When would you choose WASM over pure JavaScript?**

**A:** Choose WASM when:
- CPU-intensive computation (crypto, image processing, simulations)
- Porting existing C/C++/Rust codebases to web
- Consistent, predictable performance without GC pauses
- Code sharing between web and native

Don't choose WASM for:
- Simple DOM manipulation
- Light business logic
- When bundle size is critical and functionality is simple

---

**Q: What are the limitations of WASM in the browser?**

**A:**
1. No direct DOM access (must go through JavaScript)
2. Single-threaded by default (SharedArrayBuffer for threads)
3. No direct network access (must use fetch via JS)
4. Memory is a flat linear buffer
5. Garbage collection not natively supported (coming with WasmGC)

---

**Q: Explain the WASM Component Model.**

**A:** The Component Model enables:
- Language-agnostic module interfaces via WIT
- Composition of modules from different languages
- Rich types across module boundaries (strings, records, variants)
- Virtualization of system resources
- Secure capability-based access control

Key difference from core WASM: Core WASM only has i32, i64, f32, f64. Component Model adds strings, records, lists, variants, and more.

---

**Q: How would you optimize WASM bundle size?**

**A:**
1. Use `opt-level = "z"` in release profile
2. Enable LTO (`lto = true`)
3. Set `panic = "abort"` to remove unwind tables
4. Use `wasm-opt -Oz` for post-processing
5. Minimize dependencies (each dep adds size)
6. Use `#[wasm_bindgen(skip)]` for unused exports
7. Consider `wee_alloc` for smaller allocator

---

### System Design with WASM

**When to suggest WASM in system design:**

| Scenario | Recommendation |
|----------|----------------|
| Edge computing with custom logic | WASM + Cloudflare/Fastly |
| Browser-based document editor | WASM for formatting/parsing |
| Real-time collaborative canvas | WASM for rendering/physics |
| Client-side video transcoding | WASM essential |
| Plugin system for desktop app | WASM for sandboxing |
| Microservices with language variety | WASM Component Model |

---

## Quick Reference

### Essential Commands

```bash
# Add targets
rustup target add wasm32-unknown-unknown
rustup target add wasm32-wasip2

# Build for browser
wasm-pack build --target web --release

# Build for WASI
cargo build --target wasm32-wasip2 --release

# Run WASI module
wasmtime run module.wasm

# Optimize size
wasm-opt -Oz input.wasm -o output.wasm

# Inspect module
wasm2wat module.wasm > module.wat
```

### Key Crates

| Crate | Purpose |
|-------|---------|
| `wasm-bindgen` | JS/WASM bindings |
| `web-sys` | Web API bindings |
| `js-sys` | JS built-in bindings |
| `wasm-bindgen-futures` | Async support |
| `console_error_panic_hook` | Better panic messages |
| `wee_alloc` | Tiny allocator |
| `wit-bindgen` | Component Model bindings |

### WASI Runtimes

| Runtime | Notes |
|---------|-------|
| Wasmtime | Reference implementation, Bytecode Alliance |
| Wasmer | Alternative, multiple backends |
| WasmEdge | Cloud-native focus |
| Wazero | Go-based, zero dependencies |
| wasm3 | Interpreter, very portable |

---

## Resources

- [Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/docs/wasm-bindgen/)
- [WASI Documentation](https://wasi.dev/)
- [Component Model Specification](https://component-model.bytecodealliance.org/)
- [Wasmtime Documentation](https://docs.wasmtime.dev/)
- [WebAssembly MDN Guide](https://developer.mozilla.org/en-US/docs/WebAssembly)

---

**Next**: Return to [README.md](README.md) for the complete learning path

---

<p align="center">
<b>WebAssembly brings Rust's speed and safety to every platform.</b><br>
From browsers to edge servers to embedded systems — write once, run anywhere.
</p>
