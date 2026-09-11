import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const validUntilAfterFromValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const validFrom = group.get('validFrom')?.value as string | null | undefined;
  const validUntil = group.get('validUntil')?.value as string | null | undefined;

  if (!validFrom || !validUntil) {
    return null;
  }

  if (validUntil < validFrom) {
    return { validUntilBeforeFrom: true };
  }

  return null;
};
