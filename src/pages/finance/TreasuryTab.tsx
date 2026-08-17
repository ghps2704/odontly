import React from 'react';
import { useNexus } from '@/contexts/NexusContext';
import {
    Wallet, Receipt, AlertCircle, BadgeCheck, Building2, Banknote, CreditCard,
    TrendingUp, ArrowLeftRight, Plus, List, Trash2, X
} from 'lucide-react';
import { formatCurrency, EditingAccountState, TransferFormState } from './financeUtils';

interface TreasuryTabProps {
    currentTotalBalance: number;
    accountStats: Record<string, { monthIncome: number; monthExpense: number; pendingCount: number }>;
    totalPendingReconciliation: number;
    accountStatement: any[];
    selectedAccountId: string | null;
    setSelectedAccountId: (id: string | null) => void;
    setTransferForm: React.Dispatch<React.SetStateAction<TransferFormState>>;
    setIsTransferModalOpen: (open: boolean) => void;
    setEditingAccount: (acc: EditingAccountState) => void;
    setIsAccountModalOpen: (open: boolean) => void;
}

const accTypeConfig: Record<string, { label: string; Icon: React.FC<any> }> = {
    BANK: { label: 'Conta Bancária', Icon: Building2 },
    CASH: { label: 'Caixa Físico', Icon: Banknote },
    WALLET: { label: 'Carteira Digital', Icon: CreditCard },
    INVESTMENT: { label: 'Aplicação', Icon: TrendingUp }
};

const TreasuryTab: React.FC<TreasuryTabProps> = ({
    currentTotalBalance, accountStats, totalPendingReconciliation, accountStatement,
    selectedAccountId, setSelectedAccountId, setTransferForm, setIsTransferModalOpen,
    setEditingAccount, setIsAccountModalOpen
}) => {
    const { accounts, contacts, deleteAccount } = useNexus();
    const now = new Date();
    const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">

            {/* ── SUMMARY BAR ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total balance */}
                <div className="bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white rounded-xl p-5 shadow-lg shadow-blue-500/20 flex items-center gap-4">
                    <div className="w-11 h-11 bg-white/15 rounded-full flex items-center justify-center shrink-0">
                        <Wallet size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Saldo Total</p>
                        <p className="text-2xl font-bold leading-tight">{formatCurrency(currentTotalBalance)}</p>
                        <p className="text-[10px] text-white/60">{accounts.length} conta{accounts.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Month cashflow */}
                <div className="bg-white border border-[#e0f2fe] rounded-xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 bg-[#f0f9ff] rounded-full flex items-center justify-center shrink-0">
                        <Receipt size={20} className="text-[#0284c7]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide capitalize truncate">{monthLabel}</p>
                        <div className="flex gap-3 mt-0.5">
                            <span className="text-sm font-bold text-green-600">+{formatCurrency((Object.values(accountStats) as { monthIncome: number; monthExpense: number; pendingCount: number }[]).reduce((a, s) => a + s.monthIncome, 0))}</span>
                            <span className="text-sm font-bold text-red-500">-{formatCurrency((Object.values(accountStats) as { monthIncome: number; monthExpense: number; pendingCount: number }[]).reduce((a, s) => a + s.monthExpense, 0))}</span>
                        </div>
                    </div>
                </div>

                {/* Pending reconciliation */}
                <div className={`bg-white border rounded-xl p-5 shadow-sm flex items-center gap-4 ${totalPendingReconciliation > 0 ? 'border-amber-200' : 'border-[#e0f2fe]'}`}>
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${totalPendingReconciliation > 0 ? 'bg-amber-50' : 'bg-[#f0f9ff]'}`}>
                        {totalPendingReconciliation > 0
                            ? <AlertCircle size={20} className="text-amber-500" />
                            : <BadgeCheck size={20} className="text-green-500" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wide">Conciliação</p>
                        {totalPendingReconciliation > 0
                            ? <p className="text-sm font-bold text-amber-600">{totalPendingReconciliation} lançamento{totalPendingReconciliation !== 1 ? 's' : ''} pendente{totalPendingReconciliation !== 1 ? 's' : ''}</p>
                            : <p className="text-sm font-bold text-green-600">Tudo conciliado</p>}
                    </div>
                </div>
            </div>

            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-[#0a0f1e]">Contas & Carteiras</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setTransferForm(f => ({ ...f, fromId: accounts[0]?.id || '', toId: accounts[1]?.id || '' })); setIsTransferModalOpen(true); }}
                        className="border border-[#0284c7] text-[#0284c7] px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-[#f0f9ff] text-sm font-bold"
                    >
                        <ArrowLeftRight size={16} /> Transferir
                    </button>
                    <button
                        onClick={() => { setEditingAccount({ id: '', name: '', bankName: '', agency: '', accountNumber: '', type: 'BANK', balance: 0, initialBalance: 0, color: '#3b82f6' }); setIsAccountModalOpen(true); }}
                        className="bg-[#0284c7] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-[#0369a1] text-sm font-bold"
                    >
                        <Plus size={16} /> Nova Conta
                    </button>
                </div>
            </div>

            {/* ── ACCOUNT CARDS ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {accounts.map(acc => {
                    const stats = accountStats[acc.id] || { monthIncome: 0, monthExpense: 0, pendingCount: 0 };
                    const cfg = accTypeConfig[acc.type] || accTypeConfig.BANK;
                    const isSelected = selectedAccountId === acc.id;
                    return (
                        <div
                            key={acc.id}
                            className={`bg-white rounded-xl shadow-sm border transition-all overflow-hidden ${isSelected ? 'border-[#0284c7] shadow-md shadow-blue-200/60 ring-1 ring-[#0284c7]/30' : 'border-[#e0f2fe] hover:shadow-md hover:border-[#bae6fd]'}`}
                        >
                            {/* Color accent top bar */}
                            <div className="h-1.5 w-full" style={{ backgroundColor: acc.color || '#0284c7' }} />

                            <div className="p-5">
                                {/* Account header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <cfg.Icon size={13} className="text-[#64748b] shrink-0" />
                                            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{cfg.label}</span>
                                        </div>
                                        <h4 className="font-bold text-[#0a0f1e] text-base leading-tight truncate">{acc.name}</h4>
                                        {(acc.bankName || acc.agency || acc.accountNumber) && (
                                            <p className="text-[11px] text-[#64748b] mt-0.5 truncate">
                                                {[acc.bankName, acc.agency && `Ag. ${acc.agency}`, acc.accountNumber && `CC ${acc.accountNumber}`].filter(Boolean).join(' · ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-2">
                                        <button onClick={() => { setEditingAccount({ id: acc.id, name: acc.name, bankName: acc.bankName || '', agency: acc.agency || '', accountNumber: acc.accountNumber || '', type: acc.type, balance: acc.balance, initialBalance: acc.initialBalance, color: acc.color || '#3b82f6' }); setIsAccountModalOpen(true); }} className="p-1.5 text-[#64748b] hover:text-blue-600 hover:bg-[#f0f9ff] rounded-lg transition-colors" title="Editar">
                                            <List size={14} />
                                        </button>
                                        <button onClick={() => deleteAccount(acc.id)} className="p-1.5 text-[#64748b] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Balance */}
                                <div className="mb-4">
                                    <p className="text-xs text-[#64748b] mb-0.5">Saldo Atual</p>
                                    <p className={`text-2xl font-bold tabular-nums leading-tight ${acc.balance >= 0 ? 'text-[#0a0f1e]' : 'text-red-600'}`}>
                                        {formatCurrency(acc.balance)}
                                    </p>
                                </div>

                                {/* Month mini-stats */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-green-50 rounded-lg px-3 py-2">
                                        <p className="text-[10px] font-semibold text-green-700 uppercase">Entradas</p>
                                        <p className="text-sm font-bold text-green-700 tabular-nums">{formatCurrency(stats.monthIncome)}</p>
                                    </div>
                                    <div className="bg-red-50 rounded-lg px-3 py-2">
                                        <p className="text-[10px] font-semibold text-red-600 uppercase">Saídas</p>
                                        <p className="text-sm font-bold text-red-600 tabular-nums">{formatCurrency(stats.monthExpense)}</p>
                                    </div>
                                </div>

                                {/* Footer actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-[#e0f2fe]">
                                    {stats.pendingCount > 0
                                        ? <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                            <AlertCircle size={10} /> {stats.pendingCount} p/ conciliar
                                        </span>
                                        : <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                            <BadgeCheck size={10} /> Conciliado
                                        </span>
                                    }
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => { setTransferForm(f => ({ ...f, fromId: acc.id })); setIsTransferModalOpen(true); }}
                                            className="text-[11px] font-bold text-[#0284c7] hover:bg-[#f0f9ff] px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <ArrowLeftRight size={11} /> Transferir
                                        </button>
                                        <button
                                            onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                                            className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${isSelected ? 'bg-[#0284c7] text-white' : 'text-[#0284c7] hover:bg-[#f0f9ff]'}`}
                                        >
                                            <List size={11} /> Extrato
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── STATEMENT PANEL ─────────────────────────────────────────────── */}
            {selectedAccountId && (() => {
                const acc = accounts.find(a => a.id === selectedAccountId);
                if (!acc) return null;
                return (
                    <div className="bg-white border border-[#0284c7]/30 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center px-5 py-4 border-b border-[#e0f2fe] bg-[#f0f9ff]">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color || '#0284c7' }} />
                                <h4 className="font-bold text-[#0a0f1e]">Extrato — {acc.name}</h4>
                                <span className="text-xs text-[#64748b] bg-white border border-[#e0f2fe] px-2 py-0.5 rounded-full">{accountStatement.length} lançamentos</span>
                            </div>
                            <button onClick={() => setSelectedAccountId(null)} className="text-[#64748b] hover:text-[#0a0f1e]"><X size={18} /></button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#f8fafc] text-[#64748b] text-xs uppercase tracking-wide border-b border-[#e0f2fe]">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Data</th>
                                        <th className="px-4 py-3 text-left">Descrição</th>
                                        <th className="px-4 py-3 text-left">Contato</th>
                                        <th className="px-4 py-3 text-right">Valor</th>
                                        <th className="px-4 py-3 text-right">Saldo</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e0f2fe]">
                                    {/* Initial balance row */}
                                    <tr className="bg-[#f0f9ff]/60">
                                        <td className="px-4 py-2 text-xs text-[#64748b] font-mono">—</td>
                                        <td className="px-4 py-2 text-xs font-bold text-[#64748b] italic" colSpan={3}>Saldo inicial</td>
                                        <td className="px-4 py-2 text-right text-sm font-bold text-[#0a0f1e] tabular-nums">{formatCurrency(acc.initialBalance)}</td>
                                        <td />
                                    </tr>
                                    {accountStatement.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#64748b] italic">Nenhuma movimentação registrada.</td>
                                        </tr>
                                    )}
                                    {accountStatement.map((tx: any) => {
                                        const contactName = contacts.find(c => c.id === tx.contactId)?.name || (tx.contactId === 'system' ? 'Transferência' : '—');
                                        return (
                                            <tr key={tx.id} className={`hover:bg-[#f8fafc] ${tx.status === 'PENDING' ? 'opacity-60' : ''}`}>
                                                <td className="px-4 py-2.5 text-xs text-[#64748b] font-mono whitespace-nowrap">{tx.date}</td>
                                                <td className="px-4 py-2.5 font-medium text-[#0a0f1e] max-w-[200px] truncate">{tx.description || tx.items?.[0]?.name || '—'}</td>
                                                <td className="px-4 py-2.5 text-xs text-[#64748b] truncate max-w-[120px]">{contactName}</td>
                                                <td className={`px-4 py-2.5 text-right font-bold tabular-nums whitespace-nowrap ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </td>
                                                <td className={`px-4 py-2.5 text-right font-bold tabular-nums whitespace-nowrap ${tx.runningBalance >= 0 ? 'text-[#0a0f1e]' : 'text-red-600'}`}>
                                                    {tx.status === 'PAID' ? formatCurrency(tx.runningBalance) : <span className="text-[#64748b] font-normal text-xs italic">pendente</span>}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {tx.status === 'PAID' ? 'PAGO' : 'ABERTO'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-[#0284c7] text-white font-bold">
                                        <td colSpan={4} className="px-4 py-3 text-sm">(=) Saldo Atual</td>
                                        <td className={`px-4 py-3 text-right text-base tabular-nums ${acc.balance >= 0 ? '' : 'text-red-300'}`}>{formatCurrency(acc.balance)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default TreasuryTab;
