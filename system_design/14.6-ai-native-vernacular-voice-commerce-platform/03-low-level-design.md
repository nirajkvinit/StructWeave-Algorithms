# 14.6 AI-Native Vernacular Voice Commerce Platform — Low-Level Design

## Data Models

### Entity 1: Voice Session

```
VoiceSession {
    session_id:           UUID                    -- Primary key
    user_id:              UUID                    -- FK to UserProfile (nullable for anonymous callers)
    channel:              Enum[PHONE_INBOUND, PHONE_OUTBOUND, WHATSAPP, APP, IVR]
    caller_id:            String                  -- Phone number or WhatsApp ID
    session_type:         Enum[COMMERCE, SUPPORT, CAMPAIGN, NOTIFICATION]
    detected_language:     String                  -- ISO 639-1 code (e.g., "hi", "ta", "te")
    detected_dialect:     String                  -- Dialect identifier (e.g., "bhojpuri", "marwari")
    language_confidence:  Float                   -- Language detection confidence [0.0, 1.0]
    code_mixing_detected: Boolean                 -- Whether code-mixing was observed
    start_time:           Timestamp               -- Session start (call connected / first voice note)
    end_time:             Timestamp               -- Session end (call disconnected / last activity + timeout)
    duration_seconds:     Integer                 -- Total active duration
    turn_count:           Integer                 -- Number of conversational turns
    asr_model_used:       String                  -- ASR model identifier (e.g., "hi-commerce-v3.2")
    tts_voice_used:       String                  -- TTS voice identifier (e.g., "hi-f-bhojpuri-v2")
    outcome:              Enum[ORDER_PLACED, ORDER_MODIFIED, BROWSING_ONLY, SUPPORT_RESOLVED,
                               AGENT_HANDOFF, ABANDONED, CAMPAIGN_CONVERTED, CAMPAIGN_DECLINED]
    cart_value:           Decimal                 -- Final cart value at session end
    order_id:             UUID                    -- FK to Order (if order was placed)
    handoff_agent_id:     UUID                    -- FK to agent if escalated
    audio_storage_path:   String                  -- Object storage path for compressed audio
    audio_retention_ttl:  Timestamp               -- Auto-delete date for audio recording
    consent_recording:    Boolean                 -- Whether user consented to recording
    metadata:             JSONB                   -- Channel-specific metadata
    created_at:           Timestamp
    updated_at:           Timestamp

    Indexes:
        PRIMARY KEY (session_id)
        INDEX idx_user_sessions (user_id, start_time DESC)
        INDEX idx_channel_time (channel, start_time DESC)
        INDEX idx_outcome (outcome, start_time DESC)
        INDEX idx_language (detected_language, start_time DESC)
}
```

### Entity 2: Conversation Turn

```
ConversationTurn {
    turn_id:              UUID                    -- Primary key
    session_id:           UUID                    -- FK to VoiceSession
    turn_number:          Integer                 -- Sequential turn within session
    speaker:              Enum[USER, SYSTEM, AGENT]

    -- ASR output (for USER turns)
    audio_offset_ms:      Integer                 -- Start offset in session audio
    audio_duration_ms:    Integer                 -- Duration of this utterance
    asr_transcript:       Text                    -- Final ASR transcript
    asr_confidence:       Float                   -- Utterance-level confidence
    asr_alternatives:     JSONB                   -- N-best list [{transcript, confidence}]
    asr_word_details:     JSONB                   -- Per-word: [{word, confidence, start_ms, end_ms, language}]
    detected_language:    String                  -- Per-turn language detection

    -- NLU output
    intent:               String                  -- Detected intent (e.g., "add_to_cart")
    intent_confidence:    Float                   -- Intent detection confidence
    entities:             JSONB                   -- Extracted entities [{type, value, normalized, confidence}]
    slot_updates:         JSONB                   -- Slot changes from this turn [{slot, old_value, new_value}]

    -- System response (for SYSTEM turns)
    response_text:        Text                    -- Generated response text
    response_ssml:        Text                    -- SSML-formatted response
    response_type:        Enum[PROMPT, CONFIRM, INFORM, DISAMBIGUATE, CLARIFY, ERROR, HANDOFF]
    tts_duration_ms:      Integer                 -- Duration of synthesized audio

    -- Latency tracking
    asr_latency_ms:       Integer                 -- ASR processing time
    nlu_latency_ms:       Integer                 -- NLU processing time
    response_gen_ms:      Integer                 -- Response generation time
    tts_latency_ms:       Integer                 -- TTS synthesis time
    total_latency_ms:     Integer                 -- End-to-end latency for this turn

    created_at:           Timestamp

    Indexes:
        PRIMARY KEY (turn_id)
        INDEX idx_session_turns (session_id, turn_number)
        INDEX idx_intent (intent, created_at DESC)
        INDEX idx_low_confidence (asr_confidence, created_at DESC) WHERE asr_confidence < 0.6
}
```

### Entity 3: User Voice Profile

```
UserVoiceProfile {
    user_id:              UUID                    -- Primary key
    phone_number:         String                  -- Primary phone number (encrypted)
    whatsapp_id:          String                  -- WhatsApp identifier (encrypted)

    -- Language preferences
    primary_language:     String                  -- Most frequently detected language
    language_history:     JSONB                   -- [{language, frequency, last_used}]
    code_mixing_pattern:  JSONB                   -- Typical code-mixing languages (e.g., ["hi", "en"])
    preferred_tts_voice:  String                  -- Preferred TTS voice variant
    preferred_speed:      Enum[SLOW, NORMAL, FAST] -- Speech playback speed preference

    -- Commerce preferences
    default_address:      JSONB                   -- {line1, line2, city, state, pin, landmark}
    preferred_payment:    Enum[UPI, COD, WALLET]
    favorite_products:    JSONB                   -- [{product_id, frequency, last_ordered, vernacular_name}]
    order_history_summary: JSONB                  -- {total_orders, avg_value, top_categories}

    -- Interaction patterns
    avg_session_duration: Integer                 -- Average session length in seconds
    avg_turns_per_session: Integer                -- Average conversational turns
    preferred_call_times: JSONB                   -- [{day_of_week, hour_start, hour_end}]
    frustration_sensitivity: Float                -- ML-derived: how quickly user gets frustrated [0, 1]

    -- Voice characteristics (non-biometric, for UX optimization)
    estimated_age_group:  Enum[YOUNG, ADULT, SENIOR] -- For speed/complexity adaptation
    ambient_noise_typical: Enum[QUIET, MODERATE, NOISY] -- Typical call environment

    -- Consent and privacy
    recording_consent:    Boolean                 -- Persistent recording consent
    voice_data_consent:   Boolean                 -- Consent for voice data usage in training
    consent_timestamp:    Timestamp               -- When consent was last obtained
    do_not_call:          Boolean                 -- Opt-out of outbound campaigns

    created_at:           Timestamp
    updated_at:           Timestamp

    Indexes:
        PRIMARY KEY (user_id)
        UNIQUE INDEX idx_phone (phone_number)
        UNIQUE INDEX idx_whatsapp (whatsapp_id)
        INDEX idx_language (primary_language)
}
```

### Entity 4: Vernacular Product Synonym

```
VernacularProductSynonym {
    synonym_id:           UUID                    -- Primary key
    canonical_product_id: String                  -- FK to product catalog
    language:             String                  -- ISO 639-1 language code
    dialect:              String                  -- Dialect variant (nullable)

    -- Synonym text forms
    synonym_text:         String                  -- Vernacular name (in native script)
    synonym_romanized:    String                  -- Romanized form for phonetic matching
    synonym_phonetic:     String                  -- Phonetic encoding (Soundex/Metaphone variant)

    -- Matching metadata
    match_type:           Enum[EXACT, ALIAS, COLLOQUIAL, BRAND_VARIANT, ABBREVIATION, MISSPELLING]
    frequency:            Integer                 -- How often this synonym appears in voice interactions
    confidence:           Float                   -- Confidence that this synonym maps to the product [0, 1]
    source:               Enum[CURATED, MINED_VOICE, MINED_TEXT, USER_CORRECTION]

    -- Context
    region:               String                  -- Geographic region where synonym is common (nullable)
    category:             String                  -- Product category for disambiguation

    is_active:            Boolean                 -- Whether synonym is currently used in matching
    validated_by:         String                  -- Human validator ID (nullable)
    validated_at:         Timestamp
    created_at:           Timestamp
    updated_at:           Timestamp

    Indexes:
        PRIMARY KEY (synonym_id)
        INDEX idx_product_lang (canonical_product_id, language)
        INDEX idx_phonetic (synonym_phonetic, language)
        INDEX idx_romanized (synonym_romanized, language)
        FULLTEXT INDEX idx_text (synonym_text)
        INDEX idx_active (is_active, language, frequency DESC)
}
```

### Entity 5: ASR Model Registry

```
ASRModelRegistry {
    model_id:             String                  -- Model identifier (e.g., "hi-commerce-v3.2")
    model_version:        String                  -- Semantic version
    model_family:         Enum[LANGUAGE_SPECIFIC, MULTILINGUAL, CODE_MIXED, DOMAIN_ADAPTED]

    -- Language coverage
    primary_language:     String                  -- Primary language (null for multilingual)
    supported_languages:  JSONB                   -- [{language, wer_benchmark, training_hours}]

    -- Model specifications
    architecture:         String                  -- Model architecture (e.g., "conformer-transducer")
    parameter_count:      BigInteger              -- Number of parameters
    quantization:         Enum[FP32, FP16, INT8, INT4]
    vram_required_mb:     Integer                 -- GPU memory required

    -- Audio specifications
    sample_rate:          Integer                 -- Expected audio sample rate (8000 or 16000)
    channel_type:         Enum[NARROWBAND, WIDEBAND, BOTH]

    -- Performance benchmarks
    wer_benchmark:        JSONB                   -- {dataset: wer} for each benchmark dataset
    latency_p50_ms:       Integer                 -- Median inference latency per chunk
    latency_p99_ms:       Integer                 -- P99 inference latency per chunk
    rtf:                  Float                   -- Real-time factor (processing_time / audio_time)

    -- Deployment
    status:               Enum[TRAINING, VALIDATING, SHADOW, CANARY, ACTIVE, DEPRECATED]
    gpu_pool_assignment:  String                  -- Assigned GPU pool
    instance_count:       Integer                 -- Number of serving instances
    traffic_percentage:   Float                   -- Percentage of traffic for A/B testing

    -- Lineage
    training_data_hours:  Integer                 -- Total training data hours
    fine_tune_base:       String                  -- Base model for fine-tuning
    training_completed:   Timestamp
    deployed_at:          Timestamp

    Indexes:
        PRIMARY KEY (model_id, model_version)
        INDEX idx_language_active (primary_language, status)
        INDEX idx_status (status)
}
```

### Entity 6: Outbound Campaign

```
OutboundCampaign {
    campaign_id:          UUID                    -- Primary key
    campaign_name:        String                  -- Human-readable name
    campaign_type:        Enum[REORDER_REMINDER, PROMOTIONAL, DELIVERY_UPDATE,
                               PAYMENT_REMINDER, FEEDBACK_COLLECTION, REENGAGEMENT]

    -- Targeting
    target_audience:      JSONB                   -- Audience filter criteria
    target_count:         Integer                 -- Total users in target list
    language_distribution: JSONB                  -- [{language, count, percentage}]

    -- Script
    script_template:      Text                    -- Script template with variable placeholders
    personalization_fields: JSONB                 -- Fields to personalize per user
    max_turns:            Integer                 -- Maximum conversation turns per call
    success_intent:       String                  -- Intent that counts as conversion

    -- Scheduling
    start_date:           Date
    end_date:             Date
    calling_hours:        JSONB                   -- {start_hour, end_hour, timezone}
    max_attempts_per_user: Integer                -- Max call attempts per user
    retry_interval_hours: Integer                 -- Hours between retry attempts

    -- DND/compliance
    dnd_checked:          Boolean                 -- Whether DND registry was checked
    regulatory_approval:  String                  -- Approval reference number

    -- Results
    calls_attempted:      Integer
    calls_connected:      Integer
    calls_converted:      Integer
    avg_call_duration:    Integer                 -- Average call duration in seconds
    conversion_rate:      Float
    total_revenue:        Decimal                 -- Revenue from converted calls

    status:               Enum[DRAFT, SCHEDULED, RUNNING, PAUSED, COMPLETED, CANCELLED]
    created_at:           Timestamp
    updated_at:           Timestamp

    Indexes:
        PRIMARY KEY (campaign_id)
        INDEX idx_status_date (status, start_date)
        INDEX idx_type (campaign_type, status)
}
```

### Entity 7: Dialog State

```
DialogState {
    state_id:             UUID                    -- Primary key
    session_id:           UUID                    -- FK to VoiceSession

    -- Dialog tracking
    current_flow:         Enum[PRODUCT_SEARCH, CART_MANAGEMENT, ORDER_PLACEMENT,
                               PAYMENT, TRACKING, SUPPORT, OPEN_DIALOG]
    current_step:         String                  -- Step within flow (e.g., "confirm_items")

    -- Slot state
    slots:                JSONB                   -- {slot_name: {value, confidence, confirmed, source_turn}}
    required_slots:       JSONB                   -- Slots still needed for current flow

    -- Cart state
    cart_items:           JSONB                   -- [{product_id, name, quantity, unit, price, variant}]
    cart_total:           Decimal
    cart_item_count:      Integer

    -- Conversation memory
    unresolved_entities:  JSONB                   -- Entities mentioned but not yet matched
    disambiguation_state: JSONB                   -- {candidates: [], presented: boolean, awaiting_selection: boolean}
    last_system_action:   String                  -- For context on user response interpretation
    confirmation_pending: JSONB                   -- {field, value, awaiting_confirm: boolean}

    -- Session management
    idle_timeout_seconds: Integer                 -- Seconds until session auto-closes
    last_activity:        Timestamp

    version:              Integer                 -- Optimistic locking version
    created_at:           Timestamp
    updated_at:           Timestamp

    Indexes:
        PRIMARY KEY (state_id)
        UNIQUE INDEX idx_session (session_id)
        INDEX idx_flow (current_flow, updated_at DESC)
}
```

### Entity 8: Voice Quality Sample

```
VoiceQualitySample {
    sample_id:            UUID                    -- Primary key
    session_id:           UUID                    -- FK to VoiceSession
    turn_id:              UUID                    -- FK to ConversationTurn

    -- Sampling context
    sample_reason:        Enum[RANDOM, LOW_CONFIDENCE, USER_REPEATED, PRODUCT_MISMATCH,
                               AGENT_ESCALATION, NEW_LANGUAGE, QUALITY_ALERT]

    -- Audio reference
    audio_segment_path:   String                  -- Object storage path for audio segment
    audio_duration_ms:    Integer

    -- ASR evaluation
    asr_transcript:       Text                    -- ASR output
    human_transcript:     Text                    -- Human-corrected transcript (filled during review)
    word_error_rate:      Float                   -- Computed WER after human review
    error_analysis:       JSONB                   -- [{word, error_type: [substitution|insertion|deletion], context}]

    -- NLU evaluation
    asr_intent:           String                  -- Intent from ASR transcript
    human_intent:         String                  -- Correct intent from human review
    intent_correct:       Boolean
    entity_precision:     Float                   -- Entity extraction precision after review
    entity_recall:        Float                   -- Entity extraction recall after review

    -- Review status
    reviewer_id:          String
    review_status:        Enum[PENDING, IN_REVIEW, REVIEWED, DISPUTED]
    review_notes:         Text
    reviewed_at:          Timestamp

    -- Metadata
    language:             String
    channel:              String
    asr_model:            String

    created_at:           Timestamp

    Indexes:
        PRIMARY KEY (sample_id)
        INDEX idx_review_status (review_status, created_at DESC)
        INDEX idx_language_model (language, asr_model, review_status)
        INDEX idx_reason (sample_reason, created_at DESC)
}
```

### Entity 9: Call Record

```
CallRecord {
    call_id:              UUID                    -- Primary key
    session_id:           UUID                    -- FK to VoiceSession
    direction:            Enum[INBOUND, OUTBOUND]

    -- Telephony details
    caller_number:        String                  -- Encrypted phone number
    called_number:        String                  -- Platform number called / number dialed
    sip_call_id:          String                  -- SIP protocol Call-ID header
    trunk_id:             String                  -- SIP trunk used

    -- Call lifecycle
    call_initiated_at:    Timestamp               -- Call placed/received
    call_ringing_at:      Timestamp               -- Ring start
    call_answered_at:     Timestamp               -- Call connected
    call_ended_at:        Timestamp               -- Call disconnected
    ring_duration_ms:     Integer                 -- Time from ring to answer
    talk_duration_ms:     Integer                 -- Active conversation time

    -- Call quality
    codec:                String                  -- Audio codec used (G.711, Opus)
    sample_rate:          Integer                 -- Audio sample rate
    avg_mos:              Float                   -- Mean Opinion Score for call quality
    packet_loss_pct:      Float                   -- Packet loss percentage
    jitter_ms:            Float                   -- Average jitter

    -- Disposition
    disposition:          Enum[COMPLETED, ABANDONED, NO_ANSWER, BUSY, FAILED,
                               VOICEMAIL, TRANSFERRED]
    hangup_party:         Enum[CALLER, SYSTEM, AGENT, TIMEOUT]
    transfer_to:          String                  -- Agent ID or queue name if transferred

    -- Campaign (for outbound)
    campaign_id:          UUID                    -- FK to OutboundCampaign (nullable)
    attempt_number:       Integer                 -- Attempt number for this user in campaign

    -- Compliance
    dnd_checked:          Boolean                 -- DND registry verified before call
    consent_obtained:     Boolean                 -- Recording consent obtained
    regulatory_compliant: Boolean                 -- All regulations met

    created_at:           Timestamp

    Indexes:
        PRIMARY KEY (call_id)
        INDEX idx_session (session_id)
        INDEX idx_caller (caller_number, call_initiated_at DESC)
        INDEX idx_campaign (campaign_id, disposition)
        INDEX idx_direction_time (direction, call_initiated_at DESC)
}
```

### Entity 10: Product Resolution Log

```
ProductResolutionLog {
    resolution_id:        UUID                    -- Primary key
    session_id:           UUID                    -- FK to VoiceSession
    turn_id:              UUID                    -- FK to ConversationTurn

    -- Input
    spoken_text:          String                  -- Original ASR transcript segment
    extracted_entity:     String                  -- Entity extractor output
    normalized_name:      String                  -- After vernacular normalization
    language:             String                  -- Language of the utterance

    -- Resolution pipeline
    synonym_matches:      JSONB                   -- [{synonym_id, product_id, score, match_type}]
    phonetic_matches:     JSONB                   -- [{product_id, phonetic_score}]
    semantic_matches:     JSONB                   -- [{product_id, semantic_score}]

    -- Result
    candidate_count:      Integer                 -- Number of candidates before disambiguation
    disambiguation_used:  Boolean                 -- Whether disambiguation dialog was needed
    final_product_id:     String                  -- Selected product (nullable if unresolved)
    resolution_method:    Enum[EXACT_SYNONYM, PHONETIC, SEMANTIC, DISAMBIGUATION,
                               HISTORY_MATCH, UNRESOLVED]
    confidence:           Float                   -- Final resolution confidence

    -- Feedback
    user_confirmed:       Boolean                 -- Did user confirm the selection?
    user_corrected:       Boolean                 -- Did user correct the selection?
    correct_product_id:   String                  -- Correct product (if user corrected)

    -- Performance
    resolution_latency_ms: Integer                -- Total resolution time

    created_at:           Timestamp

    Indexes:
        PRIMARY KEY (resolution_id)
        INDEX idx_session (session_id)
        INDEX idx_unresolved (resolution_method, created_at DESC) WHERE resolution_method = 'UNRESOLVED'
        INDEX idx_corrections (user_corrected, created_at DESC) WHERE user_corrected = true
        INDEX idx_language (language, resolution_method)
}
```

---

## API Contracts

### API 1: Initiate Voice Session

```
POST /api/v1/voice/sessions

Purpose: Create a new voice session for an incoming call or WhatsApp voice interaction

Request:
{
    "channel": "PHONE_INBOUND",                    // PHONE_INBOUND | PHONE_OUTBOUND | WHATSAPP | APP | IVR
    "caller_id": "+919876543210",                  // Phone number or WhatsApp ID
    "called_number": "+911800XXXXXX",              // Platform number (for phone calls)
    "audio_config": {
        "sample_rate": 8000,                       // 8000 (narrowband) or 16000 (wideband)
        "codec": "PCMU",                           // PCMU | PCMA | OPUS
        "channels": 1                              // Mono
    },
    "session_config": {
        "language_hint": "hi",                     // Optional: expected language
        "session_type": "COMMERCE",                // COMMERCE | SUPPORT | CAMPAIGN
        "campaign_id": null,                       // For outbound campaigns
        "timeout_seconds": 300                     // Session inactivity timeout
    },
    "metadata": {
        "sip_call_id": "abc123@trunk1",
        "trunk_id": "trunk-west-01"
    }
}

Response (201 Created):
{
    "session_id": "uuid-session-001",
    "stream_endpoint": "wss://voice.platform.com/stream/uuid-session-001",
    "user_profile": {                              // If caller recognized
        "user_id": "uuid-user-001",
        "name": "Ramesh Kumar",
        "primary_language": "hi",
        "preferred_voice": "hi-f-bhojpuri-v2"
    },
    "initial_prompt": {
        "text": "Namaste Ramesh ji! Aaj kya mangwana hai?",
        "ssml": "<speak>Namaste Ramesh ji! <break time='300ms'/> Aaj kya mangwana hai?</speak>",
        "audio_url": "https://audio.platform.com/cache/greeting-hi-ramesh.opus"
    },
    "asr_config": {
        "model": "hi-commerce-v3.2",
        "language": "hi",
        "domain": "commerce"
    }
}

Error Codes:
    400 — Invalid audio configuration
    429 — Capacity limit reached (too many concurrent calls)
    503 — Voice service temporarily unavailable
```

### API 2: Stream Audio for Recognition

```
WebSocket: wss://voice.platform.com/stream/{session_id}

Purpose: Bidirectional audio streaming for real-time ASR and TTS

Client → Server (Audio Input):
{
    "type": "audio",
    "data": "<base64-encoded-audio-chunk>",        // 200ms audio chunk
    "sequence": 1234,                               // Monotonic sequence number
    "timestamp_ms": 15000                           // Offset from session start
}

Client → Server (Control):
{
    "type": "control",
    "action": "end_of_utterance"                    // Manual end-of-utterance signal
}
// OR
{
    "type": "dtmf",
    "digit": "5"                                    // DTMF digit detected
}

Server → Client (Partial ASR):
{
    "type": "asr_partial",
    "transcript": "do kilo basmati",
    "language": "hi",
    "confidence": 0.78,
    "is_final": false,
    "timestamp_ms": 15200
}

Server → Client (Final ASR):
{
    "type": "asr_final",
    "transcript": "do kilo basmati chawal aur ek litre Amul doodh dena",
    "language": "hi",
    "confidence": 0.91,
    "is_final": true,
    "word_details": [
        {"word": "do", "confidence": 0.95, "start_ms": 15000, "end_ms": 15200, "language": "hi"},
        {"word": "kilo", "confidence": 0.98, "start_ms": 15200, "end_ms": 15500, "language": "hi"},
        {"word": "basmati", "confidence": 0.87, "start_ms": 15500, "end_ms": 15900, "language": "hi"},
        {"word": "chawal", "confidence": 0.93, "start_ms": 15900, "end_ms": 16200, "language": "hi"}
    ],
    "alternatives": [
        {"transcript": "do kilo basmati chaval aur ek litre Amul doodh dena", "confidence": 0.85}
    ]
}

Server → Client (TTS Audio):
{
    "type": "tts_audio",
    "data": "<base64-encoded-audio-chunk>",        // 100ms synthesized audio
    "sequence": 5678,
    "text_segment": "Aapke liye Brand X basmati chawal",
    "is_final": false
}

Server → Client (System Event):
{
    "type": "event",
    "event": "intent_detected",
    "data": {
        "intent": "add_to_cart",
        "confidence": 0.94,
        "entities": [
            {"type": "product", "value": "basmati chawal", "normalized": "basmati-rice-5kg", "confidence": 0.89},
            {"type": "quantity", "value": "2", "unit": "kg", "confidence": 0.96}
        ]
    }
}
```

### API 3: Process WhatsApp Voice Note

```
POST /api/v1/voice/whatsapp/process

Purpose: Process an incoming WhatsApp voice note and generate a response

Request:
{
    "message_id": "wamid.ABCdef123",
    "from": "+919876543210",
    "voice_note": {
        "media_url": "https://wa-media.example.com/voice/abc123.opus",
        "duration_seconds": 15,
        "mime_type": "audio/ogg; codecs=opus"
    },
    "conversation_context": {
        "session_id": "uuid-session-002",          // Existing session (nullable for new)
        "previous_messages": 3                     // Count of prior messages in conversation
    }
}

Response (200 OK):
{
    "session_id": "uuid-session-002",
    "asr_result": {
        "transcript": "Kal wala order phir se kar do bhaiya",
        "language": "hi",
        "confidence": 0.88
    },
    "nlu_result": {
        "intent": "reorder_previous",
        "entities": [
            {"type": "time_reference", "value": "kal", "resolved": "2026-03-09"}
        ]
    },
    "response": {
        "type": "VOICE_AND_TEXT",
        "voice_note_url": "https://platform.com/tts/response-uuid.opus",
        "voice_duration_seconds": 8,
        "text": "Aapka kal ka order: 2kg basmati chawal ₹180 + 1L Amul doodh ₹68 = ₹248. Phir se order karein?",
        "interactive": {
            "type": "button",
            "buttons": [
                {"id": "confirm_reorder", "title": "Haan, order karo"},
                {"id": "modify_order", "title": "Badlav karna hai"},
                {"id": "cancel", "title": "Nahi chahiye"}
            ]
        }
    },
    "processing_time_ms": 2800
}
```

### API 4: Product Voice Search

```
POST /api/v1/voice/product/resolve

Purpose: Resolve a spoken product reference to catalog entries

Request:
{
    "session_id": "uuid-session-001",
    "spoken_text": "woh lal wala kapda jo pichli baar liya tha",
    "language": "hi",
    "asr_confidence": 0.82,
    "context": {
        "user_id": "uuid-user-001",
        "recent_products": ["prod-red-saree-001", "prod-red-tshirt-005"],
        "current_category": null,
        "dialog_context": "user browsing clothing"
    }
}

Response (200 OK):
{
    "resolution_id": "uuid-resolution-001",
    "candidates": [
        {
            "product_id": "prod-red-saree-001",
            "name": "Red Silk Saree",
            "vernacular_name": "लाल रेशम साड़ी",
            "price": 1299.00,
            "match_score": 0.92,
            "match_reason": "purchase_history + color_match",
            "in_stock": true
        },
        {
            "product_id": "prod-red-tshirt-005",
            "name": "Red Cotton T-Shirt",
            "vernacular_name": "लाल कॉटन टी-शर्ट",
            "price": 399.00,
            "match_score": 0.71,
            "match_reason": "purchase_history + color_match",
            "in_stock": true
        }
    ],
    "disambiguation_needed": true,
    "suggested_prompt": "Aapko lal saree chahiye ya lal T-shirt? Saree ₹1299, T-shirt ₹399.",
    "resolution_method": "HISTORY_MATCH",
    "latency_ms": 180
}
```

### API 5: Cart Management (Voice-Optimized)

```
POST /api/v1/voice/cart/update

Purpose: Add, remove, or modify items in the voice session cart

Request:
{
    "session_id": "uuid-session-001",
    "action": "ADD",                                // ADD | REMOVE | MODIFY_QUANTITY | CLEAR
    "items": [
        {
            "product_id": "prod-basmati-2kg-001",
            "quantity": 1,
            "variant": null
        },
        {
            "product_id": "prod-amul-milk-1l-001",
            "quantity": 1,
            "variant": null
        }
    ]
}

Response (200 OK):
{
    "cart_id": "cart-uuid-001",
    "items": [
        {
            "product_id": "prod-basmati-2kg-001",
            "name": "Basmati Rice 2kg",
            "vernacular_name": "बासमती चावल 2 किलो",
            "quantity": 1,
            "unit_price": 180.00,
            "total_price": 180.00,
            "in_stock": true
        },
        {
            "product_id": "prod-amul-milk-1l-001",
            "name": "Amul Toned Milk 1L",
            "vernacular_name": "अमूल टोंड दूध 1 लीटर",
            "quantity": 1,
            "unit_price": 68.00,
            "total_price": 68.00,
            "in_stock": true
        }
    ],
    "cart_summary": {
        "item_count": 2,
        "subtotal": 248.00,
        "delivery_charge": 0.00,
        "discount": 0.00,
        "total": 248.00
    },
    "voice_summary": "Cart mein 2 items hain: basmati chawal 2 kilo 180 rupaye, Amul doodh 1 litre 68 rupaye. Total 248 rupaye.",
    "voice_summary_ssml": "<speak>Cart mein <say-as interpret-as='cardinal'>2</say-as> items hain: <break time='200ms'/> basmati chawal <say-as interpret-as='cardinal'>2</say-as> kilo <say-as interpret-as='currency' language='hi-IN'>₹180</say-as>, <break time='200ms'/> Amul doodh <say-as interpret-as='cardinal'>1</say-as> litre <say-as interpret-as='currency' language='hi-IN'>₹68</say-as>. <break time='300ms'/> Total <say-as interpret-as='currency' language='hi-IN'>₹248</say-as>.</speak>"
}
```

### API 6: Initiate Voice Payment

```
POST /api/v1/voice/payment/initiate

Purpose: Start payment flow within a voice session

Request:
{
    "session_id": "uuid-session-001",
    "order_id": "order-uuid-001",
    "amount": 248.00,
    "currency": "INR",
    "payment_method": "UPI",                       // UPI | COD | WALLET
    "user_id": "uuid-user-001",
    "upi_config": {
        "vpa": "user@upi"                         // User's UPI VPA (if known)
    }
}

Response (200 OK):
{
    "payment_id": "pay-uuid-001",
    "status": "INITIATED",
    "payment_method": "UPI",
    "upi_collect": {
        "transaction_id": "txn-uuid-001",
        "collect_sent_to": "user@upi",
        "expires_at": "2026-03-10T15:05:00Z"
    },
    "voice_prompt": "UPI request bhej diya hai ₹248 ka. Apne phone pe UPI app mein approve kar dijiye. Main wait karta hoon.",
    "voice_prompt_ssml": "<speak>UPI request bhej diya hai <say-as interpret-as='currency' language='hi-IN'>₹248</say-as> ka. <break time='300ms'/> Apne phone pe UPI app mein approve kar dijiye. <break time='500ms'/> Main wait karta hoon.</speak>",
    "timeout_seconds": 120,
    "status_poll_endpoint": "/api/v1/voice/payment/pay-uuid-001/status"
}
```

### API 7: Campaign Management

```
POST /api/v1/voice/campaigns

Purpose: Create and schedule an outbound voice campaign

Request:
{
    "campaign_name": "Weekly Reorder Reminder - March W2",
    "campaign_type": "REORDER_REMINDER",
    "target_audience": {
        "filters": [
            {"field": "last_order_date", "op": "between", "value": ["2026-03-01", "2026-03-07"]},
            {"field": "order_count", "op": "gte", "value": 3},
            {"field": "do_not_call", "op": "eq", "value": false}
        ]
    },
    "script_template": {
        "greeting": "Namaste {{user_name}} ji!",
        "pitch": "Aapne {{days_since_order}} din pehle {{last_order_summary}} order kiya tha. Kya phir se mangwana hai?",
        "success_action": "reorder_previous",
        "max_turns": 5,
        "language_field": "primary_language"
    },
    "schedule": {
        "start_date": "2026-03-11",
        "end_date": "2026-03-13",
        "calling_hours": {"start": "10:00", "end": "19:00", "timezone": "Asia/Kolkata"},
        "max_attempts_per_user": 2,
        "retry_interval_hours": 24
    },
    "concurrency": {
        "max_concurrent_calls": 500,
        "calls_per_second": 10
    }
}

Response (201 Created):
{
    "campaign_id": "camp-uuid-001",
    "status": "SCHEDULED",
    "target_count": 15420,
    "language_distribution": [
        {"language": "hi", "count": 8540, "percentage": 55.4},
        {"language": "ta", "count": 2310, "percentage": 15.0},
        {"language": "te", "count": 1850, "percentage": 12.0},
        {"language": "bn", "count": 1200, "percentage": 7.8},
        {"language": "other", "count": 1520, "percentage": 9.8}
    ],
    "estimated_duration_hours": 12.5,
    "estimated_cost": 18500.00,
    "dnd_filtered": 2180
}
```

### API 8: Human Agent Handoff

```
POST /api/v1/voice/sessions/{session_id}/handoff

Purpose: Transfer voice session to a human agent with full context

Request:
{
    "session_id": "uuid-session-001",
    "reason": "REPEATED_ASR_FAILURE",              // REPEATED_ASR_FAILURE | USER_REQUEST |
                                                    // COMPLEX_COMPLAINT | PAYMENT_ISSUE | FRUSTRATION_DETECTED
    "urgency": "NORMAL",                           // LOW | NORMAL | HIGH
    "preferred_language": "hi",
    "context_summary": {
        "auto_generated": true,                    // System generates summary from dialog
        "intent": "order_complaint",
        "cart_state": {
            "items": [],
            "total": 0
        },
        "issue_description": "User reporting wrong item delivered for order #4521",
        "turns_before_handoff": 8,
        "user_sentiment": "frustrated"
    }
}

Response (200 OK):
{
    "handoff_id": "handoff-uuid-001",
    "status": "QUEUED",
    "queue_position": 3,
    "estimated_wait_seconds": 45,
    "assigned_agent": null,                        // Populated when agent accepts
    "voice_prompt": "Main aapko hamari team se connect kar raha hoon. Thoda sa intezaar kariye. Aapki puri baat unhe bata di jayegi.",
    "hold_music_url": "https://audio.platform.com/hold/instrumental-01.opus",
    "transcript_shared": true,                     // Transcript shared with agent
    "live_asr_enabled": true                       // Agent sees real-time transcription
}
```

---

## Core Algorithms

### Algorithm 1: Streaming Language Detection and ASR Routing

```
ALGORITHM StreamingLanguageDetectionAndRouting

INPUT:
    audio_stream: continuous audio chunks (200ms each)
    session: VoiceSession with language_hint (optional)
    model_pool: available ASR models with language coverage

STATE:
    language_priors: probability distribution over supported languages
    audio_buffer: rolling buffer of last 3 seconds of audio
    current_model: currently active ASR model
    confidence_history: list of per-utterance language confidences
    utterance_count: number of utterances processed

INITIALIZE:
    IF session.language_hint IS NOT NULL:
        language_priors[session.language_hint] = 0.6
        distribute remaining 0.4 across other languages
    ELSE IF session.caller_id IS RECOGNIZED:
        user_profile = LOOKUP_USER(session.caller_id)
        language_priors = user_profile.language_history  // weighted by frequency
    ELSE:
        language_priors = UNIFORM(supported_languages)

    current_model = SELECT_MULTILINGUAL_MODEL(model_pool)  // start with multilingual
    audio_buffer = EMPTY_RING_BUFFER(capacity=3_seconds)

FOR EACH audio_chunk IN audio_stream:
    audio_buffer.APPEND(audio_chunk)

    // --- Phase 1: Initial Language Detection (first 3 seconds) ---
    IF utterance_count == 0 AND audio_buffer.duration >= 2_seconds:
        acoustic_features = EXTRACT_LANGUAGE_FEATURES(audio_buffer)
        // Language ID model produces per-language posterior
        language_posterior = LANGUAGE_ID_MODEL(acoustic_features)

        // Bayesian update: posterior ∝ likelihood × prior
        FOR EACH lang IN supported_languages:
            language_priors[lang] = language_posterior[lang] * language_priors[lang]
        NORMALIZE(language_priors)

        top_language = ARGMAX(language_priors)
        top_confidence = language_priors[top_language]

        IF top_confidence >= 0.80:
            // High confidence: route to language-specific model
            best_model = SELECT_LANGUAGE_MODEL(model_pool, top_language, session.audio_config)
            IF best_model IS NOT NULL AND best_model != current_model:
                current_model = best_model
                // Re-process buffered audio with new model
                REPROCESS_BUFFER(current_model, audio_buffer)
        ELSE IF top_confidence >= 0.50:
            // Medium confidence: use multilingual model with language bias
            current_model.SET_LANGUAGE_BIAS(top_language, bias_weight=0.3)
        // ELSE: continue with unbiased multilingual model

    // --- Phase 2: Continuous Code-Switching Detection ---
    IF utterance_count > 0:
        // Per-chunk language classification (lightweight)
        chunk_language = FAST_LANGUAGE_CLASSIFY(audio_chunk)

        IF chunk_language != current_model.primary_language:
            code_switch_score = COMPUTE_SWITCH_LIKELIHOOD(
                chunk_language,
                current_model.primary_language,
                confidence_history
            )

            IF code_switch_score > 0.7:
                // Definite code-switch detected
                IF current_model.supports_language(chunk_language):
                    // Multilingual model handles it
                    LOG_CODE_SWITCH(session, chunk_language)
                ELSE:
                    // Need to switch models
                    new_model = SELECT_MULTILINGUAL_MODEL(model_pool)
                    HANDOFF_ASR_CONTEXT(current_model, new_model, audio_buffer)
                    current_model = new_model

    // --- Phase 3: Forward to Active ASR Model ---
    asr_result = current_model.PROCESS_CHUNK(audio_chunk)

    IF asr_result.is_end_of_utterance:
        utterance_count += 1
        confidence_history.APPEND({
            language: asr_result.detected_language,
            confidence: asr_result.language_confidence,
            utterance: utterance_count
        })

        // Update language priors with ASR evidence
        language_priors[asr_result.detected_language] *= 1.2
        NORMALIZE(language_priors)

    YIELD asr_result

FUNCTION SELECT_LANGUAGE_MODEL(model_pool, language, audio_config):
    // Prefer language-specific model for the channel type
    channel_type = IF audio_config.sample_rate <= 8000 THEN NARROWBAND ELSE WIDEBAND

    candidates = model_pool.FILTER(
        primary_language == language AND
        channel_type == channel_type AND
        status == ACTIVE
    )

    IF candidates IS EMPTY:
        // Fall back to multilingual model
        RETURN SELECT_MULTILINGUAL_MODEL(model_pool)

    // Prefer lowest latency model with acceptable WER
    RETURN candidates.SORT_BY(latency_p99_ms ASC).FIRST()
```

### Algorithm 2: Vernacular Product Name Resolution

```
ALGORITHM VernacularProductResolution

INPUT:
    spoken_text: ASR transcript of product reference
    language: detected language
    asr_confidence: overall ASR confidence
    user_context: {user_id, recent_products, current_category, dialog_history}
    synonym_db: VernacularProductSynonym database
    product_catalog: product search index

OUTPUT:
    candidates: ranked list of product matches with scores
    disambiguation_needed: boolean
    suggested_prompt: disambiguation question (if needed)

CONSTANTS:
    EXACT_THRESHOLD = 0.90      // Score above which we auto-select
    DISAMBIG_THRESHOLD = 0.60   // Score below which we ask for clarification
    MAX_CANDIDATES = 5          // Maximum candidates to consider
    HISTORY_BOOST = 0.15        // Score boost for previously purchased products

PROCEDURE:
    candidates = []

    // --- Stage 1: Entity Extraction ---
    entities = EXTRACT_COMMERCE_ENTITIES(spoken_text, language)
    // entities = [{type: "product", value: "basmati chawal", span: [2,4]},
    //             {type: "quantity", value: "2", unit: "kg"},
    //             {type: "brand", value: null},
    //             {type: "variant", value: null}]

    product_mention = entities.FIND(type == "product")
    IF product_mention IS NULL:
        // Check for anaphoric reference ("wahi wala", "same one")
        IF DETECT_ANAPHORA(spoken_text, language):
            resolved = RESOLVE_ANAPHORA(spoken_text, user_context.dialog_history)
            IF resolved IS NOT NULL:
                RETURN {candidates: [resolved], disambiguation_needed: false}
        RETURN {candidates: [], disambiguation_needed: false}  // No product reference found

    product_text = product_mention.value

    // --- Stage 2: Exact Synonym Lookup ---
    exact_matches = synonym_db.QUERY(
        synonym_text == product_text AND
        language == language AND
        is_active == true
    )

    FOR EACH match IN exact_matches:
        product = product_catalog.GET(match.canonical_product_id)
        IF product IS NOT NULL AND product.in_stock:
            candidates.APPEND({
                product_id: match.canonical_product_id,
                product: product,
                score: match.confidence * 0.95,  // Slight discount from 1.0
                match_method: "EXACT_SYNONYM",
                synonym_used: match.synonym_text
            })

    // --- Stage 3: Phonetic Matching (handles ASR errors) ---
    IF candidates.LENGTH < MAX_CANDIDATES:
        phonetic_code = COMPUTE_INDIC_PHONETIC(product_text, language)
        // Custom phonetic encoding for Indic languages (handles aspirated consonants,
        // retroflex/dental confusion, schwa deletion)

        phonetic_matches = synonym_db.QUERY(
            synonym_phonetic SIMILAR_TO phonetic_code AND
            language IN (language, "mul") AND     // "mul" for multilingual entries
            is_active == true
        ).LIMIT(MAX_CANDIDATES * 2)

        FOR EACH match IN phonetic_matches:
            IF match.canonical_product_id NOT IN candidates.product_ids:
                phonetic_score = PHONETIC_SIMILARITY(phonetic_code, match.synonym_phonetic)
                IF phonetic_score > 0.5:
                    product = product_catalog.GET(match.canonical_product_id)
                    IF product IS NOT NULL AND product.in_stock:
                        candidates.APPEND({
                            product_id: match.canonical_product_id,
                            product: product,
                            score: phonetic_score * 0.85,
                            match_method: "PHONETIC",
                            synonym_used: match.synonym_text
                        })

    // --- Stage 4: Semantic Matching (handles paraphrases) ---
    IF candidates.LENGTH < 3:
        // Embed the product mention in multilingual semantic space
        query_embedding = MULTILINGUAL_ENCODER(product_text, language)

        semantic_results = product_catalog.VECTOR_SEARCH(
            query_embedding,
            top_k=MAX_CANDIDATES,
            filter={in_stock: true, category: user_context.current_category}
        )

        FOR EACH result IN semantic_results:
            IF result.product_id NOT IN candidates.product_ids:
                candidates.APPEND({
                    product_id: result.product_id,
                    product: result.product,
                    score: result.similarity * 0.75,  // Lower weight for semantic
                    match_method: "SEMANTIC"
                })

    // --- Stage 5: Purchase History Boost ---
    FOR EACH candidate IN candidates:
        IF candidate.product_id IN user_context.recent_products:
            candidate.score += HISTORY_BOOST
            candidate.match_method += "+HISTORY"

    // --- Stage 6: Brand and Variant Filtering ---
    brand_entity = entities.FIND(type == "brand")
    variant_entity = entities.FIND(type == "variant")

    IF brand_entity IS NOT NULL:
        candidates = candidates.FILTER(
            product.brand FUZZY_MATCHES brand_entity.value
        )

    IF variant_entity IS NOT NULL:
        candidates = candidates.BOOST(
            product.variants CONTAINS variant_entity.value,
            boost=0.1
        )

    // --- Stage 7: Ranking and Decision ---
    candidates.SORT_BY(score DESC)
    candidates = candidates.LIMIT(MAX_CANDIDATES)

    top_score = candidates[0].score IF candidates.LENGTH > 0 ELSE 0
    second_score = candidates[1].score IF candidates.LENGTH > 1 ELSE 0

    IF top_score >= EXACT_THRESHOLD AND (top_score - second_score) > 0.15:
        // Clear winner — auto-select with confirmation
        RETURN {
            candidates: [candidates[0]],
            disambiguation_needed: false,
            suggested_prompt: GENERATE_CONFIRMATION(candidates[0], language)
        }
    ELSE IF top_score >= DISAMBIG_THRESHOLD AND candidates.LENGTH >= 2:
        // Multiple viable candidates — ask user to choose
        top_candidates = candidates[0:3]  // Present top 3
        RETURN {
            candidates: top_candidates,
            disambiguation_needed: true,
            suggested_prompt: GENERATE_DISAMBIGUATION_QUESTION(top_candidates, language)
        }
    ELSE:
        // No good match — ask for clarification
        RETURN {
            candidates: candidates,
            disambiguation_needed: true,
            suggested_prompt: GENERATE_CLARIFICATION_QUESTION(product_text, language)
        }

FUNCTION GENERATE_DISAMBIGUATION_QUESTION(candidates, language):
    // Generate a spoken disambiguation prompt
    // e.g., "Aapko basmati chawal chahiye ya sona masoori? Basmati 180 rupaye, sona masoori 120 rupaye."
    prompt_parts = []
    FOR i, candidate IN ENUMERATE(candidates):
        part = LOCALIZE("{name} {price} rupaye", language,
                        name=candidate.product.vernacular_name[language],
                        price=candidate.product.price)
        prompt_parts.APPEND(part)

    RETURN LOCALIZE("Aapko {option1} chahiye ya {option2}?", language,
                    option1=prompt_parts[0], option2=prompt_parts[1])
```

### Algorithm 3: Code-Mixed Speech Processing

```
ALGORITHM CodeMixedSpeechProcessing

INPUT:
    transcript: ASR output (possibly code-mixed)
    word_details: per-word language tags and confidence
    session_language: primary session language

OUTPUT:
    normalized_intent: language-agnostic intent representation
    entities: extracted entities with language normalization

PROCEDURE:
    // --- Step 1: Word-Level Language Tagging ---
    // ASR may not provide reliable per-word language tags
    // Use a dedicated code-mixing tagger

    words = TOKENIZE(transcript)
    language_tags = []

    FOR EACH word IN words:
        IF word IN LANGUAGE_SPECIFIC_LEXICON("en"):
            lang = "en"
        ELSE IF word IN LANGUAGE_SPECIFIC_LEXICON(session_language):
            lang = session_language
        ELSE:
            // Use character script detection for Devanagari, Tamil, etc.
            script = DETECT_SCRIPT(word)
            IF script IS NOT NULL:
                lang = SCRIPT_TO_LANGUAGE(script)
            ELSE:
                // Romanized text — use context-based LID
                lang = CONTEXTUAL_LANGUAGE_ID(word, words, session_language)

        language_tags.APPEND(lang)

    // --- Step 2: Language-Aware Normalization ---
    // Normalize mixed-language transcript to a canonical semantic form

    normalized_words = []
    FOR i, word IN ENUMERATE(words):
        lang = language_tags[i]

        // Handle English words in non-English context
        IF lang == "en" AND session_language != "en":
            // Keep English words for brand names, tech terms
            IF IS_BRAND_NAME(word) OR IS_TECHNICAL_TERM(word):
                normalized_words.APPEND(word)
            ELSE:
                // Translate common English words to session language semantic space
                // "available" → semantic:AVAILABILITY_QUERY
                semantic = ENGLISH_TO_SEMANTIC(word)
                normalized_words.APPEND(semantic IF semantic ELSE word)

        // Handle session-language words
        ELSE IF lang == session_language:
            // Normalize dialectal variants to standard form
            standard = DIALECT_NORMALIZE(word, session_language)
            normalized_words.APPEND(standard IF standard ELSE word)

        // Handle third language words
        ELSE:
            // Attempt cross-lingual mapping
            mapping = CROSS_LINGUAL_MAP(word, lang, session_language)
            normalized_words.APPEND(mapping IF mapping ELSE word)

    normalized_transcript = JOIN(normalized_words, " ")

    // --- Step 3: Intent Classification on Normalized Transcript ---
    // Use a multilingual intent model that operates on the normalized form

    intent_features = {
        "normalized_text": normalized_transcript,
        "original_text": transcript,
        "language_distribution": COMPUTE_LANGUAGE_DISTRIBUTION(language_tags),
        "session_language": session_language,
        "code_mix_ratio": COUNT(tag != session_language FOR tag IN language_tags) / LENGTH(language_tags)
    }

    intent_result = MULTILINGUAL_INTENT_MODEL(intent_features)

    // --- Step 4: Cross-Lingual Entity Extraction ---
    entities = []

    // Run entity extraction on both original and normalized transcripts
    entities_original = ENTITY_EXTRACTOR(transcript, language_tags)
    entities_normalized = ENTITY_EXTRACTOR(normalized_transcript, [session_language] * LENGTH(normalized_words))

    // Merge entities, preferring higher confidence
    merged = MERGE_ENTITY_LISTS(entities_original, entities_normalized)

    FOR EACH entity IN merged:
        // Normalize entity values across languages
        IF entity.type == "product":
            entity.normalized_value = CROSS_LINGUAL_PRODUCT_NORMALIZE(
                entity.value,
                entity.source_language,
                session_language
            )
        ELSE IF entity.type == "quantity":
            entity.normalized_value = PARSE_MULTILINGUAL_QUANTITY(
                entity.value,
                entity.source_language
            )
            // Handle: "dedh" (Hindi) = 1.5, "rendu" (Tamil) = 2
        ELSE IF entity.type == "time":
            entity.normalized_value = PARSE_VERNACULAR_TIME(
                entity.value,
                entity.source_language
            )
            // Handle: "kal" = tomorrow, "parso" = day after, "naalai" (Tamil) = tomorrow

        entities.APPEND(entity)

    RETURN {
        normalized_intent: intent_result,
        entities: entities,
        code_mix_metadata: {
            languages_detected: UNIQUE(language_tags),
            mix_ratio: intent_features.code_mix_ratio,
            dominant_language: MODE(language_tags)
        }
    }
```

### Algorithm 4: Voice-to-Order Pipeline with Confirmation Loop

```
ALGORITHM VoiceToOrderWithConfirmation

INPUT:
    session: VoiceSession
    dialog_state: DialogState
    nlu_result: {intent, entities, confidence}

OUTPUT:
    next_action: dialog action (prompt, confirm, execute, escalate)
    response: text/SSML response for TTS
    state_update: dialog state mutations

CONSTANTS:
    CONFIRM_THRESHOLD_AMOUNT = 500.00    // Always confirm orders above this amount
    MAX_ITEMS_BEFORE_REVIEW = 5          // Force cart review after 5 items
    MAX_CLARIFICATION_ATTEMPTS = 3       // Escalate after 3 failed clarifications
    QUANTITY_CONFIRM_THRESHOLD = 10      // Confirm unusually large quantities

PROCEDURE:
    intent = nlu_result.intent
    entities = nlu_result.entities
    language = session.detected_language

    SWITCH intent:

    CASE "add_to_cart":
        // --- Extract and validate product + quantity ---
        product_entities = entities.FILTER(type == "product")

        FOR EACH product_entity IN product_entities:
            // Resolve product
            resolution = RESOLVE_PRODUCT(product_entity, session)

            IF resolution.disambiguation_needed:
                // Need to ask user which product they mean
                dialog_state.disambiguation_state = {
                    candidates: resolution.candidates,
                    original_entity: product_entity,
                    attempts: 0
                }
                RETURN {
                    next_action: "DISAMBIGUATE",
                    response: resolution.suggested_prompt,
                    state_update: dialog_state
                }

            product = resolution.candidates[0].product
            quantity = EXTRACT_QUANTITY(entities, product_entity)

            // --- Quantity sanity check ---
            IF quantity.value > QUANTITY_CONFIRM_THRESHOLD:
                RETURN {
                    next_action: "CONFIRM",
                    response: LOCALIZE(
                        "Aapne {quantity} {unit} {product} bola. Kya yeh sahi hai?",
                        language,
                        quantity=quantity.value,
                        unit=quantity.unit,
                        product=product.vernacular_name[language]
                    ),
                    state_update: {
                        confirmation_pending: {
                            field: "quantity",
                            product_id: product.id,
                            quantity: quantity
                        }
                    }
                }

            // --- Add to cart ---
            cart_result = CART_SERVICE.ADD(session.session_id, product.id, quantity)

            // --- Check if cart review needed ---
            IF cart_result.item_count >= MAX_ITEMS_BEFORE_REVIEW:
                RETURN {
                    next_action: "REVIEW_CART",
                    response: GENERATE_CART_REVIEW(cart_result, language),
                    state_update: {current_step: "cart_review"}
                }

            // --- Acknowledge and continue ---
            RETURN {
                next_action: "PROMPT",
                response: LOCALIZE(
                    "{product} {quantity} {unit} cart mein daal diya. Total {total} rupaye. Aur kuch?",
                    language,
                    product=product.vernacular_name[language],
                    quantity=quantity.value,
                    unit=quantity.unit,
                    total=cart_result.cart_summary.total
                ),
                state_update: {current_step: "browsing"}
            }

    CASE "confirm_action":
        // User confirmed a pending action
        pending = dialog_state.confirmation_pending

        IF pending IS NOT NULL:
            IF pending.field == "quantity":
                cart_result = CART_SERVICE.ADD(session.session_id, pending.product_id, pending.quantity)
                dialog_state.confirmation_pending = NULL
                RETURN {
                    next_action: "PROMPT",
                    response: LOCALIZE("Done! Cart mein daal diya. Aur kuch chahiye?", language),
                    state_update: dialog_state
                }
            ELSE IF pending.field == "order":
                // Process order placement
                GOTO place_order_flow

        // No pending confirmation — interpret as general affirmative
        RETURN HANDLE_GENERIC_CONFIRM(dialog_state, language)

    CASE "place_order":
        // --- Check required slots ---
        cart = CART_SERVICE.GET(session.session_id)

        IF cart.item_count == 0:
            RETURN {
                next_action: "PROMPT",
                response: LOCALIZE("Cart khali hai. Pehle kuch items add kariye.", language),
                state_update: {current_step: "browsing"}
            }

        missing_slots = CHECK_ORDER_SLOTS(dialog_state, session)
        // Required: delivery_address, payment_method

        IF missing_slots.LENGTH > 0:
            next_slot = missing_slots[0]
            RETURN {
                next_action: "SLOT_FILL",
                response: GENERATE_SLOT_PROMPT(next_slot, session, language),
                state_update: {current_step: "slot_filling", required_slots: missing_slots}
            }

        // --- Final confirmation ---
        IF dialog_state.current_step != "final_confirm":
            confirmation_text = GENERATE_ORDER_SUMMARY_FOR_VOICE(cart, dialog_state, language)
            // Chunked: read max 3 items, then total, then ask confirm
            RETURN {
                next_action: "CONFIRM",
                response: confirmation_text,
                state_update: {
                    current_step: "final_confirm",
                    confirmation_pending: {field: "order", cart_id: cart.cart_id}
                }
            }

        // --- Execute order ---
        order = ORDER_SERVICE.CREATE(cart, dialog_state.slots)
        payment = INITIATE_PAYMENT(order, dialog_state.slots.payment_method, session)

        RETURN {
            next_action: "INFORM",
            response: LOCALIZE(
                "Order ho gaya! Order number {order_id}. {payment_instruction}. {delivery_info}.",
                language,
                order_id=order.short_id,
                payment_instruction=PAYMENT_INSTRUCTION(payment, language),
                delivery_info=DELIVERY_ESTIMATE(order, language)
            ),
            state_update: {current_step: "order_complete", order_id: order.id}
        }

    CASE "unclear_or_low_confidence":
        // ASR or NLU confidence too low to act
        attempts = dialog_state.clarification_attempts || 0

        IF attempts >= MAX_CLARIFICATION_ATTEMPTS:
            // Escalate to human agent
            RETURN {
                next_action: "HANDOFF",
                response: LOCALIZE(
                    "Maaf kijiye, mujhe samajh nahi aa raha. Main aapko hamari team se jod deta hoon.",
                    language
                ),
                state_update: {current_step: "handoff"}
            }

        // Generate targeted clarification based on what we partially understood
        clarification = GENERATE_TARGETED_CLARIFICATION(nlu_result, dialog_state, language)

        RETURN {
            next_action: "CLARIFY",
            response: clarification,
            state_update: {clarification_attempts: attempts + 1}
        }
```

### Algorithm 5: TTS Prosody Selection and Response Optimization

```
ALGORITHM TTSProsodySelectionAndResponseOptimization

INPUT:
    response_text: generated response text
    language: target language
    user_profile: UserVoiceProfile
    dialog_context: {response_type, emotion, urgency}
    session_history: previous turns in session

OUTPUT:
    ssml: SSML-formatted response for TTS
    voice_id: selected TTS voice
    audio_config: speaking rate, pitch adjustments

PROCEDURE:
    // --- Step 1: Voice Selection ---
    voice_id = SELECT_VOICE(language, user_profile)

    // --- Step 2: Speaking Rate Adaptation ---
    base_rate = "medium"  // Default speaking rate

    IF user_profile.estimated_age_group == "SENIOR":
        base_rate = "slow"
    ELSE IF user_profile.preferred_speed IS NOT NULL:
        base_rate = user_profile.preferred_speed
    ELSE:
        // Adapt based on session signals
        IF session_history.user_avg_utterance_speed < SLOW_THRESHOLD:
            base_rate = "slow"
        ELSE IF session_history.user_repeat_count > 2:
            // User has repeated themselves — slow down
            base_rate = "slow"

    rate_value = MAP_RATE(base_rate)  // slow=0.85, medium=1.0, fast=1.15

    // --- Step 3: Emotional Prosody ---
    prosody_config = {
        "pitch": "medium",
        "rate": rate_value,
        "volume": "medium"
    }

    SWITCH dialog_context.emotion:
        CASE "apologetic":
            prosody_config.pitch = "-5%"
            prosody_config.rate *= 0.95
        CASE "enthusiastic":
            prosody_config.pitch = "+5%"
            prosody_config.volume = "+10%"
        CASE "urgent":
            prosody_config.rate *= 1.1
            prosody_config.volume = "+15%"
        CASE "neutral":
            // Default prosody
            PASS

    // --- Step 4: Content-Aware SSML Generation ---
    ssml_parts = ["<speak>"]
    ssml_parts.APPEND(FORMAT_PROSODY_TAG(prosody_config))

    // Parse response into segments for specialized handling
    segments = SEGMENT_RESPONSE(response_text, language)

    FOR EACH segment IN segments:
        SWITCH segment.type:
            CASE "greeting":
                // Warm, slightly slower greeting
                ssml_parts.APPEND(
                    "<prosody rate='95%' pitch='+3%'>{text}</prosody>"
                    .FORMAT(text=segment.text)
                )
                ssml_parts.APPEND("<break time='300ms'/>")

            CASE "product_name":
                // Emphasize product names, add slight pause before
                ssml_parts.APPEND("<break time='150ms'/>")
                ssml_parts.APPEND(
                    "<emphasis level='moderate'>{text}</emphasis>"
                    .FORMAT(text=segment.text)
                )

            CASE "price":
                // Format currency with proper pronunciation
                amount = segment.numeric_value
                currency_ssml = FORMAT_CURRENCY_SSML(amount, language)
                ssml_parts.APPEND(
                    "<emphasis level='strong'>{currency}</emphasis>"
                    .FORMAT(currency=currency_ssml)
                )

            CASE "number":
                ssml_parts.APPEND(
                    "<say-as interpret-as='cardinal'>{num}</say-as>"
                    .FORMAT(num=segment.text)
                )

            CASE "order_id":
                // Spell out order ID digit by digit
                ssml_parts.APPEND(
                    "<say-as interpret-as='characters'>{id}</say-as>"
                    .FORMAT(id=segment.text)
                )

            CASE "address":
                // Slower, with pauses between components
                ssml_parts.APPEND(
                    "<prosody rate='90%'>{addr}</prosody>"
                    .FORMAT(addr=segment.text)
                )

            CASE "question":
                // Rising intonation for questions
                ssml_parts.APPEND(
                    "<prosody pitch='+8%'>{text}</prosody>"
                    .FORMAT(text=segment.text)
                )

            CASE "list_item":
                // Chunked delivery: pause between items, checkpoint after 3
                ssml_parts.APPEND("<break time='200ms'/>")
                ssml_parts.APPEND(segment.text)
                IF segment.item_index > 0 AND segment.item_index % 3 == 0:
                    // Insert checkpoint after every 3 items
                    ssml_parts.APPEND("<break time='500ms'/>")
                    checkpoint = LOCALIZE("Ab tak sahi hai?", language)
                    ssml_parts.APPEND(
                        "<prosody pitch='+5%'>{text}</prosody>"
                        .FORMAT(text=checkpoint)
                    )

            CASE "text":
                ssml_parts.APPEND(segment.text)

    ssml_parts.APPEND("</prosody></speak>")
    ssml = JOIN(ssml_parts, "")

    // --- Step 5: Response Length Check ---
    estimated_duration = ESTIMATE_TTS_DURATION(ssml, rate_value, language)

    IF estimated_duration > 20_SECONDS:
        // Too long for voice — chunk and add checkpoints
        ssml = CHUNK_LONG_RESPONSE(ssml, max_chunk_seconds=15, language)

    RETURN {
        ssml: ssml,
        voice_id: voice_id,
        audio_config: prosody_config
    }

FUNCTION SELECT_VOICE(language, user_profile):
    IF user_profile.preferred_tts_voice IS NOT NULL:
        RETURN user_profile.preferred_tts_voice

    // Match dialect prosody
    dialect = user_profile.language_history.FIND(language).dialect

    available_voices = TTS_VOICE_REGISTRY.FILTER(
        language == language AND
        status == ACTIVE
    )

    IF dialect IS NOT NULL:
        dialect_voice = available_voices.FIND(dialect_match == dialect)
        IF dialect_voice IS NOT NULL:
            RETURN dialect_voice.voice_id

    // Default: female voice (generally preferred for commerce interactions)
    RETURN available_voices.FIND(gender == "female").voice_id
```

### Algorithm 6: Outbound Campaign Dynamic Script Generation

```
ALGORITHM OutboundCampaignScriptGeneration

INPUT:
    campaign: OutboundCampaign
    user: UserVoiceProfile
    call_context: {attempt_number, previous_outcome, time_of_day}

OUTPUT:
    script: dynamic call script with branching logic
    voice_config: TTS configuration for this call

PROCEDURE:
    language = user.primary_language

    // --- Step 1: Personalization Data Fetch ---
    user_data = {
        name: FETCH_USER_NAME(user.user_id),
        last_order: FETCH_LAST_ORDER(user.user_id),
        favorite_products: user.favorite_products[0:3],
        avg_order_value: user.order_history_summary.avg_value,
        days_since_last_order: DAYS_SINCE(user.order_history_summary.last_order_date)
    }

    // --- Step 2: Script Template Selection ---
    template = campaign.script_template

    // Adjust for retry attempts
    IF call_context.attempt_number > 1:
        IF call_context.previous_outcome == "NO_ANSWER":
            template.greeting = LOCALIZE(
                "Namaste {name} ji! Pichli baar aapka phone nahi lag paya. ", language,
                name=user_data.name
            ) + template.greeting
        ELSE IF call_context.previous_outcome == "CALLBACK_REQUESTED":
            template.greeting = LOCALIZE(
                "Namaste {name} ji! Aapne callback maanga tha. ", language,
                name=user_data.name
            )

    // --- Step 3: Dynamic Content Generation ---
    script = {
        opening: FILL_TEMPLATE(template.greeting, user_data, language),
        pitch: FILL_TEMPLATE(template.pitch, user_data, language),
        branches: {}
    }

    // Generate response branches for expected user intents
    script.branches["positive"] = {
        // User wants to reorder
        action: "REORDER",
        response: GENERATE_REORDER_CONFIRMATION(user_data.last_order, language),
        next: "confirm_order"
    }

    script.branches["modify"] = {
        // User wants to modify the order
        action: "MODIFY",
        response: LOCALIZE("Kya badlav karna hai? Items ya quantity?", language),
        next: "modification_dialog"
    }

    script.branches["negative"] = {
        // User declines
        action: "SOFT_CLOSE",
        response: LOCALIZE(
            "Koi baat nahi! Jab zaroorat ho tab call kar lijiyega ya WhatsApp pe message kar dijiyega. Dhanyavaad!",
            language
        ),
        next: "end_call"
    }

    script.branches["question"] = {
        // User has a question
        action: "ANSWER",
        response: null,  // Dynamic based on question
        next: "return_to_pitch"
    }

    script.branches["busy"] = {
        // User is busy
        action: "RESCHEDULE",
        response: LOCALIZE(
            "Koi baat nahi! Kab call karoon? Subah ya shaam?",
            language
        ),
        next: "schedule_callback"
    }

    // --- Step 4: Voice Configuration ---
    voice_config = {
        voice_id: SELECT_VOICE(language, user),
        rate: "medium",
        emotion: "friendly",
        // Time-of-day adjustment
        volume: IF call_context.time_of_day.hour < 10 THEN "-5%" ELSE "medium"
    }

    // --- Step 5: Compliance Checks ---
    script.compliance = {
        max_duration_seconds: 120,
        must_identify_as_ai: true,
        identification_text: LOCALIZE(
            "Yeh {platform_name} ki taraf se AI call hai.", language
        ),
        opt_out_option: LOCALIZE(
            "Agar aapko aage se call nahi chahiye toh '0' dabayiye.", language
        )
    }

    RETURN {script, voice_config}
```
