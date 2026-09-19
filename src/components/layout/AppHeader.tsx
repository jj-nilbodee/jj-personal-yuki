import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CURRENCY_SYMBOLS } from '../../utils/currency';
import { Settings, LogIn, LogOut, Sparkles, User as UserIcon, Cat } from 'lucide-react';
import { FirebaseConfigModal } from '../auth/FirebaseConfigModal';

interface AppHeaderProps {
  activeTab: string;
  onOpenQuickAdd: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ activeTab, onOpenQuickAdd }) => {
  const { user, login, logout, currency, setCurrency } = useAuth();
  const [showConfigModal, setShowConfigModal] = useState(false);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Financial Command Center';
      case 'expenses': return 'Expense & Budget Tracker';
      case 'tax': return 'Personal Tax Planner';
      case 'investments': return 'Investment Portfolio';
      case 'loans': return 'Loan Repayment & Amortization';
      default: return 'Yuki Finance';
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <Cat size={22} color="var(--accent-primary)" strokeWidth={2.2} aria-hidden="true" />
          <div>
            <h1 className="header-title">{getTabTitle()}</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              A cozy nook for your money
            </p>
          </div>
        </div>

        <div className="header-actions">
          {/* Currency Switcher */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '0.35rem 0.65rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: 'auto'
              }}
              title="Select Base Currency"
            >
              {Object.keys(CURRENCY_SYMBOLS).map((c) => (
                <option key={c} value={c} style={{ background: '#fffdf9' }}>
                  {c} ({CURRENCY_SYMBOLS[c]})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Add (Desktop) */}
          <button
            onClick={onOpenQuickAdd}
            className="btn btn-primary"
            style={{
              padding: '0.4rem 0.9rem',
              fontSize: '0.85rem',
              display: 'none',
            }}
            id="desktop-quick-add-btn"
          >
            <Sparkles size={16} />
            <span>+ Quick Log</span>
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="btn btn-ghost btn-icon"
            title="Firebase & App Settings"
          >
            <Settings size={18} />
          </button>

          {/* User Auth Profile */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <UserIcon size={16} />
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 600, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName.split(' ')[0]}
                </span>
                {user.isDemo && (
                  <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                    Demo
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                className="btn btn-ghost btn-icon"
                title="Sign Out"
                style={{ width: 36, height: 36 }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', gap: '0.4rem' }}
            >
              <LogIn size={15} />
              <span>Google Sign-In</span>
            </button>
          )}
        </div>
      </header>

      {showConfigModal && (
        <FirebaseConfigModal onClose={() => setShowConfigModal(false)} />
      )}
    </>
  );
};
