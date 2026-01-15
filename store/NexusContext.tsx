
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Item, Transaction, Appointment, Account, AppSettings, BOMItem, Contact, Invoice, Professional, FinancialCategory, TransactionType, PaymentMethod, TransactionItem, InvoiceStatus } from '../types';

interface NexusContextType {
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
  
  // Updated signature to support installments, discount AND NPS
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
  toggleInvoiceOverdue: (id: string) => void; // New method for RF031
  updateSettings: (settings: AppSettings) => void;
  verifyPin: (pin: string) => boolean;
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);

const getFutureDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const getPastDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

// --- SEED DATA: CLEARED FOR USER START ---
const INITIAL_ITEMS: Item[] = [];

const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_CONTACTS: Contact[] = [];

const INITIAL_PROFESSIONALS: Professional[] = [];

const INITIAL_APPOINTMENTS: Appointment[] = [];

// Keeping Categories as System Structure (Chart of Accounts)
const INITIAL_CATEGORIES: FinancialCategory[] = [
    // 1. Receita Bruta
    { id: '1', name: 'Venda de Serviços', type: 'INCOME', dreClass: 'GROSS_REVENUE', isSystem: true },
    { id: '2', name: 'Venda de Produtos', type: 'INCOME', dreClass: 'GROSS_REVENUE', isSystem: true },
    
    // 2. Deduções
    { id: '3', name: 'Impostos sobre Venda', type: 'EXPENSE', dreClass: 'DEDUCTIONS', isSystem: true },

    // 3. Custo Variável
    { id: '4', name: 'Compra de Mercadoria (Revenda)', type: 'EXPENSE', dreClass: 'VARIABLE_COST', isSystem: true },
    { id: '4b', name: 'Insumos de Serviço (Material)', type: 'EXPENSE', dreClass: 'VARIABLE_COST', isSystem: true },

    // 4. Despesas Variáveis
    { id: '5', name: 'Comissões de Venda', type: 'EXPENSE', dreClass: 'VARIABLE_EXPENSE' },

    // 5. Pessoal
    { id: '7', name: 'Salários Funcionários', type: 'EXPENSE', dreClass: 'PERSONNEL' },
    { id: '7b', name: 'Pro-labore Sócios', type: 'EXPENSE', dreClass: 'PERSONNEL' },

    // 6. Despesas Operacionais
    { id: '8', name: 'Aluguel & Condomínio', type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE' },
    { id: '8b', name: 'Energia, Água e Internet', type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE' },
    { id: '9', name: 'Marketing & Publicidade', type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE' },
    { id: '9b', name: 'Material de Escritório/Limpeza', type: 'EXPENSE', dreClass: 'OPERATIONAL_EXPENSE' },

    // 9. Tributos
    { id: '12', name: 'IRPJ / CSLL', type: 'EXPENSE', dreClass: 'INCOME_TAX' }
];

const INITIAL_ACCOUNTS: Account[] = [];

const INITIAL_SETTINGS: AppSettings = {
  companyName: 'Minha Empresa',
  primaryColor: '#1B263B',
  currency: 'BRL',
  adminPin: '0000',
  taxRegime: 'SIMPLES',
  monthlyFiscalGoal: 0,
  abcThresholds: { a: 70, b: 20, c: 10 }
};

const loadState = <T,>(key: string, fallback: T): T => {
    try {
        const stored = localStorage.getItem(`nexus_${key}`);
        return stored ? JSON.parse(stored) : fallback;
    } catch (e) {
        return fallback;
    }
};

export const NexusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Item[]>(() => loadState('items', INITIAL_ITEMS));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadState('transactions', INITIAL_TRANSACTIONS));
  const [categories, setCategories] = useState<FinancialCategory[]>(() => loadState('categories', INITIAL_CATEGORIES));
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadState('appointments', INITIAL_APPOINTMENTS));
  const [accounts, setAccounts] = useState<Account[]>(() => loadState('accounts', INITIAL_ACCOUNTS));
  const [contacts, setContacts] = useState<Contact[]>(() => loadState('contacts', INITIAL_CONTACTS));
  const [professionals, setProfessionals] = useState<Professional[]>(() => loadState('professionals', INITIAL_PROFESSIONALS));
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadState('invoices', []));
  const [settings, setSettings] = useState<AppSettings>(() => loadState('settings', INITIAL_SETTINGS));

  useEffect(() => localStorage.setItem('nexus_items', JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem('nexus_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('nexus_categories', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('nexus_appointments', JSON.stringify(appointments)), [appointments]);
  useEffect(() => localStorage.setItem('nexus_accounts', JSON.stringify(accounts)), [accounts]);
  useEffect(() => localStorage.setItem('nexus_contacts', JSON.stringify(contacts)), [contacts]);
  useEffect(() => localStorage.setItem('nexus_professionals', JSON.stringify(professionals)), [professionals]);
  useEffect(() => localStorage.setItem('nexus_invoices', JSON.stringify(invoices)), [invoices]);
  useEffect(() => localStorage.setItem('nexus_settings', JSON.stringify(settings)), [settings]);

  // --- RECURRENCE LOGIC HELPER ---
  const generateRecurringTransactions = (baseTx: Transaction): Transaction[] => {
      if (!baseTx.recurrence) return [baseTx];

      const generated: Transaction[] = [];
      const { frequency, occurrences = 12, endDate } = baseTx.recurrence;
      const baseDate = new Date(baseTx.date);
      
      let count = occurrences;
      if (endDate) {
          count = 24; // safety cap
      }

      for (let i = 0; i < count; i++) {
          const nextDate = new Date(baseDate);
          
          if (frequency === 'WEEKLY') nextDate.setDate(baseDate.getDate() + (i * 7));
          if (frequency === 'BIWEEKLY') nextDate.setDate(baseDate.getDate() + (i * 14));
          if (frequency === 'MONTHLY') nextDate.setMonth(baseDate.getMonth() + i);
          if (frequency === 'QUARTERLY') nextDate.setMonth(baseDate.getMonth() + (i * 3));
          if (frequency === 'YEARLY') nextDate.setFullYear(baseDate.getFullYear() + i);

          if (endDate && nextDate > new Date(endDate)) break;

          generated.push({
              ...baseTx,
              id: i === 0 ? baseTx.id : `${Date.now()}_rec_${i}`,
              date: nextDate.toISOString().split('T')[0],
              status: i === 0 ? baseTx.status : 'PENDING',
              paidAt: i === 0 ? baseTx.paidAt : undefined,
              isReconciled: i === 0 ? baseTx.isReconciled : false,
              installments: { current: i + 1, total: count }
          });
      }
      return generated;
  };

  const addItem = (item: Item) => setItems([...items, item]);

  const updateItem = (updatedItem: Item) => {
    let newItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
    setItems(newItems);
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

      const updatedItem = {
          ...item,
          stock: newTotalStock,
          cost: newCost,
          expiryDate: expiryDate || item.expiryDate,
          costTrend: trend
      };
      updateItem(updatedItem);
  };

  const deleteItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const addTransaction = (tx: Transaction, generateRecurrence = false) => {
    if (generateRecurrence && tx.recurrence) {
        const newTxs = generateRecurringTransactions(tx);
        setTransactions(prev => [...prev, ...newTxs]);
        
        if (tx.status === 'PAID') {
            const amount = newTxs[0].amount;
            setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === tx.accountId) {
                    return {
                        ...acc,
                        balance: tx.type === 'INCOME' ? acc.balance + amount : acc.balance - amount
                    };
                }
                return acc;
            }));
        }
    } else {
        setTransactions(prev => [...prev, tx]);
        if (tx.status === 'PAID') {
            setAccounts(prevAccounts => prevAccounts.map(acc => {
                if (acc.id === tx.accountId) {
                    return {
                        ...acc,
                        balance: tx.type === 'INCOME' ? acc.balance + tx.amount : acc.balance - tx.amount
                    };
                }
                return acc;
            }));
        }
    }
  };

  const updateTransaction = (updatedTx: Transaction) => {
      const oldTx = transactions.find(t => t.id === updatedTx.id);
      if (!oldTx) return;

      setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));

      // Revert old account impact
      if (oldTx.status === 'PAID') {
           setAccounts(prev => prev.map(acc => {
               if (acc.id === oldTx.accountId) {
                   return { ...acc, balance: oldTx.type === 'INCOME' ? acc.balance - oldTx.amount : acc.balance + oldTx.amount };
               }
               return acc;
           }));
      }

      // Apply new account impact
      if (updatedTx.status === 'PAID') {
           setAccounts(prev => prev.map(acc => {
               if (acc.id === updatedTx.accountId) {
                   return { ...acc, balance: updatedTx.type === 'INCOME' ? acc.balance + updatedTx.amount : acc.balance - updatedTx.amount };
               }
               return acc;
           }));
      }
  };

  const deleteTransaction = (id: string) => {
      const tx = transactions.find(t => t.id === id);
      if (tx && tx.status === 'PAID') {
           setAccounts(prev => prev.map(acc => {
               if (acc.id === tx.accountId) {
                   return { ...acc, balance: tx.type === 'INCOME' ? acc.balance - tx.amount : acc.balance + tx.amount };
               }
               return acc;
           }));
      }
      setTransactions(transactions.filter(t => t.id !== id));
  };

  const addCategory = (cat: FinancialCategory) => setCategories([...categories, cat]);
  const deleteCategory = (id: string) => setCategories(categories.filter(c => c.id !== id));

  // --- ACCOUNTS MANAGEMENT ---
  const addAccount = (acc: Account) => setAccounts([...accounts, acc]);
  const updateAccount = (acc: Account) => setAccounts(accounts.map(a => a.id === acc.id ? acc : a));
  const deleteAccount = (id: string) => {
      if (transactions.some(t => t.accountId === id)) {
          alert("Não é possível excluir contas com movimentações. Arquive-a ou exclua as transações primeiro.");
          return;
      }
      setAccounts(accounts.filter(a => a.id !== id));
  };

  // --- APPOINTMENTS & INTEGRATION ---
  const addAppointment = (appt: Appointment) => setAppointments(prev => [...prev, appt]);
  
  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
      setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
      if (status === 'CANCELLED') {
          setTransactions(prev => prev.filter(tx => tx.appointmentId !== id || tx.status !== 'PENDING'));
      }
  };

  // COMPLETE APPOINTMENT LOGIC (UNIFIED ITEMS)
  const completeAppointment = (
      id: string, 
      usedMaterials: BOMItem[], 
      paymentDetails?: { accountId: string, method: PaymentMethod, installments: number },
      discount: number = 0,
      nps: number = 0 // RF032 - NPS
  ) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt || appt.status === 'COMPLETED') return;

    const newItems = [...items];
    const txItems: TransactionItem[] = []; // Prepare detailed items for transaction

    // 1. Deduct Stock & Build Tx Items
    if (appt.items && appt.items.length > 0) {
        appt.items.forEach(saleItem => {
             const itemDef = items.find(i => i.id === saleItem.itemId);
             if (!itemDef) return;

             // Map Category automatically based on Type (ID 1 = Service, ID 2 = Product)
             let catId = '';
             let catName = '';
             if (itemDef.type === 'SERVICE') {
                 catId = '1'; catName = 'Venda de Serviços';
             } else if (itemDef.type === 'PRODUCT') {
                 catId = '2'; catName = 'Venda de Produtos';
             }

             // Add to detailed transaction list
             txItems.push({
                 itemId: saleItem.itemId,
                 name: itemDef.name,
                 quantity: saleItem.quantity,
                 unitPrice: saleItem.unitPrice,
                 total: saleItem.quantity * saleItem.unitPrice,
                 originalType: itemDef.type,
                 categoryId: catId,
                 categoryName: catName
             });

             if (itemDef.type === 'PRODUCT') {
                 // Direct Stock Deduction
                 const idx = newItems.findIndex(i => i.id === saleItem.itemId);
                 if (idx > -1) {
                     newItems[idx] = {
                         ...newItems[idx],
                         stock: newItems[idx].stock - saleItem.quantity
                     };
                 }
             } 
        });
    }

    // 2. Deduct BOM Materials (passed explicitly from completion modal)
    usedMaterials.forEach(mat => {
        const inputItemIndex = newItems.findIndex(i => i.id === mat.itemId);
        if (inputItemIndex > -1) {
            newItems[inputItemIndex] = {
                ...newItems[inputItemIndex],
                stock: newItems[inputItemIndex].stock - mat.quantity
            };
        }
    });

    setItems(newItems);

    // 3. Calculate Total Amount with Discount
    const rawTotal = appt.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const finalTotalAmount = Math.max(0, rawTotal - discount);

    // 4. Generate Transactions (Installments Logic)
    if (paymentDetails && finalTotalAmount > 0) {
        const installments = paymentDetails.installments || 1;
        const installmentValue = finalTotalAmount / installments;
        
        const mainItemName = appt.items.length > 0 ? items.find(i => i.id === appt.items[0].itemId)?.name : 'Venda Diversa';
        const itemCount = appt.items.length;
        const desc = itemCount > 1 ? `${mainItemName} + ${itemCount-1} itens` : mainItemName;

        for (let i = 0; i < installments; i++) {
             const isFirst = i === 0;
             const date = new Date(appt.date);
             date.setMonth(date.getMonth() + i); 
             
             const status = isFirst ? 'PAID' : 'PENDING';

             const newTx: Transaction = {
                id: `appt_${id}_tx_${i}`,
                date: date.toISOString().split('T')[0],
                paidAt: isFirst ? new Date().toISOString().split('T')[0] : undefined,
                description: `Venda: ${desc} (${appt.clientName}) - Parc ${i+1}/${installments}`,
                amount: parseFloat(installmentValue.toFixed(2)),
                type: 'INCOME',
                // Legacy Header Category
                category: 'Lançamento Detalhado', 
                categoryId: 'detailed',
                
                accountId: paymentDetails.accountId,
                paymentMethod: paymentDetails.method,
                contactId: appt.clientId,
                appointmentId: appt.id,
                status: status,
                isReconciled: false,
                installments: installments > 1 ? { current: i + 1, total: installments } : undefined,
                
                // IMPORTANT: Pass the detailed items list so DRE can process mapping
                items: txItems 
            };
            addTransaction(newTx);
        }
    }

    // 5. Invoice Draft
    if (appt.clientId && appt.items.length > 0) {
        const invItems = appt.items.map(ai => {
            const def = items.find(k => k.id === ai.itemId);
            return {
                itemId: ai.itemId,
                name: def?.name || 'Item desconhecido',
                quantity: ai.quantity,
                unitPrice: ai.unitPrice,
                total: ai.unitPrice * ai.quantity
            };
        });

        const newInvoice: Invoice = {
            id: Date.now().toString() + '_inv',
            clientId: appt.clientId,
            appointmentId: appt.id,
            items: invItems,
            totalAmount: finalTotalAmount, // Use discounted amount for invoice draft
            status: 'DRAFT',
            createdAt: new Date().toISOString()
        };
        setInvoices(prev => [...prev, newInvoice]);
    }

    setAppointments(prev => prev.map(a => a.id === id ? { 
        ...a, 
        status: 'COMPLETED', 
        customMaterials: usedMaterials,
        finalAmount: finalTotalAmount, // Save Net Value
        npsScore: nps // RF032
    } : a));
  };

  const emitInvoice = async (id: string) => {
      setInvoices(prev => {
          return prev.map(inv => inv.id === id ? { 
              ...inv, 
              status: 'ISSUED' as const, 
              emittedAt: new Date().toISOString(), 
              sefazLog: `Emitido manualmente em ${new Date().toLocaleDateString()}` 
          } : inv);
      });
  };

  const toggleInvoiceOverdue = (id: string) => {
      setInvoices(prev => prev.map(inv => {
          if (inv.id === id) {
              // Toggle between OVERDUE and DRAFT
              return { 
                  ...inv, 
                  status: inv.status === 'OVERDUE' ? 'DRAFT' : 'OVERDUE' 
              };
          }
          return inv;
      }));
  };

  const addContact = (contact: Contact) => setContacts([...contacts, contact]);
  const updateContact = (contact: Contact) => setContacts(contacts.map(c => c.id === contact.id ? contact : c));
  const deleteContact = (id: string) => setContacts(contacts.filter(c => c.id !== id));
  
  const addProfessional = (prof: Professional) => setProfessionals([...professionals, prof]);
  const deleteProfessional = (id: string) => setProfessionals(professionals.filter(p => p.id !== id));

  const updateSettings = (newSettings: AppSettings) => setSettings(newSettings);
  const verifyPin = (pin: string) => pin === settings.adminPin;

  return (
    <NexusContext.Provider value={{
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
