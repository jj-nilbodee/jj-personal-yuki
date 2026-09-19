import React, { useState } from 'react';
import { AssetClass } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';
import { X, TrendingUp } from 'lucide-react';

interface AddHoldingModalProps {
  onClose: () => void;
}

const ASSET_CLASSES: AssetClass[] = ['Stock', 'ETF/Fund', 'Crypto', 'Gold', 'Cash/Deposit'];

export const AddHoldingModal: React.FC<AddHoldingModalProps> = ({ onClose }) => {
  const { addInvestment } = useFinance();

  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('Stock');
  const [shares, setShares] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currency, setCurrency] = useState('USD');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !shares || !avgBuyPrice) {
      alert('Please fill in Symbol, Shares, and Avg Buy Price.');
      return;
    }

    addInvestment({
      symbol: symbol.toUpperCase().trim(),
      name: name.trim() || symbol.toUpperCase().trim(),
      assetClass,
      shares: parseFloat(shares) || 0,
      avgBuyPrice: parseFloat(avgBuyPrice) || 0,
      currentPrice: parseFloat(currentPrice) || parseFloat(avgBuyPrice) || 0,
      currency,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="var(--color-invest-light)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>
              Add Portfolio Holding
            </h2>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Ticker / Symbol</label>
              <input
                type="text"
                placeholder="e.g. NVDA, VOO, BTC"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Asset Class</label>
              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as AssetClass)}
              >
                {ASSET_CLASSES.map((ac) => (
                  <option key={ac} value={ac}>{ac}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Asset / Company Name</label>
            <input
              type="text"
              placeholder="e.g. Nvidia Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Avg Buy Price</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={avgBuyPrice}
                onChange={(e) => setAvgBuyPrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Price</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Asset Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD ($)</option>
              <option value="THB">THB (฿)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', height: 48 }}
          >
            Add to Portfolio
          </button>
        </form>
      </div>
    </div>
  );
};
