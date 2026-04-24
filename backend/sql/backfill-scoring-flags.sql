-- =============================================================================
-- Backfill the scoring_flags bit columns from the raw LLM JSON.
-- Safe to re-run — JSON_VALUE returns NULL where the flag wasn't emitted,
-- which matches the existing "unknown" state.
-- Run AFTER add-scoring-flags.sql has added the columns.
--
-- Some older records stored the raw LLM response with markdown fences
-- (```json ... ```) still wrapping the JSON, so we guard every call with
-- ISJSON([json]) = 1 and skip malformed rows.
-- =============================================================================

UPDATE app.interaction_insights
SET
  operations_partial_scoring = CASE JSON_VALUE([json], '$.operations.scoring_flags.partial_scoring')
    WHEN 'true'  THEN 1
    WHEN 'false' THEN 0
    ELSE operations_partial_scoring
  END,
  operations_low_score_alert = CASE JSON_VALUE([json], '$.operations.scoring_flags.low_score_alert')
    WHEN 'true'  THEN 1
    WHEN 'false' THEN 0
    ELSE operations_low_score_alert
  END,
  qa_partial_scoring = CASE JSON_VALUE([json], '$.qa_assessment.scoring_flags.partial_scoring')
    WHEN 'true'  THEN 1
    WHEN 'false' THEN 0
    ELSE qa_partial_scoring
  END,
  qa_low_score_alert = CASE JSON_VALUE([json], '$.qa_assessment.scoring_flags.low_score_alert')
    WHEN 'true'  THEN 1
    WHEN 'false' THEN 0
    ELSE qa_low_score_alert
  END
WHERE [json] IS NOT NULL
  AND ISJSON([json]) = 1;
GO

-- Quick sanity counts (read-only — OK to run after the UPDATE).
-- Also surfaces the number of malformed rows that were skipped above.
SELECT
  SUM(CASE WHEN operations_partial_scoring  = 1 THEN 1 ELSE 0 END) AS ops_partial,
  SUM(CASE WHEN operations_low_score_alert  = 1 THEN 1 ELSE 0 END) AS ops_low,
  SUM(CASE WHEN qa_partial_scoring          = 1 THEN 1 ELSE 0 END) AS qa_partial,
  SUM(CASE WHEN qa_low_score_alert          = 1 THEN 1 ELSE 0 END) AS qa_low,
  SUM(CASE WHEN [json] IS NOT NULL AND ISJSON([json]) = 0 THEN 1 ELSE 0 END) AS malformed_json_rows,
  COUNT(*) AS total_rows
FROM app.interaction_insights;
GO
