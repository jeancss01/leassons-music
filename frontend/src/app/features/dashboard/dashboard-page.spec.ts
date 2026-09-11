import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { Lesson } from '../students/lesson-api/lesson.model';
import { MonthlyCharge } from '../students/monthly-charge-api/monthly-charge.model';
import { Student } from '../students/student-api/student.model';
import { DashboardPage } from './dashboard-page';
import { addDaysIso, localDateIso } from './dashboard.utils';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let httpMock: HttpTestingController;

  const today = localDateIso();
  const tomorrow = addDaysIso(today, 1);
  const studentsUrl = `${environment.apiBaseUrl}/students?status=ALL`;
  const lessonsUrl = `${environment.apiBaseUrl}/lessons?from=${today}`;
  const pendingUrl = `${environment.apiBaseUrl}/monthly-charges?status=PENDING`;
  const paidUrl = `${environment.apiBaseUrl}/monthly-charges?status=PAID`;

  const students: Student[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'João Silva',
      email: null,
      phone: null,
      startDate: '2026-01-15',
      monthlyFee: 200,
      status: 'ACTIVE',
      notes: null,
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Maria Souza',
      email: null,
      phone: null,
      startDate: '2026-01-15',
      monthlyFee: 180,
      status: 'INACTIVE',
      notes: null,
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    },
  ];

  const todayLesson: Lesson = {
    id: '33333333-3333-4333-8333-333333333333',
    studentId: students[0].id,
    scheduleId: null,
    date: today,
    startTime: '09:00:00',
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

  const upcomingLesson: Lesson = {
    ...todayLesson,
    id: '44444444-4444-4444-8444-444444444444',
    date: tomorrow,
    startTime: '10:00:00',
    status: 'SCHEDULED',
  };

  const pendingCharge: MonthlyCharge = {
    id: '55555555-5555-4555-8555-555555555555',
    studentId: students[0].id,
    referenceMonth: '2026-09',
    amount: 200,
    dueDate: '2026-09-10',
    status: 'PENDING',
    paidAt: null,
    notes: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  const paidThisMonth: MonthlyCharge = {
    id: '66666666-6666-4666-8666-666666666666',
    studentId: students[0].id,
    referenceMonth: '2026-08',
    amount: 180,
    dueDate: null,
    status: 'PAID',
    paidAt: new Date().toISOString(),
    notes: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  function flushHappyPath(): void {
    httpMock.expectOne(studentsUrl).flush(students);
    httpMock.expectOne(lessonsUrl).flush([todayLesson, upcomingLesson]);
    httpMock.expectOne(pendingUrl).flush([pendingCharge]);
    httpMock.expectOne(paidUrl).flush([paidThisMonth]);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads summary cards and sections', () => {
    fixture.detectChanges();
    flushHappyPath();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Dashboard');
    expect(text).toContain('Alunos ativos');
    expect(text).toContain('1');
    expect(text).toContain('Aulas hoje');
    expect(text).toContain('João Silva');
    expect(text).toContain('Agendada');
    expect(text).toContain('Próximas aulas');
    expect(text).toContain('Mensalidades pendentes');
    expect(text).toContain('09/2026');
    expect(fixture.componentInstance.pendingAmount()).toBe(200);
    expect(fixture.componentInstance.receivedThisMonth()).toBe(180);
    expect(fixture.componentInstance.todayLessons()).toHaveLength(1);
    expect(fixture.componentInstance.upcomingLessons()).toHaveLength(1);
  });

  it('shows empty states', () => {
    fixture.detectChanges();
    httpMock.expectOne(studentsUrl).flush([students[0]]);
    httpMock.expectOne(lessonsUrl).flush([]);
    httpMock.expectOne(pendingUrl).flush([]);
    httpMock.expectOne(paidUrl).flush([]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Você não tem aulas hoje.');
    expect(text).toContain('Não há próximas aulas registradas.');
    expect(text).toContain('Nenhuma mensalidade pendente.');
  });

  it('keeps other sections when lessons fail', () => {
    fixture.detectChanges();
    httpMock.expectOne(studentsUrl).flush(students);
    httpMock
      .expectOne(lessonsUrl)
      .flush({ message: 'falha aulas' }, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(pendingUrl).flush([pendingCharge]);
    httpMock.expectOne(paidUrl).flush([]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('falha aulas');
    expect(text).toContain('Mensalidades pendentes');
    expect(text).toContain('João Silva');
    expect(fixture.componentInstance.activeStudentsCount()).toBe(1);
  });

  it('exposes navigation to lesson and student detail', () => {
    fixture.detectChanges();
    flushHappyPath();

    const hrefs = fixture.debugElement
      .queryAll(By.css('a'))
      .map((anchor) => anchor.attributes['href']);

    expect(hrefs).toContain('/students');
    expect(hrefs).toContain('/students/new');
    expect(hrefs).toContain(`/students/${todayLesson.studentId}/lesson/${todayLesson.id}`);
    expect(hrefs).toContain(`/students/${pendingCharge.studentId}`);
  });

  it('shows loading indicators initially', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando aulas');

    httpMock.expectOne(studentsUrl).flush([]);
    httpMock.expectOne(lessonsUrl).flush([]);
    httpMock.expectOne(pendingUrl).flush([]);
    httpMock.expectOne(paidUrl).flush([]);
  });
});
