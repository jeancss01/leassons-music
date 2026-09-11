import { Student } from '@prisma/client';
import { StudentResponseDto } from './dto/student-response.dto';

export function toStudentResponse(student: Student): StudentResponseDto {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    startDate: formatDateOnly(student.startDate),
    monthlyFee: Number(student.monthlyFee),
    status: student.status,
    notes: student.notes,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
  };
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
