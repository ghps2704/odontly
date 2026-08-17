import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { PaymentLine, PaymentMethod, RecurrenceFrequency } from '@/types';
import { formatCurrency } from './financeUtils';
import { buildDefaultSchedule, splitAmountEvenly, validatePaymentLines } from '@/lib/paymentLines';

interface PaymentLinesEditorProps {
    lines: PaymentLine[];
    onChange: (lines: PaymentLine[]) => void;
    totalAmount: number;
    contextDate: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const PaymentLinesEditor: React.FC<PaymentLinesEditorProps> = ({ lines, onChange, totalAmount, contextDate }) => {
    const { accounts } = useNexus();
    const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

    const validation = validatePaymentLines(lines, totalAmount);
    const dividedAmount = lines.reduce((s, l) => s + l.amount, 0);

    const regenerateSchedule = (line: PaymentLine, patch: Partial<PaymentLine>): PaymentLine => {
        const merged = { ...line, ...patch };
        return {
            ...merged,
            schedule: buildDefaultSchedule(merged.amount, merged.dueDate, merged.frequency, merged.occurrences),
        };
    };

    // Percentage is the durable source of truth for a line — if the cart total
    // changes after payment lines were configured (items added/removed,
    // discount edited), re-derive each line's R$ amount/schedule from its %
    // so the split stays correct instead of silently going stale.
    useEffect(() => {
        if (lines.length === 0) return;
        const sumAmount = round2(lines.reduce((s, l) => s + l.amount, 0));
        if (Math.abs(sumAmount - totalAmount) < 0.01) return;
        onChange(lines.map(l => regenerateSchedule(l, { amount: round2(totalAmount * (l.percentage / 100)) })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalAmount]);

    const updateLine = (id: string, patch: Partial<PaymentLine>, regenerate = true) => {
        onChange(lines.map(l => {
            if (l.id !== id) return l;
            return regenerate ? regenerateSchedule(l, patch) : { ...l, ...patch };
        }));
    };

    const handlePercentageChange = (id: string, pct: number) => {
        const amount = round2(totalAmount * (pct / 100));
        updateLine(id, { percentage: pct, amount });
    };

    const handleAmountChange = (id: string, amt: number) => {
        const percentage = totalAmount > 0 ? round2((amt / totalAmount) * 100) : 0;
        updateLine(id, { amount: amt, percentage });
    };

    const handleScheduleCellChange = (lineId: string, index: number, field: 'date' | 'amount', value: string) => {
        onChange(lines.map(l => {
            if (l.id !== lineId) return l;
            const schedule = l.schedule.map((s, i) => i === index
                ? { ...s, [field]: field === 'amount' ? (parseFloat(value) || 0) : value }
                : s);
            return { ...l, schedule };
        }));
    };

    const addLine = () => {
        const newCount = lines.length + 1;
        const percentages = splitAmountEvenly(100, newCount);
        const newLines = [...lines, {
            id: Date.now().toString(),
            percentage: 0,
            amount: 0,
            paymentMethod: 'PIX' as PaymentMethod,
            accountId: accounts[0]?.id || '',
            dueDate: contextDate,
            frequency: 'MONTHLY' as RecurrenceFrequency,
            occurrences: 1,
            schedule: [],
        }];
        onChange(newLines.map((l, i) => {
            const percentage = percentages[i];
            const amount = round2(totalAmount * (percentage / 100));
            return regenerateSchedule(l, { percentage, amount });
        }));
    };

    const removeLine = (id: string) => {
        const remaining = lines.filter(l => l.id !== id);
        const percentages = splitAmountEvenly(100, remaining.length);
        onChange(remaining.map((l, i) => {
            const percentage = percentages[i];
            const amount = round2(totalAmount * (percentage / 100));
            return regenerateSchedule(l, { percentage, amount });
        }));
    };

    return (
        <div className="space-y-3">
            {lines.map((line, idx) => {
                const lineError = validation.lineErrors[line.id];
                const isExpanded = expandedScheduleId === line.id;
                return (
                    <div key={line.id} className="border border-[#e0f2fe] rounded-lg p-3 bg-[#f8fafc]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-[#64748b] uppercase tracking-wide">
                                Forma de pagamento {lines.length > 1 ? idx + 1 : ''}
                            </span>
                            {lines.length > 1 && (
                                <button type="button" onClick={() => removeLine(line.id)} className="text-[#64748b] hover:text-red-500 p-1">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        <div className={`grid gap-3 ${lines.length > 1 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
                            {lines.length > 1 && (
                                <div>
                                    <label className="block text-xs font-bold text-[#64748b] mb-1">%</label>
                                    <div className="flex gap-1 items-center">
                                        <input
                                            type="number" min="0" max="100" step="0.01"
                                            value={line.percentage}
                                            onChange={e => handlePercentageChange(line.id, parseFloat(e.target.value) || 0)}
                                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                                        />
                                    </div>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={line.amount}
                                        onChange={e => handleAmountChange(line.id, parseFloat(e.target.value) || 0)}
                                        className="w-full border border-[#e0f2fe] rounded-lg p-1.5 bg-white text-[#64748b] text-xs mt-1"
                                        title="Editar em R$"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-[#64748b] mb-1">Forma de Pagamento</label>
                                <select
                                    value={line.paymentMethod}
                                    onChange={e => updateLine(line.id, { paymentMethod: e.target.value as PaymentMethod }, false)}
                                    className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                                >
                                    <option value="PIX">Pix</option>
                                    <option value="CREDIT_CARD">Cartão Crédito</option>
                                    <option value="DEBIT_CARD">Cartão Débito</option>
                                    <option value="BOLETO">Boleto</option>
                                    <option value="CASH">Dinheiro</option>
                                    <option value="TRANSFER">TED/DOC</option>
                                    <option value="OTHER">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#64748b] mb-1">Conta de Pagamento</label>
                                <select
                                    value={line.accountId}
                                    onChange={e => updateLine(line.id, { accountId: e.target.value }, false)}
                                    className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                                >
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#64748b] mb-1">Vencimento</label>
                                <input
                                    type="date"
                                    value={line.dueDate}
                                    onChange={e => updateLine(line.id, { dueDate: e.target.value })}
                                    className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-end gap-3 mt-3">
                            <div>
                                <label className="block text-xs font-bold text-[#64748b] mb-1">Parcelas</label>
                                <input
                                    type="number" min="1" max="60"
                                    value={line.occurrences}
                                    onChange={e => updateLine(line.id, { occurrences: Math.max(1, parseInt(e.target.value) || 1) })}
                                    className="w-20 border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                                />
                            </div>
                            {line.occurrences > 1 && (
                                <div>
                                    <label className="block text-xs font-bold text-[#64748b] mb-1">Frequência</label>
                                    <select
                                        value={line.frequency}
                                        onChange={e => updateLine(line.id, { frequency: e.target.value as RecurrenceFrequency })}
                                        className="border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                                    >
                                        <option value="WEEKLY">Semanal</option>
                                        <option value="BIWEEKLY">Quinzenal</option>
                                        <option value="MONTHLY">Mensal</option>
                                        <option value="QUARTERLY">Trimestral</option>
                                        <option value="YEARLY">Anual</option>
                                    </select>
                                </div>
                            )}
                            {line.occurrences > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setExpandedScheduleId(isExpanded ? null : line.id)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#0284c7] bg-white border border-[#bae6fd] rounded-lg hover:bg-[#f0f9ff]"
                                >
                                    <Pencil size={12} /> Editar parcelas
                                </button>
                            )}
                        </div>

                        {line.occurrences > 1 && isExpanded && (
                            <div className="mt-3 border border-[#e0f2fe] rounded-lg overflow-hidden animate-in slide-in-from-top-1">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-white text-[#64748b] font-bold uppercase tracking-wide border-b border-[#e0f2fe]">
                                            <th className="px-3 py-2 text-left">Parcela</th>
                                            <th className="px-3 py-2 text-left">Vencimento</th>
                                            <th className="px-3 py-2 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e0f2fe] bg-white">
                                        {line.schedule.map((installment, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-1.5 text-[#64748b]">{i + 1}/{line.occurrences}</td>
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        type="date"
                                                        value={installment.date}
                                                        onChange={e => handleScheduleCellChange(line.id, i, 'date', e.target.value)}
                                                        className="border border-[#e0f2fe] rounded p-1 bg-white text-[#0a0f1e] text-xs w-full"
                                                    />
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <input
                                                        type="number" step="0.01"
                                                        value={installment.amount}
                                                        onChange={e => handleScheduleCellChange(line.id, i, 'amount', e.target.value)}
                                                        className="border border-[#e0f2fe] rounded p-1 bg-white text-[#0a0f1e] text-xs w-full text-right"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {lineError && (
                                    <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 text-xs font-bold">
                                        <AlertTriangle size={12} /> {lineError}
                                    </div>
                                )}
                            </div>
                        )}
                        {line.occurrences > 1 && !isExpanded && lineError && (
                            <p className="flex items-center gap-1.5 text-xs text-red-600 font-bold mt-2">
                                <AlertTriangle size={12} /> {lineError}
                            </p>
                        )}
                    </div>
                );
            })}

            <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-2 text-sm font-bold text-[#0284c7] hover:underline"
            >
                <Plus size={14} /> Adicionar forma de pagamento
            </button>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold ${validation.percentageOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {validation.percentageOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                Total dividido: {formatCurrency(dividedAmount)} de {formatCurrency(totalAmount)}
                {!validation.percentageOk && ` (percentuais somam ${validation.percentageSum}%)`}
            </div>
        </div>
    );
};

export default PaymentLinesEditor;
