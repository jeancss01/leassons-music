import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Student } from '../student-api/student.model';
import { StudentForm } from './student-form';

describe('StudentForm', () => {
  let fixture: ComponentFixture<StudentForm>;
  let component: StudentForm;
  let httpMock: HttpTestingController;
  let router: Router;
  const baseUrl = `${environment.apiBaseUrl}/students`;

  const student: Student = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Maria Silva',
    email: 'maria@example.com',
    phone: null,
    startDate: '2026-01-15',
    monthlyFee: 200,
    status: 'ACTIVE',
    notes: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  async function setup(id: string | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [StudentForm, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (key: string) => (key === 'id' ? id : null),
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentForm);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('requires name, startDate and non-negative monthlyFee', async () => {
    await setup(null);
    fixture.detectChanges();

    component.form.patchValue({
      name: '',
      startDate: '',
      monthlyFee: -1,
    });
    component.submit();

    expect(component.form.invalid).toBe(true);
    httpMock.expectNone(baseUrl);
  });

  it('creates a student and navigates to detail', async () => {
    await setup(null);
    fixture.detectChanges();

    component.form.patchValue({
      name: 'Maria Silva',
      email: 'maria@example.com',
      startDate: '2026-01-15',
      monthlyFee: 200,
    });
    component.submit();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Maria Silva',
      email: 'maria@example.com',
      startDate: '2026-01-15',
      monthlyFee: 200,
    });
    req.flush(student);

    expect(router.navigate).toHaveBeenCalledWith(['/students', student.id]);
  });

  it('loads and updates a student', async () => {
    await setup(student.id);
    fixture.detectChanges();

    httpMock.expectOne(`${baseUrl}/${student.id}`).flush(student);
    fixture.detectChanges();

    component.form.patchValue({ monthlyFee: 220 });
    component.submit();

    const req = httpMock.expectOne(`${baseUrl}/${student.id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.monthlyFee).toBe(220);
    req.flush({ ...student, monthlyFee: 220 });

    expect(router.navigate).toHaveBeenCalledWith(['/students', student.id]);
  });

  it('shows API error on create failure', async () => {
    await setup(null);
    fixture.detectChanges();

    component.form.patchValue({
      name: 'Maria Silva',
      startDate: '2026-01-15',
      monthlyFee: 200,
    });
    component.submit();

    httpMock
      .expectOne(baseUrl)
      .flush({ message: 'Erro de validação' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Erro de validação');
  });
});
