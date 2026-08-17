import React from 'react';
import { BadgeCheck, CheckSquare, Square, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { Transaction } from '@/types';
import { formatCurrency } from './financeUtils';

type ReconFilter = 'ALL' | 'PENDING' | 'RECONCILED';

interface ReconStatement {
    rows: (Transaction & { runningBalance: number })[];
    acc: { id: string; name: string; balance: number } | null;
    reconciledAmount: number;
    pendingCount: number;
    pendingAmount: number;
}

interface ReconciliationTabProps {
    reconAccountId: string; setReconAccountId: (id: string) => void;
    reconPeriodStart: string; setReconPeriodStart: (v: string) => void;
    reconPeriodEnd: string; setReconPeriodEnd: (v: string) => void;
    reconFilter: ReconFilter; setReconFilter: (f: ReconFilter) => void;
    reconStatement: ReconStatement;
    onOpenImport: () => void;
}

const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
    reconAccountId, setReconAccountId, reconPeriodStart, setReconPeriodStart,
    reconPeriodEnd, setReconPeriodEnd, reconFilter, setReconFilter, reconStatement, onOpenImport
}) => {
    const { accounts, contacts, updateTransaction, settings } = useNexus();

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white rounded-xl border border-[#e0f2fe] overflow-hidden shadow-sm">
                <div className="bg-[#0284c7] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <BadgeCheck size={16} className="text-white/70" />
                            <span className="text-xs font-bold tracking-widest uppercase text-white/60">Módulo Financeiro</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">Conciliação Bancária</h2>
                        <p className="text-white/70 text-sm mt-0.5">Confira os lançamentos do sistema com o extrato do banco.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onOpenImport}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#0284c7] bg-white rounded-lg shadow-sm hover:bg-[#f0f9ff] transition-colors"
                        >
                            <Upload size={16} /> Importar Extrato
                        </button>
                        <div className="text-right hidden md:block">
                            <p className="text-white/60 text-xs">Empresa</p>
                            <p className="text-white font-bold">{settings.companyName}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-[#e0f2fe] flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-xs font-bold text-[#64748b] mb-1">Conta</label>
                        <select
                            value={reconAccountId || (accounts[0]?.id ?? '')}
                            onChange={e => setReconAccountId(e.target.value)}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}{acc.bankName ? ` — ${acc.bankName}` : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#64748b] mb-1">De</label>
                        <input
                            type="date"
                            value={reconPeriodStart}
                            onChange={e => setReconPeriodStart(e.target.value)}
                            className="border border-[#e0f2fe] rounded-lg p-2 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#64748b] mb-1">Até</label>
                        <input
                            type="date"
                            value={reconPeriodEnd}
                            onChange={e => setReconPeriodEnd(e.target.value)}
                            className="border border-[#e0f2fe] rounded-lg p-2 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                        />
                    </div>
                    <div className="flex rounded-lg border border-[#e0f2fe] overflow-hidden text-sm">
                        {(['ALL', 'PENDING', 'RECONCILED'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setReconFilter(f)}
                                className={`px-3 py-2 font-medium transition-colors ${reconFilter === f ? 'bg-[#0284c7] text-white' : 'bg-white text-[#64748b] hover:bg-[#f0f9ff]'}`}
                            >
                                {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Pendentes' : 'Conciliados'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-[#e0f2fe] p-4 shadow-sm">
                    <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-1">Saldo da Conta</p>
                    <p className="text-xl font-bold text-[#0a0f1e]">{formatCurrency(reconStatement.acc?.balance ?? 0)}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{reconStatement.acc?.name ?? '—'}</p>
                </div>
                <div className="bg-white rounded-xl border border-[#e0f2fe] p-4 shadow-sm">
                    <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-1">Lançamentos no Período</p>
                    <p className="text-xl font-bold text-[#0a0f1e]">{reconStatement.rows.length}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">pagos no período selecionado</p>
                </div>
                <div className="bg-white rounded-xl border border-[#e0f2fe] p-4 shadow-sm">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Conciliados</p>
                    <p className="text-xl font-bold text-emerald-600">
                        {reconStatement.rows.filter(r => r.isReconciled).length}
                    </p>
                    <p className="text-xs text-[#64748b] mt-0.5">lançamentos confirmados</p>
                </div>
                <div className="bg-white rounded-xl border border-[#e0f2fe] p-4 shadow-sm">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Pendentes</p>
                    <p className="text-xl font-bold text-amber-600">{reconStatement.pendingCount}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{formatCurrency(reconStatement.pendingAmount)} a verificar</p>
                </div>
            </div>

            {/* Transaction table */}
            <div className="bg-white rounded-xl border border-[#e0f2fe] shadow-sm overflow-hidden">
                {/* Table actions */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0f2fe] gap-3 flex-wrap">
                    <p className="text-sm font-bold text-[#0a0f1e]">
                        {reconStatement.rows.filter(r => reconFilter === 'ALL' || (reconFilter === 'PENDING' ? !r.isReconciled : r.isReconciled)).length} lançamento(s)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const toMark = reconStatement.rows.filter(r => !r.isReconciled);
                                toMark.forEach(r => updateTransaction({ ...r, isReconciled: true }));
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                            <CheckSquare size={13} /> Conciliar Todos
                        </button>
                        <button
                            onClick={() => {
                                const toMark = reconStatement.rows.filter(r => r.isReconciled);
                                toMark.forEach(r => updateTransaction({ ...r, isReconciled: false }));
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <Square size={13} /> Desconciliar Todos
                        </button>
                    </div>
                </div>

                {reconStatement.rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[#64748b]">
                        <BadgeCheck size={36} className="mb-3 text-[#e0f2fe]" />
                        <p className="font-medium text-sm">Nenhum lançamento pago neste período.</p>
                        <p className="text-xs mt-1">Selecione outra conta ou ajuste o intervalo de datas.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f0f9ff] text-[#64748b] text-xs font-bold uppercase tracking-wide">
                                    <th className="px-4 py-3 text-left w-8"></th>
                                    <th className="px-4 py-3 text-left">Data</th>
                                    <th className="px-4 py-3 text-left">Descrição</th>
                                    <th className="px-4 py-3 text-left hidden md:table-cell">Método</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3 text-right hidden md:table-cell">Saldo Acumulado</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f9ff]">
                                {reconStatement.rows
                                    .filter(r => reconFilter === 'ALL' || (reconFilter === 'PENDING' ? !r.isReconciled : r.isReconciled))
                                    .map(row => {
                                        const contact = contacts.find(c => c.id === row.contactId);
                                        const methodLabels: Record<string, string> = {
                                            PIX: 'Pix', CREDIT_CARD: 'Crédito', DEBIT_CARD: 'Débito',
                                            CASH: 'Dinheiro', BOLETO: 'Boleto', TRANSFER: 'Transferência', OTHER: 'Outro'
                                        };
                                        return (
                                            <tr
                                                key={row.id}
                                                className={`transition-colors ${row.isReconciled ? 'bg-emerald-50/40' : 'hover:bg-[#f0f9ff]'}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => updateTransaction({ ...row, isReconciled: !row.isReconciled })}
                                                        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${row.isReconciled ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[#cbd5e1] hover:border-[#0284c7]'}`}
                                                    >
                                                        {row.isReconciled && <CheckSquare size={12} />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-[#64748b] whitespace-nowrap">
                                                    {new Date((row.paidAt || row.date) + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-[#0a0f1e] leading-tight">{row.description}</p>
                                                    {contact && <p className="text-xs text-[#64748b] mt-0.5">{contact.name}</p>}
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <span className="text-xs bg-[#f0f9ff] text-[#64748b] px-2 py-0.5 rounded-full">
                                                        {methodLabels[row.paymentMethod] ?? row.paymentMethod}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                                                    <span className={row.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}>
                                                        {row.type === 'INCOME' ? '+' : '-'}{formatCurrency(row.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right hidden md:table-cell">
                                                    <span className={`font-mono text-sm ${row.runningBalance >= 0 ? 'text-[#0a0f1e]' : 'text-red-600'}`}>
                                                        {formatCurrency(row.runningBalance)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {row.isReconciled ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                            <CheckCircle size={11} /> Conciliado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                            <AlertCircle size={11} /> Pendente
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                }
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer with balance summary */}
                {reconStatement.rows.length > 0 && (
                    <div className="px-4 py-3 border-t border-[#e0f2fe] bg-[#f8fafc] flex flex-wrap gap-6 justify-end text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-[#64748b]">Saldo conciliado no período:</span>
                            <span className={`font-bold ${reconStatement.reconciledAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(reconStatement.reconciledAmount)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[#64748b]">Saldo final do período:</span>
                            <span className="font-bold text-[#0a0f1e]">
                                {reconStatement.rows.length > 0 ? formatCurrency(reconStatement.rows[reconStatement.rows.length - 1].runningBalance) : '—'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReconciliationTab;
