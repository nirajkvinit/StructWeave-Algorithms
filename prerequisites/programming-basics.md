---
title: Programming Basics
type: prerequisite
level: beginner
estimated_reading_time: 25
---

# Programming Basics

This guide covers the fundamental programming concepts you need before diving into algorithms and data structures. If you're new to programming, take your time with this material. If you're experienced, use it as a quick reference.

## Table of Contents

1. [Variables and Data Types](#variables-and-data-types)
2. [Operators](#operators)
3. [Control Flow](#control-flow)
4. [Functions](#functions)
5. [Scope and Lifetime](#scope-and-lifetime)
6. [Common Patterns](#common-patterns)
7. [Basic Debugging](#basic-debugging)
8. [Self-Assessment](#self-assessment)
9. [Resources](#resources)

---

## Variables and Data Types

### What is a Variable?

A **variable** is a named container that stores a value. Think of it as a labeled box where you can put data and retrieve it later.

**Pseudocode:**
```
age = 25
name = "Alice"
isStudent = true
```

**Python:**
```python
age = 25
name = "Alice"
is_student = True
```

**JavaScript:**
```javascript
let age = 25;
let name = "Alice";
let isStudent = true;
```

### Primitive Data Types

Most programming languages have these basic types:

| Type | Description | Examples |
|------|-------------|----------|
| **Integer** | Whole numbers | -1, 0, 42, 1000 |
| **Float/Decimal** | Numbers with decimal points | 3.14, -0.5, 2.0 |
| **String** | Text/characters | "hello", "123", "" |
| **Boolean** | True or false values | true, false |
| **Null/None** | Absence of value | null, None, undefined |

**Python Examples:**
```python
# Integer
count = 10
temperature = -5

# Float
price = 19.99
pi = 3.14159

# String
greeting = "Hello, World!"
empty = ""

# Boolean
is_active = True
has_error = False

# None
result = None
```

**JavaScript Examples:**
```javascript
// Integer (stored as Number)
let count = 10;
let temperature = -5;

// Float (also Number)
let price = 19.99;
let pi = 3.14159;

// String
let greeting = "Hello, World!";
let empty = "";

// Boolean
let isActive = true;
let hasError = false;

// Null and Undefined
let result = null;
let notDefined;  // undefined
```

### Collection Types

**Arrays/Lists** - Ordered collections of items:

```python
# Python
numbers = [1, 2, 3, 4, 5]
names = ["Alice", "Bob", "Charlie"]
mixed = [1, "two", 3.0, True]

# Access by index (0-based)
first = numbers[0]      # 1
last = numbers[-1]      # 5 (Python allows negative indexing)
```

```javascript
// JavaScript
let numbers = [1, 2, 3, 4, 5];
let names = ["Alice", "Bob", "Charlie"];
let mixed = [1, "two", 3.0, true];

// Access by index
let first = numbers[0];        // 1
let last = numbers[numbers.length - 1];  // 5
```

**Objects/Dictionaries** - Key-value pairs:

```python
# Python Dictionary
person = {
    "name": "Alice",
    "age": 30,
    "city": "New York"
}

# Access values
name = person["name"]        # "Alice"
age = person.get("age")      # 30
```

```javascript
// JavaScript Object
let person = {
    name: "Alice",
    age: 30,
    city: "New York"
};

// Access values
let name = person.name;          // "Alice"
let age = person["age"];         // 30
```

---

## Operators

### Arithmetic Operators

```
+    Addition          5 + 3 = 8
-    Subtraction       5 - 3 = 2
*    Multiplication    5 * 3 = 15
/    Division          5 / 2 = 2.5
%    Modulo (remainder)  5 % 2 = 1
**   Exponentiation    2 ** 3 = 8
//   Integer division  5 // 2 = 2 (Python)
```

### Comparison Operators

```
==   Equal to              5 == 5  → true
!=   Not equal to          5 != 3  → true
>    Greater than          5 > 3   → true
<    Less than             5 < 3   → false
>=   Greater or equal      5 >= 5  → true
<=   Less or equal         3 <= 5  → true
```

**Note:** Some languages (JavaScript, PHP) have `===` (strict equality) which also checks type.

### Logical Operators

```
AND   Both must be true      true AND false  → false
OR    At least one true      true OR false   → true
NOT   Inverts boolean        NOT true        → false
```

**Python:**
```python
x = 5
y = 10

result = x > 3 and y < 20    # True
result = x > 3 or y > 20     # True
result = not (x > 3)         # False
```

**JavaScript:**
```javascript
let x = 5;
let y = 10;

let result = x > 3 && y < 20;    // true
result = x > 3 || y > 20;        // true
result = !(x > 3);               // false
```

---

## Control Flow

Control flow determines the order in which code executes.

### If-Else Statements

**Pseudocode:**
```
if condition:
    do something
else if another_condition:
    do something else
else:
    do default action
```

**Python:**
```python
age = 18

if age < 13:
    print("Child")
elif age < 18:
    print("Teenager")
else:
    print("Adult")
```

**JavaScript:**
```javascript
let age = 18;

if (age < 13) {
    console.log("Child");
} else if (age < 18) {
    console.log("Teenager");
} else {
    console.log("Adult");
}
```

### Loops

#### For Loop (Count-Based)

**Python:**
```python
# Iterate 5 times (0 to 4)
for i in range(5):
    print(i)

# Iterate over a list
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)

# With index
for index, fruit in enumerate(fruits):
    print(f"{index}: {fruit}")
```

**JavaScript:**
```javascript
// Iterate 5 times
for (let i = 0; i < 5; i++) {
    console.log(i);
}

// Iterate over array
let fruits = ["apple", "banana", "cherry"];
for (let i = 0; i < fruits.length; i++) {
    console.log(fruits[i]);
}

// Modern for-of loop
for (let fruit of fruits) {
    console.log(fruit);
}
```

#### While Loop (Condition-Based)

**Python:**
```python
count = 0
while count < 5:
    print(count)
    count += 1

# Infinite loop (use with caution!)
# while True:
#     if some_condition:
#         break
```

**JavaScript:**
```javascript
let count = 0;
while (count < 5) {
    console.log(count);
    count++;
}

// Infinite loop (use with caution!)
// while (true) {
//     if (someCondition) {
//         break;
//     }
// }
```

### Loop Control

- **break** - Exit loop immediately
- **continue** - Skip to next iteration

**Python:**
```python
for i in range(10):
    if i == 3:
        continue  # Skip 3
    if i == 7:
        break     # Stop at 7
    print(i)      # Prints: 0, 1, 2, 4, 5, 6
```

---

## Functions

Functions are reusable blocks of code that perform specific tasks.

### Defining Functions

**Pseudocode:**
```
function greet(name):
    return "Hello, " + name
```

**Python:**
```python
def greet(name):
    return f"Hello, {name}"

# Call the function
message = greet("Alice")
print(message)  # "Hello, Alice"

# Function with multiple parameters
def add(a, b):
    return a + b

result = add(5, 3)  # 8

# Function with default parameters
def power(base, exponent=2):
    return base ** exponent

print(power(3))      # 9 (3^2)
print(power(3, 3))   # 27 (3^3)
```

**JavaScript:**
```javascript
function greet(name) {
    return `Hello, ${name}`;
}

// Call the function
let message = greet("Alice");
console.log(message);  // "Hello, Alice"

// Function with multiple parameters
function add(a, b) {
    return a + b;
}

let result = add(5, 3);  // 8

// Arrow function (modern syntax)
const multiply = (a, b) => a * b;
console.log(multiply(4, 5));  // 20

// Function with default parameters
function power(base, exponent = 2) {
    return base ** exponent;
}

console.log(power(3));      // 9
console.log(power(3, 3));   // 27
```

### Return Values

Functions can return values or return nothing (void/None).

**Python:**
```python
def calculate_area(length, width):
    return length * width

def print_greeting(name):
    print(f"Hello, {name}")
    # No return statement = returns None

area = calculate_area(5, 3)  # 15
result = print_greeting("Bob")  # None
```

---

## Scope and Lifetime

**Scope** determines where a variable can be accessed. **Lifetime** is how long it exists in memory.

### Global vs. Local Scope

**Python:**
```python
# Global variable
global_var = "I'm global"

def my_function():
    # Local variable
    local_var = "I'm local"
    print(global_var)   # Can access global
    print(local_var)    # Can access local

my_function()
# print(local_var)    # Error! local_var doesn't exist here

# Modifying global variables
count = 0

def increment():
    global count  # Declare we're using the global variable
    count += 1

increment()
print(count)  # 1
```

**JavaScript:**
```javascript
// Global variable
let globalVar = "I'm global";

function myFunction() {
    // Local variable
    let localVar = "I'm local";
    console.log(globalVar);   // Can access global
    console.log(localVar);    // Can access local
}

myFunction();
// console.log(localVar);    // Error! localVar doesn't exist here

// Block scope (let/const)
if (true) {
    let blockVar = "I'm in the block";
    console.log(blockVar);  // Works
}
// console.log(blockVar);   // Error! blockVar is block-scoped
```

### Best Practices

1. **Minimize global variables** - They can cause conflicts and bugs
2. **Use local variables** when possible
3. **Pass data through parameters** instead of relying on globals
4. **Use descriptive names** - `calculate_total()` is better than `ct()`

---

## Common Patterns

### Swapping Variables

**Python:**
```python
a = 5
b = 10

# Python's elegant swap
a, b = b, a

print(a, b)  # 10, 5
```

**JavaScript:**
```javascript
let a = 5;
let b = 10;

// Using destructuring
[a, b] = [b, a];

// Traditional approach
// let temp = a;
// a = b;
// b = temp;

console.log(a, b);  // 10, 5
```

### Accumulator Pattern

Building up a result through iteration:

**Python:**
```python
# Sum of numbers
numbers = [1, 2, 3, 4, 5]
total = 0  # Accumulator

for num in numbers:
    total += num

print(total)  # 15

# Building a string
words = ["Hello", "World"]
sentence = ""  # Accumulator

for word in words:
    sentence += word + " "

print(sentence.strip())  # "Hello World"
```

### Counter Pattern

**Python:**
```python
# Count occurrences
letters = "hello world"
letter_count = {}

for letter in letters:
    if letter in letter_count:
        letter_count[letter] += 1
    else:
        letter_count[letter] = 1

print(letter_count)  # {'h': 1, 'e': 1, 'l': 3, 'o': 2, ...}
```

### Guard Clause Pattern

Exit early from functions to avoid deep nesting:

**Python:**
```python
def process_user(user):
    # Bad: Deep nesting
    # if user is not None:
    #     if user.is_active:
    #         if user.has_permission():
    #             return "Processing..."

    # Good: Guard clauses
    if user is None:
        return "No user"
    if not user.is_active:
        return "User inactive"
    if not user.has_permission():
        return "No permission"

    return "Processing..."
```

---

## Basic Debugging

### Reading Error Messages

Error messages tell you:
1. **What** went wrong
2. **Where** it happened (file and line number)
3. **Why** it might have happened

**Python Example:**
```
Traceback (most recent call last):
  File "script.py", line 5, in <module>
    result = numbers[10]
IndexError: list index out of range
```

This tells you:
- **What**: IndexError (trying to access an index that doesn't exist)
- **Where**: script.py, line 5
- **Code**: `numbers[10]`

### Print Debugging

Add print statements to see what's happening:

**Python:**
```python
def calculate_average(numbers):
    print(f"Input: {numbers}")  # Debug: See input

    total = sum(numbers)
    print(f"Total: {total}")    # Debug: See intermediate value

    count = len(numbers)
    print(f"Count: {count}")    # Debug: See count

    average = total / count
    print(f"Average: {average}")  # Debug: See result

    return average
```

### Common Beginner Mistakes

1. **Off-by-one errors**
   ```python
   # Wrong: Tries to access index 5 in a 5-element array
   for i in range(len(arr) + 1):  # BUG!
       print(arr[i])

   # Correct
   for i in range(len(arr)):
       print(arr[i])
   ```

2. **Infinite loops**
   ```python
   # Wrong: count never increases
   count = 0
   while count < 10:
       print(count)  # Prints 0 forever!

   # Correct
   count = 0
   while count < 10:
       print(count)
       count += 1  # Don't forget to update!
   ```

3. **Uninitialized variables**
   ```python
   # Wrong: total doesn't exist yet
   for num in numbers:
       total += num  # Error on first iteration!

   # Correct
   total = 0  # Initialize first
   for num in numbers:
       total += num
   ```

4. **Type confusion**
   ```python
   # Wrong: Can't add string and integer
   age = "25"
   next_year = age + 1  # Error!

   # Correct
   age = 25  # Use integer
   next_year = age + 1

   # Or convert
   age_str = "25"
   age_int = int(age_str)
   next_year = age_int + 1
   ```

---

## Self-Assessment

Test your understanding with these questions. If you can answer them confidently, you're ready to move on!

### Level 1: Basic Understanding

- [ ] Can you explain what a variable is?
- [ ] Can you name at least 4 primitive data types?
- [ ] Do you understand the difference between `=` (assignment) and `==` (comparison)?
- [ ] Can you write a simple if-else statement?
- [ ] Can you write a for loop that counts from 0 to 9?

### Level 2: Practical Skills

- [ ] Can you write a function that takes two numbers and returns their sum?
- [ ] Can you iterate over an array/list and print each element?
- [ ] Can you explain what local and global scope mean?
- [ ] Can you identify and fix an infinite loop?
- [ ] Can you use print debugging to find where a bug occurs?

### Level 3: Problem Solving

- [ ] Can you write a function that finds the largest number in an array?
- [ ] Can you write a function that counts how many times a value appears in a list?
- [ ] Can you explain when to use a for loop vs. a while loop?
- [ ] Can you use an accumulator pattern to build a result?
- [ ] Can you read and understand simple error messages?

### Practical Exercises

Try these coding challenges:

1. **Sum Calculator**: Write a function that takes an array of numbers and returns their sum.

2. **Even Counter**: Write a function that counts how many even numbers are in an array.

3. **Temperature Converter**: Write a function that converts Celsius to Fahrenheit: `F = (C × 9/5) + 32`

4. **Find Maximum**: Write a function that finds and returns the largest number in an array.

5. **Reverse String**: Write a function that reverses a string (e.g., "hello" → "olleh")

---

## Resources

### Interactive Learning

- **Python Tutor** (pythontutor.com) - Visualize code execution step by step
- **Codecademy** - Interactive coding lessons
- **freeCodeCamp** - Free coding curriculum

### Documentation

- **Python**: docs.python.org/3/tutorial/
- **JavaScript**: developer.mozilla.org/en-US/docs/Web/JavaScript/Guide
- **W3Schools** - Quick reference for multiple languages

### Practice

- **Codewars** - Small coding challenges
- **Exercism** - Practice with mentor feedback
- **HackerRank** - Programming fundamentals track

### Books

- **"Automate the Boring Stuff with Python"** by Al Sweigart (free online)
- **"Eloquent JavaScript"** by Marijn Haverbeke (free online)
- **"Think Python"** by Allen Downey (free online)

---

## Next Steps

Once you're comfortable with these basics:

1. Read [Computational Thinking](./computational-thinking.md) to develop problem-solving skills
2. Learn [Time Complexity](./time-complexity.md) to understand algorithm efficiency
3. Review [Debugging Strategies](./debugging-strategies.md) for systematic problem-solving
4. Start with [Easy Problems](../problems/easy/) in the question bank

Remember: Programming is a skill learned through practice. Don't just read—code along with examples and try the exercises. Make mistakes, debug them, and learn from the process!
