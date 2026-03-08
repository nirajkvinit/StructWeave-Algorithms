# No-Code/Low-Code Platform Design

## System Overview

A No-Code/Low-Code Platform---exemplified by Retool (3,000+ enterprise customers, 70+ native connectors), Airtable (300K+ organizations), Superblocks, Appsmith, and ToolJet---enables technical and semi-technical users to build internal tools, customer-facing applications, and workflow automations through visual interfaces rather than traditional software engineering. The platform provides a **drag-and-drop canvas** for composing UI components (tables, forms, charts, modals), a **query execution engine** that connects to external databases and APIs, a **reactive binding system** (e.g., `{{query1.data}}`) that wires data to components, a **permission engine** for controlling who can build, view, and interact with deployed apps, and a **sandboxed execution environment** for running user-defined JavaScript transformations safely. At enterprise scale, the core architectural challenge is the intersection of metadata-driven rendering (apps are JSON definitions, not compiled code), secure multi-tenant query execution against customer-owned databases, and a reactive formula engine that must recompute component state on every data change---all while maintaining sub-200ms response times for deployed applications serving thousands of concurrent end-users.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Read-heavy at runtime (deployed apps: 20:1 read-to-write); write-heavy at build time (frequent saves during editing) |
| **Latency Sensitivity** | High for deployed apps (<200ms page load, <500ms query round-trip); medium for builder (1-2s save acceptable) |
| **Consistency Model** | Strong consistency for app definitions and permissions; eventual consistency for audit logs and analytics |
| **Concurrency Level** | Low per app builder (1-5 concurrent editors); high per deployed app (100-10,000 concurrent end-users) |
| **Data Volume** | Moderate for metadata (app definitions ~50-500KB each); unbounded for connected data (platform proxies, does not store) |
| **Architecture Model** | Metadata-driven rendering, sandboxed query execution, multi-tenant with org-level isolation |
| **Extensibility Model** | Custom components (iframe-embedded or SDK-based), webhooks, plugin marketplace |
| **Complexity Rating** | **High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Sandbox security, connector proxy, reactive binding, permissions |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Credential storage, sandbox isolation, SSRF prevention, audit |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Traditional App Framework | Form Builder | Spreadsheet (Airtable-style) | BPM Platform | No-Code/Low-Code (This) |
|--------|--------------------------|--------------|------------------------------|--------------|------------------------|
| **Primary Unit** | Source code files | Form definition | Table/view | Process definition (BPMN) | App definition (JSON metadata) |
| **Builder Skill** | Professional developer | Business analyst | Anyone | Process analyst | Developer to semi-technical |
| **Data Access** | Direct database/API code | Form submissions only | Built-in database | Process variables | Proxied queries to any external source |
| **UI Flexibility** | Unlimited (code) | Limited to form fields | Table/gallery/kanban views | Task forms | Component library + custom components |
| **Deployment** | Build/CI/CD pipeline | Publish form link | Share table/view | Deploy process | Publish toggle (instant, versioned) |
| **Execution Model** | Compiled/interpreted code | Static form rendering | Spreadsheet formula engine | Workflow engine | Metadata-driven runtime + sandboxed queries |
| **Security Model** | Code-level (developer owns) | Form-level access | Base/view sharing | Role-based task routing | App RBAC + component visibility + row-level query filtering |
| **Iteration Speed** | Hours to days | Minutes | Minutes | Hours | Minutes to hours |

---

## What Makes This System Unique

1. **Metadata-Driven Runtime**: Apps are not compiled code---they are JSON documents describing component trees, data bindings, and event handlers. The client renders entirely from this metadata, enabling instant publish, version rollback, and cross-platform rendering without code generation.

2. **Sandboxed Query Execution**: Users write SQL and JavaScript that runs on the server against real production databases. The platform must execute this user-defined code safely---preventing SSRF, SQL injection, resource exhaustion, and credential leakage---while maintaining <500ms round-trip latency.

3. **Reactive Formula Engine**: Component bindings like `{{query1.data.filter(row => row.status === state.selectedStatus)}}` create a dependency graph that must be topologically sorted and incrementally recomputed on every state change, mirroring a spreadsheet's reactive evaluation model.

4. **Multi-Source Data Connectors**: A single app may query PostgreSQL, call a REST API, and read from a document store---all in one page load. The platform proxies all connections server-side, managing connection pools, credentials, and timeouts for 70+ connector types.

5. **Component-Level Permissions**: Beyond app-level RBAC, individual components (buttons, columns, entire sections) can be conditionally visible or disabled based on the current user's role, enabling a single app definition to serve admin and standard user experiences simultaneously.

---

## Quick Reference: Core Architecture Options

### App Definition Storage

| Approach | Flexibility | Version Diff | Migration | Best For |
|----------|------------|-------------|-----------|----------|
| **JSON document in relational DB** | High (schemaless within envelope) | JSON diff | Schema evolution via versioned format | Retool-style (chosen) |
| **Normalized relational tables** | Moderate (rigid schema) | Row-level diff | SQL migrations | Smaller, structured platforms |
| **Code generation (emit source code)** | Very high | Git diff | N/A (code is the artifact) | Mendix, OutSystems |
| **Block-based document store** | High | Block-level diff | Block schema versioning | Notion-style hybrid |

**Recommendation**: JSON document stored in a relational database with a versioned schema envelope. The entire app definition---component tree, queries, bindings, permissions---is a single document that can be atomically saved, versioned, and diffed.

### Query Execution Sandbox

| Approach | Isolation Level | Startup Latency | Resource Control | Security |
|----------|----------------|-----------------|------------------|----------|
| **V8 Isolates** (Chosen) | Process-shared, memory-isolated | <5ms (warm) | CPU time limits, memory caps | High (no filesystem/network access) |
| **Container per execution** | Full OS-level isolation | 100-500ms (cold) | cgroup limits | Very high |
| **WebAssembly sandbox** | Memory-isolated | <10ms | Memory limits, no syscalls | High |
| **gVisor/Firecracker** | Kernel-level isolation | 50-200ms | Full cgroup control | Very high |

**Recommendation**: V8 Isolates for JavaScript transformations (fast, low-overhead). SQL queries are parameterized and proxied---never executed in the sandbox. Container-based isolation for heavy or long-running custom code.

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [3.3 - AI-Native Metadata-Driven Super Framework](../3.3-ai-native-metadata-driven-super-framework/) | Metadata repository, formula engine, generic interpreter |
| [6.3 - Multi-Tenant SaaS Platform Architecture](../6.3-multi-tenant-saas-platform-architecture/) | Tenant isolation, org-level partitioning, governor limits |
| [2.3 - Function-as-a-Service](../2.3-function-as-a-service/) | Sandboxed execution, cold starts, resource limits |
| [2.8 - Edge Computing Platform](../2.8-edge-computing-platform/) | V8 Isolates, global distribution, isolation model |
| [12.9 - Code Execution Sandbox](../12.9-code-execution-sandbox/) | Isolation, resource limits, security |

---

## Sources

- Retool Engineering Blog --- Architecture, Query Execution, Connector Proxy
- Retool 2026 Build vs. Buy Report --- 35% of enterprises replacing SaaS with custom software
- Airtable Engineering --- AI-Native Platform, Base Architecture, Interface Designer
- Cloudflare Workers Blog --- V8 Isolate Security Hardening
- V8 Blog --- The V8 Sandbox (Memory Isolation)
- n8n CVE-2025-68613 --- Expression Injection in No-Code Platform (Security Lessons)
- InfoQ --- Fine-Grained Sandboxing with V8 Isolates
- Fly.io Engineering Blog --- Sandboxing and Workload Isolation
- Industry Statistics: No-code market projected at $65B+ by 2027 (Gartner)
- Retool: 3,000+ enterprise customers, 70+ native connectors (2025)
- Airtable: 300K+ organizations, repositioning as AI-native platform (2026)
