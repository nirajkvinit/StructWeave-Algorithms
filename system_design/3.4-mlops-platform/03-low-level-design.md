# Low-Level Design

[Back to Index](./00-index.md)

---

## Data Model

### Entity Relationship Diagram

```mermaid
erDiagram
    EXPERIMENT ||--o{ RUN : contains
    RUN ||--o{ METRIC : logs
    RUN ||--o{ PARAM : has
    RUN ||--o{ TAG : tagged_with
    RUN ||--o{ ARTIFACT : produces
    RUN ||--o| MODEL_VERSION : registers

    MODEL ||--o{ MODEL_VERSION : has
    MODEL ||--o{ MODEL_ALIAS : has
    MODEL_VERSION ||--o{ VERSION_TAG : tagged_with

    PIPELINE ||--o{ PIPELINE_RUN : executes
    PIPELINE_RUN ||--o{ TASK_INSTANCE : contains
    TASK_INSTANCE ||--o| RUN : tracks

    USER ||--o{ EXPERIMENT : owns
    USER ||--o{ MODEL : owns
    TEAM ||--o{ USER : contains

    EXPERIMENT {
        string experiment_id PK
        string name UK
        string artifact_location
        string lifecycle_stage
        string owner_id FK
        timestamp created_at
        timestamp updated_at
        jsonb tags
    }

    RUN {
        string run_id PK
        string experiment_id FK
        string user_id FK
        string run_name
        string source_type
        string source_name
        string source_version
        enum status
        bigint start_time
        bigint end_time
        string artifact_uri
        jsonb tags
    }

    METRIC {
        string run_id PK_FK
        string key PK
        float value
        bigint step PK
        bigint timestamp PK
        boolean is_nan
    }

    PARAM {
        string run_id PK_FK
        string key PK
        string value
    }

    ARTIFACT {
        string artifact_id PK
        string run_id FK
        string path
        string artifact_uri
        bigint file_size
        string checksum
        timestamp created_at
    }

    MODEL {
        string model_id PK
        string name UK
        string description
        string owner_id FK
        timestamp created_at
        timestamp updated_at
        jsonb tags
    }

    MODEL_VERSION {
        string version_id PK
        string model_id FK
        string version UK
        string run_id FK
        string artifact_uri
        bigint artifact_size
        jsonb signature
        jsonb input_example
        enum stage
        string description
        timestamp created_at
    }

    MODEL_ALIAS {
        string model_id PK_FK
        string alias_name PK
        string version_id FK
        timestamp created_at
        timestamp updated_at
    }

    PIPELINE {
        string pipeline_id PK
        string name UK
        string description
        jsonb dag_definition
        string owner_id FK
        timestamp created_at
    }

    PIPELINE_RUN {
        string pipeline_run_id PK
        string pipeline_id FK
        jsonb parameters
        enum status
        timestamp start_time
        timestamp end_time
    }

    TASK_INSTANCE {
        string task_instance_id PK
        string pipeline_run_id FK
        string task_id
        string run_id FK
        enum status
        int retry_count
        timestamp start_time
        timestamp end_time
        text error_message
    }
```

---

## Database Schema

### Metadata Database (PostgreSQL)

```sql
-- Experiments table
CREATE TABLE experiment (
    experiment_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    artifact_location VARCHAR(1024),
    lifecycle_stage VARCHAR(32) DEFAULT 'active',
    owner_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags JSONB DEFAULT '{}',

    CONSTRAINT uk_experiment_name UNIQUE (name)
);

CREATE INDEX idx_experiment_owner ON experiment(owner_id);
CREATE INDEX idx_experiment_lifecycle ON experiment(lifecycle_stage);
CREATE INDEX idx_experiment_tags ON experiment USING GIN(tags);

-- Runs table
CREATE TABLE run (
    run_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    experiment_id VARCHAR(64) NOT NULL REFERENCES experiment(experiment_id),
    user_id VARCHAR(128),
    run_name VARCHAR(255),
    source_type VARCHAR(64),
    source_name VARCHAR(512),
    source_version VARCHAR(128),
    status VARCHAR(32) DEFAULT 'RUNNING',
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    artifact_uri VARCHAR(1024),
    lifecycle_stage VARCHAR(32) DEFAULT 'active',
    tags JSONB DEFAULT '{}',

    CONSTRAINT chk_run_status CHECK (status IN ('RUNNING', 'SCHEDULED', 'FINISHED', 'FAILED', 'KILLED'))
);

CREATE INDEX idx_run_experiment ON run(experiment_id);
CREATE INDEX idx_run_status ON run(status);
CREATE INDEX idx_run_user ON run(user_id);
CREATE INDEX idx_run_start_time ON run(start_time DESC);
CREATE INDEX idx_run_tags ON run USING GIN(tags);

-- Parameters table
CREATE TABLE param (
    run_id VARCHAR(64) NOT NULL REFERENCES run(run_id) ON DELETE CASCADE,
    key VARCHAR(256) NOT NULL,
    value TEXT,

    PRIMARY KEY (run_id, key)
);

CREATE INDEX idx_param_key ON param(key);

-- Artifacts table
CREATE TABLE artifact (
    artifact_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    run_id VARCHAR(64) NOT NULL REFERENCES run(run_id) ON DELETE CASCADE,
    path VARCHAR(512) NOT NULL,
    artifact_uri VARCHAR(1024) NOT NULL,
    file_size BIGINT,
    checksum VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uk_artifact_run_path UNIQUE (run_id, path)
);

CREATE INDEX idx_artifact_run ON artifact(run_id);

-- Model registry tables
CREATE TABLE registered_model (
    model_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags JSONB DEFAULT '{}',

    CONSTRAINT uk_model_name UNIQUE (name)
);

CREATE INDEX idx_model_owner ON registered_model(owner_id);
CREATE INDEX idx_model_tags ON registered_model USING GIN(tags);

-- Model versions table
CREATE TABLE model_version (
    version_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    model_id VARCHAR(64) NOT NULL REFERENCES registered_model(model_id),
    version VARCHAR(32) NOT NULL,
    run_id VARCHAR(64) REFERENCES run(run_id),
    artifact_uri VARCHAR(1024) NOT NULL,
    artifact_size BIGINT,
    signature JSONB,
    input_example JSONB,
    stage VARCHAR(32) DEFAULT 'None',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uk_model_version UNIQUE (model_id, version),
    CONSTRAINT chk_stage CHECK (stage IN ('None', 'Staging', 'Production', 'Archived'))
);

CREATE INDEX idx_version_model ON model_version(model_id);
CREATE INDEX idx_version_stage ON model_version(model_id, stage);
CREATE INDEX idx_version_run ON model_version(run_id);

-- Model aliases table
CREATE TABLE model_alias (
    model_id VARCHAR(64) NOT NULL REFERENCES registered_model(model_id),
    alias_name VARCHAR(64) NOT NULL,
    version_id VARCHAR(64) NOT NULL REFERENCES model_version(version_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (model_id, alias_name)
);

-- Pipeline tables
CREATE TABLE pipeline (
    pipeline_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    dag_definition JSONB NOT NULL,
    owner_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uk_pipeline_name UNIQUE (name)
);

CREATE TABLE pipeline_run (
    pipeline_run_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pipeline_id VARCHAR(64) NOT NULL REFERENCES pipeline(pipeline_id),
    parameters JSONB DEFAULT '{}',
    status VARCHAR(32) DEFAULT 'PENDING',
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_pipeline_status CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'))
);

CREATE INDEX idx_pipeline_run_pipeline ON pipeline_run(pipeline_id);
CREATE INDEX idx_pipeline_run_status ON pipeline_run(status);

CREATE TABLE task_instance (
    task_instance_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pipeline_run_id VARCHAR(64) NOT NULL REFERENCES pipeline_run(pipeline_run_id),
    task_id VARCHAR(128) NOT NULL,
    run_id VARCHAR(64) REFERENCES run(run_id),
    status VARCHAR(32) DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    CONSTRAINT uk_task_instance UNIQUE (pipeline_run_id, task_id)
);

CREATE INDEX idx_task_pipeline_run ON task_instance(pipeline_run_id);
CREATE INDEX idx_task_status ON task_instance(status);
```

### Metric Storage (ClickHouse)

```sql
-- Metrics table optimized for time-series queries
CREATE TABLE metric (
    run_id String,
    key LowCardinality(String),
    value Float64,
    step UInt64,
    timestamp DateTime64(3),
    is_nan UInt8 DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (run_id, key, step, timestamp)
SETTINGS index_granularity = 8192;

-- Materialized view for latest metrics per run
CREATE MATERIALIZED VIEW metric_latest
ENGINE = ReplacingMergeTree(timestamp)
ORDER BY (run_id, key)
AS SELECT
    run_id,
    key,
    argMax(value, step) as last_value,
    max(step) as last_step,
    max(timestamp) as timestamp
FROM metric
GROUP BY run_id, key;

-- Materialized view for metric aggregations
CREATE MATERIALIZED VIEW metric_summary
ENGINE = AggregatingMergeTree()
ORDER BY (run_id, key)
AS SELECT
    run_id,
    key,
    minState(value) as min_value,
    maxState(value) as max_value,
    avgState(value) as avg_value,
    countState() as step_count
FROM metric
GROUP BY run_id, key;
```

---

## API Design

### REST API Specification

#### Experiment Tracking API

```yaml
openapi: 3.0.0
info:
  title: MLOps Experiment Tracking API
  version: 2.0.0

paths:
  /api/2.0/mlflow/experiments/create:
    post:
      summary: Create experiment
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name:
                  type: string
                  maxLength: 255
                artifact_location:
                  type: string
                tags:
                  type: array
                  items:
                    $ref: '#/components/schemas/Tag'
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  experiment_id:
                    type: string

  /api/2.0/mlflow/runs/create:
    post:
      summary: Create run
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [experiment_id]
              properties:
                experiment_id:
                  type: string
                run_name:
                  type: string
                start_time:
                  type: integer
                  format: int64
                tags:
                  type: array
                  items:
                    $ref: '#/components/schemas/Tag'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Run'

  /api/2.0/mlflow/runs/log-batch:
    post:
      summary: Log batch of metrics, params, tags
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [run_id]
              properties:
                run_id:
                  type: string
                metrics:
                  type: array
                  items:
                    $ref: '#/components/schemas/Metric'
                params:
                  type: array
                  items:
                    $ref: '#/components/schemas/Param'
                tags:
                  type: array
                  items:
                    $ref: '#/components/schemas/Tag'
      responses:
        '200':
          description: Success

  /api/2.0/mlflow/runs/search:
    post:
      summary: Search runs
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                experiment_ids:
                  type: array
                  items:
                    type: string
                filter:
                  type: string
                  description: SQL-like filter expression
                order_by:
                  type: array
                  items:
                    type: string
                max_results:
                  type: integer
                  default: 1000
                page_token:
                  type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                type: object
                properties:
                  runs:
                    type: array
                    items:
                      $ref: '#/components/schemas/Run'
                  next_page_token:
                    type: string

components:
  schemas:
    Run:
      type: object
      properties:
        run_id:
          type: string
        experiment_id:
          type: string
        status:
          type: string
          enum: [RUNNING, SCHEDULED, FINISHED, FAILED, KILLED]
        start_time:
          type: integer
          format: int64
        end_time:
          type: integer
          format: int64
        artifact_uri:
          type: string

    Metric:
      type: object
      required: [key, value, timestamp]
      properties:
        key:
          type: string
        value:
          type: number
        step:
          type: integer
          default: 0
        timestamp:
          type: integer
          format: int64

    Param:
      type: object
      required: [key, value]
      properties:
        key:
          type: string
        value:
          type: string

    Tag:
      type: object
      required: [key, value]
      properties:
        key:
          type: string
        value:
          type: string
```

#### Model Registry API

```yaml
paths:
  /api/2.0/mlflow/registered-models/create:
    post:
      summary: Create registered model
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name:
                  type: string
                description:
                  type: string
                tags:
                  type: array
                  items:
                    $ref: '#/components/schemas/Tag'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RegisteredModel'

  /api/2.0/mlflow/model-versions/create:
    post:
      summary: Create model version
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name, source]
              properties:
                name:
                  type: string
                source:
                  type: string
                  description: URI to model artifact
                run_id:
                  type: string
                description:
                  type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ModelVersion'

  /api/2.0/mlflow/model-versions/transition-stage:
    post:
      summary: Transition model version stage
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name, version, stage]
              properties:
                name:
                  type: string
                version:
                  type: string
                stage:
                  type: string
                  enum: [None, Staging, Production, Archived]
                archive_existing_versions:
                  type: boolean
                  default: false
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ModelVersion'

  /api/2.0/mlflow/registered-models/alias:
    post:
      summary: Set model alias
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name, alias, version]
              properties:
                name:
                  type: string
                alias:
                  type: string
                  pattern: '^@[a-z][a-z0-9_-]*$'
                version:
                  type: string
      responses:
        '200':
          description: Alias set successfully
    delete:
      summary: Delete model alias
      parameters:
        - name: name
          in: query
          required: true
          schema:
            type: string
        - name: alias
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Alias deleted

  /api/2.0/mlflow/registered-models/get-by-alias:
    get:
      summary: Get model version by alias
      parameters:
        - name: name
          in: query
          required: true
          schema:
            type: string
        - name: alias
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ModelVersion'

components:
  schemas:
    RegisteredModel:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        creation_timestamp:
          type: integer
          format: int64
        last_updated_timestamp:
          type: integer
          format: int64
        latest_versions:
          type: array
          items:
            $ref: '#/components/schemas/ModelVersion'
        aliases:
          type: array
          items:
            $ref: '#/components/schemas/ModelAlias'

    ModelVersion:
      type: object
      properties:
        name:
          type: string
        version:
          type: string
        creation_timestamp:
          type: integer
          format: int64
        current_stage:
          type: string
        source:
          type: string
        run_id:
          type: string
        status:
          type: string
        aliases:
          type: array
          items:
            type: string

    ModelAlias:
      type: object
      properties:
        alias:
          type: string
        version:
          type: string
```

#### Pipeline Orchestration API

```yaml
paths:
  /api/v1/pipelines:
    post:
      summary: Create pipeline
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name, dag]
              properties:
                name:
                  type: string
                description:
                  type: string
                dag:
                  $ref: '#/components/schemas/DAGDefinition'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pipeline'

  /api/v1/pipelines/{pipeline_id}/runs:
    post:
      summary: Trigger pipeline run
      parameters:
        - name: pipeline_id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                parameters:
                  type: object
                  additionalProperties: true
      responses:
        '202':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PipelineRun'

  /api/v1/pipeline-runs/{run_id}:
    get:
      summary: Get pipeline run status
      parameters:
        - name: run_id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PipelineRun'

components:
  schemas:
    DAGDefinition:
      type: object
      required: [tasks]
      properties:
        tasks:
          type: array
          items:
            $ref: '#/components/schemas/TaskDefinition'

    TaskDefinition:
      type: object
      required: [id, operator]
      properties:
        id:
          type: string
        operator:
          type: string
        depends_on:
          type: array
          items:
            type: string
        params:
          type: object
          additionalProperties: true
        retries:
          type: integer
          default: 3
        timeout_seconds:
          type: integer

    Pipeline:
      type: object
      properties:
        pipeline_id:
          type: string
        name:
          type: string
        created_at:
          type: string
          format: date-time

    PipelineRun:
      type: object
      properties:
        run_id:
          type: string
        pipeline_id:
          type: string
        status:
          type: string
          enum: [PENDING, RUNNING, SUCCESS, FAILED, CANCELLED]
        tasks:
          type: array
          items:
            $ref: '#/components/schemas/TaskInstance'

    TaskInstance:
      type: object
      properties:
        task_id:
          type: string
        status:
          type: string
        start_time:
          type: string
          format: date-time
        end_time:
          type: string
          format: date-time
        retry_count:
          type: integer
```

---

## Core Algorithms

### DAG Topological Sort and Scheduling

```
ALGORITHM TopologicalDAGScheduler

DATA STRUCTURES:
    Task = {
        id: string,
        depends_on: Set<string>,
        priority: int,
        resources: ResourceRequirements
    }

    TaskQueue = PriorityQueue<Task> ordered by priority DESC

STATE:
    tasks: Map<TaskID, Task>
    in_degree: Map<TaskID, int>        // Number of incomplete dependencies
    ready_queue: TaskQueue
    running: Set<TaskID>
    completed: Set<TaskID>
    failed: Set<TaskID>

FUNCTION initialize(dag: DAG):
    FOR task IN dag.tasks:
        tasks[task.id] = task
        in_degree[task.id] = |task.depends_on|

        IF in_degree[task.id] == 0:
            ready_queue.push(task)

FUNCTION schedule():
    WHILE NOT all_tasks_complete() AND NOT pipeline_failed():
        // Dispatch ready tasks
        WHILE ready_queue.not_empty() AND resources_available():
            task = ready_queue.pop()
            IF can_allocate_resources(task.resources):
                allocate_resources(task)
                dispatch_task(task)
                running.add(task.id)

        // Wait for task completion
        event = wait_for_event()  // Blocking call

        IF event.type == TASK_COMPLETE:
            handle_task_complete(event.task_id)
        ELSE IF event.type == TASK_FAILED:
            handle_task_failed(event.task_id, event.error)

FUNCTION handle_task_complete(task_id: string):
    running.remove(task_id)
    completed.add(task_id)
    release_resources(tasks[task_id])

    // Update dependents
    FOR dependent_id IN get_dependents(task_id):
        in_degree[dependent_id] -= 1
        IF in_degree[dependent_id] == 0:
            ready_queue.push(tasks[dependent_id])

FUNCTION handle_task_failed(task_id: string, error: Error):
    task = tasks[task_id]

    IF task.retry_count < task.max_retries:
        task.retry_count += 1
        ready_queue.push(task)  // Re-queue for retry
    ELSE:
        running.remove(task_id)
        failed.add(task_id)
        release_resources(task)

        // Cancel downstream tasks
        FOR downstream IN get_all_dependents(task_id):
            mark_cancelled(downstream)

FUNCTION get_dependents(task_id: string) -> Set<string>:
    result = {}
    FOR id, task IN tasks:
        IF task_id IN task.depends_on:
            result.add(id)
    RETURN result
```

### Model Alias Atomic Update

```
ALGORITHM AtomicAliasManager

FUNCTION set_alias(
    model_name: string,
    alias: string,
    new_version: string
) -> Result<void, Error>:

    // Acquire distributed lock
    lock_key = f"alias_lock:{model_name}:{alias}"

    WITH distributed_lock(lock_key, timeout=30s):
        // Begin transaction
        WITH database.transaction(isolation=SERIALIZABLE):
            // Verify model exists
            model = SELECT * FROM registered_model WHERE name = model_name
            IF model IS null:
                RETURN Error("Model not found")

            // Verify version exists
            version = SELECT * FROM model_version
                      WHERE model_id = model.model_id
                      AND version = new_version
            IF version IS null:
                RETURN Error("Version not found")

            // Get current alias holder (if any)
            current_alias = SELECT * FROM model_alias
                           WHERE model_id = model.model_id
                           AND alias_name = alias

            IF current_alias IS NOT null:
                // Record previous alias for audit
                INSERT INTO alias_history (
                    model_id, alias_name, previous_version_id,
                    new_version_id, changed_at, changed_by
                ) VALUES (
                    model.model_id, alias, current_alias.version_id,
                    version.version_id, NOW(), current_user()
                )

                // Update existing alias
                UPDATE model_alias
                SET version_id = version.version_id,
                    updated_at = NOW()
                WHERE model_id = model.model_id
                AND alias_name = alias
            ELSE:
                // Create new alias
                INSERT INTO model_alias (
                    model_id, alias_name, version_id, created_at
                ) VALUES (
                    model.model_id, alias, version.version_id, NOW()
                )

            // Commit transaction

        // Publish event (outside transaction for performance)
        publish_event(AliasChanged {
            model_name: model_name,
            alias: alias,
            old_version: current_alias?.version_id,
            new_version: version.version_id
        })

    RETURN Ok()

FUNCTION resolve_alias(
    model_name: string,
    alias: string
) -> Result<ModelVersion, Error>:

    // Use read replica for better performance
    result = SELECT mv.*
             FROM model_alias ma
             JOIN model_version mv ON ma.version_id = mv.version_id
             JOIN registered_model rm ON ma.model_id = rm.model_id
             WHERE rm.name = model_name AND ma.alias_name = alias

    IF result IS null:
        RETURN Error("Alias not found")

    RETURN Ok(result)
```

### Metric Batch Writer

```
ALGORITHM MetricBatchWriter

CONSTANTS:
    BATCH_SIZE = 1000
    FLUSH_INTERVAL_MS = 100
    MAX_QUEUE_SIZE = 100000

STATE:
    buffer: Map<RunID, List<Metric>>
    total_buffered: int = 0
    last_flush_time: timestamp = now()
    write_lock: Mutex

FUNCTION log_metric(run_id: string, metric: Metric):
    WITH write_lock:
        IF run_id NOT IN buffer:
            buffer[run_id] = []

        buffer[run_id].append(metric)
        total_buffered += 1

        // Check flush conditions
        IF should_flush():
            flush_async()

FUNCTION should_flush() -> bool:
    RETURN total_buffered >= BATCH_SIZE OR
           (now() - last_flush_time) >= FLUSH_INTERVAL_MS OR
           total_buffered >= MAX_QUEUE_SIZE

FUNCTION flush_async():
    // Swap buffer for new one
    to_flush = buffer
    buffer = {}
    count = total_buffered
    total_buffered = 0
    last_flush_time = now()

    // Async write to metric store
    spawn_async(write_batch, to_flush, count)

FUNCTION write_batch(data: Map<RunID, List<Metric>>, count: int):
    TRY:
        // Prepare batch insert
        rows = []
        FOR run_id, metrics IN data:
            FOR m IN metrics:
                rows.append((run_id, m.key, m.value, m.step, m.timestamp))

        // Bulk insert to ClickHouse
        clickhouse.execute(
            "INSERT INTO metric (run_id, key, value, step, timestamp) VALUES",
            rows
        )

        metrics_written.inc(count)
    CATCH error:
        // Retry with exponential backoff
        retry_with_backoff(write_batch, data, count, max_retries=3)
        metrics_write_failures.inc(count)
```

### Experiment Search with Filter Parsing

```
ALGORITHM ExperimentSearchEngine

GRAMMAR FilterExpression:
    filter := comparison (AND comparison)*
    comparison := attribute operator value
    attribute := 'metrics.' key | 'params.' key | 'tags.' key | 'status' | 'start_time'
    operator := '=' | '!=' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'ILIKE'
    value := string | number

FUNCTION search_runs(
    experiment_ids: List<string>,
    filter: string,
    order_by: List<string>,
    max_results: int,
    page_token: string
) -> SearchResult:

    // Parse filter expression
    ast = parse_filter(filter)

    // Build SQL query
    query = """
        SELECT r.*,
               (SELECT jsonb_object_agg(key, value) FROM param WHERE run_id = r.run_id) as params,
               (SELECT jsonb_object_agg(key, value) FROM run_tag WHERE run_id = r.run_id) as tags
        FROM run r
        WHERE r.experiment_id = ANY($1)
          AND r.lifecycle_stage = 'active'
    """
    params = [experiment_ids]

    // Add filter conditions
    IF ast IS NOT null:
        filter_sql, filter_params = compile_filter_ast(ast, len(params))
        query += " AND " + filter_sql
        params.extend(filter_params)

    // Add metric conditions (join with metric_latest view)
    IF has_metric_filter(ast):
        query = wrap_with_metric_join(query, ast)

    // Add ordering
    IF order_by IS NOT empty:
        order_clause = compile_order_by(order_by)
        query += " ORDER BY " + order_clause
    ELSE:
        query += " ORDER BY r.start_time DESC"

    // Add pagination
    query += " LIMIT $" + str(len(params) + 1)
    params.append(max_results + 1)  // Fetch one extra for next_page_token

    IF page_token IS NOT null:
        offset = decode_page_token(page_token)
        query += " OFFSET $" + str(len(params) + 1)
        params.append(offset)

    // Execute query
    results = database.execute(query, params)

    // Determine if more results exist
    has_more = len(results) > max_results
    IF has_more:
        results = results[:max_results]
        next_token = encode_page_token(offset + max_results)
    ELSE:
        next_token = null

    RETURN SearchResult(runs=results, next_page_token=next_token)

FUNCTION compile_filter_ast(ast: FilterAST, param_offset: int) -> (string, List):
    conditions = []
    params = []

    FOR comparison IN ast.comparisons:
        IF comparison.attribute.startswith("params."):
            key = comparison.attribute[7:]
            sql = f"(r.run_id IN (SELECT run_id FROM param WHERE key = ${param_offset + 1} AND value {comparison.op} ${param_offset + 2}))"
            params.extend([key, comparison.value])
            param_offset += 2

        ELSE IF comparison.attribute.startswith("metrics."):
            // Handled separately via join
            CONTINUE

        ELSE IF comparison.attribute == "status":
            sql = f"r.status {comparison.op} ${param_offset + 1}"
            params.append(comparison.value)
            param_offset += 1

        ELSE IF comparison.attribute == "start_time":
            sql = f"r.start_time {comparison.op} ${param_offset + 1}"
            params.append(comparison.value)
            param_offset += 1

        conditions.append(sql)

    RETURN (" AND ".join(conditions), params)
```

### Checkpoint Manager

```
ALGORITHM CheckpointManager

CONSTANTS:
    CHECKPOINT_INTERVAL = 600  // 10 minutes
    MAX_CHECKPOINTS_PER_TASK = 3
    CHECKPOINT_BUCKET = "mlops-checkpoints"

STATE:
    active_checkpoints: Map<TaskID, List<Checkpoint>>

FUNCTION should_checkpoint(task: Task, current_step: int) -> bool:
    last_checkpoint = get_latest_checkpoint(task.id)

    IF last_checkpoint IS null:
        RETURN current_step > 0

    time_since_last = now() - last_checkpoint.timestamp
    RETURN time_since_last >= CHECKPOINT_INTERVAL

FUNCTION save_checkpoint(
    task: Task,
    state: bytes,
    step: int,
    metadata: dict
) -> Checkpoint:

    checkpoint_id = generate_uuid()
    checkpoint_path = f"{CHECKPOINT_BUCKET}/{task.pipeline_run_id}/{task.id}/{checkpoint_id}"

    // Upload state to object storage
    object_store.put(checkpoint_path, state)

    // Record checkpoint metadata
    checkpoint = Checkpoint(
        id: checkpoint_id,
        task_id: task.id,
        path: checkpoint_path,
        step: step,
        size: len(state),
        metadata: metadata,
        timestamp: now()
    )

    database.insert("checkpoint", checkpoint)

    // Cleanup old checkpoints
    cleanup_old_checkpoints(task.id)

    RETURN checkpoint

FUNCTION get_latest_checkpoint(task_id: string) -> Checkpoint:
    RETURN database.query("""
        SELECT * FROM checkpoint
        WHERE task_id = $1
        ORDER BY step DESC
        LIMIT 1
    """, [task_id])

FUNCTION restore_from_checkpoint(task: Task) -> (bytes, int):
    checkpoint = get_latest_checkpoint(task.id)

    IF checkpoint IS null:
        RETURN (null, 0)

    // Download state from object storage
    state = object_store.get(checkpoint.path)

    RETURN (state, checkpoint.step)

FUNCTION cleanup_old_checkpoints(task_id: string):
    checkpoints = database.query("""
        SELECT * FROM checkpoint
        WHERE task_id = $1
        ORDER BY step DESC
    """, [task_id])

    IF len(checkpoints) > MAX_CHECKPOINTS_PER_TASK:
        to_delete = checkpoints[MAX_CHECKPOINTS_PER_TASK:]

        FOR cp IN to_delete:
            object_store.delete(cp.path)
            database.delete("checkpoint", cp.id)
```

---

## SDK Interface Examples

### Python SDK Usage

```python
# Experiment Tracking
import mlflow

# Set tracking server
mlflow.set_tracking_uri("https://mlops.company.com")

# Create/set experiment
mlflow.set_experiment("fraud-detection-v2")

# Start run
with mlflow.start_run(run_name="xgboost-baseline"):
    # Log parameters
    mlflow.log_params({
        "learning_rate": 0.1,
        "max_depth": 6,
        "n_estimators": 100
    })

    # Training loop
    for epoch in range(100):
        loss, accuracy = train_epoch(model, data)

        # Log metrics with step
        mlflow.log_metrics({
            "loss": loss,
            "accuracy": accuracy
        }, step=epoch)

    # Log model artifact
    mlflow.sklearn.log_model(
        model,
        "model",
        signature=infer_signature(X_train, y_pred),
        input_example=X_train[:5]
    )

    # Log additional artifacts
    mlflow.log_artifact("feature_importance.png")

# Model Registry
from mlflow import MlflowClient

client = MlflowClient()

# Register model
model_uri = f"runs:/{run_id}/model"
mv = client.create_model_version(
    name="fraud-detector",
    source=model_uri,
    run_id=run_id
)

# Set alias
client.set_registered_model_alias(
    name="fraud-detector",
    alias="candidate",
    version=mv.version
)

# Transition stage
client.transition_model_version_stage(
    name="fraud-detector",
    version=mv.version,
    stage="Production"
)

# Load model by alias
model = mlflow.pyfunc.load_model("models:/fraud-detector@champion")
```

### Pipeline Definition

```python
from mlops_sdk import pipeline, task

@task(
    retries=3,
    timeout_seconds=3600,
    resources={"gpu": 1, "memory": "16Gi"}
)
def prepare_data(date: str) -> str:
    """Prepare training data from feature store."""
    data = feature_store.get_training_data(date)
    path = f"s3://data/{date}/training.parquet"
    data.to_parquet(path)
    return path

@task(
    retries=2,
    timeout_seconds=7200,
    resources={"gpu": 4, "memory": "64Gi"}
)
def train_model(data_path: str, learning_rate: float) -> str:
    """Train model and return artifact path."""
    with mlflow.start_run():
        mlflow.log_param("learning_rate", learning_rate)
        model = train(data_path, lr=learning_rate)
        mlflow.sklearn.log_model(model, "model")
        return mlflow.active_run().info.run_id

@task
def evaluate_model(run_id: str) -> dict:
    """Evaluate model and return metrics."""
    model = mlflow.pyfunc.load_model(f"runs:/{run_id}/model")
    metrics = evaluate(model, test_data)
    return metrics

@task
def register_model(run_id: str, metrics: dict):
    """Register model if metrics pass threshold."""
    if metrics["accuracy"] > 0.9:
        client = MlflowClient()
        client.create_model_version(
            name="fraud-detector",
            source=f"runs:/{run_id}/model",
            run_id=run_id
        )

@pipeline(
    name="fraud-detection-training",
    schedule="0 2 * * *"  # Daily at 2 AM
)
def training_pipeline(date: str, learning_rate: float = 0.1):
    data_path = prepare_data(date)
    run_id = train_model(data_path, learning_rate)
    metrics = evaluate_model(run_id)
    register_model(run_id, metrics)

# Submit pipeline run
training_pipeline.run(
    parameters={
        "date": "2026-01-24",
        "learning_rate": 0.05
    }
)
```
