import { describe, it, expect } from 'vitest';
import { guessColumnMapping, parseAmountCell, parseDateCell, rowsToImportRows } from './spreadsheetParser';

describe('guessColumnMapping', () => {
    it('recognizes common Portuguese and English header names', () => {
        expect(guessColumnMapping(['Data', 'Descrição', 'Valor'])).toEqual({
            date: 'Data', description: 'Descrição', amount: 'Valor'
        });
        expect(guessColumnMapping(['Date', 'Description', 'Amount'])).toEqual({
            date: 'Date', description: 'Description', amount: 'Amount'
        });
    });

    it('leaves unmatched columns undefined', () => {
        const result = guessColumnMapping(['Coluna A', 'Coluna B']);
        expect(result.date).toBeUndefined();
        expect(result.description).toBeUndefined();
        expect(result.amount).toBeUndefined();
    });
});

describe('parseAmountCell', () => {
    it('passes numbers through unchanged', () => {
        expect(parseAmountCell(1250.5)).toBe(1250.5);
        expect(parseAmountCell(-89.9)).toBe(-89.9);
    });

    it('parses Brazilian-formatted strings (1.234,56)', () => {
        expect(parseAmountCell('1.234,56')).toBe(1234.56);
        expect(parseAmountCell('R$ 89,90')).toBe(89.90);
        expect(parseAmountCell('-89,90')).toBe(-89.90);
    });

    it('parses plain decimal strings', () => {
        expect(parseAmountCell('1234.56')).toBe(1234.56);
    });

    it('returns NaN for empty/missing values', () => {
        expect(Number.isNaN(parseAmountCell(''))).toBe(true);
        expect(Number.isNaN(parseAmountCell(null))).toBe(true);
        expect(Number.isNaN(parseAmountCell(undefined))).toBe(true);
    });
});

describe('parseDateCell', () => {
    it('parses an Excel serial date number', () => {
        // 45658 = 2025-01-01 (Excel epoch 1899-12-30)
        expect(parseDateCell(45658)).toBe('2025-01-01');
    });

    it('parses DD/MM/YYYY strings', () => {
        expect(parseDateCell('15/01/2026')).toBe('2026-01-15');
    });

    it('parses DD-MM-YYYY strings', () => {
        expect(parseDateCell('05-03-2026')).toBe('2026-03-05');
    });

    it('parses already-ISO YYYY-MM-DD strings', () => {
        expect(parseDateCell('2026-01-15')).toBe('2026-01-15');
    });

    it('returns empty string for unrecognized formats', () => {
        expect(parseDateCell('not a date')).toBe('');
        expect(parseDateCell(undefined)).toBe('');
    });
});

describe('rowsToImportRows', () => {
    const mapping = { date: 'Data', description: 'Descrição', amount: 'Valor' };

    it('maps positive amounts to INCOME and negative to EXPENSE', () => {
        const rows = [
            { Data: '15/01/2026', Descrição: 'Recebimento', Valor: 1250.5 },
            { Data: '16/01/2026', Descrição: 'Pagamento', Valor: -89.9 },
        ];
        const result = rowsToImportRows(rows, mapping);
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ date: '2026-01-15', amount: 1250.5, type: 'INCOME' });
        expect(result[1]).toMatchObject({ date: '2026-01-16', amount: 89.9, type: 'EXPENSE' });
    });

    it('drops rows with an unparseable date or amount', () => {
        const rows = [
            { Data: 'invalid', Descrição: 'X', Valor: 10 },
            { Data: '15/01/2026', Descrição: 'Y', Valor: 'invalid' },
            { Data: '15/01/2026', Descrição: 'Z', Valor: 0 },
        ];
        expect(rowsToImportRows(rows, mapping)).toEqual([]);
    });

    it('falls back to a default description when missing', () => {
        const rows = [{ Data: '15/01/2026', Descrição: '', Valor: 10 }];
        expect(rowsToImportRows(rows, mapping)[0].description).toBe('Lançamento importado');
    });
});
