# High-Level Design

[Back to Index](./00-index.md)

---

## System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        NurseStation["Nurse Station<br/>Bed Board"]
        ADTTerminal["ADT Registration<br/>Terminal"]
        ORConsole["OR Scheduling<br/>Console"]
        BillingWS["Billing<br/>Workstation"]
        MobileApp["Staff Mobile<br/>App"]
        CommandCenter["Operations<br/>Command Center"]
    end

    subgraph GatewayLayer["Gateway Layer"]
        APIGW["API Gateway<br/>Rate Limiting, Auth"]
        AuthSvc["Auth Service<br/>OIDC + MFA"]
        OPAEngine["OPA Policy<br/>Engine"]
    end

    subgraph CoreServices["Core HMS Services"]
        EMPISvc["EMPI<br/>Service"]
        BedSvc["Bed Management<br/>Service"]
        ADTSvc["ADT Workflow<br/>Service"]
        ORSvc["OR Scheduling<br/>Service"]
        ApptSvc["Appointment<br/>Service"]
        RCMSvc["Revenue Cycle<br/>Service"]
        SagaOrch["Saga<br/>Orchestrator"]
    end

    subgraph AILayer["AI Platform"]
        BedAI["Bed Prediction<br/>Model"]
        ORAI["OR Duration<br/>Model"]
        LOSAI["LOS Prediction<br/>Model"]
        CodingAI["Medical Coding<br/>AI"]
        RiskAI["Readmission<br/>Risk Model"]
    end

    subgraph IntegrationHub["Integration Hub"]
        HL7Engine["HL7v2/FHIR<br/>Translation Engine"]
        EMRAdapter["EMR Adapter<br/>(2.23)"]
        CDSAdapter["CDS Adapter<br/>(2.24)"]
        PharmAdapter["Pharmacy Adapter<br/>(2.25)"]
        LISAdapter["LIS/RIS<br/>Adapter"]
        PayerAdapter["Payer<br/>Adapter"]
    end

    subgraph DataLayer["Data Layer"]
        PG[(PostgreSQL<br/>Primary)]
        Redis[(Redis Cluster<br/>Bed State)]
        Kafka[(Kafka<br/>Event Bus)]
        TSDB[(TimescaleDB<br/>Metrics)]
        S3[(Object Storage<br/>Documents)]
    end

    ClientLayer --> APIGW
    APIGW --> AuthSvc --> OPAEngine
    OPAEngine --> CoreServices
    CoreServices <--> SagaOrch
    CoreServices --> AILayer
    CoreServices <--> IntegrationHub
    CoreServices <--> DataLayer
    IntegrationHub --> EMRAdapter & CDSAdapter & PharmAdapter & LISAdapter & PayerAdapter

    style ClientLayer fill:#e3f2fd
    style CoreServices fill:#e8f5e9
    style AILayer fill:#fff3e0
    style IntegrationHub fill:#fce4ec
    style DataLayer fill:#f3e5f5
```

---

## Component Overview

### Gateway Layer

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **API Gateway** | Request routing, rate limiting, TLS termination | Kong / AWS API Gateway |
| **Auth Service** | Authentication (OIDC), MFA enforcement, session management | Keycloak / Auth0 |
| **OPA Policy Engine** | Authorization decisions, compliance policy enforcement | Open Policy Agent |

### Core HMS Services

| Service | Responsibility | Key Operations |
|---------|---------------|----------------|
| **EMPI Service** | Patient identity management | Search, match, create, merge, link |
| **Bed Management Service** | Real-time bed state, AI-assisted assignment | Query availability, assign, transfer, release |
| **ADT Workflow Service** | Admission/discharge/transfer orchestration | Initiate, coordinate, complete workflows |
| **OR Scheduling Service** | Operating theater scheduling and optimization | Schedule cases, manage blocks, track utilization |
| **Appointment Service** | Outpatient scheduling | Book, reschedule, cancel, waitlist |
| **Revenue Cycle Service** | Billing, claims, denials | Capture charges, generate claims, manage AR |
| **Saga Orchestrator** | Multi-step workflow coordination | Start saga, handle compensation, track state |

### AI Platform

| Model | Purpose | Input | Output | Accuracy |
|-------|---------|-------|--------|----------|
| **Bed Prediction** | Forecast bed demand | Historical census, scheduled admissions, ED census | 24/48/72h occupancy forecast | MAPE <10% |
| **OR Duration** | Predict case duration | Procedure, surgeon, patient factors | Estimated minutes | MAE <15 min |
| **LOS Prediction** | Predict length of stay | Diagnosis, comorbidities, admission source | Expected days | AUC 0.85-0.90 |
| **Medical Coding** | Suggest ICD-10, CPT codes | Clinical documentation | Code candidates with confidence | 80% acceptance |
| **Readmission Risk** | 30-day readmission score | Patient history, discharge factors | Risk score 0-1 | AUC 0.75-0.80 |

### Integration Hub

| Adapter | External System | Protocol | Direction |
|---------|----------------|----------|-----------|
| **EMR Adapter** | EMR/EHR (2.23) | FHIR R4, CDS Hooks | Bidirectional |
| **CDS Adapter** | Clinical Decision Support (2.24) | CDS Hooks | Inbound (alerts) |
| **Pharmacy Adapter** | Pharmacy OS (2.25) | FHIR R4 | Bidirectional |
| **LIS/RIS Adapter** | Laboratory/Radiology | HL7v2 ORM/ORU | Bidirectional |
| **Payer Adapter** | Insurance companies | X12 837/835, FHIR Claim | Outbound |

---

## Data Flow Diagrams

### 1. Patient Admission Flow (ADT Saga)

```mermaid
sequenceDiagram
    autonumber
    participant Reg as Registration Terminal
    participant EMPI as EMPI Service
    participant Saga as Saga Orchestrator
    participant Bed as Bed Management
    participant ADT as ADT Service
    participant EMR as EMR (2.23)
    participant Billing as Revenue Cycle
    participant Kafka as Event Bus

    Reg->>EMPI: 1. Search patient (name, DOB, SSN)
    EMPI->>EMPI: Probabilistic matching
    EMPI-->>Reg: Match candidates (confidence scores)

    alt New Patient
        Reg->>EMPI: Create patient record
        EMPI-->>Reg: EMPI ID + MRN assigned
    else Existing Patient
        Reg->>EMPI: Confirm identity
        EMPI-->>Reg: EMPI ID retrieved
    end

    Reg->>Saga: 2. Initiate admission saga

    Saga->>Bed: 3. Request bed (unit, acuity, requirements)
    Bed->>Bed: AI prediction (optimal placement)
    Bed->>Bed: Lock candidate bed
    Bed-->>Saga: Bed assigned (3A-101)

    Saga->>ADT: 4. Create encounter
    ADT->>ADT: Generate encounter ID
    ADT-->>Saga: Encounter created

    Saga->>Billing: 5. Initialize billing account
    Billing->>Billing: Verify insurance
    Billing-->>Saga: Account created

    Saga->>Kafka: 6. Publish ADT^A01 (Admit)

    par Async Notifications
        Kafka-->>EMR: Create clinical encounter
        Kafka-->>Bed: Confirm bed occupied
        Kafka-->>Billing: Start charge accumulation
    end

    Saga-->>Reg: 7. Admission complete

    Note over Saga: If any step fails, compensating transactions execute
```

### 2. Bed Management Flow with AI

```mermaid
sequenceDiagram
    autonumber
    participant Nurse as Nurse Station
    participant BedSvc as Bed Management
    participant Redis as Redis (State)
    participant AI as AI Platform
    participant PG as PostgreSQL
    participant Kafka as Event Bus
    participant HSK as Housekeeping

    Nurse->>BedSvc: Query available beds (Unit 3A)
    BedSvc->>Redis: GET beds:3A:*
    Redis-->>BedSvc: Bed states (cached)
    BedSvc->>AI: Get AI recommendations
    AI-->>BedSvc: Optimal beds ranked
    BedSvc-->>Nurse: Available beds with AI scores

    Nurse->>BedSvc: Assign bed 3A-101 to patient
    BedSvc->>PG: INSERT bed_assignment (exclusive lock)

    alt Conflict Detected
        PG-->>BedSvc: Exclusion constraint violation
        BedSvc-->>Nurse: Bed already assigned, retry
    else Success
        PG-->>BedSvc: Assignment created
        BedSvc->>Redis: SET bed:3A-101 = occupied
        BedSvc->>Kafka: Publish bed.assigned event
        BedSvc-->>Nurse: Assignment confirmed
    end

    Note over Nurse,HSK: Later: Discharge triggers cleaning

    Kafka-->>HSK: bed.released event
    HSK->>BedSvc: Mark bed cleaning_in_progress
    BedSvc->>Redis: UPDATE bed:3A-101.status

    HSK->>BedSvc: Mark bed clean
    BedSvc->>Redis: UPDATE bed:3A-101.status = available
    BedSvc->>Kafka: Publish bed.available event
```

### 3. OR Scheduling Flow with ML

```mermaid
sequenceDiagram
    autonumber
    participant Sched as OR Scheduler
    participant ORSvc as OR Scheduling Service
    participant AI as AI Platform
    participant PG as PostgreSQL
    participant Kafka as Event Bus
    participant EMR as EMR (2.23)

    Sched->>ORSvc: Request schedule for Dr. Smith, next week
    ORSvc->>PG: Query block allocations
    PG-->>ORSvc: Block times for Dr. Smith
    ORSvc-->>Sched: Available slots

    Sched->>ORSvc: Schedule case (procedure, patient, time)
    ORSvc->>AI: Predict case duration
    AI->>AI: Features: procedure, surgeon, patient BMI, ASA, comorbidities
    AI-->>ORSvc: Predicted duration: 120 min (95% CI: 100-150)

    ORSvc->>ORSvc: Validate against block time

    alt Fits in Block
        ORSvc->>PG: INSERT or_case
        PG-->>ORSvc: Case scheduled
        ORSvc->>Kafka: Publish or.case.scheduled
        ORSvc-->>Sched: Case confirmed
    else Exceeds Block
        ORSvc-->>Sched: Warning: case may exceed block time
        Sched->>ORSvc: Approve overtime / reschedule
    end

    par Notifications
        Kafka-->>EMR: Pre-op orders trigger
        Kafka-->>ORSvc: Resource allocation (equipment, staff)
    end

    Note over ORSvc,AI: Day of surgery: Actual vs predicted tracked for model retraining
```

### 4. Discharge Flow with Revenue Cycle

```mermaid
sequenceDiagram
    autonumber
    participant Nurse as Nurse Station
    participant ADT as ADT Service
    participant Saga as Saga Orchestrator
    participant EMR as EMR (2.23)
    participant Pharm as Pharmacy (2.25)
    participant RCM as Revenue Cycle
    participant AI as AI Platform
    participant Bed as Bed Management

    Nurse->>ADT: Initiate discharge
    ADT->>Saga: Start discharge saga

    Saga->>EMR: 1. Verify orders complete
    EMR-->>Saga: All orders signed/completed

    Saga->>Pharm: 2. Medication reconciliation
    Pharm-->>Saga: Discharge meds ready

    Saga->>EMR: 3. Generate discharge summary
    EMR-->>Saga: Summary generated

    Saga->>RCM: 4. Finalize charges
    RCM->>RCM: Collect all charges
    RCM->>AI: Request coding suggestions
    AI->>AI: Analyze documentation
    AI-->>RCM: ICD-10, CPT, DRG suggestions
    RCM->>RCM: Coder review (human-in-loop)
    RCM-->>Saga: Charges finalized

    Saga->>Bed: 5. Release bed
    Bed->>Bed: Update bed state
    Bed-->>Saga: Bed released

    Saga->>ADT: 6. Complete discharge
    ADT->>Kafka: Publish ADT^A03 (Discharge)

    Saga-->>Nurse: Discharge complete

    par Post-Discharge
        RCM->>RCM: Generate claim
        AI->>AI: Calculate readmission risk
    end
```

---

## Key Architectural Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| **EMPI Algorithm** | Probabilistic (Fellegi-Sunter) + ML | Deterministic only, Exact match | Handles dirty data, typos, name variations |
| **Bed State Store** | Redis (hot) + PostgreSQL (durable) | PostgreSQL only, Redis only | Sub-10ms queries + ACID durability |
| **Workflow Pattern** | Orchestrated Saga | Choreography, 2PC, None | Complex multi-step ADT with compensation |
| **AI Model Hosting** | Self-hosted (on-premise/VPC) | Cloud AI APIs | HIPAA compliance, PHI stays internal |
| **Event Backbone** | Apache Kafka | RabbitMQ, AWS SQS | Durability, replay, high throughput |
| **Integration Protocol** | FHIR R4 (primary) + HL7v2 (legacy) | FHIR only, Custom APIs | Industry standard + backward compatibility |
| **Authorization** | OPA (Open Policy Agent) | Custom RBAC, Casbin | Declarative, auditable, complex rules |
| **Consistency** | Strong for ops, Eventual for analytics | Eventual everywhere | Safety-critical bed assignments |

---

## Architecture Pattern Checklist

- [x] **Sync vs Async**: Sync for bed assignment, Async for notifications and analytics
- [x] **Event-driven vs Request-response**: Event-driven for cross-system integration
- [x] **Push vs Pull**: Push for ADT events, Pull for queries
- [x] **Stateless vs Stateful**: Stateless services, stateful orchestrator
- [x] **Read-heavy vs Write-heavy**: Read-heavy for beds (Redis), Write-heavy for ADT (Kafka)
- [x] **Real-time vs Batch**: Real-time for ops, Batch for AI model training
- [x] **Edge vs Origin**: Origin processing (hospital network)

---

## Integration Architecture

### FHIR R4 Resource Mapping

| HMS Concept | FHIR Resource | Key Elements |
|-------------|---------------|--------------|
| Patient Identity | Patient | identifier (MRN, SSN), name, birthDate, address |
| Hospital Visit | Encounter | status, class, period, location, participant |
| Bed | Location | identifier, type, physicalType, partOf |
| OR Case | Procedure | code, status, subject, encounter, performer |
| Appointment | Appointment | status, serviceType, participant, start, end |
| Bill | Claim | type, patient, provider, diagnosis, procedure, total |
| Charge | ChargeItem | code, subject, context, occurrenceDateTime |

### HL7v2 Message Types Supported

| Message | Trigger | Use Case |
|---------|---------|----------|
| ADT^A01 | Admit | Patient admission |
| ADT^A02 | Transfer | Intra-hospital transfer |
| ADT^A03 | Discharge | Patient discharge |
| ADT^A04 | Register | Outpatient registration |
| ADT^A08 | Update | Patient info update |
| ORM^O01 | Order | Service/procedure order |
| ORU^R01 | Result | Lab/rad result |
| DFT^P03 | Charge | Financial charge |

### IHE Profile Implementation

| Profile | Function | HMS Role |
|---------|----------|----------|
| **PIX** (Patient Identifier Cross-reference) | Patient ID resolution | Provider (EMPI is PIX source) |
| **PDQ** (Patient Demographics Query) | Patient search | Provider |
| **PAM** (Patient Administration Management) | ADT events | Provider + Consumer |
| **XDS** (Cross-Enterprise Document Sharing) | Document exchange | Consumer |

---

## Saga Pattern: ADT Workflow

### Admission Saga Steps

```
SAGA: PatientAdmission

STEPS:
  1. EMPI Resolution
     - Action: Create/link patient identity
     - Compensation: Mark identity as pending

  2. Insurance Verification
     - Action: Verify coverage with payer
     - Compensation: None (idempotent query)

  3. Bed Assignment
     - Action: Lock and assign bed
     - Compensation: Release bed

  4. Encounter Creation
     - Action: Create encounter in ADT
     - Compensation: Cancel encounter

  5. Billing Account Setup
     - Action: Initialize billing account
     - Compensation: Close billing account

  6. Notification
     - Action: Publish ADT^A01 to Kafka
     - Compensation: Publish ADT^A11 (Cancel Admit)

STATE MACHINE:
  STARTED → EMPI_COMPLETE → INSURANCE_VERIFIED → BED_ASSIGNED
  → ENCOUNTER_CREATED → BILLING_SETUP → COMPLETED

FAILURE HANDLING:
  - If step N fails, execute compensations for steps N-1 to 1 in reverse
  - Log all compensation actions for audit
  - Notify operations team for manual intervention if compensation fails
```

### Saga State Storage

```sql
CREATE TABLE saga_instance (
    saga_id UUID PRIMARY KEY,
    saga_type VARCHAR(50) NOT NULL,  -- 'ADMISSION', 'DISCHARGE', 'TRANSFER'
    patient_empi UUID NOT NULL,
    current_step VARCHAR(50),
    status VARCHAR(20) DEFAULT 'RUNNING',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE saga_step_log (
    log_id UUID PRIMARY KEY,
    saga_id UUID REFERENCES saga_instance(saga_id),
    step_name VARCHAR(50),
    action_type VARCHAR(20),  -- 'EXECUTE', 'COMPENSATE'
    status VARCHAR(20),       -- 'SUCCESS', 'FAILED'
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|------|---------------|-----|--------------|
| Bed availability | Redis | Real-time (no TTL) | Event-driven update |
| Patient demographics | Redis | 5 minutes | On EMPI update |
| OR schedule (daily) | Redis | 1 hour | On schedule change |
| Insurance eligibility | Redis | 24 hours | Daily refresh |
| AI predictions | Redis | 15 minutes | Time-based expiry |
| Reference data (units, rooms) | Redis | 24 hours | Admin update |

---

## Multi-Tenant Considerations

### Tenant Isolation Model

```
Option: Database-per-Hospital (Recommended for Healthcare)

Rationale:
- Maximum data isolation (HIPAA compliance)
- Per-hospital backup/restore
- Per-hospital audit trails
- Regulatory requirement in some jurisdictions

Implementation:
- Separate PostgreSQL database per hospital
- Shared Redis cluster with key prefixing (hospital_id:bed:*)
- Shared Kafka cluster with topic prefixing (hospital_id.adt.events)
- Shared AI models (no PHI in model weights)
```

### Cross-Hospital EMPI Federation

```mermaid
flowchart LR
    subgraph Hospital1["Hospital A"]
        EMPI1[Local EMPI]
        DB1[(Patient DB)]
    end

    subgraph Hospital2["Hospital B"]
        EMPI2[Local EMPI]
        DB2[(Patient DB)]
    end

    subgraph Central["Regional HIE"]
        MPI[Master Patient Index]
        XDS[Document Registry]
    end

    EMPI1 <-->|PIX/PDQ| MPI
    EMPI2 <-->|PIX/PDQ| MPI
    EMPI1 <-->|XDS.b| XDS
    EMPI2 <-->|XDS.b| XDS
```

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Region1["Primary Region (us-east-1)"]
        subgraph AZ1["Availability Zone 1"]
            API1[API Services]
            DB1[(PostgreSQL Primary)]
            Redis1[Redis Primary]
        end
        subgraph AZ2["Availability Zone 2"]
            API2[API Services]
            DB2[(PostgreSQL Replica)]
            Redis2[Redis Replica]
        end
        Kafka1[Kafka Cluster]
    end

    subgraph Region2["DR Region (us-west-2)"]
        subgraph AZ3["Availability Zone 3"]
            API3[API Services - Standby]
            DB3[(PostgreSQL DR Replica)]
            Redis3[Redis Standby]
        end
        Kafka2[Kafka Mirror]
    end

    LB[Global Load Balancer]
    LB --> API1
    LB --> API2
    LB -.->|Failover| API3

    DB1 -->|Sync| DB2
    DB1 -->|Async| DB3
    Redis1 -->|Sync| Redis2
    Kafka1 -->|MirrorMaker| Kafka2
```
