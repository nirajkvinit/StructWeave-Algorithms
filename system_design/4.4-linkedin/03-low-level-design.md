# LinkedIn: Low-Level Design

[← Back to Index](./00-index.md)

---

## Data Models

### Member Object

```
Member {
    // Identity
    id:                  uint64          // Globally unique (Snowflake-like)
    urn:                 string          // "urn:li:member:123456"
    email:               string          // Primary email (encrypted)
    phone:               string          // Optional (encrypted)

    // Profile
    first_name:          string
    last_name:           string
    headline:            string          // "Software Engineer at Google"
    summary:             string          // About section (max 2600 chars)
    profile_photo_url:   string          // CDN URL
    background_photo_url: string
    location:            Location        // City, region, country
    industry:            string          // "Technology"

    // Professional Details
    current_positions:   Position[]      // Current jobs
    past_positions:      Position[]      // Work history
    education:           Education[]     // Schools attended
    skills:              Skill[]         // Up to 50 skills
    certifications:      Certification[]
    languages:           Language[]

    // Settings
    visibility:          Visibility      // PUBLIC, CONNECTIONS, PRIVATE
    connection_settings: ConnectionSettings
    messaging_settings:  MessagingSettings

    // Metrics (denormalized)
    connection_count:    uint32          // Max 30,000
    follower_count:      uint32          // No limit

    // Timestamps
    created_at:          timestamp
    updated_at:          timestamp
    last_active_at:      timestamp
}

Position {
    id:                  uint64
    company_id:          uint64
    company_name:        string          // Denormalized
    title:               string
    location:            Location
    start_date:          date
    end_date:            date            // null if current
    description:         string
    is_current:          bool
}

Skill {
    id:                  uint64
    name:                string          // Standardized from taxonomy
    endorsement_count:   uint32
}

Location {
    city:                string
    region:              string          // State/Province
    country_code:        string          // ISO 3166-1
    geo_coordinates:     GeoPoint        // For location-based features
}
```

### Connection Object

```
Connection {
    // Edge identification (canonical form: id1 < id2)
    id1:                 uint64          // Lower member ID
    id2:                 uint64          // Higher member ID

    // Relationship
    status:              ConnectionStatus // PENDING, ACCEPTED, BLOCKED
    initiator_id:        uint64          // Who sent the request

    // Metadata
    connection_source:   Source          // PYMK, SEARCH, PROFILE, IMPORT
    message:             string          // Optional invite message

    // Timestamps
    requested_at:        timestamp
    accepted_at:         timestamp       // null if pending
    updated_at:          timestamp

    // Denormalized for filtering
    initiator_name:      string
    target_name:         string
}

ConnectionStatus {
    PENDING = 1          // Request sent, awaiting response
    ACCEPTED = 2         // Mutually connected
    BLOCKED = 3          // One party blocked the other
    WITHDRAWN = 4        // Request withdrawn before accept
    REJECTED = 5         // Request declined
}

Source {
    PYMK = 1             // People You May Know
    SEARCH = 2           // Search results
    PROFILE = 3          // Profile view
    IMPORT = 4           // Contact import
    QR_CODE = 5          // In-person scan
    COMPANY = 6          // Same company suggestion
}
```

### Job Posting Object

```
JobPosting {
    // Identity
    id:                  uint64
    urn:                 string          // "urn:li:job:789012"
    external_id:         string          // Employer's ATS ID

    // Company
    company_id:          uint64
    company_name:        string          // Denormalized
    company_logo_url:    string

    // Job Details
    title:               string
    description:         string          // Rich text, max 10KB
    employment_type:     EmploymentType  // FULL_TIME, CONTRACT, etc.
    seniority_level:     SeniorityLevel  // ENTRY, MID, SENIOR, EXECUTIVE
    job_function:        string[]        // "Engineering", "Product"
    industries:          string[]        // "Technology", "Finance"

    // Location
    location:            Location
    workplace_type:      WorkplaceType   // ONSITE, REMOTE, HYBRID

    // Compensation (optional)
    salary_range:        SalaryRange

    // Requirements
    skills_required:     Skill[]
    skills_preferred:    Skill[]
    years_experience:    Range           // {min: 3, max: 7}

    // Application
    apply_type:          ApplyType       // EASY_APPLY, EXTERNAL
    apply_url:           string          // For external

    // Status
    status:              JobStatus       // ACTIVE, PAUSED, CLOSED, EXPIRED
    posted_at:           timestamp
    expires_at:          timestamp
    closed_at:           timestamp

    // Metrics (denormalized)
    view_count:          uint32
    application_count:   uint32

    // Recruiter
    poster_id:           uint64          // Member who posted
    hiring_team:         uint64[]        // Members with access
}

EmploymentType {
    FULL_TIME = 1
    PART_TIME = 2
    CONTRACT = 3
    INTERNSHIP = 4
    TEMPORARY = 5
    VOLUNTEER = 6
}

SeniorityLevel {
    INTERNSHIP = 1
    ENTRY_LEVEL = 2
    ASSOCIATE = 3
    MID_SENIOR = 4
    DIRECTOR = 5
    EXECUTIVE = 6
}
```

### Message Object

```
Message {
    // Identity
    id:                  uint64
    conversation_id:     uint64

    // Participants
    sender_id:           uint64

    // Content
    body:                string          // Max 8000 chars
    content_type:        ContentType     // TEXT, INMAIL, SYSTEM
    attachments:         Attachment[]

    // InMail specific
    is_inmail:           bool
    inmail_subject:      string          // InMail has subject
    inmail_credits_used: uint8           // 1 typically

    // Status
    status:              MessageStatus   // SENT, DELIVERED, READ
    delivered_at:        timestamp
    read_at:             timestamp

    // Metadata
    created_at:          timestamp
    updated_at:          timestamp
    is_deleted:          bool            // Soft delete
}

Conversation {
    id:                  uint64
    type:                ConversationType // ONE_ON_ONE, GROUP

    // Participants
    participant_ids:     uint64[]        // Max 50 for groups
    participant_count:   uint8

    // State
    last_message_id:     uint64
    last_message_at:     timestamp
    last_message_preview: string         // First 100 chars

    // Per-participant state (stored separately)
    // unread_count, muted, archived per member

    created_at:          timestamp
    updated_at:          timestamp
}

ConversationParticipant {
    conversation_id:     uint64
    member_id:           uint64

    // State
    unread_count:        uint16
    last_read_message_id: uint64
    is_muted:            bool
    is_archived:         bool
    joined_at:           timestamp
    left_at:             timestamp       // For groups
}
```

### Post Object (Feed Content)

```
Post {
    // Identity
    id:                  uint64
    urn:                 string          // "urn:li:activity:456789"

    // Author
    author_id:           uint64
    author_type:         AuthorType      // MEMBER, COMPANY, GROUP
    author_name:         string          // Denormalized

    // Content
    text:                string          // Max 3000 chars
    content_type:        PostContentType // TEXT, ARTICLE, IMAGE, VIDEO, POLL
    media_urls:          string[]        // CDN URLs
    article_url:         string          // For shared articles
    mentions:            Mention[]       // Tagged members/companies
    hashtags:            string[]

    // Visibility
    visibility:          PostVisibility  // PUBLIC, CONNECTIONS, GROUP

    // Engagement (denormalized counters)
    like_count:          uint32
    comment_count:       uint32
    share_count:         uint32

    // Engagement breakdown
    reaction_counts:     map[ReactionType, uint32]

    // Metadata
    created_at:          timestamp
    updated_at:          timestamp
    is_edited:           bool

    // Moderation
    is_spam:             bool
    quality_score:       float           // 0-1, for ranking
}

ReactionType {
    LIKE = 1
    CELEBRATE = 2
    SUPPORT = 3
    LOVE = 4
    INSIGHTFUL = 5
    FUNNY = 6
}
```

### Company Object

```
Company {
    id:                  uint64
    urn:                 string          // "urn:li:company:12345"

    // Identity
    name:                string
    vanity_name:         string          // URL slug
    logo_url:            string
    cover_image_url:     string

    // Details
    description:         string          // About (max 2000 chars)
    website:             string
    industry:            string
    company_size:        CompanySize     // 1-10, 11-50, etc.
    company_type:        CompanyType     // PUBLIC, PRIVATE, NONPROFIT
    founded_year:        uint16
    specialties:         string[]

    // Location
    headquarters:        Location
    locations:           Location[]

    // Metrics (denormalized)
    follower_count:      uint32
    employee_count:      uint32          // From member profiles
    job_count:           uint16          // Active jobs

    // Admin
    admin_member_ids:    uint64[]

    created_at:          timestamp
    updated_at:          timestamp
}
```

---

## Database Schema

### PostgreSQL / MySQL Schema (Jobs, Companies)

```sql
-- Jobs table
CREATE TABLE jobs (
    id BIGINT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    employment_type TINYINT NOT NULL,
    seniority_level TINYINT,
    workplace_type TINYINT NOT NULL,

    -- Location
    location_city VARCHAR(100),
    location_region VARCHAR(100),
    location_country CHAR(2),
    geo_lat DECIMAL(10, 8),
    geo_lng DECIMAL(11, 8),

    -- Compensation
    salary_min INT,
    salary_max INT,
    salary_currency CHAR(3),

    -- Application
    apply_type TINYINT NOT NULL,
    apply_url VARCHAR(500),

    -- Status
    status TINYINT NOT NULL DEFAULT 1,
    posted_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    closed_at TIMESTAMP,

    -- Metrics
    view_count INT DEFAULT 0,
    application_count INT DEFAULT 0,

    -- Metadata
    poster_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_company (company_id),
    INDEX idx_location (location_country, location_region, location_city),
    INDEX idx_status_posted (status, posted_at DESC),
    INDEX idx_poster (poster_id)
) PARTITION BY HASH(id) PARTITIONS 100;

-- Job skills (many-to-many)
CREATE TABLE job_skills (
    job_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (job_id, skill_id),
    INDEX idx_skill (skill_id)
);

-- Job applications
CREATE TABLE job_applications (
    id BIGINT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    applicant_id BIGINT NOT NULL,

    -- Application data
    resume_id BIGINT,
    cover_letter TEXT,
    answers JSON,          -- Custom questions

    -- Status
    status TINYINT NOT NULL DEFAULT 1,  -- SUBMITTED, REVIEWED, REJECTED, etc.

    -- Timestamps
    applied_at TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP,
    updated_at TIMESTAMP,

    UNIQUE KEY uk_job_applicant (job_id, applicant_id),
    INDEX idx_applicant (applicant_id),
    INDEX idx_job_status (job_id, status)
) PARTITION BY HASH(applicant_id) PARTITIONS 100;

-- Companies table
CREATE TABLE companies (
    id BIGINT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    vanity_name VARCHAR(100) UNIQUE,

    description TEXT,
    website VARCHAR(500),
    industry VARCHAR(100),
    company_size TINYINT,
    company_type TINYINT,
    founded_year SMALLINT,

    logo_url VARCHAR(500),
    cover_url VARCHAR(500),

    -- HQ Location
    hq_city VARCHAR(100),
    hq_region VARCHAR(100),
    hq_country CHAR(2),

    -- Metrics
    follower_count INT DEFAULT 0,
    employee_count INT DEFAULT 0,
    job_count SMALLINT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_name (name),
    INDEX idx_industry (industry),
    FULLTEXT INDEX ft_search (name, description)
);
```

### LIquid Graph Schema

```
// Graph storage model for professional connections

NODE: Member {
    id: uint64                    // Member ID
    shard_id: uint16             // Derived from id for partitioning
}

EDGE: Connection {
    // Canonical form: source_id < target_id
    source_id: uint64
    target_id: uint64
    edge_type: CONNECTION

    // Attributes
    status: uint8                 // PENDING=1, ACCEPTED=2, BLOCKED=3
    initiator: uint64             // Who sent request
    created_at: uint64            // Unix timestamp
    accepted_at: uint64           // When accepted (0 if pending)
}

EDGE: Follows {
    follower_id: uint64
    followed_id: uint64           // Member or Company
    followed_type: uint8          // MEMBER=1, COMPANY=2
    created_at: uint64
}

// Indexes (stored per shard, replicated globally)
INDEX: member_connections[member_id] -> [Connection edges]
INDEX: member_followers[member_id] -> [Follows edges where followed_id = member_id]
INDEX: member_following[member_id] -> [Follows edges where follower_id = member_id]

// Query patterns
GET_1ST_DEGREE(member_id):
    return member_connections[member_id]

GET_2ND_DEGREE(member_id):
    first_degree = GET_1ST_DEGREE(member_id)
    second_degree = {}
    FOR each connection in first_degree:
        second_degree.union(GET_1ST_DEGREE(connection.other_id))
    return second_degree - first_degree - {member_id}

CONNECTION_DEGREE(member_a, member_b):
    // Bidirectional BFS
    return BFS_MEET_IN_MIDDLE(member_a, member_b, max_depth=3)
```

### Espresso Schema (Messaging)

```
// Espresso document schema (JSON-like with Avro)

DATABASE: messaging

TABLE: conversations
    KEY: conversation_id (uint64)
    DOCUMENT: {
        "id": uint64,
        "type": "ONE_ON_ONE" | "GROUP",
        "participant_ids": [uint64],
        "participant_count": uint8,
        "last_message": {
            "id": uint64,
            "sender_id": uint64,
            "preview": string,
            "timestamp": uint64
        },
        "created_at": uint64,
        "updated_at": uint64
    }
    INDEXES:
        - participant_ids (secondary, for inbox queries)

TABLE: messages
    KEY: (conversation_id, message_id)  // Compound key
    DOCUMENT: {
        "id": uint64,
        "conversation_id": uint64,
        "sender_id": uint64,
        "body": string,
        "content_type": "TEXT" | "INMAIL" | "SYSTEM",
        "attachments": [{
            "type": string,
            "url": string,
            "name": string
        }],
        "is_inmail": boolean,
        "inmail_subject": string,
        "status": "SENT" | "DELIVERED" | "READ",
        "read_at": uint64,
        "created_at": uint64
    }
    INDEXES:
        - (conversation_id, created_at DESC) for pagination

TABLE: participant_state
    KEY: (member_id, conversation_id)
    DOCUMENT: {
        "member_id": uint64,
        "conversation_id": uint64,
        "unread_count": uint16,
        "last_read_message_id": uint64,
        "is_muted": boolean,
        "is_archived": boolean,
        "joined_at": uint64
    }

ROUTING:
    conversations: HASH(conversation_id)
    messages: HASH(conversation_id)  // Co-located with conversation
    participant_state: HASH(member_id)  // Sharded by member for inbox

// Personal Data Router (PDR) service
// Maps member_id -> shard location for their mailbox
```

---

## Cache Schema

### Redis Schema (Feed Cache)

```
# Feed cache structure

# Pre-computed feed for active users
KEY: feed:{member_id}
TYPE: ZSET
SCORE: relevance_score (float)
MEMBER: post_id
TTL: 1 hour

ZADD feed:12345 0.95 "post:111" 0.87 "post:222" 0.82 "post:333"
ZREVRANGE feed:12345 0 49  # Top 50 by score

# Post cache (denormalized)
KEY: post:{post_id}
TYPE: HASH
FIELDS: author_id, author_name, text, media_urls, created_at,
        like_count, comment_count, share_count
TTL: 24 hours

HGETALL post:111

# User's engagement state
KEY: engagement:{member_id}:{post_id}
TYPE: STRING
VALUE: JSON {"liked": true, "reaction": "CELEBRATE", "shared": false}
TTL: 7 days

# Connection list cache
KEY: connections:{member_id}
TYPE: SET
MEMBERS: connected member IDs
TTL: 30 minutes

SMEMBERS connections:12345
SISMEMBER connections:12345 67890  # Check if connected

# 2nd degree cache (expensive to compute)
KEY: second_degree:{member_id}
TYPE: SET
TTL: 1 hour  # Longer TTL, expensive query

# Session cache
KEY: session:{session_id}
TYPE: HASH
FIELDS: member_id, created_at, last_active, device_info
TTL: 24 hours (sliding)

# Rate limiting
KEY: ratelimit:{member_id}:{action}
TYPE: STRING (counter)
TTL: varies by action

INCR ratelimit:12345:connection_request
EXPIRE ratelimit:12345:connection_request 86400  # Daily limit
```

### Graph Cache Schema

```
# In-memory graph cache (within LIquid servers)

# First-degree connections (hot data)
CACHE: first_degree[member_id] -> Connection[]
EVICTION: LRU
SIZE: 100GB per server
TTL: 5 minutes

# Second-degree materialized view (warm data)
CACHE: second_degree[member_id] -> member_id[]
EVICTION: LRU
SIZE: 50GB per server
TTL: 30 minutes

# Connection degree cache
CACHE: degree[member_a:member_b] -> {degree: int, path: member_id[]}
EVICTION: LRU
SIZE: 20GB per server
TTL: 10 minutes

# Invalidation via Kafka
TOPIC: graph.edge.changes
PAYLOAD: {member_id_1, member_id_2, action: ADD|REMOVE}
CONSUMER: All LIquid servers
ACTION: Invalidate affected caches
```

---

## API Design

### Feed API

```
# Get personalized feed
GET /v2/feed
Headers:
  Authorization: Bearer {access_token}
  X-Request-ID: {uuid}
Query Parameters:
  cursor: string          # Pagination cursor (opaque)
  count: int              # Items per page (default: 20, max: 100)
  refresh: boolean        # Force fresh ranking (default: false)
Response:
  200 OK
  {
    "items": [
      {
        "id": "urn:li:activity:123456",
        "type": "POST",
        "author": {
          "id": "urn:li:member:789",
          "name": "Jane Smith",
          "headline": "Engineering Manager at Meta",
          "profile_url": "https://linkedin.com/in/janesmith",
          "profile_photo": "https://media.licdn.com/..."
        },
        "content": {
          "text": "Excited to share...",
          "media": [{"type": "IMAGE", "url": "..."}]
        },
        "engagement": {
          "like_count": 234,
          "comment_count": 45,
          "share_count": 12,
          "user_reaction": "CELEBRATE"
        },
        "created_at": "2025-01-15T10:30:00Z",
        "ranking_reason": "From your network"
      }
    ],
    "paging": {
      "cursor": "eyJvZmZzZXQiOjIwfQ==",
      "has_more": true
    }
  }

# Create a post
POST /v2/posts
Headers:
  Authorization: Bearer {access_token}
  Content-Type: application/json
  Idempotency-Key: {uuid}
Body:
  {
    "text": "Sharing my thoughts on...",
    "visibility": "PUBLIC",
    "media": [
      {"type": "IMAGE", "upload_url": "..."}
    ],
    "mentions": ["urn:li:member:123"],
    "hashtags": ["leadership", "tech"]
  }
Response:
  201 Created
  {
    "id": "urn:li:activity:789012",
    "author_id": "urn:li:member:456",
    "created_at": "2025-01-15T12:00:00Z"
  }

# React to a post
POST /v2/posts/{post_urn}/reactions
Body:
  {"reaction_type": "CELEBRATE"}
Response:
  201 Created
```

### Connection API

```
# Send connection request
POST /v2/connections/invitations
Headers:
  Authorization: Bearer {access_token}
  Idempotency-Key: {uuid}
Body:
  {
    "recipient_urn": "urn:li:member:789012",
    "message": "Hi Jane, I'd love to connect!",  # Optional, max 300 chars
    "source": "PROFILE"
  }
Response:
  201 Created
  {
    "invitation_id": "urn:li:invitation:123",
    "status": "PENDING",
    "created_at": "2025-01-15T12:00:00Z"
  }

  400 Bad Request
  {"error": "CONNECTION_LIMIT_REACHED", "message": "You have reached the 30,000 connection limit"}

  403 Forbidden
  {"error": "RECIPIENT_BLOCKED", "message": "Cannot send invitation"}

# Accept/reject connection request
PUT /v2/connections/invitations/{invitation_urn}
Body:
  {"action": "ACCEPT"}  # or "REJECT"
Response:
  200 OK
  {
    "invitation_id": "urn:li:invitation:123",
    "status": "ACCEPTED",
    "connection_urn": "urn:li:connection:456",
    "updated_at": "2025-01-15T12:30:00Z"
  }

# Withdraw pending request
DELETE /v2/connections/invitations/{invitation_urn}
Response:
  204 No Content

# Get connection list
GET /v2/connections
Query Parameters:
  start: int              # Offset (default: 0)
  count: int              # Limit (default: 50, max: 500)
  sort: string            # "RECENTLY_ADDED" | "FIRST_NAME" | "LAST_NAME"
Response:
  200 OK
  {
    "connections": [
      {
        "id": "urn:li:member:789",
        "name": "John Doe",
        "headline": "Senior Engineer at Google",
        "profile_url": "...",
        "connected_at": "2024-06-15T10:00:00Z"
      }
    ],
    "paging": {"start": 0, "count": 50, "total": 423}
  }

# Remove connection
DELETE /v2/connections/{member_urn}
Response:
  204 No Content
```

### Job Search API

```
# Search jobs
GET /v2/jobs
Query Parameters:
  keywords: string        # Search query
  location: string        # City or country
  distance: int           # Miles from location
  experience_level: string[] # ENTRY, MID, SENIOR
  job_type: string[]      # FULL_TIME, CONTRACT, etc.
  workplace_type: string[] # ONSITE, REMOTE, HYBRID
  company_id: string      # Filter by company
  posted_within: string   # "24h", "7d", "30d"
  easy_apply: boolean     # Only Easy Apply jobs
  start: int              # Pagination offset
  count: int              # Results per page (max: 100)
Response:
  200 OK
  {
    "jobs": [
      {
        "id": "urn:li:job:123456",
        "title": "Senior Software Engineer",
        "company": {
          "id": "urn:li:company:789",
          "name": "Google",
          "logo_url": "..."
        },
        "location": {
          "city": "San Francisco",
          "region": "California",
          "country": "US"
        },
        "workplace_type": "HYBRID",
        "seniority_level": "MID_SENIOR",
        "posted_at": "2025-01-14T00:00:00Z",
        "application_count": 127,
        "easy_apply": true,
        "salary_range": {
          "min": 180000,
          "max": 250000,
          "currency": "USD"
        },
        "match_score": 0.92,
        "match_reasons": ["Skills match", "Location match"]
      }
    ],
    "paging": {"start": 0, "count": 25, "total": 1543},
    "facets": {
      "experience_level": [{"value": "MID_SENIOR", "count": 623}, ...],
      "company": [{"id": "urn:li:company:789", "name": "Google", "count": 45}, ...]
    }
  }

# Get job details
GET /v2/jobs/{job_urn}
Response:
  200 OK
  {
    "id": "urn:li:job:123456",
    "title": "Senior Software Engineer",
    "description": "We are looking for...",
    "company": {...},
    "requirements": {
      "skills": ["Java", "Distributed Systems", "Kubernetes"],
      "experience_years": {"min": 5, "max": 10}
    },
    "benefits": ["Health insurance", "401k match", ...],
    "posted_by": {
      "id": "urn:li:member:456",
      "name": "Recruiter Name",
      "is_connection": false
    },
    "insights": {
      "applicants_past_week": 45,
      "connections_at_company": 12
    },
    "application_status": null,  # or "APPLIED"
    "saved": false
  }
```

### Job Application API

```
# Apply to job (Easy Apply)
POST /v2/jobs/{job_urn}/applications
Headers:
  Authorization: Bearer {access_token}
  Idempotency-Key: {uuid}
Body:
  {
    "resume_urn": "urn:li:resume:789",      # or null to use profile
    "phone": "+1-555-123-4567",
    "email": "jane@email.com",
    "answers": [                             # Custom questions
      {"question_id": "q1", "answer": "5 years"}
    ],
    "follow_company": true
  }
Response:
  201 Created
  {
    "application_id": "urn:li:jobApplication:123456",
    "job_id": "urn:li:job:123456",
    "status": "SUBMITTED",
    "applied_at": "2025-01-15T12:00:00Z"
  }

  409 Conflict
  {"error": "ALREADY_APPLIED", "application_id": "urn:li:jobApplication:123456"}

# Get my applications
GET /v2/jobs/applications
Query Parameters:
  status: string[]        # SUBMITTED, VIEWED, REJECTED, etc.
  start: int
  count: int
Response:
  200 OK
  {
    "applications": [
      {
        "id": "urn:li:jobApplication:123456",
        "job": {...},
        "status": "VIEWED",
        "applied_at": "2025-01-15T12:00:00Z",
        "last_activity_at": "2025-01-16T09:00:00Z"
      }
    ],
    "paging": {...}
  }

# Withdraw application
DELETE /v2/jobs/applications/{application_urn}
Response:
  204 No Content
```

### Messaging API

```
# Get conversations (inbox)
GET /v2/messaging/conversations
Query Parameters:
  filter: string          # "UNREAD" | "INMAIL" | "ARCHIVED"
  cursor: string
  count: int
Response:
  200 OK
  {
    "conversations": [
      {
        "id": "urn:li:conversation:123",
        "type": "ONE_ON_ONE",
        "participants": [
          {
            "id": "urn:li:member:456",
            "name": "John Doe",
            "headline": "...",
            "profile_photo": "..."
          }
        ],
        "last_message": {
          "id": "urn:li:message:789",
          "sender_id": "urn:li:member:456",
          "preview": "Thanks for connecting!",
          "timestamp": "2025-01-15T11:00:00Z"
        },
        "unread_count": 2,
        "is_muted": false
      }
    ],
    "paging": {"cursor": "...", "has_more": true}
  }

# Get messages in conversation
GET /v2/messaging/conversations/{conversation_urn}/messages
Query Parameters:
  cursor: string          # Pagination (before this message_id)
  count: int              # Messages per page
Response:
  200 OK
  {
    "messages": [
      {
        "id": "urn:li:message:789",
        "sender": {
          "id": "urn:li:member:456",
          "name": "John Doe"
        },
        "body": "Thanks for connecting! Would love to...",
        "attachments": [],
        "timestamp": "2025-01-15T11:00:00Z",
        "read_at": null
      }
    ],
    "paging": {...}
  }

# Send message
POST /v2/messaging/conversations/{conversation_urn}/messages
Headers:
  Idempotency-Key: {uuid}
Body:
  {
    "body": "Hi John, thanks for reaching out!",
    "attachments": [
      {"type": "FILE", "upload_urn": "urn:li:upload:123"}
    ]
  }
Response:
  201 Created
  {
    "id": "urn:li:message:999",
    "conversation_id": "urn:li:conversation:123",
    "timestamp": "2025-01-15T12:00:00Z"
  }

# Send InMail (new conversation with non-connection)
POST /v2/messaging/conversations
Headers:
  Idempotency-Key: {uuid}
Body:
  {
    "recipient_urn": "urn:li:member:789",
    "subject": "Opportunity at Google",           # InMail requires subject
    "body": "Hi Jane, I came across your profile...",
    "is_inmail": true
  }
Response:
  201 Created
  {
    "conversation_id": "urn:li:conversation:456",
    "message_id": "urn:li:message:123",
    "inmail_credits_remaining": 19
  }

  402 Payment Required
  {"error": "INSUFFICIENT_INMAIL_CREDITS"}
```

### Profile API

```
# Get profile
GET /v2/profiles/{member_urn}
Query Parameters:
  fields: string[]        # Specific fields to return
Response:
  200 OK
  {
    "id": "urn:li:member:123456",
    "first_name": "Jane",
    "last_name": "Smith",
    "headline": "Engineering Manager at Meta",
    "location": {"city": "San Francisco", "country": "US"},
    "profile_photo": "https://media.licdn.com/...",
    "background_photo": "https://media.licdn.com/...",
    "summary": "Passionate about building scalable systems...",
    "current_positions": [
      {
        "company": {"id": "urn:li:company:123", "name": "Meta"},
        "title": "Engineering Manager",
        "start_date": "2022-03"
      }
    ],
    "education": [...],
    "skills": [
      {"name": "Distributed Systems", "endorsement_count": 99}
    ],
    "connection_degree": 2,    # Relationship to viewer
    "mutual_connections": 15,
    "is_connection": false,
    "is_following": true
  }

# Update profile
PATCH /v2/profiles/me
Body:
  {
    "headline": "Senior Engineering Manager at Meta",
    "summary": "Updated summary..."
  }
Response:
  200 OK
  {...updated profile}
```

---

## Core Algorithms

### Algorithm 1: Bidirectional BFS for Connection Degree

```
ALGORITHM: ConnectionDegree(member_a, member_b)
PURPOSE: Find shortest path between two members (1st, 2nd, 3rd+ degree)
COMPLEXITY: O(b^(d/2)) where b = branching factor, d = degree

FUNCTION ConnectionDegree(member_a, member_b):
    // Special cases
    IF member_a == member_b:
        RETURN {degree: 0, path: [member_a]}

    IF IsDirectConnection(member_a, member_b):
        RETURN {degree: 1, path: [member_a, member_b]}

    // Bidirectional BFS
    forward_visited = {member_a: null}  // member -> parent
    backward_visited = {member_b: null}

    forward_queue = [member_a]
    backward_queue = [member_b]

    max_degree = 3
    current_degree = 0

    WHILE current_degree < max_degree:
        current_degree += 1

        // Expand smaller frontier (optimization)
        IF len(forward_queue) <= len(backward_queue):
            forward_queue, meeting_point = ExpandFrontier(
                forward_queue, forward_visited, backward_visited
            )
        ELSE:
            backward_queue, meeting_point = ExpandFrontier(
                backward_queue, backward_visited, forward_visited
            )

        // Check if frontiers met
        IF meeting_point != null:
            path = ReconstructPath(
                member_a, member_b, meeting_point,
                forward_visited, backward_visited
            )
            RETURN {degree: len(path) - 1, path: path}

    RETURN {degree: 4, path: []}  // 3+ or not connected

FUNCTION ExpandFrontier(queue, visited, other_visited):
    next_queue = []
    meeting_point = null

    FOR each member in queue:
        connections = GetConnections(member)  // From LIquid

        FOR each conn in connections:
            IF conn NOT IN visited:
                visited[conn] = member  // Track parent
                next_queue.append(conn)

                // Check if we met the other search
                IF conn IN other_visited:
                    meeting_point = conn
                    RETURN (next_queue, meeting_point)

    RETURN (next_queue, null)

FUNCTION ReconstructPath(start, end, meeting, forward_visited, backward_visited):
    // Build forward path
    forward_path = []
    current = meeting
    WHILE current != null:
        forward_path.prepend(current)
        current = forward_visited[current]

    // Build backward path
    backward_path = []
    current = backward_visited[meeting]
    WHILE current != null:
        backward_path.append(current)
        current = backward_visited[current]

    RETURN forward_path + backward_path
```

### Algorithm 2: People You May Know (PYMK)

```
ALGORITHM: PeopleYouMayKnow(member_id, count)
PURPOSE: Generate connection recommendations
COMPLEXITY: O(C * F + S * log(S)) where C=connections, F=features, S=scored candidates

FUNCTION PeopleYouMayKnow(member_id, count = 50):
    // Stage 1: Candidate Generation (multiple sources)
    candidates = []

    // Source 1: 2nd degree connections (friends of friends)
    second_degree = Get2ndDegreeConnections(member_id, limit=1000)
    FOR each candidate in second_degree:
        mutual_count = CountMutualConnections(member_id, candidate)
        candidates.append({
            member: candidate,
            source: "2ND_DEGREE",
            mutual_connections: mutual_count
        })

    // Source 2: Same company
    companies = GetCurrentCompanies(member_id)
    FOR each company in companies:
        colleagues = GetCompanyMembers(company, exclude=member_id, limit=200)
        candidates.append_all(colleagues, source="COMPANY")

    // Source 3: Same school
    schools = GetEducation(member_id)
    FOR each school in schools:
        alumni = GetAlumni(school, year_range=5, limit=200)
        candidates.append_all(alumni, source="SCHOOL")

    // Source 4: LiGNN embedding similarity
    member_embedding = GetLiGNNEmbedding(member_id)
    similar_members = VectorSimilaritySearch(member_embedding, limit=500)
    candidates.append_all(similar_members, source="EMBEDDING")

    // Deduplicate
    candidates = Deduplicate(candidates)

    // Filter out existing connections, blocked, recently dismissed
    candidates = FilterExcluded(candidates, member_id)

    // Stage 2: Scoring with GLMix
    scored_candidates = []
    FOR each candidate in candidates:
        features = ExtractFeatures(member_id, candidate)
        score = GLMixScore(features)
        scored_candidates.append({...candidate, score: score})

    // Stage 3: Ranking and Diversification
    sorted_candidates = SortByScore(scored_candidates)

    // Apply diversity rules
    final_list = []
    source_counts = {}

    FOR each candidate in sorted_candidates:
        // Limit same source
        IF source_counts[candidate.source] >= 10:
            CONTINUE

        final_list.append(candidate)
        source_counts[candidate.source] += 1

        IF len(final_list) >= count:
            BREAK

    RETURN final_list

FUNCTION ExtractFeatures(member_id, candidate):
    RETURN {
        // Graph features
        mutual_connection_count: CountMutual(member_id, candidate.member),
        degree_of_separation: GetDegree(member_id, candidate.member),

        // Profile features
        same_industry: IsSameIndustry(member_id, candidate.member),
        same_location: IsSameLocation(member_id, candidate.member),
        skills_overlap: CountOverlappingSkills(member_id, candidate.member),
        seniority_gap: SeniorityDifference(member_id, candidate.member),

        // Behavioral features
        profile_viewed: HasViewedProfile(member_id, candidate.member),
        viewed_by: HasBeenViewedBy(member_id, candidate.member),
        interaction_score: GetInteractionHistory(member_id, candidate.member),

        // Time features
        days_since_last_active: DaysSinceActive(candidate.member),

        // Source features
        source_type: candidate.source
    }
```

### Algorithm 3: GLMix Job Matching

```
ALGORITHM: GLMixJobMatching(user_id, jobs)
PURPOSE: Personalized job ranking with entity-level parameters
COMPLEXITY: O(J * F) where J=jobs, F=features

// GLMix combines global model with per-user and per-job parameters
// Score = GlobalModel(features) + UserBias(user_id) + JobBias(job_id) + UserJobInteraction

FUNCTION GLMixScore(user_id, job_id, features):
    // Global model (shared across all users/jobs)
    global_score = DotProduct(global_weights, features)

    // Per-user parameters (learned from user's history)
    user_vector = GetUserVector(user_id)  // From model
    user_bias = user_vector.bias
    user_preferences = DotProduct(user_vector.weights, features)

    // Per-job parameters (learned from job's performance)
    job_vector = GetJobVector(job_id)
    job_bias = job_vector.bias
    job_quality = DotProduct(job_vector.weights, features)

    // Combined score
    score = global_score + user_bias + user_preferences + job_bias + job_quality

    RETURN Sigmoid(score)  // Convert to probability

FUNCTION RankJobsForUser(user_id, candidate_jobs, top_k = 50):
    scored_jobs = []

    // Get user features once
    user_profile = GetUserProfile(user_id)
    user_skills = GetUserSkills(user_id)
    user_history = GetApplicationHistory(user_id)

    FOR each job in candidate_jobs:
        // Extract features
        features = {
            // Skill match
            skill_match_ratio: CountMatchingSkills(user_skills, job.skills) / len(job.skills),
            skill_match_count: CountMatchingSkills(user_skills, job.skills),

            // Location match
            location_match: IsLocationMatch(user_profile.location, job.location),
            willing_to_relocate: user_profile.willing_to_relocate,
            remote_preference: job.workplace_type == "REMOTE" AND user_profile.prefers_remote,

            // Experience match
            experience_years: user_profile.years_experience,
            experience_gap: abs(user_profile.years_experience - job.min_experience),
            seniority_match: IsSeniorityMatch(user_profile, job),

            // Company signals
            company_following: IsFollowing(user_id, job.company_id),
            connections_at_company: CountConnectionsAtCompany(user_id, job.company_id),
            past_applications_to_company: CountPastApplications(user_history, job.company_id),

            // Job quality signals
            job_age_days: DaysSince(job.posted_at),
            application_rate: job.application_count / job.view_count,
            response_rate: job.response_rate,  // Historical

            // Industry match
            industry_match: IsSameIndustry(user_profile, job),

            // Salary match (if available)
            salary_in_range: IsSalaryInRange(user_profile.expected_salary, job.salary_range)
        }

        score = GLMixScore(user_id, job.id, features)
        scored_jobs.append({job: job, score: score, features: features})

    // Sort by score
    sorted_jobs = SortByScore(scored_jobs, descending=True)

    // Apply diversity (don't show too many from same company)
    diverse_jobs = ApplyDiversity(sorted_jobs, max_per_company=3)

    RETURN diverse_jobs[:top_k]
```

### Algorithm 4: 360Brew Feed Ranking

```
ALGORITHM: 360BrewFeedRanking(user_id, candidates)
PURPOSE: Multi-stage feed ranking optimizing for professional value (dwell time)
COMPLEXITY: O(C * F + S * log(S)) where C=candidates, F=features

FUNCTION GenerateFeed(user_id, count = 50):
    // Stage 0: Candidate Generation
    candidates = GatherCandidates(user_id, limit=1500)

    // Stage 1: First Pass Rankers (FPRs) - per inventory type
    articles = FilterByType(candidates, "ARTICLE")
    posts = FilterByType(candidates, "POST")
    jobs = FilterByType(candidates, "JOB_UPDATE")

    ranked_articles = FPR_Articles(user_id, articles, top_k=200)
    ranked_posts = FPR_Posts(user_id, posts, top_k=500)
    ranked_jobs = FPR_Jobs(user_id, jobs, top_k=100)

    // Stage 2: Second Pass Ranker (SPR) - unified scoring
    combined = ranked_articles + ranked_posts + ranked_jobs
    final_ranked = SPR_Combined(user_id, combined, top_k=100)

    // Stage 3: Diversity and Business Rules
    diverse_feed = ApplyDiversityRules(final_ranked)

    RETURN diverse_feed[:count]

FUNCTION FPR_Posts(user_id, posts, top_k):
    // Light-weight scoring for posts
    scored = []

    FOR each post in posts:
        features = ExtractPostFeatures(user_id, post)

        // Dwell time prediction (primary signal)
        predicted_dwell = DwellTimeModel.Predict(features)

        // Basic relevance
        relevance = CalculateRelevance(features)

        score = 0.6 * predicted_dwell + 0.4 * relevance
        scored.append({post: post, score: score})

    RETURN TopK(scored, top_k)

FUNCTION SPR_Combined(user_id, items, top_k):
    // Full feature extraction and scoring
    user_features = GetUserFeatures(user_id)

    scored = []
    FOR each item in items:
        features = {
            // Author features
            author_connection_degree: GetDegree(user_id, item.author_id),
            author_followed: IsFollowing(user_id, item.author_id),
            author_interaction_history: GetInteractionCount(user_id, item.author_id),
            author_expertise_score: GetAuthorExpertise(item.author_id, item.topics),

            // Content features
            content_length: len(item.text),
            has_media: item.media != null,
            media_type: item.media_type,
            hashtag_relevance: CalculateHashtagRelevance(user_features, item.hashtags),
            topic_relevance: CalculateTopicRelevance(user_features, item.topics),

            // Engagement features (social proof)
            like_count: item.like_count,
            comment_count: item.comment_count,
            engagement_rate: (item.like_count + item.comment_count) / item.impression_count,

            // Comment quality (LinkedIn-specific)
            quality_comment_ratio: item.quality_comments / max(item.comment_count, 1),
            expert_commenters: CountExpertCommenters(item, user_features.industry),

            // Freshness (LinkedIn allows older content)
            age_hours: HoursSince(item.created_at),
            freshness_score: FreshnessDecay(age_hours, max_age=504),  // 3 weeks

            // User engagement prediction
            predicted_dwell_time: DwellTimeModel.Predict(item, user_features),
            predicted_like: LikeModel.Predict(item, user_features),
            predicted_comment: CommentModel.Predict(item, user_features),

            // Negative signals
            spam_score: item.spam_score,
            low_quality_flag: item.quality_score < 0.3
        }

        // Combined scoring (dwell time heavily weighted)
        score = (
            0.40 * features.predicted_dwell_time +
            0.20 * features.author_expertise_score +
            0.15 * features.topic_relevance +
            0.10 * features.freshness_score +
            0.10 * features.engagement_rate +
            0.05 * features.quality_comment_ratio
        )

        // Penalties
        IF features.spam_score > 0.5:
            score = score * 0.1
        IF features.low_quality_flag:
            score = score * 0.5

        scored.append({item: item, score: score, features: features})

    RETURN TopK(scored, top_k)

FUNCTION ApplyDiversityRules(ranked_items):
    // LinkedIn-specific diversity rules
    result = []
    author_counts = {}
    type_counts = {}
    last_type = null

    FOR each item in ranked_items:
        // Rule 1: No more than 2 from same author
        IF author_counts[item.author_id] >= 2:
            CONTINUE

        // Rule 2: No consecutive same type
        IF item.type == last_type:
            // Defer, don't skip entirely
            DEFER(item)
            CONTINUE

        // Rule 3: Balance content types
        IF type_counts[item.type] > len(result) * 0.4:
            DEFER(item)
            CONTINUE

        result.append(item)
        author_counts[item.author_id] += 1
        type_counts[item.type] += 1
        last_type = item.type

    // Insert deferred items in gaps
    result = InsertDeferred(result)

    RETURN result

FUNCTION FreshnessDecay(age_hours, max_age):
    // LinkedIn shows older content if relevant
    IF age_hours < 24:
        RETURN 1.0
    ELIF age_hours < 168:  // 1 week
        RETURN 0.9 - (age_hours - 24) / 168 * 0.2
    ELIF age_hours < max_age:  // 3 weeks
        RETURN 0.7 - (age_hours - 168) / (max_age - 168) * 0.4
    ELSE:
        RETURN 0.3  // Still possible if highly relevant
```

### Algorithm 5: InMail Routing

```
ALGORITHM: InMailRouting(sender_id, recipient_id, message)
PURPOSE: Route InMail through distributed Espresso with spam filtering
COMPLEXITY: O(P) where P=number of plugins

FUNCTION SendInMail(sender_id, recipient_id, subject, body):
    // Validate InMail credits
    credits = GetInMailCredits(sender_id)
    IF credits <= 0:
        RETURN Error("INSUFFICIENT_CREDITS")

    // Create message object
    message = {
        id: GenerateMessageId(),
        sender_id: sender_id,
        recipient_id: recipient_id,
        subject: subject,
        body: body,
        is_inmail: true,
        created_at: NOW()
    }

    // Run through plugin pipeline
    FOR each plugin in GetOrderedPlugins():
        result = plugin.Process(message)

        IF result.action == "BLOCK":
            RETURN Error(result.reason)

        IF result.action == "MODIFY":
            message = result.modified_message

        // Continue to next plugin

    // Get routing information
    recipient_shard = PersonalDataRouter.GetShard(recipient_id)
    sender_shard = PersonalDataRouter.GetShard(sender_id)

    // Create or get conversation
    conversation = GetOrCreateConversation(sender_id, recipient_id)
    message.conversation_id = conversation.id

    // Write to recipient's mailbox (primary)
    Espresso.Write(recipient_shard, "messages", message)

    // Write to sender's sent box
    sender_copy = Clone(message)
    sender_copy.folder = "SENT"
    Espresso.Write(sender_shard, "messages", sender_copy)

    // Update conversation metadata
    UpdateConversationLastMessage(conversation.id, message)

    // Deduct credits
    DeductInMailCredit(sender_id, 1)

    // Emit events for real-time delivery
    Kafka.Emit("inmail.sent", {
        message_id: message.id,
        sender_id: sender_id,
        recipient_id: recipient_id,
        timestamp: message.created_at
    })

    RETURN Success(message.id)

// Plugin definitions
PLUGIN: SpamFilter {
    priority: 1

    FUNCTION Process(message):
        spam_score = SpamModel.Predict(message)

        IF spam_score > 0.9:
            RETURN {action: "BLOCK", reason: "SPAM_DETECTED"}

        IF spam_score > 0.5:
            message.spam_warning = true

        RETURN {action: "CONTINUE", modified_message: message}
}

PLUGIN: ReputationCheck {
    priority: 2

    FUNCTION Process(message):
        sender_reputation = GetSenderReputation(message.sender_id)

        IF sender_reputation < 0.3:
            RETURN {action: "BLOCK", reason: "LOW_REPUTATION"}

        IF sender_reputation < 0.5:
            message.low_reputation_warning = true

        RETURN {action: "CONTINUE"}
}

PLUGIN: ContentPolicy {
    priority: 3

    FUNCTION Process(message):
        violations = CheckContentPolicy(message.body)

        IF violations.contains("PROHIBITED_CONTENT"):
            RETURN {action: "BLOCK", reason: "POLICY_VIOLATION"}

        RETURN {action: "CONTINUE"}
}

PLUGIN: DeliveryOptimizer {
    priority: 4

    FUNCTION Process(message):
        // Determine best delivery channel
        recipient_prefs = GetRecipientPreferences(message.recipient_id)
        recipient_online = IsOnline(message.recipient_id)

        message.delivery_hints = {
            push: recipient_prefs.allow_push AND recipient_online,
            email: recipient_prefs.email_inmail AND NOT recipient_online,
            in_app: true
        }

        RETURN {action: "CONTINUE", modified_message: message}
}
```

---

## Indexing Strategy

| Table/Collection | Index | Type | Purpose |
|-----------------|-------|------|---------|
| `jobs` | `(company_id)` | B-tree | Filter by company |
| `jobs` | `(status, posted_at DESC)` | B-tree | Recent active jobs |
| `jobs` | `(location_country, location_region)` | B-tree | Location filter |
| `jobs` | `FULLTEXT(title, description)` | Full-text | Keyword search |
| `job_applications` | `(applicant_id)` | B-tree | User's applications |
| `job_applications` | `(job_id, status)` | B-tree | Job's applicants |
| `companies` | `FULLTEXT(name, description)` | Full-text | Company search |
| `messages` | `(conversation_id, created_at DESC)` | B-tree | Message pagination |
| `participant_state` | `(member_id)` | Hash | Inbox lookup |
| LIquid Graph | `member_connections[id]` | Hash | Connection lookup |
| LIquid Graph | `member_followers[id]` | Hash | Follower lookup |

---

## Partitioning Strategy

| Data Type | Partitioning Key | Strategy | Shards | Rationale |
|-----------|------------------|----------|--------|-----------|
| **Jobs** | `job_id` | Hash | 100 | Even write distribution |
| **Applications** | `applicant_id` | Hash | 100 | User-centric queries |
| **Messages** | `conversation_id` | Hash | 500 | Conversation locality |
| **Participant State** | `member_id` | Hash | 500 | Inbox per shard |
| **Graph (LIquid)** | Replicated | Full | 20-40/region | BFS requires full graph |
| **Posts** | `post_id` | Hash | 200 | Write distribution |
| **Feed Cache** | `member_id` | Hash | 1000 | User-centric access |

---

*Previous: [← 02 - High-Level Design](./02-high-level-design.md) | Next: [04 - Deep Dive & Bottlenecks →](./04-deep-dive-and-bottlenecks.md)*
