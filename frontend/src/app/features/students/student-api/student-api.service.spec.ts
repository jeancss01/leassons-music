import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { StudentApiService } from './student-api.service';
import { Student } from './student.model';

describe('StudentApiService', () => {
  let service: StudentApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/students`;

  const student: Student = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Maria Silva',
    email: 'maria@example.com',
    phone: '+55 11 99999-0000',
    startDate: '2026-01-15',
    monthlyFee: 200,
    status: 'ACTIVE',
    notes: 'Iniciante',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists students with optional status filter', () => {
    let result: Student[] | undefined;
    service.list({ status: 'ACTIVE' }).subscribe((students) => {
      result = students;
    });

    const req = httpMock.expectOne(`${baseUrl}?status=ACTIVE`);
    expect(req.request.method).toBe('GET');
    req.flush([student]);
    expect(result).toEqual([student]);
  });

  it('gets a student by id', () => {
    let result: Student | undefined;
    service.getById(student.id).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${student.id}`);
    expect(req.request.method).toBe('GET');
    req.flush(student);
    expect(result).toEqual(student);
  });

  it('creates a student', () => {
    const body = {
      name: 'Maria Silva',
      startDate: '2026-01-15',
      monthlyFee: 200,
    };

    let result: Student | undefined;
    service.create(body).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(student);
    expect(result).toEqual(student);
  });

  it('updates a student', () => {
    let result: Student | undefined;
    service.update(student.id, { monthlyFee: 220 }).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${student.id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ monthlyFee: 220 });
    req.flush({ ...student, monthlyFee: 220 });
    expect(result?.monthlyFee).toBe(220);
  });

  it('inactivates a student', () => {
    let result: Student | undefined;
    service.inactivate(student.id).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${student.id}/inactivate`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...student, status: 'INACTIVE' });
    expect(result?.status).toBe('INACTIVE');
  });

  it('activates a student via PATCH status', () => {
    let result: Student | undefined;
    service.activate(student.id).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${student.id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'ACTIVE' });
    req.flush({ ...student, status: 'ACTIVE' });
    expect(result?.status).toBe('ACTIVE');
  });

  it('propagates HTTP errors', () => {
    let status: number | undefined;
    service.getById(student.id).subscribe({
      next: () => undefined,
      error: (err: { status: number }) => {
        status = err.status;
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/${student.id}`);
    req.flush({ message: 'Student not found' }, { status: 404, statusText: 'Not Found' });
    expect(status).toBe(404);
  });
});
