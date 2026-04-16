
export type ItemType = 'PRODUCT' | 'SERVICE' | 'INPUT';

export interface BOMItem {
  itemId: string;
  quantity: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  price: number; 
  cost: number; 
  stock: number;
  minStock: number;
  unit: string; 
  bom?: BOMItem[]; 
  desiredMargin?: number; 
  supplierUrl?: string;
  expiryDate?: string; 
  costTrend?: 'UP' | 'DOWN' | 'STABLE'; 
  
  // --- FISCAL INTELLIGENCE FIELDS (OPTIONAL FOR FLEXIBILITY) ---
  ncm?: string; 
  cest?: string; 
  origin?: string; 
  gtin?: string; 
  
  lc116?: string; 
  municipalCode?: string; 
  issRate?: number; 
  
  cst_csosn?: string; 
}

export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'BOLETO' | 'TRANSFER' | 'OTHER';
export type RecurrenceFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

// Updated DRE Structure based on the requested image
export type DRECategoryType = 
  | 'GROSS_REVENUE'        // Receita de Vendas
  | 'DEDUCTIONS'           // Deduções e Impostos
  | 'VARIABLE_COST'        // Custo Variável (CPV/CMV)
  | 'VARIABLE_EXPENSE'     // Despesas Variáveis
  | 'PERSONNEL'            // Gastos com Pessoal
  | 'OPERATIONAL_EXPENSE'  // Despesas Operacionais
  | 'DEPRECIATION'         // Depreciação, Amortização
  | 'OTHER_RESULT'         // Outras Receitas e Despesas (Financeiro)
  | 'INCOME_TAX';          // Tributos (IRPJ e CSLL)

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  occurrences?: number; // Number of times to repeat
  endDate?: string;
  groupId: string; // Links related recurring transactions
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: TransactionType;
  dreClass: DRECategoryType; // Classification for DRE
  parentId?: string; // For Subcategories
  isSystem?: boolean; 
}

export interface Attachment {
  id: string;
  name: string;
  url: string; // Base64 or URL
  type: string; // MIME type
  size: number;
}

// New Interface for Detailed Transaction Items
export interface TransactionItem {
    itemId: string; // ID of Item (Catalog) OR ID of Category (Expense)
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    originalType?: ItemType;

    // Category Snapshot per Item
    categoryId: string;
    categoryName: string;

    // Optional sub-group label to organise items within the same transaction
    groupLabel?: string;
}

export interface Transaction {
  id: string;
  date: string; // Competence Date (Data de Competência)
  paidAt?: string; // Cash Date (Data de Caixa/Pagamento Real)
  description: string;
  amount: number; // Total Sum
  type: TransactionType;
  
  // Legacy/Header Category (Used for display in simple lists)
  category: string; 
  categoryId?: string; 
  
  // DETAILED ITEMS: The source of truth for DRE
  items: TransactionItem[];

  accountId: string;
  paymentMethod: PaymentMethod;
  contactId: string; // MANDATORY
  appointmentId?: string; 
  status: 'PENDING' | 'PAID';
  isReconciled: boolean; 
  recurrence?: RecurrenceConfig;
  installments?: { current: number; total: number };
  attachments?: Attachment[];

  // --- FP&A INTELLIGENCE FLAGS (RF022) ---
  impactFiscal?: boolean;    // Affects official fiscal reports
  impactGerencial?: boolean; // Affects management reports (DRE)
}

export interface Account {
  id: string;
  name: string;
  bankName?: string; // e.g. "Itaú", "Nubank"
  agency?: string;
  accountNumber?: string;
  balance: number;
  initialBalance: number; // For reconciliation
  type: 'BANK' | 'CASH' | 'WALLET' | 'INVESTMENT';
  color?: string;
}

export type AppointmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Professional {
  id: string;
  name: string;
  role: string;
  active: boolean;
  // RF030 - Availability Scale
  availability?: {
      start: string; // "09:00"
      end: string;   // "18:00"
      workDays: number[]; // 0=Sun, 1=Mon...
  };
}

export interface SaleItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export interface Appointment {
  id: string;
  clientId: string; 
  clientName: string; 
  professionalId: string; 
  
  // Unified Items List (Products AND Services)
  items: SaleItem[];

  date: string; 
  startTime: string; 
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  
  // Stores the final value (after discount) for completed appointments
  finalAmount?: number;

  // Audit of materials consumed (Service BOM + Extras)
  customMaterials?: BOMItem[]; 
  
  // RF032 - NPS Score (1-10)
  npsScore?: number;
}

// --- NEW UNIFIED CONTACTS MODULE ---

export interface Address {
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}

export type ContactType = 'CLIENT' | 'SUPPLIER' | 'BOTH';

export interface Contact {
  id: string;
  name: string; 
  type: ContactType;
  document: string; 
  email: string;
  phone?: string;
  stateRegistration?: string; 
  address: Address;
}

// --- FISCAL MODULE TYPES ---

// RF031 - Added 'OVERDUE' status
export type InvoiceStatus = 'DRAFT' | 'ISSUING' | 'ISSUED' | 'ERROR' | 'OVERDUE';

export interface Invoice {
  id: string;
  clientId: string;
  appointmentId?: string; 
  items: { itemId: string; name: string; quantity: number; unitPrice: number; total: number }[];
  totalAmount: number;
  status: InvoiceStatus;
  createdAt: string;
  emittedAt?: string;
  sefazLog?: string;
}

export type TaxRegime = 'MEI' | 'SIMPLES' | 'PRESUMIDO' | 'REAL';

export interface AppSettings {
  companyName: string;
  primaryColor: string; 
  currency: string;
  adminPin: string;
  
  // --- FISCAL PROFILE ---
  legalName?: string; 
  cnpj?: string;
  stateRegistration?: string; 
  municipalRegistration?: string; 
  taxRegime: TaxRegime;
  monthlyFiscalGoal?: number; // Target monthly revenue for fiscal control (e.g. MEI limit / 12)

  // --- ANALYTICS ---
  abcThresholds: {
    a: number; 
    b: number; 
    c: number; 
  };

  // --- CUSTOMIZATION ---
  customCategories?: FinancialCategory[];
}
