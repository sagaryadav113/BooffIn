-- ============================================================================
-- BOOFFIN WORKSPACE SYSTEM - BACKFILL DM PARTICIPANTS
-- ============================================================================
-- Ensures all existing DM workspaces have dm_participant_a and dm_participant_b
-- populated from canonical_dm_key so profile resolution is instant and guaranteed.
-- ============================================================================

UPDATE public.workspaces
SET
  dm_participant_a = split_part(canonical_dm_key, ':', 1)::uuid,
  dm_participant_b = split_part(canonical_dm_key, ':', 2)::uuid
WHERE type = 'dm'
  AND canonical_dm_key IS NOT NULL
  AND canonical_dm_key LIKE '%:%'
  AND (dm_participant_a IS NULL OR dm_participant_b IS NULL);

NOTIFY pgrst, 'reload schema';
