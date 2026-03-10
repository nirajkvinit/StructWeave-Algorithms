# 14.6 AI-Native Vernacular Voice Commerce Platform — Interview Guide

## 45-Minute Pacing Guide

| Time | Phase | Focus | What to Cover |
|---|---|---|---|
| 0:00–3:00 | **Problem Framing** | Clarify requirements; establish scope | Ask about target users (literate vs. non-literate), languages to support, commerce domain (groceries, general merchandise, services), channels (phone, WhatsApp, app), and scale targets (concurrent calls, daily orders). Strong candidates immediately identify the voice-first constraint as fundamentally different from text commerce with voice bolted on. |
| 3:00–8:00 | **System Overview** | High-level architecture sketch | Expect a streaming pipeline: telephony gateway → ASR → NLU → dialog manager → commerce backend → TTS → audio delivery. Strong candidates distinguish between real-time (phone calls) and async (WhatsApp) paths. Look for awareness of the language routing problem: how do you route audio to the right ASR model? |
| 8:00–18:00 | **Core Component Design** | Deep dive on ASR pipeline, product resolution, dialog management | This is the make-or-break section. Probe: How does ASR handle 22+ languages with varying data availability? How do you resolve spoken product names to catalog entries in vernacular? How does the dialog manager handle code-mixed speech? Expect discussion of language detection, per-language models, phonetic matching, and confirmation loops. |
| 18:00–25:00 | **Data Model & APIs** | Key entities, API contracts for voice interactions | Voice session model, conversation turn model, product resolution pipeline API, WebSocket streaming API for audio. Strong candidates design APIs that are voice-native (include SSML responses, voice summaries alongside text) rather than text APIs with voice bolted on. |
| 25:00–33:00 | **Scalability & Reliability** | GPU scaling, concurrent call handling, failover | Probe GPU economics: how many GPUs for 25,000 concurrent calls? How do you handle GPU failures mid-call? What happens when a language-specific ASR model crashes? Expect multi-tier failover (language-specific → multilingual → CPU → DTMF). Look for understanding that real-time voice cannot be queued. |
| 33:00–40:00 | **Deep Dive Selection** | Pick one: code-mixing, latency optimization, or outbound campaigns | Candidate or interviewer selects. For code-mixing: how does the ASR handle Hindi-English mixing within a single sentence? For latency: how do you achieve < 1.2s end-to-end? For outbound: how do you generate dynamic scripts per user/language and detect caller hostility? |
| 40:00–45:00 | **Trade-offs & Extensions** | Security, observability, future scaling | Voice data privacy, recording consent, payment security via voice, WER monitoring, and expansion to new languages/markets. Wrap up with a trade-off discussion. |

---

## Trap Questions and Answers

### Trap 1: "Can't you just use a single multilingual ASR model like Whisper for all languages?"

**Why it's a trap:** This sounds reasonable and simplifies the architecture enormously. Candidates who accept this without pushback miss the core technical challenge.

**Expected Answer:**

A single multilingual model is the right starting point but not the production solution. Key issues:

| Problem | Detail |
|---|---|
| **WER degradation** | Multilingual Whisper achieves 15–20% WER on Hindi but 30–40% on low-resource languages like Santali. Language-specific fine-tuned models achieve 10–12% WER for Hindi—the 5–8% gap means more misrecognized product names and wrong orders |
| **Latency** | Whisper large is ~1.5B parameters; inference on a single utterance takes 200–400 ms. For real-time streaming, you need smaller models (100–300M parameters) fine-tuned per language |
| **Code-mixing** | Whisper was not trained on code-mixed corpora; it tries to classify each utterance as a single language and garbles code-mixed speech |
| **Narrowband audio** | Whisper was trained on 16 kHz audio; 8 kHz PSTN audio needs models specifically adapted to narrowband characteristics |
| **Domain vocabulary** | Generic ASR has no commerce domain adaptation; product names, brand names, and quantity expressions are systematically misrecognized |

**Production solution:** Three-tier strategy: language-specific models for top languages (best accuracy), fine-tuned multilingual for medium languages, and base multilingual with adapters for low-resource. Single multilingual model serves as fallback for code-mixed and unidentified-language speech.

### Trap 2: "Why not use speech-to-text and then process everything as text? Standard NLP pipeline works fine."

**Why it's a trap:** This misses the fundamental differences between processing text that was typed and text that was produced by (imperfect) ASR.

**Expected Answer:**

ASR output is fundamentally different from typed text:

| Dimension | Typed Text | ASR Output |
|---|---|---|
| **Error characteristics** | Typos are rare and usually close to correct characters | ASR errors produce phonetically similar but semantically different words ("chawal" → "chaaval"; "packet" → "pakit") |
| **Confidence information** | Not available | Per-word confidence scores are critical for downstream processing; low-confidence words need special handling |
| **Alternatives** | Single input | N-best list of alternative transcripts; the second-best might be correct |
| **Segmentation** | Words separated by spaces | ASR may join or split words incorrectly, especially in agglutinative languages |
| **Code-mixing** | Explicitly typed by user | ASR may not correctly segment language boundaries within a sentence |
| **Filler words and disfluencies** | Absent | "umm", "uh", false starts, and self-corrections must be filtered |

The NLU pipeline must be ASR-aware: use confidence scores to decide when to ask for clarification vs. proceed, use n-best lists for entity resolution (if the best transcript doesn't match a product but the second-best does, use the second-best), and handle ASR-specific error patterns (phonetic confusion) in entity matching.

### Trap 3: "For the dialog manager, just use an LLM with the conversation history as context."

**Why it's a trap:** Pure LLM-based dialog management sounds elegant but has critical failure modes for commerce.

**Expected Answer:**

LLMs are valuable for open-ended dialog but dangerous for transactional commerce:

| Concern | Detail |
|---|---|
| **Determinism** | Order placement, payment processing, and inventory operations must be deterministic. An LLM might "hallucinate" a product that doesn't exist or confirm an order without actually placing it |
| **Latency** | LLM inference adds 500–2000 ms per turn—too slow for real-time voice conversation where total latency budget is 1.2 seconds |
| **Cost** | LLM inference per turn costs 10–100x more than a rule-based dialog engine; at 3M daily sessions × 5 turns each, this is prohibitive |
| **Safety** | LLM might make commitments the commerce system cannot fulfill ("I'll apply a 50% discount for you") or expose internal system information |
| **Slot tracking** | Commerce needs precise slot tracking (product=X, quantity=Y, address=Z); LLMs lose track of structured state across many turns |

**Production solution:** Hybrid dialog manager:
- **Rule-based state machine** for critical commerce flows (add to cart, place order, payment, cancellation) — deterministic, fast, auditable
- **LLM-assisted** for open-ended interactions (product recommendations, complaint handling, natural chit-chat) — but gated by the rule engine
- **LLM for response generation** — takes structured dialog action from the rule engine and generates natural language response in the user's language

### Trap 4: "25,000 concurrent calls? That's just a load balancing problem."

**Why it's a trap:** Traditional web request load balancing doesn't apply to real-time voice.

**Expected Answer:**

Key differences from web request load balancing:

| Web Request | Voice Call |
|---|---|
| Stateless: any server can handle any request | Stateful: a call must stay on the same media server for its duration (session affinity) |
| Duration: milliseconds | Duration: minutes (average 3.5 minutes) |
| Failure: retry transparently | Failure: call drops; user must redial |
| Resource: CPU burst for processing | Resource: continuous GPU allocation for ASR/TTS for the entire call duration |
| Scaling: add more servers, immediately effective | Scaling: must pre-warm GPU models (5–10 minutes); cold-start languages take 15 seconds |

Voice call scaling challenges:
1. **Session stickiness**: Active calls cannot be migrated between servers
2. **Graceful drain**: When scaling down, must wait for all active calls on a server to complete before removing it
3. **GPU reservation**: Each concurrent call consumes continuous GPU cycles; you cannot time-slice like CPU threads
4. **Language-aware routing**: Cannot route a Hindi call to a server that only has Tamil models loaded
5. **Burst handling**: A promotional campaign might add 5,000 concurrent calls in 5 minutes; GPU warm-up cannot keep pace

### Trap 5: "For payment, just capture the credit card number through voice."

**Why it's a trap:** This is a massive security and compliance violation.

**Expected Answer:**

**Never capture credit/debit card numbers via voice.** Reasons:

| Concern | Detail |
|---|---|
| **PCI DSS violation** | Card numbers spoken over a recorded call must be stored as PCI-scoped data; the entire voice infrastructure becomes PCI-scoped |
| **Eavesdropping risk** | Anyone within earshot hears the card number; phone calls can be intercepted |
| **ASR error risk** | If ASR misrecognizes a digit, the wrong card gets charged; no visual verification possible |
| **Storage challenge** | ASR transcript containing card numbers must be treated as cardholder data; redaction must be real-time and perfect |

**Correct approach:** UPI-based payment flow:
1. System generates a UPI collect request to the user's registered VPA
2. User approves payment on their own device (phone's UPI app)
3. Payment confirmation received by platform via payment gateway webhook
4. System announces: "Payment received. Order confirmed."

For COD: no payment information needed during voice call.

For OTP verification: use DTMF input (keypad presses) rather than spoken digits; DTMF is not audible and not captured in audio recording.

### Trap 6: "You can estimate WER from production traffic automatically."

**Why it's a trap:** WER requires a reference transcript to compute. In production, you don't have the "correct" transcript.

**Expected Answer:**

WER = (Substitutions + Insertions + Deletions) / Reference Words. You need a human-verified reference transcript to compute WER. Production ASR output is the *hypothesis*, not the reference.

**How to measure WER in production:**
1. **Sampling pipeline**: Sample 2–5% of interactions (stratified by language, confidence, channel)
2. **Human transcription**: Professional transcribers create reference transcripts for sampled audio
3. **WER computation**: Compare ASR hypothesis against human reference
4. **Latency**: WER measurements lag by 1–3 days (human transcription time)

**Proxy metrics for real-time monitoring** (correlated with WER but computable without human reference):
- **ASR confidence distribution**: shift in confidence histogram suggests WER change
- **User repeat rate**: if users repeat themselves more, ASR quality has likely degraded
- **Intent classification confidence**: downstream NLU confidence drops when ASR quality drops
- **Product resolution failure rate**: more unresolved products → likely more ASR errors on product names

---

## Scoring Rubric

### Level 1: Foundation (Junior/Mid-Level) — 60% of points

| Criterion | What to Look For | Points |
|---|---|---|
| **Identifies voice-first constraints** | Recognizes that voice commerce is fundamentally different from text commerce with voice added; identifies the non-visual, serialized nature of audio interactions | 10 |
| **Basic streaming pipeline** | Draws ASR → NLU → Dialog → TTS pipeline; understands that phone calls need real-time processing | 10 |
| **Multilingual awareness** | Acknowledges the need for multiple language support; mentions the training data availability disparity across languages | 10 |
| **Product matching challenge** | Identifies that spoken product names need special handling (not just text search); mentions synonyms or regional names | 10 |
| **Confirmation importance** | Recognizes that voice orders need explicit confirmation because there's no visual verification | 10 |
| **Basic scalability** | Understands that concurrent calls require dedicated compute; mentions GPU requirements for ASR/TTS | 10 |

### Level 2: Production Awareness (Senior) — 25% of points

| Criterion | What to Look For | Points |
|---|---|---|
| **Three-tier ASR strategy** | Proposes different approaches for high-resource, medium-resource, and low-resource languages; mentions transfer learning or adapter-based approaches | 5 |
| **Code-mixing handling** | Identifies code-mixing as the default pattern (not edge case); proposes multilingual acoustic model and cross-lingual NLU | 5 |
| **Latency optimization** | Mentions speculative NLU execution, streaming TTS, adaptive endpointing, or response caching; understands the 1.2-second budget | 5 |
| **Hybrid dialog management** | Proposes rule-based for critical commerce flows + ML/LLM for open-ended; explains why pure LLM is dangerous for transactions | 5 |
| **Voice-specific security** | Identifies voice payment security issues; mentions DTMF for sensitive input; discusses recording consent and biometric data risks | 5 |

### Level 3: Expert Design (Staff+) — 15% of points

| Criterion | What to Look For | Points |
|---|---|---|
| **ASR-aware NLU** | Designs NLU pipeline that uses ASR confidence scores, n-best lists, and phonetic similarity for entity resolution; not just processing the best transcript as text | 5 |
| **Vernacular product resolution pipeline** | Multi-stage resolution: entity extraction → synonym normalization → phonetic matching → semantic matching → disambiguation dialog; discusses the synonym dictionary growth strategy | 3 |
| **GPU economics and optimization** | Can estimate GPU requirements; proposes quantization, micro-batching, caching, and tiered processing; understands that real-time voice cannot be queued | 3 |
| **Chunked confirmation UX** | Designs the voice confirmation flow considering working memory limits; proposes chunked item delivery with checkpoints; addresses the error recovery problem | 2 |
| **Observability for voice** | Proposes WER monitoring via human-in-the-loop sampling; explains why WER cannot be computed automatically; suggests proxy metrics for real-time monitoring | 2 |

---

## Trade-Off Discussions

### Trade-Off 1: Latency vs. Accuracy for ASR

| Approach | ASR Latency | WER | Use Case |
|---|---|---|---|
| **Small distilled model (100M params, INT8)** | 50 ms/chunk | 18% WER | High-traffic language on real-time calls; acceptable accuracy for common phrases |
| **Medium model (300M params, FP16)** | 150 ms/chunk | 12% WER | Default for real-time calls; good accuracy-latency balance |
| **Large model (1.5B params, FP32)** | 400 ms/chunk | 8% WER | WhatsApp voice notes (batch, no real-time constraint); also used for quality evaluation |
| **Two-pass** | 150 ms first pass + 400 ms second pass | 10% WER (final) | First pass for early intent detection; second pass for accurate transcript; used for high-value interactions |

**Discussion points:**
- For a simple reorder ("wahi order kar do"), the small model suffices
- For a new product search in a low-resource language, the large model prevents wrong product matching
- The two-pass approach gives the best of both worlds but doubles GPU cost
- The platform can adaptively select model size based on session context (repeat customer + simple order → small model; new customer + complex order → large model)

### Trade-Off 2: Per-Language Models vs. Single Multilingual Model

| Aspect | Per-Language Models | Single Multilingual Model |
|---|---|---|
| **Accuracy** | Best for each language (5–10% WER advantage) | Consistent but lower across all languages |
| **Code-mixing** | Poor — cannot handle mid-sentence language switches | Good — naturally handles mixed-language input |
| **Operational complexity** | High — 30+ model variants to deploy, monitor, update | Low — single model to manage |
| **GPU memory** | High — each model loaded separately (2–12 GB each) | Low — single model (8–12 GB) serves all |
| **Cold start for new languages** | Each language needs its own model | Adding a new language requires only fine-tuning |
| **Failover** | Complex — must fall back to multilingual if language model fails | Simple — single model, standard failover |

**Resolution:** Not an either/or — use both:
- Language-specific models for top 8 languages (90% of traffic, accuracy-critical)
- Multilingual model as:
  - Default for code-mixed speech
  - Fallback when language-specific model fails
  - Primary model for low-resource languages (< 100h training data)

### Trade-Off 3: Audio Storage — Full Recording vs. Transcript Only

| Approach | Storage Cost | Privacy Risk | Analytics Value | Compliance |
|---|---|---|---|---|
| **Full audio, all sessions** | ~165 TB/month | High — biometric data stored at scale | Maximum — can retrain models, audit any interaction | Requires explicit consent for all users |
| **Full audio, sampled (5%)** | ~8.25 TB/month | Moderate — limited biometric exposure | Good — sufficient for WER monitoring and model improvement | Consent needed for sampled users |
| **Transcript + metadata only** | ~3 GB/month | Low — text without biometric data | Moderate — can analyze intents, entities, but cannot retrain acoustic models | Simpler consent model |
| **Transcript + audio for failures** | ~15 TB/month | Moderate | High for improvement — focuses on failure cases | Consent at session start for potential storage |

**Discussion points:**
- Full recording is necessary for ASR model retraining but creates a massive biometric data liability
- Transcript-only is privacy-friendly but makes it impossible to improve ASR models (need audio for acoustic model training)
- The sample-based approach is the practical middle ground: enough audio for model improvement, limited enough for manageable privacy risk
- Regulatory requirements may mandate recording for financial transactions (dispute resolution)

### Trade-Off 4: Synchronous vs. Asynchronous Voice Commerce

| Channel | Latency Constraint | User Experience | System Cost | Use Case |
|---|---|---|---|---|
| **Synchronous (phone call)** | < 1.2 s per turn | Natural conversation; immediate gratification; higher conversion | High — dedicated GPU per call for entire duration | Primary ordering, support, complex interactions |
| **Asynchronous (WhatsApp voice)** | < 5 s per message | More flexible; user can compose at their pace; lower pressure | Low — batch processing; GPU shared across messages | Follow-up orders, reorders, casual browsing |

**Discussion points:**
- Synchronous is 10x more expensive per interaction but has 2x higher conversion rate
- Asynchronous allows larger ASR models (no real-time constraint) → better accuracy
- Hybrid approach: start on WhatsApp (async), escalate to phone call for payment/complex disambiguation
- Non-literate users strongly prefer synchronous phone calls; literate users may prefer WhatsApp

### Trade-Off 5: Rule-Based vs. LLM-Based Response Generation

| Approach | Latency | Quality | Cost | Consistency | Safety |
|---|---|---|---|---|---|
| **Template-based** | 5 ms | Predictable, mechanical | Negligible | Perfect consistency | Safe — no hallucination possible |
| **LLM-based** | 200–500 ms | Natural, conversational | $0.001–0.01 per turn | Variable — different wording each time | Risky — may make false commitments |
| **Hybrid: template for commerce + LLM for open dialog** | 5–500 ms | Natural where it matters, precise for commerce | Moderate | Commerce: consistent; Open: variable | Safe for transactions; gated for open dialog |

**Discussion points:**
- Template-based responses sound robotic for a 10-turn conversation
- LLM responses sound natural but may promise things the system cannot deliver
- The hybrid approach is production-standard: "Order confirmed, ₹248, delivery by tomorrow 6 PM" is always templated; "Let me find something nice for you" is LLM-generated
- Multilingual template management (22 languages × hundreds of response templates) is itself a significant engineering challenge
