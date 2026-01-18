# TypeScript Creational Design Patterns

> Patterns for object creation that increase flexibility and reuse

Creational design patterns abstract the instantiation process. They help make a system independent of how its objects are created, composed, and represented.

---

## Table of Contents

1. [Pattern Selection Guide](#pattern-selection-guide)
2. [Singleton](#singleton)
3. [Factory Method](#factory-method)
4. [Abstract Factory](#abstract-factory)
5. [Builder](#builder)
6. [Prototype](#prototype)
7. [TypeScript-Specific Patterns](#typescript-specific-patterns)
8. [Interview Questions](#interview-questions)
9. [Quick Reference](#quick-reference)

---

## Pattern Selection Guide

### Decision Tree

```
Need to create objects?
│
├── Need exactly one instance? → Singleton
│
├── Need to create family of related objects? → Abstract Factory
│
├── Need to defer instantiation to subclasses? → Factory Method
│
├── Need to construct complex objects step by step? → Builder
│
└── Need to create objects by copying existing ones? → Prototype
```

### Quick Decision Table

| Pattern | Use When | Avoid When |
|---------|----------|------------|
| Singleton | Global state, shared resource | Need testability, multiple instances |
| Factory Method | Object type determined at runtime | Simple object creation |
| Abstract Factory | Family of related objects | Only one product type |
| Builder | Complex object with many options | Simple objects |
| Prototype | Expensive object creation, need copies | Simple constructors work |

---

## Singleton

Ensure a class has only one instance and provide a global point of access to it.

### When to Use

- Shared resource (database connection pool, logging)
- Configuration management
- Caching
- State management stores

### Module-Level Singleton (Recommended)

```typescript
// logger.ts - TypeScript modules are natural singletons
class Logger {
    private logs: string[] = [];

    log(message: string): void {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${message}`;
        this.logs.push(entry);
        console.log(entry);
    }

    getLogs(): readonly string[] {
        return this.logs;
    }

    clear(): void {
        this.logs = [];
    }
}

// Export single instance - module cached by Node.js/bundler
export const logger = new Logger();

// Usage in other files:
// import { logger } from './logger';
// logger.log('Something happened');
```

### Class-Based Singleton

```typescript
class DatabaseConnection {
    private static instance: DatabaseConnection | null = null;
    private connected = false;

    // Private constructor prevents direct instantiation
    private constructor(private readonly connectionString: string) {}

    static getInstance(connectionString?: string): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            if (!connectionString) {
                throw new Error("Connection string required for first initialization");
            }
            DatabaseConnection.instance = new DatabaseConnection(connectionString);
        }
        return DatabaseConnection.instance;
    }

    async connect(): Promise<void> {
        if (this.connected) return;
        console.log(`Connecting to ${this.connectionString}...`);
        // Simulate connection
        await new Promise(resolve => setTimeout(resolve, 100));
        this.connected = true;
        console.log("Connected!");
    }

    async query(sql: string): Promise<unknown[]> {
        if (!this.connected) {
            throw new Error("Not connected to database");
        }
        console.log(`Executing: ${sql}`);
        return [];
    }

    // For testing - reset singleton
    static resetInstance(): void {
        DatabaseConnection.instance = null;
    }
}

// Usage
const db1 = DatabaseConnection.getInstance("postgres://localhost/mydb");
const db2 = DatabaseConnection.getInstance();

console.log(db1 === db2); // true - same instance
```

### Generic Singleton Factory

```typescript
// Generic singleton wrapper
class Singleton<T> {
    private instance: T | null = null;

    constructor(private factory: () => T) {}

    getInstance(): T {
        if (!this.instance) {
            this.instance = this.factory();
        }
        return this.instance;
    }

    reset(): void {
        this.instance = null;
    }
}

// Usage with any class
class ConfigManager {
    private config: Record<string, unknown> = {};

    set(key: string, value: unknown): void {
        this.config[key] = value;
    }

    get<T>(key: string): T | undefined {
        return this.config[key] as T;
    }
}

const configSingleton = new Singleton(() => new ConfigManager());

// Get same instance everywhere
const config1 = configSingleton.getInstance();
const config2 = configSingleton.getInstance();
console.log(config1 === config2); // true
```

### Lazy Singleton with Proxy

```typescript
// Lazy initialization using Proxy
function createLazySingleton<T extends object>(factory: () => T): T {
    let instance: T | null = null;

    return new Proxy({} as T, {
        get(_, prop: keyof T) {
            if (!instance) {
                instance = factory();
            }
            const value = instance[prop];
            return typeof value === "function" ? value.bind(instance) : value;
        },
    });
}

// Heavy service that initializes lazily
class AnalyticsService {
    constructor() {
        console.log("AnalyticsService initialized (expensive operation)");
    }

    track(event: string): void {
        console.log(`Tracking: ${event}`);
    }
}

// Instance created only when first accessed
const analytics = createLazySingleton(() => new AnalyticsService());

// No initialization yet...
console.log("App started");

// Now it initializes
analytics.track("page_view");
```

### When NOT to Use Singleton

```typescript
// BAD: Singleton makes testing difficult
class BadUserService {
    private static instance: BadUserService;

    static getInstance(): BadUserService {
        if (!BadUserService.instance) {
            BadUserService.instance = new BadUserService();
        }
        return BadUserService.instance;
    }

    getUser(id: string): User | null {
        // Direct database call - hard to mock!
        return DatabaseConnection.getInstance().query(`SELECT * FROM users WHERE id = ${id}`);
    }
}

// GOOD: Use dependency injection instead
interface UserRepository {
    findById(id: string): Promise<User | null>;
}

class UserService {
    constructor(private readonly repository: UserRepository) {}

    async getUser(id: string): Promise<User | null> {
        return this.repository.findById(id);
    }
}

// Easy to test with mock repository
class MockUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        return { id, name: "Test User", email: "test@example.com" };
    }
}

interface User {
    id: string;
    name: string;
    email: string;
}
```

---

## Factory Method

Define an interface for creating objects, but let subclasses decide which class to instantiate.

### When to Use

- Object creation logic is complex
- Type of object is determined at runtime
- Want to decouple client code from concrete classes
- Need to extend product types without changing client code

### Basic Factory Function

```typescript
// Product interface
interface Button {
    render(): string;
    onClick(handler: () => void): void;
}

// Concrete products
class WindowsButton implements Button {
    render(): string {
        return "<button class='windows-btn'>Click me</button>";
    }

    onClick(handler: () => void): void {
        console.log("Windows click handler attached");
        handler();
    }
}

class MacButton implements Button {
    render(): string {
        return "<button class='mac-btn'>Click me</button>";
    }

    onClick(handler: () => void): void {
        console.log("Mac click handler attached");
        handler();
    }
}

class LinuxButton implements Button {
    render(): string {
        return "<button class='linux-btn'>Click me</button>";
    }

    onClick(handler: () => void): void {
        console.log("Linux click handler attached");
        handler();
    }
}

// Factory function
type Platform = "windows" | "mac" | "linux";

function createButton(platform: Platform): Button {
    switch (platform) {
        case "windows":
            return new WindowsButton();
        case "mac":
            return new MacButton();
        case "linux":
            return new LinuxButton();
    }
}

// Usage
const platform: Platform = "mac";
const button = createButton(platform);
console.log(button.render()); // Mac-specific button
```

### Factory Method with Discriminated Union

```typescript
// Document types
interface PDFDocument {
    type: "pdf";
    pages: number;
    render(): string;
}

interface WordDocument {
    type: "word";
    paragraphs: number;
    render(): string;
}

interface SpreadsheetDocument {
    type: "spreadsheet";
    sheets: number;
    render(): string;
}

type Document = PDFDocument | WordDocument | SpreadsheetDocument;

// Factory with discriminated unions
function createDocument(type: Document["type"]): Document {
    switch (type) {
        case "pdf":
            return {
                type: "pdf",
                pages: 1,
                render: () => "Rendering PDF...",
            };
        case "word":
            return {
                type: "word",
                paragraphs: 0,
                render: () => "Rendering Word document...",
            };
        case "spreadsheet":
            return {
                type: "spreadsheet",
                sheets: 1,
                render: () => "Rendering spreadsheet...",
            };
    }
}

// Type-safe usage
const doc = createDocument("pdf");
if (doc.type === "pdf") {
    console.log(`PDF with ${doc.pages} pages`); // TypeScript knows doc.pages exists
}
```

### Generic Factory

```typescript
// Generic factory pattern
interface Creator<T> {
    create(): T;
}

class ProductFactory<T> {
    private creators = new Map<string, Creator<T>>();

    register(type: string, creator: Creator<T>): void {
        this.creators.set(type, creator);
    }

    create(type: string): T {
        const creator = this.creators.get(type);
        if (!creator) {
            throw new Error(`Unknown product type: ${type}`);
        }
        return creator.create();
    }
}

// Example: Notification factory
interface Notification {
    send(message: string): void;
}

class EmailNotification implements Notification {
    send(message: string): void {
        console.log(`Email: ${message}`);
    }
}

class SMSNotification implements Notification {
    send(message: string): void {
        console.log(`SMS: ${message}`);
    }
}

class PushNotification implements Notification {
    send(message: string): void {
        console.log(`Push: ${message}`);
    }
}

// Register creators
const notificationFactory = new ProductFactory<Notification>();

notificationFactory.register("email", {
    create: () => new EmailNotification(),
});

notificationFactory.register("sms", {
    create: () => new SMSNotification(),
});

notificationFactory.register("push", {
    create: () => new PushNotification(),
});

// Usage
const notification = notificationFactory.create("email");
notification.send("Hello!");
```

### Static Factory Methods

```typescript
class User {
    private constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly role: "admin" | "user" | "guest"
    ) {}

    // Static factory methods - descriptive names
    static createAdmin(email: string): User {
        return new User(crypto.randomUUID(), email, "admin");
    }

    static createRegularUser(email: string): User {
        return new User(crypto.randomUUID(), email, "user");
    }

    static createGuest(): User {
        return new User(crypto.randomUUID(), "guest@example.com", "guest");
    }

    // Factory from data
    static fromJSON(json: string): User {
        const data = JSON.parse(json);
        return new User(data.id, data.email, data.role);
    }

    // Factory with validation
    static createWithValidation(email: string, role: User["role"]): User {
        if (!email.includes("@")) {
            throw new Error("Invalid email");
        }
        return new User(crypto.randomUUID(), email, role);
    }
}

// Usage - clearer intent than constructor
const admin = User.createAdmin("admin@example.com");
const guest = User.createGuest();
const user = User.fromJSON('{"id": "1", "email": "test@example.com", "role": "user"}');
```

---

## Abstract Factory

Provide an interface for creating families of related or dependent objects without specifying their concrete classes.

### When to Use

- Need to create families of related objects
- System should be independent of how products are created
- Want to enforce that products from same family are used together

### UI Theme Factory

```typescript
// Abstract products
interface Button {
    paint(): string;
}

interface Checkbox {
    paint(): string;
}

interface TextInput {
    paint(): string;
}

// Abstract factory
interface UIFactory {
    createButton(): Button;
    createCheckbox(): Checkbox;
    createTextInput(): TextInput;
}

// Light theme products
class LightButton implements Button {
    paint(): string {
        return "<button style='background: white; color: black'>Light Button</button>";
    }
}

class LightCheckbox implements Checkbox {
    paint(): string {
        return "<input type='checkbox' style='accent-color: black' />";
    }
}

class LightTextInput implements TextInput {
    paint(): string {
        return "<input style='background: white; border: 1px solid gray' />";
    }
}

// Dark theme products
class DarkButton implements Button {
    paint(): string {
        return "<button style='background: #333; color: white'>Dark Button</button>";
    }
}

class DarkCheckbox implements Checkbox {
    paint(): string {
        return "<input type='checkbox' style='accent-color: white' />";
    }
}

class DarkTextInput implements TextInput {
    paint(): string {
        return "<input style='background: #333; color: white; border: 1px solid #666' />";
    }
}

// Concrete factories
class LightThemeFactory implements UIFactory {
    createButton(): Button {
        return new LightButton();
    }

    createCheckbox(): Checkbox {
        return new LightCheckbox();
    }

    createTextInput(): TextInput {
        return new LightTextInput();
    }
}

class DarkThemeFactory implements UIFactory {
    createButton(): Button {
        return new DarkButton();
    }

    createCheckbox(): Checkbox {
        return new DarkCheckbox();
    }

    createTextInput(): TextInput {
        return new DarkTextInput();
    }
}

// Client code works with factory interface
class Application {
    private button: Button;
    private checkbox: Checkbox;
    private textInput: TextInput;

    constructor(factory: UIFactory) {
        // All components from same theme
        this.button = factory.createButton();
        this.checkbox = factory.createCheckbox();
        this.textInput = factory.createTextInput();
    }

    render(): string {
        return `
            <div>
                ${this.button.paint()}
                ${this.checkbox.paint()}
                ${this.textInput.paint()}
            </div>
        `;
    }
}

// Usage
const theme = "dark";
const factory = theme === "dark" ? new DarkThemeFactory() : new LightThemeFactory();
const app = new Application(factory);
console.log(app.render());
```

### Database-Specific Factory

```typescript
// Abstract products
interface Connection {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}

interface QueryBuilder {
    select(table: string, columns: string[]): string;
    insert(table: string, data: Record<string, unknown>): string;
}

interface Transaction {
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}

// Abstract factory
interface DatabaseFactory {
    createConnection(config: DatabaseConfig): Connection;
    createQueryBuilder(): QueryBuilder;
    createTransaction(connection: Connection): Transaction;
}

interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
}

// PostgreSQL implementations
class PostgresConnection implements Connection {
    constructor(private config: DatabaseConfig) {}

    async connect(): Promise<void> {
        console.log(`PostgreSQL connecting to ${this.config.host}:${this.config.port}`);
    }

    async disconnect(): Promise<void> {
        console.log("PostgreSQL disconnected");
    }
}

class PostgresQueryBuilder implements QueryBuilder {
    select(table: string, columns: string[]): string {
        return `SELECT ${columns.join(", ")} FROM "${table}"`;
    }

    insert(table: string, data: Record<string, unknown>): string {
        const columns = Object.keys(data).join(", ");
        const values = Object.values(data).map(v => `'${v}'`).join(", ");
        return `INSERT INTO "${table}" (${columns}) VALUES (${values}) RETURNING *`;
    }
}

class PostgresTransaction implements Transaction {
    constructor(private connection: Connection) {}

    async begin(): Promise<void> {
        console.log("BEGIN");
    }

    async commit(): Promise<void> {
        console.log("COMMIT");
    }

    async rollback(): Promise<void> {
        console.log("ROLLBACK");
    }
}

// MySQL implementations
class MySQLConnection implements Connection {
    constructor(private config: DatabaseConfig) {}

    async connect(): Promise<void> {
        console.log(`MySQL connecting to ${this.config.host}:${this.config.port}`);
    }

    async disconnect(): Promise<void> {
        console.log("MySQL disconnected");
    }
}

class MySQLQueryBuilder implements QueryBuilder {
    select(table: string, columns: string[]): string {
        return `SELECT ${columns.join(", ")} FROM \`${table}\``;
    }

    insert(table: string, data: Record<string, unknown>): string {
        const columns = Object.keys(data).join(", ");
        const values = Object.values(data).map(v => `'${v}'`).join(", ");
        return `INSERT INTO \`${table}\` (${columns}) VALUES (${values})`;
    }
}

class MySQLTransaction implements Transaction {
    constructor(private connection: Connection) {}

    async begin(): Promise<void> {
        console.log("START TRANSACTION");
    }

    async commit(): Promise<void> {
        console.log("COMMIT");
    }

    async rollback(): Promise<void> {
        console.log("ROLLBACK");
    }
}

// Concrete factories
class PostgresFactory implements DatabaseFactory {
    createConnection(config: DatabaseConfig): Connection {
        return new PostgresConnection(config);
    }

    createQueryBuilder(): QueryBuilder {
        return new PostgresQueryBuilder();
    }

    createTransaction(connection: Connection): Transaction {
        return new PostgresTransaction(connection);
    }
}

class MySQLFactory implements DatabaseFactory {
    createConnection(config: DatabaseConfig): Connection {
        return new MySQLConnection(config);
    }

    createQueryBuilder(): QueryBuilder {
        return new MySQLQueryBuilder();
    }

    createTransaction(connection: Connection): Transaction {
        return new MySQLTransaction(connection);
    }
}

// Factory selector
function getDatabaseFactory(type: "postgres" | "mysql"): DatabaseFactory {
    switch (type) {
        case "postgres":
            return new PostgresFactory();
        case "mysql":
            return new MySQLFactory();
    }
}

// Usage - database-agnostic code
async function main(): Promise<void> {
    const factory = getDatabaseFactory("postgres");
    const config: DatabaseConfig = {
        host: "localhost",
        port: 5432,
        database: "mydb",
        username: "user",
        password: "pass",
    };

    const connection = factory.createConnection(config);
    const queryBuilder = factory.createQueryBuilder();
    const transaction = factory.createTransaction(connection);

    await connection.connect();

    const selectQuery = queryBuilder.select("users", ["id", "name", "email"]);
    console.log(selectQuery);
    // PostgreSQL: SELECT id, name, email FROM "users"
    // MySQL: SELECT id, name, email FROM `users`

    await connection.disconnect();
}
```

---

## Builder

Separate the construction of a complex object from its representation so that the same construction process can create different representations.

### When to Use

- Object has many optional parameters
- Object creation involves multiple steps
- Need to create different representations of the same object
- Want immutable objects with many fields

### Fluent Builder

```typescript
// Product
interface HttpRequest {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url: string;
    headers: Record<string, string>;
    body?: unknown;
    timeout: number;
    retries: number;
}

// Builder
class HttpRequestBuilder {
    private method: HttpRequest["method"] = "GET";
    private url = "";
    private headers: Record<string, string> = {};
    private body?: unknown;
    private timeout = 30000;
    private retries = 0;

    setMethod(method: HttpRequest["method"]): this {
        this.method = method;
        return this;
    }

    setUrl(url: string): this {
        this.url = url;
        return this;
    }

    setHeader(key: string, value: string): this {
        this.headers[key] = value;
        return this;
    }

    setHeaders(headers: Record<string, string>): this {
        this.headers = { ...this.headers, ...headers };
        return this;
    }

    setBody(body: unknown): this {
        this.body = body;
        return this;
    }

    setJsonBody(body: unknown): this {
        this.body = body;
        this.headers["Content-Type"] = "application/json";
        return this;
    }

    setTimeout(ms: number): this {
        this.timeout = ms;
        return this;
    }

    setRetries(count: number): this {
        this.retries = count;
        return this;
    }

    // Convenience methods
    withAuth(token: string): this {
        return this.setHeader("Authorization", `Bearer ${token}`);
    }

    build(): HttpRequest {
        if (!this.url) {
            throw new Error("URL is required");
        }

        return {
            method: this.method,
            url: this.url,
            headers: { ...this.headers },
            body: this.body,
            timeout: this.timeout,
            retries: this.retries,
        };
    }
}

// Usage
const request = new HttpRequestBuilder()
    .setMethod("POST")
    .setUrl("https://api.example.com/users")
    .withAuth("my-token")
    .setJsonBody({ name: "John", email: "john@example.com" })
    .setTimeout(5000)
    .setRetries(3)
    .build();

console.log(request);
```

### Builder with Required and Optional Fields

```typescript
// Ensure required fields are set at compile time
interface UserBase {
    email: string;
    password: string;
}

interface UserOptional {
    name?: string;
    avatar?: string;
    phone?: string;
    address?: string;
}

type User = UserBase & UserOptional;

// Type-safe builder with required fields
class UserBuilder {
    private user: Partial<User> = {};

    // Required - returns new builder type
    email(email: string): UserBuilderWithEmail {
        this.user.email = email;
        return new UserBuilderWithEmail(this.user);
    }
}

class UserBuilderWithEmail {
    constructor(private user: Partial<User>) {}

    // Required - returns final builder
    password(password: string): UserBuilderComplete {
        this.user.password = password;
        return new UserBuilderComplete(this.user as User);
    }
}

class UserBuilderComplete {
    constructor(private user: User) {}

    name(name: string): this {
        this.user.name = name;
        return this;
    }

    avatar(avatar: string): this {
        this.user.avatar = avatar;
        return this;
    }

    phone(phone: string): this {
        this.user.phone = phone;
        return this;
    }

    address(address: string): this {
        this.user.address = address;
        return this;
    }

    build(): User {
        return { ...this.user };
    }
}

// Usage - type-safe chain
const user = new UserBuilder()
    .email("john@example.com")  // Must call this first
    .password("secret123")       // Must call this second
    .name("John Doe")            // Optional
    .avatar("https://...")       // Optional
    .build();

// Compile error: can't call build() without email and password
// new UserBuilder().build(); // Error!
// new UserBuilder().email("x").build(); // Error!
```

### Director Pattern

```typescript
// Builder interface
interface QueryBuilder {
    select(columns: string[]): this;
    from(table: string): this;
    where(condition: string): this;
    orderBy(column: string, direction?: "ASC" | "DESC"): this;
    limit(count: number): this;
    offset(count: number): this;
    build(): string;
    reset(): void;
}

// Concrete builder
class SQLQueryBuilder implements QueryBuilder {
    private query: string[] = [];

    select(columns: string[]): this {
        this.query.push(`SELECT ${columns.join(", ")}`);
        return this;
    }

    from(table: string): this {
        this.query.push(`FROM ${table}`);
        return this;
    }

    where(condition: string): this {
        this.query.push(`WHERE ${condition}`);
        return this;
    }

    orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): this {
        this.query.push(`ORDER BY ${column} ${direction}`);
        return this;
    }

    limit(count: number): this {
        this.query.push(`LIMIT ${count}`);
        return this;
    }

    offset(count: number): this {
        this.query.push(`OFFSET ${count}`);
        return this;
    }

    build(): string {
        const result = this.query.join(" ");
        return result;
    }

    reset(): void {
        this.query = [];
    }
}

// Director - knows how to build specific queries
class QueryDirector {
    constructor(private builder: QueryBuilder) {}

    buildUserListQuery(page: number, pageSize: number): string {
        this.builder.reset();
        return this.builder
            .select(["id", "name", "email", "created_at"])
            .from("users")
            .where("deleted_at IS NULL")
            .orderBy("created_at", "DESC")
            .limit(pageSize)
            .offset((page - 1) * pageSize)
            .build();
    }

    buildUserSearchQuery(searchTerm: string): string {
        this.builder.reset();
        return this.builder
            .select(["id", "name", "email"])
            .from("users")
            .where(`name LIKE '%${searchTerm}%' OR email LIKE '%${searchTerm}%'`)
            .orderBy("name")
            .build();
    }

    buildActiveUsersQuery(): string {
        this.builder.reset();
        return this.builder
            .select(["*"])
            .from("users")
            .where("last_login > NOW() - INTERVAL '30 days'")
            .build();
    }
}

// Usage
const builder = new SQLQueryBuilder();
const director = new QueryDirector(builder);

console.log(director.buildUserListQuery(2, 10));
// SELECT id, name, email, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10 OFFSET 10

console.log(director.buildUserSearchQuery("john"));
// SELECT id, name, email FROM users WHERE name LIKE '%john%' OR email LIKE '%john%' ORDER BY name ASC
```

### Configuration Builder

```typescript
// Complex configuration object
interface ServerConfig {
    port: number;
    host: string;
    ssl: {
        enabled: boolean;
        cert?: string;
        key?: string;
    };
    cors: {
        enabled: boolean;
        origins: string[];
        methods: string[];
    };
    rateLimit: {
        enabled: boolean;
        windowMs: number;
        maxRequests: number;
    };
    logging: {
        level: "debug" | "info" | "warn" | "error";
        format: "json" | "text";
    };
}

class ServerConfigBuilder {
    private config: ServerConfig = {
        port: 3000,
        host: "localhost",
        ssl: { enabled: false },
        cors: { enabled: false, origins: [], methods: [] },
        rateLimit: { enabled: false, windowMs: 60000, maxRequests: 100 },
        logging: { level: "info", format: "json" },
    };

    port(port: number): this {
        this.config.port = port;
        return this;
    }

    host(host: string): this {
        this.config.host = host;
        return this;
    }

    enableSSL(cert: string, key: string): this {
        this.config.ssl = { enabled: true, cert, key };
        return this;
    }

    enableCORS(origins: string[], methods: string[] = ["GET", "POST", "PUT", "DELETE"]): this {
        this.config.cors = { enabled: true, origins, methods };
        return this;
    }

    enableRateLimit(windowMs: number, maxRequests: number): this {
        this.config.rateLimit = { enabled: true, windowMs, maxRequests };
        return this;
    }

    logging(level: ServerConfig["logging"]["level"], format: ServerConfig["logging"]["format"]): this {
        this.config.logging = { level, format };
        return this;
    }

    build(): Readonly<ServerConfig> {
        return Object.freeze({ ...this.config });
    }
}

// Preset configurations
class ServerConfigPresets {
    static development(): ServerConfigBuilder {
        return new ServerConfigBuilder()
            .host("localhost")
            .port(3000)
            .enableCORS(["http://localhost:5173"])
            .logging("debug", "text");
    }

    static production(): ServerConfigBuilder {
        return new ServerConfigBuilder()
            .host("0.0.0.0")
            .port(443)
            .enableRateLimit(60000, 100)
            .logging("warn", "json");
    }
}

// Usage
const devConfig = ServerConfigPresets.development()
    .enableRateLimit(60000, 1000)  // Customize preset
    .build();

const prodConfig = ServerConfigPresets.production()
    .enableSSL("/path/to/cert", "/path/to/key")
    .enableCORS(["https://example.com"])
    .build();
```

---

## Prototype

Create new objects by copying existing instances.

### When to Use

- Object creation is expensive (network calls, complex calculations)
- Objects differ only by state
- Need to avoid building class hierarchies of factories
- Runtime configuration determines object type

### Basic Prototype

```typescript
// Prototype interface
interface Prototype<T> {
    clone(): T;
}

// Concrete prototype
class Component implements Prototype<Component> {
    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public style: ComponentStyle
    ) {}

    clone(): Component {
        // Deep clone the style object
        return new Component(
            this.x,
            this.y,
            this.width,
            this.height,
            { ...this.style }
        );
    }

    move(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }

    resize(dw: number, dh: number): void {
        this.width += dw;
        this.height += dh;
    }
}

interface ComponentStyle {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
}

// Usage
const template = new Component(0, 0, 100, 50, {
    backgroundColor: "#fff",
    borderColor: "#000",
    borderWidth: 1,
});

// Clone and customize
const button1 = template.clone();
button1.move(10, 10);

const button2 = template.clone();
button2.move(10, 70);
button2.style.backgroundColor = "#f00";

console.log(template.x, template.y);    // 0, 0 (unchanged)
console.log(button1.x, button1.y);      // 10, 10
console.log(button2.x, button2.y);      // 10, 70
```

### Using structuredClone

```typescript
// Modern JavaScript has structuredClone for deep copying
interface DocumentTemplate {
    title: string;
    sections: Section[];
    metadata: {
        author: string;
        createdAt: Date;
        tags: string[];
    };
}

interface Section {
    heading: string;
    content: string;
    subsections?: Section[];
}

class Document {
    constructor(private template: DocumentTemplate) {}

    clone(): Document {
        // structuredClone handles deep cloning
        const clonedTemplate = structuredClone(this.template);
        clonedTemplate.metadata.createdAt = new Date(); // Reset creation date
        return new Document(clonedTemplate);
    }

    getTemplate(): DocumentTemplate {
        return this.template;
    }

    setTitle(title: string): void {
        this.template.title = title;
    }

    addSection(section: Section): void {
        this.template.sections.push(section);
    }
}

// Prototype registry
class DocumentRegistry {
    private prototypes = new Map<string, Document>();

    register(name: string, prototype: Document): void {
        this.prototypes.set(name, prototype);
    }

    create(name: string): Document {
        const prototype = this.prototypes.get(name);
        if (!prototype) {
            throw new Error(`Unknown document type: ${name}`);
        }
        return prototype.clone();
    }
}

// Usage
const registry = new DocumentRegistry();

// Register templates
registry.register("report", new Document({
    title: "Monthly Report",
    sections: [
        { heading: "Executive Summary", content: "" },
        { heading: "Details", content: "" },
        { heading: "Conclusion", content: "" },
    ],
    metadata: { author: "", createdAt: new Date(), tags: ["report"] },
}));

registry.register("memo", new Document({
    title: "Internal Memo",
    sections: [
        { heading: "Subject", content: "" },
        { heading: "Message", content: "" },
    ],
    metadata: { author: "", createdAt: new Date(), tags: ["memo", "internal"] },
}));

// Create from templates
const report = registry.create("report");
report.setTitle("Q1 2025 Report");
report.getTemplate().metadata.author = "John Doe";

const memo = registry.create("memo");
memo.setTitle("Team Meeting");
```

### Generic Clone Function

```typescript
// Generic deep clone utility
function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as T;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as T;
    }

    if (obj instanceof Map) {
        const clonedMap = new Map();
        obj.forEach((value, key) => {
            clonedMap.set(deepClone(key), deepClone(value));
        });
        return clonedMap as T;
    }

    if (obj instanceof Set) {
        const clonedSet = new Set();
        obj.forEach(value => {
            clonedSet.add(deepClone(value));
        });
        return clonedSet as T;
    }

    // Regular object
    const clonedObj = {} as T;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj;
}

// Usage
interface GameState {
    score: number;
    level: number;
    inventory: Map<string, number>;
    achievements: Set<string>;
    player: {
        position: { x: number; y: number };
        health: number;
    };
}

const initialState: GameState = {
    score: 0,
    level: 1,
    inventory: new Map([["gold", 100], ["potions", 5]]),
    achievements: new Set(["first_login"]),
    player: { position: { x: 0, y: 0 }, health: 100 },
};

const savedState = deepClone(initialState);
savedState.score = 1000;
savedState.inventory.set("gold", 500);

console.log(initialState.score);        // 0 (unchanged)
console.log(initialState.inventory.get("gold")); // 100 (unchanged)
```

---

## TypeScript-Specific Patterns

### Using Partial<T> as Builder Alternative

```typescript
// Sometimes Partial<T> + defaults is simpler than Builder
interface EmailOptions {
    to: string;
    from: string;
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    priority?: "high" | "normal" | "low";
    attachments?: Attachment[];
}

interface Attachment {
    filename: string;
    content: Buffer | string;
}

const defaultEmailOptions: Partial<EmailOptions> = {
    from: "noreply@example.com",
    priority: "normal",
};

function sendEmail(options: Omit<EmailOptions, "from"> & Partial<Pick<EmailOptions, "from">>): void {
    const finalOptions: EmailOptions = {
        ...defaultEmailOptions,
        ...options,
    } as EmailOptions;

    console.log(`Sending email to ${finalOptions.to}`);
    console.log(`From: ${finalOptions.from}`);
    console.log(`Subject: ${finalOptions.subject}`);
}

// Usage - cleaner than builder for simple cases
sendEmail({
    to: "user@example.com",
    subject: "Hello",
    body: "World",
    // from defaults to noreply@example.com
});
```

### satisfies for Factory Validation

```typescript
// Validate factory configuration at compile time
type HandlerMap = Record<string, (data: unknown) => void>;

const handlers = {
    click: (data: unknown) => console.log("Click:", data),
    hover: (data: unknown) => console.log("Hover:", data),
    scroll: (data: unknown) => console.log("Scroll:", data),
} satisfies HandlerMap;

// TypeScript knows specific keys exist
handlers.click({ x: 10, y: 20 }); // OK
// handlers.unknown(); // Error: Property 'unknown' does not exist

// Get handler keys as union type
type EventType = keyof typeof handlers; // "click" | "hover" | "scroll"

function dispatch(event: EventType, data: unknown): void {
    handlers[event](data);
}
```

### Branded Types in Factories

```typescript
// Branded types for type-safe identifiers
type Brand<T, B> = T & { __brand: B };

type UserId = Brand<string, "UserId">;
type ProductId = Brand<string, "ProductId">;
type OrderId = Brand<string, "OrderId">;

// Factory functions create branded types
function createUserId(id: string): UserId {
    // Could add validation here
    return id as UserId;
}

function createProductId(id: string): ProductId {
    return id as ProductId;
}

function createOrderId(id: string): OrderId {
    return id as OrderId;
}

// Functions accept only correct branded types
function getUser(id: UserId): void {
    console.log(`Getting user: ${id}`);
}

function getProduct(id: ProductId): void {
    console.log(`Getting product: ${id}`);
}

// Usage
const userId = createUserId("user-123");
const productId = createProductId("prod-456");

getUser(userId);       // OK
// getUser(productId); // Error! ProductId is not assignable to UserId

// Even though both are strings underneath, TypeScript prevents mixing
const rawString = "some-id";
// getUser(rawString); // Error! string is not assignable to UserId
```

### Object Factory with Type Inference

```typescript
// Factory that preserves literal types
function createConfig<T extends Record<string, unknown>>(config: T): Readonly<T> {
    return Object.freeze(config);
}

const appConfig = createConfig({
    apiUrl: "https://api.example.com",
    maxRetries: 3,
    features: {
        darkMode: true,
        analytics: false,
    },
});

// TypeScript infers exact types
// appConfig.apiUrl is "https://api.example.com" (literal), not string
// appConfig.maxRetries is 3 (literal), not number

type ApiUrl = typeof appConfig.apiUrl; // "https://api.example.com"

// Factory with defaults and overrides
function createWithDefaults<D extends object, O extends Partial<D>>(
    defaults: D,
    overrides?: O
): D & O {
    return { ...defaults, ...overrides } as D & O;
}

interface ButtonProps {
    variant: "primary" | "secondary";
    size: "small" | "medium" | "large";
    disabled: boolean;
}

const defaultButtonProps: ButtonProps = {
    variant: "primary",
    size: "medium",
    disabled: false,
};

const dangerButton = createWithDefaults(defaultButtonProps, {
    variant: "secondary" as const,
});
```

---

## Interview Questions

### Basic Questions

**Q1: What is the Singleton pattern and when should you use it?**

Singleton ensures a class has only one instance with a global access point. Use for shared resources (database connections, logging, configuration). In TypeScript, module exports are natural singletons.

**Q2: What's the difference between Factory Method and Abstract Factory?**

- **Factory Method**: Creates one type of product, lets subclasses decide which class to instantiate
- **Abstract Factory**: Creates families of related products, ensures products from same family are used together

**Q3: When would you use Builder over constructor parameters?**

Use Builder when:
- Object has many optional parameters
- Object construction has multiple steps
- Want to create different representations
- Need validation during construction
- Want immutable result with fluent API

### Intermediate Questions

**Q4: How does TypeScript's module system relate to Singleton?**

TypeScript modules are cached by the runtime (Node.js/bundlers). Exporting an instance from a module effectively creates a singleton - all imports get the same instance.

```typescript
// This is effectively a singleton
export const logger = new Logger();
```

**Q5: Explain the Builder pattern with method chaining.**

```typescript
class Builder {
    private value = "";

    add(s: string): this {   // Returns 'this' for chaining
        this.value += s;
        return this;
    }

    build(): string {
        return this.value;
    }
}

const result = new Builder()
    .add("Hello")
    .add(" ")
    .add("World")
    .build();
```

### Advanced Questions

**Q6: How would you implement a type-safe factory in TypeScript?**

Use discriminated unions with mapped types:

```typescript
interface ShapeMap {
    circle: { radius: number };
    rectangle: { width: number; height: number };
}

function createShape<T extends keyof ShapeMap>(
    type: T,
    props: ShapeMap[T]
): ShapeMap[T] & { type: T } {
    return { type, ...props };
}

const circle = createShape("circle", { radius: 5 });
// TypeScript knows: { type: "circle"; radius: number }
```

**Q7: What are the downsides of Singleton pattern?**

1. **Hard to test** - Global state, hard to mock
2. **Hidden dependencies** - Not clear from constructor
3. **Threading issues** - In concurrent environments
4. **Violates SRP** - Manages own lifecycle + business logic
5. **Tight coupling** - Code depends on concrete singleton

**Q8: How does Prototype differ from Factory?**

- **Prototype**: Creates objects by cloning existing instances
- **Factory**: Creates objects from scratch using constructors

Prototype is useful when object creation is expensive and instances differ only by state.

---

## Quick Reference

### Pattern Summary

| Pattern | Intent | TypeScript Feature |
|---------|--------|-------------------|
| Singleton | One instance globally | Module exports |
| Factory Method | Defer to subclass | Functions, switch |
| Abstract Factory | Family of products | Interface + implementations |
| Builder | Step-by-step construction | Fluent interface, `this` return |
| Prototype | Clone existing objects | `structuredClone`, spread |

### When to Use Each Pattern

```
Object Creation Decision:
│
├── Need single global instance?
│   └── Yes → Singleton
│
├── Need to create family of related objects?
│   └── Yes → Abstract Factory
│
├── Object type depends on runtime condition?
│   └── Yes → Factory Method
│
├── Object has many configuration options?
│   └── Yes → Builder
│
└── Creating object is expensive, need copies?
    └── Yes → Prototype
```

### Common Mistakes

| Pattern | Mistake | Better Approach |
|---------|---------|-----------------|
| Singleton | Using for everything | Use dependency injection |
| Factory | Complex switch statements | Register creators dynamically |
| Builder | Not validating in build() | Add validation before return |
| Prototype | Shallow clone when deep needed | Use `structuredClone` |
| All | Overusing patterns | Start simple, refactor when needed |
