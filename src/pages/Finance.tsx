
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNexus } from '@/contexts/NexusContext';
import { Transaction, TransactionType, RecurrenceFrequency, DRECategoryType, TransactionItem, Contact, PaymentLine } from '@/types';
import { EditScope } from '@/lib/installments';
import EditScopeDialog from '@/pages/finance/EditScopeDialog';
import TreasuryTab from '@/pages/finance/TreasuryTab';
import CashflowTab from '@/pages/finance/CashflowTab';
import PayablesTab from '@/pages/finance/PayablesTab';
import ReceivablesTab from '@/pages/finance/ReceivablesTab';
import TransactionPanel from '@/pages/finance/TransactionPanel';
import DRETab from '@/pages/finance/DRETab';
import ConfigTab from '@/pages/finance/ConfigTab';
import ReconciliationTab from '@/pages/finance/ReconciliationTab';
import ImportPanel from '@/pages/finance/ImportPanel';
import { useFinanceData } from '@/pages/finance/useFinanceData';
import { DRE_STRUCTURE_LABELS, formatCurrency, PeriodFilterValue, defaultPeriodFilter } from '@/pages/finance/financeUtils';
import {
    Plus, Search, ArrowUpCircle, ArrowDownCircle,
    Wallet,
    ChevronRight, List, Building2,
    PieChart, Filter, ChevronDown, ChevronRight as ChevronRightIcon,
    CornerDownRight, Tag, Eye, EyeOff, Paperclip, FileText, Image as ImageIcon, Download, X, Package, TrendingDown,
    ArrowLeftRight, BadgeCheck
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    AreaChart, Area, ComposedChart, Line, Cell 
} from 'recharts';

const Finance: React.FC = () => {
  const {
      transactions, accounts, categories, contacts, appointments, items,
      addTransaction, addSplitTransaction, updateTransaction, deleteTransaction,
      addCategory, deleteCategory, addAccount, updateAccount, deleteAccount,
      addContact,
      settings
  } = useNexus();
  
  const [activeTab, setActiveTab] = useState<'CASHFLOW' | 'PAYABLES' | 'RECEIVABLES' | 'TREASURY' | 'DRE' | 'CONFIG' | 'RECONCILIATION'>('CASHFLOW');
  
  // State for Cashflow Tab
  const [cashflowPeriod, setCashflowPeriod] = useState<PeriodFilterValue>(defaultPeriodFilter());
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>(''); // New Contact Filter
  
  // State for DRE Tab (Independent Competence)
  const [dreMonth, setDreMonth] = useState(new Date());

  // --- MODAL STATES ---
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  // --- FORM STATES ---
  const [editingTx, setEditingTx] = useState<Partial<Transaction>>({
      date: new Date().toISOString().split('T')[0],
      type: 'EXPENSE',
      status: 'PENDING',
      paymentMethod: 'PIX',
      isReconciled: false,
      attachments: [],
      contactId: '',
      items: []
  });
  
  // Detailed Item Cart State
  const [cartSelector, setCartSelector] = useState(''); // ID of Item (if Income) or Category (if Expense)
  const [cartValue, setCartValue] = useState<string>(''); // Manual override for value
  const [cartQty, setCartQty] = useState(1);

  const [recurrenceForm, setRecurrenceForm] = useState({
      enabled: false,
      frequency: 'MONTHLY' as RecurrenceFrequency,
      occurrences: 12
  });

  // Fase D — payment-lines editor state (new, non-recurring transactions only).
  // Seeded with one line matching editingTx's current payment fields whenever
  // the panel opens for creation; see openTxModal.
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);

  const [editingAccount, setEditingAccount] = useState({
      id: '',
      name: '',
      bankName: '',
      agency: '',
      accountNumber: '',
      type: 'BANK' as any,
      balance: 0,
      initialBalance: 0,
      color: '#3b82f6'
  });

  // Treasury states
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Payables states
  const [payablePeriod, setPayablePeriod] = useState<PeriodFilterValue>(defaultPeriodFilter());
  const [payableAccountFilter, setPayableAccountFilter] = useState('');
  const [payableSearch, setPayableSearch] = useState('');

  // Receivables states
  const [receivablePeriod, setReceivablePeriod] = useState<PeriodFilterValue>(defaultPeriodFilter());
  const [receivableAccountFilter, setReceivableAccountFilter] = useState('');
  const [receivableSearch, setReceivableSearch] = useState('');

  // Cashflow account filter
  const [cashflowAccountFilter, setCashflowAccountFilter] = useState('');

  // Reconciliation states
  const [reconAccountId, setReconAccountId] = useState<string>('');
  const [reconPeriodStart, setReconPeriodStart] = useState<string>(() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [reconPeriodEnd, setReconPeriodEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reconFilter, setReconFilter] = useState<'ALL' | 'PENDING' | 'RECONCILED'>('ALL');
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
      fromId: '',
      toId: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: ''
  });

  // Category Form
  const [newCategory, setNewCategory] = useState({ 
      name: '', 
      type: 'EXPENSE' as TransactionType, 
      dreClass: 'OPERATIONAL_EXPENSE' as DRECategoryType,
      parentId: '' 
  });
  
  // --- SEARCHABLE CONTACT FILTER (cashflow header) ---
  const [cfSearch, setCfSearch] = useState('');
  const [cfDropOpen, setCfDropOpen] = useState(false);
  const cfRef = useRef<HTMLDivElement>(null);

  // --- SEARCHABLE CONTACT FIELD (transaction modal) ---
  const [modalContactSearch, setModalContactSearch] = useState('');
  const [modalContactDropOpen, setModalContactDropOpen] = useState(false);

  // --- QUICK-ADD CONTACT ---
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);
  const [quickContactName, setQuickContactName] = useState('');
  const [quickContactType, setQuickContactType] = useState<'CLIENT' | 'SUPPLIER' | 'BOTH'>('SUPPLIER');

  // --- CART SUB-GROUP ---
  const [cartGroup, setCartGroup] = useState('');

  // Close cashflow filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cfRef.current && !cfRef.current.contains(e.target as Node)) {
        setCfDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Quick-add contact from filter or modal
  const handleQuickAddContact = () => {
    if (!quickContactName.trim()) return;
    const newContact: Contact = {
      id: Date.now().toString(),
      name: quickContactName.trim(),
      type: quickContactType,
      document: '',
      email: '',
      address: { zipCode: '', street: '', number: '', neighborhood: '', city: '', state: '' }
    };
    addContact(newContact);
    if (isTxModalOpen) {
      setEditingTx(prev => ({ ...prev, contactId: newContact.id }));
      setModalContactSearch(newContact.name);
    } else {
      setSelectedContactFilter(newContact.id);
      setCfSearch(newContact.name);
    }
    setIsQuickContactOpen(false);
    setQuickContactName('');
  };
  
  const {
      today,
      unifiedTransactions, dreTransactions, dreGroupedCategories, projectionChartData, dreReport,
      monthStats, currentTotalBalance, accountStats, totalPendingReconciliation, accountStatement,
      payableStats, receivableStats, quoteStats, cashflowDailyTable, reconStatement, inadimplenciaAlert,
  } = useFinanceData({
      cashflowPeriod, selectedContactFilter, cashflowAccountFilter, dreMonth,
      payablePeriod, payableAccountFilter, payableSearch,
      receivablePeriod, receivableAccountFilter, receivableSearch,
      selectedAccountId, reconAccountId, reconPeriodStart, reconPeriodEnd
  });

  const contactOptions = useMemo(() => {
      return contacts.filter(c => {
          if (editingTx.type === 'INCOME') return c.type === 'CLIENT' || c.type === 'BOTH';
          if (editingTx.type === 'EXPENSE') return c.type === 'SUPPLIER' || c.type === 'BOTH';
          return true;
      });
  }, [contacts, editingTx.type]);

  // --- ACTIONS ---

  // --- CART / DETAILED ITEMS LOGIC ---
  const handleAddToCart = () => {
      if (!cartSelector) return;

      let newItem: TransactionItem;

      if (editingTx.type === 'INCOME') {
          // --- INCOME: USE CATALOG ITEMS ---
          const catalogItem = items.find(i => i.id === cartSelector);
          if (!catalogItem) return;

          // Determine Category automatically based on Item Type
          let catId = '';
          let catName = '';

          if (catalogItem.type === 'SERVICE') {
              catId = '1'; catName = 'Venda de Serviços';
          } else if (catalogItem.type === 'PRODUCT') {
              catId = '2'; catName = 'Venda de Produtos';
          } else {
              // Fallback
              const fallback = categories.find(c => c.dreClass === 'OTHER_RESULT' && c.type === 'INCOME');
              catId = fallback?.id || '';
              catName = fallback?.name || 'Outras Receitas';
          }

          const price = cartValue ? parseFloat(cartValue) : catalogItem.price;

          newItem = {
              itemId: catalogItem.id,
              name: catalogItem.name,
              quantity: cartQty,
              unitPrice: price,
              total: price * cartQty,
              originalType: catalogItem.type,
              categoryId: catId,
              categoryName: catName,
              groupLabel: cartGroup.trim() || undefined
          };

      } else {
          // --- EXPENSE: USE CATEGORIES ---
          const category = categories.find(c => c.id === cartSelector);
          if (!category) return;

          const price = cartValue ? parseFloat(cartValue) : 0;
          if (price <= 0) {
              alert("Para despesas, informe o valor.");
              return;
          }

          newItem = {
              itemId: category.id,
              name: category.name,
              quantity: cartQty,
              unitPrice: price,
              total: price * cartQty,
              categoryId: category.id,
              categoryName: category.name,
              groupLabel: cartGroup.trim() || undefined
          };
      }

      const newItems = [...(editingTx.items || []), newItem];
      const newTotal = newItems.reduce((acc, item) => acc + item.total, 0);

      setEditingTx({
          ...editingTx,
          items: newItems,
          amount: newTotal,
      });

      // Reset form
      setCartSelector('');
      setCartValue('');
      setCartQty(1);
  };

  const handleRemoveFromCart = (index: number) => {
      const newItems = [...(editingTx.items || [])];
      newItems.splice(index, 1);
      const newTotal = newItems.reduce((acc, item) => acc + item.total, 0);
      setEditingTx({ ...editingTx, items: newItems, amount: newTotal });
  };

  // A transaction that belongs to an installment/recurrence group (more than
  // one occurrence) always requires the user to pick a scope before an
  // edit/delete is applied.
  const requiresScopeChoice = (tx: Transaction) => !!tx.recurrence?.groupId && !!tx.installments && tx.installments.total > 1;

  const [pendingScopeAction, setPendingScopeAction] = useState<{ action: 'DELETE' | 'SAVE'; txData: Transaction } | null>(null);

  // For SAVE, txData is the in-progress edit (which never carries installments,
  // see handleSaveTx) — look up the original stored transaction for the label.
  const pendingScopeInstallments = pendingScopeAction
      ? (pendingScopeAction.action === 'DELETE'
          ? pendingScopeAction.txData.installments
          : transactions.find(t => t.id === pendingScopeAction.txData.id)?.installments)
      : undefined;

  const resetTxForm = () => {
      setIsTxModalOpen(false);
      setEditingTx({ date: new Date().toISOString().split('T')[0], type: 'EXPENSE', status: 'PENDING', paymentMethod: 'PIX', isReconciled: false, attachments: [], contactId: '', items: [] });
      setRecurrenceForm({ enabled: false, frequency: 'MONTHLY', occurrences: 12 });
      setPaymentLines([]);
      setPendingScopeAction(null);
  };

  const commitSaveTx = (txData: Transaction, isEdit: boolean, scope?: EditScope) => {
      if (isEdit) {
          updateTransaction(txData, scope);
      } else if (txData.type === 'INCOME' && txData.saleType === 'RECURRING') {
          // Venda recorrente keeps the pre-Fase-D single-method path untouched.
          addTransaction(txData, recurrenceForm.enabled);
      } else if (paymentLines.length <= 1 && (paymentLines[0]?.occurrences ?? 1) === 1) {
          // Common case: one payment method, no installments — same path as always.
          const line = paymentLines[0];
          addTransaction(line ? { ...txData, accountId: line.accountId, paymentMethod: line.paymentMethod, dueDate: line.dueDate } : txData, false);
      } else {
          // Split payment and/or per-line installments (Fase D).
          addSplitTransaction(txData, paymentLines);
      }
      resetTxForm();
  };

  const handleDeleteClick = (tx: Transaction) => {
      if (requiresScopeChoice(tx)) {
          setPendingScopeAction({ action: 'DELETE', txData: tx });
      } else {
          deleteTransaction(tx.id);
      }
  };

  // Quotes are always single, non-installment records (recurrenceForm is
  // forced off while saleType === 'QUOTE' in TransactionPanel), so converting
  // one just flips saleType to SINGLE — no installment regeneration needed.
  const handleConvertQuoteToSale = (tx: Transaction) => {
      const original = transactions.find(t => t.id === tx.id);
      if (!original) return;
      updateTransaction({ ...original, saleType: 'SINGLE' }, 'ONLY_THIS');
  };

  // Situação changes (via the panel's confirmation step) always apply ONLY to the
  // transaction being viewed, never cascading to sibling installments, and always
  // act on the persisted transaction — not on any unsaved draft edits in the panel.
  const handleRequestStatusChange = (newStatus: 'PAID' | 'PENDING') => {
      const original = transactions.find(t => t.id === editingTx.id);
      if (!original) return;
      updateTransaction({
          ...original,
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date().toISOString().split('T')[0] : undefined
      }, 'ONLY_THIS');
      resetTxForm();
  };

  // Clicking a day's "a pagar"/"a receber" figure in the Cashflow daily table
  // jumps straight to that tab, filtered to just that one day.
  const handleCashflowDrillDown = (tab: 'PAYABLES' | 'RECEIVABLES', dateStr: string) => {
      if (tab === 'PAYABLES') {
          setPayablePeriod({ mode: 'RANGE', start: dateStr, end: dateStr });
      } else {
          setReceivablePeriod({ mode: 'RANGE', start: dateStr, end: dateStr });
      }
      setActiveTab(tab);
  };

  const handleSaveTx = () => {
      if (!editingTx.items || editingTx.items.length === 0) {
          alert("Adicione pelo menos um item à transação.");
          return;
      }
      if (!editingTx.contactId) {
          alert("Selecione um contato/entidade.");
          return;
      }

      const isEdit = !!editingTx.id;

      // Net amount = items total minus discount (income only — expense never sets discount).
      const itemsTotal = editingTx.items.reduce((s, i) => s + i.total, 0);
      const discountAmount = !editingTx.discount ? 0
          : editingTx.discount.type === 'PERCENT'
              ? itemsTotal * (editingTx.discount.value / 100)
              : editingTx.discount.value;
      const netAmount = Math.max(0, itemsTotal - discountAmount);

      // Sequence number ("Nº da venda/despesa") is assigned once on creation and kept on edit.
      const sequenceNumber = isEdit
          ? editingTx.sequenceNumber
          : transactions.filter(t => t.type === editingTx.type).reduce((max, t) => Math.max(max, t.sequenceNumber || 0), 0) + 1;

      const txData: Transaction = {
          id: editingTx.id || Date.now().toString(),
          date: editingTx.date!,
          dueDate: editingTx.dueDate || (isEdit ? undefined : paymentLines[0]?.dueDate),
          paidAt: editingTx.status === 'PAID' ? (editingTx.paidAt || editingTx.date) : undefined,
          description: editingTx.description || 'Lançamento Manual',
          amount: netAmount,
          type: editingTx.type!,
          category: 'Lançamento Misto', // Header category
          categoryId: 'mix',
          // Base account/method — overridden per row when a split/installment
          // path (commitSaveTx) expands this into multiple payment lines.
          accountId: editingTx.accountId || (isEdit ? undefined : paymentLines[0]?.accountId)!,
          contactId: editingTx.contactId,
          professionalId: editingTx.professionalId,
          sequenceNumber,
          costCenterId: editingTx.costCenterId,
          saleType: editingTx.saleType,
          discount: editingTx.discount,
          status: editingTx.status || 'PENDING',
          paymentMethod: editingTx.paymentMethod || (isEdit ? undefined : paymentLines[0]?.paymentMethod) || 'OTHER',
          isReconciled: editingTx.isReconciled || false,
          // Editing an existing transaction preserves its original parcelamento/recorrência
          // link — the "Repetir" toggle only applies when creating a brand new transaction.
          recurrence: isEdit ? editingTx.recurrence : (recurrenceForm.enabled ? {
              frequency: recurrenceForm.frequency,
              occurrences: recurrenceForm.occurrences,
              groupId: Date.now().toString()
          } : undefined),
          installments: isEdit ? editingTx.installments : undefined,
          attachments: editingTx.attachments,
          items: editingTx.items // THE SOURCE OF TRUTH
      };

      if (isEdit) {
          const original = transactions.find(t => t.id === editingTx.id);
          if (original && requiresScopeChoice(original)) {
              setPendingScopeAction({ action: 'SAVE', txData });
              return;
          }
      }
      commitSaveTx(txData, isEdit);
  };

  const handleSaveAccount = () => {
      if(!editingAccount.name) return;
      const accData = {
          id: editingAccount.id || Date.now().toString(),
          name: editingAccount.name,
          bankName: editingAccount.bankName || undefined,
          agency: editingAccount.agency || undefined,
          accountNumber: editingAccount.accountNumber || undefined,
          type: editingAccount.type,
          balance: editingAccount.id ? editingAccount.balance : editingAccount.initialBalance,
          initialBalance: Number(editingAccount.initialBalance),
          color: editingAccount.color
      };
      if(editingAccount.id) updateAccount(accData);
      else addAccount(accData);
      setIsAccountModalOpen(false);
      setEditingAccount({ id: '', name: '', bankName: '', agency: '', accountNumber: '', type: 'BANK', balance: 0, initialBalance: 0, color: '#3b82f6' });
  };

  const handleTransfer = () => {
      if (!transferForm.fromId || !transferForm.toId || transferForm.amount <= 0) {
          alert('Preencha todas as informações da transferência.');
          return;
      }
      if (transferForm.fromId === transferForm.toId) {
          alert('Conta de origem e destino devem ser diferentes.');
          return;
      }
      const fromAcc = accounts.find(a => a.id === transferForm.fromId);
      const toAcc = accounts.find(a => a.id === transferForm.toId);
      if (!fromAcc || !toAcc) return;

      const desc = transferForm.description.trim() || `Transferência: ${fromAcc.name} → ${toAcc.name}`;
      const groupId = Date.now().toString();

      const expenseTx: Transaction = {
          id: `${groupId}_out`,
          date: transferForm.date,
          paidAt: transferForm.date,
          description: desc,
          amount: transferForm.amount,
          type: 'EXPENSE',
          category: 'Transferência',
          categoryId: 'transfer',
          accountId: transferForm.fromId,
          contactId: 'system',
          status: 'PAID',
          isReconciled: true,
          paymentMethod: 'TRANSFER',
          items: []
      };
      const incomeTx: Transaction = {
          id: `${groupId}_in`,
          date: transferForm.date,
          paidAt: transferForm.date,
          description: desc,
          amount: transferForm.amount,
          type: 'INCOME',
          category: 'Transferência',
          categoryId: 'transfer',
          accountId: transferForm.toId,
          contactId: 'system',
          status: 'PAID',
          isReconciled: true,
          paymentMethod: 'TRANSFER',
          items: []
      };
      addTransaction(expenseTx, false);
      addTransaction(incomeTx, false);
      setIsTransferModalOpen(false);
      setTransferForm({ fromId: '', toId: '', amount: 0, date: new Date().toISOString().split('T')[0], description: '' });
  };

  const handleAddCategory = () => {
      if(!newCategory.name) return;
      addCategory({
          id: Date.now().toString(),
          name: newCategory.name,
          type: newCategory.type,
          dreClass: newCategory.dreClass,
          parentId: newCategory.parentId || undefined
      });
      setNewCategory({ name: '', type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE', parentId: '' });
      setIsCategoryModalOpen(false);
  };

  const openCategoryModal = (prefillDreClass?: DRECategoryType) => {
      setNewCategory({
          name: '',
          type: (['GROSS_REVENUE', 'OTHER_RESULT'].includes(prefillDreClass || '') ? 'INCOME' : 'EXPENSE'),
          dreClass: prefillDreClass || 'OPERATIONAL_EXPENSE',
          parentId: ''
      });
      setIsCategoryModalOpen(true);
  };

  const openTxModal = (tx?: Transaction, prefillType?: TransactionType) => {
    if (tx) {
        setEditingTx(tx);
        const existingContact = contacts.find(c => c.id === tx.contactId);
        setModalContactSearch(existingContact?.name || '');
        setRecurrenceForm({ enabled: false, frequency: 'MONTHLY', occurrences: 12 });
        setPaymentLines([]);
    } else {
        const defaultAcc = accounts.length > 0 ? accounts[0].id : '';
        const today = new Date().toISOString().split('T')[0];
        setEditingTx({
            date: today,
            type: prefillType || 'EXPENSE',
            status: 'PENDING',
            paymentMethod: 'PIX',
            isReconciled: false,
            attachments: [],
            contactId: '',
            accountId: defaultAcc,
            items: [],
            saleType: (prefillType || 'EXPENSE') === 'INCOME' ? 'SINGLE' : undefined
        });
        setModalContactSearch('');
        setRecurrenceForm({ enabled: false, frequency: 'MONTHLY', occurrences: 12 });
        setPaymentLines([{
            id: Date.now().toString(),
            percentage: 100,
            amount: 0,
            paymentMethod: 'PIX',
            accountId: defaultAcc,
            dueDate: today,
            frequency: 'MONTHLY',
            occurrences: 1,
            schedule: [{ date: today, amount: 0 }]
        }]);
    }
    setCartGroup('');
    setModalContactDropOpen(false);
    setIsTxModalOpen(true);
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a0f1e]">Gestão Financeira & FP&A</h2>
          <p className="text-[#64748b]">Tesouraria, Fluxo de Caixa e Controladoria no padrão Odontly.</p>
        </div>
        <div className="flex bg-[#e0f2fe] p-1 rounded-lg overflow-x-auto gap-0.5">
             <button onClick={() => setActiveTab('CASHFLOW')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'CASHFLOW' ? 'bg-white shadow text-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <List size={15} /> Fluxo
             </button>
             <button onClick={() => setActiveTab('PAYABLES')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'PAYABLES' ? 'bg-white shadow text-red-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <ArrowDownCircle size={15} /> A Pagar
             </button>
             <button onClick={() => setActiveTab('RECEIVABLES')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'RECEIVABLES' ? 'bg-white shadow text-green-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <ArrowUpCircle size={15} /> A Receber
             </button>
             <button onClick={() => setActiveTab('TREASURY')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'TREASURY' ? 'bg-white shadow text-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <Wallet size={15} /> Tesouraria
             </button>
             <button onClick={() => setActiveTab('DRE')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'DRE' ? 'bg-white shadow text-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <PieChart size={15} /> DRE
             </button>
             <button onClick={() => setActiveTab('CONFIG')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'CONFIG' ? 'bg-white shadow text-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <Building2 size={15} /> Config
             </button>
             <button onClick={() => setActiveTab('RECONCILIATION')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'RECONCILIATION' ? 'bg-white shadow text-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <BadgeCheck size={15} /> Conciliação
             </button>
        </div>
      </div>

      {/* Inadimplência Alert */}
      {inadimplenciaAlert.isAlert && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <TrendingDown size={16} className="text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-700 text-sm">
              Alerta de Inadimplência — {inadimplenciaAlert.rate.toFixed(1)}% da receita em aberto
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              {inadimplenciaAlert.count} recebimento{inadimplenciaAlert.count !== 1 ? 's' : ''} pendente{inadimplenciaAlert.count !== 1 ? 's' : ''} totalizando{' '}
              <strong>R$ {inadimplenciaAlert.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.
              O benchmark do setor odontológico é abaixo de 15%.
            </p>
          </div>
        </div>
      )}

      {/* --- CASHFLOW TAB --- */}
      {activeTab === 'CASHFLOW' && (
          <CashflowTab
              cashflowPeriod={cashflowPeriod} setCashflowPeriod={setCashflowPeriod}
              selectedContactFilter={selectedContactFilter} setSelectedContactFilter={setSelectedContactFilter}
              cashflowAccountFilter={cashflowAccountFilter} setCashflowAccountFilter={setCashflowAccountFilter}
              cfSearch={cfSearch} setCfSearch={setCfSearch}
              cfDropOpen={cfDropOpen} setCfDropOpen={setCfDropOpen}
              cfRef={cfRef}
              onOpenQuickContact={() => { setQuickContactType('SUPPLIER'); setIsQuickContactOpen(true); setCfDropOpen(false); }}
              openTxModal={openTxModal}
              handleDeleteClick={handleDeleteClick}
              onDrillDown={handleCashflowDrillDown}
              today={today}
              projectionChartData={projectionChartData}
              monthStats={monthStats}
              currentTotalBalance={currentTotalBalance}
              unifiedTransactions={unifiedTransactions}
              cashflowDailyTable={cashflowDailyTable}
          />
      )}

      {/* --- PAYABLES TAB --- */}
      {activeTab === 'PAYABLES' && (
          <PayablesTab
              payablePeriod={payablePeriod} setPayablePeriod={setPayablePeriod}
              payableAccountFilter={payableAccountFilter} setPayableAccountFilter={setPayableAccountFilter}
              payableSearch={payableSearch} setPayableSearch={setPayableSearch}
              payableStats={payableStats}
              today={today}
              openTxModal={openTxModal}
              handleDeleteClick={handleDeleteClick}
          />
      )}

      {/* --- RECEIVABLES TAB --- */}
      {activeTab === 'RECEIVABLES' && (
          <ReceivablesTab
              receivablePeriod={receivablePeriod} setReceivablePeriod={setReceivablePeriod}
              receivableAccountFilter={receivableAccountFilter} setReceivableAccountFilter={setReceivableAccountFilter}
              receivableSearch={receivableSearch} setReceivableSearch={setReceivableSearch}
              receivableStats={receivableStats}
              quoteStats={quoteStats}
              today={today}
              openTxModal={openTxModal}
              handleDeleteClick={handleDeleteClick}
              onConvertToSale={handleConvertQuoteToSale}
          />
      )}

      {/* --- TREASURY TAB --- */}
      {activeTab === 'TREASURY' && (
          <TreasuryTab
              currentTotalBalance={currentTotalBalance}
              accountStats={accountStats}
              totalPendingReconciliation={totalPendingReconciliation}
              accountStatement={accountStatement}
              selectedAccountId={selectedAccountId}
              setSelectedAccountId={setSelectedAccountId}
              setTransferForm={setTransferForm}
              setIsTransferModalOpen={setIsTransferModalOpen}
              setEditingAccount={setEditingAccount}
              setIsAccountModalOpen={setIsAccountModalOpen}
          />
      )}

      {/* --- DRE TAB --- */}
      {activeTab === 'DRE' && (
          <DRETab dreMonth={dreMonth} setDreMonth={setDreMonth} dreReport={dreReport} />
      )}

      {/* --- CONFIG TAB --- */}
      {activeTab === 'CONFIG' && (
          <ConfigTab dreGroupedCategories={dreGroupedCategories} openCategoryModal={openCategoryModal} />
      )}

      {/* --- TRANSACTION MODAL (UNIFIED & ITEM-BASED) --- */}
      <TransactionPanel
          isOpen={isTxModalOpen}
          type={editingTx.type === 'INCOME' ? 'INCOME' : 'EXPENSE'}
          editingTx={editingTx}
          setEditingTx={setEditingTx}
          accounts={accounts}
          items={items}
          dreGroupedCategories={dreGroupedCategories}
          cartSelector={cartSelector} setCartSelector={setCartSelector}
          cartValue={cartValue} setCartValue={setCartValue}
          cartQty={cartQty} setCartQty={setCartQty}
          cartGroup={cartGroup} setCartGroup={setCartGroup}
          handleAddToCart={handleAddToCart}
          handleRemoveFromCart={handleRemoveFromCart}
          modalContactSearch={modalContactSearch} setModalContactSearch={setModalContactSearch}
          modalContactDropOpen={modalContactDropOpen} setModalContactDropOpen={setModalContactDropOpen}
          contactOptions={contactOptions}
          onOpenQuickContact={(type: 'CLIENT' | 'SUPPLIER') => { setQuickContactType(type); setIsQuickContactOpen(true); setModalContactDropOpen(false); }}
          recurrenceForm={recurrenceForm} setRecurrenceForm={setRecurrenceForm}
          paymentLines={paymentLines} setPaymentLines={setPaymentLines}
          onClose={() => setIsTxModalOpen(false)}
          onSave={handleSaveTx}
          onRequestStatusChange={handleRequestStatusChange}
      />

      {/* Account & Category Modals (Standard, omitted to save space as no changes requested there) */}
      {isAccountModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                  <div className="p-5 border-b border-[#e0f2fe] flex justify-between items-center">
                      <h3 className="text-lg font-bold">{editingAccount.id ? 'Editar Conta' : 'Nova Conta / Carteira'}</h3>
                      <button onClick={() => setIsAccountModalOpen(false)}><X size={20} className="text-[#64748b]" /></button>
                  </div>
                  <div className="p-5 space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Nome da Conta *</label>
                          <input type="text" placeholder="Ex: Nubank, Caixa da Clínica..." className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]" value={editingAccount.name} onChange={e => setEditingAccount({...editingAccount, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Tipo</label>
                          <select className="w-full border border-[#e0f2fe] rounded-lg p-2.5 bg-white text-sm" value={editingAccount.type} onChange={e => setEditingAccount({...editingAccount, type: e.target.value as any})}>
                              <option value="BANK">Conta Bancária</option>
                              <option value="CASH">Caixa Físico</option>
                              <option value="WALLET">Carteira Digital</option>
                              <option value="INVESTMENT">Aplicação / Investimento</option>
                          </select>
                      </div>
                      {(editingAccount.type === 'BANK' || editingAccount.type === 'WALLET') && (
                          <>
                              <div>
                                  <label className="block text-xs font-bold text-[#64748b] mb-1">Banco / Instituição</label>
                                  <input type="text" placeholder="Ex: Itaú, Nubank, PicPay..." className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm" value={editingAccount.bankName} onChange={e => setEditingAccount({...editingAccount, bankName: e.target.value})} />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="block text-xs font-bold text-[#64748b] mb-1">Agência</label>
                                      <input type="text" placeholder="0001" className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm" value={editingAccount.agency} onChange={e => setEditingAccount({...editingAccount, agency: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-[#64748b] mb-1">Conta</label>
                                      <input type="text" placeholder="12345-6" className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm" value={editingAccount.accountNumber} onChange={e => setEditingAccount({...editingAccount, accountNumber: e.target.value})} />
                                  </div>
                              </div>
                          </>
                      )}
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Saldo Inicial {editingAccount.id && <span className="text-[#94a3b8] font-normal">(não editável)</span>}</label>
                          <input type="number" className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm" value={editingAccount.initialBalance} disabled={!!editingAccount.id} onChange={e => setEditingAccount({...editingAccount, initialBalance: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Cor de Identificação</label>
                          <div className="flex gap-2 mt-1 flex-wrap">
                              {['#3b82f6', '#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0ea5e9', '#64748b', '#0f172a'].map(c => (
                                  <button key={c} onClick={() => setEditingAccount({...editingAccount, color: c})} className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${editingAccount.color === c ? 'border-[#0a0f1e] scale-110 ring-2 ring-offset-1 ring-[#0284c7]' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="p-5 border-t border-[#e0f2fe] flex justify-end gap-2">
                      <button onClick={() => setIsAccountModalOpen(false)} className="px-4 py-2 text-sm text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
                      <button onClick={handleSaveAccount} className="px-4 py-2 text-sm font-bold bg-[#0284c7] text-white rounded-lg hover:bg-[#0369a1]">Salvar</button>
                  </div>
              </div>
          </div>
      )}

      {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                  {/* Category Modal Content */}
                  <div className="p-6 border-b border-[#e0f2fe]"><h3 className="text-lg font-bold">Nova Categoria</h3></div>
                  <div className="p-6 space-y-4">
                      <div><label className="block text-xs font-medium text-[#64748b] mb-1">Classificação DRE</label><select className="w-full border border-[#e0f2fe] rounded-lg p-2 text-sm bg-[#f0f9ff] text-[#0a0f1e]" value={newCategory.dreClass} onChange={e => setNewCategory({...newCategory, dreClass: e.target.value as DRECategoryType, type: (['GROSS_REVENUE', 'OTHER_RESULT'].includes(e.target.value) ? 'INCOME' : 'EXPENSE') as TransactionType})}>{Object.keys(DRE_STRUCTURE_LABELS).map(key => (<option key={key} value={key}>{DRE_STRUCTURE_LABELS[key as DRECategoryType].label}</option>))}</select></div>
                      <div><label className="block text-xs font-medium text-[#64748b] mb-1">Nome da Categoria</label><input type="text" placeholder="Ex: Material de Limpeza" className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} /></div>
                  </div>
                  <div className="p-6 border-t flex justify-end gap-2"><button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button><button onClick={handleAddCategory} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button></div>
              </div>
          </div>
      )}

      {/* --- TRANSFER MODAL --- */}
      {isTransferModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                  <div className="p-5 border-b border-[#e0f2fe] flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <ArrowLeftRight size={18} className="text-[#0284c7]" />
                          <h3 className="font-bold text-[#0a0f1e]">Transferência entre Contas</h3>
                      </div>
                      <button onClick={() => setIsTransferModalOpen(false)}><X size={20} className="text-[#64748b]" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">De (origem) *</label>
                          <select
                              value={transferForm.fromId}
                              onChange={e => setTransferForm({ ...transferForm, fromId: e.target.value })}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white"
                          >
                              <option value="">Selecione a conta de origem...</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Para (destino) *</label>
                          <select
                              value={transferForm.toId}
                              onChange={e => setTransferForm({ ...transferForm, toId: e.target.value })}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm bg-white"
                          >
                              <option value="">Selecione a conta de destino...</option>
                              {accounts.filter(a => a.id !== transferForm.fromId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Valor *</label>
                          <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="0,00"
                              value={transferForm.amount || ''}
                              onChange={e => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Data</label>
                          <input
                              type="date"
                              value={transferForm.date}
                              onChange={e => setTransferForm({ ...transferForm, date: e.target.value })}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Descrição</label>
                          <input
                              type="text"
                              placeholder="Opcional..."
                              value={transferForm.description}
                              onChange={e => setTransferForm({ ...transferForm, description: e.target.value })}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2.5 text-sm"
                          />
                      </div>
                      {transferForm.fromId && transferForm.toId && transferForm.amount > 0 && (
                          <div className="bg-[#f0f9ff] border border-[#e0f2fe] rounded-lg p-3 text-xs text-[#0284c7] font-medium">
                              {formatCurrency(transferForm.amount)} serão movidos de <strong>{accounts.find(a=>a.id===transferForm.fromId)?.name}</strong> para <strong>{accounts.find(a=>a.id===transferForm.toId)?.name}</strong>.
                          </div>
                      )}
                  </div>
                  <div className="p-5 border-t border-[#e0f2fe] flex justify-end gap-2">
                      <button onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-sm text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
                      <button onClick={handleTransfer} className="px-4 py-2 text-sm font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg flex items-center gap-2">
                          <ArrowLeftRight size={14} /> Confirmar Transferência
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- QUICK-ADD CONTACT MODAL --- */}
      {isQuickContactOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs">
                  <div className="p-5 border-b border-[#e0f2fe] flex justify-between items-center">
                      <h3 className="font-bold text-[#0a0f1e]">
                          {quickContactType === 'CLIENT' ? 'Novo Paciente' : 'Novo Fornecedor'}
                      </h3>
                      <button onClick={() => setIsQuickContactOpen(false)}>
                          <X size={20} className="text-[#64748b]" />
                      </button>
                  </div>
                  <div className="p-5 space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Tipo</label>
                          <select
                              value={quickContactType}
                              onChange={e => setQuickContactType(e.target.value as any)}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2 text-sm bg-white text-[#0a0f1e]"
                          >
                              <option value="CLIENT">Paciente / Cliente</option>
                              <option value="SUPPLIER">Fornecedor</option>
                              <option value="BOTH">Ambos</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Nome *</label>
                          <input
                              type="text"
                              autoFocus
                              value={quickContactName}
                              onChange={e => setQuickContactName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleQuickAddContact()}
                              placeholder="Nome completo ou razão social"
                              className="w-full border border-[#e0f2fe] rounded-lg p-2 text-sm bg-white text-[#0a0f1e] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
                          />
                      </div>
                  </div>
                  <div className="p-5 border-t border-[#e0f2fe] flex justify-end gap-2">
                      <button
                          onClick={() => { setIsQuickContactOpen(false); setQuickContactName(''); }}
                          className="px-4 py-2 text-sm text-[#64748b] hover:bg-[#f0f9ff] rounded-lg"
                      >
                          Cancelar
                      </button>
                      <button
                          onClick={handleQuickAddContact}
                          className="px-4 py-2 text-sm font-bold bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg"
                      >
                          Salvar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- RECONCILIATION TAB --- */}
      {activeTab === 'RECONCILIATION' && (
          <ReconciliationTab
              reconAccountId={reconAccountId} setReconAccountId={setReconAccountId}
              reconPeriodStart={reconPeriodStart} setReconPeriodStart={setReconPeriodStart}
              reconPeriodEnd={reconPeriodEnd} setReconPeriodEnd={setReconPeriodEnd}
              reconFilter={reconFilter} setReconFilter={setReconFilter}
              reconStatement={reconStatement}
              onOpenImport={() => setIsImportPanelOpen(true)}
          />
      )}

      <ImportPanel isOpen={isImportPanelOpen} onClose={() => setIsImportPanelOpen(false)} />

      <EditScopeDialog
          isOpen={!!pendingScopeAction}
          actionLabel={pendingScopeAction?.action === 'DELETE' ? 'excluir' : 'salvar as alterações'}
          installmentLabel={pendingScopeInstallments ? `${pendingScopeInstallments.current}/${pendingScopeInstallments.total}` : undefined}
          onCancel={() => setPendingScopeAction(null)}
          onConfirm={(scope: EditScope) => {
              if (!pendingScopeAction) return;
              if (pendingScopeAction.action === 'DELETE') {
                  deleteTransaction(pendingScopeAction.txData.id, scope);
                  setPendingScopeAction(null);
              } else {
                  commitSaveTx(pendingScopeAction.txData, true, scope);
              }
          }}
      />

    </div>
  );
};

export default Finance;
