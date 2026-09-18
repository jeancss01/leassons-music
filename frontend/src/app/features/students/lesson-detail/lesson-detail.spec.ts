import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Lesson } from '../lesson-api/lesson.model';
import { LessonDetail } from './lesson-detail';

describe('LessonDetail', () => {
  let fixture: ComponentFixture<LessonDetail>;
  let component: LessonDetail;
  let httpMock: HttpTestingController;
  let snackOpen: ReturnType<typeof vi.fn>;
  let dialogAfterClosed: ReturnType<typeof vi.fn>;
  let routerNavigate: ReturnType<typeof vi.spyOn>;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const lessonId = '33333333-3333-4333-8333-333333333333';
  const lessonUrl = `${environment.apiBaseUrl}/lessons/${lessonId}`;

  const lesson: Lesson = {
    id: lessonId,
    studentId,
    scheduleId: null,
    date: '2026-09-23',
    startTime: '14:30:00',
    durationMinutes: 60,
    type: 'REGULAR',
    status: 'SCHEDULED',
    cancellationReason: null,
    content: 'Intro',
    exercises: 'Cromáticos',
    observations: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  async function setup(
    dialogResult: unknown = null,
    queryParams: Record<string, string> = {},
  ): Promise<void> {
    dialogAfterClosed = vi.fn(() => of(dialogResult));
    snackOpen = vi.fn();

    await TestBed.configureTestingModule({
      imports: [LessonDetail, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(queryParams),
            },
            paramMap: of({
              get: (key: string) => {
                if (key === 'id') {
                  return studentId;
                }
                if (key === 'lessonId') {
                  return lessonId;
                }
                return null;
              },
            }),
          },
        },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: dialogAfterClosed }),
          },
        },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: { open: snackOpen } })
      .compileComponents();

    fixture = TestBed.createComponent(LessonDetail);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    routerNavigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('shows planning language for scheduled future lesson with content', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush(lesson);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Planejamento');
    expect(text).toContain('Conteúdo planejado');
    expect(text).toContain('Exercícios planejados');
    expect(text).toContain('Intro');
    expect(text).toContain('Cromáticos');
    expect(text).toContain('Editar planejamento');
    expect(text).toContain('Marcar como concluída');
  });

  it('shows empty planning state for scheduled lesson without content', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush({
      ...lesson,
      content: null,
      exercises: null,
      observations: null,
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sem planejamento.');
    expect(text).toContain('Planejar aula');
  });

  it('opens planning editor from plan query param', async () => {
    await setup(null, { plan: '1' });
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush({
      ...lesson,
      content: null,
      exercises: null,
      observations: null,
    });
    fixture.detectChanges();

    expect(component.editingDiary()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Salvar planejamento');
    expect(routerNavigate).toHaveBeenCalled();
  });

  it('enters planning edit mode with current values', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush(lesson);
    fixture.detectChanges();

    component.startDiaryEdit();
    fixture.detectChanges();

    expect(component.editingDiary()).toBe(true);
    expect(component.diaryForm.getRawValue()).toEqual({
      content: 'Intro',
      exercises: 'Cromáticos',
      observations: '',
    });
    expect(fixture.nativeElement.textContent).toContain('Salvar planejamento');
  });

  it('saves planning via PATCH without status', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush(lesson);
    fixture.detectChanges();

    component.startDiaryEdit();
    component.diaryForm.patchValue({
      content: 'CAGED — posição 2',
      exercises: 'Troca entre posições',
      observations: 'Revisar exercício',
    });
    component.saveDiary();

    expect(component.savingDiary()).toBe(true);

    const req = httpMock.expectOne(lessonUrl);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      content: 'CAGED — posição 2',
      exercises: 'Troca entre posições',
      observations: 'Revisar exercício',
    });
    expect(req.request.body.status).toBeUndefined();
    expect(req.request.body.scheduleId).toBeUndefined();

    req.flush({
      ...lesson,
      content: 'CAGED — posição 2',
      exercises: 'Troca entre posições',
      observations: 'Revisar exercício',
    });
    fixture.detectChanges();

    expect(component.editingDiary()).toBe(false);
    expect(component.lesson()?.status).toBe('SCHEDULED');
    expect(fixture.nativeElement.textContent).toContain('CAGED — posição 2');
    expect(snackOpen).toHaveBeenCalledWith('Planejamento atualizado.', 'Fechar', {
      duration: 3000,
    });
  });

  it('saves completed diary via PATCH without status', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush({ ...lesson, status: 'COMPLETED' });
    fixture.detectChanges();

    component.startDiaryEdit();
    component.diaryForm.patchValue({
      content: 'Escala maior',
      exercises: 'Arpejos',
      observations: 'Bom progresso',
    });
    component.saveDiary();

    const req = httpMock.expectOne(lessonUrl);
    expect(req.request.body).toEqual({
      content: 'Escala maior',
      exercises: 'Arpejos',
      observations: 'Bom progresso',
    });
    expect(req.request.body.status).toBeUndefined();

    req.flush({
      ...lesson,
      status: 'COMPLETED',
      content: 'Escala maior',
      exercises: 'Arpejos',
      observations: 'Bom progresso',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Diário da aula');
    expect(fixture.nativeElement.textContent).toContain('Escala maior');
    expect(snackOpen).toHaveBeenCalledWith('Diário atualizado.', 'Fechar', { duration: 3000 });
  });

  it('prevents duplicate save requests while saving', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush(lesson);
    fixture.detectChanges();

    component.startDiaryEdit();
    component.diaryForm.patchValue({ content: 'Novo' });
    component.saveDiary();
    component.saveDiary();

    const requests = httpMock.match(lessonUrl);
    expect(requests).toHaveLength(1);
    requests[0].flush({ ...lesson, content: 'Novo' });
  });

  it('keeps edit mode and typed text after save error', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush(lesson);
    fixture.detectChanges();

    component.startDiaryEdit();
    component.diaryForm.patchValue({ content: 'Texto rascunho' });
    component.saveDiary();

    httpMock
      .expectOne(lessonUrl)
      .flush({ message: 'falha ao salvar' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.editingDiary()).toBe(true);
    expect(component.diaryForm.controls.content.value).toBe('Texto rascunho');
    expect(fixture.nativeElement.textContent).toContain('falha ao salvar');
  });

  it('cancels dirty diary edits after confirmation', async () => {
    await setup(true);
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush(lesson);
    fixture.detectChanges();

    component.startDiaryEdit();
    component.diaryForm.patchValue({ content: 'Rascunho' });
    component.diaryForm.markAsDirty();
    component.cancelDiaryEdit();
    fixture.detectChanges();

    expect(component.editingDiary()).toBe(false);
    expect(httpMock.match(lessonUrl)).toHaveLength(0);
  });

  it('cancels pristine diary edits without confirmation', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush(lesson);
    fixture.detectChanges();

    component.startDiaryEdit();
    component.cancelDiaryEdit();
    fixture.detectChanges();

    expect(component.editingDiary()).toBe(false);
    expect(dialogAfterClosed).not.toHaveBeenCalled();
  });

  it('completes a scheduled lesson and stays on detail', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush(lesson);
    fixture.detectChanges();

    component.complete();

    const req = httpMock.expectOne(`${lessonUrl}/complete`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...lesson, status: 'COMPLETED' });
    fixture.detectChanges();

    expect(component.lesson()?.status).toBe('COMPLETED');
    expect(fixture.nativeElement.textContent).not.toContain('Marcar como concluída');
    expect(fixture.nativeElement.textContent).toContain('Editar diário');
  });

  it('cancels a lesson with reason from dialog', async () => {
    await setup('HOLIDAY');
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush(lesson);
    fixture.detectChanges();

    component.cancel();

    const req = httpMock.expectOne(`${lessonUrl}/cancel`);
    expect(req.request.body).toEqual({ cancellationReason: 'HOLIDAY' });
    req.flush({
      ...lesson,
      status: 'CANCELLED',
      cancellationReason: 'HOLIDAY',
    });
    fixture.detectChanges();

    expect(component.lesson()?.status).toBe('CANCELLED');
    expect(fixture.nativeElement.textContent).toContain('Feriado');
  });

  it('hides status actions for completed lessons but keeps diary edit', async () => {
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(lessonUrl).flush({ ...lesson, status: 'COMPLETED' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Marcar como concluída');
    expect(fixture.nativeElement.textContent).toContain('Editar dados');
    expect(fixture.nativeElement.textContent).toContain('Editar diário');
    expect(fixture.nativeElement.textContent).toContain('Diário da aula');
  });
});
