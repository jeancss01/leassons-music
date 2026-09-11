import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';
import { Lesson } from '../lesson-api/lesson.model';
import { StudentLessonsSection } from './student-lessons-section';

describe('StudentLessonsSection', () => {
  let fixture: ComponentFixture<StudentLessonsSection>;
  let httpMock: HttpTestingController;
  const studentId = '11111111-1111-4111-8111-111111111111';
  const lessonsUrl = `${environment.apiBaseUrl}/lessons?studentId=${studentId}`;

  const scheduled: Lesson = {
    id: '33333333-3333-4333-8333-333333333333',
    studentId,
    scheduleId: null,
    date: '2026-09-15',
    startTime: '14:30:00',
    durationMinutes: 60,
    type: 'REGULAR',
    status: 'SCHEDULED',
    cancellationReason: null,
    content: null,
    exercises: null,
    observations: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  const completed: Lesson = {
    ...scheduled,
    id: '44444444-4444-4444-8444-444444444444',
    date: '2026-09-08',
    status: 'COMPLETED',
    type: 'MAKEUP',
  };

  const cancelled: Lesson = {
    ...scheduled,
    id: '55555555-5555-4555-8555-555555555555',
    date: '2026-09-01',
    status: 'CANCELLED',
    type: 'ONE_OFF',
    cancellationReason: 'HOLIDAY',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentLessonsSection, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentLessonsSection);
    fixture.componentRef.setInput('studentId', studentId);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads and shows lesson types and statuses', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando aulas');

    httpMock.expectOne(lessonsUrl).flush([scheduled, completed, cancelled]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Regular');
    expect(text).toContain('Reposição');
    expect(text).toContain('Avulsa');
    expect(text).toContain('Agendada');
    expect(text).toContain('Concluída');
    expect(text).toContain('Cancelada');
    expect(text).toContain('Feriado');
  });

  it('shows empty state', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma aula registrada');
  });

  it('shows error state', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(lessonsUrl)
      .flush({ message: 'falha' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('falha');
  });

  it('exposes create and detail navigation links', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([scheduled]);
    fixture.detectChanges();

    const hrefs = fixture.debugElement
      .queryAll(By.css('a'))
      .map((anchor) => anchor.attributes['href']);

    expect(hrefs).toContain(`/students/${studentId}/lesson/new`);
    expect(hrefs).toContain(`/students/${studentId}/lesson/${scheduled.id}`);
  });
});
