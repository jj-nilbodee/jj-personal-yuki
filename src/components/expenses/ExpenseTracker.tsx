import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatMoney } from '../../utils/currency';
import { TransactionModal } from './TransactionModal';
import {
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const ExpenseTracker: React.FC = () => {
  const { transactions, budgets, deleteTransaction, monthlyIncome, monthlyExpenses } = useFinance();
  const { currency } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Compute category spending
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type === 'expense') {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      }
    });
    return map;
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tx.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || tx.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, selectedCategory]);

  const netSavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, (netSavings / monthlyIncome) * 100) : 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Cashflow & Savings Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Income Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Monthly Income</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', background: 'var(--color-success-bg)' }}>
              <TrendingUp size={18} color="var(--color-success-light)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-success-light)', marginTop: '0.5rem' }}>
            +{formatMoney(monthlyIncome, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            All active revenue streams
          </div>
        </div>

        {/* Expenses Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Monthly Expenses</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-bg)' }}>
              <TrendingDown size={18} color="var(--color-danger-light)" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-danger-light)', marginTop: '0.5rem' }}>
            -{formatMoney(monthlyExpenses, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Fixed living & discretionary outlays
          </div>
        </div>

        {/* Net Savings & Savings Rate */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Net Cashflow & Savings</span>
            <span className="badge badge-cyan">{savingsRate.toFixed(0)}% Rate</span>
          </div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: netSavings >= 0 ? 'var(--color-invest-light)' : 'var(--color-danger-light)',
              marginTop: '0.5rem'
            }}
          >
            {formatMoney(netSavings, currency)}
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, savingsRate))}%`,
                  background: 'linear-gradient(90deg, #06b6d4 0%, #10b981 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Budget Caps */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Wallet size={18} color="var(--accent-primary-light)" />
              <span>Monthly Budget Allocations</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Real-time monitoring against spending limits
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {budgets.map((budget) => {
            const spent = categorySpentMap[budget.category] || 0;
            const percent = (spent / budget.monthlyLimit) * 100;
            const isOver = spent > budget.monthlyLimit;
            const isNear = percent >= 80 && !isOver;

            let barColor = 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)';
            if (isOver) barColor = 'linear-gradient(90deg, #f43f5e 0%, #e11d48 100%)';
            else if (isNear) barColor = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';

            return (
              <div
                key={budget.category}
                style={{
                  background: 'var(--bg-surface)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: isOver ? '1px solid rgba(244,63,94,0.4)' : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{budget.category}</span>
                  {isOver && (
                    <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>
                      <AlertTriangle size={12} /> Over Limit
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <span>{formatMoney(spent, currency)}</span>
                  <span>Cap: {formatMoney(budget.monthlyLimit, currency)}</span>
                </div>

                <div className="progress-bar-bg" style={{ height: 6 }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(100, percent)}%`,
                      background: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Records */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h3 className="card-title">Transaction Ledger</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {filteredTransactions.length} recorded entries
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: 180 }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2rem', paddingRight: '0.5rem', height: 38, fontSize: '0.8rem' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: 'auto', height: 38, fontSize: '0.8rem', padding: '0 0.75rem' }}
            >
              <option value="All">All Categories</option>
              {budgets.map((b) => (
                <option key={b.category} value={b.category}>
                  {b.category}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
              style={{ height: 38, padding: '0 0.9rem', fontSize: '0.82rem' }}
              id="add-transaction-btn"
            >
              <Plus size={16} />
              <span>Log Entry</span>
            </button>
          </div>
        </div>

        {/* Transaction Table / List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No transactions found matching your filter criteria.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-md)',
                        background: isIncome ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isIncome ? (
                        <ArrowUpRight size={18} color="var(--color-success-light)" />
                      ) : (
                        <ArrowDownRight size={18} color="var(--color-danger-light)" />
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{tx.category}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          • {tx.paymentMethod}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {tx.note || tx.date}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          fontFamily: 'var(--font-mono)',
                          color: isIncome ? 'var(--color-success-light)' : 'var(--text-primary)',
                        }}
                      >
                        {isIncome ? '+' : '-'}{formatMoney(tx.amount, currency)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {tx.date}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="btn-ghost btn-icon"
                      style={{ width: 32, height: 32, color: 'var(--text-muted)' }}
                      title="Delete Entry"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showAddModal && <TransactionModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
};
