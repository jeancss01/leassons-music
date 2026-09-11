export type MonthlyChargeStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export const MONTHLY_CHARGE_STATUS_LABELS: Record<MonthlyChargeStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
};

export interface MonthlyCharge {
  id: string;
  studentId: string;
  referenceMonth: string;
  amount: number;
  dueDate: string | null;
  status: MonthlyChargeStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListMonthlyChargesParams {
  studentId?: string;
  referenceMonth?: string;
  status?: MonthlyChargeStatus;
}

export interface CreateMonthlyChargeRequest {
  studentId: string;
  referenceMonth: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateMonthlyChargeRequest {
  dueDate?: string | null;
  notes?: string | null;
}

export interface GenerateMonthlyChargesRequest {
  referenceMonth: string;
}

export interface GenerateMonthlyChargesResponse {
  referenceMonth: string;
  activeStudents: number;
  created: number;
  alreadyExisted: number;
  createdStudentIds: string[];
  skippedStudentIds: string[];
}

/** Current calendar month as YYYY-MM (local). */
export function currentReferenceMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Display YYYY-MM as MM/YYYY. */
export function formatReferenceMonth(referenceMonth: string): string {
  const [year, month] = referenceMonth.split('-');
  if (!year || !month) {
    return referenceMonth;
  }
  return `${month}/${year}`;
}
