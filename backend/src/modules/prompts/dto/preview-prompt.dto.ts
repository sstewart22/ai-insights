import { IsIn, IsOptional, IsString } from 'class-validator';

export class PreviewPromptDto {
  @IsIn(['call', 'chat'])
  interactionType!: 'call' | 'chat';

  @IsOptional()
  @IsString()
  campaign?: string | null;

  @IsOptional()
  @IsString()
  transcript?: string;
}
