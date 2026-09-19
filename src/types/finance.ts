// Financial Models and Types

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod: 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'Crypto';
  note?: string;
}

export interface CategoryBudget {
  category: string;
  monthlyLimit: number;
  color: string;
  iconName: string;
}

export interface TaxDeductions {
  personalAllowance: number;      // Standard personal allowance (e.g. 60,000 THB)
  socialSecurity: number;         // Social Security Fund (capped)
  providentFund: number;          // PVD / Government Pension Fund
  rmf: number;                    // Retirement Mutual Fund
  ssf: number;                    // Super Savings Fund
  thaiEsg: number;                // Thailand ESG Fund / Green Bonds
  lifeInsurance: number;          // General life insurance
  healthInsurance: number;        // Health insurance
  mortgageInterest: number;       // Home loan interest deduction (e.g. up to 100,000)
  donations: number;              // Charitable donations
  otherDeductions: number;        // Custom allowance
}

export interface TaxBracket {
  min: number;
  max: number | null; // null = infinity
  rate: number; // e.g. 0.05 for 5%
}

export interface TaxCalculationResult {
  grossIncome: number;
  totalDeductions: number;
  netTaxableIncome: number;
  taxLiability: number;
  effectiveRate: number;
  marginalRate: number;
  bracketBreakdowns: {
    bracket: string;
    taxableInBracket: number;
    taxRate: number;
    taxAmount: number;
  }[];
  suggestions: {
    title: string;
    description: string;
    potentialSavings: number;
    actionCategory: string;
  }[];
}

export type AssetClass = 'Stock' | 'Crypto' | 'ETF/Fund' | 'Gold' | 'Cash/Deposit';

export interface InvestmentHolding {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  currency: string;
}

export type LoanType = 'Mortgage' | 'Auto' | 'Student' | 'Personal';

export interface Loan {
  id: string;
  name: string;
  type: LoanType;
  principal: number;
  remainingBalance: number;
  interestRate: number; // Annual % e.g. 4.5
  termMonths: number;
  monthlyPayment: number;
  startDate: string;
  extraMonthlyPayment: number;
}

export interface AmortizationScheduleRow {
  month: number;
  date: string;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
}

export interface AmortizationComparison {
  standardTotalInterest: number;
  standardMonths: number;
  standardPayoffDate: string;
  acceleratedTotalInterest: number;
  acceleratedMonths: number;
  acceleratedPayoffDate: string;
  interestSaved: number;
  monthsSaved: number;
  schedule: AmortizationScheduleRow[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  currency: string;
  isDemo?: boolean;
}
