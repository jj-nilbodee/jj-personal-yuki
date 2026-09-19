import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { AppHeader } from './components/layout/AppHeader';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { BottomNav } from './components/layout/BottomNav';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { ExpenseTracker } from './components/expenses/ExpenseTracker';
import { TaxPlanner } from './components/tax/TaxPlanner';
import { InvestmentTracker } from './components/investments/InvestmentTracker';
import { LoanPlanner } from './components/loans/LoanPlanner';
import { TransactionModal } from './components/expenses/TransactionModal';
import { Plus } from 'lucide-react';
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <OverviewDashboard
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenQuickAdd={() => setShowQuickAdd(true)}
          />
        );
      case 'expenses':
        return <ExpenseTracker />;
      case 'tax':
        return <TaxPlanner />;
      case 'investments':
        return <InvestmentTracker />;
      case 'loans':
        return <LoanPlanner />;
      default:
        return <OverviewDashboard onNavigate={setActiveTab} onOpenQuickAdd={() => setShowQuickAdd(true)} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Desktop Sticky Sidebar */}
      <DesktopSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main App Canvas */}
      <main className="app-main">
        <AppHeader activeTab={activeTab} onOpenQuickAdd={() => setShowQuickAdd(true)} />

        <div className="page-container">
          {renderActiveView()}
        </div>
      </main>

      {/* Mobile iPhone Floating Action Button (Quick Add) */}
      <button
        onClick={() => setShowQuickAdd(true)}
        className="fab-quick-add"
        title="Quick Log"
        id="mobile-fab-add"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Mobile Bottom Dock Navigation (iPhone Safe Area Aware) */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <TransactionModal onClose={() => setShowQuickAdd(false)} defaultType="expense" />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <FinanceProvider>
        <AppContent />
      </FinanceProvider>
    </AuthProvider>
  );
};

export default App;
