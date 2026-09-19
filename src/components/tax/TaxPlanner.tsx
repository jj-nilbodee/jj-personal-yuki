import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { calculatePersonalTax, THAI_TAX_BRACKETS } from '../../services/taxEngine';
import { formatMoney } from '../../utils/currency';
import {
  Receipt,
  Sparkles,
  TrendingDown,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const TaxPlanner: React.FC = () => {
  const { taxIncome, updateTaxIncome, taxDeductions, updateTaxDeductions } = useFinance();
  const { currency } = useAuth();

  const [expandedSections, setExpandedSections] = useState({
    income: true,
    deductions: true,
    brackets: false,
  });

  const taxResult = useMemo(() => {
    return calculatePersonalTax(taxIncome, taxDeductions, THAI_TAX_BRACKETS);
  }, [taxIncome, taxDeductions]);

  const handleIncomeChange = (field: keyof typeof taxIncome, value: string) => {
    const num = parseFloat(value) || 0;
    updateTaxIncome({ ...taxIncome, [field]: num });
  };

  const handleDeductionChange = (field: keyof typeof taxDeductions, value: string) => {
    const num = parseFloat(value) || 0;
    updateTaxDeductions({ ...taxDeductions, [field]: num });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Tax Summary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {/* Estimated Tax Liability */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(19,28,49,0.9) 100%)', border: '1px solid rgba(168,85,247,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-tax-light)' }}>ESTIMATED TAX LIABILITY</span>
            <span className="badge badge-purple">{taxResult.marginalRate}% Top Bracket</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white', marginTop: '0.5rem' }}>
            {formatMoney(taxResult.taxLiability, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Effective Rate: <strong>{taxResult.effectiveRate}%</strong> of annual gross
          </div>
        </div>

        {/* Gross Annual Income */}
        <div className="card">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Annual Gross Income</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: '0.5rem' }}>
            {formatMoney(taxResult.grossIncome, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Salary, bonus, freelance & capital income
          </div>
        </div>

        {/* Deductions & Allowances */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Deductions Claimed</span>
            <span className="badge badge-success">Saves {formatMoney((taxResult.totalDeductions * (taxResult.marginalRate / 100)), currency)}</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-success-light)', marginTop: '0.5rem' }}>
            -{formatMoney(taxResult.totalDeductions, currency)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Net Taxable: {formatMoney(taxResult.netTaxableIncome, currency)}
          </div>
        </div>
      </div>

      {/* Tax Optimization Recommendations */}
      {taxResult.suggestions.length > 0 && (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(6,182,212,0.3)' }}>
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <h3 className="card-title">
              <Sparkles size={18} color="var(--color-invest-light)" />
              <span>Tax Reduction Strategies</span>
            </h3>
            <span className="badge badge-cyan">Instant Suggestions</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {taxResult.suggestions.map((sug, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(14,22,38,0.7)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{sug.title}</span>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    Save ~{formatMoney(sug.potentialSavings, currency)}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {sug.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income Sources Section */}
      <div className="card">
        <div
          className="card-header"
          style={{ cursor: 'pointer', margin: 0 }}
          onClick={() => setExpandedSections(p => ({ ...p, income: !p.income }))}
        >
          <h3 className="card-title">
            <Receipt size={18} color="var(--accent-primary-light)" />
            <span>1. Annual Income Sources</span>
          </h3>
          {expandedSections.income ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {expandedSections.income && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Base Annual Salary</label>
              <input
                type="number"
                value={taxIncome.salary || ''}
                onChange={(e) => handleIncomeChange('salary', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Annual Bonus</label>
              <input
                type="number"
                value={taxIncome.bonus || ''}
                onChange={(e) => handleIncomeChange('bonus', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Freelance & Consulting</label>
              <input
                type="number"
                value={taxIncome.freelance || ''}
                onChange={(e) => handleIncomeChange('freelance', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dividends & Capital Gains</label>
              <input
                type="number"
                value={taxIncome.investments || ''}
                onChange={(e) => handleIncomeChange('investments', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Deductions & Allowances Section */}
      <div className="card">
        <div
          className="card-header"
          style={{ cursor: 'pointer', margin: 0 }}
          onClick={() => setExpandedSections(p => ({ ...p, deductions: !p.deductions }))}
        >
          <h3 className="card-title">
            <TrendingDown size={18} color="var(--color-success-light)" />
            <span>2. Allowances & Tax Deductions</span>
          </h3>
          {expandedSections.deductions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {expandedSections.deductions && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Personal Allowance (Default 60,000)</label>
              <input
                type="number"
                value={taxDeductions.personalAllowance || ''}
                onChange={(e) => handleDeductionChange('personalAllowance', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Social Security Fund (Max 9,000)</label>
              <input
                type="number"
                value={taxDeductions.socialSecurity || ''}
                onChange={(e) => handleDeductionChange('socialSecurity', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Provident Fund (PVD / GPF)</label>
              <input
                type="number"
                value={taxDeductions.providentFund || ''}
                onChange={(e) => handleDeductionChange('providentFund', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Thai ESG Fund (Max 300,000)</label>
              <input
                type="number"
                value={taxDeductions.thaiEsg || ''}
                onChange={(e) => handleDeductionChange('thaiEsg', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">RMF (Retirement Mutual Fund)</label>
              <input
                type="number"
                value={taxDeductions.rmf || ''}
                onChange={(e) => handleDeductionChange('rmf', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">SSF (Super Savings Fund)</label>
              <input
                type="number"
                value={taxDeductions.ssf || ''}
                onChange={(e) => handleDeductionChange('ssf', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Life & Annuity Insurance (Max 100k)</label>
              <input
                type="number"
                value={taxDeductions.lifeInsurance || ''}
                onChange={(e) => handleDeductionChange('lifeInsurance', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Health Insurance (Max 25k)</label>
              <input
                type="number"
                value={taxDeductions.healthInsurance || ''}
                onChange={(e) => handleDeductionChange('healthInsurance', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mortgage Interest (Max 100k)</label>
              <input
                type="number"
                value={taxDeductions.mortgageInterest || ''}
                onChange={(e) => handleDeductionChange('mortgageInterest', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Charitable Donations</label>
              <input
                type="number"
                value={taxDeductions.donations || ''}
                onChange={(e) => handleDeductionChange('donations', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Progressive Tax Bracket Ladder */}
      <div className="card">
        <div
          className="card-header"
          style={{ cursor: 'pointer', margin: 0 }}
          onClick={() => setExpandedSections(p => ({ ...p, brackets: !p.brackets }))}
        >
          <h3 className="card-title">
            <Layers size={18} color="var(--color-tax-light)" />
            <span>3. Progressive Tax Bracket Breakdown</span>
          </h3>
          {expandedSections.brackets ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {expandedSections.brackets && (
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {taxResult.bracketBreakdowns.map((bracket, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: bracket.taxableInBracket > 0 ? 'rgba(168,85,247,0.1)' : 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: bracket.taxableInBracket > 0 ? '1px solid rgba(168,85,247,0.25)' : '1px solid var(--border-subtle)',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{bracket.bracket}</span>
                  <span style={{ marginLeft: '0.75rem', color: 'var(--color-tax-light)', fontWeight: 700 }}>
                    {(bracket.taxRate * 100)}%
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {formatMoney(bracket.taxAmount, currency)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Taxable: {formatMoney(bracket.taxableInBracket, currency)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
