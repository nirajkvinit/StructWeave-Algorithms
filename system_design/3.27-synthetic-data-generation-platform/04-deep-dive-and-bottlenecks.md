# Deep Dive and Bottlenecks

## Critical Component 1: Privacy-Utility Trade-off

### The Core Challenge

The fundamental challenge in synthetic data generation is the **privacy-utility trade-off**: stronger privacy guarantees mathematically require reducing the fidelity of generated data. This is not a limitation of implementation—it's a theorem-level constraint.

```mermaid
flowchart LR
    subgraph Spectrum["Privacy-Utility Spectrum"]
        direction LR
        LOW["Low Privacy<br/>ε > 10"]
        MED["Medium Privacy<br/>ε = 1-10"]
        HIGH["High Privacy<br/>ε < 1"]
    end

    subgraph LowP["Low Privacy"]
        L1["High Fidelity"]
        L2["High Utility"]
        L3["Re-identification Risk"]
    end

    subgraph MedP["Medium Privacy"]
        M1["Good Fidelity"]
        M2["Good Utility"]
        M3["Reasonable Protection"]
    end

    subgraph HighP["High Privacy"]
        H1["Reduced Fidelity"]
        H2["Reduced Utility"]
        H3["Strong Guarantees"]
    end

    LOW --> LowP
    MED --> MedP
    HIGH --> HighP

    classDef low fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    classDef med fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef high fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px

    class LOW,L1,L2,L3 low
    class MED,M1,M2,M3 med
    class HIGH,H1,H2,H3 high
```

### Understanding Epsilon (ε)

Epsilon (ε) is the privacy budget parameter in Differential Privacy. Mathematically:

> For any two datasets D and D' differing in one record, and any output S:
> P(Algorithm(D) = S) ≤ e^ε × P(Algorithm(D') = S)

**Practical Interpretation:**

| Epsilon (ε) | Interpretation | Use Case |
|-------------|----------------|----------|
| ε ≤ 0.1 | Very strong privacy; attacker learns almost nothing | Highly sensitive medical/financial data |
| ε = 1 | Strong privacy; gold standard | General PII protection |
| ε = 1-10 | Moderate privacy; reasonable protection | Internal analytics, testing |
| ε > 10 | Weak privacy; similar to no DP | Low-sensitivity data augmentation |

### How DP-SGD Affects Quality

```mermaid
flowchart TB
    subgraph Training["Standard Training"]
        G1["Compute Gradient"]
        G2["Update Weights"]
        G1 --> G2
    end

    subgraph DPTraining["DP-SGD Training"]
        D1["Compute Per-Sample<br/>Gradients"]
        D2["Clip Gradients<br/>(||g|| ≤ C)"]
        D3["Add Gaussian Noise<br/>(σ × C)"]
        D4["Aggregate + Update"]
        D1 --> D2 --> D3 --> D4
    end

    subgraph Impact["Quality Impact"]
        I1["Clipping:<br/>Truncates learning signal"]
        I2["Noise:<br/>Obscures gradient direction"]
        I3["Result:<br/>Slower convergence,<br/>lower final quality"]
    end

    DPTraining --> Impact

    classDef standard fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef dp fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef impact fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class G1,G2 standard
    class D1,D2,D3,D4 dp
    class I1,I2,I3 impact
```

### Optimization Strategies

#### Strategy 1: Noise Multiplier Tuning

The noise multiplier (σ) directly controls the privacy-utility trade-off:

```
ALGORITHM TuneNoiseMultiplier(target_epsilon, target_delta, dataset_size, epochs, batch_size)
    // Binary search for optimal noise multiplier
    sigma_low = 0.1
    sigma_high = 100.0

    WHILE sigma_high - sigma_low > 0.01 DO
        sigma_mid = (sigma_low + sigma_high) / 2
        epsilon = compute_epsilon(
            sigma: sigma_mid,
            sample_rate: batch_size / dataset_size,
            steps: epochs * (dataset_size / batch_size),
            delta: target_delta
        )

        IF epsilon > target_epsilon THEN
            sigma_low = sigma_mid  // Need more noise
        ELSE
            sigma_high = sigma_mid  // Can use less noise
        END IF
    END WHILE

    RETURN sigma_high  // Err on side of more privacy
END ALGORITHM
```

#### Strategy 2: Adaptive Clipping

Instead of fixed gradient clipping norm, adapt based on gradient distribution:

```
ALGORITHM AdaptiveClipping(gradients, target_quantile=0.5)
    // Clip at median gradient norm (or other quantile)
    norms = [L2_norm(g) FOR g IN gradients]
    adaptive_clip = percentile(norms, target_quantile * 100)

    clipped = []
    FOR g IN gradients DO
        clip_factor = min(1.0, adaptive_clip / L2_norm(g))
        clipped.append(g * clip_factor)
    END FOR

    RETURN clipped, adaptive_clip
END ALGORITHM
```

#### Strategy 3: Privacy Budget Allocation

For multiple generation requests, allocate budget wisely:

| Allocation Strategy | Description | Best For |
|---------------------|-------------|----------|
| **Equal Split** | Divide ε equally across N generations | Unknown future needs |
| **Decaying** | More budget early, less later | Exploratory then production |
| **Task-Based** | Allocate based on task importance | Known generation plan |
| **Adaptive** | Reserve pool, allocate on-demand | Dynamic workloads |

### Trade-off Quantification

Based on research benchmarks (2025 studies):

| ε | TSTR Score (% of non-DP) | MIA Success Rate | Recommendation |
|---|--------------------------|------------------|----------------|
| ∞ (no DP) | 100% | 15-25% | Only for non-sensitive data |
| 10 | 95-98% | 8-12% | Internal analytics |
| 3 | 90-95% | 5-8% | Balanced default |
| 1 | 80-90% | 3-5% | Recommended for PII |
| 0.1 | 60-75% | <2% | Highly sensitive only |

---

## Critical Component 2: Generative Model Selection and Training

### The Challenge

Different generative models have fundamentally different trade-offs. Choosing wrong can mean:
- Training for days when hours would suffice
- Poor fidelity despite long training
- Mode collapse (GAN-specific)
- Privacy integration difficulties

### Model Architecture Deep Dive

#### CTGAN: Conditional Tabular GAN

```mermaid
flowchart TB
    subgraph Generator["Generator"]
        NOISE["Random Noise<br/>(z ~ N(0,1))"]
        COND["Condition Vector<br/>(one-hot category)"]
        CONCAT1["Concatenate"]
        FC1["FC Layers<br/>(256, 256)"]
        OUT["Generated Row"]

        NOISE --> CONCAT1
        COND --> CONCAT1
        CONCAT1 --> FC1 --> OUT
    end

    subgraph Discriminator["Discriminator (Critic)"]
        INPUT["Real or Fake Row"]
        COND2["Condition Vector"]
        CONCAT2["Concatenate"]
        FC2["FC Layers<br/>(256, 256)"]
        SCORE["Validity Score"]

        INPUT --> CONCAT2
        COND2 --> CONCAT2
        CONCAT2 --> FC2 --> SCORE
    end

    subgraph Training["Training Loop"]
        REAL["Real Data"]
        SAMPLE["Conditional Sampler"]
        WGAN["Wasserstein Loss<br/>+ Gradient Penalty"]
    end

    REAL --> SAMPLE --> Generator
    Generator --> Discriminator
    REAL --> Discriminator
    Discriminator --> WGAN

    classDef gen fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef disc fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef train fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class NOISE,COND,CONCAT1,FC1,OUT gen
    class INPUT,COND2,CONCAT2,FC2,SCORE disc
    class REAL,SAMPLE,WGAN train
```

**Key CTGAN Innovations:**

1. **Mode-Specific Normalization**: Handles multi-modal continuous distributions via GMM encoding
2. **Conditional Generator**: Samples conditions to handle imbalanced categories
3. **Training-by-Sampling**: Ensures all categories get trained, not just frequent ones
4. **PAC-GAN**: Groups samples to reduce discriminator overfitting

**CTGAN Failure Modes:**

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Mode collapse | Same values repeated | Increase discriminator steps, reduce LR |
| Vanishing gradients | Loss plateaus early | Use Wasserstein loss, gradient penalty |
| Category imbalance | Rare categories never generated | Training-by-sampling, oversample |
| High cardinality | Poor embedding quality | Use larger embedding dim, more epochs |

#### TVAE: Tabular Variational Autoencoder

```mermaid
flowchart LR
    subgraph Encoder["Encoder"]
        INPUT["Input Row"]
        ENC_FC["FC Layers"]
        MU["μ (mean)"]
        SIGMA["σ (std)"]

        INPUT --> ENC_FC
        ENC_FC --> MU
        ENC_FC --> SIGMA
    end

    subgraph Latent["Latent Space"]
        SAMPLE["z = μ + σ × ε<br/>(ε ~ N(0,1))"]
        MU --> SAMPLE
        SIGMA --> SAMPLE
    end

    subgraph Decoder["Decoder"]
        DEC_FC["FC Layers"]
        OUTPUT["Reconstructed Row"]

        SAMPLE --> DEC_FC --> OUTPUT
    end

    subgraph Loss["Loss Function"]
        RECON["Reconstruction<br/>Loss"]
        KL["KL Divergence<br/>(regularization)"]
        TOTAL["Total Loss"]

        OUTPUT --> RECON
        MU --> KL
        SIGMA --> KL
        RECON --> TOTAL
        KL --> TOTAL
    end

    classDef enc fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef lat fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dec fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef loss fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class INPUT,ENC_FC,MU,SIGMA enc
    class SAMPLE lat
    class DEC_FC,OUTPUT dec
    class RECON,KL,TOTAL loss
```

**TVAE Advantages:**
- More stable training (no adversarial dynamics)
- Natural uncertainty quantification
- Easier DP integration (single forward pass)
- Smooth latent space for interpolation

**TVAE Limitations:**
- Often lower fidelity than GANs for complex distributions
- Blurrier outputs (posterior collapse)
- Mode averaging instead of capturing

#### Diffusion Models (TabDDPM)

```mermaid
flowchart TB
    subgraph Forward["Forward Process (Training)"]
        X0["x₀ (real data)"]
        X1["x₁"]
        XT["xₜ (noise)"]

        X0 -->|"Add noise"| X1
        X1 -->|"..."| XT
    end

    subgraph Reverse["Reverse Process (Generation)"]
        XTR["xₜ (pure noise)"]
        XTM1["xₜ₋₁"]
        X0R["x₀ (generated)"]

        XTR -->|"Denoise (predict noise)"| XTM1
        XTM1 -->|"..."| X0R
    end

    subgraph Model["Denoising Network"]
        CONCAT["[xₜ, t]"]
        UNET["U-Net / Transformer"]
        NOISE_PRED["Predicted Noise"]

        CONCAT --> UNET --> NOISE_PRED
    end

    XT --> XTR
    XTR --> Model
    Model --> Reverse

    classDef forward fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef reverse fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef model fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class X0,X1,XT forward
    class XTR,XTM1,X0R reverse
    class CONCAT,UNET,NOISE_PRED model
```

**Diffusion Model Advantages:**
- Highest fidelity (matches/exceeds real data distributions)
- Stable training (no mode collapse)
- Good diversity and coverage
- Natural handling of mixed types

**Diffusion Model Limitations:**
- Very slow generation (1000 steps typically)
- High memory requirements
- Longer training times
- Complex DP integration

### Model Selection Decision Tree

```mermaid
flowchart TD
    START["Data Profile"] --> Q1{"Primary Goal?"}

    Q1 -->|"Speed"| SPEED["Speed Priority"]
    Q1 -->|"Quality"| QUALITY["Quality Priority"]
    Q1 -->|"Privacy"| PRIVACY["Privacy Priority"]

    SPEED --> Q2{"Data Complexity?"}
    Q2 -->|"Low"| TVAE_FAST["TVAE<br/>(fastest training)"]
    Q2 -->|"High"| CTGAN_FAST["CTGAN<br/>(good balance)"]

    QUALITY --> Q3{"Training Time Budget?"}
    Q3 -->|"< 1 day"| CTGAN_QUAL["CTGAN / ACTGAN"]
    Q3 -->|"1-3 days"| TRANS["TabularARGN"]
    Q3 -->|"> 3 days OK"| DIFF["Diffusion<br/>(best quality)"]

    PRIVACY --> Q4{"DP Epsilon?"}
    Q4 -->|"ε ≤ 1"| TVAE_DP["TVAE + DP<br/>(easiest integration)"]
    Q4 -->|"ε > 1"| Q5{"Quality need?"}
    Q5 -->|"High"| DIFF_DP["Diffusion + DP"]
    Q5 -->|"Medium"| CTGAN_DP["CTGAN + DP"]

    classDef start fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef model fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class START start
    class Q1,Q2,Q3,Q4,Q5,SPEED,QUALITY,PRIVACY decision
    class TVAE_FAST,CTGAN_FAST,CTGAN_QUAL,TRANS,DIFF,TVAE_DP,DIFF_DP,CTGAN_DP model
```

### Training Stability Patterns

```
ALGORITHM StableTraining(model_type, data, config)
    // Common stability patterns across model types

    // 1. Learning rate warmup
    lr_schedule = WarmupSchedule(
        warmup_steps: config.epochs * 0.1,
        peak_lr: config.learning_rate,
        decay: "cosine"
    )

    // 2. Gradient clipping (even without DP)
    max_grad_norm = 1.0

    // 3. Early stopping with patience
    best_metric = infinity
    patience_counter = 0
    patience = 50

    FOR epoch IN 1 TO config.epochs DO
        train_one_epoch(model, data, lr_schedule)

        // Validation
        val_metric = compute_validation_metric(model, val_data)

        IF val_metric < best_metric THEN
            best_metric = val_metric
            patience_counter = 0
            save_checkpoint(model, "best")
        ELSE
            patience_counter += 1
            IF patience_counter >= patience THEN
                PRINT("Early stopping at epoch", epoch)
                BREAK
            END IF
        END IF

        // Model-specific stability checks
        IF model_type == "CTGAN" THEN
            // Check for mode collapse
            IF discriminator_accuracy > 0.95 THEN
                WARN("Potential mode collapse detected")
                reduce_discriminator_lr(factor=0.5)
            END IF
        END IF
    END FOR

    RETURN load_checkpoint("best")
END ALGORITHM
```

---

## Critical Component 3: Multi-Table Relational Data

### The Challenge

Generating multi-table data while preserving:
1. **Referential Integrity**: All FK values exist in parent tables
2. **Cardinality Distribution**: 1:N relationships have realistic N distribution
3. **Cross-Table Correlations**: Customer attributes correlate with their order patterns
4. **Temporal Consistency**: Order dates after customer registration dates

### Hierarchical Generation Architecture

```mermaid
flowchart TB
    subgraph Analysis["Schema Analysis"]
        TABLES["Tables:<br/>customers, orders, items"]
        FK["FK Detection:<br/>orders.customer_id → customers.id<br/>items.order_id → orders.id"]
        TOPO["Topological Sort:<br/>[customers, orders, items]"]
        CARD["Cardinality Learning:<br/>avg 3.2 orders/customer<br/>avg 2.1 items/order"]

        TABLES --> FK --> TOPO --> CARD
    end

    subgraph Generation["Hierarchical Generation"]
        GEN_CUST["Generate Customers<br/>(root, unconditional)"]
        GEN_ORD["Generate Orders<br/>(conditioned on customer_id)"]
        GEN_ITEM["Generate Items<br/>(conditioned on order_id)"]

        GEN_CUST --> GEN_ORD --> GEN_ITEM
    end

    subgraph Validation["Integrity Validation"]
        FK_CHECK["FK Constraint Check"]
        CARD_CHECK["Cardinality Distribution Check"]
        CORR_CHECK["Cross-Table Correlation Check"]
    end

    Analysis --> Generation --> Validation

    classDef analysis fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gen fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef val fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class TABLES,FK,TOPO,CARD analysis
    class GEN_CUST,GEN_ORD,GEN_ITEM gen
    class FK_CHECK,CARD_CHECK,CORR_CHECK val
```

### Cardinality Preservation Algorithm

```
ALGORITHM LearnAndSampleCardinality(parent_data, child_data, fk_column)
    INPUT:
        parent_data: parent table records
        child_data: child table records
        fk_column: foreign key column name
    OUTPUT:
        cardinality_sampler: function to sample # of children per parent

    // Count children per parent
    child_counts = {}
    FOR row IN child_data DO
        parent_id = row[fk_column]
        child_counts[parent_id] = child_counts.get(parent_id, 0) + 1
    END FOR

    // Fit distribution to counts
    count_values = list(child_counts.values())

    // Try multiple distributions, select best fit
    distributions = [
        Poisson(mean(count_values)),
        NegativeBinomial(fit(count_values)),
        ZeroInflatedPoisson(fit(count_values)),
        Empirical(count_values)
    ]

    best_dist = select_by_ks_test(distributions, count_values)

    FUNCTION cardinality_sampler():
        RETURN max(0, round(best_dist.sample()))
    END FUNCTION

    RETURN cardinality_sampler
END ALGORITHM

ALGORITHM GenerateChildTable(parent_data, child_model, cardinality_sampler, fk_column)
    synthetic_children = []

    FOR parent_row IN parent_data DO
        parent_id = parent_row["id"]
        n_children = cardinality_sampler()

        IF n_children > 0 THEN
            // Generate children conditioned on parent
            children = child_model.generate(
                n_samples: n_children,
                conditions: {fk_column: parent_id}
            )

            // Optionally: inherit/correlate parent attributes
            FOR child IN children DO
                child = apply_parent_correlations(child, parent_row)
            END FOR

            synthetic_children.extend(children)
        END IF
    END FOR

    RETURN DataFrame(synthetic_children)
END ALGORITHM
```

### Cross-Table Correlation Preservation

```
ALGORITHM PreserveParentChildCorrelations(parent_table, child_table, relationships)
    // Learn conditional distributions P(child_attr | parent_attr)

    correlation_models = {}

    FOR rel IN relationships DO
        parent_cols = rel.parent_columns  // e.g., [income_bracket, region]
        child_cols = rel.child_columns    // e.g., [order_amount, category]

        // Train conditional model
        joined_data = join(parent_table, child_table, on=rel.fk)
        features = joined_data[parent_cols]
        targets = joined_data[child_cols]

        // Use a simple model (decision tree, Bayesian network)
        model = ConditionalModel()
        model.fit(features, targets)

        correlation_models[rel.name] = model
    END FOR

    RETURN correlation_models
END ALGORITHM

ALGORITHM ApplyParentCorrelations(child_row, parent_row, correlation_model)
    // Adjust child attributes based on parent
    parent_features = extract_features(parent_row)
    adjustments = correlation_model.predict(parent_features)

    FOR col, adjustment IN adjustments DO
        child_row[col] = apply_adjustment(child_row[col], adjustment)
    END FOR

    RETURN child_row
END ALGORITHM
```

---

## Critical Component 4: Quality Validation Pipeline

### The Challenge

Automated quality assessment must:
1. Run efficiently (not block generation for hours)
2. Provide actionable feedback
3. Balance false positives (blocking good data) vs false negatives (releasing bad data)
4. Handle different quality requirements per use case

### Quality Gate Architecture

```mermaid
flowchart TB
    subgraph Input["Validation Input"]
        REAL["Real Data<br/>(sample)"]
        SYNTH["Synthetic Data"]
        CONFIG["Quality Config"]
    end

    subgraph FastChecks["Fast Checks (< 1 min)"]
        SCHEMA["Schema Match"]
        NULL["Null Rate Check"]
        RANGE["Value Range Check"]
        UNIQUE["Uniqueness Check"]
    end

    subgraph FidelityChecks["Fidelity Checks (1-5 min)"]
        MARGINAL["Marginal Distributions<br/>(KS, KL per column)"]
        CORR["Correlation Matrix"]
        JOINT["Joint Distributions<br/>(sample)"]
    end

    subgraph UtilityChecks["Utility Checks (5-15 min)"]
        TSTR["TSTR Evaluation<br/>(3 models)"]
        FEATURE["Feature Importance"]
    end

    subgraph PrivacyChecks["Privacy Checks (5-10 min)"]
        MIA["MIA Attack<br/>(sample)"]
        DCR["Distance to Closest"]
        EXACT["Exact Match Scan"]
    end

    subgraph Gates["Quality Gates"]
        GATE1["Gate 1: Fidelity<br/>max_ks < 0.15"]
        GATE2["Gate 2: Utility<br/>tstr_ratio > 0.8"]
        GATE3["Gate 3: Privacy<br/>mia_rate < 0.1"]
        GATE4["Gate 4: No Exact<br/>matches = 0"]
    end

    subgraph Output["Decision"]
        PASS["PASS<br/>Release data"]
        WARN["WARNING<br/>Release with caution"]
        FAIL["FAIL<br/>Block release"]
    end

    Input --> FastChecks
    FastChecks -->|"Pass"| FidelityChecks
    FastChecks -->|"Fail"| FAIL

    FidelityChecks --> UtilityChecks
    FidelityChecks --> PrivacyChecks

    UtilityChecks --> Gates
    PrivacyChecks --> Gates

    Gates --> Output

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef fast fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef fidelity fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef utility fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef privacy fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef gate fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef output fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class REAL,SYNTH,CONFIG input
    class SCHEMA,NULL,RANGE,UNIQUE fast
    class MARGINAL,CORR,JOINT fidelity
    class TSTR,FEATURE utility
    class MIA,DCR,EXACT privacy
    class GATE1,GATE2,GATE3,GATE4 gate
    class PASS,WARN,FAIL output
```

### Tiered Validation Strategy

| Tier | Checks | Time | When Used |
|------|--------|------|-----------|
| **Quick** | Schema, nulls, ranges, exact matches | < 1 min | Every generation |
| **Standard** | + Marginals, correlations, DCR | < 10 min | Default production |
| **Full** | + TSTR, MIA attack, joint distributions | < 30 min | Sensitive data, releases |
| **Deep** | + Multiple ML models, extensive privacy | < 2 hrs | Compliance audits |

### Sampling Strategies for Efficiency

```
ALGORITHM EfficientQualityCheck(real_data, synth_data, config)
    // Use sampling to reduce computation while maintaining accuracy

    // 1. Determine sample sizes
    n_real = len(real_data)
    n_synth = len(synth_data)

    IF n_real > 100000 THEN
        real_sample_size = 100000
        synth_sample_size = 100000
    ELSE
        real_sample_size = n_real
        synth_sample_size = min(n_synth, n_real * 2)
    END IF

    // 2. Stratified sampling to preserve distributions
    real_sample = stratified_sample(real_data, n=real_sample_size)
    synth_sample = stratified_sample(synth_data, n=synth_sample_size)

    // 3. Run checks with confidence intervals
    results = {}

    // KS Test with bootstrap confidence
    FOR col IN columns DO
        ks_values = []
        FOR i IN 1 TO 100 DO  // Bootstrap
            r_boot = bootstrap_sample(real_sample[col])
            s_boot = bootstrap_sample(synth_sample[col])
            ks_stat, _ = ks_test(r_boot, s_boot)
            ks_values.append(ks_stat)
        END FOR
        results[col] = {
            ks_mean: mean(ks_values),
            ks_ci_95: percentile(ks_values, [2.5, 97.5])
        }
    END FOR

    // 4. Parallel execution for independent checks
    results.fidelity = parallel_execute([
        check_marginals(real_sample, synth_sample),
        check_correlations(real_sample, synth_sample),
    ])

    results.privacy = parallel_execute([
        run_mia_attack(real_sample, synth_sample),
        compute_dcr(real_sample, synth_sample),
        scan_exact_matches(real_data, synth_data)  // Full data for this
    ])

    RETURN results
END ALGORITHM
```

---

## Bottleneck Analysis

### Top 5 Bottlenecks and Mitigations

| Rank | Bottleneck | Symptom | Root Cause | Mitigation |
|------|------------|---------|------------|------------|
| 1 | **GPU training time** | Jobs take days | Large data, complex models | Distributed training, progressive resolution, spot instances |
| 2 | **Memory during training** | OOM errors | High cardinality categoricals | Embedding instead of one-hot, gradient checkpointing |
| 3 | **Generation throughput** | Slow batch generation | Sequential sampling | Parallel sampling, GPU batch generation, model caching |
| 4 | **Quality check latency** | Slow validation | Full TSTR, MIA on large data | Sample-based validation, tiered checks |
| 5 | **Privacy accounting overhead** | Slow DP training | Per-sample gradient computation | Virtual batching, optimized Opacus |

### Mitigation Deep Dives

#### GPU Training Optimization

```
ALGORITHM OptimizedTraining(data, model, config)
    // 1. Progressive resolution training
    // Start with smaller model, gradually increase
    stages = [
        { gen_dim: [128], disc_dim: [128], epochs: 50 },
        { gen_dim: [256], disc_dim: [256], epochs: 100 },
        { gen_dim: [256, 256], disc_dim: [256, 256], epochs: 150 }
    ]

    FOR stage IN stages DO
        model = resize_model(model, stage.gen_dim, stage.disc_dim)
        train(model, data, epochs=stage.epochs)
    END FOR

    // 2. Mixed precision training
    scaler = GradScaler()
    WITH autocast():
        loss = compute_loss(model, batch)
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()

    // 3. Distributed Data Parallel
    IF num_gpus > 1 THEN
        model = DistributedDataParallel(model)
        data_sampler = DistributedSampler(data)
    END IF

    // 4. Spot instance handling
    ON preemption_signal():
        save_checkpoint(model, epoch, optimizer)
        RAISE PreemptionException()

    ON resume():
        model, epoch, optimizer = load_checkpoint()
        CONTINUE training from epoch
END ALGORITHM
```

#### Memory Optimization

```
ALGORITHM MemoryOptimizedPreprocessing(data)
    // 1. Use embeddings for high-cardinality categoricals
    FOR col IN categorical_columns DO
        IF cardinality(col) > 100 THEN
            // Embedding instead of one-hot
            embedding_dim = min(50, cardinality(col) // 2)
            encoders[col] = EmbeddingEncoder(dim=embedding_dim)
        ELSE
            encoders[col] = OneHotEncoder()
        END IF
    END FOR

    // 2. Gradient checkpointing for large models
    model = enable_gradient_checkpointing(model)

    // 3. Memory-mapped data loading
    data_loader = MemoryMappedDataLoader(
        data_path: data_uri,
        batch_size: config.batch_size,
        prefetch: 2
    )

    // 4. Clear cache periodically
    every_n_batches = 100
    IF batch_idx % every_n_batches == 0 THEN
        torch.cuda.empty_cache()
    END IF
END ALGORITHM
```

#### Generation Throughput Optimization

```
ALGORITHM FastBatchGeneration(model, n_samples, batch_size=10000)
    // 1. Pre-load and cache model
    model = model.to(device="cuda")
    model.eval()
    torch.cuda.synchronize()

    // 2. Parallel batch generation
    generated = []
    n_batches = ceil(n_samples / batch_size)

    WITH torch.no_grad():
        FOR batch_idx IN range(n_batches) DO
            // Generate noise in batch
            batch_size_actual = min(batch_size, n_samples - len(generated))
            noise = torch.randn(batch_size_actual, latent_dim, device="cuda")

            // Forward pass (GPU-accelerated)
            fake = model.generator(noise)

            // Async transfer to CPU
            generated.append(fake.cpu())
        END FOR

    // 3. Parallel inverse transform (CPU)
    WITH ThreadPoolExecutor(workers=8) AS executor:
        results = executor.map(inverse_transform, generated)

    RETURN concatenate(results)
END ALGORITHM
```

---

## Race Conditions and Concurrency

### Identified Race Conditions

| Scenario | Risk | Mitigation |
|----------|------|------------|
| **Concurrent privacy budget updates** | Overspend epsilon | Optimistic locking with version check |
| **Multiple generation jobs same model** | Model cache corruption | Read-only model loading, copy-on-write |
| **Parallel quality checks** | Resource contention | Job queue with concurrency limits |
| **Training checkpoint writes** | Corrupted checkpoints | Atomic writes, temp + rename |

### Privacy Budget Locking

```
ALGORITHM SpendPrivacyBudget(org_id, dataset_id, epsilon_requested)
    // Optimistic locking to prevent overspend

    MAX_RETRIES = 3
    FOR attempt IN 1 TO MAX_RETRIES DO
        // Read current budget with version
        budget = SELECT * FROM privacy_budgets
                 WHERE org_id = org_id AND dataset_id = dataset_id

        remaining = budget.total_epsilon - budget.spent_epsilon

        IF epsilon_requested > remaining THEN
            RAISE InsufficientBudgetError(requested=epsilon_requested, remaining=remaining)
        END IF

        // Attempt atomic update with version check
        result = UPDATE privacy_budgets
                 SET spent_epsilon = spent_epsilon + epsilon_requested,
                     version = version + 1
                 WHERE org_id = org_id
                   AND dataset_id = dataset_id
                   AND version = budget.version

        IF result.rows_affected == 1 THEN
            // Success - log audit
            INSERT INTO privacy_audit_logs (...)
            RETURN budget.spent_epsilon + epsilon_requested
        ELSE
            // Version conflict - retry
            SLEEP(random(10, 100) ms)
        END IF
    END FOR

    RAISE ConcurrencyError("Failed to acquire budget lock")
END ALGORITHM
```
