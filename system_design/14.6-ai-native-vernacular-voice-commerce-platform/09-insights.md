# Insights — AI-Native Vernacular Voice Commerce Platform

## Insight 1: The Endpointing Decision Is the Single Largest Latency Contributor, and It Is Fundamentally a Classification Problem, Not a Threshold Problem

**Category:** System Modeling

**One-liner:** Voice Activity Detection (VAD) endpointing—deciding when the user has finished speaking—accounts for 40–60% of the total end-to-end response latency, yet most architectures treat it as a simple silence-threshold timer rather than a contextual classification model that should predict "user is done speaking" from dialog state, acoustic features, syntactic completeness, and turn-taking cues.

**Why it matters:** The naive approach to endpointing is a fixed silence threshold: if the user has been silent for 700 ms, they are done speaking. This creates an unavoidable 700 ms delay added to every single conversational turn. In a system where the total latency budget is 1,200 ms, this one component consumes 58% of the budget before any ASR, NLU, or TTS processing even begins. Reducing the threshold to 400 ms saves 300 ms but causes false positions—the system starts responding while the user is still mid-sentence, pausing briefly between phrases ("do kilo basmati [400ms pause] aur ek litre doodh"). A false-positive endpoint interrupts the user, truncates their request, and degrades the ASR transcript.

The production system replaces the fixed threshold with a trained endpointing classifier that takes as input: (1) the silence duration so far (continuous feature, not a binary threshold), (2) the acoustic energy envelope of the preceding speech (trailing off suggests completion; sustained energy suggests a mid-sentence pause), (3) the partial ASR transcript (a syntactically complete sentence is more likely done than an incomplete one—"do kilo basmati chawal" is potentially complete; "do kilo basmati chawal aur" ends with a conjunction, indicating more is coming), (4) the dialog state (if the system just asked a yes/no question, a 300 ms silence after a short utterance is very likely a complete response; if the system asked "what do you want to order?", the user will need more time), and (5) prosodic features (falling intonation suggests utterance completion; rising intonation suggests the user is not done).

This trained endpointer reduces average endpointing latency from 700 ms to 350–500 ms (depending on context) while maintaining a false-positive rate below 3%. The 200–350 ms saved per turn compounds across a 10-turn conversation to save 2–3.5 seconds of total session time—a 15–20% reduction in perceived system sluggishness. The model is language-specific because pause patterns vary dramatically: Hindi speakers tolerate longer pauses (800 ms) between phrases than Tamil speakers (500 ms), and question-final particles in Bengali signal completion even without silence.

---

## Insight 2: The Vernacular Synonym Dictionary Is a Living Knowledge Graph, Not a Static Lookup Table

**Category:** Data Structures

**One-liner:** Mapping spoken product references to catalog entries requires not a flat synonym table but a weighted, context-dependent knowledge graph where edges encode phonetic similarity, semantic relatedness, regional prevalence, temporal relevance (seasonal products), and user-specific purchase history—because the same spoken word "atta" maps to wheat flour in Hindi, rice flour in Marathi contexts, and a specific brand name in certain dialects.

**Why it matters:** The naive implementation of product synonym mapping is a lookup table: "chawal" → rice, "doodh" → milk, "atta" → wheat flour. This works for the 500 most common product names but fails catastrophically at the long tail, where 35% of voice commerce interactions involve products whose vernacular names are context-dependent, regionally variable, or phonetically ambiguous.

The context-dependency problem is severe. "Atta" means wheat flour in standard Hindi, but in parts of Maharashtra it refers to any flour (wheat, rice, or gram). "Dal" without a qualifier means toor dal in Gujarat, masoor dal in Bengal, and moong dal in Rajasthan. "Dahi" means yogurt everywhere, but "curd" means yogurt in South India and cheese curd in North India when spoken in English. A flat lookup table cannot disambiguate these—it needs regional context (the user's location or dialect), categorical context (what other items they've ordered—if they've ordered rice and a curry, "dal" is likely toor dal as a curry accompaniment), and temporal context (during Navratri, "atta" queries from North Indian users spike for kuttu ka atta—buckwheat flour—not regular wheat flour).

The production system models the synonym dictionary as a weighted graph where each product node connects to multiple synonym nodes through edges weighted by: (1) **regional weight**—"togari bele" has weight 0.95 for Karnataka users and 0.01 for UP users; (2) **phonetic distance**—"bashmati" has high phonetic proximity to "basmati" and low proximity to "jasmine"; (3) **temporal weight**—"modak" has high weight during Ganesh Chaturthi and low weight otherwise; (4) **co-occurrence weight**—if the user's cart already contains "poha," the synonym "chivda" for a snack has higher weight than "chivda" for a type of flat rice; (5) **user-historical weight**—if the user ordered "Aashirvaad atta" last three times, "atta" from this user should resolve to Aashirvaad brand with a 0.9 prior.

Graph traversal for product resolution follows a beam search: starting from the spoken input node, explore edges with highest combined weight, maintaining a beam of top-5 candidates. The graph structure enables multi-hop resolution: a misspelled regional variant ("togri bele" → phonetic match to "togari bele" → synonym of "toor dal" → canonical: arhar-dal) that would require three separate lookups in a flat table resolves naturally as a single graph traversal.

---

## Insight 3: Streaming TTS Creates an Irrecoverable Commitment Problem That Shapes the Entire Response Generation Architecture

**Category:** Consistency

**One-liner:** When TTS begins synthesizing audio from the first tokens of a response before the full response is generated (streaming TTS for latency optimization), audio already sent to the caller cannot be recalled or corrected—meaning the response generator must emit tokens in a strictly left-to-right order with no backtracking, which fundamentally constrains how the system computes and communicates prices, totals, and recommendations.

**Why it matters:** Streaming TTS is the single most impactful latency optimization in voice commerce: it saves 300–500 ms by beginning audio synthesis from the first few words of the response while the backend is still computing the full response. Without streaming TTS, the system must: (1) compute the complete response text, (2) send the full text to TTS, (3) wait for TTS to synthesize all audio, (4) begin playback. With streaming TTS, steps 2–4 overlap with step 1.

But streaming creates a "commitment problem" analogous to the irrecovable-payment problem in financial systems: once audio is playing, it cannot be taken back. If the system starts saying "Aapke cart mein teen items hain..." but then the inventory service responds that one item is out of stock, the system has already committed to "teen items" (three items) and cannot correct to "do items" (two items) without an awkward verbal correction ("sorry, actually do items"). In text commerce, the response is assembled completely before display and can be rewritten any number of times.

This constraint shapes the entire response generation architecture:

1. **Pre-fetch pattern**: Before generating any response, the system pre-fetches all data needed for the response (cart state, prices, inventory, delivery estimates). Only after all data is available does generation begin. This adds 50–100 ms to response preparation but eliminates mid-response corrections.

2. **Safe-prefix emission**: The response generator emits "safe" prefixes that don't commit to specific facts while awaiting backend data. Example: "Ek minute... aapke order ki details bata raha hoon" (filler phrase) while the cart/inventory data is being fetched. Once data arrives, the factual content follows. This filler is perceptually acceptable (humans do this naturally) but must not be overused.

3. **Response structure ordering**: Responses are structured so that less volatile information comes first and more volatile (price, availability) comes later. "Aapne basmati chawal, Amul doodh, aur Maggi select kiya hai..." (item names are stable) → brief pause → "...total 248 rupaye hai" (price computed during the pause). The item names are emitted while the price calculation completes.

4. **Correction protocol**: When a mid-response correction is unavoidable, the system uses a natural correction pattern: "...teen items— correction, do items kyunki Maggi abhi stock mein nahi hai." This must be handled in the dialog manager, not the TTS, because the dialog manager knows what was already said and what the correction is.

---

## Insight 4: Code-Mixing Ratio Is a User-Specific Feature That Predicts Commerce Intent Quality Better Than Language Detection

**Category:** System Modeling

**One-liner:** The ratio of English words to vernacular words in a user's speech (their "code-mixing signature") is more predictive of their intent expression patterns, product naming conventions, and interaction efficiency than their detected base language—a user who says "yeh red color mein available hai kya?" processes product information differently from a user who says "yeh lal rang mein milega kya?" even though both speak Hindi.

**Why it matters:** Language detection in multilingual voice commerce focuses on identifying the user's "primary language" (Hindi, Tamil, Telugu, etc.) and routing to the appropriate ASR model. But within any single language, there is an enormous spectrum of code-mixing behavior. A user with high English mixing (40%+ English words in Hindi sentences) has fundamentally different interaction patterns than a pure Hindi speaker, and the system that treats both identically loses accuracy on both.

High-code-mix users (typically urban, digitally active, younger demographic) tend to: (1) use English product names and brand names as-is ("Give me one packet of Bournvita"), (2) express quantities in English ("two kilos" not "do kilo"), (3) understand English product categories ("show me electronics" not "bijli ke saamaan dikhao"), and (4) tolerate and prefer English in system responses for product names and prices. Low-code-mix users (typically rural, older, less digitally active) tend to: (1) use purely vernacular product names ("haldi" not "turmeric"), (2) use vernacular numerals and quantity expressions ("dedh kilo" = 1.5 kg, "paav" = 250g), (3) struggle with English product descriptions in system responses, and (4) use more conversational, context-dependent product references ("woh peeli wali cheez jo khane mein dalte hain" = "that yellow thing you put in food" = turmeric).

The production system tracks per-user code-mix ratio as a first-class feature:

- **ASR routing**: High-code-mix users routed to the code-mixed multilingual model; low-code-mix users routed to the pure vernacular language-specific model (which handles their speech more accurately because it's not confused by unexpected English words that don't appear in low-code-mix speech).
- **Entity extraction**: High-code-mix NLU prioritizes English entity dictionaries alongside vernacular; low-code-mix NLU prioritizes the pure vernacular synonym dictionary.
- **Response generation**: High-code-mix responses use English for brand names, product categories, and prices; low-code-mix responses use pure vernacular for everything including number words.
- **TTS voice selection**: High-code-mix users get a TTS voice that handles English words with natural English pronunciation; low-code-mix users get a pure vernacular voice that nativizes borrowed words.

This personalization based on code-mix ratio improves product resolution accuracy by 8–12% and reduces disambiguation dialogs by 15%, because the system correctly anticipates whether the user will say "basmati rice" or "basmati chawal" and optimizes its matching and response accordingly.

---

## Insight 5: The Telephony Channel's 8 kHz Bandwidth Destroys Exactly the Acoustic Features That Distinguish Confusable Product Names

**Category:** Contention

**One-liner:** PSTN phone calls limit audio to 8 kHz sample rate (300–3,400 Hz effective bandwidth), which selectively eliminates the high-frequency fricative and sibilant energy (4,000–8,000 Hz) that distinguishes acoustically similar product names like "chawal"/"chaaval", "sarson"/"sarson ka tel", "jeera"/"cheeni"—creating a product-name-specific ASR accuracy cliff on the exact channel used by the platform's primary target demographic.

**Why it matters:** The target users of a vernacular voice commerce platform—non-literate or semi-literate users in semi-urban and rural India—predominantly interact via basic phone calls, not smartphone apps. Phone calls over the PSTN use G.711 codec at 8 kHz sample rate, which captures audio up to 3,400 Hz (Nyquist theorem). Human speech contains critical distinguishing features up to 8,000 Hz: the fricatives /s/, /sh/, /ch/, and the aspirated consonants /kh/, /gh/, /ph/ that are common in Indian languages have their primary spectral energy in the 4,000–8,000 Hz range.

This creates a systematic bias: product names that differ only in high-frequency sounds become acoustically indistinguishable on phone calls. "Sarson" (mustard) and "sarson ka tel" (mustard oil) share the same low-frequency profile; the distinguishing "ka tel" contains the plosive /t/ whose burst energy is above 4 kHz. "Cheeni" (sugar) and "jeera" (cumin) differ in their initial fricative (/ch/ vs. /j/) whose spectral energy is centered around 4,500 Hz—exactly at the cutoff. The ASR model trained on wideband (16 kHz) audio achieves 6% WER on these confusable pairs; the same model on narrowband achieves 22% WER—a 3.7x degradation on the most commerce-critical vocabulary.

The production solution is a narrowband-specific ASR training pipeline that: (1) trains models exclusively on 8 kHz audio (not downsampled from 16 kHz, because real narrowband audio has different noise characteristics than downsampled wideband), (2) augments the training data with telephone channel simulation (codec artifacts, line noise, echo), (3) shifts the acoustic feature representation to emphasize sub-3,400 Hz cues that distinguish confusable words (temporal envelope differences, formant transitions, voice onset time), and (4) uses a commerce-domain language model with elevated probability for product name bigrams to compensate with linguistic context what is lost acoustically.

Additionally, the platform deploys a "confusable-pair disambiguation" layer specifically for narrowband channels: when the ASR output confidence is below 0.7 for a product name that belongs to a known confusable pair (maintained in a curated list of ~500 pairs per language), the system proactively disambiguates ("Aapne cheeni bola ya jeera?") rather than guessing. This targeted disambiguation adds one conversational turn but prevents the trust-destroying experience of receiving sugar when cumin was ordered.

---

## Insight 6: GPU Cost Optimization for Voice Commerce Requires Audio-Aware Batch Formation, Not Request-Count-Based Batching

**Category:** Cost Optimization

**One-liner:** Standard ML serving batches requests by count (batch size 8, 16, 32), but voice ASR inference batches must be formed by audio duration alignment because audio chunks from different calls have different effective speech content—a chunk that is 80% silence and 20% speech requires the same GPU time as a chunk that is 100% speech, but combining silence-heavy chunks wastes 80% of GPU compute.

**Why it matters:** ASR inference on GPU processes fixed-size audio chunks (typically 200 ms). In real-time voice commerce, each concurrent call contributes one 200 ms chunk per processing cycle. The naive approach is to batch N chunks together (e.g., batch size 8 = 8 concurrent calls processed simultaneously on one GPU), achieving throughput of 8× single-inference at only 1.5× the latency. This works well for continuous speech but wastes GPU compute on silence.

In real voice commerce interactions, users are silent 40–60% of the time: they listen to TTS responses, they pause to think, they turn to speak to someone else, they hold the phone while checking their wallet. A 200 ms chunk during silence still flows through the entire ASR encoder-decoder pipeline, consuming the same GPU cycles as a speech chunk, but producing no useful output (the decoder emits no tokens). In a batch of 8 chunks, on average 3–4 contain only silence—meaning 37–50% of GPU compute is wasted on processing silence.

The production system implements audio-aware batch formation:

1. **VAD-gated processing**: The Voice Activity Detector runs on CPU (negligible cost) and gates audio chunks before they reach the GPU. Silence chunks are not forwarded to ASR at all; instead, a "silence continuation" signal is sent to the decoder, which extends its endpointing timer without running the expensive encoder.

2. **Speech-onset batching**: When VAD detects speech onset, the first speech chunk (which contains critical utterance-initial phonemes) is prioritized for low-latency single-inference processing. Subsequent speech chunks from the same utterance can be batched with chunks from other active speech streams.

3. **Duration-aligned batching**: Audio chunks are batched with other chunks that have similar speech-to-silence ratios. This allows the batch to exit the encoder early when all chunks in the batch contain silence (early termination) or to fully utilize GPU compute when all chunks contain speech.

4. **Adaptive batch sizing**: During low-traffic periods (2 AM – 6 AM), batch sizes increase to maximize GPU efficiency (fewer GPUs needed). During peak hours, batch sizes decrease to minimize latency. The system dynamically adjusts batch size to maintain latency SLO while maximizing GPU utilization.

This audio-aware batching reduces effective GPU consumption by 35–45% compared to naive fixed-batch-size processing, because silence periods (which are 40–60% of call duration) no longer consume GPU resources. At 120 A100 GPUs, this optimization saves 42–54 GPU equivalents, translating to $45,000–$60,000 per month in GPU costs.

---

## Insight 7: The Non-Literate User's Working Memory Constraint Creates a Hard Limit on Cart Size That Text Commerce Never Encounters

**Category:** Workflow

**One-liner:** Non-literate users ordering via voice can reliably track only 5–7 items in their working memory (Miller's Law), creating a hard UX constraint where carts larger than 7 items cause users to lose track of what they've ordered, agree to incorrect totals, and subsequently dispute orders—making the chunked-confirmation-with-checkpoints pattern not a nice-to-have UX improvement but a structural necessity to prevent order disputes.

**Why it matters:** In text-based e-commerce, a user adding the 15th item to their cart can scroll up to see all previous items. The visual interface serves as an external memory aid. In voice-only commerce for non-literate users, there is no external memory: the user must hold all cart items in their working memory while the system reads them back for confirmation. Cognitive science establishes that working memory can reliably hold 7 ± 2 items (Miller's Law), and this limit is even lower (5 ± 1) for cognitively loaded tasks where the user is simultaneously listening, verifying, and planning.

Production data confirms this: for carts with ≤ 5 items, the order confirmation rate (user confirms the cart as read back) is 94%. For 6–7 items: 81%. For 8–10 items: 62%. For 11+ items: 38%. The 38% confirmation rate for large carts doesn't mean users rejected the cart—it means they said "haan" (yes) without actually tracking whether all items were correct, leading to post-delivery disputes. The dispute rate for orders > 7 items is 4.2x higher than for orders ≤ 5 items.

The production system implements several working-memory-aware design patterns:

1. **Chunked confirmation**: Never read more than 3 items without a checkpoint ("ab tak sahi hai?"). This segments the cart into manageable groups within working memory capacity.

2. **Progressive total**: After each chunk, announce the running total. This anchors the user's financial tracking: "Pehle teen items ka 247 rupaye. Ab agle teen items..." The user only needs to remember the running total, not individual prices.

3. **Cart splitting for large orders**: For carts > 7 items (which are rare in MSME voice commerce but occur for weekly grocery orders), the system proactively suggests splitting: "Aapke cart mein 12 items hain. Pehle 6 items ka order confirm karein, phir baaki 6?" This turns one cognitively overwhelming confirmation into two manageable ones.

4. **Familiar-item anchoring**: When reading back items, start with the most recently added items (freshest in the user's memory) and end with the first items added (most likely forgotten). This reverse-chronological order maximizes the chance that the user catches any discrepancies.

5. **Summary-only for repeat orders**: For repeat customers ordering the same items as last time, skip item-by-item readback: "Aapka hamesha wala order: 5 items, 627 rupaye. Wahi kar doon?" This leverages long-term memory (the user remembers their regular order) instead of working memory.

---

## Insight 8: The Outbound Campaign Dialer Must Model Telephony Infrastructure as a Stochastic Adversary, Not a Reliable Transport

**Category:** Scaling

**One-liner:** Outbound voice campaigns at scale (100,000+ calls/day) face a telephony infrastructure that behaves like a hostile, rate-limiting, opaque system: carrier-level throttling silently drops calls without error codes, DND registry APIs return stale data causing regulatory violations, cell tower congestion during peak hours reduces answer rates by 40%, and SIP trunk failover during carrier maintenance windows causes 5-minute blackouts—requiring the campaign orchestrator to model the telephony layer as a stochastic system with hidden state, not a deterministic API.

**Why it matters:** Engineers building outbound campaign systems typically model the telephony layer as a reliable API: "call this number → one of {answered, busy, no_answer, failed}." In reality, the telephony infrastructure at scale behaves as an unreliable, stateful system with hidden failure modes:

1. **Carrier-level throttling**: When a carrier detects high call volume from a single source (which looks like spam), it silently drops calls—the SIP INVITE message is accepted but no RINGING event is ever generated. The platform sees the call as "initiated" but it never connects and never fails. Without explicit timeout handling, these phantom calls occupy SIP trunk capacity and dialer resources indefinitely.

2. **DND registry staleness**: India's TRAI DND (Do Not Disturb) registry is updated asynchronously. A user who registered for DND at 2 PM may not appear in the registry API until 6 PM. Calls placed during the gap are regulatory violations. The platform must maintain its own DND buffer (treating recently-opted-out numbers as DND even before the registry reflects it) and track its own opt-out requests with zero delay.

3. **Cell tower congestion**: During peak hours (6 PM–9 PM), cell towers in dense urban areas and during festivals are overloaded. Call setup success rate drops from 95% to 55%. Retrying immediately makes congestion worse. The optimal strategy is exponential backoff with jitter, but the retry must happen within the calling hours window (before 9 PM).

4. **SIP trunk failover gaps**: When a carrier performs maintenance, the SIP trunk may experience a 2–5 minute blackout. During this window, all calls on that trunk fail. The campaign orchestrator must detect trunk-level failures (distinguished from individual call failures) and reroute to backup trunks immediately.

5. **Answer machine detection (AMD)**: 15–20% of "answered" calls are actually voicemail or automated greetings. The system must detect answer machines within 3 seconds of "answer" to avoid wasting ASR/TTS resources on a recording. False-positive AMD (classifying a human as a machine) loses the call permanently; false-negative AMD wastes 30+ seconds of the AI talking to voicemail.

The production campaign orchestrator models the telephony layer using a hidden Markov model: the hidden states represent carrier health (normal, throttling, congested, maintenance), and the observed states are per-call outcomes. The model estimates the current hidden state from recent call outcomes and adjusts dialing strategy: in "normal" state, dial at full pacing (10 CPS); in "throttling" state, reduce to 3 CPS and rotate source numbers; in "congested" state, pause non-urgent campaigns and reduce to 1 CPS for transactional calls; in "maintenance" state, failover to backup trunk and hold all campaigns. This adaptive pacing reduces wasted call attempts by 30% and avoids regulatory risk from aggressive dialing during carrier throttling periods.
