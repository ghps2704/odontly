import { describe, it, expect } from 'vitest';
import { splitAmountEvenly, buildDefaultSchedule, paymentLineToTransactions, validatePaymentLines } from './paymentLines';
import { PaymentLine, Transaction } from '@/types';

const baseTx: Transaction = {
  id: 'temp',
  date: '2026-01-15',
  description: 'Venda de equipamento',
  amount: 1200,
  type: 'INCOME',
  category: 'Vendas',
  categoryId: '1',
  items: [],
  accountId: 'acc1',
  paymentMethod: 'PIX',
  contactId: 'contact1',
  status: 'PENDING',
  isReconciled: false,
};

const makeLine = (overrides: Partial<PaymentLine> = {}): PaymentLine => ({
  id: 'line1',
  percentage: 100,
  amount: 1200,
  paymentMethod: 'PIX',
  accountId: 'acc1',
  dueDate: '2026-01-15',
  frequency: 'MONTHLY',
  occurrences: 1,
  schedule: [{ date: '2026-01-15', amount: 1200 }],
  ...overrides,
});

describe('splitAmountEvenly', () => {
  it('splits evenly when it divides cleanly', () => {
    expect(splitAmountEvenly(300, 3)).toEqual([100, 100, 100]);
  });

  it('puts the rounding remainder on the last part', () => {
    const parts = splitAmountEvenly(100, 3);
    expect(parts).toEqual([33.33, 33.33, 33.34]);
    expect(parts.reduce((s, p) => s + p, 0)).toBeCloseTo(100, 2);
  });

  it('returns a single part for count = 1', () => {
    expect(splitAmountEvenly(840, 1)).toEqual([840]);
  });
});

describe('buildDefaultSchedule', () => {
  it('generates monthly-spaced installments with evenly split amounts', () => {
    const schedule = buildDefaultSchedule(840, '2026-01-15', 'MONTHLY', 3);
    expect(schedule).toHaveLength(3);
    expect(schedule.map(s => s.date)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
    expect(schedule.reduce((s, i) => s + i.amount, 0)).toBeCloseTo(840, 2);
  });
});

describe('paymentLineToTransactions', () => {
  it('expands a single-installment line into one transaction preserving the base status', () => {
    const line = makeLine();
    const result = paymentLineToTransactions({ ...baseTx, status: 'PAID', paidAt: '2026-01-15' }, line, 'sale1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'line1_1',
      amount: 1200,
      status: 'PAID',
      paidAt: '2026-01-15',
      saleGroupId: 'sale1',
      paymentLineId: 'line1',
    });
  });

  it('only lets the first installment inherit PAID status, forcing the rest to PENDING', () => {
    const line = makeLine({
      occurrences: 3,
      schedule: [
        { date: '2026-01-15', amount: 280 },
        { date: '2026-02-15', amount: 280 },
        { date: '2026-03-15', amount: 280 },
      ],
    });
    const result = paymentLineToTransactions({ ...baseTx, status: 'PAID', paidAt: '2026-01-15', isReconciled: true }, line, 'sale1');

    expect(result[0].status).toBe('PAID');
    expect(result[0].paidAt).toBe('2026-01-15');
    expect(result[1].status).toBe('PENDING');
    expect(result[1].paidAt).toBeUndefined();
    expect(result[1].isReconciled).toBe(false);
    expect(result[2].status).toBe('PENDING');
  });

  it('uses each installment schedule entry for date/amount, and tags recurrence/installments per line', () => {
    const line = makeLine({
      occurrences: 2,
      schedule: [
        { date: '2026-01-15', amount: 500 },
        { date: '2026-02-15', amount: 700 },
      ],
      accountId: 'acc2',
      paymentMethod: 'BOLETO',
    });
    const result = paymentLineToTransactions(baseTx, line, 'sale1');

    expect(result[0]).toMatchObject({ date: '2026-01-15', amount: 500, accountId: 'acc2', paymentMethod: 'BOLETO', installments: { current: 1, total: 2 } });
    expect(result[1]).toMatchObject({ date: '2026-02-15', amount: 700, installments: { current: 2, total: 2 } });
    expect(result[0].recurrence?.groupId).toBe('line1');
    expect(result[1].recurrence?.groupId).toBe('line1');
    expect(result[0].description).toBe('Venda de equipamento (1/2)');
  });
});

describe('validatePaymentLines', () => {
  it('passes when percentages sum to 100 and every schedule matches its line amount', () => {
    const lines = [
      makeLine({ id: 'a', percentage: 30, amount: 360, schedule: [{ date: '2026-01-15', amount: 360 }] }),
      makeLine({ id: 'b', percentage: 70, amount: 840, occurrences: 3, schedule: [
        { date: '2026-01-15', amount: 280 }, { date: '2026-02-15', amount: 280 }, { date: '2026-03-15', amount: 280 },
      ] }),
    ];
    const result = validatePaymentLines(lines, 1200);
    expect(result.percentageOk).toBe(true);
    expect(result.scheduleOk).toBe(true);
    expect(result.percentageSum).toBe(100);
  });

  it('flags percentages that do not sum to 100', () => {
    const lines = [makeLine({ percentage: 90, amount: 1080 })];
    const result = validatePaymentLines(lines, 1200);
    expect(result.percentageOk).toBe(false);
    expect(result.percentageSum).toBe(90);
  });

  it('flags a line whose schedule does not sum back to its amount', () => {
    const lines = [makeLine({ occurrences: 2, amount: 1200, schedule: [{ date: '2026-01-15', amount: 500 }, { date: '2026-02-15', amount: 500 }] })];
    const result = validatePaymentLines(lines, 1200);
    expect(result.scheduleOk).toBe(false);
    expect(result.lineErrors.line1).toContain('1000.00');
  });
});
