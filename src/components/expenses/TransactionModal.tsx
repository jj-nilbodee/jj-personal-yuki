import React, { useState } from 'react';
import { TransactionType } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { CURRENCY_SYMBOLS } from '../../utils/currency';
import { X, PlusCircle, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface TransactionModalProps {
  onClose: () => void;
  defaultType?: TransactionType;
}

const EXPENSE_CATEGORIES = [
  'Housing', 'Dining & Cafes', 'Groceries', 'Transport',
  'Utilities', 'Shopping', 'Healthcare', 'Entertainment', 'Education', 'Other'
];

const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Bonus', 'Investments', 'Rental', 'Other'
];

export const TransactionModal: React.FC<TransactionModalProps> = ({ onClose, defaultType = 'expense' }) => {
  const { addTransaction } = useFinance();
  const { currency } = useAuth();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(defaultType === 'income' ? 'Salary' : 'Dining & Cafes');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'Crypto'>('Credit Card');
  const [note, setNote] = useState('');

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    addTransaction({
      type,
      amount: numAmount,
      category,
      date,
      paymentMethod,
      note: note.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} color="var(--accent-primary-light)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
              Log Transaction
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Transaction Type Segmented Control */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.4rem',
            background: 'var(--bg-surface)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <button
            type="button"
            onClick={() => { setType('expense'); setCategory(EXPENSE_CATEGORIES[0]); }}
            style={{
              padding: '0.55rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              background: type === 'expense' ? 'var(--color-danger-bg)' : 'transparent',
              color: type === 'expense' ? 'var(--color-danger-light)' : 'var(--text-secondary)',
              border: type === 'expense' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <ArrowDownRight size={16} />
            <span>Expense</span>
          </button>

          <button
            type="button"
            onClick={() => { setType('income'); setCategory(INCOME_CATEGORIES[0]); }}
            style={{
              padding: '0.55rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              background: type === 'income' ? 'var(--color-success-bg)' : 'transparent',
              color: type === 'income' ? 'var(--color-success-light)' : 'var(--text-secondary)',
              border: type === 'income' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <ArrowUpRight size={16} />
            <span>Income</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount input */}
          <div className="form-group">
            <label className="form-label">Amount ({CURRENCY_SYMBOLS[currency] || currency})</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  paddingLeft: '1rem',
                  color: type === 'income' ? 'var(--color-success-light)' : 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
                maxHeight: '130px',
                overflowY: 'auto',
                padding: '4px 0'
              }}
            >
              {categories.map((c) => {
                const isSelected = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid var(--accent-primary-light)' : '1px solid var(--border-subtle)',
                      transition: 'all 0.15s'
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Date */}
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Crypto">Crypto</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div className="form-group">
            <label className="form-label">Notes / Merchant (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Starbucks Reserve, Apple Store"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', height: 48 }}
          >
            Save Transaction
          </button>
        </form>
      </div>
    </div>
  );
};
