import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Schedule } from '../schedule-api/schedule.model';
import { ScheduleForm } from './schedule-form';

describe('ScheduleForm', () => {
  let fixture: ComponentFixture<ScheduleForm>;
  let component: ScheduleForm;
  let httpMock: HttpTestingController;
  let router: Router;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const scheduleId = '22222222-2222-4222-8222-222222222222';
  const studentScheduleUrl = `${environment.apiBaseUrl}/students/${studentId}/schedule`;
  const scheduleUrl = `${environment.apiBaseUrl}/schedules/${scheduleId}`;

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

  async function setup(params: { id: string; scheduleId: string | null }): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ScheduleForm, NoopAnimationsModule],
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
                if (key === 'scheduleId') {
                  return params.scheduleId;
                }
                return null;
              },
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleForm);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('validates required fields and date range', async () => {
    await setup({ id: studentId, scheduleId: null });
    fixture.detectChanges();

    component.form.patchValue({
      weekday: 'MONDAY',
      startTime: '',
      durationMinutes: 0,
      validFrom: '2026-06-01',
      validUntil: '2026-01-01',
    });
    component.submit();

    expect(component.form.invalid).toBe(true);
    httpMock.expectNone(studentScheduleUrl);
  });

  it('creates a schedule', async () => {
    await setup({ id: studentId, scheduleId: null });
    fixture.detectChanges();

    component.form.patchValue({
      weekday: 'MONDAY',
      startTime: '14:30',
      durationMinutes: 60,
      validFrom: '2026-01-15',
      validUntil: '',
      active: true,
    });
    component.submit();

    const req = httpMock.expectOne(studentScheduleUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      weekday: 'MONDAY',
      startTime: '14:30',
      durationMinutes: 60,
      validFrom: '2026-01-15',
      active: true,
    });
    req.flush(schedule);

    expect(router.navigate).toHaveBeenCalledWith(['/students', studentId]);
  });

  it('loads and updates a schedule', async () => {
    await setup({ id: studentId, scheduleId });
    fixture.detectChanges();

    httpMock.expectOne(studentScheduleUrl).flush([schedule]);
    fixture.detectChanges();

    expect(component.form.controls.startTime.value).toBe('14:30');
    expect(fixture.nativeElement.textContent).toContain('não alteram');

    component.form.patchValue({ durationMinutes: 45 });
    component.submit();

    const req = httpMock.expectOne(scheduleUrl);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.durationMinutes).toBe(45);
    expect(req.request.body.validUntil).toBeNull();
    req.flush({ ...schedule, durationMinutes: 45 });

    expect(router.navigate).toHaveBeenCalledWith(['/students', studentId]);
  });

  it('shows API error on create failure', async () => {
    await setup({ id: studentId, scheduleId: null });
    fixture.detectChanges();

    component.form.patchValue({
      weekday: 'MONDAY',
      startTime: '14:30',
      durationMinutes: 60,
      validFrom: '2026-01-15',
    });
    component.submit();

    httpMock
      .expectOne(studentScheduleUrl)
      .flush({ message: 'validUntil cannot be earlier than validFrom' }, {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'validUntil cannot be earlier than validFrom',
    );
  });
});
