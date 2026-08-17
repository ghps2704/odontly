import { describe, it, expect } from 'vitest';
import { matchImportRows, ImportRow } from './importMatcher';
import { Transaction } from '@/types';

const baseTx: Transaction = {
    id: 'tx1',
    date: '2026-01-15',
    description: 'Consulta - Paciente João',
    amount: 1250.50,
    type: 'INCOME',
    category: 'Venda de Serviços',
    categoryId: '1',
    items: [],
    accountId: 'acc1',
    paymentMethod: 'PIX',
    contactId: 'contact1',
    status: 'PENDING',
    isReconciled: false,
};

const row = (overrides: Partial<ImportRow>): ImportRow => ({
    date: '2026-01-15',
    amount: 1250.50,
    description: 'Pagamento recebido',
    type: 'INCOME',
    sourceId: 'r1',
    ...overrides,
});

describe('matchImportRows', () => {
    it('matches a row to a PENDING transaction with the same amount, type, and date', () => {
        const result = matchImportRows([row({})], [baseTx]);
        expect(result[0].match?.id).toBe('tx1');
    });

    it('matches within the date tolerance window', () => {
        const result = matchImportRows([row({ date: '2026-01-17' })], [baseTx]);
        expect(result[0].match?.id).toBe('tx1');
    });

    it('does not match outside the date tolerance window', () => {
        const result = matchImportRows([row({ date: '2026-01-25' })], [baseTx]);
        expect(result[0].match).toBeNull();
    });

    it('does not match a different amount beyond tolerance', () => {
        const result = matchImportRows([row({ amount: 1300 })], [baseTx]);
        expect(result[0].match).toBeNull();
    });

    it('matches within the amount tolerance window (rounding)', () => {
        const result = matchImportRows([row({ amount: 1250.505 })], [baseTx]);
        expect(result[0].match?.id).toBe('tx1');
    });

    it('never matches an already-PAID transaction', () => {
        const paid: Transaction = { ...baseTx, status: 'PAID' };
        const result = matchImportRows([row({})], [paid]);
        expect(result[0].match).toBeNull();
    });

    it('never matches across types (EXPENSE row vs INCOME transaction)', () => {
        const result = matchImportRows([row({ type: 'EXPENSE' })], [baseTx]);
        expect(result[0].match).toBeNull();
    });

    it('does not reuse the same transaction for two different rows', () => {
        const rows = [row({ sourceId: 'r1' }), row({ sourceId: 'r2' })];
        const result = matchImportRows(rows, [baseTx]);
        const matched = result.filter(r => r.match !== null);
        expect(matched).toHaveLength(1);
    });

    it('picks the closest-date candidate when multiple are eligible', () => {
        const far: Transaction = { ...baseTx, id: 'tx-far', date: '2026-01-13' };
        const near: Transaction = { ...baseTx, id: 'tx-near', date: '2026-01-15' };
        const result = matchImportRows([row({ date: '2026-01-15' })], [far, near]);
        expect(result[0].match?.id).toBe('tx-near');
    });
});
