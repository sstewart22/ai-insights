-- =============================================================================
-- Parity campaign: maturity date + days-to-go + campaign-specific Q&A storage
-- Run against the ai_assist database.
--
-- What this does:
--   1. Adds app.interactions.maturityDate           (DATETIME2 NULL)
--   2. Adds app.interactions.daysToMaturityAtInteraction (INT NULL)
--      → Days between effectiveDate (= COALESCE(interactionDateTime, createdAt))
--        and maturityDate, captured at the time of the interaction so trend
--        analysis ("best time to call relative to maturity") is stable even
--        when re-run later.
--   3. Adds app.interaction_insights.campaign_answers_json (NVARCHAR(MAX) NULL)
--      → Structured Q&A extracted by the LLM for campaign-specific prompts
--        (initially Parity, but the column is campaign-agnostic).
--   4. Adds supporting indexes for the analysis queries the dashboard will run.
--   5. Backfills daysToMaturityAtInteraction for any rows where maturityDate
--      is already populated.
--   6. Deletes the seeded call.base prompt template row so the backend reseeds
--      it with the new {{campaign_qa_section}} / {{campaign_qa_schema}}
--      placeholders on next boot.
--
--      ⚠ If you have edited call.base via the prompts admin UI, copy your
--      version out before running this — the DELETE will wipe in-DB edits.
-- =============================================================================

-- ─── 1. app.interactions.maturityDate ───────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('app.interactions')
    AND name = 'maturityDate'
)
BEGIN
  ALTER TABLE app.interactions
    ADD maturityDate DATETIME2 NULL;
END;
GO

-- ─── 2. app.interactions.daysToMaturityAtInteraction ────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('app.interactions')
    AND name = 'daysToMaturityAtInteraction'
)
BEGIN
  ALTER TABLE app.interactions
    ADD daysToMaturityAtInteraction INT NULL;
END;
GO

-- ─── 3. app.interaction_insights.campaign_answers_json ──────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('app.interaction_insights')
    AND name = 'campaign_answers_json'
)
BEGIN
  ALTER TABLE app.interaction_insights
    ADD campaign_answers_json NVARCHAR(MAX) NULL;
END;
GO

-- ─── 4. Indexes for Parity analysis queries ─────────────────────────────────
-- Bucket interactions by months-to-maturity within a campaign, then look at
-- outcome / score / disposition. Filtered to rows where the metric is set.
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_interactions_campaign_daysToMaturity'
    AND object_id = OBJECT_ID('app.interactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_interactions_campaign_daysToMaturity
    ON app.interactions (campaign, daysToMaturityAtInteraction)
    INCLUDE (interactionType, outcome, agent, effectiveDate)
    WHERE daysToMaturityAtInteraction IS NOT NULL;
END;
GO

-- Surfaces interactions for a campaign by their maturityDate alone
-- (e.g. "all calls for Parity agreements maturing in May 2026").
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_interactions_campaign_maturityDate'
    AND object_id = OBJECT_ID('app.interactions')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_interactions_campaign_maturityDate
    ON app.interactions (campaign, maturityDate)
    INCLUDE (interactionType, outcome, effectiveDate)
    WHERE maturityDate IS NOT NULL;
END;
GO

-- ─── 5. Backfill daysToMaturityAtInteraction ────────────────────────────────
-- If maturityDate is populated by a CRM import but daysToMaturityAtInteraction
-- wasn't computed yet (e.g. import runs before the entity hook is wired),
-- compute it from existing data.
UPDATE app.interactions
SET daysToMaturityAtInteraction =
      DATEDIFF(DAY, COALESCE(interactionDateTime, createdAt), maturityDate)
WHERE maturityDate IS NOT NULL
  AND daysToMaturityAtInteraction IS NULL;
GO

-- ─── 6. Force re-seed of call.base prompt ───────────────────────────────────
-- The new call.base body uses {{campaign_qa_section}} and {{campaign_qa_schema}}
-- placeholders. The PromptsService.onModuleInit seeder only inserts when
-- missing, so we delete the existing row to make it re-seed on next boot.
IF OBJECT_ID('app.prompt_templates', 'U') IS NOT NULL
BEGIN
  DELETE FROM app.prompt_templates WHERE [key] = 'call.base';
END;
GO
