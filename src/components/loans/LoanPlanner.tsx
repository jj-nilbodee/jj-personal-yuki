import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatMoney } from '../../utils/currency';
import { calculateAmortization } from '../../services/loanEngine';
import { AddLoanModal } from './AddLoanModal';
import confetti from 'canvas-confetti';
import {
  Landmark,
  Plus,
  Trash2,
  Calendar,
  Zap,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const LoanPlanner: React.FC = () => {
  const { loans, totalLoanDebt, totalMonthlyLoanPayments, deleteLoan, updateLoanExtraPayment } = useFinance();
  const { currency } = useAuth();

  const [selectedLoanId, setSelectedLoanId] = useState<string>(loans[0]?.id || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Active selected loan for simulator
  const activeLoan = useMemo(() => {
    return loans.find((l) => l.id === selectedLoanId) || loans[0];
  }, [loans, selectedLoanId]);

  const [extraPaymentInput, setExtraPaymentInput] = useState<number>(
    activeLoan?.extraMonthlyPayment || 3000
  );

  // Calculate comparative schedule for active loan
  const comparison = useMemo(() => {
    if (!activeLoan) return null;
    return calculateAmortization(activeLoan, extraPaymentInput);
  }, [activeLoan, extraPaymentInput]);

  const handleExtraPaymentChange = (val: number) => {
    setExtraPaymentInput(val);
    if (activeLoan) {
      updateLoanExtraPayment(activeLoan.id, val);
    }
  };

  const handleCelebrate = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 }
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Debt Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #ffe8ea 0%, #fffdf9 100%)', border: '1px solid #f2bec6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-light)' }}>TOTAL OUTSTANDING DEBT</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-bg)' }}>
              <Landmark size={18} color="var(--color-danger-light)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
            {formatMoney(totalLoanDebt, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Across {loans.length} active loan agreements
          </div>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Combined Monthly Installments</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: '0.5rem' }}>
            {formatMoney(totalMonthlyLoanPayments, currency)}/mo
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Includes base amortization + extra prepayments
          </div>
        </div>
      </div>

      {/* Extra Payment Early Payoff Simulator */}
      {activeLoan && comparison && (
        <div className="card" style={{ background: 'linear-gradient(135deg, #e5f4e9 0%, #e1f5f4 100%)', border: '1px solid #b9dcc7' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Zap size={18} color="var(--color-success-light)" />
                <span>Early Payoff Acceleration Simulator</span>
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Simulating prepayment strategy for <strong>{activeLoan.name}</strong>
              </p>
            </div>

            {/* Loan Selector dropdown if multiple loans */}
            {loans.length > 1 && (
              <select
                value={activeLoan.id}
                onChange={(e) => {
                  setSelectedLoanId(e.target.value);
                  const l = loans.find(x => x.id === e.target.value);
                  if (l) setExtraPaymentInput(l.extraMonthlyPayment || 0);
                }}
                style={{ width: 'auto', fontSize: '0.82rem', padding: '0.3rem 0.6rem' }}
              >
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Interactive Extra Payment Slider & Presets */}
          <div style={{ background: 'rgba(255,255,255,0.72)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Extra Monthly Contribution:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-success-light)' }}>
                +{formatMoney(extraPaymentInput, currency)}/mo
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="20000"
              step="500"
              value={extraPaymentInput}
              onChange={(e) => handleExtraPaymentChange(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--color-success)', cursor: 'pointer', height: 8 }}
            />

            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {[0, 1000, 2500, 5000, 10000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleExtraPaymentChange(preset)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: extraPaymentInput === preset ? 'var(--color-success-bg)' : 'rgba(255,255,255,0.05)',
                    color: extraPaymentInput === preset ? 'var(--color-success-light)' : 'var(--text-secondary)',
                    border: extraPaymentInput === preset ? '1px solid var(--color-success)' : '1px solid var(--border-subtle)',
                  }}
                >
                  +{formatMoney(preset, currency)}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Outcome Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(14,22,38,0.7)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL INTEREST SAVED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-success-light)', marginTop: '0.25rem' }}>
                {formatMoney(comparison.interestSaved, currency)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Saved directly from bank interest charges
              </div>
            </div>

            <div style={{ background: 'rgba(14,22,38,0.7)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TIME SHAVED OFF</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-invest-light)', marginTop: '0.25rem' }}>
                {Math.floor(comparison.monthsSaved / 12)}y {comparison.monthsSaved % 12}m
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {comparison.monthsSaved} fewer monthly payments!
              </div>
            </div>

            <div style={{ background: 'rgba(14,22,38,0.7)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NEW PAYOFF TARGET</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white', marginTop: '0.25rem' }}>
                {comparison.acceleratedPayoffDate}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Was: {comparison.standardPayoffDate}
              </div>
            </div>
          </div>

          {extraPaymentInput > 0 && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button onClick={handleCelebrate} className="btn btn-success" style={{ fontSize: '0.85rem' }}>
                <Sparkles size={16} />
                <span>Celebrate Early Freedom Plan!</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Loans List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 className="card-title">Active Loan Accounts</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Fixed repayment obligations and balances
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ height: 38, padding: '0 0.9rem', fontSize: '0.82rem' }}
            id="add-loan-btn"
          >
            <Plus size={16} />
            <span>Add Loan</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loans.map((loan) => {
            const paidOff = loan.principal - loan.remainingBalance;
            const progressPercent = (paidOff / loan.principal) * 100;
            const isSelected = loan.id === activeLoan?.id;

            return (
              <div
                key={loan.id}
                onClick={() => { setSelectedLoanId(loan.id); setExtraPaymentInput(loan.extraMonthlyPayment || 0); }}
                style={{
                  padding: '1.1rem',
                  background: isSelected ? 'rgba(99,102,241,0.08)' : 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.98rem' }}>{loan.name}</span>
                      <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                        {loan.type} • {loan.interestRate}% APR
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Base: {formatMoney(loan.monthlyPayment, currency)}/mo | Term: {loan.termMonths} months
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--color-danger-light)' }}>
                        {formatMoney(loan.remainingBalance, currency)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Orig: {formatMoney(loan.principal, currency)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLoan(loan.id); }}
                      className="btn-ghost btn-icon"
                      style={{ width: 32, height: 32, color: 'var(--text-muted)' }}
                      title="Delete Loan"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Balance Progress Bar */}
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>{progressPercent.toFixed(1)}% Amortized</span>
                    <span>{formatMoney(paidOff, currency)} Principal Paid</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: 6 }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                        background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable Amortization Schedule Table */}
      {comparison && (
        <div className="card">
          <div
            className="card-header"
            style={{ cursor: 'pointer', margin: 0 }}
            onClick={() => setShowSchedule(!showSchedule)}
          >
            <h3 className="card-title">
              <Calendar size={18} color="var(--accent-primary-light)" />
              <span>Full Amortization Breakdown Table ({comparison.schedule.length} months)</span>
            </h3>
            {showSchedule ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {showSchedule && (
            <div style={{ marginTop: '1.25rem', overflowX: 'auto', maxHeight: '380px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem' }}>Mo</th>
                    <th style={{ padding: '0.5rem' }}>Date</th>
                    <th style={{ padding: '0.5rem' }}>Payment</th>
                    <th style={{ padding: '0.5rem' }}>Principal</th>
                    <th style={{ padding: '0.5rem' }}>Interest</th>
                    <th style={{ padding: '0.5rem' }}>Balance Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.schedule.slice(0, 48).map((row) => (
                    <tr key={row.month} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>#{row.month}</td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{row.date}</td>
                      <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>{formatMoney(row.payment, currency)}</td>
                      <td style={{ padding: '0.5rem', color: 'var(--color-success-light)', fontFamily: 'var(--font-mono)' }}>{formatMoney(row.principalPaid, currency)}</td>
                      <td style={{ padding: '0.5rem', color: 'var(--color-danger-light)', fontFamily: 'var(--font-mono)' }}>{formatMoney(row.interestPaid, currency)}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{formatMoney(row.remainingBalance, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {comparison.schedule.length > 48 && (
                <div style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Showing first 48 months of schedule...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showAddModal && <AddLoanModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
};
