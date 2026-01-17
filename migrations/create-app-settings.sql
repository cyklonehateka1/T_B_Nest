-- Migration: Create app_settings table and insert initial settings
-- Date: 2026-01-17
-- Description: Creates the app_settings table and inserts initial configuration
--              with min and max tip prices set to 1.00 and 100.00 USD respectively

-- Create the app_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tip Pricing Settings
    tip_min_price DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    tip_max_price DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    
    -- Platform Fees & Commission
    platform_commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.1000,
    tipster_commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.9000,
    
    -- Limits
    max_selections_per_tip INTEGER NOT NULL DEFAULT 50,
    max_tips_per_day INTEGER,
    max_tips_per_user INTEGER,
    
    -- Feature Flags
    enable_tip_purchases BOOLEAN NOT NULL DEFAULT true,
    enable_new_tipster_registrations BOOLEAN NOT NULL DEFAULT true,
    enable_free_tips BOOLEAN NOT NULL DEFAULT true,
    
    -- Content Moderation
    require_tip_approval BOOLEAN NOT NULL DEFAULT false,
    auto_publish_tips BOOLEAN NOT NULL DEFAULT true,
    
    -- Notification Settings
    send_email_notifications BOOLEAN NOT NULL DEFAULT true,
    send_tip_purchase_notifications BOOLEAN NOT NULL DEFAULT true,
    
    -- Maintenance Mode
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    maintenance_message TEXT,
    
    -- Analytics & Tracking
    enable_analytics BOOLEAN NOT NULL DEFAULT true,
    
    -- Additional flexible settings
    metadata JSONB,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_app_settings_is_active ON app_settings(is_active);

-- Insert initial app settings if no settings exist
-- Using ON CONFLICT to ensure only one row exists (singleton pattern)
INSERT INTO app_settings (
    tip_min_price,
    tip_max_price,
    platform_commission_rate,
    tipster_commission_rate,
    max_selections_per_tip,
    enable_tip_purchases,
    enable_new_tipster_registrations,
    enable_free_tips,
    require_tip_approval,
    auto_publish_tips,
    send_email_notifications,
    send_tip_purchase_notifications,
    maintenance_mode,
    enable_analytics,
    is_active
) VALUES (
    1.00,   -- tip_min_price: $1.00 USD
    100.00, -- tip_max_price: $100.00 USD
    0.1000, -- platform_commission_rate: 10%
    0.9000, -- tipster_commission_rate: 90%
    50,     -- max_selections_per_tip
    true,   -- enable_tip_purchases
    true,   -- enable_new_tipster_registrations
    true,   -- enable_free_tips
    false,  -- require_tip_approval
    true,   -- auto_publish_tips
    true,   -- send_email_notifications
    true,   -- send_tip_purchase_notifications
    false,  -- maintenance_mode
    true,   -- enable_analytics
    true    -- is_active
)
ON CONFLICT DO NOTHING;

-- If settings already exist, update min and max prices
UPDATE app_settings
SET 
    tip_min_price = 1.00,
    tip_max_price = 100.00,
    updated_at = NOW()
WHERE is_active = true
AND (tip_min_price != 1.00 OR tip_max_price != 100.00);
