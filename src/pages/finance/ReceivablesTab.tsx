import React, { useState } from 'react';
import { Plus, Search, ArrowUpCircle, FileText, Trash2, ArrowRightCircle } from 'lucide-react';
import { useNexus } from '@/contexts/NexusContext';
import { Transaction } from '@/types';
import { formatCurrency, PeriodFilterValue } from './financeUtils';
import PeriodFilter from './PeriodFilter';

interface ReceivableStats {
    list: Transaction[];
    overdueAmount: number; overdueCount: number;
    dueTodayAmount: number; dueTodayCount: number;
    upcomingAmount: number; upcomingCount: number;
    receivedAmount: number; receivedCount: number;
    totalAmount: number;
}

interface QuoteStats {
    list: Transaction[];
    totalAmount: number;
}

interface ReceivablesTabProps {
    receivablePeriod: PeriodFilterValue; setReceivablePeriod: React.Dispatch<React.SetStateAction<PeriodFilterValue>>;
    receivableAccountFilter: string; setReceivableAccountFilter: (id: string) => void;
    receivableSearch: string; setReceivableSearch: (v: string) => void;
    receivableStats: ReceivableStats;
    quoteStats: QuoteStats;
    today: string;
    openTxModal: (tx?: Transaction, prefillType?: 'EXPENSE' | 'INCOME') => void;
    handleDeleteClick: (tx: Transaction) => void;
    onConvertToSale: (tx: Transaction) => void;
}

const ReceivablesTab: React.FC<ReceivablesTabProps> = ({
    receivablePeriod, setReceivablePeriod, receivableAccountFilter, setReceivableAccountFilter,
    receivableSearch, setReceivableSearch, receivableStats, quoteStats, today, openTxModal, handleDeleteClick, onConvertToSale
}) => {
    const { accounts, contacts } = useNexus();
    const [segment, setSegment] = useState<'RECEIVABLES' | 'QUOTES'>('RECEIVABLES');

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[#0a0f1e]">Contas a Receber</h2>
                    <p className="text-[#64748b] text-sm">Receitas do período selecionado.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <select value={receivableAccountFilter} onChange={e => setReceivableAccountFilter(e.target.value)}
                        className="border border-[#e0f2fe] rounded-lg px-3 py-2 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]">
                        <option value="">Todas as contas</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <PeriodFilter value={receivablePeriod} onChange={setReceivablePeriod} />
                    <button onClick={() => openTxModal(undefined, 'INCOME')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm"
                        style={{ background: '#16a34a' }}>
                        <Plus size={16} /> Nova Receita
                    </button>
                </div>
            </div>

            {/* Segment chips */}
            <div className="flex items-center gap-1 p-1 bg-[#f0f9ff] rounded-lg border border-[#e0f2fe] w-fit">
                <button
                    onClick={() => setSegment('RECEIVABLES')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${segment === 'RECEIVABLES' ? 'bg-white text-[#0284c7] shadow-sm' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}
                >
                    A Receber
                </button>
                <button
                    onClick={() => setSegment('QUOTES')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors flex items-center gap-1.5 ${segment === 'QUOTES' ? 'bg-white text-[#0284c7] shadow-sm' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}
                >
                    Orçamentos
                    {quoteStats.list.length > 0 && (
                        <span className={`text-xs font-bold px-1.5 rounded-full ${segment === 'QUOTES' ? 'bg-[#e0f2fe] text-[#0284c7]' : 'bg-[#e0f2fe] text-[#64748b]'}`}>
                            {quoteStats.list.length}
                        </span>
                    )}
                </button>
            </div>

            {segment === 'RECEIVABLES' ? (
            <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Vencidos</p>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(receivableStats.overdueAmount)}</p>
                    <p className="text-xs text-red-500 mt-0.5">{receivableStats.overdueCount} lançamento{receivableStats.overdueCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Vencem Hoje</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(receivableStats.dueTodayAmount)}</p>
                    <p className="text-xs text-amber-500 mt-0.5">{receivableStats.dueTodayCount} lançamento{receivableStats.dueTodayCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">A Receber</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(receivableStats.upcomingAmount)}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{receivableStats.upcomingCount} lançamento{receivableStats.upcomingCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Recebidos</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(receivableStats.receivedAmount)}</p>
                    <p className="text-xs text-green-500 mt-0.5">{receivableStats.receivedCount} lançamento{receivableStats.receivedCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-white border border-[#e0f2fe] rounded-xl p-4 md:col-span-1 col-span-2">
                    <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-1">Total do Período</p>
                    <p className="text-xl font-bold text-[#0a0f1e]">{formatCurrency(receivableStats.totalAmount)}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{receivableStats.list.length} lançamento{receivableStats.list.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-[#64748b]" size={16} />
                <input type="text" placeholder="Pesquisar no período selecionado..." value={receivableSearch}
                    onChange={e => setReceivableSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-[#e0f2fe] rounded-lg text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] overflow-hidden">
                {receivableStats.list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[#64748b]">
                        <ArrowUpCircle size={36} className="mb-3 text-[#e0f2fe]" />
                        <p className="font-medium text-sm">Nenhuma receita neste período.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f0f9ff] text-[#64748b] text-xs font-bold uppercase tracking-wide border-b border-[#e0f2fe]">
                                    <th className="px-4 py-3 text-left">Vencimento</th>
                                    <th className="px-4 py-3 text-left hidden md:table-cell">Recebimento</th>
                                    <th className="px-4 py-3 text-left">Resumo do lançamento</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-right hidden md:table-cell">A Receber</th>
                                    <th className="px-4 py-3 text-center">Situação</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f9ff]">
                                {receivableStats.list.map(tx => {
                                    const contact = contacts.find(c => c.id === tx.contactId);
                                    const account = accounts.find(a => a.id === tx.accountId);
                                    const isReceived = tx.status === 'PAID';
                                    const isOverdue = !isReceived && tx.date < today;
                                    const isDueToday = !isReceived && tx.date === today;
                                    const statusCfg = isReceived
                                        ? { label: 'Recebido', cls: 'bg-green-100 text-green-700' }
                                        : isOverdue ? { label: 'Vencido', cls: 'bg-red-100 text-red-700' }
                                        : isDueToday ? { label: 'Vence hoje', cls: 'bg-amber-100 text-amber-700' }
                                        : { label: 'A receber', cls: 'bg-blue-100 text-blue-700' };
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
                                                {isReceived ? <span className="text-[#94a3b8]">0,00</span> : <span className="font-bold text-green-600">{formatCurrency(tx.amount)}</span>}
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
            </>
            ) : (
            <>
            {/* Quotes summary */}
            <div className="bg-white border border-[#e0f2fe] rounded-xl p-4 w-fit">
                <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-1">Total em Orçamentos</p>
                <p className="text-xl font-bold text-[#0a0f1e]">{formatCurrency(quoteStats.totalAmount)}</p>
                <p className="text-xs text-[#64748b] mt-0.5">{quoteStats.list.length} orçamento{quoteStats.list.length !== 1 ? 's' : ''} — não entram em caixa, DRE ou A Receber até convertidos</p>
            </div>

            {/* Quotes table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] overflow-hidden">
                {quoteStats.list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[#64748b]">
                        <FileText size={36} className="mb-3 text-[#e0f2fe]" />
                        <p className="font-medium text-sm">Nenhum orçamento neste período.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#f0f9ff] text-[#64748b] text-xs font-bold uppercase tracking-wide border-b border-[#e0f2fe]">
                                    <th className="px-4 py-3 text-left">Data</th>
                                    <th className="px-4 py-3 text-left">Resumo do lançamento</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0f9ff]">
                                {quoteStats.list.map(tx => {
                                    const contact = contacts.find(c => c.id === tx.contactId);
                                    const account = accounts.find(a => a.id === tx.accountId);
                                    return (
                                        <tr
                                            key={tx.id}
                                            onClick={() => openTxModal(tx)}
                                            className="group hover:bg-[#f0f9ff] transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap text-[#64748b]">
                                                {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
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
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1 justify-end items-center" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => onConvertToSale(tx)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg"
                                                        style={{ background: '#16a34a' }}
                                                    >
                                                        <ArrowRightCircle size={14} /> Converter em Venda
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(tx)} className="p-1 text-[#64748b] hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={15} /></button>
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
            </>
            )}
        </div>
    );
};

export default ReceivablesTab;
