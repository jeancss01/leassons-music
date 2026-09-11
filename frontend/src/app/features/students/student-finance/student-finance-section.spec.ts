import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MonthlyCharge } from '../monthly-charge-api/monthly-charge.model';
import { StudentFinanceSection } from './student-finance-section';

describe('StudentFinanceSection', () => {
  let fixture: ComponentFixture<StudentFinanceSection>;
  let component: StudentFinanceSection;
  let httpMock: HttpTestingController;
  const studentId = '11111111-1111-4111-8111-111111111111';
  const chargesUrl = `${environment.apiBaseUrl}/monthly-charges?studentId=${studentId}`;
  const generateUrl = `${environment.apiBaseUrl}/monthly-charges/generate`;

  const pending: MonthlyCharge = {
    id: '55555555-5555-4555-8555-555555555555',
    studentId,
    referenceMonth: '2026-09',
    amount: 200,
    dueDate: '2026-09-10',
    status: 'PENDING',
    paidAt: null,
    notes: 'Pix',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  const paid: MonthlyCharge = {
    ...pending,
    id: '66666666-6666-4666-8666-666666666666',
    referenceMonth: '2026-08',
    status: 'PAID',
    paidAt: '2026-08-05T15:00:00.000Z',
    notes: null,
  };

  const cancelled: MonthlyCharge = {
    ...pending,
    id: '77777777-7777-4777-8777-777777777777',
    referenceMonth: '2026-07',
    status: 'CANCELLED',
    notes: null,
    dueDate: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentFinanceSection, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: () => of(null) }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentFinanceSection);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('studentId', studentId);
    fixture.componentRef.setInput('monthlyFee', 200);
    fixture.componentRef.setInput('studentStatus', 'ACTIVE');
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads and shows PENDING, PAID and CANCELLED charges', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando mensalidades');

    httpMock.expectOne(chargesUrl).flush([pending, paid, cancelled]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Financeiro');
    expect(text).toContain('Pendente');
    expect(text).toContain('Paga');
    expect(text).toContain('Cancelada');
    expect(text).toContain('09/2026');
    expect(text).toContain('Pix');
  });

  it('shows empty state', () => {
    fixture.detectChanges();
    httpMock.expectOne(chargesUrl).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma cobrança registrada');
  });

  it('shows error state', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(chargesUrl)
      .flush({ message: 'falha' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('falha');
  });

  it('generates monthly charges and reloads the list', () => {
    fixture.detectChanges();
    httpMock.expectOne(chargesUrl).flush([]);
    fixture.detectChanges();

    component.generateMonth.set('2026-09');
    component.generate();

    const req = httpMock.expectOne(generateUrl);
    expect(req.request.body).toEqual({ referenceMonth: '2026-09' });
    req.flush({
      referenceMonth: '2026-09',
      activeStudents: 1,
      created: 1,
      alreadyExisted: 0,
      createdStudentIds: [studentId],
      skippedStudentIds: [],
    });

    httpMock.expectOne(chargesUrl).flush([pending]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pendente');
  });

  it('pays a pending charge and updates the card', () => {
    fixture.detectChanges();
    httpMock.expectOne(chargesUrl).flush([pending]);
    fixture.detectChanges();

    component.pay(pending);

    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/monthly-charges/${pending.id}/pay`,
    );
    expect(req.request.method).toBe('POST');
    req.flush({
      ...pending,
      status: 'PAID',
      paidAt: '2026-09-11T12:00:00.000Z',
    });
    fixture.detectChanges();

    expect(component.charges()[0]?.status).toBe('PAID');
  });

  it('unpays a paid charge', () => {
    fixture.detectChanges();
    httpMock.expectOne(chargesUrl).flush([paid]);
    fixture.detectChanges();

    component.unpay(paid);

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/monthly-charges/${paid.id}/unpay`);
    req.flush({ ...paid, status: 'PENDING', paidAt: null });
    fixture.detectChanges();

    expect(component.charges()[0]?.status).toBe('PENDING');
    expect(component.charges()[0]?.paidAt).toBeNull();
  });
});
