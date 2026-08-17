import React from 'react';
import { Plus, Search, ArrowDownCircle, Trash2 } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { Transaction } from '@/types';
import { formatCurrency, PeriodFilterValue } from './financeUtils';
import PeriodFilter from './PeriodFilter';

interface PayableStats {
    list: Transaction[];
    overdueAmount: number; overdueCount: number;
    dueTodayAmount: number; dueTodayCount: number;
    upcomingAmount: number; upcomingCount: number;
    paidAmount: number; paidCount: number;
    totalAmount: number;
}

interface PayablesTabProps {
    payablePeriod: PeriodFilterValue; setPayablePeriod: React.Dispatch<React.SetStateAction<PeriodFilterValue>>;
    payableAccountFilter: string; setPayableAccountFilter: (id: string) => void;
    payableSearch: string; setPayableSearch: (v: string) => void;
    payableStats: PayableStats;
    today: string;
    openTxModal: (tx?: Transaction, prefillType?: 'EXPENSE' | 'INCOME') => void;
    handleDeleteClick: (tx: Transaction) => void;
}

const PayablesTab: React.FC<PayablesTabProps> = ({
    payablePeriod, setPayablePeriod, payableAccountFilter, setPayableAccountFilter,
    payableSearch, setPayableSearch, payableStats, today, openTxModal, handleDeleteClick
}) => {
    const { accounts, contacts } = useNexus();

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[#0a0f1e]">Contas a Pagar</h2>
                    <p className="text-[#64748b] text-sm">Despesas do período selecionado.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <select value={payableAccountFilter} onChange={e => setPayableAccountFilter(e.target.value)}
                        className="border border-[#e0f2fe] rounded-lg px-3 py-2 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                        <option value="">Todas as contas</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <PeriodFilter value={payablePeriod} onChange={setPayablePeriod} />
                    <button onClick={() => openTxModal(undefined, 'EXPENSE')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm"
                        style={{ background: '#ef4444' }}>
                        <Plus size={16} /> Nova Despesa
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Vencidos</p>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(payableStats.overdueAmount)}</p>
                    <p className="text-xs text-red-500 mt-0.5">{payableStats.overdueCount} lançamento{payableStats.overdueCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Vencem Hoje</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(payableStats.dueTodayAmount)}</p>
                    <p className="text-xs text-amber-500 mt-0.5">{payableStats.dueTodayCount} lançamento{payableStats.dueTodayCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">A Vencer</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(payableStats.upcomingAmount)}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{payableStats.upcomingCount} lançamento{payableStats.upcomingCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Pagos</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(payableStats.paidAmount)}</p>
                    <p className="text-xs text-green-500 mt-0.5">{payableStats.paidCount} lançamento{payableStats.paidCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-white border border-[#e0f2fe] rounded-xl p-4 md:col-span-1 col-span-2">
                    <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-1">Total do Período</p>
                    <p className="text-xl font-bold text-[#0a0f1e]">{formatCurrency(payableStats.totalAmount)}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{payableStats.list.length} lançamento{payableStats.list.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-[#64748b]" size={16} />
                <input type="text" placeholder="Pesquisar no período selecionado..." value={payableSearch}
                    onChange={e => setPayableSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-[#e0f2fe] rounded-lg text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] overflow-hidden">
                {payableStats.list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[#64748b]">
                        <ArrowDownCircle size={36} className="mb-3 text-[#e0f2fe]" />
                        <p className="font-medium text-sm">Nenhuma despesa neste período.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f0f9ff] text-[#64748b] text-xs font-bold uppercase tracking-wide border-b border-[#e0f2fe]">
                                    <th className="px-4 py-3 text-left">Vencimento</th>
                                    <th className="px-4 py-3 text-left hidden md:table-cell">Pagamento</th>
                                    <th className="px-4 py-3 text-left">Resumo do lançamento</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-right hidden md:table-cell">A Pagar</th>
                                    <th className="px-4 py-3 text-center">Situação</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f9ff]">
                                {payableStats.list.map(tx => {
                                    const contact = contacts.find(c => c.id === tx.contactId);
                                    const account = accounts.find(a => a.id === tx.accountId);
                                    const isPaid = tx.status === 'PAID';
                                    const isOverdue = !isPaid && tx.date < today;
                                    const isDueToday = !isPaid && tx.date === today;
                                    const statusCfg = isPaid
                                        ? { label: 'Pago', cls: 'bg-green-100 text-green-700' }
                                        : isOverdue ? { label: 'Vencido', cls: 'bg-red-100 text-red-700' }
                                        : isDueToday ? { label: 'Vence hoje', cls: 'bg-amber-100 text-amber-700' }
                                        : { label: 'A vencer', cls: 'bg-blue-100 text-blue-700' };
                                    return (
                                        <tr
                                            key={tx.id}
                                            onClick={() => openTxModal(tx)}
                                            className={`group hover:bg-[#f0f9ff] transition-colors cursor-pointer ${isOverdue ? 'border-l-2 border-red-400' : ''}`}
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`text-sm ${isOverdue ? 'text-red-600 font-bold' : 'text-[#64748b]'}`}>
                                                    {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell text-[#64748b] whitespace-nowrap">
                                                {tx.paidAt ? new Date(tx.paidAt + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-[#0a0f1e] leading-tight">{tx.description}</p>
                                                <div className="flex gap-2 mt-0.5 flex-wrap">
                                                    {contact && <span className="text-xs text-[#64748b]">{contact.name}</span>}
                                                    {account && <span className="text-xs text-[#0284c7] bg-[#e0f2fe] px-1.5 py-0.5 rounded">{account.name}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-[#0a0f1e] whitespace-nowrap tabular-nums">
                                                {formatCurrency(tx.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-right hidden md:table-cell tabular-nums">
                                                {isPaid ? <span className="text-[#94a3b8]">0,00</span> : <span className="font-bold text-red-600">{formatCurrency(tx.amount)}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusCfg.cls}`}>
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleDeleteClick(tx)} className="p-1 text-[#64748b] hover:text-red-500 rounded"><Trash2 size={15} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayablesTab;
