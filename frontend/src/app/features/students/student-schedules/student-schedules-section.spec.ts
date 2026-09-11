import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';
import { Schedule } from '../schedule-api/schedule.model';
import { StudentSchedulesSection } from './student-schedules-section';

describe('StudentSchedulesSection', () => {
  let fixture: ComponentFixture<StudentSchedulesSection>;
  let httpMock: HttpTestingController;
  const studentId = '11111111-1111-4111-8111-111111111111';
  const scheduleUrl = `${environment.apiBaseUrl}/students/${studentId}/schedule`;

  const activeSchedule: Schedule = {
    id: '22222222-2222-4222-8222-222222222222',
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

  const historicalSchedule: Schedule = {
    id: '33333333-3333-4333-8333-333333333333',
    studentId,
    weekday: 'WEDNESDAY',
    startTime: '10:00:00',
    durationMinutes: 45,
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
    active: false,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentSchedulesSection, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentSchedulesSection);
    fixture.componentRef.setInput('studentId', studentId);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads and shows active and historical schedules', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando horários');

    httpMock.expectOne(scheduleUrl).flush([activeSchedule, historicalSchedule]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Segunda-feira');
    expect(text).toContain('Ativo');
    expect(text).toContain('Quarta-feira');
    expect(text).toContain('Histórico');
    expect(text).toContain('14:30');
    expect(text).toContain('10:00');
  });

  it('shows empty state', () => {
    fixture.detectChanges();
    httpMock.expectOne(scheduleUrl).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhum horário cadastrado');
  });

  it('shows error state', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(scheduleUrl)
      .flush({ message: 'falha' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('falha');
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
  });

  it('exposes create and edit navigation links', () => {
    fixture.detectChanges();
    httpMock.expectOne(scheduleUrl).flush([activeSchedule]);
    fixture.detectChanges();

    const hrefs = fixture.debugElement
      .queryAll(By.css('a'))
      .map((anchor) => anchor.attributes['href']);

    expect(hrefs).toContain(`/students/${studentId}/schedule/new`);
    expect(hrefs).toContain(`/students/${studentId}/schedule/${activeSchedule.id}/edit`);
  });
});
