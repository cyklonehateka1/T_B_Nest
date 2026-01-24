-- Migration: Set is_top_5_european for existing top 5 European leagues
-- Date: 2026-01-23
-- Run after create-ai-tip-generation-tables.sql
-- Idempotent: safe to run multiple times

UPDATE leagues
SET is_top_5_european = true
WHERE external_id IN (
  'soccer_epl',
  'soccer_spain_la_liga',
  'soccer_italy_serie_a',
  'soccer_germany_bundesliga',
  'soccer_france_ligue_one'
);
