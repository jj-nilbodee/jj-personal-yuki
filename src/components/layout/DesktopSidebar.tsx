import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  TrendingUp,
  Landmark,
  ShieldCheck,
  CircleDollarSign
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatMoney } from '../../utils/currency';

interface DesktopSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ activeTab, setActiveTab }) => {
  const { netWorth, totalPortfolioValue, totalLoanDebt } = useFinance();
  const { currency } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses & Budget', icon: Wallet },
    { id: 'tax', label: 'Tax Planner', icon: Receipt },
    { id: 'investments', label: 'Investments', icon: TrendingUp },
    { id: 'loans', label: 'Loan Repayments', icon: Landmark },
  ];

  return (
    <aside className="desktop-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo-icon">
          <CircleDollarSign size={22} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <span className="sidebar-title">Yuki Finance</span>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Personal Wealth OS
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              id={`desktop-nav-${item.id}`}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Live Summary */}
      <div className="sidebar-footer">
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            ESTIMATED NET WORTH
          </div>
          <div
            style={{
              fontSize: '1.2rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: netWorth >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)',
            }}
          >
            {formatMoney(netWorth, currency, true)}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.6rem',
              paddingTop: '0.6rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              fontSize: '0.72rem',
            }}
          >
            <span style={{ color: 'var(--color-invest-light)' }}>
              Assets: {formatMoney(totalPortfolioValue, currency, true)}
            </span>
            <span style={{ color: 'var(--color-danger-light)' }}>
              Debt: {formatMoney(totalLoanDebt, currency, true)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} color="var(--color-success)" />
          <span>Local Vault Encrypted & Safe</span>
        </div>
      </div>
    </aside>
  );
};
