import {
  Body,
  Controller,
  Get,
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
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create student' })
  @ApiCreatedResponse({ type: StudentResponseDto })
  create(@Body() dto: CreateStudentDto): Promise<StudentResponseDto> {
    return this.studentsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List students',
    description: 'Default filter status=ACTIVE (BR-004). Use status=ALL to include inactive.',
  })
  @ApiOkResponse({ type: StudentResponseDto, isArray: true })
  findAll(@Query() query: ListStudentsQueryDto): Promise<StudentResponseDto[]> {
    return this.studentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by id' })
  @ApiOkResponse({ type: StudentResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StudentResponseDto> {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update student' })
  @ApiOkResponse({ type: StudentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.update(id, dto);
  }

  @Patch(':id/inactivate')
  @ApiOperation({
    summary: 'Inactivate student',
    description: 'Sets status=INACTIVE without deleting history (BR-003, BR-006).',
  })
  @ApiOkResponse({ type: StudentResponseDto })
  inactivate(@Param('id', ParseUUIDPipe) id: string): Promise<StudentResponseDto> {
    return this.studentsService.inactivate(id);
  }
}
