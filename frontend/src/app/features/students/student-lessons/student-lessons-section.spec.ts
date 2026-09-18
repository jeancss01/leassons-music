import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';
import { localDateIso } from '../../dashboard/dashboard.utils';
import { Lesson } from '../lesson-api/lesson.model';
import { StudentLessonsSection } from './student-lessons-section';

describe('StudentLessonsSection', () => {
  let fixture: ComponentFixture<StudentLessonsSection>;
  let component: StudentLessonsSection;
  let httpMock: HttpTestingController;
  let snackOpen: ReturnType<typeof vi.fn>;
  const studentId = '11111111-1111-4111-8111-111111111111';
  const lessonsUrl = `${environment.apiBaseUrl}/lessons?studentId=${studentId}`;
  const generateUrl = `${environment.apiBaseUrl}/lessons/generate`;
  const today = localDateIso();

  function shiftDays(days: number): string {
    const [year, month, day] = today.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function baseLesson(partial: Partial<Lesson> & Pick<Lesson, 'id' | 'date'>): Lesson {
    return {
      studentId,
      scheduleId: null,
      startTime: '19:00:00',
      durationMinutes: 60,
      type: 'REGULAR',
      status: 'SCHEDULED',
      cancellationReason: null,
      content: null,
      exercises: null,
      observations: null,
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
      ...partial,
    };
  }

  beforeEach(async () => {
    snackOpen = vi.fn();
    await TestBed.configureTestingModule({
      imports: [StudentLessonsSection, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
      .overrideProvider(MatSnackBar, { useValue: { open: snackOpen } })
      .compileComponents();

    fixture = TestBed.createComponent(StudentLessonsSection);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('studentId', studentId);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders diary section title', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Diário pedagógico');
  });

  it('shows empty today state', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([
      baseLesson({ id: 'u1', date: shiftDays(2), content: 'CAGED' }),
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma aula programada para hoje.');
    expect(fixture.nativeElement.textContent).toContain('CAGED');
  });

  it('highlights today lessons with planning and supports multiple today cards', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([
      baseLesson({
        id: 't2',
        date: today,
        startTime: '20:00:00',
        content: 'Ritmo',
      }),
      baseLesson({
        id: 't1',
        date: today,
        startTime: '09:00:00',
        content: 'Pentatônica menor',
        exercises: 'Improvisação',
        observations: 'Revisar digitação',
      }),
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Hoje');
    expect(text).toContain('09:00');
    expect(text).toContain('20:00');
    expect(text).toContain('Conteúdo planejado');
    expect(text).toContain('Pentatônica menor');
    expect(text).toContain('Exercícios planejados');
    expect(text).toContain('Improvisação');
    expect(text.indexOf('09:00')).toBeLessThan(text.indexOf('20:00'));
  });

  it('shows upcoming without planning and history statuses', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([
      baseLesson({ id: 'u1', date: shiftDays(5) }),
      baseLesson({
        id: 'h1',
        date: shiftDays(-3),
        status: 'COMPLETED',
        content: 'Acordes maiores',
        exercises: 'Troca G C D',
        observations: 'Boa evolução',
      }),
      baseLesson({
        id: 'h2',
        date: shiftDays(-7),
        status: 'NO_SHOW',
      }),
      baseLesson({
        id: 'h3',
        date: shiftDays(-10),
        status: 'CANCELLED',
        cancellationReason: 'HOLIDAY',
      }),
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Próximas aulas');
    expect(text).toContain('Sem planejamento');
    expect(text).toContain('Histórico');
    expect(text).toContain('Concluída');
    expect(text).toContain('Acordes maiores');
    expect(text).toContain('Falta');
    expect(text).toContain('Cancelada');
    expect(text).toContain('Feriado');
  });

  it('limits upcoming and history to five items each', () => {
    const upcoming = Array.from({ length: 6 }, (_, index) =>
      baseLesson({
        id: `u${index}`,
        date: shiftDays(index + 1),
        content: `futuro-${index}`,
      }),
    );
    const history = Array.from({ length: 6 }, (_, index) =>
      baseLesson({
        id: `h${index}`,
        date: shiftDays(-(index + 1)),
        status: 'COMPLETED',
        content: `passado-${index}`,
      }),
    );

    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([...upcoming, ...history]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('futuro-0');
    expect(text).toContain('futuro-4');
    expect(text).not.toContain('futuro-5');
    expect(text).toContain('passado-0');
    expect(text).toContain('passado-4');
    expect(text).not.toContain('passado-5');
  });

  it('exposes create, detail and plan navigation links', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([
      baseLesson({ id: 'u1', date: shiftDays(2) }),
      baseLesson({
        id: 't1',
        date: today,
        content: 'Já planejado',
      }),
    ]);
    fixture.detectChanges();

    const anchors = fixture.debugElement.queryAll(By.css('a'));
    const hrefs = anchors.map((anchor) => anchor.attributes['href']);

    expect(hrefs).toContain(`/students/${studentId}/lesson/new`);
    expect(hrefs).toContain(`/students/${studentId}/lesson/u1`);
    expect(hrefs).toContain(`/students/${studentId}/lesson/t1`);
    expect(
      anchors.some((anchor) => (anchor.attributes['href'] || '').includes('plan=1')),
    ).toBe(true);
  });

  it('shows Planejar próxima aula for the earliest future lesson', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([
      baseLesson({ id: 'later', date: shiftDays(10), startTime: '10:00:00' }),
      baseLesson({
        id: 'next',
        date: shiftDays(3),
        startTime: '19:00:00',
        content: 'CAGED',
      }),
      baseLesson({ id: 'today', date: today, startTime: '09:00:00' }),
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Planejar próxima aula');
    expect(text).toContain('CAGED');

    const planLinks = fixture.debugElement
      .queryAll(By.css('a'))
      .filter((anchor) => (anchor.nativeElement.textContent as string).includes('Planejar próxima aula'));

    expect(planLinks).toHaveLength(1);
    expect(planLinks[0].attributes['href']).toBe(
      `/students/${studentId}/lesson/next?plan=1`,
    );
  });

  it('shows no-next state with Nova aula fallback when only today/history exist', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([
      baseLesson({ id: 'today', date: today }),
      baseLesson({
        id: 'past',
        date: shiftDays(-5),
        status: 'COMPLETED',
        content: 'Acordes',
      }),
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Não há próxima aula cadastrada.');
    expect(text).not.toContain('Planejar próxima aula');
    expect(
      fixture.debugElement
        .queryAll(By.css('a'))
        .some((anchor) => anchor.attributes['href'] === `/students/${studentId}/lesson/new`),
    ).toBe(true);
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

  it('generates upcoming lessons, shows feedback and reloads diary', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Gerar próximas aulas');
    component.generateUpcoming();
    expect(component.generating()).toBe(true);

    const generateReq = httpMock.expectOne(generateUrl);
    expect(generateReq.request.method).toBe('POST');
    expect(generateReq.request.body).toEqual({ studentId });
    generateReq.flush({
      from: today,
      to: shiftDays(90),
      schedulesConsidered: 1,
      created: 12,
      alreadyExisted: 8,
    });

    const reload = httpMock.expectOne(lessonsUrl);
    reload.flush([
      baseLesson({
        id: 'u1',
        date: shiftDays(7),
        content: null,
      }),
    ]);
    fixture.detectChanges();

    expect(component.generating()).toBe(false);
    expect(snackOpen).toHaveBeenCalledWith(
      '12 aulas criadas. 8 já existiam.',
      'Fechar',
      { duration: 4500 },
    );
    expect(fixture.nativeElement.textContent).toContain('Próximas aulas');
    expect(fixture.nativeElement.textContent).toContain('Sem planejamento');
  });

  it('shows zero-created feedback and prevents duplicate generate calls', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([]);
    fixture.detectChanges();

    component.generateUpcoming();
    component.generateUpcoming();

    const requests = httpMock.match(generateUrl);
    expect(requests).toHaveLength(1);
    requests[0].flush({
      from: today,
      to: shiftDays(90),
      schedulesConsidered: 1,
      created: 0,
      alreadyExisted: 10,
    });
    httpMock.expectOne(lessonsUrl).flush([]);
    fixture.detectChanges();

    expect(snackOpen).toHaveBeenCalledWith(
      'Nenhuma aula nova foi criada. As próximas aulas já estavam cadastradas.',
      'Fechar',
      { duration: 4500 },
    );
  });

  it('keeps diary and shows error when generation fails', () => {
    fixture.detectChanges();
    httpMock.expectOne(lessonsUrl).flush([
      baseLesson({ id: 'u1', date: shiftDays(3), content: 'CAGED' }),
    ]);
    fixture.detectChanges();

    component.generateUpcoming();
    httpMock
      .expectOne(generateUrl)
      .flush({ message: 'falha gerar' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.generating()).toBe(false);
    expect(snackOpen).toHaveBeenCalledWith('falha gerar', 'Fechar', { duration: 5000 });
    expect(fixture.nativeElement.textContent).toContain('CAGED');
  });
});
