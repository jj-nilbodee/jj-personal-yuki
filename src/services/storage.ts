import {
  Transaction,
  CategoryBudget,
  TaxDeductions,
  InvestmentHolding,
  Loan
} from '../types/finance';
import { IncomeBreakdown } from './taxEngine';

export interface FinanceData {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  taxIncome: IncomeBreakdown;
  taxDeductions: TaxDeductions;
  investments: InvestmentHolding[];
  loans: Loan[];
  currency: string;
}

const STORAGE_KEYS = {
  TRANSACTIONS: 'yuki_transactions',
  BUDGETS: 'yuki_budgets',
  TAX_INCOME: 'yuki_tax_income',
  TAX_DEDUCTIONS: 'yuki_tax_deductions',
  INVESTMENTS: 'yuki_investments',
  LOANS: 'yuki_loans',
  CURRENCY: 'yuki_currency',
};

// Default Realistic Seed Data
const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', type: 'income', amount: 85000, category: 'Salary', date: '2026-09-01', paymentMethod: 'Bank Transfer', note: 'Monthly Salary' },
  { id: 'tx-2', type: 'expense', amount: 18500, category: 'Housing', date: '2026-09-02', paymentMethod: 'Bank Transfer', note: 'Condo rent / maintenance' },
  { id: 'tx-3', type: 'expense', amount: 4200, category: 'Groceries', date: '2026-09-04', paymentMethod: 'Credit Card', note: 'Supermarket supplies' },
  { id: 'tx-4', type: 'expense', amount: 1500, category: 'Transport', date: '2026-09-06', paymentMethod: 'Debit Card', note: 'BTS / MRT monthly pass' },
  { id: 'tx-5', type: 'expense', amount: 3200, category: 'Dining & Cafes', date: '2026-09-09', paymentMethod: 'Credit Card', note: 'Weekend dinners' },
  { id: 'tx-6', type: 'income', amount: 15000, category: 'Freelance', date: '2026-09-12', paymentMethod: 'Bank Transfer', note: 'Design consulting' },
  { id: 'tx-7', type: 'expense', amount: 2400, category: 'Utilities', date: '2026-09-14', paymentMethod: 'Bank Transfer', note: 'Electricity & High-speed Fiber' },
  { id: 'tx-8', type: 'expense', amount: 6500, category: 'Shopping', date: '2026-09-16', paymentMethod: 'Credit Card', note: 'Tech accessories & apparel' },
];

const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'Housing', monthlyLimit: 20000, color: '#6366f1', iconName: 'Home' },
  { category: 'Dining & Cafes', monthlyLimit: 8000, color: '#f59e0b', iconName: 'Utensils' },
  { category: 'Groceries', monthlyLimit: 7000, color: '#10b981', iconName: 'ShoppingBag' },
  { category: 'Transport', monthlyLimit: 4000, color: '#06b6d4', iconName: 'Car' },
  { category: 'Utilities', monthlyLimit: 3500, color: '#8b5cf6', iconName: 'Zap' },
  { category: 'Shopping', monthlyLimit: 10000, color: '#ec4899', iconName: 'Tag' },
  { category: 'Healthcare', monthlyLimit: 5000, color: '#14b8a6', iconName: 'HeartPulse' },
];

const DEFAULT_TAX_INCOME: IncomeBreakdown = {
  salary: 1020000,  // 85k * 12
  bonus: 170000,   // 2 months bonus
  freelance: 120000,
  investments: 45000,
  other: 0,
};

const DEFAULT_TAX_DEDUCTIONS: TaxDeductions = {
  personalAllowance: 60000,
  socialSecurity: 9000,
  providentFund: 60000,
  rmf: 50000,
  ssf: 30000,
  thaiEsg: 50000,
  lifeInsurance: 35000,
  healthInsurance: 15000,
  mortgageInterest: 64000,
  donations: 10000,
  otherDeductions: 0,
};

const DEFAULT_INVESTMENTS: InvestmentHolding[] = [
  { id: 'inv-1', symbol: 'VOO', name: 'Vanguard S&P 500 ETF', assetClass: 'ETF/Fund', shares: 15, avgBuyPrice: 480, currentPrice: 535, currency: 'USD' },
  { id: 'inv-2', symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'Stock', shares: 25, avgBuyPrice: 195, currentPrice: 228, currency: 'USD' },
  { id: 'inv-3', symbol: 'BTC', name: 'Bitcoin', assetClass: 'Crypto', shares: 0.18, avgBuyPrice: 58000, currentPrice: 66500, currency: 'USD' },
  { id: 'inv-4', symbol: 'ETH', name: 'Ethereum', assetClass: 'Crypto', shares: 1.5, avgBuyPrice: 2400, currentPrice: 2650, currency: 'USD' },
  { id: 'inv-5', symbol: 'GOLD', name: 'Physical Gold 96.5%', assetClass: 'Gold', shares: 4, avgBuyPrice: 38500, currentPrice: 42800, currency: 'THB' },
  { id: 'inv-6', symbol: 'SCB-ESGF', name: 'SCB Thai ESG Fund', assetClass: 'ETF/Fund', shares: 5000, avgBuyPrice: 10, currentPrice: 10.85, currency: 'THB' },
];

const DEFAULT_LOANS: Loan[] = [
  {
    id: 'loan-1',
    name: 'Siam Prime Condo Mortgage',
    type: 'Mortgage',
    principal: 3500000,
    remainingBalance: 2850000,
    interestRate: 3.75,
    termMonths: 360,
    monthlyPayment: 16200,
    startDate: '2023-01-15',
    extraMonthlyPayment: 3000,
  },
  {
    id: 'loan-2',
    name: 'EV Auto Loan (0% Promo)',
    type: 'Auto',
    principal: 850000,
    remainingBalance: 425000,
    interestRate: 1.99,
    termMonths: 48,
    monthlyPayment: 18400,
    startDate: '2024-06-01',
    extraMonthlyPayment: 0,
  },
];

// Helper functions for LocalStorage
function load<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export const StorageService = {
  getTransactions: () => load<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS),
  saveTransactions: (txs: Transaction[]) => save(STORAGE_KEYS.TRANSACTIONS, txs),

  getBudgets: () => load<CategoryBudget[]>(STORAGE_KEYS.BUDGETS, DEFAULT_BUDGETS),
  saveBudgets: (budgets: CategoryBudget[]) => save(STORAGE_KEYS.BUDGETS, budgets),

  getTaxIncome: () => load<IncomeBreakdown>(STORAGE_KEYS.TAX_INCOME, DEFAULT_TAX_INCOME),
  saveTaxIncome: (income: IncomeBreakdown) => save(STORAGE_KEYS.TAX_INCOME, income),

  getTaxDeductions: () => load<TaxDeductions>(STORAGE_KEYS.TAX_DEDUCTIONS, DEFAULT_TAX_DEDUCTIONS),
  saveTaxDeductions: (deductions: TaxDeductions) => save(STORAGE_KEYS.TAX_DEDUCTIONS, deductions),

  getInvestments: () => load<InvestmentHolding[]>(STORAGE_KEYS.INVESTMENTS, DEFAULT_INVESTMENTS),
  saveInvestments: (holdings: InvestmentHolding[]) => save(STORAGE_KEYS.INVESTMENTS, holdings),

  getLoans: () => load<Loan[]>(STORAGE_KEYS.LOANS, DEFAULT_LOANS),
  saveLoans: (loans: Loan[]) => save(STORAGE_KEYS.LOANS, loans),

  getCurrency: () => load<string>(STORAGE_KEYS.CURRENCY, 'THB'),
  saveCurrency: (currency: string) => save(STORAGE_KEYS.CURRENCY, currency),

  getAllData: (): FinanceData => ({
    transactions: StorageService.getTransactions(),
    budgets: StorageService.getBudgets(),
    taxIncome: StorageService.getTaxIncome(),
    taxDeductions: StorageService.getTaxDeductions(),
    investments: StorageService.getInvestments(),
    loans: StorageService.getLoans(),
    currency: StorageService.getCurrency(),
  }),

  saveAllData: (data: FinanceData): void => {
    StorageService.saveTransactions(data.transactions);
    StorageService.saveBudgets(data.budgets);
    StorageService.saveTaxIncome(data.taxIncome);
    StorageService.saveTaxDeductions(data.taxDeductions);
    StorageService.saveInvestments(data.investments);
    StorageService.saveLoans(data.loans);
    StorageService.saveCurrency(data.currency);
  },

  // Backup & Restore
  exportAllData: () => {
    return JSON.stringify({
      ...StorageService.getAllData(),
      exportDate: new Date().toISOString(),
    }, null, 2);
  },

  importAllData: (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.transactions) StorageService.saveTransactions(parsed.transactions);
      if (parsed.budgets) StorageService.saveBudgets(parsed.budgets);
      if (parsed.taxIncome) StorageService.saveTaxIncome(parsed.taxIncome);
      if (parsed.taxDeductions) StorageService.saveTaxDeductions(parsed.taxDeductions);
      if (parsed.investments) StorageService.saveInvestments(parsed.investments);
      if (parsed.loans) StorageService.saveLoans(parsed.loans);
      if (parsed.currency) StorageService.saveCurrency(parsed.currency);
      return true;
    } catch {
      return false;
    }
  },

  resetToDefaults: () => {
    save(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS);
    save(STORAGE_KEYS.BUDGETS, DEFAULT_BUDGETS);
    save(STORAGE_KEYS.TAX_INCOME, DEFAULT_TAX_INCOME);
    save(STORAGE_KEYS.TAX_DEDUCTIONS, DEFAULT_TAX_DEDUCTIONS);
    save(STORAGE_KEYS.INVESTMENTS, DEFAULT_INVESTMENTS);
    save(STORAGE_KEYS.LOANS, DEFAULT_LOANS);
  }
};
