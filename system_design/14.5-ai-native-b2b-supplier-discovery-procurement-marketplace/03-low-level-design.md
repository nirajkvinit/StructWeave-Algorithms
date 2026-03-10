# 14.5 AI-Native B2B Supplier Discovery & Procurement Marketplace — Low-Level Design

## Data Models

### Supplier Profile

The supplier profile is the core entity representing a business on the platform, combining identity, verification status, catalog metadata, and continuously updated trust metrics.

```
SupplierProfile:
  supplier_id:            string          # globally unique supplier identifier
  profile_version:        uint64          # monotonically increasing on every update
  last_updated:           datetime_us     # microsecond precision

  identity:
    business_name:        string
    legal_entity_name:    string
    gstin:                string          # GST identification number
    pan:                  string          # PAN for tax verification
    incorporation_number: string          # CIN / registration number
    business_type:        enum[MANUFACTURER, DISTRIBUTOR, TRADER, WHOLESALER, EXPORTER]
    year_established:     int
    employee_count_range: enum[1_10, 11_50, 51_200, 201_500, 500_PLUS]
    annual_revenue_range: enum[BELOW_1CR, 1CR_10CR, 10CR_50CR, 50CR_100CR, ABOVE_100CR]
    primary_address:      Address
    factory_addresses:    [Address]
    contact:
      primary_email:      string
      primary_phone:      string
      whatsapp_number:    string
      website:            string

  verification:
    tier:                 enum[UNVERIFIED, BASIC, VERIFIED, PREMIUM]
    gstin_verified:       boolean
    pan_verified:         boolean
    bank_account_verified: boolean
    factory_audit:
      status:             enum[NOT_REQUESTED, SCHEDULED, COMPLETED, EXPIRED]
      audit_date:         date
      audit_provider:     string          # third-party audit firm
      audit_report_id:    string
      audit_expiry:       date            # typically valid for 1 year
    certifications:       [Certification]
    last_verification_date: date

  catalog_metadata:
    total_sku_count:      int
    active_sku_count:     int
    primary_categories:   [string]        # top-level product categories
    leaf_categories:      [string]        # detailed category classifications
    catalog_completeness: float64         # 0.0 - 1.0 (% of listings with full attributes)
    last_catalog_update:  datetime
    price_currency:       string          # default pricing currency

  capabilities:
    manufacturing_processes: [string]     # e.g., ["CNC machining", "injection molding"]
    materials_handled:    [string]        # e.g., ["SS304", "SS316", "aluminum 6061"]
    quality_standards:    [string]        # e.g., ["ISO 9001", "ISO 14001", "CE"]
    min_order_value:      float64
    typical_lead_time_days: int
    export_capable:       boolean
    export_countries:     [string]        # list of countries served

  trust:
    overall_score:        float64         # 0.0 - 1.0 composite trust index
    verification_score:   float64         # 0.0 - 1.0
    transaction_score:    float64         # 0.0 - 1.0
    behavioral_score:     float64         # 0.0 - 1.0
    review_score:         float64         # 0.0 - 1.0
    engagement_score:     float64         # 0.0 - 1.0
    total_completed_orders: int
    fulfillment_rate:     float64         # 0.0 - 1.0
    quality_rejection_rate: float64       # 0.0 - 1.0
    on_time_delivery_rate: float64        # 0.0 - 1.0
    avg_response_time_hours: float64
    review_count:         int
    avg_review_rating:    float64         # 1.0 - 5.0
    trust_updated_at:     datetime

  status:
    account_status:       enum[ACTIVE, SUSPENDED, UNDER_REVIEW, DEACTIVATED]
    suspension_reason:    string
    joined_date:          date

Certification:
  cert_type:              string          # e.g., "ISO 9001", "CE", "FDA"
  cert_number:            string
  issuing_body:           string
  issue_date:             date
  expiry_date:            date
  verified:               boolean         # platform has verified authenticity
  document_id:            string          # reference to uploaded certificate

Address:
  line1:                  string
  line2:                  string
  city:                   string
  state:                  string
  country:                string
  postal_code:            string
  geo_coordinates:        [float64, float64]  # [latitude, longitude]
```

### Product Listing

```
ProductListing:
  listing_id:             string          # globally unique listing identifier
  supplier_id:            string
  listing_version:        uint64

  identity:
    title:                string          # product title (max 200 chars)
    description:          string          # detailed description (max 5000 chars)
    category_path:        [string]        # hierarchical category ["Industrial Supplies", "Pipes & Fittings", "Stainless Steel Pipes"]
    leaf_category_id:     string          # taxonomy leaf node ID
    brand:                string
    model_number:         string
    sku:                  string          # supplier's internal SKU

  specifications:
    structured_attrs:     map[string, AttributeValue]  # normalized key-value pairs
    raw_specifications:   string          # original unstructured spec text
    unit_system:          enum[METRIC, IMPERIAL, MIXED]
    standards_compliance: [string]        # e.g., ["ASTM A312", "IS 6392"]

  pricing:
    base_price:           float64
    currency:             string          # ISO 4217 currency code
    price_unit:           string          # "per piece", "per kg", "per meter"
    moq:                  int             # minimum order quantity
    price_tiers:          [PriceTier]     # volume discount tiers
    price_valid_until:    date
    price_last_updated:   datetime
    negotiable:           boolean

  media:
    primary_image_url:    string
    additional_images:    [string]        # max 10 images
    specification_pdf:    string          # URL to spec sheet
    cad_file:             string          # URL to CAD drawing
    video_url:            string

  logistics:
    weight_kg:            float64
    dimensions_cm:        [float64, float64, float64]  # L × W × H
    packaging_type:       string
    hs_code:              string          # harmonized system code for customs
    lead_time_days:       int
    shipping_from:        Address
    shipping_regions:     [string]        # serviceable regions/countries
    free_shipping_moq:    int             # MOQ for free shipping (0 = no free shipping)

  embeddings:
    material_vector:      [float64]       # 96-dim material embedding
    dimension_vector:     [float64]       # 96-dim dimension embedding
    certification_vector: [float64]       # 64-dim certification embedding
    general_vector:       [float64]       # 128-dim general product embedding
    embedding_version:    string          # model version that generated embeddings

  quality:
    listing_quality_score: float64        # 0.0 - 1.0 (image quality + description completeness)
    duplicate_cluster_id: string          # entity resolution cluster (null if unique)
    is_canonical:         boolean         # is this the canonical listing in a duplicate cluster
    last_quality_audit:   datetime

  status:
    listing_status:       enum[DRAFT, ACTIVE, OUT_OF_STOCK, PAUSED, REJECTED]
    rejection_reason:     string
    created_at:           datetime
    updated_at:           datetime

AttributeValue:
  value:                  string          # raw value as entered
  normalized_value:       float64         # normalized to canonical units (null for non-numeric)
  canonical_unit:         string          # SI unit (mm, kg, Pa, etc.)
  original_unit:          string          # as specified by supplier
  confidence:             float64         # extraction confidence (0.0 - 1.0)

PriceTier:
  min_quantity:           int
  max_quantity:           int             # null for last tier
  unit_price:             float64
  discount_percent:       float64         # relative to base_price
```

### RFQ Record

```
RFQRecord:
  rfq_id:                 string          # globally unique RFQ identifier
  buyer_id:               string
  rfq_version:            uint64

  requirements:
    title:                string          # brief description of requirement
    description:          string          # detailed requirement narrative
    parsed_specifications: map[string, AttributeValue]  # extracted from description/docs
    category_id:          string          # matched product category
    quantity:             int
    quantity_unit:        string
    required_certifications: [string]
    delivery_location:    Address
    required_delivery_date: date
    budget_range:         [float64, float64]  # [min, max] (null if not specified)
    payment_terms:        string          # e.g., "30 days from delivery"
    attached_documents:   [string]        # URLs to specification documents
    specification_vectors: [float64]      # embedding of parsed requirements

  routing:
    matched_suppliers:    [SupplierMatch]
    distributed_to:       [string]        # supplier_ids that received the RFQ
    distribution_timestamp: datetime
    routing_score:        float64         # optimization objective value
    routing_constraints_met: boolean

  bidding:
    bid_deadline:         datetime
    bids_received:        [Bid]
    bid_count:            int
    normalized_bids:      [NormalizedBid]
    award_recommendation: AwardRecommendation

  lifecycle:
    status:               enum[DRAFT, ACTIVE, BIDDING_OPEN, BIDDING_CLOSED,
                                AWARDED, CANCELLED, EXPIRED]
    created_at:           datetime
    closed_at:            datetime
    awarded_supplier_id:  string
    po_id:                string          # linked purchase order (after award)

SupplierMatch:
  supplier_id:            string
  capability_score:       float64         # 0.0 - 1.0 (how well supplier matches requirements)
  trust_score:            float64         # supplier's current trust index
  engagement_probability: float64         # P(supplier will respond to this RFQ)
  estimated_price:        float64         # predicted price based on historical data
  selected:               boolean         # was this supplier selected for distribution?
  selection_reason:       string          # why selected or excluded

Bid:
  bid_id:                 string
  supplier_id:            string
  submitted_at:           datetime
  unit_price:             float64
  currency:               string
  price_unit:             string
  total_price:            float64
  moq:                    int
  lead_time_days:         int
  shipping_cost:          float64
  payment_terms:          string
  validity_days:          int
  notes:                  string
  attached_documents:     [string]
  compliance_matrix:      map[string, boolean]  # spec requirement → met/not-met

NormalizedBid:
  bid_id:                 string
  supplier_id:            string
  normalized_unit_price:  float64         # converted to buyer's currency and units
  total_cost_of_ownership: float64        # price + shipping + duties + quality risk
  price_vs_benchmark:     float64         # % above/below market benchmark
  supplier_trust_score:   float64
  spec_compliance_score:  float64         # 0.0 - 1.0
  delivery_reliability:   float64         # historical on-time rate
  composite_rank:         int

AwardRecommendation:
  recommended_supplier_id: string
  recommendation_score:   float64         # composite score
  justification:          string          # human-readable explanation
  alternative_suppliers:  [string]        # ranked alternatives
  price_savings_vs_avg:   float64         # savings vs. average bid
  risk_assessment:        string          # any risk factors identified
```

### Order Record

```
OrderRecord:
  order_id:               string          # globally unique order identifier
  rfq_id:                 string          # originating RFQ (null if direct order)
  buyer_id:               string
  supplier_id:            string
  order_version:          uint64

  purchase_order:
    po_number:            string
    po_date:              date
    items:                [OrderItem]
    total_amount:         float64
    currency:             string
    payment_terms:        string
    delivery_terms:       string          # incoterms (e.g., "FOB", "CIF", "EXW")
    delivery_address:     Address
    required_delivery_date: date
    special_instructions: string

  escrow:
    escrow_id:            string
    escrow_status:        enum[PENDING_DEPOSIT, FUNDED, PARTIALLY_RELEASED,
                               RELEASED, REFUNDED, DISPUTED]
    deposited_amount:     float64
    released_amount:      float64
    held_amount:          float64
    deposit_date:         datetime
    release_date:         datetime

  milestones:             [OrderMilestone]

  shipment:
    tracking_number:      string
    logistics_provider:   string
    shipped_date:         date
    expected_delivery:    date
    actual_delivery:      date
    shipment_status:      enum[NOT_SHIPPED, PICKED_UP, IN_TRANSIT,
                               OUT_FOR_DELIVERY, DELIVERED, RETURNED]

  quality:
    inspection_required:  boolean
    inspection_provider:  string
    inspection_status:    enum[NOT_REQUIRED, SCHEDULED, IN_PROGRESS, PASSED, FAILED]
    inspection_report_id: string
    quality_issues:       [QualityIssue]

  status:
    current_state:        enum[PO_CREATED, ACKNOWLEDGED, PRODUCTION, QUALITY_CHECK,
                               DISPATCHED, IN_TRANSIT, DELIVERED, ACCEPTED,
                               DISPUTED, COMPLETED, CANCELLED]
    state_history:        [StateTransition]

  performance:
    delivery_days_actual: int
    delivery_days_promised: int
    quality_score:        float64         # 0.0 - 1.0
    communication_score:  float64         # 0.0 - 1.0

OrderItem:
  listing_id:             string
  description:            string
  quantity:               int
  unit_price:             float64
  total_price:            float64
  specifications:         map[string, string]

OrderMilestone:
  milestone_type:         enum[PO_SENT, ACKNOWLEDGED, PRODUCTION_START,
                               PRODUCTION_50PCT, PRODUCTION_COMPLETE,
                               QUALITY_INSPECTION, DISPATCHED, DELIVERED]
  expected_date:          date
  actual_date:            date
  status:                 enum[PENDING, COMPLETED, DELAYED, SKIPPED]
  notes:                  string
  evidence:               [string]        # photos, documents

StateTransition:
  from_state:             string
  to_state:               string
  timestamp:              datetime
  triggered_by:           enum[BUYER, SUPPLIER, SYSTEM, ADMIN]
  reason:                 string

QualityIssue:
  issue_type:             enum[SPECIFICATION_DEVIATION, QUANTITY_SHORTFALL,
                               DAMAGE, PACKAGING, DOCUMENTATION]
  severity:               enum[MINOR, MAJOR, CRITICAL]
  description:            string
  evidence:               [string]
  resolution:             enum[PENDING, REWORK, REPLACEMENT, REFUND, ACCEPTED]
```

### Trust Signal Event

```
TrustSignalEvent:
  event_id:               string
  supplier_id:            string
  timestamp:              datetime
  signal_category:        enum[VERIFICATION, TRANSACTION, BEHAVIORAL, REVIEW, ENGAGEMENT]

  verification_signal:
    signal_type:          enum[GSTIN_VERIFIED, PAN_VERIFIED, BANK_VERIFIED,
                               FACTORY_AUDITED, CERT_VERIFIED, CERT_EXPIRED]
    verification_provider: string
    result:               enum[PASS, FAIL, EXPIRED]
    details:              string

  transaction_signal:
    order_id:             string
    signal_type:          enum[ORDER_COMPLETED, ORDER_CANCELLED, QUALITY_PASS,
                               QUALITY_FAIL, ON_TIME_DELIVERY, LATE_DELIVERY,
                               DISPUTE_RAISED, DISPUTE_RESOLVED]
    metric_value:         float64         # e.g., days late, quality score
    order_value:          float64         # for value-weighted metrics

  behavioral_signal:
    signal_type:          enum[RFQ_RESPONDED, RFQ_IGNORED, QUOTE_ACCURATE,
                               QUOTE_DEVIATED, FAST_RESPONSE, SLOW_RESPONSE]
    rfq_id:               string
    response_time_hours:  float64
    accuracy_delta:       float64         # quoted vs. final price deviation

  review_signal:
    review_id:            string
    reviewer_id:          string          # buyer who left the review
    rating:               float64         # 1.0 - 5.0
    sentiment_score:      float64         # -1.0 to 1.0 (NLP-derived)
    verified_purchase:    boolean
    manipulation_score:   float64         # 0.0 - 1.0 (probability of fake review)

  engagement_signal:
    signal_type:          enum[LOGIN, CATALOG_UPDATE, PROFILE_UPDATE,
                               PRICE_REFRESH, STOREFRONT_EDIT]
    freshness_impact:     float64         # how much this improves catalog freshness
```

### Price Benchmark Record

```
PriceBenchmarkRecord:
  category_id:            string          # product category
  specification_hash:     string          # hash of normalized specifications
  geography:              string          # buyer region for geographic pricing

  current_benchmark:
    median_price:         float64
    p25_price:            float64
    p75_price:            float64
    min_price:            float64
    max_price:            float64
    sample_count:         int             # transactions contributing to this benchmark
    currency:             string
    price_unit:           string
    last_updated:         datetime

  trend:
    price_change_30d:     float64         # % change in median over 30 days
    price_change_90d:     float64
    price_change_365d:    float64
    trend_direction:      enum[RISING, STABLE, FALLING]
    volatility:           float64         # coefficient of variation over 90 days

  commodity_correlation:
    linked_commodity:     string          # e.g., "steel_hot_rolled_coil"
    correlation_strength: float64         # -1.0 to 1.0
    commodity_price_current: float64
    commodity_price_change_30d: float64
```

---

## API Contracts

### Search API (Buyer-Facing)

```
// Semantic product and supplier search
POST /api/v1/search
Request:
  query:                  string          # natural language search query
  filters:
    categories:           [string]        # restrict to specific categories
    materials:            [string]        # material filter
    certifications:       [string]        # required certifications
    min_trust_score:      float64         # minimum supplier trust score
    price_range:          [float64, float64]  # [min, max]
    moq_max:              int             # maximum acceptable MOQ
    lead_time_max_days:   int
    supplier_location:    string          # geographic filter
    verification_tier:    [string]        # minimum verification tier
  sort_by:                enum[RELEVANCE, PRICE_LOW, PRICE_HIGH, TRUST_SCORE,
                                DELIVERY_TIME, NEWEST]
  page:                   int
  page_size:              int             # max 50
  include_benchmarks:     boolean         # include price benchmark data
Response:
  results:                [SearchResult]
  total_count:            int
  facets:                 map[string, [FacetValue]]  # category, material, certification facets
  query_understanding:
    detected_entities:    [Entity]        # extracted material, dimensions, standards
    normalized_query:     string          # query after expansion and normalization
    suggested_refinements: [string]       # alternative queries for better results
  price_benchmark:                        # populated if include_benchmarks=true
    median_price:         float64
    price_range:          [float64, float64]

SearchResult:
  listing_id:             string
  supplier_id:            string
  supplier_name:          string
  supplier_trust_score:   float64
  supplier_verification:  string          # verification tier
  product_title:          string
  product_image:          string
  price:                  float64
  currency:               string
  price_unit:             string
  moq:                    int
  lead_time_days:         int
  relevance_score:        float64
  spec_match_score:       float64         # how well specs match query
  price_vs_benchmark:     float64         # % above/below market median
  highlights:             map[string, string]  # matched terms highlighted
```

### Specification Matching API

```
// Upload specification document for matching
POST /api/v1/match/specification
Request:
  document:               binary          # PDF, image, or CAD file
  document_type:          enum[SPEC_SHEET, ENGINEERING_DRAWING, PRODUCT_IMAGE, CAD_FILE]
  additional_requirements: string         # supplementary text requirements
  filters:                               # same filter structure as search API
    categories:           [string]
    certifications:       [string]
    min_trust_score:      float64
Response:
  match_id:               string          # for async result retrieval
  status:                 enum[PROCESSING, COMPLETED]
  extracted_specifications:
    attributes:           map[string, AttributeValue]
    confidence:           float64         # overall extraction confidence
    unresolved_attributes: [string]       # attributes that could not be parsed
  matches:                [SpecificationMatch]

SpecificationMatch:
  listing_id:             string
  supplier_id:            string
  overall_compatibility:  float64         # 0.0 - 1.0
  attribute_matches:      [AttributeMatch]
  gaps:                   [string]        # requirements not met by this product
  alternatives:           [string]        # suggestions to close specification gaps

AttributeMatch:
  attribute_name:         string
  required_value:         string
  supplier_value:         string
  match_type:             enum[EXACT, EQUIVALENT, WITHIN_TOLERANCE, EXCEEDS, NOT_MET]
  normalized_deviation:   float64         # how far off (0.0 = exact match)
```

### RFQ API

```
// Create a new RFQ
POST /api/v1/rfq
Request:
  title:                  string
  description:            string          # natural language requirement description
  specifications:         map[string, string]  # structured specs (optional)
  quantity:               int
  quantity_unit:          string
  category_hint:          string          # buyer's category suggestion (optional)
  required_certifications: [string]
  delivery_location:      Address
  required_delivery_date: date
  budget_range:           [float64, float64]  # optional
  payment_terms:          string
  bid_deadline:           datetime
  documents:              [binary]        # specification attachments
  preferred_suppliers:    [string]        # supplier_ids to include (optional)
  max_suppliers:          int             # max suppliers to distribute to (default: 10)
Response:
  rfq_id:                 string
  status:                 enum[CREATED, ROUTING]
  parsed_specifications:  map[string, AttributeValue]
  matched_category:       string
  qualified_supplier_count: int           # suppliers matching requirements
  distributed_to_count:   int             # suppliers selected for distribution
  estimated_first_bid:    datetime        # predicted time of first bid
  price_benchmark:        float64         # market benchmark for this specification

// Get RFQ bids and recommendation
GET /api/v1/rfq/{rfq_id}/bids
Response:
  rfq_id:                 string
  status:                 string
  bids:                   [NormalizedBid]
  recommendation:         AwardRecommendation
  comparison_matrix:      [BidComparison]  # side-by-side bid comparison
  price_benchmark:
    median:               float64
    position_of_bids:     map[string, float64]  # bid_id → percentile

BidComparison:
  dimension:              string          # "Unit Price", "Lead Time", "Quality Score", etc.
  bids:                   map[string, string]  # bid_id → value for this dimension
  best_bid:               string          # bid_id with best value for this dimension
```

### Order Management API

```
// Create order from awarded RFQ or direct purchase
POST /api/v1/orders
Request:
  rfq_id:                 string          # from RFQ award (null for direct orders)
  supplier_id:            string
  items:                  [OrderItem]
  delivery_address:       Address
  delivery_terms:         string          # incoterms
  payment_method:         enum[ESCROW, BANK_TRANSFER, TRADE_CREDIT, LETTER_OF_CREDIT]
  milestone_payment:      boolean         # enable milestone-based payment release
  quality_inspection:     boolean         # request third-party QC
  special_instructions:   string
Response:
  order_id:               string
  po_number:              string
  escrow_id:              string          # if payment_method is ESCROW
  payment_instructions:                   # for buyer to fund escrow
    amount:               float64
    bank_details:         BankDetails
    payment_deadline:     datetime
  estimated_delivery:     date

// Update order milestone (supplier-facing)
POST /api/v1/orders/{order_id}/milestones
Request:
  milestone_type:         string
  status:                 enum[COMPLETED, DELAYED]
  notes:                  string
  evidence:               [binary]        # photos, documents
  expected_completion:    date            # updated ETA if delayed
Response:
  milestone_id:           string
  next_milestone:         string
  buyer_notified:         boolean
```

### Trust Score API (Internal)

```
// Get supplier trust score with component breakdown
GET /api/v1/trust/{supplier_id}
Response:
  supplier_id:            string
  overall_score:          float64
  tier:                   enum[UNVERIFIED, BASIC, VERIFIED, PREMIUM]
  components:
    verification:         { score: float64, weight: float64, signals: int }
    transaction:          { score: float64, weight: float64, signals: int }
    behavioral:           { score: float64, weight: float64, signals: int }
    review:               { score: float64, weight: float64, signals: int }
    engagement:           { score: float64, weight: float64, signals: int }
  key_metrics:
    fulfillment_rate:     float64
    quality_rejection_rate: float64
    on_time_delivery_rate: float64
    avg_response_hours:   float64
    review_count:         int
    avg_rating:           float64
  trend:
    score_30d_ago:        float64
    score_90d_ago:        float64
    direction:            enum[IMPROVING, STABLE, DECLINING]
  flags:
    manipulation_detected: boolean
    recent_disputes:      int
    certification_expiring: boolean
  category_ranks:         map[string, int]  # category → rank among peers
```

### Price Intelligence API

```
// Get price benchmark for a specification
POST /api/v1/price/benchmark
Request:
  category_id:            string
  specifications:         map[string, string]
  quantity:               int
  buyer_location:         string          # for geographic price adjustment
Response:
  benchmark:
    median_price:         float64
    p25_price:            float64
    p75_price:            float64
    sample_size:          int
    confidence:           float64         # 0.0 - 1.0 (low if few data points)
    currency:             string
    price_unit:           string
  trend:
    change_30d_pct:       float64
    change_90d_pct:       float64
    direction:            enum[RISING, STABLE, FALLING]
    seasonality:          string          # "peak", "off-peak", "normal"
  commodity_link:
    commodity:            string
    current_price:        float64
    correlation:          float64
  recommendation:
    buy_signal:           enum[BUY_NOW, WAIT, NEUTRAL]
    reasoning:            string

// Check if a quotation price is anomalous
POST /api/v1/price/anomaly-check
Request:
  category_id:            string
  specifications:         map[string, string]
  quoted_price:           float64
  currency:               string
  quantity:               int
  supplier_id:            string
Response:
  is_anomaly:             boolean
  anomaly_type:           enum[SUSPICIOUSLY_LOW, SUSPICIOUSLY_HIGH, NORMAL]
  deviation_from_median:  float64         # % above/below median
  risk_assessment:        string          # "Price 40% below market may indicate quality issues"
  historical_supplier_pricing: [float64]  # this supplier's past prices for similar items
```

---

## Core Algorithms

### Hybrid Search with Field-Aware Embeddings

```
FUNCTION search_products(query, filters, sort_by):
    // 1. Query understanding
    parsed_query = understand_query(query)
    // Extract: material entities, dimensions, standards, certifications
    // Normalize: units (2 inch → 50.8 mm), standards (ASTM A312 → equivalent IS codes)
    // Expand: synonyms (SS304 → stainless steel 304 → AISI 304)

    // 2. Sparse retrieval (keyword search)
    keyword_candidates = inverted_index.search(
        terms=parsed_query.expanded_terms,
        filters=apply_attribute_filters(filters),
        limit=500
    )

    // 3. Dense retrieval (vector similarity search)
    // Generate field-aware query embeddings
    material_query_vec = material_encoder.encode(parsed_query.material_entities)
    dimension_query_vec = dimension_encoder.encode(parsed_query.dimension_entities)
    cert_query_vec = cert_encoder.encode(parsed_query.certification_entities)
    general_query_vec = general_encoder.encode(parsed_query.full_text)

    // Run parallel ANN searches per field
    material_matches = vector_index.search("material", material_query_vec, k=200)
    dimension_matches = vector_index.search("dimension", dimension_query_vec, k=200)
    cert_matches = vector_index.search("certification", cert_query_vec, k=200)
    general_matches = vector_index.search("general", general_query_vec, k=200)

    // 4. Score fusion
    // Reciprocal Rank Fusion across all retrieval paths
    all_candidates = reciprocal_rank_fusion(
        keyword_candidates,
        material_matches,
        dimension_matches,
        cert_matches,
        general_matches,
        weights=[0.2, 0.25, 0.25, 0.1, 0.2]  # field-specific weights
    )

    // 5. Re-ranking with business signals
    enriched_candidates = []
    FOR candidate IN all_candidates.top(100):
        supplier = get_supplier_profile(candidate.supplier_id)
        benchmark = get_price_benchmark(candidate.category_id, candidate.specs)

        features = {
            "retrieval_score": candidate.fusion_score,
            "trust_score": supplier.trust.overall_score,
            "verification_tier": encode_tier(supplier.verification.tier),
            "price_vs_benchmark": (candidate.price - benchmark.median) / benchmark.median,
            "lead_time_score": normalize_lead_time(candidate.lead_time_days),
            "fulfillment_rate": supplier.trust.fulfillment_rate,
            "geographic_distance": compute_distance(filters.buyer_location, candidate.shipping_from),
            "catalog_freshness": days_since(candidate.price_last_updated),
            "review_score": supplier.trust.review_score,
            "listing_quality": candidate.quality.listing_quality_score,
        }

        rerank_score = reranking_model.predict(features)
        enriched_candidates.append((candidate, rerank_score))

    // 6. Sort and return top results
    ranked = sort(enriched_candidates, key=sort_by or "rerank_score")
    RETURN ranked.top(page_size)

FUNCTION reciprocal_rank_fusion(result_lists, weights):
    k = 60  # RRF constant
    scores = {}
    FOR i, result_list IN enumerate(result_lists):
        FOR rank, item IN enumerate(result_list):
            IF item.id NOT IN scores:
                scores[item.id] = 0.0
            scores[item.id] += weights[i] * (1.0 / (k + rank + 1))
    RETURN sorted(scores, by_value=DESC)
```

### Supplier Trust Score Computation

```
FUNCTION compute_trust_score(supplier_id):
    signals = trust_signal_store.get_signals(supplier_id)
    current_time = now()

    // Component 1: Verification score (no decay)
    verification_signals = signals.filter(category=VERIFICATION)
    verification_score = compute_verification_component(verification_signals)
    // Binary checks: GSTIN (0.2), PAN (0.1), bank (0.1), factory audit (0.4),
    //                certification count normalized (0.2)

    // Component 2: Transaction score (90-day half-life)
    transaction_signals = signals.filter(category=TRANSACTION)
    transaction_score = 0.0
    total_weight = 0.0
    FOR signal IN transaction_signals:
        age_days = (current_time - signal.timestamp).days
        decay_weight = 0.5 ^ (age_days / 90.0)  // exponential decay, half-life 90 days
        value_weight = log(1 + signal.order_value / 100000)  // value-weighted

        weight = decay_weight * value_weight
        total_weight += weight

        IF signal.signal_type == ORDER_COMPLETED:
            transaction_score += weight * 1.0
        ELIF signal.signal_type == ON_TIME_DELIVERY:
            transaction_score += weight * 1.0
        ELIF signal.signal_type == LATE_DELIVERY:
            transaction_score += weight * 0.3
        ELIF signal.signal_type == QUALITY_PASS:
            transaction_score += weight * 1.0
        ELIF signal.signal_type == QUALITY_FAIL:
            transaction_score += weight * 0.0
        ELIF signal.signal_type == DISPUTE_RAISED:
            transaction_score += weight * -0.5
        ELIF signal.signal_type == ORDER_CANCELLED:
            transaction_score += weight * -0.3

    transaction_score = clamp(transaction_score / max(total_weight, 1.0), 0.0, 1.0)

    // Component 3: Behavioral score (30-day half-life)
    behavioral_signals = signals.filter(category=BEHAVIORAL)
    behavioral_score = compute_behavioral_component(behavioral_signals, half_life=30)
    // Factors: response rate, response speed, quotation accuracy

    // Component 4: Review score (180-day half-life)
    review_signals = signals.filter(category=REVIEW)
    review_score = compute_review_component(review_signals, half_life=180)
    // Includes manipulation detection — discounted reviews flagged as suspicious

    // Component 5: Engagement score (30-day half-life)
    engagement_signals = signals.filter(category=ENGAGEMENT)
    engagement_score = compute_engagement_component(engagement_signals, half_life=30)
    // Catalog freshness, login activity, profile completeness

    // Composite score with category weights
    overall = (
        0.30 * verification_score +
        0.35 * transaction_score +
        0.15 * behavioral_score +
        0.15 * review_score +
        0.05 * engagement_score
    )

    // Manipulation penalty
    manipulation_score = detect_trust_manipulation(supplier_id, signals)
    IF manipulation_score > 0.5:
        overall *= (1.0 - manipulation_score * 0.5)  // up to 50% penalty

    RETURN TrustScore(
        overall=overall,
        verification=verification_score,
        transaction=transaction_score,
        behavioral=behavioral_score,
        review=review_score,
        engagement=engagement_score,
        manipulation_detected=manipulation_score > 0.5
    )
```

### RFQ Routing Optimization

```
FUNCTION route_rfq(rfq, max_suppliers=10):
    // 1. Find candidate suppliers via capability matching
    candidates = specification_matching_engine.match(
        specifications=rfq.parsed_specifications,
        category=rfq.matched_category,
        certifications=rfq.required_certifications,
        delivery_region=rfq.delivery_location,
        limit=200
    )

    // 2. Score each candidate
    scored_candidates = []
    FOR supplier IN candidates:
        // Capability match quality
        capability_score = supplier.match_score  // from specification matching

        // Trust and reliability
        trust = trust_store.get(supplier.supplier_id)

        // Engagement prediction: will this supplier respond?
        engagement_features = {
            "historical_response_rate": supplier.rfq_response_rate,
            "current_rfq_load": get_active_rfq_count(supplier.supplier_id),
            "category_match_quality": capability_score,
            "order_value": rfq.estimated_value,
            "day_of_week": current_day_of_week(),
            "hour_of_day": current_hour(),
            "supplier_trust_score": trust.overall,
            "rfqs_received_today": get_rfq_count_today(supplier.supplier_id),
        }
        engagement_prob = engagement_model.predict(engagement_features)

        // Price competitiveness estimate
        estimated_price = price_engine.estimate_price(
            supplier.supplier_id, rfq.category, rfq.specifications, rfq.quantity
        )
        benchmark = price_engine.get_benchmark(rfq.category, rfq.specifications)
        price_competitiveness = 1.0 - max(0, (estimated_price - benchmark.median) / benchmark.median)

        scored_candidates.append({
            "supplier_id": supplier.supplier_id,
            "capability_score": capability_score,
            "trust_score": trust.overall,
            "engagement_prob": engagement_prob,
            "price_competitiveness": price_competitiveness,
            "geographic_region": supplier.region,
            "verification_tier": supplier.verification.tier,
            "rfqs_received_today": engagement_features["rfqs_received_today"],
        })

    // 3. Constrained optimization
    selected = optimize_supplier_selection(scored_candidates, constraints={
        "max_suppliers": max_suppliers,
        "min_regions": 2,
        "min_verified": 1,
        "max_rfqs_per_supplier_per_day": 20,
        "min_engagement_prob": 0.1,
    })

    // 4. Optimization objective: maximize expected bid quality
    FUNCTION optimize_supplier_selection(candidates, constraints):
        // Filter out suppliers exceeding daily RFQ cap
        eligible = [c FOR c IN candidates
                    IF c.rfqs_received_today < constraints.max_rfqs_per_supplier_per_day
                    AND c.engagement_prob >= constraints.min_engagement_prob]

        // Beam search: explore top selections by composite score
        best_selection = NULL
        best_objective = -INF

        // Sort by composite score for greedy initialization
        eligible.sort(key=composite_score, reverse=True)

        FOR selection IN beam_search(eligible, constraints.max_suppliers, beam_width=50):
            // Check constraints
            IF count_unique_regions(selection) < constraints.min_regions:
                CONTINUE
            IF count_verified(selection) < constraints.min_verified:
                CONTINUE

            // Compute objective: P(≥3 bids) × E[bid quality]
            p_at_least_3_bids = 1 - probability_fewer_than_k_successes(
                [s.engagement_prob FOR s IN selection], k=3
            )
            expected_quality = mean([
                s.capability_score * s.trust_score * s.price_competitiveness
                FOR s IN selection
            ])
            objective = p_at_least_3_bids * expected_quality

            IF objective > best_objective:
                best_objective = objective
                best_selection = selection

        RETURN best_selection

    RETURN selected
```

### Catalog Entity Resolution

```
FUNCTION resolve_duplicate_listings(new_listing, existing_index):
    // 1. Candidate retrieval: find potentially duplicate listings
    candidates = existing_index.search(
        query=new_listing.title + " " + new_listing.description,
        category=new_listing.leaf_category_id,
        limit=50
    )

    // 2. Detailed comparison for each candidate
    duplicates = []
    FOR candidate IN candidates:
        similarity = compute_listing_similarity(new_listing, candidate)
        IF similarity.overall > 0.95:
            duplicates.append((candidate, similarity, "AUTO_MERGE"))
        ELIF similarity.overall > 0.85:
            duplicates.append((candidate, similarity, "MANUAL_REVIEW"))

    RETURN duplicates

FUNCTION compute_listing_similarity(listing_a, listing_b):
    // Field-level similarity computation
    title_sim = cosine_similarity(
        embed(listing_a.title), embed(listing_b.title)
    )

    // Specification similarity: compare normalized attributes
    spec_sim = compute_spec_similarity(
        listing_a.specifications.structured_attrs,
        listing_b.specifications.structured_attrs
    )

    // Material match: exact or equivalent
    material_sim = material_equivalence_check(
        listing_a.specifications.get("material"),
        listing_b.specifications.get("material")
    )

    // Dimension match: within tolerance
    dimension_sim = dimension_tolerance_match(
        listing_a.specifications,
        listing_b.specifications
    )

    // Image similarity (if images available)
    image_sim = 0.0
    IF listing_a.media.primary_image_url AND listing_b.media.primary_image_url:
        image_sim = cosine_similarity(
            image_encoder.encode(listing_a.primary_image),
            image_encoder.encode(listing_b.primary_image)
        )

    // Same supplier → lower threshold for merge (supplier listing consolidation)
    // Different supplier → higher threshold (avoid merging competitor products)
    same_supplier = listing_a.supplier_id == listing_b.supplier_id
    supplier_penalty = 0.0 IF same_supplier ELSE 0.05

    overall = (
        0.15 * title_sim +
        0.30 * spec_sim +
        0.25 * material_sim +
        0.20 * dimension_sim +
        0.10 * image_sim
        - supplier_penalty
    )

    RETURN Similarity(
        overall=overall,
        title=title_sim,
        specifications=spec_sim,
        material=material_sim,
        dimensions=dimension_sim,
        image=image_sim,
        same_supplier=same_supplier
    )
```

### Price Anomaly Detection

```
FUNCTION detect_price_anomaly(category_id, specifications, quoted_price, supplier_id, quantity):
    // 1. Get market benchmark
    benchmark = price_benchmark_store.get(category_id, hash(specifications))

    IF benchmark IS NULL OR benchmark.sample_count < 10:
        RETURN PriceCheck(is_anomaly=False, confidence="LOW",
                         note="Insufficient market data for benchmark")

    // 2. Adjust for quantity (volume discount)
    quantity_factor = estimate_quantity_discount(category_id, quantity)
    adjusted_benchmark_median = benchmark.median_price * quantity_factor

    // 3. Compute deviation
    deviation = (quoted_price - adjusted_benchmark_median) / adjusted_benchmark_median

    // 4. Check supplier's historical pricing
    supplier_history = price_history_store.get(supplier_id, category_id)
    supplier_avg = mean(supplier_history.recent_prices) IF supplier_history ELSE NULL

    // 5. Anomaly classification
    IF deviation < -0.40:  // 40%+ below market
        anomaly_type = SUSPICIOUSLY_LOW
        risk = "Price significantly below market may indicate inferior quality, " +
               "non-compliance with specifications, or bait-and-switch tactics"
    ELIF deviation > 0.50:  // 50%+ above market
        anomaly_type = SUSPICIOUSLY_HIGH
        risk = "Price significantly above market median; recommend collecting " +
               "additional quotations or negotiating"
    ELSE:
        anomaly_type = NORMAL
        risk = NULL

    // 6. Contextual checks
    IF supplier_history AND quoted_price < supplier_avg * 0.6:
        // Supplier quoting 40%+ below their own historical average
        anomaly_type = SUSPICIOUSLY_LOW
        risk += "; Also significantly below this supplier's own historical pricing"

    IF anomaly_type == SUSPICIOUSLY_LOW AND supplier.trust.quality_rejection_rate > 0.15:
        risk += "; Supplier has above-average quality rejection history"

    RETURN PriceCheck(
        is_anomaly=anomaly_type != NORMAL,
        anomaly_type=anomaly_type,
        deviation_from_median=deviation,
        benchmark_median=adjusted_benchmark_median,
        risk_assessment=risk,
        confidence=compute_benchmark_confidence(benchmark.sample_count, benchmark.volatility)
    )
```

---

## Key Data Structures

### Search Index Architecture

```
Hybrid search index structure:
  Inverted index (keyword search):
    Terms indexed: product title tokens, description tokens, category names,
                   brand names, model numbers, material names, standard codes
    Total terms: ~200M unique terms across 50M listings
    Index size: ~50 GB (compressed)
    Update strategy: near-real-time (within 5 minutes of listing change)

  Vector indices (HNSW, one per field):
    Material index: 50M vectors × 96 dims × 4 bytes = ~19.2 GB + HNSW overhead = ~29 GB
    Dimension index: 50M × 96 dims = ~29 GB
    Certification index: 50M × 64 dims = ~19 GB
    General index: 50M × 128 dims = ~38 GB
    Total vector index: ~115 GB
    HNSW parameters: M=16, ef_construction=200, ef_search=100
    Recall@100: >95% at these parameters
    Query latency: ~30ms per ANN query (single field)

  Attribute filter index:
    Pre-computed bitsets for high-cardinality filters
    Category filters: 5,000 leaf categories
    Material filters: 2,000 material types
    Certification filters: 500 certification types
    Geographic filters: 500 regions
    Index size: ~20 GB
    Filter application: ~5ms (bitset intersection)

  Total in-memory index footprint: ~185 GB
  Distributed across 8 search nodes (23 GB each)
  Each node holds a complete shard of ~6.25M listings
```

### Trust Score Store

```
Trust score storage:
  Active suppliers: 500,000
  Per supplier:
    Current composite score: 40 bytes (8 bytes × 5 components)
    Signal history (rolling 1 year): ~10 KB (compressed event summary)
    Manipulation detection features: 200 bytes
    Category-specific ranks: ~500 bytes
    Total: ~11 KB per supplier

  Total: 500K × 11 KB = ~5.5 GB
  Storage: in-memory key-value store with disk persistence
  Update frequency: real-time on signal arrival + daily batch recalculation
  Replication: 3 replicas for read scalability
  Access pattern: read-heavy (100:1 read:write ratio)
```

### Escrow Ledger

```
Double-entry escrow ledger:
  Entry types: DEBIT (funds received), CREDIT (funds released/refunded)
  Account types: BUYER_HOLDING, ESCROW_POOL, SUPPLIER_PAYABLE, REFUND

  Per transaction entry:
    entry_id: 16 bytes (UUID)
    order_id: 16 bytes
    account_from: 32 bytes
    account_to: 32 bytes
    amount: 8 bytes (float64)
    currency: 3 bytes
    timestamp: 8 bytes
    reference: 32 bytes
    Total: ~147 bytes per entry

  Average entries per order: 3 (deposit + release + fee)
  Active orders: 750,000
  Daily new entries: 50,000 orders × 3 = 150,000 entries
  Annual entries: ~55M
  Annual storage: 55M × 147 bytes = ~8 GB

  Consistency requirement: ACID transactions for all ledger operations
  No eventual consistency — financial data must be strongly consistent
  Reconciliation: automated daily balance reconciliation with banking partner
```
