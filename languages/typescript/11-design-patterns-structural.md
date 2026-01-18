# TypeScript Structural Design Patterns

> Patterns for composing classes and objects into larger structures

Structural patterns explain how to assemble objects and classes into larger structures while keeping these structures flexible and efficient.

---

## Table of Contents

1. [Pattern Selection Guide](#pattern-selection-guide)
2. [Adapter](#adapter)
3. [Bridge](#bridge)
4. [Composite](#composite)
5. [Decorator](#decorator)
6. [Facade](#facade)
7. [Flyweight](#flyweight)
8. [Proxy](#proxy)
9. [Interview Questions](#interview-questions)
10. [Quick Reference](#quick-reference)

---

## Pattern Selection Guide

### Decision Tree

```
Need to compose structures?
│
├── Making incompatible interfaces work together? → Adapter
│
├── Separating abstraction from implementation? → Bridge
│
├── Treating individual objects and compositions uniformly? → Composite
│
├── Adding behavior without changing class? → Decorator
│
├── Simplifying a complex subsystem? → Facade
│
├── Sharing state to reduce memory? → Flyweight
│
└── Controlling access to an object? → Proxy
```

### Quick Decision Table

| Pattern | Use When | Key Benefit |
|---------|----------|-------------|
| Adapter | Interface mismatch | Compatibility |
| Bridge | Multiple dimensions of variation | Flexibility |
| Composite | Tree structures | Uniformity |
| Decorator | Dynamic behavior addition | Composition |
| Facade | Complex subsystem | Simplicity |
| Flyweight | Many similar objects | Memory efficiency |
| Proxy | Access control, lazy loading | Control |

---

## Adapter

Convert the interface of a class into another interface clients expect. Adapter lets classes work together that couldn't otherwise because of incompatible interfaces.

### When to Use

- Working with legacy code or third-party libraries
- Interface of existing class doesn't match what you need
- Creating reusable class that cooperates with unrelated classes

### Object Adapter (Composition)

```typescript
// Target interface - what client expects
interface MediaPlayer {
    play(file: string): void;
    pause(): void;
    stop(): void;
    getPosition(): number;
}

// Adaptee - existing class with incompatible interface
class LegacyAudioPlayer {
    playAudio(audioFile: string): void {
        console.log(`Playing audio: ${audioFile}`);
    }

    pauseAudio(): void {
        console.log("Audio paused");
    }

    stopAudio(): void {
        console.log("Audio stopped");
    }

    getCurrentTimestamp(): number {
        return Date.now();
    }
}

// Another adaptee
class ExternalVideoPlayer {
    startVideo(path: string): void {
        console.log(`Starting video: ${path}`);
    }

    freeze(): void {
        console.log("Video frozen");
    }

    terminate(): void {
        console.log("Video terminated");
    }

    getPlaybackTime(): number {
        return 0;
    }
}

// Adapters - convert interface
class LegacyAudioAdapter implements MediaPlayer {
    constructor(private player: LegacyAudioPlayer) {}

    play(file: string): void {
        this.player.playAudio(file);
    }

    pause(): void {
        this.player.pauseAudio();
    }

    stop(): void {
        this.player.stopAudio();
    }

    getPosition(): number {
        return this.player.getCurrentTimestamp();
    }
}

class ExternalVideoAdapter implements MediaPlayer {
    constructor(private player: ExternalVideoPlayer) {}

    play(file: string): void {
        this.player.startVideo(file);
    }

    pause(): void {
        this.player.freeze();
    }

    stop(): void {
        this.player.terminate();
    }

    getPosition(): number {
        return this.player.getPlaybackTime();
    }
}

// Client code works with unified interface
class MediaController {
    private player: MediaPlayer | null = null;

    setPlayer(player: MediaPlayer): void {
        this.player = player;
    }

    playMedia(file: string): void {
        if (!this.player) throw new Error("No player set");
        this.player.play(file);
    }

    pauseMedia(): void {
        this.player?.pause();
    }

    stopMedia(): void {
        this.player?.stop();
    }
}

// Usage
const controller = new MediaController();

// Play audio with legacy player
controller.setPlayer(new LegacyAudioAdapter(new LegacyAudioPlayer()));
controller.playMedia("song.mp3");

// Play video with external player
controller.setPlayer(new ExternalVideoAdapter(new ExternalVideoPlayer()));
controller.playMedia("movie.mp4");
```

### Function Adapter

```typescript
// Adapting function signatures
type OldCallback = (error: Error | null, result: string) => void;
type NewCallback = (result: { success: boolean; data?: string; error?: string }) => void;

// Adapter function
function adaptCallback(oldStyleFn: (callback: OldCallback) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        oldStyleFn((error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

// Legacy function with callback
function legacyFetch(url: string, callback: OldCallback): void {
    setTimeout(() => {
        if (url.includes("error")) {
            callback(new Error("Failed to fetch"), "");
        } else {
            callback(null, `Data from ${url}`);
        }
    }, 100);
}

// Use with modern async/await
async function modernFetch(url: string): Promise<string> {
    return adaptCallback((callback) => legacyFetch(url, callback));
}

// Usage
async function main(): Promise<void> {
    const data = await modernFetch("https://api.example.com/data");
    console.log(data);
}
```

### API Response Adapter

```typescript
// External API response format
interface ExternalUserResponse {
    user_id: string;
    first_name: string;
    last_name: string;
    email_address: string;
    created_timestamp: number;
    is_active: boolean;
}

// Internal domain model
interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    active: boolean;
}

// Adapter class
class UserApiAdapter {
    static toInternal(external: ExternalUserResponse): User {
        return {
            id: external.user_id,
            name: `${external.first_name} ${external.last_name}`,
            email: external.email_address,
            createdAt: new Date(external.created_timestamp),
            active: external.is_active,
        };
    }

    static toExternal(internal: User): ExternalUserResponse {
        const [firstName, ...lastNameParts] = internal.name.split(" ");
        return {
            user_id: internal.id,
            first_name: firstName,
            last_name: lastNameParts.join(" "),
            email_address: internal.email,
            created_timestamp: internal.createdAt.getTime(),
            is_active: internal.active,
        };
    }

    static toInternalList(externals: ExternalUserResponse[]): User[] {
        return externals.map(this.toInternal);
    }
}

// Usage
const apiResponse: ExternalUserResponse = {
    user_id: "123",
    first_name: "John",
    last_name: "Doe",
    email_address: "john@example.com",
    created_timestamp: 1609459200000,
    is_active: true,
};

const user = UserApiAdapter.toInternal(apiResponse);
console.log(user.name); // "John Doe"
```

---

## Bridge

Decouple an abstraction from its implementation so that the two can vary independently.

### When to Use

- Want to divide a monolithic class into several class hierarchies
- Need to extend class in several orthogonal dimensions
- Want to switch implementations at runtime

### Notification Bridge

```typescript
// Implementation interface
interface MessageSender {
    send(recipient: string, content: string): Promise<void>;
}

// Concrete implementations
class EmailSender implements MessageSender {
    async send(recipient: string, content: string): Promise<void> {
        console.log(`Email to ${recipient}: ${content}`);
    }
}

class SMSSender implements MessageSender {
    async send(recipient: string, content: string): Promise<void> {
        console.log(`SMS to ${recipient}: ${content}`);
    }
}

class PushSender implements MessageSender {
    async send(recipient: string, content: string): Promise<void> {
        console.log(`Push notification to ${recipient}: ${content}`);
    }
}

class SlackSender implements MessageSender {
    async send(recipient: string, content: string): Promise<void> {
        console.log(`Slack message to ${recipient}: ${content}`);
    }
}

// Abstraction
abstract class Notification {
    constructor(protected sender: MessageSender) {}

    abstract notify(recipient: string): Promise<void>;

    // Can change sender at runtime
    setSender(sender: MessageSender): void {
        this.sender = sender;
    }
}

// Refined abstractions
class AlertNotification extends Notification {
    constructor(
        sender: MessageSender,
        private severity: "low" | "medium" | "high"
    ) {
        super(sender);
    }

    async notify(recipient: string): Promise<void> {
        const prefix = this.severity === "high" ? "URGENT: " : "";
        await this.sender.send(recipient, `${prefix}Alert notification`);
    }
}

class ReminderNotification extends Notification {
    constructor(
        sender: MessageSender,
        private reminderText: string,
        private dueDate: Date
    ) {
        super(sender);
    }

    async notify(recipient: string): Promise<void> {
        const formattedDate = this.dueDate.toLocaleDateString();
        await this.sender.send(
            recipient,
            `Reminder: ${this.reminderText} (Due: ${formattedDate})`
        );
    }
}

class MarketingNotification extends Notification {
    constructor(
        sender: MessageSender,
        private campaign: string,
        private offer: string
    ) {
        super(sender);
    }

    async notify(recipient: string): Promise<void> {
        await this.sender.send(
            recipient,
            `${this.campaign}: ${this.offer}`
        );
    }
}

// Usage - mix any notification type with any sender
async function main(): Promise<void> {
    // High priority alert via SMS
    const smsAlert = new AlertNotification(new SMSSender(), "high");
    await smsAlert.notify("+1234567890");

    // Marketing via email
    const emailMarketing = new MarketingNotification(
        new EmailSender(),
        "Summer Sale",
        "Get 50% off!"
    );
    await emailMarketing.notify("customer@example.com");

    // Reminder via Slack
    const slackReminder = new ReminderNotification(
        new SlackSender(),
        "Team meeting",
        new Date("2025-03-15")
    );
    await slackReminder.notify("@team-channel");

    // Switch sender at runtime
    smsAlert.setSender(new PushSender());
    await smsAlert.notify("user-device-token");
}
```

### Renderer Bridge

```typescript
// Rendering implementation
interface Renderer {
    renderCircle(x: number, y: number, radius: number): void;
    renderRectangle(x: number, y: number, width: number, height: number): void;
    renderText(x: number, y: number, text: string): void;
}

// Concrete renderers
class SVGRenderer implements Renderer {
    renderCircle(x: number, y: number, radius: number): void {
        console.log(`<circle cx="${x}" cy="${y}" r="${radius}" />`);
    }

    renderRectangle(x: number, y: number, width: number, height: number): void {
        console.log(`<rect x="${x}" y="${y}" width="${width}" height="${height}" />`);
    }

    renderText(x: number, y: number, text: string): void {
        console.log(`<text x="${x}" y="${y}">${text}</text>`);
    }
}

class CanvasRenderer implements Renderer {
    renderCircle(x: number, y: number, radius: number): void {
        console.log(`ctx.arc(${x}, ${y}, ${radius}, 0, Math.PI * 2)`);
    }

    renderRectangle(x: number, y: number, width: number, height: number): void {
        console.log(`ctx.fillRect(${x}, ${y}, ${width}, ${height})`);
    }

    renderText(x: number, y: number, text: string): void {
        console.log(`ctx.fillText("${text}", ${x}, ${y})`);
    }
}

// Shape abstraction
abstract class Shape {
    constructor(protected renderer: Renderer) {}

    abstract draw(): void;
}

// Concrete shapes
class Circle extends Shape {
    constructor(
        renderer: Renderer,
        private x: number,
        private y: number,
        private radius: number
    ) {
        super(renderer);
    }

    draw(): void {
        this.renderer.renderCircle(this.x, this.y, this.radius);
    }
}

class Rectangle extends Shape {
    constructor(
        renderer: Renderer,
        private x: number,
        private y: number,
        private width: number,
        private height: number
    ) {
        super(renderer);
    }

    draw(): void {
        this.renderer.renderRectangle(this.x, this.y, this.width, this.height);
    }
}

// Usage
const svgRenderer = new SVGRenderer();
const canvasRenderer = new CanvasRenderer();

const shapes: Shape[] = [
    new Circle(svgRenderer, 100, 100, 50),
    new Rectangle(svgRenderer, 200, 200, 100, 50),
    new Circle(canvasRenderer, 100, 100, 50),
    new Rectangle(canvasRenderer, 200, 200, 100, 50),
];

shapes.forEach(shape => shape.draw());
```

---

## Composite

Compose objects into tree structures to represent part-whole hierarchies. Composite lets clients treat individual objects and compositions of objects uniformly.

### When to Use

- Representing hierarchies of objects
- Want clients to treat individual and composite objects uniformly
- Working with tree-like structures (file systems, UI components, organizations)

### File System Example

```typescript
// Component interface
interface FileSystemItem {
    name: string;
    getSize(): number;
    print(indent?: string): void;
}

// Leaf - File
class File implements FileSystemItem {
    constructor(
        public name: string,
        private size: number
    ) {}

    getSize(): number {
        return this.size;
    }

    print(indent = ""): void {
        console.log(`${indent}📄 ${this.name} (${this.size} bytes)`);
    }
}

// Composite - Directory
class Directory implements FileSystemItem {
    private children: FileSystemItem[] = [];

    constructor(public name: string) {}

    add(item: FileSystemItem): void {
        this.children.push(item);
    }

    remove(item: FileSystemItem): void {
        const index = this.children.indexOf(item);
        if (index > -1) {
            this.children.splice(index, 1);
        }
    }

    getSize(): number {
        return this.children.reduce((total, child) => total + child.getSize(), 0);
    }

    print(indent = ""): void {
        console.log(`${indent}📁 ${this.name}/`);
        this.children.forEach(child => child.print(indent + "  "));
    }

    find(name: string): FileSystemItem | undefined {
        for (const child of this.children) {
            if (child.name === name) return child;
            if (child instanceof Directory) {
                const found = child.find(name);
                if (found) return found;
            }
        }
        return undefined;
    }
}

// Usage
const root = new Directory("root");
const home = new Directory("home");
const user = new Directory("user");
const documents = new Directory("documents");

documents.add(new File("resume.pdf", 102400));
documents.add(new File("cover_letter.docx", 51200));

user.add(documents);
user.add(new File(".bashrc", 1024));

home.add(user);
root.add(home);
root.add(new File("README.md", 2048));

root.print();
// 📁 root/
//   📁 home/
//     📁 user/
//       📁 documents/
//         📄 resume.pdf (102400 bytes)
//         📄 cover_letter.docx (51200 bytes)
//       📄 .bashrc (1024 bytes)
//   📄 README.md (2048 bytes)

console.log(`Total size: ${root.getSize()} bytes`);
```

### UI Component Tree

```typescript
// Component interface
interface UIComponent {
    render(): string;
    addClass(className: string): void;
    getClasses(): string[];
}

// Leaf components
class Button implements UIComponent {
    private classes: string[] = ["btn"];

    constructor(private label: string) {}

    render(): string {
        return `<button class="${this.classes.join(" ")}">${this.label}</button>`;
    }

    addClass(className: string): void {
        this.classes.push(className);
    }

    getClasses(): string[] {
        return [...this.classes];
    }
}

class TextInput implements UIComponent {
    private classes: string[] = ["input"];

    constructor(
        private placeholder: string,
        private name: string
    ) {}

    render(): string {
        return `<input class="${this.classes.join(" ")}" placeholder="${this.placeholder}" name="${this.name}" />`;
    }

    addClass(className: string): void {
        this.classes.push(className);
    }

    getClasses(): string[] {
        return [...this.classes];
    }
}

class Label implements UIComponent {
    private classes: string[] = ["label"];

    constructor(
        private text: string,
        private forInput: string
    ) {}

    render(): string {
        return `<label class="${this.classes.join(" ")}" for="${this.forInput}">${this.text}</label>`;
    }

    addClass(className: string): void {
        this.classes.push(className);
    }

    getClasses(): string[] {
        return [...this.classes];
    }
}

// Composite components
class Container implements UIComponent {
    private children: UIComponent[] = [];
    private classes: string[] = ["container"];

    constructor(private tag: string = "div") {}

    add(component: UIComponent): this {
        this.children.push(component);
        return this;
    }

    render(): string {
        const childrenHtml = this.children.map(c => c.render()).join("\n  ");
        return `<${this.tag} class="${this.classes.join(" ")}">
  ${childrenHtml}
</${this.tag}>`;
    }

    addClass(className: string): void {
        this.classes.push(className);
    }

    getClasses(): string[] {
        return [...this.classes];
    }
}

class Form extends Container {
    constructor(private action: string, private method: string = "POST") {
        super("form");
    }

    render(): string {
        const baseRender = super.render();
        return baseRender.replace(
            "<form",
            `<form action="${this.action}" method="${this.method}"`
        );
    }
}

// Build a form
const form = new Form("/submit");
form.addClass("login-form");

const usernameGroup = new Container();
usernameGroup.addClass("form-group");
usernameGroup.add(new Label("Username", "username"));
usernameGroup.add(new TextInput("Enter username", "username"));

const passwordGroup = new Container();
passwordGroup.addClass("form-group");
passwordGroup.add(new Label("Password", "password"));
passwordGroup.add(new TextInput("Enter password", "password"));

const submitBtn = new Button("Login");
submitBtn.addClass("btn-primary");

form.add(usernameGroup);
form.add(passwordGroup);
form.add(submitBtn);

console.log(form.render());
```

### Generic Composite

```typescript
// Generic composite for any hierarchical data
interface TreeNode<T> {
    value: T;
    children: TreeNode<T>[];
}

class CompositeNode<T> implements TreeNode<T> {
    children: CompositeNode<T>[] = [];

    constructor(public value: T) {}

    add(node: CompositeNode<T>): this {
        this.children.push(node);
        return this;
    }

    // Tree operations
    traverse(fn: (node: TreeNode<T>, depth: number) => void, depth = 0): void {
        fn(this, depth);
        this.children.forEach(child => child.traverse(fn, depth + 1));
    }

    find(predicate: (value: T) => boolean): CompositeNode<T> | undefined {
        if (predicate(this.value)) return this;
        for (const child of this.children) {
            const found = child.find(predicate);
            if (found) return found;
        }
        return undefined;
    }

    map<U>(fn: (value: T) => U): CompositeNode<U> {
        const newNode = new CompositeNode(fn(this.value));
        this.children.forEach(child => {
            newNode.add(child.map(fn));
        });
        return newNode;
    }

    reduce<U>(fn: (acc: U, value: T) => U, initial: U): U {
        let result = fn(initial, this.value);
        this.children.forEach(child => {
            result = child.reduce(fn, result);
        });
        return result;
    }
}

// Usage: Organization chart
interface Employee {
    name: string;
    title: string;
    salary: number;
}

const ceo = new CompositeNode<Employee>({
    name: "Alice",
    title: "CEO",
    salary: 250000,
});

const cto = new CompositeNode<Employee>({
    name: "Bob",
    title: "CTO",
    salary: 200000,
});

const devLead = new CompositeNode<Employee>({
    name: "Charlie",
    title: "Dev Lead",
    salary: 150000,
});

devLead.add(new CompositeNode({ name: "Dave", title: "Developer", salary: 100000 }));
devLead.add(new CompositeNode({ name: "Eve", title: "Developer", salary: 100000 }));

cto.add(devLead);
ceo.add(cto);

// Calculate total salary
const totalSalary = ceo.reduce((sum, emp) => sum + emp.salary, 0);
console.log(`Total salary: $${totalSalary}`);

// Find an employee
const found = ceo.find(emp => emp.name === "Charlie");
console.log(`Found: ${found?.value.title}`);

// Print org chart
ceo.traverse((node, depth) => {
    const indent = "  ".repeat(depth);
    console.log(`${indent}${node.value.name} - ${node.value.title}`);
});
```

---

## Decorator

Attach additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality.

### When to Use

- Add responsibilities to objects without affecting other objects
- Responsibilities can be withdrawn
- Extension by subclassing is impractical

### Important: TypeScript Decorators vs Decorator Pattern

```typescript
// TypeScript decorators (@decorator) are different from Decorator pattern!
// TypeScript decorators: Metaprogramming feature for classes/methods
// Decorator pattern: Object composition for adding behavior

// This file covers the Decorator PATTERN (object composition)
// See 07-modern-typescript.md for TypeScript decorator syntax
```

### Service Decorator

```typescript
// Component interface
interface DataService {
    getData(key: string): Promise<string | null>;
    setData(key: string, value: string): Promise<void>;
}

// Concrete component
class DatabaseService implements DataService {
    private data = new Map<string, string>();

    async getData(key: string): Promise<string | null> {
        console.log(`[DB] Reading key: ${key}`);
        return this.data.get(key) ?? null;
    }

    async setData(key: string, value: string): Promise<void> {
        console.log(`[DB] Writing key: ${key}`);
        this.data.set(key, value);
    }
}

// Base decorator
abstract class DataServiceDecorator implements DataService {
    constructor(protected wrapped: DataService) {}

    async getData(key: string): Promise<string | null> {
        return this.wrapped.getData(key);
    }

    async setData(key: string, value: string): Promise<void> {
        return this.wrapped.setData(key, value);
    }
}

// Caching decorator
class CachingDecorator extends DataServiceDecorator {
    private cache = new Map<string, { value: string; expiry: number }>();
    private ttl: number;

    constructor(wrapped: DataService, ttlMs = 60000) {
        super(wrapped);
        this.ttl = ttlMs;
    }

    async getData(key: string): Promise<string | null> {
        const cached = this.cache.get(key);
        if (cached && cached.expiry > Date.now()) {
            console.log(`[Cache] Hit for key: ${key}`);
            return cached.value;
        }
        console.log(`[Cache] Miss for key: ${key}`);

        const value = await this.wrapped.getData(key);
        if (value) {
            this.cache.set(key, { value, expiry: Date.now() + this.ttl });
        }
        return value;
    }

    async setData(key: string, value: string): Promise<void> {
        this.cache.delete(key); // Invalidate cache
        await this.wrapped.setData(key, value);
    }
}

// Logging decorator
class LoggingDecorator extends DataServiceDecorator {
    async getData(key: string): Promise<string | null> {
        const start = Date.now();
        const result = await this.wrapped.getData(key);
        const duration = Date.now() - start;
        console.log(`[Log] getData(${key}) took ${duration}ms, found: ${result !== null}`);
        return result;
    }

    async setData(key: string, value: string): Promise<void> {
        const start = Date.now();
        await this.wrapped.setData(key, value);
        const duration = Date.now() - start;
        console.log(`[Log] setData(${key}) took ${duration}ms`);
    }
}

// Retry decorator
class RetryDecorator extends DataServiceDecorator {
    constructor(
        wrapped: DataService,
        private maxRetries = 3,
        private delayMs = 100
    ) {
        super(wrapped);
    }

    async getData(key: string): Promise<string | null> {
        return this.withRetry(() => this.wrapped.getData(key));
    }

    async setData(key: string, value: string): Promise<void> {
        return this.withRetry(() => this.wrapped.setData(key, value));
    }

    private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                console.log(`[Retry] Attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }
        }

        throw lastError;
    }
}

// Compose decorators
const service: DataService = new LoggingDecorator(
    new CachingDecorator(
        new RetryDecorator(
            new DatabaseService()
        ),
        5000 // 5 second cache
    )
);

// Usage
async function main(): Promise<void> {
    await service.setData("user:1", "John Doe");
    await service.getData("user:1"); // Cache miss
    await service.getData("user:1"); // Cache hit
}

main();
```

### Function Decorator Pattern

```typescript
// Decorator as higher-order function
type AsyncFn<T extends unknown[], R> = (...args: T) => Promise<R>;

// Timing decorator
function withTiming<T extends unknown[], R>(
    fn: AsyncFn<T, R>,
    name?: string
): AsyncFn<T, R> {
    return async (...args: T): Promise<R> => {
        const start = performance.now();
        try {
            return await fn(...args);
        } finally {
            const duration = performance.now() - start;
            console.log(`${name ?? fn.name} took ${duration.toFixed(2)}ms`);
        }
    };
}

// Caching decorator
function withCache<T extends unknown[], R>(
    fn: AsyncFn<T, R>,
    keyFn: (...args: T) => string,
    ttlMs = 60000
): AsyncFn<T, R> {
    const cache = new Map<string, { value: R; expiry: number }>();

    return async (...args: T): Promise<R> => {
        const key = keyFn(...args);
        const cached = cache.get(key);

        if (cached && cached.expiry > Date.now()) {
            return cached.value;
        }

        const value = await fn(...args);
        cache.set(key, { value, expiry: Date.now() + ttlMs });
        return value;
    };
}

// Error handling decorator
function withErrorHandling<T extends unknown[], R>(
    fn: AsyncFn<T, R>,
    fallback: R
): AsyncFn<T, R> {
    return async (...args: T): Promise<R> => {
        try {
            return await fn(...args);
        } catch (error) {
            console.error(`Error in ${fn.name}:`, error);
            return fallback;
        }
    };
}

// Compose decorators
function compose<T extends unknown[], R>(
    fn: AsyncFn<T, R>,
    ...decorators: ((fn: AsyncFn<T, R>) => AsyncFn<T, R>)[]
): AsyncFn<T, R> {
    return decorators.reduce((decorated, decorator) => decorator(decorated), fn);
}

// Usage
async function fetchUser(id: string): Promise<{ id: string; name: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    if (id === "error") throw new Error("User not found");
    return { id, name: `User ${id}` };
}

const enhancedFetchUser = compose(
    fetchUser,
    (fn) => withTiming(fn, "fetchUser"),
    (fn) => withCache(fn, (id) => `user:${id}`, 30000),
    (fn) => withErrorHandling(fn, { id: "unknown", name: "Unknown User" })
);

async function main(): Promise<void> {
    console.log(await enhancedFetchUser("123")); // Fetches and caches
    console.log(await enhancedFetchUser("123")); // Returns cached
    console.log(await enhancedFetchUser("error")); // Returns fallback
}
```

---

## Facade

Provide a unified interface to a set of interfaces in a subsystem. Facade defines a higher-level interface that makes the subsystem easier to use.

### When to Use

- Want to provide simple interface to complex subsystem
- Many dependencies between clients and implementation classes
- Want to layer your subsystems

### Video Conversion Facade

```typescript
// Complex subsystem classes
class VideoFile {
    constructor(public filename: string) {}

    getCodecType(): string {
        const ext = this.filename.split(".").pop();
        return ext === "mp4" ? "MPEG4" : ext === "ogg" ? "OGG" : "UNKNOWN";
    }
}

class CodecFactory {
    static extract(file: VideoFile): Codec {
        const type = file.getCodecType();
        if (type === "MPEG4") {
            return new MPEG4CompressionCodec();
        }
        return new OggCompressionCodec();
    }
}

interface Codec {
    type: string;
}

class MPEG4CompressionCodec implements Codec {
    type = "MPEG4";
}

class OggCompressionCodec implements Codec {
    type = "OGG";
}

class BitrateReader {
    static read(file: VideoFile, codec: Codec): VideoBuffer {
        console.log(`Reading ${file.filename} with ${codec.type} codec`);
        return new VideoBuffer();
    }

    static convert(buffer: VideoBuffer, codec: Codec): VideoBuffer {
        console.log(`Converting buffer to ${codec.type}`);
        return new VideoBuffer();
    }
}

class VideoBuffer {
    data = new Uint8Array(1024);
}

class AudioMixer {
    fix(buffer: VideoBuffer): VideoBuffer {
        console.log("Fixing audio...");
        return buffer;
    }
}

// Facade - simplifies the complex subsystem
class VideoConverter {
    convert(filename: string, format: string): File {
        console.log(`\nConverting ${filename} to ${format}...`);

        const file = new VideoFile(filename);
        const sourceCodec = CodecFactory.extract(file);

        let destinationCodec: Codec;
        if (format === "mp4") {
            destinationCodec = new MPEG4CompressionCodec();
        } else {
            destinationCodec = new OggCompressionCodec();
        }

        const buffer = BitrateReader.read(file, sourceCodec);
        let result = BitrateReader.convert(buffer, destinationCodec);

        const audioMixer = new AudioMixer();
        result = audioMixer.fix(result);

        const outputFilename = filename.replace(/\.[^.]+$/, `.${format}`);
        console.log(`Conversion complete: ${outputFilename}`);

        return new File([result.data], outputFilename);
    }
}

// Usage - simple interface hides complexity
const converter = new VideoConverter();
const mp4File = converter.convert("video.ogg", "mp4");
const oggFile = converter.convert("movie.mp4", "ogg");
```

### API Client Facade

```typescript
// Complex subsystems
class AuthService {
    private token: string | null = null;

    async login(username: string, password: string): Promise<string> {
        console.log(`Authenticating ${username}...`);
        this.token = `token_${Date.now()}`;
        return this.token;
    }

    getToken(): string | null {
        return this.token;
    }

    isAuthenticated(): boolean {
        return this.token !== null;
    }
}

class HttpClient {
    async get<T>(url: string, headers: Record<string, string>): Promise<T> {
        console.log(`GET ${url}`);
        return {} as T;
    }

    async post<T>(url: string, data: unknown, headers: Record<string, string>): Promise<T> {
        console.log(`POST ${url}`);
        return {} as T;
    }

    async put<T>(url: string, data: unknown, headers: Record<string, string>): Promise<T> {
        console.log(`PUT ${url}`);
        return {} as T;
    }

    async delete<T>(url: string, headers: Record<string, string>): Promise<T> {
        console.log(`DELETE ${url}`);
        return {} as T;
    }
}

class CacheManager {
    private cache = new Map<string, { data: unknown; expiry: number }>();

    get<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && cached.expiry > Date.now()) {
            return cached.data as T;
        }
        return null;
    }

    set(key: string, data: unknown, ttl: number): void {
        this.cache.set(key, { data, expiry: Date.now() + ttl });
    }

    invalidate(pattern: string): void {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
}

class RetryHandler {
    async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
        let lastError: Error | undefined;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
            }
        }
        throw lastError;
    }
}

// Facade - unified API
class ApiClient {
    private authService = new AuthService();
    private httpClient = new HttpClient();
    private cache = new CacheManager();
    private retryHandler = new RetryHandler();

    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async login(username: string, password: string): Promise<void> {
        await this.authService.login(username, password);
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        const token = this.authService.getToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    }

    async get<T>(endpoint: string, useCache = true, cacheTtl = 60000): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        if (useCache) {
            const cached = this.cache.get<T>(url);
            if (cached) {
                console.log(`[Cache hit] ${endpoint}`);
                return cached;
            }
        }

        const data = await this.retryHandler.withRetry(() =>
            this.httpClient.get<T>(url, this.getHeaders())
        );

        if (useCache) {
            this.cache.set(url, data, cacheTtl);
        }

        return data;
    }

    async post<T>(endpoint: string, data: unknown): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        this.cache.invalidate(endpoint.split("/")[1]); // Invalidate related cache
        return this.retryHandler.withRetry(() =>
            this.httpClient.post<T>(url, data, this.getHeaders())
        );
    }

    async put<T>(endpoint: string, data: unknown): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        this.cache.invalidate(endpoint);
        return this.retryHandler.withRetry(() =>
            this.httpClient.put<T>(url, data, this.getHeaders())
        );
    }

    async delete<T>(endpoint: string): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        this.cache.invalidate(endpoint);
        return this.retryHandler.withRetry(() =>
            this.httpClient.delete<T>(url, this.getHeaders())
        );
    }
}

// Usage - simple unified interface
interface User {
    id: string;
    name: string;
}

async function main(): Promise<void> {
    const api = new ApiClient("https://api.example.com");

    await api.login("admin", "password");

    const users = await api.get<User[]>("/users");
    const user = await api.get<User>("/users/123");
    await api.post<User>("/users", { name: "John" });
    await api.put<User>("/users/123", { name: "Jane" });
    await api.delete("/users/123");
}
```

---

## Flyweight

Use sharing to support large numbers of fine-grained objects efficiently.

### When to Use

- Application uses large number of objects
- Storage costs are high because of sheer quantity
- Most object state can be made extrinsic
- Many objects can be replaced by few shared objects

### Text Editor Characters

```typescript
// Flyweight - intrinsic state (shared)
class CharacterStyle {
    constructor(
        public readonly fontFamily: string,
        public readonly fontSize: number,
        public readonly color: string,
        public readonly bold: boolean,
        public readonly italic: boolean
    ) {}

    // Unique key for this style combination
    getKey(): string {
        return `${this.fontFamily}:${this.fontSize}:${this.color}:${this.bold}:${this.italic}`;
    }
}

// Flyweight factory
class StyleFactory {
    private styles = new Map<string, CharacterStyle>();

    getStyle(
        fontFamily: string,
        fontSize: number,
        color: string,
        bold: boolean,
        italic: boolean
    ): CharacterStyle {
        const key = `${fontFamily}:${fontSize}:${color}:${bold}:${italic}`;

        if (!this.styles.has(key)) {
            this.styles.set(
                key,
                new CharacterStyle(fontFamily, fontSize, color, bold, italic)
            );
            console.log(`Created new style: ${key}`);
        }

        return this.styles.get(key)!;
    }

    getStyleCount(): number {
        return this.styles.size;
    }
}

// Context - extrinsic state (unique per instance)
class Character {
    constructor(
        public readonly char: string,
        public readonly style: CharacterStyle,
        public position: { x: number; y: number }
    ) {}

    render(): void {
        console.log(
            `'${this.char}' at (${this.position.x}, ${this.position.y}) ` +
            `[${this.style.fontFamily} ${this.style.fontSize}px ${this.style.color}]`
        );
    }
}

// Document using flyweight
class TextDocument {
    private characters: Character[] = [];
    private styleFactory = new StyleFactory();

    addCharacter(
        char: string,
        x: number,
        y: number,
        fontFamily: string,
        fontSize: number,
        color: string,
        bold = false,
        italic = false
    ): void {
        const style = this.styleFactory.getStyle(fontFamily, fontSize, color, bold, italic);
        this.characters.push(new Character(char, style, { x, y }));
    }

    render(): void {
        this.characters.forEach(char => char.render());
    }

    getStats(): { characterCount: number; uniqueStyles: number } {
        return {
            characterCount: this.characters.length,
            uniqueStyles: this.styleFactory.getStyleCount(),
        };
    }
}

// Usage
const doc = new TextDocument();

// Add many characters with shared styles
const text = "Hello World";
for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // Most characters share the same style
    doc.addCharacter(char, i * 10, 0, "Arial", 12, "black");
}

// Add some styled text
const styledText = "Important!";
for (let i = 0; i < styledText.length; i++) {
    doc.addCharacter(styledText[i], i * 10, 20, "Arial", 14, "red", true);
}

console.log(doc.getStats());
// Without flyweight: 21 character objects + 21 style objects = 42 objects
// With flyweight: 21 character objects + 2 style objects = 23 objects
```

### Game Particles

```typescript
// Flyweight - shared particle data
class ParticleType {
    constructor(
        public readonly texture: string,
        public readonly color: string,
        public readonly size: number,
        public readonly blendMode: "normal" | "additive" | "multiply"
    ) {
        // Simulate loading large texture
        console.log(`Loading texture: ${texture}`);
    }
}

// Flyweight factory
class ParticleFactory {
    private types = new Map<string, ParticleType>();

    getParticleType(
        texture: string,
        color: string,
        size: number,
        blendMode: ParticleType["blendMode"]
    ): ParticleType {
        const key = `${texture}:${color}:${size}:${blendMode}`;

        if (!this.types.has(key)) {
            this.types.set(key, new ParticleType(texture, color, size, blendMode));
        }

        return this.types.get(key)!;
    }
}

// Context - extrinsic state
class Particle {
    private x: number;
    private y: number;
    private velocityX: number;
    private velocityY: number;
    private life: number;

    constructor(
        private type: ParticleType,
        x: number,
        y: number,
        velocityX: number,
        velocityY: number,
        life: number
    ) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.life = life;
    }

    update(deltaTime: number): boolean {
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.life -= deltaTime;
        return this.life > 0;
    }

    render(): void {
        // Use shared type data with unique position
        console.log(
            `Render ${this.type.texture} at (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`
        );
    }
}

// Particle system
class ParticleSystem {
    private particles: Particle[] = [];
    private factory = new ParticleFactory();

    emit(
        count: number,
        x: number,
        y: number,
        texture: string,
        color: string,
        size: number,
        blendMode: ParticleType["blendMode"]
    ): void {
        const type = this.factory.getParticleType(texture, color, size, blendMode);

        for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 100;
            const vy = (Math.random() - 0.5) * 100;
            const life = Math.random() * 2 + 1;

            this.particles.push(new Particle(type, x, y, vx, vy, life));
        }
    }

    update(deltaTime: number): void {
        this.particles = this.particles.filter(p => p.update(deltaTime));
    }

    render(): void {
        this.particles.forEach(p => p.render());
    }

    getParticleCount(): number {
        return this.particles.length;
    }
}

// Usage
const particleSystem = new ParticleSystem();

// Emit many particles - all share the same ParticleType
particleSystem.emit(1000, 400, 300, "spark.png", "orange", 4, "additive");
particleSystem.emit(1000, 400, 300, "smoke.png", "gray", 8, "normal");

console.log(`Total particles: ${particleSystem.getParticleCount()}`);
// 2000 particles, but only 2 ParticleType objects (textures loaded once)
```

---

## Proxy

Provide a surrogate or placeholder for another object to control access to it.

### When to Use

- Need lazy initialization (virtual proxy)
- Need access control (protection proxy)
- Need local execution of remote service (remote proxy)
- Need logging, caching, or other added behavior (smart proxy)

### Virtual Proxy (Lazy Loading)

```typescript
// Subject interface
interface Image {
    getFilename(): string;
    getSize(): { width: number; height: number };
    display(): void;
}

// Real subject - expensive to create
class HighResolutionImage implements Image {
    private pixels: Uint8Array;
    private width: number;
    private height: number;

    constructor(private filename: string) {
        // Expensive operation - loads file into memory
        console.log(`Loading high-res image: ${filename}`);
        this.width = 4000;
        this.height = 3000;
        this.pixels = new Uint8Array(this.width * this.height * 4); // RGBA
        console.log(`Loaded ${this.pixels.length} bytes`);
    }

    getFilename(): string {
        return this.filename;
    }

    getSize(): { width: number; height: number } {
        return { width: this.width, height: this.height };
    }

    display(): void {
        console.log(`Displaying ${this.filename} at ${this.width}x${this.height}`);
    }
}

// Virtual proxy - lazy loading
class ImageProxy implements Image {
    private realImage: HighResolutionImage | null = null;

    constructor(
        private filename: string,
        private cachedWidth: number,
        private cachedHeight: number
    ) {
        // No loading yet - just store metadata
        console.log(`Created proxy for: ${filename}`);
    }

    private loadImage(): HighResolutionImage {
        if (!this.realImage) {
            this.realImage = new HighResolutionImage(this.filename);
        }
        return this.realImage;
    }

    getFilename(): string {
        return this.filename; // No loading needed
    }

    getSize(): { width: number; height: number } {
        // Return cached metadata without loading
        return { width: this.cachedWidth, height: this.cachedHeight };
    }

    display(): void {
        // Load only when actually displaying
        this.loadImage().display();
    }
}

// Usage
const images: Image[] = [
    new ImageProxy("photo1.jpg", 4000, 3000),
    new ImageProxy("photo2.jpg", 4000, 3000),
    new ImageProxy("photo3.jpg", 4000, 3000),
];

// Getting size doesn't load images
images.forEach(img => {
    console.log(`${img.getFilename()}: ${img.getSize().width}x${img.getSize().height}`);
});

// Only when displaying does the image load
console.log("\nDisplaying first image:");
images[0].display();
```

### Protection Proxy (Access Control)

```typescript
// Subject interface
interface Document {
    read(): string;
    write(content: string): void;
    delete(): void;
}

// Real subject
class SensitiveDocument implements Document {
    constructor(
        private filename: string,
        private content: string
    ) {}

    read(): string {
        return this.content;
    }

    write(content: string): void {
        this.content = content;
        console.log(`Document ${this.filename} updated`);
    }

    delete(): void {
        console.log(`Document ${this.filename} deleted`);
    }
}

// User with permissions
interface User {
    username: string;
    role: "admin" | "editor" | "viewer";
}

// Protection proxy
class DocumentProxy implements Document {
    constructor(
        private document: SensitiveDocument,
        private user: User
    ) {}

    private checkPermission(action: "read" | "write" | "delete"): void {
        const permissions: Record<User["role"], string[]> = {
            viewer: ["read"],
            editor: ["read", "write"],
            admin: ["read", "write", "delete"],
        };

        if (!permissions[this.user.role].includes(action)) {
            throw new Error(
                `Access denied: ${this.user.username} cannot ${action} this document`
            );
        }
    }

    read(): string {
        this.checkPermission("read");
        console.log(`[Audit] ${this.user.username} read document`);
        return this.document.read();
    }

    write(content: string): void {
        this.checkPermission("write");
        console.log(`[Audit] ${this.user.username} modified document`);
        this.document.write(content);
    }

    delete(): void {
        this.checkPermission("delete");
        console.log(`[Audit] ${this.user.username} deleted document`);
        this.document.delete();
    }
}

// Usage
const doc = new SensitiveDocument("secret.txt", "Confidential information");

const viewer: User = { username: "alice", role: "viewer" };
const editor: User = { username: "bob", role: "editor" };
const admin: User = { username: "charlie", role: "admin" };

const viewerDoc = new DocumentProxy(doc, viewer);
const editorDoc = new DocumentProxy(doc, editor);
const adminDoc = new DocumentProxy(doc, admin);

console.log(viewerDoc.read()); // OK
// viewerDoc.write("new content"); // Throws: Access denied

editorDoc.write("Updated content"); // OK
// editorDoc.delete(); // Throws: Access denied

adminDoc.delete(); // OK
```

### JavaScript Proxy Object

```typescript
// Using native JavaScript Proxy
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
}

// Create a proxy that hides sensitive fields
function createSafeUserProxy(user: User): Omit<User, "password"> {
    return new Proxy(user, {
        get(target, prop: keyof User) {
            if (prop === "password") {
                throw new Error("Cannot access password field");
            }
            return target[prop];
        },
        set(target, prop: keyof User, value) {
            if (prop === "password") {
                throw new Error("Cannot modify password directly");
            }
            target[prop] = value;
            return true;
        },
        has(target, prop) {
            if (prop === "password") {
                return false;
            }
            return prop in target;
        },
        ownKeys(target) {
            return Object.keys(target).filter(key => key !== "password");
        },
    }) as Omit<User, "password">;
}

// Validation proxy
function createValidatedUser(user: User): User {
    return new Proxy(user, {
        set(target, prop: keyof User, value) {
            if (prop === "email" && !value.includes("@")) {
                throw new Error("Invalid email format");
            }
            if (prop === "name" && value.length < 2) {
                throw new Error("Name must be at least 2 characters");
            }
            target[prop] = value;
            return true;
        },
    });
}

// Observable proxy - track changes
function createObservableUser(
    user: User,
    onChange: (prop: keyof User, oldValue: unknown, newValue: unknown) => void
): User {
    return new Proxy(user, {
        set(target, prop: keyof User, value) {
            const oldValue = target[prop];
            target[prop] = value;
            if (oldValue !== value) {
                onChange(prop, oldValue, value);
            }
            return true;
        },
    });
}

// Usage
const user: User = { id: 1, name: "John", email: "john@example.com", password: "secret" };

const safeUser = createSafeUserProxy(user);
console.log(safeUser.name); // "John"
console.log(Object.keys(safeUser)); // ["id", "name", "email"]
// console.log(safeUser.password); // Error!

const validatedUser = createValidatedUser({ ...user });
validatedUser.email = "new@example.com"; // OK
// validatedUser.email = "invalid"; // Error: Invalid email format

const observedUser = createObservableUser({ ...user }, (prop, oldVal, newVal) => {
    console.log(`User.${prop} changed from ${oldVal} to ${newVal}`);
});
observedUser.name = "Jane"; // Logs: User.name changed from John to Jane
```

### Caching Proxy

```typescript
// Subject interface
interface DataFetcher {
    fetch(url: string): Promise<unknown>;
}

// Real subject
class HttpDataFetcher implements DataFetcher {
    async fetch(url: string): Promise<unknown> {
        console.log(`Fetching from ${url}...`);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return { data: `Response from ${url}`, timestamp: Date.now() };
    }
}

// Caching proxy
class CachingFetcher implements DataFetcher {
    private cache = new Map<string, { data: unknown; expiry: number }>();

    constructor(
        private fetcher: DataFetcher,
        private ttlMs = 60000
    ) {}

    async fetch(url: string): Promise<unknown> {
        const cached = this.cache.get(url);

        if (cached && cached.expiry > Date.now()) {
            console.log(`[Cache hit] ${url}`);
            return cached.data;
        }

        console.log(`[Cache miss] ${url}`);
        const data = await this.fetcher.fetch(url);
        this.cache.set(url, { data, expiry: Date.now() + this.ttlMs });
        return data;
    }

    clearCache(): void {
        this.cache.clear();
    }

    invalidate(url: string): void {
        this.cache.delete(url);
    }
}

// Usage
async function main(): Promise<void> {
    const fetcher: DataFetcher = new CachingFetcher(
        new HttpDataFetcher(),
        5000 // 5 second cache
    );

    // First call - cache miss
    console.log(await fetcher.fetch("/api/users"));

    // Second call - cache hit
    console.log(await fetcher.fetch("/api/users"));

    // Different URL - cache miss
    console.log(await fetcher.fetch("/api/posts"));
}
```

---

## Interview Questions

### Basic Questions

**Q1: What's the difference between Adapter and Facade?**
- **Adapter**: Makes one interface compatible with another (1-to-1 conversion)
- **Facade**: Simplifies a complex subsystem with a unified interface (many-to-1)

**Q2: When would you use Decorator over inheritance?**
- When you need to add behavior at runtime
- When the number of combinations would create too many subclasses
- When you want to combine behaviors flexibly

**Q3: Explain the Composite pattern with an example.**
Composite treats individual objects and compositions uniformly. Example: File system where both File and Directory implement a common interface - a Directory can contain Files and other Directories.

### Intermediate Questions

**Q4: How does Bridge differ from Adapter?**
- **Bridge**: Separates abstraction from implementation upfront (designed in)
- **Adapter**: Makes existing classes work together (after the fact)
- Bridge has two hierarchies that vary independently; Adapter wraps one class

**Q5: What are the different types of Proxy?**
1. **Virtual Proxy**: Lazy loading of expensive objects
2. **Protection Proxy**: Access control
3. **Remote Proxy**: Local representation of remote object
4. **Caching Proxy**: Cache results of expensive operations
5. **Logging Proxy**: Add logging without modifying original

**Q6: How does Flyweight reduce memory usage?**
Flyweight shares intrinsic state (immutable, shared data) across many objects while keeping extrinsic state (unique, context-specific data) separate. Example: A text editor shares font/style objects among characters but keeps position unique.

### Advanced Questions

**Q7: Decorator vs Proxy - when to use which?**
Both wrap objects, but:
- **Decorator**: Adds new behavior/responsibilities
- **Proxy**: Controls access to the object

Decorator focuses on enhancing; Proxy focuses on controlling.

**Q8: How would you implement a thread-safe Singleton in TypeScript?**
JavaScript is single-threaded, so traditional thread-safety isn't needed. However, for async initialization:

```typescript
class AsyncSingleton {
    private static instance: AsyncSingleton | null = null;
    private static initPromise: Promise<AsyncSingleton> | null = null;

    private constructor() {}

    static async getInstance(): Promise<AsyncSingleton> {
        if (!this.initPromise) {
            this.initPromise = (async () => {
                if (!this.instance) {
                    this.instance = new AsyncSingleton();
                    await this.instance.initialize();
                }
                return this.instance;
            })();
        }
        return this.initPromise;
    }

    private async initialize(): Promise<void> {
        // Async initialization
    }
}
```

---

## Quick Reference

### Pattern Summary

| Pattern | Intent | Structure |
|---------|--------|-----------|
| Adapter | Convert interface | Wrapper around incompatible class |
| Bridge | Separate abstraction/implementation | Abstraction holds implementation reference |
| Composite | Tree structure | Component interface, leaf and composite nodes |
| Decorator | Add behavior | Wrapper implementing same interface |
| Facade | Simplify subsystem | Single class delegating to subsystem |
| Flyweight | Share state | Factory managing shared instances |
| Proxy | Control access | Wrapper with same interface |

### When to Use Each

```
Interface Problem:
├── Need to adapt existing class → Adapter
└── Need simpler interface to subsystem → Facade

Structure Problem:
├── Tree/hierarchy structure → Composite
└── Multiple dimensions of variation → Bridge

Behavior Problem:
├── Add responsibilities dynamically → Decorator
└── Control access to object → Proxy

Memory Problem:
└── Many similar objects → Flyweight
```

### TypeScript Features

| Pattern | TypeScript Feature |
|---------|-------------------|
| Adapter | Interface implementation |
| Bridge | Abstract class + interface |
| Composite | Generic recursive types |
| Decorator | Higher-order functions, class wrapping |
| Facade | Module exports |
| Flyweight | Map for caching, readonly types |
| Proxy | Native Proxy object, interface implementation |
