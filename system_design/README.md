# System Design Documentation

This directory contains comprehensive system design documents for various distributed systems and applications. Each design follows a structured template covering requirements, architecture, algorithms, scalability, security, observability, and interview preparation.

---

## Structure

Each system design is organized in its own numbered directory following the topic numbering from the master list:

```
system_design/
├── README.md                           # This file
├── 1.1-distributed-rate-limiter/       # Topic 1.1
├── 1.2-distributed-load-balancer/      # Topic 1.2 (upcoming)
├── ...
```

### Document Structure Per Topic

Each system design directory contains 9 standardized documents:

| File | Purpose |
|------|---------|
| `00-index.md` | Overview, quick navigation, complexity rating |
| `01-requirements-and-estimations.md` | Functional/Non-functional requirements, capacity planning, SLOs |
| `02-high-level-design.md` | Architecture diagrams, data flow, key decisions |
| `03-low-level-design.md` | Data model, API design, algorithms (pseudocode) |
| `04-deep-dive-and-bottlenecks.md` | Critical components, race conditions, bottleneck analysis |
| `05-scalability-and-reliability.md` | Scaling strategies, fault tolerance, disaster recovery |
| `06-security-and-compliance.md` | Threat model, AuthN/AuthZ, compliance |
| `07-observability.md` | Metrics, logging, tracing, alerting |
| `08-interview-guide.md` | 45-min pacing, trap questions, trade-offs |

---

## Completed Designs

| # | Topic | Status | Link |
|---|-------|--------|------|
| 1.1 | Distributed Rate Limiter | Completed | [View](./1.1-distributed-rate-limiter/00-index.md) |
| 1.2 | Distributed Load Balancer | Completed | [View](./1.2-distributed-load-balancer/00-index.md) |
| 1.3 | Distributed Key-Value Store | Completed | [View](./1.3-distributed-key-value-store/00-index.md) |
| 1.4 | Distributed LRU Cache | Completed | [View](./1.4-distributed-lru-cache/00-index.md) |
| 1.5 | Distributed Log-Based Broker | Completed | [View](./1.5-distributed-log-based-broker/00-index.md) |
| 1.6 | Distributed Message Queue | Completed | [View](./1.6-distributed-message-queue/00-index.md) |
| 1.7 | Distributed Unique ID Generator | Completed | [View](./1.7-distributed-unique-id-generator/00-index.md) |
| 1.8 | Distributed Lock Manager | Completed | [View](./1.8-distributed-lock-manager/00-index.md) |
| 1.9 | Consistent Hashing Ring | Completed | [View](./1.9-consistent-hashing-ring/00-index.md) |
| 1.10 | Service Discovery System | Completed | [View](./1.10-service-discovery-system/00-index.md) |
| 1.11 | Configuration Management System | Completed | [View](./1.11-configuration-management-system/00-index.md) |
| 1.12 | Blob Storage System | Completed | [View](./1.12-blob-storage-system/00-index.md) |
| 1.13 | High-Performance Reverse Proxy | Completed | [View](./1.13-high-performance-reverse-proxy/00-index.md) |
| 1.14 | API Gateway Design | Completed | [View](./1.14-api-gateway-design/00-index.md) |
| 1.15 | Content Delivery Network (CDN) | Completed | [View](./1.15-content-delivery-network-cdn/00-index.md) |
| 1.16 | DNS System Design | Completed | [View](./1.16-dns-system-design/00-index.md) |
| 1.17 | Distributed Transaction Coordinator | Completed | [View](./1.17-distributed-transaction-coordinator/00-index.md) |
| 1.18 | Event Sourcing System | Completed | [View](./1.18-event-sourcing-system/00-index.md) |
| 1.19 | CQRS Implementation | Completed | [View](./1.19-cqrs-implementation/00-index.md) |
| 2.1 | Cloud Provider Architecture | Completed | [View](./2.1-cloud-provider-architecture/00-index.md) |
| 2.2 | Container Orchestration System | Completed | [View](./2.2-container-orchestration-system/00-index.md) |
| 2.3 | Function-as-a-Service (FaaS) | Completed | [View](./2.3-function-as-a-service/00-index.md) |
| 2.4 | CI/CD Pipeline Build System | Completed | [View](./2.4-cicd-pipeline-build-system/00-index.md) |
| 2.5 | Identity & Access Management (IAM) | Completed | [View](./2.5-identity-access-management/00-index.md) |
| 2.6 | Distributed Job Scheduler | Completed | [View](./2.6-distributed-job-scheduler/00-index.md) |
| 2.7 | Feature Flag Management | Completed | [View](./2.7-feature-flag-management/00-index.md) |
| 2.8 | Edge Computing Platform | Completed | [View](./2.8-edge-computing-platform/00-index.md) |
| 2.9 | Multi-Region Active-Active Architecture | Completed | [View](./2.9-multi-region-active-active/00-index.md) |
| 2.10 | Zero Trust Security Architecture | Completed | [View](./2.10-zero-trust-security-architecture/00-index.md) |
| 2.11 | Service Mesh Design | Completed | [View](./2.11-service-mesh-design/00-index.md) |
| 2.12 | Edge-Native Application Platform | Completed | [View](./2.12-edge-native-application-platform/00-index.md) |
| 2.13 | Edge AI/ML Inference | Completed | [View](./2.13-edge-ai-ml-inference/00-index.md) |
| 2.14 | Edge Data Processing | Completed | [View](./2.14-edge-data-processing/00-index.md) |
| 2.15 | Edge-Native Feature Flags | Completed | [View](./2.15-edge-native-feature-flags/00-index.md) |
| 2.16 | Secret Management System | Completed | [View](./2.16-secret-management-system/00-index.md) |
| 2.17 | Highly Resilient Status Page System | Completed | [View](./2.17-highly-resilient-status-page/00-index.md) |
| 2.18 | AI Native Cloud ERP SaaS | Completed | [View](./2.18-ai-native-cloud-erp-saas/00-index.md) |
| 2.19 | AI Native ATS Cloud SaaS | Completed | [View](./2.19-ai-native-ats-cloud-saas/00-index.md) |
| 2.20 | Compliance-First AI-Native Payroll Engine | Completed | [View](./2.20-compliance-first-ai-native-payroll-engine/00-index.md) |
| 2.21 | WhatsApp Native ERP for SMB | Completed | [View](./2.21-whatsapp-native-erp-smb/00-index.md) |
| 2.22 | AI Native Offline First POS | Completed | [View](./2.22-ai-native-offline-first-pos/00-index.md) |
| 2.23 | Compliance First AI Native EMR/EHR/PHR | Completed | [View](./2.23-compliance-first-ai-native-emr-ehr-phr/00-index.md) |
| 2.24 | AI-Powered Clinical Decision Support | Completed | [View](./2.24-ai-powered-clinical-decision-support/00-index.md) |
| 2.25 | Compliance First AI Native Pharmacy OS | Completed | [View](./2.25-compliance-first-ai-native-pharmacy-os/00-index.md) |
| 2.26 | Compliance First AI Native Hospital Management System | Completed | [View](./2.26-compliance-first-ai-native-hms/00-index.md) |
| 3.1 | AI Interviewer System | Completed | [View](./3.1-ai-interviewer-system/00-index.md) |
| 3.2 | ML Models Deployment System | Completed | [View](./3.2-ml-models-deployment-system/00-index.md) |
| 3.3 | AI-Native Metadata-Driven Super Framework | Completed | [View](./3.3-ai-native-metadata-driven-super-framework/00-index.md) |
| 3.4 | MLOps Platform | Completed | [View](./3.4-mlops-platform/00-index.md) |
| 3.5 | Uber Michelangelo ML Platform | Completed | [View](./3.5-uber-michelangelo-ml-platform/00-index.md) |
| 3.6 | Netflix Metaflow ML Workflow Platform | Completed | [View](./3.6-netflix-metaflow-ml-workflow-platform/00-index.md) |
| 3.7 | Netflix Runway Model Lifecycle Management | Completed | [View](./3.7-netflix-runway-model-lifecycle/00-index.md) |
| 3.8 | Meta FBLearner Flow Declarative ML Platform | Completed | [View](./3.8-meta-fblearner-flow-ml-platform/00-index.md) |
| 3.9 | Airbnb BigHead ML Platform | Completed | [View](./3.9-airbnb-bighead-ml-platform/00-index.md) |
| 3.10 | Open-Source End-to-End ML Platform | Completed | [View](./3.10-open-source-ml-platform/00-index.md) |
| 3.11 | AIOps System | Completed | [View](./3.11-aiops-system/00-index.md) |
| 3.12 | Recommendation Engine | Completed | [View](./3.12-recommendation-engine/00-index.md) |
| 3.13 | LLM Training & Inference Architecture | Completed | [View](./3.13-llm-training-inference-architecture/00-index.md) |
| 3.14 | Vector Database | Completed | [View](./3.14-vector-database/00-index.md) |
| 3.15 | RAG System | Completed | [View](./3.15-rag-system/00-index.md) |
| 3.16 | Feature Store | Completed | [View](./3.16-feature-store/00-index.md) |
| 3.17 | AI Agent Orchestration Platform | Completed | [View](./3.17-ai-agent-orchestration-platform/00-index.md) |
| 3.18 | AI Code Assistant | Completed | [View](./3.18-ai-code-assistant/00-index.md) |
| 3.19 | AI Voice Assistant | Completed | [View](./3.19-ai-voice-assistant/00-index.md) |
| 3.20 | AI Image Generation Platform | Completed | [View](./3.20-ai-image-generation-platform/00-index.md) |
| 3.21 | LLM Gateway / Prompt Management | Completed | [View](./3.21-llm-gateway-prompt-management/00-index.md) |
| 3.22 | AI Guardrails & Safety System | Completed | [View](./3.22-ai-guardrails-safety-system/00-index.md) |
| 3.23 | LLM Inference Engine | Completed | [View](./3.23-llm-inference-engine/00-index.md) |
| 3.24 | Multi-Agent Orchestration Platform | Completed | [View](./3.24-multi-agent-orchestration-platform/00-index.md) |
| 3.25 | AI Observability & LLMOps Platform | Completed | [View](./3.25-ai-observability-llmops-platform/00-index.md) |
| 3.26 | AI Model Evaluation & Benchmarking Platform | Completed | [View](./3.26-ai-model-evaluation-benchmarking-platform/00-index.md) |
| 3.27 | Synthetic Data Generation Platform | Completed | [View](./3.27-synthetic-data-generation-platform/00-index.md) |
| 3.28 | AI Memory Management System | Completed | [View](./3.28-ai-memory-management-system/00-index.md) |
| 3.29 | AI-Native Hybrid Search Engine | Completed | [View](./3.29-ai-native-hybrid-search-engine/00-index.md) |
| 3.30 | AI-Native Video Generation Platform | Completed | [View](./3.30-ai-native-video-generation-platform/00-index.md) |
| 3.31 | AI-Native Document Processing Platform (IDP) | Completed | [View](./3.31-ai-native-document-processing-platform/00-index.md) |
| 3.32 | AI-Native Enterprise Knowledge Graph | Completed | [View](./3.32-ai-native-enterprise-knowledge-graph/00-index.md) |
| 3.33 | AI-Native Customer Service Platform | Completed | [View](./3.33-ai-native-customer-service-platform/00-index.md) |
| 3.34 | AI-Native Real-Time Personalization Engine | Completed | [View](./3.34-ai-native-real-time-personalization-engine/00-index.md) |
| 3.35 | AI-Native Translation & Localization Platform | Completed | [View](./3.35-ai-native-translation-localization-platform/00-index.md) |
| 3.36 | AI-Native Data Pipeline (EAI) | Completed | [View](./3.36-ai-native-data-pipeline-eai/00-index.md) |
| 3.37 | AI-Native Legal Tech Platform | Completed | [View](./3.37-ai-native-legal-tech-platform/00-index.md) |
| 3.38 | AI-Native Autonomous Vehicle Platform | Completed | [View](./3.38-ai-native-autonomous-vehicle-platform/00-index.md) |
| 3.39 | AI-Native Proactive Observability Platform | Completed | [View](./3.39-ai-native-proactive-observability-platform/00-index.md) |
| 4.1 | Facebook | Completed | [View](./4.1-facebook/00-index.md) |
| 4.2 | Twitter/X | Completed | [View](./4.2-twitter/00-index.md) |
| 4.3 | Instagram | Completed | [View](./4.3-instagram/00-index.md) |
| 4.4 | LinkedIn | Completed | [View](./4.4-linkedin/00-index.md) |
| 4.5 | TikTok | Completed | [View](./4.5-tiktok/00-index.md) |
| 4.6 | Tinder | Completed | [View](./4.6-tinder/00-index.md) |
| 4.7 | WhatsApp | Completed | [View](./4.7-whatsapp/00-index.md) |
| 4.8 | Snapchat | Completed | [View](./4.8-snapchat/00-index.md) |
| 4.9 | Telegram | Completed | [View](./4.9-telegram/00-index.md) |
| 4.10 | Slack/Discord | Completed | [View](./4.10-slack-discord/00-index.md) |
| 4.11 | Reddit | Completed | [View](./4.11-reddit/00-index.md) |
| 5.1 | YouTube | Completed | [View](./5.1-youtube/00-index.md) |
| 5.2 | Netflix | Completed | [View](./5.2-netflix/00-index.md) |
| 5.3 | Netflix CDN (Open Connect) | Completed | [View](./5.3-netflix-cdn/00-index.md) |
| 5.4 | Spotify | Completed | [View](./5.4-spotify/00-index.md) |
| 5.5 | Disney+ Hotstar | Completed | [View](./5.5-disney-hotstar/00-index.md) |
| 5.6 | Google Photos | Completed | [View](./5.6-google-photos/00-index.md) |
| 5.7 | Twitch | Completed | [View](./5.7-twitch/00-index.md) |
| 5.8 | Podcast Platform | Completed | [View](./5.8-podcast-platform/00-index.md) |
| 6.1 | Cloud File Storage | Completed | [View](./6.1-cloud-file-storage/00-index.md) |
| 6.2 | Document Collaboration Engine | Completed | [View](./6.2-document-collaboration-engine/00-index.md) |
| 6.3 | Multi-Tenant SaaS Platform Architecture | Completed | [View](./6.3-multi-tenant-saas-platform-architecture/00-index.md) |
| 6.4 | HubSpot (Marketing Automation & CRM) | Completed | [View](./6.4-hubspot/00-index.md) |
| 6.5 | Zoho Suite (Multi-Product Platform) | Completed | [View](./6.5-zoho-suite/00-index.md) |
| 6.6 | Ticketmaster (High Contention Booking) | Completed | [View](./6.6-ticketmaster/00-index.md) |
| 6.7 | Google Meet / Zoom (Video Conferencing) | Completed | [View](./6.7-google-meet-zoom/00-index.md) |
| 6.8 | Real-Time Collaborative Editor | Completed | [View](./6.8-real-time-collaborative-editor/00-index.md) |
| 6.9 | GitHub (Git Hosting, Pull Requests, Actions, Code Search) | Completed | [View](./6.9-github/00-index.md) |
| 6.10 | Figma (Real-time Design Collaboration, Multiplayer Cursors) | Completed | [View](./6.10-figma/00-index.md) |
| 6.11 | WebRTC Collaborative Canvas (Miro/Excalidraw) | Completed | [View](./6.11-webrtc-collaborative-canvas/00-index.md) |
| 6.12 | Document Management System (SharePoint/Box) | Completed | [View](./6.12-document-management-system/00-index.md) |
| 6.13 | Enterprise Knowledge Management System (Confluence) | Completed | [View](./6.13-enterprise-knowledge-management-system/00-index.md) |
| 6.14 | Customer Support Platform (Zendesk/Intercom) | Completed | [View](./6.14-customer-support-platform/00-index.md) |
| 6.15 | Calendar & Scheduling System (Google Calendar/Calendly) | Completed | [View](./6.15-calendar-scheduling-system/00-index.md) |
| 6.16 | Digital Signature Platform (DocuSign/HelloSign) | Completed | [View](./6.16-digital-signature-platform/00-index.md) |
| 6.17 | No-Code/Low-Code Platform (Retool/Airtable) | Completed | [View](./6.17-no-code-low-code-platform/00-index.md) |
| 7.1 | Uber/Lyft (Driver Matching, Location Tracking, Surge Pricing) | Completed | [View](./7.1-uber-lyft/00-index.md) |
| 7.2 | Airbnb (Booking, Calendar Availability, Search Ranking) | Completed | [View](./7.2-airbnb/00-index.md) |
| 7.3 | Car Parking System (Object Modeling, Slot Allocation, Payment) | Completed | [View](./7.3-car-parking-system/00-index.md) |
| 7.4 | Food Delivery System (DoorDash/Zomato - Order Routing, ETA, Driver Assignment) | Completed | [View](./7.4-food-delivery-system/00-index.md) |
| 7.5 | Maps & Navigation Service (Google Maps - Tile System, Routing, Traffic) | Completed | [View](./7.5-maps-navigation-service/00-index.md) |
| 7.6 | Flight Booking System (Expedia/Kayak - Aggregation, Inventory, Pricing) | Completed | [View](./7.6-flight-booking-system/00-index.md) |
| 7.7 | Hotel Booking System (Booking.com - Availability, Rate Management) | Completed | [View](./7.7-hotel-booking-system/00-index.md) |
| 8.1 | Amazon (Product Catalog, Cart, Checkout, Inventory) | Completed | [View](./8.1-amazon/00-index.md) |
| 8.2 | Stripe / Razorpay (Payment Gateway, Idempotency, Webhooks) | Completed | [View](./8.2-stripe-razorpay/00-index.md) |
| 8.3 | Zerodha (Stock Trading, High-speed Order Matching, Market Data) | Completed | [View](./8.3-zerodha/00-index.md) |
| 8.4 | Digital Wallet (Apple Pay/Paytm - Ledger Consistency, P2P Transfers) | Completed | [View](./8.4-digital-wallet/00-index.md) |
| 8.5 | Fraud Detection System (Real-time ML Scoring, Rules Engine) | Completed | [View](./8.5-fraud-detection-system/00-index.md) |
| 8.6 | Distributed Ledger / Core Banking System (ACID at Scale, Double-entry) | Completed | [View](./8.6-distributed-ledger-core-banking/00-index.md) |
| 8.7 | Cryptocurrency Exchange (Coinbase/Binance - Matching Engine, Wallet Management) | Completed | [View](./8.7-cryptocurrency-exchange/00-index.md) |
| 8.8 | Blockchain Network (Ethereum/Bitcoin - Consensus, P2P, Smart Contracts) | Completed | [View](./8.8-blockchain-network/00-index.md) |
| 8.9 | Buy Now Pay Later (BNPL) (Klarna/Affirm - Credit Decisioning, Installments) | Completed | [View](./8.9-buy-now-pay-later/00-index.md) |
| 8.11 | UPI Real-Time Payment System (NPCI Switch, PSP Integration, QR/Intent Flows) | Completed | [View](./8.11-upi-real-time-payment-system/00-index.md) |
| 8.10 | Expense Management System (Expensify/Brex - Receipt OCR, Policy Enforcement) | Completed | [View](./8.10-expense-management-system/00-index.md) |
| 8.12 | CBDC/Digital Currency Platform (Digital Rupee/Drex/Digital Yuan) | Completed | [View](./8.12-cbdc-digital-currency-platform/00-index.md) |
| 8.13 | Cryptocurrency Wallet System (MPC Wallets, Account Abstraction, Key Sharding) | Completed | [View](./8.13-cryptocurrency-wallet-system/00-index.md) |
| 8.14 | Super App Payment Platform (GPay/PhonePe/Paytm - UPI TPP, Rewards) | Completed | [View](./8.14-super-app-payment-platform/00-index.md) |
| 9.1 | ERP System Design (SAP/Oracle/Odoo - Modules, Multi-tenancy, Customization Engine) | Completed | [View](./9.1-erp-system-design/00-index.md) |
| 9.2 | Accounting/General Ledger System (Double-entry Bookkeeping, Chart of Accounts, Reconciliation) | Completed | [View](./9.2-accounting-general-ledger-system/00-index.md) |
| 9.3 | Tax Calculation Engine (Avalara/Vertex - Jurisdiction Rules, Real-time Calc, Compliance) | Completed | [View](./9.3-tax-calculation-engine/00-index.md) |
| 9.4 | Inventory Management System (WMS - Stock Levels, FIFO/LIFO/FEFO, Multi-warehouse) | Completed | [View](./9.4-inventory-management-system/00-index.md) |
| 9.5 | Procurement System (P2P - Purchase Orders, Approvals, Vendor Management, RFQ) | Completed | [View](./9.5-procurement-system/00-index.md) |
| 9.6 | Invoice & Billing System (Recurring Billing, Proration, Revenue Recognition, Dunning) | Completed | [View](./9.6-invoice-billing-system/00-index.md) |
| 9.7 | Human Capital Management (Workday/SAP SuccessFactors - Payroll, Benefits, Time Tracking) | Completed | [View](./9.7-human-capital-management/00-index.md) |
| 9.8 | Supply Chain Management (Demand Forecasting, Order Management, Logistics Optimization) | Completed | [View](./9.8-supply-chain-management/00-index.md) |
| 9.9 | CRM System Design (Salesforce/Zoho CRM - Lead Management, Pipeline, Custom Objects) | Completed | [View](./9.9-crm-system-design/00-index.md) |
| 9.10 | Business Intelligence Platform (Tableau/Looker - OLAP Cubes, Semantic Layer, Dashboard Engine) | Completed | [View](./9.10-business-intelligence-platform/00-index.md) |
| 9.11 | AI-Native Compliance Management (Vanta/Drata/Secureframe - Auto Evidence Collection, Control Monitoring, SOC2/HIPAA/ISO27001) | Completed | [View](./9.11-ai-native-compliance-management/00-index.md) |
| 9.12 | AI-Native Procurement & Spend Intelligence (Zip, Coupa AI, SAP Ariba AI - Supplier Discovery, Price Optimization, Autonomous PO) | Completed | [View](./9.12-ai-native-procurement-spend-intelligence/00-index.md) |
| 9.13 | AI-Native Revenue Intelligence Platform (Gong, Clari, Salesforce Einstein - Conversation Intelligence, Pipeline Forecasting) | Completed | [View](./9.13-ai-native-revenue-intelligence-platform/00-index.md) |
| 9.14 | AI-Native Core Banking Platform (Infosys Finacle/TCS BaNCS - Microservices CBS, Multi-Currency, Open Banking, ISO 20022) | Completed | [View](./9.14-ai-native-core-banking-platform/00-index.md) |
| 10.1 | Telemedicine Platform (Video Consult, Scheduling, HIPAA Compliance) | Completed | [View](./10.1-telemedicine-platform/00-index.md) |
| 10.2 | Cloud-Native Electronic Health Records (EHR) (Patient Data, Interoperability, HL7/FHIR) | Completed | [View](./10.2-cloud-native-ehr/00-index.md) |
| 10.3 | Smart Home Platform (Device Registry, Commands, Automation Rules) | Completed | [View](./10.3-smart-home-platform/00-index.md) |
| 10.4 | Fleet Management System (Vehicle Tracking, Telemetry, Route Optimization) | Completed | [View](./10.4-fleet-management-system/00-index.md) |
| 10.5 | Industrial IoT Platform (Sensor Data Ingestion, Edge Processing, Alerts) | Completed | [View](./10.5-industrial-iot-platform/00-index.md) |
| 10.6 | Wearable Health Monitoring (Fitbit/Apple Watch - Data Sync, Alerts, Trends) | Completed | [View](./10.6-wearable-health-monitoring/00-index.md) |
| 10.7 | Biometric Travel Platform (DigiYatra - Facial Recognition, Blockchain Credentials, IATA One ID) | Completed | [View](./10.7-biometric-travel-platform/00-index.md) |
| 11.1 | Online Learning Platform (Coursera/Udemy - Video Delivery, Progress, Certificates) | Completed | [View](./11.1-online-learning-platform/00-index.md) |
| 11.2 | Live Classroom System (Zoom for Education - Whiteboard, Breakout Rooms) | Completed | [View](./11.2-live-classroom-system/00-index.md) |
| 11.3 | Push Notification System (APNs/FCM - Delivery, Targeting, Analytics) | Completed | [View](./11.3-push-notification-system/00-index.md) |
| 11.4 | Email Delivery System (SendGrid/Mailchimp - Deliverability, Templates, Tracking) | Completed | [View](./11.4-email-delivery-system/00-index.md) |
| 11.5 | SMS Gateway (Twilio - Routing, Delivery Reports, Short Codes) | Completed | [View](./11.5-sms-gateway/00-index.md) |
| 12.1 | AdTech: Real-Time Bidding (RTB) System (High Throughput, Low Latency Auction) | Completed | [View](./12.1-adtech-real-time-bidding/00-index.md) |
| 12.2 | Gaming: Multiplayer Game State Sync (Server Tick, Lag Compensation) | Completed | [View](./12.2-gaming-multiplayer-game-state-sync/00-index.md) |
| 12.3 | Gaming: Live Leaderboard (Redis Sorted Sets, Near Real-time Updates) | Completed | [View](./12.3-gaming-live-leaderboard/00-index.md) |
| 12.4 | Gaming: Matchmaking System (Skill-based, Queue Management, Latency) | Completed | [View](./12.4-gaming-matchmaking-system/00-index.md) |
| 12.5 | Design a URL Shortener (TinyURL/Bitly - Classic Warmup, Analytics) | Completed | [View](./12.5-url-shortener/00-index.md) |
| 12.6 | Design a Pastebin (Simple Storage, Expiry, Syntax Highlighting) | Completed | [View](./12.6-pastebin/00-index.md) |
| 12.7 | Design a P2P File Sharing Network (BitTorrent - DHT/Kademlia, Chunks, Swarm) | Completed | [View](./12.7-p2p-file-sharing-network/00-index.md) |
| 12.8 | Design WebRTC Infrastructure (STUN/TURN, ICE, SFU/MCU Scaling) | Completed | [View](./12.8-webrtc-infrastructure/00-index.md) |
| 12.9 | Design a Code Execution Sandbox (LeetCode/Replit - Isolation, Resource Limits, Security) | Completed | [View](./12.9-code-execution-sandbox/00-index.md) |
| 12.10 | Design a Polling/Voting System (High Write Throughput, Result Aggregation) | Completed | [View](./12.10-polling-voting-system/00-index.md) |
| 12.11 | Package Registry (npm/PyPI/Maven Central - Artifact Storage, Versioning, Security Scanning, CDN) | Completed | [View](./12.11-package-registry/00-index.md) |
| 12.12 | Password Manager (Zero-Knowledge Encryption, Key Hierarchy, Vault Sync, Browser Extension Autofill) | Completed | [View](./12.12-password-manager/00-index.md) |
| 12.13 | Bot Detection System (Behavioral Biometrics, Device Fingerprinting, ML Risk Scoring, Challenge-Response) | Completed | [View](./12.13-bot-detection-system/00-index.md) |
| 12.14 | A/B Testing Platform (Experiment Assignment, Statistical Significance, Feature Flags, Segmentation) | Completed | [View](./12.14-ab-testing-platform/00-index.md) |
| 12.15 | Customer Data Platform (Event Collection, Identity Resolution, Destinations, Audience Building) | Completed | [View](./12.15-customer-data-platform/00-index.md) |
| 12.16 | Product Analytics Platform (Funnel Analysis, Cohorts, Retention, Event Tracking, User Journeys) | Completed | [View](./12.16-product-analytics-platform/00-index.md) |
| 12.17 | Content Moderation System (AI + Human Review, Toxicity Detection, Appeals, Review Queues, Policy Enforcement) | Completed | [View](./12.17-content-moderation-system/00-index.md) |
| 12.18 | Marketplace Platform (Two-sided Marketplace, Trust & Safety, Search Ranking, Payments, Reviews) | Completed | [View](./12.18-marketplace-platform/00-index.md) |
| 12.19 | AI-Native Insurance Platform (Instant Underwriting, Claims Automation, Risk Assessment, Fraud Detection, Behavioral Pricing) | Completed | [View](./12.19-ai-native-insurance-platform/00-index.md) |
| 12.20 | AI-Native Recruitment Platform (Interview AI, Candidate Matching, Bias Detection, Skills Assessment, Conversational Recruiting) | Completed | [View](./12.20-ai-native-recruitment-platform/00-index.md) |
| 12.21 | AI-Native Creative Design Platform (Generative Design, Layout Generation, Brand Consistency, Asset Variation, Design System Automation) | Completed | [View](./12.21-ai-native-creative-design-platform/00-index.md) |
| 13.1 | AI-Native Manufacturing Platform (Digital Twin, Predictive Maintenance, Quality Inspection CV, Production Optimization, Defect Detection) | Completed | [View](./13.1-ai-native-manufacturing-platform/00-index.md) |
| 13.2 | AI-Native Logistics & Supply Chain Platform (Route Optimization, Demand Forecasting, Warehouse Automation, Fleet Management, Last-Mile Delivery) | Completed | [View](./13.2-ai-native-logistics-supply-chain-platform/00-index.md) |
| 13.3 | AI-Native Energy & Grid Management Platform (Grid Optimization, Renewable Forecasting, Demand Response, Virtual Power Plants, Smart Metering) | Completed | [View](./13.3-ai-native-energy-grid-management-platform/00-index.md) |
| 13.4 | AI-Native Real Estate & PropTech Platform (Automated Valuation, Smart Building Management, Tenant Matching, Lease Intelligence, Property Search) | Completed | [View](./13.4-ai-native-real-estate-proptech-platform/00-index.md) |
| 13.5 | AI-Native Agriculture & Precision Farming Platform (Crop Monitoring, Yield Prediction, Precision Spraying, Soil Analysis, Irrigation Optimization) | Completed | [View](./13.5-ai-native-agriculture-precision-farming-platform/00-index.md) |
| 13.6 | AI-Native Media & Entertainment Platform (Content Generation, Audience Analytics, Personalization, Ad Optimization, Rights Management, Dubbing/Localization) | Completed | [View](./13.6-ai-native-media-entertainment-platform/00-index.md) |
| 13.7 | AI-Native Construction & Engineering Platform (BIM Intelligence, Cost Estimation, Safety Monitoring, Progress Tracking, Resource Optimization, Risk Prediction) | Completed | [View](./13.7-ai-native-construction-engineering-platform/00-index.md) |
| 14.1 | AI-Native MSME Credit Scoring & Lending Platform (Alternative Data Credit Scoring, Behavioral/Transactional Analysis, Psychometric Testing, Thin-File Lending, Embedded Finance) | Completed | [View](./14.1-ai-native-msme-credit-scoring-lending-platform/00-index.md) |
| 14.2 | AI-Native Conversational Commerce Platform (WhatsApp Business API, Catalog Sync, Cart Management, Payment Integration, Vernacular NLP, Broadcast Campaigns) | Completed | [View](./14.2-ai-native-conversational-commerce-platform/00-index.md) |
| 14.3 | AI-Native MSME Accounting & Tax Compliance Platform (Auto Categorization, GST/VAT Filing, Bank Reconciliation, Invoice OCR, Multi-Country Compliance) | Completed | [View](./14.3-ai-native-msme-accounting-tax-compliance-platform/00-index.md) |
| 14.4 | AI-Native SME Inventory & Demand Forecasting System (Demand Sensing, Stock Optimization, Reorder Automation, Multi-Channel Sync, Expiry/Batch Management) | Completed | [View](./14.4-ai-native-sme-inventory-demand-forecasting-system/00-index.md) |
| 14.5 | AI-Native B2B Supplier Discovery & Procurement Marketplace (Semantic Supplier Search, Field-Aware Embeddings, Trust Scoring, RFQ Optimization, Price Benchmarking, Escrow Payments) | Completed | [View](./14.5-ai-native-b2b-supplier-discovery-procurement-marketplace/00-index.md) |
| 14.6 | AI-Native Vernacular Voice Commerce Platform (Multilingual ASR, Code-Mixed Speech, Voice Ordering, Vernacular Product Resolution, Outbound Campaigns, Telephony Integration) | Completed | [View](./14.6-ai-native-vernacular-voice-commerce-platform/00-index.md) |
| 14.7 | AI-Native SMB Workforce Scheduling & Gig Management | Completed | [View](./14.7-ai-native-smb-workforce-scheduling-gig-management/00-index.md) |
| 14.8 | AI-Native Quality Control for SME Manufacturing | Completed | [View](./14.8-ai-native-quality-control-sme-manufacturing/00-index.md) |
| 14.9 | AI-Native MSME Marketing & Social Commerce Platform | Completed | [View](./14.9-ai-native-msme-marketing-social-commerce-platform/00-index.md) |
| 14.10 | AI-Native Trade Finance & Invoice Factoring Platform | Completed | [View](./14.10-ai-native-trade-finance-invoice-factoring-platform/00-index.md) |
| 14.11 | AI-Native Digital Storefront Builder for SMEs | Completed | [View](./14.11-ai-native-digital-storefront-builder-smes/00-index.md) |
| 14.12 | AI-Native Field Service Management for SMEs | Completed | [View](./14.12-ai-native-field-service-management-smes/00-index.md) |
| 14.13 | AI-Native MSME Business Intelligence Dashboard | Completed | [View](./14.13-ai-native-msme-business-intelligence-dashboard/00-index.md) |
| 14.14 | AI-Native Regulatory & Compliance Assistant for MSMEs | Completed | [View](./14.14-ai-native-regulatory-compliance-assistant-msmes/00-index.md) |
| 14.15 | AI-Native Hyperlocal Logistics & Delivery Platform for SMEs | Completed | [View](./14.15-ai-native-hyperlocal-logistics-delivery-platform-smes/00-index.md) |
| 14.16 | AI-Native ONDC Commerce Platform | Completed | [View](./14.16-ai-native-ondc-commerce-platform/00-index.md) |
| 14.17 | AI-Native India Stack Integration Platform | Completed | [View](./14.17-ai-native-india-stack-integration-platform/00-index.md) |
| 14.18 | Digital Document Vault Platform | Completed | [View](./14.18-digital-document-vault-platform/00-index.md) |
| 14.19 | AI-Native Mobile Money Super App Platform (M-Pesa Model) | Completed | [View](./14.19-ai-native-mobile-money-super-app-platform/00-index.md) |
| 14.20 | AI-Native Agent Banking Platform for Africa | Completed | [View](./14.20-ai-native-agent-banking-platform-africa/00-index.md) |
| 14.21 | AI-Native PIX Commerce Platform (Brazil Model) | Completed | [View](./14.21-ai-native-pix-commerce-platform/00-index.md) |
| 14.22 | AI-Native WhatsApp+PIX Commerce Assistant | Completed | [View](./14.22-ai-native-whatsapp-pix-commerce-assistant/00-index.md) |
| 15.1 | Metrics & Monitoring System | Completed | [View](./15.1-metrics-monitoring-system/00-index.md) |
| 15.2 | Distributed Tracing System | Completed | [View](./15.2-distributed-tracing-system/00-index.md) |
| 15.3 | Log Aggregation System | Completed | [View](./15.3-log-aggregation-system/00-index.md) |
| 15.4 | eBPF-based Observability Platform | Completed | [View](./15.4-ebpf-observability-platform/00-index.md) |


---

## Design Principles

All designs in this repository follow these principles:

1. **Language Agnostic** - Pseudocode only, no specific programming language
2. **Cloud Agnostic** - Generic terms (e.g., "Object Storage" not "S3")
3. **Interview Ready** - Structured for 45-minute system design interviews
4. **Production Focused** - Real-world patterns from engineering blogs
5. **Trade-off Driven** - Explicit discussion of alternatives and decisions

---

## How to Use

### For Interview Prep
1. Start with `00-index.md` for system overview
2. Review `01-requirements-and-estimations.md` for capacity planning practice
3. Study `02-high-level-design.md` and `03-low-level-design.md` for core concepts
4. Use `08-interview-guide.md` for pacing and trap questions

### For Deep Learning
1. Read all documents in order (00 → 08)
2. Focus on `04-deep-dive-and-bottlenecks.md` for distributed systems challenges
3. Study `05-scalability-and-reliability.md` for production concerns

### For Quick Reference
- Each `00-index.md` has algorithm comparison tables
- Each `08-interview-guide.md` has quick reference cards

---

## Topic Categories

| Category | Topics |
|----------|--------|
| **1. Core Infrastructure** | Rate Limiter, Load Balancer, KV Store, Cache, Message Queue, etc. |
| **2. Cloud & Platform** | Kubernetes, Serverless, CI/CD, IAM, Service Mesh, etc. |
| **3. Data Systems** | Search Engine, Time-Series DB, Graph DB, Data Warehouse, etc. |
| **4. Observability** | Metrics, Tracing, Logging, Chaos Engineering, etc. |
| **5. AI/ML** | Vector DB, RAG, Feature Store, LLM Infrastructure, etc. |
| **6-14. Applications** | Social, Media, FinTech, Enterprise, Healthcare, Gaming, etc. |

See [topics_list.md](../.claude/topics_list.md) for the complete list.

---

## References

Designs are informed by engineering blogs from:
- Stripe, Cloudflare, GitHub, Netflix, Uber
- Databricks, Airbnb, Meta, Google
- Various conference talks and papers

Each design document cites specific sources where applicable.
