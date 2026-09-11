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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMonthlyChargeDto } from './dto/create-monthly-charge.dto';
import { GenerateMonthlyChargesDto } from './dto/generate-monthly-charges.dto';
import { GenerateMonthlyChargesResponseDto } from './dto/generate-monthly-charges-response.dto';
import { ListMonthlyChargesQueryDto } from './dto/list-monthly-charges-query.dto';
import { MonthlyChargeResponseDto } from './dto/monthly-charge-response.dto';
import { UpdateMonthlyChargeDto } from './dto/update-monthly-charge.dto';
import { MonthlyChargesService } from './monthly-charges.service';

@ApiTags('monthly-charges')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@UseGuards(JwtAuthGuard)
@Controller('monthly-charges')
export class MonthlyChargesController {
  constructor(private readonly monthlyChargesService: MonthlyChargesService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate missing charges for ACTIVE students',
    description:
      'Idempotent. Creates PENDING charges copying Student.monthlyFee. Skips INACTIVE students and existing charges. Does not create lessons.',
  })
  @ApiOkResponse({ type: GenerateMonthlyChargesResponseDto })
  generate(@Body() dto: GenerateMonthlyChargesDto): Promise<GenerateMonthlyChargesResponseDto> {
    return this.monthlyChargesService.generate(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Create monthly charge',
    description: 'Copies Student.monthlyFee into amount. Status starts as PENDING.',
  })
  @ApiCreatedResponse({ type: MonthlyChargeResponseDto })
  @ApiConflictResponse({ description: 'Charge already exists for student/month' })
  create(@Body() dto: CreateMonthlyChargeDto): Promise<MonthlyChargeResponseDto> {
    return this.monthlyChargesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List monthly charges' })
  @ApiOkResponse({ type: MonthlyChargeResponseDto, isArray: true })
  findAll(@Query() query: ListMonthlyChargesQueryDto): Promise<MonthlyChargeResponseDto[]> {
    return this.monthlyChargesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get monthly charge by id' })
  @ApiOkResponse({ type: MonthlyChargeResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MonthlyChargeResponseDto> {
    return this.monthlyChargesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update monthly charge metadata',
    description: 'Allows dueDate and notes only. Status changes use pay/unpay.',
  })
  @ApiOkResponse({ type: MonthlyChargeResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMonthlyChargeDto,
  ): Promise<MonthlyChargeResponseDto> {
    return this.monthlyChargesService.update(id, dto);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark charge as PAID' })
  @ApiOkResponse({ type: MonthlyChargeResponseDto })
  pay(@Param('id', ParseUUIDPipe) id: string): Promise<MonthlyChargeResponseDto> {
    return this.monthlyChargesService.pay(id);
  }

  @Post(':id/unpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revert PAID charge to PENDING' })
  @ApiOkResponse({ type: MonthlyChargeResponseDto })
  unpay(@Param('id', ParseUUIDPipe) id: string): Promise<MonthlyChargeResponseDto> {
    return this.monthlyChargesService.unpay(id);
  }
}
