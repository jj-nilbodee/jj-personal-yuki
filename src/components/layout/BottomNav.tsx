import React from 'react';
import { LayoutDashboard, Wallet, Receipt, TrendingUp, Landmark } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'tax', label: 'Tax', icon: Receipt },
    { id: 'investments', label: 'Invest', icon: TrendingUp },
    { id: 'loans', label: 'Loans', icon: Landmark },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-items">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              id={`mobile-nav-${item.id}`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
