import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { LessonApiService } from './lesson-api.service';
import { Lesson } from './lesson.model';

describe('LessonApiService', () => {
  let service: LessonApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/lessons`;
  const studentId = '11111111-1111-4111-8111-111111111111';
  const lessonId = '33333333-3333-4333-8333-333333333333';

  const lesson: Lesson = {
    id: lessonId,
    studentId,
    scheduleId: '22222222-2222-4222-8222-222222222222',
    date: '2026-09-15',
    startTime: '14:30:00',
    durationMinutes: 60,
    type: 'REGULAR',
    status: 'SCHEDULED',
    cancellationReason: null,
    content: 'Intro',
    exercises: null,
    observations: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LessonApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists lessons with studentId filter', () => {
    let result: Lesson[] | undefined;
    service.list({ studentId }).subscribe((lessons) => {
      result = lessons;
    });

    const req = httpMock.expectOne(`${baseUrl}?studentId=${studentId}`);
    expect(req.request.method).toBe('GET');
    req.flush([lesson]);
    expect(result).toEqual([lesson]);
  });

  it('gets a lesson by id', () => {
    let result: Lesson | undefined;
    service.getById(lessonId).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${lessonId}`);
    expect(req.request.method).toBe('GET');
    req.flush(lesson);
    expect(result).toEqual(lesson);
  });

  it('creates a lesson without status', () => {
    const body = {
      studentId,
      date: '2026-09-15',
      startTime: '14:30',
      durationMinutes: 60,
      type: 'REGULAR' as const,
    };

    let result: Lesson | undefined;
    service.create(body).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.body.status).toBeUndefined();
    req.flush(lesson);
    expect(result).toEqual(lesson);
  });

  it('generates upcoming lessons for a student', () => {
    let result: { created: number; alreadyExisted: number } | undefined;
    service.generate({ studentId }).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ studentId });
    req.flush({
      from: '2026-09-18',
      to: '2026-12-18',
      schedulesConsidered: 1,
      created: 12,
      alreadyExisted: 8,
    });
    expect(result).toEqual({
      from: '2026-09-18',
      to: '2026-12-18',
      schedulesConsidered: 1,
      created: 12,
      alreadyExisted: 8,
    });
  });

  it('updates a lesson', () => {
    let result: Lesson | undefined;
    service.update(lessonId, { content: 'Escala' }).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${lessonId}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ content: 'Escala' });
    req.flush({ ...lesson, content: 'Escala' });
    expect(result?.content).toBe('Escala');
  });

  it('marks lesson as completed', () => {
    let result: Lesson | undefined;
    service.complete(lessonId).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${lessonId}/complete`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...lesson, status: 'COMPLETED' });
    expect(result?.status).toBe('COMPLETED');
  });

  it('marks lesson as no-show', () => {
    let result: Lesson | undefined;
    service.noShow(lessonId).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${lessonId}/no-show`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...lesson, status: 'NO_SHOW' });
    expect(result?.status).toBe('NO_SHOW');
  });

  it('cancels a lesson with reason', () => {
    let result: Lesson | undefined;
    service.cancel(lessonId, { cancellationReason: 'HOLIDAY' }).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${lessonId}/cancel`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cancellationReason: 'HOLIDAY' });
    req.flush({
      ...lesson,
      status: 'CANCELLED',
      cancellationReason: 'HOLIDAY',
    });
    expect(result?.status).toBe('CANCELLED');
  });

  it('propagates HTTP errors', () => {
    let status: number | undefined;
    service.getById(lessonId).subscribe({
      next: () => undefined,
      error: (err: { status: number }) => {
        status = err.status;
      },
    });

    httpMock
      .expectOne(`${baseUrl}/${lessonId}`)
      .flush({ message: 'Lesson not found' }, { status: 404, statusText: 'Not Found' });
    expect(status).toBe(404);
  });
});
