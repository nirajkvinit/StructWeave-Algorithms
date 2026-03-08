# Requirements & Estimations

## Functional Requirements

### Core Design Features

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-01 | **Real-time Collaborative Canvas** | Multiple users simultaneously edit vector objects on an infinite 2D canvas with sub-50ms edit propagation |
| FR-02 | **Vector Graphics Rendering** | Render complex vector shapes (paths, boolean operations, gradients, masks, blur effects) at 60 FPS in the browser |
| FR-03 | **Component Library** | Main components with overridable properties; instances that inherit and selectively override |
| FR-04 | **Prototyping** | Interactive prototypes with transitions, animations, and smart animate between frames |
| FR-05 | **Dev Mode** | Inspect mode with CSS/code generation, spacing measurements, and asset export |
| FR-06 | **Multiplayer Cursors** | Real-time cursor positions and names for all active collaborators, viewport-aware |
| FR-07 | **Comments & Annotations** | Pin comments to specific coordinates on the canvas; threaded discussions; resolve/unresolve |
| FR-08 | **Version History** | Browse and restore any previous version; named checkpoints; per-page granularity |
| FR-09 | **Plugin System** | Third-party plugins that can read/modify the document tree within a sandboxed environment |
| FR-10 | **Branching & Merging** | Create design branches for exploration; merge back with visual diff and conflict resolution |
| FR-11 | **AI Features** | AI-assisted layout suggestions, auto-populate with realistic data, image generation within canvas |
| FR-12 | **Auto Layout** | Responsive frame layouts with padding, spacing, alignment, and wrap rules |
| FR-13 | **Design Tokens** | Variables for colors, spacing, typography; modes (light/dark); scoping to collections |
| FR-14 | **Asset Management** | Upload, organize, and reuse images, icons, and fonts across files and teams |
| FR-15 | **Export** | Export frames/components as PNG, SVG, PDF at multiple resolutions |

### Collaboration Features

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-16 | **Link Sharing** | Share files via link with configurable permissions (view, edit, comment) |
| FR-17 | **Team Libraries** | Publish components and styles from one file for use across an organization |
| FR-18 | **Real-time Selection** | See which objects other users have selected (colored selection outlines) |
| FR-19 | **Follow Mode** | Follow another user's viewport in real-time |
| FR-20 | **Multiplayer Undo** | Per-user undo/redo that only reverses the user's own operations |

---

## Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Latency** | Local edit latency (user action → visual update) | < 16ms (one frame at 60 FPS) |
| **Latency** | Edit propagation to collaborators (p50 / p99) | < 50ms / < 200ms |
| **Latency** | Cursor position propagation | < 100ms |
| **Latency** | File open time (cold start, average file) | < 3 seconds |
| **Latency** | File open time (warm cache / local) | < 500ms |
| **Availability** | Platform uptime | 99.99% (< 52.6 min downtime/year) |
| **Availability** | Multiplayer service uptime | 99.95% (degraded to single-player on failure) |
| **Throughput** | Concurrent editors per file | Up to 500 |
| **Throughput** | Concurrent viewers per file | Up to 10,000 |
| **Throughput** | Operations per second per file (peak) | 50,000 ops/sec |
| **Rendering** | Frame rate for interactive editing | 60 FPS sustained |
| **Rendering** | Scene graph nodes per file (max supported) | 500,000 nodes |
| **Rendering** | Cross-platform rendering consistency | Pixel-perfect (within 1px tolerance) |
| **Consistency** | Edit convergence | Strong eventual consistency (CRDT guarantee) |
| **Durability** | Data durability | 99.999999999% (11 nines) |
| **Offline** | Offline editing support | Queue operations locally; sync on reconnect |
| **Cross-platform** | Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| **Cross-platform** | Desktop app | Native wrappers with GPU acceleration |
| **Scale** | Plugin execution isolation | Full sandbox; no access to host filesystem or network |

---

## Scale Estimations

### User & Traffic Scale

| Metric | Value | Calculation |
|--------|-------|-------------|
| Daily Active Users (DAU) | 4,000,000 | Given |
| Monthly Active Users (MAU) | 15,000,000 | DAU / 0.27 (typical DAU/MAU ratio) |
| Total files | 50,000,000+ | Given |
| Total components | 10,000,000+ | Given (team library components) |
| Peak concurrent users | 800,000 | ~20% of DAU active at peak hour |
| Peak concurrent editing sessions | 200,000 | ~50% of concurrent users actively editing |
| Average collaborators per active file | 3.2 | Industry average for design tools |
| Max collaborators per file | 500 | Design system files, team workshops |

### Operation Volume

| Metric | Value | Calculation |
|--------|-------|-------------|
| Avg operations per user per minute (editing) | 120 | ~2 ops/sec (drags, property changes, selections) |
| Peak file operations per second | 50,000 | 500 editors × 100 ops/sec burst |
| Total operations per day | ~50 billion | 200K sessions × 120 ops/min × avg 35 min session |
| WebSocket messages per second (global) | 24,000,000 | 200K sessions × avg 2 ops/sec × fan-out factor 3.2 |
| Cursor update messages per second (global) | 6,000,000 | 200K sessions × 30 updates/sec |

### Storage

| Data Type | Size Per Unit | Total Volume | Growth Rate |
|-----------|---------------|-------------|-------------|
| Scene graph (avg file) | 2 MB | 100 TB (50M files) | +15 TB/month |
| Scene graph (large file) | 200 MB | — | — |
| Operation log per file (30 days) | 50 MB avg | 2.5 PB | Rolling |
| Version snapshots per file | 20 MB avg | 1 PB | +100 TB/month |
| Image assets | 5 MB avg | 500 TB | +50 TB/month |
| Font files | 200 KB avg | 10 TB | +500 GB/month |
| Plugin data | 1 KB avg per file | 50 GB | +5 GB/month |

### Bandwidth

| Channel | Per-Session Rate | Global Rate |
|---------|-----------------|-------------|
| WebSocket (edits, outbound per server) | 5 KB/sec avg | 1 GB/sec |
| WebSocket (cursor/presence) | 2 KB/sec avg | 400 MB/sec |
| File load (scene graph download) | 2 MB per load | 50 TB/day |
| Asset download (images via CDN) | 10 MB per session | 200 TB/day |
| Export generation | 5 MB per export | 10 TB/day |

---

## Capacity Planning

### Multiplayer Servers

```
Active editing sessions: 200,000 (peak)
Avg collaborators per session: 3.2
Total WebSocket connections: 640,000

Per server capacity: 10,000 WebSocket connections
Required servers: 64 (+ 50% headroom = 96 servers)

Memory per connection: 500 KB (session state + scene graph cache)
Memory per server: 5 GB active state
```

### Document Storage

```
Scene graph storage:
  50M files × 2 MB avg = 100 TB
  Hot tier (accessed in last 7 days): ~10M files × 2 MB = 20 TB
  Warm tier (accessed in last 30 days): ~15M files × 2 MB = 30 TB
  Cold tier (rest): ~25M files × 2 MB = 50 TB

Operation log (rolling 30-day window):
  Active files per day: ~5M
  5M files × 50 MB avg log = 250 TB rolling

Version snapshots:
  50M files × avg 20 snapshots × 1 MB compressed = 1 PB
```

### Rendering (Client-Side)

```
WASM module size: ~5 MB (loaded once, cached)
GPU memory per canvas: 50-500 MB depending on complexity
Scene graph in WASM heap: 10-200 MB per file
Target: 60 FPS at 4K resolution for files with < 100K nodes
Degraded: 30 FPS for files with 100K-500K nodes
```

---

## Service Level Objectives (SLOs)

### Latency SLOs

| Operation | p50 | p95 | p99 | SLO |
|-----------|-----|-----|-----|-----|
| Local edit to screen | 8ms | 12ms | 16ms | p99 < 16ms |
| Edit propagation to peer | 30ms | 80ms | 200ms | p99 < 200ms |
| Cursor sync to peer | 50ms | 100ms | 150ms | p99 < 150ms |
| File open (cached) | 200ms | 500ms | 1s | p99 < 1s |
| File open (cold) | 1s | 2s | 3s | p99 < 5s |
| Component library load | 500ms | 1s | 2s | p99 < 3s |
| Version restore | 2s | 5s | 10s | p99 < 15s |
| Export generation | 1s | 3s | 8s | p99 < 15s |
| Plugin execution start | 100ms | 300ms | 500ms | p99 < 1s |

### Availability SLOs

| Service | Target | Error Budget (per month) |
|---------|--------|--------------------------|
| Canvas editing (single-player) | 99.99% | 4.3 minutes |
| Multiplayer sync | 99.95% | 21.9 minutes |
| File storage & retrieval | 99.99% | 4.3 minutes |
| Asset CDN | 99.99% | 4.3 minutes |
| Plugin runtime | 99.9% | 43.2 minutes |
| Version history | 99.95% | 21.9 minutes |
| Team libraries | 99.95% | 21.9 minutes |

### Render Performance SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Interactive FPS (< 50K nodes) | 60 FPS sustained | Canvas interaction during editing |
| Interactive FPS (50K-200K nodes) | 30 FPS minimum | Large files during editing |
| Static render (any file) | < 2s for full render | Opening or zooming to fit |
| Export render (PNG at 2x) | < 5s per frame | Export pipeline |
| Prototype playback | 60 FPS | Interactive prototype mode |

### Multiplayer SLOs

| Metric | Target |
|--------|--------|
| Time to first cursor visible (new joiner) | < 2 seconds |
| Operation ordering correctness | 100% (CRDT guarantees) |
| Desync rate (divergent state) | < 0.001% of sessions |
| Reconnect time after disconnect | < 3 seconds |
| Max offline queue before forced reload | 10,000 operations |
