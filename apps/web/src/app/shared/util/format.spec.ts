import { categoryLabel, humanize, isoDate, splitList } from './format';

describe('format helpers', () => {
  it('humanizes enum values', () => {
    expect(humanize('PENDING_VERIFICATION')).toBe('Pending verification');
    expect(humanize('users:manage')).toBe('Users manage');
    expect(humanize(undefined)).toBe('');
  });

  it('labels professional categories from the scope-of-practice table', () => {
    expect(categoryLabel('CLINICAL_PSYCHOLOGIST')).toBe('Clinical psychologist');
    expect(categoryLabel('SOMETHING_ELSE')).toBe('Something else');
  });

  it('splits comma lists and drops blanks', () => {
    expect(splitList(' MBBS, MD Psychiatry ,, ')).toEqual(['MBBS', 'MD Psychiatry']);
    expect(splitList(null)).toEqual([]);
  });

  it('formats local dates as YYYY-MM-DD', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
