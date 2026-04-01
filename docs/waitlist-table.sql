-- Create waitlist table for coming soon page
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow inserts from service role only (API calls)
CREATE POLICY "Service role can insert" ON waitlist
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can select" ON waitlist
  FOR SELECT USING (true);
