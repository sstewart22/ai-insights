import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { PromptsService } from './prompts.service';
import {
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
} from './dto/upsert-prompt.dto';
import { PreviewPromptDto } from './dto/preview-prompt.dto';

const WRITE_ROLES = ['dev', 'admin'];
const READ_ROLES = ['dev', 'admin', 'supervisor'];

@Controller('uiapi/prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  list(
    @Headers('authorization') auth: string,
    @Query('interactionType') interactionType?: string,
    @Query('campaign') campaign?: string,
    @Query('kind') kind?: string,
  ) {
    this.promptsService.requireRole(auth, READ_ROLES);
    return this.promptsService.findAll({ interactionType, campaign, kind });
  }

  @Get(':id')
  get(@Headers('authorization') auth: string, @Param('id') id: string) {
    this.promptsService.requireRole(auth, READ_ROLES);
    return this.promptsService.findOne(id);
  }

  @Get(':id/history')
  history(@Headers('authorization') auth: string, @Param('id') id: string) {
    this.promptsService.requireRole(auth, READ_ROLES);
    return this.promptsService.history(id);
  }

  @Post()
  create(
    @Headers('authorization') auth: string,
    @Body() dto: CreatePromptTemplateDto,
  ) {
    const userId = this.promptsService.requireRole(auth, WRITE_ROLES);
    return this.promptsService.create(dto, userId);
  }

  @Patch(':id')
  update(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: UpdatePromptTemplateDto,
  ) {
    const userId = this.promptsService.requireRole(auth, WRITE_ROLES);
    return this.promptsService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(@Headers('authorization') auth: string, @Param('id') id: string) {
    this.promptsService.requireRole(auth, WRITE_ROLES);
    return this.promptsService.remove(id);
  }

  @Post('preview')
  preview(
    @Headers('authorization') auth: string,
    @Body() dto: PreviewPromptDto,
  ) {
    this.promptsService.requireRole(auth, READ_ROLES);
    return this.promptsService
      .preview(dto.interactionType, dto.campaign ?? null, dto.transcript)
      .then((body) => ({ body }));
  }
}
