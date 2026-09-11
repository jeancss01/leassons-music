import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CancelLessonDto } from './dto/cancel-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { LessonResponseDto } from './dto/lesson-response.dto';
import { ListLessonsQueryDto } from './dto/list-lessons-query.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonsService } from './lessons.service';

@ApiTags('lessons')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create lesson',
    description: 'Creates a lesson in SCHEDULED status. Status changes use dedicated commands.',
  })
  @ApiCreatedResponse({ type: LessonResponseDto })
  create(@Body() dto: CreateLessonDto): Promise<LessonResponseDto> {
    return this.lessonsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List lessons with optional filters' })
  @ApiOkResponse({ type: LessonResponseDto, isArray: true })
  findAll(@Query() query: ListLessonsQueryDto): Promise<LessonResponseDto[]> {
    return this.lessonsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson by id' })
  @ApiOkResponse({ type: LessonResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LessonResponseDto> {
    return this.lessonsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update lesson data',
    description:
      'Updates lesson fields only. Does not change status or mutate Schedule. Exceptional time changes go on the Lesson itself.',
  })
  @ApiOkResponse({ type: LessonResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<LessonResponseDto> {
    return this.lessonsService.update(id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark scheduled lesson as COMPLETED' })
  @ApiOkResponse({ type: LessonResponseDto })
  complete(@Param('id', ParseUUIDPipe) id: string): Promise<LessonResponseDto> {
    return this.lessonsService.complete(id);
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark scheduled lesson as NO_SHOW' })
  @ApiOkResponse({ type: LessonResponseDto })
  noShow(@Param('id', ParseUUIDPipe) id: string): Promise<LessonResponseDto> {
    return this.lessonsService.noShow(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a scheduled lesson',
    description: 'Requires cancellationReason. Does not create a makeup lesson automatically.',
  })
  @ApiOkResponse({ type: LessonResponseDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelLessonDto,
  ): Promise<LessonResponseDto> {
    return this.lessonsService.cancel(id, dto);
  }
}
