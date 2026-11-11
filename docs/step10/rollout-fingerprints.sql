-- Read-only preservation check. Run as the database administrator with writers stopped.
-- The projection is the V5 row shape, so added V6–V10 columns do not affect the result.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL DateStyle TO 'ISO, YMD';
SET LOCAL bytea_output TO 'hex';

SELECT format($query$
SELECT %L AS relation, count(*) AS rows,
       encode(sha256(convert_to(coalesce(string_agg(
         encode(sha256(convert_to((to_jsonb(r) - %L::text[])::text, 'UTF8')), 'hex'),
         '' ORDER BY r.%I), ''), 'UTF8')), 'hex') AS v5_fingerprint
FROM public.%I r
$query$, relation, added, pk, relation)
FROM (VALUES
  ('asset_columns', 'id', '{nullable,ordinal_position}'),
  ('assets', 'id', '{description,provenance,revision,name_curated,inventory_state,business_owner}'),
  ('audit_events', 'id', '{}'),
  ('column_lineage', 'id', '{active,evidence_ref,created_by,revoked_at}'),
  ('import_batches', 'id', '{source_type,format}'),
  ('lineage_edges', 'id', '{active,description,created_by,revoked_at,supersedes}'),
  ('organization_invitations', 'id', '{}'),
  ('organization_memberships', 'id', '{}'),
  ('organizations', 'id', '{}'),
  ('password_reset_tokens', 'id', '{}'),
  ('source_connections', 'id', '{description,configuration,status,reason_code,last_tested_at,last_successful_sync_at,created_by,updated_at}'),
  ('team_memberships', 'id', '{}'),
  ('teams', 'id', '{}'),
  ('user_credentials', 'user_id', '{}'),
  ('users', 'id', '{}')
) AS tracked(relation, pk, added)
ORDER BY relation
\gexec
COMMIT;
