-- Migration 018: Classify Ignite terrain nodes by type (fact, history, constraint, uncertainty)

ALTER TABLE ignite_thoughts ADD COLUMN IF NOT EXISTS terrain_type TEXT;
