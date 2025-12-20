-- Database initialization script for the Cameroon Credit Bureau platform
-- Run with a PostgreSQL client that supports \connect (psql) or split the script before and after database creation.

CREATE DATABASE credit_bureau;

\connect credit_bureau;

-- Namespaces keep concerns isolated.
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ingestion;
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS disputes;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS audit;

SET search_path TO core, public;

-- Institutions providing or querying credit data.
CREATE TABLE core.institutions (
    institution_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    institution_type TEXT NOT NULL, -- e.g., bank, mfi, telco
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address JSONB,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Borrower entities (individual or business) resolved by the identity service.
CREATE TABLE core.borrowers (
    entity_id UUID PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('individual', 'business')),
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    nationality TEXT,
    primary_phone TEXT,
    primary_email TEXT,
    address JSONB,
    risk_flags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Multiple identifiers per borrower to reflect Cameroon realities.
CREATE TABLE core.borrower_identifiers (
    borrower_identifier_id UUID PRIMARY KEY,
    entity_id UUID NOT NULL REFERENCES core.borrowers(entity_id) ON DELETE CASCADE,
    id_type TEXT NOT NULL, -- national_id, passport, driver's_license, phone, tax_id, biometric_hash
    id_value TEXT NOT NULL,
    issuing_country TEXT,
    issued_at DATE,
    expires_at DATE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (id_type, id_value)
);

-- Obligations/loans reported by institutions.
CREATE TABLE core.obligations (
    obligation_id UUID PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES core.institutions(institution_id),
    entity_id UUID NOT NULL REFERENCES core.borrowers(entity_id),
    product_type TEXT NOT NULL, -- installment_loan, credit_card, mobile_money, utility
    status TEXT NOT NULL, -- active, closed, defaulted, written_off
    principal_amount NUMERIC(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'XAF',
    interest_rate NUMERIC(7,4),
    disbursed_at DATE NOT NULL,
    maturity_date DATE,
    collateral JSONB,
    purpose TEXT,
    past_due_amount NUMERIC(18,2),
    next_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON core.obligations (entity_id);
CREATE INDEX ON core.obligations (institution_id);

-- Guarantor links for obligations.
CREATE TABLE core.obligation_guarantors (
    obligation_id UUID NOT NULL REFERENCES core.obligations(obligation_id) ON DELETE CASCADE,
    guarantor_entity_id UUID NOT NULL REFERENCES core.borrowers(entity_id),
    guarantee_type TEXT NOT NULL,
    amount_covered NUMERIC(18,2),
    PRIMARY KEY (obligation_id, guarantor_entity_id)
);

-- Repayment transactions.
CREATE TABLE core.repayments (
    repayment_id UUID PRIMARY KEY,
    obligation_id UUID NOT NULL REFERENCES core.obligations(obligation_id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'XAF',
    channel TEXT, -- bank_transfer, mobile_money, cash
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (obligation_id, payment_date, amount, channel)
);

-- Credit score snapshots per borrower and scoring model.
CREATE TABLE core.credit_scores (
    score_id UUID PRIMARY KEY,
    entity_id UUID NOT NULL REFERENCES core.borrowers(entity_id) ON DELETE CASCADE,
    model_version TEXT NOT NULL,
    score SMALLINT NOT NULL CHECK (score BETWEEN 300 AND 900),
    risk_tier TEXT NOT NULL,
    adverse_reasons TEXT[],
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON core.credit_scores (entity_id, calculated_at DESC);

-- Ingestion tracking for batches pushed by institutions.
CREATE TABLE ingestion.submissions (
    submission_id UUID PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES core.institutions(institution_id),
    submission_type TEXT NOT NULL, -- obligations, repayments, identifiers
    file_name TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'received',
    status_details TEXT
);

CREATE TABLE ingestion.submission_items (
    submission_item_id UUID PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES ingestion.submissions(submission_id) ON DELETE CASCADE,
    reference_id TEXT, -- institution internal reference
    entity_id UUID,
    payload JSONB NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'pending',
    validation_errors TEXT[]
);

-- Identity resolution clusters and linkages.
CREATE TABLE identity.identity_clusters (
    cluster_id UUID PRIMARY KEY,
    confidence NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    resolution_status TEXT NOT NULL DEFAULT 'auto',
    reviewer TEXT,
    reviewed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE identity.identity_links (
    link_id UUID PRIMARY KEY,
    cluster_id UUID NOT NULL REFERENCES identity.identity_clusters(cluster_id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES core.borrowers(entity_id),
    match_score NUMERIC(5,2) NOT NULL CHECK (match_score BETWEEN 0 AND 1),
    attributes JSONB
);

-- Dispute lifecycle.
CREATE TABLE disputes.disputes (
    dispute_id UUID PRIMARY KEY,
    entity_id UUID NOT NULL REFERENCES core.borrowers(entity_id),
    obligation_id UUID REFERENCES core.obligations(obligation_id),
    submitted_by UUID, -- optional user account reference
    channel TEXT NOT NULL, -- portal, email, branch
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    resolution_summary TEXT
);

CREATE INDEX ON disputes.disputes (entity_id);

CREATE TABLE disputes.dispute_events (
    dispute_event_id UUID PRIMARY KEY,
    dispute_id UUID NOT NULL REFERENCES disputes.disputes(dispute_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- comment, evidence_uploaded, status_change
    payload JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification templates and delivery logs.
CREATE TABLE notifications.notification_templates (
    template_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    channel TEXT NOT NULL, -- sms, email
    locale TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications.notification_events (
    notification_id UUID PRIMARY KEY,
    template_id UUID REFERENCES notifications.notification_templates(template_id),
    entity_id UUID REFERENCES core.borrowers(entity_id),
    destination TEXT NOT NULL,
    channel TEXT NOT NULL,
    payload JSONB,
    status TEXT NOT NULL DEFAULT 'queued',
    attempts SMALLINT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Access logging for regulatory oversight.
CREATE TABLE audit.access_logs (
    access_log_id UUID PRIMARY KEY,
    institution_id UUID REFERENCES core.institutions(institution_id),
    user_id UUID,
    entity_id UUID REFERENCES core.borrowers(entity_id),
    action TEXT NOT NULL, -- score_lookup, dispute_view, data_submission
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON audit.access_logs (institution_id, created_at DESC);


ALTER TABLE core.obligations
  ADD COLUMN past_due_amount NUMERIC(18,2),
  ADD COLUMN next_due_date DATE;

