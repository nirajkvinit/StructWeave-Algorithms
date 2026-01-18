# SOLID Principles in TypeScript

> Applying object-oriented design principles using TypeScript's type system, interfaces, and composition

SOLID principles are the foundation for building maintainable, scalable, and testable software. TypeScript's powerful type system makes these principles especially effective by catching violations at compile time.

---

## Table of Contents

1. [SOLID Overview for TypeScript](#solid-overview-for-typescript)
2. [Single Responsibility Principle (SRP)](#single-responsibility-principle-srp)
3. [Open/Closed Principle (OCP)](#openclosed-principle-ocp)
4. [Liskov Substitution Principle (LSP)](#liskov-substitution-principle-lsp)
5. [Interface Segregation Principle (ISP)](#interface-segregation-principle-isp)
6. [Dependency Inversion Principle (DIP)](#dependency-inversion-principle-dip)
7. [SOLID in Practice: Complete Example](#solid-in-practice-complete-example)
8. [Interview Questions](#interview-questions)
9. [Quick Reference](#quick-reference)

---

## SOLID Overview for TypeScript

### The Five Principles

| Principle | Focus | TypeScript Feature |
|-----------|-------|-------------------|
| **S**ingle Responsibility | One reason to change | Modules, classes |
| **O**pen/Closed | Open for extension, closed for modification | Interfaces, abstract classes |
| **L**iskov Substitution | Subtypes must be substitutable | Proper inheritance |
| **I**nterface Segregation | Many specific interfaces | `Pick`, `Omit`, small interfaces |
| **D**ependency Inversion | Depend on abstractions | Interfaces, constructor injection |

### Why SOLID Matters in TypeScript

```typescript
// TypeScript enforces SOLID at compile time:
// - Interfaces define contracts
// - Type checking catches violations
// - Generics enable flexible abstractions
// - Access modifiers (private, protected) enforce encapsulation
```

### Interface vs Abstract Class

| Feature | Interface | Abstract Class |
|---------|-----------|----------------|
| Multiple inheritance | Yes | No |
| Implementation | No | Partial allowed |
| Access modifiers | No | Yes |
| Constructor | No | Yes |
| Runtime presence | No (erased) | Yes |

```typescript
// Use interfaces for contracts (most cases)
interface Logger {
    log(message: string): void;
}

// Use abstract classes when you need:
// - Shared implementation
// - Protected members
// - Constructor logic
abstract class BaseLogger implements Logger {
    protected prefix: string;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    abstract log(message: string): void;

    protected formatMessage(message: string): string {
        return `[${this.prefix}] ${message}`;
    }
}
```

---

## Single Responsibility Principle (SRP)

> A class should have only one reason to change.

Each module, class, or function should do one thing and do it well.

### The Problem: God Class

```typescript
// BAD: User class does everything
class User {
    constructor(
        public name: string,
        public email: string,
        public password: string
    ) {}

    // Validation - reason to change #1
    validateEmail(): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
    }

    // Password hashing - reason to change #2
    hashPassword(): string {
        // Hashing logic
        return `hashed_${this.password}`;
    }

    // Database operations - reason to change #3
    save(): void {
        // Save to database
        console.log("Saving to database...");
    }

    // Email sending - reason to change #4
    sendWelcomeEmail(): void {
        // Email logic
        console.log(`Sending email to ${this.email}`);
    }

    // Reporting - reason to change #5
    generateReport(): string {
        return `User Report: ${this.name}`;
    }
}
```

### The Solution: Separate Responsibilities

```typescript
// GOOD: Each class has one responsibility

// Data container only
interface User {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
}

// Validation service
class EmailValidator {
    private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validate(email: string): boolean {
        return this.emailRegex.test(email);
    }
}

// Password service
class PasswordHasher {
    hash(password: string): string {
        // Use proper hashing in production (bcrypt, argon2)
        return `hashed_${password}`;
    }

    verify(password: string, hash: string): boolean {
        return this.hash(password) === hash;
    }
}

// Repository for data access
interface UserRepository {
    save(user: User): Promise<void>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
}

class PostgresUserRepository implements UserRepository {
    async save(user: User): Promise<void> {
        // Database save logic
    }

    async findById(id: string): Promise<User | null> {
        // Database query logic
        return null;
    }

    async findByEmail(email: string): Promise<User | null> {
        // Database query logic
        return null;
    }
}

// Email service
class EmailService {
    sendWelcomeEmail(user: User): void {
        console.log(`Sending welcome email to ${user.email}`);
    }

    sendPasswordReset(user: User, token: string): void {
        console.log(`Sending password reset to ${user.email}`);
    }
}

// Orchestrating service
class UserService {
    constructor(
        private readonly validator: EmailValidator,
        private readonly hasher: PasswordHasher,
        private readonly repository: UserRepository,
        private readonly emailService: EmailService
    ) {}

    async createUser(name: string, email: string, password: string): Promise<User> {
        if (!this.validator.validate(email)) {
            throw new Error("Invalid email");
        }

        const user: User = {
            id: crypto.randomUUID(),
            name,
            email,
            passwordHash: this.hasher.hash(password),
        };

        await this.repository.save(user);
        this.emailService.sendWelcomeEmail(user);

        return user;
    }
}
```

### SRP at Different Levels

```typescript
// Module Level: One file, one purpose
// user.repository.ts - only data access
// user.service.ts - only business logic
// user.controller.ts - only HTTP handling

// Function Level: One function, one task
// BAD: Function does multiple things
function processOrder(order: Order): void {
    // Validate
    if (!order.items.length) throw new Error("Empty order");
    // Calculate
    const total = order.items.reduce((sum, item) => sum + item.price, 0);
    // Save
    database.save(order);
    // Notify
    emailService.send(order.userEmail, "Order confirmed");
}

// GOOD: Separate functions
function validateOrder(order: Order): void {
    if (!order.items.length) throw new Error("Empty order");
}

function calculateTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.price, 0);
}

async function saveOrder(order: Order): Promise<void> {
    await database.save(order);
}

function notifyUser(email: string, message: string): void {
    emailService.send(email, message);
}

// Orchestrator
async function processOrder(order: Order): Promise<void> {
    validateOrder(order);
    order.total = calculateTotal(order.items);
    await saveOrder(order);
    notifyUser(order.userEmail, "Order confirmed");
}
```

### Signs of SRP Violation

1. Class has many methods with different purposes
2. Class name contains "And" or "Manager" or "Handler"
3. Class has too many dependencies (> 5-7)
4. Changes to one feature require modifying unrelated code
5. Hard to write focused unit tests

---

## Open/Closed Principle (OCP)

> Software entities should be open for extension but closed for modification.

Add new functionality by writing new code, not changing existing code.

### The Problem: Switch Statement Hell

```typescript
// BAD: Adding new payment type requires modifying this function
type PaymentType = "credit" | "debit" | "paypal";

function processPayment(type: PaymentType, amount: number): void {
    switch (type) {
        case "credit":
            console.log(`Processing credit payment of $${amount}`);
            // Credit card logic
            break;
        case "debit":
            console.log(`Processing debit payment of $${amount}`);
            // Debit card logic
            break;
        case "paypal":
            console.log(`Processing PayPal payment of $${amount}`);
            // PayPal logic
            break;
        // Adding "crypto" requires modifying this function!
    }
}
```

### The Solution: Strategy Pattern

```typescript
// GOOD: Define interface for payment processors
interface PaymentProcessor {
    readonly type: string;
    process(amount: number): Promise<PaymentResult>;
    validate(details: PaymentDetails): boolean;
}

interface PaymentResult {
    success: boolean;
    transactionId: string;
    message: string;
}

interface PaymentDetails {
    type: string;
    [key: string]: unknown;
}

// Each payment type is a separate implementation
class CreditCardProcessor implements PaymentProcessor {
    readonly type = "credit";

    async process(amount: number): Promise<PaymentResult> {
        // Credit card processing logic
        return {
            success: true,
            transactionId: `CC-${Date.now()}`,
            message: `Processed $${amount} via credit card`,
        };
    }

    validate(details: PaymentDetails): boolean {
        return "cardNumber" in details && "cvv" in details;
    }
}

class PayPalProcessor implements PaymentProcessor {
    readonly type = "paypal";

    async process(amount: number): Promise<PaymentResult> {
        // PayPal processing logic
        return {
            success: true,
            transactionId: `PP-${Date.now()}`,
            message: `Processed $${amount} via PayPal`,
        };
    }

    validate(details: PaymentDetails): boolean {
        return "email" in details;
    }
}

// Adding crypto: Just add new class, no modification needed!
class CryptoProcessor implements PaymentProcessor {
    readonly type = "crypto";

    async process(amount: number): Promise<PaymentResult> {
        return {
            success: true,
            transactionId: `CRYPTO-${Date.now()}`,
            message: `Processed $${amount} via cryptocurrency`,
        };
    }

    validate(details: PaymentDetails): boolean {
        return "walletAddress" in details;
    }
}

// Payment service - closed for modification
class PaymentService {
    private processors = new Map<string, PaymentProcessor>();

    // Open for extension via registration
    registerProcessor(processor: PaymentProcessor): void {
        this.processors.set(processor.type, processor);
    }

    async processPayment(
        type: string,
        amount: number,
        details: PaymentDetails
    ): Promise<PaymentResult> {
        const processor = this.processors.get(type);

        if (!processor) {
            throw new Error(`Unknown payment type: ${type}`);
        }

        if (!processor.validate(details)) {
            throw new Error(`Invalid payment details for ${type}`);
        }

        return processor.process(amount);
    }
}

// Usage
const paymentService = new PaymentService();
paymentService.registerProcessor(new CreditCardProcessor());
paymentService.registerProcessor(new PayPalProcessor());
paymentService.registerProcessor(new CryptoProcessor());

// Process any registered payment type
await paymentService.processPayment("crypto", 100, {
    type: "crypto",
    walletAddress: "0x123...",
});
```

### OCP with Decorators

```typescript
// Base notification
interface Notifier {
    send(message: string): void;
}

class EmailNotifier implements Notifier {
    send(message: string): void {
        console.log(`Email: ${message}`);
    }
}

// Decorators extend behavior without modifying original
class LoggingNotifier implements Notifier {
    constructor(private wrapped: Notifier) {}

    send(message: string): void {
        console.log(`[LOG] Sending notification: ${message}`);
        this.wrapped.send(message);
        console.log(`[LOG] Notification sent`);
    }
}

class RetryNotifier implements Notifier {
    constructor(
        private wrapped: Notifier,
        private maxRetries = 3
    ) {}

    send(message: string): void {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.wrapped.send(message);
                return;
            } catch (error) {
                if (attempt === this.maxRetries) throw error;
                console.log(`Retry attempt ${attempt}`);
            }
        }
    }
}

// Compose decorators
const notifier: Notifier = new RetryNotifier(
    new LoggingNotifier(
        new EmailNotifier()
    )
);

notifier.send("Hello!"); // Logged, retried if fails
```

### OCP with Generics

```typescript
// Generic repository - open for any entity type
interface Repository<T extends { id: string }> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    save(entity: T): Promise<void>;
    delete(id: string): Promise<void>;
}

// Extend for specific entities without modifying base
interface User { id: string; name: string; email: string; }
interface Product { id: string; name: string; price: number; }

class InMemoryRepository<T extends { id: string }> implements Repository<T> {
    private items = new Map<string, T>();

    async findById(id: string): Promise<T | null> {
        return this.items.get(id) ?? null;
    }

    async findAll(): Promise<T[]> {
        return Array.from(this.items.values());
    }

    async save(entity: T): Promise<void> {
        this.items.set(entity.id, entity);
    }

    async delete(id: string): Promise<void> {
        this.items.delete(id);
    }
}

// Use with any entity type
const userRepo = new InMemoryRepository<User>();
const productRepo = new InMemoryRepository<Product>();
```

---

## Liskov Substitution Principle (LSP)

> Subtypes must be substitutable for their base types without altering program correctness.

If `S` is a subtype of `T`, then objects of type `T` can be replaced with objects of type `S` without breaking the program.

### The Classic Violation: Rectangle/Square

```typescript
// BAD: Square violates LSP when substituted for Rectangle
class Rectangle {
    constructor(
        protected _width: number,
        protected _height: number
    ) {}

    get width(): number { return this._width; }
    set width(value: number) { this._width = value; }

    get height(): number { return this._height; }
    set height(value: number) { this._height = value; }

    area(): number {
        return this._width * this._height;
    }
}

class Square extends Rectangle {
    constructor(size: number) {
        super(size, size);
    }

    // Violates LSP: Changes expected behavior
    set width(value: number) {
        this._width = value;
        this._height = value; // Unexpected side effect!
    }

    set height(value: number) {
        this._width = value;
        this._height = value; // Unexpected side effect!
    }
}

// This function expects Rectangle behavior
function increaseWidth(rect: Rectangle): void {
    const originalHeight = rect.height;
    rect.width = rect.width + 10;

    // This assertion should pass for any Rectangle
    // But fails for Square!
    console.assert(
        rect.height === originalHeight,
        "Height should not change when width changes"
    );
}

const rect = new Rectangle(10, 20);
increaseWidth(rect); // Works correctly

const square = new Square(10);
increaseWidth(square); // FAILS! Height changed unexpectedly
```

### The Solution: Composition or Separate Hierarchies

```typescript
// GOOD: Use composition and separate interfaces
interface Shape {
    area(): number;
    perimeter(): number;
}

// Rectangle and Square are separate - no inheritance
class Rectangle implements Shape {
    constructor(
        private readonly width: number,
        private readonly height: number
    ) {}

    area(): number {
        return this.width * this.height;
    }

    perimeter(): number {
        return 2 * (this.width + this.height);
    }

    getWidth(): number { return this.width; }
    getHeight(): number { return this.height; }
}

class Square implements Shape {
    constructor(private readonly side: number) {}

    area(): number {
        return this.side * this.side;
    }

    perimeter(): number {
        return 4 * this.side;
    }

    getSide(): number { return this.side; }
}

// Functions work with Shape interface
function printArea(shape: Shape): void {
    console.log(`Area: ${shape.area()}`);
}

printArea(new Rectangle(10, 20)); // Works
printArea(new Square(10));        // Works - no LSP violation
```

### LSP with Interfaces

```typescript
// Define clear contracts
interface Bird {
    eat(): void;
}

interface FlyingBird extends Bird {
    fly(): void;
}

interface SwimmingBird extends Bird {
    swim(): void;
}

// Implementations respect their contracts
class Sparrow implements FlyingBird {
    eat(): void { console.log("Sparrow eating seeds"); }
    fly(): void { console.log("Sparrow flying"); }
}

class Penguin implements SwimmingBird {
    eat(): void { console.log("Penguin eating fish"); }
    swim(): void { console.log("Penguin swimming"); }
}

class Duck implements FlyingBird, SwimmingBird {
    eat(): void { console.log("Duck eating"); }
    fly(): void { console.log("Duck flying"); }
    swim(): void { console.log("Duck swimming"); }
}

// Type-safe functions
function makeFly(bird: FlyingBird): void {
    bird.fly(); // Only accepts birds that can fly
}

function makeSwim(bird: SwimmingBird): void {
    bird.swim(); // Only accepts birds that can swim
}

makeFly(new Sparrow()); // OK
makeFly(new Duck());    // OK
// makeFly(new Penguin()); // Error! Penguin doesn't implement FlyingBird

makeSwim(new Penguin()); // OK
makeSwim(new Duck());    // OK
```

### Covariance and Contravariance

```typescript
// Return types are covariant (can be more specific)
interface Animal { name: string; }
interface Dog extends Animal { breed: string; }

interface AnimalShelter {
    adopt(): Animal;
}

class DogShelter implements AnimalShelter {
    // OK: Dog is more specific than Animal
    adopt(): Dog {
        return { name: "Buddy", breed: "Labrador" };
    }
}

// Parameter types should be contravariant (same or more general)
interface AnimalHandler {
    handle(animal: Dog): void;
}

// BAD: This violates LSP in strict mode
// class BadHandler implements AnimalHandler {
//     handle(animal: Animal): void { } // More general parameter
// }

// TypeScript uses bivariant function parameters by default
// Enable strictFunctionTypes for proper contravariance checking
```

### LSP Rules

1. **Preconditions cannot be strengthened** - Subtype cannot require more
2. **Postconditions cannot be weakened** - Subtype must deliver at least as much
3. **Invariants must be preserved** - Subtype must maintain base class constraints
4. **History constraint** - Subtype cannot modify state in unexpected ways

---

## Interface Segregation Principle (ISP)

> Clients should not be forced to depend on interfaces they don't use.

Prefer many specific interfaces over one general-purpose interface.

### The Problem: Fat Interface

```typescript
// BAD: One interface with too many methods
interface Worker {
    work(): void;
    eat(): void;
    sleep(): void;
    attendMeeting(): void;
    writeCode(): void;
    reviewCode(): void;
    managePeople(): void;
    createDesigns(): void;
}

// Robot worker forced to implement methods it doesn't need
class RobotWorker implements Worker {
    work(): void { console.log("Working..."); }

    // Forced to implement - violates ISP
    eat(): void { throw new Error("Robots don't eat"); }
    sleep(): void { throw new Error("Robots don't sleep"); }
    attendMeeting(): void { throw new Error("Robots don't attend meetings"); }
    writeCode(): void { throw new Error("Not a coding robot"); }
    reviewCode(): void { throw new Error("Not a coding robot"); }
    managePeople(): void { throw new Error("Not a manager robot"); }
    createDesigns(): void { throw new Error("Not a designer robot"); }
}
```

### The Solution: Segregated Interfaces

```typescript
// GOOD: Small, focused interfaces
interface Workable {
    work(): void;
}

interface Eatable {
    eat(): void;
}

interface Sleepable {
    sleep(): void;
}

interface Meetable {
    attendMeeting(): void;
}

interface Codeable {
    writeCode(): void;
    reviewCode(): void;
}

interface Manageable {
    managePeople(): void;
}

interface Designable {
    createDesigns(): void;
}

// Combine interfaces as needed
interface HumanDeveloper extends Workable, Eatable, Sleepable, Meetable, Codeable {}
interface Manager extends Workable, Eatable, Sleepable, Meetable, Manageable {}
interface Robot extends Workable {}

// Implementations only implement what they need
class Developer implements HumanDeveloper {
    work(): void { console.log("Developer working"); }
    eat(): void { console.log("Developer eating"); }
    sleep(): void { console.log("Developer sleeping"); }
    attendMeeting(): void { console.log("Developer in meeting"); }
    writeCode(): void { console.log("Developer coding"); }
    reviewCode(): void { console.log("Developer reviewing"); }
}

class RobotWorker implements Robot {
    work(): void { console.log("Robot working 24/7"); }
    // No forced empty implementations!
}

// Functions take only what they need
function feedWorkers(workers: Eatable[]): void {
    workers.forEach(w => w.eat());
}

function assignWork(workers: Workable[]): void {
    workers.forEach(w => w.work());
}
```

### Using Pick and Omit for ISP

```typescript
// Full user interface
interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    avatar: string;
    createdAt: Date;
    lastLogin: Date;
    preferences: UserPreferences;
}

interface UserPreferences {
    theme: "light" | "dark";
    notifications: boolean;
    language: string;
}

// Create focused interfaces with Pick
type UserCredentials = Pick<User, "email" | "password">;
type UserProfile = Pick<User, "id" | "name" | "avatar">;
type UserPublic = Omit<User, "password" | "preferences">;

// Functions take only what they need
function authenticate(credentials: UserCredentials): Promise<boolean> {
    // Only needs email and password
    console.log(`Authenticating ${credentials.email}`);
    return Promise.resolve(true);
}

function displayProfile(profile: UserProfile): void {
    // Only needs id, name, avatar
    console.log(`Displaying ${profile.name}`);
}

function renderUserCard(user: UserPublic): void {
    // Everything except password and preferences
    console.log(`User: ${user.name}, Member since: ${user.createdAt}`);
}
```

### Role Interfaces

```typescript
// Define interfaces by role/capability, not by entity
interface Identifiable {
    id: string;
}

interface Timestamped {
    createdAt: Date;
    updatedAt: Date;
}

interface SoftDeletable {
    deletedAt: Date | null;
    isDeleted(): boolean;
}

interface Auditable {
    createdBy: string;
    updatedBy: string;
}

// Compose for specific entities
interface BlogPost extends Identifiable, Timestamped, SoftDeletable, Auditable {
    title: string;
    content: string;
    published: boolean;
}

interface Comment extends Identifiable, Timestamped, SoftDeletable {
    postId: string;
    authorId: string;
    text: string;
}

// Generic functions work with role interfaces
function softDelete<T extends SoftDeletable>(item: T): T {
    return {
        ...item,
        deletedAt: new Date(),
    };
}

function getAuditInfo<T extends Auditable>(item: T): string {
    return `Created by: ${item.createdBy}, Updated by: ${item.updatedBy}`;
}
```

---

## Dependency Inversion Principle (DIP)

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

> Abstractions should not depend on details. Details should depend on abstractions.

### The Problem: Direct Dependencies

```typescript
// BAD: High-level module depends on low-level implementations
class MySQLDatabase {
    save(data: object): void {
        console.log("Saving to MySQL:", data);
    }

    find(id: string): object | null {
        console.log("Finding in MySQL:", id);
        return null;
    }
}

class EmailService {
    send(to: string, subject: string, body: string): void {
        console.log(`Sending email to ${to}`);
    }
}

// UserService directly depends on concrete implementations
class UserService {
    private database = new MySQLDatabase();  // Tight coupling!
    private email = new EmailService();       // Tight coupling!

    createUser(name: string, email: string): void {
        const user = { id: "1", name, email };
        this.database.save(user);
        this.email.send(email, "Welcome", "Welcome to our app!");
    }
}

// Problems:
// 1. Can't switch to PostgreSQL without modifying UserService
// 2. Can't test UserService without real database/email
// 3. Changes to MySQLDatabase may break UserService
```

### The Solution: Depend on Abstractions

```typescript
// GOOD: Define abstractions (interfaces)
interface Database {
    save(data: object): Promise<void>;
    find(id: string): Promise<object | null>;
}

interface EmailSender {
    send(to: string, subject: string, body: string): Promise<void>;
}

// Low-level modules implement abstractions
class MySQLDatabase implements Database {
    async save(data: object): Promise<void> {
        console.log("Saving to MySQL:", data);
    }

    async find(id: string): Promise<object | null> {
        console.log("Finding in MySQL:", id);
        return null;
    }
}

class PostgreSQLDatabase implements Database {
    async save(data: object): Promise<void> {
        console.log("Saving to PostgreSQL:", data);
    }

    async find(id: string): Promise<object | null> {
        console.log("Finding in PostgreSQL:", id);
        return null;
    }
}

class SMTPEmailService implements EmailSender {
    async send(to: string, subject: string, body: string): Promise<void> {
        console.log(`Sending SMTP email to ${to}`);
    }
}

class SendGridEmailService implements EmailSender {
    async send(to: string, subject: string, body: string): Promise<void> {
        console.log(`Sending via SendGrid to ${to}`);
    }
}

// High-level module depends on abstractions
class UserService {
    constructor(
        private readonly database: Database,
        private readonly emailSender: EmailSender
    ) {}

    async createUser(name: string, email: string): Promise<void> {
        const user = { id: crypto.randomUUID(), name, email };
        await this.database.save(user);
        await this.emailSender.send(
            email,
            "Welcome",
            "Welcome to our app!"
        );
    }
}

// Inject dependencies - easy to switch implementations
const userService = new UserService(
    new PostgreSQLDatabase(),
    new SendGridEmailService()
);

// For testing - inject mocks
class MockDatabase implements Database {
    private data: object[] = [];

    async save(data: object): Promise<void> {
        this.data.push(data);
    }

    async find(id: string): Promise<object | null> {
        return null;
    }

    getSavedData(): object[] {
        return this.data;
    }
}

class MockEmailSender implements EmailSender {
    private sentEmails: Array<{ to: string; subject: string; body: string }> = [];

    async send(to: string, subject: string, body: string): Promise<void> {
        this.sentEmails.push({ to, subject, body });
    }

    getSentEmails() {
        return this.sentEmails;
    }
}

// Test with mocks
const mockDb = new MockDatabase();
const mockEmail = new MockEmailSender();
const testUserService = new UserService(mockDb, mockEmail);
```

### Factory Functions for DI

```typescript
// Factory pattern for dependency injection
interface Config {
    database: "mysql" | "postgres" | "memory";
    email: "smtp" | "sendgrid" | "mock";
}

function createDatabase(type: Config["database"]): Database {
    switch (type) {
        case "mysql":
            return new MySQLDatabase();
        case "postgres":
            return new PostgreSQLDatabase();
        case "memory":
            return new MockDatabase();
    }
}

function createEmailSender(type: Config["email"]): EmailSender {
    switch (type) {
        case "smtp":
            return new SMTPEmailService();
        case "sendgrid":
            return new SendGridEmailService();
        case "mock":
            return new MockEmailSender();
    }
}

function createUserService(config: Config): UserService {
    return new UserService(
        createDatabase(config.database),
        createEmailSender(config.email)
    );
}

// Production
const prodService = createUserService({ database: "postgres", email: "sendgrid" });

// Development
const devService = createUserService({ database: "memory", email: "mock" });
```

### DIP with Generics

```typescript
// Generic repository with DIP
interface Entity {
    id: string;
}

interface Repository<T extends Entity> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    save(entity: T): Promise<void>;
    delete(id: string): Promise<void>;
}

// Generic service depending on repository abstraction
class CrudService<T extends Entity> {
    constructor(private readonly repository: Repository<T>) {}

    async getById(id: string): Promise<T> {
        const entity = await this.repository.findById(id);
        if (!entity) {
            throw new Error(`Entity with id ${id} not found`);
        }
        return entity;
    }

    async getAll(): Promise<T[]> {
        return this.repository.findAll();
    }

    async create(entity: T): Promise<void> {
        await this.repository.save(entity);
    }

    async remove(id: string): Promise<void> {
        await this.repository.delete(id);
    }
}

// Specific implementations
interface User extends Entity {
    name: string;
    email: string;
}

class InMemoryUserRepository implements Repository<User> {
    private users = new Map<string, User>();

    async findById(id: string): Promise<User | null> {
        return this.users.get(id) ?? null;
    }

    async findAll(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    async save(user: User): Promise<void> {
        this.users.set(user.id, user);
    }

    async delete(id: string): Promise<void> {
        this.users.delete(id);
    }
}

// Create service with injected repository
const userRepository = new InMemoryUserRepository();
const userCrudService = new CrudService(userRepository);
```

---

## SOLID in Practice: Complete Example

Let's build an order processing system applying all SOLID principles.

```typescript
// ============================================
// DOMAIN ENTITIES
// ============================================

interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

interface Order {
    id: string;
    customerId: string;
    items: OrderItem[];
    status: OrderStatus;
    total: number;
    createdAt: Date;
}

type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

// ============================================
// INTERFACES (DIP - Abstractions)
// ============================================

// ISP - Small, focused interfaces
interface OrderRepository {
    save(order: Order): Promise<void>;
    findById(id: string): Promise<Order | null>;
    findByCustomer(customerId: string): Promise<Order[]>;
}

interface PaymentGateway {
    charge(customerId: string, amount: number): Promise<PaymentResult>;
    refund(transactionId: string): Promise<RefundResult>;
}

interface NotificationService {
    notify(customerId: string, message: string): Promise<void>;
}

interface InventoryService {
    reserve(items: OrderItem[]): Promise<boolean>;
    release(items: OrderItem[]): Promise<void>;
}

interface PaymentResult {
    success: boolean;
    transactionId: string;
    error?: string;
}

interface RefundResult {
    success: boolean;
    error?: string;
}

// ============================================
// SINGLE RESPONSIBILITY - Each class does one thing
// ============================================

// SRP: Only calculates order totals
class OrderCalculator {
    calculateTotal(items: OrderItem[]): number {
        return items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );
    }

    calculateTax(subtotal: number, taxRate: number = 0.1): number {
        return subtotal * taxRate;
    }
}

// SRP: Only validates orders
class OrderValidator {
    validate(order: Partial<Order>): ValidationResult {
        const errors: string[] = [];

        if (!order.customerId) {
            errors.push("Customer ID is required");
        }

        if (!order.items?.length) {
            errors.push("Order must have at least one item");
        }

        order.items?.forEach((item, index) => {
            if (item.quantity <= 0) {
                errors.push(`Item ${index}: quantity must be positive`);
            }
            if (item.unitPrice < 0) {
                errors.push(`Item ${index}: price cannot be negative`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// ============================================
// OPEN/CLOSED - Extensible order processors
// ============================================

// OCP: Define interface for order processors
interface OrderProcessor {
    canProcess(order: Order): boolean;
    process(order: Order): Promise<ProcessResult>;
}

interface ProcessResult {
    success: boolean;
    message: string;
}

// OCP: Each processor type is separate
class StandardOrderProcessor implements OrderProcessor {
    constructor(
        private paymentGateway: PaymentGateway,
        private inventoryService: InventoryService
    ) {}

    canProcess(order: Order): boolean {
        return order.status === "pending";
    }

    async process(order: Order): Promise<ProcessResult> {
        const reserved = await this.inventoryService.reserve(order.items);
        if (!reserved) {
            return { success: false, message: "Items not available" };
        }

        const payment = await this.paymentGateway.charge(
            order.customerId,
            order.total
        );

        if (!payment.success) {
            await this.inventoryService.release(order.items);
            return { success: false, message: payment.error ?? "Payment failed" };
        }

        return { success: true, message: "Order processed successfully" };
    }
}

class ExpressOrderProcessor implements OrderProcessor {
    constructor(
        private paymentGateway: PaymentGateway,
        private inventoryService: InventoryService
    ) {}

    canProcess(order: Order): boolean {
        // Express orders have priority
        return order.status === "pending" && order.total > 500;
    }

    async process(order: Order): Promise<ProcessResult> {
        // Express processing with priority inventory
        const reserved = await this.inventoryService.reserve(order.items);
        if (!reserved) {
            return { success: false, message: "Express items not available" };
        }

        const payment = await this.paymentGateway.charge(
            order.customerId,
            order.total * 1.1 // Express fee
        );

        if (!payment.success) {
            await this.inventoryService.release(order.items);
            return { success: false, message: payment.error ?? "Payment failed" };
        }

        return { success: true, message: "Express order processed" };
    }
}

// ============================================
// LISKOV SUBSTITUTION - Proper inheritance
// ============================================

// LSP: All notification services are substitutable
class EmailNotificationService implements NotificationService {
    async notify(customerId: string, message: string): Promise<void> {
        console.log(`Email to ${customerId}: ${message}`);
    }
}

class SMSNotificationService implements NotificationService {
    async notify(customerId: string, message: string): Promise<void> {
        console.log(`SMS to ${customerId}: ${message}`);
    }
}

class PushNotificationService implements NotificationService {
    async notify(customerId: string, message: string): Promise<void> {
        console.log(`Push to ${customerId}: ${message}`);
    }
}

// Composite notification - also substitutable
class CompositeNotificationService implements NotificationService {
    constructor(private services: NotificationService[]) {}

    async notify(customerId: string, message: string): Promise<void> {
        await Promise.all(
            this.services.map(service => service.notify(customerId, message))
        );
    }
}

// ============================================
// ORDER SERVICE - Orchestrates everything (DIP)
// ============================================

class OrderService {
    constructor(
        private readonly repository: OrderRepository,
        private readonly calculator: OrderCalculator,
        private readonly validator: OrderValidator,
        private readonly processors: OrderProcessor[],
        private readonly notificationService: NotificationService
    ) {}

    async createOrder(
        customerId: string,
        items: OrderItem[]
    ): Promise<Order> {
        const orderData: Partial<Order> = {
            customerId,
            items,
        };

        // Validate
        const validation = this.validator.validate(orderData);
        if (!validation.valid) {
            throw new Error(`Invalid order: ${validation.errors.join(", ")}`);
        }

        // Calculate
        const total = this.calculator.calculateTotal(items);

        // Create order
        const order: Order = {
            id: crypto.randomUUID(),
            customerId,
            items,
            status: "pending",
            total,
            createdAt: new Date(),
        };

        // Save
        await this.repository.save(order);

        // Notify
        await this.notificationService.notify(
            customerId,
            `Order ${order.id} created for $${total}`
        );

        return order;
    }

    async processOrder(orderId: string): Promise<ProcessResult> {
        const order = await this.repository.findById(orderId);
        if (!order) {
            return { success: false, message: "Order not found" };
        }

        // Find appropriate processor (OCP)
        const processor = this.processors.find(p => p.canProcess(order));
        if (!processor) {
            return { success: false, message: "No processor available" };
        }

        const result = await processor.process(order);

        if (result.success) {
            order.status = "confirmed";
            await this.repository.save(order);
            await this.notificationService.notify(
                order.customerId,
                `Order ${order.id} confirmed!`
            );
        }

        return result;
    }
}

// ============================================
// COMPOSITION ROOT - Wire everything together
// ============================================

function createOrderService(): OrderService {
    // Create implementations
    const repository = new InMemoryOrderRepository();
    const calculator = new OrderCalculator();
    const validator = new OrderValidator();

    const paymentGateway = new StripePaymentGateway();
    const inventoryService = new WarehouseInventoryService();

    const processors: OrderProcessor[] = [
        new ExpressOrderProcessor(paymentGateway, inventoryService),
        new StandardOrderProcessor(paymentGateway, inventoryService),
    ];

    const notificationService = new CompositeNotificationService([
        new EmailNotificationService(),
        new PushNotificationService(),
    ]);

    return new OrderService(
        repository,
        calculator,
        validator,
        processors,
        notificationService
    );
}

// Implementation stubs
class InMemoryOrderRepository implements OrderRepository {
    private orders = new Map<string, Order>();

    async save(order: Order): Promise<void> {
        this.orders.set(order.id, order);
    }

    async findById(id: string): Promise<Order | null> {
        return this.orders.get(id) ?? null;
    }

    async findByCustomer(customerId: string): Promise<Order[]> {
        return Array.from(this.orders.values())
            .filter(o => o.customerId === customerId);
    }
}

class StripePaymentGateway implements PaymentGateway {
    async charge(customerId: string, amount: number): Promise<PaymentResult> {
        return { success: true, transactionId: `txn_${Date.now()}` };
    }

    async refund(transactionId: string): Promise<RefundResult> {
        return { success: true };
    }
}

class WarehouseInventoryService implements InventoryService {
    async reserve(items: OrderItem[]): Promise<boolean> {
        return true;
    }

    async release(items: OrderItem[]): Promise<void> {}
}

// ============================================
// USAGE
// ============================================

async function main(): Promise<void> {
    const orderService = createOrderService();

    const order = await orderService.createOrder("customer-123", [
        { productId: "p1", productName: "Widget", quantity: 2, unitPrice: 29.99 },
        { productId: "p2", productName: "Gadget", quantity: 1, unitPrice: 49.99 },
    ]);

    console.log("Created order:", order);

    const result = await orderService.processOrder(order.id);
    console.log("Process result:", result);
}
```

---

## Interview Questions

### Basic Questions

**Q1: What does SOLID stand for?**
- **S**ingle Responsibility Principle
- **O**pen/Closed Principle
- **L**iskov Substitution Principle
- **I**nterface Segregation Principle
- **D**ependency Inversion Principle

**Q2: Why use SOLID principles?**
- Easier to maintain and modify code
- Easier to test (especially with DIP)
- More reusable components
- Reduced coupling between modules
- Better scalability

**Q3: What's the difference between interface and abstract class in TypeScript?**
- Interface: Contract only, no implementation, multiple inheritance, erased at runtime
- Abstract class: Can have implementation, single inheritance, exists at runtime

### Intermediate Questions

**Q4: Give an example of SRP violation and how to fix it.**
```typescript
// Violation: Class does too many things
class User {
    save() { } // Database
    validate() { } // Validation
    sendEmail() { } // Notification
}

// Fix: Separate responsibilities
class UserValidator { validate() { } }
class UserRepository { save() { } }
class UserNotifier { sendEmail() { } }
```

**Q5: How does TypeScript help enforce DIP?**
- Interfaces define contracts
- Constructor injection with typed parameters
- Compile-time checking of implementations
- Easy to create mock implementations for testing

### Advanced Questions

**Q6: Explain the Rectangle/Square problem and how to solve it.**
Square inheriting from Rectangle violates LSP because:
- Setting width on a square also changes height (unexpected behavior)
- Code expecting Rectangle behavior breaks with Square

Solution: Use composition or separate hierarchies with a common Shape interface.

**Q7: How do you apply ISP in a large TypeScript codebase?**
- Use `Pick` and `Omit` to create focused types
- Define role-based interfaces (Identifiable, Timestamped)
- Functions accept only the properties they need
- Avoid "god interfaces" with many methods

**Q8: What patterns help implement OCP?**
- Strategy Pattern (interchangeable algorithms)
- Decorator Pattern (add behavior without modification)
- Factory Pattern (create objects without specifying exact classes)
- Plugin architecture (register new implementations)

---

## Quick Reference

### When to Apply Each Principle

| Principle | Apply When | Warning Signs |
|-----------|------------|---------------|
| SRP | Class has multiple reasons to change | Class name has "And", "Manager" |
| OCP | Adding features requires modifying existing code | Growing switch statements |
| LSP | Subclass overrides throw exceptions | Empty method implementations |
| ISP | Classes implement unused methods | Many "not implemented" errors |
| DIP | Hard to test, tight coupling | `new` keyword in business logic |

### TypeScript Features for SOLID

| Principle | TypeScript Feature |
|-----------|-------------------|
| SRP | Modules, namespaces |
| OCP | Interfaces, generics, abstract classes |
| LSP | Interface implementation, strict types |
| ISP | `Pick`, `Omit`, intersection types |
| DIP | Interfaces, constructor parameters |

### SOLID Checklist

- [ ] Each class/module has one clear responsibility
- [ ] New features don't require modifying existing code
- [ ] Subtypes can replace base types without issues
- [ ] Interfaces are small and focused
- [ ] High-level modules depend on interfaces, not implementations
- [ ] Dependencies are injected, not created internally
- [ ] Code is easy to test with mocks
