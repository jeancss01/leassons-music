import { MonthlyCharge } from '@prisma/client';
import { MonthlyChargeResponseDto } from './dto/monthly-charge-response.dto';

export function toMonthlyChargeResponse(charge: MonthlyCharge): MonthlyChargeResponseDto {
  return {
    id: charge.id,
    studentId: charge.studentId,
    referenceMonth: charge.referenceMonth,
    amount: Number(charge.amount),
    dueDate: charge.dueDate ? formatDateOnly(charge.dueDate) : null,
    status: charge.status,
    paidAt: charge.paidAt ? charge.paidAt.toISOString() : null,
    notes: charge.notes,
    createdAt: charge.createdAt.toISOString(),
    updatedAt: charge.updatedAt.toISOString(),
  };
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
