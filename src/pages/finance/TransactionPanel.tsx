import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, ShoppingCart, Paperclip } from 'lucide-react';
import { Transaction, PaymentMethod, DRECategoryType, FinancialCategory, Contact, Account, Item, Attachment, CostCenter, PaymentLine } from '@/types';
import { DRE_STRUCTURE_LABELS, RecurrenceFormState, formatCurrency } from './financeUtils';
import { useSlidePanel } from './useSlidePanel';
import { useNexus } from '@/contexts/NexusContext';
import PaymentLinesEditor from './PaymentLinesEditor';
import { validatePaymentLines } from '@/lib/paymentLines';

interface TransactionPanelProps {
    isOpen: boolean;
    type: 'EXPENSE' | 'INCOME';
    editingTx: Partial<Transaction>;
    setEditingTx: React.Dispatch<React.SetStateAction<Partial<Transaction>>>;

    accounts: Account[];
    items: Item[];
    dreGroupedCategories: Record<string, FinancialCategory[]>;

    cartSelector: string; setCartSelector: React.Dispatch<React.SetStateAction<string>>;
    cartValue: string; setCartValue: React.Dispatch<React.SetStateAction<string>>;
    cartQty: number; setCartQty: React.Dispatch<React.SetStateAction<number>>;
    cartGroup: string; setCartGroup: React.Dispatch<React.SetStateAction<string>>;
    handleAddToCart: () => void;
    handleRemoveFromCart: (index: number) => void;

    modalContactSearch: string; setModalContactSearch: React.Dispatch<React.SetStateAction<string>>;
    modalContactDropOpen: boolean; setModalContactDropOpen: React.Dispatch<React.SetStateAction<boolean>>;
    contactOptions: Contact[];
    onOpenQuickContact: (type: 'CLIENT' | 'SUPPLIER') => void;

    recurrenceForm: RecurrenceFormState;
    setRecurrenceForm: React.Dispatch<React.SetStateAction<RecurrenceFormState>>;

    paymentLines: PaymentLine[];
    setPaymentLines: React.Dispatch<React.SetStateAction<PaymentLine[]>>;

    onClose: () => void;
    onSave: () => void;
    onRequestStatusChange: (newStatus: 'PAID' | 'PENDING') => void;
}

const TransactionPanel: React.FC<TransactionPanelProps> = ({
    isOpen, type, editingTx, setEditingTx, accounts, items, dreGroupedCategories,
    cartSelector, setCartSelector, cartValue, setCartValue, cartQty, setCartQty,
    cartGroup, setCartGroup, handleAddToCart, handleRemoveFromCart,
    modalContactSearch, setModalContactSearch, modalContactDropOpen, setModalContactDropOpen,
    contactOptions, onOpenQuickContact, recurrenceForm, setRecurrenceForm,
    paymentLines, setPaymentLines,
    onClose, onSave, onRequestStatusChange
}) => {
    const { addItem, addCategory, transactions, professionals, costCenters, addCostCenter } = useNexus();
    const { mounted, visible } = useSlidePanel(isOpen);
    const [confirmingStatus, setConfirmingStatus] = useState(false);
    const [itemSearch, setItemSearch] = useState('');
    const [itemDropOpen, setItemDropOpen] = useState(false);
    const [costCenterSearch, setCostCenterSearch] = useState('');
    const [costCenterDropOpen, setCostCenterDropOpen] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialSnapshotRef = useRef('');

    useEffect(() => {
        if (isOpen) setConfirmingStatus(false);
    }, [isOpen, editingTx.id]);

    useEffect(() => {
        if (isOpen) initialSnapshotRef.current = JSON.stringify(editingTx);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const cc = costCenters.find(c => c.id === editingTx.costCenterId);
            setCostCenterSearch(cc?.name || '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, editingTx.id]);

    if (!mounted) return null;

    const isEdit = !!editingTx.id;
    const isIncome = type === 'INCOME';
    // Fase D: the split-payment-lines editor only applies to brand-new,
    // non-recurring transactions — see the Payment section below.
    const usesPaymentLinesEditor = !isEdit && !(isIncome && editingTx.saleType === 'RECURRING');
    const paidLabel = isIncome ? 'Recebido' : 'Pago';

    const handleCloseAttempt = () => {
        const dirty = JSON.stringify(editingTx) !== initialSnapshotRef.current;
        if (dirty) setShowDiscardConfirm(true);
        else onClose();
    };

    const selectCatalogItem = (id: string, name: string) => {
        setCartSelector(id);
        setItemSearch(name);
        setItemDropOpen(false);
        if (isIncome) {
            const i = items.find(it => it.id === id);
            setCartValue(i ? i.price.toString() : '');
        } else {
            setCartValue('');
        }
    };

    const handleCreateNewCatalogEntry = () => {
        const name = itemSearch.trim();
        if (!name) return;
        if (isIncome) {
            const newItem: Item = { id: Date.now().toString(), name, type: 'SERVICE', price: 0, cost: 0, stock: 0, minStock: 0, unit: 'un' };
            addItem(newItem);
            setCartSelector(newItem.id);
            setCartValue('0');
        } else {
            const newCategory: FinancialCategory = { id: Date.now().toString(), name, type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE' };
            addCategory(newCategory);
            setCartSelector(newCategory.id);
            setCartValue('');
        }
        setItemSearch(name);
        setItemDropOpen(false);
    };

    const selectCostCenter = (id: string, name: string) => {
        setEditingTx({ ...editingTx, costCenterId: id });
        setCostCenterSearch(name);
        setCostCenterDropOpen(false);
    };

    const handleCreateNewCostCenter = () => {
        const name = costCenterSearch.trim();
        if (!name) return;
        const newCostCenter: CostCenter = { id: Date.now().toString(), name };
        addCostCenter(newCostCenter);
        selectCostCenter(newCostCenter.id, newCostCenter.name);
    };

    const itemSearchQuery = itemSearch.trim().toLowerCase();
    const matchesQuery = (name: string) => !itemSearchQuery || name.toLowerCase().includes(itemSearchQuery);
    const filteredServices = isIncome ? items.filter(i => i.type === 'SERVICE' && matchesQuery(i.name)) : [];
    const filteredProducts = isIncome ? items.filter(i => i.type === 'PRODUCT' && matchesQuery(i.name)) : [];
    const filteredExpenseGroups = !isIncome
        ? (Object.keys(DRE_STRUCTURE_LABELS) as DRECategoryType[])
            .map(dreKey => ({
                key: dreKey,
                label: DRE_STRUCTURE_LABELS[dreKey].label,
                cats: dreGroupedCategories[dreKey].filter(c => c.type === 'EXPENSE' && matchesQuery(c.name))
            }))
            .filter(g => g.cats.length > 0)
        : [];
    const hasCatalogResults = isIncome
        ? (filteredServices.length + filteredProducts.length) > 0
        : filteredExpenseGroups.length > 0;

    // --- Attachments (reactivates previously dead handleFileUpload/removeAttachment code) ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        if (file.size > 2 * 1024 * 1024) {
            alert("O arquivo é muito grande. Máximo permitido: 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const newAttachment: Attachment = {
                id: Date.now().toString(),
                name: file.name,
                size: file.size,
                type: file.type,
                url: event.target?.result as string
            };
            setEditingTx(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAttachment] }));
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (attachmentId: string) => {
        setEditingTx(prev => ({ ...prev, attachments: prev.attachments?.filter(a => a.id !== attachmentId) }));
    };

    // --- Discount & totals (income only) ---
    const itemsTotal = (editingTx.items || []).reduce((s, i) => s + i.total, 0);
    const discountAmount = !editingTx.discount ? 0
        : editingTx.discount.type === 'PERCENT'
            ? itemsTotal * (editingTx.discount.value / 100)
            : editingTx.discount.value;
    const netTotal = Math.max(0, itemsTotal - discountAmount);

    const paymentLinesValidation = usesPaymentLinesEditor
        ? validatePaymentLines(paymentLines, isIncome ? netTotal : itemsTotal)
        : null;
    const saveDisabledReason = !paymentLinesValidation ? null
        : !paymentLinesValidation.percentageOk ? `Percentuais somam ${paymentLinesValidation.percentageSum}%, precisa somar 100%`
        : !paymentLinesValidation.scheduleOk ? 'Parcelas de uma forma de pagamento não somam o valor da linha'
        : null;

    // --- Sequence number preview (assigned for real on save, in Finance.tsx's handleSaveTx) ---
    const nextSequenceNumber = transactions.filter(t => t.type === type).reduce((max, t) => Math.max(max, t.sequenceNumber || 0), 0) + 1;
    const displaySequenceNumber = editingTx.sequenceNumber ?? (isEdit ? null : nextSequenceNumber);

    return (
        <div className={`fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className={`px-6 py-4 border-b border-[#e0f2fe] flex justify-between items-center shrink-0 ${isIncome ? 'bg-[#f0fdf4]' : 'bg-[#fef2f2]'}`}>
                <div>
                    <h3 className="text-xl font-bold text-[#0a0f1e] flex items-center gap-2">
                        {isEdit ? 'Editar' : 'Nova'} {isIncome ? 'Receita' : 'Despesa'}
                        {displaySequenceNumber != null && (
                            <span className="text-xs font-bold text-[#64748b] bg-white/70 border border-[#e0f2fe] rounded-full px-2 py-0.5">
                                Nº {displaySequenceNumber}
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-[#64748b]">{isIncome ? 'Conta a Receber' : 'Conta a Pagar'}</p>
                </div>
                <button onClick={handleCloseAttempt} className="p-2 hover:bg-white/60 rounded-lg">
                    <X size={22} className="text-[#64748b]" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-6 space-y-4">

                    {/* Situação (edit mode only — status changes require explicit confirmation) */}
                    {isEdit && (
                        <div className="border border-[#e0f2fe] rounded-lg p-4 bg-[#f8fafc]">
                            <p className="text-xs font-bold text-[#64748b] uppercase tracking-wide mb-2">Situação</p>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${editingTx.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {editingTx.status === 'PAID' ? paidLabel : 'Pendente'}
                                </span>
                                {!confirmingStatus && (
                                    <button onClick={() => setConfirmingStatus(true)} className="text-sm font-bold text-[#0284c7] hover:underline">
                                        {editingTx.status === 'PAID' ? 'Reabrir (marcar como pendente)' : `Marcar como ${paidLabel.toLowerCase()}`}
                                    </button>
                                )}
                            </div>
                            {confirmingStatus && (
                                <div className="mt-3 flex items-center justify-between flex-wrap gap-2 bg-white border border-[#e0f2fe] rounded-lg p-3">
                                    <span className="text-sm text-[#0a0f1e]">
                                        Confirmar alteração para {editingTx.status === 'PAID' ? 'PENDENTE' : paidLabel.toUpperCase()}?
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setConfirmingStatus(false)} className="px-3 py-1.5 text-sm text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
                                        <button
                                            onClick={() => { onRequestStatusChange(editingTx.status === 'PAID' ? 'PENDING' : 'PAID'); setConfirmingStatus(false); }}
                                            className="px-3 py-1.5 text-sm font-bold bg-[#0284c7] text-white rounded-lg hover:bg-[#0369a1]"
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Header Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[#64748b] mb-1">
                                {isIncome ? 'Paciente / Origem da Receita' : 'Fornecedor / Destino de Pagamento'}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={isIncome ? 'Buscar paciente...' : 'Buscar fornecedor...'}
                                    value={modalContactSearch}
                                    onFocus={() => setModalContactDropOpen(true)}
                                    onBlur={() => setTimeout(() => setModalContactDropOpen(false), 150)}
                                    onChange={e => {
                                        setModalContactSearch(e.target.value);
                                        if (!e.target.value) setEditingTx({ ...editingTx, contactId: '' });
                                        setModalContactDropOpen(true);
                                    }}
                                    className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                                />
                                {modalContactDropOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e0f2fe] rounded-lg shadow-xl z-[60] max-h-44 overflow-y-auto">
                                        {contactOptions
                                            .filter(c => !modalContactSearch || c.name.toLowerCase().includes(modalContactSearch.toLowerCase()))
                                            .map(c => (
                                                <button
                                                    key={c.id}
                                                    onMouseDown={() => {
                                                        setEditingTx({ ...editingTx, contactId: c.id });
                                                        setModalContactSearch(c.name);
                                                        setModalContactDropOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f0f9ff] ${editingTx.contactId === c.id ? 'bg-[#e0f2fe] text-[#0284c7] font-bold' : 'text-[#0a0f1e]'}`}
                                                >
                                                    {c.name}
                                                </button>
                                            ))
                                        }
                                        {contactOptions.filter(c => !modalContactSearch || c.name.toLowerCase().includes(modalContactSearch.toLowerCase())).length === 0 && (
                                            <p className="px-3 py-2 text-xs text-[#64748b] italic">Nenhum resultado.</p>
                                        )}
                                        <div className="border-t border-[#e0f2fe]">
                                            <button
                                                onMouseDown={() => onOpenQuickContact(isIncome ? 'CLIENT' : 'SUPPLIER')}
                                                className="w-full text-left px-3 py-2 text-sm text-[#0284c7] hover:bg-[#f0f9ff] flex items-center gap-1.5 font-medium"
                                            >
                                                <Plus size={13} /> {isIncome ? 'Novo paciente' : 'Novo fornecedor'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#64748b] mb-1">
                                {isIncome ? 'Data da Venda' : 'Data de Competência'}
                            </label>
                            <input
                                type="date"
                                value={editingTx.date}
                                onChange={e => setEditingTx({ ...editingTx, date: e.target.value })}
                                className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#64748b] mb-1">Vendedor Responsável</label>
                            <select
                                value={editingTx.professionalId || ''}
                                onChange={e => setEditingTx({ ...editingTx, professionalId: e.target.value || undefined })}
                                className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                            >
                                <option value="">Nenhum</option>
                                {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#64748b] mb-1">Centro de Custo</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar centro de custo..."
                                    value={costCenterSearch}
                                    onFocus={() => setCostCenterDropOpen(true)}
                                    onBlur={() => setTimeout(() => setCostCenterDropOpen(false), 150)}
                                    onChange={e => {
                                        setCostCenterSearch(e.target.value);
                                        setEditingTx({ ...editingTx, costCenterId: undefined });
                                        setCostCenterDropOpen(true);
                                    }}
                                    className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                                />
                                {costCenterDropOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e0f2fe] rounded-lg shadow-xl z-[60] max-h-44 overflow-y-auto">
                                        {costCenterSearch.trim() && (
                                            <button
                                                onMouseDown={handleCreateNewCostCenter}
                                                className="w-full text-left px-3 py-2 text-sm text-[#0284c7] hover:bg-[#f0f9ff] flex items-center gap-1.5 font-medium border-b border-[#e0f2fe]"
                                            >
                                                <Plus size={13} /> Criar "{costCenterSearch.trim()}"
                                            </button>
                                        )}
                                        {costCenters
                                            .filter(c => !costCenterSearch || c.name.toLowerCase().includes(costCenterSearch.toLowerCase()))
                                            .map(c => (
                                                <button
                                                    key={c.id}
                                                    onMouseDown={() => selectCostCenter(c.id, c.name)}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f0f9ff] ${editingTx.costCenterId === c.id ? 'bg-[#e0f2fe] text-[#0284c7] font-bold' : 'text-[#0a0f1e]'}`}
                                                >
                                                    {c.name}
                                                </button>
                                            ))
                                        }
                                        {costCenters.filter(c => !costCenterSearch || c.name.toLowerCase().includes(costCenterSearch.toLowerCase())).length === 0 && !costCenterSearch.trim() && (
                                            <p className="px-3 py-2 text-xs text-[#64748b] italic">Nenhum centro de custo cadastrado.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ITEM BUILDER (CORE) */}
                    <div className="bg-[#f0f9ff] p-4 rounded-lg border border-[#e0f2fe]">
                        <label className="block text-xs font-bold text-[#64748b] mb-2 flex items-center gap-1">
                            <ShoppingCart size={14} /> Itens da Transação
                        </label>

                        <div className="space-y-2 mb-3">
                            {/* 0. Sub-group label */}
                            <input
                                type="text"
                                placeholder="Subgrupo (ex: Consultas, Materiais…) — opcional"
                                className="w-full p-2 border border-[#e0f2fe] rounded text-sm bg-white text-[#0a0f1e] placeholder:text-[#94a3b8]"
                                value={cartGroup}
                                onChange={e => setCartGroup(e.target.value)}
                            />
                            {/* 1. Item Selector — searchable, with inline "create new" */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={isIncome ? 'Buscar produto/serviço...' : 'Buscar categoria...'}
                                    value={itemSearch}
                                    onFocus={() => setItemDropOpen(true)}
                                    onBlur={() => setTimeout(() => setItemDropOpen(false), 150)}
                                    onChange={e => {
                                        setItemSearch(e.target.value);
                                        setCartSelector('');
                                        setItemDropOpen(true);
                                    }}
                                    className="w-full p-2 border border-[#e0f2fe] rounded text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                                />
                                {itemDropOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e0f2fe] rounded-lg shadow-xl z-[60] max-h-56 overflow-y-auto">
                                        {itemSearch.trim() && (
                                            <button
                                                onMouseDown={handleCreateNewCatalogEntry}
                                                className="w-full text-left px-3 py-2 text-sm text-[#0284c7] hover:bg-[#f0f9ff] flex items-center gap-1.5 font-medium border-b border-[#e0f2fe]"
                                            >
                                                <Plus size={13} /> Criar "{itemSearch.trim()}"
                                            </button>
                                        )}
                                        {isIncome ? (
                                            <>
                                                {filteredServices.length > 0 && (
                                                    <div>
                                                        <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">Serviços</p>
                                                        {filteredServices.map(i => (
                                                            <button
                                                                key={i.id}
                                                                onMouseDown={() => selectCatalogItem(i.id, i.name)}
                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f0f9ff] ${cartSelector === i.id ? 'bg-[#e0f2fe] text-[#0284c7] font-bold' : 'text-[#0a0f1e]'}`}
                                                            >
                                                                {i.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {filteredProducts.length > 0 && (
                                                    <div>
                                                        <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">Produtos</p>
                                                        {filteredProducts.map(i => (
                                                            <button
                                                                key={i.id}
                                                                onMouseDown={() => selectCatalogItem(i.id, i.name)}
                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f0f9ff] ${cartSelector === i.id ? 'bg-[#e0f2fe] text-[#0284c7] font-bold' : 'text-[#0a0f1e]'}`}
                                                            >
                                                                {i.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            filteredExpenseGroups.map(group => (
                                                <div key={group.key}>
                                                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">{group.label}</p>
                                                    {group.cats.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onMouseDown={() => selectCatalogItem(cat.id, cat.name)}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f0f9ff] ${cartSelector === cat.id ? 'bg-[#e0f2fe] text-[#0284c7] font-bold' : 'text-[#0a0f1e]'}`}
                                                        >
                                                            {cat.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            ))
                                        )}
                                        {!hasCatalogResults && !itemSearch.trim() && (
                                            <p className="px-3 py-2 text-xs text-[#64748b] italic">
                                                {isIncome ? 'Nenhum produto/serviço cadastrado ainda.' : 'Nenhuma categoria cadastrada ainda.'}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 2. Values */}
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    className="w-20 p-2 border border-[#e0f2fe] rounded text-sm bg-white"
                                    value={cartQty}
                                    onChange={e => setCartQty(parseInt(e.target.value))}
                                    placeholder="Qtd"
                                />
                                <input
                                    type="number"
                                    placeholder="Valor Unit."
                                    className="flex-1 p-2 border border-[#e0f2fe] rounded text-sm"
                                    value={cartValue}
                                    onChange={e => setCartValue(e.target.value)}
                                />
                                <button
                                    onClick={() => { handleAddToCart(); setItemSearch(''); }}
                                    disabled={!cartSelector}
                                    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Cart List Display */}
                        <div className="space-y-1 max-h-44 overflow-y-auto mb-2 border-t border-[#e0f2fe] pt-2">
                            {editingTx.items && editingTx.items.map((item, idx) => {
                                const prevGroup = editingTx.items?.[idx - 1]?.groupLabel;
                                const showHeader = item.groupLabel && item.groupLabel !== prevGroup;
                                return (
                                    <React.Fragment key={idx}>
                                        {showHeader && (
                                            <div className="flex items-center gap-2 py-1 px-1">
                                                <div className="h-px flex-1 bg-[#e0f2fe]" />
                                                <span className="text-[10px] font-bold text-[#0284c7] uppercase tracking-wider">{item.groupLabel}</span>
                                                <div className="h-px flex-1 bg-[#e0f2fe]" />
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center bg-white p-2 rounded border border-[#e0f2fe] text-xs">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#0a0f1e]">{item.quantity}x {item.name}</span>
                                                <span className="text-[10px] text-[#64748b]">{item.categoryName}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">R$ {item.total.toFixed(2)}</span>
                                                <button onClick={() => handleRemoveFromCart(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={12} /></button>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            {(!editingTx.items || editingTx.items.length === 0) && (
                                <p className="text-xs text-[#64748b] text-center py-2 italic">Nenhum item lançado.</p>
                            )}
                        </div>

                        {/* Desconto (income only) + Total */}
                        {isIncome && (
                            <div className="flex items-center justify-between gap-3 border-t border-[#e0f2fe] pt-2">
                                <span className="text-xs font-bold text-[#64748b]">Desconto</span>
                                <div className="flex items-center gap-2">
                                    <div className="flex rounded-lg border border-[#e0f2fe] overflow-hidden text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setEditingTx({ ...editingTx, discount: { type: 'AMOUNT', value: editingTx.discount?.value || 0 } })}
                                            className={`px-2 py-1 font-bold ${(!editingTx.discount || editingTx.discount.type === 'AMOUNT') ? 'bg-[#0284c7] text-white' : 'bg-white text-[#64748b]'}`}
                                        >R$</button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingTx({ ...editingTx, discount: { type: 'PERCENT', value: editingTx.discount?.value || 0 } })}
                                            className={`px-2 py-1 font-bold ${editingTx.discount?.type === 'PERCENT' ? 'bg-[#0284c7] text-white' : 'bg-white text-[#64748b]'}`}
                                        >%</button>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editingTx.discount?.value ?? ''}
                                        onChange={e => setEditingTx({ ...editingTx, discount: { type: editingTx.discount?.type || 'AMOUNT', value: parseFloat(e.target.value) || 0 } })}
                                        placeholder="0,00"
                                        className="w-24 p-1.5 border border-[#e0f2fe] rounded text-sm text-right"
                                    />
                                </div>
                            </div>
                        )}

                        {isIncome && discountAmount > 0 ? (
                            <div className="pt-2 space-y-1">
                                <div className="flex justify-between text-sm text-[#64748b]">
                                    <span>Itens</span><span>{formatCurrency(itemsTotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>Desconto</span><span>- {formatCurrency(discountAmount)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-[#0a0f1e] text-lg">
                                    <span>Total líquido</span><span>{formatCurrency(netTotal)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-right font-bold text-[#0a0f1e] text-lg pt-2">
                                Total: {formatCurrency(itemsTotal)}
                            </div>
                        )}
                    </div>

                    {/* Payment — the multi-line split editor (Fase D) only applies to brand-new,
                        non-recurring transactions. Editing an existing row, and "Venda recorrente"
                        (subscription-style repeating income), keep the single-field layout unchanged. */}
                    {usesPaymentLinesEditor ? (
                        <PaymentLinesEditor
                            lines={paymentLines}
                            onChange={setPaymentLines}
                            totalAmount={isIncome ? netTotal : itemsTotal}
                            contextDate={editingTx.date || new Date().toISOString().split('T')[0]}
                        />
                    ) : (
                        <div className={`grid gap-4 ${isIncome ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            {!isIncome && (
                                <div>
                                    <label className="block text-xs font-bold text-[#64748b] mb-1">Vencimento</label>
                                    <input
                                        type="date"
                                        value={editingTx.dueDate || editingTx.date}
                                        onChange={e => setEditingTx({ ...editingTx, dueDate: e.target.value })}
                                        className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-[#64748b] mb-1">Forma de Pagamento</label>
                                <select
                                    value={editingTx.paymentMethod || 'PIX'}
                                    onChange={e => setEditingTx({ ...editingTx, paymentMethod: e.target.value as PaymentMethod })}
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
                                    value={editingTx.accountId || ''}
                                    onChange={e => setEditingTx({ ...editingTx, accountId: e.target.value })}
                                    className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                                >
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-[#64748b] mb-1">Descrição / Observação</label>
                        <input
                            type="text"
                            value={editingTx.description || ''}
                            onChange={e => setEditingTx({ ...editingTx, description: e.target.value })}
                            className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                            placeholder="Detalhes opcionais..."
                        />
                    </div>

                    {/* Anexos */}
                    <div>
                        <label className="block text-xs font-bold text-[#64748b] mb-1 flex items-center gap-1">
                            <Paperclip size={14} /> Anexo
                        </label>
                        <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" id="tx-attachment-input" />
                        <label htmlFor="tx-attachment-input" className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-[#bae6fd] rounded-lg text-sm text-[#0284c7] hover:bg-[#f0f9ff] cursor-pointer">
                            <Plus size={14} /> Adicionar arquivo
                        </label>
                        {editingTx.attachments && editingTx.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {editingTx.attachments.map(att => (
                                    <div key={att.id} className="flex items-center justify-between bg-[#f8fafc] border border-[#e0f2fe] rounded-lg px-3 py-2 text-sm">
                                        <a href={att.url} download={att.name} className="text-[#0284c7] hover:underline truncate">{att.name}</a>
                                        <button onClick={() => removeAttachment(att.id)} className="text-red-500 hover:text-red-700 ml-2 shrink-0"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Initial status — only for brand-new transactions. Existing ones change
                        status exclusively through the "Situação" confirmation above. */}
                    {!isEdit && (
                        <div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    checked={editingTx.status === 'PAID'}
                                    onChange={e => setEditingTx({ ...editingTx, status: e.target.checked ? 'PAID' : 'PENDING' })}
                                    className="w-5 h-5 text-blue-600 rounded"
                                />
                                <span className="text-sm font-bold text-[#0a0f1e]">Lançamento {paidLabel.toLowerCase()}?</span>
                            </div>
                            {editingTx.status === 'PAID' && (
                                <div className="ml-7 mt-2 animate-in slide-in-from-top-1">
                                    <label className="block text-xs font-bold text-[#64748b] mb-1">Data do Pagamento (Baixa)</label>
                                    <input
                                        type="date"
                                        value={editingTx.paidAt || editingTx.date}
                                        onChange={e => setEditingTx({ ...editingTx, paidAt: e.target.value })}
                                        className="border border-[#e0f2fe] rounded p-1 text-sm bg-white"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tipo da Venda (income, new only) — replaces the plain recurrence
                        toggle with Orçamento | Venda avulsa | Venda recorrente. Orçamento
                        never touches cashflow/DRE/A Receber until converted (useFinanceData). */}
                    {!isEdit && isIncome && (
                        <div className="bg-[#e0f2fe] p-3 rounded-lg border border-[#e0f2fe] mt-4">
                            <label className="block text-xs font-bold text-[#64748b] mb-2">Tipo da Venda</label>
                            <div className="grid grid-cols-3 gap-1 p-1 bg-white rounded-lg border border-[#e0f2fe]">
                                {([
                                    { value: 'QUOTE', label: 'Orçamento' },
                                    { value: 'SINGLE', label: 'Venda avulsa' },
                                    { value: 'RECURRING', label: 'Venda recorrente' },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            setEditingTx({ ...editingTx, saleType: opt.value });
                                            setRecurrenceForm({ ...recurrenceForm, enabled: opt.value === 'RECURRING' });
                                        }}
                                        className={`py-2 rounded-md text-xs font-bold transition-colors ${editingTx.saleType === opt.value ? 'bg-[#0284c7] text-white shadow-sm' : 'text-[#64748b] hover:bg-[#f0f9ff]'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {editingTx.saleType === 'QUOTE' && (
                                <p className="text-xs text-[#0369a1] mt-2">
                                    Orçamentos não entram no fluxo de caixa, DRE ou Contas a Receber até serem convertidos em venda.
                                </p>
                            )}
                            {editingTx.saleType === 'RECURRING' && recurrenceForm.enabled && (
                                <div className="grid grid-cols-2 gap-4 mt-3 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold text-[#0369a1] mb-1">Frequência</label>
                                        <select
                                            value={recurrenceForm.frequency}
                                            onChange={e => setRecurrenceForm({ ...recurrenceForm, frequency: e.target.value as any })}
                                            className="w-full border border-[#e0f2fe] rounded p-2 text-sm bg-white"
                                        >
                                            <option value="WEEKLY">Semanal</option>
                                            <option value="BIWEEKLY">Quinzenal</option>
                                            <option value="MONTHLY">Mensal</option>
                                            <option value="QUARTERLY">Trimestral</option>
                                            <option value="YEARLY">Anual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#0369a1] mb-1">Nº de parcelas</label>
                                        <input
                                            type="number"
                                            min="2" max="60"
                                            value={recurrenceForm.occurrences}
                                            onChange={e => setRecurrenceForm({ ...recurrenceForm, occurrences: parseInt(e.target.value) })}
                                            className="w-full border border-[#e0f2fe] rounded p-2 text-sm bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            <div className="p-6 border-t border-[#e0f2fe] flex justify-end items-center gap-3 shrink-0">
                {saveDisabledReason && (
                    <span className="text-xs font-bold text-red-600">{saveDisabledReason}</span>
                )}
                <button onClick={handleCloseAttempt} className="px-4 py-2 text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
                <button
                    onClick={onSave}
                    disabled={!!saveDisabledReason}
                    className={`px-4 py-2 text-white rounded-lg shadow-lg font-bold ${saveDisabledReason ? 'bg-[#94a3b8] cursor-not-allowed shadow-none' : (isIncome ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20')}`}
                >
                    Salvar {isIncome ? 'Receita' : 'Despesa'}
                </button>
            </div>

            {showDiscardConfirm && (
                <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-[#0a0f1e] text-lg mb-1">Descartar edições?</h3>
                        <p className="text-sm text-[#64748b] mb-5">Você perderá todas as edições feitas.</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowDiscardConfirm(false)} className="px-4 py-2 text-sm font-bold text-[#64748b] border border-[#e0f2fe] rounded-lg hover:bg-[#f0f9ff]">
                                Voltar à edição
                            </button>
                            <button onClick={() => { setShowDiscardConfirm(false); onClose(); }} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">
                                Descartar edições
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionPanel;
