
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Item, Transaction, Appointment, Account, AppSettings, BOMItem, Contact, Invoice, Professional, FinancialCategory, TransactionType, PaymentMethod, TransactionItem, InvoiceStatus } from '../types';
import { auth, db, isConfigured } from '../services/firebase';
// import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

interface UserSession {
    email: string;
    companyId: string;
    name: string;
    uid?: string;
}

interface NexusContextType {
  user: UserSession | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;

  items: Item[];
  transactions: Transaction[];
  appointments: Appointment[];
  accounts: Account[];
  contacts: Contact[];
  professionals: Professional[];
  invoices: Invoice[];
  settings: AppSettings;
  categories: FinancialCategory[];
  
  addItem: (item: Item) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  addStockEntry: (itemId: string, quantity: number, purchasePrice: number, expiryDate?: string) => void;
  
  addTransaction: (tx: Transaction, generateRecurrence?: boolean) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  
  addCategory: (cat: FinancialCategory) => void;
  deleteCategory: (id: string) => void;

  addAccount: (acc: Account) => void;
  updateAccount: (acc: Account) => void;
  deleteAccount: (id: string) => void;

  addAppointment: (appt: Appointment) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  
  completeAppointment: (
      id: string, 
      usedMaterials: BOMItem[], 
      paymentDetails?: { accountId: string, method: PaymentMethod, installments: number },
      discount?: number,
      nps?: number
  ) => void;
  
  addContact: (contact: Contact) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (id: string) => void;
  
  addProfessional: (prof: Professional) => void;
  deleteProfessional: (id: string) => void;
  
  emitInvoice: (id: string) => Promise<void>;
  toggleInvoiceOverdue: (id: string) => void;
  updateSettings: (settings: AppSettings) => void;
  verifyPin: (pin: string) => boolean;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

// --- SEED DATA & CONSTANTS ---
const INITIAL_CATEGORIES: FinancialCategory[] = [
    { id: '1', name: 'Venda de Serviços', type: 'INCOME', dreClass: 'GROSS_REVENUE', isSystem: true },
    { id: '2', name: 'Venda de Produtos', type: 'INCOME', dreClass: 'GROSS_REVENUE', isSystem: true },
    { id: '3', name: 'Impostos sobre Venda', type: 'EXPENSE', dreClass: 'DEDUCTIONS', isSystem: true },
    { id: '4', name: 'Compra de Mercadoria (Revenda)', type: 'EXPENSE', dreClass: 'VARIABLE_COST', isSystem: true },
    { id: '4b', name: 'Insumos de Serviço (Material)', type: 'EXPENSE', dreClass: 'VARIABLE_COST', isSystem: true },
    { id: '5', name: 'Comissões de Venda', type: 'EXPENSE', dreClass: 'VARIABLE_EXPENSE' },
    { id: '7', name: 'Salários Funcionários', type: 'EXPENSE', dreClass: 'PERSONNEL' },
    { id: '7b', name: 'Pro-labore Sócios', type: 'EXPENSE', dreClass: 'PERSONNEL' },
    { id: '8', name: 'Aluguel & Condomínio', type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE' },
    { id: '8b', name: 'Energia, Água e Internet', type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE' },
    { id: '9', name: 'Marketing & Publicidade', type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE' },
    { id: '9b', name: 'Material de Escritório/Limpeza', type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE' },
    { id: '12', name: 'IRPJ / CSLL', type: 'EXPENSE', dreClass: 'INCOME_TAX' }
];

const INITIAL_SETTINGS: AppSettings = {
  companyName: 'Minha Empresa',
  primaryColor: '#1B263B',
  currency: 'BRL',
  adminPin: '0000',
  taxRegime: 'SIMPLES',
  monthlyFiscalGoal: 0,
  abcThresholds: { a: 70, b: 20, c: 10 }
};

// Helper to handle scoped storage (Simulating Multi-tenancy)
const getStorageKey = (key: string, companyId?: string) => {
    if (!companyId) return `nexus_global_${key}`; 
    return `nexus_${companyId}_${key}`;
};

const loadState = <T,>(key: string, fallback: T, companyId?: string): T => {
    if (!companyId) return fallback;
    try {
        const stored = localStorage.getItem(getStorageKey(key, companyId));
        return stored ? JSON.parse(stored) : fallback;
    } catch (e) {
        return fallback;
    }
};

export const NexusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth State
  const [user, setUser] = useState<UserSession | null>(() => {
      const storedUser = localStorage.getItem('nexus_auth_session');
      return storedUser ? JSON.parse(storedUser) : null;
  });

  // Data States
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  // --- FIREBASE AUTH LISTENER (DISABLED/MOCKED) ---
  useEffect(() => {
      // Logic removed to fix missing firebase/auth exports
      // If configured, the real listener would go here
  }, []);

  // --- AUTH ACTIONS ---
  const login = async (email: string, pass: string): Promise<boolean> => {
      // MOCK AUTHENTICATION (FALLBACK)
      if (pass.length > 3) {
          const companyId = btoa(email).replace(/=/g, ''); 
          const session: UserSession = {
              email,
              name: email.split('@')[0],
              companyId: companyId
          };
          setUser(session);
          localStorage.setItem('nexus_auth_session', JSON.stringify(session));
          return true;
      }
      return false;
  };

  const logout = () => {
      setUser(null);
      localStorage.removeItem('nexus_auth_session');
      setItems([]); setTransactions([]); setAppointments([]);
  };

  // --- DATA LOADING ---
  useEffect(() => {
      if (user?.companyId) {
          setItems(loadState('items', [], user.companyId));
          setTransactions(loadState('transactions', [], user.companyId));
          setCategories(loadState('categories', INITIAL_CATEGORIES, user.companyId));
          setAppointments(loadState('appointments', [], user.companyId));
          setAccounts(loadState('accounts', [], user.companyId));
          setContacts(loadState('contacts', [], user.companyId));
          setProfessionals(loadState('professionals', [], user.companyId));
          setInvoices(loadState('invoices', [], user.companyId));
          setSettings(loadState('settings', INITIAL_SETTINGS, user.companyId));
      }
  }, [user]);

  // --- DATA PERSISTENCE ---
  useEffect(() => { if(user) localStorage.setItem(getStorageKey('items', user.companyId), JSON.stringify(items)); }, [items, user]);
  useEffect(() => { if(user) localStorage.setItem(getStorageKey('transactions', user.companyId), JSON.stringify(transactions)); }, [transactions, user]);
  useEffect(() => { if(user) localStorage.setItem(getStorageKey('categories', user.companyId), JSON.stringify(categories)); }, [categories, user]);
  useEffect(() => { if(user) localStorage.setItem(getStorageKey('appointments', user.companyId), JSON.stringify(appointments)); }, [appointments, user]);
  useEffect(() => { if(user) localStorage.setItem(getStorageKey('accounts', user.companyId), JSON.stringify(accounts)); }, [accounts, user]);
  useEffect(() => { if(user) localStorage.setItem(getStorageKey('contacts', user.companyId), JSON.stringify(contacts)); }, [contacts, user]);
  useEffect(() => { if(user) localStorage.setItem(getStorageKey('professionals', user.companyId), JSON.stringify(professionals)); }, [professionals, user]);
  useEffect(() => { if(user) localStorage.setItem(getStorageKey('invoices', user.companyId), JSON.stringify(invoices)); }, [invoices, user]);
  useEffect(() => { if(user) localStorage.setItem(getStorageKey('settings', user.companyId), JSON.stringify(settings)); }, [settings, user]);

  // --- BUSINESS LOGIC ---
  const addItem = (item: Item) => setItems(prev => [...prev, item]);
  const updateItem = (updatedItem: Item) => setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
  const deleteItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const addStockEntry = (itemId: string, quantity: number, purchasePrice: number, expiryDate?: string) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;
      let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
      if (item.cost > 0) {
        if (purchasePrice > item.cost) trend = 'UP';
        else if (purchasePrice < item.cost) trend = 'DOWN';
      }
      const currentTotalValue = item.stock * item.cost;
      const newEntryValue = quantity * purchasePrice;
      const newTotalStock = item.stock + quantity;
      const newCost = newTotalStock > 0 ? (currentTotalValue + newEntryValue) / newTotalStock : purchasePrice;
      updateItem({ ...item, stock: newTotalStock, cost: newCost, expiryDate: expiryDate || item.expiryDate, costTrend: trend });
  };

  const generateRecurringTransactions = (baseTx: Transaction): Transaction[] => {
      if (!baseTx.recurrence) return [baseTx];
      const generated: Transaction[] = [];
      const { frequency, occurrences = 12, endDate } = baseTx.recurrence;
      const baseDate = new Date(baseTx.date);
      let count = occurrences;
      if (endDate) count = 24; 
      for (let i = 0; i < count; i++) {
          const nextDate = new Date(baseDate);
          if (frequency === 'WEEKLY') nextDate.setDate(baseDate.getDate() + (i * 7));
          if (frequency === 'BIWEEKLY') nextDate.setDate(baseDate.getDate() + (i * 14));
          if (frequency === 'MONTHLY') nextDate.setMonth(baseDate.getMonth() + i);
          if (frequency === 'QUARTERLY') nextDate.setMonth(baseDate.getMonth() + (i * 3));
          if (frequency === 'YEARLY') nextDate.setFullYear(baseDate.getFullYear() + i);
          if (endDate && nextDate > new Date(endDate)) break;
          generated.push({ ...baseTx, id: i === 0 ? baseTx.id : `${Date.now()}_rec_${i}`, date: nextDate.toISOString().split('T')[0], status: i === 0 ? baseTx.status : 'PENDING', paidAt: i === 0 ? baseTx.paidAt : undefined, isReconciled: i === 0 ? baseTx.isReconciled : false, installments: { current: i + 1, total: count } });
      }
      return generated;
  };

  const addTransaction = (tx: Transaction, generateRecurrence = false) => {
    if (generateRecurrence && tx.recurrence) {
        const newTxs = generateRecurringTransactions(tx);
        setTransactions(prev => [...prev, ...newTxs]);
        if (tx.status === 'PAID') {
            const amount = newTxs[0].amount;
            setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === tx.accountId) return { ...acc, balance: tx.type === 'INCOME' ? acc.balance + amount : acc.balance - amount };
                return acc;
            }));
        }
    } else {
        setTransactions(prev => [...prev, tx]);
        if (tx.status === 'PAID') {
            setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === tx.accountId) return { ...acc, balance: tx.type === 'INCOME' ? acc.balance + tx.amount : acc.balance - tx.amount };
                return acc;
            }));
        }
    }
  };

  const updateTransaction = (updatedTx: Transaction) => {
      const oldTx = transactions.find(t => t.id === updatedTx.id);
      if (!oldTx) return;
      setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
      if (oldTx.status === 'PAID') {
           setAccounts(prev => prev.map(acc => {
               if (acc.id === oldTx.accountId) return { ...acc, balance: oldTx.type === 'INCOME' ? acc.balance - oldTx.amount : acc.balance + oldTx.amount };
               return acc;
           }));
      }
      if (updatedTx.status === 'PAID') {
           setAccounts(prev => prev.map(acc => {
               if (acc.id === updatedTx.accountId) return { ...acc, balance: updatedTx.type === 'INCOME' ? acc.balance + updatedTx.amount : acc.balance - updatedTx.amount };
               return acc;
           }));
      }
  };

  const deleteTransaction = (id: string) => {
      const tx = transactions.find(t => t.id === id);
      if (tx && tx.status === 'PAID') {
           setAccounts(prev => prev.map(acc => {
               if (acc.id === tx.accountId) return { ...acc, balance: tx.type === 'INCOME' ? acc.balance - tx.amount : acc.balance + tx.amount };
               return acc;
           }));
      }
      setTransactions(transactions.filter(t => t.id !== id));
  };

  const addCategory = (cat: FinancialCategory) => setCategories(prev => [...prev, cat]);
  const deleteCategory = (id: string) => setCategories(prev => prev.filter(c => c.id !== id));
  const addAccount = (acc: Account) => setAccounts(prev => [...prev, acc]);
  const updateAccount = (acc: Account) => setAccounts(prev => prev.map(a => a.id === acc.id ? acc : a));
  const deleteAccount = (id: string) => { if (!transactions.some(t => t.accountId === id)) setAccounts(prev => prev.filter(a => a.id !== id)); };
  
  const addAppointment = (appt: Appointment) => setAppointments(prev => [...prev, appt]);
  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (status === 'CANCELLED') setTransactions(prev => prev.filter(tx => tx.appointmentId !== id || tx.status !== 'PENDING'));
  };

  const completeAppointment = (id: string, usedMaterials: BOMItem[], paymentDetails?: { accountId: string, method: PaymentMethod, installments: number }, discount: number = 0, nps: number = 0) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt || appt.status === 'COMPLETED') return;
    const newItems = [...items];
    const txItems: TransactionItem[] = [];
    if (appt.items && appt.items.length > 0) {
        appt.items.forEach(saleItem => {
             const itemDef = items.find(i => i.id === saleItem.itemId);
             if (!itemDef) return;
             let catId = itemDef.type === 'SERVICE' ? '1' : '2';
             let catName = itemDef.type === 'SERVICE' ? 'Venda de Serviços' : 'Venda de Produtos';
             txItems.push({ itemId: saleItem.itemId, name: itemDef.name, quantity: saleItem.quantity, unitPrice: saleItem.unitPrice, total: saleItem.quantity * saleItem.unitPrice, originalType: itemDef.type, categoryId: catId, categoryName: catName });
             if (itemDef.type === 'PRODUCT') {
                 const idx = newItems.findIndex(i => i.id === saleItem.itemId);
                 if (idx > -1) newItems[idx] = { ...newItems[idx], stock: newItems[idx].stock - saleItem.quantity };
             } 
        });
    }
    usedMaterials.forEach(mat => {
        const idx = newItems.findIndex(i => i.id === mat.itemId);
        if (idx > -1) newItems[idx] = { ...newItems[idx], stock: newItems[idx].stock - mat.quantity };
    });
    setItems(newItems);
    const rawTotal = appt.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const finalTotalAmount = Math.max(0, rawTotal - discount);
    if (paymentDetails && finalTotalAmount > 0) {
        const installments = paymentDetails.installments || 1;
        const installmentValue = finalTotalAmount / installments;
        const mainItemName = appt.items.length > 0 ? items.find(i => i.id === appt.items[0].itemId)?.name : 'Venda Diversa';
        for (let i = 0; i < installments; i++) {
             const isFirst = i === 0;
             const date = new Date(appt.date);
             date.setMonth(date.getMonth() + i); 
             const newTx: Transaction = {
                id: `appt_${id}_tx_${i}`, date: date.toISOString().split('T')[0], paidAt: isFirst ? new Date().toISOString().split('T')[0] : undefined, description: `${mainItemName} - Parc ${i+1}/${installments}`, amount: parseFloat(installmentValue.toFixed(2)), type: 'INCOME', category: 'Lançamento Detalhado', categoryId: 'detailed', accountId: paymentDetails.accountId, paymentMethod: paymentDetails.method, contactId: appt.clientId, appointmentId: appt.id, status: isFirst ? 'PAID' : 'PENDING', isReconciled: false, installments: installments > 1 ? { current: i + 1, total: installments } : undefined, items: txItems 
            };
            addTransaction(newTx);
        }
    }
    if (appt.clientId && appt.items.length > 0) {
        const invItems = appt.items.map(ai => ({ itemId: ai.itemId, name: items.find(k => k.id === ai.itemId)?.name || 'Unknown', quantity: ai.quantity, unitPrice: ai.unitPrice, total: ai.unitPrice * ai.quantity }));
        const newInvoice: Invoice = { id: Date.now().toString() + '_inv', clientId: appt.clientId, appointmentId: appt.id, items: invItems, totalAmount: finalTotalAmount, status: 'DRAFT', createdAt: new Date().toISOString() };
        setInvoices(prev => [...prev, newInvoice]);
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'COMPLETED', customMaterials: usedMaterials, finalAmount: finalTotalAmount, npsScore: nps } : a));
  };

  const emitInvoice = async (id: string) => setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'ISSUED' as const, emittedAt: new Date().toISOString(), sefazLog: `Emitido em ${new Date().toLocaleDateString()}` } : inv));
  const toggleInvoiceOverdue = (id: string) => setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: inv.status === 'OVERDUE' ? 'DRAFT' : 'OVERDUE' } : inv));
  
  const addContact = (c: Contact) => setContacts(prev => [...prev, c]);
  const updateContact = (c: Contact) => setContacts(prev => prev.map(ct => ct.id === c.id ? c : ct));
  const deleteContact = (id: string) => setContacts(prev => prev.filter(c => c.id !== id));
  
  const addProfessional = (p: Professional) => setProfessionals(prev => [...prev, p]);
  const deleteProfessional = (id: string) => setProfessionals(prev => prev.filter(p => p.id !== id));

  const updateSettings = (s: AppSettings) => setSettings(s);
  const verifyPin = (pin: string) => pin === settings.adminPin;

  return (
    <NexusContext.Provider value={{
      user, login, logout,
      items, transactions, appointments, accounts, contacts, professionals, invoices, settings, categories,
      addItem, updateItem, deleteItem, addStockEntry,
      addTransaction, updateTransaction, deleteTransaction, 
      addCategory, deleteCategory,
      addAccount, updateAccount, deleteAccount,
      addAppointment, updateAppointmentStatus, completeAppointment,
      addContact, updateContact, deleteContact, 
      addProfessional, deleteProfessional,
      emitInvoice, toggleInvoiceOverdue, updateSettings, verifyPin
    }}>
      {children}
    </NexusContext.Provider>
  );
};

export const useNexus = () => {
  const context = useContext(NexusContext);
  if (!context) throw new Error("useNexus must be used within a NexusProvider");
  return context;
};
