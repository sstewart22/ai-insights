import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PromptTemplate } from '../../db/entities/prompt-template.entity';
import { PromptTemplateHistory } from '../../db/entities/prompt-template-history.entity';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromptTemplate, PromptTemplateHistory]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    }),
  ],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
