import { PaymentInstallment, PaymentLine, Transaction } from '@/types';
import { addInterval } from './installments';

// Splits `total` into `count` parts that sum back to it exactly, putting the
// rounding remainder on the last part (e.g. 100 / 3 -> [33.33, 33.33, 33.34]).
export function splitAmountEvenly(total: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count));
  const base = Math.floor((total / n) * 100) / 100;
  const parts = Array.from({ length: n }, () => base);
  const remainder = Math.round((total - base * n) * 100) / 100;
  parts[n - 1] = Math.round((parts[n - 1] + remainder) * 100) / 100;
  return parts;
}

// Default schedule for a payment line: evenly split amount, dates spaced by
// `frequency` from `dueDate` (reuses installments.ts's addInterval so the
// date math stays identical to the existing recurrence engine).
export function buildDefaultSchedule(
  lineAmount: number,
  dueDate: string,
  frequency: PaymentLine['frequency'],
  occurrences: number
): PaymentInstallment[] {
  const amounts = splitAmountEvenly(lineAmount, occurrences);
  return amounts.map((amount, i) => ({
    date: addInterval(dueDate, frequency, i),
    amount,
  }));
}

// Expands one payment line (with its, possibly hand-edited, schedule) into
// full Transaction rows — same shape/rules as generateInstallments: only the
// first installment may inherit the base status/paidAt, every later one is
// forced PENDING.
export function paymentLineToTransactions(
  baseTx: Transaction,
  line: PaymentLine,
  saleGroupId: string
): Transaction[] {
  const total = line.schedule.length;

  return line.schedule.map((installment, i) => {
    const isFirst = i === 0;
    const current = i + 1;
    return {
      ...baseTx,
      id: `${line.id}_${current}`,
      date: installment.date,
      dueDate: installment.date,
      amount: installment.amount,
      accountId: line.accountId,
      paymentMethod: line.paymentMethod,
      description: total > 1 ? `${baseTx.description} (${current}/${total})` : baseTx.description,
      status: isFirst ? baseTx.status : 'PENDING',
      paidAt: isFirst ? baseTx.paidAt : undefined,
      isReconciled: isFirst ? baseTx.isReconciled : false,
      installments: { current, total },
      recurrence: { frequency: line.frequency, occurrences: total, groupId: line.id },
      saleGroupId,
      paymentLineId: line.id,
    };
  });
}

export interface PaymentLinesValidation {
  percentageOk: boolean;
  scheduleOk: boolean;
  percentageSum: number;
  lineErrors: Record<string, string>; // lineId -> message, only for lines whose schedule doesn't match its amount
}

// Blocking-save validation: percentages must sum to 100%, and each line's
// schedule must sum back to that line's amount — both within a 1-cent
// rounding tolerance.
export function validatePaymentLines(lines: PaymentLine[], totalAmount: number): PaymentLinesValidation {
  const percentageSum = Math.round(lines.reduce((s, l) => s + l.percentage, 0) * 100) / 100;
  const percentageOk = Math.abs(percentageSum - 100) < 0.01 || totalAmount === 0;

  const lineErrors: Record<string, string> = {};
  lines.forEach(line => {
    const scheduleSum = line.schedule.reduce((s, i) => s + i.amount, 0);
    if (Math.abs(scheduleSum - line.amount) >= 0.01) {
      lineErrors[line.id] = `Parcelas somam ${scheduleSum.toFixed(2)}, esperado ${line.amount.toFixed(2)}`;
    }
  });

  return {
    percentageOk,
    scheduleOk: Object.keys(lineErrors).length === 0,
    percentageSum,
    lineErrors,
  };
}
