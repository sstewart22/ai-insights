import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export const PROMPT_INTERACTION_TYPES = ['call', 'chat', 'shared'] as const;
export const PROMPT_KINDS = [
  'base',
  'campaign_section',
  'opportunity_section',
  'operations_section',
  'operations_schema',
  'qa_section',
  'qa_schema',
  'objection_section',
  'objection_schema',
  'other',
] as const;

export class CreatePromptTemplateDto {
  @IsString()
  @Length(1, 200)
  key!: string;

  @IsIn([...PROMPT_INTERACTION_TYPES])
  interactionType!: (typeof PROMPT_INTERACTION_TYPES)[number];

  @IsIn([...PROMPT_KINDS])
  kind!: (typeof PROMPT_KINDS)[number];

  @IsOptional()
  @IsString()
  @Length(0, 100)
  campaign?: string | null;

  @IsString()
  @Length(1, 200)
  label!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsString()
  body!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromptTemplateDto {
  @IsOptional()
  @IsIn([...PROMPT_INTERACTION_TYPES])
  interactionType?: (typeof PROMPT_INTERACTION_TYPES)[number];

  @IsOptional()
  @IsIn([...PROMPT_KINDS])
  kind?: (typeof PROMPT_KINDS)[number];

  @IsOptional()
  @IsString()
  @Length(0, 100)
  campaign?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  label?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
