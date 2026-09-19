import React, { useState } from 'react';
import { LoanType } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { calculateMonthlyPayment } from '../../services/loanEngine';
import { X, Landmark } from 'lucide-react';

interface AddLoanModalProps {
  onClose: () => void;
}

const LOAN_TYPES: LoanType[] = ['Mortgage', 'Auto', 'Student', 'Personal'];

export const AddLoanModal: React.FC<AddLoanModalProps> = ({ onClose }) => {
  const { addLoan } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<LoanType>('Mortgage');
  const [principal, setPrincipal] = useState('');
  const [remainingBalance, setRemainingBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('360');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  // Auto-calculate suggested monthly payment if user hasn't typed one
  const handleAutoCalc = () => {
    const p = parseFloat(principal);
    const r = parseFloat(interestRate);
    const m = parseInt(termMonths, 10);
    if (p && r >= 0 && m > 0) {
      const calc = calculateMonthlyPayment(p, r, m);
      setMonthlyPayment(calc.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(principal);
    const r = parseFloat(interestRate);
    const t = parseInt(termMonths, 10);
    const bal = remainingBalance ? parseFloat(remainingBalance) : p;

    if (!name.trim() || !p || isNaN(r) || !t) {
      alert('Please fill in Name, Principal, Interest Rate, and Term.');
      return;
    }

    const pay = monthlyPayment ? parseFloat(monthlyPayment) : calculateMonthlyPayment(p, r, t);

    addLoan({
      name: name.trim(),
      type,
      principal: p,
      remainingBalance: bal,
      interestRate: r,
      termMonths: t,
      monthlyPayment: pay,
      startDate,
      extraMonthlyPayment: 0,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Landmark size={20} color="var(--color-danger-light)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
              Add Loan Account
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Loan Description / Title</label>
            <input
              type="text"
              placeholder="e.g. Condo Home Mortgage, Honda City"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Loan Category</label>
              <select value={type} onChange={(e) => setType(e.target.value as LoanType)}>
                {LOAN_TYPES.map((lt) => (
                  <option key={lt} value={lt}>{lt} Loan</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Annual Interest Rate (%)</label>
              <input
                type="number"
                step="0.01"
                placeholder="3.75"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                onBlur={handleAutoCalc}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Original Principal</label>
              <input
                type="number"
                placeholder="3000000"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                onBlur={handleAutoCalc}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Balance Remaining</label>
              <input
                type="number"
                placeholder="Leave blank if new"
                value={remainingBalance}
                onChange={(e) => setRemainingBalance(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Term (Months)</label>
              <input
                type="number"
                placeholder="360"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                onBlur={handleAutoCalc}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Payment</label>
              <input
                type="number"
                placeholder="Auto-calculated"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', height: 48 }}
          >
            Save Loan Plan
          </button>
        </form>
      </div>
    </div>
  );
};
