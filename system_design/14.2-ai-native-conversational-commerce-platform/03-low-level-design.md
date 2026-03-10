# 14.2 AI-Native Conversational Commerce Platform (WhatsApp-First) — Low-Level Design

## Data Models

### Conversation Thread

The conversation thread is the core abstraction—a stateful, bidirectional message stream between a business and a customer that carries the full commercial relationship context.

```
ConversationThread:
  conversation_id:       string          # globally unique (tenant_id:customer_phone hash)
  tenant_id:             string          # merchant identifier
  customer_id:           string          # internal customer identifier
  wa_phone_number:       string          # customer's WhatsApp number (E.164 format)
  business_phone_id:     string          # merchant's WhatsApp Business phone number ID

  state:
    status:              enum[ACTIVE, BOT_HANDLING, AGENT_HANDLING, WAITING_PAYMENT,
                              WAITING_CUSTOMER, RESOLVED, EXPIRED]
    assigned_agent_id:   string          # null if bot is handling
    escalation_reason:   string          # null if not escalated
    last_message_at:     datetime_ms     # timestamp of most recent message
    last_message_dir:    enum[INBOUND, OUTBOUND]
    session_window:      datetime_ms     # 24-hour customer-service window expiry
    unread_count:         int            # unread inbound messages

  context:
    language_detected:    string         # ISO 639-1 code (hi, en, ta, bn, etc.)
    language_confidence:  float64        # 0.0 - 1.0
    active_intent:        string         # current classified intent
    active_product_ids:   [string]       # products currently being discussed
    cart_id:              string         # active cart reference (null if no cart)
    pending_action:       string         # awaiting customer input for (e.g., size_selection)
    context_window:       [ContextEntry] # sliding window of last 10 classified messages

  metadata:
    first_message_at:     datetime_ms
    total_messages:       int
    total_orders:         int
    customer_sentiment:   float64        # -1.0 (negative) to 1.0 (positive)
    tags:                 [string]       # merchant-applied tags
    notes:                string         # agent notes

ContextEntry:
  message_id:            string
  timestamp:             datetime_ms
  direction:             enum[INBOUND, OUTBOUND]
  intent:                string
  entities:              map[string, string]  # entity_type → value
  confidence:            float64
```

### Message Record

```
MessageRecord:
  message_id:            string          # WhatsApp message ID (wamid.xxx)
  conversation_id:       string
  tenant_id:             string
  direction:             enum[INBOUND, OUTBOUND]
  timestamp:             datetime_ms     # WhatsApp server timestamp

  content:
    type:                enum[TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT, STICKER,
                              LOCATION, CONTACT, INTERACTIVE, ORDER, TEMPLATE,
                              REACTION, SYSTEM]
    text_body:           string          # for TEXT type
    media_url:           string          # for media types
    media_mime_type:     string
    media_sha256:        string          # content hash for deduplication
    interactive:         InteractiveContent  # for INTERACTIVE type
    template:            TemplateContent     # for TEMPLATE type
    order:               OrderContent        # for ORDER type

  processing:
    classified_intent:   string
    intent_confidence:   float64
    extracted_entities:  map[string, string]
    detected_language:   string
    processing_latency_ms: int
    handler:             enum[BOT_DETERMINISTIC, BOT_LLM, HUMAN_AGENT]

  delivery:
    status:              enum[SENT, DELIVERED, READ, FAILED]
    sent_at:             datetime_ms
    delivered_at:        datetime_ms
    read_at:             datetime_ms
    failure_reason:      string

InteractiveContent:
  interactive_type:      enum[LIST, BUTTON, PRODUCT, PRODUCT_LIST, CATALOG,
                              FLOW, CTA_URL]
  header:                string
  body:                  string
  footer:               string
  action:               map[string, any]   # type-specific action payload

TemplateContent:
  template_name:         string
  template_language:     string
  category:              enum[MARKETING, UTILITY, AUTHENTICATION, SERVICE]
  components:            [TemplateComponent]
  cost_category:         string          # for billing tracking
```

### Product Catalog Item

```
CatalogItem:
  product_id:            string          # platform-internal product ID
  tenant_id:             string
  retailer_id:           string          # WhatsApp catalog product_retailer_id
  commerce_manager_id:   string          # Meta Commerce Manager catalog ID

  basic:
    name:                string          # max 200 characters
    description:         string          # max 5000 characters
    category:            string          # product category
    subcategory:         string
    brand:               string
    url:                 string          # product page URL (optional)

  pricing:
    price:               float64         # current price in smallest currency unit
    sale_price:          float64         # null if no sale
    currency:            string          # ISO 4217 (INR, USD, etc.)
    price_display:       string          # formatted: "₹999"
    tax_rate:            float64         # GST rate

  media:
    images:              [ImageAsset]    # max 10 images, first is primary
    video_url:           string          # optional product video

  inventory:
    stock_quantity:      int             # current available stock
    stock_status:        enum[IN_STOCK, LOW_STOCK, OUT_OF_STOCK, MADE_TO_ORDER]
    low_stock_threshold: int             # alert when stock falls below
    track_inventory:     boolean         # some merchants don't track stock

  variants:
    has_variants:        boolean
    variant_attributes:  [string]        # e.g., ["size", "color"]
    variants:            [ProductVariant]

  search:
    search_keywords:     [string]        # additional search terms
    search_keywords_vernacular: [string] # vernacular search terms
    embedding_vector:    [float64]       # semantic search embedding (768-dim)

  sync:
    wa_sync_status:      enum[SYNCED, PENDING, FAILED, NOT_SYNCED]
    last_synced_at:      datetime_ms
    sync_error:          string
    wa_content_id:       string          # Meta's internal content ID

  status:
    active:              boolean
    created_at:          datetime_ms
    updated_at:          datetime_ms

ProductVariant:
  variant_id:            string
  attributes:            map[string, string]  # e.g., {size: "L", color: "Blue"}
  retailer_id:           string               # unique retailer ID for this variant
  price:                 float64
  stock_quantity:        int
  sku:                   string

ImageAsset:
  image_id:              string
  url:                   string
  width:                 int
  height:                int
  size_bytes:            int            # max 5 MB for WhatsApp
```

### Shopping Cart

```
ShoppingCart:
  cart_id:               string
  tenant_id:             string
  customer_id:           string
  conversation_id:       string

  items:                 [CartItem]

  pricing:
    subtotal:            float64
    discount_amount:     float64
    tax_amount:          float64
    shipping_amount:     float64
    total:               float64
    currency:            string

  discount:
    coupon_code:         string
    discount_type:       enum[PERCENTAGE, FIXED_AMOUNT, FREE_SHIPPING]
    discount_value:      float64

  metadata:
    created_at:          datetime_ms
    updated_at:          datetime_ms
    expires_at:          datetime_ms     # cart TTL (7 days from last update)
    item_count:          int
    recovery_sent:       boolean         # abandoned cart reminder sent?
    recovery_sent_at:    datetime_ms

CartItem:
  item_id:               string
  product_id:            string
  variant_id:            string          # null if no variant
  product_name:          string          # denormalized for cart display
  quantity:              int
  unit_price:            float64
  total_price:           float64
  added_at:              datetime_ms
  stock_reserved:        boolean         # true only during checkout
  reservation_expires:   datetime_ms
```

### Order Record

```
OrderRecord:
  order_id:              string          # merchant-facing order ID (e.g., ORD-20260310-ABCD)
  internal_id:           string          # globally unique internal ID
  tenant_id:             string
  customer_id:           string
  conversation_id:       string          # originating conversation

  items:                 [OrderItem]

  pricing:
    subtotal:            float64
    discount_amount:     float64
    tax_amount:          float64
    shipping_amount:     float64
    total:               float64
    currency:            string

  payment:
    payment_id:          string          # payment gateway transaction ID
    payment_method:      enum[UPI, CARD, NETBANKING, WALLET, COD, WHATSAPP_PAY]
    payment_status:      enum[PENDING, INITIATED, COMPLETED, FAILED, REFUNDED,
                              PARTIALLY_REFUNDED]
    payment_link:        string          # UPI intent link or checkout URL
    payment_link_expires: datetime_ms
    paid_at:             datetime_ms
    refund_amount:       float64
    refund_id:           string

  shipping:
    shipping_partner:    string
    tracking_number:     string
    shipping_label_url:  string
    estimated_delivery:  date
    actual_delivery:     datetime_ms
    shipping_address:    Address

  state:
    current_status:      enum[CREATED, PAYMENT_PENDING, PAID, CONFIRMED,
                              PROCESSING, SHIPPED, OUT_FOR_DELIVERY,
                              DELIVERED, COMPLETED, CANCELLED, RETURN_REQUESTED,
                              RETURN_PICKED, REFUND_PROCESSING, REFUNDED]
    status_history:      [StatusEvent]
    cancellation_reason: string
    return_reason:       string

  messages_sent:         [string]        # message IDs of status update messages sent
  created_at:            datetime_ms
  updated_at:            datetime_ms

OrderItem:
  product_id:            string
  variant_id:            string
  product_name:          string
  variant_description:   string          # e.g., "Size: L, Color: Blue"
  quantity:              int
  unit_price:            float64
  total_price:           float64

StatusEvent:
  status:                string
  timestamp:             datetime_ms
  actor:                 enum[SYSTEM, MERCHANT, CUSTOMER, SHIPPING_PARTNER]
  notes:                 string

Address:
  name:                  string
  phone:                 string
  line1:                 string
  line2:                 string
  city:                  string
  state:                 string
  pin_code:              string
  country:               string          # default: "IN"
```

### Customer Profile

```
CustomerProfile:
  customer_id:           string
  tenant_id:             string

  identity:
    wa_phone_number:     string          # E.164 format
    name:                string          # from WhatsApp profile or collected
    email:               string          # collected during checkout (optional)

  preferences:
    language:            string          # preferred communication language
    payment_method:      string          # most used payment method
    saved_addresses:     [Address]
    notification_opt_in: boolean         # marketing message consent
    opt_in_at:           datetime_ms
    opt_out_at:          datetime_ms     # null if opted in

  engagement:
    first_contact_at:    datetime_ms
    last_contact_at:     datetime_ms
    total_conversations: int
    total_messages_sent: int
    total_messages_received: int
    avg_response_time_ms: int            # how fast customer replies
    engagement_score:    float64         # 0.0 - 1.0 (recency × frequency × monetary)

  commerce:
    total_orders:        int
    total_spend:         float64
    avg_order_value:     float64
    last_order_at:       datetime_ms
    favorite_categories: [string]        # top 3 purchased categories
    ltv_score:           float64         # predicted lifetime value
    rfm_segment:         enum[CHAMPION, LOYAL, POTENTIAL, NEW, AT_RISK,
                              HIBERNATING, LOST]

  segmentation:
    tags:                [string]        # merchant-applied tags
    custom_attributes:   map[string, string]  # merchant-defined attributes
    cohort:              string          # acquisition cohort (month)

  broadcast:
    messages_received_24h: int           # for frequency cap tracking
    last_marketing_at:   datetime_ms
    template_categories_24h: [string]    # categories received in last 24h
    quality_signals:     QualitySignals

QualitySignals:
  read_rate:             float64         # % of messages read
  reply_rate:            float64         # % of messages replied to
  block_reported:        boolean         # customer blocked or reported
  spam_reported:         boolean
```

### Broadcast Campaign

```
BroadcastCampaign:
  campaign_id:           string
  tenant_id:             string

  definition:
    name:                string
    template_name:       string
    template_language:   string
    template_category:   enum[MARKETING, UTILITY]
    template_variables:  [VariableMapping]  # how to populate template vars

  audience:
    segment_rules:       [SegmentRule]    # audience filter criteria
    estimated_audience:  int             # pre-computed audience size
    actual_audience:     int             # after frequency cap filtering
    excluded_count:      int             # excluded by frequency cap or opt-out

  scheduling:
    scheduled_at:        datetime_ms     # null for immediate send
    timezone:            string          # for timezone-aware scheduling
    send_window_start:   string          # "10:00" (don't send before)
    send_window_end:     string          # "20:00" (don't send after)

  execution:
    status:              enum[DRAFT, SCHEDULED, IN_PROGRESS, PAUSED,
                              COMPLETED, CANCELLED, FAILED]
    started_at:          datetime_ms
    completed_at:        datetime_ms
    send_rate:           float64         # messages per second (current)

  metrics:
    total_sent:          int
    total_delivered:     int
    total_read:          int
    total_replied:       int
    total_failed:        int
    total_opted_out:     int             # unsubscribed after receiving
    delivery_rate:       float64
    read_rate:           float64
    reply_rate:          float64
    cost_total:          float64         # total messaging cost
    revenue_attributed:  float64         # orders attributed to campaign

SegmentRule:
  field:                 string          # e.g., "commerce.total_orders"
  operator:              enum[EQ, NEQ, GT, GTE, LT, LTE, IN, NOT_IN,
                              CONTAINS, BETWEEN, IS_NULL, IS_NOT_NULL]
  value:                 any

VariableMapping:
  position:              int             # variable position in template (1, 2, 3...)
  source:                enum[PROFILE_FIELD, STATIC_VALUE, COMPUTED]
  field:                 string          # e.g., "identity.name" for profile fields
  static_value:          string          # for static values
  default_value:         string          # fallback if field is null
```

### Merchant Tenant Configuration

```
TenantConfig:
  tenant_id:             string
  business_name:         string

  whatsapp:
    phone_number_id:     string          # WhatsApp Business phone number ID
    waba_id:             string          # WhatsApp Business Account ID
    access_token:        string          # encrypted; Meta API access token
    webhook_verify_token: string         # encrypted; webhook verification token
    catalog_id:          string          # Commerce Manager catalog ID
    quality_rating:      enum[GREEN, YELLOW, RED]
    messaging_tier:      enum[TIER_1, TIER_2, TIER_3, TIER_4]
    portfolio_id:        string          # for portfolio-level rate limiting

  chatbot:
    greeting_message:    string          # sent on first contact
    away_message:        string          # sent outside business hours
    business_hours:      [BusinessHour]
    fallback_message:    string          # when AI can't classify intent
    auto_reply_delay_ms: int             # artificial delay to feel human-like
    enabled_flows:       [string]        # which commerce flows are active

  commerce:
    currency:            string
    tax_rate:            float64
    cod_enabled:         boolean
    min_order_value:     float64
    shipping_partners:   [string]
    payment_gateway_id:  string
    payment_gateway_config: map[string, string]  # encrypted gateway credentials

  team:
    agents:              [AgentConfig]
    routing_strategy:    enum[ROUND_ROBIN, SKILL_BASED, LOAD_BALANCED, MANUAL]
    max_concurrent_per_agent: int

AgentConfig:
  agent_id:              string
  name:                  string
  skills:                [string]        # sales, support, returns, technical
  languages:             [string]        # languages this agent handles
  max_concurrent:        int
  status:                enum[ONLINE, AWAY, OFFLINE]

BusinessHour:
  day_of_week:           enum[MON, TUE, WED, THU, FRI, SAT, SUN]
  start_time:            string          # "09:00"
  end_time:              string          # "21:00"
  timezone:              string
```

---

## API Contracts

### 1. Webhook Receiver Endpoint

```
POST /webhook/whatsapp
Headers:
  X-Hub-Signature-256: sha256={hash}
  Content-Type: application/json

Request Body:
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "{waba_id}",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "91XXXXXXXXXX",
          "phone_number_id": "{phone_number_id}"
        },
        "messages": [{
          "id": "wamid.xxxx",
          "from": "91YYYYYYYYYY",
          "timestamp": "1710000000",
          "type": "text",
          "text": { "body": "show me kurtas under 500" }
        }]
      },
      "field": "messages"
    }]
  }]
}

Response: 200 OK (empty body, returned within 5 seconds)

Internal Processing:
  1. Validate X-Hub-Signature-256 against app secret
  2. Extract message ID, check Redis dedup set
  3. If new: enqueue to message queue with partition key = {tenant_id}:{conversation_id}
  4. Respond 200 immediately
```

### 2. Send Message API (Internal)

```
POST /api/v1/messages/send
Headers:
  Authorization: Bearer {internal_service_token}
  X-Tenant-ID: {tenant_id}

Request Body:
{
  "conversation_id": "conv_abc123",
  "message_type": "interactive",
  "interactive": {
    "type": "product_list",
    "header": { "type": "text", "text": "Kurtas Under ₹500" },
    "body": { "text": "Here are the matching products:" },
    "action": {
      "catalog_id": "cat_xyz",
      "sections": [{
        "title": "Cotton Kurtas",
        "product_items": [
          { "product_retailer_id": "SKU001" },
          { "product_retailer_id": "SKU002" },
          { "product_retailer_id": "SKU003" }
        ]
      }]
    }
  },
  "priority": "CONVERSATIONAL"
}

Response: 200 OK
{
  "message_id": "wamid.sent_xxxx",
  "status": "queued",
  "estimated_delivery_ms": 1500
}
```

### 3. Catalog Product CRUD

```
POST /api/v1/catalog/products
Headers:
  Authorization: Bearer {merchant_token}
  X-Tenant-ID: {tenant_id}

Request Body:
{
  "name": "Blue Cotton Kurta",
  "description": "Handloom cotton kurta, ideal for daily wear",
  "category": "Clothing > Men > Kurtas",
  "price": 45000,
  "currency": "INR",
  "images": [
    { "url": "https://cdn.example.com/kurta-blue-front.jpg" },
    { "url": "https://cdn.example.com/kurta-blue-back.jpg" }
  ],
  "variants": [
    { "attributes": {"size": "S"}, "price": 45000, "stock": 15, "sku": "BK-S" },
    { "attributes": {"size": "M"}, "price": 45000, "stock": 25, "sku": "BK-M" },
    { "attributes": {"size": "L"}, "price": 45000, "stock": 20, "sku": "BK-L" },
    { "attributes": {"size": "XL"}, "price": 49000, "stock": 10, "sku": "BK-XL" }
  ],
  "search_keywords": ["kurta", "cotton", "handloom", "blue"],
  "search_keywords_vernacular": ["कुर्ता", "सूती", "नीला"],
  "track_inventory": true,
  "low_stock_threshold": 5
}

Response: 201 Created
{
  "product_id": "prod_abc123",
  "retailer_id": "BK-MAIN",
  "wa_sync_status": "PENDING",
  "variants_created": 4
}
```

### 4. Cart Operations

```
POST /api/v1/cart/items
Headers:
  Authorization: Bearer {internal_service_token}
  X-Tenant-ID: {tenant_id}

Request Body:
{
  "customer_id": "cust_xyz",
  "conversation_id": "conv_abc123",
  "product_id": "prod_abc123",
  "variant_id": "var_m",
  "quantity": 2
}

Response: 200 OK
{
  "cart_id": "cart_456",
  "items": [
    {
      "item_id": "item_001",
      "product_name": "Blue Cotton Kurta (M)",
      "quantity": 2,
      "unit_price": 45000,
      "total_price": 90000
    }
  ],
  "subtotal": 90000,
  "tax": 4500,
  "shipping": 0,
  "total": 94500,
  "currency": "INR",
  "item_count": 1,
  "expires_at": "2026-03-17T10:00:00Z"
}

DELETE /api/v1/cart/items/{item_id}
Response: 200 OK (updated cart summary)
```

### 5. Order Creation and Management

```
POST /api/v1/orders
Headers:
  Authorization: Bearer {internal_service_token}
  X-Tenant-ID: {tenant_id}

Request Body:
{
  "cart_id": "cart_456",
  "customer_id": "cust_xyz",
  "conversation_id": "conv_abc123",
  "shipping_address": {
    "name": "Rajesh Kumar",
    "phone": "91XXXXXXXXXX",
    "line1": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pin_code": "560001"
  },
  "payment_method": "UPI"
}

Response: 201 Created
{
  "order_id": "ORD-20260310-A1B2",
  "status": "PAYMENT_PENDING",
  "total": 94500,
  "payment_link": "upi://pay?pa=merchant@upi&pn=StoreName&am=945.00&tr=ORD-20260310-A1B2",
  "payment_link_expires": "2026-03-10T10:15:00Z",
  "items": [...],
  "estimated_delivery": "2026-03-14"
}

GET /api/v1/orders/{order_id}
Response: 200 OK (full order details with status history)

POST /api/v1/orders/{order_id}/cancel
Request: { "reason": "Customer changed mind" }
Response: 200 OK { "status": "CANCELLED", "refund_status": "INITIATED" }
```

### 6. Broadcast Campaign API

```
POST /api/v1/campaigns
Headers:
  Authorization: Bearer {merchant_token}
  X-Tenant-ID: {tenant_id}

Request Body:
{
  "name": "Diwali Sale 2026",
  "template_name": "diwali_sale_v2",
  "template_language": "hi",
  "template_variables": [
    { "position": 1, "source": "PROFILE_FIELD", "field": "identity.name", "default": "Customer" },
    { "position": 2, "source": "STATIC_VALUE", "static_value": "50%" }
  ],
  "audience": {
    "segment_rules": [
      { "field": "commerce.total_orders", "operator": "GTE", "value": 1 },
      { "field": "preferences.notification_opt_in", "operator": "EQ", "value": true },
      { "field": "engagement.last_contact_at", "operator": "GTE", "value": "2026-01-01" }
    ]
  },
  "scheduling": {
    "scheduled_at": "2026-10-20T10:00:00+05:30",
    "send_window_start": "10:00",
    "send_window_end": "20:00"
  }
}

Response: 201 Created
{
  "campaign_id": "camp_diwali_001",
  "status": "SCHEDULED",
  "estimated_audience": 45000,
  "estimated_cost": 36000.00,
  "estimated_cost_currency": "INR",
  "excluded_by_frequency_cap": 3200,
  "excluded_by_opt_out": 1800,
  "scheduled_at": "2026-10-20T10:00:00+05:30"
}
```

### 7. Payment Webhook Receiver

```
POST /webhook/payment/{gateway_id}
Headers:
  X-Payment-Signature: {hmac_signature}

Request Body:
{
  "event": "payment.captured",
  "payment_id": "pay_abc123",
  "order_id": "ORD-20260310-A1B2",
  "amount": 94500,
  "currency": "INR",
  "method": "upi",
  "upi": {
    "vpa": "customer@upi",
    "transaction_id": "TXN123456"
  },
  "captured_at": "2026-03-10T10:05:30Z"
}

Response: 200 OK
{
  "status": "acknowledged",
  "order_status": "PAID"
}

Internal Processing:
  1. Validate payment signature
  2. Idempotent check: if order already PAID, skip
  3. Transition order state: PAYMENT_PENDING → PAID → CONFIRMED
  4. Send order confirmation template message to customer
  5. Notify merchant dashboard
  6. Record payment event in reconciliation ledger
```

### 8. Agent Routing and Handoff

```
POST /api/v1/conversations/{conversation_id}/escalate
Headers:
  Authorization: Bearer {internal_service_token}

Request Body:
{
  "reason": "LOW_CONFIDENCE",
  "ai_confidence": 0.45,
  "last_intent": "PRODUCT_COMPLAINT",
  "customer_sentiment": -0.6,
  "required_skills": ["support", "returns"],
  "preferred_language": "hi",
  "priority": "HIGH"
}

Response: 200 OK
{
  "escalation_id": "esc_abc",
  "assigned_agent_id": "agent_raj",
  "estimated_wait_seconds": 30,
  "queue_position": 2,
  "context_transferred": true
}

POST /api/v1/conversations/{conversation_id}/return-to-bot
Headers:
  Authorization: Bearer {agent_token}

Request Body:
{
  "resolution_notes": "Customer wanted size exchange, initiated return for L size",
  "resolution_status": "RESOLVED"
}

Response: 200 OK
```

---

## Core Algorithms

### Algorithm 1: Intent Classification with Code-Mixed Language Support

```
FUNCTION classify_intent(message, conversation_context):
    // Step 1: Language detection with code-mixing awareness
    tokens = tokenize(message.text)
    per_token_languages = []
    FOR EACH token IN tokens:
        lang = detect_language(token)  // returns (language, confidence)
        per_token_languages.APPEND(lang)

    dominant_language = majority_vote(per_token_languages)
    is_code_mixed = count_unique_languages(per_token_languages) > 1

    // Step 2: Normalize code-mixed input
    IF is_code_mixed:
        normalized_text = transliterate_to_common_script(message.text, target="latin")
    ELSE:
        normalized_text = message.text

    // Step 3: Generate multilingual embedding
    embedding = multilingual_encoder.encode(normalized_text)  // shared embedding space

    // Step 4: Intent classification
    intent_scores = intent_classifier.predict(embedding)
    // Classifier outputs: [BROWSE, SEARCH, ADD_TO_CART, REMOVE_FROM_CART,
    //                       VIEW_CART, CHECKOUT, ORDER_STATUS, TRACK_ORDER,
    //                       PAYMENT_QUERY, PRODUCT_QUESTION, COMPLAINT,
    //                       GREETING, FAREWELL, GENERAL_QUERY]

    top_intent = argmax(intent_scores)
    confidence = max(intent_scores)

    // Step 5: Context-aware intent refinement
    IF confidence < AMBIGUITY_THRESHOLD (0.75):
        // Use conversation context to disambiguate
        context_features = extract_context_features(conversation_context)
        // e.g., if last message was product display, "yes" → ADD_TO_CART
        // if last message was cart summary, "yes" → CHECKOUT
        refined_scores = context_refiner.predict(intent_scores, context_features)
        top_intent = argmax(refined_scores)
        confidence = max(refined_scores)

    // Step 6: Entity extraction
    entities = entity_extractor.extract(normalized_text, top_intent)
    // Entities: product_name, quantity, color, size, price_range, order_id

    // Step 7: Coreference resolution
    IF entities.contains_pronoun("it", "this", "that", "wo", "ye"):
        resolved_entity = resolve_from_context(
            pronoun=entities.pronoun,
            context=conversation_context.active_product_ids,
            recent_messages=conversation_context.context_window[-5:]
        )
        entities.replace_pronoun(resolved_entity)

    // Step 8: Routing decision
    IF confidence >= HIGH_CONFIDENCE (0.85):
        route = DETERMINISTIC_FLOW
    ELSE IF confidence >= MEDIUM_CONFIDENCE (0.70):
        route = LLM_WITH_FLOW_CONTEXT
    ELSE:
        route = HUMAN_AGENT_ESCALATION

    RETURN IntentResult(
        intent=top_intent,
        confidence=confidence,
        entities=entities,
        language=dominant_language,
        is_code_mixed=is_code_mixed,
        route=route
    )
```

### Algorithm 2: Catalog Search with Vernacular Support

```
FUNCTION search_catalog(query, tenant_id, language, conversation_context):
    // Step 1: Query preprocessing
    normalized_query = normalize(query)  // lowercase, remove punctuation

    // Step 2: Transliteration expansion
    transliterations = []
    IF language != "en":
        // "kurta" → ["कुर्ता", "குர்தா", "kurta"]
        transliterations = transliterate_all_scripts(normalized_query)

    // Step 3: Synonym expansion
    synonyms = synonym_dictionary.lookup(normalized_query, language)
    // "shirt" → ["shirt", "top", "tshirt"]

    expanded_queries = [normalized_query] + transliterations + synonyms

    // Step 4: Parse structured filters from query
    filters = extract_filters(normalized_query)
    // "red kurta under 500" → {color: "red", category: "kurta", price_max: 500}
    // "mujhe blue wala dikhao" → {color: "blue"}

    // Step 5: Keyword search (inverted index)
    keyword_results = inverted_index.search(
        queries=expanded_queries,
        tenant_id=tenant_id,
        filters=filters,
        limit=50
    )

    // Step 6: Semantic search (vector similarity)
    query_embedding = multilingual_encoder.encode(normalized_query)
    semantic_results = vector_index.search(
        embedding=query_embedding,
        tenant_id=tenant_id,
        filters=filters,
        limit=50
    )

    // Step 7: Merge and rank results
    merged = merge_results(keyword_results, semantic_results,
                           keyword_weight=0.6, semantic_weight=0.4)

    // Step 8: Context-aware re-ranking
    IF conversation_context.active_product_ids IS NOT EMPTY:
        // Boost products similar to recently viewed
        FOR EACH product IN merged:
            context_similarity = compute_similarity(
                product.embedding,
                avg_embedding(conversation_context.active_product_ids)
            )
            product.score += context_similarity * CONTEXT_BOOST (0.2)

    // Step 9: Stock-aware filtering
    results = []
    FOR EACH product IN sorted(merged, by=score, descending=True):
        IF product.stock_status != OUT_OF_STOCK:
            results.APPEND(product)
        IF len(results) >= 10:
            BREAK

    // Step 10: Format for WhatsApp interactive message
    IF len(results) == 1:
        message_format = SINGLE_PRODUCT_MESSAGE
    ELSE IF len(results) <= 30:
        message_format = MULTI_PRODUCT_MESSAGE
    ELSE:
        message_format = CATALOG_BROWSE  // link to full catalog

    RETURN SearchResult(
        products=results,
        message_format=message_format,
        query_language=language,
        filters_applied=filters
    )
```

### Algorithm 3: Order State Machine with Compensating Transactions

```
FUNCTION transition_order_state(order_id, target_state, actor, metadata):
    // Step 1: Load current order state
    order = order_store.get(order_id)
    current_state = order.state.current_status

    // Step 2: Validate transition
    valid_transitions = {
        CREATED:            [PAYMENT_PENDING, CANCELLED],
        PAYMENT_PENDING:    [PAID, CANCELLED],
        PAID:               [CONFIRMED, REFUND_PROCESSING],
        CONFIRMED:          [PROCESSING, CANCELLED],
        PROCESSING:         [SHIPPED, CANCELLED],
        SHIPPED:            [OUT_FOR_DELIVERY, RETURN_REQUESTED],
        OUT_FOR_DELIVERY:   [DELIVERED, RETURN_REQUESTED],
        DELIVERED:          [COMPLETED, RETURN_REQUESTED],
        RETURN_REQUESTED:   [RETURN_PICKED, COMPLETED],
        RETURN_PICKED:      [REFUND_PROCESSING],
        REFUND_PROCESSING:  [REFUNDED],
        CANCELLED:          [REFUND_PROCESSING]  // if payment was made
    }

    IF target_state NOT IN valid_transitions[current_state]:
        RAISE InvalidTransitionError(current_state, target_state)

    // Step 3: Execute transition side effects
    side_effects = []

    SWITCH target_state:
        CASE PAYMENT_PENDING:
            payment_link = payment_service.create_payment_link(order)
            side_effects.APPEND(SendPaymentRequestMessage(order, payment_link))
            side_effects.APPEND(SchedulePaymentTimeout(order, minutes=15))

        CASE PAID:
            inventory_service.confirm_reservation(order.items)
            side_effects.APPEND(SendOrderConfirmationMessage(order))
            side_effects.APPEND(NotifyMerchantDashboard(order))

        CASE CONFIRMED:
            side_effects.APPEND(SendProcessingMessage(order))

        CASE SHIPPED:
            tracking = shipping_service.get_tracking(order.shipping.tracking_number)
            side_effects.APPEND(SendShippedMessage(order, tracking))
            side_effects.APPEND(ScheduleTrackingPolling(order, interval_hours=6))

        CASE DELIVERED:
            side_effects.APPEND(SendDeliveryConfirmationMessage(order))
            side_effects.APPEND(ScheduleReviewRequest(order, delay_hours=24))

        CASE CANCELLED:
            inventory_service.release_reservation(order.items)
            IF order.payment.payment_status == COMPLETED:
                refund_id = payment_service.initiate_refund(order)
                side_effects.APPEND(SendCancellationWithRefundMessage(order, refund_id))
            ELSE:
                side_effects.APPEND(SendCancellationMessage(order))

        CASE RETURN_REQUESTED:
            side_effects.APPEND(SendReturnAcknowledgementMessage(order))
            side_effects.APPEND(ScheduleReturnPickup(order))

        CASE REFUNDED:
            side_effects.APPEND(SendRefundConfirmationMessage(order))

    // Step 4: Persist state transition (event-sourced)
    event = StatusEvent(
        status=target_state,
        timestamp=now(),
        actor=actor,
        notes=metadata.notes
    )

    TRY:
        order_store.append_event(order_id, event)
        order.state.current_status = target_state
        order.state.status_history.APPEND(event)

        // Execute side effects
        FOR EACH effect IN side_effects:
            TRY:
                effect.execute()
            CATCH SideEffectError as e:
                // Log failure but don't roll back state transition
                // Side effects are eventually consistent
                error_queue.enqueue(FailedSideEffect(order_id, effect, e))
    CATCH ConcurrentModificationError:
        // Another process modified the order simultaneously
        // Retry with fresh state
        RETURN transition_order_state(order_id, target_state, actor, metadata)

    RETURN order
```

### Algorithm 4: Broadcast Campaign Execution with Rate Limiting

```
FUNCTION execute_campaign(campaign_id):
    campaign = campaign_store.get(campaign_id)
    tenant = tenant_store.get(campaign.tenant_id)
    template = template_store.get(campaign.definition.template_name)

    // Step 1: Build audience list with filtering
    audience = customer_store.query(
        tenant_id=campaign.tenant_id,
        rules=campaign.audience.segment_rules
    )

    // Step 2: Filter by compliance constraints
    eligible_contacts = []
    excluded_frequency_cap = 0
    excluded_opt_out = 0
    excluded_quality = 0

    FOR EACH contact IN audience:
        // Check opt-in status
        IF NOT contact.preferences.notification_opt_in:
            excluded_opt_out += 1
            CONTINUE

        // Check frequency cap (max 2 marketing messages per 24h)
        IF template.category == MARKETING:
            marketing_count_24h = frequency_cap_store.get_count(
                customer_id=contact.customer_id,
                category="MARKETING",
                window_hours=24
            )
            IF marketing_count_24h >= 2:
                excluded_frequency_cap += 1
                CONTINUE

        // Check quality signals (don't send to users who block/report)
        IF contact.broadcast.quality_signals.block_reported:
            excluded_quality += 1
            CONTINUE

        eligible_contacts.APPEND(contact)

    campaign.audience.actual_audience = len(eligible_contacts)
    campaign.audience.excluded_count = excluded_frequency_cap + excluded_opt_out + excluded_quality

    // Step 3: Batch contacts for parallel processing
    batches = split_into_batches(eligible_contacts, batch_size=1000)

    // Step 4: Process batches with rate limiting
    rate_limiter = MultiDimensionalRateLimiter(
        per_number_tps=tenant.whatsapp.messaging_tier.max_tps,
        portfolio_daily_limit=tenant.whatsapp.messaging_tier.daily_limit,
        quality_throttle=get_quality_throttle(tenant.whatsapp.quality_rating)
    )

    campaign.execution.status = IN_PROGRESS
    campaign.execution.started_at = now()

    FOR EACH batch IN batches:
        IF campaign.execution.status == PAUSED OR CANCELLED:
            BREAK

        FOR EACH contact IN batch:
            // Wait for rate limit token
            rate_limiter.acquire()

            // Render personalized template
            rendered = render_template(template, contact, campaign.definition.template_variables)

            // Enqueue for sending (lower priority than conversational messages)
            outbound_queue.enqueue(
                OutboundMessage(
                    tenant_id=campaign.tenant_id,
                    customer_phone=contact.wa_phone_number,
                    template=rendered,
                    priority=BROADCAST,  // lower than CONVERSATIONAL
                    campaign_id=campaign_id
                )
            )

            // Update frequency cap counter
            frequency_cap_store.increment(
                customer_id=contact.customer_id,
                category=template.category,
                window_hours=24
            )

        // Check quality rating after each batch
        current_quality = whatsapp_api.get_quality_rating(tenant.whatsapp.phone_number_id)
        IF current_quality < tenant.whatsapp.quality_rating:
            // Quality degraded - pause campaign
            campaign.execution.status = PAUSED
            alert_merchant(campaign, "Quality rating dropped during campaign, pausing send")
            BREAK

    // Step 5: Finalize campaign
    IF campaign.execution.status == IN_PROGRESS:
        campaign.execution.status = COMPLETED
    campaign.execution.completed_at = now()
    campaign_store.update(campaign)

    RETURN campaign
```

### Algorithm 5: Conversation Context Management and Session Handling

```
FUNCTION manage_conversation_context(message, tenant_id):
    conversation_id = derive_conversation_id(tenant_id, message.from)

    // Step 1: Load or create conversation
    conversation = cache.get(conversation_id)
    IF conversation IS NULL:
        conversation = conversation_store.load(conversation_id)
        IF conversation IS NULL:
            // New conversation
            conversation = ConversationThread(
                conversation_id=conversation_id,
                tenant_id=tenant_id,
                customer_id=get_or_create_customer(message.from, tenant_id),
                wa_phone_number=message.from,
                state=ConversationState(status=ACTIVE, last_message_at=now())
            )
            // Send greeting message if configured
            tenant_config = tenant_store.get(tenant_id)
            IF tenant_config.chatbot.greeting_message:
                send_greeting(conversation, tenant_config.chatbot.greeting_message)

    // Step 2: Update session window
    // WhatsApp allows free-form responses within 24h of last customer message
    conversation.state.session_window = message.timestamp + 24_HOURS
    conversation.state.last_message_at = message.timestamp
    conversation.state.last_message_dir = INBOUND

    // Step 3: Check business hours for agent routing
    tenant_config = tenant_store.get(tenant_id)
    is_business_hours = check_business_hours(tenant_config.chatbot.business_hours)

    // Step 4: Update context window (sliding window of last 10 messages)
    intent_result = classify_intent(message, conversation.context)

    context_entry = ContextEntry(
        message_id=message.id,
        timestamp=message.timestamp,
        direction=INBOUND,
        intent=intent_result.intent,
        entities=intent_result.entities,
        confidence=intent_result.confidence
    )

    conversation.context.context_window.APPEND(context_entry)
    IF len(conversation.context.context_window) > 10:
        conversation.context.context_window.POP_FRONT()

    // Step 5: Update active product context
    IF intent_result.entities.has("product_id"):
        conversation.context.active_product_ids = [intent_result.entities.product_id]
    ELSE IF intent_result.intent IN [BROWSE, SEARCH]:
        // Search will update active products after results are returned
        PASS

    // Step 6: Route to appropriate handler
    conversation.context.language_detected = intent_result.language
    conversation.context.active_intent = intent_result.intent

    IF conversation.state.status == AGENT_HANDLING:
        // Message goes to assigned agent, not bot
        forward_to_agent(conversation, message)
    ELSE IF intent_result.route == HUMAN_AGENT_ESCALATION:
        IF is_business_hours:
            escalate_to_agent(conversation, intent_result)
        ELSE:
            send_away_message(conversation, tenant_config.chatbot.away_message)
            queue_for_next_business_hour(conversation)
    ELSE:
        // Bot handles (deterministic or LLM)
        process_intent(conversation, intent_result)

    // Step 7: Persist updated conversation state
    cache.set(conversation_id, conversation, ttl=24_HOURS)
    conversation_store.save(conversation)

    RETURN conversation
```
