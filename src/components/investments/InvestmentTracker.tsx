import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, convertToCurrency } from '../../utils/currency';
import { AssetClass } from '../../types/finance';
import { AssetAllocationChart } from './AssetAllocationChart';
import { AddHoldingModal } from './AddHoldingModal';
import {
  TrendingUp,
  Plus,
  Trash2,
  PieChart,
  Edit2
} from 'lucide-react';

const ASSET_COLORS: Record<AssetClass, string> = {
  'Stock': '#6366f1',
  'ETF/Fund': '#06b6d4',
  'Crypto': '#f59e0b',
  'Gold': '#eab308',
  'Cash/Deposit': '#10b981',
};

export const InvestmentTracker: React.FC = () => {
  const {
    investments,
    totalPortfolioValue,
    totalPortfolioCost,
    deleteInvestment,
    updateInvestmentPrice,
  } = useFinance();
  const { currency } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');

  // Total P&L
  const totalUnrealizedGain = totalPortfolioValue - totalPortfolioCost;
  const totalGainPercent = totalPortfolioCost > 0 ? (totalUnrealizedGain / totalPortfolioCost) * 100 : 0;

  // Asset allocations for donut chart
  const allocations = useMemo(() => {
    const map: Partial<Record<AssetClass, number>> = {};

    investments.forEach((item) => {
      const itemValueInAssetCurrency = item.shares * item.currentPrice;
      const itemValueInDisplayCurrency = convertToCurrency(itemValueInAssetCurrency, item.currency, currency);
      map[item.assetClass] = (map[item.assetClass] || 0) + itemValueInDisplayCurrency;
    });

    return Object.entries(map).map(([category, value]) => ({
      category: category as AssetClass,
      value: value || 0,
      percent: totalPortfolioValue > 0 ? ((value || 0) / totalPortfolioValue) * 100 : 0,
      color: ASSET_COLORS[category as AssetClass] || '#94a3b8',
    }));
  }, [investments, totalPortfolioValue, currency]);

  const handleStartEdit = (id: string, currentPrice: number) => {
    setEditingId(id);
    setEditPriceValue(currentPrice.toString());
  };

  const handleSavePrice = (id: string) => {
    const p = parseFloat(editPriceValue);
    if (!isNaN(p) && p >= 0) {
      updateInvestmentPrice(id, p);
    }
    setEditingId(null);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Portfolio Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {/* Total Value */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(19,28,49,0.9) 100%)', border: '1px solid rgba(6,182,212,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-invest-light)' }}>TOTAL PORTFOLIO VALUE</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', background: 'var(--color-invest-bg)' }}>
              <TrendingUp size={18} color="var(--color-invest-light)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white', marginTop: '0.5rem' }}>
            {formatMoney(totalPortfolioValue, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Cost Basis: {formatMoney(totalPortfolioCost, currency)}
          </div>
        </div>

        {/* Total Return */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Unrealized Gain / Loss</span>
            <span className={`badge ${totalUnrealizedGain >= 0 ? 'badge-success' : 'badge-danger'}`}>
              {totalUnrealizedGain >= 0 ? '+' : ''}{totalGainPercent.toFixed(2)}%
            </span>
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: totalUnrealizedGain >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)',
              marginTop: '0.5rem'
            }}
          >
            {totalUnrealizedGain >= 0 ? '+' : ''}{formatMoney(totalUnrealizedGain, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {investments.length} tracked positions
          </div>
        </div>
      </div>

      {/* Asset Allocation Chart Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <PieChart size={18} color="var(--color-invest-light)" />
              <span>Asset Class Allocation</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Diversification across Equities, Funds, Crypto, Gold, and Cash
            </p>
          </div>
        </div>

        <AssetAllocationChart
          allocations={allocations}
          totalValue={totalPortfolioValue}
          currency={currency}
        />
      </div>

      {/* Holdings List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 className="card-title">Portfolio Positions</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Individual assets and live return metrics
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ height: 38, padding: '0 0.9rem', fontSize: '0.82rem' }}
            id="add-holding-btn"
          >
            <Plus size={16} />
            <span>Add Position</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {investments.map((item) => {
            const itemTotalValueAssetCurr = item.shares * item.currentPrice;
            const itemCostBasisAssetCurr = item.shares * item.avgBuyPrice;
            const gainAssetCurr = itemTotalValueAssetCurr - itemCostBasisAssetCurr;
            const gainPercent = itemCostBasisAssetCurr > 0 ? (gainAssetCurr / itemCostBasisAssetCurr) * 100 : 0;
            const isProfit = gainAssetCurr >= 0;

            const itemTotalValueDisplayCurr = convertToCurrency(itemTotalValueAssetCurr, item.currency, currency);

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                {/* Symbol & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-display)',
                      color: ASSET_COLORS[item.assetClass] || 'white',
                      border: `1px solid ${ASSET_COLORS[item.assetClass] || 'var(--border-subtle)'}`,
                    }}
                  >
                    {item.symbol.slice(0, 4)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{item.symbol}</span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.68rem' }}>
                        {item.assetClass}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      {item.shares} units @ avg {item.avgBuyPrice} {item.currency}
                    </div>
                  </div>
                </div>

                {/* Price & Value Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Current Price (Editable) */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Market Price</div>
                    {editingId === item.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <input
                          type="number"
                          step="any"
                          value={editPriceValue}
                          onChange={(e) => setEditPriceValue(e.target.value)}
                          style={{ width: 80, height: 28, padding: '0 0.4rem', fontSize: '0.8rem' }}
                          autoFocus
                        />
                        <button onClick={() => handleSavePrice(item.id)} className="btn btn-primary" style={{ height: 28, padding: '0 0.5rem', fontSize: '0.75rem' }}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartEdit(item.id, item.currentPrice)}
                        style={{
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          justifyContent: 'flex-end',
                        }}
                        title="Click to update price"
                      >
                        <span>{item.currentPrice} {item.currency}</span>
                        <Edit2 size={12} color="var(--text-muted)" />
                      </div>
                    )}
                  </div>

                  {/* Total Position Value & Return */}
                  <div style={{ textAlign: 'right', minWidth: 110 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>
                      {formatMoney(itemTotalValueDisplayCurr, currency)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '0.1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: isProfit ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                        }}
                      >
                        {isProfit ? '+' : ''}{gainPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteInvestment(item.id)}
                    className="btn-ghost btn-icon"
                    style={{ width: 32, height: 32, color: 'var(--text-muted)' }}
                    title="Remove position"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAddModal && <AddHoldingModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
};
