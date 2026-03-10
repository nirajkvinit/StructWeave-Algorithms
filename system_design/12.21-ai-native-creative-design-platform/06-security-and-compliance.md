# 12.21 AI-Native Creative Design Platform — Security & Compliance

## Threat Model

The AI-native creative design platform has a unique threat surface that combines traditional SaaS security concerns with AI-specific risks: generated content safety, copyright liability, training data provenance, and adversarial prompt exploitation.

### Threat Categories

| Threat | Attack Vector | Impact | Mitigation |
|---|---|---|---|
| **Prompt injection for unsafe content** | User crafts prompts designed to bypass safety filters and generate NSFW, violent, or prohibited content | Reputational damage; platform liability; user exposure to harmful content | Multi-layer safety: input prompt classifier + output image classifier; adversarial prompt detection; no single-layer bypass possible |
| **Copyright infringement via generation** | AI generates imagery that closely replicates copyrighted works (characters, logos, artwork) | Legal liability; DMCA claims; user trust erosion | Training data provenance (commercially licensed only); output similarity screening against known copyrighted material database; style transfer with copyright distance threshold |
| **Design document exfiltration** | Unauthorized access to another user's designs | IP theft; competitive intelligence leak | RBAC with document-level permissions; sharing links expire; no enumeration via API (UUIDs only) |
| **Asset injection (malware via upload)** | Malicious files disguised as images uploaded to the platform | Client-side exploitation; malware distribution | Virus scanning on every upload; file type validation (magic bytes, not extension); re-encoding all images through the rendering pipeline |
| **Model extraction** | Attacker systematically queries the generation API to reconstruct model weights | Loss of proprietary model IP | Rate limiting per user; generation watermarking; query pattern detection for systematic extraction attempts |
| **Adversarial examples in brand kits** | Attacker uploads adversarial images as brand reference that cause the style transfer to produce harmful output | Harmful content generation bypassing prompt-level safety | Safety screening on brand kit reference images at upload time; style embedding computed from screened images only |
| **Collaboration session hijacking** | Attacker obtains a WebSocket session token and joins a collaborative editing session | Unauthorized design modification; data theft | Session tokens bound to authenticated user; WebSocket connections require valid JWT; session membership validated on every operation |
| **Deepfake generation** | User generates realistic images of identifiable real people | Legal liability (right of publicity); misinformation | Face detection in generated images; if detected faces match known public figures, generation blocked; facial similarity threshold enforcement |

---

## Content Safety Architecture

### Multi-Layer Safety Pipeline

Content safety cannot rely on a single classifier. The platform uses a defense-in-depth approach:

```
Safety pipeline stages:

  Stage 1 — Prompt Classification (pre-generation):
    Input: user's text prompt
    Model: fine-tuned text classifier for prohibited prompt categories
    Categories: NSFW, violence, hate speech, real person likeness, copyrighted character
    Action on detection: block generation; return user-facing policy explanation
    Latency: ~20 ms
    False positive handling: borderline prompts (confidence 0.5-0.8) proceed with enhanced output screening

  Stage 2 — Output Image Classification (post-generation, pre-display):
    Input: generated image
    Model: multi-class image safety classifier
    Categories: nudity, graphic violence, hate symbols, drugs, weapons, photorealistic faces
    Action on detection: block image from canvas display; log for review
    Latency: ~30 ms
    Threshold: high sensitivity (prefer false positives over false negatives)

  Stage 3 — Copyright Similarity Screening (post-generation):
    Input: generated image embedding (CLIP)
    Database: embeddings of ~10M known copyrighted works (characters, logos, famous artworks)
    Method: cosine similarity search; threshold 0.85
    Action on match: block generation; flag for review
    Latency: ~50 ms (ANN search)

  Stage 4 — Human Review Queue (async):
    Triggered by: low-confidence safety classifications, user reports, automated sampling
    Volume: ~0.1% of all generations (~50K/day)
    SLA: review within 4 hours for user reports; 24 hours for sampling
    Output: classifier retraining data; policy updates
```

### User-Generated Content Policy

Uploaded images (not AI-generated) also pass through safety screening:

- All uploads screened by image safety classifier at upload time
- Flagged uploads quarantined; available only to uploader until review completes
- Clear violations (high-confidence NSFW) auto-rejected with policy explanation
- Borderline cases queued for human review within 24 hours
- Designs shared publicly re-screened before publication

---

## Copyright and IP Compliance

### Training Data Provenance

The platform's AI models are trained exclusively on commercially licensed data:

```
Training data provenance chain:
  1. Image generation model:
     - Licensed stock photo datasets (commercially cleared)
     - Platform-created training assets (original photography and illustration)
     - User-contributed assets with explicit training consent (opt-in, not opt-out)
     - NO scraped web images without license
     - NO copyrighted character/logo datasets

  2. Layout model:
     - Anonymized design layouts from platform usage (structure only, no content)
     - Licensed design template datasets
     - Publicly available design guideline documents

  3. Text generation model:
     - Licensed text corpora
     - Platform-generated text with user consent

  Audit trail:
     Every training dataset has a provenance record:
     {dataset_id, source, license_type, license_expiry, usage_scope, audit_date}
     Provenance records retained for the lifetime of any model trained on that data
```

### Generation Attribution and Watermarking

```
Watermarking strategy:
  1. Invisible watermark: steganographic watermark embedded in every AI-generated image
     - Encodes: platform_id, generation_timestamp, model_version
     - Survives: JPEG compression, minor cropping, color adjustments
     - Does not survive: heavy editing, screenshots, re-encoding at low quality

  2. Metadata tagging: EXIF/XMP metadata on exported files includes:
     - "AI-generated: true"
     - "Generation platform: [platform name]"
     - "Model version: [version]"
     - Follows C2PA (Coalition for Content Provenance and Authenticity) standard

  3. Internal provenance: every generated asset linked to generation_job record
     with full reproducibility data (prompt, seed, model version, parameters)
```

---

## Authentication and Authorization

### Access Control Model

```
RBAC hierarchy:
  Organization
    └── Workspace
          ├── Members (role: OWNER | ADMIN | EDITOR | VIEWER)
          └── Designs
                ├── Owner (full control)
                ├── Editors (invited, can edit)
                ├── Commenters (can view + comment)
                └── Viewers (read-only)

  Brand kit access:
    Managed at workspace level
    Only OWNER and ADMIN can create/modify brand kits
    EDITOR can apply brand kits to designs
    Brand kit rules enforced regardless of user role (cannot be bypassed)

  API key scoping:
    Public API keys scoped to: {workspace_id, permissions: [generate, read, export]}
    No API key grants access to another workspace's designs or brand kits
    Rate limits enforced per API key: 100 generations/hour (default), 1000/hour (enterprise)
```

### Design Sharing Security

```
Sharing mechanisms:
  1. Direct sharing: invite by email → user must authenticate; role assigned
  2. Link sharing: shareable URL with embedded token
     - Token encodes: {document_id, permission_level, expiry, creator_id}
     - Signed with HMAC-SHA256 (server-side secret)
     - Configurable expiry: 1 hour to never (default: 30 days)
     - Revocable by design owner at any time
  3. Public publishing: design visible to anyone; no editing; view-only
     - Published designs re-screened by content safety before publication
     - Publishing requires explicit user action (not automatic)

  Anti-enumeration:
    Document IDs are UUIDs; no sequential IDs
    No API endpoint to list all designs (only user's own designs)
    Share tokens are single-use for anonymous access; registered users authenticate normally
```

---

## Data Privacy

### GDPR and CCPA Compliance

| Right | Implementation |
|---|---|
| **Right to access** | User can export all their data: designs (as JSON scene graphs + rendered images), assets, generation history, profile data. Export generated within 72 hours. |
| **Right to erasure** | Erasure request triggers: (1) soft-delete all designs owned by user; (2) remove user's assets from asset store (if reference_count = 0); (3) anonymize generation job records; (4) delete profile and authentication records. Completed within 30 days. |
| **Right to portability** | Designs exported in open format (SVG + JSON metadata); assets in original format. Portable to any design tool that supports SVG import. |
| **Right to object to profiling** | User can opt out of AI-driven template recommendations and personalized suggestions. Opt-out disables all profiling; user sees generic template catalog. |
| **Data minimization** | Generation prompts stored for 90 days (for quality improvement and abuse detection); then anonymized. User designs retained until deletion. No unnecessary data collection. |

### Data Encryption

| Data Category | At Rest | In Transit | Key Management |
|---|---|---|---|
| Design documents | AES-256 | TLS 1.3 | Per-workspace key in managed KMS |
| User assets | AES-256 (server-side) | TLS 1.3 | Per-workspace key |
| Generation prompts | AES-256 | TLS 1.3 | Platform key; auto-purged after 90 days |
| Brand kits | AES-256 | TLS 1.3 | Per-workspace key (brand IP is highly sensitive) |
| Authentication credentials | bcrypt hashed | TLS 1.3 | N/A (hashed, not encrypted) |
| API keys | HMAC-SHA256 | TLS 1.3 | Rotatable; revocable |
| Collaboration session state | In-memory only (not persisted encrypted) | TLS 1.3 (WebSocket) | Ephemeral; cleared on session end |

### User Data in AI Training

```
Training data policy:
  Default: user designs and assets are NOT used for model training
  Opt-in: users can explicitly consent to include their designs in training data
    - Consent is granular: per-design, not blanket
    - Consent is revocable: revoking removes the design from future training batches
    - Anonymization: designs used for training are stripped of PII, brand-specific content,
      and text content before training data pipeline ingestion
    - Only structural and stylistic features are retained (layout patterns, color usage, composition)

  Enterprise customers:
    Enterprise tier explicitly excludes ALL customer data from training
    Contractual guarantee in enterprise agreement
    Enforced by data pipeline: enterprise workspace_ids are in a training exclusion list
```

---

## Compliance Summary

| Regulation | Scope | Key Obligation | Implementation |
|---|---|---|---|
| GDPR | EU users | Data subject rights, data minimization, lawful basis | Erasure pipeline, export tool, consent management |
| CCPA/CPRA | California users | Right to know, delete, opt-out of sale | Same infrastructure as GDPR with California-specific notices |
| C2PA | AI-generated content | Content provenance metadata | Watermarking + EXIF metadata on all AI-generated exports |
| EU AI Act | AI systems in EU | Transparency for AI-generated content | "AI-generated" label on generated content; technical documentation |
| DMCA | US copyright | Takedown for infringing content | Automated copyright screening + DMCA takedown process |
| COPPA | Users under 13 | Age verification, parental consent | Age gate at registration; under-13 accounts restricted from AI generation |
| Accessibility (WCAG 2.1) | All users | Accessible design tool | Keyboard navigation, screen reader support, color contrast in UI |
