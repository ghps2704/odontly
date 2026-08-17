import { Transaction, TransactionType } from '@/types';

export interface ImportRow {
    date: string; // ISO YYYY-MM-DD
    amount: number; // always positive — `type` carries the direction
    description: string;
    type: TransactionType;
    sourceId: string; // OFX FITID or a synthetic key, for de-dup across re-imports
}

export interface MatchResult {
    row: ImportRow;
    match: Transaction | null;
}

const DATE_TOLERANCE_DAYS = 3;
const AMOUNT_TOLERANCE = 0.01;

function daysBetween(a: string, b: string): number {
    const da = new Date(a + 'T12:00:00').getTime();
    const db = new Date(b + 'T12:00:00').getTime();
    return Math.abs(da - db) / (1000 * 60 * 60 * 24);
}

/**
 * Greedily matches imported rows against existing PENDING transactions on
 * the same account (candidates should already be pre-filtered by account).
 * A transaction is matched at most once — the closest date wins when a row
 * has more than one eligible candidate within tolerance.
 */
export function matchImportRows(rows: ImportRow[], candidates: Transaction[]): MatchResult[] {
    const used = new Set<string>();

    return rows.map(row => {
        const best = candidates
            .filter(c => !used.has(c.id))
            .filter(c => c.status === 'PENDING')
            .filter(c => c.type === row.type)
            .filter(c => Math.abs(c.amount - row.amount) <= AMOUNT_TOLERANCE)
            .filter(c => daysBetween(c.date, row.date) <= DATE_TOLERANCE_DAYS)
            .sort((a, b) => daysBetween(a.date, row.date) - daysBetween(b.date, row.date))[0];

        if (best) used.add(best.id);
        return { row, match: best ?? null };
    });
}
