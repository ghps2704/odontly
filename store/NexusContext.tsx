
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>(INITIAL_CATEGORIES);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const clearData = useCallback(() => {
    setItems([]);
    setTransactions([]);
    setAppointments([]);
    setContacts([]);
    setAccounts([]);
    setProfessionals([]);
    setInvoices([]);
    setCategories(INITIAL_CATEGORIES);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const fetchData = useCallback(async (userId: string) => {
    if (userId === 'test-user-id') return;

    // Helper to load tables safely
    const loadTable = async (table: string, setter: (data: any) => void) => {
        try {
            const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
            if (error) {
                console.error(`Error loading ${table}:`, error.message);
                return;
            }
            if (data) setter(data);
        } catch (e) {
            console.warn(`Exception loading ${table}:`, e);
        }
    };

    try {
        // Parallel execution for speed, but individual error handling via loadTable
        await Promise.all([
            loadTable('items', setItems),
            loadTable('transactions', setTransactions),
            loadTable('appointments', setAppointments),
            loadTable('contacts', setContacts),
            loadTable('accounts', setAccounts),
            loadTable('professionals', setProfessionals),
            loadTable('invoices', setInvoices),
            // Settings is a bit different
            (async () => {
                const { data: sData } = await supabase.from('settings').select('data').eq('user_id', userId).maybeSingle();
                if (sData?.data) {
                    setSettings(sData.data);
                    const customCats = sData.data.customCategories || [];
                    setCategories([...INITIAL_CATEGORIES, ...customCats]);
                }
            })()
        ]);
    } catch (err) {
        console.error("Critical error in fetchData:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Failsafe timeout
    const timeoutId = setTimeout(() => {
      if (isLoading && mounted) {
        console.warn("Auth initialization timed out. Forcing UI render.");
        setIsLoading(false);
      }
    }, 8000); // Increased to 8s for slower connections

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user && mounted) {
          const newUser = {
            email: session.user.email!,
            companyId: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            uid: session.user.id
          };
          setUser(newUser);
          await fetchData(session.user.id);
        } else if (!session && mounted) {
          setUser(null);
          clearData();
        }
      } catch (error) {
        console.warn("Auth Init Error:", error);
        setUser(null);
        clearData();
      } finally {
        if (mounted) setIsLoading(false);
        clearTimeout(timeoutId);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle login / token refresh
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && mounted) {
          const newUser = {
            email: session.user.email!,
            companyId: session.user.id,
            name: session.user.user_metadata?.name || 'Usuário',
            uid: session.user.id
          };
          
          // Only update state if user actually changed to avoid re-renders
          setUser(prev => prev?.uid === newUser.uid ? prev : newUser);
          
          if (event === 'SIGNED_IN') {
             await fetchData(session.user.id);
          }
      } 
      // Handle logout
      else if (event === 'SIGNED_OUT' && mounted) {
        setUser(null);
        clearData();
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [fetchData, clearData]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    // Backdoor for testing
    if (email === 'admin@sozio.com' && pass === '123456') {
      const testUser = {
        email: 'admin@sozio.com',
        companyId: 'test-company',
        name: 'Administrador (Teste)',
        uid: 'test-user-id'
      };
      setUser(testUser);
      setItems([
        { id: '1', name: 'Consultoria Empresarial', type: 'SERVICE', price: 1500, cost: 0, stock: 0, minStock: 0, unit: 'SV', desiredMargin: 100 },
        { id: '2', name: 'Licença de Software', type: 'PRODUCT', price: 250, cost: 100, stock: 50, minStock: 10, unit: 'UN', desiredMargin: 60 }
      ]);
      setAccounts([{ id: '1', name: 'Banco Principal', balance: 5000, type: 'BANK', initialBalance: 5000, color: '#3b82f6' }]);
      return true;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      
      if (error) {
        console.error('Login Failed:', error.message);
        return false;
      }

      if (data.user) {
          const newUser = {
              email: data.user.email!,
              companyId: data.user.id,
              name: data.user.user_metadata?.name || 'Usuário',
              uid: data.user.id
          };
          setUser(newUser);
          // Wait for data fetch before returning true to ensure dashboard isn't empty
          await fetchData(data.user.id);
          return true;
      }
      return false;

    } catch (e) {
      console.error("Login Exception:", e);
      return false;
    }
  };

  const logout = async () => {
    // 1. Optimistic UI Update: Clear user immediately so App.tsx switches to Login
    setUser(null);
    clearData();

    // 2. Perform API call in background (don't block UI)
    try {
        if (user?.uid !== 'test-user-id') {
            await supabase.auth.signOut();
        }
    } catch (e) {
        console.error("Background signout error:", e);
    }
    
    // 3. Safety: Reload page to ensure clean memory state (fixes any lingering chart/listener issues)
    // Using setTimeout to allow the browser to paint the login screen first if needed
    setTimeout(() => {
        window.location.reload();
    }, 100);
  };

  // --- CRUD HELPERS ---

  const insertDB = async (table: string, data: any) => {
    if (!user || user.uid === 'test-user-id') return;
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
    setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i));
    updateDB('items', itemId, updatedItem);
  };

  const addTransaction = async (tx: Transaction, generateRecurrence = false) => {
    const txWithFlags: Transaction = {
      ...tx,
      impactGerencial: tx.impactGerencial !== undefined ? tx.impactGerencial : true,
      impactFiscal: tx.impactFiscal !== undefined ? tx.impactFiscal : (tx.type === 'INCOME')
    };
    let txsToAdd = [txWithFlags];
    setTransactions(prev => [...prev, ...txsToAdd]);
    for (const t of txsToAdd) await insertDB('transactions', t);
    if (txWithFlags.status === 'PAID') {
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) {
        const newBalance = tx.type === 'INCOME' ? acc.balance + tx.amount : acc.balance - tx.amount;
        updateAccount({ ...acc, balance: newBalance });
      }
    }
  };

  const updateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    updateDB('transactions', updatedTx.id, updatedTx);
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    setTransactions(transactions.filter(t => t.id !== id));
    deleteDB('transactions', id);
    if (tx && tx.status === 'PAID') {
      const acc = accounts.find(a => a.id === tx.accountId);
      if (acc) {
        const newBalance = tx.type === 'INCOME' ? acc.balance - tx.amount : acc.balance + tx.amount;
        updateAccount({ ...acc, balance: newBalance });
      }
    }
  };

  const addCategory = (cat: FinancialCategory) => {
    const newCategories = [...categories, cat];
    setCategories(newCategories);
    const newCustom = [...(settings.customCategories || []), cat];
    const newSettings = { ...settings, customCategories: newCustom };
    updateSettings(newSettings);
  };

  const deleteCategory = (id: string) => {
    const newCategories = categories.filter(c => c.id !== id);
    setCategories(newCategories);
    const newCustom = (settings.customCategories || []).filter(c => c.id !== id);
    const newSettings = { ...settings, customCategories: newCustom };
    updateSettings(newSettings);
  };

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

  const addAppointment = (appt: Appointment) => {
    setAppointments(prev => [...prev, appt]);
    insertDB('appointments', appt);
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    updateDB('appointments', id, { status });
  };

  const completeAppointment = (id: string, usedMaterials: BOMItem[], paymentDetails?: { accountId: string, method: PaymentMethod, installments: number }, discount: number = 0, nps: number = 0) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt || appt.status === 'COMPLETED') return;
    const completionData = { status: 'COMPLETED' as const, customMaterials: usedMaterials, finalAmount: (appt.items?.reduce((a, b) => a + (b.unitPrice * b.quantity), 0) || 0) - discount, npsScore: nps };
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...completionData } : a));
    updateDB('appointments', id, completionData);
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

  const emitInvoice = async (id: string) => {
    const update = { status: 'ISSUED' as const, emittedAt: new Date().toISOString() };
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...update } : inv));
    updateDB('invoices', id, update);
  };

  const toggleInvoiceOverdue = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;
    const newStatus = inv.status === 'OVERDUE' ? 'DRAFT' : 'OVERDUE';
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
    updateDB('invoices', id, { status: newStatus });
  };

  const updateSettings = async (s: AppSettings) => {
    setSettings(s);
    if (!user || user.uid === 'test-user-id') return;
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
