# Low-Level Design — Online Learning Platform

## 1. Data Models

### 1.1 Course & Content Domain

```
Course {
    course_id:          UUID (primary key)
    slug:               VARCHAR(255) UNIQUE
    title:              VARCHAR(500)
    description:        TEXT
    short_description:  VARCHAR(1000)
    instructor_id:      UUID (FK → User)
    co_instructor_ids:  UUID[]
    category_id:        UUID (FK → Category)
    subcategory_id:     UUID (FK → Category)
    language:           VARCHAR(10)           -- ISO 639-1 (en, es, zh)
    subtitle_languages: VARCHAR(10)[]
    difficulty_level:   ENUM(beginner, intermediate, advanced, expert)
    estimated_hours:    DECIMAL(5,1)
    price_cents:        INTEGER               -- 0 for free courses
    currency:           VARCHAR(3)            -- ISO 4217
    subscription_tier:  ENUM(free, basic, premium, enterprise)
    thumbnail_url:      VARCHAR(2048)
    preview_video_url:  VARCHAR(2048)
    tags:               VARCHAR(100)[]
    skills:             VARCHAR(200)[]
    prerequisites:      UUID[]                -- course_ids
    rating_avg:         DECIMAL(3,2)
    rating_count:       INTEGER
    enrollment_count:   INTEGER
    version:            INTEGER               -- content version for cache invalidation
    status:             ENUM(draft, in_review, published, archived)
    published_at:       TIMESTAMP
    created_at:         TIMESTAMP
    updated_at:         TIMESTAMP
}

Module {
    module_id:          UUID (primary key)
    course_id:          UUID (FK → Course)
    title:              VARCHAR(500)
    description:        TEXT
    sort_order:         INTEGER
    unlock_rule:        ENUM(sequential, all_previous, none)
    estimated_minutes:  INTEGER
    created_at:         TIMESTAMP
}

Lesson {
    lesson_id:          UUID (primary key)
    module_id:          UUID (FK → Module)
    course_id:          UUID (FK → Course)    -- denormalized for fast queries
    title:              VARCHAR(500)
    lesson_type:        ENUM(video, article, quiz, assignment, lab, live_session)
    sort_order:         INTEGER
    is_preview:         BOOLEAN               -- free preview lesson
    estimated_minutes:  INTEGER
    content_ref:        JSONB                 -- type-specific content reference
    created_at:         TIMESTAMP
}

VideoContent {
    video_id:           UUID (primary key)
    lesson_id:          UUID (FK → Lesson)
    source_url:         VARCHAR(2048)         -- original upload in object storage
    duration_seconds:   INTEGER
    resolution:         VARCHAR(20)           -- source resolution (e.g., "1920x1080")
    manifest_hls_url:   VARCHAR(2048)         -- HLS .m3u8 manifest
    manifest_dash_url:  VARCHAR(2048)         -- DASH .mpd manifest
    drm_key_id:         VARCHAR(128)          -- DRM content key identifier
    thumbnail_url:      VARCHAR(2048)
    sprite_url:         VARCHAR(2048)         -- thumbnail sprite sheet for scrubbing
    transcript:         TEXT                  -- full text transcript for search
    captions:           JSONB                 -- {language: subtitle_url} map
    transcoding_status: ENUM(pending, processing, completed, failed)
    transcoding_job_id: VARCHAR(128)
    file_size_bytes:    BIGINT                -- source file size
    created_at:         TIMESTAMP
}
```

### 1.2 Learner & Progress Domain

```
User {
    user_id:            UUID (primary key)
    email:              VARCHAR(255) UNIQUE
    display_name:       VARCHAR(200)
    avatar_url:         VARCHAR(2048)
    role:               ENUM(learner, instructor, admin, enterprise_admin)
    auth_provider:      ENUM(email, google, apple, saml, oidc)
    auth_provider_id:   VARCHAR(255)
    timezone:           VARCHAR(50)
    language_pref:      VARCHAR(10)
    is_minor:           BOOLEAN               -- COPPA tracking
    parental_consent:   BOOLEAN
    enterprise_id:      UUID (FK → Enterprise, nullable)
    subscription_id:    UUID (FK → Subscription, nullable)
    streak_current:     INTEGER DEFAULT 0
    streak_longest:     INTEGER DEFAULT 0
    xp_total:           BIGINT DEFAULT 0
    created_at:         TIMESTAMP
    last_active_at:     TIMESTAMP
}

Enrollment {
    enrollment_id:      UUID (primary key)
    user_id:            UUID (FK → User)
    course_id:          UUID (FK → Course)
    access_type:        ENUM(purchased, subscription, enterprise, free, scholarship)
    enrolled_at:        TIMESTAMP
    expires_at:         TIMESTAMP             -- null = lifetime access
    completed_at:       TIMESTAMP             -- null = in progress
    progress_pct:       DECIMAL(5,2)          -- denormalized for fast display
    last_lesson_id:     UUID (FK → Lesson)    -- resume point
    certificate_id:     UUID (FK → Certificate, nullable)
    status:             ENUM(active, completed, expired, refunded)
    UNIQUE(user_id, course_id)
}

ProgressEvent {
    event_id:           UUID (primary key)
    user_id:            UUID (partition key)
    course_id:          UUID
    lesson_id:          UUID
    event_type:         ENUM(video_progress, video_completed, lesson_started,
                             lesson_completed, quiz_submitted, quiz_passed,
                             assignment_submitted, certificate_earned)
    payload:            JSONB                 -- type-specific data
    position_seconds:   INTEGER               -- video playback position
    duration_watched:   INTEGER               -- seconds watched in this event
    device_type:        ENUM(web, ios, android, tv)
    session_id:         UUID
    created_at:         TIMESTAMP
    -- Stored in time-series DB, partitioned by user_id + time
}
```

### 1.3 Assessment Domain

```
Assessment {
    assessment_id:      UUID (primary key)
    course_id:          UUID (FK → Course)
    lesson_id:          UUID (FK → Lesson)
    title:              VARCHAR(500)
    assessment_type:    ENUM(quiz, assignment, peer_review, coding_challenge, final_exam)
    time_limit_minutes: INTEGER               -- null = untimed
    max_attempts:       INTEGER               -- null = unlimited
    passing_score_pct:  DECIMAL(5,2)
    question_count:     INTEGER
    randomize_questions: BOOLEAN
    randomize_options:  BOOLEAN
    show_correct_after: ENUM(immediately, after_deadline, after_all_attempts, never)
    weight_in_grade:    DECIMAL(5,2)          -- percentage weight toward course grade
    created_at:         TIMESTAMP
}

Question {
    question_id:        UUID (primary key)
    assessment_id:      UUID (FK → Assessment)
    question_type:      ENUM(multiple_choice, multi_select, true_false, short_answer,
                             essay, code, fill_blank, matching, ordering)
    content:            JSONB                 -- question text, media, code snippets
    options:            JSONB                 -- answer options (for MCQ types)
    correct_answer:     JSONB                 -- encrypted; decrypted only server-side
    explanation:        TEXT                  -- shown after attempt
    difficulty:         DECIMAL(3,2)          -- IRT difficulty parameter (0.0–1.0)
    discrimination:     DECIMAL(3,2)          -- IRT discrimination parameter
    tags:               VARCHAR(100)[]
    sort_order:         INTEGER
    points:             DECIMAL(5,2)
    created_at:         TIMESTAMP
}

Submission {
    submission_id:      UUID (primary key)
    assessment_id:      UUID (FK → Assessment)
    user_id:            UUID (FK → User)
    attempt_number:     INTEGER
    answers:            JSONB                 -- learner's answers (encrypted at rest)
    score_pct:          DECIMAL(5,2)
    points_earned:      DECIMAL(7,2)
    points_possible:    DECIMAL(7,2)
    grading_status:     ENUM(pending, auto_graded, peer_review, instructor_review, final)
    plagiarism_score:   DECIMAL(5,2)          -- 0.0 = unique, 1.0 = identical match
    feedback:           JSONB                 -- per-question feedback
    started_at:         TIMESTAMP
    submitted_at:       TIMESTAMP
    graded_at:          TIMESTAMP
}

PeerReview {
    review_id:          UUID (primary key)
    submission_id:      UUID (FK → Submission)
    reviewer_user_id:   UUID (FK → User)
    rubric_scores:      JSONB                 -- {criterion: score} mapping
    overall_score:      DECIMAL(5,2)
    feedback_text:      TEXT
    helpfulness_rating: INTEGER               -- 1-5 rating of review quality
    status:             ENUM(assigned, in_progress, submitted, flagged)
    assigned_at:        TIMESTAMP
    submitted_at:       TIMESTAMP
}
```

### 1.4 Credential Domain

```
Certificate {
    certificate_id:     UUID (primary key)
    user_id:            UUID (FK → User)
    course_id:          UUID (FK → Course)
    enrollment_id:      UUID (FK → Enrollment)
    display_name:       VARCHAR(200)          -- learner name as displayed
    course_title:       VARCHAR(500)
    instructor_name:    VARCHAR(200)
    issued_at:          TIMESTAMP
    final_grade_pct:    DECIMAL(5,2)
    grade_label:        VARCHAR(50)           -- "Pass", "Pass with Honors", "Distinction"
    pdf_url:            VARCHAR(2048)         -- signed URL to PDF in object storage
    badge_assertion:    JSONB                 -- Open Badges 3.0 assertion JSON
    verification_hash:  VARCHAR(128)          -- SHA-512 of assertion for tamper detection
    blockchain_tx_hash: VARCHAR(128)          -- optional blockchain anchor transaction
    blockchain_network: VARCHAR(50)           -- optional (e.g., "ethereum_mainnet")
    revoked:            BOOLEAN DEFAULT FALSE
    revoked_reason:     TEXT
    created_at:         TIMESTAMP
}
```

---

## 2. API Contracts

### 2.1 Video Playback API

```
GET /api/v1/lessons/{lesson_id}/playback
Authorization: Bearer {jwt}

Response 200:
{
  "lesson": {
    "lesson_id": "uuid",
    "title": "Introduction to Binary Trees",
    "duration_seconds": 1845,
    "lesson_type": "video"
  },
  "playback": {
    "manifest_url": "https://cdn.example.com/v/{video_id}/manifest.m3u8?token={signed_token}&exp={expiry}",
    "drm_license_url": "https://drm.example.com/license?token={drm_token}",
    "drm_scheme": "widevine",  // or "fairplay" based on client
    "thumbnail_sprite_url": "https://cdn.example.com/v/{video_id}/sprites.jpg",
    "captions": [
      {"language": "en", "url": "https://cdn.example.com/v/{video_id}/captions_en.vtt"},
      {"language": "es", "url": "https://cdn.example.com/v/{video_id}/captions_es.vtt"}
    ]
  },
  "resume": {
    "position_seconds": 872,
    "last_watched_at": "2026-03-01T14:30:00Z",
    "device": "ios"
  },
  "navigation": {
    "previous_lesson_id": "uuid",
    "next_lesson_id": "uuid",
    "is_next_locked": false
  }
}
```

### 2.2 Progress Tracking API

```
POST /api/v1/progress/events
Authorization: Bearer {jwt}
Content-Type: application/json

Request:
{
  "events": [
    {
      "event_type": "video_progress",
      "lesson_id": "uuid",
      "course_id": "uuid",
      "position_seconds": 877,
      "duration_watched": 5,
      "playback_speed": 1.5,
      "quality_level": "720p",
      "session_id": "uuid",
      "client_timestamp": "2026-03-01T14:30:05Z"
    }
  ]
}

Response 202:
{
  "accepted": 1,
  "progress_snapshot": {
    "course_id": "uuid",
    "overall_pct": 34.5,
    "current_lesson": {
      "lesson_id": "uuid",
      "position_seconds": 877,
      "completed": false
    },
    "streak_days": 7
  }
}
```

### 2.3 Assessment API

```
POST /api/v1/assessments/{assessment_id}/start
Authorization: Bearer {jwt}

Response 200:
{
  "attempt_id": "uuid",
  "assessment": {
    "assessment_id": "uuid",
    "title": "Module 3 Quiz",
    "time_limit_minutes": 30,
    "question_count": 15,
    "attempt_number": 1,
    "max_attempts": 3
  },
  "questions": [
    {
      "question_id": "uuid",
      "question_type": "multiple_choice",
      "content": {
        "text": "What is the time complexity of binary search?",
        "code_snippet": null,
        "image_url": null
      },
      "options": [
        {"id": "a", "text": "O(n)"},
        {"id": "b", "text": "O(log n)"},
        {"id": "c", "text": "O(n log n)"},
        {"id": "d", "text": "O(1)"}
      ],
      "points": 1.0
    }
    // ... more questions (randomized order)
  ],
  "started_at": "2026-03-01T15:00:00Z",
  "expires_at": "2026-03-01T15:30:00Z"
}

---

POST /api/v1/assessments/{assessment_id}/submit
Authorization: Bearer {jwt}

Request:
{
  "attempt_id": "uuid",
  "answers": [
    {"question_id": "uuid", "selected": "b"},
    {"question_id": "uuid", "selected": ["a", "c"]},
    {"question_id": "uuid", "code": "function binarySearch(arr, target) { ... }"}
  ],
  "time_taken_seconds": 1245
}

Response 200 (auto-graded):
{
  "submission_id": "uuid",
  "score_pct": 86.7,
  "points_earned": 13.0,
  "points_possible": 15.0,
  "passed": true,
  "results": [
    {
      "question_id": "uuid",
      "correct": true,
      "points_earned": 1.0,
      "explanation": "Binary search halves the search space each iteration."
    }
    // ...
  ],
  "course_progress_pct": 67.2
}
```

### 2.4 Certificate Verification API

```
GET /api/v1/verify/{certificate_id}
// Public endpoint - no authentication required

Response 200:
{
  "valid": true,
  "certificate": {
    "certificate_id": "uuid",
    "recipient_name": "Jane Smith",
    "course_title": "Data Structures and Algorithms Specialization",
    "instructor_name": "Dr. Robert Chen",
    "issued_at": "2026-02-15T10:00:00Z",
    "grade": "Pass with Honors (92%)",
    "issuer": {
      "name": "Learning Platform",
      "url": "https://example.com"
    }
  },
  "verification": {
    "hash_valid": true,
    "blockchain_anchored": true,
    "blockchain_tx": "0xabc123...",
    "blockchain_network": "ethereum_mainnet",
    "revoked": false
  },
  "open_badge": {
    "version": "3.0",
    "assertion_url": "https://example.com/badges/assertions/{id}",
    "badge_class_url": "https://example.com/badges/classes/{id}"
  }
}
```

### 2.5 Search API

```
GET /api/v1/search?q=machine+learning&category=data-science&difficulty=intermediate&language=en&rating_min=4.0&sort=relevance&page=1&page_size=20
Authorization: Bearer {jwt} (optional — affects personalization)

Response 200:
{
  "results": [
    {
      "course_id": "uuid",
      "title": "Machine Learning Foundations",
      "instructor": {"name": "Dr. Sarah Kim", "avatar_url": "..."},
      "rating_avg": 4.7,
      "rating_count": 12500,
      "enrollment_count": 250000,
      "difficulty": "intermediate",
      "estimated_hours": 40,
      "price_cents": 4999,
      "thumbnail_url": "...",
      "tags": ["machine-learning", "python", "statistics"],
      "match_score": 0.95,
      "personalization_boost": 0.12  // only if authenticated
    }
    // ... more results
  ],
  "facets": {
    "categories": [{"name": "Data Science", "count": 342}, ...],
    "difficulty": [{"name": "beginner", "count": 120}, ...],
    "language": [{"name": "en", "count": 890}, ...],
    "rating": [{"name": "4.5+", "count": 156}, ...]
  },
  "total": 1247,
  "page": 1,
  "page_size": 20,
  "query_time_ms": 45
}
```

---

## 3. Core Algorithms

### 3.1 Progress Calculation Algorithm

```
FUNCTION calculateCourseProgress(user_id, course_id):
    // Fetch course content graph
    modules ← getCourseModules(course_id)
    total_weight ← 0
    earned_weight ← 0

    FOR EACH module IN modules:
        lessons ← getModuleLessons(module.module_id)

        FOR EACH lesson IN lessons:
            lesson_weight ← getLessonWeight(lesson)
            total_weight ← total_weight + lesson_weight

            IF lesson.lesson_type = "video":
                // Video progress based on watched percentage
                watched_pct ← getVideoWatchedPercentage(user_id, lesson.lesson_id)
                // Consider complete if 90%+ watched (accounts for skipping intros/outros)
                IF watched_pct >= 0.90:
                    earned_weight ← earned_weight + lesson_weight
                ELSE:
                    earned_weight ← earned_weight + (lesson_weight × watched_pct)

            ELSE IF lesson.lesson_type IN ("quiz", "assignment", "coding_challenge"):
                // Assessment progress based on best passing attempt
                best_submission ← getBestSubmission(user_id, lesson.assessment_id)
                IF best_submission IS NOT NULL AND best_submission.score_pct >= passing_threshold:
                    earned_weight ← earned_weight + lesson_weight
                ELSE IF best_submission IS NOT NULL:
                    // Partial credit for attempted but not passed
                    earned_weight ← earned_weight + (lesson_weight × 0.25)

            ELSE IF lesson.lesson_type = "article":
                // Article marked complete when learner explicitly confirms
                IF isLessonMarkedComplete(user_id, lesson.lesson_id):
                    earned_weight ← earned_weight + lesson_weight

    overall_pct ← (earned_weight / total_weight) × 100
    RETURN ROUND(overall_pct, 2)

FUNCTION getLessonWeight(lesson):
    // Weighted by type: assessments count more than videos
    SWITCH lesson.lesson_type:
        CASE "video": RETURN lesson.estimated_minutes
        CASE "article": RETURN lesson.estimated_minutes × 0.5
        CASE "quiz": RETURN lesson.estimated_minutes × 2.0
        CASE "assignment": RETURN lesson.estimated_minutes × 3.0
        CASE "coding_challenge": RETURN lesson.estimated_minutes × 3.0
        CASE "final_exam": RETURN lesson.estimated_minutes × 5.0
        DEFAULT: RETURN lesson.estimated_minutes

FUNCTION getVideoWatchedPercentage(user_id, lesson_id):
    // Aggregate progress events to compute actual unique seconds watched
    events ← getProgressEvents(user_id, lesson_id, type="video_progress")
    duration ← getVideoDuration(lesson_id)

    // Build a watched-intervals set to handle rewatching and seeking
    watched_intervals ← IntervalSet()
    FOR EACH event IN events:
        start ← event.position_seconds - event.duration_watched
        end ← event.position_seconds
        watched_intervals.add(Interval(MAX(0, start), MIN(end, duration)))

    // Merge overlapping intervals and compute total unique seconds
    merged ← watched_intervals.merge()
    total_unique_watched ← SUM(interval.length FOR interval IN merged)

    RETURN total_unique_watched / duration
```

### 3.2 Recommendation Engine Algorithm

```
FUNCTION generateRecommendations(user_id, count=20):
    // Hybrid approach: collaborative filtering + content-based + popularity

    // 1. Collaborative Filtering (user-based)
    user_history ← getUserCourseHistory(user_id)  // enrolled + completed courses
    similar_users ← findSimilarUsers(user_id, user_history, top_k=100)

    cf_scores ← {}
    FOR EACH similar_user IN similar_users:
        similarity ← cosineSimilarity(user_history, similar_user.history)
        their_courses ← similar_user.completed_courses - user_history.enrolled_courses
        FOR EACH course IN their_courses:
            cf_scores[course] ← cf_scores.getOrDefault(course, 0) + similarity × similar_user.rating(course)

    // 2. Content-Based Filtering (skill similarity)
    user_skills ← getUserSkillProfile(user_id)  // skills from completed courses
    user_interests ← getUserInterests(user_id)   // explicit preferences + implicit signals

    cb_scores ← {}
    candidate_courses ← getCoursesBySkillOverlap(user_skills, user_interests)
    FOR EACH course IN candidate_courses:
        IF course NOT IN user_history.enrolled_courses:
            skill_relevance ← jaccardSimilarity(course.skills, user_skills.gaps)
            interest_match ← cosineSimilarity(course.tags, user_interests)
            cb_scores[course] ← 0.6 × skill_relevance + 0.4 × interest_match

    // 3. Popularity Signal (trending + high-rated)
    pop_scores ← {}
    trending ← getTrendingCourses(timeframe="7d", category=user_interests.top_categories)
    FOR EACH course IN trending:
        IF course NOT IN user_history.enrolled_courses:
            pop_scores[course] ← normalize(course.enrollment_velocity × course.rating_avg)

    // 4. Blend scores with weights
    final_scores ← {}
    FOR EACH course IN UNION(cf_scores.keys, cb_scores.keys, pop_scores.keys):
        final_scores[course] ← (
            0.45 × cf_scores.getOrDefault(course, 0) +
            0.35 × cb_scores.getOrDefault(course, 0) +
            0.15 × pop_scores.getOrDefault(course, 0) +
            0.05 × recencyBoost(course)
        )

    // 5. Apply business rules
    filtered ← applyBusinessRules(final_scores):
        - Remove courses the user already enrolled in
        - Remove courses below minimum rating (3.5)
        - Boost courses matching user's subscription tier
        - Apply diversity: no more than 3 courses from same instructor
        - Apply diversity: at least 3 different categories in top 10

    RETURN TOP_K(filtered, count)

FUNCTION findSimilarUsers(user_id, user_history, top_k):
    // Uses pre-computed user embedding vectors (updated daily)
    user_vector ← getUserEmbedding(user_id)
    // Approximate nearest neighbors via locality-sensitive hashing
    candidates ← annSearch(user_vector, index="user_embeddings", top_k=top_k)
    RETURN candidates
```

### 3.3 Adaptive Assessment Algorithm

```
FUNCTION selectNextQuestion(learner_ability, asked_questions, question_pool):
    // Item Response Theory (IRT) based adaptive question selection
    // Uses 2-Parameter Logistic model: P(correct) = 1 / (1 + exp(-a(θ - b)))
    //   θ = learner ability estimate
    //   a = question discrimination parameter
    //   b = question difficulty parameter

    max_information ← -INFINITY
    best_question ← NULL

    FOR EACH question IN question_pool:
        IF question.question_id IN asked_questions:
            CONTINUE

        // Calculate Fisher Information for this question at current ability
        p ← probability_correct(learner_ability, question.discrimination, question.difficulty)
        information ← question.discrimination² × p × (1 - p)

        // Penalize questions from same topic cluster (ensure coverage)
        topic_penalty ← countSameTopicAsked(question.tags, asked_questions) × 0.3
        adjusted_info ← information - topic_penalty

        IF adjusted_info > max_information:
            max_information ← adjusted_info
            best_question ← question

    RETURN best_question

FUNCTION updateAbilityEstimate(current_ability, question, is_correct):
    // Maximum Likelihood Estimation update step
    p ← probability_correct(current_ability, question.discrimination, question.difficulty)

    // Newton-Raphson step for MLE
    gradient ← question.discrimination × (is_correct - p)
    hessian ← -question.discrimination² × p × (1 - p)

    // Update with step size dampening for stability
    step_size ← 0.5
    new_ability ← current_ability - step_size × (gradient / hessian)

    // Clamp to reasonable range [-4, 4] on logit scale
    new_ability ← CLAMP(new_ability, -4.0, 4.0)

    RETURN new_ability

FUNCTION probability_correct(ability, discrimination, difficulty):
    RETURN 1.0 / (1.0 + EXP(-discrimination × (ability - difficulty)))
```

### 3.4 Certificate Generation Pipeline

```
FUNCTION generateCertificate(user_id, course_id, enrollment_id):
    // Step 1: Validate completion
    progress ← calculateCourseProgress(user_id, course_id)
    IF progress < 100:
        RETURN error("Course not completed")

    grade ← calculateFinalGrade(user_id, course_id)
    IF grade < passing_threshold:
        RETURN error("Grade below passing threshold")

    // Step 2: Gather certificate data
    user ← getUser(user_id)
    course ← getCourse(course_id)
    instructor ← getUser(course.instructor_id)

    // Step 3: Determine grade label
    grade_label ← SWITCH:
        CASE grade >= 97: "Distinction"
        CASE grade >= 90: "Pass with Honors"
        CASE grade >= passing_threshold: "Pass"

    // Step 4: Generate unique certificate ID and verification hash
    cert_id ← generateUUID()
    assertion_data ← {
        "@context": "https://w3id.org/openbadges/v3",
        "type": "OpenBadgeCredential",
        "id": "https://platform.example.com/badges/assertions/{cert_id}",
        "issuer": { "id": "https://platform.example.com", "name": "Platform Name" },
        "issuanceDate": NOW(),
        "credentialSubject": {
            "id": "urn:uuid:{user_id}",
            "name": user.display_name,
            "achievement": {
                "name": course.title,
                "criteria": { "narrative": "Completed all modules with grade ≥ {passing_threshold}%" }
            }
        }
    }

    verification_hash ← SHA512(canonicalize(assertion_data))

    // Step 5: Generate PDF
    pdf ← renderCertificatePDF(
        template="standard_v2",
        recipient_name=user.display_name,
        course_title=course.title,
        instructor_name=instructor.display_name,
        grade=grade_label,
        date=NOW(),
        cert_id=cert_id,
        qr_code=generateQRCode("https://platform.example.com/verify/{cert_id}")
    )

    // Step 6: Store certificate artifacts
    pdf_url ← uploadToObjectStorage("certificates/{cert_id}.pdf", pdf)

    // Step 7: Optional blockchain anchoring (batched)
    blockchain_tx ← NULL
    IF course.blockchain_anchoring_enabled:
        enqueuForBlockchainAnchoring(cert_id, verification_hash)
        // Batched: 1000 hashes per Merkle tree → 1 on-chain transaction

    // Step 8: Persist certificate record
    certificate ← Certificate{
        certificate_id: cert_id,
        user_id: user_id,
        course_id: course_id,
        enrollment_id: enrollment_id,
        display_name: user.display_name,
        course_title: course.title,
        instructor_name: instructor.display_name,
        issued_at: NOW(),
        final_grade_pct: grade,
        grade_label: grade_label,
        pdf_url: pdf_url,
        badge_assertion: assertion_data,
        verification_hash: verification_hash,
        blockchain_tx_hash: blockchain_tx
    }
    saveCertificate(certificate)

    // Step 9: Update enrollment and notify
    updateEnrollment(enrollment_id, certificate_id=cert_id, status="completed")
    emitEvent("CertificateEarned", {user_id, course_id, cert_id})
    sendNotification(user_id, "certificate_ready", {cert_id, course_title: course.title})

    RETURN certificate
```

---

## 4. Database Schema Design

### 4.1 Storage Engine Selection

| Domain | Storage Engine | Rationale |
|---|---|---|
| **Course catalog** | Relational DB | ACID for course publishing, complex joins for catalog queries, referential integrity for content graph |
| **Content blocks** | Document DB | Flexible schema for diverse content types (video, quiz, article), nested structures, rapid iteration |
| **Progress events** | Time-series DB | Append-heavy write pattern, time-range queries, automatic downsampling, efficient compression |
| **Search index** | Full-text search engine | Inverted index for text search, faceted aggregations, relevance scoring, autocomplete |
| **User sessions** | Distributed cache | Sub-millisecond reads for session validation, TTL-based expiry, high throughput |
| **Video files** | Object storage | Massive scale (120 PB), CDN-integrated, lifecycle policies for cost optimization |
| **Analytics** | Columnar data lake | Ad-hoc queries on billions of events, cost-effective long-term storage |

### 4.2 Indexing Strategy

```
-- Course table indexes
CREATE INDEX idx_course_category ON course(category_id, status, rating_avg DESC);
CREATE INDEX idx_course_instructor ON course(instructor_id, status);
CREATE INDEX idx_course_slug ON course(slug) WHERE status = 'published';
CREATE INDEX idx_course_skills ON course USING GIN(skills);
CREATE INDEX idx_course_tags ON course USING GIN(tags);

-- Enrollment table indexes (most queried table)
CREATE UNIQUE INDEX idx_enrollment_user_course ON enrollment(user_id, course_id);
CREATE INDEX idx_enrollment_user_active ON enrollment(user_id, status) WHERE status = 'active';
CREATE INDEX idx_enrollment_course_count ON enrollment(course_id) WHERE status IN ('active', 'completed');

-- Submission table indexes
CREATE INDEX idx_submission_user_assessment ON submission(user_id, assessment_id, attempt_number DESC);
CREATE INDEX idx_submission_grading ON submission(grading_status) WHERE grading_status = 'pending';

-- Progress events (time-series DB)
-- Partitioned by user_id (hash) and time (range)
-- Retention: 90 days hot (full resolution), 1 year warm (1-minute aggregates), 3 years cold (hourly aggregates)
```

### 4.3 Caching Strategy

| Cache Layer | Data | TTL | Invalidation |
|---|---|---|---|
| **CDN edge** | Video segments, thumbnails, static assets | 24 hours | Purge on content update |
| **API response cache** | Course catalog pages, search results | 5 minutes | Event-driven invalidation on CourseUpdated |
| **Application cache** | Course metadata, enrollment status, user profile | 15 minutes | Write-through on mutations |
| **Progress cache** | Current lesson position, overall progress % | 30 seconds | Updated on every progress event |
| **Session cache** | JWT claims, user permissions, feature flags | Session duration | Revoked on logout/password change |
| **Recommendation cache** | Pre-computed recommendations per user | 6 hours | Refreshed on course completion or enrollment |
| **Question bank cache** | Assessment questions (read-heavy) | 1 hour | Invalidated on question edit |

---

## 5. Data Partitioning Strategy

### 5.1 Sharding Approach

| Table | Shard Key | Strategy | Rationale |
|---|---|---|---|
| **Enrollment** | user_id | Hash | Access pattern is always per-user; uniform distribution |
| **Progress events** | user_id + time | Hash + range | Per-user time-range queries; time-based retention |
| **Submissions** | user_id | Hash | Always queried with user context |
| **Courses** | course_id | Hash | Even distribution; rarely cross-queried |
| **Certificates** | user_id | Hash | Queried per-user; verification uses cert_id (global index) |

### 5.2 Read Replica Topology

```
Write Path (mutations):
  Client → API Gateway → Primary DB (single leader per shard)

Read Path (queries):
  Client → API Gateway → Read Replica (nearest region)
    - Course catalog: 99% reads → 8 read replicas (2 per region)
    - Enrollment checks: 95% reads → 4 read replicas
    - Progress reads: served from cache (95% hit rate), fallback to replica

Cross-Region Replication:
  US-East (Primary) ──async──► EU-West (Replica) ──async──► AP-Southeast (Replica)
  Replication lag target: < 500ms for enrollment, < 2s for catalog
```

---

*Next: [Deep Dive & Bottlenecks ->](./04-deep-dive-and-bottlenecks.md)*
