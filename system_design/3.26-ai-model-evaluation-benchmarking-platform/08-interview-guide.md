# Interview Guide

## System Overview for Interviews

An AI Model Evaluation & Benchmarking Platform systematically assesses LLM quality through automated metrics, LLM-as-Judge, human annotation, and standardized benchmarks. Unlike observability platforms (runtime monitoring), this system focuses on measuring quality before and during production.

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Understand scope | Ask about scale, use cases, consistency needs |
| 5-15 min | **High-Level** | Core architecture | Evaluation tiers, storage choices, data flows |
| 15-30 min | **Deep Dive** | 1-2 critical components | LLM-as-Judge cost, human annotation, benchmarks |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures | LLM rate limits, tiered evaluation, A/B testing stats |
| 40-45 min | **Wrap Up** | Summary, follow-ups | Key decisions, future considerations |

---

## What Makes This System Unique

### 1. Subjective Quality Assessment

Unlike traditional testing (pass/fail), LLM evaluation involves nuanced judgment:
- "Is this response helpful?" is subjective
- Different evaluators may disagree
- Context matters (use case, user, domain)

**Interview Talking Point:**
> "Unlike unit tests where there's a clear correct answer, LLM evaluation often deals with 'good enough' vs 'better.' We handle this through multiple evaluation methods and statistical aggregation."

### 2. Ground Truth Scarcity

Many evaluation tasks lack definitive "correct" answers:
- Creative writing has no single best output
- Helpfulness is user-dependent
- Safety boundaries are fuzzy

**Interview Talking Point:**
> "We address ground truth scarcity with human-in-the-loop annotation, consensus building through multiple annotators, and proxy metrics that correlate with quality."

### 3. Expensive Evaluation

LLM-as-Judge costs money at scale:
- GPT-4o: $0.003/evaluation
- 10M evaluations/day = $30K/day

**Interview Talking Point:**
> "Cost is a first-class concern. We use tiered evaluation: programmatic metrics (free) filter 90% of cases, fast LLMs (cheap) sample 10%, and full G-Eval (expensive) handles only edge cases. This reduces costs by 95%."

### 4. Human-in-the-Loop Complexity

Annotation workflows have unique challenges:
- Annotator fatigue degrades quality
- Inter-annotator disagreement is expected
- Consensus resolution is non-trivial

**Interview Talking Point:**
> "Human annotation isn't just 'get labels.' We manage annotator sessions to prevent fatigue, track inter-annotator agreement with Krippendorff's Alpha, and have adjudication workflows for disagreements."

---

## Key Trade-offs Discussion

### Trade-off 1: LLM-as-Judge vs Human Evaluation

| Aspect | LLM-as-Judge | Human Evaluation |
|--------|--------------|------------------|
| **Cost** | $0.001-0.003/eval | $0.10-0.50/eval |
| **Speed** | 1-3 seconds | Minutes to hours |
| **Consistency** | High (deterministic with temp=0) | Varies by annotator |
| **Nuance** | Good for defined criteria | Better for subjective/edge cases |
| **Scalability** | Unlimited | Limited by workforce |

**Recommendation:** Use tiered approach
- LLM-as-Judge for 99% of evaluations
- Human for calibration, edge cases, ground truth

### Trade-off 2: Sync vs Async Evaluation

| Aspect | Sync | Async |
|--------|------|-------|
| **Latency** | < 1s required | Seconds to minutes OK |
| **Use Case** | CI/CD gates, interactive | Batch analysis, benchmarks |
| **Cost** | Higher (fast models, no batching) | Lower (batching, cheaper models) |
| **Complexity** | Simpler | Queue management |

**Recommendation:** Support both
- Sync for CI/CD integration with strict timeouts
- Async for comprehensive evaluation with cost optimization

### Trade-off 3: Full vs Sample Evaluation

| Aspect | Full Coverage | Sampling |
|--------|---------------|----------|
| **Accuracy** | Complete | Statistical estimate |
| **Cost** | High | Low |
| **Speed** | Slow | Fast |
| **Use Case** | Final validation | Continuous monitoring |

**Recommendation:** Depends on context
- Regression testing: Full coverage on critical paths
- Production monitoring: 1-10% sampling
- Benchmarks: Full coverage

### Trade-off 4: Frequentist vs Bayesian A/B Testing

| Aspect | Frequentist | Bayesian |
|--------|-------------|----------|
| **Output** | p-value (reject/fail to reject) | Probability of improvement |
| **Interpretation** | "Is there an effect?" | "How likely is B better?" |
| **Sample Size** | Fixed (power analysis) | Flexible |
| **Early Stopping** | Complex (sequential testing) | Natural |
| **Familiarity** | More common | Less common |

**Recommendation:** Bayesian for most cases
- Provides actionable probability ("95% chance B is better")
- Allows early stopping without statistical penalties
- More intuitive for stakeholders

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use GPT-4o for all evaluations?"

**What Interviewer Wants:** Understanding of cost implications and optimization

**Best Answer:**
> "At scale, that would cost $900K/month for 10M evaluations. Instead, we use tiered evaluation:
> 1. Programmatic metrics (BLEU, BERTScore) for 100% coverage - essentially free
> 2. Fast LLM (GPT-4o-mini) for 10% sample - $500/day
> 3. Full GPT-4o for 1% + failures - $450/day
>
> This gives us 95%+ of the accuracy at 3% of the cost. We also cache identical inputs and batch where possible."

### Trap 2: "How do you ensure evaluation accuracy?"

**What Interviewer Wants:** Understanding of ground truth and calibration

**Best Answer:**
> "Accuracy requires multiple approaches:
> 1. **Calibration:** We maintain golden datasets with known-good answers and regularly validate evaluators against them
> 2. **Human-in-the-loop:** For subjective criteria, we use multiple annotators and measure agreement (Krippendorff's Alpha > 0.7 required)
> 3. **Evaluator versioning:** We version our evaluation prompts and track accuracy drift over time
> 4. **Cross-validation:** We compare LLM-as-Judge results with human labels on a sample to detect systematic bias"

### Trap 3: "How do you handle annotator disagreement?"

**What Interviewer Wants:** Understanding of annotation workflow complexity

**Best Answer:**
> "Disagreement is expected and informative. We handle it through:
> 1. **Multiple annotators per item:** Typically 3 for quality tasks
> 2. **Agreement metrics:** Track Krippendorff's Alpha in real-time; if it drops below 0.6, we pause and clarify instructions
> 3. **Calibration items:** Intersperse known-answer items to detect quality issues
> 4. **Adjudication workflow:** Items with < 2/3 majority go to expert review
> 5. **Weighted consensus:** Annotators with higher track records get more weight"

### Trap 4: "What if an LLM provider goes down?"

**What Interviewer Wants:** Fault tolerance and graceful degradation

**Best Answer:**
> "We design for provider failures:
> 1. **Multi-provider:** Support OpenAI, Anthropic, and self-hosted models
> 2. **Circuit breaker:** After 5 failures, switch to backup provider
> 3. **Graceful degradation:** If all LLM providers fail, fall back to programmatic metrics only and flag results as 'degraded'
> 4. **Cached results:** For identical inputs, return cached scores
> 5. **Async queue:** For non-urgent evaluations, queue for retry when provider recovers"

### Trap 5: "How would you handle 100x scale?"

**What Interviewer Wants:** Forward-thinking scalability

**Best Answer:**
> "At 100x scale (1B evaluations/day), key changes would be:
> 1. **Aggressive sampling:** Reduce LLM evaluations to 0.1% with statistical significance
> 2. **Model distillation:** Train smaller, faster evaluator models on GPT-4o outputs
> 3. **Edge evaluation:** Push programmatic metrics to edge nodes
> 4. **ClickHouse sharding:** Add more shards, potentially per-customer databases for large accounts
> 5. **Tiered SLAs:** Premium tier gets faster sync evaluation, standard tier goes async
> 6. **Provider diversity:** Add more providers to distribute load and reduce rate limiting"

### Trap 6: "How do you make A/B test results trustworthy?"

**What Interviewer Wants:** Statistical rigor understanding

**Best Answer:**
> "Statistical trust comes from:
> 1. **Power analysis:** Calculate minimum sample size before starting (typically 1000+ per variant for 80% power)
> 2. **Guardrail metrics:** Define safety metrics that can halt experiments early if they degrade
> 3. **Effect size:** Report Cohen's d alongside p-values - statistical significance isn't practical significance
> 4. **Sequential testing:** If we want early stopping, use proper sequential methods (e.g., always-valid confidence intervals)
> 5. **SRM checks:** Validate that sample ratio matches intended allocation (detects instrumentation bugs)"

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Jumping to LLM-as-Judge for everything | Expensive and slow | Start with programmatic, escalate as needed |
| Ignoring evaluation cost | Can become largest OpEx | Cost is a first-class design constraint |
| Single annotator per item | No agreement measurement | 3+ annotators for subjective tasks |
| Using p < 0.05 religiously | Ignores practical significance | Report effect size and confidence intervals |
| Strong consistency everywhere | Limits availability | Eventual consistency OK for analytics |
| Ignoring prompt injection | Security vulnerability | Sanitize inputs to LLM-as-Judge |
| Not versioning evaluators | Can't track accuracy changes | Version everything, compare over time |

---

## Questions to Ask the Interviewer

These help scope the problem and show thoughtfulness:

### Scale Questions
- "What's the expected evaluation volume? Per day? Peak?"
- "How many organizations or teams would use this?"
- "What's the mix of sync (CI/CD) vs batch (comprehensive) evaluation?"

### Use Case Questions
- "Are we evaluating RAG systems, agents, or general LLM outputs?"
- "Is this for pre-production testing or production monitoring?"
- "Do users have their own ground truth or do we help generate it?"

### Consistency Questions
- "How critical is evaluation consistency? Can we accept some variance?"
- "For A/B tests, what significance levels are expected?"
- "How quickly do users need evaluation results?"

### Cost Questions
- "Is there a cost budget for LLM API usage?"
- "Should we support customer-provided API keys?"
- "Are we optimizing for cost or accuracy?"

### Compliance Questions
- "Are there data residency requirements?"
- "Will evaluation data contain PII?"
- "Is SOC 2 or HIPAA compliance required?"

---

## System Walkthrough (5-Minute Version)

For quick overviews or when time is limited:

> "An AI Model Evaluation Platform helps teams measure and improve LLM quality. Here's how it works:
>
> **Evaluation Engine:** We support three types of evaluators:
> - *Programmatic* (BLEU, ROUGE, BERTScore) - fast and free
> - *LLM-as-Judge* (G-Eval) - accurate but costs money
> - *Human annotation* - best for subjective tasks
>
> We use tiered evaluation to manage costs: programmatic for everything, LLM for samples, human for edge cases.
>
> **Storage:** Results go to ClickHouse (fast aggregation), datasets to object storage (cheap, durable), metadata to PostgreSQL (ACID guarantees).
>
> **Key Features:**
> - *Benchmark orchestration* - Run MMLU, HumanEval in parallel
> - *A/B testing* - Compare models with statistical rigor
> - *Human annotation* - Workflows with agreement tracking
>
> **Main Challenges:**
> 1. *Cost* - LLM-as-Judge is expensive at scale (we tier it)
> 2. *Ground truth* - Many tasks lack definitive answers (we use consensus)
> 3. *Scale* - Millions of evaluations per day (we shard and sample)
>
> That's the high-level picture. Happy to dive deeper on any component."

---

## Deep Dive Topics (Choose 1-2)

### Option A: LLM-as-Judge Cost Optimization

Focus on:
- G-Eval methodology (CoT, rubrics)
- Tiered evaluation strategy
- Caching and batching
- Cost calculation and monitoring

### Option B: Human Annotation System

Focus on:
- Multi-annotator workflows
- Inter-annotator agreement (Krippendorff's Alpha)
- Consensus resolution
- Quality monitoring

### Option C: Benchmark Orchestration

Focus on:
- DAG scheduling
- Parallelization with rate limits
- Partial failure handling
- Result aggregation

### Option D: A/B Testing Framework

Focus on:
- Frequentist vs Bayesian methods
- Sample size calculation
- Guardrail metrics
- Early stopping

---

## Complexity Ratings

| Dimension | Rating | Explanation |
|-----------|--------|-------------|
| **Overall** | High | Multiple evaluation methods, statistical rigor, cost optimization |
| **Algorithm** | Medium-High | Statistical tests, G-Eval, agreement metrics |
| **Scale** | High | Millions of evaluations, hundreds of TB storage |
| **Operational** | High | Multi-provider, human workforce, cost monitoring |
| **Interview Frequency** | Medium | Growing with AI adoption |

---

## Key Takeaways for Interviewers

1. **Cost is the #1 concern** - LLM-as-Judge is powerful but expensive. Demonstrate awareness of tiered evaluation and cost optimization.

2. **Accuracy requires calibration** - No single source of truth. Show understanding of multi-method validation.

3. **Human-in-the-loop is complex** - Not just "get labels." Discuss agreement metrics, fatigue, quality assurance.

4. **Statistical rigor matters** - A/B testing requires proper methodology. Know the difference between significance and effect size.

5. **Multi-provider strategy** - Don't depend on single LLM provider. Discuss fallback and graceful degradation.

6. **Evaluation vs Observability** - Know the difference. Evaluation = quality measurement. Observability = runtime monitoring.
