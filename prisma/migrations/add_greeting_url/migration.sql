-- Migration: add greeting_url to business_settings
-- Run this against your Supabase database.
--
-- greeting_url stores the public Supabase Storage URL of the customer's
-- recorded greeting audio. Null until the customer uploads a greeting.
-- The /api/voice TwiML endpoint reads this to play the greeting on inbound calls.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS greeting_url TEXT;

-- Existing customers get NULL — the /api/voice endpoint falls back to
-- a generic TTS message until they record and upload their greeting.
