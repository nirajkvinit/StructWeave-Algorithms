# Rust Macros

> **Reading time**: 60-75 minutes | **Difficulty**: Intermediate to Advanced | **Rust Edition**: 2024

Master Rust's powerful metaprogramming features — declarative macros for quick pattern matching and procedural macros for compile-time code generation.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Declarative Macros (macro_rules!)](#declarative-macros-macro_rules)
3. [Common Standard Library Macros](#common-standard-library-macros)
4. [Procedural Macros](#procedural-macros)
5. [Key Crates: syn, quote, proc_macro](#key-crates-syn-quote-proc_macro)
6. [Debugging Macros](#debugging-macros)
7. [Common Macro Patterns](#common-macro-patterns)
8. [Best Practices](#best-practices)
9. [Interview Questions](#interview-questions)
10. [Quick Reference](#quick-reference)

---

## Introduction

Macros are a way of writing code that writes other code — a technique called **metaprogramming**. Unlike functions, macros are expanded at compile time, generating code before the program runs.

### Why Macros Exist

```
Compile Time                              Runtime
┌─────────────────────────────────────┐   ┌─────────────────┐
│  Source Code                        │   │  Executable     │
│       ↓                             │   │                 │
│  Macro Expansion                    │   │  No macro       │
│       ↓                             │──→│  overhead       │
│  Expanded Code                      │   │                 │
│       ↓                             │   │  Zero-cost!     │
│  Type Checking & Compilation        │   │                 │
└─────────────────────────────────────┘   └─────────────────┘
```

### Macros vs Functions vs Generics

| Feature | Macros | Functions | Generics |
|---------|--------|-----------|----------|
| **Evaluated at** | Compile time | Runtime | Compile time (monomorphized) |
| **Variable args** | Yes (`$(...)*`) | No (fixed signature) | No |
| **Access to syntax** | Yes (AST manipulation) | No | No |
| **Type checking** | After expansion | Before call | Before call |
| **Error messages** | Can be cryptic | Clear | Clear |
| **Use when** | Need syntax extension | Normal logic | Need type abstraction |

### When to Use Each

```rust
// Use a FUNCTION for normal logic
fn add(a: i32, b: i32) -> i32 {
    a + b
}

// Use GENERICS for type abstraction
fn largest<T: Ord>(list: &[T]) -> &T {
    list.iter().max().unwrap()
}

// Use a MACRO when you need:
// 1. Variable number of arguments
vec![1, 2, 3, 4, 5]  // Can take any number of elements

// 2. Code that wouldn't otherwise compile
println!("x = {}, y = {}", x, y);  // Format string checked at compile time

// 3. To reduce boilerplate
#[derive(Debug, Clone, PartialEq)]  // Generates trait implementations
struct Point { x: i32, y: i32 }
```

---

## Declarative Macros (macro_rules!)

Declarative macros use pattern matching on Rust syntax. They're the most common type and are identified by the `!` suffix.

### Basic Syntax

```rust
macro_rules! say_hello {
    () => {
        println!("Hello!");
    };
}

fn main() {
    say_hello!();  // Expands to: println!("Hello!");
}
```

### Pattern Matching Structure

```rust
macro_rules! macro_name {
    // Pattern 1 => Expansion 1
    ( pattern1 ) => { expansion1 };

    // Pattern 2 => Expansion 2
    ( pattern2 ) => { expansion2 };
}
```

### Fragment Specifiers

Fragment specifiers define what kind of Rust syntax the macro accepts:

| Specifier | Matches | Example |
|-----------|---------|---------|
| `$x:expr` | Any expression | `1 + 2`, `foo()`, `if a { b }` |
| `$x:ident` | Identifier | `foo`, `Bar`, `my_var` |
| `$x:ty` | Type | `i32`, `Vec<String>`, `&str` |
| `$x:pat` | Pattern | `Some(x)`, `1..=5`, `_` |
| `$x:path` | Path | `std::collections::HashMap` |
| `$x:stmt` | Statement | `let x = 1;`, `return 5` |
| `$x:block` | Block | `{ let x = 1; x + 1 }` |
| `$x:item` | Item | `fn foo() {}`, `struct Bar;` |
| `$x:literal` | Literal | `42`, `"hello"`, `true` |
| `$x:tt` | Token tree | Any single token or `(...)`/`[...]`/`{...}` |
| `$x:meta` | Meta item | `cfg(test)`, `derive(Debug)` |
| `$x:lifetime` | Lifetime | `'a`, `'static` |
| `$x:vis` | Visibility | `pub`, `pub(crate)`, (empty) |

### Examples with Specifiers

```rust
// Expression specifier
macro_rules! double {
    ($x:expr) => {
        $x * 2
    };
}

let result = double!(5 + 3);  // Expands to: (5 + 3) * 2 = 16

// Identifier specifier
macro_rules! create_function {
    ($name:ident) => {
        fn $name() {
            println!("Function {} was called", stringify!($name));
        }
    };
}

create_function!(foo);  // Creates: fn foo() { ... }
foo();  // Prints: "Function foo was called"

// Type specifier
macro_rules! declare_vec {
    ($name:ident, $ty:ty) => {
        let $name: Vec<$ty> = Vec::new();
    };
}

declare_vec!(numbers, i32);  // Creates: let numbers: Vec<i32> = Vec::new();
```

### Repetitions

Repetitions allow macros to accept variable numbers of arguments:

| Syntax | Meaning |
|--------|---------|
| `$(...)*` | Zero or more times |
| `$(...)+` | One or more times |
| `$(...)?` | Zero or one time |

```rust
// Zero or more repetition
macro_rules! create_vec {
    ( $( $x:expr ),* ) => {
        {
            let mut temp_vec = Vec::new();
            $(
                temp_vec.push($x);
            )*
            temp_vec
        }
    };
}

let v = create_vec![1, 2, 3, 4, 5];
// Expands to:
// {
//     let mut temp_vec = Vec::new();
//     temp_vec.push(1);
//     temp_vec.push(2);
//     temp_vec.push(3);
//     temp_vec.push(4);
//     temp_vec.push(5);
//     temp_vec
// }

// With separator
macro_rules! sum {
    ( $( $x:expr ),+ ) => {  // One or more, separated by commas
        {
            let mut total = 0;
            $(
                total += $x;
            )+
            total
        }
    };
}

let result = sum!(1, 2, 3, 4, 5);  // 15
```

### Nested Repetitions

```rust
macro_rules! matrix {
    ( $( [ $( $x:expr ),* ] ),* ) => {
        vec![
            $(
                vec![ $( $x ),* ]
            ),*
        ]
    };
}

let m = matrix![
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
];
// Creates: vec![vec![1,2,3], vec![4,5,6], vec![7,8,9]]
```

### Macro Hygiene

Rust macros are **hygienic** — variables defined inside a macro don't leak into the calling scope:

```rust
macro_rules! create_var {
    () => {
        let x = 42;  // This x is in the macro's scope
    };
}

fn main() {
    create_var!();
    // println!("{}", x);  // ERROR: x is not in scope
}

// To "export" a variable, accept an identifier:
macro_rules! create_var {
    ($name:ident) => {
        let $name = 42;  // Uses caller's identifier
    };
}

fn main() {
    create_var!(x);
    println!("{}", x);  // OK: prints 42
}
```

### Multiple Match Arms

```rust
macro_rules! calculate {
    // Match: calculate!(add 1, 2)
    (add $a:expr, $b:expr) => {
        $a + $b
    };
    // Match: calculate!(mul 3, 4)
    (mul $a:expr, $b:expr) => {
        $a * $b
    };
    // Match: calculate!(square 5)
    (square $x:expr) => {
        $x * $x
    };
}

let sum = calculate!(add 1, 2);      // 3
let product = calculate!(mul 3, 4);  // 12
let squared = calculate!(square 5);  // 25
```

---

## Common Standard Library Macros

### vec!

The `vec!` macro creates a `Vec<T>` with initial elements:

```rust
// How vec! is (approximately) implemented:
macro_rules! vec {
    () => {
        Vec::new()
    };
    ( $( $x:expr ),+ $(,)? ) => {
        {
            let mut temp_vec = Vec::new();
            $(
                temp_vec.push($x);
            )+
            temp_vec
        }
    };
    ( $elem:expr; $n:expr ) => {
        vec::from_elem($elem, $n)
    };
}

// Usage:
let v1 = vec![];           // Empty vec
let v2 = vec![1, 2, 3];    // Vec with elements
let v3 = vec![0; 10];      // Vec with 10 zeros
```

### println!, print!, eprintln!, eprint!

Format and print to stdout/stderr:

```rust
let name = "Alice";
let age = 30;

println!("Hello, {}!", name);           // Positional
println!("Name: {name}, Age: {age}");   // Named (Rust 2021+)
println!("{:?}", vec![1, 2, 3]);        // Debug format
println!("{:#?}", vec![1, 2, 3]);       // Pretty debug format
println!("{:>10}", "right");            // Right-align, width 10
println!("{:<10}", "left");             // Left-align, width 10
println!("{:^10}", "center");           // Center, width 10
println!("{:.2}", 3.14159);             // 2 decimal places: "3.14"
println!("{:08}", 42);                  // Zero-padded: "00000042"
println!("{:b}", 42);                   // Binary: "101010"
println!("{:x}", 255);                  // Hex lowercase: "ff"
println!("{:X}", 255);                  // Hex uppercase: "FF"
```

### format!

Like `println!` but returns a `String`:

```rust
let s = format!("Hello, {}!", "world");
// s = "Hello, world!"
```

### write! and writeln!

Write to any type implementing `std::fmt::Write` or `std::io::Write`:

```rust
use std::fmt::Write;

let mut s = String::new();
write!(s, "Hello, {}!", "world").unwrap();
// s = "Hello, world!"

use std::io::Write;
let mut buf = Vec::new();
writeln!(buf, "Line 1").unwrap();
```

### derive Attribute Macro

The most commonly used procedural macro:

```rust
// Common derivable traits:
#[derive(Debug)]        // Enables {:?} formatting
#[derive(Clone)]        // Enables .clone()
#[derive(Copy)]         // Implicit copy on assignment (requires Clone)
#[derive(PartialEq)]    // Enables == and !=
#[derive(Eq)]           // Full equality (requires PartialEq)
#[derive(PartialOrd)]   // Enables <, >, <=, >= (requires PartialEq)
#[derive(Ord)]          // Full ordering (requires Eq + PartialOrd)
#[derive(Hash)]         // Enables hashing for HashMap keys
#[derive(Default)]      // Enables Default::default()

#[derive(Debug, Clone, PartialEq, Eq, Hash, Default)]
struct User {
    name: String,
    age: u32,
}
```

### assert!, debug_assert!

Runtime assertions:

```rust
// Always checked
assert!(1 + 1 == 2);
assert_eq!(1 + 1, 2);
assert_ne!(1, 2);

// Only checked in debug builds (stripped in release)
debug_assert!(expensive_check());
debug_assert_eq!(a, b);
debug_assert_ne!(a, b);

// With custom messages
assert!(condition, "Failed because: {}", reason);
```

### cfg! and Conditional Compilation

```rust
// Runtime check (returns bool)
if cfg!(target_os = "windows") {
    println!("Running on Windows");
}

// Compile-time conditional (removes code entirely)
#[cfg(target_os = "linux")]
fn linux_only() {
    // Only compiled on Linux
}

#[cfg(test)]
mod tests {
    // Only compiled when running tests
}

#[cfg(feature = "advanced")]
fn advanced_feature() {
    // Only compiled when "advanced" feature is enabled
}
```

### Other Useful Macros

```rust
// Include file contents at compile time
let contents = include_str!("../README.md");
let bytes = include_bytes!("../image.png");

// Environment variables at compile time
let version = env!("CARGO_PKG_VERSION");
let opt_var = option_env!("OPTIONAL_VAR");  // Returns Option<&str>

// Compile-time concatenation
const NAME: &str = concat!("Hello", ", ", "World");  // "Hello, World"

// Panic placeholder
fn not_implemented() {
    todo!("Implement this later");       // Panics with message
    unimplemented!("Not supported");     // Panics with message
    unreachable!("Should never reach");  // Panics, hints to optimizer
}

// File location
println!("File: {}", file!());           // Current file path
println!("Line: {}", line!());           // Current line number
println!("Column: {}", column!());       // Current column number
```

---

## Procedural Macros

Procedural macros are functions that take a `TokenStream` as input and produce a `TokenStream` as output. They run at compile time and can perform arbitrary computation.

### Three Types of Procedural Macros

| Type | Syntax | Use Case |
|------|--------|----------|
| **Derive** | `#[derive(MyTrait)]` | Auto-implement traits |
| **Attribute** | `#[my_attr]` | Transform items (functions, structs) |
| **Function-like** | `my_macro!(...)` | Custom syntax |

### Setting Up a Procedural Macro Crate

Procedural macros must be in their own crate with `proc-macro = true`:

```toml
# Cargo.toml
[lib]
proc-macro = true

[dependencies]
syn = { version = "2", features = ["full"] }
quote = "1"
proc-macro2 = "1"
```

### Derive Macro Example

```rust
// In my_derive/src/lib.rs
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(HelloWorld)]
pub fn hello_world_derive(input: TokenStream) -> TokenStream {
    // Parse the input tokens into a syntax tree
    let input = parse_macro_input!(input as DeriveInput);

    // Get the struct/enum name
    let name = input.ident;

    // Generate the implementation
    let expanded = quote! {
        impl HelloWorld for #name {
            fn hello_world() {
                println!("Hello from {}!", stringify!(#name));
            }
        }
    };

    // Return the generated code as a TokenStream
    TokenStream::from(expanded)
}

// Usage in another crate:
use my_derive::HelloWorld;

trait HelloWorld {
    fn hello_world();
}

#[derive(HelloWorld)]
struct Pancakes;

fn main() {
    Pancakes::hello_world();  // Prints: "Hello from Pancakes!"
}
```

### Attribute Macro Example

```rust
// In my_macros/src/lib.rs
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn log_call(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as ItemFn);

    let fn_name = &input.sig.ident;
    let fn_block = &input.block;
    let fn_vis = &input.vis;
    let fn_sig = &input.sig;

    let expanded = quote! {
        #fn_vis #fn_sig {
            println!("Calling function: {}", stringify!(#fn_name));
            let result = { #fn_block };
            println!("Function {} completed", stringify!(#fn_name));
            result
        }
    };

    TokenStream::from(expanded)
}

// Usage:
use my_macros::log_call;

#[log_call]
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    let result = add(2, 3);
    // Output:
    // Calling function: add
    // Function add completed
}
```

### Function-like Macro Example

```rust
// In my_macros/src/lib.rs
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, LitStr};

#[proc_macro]
pub fn make_uppercase(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as LitStr);
    let upper = input.value().to_uppercase();

    let expanded = quote! {
        #upper
    };

    TokenStream::from(expanded)
}

// Usage:
use my_macros::make_uppercase;

fn main() {
    let s: &str = make_uppercase!("hello world");
    println!("{}", s);  // Prints: "HELLO WORLD"
}
```

### Derive Macro with Helper Attributes

```rust
// Define helper attributes for your derive macro
#[proc_macro_derive(Builder, attributes(builder))]
pub fn builder_derive(input: TokenStream) -> TokenStream {
    // ...
}

// Usage:
#[derive(Builder)]
struct Command {
    #[builder(default = "default_exe")]
    executable: String,

    #[builder(each = "arg")]
    args: Vec<String>,
}
```

---

## Key Crates: syn, quote, proc_macro

### The Proc-Macro Triad

```
┌─────────────────────────────────────────────────────────┐
│                    Procedural Macro                      │
│                                                          │
│   Input: TokenStream ──→ syn ──→ AST                    │
│                           │                              │
│                           ↓                              │
│                    Your Logic                            │
│                           │                              │
│                           ↓                              │
│   Output: TokenStream ←── quote ←── Generated Code      │
└─────────────────────────────────────────────────────────┘
```

### syn — Parsing Rust Syntax

`syn` parses Rust source code into a syntax tree:

```rust
use syn::{parse_macro_input, DeriveInput, Data, Fields};

#[proc_macro_derive(MyTrait)]
pub fn my_derive(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    // Access struct name
    let name = input.ident;

    // Access generics
    let generics = input.generics;

    // Access fields
    match input.data {
        Data::Struct(data) => {
            match data.fields {
                Fields::Named(fields) => {
                    for field in fields.named {
                        let field_name = field.ident;
                        let field_type = field.ty;
                        // ...
                    }
                }
                Fields::Unnamed(fields) => { /* tuple struct */ }
                Fields::Unit => { /* unit struct */ }
            }
        }
        Data::Enum(data) => {
            for variant in data.variants {
                let variant_name = variant.ident;
                // ...
            }
        }
        Data::Union(data) => { /* union */ }
    }

    // ...
}
```

### quote — Generating Rust Code

`quote` provides a macro for generating `TokenStream`:

```rust
use quote::quote;

let name = syn::Ident::new("MyStruct", proc_macro2::Span::call_site());
let field_value = 42;

let tokens = quote! {
    impl #name {
        pub fn new() -> Self {
            Self { value: #field_value }
        }

        pub fn get_value(&self) -> i32 {
            self.value
        }
    }
};

// Variable interpolation with #
// Repetition with #( ... )*

let fields = vec!["a", "b", "c"];
let tokens = quote! {
    struct Generated {
        #(
            #fields: i32,
        )*
    }
};
// Generates:
// struct Generated {
//     a: i32,
//     b: i32,
//     c: i32,
// }
```

### proc_macro2 — For Testing

`proc_macro2` is a wrapper that works outside of procedural macro context (for unit tests):

```rust
// In your proc-macro crate
use proc_macro2::TokenStream;
use quote::quote;

fn generate_impl(name: &syn::Ident) -> TokenStream {
    quote! {
        impl #name {
            fn new() -> Self { Self }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use quote::quote;

    #[test]
    fn test_generate_impl() {
        let name = syn::Ident::new("Foo", proc_macro2::Span::call_site());
        let tokens = generate_impl(&name);

        // Convert to string for assertion
        let expected = quote! {
            impl Foo {
                fn new() -> Self { Self }
            }
        };

        assert_eq!(tokens.to_string(), expected.to_string());
    }
}
```

---

## Debugging Macros

### cargo expand

The most useful tool for debugging macros. Install and use:

```bash
# Install
cargo install cargo-expand

# Expand all macros in the crate
cargo expand

# Expand a specific module
cargo expand module_name

# Expand a specific function
cargo expand --lib function_name

# Expand with syntax highlighting
cargo expand --color always | less -R
```

### Example of cargo expand

```rust
// Before expansion:
fn main() {
    let v = vec![1, 2, 3];
    println!("{:?}", v);
}

// After `cargo expand`:
fn main() {
    let v = {
        let mut temp_vec = ::alloc::vec::Vec::new();
        temp_vec.push(1);
        temp_vec.push(2);
        temp_vec.push(3);
        temp_vec
    };
    {
        ::std::io::_print(
            format_args!("{0:?}\n", v)
        );
    };
}
```

### trace_macros! (Nightly)

Shows the expansion process step by step:

```rust
#![feature(trace_macros)]

trace_macros!(true);
let v = vec![1, 2, 3];
trace_macros!(false);

// Output during compilation:
// note: trace_macro
//   --> src/main.rs:4:13
//    |
// 4  |     let v = vec![1, 2, 3];
//    |             ^^^^^^^^^^^^^
//    |
//    = note: expanding `vec! { 1, 2, 3 }`
//    = note: to `{ let mut temp_vec = ...`
```

### Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `no rules expected the token` | Pattern doesn't match input | Check fragment specifiers and syntax |
| `unexpected end of macro invocation` | Missing arguments | Ensure all required args provided |
| `local ambiguity` | Multiple patterns could match | Make patterns more specific |
| `recursion limit reached` | Infinite macro recursion | Add base case or use `#![recursion_limit = "N"]` |
| `cannot find macro` | Macro not imported | Add `#[macro_use]` or `use crate::macro_name` |

---

## Common Macro Patterns

### Builder Pattern Macro

```rust
macro_rules! builder {
    ($name:ident { $($field:ident: $type:ty),* $(,)? }) => {
        #[derive(Default)]
        pub struct $name {
            $($field: Option<$type>,)*
        }

        impl $name {
            pub fn new() -> Self {
                Self::default()
            }

            $(
                pub fn $field(mut self, value: $type) -> Self {
                    self.$field = Some(value);
                    self
                }
            )*

            pub fn build(self) -> Result<Built, &'static str> {
                Ok(Built {
                    $($field: self.$field.ok_or(concat!(stringify!($field), " is required"))?,)*
                })
            }
        }

        pub struct Built {
            $($field: $type,)*
        }
    };
}

builder!(PersonBuilder {
    name: String,
    age: u32,
    email: String,
});

let person = PersonBuilder::new()
    .name("Alice".to_string())
    .age(30)
    .email("alice@example.com".to_string())
    .build()
    .unwrap();
```

### Simple DSL

```rust
macro_rules! html {
    // Empty element
    ($tag:ident) => {
        format!("<{0}></{0}>", stringify!($tag))
    };

    // Element with text content
    ($tag:ident [ $content:expr ]) => {
        format!("<{0}>{1}</{0}>", stringify!($tag), $content)
    };

    // Element with children
    ($tag:ident { $($child:tt)* }) => {
        format!("<{0}>{1}</{0}>", stringify!($tag), html!($($child)*))
    };

    // Multiple elements
    ($($tag:ident $content:tt)*) => {
        concat!($(html!($tag $content)),*)
    };
}

let page = html!(
    html {
        head {
            title ["My Page"]
        }
        body {
            h1 ["Hello!"]
            p ["Welcome to my page."]
        }
    }
);
```

### Compile-Time Validation

```rust
macro_rules! const_assert {
    ($cond:expr) => {
        const _: () = {
            if !$cond {
                panic!("Compile-time assertion failed");
            }
        };
    };
}

const_assert!(std::mem::size_of::<u64>() == 8);
// const_assert!(1 + 1 == 3);  // Compile error!

// Validate struct size
struct MyStruct {
    a: u32,
    b: u32,
}

const_assert!(std::mem::size_of::<MyStruct>() <= 16);
```

### Enum Dispatch

```rust
macro_rules! enum_dispatch {
    ($enum_name:ident, $trait_name:ident, $method:ident, [$($variant:ident),*]) => {
        impl $trait_name for $enum_name {
            fn $method(&self) {
                match self {
                    $(
                        $enum_name::$variant(inner) => inner.$method(),
                    )*
                }
            }
        }
    };
}

trait Speak {
    fn speak(&self);
}

struct Dog;
struct Cat;

impl Speak for Dog { fn speak(&self) { println!("Woof!"); } }
impl Speak for Cat { fn speak(&self) { println!("Meow!"); } }

enum Animal {
    Dog(Dog),
    Cat(Cat),
}

enum_dispatch!(Animal, Speak, speak, [Dog, Cat]);

let animal = Animal::Dog(Dog);
animal.speak();  // "Woof!"
```

---

## Best Practices

### 1. Prefer Functions and Generics

```rust
// BAD: Using macro when function would work
macro_rules! add {
    ($a:expr, $b:expr) => {
        $a + $b
    };
}

// GOOD: Use a function
fn add<T: std::ops::Add<Output = T>>(a: T, b: T) -> T {
    a + b
}
```

### 2. Document Macro Behavior

```rust
/// Creates a HashMap from key-value pairs.
///
/// # Examples
///
/// ```
/// let map = hashmap! {
///     "key1" => 1,
///     "key2" => 2,
/// };
/// ```
///
/// # Panics
///
/// This macro does not panic.
#[macro_export]
macro_rules! hashmap {
    ($($key:expr => $value:expr),* $(,)?) => {{
        let mut map = ::std::collections::HashMap::new();
        $(map.insert($key, $value);)*
        map
    }};
}
```

### 3. Use Fully Qualified Paths

```rust
// BAD: Assumes HashMap is in scope
macro_rules! make_map {
    () => {
        HashMap::new()  // Error if HashMap not imported
    };
}

// GOOD: Use fully qualified path
macro_rules! make_map {
    () => {
        ::std::collections::HashMap::new()  // Always works
    };
}
```

### 4. Handle Trailing Commas

```rust
// BAD: Doesn't allow trailing comma
macro_rules! my_vec {
    ($($x:expr),*) => { /* ... */ };
}

// GOOD: Allows optional trailing comma
macro_rules! my_vec {
    ($($x:expr),* $(,)?) => { /* ... */ };
}

// Now both work:
my_vec![1, 2, 3];
my_vec![1, 2, 3,];
```

### 5. Test Macro Expansions

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vec_macro() {
        let v = my_vec![1, 2, 3];
        assert_eq!(v, vec![1, 2, 3]);
    }

    #[test]
    fn test_empty_vec_macro() {
        let v: Vec<i32> = my_vec![];
        assert!(v.is_empty());
    }
}
```

### When NOT to Use Macros

| Scenario | Why Macros Are Bad | Better Alternative |
|----------|-------------------|-------------------|
| Simple code reuse | Harder to debug, read | Functions |
| Type abstraction | Macros don't understand types | Generics |
| Complex logic | Error messages are cryptic | Regular code |
| Performance | Macros don't optimize better | Functions (inlined) |

---

## Interview Questions

### Q1: Variable Scope in Macros

```rust
macro_rules! make_x {
    () => {
        let x = 42;
    };
}

fn main() {
    make_x!();
    println!("{}", x);
}
```

**Does this compile?**

**Answer**: No. Due to macro hygiene, `x` is in the macro's scope, not `main`'s scope. The error is `cannot find value 'x' in this scope`.

---

### Q2: Macro Expansion Order

```rust
macro_rules! double {
    ($e:expr) => { $e * 2 };
}

fn main() {
    let x = 5;
    let result = double!(x + 3);
    println!("{}", result);
}
```

**What does this print?**

**Answer**: `16`. The macro expands to `x + 3 * 2`, which due to operator precedence is `x + (3 * 2) = 5 + 6 = 11`... **Wait, that's wrong!**

Actually, `$e:expr` captures the *entire expression* `x + 3`, so it expands to `(x + 3) * 2 = 8 * 2 = 16`.

This is the difference between declarative macros (which understand expressions) and C-style text macros (which don't).

---

### Q3: Why Can't This Be a Function?

```rust
println!("x = {}, y = {}", x, y);
```

**Why is `println!` a macro instead of a function?**

**Answer**:
1. **Variable arguments**: Takes any number of format arguments
2. **Compile-time format checking**: The format string is validated at compile time
3. **Type flexibility**: Works with any type implementing `Display` or `Debug`
4. **Zero runtime parsing**: The format string is parsed at compile time

---

### Q4: Derive vs Manual Implementation

```rust
#[derive(Clone)]
struct Wrapper<T>(T);
```

**Will this compile for all T?**

**Answer**: No! The derived `Clone` implementation requires `T: Clone`. It generates:

```rust
impl<T: Clone> Clone for Wrapper<T> {
    fn clone(&self) -> Self {
        Wrapper(self.0.clone())
    }
}
```

If you need `Clone` without requiring `T: Clone` (e.g., using `Arc` internally), you must implement manually.

---

### Q5: The tt Fragment Specifier

```rust
macro_rules! call_with_tt {
    ($($tt:tt)*) => {
        println!("Got {} tokens", count_tts!($($tt)*));
    };
}
```

**What is `tt` and when would you use it?**

**Answer**: `tt` matches a single **token tree**:
- A single token (`ident`, `literal`, `punct`)
- A group of tokens in delimiters: `(...)`, `[...]`, `{...}`

Use `tt` when you need to accept arbitrary syntax without parsing it, like forwarding to another macro.

---

### Q6: Procedural Macro Crate Requirements

**Why must procedural macros be in a separate crate?**

**Answer**:
1. **Compilation order**: Proc macros must be compiled *before* the code that uses them
2. **Dependency isolation**: They link against the compiler's internal types (`TokenStream`)
3. **ABI stability**: The proc-macro ABI is separate from the regular Rust ABI

---

### Q7: Recursive Macros

```rust
macro_rules! count {
    () => { 0 };
    ($head:tt $($tail:tt)*) => { 1 + count!($($tail)*) };
}

let n = count!(a b c d e);
```

**What is the value of n?**

**Answer**: `5`. The macro recursively counts tokens:
- `count!(a b c d e)` → `1 + count!(b c d e)`
- `count!(b c d e)` → `1 + count!(c d e)`
- `count!(c d e)` → `1 + count!(d e)`
- `count!(d e)` → `1 + count!(e)`
- `count!(e)` → `1 + count!()`
- `count!()` → `0`
- Total: `1 + 1 + 1 + 1 + 1 + 0 = 5`

---

## Quick Reference

### Declarative Macro Syntax

```rust
macro_rules! name {
    // Basic pattern
    ( $x:expr ) => { /* expansion */ };

    // Multiple patterns
    ( $x:expr, $y:expr ) => { /* expansion */ };

    // Repetition: zero or more
    ( $( $x:expr ),* ) => { $( /* use $x */ )* };

    // Repetition: one or more
    ( $( $x:expr ),+ ) => { $( /* use $x */ )+ };

    // Repetition: zero or one
    ( $( $x:expr )? ) => { $( /* use $x */ )? };

    // Multiple match arms
    () => { /* empty */ };
    ( $x:expr ) => { /* one */ };
    ( $x:expr, $( $rest:expr ),* ) => { /* many */ };
}
```

### Fragment Specifiers Quick Reference

| Specifier | Use For |
|-----------|---------|
| `expr` | Values, calculations, function calls |
| `ident` | Names (variables, functions, types) |
| `ty` | Type annotations |
| `pat` | Match patterns |
| `tt` | Anything (for forwarding) |
| `literal` | Literal values (42, "hello") |
| `block` | `{ ... }` blocks |
| `item` | Top-level items (fn, struct, impl) |

### Procedural Macro Setup

```toml
# Cargo.toml
[lib]
proc-macro = true

[dependencies]
syn = { version = "2", features = ["full"] }
quote = "1"
proc-macro2 = "1"
```

### Common Debugging Commands

```bash
# Expand all macros
cargo expand

# Expand specific item
cargo expand --lib my_function

# Expand with tests
cargo expand --tests
```

---

## Resources

- [The Rust Reference - Macros](https://doc.rust-lang.org/reference/macros.html)
- [The Little Book of Rust Macros](https://veykril.github.io/tlborm/)
- [Procedural Macros Workshop](https://github.com/dtolnay/proc-macro-workshop)
- [syn Documentation](https://docs.rs/syn)
- [quote Documentation](https://docs.rs/quote)

---

**Next**: [15-unsafe-ffi.md](15-unsafe-ffi.md) — Unsafe Rust and FFI

---

<p align="center">
<b>Macros are powerful, but power comes with responsibility.</b><br>
When in doubt, prefer functions and generics.
</p>
