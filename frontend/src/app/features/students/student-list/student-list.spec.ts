import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Student } from '../student-api/student.model';
import { StudentList } from './student-list';

describe('StudentList', () => {
  let fixture: ComponentFixture<StudentList>;
  let httpMock: HttpTestingController;
  let router: Router;
  const baseUrl = `${environment.apiBaseUrl}/students`;

  const student: Student = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Maria Silva',
    email: 'maria@example.com',
    phone: '+55 11 99999-0000',
    startDate: '2026-01-15',
    monthlyFee: 200,
    status: 'ACTIVE',
    notes: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentList, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: () => of(false) }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentList);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows loading then renders students', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando alunos');

    const req = httpMock.expectOne(`${baseUrl}?status=ACTIVE`);
    req.flush([student]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Maria Silva');
    expect(fixture.nativeElement.textContent).toContain('Ativo');
  });

  it('shows empty state', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}?status=ACTIVE`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhum aluno encontrado');
  });

  it('shows error state', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}?status=ACTIVE`)
      .flush({ message: 'falha' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('falha');
    expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
  });

  it('exposes detail and edit links', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}?status=ACTIVE`).flush([student]);
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).map((anchor) => anchor.getAttribute('href'));

    expect(links).toContain(`/students/${student.id}`);
    expect(links).toContain(`/students/${student.id}/edit`);
    expect(router).toBeTruthy();
  });
});
