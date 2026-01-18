# Python System Design and Project Architecture

> Practical project organization for Python applications — from scripts to production services

This guide covers Python project structure, web framework architecture, background task processing, and system design patterns. We focus on Python-idiomatic approaches that embrace simplicity while providing patterns for when complexity is warranted.

**Reading time**: 90-100 minutes

---

## Table of Contents

1. [Philosophy: Start Simple](#philosophy-start-simple)
2. [Project Layout Fundamentals](#project-layout-fundamentals)
3. [Package Organization Patterns](#package-organization-patterns)
4. [Web Framework Architecture](#web-framework-architecture)
5. [WSGI vs ASGI Deep Dive](#wsgi-vs-asgi-deep-dive)
6. [Background Task Architecture](#background-task-architecture)
7. [Database Layer Patterns](#database-layer-patterns)
8. [Configuration Management](#configuration-management)
9. [Testing Architecture](#testing-architecture)
10. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
11. [Practical Examples](#practical-examples)
12. [Interview Questions](#interview-questions)
13. [Quick Reference](#quick-reference)
14. [Resources](#resources)

---

## Philosophy: Start Simple

> "Simple is better than complex. Complex is better than complicated."
> — The Zen of Python

Python's design philosophy centers on readability, explicitness, and practicality. Before reaching for complex architectural patterns, consider whether you actually need them.

### The Cost of Abstraction

Every layer of abstraction has costs:
- More files to navigate
- More indirection to follow
- More boilerplate to maintain
- Steeper learning curve for new team members

```python
# OVER-ENGINEERED: Hello world with Clean Architecture
myapp/
├── src/
│   └── myapp/
│       ├── domain/
│       │   └── greeting/
│       │       ├── entities.py
│       │       └── interfaces.py
│       ├── application/
│       │   └── greeting/
│       │       └── service.py
│       └── infrastructure/
│           └── console/
│               └── adapter.py
├── tests/
└── pyproject.toml

# APPROPRIATE: Hello world in Python
myapp/
├── main.py
└── pyproject.toml
```

### YAGNI: You Aren't Gonna Need It

Start with the simplest structure that works. Add complexity only when:
- You have concrete evidence it's needed
- The current structure is causing real problems
- Multiple people are working on the same code

### When to Add Complexity

| Project Type | Lines of Code | Team Size | Suggested Structure |
|--------------|---------------|-----------|---------------------|
| Script/Tool | <500 | 1 | Single file |
| Small CLI | 500-2,000 | 1-2 | Flat package |
| Web API | 2,000-10,000 | 2-5 | Feature-based packages |
| Microservice | 5,000-20,000 | 3-8 | Layered with `src/` |
| Enterprise Service | 20,000+ | 5+ | Clean/Hexagonal Architecture |

### Python Philosophy Relevant to Structure

- **"Explicit is better than implicit."** — Make dependencies visible
- **"Flat is better than nested."** — Avoid deep directory hierarchies
- **"Readability counts."** — Choose clear names over clever abstractions
- **"There should be one obvious way to do it."** — Consistency over flexibility

---

## Project Layout Fundamentals

### Minimal Layout

The simplest Python project:

```
myproject/
├── myproject.py          # Single module
└── pyproject.toml        # Project metadata
```

### Standard Package Layout

For most projects:

```
myproject/
├── myproject/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py
│   └── utils.py
├── tests/
│   ├── __init__.py
│   └── test_main.py
├── pyproject.toml
└── README.md
```

### src/ Layout (Recommended for Libraries)

Prevents accidental imports from the source directory:

```
myproject/
├── src/
│   └── myproject/
│       ├── __init__.py
│       ├── main.py
│       └── models.py
├── tests/
│   └── test_main.py
├── pyproject.toml
└── README.md
```

**Why src/?** When you `pip install -e .`, importing `myproject` gets the installed version, not the local source. This catches packaging errors early.

### Application Layout

For web applications and services:

```
myapp/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── main.py           # Entry point
│       ├── config.py         # Settings
│       ├── models/
│       │   ├── __init__.py
│       │   └── user.py
│       ├── api/
│       │   ├── __init__.py
│       │   ├── routes.py
│       │   └── dependencies.py
│       └── services/
│           ├── __init__.py
│           └── user_service.py
├── tests/
├── migrations/
├── pyproject.toml
├── Dockerfile
└── docker-compose.yml
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/` | Source code (prevents import confusion) |
| `tests/` | Test files (mirror src structure) |
| `migrations/` | Database migrations (Alembic, Django) |
| `scripts/` | Utility scripts |
| `docs/` | Documentation |
| `deploy/` | Deployment configs (Kubernetes, Terraform) |

---

## Package Organization Patterns

### Pattern 1: Flat Structure

Best for: Small projects, scripts, simple APIs

```
myapi/
├── __init__.py
├── main.py
├── models.py
├── routes.py
├── services.py
├── database.py
└── config.py
```

### Pattern 2: Feature-Based (Vertical Slices)

Best for: Medium projects, clear domain boundaries

```
myapi/
├── __init__.py
├── main.py
├── config.py
├── users/
│   ├── __init__.py
│   ├── models.py
│   ├── routes.py
│   ├── services.py
│   └── schemas.py
├── orders/
│   ├── __init__.py
│   ├── models.py
│   ├── routes.py
│   ├── services.py
│   └── schemas.py
└── shared/
    ├── __init__.py
    ├── database.py
    └── exceptions.py
```

### Pattern 3: Layered Architecture

Best for: Large projects, multiple interfaces to same domain

```
myapi/
├── __init__.py
├── main.py
├── api/                    # Presentation layer
│   ├── __init__.py
│   ├── routes/
│   ├── schemas/
│   └── dependencies.py
├── services/               # Business logic
│   ├── __init__.py
│   ├── user_service.py
│   └── order_service.py
├── repositories/           # Data access
│   ├── __init__.py
│   ├── user_repo.py
│   └── order_repo.py
├── models/                 # Domain models
│   ├── __init__.py
│   ├── user.py
│   └── order.py
└── core/                   # Shared infrastructure
    ├── __init__.py
    ├── config.py
    ├── database.py
    └── exceptions.py
```

### Project Structure Evolution

```mermaid
graph TD
    A[Single File<br/>script.py] --> B[Flat Package<br/>myapp/]
    B --> C[Feature-Based<br/>users/, orders/]
    C --> D[Layered<br/>api/, services/, repos/]
    D --> E[Clean Architecture<br/>domain/, application/, infra/]

    style A fill:#e8f5e9
    style B fill:#e3f2fd
    style C fill:#fff3e0
    style D fill:#fce4ec
    style E fill:#f3e5f5
```

### Import Best Practices

```python
# Absolute imports (preferred)
from myapp.users.models import User
from myapp.shared.database import get_session

# Relative imports (within same package)
from .models import User
from ..shared.database import get_session

# __init__.py for clean imports
# myapp/users/__init__.py
from .models import User
from .services import UserService

# Now clients can do:
from myapp.users import User, UserService
```

---

## Web Framework Architecture

### Framework Comparison

| Feature | FastAPI | Django | Flask |
|---------|---------|--------|-------|
| Type | Async-first | Batteries-included | Microframework |
| Best for | APIs, microservices | Full-stack web apps | Flexible apps |
| Learning curve | Medium | Higher | Lower |
| ORM | None (use SQLAlchemy) | Built-in (Django ORM) | None |
| Admin panel | None | Built-in | Extensions |
| Auth | Extensions | Built-in | Extensions |
| Async | Native | Django 4.1+ | Extensions |
| Performance | Excellent | Good | Good |

### FastAPI Architecture

```python
# main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager

from myapp.api.routes import router
from myapp.core.database import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await engine.connect()
    yield
    # Shutdown
    await engine.disconnect()

app = FastAPI(lifespan=lifespan)
app.include_router(router, prefix="/api/v1")
```

```python
# api/routes/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from myapp.api.dependencies import get_session
from myapp.services.user_service import UserService
from myapp.api.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    session: AsyncSession = Depends(get_session)
):
    service = UserService(session)
    return await service.create(user)
```

```python
# api/dependencies.py
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from myapp.core.database import async_session_maker

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
```

### FastAPI Dependency Injection

```mermaid
graph TD
    subgraph "Request Flow"
        REQ[Request] --> R[Router]
        R --> DEP[Dependencies]
        DEP --> DB[Database Session]
        DEP --> AUTH[Auth Token]
        DEP --> CONF[Config]
        DB --> SVC[Service]
        AUTH --> SVC
        SVC --> RESP[Response]
    end
```

### Django Architecture

```python
# myproject/settings.py
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'rest_framework',
    'myapp.users',
    'myapp.orders',
]

# Application structure
myproject/
├── manage.py
├── myproject/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── users/
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── urls.py
│   └── admin.py
└── orders/
    ├── models.py
    ├── views.py
    └── ...
```

```python
# users/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import User
from .serializers import UserSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
```

### Flask Architecture

```python
# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)

    from app.api import api as api_blueprint
    app.register_blueprint(api_blueprint, url_prefix='/api/v1')

    return app
```

```python
# app/api/users.py
from flask import Blueprint, request, jsonify
from app.models import User
from app import db

users_bp = Blueprint('users', __name__)

@users_bp.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    user = User(**data)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201
```

### When to Choose Which

| Scenario | Recommended |
|----------|-------------|
| Building a REST/GraphQL API | FastAPI |
| Full-stack web app with admin | Django |
| Rapid prototyping | Flask |
| High-performance async APIs | FastAPI |
| Existing Django ecosystem | Django |
| Maximum flexibility | Flask |
| Type safety is priority | FastAPI |
| Background job heavy | Django + Celery |

---

## WSGI vs ASGI Deep Dive

### WSGI (Web Server Gateway Interface)

Synchronous protocol - one request blocks until complete.

```mermaid
graph LR
    subgraph "WSGI Request Flow"
        C[Client] --> W[Gunicorn/uWSGI]
        W --> APP[Python App]
        APP --> DB[(Database)]
        DB --> APP
        APP --> W
        W --> C
    end
```

```python
# WSGI application
def application(environ, start_response):
    status = '200 OK'
    headers = [('Content-Type', 'text/plain')]
    start_response(status, headers)
    return [b'Hello, World!']

# With Flask
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'
```

**WSGI Servers:**
- **Gunicorn**: Simple, reliable, widely used
- **uWSGI**: Feature-rich, complex configuration
- **Waitress**: Pure Python, Windows support

```bash
# Running with Gunicorn
gunicorn --workers 4 --bind 0.0.0.0:8000 myapp:app
```

### ASGI (Asynchronous Server Gateway Interface)

Async protocol - supports WebSockets, HTTP/2, background tasks.

```mermaid
graph LR
    subgraph "ASGI Request Flow"
        C[Client] --> U[Uvicorn/Hypercorn]
        U --> APP[Async Python App]
        APP -->|async| DB[(Database)]
        APP -->|async| API[External API]
        APP -->|WebSocket| WS[WebSocket Handler]
        DB --> APP
        API --> APP
        APP --> U
        U --> C
    end
```

```python
# ASGI application
async def application(scope, receive, send):
    if scope['type'] == 'http':
        await send({
            'type': 'http.response.start',
            'status': 200,
            'headers': [[b'content-type', b'text/plain']],
        })
        await send({
            'type': 'http.response.body',
            'body': b'Hello, World!',
        })

# With FastAPI
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
async def hello():
    return {"message": "Hello, World!"}
```

**ASGI Servers:**
- **Uvicorn**: Fast, built on uvloop
- **Hypercorn**: HTTP/2 support
- **Daphne**: Django Channels

```bash
# Running with Uvicorn
uvicorn myapp:app --workers 4 --host 0.0.0.0 --port 8000
```

### Comparison

| Feature | WSGI | ASGI |
|---------|------|------|
| Concurrency model | Sync | Async |
| WebSocket support | No | Yes |
| HTTP/2 | Limited | Yes |
| Long-polling | Inefficient | Efficient |
| Complexity | Lower | Higher |
| Mature ecosystem | Yes | Growing |

### Middleware

```python
# WSGI Middleware
class TimingMiddleware:
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        import time
        start = time.time()
        response = self.app(environ, start_response)
        print(f"Request took {time.time() - start:.3f}s")
        return response

# ASGI Middleware
class TimingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        import time
        start = time.time()
        await self.app(scope, receive, send)
        print(f"Request took {time.time() - start:.3f}s")
```

### When to Use Each

| Use Case | WSGI | ASGI |
|----------|------|------|
| Traditional web apps | Yes | Overkill |
| REST APIs | Yes | Yes |
| Real-time features | No | Yes |
| WebSockets | No | Yes |
| Server-sent events | Difficult | Easy |
| High I/O concurrency | Limited | Excellent |

---

## Background Task Architecture

### Overview

```mermaid
graph TD
    subgraph "Task Queue Architecture"
        WEB[Web Server] -->|enqueue| BROKER[Message Broker<br/>Redis/RabbitMQ]
        BROKER -->|consume| W1[Worker 1]
        BROKER -->|consume| W2[Worker 2]
        BROKER -->|consume| W3[Worker 3]
        W1 --> BACKEND[(Result Backend)]
        W2 --> BACKEND
        W3 --> BACKEND
    end
```

### Celery

The most popular distributed task queue.

```python
# celery_app.py
from celery import Celery

app = Celery(
    'myapp',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1',
    include=['myapp.tasks']
)

app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
)
```

```python
# tasks.py
from celery_app import app
from myapp.services import EmailService

@app.task(bind=True, max_retries=3)
def send_email(self, user_id: int, template: str):
    try:
        service = EmailService()
        service.send(user_id, template)
    except Exception as exc:
        self.retry(exc=exc, countdown=60)

@app.task
def process_upload(file_path: str):
    # Long-running task
    pass
```

```python
# Using tasks
from myapp.tasks import send_email, process_upload

# Enqueue immediately
send_email.delay(user_id=123, template="welcome")

# Schedule for later
from datetime import timedelta
send_email.apply_async(
    args=[123, "reminder"],
    countdown=3600  # 1 hour
)

# Chain tasks
from celery import chain
workflow = chain(
    download_file.s(url),
    process_file.s(),
    upload_result.s()
)
workflow.apply_async()
```

```bash
# Running Celery
celery -A myapp.celery_app worker --loglevel=info
celery -A myapp.celery_app beat --loglevel=info  # Scheduled tasks
celery -A myapp.celery_app flower  # Monitoring
```

### RQ (Redis Queue)

Simpler alternative for Redis-only setups.

```python
# tasks.py
from redis import Redis
from rq import Queue

redis_conn = Redis()
q = Queue(connection=redis_conn)

def send_email(user_id: int, template: str):
    # Actual work here
    pass

# Enqueue
job = q.enqueue(send_email, 123, "welcome")
job = q.enqueue_in(timedelta(hours=1), send_email, 123, "reminder")

# Check status
job.get_status()  # 'queued', 'started', 'finished', 'failed'
job.result  # Return value if finished
```

```bash
# Running RQ
rq worker
rq worker high default low  # Multiple queues with priority
```

### Dramatiq

Actor-based, middleware-focused alternative.

```python
# tasks.py
import dramatiq
from dramatiq.brokers.redis import RedisBroker

redis_broker = RedisBroker(host="localhost")
dramatiq.set_broker(redis_broker)

@dramatiq.actor(max_retries=3)
def send_email(user_id: int, template: str):
    pass

# With middleware
@dramatiq.actor(
    time_limit=300000,  # 5 minutes in ms
    max_retries=3,
    min_backoff=1000,
    max_backoff=60000
)
def process_video(video_id: int):
    pass
```

### Task Queue Comparison

| Feature | Celery | RQ | Dramatiq |
|---------|--------|-----|----------|
| Broker support | Redis, RabbitMQ, SQS | Redis only | Redis, RabbitMQ |
| Complexity | High | Low | Medium |
| Task chaining | Yes | Limited | Yes |
| Scheduling | Yes (Beat) | RQ Scheduler | APScheduler |
| Monitoring | Flower | rq-dashboard | Built-in |
| Performance | Good | Good | Excellent |

### Best Practices

```python
# 1. Idempotent tasks
@app.task
def process_order(order_id: int):
    order = Order.get(order_id)
    if order.status == 'processed':
        return  # Already done
    # Process...
    order.status = 'processed'
    order.save()

# 2. Small, serializable arguments
# BAD
@app.task
def process(user: User):  # Objects don't serialize well
    pass

# GOOD
@app.task
def process(user_id: int):
    user = User.get(user_id)

# 3. Error handling
@app.task(bind=True, max_retries=3)
def risky_task(self, data):
    try:
        do_work(data)
    except TransientError as exc:
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
    except PermanentError:
        # Don't retry, log and alert
        logger.error("Permanent failure", exc_info=True)
```

---

## Database Layer Patterns

### SQLAlchemy Patterns

#### Basic Setup

```python
# database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql://user:pass@localhost/db"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Async SQLAlchemy

```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)
Base = declarative_base()

async def get_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session
```

#### Repository Pattern

```python
# repositories/base.py
from typing import Generic, TypeVar, Type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, session: AsyncSession, model: Type[T]):
        self.session = session
        self.model = model

    async def get(self, id: int) -> T | None:
        return await self.session.get(self.model, id)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[T]:
        result = await self.session.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def create(self, obj: T) -> T:
        self.session.add(obj)
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def delete(self, obj: T) -> None:
        await self.session.delete(obj)
        await self.session.commit()
```

```python
# repositories/user.py
from .base import BaseRepository
from myapp.models import User

class UserRepository(BaseRepository[User]):
    def __init__(self, session):
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
```

### Unit of Work Pattern

```python
# unit_of_work.py
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession

class UnitOfWork:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = UserRepository(session)
        self.orders = OrderRepository(session)

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()

@asynccontextmanager
async def get_uow():
    async with async_session_maker() as session:
        uow = UnitOfWork(session)
        try:
            yield uow
        except Exception:
            await uow.rollback()
            raise
```

### Connection Pooling

```python
# Sync
engine = create_engine(
    DATABASE_URL,
    pool_size=5,           # Base connections
    max_overflow=10,       # Extra under load
    pool_timeout=30,       # Wait time for connection
    pool_recycle=1800,     # Recycle after 30 min
    pool_pre_ping=True,    # Verify before use
)

# Async
engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)
```

---

## Configuration Management

### Environment-Based Config

```python
# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    app_name: str = "MyApp"
    debug: bool = False

    # Database
    database_url: str
    db_pool_size: int = 5

    # Redis
    redis_url: str = "redis://localhost:6379"

    # External APIs
    stripe_api_key: str
    sendgrid_api_key: str

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

```python
# Usage with FastAPI
from fastapi import Depends
from myapp.config import Settings, get_settings

@app.get("/info")
async def info(settings: Settings = Depends(get_settings)):
    return {"app_name": settings.app_name}
```

### Multi-Environment Config

```python
# config.py
from enum import Enum

class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class BaseConfig(BaseSettings):
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = False
    database_url: str

class DevelopmentConfig(BaseConfig):
    debug: bool = True

class StagingConfig(BaseConfig):
    pass

class ProductionConfig(BaseConfig):
    pass

def get_config() -> BaseConfig:
    env = os.getenv("ENVIRONMENT", "development")
    configs = {
        "development": DevelopmentConfig,
        "staging": StagingConfig,
        "production": ProductionConfig,
    }
    return configs[env]()
```

### Secrets Management

```python
# For production, use secret managers
import boto3
from functools import lru_cache

@lru_cache
def get_secret(secret_name: str) -> dict:
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

class Settings(BaseSettings):
    @property
    def database_password(self) -> str:
        if self.environment == Environment.PRODUCTION:
            return get_secret("db-credentials")["password"]
        return self._database_password
```

---

## Testing Architecture

### Test Structure

```
tests/
├── conftest.py           # Shared fixtures
├── unit/
│   ├── test_models.py
│   └── test_services.py
├── integration/
│   ├── test_api.py
│   └── test_database.py
└── e2e/
    └── test_workflows.py
```

### Fixtures

```python
# conftest.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from myapp.main import app
from myapp.core.database import Base, get_session

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost/test_db"

@pytest.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def session(engine):
    async with AsyncSession(engine) as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(session):
    def override_session():
        yield session

    app.dependency_overrides[get_session] = override_session
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
```

### Testing Patterns

```python
# Unit tests
class TestUserService:
    async def test_create_user(self, session):
        service = UserService(session)
        user = await service.create(UserCreate(
            email="test@example.com",
            password="secret123"
        ))
        assert user.id is not None
        assert user.email == "test@example.com"

    async def test_create_duplicate_email_fails(self, session):
        service = UserService(session)
        await service.create(UserCreate(email="test@example.com", password="x"))

        with pytest.raises(DuplicateEmailError):
            await service.create(UserCreate(email="test@example.com", password="y"))

# Integration tests
class TestUserAPI:
    async def test_create_user(self, client):
        response = await client.post("/api/v1/users", json={
            "email": "test@example.com",
            "password": "secret123"
        })
        assert response.status_code == 201
        assert response.json()["email"] == "test@example.com"

    async def test_get_user_not_found(self, client):
        response = await client.get("/api/v1/users/999")
        assert response.status_code == 404
```

### Mocking External Services

```python
# tests/unit/test_email_service.py
from unittest.mock import AsyncMock, patch

class TestEmailService:
    @patch('myapp.services.email.sendgrid_client')
    async def test_send_email(self, mock_client):
        mock_client.send = AsyncMock(return_value={"status": "sent"})

        service = EmailService()
        result = await service.send(
            to="user@example.com",
            subject="Test",
            body="Hello"
        )

        assert result["status"] == "sent"
        mock_client.send.assert_called_once()
```

---

## Anti-Patterns to Avoid

### 1. Circular Imports

```python
# BAD: Circular dependency
# models/user.py
from myapp.services.user_service import UserService  # Imports models

# services/user_service.py
from myapp.models.user import User  # Circular!

# GOOD: Import at function level or restructure
# services/user_service.py
def get_user_model():
    from myapp.models.user import User
    return User

# BETTER: Use dependency injection
class UserService:
    def __init__(self, user_repository: UserRepository):
        self.repo = user_repository
```

### 2. Fat Views/Routes

```python
# BAD: All logic in route
@app.post("/users")
async def create_user(user: UserCreate, session: AsyncSession = Depends(get_session)):
    # Check if email exists
    existing = await session.execute(
        select(User).where(User.email == user.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email exists")

    # Hash password
    hashed = bcrypt.hash(user.password)

    # Create user
    db_user = User(email=user.email, hashed_password=hashed)
    session.add(db_user)
    await session.commit()

    # Send welcome email
    await send_email(db_user.email, "Welcome!")

    return db_user

# GOOD: Thin route, logic in service
@app.post("/users", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    service: UserService = Depends(get_user_service)
):
    return await service.create(user)
```

### 3. Hardcoded Configuration

```python
# BAD
DATABASE_URL = "postgresql://prod:secret@prod-db/app"

# GOOD
DATABASE_URL = os.getenv("DATABASE_URL")

# BETTER
from myapp.config import settings
DATABASE_URL = settings.database_url
```

### 4. Synchronous Code in Async Context

```python
# BAD: Blocks event loop
@app.get("/data")
async def get_data():
    import requests
    response = requests.get("https://api.example.com")  # Blocking!
    return response.json()

# GOOD: Use async libraries
@app.get("/data")
async def get_data():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com")
        return response.json()
```

### 5. God Services

```python
# BAD: One service does everything
class UserService:
    def create_user(self): ...
    def send_email(self): ...
    def process_payment(self): ...
    def generate_report(self): ...

# GOOD: Single responsibility
class UserService:
    def create_user(self): ...
    def update_user(self): ...

class EmailService:
    def send_email(self): ...

class PaymentService:
    def process_payment(self): ...
```

### 6. Missing Error Handling

```python
# BAD: Unhandled exceptions leak
@app.get("/users/{id}")
async def get_user(id: int, session: AsyncSession = Depends(get_session)):
    return await session.get(User, id)  # Returns None, or crashes

# GOOD: Proper error handling
@app.get("/users/{id}")
async def get_user(id: int, service: UserService = Depends(get_user_service)):
    user = await service.get(id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

---

## Practical Examples

### Example 1: Simple FastAPI Service

```
simple-api/
├── src/
│   └── simple_api/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── models.py
│       ├── schemas.py
│       ├── database.py
│       └── routes.py
├── tests/
│   ├── conftest.py
│   └── test_api.py
├── pyproject.toml
├── Dockerfile
└── docker-compose.yml
```

### Example 2: Production FastAPI Service

```
production-api/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── main.py
│       ├── core/
│       │   ├── __init__.py
│       │   ├── config.py
│       │   ├── database.py
│       │   ├── security.py
│       │   └── exceptions.py
│       ├── api/
│       │   ├── __init__.py
│       │   ├── deps.py
│       │   └── v1/
│       │       ├── __init__.py
│       │       ├── router.py
│       │       └── endpoints/
│       │           ├── users.py
│       │           └── items.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   └── item.py
│       ├── schemas/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   └── item.py
│       ├── services/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   └── item.py
│       └── repositories/
│           ├── __init__.py
│           ├── base.py
│           └── user.py
├── tests/
│   ├── conftest.py
│   ├── unit/
│   └── integration/
├── migrations/
│   └── versions/
├── scripts/
│   └── start.sh
├── deploy/
│   ├── Dockerfile
│   └── k8s/
├── pyproject.toml
└── docker-compose.yml
```

### Example 3: Django with Celery

```
django-celery-app/
├── src/
│   └── myproject/
│       ├── __init__.py
│       ├── celery.py
│       ├── settings/
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── development.py
│       │   └── production.py
│       ├── urls.py
│       └── wsgi.py
├── apps/
│   ├── users/
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── tasks.py
│   │   └── admin.py
│   └── orders/
│       ├── models.py
│       ├── views.py
│       ├── tasks.py
│       └── admin.py
├── templates/
├── static/
├── tests/
├── deploy/
├── manage.py
└── pyproject.toml
```

---

## Interview Questions

### Q1: How would you structure a Python microservice?

**Answer:**

For a microservice, I'd use a layered structure with clear boundaries:

```
myservice/
├── src/myservice/
│   ├── api/          # HTTP interface
│   ├── services/     # Business logic
│   ├── repositories/ # Data access
│   ├── models/       # Domain models
│   └── core/         # Config, DB, common
├── tests/
└── pyproject.toml
```

Key principles:
1. **Single Responsibility**: Each layer has one job
2. **Dependency Inversion**: Services depend on abstractions (Protocols), not concrete implementations
3. **Configuration**: Environment-based using pydantic-settings
4. **Async**: Use async/await for I/O-bound operations
5. **Testing**: Clear separation enables easy mocking

### Q2: When would you choose Django over FastAPI?

**Answer:**

**Choose Django when:**
- Building a full-stack application with server-rendered templates
- Need a built-in admin interface
- Want batteries-included (auth, ORM, forms, sessions)
- Team is more familiar with Django
- Project needs content management features

**Choose FastAPI when:**
- Building primarily APIs (REST, GraphQL)
- Performance is critical (FastAPI is faster)
- Need WebSocket support
- Want native async/await
- Type hints and auto-documentation are priorities
- Building microservices

**Key difference**: Django is a framework (it tells you how to structure code), FastAPI is a library (you decide the structure).

### Q3: Explain WSGI vs ASGI

**Answer:**

**WSGI (Web Server Gateway Interface)**:
- Synchronous protocol
- One request = one thread/process
- Simpler to understand
- Mature ecosystem
- Example servers: Gunicorn, uWSGI

**ASGI (Asynchronous Server Gateway Interface)**:
- Asynchronous protocol
- Single thread handles many concurrent requests
- Supports WebSockets, HTTP/2, long-polling
- Better for I/O-bound workloads
- Example servers: Uvicorn, Hypercorn

**When ASGI helps**: Many concurrent I/O operations (database queries, API calls). Doesn't help with CPU-bound work.

### Q4: How do you handle background tasks in Python?

**Answer:**

Three main approaches:

1. **Celery** (distributed task queue)
   - Best for: Large scale, complex workflows
   - Supports: Multiple brokers, task chaining, scheduling
   - Overhead: High (requires broker, workers)

2. **RQ** (Redis Queue)
   - Best for: Simple use cases
   - Supports: Redis only, basic retries
   - Overhead: Low

3. **In-process** (asyncio.create_task, threading)
   - Best for: Fire-and-forget, non-critical tasks
   - No persistence, lost on restart
   - Overhead: None

For production, I'd use Celery with Redis for:
- Email sending
- Report generation
- Data processing
- Scheduled jobs (Celery Beat)

### Q5: How do you manage configuration in Python applications?

**Answer:**

Best practice: Use pydantic-settings with environment variables.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    debug: bool = False

    class Config:
        env_file = ".env"

settings = Settings()
```

**Principles:**
1. **12-Factor App**: Config in environment, not code
2. **Type Safety**: Pydantic validates at startup
3. **Defaults**: Sensible defaults for optional settings
4. **Secrets**: Use secret managers in production (AWS Secrets Manager, HashiCorp Vault)
5. **No Hardcoding**: Never commit secrets

---

## Quick Reference

### Project Structure Decision Tree

```
Is it a single script?
  → Single .py file

Is it a small tool (<2000 lines)?
  → Flat package structure

Is it a web API?
  → Feature-based or layered structure

Is it enterprise scale?
  → Clean/Hexagonal architecture
```

### Framework Cheat Sheet

| Need | Use |
|------|-----|
| Fast API development | FastAPI |
| Full-stack web app | Django |
| Maximum flexibility | Flask |
| Async WebSockets | FastAPI + WebSocket |
| Admin panel | Django |
| GraphQL | Strawberry (FastAPI) or Graphene (Django) |

### Common Commands

```bash
# Virtual environment
python -m venv .venv
source .venv/bin/activate

# Dependencies
pip install -e ".[dev]"
pip freeze > requirements.txt

# Running servers
uvicorn myapp.main:app --reload          # FastAPI
gunicorn myapp.wsgi:application          # Django/Flask
python manage.py runserver               # Django dev

# Celery
celery -A myapp worker --loglevel=info
celery -A myapp beat
celery -A myapp flower

# Testing
pytest
pytest --cov=myapp tests/
pytest -x --pdb  # Stop on first failure, debug
```

---

## Resources

### Official Documentation
- [Python Packaging User Guide](https://packaging.python.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Django Documentation](https://docs.djangoproject.com/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Celery Documentation](https://docs.celeryq.dev/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)

### Books
- *Architecture Patterns with Python* by Harry Percival and Bob Gregory
- *Fluent Python* by Luciano Ramalho
- *Two Scoops of Django* by Daniel and Audrey Feldroy

### Project Templates
- [Full Stack FastAPI Template](https://github.com/fastapi/full-stack-fastapi-template)
- [Cookiecutter Django](https://github.com/cookiecutter/cookiecutter-django)
- [Python Project Template](https://github.com/rochacbruno/python-project-template)

### Style Guides
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [PEP 8 - Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [PEP 20 - The Zen of Python](https://peps.python.org/pep-0020/)
