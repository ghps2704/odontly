import { describe, it, expect } from 'vitest';
import { addInterval, generateInstallments, resolveScopeTargets } from './installments';
import { Transaction } from '@/types';

const baseTx: Transaction = {
  id: 'temp',
  date: '2026-01-15',
  description: 'Equipamento de limpeza ortodôntica',
  amount: 500,
  type: 'EXPENSE',
  category: 'Equipamentos',
  categoryId: '9',
  items: [],
  accountId: 'acc1',
  paymentMethod: 'PIX',
  contactId: 'contact1',
  status: 'PENDING',
  isReconciled: false,
};

describe('addInterval', () => {
  it('adds weeks/biweeks in days', () => {
    expect(addInterval('2026-01-01', 'WEEKLY', 1)).toBe('2026-01-08');
    expect(addInterval('2026-01-01', 'BIWEEKLY', 1)).toBe('2026-01-15');
  });

  it('adds months without drifting when the origin day does not exist in the target month', () => {
    // Jan 31 + N months, always computed from the ORIGINAL date (no chaining)
    expect(addInterval('2026-01-31', 'MONTHLY', 0)).toBe('2026-01-31');
    expect(addInterval('2026-01-31', 'MONTHLY', 1)).toBe('2026-02-28'); // 2026 is not a leap year
    expect(addInterval('2026-01-31', 'MONTHLY', 2)).toBe('2026-03-31'); // back to 31, not 03-03
    expect(addInterval('2026-01-31', 'MONTHLY', 3)).toBe('2026-04-30');
  });

  it('adds quarters and years', () => {
    expect(addInterval('2026-01-15', 'QUARTERLY', 1)).toBe('2026-04-15');
    expect(addInterval('2026-01-15', 'YEARLY', 1)).toBe('2027-01-15');
  });

  it('rolls over the year boundary for monthly', () => {
    expect(addInterval('2026-11-10', 'MONTHLY', 3)).toBe('2027-02-10');
  });
});

describe('generateInstallments', () => {
  it('generates 12 monthly installments starting from the creation date', () => {
    const result = generateInstallments(baseTx, 'MONTHLY', 12, 'grp1');

    expect(result).toHaveLength(12);
    expect(result[0].date).toBe('2026-01-15');
    expect(result[1].date).toBe('2026-02-15');
    expect(result[11].date).toBe('2026-12-15');
  });

  it('tags every installment with a shared groupId, unique ids, and current/total', () => {
    const result = generateInstallments(baseTx, 'MONTHLY', 12, 'grp1');

    result.forEach((tx, i) => {
      expect(tx.id).toBe(`grp1_${i + 1}`);
      expect(tx.recurrence?.groupId).toBe('grp1');
      expect(tx.installments).toEqual({ current: i + 1, total: 12 });
    });

    expect(new Set(result.map(t => t.id)).size).toBe(12);
  });

  it('never marks a future installment as already paid, even if the base tx was PAID', () => {
    const paidBase: Transaction = { ...baseTx, status: 'PAID', paidAt: '2026-01-15', isReconciled: true };
    const result = generateInstallments(paidBase, 'MONTHLY', 3, 'grp2');

    expect(result[0].status).toBe('PAID');
    expect(result[0].paidAt).toBe('2026-01-15');
    expect(result[1].status).toBe('PENDING');
    expect(result[1].paidAt).toBeUndefined();
    expect(result[1].isReconciled).toBe(false);
    expect(result[2].status).toBe('PENDING');
  });

  it('appends the (n/total) suffix to the description only when there is more than one installment', () => {
    const single = generateInstallments(baseTx, 'MONTHLY', 1, 'grp3');
    expect(single[0].description).toBe(baseTx.description);

    const multi = generateInstallments(baseTx, 'MONTHLY', 3, 'grp4');
    expect(multi[0].description).toBe(`${baseTx.description} (1/3)`);
    expect(multi[2].description).toBe(`${baseTx.description} (3/3)`);
  });
});

describe('resolveScopeTargets', () => {
  const siblings: Transaction[] = generateInstallments(baseTx, 'MONTHLY', 6, 'grpX').map((t, i) =>
    // simulate installments 1 and 2 already paid (past), 3..6 still pending (future)
    i < 2 ? { ...t, status: 'PAID' as const } : t
  );

  it('ONLY_THIS returns just the targeted transaction', () => {
    const result = resolveScopeTargets(siblings, 'grpX_3', 'ONLY_THIS');
    expect(result.map(t => t.id)).toEqual(['grpX_3']);
  });

  it('THIS_AND_FUTURE returns the targeted transaction plus later unpaid siblings, excluding paid history', () => {
    const result = resolveScopeTargets(siblings, 'grpX_3', 'THIS_AND_FUTURE');
    expect(result.map(t => t.id).sort()).toEqual(['grpX_3', 'grpX_4', 'grpX_5', 'grpX_6']);
  });

  it('ALL returns every sibling except the already-paid ones', () => {
    const result = resolveScopeTargets(siblings, 'grpX_3', 'ALL');
    expect(result.map(t => t.id).sort()).toEqual(['grpX_3', 'grpX_4', 'grpX_5', 'grpX_6']);
  });

  it('ALL still includes the targeted transaction even if it is itself already paid', () => {
    const result = resolveScopeTargets(siblings, 'grpX_1', 'ALL');
    expect(result.map(t => t.id).sort()).toEqual(['grpX_1', 'grpX_3', 'grpX_4', 'grpX_5', 'grpX_6']);
  });

  it('returns an empty array if the current transaction is not found', () => {
    expect(resolveScopeTargets(siblings, 'missing', 'ALL')).toEqual([]);
  });
});
