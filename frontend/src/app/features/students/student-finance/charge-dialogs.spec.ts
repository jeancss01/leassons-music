import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateChargeDialog } from './create-charge-dialog';
import { EditChargeDialog } from './edit-charge-dialog';
import { MonthlyCharge } from '../monthly-charge-api/monthly-charge.model';

describe('CreateChargeDialog', () => {
  let fixture: ComponentFixture<CreateChargeDialog>;
  let component: CreateChargeDialog;
  const close = vi.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateChargeDialog, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            studentId: '11111111-1111-4111-8111-111111111111',
            monthlyFee: 200,
            defaultReferenceMonth: '2026-09',
          },
        },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateChargeDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    close.mockClear();
  });

  it('requires a valid reference month', () => {
    component.form.patchValue({ referenceMonth: '2026-13' });
    component.confirm();
    expect(component.form.invalid).toBe(true);
    expect(close).not.toHaveBeenCalled();
  });

  it('returns create payload without amount', () => {
    component.form.patchValue({
      referenceMonth: '2026-09',
      dueDate: '2026-09-10',
      notes: 'Pix',
    });
    component.confirm();

    expect(close).toHaveBeenCalledWith({
      studentId: '11111111-1111-4111-8111-111111111111',
      referenceMonth: '2026-09',
      dueDate: '2026-09-10',
      notes: 'Pix',
    });
    expect(close.mock.calls[0][0].amount).toBeUndefined();
  });
});

describe('EditChargeDialog', () => {
  let fixture: ComponentFixture<EditChargeDialog>;
  let component: EditChargeDialog;
  const close = vi.fn();

  const charge: MonthlyCharge = {
    id: '55555555-5555-4555-8555-555555555555',
    studentId: '11111111-1111-4111-8111-111111111111',
    referenceMonth: '2026-09',
    amount: 200,
    dueDate: '2026-09-10',
    status: 'PENDING',
    paidAt: null,
    notes: 'Pix',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditChargeDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { charge } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditChargeDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    close.mockClear();
  });

  it('returns dueDate and notes for update', () => {
    component.form.patchValue({ dueDate: '2026-09-15', notes: 'Atualizado' });
    component.confirm();

    expect(close).toHaveBeenCalledWith({
      dueDate: '2026-09-15',
      notes: 'Atualizado',
    });
  });

  it('clears optional fields as null', () => {
    component.form.patchValue({ dueDate: '', notes: '' });
    component.confirm();

    expect(close).toHaveBeenCalledWith({
      dueDate: null,
      notes: null,
    });
  });
});
