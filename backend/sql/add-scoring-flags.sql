-- =============================================================================
-- Scoring flag columns for partial-scoring / low-score alerts
-- Run against the ai_assist database
-- =============================================================================

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('app.interaction_insights')
    AND name = 'operations_partial_scoring'
)
BEGIN
  ALTER TABLE app.interaction_insights
    ADD operations_partial_scoring BIT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('app.interaction_insights')
    AND name = 'operations_low_score_alert'
)
BEGIN
  ALTER TABLE app.interaction_insights
    ADD operations_low_score_alert BIT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('app.interaction_insights')
    AND name = 'qa_partial_scoring'
)
BEGIN
  ALTER TABLE app.interaction_insights
    ADD qa_partial_scoring BIT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('app.interaction_insights')
    AND name = 'qa_low_score_alert'
)
BEGIN
  ALTER TABLE app.interaction_insights
    ADD qa_low_score_alert BIT NULL;
END;
GO

-- Filtered indexes — only true rows are dashboard-interesting
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_insights_ops_partial_scoring'
    AND object_id = OBJECT_ID('app.interaction_insights')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_insights_ops_partial_scoring
    ON app.interaction_insights (operations_partial_scoring)
    INCLUDE (recordingId)
    WHERE operations_partial_scoring = 1;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_insights_ops_low_score_alert'
    AND object_id = OBJECT_ID('app.interaction_insights')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_insights_ops_low_score_alert
    ON app.interaction_insights (operations_low_score_alert)
    INCLUDE (recordingId)
    WHERE operations_low_score_alert = 1;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_insights_qa_partial_scoring'
    AND object_id = OBJECT_ID('app.interaction_insights')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_insights_qa_partial_scoring
    ON app.interaction_insights (qa_partial_scoring)
    INCLUDE (recordingId)
    WHERE qa_partial_scoring = 1;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_insights_qa_low_score_alert'
    AND object_id = OBJECT_ID('app.interaction_insights')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_insights_qa_low_score_alert
    ON app.interaction_insights (qa_low_score_alert)
    INCLUDE (recordingId)
    WHERE qa_low_score_alert = 1;
END;
GO
