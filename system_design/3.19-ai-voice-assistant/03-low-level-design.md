# Low-Level Design

## Data Models

### Device Registration

```yaml
Device:
  device_id: uuid                    # Unique device identifier
  device_type: enum                  # [speaker, phone, car, wearable, tv, display]
  model: string                      # "Echo Dot 5th Gen", "Pixel 8"
  manufacturer: string               # "Amazon", "Google"
  firmware_version: string           # "v2.1.45"
  wake_word_model_version: string    # "ww-v3.2.1"
  capabilities:
    has_screen: boolean
    has_camera: boolean
    supports_matter: boolean
    supports_zigbee: boolean
    has_speaker: boolean
    has_microphone: boolean
    max_audio_channels: integer
  supported_locales: string[]        # ["en-US", "es-MX"]
  registered_users: UserId[]         # Multi-user support
  primary_user: UserId
  location:
    room: string                     # "Living Room"
    home_id: uuid
  network:
    wifi_ssid: string
    ip_address: string
    mac_address: string
  smart_home_hub: boolean            # Acts as Zigbee/Thread hub
  offline_skills_enabled: boolean
  created_at: timestamp
  last_seen_at: timestamp
  status: enum                       # [online, offline, updating]
```

### Voice Request

```yaml
VoiceRequest:
  request_id: uuid                   # Unique request identifier
  device_id: uuid                    # Source device
  user_id: uuid                      # Identified speaker (from voice profile)
  session_id: uuid                   # Conversation session
  turn_number: integer               # Position in multi-turn conversation

  audio:
    stream_url: string               # WebSocket endpoint for audio
    format: AudioFormat
    duration_ms: integer
    sample_rate: integer             # 16000 Hz
    channels: integer                # 1 (mono)
    encoding: string                 # "opus", "pcm"

  context:
    locale: string                   # "en-US"
    timezone: string                 # "America/New_York"
    location:                        # Optional, with permission
      latitude: float
      longitude: float
    previous_intent: string          # For follow-up context
    active_skill: string             # Currently engaged skill
    device_state:
      volume: integer
      is_muted: boolean
      active_timers: Timer[]
      playing_media: MediaInfo

  metadata:
    wake_word_confidence: float      # 0.0-1.0
    wake_word_model: string
    client_timestamp: timestamp
    server_timestamp: timestamp

  processing_hints:
    expected_intents: string[]       # Contextual biasing
    user_vocabulary: string[]        # Names, custom words
```

### NLU Result

```yaml
NLUResult:
  request_id: uuid
  transcript: string                 # "play jazz music"
  asr_confidence: float              # 0.0-1.0
  asr_alternatives: TranscriptAlternative[]

  intent:
    name: string                     # "PlayMusicIntent"
    confidence: float                # 0.0-1.0
    domain: string                   # "Music"

  slots:
    - name: string                   # "genre"
      value: string                  # "jazz"
      raw_value: string              # "jazz" (before normalization)
      confidence: float
      resolution:                    # Entity linking
        type: string                 # "MusicGenre"
        canonical_value: string      # "JAZZ"

  entities:
    - type: string                   # "ARTIST", "SONG", "DATE"
      value: string
      start_index: integer
      end_index: integer
      linked_id: string              # Knowledge base ID

  sentiment:
    label: string                    # "neutral", "positive", "negative"
    score: float

  is_question: boolean
  requires_follow_up: boolean
  missing_required_slots: string[]
```

### Conversation Session

```yaml
ConversationSession:
  session_id: uuid
  device_id: uuid
  user_id: uuid
  started_at: timestamp
  last_activity_at: timestamp
  expires_at: timestamp              # TTL for cleanup
  status: enum                       # [active, paused, completed]

  dialogue_state:
    current_intent: string
    belief_state:                    # Slot values accumulated
      slot_name: SlotValue
    pending_slots: string[]          # Still need to fill
    confirmation_pending: boolean

  turns:
    - turn_number: integer
      user_input: string
      intent: Intent
      slots: Slot[]
      system_response: string
      skill_invoked: string
      timestamp: timestamp

  context:
    active_skill: string
    skill_session_data: object       # Skill-specific state
    follow_up_enabled: boolean
    follow_up_expires_at: timestamp
```

### Skill Invocation

```yaml
SkillInvocation:
  invocation_id: uuid
  skill_id: string                   # "amzn1.ask.skill.xxx"
  skill_type: enum                   # [first_party, third_party, smart_home]

  request:
    type: string                     # "IntentRequest", "LaunchRequest"
    intent: Intent
    slots: Slot[]
    locale: string
    timestamp: timestamp

  session:
    session_id: uuid
    new_session: boolean
    attributes: object               # Skill-persisted data

  user:
    user_id: uuid
    access_token: string             # Account linking token
    permissions:
      - permission: string           # "alexa::profile:name:read"
        granted: boolean

  device:
    device_id: uuid
    supported_interfaces: string[]   # ["AudioPlayer", "Display"]

  context:
    system:
      api_endpoint: string
      api_access_token: string
    audio_player:
      state: string                  # "PLAYING", "STOPPED"
      token: string
      offset_ms: integer
```

### Skill Response

```yaml
SkillResponse:
  invocation_id: uuid
  status: enum                       # [success, error, timeout]

  response:
    output_speech:
      type: string                   # "PlainText", "SSML"
      text: string
      ssml: string

    reprompt:                        # If expecting follow-up
      output_speech: OutputSpeech

    card:                            # Visual for app/display
      type: string                   # "Simple", "Standard", "LinkAccount"
      title: string
      content: string
      image:
        small_url: string
        large_url: string

    directives:                      # Device actions
      - type: string                 # "AudioPlayer.Play", "Display.RenderTemplate"
        payload: object

  session_attributes: object         # Persist for next turn
  should_end_session: boolean

  execution_time_ms: integer
  billing:
    compute_units: integer
```

---

## API Specifications

### Device-to-Cloud WebSocket API

**Connection Establishment:**

```
WS wss://voice.assistant.example.com/v1/stream
Headers:
  Authorization: Bearer <device_token>
  X-Device-Id: <device_uuid>
  X-Wake-Word-Model: <model_version>
```

**Client → Server Messages:**

```yaml
# Audio chunk during active session
AudioChunk:
  type: "audio"
  sequence: integer
  data: base64                       # Opus-encoded audio
  is_final: boolean                  # End of utterance
  metadata:
    vad_speech_probability: float
    timestamp_ms: integer

# Wake word triggered
WakeWordTriggered:
  type: "wake_word"
  wake_word: string                  # "alexa"
  confidence: float
  audio_offset_ms: integer           # When in buffer

# Session control
SessionControl:
  type: "control"
  action: string                     # "cancel", "pause", "resume"
```

**Server → Client Messages:**

```yaml
# Partial transcript (streaming)
PartialTranscript:
  type: "transcript"
  is_final: boolean
  transcript: string
  confidence: float
  stability: float                   # How likely to change

# System directive
Directive:
  type: "directive"
  namespace: string                  # "AudioPlayer", "SpeechSynthesizer"
  name: string                       # "Play", "Speak"
  payload: object

# Audio response (streaming TTS)
AudioResponse:
  type: "audio_response"
  sequence: integer
  data: base64                       # Opus-encoded TTS audio
  is_final: boolean

# Session state
SessionState:
  type: "session"
  action: string                     # "start", "end", "follow_up_enabled"
  session_id: uuid
  expires_at: timestamp
```

### Skill Developer API

**Skill Endpoint Contract:**

```yaml
POST /skill-endpoint
Content-Type: application/json

Request:
  version: "1.0"
  session:
    new: boolean
    sessionId: string
    attributes: object
  context:
    System:
      apiAccessToken: string
      apiEndpoint: string
      device:
        deviceId: string
        supportedInterfaces: object
      user:
        userId: string
        accessToken: string          # Account linking
  request:
    type: string                     # "LaunchRequest", "IntentRequest", "SessionEndedRequest"
    requestId: string
    timestamp: string                # ISO 8601
    locale: string
    intent:                          # For IntentRequest
      name: string
      confirmationStatus: string     # "NONE", "CONFIRMED", "DENIED"
      slots:
        slotName:
          name: string
          value: string
          confirmationStatus: string
          resolutions:
            resolutionsPerAuthority:
              - authority: string
                status:
                  code: string       # "ER_SUCCESS_MATCH"
                values:
                  - value:
                      name: string
                      id: string

Response:
  version: "1.0"
  sessionAttributes: object
  response:
    outputSpeech:
      type: string                   # "PlainText", "SSML"
      text: string
      ssml: string
    card:
      type: string
      title: string
      content: string
    reprompt:
      outputSpeech: OutputSpeech
    directives: Directive[]
    shouldEndSession: boolean
```

### Internal gRPC Service APIs

**ASR Service:**

```protobuf
service ASRService {
  // Bidirectional streaming for real-time transcription
  rpc StreamingRecognize(stream AudioRequest) returns (stream TranscriptResponse);

  // Batch recognition for offline processing
  rpc Recognize(RecognizeRequest) returns (RecognizeResponse);
}

message AudioRequest {
  oneof audio_source {
    AudioConfig config = 1;         // First message: configuration
    bytes audio_content = 2;        // Subsequent: audio chunks
  }
}

message AudioConfig {
  string encoding = 1;              // "OPUS", "LINEAR16"
  int32 sample_rate_hertz = 2;      // 16000
  string language_code = 3;         // "en-US"
  repeated string phrase_hints = 4; // Contextual biasing
  bool enable_word_time_offsets = 5;
}

message TranscriptResponse {
  repeated SpeechRecognitionResult results = 1;
}

message SpeechRecognitionResult {
  repeated SpeechRecognitionAlternative alternatives = 1;
  bool is_final = 2;
  float stability = 3;
}
```

**NLU Service:**

```protobuf
service NLUService {
  rpc Understand(NLURequest) returns (NLUResponse);
  rpc BatchUnderstand(BatchNLURequest) returns (BatchNLUResponse);
}

message NLURequest {
  string transcript = 1;
  string locale = 2;
  Context context = 3;
}

message Context {
  string previous_intent = 1;
  map<string, string> slot_carryover = 2;
  repeated string expected_intents = 3;
  string active_skill = 4;
}

message NLUResponse {
  Intent intent = 1;
  repeated Slot slots = 2;
  repeated Entity entities = 3;
  float confidence = 4;
}
```

**TTS Service:**

```protobuf
service TTSService {
  // Streaming synthesis for real-time playback
  rpc StreamingSynthesize(SynthesisRequest) returns (stream AudioChunk);

  // Batch synthesis
  rpc Synthesize(SynthesisRequest) returns (SynthesisResponse);
}

message SynthesisRequest {
  oneof input {
    string text = 1;
    string ssml = 2;
  }
  VoiceConfig voice = 3;
  AudioConfig audio_config = 4;
}

message VoiceConfig {
  string voice_id = 1;              // "en-US-Neural2-F"
  string language_code = 2;
  float speaking_rate = 3;          // 0.5-2.0
  float pitch = 4;                  // -20.0 to 20.0 semitones
  float volume_gain_db = 5;
}

message AudioChunk {
  bytes audio_content = 1;
  bool is_final = 2;
  int32 sequence = 3;
}
```

---

## Core Algorithms

### Wake Word Detection (MFCC + CNN)

```
ALGORITHM: WakeWordDetection
INPUT:
  audio_buffer: RingBuffer[20ms frames]
  model: QuantizedCNN
OUTPUT:
  triggered: boolean
  confidence: float

CONSTANTS:
  FRAME_SIZE_MS = 20
  CONTEXT_FRAMES = 75              // 1.5 seconds of context
  N_MFCC = 13
  THRESHOLD = 0.95
  MIN_INTERVAL_MS = 2000           // Debounce

STATE:
  feature_buffer: CircularBuffer[CONTEXT_FRAMES × N_MFCC]
  last_trigger_time: timestamp

PROCEDURE:
  // 1. Check if enough audio accumulated
  IF audio_buffer.size() < FRAME_SIZE_MS * SAMPLE_RATE / 1000 THEN
    RETURN (false, 0.0)
  END IF

  // 2. Extract MFCC features for current frame
  frame = audio_buffer.pop_frame(FRAME_SIZE_MS)

  // Pre-emphasis filter
  emphasized = preemphasis(frame, coefficient=0.97)

  // Windowing (Hamming)
  windowed = hamming_window(emphasized)

  // FFT and power spectrum
  spectrum = abs(fft(windowed))^2

  // Mel filterbank
  mel_spectrum = mel_filterbank(spectrum, n_filters=26)

  // DCT to get MFCCs
  mfcc = dct(log(mel_spectrum))[:N_MFCC]

  // Add delta and delta-delta features
  features = concatenate(mfcc, delta(mfcc), delta_delta(mfcc))

  // 3. Update rolling feature buffer
  feature_buffer.push(features)

  IF feature_buffer.size() < CONTEXT_FRAMES THEN
    RETURN (false, 0.0)
  END IF

  // 4. CNN inference (quantized INT8)
  input_tensor = reshape(feature_buffer, [1, CONTEXT_FRAMES, N_MFCC * 3, 1])

  // Forward pass through quantized model
  logits = model.forward(input_tensor)

  // Softmax for probability
  probabilities = softmax(logits)
  confidence = probabilities[WAKE_WORD_CLASS]

  // 5. Threshold with debounce
  current_time = now()
  time_since_last = current_time - last_trigger_time

  IF confidence > THRESHOLD AND time_since_last > MIN_INTERVAL_MS THEN
    last_trigger_time = current_time
    feature_buffer.clear()
    RETURN (true, confidence)
  END IF

  RETURN (false, confidence)
```

### Streaming ASR (Conformer + RNN-T)

```
ALGORITHM: StreamingASR
INPUT:
  audio_chunk: bytes (Opus encoded, 20ms)
  encoder_model: ConformerEncoder
  joint_model: JointNetwork
  decoder_model: LSTMDecoder
OUTPUT:
  partial_transcript: string
  is_final: boolean

STATE:
  encoder_state: EncoderState
  decoder_state: DecoderState
  hypothesis: TokenList
  audio_buffer: FrameBuffer
  silence_frames: integer

CONSTANTS:
  BLANK_TOKEN = 0
  EOS_TOKEN = 1
  SILENCE_THRESHOLD_FRAMES = 40    // 800ms at 20ms/frame
  BEAM_WIDTH = 4

PROCEDURE:
  // 1. Decode audio chunk
  pcm = opus_decode(audio_chunk)
  audio_buffer.append(pcm)

  // 2. Compute mel spectrogram features
  IF audio_buffer.ready_for_feature_extraction() THEN
    features = compute_log_mel_spectrogram(
      audio_buffer.get_window(),
      n_mels=80,
      window_size_ms=25,
      hop_size_ms=10
    )
  ELSE
    RETURN (join(hypothesis), false)
  END IF

  // 3. Conformer encoder forward pass
  FOR EACH feature_frame IN features DO
    // Self-attention (causal/streaming)
    attended = causal_self_attention(
      feature_frame,
      encoder_state.attention_cache,
      max_context=64               // Limited look-back for streaming
    )

    // Convolution module
    conv_out = depthwise_conv(attended, kernel_size=15)

    // Feed-forward
    encoder_output = feed_forward(conv_out)

    // Update encoder state
    encoder_state.update(encoder_output)

    // 4. RNN-T decoding (greedy or beam)
    WHILE true DO
      // Joint network combines encoder and decoder outputs
      joint_output = joint_model.forward(
        encoder_output,
        decoder_state.hidden
      )

      // Get most likely token
      token_logits = output_projection(joint_output)
      token_id = argmax(token_logits)

      IF token_id == BLANK_TOKEN THEN
        // Blank means "no output for this frame"
        BREAK
      END IF

      IF token_id == EOS_TOKEN THEN
        is_final = true
        RETURN (join(hypothesis), is_final)
      END IF

      // Emit token and update decoder
      hypothesis.append(vocabulary[token_id])
      decoder_state = decoder_model.forward(token_id, decoder_state)
    END WHILE
  END FOR

  // 5. Voice activity detection for end-of-utterance
  energy = compute_frame_energy(pcm)
  IF energy < SILENCE_ENERGY_THRESHOLD THEN
    silence_frames += 1
  ELSE
    silence_frames = 0
  END IF

  // End of utterance detected
  IF silence_frames >= SILENCE_THRESHOLD_FRAMES THEN
    is_final = true

    // Optional: language model rescoring for final transcript
    hypothesis = lm_rescore(hypothesis, n_best=4)
  END IF

  RETURN (join(hypothesis), is_final)
```

### Joint Intent + Slot Classification (JointBERT)

```
ALGORITHM: JointNLU
INPUT:
  transcript: string
  context: ConversationContext
OUTPUT:
  intent: Intent
  slots: Slot[]

MODEL:
  bert_encoder: BERT-base (or DistilBERT)
  intent_classifier: Linear(768, num_intents)
  slot_classifier: Linear(768, num_slot_tags)

CONSTANTS:
  INTENT_CONFIDENCE_THRESHOLD = 0.5
  SLOT_CONFIDENCE_THRESHOLD = 0.7
  MAX_SEQUENCE_LENGTH = 128

PROCEDURE:
  // 1. Tokenization
  tokens = bert_tokenizer.tokenize(transcript)

  // Prepend [CLS], append [SEP]
  tokens = ["[CLS]"] + tokens + ["[SEP]"]

  // Convert to IDs
  input_ids = bert_tokenizer.convert_tokens_to_ids(tokens)
  attention_mask = [1] * len(input_ids)

  // Pad to max length
  padding_length = MAX_SEQUENCE_LENGTH - len(input_ids)
  input_ids = input_ids + [0] * padding_length
  attention_mask = attention_mask + [0] * padding_length

  // Track original word boundaries for slot alignment
  word_boundaries = compute_word_boundaries(tokens, transcript)

  // 2. BERT forward pass
  bert_output = bert_encoder(
    input_ids=input_ids,
    attention_mask=attention_mask
  )

  // [CLS] token representation for intent
  pooled_output = bert_output.pooler_output        // Shape: [768]

  // All token representations for slots
  sequence_output = bert_output.last_hidden_state  // Shape: [seq_len, 768]

  // 3. Intent classification
  intent_logits = intent_classifier(pooled_output)
  intent_probs = softmax(intent_logits)

  predicted_intent_id = argmax(intent_probs)
  intent_confidence = intent_probs[predicted_intent_id]

  IF intent_confidence < INTENT_CONFIDENCE_THRESHOLD THEN
    // Low confidence - may need LLM fallback
    predicted_intent = "Fallback"
  ELSE
    predicted_intent = intent_vocabulary[predicted_intent_id]
  END IF

  // 4. Slot filling (BIO tagging)
  slot_logits = slot_classifier(sequence_output)
  slot_probs = softmax(slot_logits, dim=-1)
  slot_tags = argmax(slot_probs, dim=-1)

  // 5. Extract slot values from BIO tags
  slots = []
  current_slot = null

  FOR i = 1 TO len(tokens) - 1 DO    // Skip [CLS] and [SEP]
    tag = slot_vocabulary[slot_tags[i]]
    token = tokens[i]
    confidence = slot_probs[i][slot_tags[i]]

    IF tag.startswith("B-") THEN
      // Beginning of new slot
      IF current_slot != null THEN
        slots.append(current_slot)
      END IF
      slot_type = tag[2:]           // Remove "B-" prefix
      current_slot = Slot(
        name=slot_type,
        value=token,
        confidence=confidence,
        start_token=i
      )

    ELSE IF tag.startswith("I-") AND current_slot != null THEN
      // Inside continuation of slot
      slot_type = tag[2:]
      IF slot_type == current_slot.name THEN
        current_slot.value += " " + detokenize(token)
        current_slot.confidence = min(current_slot.confidence, confidence)
      ELSE
        // Tag mismatch - close current slot
        slots.append(current_slot)
        current_slot = null
      END IF

    ELSE  // "O" tag (outside)
      IF current_slot != null THEN
        slots.append(current_slot)
        current_slot = null
      END IF
    END IF
  END FOR

  // Don't forget last slot
  IF current_slot != null THEN
    slots.append(current_slot)
  END IF

  // 6. Slot value normalization and entity resolution
  FOR EACH slot IN slots DO
    slot.raw_value = slot.value
    slot.value = normalize_slot_value(slot.name, slot.value)
    slot.resolution = resolve_entity(slot.name, slot.value, context)
  END FOR

  // 7. Context-based slot carryover
  IF context.previous_intent != null THEN
    FOR EACH required_slot IN get_required_slots(predicted_intent) DO
      IF required_slot NOT IN slots AND required_slot IN context.belief_state THEN
        // Carry over from previous turn
        slots.append(context.belief_state[required_slot])
      END IF
    END FOR
  END IF

  RETURN (
    Intent(name=predicted_intent, confidence=intent_confidence),
    slots
  )
```

### Dialogue State Tracking

```
ALGORITHM: DialogueStateTracker
INPUT:
  nlu_result: NLUResult
  session: ConversationSession
OUTPUT:
  updated_state: DialogueState
  action: PolicyAction

STATE:
  belief_state: Map<SlotName, SlotValue>
  conversation_history: Turn[]

CONSTANTS:
  MAX_TURNS = 10
  SLOT_CONFIDENCE_THRESHOLD = 0.6
  CONFIRMATION_THRESHOLD = 0.8

PROCEDURE:
  // 1. Initialize or retrieve dialogue state
  IF session.dialogue_state == null THEN
    belief_state = {}
    conversation_history = []
  ELSE
    belief_state = session.dialogue_state.belief_state
    conversation_history = session.dialogue_state.turns
  END IF

  current_intent = nlu_result.intent
  current_slots = nlu_result.slots

  // 2. Update belief state with new slot values
  FOR EACH slot IN current_slots DO
    IF slot.confidence > SLOT_CONFIDENCE_THRESHOLD THEN
      previous_value = belief_state.get(slot.name)

      IF previous_value != null AND previous_value != slot.value THEN
        // Slot value changed - may need confirmation
        IF slot.confidence < CONFIRMATION_THRESHOLD THEN
          // Queue for confirmation
          pending_confirmations.add(slot.name)
        END IF
      END IF

      belief_state[slot.name] = slot
    END IF
  END FOR

  // 3. Handle intent transitions
  IF current_intent.name == "Cancel" THEN
    action = PolicyAction(type="END_SESSION")
    RETURN (belief_state, action)
  END IF

  IF current_intent.name == "Yes" OR current_intent.name == "No" THEN
    // Handle confirmation response
    IF pending_confirmations.size() > 0 THEN
      confirmed_slot = pending_confirmations.pop()
      IF current_intent.name == "No" THEN
        belief_state.remove(confirmed_slot)
        action = PolicyAction(type="PROMPT_SLOT", slot=confirmed_slot)
        RETURN (belief_state, action)
      END IF
    END IF
  END IF

  // 4. Determine required vs filled slots
  intent_schema = get_intent_schema(current_intent.name)
  required_slots = intent_schema.required_slots
  optional_slots = intent_schema.optional_slots

  missing_required = []
  FOR EACH required IN required_slots DO
    IF required NOT IN belief_state THEN
      missing_required.append(required)
    END IF
  END FOR

  // 5. Select policy action
  IF missing_required.size() > 0 THEN
    // Need to elicit missing slot
    next_slot = missing_required[0]
    prompt = generate_slot_prompt(current_intent.name, next_slot)
    action = PolicyAction(
      type="PROMPT_SLOT",
      slot=next_slot,
      prompt=prompt
    )

  ELSE IF pending_confirmations.size() > 0 THEN
    // Need to confirm uncertain slot
    slot_to_confirm = pending_confirmations[0]
    action = PolicyAction(
      type="CONFIRM_SLOT",
      slot=slot_to_confirm,
      value=belief_state[slot_to_confirm].value
    )

  ELSE
    // All slots filled - execute skill
    action = PolicyAction(
      type="EXECUTE_SKILL",
      skill=intent_schema.skill_id,
      intent=current_intent.name,
      slots=belief_state
    )
  END IF

  // 6. Update conversation history
  new_turn = Turn(
    turn_number=len(conversation_history) + 1,
    user_input=nlu_result.transcript,
    intent=current_intent,
    slots=current_slots,
    system_action=action,
    timestamp=now()
  )
  conversation_history.append(new_turn)

  // Trim old turns
  IF len(conversation_history) > MAX_TURNS THEN
    conversation_history = conversation_history[-MAX_TURNS:]
  END IF

  // 7. Build updated state
  updated_state = DialogueState(
    current_intent=current_intent.name,
    belief_state=belief_state,
    pending_confirmations=pending_confirmations,
    conversation_history=conversation_history
  )

  RETURN (updated_state, action)
```

### TTS Synthesis (VITS-style)

```
ALGORITHM: StreamingTTS
INPUT:
  text: string (or SSML)
  voice_config: VoiceConfig
OUTPUT:
  audio_chunks: Stream<AudioChunk>

MODEL:
  text_encoder: TextEncoder
  duration_predictor: DurationPredictor
  flow: NormalizingFlow
  decoder: HiFiGAN

CONSTANTS:
  CHUNK_SIZE_MS = 100              // Stream in 100ms chunks
  SAMPLE_RATE = 22050
  HOP_SIZE = 256

PROCEDURE:
  // 1. Text preprocessing
  IF text.is_ssml THEN
    parsed = parse_ssml(text)
    phonemes = []
    prosody_markers = []
    FOR EACH element IN parsed DO
      IF element.is_text THEN
        phonemes.extend(g2p(element.text))
      ELSE IF element.is_break THEN
        prosody_markers.append(Break(duration=element.duration))
      ELSE IF element.is_prosody THEN
        prosody_markers.append(Prosody(rate=element.rate, pitch=element.pitch))
      END IF
    END FOR
  ELSE
    // Plain text - apply G2P (grapheme-to-phoneme)
    phonemes = g2p(text)
  END IF

  // 2. Encode phonemes
  phoneme_ids = phoneme_to_ids(phonemes)
  text_encoding = text_encoder(phoneme_ids)

  // 3. Predict durations for each phoneme
  log_durations = duration_predictor(text_encoding)
  durations = round(exp(log_durations) * voice_config.speaking_rate)

  // Apply prosody modifications
  durations = apply_prosody_markers(durations, prosody_markers)

  // 4. Expand text encoding according to durations
  expanded_encoding = expand_by_duration(text_encoding, durations)
  total_frames = sum(durations)

  // 5. Generate latent representation via normalizing flow
  // Sample from prior
  z = sample_normal(shape=[total_frames, latent_dim])

  // Transform through flow (for voice characteristics)
  latent = flow.inverse(z, condition=expanded_encoding)

  // Apply pitch modification
  IF voice_config.pitch != 0 THEN
    latent = pitch_shift(latent, semitones=voice_config.pitch)
  END IF

  // 6. Streaming decode with HiFi-GAN vocoder
  frames_per_chunk = (CHUNK_SIZE_MS * SAMPLE_RATE) / (1000 * HOP_SIZE)

  FOR chunk_start = 0 TO total_frames STEP frames_per_chunk DO
    chunk_end = min(chunk_start + frames_per_chunk, total_frames)
    latent_chunk = latent[chunk_start:chunk_end]

    // Vocoder generates waveform
    audio_chunk = decoder(latent_chunk)

    // Apply volume gain
    audio_chunk = audio_chunk * db_to_linear(voice_config.volume_gain_db)

    // Encode to Opus for streaming
    opus_chunk = opus_encode(audio_chunk, bitrate=32000)

    YIELD AudioChunk(
      data=opus_chunk,
      sequence=chunk_start / frames_per_chunk,
      is_final=(chunk_end >= total_frames)
    )
  END FOR
```

---

## Database Schema

### Device Registry (PostgreSQL)

```sql
CREATE TABLE devices (
    device_id UUID PRIMARY KEY,
    device_type VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    firmware_version VARCHAR(50),
    wake_word_model_version VARCHAR(50),
    capabilities JSONB,
    supported_locales TEXT[],
    primary_user_id UUID REFERENCES users(user_id),
    home_id UUID REFERENCES homes(home_id),
    room VARCHAR(100),
    smart_home_hub BOOLEAN DEFAULT FALSE,
    offline_skills_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'offline',

    INDEX idx_devices_home (home_id),
    INDEX idx_devices_primary_user (primary_user_id),
    INDEX idx_devices_last_seen (last_seen_at)
);

CREATE TABLE device_users (
    device_id UUID REFERENCES devices(device_id),
    user_id UUID REFERENCES users(user_id),
    role VARCHAR(20) DEFAULT 'member',  -- 'owner', 'member', 'guest'
    voice_profile_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (device_id, user_id)
);
```

### User Profiles (PostgreSQL)

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100),
    locale VARCHAR(10) DEFAULT 'en-US',
    timezone VARCHAR(50),
    voice_profile_data BYTEA,        -- Encrypted voice embedding
    preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_preferences (
    user_id UUID REFERENCES users(user_id),
    preference_key VARCHAR(100),
    preference_value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, preference_key)
);

CREATE TABLE voice_profiles (
    profile_id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    device_id UUID REFERENCES devices(device_id),
    embedding BYTEA NOT NULL,        -- Voice embedding vector
    samples_count INTEGER DEFAULT 0,
    confidence_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (user_id, device_id)
);
```

### Conversation History (Wide-Column Store - Cassandra/ScyllaDB)

```sql
CREATE TABLE conversations (
    session_id UUID,
    device_id UUID,
    user_id UUID,
    turn_number INT,

    -- Turn data
    user_input TEXT,
    transcript_confidence FLOAT,
    intent TEXT,
    intent_confidence FLOAT,
    slots MAP<TEXT, TEXT>,
    system_response TEXT,
    skill_invoked TEXT,

    -- Metadata
    audio_duration_ms INT,
    processing_time_ms INT,
    timestamp TIMESTAMP,

    PRIMARY KEY ((device_id, user_id), session_id, turn_number)
) WITH CLUSTERING ORDER BY (session_id DESC, turn_number ASC)
  AND default_time_to_live = 2592000;  -- 30 days TTL
```

### Skill Catalog (PostgreSQL)

```sql
CREATE TABLE skills (
    skill_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    developer_id UUID REFERENCES developers(developer_id),
    skill_type VARCHAR(50),          -- 'first_party', 'third_party', 'smart_home'
    category VARCHAR(100),
    supported_locales TEXT[],
    invocation_phrases TEXT[],
    interaction_model JSONB,         -- Intents, slots, sample utterances
    endpoint_url VARCHAR(500),
    account_linking_config JSONB,
    permissions_required TEXT[],
    certification_status VARCHAR(50),
    version VARCHAR(20),
    is_enabled BOOLEAN DEFAULT TRUE,
    rating_average FLOAT,
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    INDEX idx_skills_category (category),
    INDEX idx_skills_developer (developer_id),
    INDEX idx_skills_locale (supported_locales)
);

CREATE TABLE skill_intents (
    skill_id VARCHAR(100) REFERENCES skills(skill_id),
    intent_name VARCHAR(100),
    slots JSONB,                     -- Slot definitions
    sample_utterances TEXT[],
    PRIMARY KEY (skill_id, intent_name)
);
```

### Analytics Events (ClickHouse)

```sql
CREATE TABLE voice_events (
    event_id UUID,
    event_type String,               -- 'wake_word', 'asr_complete', 'nlu_result', 'skill_invoked'
    request_id UUID,
    device_id UUID,
    user_id Nullable(UUID),
    session_id Nullable(UUID),

    -- Event-specific data
    event_data String,               -- JSON

    -- Metrics
    latency_ms UInt32,
    confidence Nullable(Float32),

    -- Dimensions
    locale String,
    device_type String,
    skill_id Nullable(String),
    intent Nullable(String),

    -- Time
    event_time DateTime64(3),

    INDEX idx_device (device_id) TYPE minmax GRANULARITY 8192,
    INDEX idx_request (request_id) TYPE minmax GRANULARITY 8192
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, device_id, event_time);
```

---

## Message Queue Events

### Event Schemas (Apache Kafka)

```yaml
# Topic: voice.requests
VoiceRequestEvent:
  key: device_id
  value:
    event_type: "voice_request_started"
    request_id: uuid
    device_id: uuid
    user_id: uuid
    session_id: uuid
    locale: string
    timestamp: timestamp

# Topic: asr.transcripts
TranscriptEvent:
  key: request_id
  value:
    event_type: "transcript_final"
    request_id: uuid
    transcript: string
    confidence: float
    word_timings: WordTiming[]
    asr_latency_ms: integer
    timestamp: timestamp

# Topic: nlu.results
NLUResultEvent:
  key: request_id
  value:
    event_type: "nlu_complete"
    request_id: uuid
    intent: string
    intent_confidence: float
    slots: Slot[]
    nlu_latency_ms: integer
    timestamp: timestamp

# Topic: skills.invocations
SkillInvocationEvent:
  key: skill_id
  value:
    event_type: "skill_invoked"
    invocation_id: uuid
    request_id: uuid
    skill_id: string
    intent: string
    timestamp: timestamp

# Topic: skills.responses
SkillResponseEvent:
  key: invocation_id
  value:
    event_type: "skill_response"
    invocation_id: uuid
    request_id: uuid
    status: string
    response_text: string
    execution_time_ms: integer
    timestamp: timestamp

# Topic: voice.responses
VoiceResponseEvent:
  key: request_id
  value:
    event_type: "response_sent"
    request_id: uuid
    device_id: uuid
    tts_duration_ms: integer
    total_latency_ms: integer
    timestamp: timestamp
```

### Event Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Event-Driven Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Device        voice.requests      ASR         asr.transcripts              │
│    │ ──────────────────────────▶ Service ──────────────────────────▶       │
│    │                               │                                        │
│    │                               ▼                                        │
│    │           nlu.results       NLU         nlu.results                   │
│    │ ◀──────────────────────── Service ──────────────────────────▶        │
│    │                               │                                        │
│    │                               ▼                                        │
│    │         skills.invocations Dialogue     skills.invocations            │
│    │ ◀──────────────────────── Manager ──────────────────────────▶        │
│    │                               │                                        │
│    │                               ▼                                        │
│    │          skills.responses   Skill       skills.responses              │
│    │ ◀──────────────────────── Service ──────────────────────────▶        │
│    │                               │                                        │
│    │                               ▼                                        │
│    │          voice.responses    TTS         voice.responses               │
│    │ ◀──────────────────────── Service ──────────────────────────▶        │
│    ▼                                                                        │
│                                                                              │
│                          Analytics Consumer                                  │
│                          (ClickHouse sink)                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
