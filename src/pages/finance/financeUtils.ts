import type { Dispatch, SetStateAction } from 'react';
import { Account, DRECategoryType, RecurrenceFrequency } from '@/types';

export interface RecurrenceFormState {
    enabled: boolean;
    frequency: RecurrenceFrequency;
    occurrences: number;
}

export interface EditingAccountState {
    id: string;
    name: string;
    bankName: string;
    agency: string;
    accountNumber: string;
    type: Account['type'];
    balance: number;
    initialBalance: number;
    color: string;
}

export interface TransferFormState {
    fromId: string;
    toId: string;
    amount: number;
    date: string;
    description: string;
}

export const DRE_STRUCTURE_LABELS: Record<DRECategoryType, { label: string, color: string }> = {
    'GROSS_REVENUE': { label: 'Receita de Vendas', color: 'text-blue-700' },
    'DEDUCTIONS': { label: 'Deduções e Impostos', color: 'text-red-600' },
    'VARIABLE_COST': { label: 'Custo Variável (CPV/CMV)', color: 'text-red-600' },
    'VARIABLE_EXPENSE': { label: 'Despesas Variáveis', color: 'text-red-600' },
    'PERSONNEL': { label: 'Gastos com Pessoal', color: 'text-red-600' },
    'OPERATIONAL_EXPENSE': { label: 'Despesas Operacionais', color: 'text-red-600' },
    'DEPRECIATION': { label: 'Depreciação/Amortização', color: 'text-red-600' },
    'OTHER_RESULT': { label: 'Outras Receitas/Despesas (Fin)', color: 'text-[#64748b]' },
    'INCOME_TAX': { label: 'Tributos (IRPJ/CSLL)', color: 'text-red-700' }
};

export const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const handleMonthChange = (
    dateState: Date,
    setDateState: Dispatch<SetStateAction<Date>>,
    direction: 'prev' | 'next'
) => {
    const newDate = new Date(dateState);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setDateState(newDate);
};

// Extract day safely avoiding timezone issues
export const getDayFromDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-'); // YYYY-MM-DD
    return parts[2]; // DD
};

// --- PERIOD FILTER (mês vs. período personalizado) ---

export type PeriodFilterValue =
    | { mode: 'MONTH'; anchor: Date }
    | { mode: 'RANGE'; start: string; end: string };

const pad2 = (n: number) => String(n).padStart(2, '0');
const toISODate = (y: number, m0: number, d: number) => `${y}-${pad2(m0 + 1)}-${pad2(d)}`;

export const defaultPeriodFilter = (): PeriodFilterValue => ({ mode: 'MONTH', anchor: new Date() });

/** Resolves any PeriodFilterValue into a concrete [start, end] ISO date range + display label. */
export const resolvePeriodRange = (value: PeriodFilterValue): { start: string; end: string; label: string } => {
    if (value.mode === 'RANGE') {
        const fmt = (iso: string) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
        return { start: value.start, end: value.end, label: `${fmt(value.start)} – ${fmt(value.end)}` };
    }
    const y = value.anchor.getFullYear();
    const m = value.anchor.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return {
        start: toISODate(y, m, 1),
        end: toISODate(y, m, lastDay),
        label: value.anchor.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    };
};

/** All calendar days between start and end (inclusive), as ISO date strings. Capped to avoid runaway loops on bad input. */
export const eachDateInRange = (startISO: string, endISO: string, maxDays = 1100): string[] => {
    if (!startISO || !endISO || startISO > endISO) return [];
    const [sy, sm, sd] = startISO.split('-').map(Number);
    const cursor = new Date(sy, sm - 1, sd);
    const dates: string[] = [];
    while (dates.length < maxDays) {
        const iso = toISODate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        if (iso > endISO) break;
        dates.push(iso);
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
};
