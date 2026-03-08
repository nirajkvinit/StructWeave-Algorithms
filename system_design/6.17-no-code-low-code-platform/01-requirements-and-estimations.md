# Requirements & Estimations

## Functional Requirements

### Core Features

1. **Visual App Builder**
   - Drag-and-drop canvas with a component library (table, form, chart, button, text input, modal, tabs, container, list view)
   - Layout grid system with responsive breakpoints (desktop, tablet, mobile)
   - Conditional visibility rules per component (show/hide based on state or user role)
   - Multi-page apps with shared global scope (headers, sidebars) and per-page isolated scope
   - Undo/redo with operation history
   - Preview mode vs. production mode toggle

2. **Data Connectors**
   - Native connectors for 70+ sources: SQL databases (PostgreSQL, MySQL, MSSQL, Oracle), NoSQL (MongoDB, document stores), REST APIs, GraphQL endpoints, object storage, SFTP
   - OAuth 2.0 flows for third-party service authentication (Google Sheets, Salesforce, Stripe)
   - Connection testing and health checks during configuration
   - Connection pooling managed server-side per connector instance

3. **Query Execution Engine**
   - SQL editor with syntax highlighting, parameterized queries (`{{ }}`-style bindings), and autocomplete
   - REST/GraphQL API call builder with header, body, and authentication configuration
   - JavaScript transformation pipelines (run in sandboxed V8 isolates)
   - Query chaining: output of one query feeds into another
   - Manual and event-triggered execution (on page load, on button click, on interval)

4. **Reactive State Management**
   - Page-level state variables (temporary state for UI interactions)
   - Component bindings using expressions: `{{query1.data}}`, `{{state.selectedRow.id}}`
   - Dependency graph for automatic re-evaluation when upstream data changes
   - Global state shared across pages (user info, session data, URL parameters)

5. **Permissions & Access Control**
   - App-level RBAC: owner, editor, viewer, user (can use deployed app)
   - Component-level visibility rules tied to user groups/roles
   - Row-level security on data connectors (dynamic WHERE clause injection based on current user)
   - Environment-level access (development, staging, production)
   - SSO integration (SAML, OIDC) and SCIM provisioning

6. **Collaboration**
   - Multi-user editing with presence indicators (who is editing which component)
   - Version history with named releases and rollback capability
   - Branching: edit a copy without affecting production, then merge/promote
   - Comments on components for builder-to-builder communication

7. **Custom Components**
   - Iframe-embedded custom components with a postMessage API
   - Native SDK for building custom components with access to platform APIs
   - Component marketplace for sharing across an organization

8. **Workflows & Automation**
   - Multi-step server-side workflows triggered by webhooks, schedules, or app events
   - Conditional branching, loops, parallel execution paths
   - Error handling with retry policies and fallback steps

### Out of Scope

- Full application hosting (platform hosts the UI shell; backend services are external)
- Custom domain routing for deployed apps (managed at infrastructure level)
- Real-time collaborative editing with CRDT/OT conflict resolution (builders use presence-based conflict avoidance, not character-level merge)
- Mobile-native app compilation (responsive web only)

---

## Non-Functional Requirements

### Performance

| Metric | Target | Context |
|--------|--------|---------|
| **Deployed app page load (p50)** | <150ms | From CDN-served app shell + API call for app definition |
| **Deployed app page load (p99)** | <400ms | Including initial query execution |
| **Query execution round-trip (p50)** | <300ms | Proxy → connector → response (excluding connector latency) |
| **Query execution round-trip (p99)** | <1s | With transformation pipeline |
| **Builder save latency (p50)** | <500ms | App definition save to metadata store |
| **Component render (client-side)** | <50ms | From JSON metadata to rendered DOM |
| **Sandbox execution (JavaScript)** | <200ms | Per transformation step, hard timeout at 5s |

### Availability & Durability

| Metric | Target |
|--------|--------|
| **Runtime availability** | 99.95% (deployed apps serving end-users) |
| **Builder availability** | 99.9% (lower priority; degraded mode acceptable) |
| **App definition durability** | 99.999999% (8 nines; versioned, replicated) |
| **Credential storage durability** | 99.999999% (encrypted, replicated) |

### Consistency

| Data Path | Model | Justification |
|-----------|-------|---------------|
| App definition saves | Strong (read-your-writes) | Builder must see their changes immediately |
| Permission changes | Strong | Security: stale grants are unacceptable |
| Query execution | Strong (per-request) | Each query hits the connector directly; no platform caching of data |
| Audit logs | Eventual (seconds) | Async write; acceptable lag |
| Analytics / usage metrics | Eventual (minutes) | Batch aggregation |

---

## Capacity Estimations

### Assumptions

- **Target scale**: 10,000 organizations, 500,000 total builders, 5,000,000 end-users
- **Apps per org**: 50 average, 500 for large enterprises
- **Total apps**: 500,000
- **Queries per deployed app page load**: 3-5 (average 4)
- **Active deployed apps**: 100,000 (20% of total)
- **End-user sessions per day**: 2,000,000

### Back-of-Envelope Calculations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| **Total apps** | 500,000 | 10,000 orgs x 50 apps/org |
| **Active deployed apps** | 100,000 | 20% of total |
| **DAU (end-users)** | 2,000,000 | ~40% of 5M total end-users |
| **DAU (builders)** | 50,000 | ~10% of 500K total builders |
| **Queries/day (end-users)** | 40,000,000 | 2M DAU x 5 page loads x 4 queries |
| **QPS (average, queries)** | ~460 | 40M / 86,400 |
| **QPS (peak, queries)** | ~2,300 | 5x average (business hours concentration) |
| **Builder saves/day** | 500,000 | 50K builders x 10 saves/day |
| **App definition storage** | 50 GB | 500K apps x 100KB avg definition |
| **App definition with versions** | 500 GB | 10x version multiplier |
| **Connector credentials storage** | 500 MB | 500K connectors x 1KB encrypted config |
| **Audit log storage (Year 1)** | 2 TB | 40M query events/day x 150 bytes x 365 |
| **Audit log storage (Year 5)** | 10 TB | Linear growth + retention |
| **Cache size (hot app definitions)** | 10 GB | 100K active apps x 100KB |
| **Bandwidth (query responses)** | ~2 Gbps peak | 2,300 QPS x 100KB avg response |

### Resource Estimation

| Component | Instance Count | Sizing |
|-----------|---------------|--------|
| **API Gateway** | 4-8 | Load-balanced, stateless |
| **App Definition Service** | 4-6 | Read-heavy, cached |
| **Query Execution Engine** | 10-20 | CPU-intensive (sandbox), horizontally scaled |
| **Data Connector Proxy** | 8-16 | Connection pool management, I/O bound |
| **Metadata Store (primary)** | 3-node cluster | Replicated relational DB |
| **Metadata Store (read replicas)** | 4-6 | For runtime reads |
| **App Definition Cache** | 2-4 | Distributed cache cluster |
| **Audit Log Store** | Time-partitioned | Append-only, compressed |

---

## SLOs / SLAs

| Metric | SLO | SLA (contractual) | Measurement |
|--------|-----|-------------------|-------------|
| **Runtime availability** | 99.95% | 99.9% | Synthetic probes hitting deployed app endpoints |
| **Query execution p99** | <1s | <2s | Server-side latency histogram per query type |
| **App load p99** | <400ms | <1s | Real user monitoring (RUM) from client |
| **Builder save success rate** | 99.99% | 99.9% | Save API success / total attempts |
| **Error rate (runtime)** | <0.1% | <0.5% | 5xx responses / total requests |
| **Data connector uptime** | Best effort | N/A (customer-owned) | Health check pass rate per connector |
| **Sandbox timeout rate** | <0.5% | N/A | Timed-out executions / total executions |

---

## Rate Limits & Governor Limits

| Resource | Limit | Scope | Purpose |
|----------|-------|-------|---------|
| **Queries per minute (deployed app)** | 600 | Per app | Prevent runaway query loops |
| **Queries per minute (builder)** | 120 | Per user | Protect connectors during development |
| **Sandbox CPU time per execution** | 5 seconds | Per query transform | Prevent infinite loops |
| **Sandbox memory per execution** | 128 MB | Per query transform | Prevent memory exhaustion |
| **App definition size** | 10 MB | Per app | Prevent oversized app metadata |
| **Concurrent connections per connector** | 20 | Per connector instance | Protect customer databases |
| **Workflow steps per execution** | 100 | Per workflow run | Prevent runaway automations |
| **API calls per minute (external)** | 1,000 | Per org | Rate limit on platform REST API |
