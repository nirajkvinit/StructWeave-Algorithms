# Deep Dive & Bottlenecks

## Critical Component #1: Quality Estimation (QE) Pipeline

### Why This is Critical

Quality Estimation is the linchpin of the entire platform—it determines which translations are auto-approved vs. routed to human editors. A miscalibrated QE model can either:
1. **Over-approve** → Bad translations reach customers, damaging brand trust
2. **Under-approve** → Excessive human review costs, defeating the purpose of MT

### How It Works Internally

```mermaid
flowchart TB
    subgraph Input["Input Processing"]
        Source["Source Text"]
        MT["MT Output"]
        Tokenize["Tokenize &<br/>Normalize"]
    end

    subgraph Encoder["Cross-Lingual Encoder"]
        XLMEncoder["XLM-RoBERTa<br/>Encoder"]
        PooledSource["Pooled Source<br/>Embedding"]
        PooledTarget["Pooled Target<br/>Embedding"]
    end

    subgraph Features["Feature Extraction"]
        Cosine["Cosine<br/>Similarity"]
        ElemProduct["Element-wise<br/>Product"]
        AbsDiff["Absolute<br/>Difference"]
        Concat["Concatenate<br/>Features"]
    end

    subgraph Regression["Regression Head"]
        Hidden1["Hidden Layer 1<br/>(ReLU)"]
        Dropout["Dropout<br/>(0.1)"]
        Hidden2["Hidden Layer 2<br/>(ReLU)"]
        Output["Sigmoid<br/>Output"]
    end

    subgraph Calibration["Score Calibration"]
        RawScore["Raw Score<br/>[0, 1]"]
        LangPairAdj["Language Pair<br/>Adjustment"]
        DomainAdj["Domain<br/>Adjustment"]
        FinalScore["Calibrated<br/>Score"]
    end

    Source --> Tokenize
    MT --> Tokenize
    Tokenize --> XLMEncoder
    XLMEncoder --> PooledSource
    XLMEncoder --> PooledTarget

    PooledSource --> Cosine
    PooledTarget --> Cosine
    PooledSource --> ElemProduct
    PooledTarget --> ElemProduct
    PooledSource --> AbsDiff
    PooledTarget --> AbsDiff

    Cosine --> Concat
    ElemProduct --> Concat
    AbsDiff --> Concat

    Concat --> Hidden1 --> Dropout --> Hidden2 --> Output

    Output --> RawScore --> LangPairAdj --> DomainAdj --> FinalScore

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef encoder fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef features fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef regression fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef calibration fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Source,MT,Tokenize input
    class XLMEncoder,PooledSource,PooledTarget encoder
    class Cosine,ElemProduct,AbsDiff,Concat features
    class Hidden1,Dropout,Hidden2,Output regression
    class RawScore,LangPairAdj,DomainAdj,FinalScore calibration
```

### Model Architecture Details

| Layer | Dimensions | Purpose |
|-------|------------|---------|
| XLM-RoBERTa Encoder | 768 | Cross-lingual sentence embeddings |
| Feature Concatenation | 768 × 4 = 3072 | Combined source-target features |
| Hidden Layer 1 | 3072 → 1024 | Non-linear transformation |
| Hidden Layer 2 | 1024 → 256 | Further compression |
| Output | 256 → 1 | Quality score prediction |

### Failure Modes

| Failure Mode | Cause | Detection | Mitigation |
|--------------|-------|-----------|------------|
| **Score Collapse** | Model predicts same score for all inputs | Histogram analysis shows narrow range | Retrain with diverse data |
| **Language Pair Bias** | Model trained mostly on EN-DE | QE-human correlation varies by pair | Per-pair calibration layer |
| **Length Sensitivity** | Shorter segments get higher scores | Correlation analysis | Length normalization |
| **Adversarial Inputs** | Empty translations score non-zero | Unit tests with edge cases | Input validation, minimum thresholds |
| **Domain Shift** | Medical content scores low | Domain-specific validation set | Domain adaptation fine-tuning |

### Calibration Strategy

```
ALGORITHM CalibrateQEScore(raw_score, language_pair, domain)
  -- Step 1: Apply language pair adjustment
  -- Learned offsets from human evaluation correlation
  lp_offset = LANGUAGE_PAIR_CALIBRATION[language_pair]  -- e.g., {"en-de": 0.02, "en-zh": -0.05}
  adjusted = raw_score + lp_offset

  -- Step 2: Apply domain adjustment
  domain_scale = DOMAIN_CALIBRATION[domain]  -- e.g., {"medical": 0.95, "legal": 0.90}
  adjusted = adjusted * domain_scale

  -- Step 3: Apply Platt scaling for probability calibration
  -- sigmoid(a * score + b) where a, b learned from validation set
  calibrated = 1 / (1 + exp(-(PLATT_A * adjusted + PLATT_B)))

  -- Step 4: Ensure score is within bounds
  RETURN CLAMP(calibrated, 0.0, 1.0)
END ALGORITHM
```

### Performance Optimization

| Technique | Latency Impact | Quality Impact | When to Use |
|-----------|---------------|----------------|-------------|
| **Batched Inference** | -60% (amortized) | None | Always |
| **ONNX Runtime** | -40% | None | Production |
| **Quantization (INT8)** | -30% | -0.5% accuracy | CPU-only deployments |
| **Distillation** | -50% | -1-2% accuracy | Edge deployments |
| **Caching** | -95% (on hit) | None | Repeated segments |

---

## Critical Component #2: Translation Memory (TM) Fuzzy Matching

### Why This is Critical

TM is the foundation of translation consistency and cost savings. A 40% TM hit rate means 40% of translations are essentially free (just lookup). Slow or inaccurate fuzzy matching directly impacts:
1. Translation latency (TM lookup is in critical path)
2. Human editor productivity (poor fuzzy matches waste time)
3. Cost (missed TM hits mean paying for MT unnecessarily)

### How It Works Internally

```mermaid
flowchart TB
    subgraph Query["Query Processing"]
        Input["Source Text"]
        Normalize["Normalize<br/>(lowercase, punctuation)"]
        Hash["Compute<br/>Hash"]
        Embed["Compute<br/>Embedding"]
    end

    subgraph ExactMatch["Exact Match Path (Fast)"]
        HashLookup["Hash Index<br/>Lookup"]
        ExactHit{{"Exact<br/>Match?"}}
    end

    subgraph FuzzyMatch["Fuzzy Match Path"]
        ANNSearch["ANN Search<br/>(HNSW/IVF)"]
        Candidates["Top-K<br/>Candidates"]
        Rerank["Detailed<br/>Reranking"]
        ScoreFilter["Score<br/>Filtering"]
    end

    subgraph Reranking["Reranking Details"]
        Levenshtein["Levenshtein<br/>Distance"]
        WordOverlap["Word<br/>Overlap"]
        NumberMatch["Number/Placeholder<br/>Match"]
        WeightedScore["Weighted<br/>Combination"]
    end

    subgraph Output["Output"]
        ExactResult["100% Match"]
        FuzzyResults["Fuzzy Matches<br/>(ranked)"]
        NoMatch["No Match"]
    end

    Input --> Normalize --> Hash
    Normalize --> Embed

    Hash --> HashLookup --> ExactHit
    ExactHit -->|Yes| ExactResult
    ExactHit -->|No| ANNSearch

    Embed --> ANNSearch --> Candidates --> Rerank

    Rerank --> Levenshtein
    Rerank --> WordOverlap
    Rerank --> NumberMatch
    Levenshtein --> WeightedScore
    WordOverlap --> WeightedScore
    NumberMatch --> WeightedScore

    WeightedScore --> ScoreFilter
    ScoreFilter -->|">= 70%"| FuzzyResults
    ScoreFilter -->|"< 70%"| NoMatch

    classDef query fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef exact fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef fuzzy fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef rerank fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef output fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Input,Normalize,Hash,Embed query
    class HashLookup,ExactHit exact
    class ANNSearch,Candidates,Rerank,ScoreFilter fuzzy
    class Levenshtein,WordOverlap,NumberMatch,WeightedScore rerank
    class ExactResult,FuzzyResults,NoMatch output
```

### Index Structure

| Index Type | Purpose | Size (500M segments) | Query Time |
|------------|---------|---------------------|------------|
| **Hash Index** | Exact match | ~20GB (hash → id) | O(1), <1ms |
| **Vector Index (HNSW)** | Fuzzy candidate retrieval | ~400GB (768-dim vectors) | O(log n), 5-20ms |
| **Metadata Index** | Filtering by TM store, language | ~10GB | O(1) + filter |
| **Full-Text Index** | Keyword fallback search | ~50GB | O(log n), 10-50ms |

### ANN Search Configuration (HNSW)

| Parameter | Value | Trade-off |
|-----------|-------|-----------|
| `M` (connections per node) | 16 | Higher = better recall, more memory |
| `ef_construction` | 200 | Higher = better index quality, slower build |
| `ef_search` | 100 | Higher = better recall, slower query |
| `distance_metric` | Cosine | Semantic similarity |

### Failure Modes

| Failure Mode | Cause | Impact | Mitigation |
|--------------|-------|--------|------------|
| **Index Staleness** | New segments not indexed | Missed TM hits | Real-time index updates |
| **Embedding Drift** | Encoder model updated | Old segments misaligned | Re-embed on model change |
| **Hot Partition** | One TM store dominates queries | Latency spikes | Per-store sharding |
| **False Positives** | High vector similarity, low text similarity | Poor fuzzy suggestions | Two-stage reranking |
| **OOM on Large TM** | Index exceeds memory | Service crash | Disk-based index (DiskANN) |

### Optimization Techniques

```
ALGORITHM OptimizedTMLookup(query, tm_store_id, min_score)
  -- Stage 1: Check exact match cache (Redis)
  cache_key = HASH(query.normalized_text + tm_store_id)
  cached = ExactMatchCache.get(cache_key)
  IF cached IS NOT NULL THEN
    RETURN cached  -- Sub-millisecond
  END IF

  -- Stage 2: Hash lookup for exact match
  hash_matches = HashIndex.get(query.source_hash, tm_store_id)
  IF hash_matches.length > 0 THEN
    result = FormatExactMatch(hash_matches[0])
    ExactMatchCache.set(cache_key, result, TTL=1_HOUR)
    RETURN result
  END IF

  -- Stage 3: ANN search with pre-filtering
  candidates = VectorIndex.search(
    query.embedding,
    filter: {tm_store_id: tm_store_id, language_pair: query.language_pair},
    top_k: 50,  -- Over-fetch for reranking
    ef_search: 100
  )

  -- Stage 4: Batch rerank top candidates
  reranked = []
  FOR candidate IN candidates:
    detailed_score = ComputeDetailedScore(query.text, candidate.text)
    IF detailed_score >= min_score THEN
      reranked.append({candidate, detailed_score})
    END IF
  END FOR

  -- Stage 5: Sort and return top matches
  SORT reranked BY score DESC
  RETURN reranked[0:5]
END ALGORITHM
```

---

## Critical Component #3: Engine Routing & Orchestration

### Why This is Critical

The engine router determines cost, quality, and latency for every translation. Poor routing decisions can:
1. Waste money on expensive LLM calls for simple content
2. Produce poor translations by using NMT for nuanced content
3. Create latency issues by overloading a single engine

### How It Works Internally

```mermaid
flowchart TB
    subgraph Input["Input Analysis"]
        Segment["Source Segment"]
        ContentClassifier["Content Type<br/>Classifier"]
        ComplexityEstimator["Complexity<br/>Estimator"]
        TermChecker["Terminology<br/>Checker"]
    end

    subgraph FeatureVector["Feature Vector"]
        ContentType["Content Type"]
        Complexity["Complexity Score"]
        HasTerms["Has Glossary Terms"]
        Length["Segment Length"]
        LangPair["Language Pair"]
    end

    subgraph Router["Routing Logic"]
        RuleEngine["Rule-Based<br/>Engine"]
        MLRouter["ML-Based<br/>Router"]
        ABSelector["A/B Test<br/>Selector"]
        CostOptimizer["Cost<br/>Optimizer"]
    end

    subgraph EngineSelection["Engine Selection"]
        NMTGeneral["NMT<br/>General"]
        NMTDomain["NMT<br/>Domain-Specific"]
        LLMStandard["LLM<br/>Standard"]
        LLMPremium["LLM<br/>Premium"]
    end

    subgraph Execution["Execution"]
        PrimaryEngine["Primary<br/>Engine"]
        FallbackLogic{{"Primary<br/>Failed?"}}
        FallbackEngine["Fallback<br/>Engine"]
        Result["Translation<br/>Result"]
    end

    Segment --> ContentClassifier --> ContentType
    Segment --> ComplexityEstimator --> Complexity
    Segment --> TermChecker --> HasTerms
    Segment --> Length
    Segment --> LangPair

    ContentType --> RuleEngine
    Complexity --> RuleEngine
    HasTerms --> RuleEngine
    Length --> RuleEngine
    LangPair --> RuleEngine

    RuleEngine --> MLRouter --> ABSelector --> CostOptimizer

    CostOptimizer --> NMTGeneral
    CostOptimizer --> NMTDomain
    CostOptimizer --> LLMStandard
    CostOptimizer --> LLMPremium

    NMTGeneral --> PrimaryEngine
    NMTDomain --> PrimaryEngine
    LLMStandard --> PrimaryEngine
    LLMPremium --> PrimaryEngine

    PrimaryEngine --> FallbackLogic
    FallbackLogic -->|Yes| FallbackEngine --> Result
    FallbackLogic -->|No| Result

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef features fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef router fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef engine fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef execution fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Segment,ContentClassifier,ComplexityEstimator,TermChecker input
    class ContentType,Complexity,HasTerms,Length,LangPair features
    class RuleEngine,MLRouter,ABSelector,CostOptimizer router
    class NMTGeneral,NMTDomain,LLMStandard,LLMPremium engine
    class PrimaryEngine,FallbackLogic,FallbackEngine,Result execution
```

### Routing Rules Matrix

| Content Type | Complexity | Has Terms | Recommended Engine | Fallback |
|--------------|------------|-----------|-------------------|----------|
| UI Strings | Low | No | NMT General | NMT Domain |
| UI Strings | Low | Yes | NMT + Term Injection | LLM Standard |
| Technical Docs | Medium | Yes | NMT Domain | LLM Standard |
| Marketing | High | No | LLM Standard | LLM Premium |
| Legal/Medical | High | Yes | NMT Specialized + Human | LLM Premium + Human |
| Creative | High | No | LLM Premium | LLM Standard |

### Cost Optimization Logic

```
ALGORITHM OptimizeEngineCost(segment, quality_requirement, budget_remaining)
  -- Step 1: Get candidate engines
  candidates = GetEligibleEngines(segment.language_pair, segment.content_type)

  -- Step 2: Estimate quality and cost for each
  scored_candidates = []
  FOR engine IN candidates:
    estimated_quality = PredictQuality(engine, segment)
    cost_per_word = GetCostPerWord(engine, segment.language_pair)

    IF estimated_quality >= quality_requirement THEN
      score = estimated_quality / cost_per_word  -- Quality per dollar
      scored_candidates.append({engine, estimated_quality, cost_per_word, score})
    END IF
  END FOR

  -- Step 3: Apply budget constraint
  SORT scored_candidates BY score DESC
  FOR candidate IN scored_candidates:
    segment_cost = candidate.cost_per_word * segment.word_count
    IF segment_cost <= budget_remaining THEN
      RETURN candidate.engine
    END IF
  END FOR

  -- Step 4: Fallback to cheapest eligible engine
  cheapest = MIN(candidates, BY cost_per_word)
  RETURN cheapest
END ALGORITHM
```

### Failure Modes

| Failure Mode | Cause | Detection | Mitigation |
|--------------|-------|-----------|------------|
| **Engine Timeout** | LLM API slow | Request timeout >5s | Circuit breaker, fallback to NMT |
| **Rate Limited** | Exceeded LLM quota | 429 response | Backoff, switch engine |
| **Quality Degradation** | Engine model changed | QE score distribution shift | A/B monitoring, rollback |
| **Cost Overrun** | Too many LLM calls | Budget monitoring | Dynamic routing adjustment |
| **Routing Bias** | ML router overfit | Offline evaluation | Regular retraining, rule fallback |

---

## Bottleneck Analysis

### Top 3 Bottlenecks

#### 1. LLM API Latency (P0 - Critical)

| Aspect | Details |
|--------|---------|
| **Symptom** | Translation p99 latency exceeds 3s |
| **Root Cause** | LLM API calls are 500ms-2s, plus network |
| **Impact** | User experience, timeout errors |
| **Mitigation** | <ul><li>Batch segments into single LLM call</li><li>LLM response caching (same prompt = same response)</li><li>Speculative NMT execution while LLM pending</li><li>Stream partial responses</li></ul> |
| **Monitoring** | LLM latency percentiles, timeout rate |

```mermaid
flowchart LR
    subgraph Before["Before Optimization"]
        S1["Segment 1"] --> L1["LLM Call 1<br/>800ms"]
        S2["Segment 2"] --> L2["LLM Call 2<br/>900ms"]
        S3["Segment 3"] --> L3["LLM Call 3<br/>850ms"]
        L1 --> T1["Total: 2550ms"]
        L2 --> T1
        L3 --> T1
    end

    subgraph After["After Batching"]
        S1a["Segments 1-3"] --> L1a["Single LLM Call<br/>1200ms"]
        L1a --> T1a["Total: 1200ms"]
    end

    classDef before fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    classDef after fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px

    class S1,S2,S3,L1,L2,L3,T1 before
    class S1a,L1a,T1a after
```

#### 2. TM Index Memory Pressure (P1 - High)

| Aspect | Details |
|--------|---------|
| **Symptom** | TM query latency spikes during high load |
| **Root Cause** | Vector index (500M × 768 dim) exceeds memory |
| **Impact** | Fuzzy match degradation, missed TM hits |
| **Mitigation** | <ul><li>Tiered storage: hot TM in memory, cold on disk</li><li>Quantized vectors (768 → 256 dim with PQ)</li><li>Per-customer TM sharding</li><li>LRU eviction of unused segments</li></ul> |
| **Monitoring** | TM memory usage, disk I/O, cache hit rate |

```
Memory Calculation:
- 500M segments × 768 dimensions × 4 bytes = 1.5TB raw vectors
- With HNSW index overhead: ~2TB
- Available memory per node: 256GB
- Required nodes: 8+ (for redundancy)

After Quantization (PQ with 256 subvectors):
- 500M segments × 256 bytes = 128GB
- Required nodes: 1-2
```

#### 3. Human Editor Queue Backlog (P1 - High)

| Aspect | Details |
|--------|---------|
| **Symptom** | MTPE turnaround >24 hours |
| **Root Cause** | QE threshold too aggressive, editor shortage for language |
| **Impact** | SLA violations, customer complaints |
| **Mitigation** | <ul><li>Dynamic QE threshold per language pair</li><li>Predictive editor scheduling</li><li>Overflow to external translator pool</li><li>Auto-escalation rules</li></ul> |
| **Monitoring** | Queue depth, wait time, editor utilization |

```mermaid
flowchart TB
    subgraph Queue["MTPE Queue Management"]
        Incoming["Incoming<br/>Segments"]
        QEThreshold["Dynamic QE<br/>Threshold"]
        Priority["Priority<br/>Scoring"]
        Assignment["Editor<br/>Assignment"]
    end

    subgraph Editors["Editor Pool"]
        Internal["Internal<br/>Editors"]
        External["External<br/>Pool"]
        Overflow["Overflow<br/>Queue"]
    end

    subgraph Monitoring["Queue Health"]
        Depth["Queue<br/>Depth"]
        WaitTime["Wait<br/>Time"]
        Utilization["Editor<br/>Utilization"]
    end

    Incoming --> QEThreshold
    QEThreshold -->|"adjust threshold"| Monitoring
    QEThreshold --> Priority --> Assignment

    Assignment --> Internal
    Assignment -->|"internal full"| External
    Assignment -->|"external full"| Overflow

    Depth --> QEThreshold
    WaitTime --> QEThreshold
    Utilization --> QEThreshold

    classDef queue fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef editors fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef monitoring fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class Incoming,QEThreshold,Priority,Assignment queue
    class Internal,External,Overflow editors
    class Depth,WaitTime,Utilization monitoring
```

---

## Concurrency & Race Conditions

### Race Condition #1: Concurrent TM Updates

**Scenario:** Two jobs translate the same source segment simultaneously, both want to add to TM.

```mermaid
sequenceDiagram
    participant J1 as Job 1
    participant J2 as Job 2
    participant TM as TM Service
    participant DB as Database

    J1->>TM: Translate "Hello"
    J2->>TM: Translate "Hello"
    J1->>TM: Add TM: "Hello" → "Hola"
    J2->>TM: Add TM: "Hello" → "Hola"
    TM->>DB: UPSERT (source_hash, target)
    TM->>DB: UPSERT (source_hash, target)
    Note over DB: Potential duplicate or overwrite
```

**Solution:** Use database-level UPSERT with conflict resolution:

```sql
INSERT INTO tm_segments (tm_store_id, source_hash, source_text, target_text, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (tm_store_id, source_hash, target_language)
DO UPDATE SET
  usage_count = tm_segments.usage_count + 1,
  last_used_at = NOW()
WHERE tm_segments.quality_score <= EXCLUDED.quality_score;
```

### Race Condition #2: Editor Assignment Collision

**Scenario:** Multiple workers try to assign the same segment to different editors.

**Solution:** Optimistic locking with version check:

```
FUNCTION AssignSegment(segment_id, editor_id)
  -- Atomic claim with version check
  result = UPDATE segments
           SET assigned_to = editor_id,
               assigned_at = NOW(),
               version = version + 1
           WHERE id = segment_id
             AND assigned_to IS NULL
             AND version = expected_version
           RETURNING id

  IF result.rows_affected == 0 THEN
    -- Already assigned or version mismatch
    RETURN {success: false, reason: "already_assigned"}
  END IF

  RETURN {success: true}
END FUNCTION
```

### Race Condition #3: QE Score vs. Human Edit

**Scenario:** QE scores a translation while human is actively editing it.

**Solution:** State machine with transitions:

```
VALID_TRANSITIONS = {
  "pending" → ["translated"],
  "translated" → ["scored"],
  "scored" → ["auto_approved", "assigned"],
  "assigned" → ["in_progress"],
  "in_progress" → ["edited"],
  "edited" → ["approved", "rejected"],
  "rejected" → ["in_progress"],
  "approved" → []  -- Terminal state
}

FUNCTION UpdateSegmentStatus(segment_id, new_status)
  current = GetCurrentStatus(segment_id)
  IF new_status NOT IN VALID_TRANSITIONS[current] THEN
    RETURN {error: "invalid_transition", from: current, to: new_status}
  END IF
  -- Proceed with update
END FUNCTION
```

---

## Performance Optimization Summary

| Component | Bottleneck | Optimization | Expected Improvement |
|-----------|------------|--------------|---------------------|
| QE Inference | GPU saturation | Batching + ONNX | 3x throughput |
| TM Lookup | Memory pressure | Vector quantization | 10x memory reduction |
| LLM Calls | API latency | Batching + caching | 50% latency reduction |
| Human Queue | Editor availability | Dynamic thresholds | 30% queue reduction |
| File Parsing | Large files | Streaming parser | Handle 100MB+ files |
| Webhook Delivery | Retries on failure | Exponential backoff | 99.9% delivery rate |
