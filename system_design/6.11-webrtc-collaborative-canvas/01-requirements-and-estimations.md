# Requirements & Estimations

## Functional Requirements

### Core Canvas Features

| # | Requirement | Description | Priority |
|---|------------|-------------|----------|
| F1 | **Infinite Canvas** | Unbounded 2D plane with pan and zoom (0.1x to 10x); no fixed page boundaries | P0 |
| F2 | **Shape Primitives** | Rectangle, ellipse, diamond, triangle, arrow, line, freehand path | P0 |
| F3 | **Text Elements** | Text boxes with rich formatting (bold, italic, font size, color) | P0 |
| F4 | **Sticky Notes** | Colored note cards with text content; snap-to-grid optional | P0 |
| F5 | **Connectors** | Smart connectors between shapes that auto-route around obstacles | P0 |
| F6 | **Freehand Drawing** | Pen/pencil tool with pressure sensitivity and stroke smoothing | P0 |
| F7 | **Image Upload** | Drag-and-drop images; resize, crop, and position on canvas | P0 |
| F8 | **Frames** | Grouping containers that act as "slides" or "sections" within the canvas | P1 |
| F9 | **Layers** | Z-order management; bring to front, send to back, layer visibility | P1 |
| F10 | **Templates** | Pre-built board templates (kanban, mind map, flowchart, retrospective) | P1 |

### Collaboration Features

| # | Requirement | Description | Priority |
|---|------------|-------------|----------|
| F11 | **Real-Time Multiplayer** | Multiple users see each other's changes instantly on the same board | P0 |
| F12 | **Cursor Synchronization** | See other users' cursor positions with name labels and colors | P0 |
| F13 | **Selection Awareness** | See which objects other users have selected (highlighted borders) | P0 |
| F14 | **Viewport Indicators** | Minimap showing other users' viewport positions | P1 |
| F15 | **Comments & Threads** | Pin comments to specific objects or canvas locations | P1 |
| F16 | **Voting & Reactions** | Upvote sticky notes; add emoji reactions to objects | P1 |
| F17 | **Timer & Facilitation** | Countdown timer, voting sessions, presentation mode | P2 |
| F18 | **Video/Audio Integration** | Embedded video chat within the canvas session | P2 |
| F19 | **Follow Mode** | "Follow" another user's viewport to see what they see | P1 |
| F20 | **Version History** | Browse and restore previous board states | P1 |

### Content & Export Features

| # | Requirement | Description | Priority |
|---|------------|-------------|----------|
| F21 | **Embedded Content** | Embed external documents, websites, videos, spreadsheets | P1 |
| F22 | **Export** | Export as PNG, SVG, PDF; export selected frame or entire board | P0 |
| F23 | **Import** | Import images, SVGs, PDFs, and other board formats | P1 |
| F24 | **Search** | Search across boards by text content, tags, comments | P1 |
| F25 | **AI Features** | AI-generated diagrams, sticky note clustering, summarization | P2 |

---

## Non-Functional Requirements

| Category | Requirement | Target |
|----------|------------|--------|
| **Latency** | Local drawing/edit latency | <5ms (optimistic local application) |
| **Latency** | Cursor position propagation (p50) | <50ms |
| **Latency** | Cursor position propagation (p99) | <100ms |
| **Latency** | Shape operation propagation (p50) | <100ms |
| **Latency** | Shape operation propagation (p99) | <500ms |
| **Latency** | Board initial load (p50) | <1s |
| **Latency** | Board initial load (p99) | <3s |
| **Availability** | Service uptime | 99.99% (52 min downtime/year) |
| **Availability** | Board data durability | 99.999999% (8 nines) |
| **Consistency** | CRDT convergence guarantee | Strong eventual consistency |
| **Consistency** | Ephemeral state (cursors) | Best-effort, tolerate 200ms staleness |
| **Offline** | Offline editing capability | Full read/write; sync on reconnect |
| **Offline** | Offline duration support | Up to 30 days with incremental sync |
| **Performance** | Canvas rendering FPS | 60 FPS with <10,000 visible objects |
| **Performance** | Zoom/pan responsiveness | <16ms frame time |
| **Performance** | Maximum objects per board | 100,000+ |
| **Performance** | Maximum concurrent editors per board | 300 |
| **Performance** | Maximum concurrent viewers per board | 5,000 |
| **Mobile** | Mobile browser support | Full editing on tablet; view + basic edit on phone |
| **Export** | PNG/SVG export time | <5s for boards with <1,000 objects |
| **Export** | PDF export time | <15s for boards with <5,000 objects |

---

## Scale Estimates

### User & Board Scale

| Metric | Estimate | Rationale |
|--------|----------|-----------|
| Total registered users | 80M+ | Comparable to Miro (2025 scale) |
| Monthly active users | 25M | ~30% MAU/total ratio |
| Daily active users | 8M | ~30% DAU/MAU ratio |
| Total boards | 50M+ | Avg 2-3 boards per active user + shared boards |
| Active boards per day | 3M | Boards with at least one edit |
| Peak concurrent editing sessions | 500K | Users actively editing simultaneously |
| Average editors per active board | 3-5 | Most collaboration is small teams |
| Peak editors per board | 300 | Large workshops, all-hands, design sprints |
| Total canvas objects | 10B+ | Across all boards; shapes, text, connectors, sticky notes |
| Average objects per board | 200 | Median board size |
| Large board objects | 10,000-50,000 | Enterprise planning boards, architecture diagrams |

### Throughput Estimates

| Metric | Calculation | Result |
|--------|------------|--------|
| **Canvas operations/sec (global peak)** | 500K sessions x 3 ops/sec | **1.5M ops/sec** |
| **Cursor updates/sec (global peak)** | 500K sessions x 2 users x 15 updates/sec | **15M updates/sec** |
| **Board loads/sec (peak)** | 8M DAU, peak hour = 20% in 1 hour | **~450 loads/sec** |
| **Asset uploads/sec (peak)** | 5% of sessions upload; 1 upload/5 min | **~80 uploads/sec** |
| **Export requests/sec (peak)** | 1% of active sessions export | **~15 exports/sec** |

### Storage Estimates

| Data Type | Size per Unit | Total Volume | Growth Rate |
|-----------|--------------|-------------|-------------|
| **Board state (CRDT snapshot)** | 50 KB avg (200 objects x 250 bytes) | 2.5 TB (50M boards) | 100 GB/month |
| **Operation log** | 5 MB avg per active board/month | 15 TB/month (3M active boards) | 15 TB/month |
| **Asset storage (images, PDFs)** | 2 MB avg per asset; 10 assets/board | 1 PB (50M boards x 10 x 2 MB) | 50 TB/month |
| **Cursor/ephemeral data** | Not persisted | 0 | N/A |
| **Board metadata** | 2 KB per board | 100 GB | Minimal |
| **User profiles & auth** | 1 KB per user | 80 GB | Minimal |
| **Search index** | 10% of text content | 250 GB | 10 GB/month |

### Bandwidth Estimates

| Channel | Per Session | At Peak (500K sessions) |
|---------|------------|------------------------|
| **CRDT operation deltas** | 500 bytes/sec avg | 250 MB/sec (2 Gbps) |
| **Cursor broadcasts** | 2 KB/sec per session (all cursors) | 1 GB/sec (8 Gbps) |
| **Asset downloads (board load)** | 5 MB one-time per board load | ~2 GB/sec at peak loads |
| **WebRTC signaling** | Negligible | Negligible |
| **Total egress** | ~3 KB/sec per session (steady state) | **~12 Gbps peak** |

---

## Capacity Planning

### Compute

| Service | Instance Type | Count (Peak) | Rationale |
|---------|--------------|-------------|-----------|
| **WebSocket/Relay servers** | 16 vCPU, 32 GB RAM | 200 | 2,500 connections/server; stateful |
| **CRDT Sync Engine** | 8 vCPU, 16 GB RAM | 100 | Board-sharded; in-memory CRDT state |
| **Cursor Relay** | 4 vCPU, 8 GB RAM | 50 | Pub/sub fanout; stateless |
| **TURN Relay** | 8 vCPU, 16 GB RAM | 30 | WebRTC media relay for NAT-restricted clients |
| **Asset Processing** | 8 vCPU, 16 GB RAM | 20 | Image resize, PDF render, thumbnail generation |
| **Export Workers** | 4 vCPU, 8 GB RAM | 10 | Headless canvas rendering for export |
| **API Servers** | 4 vCPU, 8 GB RAM | 30 | Board CRUD, auth, metadata |
| **Search Service** | 16 vCPU, 64 GB RAM | 10 | Full-text index across boards |

### TURN Server Cost Analysis

TURN servers relay WebRTC traffic for clients behind symmetric NATs (approximately 15-20% of connections).

| Metric | Value |
|--------|-------|
| % of connections requiring TURN | 18% |
| Avg TURN session bandwidth | 50 Kbps (data channels only, no video) |
| Peak TURN sessions | 90K (500K x 18%) |
| Peak TURN bandwidth | 4.5 Gbps |
| Monthly TURN egress | ~1.5 PB |
| Estimated monthly cost (at $0.04/GB) | ~$60,000 |

This cost is a primary driver for preferring WebSocket relay over WebRTC for non-P2P scenarios.

---

## SLOs (Service Level Objectives)

| SLO | Target | Measurement |
|-----|--------|-------------|
| **Board availability** | 99.99% | Board is editable within 3s of load attempt |
| **Cursor sync latency (p50)** | <50ms | Time from cursor move on Client A to render on Client B |
| **Cursor sync latency (p99)** | <100ms | Same, 99th percentile |
| **Operation sync latency (p50)** | <100ms | Time from shape create/move on A to render on B |
| **Operation sync latency (p99)** | <500ms | Same, 99th percentile |
| **Board load time (p50)** | <1s | Time from navigation to interactive canvas |
| **Board load time (p99)** | <3s | Same, 99th percentile |
| **CRDT convergence** | 100% | All connected clients converge to identical state within 5s |
| **Export completion (p95)** | <10s | Time from export request to downloadable file |
| **Offline sync success** | 99.9% | Offline changes successfully merged on reconnect |
| **Data durability** | 99.999999% | No board data loss over 1 year |
| **Canvas FPS** | >55 FPS p95 | Frames per second during pan/zoom with <5,000 visible objects |

---

## Back-of-Envelope Calculations

### How many WebSocket connections can one server handle?

```
Given:
- Each connection: ~50 KB memory (buffers, state)
- Server: 32 GB RAM, budget 16 GB for connections
- 16 GB / 50 KB = ~320,000 connections (theoretical)
- But: CPU-bound on message fanout
- Realistic with message processing: 2,500-5,000 connections/server
- At 500K peak sessions: 500K / 2,500 = 200 servers
```

### How large is a board's CRDT state?

```
Given:
- Average board: 200 objects
- Each object CRDT entry: ~250 bytes (ID, type, properties, tombstone flag)
- Base state: 200 x 250 = 50 KB
- With tombstones (2x live objects): 150 KB
- With operation log (1 month): ~5 MB
- Latest snapshot + recent ops for fast load: ~200 KB
```

### Cursor broadcast bandwidth for a 300-user session

```
Given:
- Each cursor update: 48 bytes (user_id 16B + x 8B + y 8B + viewport 16B)
- Update rate: 15 Hz per user
- Users: 300
- Inbound to server: 300 x 15 x 48 = 216 KB/sec
- Outbound (server fans out to 299 peers): 299 x 300 x 15 x 48 = 64 MB/sec
- Optimization: batch + throttle to 5 Hz broadcast: ~21 MB/sec
- Further: viewport-based filtering (only send cursors in similar viewport): ~5 MB/sec
```

### Spatial query cost for viewport rendering

```
Given:
- Board: 10,000 objects
- R-tree depth: log_M(10,000) where M=50 (fanout) = ~3 levels
- Viewport query: O(log n + k) where k = objects in viewport
- Typical viewport: 50-200 objects visible
- Query time: ~0.1ms (well within 16ms frame budget)
```
