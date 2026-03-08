# Key Insights: AI Voice Assistant

## Insight 1: Tiered Wake Word Detection Trades Power for Accuracy Across Hardware Stages

**Category:** Edge Computing
**One-liner:** A three-stage pipeline -- VAD energy gate (~0.5mW), MFCC feature extraction (~1mW), CNN inference (~10mW) -- keeps total always-on power under 12mW by only activating expensive stages when cheaper ones detect voice activity.

**Why it matters:** Wake word detection runs 24/7 on battery-constrained devices, making power consumption as important as accuracy. Running the full CNN on every audio frame would drain batteries in hours. The tiered approach uses a near-zero-cost energy-based VAD as a gate, only computing MFCC features when speech energy is detected, and only running neural network inference when features look speech-like. The 14KB INT8-quantized CNN model (3 Conv2D layers, 39 MFCC features, 75-frame context window) achieves 95% accuracy at ~1mW on a DSP. Without tiered detection, mobile voice assistants would be impractical due to battery drain.

---

## Insight 2: False Accept vs. False Reject Is a Privacy-Usability Tradeoff With No Perfect Operating Point

**Category:** Security
**One-liner:** Every wake word threshold trades privacy violations (false accepts trigger recording) against usability degradation (false rejects frustrate users), with the optimal operating point at ~1 false accept per week per device and <5% false reject rate.

**Why it matters:** A false accept means the device starts recording and streaming audio to the cloud when no one said the wake word -- a privacy incident. A false reject means the user has to repeat themselves. These are inversely correlated via the confidence threshold. The 0.95 threshold with 2-second debounce targets the industry-standard operating point, but different contexts may need different thresholds. Cloud verification as a second stage can reduce false accepts by 10x but adds 200-500ms latency. Near-miss words ("Alexis" for "Alexa") require explicit anti-trigger training with negative examples to avoid inflating the false accept rate.

---

## Insight 3: Streaming RNN-T With Causal Attention Enables Real-Time Partial Transcripts

**Category:** Streaming
**One-liner:** The Conformer encoder uses causal self-attention (each frame attends only to past frames within a 640ms window), emitting partial transcripts within ~150ms of speech onset without waiting for the utterance to end.

**Why it matters:** Users expect to see words appear as they speak. Standard bidirectional attention (like Whisper) requires the full utterance before transcription, adding 1-3 seconds of perceived latency. The RNN-Transducer architecture solves this: the Conformer encoder processes audio frames causally, and the prediction network (2-layer LSTM) tracks the output sequence. Partial transcripts are emitted every ~100ms. The per-frame latency breakdown is: audio capture (20ms) + network (30ms) + feature extraction (5ms) + encoder (50ms) + joint+decoder (10ms) = ~115ms to first partial. Language model rescoring on the final hypothesis recovers accuracy lost from causal-only attention.

---

## Insight 4: Contextual Biasing Solves ASR Personalization via Trie-Based Logit Boosting

**Category:** Data Structures
**One-liner:** A prefix trie built from the user's contacts, music library, and device names biases decoder logits during inference, turning "John Smyth" into "John Smith" without retraining the model.

**Why it matters:** Out-of-vocabulary words (proper nouns, device names, song titles) are the primary source of ASR errors. Contextual biasing builds a trie from user-specific vocabulary and, during decoding, adds a bonus to logits for tokens continuing a valid prefix: `biased_logits[token] = logits[token] + lambda * trie_bonus` (lambda ~0.3-0.5). Too-high lambda causes hallucination of contact names in unrelated speech; too-low fails to correct ambiguous names. This runtime technique requires no retraining, updates instantly when the user adds a contact, and reduces word error rate on proper nouns by 15-30%.

---

## Insight 5: Hierarchical NLU Scales to 100K+ Skills Without Flat Classification Collapse

**Category:** Partitioning
**One-liner:** A two-stage classifier -- domain classification (~50 classes, ~5ms) followed by domain-specific intent classification (20-50 intents per domain, loaded on-demand) -- makes intent routing tractable at ecosystem scale.

**Why it matters:** A voice assistant with 40K+ skills cannot use a flat classifier over 100K+ intents -- the softmax layer would be enormous, accuracy would degrade, and adding skills would require full retraining. The hierarchical approach uses a small, fast domain classifier (Music, Weather, SmartHome) followed by domain-specific models loaded on-demand. Benefits include independent domain updates (new music intents do not require weather model retraining), memory efficiency (load only active domain models), and fast execution (5ms domain + 50ms intent). Third-party developers can add skills to their domain without affecting the global classifier.

---

## Insight 6: LLM Routing Preserves Deterministic Paths for Safety-Critical Commands

**Category:** Resilience
**One-liner:** Commands like "set timer" and "turn off lights" always route through deterministic skill paths ($0, <500ms, 99% reliable), while only open-ended queries go to the LLM ($0.01, 1-5s, 90% reliable).

**Why it matters:** Routing ALL queries through an LLM at 10B daily queries would cost $100M/day and add 1-5 seconds of latency to commands currently executing in under 500ms. The routing engine checks intent confidence: above 0.90 for known deterministic intents routes to the traditional path. Below 0.70 or for open-ended queries routes to the LLM. A hybrid path handles cases where a structured skill is augmented by LLM conversation. This architecture lets assistants adopt LLM capabilities incrementally without sacrificing the reliability users depend on for daily routines like timers and alarms.

---

## Insight 7: The Six-Stage Pipeline Has a Hard 1-Second End-to-End Budget That Constrains Every Component

**Category:** Contention
**One-liner:** Wake word (<200ms) + ASR (<300ms) + NLU (<100ms) + dialogue management (<50ms) + NLG (<100ms) + TTS (<50ms TTFA) must collectively complete within 1 second, meaning each stage has a strict individual budget.

**Why it matters:** Conversational interaction feels natural only under 1 second. Each stage has a strict budget with no room for sequential delays. This forces architectural choices: ASR must be streaming (not batch), NLU must use distilled models (DistilBERT at 66M params instead of 110M), TTS must begin synthesizing before the full response is ready. The end-of-utterance detection pause (~800ms of silence) is the largest single contributor to perceived latency, driving research into predictive end-of-turn detection to reduce this wait.

---

## Insight 8: Multi-Device Wake Word Conflicts Require Room-Level Leader Election

**Category:** Consensus
**One-liner:** When multiple devices in the same room hear the same wake word, a leader election protocol based on audio quality or device priority ensures only one responds, preventing duplicate actions.

**Why it matters:** In households with multiple voice devices, all hear the same wake word simultaneously. Without coordination, all would activate, stream audio, and potentially execute the same command multiple times. Resolution uses audio-level signals: the device with the loudest/clearest signal wins, or a designated leader per room takes priority. The "I heard that on another device" response on losing devices indicates successful coordination. This is a distributed consensus problem solved at the edge with soft real-time constraints (~200ms decision window).

---

## Insight 9: Barge-In Detection Requires Coordinating Echo Cancellation, ASR, and TTS Simultaneously

**Category:** Streaming
**One-liner:** When a user interrupts the assistant mid-response, the system must detect speech onset, cancel TTS, suppress echo from its own output, and restart ASR with the new utterance -- a four-way coordination problem within 200ms.

**Why it matters:** Natural conversation involves frequent interruptions. Without barge-in support, users must wait for the assistant to finish speaking, creating unnatural interaction. Implementation requires acoustic echo cancellation (subtracting known TTS audio from microphone input), overlapping speech detection (distinguishing interruption from noise), and state management (abandoning current skill execution). False barge-in cuts off useful responses; missed barge-in forces waiting. This is one of the most latency-sensitive concurrent operations in the system.

---

## Insight 10: On-Device vs. Cloud Processing Is a Three-Way Tradeoff Between Privacy, Accuracy, and Latency

**Category:** Edge Computing
**One-liner:** On-device processing offers best privacy and lowest latency (<100ms) with smaller models, while cloud processing provides highest accuracy but requires network round-trips and audio transmission.

**Why it matters:** Apple Siri emphasizes on-device for privacy, running wake word, ASR, and some NLU locally. Google sends most audio to the cloud for maximum accuracy with large models. The hybrid approach places wake word on-device (always-on, privacy-preserving), runs first-pass ASR at the edge, and sends to the cloud for final transcription. Offline support requires on-device NLU and skill execution, limiting capability but ensuring availability. Each vendor's position on this triangle reflects brand values around privacy vs. capability.

---

## Insight 11: Streaming TTS With Filler Audio Masks LLM Latency in Conversational Mode

**Category:** Streaming
**One-liner:** Starting TTS before the full LLM response is ready, and using filler phrases ("Let me think...") to bridge the 1-5 second inference gap, preserves the illusion of real-time conversation.

**Why it matters:** LLM integration adds 1-5 seconds of latency violating the 1-second budget. Streaming TTS synthesizes the first sentence as soon as it is generated. If the LLM has not produced tokens yet, filler audio signals the request was received. This is a perceived-latency optimization: actual response time is unchanged, but the user perceives responsiveness from auditory feedback within 500ms. Without these techniques, LLM-integrated voice assistants feel unresponsive compared to traditional deterministic skills.

---

## Insight 12: Adversarial Audio Attacks Exploit the Gap Between Human and Machine Hearing

**Category:** Security
**One-liner:** Ultrasonic attacks (inaudible to humans), replay attacks (recorded wake words), and hidden voice commands (embedded in music) all exploit the fact that wake word models process frequency ranges differently than human ears.

**Why it matters:** The always-on microphone is the largest attack surface. Dolphin attacks modulate commands onto ultrasonic carriers above 20kHz that microphones capture but humans cannot hear. Replay attacks play recorded wake words. Mitigations span hardware (lowpass filter at 8kHz), model training (anti-trigger negative examples), and runtime analysis (liveness detection, environment fingerprinting). This is a cat-and-mouse arms race where each defense creates pressure for more sophisticated attacks.

---

## Insight 13: Offline Mode Requires CRDT-Based State Synchronization

**Category:** Consistency
**One-liner:** When a device operates offline and the user modifies preferences, CRDTs enable conflict-free merging when connectivity resumes, while last-write-wins handles simpler state like dialogue history.

**Why it matters:** Voice assistants must degrade gracefully without internet, supporting basic commands using on-device models. But offline modifications create distributed state problems: a user sets an alarm offline while also modifying alarms via the phone app. CRDTs ensure both changes merge automatically without conflicts when connectivity resumes. Simpler state uses last-write-wins because conflicts are less consequential. Without a synchronization strategy, offline-then-online transitions produce lost updates and inconsistent device state across the user's ecosystem.

---

## Insight 14: JointBERT Enables Simultaneous Intent and Slot Classification From a Single Encoder Pass

**Category:** Data Structures
**One-liner:** A shared BERT encoder produces both a pooled output for intent classification and per-token sequence outputs for BIO slot tagging, jointly optimized so that intent and slot predictions reinforce each other.

**Why it matters:** Intent classification and slot extraction are interdependent tasks: knowing the intent constrains which slots are valid, and slot values can disambiguate intent. Separate models lose this signal. JointBERT uses the [CLS] token's pooled output for intent classification and the full sequence output for BIO-tagged slot extraction, with a shared loss function that trains both heads together. This joint training improves both intent accuracy and slot F1 by 3-5% over separate models. The model processes "play jazz music on spotify" in a single ~50ms pass, extracting intent (PlayMusicIntent, 0.96 confidence) and slots ({genre: "jazz", app: "spotify"}) simultaneously.

---
