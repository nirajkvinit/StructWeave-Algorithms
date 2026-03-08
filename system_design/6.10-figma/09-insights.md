# Key Architectural Insights

## Insight 1: Property-Level LWW CRDTs Are the Right Abstraction for Design Tools

**Category**: Consistency

**One-liner**: Design documents decompose naturally into independent property registers, making LWW CRDTs both simpler and more correct than sequence CRDTs.

**Why it matters**: The most common mistake when designing a collaborative design tool is reaching for the same CRDT model used by text editors. Text editors need sequence CRDTs (like YATA or Fugue) because character ordering is the essence of the document—if two users insert at the same position, both characters must be preserved in a deterministic order. Design tools have a fundamentally different conflict profile: the "document" is a tree of nodes, each with dozens of independent properties (x, y, width, height, fill, stroke, opacity, effects, constraints, name...). When two users change different properties of the same rectangle, there is no conflict at all—both changes are preserved. When two users change the same property (e.g., both drag the same rectangle), there is no meaningful "merge" of two positions—the rectangle can only be in one place, and last-writer-wins is the correct semantic.

This insight has profound architectural implications. Traditional text CRDTs require 4-32 bytes of metadata per character and accumulate tombstones for every deletion. Figma's property-level LWW model requires only ~16 bytes of metadata per property per node—and since a file with 100,000 nodes has perhaps 2 million properties (far fewer than a text document's millions of characters), the memory overhead is manageable. The CRDT logic itself is trivial: compare timestamps, keep the higher one. This simplicity means fewer bugs, faster processing, and easier reasoning about correctness.

---

## Insight 2: WebAssembly Enables a "Write Once, Render Identically Everywhere" Architecture

**Category**: System Architecture

**One-liner**: By compiling a C++ rendering engine to WebAssembly and rendering via WebGL, Figma achieves native performance and pixel-perfect cross-platform consistency in the browser.

**Why it matters**: Conventional wisdom says "the browser is slow for graphics." Figma disproved this by recognizing that the browser's rendering pipeline (DOM → layout → paint → composite) is slow for the specific workload of a design tool, but the browser's GPU access via WebGL is fast. By bypassing the DOM entirely and treating the browser as a display surface for a custom rendering engine, Figma gets the distribution advantages of the web (no install, instant sharing via URL, automatic updates) with the performance of a native application.

The cross-platform consistency aspect is equally critical. Different operating systems render text differently: macOS uses subpixel antialiasing, Windows uses ClearType, Linux uses FreeType. A designer who creates a mockup on macOS expects the developer viewing it on Windows to see exactly the same pixels. Figma's custom text rasterizer in WASM guarantees this—the same font rendering code runs identically everywhere because it does not delegate to the platform's text engine. This architectural decision is what makes Figma trustworthy for design handoff, and it explains why no competitor has replicated this experience with standard web technologies.

---

## Insight 3: Fractional Indexing Eliminates the Reorder Problem That Plagues Sequence CRDTs

**Category**: Data Structures

**One-liner**: By assigning rational numbers as sort keys instead of using sequence CRDTs for layer ordering, Figma makes reordering a single property write instead of a delete-plus-insert.

**Why it matters**: In a design tool, layer ordering (z-order in the layers panel) changes frequently—designers constantly drag layers to reorder them. With a sequence CRDT, reordering means "delete from position A, insert at position B"—two operations that create a tombstone at the old position and a new entry at the new position. Over time, these tombstones accumulate, degrading performance. Worse, concurrent reorders of different layers can produce interleaving artifacts that violate user intention.

Fractional indexing takes a different approach: each node has a `sort_order` property (a rational number). Reordering means setting `sort_order` to a value between the two adjacent nodes. This is a single LWW property write—no tombstones, no deletion, no insertion. Concurrent reorders of different nodes produce no conflict (they write to different nodes' sort_order). Concurrent reorders of the same node resolve via LWW (last move wins), which is the correct semantic—the layer ends up where the last user dragged it. The only edge case is precision exhaustion after many insertions between the same pair of nodes, which is solved by periodic rebalancing (re-assigning evenly spaced values to all siblings). This rebalancing is rare in practice because designers rarely insert dozens of layers between the same two siblings.

---

## Insight 4: The Component/Instance Override Model Is a Specialized Merge Strategy

**Category**: Data Modeling

**One-liner**: Components and instances implement a property-level inheritance with selective override tracking—a merge strategy more nuanced than any standard CRDT pattern.

**Why it matters**: Figma's component system allows a designer to define a "Button" component and instantiate it 500 times across a file. Each instance inherits all properties from the main component but can override any of them (change the label text, swap the icon, adjust the color for a specific context). When the main component changes, only non-overridden properties propagate to instances; overridden properties stay as the designer set them. This is neither pure inheritance (where child changes are always overwritten) nor pure cloning (where the link is broken). It is a selective merge strategy that must track, per-property per-instance, whether the instance value came from the component or from a local override.

This model interacts with CRDTs in subtle ways. When User A changes the main component's fill color while User B overrides the fill on one instance, the resolution is: User A's change propagates to all instances except the one where User B set an override. This is correct—but requires the multiplayer system to distinguish between "inherited value" and "overridden value" in its CRDT state. Nested components add another dimension: if Button contains an Icon component, and the Icon component's designer changes it, the change must cascade through Icon instances inside Button instances inside every page that uses Button. This cascading propagation is one of the most computationally expensive operations in Figma's architecture, and it explains why component change propagation is handled as a background task with dirty-flag optimization rather than synchronously.

---

## Insight 5: Spatial Multiplayer Requires Viewport-Aware Broadcasting

**Category**: Scaling

**One-liner**: Unlike text editors where all users share one cursor space, design tool multiplayer must be spatially filtered—sending cursor data only to users whose viewports overlap.

**Why it matters**: In a text editor, every user is working in the same linear document space. A cursor at "line 47, column 12" is meaningful to all collaborators regardless of where they are in the document. In a design tool, the canvas is an infinite 2D plane. User A might be zoomed into the header at (0, 0, zoom=4x) while User B is working on the footer at (0, 5000, zoom=1x). Sending User A's cursor position to User B is wasteful—User B cannot see that part of the canvas without scrolling. With 500 users on different parts of a large canvas, naive broadcasting would send 499 cursor updates per mouse movement, most of them invisible to recipients.

Viewport-aware broadcasting solves this by tracking each user's current viewport (x, y, width, height, zoom) and only sending cursor updates to users whose viewports overlap with the cursor's position. For a typical multi-page file, this reduces cursor traffic by 80-95% because most users are on different pages or different regions of the same page. The presence server maintains a lightweight spatial index of viewports to make this filtering efficient. A subtle optimization is the "entry/exit margin"—viewports are expanded by 20% for cursor filtering so that cursors smoothly appear as another user scrolls toward your area, rather than popping in abruptly at the viewport edge.

---

## Insight 6: The Multiplayer Server Is a Relay, Not a Transformer

**Category**: System Architecture

**One-liner**: Figma's multiplayer server assigns sequence numbers and broadcasts operations but never transforms them—convergence is guaranteed by the CRDT model, not by server logic.

**Why it matters**: In an OT-based system (like the original Google Docs architecture), the server is the brains of the operation—it must transform every incoming operation against all concurrent operations to produce a correct merged result. This makes the server a complex, stateful bottleneck that must be rigorously correct. If the transform function has a bug, documents diverge permanently.

Figma's architecture inverts this responsibility. The server is deliberately simple: receive operation, assign monotonic sequence number, persist to operation log, broadcast to all other clients. The server does not look at the operation contents. The server does not transform anything. Convergence is guaranteed by the mathematical properties of CRDTs—any ordering of LWW register writes produces the same final state (commutativity), and applying the same write twice has no additional effect (idempotence). This means the server can be implemented in weeks rather than months, tested with simple integration tests rather than formal verification, and scaled by adding more servers without worrying about cross-server transform consistency. The server's role is reduced to three things: ordering (sequence numbers), durability (operation log), and routing (fan-out to correct clients). Each of these is a well-understood, independently scalable concern.

---

## Insight 7: Binary Scene Graph Format Trades Queryability for Load Speed

**Category**: Storage

**One-liner**: Storing the scene graph as a compact binary blob makes file open 10-50x faster than reconstructing from relational tables, at the cost of requiring a separate search index.

**Why it matters**: "File open time" is the most visible latency in a design tool—users click a file and stare at a loading screen. In a relational model, loading a 100,000-node scene graph requires joining NODE, PROPERTY, COMPONENT, INSTANCE tables across potentially millions of rows, reconstructing the tree hierarchy, and deserializing JSON properties. This easily takes 2-5 seconds for large files. Figma's binary format stores the entire scene graph as a single sequential blob—one read operation, no joins, no deserialization (the binary format can be memory-mapped directly into the WASM heap). A 2 MB binary blob loads in 20-50ms from cache.

The trade-off is queryability: you cannot write `SELECT * FROM nodes WHERE type = 'TEXT' AND fill = '#FF0000'`. This is acceptable because the two primary access patterns—"open file" and "real-time sync"—both want the full scene graph. Search ("find all red text") is handled by a separate full-text search index that is updated asynchronously when the scene graph changes. The binary format also enables efficient delta encoding for version snapshots—storing only the bytes that changed between versions rather than full document copies. This dual-storage architecture (binary blob for speed, separate index for search) is a common pattern in systems where the primary access pattern is "load everything" rather than "query specific fields."

---

## Insight 8: Plugin Sandbox Design Mirrors Operating System Security Principles

**Category**: Security

**One-liner**: Figma's plugin iframe sandbox implements capability-based security, treating each plugin as an untrusted process with a declared permission manifest—exactly like mobile app permissions.

**Why it matters**: Figma's plugin ecosystem has thousands of third-party plugins that can read and modify the design document. Without a robust sandbox, a single malicious plugin could exfiltrate proprietary designs, corrupt documents, or crash the editor. The sandbox design follows operating system security principles: each plugin runs in an isolated iframe (analogous to a process with its own memory space), communicates only via message passing (analogous to system calls), and must declare its required capabilities in a manifest (analogous to Android/iOS permissions).

The key architectural insight is that the message-passing bridge is the chokepoint where all security enforcement happens. Every plugin API call (read a node, create a node, make a network request) passes through this bridge, which checks: (1) Does the plugin's manifest allow this capability? (2) Has the plugin exceeded its rate limit? (3) Is the input well-formed? (4) Is the target node accessible to the file owner? This centralized enforcement point means the sandbox security is independent of the plugin code—even a completely malicious plugin can only do what its declared capabilities allow. The iframe sandbox attribute provides defense-in-depth: even if the message-passing bridge has a bug, the iframe cannot access the main thread's DOM, cookies, localStorage, or make network requests outside its CSP whitelist. This layered security model is what makes it safe to run arbitrary third-party code inside a production design tool.
