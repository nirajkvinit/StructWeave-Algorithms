# 12.21 AI-Native Creative Design Platform — Deep Dives & Bottlenecks

## Deep Dive 1: Generative Engine — Multi-Model Orchestration at Scale

### The Pipeline Decomposition Problem

A user types "create an Instagram post for a summer sale at a coffee shop." The generation orchestrator must decompose this into:

1. **Intent extraction** (LLM): Identify design type (social media post), content slots (hero image, headline, body, CTA, logo), style cues (summer, warm, inviting), and implied constraints (1080×1080 Instagram square)
2. **Layout generation** (transformer): Position content slots in a visually balanced arrangement considering the number of elements, hierarchy, and aspect ratio
3. **Image generation** (diffusion model): Generate a hero image matching "summer coffee shop" in a style consistent with the brand kit (if active)
4. **Text generation** (LLM): Produce headline ("Summer Sips, Hot Deals"), body copy, and CTA text in the brand voice
5. **Brand validation** (deterministic): Verify all generated content against brand kit constraints
6. **Assembly**: Merge generated elements into a structured scene graph

These subtasks have dependencies: layout must complete before image generation (to know image dimensions), but text generation can run in parallel with image generation. The orchestrator builds a DAG of subtasks and executes them with maximum parallelism.

### Latency Budget Management

The 5-second p95 SLO is the hardest constraint. The latency budget:

```
Subtask latency budget:
  Prompt interpretation:     ~400 ms (small LLM, cached common intents)
  Layout generation:         ~600 ms (transformer, ~50M params)
  Image generation:          ~2,500 ms (diffusion, 20 steps, INT8 quantized)
  Text generation:           ~300 ms (distilled LLM, short output)
  Brand validation:          ~100 ms (deterministic rule engine)
  Assembly + CRDT merge:     ~100 ms
  Total sequential path:     ~4,000 ms

  With parallelism (text || image):
  Critical path: prompt → layout → max(image, text) → brand → assembly
                 400 + 600 + 2,500 + 100 + 100 = 3,700 ms
  Headroom for retries:      ~1,300 ms
```

Image generation is the latency bottleneck. Every optimization in the diffusion pipeline directly expands the headroom for the rest of the system.

### Speculative Precomputation

When a user opens a design and starts typing a prompt, the system speculatively precomputes partial results:

- **Template prefetch**: As the user types, intent classification runs on partial input and pre-fetches likely layout templates from the cache
- **Image warm-up**: Common style embeddings (photo-realistic, illustration, flat design) are pre-loaded on GPU memory
- **Brand kit caching**: The active brand kit's style embedding and constraint rules are cached in the orchestrator's memory to eliminate a database read on generation start

This speculative strategy reduces perceived latency by 500–800 ms for subsequent generations within the same session.

### Model Version Management

The generative engine runs multiple model versions simultaneously:

- **Stable version**: The production-validated model serving all users by default
- **Canary version**: A new model version receiving 5% of traffic for quality evaluation
- **Shadow version**: A model running inference in parallel but not serving results; outputs compared to stable for quality regression detection

Each generation job logs the model versions used for all subtasks, enabling tracing of quality regressions to specific model versions.

---

## Deep Dive 2: Brand Consistency Enforcement

### The Constraint Interaction Problem

Brand constraints interact in ways that create non-obvious conflicts:

**Color constraint vs. image legibility**: A brand palette of {dark navy, gold, white} works well on light backgrounds but creates legibility problems when text overlays a dark AI-generated image. The brand enforcer must detect that a white headline on a dark image is legible, but a navy headline on a dark image is not, and either adjust the text color within the palette (use white instead of navy) or request re-generation of the image with a lighter region behind the text.

**Typography constraint vs. layout fit**: A brand font with wide glyphs (e.g., a condensed geometric font) may cause a headline to overflow its layout bounds. The enforcer must decide between: (a) reducing font size, (b) requesting shorter text from the text generator, or (c) adjusting the layout to give the text more horizontal space. Each choice has different visual quality implications.

**Logo placement vs. visual balance**: Brand rules specify a logo zone (e.g., "bottom-right, minimum 20px margin"). But if the layout places a large image in the bottom-right, the logo overlaps. The enforcer must adjust the image position or size, not the logo placement (logo rules are typically non-negotiable).

### Enforcement Architecture

```
Brand enforcement pipeline:
  Input: assembled scene_graph + brand_kit rules

  Pass 1 — Color validation:
    FOR each element with fill/stroke color:
      IF color NOT IN brand_kit.color_palette (within ΔE < 5 perceptual distance):
        Map to nearest palette color
        IF mapping changes legibility (contrast ratio < 4.5:1 against background):
          Try alternative palette color with sufficient contrast
          IF no alternative: flag as violation; request re-generation

  Pass 2 — Typography validation:
    FOR each TEXT element:
      IF font_family NOT IN brand_kit.typography:
        Substitute nearest brand font; recompute text bounds
      IF font_size outside brand scale:
        Snap to nearest scale value; adjust bounds

  Pass 3 — Logo placement validation:
    FOR each logo element:
      Check clear space, position zone, minimum size
      IF violation: adjust; if adjustment conflicts with other elements, re-layout

  Pass 4 — Imagery style validation:
    FOR each AI-generated image:
      Compute CLIP embedding similarity to brand_kit.imagery_style
      IF similarity < STYLE_THRESHOLD (typically 0.7):
        Flag; optionally re-generate with stronger style conditioning

  Pass 5 — Spacing and grid validation:
    Verify element positions snap to brand spacing scale
    Verify alignment grid compliance

  Output: validated scene_graph + list of corrections applied + list of unresolvable violations
```

### Learning from Corrections

When users manually override brand enforcer corrections (e.g., choosing a color that's slightly off-palette), these overrides are logged and analyzed. Over time, the system learns which brand rules users frequently override, and these rules are flagged for the brand manager to review—perhaps the palette needs an additional color, or a spacing rule is too restrictive. This creates a feedback loop between rigid brand enforcement and practical design needs.

---

## Deep Dive 3: Real-Time Collaboration with AI Co-Creation

### The AI-as-Collaborator Problem

In a traditional collaborative editor (documents, spreadsheets), all writers are humans producing small, incremental operations (type a character, move a cell). AI generation introduces a fundamentally different writer: it produces large, bulk operations (insert 5 new elements with positions, styles, and content) atomically, after a multi-second generation delay.

**Problem 1: Stale context.** When Designer A triggers AI generation, the AI takes 4 seconds to produce results. During those 4 seconds, Designer B moves several elements. The AI's output was generated against a stale snapshot of the scene graph and may conflict with Designer B's edits—for example, placing an image where Designer B just moved a text block.

**Problem 2: Granularity mismatch.** A human edit is a single property change on a single node. An AI generation is a batch of 5–15 new nodes with interdependent positions. If a conflict is detected on one node in the batch, should the entire batch be rejected? Or only the conflicting node?

### Resolution Strategy

```
AI generation conflict resolution:
  1. AI generation takes a snapshot of scene_graph at generation start time (t0)
  2. AI generates output as a list of CRDT operations against the t0 snapshot
  3. When output arrives at CRDT engine (at time t1 = t0 + generation_latency):
     a. Compute diff between scene_graph(t0) and scene_graph(t1)
        (all human edits that occurred during generation)
     b. Classify conflicts:
        - SPATIAL CONFLICT: AI placed an element at a position now occupied by a human-moved element
        - DELETION CONFLICT: AI references an element that a human deleted during generation
        - STYLE CONFLICT: AI styled an element that a human restyled during generation
     c. Resolve:
        - SPATIAL: Re-run layout placement for the conflicting AI element only,
          using the current (t1) scene graph as context; keep all other AI elements
        - DELETION: Drop the AI operation referencing the deleted element
        - STYLE: Human edit wins (human intent takes priority over AI suggestion)
  4. Apply resolved operations through CRDT merge path
  5. Broadcast to all clients with "AI generation" marker for undo grouping
```

### Undo Semantics for AI Operations

When a user hits undo after an AI generation, they expect the entire generation to be undone as a single unit—not element by element. The version service groups all operations from a single generation_job into an undo group. Undoing an AI generation removes all inserted elements and reverts all modified properties in a single step. This requires the undo system to operate on operation groups, not individual operations.

### Presence-Aware Generation

When a user triggers AI generation, the collaboration service broadcasts a "generating" indicator at the region of the canvas where elements will appear. Other collaborators see a subtle pulsing area indicating that AI content is being generated there, discouraging them from editing in that zone during the generation window. This is a soft lock—it does not prevent edits, but reduces the likelihood of spatial conflicts.

---

## Deep Dive 4: Asset Pipeline and Rendering Fidelity

### Content-Addressable Deduplication at Scale

At 100M uploads/day, the dedup pipeline must be both fast and accurate:

```
Dedup pipeline:
  1. Compute SHA-256 hash of uploaded file → exact duplicate check in hash index
     Latency: ~5 ms for hash lookup
     Hit rate: ~15% of uploads are exact duplicates

  2. If no exact match: compute perceptual hash (pHash)
     Latency: ~20 ms for pHash computation
     Compare against pHash index (Hamming distance ≤ 5 = near-duplicate)
     Hit rate: ~25% additional near-duplicates detected

  3. If near-duplicate detected:
     Store the higher-resolution version; create reference from lower-resolution upload
     Merge metadata (tags, attribution)

  4. If no duplicate:
     Store in content-addressable object storage
     Generate thumbnails at standard sizes (64px, 256px, 1024px)
     Run content safety screening
     Index for search (CLIP embedding for visual search)

  Total dedup savings: ~40% storage reduction
  Pipeline latency: ~50 ms for exact match; ~100 ms for pHash check
```

### Cross-Format Rendering Determinism

The same design must render identically across formats. This is harder than it appears:

- **Color space**: The scene graph uses sRGB internally. PDF export for print requires CMYK conversion. Some brand colors have no exact CMYK equivalent—the rendering engine uses ICC profile-based conversion with configurable rendering intent (perceptual vs. relative colorimetric).
- **Font rendering**: Different platforms render the same font differently (hinting, anti-aliasing). The export renderer uses a consistent text-to-path conversion for PDF/SVG to ensure cross-platform fidelity, while maintaining editable text in native formats.
- **Transparency compositing**: Overlapping semi-transparent elements must composite identically across formats. The rendering engine uses Porter-Duff compositing with pre-multiplied alpha throughout the pipeline.
- **Image resampling**: Scaling AI-generated images for different export resolutions uses Lanczos resampling for downscaling and ESRGAN-based neural upscaling for resolution increase.

### Content Safety at Generation Time

Every AI-generated image passes through a content safety classifier before being displayed on canvas. The classifier must be:

- **Fast**: ≤ 50 ms per image (included in the generation latency budget)
- **Accurate**: 99.99% catch rate for NSFW/violence; ≤ 0.1% false positive rate (blocking safe content degrades user experience)
- **Multi-class**: Detects NSFW, violence, hate symbols, identifiable real people (deepfake risk), copyrighted characters, and brand-specific prohibited content

False positives (safe images blocked) are logged and reviewed daily to improve the classifier. False negatives (unsafe images displayed) trigger immediate investigation and are treated as SEV-1 incidents.

---

## Key Bottlenecks and Mitigations

| Bottleneck | Root Cause | Mitigation |
|---|---|---|
| **GPU fleet cost** | Diffusion model inference at scale costs ~$69M/year; each efficiency improvement saves millions | INT8 quantization (2x throughput); result caching (cache hit rate target: 15% for popular styles); progressive generation (show 4-step preview, complete 20 steps async); model distillation to fewer steps |
| **Generation latency tail** | p99 generation latency spikes during GPU contention | Priority queuing with SLO-aware scheduling; dedicated GPU pools for premium users; preemption of lower-priority batch jobs during peak |
| **Brand enforcement cascading re-generation** | Multiple constraint violations may require iterative re-generation loops | Limit re-generation to 2 iterations; after that, deliver with violations flagged; invest in conditioning quality to reduce first-pass violations |
| **CRDT merge overhead at large document size** | Documents with 500+ elements produce large operation logs; merge latency increases | Hierarchical CRDT: merge at subgraph level (frame by frame) rather than global document; prune operation log after checkpoint |
| **Asset storage growth** | 120 TB/day net new assets after dedup; rolling storage grows to petabyte scale | Lifecycle management: assets unreferenced for 180 days moved to cold storage; assets unreferenced for 365 days eligible for deletion with user notification |
| **Template search relevance** | Million-template catalog with diverse user intents; keyword search insufficient | Embedding-based semantic search (CLIP for visual + text encoder for description); user intent classification + template embedding similarity |
