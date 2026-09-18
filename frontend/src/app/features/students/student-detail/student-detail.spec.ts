import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Student } from '../student-api/student.model';
import { StudentDetail } from './student-detail';

describe('StudentDetail', () => {
  let fixture: ComponentFixture<StudentDetail>;
  let component: StudentDetail;
  let httpMock: HttpTestingController;
  let router: Router;
  const baseUrl = `${environment.apiBaseUrl}/students`;
  const studentId = '11111111-1111-4111-8111-111111111111';

  const student: Student = {
    id: studentId,
    name: 'Maria Silva',
    email: 'maria@example.com',
    phone: '+55 11 99999-0000',
    startDate: '2026-01-15',
    monthlyFee: 200,
    status: 'ACTIVE',
    notes: 'Iniciante',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  function flushStudentSections(): void {
    httpMock.expectOne(`${baseUrl}/${studentId}`).flush(student);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/${studentId}/schedule`).flush([]);
    httpMock.expectOne(`${environment.apiBaseUrl}/lessons?studentId=${studentId}`).flush([]);
    httpMock
      .expectOne(`${environment.apiBaseUrl}/monthly-charges?studentId=${studentId}`)
      .flush([]);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentDetail, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: studentId }),
            },
          },
        },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: () => of(true) }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentDetail);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads and renders student details with schedule, lessons and finance sections', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando aluno');

    flushStudentSections();

    expect(fixture.nativeElement.textContent).toContain('Maria Silva');
    expect(fixture.nativeElement.textContent).toContain('Horário semanal');
    expect(fixture.nativeElement.textContent).toContain('Diário pedagógico');
    expect(fixture.nativeElement.textContent).toContain('Financeiro');
    expect(fixture.nativeElement.textContent).toContain('Frequência');
  });

  it('shows error state', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${baseUrl}/${studentId}`)
      .flush({ message: 'Student not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Student not found');
  });

  it('navigates to edit', () => {
    fixture.detectChanges();
    flushStudentSections();

    component.edit();
    expect(router.navigate).toHaveBeenCalledWith(['/students', studentId, 'edit']);
  });

  it('inactivates the student', () => {
    fixture.detectChanges();
    flushStudentSections();

    component.inactivate();

    const req = httpMock.expectOne(`${baseUrl}/${studentId}/inactivate`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...student, status: 'INACTIVE' });
    fixture.detectChanges();

    expect(component.student()?.status).toBe('INACTIVE');
  });

  it('activates an inactive student', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/${studentId}`).flush({ ...student, status: 'INACTIVE' });
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/${studentId}/schedule`).flush([]);
    httpMock.expectOne(`${environment.apiBaseUrl}/lessons?studentId=${studentId}`).flush([]);
    httpMock
      .expectOne(`${environment.apiBaseUrl}/monthly-charges?studentId=${studentId}`)
      .flush([]);
    fixture.detectChanges();

    component.activate();

    const req = httpMock.expectOne(`${baseUrl}/${studentId}`);
    expect(req.request.body).toEqual({ status: 'ACTIVE' });
    req.flush(student);
    fixture.detectChanges();

    expect(component.student()?.status).toBe('ACTIVE');
  });
});
