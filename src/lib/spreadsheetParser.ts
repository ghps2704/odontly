import * as XLSX from 'xlsx';
import { TransactionType } from '@/types';
import { ImportRow } from './importMatcher';

export interface ColumnMapping {
    date: string;
    description: string;
    amount: string;
}

const DIACRITICS_RE = new RegExp('[\\u0300-\\u036f]', 'g');
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '').trim();

/** Best-effort guess of which spreadsheet column holds date/description/amount, by header name. */
export function guessColumnMapping(headers: string[]): Partial<ColumnMapping> {
    const find = (candidates: string[]) => headers.find(h => candidates.includes(normalize(h)));
    return {
        date: find(['data', 'date', 'dt', 'data lancamento', 'datalancamento', 'data do lancamento']),
        description: find(['descricao', 'description', 'historico', 'memo', 'lancamento', 'discriminacao']),
        amount: find(['valor', 'amount', 'value', 'valor (r$)', 'valor r$'])
    };
}

/** Accepts a raw cell value (number or Brazilian/US-formatted string) and returns a plain float. */
export function parseAmountCell(raw: unknown): number {
    if (typeof raw === 'number') return raw;
    if (raw === null || raw === undefined || raw === '') return NaN;
    let s = String(raw).trim().replace(/R\$/gi, '').replace(/\s/g, '');
    // Brazilian format (1.234,56) → normalize to 1234.56
    if (/,\d{1,2}$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
    }
    return parseFloat(s);
}

/** Accepts an Excel serial date number or a DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD string. Returns ISO or ''. */
export function parseDateCell(raw: unknown): string {
    if (typeof raw === 'number') {
        // Excel serial date: days since 1899-12-30 (accounts for Excel's leap-year bug)
        const ms = Math.round((raw - 25569) * 86400 * 1000);
        const d = new Date(ms);
        if (Number.isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    }
    const s = String(raw ?? '').trim();

    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;

    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

    return '';
}

/** Turns raw spreadsheet rows into normalized ImportRow entries, given a column mapping. Invalid rows are dropped. */
export function rowsToImportRows(rows: Record<string, any>[], mapping: ColumnMapping): ImportRow[] {
    return rows
        .map((r, i): ImportRow => {
            const date = parseDateCell(r[mapping.date]);
            const rawAmount = parseAmountCell(r[mapping.amount]);
            const description = String(r[mapping.description] ?? '').trim() || 'Lançamento importado';
            const type: TransactionType = rawAmount < 0 ? 'EXPENSE' : 'INCOME';
            return {
                date,
                amount: Math.abs(rawAmount),
                description,
                type,
                sourceId: `row_${i}_${date}_${rawAmount}`
            };
        })
        .filter(r => r.date && !Number.isNaN(r.amount) && r.amount > 0);
}

/** Reads an .xlsx/.csv File in the browser and returns its first sheet as header + row objects. */
export async function parseSpreadsheetFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
}
