import React from 'react';
import {
    ChevronLeft, ChevronRight, X, Plus, BarChart2, TrendingUp, List, User,
    CalendarClock, CheckCircle, Trash2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Line
} from 'recharts';
import { useNexus } from '@/contexts/NexusContext';
import { Transaction } from '@/types';
import { formatCurrency, getDayFromDateString, PeriodFilterValue, resolvePeriodRange } from './financeUtils';
import ReportHeader from './ReportHeader';
import PeriodFilter from './PeriodFilter';

interface CashflowTabProps {
    cashflowPeriod: PeriodFilterValue; setCashflowPeriod: React.Dispatch<React.SetStateAction<PeriodFilterValue>>;
    selectedContactFilter: string; setSelectedContactFilter: (id: string) => void;
    cashflowAccountFilter: string; setCashflowAccountFilter: (id: string) => void;
    cfSearch: string; setCfSearch: (v: string) => void;
    cfDropOpen: boolean; setCfDropOpen: (v: boolean) => void;
    cfRef: React.RefObject<HTMLDivElement>;
    onOpenQuickContact: () => void;
    openTxModal: (tx?: Transaction, prefillType?: 'EXPENSE' | 'INCOME') => void;
    handleDeleteClick: (tx: Transaction) => void;
    onDrillDown: (tab: 'PAYABLES' | 'RECEIVABLES', dateStr: string) => void;
    today: string;

    projectionChartData: any[];
    monthStats: { totalIncome: number; totalExpense: number; realizedIncome: number; realizedExpense: number; pendingIncome: number; pendingExpense: number };
    currentTotalBalance: number;
    unifiedTransactions: any[];
    cashflowDailyTable: { dateStr: string; day: number; recebimentos: number; pagamentos: number; pendingReceivable: number; pendingPayable: number; saldoFinal: number; hasMovement: boolean }[];
}

const CashflowTab: React.FC<CashflowTabProps> = ({
    cashflowPeriod, setCashflowPeriod, selectedContactFilter, setSelectedContactFilter,
    cashflowAccountFilter, setCashflowAccountFilter, cfSearch, setCfSearch, cfDropOpen, setCfDropOpen,
    cfRef, onOpenQuickContact, openTxModal, handleDeleteClick, onDrillDown, today,
    projectionChartData, monthStats, currentTotalBalance, unifiedTransactions, cashflowDailyTable
}) => {
    const { accounts, contacts, updateTransaction } = useNexus();
    const cashflowRange = resolvePeriodRange(cashflowPeriod);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] overflow-hidden">
                <ReportHeader title="Fluxo de Caixa" periodLabel={cashflowRange.label} />
                <div className="flex flex-col md:flex-row justify-between items-center p-4 gap-4 bg-white border-b border-[#e0f2fe]">
                    <PeriodFilter value={cashflowPeriod} onChange={setCashflowPeriod} />
                    <div className="flex items-center gap-4 flex-1 justify-end">
                        {/* Searchable contact filter */}
                        <div className="relative w-56 hidden md:block" ref={cfRef}>
                            <div className="relative">
                                <User className="absolute left-2.5 top-2.5 text-[#64748b] pointer-events-none" size={16} />
                                <input
                                    type="text"
                                    placeholder="Filtrar contato..."
                                    value={cfSearch}
                                    onFocus={() => setCfDropOpen(true)}
                                    onChange={e => {
                                        setCfSearch(e.target.value);
                                        if (!e.target.value) setSelectedContactFilter('');
                                        setCfDropOpen(true);
                                    }}
                                    className="w-full pl-9 pr-7 py-2 border border-[#e0f2fe] rounded-lg text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                                />
                                {cfSearch && (
                                    <button
                                        onClick={() => { setCfSearch(''); setSelectedContactFilter(''); }}
                                        className="absolute right-2 top-2.5 text-[#64748b] hover:text-[#0a0f1e]"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                            {cfDropOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e0f2fe] rounded-lg shadow-xl z-50 max-h-52 overflow-y-auto">
                                    <button
                                        onMouseDown={() => { setSelectedContactFilter(''); setCfSearch(''); setCfDropOpen(false); }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#f0f9ff] text-[#64748b]"
                                    >
                                        Todos os contatos
                                    </button>
                                    {contacts
                                        .filter(c => !cfSearch || c.name.toLowerCase().includes(cfSearch.toLowerCase()))
                                        .map(c => (
                                            <button
                                                key={c.id}
                                                onMouseDown={() => { setSelectedContactFilter(c.id); setCfSearch(c.name); setCfDropOpen(false); }}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f0f9ff] ${selectedContactFilter === c.id ? 'bg-[#e0f2fe] text-[#0284c7] font-bold' : 'text-[#0a0f1e]'}`}
                                            >
                                                {c.name}
                                            </button>
                                        ))
                                    }
                                    {contacts.filter(c => !cfSearch || c.name.toLowerCase().includes(cfSearch.toLowerCase())).length === 0 && (
                                        <p className="px-3 py-2 text-xs text-[#64748b] italic">Nenhum contato encontrado.</p>
                                    )}
                                    <div className="border-t border-[#e0f2fe]">
                                        <button
                                            onMouseDown={onOpenQuickContact}
                                            className="w-full text-left px-3 py-2 text-sm text-[#0284c7] hover:bg-[#f0f9ff] flex items-center gap-1.5 font-medium"
                                        >
                                            <Plus size={13} /> Novo contato
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openTxModal(undefined, 'INCOME')}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 font-bold shadow-lg shadow-green-500/20"
                            >
                                <Plus size={18} /> Nova Receita
                            </button>
                            <button
                                onClick={() => openTxModal(undefined, 'EXPENSE')}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 font-bold shadow-lg shadow-red-500/20"
                            >
                                <Plus size={18} /> Nova Despesa
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts & Summary Code */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e0f2fe] h-full min-h-[28rem]">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-[#0a0f1e] flex items-center gap-2">
                            <BarChart2 size={18} className="text-blue-500" /> Movimentação Diária
                        </h4>
                        <select
                            value={cashflowAccountFilter}
                            onChange={e => setCashflowAccountFilter(e.target.value)}
                            className="border border-[#e0f2fe] rounded-lg px-2 py-1 text-xs bg-white text-[#64748b] focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                        >
                            <option value="">Todas as contas</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                        <ComposedChart data={projectionChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                labelFormatter={(label) => `Dia ${label}`}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                            {/* Income Bars */}
                            <Bar dataKey="EntradaReal" name="Entrada (Real)" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20} />
                            <Bar dataKey="EntradaProj" name="Entrada (Proj)" stackId="a" fill="#6ee7b7" radius={[4, 4, 0, 0]} barSize={20} />

                            {/* Expense Bars */}
                            <Bar dataKey="SaidaReal" name="Saída (Real)" stackId="b" fill="#ef4444" radius={[0, 0, 0, 0]} barSize={20} />
                            <Bar dataKey="SaidaProj" name="Saída (Proj)" stackId="b" fill="#fca5a5" radius={[4, 4, 0, 0]} barSize={20} />

                            {/* Net Line */}
                            <Line type="monotone" dataKey="Projetado" name="Saldo do Dia" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-6 h-full flex flex-col">
                    {/* Top Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Receita Projetada</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(monthStats.totalIncome)}</p>
                            <div className="flex justify-between mt-2 text-xs text-green-600">
                                <span>Real: {formatCurrency(monthStats.realizedIncome)}</span>
                                <span>Falta: {formatCurrency(monthStats.pendingIncome)}</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-green-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: `${Math.min((monthStats.realizedIncome / (monthStats.totalIncome || 1)) * 100, 100)}%` }}></div>
                            </div>
                        </div>

                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Despesa Projetada</p>
                            <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(monthStats.totalExpense)}</p>
                            <div className="flex justify-between mt-2 text-xs text-red-600">
                                <span>Pago: {formatCurrency(monthStats.realizedExpense)}</span>
                                <span>A Pagar: {formatCurrency(monthStats.pendingExpense)}</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-red-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-red-500 h-full" style={{ width: `${Math.min((monthStats.realizedExpense / (monthStats.totalExpense || 1)) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Result Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e0f2fe] flex-1">
                        <div>
                            <h3 className="font-bold text-[#0a0f1e] mb-4 flex items-center gap-2">
                                <TrendingUp size={20} /> Realizado (Caixa)
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                                    <span className="text-sm text-green-800 font-medium">Entradas</span>
                                    <span className="font-bold text-green-700">{formatCurrency(monthStats.realizedIncome)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                    <span className="text-sm text-red-800 font-medium">Saídas</span>
                                    <span className="font-bold text-red-700">{formatCurrency(monthStats.realizedExpense)}</span>
                                </div>
                                <div className="border-t border-[#e0f2fe] my-2"></div>
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <span className="text-sm text-blue-800 font-medium">Saldo em Caixa (Atual)</span>
                                    <span className={`font-bold ${currentTotalBalance >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatCurrency(currentTotalBalance)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#f0f9ff] text-[#64748b] font-semibold border-b border-[#e0f2fe]">
                        <tr>
                            <th className="px-4 py-3">Dia</th>
                            <th className="px-4 py-3">Descrição / Parceiro</th>
                            <th className="px-4 py-3">Origem</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0f2fe]">
                        {unifiedTransactions.map(tx => {
                            const contactName = contacts.find(c => c.id === tx.contactId)?.name || 'Sem Contato';
                            const itemNames = tx.items && tx.items.length > 0
                                ? tx.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
                                : tx.description;

                            return (
                                <tr
                                    key={tx.id}
                                    onClick={() => !tx.isProjected && openTxModal(tx)}
                                    className={`hover:bg-[#f0f9ff] group ${tx.isProjected ? 'bg-[#f0f9ff]/50' : 'cursor-pointer'}`}
                                >
                                    <td className="px-4 py-3 text-[#64748b] font-mono">{getDayFromDateString(tx.date)}</td>
                                    <td className="px-4 py-3">
                                        <div className={`font-bold ${tx.isProjected ? 'text-[#64748b] italic' : 'text-[#0a0f1e]'} flex items-center gap-2`}>
                                            {itemNames}
                                            {tx.items && tx.items.length > 0 && (
                                                <span className="bg-[#f0f9ff] text-[#64748b] text-[10px] px-1 rounded flex items-center gap-1">
                                                    <List size={10} /> {tx.items.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-[#64748b] flex items-center gap-1">
                                            <span className="flex items-center gap-1 font-medium text-[#64748b]"><User size={10} /> {contactName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-[#64748b]">
                                        {tx.isProjected ? (
                                            <span className="flex items-center gap-1 text-[#0284c7] font-medium"><CalendarClock size={12} /> Agenda</span>
                                        ) : (
                                            <>
                                                <div className="font-medium">{accounts.find(a => a.id === tx.accountId)?.name}</div>
                                                <div>{tx.paymentMethod}</div>
                                            </>
                                        )}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'} ${tx.isProjected ? 'opacity-60' : ''}`}>
                                        {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {tx.isProjected ? (
                                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-[#e0f2fe] text-[#0284c7] border border-[#e0f2fe]">PROJETADO</span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${tx.status === 'PAID' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef9c3] text-[#854d0e]'}`}>
                                                {tx.status === 'PAID' ? 'PAGO' : 'ABERTO'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!tx.isProjected && (
                                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => updateTransaction({ ...tx, isReconciled: !tx.isReconciled })}
                                                    title={tx.isReconciled ? "Conciliado" : "Conciliar"}
                                                >
                                                    {tx.isReconciled ? <CheckCircle size={16} className="text-blue-500" /> : <div className="w-4 h-4 rounded-full border border-[#e0f2fe] hover:border-blue-400"></div>}
                                                </button>
                                                <button onClick={() => handleDeleteClick(tx)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Daily cash flow table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e0f2fe] flex items-center justify-between">
                    <h4 className="font-bold text-[#0a0f1e] flex items-center gap-2"><CalendarClock size={16} className="text-blue-500" /> Fluxo de Caixa Diário</h4>
                    <span className="text-xs text-[#64748b] capitalize">{cashflowRange.label}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#f0f9ff] text-[#64748b] text-xs font-bold uppercase tracking-wide">
                                <th className="px-4 py-2.5 text-left">Data</th>
                                <th className="px-4 py-2.5 text-right text-green-700">Recebido</th>
                                <th className="px-4 py-2.5 text-right text-green-700">A Receber</th>
                                <th className="px-4 py-2.5 text-right text-red-600">Pago</th>
                                <th className="px-4 py-2.5 text-right text-red-600">A Pagar</th>
                                <th className="px-4 py-2.5 text-right">Saldo Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f8fafc]">
                            {cashflowDailyTable.map(row => {
                                const isFuture = row.dateStr > today;
                                return (
                                    <tr key={row.dateStr} className={`${row.hasMovement ? 'bg-white' : 'bg-[#fafcff]'} hover:bg-[#f0f9ff] transition-colors`}>
                                        <td className={`px-4 py-2 tabular-nums ${isFuture ? 'text-[#94a3b8]' : 'text-[#0a0f1e] font-medium'}`}>
                                            {new Date(row.dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">
                                            {row.recebimentos > 0
                                                ? <button onClick={() => onDrillDown('RECEIVABLES', row.dateStr)} className="text-green-600 font-medium hover:underline">{formatCurrency(row.recebimentos)}</button>
                                                : <span className="text-[#94a3b8]">0,00</span>}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">
                                            {row.pendingReceivable > 0
                                                ? <button onClick={() => onDrillDown('RECEIVABLES', row.dateStr)} className="text-green-700/70 font-medium hover:underline">{formatCurrency(row.pendingReceivable)}</button>
                                                : <span className="text-[#94a3b8]">0,00</span>}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">
                                            {row.pagamentos > 0
                                                ? <button onClick={() => onDrillDown('PAYABLES', row.dateStr)} className="text-red-500 font-medium hover:underline">{formatCurrency(row.pagamentos)}</button>
                                                : <span className="text-[#94a3b8]">0,00</span>}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">
                                            {row.pendingPayable > 0
                                                ? <button onClick={() => onDrillDown('PAYABLES', row.dateStr)} className="text-red-500/70 font-medium hover:underline">{formatCurrency(row.pendingPayable)}</button>
                                                : <span className="text-[#94a3b8]">0,00</span>}
                                        </td>
                                        <td className={`px-4 py-2 text-right font-bold tabular-nums ${row.saldoFinal >= 0 ? 'text-[#0a0f1e]' : 'text-red-600'}`}>
                                            {formatCurrency(row.saldoFinal)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CashflowTab;
