export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export type StudentListStatusFilter = 'ACTIVE' | 'INACTIVE' | 'ALL';

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  startDate: string;
  monthlyFee: number;
  status: StudentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  name: string;
  email?: string;
  phone?: string;
  startDate: string;
  monthlyFee: number;
  notes?: string;
}

export interface UpdateStudentRequest {
  name?: string;
  email?: string | null;
  phone?: string | null;
  startDate?: string;
  monthlyFee?: number;
  notes?: string | null;
  status?: StudentStatus;
}

export interface ListStudentsParams {
  status?: StudentListStatusFilter;
}
