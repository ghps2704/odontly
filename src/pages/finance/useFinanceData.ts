import { useMemo } from 'react';
import { useNexus } from '@/contexts/NexusContext';
import { DRECategoryType, FinancialCategory, TransactionItem } from '@/types';
import { DRE_STRUCTURE_LABELS, PeriodFilterValue, resolvePeriodRange, eachDateInRange } from './financeUtils';

interface FinanceDataFilters {
    cashflowPeriod: PeriodFilterValue;
    selectedContactFilter: string;
    cashflowAccountFilter: string;
    dreMonth: Date;
    payablePeriod: PeriodFilterValue;
    payableAccountFilter: string;
    payableSearch: string;
    receivablePeriod: PeriodFilterValue;
    receivableAccountFilter: string;
    receivableSearch: string;
    selectedAccountId: string | null;
    reconAccountId: string;
    reconPeriodStart: string;
    reconPeriodEnd: string;
}

/**
 * Every derived/computed value the Finance page's tabs need, centralized so
 * each tab reads only what it uses instead of one 2000+ line component body.
 * Behavior-preserving extraction from the original Finance.tsx — same memo
 * boundaries, same dependency arrays, just relocated.
 */
export function useFinanceData(filters: FinanceDataFilters) {
    const { transactions, accounts, categories, contacts, appointments, items } = useNexus();
    const {
        cashflowPeriod, selectedContactFilter, cashflowAccountFilter, dreMonth,
        payablePeriod, payableAccountFilter, payableSearch,
        receivablePeriod, receivableAccountFilter, receivableSearch,
        selectedAccountId, reconAccountId, reconPeriodStart, reconPeriodEnd
    } = filters;

    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    const cashflowRange = useMemo(() => resolvePeriodRange(cashflowPeriod), [cashflowPeriod]);
    const payableRange = useMemo(() => resolvePeriodRange(payablePeriod), [payablePeriod]);
    const receivableRange = useMemo(() => resolvePeriodRange(receivablePeriod), [receivablePeriod]);

    // Orçamentos (saleType QUOTE) are a proposal, not a committed sale — they
    // never count toward cashflow, DRE, or A Receber until converted. Every
    // "real money" computation below reads from realTransactions instead of
    // the raw `transactions` list.
    const realTransactions = useMemo(() => transactions.filter(t => t.saleType !== 'QUOTE'), [transactions]);

    // --- PROJECTION ENGINE ---
    const unifiedTransactions = useMemo(() => {
        const realTxs = realTransactions.map(t => ({ ...t, isProjected: false, source: 'FINANCE' }));

        // Always calculate virtual transactions from Agenda
        const virtualTxs = appointments
            .filter(appt => appt.status === 'SCHEDULED' || appt.status === 'IN_PROGRESS')
            .map(appt => {
                const totalAmount = appt.items ? appt.items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0) : 0;

                // Build a virtual items list for display
                const virtualItems: TransactionItem[] = appt.items?.map(i => {
                    const def = items.find(x => x.id === i.itemId);
                    return {
                        itemId: i.itemId,
                        name: def?.name || 'Item Agenda',
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        total: i.quantity * i.unitPrice,
                        categoryId: 'virtual',
                        categoryName: 'Previsão'
                    };
                }) || [];

                return {
                    id: `virtual_${appt.id}`,
                    date: appt.date,
                    description: `(Agenda) ${appt.clientName}`,
                    amount: totalAmount,
                    type: 'INCOME',
                    category: 'Previsão Agenda',
                    accountId: 'provisional',
                    status: 'PENDING',
                    isProjected: true,
                    contactId: appt.clientId,
                    items: virtualItems,
                    source: 'AGENDA'
                } as any;
            });

        const all = [...realTxs, ...virtualTxs].filter(t => {
            const dateMatch = t.date >= cashflowRange.start && t.date <= cashflowRange.end;
            const contactMatch = selectedContactFilter ? t.contactId === selectedContactFilter : true;
            return dateMatch && contactMatch;
        });

        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [realTransactions, appointments, cashflowRange, items, selectedContactFilter]);

    const dreTransactions = useMemo(() => {
        const startOfMonth = new Date(dreMonth.getFullYear(), dreMonth.getMonth(), 1);
        const endOfMonth = new Date(dreMonth.getFullYear(), dreMonth.getMonth() + 1, 0);

        return realTransactions.filter(t => {
            const parts = t.date.split('-');
            const tDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return tDate >= startOfMonth && tDate <= endOfMonth;
        });
    }, [realTransactions, dreMonth]);

    const dreGroupedCategories = useMemo(() => {
        const groups: Record<string, FinancialCategory[]> = {};
        Object.keys(DRE_STRUCTURE_LABELS).forEach(key => groups[key] = []);
        categories.forEach(cat => {
            if (groups[cat.dreClass]) {
                groups[cat.dreClass].push(cat);
            }
        });
        return groups;
    }, [categories]);

    // --- CHART DATA GENERATORS ---
    const projectionChartData = useMemo(() => {
        const dates = eachDateInRange(cashflowRange.start, cashflowRange.end);
        const sameMonth = cashflowRange.start.slice(0, 7) === cashflowRange.end.slice(0, 7);

        return dates.map(dateStr => {
            const [, m, d] = dateStr.split('-');
            const dayTxs = unifiedTransactions.filter(t => t.date === dateStr);

            const realizedIncome = dayTxs.filter(t => t.type === 'INCOME' && !t.isProjected && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
            const realizedExpense = dayTxs.filter(t => t.type === 'EXPENSE' && !t.isProjected && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);

            const projectedIncome = dayTxs.filter(t => t.type === 'INCOME' && (t.isProjected || t.status === 'PENDING')).reduce((acc, t) => acc + t.amount, 0);
            const projectedExpense = dayTxs.filter(t => t.type === 'EXPENSE' && (t.isProjected || t.status === 'PENDING')).reduce((acc, t) => acc + t.amount, 0);

            return {
                day: sameMonth ? d : `${d}/${m}`,
                Realizado: realizedIncome - realizedExpense,
                Projetado: (realizedIncome + projectedIncome) - (realizedExpense + projectedExpense),
                EntradaReal: realizedIncome,
                SaidaReal: realizedExpense,
                EntradaProj: projectedIncome,
                SaidaProj: projectedExpense
            };
        });
    }, [unifiedTransactions, cashflowRange]);

    // --- DRE CALCULATION ENGINE V2 (Strictly Item Based + Fallback) ---
    const dreReport = useMemo(() => {
        const report: Record<DRECategoryType, { total: number, details: Record<string, number> }> = {
            GROSS_REVENUE: { total: 0, details: {} },
            DEDUCTIONS: { total: 0, details: {} },
            VARIABLE_COST: { total: 0, details: {} },
            VARIABLE_EXPENSE: { total: 0, details: {} },
            PERSONNEL: { total: 0, details: {} },
            OPERATIONAL_EXPENSE: { total: 0, details: {} },
            DEPRECIATION: { total: 0, details: {} },
            OTHER_RESULT: { total: 0, details: {} },
            INCOME_TAX: { total: 0, details: {} }
        };

        dreTransactions.forEach(tx => {
            // 1. Try Detailed Items (New Standard)
            if (tx.items && tx.items.length > 0) {
                tx.items.forEach(item => {
                    const cat = categories.find(c => c.id === item.categoryId);
                    if (cat && report[cat.dreClass]) {
                        let val = item.total;
                        if (cat.dreClass === 'OTHER_RESULT') {
                            val = tx.type === 'INCOME' ? val : -val;
                        }
                        report[cat.dreClass].total += val;
                        report[cat.dreClass].details[cat.name] = (report[cat.dreClass].details[cat.name] || 0) + val;
                    }
                });
            }
            // 2. Fallback: Legacy Header Category (For old transactions)
            else {
                let cat = categories.find(c => c.id === tx.categoryId);
                // Fallback by name if ID match fails
                if (!cat) cat = categories.find(c => c.name === tx.category);

                if (cat && report[cat.dreClass]) {
                    let valueToAdd = tx.amount;
                    if (cat.dreClass === 'OTHER_RESULT') {
                        valueToAdd = tx.type === 'INCOME' ? tx.amount : -tx.amount;
                    }
                    report[cat.dreClass].total += valueToAdd;
                    report[cat.dreClass].details[cat.name] = (report[cat.dreClass].details[cat.name] || 0) + valueToAdd;
                }
            }
        });

        const netRevenue = report.GROSS_REVENUE.total - report.DEDUCTIONS.total;
        const grossMargin = netRevenue - report.VARIABLE_COST.total;
        const contributionMargin = grossMargin - report.VARIABLE_EXPENSE.total;
        const ebitda = contributionMargin - report.PERSONNEL.total - report.OPERATIONAL_EXPENSE.total;
        const operationalResult = ebitda - report.DEPRECIATION.total + report.OTHER_RESULT.total;
        const netResult = operationalResult - report.INCOME_TAX.total;

        return { ...report, netRevenue, grossMargin, contributionMargin, ebitda, operationalResult, netResult };
    }, [dreTransactions, categories]);

    // Stats for the Cards
    const monthStats = useMemo(() => {
        const totalIncome = unifiedTransactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
        const totalExpense = unifiedTransactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);

        const realizedIncome = unifiedTransactions.filter(t => t.type === 'INCOME' && !t.isProjected && t.status === 'PAID').reduce((a, b) => a + b.amount, 0);
        const realizedExpense = unifiedTransactions.filter(t => t.type === 'EXPENSE' && !t.isProjected && t.status === 'PAID').reduce((a, b) => a + b.amount, 0);

        const pendingIncome = totalIncome - realizedIncome;
        const pendingExpense = totalExpense - realizedExpense;

        return { totalIncome, totalExpense, realizedIncome, realizedExpense, pendingIncome, pendingExpense };
    }, [unifiedTransactions]);

    const currentTotalBalance = useMemo(() => accounts.reduce((acc, a) => acc + a.balance, 0), [accounts]);

    // Per-account stats for current calendar month
    const accountStats = useMemo(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const result: Record<string, { monthIncome: number; monthExpense: number; pendingCount: number }> = {};
        accounts.forEach(acc => {
            const accTxs = realTransactions.filter(t => {
                if (t.accountId !== acc.id) return false;
                const parts = t.date.split('-');
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                return d >= start && d <= end;
            });
            result[acc.id] = {
                monthIncome: accTxs.filter(t => t.type === 'INCOME' && t.status === 'PAID').reduce((a, b) => a + b.amount, 0),
                monthExpense: accTxs.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((a, b) => a + b.amount, 0),
                pendingCount: accTxs.filter(t => !t.isReconciled && t.status === 'PAID').length
            };
        });
        return result;
    }, [accounts, realTransactions]);

    const totalPendingReconciliation = useMemo(
        () => realTransactions.filter(t => !t.isReconciled && t.status === 'PAID').length,
        [realTransactions]
    );

    // Running balance statement for selected account
    const accountStatement = useMemo(() => {
        if (!selectedAccountId) return [];
        const acc = accounts.find(a => a.id === selectedAccountId);
        if (!acc) return [];
        const accTxs = realTransactions
            .filter(t => t.accountId === selectedAccountId)
            .sort((a, b) => {
                const da = new Date(a.date).getTime();
                const db = new Date(b.date).getTime();
                return da !== db ? da - db : (a.id < b.id ? -1 : 1);
            });
        let running = acc.initialBalance;
        return accTxs.map(t => {
            if (t.status === 'PAID') {
                running += t.type === 'INCOME' ? t.amount : -t.amount;
            }
            return { ...t, runningBalance: running };
        });
    }, [selectedAccountId, accounts, realTransactions]);

    const payableStats = useMemo(() => {
        const { start, end } = payableRange;
        const list = realTransactions.filter(t => {
            if (t.type !== 'EXPENSE') return false;
            if (payableAccountFilter && t.accountId !== payableAccountFilter) return false;
            if (payableSearch && !t.description.toLowerCase().includes(payableSearch.toLowerCase()) &&
                !(contacts.find(c => c.id === t.contactId)?.name || '').toLowerCase().includes(payableSearch.toLowerCase())) return false;
            return t.date >= start && t.date <= end;
        }).sort((a, b) => a.date.localeCompare(b.date));

        const overdue = list.filter(t => t.status === 'PENDING' && t.date < today);
        const dueToday = list.filter(t => t.status === 'PENDING' && t.date === today);
        const upcoming = list.filter(t => t.status === 'PENDING' && t.date > today);
        const paid = list.filter(t => t.status === 'PAID');
        return {
            list,
            overdueAmount: overdue.reduce((s, t) => s + t.amount, 0), overdueCount: overdue.length,
            dueTodayAmount: dueToday.reduce((s, t) => s + t.amount, 0), dueTodayCount: dueToday.length,
            upcomingAmount: upcoming.reduce((s, t) => s + t.amount, 0), upcomingCount: upcoming.length,
            paidAmount: paid.reduce((s, t) => s + t.amount, 0), paidCount: paid.length,
            totalAmount: list.reduce((s, t) => s + t.amount, 0),
        };
    }, [realTransactions, payableRange, payableAccountFilter, payableSearch, contacts, today]);

    const receivableStats = useMemo(() => {
        const { start, end } = receivableRange;
        const list = realTransactions.filter(t => {
            if (t.type !== 'INCOME') return false;
            if (receivableAccountFilter && t.accountId !== receivableAccountFilter) return false;
            if (receivableSearch && !t.description.toLowerCase().includes(receivableSearch.toLowerCase()) &&
                !(contacts.find(c => c.id === t.contactId)?.name || '').toLowerCase().includes(receivableSearch.toLowerCase())) return false;
            return t.date >= start && t.date <= end;
        }).sort((a, b) => a.date.localeCompare(b.date));

        const overdue = list.filter(t => t.status === 'PENDING' && t.date < today);
        const dueToday = list.filter(t => t.status === 'PENDING' && t.date === today);
        const upcoming = list.filter(t => t.status === 'PENDING' && t.date > today);
        const received = list.filter(t => t.status === 'PAID');
        return {
            list,
            overdueAmount: overdue.reduce((s, t) => s + t.amount, 0), overdueCount: overdue.length,
            dueTodayAmount: dueToday.reduce((s, t) => s + t.amount, 0), dueTodayCount: dueToday.length,
            upcomingAmount: upcoming.reduce((s, t) => s + t.amount, 0), upcomingCount: upcoming.length,
            receivedAmount: received.reduce((s, t) => s + t.amount, 0), receivedCount: received.length,
            totalAmount: list.reduce((s, t) => s + t.amount, 0),
        };
    }, [realTransactions, receivableRange, receivableAccountFilter, receivableSearch, contacts, today]);

    // Orçamentos — same period/account/search filtering as receivableStats, but
    // reading from the RAW transactions list (only place QUOTE rows surface).
    const quoteStats = useMemo(() => {
        const { start, end } = receivableRange;
        const list = transactions.filter(t => {
            if (t.type !== 'INCOME' || t.saleType !== 'QUOTE') return false;
            if (receivableAccountFilter && t.accountId !== receivableAccountFilter) return false;
            if (receivableSearch && !t.description.toLowerCase().includes(receivableSearch.toLowerCase()) &&
                !(contacts.find(c => c.id === t.contactId)?.name || '').toLowerCase().includes(receivableSearch.toLowerCase())) return false;
            return t.date >= start && t.date <= end;
        }).sort((a, b) => a.date.localeCompare(b.date));
        return { list, totalAmount: list.reduce((s, t) => s + t.amount, 0) };
    }, [transactions, receivableRange, receivableAccountFilter, receivableSearch, contacts]);

    const cashflowDailyTable = useMemo(() => {
        const { start, end } = cashflowRange;

        // Avoid double counting — compute once outside
        const txsBeforeRange = realTransactions.filter(t => {
            if (cashflowAccountFilter && t.accountId !== cashflowAccountFilter) return false;
            if (t.status !== 'PAID') return false;
            return t.date < start;
        });
        const baseBalance = (cashflowAccountFilter
            ? (accounts.find(a => a.id === cashflowAccountFilter)?.initialBalance ?? 0)
            : accounts.reduce((s, a) => s + a.initialBalance, 0))
            + txsBeforeRange.reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);

        let running = baseBalance;
        return eachDateInRange(start, end).map(dateStr => {
            const dayTxs = realTransactions.filter(t => {
                if (cashflowAccountFilter && t.accountId !== cashflowAccountFilter) return false;
                if (t.status !== 'PAID') return false;
                return (t.paidAt || t.date) === dateStr;
            });
            const recebimentos = dayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
            const pagamentos = dayTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
            running += recebimentos - pagamentos;

            // What's still open (not yet paid/received) and due this day —
            // shown alongside the realized amounts so the daily table also
            // surfaces what's pending, not just what's already settled.
            const pendingDayTxs = realTransactions.filter(t => {
                if (cashflowAccountFilter && t.accountId !== cashflowAccountFilter) return false;
                if (t.status !== 'PENDING') return false;
                return t.date === dateStr;
            });
            const pendingReceivable = pendingDayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
            const pendingPayable = pendingDayTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

            const day = parseInt(dateStr.split('-')[2], 10);
            return {
                dateStr, day, recebimentos, pagamentos, pendingReceivable, pendingPayable,
                saldoFinal: running,
                hasMovement: recebimentos > 0 || pagamentos > 0 || pendingReceivable > 0 || pendingPayable > 0
            };
        });
    }, [realTransactions, accounts, cashflowRange, cashflowAccountFilter]);

    const reconStatement = useMemo(() => {
        const accId = reconAccountId || (accounts[0]?.id ?? '');
        const acc = accounts.find(a => a.id === accId);
        if (!acc) return { rows: [], acc: null, reconciledAmount: 0, pendingCount: 0, pendingAmount: 0 };

        const filtered = realTransactions
            .filter(t => {
                if (t.accountId !== accId) return false;
                if (t.status !== 'PAID') return false;
                const d = t.paidAt || t.date;
                return d >= reconPeriodStart && d <= reconPeriodEnd;
            })
            .sort((a, b) => {
                const da = (a.paidAt || a.date);
                const db = (b.paidAt || b.date);
                return da < db ? -1 : da > db ? 1 : 0;
            });

        let running = acc.initialBalance;
        // Advance running balance for all PAID transactions before the period
        realTransactions
            .filter(t => t.accountId === accId && t.status === 'PAID' && (t.paidAt || t.date) < reconPeriodStart)
            .forEach(t => { running += t.type === 'INCOME' ? t.amount : -t.amount; });

        const rows = filtered.map(t => {
            running += t.type === 'INCOME' ? t.amount : -t.amount;
            return { ...t, runningBalance: running };
        });

        const reconciledAmount = filtered.filter(t => t.isReconciled).reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
        const pendingCount = filtered.filter(t => !t.isReconciled).length;
        const pendingAmount = filtered.filter(t => !t.isReconciled).reduce((s, t) => s + t.amount, 0);

        return { rows, acc, reconciledAmount, pendingCount, pendingAmount };
    }, [reconAccountId, reconPeriodStart, reconPeriodEnd, accounts, realTransactions]);

    // ── INADIMPLÊNCIA ALERT ───────────────────────────────────────────
    const inadimplenciaAlert = useMemo(() => {
        const totalIncome = realTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
        const pending = realTransactions.filter(t => t.type === 'INCOME' && t.status === 'PENDING');
        const pendingAmount = pending.reduce((acc, t) => acc + t.amount, 0);
        const rate = totalIncome > 0 ? (pendingAmount / totalIncome) * 100 : 0;
        return { rate, pendingAmount, count: pending.length, isAlert: rate > 15 };
    }, [realTransactions]);

    return {
        today,
        cashflowRange, payableRange, receivableRange,
        unifiedTransactions, dreTransactions, dreGroupedCategories, projectionChartData, dreReport,
        monthStats, currentTotalBalance, accountStats, totalPendingReconciliation, accountStatement,
        payableStats, receivableStats, quoteStats, cashflowDailyTable, reconStatement, inadimplenciaAlert,
    };
}
