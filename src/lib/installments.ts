import { RecurrenceFrequency, Transaction } from '@/types';

export type EditScope = 'ONLY_THIS' | 'THIS_AND_FUTURE' | 'ALL';

function parseISODate(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

function toISODate(y: number, m: number, d: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function addMonthsClamped(dateStr: string, months: number): string {
  const { y, m, d } = parseISODate(dateStr);
  const totalMonths = (m - 1) + months;
  const newY = y + Math.floor(totalMonths / 12);
  const newM = ((totalMonths % 12) + 12) % 12 + 1;
  const clampedDay = Math.min(d, daysInMonth(newY, newM));
  return toISODate(newY, newM, clampedDay);
}

function addDays(dateStr: string, days: number): string {
  const { y, m, d } = parseISODate(dateStr);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

// n is the offset from the original date (0 = original date). Always computed
// from the original date, never chained from the previous installment, so
// short months (e.g. day 31) don't drift the schedule across installments.
export function addInterval(dateStr: string, frequency: RecurrenceFrequency, n: number): string {
  switch (frequency) {
    case 'WEEKLY': return addDays(dateStr, 7 * n);
    case 'BIWEEKLY': return addDays(dateStr, 14 * n);
    case 'MONTHLY': return addMonthsClamped(dateStr, n);
    case 'QUARTERLY': return addMonthsClamped(dateStr, 3 * n);
    case 'YEARLY': return addMonthsClamped(dateStr, 12 * n);
    default: return dateStr;
  }
}

/**
 * Expands a single transaction into N installments/occurrences.
 * Only the first installment may carry the original status/paidAt — every
 * future installment is forced to PENDING, since a purchase made today
 * can't have already paid next month's installment.
 */
export function generateInstallments(
  baseTx: Transaction,
  frequency: RecurrenceFrequency,
  occurrences: number,
  groupId: string
): Transaction[] {
  const total = Math.max(1, Math.floor(occurrences));

  return Array.from({ length: total }, (_, i) => {
    const isFirst = i === 0;
    const current = i + 1;
    return {
      ...baseTx,
      id: `${groupId}_${current}`,
      date: addInterval(baseTx.date, frequency, i),
      description: total > 1 ? `${baseTx.description} (${current}/${total})` : baseTx.description,
      status: isFirst ? baseTx.status : 'PENDING',
      paidAt: isFirst ? baseTx.paidAt : undefined,
      isReconciled: isFirst ? baseTx.isReconciled : false,
      installments: { current, total },
      recurrence: { frequency, occurrences: total, groupId },
    };
  });
}

/**
 * Given all siblings of a group (same recurrence.groupId), resolves which
 * transactions an edit/delete with the given scope should apply to.
 * - ONLY_THIS: just the targeted transaction.
 * - THIS_AND_FUTURE / ALL: the targeted transaction plus the relevant
 *   siblings, but NEVER a sibling that is already PAID (past history is
 *   never touched by a bulk edit/delete).
 */
export function resolveScopeTargets(
  siblings: Transaction[],
  currentId: string,
  scope: EditScope
): Transaction[] {
  const current = siblings.find(t => t.id === currentId);
  if (!current) return [];
  if (scope === 'ONLY_THIS') return [current];

  const currentInstallment = current.installments?.current ?? 0;

  return siblings.filter(t => {
    if (t.id === currentId) return true;
    if (t.status === 'PAID') return false;
    if (scope === 'ALL') return true;
    const n = t.installments?.current ?? 0;
    return n >= currentInstallment;
  });
}
