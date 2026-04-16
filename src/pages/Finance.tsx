
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNexus } from '@/contexts/NexusContext';
import { Transaction, TransactionType, PaymentMethod, RecurrenceFrequency, DRECategoryType, FinancialCategory, Attachment, TransactionItem, Contact } from '@/types';
import { 
    Plus, Search, ArrowUpCircle, ArrowDownCircle,
    CheckCircle, XCircle, Trash2, Calendar as CalendarIcon, Wallet,
    ChevronLeft, ChevronRight, List, TrendingUp, Building2,
    Repeat, CheckSquare, Square, PieChart, Filter, ChevronDown, ChevronRight as ChevronRightIcon,
    CornerDownRight, Tag, Eye, EyeOff, BarChart2, CalendarClock, Paperclip, FileText, Image as ImageIcon, Download, X, User, Hexagon, Package, ShoppingCart, TrendingDown,
    CreditCard, ArrowLeftRight, Banknote, Receipt, BadgeCheck, AlertCircle
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    AreaChart, Area, ComposedChart, Line, Cell 
} from 'recharts';

const DRE_STRUCTURE_LABELS: Record<DRECategoryType, { label: string, color: string }> = {
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

const Finance: React.FC = () => {
  const {
      transactions, accounts, categories, contacts, appointments, items,
      addTransaction, updateTransaction, deleteTransaction,
      addCategory, deleteCategory, addAccount, updateAccount, deleteAccount,
      addContact,
      settings
  } = useNexus();
  
  const [activeTab, setActiveTab] = useState<'CASHFLOW' | 'TREASURY' | 'DRE' | 'CONFIG'>('CASHFLOW');
  
  // State for Cashflow Tab
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- HELPERS ---
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
  
  const handleMonthChange = (dateState: Date, setDateState: React.Dispatch<React.SetStateAction<Date>>, direction: 'prev' | 'next') => {
      const newDate = new Date(dateState);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      setDateState(newDate);
  };

  // Helper to extract day safely avoiding timezone issues
  const getDayFromDateString = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-'); // YYYY-MM-DD
      return parts[2]; // DD
  };

  // --- PROJECTION ENGINE ---
  const unifiedTransactions = useMemo(() => {
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const realTxs = transactions.map(t => ({ ...t, isProjected: false, source: 'FINANCE' }));

      // Always calculate virtual transactions from Agenda
      const virtualTxs = appointments
        .filter(appt => {
            // Ensure date parsing doesn't shift day
            const parts = appt.date.split('-');
            const apptDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
            
            const isValidStatus = appt.status === 'SCHEDULED' || appt.status === 'IN_PROGRESS';
            return isValidStatus;
        })
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
          const parts = t.date.split('-');
          const tDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
          
          const dateMatch = tDate >= startOfMonth && tDate <= endOfMonth;
          const contactMatch = selectedContactFilter ? t.contactId === selectedContactFilter : true;
          return dateMatch && contactMatch;
      });

      return all.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, appointments, currentMonth, items, selectedContactFilter]);

  const dreTransactions = useMemo(() => {
      const startOfMonth = new Date(dreMonth.getFullYear(), dreMonth.getMonth(), 1);
      const endOfMonth = new Date(dreMonth.getFullYear(), dreMonth.getMonth() + 1, 0);
      
      return transactions.filter(t => {
          const parts = t.date.split('-');
          const tDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
          return tDate >= startOfMonth && tDate <= endOfMonth;
      });
  }, [transactions, dreMonth]);

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
      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
      const data = [];

      for (let i = 1; i <= daysInMonth; i++) {
          const dayString = i.toString().padStart(2, '0');
          const dateStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${dayString}`;
          const dayTxs = unifiedTransactions.filter(t => t.date === dateStr);

          const realizedIncome = dayTxs.filter(t => t.type === 'INCOME' && !t.isProjected && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
          const realizedExpense = dayTxs.filter(t => t.type === 'EXPENSE' && !t.isProjected && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
          
          const projectedIncome = dayTxs.filter(t => t.type === 'INCOME' && (t.isProjected || t.status === 'PENDING')).reduce((acc, t) => acc + t.amount, 0);
          const projectedExpense = dayTxs.filter(t => t.type === 'EXPENSE' && (t.isProjected || t.status === 'PENDING')).reduce((acc, t) => acc + t.amount, 0);

          data.push({
              day: dayString,
              Realizado: realizedIncome - realizedExpense,
              Projetado: (realizedIncome + projectedIncome) - (realizedExpense + projectedExpense),
              EntradaReal: realizedIncome,
              SaidaReal: realizedExpense,
              EntradaProj: projectedIncome,
              SaidaProj: projectedExpense
          });
      }
      return data;
  }, [unifiedTransactions, currentMonth]);

  // --- ACTIONS ---

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
          
          setEditingTx(prev => ({
              ...prev,
              attachments: [...(prev.attachments || []), newAttachment]
          }));
      };
      reader.readAsDataURL(file);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (attachmentId: string) => {
      setEditingTx(prev => ({
          ...prev,
          attachments: prev.attachments?.filter(a => a.id !== attachmentId)
      }));
  };

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

  const handleSaveTx = () => {
      if (!editingTx.items || editingTx.items.length === 0) {
          alert("Adicione pelo menos um item à transação.");
          return;
      }
      if (!editingTx.contactId) {
          alert("Selecione um contato/entidade.");
          return;
      }

      const txData: Transaction = {
          id: editingTx.id || Date.now().toString(),
          date: editingTx.date!,
          paidAt: editingTx.status === 'PAID' ? (editingTx.paidAt || editingTx.date) : undefined,
          description: editingTx.description || 'Lançamento Manual',
          amount: Number(editingTx.amount),
          type: editingTx.type!,
          category: 'Lançamento Misto', // Header category
          categoryId: 'mix', 
          accountId: editingTx.accountId!,
          contactId: editingTx.contactId,
          status: editingTx.status || 'PENDING',
          paymentMethod: editingTx.paymentMethod || 'OTHER',
          isReconciled: editingTx.isReconciled || false,
          recurrence: recurrenceForm.enabled ? {
              frequency: recurrenceForm.frequency,
              occurrences: recurrenceForm.occurrences,
              groupId: Date.now().toString()
          } : undefined,
          attachments: editingTx.attachments,
          items: editingTx.items // THE SOURCE OF TRUTH
      };

      if (editingTx.id) {
          updateTransaction(txData);
      } else {
          addTransaction(txData, recurrenceForm.enabled);
      }
      setIsTxModalOpen(false);
      setEditingTx({ date: new Date().toISOString().split('T')[0], type: 'EXPENSE', status: 'PENDING', paymentMethod: 'PIX', isReconciled: false, attachments: [], contactId: '', items: [] });
      setRecurrenceForm({ enabled: false, frequency: 'MONTHLY', occurrences: 12 });
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

  const openTxModal = (tx?: Transaction) => {
    if (tx) {
        setEditingTx(tx);
        const existingContact = contacts.find(c => c.id === tx.contactId);
        setModalContactSearch(existingContact?.name || '');
        setRecurrenceForm({ enabled: false, frequency: 'MONTHLY', occurrences: 12 });
    } else {
        const defaultAcc = accounts.length > 0 ? accounts[0].id : '';
        setEditingTx({
            date: new Date().toISOString().split('T')[0],
            type: 'EXPENSE',
            status: 'PENDING',
            paymentMethod: 'PIX',
            isReconciled: false,
            attachments: [],
            contactId: '',
            accountId: defaultAcc,
            items: []
        });
        setModalContactSearch('');
        setRecurrenceForm({ enabled: false, frequency: 'MONTHLY', occurrences: 12 });
    }
    setCartGroup('');
    setModalContactDropOpen(false);
    setIsTxModalOpen(true);
  };

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
      const totalIncome = unifiedTransactions.filter(t => t.type === 'INCOME').reduce((a,b) => a + b.amount, 0);
      const totalExpense = unifiedTransactions.filter(t => t.type === 'EXPENSE').reduce((a,b) => a + b.amount, 0);
      
      const realizedIncome = unifiedTransactions.filter(t => t.type === 'INCOME' && !t.isProjected && t.status === 'PAID').reduce((a,b) => a + b.amount, 0);
      const realizedExpense = unifiedTransactions.filter(t => t.type === 'EXPENSE' && !t.isProjected && t.status === 'PAID').reduce((a,b) => a + b.amount, 0);

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
      const accTxs = transactions.filter(t => {
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
  }, [accounts, transactions]);

  const totalPendingReconciliation = useMemo(
    () => transactions.filter(t => !t.isReconciled && t.status === 'PAID').length,
    [transactions]
  );

  // Running balance statement for selected account
  const accountStatement = useMemo(() => {
    if (!selectedAccountId) return [];
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!acc) return [];
    const accTxs = transactions
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
  }, [selectedAccountId, accounts, transactions]);

  const contactOptions = useMemo(() => {
      return contacts.filter(c => {
          if (editingTx.type === 'INCOME') return c.type === 'CLIENT' || c.type === 'BOTH';
          if (editingTx.type === 'EXPENSE') return c.type === 'SUPPLIER' || c.type === 'BOTH';
          return true;
      });
  }, [contacts, editingTx.type]);

  const ReportHeader = ({ title, periodDate }: { title: string, periodDate: Date }) => (
      <div className="bg-[#0284c7] text-white p-6 rounded-t-xl flex justify-between items-end mb-0">
          <div>
              <div className="flex items-center gap-2 mb-2">
                  <Hexagon size={18} className="text-[#0284c7] fill-[#0284c7]" />
                  <span className="text-xs font-bold tracking-widest uppercase text-[#64748b]">Relatório Gerencial</span>
              </div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                  {title} <span className="text-[#64748b] text-lg font-light">|</span> <span className="text-[#0284c7]">Odontly ERP</span>
              </h2>
          </div>
          <div className="text-right">
              <p className="text-sm font-medium text-[#64748b]">Empresa</p>
              <p className="font-bold text-lg leading-tight mb-2">{settings.companyName}</p>
              <div className="inline-block bg-white/10 px-3 py-1 rounded text-xs font-mono">
                  Competência: {periodDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
              </div>
          </div>
      </div>
  );

  // ── INADIMPLÊNCIA ALERT ───────────────────────────────────────────
  const inadimplenciaAlert = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const pending = transactions.filter(t => t.type === 'INCOME' && t.status === 'PENDING');
    const pendingAmount = pending.reduce((acc, t) => acc + t.amount, 0);
    const rate = totalIncome > 0 ? (pendingAmount / totalIncome) * 100 : 0;
    return { rate, pendingAmount, count: pending.length, isAlert: rate > 15 };
  }, [transactions]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0a0f1e]">Gestão Financeira & FP&A</h2>
          <p className="text-[#64748b]">Tesouraria, Fluxo de Caixa e Controladoria no padrão Odontly.</p>
        </div>
        <div className="flex bg-[#e0f2fe] p-1 rounded-lg overflow-x-auto">
             <button onClick={() => setActiveTab('CASHFLOW')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-2 ${activeTab === 'CASHFLOW' ? 'bg-white shadow text-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <List size={16} /> Fluxo
             </button>
             <button onClick={() => setActiveTab('TREASURY')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-2 ${activeTab === 'TREASURY' ? 'bg-white shadow text-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <Wallet size={16} /> Tesouraria
             </button>
             <button onClick={() => setActiveTab('DRE')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-2 ${activeTab === 'DRE' ? 'bg-white shadow text-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <PieChart size={16} /> DRE
             </button>
             <button onClick={() => setActiveTab('CONFIG')} className={`px-3 py-2 text-sm font-bold rounded-md flex items-center gap-2 ${activeTab === 'CONFIG' ? 'bg-white shadow text-blue-600' : 'text-[#64748b] hover:text-[#0a0f1e]'}`}>
                 <Building2 size={16} /> Config
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
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] overflow-hidden">
            <ReportHeader title="Fluxo de Caixa" periodDate={currentMonth} />
            <div className="flex flex-col md:flex-row justify-between items-center p-4 gap-4 bg-white border-b border-[#e0f2fe]">
                <div className="flex items-center gap-2 bg-[#f0f9ff] rounded-lg p-1">
                    <button onClick={() => handleMonthChange(currentMonth, setCurrentMonth, 'prev')} className="p-2 hover:bg-[#e0f2fe] rounded"><ChevronLeft size={20} /></button>
                    <span className="font-bold text-[#0a0f1e] w-40 text-center capitalize text-lg">
                        {currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => handleMonthChange(currentMonth, setCurrentMonth, 'next')} className="p-2 hover:bg-[#e0f2fe] rounded"><ChevronRight size={20} /></button>
                </div>
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
                                        onMouseDown={() => { setQuickContactType('SUPPLIER'); setIsQuickContactOpen(true); setCfDropOpen(false); }}
                                        className="w-full text-left px-3 py-2 text-sm text-[#0284c7] hover:bg-[#f0f9ff] flex items-center gap-1.5 font-medium"
                                    >
                                        <Plus size={13} /> Novo contato
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => openTxModal()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20"
                        style={{ backgroundColor: settings.primaryColor }}
                    >
                        <Plus size={20} /> Nova Transação
                    </button>
                </div>
            </div>
        </div>

        {/* Charts & Summary Code */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e0f2fe] h-full min-h-[28rem]">
                <h4 className="font-bold text-[#0a0f1e] mb-4 flex items-center gap-2">
                    <BarChart2 size={18} className="text-blue-500"/> Movimentação Diária
                </h4>
                <ResponsiveContainer width="100%" height="90%">
                    <ComposedChart data={projectionChartData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
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
                            ? tx.items.map(i => `${i.quantity}x ${i.name}`).join(', ') 
                            : tx.description;

                        return (
                        <tr key={tx.id} className={`hover:bg-[#f0f9ff] group ${tx.isProjected ? 'bg-[#f0f9ff]/50' : ''}`}>
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
                                    <span className="flex items-center gap-1 font-medium text-[#64748b]"><User size={10}/> {contactName}</span>
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
                                    <button 
                                        onClick={() => updateTransaction({ ...tx, status: tx.status === 'PAID' ? 'PENDING' : 'PAID', paidAt: tx.status === 'PENDING' ? new Date().toISOString().split('T')[0] : undefined })}
                                        className={`px-2 py-1 rounded text-[10px] font-bold ${tx.status === 'PAID' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef9c3] text-[#854d0e]'}`}
                                    >
                                        {tx.status === 'PAID' ? 'PAGO' : 'ABERTO'}
                                    </button>
                                )}
                            </td>
                            <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                {!tx.isProjected && (
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => updateTransaction({...tx, isReconciled: !tx.isReconciled})}
                                            title={tx.isReconciled ? "Conciliado" : "Conciliar"}
                                        >
                                            {tx.isReconciled ? <CheckCircle size={16} className="text-blue-500" /> : <div className="w-4 h-4 rounded-full border border-[#e0f2fe] hover:border-blue-400"></div>}
                                        </button>
                                        <button onClick={() => openTxModal(tx)} className="text-[#64748b] hover:text-blue-600"><List size={16} /></button>
                                        <button onClick={() => deleteTransaction(tx.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
      </div>
      )}

      {/* --- TREASURY TAB --- */}
      {activeTab === 'TREASURY' && (() => {
        const accTypeConfig: Record<string, { label: string; Icon: React.FC<any> }> = {
          BANK: { label: 'Conta Bancária', Icon: Building2 },
          CASH: { label: 'Caixa Físico', Icon: Banknote },
          WALLET: { label: 'Carteira Digital', Icon: CreditCard },
          INVESTMENT: { label: 'Aplicação', Icon: TrendingUp }
        };
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
                    <span className="text-sm font-bold text-green-600">+{formatCurrency((Object.values(accountStats) as {monthIncome:number;monthExpense:number;pendingCount:number}[]).reduce((a,s) => a + s.monthIncome, 0))}</span>
                    <span className="text-sm font-bold text-red-500">-{formatCurrency((Object.values(accountStats) as {monthIncome:number;monthExpense:number;pendingCount:number}[]).reduce((a,s) => a + s.monthExpense, 0))}</span>
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
      })()}

      {/* --- DRE TAB --- */}
      {activeTab === 'DRE' && (
          <div className="bg-white rounded-xl shadow-sm border border-[#e0f2fe] max-w-4xl mx-auto overflow-hidden">
               <ReportHeader title="Demonstrativo de Resultados (DRE)" periodDate={dreMonth} />
               <div className="p-8">
               <div className="flex flex-col items-center mb-8 gap-2">
                   <div className="flex items-center gap-2 bg-[#f0f9ff] rounded-lg p-1">
                        <button onClick={() => handleMonthChange(dreMonth, setDreMonth, 'prev')} className="p-2 hover:bg-white rounded shadow-sm text-[#64748b]"><ChevronLeft size={18} /></button>
                        <span className="font-bold text-[#0a0f1e] w-40 text-center capitalize">{dreMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => handleMonthChange(dreMonth, setDreMonth, 'next')} className="p-2 hover:bg-white rounded shadow-sm text-[#64748b]"><ChevronRight size={18} /></button>
                   </div>
               </div>
               <div className="space-y-1">
                   {/* 1. GROSS REVENUE */}
                   <div className="flex justify-between py-2 bg-blue-600 text-white px-4 rounded font-bold">
                       <span>(+) Receita de Vendas</span>
                       <span>{formatCurrency(dreReport.GROSS_REVENUE.total)}</span>
                   </div>
                   {Object.entries(dreReport.GROSS_REVENUE.details).map(([catName, val]) => (
                       <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                   ))}
                   
                   {/* 2. DEDUCTIONS */}
                   <div className="flex justify-between py-2 text-red-600 text-sm pl-4 border-t border-[#e0f2fe] mt-2 bg-red-50 rounded">
                       <span>(-) Deduções e Impostos</span>
                       <span>{formatCurrency(dreReport.DEDUCTIONS.total)}</span>
                   </div>
                   {Object.entries(dreReport.DEDUCTIONS.details).map(([catName, val]) => (
                       <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                   ))}

                   {/* 3. NET REVENUE */}
                   <div className="flex justify-between py-3 bg-[#f0f9ff] px-4 rounded font-bold text-[#0a0f1e] mt-1 border border-[#e0f2fe]">
                       <span>(=) Receita Líquida</span>
                       <span>{formatCurrency(dreReport.netRevenue)}</span>
                   </div>

                   {/* 4. VARIABLE COSTS */}
                   <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                       <span>(-) Custo Variável (CPV ou CMV)</span>
                       <span>{formatCurrency(dreReport.VARIABLE_COST.total)}</span>
                   </div>
                   {Object.entries(dreReport.VARIABLE_COST.details).map(([catName, val]) => (
                       <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                   ))}

                   {/* 5. GROSS MARGIN */}
                   <div className="flex justify-between py-3 bg-white px-4 rounded font-bold text-[#0a0f1e] mt-1 border border-[#e0f2fe]">
                       <span>(=) Margem Bruta</span>
                       <span>{formatCurrency(dreReport.grossMargin)}</span>
                   </div>

                   {/* 6. VARIABLE EXPENSES */}
                   <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                       <span>(-) Despesas Variáveis</span>
                       <span>{formatCurrency(dreReport.VARIABLE_EXPENSE.total)}</span>
                   </div>
                   {Object.entries(dreReport.VARIABLE_EXPENSE.details).map(([catName, val]) => (
                       <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                   ))}

                   {/* 7. CONTRIBUTION MARGIN */}
                   <div className="flex justify-between py-3 bg-white px-4 rounded font-bold text-[#0a0f1e] mt-1 border-2 border-[#e0f2fe]">
                       <span>(=) Margem de Contribuição</span>
                       <span>{formatCurrency(dreReport.contributionMargin)}</span>
                   </div>

                   {/* 8. PERSONNEL */}
                   <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                       <span>(-) Gastos com Pessoal</span>
                       <span>{formatCurrency(dreReport.PERSONNEL.total)}</span>
                   </div>
                   {Object.entries(dreReport.PERSONNEL.details).map(([catName, val]) => (
                       <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                   ))}

                   {/* 9. OPERATIONAL EXPENSES */}
                   <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-1 bg-red-50 rounded">
                       <span>(-) Despesas Operacionais</span>
                       <span>{formatCurrency(dreReport.OPERATIONAL_EXPENSE.total)}</span>
                   </div>
                   {Object.entries(dreReport.OPERATIONAL_EXPENSE.details).map(([catName, val]) => (
                       <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                   ))}

                   {/* 10. EBITDA */}
                   <div className="flex justify-between py-3 bg-[#f0f9ff] px-4 rounded font-bold text-[#0a0f1e] mt-1 border border-[#e0f2fe]">
                       <span>(=) EBITDA</span>
                       <span>{formatCurrency(dreReport.ebitda)}</span>
                   </div>

                   {/* 11. DEPRECIATION */}
                   <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                       <span>(-) Depreciação, Amortização e Exaustão</span>
                       <span>{formatCurrency(dreReport.DEPRECIATION.total)}</span>
                   </div>
                   {Object.entries(dreReport.DEPRECIATION.details).map(([catName, val]) => (
                       <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                   ))}

                   {/* 12. OTHER RESULTS */}
                   <div className="flex justify-between py-2 text-[#64748b] text-sm pl-4 mt-1 bg-[#f0f9ff] rounded border border-[#e0f2fe]">
                       <span>(+/-) Outras Receitas e Despesas</span>
                       <span className={dreReport.OTHER_RESULT.total >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(dreReport.OTHER_RESULT.total)}</span>
                   </div>
                   {Object.entries(dreReport.OTHER_RESULT.details).map(([catName, val]) => (
                       <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                   ))}

                   {/* 13. OPERATIONAL RESULT */}
                   <div className="flex justify-between py-3 bg-white px-4 rounded font-bold text-[#0a0f1e] mt-1 border border-[#e0f2fe]">
                       <span>(=) Resultado Operacional</span>
                       <span>{formatCurrency(dreReport.operationalResult)}</span>
                   </div>

                   {/* 14. TAXES */}
                   <div className="flex justify-between py-2 text-red-600 text-sm pl-4 mt-2 bg-red-50 rounded">
                       <span>(-) Tributos (IRPJ e CSLL)</span>
                       <span>{formatCurrency(dreReport.INCOME_TAX.total)}</span>
                   </div>
                   {Object.entries(dreReport.INCOME_TAX.details).map(([catName, val]) => (
                       <div key={catName} className="flex justify-between py-1 text-xs text-[#64748b] pl-6 pr-4"><span>{catName}</span><span>{formatCurrency(val as number)}</span></div>
                   ))}

                   {/* 15. NET RESULT */}
                   <div className="flex justify-between py-4 bg-[#0284c7] px-4 rounded-lg font-bold text-white mt-4 shadow-lg text-lg">
                       <span>(=) Resultado Líquido</span>
                       <span className={dreReport.netResult >= 0 ? 'text-green-400' : 'text-red-400'}>{formatCurrency(dreReport.netResult)}</span>
                   </div>
               </div>
               </div>
          </div>
      )}

      {/* --- CONFIG TAB --- */}
      {activeTab === 'CONFIG' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#e0f2fe]">
              <div className="flex justify-between items-center mb-6">
                  <div><h3 className="text-lg font-bold text-[#0a0f1e]">Plano de Contas Unificado</h3><p className="text-sm text-[#64748b]">Categorias de Caixa alinhadas à DRE.</p></div>
                  <button onClick={() => openCategoryModal()} className="bg-[#0284c7] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0284c7] flex items-center gap-2"><Plus size={16} /> Nova Categoria</button>
              </div>
              <div className="space-y-6 mb-8">
                  {(Object.keys(DRE_STRUCTURE_LABELS) as DRECategoryType[]).map(dreKey => (
                      <div key={dreKey} className="border border-[#e0f2fe] rounded-lg overflow-hidden">
                          <div className="flex justify-between items-center p-3 bg-[#f0f9ff] border-b border-[#e0f2fe]"><span className={`font-bold text-sm uppercase tracking-wide ${DRE_STRUCTURE_LABELS[dreKey].color}`}>{DRE_STRUCTURE_LABELS[dreKey].label}</span><button onClick={() => openCategoryModal(dreKey)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"><Plus size={12} /> Adicionar Item</button></div>
                          <div className="p-0">
                              {dreGroupedCategories[dreKey].length === 0 ? <div className="p-4 text-center text-xs text-[#64748b] italic">Nenhuma categoria.</div> : 
                                  <div className="divide-y divide-[#e0f2fe]">{dreGroupedCategories[dreKey].map(cat => (
                                          <div key={cat.id} className="flex justify-between items-center p-3 hover:bg-[#f0f9ff]"><span className="text-sm text-[#0a0f1e] font-medium">{cat.name}</span>{!cat.isSystem && <button onClick={() => deleteCategory(cat.id)} className="text-[#64748b] hover:text-red-500 p-1"><Trash2 size={14} /></button>}</div>
                                  ))}</div>
                              }
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- TRANSACTION MODAL (UNIFIED & ITEM-BASED) --- */}
      {isTxModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-[#e0f2fe] flex justify-between items-center">
                      <h3 className="text-xl font-bold">Lançamento Financeiro</h3>
                      <button onClick={() => setIsTxModalOpen(false)}><XCircle size={24} className="text-[#64748b]" /></button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* TYPE SELECTION */}
                      <div className="flex gap-4 p-1 bg-[#f0f9ff] rounded-lg">
                          <button onClick={() => { setEditingTx({...editingTx, type: 'INCOME', items: []}); setCartSelector(''); }} className={`flex-1 py-2 rounded-md font-bold text-sm ${editingTx.type === 'INCOME' ? 'bg-[#dcfce7] text-[#166534] shadow-sm' : 'text-[#64748b]'}`}>Entrada</button>
                          <button onClick={() => { setEditingTx({...editingTx, type: 'EXPENSE', items: []}); setCartSelector(''); }} className={`flex-1 py-2 rounded-md font-bold text-sm ${editingTx.type === 'EXPENSE' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-[#64748b]'}`}>Saída</button>
                      </div>

                      {/* Header Fields */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-[#64748b] mb-1">
                                  {editingTx.type === 'INCOME' ? 'Paciente / Origem da Receita' : 'Fornecedor / Destino de Pagamento'}
                              </label>
                              <div className="relative">
                                  <input
                                      type="text"
                                      placeholder={editingTx.type === 'INCOME' ? 'Buscar paciente...' : 'Buscar fornecedor...'}
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
                                                  onMouseDown={() => {
                                                      setQuickContactType(editingTx.type === 'INCOME' ? 'CLIENT' : 'SUPPLIER');
                                                      setIsQuickContactOpen(true);
                                                      setModalContactDropOpen(false);
                                                  }}
                                                  className="w-full text-left px-3 py-2 text-sm text-[#0284c7] hover:bg-[#f0f9ff] flex items-center gap-1.5 font-medium"
                                              >
                                                  <Plus size={13} /> {editingTx.type === 'INCOME' ? 'Novo paciente' : 'Novo fornecedor'}
                                              </button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-[#64748b] mb-1">Data Competência</label>
                              <input 
                                  type="date"
                                  value={editingTx.date}
                                  onChange={e => setEditingTx({...editingTx, date: e.target.value})}
                                  className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                              />
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
                              {/* 1. Item Selector */}
                              <select
                                  className="w-full p-2 border border-[#e0f2fe] rounded text-sm bg-white"
                                  value={cartSelector}
                                  onChange={e => {
                                      setCartSelector(e.target.value);
                                      // If income, auto-fill price from catalog. If expense, reset.
                                      if(editingTx.type === 'INCOME') {
                                          const i = items.find(it => it.id === e.target.value);
                                          setCartValue(i ? i.price.toString() : '');
                                      } else {
                                          setCartValue('');
                                      }
                                  }}
                              >
                                  <option value="">
                                      {editingTx.type === 'INCOME' ? 'Selecione Produto/Serviço (Catálogo)...' : 'Selecione a Categoria (Plano de Contas)...'}
                                  </option>
                                  
                                  {editingTx.type === 'INCOME' ? (
                                      <>
                                          <optgroup label="Serviços">
                                              {items.filter(i => i.type === 'SERVICE').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                          </optgroup>
                                          <optgroup label="Produtos">
                                              {items.filter(i => i.type === 'PRODUCT').map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                          </optgroup>
                                      </>
                                  ) : (
                                      /* Expense Categories Grouped */
                                      (Object.keys(DRE_STRUCTURE_LABELS) as DRECategoryType[]).map(dreKey => {
                                            const catsInGroup = dreGroupedCategories[dreKey].filter(c => c.type === 'EXPENSE');
                                            if(catsInGroup.length === 0) return null;
                                            return (
                                                <optgroup key={dreKey} label={DRE_STRUCTURE_LABELS[dreKey].label}>
                                                    {catsInGroup.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </optgroup>
                                            );
                                      })
                                  )}
                              </select>

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
                                    onClick={handleAddToCart} 
                                    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 text-sm font-bold flex items-center justify-center gap-2"
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
                          <div className="text-right font-bold text-[#0a0f1e] text-lg border-t border-[#e0f2fe] pt-2">
                              Total: {formatCurrency(editingTx.amount || 0)}
                          </div>
                      </div>

                      {/* Payment & Obs */}
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-[#64748b] mb-1">Meio Pagamento</label>
                            <select 
                                value={editingTx.paymentMethod || 'PIX'}
                                onChange={e => setEditingTx({...editingTx, paymentMethod: e.target.value as PaymentMethod})}
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
                            <label className="block text-xs font-bold text-[#64748b] mb-1">Conta Bancária</label>
                            <select 
                                value={editingTx.accountId || ''}
                                onChange={e => setEditingTx({...editingTx, accountId: e.target.value})}
                                className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e] text-sm"
                            >
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                         </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-[#64748b] mb-1">Descrição / Observação</label>
                          <input 
                              type="text"
                              value={editingTx.description || ''}
                              onChange={e => setEditingTx({...editingTx, description: e.target.value})}
                              className="w-full border border-[#e0f2fe] rounded-lg p-2 bg-white text-[#0a0f1e]"
                              placeholder="Detalhes opcionais..."
                          />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 pt-2">
                                <input 
                                    type="checkbox" 
                                    checked={editingTx.status === 'PAID'} 
                                    onChange={e => setEditingTx({...editingTx, status: e.target.checked ? 'PAID' : 'PENDING'})}
                                    className="w-5 h-5 text-blue-600 rounded"
                                />
                                <span className="text-sm font-bold text-[#0a0f1e]">Lançamento Pago / Recebido?</span>
                        </div>
                        {editingTx.status === 'PAID' && (
                             <div className="ml-7 mt-2 animate-in slide-in-from-top-1">
                                  <label className="block text-xs font-bold text-[#64748b] mb-1">Data do Pagamento (Baixa)</label>
                                  <input 
                                      type="date"
                                      value={editingTx.paidAt || editingTx.date}
                                      onChange={e => setEditingTx({...editingTx, paidAt: e.target.value})}
                                      className="border border-[#e0f2fe] rounded p-1 text-sm bg-white"
                                  />
                             </div>
                        )}
                      </div>

                      {/* Recurrence UI (New Transactions Only) */}
                      {!editingTx.id && (
                        <div className="bg-[#e0f2fe] p-3 rounded-lg border border-[#e0f2fe] mt-4">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="recurrence-toggle"
                                    checked={recurrenceForm.enabled}
                                    onChange={e => setRecurrenceForm({ ...recurrenceForm, enabled: e.target.checked })}
                                    className="w-4 h-4 text-[#0284c7] rounded"
                                />
                                <label htmlFor="recurrence-toggle" className="text-sm font-bold text-[#0a0f1e] cursor-pointer select-none flex items-center gap-2">
                                    <Repeat size={14} /> Repetir este lançamento?
                                </label>
                            </div>

                            {recurrenceForm.enabled && (
                                <div className="grid grid-cols-2 gap-4 mt-3 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-bold text-[#0369a1] mb-1">Frequência</label>
                                        <select 
                                            value={recurrenceForm.frequency}
                                            onChange={e => setRecurrenceForm({...recurrenceForm, frequency: e.target.value as any})}
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
                                        <label className="block text-xs font-bold text-[#0369a1] mb-1">Repetições (Vezes)</label>
                                        <input 
                                            type="number" 
                                            min="2" max="60"
                                            value={recurrenceForm.occurrences}
                                            onChange={e => setRecurrenceForm({...recurrenceForm, occurrences: parseInt(e.target.value)})}
                                            className="w-full border border-[#e0f2fe] rounded p-2 text-sm bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                      )}
                  </div>
                  
                  <div className="p-6 border-t border-[#e0f2fe] flex justify-end space-x-3">
                      <button onClick={() => setIsTxModalOpen(false)} className="px-4 py-2 text-[#64748b] hover:bg-[#f0f9ff] rounded-lg">Cancelar</button>
                      <button 
                          onClick={handleSaveTx} 
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                      >
                          Salvar Lançamento
                      </button>
                  </div>
              </div>
          </div>
      )}

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

    </div>
  );
};

export default Finance;
