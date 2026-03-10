# 14.3 AI-Native MSME Accounting & Tax Compliance Platform — Low-Level Design

## Data Models

### Journal Entry

The journal entry is the fundamental unit of financial record-keeping. Every financial event in the system is recorded as one or more journal entries, each consisting of a header and two or more line items that must balance (total debits = total credits).

```
JournalEntry:
  journal_entry_id:      string          # globally unique identifier (ULID for time-ordering)
  business_id:           string          # tenant identifier
  entry_number:          uint64          # monotonically increasing per business (human-readable)
  entry_date:            date            # accounting date (may differ from creation date)
  created_at:            datetime_us     # system timestamp of creation
  created_by:            string          # user or system service that created the entry
  entry_type:            enum[STANDARD, ADJUSTING, CLOSING, REVERSING, OPENING, RECURRING]
  source_type:           enum[BANK_FEED, INVOICE, MANUAL, RECONCILIATION, TAX_ADJUSTMENT, DEPRECIATION, SYSTEM]
  source_reference_id:   string          # ID of the source transaction/invoice/reconciliation
  narration:             string          # human-readable description of the transaction
  status:                enum[DRAFT, POSTED, REVERSED, VOID]
  reversal_of:           string          # journal_entry_id of the entry being reversed (null if not a reversal)
  reversed_by:           string          # journal_entry_id of the reversing entry (null if not reversed)
  fiscal_year:           string          # e.g., "2025-26"
  fiscal_period:         int             # month number within fiscal year (1-12)
  currency:              string          # ISO 4217 currency code
  exchange_rate:         float64         # rate to base currency (1.0 for base currency transactions)
  tags:                  list[string]    # user-defined tags for filtering
  attachments:           list[string]    # references to supporting documents in document store
  audit_hash:            string          # SHA-256 hash of entry content + previous entry's hash
  previous_hash:         string          # hash of the preceding journal entry (Merkle chain)

JournalEntryLine:
  line_id:               string          # unique within the journal entry
  journal_entry_id:      string          # parent journal entry
  account_id:            string          # chart of accounts reference
  account_code:          string          # denormalized for fast display (e.g., "4100")
  account_name:          string          # denormalized (e.g., "Sales Revenue - Domestic")
  debit_amount:          decimal(18,4)   # debit amount (0 if credit line)
  credit_amount:         decimal(18,4)   # credit amount (0 if debit line)
  base_currency_amount:  decimal(18,4)   # amount in base currency (for multi-currency)
  tax_component:         enum[NONE, CGST, SGST, IGST, CESS, VAT, SALES_TAX, TDS, TCS]
  tax_rate:              decimal(5,2)    # applicable tax rate (e.g., 9.00 for 9% CGST)
  hsn_sac_code:          string          # HSN/SAC code for tax-relevant lines
  cost_center:           string          # optional cost center for management accounting
  counterparty_id:       string          # resolved counterparty entity
  reconciliation_id:     string          # bank reconciliation reference (null if not reconciled)
  narration:             string          # line-level description
```

### Chart of Accounts

The chart of accounts defines the hierarchical structure of all accounts for a business entity, serving as the backbone of the general ledger.

```
ChartOfAccounts:
  account_id:            string          # globally unique account identifier
  business_id:           string          # tenant identifier
  account_code:          string          # hierarchical code (e.g., "4100", "4110", "4111")
  account_name:          string          # human-readable name
  account_type:          enum[ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE]
  sub_type:              enum[CURRENT_ASSET, FIXED_ASSET, CURRENT_LIABILITY, LONG_TERM_LIABILITY,
                              SHARE_CAPITAL, RESERVES, DIRECT_INCOME, INDIRECT_INCOME,
                              COST_OF_GOODS, DIRECT_EXPENSE, INDIRECT_EXPENSE, DEPRECIATION]
  parent_account_id:     string          # parent in hierarchy (null for top-level groups)
  level:                 int             # depth in hierarchy (0 = group, 1 = sub-group, 2 = account, 3 = sub-account)
  is_group:              boolean         # true for group accounts (cannot have direct postings)
  normal_balance:        enum[DEBIT, CREDIT]  # expected balance direction
  tax_treatment:         enum[TAXABLE, EXEMPT, ZERO_RATED, NIL_RATED, NON_GST, REVERSE_CHARGE]
  hsn_sac_default:       string          # default HSN/SAC code for transactions to this account
  gst_rate_default:      decimal(5,2)    # default GST rate
  is_bank_account:       boolean         # true for accounts linked to bank feeds
  bank_account_number:   string          # linked bank account (for reconciliation)
  is_system_account:     boolean         # true for system-managed accounts (e.g., GST payable)
  is_active:             boolean         # false for deactivated accounts
  opening_balance:       decimal(18,4)   # balance at start of current fiscal year
  created_at:            datetime
  modified_at:           datetime
  industry_template_id:  string          # reference to the industry template used at creation
```

### Invoice

The invoice model represents both outward (sales) and inward (purchase) invoices, with full GST compliance fields for e-invoicing.

```
Invoice:
  invoice_id:            string          # globally unique identifier
  business_id:           string          # tenant identifier
  invoice_number:        string          # sequential number per business (regulatory requirement)
  invoice_type:          enum[SALES, PURCHASE, DEBIT_NOTE, CREDIT_NOTE, EXPORT, SEZ_SUPPLY]
  direction:             enum[OUTWARD, INWARD]
  status:                enum[DRAFT, APPROVED, E_INVOICED, DISPATCHED, PAID, PARTIALLY_PAID, CANCELLED, VOID]

  # Party details
  supplier_gstin:        string          # supplier's GSTIN (15-char)
  supplier_name:         string
  supplier_address:      Address         # structured address with state code
  buyer_gstin:           string          # buyer's GSTIN
  buyer_name:            string
  buyer_address:         Address
  place_of_supply:       string          # state code determining IGST vs. CGST+SGST

  # Dates
  invoice_date:          date
  due_date:              date
  supply_date:           date            # date of supply for GST purposes
  filing_period:         string          # GSTR-1 period this invoice belongs to (e.g., "202601")

  # Amounts
  sub_total:             decimal(18,4)   # sum of line item amounts before tax
  total_cgst:            decimal(18,4)
  total_sgst:            decimal(18,4)
  total_igst:            decimal(18,4)
  total_cess:            decimal(18,4)
  total_tds:             decimal(18,4)   # TDS deducted
  total_tcs:             decimal(18,4)   # TCS collected
  discount_amount:       decimal(18,4)
  round_off:             decimal(18,4)
  total_amount:          decimal(18,4)   # final payable amount

  # E-invoicing
  irn:                   string          # Invoice Reference Number from IRP
  irn_generated_at:      datetime
  irn_status:            enum[PENDING, GENERATED, CANCELLED, NOT_APPLICABLE]
  qr_code_data:          string          # signed QR code string
  ack_number:            string          # IRP acknowledgment number
  ack_date:              datetime

  # Payment tracking
  amount_paid:           decimal(18,4)
  amount_outstanding:    decimal(18,4)
  payment_status:        enum[UNPAID, PARTIALLY_PAID, FULLY_PAID, OVERDUE]

  # OCR metadata (for inward invoices)
  ocr_extraction_id:     string          # reference to OCR extraction job
  ocr_confidence:        float64         # overall extraction confidence
  ocr_human_verified:    boolean         # whether a human verified the extraction

  # Audit
  journal_entry_id:      string          # journal entry recording this invoice
  created_at:            datetime
  modified_at:           datetime
  created_by:            string

InvoiceLineItem:
  line_item_id:          string
  invoice_id:            string
  line_number:           int
  description:           string
  hsn_sac_code:          string          # 4-8 digit HSN/SAC code
  quantity:              decimal(18,4)
  unit:                  string          # UQC (unit quantity code)
  unit_price:            decimal(18,4)
  discount_rate:         decimal(5,2)
  discount_amount:       decimal(18,4)
  taxable_amount:        decimal(18,4)   # after discount
  cgst_rate:             decimal(5,2)
  cgst_amount:           decimal(18,4)
  sgst_rate:             decimal(5,2)
  sgst_amount:           decimal(18,4)
  igst_rate:             decimal(5,2)
  igst_amount:           decimal(18,4)
  cess_rate:             decimal(5,2)
  cess_amount:           decimal(18,4)
  total_amount:          decimal(18,4)
  account_id:            string          # chart of accounts entry for this line item
```

### Bank Transaction

The normalized bank transaction model represents any financial movement detected from bank feeds or statement uploads.

```
BankTransaction:
  transaction_id:        string          # globally unique
  business_id:           string
  bank_account_id:       string          # reference to chart of accounts bank account
  source:                enum[OPEN_BANKING_API, STATEMENT_UPLOAD_CSV, STATEMENT_UPLOAD_PDF, STATEMENT_UPLOAD_MT940, MANUAL]

  # Core transaction data
  transaction_date:      date            # date as per bank
  value_date:            date            # value date (for interest calculation)
  narration:             string          # raw bank narration text
  reference_number:      string          # bank reference / UTR / cheque number
  amount:                decimal(18,4)   # positive for credit, negative for debit
  direction:             enum[CREDIT, DEBIT]
  running_balance:       decimal(18,4)   # balance after this transaction
  currency:              string

  # Enrichment (populated by categorization engine)
  counterparty_id:       string          # resolved counterparty entity
  counterparty_name:     string          # extracted or resolved name
  payment_mode:          enum[NEFT, RTGS, IMPS, UPI, CHEQUE, CASH_DEPOSIT, CASH_WITHDRAWAL, STANDING_INSTRUCTION, CARD, OTHER]
  categorization:
    account_id:          string          # mapped chart of accounts entry
    confidence:          float64         # ML confidence score
    method:              enum[ML_AUTO, ML_CONFIRMED, USER_MANUAL, RULE_BASED]
    categorized_at:      datetime

  # Reconciliation
  reconciliation_status: enum[UNRECONCILED, AUTO_RECONCILED, MANUALLY_RECONCILED, EXCLUDED]
  reconciliation_id:     string          # link to reconciliation match record
  reconciled_at:         datetime

  # Deduplication
  dedup_hash:            string          # hash of (bank_account, date, amount, narration, reference) for dedup
  ingested_at:           datetime
  ingested_from:         string          # source identifier (API connection ID or upload batch ID)
```

### Tax Rule

The externalized tax rule model encodes tax computation logic as a DAG of conditions and rates.

```
TaxRule:
  rule_id:               string          # globally unique
  jurisdiction:          enum[IN_GST, EU_VAT, US_SALES_TAX]
  rule_type:             enum[RATE, EXEMPTION, REVERSE_CHARGE, COMPOSITION, TCS, TDS, CESS, THRESHOLD]

  # Conditions (evaluated as AND)
  conditions:
    hsn_sac_codes:       list[string]    # applicable HSN/SAC codes (empty = all)
    supply_type:         enum[B2B, B2C, EXPORT, SEZ, DEEMED_EXPORT, NIL_RATED, EXEMPT]  # (null = all)
    source_state:        string          # supplier's state code (null = all)
    destination_state:   string          # buyer's state code (null = all)
    same_state:          boolean         # true = intra-state, false = inter-state (null = either)
    business_scheme:     enum[REGULAR, COMPOSITION]  # (null = all)
    turnover_threshold:  decimal(18,4)   # applicable above/below this turnover (null = no threshold)
    threshold_direction: enum[ABOVE, BELOW]
    buyer_type:          enum[REGISTERED, UNREGISTERED, SEZ, GOVERNMENT, EMBASSY]  # (null = all)

  # Outcome
  rate:                  decimal(5,2)    # tax rate percentage
  rate_components:                       # breakdown for GST
    cgst_rate:           decimal(5,2)
    sgst_rate:           decimal(5,2)
    igst_rate:           decimal(5,2)
    cess_rate:           decimal(5,2)
    cess_fixed:          decimal(18,4)   # fixed cess amount per unit (for specific goods)
  itc_eligible:          boolean         # whether input tax credit can be claimed
  reverse_charge:        boolean         # whether reverse charge applies

  # Versioning
  effective_from:        date            # rule active from this date
  effective_to:          date            # rule active until this date (null = no end)
  version:               int
  supersedes_rule_id:    string          # previous version of this rule
  created_by:            string          # tax consultant who created the rule
  approved_by:           string          # approver
  approved_at:           datetime
```

### Reconciliation Match

The reconciliation match model captures the result of matching bank transactions to ledger entries.

```
ReconciliationMatch:
  match_id:              string          # globally unique
  business_id:           string
  bank_account_id:       string
  reconciliation_run_id: string          # the batch reconciliation run that produced this match
  match_type:            enum[EXACT_1_1, REFERENCE_MATCH, AGGREGATE_1_N, AGGREGATE_N_1, AGGREGATE_N_M, ML_SUGGESTED, USER_MANUAL]

  bank_transaction_ids:  list[string]    # one or more bank transactions in this match
  journal_entry_ids:     list[string]    # one or more journal entries in this match

  bank_total:            decimal(18,4)   # sum of bank transaction amounts in this match
  ledger_total:          decimal(18,4)   # sum of journal entry amounts in this match
  difference:            decimal(18,4)   # bank_total - ledger_total (e.g., bank charges)
  difference_account_id: string          # account to post the difference (e.g., bank charges expense)

  confidence:            float64         # match confidence score (1.0 for exact, lower for ML)
  match_features:                        # features that drove the match
    amount_match:        boolean
    date_within_window:  boolean
    reference_match:     float64         # fuzzy match score for reference number
    counterparty_match:  float64         # entity resolution match score
    historical_pattern:  boolean         # matches a previously confirmed pattern

  status:                enum[PROPOSED, CONFIRMED, REJECTED, AUTO_CONFIRMED]
  confirmed_by:          string          # user who confirmed (null for auto-confirmed)
  confirmed_at:          datetime
  created_at:            datetime
```

### GST Return

The GST return model tracks the preparation and filing status of all GST returns.

```
GSTReturn:
  return_id:             string          # globally unique
  business_id:           string
  gstin:                 string          # GSTIN for this return
  return_type:           enum[GSTR1, GSTR3B, GSTR9, GSTR2B_RECON, CMP08]
  filing_period:         string          # e.g., "202601" for January 2026
  filing_frequency:      enum[MONTHLY, QUARTERLY]

  # Return data (pre-computed continuously)
  data_snapshot_version: uint64          # version of the pre-computed return data
  last_data_update:      datetime        # when the return data was last refreshed

  # GSTR-1 specific
  b2b_invoices_count:    int             # B2B invoices with GSTIN
  b2c_large_count:       int             # B2C invoices > ₹2.5L
  b2c_small_total:       decimal(18,4)   # aggregate of small B2C invoices
  export_invoices_count: int
  credit_notes_count:    int
  debit_notes_count:     int
  nil_rated_total:       decimal(18,4)
  advance_received:      decimal(18,4)
  advance_adjusted:      decimal(18,4)

  # GSTR-3B specific
  outward_taxable:       decimal(18,4)   # total outward taxable supplies
  outward_igst:          decimal(18,4)
  outward_cgst:          decimal(18,4)
  outward_sgst:          decimal(18,4)
  outward_cess:          decimal(18,4)
  itc_igst:              decimal(18,4)   # eligible input tax credit
  itc_cgst:              decimal(18,4)
  itc_sgst:              decimal(18,4)
  itc_cess:              decimal(18,4)
  net_tax_payable:       decimal(18,4)   # after ITC set-off

  # ITC Reconciliation
  itc_matched_count:     int             # invoices matched with GSTR-2B
  itc_unmatched_count:   int             # invoices not found in GSTR-2B
  itc_mismatch_count:    int             # invoices with amount/rate mismatches
  itc_at_risk:           decimal(18,4)   # ITC amount where supplier hasn't filed

  # Filing status
  filing_status:         enum[NOT_STARTED, DATA_READY, UNDER_REVIEW, SUBMITTED, ACKNOWLEDGED, FILED, FAILED, REVISED]
  submitted_at:          datetime
  acknowledgment_number: string
  acknowledgment_date:   datetime
  filing_attempts:       int
  last_error:            string          # error from government portal if filing failed

  # Deadline tracking
  due_date:              date
  is_overdue:            boolean
  penalty_applicable:    boolean
  late_fee:              decimal(18,4)
```

### Counterparty

The counterparty model represents resolved business entities that the MSME transacts with.

```
Counterparty:
  counterparty_id:       string          # globally unique
  business_id:           string          # tenant
  name:                  string          # primary name
  aliases:               list[string]    # alternative names, abbreviations, bank narration variants
  gstin:                 string          # counterparty's GSTIN (null if unregistered)
  pan:                   string          # PAN number
  entity_type:           enum[BUSINESS, INDIVIDUAL, GOVERNMENT, BANK, UTILITY]
  relationship:          enum[CUSTOMER, SUPPLIER, BOTH, EMPLOYEE, GOVERNMENT, BANK, OTHER]

  # Contact details
  email:                 string
  phone:                 string
  address:               Address

  # Accounting defaults
  default_account_id:    string          # default chart of accounts entry for transactions
  default_tax_treatment: enum[TAXABLE, EXEMPT, REVERSE_CHARGE, COMPOSITION]
  credit_period_days:    int             # standard credit terms
  credit_limit:          decimal(18,4)

  # Bank narration patterns (for reconciliation)
  narration_patterns:    list[string]    # regex patterns that match this counterparty in bank statements
  bank_references:       list[string]    # known bank reference number patterns

  # Compliance
  gst_filing_status:     enum[ACTIVE, SUSPENDED, CANCELLED, UNKNOWN]
  last_gst_status_check: datetime
  tds_applicable:        boolean
  tds_section:           string          # TDS section code (e.g., "194C")
  tds_rate:              decimal(5,2)

  # Statistics
  total_transactions:    int
  total_revenue:         decimal(18,4)   # total revenue from this counterparty
  total_expense:         decimal(18,4)   # total expense to this counterparty
  last_transaction_date: date
  created_at:            datetime
  modified_at:           datetime
```

### Audit Log Entry

```
AuditLogEntry:
  log_id:                string          # globally unique
  business_id:           string
  timestamp:             datetime_us     # microsecond precision
  actor_id:              string          # user or system service
  actor_type:            enum[USER, SYSTEM, CA, AUDITOR]
  action:                enum[CREATE, UPDATE, DELETE, REVERSE, APPROVE, REJECT, FILE, VIEW, EXPORT]
  entity_type:           enum[JOURNAL_ENTRY, INVOICE, BANK_TRANSACTION, RECONCILIATION, GST_RETURN, CHART_OF_ACCOUNTS, COUNTERPARTY, SETTINGS]
  entity_id:             string
  before_state:          json            # serialized state before the action (null for CREATE)
  after_state:           json            # serialized state after the action (null for DELETE)
  change_summary:        string          # human-readable summary of the change
  reason:                string          # reason for the change (required for reversals and deletions)
  ip_address:            string
  device_info:           string
  session_id:            string
  hash:                  string          # SHA-256(content + previous_hash)
  previous_hash:         string          # hash of the preceding audit log entry
```

---

## API Contracts

### 1. Create Journal Entry

```
POST /api/v1/businesses/{business_id}/journal-entries

Request:
{
  "entry_date": "2026-01-15",
  "narration": "Office rent payment for January 2026",
  "source_type": "MANUAL",
  "lines": [
    {
      "account_code": "5100",
      "debit_amount": 50000.00,
      "credit_amount": 0,
      "narration": "Rent Expense - Office"
    },
    {
      "account_code": "5100",
      "debit_amount": 4500.00,
      "credit_amount": 0,
      "tax_component": "CGST",
      "tax_rate": 9.00,
      "narration": "CGST on rent under reverse charge"
    },
    {
      "account_code": "5100",
      "debit_amount": 4500.00,
      "credit_amount": 0,
      "tax_component": "SGST",
      "tax_rate": 9.00,
      "narration": "SGST on rent under reverse charge"
    },
    {
      "account_code": "1200",
      "debit_amount": 0,
      "credit_amount": 50000.00,
      "narration": "Payment from bank account"
    },
    {
      "account_code": "2310",
      "debit_amount": 0,
      "credit_amount": 4500.00,
      "narration": "CGST payable under reverse charge"
    },
    {
      "account_code": "2320",
      "debit_amount": 0,
      "credit_amount": 4500.00,
      "narration": "SGST payable under reverse charge"
    }
  ],
  "tags": ["rent", "reverse-charge"],
  "attachments": ["doc_abc123"]
}

Response (201 Created):
{
  "journal_entry_id": "je_2026011500001",
  "entry_number": 1547,
  "status": "POSTED",
  "total_debit": 59000.00,
  "total_credit": 59000.00,
  "balanced": true,
  "audit_hash": "sha256:a1b2c3d4...",
  "created_at": "2026-01-15T10:30:00.000Z"
}

Error (400 Bad Request — unbalanced entry):
{
  "error": "UNBALANCED_ENTRY",
  "message": "Total debits (59000.00) do not equal total credits (58500.00). Difference: 500.00",
  "debit_total": 59000.00,
  "credit_total": 58500.00
}
```

### 2. Categorize Bank Transaction

```
POST /api/v1/businesses/{business_id}/transactions/{transaction_id}/categorize

Request:
{
  "override_category": null,  // null = use ML categorization; set to account_code to override
  "generate_journal_entry": true
}

Response (200 OK):
{
  "transaction_id": "txn_abc123",
  "categorization": {
    "account_id": "acc_5200",
    "account_code": "5200",
    "account_name": "Telephone & Internet Expense",
    "confidence": 0.94,
    "method": "ML_AUTO",
    "alternative_suggestions": [
      {"account_code": "5210", "account_name": "Mobile Recharge", "confidence": 0.82},
      {"account_code": "5100", "account_name": "Utility Expenses", "confidence": 0.71}
    ],
    "reasoning": "Matched counterparty 'AIRTEL BROADBAND' with 94% confidence. Previous 11 transactions from this counterparty were categorized as Telephone & Internet Expense."
  },
  "journal_entry": {
    "journal_entry_id": "je_2026011500002",
    "lines": [
      {"account_code": "5200", "debit": 1499.00, "narration": "Telephone & Internet Expense"},
      {"account_code": "2310", "debit": 134.91, "narration": "CGST Input Credit"},
      {"account_code": "2320", "debit": 134.91, "narration": "SGST Input Credit"},
      {"account_code": "1200", "credit": 1768.82, "narration": "Bank payment"}
    ]
  }
}
```

### 3. Create Invoice with E-Invoicing

```
POST /api/v1/businesses/{business_id}/invoices

Request:
{
  "invoice_type": "SALES",
  "buyer_gstin": "29AABCT1332L1ZD",
  "buyer_name": "Acme Trading Co.",
  "buyer_address": {
    "line1": "123 MG Road",
    "city": "Bangalore",
    "state_code": "29",
    "pin_code": "560001"
  },
  "place_of_supply": "29",
  "invoice_date": "2026-01-15",
  "due_date": "2026-02-14",
  "line_items": [
    {
      "description": "Web Development Services",
      "hsn_sac_code": "998314",
      "quantity": 1,
      "unit": "NOS",
      "unit_price": 100000.00,
      "discount_rate": 0
    }
  ],
  "generate_e_invoice": true
}

Response (201 Created):
{
  "invoice_id": "inv_2026011500001",
  "invoice_number": "INV/2025-26/0547",
  "status": "E_INVOICED",
  "sub_total": 100000.00,
  "cgst": 9000.00,
  "sgst": 9000.00,
  "igst": 0,
  "total": 118000.00,
  "e_invoice": {
    "irn": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4",
    "ack_number": "1234567890",
    "ack_date": "2026-01-15T10:35:00.000Z",
    "qr_code": "eyJ...",
    "status": "GENERATED"
  },
  "journal_entry_id": "je_2026011500003",
  "pdf_url": "/api/v1/invoices/inv_2026011500001/pdf"
}
```

### 4. Run Bank Reconciliation

```
POST /api/v1/businesses/{business_id}/reconciliations

Request:
{
  "bank_account_id": "acc_1200",
  "period_from": "2026-01-01",
  "period_to": "2026-01-31",
  "auto_confirm_threshold": 0.95,  // auto-confirm matches above this confidence
  "include_previously_unmatched": true
}

Response (200 OK):
{
  "reconciliation_id": "recon_202601_001",
  "summary": {
    "bank_transactions_count": 487,
    "ledger_entries_count": 412,
    "auto_matched": 398,
    "auto_match_rate": 0.817,
    "suggested_matches": 52,
    "unmatched_bank": 37,
    "unmatched_ledger": 14,
    "bank_closing_balance": 2345678.90,
    "ledger_closing_balance": 2341234.56,
    "difference": 4444.34,
    "difference_explained_by": [
      {"type": "bank_charges", "amount": -1234.00, "count": 23},
      {"type": "timing_difference", "amount": 5678.34, "count": 5}
    ]
  },
  "matches": [
    {
      "match_id": "match_001",
      "match_type": "EXACT_1_1",
      "confidence": 1.0,
      "bank_transaction": {"id": "txn_001", "amount": 50000.00, "date": "2026-01-05", "narration": "NEFT CR ACME TRADING"},
      "ledger_entry": {"id": "je_001", "amount": 50000.00, "date": "2026-01-05", "narration": "Invoice INV-0421 payment"},
      "status": "AUTO_CONFIRMED"
    },
    {
      "match_id": "match_002",
      "match_type": "AGGREGATE_1_N",
      "confidence": 0.88,
      "bank_transaction": {"id": "txn_042", "amount": 175000.00, "date": "2026-01-18", "narration": "NEFT CR BETA CORP"},
      "ledger_entries": [
        {"id": "je_089", "amount": 100000.00, "narration": "Invoice INV-0430"},
        {"id": "je_091", "amount": 75000.00, "narration": "Invoice INV-0432"}
      ],
      "status": "PROPOSED"
    }
  ],
  "unmatched_bank_transactions": [
    {"id": "txn_099", "amount": -5.90, "narration": "IMPS CHARGES", "suggestion": "Categorize as Bank Charges (account 5500)"}
  ]
}
```

### 5. Compute Tax for Transaction

```
POST /api/v1/businesses/{business_id}/tax/compute

Request:
{
  "supply_type": "B2B",
  "supplier_gstin": "27AABCT1332L1ZD",
  "supplier_state": "27",
  "buyer_gstin": "29AABCT1332L1ZD",
  "buyer_state": "29",
  "place_of_supply": "29",
  "business_scheme": "REGULAR",
  "line_items": [
    {
      "hsn_sac_code": "998314",
      "taxable_amount": 100000.00,
      "is_service": true
    },
    {
      "hsn_sac_code": "8471",
      "taxable_amount": 50000.00,
      "is_service": false
    }
  ]
}

Response (200 OK):
{
  "computation_id": "tax_comp_001",
  "supply_classification": "INTER_STATE",
  "line_items": [
    {
      "hsn_sac_code": "998314",
      "taxable_amount": 100000.00,
      "igst_rate": 18.00,
      "igst_amount": 18000.00,
      "cgst_rate": 0,
      "sgst_rate": 0,
      "cess_rate": 0,
      "total_tax": 18000.00,
      "itc_eligible": true,
      "reverse_charge": false,
      "rule_applied": "rule_gst_sac_998314_interstate"
    },
    {
      "hsn_sac_code": "8471",
      "taxable_amount": 50000.00,
      "igst_rate": 18.00,
      "igst_amount": 9000.00,
      "cgst_rate": 0,
      "sgst_rate": 0,
      "cess_rate": 0,
      "total_tax": 9000.00,
      "itc_eligible": true,
      "reverse_charge": false,
      "rule_applied": "rule_gst_hsn_8471_interstate"
    }
  ],
  "total_tax_summary": {
    "total_igst": 27000.00,
    "total_cgst": 0,
    "total_sgst": 0,
    "total_cess": 0,
    "grand_total_tax": 27000.00
  },
  "computation_timestamp": "2026-01-15T10:40:00.000Z",
  "rules_version": "2026-01-01-v3"
}
```

### 6. File GST Return

```
POST /api/v1/businesses/{business_id}/gst-returns/{return_id}/file

Request:
{
  "return_type": "GSTR1",
  "filing_period": "202601",
  "authorized_signatory": "user_001",
  "digital_signature_mode": "DSC",  // or "EVC" (electronic verification code)
  "priority": "NORMAL"  // or "URGENT" for deadline-proximate filings
}

Response (202 Accepted):
{
  "filing_job_id": "filing_202601_gstr1_001",
  "status": "QUEUED",
  "queue_position": 1247,
  "estimated_completion": "2026-02-11T08:30:00.000Z",
  "return_summary": {
    "total_invoices": 847,
    "total_taxable_value": 12500000.00,
    "total_igst": 1125000.00,
    "total_cgst": 562500.00,
    "total_sgst": 562500.00,
    "total_cess": 0
  },
  "pre_filing_validation": {
    "passed": true,
    "warnings": [
      "3 invoices have HSN codes with recent rate changes. Verify correct rate applied.",
      "GSTR-2B reconciliation shows 5 unmatched inward invoices totaling ₹45,000 ITC."
    ],
    "errors": []
  }
}

// Poll filing status
GET /api/v1/businesses/{business_id}/filing-jobs/{filing_job_id}

Response (200 OK):
{
  "filing_job_id": "filing_202601_gstr1_001",
  "status": "FILED",
  "acknowledgment_number": "AA2702260100001234",
  "filed_at": "2026-02-11T08:28:00.000Z",
  "filing_attempts": 2,
  "attempt_log": [
    {"attempt": 1, "timestamp": "2026-02-11T08:25:00Z", "result": "PORTAL_TIMEOUT", "error": "GST portal returned HTTP 503"},
    {"attempt": 2, "timestamp": "2026-02-11T08:28:00Z", "result": "SUCCESS"}
  ]
}
```

### 7. Extract Invoice via OCR

```
POST /api/v1/businesses/{business_id}/ocr/extract

Request (multipart/form-data):
{
  "file": <invoice_image.pdf>,
  "document_type": "PURCHASE_INVOICE",
  "auto_create_entry": false
}

Response (200 OK):
{
  "extraction_id": "ocr_ext_001",
  "overall_confidence": 0.93,
  "extracted_data": {
    "vendor_name": {"value": "Global Supplies Pvt Ltd", "confidence": 0.97},
    "vendor_gstin": {"value": "27AADCG1234L1ZQ", "confidence": 0.99},
    "invoice_number": {"value": "GS/2025-26/1847", "confidence": 0.95},
    "invoice_date": {"value": "2026-01-10", "confidence": 0.98},
    "line_items": [
      {
        "description": {"value": "Office Stationery", "confidence": 0.91},
        "hsn_code": {"value": "4820", "confidence": 0.88},
        "quantity": {"value": 10, "confidence": 0.95},
        "unit_price": {"value": 500.00, "confidence": 0.96},
        "amount": {"value": 5000.00, "confidence": 0.97}
      }
    ],
    "sub_total": {"value": 5000.00, "confidence": 0.97},
    "cgst": {"value": 450.00, "confidence": 0.96},
    "sgst": {"value": 450.00, "confidence": 0.96},
    "total": {"value": 5900.00, "confidence": 0.98}
  },
  "validation": {
    "line_items_sum_matches_subtotal": true,
    "tax_computation_matches": true,
    "gstin_format_valid": true,
    "gstin_active": true
  },
  "low_confidence_fields": ["line_items[0].hsn_code"],
  "suggested_account": {"code": "5300", "name": "Office Supplies", "confidence": 0.89}
}
```

### 8. Generate Financial Report

```
POST /api/v1/businesses/{business_id}/reports/generate

Request:
{
  "report_type": "PROFIT_AND_LOSS",
  "period_from": "2025-04-01",
  "period_to": "2026-03-31",
  "comparative_period": {
    "period_from": "2024-04-01",
    "period_to": "2025-03-31"
  },
  "accounting_standard": "IND_AS",
  "include_notes": true,
  "include_schedules": true,
  "format": "PDF"
}

Response (200 OK):
{
  "report_id": "rpt_pl_202526",
  "report_type": "PROFIT_AND_LOSS",
  "generated_at": "2026-03-15T14:00:00.000Z",
  "summary": {
    "total_revenue": 15000000.00,
    "total_expenses": 12500000.00,
    "profit_before_tax": 2500000.00,
    "tax_provision": 625000.00,
    "net_profit": 1875000.00,
    "previous_period_net_profit": 1500000.00,
    "growth_percentage": 25.0
  },
  "adjustments_applied": [
    {"type": "DEPRECIATION", "amount": 150000.00, "description": "Annual depreciation on fixed assets"},
    {"type": "ACCRUAL", "amount": 45000.00, "description": "Accrued expenses for Q4"},
    {"type": "PREPAYMENT", "amount": -30000.00, "description": "Insurance prepayment amortization"}
  ],
  "pdf_url": "/api/v1/reports/rpt_pl_202526/pdf",
  "excel_url": "/api/v1/reports/rpt_pl_202526/excel",
  "drill_down_available": true
}
```

---

## Core Algorithms

### Algorithm 1: Hierarchical Transaction Categorization

```
FUNCTION CategorizeTransaction(transaction, business_context):
    // Stage 1: Entity Resolution — identify the counterparty
    counterparty = ResolveCounterparty(transaction.narration, transaction.amount, business_context)

    // Stage 2: Check for exact historical match
    IF counterparty.id IS NOT NULL:
        historical = GetHistoricalCategorizations(business_context.id, counterparty.id)
        IF historical.count >= 3 AND historical.consistency >= 0.9:
            // Same counterparty categorized consistently 90%+ of the time
            category = historical.dominant_category
            confidence = historical.consistency * 0.95  // slight discount
            RETURN CategoryResult(category, confidence, method="HISTORICAL_MATCH")

    // Stage 3: Hierarchical ML classification
    features = ExtractFeatures(transaction, business_context)
    // Features include:
    //   - narration_tokens: TF-IDF of narration text (bank-specific tokenization)
    //   - amount_pattern: normalized amount, is_round_number, recurring_amount_flag
    //   - temporal: day_of_month, day_of_week, is_month_end, is_quarter_end
    //   - counterparty: resolved entity type, industry, relationship
    //   - business: industry_code, size_tier, previous_month_categories distribution

    // Level 1: Account type classification (5 classes)
    account_type = AccountTypeClassifier.predict(features)
    // Classes: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE

    // Level 2: Account group classification (conditioned on type)
    account_group = AccountGroupClassifier[account_type].predict(features)
    // Example for EXPENSE: COST_OF_GOODS, RENT, UTILITIES, SALARY, MARKETING, etc.

    // Level 3: Specific account classification (conditioned on group)
    specific_account = SpecificAccountClassifier[account_group].predict(features)

    // Stage 4: Business-specific fine-tuning
    business_prior = GetBusinessPrior(business_context.id, specific_account)
    adjusted_confidence = BayesianUpdate(
        global_posterior=specific_account.confidence,
        business_prior=business_prior
    )

    // Stage 5: Consistency enforcement
    IF IsRecurring(transaction, business_context):
        // Ensure recurring transactions from same source are categorized identically
        previous = GetPreviousRecurrenceCategory(transaction, business_context)
        IF previous IS NOT NULL AND previous != specific_account:
            // Conflict: ML says one thing, but we previously categorized differently
            IF previous.user_confirmed:
                specific_account = previous  // user-confirmed category takes precedence
                adjusted_confidence = 0.95

    // Stage 6: Tax component extraction
    tax_info = ExtractTaxComponents(transaction, specific_account, business_context)

    RETURN CategoryResult(
        account=specific_account,
        confidence=adjusted_confidence,
        tax_components=tax_info,
        method="ML_HIERARCHICAL",
        needs_review=(adjusted_confidence < REVIEW_THRESHOLD)
    )
```

### Algorithm 2: Multi-Attribute Bank Reconciliation Matching

```
FUNCTION ReconcileBankAccount(bank_transactions, ledger_entries, business_context):
    unmatched_bank = Copy(bank_transactions)
    unmatched_ledger = Copy(ledger_entries)
    matches = []

    // === STAGE 1: Exact Match ===
    // Match by amount + date (within settlement window) + reference number
    FOR EACH bank_txn IN unmatched_bank:
        FOR EACH ledger_entry IN unmatched_ledger:
            IF ExactAmountMatch(bank_txn.amount, ledger_entry.amount)
               AND DateWithinWindow(bank_txn.date, ledger_entry.date, SETTLEMENT_WINDOW_DAYS=3)
               AND ReferenceMatch(bank_txn.reference, ledger_entry.reference) > 0.9:
                matches.append(Match(
                    type=EXACT_1_1,
                    bank=[bank_txn],
                    ledger=[ledger_entry],
                    confidence=1.0
                ))
                unmatched_bank.remove(bank_txn)
                unmatched_ledger.remove(ledger_entry)
                BREAK

    // === STAGE 2: Reference-Guided Match ===
    // Match by reference number even if amounts differ (bank charges, TDS deductions)
    FOR EACH bank_txn IN unmatched_bank:
        FOR EACH ledger_entry IN unmatched_ledger:
            IF ReferenceMatch(bank_txn.reference, ledger_entry.reference) > 0.8:
                difference = ABS(bank_txn.amount - ledger_entry.amount)
                IF difference <= MAX_CHARGE_THRESHOLD:
                    // Difference is likely bank charges, TDS, or rounding
                    charge_account = IdentifyChargeAccount(difference, bank_txn, business_context)
                    matches.append(Match(
                        type=REFERENCE_MATCH,
                        bank=[bank_txn],
                        ledger=[ledger_entry],
                        difference=difference,
                        difference_account=charge_account,
                        confidence=0.90
                    ))
                    unmatched_bank.remove(bank_txn)
                    unmatched_ledger.remove(ledger_entry)
                    BREAK

    // === STAGE 3: Aggregate Match (1:N and N:1) ===
    // Search for subsets of ledger entries that sum to a bank transaction amount
    FOR EACH bank_txn IN unmatched_bank:
        IF ABS(bank_txn.amount) > AGGREGATE_THRESHOLD:
            // Find subset of ledger entries within date window whose sum matches bank amount
            candidates = FilterByDateWindow(unmatched_ledger, bank_txn.date, SETTLEMENT_WINDOW_DAYS=5)
            candidates = FilterBySameDirection(candidates, bank_txn.direction)

            // Use dynamic programming subset-sum with tolerance
            subset = SubsetSumWithTolerance(
                candidates,
                target=ABS(bank_txn.amount),
                tolerance=AMOUNT_TOLERANCE,
                max_subset_size=10  // limit search space
            )

            IF subset IS NOT NULL:
                matches.append(Match(
                    type=AGGREGATE_1_N,
                    bank=[bank_txn],
                    ledger=subset,
                    confidence=ComputeAggregateConfidence(bank_txn, subset)
                ))
                unmatched_bank.remove(bank_txn)
                FOR EACH entry IN subset:
                    unmatched_ledger.remove(entry)

    // Reverse: find subsets of bank transactions matching a single ledger entry
    FOR EACH ledger_entry IN unmatched_ledger:
        candidates = FilterByDateWindow(unmatched_bank, ledger_entry.date, SETTLEMENT_WINDOW_DAYS=7)
        subset = SubsetSumWithTolerance(candidates, ABS(ledger_entry.amount), AMOUNT_TOLERANCE, 5)
        IF subset IS NOT NULL:
            matches.append(Match(type=AGGREGATE_N_1, bank=subset, ledger=[ledger_entry],
                                 confidence=ComputeAggregateConfidence(ledger_entry, subset)))
            FOR EACH txn IN subset: unmatched_bank.remove(txn)
            unmatched_ledger.remove(ledger_entry)

    // === STAGE 4: ML-Ranked Suggestions ===
    // For remaining unmatched items, compute pairwise match scores
    FOR EACH bank_txn IN unmatched_bank:
        scored_candidates = []
        FOR EACH ledger_entry IN unmatched_ledger:
            score = ComputeMLMatchScore(bank_txn, ledger_entry, business_context)
            // Score based on: amount_similarity, date_proximity, counterparty_match,
            //                  historical_pattern, narration_similarity
            IF score > MIN_SUGGESTION_THRESHOLD:
                scored_candidates.append((ledger_entry, score))

        scored_candidates.sort(descending by score)
        matches.append(Match(
            type=ML_SUGGESTED,
            bank=[bank_txn],
            suggestions=scored_candidates[:5],  // top 5 suggestions
            confidence=scored_candidates[0].score if scored_candidates else 0
        ))

    // === STAGE 5: Auto-categorize bank-only transactions ===
    // Bank charges, interest, etc. that have no ledger counterpart
    FOR EACH bank_txn IN unmatched_bank WHERE bank_txn NOT IN matches:
        IF IsBankCharge(bank_txn):
            auto_entry = GenerateBankChargeJournalEntry(bank_txn, business_context)
            matches.append(Match(type=AUTO_CATEGORIZED, bank=[bank_txn], auto_journal=auto_entry))

    RETURN ReconciliationResult(
        matches=matches,
        unmatched_bank=remaining_unmatched_bank,
        unmatched_ledger=remaining_unmatched_ledger,
        auto_match_rate=len(auto_matches) / len(bank_transactions)
    )

FUNCTION SubsetSumWithTolerance(candidates, target, tolerance, max_size):
    // Dynamic programming subset-sum with amount tolerance
    // Optimized for financial amounts (multiply by 100 to work with integers)
    target_cents = ROUND(target * 100)
    tolerance_cents = ROUND(tolerance * 100)

    // Prune candidates: only include those whose amount is <= target + tolerance
    viable = [c for c in candidates if ABS(c.amount * 100) <= target_cents + tolerance_cents]
    viable.sort(by amount, descending)

    // Branch-and-bound search with pruning
    best_match = NULL
    best_diff = tolerance_cents + 1

    FUNCTION Search(index, current_sum, current_subset):
        NONLOCAL best_match, best_diff

        diff = ABS(current_sum - target_cents)
        IF diff < best_diff AND len(current_subset) > 0:
            best_diff = diff
            best_match = Copy(current_subset)

        IF diff <= tolerance_cents AND len(current_subset) > 0:
            RETURN  // found a good enough match

        IF index >= len(viable) OR len(current_subset) >= max_size:
            RETURN

        // Pruning: if remaining candidates can't possibly reach target, skip
        remaining_sum = SUM(ABS(viable[i].amount * 100) for i in range(index, len(viable)))
        IF current_sum + remaining_sum < target_cents - tolerance_cents:
            RETURN

        // Include current candidate
        Search(index + 1, current_sum + ROUND(ABS(viable[index].amount) * 100), current_subset + [viable[index]])
        // Exclude current candidate
        Search(index + 1, current_sum, current_subset)

    Search(0, 0, [])
    RETURN best_match IF best_diff <= tolerance_cents ELSE NULL
```

### Algorithm 3: GST Tax Computation Engine

```
FUNCTION ComputeGST(supply_details, business_context):
    result = TaxComputationResult()

    // Step 1: Determine supply classification
    supply_class = ClassifySupply(supply_details)
    // supply_class: INTRA_STATE, INTER_STATE, EXPORT, SEZ, DEEMED_EXPORT

    // Step 2: Check if business is under composition scheme
    IF business_context.scheme == COMPOSITION:
        RETURN ComputeCompositionTax(supply_details, business_context)
        // Composition: flat rate (1% manufacturing, 5% restaurant, 6% services)
        // No ITC, no inter-state supply allowed

    // Step 3: For each line item, compute tax
    FOR EACH item IN supply_details.line_items:
        // Step 3a: Look up HSN/SAC-based rate
        applicable_rules = TaxRuleRepository.query(
            jurisdiction=IN_GST,
            hsn_sac_code=item.hsn_sac_code,
            supply_type=supply_details.supply_type,
            source_state=supply_details.supplier_state,
            destination_state=supply_details.buyer_state,
            business_scheme=business_context.scheme,
            effective_date=supply_details.supply_date
        )

        // Step 3b: Resolve the most specific applicable rule
        // Rules are ordered by specificity: 8-digit HSN > 6-digit > 4-digit > 2-digit > default
        rule = SelectMostSpecificRule(applicable_rules)

        // Step 3c: Check for exemptions
        IF IsExempt(item, supply_details, rule):
            item_tax = TaxLineResult(rate=0, exempt=true)
            result.add(item_tax)
            CONTINUE

        // Step 3d: Compute tax amounts based on supply classification
        taxable_amount = item.taxable_amount  // after discounts

        IF supply_class == INTRA_STATE:
            cgst_amount = ROUND(taxable_amount * rule.cgst_rate / 100, 2)
            sgst_amount = ROUND(taxable_amount * rule.sgst_rate / 100, 2)
            item_tax = TaxLineResult(
                cgst_rate=rule.cgst_rate, cgst_amount=cgst_amount,
                sgst_rate=rule.sgst_rate, sgst_amount=sgst_amount,
                igst_rate=0, igst_amount=0
            )
        ELSE IF supply_class == INTER_STATE OR supply_class == SEZ:
            igst_amount = ROUND(taxable_amount * rule.igst_rate / 100, 2)
            item_tax = TaxLineResult(
                cgst_rate=0, cgst_amount=0,
                sgst_rate=0, sgst_amount=0,
                igst_rate=rule.igst_rate, igst_amount=igst_amount
            )
        ELSE IF supply_class == EXPORT:
            // Zero-rated: tax at 0% with ITC refund, OR with IGST and claim refund
            IF supply_details.export_under_bond:
                item_tax = TaxLineResult(rate=0, zero_rated=true, itc_refund_eligible=true)
            ELSE:
                igst_amount = ROUND(taxable_amount * rule.igst_rate / 100, 2)
                item_tax = TaxLineResult(igst_rate=rule.igst_rate, igst_amount=igst_amount,
                                          igst_refund_eligible=true)

        // Step 3e: Cess computation (luxury goods, sin goods)
        IF rule.cess_rate > 0:
            cess_amount = ROUND(taxable_amount * rule.cess_rate / 100, 2)
            item_tax.cess_amount = cess_amount
        IF rule.cess_fixed > 0:
            cess_fixed_amount = item.quantity * rule.cess_fixed
            item_tax.cess_amount += cess_fixed_amount

        // Step 3f: Reverse charge check
        IF rule.reverse_charge:
            item_tax.reverse_charge = true
            // Buyer must pay tax instead of seller
            // Generate both output liability and input credit entries

        // Step 3g: ITC eligibility
        item_tax.itc_eligible = DetermineITCEligibility(item, business_context, rule)
        // ITC blocked for: motor vehicles (except specific), food & beverages,
        // personal consumption, free samples, member club subscriptions

        result.add(item_tax)

    // Step 4: Round-off and totaling
    result.total_cgst = SUM(item.cgst_amount for item in result.items)
    result.total_sgst = SUM(item.sgst_amount for item in result.items)
    result.total_igst = SUM(item.igst_amount for item in result.items)
    result.total_cess = SUM(item.cess_amount for item in result.items)
    result.grand_total = supply_details.sub_total + result.total_tax

    // Step 5: Generate journal entry template
    result.journal_template = GenerateTaxJournalEntry(supply_details, result)

    RETURN result
```

### Algorithm 4: Invoice OCR Extraction Pipeline

```
FUNCTION ExtractInvoiceData(document_image):
    // Stage 1: Image Preprocessing
    preprocessed = ImagePreprocess(document_image)
    // Operations: deskew (correct rotation), denoise, contrast enhancement,
    //             binarization (adaptive threshold), resolution upscaling if <300 DPI

    // Stage 2: Layout Analysis
    layout = LayoutAnalyzer.detect(preprocessed)
    // Detect: text regions, table structures, header-value pairs, logo regions
    // Output: list of (region_type, bounding_box, reading_order)

    regions = layout.regions.sort(by reading_order)

    // Stage 3: Text Recognition (OCR)
    ocr_results = []
    FOR EACH region IN regions:
        IF region.type == TABLE:
            // Use table-specific OCR with cell boundary detection
            table_data = TableOCR.extract(preprocessed, region.bounding_box)
            ocr_results.append(TableResult(cells=table_data))
        ELSE:
            // Standard text line OCR
            text = TextOCR.recognize(preprocessed, region.bounding_box)
            ocr_results.append(TextResult(text=text, region=region))

    // Stage 4: Entity Extraction (field identification)
    extracted = {}

    // 4a: Key-value pair extraction for header fields
    FOR EACH text_result IN ocr_results WHERE text_result.region.type == KEY_VALUE:
        key = NormalizeKey(text_result.key_text)
        value = text_result.value_text

        IF key MATCHES ["invoice number", "inv no", "bill no", "invoice #"]:
            extracted["invoice_number"] = ParseInvoiceNumber(value)
        ELSE IF key MATCHES ["date", "invoice date", "bill date"]:
            extracted["invoice_date"] = ParseDate(value)
        ELSE IF key MATCHES ["gstin", "gst no", "gst number"]:
            extracted["gstin"] = ParseGSTIN(value)
        ELSE IF key MATCHES ["total", "grand total", "net amount", "amount payable"]:
            extracted["total"] = ParseAmount(value)
        // ... additional field patterns

    // 4b: Line item extraction from detected tables
    FOR EACH table_result IN ocr_results WHERE table_result IS TableResult:
        headers = IdentifyTableHeaders(table_result.cells[0])
        line_items = []
        FOR EACH row IN table_result.cells[1:]:  // skip header row
            IF IsDataRow(row):  // not a subtotal or empty row
                item = MapColumnsToFields(row, headers)
                // Map: description, HSN, quantity, rate, amount, tax columns
                line_items.append(item)
        extracted["line_items"] = line_items

    // 4c: Tax component extraction
    tax_section = FindTaxSection(ocr_results)
    IF tax_section:
        extracted["cgst"] = ExtractTaxAmount(tax_section, ["cgst", "central gst"])
        extracted["sgst"] = ExtractTaxAmount(tax_section, ["sgst", "state gst"])
        extracted["igst"] = ExtractTaxAmount(tax_section, ["igst", "integrated gst"])
        extracted["cess"] = ExtractTaxAmount(tax_section, ["cess"])

    // Stage 5: Validation and Cross-Checking
    validation = ValidateExtraction(extracted)
    // Checks:
    //   1. Line item amounts sum to subtotal
    //   2. Tax amounts computed from taxable amount match extracted tax amounts
    //   3. Subtotal + taxes = total (within rounding tolerance)
    //   4. GSTIN format validation (15 characters, checksum digit)
    //   5. Invoice date is not in the future
    //   6. HSN codes are valid (lookup against master)

    // Stage 6: Confidence Scoring
    FOR EACH field IN extracted:
        field.confidence = ComputeFieldConfidence(
            ocr_confidence=field.ocr_score,
            validation_passed=validation.field_checks[field.name],
            cross_check_passed=validation.cross_checks[field.name],
            layout_confidence=field.region.detection_confidence
        )

    // Stage 7: Template Learning (for future invoices from same vendor)
    IF extracted["gstin"].confidence > 0.9:
        vendor_gstin = extracted["gstin"].value
        UpdateVendorTemplate(vendor_gstin, layout, extracted)
        // Store: field positions, table structure, formatting patterns
        // Next invoice from this vendor uses template for faster, more accurate extraction

    RETURN ExtractionResult(
        fields=extracted,
        validation=validation,
        overall_confidence=WeightedMean(field.confidence for field in extracted),
        low_confidence_fields=[f for f in extracted if f.confidence < 0.85]
    )
```
