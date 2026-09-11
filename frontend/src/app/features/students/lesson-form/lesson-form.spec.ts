import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Lesson } from '../lesson-api/lesson.model';
import { LessonForm } from './lesson-form';

describe('LessonForm', () => {
  let fixture: ComponentFixture<LessonForm>;
  let component: LessonForm;
  let httpMock: HttpTestingController;
  let router: Router;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const lessonId = '33333333-3333-4333-8333-333333333333';
  const lessonsUrl = `${environment.apiBaseUrl}/lessons`;
  const schedulesUrl = `${environment.apiBaseUrl}/students/${studentId}/schedule`;

  const lesson: Lesson = {
    id: lessonId,
    studentId,
    scheduleId: null,
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

  async function setup(params: { id: string; lessonId: string | null }): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [LessonForm, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (key: string) => {
                if (key === 'id') {
                  return params.id;
                }
                if (key === 'lessonId') {
                  return params.lessonId;
                }
                return null;
              },
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LessonForm);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  function flushSchedules(): void {
    httpMock.expectOne(schedulesUrl).flush([]);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('validates required fields', async () => {
    await setup({ id: studentId, lessonId: null });
    fixture.detectChanges();
    flushSchedules();

    component.form.patchValue({
      date: '',
      startTime: '',
      durationMinutes: 0,
      type: 'REGULAR',
    });
    component.submit();

    expect(component.form.invalid).toBe(true);
    httpMock.expectNone(lessonsUrl);
  });

  it('creates a lesson without sending status', async () => {
    await setup({ id: studentId, lessonId: null });
    fixture.detectChanges();
    flushSchedules();

    component.form.patchValue({
      date: '2026-09-15',
      startTime: '14:30',
      durationMinutes: 60,
      type: 'REGULAR',
      content: 'Intro',
    });
    component.submit();

    expect(component.submitting()).toBe(true);

    const req = httpMock.expectOne(lessonsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      studentId,
      date: '2026-09-15',
      startTime: '14:30',
      durationMinutes: 60,
      type: 'REGULAR',
      content: 'Intro',
    });
    expect(req.request.body.status).toBeUndefined();
    req.flush(lesson);

    expect(router.navigate).toHaveBeenCalledWith(['/students', studentId, 'lesson', lesson.id]);
  });

  it('loads and updates a lesson', async () => {
    await setup({ id: studentId, lessonId });
    fixture.detectChanges();
    flushSchedules();

    httpMock.expectOne(`${lessonsUrl}/${lessonId}`).flush(lesson);
    fixture.detectChanges();

    expect(component.form.controls.startTime.value).toBe('14:30');
    expect(fixture.nativeElement.textContent).toContain('não altera');

    component.form.patchValue({ content: 'Escala maior' });
    component.submit();

    const req = httpMock.expectOne(`${lessonsUrl}/${lessonId}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.content).toBe('Escala maior');
    expect(req.request.body.status).toBeUndefined();
    req.flush({ ...lesson, content: 'Escala maior' });

    expect(router.navigate).toHaveBeenCalledWith(['/students', studentId, 'lesson', lessonId]);
  });

  it('shows API error on create failure', async () => {
    await setup({ id: studentId, lessonId: null });
    fixture.detectChanges();
    flushSchedules();

    component.form.patchValue({
      date: '2026-09-15',
      startTime: '14:30',
      durationMinutes: 60,
      type: 'ONE_OFF',
    });
    component.submit();

    httpMock
      .expectOne(lessonsUrl)
      .flush({ message: 'Schedule does not belong to the lesson student' }, {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Schedule does not belong to the lesson student',
    );
  });
});
