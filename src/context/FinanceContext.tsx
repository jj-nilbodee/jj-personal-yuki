import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import {
  Transaction,
  CategoryBudget,
  TaxDeductions,
  InvestmentHolding,
  Loan
} from '../types/finance';
import { IncomeBreakdown } from '../services/taxEngine';
import { StorageService } from '../services/storage';
import { convertToCurrency } from '../utils/currency';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  taxIncome: IncomeBreakdown;
  taxDeductions: TaxDeductions;
  investments: InvestmentHolding[];
  loans: Loan[];

  // Computed Metrics
  totalPortfolioValue: number;
  totalPortfolioCost: number;
  totalLoanDebt: number;
  totalMonthlyLoanPayments: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netWorth: number;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateBudget: (category: string, monthlyLimit: number) => void;
  updateTaxIncome: (income: IncomeBreakdown) => void;
  updateTaxDeductions: (deductions: TaxDeductions) => void;
  addInvestment: (inv: Omit<InvestmentHolding, 'id'>) => void;
  deleteInvestment: (id: string) => void;
  updateInvestmentPrice: (id: string, newPrice: number) => void;
  addLoan: (loan: Omit<Loan, 'id'>) => void;
  deleteLoan: (id: string) => void;
  updateLoanExtraPayment: (id: string, extraMonthly: number) => void;
  resetData: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currency } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => StorageService.getBudgets());
  const [taxIncome, setTaxIncome] = useState<IncomeBreakdown>(() => StorageService.getTaxIncome());
  const [taxDeductions, setTaxDeductions] = useState<TaxDeductions>(() => StorageService.getTaxDeductions());
  const [investments, setInvestments] = useState<InvestmentHolding[]>(() => StorageService.getInvestments());
  const [loans, setLoans] = useState<Loan[]>(() => StorageService.getLoans());

  // Calculations
  const totalPortfolioValue = useMemo(() => {
    return investments.reduce((sum, item) => {
      const valueInAssetCurrency = item.shares * item.currentPrice;
      const valueInDisplayCurrency = convertToCurrency(valueInAssetCurrency, item.currency, currency);
      return sum + valueInDisplayCurrency;
    }, 0);
  }, [investments, currency]);

  const totalPortfolioCost = useMemo(() => {
    return investments.reduce((sum, item) => {
      const costInAssetCurrency = item.shares * item.avgBuyPrice;
      const costInDisplayCurrency = convertToCurrency(costInAssetCurrency, item.currency, currency);
      return sum + costInDisplayCurrency;
    }, 0);
  }, [investments, currency]);

  const totalLoanDebt = useMemo(() => {
    return loans.reduce((sum, l) => sum + l.remainingBalance, 0);
  }, [loans]);

  const totalMonthlyLoanPayments = useMemo(() => {
    return loans.reduce((sum, l) => sum + (l.monthlyPayment + (l.extraMonthlyPayment || 0)), 0);
  }, [loans]);

  // Current Month Cash Flow
  const { monthlyIncome, monthlyExpenses } = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let inc = 0;
    let exp = 0;

    transactions.forEach((tx) => {
      // If within this month
      if (tx.date.startsWith(currentMonthPrefix) || true) { // Default show all recent or current month
        if (tx.type === 'income') inc += tx.amount;
        if (tx.type === 'expense') exp += tx.amount;
      }
    });

    return { monthlyIncome: inc, monthlyExpenses: exp };
  }, [transactions]);

  // Net worth = Portfolio + Cashflow savings - Remaining Debt
  const netWorth = useMemo(() => {
    return totalPortfolioValue - totalLoanDebt;
  }, [totalPortfolioValue, totalLoanDebt]);

  // Actions
  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...txData, id: `tx-${Date.now()}` };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    StorageService.saveTransactions(updated);
  };

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    StorageService.saveTransactions(updated);
  };

  const updateBudget = (category: string, monthlyLimit: number) => {
    const updated = budgets.map((b) => (b.category === category ? { ...b, monthlyLimit } : b));
    setBudgets(updated);
    StorageService.saveBudgets(updated);
  };

  const updateTaxIncome = (income: IncomeBreakdown) => {
    setTaxIncome(income);
    StorageService.saveTaxIncome(income);
  };

  const updateTaxDeductions = (deductions: TaxDeductions) => {
    setTaxDeductions(deductions);
    StorageService.saveTaxDeductions(deductions);
  };

  const addInvestment = (invData: Omit<InvestmentHolding, 'id'>) => {
    const newInv: InvestmentHolding = { ...invData, id: `inv-${Date.now()}` };
    const updated = [...investments, newInv];
    setInvestments(updated);
    StorageService.saveInvestments(updated);
  };

  const deleteInvestment = (id: string) => {
    const updated = investments.filter((i) => i.id !== id);
    setInvestments(updated);
    StorageService.saveInvestments(updated);
  };

  const updateInvestmentPrice = (id: string, newPrice: number) => {
    const updated = investments.map((i) => (i.id === id ? { ...i, currentPrice: newPrice } : i));
    setInvestments(updated);
    StorageService.saveInvestments(updated);
  };

  const addLoan = (loanData: Omit<Loan, 'id'>) => {
    const newLoan: Loan = { ...loanData, id: `loan-${Date.now()}` };
    const updated = [...loans, newLoan];
    setLoans(updated);
    StorageService.saveLoans(updated);
  };

  const deleteLoan = (id: string) => {
    const updated = loans.filter((l) => l.id !== id);
    setLoans(updated);
    StorageService.saveLoans(updated);
  };

  const updateLoanExtraPayment = (id: string, extraMonthly: number) => {
    const updated = loans.map((l) => (l.id === id ? { ...l, extraMonthlyPayment: extraMonthly } : l));
    setLoans(updated);
    StorageService.saveLoans(updated);
  };

  const resetData = () => {
    StorageService.resetToDefaults();
    setTransactions(StorageService.getTransactions());
    setBudgets(StorageService.getBudgets());
    setTaxIncome(StorageService.getTaxIncome());
    setTaxDeductions(StorageService.getTaxDeductions());
    setInvestments(StorageService.getInvestments());
    setLoans(StorageService.getLoans());
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        taxIncome,
        taxDeductions,
        investments,
        loans,
        totalPortfolioValue,
        totalPortfolioCost,
        totalLoanDebt,
        totalMonthlyLoanPayments,
        monthlyIncome,
        monthlyExpenses,
        netWorth,
        addTransaction,
        deleteTransaction,
        updateBudget,
        updateTaxIncome,
        updateTaxDeductions,
        addInvestment,
        deleteInvestment,
        updateInvestmentPrice,
        addLoan,
        deleteLoan,
        updateLoanExtraPayment,
        resetData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
