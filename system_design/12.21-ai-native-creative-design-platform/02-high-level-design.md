# 12.21 AI-Native Creative Design Platform — High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web Editor\nCanvas + CRDT Client]
        MOB[Mobile App\nSimplified Editor]
        API_EXT[Public API\nHeadless Generation]
    end

    subgraph Gateway["API Gateway Layer"]
        GWY[API Gateway\nAuth + Rate Limiting]
        WS[WebSocket Gateway\nCollaboration Transport]
    end

    subgraph GenEngine["Generative Engine"]
        ORCH[Generation Orchestrator\nPipeline Coordinator]
        PROMPT[Prompt Interpreter\nLLM Intent Extraction]
        LAYOUT[Layout Generator\nTransformer-based Composition]
        IMGGEN[Image Generator\nDiffusion Model Service]
        TEXTGEN[Text Generator\nLLM Content Service]
        BRAND[Brand Enforcer\nConstraint Validator]
    end

    subgraph Collab["Collaboration Service"]
        CRDT[CRDT Engine\nScene Graph Merge]
        PRES[Presence Service\nCursor + Selection Sync]
        SESS[Session Manager\nRoom Lifecycle]
    end

    subgraph DesignSvc["Design Services"]
        DOC[Document Service\nScene Graph CRUD]
        VER[Version Service\nHistory + Branching]
        TPL[Template Service\nCatalog + Matching]
        RESIZE[Magic Resize\nAdaptive Reflow]
    end

    subgraph AssetPipeline["Asset Pipeline"]
        UPLOAD[Upload Processor\nValidation + Virus Scan]
        SEG[Segmentation Service\nBackground Removal]
        DEDUP[Dedup Engine\nPerceptual Hashing]
        CDN_ORIG[Asset Store\nContent-Addressable]
    end

    subgraph Rendering["Rendering Pipeline"]
        REND[Export Renderer\nVector → Raster/PDF/SVG]
        THUMB[Thumbnail Generator\nAsync Preview Cache]
        SAFE[Content Safety Filter\nNSFW + Policy Check]
    end

    subgraph TokenSys["Design Token System"]
        TSTORE[Token Store\nHierarchical Tokens]
        TVAL[Token Validator\nConsistency Checker]
        DSYS[Design System Manager\nComponent Registry]
    end

    subgraph Data["Data Layer"]
        DOCDB[(Document Store\nScene Graphs)]
        ASSETDB[(Asset Object Store)]
        VECDB[(Vector Index\nTemplate Embeddings)]
        CACHE[(Generation Cache\nResult Store)]
        QUEUE[Job Queue\nAsync Tasks]
    end

    WEB & MOB --> GWY
    WEB --> WS
    API_EXT --> GWY

    GWY --> ORCH
    GWY --> DOC
    GWY --> TPL
    GWY --> UPLOAD

    WS --> CRDT
    CRDT <--> PRES
    CRDT <--> SESS
    CRDT --> DOC

    ORCH --> PROMPT
    PROMPT --> LAYOUT
    PROMPT --> TEXTGEN
    LAYOUT --> IMGGEN
    LAYOUT --> BRAND
    IMGGEN --> BRAND
    TEXTGEN --> BRAND
    BRAND --> CRDT

    DOC --> DOCDB
    DOC <--> VER
    TPL --> VECDB

    UPLOAD --> SEG
    UPLOAD --> DEDUP
    DEDUP --> CDN_ORIG
    SEG --> CDN_ORIG
    CDN_ORIG --> ASSETDB

    ORCH --> CACHE
    IMGGEN --> SAFE
    SAFE --> CACHE

    DOC --> REND
    REND --> QUEUE
    DOC --> THUMB

    BRAND --> TSTORE
    TSTORE --> TVAL
    DSYS --> TSTORE

    RESIZE --> LAYOUT

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WEB,MOB,API_EXT client
    class GWY,WS gateway
    class ORCH,PROMPT,LAYOUT,IMGGEN,TEXTGEN,BRAND,CRDT,PRES,SESS,DOC,VER,TPL,RESIZE,UPLOAD,SEG,DEDUP,REND,THUMB,SAFE,TSTORE,TVAL,DSYS service
    class DOCDB,ASSETDB,VECDB data
    class CACHE cache
    class QUEUE,CDN_ORIG queue
```

---

## Key Design Decisions

### Decision 1: Multi-Model Orchestration Over Monolithic Generation

A monolithic end-to-end model (prompt → finished design as a single inference) would produce impressive demos but fail in production for three reasons: (1) the output must be a structured, editable scene graph—not a flat image—requiring explicit element decomposition; (2) different generation subtasks (layout, imagery, text) have different latency profiles, model architectures, and retraining cadences; (3) brand enforcement requires inspecting and constraining intermediate outputs between generation stages, which is impossible with a single-pass model.

The platform uses a **generation orchestrator** that decomposes a user's prompt into subtasks via an LLM-based prompt interpreter, dispatches each subtask to a specialized model (layout transformer, diffusion image generator, LLM text generator), and assembles the results into a unified scene graph after brand validation. Each model can be updated, scaled, and quantized independently.

**Implication:** The orchestrator introduces coordination overhead (~200 ms) but enables independent model iteration. A new diffusion model version can be deployed without touching the layout transformer, and vice versa. Brand enforcement sits between generation and rendering, acting as a deterministic filter that can veto or adjust any generation output.

### Decision 2: CRDT-Based Scene Graph as the Single Source of Truth

All state—human edits and AI-generated content—flows through a CRDT-based scene graph. This eliminates the "two writers" problem where human edits and AI patches compete for document authority. The CRDT treats every mutation as an operation on a node in the scene graph tree: insert element, update property, move position, delete element. AI generation produces a batch of operations that are merged into the live document through the same path as a human's drag-and-drop.

**Implication:** The AI generation pipeline cannot write directly to the document store—it submits its output as a CRDT operation batch to the collaboration service, which merges it with any concurrent human edits and broadcasts the result to all connected clients. This ensures that a design is never in an inconsistent state between what the human sees and what the AI produced.

### Decision 3: Brand Enforcement as a Constraint Layer, Not a Post-Processing Filter

Brand consistency cannot be achieved by generating an unconstrained design and then adjusting colors and fonts afterward. Color shifts applied to generated images produce artifacts; font substitution after layout breaks text fitting; logo insertion after composition disrupts visual balance. Instead, brand constraints are injected at generation time:

- **Layout generator** receives brand spacing scale and grid system as conditioning parameters
- **Image generator** receives brand color palette as style conditioning (via CLIP-guided style embedding)
- **Text generator** receives brand voice guidelines as system prompt context
- **Brand enforcer** validates the assembled scene graph against the full brand kit rule set; violations are corrected by re-generating only the violating element with tighter constraints

**Implication:** Brand enforcement adds ~100 ms validation latency but prevents the need for iterative post-hoc correction, which would be both slower and lower quality.

### Decision 4: Client-Side Vector Rendering with Server-Side Export

The canvas editing experience runs entirely client-side using GPU-accelerated vector rendering (WebGPU/WebGL). The scene graph is rendered locally at 60 FPS without round-trips to the server. This is essential for interactive editing (drag, resize, type) where 100ms+ server round-trip latency would make the tool feel unresponsive.

Server-side rendering is reserved for two use cases: (1) export to final formats (high-resolution PNG, print-ready PDF, SVG) where deterministic cross-platform output is required; (2) thumbnail generation for design listings and search results.

**Implication:** The client must be capable of rendering the full scene graph locally, which constrains scene graph complexity (designs with 1000+ elements may degrade client performance). The system enforces soft limits on element count and provides performance warnings.

### Decision 5: Content-Addressable Asset Store with Perceptual Deduplication

At 100M uploads/day, naive per-user file storage would produce massive duplication (the same stock photo uploaded by thousands of users). The asset store uses content-addressable storage (SHA-256 hash as the key) combined with perceptual hashing (pHash) for near-duplicate detection. Two images that are the same photo at different resolutions or with minor cropping differences are stored once and referenced by all users.

**Implication:** Reduces asset storage by an estimated 40% compared to per-user storage. However, requires careful handling of the dedup lookup: a hash computation + perceptual hash comparison adds ~50 ms to the upload pipeline, which is acceptable for async upload but would be too slow for inline operations.

---

## Data Flow: Text-to-Design Generation

```mermaid
flowchart LR
    A[User Enters Prompt\n'Social media post\nfor coffee brand'] --> B[API Gateway\nAuth + Rate Limit]
    B --> C[Generation Orchestrator\nDecompose Intent]
    C --> D[Prompt Interpreter\nExtract: layout type,\ncontent slots, style cues]
    D --> E[Layout Generator\nCompose element\narrangement]
    D --> F[Text Generator\nGenerate headline,\nbody, CTA]
    E --> G[Image Generator\nGenerate hero image\nfor each image slot]
    F --> H[Brand Enforcer\nValidate fonts,\ncolors, tone]
    G --> H
    E --> H
    H -->|Pass| I[Scene Graph Assembly\nMerge all elements]
    H -->|Fail: violation| J[Re-generate\nviolating element\nwith tighter constraints]
    J --> H
    I --> K[CRDT Merge\nSubmit as operation batch]
    K --> L[Client Render\nDesign appears on canvas]
    I --> M[Cache Result\nStore for reuse]

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class A,B input
    class C,D,E,F,G,I,K,M process
    class H decision
    class J,L output
```

---

## Data Flow: Collaborative Editing with AI Generation

```mermaid
flowchart TB
    subgraph Users["Connected Clients"]
        U1[Designer A\nEditing text element]
        U2[Designer B\nMoving image element]
        U3[Designer C\nTriggered AI generation]
    end

    subgraph CollabLayer["Collaboration Service"]
        WS1[WebSocket Handler\nReceive operations]
        CRDT1[CRDT Engine\nMerge all operations]
        BC[Broadcast\nFan-out to all clients]
    end

    subgraph AIPath["AI Generation Path"]
        SNAP[Snapshot Current\nScene Graph State]
        GEN[Generate Layout\nPatch as CRDT ops]
        MERGE[Submit Patch\nTo CRDT Engine]
    end

    subgraph Storage["Persistence"]
        DOC1[Document Store\nCheckpoint every 500ms]
        VH[Version History\nSnapshot on generation]
    end

    U1 --> WS1
    U2 --> WS1
    U3 --> SNAP
    SNAP --> GEN
    GEN --> MERGE
    MERGE --> WS1
    WS1 --> CRDT1
    CRDT1 --> BC
    BC --> U1 & U2 & U3
    CRDT1 --> DOC1
    GEN --> VH

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class U1,U2,U3 client
    class WS1,CRDT1,BC,SNAP,GEN,MERGE service
    class DOC1,VH data
```

---

## Component Responsibilities Summary

| Component | Primary Responsibility | Key Interface |
|---|---|---|
| **API Gateway** | Authentication, rate limiting, request routing, API versioning | REST + GraphQL; WebSocket upgrade for collaboration |
| **Generation Orchestrator** | Decomposes generation requests into subtask pipeline; coordinates model dispatch and result assembly | Internal gRPC; async with progress streaming |
| **Prompt Interpreter** | Extracts structured intent (layout type, content slots, style cues, brand context) from natural language prompt | LLM inference; output is structured JSON intent spec |
| **Layout Generator** | Produces spatial arrangement of typed elements (positions, sizes, hierarchy) given content slots and constraints | Transformer inference; output is element placement array |
| **Image Generator** | Produces images for design elements via diffusion model (text-to-image, inpainting, style transfer) | GPU inference; output is image bytes + generation metadata |
| **Text Generator** | Generates text content for design elements (headlines, body, CTAs) given context and brand voice | LLM inference; output is text + formatting suggestions |
| **Brand Enforcer** | Validates generated content against brand kit rules; rejects or adjusts violations | Deterministic rule engine; input is scene graph + brand kit; output is pass/fail + corrections |
| **CRDT Engine** | Merges concurrent operations (human + AI) on the scene graph; maintains consistency | WebSocket transport; LWW-Register + RGA for text; tree-based CRDT for scene graph |
| **Document Service** | Persists scene graph state; manages design metadata, sharing, permissions | REST CRUD; backed by document store |
| **Version Service** | Tracks design history; supports undo/redo and branching | Snapshot-based; delta-compressed version chain |
| **Template Service** | Manages template catalog; semantic search for template matching | Embedding-based search via vector index |
| **Asset Pipeline** | Processes uploads (validation, virus scan, segmentation, deduplication); stores in content-addressable store | Async pipeline; upload → process → store |
| **Export Renderer** | Converts scene graph to final output format (PNG, PDF, SVG, MP4) | Async job queue; deterministic rendering engine |
| **Content Safety Filter** | Screens AI-generated images for NSFW, violence, and policy-violating content | ML classifier; runs on every generated image before canvas display |
| **Design Token System** | Manages hierarchical design tokens; validates component consistency against token definitions | Token CRUD API; used by brand enforcer and design system manager |
