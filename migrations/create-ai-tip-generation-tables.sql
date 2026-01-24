-- Migration: Create AI Tip Generation Tables and Updates
-- Date: 2026-01-23
-- Description: Creates all tables and updates for AI tip generation functionality
--              including team statistics, H2H, data maturity, importance ratings,
--              predictability scores, competition configs, and generation queue

-- ============================================================================
-- 1. CREATE ENUMS
-- ============================================================================

-- Create competition_type enum
DO $$ BEGIN
    CREATE TYPE competition_type AS ENUM (
        'weekend_league',
        'champions_league',
        'europa_league',
        'afcon',
        'copa_america',
        'euros',
        'uefa_nations_league',
        'international_friendly',
        'international_qualifier',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create data_maturity_confidence enum
DO $$ BEGIN
    CREATE TYPE data_maturity_confidence AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create generation_queue_status enum
DO $$ BEGIN
    CREATE TYPE generation_queue_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'skipped'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. UPDATE EXISTING TABLES
-- ============================================================================

-- Update leagues table
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS competition_type competition_type,
ADD COLUMN IF NOT EXISTS is_top_5_european BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS league_tier INTEGER;

CREATE INDEX IF NOT EXISTS idx_leagues_competition_type ON leagues(competition_type);
CREATE INDEX IF NOT EXISTS idx_leagues_top_5_european ON leagues(is_top_5_european);

-- Update tips table with AI-specific fields
ALTER TABLE tips
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_prompt_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS data_maturity_score INTEGER,
ADD COLUMN IF NOT EXISTS auto_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS generation_batch_id UUID;

-- ============================================================================
-- 3. CREATE NEW TABLES
-- ============================================================================

-- Team Statistics Table
CREATE TABLE IF NOT EXISTS team_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    season VARCHAR(50),
    
    -- Aggregated stats
    matches_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    goals_scored INTEGER NOT NULL DEFAULT 0,
    goals_conceded INTEGER NOT NULL DEFAULT 0,
    clean_sheets INTEGER NOT NULL DEFAULT 0,
    
    -- Recent form (last 5 matches)
    recent_form VARCHAR(5),
    recent_goals_scored INTEGER NOT NULL DEFAULT 0,
    recent_goals_conceded INTEGER NOT NULL DEFAULT 0,
    
    -- Home/Away specific
    home_matches INTEGER NOT NULL DEFAULT 0,
    home_wins INTEGER NOT NULL DEFAULT 0,
    home_draws INTEGER NOT NULL DEFAULT 0,
    home_losses INTEGER NOT NULL DEFAULT 0,
    away_matches INTEGER NOT NULL DEFAULT 0,
    away_wins INTEGER NOT NULL DEFAULT 0,
    away_draws INTEGER NOT NULL DEFAULT 0,
    away_losses INTEGER NOT NULL DEFAULT 0,
    
    -- Calculated fields
    win_rate DECIMAL(5, 2),
    avg_goals_scored DECIMAL(4, 2),
    avg_goals_conceded DECIMAL(4, 2),
    league_position INTEGER,
    points INTEGER NOT NULL DEFAULT 0,
    goal_difference INTEGER NOT NULL DEFAULT 0,
    
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_team_stats_team_league_season UNIQUE (team_id, league_id, season)
);

-- Team Head-to-Head Table
CREATE TABLE IF NOT EXISTS team_head_to_head (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_a_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team_b_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    
    -- Aggregated H2H stats
    total_matches INTEGER NOT NULL DEFAULT 0,
    team_a_wins INTEGER NOT NULL DEFAULT 0,
    team_b_wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    
    -- Recent H2H (last 5 matches)
    recent_matches JSONB,
    
    -- When team A is home
    team_a_home_wins INTEGER NOT NULL DEFAULT 0,
    team_a_home_draws INTEGER NOT NULL DEFAULT 0,
    team_a_home_losses INTEGER NOT NULL DEFAULT 0,
    
    -- When team B is home
    team_b_home_wins INTEGER NOT NULL DEFAULT 0,
    team_b_home_draws INTEGER NOT NULL DEFAULT 0,
    team_b_home_losses INTEGER NOT NULL DEFAULT 0,
    
    last_match_date TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_h2h_teams_league UNIQUE (team_a_id, team_b_id, league_id)
);

-- Data Maturity Score Table
CREATE TABLE IF NOT EXISTS data_maturity_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    
    score INTEGER NOT NULL,
    total_matches INTEGER NOT NULL DEFAULT 0,
    recent_matches INTEGER NOT NULL DEFAULT 0,
    head_to_head_matches INTEGER NOT NULL DEFAULT 0,
    data_age_days INTEGER NOT NULL DEFAULT 0,
    completeness_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    confidence data_maturity_confidence NOT NULL DEFAULT 'low',
    
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_maturity_team_league UNIQUE (team_id, league_id)
);

-- Team Importance Rating Table
CREATE TABLE IF NOT EXISTS team_importance_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    
    importance_score DECIMAL(5, 2) NOT NULL,
    global_importance_score DECIMAL(5, 2),
    rating_factors JSONB,
    
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_team_importance_team_league UNIQUE (team_id, league_id)
);

-- Match Predictability Score Table
CREATE TABLE IF NOT EXISTS match_predictability_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES match_data(id) ON DELETE CASCADE,
    
    competition_type competition_type NOT NULL,
    predictability_score DECIMAL(5, 2) NOT NULL,
    combined_importance_score DECIMAL(5, 2) NOT NULL,
    predictability_factors JSONB,
    calculation_method VARCHAR(50),
    
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_match_predictability_match UNIQUE (match_id)
);

-- Competition Configuration Table
CREATE TABLE IF NOT EXISTS competition_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_type competition_type NOT NULL UNIQUE,
    
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    generation_schedule VARCHAR(100) NOT NULL,
    time_window_hours INTEGER NOT NULL DEFAULT 72,
    max_matches_per_tip INTEGER,
    selection_criteria JSONB,
    tip_title_template VARCHAR(255),
    auto_publish BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Tip Generation Queue Table
CREATE TABLE IF NOT EXISTS ai_tip_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES match_data(id) ON DELETE CASCADE,
    
    status generation_queue_status NOT NULL DEFAULT 'pending',
    generation_attempts INTEGER NOT NULL DEFAULT 0,
    last_attempted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    generated_tip_id UUID REFERENCES tips(id) ON DELETE SET NULL,
    
    skip_reason VARCHAR(255),
    error_message TEXT,
    data_maturity_score INTEGER,
    context_size INTEGER,
    generation_latency INTEGER,
    batch_id UUID,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uk_generation_queue_match UNIQUE (match_id)
);

-- ============================================================================
-- 4. CREATE INDEXES
-- ============================================================================

-- Team Statistics indexes
CREATE INDEX IF NOT EXISTS idx_team_stats_team_id ON team_statistics(team_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_league_id ON team_statistics(league_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_season ON team_statistics(season);
CREATE INDEX IF NOT EXISTS idx_team_stats_team_league_season ON team_statistics(team_id, league_id, season);

-- Team Head-to-Head indexes
CREATE INDEX IF NOT EXISTS idx_h2h_team_a ON team_head_to_head(team_a_id);
CREATE INDEX IF NOT EXISTS idx_h2h_team_b ON team_head_to_head(team_b_id);
CREATE INDEX IF NOT EXISTS idx_h2h_league ON team_head_to_head(league_id);

-- Data Maturity Score indexes
CREATE INDEX IF NOT EXISTS idx_maturity_team_id ON data_maturity_scores(team_id);
CREATE INDEX IF NOT EXISTS idx_maturity_league_id ON data_maturity_scores(league_id);
CREATE INDEX IF NOT EXISTS idx_maturity_score ON data_maturity_scores(score);
CREATE INDEX IF NOT EXISTS idx_maturity_confidence ON data_maturity_scores(confidence);

-- Team Importance Rating indexes
CREATE INDEX IF NOT EXISTS idx_team_importance_team_id ON team_importance_ratings(team_id);
CREATE INDEX IF NOT EXISTS idx_team_importance_league_id ON team_importance_ratings(league_id);
CREATE INDEX IF NOT EXISTS idx_team_importance_score ON team_importance_ratings(importance_score);
CREATE INDEX IF NOT EXISTS idx_team_importance_global_score ON team_importance_ratings(global_importance_score);

-- Match Predictability Score indexes
CREATE INDEX IF NOT EXISTS idx_match_predictability_match_id ON match_predictability_scores(match_id);
CREATE INDEX IF NOT EXISTS idx_match_predictability_score ON match_predictability_scores(predictability_score);
CREATE INDEX IF NOT EXISTS idx_match_predictability_competition ON match_predictability_scores(competition_type);
CREATE INDEX IF NOT EXISTS idx_match_predictability_combined_importance ON match_predictability_scores(combined_importance_score);

-- Competition Configuration indexes
CREATE INDEX IF NOT EXISTS idx_competition_config_type ON competition_configurations(competition_type);

-- AI Tip Generation Queue indexes
CREATE INDEX IF NOT EXISTS idx_generation_queue_match_id ON ai_tip_generation_queue(match_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_status ON ai_tip_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_generation_queue_tip_id ON ai_tip_generation_queue(generated_tip_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_created_at ON ai_tip_generation_queue(created_at);

-- ============================================================================
-- 5. INSERT DEFAULT COMPETITION CONFIGURATIONS
-- ============================================================================

INSERT INTO competition_configurations (
    competition_type,
    is_enabled,
    generation_schedule,
    time_window_hours,
    max_matches_per_tip,
    tip_title_template,
    auto_publish
) VALUES
    ('weekend_league', true, '0 18 * * 4', 72, 10, 'Weekend Acca', true),
    ('champions_league', true, '0 18 * * 1', 72, 8, 'Champions League Picks', true),
    ('europa_league', true, '0 19 * * 1', 72, 8, 'Europa League Picks', true),
    ('afcon', true, '0 8 * * *', 168, 5, 'AFCON Picks', true),
    ('copa_america', true, '0 8 * * *', 168, 5, 'Copa America Picks', true),
    ('euros', true, '0 8 * * *', 168, 5, 'European Championship Picks', true),
    ('uefa_nations_league', true, '0 8 * * *', 168, 5, 'UEFA Nations League Picks', true),
    ('international_friendly', true, '0 8 * * *', 168, 5, 'International Friendly Picks', true),
    ('international_qualifier', true, '0 8 * * *', 168, 5, 'Qualifier Picks', true)
ON CONFLICT (competition_type) DO NOTHING;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE team_statistics IS 'Pre-computed team statistics for AI context building';
COMMENT ON TABLE team_head_to_head IS 'Cached head-to-head records between teams';
COMMENT ON TABLE data_maturity_scores IS 'Data quality/completeness scores for teams';
COMMENT ON TABLE team_importance_ratings IS 'Team importance/relevance scores';
COMMENT ON TABLE match_predictability_scores IS 'Match predictability scores';
COMMENT ON TABLE competition_configurations IS 'Configuration for each competition type';
COMMENT ON TABLE ai_tip_generation_queue IS 'Queue for tracking AI tip generation';

COMMENT ON COLUMN tips.ai_confidence_score IS 'AI confidence score (0-100)';
COMMENT ON COLUMN tips.ai_reasoning IS 'The AI''s reasoning/analysis for this tip';
COMMENT ON COLUMN tips.ai_model_version IS 'Which AI model generated this tip';
COMMENT ON COLUMN tips.ai_prompt_version IS 'Which prompt template version was used';
COMMENT ON COLUMN tips.data_maturity_score IS 'Data quality score at generation time (0-100)';
COMMENT ON COLUMN tips.auto_generated_at IS 'When this tip was auto-generated';
COMMENT ON COLUMN tips.generation_batch_id IS 'Batch ID for batch processing';

COMMENT ON COLUMN leagues.competition_type IS 'Type of competition this league represents';
COMMENT ON COLUMN leagues.is_top_5_european IS 'Is this one of the top 5 European leagues';
COMMENT ON COLUMN leagues.league_tier IS 'League tier/ranking (1 = top tier, higher = lower tier)';
