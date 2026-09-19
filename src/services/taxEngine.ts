import { TaxDeductions, TaxCalculationResult, TaxBracket } from '../types/finance';

// Default Thai Personal Income Tax (PIT) Brackets
export const THAI_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 150000, rate: 0.00 },
  { min: 150000, max: 300000, rate: 0.05 },
  { min: 300000, max: 500000, rate: 0.10 },
  { min: 500000, max: 750000, rate: 0.15 },
  { min: 750000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: 2000000, rate: 0.25 },
  { min: 2000000, max: 5000000, rate: 0.30 },
  { min: 5000000, max: null, rate: 0.35 }
];

export interface IncomeBreakdown {
  salary: number;
  bonus: number;
  freelance: number;
  investments: number;
  other: number;
}

export function calculatePersonalTax(
  income: IncomeBreakdown,
  deductions: TaxDeductions,
  brackets: TaxBracket[] = THAI_TAX_BRACKETS
): TaxCalculationResult {
  const grossIncome = income.salary + income.bonus + income.freelance + income.investments + income.other;

  // Standard 50% expense allowance on employment income, capped at 100,000
  const employmentIncome = income.salary + income.bonus;
  const standardEmploymentDeduction = Math.min(employmentIncome * 0.5, 100000);

  // Capped allowances according to standard tax rules
  const socialSecurityCapped = Math.min(deductions.socialSecurity, 9000);
  const providentFundCapped = Math.min(deductions.providentFund, Math.min(grossIncome * 0.15, 500000));
  const rmfCapped = Math.min(deductions.rmf, Math.min(grossIncome * 0.30, 500000));
  const ssfCapped = Math.min(deductions.ssf, Math.min(grossIncome * 0.30, 200000));
  const thaiEsgCapped = Math.min(deductions.thaiEsg, Math.min(grossIncome * 0.30, 300000));
  const lifeInsuranceCapped = Math.min(deductions.lifeInsurance, 100000);
  const healthInsuranceCapped = Math.min(deductions.healthInsurance, 25000);
  const mortgageInterestCapped = Math.min(deductions.mortgageInterest, 100000);

  const totalDeductions =
    standardEmploymentDeduction +
    deductions.personalAllowance +
    socialSecurityCapped +
    providentFundCapped +
    rmfCapped +
    ssfCapped +
    thaiEsgCapped +
    lifeInsuranceCapped +
    healthInsuranceCapped +
    mortgageInterestCapped +
    deductions.donations +
    deductions.otherDeductions;

  const netTaxableIncome = Math.max(0, grossIncome - totalDeductions);

  let remainingTaxable = netTaxableIncome;
  let totalTax = 0;
  let marginalRate = 0;

  const bracketBreakdowns = brackets.map((b) => {
    if (remainingTaxable <= 0) {
      return {
        bracket: `${b.min.toLocaleString()} - ${b.max ? b.max.toLocaleString() : 'Above'}`,
        taxableInBracket: 0,
        taxRate: b.rate,
        taxAmount: 0,
      };
    }

    const bracketSize = b.max ? b.max - b.min : Infinity;
    const taxableInBracket = Math.min(remainingTaxable, bracketSize);
    const taxAmount = taxableInBracket * b.rate;

    if (taxableInBracket > 0) {
      marginalRate = b.rate;
    }

    remainingTaxable -= taxableInBracket;
    totalTax += taxAmount;

    return {
      bracket: `${b.min.toLocaleString()} - ${b.max ? b.max.toLocaleString() : 'Above'}`,
      taxableInBracket,
      taxRate: b.rate,
      taxAmount,
    };
  });

  const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;

  // Generate actionable optimization suggestions based on unused allowance caps
  const suggestions: TaxCalculationResult['suggestions'] = [];

  if (marginalRate > 0) {
    // Check Thai ESG
    const remainingThaiEsg = Math.max(0, Math.min(grossIncome * 0.3, 300000) - thaiEsgCapped);
    if (remainingThaiEsg > 10000) {
      suggestions.push({
        title: 'Maximize Thai ESG / Green Funds',
        description: `You have ${remainingThaiEsg.toLocaleString()} in remaining Thai ESG allowance.`,
        potentialSavings: remainingThaiEsg * marginalRate,
        actionCategory: 'thaiEsg'
      });
    }

    // Check RMF
    const remainingRmf = Math.max(0, Math.min(grossIncome * 0.3, 500000) - rmfCapped);
    if (remainingRmf > 20000) {
      suggestions.push({
        title: 'Contribute to RMF / Retirement Mutual Fund',
        description: `Invest up to ${remainingRmf.toLocaleString()} more into RMF to lower your top bracket tax.`,
        potentialSavings: remainingRmf * marginalRate,
        actionCategory: 'rmf'
      });
    }

    // Check Life Insurance
    const remainingInsurance = Math.max(0, 100000 - lifeInsuranceCapped);
    if (remainingInsurance > 10000) {
      suggestions.push({
        title: 'Life / Annuity Insurance Deduction',
        description: `Eligible for up to ${remainingInsurance.toLocaleString()} additional deduction.`,
        potentialSavings: remainingInsurance * marginalRate,
        actionCategory: 'lifeInsurance'
      });
    }

    // Check Health Insurance
    const remainingHealth = Math.max(0, 25000 - healthInsuranceCapped);
    if (remainingHealth > 5000) {
      suggestions.push({
        title: 'Health Insurance Tax Credit',
        description: `Remaining allowance of ${remainingHealth.toLocaleString()}.`,
        potentialSavings: remainingHealth * marginalRate,
        actionCategory: 'healthInsurance'
      });
    }
  }

  return {
    grossIncome,
    totalDeductions,
    netTaxableIncome,
    taxLiability: Math.round(totalTax),
    effectiveRate: Number(effectiveRate.toFixed(2)),
    marginalRate: Number((marginalRate * 100).toFixed(0)),
    bracketBreakdowns,
    suggestions,
  };
}
