import { Loan, AmortizationComparison, AmortizationScheduleRow } from '../types/finance';

/**
 * Calculates standard monthly loan payment (Fixed rate amortization)
 */
export function calculateMonthlyPayment(principal: number, annualInterestRatePercent: number, termMonths: number): number {
  if (annualInterestRatePercent === 0) {
    return termMonths > 0 ? principal / termMonths : 0;
  }
  const monthlyRate = (annualInterestRatePercent / 100) / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return isNaN(payment) || !isFinite(payment) ? 0 : Math.round(payment);
}

/**
 * Generates comparative amortization schedules: standard vs accelerated with extra payments
 */
export function calculateAmortization(loan: Loan, extraMonthly: number = 0): AmortizationComparison {
  const monthlyRate = (loan.interestRate / 100) / 12;
  const basePayment = loan.monthlyPayment > 0 ? loan.monthlyPayment : calculateMonthlyPayment(loan.principal, loan.interestRate, loan.termMonths);
  const acceleratedPayment = basePayment + extraMonthly;

  // 1. Standard Schedule
  let standardBalance = loan.remainingBalance > 0 ? loan.remainingBalance : loan.principal;
  let standardTotalInterest = 0;
  let standardMonths = 0;

  while (standardBalance > 0.01 && standardMonths < 600) {
    standardMonths++;
    const interest = standardBalance * monthlyRate;
    standardTotalInterest += interest;
    const principalPaid = Math.min(basePayment - interest, standardBalance);
    standardBalance -= principalPaid;
    if (basePayment <= interest) {
      // Loan will never amortize
      break;
    }
  }

  // 2. Accelerated Schedule
  let accBalance = loan.remainingBalance > 0 ? loan.remainingBalance : loan.principal;
  let acceleratedTotalInterest = 0;
  let acceleratedMonths = 0;
  const schedule: AmortizationScheduleRow[] = [];

  const startDateObj = loan.startDate ? new Date(loan.startDate) : new Date();

  while (accBalance > 0.01 && acceleratedMonths < 600) {
    acceleratedMonths++;
    const interest = accBalance * monthlyRate;
    acceleratedTotalInterest += interest;

    let paymentForMonth = acceleratedPayment;
    if (accBalance + interest < paymentForMonth) {
      paymentForMonth = accBalance + interest;
    }

    const principalPaid = paymentForMonth - interest;
    accBalance = Math.max(0, accBalance - principalPaid);

    const currentDate = new Date(startDateObj);
    currentDate.setMonth(currentDate.getMonth() + acceleratedMonths);
    const dateStr = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    schedule.push({
      month: acceleratedMonths,
      date: dateStr,
      payment: Math.round(paymentForMonth),
      principalPaid: Math.round(principalPaid),
      interestPaid: Math.round(interest),
      remainingBalance: Math.round(accBalance),
    });

    if (paymentForMonth <= interest) {
      break;
    }
  }

  const standardEndDate = new Date(startDateObj);
  standardEndDate.setMonth(standardEndDate.getMonth() + standardMonths);

  const accEndDate = new Date(startDateObj);
  accEndDate.setMonth(accEndDate.getMonth() + acceleratedMonths);

  const interestSaved = Math.max(0, Math.round(standardTotalInterest - acceleratedTotalInterest));
  const monthsSaved = Math.max(0, standardMonths - acceleratedMonths);

  return {
    standardTotalInterest: Math.round(standardTotalInterest),
    standardMonths,
    standardPayoffDate: standardEndDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    acceleratedTotalInterest: Math.round(acceleratedTotalInterest),
    acceleratedMonths,
    acceleratedPayoffDate: accEndDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    interestSaved,
    monthsSaved,
    schedule,
  };
}
