# Requirements & Estimations

> **Navigation**: [Index](./00-index.md) | **Requirements** | [HLD](./02-high-level-design.md) | [LLD](./03-low-level-design.md) | [Deep Dive](./04-deep-dive-and-bottlenecks.md) | [Scale](./05-scalability-and-reliability.md) | [Security](./06-security-and-compliance.md) | [Observability](./07-observability.md) | [Interview Guide](./08-interview-guide.md)

---

## 1. Functional Requirements

### P0 - Core Requirements (Must Have)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| FR-01 | **AI Rule Discovery** | Parse legal documents (labor laws, tax codes, collective agreements) to extract structured payroll rules | Extract rules with >90% precision, identify rule type, conditions, actions, effective dates |
| FR-02 | **Human-in-the-Loop Approval** | AI suggests rules with confidence scores and reasoning; humans review, modify, approve before activation | Approval workflow with version control, rejection with feedback, modification tracking |
| FR-03 | **Automatic Rule Application** | Rules automatically apply based on employee work location, residence, employment type | Correct jurisdiction selection for each employee, rule conflict resolution |
| FR-04 | **Gross-to-Net Calculation** | Calculate net pay from gross including all deductions, taxes, and adjustments | 100% accuracy, support for all earning types (regular, overtime, bonus, commission) |
| FR-05 | **Multi-Jurisdiction Tax Withholding** | Federal, state, local tax withholding for 7,040+ US jurisdictions | Accurate tax calculation per IRS/state guidelines, reciprocity agreement handling |
| FR-06 | **Explainable Calculations** | Every calculation line item includes rule citation and human-readable explanation | Line-by-line breakdown with "why" for each deduction/tax |
| FR-07 | **Regulatory Change Detection** | Monitor for new laws, amendments, rate changes and alert compliance team | Detection within 24 hours of publication, prioritized alert queue |
| FR-08 | **Pay Run Processing** | Execute batch payroll for all employees on a pay schedule | Complete within SLA (30 min for 10K employees), support preview and finalization |
| FR-09 | **Audit Trail** | Immutable record of all calculations, rule changes, and approvals | 7-year retention, tamper-evident, compliance-ready reports |
| FR-10 | **Employee Self-Service** | Employees view pay stubs, tax documents, update withholding elections | Real-time access, mobile-friendly, secure authentication |

### P1 - Extended Requirements (Should Have)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| FR-11 | **Collective Agreement Parsing** | Parse union contracts to extract wage scales, benefits, overtime rules | Extract structured rules from contract PDFs |
| FR-12 | **Benefits Administration** | Pre-tax and post-tax deductions (401k, HSA, FSA, insurance) | Correct ordering, limit tracking, eligibility rules |
| FR-13 | **Garnishment Processing** | Wage attachments, child support, tax levies, student loans | Priority ordering, disposable income calculation, state-specific limits |
| FR-14 | **Year-End Processing** | W-2, 1099, state tax forms generation and filing | Accurate totals, timely generation, electronic filing support |
| FR-15 | **International Payroll** | Multi-currency, multi-country (160+ countries) | Local tax compliance, currency conversion, statutory reporting |
| FR-16 | **Retro-Pay Calculations** | Backdated adjustments with tax recalculation | Accurate adjustment, amended tax deposits |
| FR-17 | **Time & Attendance Integration** | Import hours from time tracking systems | Real-time sync, overtime calculation, approval workflows |
| FR-18 | **General Ledger Integration** | Post payroll journal entries to ERP/accounting | Accurate account mapping, reversals, period close support |

### P2 - Nice to Have

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-19 | **Predictive Compliance** | Predict upcoming compliance gaps based on regulatory trends |
| FR-20 | **Natural Language Queries** | Employees ask questions about pay in natural language |
| FR-21 | **Compensation Benchmarking** | AI-powered salary recommendations based on market data |
| FR-22 | **Fraud Detection** | Detect ghost employees, unauthorized changes, unusual patterns |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Single calculation latency | <1 second | Real-time gross-to-net preview |
| Batch pay run (10K employees) | <30 minutes | Parallel processing across workers |
| Batch pay run (100K employees) | <2 hours | Enterprise scale |
| Rule lookup latency | <50ms | Cached, by jurisdiction |
| AI rule extraction (per document) | <5 minutes | Async processing acceptable |
| Explanation generation | <2 seconds | Per calculation |

### 2.2 Availability & Reliability

| Metric | Target | Notes |
|--------|--------|-------|
| Pay run completion SLA | 99.99% on schedule | Missing payroll is a critical failure |
| Core API availability | 99.95% | Employee self-service, admin portal |
| AI features availability | 99.9% | Graceful degradation to manual |
| Calculation engine availability | 99.99% | Pay deadline criticality |
| Data durability | 99.999999999% (11 nines) | Payroll data cannot be lost |

### 2.3 Accuracy

| Metric | Target | Notes |
|--------|--------|-------|
| Calculation accuracy | 100% | **Zero tolerance for pay errors** |
| Tax withholding accuracy | 100% | IRS/state penalties for errors |
| Rule extraction precision | >90% | With human review safety net |
| Rule extraction recall | >85% | Some missed rules acceptable with monitoring |

### 2.4 Scalability

| Metric | Target | Notes |
|--------|--------|-------|
| Maximum tenants | 10,000+ | Multi-tenant SaaS |
| Maximum employees per tenant | 500,000 | Enterprise support |
| Concurrent pay runs | 1,000 | Peak during common pay dates |
| Rules per jurisdiction | 10,000+ | Complex regulatory environments |
| Legal documents per month | 10,000+ | Continuous monitoring |

### 2.5 Compliance & Audit

| Metric | Target | Notes |
|--------|--------|-------|
| Audit log retention | 7 years | US regulatory requirement |
| Calculation audit trail | 100% coverage | Every number traceable to rule |
| Rule change history | Immutable | Git-like versioning |
| Human approval rate for AI rules | 100% before activation | No autonomous rule deployment |
| Compliance report generation | <1 hour | On-demand for auditors |

---

## 3. Capacity Estimations

### 3.1 Tenant & User Scale

| Metric | Year 1 | Year 3 | Year 5 | Calculation |
|--------|--------|--------|--------|-------------|
| Total Tenants | 1,000 | 5,000 | 10,000 | Growth from SMB to enterprise |
| SMB Tenants (<100 employees) | 800 | 4,000 | 8,000 | 80% of tenant base |
| Mid-Market (100-5K employees) | 180 | 900 | 1,800 | 18% of tenant base |
| Enterprise (5K+ employees) | 20 | 100 | 200 | 2% of tenant base |
| Average employees per tenant | 200 | 400 | 500 | Mix shift toward larger |
| Total employees managed | 200K | 2M | 5M | Sum across all tenants |

### 3.2 Pay Run Volume

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Pay runs per month | 50K | Avg 5 pay runs/tenant (weekly, bi-weekly, semi-monthly, monthly mix) |
| Peak pay runs per day | 10K | Month-end + bi-weekly alignment |
| Calculations per pay run (avg) | 400 | Average tenant size × 2 (preview + final) |
| Total calculations per month | 20M | 50K runs × 400 calculations |
| Peak calculations per hour | 500K | During 2-hour peak window |

### 3.3 AI Workload

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Legal documents ingested/month | 5K | Federal + 50 states + major localities |
| Rules extracted per document (avg) | 3 | Multiple rules per law section |
| AI extraction requests/month | 15K | Documents × extraction passes |
| Explanation requests/month | 5M | 25% of employees view explanations |
| Compliance Q&A queries/month | 500K | Admin and employee queries |
| Total AI inferences/month | 5.5M | Sum of above |
| Peak AI inferences/hour | 50K | During pay run periods |

### 3.4 Storage Estimations

| Data Type | Size per Unit | Volume (Year 5) | Total Storage |
|-----------|---------------|-----------------|---------------|
| Employee records | 10 KB | 5M employees | 50 GB |
| Pay calculations | 5 KB | 240M/year × 5 | 6 TB |
| Calculation lines | 500 B | 2.4B/year × 5 | 6 TB |
| Audit logs | 1 KB | 500M/year × 5 | 2.5 TB |
| Legal documents | 500 KB | 300K documents | 150 GB |
| Rule versions | 2 KB | 1M versions | 2 GB |
| Tax tables | 100 B | 50M entries | 5 GB |
| **Total** | | | **~15 TB** |

### 3.5 Jurisdiction Complexity

| Jurisdiction Type | Count | Rules per Jurisdiction | Total Rules |
|-------------------|-------|------------------------|-------------|
| Federal (US) | 1 | 500 | 500 |
| State (US) | 50 | 200 | 10,000 |
| Local (US cities, counties) | 7,000 | 50 | 350,000 |
| International countries | 160 | 300 | 48,000 |
| **Total** | **7,211** | | **~400K rules** |

---

## 4. SLOs & SLAs

### 4.1 Service Level Objectives (SLOs)

| Service | SLO | Measurement | Consequence of Miss |
|---------|-----|-------------|---------------------|
| Pay Run Completion | 99.99% complete on schedule | Pay runs finished before deadline | Regulatory violation, employee impact |
| Calculation Accuracy | 100% | Errors discovered / total calculations | Underpay/overpay, tax penalties |
| API Availability | 99.95% | Uptime excluding planned maintenance | User disruption |
| Calculation Latency (p99) | <2 seconds | Time for single gross-to-net | Poor user experience |
| Rule Update Propagation | <1 hour | Time from approval to active | Compliance gap |
| Regulatory Alert Latency | <24 hours | Time from publication to alert | Missed compliance deadline |

### 4.2 Service Level Agreements (SLAs)

| Tier | Pay Run SLA | Support Response | Uptime | Price Multiplier |
|------|-------------|------------------|--------|------------------|
| **SMB** | 99.9% | 24 hours | 99.9% | 1x |
| **Mid-Market** | 99.95% | 4 hours | 99.95% | 2x |
| **Enterprise** | 99.99% | 1 hour | 99.99% | 5x |

### 4.3 Error Budgets

| SLO | Target | Monthly Error Budget | Impact |
|-----|--------|---------------------|--------|
| 99.99% pay run | 0.01% failure | ~5 failed pay runs | 5 tenants affected |
| 99.95% API uptime | 0.05% downtime | ~22 minutes | Portal unavailable |
| 100% accuracy | 0% errors | 0 errors | Any error is critical |

---

## 5. Compliance Requirements

### 5.1 US Federal Regulations

| Regulation | Requirement | Payroll Impact | Implementation |
|------------|-------------|----------------|----------------|
| **FLSA** | Minimum wage, overtime (>40hrs = 1.5x) | Calculation rules | Overtime engine with daily/weekly tracking |
| **ACA** | Healthcare reporting for 50+ FTE | Benefits tracking | 1095-C generation, FTE calculation |
| **ERISA** | Retirement plan administration | 401k deductions | Contribution limits, vesting tracking |
| **FICA** | Social Security (6.2%), Medicare (1.45%) | Tax withholding | Wage base limits, additional Medicare |
| **FUTA** | Federal unemployment (0.6%) | Employer tax | Annual wage base tracking |
| **IRS W-4** | Withholding elections | Tax calculation | 2020+ form support, legacy handling |
| **IRS Circular E** | Withholding tables | Tax rates | Annual table updates |

### 5.2 State & Local Regulations

| Regulation Type | Count | Examples | Implementation |
|-----------------|-------|----------|----------------|
| State Income Tax | 43 states + DC | CA, NY, TX (none) | State-specific withholding formulas |
| State Unemployment | 50 states | SUTA rates vary | Experience rating, wage bases |
| Local Income Tax | 5,000+ | NYC, Philadelphia, OH cities | City/county/school district taxes |
| Paid Family Leave | 12 states | CA PFL, NY PFL, WA PFML | Contribution and benefit rules |
| State Disability | 5 states | CA SDI, NJ TDI, NY DBL | Withholding rates |
| Minimum Wage | Varies | $7.25 federal to $20+ local | Higher of federal/state/local |
| Overtime | Varies | CA daily overtime, 7th day rules | State-specific calculations |

### 5.3 International Compliance (P1)

| Region | Key Requirements | Examples |
|--------|------------------|----------|
| **EU** | GDPR, country-specific labor | Gross-to-net varies by country |
| **UK** | PAYE, National Insurance, pension auto-enrollment | Real-time information to HMRC |
| **Canada** | CPP, EI, provincial taxes | Federal + provincial withholding |
| **India** | PF, ESI, TDS, professional tax | Complex social security |
| **Australia** | PAYG, superannuation (11%) | Single Touch Payroll reporting |

### 5.4 AI-Specific Compliance

| Regulation | Requirement | Payroll Impact | Implementation |
|------------|-------------|----------------|----------------|
| **EU AI Act** | Employment AI is "high-risk" | Explainability required | Human-in-loop, decision audit trails |
| **NYC Local Law 144** | Bias audit for automated employment tools | If used for compensation decisions | Annual bias audit, public disclosure |
| **EEOC Guidance** | AI cannot discriminate in compensation | Pay equity analysis | Fairness monitoring, disparate impact checks |

### 5.5 Data Protection

| Regulation | Scope | Key Requirements | Implementation |
|------------|-------|------------------|----------------|
| **GDPR** | EU employees | Right to explanation, data minimization | Explainable AI, data residency |
| **CCPA/CPRA** | California residents | Right to delete, opt-out of sale | Data deletion workflows |
| **SOX** | Public companies | Financial controls, audit trails | Segregation of duties, immutable logs |
| **PCI-DSS** | Payment card data | If storing card data for tax payments | Tokenization (usually N/A) |

---

## 6. Constraints & Assumptions

### 6.1 Technical Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Self-hosted AI | Cannot use external AI APIs for sensitive data | GPU infrastructure required |
| Calculation determinism | Same inputs must produce identical outputs | Decimal arithmetic, no floating point |
| Audit immutability | Cannot modify historical records | Append-only data stores |
| Multi-region | Data residency requirements | Regional deployment |
| Real-time tax tables | Must have current rates | Partner integration or continuous monitoring |

### 6.2 Business Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Pay deadline criticality | Late pay is unacceptable | 99.99% SLA, disaster recovery |
| Zero tolerance accuracy | Pay errors damage trust and create liability | Extensive validation, parallel runs |
| Human approval for AI | Regulations require human oversight | Approval workflows, no autonomous rules |
| 7-year retention | Regulatory requirement for payroll records | Storage costs, archival strategy |

### 6.3 Assumptions

| Assumption | Description | Risk if Wrong |
|------------|-------------|---------------|
| Tax table availability | Certified tax tables available from partners (Symmetry, etc.) | Must build own tax research team |
| LLM capability | Current LLMs can extract payroll rules with >90% precision | Higher human effort, lower automation |
| Regulatory stability | Major regulations don't change monthly | Increased extraction workload |
| Customer adoption | Companies willing to adopt AI-assisted payroll | Slower growth, different go-to-market |

---

## 7. Out of Scope

| Item | Reason | Alternative |
|------|--------|-------------|
| Full HRIS functionality | Separate product domain | Integration with Workday, ADP, BambooHR |
| Time & Attendance hardware | Hardware business | Integration with Kronos, Deputy, etc. |
| Direct deposit processing | Banking partnership required | Integration with banks, payroll cards |
| Physical check printing | Legacy, declining | Partner with check fulfillment |
| Tax filing submission | Regulatory expertise required | Partner with tax filing providers |
| Benefits marketplace | Insurance brokerage | Integration with benefits platforms |

---

## 8. Success Metrics

### 8.1 Business Metrics

| Metric | Target (Year 1) | Target (Year 3) |
|--------|-----------------|-----------------|
| Tenant count | 1,000 | 5,000 |
| Employee count managed | 200K | 2M |
| Pay run success rate | 99.99% | 99.99% |
| Customer NPS | >50 | >60 |
| Calculation accuracy | 100% | 100% |

### 8.2 Operational Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Rule extraction accuracy | >90% | With human review |
| Time to activate new regulation | <48 hours | From detection to production |
| Support tickets per pay run | <0.1% | Low-touch operations |
| Manual rule coding | <10% | Mostly AI-extracted |
| Compliance audit pass rate | 100% | No findings |

### 8.3 AI-Specific Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Rule extraction precision | >90% | True positives / predicted positives |
| Rule extraction recall | >85% | True positives / actual positives |
| Human review turnaround | <24 hours | From extraction to approval |
| Explanation satisfaction | >4.0/5.0 | Employee rating of explanations |
| Regulatory detection latency | <24 hours | Time to alert on new law |
