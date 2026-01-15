
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Item, Transaction, Appointment, Account, AppSettings, BOMItem, Contact, Invoice, Professional, FinancialCategory, PaymentMethod, TransactionItem } from '../types';
import { supabase } from '../services/supabase';

interface UserSession {
    email: string;
    companyId: string;
    name: string;
    uid: string;
}

interface NexusContextType {
  user: UserSession | null;
  isLoading: boolean;
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

// --- SEED DATA (System Categories - Always available) ---
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

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Minha Empresa',
  primaryColor: '#1B263B',
  currency: 'BRL',
  adminPin: '0000',
  taxRegime: 'SIMPLES',
  monthlyFiscalGoal: 0,
  abcThresholds: { a: 70, b: 20, c: 10 },
  customCategories: []
};

export const NexusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth & UI State
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>(INITIAL_CATEGORIES);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // --- SUPABASE DATA FETCHING ---
  const fetchData = async (userId: string) => {
    // If it's the test user, don't fetch from Supabase (Data is local/ephemeral for test)
    if (userId === 'test-user-id') return;

    try {
        const { data: sData } = await supabase.from('settings').select('data').eq('user_id', userId).single();
        if (sData) {
            setSettings(sData.data);
            // Merge system categories with custom ones from settings
            const customCats = sData.data.customCategories || [];
            setCategories([...INITIAL_CATEGORIES, ...customCats]);
        }

        const { data: iData } = await supabase.from('items').select('*').eq('user_id', userId);
        if (iData) setItems(iData);

        const { data: tData } = await supabase.from('transactions').select('*').eq('user_id', userId);
        if (tData) setTransactions(tData);

        const { data: aData } = await supabase.from('appointments').select('*').eq('user_id', userId);
        if (aData) setAppointments(aData);

        const { data: cData } = await supabase.from('contacts').select('*').eq('user_id', userId);
        if (cData) setContacts(cData);

        const { data: acData } = await supabase.from('accounts').select('*').eq('user_id', userId);
        if (acData) setAccounts(acData);

        const { data: pData } = await supabase.from('professionals').select('*').eq('user_id', userId);
        if (pData) setProfessionals(pData);
        
        const { data: invData } = await supabase.from('invoices').select('*').eq('user_id', userId);
        if (invData) setInvoices(invData);
        
    } catch (error) {
        console.error("Error fetching data:", error);
    }
  };

  // --- AUTH CHECK ON MOUNT ---
  useEffect(() => {
    const checkSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session?.user) {
                setUser({
                    email: session.user.email!,
                    companyId: session.user.id, 
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                    uid: session.user.id
                });
                await fetchData(session.user.id);
            }
        } catch (error) {
            console.warn("Session check failed (likely placeholder URL):", error);
        } finally {
            setIsLoading(false);
        }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
             setUser({
                email: session.user.email!,
                companyId: session.user.id,
                name: session.user.user_metadata?.name || 'User',
                uid: session.user.id
            });
            await fetchData(session.user.id);
        } else if (user?.uid !== 'test-user-id') {
            setUser(null);
            // Clear Data on Logout
            setItems([]); setTransactions([]); setAppointments([]); setContacts([]); setAccounts([]); setProfessionals([]); setInvoices([]); setCategories(INITIAL_CATEGORIES);
        }
        setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- AUTH ACTIONS ---
  const login = async (email: string, pass: string): Promise<boolean> => {
      // --- BACKDOOR FOR TESTING (NO SUPABASE REQUIRED) ---
      if (email === 'admin@sozio.com' && pass === '123456') {
          const testUser = {
              email: 'admin@sozio.com',
              companyId: 'test-company',
              name: 'Administrador (Teste)',
              uid: 'test-user-id'
          };
          setUser(testUser);
          // Seed dummy data for demo
          setItems([
              { id: '1', name: 'Consultoria Empresarial', type: 'SERVICE', price: 1500, cost: 0, stock: 0, minStock: 0, unit: 'SV', desiredMargin: 100 },
              { id: '2', name: 'Licença de Software', type: 'PRODUCT', price: 250, cost: 100, stock: 50, minStock: 10, unit: 'UN', desiredMargin: 60 }
          ]);
          setAccounts([{ id: '1', name: 'Banco Principal', balance: 5000, type: 'BANK', initialBalance: 5000, color: '#3b82f6' }]);
          return true;
      }

      // --- REAL SUPABASE LOGIN ---
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass
        });
        
        if (error) {
            console.error('Login Failed:', error.message);
            return false;
        }
        return !!data.user;
      } catch (e: any) {
          console.error("Login Error (Network/Config):", e);
          return false;
      }
  };

  const logout = async () => {
      if (user?.uid === 'test-user-id') {
          setUser(null);
          setItems([]); setTransactions([]); setAppointments([]); setAccounts([]);
      } else {
          await supabase.auth.signOut();
          setUser(null);
      }
  };

  // --- GENERIC DB HELPERS ---
  const insertDB = async (table: string, data: any) => {
      if (!user || user.uid === 'test-user-id') return;
      // Ensure ID is a string for compatibility if it was numeric in local state
      const payload = { ...data, id: data.id.toString(), user_id: user.uid };
      const { error } = await supabase.from(table).insert(payload);
      if (error) console.error(`Insert ${table} error:`, error);
  };

  const updateDB = async (table: string, id: string, data: any) => {
      if (!user || user.uid === 'test-user-id') return;
      const { error } = await supabase.from(table).update(data).eq('id', id.toString()).eq('user_id', user.uid);
      if (error) console.error(`Update ${table} error:`, error);
  };

  const deleteDB = async (table: string, id: string) => {
      if (!user || user.uid === 'test-user-id') return;
      const { error } = await supabase.from(table).delete().eq('id', id.toString()).eq('user_id', user.uid);
      if (error) console.error(`Delete ${table} error:`, error);
  };

  // --- ENTITY ACTIONS ---

  // ITEMS
  const addItem = (item: Item) => {
      setItems(prev => [...prev, item]);
      insertDB('items', item);
  };
  const updateItem = (updatedItem: Item) => {
      setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
      updateDB('items', updatedItem.id, updatedItem);
  };
  const deleteItem = (id: string) => {
      setItems(prev => prev.filter(i => i.id !== id));
      deleteDB('items', id);
  };

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
      
      const updatedItem = { ...item, stock: newTotalStock, cost: newCost, expiryDate: expiryDate || item.expiryDate, costTrend: trend };
      
      // Optimistic Update
      setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i));
      // DB Update
      updateDB('items', itemId, updatedItem);
  };

  // TRANSACTIONS
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
          
          const newId = i === 0 ? baseTx.id : `${baseTx.id}_rec_${i}`;
          generated.push({ 
              ...baseTx, 
              id: newId, 
              date: nextDate.toISOString().split('T')[0], 
              status: i === 0 ? baseTx.status : 'PENDING', 
              paidAt: i === 0 ? baseTx.paidAt : undefined, 
              isReconciled: i === 0 ? baseTx.isReconciled : false, 
              installments: { current: i + 1, total: count } 
          });
      }
      return generated;
  };

  const addTransaction = async (tx: Transaction, generateRecurrence = false) => {
    // FP&A Flags Logic (RF022): If not set, default.
    // Income usually affects Fiscal + Gerencial. Expense might not affect Fiscal (if informal).
    const txWithFlags: Transaction = {
        ...tx,
        impactGerencial: tx.impactGerencial !== undefined ? tx.impactGerencial : true,
        impactFiscal: tx.impactFiscal !== undefined ? tx.impactFiscal : (tx.type === 'INCOME') // Default Income to fiscal
    };

    let txsToAdd = [txWithFlags];
    
    if (generateRecurrence && tx.recurrence) {
        txsToAdd = generateRecurringTransactions(txWithFlags);
    }
    
    setTransactions(prev => [...prev, ...txsToAdd]);
    
    // DB Insert Loop (Replace localStorage)
    for (const t of txsToAdd) {
        await insertDB('transactions', t);
    }

    // Update Accounts Balance if PAID
    if (txWithFlags.status === 'PAID') {
        const acc = accounts.find(a => a.id === tx.accountId);
        if (acc) {
            const newBalance = tx.type === 'INCOME' ? acc.balance + tx.amount : acc.balance - tx.amount;
            updateAccount({ ...acc, balance: newBalance });
        }
    }
  };

  const updateTransaction = (updatedTx: Transaction) => {
      const oldTx = transactions.find(t => t.id === updatedTx.id);
      if (!oldTx) return;
      
      setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
      updateDB('transactions', updatedTx.id, updatedTx);

      // Revert/Apply balance logic omitted for brevity in MVP
  };

  const deleteTransaction = (id: string) => {
      const tx = transactions.find(t => t.id === id);
      setTransactions(transactions.filter(t => t.id !== id));
      deleteDB('transactions', id);
      
      // Revert Balance if Paid
      if (tx && tx.status === 'PAID') {
          const acc = accounts.find(a => a.id === tx.accountId);
          if (acc) {
               const newBalance = tx.type === 'INCOME' ? acc.balance - tx.amount : acc.balance + tx.amount;
               updateAccount({ ...acc, balance: newBalance });
          }
      }
  };

  // CATEGORIES - PERSISTED VIA SETTINGS
  const addCategory = (cat: FinancialCategory) => {
      const newCategories = [...categories, cat];
      setCategories(newCategories);
      
      // Persist to Settings
      const newCustom = [...(settings.customCategories || []), cat];
      const newSettings = { ...settings, customCategories: newCustom };
      updateSettings(newSettings);
  };
  const deleteCategory = (id: string) => {
      const newCategories = categories.filter(c => c.id !== id);
      setCategories(newCategories);
      
      // Update Settings
      const newCustom = (settings.customCategories || []).filter(c => c.id !== id);
      const newSettings = { ...settings, customCategories: newCustom };
      updateSettings(newSettings);
  };
  
  // ACCOUNTS
  const addAccount = (acc: Account) => {
      setAccounts(prev => [...prev, acc]);
      insertDB('accounts', acc);
  };
  const updateAccount = (acc: Account) => {
      setAccounts(prev => prev.map(a => a.id === acc.id ? acc : a));
      updateDB('accounts', acc.id, acc);
  };
  const deleteAccount = (id: string) => { 
      if (!transactions.some(t => t.accountId === id)) {
          setAccounts(prev => prev.filter(a => a.id !== id));
          deleteDB('accounts', id);
      }
  };
  
  // APPOINTMENTS
  const addAppointment = (appt: Appointment) => {
      setAppointments(prev => [...prev, appt]);
      insertDB('appointments', appt);
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      updateDB('appointments', id, { status });
  };

  const completeAppointment = (
      id: string, 
      usedMaterials: BOMItem[], 
      paymentDetails?: { accountId: string, method: PaymentMethod, installments: number }, 
      discount: number = 0, 
      nps: number = 0
  ) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt || appt.status === 'COMPLETED') return;
    
    // 1. Stock Deduction Logic
    const itemsToUpdate: Item[] = [];
    
    // 1a. Deduct Sold Products
    if (appt.items) {
        appt.items.forEach(saleItem => {
             const itemDef = items.find(i => i.id === saleItem.itemId);
             if (itemDef && itemDef.type === 'PRODUCT') {
                 const newStock = itemDef.stock - saleItem.quantity;
                 itemsToUpdate.push({ ...itemDef, stock: newStock });
             } 
        });
    }
    // 1b. Deduct Materials (BOM)
    usedMaterials.forEach(mat => {
        const itemDef = items.find(i => i.id === mat.itemId);
        const existingUpdate = itemsToUpdate.find(i => i.id === mat.itemId);
        
        if (existingUpdate) {
            existingUpdate.stock -= mat.quantity;
        } else if (itemDef) {
            itemsToUpdate.push({ ...itemDef, stock: itemDef.stock - mat.quantity });
        }
    });

    // Batch Update Items (Optimistic + DB)
    itemsToUpdate.forEach(updatedItem => updateItem(updatedItem));

    // 2. Generate Transaction(s)
    const txItems: TransactionItem[] = [];
    if (appt.items) {
        appt.items.forEach(saleItem => {
             const itemDef = items.find(i => i.id === saleItem.itemId);
             if (!itemDef) return;
             let catId = itemDef.type === 'SERVICE' ? '1' : '2';
             let catName = itemDef.type === 'SERVICE' ? 'Venda de Serviços' : 'Venda de Produtos';
             txItems.push({ itemId: saleItem.itemId, name: itemDef.name, quantity: saleItem.quantity, unitPrice: saleItem.unitPrice, total: saleItem.quantity * saleItem.unitPrice, originalType: itemDef.type, categoryId: catId, categoryName: catName });
        });
    }

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
                id: `appt_${id}_tx_${i}_${Date.now()}`, 
                date: date.toISOString().split('T')[0], 
                paidAt: isFirst ? new Date().toISOString().split('T')[0] : undefined, 
                description: `${mainItemName} - Parc ${i+1}/${installments}`, 
                amount: parseFloat(installmentValue.toFixed(2)), 
                type: 'INCOME', 
                category: 'Lançamento Detalhado', 
                categoryId: 'detailed', 
                accountId: paymentDetails.accountId, 
                paymentMethod: paymentDetails.method, 
                contactId: appt.clientId, 
                appointmentId: appt.id, 
                status: isFirst ? 'PAID' : 'PENDING', 
                isReconciled: false, 
                installments: installments > 1 ? { current: i + 1, total: installments } : undefined, 
                items: txItems,
                // Flags set for Sales (Revenue)
                impactFiscal: true,
                impactGerencial: true 
            };
            addTransaction(newTx);
        }
    }

    // 3. Invoice Generation
    if (appt.clientId && appt.items.length > 0) {
        const invItems = appt.items.map(ai => ({ itemId: ai.itemId, name: items.find(k => k.id === ai.itemId)?.name || 'Unknown', quantity: ai.quantity, unitPrice: ai.unitPrice, total: ai.unitPrice * ai.quantity }));
        const newInvoice: Invoice = { id: `${Date.now()}_inv`, clientId: appt.clientId, appointmentId: appt.id, items: invItems, totalAmount: finalTotalAmount, status: 'DRAFT', createdAt: new Date().toISOString() };
        setInvoices(prev => [...prev, newInvoice]);
        insertDB('invoices', newInvoice);
    }

    // 4. Update Appointment
    const completionData = { status: 'COMPLETED' as const, customMaterials: usedMaterials, finalAmount: finalTotalAmount, npsScore: nps };
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...completionData } : a));
    updateDB('appointments', id, completionData);
  };

  // INVOICES & CONTACTS & PROFS
  const emitInvoice = async (id: string) => {
      const update = { status: 'ISSUED' as const, emittedAt: new Date().toISOString(), sefazLog: `Emitido em ${new Date().toLocaleDateString()}` };
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...update } : inv));
      updateDB('invoices', id, update);
  };
  
  const toggleInvoiceOverdue = (id: string) => {
      const inv = invoices.find(i => i.id === id);
      if(!inv) return;
      const newStatus = inv.status === 'OVERDUE' ? 'DRAFT' : 'OVERDUE';
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
      updateDB('invoices', id, { status: newStatus });
  };
  
  const addContact = (c: Contact) => {
      setContacts(prev => [...prev, c]);
      insertDB('contacts', c);
  };
  const updateContact = (c: Contact) => {
      setContacts(prev => prev.map(ct => ct.id === c.id ? c : ct));
      updateDB('contacts', c.id, c);
  };
  const deleteContact = (id: string) => {
      setContacts(prev => prev.filter(c => c.id !== id));
      deleteDB('contacts', id);
  };
  
  const addProfessional = (p: Professional) => {
      setProfessionals(prev => [...prev, p]);
      insertDB('professionals', p);
  };
  const deleteProfessional = (id: string) => {
      setProfessionals(prev => prev.filter(p => p.id !== id));
      deleteDB('professionals', id);
  };

  const updateSettings = async (s: AppSettings) => {
      setSettings(s);
      if (!user || user.uid === 'test-user-id') return;
      // Using Upsert for settings table
      const { error } = await supabase.from('settings').upsert({ user_id: user.uid, data: s }, { onConflict: 'user_id' });
      if (error) console.error("Error updating settings:", error);
  };
  
  const verifyPin = (pin: string) => pin === settings.adminPin;

  return (
    <NexusContext.Provider value={{
      user, isLoading, login, logout,
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
