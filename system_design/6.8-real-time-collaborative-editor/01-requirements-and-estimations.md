# Requirements & Capacity Estimations

## Functional Requirements

### Core Features

1. **Block-Based Document Editing**: Users create, edit, delete, move, and nest blocks of various types (paragraph, heading, list, table, image, embed, code, toggle, callout, database)
2. **Real-Time Collaboration**: Multiple users edit the same document simultaneously with changes visible to all within 100ms
3. **Multiplayer Cursors & Presence**: Show each collaborator's cursor position, selection range, and online status in real-time
4. **Offline Editing**: Full editing capability without network connection; automatic conflict-free merge on reconnect
5. **Version History**: Browse and restore previous versions; view per-user edit attribution
6. **Block Type Transformation**: Convert any block to a compatible type (paragraph <-> heading <-> quote) without losing content or children
7. **Nested Block Hierarchy**: Blocks can contain child blocks (toggle lists, columns, synced blocks) forming an arbitrarily deep tree
8. **Rich Text Within Blocks**: Bold, italic, strikethrough, code, links, mentions, comments within text blocks
9. **Undo/Redo**: Per-user undo stack that reverses only the current user's operations, even when interleaved with others' edits
10. **Comments & Discussions**: Inline comments anchored to specific text ranges or blocks

### Extended Features

11. **Synced Blocks**: A single block instance rendered in multiple locations; edits propagate to all instances
12. **Database Views**: Blocks that represent database entries with table, board, calendar, and gallery views
13. **Templates**: Reusable block structures that can be instantiated
14. **Import/Export**: Markdown, HTML, PDF import and export
15. **Search**: Full-text search across all documents in a workspace

### Out of Scope

- Video/audio real-time collaboration (covered in 6.7 Google Meet/Zoom)
- Drawing/whiteboard canvas (covered in 6.11 WebRTC Collaborative Canvas)
- File storage and sync (covered in 6.1 Cloud File Storage)
- Linear text OT algorithms in depth (covered in 6.2 Document Collaboration Engine)

---

## Non-Functional Requirements

### CAP Theorem Choice

**AP (Availability + Partition Tolerance)** with strong eventual consistency.

Justification: Collaborative editors must remain available during network partitions (offline editing is a first-class requirement). CRDTs provide mathematically guaranteed convergence, delivering strong eventual consistency without sacrificing availability.

### Consistency Model

| Aspect | Model | Rationale |
|--------|-------|-----------|
| Document content | Strong eventual consistency (CRDT) | All replicas converge to identical state |
| Block tree structure | Strong eventual consistency (Tree CRDT) | Moves and reparenting merge deterministically |
| Presence/cursors | Best effort, ephemeral | Stale cursor positions are harmless |
| Permissions | Strong consistency (server-authoritative) | Security cannot be eventually consistent |
| Version history | Causal consistency | Snapshots must reflect causal ordering |

### Availability Target

**99.95%** (26 minutes downtime/month) for online collaboration.

**100% for editing** --- offline-first architecture means the editor never goes "down" from the user's perspective; only sync is affected by outages.

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Local keystroke to screen | <5ms | <10ms | <20ms |
| Edit propagation to peers | <50ms | <150ms | <300ms |
| Cursor/presence update | <30ms | <100ms | <200ms |
| Offline merge on reconnect | <500ms | <2s | <5s |
| Document load (cold) | <200ms | <500ms | <1s |
| Document load (cached) | <20ms | <50ms | <100ms |
| Full-text search | <100ms | <300ms | <500ms |

### Durability Guarantees

- **Zero data loss** for committed operations (operation log + periodic snapshots)
- Offline edits persisted to local storage (IndexedDB/SQLite) before any network operation
- Server-side triple replication across availability zones

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- 100M registered users (Notion-scale)
- 30M MAU, 10M DAU
- Average session: 45 minutes, 3 sessions/day
- 200 blocks per document average, 50 documents per active user
- Average block size: 200 bytes (text + properties + metadata)
- 2 edits/second during active editing
- Average 2.5 concurrent editors per active document
- 20% of DAU editing simultaneously at peak

### Calculations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| DAU | 10M | Given |
| Peak concurrent users | 2M | 10M DAU * 20% |
| Active documents (peak) | 800K | 2M users / 2.5 editors per doc |
| Operations/sec (average) | 4M | 2M users * 2 ops/sec |
| Operations/sec (peak) | 8M | 2x average |
| Presence updates/sec | 2M | 2M users * 1 update/sec |
| WebSocket connections (peak) | 2M | 1 per active user |
| Storage per document | 40 KB | 200 blocks * 200 bytes |
| Total document storage | 100 TB | 10M DAU * 50 docs * 40KB * 5x (versions) |
| Operation log storage (Year 1) | 500 TB | 4M ops/sec * 100 bytes * 86400s * 365 * 0.4 (compression) |
| Operation log storage (Year 5) | 2.5 PB | 5x Year 1 |
| Bandwidth (peak) | 800 MB/s | 8M ops * 100 bytes |
| Cache size (hot documents) | 32 GB | 800K docs * 40 KB |

### Storage Breakdown

| Component | Size | Notes |
|-----------|------|-------|
| Block content | 100 TB | Document blocks with properties |
| Operation logs | 500 TB/year | Full edit history for replay |
| Version snapshots | 50 TB | Periodic snapshots for fast loading |
| CRDT metadata | 200 TB | Per-character/block CRDT state |
| Search index | 20 TB | Full-text index across documents |
| Media attachments | 500 TB | Images, files embedded in blocks |

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability (online sync) | 99.95% | Percentage of time sync service is reachable |
| Availability (editing) | 100% | Offline-first; editor never unavailable |
| Edit propagation (p99) | <300ms | Time from one client's edit to another client's render |
| Cursor sync (p99) | <200ms | Cursor position broadcast latency |
| Offline merge (p99) | <5s | Time to merge offline edits on reconnect |
| Document load (p99) | <1s | Time to load and render a document |
| Data durability | 99.999999999% (11 nines) | Operations stored in replicated log |
| Error rate | <0.01% | Failed operations as percentage of total |
| CRDT convergence | 100% | All replicas MUST converge (mathematical guarantee) |

---

## Traffic Patterns

### Daily Pattern

```
Operations/sec
    |
8M  |          *****
    |        **     **
4M  |      **         **
    |    **             **
2M  |  **                 **
    |**                     **
    +----------------------------> Time (UTC)
     0  4  8  12  16  20  24
```

### Burst Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Company all-hands (1000+ editors in one doc) | WebSocket fan-out bottleneck | Operation batching, delta compression |
| Back-to-school/work (Monday 9 AM) | 3x normal document loads | Pre-warming caches, auto-scaling |
| Mass offline reconnection | Merge storm on sync servers | Queue-based merge processing, rate limiting |
| Viral template duplication | Sudden block tree cloning | Lazy copy, background materialization |
