-- =============================================================================
-- Prompt template storage for auto-ignite-insights
-- Run against the insights database
-- =============================================================================

IF NOT EXISTS (
  SELECT 1 FROM sys.tables t
  JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE s.name = 'app' AND t.name = 'prompt_templates'
)
BEGIN
  CREATE TABLE app.prompt_templates (
    id                UNIQUEIDENTIFIER  NOT NULL CONSTRAINT DF_prompt_templates_id DEFAULT NEWSEQUENTIALID(),
    [key]             VARCHAR(200)      NOT NULL,
    interactionType   VARCHAR(16)       NOT NULL,
    kind              VARCHAR(50)       NOT NULL,
    campaign          VARCHAR(100)      NULL,
    label             NVARCHAR(200)     NOT NULL,
    notes             NVARCHAR(MAX)     NULL,
    body              NVARCHAR(MAX)     NOT NULL,
    version           INT               NOT NULL CONSTRAINT DF_prompt_templates_version DEFAULT 1,
    isActive          BIT               NOT NULL CONSTRAINT DF_prompt_templates_isActive DEFAULT 1,
    updatedById       UNIQUEIDENTIFIER  NULL,
    createdAt         DATETIME2         NOT NULL CONSTRAINT DF_prompt_templates_createdAt DEFAULT SYSUTCDATETIME(),
    updatedAt         DATETIME2         NOT NULL CONSTRAINT DF_prompt_templates_updatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_prompt_templates PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_prompt_templates_key UNIQUE ([key])
  );

  CREATE NONCLUSTERED INDEX IX_prompt_templates_type_kind
    ON app.prompt_templates (interactionType, kind);
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.tables t
  JOIN sys.schemas s ON t.schema_id = s.schema_id
  WHERE s.name = 'app' AND t.name = 'prompt_template_history'
)
BEGIN
  CREATE TABLE app.prompt_template_history (
    id                   UNIQUEIDENTIFIER  NOT NULL CONSTRAINT DF_prompt_template_history_id DEFAULT NEWSEQUENTIALID(),
    promptTemplateId     UNIQUEIDENTIFIER  NOT NULL,
    [key]                VARCHAR(200)      NOT NULL,
    version              INT               NOT NULL,
    body                 NVARCHAR(MAX)     NOT NULL,
    label                NVARCHAR(200)     NOT NULL,
    notes                NVARCHAR(MAX)     NULL,
    updatedById          UNIQUEIDENTIFIER  NULL,
    createdAt            DATETIME2         NOT NULL CONSTRAINT DF_prompt_template_history_createdAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_prompt_template_history PRIMARY KEY CLUSTERED (id)
  );

  CREATE NONCLUSTERED INDEX IX_prompt_template_history_template
    ON app.prompt_template_history (promptTemplateId, version DESC);
END;
GO
