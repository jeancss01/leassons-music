import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { ScheduleApiService } from './schedule-api.service';
import { Schedule } from './schedule.model';

describe('ScheduleApiService', () => {
  let service: ScheduleApiService;
  let httpMock: HttpTestingController;
  const studentId = '11111111-1111-4111-8111-111111111111';
  const scheduleId = '22222222-2222-4222-8222-222222222222';
  const baseStudentUrl = `${environment.apiBaseUrl}/students/${studentId}/schedule`;
  const baseScheduleUrl = `${environment.apiBaseUrl}/schedules`;

  const schedule: Schedule = {
    id: scheduleId,
    studentId,
    weekday: 'MONDAY',
    startTime: '14:30:00',
    durationMinutes: 60,
    validFrom: '2026-01-15',
    validUntil: null,
    active: true,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScheduleApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists schedules for a student', () => {
    let result: Schedule[] | undefined;
    service.listByStudent(studentId).subscribe((schedules) => {
      result = schedules;
    });

    const req = httpMock.expectOne(baseStudentUrl);
    expect(req.request.method).toBe('GET');
    req.flush([schedule]);
    expect(result).toEqual([schedule]);
  });

  it('creates a schedule', () => {
    const body = {
      weekday: 'MONDAY' as const,
      startTime: '14:30',
      durationMinutes: 60,
      validFrom: '2026-01-15',
      active: true,
    };

    let result: Schedule | undefined;
    service.create(studentId, body).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(baseStudentUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(schedule);
    expect(result).toEqual(schedule);
  });

  it('updates a schedule', () => {
    let result: Schedule | undefined;
    service.update(scheduleId, { durationMinutes: 45 }).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseScheduleUrl}/${scheduleId}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ durationMinutes: 45 });
    req.flush({ ...schedule, durationMinutes: 45 });
    expect(result?.durationMinutes).toBe(45);
  });

  it('propagates HTTP errors', () => {
    let status: number | undefined;
    service.listByStudent(studentId).subscribe({
      next: () => undefined,
      error: (err: { status: number }) => {
        status = err.status;
      },
    });

    httpMock
      .expectOne(baseStudentUrl)
      .flush({ message: 'Student not found' }, { status: 404, statusText: 'Not Found' });
    expect(status).toBe(404);
  });
});
