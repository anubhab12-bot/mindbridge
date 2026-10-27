import { SCOPE_OF_PRACTICE, type ProfessionalCategory } from '@mindbridge/shared-types';

/** "PENDING_VERIFICATION" -> "Pending verification". */
export function humanize(value: string | null | undefined): string {
  if (!value) return '';
  const s = value.replace(/[_:]/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function categoryLabel(c: ProfessionalCategory | string | undefined): string {
  return (c && SCOPE_OF_PRACTICE[c as ProfessionalCategory]?.label) || humanize(c);
}

export function money(fee: { amount: number; currency: string } | undefined | null): string {
  if (!fee) return '';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: fee.currency, maximumFractionDigits: 0 }).format(fee.amount);
  } catch {
    return `${fee.amount} ${fee.currency}`;
  }
}

export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** YYYY-MM-DD in local time. */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function splitList(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
