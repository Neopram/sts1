-- Migration script for new STS ClearHub features
-- Adds tables for: Sanctions Screening, Vessel Integrations, and Missing Documents Overview
-- Date: 2024
-- Author: STS ClearHub Development Team

-- ============================================
-- Sanctions Lists and Sanctioned Vessels
-- ============================================

CREATE TABLE IF NOT EXISTS sanctions_lists (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    description TEXT,
    api_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sanctioned_vessels (
    id VARCHAR(36) PRIMARY KEY,
    list_id VARCHAR(36) NOT NULL,
    imo VARCHAR(20) NOT NULL,
    vessel_name VARCHAR(255) NOT NULL,
    flag VARCHAR(100),
    owner VARCHAR(255),
    reason TEXT,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (list_id) REFERENCES sanctions_lists(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sanctioned_vessels_imo ON sanctioned_vessels(imo);
CREATE INDEX IF NOT EXISTS idx_sanctioned_vessels_list_id ON sanctioned_vessels(list_id);
CREATE INDEX IF NOT EXISTS idx_sanctioned_vessels_active ON sanctioned_vessels(active);

-- ============================================
-- External Integrations (Q88, Equasis, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS external_integrations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    api_key VARCHAR(500),
    api_secret VARCHAR(500),
    base_url VARCHAR(500),
    enabled BOOLEAN DEFAULT FALSE,
    last_sync TIMESTAMP,
    config TEXT,  -- JSON config stored as TEXT for SQLite compatibility
    rate_limit INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for provider lookups
CREATE INDEX IF NOT EXISTS idx_external_integrations_provider ON external_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_external_integrations_enabled ON external_integrations(enabled);

-- ============================================
-- Missing Documents Configuration
-- ============================================

CREATE TABLE IF NOT EXISTS missing_documents_config (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    auto_refresh BOOLEAN DEFAULT TRUE,
    refresh_interval INTEGER DEFAULT 60,
    default_sort VARCHAR(50) DEFAULT 'priority',
    default_filter VARCHAR(50) DEFAULT 'all',
    show_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_missing_documents_config_user_id ON missing_documents_config(user_id);

-- ============================================
-- Insert Sample Data
-- ============================================

-- Insert sample sanctions lists
INSERT OR IGNORE INTO sanctions_lists (id, name, source, description, active) VALUES
    ('sanctions-ofac-001', 'OFAC SDN List', 'OFAC', 'Office of Foreign Assets Control Specially Designated Nationals List', TRUE),
    ('sanctions-un-001', 'UN Consolidated List', 'UN', 'United Nations Consolidated Sanctions List', TRUE),
    ('sanctions-eu-001', 'EU Consolidated List', 'EU', 'European Union Consolidated Sanctions List', TRUE);

-- Insert sample external integrations
INSERT OR IGNORE INTO external_integrations (id, name, provider, base_url, enabled, config) VALUES
    ('integration-q88-001', 'Q88 Vessel Database', 'q88', 'https://api.q88.com/v2', FALSE, '{}'),
    ('integration-equasis-001', 'Equasis Vessel Database', 'equasis', 'https://api.equasis.org/v1', FALSE, '{}');

-- ============================================
-- Feature Flags for New Features
-- ============================================

-- Ensure feature flags table exists
CREATE TABLE IF NOT EXISTS feature_flags (
    key VARCHAR(100) PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE
);

-- Insert feature flags for new features
INSERT OR IGNORE INTO feature_flags (key, enabled) VALUES
    ('sanctions_screening', TRUE),
    ('vessel_integration', TRUE),
    ('missing_documents_overview', TRUE);

-- Update existing feature flags if they exist
UPDATE feature_flags SET enabled = TRUE WHERE key IN ('sanctions_screening', 'vessel_integration', 'missing_documents_overview');

-- ============================================
-- Migration Complete
-- ============================================

-- Verify tables were created
SELECT 'Migration completed successfully. New tables:' AS status;
SELECT name FROM sqlite_master WHERE type='table' AND name IN (
    'sanctions_lists', 
    'sanctioned_vessels', 
    'external_integrations', 
    'missing_documents_config'
) ORDER BY name;