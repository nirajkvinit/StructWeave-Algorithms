# Key Insights: AI Interviewer System

## Insight 1: Cascaded Pipeline Enables Compliance at the Cost of Latency Engineering

**Category:** System Modeling
**One-liner:** Choosing a cascaded ASR-LLM-TTS pipeline over native speech-to-speech preserves the audit trail that regulators demand, but transforms latency from a quality concern into a survival constraint.

**Why it matters:** Enterprise hiring platforms must produce full transcripts, per-question evaluations, and chain-of-thought reasoning for EEOC and EU AI Act compliance. A native speech-to-speech model (e.g., OpenAI Realtime API) treats the entire interaction as a black box, making it impossible to produce these artifacts. The cascaded architecture satisfies compliance but introduces a serial latency chain (VAD + ASR + LLM + TTS) where every component must be streaming-optimized to hit the 300ms mouth-to-ear target. Systems that fail to account for this trade-off either sacrifice compliance or deliver robotic-feeling conversations.

---

## Insight 2: Speculative LLM Generation on Partial Transcripts

**Category:** Streaming
**One-liner:** Begin LLM generation before the candidate finishes speaking by feeding partial ASR transcripts, cutting perceived latency by 100-200ms.

**Why it matters:** In a serial pipeline with a 300ms budget, every millisecond matters. By streaming partial ASR results into the LLM context while the candidate is still speaking, the system can begin generating a response before the final transcript arrives. When the speech-end signal fires, the LLM already has a head start. This technique requires careful handling of partial-to-final transcript corrections -- the LLM may need to abandon a speculative generation if the final transcript diverges significantly from the partial one. Without this optimization, the pipeline cannot achieve natural conversational flow.

---

## Insight 3: Multi-LLM Consensus with Cohen's Kappa Thresholding

**Category:** Consistency
**One-liner:** Using multiple LLMs as independent judges and measuring inter-rater agreement via Cohen's Kappa reduces single-model scoring variance from 15-20% to approximately 5%.

**Why it matters:** A single LLM evaluating a candidate response can produce significantly different scores on rerun due to temperature, prompt sensitivity, and attention patterns. By running two independent LLM judges and computing their agreement (Kappa >= 0.6 for acceptance, < 0.4 triggers human review), the system achieves evaluation consistency comparable to trained human interviewers. This pattern applies broadly to any system where LLM outputs are used for consequential decisions -- think content moderation, legal review, or medical triage.

---

## Insight 4: Barge-In Protocol for Turn-Taking Contention

**Category:** Contention
**One-liner:** When a candidate starts speaking while the AI is mid-response, immediately halt TTS playback and discard remaining tokens rather than letting both sides talk simultaneously.

**Why it matters:** Overlapping speech is the most jarring failure mode in real-time conversational AI. The barge-in protocol implements a preemption model: candidate speech detected by VAD immediately stops TTS output, discards queued tokens, and saves the interruption point for context. This is architecturally analogous to interrupt handling in operating systems. Without it, the system either talks over the candidate (destroying the interview experience) or implements complex audio mixing that confuses both parties.

---

## Insight 5: Graceful Degradation Ladder for Component Failures

**Category:** Resilience
**One-liner:** Define five explicit degradation levels from full streaming pipeline down to interview rescheduling, ensuring the system never fails silently during a live interview.

**Why it matters:** A mid-interview failure is catastrophic -- unlike a web page that can show an error, a live conversation cannot simply display a spinner. The five-level degradation ladder (full streaming -> batch ASR + streaming TTS -> text-only -> predefined questions only -> reschedule) ensures that each component failure triggers a specific, pre-tested fallback rather than an undefined state. This pattern is critical for any system where a session-in-progress cannot be restarted, such as live broadcasts, surgical robots, or financial trading platforms.

---

## Insight 6: Jurisdiction-Aware Evaluation Module Architecture

**Category:** Security
**One-liner:** Build evaluation as a pluggable module system where emotion-recognition components can be disabled per jurisdiction without architectural changes, anticipating the EU AI Act's August 2026 deadline.

**Why it matters:** The EU AI Act will prohibit emotion recognition in hiring contexts starting August 2, 2026. Systems that embed emotion analysis deeply into their scoring pipeline face expensive rewrites. By making voice emotion analysis, facial expression analysis, and engagement scoring into independently toggleable modules keyed by candidate jurisdiction, the platform can comply with evolving regulations through configuration rather than code changes. This modular compliance pattern applies to any AI system operating across regulatory boundaries.

---

## Insight 7: Disparate Impact Monitoring as a Real-Time Guardrail

**Category:** External Dependencies
**One-liner:** Continuously calculate the four-fifths rule (DI >= 0.8) across demographic groups and flag evaluation batches that violate it before they reach hiring managers.

**Why it matters:** EEOC compliance requires that selection rates for protected groups be at least 80% of the highest-performing group. Rather than discovering bias in quarterly audits, real-time DI monitoring catches systematic scoring patterns as they emerge. When DI drops below 0.85 (a safety margin above the 0.8 threshold), the system flags evaluations for human review. This transforms bias detection from a post-hoc compliance exercise into an architectural guardrail, catching prompt-induced bias, training data issues, or rubric design flaws before they affect hiring outcomes.

---

## Insight 8: SFU Topology for Compliance Recording

**Category:** Data Structures
**One-liner:** An SFU (Selective Forwarding Unit) adds only 20-50ms latency over P2P but enables server-side recording that is essential for audit trails -- making it the only viable topology for regulated interviewing.

**Why it matters:** P2P WebRTC connections offer the lowest latency but make recording dependent on the client, which is unreliable and legally questionable. MCU (Multipoint Control Unit) adds 50-100ms and consumes server resources for transcoding. The SFU forwards media streams without mixing, enabling server-side recording with minimal latency overhead. For any system requiring verifiable recordings of real-time interactions (telehealth, legal depositions, financial advisory), SFU is the topology that balances latency, recording reliability, and compliance needs.

---

## Insight 9: Rolling Context with Summarization for Long Interviews

**Category:** Caching
**One-liner:** Structure the LLM context window as fixed zones (system prompt, job requirements, rubric summary, conversation summary, recent turns, remaining questions) and trigger summarization when context reaches 80% capacity.

**Why it matters:** A 20-minute interview generates 5-10K words of transcript, exceeding most context windows. Naive approaches either truncate early conversation (losing context) or use maximum-length windows (increasing latency). The rolling context strategy maintains full fidelity for recent turns while compressing older exchanges into structured summaries. Summarization triggers at 80% capacity, every 5 questions, or on topic changes. This pattern is transferable to any long-running LLM conversation: customer support, therapy sessions, or multi-day project discussions.

---

## Insight 10: Recording Storage Tiering for Multi-Year Compliance Retention

**Category:** Cost Optimization
**One-liner:** With 19TB/month of audio recordings requiring 2-7 year retention, a four-tier storage strategy (SSD -> HDD -> S3 IA -> Glacier) reduces costs by 60-70% compared to flat storage.

**Why it matters:** Compliance mandates in hiring (EEOC, state laws) require interview recordings to be retained for years, but 99% of recordings are never accessed after the first 30 days. Storing everything on hot storage at $0.023/GB/month grows to $36,800/month by year 3 at 7-year retention. Tiered storage moves recordings from hot (immediate access, first 30 days) through warm (1 minute, 30-180 days) to cold (1 hour, 6 months-2 years) and archive (24 hours, 2+ years). This pattern is universal for systems generating large media artifacts under regulatory retention requirements.
