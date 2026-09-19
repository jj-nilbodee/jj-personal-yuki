import React, { useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatMoney } from '../../utils/currency';
import { calculatePersonalTax, THAI_TAX_BRACKETS } from '../../services/taxEngine';
import {
  Wallet,
  Receipt,
  TrendingUp,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface OverviewDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenQuickAdd: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigate, onOpenQuickAdd }) => {
  const {
    netWorth,
    totalPortfolioValue,
    totalPortfolioCost,
    totalLoanDebt,
    monthlyIncome,
    monthlyExpenses,
    taxIncome,
    taxDeductions,
    transactions,
    loans,
  } = useFinance();
  const { currency, user } = useAuth();

  const taxResult = useMemo(() => {
    return calculatePersonalTax(taxIncome, taxDeductions, THAI_TAX_BRACKETS);
  }, [taxIncome, taxDeductions]);

  const netSavings = monthlyIncome - monthlyExpenses;
  const portfolioReturn = totalPortfolioValue - totalPortfolioCost;
  const portfolioReturnPercent = totalPortfolioCost > 0 ? (portfolioReturn / totalPortfolioCost) * 100 : 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero Card: Net Worth */}
      <div
        className="card"
        style={{
          background: 'radial-gradient(100% 100% at 50% 0%, #f9dce9 0%, #fffdf9 72%)',
          border: '1px solid #ecc5d9',
          padding: '1.75rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Estimated Net Worth
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                <ShieldCheck size={12} /> Live Vault
              </span>
            </div>

            <div
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3rem)',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
                color: netWorth >= 0 ? 'var(--text-primary)' : 'var(--color-danger-light)',
                lineHeight: 1.1,
              }}
            >
              {formatMoney(netWorth, currency)}
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.6rem' }}>
              {user ? `Welcome back, ${user.displayName}` : 'Guest Session Active'} • All personal balance sheets synchronized
            </p>
          </div>

          <button
            onClick={onOpenQuickAdd}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', boxShadow: '0 4px 18px rgba(196,123,166,0.3)' }}
            id="hero-quick-log-btn"
          >
            <Sparkles size={16} />
            <span>+ Quick Transaction</span>
          </button>
        </div>

        {/* Balance Sheet Asset vs Liability Split */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL INVESTED ASSETS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-invest-light)', marginTop: '0.2rem' }}>
              {formatMoney(totalPortfolioValue, currency)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Stocks, ETFs, Crypto, Gold
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL LOAN LIABILITIES</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-danger-light)', marginTop: '0.2rem' }}>
              -{formatMoney(totalLoanDebt, currency)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Mortgage & Auto loans remaining
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NET MONTHLY CASHFLOW</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: netSavings >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)', marginTop: '0.2rem' }}>
              {netSavings >= 0 ? '+' : ''}{formatMoney(netSavings, currency)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Income minus all current expenses
            </div>
          </div>
        </div>
      </div>

      {/* The 4 Financial Pillars Quick-Access Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700 }}>
            Financial Command Pillars
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Select to open deep planner</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* Pillar 1: Expenses */}
          <div
            className="card card-interactive"
            onClick={() => onNavigate('expenses')}
            style={{ cursor: 'pointer' }}
            id="pillar-expenses-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', background: '#fbe5ef' }}>
                  <Wallet size={18} color="var(--accent-primary-light)" />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Expenses & Budget</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Spent</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-danger-light)' }}>
                  {formatMoney(monthlyExpenses, currency)}
                </div>
              </div>
              <span className="badge badge-success">
                +{formatMoney(monthlyIncome, currency)} in
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              Tap to view spending breakdown & category limits
            </div>
          </div>

          {/* Pillar 2: Tax Planner */}
          <div
            className="card card-interactive"
            onClick={() => onNavigate('tax')}
            style={{ cursor: 'pointer' }}
            id="pillar-tax-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', background: 'var(--color-tax-bg)' }}>
                  <Receipt size={18} color="var(--color-tax-light)" />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tax Planner</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Est. Annual Tax</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {formatMoney(taxResult.taxLiability, currency)}
                </div>
              </div>
              <span className="badge badge-purple">
                {taxResult.effectiveRate}% Eff. Rate
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              {taxResult.suggestions.length} tax-saving recommendations available
            </div>
          </div>

          {/* Pillar 3: Investments */}
          <div
            className="card card-interactive"
            onClick={() => onNavigate('investments')}
            style={{ cursor: 'pointer' }}
            id="pillar-investments-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', background: 'var(--color-invest-bg)' }}>
                  <TrendingUp size={18} color="var(--color-invest-light)" />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Investment Tracker</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Portfolio Value</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-invest-light)' }}>
                  {formatMoney(totalPortfolioValue, currency)}
                </div>
              </div>
              <span className={`badge ${portfolioReturn >= 0 ? 'badge-success' : 'badge-danger'}`}>
                {portfolioReturn >= 0 ? '+' : ''}{portfolioReturnPercent.toFixed(1)}%
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              Multi-asset tracking across Equities, Crypto & Gold
            </div>
          </div>

          {/* Pillar 4: Loans */}
          <div
            className="card card-interactive"
            onClick={() => onNavigate('loans')}
            style={{ cursor: 'pointer' }}
            id="pillar-loans-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-bg)' }}>
                  <Landmark size={18} color="var(--color-danger-light)" />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Loan Repayment</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Balance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-danger-light)' }}>
                  {formatMoney(totalLoanDebt, currency)}
                </div>
              </div>
              <span className="badge badge-amber">
                {loans.length} Loans
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
              Interactive early payoff amortization calculator
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 className="card-title">Recent Cash Activity</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Latest transactions logged into your vault
            </p>
          </div>

          <button onClick={() => onNavigate('expenses')} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {transactions.slice(0, 4).map((tx) => {
            const isIncome = tx.type === 'income';
            return (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-md)',
                      background: isIncome ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isIncome ? <ArrowUpRight size={16} color="var(--color-success-light)" /> : <ArrowDownRight size={16} color="var(--color-danger-light)" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{tx.category}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tx.note || tx.paymentMethod}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: isIncome ? 'var(--color-success-light)' : 'var(--text-primary)',
                      fontSize: '0.95rem',
                    }}
                  >
                    {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.date}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
