# Low-Level Design

[← Back to Index](./00-index.md)

---

## Data Model

### Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ PHOTO : has
    USER ||--o{ PREFERENCE : has
    USER ||--o{ SWIPE : makes
    USER ||--o{ MATCH : participates
    USER ||--o{ MESSAGE : sends
    USER ||--o{ BLOCK : creates
    USER ||--|| LOCATION : has
    USER ||--o| SUBSCRIPTION : has
    MATCH ||--|| CONVERSATION : creates
    CONVERSATION ||--o{ MESSAGE : contains

    USER {
        string user_id PK "UUID"
        string phone_number UK "E.164 format"
        string email UK "optional"
        string name "display name"
        date birth_date "age calculation"
        string gender "male/female/other"
        string bio "max 500 chars"
        string job_title "optional"
        string company "optional"
        string school "optional"
        boolean verified "photo verified"
        boolean active "account status"
        timestamp created_at
        timestamp last_active
        jsonb settings "app settings"
    }

    PHOTO {
        string photo_id PK "UUID"
        string user_id FK
        string original_url "full size"
        string large_url "800px"
        string medium_url "400px"
        string small_url "100px"
        int order "display order 0-8"
        boolean is_primary "main photo"
        string blur_hash "placeholder"
        timestamp uploaded_at
    }

    PREFERENCE {
        string user_id PK,FK
        int min_age "18-100"
        int max_age "18-100"
        int distance_km "1-160"
        string[] gender_preference "array"
        boolean show_me "discoverable"
        string distance_unit "km/mi"
    }

    LOCATION {
        string user_id PK,FK
        float latitude "decimal degrees"
        float longitude "decimal degrees"
        string s2_cell_id "S2 level 12"
        string geoshard_id "routing"
        string city "reverse geocoded"
        string country_code "ISO 3166-1"
        timestamp updated_at
    }

    SWIPE {
        string swipe_id PK "UUID"
        string swiper_id FK "who swiped"
        string swiped_id FK "who was swiped"
        string action "LIKE/PASS/SUPER_LIKE"
        float latitude "where"
        float longitude "where"
        timestamp created_at
        string session_id "tracking"
    }

    MATCH {
        string match_id PK "UUID"
        string user_a_id FK "lower UUID"
        string user_b_id FK "higher UUID"
        string conversation_id FK
        boolean active "not unmatched"
        timestamp matched_at
        string matched_by "which swipe triggered"
    }

    CONVERSATION {
        string conversation_id PK "UUID"
        string match_id FK
        string user_a_id FK
        string user_b_id FK
        timestamp last_message_at
        string last_message_preview "truncated"
        int unread_count_a
        int unread_count_b
    }

    MESSAGE {
        string message_id PK "UUID"
        string conversation_id FK
        string sender_id FK
        string content "text/emoji"
        string type "TEXT/GIF/REACTION"
        string status "SENT/DELIVERED/READ"
        timestamp sent_at
        timestamp delivered_at
        timestamp read_at
    }

    BLOCK {
        string block_id PK
        string blocker_id FK
        string blocked_id FK
        string reason "optional"
        timestamp created_at
    }

    SUBSCRIPTION {
        string subscription_id PK
        string user_id FK UK
        string tier "FREE/PLUS/GOLD/PLATINUM"
        timestamp starts_at
        timestamp expires_at
        string payment_provider
        string external_id
        boolean auto_renew
    }
```

### MongoDB Document Schemas

#### User Document

```javascript
// Collection: users
{
  _id: ObjectId("..."),
  user_id: "uuid-v4",
  phone_number: "+1234567890",        // E.164 format, unique
  email: "user@example.com",          // optional, unique if set
  name: "Alex",
  birth_date: ISODate("1995-03-15"),
  gender: "male",                     // male, female, other
  bio: "Love hiking and coffee...",   // max 500 chars
  job_title: "Software Engineer",
  company: "Tech Corp",
  school: "State University",

  photos: [
    {
      photo_id: "uuid",
      original_url: "https://cdn.../original/abc123.jpg",
      large_url: "https://cdn.../large/abc123.jpg",
      medium_url: "https://cdn.../medium/abc123.jpg",
      small_url: "https://cdn.../small/abc123.jpg",
      order: 0,
      is_primary: true,
      blur_hash: "L6Pj0^jE.AyE_3t7t7R**0o#DgR4",
      uploaded_at: ISODate("2024-01-15T10:30:00Z")
    }
    // ... up to 9 photos
  ],

  preferences: {
    min_age: 22,
    max_age: 35,
    distance_km: 50,
    gender_preference: ["female"],
    show_me: true,
    distance_unit: "km"
  },

  location: {
    type: "Point",
    coordinates: [-122.4194, 37.7749],  // [lng, lat] GeoJSON
    s2_cell_id: "89c25a31",             // S2 level 12
    geoshard_id: "us-west-sf",
    city: "San Francisco",
    country_code: "US",
    updated_at: ISODate("2024-06-01T15:00:00Z")
  },

  subscription: {
    tier: "GOLD",
    starts_at: ISODate("2024-05-01"),
    expires_at: ISODate("2024-06-01"),
    auto_renew: true
  },

  settings: {
    notifications: {
      matches: true,
      messages: true,
      likes: true,          // Gold+ only
      marketing: false
    },
    privacy: {
      show_distance: true,
      show_age: true,
      read_receipts: true
    }
  },

  verified: true,
  active: true,
  created_at: ISODate("2023-06-15T08:00:00Z"),
  last_active: ISODate("2024-06-01T15:30:00Z"),

  // Denormalized stats (updated async)
  stats: {
    total_swipes_made: 5420,
    total_right_swipes: 1842,
    total_matches: 156,
    super_likes_remaining: 5,
    boosts_remaining: 1
  }
}

// Indexes
db.users.createIndex({ user_id: 1 }, { unique: true })
db.users.createIndex({ phone_number: 1 }, { unique: true, sparse: true })
db.users.createIndex({ email: 1 }, { unique: true, sparse: true })
db.users.createIndex({ "location.coordinates": "2dsphere" })
db.users.createIndex({ "location.geoshard_id": 1 })
db.users.createIndex({ last_active: -1 })
db.users.createIndex({ active: 1, "preferences.show_me": 1 })
```

#### Swipe Document

```javascript
// Collection: swipes
{
  _id: ObjectId("..."),
  swipe_id: "uuid",
  swiper_id: "user-uuid-1",
  swiped_id: "user-uuid-2",
  action: "LIKE",                // LIKE, PASS, SUPER_LIKE

  location: {
    type: "Point",
    coordinates: [-122.4194, 37.7749]
  },

  context: {
    session_id: "session-uuid",
    app_version: "14.5.0",
    platform: "ios",
    recommendation_rank: 3       // Position in swipe queue
  },

  created_at: ISODate("2024-06-01T15:30:00Z"),

  // TTL: Auto-delete after 90 days for non-matches
  expires_at: ISODate("2024-09-01T15:30:00Z")
}

// Indexes
db.swipes.createIndex({ swiper_id: 1, swiped_id: 1 }, { unique: true })
db.swipes.createIndex({ swiped_id: 1, action: 1 })  // For match detection
db.swipes.createIndex({ swiper_id: 1, created_at: -1 })
db.swipes.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
```

#### Match Document

```javascript
// Collection: matches
{
  _id: ObjectId("..."),
  match_id: "uuid",

  // Canonical ordering: user_a_id < user_b_id (prevents duplicates)
  user_a_id: "user-uuid-1",
  user_b_id: "user-uuid-2",

  conversation_id: "conv-uuid",

  matched_at: ISODate("2024-06-01T15:35:00Z"),
  matched_by: "swipe-uuid",      // Which swipe triggered the match

  active: true,                  // false if unmatched
  unmatched_at: null,
  unmatched_by: null,

  // Denormalized for quick display
  user_a_snapshot: {
    name: "Alex",
    photo_url: "https://cdn.../small/abc.jpg"
  },
  user_b_snapshot: {
    name: "Jordan",
    photo_url: "https://cdn.../small/xyz.jpg"
  }
}

// Indexes
db.matches.createIndex({ match_id: 1 }, { unique: true })
db.matches.createIndex({ user_a_id: 1, active: 1 })
db.matches.createIndex({ user_b_id: 1, active: 1 })
db.matches.createIndex({ conversation_id: 1 })
db.matches.createIndex({ matched_at: -1 })
```

#### Message Document

```javascript
// Collection: messages
{
  _id: ObjectId("..."),
  message_id: "uuid",
  conversation_id: "conv-uuid",
  sender_id: "user-uuid-1",

  type: "TEXT",                  // TEXT, GIF, REACTION
  content: "Hey! How's it going?",

  // For reactions
  reaction_to: null,             // message_id if reaction

  status: "DELIVERED",           // SENT, DELIVERED, READ

  sent_at: ISODate("2024-06-01T15:40:00Z"),
  delivered_at: ISODate("2024-06-01T15:40:01Z"),
  read_at: null
}

// Indexes
db.messages.createIndex({ conversation_id: 1, sent_at: -1 })
db.messages.createIndex({ message_id: 1 }, { unique: true })
db.messages.createIndex({ sender_id: 1, sent_at: -1 })
```

### Elasticsearch Index Schema (Geosharded)

```json
{
  "settings": {
    "number_of_shards": 50,
    "routing": {
      "allocation": {
        "require": {
          "geoshard": true
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "user_id": { "type": "keyword" },
      "geoshard_id": { "type": "keyword" },
      "s2_cell_id": { "type": "keyword" },

      "location": { "type": "geo_point" },

      "gender": { "type": "keyword" },
      "age": { "type": "integer" },
      "birth_date": { "type": "date" },

      "active": { "type": "boolean" },
      "show_me": { "type": "boolean" },
      "verified": { "type": "boolean" },

      "last_active": { "type": "date" },

      "activity_score": { "type": "float" },
      "selectivity_score": { "type": "float" },
      "profile_completeness": { "type": "float" },

      "embedding_vector": {
        "type": "dense_vector",
        "dims": 128,
        "index": true,
        "similarity": "cosine"
      },

      "subscription_tier": { "type": "keyword" },

      "primary_photo_url": { "type": "keyword", "index": false },
      "name": { "type": "keyword", "index": false }
    }
  }
}
```

### Redis Data Structures

```
# Swipe state for match detection
# Key: swipes:{swiped_id}:{swiper_id}
# Value: action (LIKE/SUPER_LIKE)
# TTL: 90 days
SET swipes:user-2:user-1 "LIKE" EX 7776000

# User online status
# Key: online:{user_id}
# Value: websocket_node_id
# TTL: 5 minutes (heartbeat refresh)
SET online:user-1 "ws-node-3" EX 300

# WebSocket connection mapping
# Key: ws:conn:{user_id}
# Value: connection metadata (JSON)
HSET ws:conn:user-1 node "ws-node-3" connected_at "2024-06-01T15:00:00Z"

# Active sessions
# Key: session:{user_id}
# Value: session data (JSON)
SET session:user-1 '{"device":"ios","version":"14.5","token":"jwt..."}' EX 3600

# Rate limiting
# Key: ratelimit:{endpoint}:{user_id}
# Value: request count
INCR ratelimit:swipe:user-1
EXPIRE ratelimit:swipe:user-1 60

# Hot profile cache
# Key: profile:hot:{user_id}
# Value: serialized profile (JSON)
SET profile:hot:user-1 '{"name":"Alex",...}' EX 300

# Recommendation cache
# Key: recs:{user_id}
# Value: list of profile IDs
LPUSH recs:user-1 "user-2" "user-3" "user-4" ...
EXPIRE recs:user-1 300

# Typing indicator
# Key: typing:{conversation_id}:{user_id}
# Value: 1
SET typing:conv-1:user-1 1 EX 5
```

---

## API Design

### API Overview

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/v1/auth/login` | POST | Authenticate user | 5/min |
| `/v1/auth/refresh` | POST | Refresh JWT | 10/min |
| `/v1/users/me` | GET | Get current user profile | 60/min |
| `/v1/users/me` | PUT | Update profile | 30/min |
| `/v1/users/me/photos` | POST | Upload photo | 10/day |
| `/v1/users/me/location` | PUT | Update location | 60/min |
| `/v1/users/me/preferences` | PUT | Update preferences | 30/min |
| `/v1/recommendations` | GET | Get swipe queue | 60/min |
| `/v1/swipe` | POST | Record swipe | 1000/hour |
| `/v1/matches` | GET | List matches | 60/min |
| `/v1/matches/{id}` | DELETE | Unmatch | 30/hour |
| `/v1/conversations/{id}/messages` | GET | Get messages | 120/min |
| `/v1/conversations/{id}/messages` | POST | Send message | 200/hour |
| `/v1/users/{id}/block` | POST | Block user | 30/hour |
| `/v1/users/{id}/report` | POST | Report user | 10/hour |

### Authentication

```
POST /v1/auth/login
Content-Type: application/json

Request:
{
  "method": "PHONE",           // PHONE, GOOGLE, APPLE, FACEBOOK
  "phone_number": "+14155551234",
  "verification_code": "123456"
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJl...",
  "expires_in": 3600,
  "user": {
    "user_id": "uuid",
    "name": "Alex",
    "profile_complete": true,
    "subscription_tier": "GOLD"
  }
}
```

### Get Recommendations

```
GET /v1/recommendations?limit=50
Authorization: Bearer {access_token}

Response: 200 OK
{
  "profiles": [
    {
      "user_id": "uuid-2",
      "name": "Jordan",
      "age": 28,
      "bio": "Adventure seeker...",
      "distance_km": 5.2,
      "verified": true,
      "photos": [
        {
          "url": "https://cdn.../large/abc.jpg",
          "blur_hash": "L6Pj0^jE..."
        }
      ],
      "job_title": "Product Designer",
      "company": "Startup Inc",
      "school": "Design School"
    }
    // ... more profiles
  ],
  "remaining_likes": 100,        // null for unlimited
  "boost_active": false
}
```

### Record Swipe

```
POST /v1/swipe
Authorization: Bearer {access_token}
Content-Type: application/json
Idempotency-Key: {uuid}

Request:
{
  "target_user_id": "uuid-2",
  "action": "LIKE",              // LIKE, PASS, SUPER_LIKE
  "s2_cell_id": "89c25a31",      // Client's current cell
  "recommendation_rank": 3       // Position in queue
}

Response: 200 OK
{
  "swipe_id": "uuid",
  "action": "LIKE",
  "match": null,                 // null if no match
  "remaining_likes": 99,
  "remaining_super_likes": 4
}

Response (with match): 200 OK
{
  "swipe_id": "uuid",
  "action": "LIKE",
  "match": {
    "match_id": "match-uuid",
    "matched_user": {
      "user_id": "uuid-2",
      "name": "Jordan",
      "photo_url": "https://cdn.../small/abc.jpg"
    },
    "conversation_id": "conv-uuid"
  },
  "remaining_likes": 99
}
```

### Send Message

```
POST /v1/conversations/{conversation_id}/messages
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "type": "TEXT",                // TEXT, GIF
  "content": "Hey! Nice to match with you!"
}

Response: 201 Created
{
  "message_id": "msg-uuid",
  "conversation_id": "conv-uuid",
  "sender_id": "user-1",
  "type": "TEXT",
  "content": "Hey! Nice to match with you!",
  "status": "SENT",
  "sent_at": "2024-06-01T15:45:00Z"
}
```

### WebSocket Events

```
// Connection
wss://chat.tinder.com/ws?token={jwt}

// Client → Server: Send message
{
  "type": "MESSAGE",
  "conversation_id": "conv-uuid",
  "content": "Hello!",
  "client_message_id": "client-uuid"  // For deduplication
}

// Server → Client: Message received
{
  "type": "MESSAGE",
  "message_id": "msg-uuid",
  "conversation_id": "conv-uuid",
  "sender_id": "user-2",
  "content": "Hi there!",
  "sent_at": "2024-06-01T15:46:00Z"
}

// Server → Client: Match notification
{
  "type": "MATCH",
  "match_id": "match-uuid",
  "matched_user": {
    "user_id": "user-2",
    "name": "Jordan",
    "photo_url": "https://cdn.../small/abc.jpg"
  },
  "conversation_id": "conv-uuid"
}

// Client → Server: Typing indicator
{
  "type": "TYPING_START",
  "conversation_id": "conv-uuid"
}

// Server → Client: Read receipt
{
  "type": "READ_RECEIPT",
  "conversation_id": "conv-uuid",
  "last_read_message_id": "msg-uuid",
  "read_at": "2024-06-01T15:47:00Z"
}

// Client → Server: Heartbeat
{
  "type": "PING"
}

// Server → Client: Heartbeat response
{
  "type": "PONG"
}
```

---

## Core Algorithms

### 1. S2 Geometry Cell Calculation

```
ALGORITHM: CalculateS2Cell(latitude, longitude, level)
INPUT: Latitude and longitude in decimal degrees, S2 level (0-30)
OUTPUT: S2 Cell ID as 64-bit integer

PSEUDOCODE:

function CalculateS2Cell(lat, lng, level):
    // Step 1: Convert lat/lng to 3D unit sphere point
    // Using spherical to Cartesian conversion
    phi = lat * PI / 180          // Convert to radians
    theta = lng * PI / 180

    x = cos(phi) * cos(theta)
    y = cos(phi) * sin(theta)
    z = sin(phi)

    // Step 2: Determine which cube face the point projects to
    // S2 uses 6 cube faces (0-5)
    abs_x = abs(x)
    abs_y = abs(y)
    abs_z = abs(z)

    if abs_x >= abs_y AND abs_x >= abs_z:
        face = 0 if x > 0 else 3
        u = y / abs_x
        v = z / abs_x
    else if abs_y >= abs_x AND abs_y >= abs_z:
        face = 1 if y > 0 else 4
        u = -x / abs_y
        v = z / abs_y
    else:
        face = 2 if z > 0 else 5
        u = -x / abs_z
        v = -y / abs_z

    // Step 3: Apply non-linear transformation (S2 specific)
    // Converts (u, v) to (s, t) for better area distribution
    s = UVtoST(u)
    t = UVtoST(v)

    // Step 4: Convert to integer position at given level
    max_size = 2^30  // S2 uses 30 bits per axis
    i = floor(s * max_size)
    j = floor(t * max_size)

    // Step 5: Interleave bits using Hilbert curve
    // This preserves spatial locality
    position = HilbertEncode(level, i, j)

    // Step 6: Construct cell ID
    // Format: [face (3 bits)][position (2*level bits)][sentinel (1 bit)]
    cell_id = (face << 61) | (position << (60 - 2*level)) | 1

    return cell_id

function UVtoST(u):
    // Quadratic transformation for better cell distribution
    if u >= 0:
        return 0.5 * sqrt(1 + 3*u)
    else:
        return 1 - 0.5 * sqrt(1 - 3*u)

function HilbertEncode(level, i, j):
    // Encode (i, j) position using Hilbert curve
    // Preserves locality: nearby positions have nearby encodings
    position = 0
    for k from level-1 down to 0:
        i_bit = (i >> k) & 1
        j_bit = (j >> k) & 1

        // Hilbert curve quadrant
        quadrant = 2 * i_bit + (i_bit XOR j_bit)
        position = (position << 2) | quadrant

        // Rotate/flip for next iteration
        if j_bit == 0:
            if i_bit == 1:
                i = (1 << k) - 1 - i
                j = (1 << k) - 1 - j
            swap(i, j)

    return position

COMPLEXITY: O(level) time, O(1) space
```

### 2. Geoshard Query Routing

```
ALGORITHM: RouteToGeoshards(user_location, radius_km)
INPUT: User's current location, search radius in kilometers
OUTPUT: List of geoshard IDs to query

PSEUDOCODE:

function RouteToGeoshards(location, radius_km):
    center_cell = CalculateS2Cell(location.lat, location.lng, LEVEL_12)

    // Calculate covering cells for the search radius
    // S2 can compute minimal set of cells covering a circle
    search_region = S2Cap(center_cell, radius_km)
    covering_cells = S2RegionCoverer.getCovering(
        search_region,
        min_level = 8,   // Don't go too coarse
        max_level = 14,  // Don't go too fine
        max_cells = 20   // Limit number of cells
    )

    // Map cells to geoshards
    geoshards = {}
    for cell in covering_cells:
        shard_id = CellToGeoshard(cell)
        geoshards.add(shard_id)

    return geoshards.toList()

function CellToGeoshard(cell):
    // Geoshards are defined at a coarser level (e.g., level 6)
    // Multiple level-12 cells map to one geoshard
    parent_cell = cell.parent(GEOSHARD_LEVEL)

    // Map to physical Elasticsearch shard
    shard_mapping = LoadShardMapping()  // From config/service discovery
    return shard_mapping[parent_cell.id()]

// Elasticsearch query construction
function QueryGeoshards(geoshards, filters, user_embedding):
    queries = []

    for shard_id in geoshards:
        query = {
            "routing": shard_id,  // Route to specific shard
            "query": {
                "bool": {
                    "filter": [
                        { "term": { "active": true } },
                        { "term": { "show_me": true } },
                        { "range": { "age": { "gte": filters.min_age, "lte": filters.max_age } } },
                        { "terms": { "gender": filters.gender_preference } },
                        { "geo_distance": {
                            "distance": filters.distance_km + "km",
                            "location": { "lat": user.lat, "lon": user.lng }
                        }}
                    ],
                    "must_not": [
                        { "terms": { "user_id": already_swiped_ids } },
                        { "terms": { "user_id": blocked_ids } }
                    ]
                }
            },
            "knn": {
                "field": "embedding_vector",
                "query_vector": user_embedding,
                "k": 100,
                "num_candidates": 1000
            }
        }
        queries.append(query)

    // Execute multi-search
    return ExecuteMultiSearch(queries)

COMPLEXITY: O(c * log n) where c = covering cells, n = users per shard
```

### 3. TinVec Embedding Generation

```
ALGORITHM: GenerateUserEmbedding(user_id)
INPUT: User ID
OUTPUT: 128-dimensional embedding vector

PSEUDOCODE:

// Model architecture (simplified)
// Two-tower model: User tower + Item tower

function GenerateUserEmbedding(user_id):
    // Gather features for the user
    user = LoadUser(user_id)
    swipe_history = LoadSwipeHistory(user_id, limit=500)

    // Feature extraction
    features = {
        // Demographic features (normalized)
        "age": Normalize(user.age, 18, 80),
        "gender": OneHotEncode(user.gender),

        // Activity features
        "swipe_ratio": swipe_history.right_swipes / swipe_history.total,
        "match_ratio": user.matches / user.right_swipes,
        "avg_session_length": Normalize(user.avg_session_minutes, 0, 60),
        "days_since_registration": LogNormalize(user.account_age_days),

        // Profile features
        "has_bio": 1 if user.bio else 0,
        "photo_count": user.photo_count / 9,
        "verified": 1 if user.verified else 0,
        "profile_completeness": CalculateCompleteness(user),

        // Behavioral features (aggregated from swipe history)
        "preferred_age_mean": Mean([s.target.age for s in swipe_history if s.action == LIKE]),
        "preferred_distance_mean": Mean([s.distance for s in swipe_history if s.action == LIKE]),

        // Temporal features
        "active_hour_distribution": HourHistogram(swipe_history),
        "day_of_week_preference": DayHistogram(swipe_history)
    }

    // Generate embedding using pre-trained model
    raw_features = FeatureVector(features)  // ~50 dimensions

    // Pass through user tower (MLP)
    hidden1 = ReLU(DenseLayer(raw_features, 256))
    hidden2 = ReLU(DenseLayer(hidden1, 128))
    embedding = L2Normalize(DenseLayer(hidden2, 128))

    return embedding

// Training (offline, simplified)
function TrainTinVecModel(swipe_dataset):
    // Positive pairs: User A swiped right on User B, AND B swiped right on A
    // Negative pairs: User A swiped left on User B

    for batch in swipe_dataset:
        user_embeddings = UserTower(batch.user_features)
        item_embeddings = ItemTower(batch.target_features)

        // Cosine similarity
        scores = CosineSimilarity(user_embeddings, item_embeddings)

        // Contrastive loss
        loss = ContrastiveLoss(scores, batch.labels)

        // Backprop
        Optimizer.step(loss)

// Scoring during recommendation
function ScoreCandidates(user_embedding, candidate_embeddings):
    scores = []
    for candidate in candidate_embeddings:
        // Cosine similarity
        similarity = DotProduct(user_embedding, candidate) /
                     (Norm(user_embedding) * Norm(candidate))
        scores.append(similarity)

    return scores

COMPLEXITY:
- Embedding generation: O(d * h) where d = feature dims, h = hidden dims
- Scoring: O(n * e) where n = candidates, e = embedding dims
```

### 4. Match Detection Algorithm

```
ALGORITHM: DetectMatch(swipe_event)
INPUT: Swipe event from Kafka
OUTPUT: Match record if mutual, null otherwise

PSEUDOCODE:

function DetectMatch(swipe_event):
    swiper_id = swipe_event.swiper_id
    swiped_id = swipe_event.swiped_id
    action = swipe_event.action

    // Only LIKE and SUPER_LIKE can create matches
    if action == PASS:
        return null

    // Atomic check-and-set using Redis
    // Key format: swipes:{swiped_id}:{swiper_id}

    // Check if the other user already swiped right on this user
    reverse_key = "swipes:" + swiped_id + ":" + swiper_id
    reverse_action = Redis.GET(reverse_key)

    if reverse_action == "LIKE" OR reverse_action == "SUPER_LIKE":
        // MATCH! Both users swiped right on each other

        // Use distributed lock to prevent duplicate match creation
        lock_key = "match_lock:" + SortedPair(swiper_id, swiped_id)

        if Redis.SETNX(lock_key, "1", EX=5):  // 5 second TTL
            try:
                // Double-check match doesn't already exist
                existing_match = MongoDB.matches.findOne({
                    user_a_id: Min(swiper_id, swiped_id),
                    user_b_id: Max(swiper_id, swiped_id),
                    active: true
                })

                if existing_match:
                    return existing_match  // Already matched

                // Create match and conversation atomically
                match = {
                    match_id: UUID(),
                    user_a_id: Min(swiper_id, swiped_id),
                    user_b_id: Max(swiper_id, swiped_id),
                    conversation_id: UUID(),
                    matched_at: Now(),
                    matched_by: swipe_event.swipe_id,
                    active: true
                }

                conversation = {
                    conversation_id: match.conversation_id,
                    match_id: match.match_id,
                    user_a_id: match.user_a_id,
                    user_b_id: match.user_b_id,
                    last_message_at: null,
                    unread_count_a: 0,
                    unread_count_b: 0
                }

                // Transactional write
                MongoDB.startTransaction()
                MongoDB.matches.insert(match)
                MongoDB.conversations.insert(conversation)
                MongoDB.commitTransaction()

                // Clean up Redis state
                Redis.DEL(reverse_key)
                Redis.DEL("swipes:" + swiper_id + ":" + swiped_id)

                // Publish match event
                Kafka.publish("matches", {
                    type: "MATCH_CREATED",
                    match_id: match.match_id,
                    user_a_id: match.user_a_id,
                    user_b_id: match.user_b_id,
                    conversation_id: match.conversation_id
                })

                return match

            finally:
                Redis.DEL(lock_key)
        else:
            // Another worker is handling this match
            return null
    else:
        // No reverse swipe yet, store this swipe for future matching
        forward_key = "swipes:" + swiper_id + ":" + swiped_id
        Redis.SET(forward_key, action, EX=7776000)  // 90 days TTL

        return null

function SortedPair(id_a, id_b):
    // Canonical ordering for consistent lock keys
    if id_a < id_b:
        return id_a + ":" + id_b
    else:
        return id_b + ":" + id_a

COMPLEXITY: O(1) average case (Redis + MongoDB single doc operations)
RACE CONDITION HANDLING: Distributed lock + idempotent match check
```

### 5. Profile Ranking Algorithm

```
ALGORITHM: RankProfiles(user, candidates)
INPUT: Current user, list of candidate profiles
OUTPUT: Ranked list of profiles for swipe queue

PSEUDOCODE:

function RankProfiles(user, candidates):
    user_embedding = GetOrComputeEmbedding(user.user_id)

    scored_candidates = []

    for candidate in candidates:
        score = ComputeRankingScore(user, candidate, user_embedding)
        scored_candidates.append({
            candidate: candidate,
            score: score
        })

    // Sort by score descending
    scored_candidates.sort(by: score, order: DESC)

    // Apply diversity constraints
    diversified = ApplyDiversity(scored_candidates)

    // Inject exploration candidates
    final_list = InjectExploration(diversified, exploration_ratio=0.2)

    return final_list

function ComputeRankingScore(user, candidate, user_embedding):
    // Weight constants (tuned via A/B testing)
    W_ACTIVITY = 0.30      // User activity is most important
    W_EMBEDDING = 0.25     // TinVec similarity
    W_PROXIMITY = 0.20     // Geographic distance
    W_SELECTIVITY = 0.10   // How selective the candidate is
    W_MUTUAL = 0.10        // Historical mutual match patterns
    W_PROFILE = 0.05       // Profile completeness

    // 1. Activity score (recency-weighted)
    hours_since_active = (Now() - candidate.last_active).hours
    activity_score = exp(-hours_since_active / 24)  // Decay over 24 hours

    // 2. Embedding similarity
    candidate_embedding = GetOrComputeEmbedding(candidate.user_id)
    embedding_score = CosineSimilarity(user_embedding, candidate_embedding)
    embedding_score = (embedding_score + 1) / 2  // Normalize to [0, 1]

    // 3. Proximity score
    distance_km = HaversineDistance(user.location, candidate.location)
    max_distance = user.preferences.distance_km
    proximity_score = 1 - (distance_km / max_distance)
    proximity_score = Max(0, proximity_score)

    // 4. Selectivity score
    // Users who swipe right less often are more desirable
    right_swipe_ratio = candidate.stats.right_swipes / candidate.stats.total_swipes
    selectivity_score = 1 - right_swipe_ratio

    // 5. Mutual affinity score
    // Based on historical patterns of users with similar profiles matching
    mutual_score = PredictMutualLikelihood(user, candidate)

    // 6. Profile completeness
    profile_score = candidate.profile_completeness

    // Weighted combination
    final_score = (
        W_ACTIVITY * activity_score +
        W_EMBEDDING * embedding_score +
        W_PROXIMITY * proximity_score +
        W_SELECTIVITY * selectivity_score +
        W_MUTUAL * mutual_score +
        W_PROFILE * profile_score
    )

    // Boost for premium features
    if user.subscription.tier == "GOLD":
        if candidate.stats.likes_user:  // Gold users see who liked them
            final_score *= 1.5

    if candidate.has_super_liked_user:
        final_score *= 2.0

    return final_score

function ApplyDiversity(candidates):
    // Prevent consecutive profiles with same characteristics
    result = []
    last_selected = null

    for candidate in candidates:
        if last_selected:
            // Check diversity rules
            same_school = candidate.school == last_selected.school
            same_company = candidate.company == last_selected.company
            similar_age = abs(candidate.age - last_selected.age) <= 1

            if same_school AND similar_age:
                continue  // Skip, find next diverse candidate
            if same_company AND similar_age:
                continue

        result.append(candidate)
        last_selected = candidate

    return result

function InjectExploration(candidates, exploration_ratio):
    // Epsilon-greedy exploration
    // Show some profiles outside the user's typical preferences

    num_explore = floor(len(candidates) * exploration_ratio)

    // Get exploration candidates
    // - New users (account < 7 days)
    // - Users with low visibility (fairness)
    // - Slightly outside preference range
    explore_candidates = GetExplorationCandidates(num_explore)

    // Interleave exploration candidates
    result = []
    explore_positions = RandomSample(range(len(candidates)), num_explore)
    explore_idx = 0
    exploit_idx = 0

    for i in range(len(candidates) + num_explore):
        if i in explore_positions AND explore_idx < len(explore_candidates):
            result.append(explore_candidates[explore_idx])
            explore_idx += 1
        else:
            result.append(candidates[exploit_idx])
            exploit_idx += 1

    return result

COMPLEXITY: O(n log n) for sorting, O(n) for scoring
```

---

## Idempotency & Deduplication

### Swipe Idempotency

```
// Client sends Idempotency-Key header
POST /v1/swipe
Idempotency-Key: client-generated-uuid

// Server implementation
function ProcessSwipe(request):
    idempotency_key = request.headers["Idempotency-Key"]

    // Check Redis for existing response
    cached_response = Redis.GET("idempotent:" + idempotency_key)

    if cached_response:
        return JSON.parse(cached_response)

    // Process swipe
    response = CreateSwipe(request.body)

    // Cache response for 24 hours
    Redis.SET("idempotent:" + idempotency_key, JSON.stringify(response), EX=86400)

    return response
```

### Message Deduplication

```
// WebSocket messages include client_message_id
{
  "type": "MESSAGE",
  "client_message_id": "uuid",  // Client-generated
  "conversation_id": "conv-1",
  "content": "Hello!"
}

// Server deduplication
function ProcessMessage(ws_message):
    dedup_key = "msg_dedup:" + ws_message.conversation_id + ":" + ws_message.client_message_id

    // SETNX returns false if key exists
    if not Redis.SETNX(dedup_key, "1", EX=3600):
        // Duplicate, return cached message_id
        message_id = Redis.GET(dedup_key)
        return { message_id: message_id, deduplicated: true }

    // Create message
    message = CreateMessage(ws_message)

    // Store message_id for future dedup
    Redis.SET(dedup_key, message.message_id, EX=3600)

    return message
```

---

*Next: [Deep Dive & Bottlenecks →](./04-deep-dive-and-bottlenecks.md)*
